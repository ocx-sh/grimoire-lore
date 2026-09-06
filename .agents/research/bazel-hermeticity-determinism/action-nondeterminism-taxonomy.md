---
title: Action non-determinism taxonomy
topic: action-nondeterminism-taxonomy
group: bazel-hermeticity-determinism
family: BZL-HERM
agent: bazel-hermeticity-determinism-worker
model: sonnet
date_researched: 2026-09-05
sources_count: 18
primary_sources_count: 17
settles: [M-C-01, M-C-02, M-C-03, M-C-04, M-C-05, M-C-06, M-C-07, M-C-11]
scope: >
  The complete, language-independent cause list for a Bazel action that is not
  a pure function of its declared inputs, the check for each cause, and the
  ordered triage a reviewer runs when a target rebuilds unexpectedly. Excludes
  the sandbox mount/strategy mechanics and the C++ toolchain-autodetection
  escape hatch (owned by the sibling `sandbox-environment-and-toolchain-leakage`
  dive), module-extension/`getenv` purity (owned by
  `bazel-bzlmod-and-repo-rules/module-extension-purity-and-repo-contents-cache`
  and `repository-rule-hermeticity-and-bcr`), and RBE/cache-eviction mechanics
  (owned by `bazel-caching-rbe/*`). Per-language rulesets should cite this file
  rather than restate its causes.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The eight-cause taxonomy](#1-the-eight-cause-taxonomy)
  2. [Skyframe's invalidation invariant](#2-skyframes-invalidation-invariant)
  3. [The genrule "General Advice" checklist, verbatim](#3-the-genrule-general-advice-checklist-verbatim)
  4. [The action purity contract](#4-the-action-purity-contract)
  5. [Three environments, three strictness levels](#5-three-environments-three-strictness-levels)
  6. [Stamping semantics: stable vs. volatile](#6-stamping-semantics-stable-vs-volatile)
  7. [The sandbox's network default, and identity leaks](#7-the-sandboxs-network-default-and-identity-leaks)
  8. [Diagnosing one non-deterministic action](#8-diagnosing-one-non-deterministic-action)
  9. [Nested foreign build systems and execution divergence](#9-nested-foreign-build-systems-and-execution-divergence)
- [Decisions](#decisions)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Fleet evidence](#fleet-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- A Bazel action is non-deterministic when its output bytes or command line vary while its *declared* inputs are held fixed — every cause below is a variant of "it read something without declaring it" ([bazel.build/basics/hermeticity](https://bazel.build/basics/hermeticity)).
- Skyframe's own correctness rests on one invariant, stated verbatim on its reference page: "if all the input data of all functions is recorded, Bazel can invalidate only the exact set of nodes that need to be invalidated" ([bazel.build/reference/skyframe](https://bazel.build/reference/skyframe)) — this is the frame every rule in this file reduces to.
- The cheapest, most general diagnostic for "why did this rebuild" is diffing two `--execution_log_compact_file` runs through `//src/tools/execlog:parser` — it beats re-reading the BUILD file by hand.
- `--incompatible_strict_action_env` defaults **`false`** on Bazel 8.7.0 (rules_ocx's pin, confirmed against the versioned docs) and **`true`** starting Bazel 9.0.0 (flipped in [PR #27670](https://github.com/bazelbuild/bazel/pull/27670), merged 2025-11-17, closing a 7-year-old regression, [issue #7026](https://github.com/bazelbuild/bazel/issues/7026)) — the identical `.bazelrc` runs looser action environments on an 8.x CI leg than on a 9.x leg in the same matrix, with zero configuration difference.
- Even with strict action-env on, it covers only build/host actions. Repository rules and module extensions see the **full client environment regardless of `--repo_env`** unless the separate, still-experimental `--experimental_strict_repo_env` (default `false`, added Bazel 8.6.0, [PR #28189](https://github.com/bazelbuild/bazel/pull/28189)) is also set. **Test actions have no strict mode at all** — [issue #29472](https://github.com/bazelbuild/bazel/issues/29472) requesting one is open as of 2026-09-05.
- Bazel's sandbox allows network access to every action **by default**: `--sandbox_default_allow_network` defaults `true`, unchanged between Bazel 8.7.0 and current. Hermetic-by-default is not what ships; you must turn it off.
- `--sandbox_fake_hostname` and `--sandbox_fake_username` (both default `false`, unchanged 8.7.0→current) neutralize the two most common identity-leak causes — an embedded hostname or username — without touching the offending tool.
- The genrule "General Advice" checklist is the closest thing Bazel ships to a literal, quotable determinism checklist: no timestamps, stable ordering for sets and maps, relative paths only, no created symlinks or directories ([bazel.build/reference/be/general](https://bazel.build/reference/be/general)).
- Any change to `PATH` forces Bazel to re-execute every affected genrule's command on the next build — stated directly on the same page — which is the practical (cache-cost) reason strict action-env's "static PATH" behavior matters, not just a security nicety.
- Stamping has a stable/volatile split by design: a `bazel-out/stable-status.txt` change invalidates dependent actions; a `bazel-out/volatile-status.txt` change deliberately does not ([bazel.build/docs/user-manual](https://bazel.build/docs/user-manual)). A real regression, [issue #5573](https://github.com/bazelbuild/bazel/issues/5573), shipped because a rule read the volatile file for a value that actually needed rebuild-on-change.
- `--stamp` itself defaults `false`; most `*_binary` rules ship `stamp = -1` ("defer to the flag"), `*_test` rules force `stamp = 0` — a target can silently flip between stamped and unstamped purely from the invocation, with no change to its definition.
- There is still no contract between Bazel and rulesets on stamping semantics: [issue #14341](https://github.com/bazelbuild/bazel/issues/14341) (filed 2021-11-29, **still open**) proposes an `--incompatible_*` flag to stop a rule from silently including a status file as an action input; nothing has shipped.
- rules_ocx uses zero genrules and zero stamping in production ([starlark-code-shape.md:159](../bazel-audit/starlark-code-shape.md)), so most causes here are currently latent for the fleet's one Bazel repo, not exercised — and it sets none of the mitigating flags this file names ([build-contracts-and-ci-posture.md §1](../bazel-audit/build-contracts-and-ci-posture.md)), so it is exposed the moment that changes.
- Nested foreign build systems (`make`, `cmake`, `cargo build`, `npm run` shelled out from a genrule) inherit none of Bazel's purity contract and should be treated as presumptively non-deterministic until proven otherwise.
- Sandboxing cannot fully close host-vs-remote divergence: no sandbox strategy provides cycle-accurate isolation, so dynamic execution and RBE-vs-local drift remain a real, separate cause (deep mechanism owned by the sibling `sandbox-environment-and-toolchain-leakage` dive).
- Ordered triage for "why did this rebuild": diff the execution log first; then the three-tier environment (action/host vs. repo vs. test); then the command line for timestamps/PIDs/paths; then the emitted content for unsorted ordering; then local-vs-remote divergence; then nested build systems; `/dev/random` last (rarest, most expensive to prove).
- Only a minority of the eight causes are cheaply, mechanically MUST-checkable via a flag or grep today; most resolve to a reading heuristic against the tool's own source or behavior, not a query Bazel can answer for you.

## Findings

### 1. The eight-cause taxonomy

Source: [jmmv.dev, "Bazel and action (non-)determinism," Julio Merino, 2025-07-21](https://jmmv.dev/2025/07/bazel-action-determinism.html) — a practitioner article, not a Bazel-owned source; used here for the taxonomy shape (backed independently by the normative sources cited per-cause below), per the map's Conflict 8 resolution that blogs are the better source for *failure modes*.

| # | Cause | Symptom | Check |
|---|---|---|---|
| 1 | Embedded timestamps | Code generators, archivers (`zip`) write wall-clock time into output bytes/metadata | Diff two clean builds' outputs byte-for-byte, or diff two `--execution_log_compact_file` runs (§8) |
| 2 | PIDs, UIDs, GIDs, hostname, username | A tool queries `getpid()`/`getuid()`/`gethostname()` and writes the value into output | Grep tool invocation for `$$`, `whoami`, `id -u`, `hostname`; or set `--sandbox_fake_hostname`/`--sandbox_fake_username` (§7) and see if output changes |
| 3 | Hash-table/set iteration order | An unsorted `dict`/`set` is serialized into a command line or generated file | Read the genrule/tool source for a `for k in d:` / `.items()` / `set(...)` feeding output with no `sorted()` between (be/general explicitly requires "stable ordering for sets and maps," §3) |
| 4 | Network access during a build | An action reaches the network; result depends on external state or timing | `--sandbox_default_allow_network=false` (§7) and see which action/test breaks first |
| 5 | Hidden system-toolchain files outside declared inputs | Host-provided `gcc` embeds e.g. `/usr/lib/gcc/x86_64-linux-gnu/15/crtbegin.o` into a binary, invisible to Bazel's input tracking (jmmv.dev, quoted verbatim) | `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` and see what breaks — deep mechanism owned by the sibling `sandbox-environment-and-toolchain-leakage` dive |
| 6 | Local-vs-remote execution divergence | Dynamic execution runs the same action locally and remotely; if the two environments are not equivalent, outputs differ | Compare a `--execution_log_compact_file` run under `--dynamic_local_strategy` against pure local/remote |
| 7 | Nested foreign build systems | A genrule shells into `make`/`cmake`/`cargo`/`npm`, systems with no purity contract of their own | `grep -n 'genrule('` then read what each one shells out to (§9) |
| 8 | Reads from `/dev/random`/`/dev/urandom` | A tool consumes entropy directly; output is unpredictable by construction | Grep tool source for `/dev/random`, `/dev/urandom`, `os.urandom`, unseeded `rand()`/`SecureRandom` — rarest, last in triage order |

### 2. Skyframe's invalidation invariant

[bazel.build/reference/skyframe](https://bazel.build/reference/skyframe) states the invariant this whole family reduces to: **"if all the input data of all functions is recorded, Bazel can invalidate only the exact set of nodes that need to be invalidated"** when that input data changes. Skyframe is Bazel's parallel evaluation graph of `SkyValue` nodes computed by `SkyFunction`s that explicitly request their dependencies rather than reading data directly; when a dependency changes but a rebuilt node produces an *identical* result, downstream dependents are "resurrected" rather than re-invalidated, which is how Bazel avoids cascading rebuilds from a no-op source change. Every cause in §1 is a way of defeating this: the action read something — a clock, a PID, iteration order, a network response, a host file, a foreign tool's internal state, or entropy — that Skyframe never recorded as an input, so it cannot be part of what makes the node's key stable.

### 3. The genrule "General Advice" checklist, verbatim

[bazel.build/reference/be/general](https://bazel.build/reference/be/general), genrule's own "General advice" section:

> "Do ensure that tools run by a genrule are deterministic and hermetic. They should not write timestamps to their output, and they should use stable ordering for sets and maps, as well as write only relative file paths to the output, no absolute paths."
>
> "Do use `$(location)` extensively, for outputs, tools and sources. Due to the segregation of output files for different configurations, genrules cannot rely on hard-coded and/or absolute paths."
>
> "Avoid creating symlinks and directories. Bazel doesn't copy over the directory/symlink structure created by genrules and its dependency checking of directories is unsound."
>
> "Not following this rule will lead to unexpected build behavior (Bazel not rebuilding a genrule you thought it would) and degrade cache performance."

The same page's "Genrule Environment" subsection adds the PATH fact that grounds why environment strictness matters for *caching*, not only security: **"Any change to the value of `PATH` will cause Bazel to re-execute the command on the next build."** A genrule's sanitized process environment documents only `PATH`, `PWD` and `TMPDIR` as available; most user shell variables are not passed through.

```python
# BAD — timestamp, PID and an absolute path baked into deterministic-looking output
genrule(
    name = "gen_manifest",
    outs = ["manifest.txt"],
    cmd = "echo \"built $$(date) pid=$$$$\" > $@; ls $$(pwd) >> $@",
)

# GOOD — no clock, no PID, no absolute path; sorted, relative
genrule(
    name = "gen_manifest",
    srcs = [":inputs"],
    outs = ["manifest.txt"],
    cmd = "sort $(locations :inputs) > $@",
)
```

### 4. The action purity contract

[bazel.build/extending/rules](https://bazel.build/extending/rules) states the contract custom rule authors must honor:

> "Actions are comparable to pure functions: They should depend only on the provided inputs, and avoid accessing computer information, username, clock, network, or I/O devices (except for reading inputs and writing outputs). This is important because the output will be cached and reused."
>
> "Actions must list all of their inputs. Listing inputs that are not used is permitted, but inefficient." … "Actions must create all of their outputs. They may write other files, but anything not in outputs won't be available to consumers."

The same page separately marks two API surfaces deprecated that an LLM trained on older examples reaches for by default (see [AI-agent angle](#ai-agent-angle)): struct-based providers ("this style is deprecated and should not be used in new code") and three runfiles entry points — `collect_data`/`collect_default` modes and `DefaultInfo`'s `data_runfiles`/`default_runfiles` constructor arguments (use `DefaultInfo.default_runfiles`, not `.data_runfiles`).

### 5. Three environments, three strictness levels

This is the corpus's sharpest surprise in this dive. There is not one "strict environment" flag; there are three, covering three different phases of a build, at three different levels of maturity, on three different timelines:

| Phase | Flag | Default | Since | What "strict" means |
|---|---|---|---|---|
| Build/host actions | `--incompatible_strict_action_env` | `false` on Bazel 8.7.0; **`true`** from Bazel 9.0.0 | Flag existed since 2018 ([issue #6648](https://github.com/bazelbuild/bazel/issues/6648)); flipped true→broke→false in 0.21 ([issue #7026](https://github.com/bazelbuild/bazel/issues/7026)); flipped true again for 9.0.0 ([PR #27670](https://github.com/bazelbuild/bazel/pull/27670), merged 2025-11-17) | Static `PATH`, no `LD_LIBRARY_PATH` inheritance; `--action_env=NAME` restores one variable explicitly |
| Repository rules / module extensions | `--experimental_strict_repo_env` | **`false`** (still experimental, unchanged as of current docs) | Added Bazel 8.6.0 ([PR #28189](https://github.com/bazelbuild/bazel/pull/28189)) | Only `PATH`/`PATHEXT` plus names given via `--repo_env` are inherited; **without this flag, repository rules see the full client environment regardless of `--repo_env`** — the reference itself says `--repo_env` merely "specifies additional environment variables to be available … repository rules see the full environment anyway" |
| Test actions | *(none)* | — | [Issue #29472](https://github.com/bazelbuild/bazel/issues/29472), open, no target version | Every client env var except test-framework variables (`TZ`, `TEST_SRCDIR`, …) still reaches the test process; only `--test_env=NAME=` removes one explicitly |

A companion flag, `--incompatible_repo_env_ignores_action_env` (default **`true`** currently), already stops `--action_env` values from leaking into repository-rule/module-extension environments — so the *action_env-into-repo_env* leak is closed, but the *client-environment-into-repo-rule* leak is not, because that requires the separate, still-off experimental flag above.

```
# .bazelrc — Bazel 8.7.0 pin: strict env is NOT the default here
build --incompatible_strict_action_env      # MUST set explicitly on Bazel 8
build --sandbox_default_allow_network=false # never defaults on, either major

# Bazel 9.0.0+: the first line is redundant (already the default) — drop it
# once the floor is 9.0.0, or a stale "why we set this" comment misleads readers.
```

### 6. Stamping semantics: stable vs. volatile

[bazel.build/docs/user-manual](https://bazel.build/docs/user-manual)'s workspace-status section defines the split verbatim:

> Stable keys: `"stable" keys' values should change rarely, if possible. If the contents of bazel-out/stable-status.txt change, Bazel invalidates the actions that depend on them.`
>
> Volatile keys: `"volatile" keys' values may change often … Bazel pretends that the volatile file never changes … if the volatile status file is the only file whose contents has changed, Bazel will not invalidate actions that depend on it.`

Bazel always emits `BUILD_EMBED_LABEL`, `BUILD_HOST`, `BUILD_USER` as stable and `BUILD_TIMESTAMP`, `FORMATTED_DATE` as volatile. `ctx.info_file` is the stable-status file handle, `ctx.version_file` the volatile one — a mapping [issue #11422](https://github.com/bazelbuild/bazel/issues/11422) (filed 2020-05-17, **closed**) had to ask Bazel to document at all, because neither symbol appeared on the rule-context reference page. Picking the wrong one is not cosmetic: [issue #5573](https://github.com/bazelbuild/bazel/issues/5573) (filed 2018) is a real, reproduced regression where a rule took `ctx.version_file` as an input for a value that needed rebuild-on-change semantics — a downstream commit changed the `workspace_status_command` output, `bazel-out/volatile-status.txt` updated on disk, and the cached artifact **did not rebuild**, exactly per the volatile-file contract working as designed against the wrong expectation.

[Issue #14341](https://github.com/bazelbuild/bazel/issues/14341) (2021-11-29, still **open**) shows the failure in the opposite direction: `rules_docker`'s `container_image` always stamped whenever a `{` character appeared in certain attributes, making the stable-status file an unconditional action input and producing cache misses on every build regardless of the `--stamp` flag. The filer's diagnosis — "there's no real contract between Bazel and rulesets regarding the meaning of `--stamp`" and "`ctx.info_file` and `ctx.status_file` are undocumented" — is still true; the proposed `--incompatible_prevent_status_files_without_stamp` flag never shipped.

`--stamp` itself defaults **`false`** (command-line reference: `--[no]stamp … default:"false" … Stamp binaries with the date, username, hostname, workspace information, etc.`), but most `*_binary` rules set their own `stamp` attribute to `-1`, meaning "defer to the flag," while `*_test` rules hard-code `stamp = 0` regardless of the flag (`bazel.build/docs/user-manual`).

```python
# BAD — reads the volatile file for a value that should force a rebuild
out = ctx.actions.declare_file(name + ".version")
ctx.actions.run_shell(
    outputs = [out], inputs = [ctx.version_file],
    command = "cp %s %s" % (ctx.version_file.path, out.path),
)

# GOOD — stable file: a change here correctly invalidates dependents
out = ctx.actions.declare_file(name + ".version")
ctx.actions.run_shell(
    outputs = [out], inputs = [ctx.info_file],
    command = "cp %s %s" % (ctx.info_file.path, out.path),
)
```

### 7. The sandbox's network default, and identity leaks

Confirmed directly against both the current and the Bazel-8.7.0-versioned command-line reference (identical on both):

- `--[no]sandbox_default_allow_network` — **default `"true"`**. "Allow network access by default for actions; this may not work with all sandboxing implementations." Network access is *on* unless explicitly disabled with `--sandbox_default_allow_network=false` (equivalently `--nosandbox_default_allow_network`).
- `--[no]sandbox_fake_hostname` — default `"false"`. "Change the current hostname to 'localhost' for sandboxed actions." Neutralizes an embedded-hostname leak (cause #2) at the sandbox layer without touching the tool.
- `--[no]sandbox_fake_username` — default `"false"`. "Change the current username to 'nobody' for sandboxed actions." Same, for username/UID-adjacent leaks.
- `--[no]sandbox_debug` — default `"false"`. Preserves the sandbox directory and shows the exact wrapped command on failure ([bazel.build/docs/sandboxing](https://bazel.build/docs/sandboxing): "use `--verbose_failures` and `--sandbox_debug` to make Bazel show the exact command it ran"); the same page warns it "fills up your disk over time" if left on.

The full sandbox-strategy mechanics (which strategy isolates what, the read-only host-path mount that lets a build depend on host system libraries) are owned by the sibling `sandbox-environment-and-toolchain-leakage` dive; this file only names the flags relevant to the taxonomy's causes #2 and #4.

### 8. Diagnosing one non-deterministic action

The command-line reference states the current recommendation directly: `--execution_log_compact_file` should be preferred over the older `--execution_log_json_file` ("significantly smaller and cheaper to produce"); both are mutually exclusive, boolean-or-path flags, and both require `--experimental_stream_log_file_uploads` if used as a boolean (streamed) rather than a local path.

```bash
bazel clean
bazel build --execution_log_compact_file=/tmp/before.log //target

bazel clean
bazel build --execution_log_compact_file=/tmp/after.log //target

bazel build src/tools/execlog:parser
bazel-bin/src/tools/execlog/parser --log_path=/tmp/before.log --output_path=/tmp/before.txt
bazel-bin/src/tools/execlog/parser --log_path=/tmp/after.log  --output_path=/tmp/after.txt
diff -u /tmp/before.txt /tmp/after.txt
```

([execlog README](https://github.com/bazelbuild/bazel/blob/master/src/tools/execlog/README.md); parser also supports `--restrict_to_runner=<name>` to scope the diff to one execution strategy.) A non-empty diff names the differing input, environment variable, or command-line argument directly — no more effective way exists to answer "why did this rebuild" than reading what Bazel itself recorded as the action's identity.

### 9. Nested foreign build systems and execution divergence

jmmv.dev's framing, unsupported by any Bazel-owned normative statement but consistent with the purity contract in §4: **"Other build systems make little efforts to [be pure functions of their inputs]. If you end up nesting build systems … it's very likely that you are introducing non-determinism."** A genrule that shells into `make`, `cmake`, `cargo build`, or `npm run` inherits none of the guarantees Bazel enforces on its own actions — the foreign tool may embed its own timestamps, read its own uncontrolled environment, or maintain out-of-band state (a lockfile, a cache directory) Bazel never sees. Treat any such genrule as **presumptively non-deterministic** until proven otherwise by execution-log diffing (§8).

Dynamic execution — running an action locally and remotely and racing the two — is a second, distinct divergence source: if the local and remote execution environments are not equivalent (different host toolchain versions, different sandbox mount sets), the two runs can legitimately produce different output for the same declared inputs. No sandbox strategy eliminates this by construction; cycle-accurate virtualization would be required and is not what any current implementation provides. This mechanism — which sandbox strategy is used, what it does and does not mount — is the sibling dive's subject, not this one's.

## Decisions

**1. The ordered triage a reviewer runs when an action rebuilds unexpectedly.**

Ordered cheapest-and-most-likely first:

1. **Diff the execution log** (§8) — `--execution_log_compact_file` on two clean builds, diffed through the execlog parser. If the diff is empty, the action key is genuinely stable and a real input changed — stop chasing "non-determinism" and look at the dependency graph instead.
2. **Check the environment tier** (§5) — is the differing value a client env var that leaked through the wrong tier (build action vs. repository rule vs. test)? Read every `_env` flag in every rc file and ask which of the three phases it targets.
3. **Read the command line for the four textbook leaks** — timestamp, PID/UID/GID/hostname/username, absolute path, unstable `PATH`. This is the genrule General Advice checklist (§3) applied literally.
4. **Read the emitted content for ordering** — an unsorted dict/set feeding a template or generated file (cause #3).
5. **Suspect local-vs-remote divergence** if the diff only appears under RBE/dynamic execution and not in two purely local builds (cause #6).
6. **Suspect a nested foreign build system** if the action is a genrule/action shelling into `make`/`cmake`/`cargo`/`npm` (cause #7, §9).
7. **`/dev/random` last** — rarest, requires source-level or strace-level inspection (cause #8).

*Evidence*: this ordering follows directly from cost — step 1 is one command pair and answers the question empirically for any cause; steps 2–4 are static reads of increasing specificity; steps 5–7 require reproducing a specific execution mode or reading foreign source, and are progressively rarer per jmmv.dev's own framing (network and `/dev/random` framed as "just don't" / edge-case, timestamps and iteration order framed as the common cases). *Assumption*: the reviewer has repo access and can run a second local build — this triage does not cover a single-observation CI failure with no reproduction, which needs the sibling caching dive's cache-hit/action-key material instead.

**2. Which causes are worth a MUST rule versus a reading heuristic.**

| Cause | Verdict | Why |
|---|---|---|
| Sandbox network default | **MUST** (flag) | `--sandbox_default_allow_network=false` is a single, testable `.bazelrc` line; the default is a documented, normative fact (command-line reference), not an inference |
| Environment tier confusion (action_env/repo_env/test_env) | **MUST** (flag + grep) | Each tier's flag and default is documented and version-pinned; a repo either sets the right one or doesn't |
| Genrule timestamps/absolute paths/unsorted output | **MUST**, but verified by **reading heuristic** | The rule is normative (be/general states it as "Do"/"Avoid"), but no query proves a tool's *internal* behavior — a human or agent must read the command/tool source |
| Stamping (stable vs. volatile file choice) | **MUST**, reading heuristic | Normatively defined behavior, but "is this value rebuild-worthy" is a judgment call about the *value's meaning*, not something `bazel query` can answer |
| Nested foreign build systems | **SHOULD** (escalates to MUST once shared-cache/RBE trust matters) | The purity contract is normative, but "foreign build system" detection is a grep-and-read, and the actual risk is amortized differently depending on whether the output feeds a trusted cache |
| Local-vs-remote / dynamic execution divergence | **CONSIDER** here (deep mechanism is the sibling dive's MUST) | This file only names the symptom; the fix (matching toolchain versions, sandbox parity) is architecture-level and owned elsewhere |
| `/dev/random` reads | **CONSIDER** | Real but rare; jmmv.dev is the only source naming it explicitly, and it is last in the triage order by design |

*Evidence*: the split tracks the house standard directly — a claim checkable by a single flag/grep with a normatively documented default earns MUST; a claim that needs a human (or agent) to read and interpret tool behavior against a normative checklist stays MUST-but-heuristic (not lowered to CONSIDER, because the *standard* is normative even though the *check* is manual); a claim resting only on an argued source (jmmv.dev, uncorroborated by a Bazel-owned statement) is CONSIDER regardless of how real the failure mode is. *Assumption*: "reading heuristic" verifications are still worth shipping as MUST-severity rules, because the alternative — omitting them for lack of a query — would drop the highest-value items in this file; the severity reflects the *standard's* certainty, not the *check's* automation level.

## Normative guidance candidates

1. **Set `--sandbox_default_allow_network=false` in any `.bazelrc` claiming hermetic builds.** Rationale: Bazel's shipped default allows network access to every sandboxed action, so a network-dependent, non-deterministic action ships silently until RBE (or a flaky CI run) finds it. Verify: `grep -n 'sandbox_default_allow_network' .bazelrc*` — must show a `build`-phase line setting it `false` (or `--nosandbox_default_allow_network`). EMPTY OUTPUT reads: **finding** (network is silently allowed). Severity: **MUST**. Bazel 8 & 9 (default unchanged, confirmed at 8.7.0 and current). Settles: M-C-11.

2. **Never let a genrule or custom action write a timestamp, PID, UID/GID, hostname, or absolute path into a declared output.** Rationale: the Build Encyclopedia's own General Advice names this the literal cause of "Bazel not rebuilding a genrule you thought it would" and degraded cache performance. Verify (reading heuristic): read every `cmd`/`cmd_bash`/`run_shell(command=...)` string for `date`, `$$` (PID), `whoami`, `id -u`, `hostname`, `$(pwd)`/`$PWD`, or a bare `/home`/`/Users`/`/root` literal. EMPTY OUTPUT (no hits) reads: **pass**. Severity: **MUST**. All Bazel majors. Settles: M-C-01, M-C-03.

3. **Sort every set/dict/map before it is serialized into a command line, template, or generated file.** Rationale: the same General Advice page requires "stable ordering for sets and maps" by name — hash/set iteration order is a process/language artifact, not part of any Bazel input contract. Verify (reading heuristic): grep the macro/tool source for a bare `for k in d:` / `.items()` / `set(...)` feeding directly into written output, with no `sorted()`/explicit ordering step between. EMPTY OUTPUT reads: **pass** (absence of evidence, not proof — state this caveat when reporting). Severity: **MUST**. All majors. Settles: M-C-01, M-C-03.

4. **On a Bazel-8-pinned repo, set `--incompatible_strict_action_env` explicitly if a static PATH and no `LD_LIBRARY_PATH` inheritance is wanted.** Rationale: default is `false` on 8.7.0 (confirmed against the versioned reference) and `true` only from Bazel 9.0.0 — a repo whose CI matrix spans both majors (e.g. rules_ocx's 8.7.0/9.x/rolling) runs a looser action environment on its 8.x leg with no configuration difference from its 9.x leg. Verify: `grep -n 'incompatible_strict_action_env' .bazelrc*` cross-referenced against the Bazel majors in the CI matrix. EMPTY OUTPUT + a Bazel-8 leg in the matrix reads: **finding** (undocumented cross-major divergence). Severity: **MUST** on Bazel 8; the flag is redundant on 9. Settles: M-C-05.

5. **Delete an explicit `--incompatible_strict_action_env=true`/`--incompatible_strict_action_env` line once the minimum supported Bazel major is 9.0.0.** Rationale: it becomes a pure no-op once the default matches it, and a stale rationale comment ("we enable strict env because…") misdescribes pre-9 behavior to a reader who no longer has an 8.x leg to reason about. Verify: reading heuristic — check the CI matrix / `.bazelversion` floor is ≥9.0.0 everywhere the rc file applies, then confirm the line is absent. EMPTY OUTPUT (nothing set, floor ≥9) reads: **pass**. Severity: **SHOULD**. Bazel 9 only. Settles: M-C-05.

6. **Do not assume `--repo_env` (with or without `--incompatible_strict_action_env`) restricts what a repository rule or module extension can read.** Rationale: the command-line reference states directly that repository rules "see the full environment anyway" — `--repo_env` only guarantees invalidation tracking for the named variables, it does not build an allowlist, unless the separate, still-experimental `--experimental_strict_repo_env` (default `false` since Bazel 8.6.0) is also set. Verify: grep `.bzl` repository-rule/module-extension implementations for `ctx.getenv(...)` and check whether `--experimental_strict_repo_env` is set anywhere in the rc files; cross-reference the sibling `module-extension-purity-and-repo-contents-cache` and `repository-rule-hermeticity-and-bcr` dives for the full `getenv`/`environ`-declaration check. EMPTY OUTPUT on the flag grep reads: **the repo rule sees the full client environment today, full stop** — not a partial mitigation. Severity: **MUST** (as a documentation/assumption correction — do not claim `--repo_env` alone is a restriction). Bazel ≥8.6.0 for the experimental flag's existence. Settles: M-C-06.

7. **State explicitly, wherever a repo documents its "hardened environment" posture, that build actions, repository rules, and test actions are three separate knobs at three separate maturity levels.** Rationale: a blanket "we run with strict env" claim is false for two of the three phases unless all three flags/behaviors are named — repo-rule strictness is experimental-off-by-default, test-action strictness does not exist yet ([issue #29472](https://github.com/bazelbuild/bazel/issues/29472), open). Verify: reading heuristic — does the repo's hermeticity documentation distinguish the three tiers? EMPTY (a blanket claim with no distinction) reads: **finding**, only when such a blanket claim exists; otherwise not applicable. Severity: **CONSIDER** (a prose-quality check, not independently machine-verifiable). All majors. Settles: M-C-06.

8. **Any action reading `ctx.info_file` must need rebuild-on-change; any action reading `ctx.version_file` must tolerate staleness.** Rationale: Bazel does not invalidate dependents on a volatile-status change by design; using the wrong file for a value that actually needs rebuild-on-change reproduces [issue #5573](https://github.com/bazelbuild/bazel/issues/5573) exactly. Verify: `grep -rn 'ctx\.info_file\|ctx\.version_file'` across `**/*.bzl`, then read each call site against the stable/volatile contract in §6. EMPTY OUTPUT reads: **pass** (no stamping in use — true for rules_ocx today). Severity: **MUST** wherever stamping exists. All majors. Settles: M-C-07.

9. **Never treat `--stamp` as the sole determinism control for a target needing bit-for-bit reproducibility.** Rationale: `--stamp` itself defaults `false`, but many `*_binary` rules default their own `stamp` attribute to `-1` ("defer to the flag"), so an unstamped-by-default target can silently become stamped purely from an invocation flag, with zero change to the target's definition. Verify: `bazel query 'attr(stamp, -1, //...)'` to enumerate every target deferring to the flag; check whether any CI job builds a member of that set both with and without `--stamp` and diffs the result. EMPTY OUTPUT (no `stamp=-1` targets) reads: **pass**. Severity: **MUST** wherever such targets exist. All majors. Settles: M-C-07.

10. **Treat any genrule/action shelling into a foreign build tool (`make`, `cmake`, `cargo build`, `npm run`, `go build`) as non-deterministic until execution-log diffing proves otherwise; pin `PATH` for it explicitly.** Rationale: nested build systems carry none of Bazel's purity obligations (§9), and the same page's PATH fact means an unpinned `PATH` alone re-executes such a genrule on every runner-image change regardless of the foreign tool's own behavior. Verify: `grep -n 'genrule(' **/BUILD*` then read each `cmd` for an invocation of a foreign build binary; separately, `grep -n 'action_env=PATH' .bazelrc*` to confirm PATH is pinned where such genrules exist. EMPTY OUTPUT on the first grep reads: **pass** (rules_ocx: 0 genrules in production, [starlark-code-shape.md:159](../bazel-audit/starlark-code-shape.md)). Severity: **SHOULD**, escalating to **MUST** once the output feeds a shared/trusted cache. All majors; shape F (no fleet repo nests a foreign build system today). Settles: M-C-04 (partial), M-C-01.

11. **When an action rebuilds with no apparent input change, diagnose it with `--execution_log_compact_file` diffing, not by re-reading the BUILD file.** Rationale: the compact log is Bazel's own recommended format and records the actual resolved command line, environment, and input digests — the only reliable way to see an undeclared read. Verify: run the two-build, diff-through-parser sequence in §8. EMPTY DIFF reads: the action key is stable — the rebuild has a legitimate cause (a real input changed); investigate the dependency graph next, not the action's determinism. Non-empty diff reads: the differing line names the undeclared read directly. Severity: **MUST** (process). All majors. Settles: M-C-02.

12. **Prefer `--execution_log_compact_file` over `--execution_log_json_file` for any new diagnostic tooling or CI artifact.** Rationale: identical data; the reference states the compact format is "significantly smaller and cheaper to produce." Verify: `grep -rn 'execution_log_json_file' .github .bazelrc*` — a hit with no corresponding migration note is a finding. EMPTY OUTPUT reads: **pass**. Severity: **SHOULD**. Both flags exist on 8 and 9. Settles: M-C-02.

13. **Set `--sandbox_fake_hostname=true` / `--sandbox_fake_username=true` wherever a build's output has ever varied by machine identity.** Rationale: both flags exist specifically to neutralize this leak at the sandbox layer without touching the offending tool, and both default `false` unchanged from 8.7.0 to current — nobody gets this normalization for free. Verify: `grep -rn 'hostname\|whoami\|\$USER\|getenv(.USER' **/*.bzl BUILD*` to find candidate tools, then `grep -n 'sandbox_fake_hostname\|sandbox_fake_username' .bazelrc*` to confirm the mitigation is set. A hit on the first grep with no hit on the second reads: **finding**. Severity: **MUST** where such a tool exists. All majors. Settles: M-C-01.

14. **Do not add `--action_env=<VAR>` for a variable whose value differs between developer machines on a repo sharing a remote cache across users.** Rationale: the command-line reference warns directly that doing so "can prevent cross-user caching if a shared cache is used" — the exact opposite of the intended effect. Verify: `grep -n 'action_env=' .bazelrc*`, then check each named variable's value stability across machines (reading heuristic — e.g. a `$HOME`-derived path fails this, a semantic version string passes). EMPTY OUTPUT (no `--action_env` at all, as in rules_ocx today) reads: **pass**. Severity: **MUST**. All majors. Settles: M-C-06.

15. **A CI matrix spanning Bazel 8 and 9 must document, in one place, which `--incompatible_*` defaults differ across the legs it tests — starting with `--incompatible_strict_action_env`.** Rationale: the entire point of a multi-major matrix is to catch a default-flip surprise before users hit it; leaving the divergence undocumented defeats that purpose even though the matrix technically exercises both values. Verify: reading heuristic — does `AGENTS.md`/CI docs list `--incompatible_strict_action_env` (or any flag whose default changed between the tested majors) in a per-major table? EMPTY OUTPUT reads: **finding**, for any repo with a real Bazel 8→9 CI split. Severity: **SHOULD**. Bazel 8 & 9. Settles: M-C-05.

16. **Avoid genrule outputs that are symlinks or directory trees.** Rationale: the General Advice page states directly that "Bazel doesn't copy over the directory/symlink structure created by genrules and its dependency checking of directories is unsound" — a correctness issue adjacent to, and often mistaken for, non-determinism. Verify (reading heuristic): read genrule `outs`/`cmd` for `ln -s`, `mkdir -p`, or `cp -r` producing a directory as a declared output. EMPTY OUTPUT reads: **pass**. Severity: **SHOULD**. All majors. Settles: M-C-03.

17. **Pin `PATH` via `--action_env=PATH=<fixed>` in CI wherever build times matter and CI runner images can drift.** Rationale: literal Build Encyclopedia sentence — "Any change to the value of `PATH` will cause Bazel to re-execute the command on the next build" — an unpinned `PATH` that varies between CI runner images (or between local and CI) is a systematic, whole-genrule-set cache-buster with no code change involved. Verify: compare `PATH` across CI runner images/agents (or read the CI image-pin policy); if it can vary and genrules exist, expect correlated full-genrule-set rebuilds on runner-image bumps. EMPTY OUTPUT (single fixed PATH, or `--action_env=PATH=` pinned) reads: **pass**. Severity: **MUST** wherever genrules exist and CI runner images are not pinned exactly. All majors; shape F today (0 genrules in rules_ocx production). Settles: M-C-04.

18. **Read `/dev/random`/`/dev/urandom` access as the explanation of last resort, only after eliminating the other seven causes.** Rationale: real (named explicitly in the practitioner taxonomy) but the rarest and most expensive to prove — it requires reading tool source or tracing syscalls, not a Bazel-level query. Verify (reading heuristic): grep tool source for `/dev/random`, `/dev/urandom`, `os.urandom`, unseeded `rand()`/`SecureRandom`. EMPTY OUTPUT reads: **pass**. Severity: **CONSIDER** (argued source, last in triage order per Decision 1). All majors. Settles: M-C-01.

## Fleet evidence

`rules_ocx` is the fleet's only Bazel repository, and on every flag this file names, it currently sets **none** of them — its 12 distinct flag kinds across all rc files ([build-contracts-and-ci-posture.md §1](../bazel-audit/build-contracts-and-ci-posture.md)) do not include `--sandbox_default_allow_network`, `--sandbox_fake_hostname`, `--sandbox_fake_username`, `--incompatible_strict_action_env`, `--experimental_strict_repo_env`, `--execution_log_compact_file`, or `--stamp`. This matches the map's Conflict 9 framing of the repo as an exemplar with narrow real smells rather than a cautionary tale: because the repo has **0 `genrule` targets, 0 `cc_*` targets, and 0 stamping usage in production** ([starlark-code-shape.md:159](../bazel-audit/starlark-code-shape.md); [build-contracts-and-ci-posture.md:37](../bazel-audit/build-contracts-and-ci-posture.md)), causes #1, #2, #3, #5 and stamping (§6) are currently **latent, not live** — the same inert-vs-live distinction the map draws for the `.bazelrc.user` C-toolchain override (M-C-09).

The one hermeticity-relevant override the repo does carry is on the *correct* flag for its purpose: `.bazelrc.user:2` sets `common --repo_env=CC=/home/mherwig/.local/bin/zig-bazel-cc` ([build-contracts-and-ci-posture.md:71, :220](../bazel-audit/build-contracts-and-ci-posture.md)) — `--repo_env`, not `--action_env`, correctly targeting a repository-rule/toolchain-detection concern (M-C-06's "right half" question). But per §5's finding, this override sits in a domain where the client environment is visible to repository rules regardless, and the repo neither sets `--experimental_strict_repo_env` nor needs to today, since the override governs zero compiled targets.

[config-inventory.md:313](../bazel-audit/config-inventory.md) confirms the gap is total, not partial: "Action-key determinism (timestamps, absolute paths, `PYTHONHASHSEED`, archive metadata) — zero mentions" across the fleet's existing Bazel-adjacent research and rule docs (`AGENTS.md`, `.claude/rules/starlark.md`). This dive is the first fleet-facing artifact to state any of it.

## AI-agent angle

- **Writes `--experimental_strict_action_env` (the pre-2019 name) instead of `--incompatible_strict_action_env`.** The flag was renamed years ago; training data and old blog posts may still carry the experimental name. Check: `grep -rn 'experimental_strict_action_env'` over any generated `.bazelrc` — any hit is stale.
- **Adds `--incompatible_strict_action_env=true` to a Bazel-9-only repo "to be safe," or omits it from a Bazel-8 repo assuming it's already the default everywhere.** Both directions are wrong depending on the pinned major (§5, rule 4/5). Check: read `.bazelversion`/the CI matrix before adding or removing the line.
- **Believes `--repo_env=X` makes a repository rule's environment an allowlist of just `X`.** It doesn't — the rule still sees the full client environment unless `--experimental_strict_repo_env` is also set (§5, rule 6). Check: does the generated guidance ever say "`--repo_env` restricts…"? If so, it's overclaiming; correct it to "`--repo_env` guarantees invalidation tracking for named variables."
- **Assumes Bazel's sandbox blocks network access by default.** It doesn't — `--sandbox_default_allow_network` defaults `true` (§7). Check: any generated claim that "the sandbox is hermetic by default" regarding network should be flagged and corrected to name the flag.
- **Picks `ctx.version_file` when the intent is "rebuild when this changes," or `ctx.info_file` when the intent is "don't rebuild for this."** The two are easy to swap and the swap reproduces a real historical bug ([issue #5573](https://github.com/bazelbuild/bazel/issues/5573), §6). Check: `grep -rn 'ctx\.\(info\|version\)_file'` and read each site against "does this value need rebuild-on-change?"
- **Writes a genrule that shells into `cargo build`, `npm run`, or `make` for convenience.** This is the nested-foreign-build-system trap (§9) — an LLM reaching for the familiar tool invocation rather than a purpose-built rule. Check: `grep -n 'genrule(' **/BUILD*` then read the `cmd` for a foreign build binary.
- **Returns a `struct(...)`-based custom provider, or uses `collect_data`/`collect_default`/`DefaultInfo(data_runfiles=...)`.** All four are explicitly deprecated on the current `extending/rules` page (§4) but appear throughout older tutorials an LLM may have trained on. Check: `grep -rn 'collect_data\|collect_default\|data_runfiles' **/*.bzl` — any hit is a modernization finding, independent of determinism per se.

## Contested / evolving

- **Action-environment strictness took seven years to ship safely.** Bazel 0.21 (2018) flipped `--incompatible_strict_action_env` to `true`, immediately broke macOS (`md5` in `/sbin` unreachable) and Windows (Python/PowerShell unreachable) builds, and was reverted to `false` within the same release cycle ([issue #7026](https://github.com/bazelbuild/bazel/issues/7026)). It did not default to `true` again until Bazel 9.0.0, merged 2025-11-17. Trend: the ecosystem is moving toward stricter action environments, but only after the toolchain-discovery problems the first attempt exposed were separately addressed — a caution against assuming any single `--incompatible_*` flip is safe to force early just because a future default agrees with it.
- **Repository-rule environment strictness is still marked experimental, unresolved since a 2019-era request ([issue #10996](https://github.com/bazelbuild/bazel/issues/10996)).** `--experimental_strict_repo_env` shipped in Bazel 8.6.0 (merged 2026-01-13) but remains off by default with no announced target for graduating to `--incompatible_*`. As of 2026-09-05, expect it to follow the same multi-year trajectory as its action-env sibling; do not write guidance assuming it becomes the default soon.
- **Test-action environment strictness does not exist yet.** [Issue #29472](https://github.com/bazelbuild/bazel/issues/29472) (filed against the current era, still open) is a live feature request, not a shipped behavior — the corpus's clearest example of "strict env" being a partial, in-progress property of Bazel rather than a single finished feature. Any guidance claiming a repo's tests run in a hardened environment should be read skeptically until this ships.
- **Bazel and rulesets still have no formal contract over stamping.** [Issue #14341](https://github.com/bazelbuild/bazel/issues/14341), open since 2021-11-29, is the tracked but unimplemented proposal to prevent a rule from silently making a build non-deterministic via unconditional status-file inclusion. `ctx.info_file`/`ctx.version_file` remain thinly documented relative to their blast radius. Trend: no sign of movement as of this era; treat every rule's stamping behavior as something to read in its source, not something Bazel enforces for you.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [jmmv.dev — Bazel and action (non-)determinism](https://jmmv.dev/2025/07/bazel-action-determinism.html) | Practitioner blog, Julio Merino | 2025-07-21 | The clearest single-page taxonomy of the eight causes; used for shape, corroborated per-cause by normative sources above |
| [bazel.build/basics/hermeticity](https://bazel.build/basics/hermeticity) | Official concept page | current (9.2.0-era) | Bazel's own definition of hermeticity and the isolation/source-identity framing |
| [bazel.build/reference/skyframe](https://bazel.build/reference/skyframe) | Official reference | current | The invalidation invariant this entire family reduces to, quoted verbatim |
| [bazel.build/reference/be/general](https://bazel.build/reference/be/general) | Build Encyclopedia | current | The genrule "General Advice" determinism checklist, verbatim, plus the PATH-invalidation fact |
| [bazel.build/extending/rules](https://bazel.build/extending/rules) | Rules-authoring reference | current | The action purity contract, and the deprecated-providers/runfiles-API notices |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Official flag reference (current) | current (9.2.0-era) | Exact current defaults for `action_env`, `host_action_env`, `incompatible_strict_action_env`, `sandbox_default_allow_network`, `sandbox_fake_hostname/username`, `execution_log_*`, `stamp`, `repo_env`, `experimental_strict_repo_env`, `incompatible_repo_env_ignores_action_env` |
| [bazel.build/versions/8.7.0/reference/command-line-reference](https://bazel.build/versions/8.7.0/reference/command-line-reference) | Official flag reference, pinned to rules_ocx's exact version | 8.7.0 | Confirms `incompatible_strict_action_env` defaults `false` at this exact pin — the version-specific fact the whole strictness finding rests on |
| [bazel.build/docs/sandboxing](https://bazel.build/docs/sandboxing) | Official docs | current | `--sandbox_debug` semantics and its disk-usage warning |
| [bazel.build/docs/user-manual](https://bazel.build/docs/user-manual) | Official user manual | current | Stable-vs-volatile workspace-status definitions, default stable/volatile keys, `--stamp` per-rule default semantics |
| [github.com/bazelbuild/bazel/issues/14341](https://github.com/bazelbuild/bazel/issues/14341) | Project issue tracker, open | filed 2021-11-29, open at 2026-09-05 | The unresolved stamping-contract gap; the `{`-character rules_docker bug that motivated it |
| [github.com/bazelbuild/bazel/issues/6786](https://github.com/bazelbuild/bazel/issues/6786) | Project issue tracker, closed | filed 2018-11-28 | Original ask for structured access to volatile status; grounds the stable/volatile API shape |
| [github.com/bazelbuild/bazel/issues/5573](https://github.com/bazelbuild/bazel/issues/5573) | Project issue tracker, historical bug | filed 2018 | The real, reproduced regression from picking the volatile file for a rebuild-worthy value |
| [github.com/bazelbuild/bazel/issues/11422](https://github.com/bazelbuild/bazel/issues/11422) | Project issue tracker, closed | filed 2020-05-17 | `ctx.info_file`/`ctx.version_file` documentation-gap report |
| [github.com/bazelbuild/bazel/pull/27670](https://github.com/bazelbuild/bazel/pull/27670) (+ [#27652](https://github.com/bazelbuild/bazel/issues/27652), [#26587](https://github.com/bazelbuild/bazel/issues/26587), [#7026](https://github.com/bazelbuild/bazel/issues/7026), [#6648](https://github.com/bazelbuild/bazel/issues/6648)) | Merged PR + tracking-issue cluster | merged 2025-11-17, targets 9.0.0 | The exact commit and version that flipped `incompatible_strict_action_env`'s default, and the 2018/2019 history of the first, reverted attempt |
| [github.com/bazelbuild/bazel/issues/29472](https://github.com/bazelbuild/bazel/issues/29472) | Project issue tracker, open feature request | open at 2026-09-05 | Confirms test actions have no strict-env equivalent — the sharpest surprise in this dive |
| [github.com/bazelbuild/bazel/pull/28189](https://github.com/bazelbuild/bazel/pull/28189) | Merged PR | merged 2026-01-13, `[8.6.0]` | Introduces `--experimental_strict_repo_env`; the PR body itself states repo rules "operate in an inherently non-hermetic domain" by design |
| [github.com/bazelbuild/bazel/blob/master/src/tools/execlog/README.md](https://github.com/bazelbuild/bazel/blob/master/src/tools/execlog/README.md) | Ruleset's own tool docs | current | Exact `bazel-bin/src/tools/execlog/parser` invocation for diagnosing one action's non-determinism |
| [blog.bazel.build/2026/01/20/bazel-9.html](https://blog.bazel.build/2026/01/20/bazel-9.html) | Official release announcement | 2026-01-20 | Era-grounding for the Bazel 9.0.0 release this file's version-specific claims are pinned against |

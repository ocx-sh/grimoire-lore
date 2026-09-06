---
title: "Action keys and cache hygiene — what enters a REAPI digest, what never does, and how to prove one is unstable"
topic: action-keys-and-cache-hygiene
group: bazel-caching-rbe
family: BZL-CACHE
agent: bazel-wave2-action-keys-and-cache-hygiene
model: sonnet
date_researched: 2026-09-05
sources_count: 15
primary_sources_count: 12
settles: [M-D-01, M-D-02, M-D-19, M-D-20, M-D-22]
scope: >
  Covers the exact contents of a REAPI v2 Action/Command/Directory/Platform
  digest, the two spec-mandated sort orders and who actually has to obey them,
  the stated cache-key omissions (host tools, undeclared env vars), the
  stamping split (volatile vs stable status files), what "operator salt"
  really is and why no Bazel flag sets it, the SymlinkAbsolutePathStrategy
  server policy, and the standard cache-miss diagnostic loop. Does not cover
  BwoB flag defaults, the six-cache taxonomy, disk-cache GC, or eviction/exit
  code 39 in depth — see bwob-eviction-and-cache-flags.md. Does not cover
  --credential_helper, the cache trust boundary, or RE-readiness constraints
  in depth — see rbe-readiness-and-cache-trust-boundary.md. Touches both only
  where they intersect action-key content itself.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A REAPI `Action` digest is exactly: `command_digest` + `input_root_digest` (a Merkle root) + optional `timeout` + `do_not_cache` + optional `platform` + an operator `salt` — nothing else, and `Action`/`Command`/`Directory` fields not listed here never enter it.
- `Command.environment_variables` MUST be lexicographically sorted by name (byte-wise UTF-8); `Command.output_paths` MUST also be sorted; a `Directory`'s files, directories, and symlinks are each sorted independently by path, not merged into one list.
- `Platform.properties` sort by name **then value** — a nuance easy to under-implement if you only sort by name.
- Bazel states plainly it "does not track tools outside a workspace" — a `/usr/bin/gcc` swap is invisible to the cache key by design.
- Only environment variables explicitly declared via `--action_env=NAME[=VALUE]` enter an action's digest; an ambient, undeclared shell variable a tool happens to read is invisible to the key even when it changes the output — a hermeticity gap, not a sorting bug.
- `--incompatible_strict_action_env` defaults **true**: a static `PATH`, no inherited `LD_LIBRARY_PATH`. Flipping it off to fix a flaky build reintroduces exactly the invisible-dependency class above.
- `arguments[0]` PATH resolution changed in REAPI **v2.3**: pre-2.3 forbade it; v2.3+ permits PATH-style lookup when `PATH` is present in the env list — two workers with different `PATH`s can resolve `arguments[0]` to different binaries while producing an *identical* Action digest.
- Stamping has a hard split: `bazel-out/volatile-status.txt` is deliberately exempt from action invalidation ("Bazel pretends that the volatile file never changes"); `bazel-out/stable-status.txt` is **not** exempt — a `STABLE_`-prefixed value that changes every build defeats the point of `--stamp` and busts the cache on every invocation.
- There is no Bazel client flag that sets `Action.salt` directly. Bazel constructs it internally from three inputs: whether the spawn may be executed remotely (i.e., carries a `no-remote-exec`/`no-remote` tag), the workspace name, and `--experimental_remote_scrubbing_config`'s scrub value — confirmed by reading `RemoteExecutionService.java`'s `buildSalt()` directly.
- Toggling `tags = ["no-remote-exec"]` (or `no-remote`) on a target changes that target's cache-salt namespace — expect a full cache miss on the toggle; this is not a regression to chase.
- `SymlinkAbsolutePathStrategy` (`DISALLOWED` vs `ALLOWED`) is a **server-declared capability**, advertised via `CacheCapabilities.symlink_absolute_path_strategy` in REAPI's `GetCapabilities` RPC. Bazel the client has no flag to require `DISALLOWED` — it is invisible to the client and to `bazel build`'s own output.
- `buchgr/bazel-remote` — the cache-server shape `rules_ocx` itself uses — hardcodes `SymlinkAbsolutePathStrategy_ALLOWED` in its gRPC capabilities response with no configuration flag, as read from `server/grpc.go` on 2026-09-05.
- The frame's named flag `--experimental_remote_merkle_tree_cache` does not exist anywhere in the current CLI reference or the `bazelbuild/bazel` source tree (0 hits via full-text search of both). The real flag is `--[no]experimental_remote_discard_merkle_trees`, boolean, default **true**, and its intent is inverted from what the phantom name implies: it *discards* in-memory Merkle trees to save memory, forcing Bazel to recompute them on a cache miss or retry — it does not cache them for reuse.
- The standard cache-miss diagnostic loop is: build twice with `--execution_log_compact_file=<path>`, build `//src/tools/execlog:parser` from a `bazelbuild/bazel` source checkout, run it against both logs with matched `--output_path`s (it reorders the second log to match the first's action order, matching by first output — it does not diff for you), then diff the two `.txt` files with an ordinary text differ and read the **first** divergent action, not the whole file.
- `--noremote_accept_cached` forces a clean re-execution for isolating a specific suspect result; `--build_event_text_file=<path>` recovers the *canonical* command line (grep for `command_line_label: "canonical"`) when `.bazelrc` fragments obscure what actually ran.
- `--remote_cache`/`--remote_executor` default to scheme `grpcs` when no scheme is given in the URI — an HTTP-only backend (bazel-remote's default mode) needs an explicit `http://`/`https://` or Bazel will not speak the right protocol to it.
- Exit code **39** (`REMOTE_CACHE_EVICTED`) is a plain registered `ExitCode`, unconditional default behavior since Bazel 7.0 — it is not gated behind any `--incompatible_*` migration flag (full pin-down of the retry policy is bwob-eviction-and-cache-flags.md's).

## Findings

### 1. The exact contents of an Action digest

The REAPI v2 `Action` message ([`remote_execution.proto:608-666`](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L608), fetched and read in full) carries exactly:

- `command_digest` — the digest of the associated `Command`.
- `input_root_digest` — the digest of the root `Directory` of a Merkle tree; every subdirectory and blob referenced MUST also be present in the CAS.
- `timeout` (optional) — explicitly part of the digest: "two `Action`s with different timeouts are different, even if they are otherwise identical," specifically so a too-short timeout produces a cache **miss** rather than a hidden cache **hit** against a longer-timeout run.
- `do_not_cache` — a bool; when true, the result cannot be cached and in-flight duplicate requests are not merged.
- `salt` — an operator-set `bytes` field, "typically comes from operational configuration specific to sources such as repo and service configuration," used to disown a poisoned set of `ActionResult`s. See Finding 6 for what Bazel actually puts here.
- `platform` (optional) — properties are "implicitly part of the action digest, so even tiny changes in the names or values (like changing case) may result in different action cache entries." New in v2.2: clients SHOULD set platform on both `Action` and `Command`; servers SHOULD prefer the `Action`-level one.

Nothing else is part of the `Action` proto. In particular: the `Command`'s `arguments` and `environment_variables` are not directly on `Action` — they only enter the digest indirectly, via `command_digest`, which is the digest of the separately-hashed `Command` message. (Settles M-D-01.)

### 2. The two spec-mandated sort orders — and a third one worth naming

- `Command.environment_variables` "MUST be lexicographically sorted by name. Sorting of strings is done by code point, equivalently, by the UTF-8 bytes" ([`Command`, line 683-718](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L716)). The same message also requires `Command.output_paths` to be sorted the same way — a requirement the brief didn't name but is directly adjacent and easy to miss when reading only the env-var line.
- `Directory`'s files, directories, and symlinks "must **each** be sorted in lexicographical order by path" ([line 925-931](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L925)) — each list independently, not merged into one alphabetized listing across types. `NodeProperties` on a file/dir/symlink must also be sorted by property name.
- `Platform.properties` "MUST be lexicographically sorted by name, **and then by value**" ([line 899-901](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L899)) — a naive "sort by name only" implementation is spec-non-compliant the moment two properties share a name with different values.

Who actually has to obey this: **Bazel's own client implementation does this correctly for `ctx.actions.run`/`ctx.actions.run_shell`** — a BUILD/`.bzl` author never manually sorts an env dict to satisfy REAPI. The real exposure is anyone implementing or operating REAPI-adjacent tooling directly: a home-grown cache proxy, a custom RBE shim, or code that hand-builds `Directory`/`Command` protos outside Bazel's own remote module. For that audience, an unsorted list is self-inflicted cache-key instability — two functionally identical inputs hash to two different digests, and every downstream consumer of that key sees a false miss. (Settles M-D-02.)

### 3. Stated omissions: tools outside the workspace, and undeclared environment variables

[`bazel.build/remote/caching`](https://bazel.build/remote/caching) states directly: "Bazel currently does not track tools outside a workspace. This can be a problem if, for example, an action uses a compiler from `/usr/bin/`." A host-resolved compiler, linker, or interpreter is invisible to the action's inputs and therefore to its digest — swapping the host toolchain silently produces a cache hit against stale output.

The same page states: "Only environment variables explicitly whitelisted via `--action_env` are included in an action definition." Cross-checked against the current CLI reference: `--action_env` ("Specifies the set of environment variables available to actions with target configuration... by `name`, in which case the value will be taken from the invocation environment") and `--incompatible_strict_action_env` (default **true**: "Bazel uses an environment with a static value for PATH and does not inherit `LD_LIBRARY_PATH`. Use `--action_env=ENV_VARIABLE` if you want to inherit specific environment variables from the client, but note that doing so can prevent cross-user caching if a shared cache is used"). The consequence: an ambient shell variable a build tool happens to read (a locale, a feature flag, a proxy setting) that is **not** passed through `--action_env` is both non-hermetic *and* invisible to the cache key — two machines with different values for that variable can produce different outputs from what the cache considers the identical action, and nothing about the digest will ever surface the discrepancy.

### 4. `arguments[0]` PATH resolution — a v2.3 change worth flagging as a same-key hazard

`Command.arguments` documents a resolution change: "Changed in v2.3. v2.2 and older require that no PATH lookups are performed, and that relative paths are resolved relative to the input root. This behavior can, however, not be relied upon, as most implementations already followed the rules described above" ([line 700-708](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L700)). Under a v2.3+ server, if `environment_variables` contains a `PATH` entry, `arguments[0]` "SHOULD be respected" for PATH-style resolution. Because the digest hashes the *literal argument string* (e.g. `"gcc"`), not the binary it resolves to, two workers with different `PATH` contents can resolve the same argument to two different binaries while producing an *identical* Action digest and therefore an identical cache key — a genuine "same key, different result" class distinct from the tools-outside-workspace omission in Finding 3 (that one is about a binary never appearing in the command at all; this one is about a bare command name resolving differently under an identical digest).

### 5. The stamping split: volatile is exempt, stable is not

Confirmed directly from [`bazel.build/docs/user-manual`](https://bazel.build/docs/user-manual): Bazel partitions workspace-status keys into two buckets. `bazel-out/stable-status.txt` holds every key whose name starts with `STABLE_`; `bazel-out/volatile-status.txt` holds the rest. The volatile file is deliberately walled off from cache invalidation: "Bazel pretends that the volatile file never changes. In other words, if the volatile status file is the only file whose contents has changed, Bazel will not invalidate actions that depend on it." The stable file gets no such exemption: "If the contents of `bazel-out/stable-status.txt` change, Bazel invalidates the actions that depend on them." Default volatile keys are `BUILD_TIMESTAMP` and `FORMATTED_DATE`; a custom `--workspace_status_command` script controls everything else by naming its output keys with or without the `STABLE_` prefix. Starlark rules read these through `ctx.info_file` (stable) and `ctx.version_file` (volatile) — both real, working `ctx` attributes, but historically undocumented in the Rules API reference ([GH #11422](https://github.com/bazelbuild/bazel/issues/11422)).

The failure mode this enables: putting a value that changes every build (a raw timestamp, an unpinned git describe with a dirty-flag, a random build ID) behind a `STABLE_` key defeats the entire point of the split — it busts the cache on every single invocation while looking, by its `STABLE_` name, like something that should be safe to depend on. This is the general shape of the regression a 2019 Hacker News thread and two GitHub issues ([#14341](https://github.com/bazelbuild/bazel/issues/14341), [#6786](https://github.com/bazelbuild/bazel/issues/6786)) describe against `rules_docker`.

### 6. What "operator salt" actually is — and why there is no client flag for it

The REAPI spec leaves `salt` entirely up to "operational configuration"; it does not say who sets it or how. Reading Bazel's own remote module resolves this precisely. `RemoteExecutionService.java`'s `buildSalt()` ([source, fetched 2026-09-05](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/RemoteExecutionService.java#L376-L391)) builds a `CacheSalt` proto from exactly three inputs:

```java
private static ByteString buildSalt(Spawn spawn, @Nullable SpawnScrubber spawnScrubber) {
  CacheSalt.Builder saltBuilder =
      CacheSalt.newBuilder().setMayBeExecutedRemotely(Spawns.mayBeExecutedRemotely(spawn));
  // ... optionally sets workspace name ...
  // ... optionally sets a scrub salt from spawnScrubber.getSalt() ...
  return saltBuilder.build().toByteString();
}
```

- `mayBeExecutedRemotely(spawn)` is derived from whether the spawn's tags include `no-remote-exec`, `no-remote`, or `no-remote-cache` — the exact string constants live in [`ExecutionRequirements.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/actions/ExecutionRequirements.java#L318-L333) (`NO_REMOTE_CACHE = "no-remote-cache"`, `NO_REMOTE_EXEC = "no-remote-exec"`, `NO_REMOTE = "no-remote"`).
- The workspace name, when set.
- A "scrub salt" from an optional `SpawnScrubber`, populated when `--experimental_remote_scrubbing_config` is used.

There is no CLI flag named `salt` and no Starlark `ctx.actions.run(salt=...)` parameter — the field is entirely Bazel-internal. The practical consequence: adding or removing a `no-remote-exec`/`no-remote` tag on a target changes that target's `mayBeExecutedRemotely` bit, which changes its salt, which moves every one of its actions into a different cache namespace. A full cache miss immediately after such a tag edit is expected behavior, not a regression. `--experimental_remote_scrubbing_config` ("Converts to a `Scrubber`", default "see description" — per the [command-line reference](https://bazel.build/reference/command-line-reference)) is the one supported, still-`experimental` mechanism for deliberately reshaping what enters the salt/scrub layer, intended "to facilitate sharing a remote/disk cache between actions executing on different" configurations. (Settles part of the brief's must-DECIDE on salt — see Decisions.)

### 7. `SymlinkAbsolutePathStrategy`: a server capability, invisible to the Bazel client

`SymlinkAbsolutePathStrategy` ([`remote_execution.proto:2243-2255`](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L2243)) is a two-value enum: `DISALLOWED` (server returns `INVALID_ARGUMENT`/`FAILED_PRECONDITION` on an absolute symlink target) or `ALLOWED` ("possibly resulting in non-hermetic builds"). It is exposed only as a field on `CacheCapabilities.symlink_absolute_path_strategy` ([line 2302](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L2302)), which a server returns from its `GetCapabilities` RPC. It is **not** a Bazel client flag — a full-text search of the current command-line reference finds zero occurrences of the string. A build cannot ask Bazel to require `DISALLOWED`; the policy lives entirely with whoever operates the cache/RE backend, and `bazel build`'s own output gives no signal about which one is in force.

Concretely: `buchgr/bazel-remote` — the exact cache-server shape `rules_ocx`'s own remote cache uses ([wave-1 grounding, rbe-and-caching.md §19](../bazel-topic-map/rbe-and-caching.md)) — hardcodes the answer. Its gRPC capabilities handler ([`server/grpc.go:129`, fetched 2026-09-05](https://github.com/buchgr/bazel-remote/blob/master/server/grpc.go#L129)) sets:

```go
SymlinkAbsolutePathStrategy: pb.SymlinkAbsolutePathStrategy_ALLOWED,
```

with no corresponding entry in its config surface — it is not a flag a `bazel-remote` operator can flip to `DISALLOWED`. Anyone treating "we have a remote cache" as a hermeticity backstop against absolute-symlink outputs is wrong for this specific, widely-deployed server. (Settles M-D-19.)

### 8. The diagnostic loop, precisely

[`bazel.build/remote/cache-remote`](https://bazel.build/remote/cache-remote) and the [execution log parser README](https://github.com/bazelbuild/bazel/blob/master/src/tools/execlog/README.md) together give the exact loop, with one correction to how it's usually paraphrased: **the parser tool reorders, it does not diff.**

1. `bazel clean` to remove any local-cache confound, then re-run the build once to confirm baseline behavior (INFO line cache-hit counts).
2. Build twice with `--execution_log_compact_file=/tmp/exec{1,2}.log` — compact format is recommended ("produces much smaller files with very little runtime overhead").
3. Build the parser from a `bazelbuild/bazel` source checkout: `bazel build //src/tools/execlog:parser` (it is a Java tool, not distributed as a standalone release binary, and needs a local JDK — [GH #12012](https://github.com/bazelbuild/bazel/issues/12012)).
4. Run it against **both** logs in one invocation with matched `--output_path`s:
   ```
   bazel-bin/src/tools/execlog/parser \
     --log_path=/tmp/exec1.log --log_path=/tmp/exec2.log \
     --output_path=/tmp/exec1.log.txt --output_path=/tmp/exec2.log.txt
   ```
   This converts `exec1.log` to text as-is, but **reorders** `exec2.log` to match `exec1.log`'s action order — matching actions by their first declared output. Actions present in the second log but absent from the first are appended at the end of `exec2.log.txt`. This reordering exists because "Bazel is nondeterministic" about the order actions appear in the raw log across two runs, and a naive line-diff of two unmatched logs is noise.
5. Diff the two `.txt` files with an ordinary text differ (the parser itself does not diff).
6. Read the **first** divergent action, not the whole file — every action downstream of it in the same dependency chain will also show as different purely because its inputs changed, and chasing those individually wastes the investigation. (This generalizes BuildBuddy's own debugging methodology: "the earliest action is most likely the root cause of the change from the previous build.")

Two isolation flags round out the loop: `--noremote_accept_cached` forces a clean re-execution ignoring any cache hit, for confirming whether a specific suspect result is a stale cache entry versus a genuine action change; `--build_event_text_file=/tmp/bep.txt` recovers the exact canonical command line Bazel effectively used (grep the output for `command_line_label: "canonical"`), needed because flags assembled from multiple `.bazelrc` fragments are otherwise invisible. `--restrict_to_runner="linux-sandbox"` on the parser filters output to one execution strategy when a build mixes local and remote execution. (Settles M-D-22.)

### 9. Re-verifying the phantom flag, at both the reference and the source level

The frame and a second wave-1 scout both carried forward `--experimental_remote_merkle_tree_cache`. Two independent full-text searches confirm it does not exist:

- The live [command-line reference](https://bazel.build/reference/command-line-reference), fetched and parsed in full: zero occurrences of `merkle_tree_cache`; six occurrences of `discard_merkle_trees`.
- A GitHub code search scoped to `bazelbuild/bazel` for the literal string `remote_merkle_tree_cache`: **0 results**. The same search for `discard_merkle_trees`: 3 results, including the flag's actual declaration.

The real flag, confirmed directly in [`RemoteOptions.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/options/RemoteOptions.java#L786-L797):

```java
@Option(
    name = "experimental_remote_discard_merkle_trees",
    defaultValue = "true",
    ...
    help =
        "If set to true, discard in-memory copies of the input root's Merkle tree and associated "
            + "input mappings during calls to GetActionResult() and Execute(). This reduces "
            + "memory usage significantly, but does require Bazel to recompute them upon remote "
            + "cache misses and retries.")
```

The name `--experimental_remote_merkle_tree_cache` reads as "cache Merkle trees" (keep them around for reuse); the real flag's default behavior *discards* them (free memory, recompute on demand) — genuinely inverted intent, not just a rename. This is the second such case surfaced in this dive alone: exit code 39 is likewise sometimes described as gated behind an `--incompatible_remote_use_new_exit_code_for_lost_inputs`-style flag, but a repo-wide code search for that name returns 0 hits, and the [Bazel 7.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/7.0.0) state it plainly as unconditional default behavior since that release: "When an incremental build fails because one or more blobs were evicted from the disk/remote cache, Bazel will now exit with exit code 39" — registered in [`ExitCode.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/util/ExitCode.java#L68-L69) simply as `REMOTE_CACHE_EVICTED = createInfrastructureFailure(39, ...)`, no flag involved. (Full eviction-retry policy: bwob-eviction-and-cache-flags.md.) (Settles M-D-20.)

### 10. Bonus: cache-server protocol scheme defaults

Not named in the brief but directly adjacent and cheaply verified while reading the reference: `--remote_cache` and `--remote_executor` both default to scheme `grpcs` when the URI carries none. An HTTP-only backend must spell out `http://` or `https://` explicitly. `rules_ocx`'s own `build --remote_cache=https://bazel-cache.ocx.sh` does this correctly. (Touches M-D-18 — not fully adjudicated here, server-protocol-matching is otherwise out of this dive's scope.)

## Decisions

**Decision 1 — the diagnostic loop is the runnable sequence in Finding 8, and it carries a real assumption.** Evidence: `bazel.build/remote/cache-remote`'s stated procedure plus the execlog README's exact tool semantics (reorder, not diff). Assumption named: the operator has, or can obtain, a `bazelbuild/bazel` **source checkout** to build `//src/tools/execlog:parser` — it ships in no release archive and needs a local JDK. A team without a Bazel source checkout on hand should budget for that step before trusting this loop as "quick."

**Decision 2 — the shipped rule does not recommend setting `salt`.** Evidence: no Bazel CLI flag or Starlark API sets `Action.salt`; `RemoteExecutionService.buildSalt()` derives it entirely from the `no-remote-exec`/`no-remote` tag state, the workspace name, and an optional scrub config. There is nothing to "recommend using" — there is only a behavior to document so a tag-driven cache-namespace change isn't mistaken for a regression. `--experimental_remote_scrubbing_config` is likewise not proactively recommended: it remains `experimental`, requires an out-of-band protobuf text-format file, and its purpose (deliberately sharing a cache across differently-configured builds) is a specific cross-team decision, not a default-hygiene tip. Assumption named: no source in this corpus states a graduation timeline for scrubbing config as of 2026-09-05.

## Normative guidance candidates

1. **State the Action digest's exact contents when documenting or debugging a cache miss: command digest, sorted env (inside the command digest), input-root Merkle digest, optional timeout, `do_not_cache`, optional platform, salt — nothing else.**
   Rationale: every cache-miss investigation that starts from a wrong mental model of what's hashed wastes time on inputs that were never part of the key.
   Verify: reading heuristic against [`Action`, `remote_execution.proto:608-666`](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L608). No command; empty output N/A. Severity: MUST. Bazel 7/8/9, REAPI v2 (all minor revisions observed). Settles M-D-01.

2. **Never assume a host-resolved tool (a bare `/usr/bin/`-style compiler, interpreter, or linker invoked without a `File` from a declared toolchain/dependency) is covered by the cache key.**
   Rationale: Bazel's own docs state it "does not track tools outside a workspace" — a host toolchain swap silently serves stale cached output.
   Verify: grep `.bzl`/`BUILD.bazel` for `ctx.actions.run`/`ctx.actions.run_shell` calls whose `executable` argument is a bare string rather than a `File` from `ctx.executable.*`/a toolchain. Empty output (every executable traces to a declared `File`) = pass. Severity: MUST. Bazel all, ruleset n/a (core behavior). Settles M-D-01.

3. **Do not treat a cache miss immediately following a `timeout =` edit as a bug.**
   Rationale: `timeout` is part of the `Action` digest by design, specifically so a shortened timeout cannot silently reuse a longer-timeout cache entry.
   Verify: reading heuristic — correlate the miss with a recent `timeout` attribute change in the target or its transitive deps. Severity: CONSIDER. Bazel all.

4. **A target that sets `tags = ["no-cache"]` (or the REAPI-level `do_not_cache`) SHOULD carry a comment explaining why.**
   Rationale: `do_not_cache` is a load-bearing performance/correctness decision (nondeterministic action, sensitive output), not a hermeticity setting — an unexplained instance invites someone to "fix" it by removing the tag.
   Verify: `bazel query 'attr(tags, "no-cache", //...)'`; for each hit, check the surrounding BUILD/`.bzl` for a comment. Empty query output = pass (no such targets, nothing to check). Severity: SHOULD. Bazel all.

5. **Anyone implementing or operating REAPI-adjacent tooling directly (a cache proxy, a custom RBE shim) MUST sort `Command.environment_variables` and `Command.output_paths` lexicographically by name/path, and sort each of a `Directory`'s files/directories/symlinks lists independently by path, before computing a digest.**
   Rationale: the spec makes both a MUST; an unsorted list is self-inflicted cache-key instability across two functionally identical inputs. Bazel's own client already does this correctly for standard rule authoring — this rule is for the narrower audience writing REAPI client/server code themselves.
   Verify: read the tool's serialization code for an explicit sort call before marshalling the repeated fields; absence of a sort call ahead of a `SerializeToString`/hash call is the defect. Severity: MUST (narrow audience). Bazel n/a — REAPI v2 spec-level. Settles M-D-02.

6. **The same custom-tooling audience: sort `Platform.properties` by name *then* value, not name alone.**
   Rationale: two properties sharing a name with different values, left in nondeterministic order, still violate the spec's sort requirement even though "sorted by name" superficially looks satisfied.
   Verify: read the serialization code's comparator; a name-only comparator without a value tiebreaker is the defect. Severity: CONSIDER (narrow audience, subtler bug class). Bazel n/a — REAPI v2.

7. **To diagnose a specific action's cache-key instability, build twice with `--execution_log_compact_file=<path>`, build `//src/tools/execlog:parser` from a `bazelbuild/bazel` source checkout, run it against both logs with matched `--output_path`s, then diff the resulting `.txt` files with an ordinary text differ.**
   Rationale: this is the exact upstream-documented loop; skipping the parser and diffing raw compact-format logs directly produces noise because action order is nondeterministic across runs.
   Verify: the sequence itself is the check. Empty diff = the two runs were execution-log-identical at the Bazel level (investigate server-side: eviction, `--remote_instance_name`, credential/auth scope, write authorization) — that is a **pass** on Bazel-side reproducibility, not proof there is no problem. Non-empty diff at action N = action N's declared command/inputs changed and is the root cause. Severity: MUST. Bazel 7/8/9. Settles M-D-22.

8. **Read the diff's *first* divergent action, never the aggregate cache-hit percentage or a downstream action further into the same dependency chain.**
   Rationale: every action after the first divergence will also show as changed purely because its inputs changed — chasing those individually wastes the investigation and can misdirect it toward an unrelated target.
   Verify: sort the parsed log by action start time; the earliest-starting action that regressed is the one to investigate first. Severity: MUST. Bazel 7/8/9. Settles M-D-22.

9. **Use `--noremote_accept_cached` to force a clean re-execution when isolating whether one specific suspect result is a stale/bad cache entry rather than a genuine action-content change.**
   Rationale: without it, a suspect result may simply be served again from cache, masking whether re-execution would actually reproduce it.
   Verify: rerun with the flag; confirm the build log shows the action actually executing rather than reporting a remote cache hit. Severity: SHOULD. Bazel 7/8/9.

10. **Recover the effective canonical command line with `--build_event_text_file=<path>` before assuming you know what flags a build actually ran with.**
    Rationale: flags assembled from multiple `.bazelrc`/`.bazelrc.user`/CI-appended fragments are otherwise invisible in the terminal output.
    Verify: `grep -A2 'command_line_label: "canonical"' <bep.txt>`; empty output means the BEP text file wasn't captured — rerun with the flag. Severity: SHOULD. Bazel 7/8/9.

11. **Never put a value that changes on every build (a raw timestamp, an un-pinned git-describe with a dirty flag, a random ID) behind a `STABLE_`-prefixed workspace-status key.**
    Rationale: `bazel-out/stable-status.txt` is *not* exempt from action invalidation — an unstable "stable" key busts the cache on every build while its name advertises the opposite.
    Verify: run the `--workspace_status_command` script twice in immediate succession and diff its `STABLE_`-prefixed output lines. Empty diff = pass (every stable key is actually stable); any differing `STABLE_` line is the defect. Severity: MUST. Bazel all.

12. **Do not attempt to set `Action.salt` via a flag or a rule attribute — no such knob exists.**
    Rationale: `RemoteExecutionService.buildSalt()` derives salt entirely from the spawn's `no-remote-exec`/`no-remote` tag state, the workspace name, and `--experimental_remote_scrubbing_config`; there is no public API to set it directly, and guidance suggesting one is fabricated.
    Verify: grep the Starlark Rules API docs (`ctx.actions.run`/`run_shell` signatures) for a `salt` parameter — none exists; grep the CLI reference for a bare `--*salt*` flag — none exists. Empty output on both = confirms the absence, not a defect to fix. Severity: MUST (as a "do not invent this" guardrail). Bazel all.

13. **Document, rather than "fix," a full cache miss immediately following a `no-remote-exec`/`no-remote`/`no-remote-cache` tag addition or removal on a target.**
    Rationale: that tag flips `mayBeExecutedRemotely`, which is folded into the action's salt, which moves every one of the target's actions into a different cache namespace — the miss is expected, not a regression.
    Verify: correlate the miss with a recent tag change via `git blame`/`bazel query --output=build` on the target. Severity: CONSIDER (reading heuristic; explains a trap, doesn't gate a change). Bazel 7/8/9.

14. **Do not proactively recommend `--experimental_remote_scrubbing_config` as a default-hygiene flag.**
    Rationale: it remains `experimental`, requires an out-of-band protobuf text-format config file, and exists to solve a specific, deliberate problem (sharing a cache across differently-configured builds) — not a general cache-hit improvement.
    Verify: grep `.bazelrc*` for the flag; a match with no accompanying config-file comment explaining the cross-config-sharing rationale is a finding. Empty output = pass. Severity: CONSIDER. Bazel 7/8/9 (flag is `experimental`, no version floor documented).

15. **Before trusting any hermeticity claim about a remote cache's handling of absolute-target output symlinks, verify what `SymlinkAbsolutePathStrategy` the deployed server actually advertises — Bazel the client cannot tell you.**
    Rationale: the strategy is a server-declared REAPI capability (`CacheCapabilities.symlink_absolute_path_strategy`), invisible to the Bazel client and to `bazel build`'s own output; assuming "we have a remote cache" implies hermetic symlink handling is unfounded.
    Verify: read the deployed server's own source/docs for its `GetCapabilities` implementation, or query the running server's Capabilities endpoint directly with a REAPI-aware client. Empty result (server doesn't implement the endpoint) = treat as unknown, not as `DISALLOWED`. Severity: MUST for anyone standing up or adopting a remote cache. Bazel all, REAPI v2. Settles M-D-19.

16. **Do not assume a `buchgr/bazel-remote` deployment enforces symlink hermeticity by default.**
    Rationale: as read on 2026-09-05, its gRPC capabilities handler hardcodes `SymlinkAbsolutePathStrategy_ALLOWED` with no configuration flag to change it.
    Verify: for a self-hosted `bazel-remote`, grep its `server/grpc.go` (or the installed binary's version-matched source) for `SymlinkAbsolutePathStrategy`; for any REAPI-compatible server, prefer testing directly over trusting the project's marketing. Severity: MUST if this specific server is in use. Bazel all. Settles M-D-19.

17. **Never carry forward a remote-cache flag name from memory, a blog post, or a prior research note without re-deriving it from the current command-line reference or the exact Bazel version's own `bazel help <flag>`.**
    Rationale: this corpus alone carried `--experimental_remote_merkle_tree_cache` — a flag that has never existed — through two independent research passes before a full-text fetch caught it; the real flag (`--experimental_remote_discard_merkle_trees`) has inverted intent from the phantom name.
    Verify: `bazel help --long | grep -i <term>` against the pinned Bazel version, or grep a freshly fetched copy of `bazel.build/reference/command-line-reference`. Zero matches for a named flag means it does not exist and must not be cited. Severity: MUST (house rule, not Bazel-version-specific). Bazel all. Settles M-D-20.

18. **An explicit remote-cache flag value that exactly matches the current documented default (with no comment explaining the pin) is dead configuration — either drop it or comment why it's pinned against a future default change.**
    Rationale: it protects nothing today and reads as meaningful tuning when it is not.
    Verify: compare each explicit `.bazelrc*` remote-cache flag value against the current CLI reference default. Fleet finding: `rules_ocx`'s `--remote_timeout=60` (`.bazelrc.user:9`, `action.yml:28`) exactly matches today's documented default of `"60s"`, uncommented. Empty output (every explicit value differs from default, or carries a rationale comment) = pass. Severity: CONSIDER. Bazel 7/8/9.

19. **An HTTP-only remote cache backend's URI in `.bazelrc*` MUST carry an explicit `http://`/`https://` scheme.**
    Rationale: `--remote_cache`/`--remote_executor` default to scheme `grpcs` when none is given; an unscoped URI against an HTTP-only server (bazel-remote's default mode) will not speak the right protocol.
    Verify: `grep -n 'remote_cache\s*=\|remote_executor\s*=' **/.bazelrc*` and confirm every match carries an explicit `://` scheme. Empty output (no bare-scheme matches found) = pass. Severity: SHOULD. Bazel all. Touches M-D-18.

20. **Never add `--noincompatible_strict_action_env` as a quick fix for environment-related build flakiness.**
    Rationale: `--incompatible_strict_action_env` defaults `true` specifically to keep `PATH`/`LD_LIBRARY_PATH` out of the ambient, cache-key-invisible category described in Finding 3; disabling it reintroduces the exact class of bug it exists to prevent, and does so silently (the cache key won't reflect the reintroduced dependency).
    Verify: `grep -rn 'noincompatible_strict_action_env' **/.bazelrc*`. Empty output = pass; any match is a finding requiring a named, narrower `--action_env=SPECIFIC_VAR` justification instead. Severity: SHOULD. Bazel 7/8/9 (flag has defaulted true since before this era; verify against the pinned version's own reference per rule 17).

21. **A cache-write credential belongs behind `--credential_helper`, never a bare `--remote_header=authorization=...` value in any `.bazelrc*` file, committed or gitignored.**
    Rationale: the header value sits in cleartext in a config file (gitignored or not) and in process argv, while `--credential_helper` (stable since Bazel 7.0) keeps the secret out of both. This is squarely a cache-hygiene matter even though it doesn't touch the Action digest itself.
    Verify: `grep -n 'remote_header.*[Bb]asic\|remote_header.*[Bb]earer' **/.bazelrc*`. Empty output = pass; a match is a finding. Severity: MUST for a new setup, SHOULD for migrating an existing one (owner's decision, frame Corrections Q6). Bazel 7+ (full treatment: rbe-readiness-and-cache-trust-boundary.md — not settled here). Touches M-D-03.

22. **A digest-function mismatch between two REAPI-compliant cache backends produces a silent, total cache miss on migration, not an error.**
    Rationale: `CacheCapabilities.digest_functions` lets a server advertise which of SHA256/SHA1/MD5/VSO/SHA384/SHA512/MURMUR3/SHA256TREE/BLAKE3 it supports; switching backends without confirming an overlapping digest function produces two disjoint cache namespaces with zero cross-population.
    Verify: reading heuristic — if a cache-backend migration is followed by a 100%-cold-cache build rather than a partial degradation, check both servers' advertised `digest_functions` before assuming a client misconfiguration. Severity: CONSIDER. Bazel all, REAPI v2.

## Fleet evidence

`rules_ocx` is the fleet's one Bazel repository; verified directly (excluding `.agents/worktrees/`, `target/`, `node_modules/`, `.git/`):

- **Cache flags present**: `.bazelrc.user:7-9` and the CI-appended equivalents in `.github/actions/remote-cache/action.yml:27-34` set `--remote_cache=https://bazel-cache.ocx.sh` (explicit `https://` scheme — clean on rule 19/M-D-18), `--remote_timeout=60`, and a `--remote_header=authorization="Basic <credential>"` gated to push-to-`main` only (`ci.yml:30,56`). Per the task's constraint, the credential value itself is never reproduced here; see [`build-contracts-and-ci-posture.md:64-107`](../bazel-audit/build-contracts-and-ci-posture.md) for the full, credential-redacted table this dive draws from.
- **Rule 18 fires**: `--remote_timeout=60` matches the CLI reference's current documented default (`"60s"`) exactly, with no comment anywhere explaining the explicit pin ([`build-contracts-and-ci-posture.md:77,103`](../bazel-audit/build-contracts-and-ci-posture.md)) — dead configuration today, useful only as a hedge against a future default change if that's what it's for, but nothing says so.
- **No target exercises the salt-toggle trap (Finding 6 / rule 13)**: `grep -rn "no-remote-exec\|no-remote-cache\|no-remote\b" --include="*.bzl" --include="BUILD.bazel"` over the repo returns zero hits. The trap is real upstream but has never been triggered here — recorded as an absence, not a violation.
- **No diagnostic tooling is wired up (Findings 8-9)**: `grep -rn "execution_log_compact_file\|discard_merkle_trees"` over `.bazelrc*`, `*.yml`, and the repo's own docs returns zero hits. If a cache-key regression appeared in this repo today, nobody has the standard loop pre-scripted; it would be assembled ad hoc from the upstream docs at the time.
- **The fleet's own cache backend inherits Finding 7's hermeticity gap**: per wave-1 grounding ([`rbe-and-caching.md §19`](../bazel-topic-map/rbe-and-caching.md)), `rules_ocx`'s remote cache runs `buchgr/bazel-remote` — confirmed by direct source read to hardcode `SymlinkAbsolutePathStrategy_ALLOWED`. Currently moot (0 `cc_*`/output-symlink-producing targets exist anywhere in the repo, per the map's Conflict 6 and 9), but the moment any dependency introduces one, this cache offers no backstop.
- **RBE itself is out of reach for a structural reason unrelated to this dive's topic** — see M-D-12, fully owned by rbe-readiness-and-cache-trust-boundary.md; not re-derived here.

## AI-agent angle

- **Cites `--experimental_remote_merkle_tree_cache`, a flag that has never existed.** Training data and prior research notes both echo a plausible-sounding name for a real concept (in-memory Merkle-tree reuse); the actual flag has inverted intent. Check: before writing any flag name into a rule, config file, or PR description, grep a freshly fetched command-line reference (or run `bazel help --long | grep -i <term>` against the pinned version) for that exact string.
- **Suggests `SymlinkAbsolutePathStrategy` as something settable via a Bazel flag** (e.g. inventing `--remote_symlink_strategy=disallowed`). It is a server-declared REAPI capability with zero client-side control surface. Check: grep the command-line reference for the literal string `SymlinkAbsolutePathStrategy` — zero hits confirms there is no client knob; the fix is a server-side/operator conversation, not a `.bazelrc` edit.
- **Recommends setting `salt=` on an action or target as a cache-hygiene tip**, as if it were a Starlark rule attribute or CLI flag exposed for that purpose. No such public API exists; salt is Bazel-internal, derived from tag state and the scrub config. Check: grep the Rules API reference for `ctx.actions.run`'s parameter list for a `salt` argument — none exists.
- **Treats exit code 39 as gated behind an `--incompatible_*` migration flag** (a very common Bazel pattern, so a plausible-sounding guess), when it has been unconditional default behavior since Bazel 7.0 with no such flag anywhere in the source. Check: `gh api search/code?q=<guessed_flag_name>+repo:bazelbuild/bazel` (or a local clone grep) before writing the flag name into guidance — zero hits means the flag does not exist, full stop.
- **Assumes "we run a remote cache" implies hermetic output-symlink handling**, missing that the specific server in play may hardcode `ALLOWED`. Check: read the deployed server's own capabilities-handler source (not Bazel's docs, which describe the client) before asserting anything about symlink hermeticity.
- **Suggests `--noincompatible_strict_action_env` to fix an environment-related build failure**, reproducing a common StackOverflow-era workaround that predates the flag's flip to default-`true`. This reintroduces a cache-key-invisible host dependency rather than fixing the underlying hermeticity gap. Check: any generated or suggested `.bazelrc` change containing this flag should be treated as a red flag requiring a named, narrower `--action_env=VAR` justification instead.
- **Uses `ctx.info_file`/`ctx.version_file` with the stable/volatile direction reversed**, or hallucinates different attribute names, because both were historically undocumented in the Rules API reference ([GH #11422](https://github.com/bazelbuild/bazel/issues/11422)) and a model's training data may carry inconsistent third-party explanations. Check: `ctx.info_file` is the **stable** status file, `ctx.version_file` is the **volatile** one — verify against a minimal rule that prints both paths and cross-checks against `bazel-out/{stable,volatile}-status.txt`.
- **Writes a custom REAPI-adjacent tool (a cache-warming script, a proxy) that hand-assembles a `Directory` or `Command` proto from an unsorted `dict`/`list` without an explicit sort step**, because Python/JS dict and list literals "look" ordered already. Check: grep any such tool's serialization code for an explicit `sorted(...)`/`.sort()` call immediately before the digest/hash computation — its absence is the defect (see rule 5).

## Contested / evolving

- **`SymlinkAbsolutePathStrategy` is a genuine ecosystem split across REAPI server implementations, not a research disagreement.** `buchgr/bazel-remote` hardcodes `ALLOWED`; Buildbarn and Buildfarm are commonly configured toward `DISALLOWED` in hermeticity-focused deployments, though this dive did not fetch and confirm each project's own default the way it did for `bazel-remote` (that deeper comparison belongs to a dedicated cache-server survey, not this action-key-focused dive). Trending: no visible movement toward a single default as of 2026-09-05 — this remains an operator-by-operator decision with no client-side signal, and a rule can only ever say "verify per deployment."
- **`--experimental_remote_scrubbing_config`'s graduation timeline is unstated.** It remains flagged `experimental` in the current reference with no linked tracking issue found in this pass. Historical-only-guidance risk: none identified — there is no deprecation or stabilization clock visible yet, so "experimental" here should be read as "current," not "about to change."
- **Whether exit code 39's retry policy is generous enough is explicitly out of this dive's scope and unresolved by design** — see bwob-eviction-and-cache-flags.md for the eviction/TTL/retry treatment; this dive only re-confirms that no `--incompatible_*` flag gates the exit code's existence.
- **The `arguments[0]` PATH-resolution change (v2.3) is stated by the spec itself as unreliable in practice** ("This behavior can, however, not be relied upon, as most implementations already followed the rules described above") — i.e., the spec text concedes real-world REAPI servers were already inconsistent with the pre-2.3 wording before the spec caught up. Trending: the spec formalizing existing practice, not practice changing to match a new spec.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [`remote_execution.proto`](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto) | Primary — the REAPI v2 spec itself, fetched in full (2,516 lines) | Live as of 2026-09-05, minor revisions through v2.3 observed inline | Ground truth for every Action/Command/Directory/Platform/SymlinkNode/Digest/DigestFunction/SymlinkAbsolutePathStrategy claim in this dive |
| [`bazel.build/remote/caching`](https://bazel.build/remote/caching) | Primary — official remote-caching reference | Live as of 2026-09-05 | Source of "does not track tools outside a workspace" and the `--action_env` whitelisting statement |
| [`bazel.build/remote/cache-remote`](https://bazel.build/remote/cache-remote) | Primary — official cache-miss debugging guide | Live as of 2026-09-05 | The step-by-step diagnostic loop this dive's Finding 8/rules 7-10 are built on |
| [`bazel.build/docs/user-manual`](https://bazel.build/docs/user-manual) | Primary — official user manual (workspace status section) | Live as of 2026-09-05 | Exact wording of the volatile/stable stamping split, `STABLE_` prefix rule, default volatile keys |
| [`src/tools/execlog/README.md`](https://github.com/bazelbuild/bazel/blob/master/src/tools/execlog/README.md) | Primary — the parser/converter tool's own docs, fetched raw | Live as of 2026-09-05 | Corrects the common paraphrase "the parser diffs two logs" — it reorders to match, a differ is still needed separately |
| [Bazel command-line reference](https://bazel.build/reference/command-line-reference) | Primary — official flag reference, fetched and parsed in full (~7.6 MB HTML) | Live as of 2026-09-05, current defaults under Bazel 9.2.0 | Exact defaults for `--experimental_remote_discard_merkle_trees` (true), `--incompatible_strict_action_env` (true), `--remote_cache_compression` (false), `--experimental_remote_cache_ttl` (3h), `--action_env`/`--remote_header`/`--experimental_remote_scrubbing_config`; confirms zero occurrences of `merkle_tree_cache` and `SymlinkAbsolutePathStrategy` |
| [`RemoteOptions.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/options/RemoteOptions.java) | Primary — Bazel's own flag-declaration source, fetched raw | Live `master` as of 2026-09-05 | The literal `@Option` declaration for `experimental_remote_discard_merkle_trees`, confirming the reference's rendering matches source |
| [`RemoteExecutionService.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/RemoteExecutionService.java) | Primary — Bazel's remote-execution source, fetched raw | Live `master` as of 2026-09-05 | `buildSalt()` — the only authoritative answer to "what does Bazel actually put in `Action.salt`" |
| [`ExecutionRequirements.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/actions/ExecutionRequirements.java) | Primary — Bazel's execution-requirement tag constants, fetched raw | Live `master` as of 2026-09-05 | Confirms the exact tag strings (`no-remote-exec`, `no-remote`, `no-remote-cache`) that feed `mayBeExecutedRemotely` and therefore the salt |
| [`ExitCode.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/util/ExitCode.java) | Primary — Bazel's exit-code registry, fetched raw | Live `master` as of 2026-09-05 | Confirms exit 39 is `REMOTE_CACHE_EVICTED`, a plain registered code with no gating flag |
| [Bazel 7.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/7.0.0) | Primary — GitHub release, fetched via `gh api` | Published 2023-12-11 | Confirms exit code 39 and the BwoB-default change as unconditional 7.0 behavior, in Bazel's own words |
| [`buchgr/bazel-remote` `server/grpc.go`](https://github.com/buchgr/bazel-remote/blob/master/server/grpc.go) | Primary — the exact cache-server implementation `rules_ocx` runs, fetched raw | Live `master` as of 2026-09-05 | The line hardcoding `SymlinkAbsolutePathStrategy_ALLOWED` with no config knob — the concrete fleet-relevant instance of Finding 7 |
| [`bazel-topic-map/rbe-and-caching.md` §1, §18](../bazel-topic-map/rbe-and-caching.md) | Internal — wave-1 scout's REAPI/stamping survey | 2026-09-05 | Independent first-pass reading of the same proto and stamping GitHub issues, cross-checked rather than taken on faith in this dive |
| [`bazel-audit/build-contracts-and-ci-posture.md` §3-4](../bazel-audit/build-contracts-and-ci-posture.md) | Internal — fleet CI/`.bazelrc` audit, measured directly against `rules_ocx` | 2026-09-05 | Source of every fleet-evidence line item, including the credential-redacted `.bazelrc.user`/`action.yml` table |
| [`bazel-topic-map.md` — Conflict 14](../bazel-topic-map.md) | Internal — phase-3 adjudication of the phantom-flag question | 2026-09-05 | The map's own resolution this dive independently re-verifies at both the reference and the source-code level, plus a second phantom-flag-adjacent case (exit 39) found along the way |

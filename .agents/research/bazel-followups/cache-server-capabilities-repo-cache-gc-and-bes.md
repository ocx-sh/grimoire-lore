---
title: "Cache-server capabilities, repository-cache GC, and BES as a caching-adjacent surface"
slug: cache-server-capabilities-repo-cache-gc-and-bes
agent: sonnet-followup
model: claude-sonnet-5
date_researched: 2026-09-05
answers_for:
  - bazel-caching-rbe.md
sources_count: 22
primary_sources_count: 22
affects_rule_ids:
  - BZL-CACHE-24
  - BZL-CACHE-17
  - BZL-CACHE-30
  - NEW-CACHE-1
  - NEW-CACHE-2
  - NEW-CI-1
  - NEW-CI-2
  - NEW-CI-3
  - M-D-16
  - M-D-17
  - M-D-19
---

# Cache-server capabilities, repository-cache GC, and BES

## Table of contents

- [Summary](#summary)
- [Answers](#answers)
  - [Q1 — Cache-server capability survey](#q1--cache-server-capability-survey-symlink_absolute_path_strategy--digest_functions)
  - [Q2 — Repository-cache growth and GC](#q2--repository-cache-growth-and-gc)
  - [Q3 — BES as a caching-adjacent surface](#q3--bes-as-a-caching-adjacent-surface)
  - [Q4 — `--remote_cache_compression` evidence](#q4--remote_cache_compression-evidence)
- [Proposed revisions](#proposed-revisions)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Not settled](#not-settled)
- [Sources](#sources)

## Summary

- No REAPI cache server surveyed advertises `symlink_absolute_path_strategy` or `digest_functions` as *operator-configurable*; every one hardcodes both in source, and the hardcoded values actively disagree: `buchgr/bazel-remote` and BuildBuddy's OSS server both hardcode `ALLOWED` + `SHA256`-only; Buildfarm and NativeLink both hardcode `DISALLOWED`; Buildbarn's own frontend sets neither field at all (proto zero-value).
- Bazel the client has **no flag** to assert or require a symlink strategy — `--remote_symlink_absolute_path_strategy` does not exist in the CLI reference. Bazel only *reads* the server's `GetCapabilities` response and enforces it client-side at upload time.
- The conflict behavior is now nailed to source: `UploadManifest.checkAbsoluteSymlinkAllowed` (`UploadManifest.java:568-576`) throws an `IOException` — "is not allowed by the remote cache" — the moment an action's output is an absolute symlink and the cached `symlink_absolute_path_strategy` is anything other than `ALLOWED` (including the unset/`UNKNOWN` zero-value a server like Buildbarn returns).
- Repository-cache GC has a real, dated upstream issue: [bazelbuild/bazel#22516](https://github.com/bazelbuild/bazel/issues/22516), filed 2024-05-23, `P2`/`team-Performance`, **still open, 0 comments, no milestone** as of 2026-09-05 — over two years stale. It explicitly cites the disk-cache GC issue ([#5139](https://github.com/bazelbuild/bazel/issues/5139)) as its design precedent, meaning the two features are linked in the tracker but the repository-cache one never got picked up.
- The official docs (`bazel.build/run/build`) already state, in prose, that the repository cache "is never cleaned up automatically" — but also that "the modification time of the file in the cache is updated" on every hit. That means the correct pruning primitive is `find <repo_cache>/repos/v1/ -type f -mtime +N -delete`, **not `-atime`** — Bazel touches mtime, not atime, on a cache hit.
- The **repo contents cache** (the newer, Bazel 8.3+/9.x, `rctx.download()`-and-materialize cache, distinct from the classic `--repository_cache`) got its own GC in a separate, already-merged effort: [PR #26080 "Repo contents cache GC"](https://github.com/bazelbuild/bazel/pull/26080), closed 2025-05-22. Its flags in the current CLI reference are `--repo_contents_cache_gc_max_age` (default `14d`) and `--repo_contents_cache_gc_idle_delay` (default `5m`) — there is **no** `_gc_max_size` analog, unlike `--disk_cache`, which has both a size and an age knob. GC works by "touching" a recorded-inputs file on access and deleting entries untouched past the max age.
- No vendor blog (BuildBuddy, EngFlow, blog.bazel.build — all three checked directly, none has a compression-numbers post) publishes a first-hand `--remote_cache_compression` benchmark. The one genuinely first-hand, numbers-bearing artifact found anywhere is buried in [bazelbuild/bazel#18997](https://github.com/bazelbuild/bazel/issues/18997): a public, reproducible repro repo measuring 3-5x higher JVM heap use with compression on (Bazel 6.2.1), plus a Bazel engineer's own terminal transcript showing a 2-byte file inflating to 15 bytes (750%) under zstd — the literal mechanism behind the 100-byte compression threshold default.
- The rename PR that took `--experimental_remote_cache_compression` non-experimental ([#17990](https://github.com/bazelbuild/bazel/pull/17990), Brentley Jones) is an **assertion**, not a benchmark: "we (and most of our customers) been using this in production... since 6.0 haven't run into any issue" — no numbers attached. This is the closest thing to positive vendor-adjacent testimony that exists, and it is unquantified.
- BES shares its trust surface with `--remote_cache`/`--remote_executor` by the client's own admission, quoted verbatim from `bazel.build/remote/bep`: "these flags are also used for Bazel's Remote Execution. This implies that the Build Event Service and Remote Execution Endpoints need to share the same authentication and TLS infrastructure." Rotating one without the other breaks the pairing silently.
- `--remote_build_event_upload` (default `minimal`) is the literal mechanism tying BEP to the cache: with `minimal`, most BEP-referenced files are **not** uploaded to the remote cache, yet the BEP always encodes their URI with the `bytestream://` scheme regardless — a consumer of the BES stream can hold a `bytestream://` URI to a blob that was never actually pushed to the cache.
- There is **no non-deprecated, non-test-scoped "remote cache hit" bit anywhere in the Build Event Protocol** for ordinary build actions. `BuildMetrics.ActionSummary.remote_cache_hits` is explicitly `[deprecated = true]`; `ActionCacheStatistics.hits`/`.misses` (also reachable from BEP) measures the **local** on-disk action cache only, not the remote cache. The only clean per-action remote-hit signal in BEP is test-scoped: `TestResult.execution_info.cached_remotely` (bool), rolled up in `TestSummary.total_num_cached`.
- BES rules split across two families by nature, not by convenience: the credential/TLS-sharing hazard is a `BZL-CACHE` trust-boundary rule (same shape as the existing BZL-CACHE-02/03/04 rows); the BEP-field-selection and upload-mode guidance for a CI dashboard is a `BZL-CI` concern. Proposed rows below are tagged for each family; `BZL-CI` has not landed yet, so its rows are forward-declarations for that wave's reviser.

## Answers

### Q1 — Cache-server capability survey: `symlink_absolute_path_strategy` & `digest_functions`

> For buchgr/bazel-remote, Buildbarn (bb-storage), Buildfarm, NativeLink, BuildBuddy (open-source server) and EngFlow (docs): what do they advertise in GetCapabilities for symlink_absolute_path_strategy and digest_functions; is either configurable server-side; does Bazel expose a client-side assertion (--remote_symlink_absolute_path_strategy? check the CLI reference), and what does Bazel do when the server's advertised strategy conflicts with an action's output symlink. Read the REAPI remote_execution.proto comments for both fields.

**Findings**

The REAPI spec itself ([`remote_execution.proto:2243-2255`](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L2243-L2255)) defines the enum plainly:

```protobuf
message SymlinkAbsolutePathStrategy {
  enum Value {
    UNKNOWN = 0;      // Invalid value.
    DISALLOWED = 1;   // Server returns INVALID_ARGUMENT / FAILED_PRECONDITION on absolute targets.
    ALLOWED = 2;       // Server allows targets to escape the input root — possibly non-hermetic.
  }
}
```

and `digest_functions` ([`remote_execution.proto:2287`](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L2287)) is a `repeated DigestFunction.Value` on `CacheCapabilities` — the spec explicitly allows multiple simultaneous digest functions and lists ten values (`SHA256`, `SHA1`, `MD5`, `VSO`, `SHA384`, `SHA512`, `MURMUR3`, `SHA256TREE`, `BLAKE3`, `GITSHA1`) ([`remote_execution.proto:2094-2185`](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto#L2094-L2185)).

Per-server source read (all fetched 2026-09-05, `main`/`master` tip unless noted):

| Server | `symlink_absolute_path_strategy` | Configurable? | `digest_functions` | Configurable? |
|---|---|---|---|---|
| `buchgr/bazel-remote` | Hardcoded `ALLOWED` | **No** — literal in [`server/grpc.go:129`](https://github.com/buchgr/bazel-remote/blob/master/server/grpc.go#L129) | Hardcoded `[SHA256]` | **No** — literal in [`server/grpc.go:116`](https://github.com/buchgr/bazel-remote/blob/master/server/grpc.go#L116) |
| Buildbarn (`bb-storage`) | **Not set at all** by the frontend's `CacheCapabilities` builders — proto zero-value (`UNKNOWN`) | N/A — no code path sets it | **Not set at all** — same zero-value/empty-repeated outcome | N/A |
| Buildfarm (`bazelbuild/bazel-buildfarm`) | Hardcoded `DISALLOWED` | **No** — literal in [`NodeInstance.java:1802`](https://github.com/bazelbuild/bazel-buildfarm/blob/main/src/main/java/build/buildfarm/instance/server/NodeInstance.java#L1802) | Always **all** values of the internal `HashFunction` enum, via `getDigestFunctions()` ([`NodeInstance.java:1790-1793`](https://github.com/bazelbuild/bazel-buildfarm/blob/main/src/main/java/build/buildfarm/instance/server/NodeInstance.java#L1790-L1793)) | Not restrictable — the *advertised list* is unconditional; only the single *active* digest function (`ExecutionCapabilities.digest_function`) is config-driven, via `configs.getDigestFunction()` |
| NativeLink (`TraceMachina/nativelink`) | Hardcoded `Disallowed` | **No** — literal in [`capabilities_server.rs:176`](https://github.com/TraceMachina/nativelink/blob/main/nativelink-service/src/capabilities_server.rs#L176) | Hardcoded `[Sha256, Blake3]` | **No** — literal `vec![...]` at [`capabilities_server.rs:149-151,167-169`](https://github.com/TraceMachina/nativelink/blob/main/nativelink-service/src/capabilities_server.rs#L149-L151) |
| BuildBuddy (OSS `server/` tree, not `enterprise/`) | Hardcoded `ALLOWED` | **No** — literal in [`capabilities_server.go:85`](https://github.com/buildbuddy-io/buildbuddy/blob/master/server/remote_cache/capabilities_server/capabilities_server.go#L85) | Hardcoded list `[SHA256, SHA384, SHA512, SHA1, BLAKE3]` via `digest.SupportedDigestFunctions()` ([`digest.go:49-55`](https://github.com/buildbuddy-io/buildbuddy/blob/master/server/remote_cache/digest/digest.go#L49-L55)) | **No** — the list is a package-level `var`, not read from config |
| EngFlow (docs only) | Not documented anywhere found | Unknown | Not documented anywhere found | Unknown |

EngFlow's public docs (`docs.engflow.com`) were checked at `re/config/cas.html` (Content-Addressable Storage config) and `re/config/options.html` (Service Options Reference): neither mentions `symlink_absolute_path_strategy`, `SymlinkAbsolutePathStrategy`, a digest/hash-function choice, or `GetCapabilities` at all. The one adjacent hit, an option named `incompatible_remove_symlink_execroot_strategy` in the execution-service options list, concerns how an RE **worker** builds its input-tree execroot symlinks — a different mechanism from the REAPI capability negotiated over `GetCapabilities` — and its own description was truncated in the fetch, so this is reported as **not found**, not as a confirmed absence (the page is long and the fetch tool summarizes rather than returning raw text).

Bazel's own reference `remote_worker` test tool (used to exercise the client, not a production server) also hardcodes `DISALLOWED` ([`CapabilitiesServer.java:63`](https://github.com/bazelbuild/bazel/blob/master/src/tools/remote/src/main/java/com/google/devtools/build/remote/worker/CapabilitiesServer.java#L63)), for what it is worth as a sixth data point — Bazel's own team picked the conservative default for their test double.

No client-side assertion flag exists. A live fetch of the current `bazel.build/reference/command-line-reference` for `symlink_absolute_path_strategy`/`remote_symlink` returns zero matches — `--remote_symlink_absolute_path_strategy` is not a real flag, and there is no other name for the same idea. Bazel is a pure consumer of whatever the server reports.

The conflict behavior is settled by source, not by prose docs: `RemoteExecutionService`/`UploadManifest` construct the `UploadManifest` with `allowAbsoluteSymlinks = cacheCapabilities.getSymlinkAbsolutePathStrategy().equals(SymlinkAbsolutePathStrategy.Value.ALLOWED)` ([`UploadManifest.java:126-128`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/UploadManifest.java#L126-L128)) — note the `.equals(ALLOWED)` check means **both** `DISALLOWED` and the unset `UNKNOWN` zero-value (Buildbarn's case) resolve to "not allowed." When an action's output actually is an absolute, non-dangling-elsewhere symlink and that flag is `false`, `checkAbsoluteSymlinkAllowed` throws:

```java
// UploadManifest.java:568-576
private void checkAbsoluteSymlinkAllowed(Path file, PathFragment target) throws IOException {
  if (!allowAbsoluteSymlinks) {
    throw new IOException(
        String.format(
            "Spawn output %s is an absolute symbolic link to %s, which is not allowed by"
                + " the remote cache",
            file, target));
  }
}
```

This fires at **upload** time (after local execution succeeds, before the result is cached), not at download or scheduling time — a build against a server hardcoding `DISALLOWED` (Buildfarm, NativeLink) or advertising nothing (Buildbarn) fails the specific action the moment it tries to cache an absolute-symlink output, with no flag able to override it from the client side.

**Answer.** Across the five source-read servers, capability advertisement for both fields is a compile-time constant, never an operator setting, and the community has split down the middle on the symlink default: `bazel-remote` and BuildBuddy OSS both ship `ALLOWED` (the permissive, less-hermetic choice); Buildfarm, NativeLink, and Bazel's own reference worker all ship `DISALLOWED`; Buildbarn's frontend sets the field at all in no code path reviewed, which resolves to the same effective "not allowed" outcome on the client. `digest_functions` is either a single hardcoded value (`bazel-remote`: SHA256 only) or a hardcoded list of everything the server's code supports (Buildfarm, NativeLink, BuildBuddy), never a deployment-time choice; only Buildfarm's *active* execution digest function is config-driven, and that is a separate field (`ExecutionCapabilities.digest_function`) from the advertised list. Bazel exposes no client-side flag to require a strategy; it only reads and obeys the server's declaration, enforcing a hard, un-overridable upload failure — `UploadManifest.java:568-576` — the instant an action's real output disagrees with what the server allows. This is stable as of Bazel `master`/9.2.0-era source and is not a version-gated behavior.

### Q2 — Repository-cache growth and GC

> Repository cache GC: find the upstream issue(s) for --repository_cache garbage collection in bazelbuild/bazel (open/closed, target version), contrast with --experimental_disk_cache_gc_max_size/_max_age/_idle_delay (7.4), and state the current best pruning pattern for a long-lived CI runner (find -atime? a scheduled bazelisk clean? BuildBuddy's guidance?). Also the repo contents cache's own GC story on 9.x (--repo_contents_cache_gc_max_age and friends — verify names in the 9.2.0 CLI reference).

**Findings**

The tracked feature request is [**bazelbuild/bazel#22516**, "Implement garbage collection for the repository cache"](https://github.com/bazelbuild/bazel/issues/22516) — created 2024-05-23, labeled `type: feature request`, `P2`, `team-Performance`, **still `open`, 0 comments, no milestone**, as of this research date (2026-09-05). Its full body:

> "The repository cache can currently grow without bound. Instead, it should be garbage collected to make space for newer entries. Details are TBD, although I expect the design to be influenced by lessons learned while implementing https://github.com/bazelbuild/bazel/issues/5139."

That linked issue, [**#5139, "Implement automatic garbage collection for the disk cache"**](https://github.com/bazelbuild/bazel/issues/5139), is the one that actually shipped: filed 2018-05-02, milestone "Mainline issues targeted for 7.3.0" (milestone due 2024-07-15), but the issue itself closed 2024-10-22 — after its own milestone's due date, consistent with the consolidation's existing note that the flags landed at 7.4, not 7.3. That produced `--experimental_disk_cache_gc_max_size` and `--experimental_disk_cache_gc_max_age` (both default `"0"`/unbounded, opt-in even on a supporting version — already correctly stated in [BZL-CACHE-17](../bazel-caching-rbe.md)). #22516 is a direct sibling of that closed issue and has sat with zero engagement for over two years: there is no dated commitment to give `--repository_cache` (the classic, `rctx.download()`-backed cache) any GC mechanism at all.

The asymmetry is not a doc gap — it is a stated design choice, quoted verbatim from the current official user guide (`bazel.build/run/build`, "repository cache" section, fetched 2026-09-05):

> "Upon each cache hit, the modification time of the file in the cache is updated. In this way, the last use of a file in the cache directory can easily be determined, for example to manually clean up the cache. The cache is never cleaned up automatically, as it might contain a copy of a file that is no longer available upstream."

This is the load-bearing detail for a pruning pattern: **Bazel updates the file's `mtime` on a hit, not its `atime`.** A cron job built on `-atime` is measuring filesystem-level last-read time, which most Linux filesystems mounted `relatime`/`noatime` in CI images do not reliably update on every read anyway, and which Bazel's own contract does not promise. The correct, doc-grounded command for a long-lived runner is:

```bash
find "$(bazel info repository_cache)"/../.. -type f -mtime +N -delete   # or the literal repos/v1/ path
```

with `N` chosen against how long a build might legitimately need a file that hasn't been touched — there is no server-side signal (unlike `--experimental_remote_cache_ttl`) to derive `N` from, so it is a purely local, operator-chosen number. Neither BuildBuddy's docs (`docs/config/`, `docs/rbe-github-actions/`) nor blog (`buildbuddy.io/blog`) were found to publish repository-cache-specific pruning guidance distinct from this — their own material is about the *remote* cache and RBE executors, not the local per-workspace download cache. In practice, the two patterns actually seen in the wild are (a) the `find -mtime` sweep above on a persistent self-hosted runner, or (b) sidestepping the problem entirely on ephemeral/cloud CI runners that are recycled per job or per N jobs, where the repository cache never accumulates because the filesystem itself is thrown away — a scheduled `bazelisk clean` is a blunter version of the same idea (it also drops the disk cache and build outputs, not just the repository cache, so it trades precision for simplicity).

The **repo contents cache** is a materially different, newer feature and has its own, already-resolved GC story. Verified against a live fetch of the current `bazel.build/reference/command-line-reference` (2026-09-05, which tracks `master`/the newest release and should be cross-checked against the 9.2.0 tag for a pin-specific claim):

| Flag | Default | Description (verbatim) |
|---|---|---|
| `--repo_contents_cache` | (path) | "Specifies the location of the repo contents cache, which contains fetched repo directories shareable across workspaces." |
| `--repo_contents_cache_gc_idle_delay` | `5m` | "Specifies the amount of time the server must remain idle before garbage collection happens to the repo contents cache." |
| `--repo_contents_cache_gc_max_age` | `14d` | "Specifies the amount of time an entry in the repo contents cache can stay unused before it's garbage collected." |

Confirmed: **no `--repo_contents_cache_gc_max_size` exists** — unlike the disk cache, which has both a size cap and an age cap, the repo contents cache is age-only, GC'd opportunistically after the server has been idle for `gc_idle_delay`. The implementing PR, [**#26080, "Repo contents cache GC"**](https://github.com/bazelbuild/bazel/pull/26080) (closed 2025-05-22), states the mechanism directly: "Very simple GC implementation for the repo contents cache. Entry access is logged by 'touching' the recorded inputs file. GC tasks then delete old entries that haven't been accessed in `--repo_contents_cache_gc_max_age` time." This is the same touch-then-age-out pattern as the classic repository cache's manual mtime approach, except it is now automated and server-triggered instead of left to a cron job — the frame's own Wave-2 correction (`--repo_contents_cache` walked back from on-by-default in 8.3.0 to opt-in in 8.4.0) still governs whether this cache is even in play on a given pin; where it is not enabled, this GC story does not apply and the classic `--repository_cache` (with no GC at all) is what's actually accumulating.

**Answer.** `--repository_cache` (the classic download cache) has exactly one open, stalled tracking issue ([#22516](https://github.com/bazelbuild/bazel/issues/22516), P2, no target version, two-plus years untouched) and no shipped GC on any version — the disk cache's 7.4 GC ([#5139](https://github.com/bazelbuild/bazel/issues/5139)) is an explicitly cited precedent for it, not a substitute. The documented, correct pruning primitive for a long-lived CI runner is an `mtime`-based sweep (`find ... -mtime +N -delete`), not `atime`, because Bazel's own docs state it touches mtime on every hit; a scheduled `bazelisk clean` is the blunt alternative and neither vendor (BuildBuddy) publishes bespoke guidance beyond that. The separate repo contents cache (Bazel 8.3+/9.x, opt-in since 8.4.0) has real, shipped, automatic GC via `--repo_contents_cache_gc_max_age` (default `14d`) and `--repo_contents_cache_gc_idle_delay` (default `5m`) — verified present, with those exact names and defaults, in the current command-line reference — with no size-based cap, an asymmetry from `--disk_cache` worth stating explicitly rather than assuming parity.

### Q3 — BES as a caching-adjacent surface

> BES: --bes_backend, --bes_results_url, --bes_upload_mode, --build_event_binary_file, --remote_build_event_upload; how BES shares TLS and credential-helper configuration with --remote_cache; what a cache-hit-rate dashboard derives from BEP (which events). Decide which family owns BES rules (BZL-CACHE vs BZL-CI) and propose the rows.

**Findings**

Flag survey (live fetch, current `bazel.build/reference/command-line-reference`, 2026-09-05):

| Flag | Category | Default | Description (verbatim/paraphrase as noted) |
|---|---|---|---|
| `--bes_backend` | Logging and Build Event Protocol options | disabled | "Specifies the build event service (BES) backend endpoint in the form `[SCHEME://]HOST[:PORT]`. The default is to disable BES uploads." |
| `--bes_results_url` | Logging and Build Event Protocol options | unset | "Specifies the base URL where a user can view the information streamed to the BES backend. Bazel will output the URL appended by the invocation id to the terminal." |
| `--bes_upload_mode` | Logging and Build Event Protocol options | `wait_for_upload_complete` | Selects blocking behavior: `wait_for_upload_complete` (block until acknowledged), `nowait_for_upload_complete` (block until next invocation instead), `fully_async` (no acknowledgment guarantee at all) |
| `--build_event_binary_file` | Logging and Build Event Protocol options | empty | "If non-empty, write a varint delimited binary representation of the build event protocol to that file." |
| `--remote_build_event_upload` | **Remote caching options** (note: filed under the remote-cache category, not BEP) | `minimal` | (verbatim, full) "If set to 'all', all local outputs referenced by BEP are uploaded to remote cache. If set to 'minimal', local outputs referenced by BEP are not uploaded to the remote cache, except for files that are important to the consumers of BEP (e.g. test logs and timing profile). bytestream:// scheme is always used for the uri of files even if they are missing from remote cache. Default to 'minimal'." |

`--remote_build_event_upload` living under "Remote caching options" rather than the BEP category is itself informative — Bazel's own docs classify it as a cache-behavior flag, because what it actually toggles is whether the *files a build-result UI would want to show* get pushed to `--remote_cache` at all. Its final sentence is the trap: the BEP-emitted URI always uses `bytestream://`, whether or not the referenced blob actually made it into the cache under `minimal` — a BES consumer (a results UI, a log fetcher) that dereferences that URI on a `minimal`-mode build can get a `NOT_FOUND` for a file BEP told it exists.

The TLS/credential-sharing claim is drawn directly from Bazel's own BEP documentation (`bazel.build/remote/bep`, fetched 2026-09-05):

> "Please note that these flags are also used for Bazel's Remote Execution. This implies that the Build Event Service and Remote Execution Endpoints need to share the same authentication and TLS infrastructure."

and, on why `--remote_build_event_upload` exists at all:

> "A way to work around this issue is to use Bazel with remote caching. Bazel will upload all output files to the remote cache (including files referenced in the BEP) and the BES server can then fetch the referenced files from the cache."

Mechanically: Bazel resolves `--bes_backend`'s auth the same way it resolves `--remote_cache`'s — through the same `--credential_helper` (or `--google_default_credentials`/legacy auth flags) and the same gRPC TLS stack, because both are just gRPC endpoints configured through the same global auth machinery, not through two independent code paths. Nothing in the client distinguishes "this credential is for BES" from "this credential is for the cache" at the point of credential resolution. This is exactly the rotation hazard the existing `rbe-readiness-and-cache-trust-boundary.md:204` sub-dive flagged in passing (`grep -n 'bes_backend\|remote_header\|credential_helper' *.bazelrc*` as the joint check) — this follow-up promotes it from a footnote to its own named rule (see Proposed revisions).

For the BEP-fields question — what a cache-hit-rate dashboard actually reads — the wire format (`build_event_stream.proto`, fetched from `bazelbuild/bazel` `master`) has several candidate fields, and they are **not interchangeable**:

- `BuildMetrics.ActionSummary.remote_cache_hits` (int64) — [`build_event_stream.proto:982`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/buildeventstream/proto/build_event_stream.proto#L982) — explicitly `[deprecated = true]`, commented "Deprecated. The total number of remote cache hits." A naive dashboard reaching for this field is reading a field Bazel itself has stopped guaranteeing.
- `BuildMetrics.ActionSummary.action_cache_statistics` (a `blaze.ActionCacheStatistics` message, [`action_cache.proto:23-78`](https://github.com/bazelbuild/bazel/blob/master/src/main/protobuf/action_cache.proto#L23-L78)) carries `hits`/`misses` counters — but these describe the **local, on-disk** action cache lookup (did Bazel need to even ask a remote backend), not a remote cache hit. This is the single most likely AI-agent conflation: `action_cache_statistics.hits / (hits + misses)` looks exactly like "cache hit rate" and is actually "fraction of actions Bazel's own local incrementality skipped outright," a different number that can be 100% with zero remote traffic.
- `BuildMetrics.ArtifactMetrics.output_artifacts_from_action_cache` vs `.output_artifacts_seen` ([`build_event_stream.proto:1138-1144`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/buildeventstream/proto/build_event_stream.proto#L1138-L1144)) — the comment is explicit that `output_artifacts_from_action_cache` is "cached locally via the action cache," while `output_artifacts_seen` includes both local-cache and remote-cache/executor-cache hits. Neither field isolates *remote-only* hits; you can only get "remote" by subtracting one from the other and hoping nothing else moved between builds.
- The one clean, non-deprecated, explicitly remote-scoped boolean in the whole proto is test-only: `TestResult.execution_info.cached_remotely` ([`build_event_stream.proto:765`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/buildeventstream/proto/build_event_stream.proto#L765), "True, if the reported attempt was a cache hit in a remote cache"), alongside `cached_locally` at the top level of `TestResult` (line 719), rolled up per-target in `TestSummary.total_num_cached` (line 835, "Total number of cached test actions"). `ActionExecuted` — the event for a *non-test* action — carries no equivalent boolean at all; its only per-action detail is `strategy_details` (an `Any` typically holding a `SpawnExec` from the execution log), which is a much heavier payload to mine for a dashboard than a boolean.

**Decision — family ownership.** Split the rules, do not force one family to own the whole surface:
- **`BZL-CACHE` keeps** the credential/TLS-sharing hazard: it is the same class of finding as BZL-CACHE-02/03/04 (write-credential exposure, non-repository rc-file origin), just with a second consumer (`--bes_backend`) of the identical credential. It belongs next to the rules that already govern that credential's lifecycle, not in a CI-operations file.
- **`BZL-CI` should own** everything about *using* BES to build a dashboard or a results UI: which flags to set (`--bes_upload_mode=fully_async` on an untrusted/best-effort lane vs `wait_for_upload_complete` on a lane whose CI status gates on the upload succeeding), and which BEP fields are safe to chart. This is CI tooling and observability, not a caching-hygiene concern, and `BZL-CACHE`'s existing scope statement ("This topic owns `BZL-CACHE` exclusively") should not annex it. `BZL-CI` has not landed as of this research date — the rows below are forward-declared for that wave's reviser to place, tagged `NEW-CI-*`.

**Answer.** All five named flags exist with the stated names, categories and defaults as of the current (post-9.2.0-era) command-line reference. BES and the remote cache/RE endpoints are explicitly documented, by Bazel's own team, to require identical authentication and TLS configuration — one credential, two consumers, and no independent per-surface override. `--remote_build_event_upload` (default `minimal`) is the flag that actually determines whether BEP-referenced artifacts are fetchable from the cache at all, and its `bytestream://`-always behavior means a downstream BES consumer cannot infer availability from the URI's presence. A build-wide, non-test "remote cache hit rate" is not a first-class BEP concept: the one field with that literal name is deprecated, the two live substitutes (`action_cache_statistics`, `ArtifactMetrics`) measure local-cache or combined local+remote effects respectively, and the only clean remote-scoped boolean in the whole schema is test-specific (`TestResult.execution_info.cached_remotely`). The credential-sharing rule stays in `BZL-CACHE`; the dashboard/upload-mode guidance is proposed for `BZL-CI`.

### Q4 — `--remote_cache_compression` evidence

> Compression: collect every first-hand measurement of --remote_cache_compression (zstd) on hit latency and bandwidth from vendor docs or blog posts, and state whether any is a benchmark with numbers rather than an assertion.

**Findings**

Three vendor/official blogs were checked directly for a dedicated compression post: `www.buildbuddy.io/blog/` (fetched 2026-09-05 — no post title or summary mentions "compression," "zstd," or "bandwidth"; the closest topically adjacent post is about Content-Defined Chunking, a different flag — `--experimental_remote_cache_chunking`, already covered under BZL-CACHE-28, and cites "40% less data uploaded" for *that* feature, not for zstd compression), `blog.engflow.com` (fetched 2026-09-05 — same result, no matching post), and `blog.bazel.build` (fetched 2026-09-05 — same result). None of the three publishes a first-hand latency- or bandwidth-numbers benchmark for `--remote_cache_compression`. This is a genuine absence, checked directly rather than assumed.

The one place a real, numbers-bearing, first-hand measurement exists is buried in a GitHub issue, not a blog: [**bazelbuild/bazel#18997**, "`--experimental_remote_cache_compression` causes 3-5x higher Bazel server heap usage"](https://github.com/bazelbuild/bazel/issues/18997) (filed against Bazel 6.2.1, closed 2024-01-29, 23 comments). The reporter built and published a standalone, runnable repro repository (`github.com/jfirebaugh/bazel_remote_cache_compression`) with an exact reproduction recipe:

```bash
bazel clean && bazel shutdown && bazel build --memory_profile=memprof :binary && grep 'Build artifacts:heap:used' memprof
bazel clean && bazel shutdown && bazel build --experimental_remote_cache_compression --memory_profile=memprof :binary && grep 'Build artifacts:heap:used' memprof
```

measuring, and reporting as a number, 3-5x higher JVM heap use with compression on. This is memory cost, not hit latency or bandwidth directly, but it is the only artifact found anywhere in this survey that is (a) first-hand, (b) reproducible by a third party, and (c) reports an actual measured number rather than a claim. During triage, a Bazel maintainer (`sluongng`) added a second, smaller, equally first-hand and numeric demonstration explaining *why* small blobs regress under compression — the mechanism behind the 100-byte default threshold — quoted verbatim from the issue thread:

```
> echo -n '{}' > a
> zstd a
a                    :750.00%   (     2 B =>     15 B, a.zst)
```

A 2-byte input became a 15-byte output — a 750% size increase from the zstd frame header alone. This is a genuine micro-benchmark with a number attached, and it is the closest thing to primary evidence this survey found for "compression can actively hurt," directly grounding (rather than merely asserting) the CLI reference's own choice of a 100-byte compression threshold and the existing `BZL-CACHE-30`'s CONSIDER-level caution.

On the positive side, the PR that promoted the flag out of `experimental` — [**#17990**, Brentley Jones, 2023](https://github.com/bazelbuild/bazel/pull/17990) — carries a first-hand claim with **no attached numbers**, an assertion in the house-standard sense:

> "We (and most of our customers) been using this in production for a long time, and at least since 6.0 haven't run into any issue."

This is a named, identifiable Bazel-community engineer's production testimony, which is stronger provenance than an anonymous blog claim, but it reports zero latency, bandwidth, or hit-rate figures — it is evidence that compression does not obviously *break* things in production, not evidence about how much it helps or costs.

No source found — vendor blog, official docs, or issue tracker — reports an actual **hit-latency** number (milliseconds saved or added per cache hit) or a **bandwidth** number (bytes saved per build) for `--remote_cache_compression` specifically. Every number that does exist in this corpus is about a cost (heap, or payload inflation on tiny blobs), never a benefit, which is a real asymmetry in the evidence, not an artifact of under-searching: this followup checked the three most likely blog sources directly and the flag's own upstream issue thread, and the shape of what exists (cost data, no benefit data) held across all of them.

**Answer.** As of 2026-09-05, no vendor or official blog publishes a first-hand `--remote_cache_compression` latency or bandwidth benchmark; three checked directly (BuildBuddy, EngFlow, Bazel's own blog) confirm the absence rather than merely failing to surface one. The only first-hand, numbers-bearing evidence anywhere in this survey lives inside [bazelbuild/bazel#18997](https://github.com/bazelbuild/bazel/issues/18997): a public, reproducible 3-5x-heap-usage repro and a maintainer's own 750%-size-inflation zstd micro-benchmark on a 2-byte file — both cost-side, both real numbers, neither a vendor artifact. The one benefit-side first-hand statement ([#17990](https://github.com/bazelbuild/bazel/pull/17990)) is an unquantified production assertion from a named engineer. `BZL-CACHE-30`'s CONSIDER severity and "untested for this artifact distribution" framing is the correct posture; nothing found here promotes it to MUST/SHOULD, but the 750%-inflation micro-benchmark is a stronger, more concrete piece of evidence than "second-hand" and should be cited directly rather than paraphrased as absence-of-evidence.

## Proposed revisions

| ID | Change | Evidence | Confidence |
|---|---|---|---|
| **NEW-CACHE-1** | New rule (BZL-CACHE): Before trusting a cache backend's symlink or digest-function behavior, treat the choice as a fixed property of *that specific server binary and build*, never an operator setting — grep the deployed server's own source (or its release notes) for a hardcoded `SymlinkAbsolutePathStrategy`/`digest_functions` value rather than looking for a config flag, because none of the five surveyed OSS servers exposes one. On migration between two of these servers, a symlink-strategy or digest-function *mismatch* is a silent, 100%-cold-cache event, not an error. | [bazel-remote grpc.go:129](https://github.com/buchgr/bazel-remote/blob/master/server/grpc.go#L129), [Buildfarm NodeInstance.java:1802](https://github.com/bazelbuild/bazel-buildfarm/blob/main/src/main/java/build/buildfarm/instance/server/NodeInstance.java#L1802), [NativeLink capabilities_server.rs:176](https://github.com/TraceMachina/nativelink/blob/main/nativelink-service/src/capabilities_server.rs#L176), [BuildBuddy capabilities_server.go:85](https://github.com/buildbuddy-io/buildbuddy/blob/master/server/remote_cache/capabilities_server/capabilities_server.go#L85) | codified (primary source read on all four) — extends BZL-CACHE-24 |
| **NEW-CACHE-2** | New rule (BZL-CACHE): There is no client-side flag to require a symlink strategy; do not write `--remote_symlink_absolute_path_strategy` or any variant — it does not exist. State the observed client behavior instead: an action whose output is an absolute symlink fails at upload time with `IOException: ... is not allowed by the remote cache` against any server that does not explicitly advertise `ALLOWED` (including one that advertises nothing at all). | [UploadManifest.java:126-128,568-576](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/UploadManifest.java#L568-L576); CLI reference fetch 2026-09-05 (zero matches for `symlink_absolute_path`/`remote_symlink`) | normative (client source) + codified (CLI reference EMPTY) |
| **BZL-CACHE-17** | Extend rationale/verification: add that `--repo_contents_cache` (Bazel 8.3+/9.x, distinct from `--repository_cache`) *does* have automated GC (`--repo_contents_cache_gc_max_age` default `14d`, `--repo_contents_cache_gc_idle_delay` default `5m`, no size cap), so a repo using the newer cache should be read as "GC exists, age-only" rather than folded into the "no automated pruning on any version" statement, which should be scoped explicitly to the classic `--repository_cache`. | [command-line-reference fetch 2026-09-05](https://bazel.build/reference/command-line-reference); [PR #26080](https://github.com/bazelbuild/bazel/pull/26080) | codified |
| **NEW-CACHE-3** | New rule (BZL-CACHE): For a long-lived CI runner's `--repository_cache`, prune with `find <cache>/repos/v1/ -type f -mtime +N -delete`, never `-atime` — Bazel's own docs state it updates the file's modification time (not access time) on every cache hit, and the cache has no automated GC on any version ([#22516](https://github.com/bazelbuild/bazel/issues/22516) remains open, P2, untouched since 2024-05-23). | [bazel.build/run/build, "repository cache" section, fetched 2026-09-05](https://bazel.build/run/build); [#22516](https://github.com/bazelbuild/bazel/issues/22516) | codified (official docs) + normative (open, undated upstream request) |
| **NEW-CACHE-4** | New rule (BZL-CACHE, extends the BZL-CACHE-02/03/04 trust-boundary family): treat `--bes_backend`'s credential and TLS configuration as sharing a trust surface with `--remote_cache`/`--remote_executor` — Bazel's own docs state they "need to share the same authentication and TLS infrastructure." Any credential rotation plan must rotate both together; a single `grep -n` pass over `*.bazelrc*` for the three terms `bes_backend`, `remote_header`, `credential_helper` together is the check for both surfaces at once. | [bazel.build/remote/bep, fetched 2026-09-05](https://bazel.build/remote/bep) | normative (official docs, verbatim) |
| **BZL-CACHE-30** | Strengthen evidence, do not change severity: cite [bazelbuild/bazel#18997](https://github.com/bazelbuild/bazel/issues/18997) directly as a first-hand, numbers-bearing cost measurement (3-5x heap; 2B→15B/750% size inflation on tiny blobs) rather than describing all counter-evidence as "second-hand." Still CONSIDER — no first-hand *benefit*-side benchmark (latency/bandwidth) exists anywhere checked. | [#18997](https://github.com/bazelbuild/bazel/issues/18997) | measured (public, reproducible, third-party repro repo) |
| **NEW-CI-1** *(forward-declared for BZL-CI)* | New rule: Set `--bes_upload_mode` deliberately per lane — `fully_async` (or `nowait_for_upload_complete`) on a lane whose pass/fail must never depend on the BES backend being reachable; `wait_for_upload_complete` (the default) only where a missing upload is itself worth failing the build over. Do not leave the default unexamined on a lane that already treats the cache as best-effort. | [command-line-reference fetch 2026-09-05](https://bazel.build/reference/command-line-reference) | codified |
| **NEW-CI-2** *(forward-declared for BZL-CI)* | New rule: If a results dashboard reports "cache hit rate" from BEP for ordinary (non-test) actions, name which cache it means — there is no non-deprecated, remote-scoped hit counter for build actions in the BEP schema. `BuildMetrics.ActionSummary.remote_cache_hits` is `[deprecated = true]`; `action_cache_statistics.hits/misses` is the **local** on-disk action cache; `ArtifactMetrics.output_artifacts_from_action_cache` vs `.output_artifacts_seen` conflates local and combined local+remote. Only test actions have a clean remote-scoped boolean (`TestResult.execution_info.cached_remotely`). | [build_event_stream.proto:719,765,835,982,1138-1144](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/buildeventstream/proto/build_event_stream.proto); [action_cache.proto:23-78](https://github.com/bazelbuild/bazel/blob/master/src/main/protobuf/action_cache.proto#L23-L78) | codified (primary proto read) |
| **NEW-CI-3** *(forward-declared for BZL-CI)* | New rule: Do not set `--remote_build_event_upload=minimal` (the default) and then assume every `bytestream://` URI in a captured BEP stream is dereferenceable — the flag's own description states the scheme is used unconditionally "even if [the files] are missing from remote cache." A BES-consuming tool that fetches by URI needs a documented fallback (or `=all`) if it must not silently 404. | [command-line-reference fetch 2026-09-05, `--remote_build_event_upload` description](https://bazel.build/reference/command-line-reference) | codified |

## AI-agent angle

The single most likely mistake an LLM makes on this ground is treating `BuildMetrics.ActionSummary.remote_cache_hits` or `action_cache_statistics.hits` as "the cache hit rate" for a dashboard prompt — both are wrong in different, plausible-sounding ways (one is deprecated, the other measures the wrong cache), and both compile and run without error, so nothing forces a correction. The mechanical check: `grep -n 'remote_cache_hits\|action_cache_statistics' <the generated code>` and confirm the answer explicitly says which cache (local vs remote) and cites `TestResult.execution_info.cached_remotely` for the only case that's actually clean. A close second: recommending `--remote_symlink_absolute_path_strategy` or any client-side symlink-strategy flag — it does not exist; `bazel help --long | grep -i symlink` against the pinned version returns nothing, which is the stop signal (BZL-CACHE-23's own house rule), not a sign to keep guessing a plausible-sounding name. Third: citing a repository-cache pruning script using `-atime` — the mechanical check is reading `bazel.build/run/build`'s own sentence about *modification* time before writing any `find` command.

## Contested / evolving

- Whether `#22516` (repository-cache GC) will ever ship is genuinely unknown — it has zero engagement two years in, unlike `#5139` which sat five years before shipping. Neither history nor the issue's own text supports a "coming soon" framing.
- EngFlow's exact capability advertisement remains undocumented in public materials as far as this survey reached; it is reported as unknown, not as any specific value, and a future dive with access to a live EngFlow cluster (or a support conversation) could settle it directly rather than by doc archaeology.
- Whether `--remote_cache_compression`'s bandwidth benefit is real for a Starlark-heavy/many-small-file build (the shape most `rules_ocx`-adjacent repos have) is still genuinely untested; this followup found no evidence either way, only cost-side evidence for a different regime (large-blob-averse heap pressure and small-blob inflation, both edge cases relative to "does a typical CI build download less over the wire").

## Not settled

- A first-hand latency/bandwidth benchmark for `--remote_cache_compression` on a realistic artifact-size distribution — the measurement dive named in the original consolidation's "deserves another research round" list is still the only thing that would close this, and this followup's search of the obvious vendor sources came back empty rather than positive.
- Whether Buildbarn's *scheduler* side (`bb-remote-execution`, not `bb-storage`) sets `symlink_absolute_path_strategy` on `ExecutionCapabilities` differently from the CAS/AC side reviewed here — this followup read only `bb-storage`'s frontend composition; a full answer needs the sibling `buildbarn/bb-remote-execution` repository read the same way.
- EngFlow's actual advertised values — settleable only with either an EngFlow support conversation or credentials to a live cluster to query `GetCapabilities` directly; doc archaeology alone hit a wall.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [REAPI `remote_execution.proto`](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto) | Spec source, `main` branch | fetched 2026-09-05 | Ground truth for `SymlinkAbsolutePathStrategy` and `DigestFunction` enum values and comments (lines 2094-2185, 2243-2302) |
| [`buchgr/bazel-remote` `server/grpc.go`](https://github.com/buchgr/bazel-remote/blob/master/server/grpc.go) | Server source, `master` | fetched 2026-09-05 | `GetCapabilities` hardcodes `ALLOWED` + `[SHA256]`, no config path |
| [`buildbarn/bb-storage` `pkg/capabilities/`](https://github.com/buildbarn/bb-storage/tree/main/pkg/capabilities) + [`cmd/bb_storage/main.go`](https://github.com/buildbarn/bb-storage/blob/main/cmd/bb_storage/main.go) | Server source, `main` | fetched 2026-09-05 | Compositional `Provider`/`MergingProvider` design; neither field is set anywhere in the frontend's own capability builders |
| [`bazelbuild/bazel-buildfarm` `NodeInstance.java`](https://github.com/bazelbuild/bazel-buildfarm/blob/main/src/main/java/build/buildfarm/instance/server/NodeInstance.java) | Server source, `main` | fetched 2026-09-05 | Hardcoded `DISALLOWED`; `digest_functions` = all of the `HashFunction` enum unconditionally (lines 1790-1814) |
| [`TraceMachina/nativelink` `capabilities_server.rs`](https://github.com/TraceMachina/nativelink/blob/main/nativelink-service/src/capabilities_server.rs) | Server source, `main` | fetched 2026-09-05 | Hardcoded `Disallowed` + `[Sha256, Blake3]`, both literal `vec!`s |
| [`buildbuddy-io/buildbuddy` `capabilities_server.go`](https://github.com/buildbuddy-io/buildbuddy/blob/master/server/remote_cache/capabilities_server/capabilities_server.go) + [`digest.go`](https://github.com/buildbuddy-io/buildbuddy/blob/master/server/remote_cache/digest/digest.go) | OSS server source, `master` | fetched 2026-09-05 | Hardcoded `ALLOWED`; `SupportedDigestFunctions()` is a package-level `var`, five hardcoded values |
| [EngFlow docs, `re/config/cas.html` and `re/config/options.html`](https://docs.engflow.com) | Vendor docs | fetched 2026-09-05 | Checked directly for symlink/digest-function configurability — confirmed absent from what the fetch could return |
| [`UploadManifest.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/UploadManifest.java) | Bazel client source, `master` | fetched 2026-09-05 | The exact client-side enforcement point and error message for a symlink-strategy conflict |
| [Bazel command-line reference](https://bazel.build/reference/command-line-reference) | Official docs, tracks current release | fetched 2026-09-05 | Ground truth for every flag name/default in this file; confirms `--remote_symlink_absolute_path_strategy` does not exist and `--repo_contents_cache_gc_max_size` does not exist |
| [`bazel.build/run/build`, "repository cache" section](https://bazel.build/run/build) | Official user guide | fetched 2026-09-05 | Verbatim mtime-touch-on-hit and never-auto-cleaned statements — the basis for the pruning-pattern answer |
| [bazelbuild/bazel#22516](https://github.com/bazelbuild/bazel/issues/22516) | GitHub issue, open | filed 2024-05-23, checked 2026-09-05 | The repository-cache GC feature request itself: P2, no milestone, 0 comments |
| [bazelbuild/bazel#5139](https://github.com/bazelbuild/bazel/issues/5139) | GitHub issue, closed | filed 2018-05-02, closed 2024-10-22 | The disk-cache GC issue #22516 cites as its precedent; confirms the 7.3-targeted/7.4-shipped timeline |
| [bazelbuild/bazel PR #26080, "Repo contents cache GC"](https://github.com/bazelbuild/bazel/pull/26080) | GitHub PR, merged/closed | closed 2025-05-22, checked 2026-09-05 | States the touch-then-age-out GC mechanism for the newer repo contents cache in the author's own words |
| [`bazel.build/remote/bep`](https://bazel.build/remote/bep) | Official docs | fetched 2026-09-05 | The verbatim TLS/auth-sharing statement between BES and RE endpoints, and the rationale for `--remote_build_event_upload` |
| [`build_event_stream.proto`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/buildeventstream/proto/build_event_stream.proto) | BEP schema source, `master` | fetched 2026-09-05 | Ground truth for every BEP field cited: `remote_cache_hits` deprecation, `TestResult`/`ExecutionInfo` cache booleans, `ArtifactMetrics` |
| [`action_cache.proto`](https://github.com/bazelbuild/bazel/blob/master/src/main/protobuf/action_cache.proto) | Local action-cache stats schema, `master` | fetched 2026-09-05 | Confirms `ActionCacheStatistics.hits`/`.misses` describes the local, not remote, cache |
| [bazelbuild/bazel#18997](https://github.com/bazelbuild/bazel/issues/18997) | GitHub issue, closed | filed against 6.2.1, closed 2024-01-29, checked 2026-09-05 | The one first-hand, numbers-bearing compression cost measurement found anywhere: 3-5x heap, public repro repo, and a maintainer's 750%-inflation micro-benchmark |
| [bazelbuild/bazel PR #17990](https://github.com/bazelbuild/bazel/pull/17990) | GitHub PR | 2023, checked 2026-09-05 | Named engineer's unquantified production-use assertion for the compression flag, contrasted against #18997's numbers |
| [`www.buildbuddy.io/blog/`](https://www.buildbuddy.io/blog/) | Vendor blog index | checked 2026-09-05 | Checked directly for a compression post; confirmed absent |
| [`blog.engflow.com`](https://blog.engflow.com/) | Vendor blog index | checked 2026-09-05 | Checked directly for a compression post; confirmed absent |
| [`blog.bazel.build`](https://blog.bazel.build/) | Official blog index | checked 2026-09-05 | Checked directly for a compression post; confirmed absent |
| [`bazelbuild/bazel` `CapabilitiesServer.java` (remote_worker)](https://github.com/bazelbuild/bazel/blob/master/src/tools/remote/src/main/java/com/google/devtools/build/remote/worker/CapabilitiesServer.java) | Bazel's own reference test server, `master` | fetched 2026-09-05 | A sixth capability-advertisement data point from Bazel's own team: hardcoded `DISALLOWED` |

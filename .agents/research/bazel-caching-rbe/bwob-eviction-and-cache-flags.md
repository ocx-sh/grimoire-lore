---
title: "BwoB, cache eviction, and the remote-cache flag surface"
topic: bwob-eviction-and-cache-flags
group: bazel-caching-rbe
family: BZL-CACHE
agent: researcher (bazel-caching-rbe/bwob-eviction-and-cache-flags)
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 17
primary_sources_count: 12
settles: [M-D-06, M-D-07, M-D-08, M-D-09, M-D-10, M-D-15, M-D-20, M-D-16, M-D-17, M-D-21]
scope: >
  Covers the current, dated default for every remote-cache-and-eviction flag
  the brief names; Build without the Bytes (BwoB) as a load-bearing default
  rather than an opt-in; the exit-39 eviction path and its mitigation flags;
  the disk cache's 7.4-era GC; and the six-cache taxonomy used to route a
  "why is this still slow" symptom to the right cache. Does NOT cover what
  enters a REAPI action key (action-keys-and-cache-hygiene.md), RE readiness
  or the credential/trust boundary (rbe-readiness-and-cache-trust-boundary.md),
  or per-language toolchain hermeticity.
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

- BwoB is not an opt-in feature to enable — `--remote_download_outputs` has defaulted to `"toplevel"` since Bazel 7 (Dec 2023), a flip from the prior `"all"` default ([command-line reference](https://bazel.build/reference/command-line-reference); [BwoB blog](https://blog.bazel.build/2023/10/06/bwob-in-bazel-7.html)).
- The three "aliases" (`--remote_download_all`, `--remote_download_minimal`, `--remote_download_toplevel`) are void flags that each expand to exactly one thing — `--remote_download_outputs=<value>` — as of the Bazel 7 refactor; before that they expanded to several orthogonal flags, which is why older guidance describing flag interactions between them is stale.
- Exit code **39** is `CacheNotFoundException` on an evicted remote-cache blob — a named, numbered, retryable failure mode, not a bare build failure. Retry it via `--experimental_remote_cache_eviction_retries` (current default **5**).
- The migration flag `--incompatible_remote_use_new_exit_code_for_lost_inputs` no longer exists — it was deleted from Bazel (closed [bazelbuild/bazel#25334](https://github.com/bazelbuild/bazel/pull/25334), 2025-02-20) once its behavior became unconditional. Citing it as something to flip is citing a dead flag.
- `--experimental_remote_merkle_tree_cache`, the flag named in the original frame, does not exist. The live flag is `--experimental_remote_discard_merkle_trees` (default **true**), and its intent is the *opposite* of what the old name implies: it **discards** in-memory Merkle trees to save memory, forcing recomputation on cache misses and retries.
- The documented BuildBuddy surprise ("1.8 MB → 640 MB of downloads") was a real Bazel bug in the TTL-trust logic for long-lived JVM processes, root-caused and fixed upstream in [bazelbuild/bazel#25398](https://github.com/bazelbuild/bazel/pull/25398), "Don't download all artifacts with BwoB when their TTL expires" (fixed and shipping in **Bazel 8.2.0 / 7.6.0**, per [BuildBuddy's own account](https://www.buildbuddy.io/blog/unusual-builds-w-bytes/)) — `rules_ocx` pins **8.7.0**, past the fix.
- The workaround BuildBuddy documented for that bug — hardcoding `--experimental_remote_cache_ttl=10000d` — is now obsolete guidance on any Bazel ≥8.2.0/≥7.6.0 pin, and BuildBuddy's own post names a real caveat: a hardcoded long TTL can outlive what an LRU-evicting cache server actually guarantees, reintroducing `CacheNotFoundException` from the opposite direction.
- `--experimental_remote_cache_eviction_retries`'s default changed from **0 to 5 in Bazel 8.0.0** (BuildBuddy's account); the current reference confirms **5** is still the default as of 2026-09-05.
- `--experimental_remote_cache_chunking` (content-defined chunking / dedup for large blobs) defaults **false** and its version floor is exactly what the brief named: `[8.7.0]` ([bazelbuild/bazel#28900](https://github.com/bazelbuild/bazel/pull/28900)) and `[9.1.0]` ([#28903](https://github.com/bazelbuild/bazel/pull/28903)) — `rules_ocx`'s 8.7.0 pin sits exactly at the floor. The explicit `rep_max_cdc` function selector (`--experimental_remote_cache_chunking_function`) needs one minor further, **8.8.0** ([#30585](https://github.com/bazelbuild/bazel/pull/30585)) — at exactly 8.7.0 only `auto` negotiation is available.
- `--disk_cache` has had automated garbage collection only **since Bazel 7.4** (`--experimental_disk_cache_gc_max_size`/`_max_age`/`_idle_delay`, confirmed on [bazel.build/remote/caching](https://bazel.build/remote/caching) and [bazelbuild/bazel#23833](https://github.com/bazelbuild/bazel/pull/23833)) — both size and age flags still default to **`"0"`** (unbounded) even on 7.4+, so GC is opt-in, not automatic-by-version.
- Six distinct caches exist inside one Bazel invocation — in-memory Skyframe, repository cache, output-tree/local action cache, remote cache (action-cache + CAS), local disk cache, remote execution — and most "why is this still slow" confusion comes from conflating two of them ([EngFlow — The Many Caches of Bazel](https://blog.engflow.com/2024/05/13/the-many-caches-of-bazel/)).
- The repository cache only benefits repo rules that call `rctx.download()`/`.download_and_extract()` under the hood; `http_archive` qualifies, but Gazelle-generated `go_repository` and `rules_docker`'s `container_pull` bypass it by default ([sluongng, pt. 3](https://sluongng.hashnode.dev/bazel-caching-explained-pt-3-repository-cache)).
- `rules_ocx` sets zero `--remote_download_*` flags anywhere — CI, dev machine, and any future IDE-feeding build all inherit whatever the pinned Bazel major's BwoB default happens to be, undifferentiated by role ([build-contracts-and-ci-posture.md:187-191](../bazel-audit/build-contracts-and-ci-posture.md)).
- `--remote_cache_compression` defaults **false**; even enabled, it is a no-op below `--experimental_remote_cache_compression_threshold`'s default of **100 bytes**.
- `--incompatible_remote_local_fallback_for_remote_cache` defaults **false** — a cache-only shape (a remote cache but no `--remote_executor`, `rules_ocx`'s own shape) does **not** fall back to local execution on a cache-service outage unless this is explicitly flipped; that is usually the *correct* fail-loud behavior, but it is a decision, not a neutral default.

## Findings

### 1. BwoB is on by default, not a feature to turn on

The frame and a second wave-1 scout both treated Build without the Bytes as something to *enable*. It is not. Per the [command-line reference](https://bazel.build/reference/command-line-reference) (fetched and parsed in full, 2026-09-05):

```
--remote_download_outputs   all, minimal or toplevel   default: "toplevel"
```

The [Bazel-7 announcement](https://blog.bazel.build/2023/10/06/bwob-in-bazel-7.html) states the change directly: "Starting from Bazel 7, the default download mode will be changed from `--remote_download_all` to `--remote_download_toplevel`." BwoB itself shipped experimentally in Bazel 0.25 and went stable in Bazel 1.0 — the only thing that changed in Bazel 7 is which mode is the default.

The three alias flags are each a `void` flag with a fixed expansion, confirmed directly from the reference text:

```
--remote_download_all        →  --remote_download_outputs=all
--remote_download_minimal    →  --remote_download_outputs=minimal
--remote_download_toplevel   →  --remote_download_outputs=toplevel
```

Before the Bazel 7 refactor, `--remote_download_minimal`/`--remote_download_toplevel` additionally expanded to `--nobuild_runfile_links`, `--experimental_inmemory_jdeps_files`, `--experimental_inmemory_dotd_files`, and `--experimental_action_cache_store_output_metadata`. The Bazel-7 blog post explains why the expansion was removed: those flags were unified into the main BwoB code path and flipped to true unconditionally, so switching download modes mid-stream no longer invalidates Bazel's internal cache the way a flag-set change used to. Guidance written against the old multi-flag expansion is stale for Bazel ≥7.

`--remote_download_regex` (a repeatable Java regex) forces specific output paths to download regardless of mode — it shipped in Bazel 5, alongside making BwoB interoperate with the persistent action cache across server restarts (same blog post).

### 2. Exit code 39, and the flag that used to gate it

Cache eviction during a BwoB build throws `CacheNotFoundException` on the client, mapped to a distinct **exit code 39**. Quoting the Bazel-7 blog directly: "Bazel may throw a `CacheNotFoundException` and exit with code 39 if it tries to download blobs that are already evicted. In this case, just retry the build." This lands in [bazelbuild/bazel#17358](https://github.com/bazelbuild/bazel/pull/17358), "Exit with code 39 if remote cache evicted blobs that Bazel need during…" (landed internally 2023-02, i.e. inside the Bazel 7 development window).

Three flags exist to reduce how often 39 fires or to recover automatically when it does:

| Flag | Type | Default | What it does |
|---|---|---|---|
| `--experimental_remote_cache_eviction_retries` | int | `"5"` | Automatic retry count for a build that hit a transient remote-cache error, eviction included. Each retry gets a fresh invocation ID. |
| `--experimental_remote_cache_ttl` | duration | `"3h"` | The TTL Bazel *assumes* the remote cache honors for referenced blobs; used to skip redundant `GetActionResult` calls in incremental builds. |
| `--experimental_remote_cache_lease_extension` | bool | `"false"` | Periodically calls `FindMissingBlobs` to keep referenced blobs' leases alive on the server, at the cadence implied by `--experimental_remote_cache_ttl`. |

There *was* a fourth, migration-only flag: `--incompatible_remote_use_new_exit_code_for_lost_inputs`, which originally gated whether a *wider* set of remote-cache errors were treated as retriable (expanded in [#23079](https://github.com/bazelbuild/bazel/pull/23079)/[#23426](https://github.com/bazelbuild/bazel/pull/23426), `[7.4.0]`). Its own PR description says it plainly: "The flag has been flipped in Bazel 7 and constitutes a very minor change." Once fully rolled out, it was deleted outright ([#25334](https://github.com/bazelbuild/bazel/pull/25334), closed 2025-02-20) — it has **zero** occurrences in the current CLI reference (confirmed by direct search over the fetched page, 2026-09-05). Any source — human or model — that instructs you to set this flag is working from a stale snapshot; the behavior it used to gate is now unconditional.

`--experimental_remote_cache_eviction_retries`'s *default value itself* also moved: BuildBuddy's account states "Default changed from 0 to 5 since Bazel 8.0.0." The current reference confirms `5` is still the value as of 2026-09-05 (Bazel 9.2-era docs), so the Bazel 8.0.0 change is the one still in force.

### 3. The BuildBuddy surprise: a real bug, now fixed, with obsolete advice still circulating

The brief's "chase the surprise" clause names a measured 1.8 MB → 640 MB download jump on one build. [BuildBuddy's own postmortem](https://www.buildbuddy.io/blog/unusual-builds-w-bytes/) (2025-03-10, written by the engineer who filed the upstream fix) gives the full mechanism, not just the headline number:

- Under `--remote_download_minimal`, Bazel does not download a remotely-executed action's outputs. Instead it stores a reference plus an expected TTL (`--experimental_remote_cache_ttl`, default 3h) in Skyframe, and trusts that reference until the TTL expires.
- When the TTL expires, instead of *re-validating* the artifact against the remote cache, Bazel **re-downloads the entire artifact** from scratch.
- This is harmless for a short-lived Bazel server. It is catastrophic for a long-lived one — BuildBuddy's own CI product snapshots and restores the same Bazel JVM process across many builds via Firecracker MicroVMs, so the process can live for hours or days, guaranteeing repeated TTL expiry and repeated full re-downloads.
- BuildBuddy's own reproduction, quoted verbatim from the post:

```
# Initial build, TTL not yet expired
$ bazel clean && bazel test //cli/... --config=remote-minimal --disk_cache= --experimental_remote_cache_ttl=1d
$ du -h $(bazel info output_base)/execroot | sort -h
...
1.8M    /private/var/tmp/_bazel_fmeum/.../execroot

# Same build, TTL forced to 0 (expired)
$ bazel clean && bazel test //cli/... --config=remote-minimal --disk_cache= --experimental_remote_cache_ttl=0
$ du -h $(bazel info output_base)/execroot | sort -h
...
640M    /private/var/tmp/_bazel_fmeum/.../execroot
```

- The fix landed in [bazelbuild/bazel#25398](https://github.com/bazelbuild/bazel/pull/25398), "Don't download all artifacts with BwoB when their TTL expires" (closed 2025-03-04), described by BuildBuddy as shipping in **Bazel 8.2.0 and 7.6.0** (cherry-picked to both). `rules_ocx` pins **8.7.0** — past the fix.
- The workaround BuildBuddy documented for versions *before* the fix — `common --experimental_remote_cache_ttl=10000d` — is dated in their own `.bazelrc` snippet with the comment "Not needed after Bazel 8.2.0." It is now **obsolete guidance for any current pin**, and the same post names the reason not to apply it blindly anyway: a hardcoded long TTL makes Bazel trust that the remote cache will keep referenced blobs around for that long, which an LRU-evicting cache (bazel-remote included, the shape `rules_ocx` deploys) does not guarantee — producing the exact `CacheNotFoundException`/exit-39 failure from the opposite direction, quoted directly from BuildBuddy's error log:

```
com.google.devtools.build.lib.remote.common.BulkTransferException: 3 errors during bulk transfer:
com.google.devtools.build.lib.remote.common.CacheNotFoundException: Missing digest: d0387e62...
```

The correct proactive setting, per BuildBuddy's own mitigated `.bazelrc`, is **not** an arbitrarily large TTL but `--experimental_remote_cache_ttl` set close to (slightly under) the cache server's *actual* advertised TTL, paired with `--experimental_remote_cache_eviction_retries=5` (their default) as the safety net.

### 4. The six-cache taxonomy, and which symptom implicates which

[EngFlow's own taxonomy](https://blog.engflow.com/2024/05/13/the-many-caches-of-bazel/) (fetched directly, 2024-05-13) names six caches inside one Bazel invocation:

| # | Cache | Where it lives | What it stores | Survives what |
|---|---|---|---|---|
| 1 | In-memory Skyframe | Bazel server process (RAM) | `glob()` results, the action graph, actions themselves | Nothing that outlives `bazel shutdown`; this is *why* Bazel runs a daemon at all |
| 2 | Repository cache | `bazel info repository_cache` (shared across workspaces) | Downloaded archives, content-addressed | `bazel clean --expunge`; has **no automated pruning**, grows unbounded |
| 3 | Output tree / local action cache | `bazel-out/` + `$(bazel info output_base)/action_cache/` | Per-action `actionKey` (cmd args + mnemonic), `usedClientEnvKey` (`--action_env` vars), `digestKey` (input/output digests) | Server restarts, not `bazel clean` |
| 4 | Remote cache | The configured `--remote_cache` server | Action-cache (digest → `ActionResult`) + CAS (digest → bytes), per REAPI | Everything local; shared across machines |
| 5 | Local disk cache | `--disk_cache` path | Same shape/protocol as the remote cache, on local disk | `bazel clean`, but not process restarts; unbounded pre-7.4 |
| 6 | Remote execution | The configured `--remote_executor` | An extension of remote caching: inputs staged to CAS, action run remotely, results + outputs land in CAS | N/A — not itself persistent state, a compute path |

Inspect the output-tree cache directly with `bazel dump --action_cache`; EngFlow's own dump example shows the three-field key (`actionKey`, `usedClientEnvKey`, `digestKey`) per output.

Diagnostic routing, synthesized from this taxonomy plus the flag facts above:

| Symptom | Cache implicated | Not this one |
|---|---|---|
| Build reruns 3× across an edit → build → revert → build sequence, even though the first and third invocations are identical | None — by design; the output-tree cache has no history beyond its current state (EngFlow's own worked example) | Not a remote-cache bug |
| Fresh checkout still skips re-downloading `http_archive` sources | Repository cache | Not the remote cache — no network round-trip to a remote cache server is needed for this |
| CI on a brand-new runner still gets action-cache hits | Remote cache (action cache + CAS) | Not the repository cache — that only covers external-dependency archives, not build outputs |
| Exit code 39 | Remote cache (eviction) | Never the disk cache or repository cache — `CacheNotFoundException` is a REAPI-server-side eviction, not a local-disk condition |
| CI runner's local disk fills up over days with no server involved | Disk cache (if `--disk_cache` is set, pre-GC-configured) or repository cache (no GC exists at all) | Not the remote cache — nothing server-side is filling a local disk |
| "N remote cache hits" in the summary line, but the build still feels slow | Could be BwoB re-download volume (CAS transfer) *or* remote-execution queue latency — the aggregate hit-count line does not distinguish them | Diagnosing from that line alone conflates two different cost centers |

### 5. The remaining flags, exact and dated

All confirmed directly against the [command-line reference](https://bazel.build/reference/command-line-reference) (fetched in full, 2026-09-05):

| Flag | Type | Default | Version it changed |
|---|---|---|---|
| `--remote_upload_local_results` | bool | `"true"` | — |
| `--remote_accept_cached` | bool | `"true"` | — |
| `--remote_timeout` | duration | `"60s"` | — |
| `--remote_retries` | int | `"5"` | — |
| `--remote_cache_compression` | bool | `"false"` | — |
| `--experimental_remote_cache_compression_threshold` | int (bytes) | `"100"` | Ineffectual unless `--remote_cache_compression` is set |
| `--remote_verify_downloads` | bool | `"true"` | — |
| `--incompatible_strict_action_env` | bool | `"true"` | Flipped from opt-in hardening to default-true; pins `PATH`, drops `LD_LIBRARY_PATH` inheritance |
| `--incompatible_remote_local_fallback_for_remote_cache` | bool | `"false"` | Governs whether `--remote_local_fallback` (itself default `false`) applies when only a remote *cache* — no executor — is configured |
| `--experimental_remote_discard_merkle_trees` | bool | `"true"` | Discards in-memory Merkle trees during `GetActionResult()`/`Execute()` to cut memory use; forces recompute on cache miss/retry |
| `--disk_cache` | path (accepts `--no` form) | unset; bare form uses `<outputUserRoot>/cache/disk` | — |
| `--experimental_disk_cache_gc_max_size` | size | `"0"` (unbounded) | **Bazel 7.4** ([#23833](https://github.com/bazelbuild/bazel/pull/23833)) |
| `--experimental_disk_cache_gc_max_age` | duration | `"0"` (unbounded) | **Bazel 7.4** |
| `--experimental_disk_cache_gc_idle_delay` | duration | `"5m"` | **Bazel 7.4** |
| `--experimental_remote_cache_chunking` | bool | `"false"` | **Bazel 8.7.0** / **9.1.0** ([#28900](https://github.com/bazelbuild/bazel/pull/28900), [#28903](https://github.com/bazelbuild/bazel/pull/28903)) |
| `--experimental_remote_cache_chunking_function` | enum (`auto`/`fast_cdc_2020`/`rep_max_cdc`) | `"auto"` | `rep_max_cdc` explicit selection needs **8.8.0** ([#30585](https://github.com/bazelbuild/bazel/pull/30585)) |

Official [bazel.build/remote/caching](https://bazel.build/remote/caching) independently confirms the disk-cache GC floor in its own prose: "Starting with Bazel 7.4, you can use `--experimental_disk_cache_gc_max_size` and `--experimental_disk_cache_gc_max_age`..." and names the on-demand GC tool at `src/tools/diskcache` in the Bazel source tree — useful for a CI runner that wants to prune without waiting for the idle-triggered background pass.

The same page states plainly, and unmodified since first surveyed: "Bazel currently does not track tools outside a workspace" — i.e. a host compiler difference between two machines is invisible to the cache key and will produce a false cache hit, unless the toolchain is itself a declared, hermetic input.

The repository cache's own coverage gap, from [sluongng's post](https://sluongng.hashnode.dev/bazel-caching-explained-pt-3-repository-cache): only repo rules that call `rctx.download()`/`.download_and_extract()` get cached this way. `http_archive` qualifies. Gazelle-generated `go_repository` targets do **not** by default (they use a separate, optional caching path only when a URL is explicitly provided), and `rules_docker`'s `container_pull` bypasses the repository cache entirely with its own puller-binary caching.

## Decisions

**Decision 1 — the per-role BwoB default.** CI runners whose job is build/test correctness and never consume artifacts locally: set `--remote_download_minimal` explicitly rather than riding the Bazel-major default. The developer's interactive machine: leave the Bazel ≥7 default, `--remote_download_toplevel` — it already matches "I need the final artifact, not every intermediate" without extra configuration. An IDE-feeding build (e.g. one producing `compile_commands.json` under an otherwise-minimal profile): `--remote_download_minimal` plus `--remote_download_regex` naming the specific IDE-consumed path(s), not a blanket regression to `--remote_download_all`.
Evidence: the Bazel-7 blog's own usage table marks `minimal` "CI builds," `toplevel` "Interactive builds," and `all` "Fallback" only; `--remote_download_regex` exists for exactly the targeted-exception case. Assumption named: this is prescriptive guidance for shape F (a future polyglot Bazel monorepo) — `rules_ocx` itself (shape A) currently sets **no** `--remote_download_*` flag at all ([fleet evidence](#fleet-evidence)), so there is no existing fleet misconfiguration to correct, only a gap to fill when a consumer adopts BwoB tuning.

**Decision 2 — proactive TTL tuning, or wait for exit 39?** Proactive, but narrower than the historical advice. `--experimental_remote_cache_ttl` MUST be set to at most the deployed cache server's actual advertised minimum blob TTL whenever that number is known — this is a correctness fact about the deployment, not a performance knob, and it is independent of the now-fixed BuildBuddy bug. It is not, however, the "set it to `10000d`" advice from before the fix: that workaround is dated by BuildBuddy's own `.bazelrc` comment ("Not needed after Bazel 8.2.0") and, applied on a current pin, actively risks the opposite failure — trusting a TTL longer than an LRU-evicting server actually honors. `--experimental_remote_cache_eviction_retries` (default 5) stays on as the always-on safety net regardless of TTL tuning; it costs nothing when eviction never happens. `--experimental_remote_cache_lease_extension` is the one flag that stays reactive-by-role: turn it on specifically for long-lived Bazel server processes (a snapshot/restore CI product, a developer machine that never runs `bazel shutdown`), not as a blanket default, since its cost is a periodic `FindMissingBlobs` call for every referenced blob.
Assumption named: the vendor's real TTL is knowable at config time. For a self-hosted `bazel-remote` (the shape `rules_ocx` deploys), it is — the operator sets the LRU size/eviction policy directly. Where it genuinely is not knowable, the fallback is the 3h default plus `eviction_retries=5`, and an actual exit-39 sighting is what should trigger going and finding the real number, not a preemptive guess.

## Normative guidance candidates

1. **Never describe BwoB as something to enable.** `--remote_download_outputs` has defaulted to `toplevel` since Bazel 7 (Dec 2023).
   Rationale: guidance written against the pre-7 `all` default tells an adopter to add a flag that changes nothing on any current Bazel major.
   Verify: `bazel help build 2>&1 | grep -A2 remote_download_outputs` and read the default; empty output (flag not found) means the Bazel binary predates this flag's introduction (Bazel <0.25) and reads as a much bigger problem than stale guidance.
   Severity: MUST. Bazel 7, 8, 9. rules_ocx pin 8.7.0.

2. **A CI runner that never consumes build artifacts locally MUST set `--remote_download_minimal` explicitly.**
   Rationale: riding the Bazel-major default (`toplevel`) downloads every top-level target's outputs even when nothing in the runner reads them.
   Verify: grep the runner's `.bazelrc`/CI config for `remote_download_`; empty output on a CI-only leg reads as a finding (undifferentiated default), not a pass.
   Severity: SHOULD. Bazel 7, 8, 9; all remote-cache/RBE consumers (shape F).

3. **An IDE-feeding build under a minimal/toplevel profile MUST use `--remote_download_regex`, never a blanket `--remote_download_all`.**
   Rationale: regressing the whole build to download-everything to serve one consumed file (e.g. `compile_commands.json`) reintroduces the exact bandwidth cost BwoB exists to avoid.
   Verify: `grep -n "remote_download_all\|remote_download_regex" *.bazelrc*`; a hit on `_all` with no comment justifying full-download intent is the finding.
   Severity: SHOULD. Bazel ≥5 (regex flag's floor).

4. **Never cite `--experimental_remote_merkle_tree_cache`.** It does not exist in any current Bazel release.
   Rationale: a hallucinated or stale-memory flag name; Bazel will reject it at parse time (`ERROR: Unrecognized option`).
   Verify: `grep -rn "remote_merkle_tree_cache" *.bazelrc* AGENTS.md .claude/ .agents/`; any hit is the finding. The live, semantically-inverted flag is `--experimental_remote_discard_merkle_trees`.
   Severity: MUST. All current Bazel majors (7, 8, 9).

5. **Never cite `--incompatible_remote_use_new_exit_code_for_lost_inputs`.** Deleted from Bazel ([#25334](https://github.com/bazelbuild/bazel/pull/25334)).
   Rationale: the flag's behavior is now unconditional; setting it produces an unrecognized-option error on any current Bazel.
   Verify: `bazel help build 2>&1 | grep -c incompatible_remote_use_new_exit_code_for_lost_inputs` must be `0`; a nonzero count means an ancient Bazel binary is in play.
   Severity: MUST. Bazel ≥8 (deleted 2025; present-but-flipped in 7.4–7.x).

6. **A CI wrapper MUST treat bare exit code 39 as retryable, not as a terminal build failure.**
   Rationale: 39 is `CacheNotFoundException` on an evicted blob — the documented recovery is "just retry the build," and Bazel already has a flag for it.
   Verify: search the CI harness for exit-code handling; grep for `39` alongside the retry/backoff logic. Empty output (no special-case for 39) reads as a finding — the runner is treating a known-transient error as fatal.
   Severity: SHOULD. Bazel ≥7 (where exit 39 exists). rules_ocx has zero fleet exhibit today (no remote-execution consumer to trigger it) — this is prescriptive for shape F.

7. **Leave `--experimental_remote_cache_eviction_retries` at its default (5) unless a documented reason sets it otherwise.**
   Rationale: setting it to `0` silently converts every eviction into a hard build failure with no automatic recovery.
   Verify: `grep -n "experimental_remote_cache_eviction_retries" *.bazelrc*`; a hit with a value of `0` and no comment is the finding. Empty output (flag absent, default in force) is a pass.
   Severity: SHOULD. Bazel ≥8.0.0 (where the default itself became 5).

8. **`--experimental_remote_cache_ttl` MUST be set to at most the deployed cache server's real advertised minimum TTL, whenever that number is known.**
   Rationale: leaving the 3h default when the server's real eviction window is shorter guarantees intermittent exit-39 on any build that runs longer than the real TTL.
   Verify: compare the flag's set value (or the 3h default, if unset) against the cache operator's documented eviction policy (e.g. a `bazel-remote` `-max_size`/LRU config). No re-runnable command exists for this — it is a named reading heuristic: read the cache server's own config alongside the Bazel flag.
   Severity: SHOULD. Bazel ≥7 (flag's floor). CONSIDER where the vendor's real TTL is not knowable — the 3h default plus eviction retries is the acceptable fallback there.

9. **Do not set `--experimental_remote_cache_ttl` to an arbitrarily large static value (e.g. `10000d`) on a current Bazel pin.**
   Rationale: that workaround targeted a bug fixed in Bazel 8.2.0/7.6.0; on a current pin it instead risks trusting a longer TTL than an LRU-evicting server actually honors, producing the opposite `CacheNotFoundException` failure.
   Verify: `grep -n "experimental_remote_cache_ttl" *.bazelrc*`; a value ≥ roughly `30d` alongside a `.bazelversion` ≥ 8.2.0/7.6.0 is the finding. Empty output (flag unset, or a value near the vendor's real TTL) is a pass.
   Severity: MUST for a Bazel pin ≥8.2.0/≥7.6.0. Historical-only guidance below that floor.

10. **Enable `--experimental_remote_cache_lease_extension` for any long-lived Bazel server process.**
    Rationale: a Bazel JVM kept alive across many invocations (a snapshot/restore CI product, a developer box that never runs `bazel shutdown`) hits TTL expiry repeatedly without it, each time paying a full re-download rather than a lease refresh.
    Verify: grep the relevant `.bazelrc` for the flag; empty output on a known long-lived-server setup is the finding.
    Severity: SHOULD. Bazel ≥7.

11. **A `.bazelrc` enabling `--experimental_remote_cache_chunking` MUST gate on the pinned Bazel version being ≥8.7.0 or ≥9.1.0.**
    Rationale: the flag has no effect (and may not exist) below that floor — a `.bazelrc` line predicated on a wider CI matrix (e.g. rules_ocx's 8.7.0/9.x/rolling triple) needs the version check made explicit, not assumed.
    Verify: cross-reference the flag's presence in any `.bazelrc` against `.bazelversion`/the CI matrix's oldest pinned version.
    Severity: SHOULD. Applies exactly at the fleet's own pin (8.7.0) — this is the version floor, not a comfortable margin above it.

12. **Do not select `--experimental_remote_cache_chunking_function=rep_max_cdc` below Bazel 8.8.0.**
    Rationale: explicit function selection (as opposed to server-negotiated `auto`) shipped one minor after the base chunking flag ([#30585](https://github.com/bazelbuild/bazel/pull/30585)).
    Verify: same version cross-reference as above, against 8.8.0 specifically rather than 8.7.0.
    Severity: SHOULD. Bazel ≥8.8.0/9.1.0+ for explicit function selection; `auto` is safe from 8.7.0/9.1.0.

13. **A `--disk_cache` set with no GC flags on Bazel ≥7.4 is an unbounded-growth footgun; set `--experimental_disk_cache_gc_max_size` and/or `_max_age`.**
    Rationale: both GC flags default to `"0"` (unbounded) even on a version that supports them — the feature is opt-in, not automatic.
    Verify: `grep -n "disk_cache" *.bazelrc*`; if `--disk_cache` appears without either GC flag nearby, that is the finding. Empty output (no disk cache configured at all) is a pass by absence, not by configuration.
    Severity: SHOULD. Bazel ≥7.4 (where the flags exist at all). rules_ocx has zero fleet exhibit — no `.bazelrc*` sets `--disk_cache` anywhere in the repo.

14. **On a Bazel pin <7.4, treat `--disk_cache` as having no automated GC at all.**
    Rationale: the GC flags do not exist below 7.4 — a disk-space-constrained CI runner using `--disk_cache` on an older pin needs a manual prune (`src/tools/diskcache`) or should avoid `--disk_cache` entirely.
    Verify: read `.bazelversion` against 7.4; if below, confirm no reliance on "Bazel prunes this automatically" in any doc or comment.
    Severity: MUST for pins <7.4 that also set `--disk_cache`.

15. **Before diagnosing any "why is this still slow / why did this rebuild" complaint, first name which of the six caches is implicated.**
    Rationale: conflating the repository cache, the disk cache, and the remote cache is the most common source of wrong diagnoses (EngFlow's own framing).
    Verify: named reading heuristic — check `bazel info repository_cache`, `$(bazel info output_base)/action_cache/`, and the configured `--disk_cache` path as three *distinct* directories before attributing a symptom to "the cache." No single command substitutes for naming which cache is in play.
    Severity: MUST as a diagnostic discipline (not itself a lint-checkable rule; CONSIDER for tooling enforcement).

16. **Do not assume `--repository_cache` speeds up every repository rule.**
    Rationale: only rules calling `rctx.download()`/`.download_and_extract()` benefit; `go_repository` (Gazelle-generated, no URL given) and `container_pull` bypass it by default.
    Verify: read each repo rule's implementation for a direct `rctx.download` call before crediting (or blaming) the repository cache for its fetch behavior. No grep substitutes — this requires reading the rule, not the caller.
    Severity: CONSIDER. All shapes with third-party repo rules.

17. **`--remote_cache_compression` is a no-op below 100 bytes; do not enable it without checking the artifact-size distribution first.**
    Rationale: a build dominated by many small blobs (common in Starlark-heavy or metadata-heavy actions) pays the CPU cost of compression logic for zero transfer savings.
    Verify: sample `bazel-out` output sizes (or the remote cache's own upload-size stats, per BuildBuddy's "sort by size descending" methodology) before flipping the flag; empty/near-empty size distribution above 100 bytes is the finding against enabling it.
    Severity: CONSIDER. All Bazel majors; flag's default is `false`.

18. **Treat "we never set any `--remote_download_*` flag" as a decision to audit, not a neutral state.**
    Rationale: absence of the flag does not mean BwoB is off — it means every role (CI, dev, future IDE build) silently inherits the pinned Bazel major's current default.
    Verify: `grep -rn "remote_download" *.bazelrc* .github/**/*.yml`; empty output is itself the finding when a remote cache (`--remote_cache`) is configured at all — it means BwoB tuning was never a deliberate choice.
    Severity: SHOULD. Settles M-D-06. rules_ocx is the exact positive instance: a configured remote cache, zero `--remote_download_*` flags, three distinct roles (CI matrix, BCR-parity, examples) getting the same undifferentiated default.

19. **A `.bazelrc` line pinning a flag to a value identical to its own current default should carry a comment stating the intended floor, or be removed.**
    Rationale: an explicit `--remote_timeout=60` against a documented default of `"60s"` has zero functional effect today and reads as either dead configuration or an unstated defensive pin against a future default change — a reviewer cannot tell which without a comment.
    Verify: cross-reference every explicit flag value in a `.bazelrc*` against the CLI reference's current default for that flag; a match with no adjacent comment is the finding.
    Severity: CONSIDER. Fleet exhibit: `rules_ocx`'s `.bazelrc.user:9` and `action.yml:28` both set `--remote_timeout=60`, exactly the current default, with no rationale comment ([build-contracts-and-ci-posture.md:185](../bazel-audit/build-contracts-and-ci-posture.md)).

20. **`--incompatible_remote_local_fallback_for_remote_cache` staying at its default (`false`) on a cache-only shape (no `--remote_executor`) is a decision that MUST be stated, not left implicit.**
    Rationale: a cache-service outage on that shape has zero fallback — the build fails rather than degrading to local execution. That is frequently the *correct* choice (fail loud rather than silently going slow-and-local for an entire CI fleet), but only if someone decided it, not if nobody looked.
    Verify: grep for the flag; empty output on a repo with `--remote_cache` set and no `--remote_executor` means the default is in force by omission — confirm a comment or doc states this is intentional.
    Severity: CONSIDER. Bazel ≥7. rules_ocx matches this shape exactly (cache configured, no executor, flag absent, [ci §4](../bazel-audit/build-contracts-and-ci-posture.md) / map conflict 10).

## Fleet evidence

- **`rules_ocx` sets zero `--remote_download_*` flags anywhere.** Confirmed both from the audit ("Absent everywhere in the repo... No `--remote_download_*` flag (i.e., no explicit BwoB tuning; whatever the Bazel-version default is applies unmodified)", [build-contracts-and-ci-posture.md:187,191](../bazel-audit/build-contracts-and-ci-posture.md)) and independently by grepping the live repo (`grep -rn "remote_download" .` over `rules_ocx` → no output). This is the exact, live instance of candidate 18/M-D-06: three distinct roles (CI matrix across 3 Bazel versions, BCR-parity, Examples) all inherit the same undifferentiated `toplevel` default.
- **`--remote_timeout=60` is set explicitly in two places, matching the current upstream default exactly, with no rationale.** `.bazelrc.user:9` and `action.yml:28` both carry it ([build-contracts-and-ci-posture.md:74,102,185](../bazel-audit/build-contracts-and-ci-posture.md)); this is candidate 19's live exhibit — dead-or-defensive configuration, undocumented either way.
- **The cache write credential lives in a bare `--remote_header` line, not `--credential_helper`.** `.bazelrc.user:8` sets `build --remote_header=authorization="Basic <credential>"` (value not reproduced here, per the task's secrets instruction). This is out of this brief's scope (it belongs to `rbe-readiness-and-cache-trust-boundary.md`, M-D-03) but is visible in the same file this brief reads for BwoB evidence, so it is noted rather than silently passed over.
- **No `--disk_cache` anywhere in the repo.** Confirmed by the same absent-flags grep. Candidates 13/14 (disk-cache GC) have no live fleet instance in shape A; they are prescriptive for shape F only.
- **Read-only vs. read-write cache access is gated correctly, and is a decision this brief does not re-litigate.** `--remote_upload_local_results=false` fires only when the `auth` CI input is empty (every PR, including same-repo PRs), wired through `github.event_name == 'push'` ([build-contracts-and-ci-posture.md:183](../bazel-audit/build-contracts-and-ci-posture.md)). This is M-D-04's territory (`rbe-readiness-and-cache-trust-boundary.md`), mentioned here only because it shares the same `action.yml` lines this brief already cites for `--remote_timeout`.
- **Two CI legs (`bcr-parity`, `offline`) are deliberately uncached as a hermeticity assertion, with a stated rationale; a third (`examples`) is uncached with none.** This is adjacent to the six-cache taxonomy (a deliberately-absent remote cache is itself a diagnostic signal, not a symptom) but is centrally M-D-14's finding, not this brief's — noted for cross-reference only ([build-contracts-and-ci-posture.md:295,309](../bazel-audit/build-contracts-and-ci-posture.md)).
- **Action-key contents, sort-order invariants, and the Merkle-tree flag's non-existence are covered by the sibling dive.** `action-keys-and-cache-hygiene.md` owns M-D-01/M-D-02; this brief only re-confirms M-D-20 (the flag name) independently against the live CLI reference, per its own chase-the-surprise clause.
- **RBE readiness, dynamic execution's cache-only impossibility, and the credential-helper migration are covered by the sibling dive.** `rbe-readiness-and-cache-trust-boundary.md` owns M-D-03/M-D-04/M-D-11/M-D-12/M-D-13 — not re-derived here.

## AI-agent angle

1. **Recommending `--remote_download_minimal` "to turn on BwoB."** BwoB has been on by default (`toplevel`) since Bazel 7 (Dec 2023) — describing it as opt-in is training-data staleness. Check: `bazel help build 2>&1 | grep remote_download_outputs` and read the printed default before writing any BwoB guidance.
2. **Citing `--experimental_remote_merkle_tree_cache`.** This flag does not exist in any released Bazel version; it appears to be a plausible-sounding hallucination or a confusion with the *actual* (semantically inverted) `--experimental_remote_discard_merkle_trees`. Check: `grep -c remote_merkle_tree_cache` over the CLI reference (or `bazel help build`) — must be `0`.
3. **Recommending `--incompatible_remote_use_new_exit_code_for_lost_inputs=true`.** Deleted from Bazel; setting it fails with an unrecognized-option error on any current release. Check: same grep pattern against the flag name; a training-data-only model has no way to know this flag is gone unless it is told to verify against the live reference first.
4. **Prescribing the WORKSPACE-era RBE setup pattern** (`rbe_autoconfig`, a `bazel-toolchains` WORKSPACE dependency) — notably, even Bazel's own `remote/ci` doc still shows this pattern, so an LLM reading *official* docs uncritically will still get this wrong. It is flatly impossible on Bazel 9 (WORKSPACE fully removed, confirmed directly from the [Bazel 9 LTS announcement](https://blog.bazel.build/2026/01/20/bazel-9.html): "we've completely removed the code supporting WORKSPACE"). Check: `grep -rn "rbe_autoconfig\|bazel-toolchains" WORKSPACE* MODULE.bazel* .bazelrc*` — any hit on a Bazel-9-targeted repo is the finding.
5. **Recommending a hardcoded large `--experimental_remote_cache_ttl` (e.g. `10000d`) as current best practice.** This was the *correct* stopgap only for Bazel <8.2.0/<7.6.0, per BuildBuddy's own dated comment. Applied on a current pin it is stale and can actively cause the opposite failure. Check: read `.bazelversion` (or the CI matrix's oldest pin) against 8.2.0/7.6.0 before applying any TTL workaround copied from a pre-2026 source.
6. **Assuming `--disk_cache` is automatically garbage collected on any Bazel version.** GC flags exist only from 7.4, and even then both size and age default to unbounded (`"0"`) — GC must be explicitly configured, not merely available. Check: confirm `.bazelversion` ≥7.4 *and* that `--experimental_disk_cache_gc_max_size`/`_max_age` are actually set, not just present in the version.
7. **Conflating "the remote cache" with "the disk cache" or "the repository cache" in a diagnosis.** An LLM asked "why is disk filling up on this CI runner" will often say "the remote cache" when the actual culprit is an unpruned repository cache or a `--disk_cache` with no GC flags — three different directories with three different lifecycles. Check: `du -sh $(bazel info repository_cache) $(bazel info output_base) <configured --disk_cache path>` and attribute growth to the specific directory that is actually large, not to "the cache" generically.

## Contested / evolving

- **BwoB aggressiveness for CI.** The Bazel-7 default (`toplevel`) is itself a compromise between "download everything" and "download nothing." BuildBuddy's own guidance still pushes CI-only runners further, toward `minimal`, framing `toplevel` as the *interactive*-build default rather than the CI-optimal one. No primary source argues `all` is still correct for anything except explicit debugging or IDE/tooling integration that cannot yet use `--remote_download_regex`. Trending, as of 2026-09-05: `minimal` for pure build/test CI, `toplevel` (the shipped default) left alone for interactive use, `--remote_download_regex` for the narrow IDE-file case rather than `all`.
- **TTL-tuning advice is a live moving target, not settled folklore.** BuildBuddy's own troubleshooting docs, as recently as their March 2025 post, still walked readers through the `10000d` workaround — appropriate advice at time of writing (fix not yet released), already dated eight months later once 8.2.0/7.6.0 shipped it. Any source repeating that specific numeric workaround needs its publish date checked against the 8.2.0/7.6.0 floor before being trusted.
- **Content-defined chunking (`--experimental_remote_cache_chunking`) is brand new and still actively changing.** The base flag landed in 8.7.0/9.1.0 (March 2026); the `rep_max_cdc` function selector landed one minor later (8.8.0, August 2026); a truncation bug when combined with `--disk_cache` was filed in May 2026 ([bazelbuild/bazel#29544](https://github.com/bazelbuild/bazel/issues/29544)) and patched the same day ([#29545](https://github.com/bazelbuild/bazel/pull/29545)); bounded parallel chunk transfers landed as late as September 2026 ([#30951](https://github.com/bazelbuild/bazel/pull/30951)). It is correctly still gated `experimental` and defaults `false` — too new to recommend enabling by default on any pin, `rules_ocx`'s 8.7.0 included.
- **Repository-cache GC remains an open request, asymmetric with the disk cache's 7.4-era fix.** No merged PR was found addressing automated pruning for `bazel info repository_cache`, despite it sharing the same unbounded-growth complaint EngFlow's post makes about the disk cache pre-7.4. The two caches share a content-addressed shape but have received different maintainer investment; there is no dated commitment to close this gap as of 2026-09-05.
- **`--remote_cache_compression`'s value is genuinely contested, not just under-adopted.** It defaults `false` and the wave-1 scout found two independent (second-hand) reports of it hurting rather than helping. This brief did not find a first-hand benchmark either way — the honest state is "untested for this fleet's artifact-size distribution," not "settled against."

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Command-Line Reference](https://bazel.build/reference/command-line-reference) | Official Bazel doc, primary | Current (fetched and parsed in full, 2026-09-05) | The single source of truth for every flag default this brief pins down |
| [Remote Caching](https://bazel.build/remote/caching) | Official Bazel doc, primary | Current (fetched 2026-09-05) | Disk-cache GC floor stated in prose ("Starting with Bazel 7.4"), the on-demand GC tool path, the "does not track tools outside a workspace" caveat |
| [Build without the Bytes in Bazel 7](https://blog.bazel.build/2023/10/06/bwob-in-bazel-7.html) | Official Bazel blog, primary | 2023-10-06 (fetched 2026-09-05) | The default flip itself, the alias-expansion history, exit code 39's introduction, in the maintainers' own words |
| [Bazel 9 LTS announcement](https://blog.bazel.build/2026/01/20/bazel-9.html) | Official Bazel blog, primary | 2026-01-20 (fetched 2026-09-05) | Direct confirmation that WORKSPACE support code is fully removed, dating why `remote/ci`'s WORKSPACE-era guidance is now impossible, not just stale |
| [bazelbuild/bazel#17358](https://github.com/bazelbuild/bazel/pull/17358) | Ruleset's own repo, primary | Landed 2023-02 | The original PR introducing exit code 39 for evicted-blob lost inputs |
| [bazelbuild/bazel#25398](https://github.com/bazelbuild/bazel/pull/25398) | Ruleset's own repo, primary | Closed 2025-03-04 | The actual upstream fix for the BuildBuddy TTL-trust bug, confirming the 8.2.0/7.6.0 floor independently of the vendor's account |
| [bazelbuild/bazel#25334](https://github.com/bazelbuild/bazel/pull/25334) | Ruleset's own repo, primary | Closed 2025-02-20 | Deletion of the migration flag `--incompatible_remote_use_new_exit_code_for_lost_inputs`, with the maintainers' own one-line rationale |
| [bazelbuild/bazel#23833](https://github.com/bazelbuild/bazel/pull/23833) | Ruleset's own repo, primary | `[7.4.0]` | The exact PR implementing disk-cache garbage collection |
| [bazelbuild/bazel#28900](https://github.com/bazelbuild/bazel/pull/28900) / [#28903](https://github.com/bazelbuild/bazel/pull/28903) | Ruleset's own repo, primary | `[8.7.0]` / `[9.1.0]` | Confirms the exact version floor the brief named for `--experimental_remote_cache_chunking` |
| [bazelbuild/bazel#30585](https://github.com/bazelbuild/bazel/pull/30585) | Ruleset's own repo, primary | `[8.8.0]` | The one-minor-later floor for explicit `rep_max_cdc` function selection |
| [bazelbuild/bazel#29544](https://github.com/bazelbuild/bazel/issues/29544) | Ruleset's own repo, primary | 2026-05-15 | A live, dated bug in the brand-new chunking feature, evidence it is still maturing |
| [BuildBuddy — Unusual Builds with Bytes](https://www.buildbuddy.io/blog/unusual-builds-w-bytes/) | Vendor blog, first-hand bug report and fix | 2025-03-10 (fetched 2026-09-05) | The full mechanism behind the brief's named surprise, the exact `du -h` reproduction, the fixed-version numbers, and the documented caveat against the obvious workaround |
| [EngFlow — The Many Caches of Bazel](https://blog.engflow.com/2024/05/13/the-many-caches-of-bazel/) | Vendor blog | 2024-05-13 (fetched 2026-09-05) | The six-cache taxonomy this brief's diagnostic-routing table is built on, in the authors' own words and examples |
| [sluongng — Bazel Caching Explained, pt. 3: Repository Cache](https://sluongng.hashnode.dev/bazel-caching-explained-pt-3-repository-cache) | Independent technical blog | Current (fetched 2026-09-05) | The repository cache's specific coverage gap (`rctx.download()`-only), not documented this precisely in official docs |
| [rbe-and-caching.md](../bazel-topic-map/rbe-and-caching.md) | Wave-1 scout, internal | 2026-09-05 | The landscape map this brief's brief was commissioned against; cross-referenced for M-ID assignment and for flags this dive did not re-derive |
| [build-contracts-and-ci-posture.md](../bazel-audit/build-contracts-and-ci-posture.md) | Fleet grounding audit, internal | 2026-09-05 | Every fleet-evidence citation in this dive (`.bazelrc.user`, `action.yml`, the absent-`remote_download` finding) |

---
title: "BZL-CACHE — remote cache, BwoB, RBE readiness, cache trust boundary"
topic: bazel-caching-rbe
family: BZL-CACHE
model: opus
consolidates:
  - bazel-caching-rbe/action-keys-and-cache-hygiene.md
  - bazel-caching-rbe/bwob-eviction-and-cache-flags.md
  - bazel-caching-rbe/rbe-readiness-and-cache-trust-boundary.md
  - bazel-followups/cache-server-capabilities-repo-cache-gc-and-bes.md
  - bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md
  - bazel-measurements/exit-39-and-bwob-on-cache-only-build.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
  - bazel-measurements/action-key-path-sensitivity-and-execlog.md
  - bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md
  - bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md
grounded_in:
  - bazel-frame.md (body + all seven Corrections blocks; the Measurement wave wins over every earlier block)
  - bazel-topic-map.md ("How to read this", "Conflicts resolved" 1-18, "The map" § D, "Selected for wave 2" § Group 3)
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/fleet-bazel-readiness.md
  - bazel-flags-and-versions.md (BZL-FLAG-11 — the general rc-file form of BZL-CACHE-23)
date: 2026-09-05
revised: 2026-09-06
revised_wave5: 2026-09-06
---

# BZL-CACHE

## Verdict

1. **Build without the Bytes is not a feature to turn on, and the topic is
   eviction, not enablement.** `--remote_download_outputs` has defaulted to
   `toplevel` since Bazel 7 (Dec 2023), and the three alias flags each expand to
   exactly that one flag since the same refactor
   ([bwob-eviction-and-cache-flags.md:56-74](bazel-caching-rbe/bwob-eviction-and-cache-flags.md)).
   Re-measured 2026-09-06 against the three real binaries: `default: "toplevel"`
   on 8.7.0, 8.8.0 and 9.2.0, with all three aliases and `--remote_download_regex`
   present in `bazel help build --long` on each. Every rule that would have said
   "enable BwoB" is instead a rule about the download *role* (BZL-CACHE-11) and
   the eviction path (BZL-CACHE-12/13/14). This upholds and sharpens map
   Conflict 5.

2. **Remote execution is a shape decision taken before any flag, and this
   project ships RBE guidance for shape F only.** The four `remote/rules`
   constraints are correctness requirements quoted verbatim, not tuning advice
   ([rbe-readiness-and-cache-trust-boundary.md:57-64](bazel-caching-rbe/rbe-readiness-and-cache-trust-boundary.md)),
   and a design whose own outputs reference their build-time location on the
   building machine fails gate step 1 by construction. The gate (BZL-CACHE-06,
   BZL-CACHE-07) generalises past the nixpkgs model that produced it. Consistent
   with map Conflict 10.

3. **Correction to the map: the `rules_ocx` README citation has drifted.** The
   map and `ci` §4 cite `README.md:246-249` for the "remote execution is a
   non-goal" passage; measured 2026-09-05 it is `README.md:266-270`, content
   unchanged
   ([rbe-readiness-and-cache-trust-boundary.md:76-81](bazel-caching-rbe/rbe-readiness-and-cache-trust-boundary.md),
   re-measured independently here). Cite the number you measure — map Conflict
   13's own lesson.

4. **Correction reversed: both "phantom" flags are real on Bazel 8, and were
   removed at 9.0.0.** This file's own earlier Verdict said
   `--experimental_remote_merkle_tree_cache` had "never existed" and
   `--incompatible_remote_use_new_exit_code_for_lost_inputs` was "deleted
   2025-02". Both are wrong as written. Measured against `bazel help build
   --long` on the real binaries, twice independently
   ([flag-defaults-and-trivial-builds-across-versions.md:68-69](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md);
   [exit-39-and-bwob-on-cache-only-build.md:284-290](bazel-measurements/exit-39-and-bwob-on-cache-only-build.md))
   and re-measured here 2026-09-06:

   | Flag | 8.7.0 | 8.8.0 | 9.2.0 |
   |---|---|---|---|
   | `--experimental_remote_merkle_tree_cache` | present, default `false` | present, default `false` | **absent** |
   | `--incompatible_remote_use_new_exit_code_for_lost_inputs` | present, default `true` | present, default `true` | **absent** |
   | `--rewind_lost_inputs` | present, default `false`, `UNDOCUMENTED` | present, default `false`, `UNDOCUMENTED` | present, default `false`, documented |
   | `--experimental_remote_discard_merkle_trees` | `true` | `true` | `true` |

   **The `--rewind_lost_inputs` row is corrected from "absent/absent/present".**
   That reading came from `bazel help build --long`, which renders nothing for a
   flag whose `documentationCategory` is `UNDOCUMENTED`. Read at source on the
   tags themselves, `BuildRequestOptions.java` carries the option at 8.7.0, 8.8.0,
   9.0.0 and 9.1.0 with `UNDOCUMENTED`, flipping to `REMOTE` only at 9.2.0, and
   `bazel build --rewind_lost_inputs //…` **succeeds on a real 8.7.0 binary**
   ([bcr-playbook-flag-archaeology-rewind-and-js-gaps.md](bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md)
   §3). Every other row in this table is a `help build --long` reading and stands;
   the lesson the row carries is BZL-CACHE-23's, extended: a zero-hit help grep is
   the stop signal, and for a flag suspected to exist it must be checked against
   the tag's own `@Option` source, not only the rendered help.

   The correct statement everywhere is **"removed at 9.0.0"**, never "never
   existed" and never a bare "deleted". Two consequences. First, the flags parse
   on the fleet's own pin, so a `.bazelrc` line carrying either is dead
   configuration on 8.x and a hard `unrecognized option` failure on the 9.x leg
   of the same matrix — a version-split failure, not a uniform one. Second, the
   two removals are **two unrelated commits eight months apart**, not the one PR
   this file cited.
   [`91b1e8e2`](https://github.com/bazelbuild/bazel/commit/91b1e8e28afc7f76ed5930b469b23fd13303eda3)
   (2025-02-20) deleted `--incompatible_remote_use_new_exit_code_for_lost_inputs`,
   closing [#25334](https://github.com/bazelbuild/bazel/pull/25334) unmerged
   because Google's internal sync landed the identical change the same day;
   [`30ca50950f`](https://github.com/bazelbuild/bazel/commit/30ca50950fdaff032925efe64c2690a9f05e074d)
   (2025-10-14, "Rework the Merkle tree cache") deleted
   `--experimental_remote_merkle_tree_cache`(`_size`) as a **side effect** of a
   Merkle-tree construction rewrite, closing
   [#25650](https://github.com/bazelbuild/bazel/pull/25650) the same way. Neither
   touches the eviction-retry path. So a `CLOSED` / `mergedAt: null`
   `bazelbuild/bazel` PR is **not** evidence the change was rejected — that is
   the normal shape of a community PR superseded by the internal sync, and the
   real check is whether the named commit exists in the tagged tree. The 9.0.0
   release notes' "flags removed" appendix names the exit-code flag and **omits
   the Merkle-tree one** (its removal appears only as prose about a 30 % wall-time
   win), so that appendix alone does not enumerate a version's removed flags.
   Exit code 39 is still a plain registered `ExitCode` in `ExitCode.java` on both
   majors; on 8.x the 39-versus-34 choice is nominally still flag-gated
   (defaulted on), and only from 9.0.0 is it structurally unconditional
   ([diagnosis-procedures-profiling-and-execlog-tooling.md:165](bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md)).
   BZL-CACHE-23 carries the discipline this failure demands, now extended to
   citations as well as flag names.

5. **Correction to a correction: the exit-39 *mechanism* is confirmed on a
   cache-only build; the exit *code* is not.** The lost-input condition fires
   exactly as this file described it — a `toplevel` (or `minimal`) cache hit
   leaves non-top-level outputs as CAS references, and a later locally-executing
   action that needs one hits an evicted blob — reproduced on 8.7.0 and 9.2.0
   across five configurations with no `--remote_executor` anywhere
   ([exit-39-and-bwob-on-cache-only-build.md:169-224](bazel-measurements/exit-39-and-bwob-on-cache-only-build.md)).
   **Bare exit 39 never reached the caller in ten build invocations.** With the
   default retry budget (5) Bazel prints `Found transient remote cache error,
   retrying the build...`, re-runs under a fresh invocation ID, re-executes the
   lost action locally, and exits **0**. With
   `--experimental_remote_cache_eviction_retries=0` it exits **1** with a generic
   `Target //… failed to build` — indistinguishable from a compile error. Even
   with `--rewind_lost_inputs` on, the outer code is 1: re-measured on 9.2.0
   under a second, different eviction shape, `retries=0` plus rewind engages
   Skyframe rewinding genuinely (a `[Sched]` re-attempt line is printed) and then
   exhausts a **hard-coded** ceiling — `MAX_REPEATED_LOST_INPUTS = 20` in
   `ActionRewindStrategy.java`, byte-identical at 8.7.0 through 9.2.0, failing on
   the 21st loss, which is why the text reads `lost input too many times (#21)`
   and never `#20`. With `retries=0`, **neither** rewind setting recovers the
   evicted, never-materialised upstream intermediate under the default `toplevel`
   BwoB — both exit 1. Rewind together with the *default* retry budget of 5 is
   untested and ships as a documented gap (Verdict 18f).
   BZL-CACHE-12 is rewritten around the mechanism, the retry default and the
   observable error text. **Caveat: remote execution (shape F) was not
   measured** — no `--remote_executor` was available on this host, and output
   verification after a remotely-executed action may route through different
   code than the local-genrule path this reproduction used exclusively.

6. **Salt is documented, never recommended.** No CLI flag and no Starlark
   parameter sets `Action.salt`; Bazel derives it from the spawn's
   `no-remote-exec`/`no-remote`/`no-remote-cache` tag state, the workspace name,
   and an optional scrub config, read directly from `RemoteExecutionService.
   buildSalt()`
   ([action-keys-and-cache-hygiene.md:96-114](bazel-caching-rbe/action-keys-and-cache-hygiene.md)).
   BZL-CACHE-22 exists as a "do not invent this" guardrail plus the one real
   consequence: a full cache miss right after such a tag edit is expected
   behaviour. `--experimental_remote_scrubbing_config` is likewise not
   recommended proactively.

7. **TTL tuning is proactive but narrow, and the famous workaround is now
   wrong — with its supporting citation demoted.** The BuildBuddy 1.8 MB →
   640 MB measurement was a real bug in the TTL-trust path for long-lived JVMs,
   and BuildBuddy's own dated `.bazelrc` comment ("Not needed after Bazel 8.2.0")
   plus their postmortem name **8.2.0 / 7.6.0** as the shipping versions
   ([bwob-eviction-and-cache-flags.md:92-123](bazel-caching-rbe/bwob-eviction-and-cache-flags.md)).
   [#25398](https://github.com/bazelbuild/bazel/pull/25398), cited here as the
   upstream proof, is `CLOSED` with `mergedAt: null` — it is the proposal, not
   the landed change, so the vendor's dated account is the only evidence for the
   floor, not an independent second source. `rules_ocx` pins 8.7.0, past it
   either way. Copying `--experimental_remote_cache_ttl=10000d` onto a current
   pin causes the *opposite* failure — trusting a TTL an LRU-evicting server does
   not honour. BZL-CACHE-13 states the target as "at most the server's real
   advertised minimum", not "large". Default measured `3h` on 8.7.0, 8.8.0 and
   9.2.0.

8. **The `--credential_helper` decision gains a clause the owner's decision did
   not have.** Frame Corrections, decision row 6, pins MUST for a new setup and
   SHOULD for an existing one. This holds.
   [#30439](https://github.com/bazelbuild/bazel/issues/30439) (filed 2026-07-23,
   closed 2026-08-11 by Google's own OSS VRP panel as *intended behaviour*)
   shows Bazel executes a `%workspace%`-relative helper from a **committed**
   `.bazelrc` with the full client environment, before the sandbox, on a
   read-only `bazel query //...`
   ([rbe-readiness-and-cache-trust-boundary.md:92-98](bazel-caching-rbe/rbe-readiness-and-cache-trust-boundary.md)).
   A naive migration trades a leaked token for arbitrary code execution on
   clone. BZL-CACHE-04 is therefore MUST and permanent, not a stopgap. This is a
   GitHub *issue*, not a PR — the closed-unmerged check in Verdict 4 does not
   apply to it.

9. **Security-boundary rules keep MUST even though their sources are
   argued-class.** The house standard sends argued/asserted-only rules to
   CONSIDER. The cache-poisoning rules (BZL-CACHE-01, -02) rest on a maintainer's
   own mitigation statement in
   [#4276](https://github.com/bazelbuild/bazel/issues/4276) plus an independently
   reproduced attack in the bazel-discuss thread — a demonstrated exploit with a
   named mitigation, which this project treats as measured, not argued. Stated
   here so the exception is visible rather than accidental.

10. **Correction to this file's own escalation: `--incompatible_strict_action_env`
    defaults FALSE on Bazel 8.** The earlier Verdict escalated BZL-CACHE-19 to
    MUST on the stated ground that the flag "defaults **true** in the current
    reference". Measured on the binaries — twice independently, and confirmed at
    runtime by capturing a sandboxed action's environment — the default is
    **`false` on 8.7.0 and 8.8.0** and **`true` on 9.2.0**
    ([flag-defaults-and-trivial-builds-across-versions.md:57](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md);
    [action-key-path-sensitivity-and-execlog.md:108-137](bazel-measurements/action-key-path-sensitivity-and-execlog.md)),
    matching frame Wave-2 correction 2. The MUST **stands**, for a sharper
    reason: on an 8.x pin `--noincompatible_strict_action_env` looks like a
    no-op (it re-asserts the current default) while silently pinning the
    permissive behaviour across a 9.x bump; on 9.x it actively reintroduces the
    cache-key-invisible class. A second measured nuance the dives did not have:
    non-strict mode is a **named allowlist** (`PATH`, `LD_LIBRARY_PATH` and
    similar), not a full client-environment passthrough — an arbitrary exported
    variable did not reach the action even under permissive 8.7.0. `HOME` is
    unset in the action environment on both majors.

11. **The three dives agreed with each other; the follow-up round and the
    measurements did not agree with the consolidation.** Where two dives settled
    the same M-ID (M-D-20, the phantom flag) they reached the same conclusion
    from independent fetches, and where two saw `--remote_timeout=60` matching
    the documented default they wrote the same rule twice, merged here into
    BZL-CACHE-29. The conflicts that actually mattered came later and all point
    the same way — **fetched documentation lost to a run of the binary** on the
    exit code (Verdict 5), the cache-outage behaviour (BZL-CACHE-26), the two
    "phantom" flags (Verdict 4), `--incompatible_strict_action_env` (Verdict 10)
    and `--experimental_remote_cache_chunking_function` (Verdict 12). Four
    contradictions in one family, all resolved toward the measurement.

12. **Version boundaries the ruleset depends on**, re-measured 2026-09-06 on
    8.7.0, 8.8.0 and 9.2.0 unless dated otherwise. Bazel **7.0**: BwoB default
    flip to `toplevel`, exit 39 introduced, `--credential_helper` declared
    stable. **7.4**: disk-cache GC flags exist (measured still `"0"` = unbounded
    on all three current versions). **7.6.0 / 8.2.0**: the TTL-expiry
    re-download fix, per BuildBuddy's dated account (see Verdict 7).
    **8.0.0**: `--experimental_remote_cache_eviction_retries` default 0 → 5
    (measured `5` on all three). **`--experimental_remote_cache_chunking` has no
    floor inside the measured range**: present with byte-identical help text and
    `default: "false"` on 8.7.0, 8.8.0 *and* 9.2.0, so it predates 8.8.0 and
    8.7.0 is merely the oldest binary probed. The earlier "8.7.0 / 9.1.0 floor"
    is withdrawn; a pin older than 8.7.0 must re-derive it per BZL-CACHE-23.
    **9.0.0**: `--experimental_remote_merkle_tree_cache` and
    `--incompatible_remote_use_new_exit_code_for_lost_inputs` removed;
    `--incompatible_strict_action_env` flips to `true`; WORKSPACE support code
    deleted, which makes every
    `rbe_autoconfig`-shaped RBE setup snippet impossible, including the one on
    Bazel's own `remote/ci` page. **Corrected**: the earlier claim that
    "**8.8.0**: explicit `rep_max_cdc` selection" shipped is contradicted —
    `--experimental_remote_cache_chunking_function` returns **zero hits** in
    `bazel help build --long` on 8.7.0, 8.8.0 *and* 9.2.0, and the base flag's
    own help text names FastCDC 2020 as the only algorithm. BZL-CACHE-28 drops
    the clause, and **the "where did it land" question is now closed: nowhere.**
    [#30585](https://github.com/bazelbuild/bazel/pull/30585) targeted
    `release-8.8.0` and is closed, `merged: false`, zero comments, and
    `GrpcCacheClient.java` hardcodes `ChunkingFunction.Value.FAST_CDC_2020` at
    every call site at both the 8.8.0 and 9.0.0 tags — read at source, not only
    grepped from help output. Treat any `rep_max_cdc` reference as aspirational
    through 9.2.0. `--repo_contents_cache_gc_max_age`
    (`14d`) and `--repo_contents_cache_gc_idle_delay` (`5m`) are present on all
    three; `--repo_contents_cache_gc_max_size` does not exist on any. No rule in
    this family is ruleset-versioned — rules_js 3.4.1, rules_python 2.3.3 and
    rules_rust 0.74.0 do not change any claim here.

13. **What this family does not own.** Repository-rule and sandbox hermeticity
    mechanics belong to `BZL-HERM` (BZL-CACHE-07 and BZL-CACHE-34 gate on those
    checks' results rather than re-deriving them); CI lane and job design belongs
    to `BZL-CI` (M-D-14 and M-F-07 are the same question, and BZL-CACHE-27 is
    deliberately CONSIDER here); the `no-remote-cache` vs `no-remote-cache-upload`
    tag distinction belongs to `BZL-TEST` (M-E-09) and is now measured at the
    wire level there — `no-remote-cache-upload` suppresses only the `PUT /ac/`
    (the result mapping) while the action's own `PUT /cas/` content upload still
    fires, and against a `--disk_cache` alone the tag is indistinguishable from
    the default, so this family must never cite a disk-cache or execution-log
    `cacheable`/`remotable` reading as evidence about it (BZL-TEST-08; `external`
    is test-only and likewise BZL-TEST-08's). Two additions from the
    follow-up round. **Diagnostic procedures belong to `bazel-diagnose`**: that
    skill carries the three decision trees, the per-cache one-command
    discriminators and the profiling flag set
    ([diagnosis-procedures-profiling-and-execlog-tooling.md](bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md)
    §Q3, §Q4); BZL-CACHE-15 and -16 cite them and must not restate them.
    **BES splits by nature, not convenience**: the credential/TLS-sharing hazard
    is a trust-boundary rule and stays here (BZL-CACHE-33, next to -02/-03/-04);
    `--bes_upload_mode` per lane, the BEP fields a dashboard may chart, and the
    `--remote_build_event_upload=minimal` `bytestream://` trap are forward-
    declared for `BZL-CI` as NEW-CI-1/2/3 and are **not** claimed by this file.

14. **Cache-server capability advertisement is a compile-time constant in every
    surveyed server, and the ecosystem is split down the middle.** Five servers
    read at source: `buchgr/bazel-remote` (`ALLOWED`, `[SHA256]` only) and
    BuildBuddy OSS (`ALLOWED`, five digest functions) ship permissive;
    Buildfarm and NativeLink ship `DISALLOWED`; Buildbarn's frontend sets
    neither field in any code path reviewed, which resolves client-side to the
    same "not allowed" outcome as `DISALLOWED`. Bazel's own reference
    `remote_worker` also hardcodes `DISALLOWED`. **None exposes a configuration
    knob for either field**, and EngFlow documents neither publicly
    ([cache-server-capabilities-repo-cache-gc-and-bes.md:80-93](bazel-followups/cache-server-capabilities-repo-cache-gc-and-bes.md)).
    The client has no assertion flag —
    `--remote_symlink_absolute_path_strategy` does not exist, zero hits in a
    fetch of the current reference and zero in `bazel help build --long` on all
    three binaries. The enforcement point is
    `UploadManifest.checkAbsoluteSymlinkAllowed`: an action whose output is an
    absolute symlink throws `IOException: Spawn output … is an absolute symbolic
    link to …, which is not allowed by the remote cache` at **upload** time,
    after local execution succeeded, with nothing on the client able to override
    it. BZL-CACHE-24 absorbs the survey; BZL-CACHE-31 carries the client-side
    behaviour. This settles M-D-19 fully.

15. **Repository-cache GC has an open, stalled upstream issue, and the pruning
    primitive is `mtime`, not `atime`.**
    [#22516](https://github.com/bazelbuild/bazel/issues/22516) (filed 2024-05-23,
    P2, `team-Performance`) is still open with **zero comments and no
    milestone** two years on, and cites the disk cache's
    [#5139](https://github.com/bazelbuild/bazel/issues/5139) — which shipped at
    7.4 — as its design precedent. Bazel's own user guide states the classic
    repository cache "is never cleaned up automatically" *and* that "upon each
    cache hit, the modification time of the file in the cache is updated", so a
    `find -atime` sweep is measuring the wrong timestamp on a filesystem most CI
    images mount `relatime`. The newer **repo contents cache** is a different
    feature with real, shipped GC: `--repo_contents_cache_gc_max_age` (`14d`) and
    `--repo_contents_cache_gc_idle_delay` (`5m`), measured present on 8.7.0,
    8.8.0 and 9.2.0, with **no size cap** — an asymmetry from `--disk_cache`,
    which has both. BZL-CACHE-17 gains the scoping clause; BZL-CACHE-32 carries
    the pruning pattern. This settles M-D-16's repository-cache half.

16. **BES shares one credential and one TLS stack with the cache and executor
    endpoints, by Bazel's own statement.** `bazel.build/remote/bep`, verbatim:
    "the Build Event Service and Remote Execution Endpoints need to share the
    same authentication and TLS infrastructure." Nothing in the client
    distinguishes a BES credential from a cache credential at resolution time —
    they route through the same `--credential_helper` and the same gRPC TLS
    stack. A rotation that updates one surface and not the other breaks it
    silently. This was a footnote in a dive
    ([rbe-readiness-and-cache-trust-boundary.md:204](bazel-caching-rbe/rbe-readiness-and-cache-trust-boundary.md));
    it ships as BZL-CACHE-33.

17. **An action key does not depend on the workspace's absolute path, and the
    execution log cannot see output non-determinism.** Measured on 8.7.0 and
    9.2.0: a `--disk_cache` warmed at one checkout path served every genrule
    action at a second checkout at a different absolute path, with the compact
    log's `digest` field byte-identical
    ([action-key-path-sensitivity-and-execlog.md:46-107](bazel-measurements/action-key-path-sensitivity-and-execlog.md)).
    `$(location)`/`$(execpath)` resolve to exec-root-relative strings at analysis
    time; what varies across checkouts is the sandbox's own exec root, reachable
    only by an action reading `$PWD` at run time. The cache-hit content is
    served stale and verbatim — the second checkout's output literally contained
    the first checkout's `output_base` hash. Two consequences ship as rules.
    BZL-CACHE-34: a shared cache is not checkout-scoped, so an action that reads
    ambient state distributes that state to every consumer. BZL-CACHE-16 gains
    the scope boundary it lacked: `commandArgs`, `inputs[].digest` and
    `environmentVariables` were byte-identical across two runs whose outputs'
    `sha256sum` differed — the log answers "did the declared inputs change", never
    "did the output change", and `--explain` reported `no entry in the cache
    (action is new)` on a confirmed disk-cache hit, so it must not be used for
    this diagnosis at all. Caveat: genrule-shaped actions with native
    `$(location)` substitution only; a custom action that shells `pwd` into a
    tool *argument* was not tested.

18. **Documented gaps — settled as far as the evidence goes, not open
    questions.** (a) **No first-hand benefit-side benchmark for
    `--remote_cache_compression` exists.** BuildBuddy's blog, EngFlow's blog and
    `blog.bazel.build` were each checked directly and none publishes one; the
    only first-hand numbers anywhere are cost-side, in
    [#18997](https://github.com/bazelbuild/bazel/issues/18997) — a public,
    reproducible repro measuring 3-5× JVM heap use, plus a maintainer's own
    `2 B → 15 B` (750 %) zstd inflation on a tiny file, which is the mechanism
    behind the 100-byte threshold default. The one positive statement
    ([#17990](https://github.com/bazelbuild/bazel/pull/17990)) is an unquantified
    production assertion. BZL-CACHE-30 stays CONSIDER with better evidence, not
    with none. (b) **No Bazel mechanism turns a cache outage into a build
    failure on a cache-only shape** — see BZL-CACHE-26; if a lane must fail, the
    mechanism has to live outside Bazel. (c) **EngFlow's advertised capabilities
    and Buildbarn's scheduler side are unknown**, settleable only with a live
    cluster or a support conversation. (d) **Repository-cache GC has no dated
    upstream commitment**, so "do not expect one" is the durable statement.
    (e) **RETRACTED — the `Expect: 100-continue` half of the fixture note was
    fixture-side, not a Bazel behaviour.** This file previously stated that a
    minimal HTTP cache fixture "must acknowledge `Expect: 100-continue`" or every
    PUT registers as `UploadTimeoutException`. Bazel never sends that header:
    `HttpCacheClient`'s own class Javadoc says uploads "do not use
    `Expect: 100-CONTINUE` headers", unchanged 8.7.0 → 9.2.0, and
    `HttpUploadHandler.buildRequest()` sets `HOST`, `ACCEPT`, `CONTENT_LENGTH`
    and `CONNECTION` and nothing named `Expect` (Netty adds it only on an
    explicit `HttpUtil.set100ContinueExpected`). The `Content-Length: 0` half is
    a real HTTP/1.1 keep-alive mechanic but is **not** something a real backend
    needs handling for: `buchgr/bazel-remote`'s successful-PUT path never calls
    `WriteHeader` or sets the header, and Go's `net/http` supplies it
    automatically for a handler that writes no body. Both halves were artefacts
    of building the fixture on Python's `BaseHTTPRequestHandler`, which does
    neither for free. No rule ever carried this; the retraction is recorded so
    `bazel-diagnose`'s throwaway-cache guidance does not inherit it. (f) **Rewind
    together with the default retry budget** — `--rewind_lost_inputs=true` with
    `--experimental_remote_cache_eviction_retries` left at `5` was never
    exercised; only the two extremes (`retries=0`, rewind off and on, both exit
    1) were measured, so whether the two layers compose usefully inside one
    invocation is open. (g) **The commit introducing
    `--experimental_max_repeated_lost_inputs`** — the tunable exists on `main`
    (`defaultValue = "20"`) and not at the `9.2.0` tag; which commit added it, and
    which release will carry it, is unidentified. (h) **The runtime effect of
    `--experimental_remote_cache_chunking`** — no server in this corpus advertises
    `SplitBlob`/`SpliceBlob`, so only the flag's existence and default are
    measured, never its behaviour against a capable backend.

## The ruleset

**This topic owns `BZL-CACHE` exclusively.** Thirty-four rules, 22 MUST. Rows are
grouped by the check that catches them: the four trust-boundary rules share one
`grep` over rc and workflow files; the three flag-surface rules share one pass
against the pinned version's own `bazel help build --long`; the four action-key
rules share one execution-log run. **pinned** marks a rule that fixes a project
decision rather than deriving a fact.

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| **BZL-CACHE-01** | Every CI lane that untrusted content can trigger (any pull request, fork or same-repo) runs the cache read-only, with the write credential **absent from that lane's environment**, not merely unused. | A write-capable untrusted lane can plant a backdoored tool that a later trusted build downloads and executes instead of compiling ([#4276](https://github.com/bazelbuild/bazel/issues/4276); reproduced in the bazel-discuss thread). | Confirm the credential is gated on an event untrusted contributors cannot trigger (e.g. `github.event_name == 'push'`), and that `--remote_upload_local_results=false` is in the effective flags of every other path. EMPTY `grep -n 'remote_upload_local_results=false'` scoped to the PR lane = **finding** (that lane can write). Where the cache server's own request log is reachable, the positive signal is measured: `--remote_upload_local_results=false` produced **zero `PUT` lines** and only `GET /ac/… 404` lookups against a real HTTP endpoint, and `--remote_accept_cached=false` produced zero `GET /ac/` lines while still uploading. | MUST | Bazel all (measured 8.7.0, 9.2.0); shapes A, F | M-D-04 |
| **BZL-CACHE-02** | Write access to the Action Cache is strictly narrower than read access — never symmetric, and never held by a developer machine's default config. | Read being public is not the vulnerability; write being as available as read is. The mitigation a Bazel maintainer names as actually working is "only the execution system writes the AC entry, after the action succeeded". | Named reading heuristic — enumerate every actor that could plausibly hold the write credential (each CI role, the documented developer setup, any alternate path). More than one un-gated actor = finding. An empty enumeration means you have not looked, not that you passed. | MUST | Bazel all; shapes A, F | M-D-04 |
| **BZL-CACHE-03** | Carry a cache-write credential through `--credential_helper`, never a bare `--remote_header=authorization=…` or any static bearer token in an rc file — gitignored or not. For an existing setup on a bare token, name a tracked migration item instead of treating the token as permanent. | A static token is long-lived, unscoped, readable by anything that reads the file, and visible in process argv; `--credential_helper` has been stable since Bazel 7.0 (`CHANGELOG.md` at tag `7.0.0`, "#18752") and is present on 8.7.0, 8.8.0 and 9.2.0. Migration costs a live secret rotation, which is why an existing setup gets SHOULD. **pinned** — frame Corrections, owner decision row 6. | `grep -n 'remote_header' *.bazelrc*` — a match on a **new** setup is the finding; on an existing one, the finding is the *absence* of a tracked migration item in the repo's own docs or tracker. EMPTY = pass. Pair it with BZL-CACHE-33's `bes_backend` term in the same pass. | MUST (new) / SHOULD (existing) | Bazel 7.0+; shapes A, F | M-D-03 |
| **BZL-CACHE-04** | Configure `--credential_helper` only from an rc file that does not ship with the repository — never a committed `.bazelrc`, and never a `%workspace%`-relative helper path. | Bazel resolves and spawns the helper with the full client environment, before the sandbox, with **no check on where the flag came from** — exploitable on a fresh clone by a plain `bazel query //...`, confirmed on Bazel 9.2.0 and closed as intended behaviour ([#30439](https://github.com/bazelbuild/bazel/issues/30439)). This is a permanent property, not a bug awaiting a patch. | `grep -n 'credential_helper' $(git ls-files \| grep -E '\.bazelrc')` — any match in a tracked file is the finding. EMPTY = pass. | MUST | Bazel all (flag 7.0+); shapes A, F | M-D-03 |
| **BZL-CACHE-05** | If a cache is ever made reachable without authentication for reads, track that as a risk distinct from write-poisoning. | Anonymous reads disclose build inputs and outputs — a different harm from a poisoned write, and easy to wave away once writes are locked down. | Attempt an unauthenticated read against the deployed endpoint from outside the trusted network. A `200` with content = finding. EMPTY (connection refused / 401) = pass. | CONSIDER | Bazel all; shapes A, F | M-D-05 (partial) |
| **BZL-CACHE-06** | Before proposing `--remote_executor` for any repo, check whether any generated launcher, wrapper or action output embeds a hardcoded absolute path rooted outside the workspace (a package-manager store, `$HOME`, a machine-specific install prefix). | An RE worker never ran the provisioning step that populated that path; the action either cannot find it or picks up another tenant's content. No flag closes this — the fix is architectural. | First filter: `grep -rn '"/home/\|"/Users/\|\$HOME\|/opt/' <generator .bzl files>`. Then read every `.bzl` site that emits launcher or wrapper *content* — string concatenation defeats the grep. EMPTY grep = **inconclusive, not pass**; the manual read is mandatory. | MUST | Bazel all; shapes A, F | M-D-12 |
| **BZL-CACHE-07** | Run the RE-readiness gate in order and stop at the first failure, before any `--remote_executor` flag: (1) BZL-CACHE-06's absolute-path check; (2) every tool resolved through a declared toolchain or a `File` input, never the invoking shell's `PATH`/`JAVA_HOME`; (3) no repository rule or action reachable by an RE-bound target creates files outside the Bazel-managed tree or sets persistent environment variables; (4) no checked-in build-tool binary is used unconditionally across execution platforms; (5) a sandbox-clean build passes. | All four constraints are stated by `remote/rules` as correctness requirements — a violation does not produce a slower RE build, it produces one that fails on a worker lacking the ambient state the local machine supplied. Sandboxing "mimics the behavior of remote execution", which makes step 5 the cheapest necessary (not sufficient) precondition. | Step 2: read every `ctx.actions.run`/`run_shell` `executable=`; a bare string literal not sourced from an attr or a registered toolchain is a finding. Step 3: cross-reference `BZL-HERM`'s non-hermetic-operation check (`--experimental_workspace_rules_log_file`) — a clean report there passes this step; this rule does not re-derive it. Step 4: confirm a platform constraint or toolchain selects the matching binary per platform. Step 5: `bazel test //... --spawn_strategy=sandboxed` all green. EMPTY finding list on 2 and 4 = pass; a red step 5 = fix before RE, not after. | MUST | Bazel all; shape F | M-D-13 |
| **BZL-CACHE-08** | Never enable dynamic execution (`--dynamic_local_strategy`/`--dynamic_remote_strategy`) against a deployment that configures only `--remote_cache` with no `--remote_executor`. | Bazel's own docs state a cache miss under a cache-only backend "would be considered a failed action" — the remote branch of the race has nothing to race against. Structural, not an implementation gap. | `grep -n 'dynamic_local_strategy\|dynamic_remote_strategy' *.bazelrc*` non-empty **and** `grep -n 'remote_executor' *.bazelrc*` empty ⇒ finding. EMPTY on the first grep = pass. | MUST | Bazel all; shapes A, F | M-D-11 |
| **BZL-CACHE-09** | When the gate in BZL-CACHE-07 fails structurally, record the "no" in the repository's own docs rather than leaving it as tribal knowledge. | The alternative is someone later spending a debugging session rediscovering a known structural incompatibility, or an adoption guide copying the pattern that forecloses RE. | Named reading heuristic — `grep -rni 'remote execution\|RBE' README* docs/`; a design that fails gate step 1 with no such statement anywhere is the finding. EMPTY on a repo that *passes* the gate = pass. | SHOULD | Bazel all; shapes A, F | M-D-12 |
| **BZL-CACHE-10** | Never describe Build without the Bytes as something to enable, and never write "add `--remote_download_minimal` to turn on BwoB". | `--remote_download_outputs` has defaulted to `toplevel` since Bazel 7; guidance written against the pre-7 `all` default tells an adopter to add a flag that changes nothing. The three alias flags are void flags expanding to that one flag. Measured `default: "toplevel"` on 8.7.0, 8.8.0 and 9.2.0. | `bazel help build --long 2>&1 \| grep -A2 remote_download_outputs` against the pinned version and read the printed default. **`bazel help all --long` is not a real subcommand** (`ERROR: 'all' is not a known command`) — use `help build --long`, and `bazel help startup_options` for the startup surface, because a flag can live in either. EMPTY (flag not found) means a Bazel older than 0.25 — a much larger problem than stale guidance, not a pass. | MUST | Bazel 7, 8, 9; all shapes | M-D-06 |
| **BZL-CACHE-11** | Set the download mode per role, explicitly: a CI runner that never consumes build artifacts locally gets `--remote_download_minimal`; an interactive developer machine keeps the `toplevel` default; an IDE-feeding build gets `minimal` plus `--remote_download_regex` naming the consumed paths — never a blanket `--remote_download_all`. Treat "no `--remote_download_*` flag anywhere" as a decision to audit, not a neutral state. | Riding the major's default downloads every top-level target's outputs on a runner that reads none of them, and regressing to `all` to serve one IDE file reintroduces the exact bandwidth cost BwoB exists to avoid. Measured directly: under `toplevel`, three genrule actions all hit the remote AC and exactly one CAS blob was fetched — the top-level output — with the two intermediates never materialising on disk; under `minimal`, not even the top-level output materialises. **pinned** — the per-role table is this project's choice, sourced from the Bazel-7 blog's own usage table. | `grep -rn 'remote_download' *.bazelrc* .github/**/*.yml`. EMPTY output **is the finding** whenever `--remote_cache` is configured at all — it means every role inherits one undifferentiated default. A hit on `_all` with no comment justifying full-download intent is also a finding. Do **not** choose the mode for eviction safety: `minimal` and `toplevel` were measured to bite identically on an evicted intermediate (BZL-CACHE-12), and only `all` avoids it, incidentally, by pre-materialising everything. | SHOULD | Bazel 7, 8, 9 (regex flag ≥5; modes measured on 8.7.0, 9.2.0); shape F, and any shape A with a cache | M-D-06, M-D-09 |
| **BZL-CACHE-12** | Never key CI retry or alerting logic on exit code **39** for a cache-only build, and leave `--experimental_remote_cache_eviction_retries` at its default (5) — never set it to `0` in the belief that `--rewind_lost_inputs` covers the gap. Recognise a lost evicted input by its **error text**, not its exit code. | Measured on 8.7.0 and 9.2.0 across five configurations: the eviction condition fires reliably, but the caller sees exit **0** (Bazel retries the whole build under a fresh invocation ID and re-executes the lost action locally) or, with retries at `0`, a generic exit **1** — never 39. A wrapper matching on 39 never fires; setting retries to `0` converts a self-healing condition into a hard failure whose exit code is indistinguishable from a compile error. Re-measured on 9.2.0 under a second eviction shape, **rewinding does not rescue `retries=0`**: `--rewind_lost_inputs=true` engages Skyframe rewinding genuinely, then exhausts a hard-coded `MAX_REPEATED_LOST_INPUTS = 20` (byte-identical at 8.7.0 through 9.2.0; the 21st loss trips it, hence `#21`) and still exits 1. The two knobs are independent layers — rewind re-runs generating actions *within* one invocation, the retry budget re-enters at a fresh invocation ID — and only the second was ever observed to reach exit 0. | Three checks, one row: (a) `grep -rn '\b39\b' <CI harness retry/exit-code logic>` — a **hit** that treats 39 as the eviction signal is now the finding (inverted from this rule's earlier text); the durable signals are `lost inputs with digests:` and `Found transient remote cache error, retrying the build...`, plus `Unexpected lost inputs (pass --rewind_lost_inputs to enable recovery)`, `Lost inputs no longer available remotely:` and rewind's own ceiling text `lost input too many times (#21)`. (b) `grep -n 'experimental_remote_cache_eviction_retries' *.bazelrc*` — a hit with value `0` and no comment = finding; EMPTY = pass (default 5 in force, measured on all three versions). (c) `grep -n 'rewind_lost_inputs' *.bazelrc*` — a hit **alongside** `retries=0` is the finding; the flag is a supplement, never a substitute. Do **not** verify its availability with `bazel help build --long`: it is `documentationCategory=UNDOCUMENTED` and renders zero hits at 8.7.0, 8.8.0, 9.0.0 and 9.1.0 while `bazel build --rewind_lost_inputs //…` succeeds on a real 8.7.0 binary — probe it by *passing* it, or read `BuildRequestOptions.java` at the tag. **Caveat:** measured on WSL2 under `linux-sandbox` against an HTTP cache with no `--remote_executor`; shape F was not measured and may reach 39 through a different path, and rewind at the **default** retry budget of 5 was never exercised (Verdict 18f). | SHOULD | Bazel ≥7 (measured 8.7.0, 9.2.0; default 5 since 8.0.0; `--rewind_lost_inputs` present and functional from 8.7.0, documented only at 9.2.0); shapes A, F | M-D-08 |
| **BZL-CACHE-13** | Set `--experimental_remote_cache_ttl` to at most the deployed cache server's real advertised minimum blob TTL where that number is knowable, and never to a large static value (`10000d`) on a pin ≥8.2.0/≥7.6.0. | Leaving the 3h default when the server's real eviction window is shorter guarantees intermittent lost-input builds. The large-static workaround targeted a bug BuildBuddy's own dated `.bazelrc` comment marks "Not needed after Bazel 8.2.0"; on a current pin it instead makes Bazel trust a TTL an LRU-evicting server does not honour, producing the same failure from the other direction. The cited [#25398](https://github.com/bazelbuild/bazel/pull/25398) is **closed unmerged** — the vendor's dated account is the evidence for the floor, not that PR. | `grep -n 'experimental_remote_cache_ttl' *.bazelrc*`; a value ≥ roughly `30d` with `.bazelversion` ≥8.2.0/7.6.0 = finding. For the tuning half there is no command — read the cache server's own eviction/LRU config beside the flag. EMPTY (flag unset, `3h` default measured on 8.7.0/8.8.0/9.2.0) = pass **only** where the server's real TTL is unknown; where it is known and shorter than 3h, empty is the finding. | MUST (the large-static prohibition) / SHOULD (the tuning) | Bazel ≥7; pins ≥8.2.0/≥7.6.0 for the prohibition; shapes A, F | M-D-07 |
| **BZL-CACHE-14** | Enable `--experimental_remote_cache_lease_extension` for any long-lived Bazel server process — a snapshot/restore CI product, a developer box that never runs `bazel shutdown`. | Without it a JVM kept alive across many invocations hits TTL expiry repeatedly, each time paying a re-download rather than a lease refresh. Its cost (a periodic `FindMissingBlobs` over every referenced blob) is why it is not a blanket default; measured `false` on 8.7.0, 8.8.0 and 9.2.0. | `grep -n 'experimental_remote_cache_lease_extension' *.bazelrc*`. EMPTY on a known long-lived-server setup = finding; EMPTY elsewhere = pass. | SHOULD | Bazel ≥7; shape F | M-D-07 |
| **BZL-CACHE-15** | Before diagnosing any "why is this still slow / why did this rebuild", name which of the **seven** caches is implicated: in-memory Skyframe, repository cache, repo contents cache, output tree + local action cache, local disk cache, remote action cache + CAS, and remote execution (a compute path, not persistent state). Do not assume `--repository_cache` speeds up every repository rule. | Conflating two of them is the most common source of a wrong diagnosis. Only repo rules calling `rctx.download()`/`.download_and_extract()` benefit from the repository cache — Gazelle's `go_repository` and `container_pull` bypass it by default. The repo contents cache is a separate, newer mechanism with its own GC (BZL-CACHE-17) and its own version gate. | Use `bazel-diagnose`'s one-command discriminator per cache ([diagnosis-procedures-profiling-and-execlog-tooling.md](bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md) §Q3) rather than re-deriving them here; the capacity read is `du -sh $(bazel info repository_cache) $(bazel info output_base) <configured --disk_cache path>`. Two signals worth naming because they read backwards: a **persistent local action-cache hit is never written to the execution log at all** (`spawn.proto`'s own contract), so an action's *absence* from a fresh `--execution_log_compact_file` is the positive signal, not a bug; and the terminal status line never reports local cache hits. For the build-wide local-cache picture read the BEP's `ActionCacheStatistics` (`hits`/`misses`/`miss_details` by `MissReason`) — which measures the **local** cache only, never the remote one. EMPTY/equal `du` sizes = the symptom is not a cache-capacity problem, which is a routing answer, not a pass. | MUST | Bazel all (discriminators verified 8.7.0, 9.2.0); all shapes | M-D-15 |
| **BZL-CACHE-16** | Diagnose a specific action's cache-key instability from the execution log, never from the aggregate cache-hit line and never from `--explain`: build twice with `--execution_log_compact_file=<path>`, build `//src/tools/execlog:parser` from a `bazelbuild/bazel` source checkout, run it against **both** logs in one invocation with matched `--output_path`s, diff the two `.txt` files, and read the **first** divergent action. Run a **separate** two-run output-digest diff for output non-determinism — the execution log cannot see it. | The parser *reorders* the second log to match the first's action order (matching by first output) — it does not diff; a naive diff of raw logs is noise because action order is nondeterministic across runs. Every action downstream of the first divergence also shows as changed. Measured limits: `--explain` reported `no entry in the cache (action is new)` for actions that were confirmed disk-cache hits, because it reasons from the local action-cache layer only; and two runs whose `commandArgs`/`inputs[].digest`/`environmentVariables` were byte-identical produced different `sha256sum` outputs. Assumption named: this needs a Bazel **source checkout** and a local JDK; the parser ships in no release archive. | The sequence is the check; the same two-run recipe (and its two-machine variant) is documented upstream at `remote/cache-remote.md#compare-logs`, independently of this file. Strip `metrics.startTime`/`metrics.executionWallTime`/`metrics.totalTime` before diffing — always volatile, never signal; do **not** strip `actualOutputs[].digest`, which is real non-determinism. Tooling traps: `--restrict_to_runner` belongs to `execlog:parser`, `--sort` to `execlog:converter`; `--execution_log_sort` never applies to the compact format; `--execution_log_json_file` (the parser-free alternative) emits concatenated pretty-printed objects with no separator and no wrapping array, so only a `JSONDecoder().raw_decode()` loop parses it. Isolation flags: `--noremote_accept_cached`; `--build_event_text_file=<path>` then `grep -A2 'command_line_label: "canonical"'`. EMPTY diff = the two runs were execution-log-identical, i.e. a **pass on Bazel-side reproducibility** and a signal to investigate the server (eviction, `--remote_instance_name`, auth scope, write authorisation) — **not** proof there is no problem, and not proof the outputs match: run `bazel clean --expunge; bazel build //...; sha256sum bazel-out/<config>/bin/*` twice and diff those too. | MUST | Bazel 7, 8, 9 (measured 8.7.0, 9.2.0); shapes A, F | M-D-22 |
| **BZL-CACHE-17** | A `--disk_cache` set on Bazel ≥7.4 without `--experimental_disk_cache_gc_max_size` or `_max_age` is unbounded growth; below 7.4 treat `--disk_cache` as having no automated GC at all. The **classic `--repository_cache` has no automated pruning on any version**; the separate **repo contents cache does**, age-only. | Both disk-cache GC flags default to `"0"` (unbounded) *even on a version that supports them* — the feature is opt-in, not automatic-by-version (measured `0`/`0` on 8.7.0, 8.8.0, 9.2.0). Repository-cache GC is [#22516](https://github.com/bazelbuild/bazel/issues/22516), open with zero comments since 2024-05-23. The repo contents cache got its own GC in [#26080](https://github.com/bazelbuild/bazel/pull/26080): `--repo_contents_cache_gc_max_age` (`14d`) and `--repo_contents_cache_gc_idle_delay` (`5m`), both measured present on all three versions, with **no** `_gc_max_size` analog. | `grep -n 'disk_cache' *.bazelrc*` — `--disk_cache` present with neither GC flag nearby = finding; on a pin <7.4, any doc or comment claiming Bazel prunes it automatically = finding. Do not fold the two repository-shaped caches together: check which one the pin actually uses before asserting "no GC". EMPTY (no disk cache configured) = pass by absence, not by configuration. On-demand pruning: `src/tools/diskcache` in the Bazel source tree; for the classic repository cache, BZL-CACHE-32. | SHOULD | Bazel ≥7.4 for the disk flags; repo-contents flags measured 8.7.0+; shape F | M-D-16 (disk half) |
| **BZL-CACHE-18** | Never assume a host-resolved tool — a bare `/usr/bin`-style compiler, interpreter or linker invoked without a `File` from a declared toolchain or dependency — is covered by the cache key. | Bazel's own docs state it "does not track tools outside a workspace": swapping the host toolchain silently serves stale cached output rather than producing a miss. Confirmed by contrast in measurement: actions whose `tools=` traced to a declared `File` had keys exactly as stable as pure genrules, across two checkouts at different absolute paths — it is specifically the *undeclared*, PATH-resolved executable that escapes the key. Under REAPI ≥v2.3 the same class deepens — `arguments[0]` may be PATH-resolved, so two workers can run two different binaries under an *identical* Action digest. | `grep -rn 'ctx.actions.run\|ctx.actions.run_shell' --include='*.bzl' .`, then read each `executable=`: a bare string rather than a `File` from `ctx.executable.*` or a toolchain is the finding. EMPTY finding list (every executable traces to a declared `File`) = pass. | MUST | Bazel all (measured 8.7.0, 9.2.0); all shapes | M-D-01 |
| **BZL-CACHE-19** | Only environment variables declared via `--action_env` enter an action's digest — never add `--noincompatible_strict_action_env` to fix environment-related build flakiness. | The default is version-split, measured on the binaries and confirmed by capturing a sandboxed action's environment: **`false` on 8.7.0 and 8.8.0**, **`true` on 9.2.0**. So on an 8.x pin the negation looks like a no-op while silently pinning the permissive behaviour across a 9.x bump, and on 9.x it reintroduces the ambient, cache-key-invisible dependency class the flip exists to prevent. Non-strict mode is a **named allowlist** (`PATH`, `LD_LIBRARY_PATH`), not a full client-environment passthrough — an arbitrary exported variable did not reach the action even on permissive 8.7.0, and `HOME` is unset on both majors. The correct fix is a named, narrower `--action_env=SPECIFIC_VAR`. | `grep -rn 'noincompatible_strict_action_env\|incompatible_strict_action_env' *.bazelrc*`. EMPTY = pass on this rule, but on a matrix spanning both majors it means the two legs run **different** action environments with nothing announcing the split — route that to `BZL-HERM-01`/`BZL-FLAG`. Any `--no…` match is a finding requiring a named narrower `--action_env` instead. Re-read the default from the pinned binary per BZL-CACHE-23; do not carry it from this table. | MUST | Bazel 7, 8, 9 (default `false` ≤8.8.0, `true` ≥9.0.0, measured); all shapes | M-D-01 |
| **BZL-CACHE-20** | Never put a value that changes on every build — a raw timestamp, an unpinned `git describe` with a dirty flag, a random build ID — behind a `STABLE_`-prefixed workspace-status key. | `bazel-out/stable-status.txt` is **not** exempt from action invalidation, while `bazel-out/volatile-status.txt` is ("Bazel pretends that the volatile file never changes"). An unstable "stable" key busts the cache on every invocation while its name advertises the opposite. | Run the `--workspace_status_command` script twice in immediate succession and diff its `STABLE_`-prefixed output lines. EMPTY diff = pass (every stable key is actually stable); any differing `STABLE_` line is the defect. In Starlark: `ctx.info_file` is the **stable** file, `ctx.version_file` the volatile one. A sibling "looked stable, was not" mechanism with a different cause: the `linux-sandbox` instance slot number is not stable across invocations, so any action reading `$PWD` differs run to run — that one is BZL-CACHE-34's and BZL-HERM-10's, not this rule's. | MUST | Bazel all; all shapes with `--stamp`/`--workspace_status_command` | M-D-01 |
| **BZL-CACHE-21** | Code that hand-builds REAPI protos (a cache proxy, an RBE shim, a cache-warming script) sorts `Command.environment_variables` and `Command.output_paths` lexicographically by name/path, sorts a `Directory`'s files, directories and symlinks **each independently**, and sorts `Platform.properties` by name **then value**. | The spec makes all of these a MUST; an unsorted repeated field is self-inflicted cache-key instability — two functionally identical inputs hash to two digests and every downstream consumer sees a false miss. A name-only comparator on `Platform.properties` looks sorted and is spec-non-compliant the moment two properties share a name. Bazel's own client already does this correctly for standard rule authoring — this rule is for the narrower audience writing REAPI code. | Read the tool's serialisation code for an explicit `sorted(...)`/`.sort()` immediately before the `SerializeToString`/hash call, and check the comparator has a value tiebreaker. Absence of a sort call ahead of the digest computation is the defect. EMPTY (no hand-built protos in the repo) = the rule does not bind. | MUST (narrow audience) | REAPI v2, Bazel-version-independent; shape F | M-D-02 |
| **BZL-CACHE-22** | Do not attempt to set `Action.salt` via a flag or a rule attribute — no such knob exists. Document, rather than "fix", a full cache miss immediately following a `no-remote-exec`/`no-remote`/`no-remote-cache` tag change on a target. | `RemoteExecutionService.buildSalt()` derives salt entirely from the spawn's remote-executability bit (driven by those tags), the workspace name, and an optional scrub config. A tag edit therefore moves every one of the target's actions into a different cache namespace — the miss is expected behaviour, not a regression. Guidance suggesting a `salt=` parameter is fabricated. | `grep -c 'salt' <the CLI reference>` and the `ctx.actions.run`/`run_shell` signatures in the Rules API — EMPTY on both **confirms the absence**; it is not a defect to fix. For a suspicious miss, correlate with a recent tag change via `git blame` or `bazel query --output=build` on the target. | MUST (as a "do not invent this" guardrail) | Bazel 7, 8, 9; shapes A, F | M-D-01 |
| **BZL-CACHE-23** | Never carry a remote-cache flag name — or the version claim attached to it, or the PR cited as its source — forward from memory, a blog post or a prior research note. Re-derive the name and default from the pinned version's own `bazel help build --long` **and** `bazel help startup_options`, state the version it holds on, and confirm a cited PR actually merged. | This corpus carried three errors of exactly this shape. `--experimental_remote_merkle_tree_cache` was asserted to have "never existed" — it is present, default `false`, on 8.7.0 and 8.8.0. `--incompatible_remote_use_new_exit_code_for_lost_inputs` was asserted "deleted 2025-02" — present, default `true`, on the same two, removed only at 9.0.0. And [#25334](https://github.com/bazelbuild/bazel/pull/25334) and [#25398](https://github.com/bazelbuild/bazel/pull/25398), the two PRs this file cited for those changes, are both `CLOSED` with `mergedAt: null` — but that state resolves in **opposite directions**: #25334's change shipped anyway as commit [`91b1e8e2`](https://github.com/bazelbuild/bazel/commit/91b1e8e28afc7f76ed5930b469b23fd13303eda3) via Google's internal sync, while #25398's never landed at all. The other flag's removal was a different commit entirely ([`30ca50950f`](https://github.com/bazelbuild/bazel/commit/30ca50950fdaff032925efe64c2690a9f05e074d), eight months later), so one PR number must not be reused as the citation for two flags. A flag can also live only in the startup surface (`--experimental_remote_repo_contents_cache`, 8.8.0+), invisible to `help build --long`. Second confirmed rename in this family: `--experimental_remote_grpc_log` → `--remote_grpc_log`. The general rc-file form of this discipline is [BZL-FLAG-11](bazel-flags-and-versions.md); this row is its remote-cache instance and the two must not drift apart. | `bazel help build --long 2>&1 \| grep -i <term>` **and** `bazel help startup_options 2>&1 \| grep -i <term>` against every version in the matrix, not just the dev pin. Zero matches on both means the flag does not exist **on that version** — an EMPTY result is the **stop signal**, not a pass, and never a licence to write "never existed". For a citation: `gh pr view <n> -R bazelbuild/bazel --json state,mergedAt` is the **first** step, never the last. On `bazelbuild/bazel`, `mergedAt: null` does **not** mean the change was rejected — a community PR is routinely closed unmerged the same day Google's internal sync lands the identical commit — so the decisive check is whether a named commit exists in the tagged tree: `git log --oneline <old-tag>..<new-tag> -- <the option's own .java file>` on a clone, or read the `@Option` block at each tag. Zero such commit **and** `mergedAt: null` = the PR is a proposal and the claim needs a different source; a named commit = cite the commit, not the PR. And check the version's release notes are complete before trusting them: 9.0.0's "flags removed" appendix omits `--experimental_remote_merkle_tree_cache` entirely. | MUST (house rule) | Bazel all; all shapes | M-D-20 |
| **BZL-CACHE-24** | Before trusting any hermeticity or portability claim about a cache backend, read what its `GetCapabilities` response actually advertises — `symlink_absolute_path_strategy` and `digest_functions`. Treat both as fixed properties of that server binary and build, never as operator settings, and treat a mismatch across a backend migration as a silent 100 %-cold-cache event. | Both fields are hardcoded in every one of the five OSS servers read at source, with the ecosystem split: `buchgr/bazel-remote` (`ALLOWED`, `[SHA256]` only) and BuildBuddy OSS (`ALLOWED`, five digest functions) permissive; Buildfarm and NativeLink `DISALLOWED`; Buildbarn's frontend sets neither, which resolves client-side to "not allowed". Bazel's own reference worker also picks `DISALLOWED`. `ALLOWED` permits non-hermetic builds by spec. A digest-function mismatch between two backends produces two disjoint namespaces, not an error. | Read the deployed server's own capabilities-handler **source** (not Bazel's docs, which describe the client, and not a config reference — none of the five exposes a knob), or query the running server's Capabilities endpoint with a REAPI-aware client. A server that does not implement the endpoint reads as **unknown**, never as `DISALLOWED`. After a backend migration, a 100 %-cold build rather than partial degradation points at `digest_functions`, not at client misconfiguration. EngFlow publishes neither value — record it as unknown, not as a default. | MUST for anyone standing up, adopting or migrating a remote cache | REAPI v2, Bazel all; shapes A, F | M-D-19, touches M-D-18 |
| **BZL-CACHE-25** | A `--remote_cache`/`--remote_executor` URI pointing at an HTTP-only backend carries an explicit `http://`/`https://` scheme. | Both flags default to scheme `grpcs` when the URI carries none — verbatim from the pinned binaries' own help text on 8.7.0, 8.8.0 and 9.2.0: "If no schema is provided Bazel will default to grpcs." An unscoped URI against an HTTP-only server (bazel-remote's default mode) speaks the wrong protocol. | `grep -n 'remote_cache=\|remote_executor=' *.bazelrc* .github/**/*.yml` and confirm every match carries `://`. EMPTY (no bare-scheme matches) = pass. | SHOULD | Bazel all (measured 8.7.0, 8.8.0, 9.2.0); shapes A, F | M-D-18 (scheme half) |
| **BZL-CACHE-26** | Do not cite `--incompatible_remote_local_fallback_for_remote_cache` or `--remote_local_fallback` as governing what happens when a cache-only deployment's cache goes down — neither has any effect there. If a lane must **fail** on a cache outage rather than silently build locally, implement that outside Bazel and say so; if a silent local build is acceptable, state that too. | Measured on 8.7.0 and 9.2.0 with the cache endpoint refusing connections: all four combinations of the two fallback flags produced the **identical** outcome — `WARNING: Remote Cache: Connection refused`, every action executed locally, **exit 0**. The mechanism is structural: with no `--remote_executor` there is no remote execution to fall back *from*, so cache connectivity is an optional accelerant whose loss is inherently non-fatal. This contradicts this file's earlier rationale ("an unavailable cache is a hard build failure"). No Bazel flag converts an outage into a failure on this shape — that is a documented gap, and a lane that must fail needs a pre-flight reachability probe or a wrapper that fails on `WARNING: Remote Cache:` / `errors during bulk transfer` in the build log. | Two checks. (a) `grep -rn 'incompatible_remote_local_fallback_for_remote_cache\|remote_local_fallback' *.bazelrc* .github/` on a repo with `--remote_cache` and no `--remote_executor` — any **hit** is the finding (dead configuration presented as an outage policy); EMPTY = pass on this half. (b) EMPTY on `grep -rn 'Remote Cache' <CI wrapper/log-gating logic>` plus no written statement anywhere = the outage behaviour is undecided by omission; that is the SHOULD-level finding. **Caveat:** measured against an HTTP cache on WSL2, cache-only shape; a downed cache alongside a live `--remote_executor` (shape F) was not measured. | MUST (do not cite the fallback flags) / SHOULD (state the lane's outage policy) | Bazel ≥7 (measured 8.7.0, 9.2.0); shapes A, F | M-D-10 |
| **BZL-CACHE-27** | A CI job whose purpose is proving hermetic, offline or registry-parity behaviour runs without any remote cache, and says why in an adjacent comment. | A cache hit on such a job proves cache warmth, not the property the job exists to assert. Without the comment a reader cannot distinguish a deliberate omission from an oversight. Argued from one repo's convention plus the map's own reasoning, not from a spec — hence CONSIDER. | For every job lacking the remote-cache step, confirm an adjacent comment names the reason. EMPTY comment where the cache is absent = finding. | CONSIDER | Bazel all; shapes A, F | M-D-14 (shared with `BZL-CI` M-F-07) |
| **BZL-CACHE-28** | Do not enable `--experimental_remote_cache_chunking` by default, and enable it only against a backend whose `GetCapabilities` actually advertises `SplitBlob`/`SpliceBlob` and FastCDC-2020. Never write `--experimental_remote_cache_chunking_function` or any `rep_max_cdc` selector — no such flag has ever shipped. | The flag is correctly still `experimental`, is a plain boolean, and is measured `default: "false"` with byte-identical help text on 8.7.0, 8.8.0 **and** 9.2.0 — so it predates 8.8.0 and there is no version floor inside the measured range; 8.7.0 is simply the oldest binary probed. Its own help text names FastCDC 2020 as the only algorithm and requires the server to advertise `SplitBlob`/`SpliceBlob`, so on a backend that does not, the flag buys nothing. A truncation bug when combined with `--disk_cache` was filed and patched in May 2026 and bounded parallel chunk transfers landed as late as September 2026. **Corrected twice:** the earlier `≥8.8.0` gate for `--experimental_remote_cache_chunking_function=rep_max_cdc` is withdrawn, and so is the "8.7.0 / 9.1.0 floor" for the base flag. The selector never existed anywhere — [#30585](https://github.com/bazelbuild/bazel/pull/30585) targeted `release-8.8.0` and is closed, `merged: false`, zero comments, and `GrpcCacheClient.java` hardcodes `ChunkingFunction.Value.FAST_CDC_2020` at every call site at both the 8.8.0 and 9.0.0 tags (read at source, not inferred from a help grep). | `bazel help build --long 2>&1 \| grep -A4 remote_cache_chunking` against the pinned version: the boolean is the only hit, and a hit on any `_function`/`rep_max_cdc` spelling means a fork or a non-release build, not upstream. Cross-reference any `.bazelrc` hit against `.bazelversion` **and** the CI matrix's *oldest* pinned version, not just the dev pin; for a pin older than 8.7.0 re-derive presence per BZL-CACHE-23 rather than assuming it. Before enabling, read the deployed server's capabilities per BZL-CACHE-24 — **no server in this corpus advertises `SplitBlob`/`SpliceBlob`**, so the flag's runtime effect is a documented gap (Verdict 18h), not a measured win. EMPTY (flag absent from the rc file) = pass. | CONSIDER | Bazel 8.7.0+ measured (present, `false`, on 8.7.0, 8.8.0, 9.2.0; older pins unprobed); shapes A, F | M-D-21 |
| **BZL-CACHE-29** | An explicit remote-cache flag value in an rc file that exactly matches the current documented default carries a comment stating the intended floor, or is removed. | It protects nothing today and reads as meaningful tuning; a reviewer cannot tell dead configuration from a deliberate defensive pin against a future default change. | Compare every explicit `.bazelrc*` remote-cache flag value against the pinned binary's own default for that flag (`bazel help build --long`, per BZL-CACHE-23), not against a fetched reference — the reference tracks the newest release, which may not be any version in the matrix. A match with no adjacent comment is the finding. EMPTY (every explicit value differs from the default, or carries a rationale) = pass. | CONSIDER | Bazel all; shapes A, F | — |
| **BZL-CACHE-30** | Do not enable `--remote_cache_compression` without first checking the build's artifact-size distribution. | It defaults `false` (measured on 8.7.0, 8.8.0, 9.2.0) and is a no-op below `--experimental_remote_cache_compression_threshold`'s 100-byte default, so a build dominated by small blobs pays CPU for zero transfer savings. The evidence is asymmetric and now first-hand on the cost side: [#18997](https://github.com/bazelbuild/bazel/issues/18997) carries a public, reproducible repro measuring **3-5× higher JVM heap use** plus a Bazel maintainer's own `2 B → 15 B` (750 %) zstd inflation on a tiny file — the mechanism behind the 100-byte threshold. **No first-hand latency or bandwidth benefit benchmark exists anywhere**: BuildBuddy's blog, EngFlow's blog and `blog.bazel.build` were each checked directly and none publishes one; the single positive statement ([#17990](https://github.com/bazelbuild/bazel/pull/17990)) is an unquantified production assertion. | Sample `bazel-out` output sizes (or the cache's own upload-size stats) sorted descending before flipping the flag. A distribution with little mass above 100 bytes = finding against enabling it. EMPTY/near-empty distribution above the threshold = do not enable. | CONSIDER | Bazel all; shape F | M-D-17 (as far as evidence allows) |
| **BZL-CACHE-31** | Do not write `--remote_symlink_absolute_path_strategy` or any client-side variant — no such flag exists. State the observable behaviour instead: an action whose output is an absolute symlink fails at **upload** time, after local execution succeeded, against any server that does not explicitly advertise `ALLOWED`. | The strategy is a server-declared REAPI capability with zero client control surface (zero hits in the current CLI reference and in `bazel help build --long` on 8.7.0, 8.8.0 and 9.2.0). Bazel's own enforcement is `UploadManifest.java`'s `allowAbsoluteSymlinks = …getSymlinkAbsolutePathStrategy().equals(ALLOWED)` — so `DISALLOWED` **and** the unset `UNKNOWN` zero-value both resolve to "not allowed" — and `checkAbsoluteSymlinkAllowed` then throws `IOException: Spawn output … is an absolute symbolic link to …, which is not allowed by the remote cache`. Nothing on the client overrides it, and the failure lands on the caching step, not on scheduling or download. | `bazel help build --long 2>&1 \| grep -i symlink` against the pinned version — zero hits is the **stop signal** (BZL-CACHE-23), never an invitation to guess a name. To diagnose the real failure, grep the build log for `is not allowed by the remote cache`; a hit names the action and its absolute-symlink output, and the fix is the output's shape or the server, never a flag. EMPTY log = this failure is not in play. | MUST for anyone standing up, adopting or migrating a remote cache | REAPI v2, Bazel all (verified 8.7.0, 8.8.0, 9.2.0); shapes A, F | M-D-19 |
| **BZL-CACHE-32** | Prune a long-lived CI runner's classic `--repository_cache` with `find <cache>/repos/v1/ -type f -mtime +N -delete`, never with `-atime`, and never in the expectation that Bazel will do it. | Bazel's own user guide states the classic repository cache "is never cleaned up automatically" and that "upon each cache hit, the **modification** time of the file in the cache is updated" — so mtime is the signal Bazel actually maintains, while atime depends on a mount option (`relatime`/`noatime`) most CI images do not guarantee. The upstream request, [#22516](https://github.com/bazelbuild/bazel/issues/22516), is open with zero comments since 2024-05-23 with no milestone; there is no dated commitment to close it. The repo *contents* cache is the exception and prunes itself (BZL-CACHE-17). | Read any pruning script beside the cache: an `-atime` predicate is the finding, as is a comment claiming Bazel prunes this cache. `du -sh $(bazel info repository_cache)` on a runner that has been up for days sizes the exposure. EMPTY (ephemeral runner recycled per job, so the cache never accumulates) = pass by architecture — state that it is the architecture doing the work, because it stops being true the day a persistent self-hosted runner appears. | SHOULD | Bazel all (issue open as of 2026-09-06); shape F, and any persistent-runner shape A | M-D-16 (repository half) |
| **BZL-CACHE-33** | Treat `--bes_backend`'s credential and TLS configuration as one trust surface with `--remote_cache`/`--remote_executor`: any credential rotation rotates both, and the rotation runbook names both. | Bazel's own BEP doc, verbatim: "the Build Event Service and Remote Execution Endpoints need to share the same authentication and TLS infrastructure." Nothing in the client distinguishes a BES credential from a cache credential at resolution time — both route through the same `--credential_helper` and the same gRPC stack — so rotating one leaves the other looking fine until it silently stops uploading. This extends the BZL-CACHE-02/03/04 family with a second consumer of the same secret, not a new secret. | One pass covers both surfaces: `grep -n 'bes_backend\|remote_header\|credential_helper' *.bazelrc* .github/`. If `bes_backend` and either credential mechanism both appear, confirm a runbook or comment names both; its absence is the finding. EMPTY on `bes_backend` = the rule does not bind (no BES configured) — pass by absence, and it starts binding the day a results dashboard is stood up. Dashboard and upload-mode guidance is `BZL-CI`'s, not this row's. | MUST where `--bes_backend` is configured | Bazel all (flag present 8.7.0, 8.8.0, 9.2.0); shapes A, F | — |
| **BZL-CACHE-34** | Never treat a shared cache as checkout-scoped. An action key is independent of the workspace's absolute path, so a hit serves another checkout's — or another machine's — bytes verbatim; any action that reads ambient run-time state therefore ships that state to every consumer of the cache. | Measured on 8.7.0 and 9.2.0: a `--disk_cache` warmed at one absolute path served all five genrule actions at a second checkout under a different path, with identical compact-log `digest` fields, and the second checkout's output file literally contained the **first** checkout's `output_base` hash in its `PWD=` line. `$(location)`/`$(execpath)` resolve to exec-root-relative strings at analysis time, so the key carries no absolute path; the divergence enters only through an action reading `$PWD`, `date` or an unsorted directory listing at run time. The consequence is not a slow build — it is a cached artifact carrying one machine's state into every other machine's outputs, undetectable from the action key. | This rule gates on `BZL-HERM-10`'s check (no absolute path or host state in a declared output) rather than re-deriving it: a clean report there passes this rule. To reproduce the exposure directly, warm a `--disk_cache` from one checkout and build a byte-identical copy at a different absolute path against the same cache — every action reported as `disk cache hit` is an action whose output is now shared across checkouts. EMPTY (`BZL-HERM-10` clean, no ambient-state reads) = pass. A **non**-empty finding there is more urgent once a shared cache exists than it was before, because the cache is the distribution mechanism. **Caveat:** measured for genrule-shaped actions with native substitution; a custom action that shells `pwd` into a tool *argument* was not tested and could plausibly destabilise the key instead. | MUST | Bazel all (measured 8.7.0, 9.2.0, `linux-sandbox`); shapes A, F | M-C-13 (cache half) |

## Applied to `rules_ocx`

The fleet's one Bazel repository, shape A. It has a live HTTP remote cache, no
remote execution, and no remote execution is possible — so this group binds hard
on the caching half and exhibits the RBE half only as a documented structural
"no".

**Already satisfied — preserve:**

- **BZL-CACHE-01** — the two-tier split is implemented correctly and is the
  portable pattern's worked example. `.github/actions/remote-cache/action.yml:32`
  appends the authorization header only when `$BAZEL_CACHE_AUTH` is non-empty;
  `:34` appends `--remote_upload_local_results=false` otherwise; `ci.yml:30` and
  `:56` gate that input identically as
  `${{ github.event_name == 'push' && secrets.BAZEL_CACHE_AUTH || '' }}`.
  Every PR, same-repo included, gets the empty string and therefore
  anonymous-read access, and the write secret is never materialised in that
  lane's environment
  ([build-contracts-and-ci-posture.md:104-107,183](bazel-audit/build-contracts-and-ci-posture.md);
  re-verified against the repository 2026-09-05). The flag's mechanism is now
  measured rather than assumed: `--remote_upload_local_results=false` produced
  zero `PUT` lines against a real HTTP cache endpoint.
- **BZL-CACHE-25** — `action.yml:27` writes
  `build --remote_cache=https://bazel-cache.ocx.sh` with an explicit scheme
  against an HTTP backend. Clean.
- **BZL-CACHE-09** — the structural RE "no" is written down where a reader will
  find it: `README.md:266-270` states the nixpkgs-model reason rather than
  leaving it as tribal knowledge (map and audit cite `246-249`; corrected here).
- **BZL-CACHE-27, two of three** — `ci.yml:98-100` and `ci.yml:171-172` each
  carry a quoted rationale for running uncached.
- **BZL-CACHE-17** — pass by absence: no `--disk_cache` anywhere in the repo.
- **BZL-CACHE-19, -20, -22** — no `--noincompatible_strict_action_env`, no
  `--workspace_status_command`/`--stamp`/`STABLE_` key, and zero
  `no-remote*`/`no-cache` tags anywhere (verified 2026-09-05 by grep over
  `*.bzl`, `BUILD.bazel`, `*.yml`, `.bazelrc*`). One caveat now measured: the
  pin's own default for `--incompatible_strict_action_env` is **false**, so the
  8.7.0 legs run the permissive action environment (client `PATH` and
  `LD_LIBRARY_PATH` reach the action) while the 9.x leg runs the strict one, and
  nothing in the repository announces the split. That is `BZL-HERM-01`/`BZL-FLAG`
  territory, routed here only because BZL-CACHE-19's cell reads it.
- **BZL-CACHE-28** — the chunking flag is absent, correctly: it is measured
  present and `default: "false"` on the 8.7.0 pin (no version floor is in play —
  the flag predates 8.8.0), and `bazel-cache.ocx.sh`'s `buchgr/bazel-remote`
  backend advertises no `SplitBlob`/`SpliceBlob`, so enabling it would buy
  nothing here.
- **BZL-CACHE-33** — pass by absence: `grep -rn 'bes_backend'` over every
  `.bazelrc*`, workflow and action file returns nothing
  ([rbe-readiness-and-cache-trust-boundary.md:214](bazel-caching-rbe/rbe-readiness-and-cache-trust-boundary.md)).
  It begins binding the day a results dashboard is stood up against the same
  credential.
- **BZL-CACHE-31, -34** — nothing to violate today: the repo produces no
  absolute output symlinks (0 `cc_*` targets) and no action reads ambient
  run-time state. Both are latent, and -34 becomes urgent the moment an action
  does, because the shared cache distributes it.

**Violated:**

| Rule | Site | What is wrong |
|---|---|---|
| BZL-CACHE-06 | `README.md:266-270` | Violated **by design and documented**: launchers resolve absolute `OCX_HOME` store paths, so the repo fails gate step 1 permanently. This is the ruleset's worked counter-example, not a defect to fix — BZL-CACHE-09 is how it is discharged. |
| BZL-CACHE-11 | repo-wide; `build-contracts-and-ci-posture.md:187,191` | Zero `--remote_download_*` flags with a remote cache configured. Three distinct roles (the 9-shard test matrix, BCR-parity, examples) inherit one undifferentiated `toplevel` default. This is the live instance of M-D-06. |
| BZL-CACHE-26 | repo-wide; `build-contracts-and-ci-posture.md:187` | Passes the MUST half by accident (neither fallback flag appears, so no dead configuration) and fails the SHOULD half: the repository states nothing about outage behaviour. The finding is now the **opposite** of what this file previously recorded — measured, an outage of `bazel-cache.ocx.sh` does **not** hard-fail the `lint` and `test` jobs; it logs a WARNING and builds locally at exit 0. Nobody has said whether a silent slow green build on a cache outage is acceptable, and no Bazel flag would change it if it were not. |
| BZL-CACHE-29 | `action.yml:28` (and the gitignored user rc) | `--remote_timeout=60` matches the pinned binary's own default of `"60s"` exactly (re-measured on 8.7.0, 8.8.0 and 9.2.0), with no comment anywhere — dead configuration or an unstated defensive pin, and a reviewer cannot tell which ([build-contracts-and-ci-posture.md:185,300](bazel-audit/build-contracts-and-ci-posture.md)). |
| BZL-CACHE-27 | `ci.yml:64-91` | The `examples` job runs uncached with no comment, unlike its two siblings — an omission a reader cannot distinguish from an oversight ([build-contracts-and-ci-posture.md:295](bazel-audit/build-contracts-and-ci-posture.md)). |
| BZL-CACHE-03 | `action.yml:32` | The write credential rides a bare `--remote_header=authorization=` line rather than `--credential_helper`. Per the owner's own decision this is **SHOULD**, not blocking — but the tracked migration item the rule requires does not exist in the repo's docs or tracker either, and that absence is the finding. |
| BZL-CACHE-24 | the deployed backend | The cache runs `buchgr/bazel-remote`, which hardcodes `SymlinkAbsolutePathStrategy_ALLOWED` **and** `digest_functions = [SHA256]` with no config knob for either. The symlink half is currently moot (0 `cc_*` targets, no absolute output symlinks). The digest half is the newly-surfaced half: a migration to Buildfarm, NativeLink or Buildbarn would additionally flip the symlink policy to effectively `DISALLOWED`, turning a today-silent output shape into BZL-CACHE-31's upload-time hard failure. Nothing in the repo records either property. |

**Live gap, previously scoped away, now measured:**

- **BZL-CACHE-12** — the eviction condition is reachable here exactly as
  Verdict 5 describes, and the earlier scoping of this rule to shape F was
  wrong. What is also wrong is the remedy this file previously asked for: no CI
  wrapper special-cases exit 39, and **it should not**. Measured, the condition
  surfaces as exit 0 (self-healed, one WARNING line) or a generic exit 1, never
  39 — a wrapper keyed on 39 would never fire and would give false confidence.
  `--experimental_remote_cache_eviction_retries` is unset, so the safe default
  (5) is in force, which is the whole of what this repo needs. Nothing here
  needs `--rewind_lost_inputs` either — it is available on the 8.7.0 pin
  (present since 8.7.0, `UNDOCUMENTED` until 9.2.0, so `bazel help build --long`
  cannot see it) but is a second, lower layer that was measured *not* to rescue
  this shape once the retry budget is spent, so it is not the fix for anything
  the repo has. The residual gap is observability: nothing greps the build log
  for `lost inputs` / `Found transient remote cache error`, so a
  repeatedly-evicting cache would show up only as intermittently slower green
  builds.

**New commitments (nothing to violate — forward-looking):**

- **BZL-CACHE-13 / -14** — no TTL flag is set, so the measured `3h` default runs
  against a `bazel-remote` LRU whose real eviction window is recorded nowhere in
  the repo. The rule constrains what the first TTL line looks like. Lease
  extension is correctly absent (no long-lived server product in play).
- **BZL-CACHE-16** — `grep -rn "execution_log_compact_file\|discard_merkle_trees"`
  over `.bazelrc*`, workflows and docs returns nothing: if a cache-key
  regression appeared today the loop would be assembled ad hoc from upstream
  docs. The rule pre-scripts it, and `bazel-diagnose` carries the tree.
- **BZL-CACHE-32** — no fleet exhibit: GitHub-hosted runners are ephemeral, so
  the repository cache never accumulates. That is the architecture passing the
  rule, not configuration, and it stops holding the day a self-hosted runner
  appears.
- **BZL-CACHE-05** — a single non-public endpoint, no exposure today.
- **BZL-CACHE-02** — the CI half is clean; the actor census across developer
  machines has never been run, and the fleet's own developer rc file is exactly
  the second write-capable actor the rule asks about.

**Cannot exhibit:**

- **BZL-CACHE-07, -08** — no `--remote_executor` and no dynamic-execution flag
  exists anywhere in the fleet, and shape A structurally cannot acquire one
  (BZL-CACHE-06). To exhibit these the fleet would have to stand up a repo whose
  build outputs are relocatable — i.e. drop the shared absolute-path store model
  — plus a real RE backend. Neither exists nor is planned. This is also why
  Verdict 5's shape-F caveat cannot be closed from inside this fleet.
- **BZL-CACHE-21** — no hand-built REAPI protos anywhere in the fleet; there is
  no cache proxy, shim or warming script. Exhibiting it needs a first REAPI-
  adjacent tool to be written.
- **BZL-CACHE-18** — the check runs clean today only because the repo compiles
  nothing: 0 `cc_*` targets, and its `ctx.actions.run` sites wrap
  ocx-provisioned executables through `native_binary`. The developer rc file's
  `CC=`/`layering_check` override is the latent form of this rule and governs
  zero actions ([build-contracts-and-ci-posture.md:37,220](bazel-audit/build-contracts-and-ci-posture.md)) —
  a latent trap, not an active violation, per frame Correction 4.

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`).** Binds hard on
  every caching rule; RBE rules bind only as the documented structural "no"
  (BZL-CACHE-06/09). Six live findings, listed above.
- **B — Rust CLI + Python acceptance harness (`ocx`, `grimoire`, `ocx-mirror`,
  `bob`, `rust-oci-client`).** Does not bind today — no `MODULE.bazel`, no
  action cache to poison. It binds at the first `--remote_cache` line, and
  `bazel-adopt` should carry BZL-CACHE-01 into the same PR that adds it, because
  a cache stood up without the read/write split is poisoned-by-default from the
  first fork PR.
- **C — Rust + TypeScript monorepo (`creeptd-ng`).** The only fleet repo whose
  scale would ever justify a cache, and the one that would fail BZL-CACHE-18
  first: two workspace members compile against a live Postgres through
  `sqlx::query!` with no committed `.sqlx/` offline cache
  ([fleet-bazel-readiness.md:52-55](bazel-audit/fleet-bazel-readiness.md)) — a
  host-resolved dependency invisible to any action key. It is also the first
  repo where BZL-CACHE-34 would bite: a shared cache would distribute whatever
  ambient state those actions read to every other consumer. Fix that before any
  caching strategy is trusted.
- **D — Python library or automation.** Does not bind. Nothing here changes
  until a Bazel module exists; `python-packaging` owns the manifest hygiene.
- **E — TypeScript package, extension or Action.** Does not bind, same reason;
  `typescript-packaging` owns the manifest hygiene.
- **F — future polyglot Bazel monorepo, and `rules_ocx`'s own users.** The whole
  ruleset binds. Ten rules are F-only or F-first (-05, -07, -11, -14, -17, -21,
  -28, -30, -32, -33, plus the RE gate's later steps); they are grounded on
  upstream primary sources and this program's own measurements, never on fleet
  code, and are the reason this depth file ships at all.

## AI-agent failure modes

Ranked by how often the corpus saw them, each with the mechanical check that
catches it.

1. **Citing a flag without the version it exists on — in either direction.**
   This corpus made the error twice, both times toward "the flag is gone":
   `--experimental_remote_merkle_tree_cache` and
   `--incompatible_remote_use_new_exit_code_for_lost_inputs` were written up as
   never-existing and deleted, and both are live, default-active flags on the
   fleet's own 8.7.0 pin, removed only at 9.0.0. The mirror error is the more
   familiar one (`--experimental_credential_helper`, the pre-7.0 experimental
   name). Check: `bazel help build --long` **and** `bazel help startup_options`
   against *every* version in the matrix, then write the version boundary into
   the claim (BZL-CACHE-23).
2. **Reading a `bazelbuild/bazel` PR's merge state as the answer — in either
   direction.** Both [#25334](https://github.com/bazelbuild/bazel/pull/25334) and
   [#25398](https://github.com/bazelbuild/bazel/pull/25398) are `CLOSED` with
   `mergedAt: null`, and this file first cited each as landed; the correction
   then over-swung to "never merged, so it never happened", which is wrong for
   #25334 — its change shipped as
   [`91b1e8e2`](https://github.com/bazelbuild/bazel/commit/91b1e8e28afc7f76ed5930b469b23fd13303eda3)
   through the internal sync that closed the PR. Check: `gh pr view` first, then
   look for the named commit at the tag; only "unmerged **and** no commit"
   demotes a citation to a proposal (BZL-CACHE-23).
3. **Writing a CI wrapper that retries on exit code 39.** Measured, the eviction
   condition never surfaces as 39 on a cache-only build — it self-heals to exit
   0 or fails generically at exit 1. Check: match the error text
   (`lost inputs`, `Found transient remote cache error`,
   `Lost inputs no longer available remotely`), never the exit code
   (BZL-CACHE-12).
4. **Claiming a cache outage fails a cache-only build.** The two fallback flags
   have no effect without a `--remote_executor`; measured, an unreachable cache
   is a WARNING and a green local build on 8.7.0 and 9.2.0. Check: before
   asserting outage behaviour, ask whether an executor is configured at all
   (BZL-CACHE-26).
5. **Recommending `--remote_download_minimal` "to turn on BwoB".** It has been
   on by default since Bazel 7. Check: read the printed default from
   `bazel help build --long 2>&1 | grep -A2 remote_download_outputs` before
   writing any BwoB guidance — and note `bazel help all --long` is not a real
   subcommand.
6. **Conflating the caches in a diagnosis** — answering "why is disk filling
   up on this runner" with "the remote cache" when the culprit is an unpruned
   repository cache or a GC-less `--disk_cache`. Check: `du -sh` the distinct
   directories from `bazel info` and attribute growth to the one that is
   actually large; a local action-cache hit is *absent* from the execution log
   rather than logged as a hit (BZL-CACHE-15).
7. **Using `--explain` to diagnose a cache hit.** Measured, it reported
   `no entry in the cache (action is new)` for actions that were confirmed
   disk-cache hits — it reads the local action-cache layer only and cannot see a
   disk or remote hit. Check: use the execution log's `runner`/`cache_hit`
   fields (BZL-CACHE-16).
8. **Pruning the repository cache with `find -atime`.** Bazel updates
   **mtime** on a cache hit, and most CI images mount `relatime`. Check: read
   `bazel.build/run/build`'s own sentence before writing any `find` command
   (BZL-CACHE-32).
9. **Prescribing the WORKSPACE-era RBE setup** (`rbe_autoconfig`, a
   `bazel-toolchains` WORKSPACE dependency). Bazel's *own* `remote/ci` page
   still shows it, so an agent reading official docs uncritically gets it wrong;
   it is impossible on Bazel 9, which deleted WORKSPACE support. Check:
   `grep -rn 'rbe_autoconfig\|bazel-toolchains' WORKSPACE* MODULE.bazel* .bazelrc*`
   — any hit on a Bzlmod-only repo is the finding.
10. **Copying `--experimental_remote_cache_ttl=10000d` as current practice.**
    Correct only below 8.2.0/7.6.0, per BuildBuddy's own dated `.bazelrc`
    comment. Check: read `.bazelversion` (or the matrix's oldest pin) against
    8.2.0/7.6.0 before applying any TTL workaround from a pre-2026 source.
11. **Suggesting `--noincompatible_strict_action_env` to fix environment-related
    flakiness** — a StackOverflow-era workaround. On 8.x it looks like a no-op
    and quietly pins the permissive default across a 9.x bump; on 9.x it
    reintroduces the ambient class outright. Check: treat any generated
    `.bazelrc` diff containing it as a red flag needing a named
    `--action_env=VAR` instead, and read the default from the pinned binary, not
    from memory (BZL-CACHE-19).
12. **Proposing dynamic execution as a free win on top of an existing remote
    cache.** The docs state it cannot function. Check: dynamic flags present and
    `remote_executor` absent ⇒ reject the suggestion (BZL-CACHE-08).
13. **Inventing a knob that does not exist** — `salt=` on an action, or a
    `--remote_symlink_absolute_path_strategy`-shaped flag. Both are outside any
    client control surface, and the second is the one an agent reaches for when
    told a server allows absolute symlinks. Check: grep the pinned binary's help
    and the `ctx.actions.run` signature; zero hits confirms the absence rather
    than a gap to fill (BZL-CACHE-22, BZL-CACHE-31).
14. **Treating "no RBE" as "no security surface".** Cache poisoning applies fully
    to a cache-only deployment. Check: run BZL-CACHE-01/-02's write-actor
    enumeration regardless of whether `--remote_executor` is set — and include
    `--bes_backend`, which holds the same credential (BZL-CACHE-33).
15. **Migrating to `--credential_helper` by writing it into the committed
    `.bazelrc`** — strictly worse than the token it replaces. Check: after any
    such migration, `grep -n 'credential_helper' .bazelrc` on the tracked file
    must return nothing (BZL-CACHE-04).
16. **Assuming `--disk_cache` is garbage-collected automatically, or that the
    repository cache and the repo contents cache share a GC story.** Disk-cache
    GC exists from 7.4 with both bounds still defaulting to unbounded; the repo
    contents cache has age-only GC (`14d`) and no size cap; the classic
    repository cache has none at all. Check: name which cache before asserting
    anything about pruning (BZL-CACHE-17).
17. **Charting a "remote cache hit rate" from BEP.**
    `BuildMetrics.ActionSummary.remote_cache_hits` is `[deprecated = true]`;
    `ActionCacheStatistics.hits/misses` measures the **local** action cache; the
    only clean remote-scoped boolean is test-only
    (`TestResult.execution_info.cached_remotely`). This is `BZL-CI`'s rule to
    own (NEW-CI-2), listed here because the mistake is made while reading this
    family's material.
18. **Reversing `ctx.info_file` and `ctx.version_file`** (info = stable,
    version = volatile) — both were historically undocumented in the Rules API
    reference, so training data carries inconsistent third-party explanations.
    Check: a minimal rule that prints both paths against
    `bazel-out/{stable,volatile}-status.txt`.
19. **Hand-assembling a `Directory`/`Command` proto from an unsorted dict or
    list**, because the literals "look" ordered. Check: an explicit `sorted(...)`
    immediately before the digest computation (BZL-CACHE-21).
20. **Quoting the fleet's own developer rc credential line when asked to "show
    the current cache config".** Program-level trap, not a Bazel fact: describe
    the mechanism in words, never paste the line.

## Open questions

**Needs a human decision:**

- **Should a `rules_ocx` CI lane fail when `bazel-cache.ocx.sh` is down, and is
  anyone willing to build the mechanism?** The measured default is a silent
  local build at exit 0, not the hard failure this file previously assumed. No
  Bazel flag changes that on a cache-only shape; failing would need a
  reachability probe or a log-gating wrapper. The question is now "is silent
  degradation acceptable", not "which flag" (BZL-CACHE-26).
- **Is the `examples` job's uncached state deliberate (like its two siblings) or
  an oversight?** Only the maintainer knows the intent; the fix is either a
  comment or a cache step (BZL-CACHE-27, `ci.yml:64-91`).
- **What is the real advertised minimum blob TTL / LRU eviction window of
  `bazel-cache.ocx.sh`?** BZL-CACHE-13's tuning half cannot be applied without
  that number, and nothing in the repository records it. The operator has it.
- **Has the `--credential_helper` migration actually been filed?** The owner's
  decision row 6 says "fleet fix filed separately"; no tracked item is visible
  from the repository, which is what BZL-CACHE-03 flags for an existing setup.

**Deserves another research round:**

| Subarea | Exact question |
|---|---|
| Exit 39 under real remote execution | Is exit 39 reachable at all, on any shape? The cache-only reproduction never produced it in ten invocations across two majors. Shape F (a live `--remote_executor`, where output verification after a remotely-executed action routes through different code) was not measured because no RE backend exists in this fleet. Until someone runs it, "exit 39 exists in `ExitCode.java`" is the strongest claim the corpus can make. |
| `--experimental_remote_cache_chunking` against a capable backend | **Closed and replaced.** Which commit removed the two 8.x flags is answered (`91b1e8e2`, `30ca50950f` — Verdict 4), and where [#30585](https://github.com/bazelbuild/bazel/pull/30585) landed is answered (nowhere — Verdict 12). What remains: the flag's actual runtime effect. No server in this corpus advertises `SplitBlob`/`SpliceBlob`, so only its existence and default are measured. Needs a backend that advertises FastCDC-2020 chunking, and a transfer-volume comparison with the flag off and on. |
| `--remote_cache_compression`, benefit side | A first-hand latency/bandwidth benchmark against a real artifact-size distribution. The three obvious vendor sources were each checked directly and publish nothing; the only first-hand numbers anywhere are cost-side ([#18997](https://github.com/bazelbuild/bazel/issues/18997)). This is now a confirmed absence to fill by measuring, not a search to repeat. |
| Cache-server capabilities, the two remaining unknowns | EngFlow's advertised `symlink_absolute_path_strategy`/`digest_functions` (doc archaeology hit a wall; needs a live cluster or a support conversation), and whether Buildbarn's *scheduler* side (`bb-remote-execution`) sets `ExecutionCapabilities` differently from the `bb-storage` frontend that was read. |
| `--rewind_lost_inputs` at the default retry budget | The ceiling half is **closed**: `MAX_REPEATED_LOST_INPUTS = 20`, hard-coded and byte-identical 8.7.0 → 9.2.0, so `#21` is ceiling-plus-one; the flag is present and functional from 8.7.0 (`UNDOCUMENTED` until 9.2.0), and at `retries=0` it does not recover the evicted-intermediate shape. What remains: `--rewind_lost_inputs=true` with `--experimental_remote_cache_eviction_retries` left at its default `5` was never run, so whether the two layers compose inside one invocation is open — as is which commit introduced the post-9.2.0 tunable `--experimental_max_repeated_lost_inputs` and which release will carry it. |

**M-D rows this ruleset does not settle:**

- **M-D-05** (read-side disclosure) — settled only to CONSIDER (BZL-CACHE-05).
  The map itself prioritises it P2, no fleet cache is publicly reachable, and
  the supporting evidence is a mailing-list thread. It becomes a MUST the day an
  endpoint is exposed, not before.
- **M-D-14** (uncached CI job as a hermeticity assertion) — CONSIDER only.
  It rests on one repository's convention plus the map's own reasoning, with no
  spec behind it, and it is the same question as `BZL-CI`'s M-F-07; the two
  families must not both claim it as a MUST.
- **M-D-17** (`--remote_cache_compression`) — settled as far as the evidence
  allows and no further: the defaults and the 100-byte threshold are normative,
  the cost side is now first-hand and numeric, and the benefit side does not
  exist in any published source. CONSIDER is the honest severity.
- **M-D-18** — the URI-scheme half is settled (BZL-CACHE-25); whether the
  deployed backend's *protocol behaviour* matches beyond the scheme (HTTP
  endpoint vs. gRPC capability negotiation for `bazel-cache.ocx.sh`
  specifically) was not verified by any dive or measurement.

## Revision log

One line per change made on 2026-09-06, folding in two follow-up dives and three
measurement clusters. Rule IDs are stable: no number was reused, reordered or
retired.

- **Verdict 4 rewritten** — "two dead flags" reversed. Both
  `--experimental_remote_merkle_tree_cache` and
  `--incompatible_remote_use_new_exit_code_for_lost_inputs` are present and
  default-active on 8.7.0 and 8.8.0 and absent only at 9.2.0; the correct
  framing is "removed at 9.0.0". `#25334` closed unmerged, so the cited deletion
  never happened by that route. Source: both measurement clusters, re-measured
  here against the three binaries.
- **Verdict 5 rewritten, BZL-CACHE-12 rewritten** — split verdict. The
  lost-input *mechanism* on a cache-only build is confirmed; the *exit code*
  claim is contradicted (exit 0 with the default retries, exit 1 with retries 0,
  never 39). The rule now keys on error text and the retry default, inverts its
  own check (a `39` special case is the finding), and carries the shape-F
  caveat. Source: `exit-39-and-bwob-on-cache-only-build.md`.
- **BZL-CACHE-26 rewritten, severity MUST/SHOULD** — an unreachable cache is
  non-fatal on a cache-only shape regardless of either fallback flag (WARNING,
  local build, exit 0, both majors, all four flag combinations). The rule now
  forbids citing the flags as an outage policy and asks for the decision to be
  stated; the absence of any Bazel mechanism to fail on outage is recorded as a
  documented gap (Verdict 18b). Source:
  `exit-39-and-bwob-on-cache-only-build.md` Q7.
- **Verdict 10 rewritten, BZL-CACHE-19 rationale corrected** — the escalation's
  stated ground ("defaults true in the current reference") is wrong for the
  fleet's own pin. Measured `false` on 8.7.0/8.8.0, `true` on 9.2.0. MUST
  stands, with the version split and the measured allowlist nuance. Source:
  `flag-defaults-…`, `action-key-path-sensitivity-and-execlog.md` Q3.
- **BZL-CACHE-28 corrected** — the `--experimental_remote_cache_chunking_function`
  / `rep_max_cdc` ≥8.8.0 clause withdrawn: zero hits on 8.7.0, 8.8.0 and 9.2.0.
  The base flag's floor and CONSIDER severity stand. Source: re-measurement here.
- **BZL-CACHE-23 extended** — now covers the version claim and the PR citation,
  not just the flag name; adds `bazel help startup_options` to the check, the
  `--experimental_remote_grpc_log` → `--remote_grpc_log` rename, and a
  cross-reference to [BZL-FLAG-11](bazel-flags-and-versions.md) as the general
  rc-file form. Source: both measurement clusters, `diagnosis-…` follow-up,
  BZL-FLAG's consolidation.
- **BZL-CACHE-13 citation demoted** — `#25398` closed unmerged; the 8.2.0/7.6.0
  floor now rests explicitly on BuildBuddy's own dated account, and the TTL
  default `3h` is measured rather than fetched. Source:
  `exit-39-and-bwob-on-cache-only-build.md` additional finding.
- **BZL-CACHE-10, -11 sharpened** — `toplevel` default confirmed from three live
  binaries; the `toplevel`/`minimal`/`all` materialisation behaviour measured by
  file presence rather than help text; `bazel help all --long` named as not a
  real subcommand. -11 gains the note that eviction exposure must not drive the
  mode choice. Source: `exit-39-…` Q2/Q3/Q5.
- **BZL-CACHE-15 enumeration corrected** — six caches to seven, adding the repo
  contents cache; the rule cites `bazel-diagnose`'s per-cache discriminators
  rather than restating them, and gains the two backwards-reading signals (a
  local action-cache hit is absent from the execution log; the status line never
  reports local hits) plus BEP `ActionCacheStatistics` as the local-cache
  discriminator. Meaning unchanged. Source: `diagnosis-…` Q3.
- **BZL-CACHE-16 extended** — adds the independent upstream citation
  (`remote/cache-remote.md#compare-logs`), the measured volatile-field strip
  list, the `execlog:parser`/`converter` flag-ownership fix, the
  `--execution_log_json_file` parsing trap, the `--explain` false-negative, and
  the scope boundary that a separate two-run output-digest diff is required for
  output non-determinism. Source: `action-key-…` Q5/Q6, `diagnosis-…` Q2.
- **BZL-CACHE-17 scoped** — "no automated pruning on any version" now applies to
  the classic `--repository_cache` only; the repo contents cache's real,
  age-only GC (`--repo_contents_cache_gc_max_age` `14d`, `_gc_idle_delay` `5m`,
  no size cap) is named and measured present on all three versions. Source:
  `cache-server-…` Q2, re-measured here.
- **BZL-CACHE-24 extended** — absorbs the five-server capability survey
  (proposed as NEW-CACHE-1, folded rather than duplicated because it is this
  rule's own meaning) and states that neither field is operator-configurable
  anywhere. Source: `cache-server-…` Q1.
- **BZL-CACHE-30 evidence strengthened, severity unchanged** — cites `#18997`
  directly (3-5× heap; 750 % inflation on a 2-byte file) instead of describing
  counter-evidence as second-hand, and records that three vendor sources were
  checked directly and publish no benefit-side benchmark. Source:
  `cache-server-…` Q4.
- **BZL-CACHE-18, -20 annotated** — -18 gains the measured by-contrast
  confirmation (declared-`File` tools keep keys stable across checkouts); -20
  gains a one-line disambiguation from the sandbox-slot mechanism, which is
  -34's. Source: `action-key-…` Q1/Q5.
- **BZL-CACHE-01 verification sharpened** — adds the request-level signal
  measured against a real HTTP endpoint (zero `PUT` lines under
  `--remote_upload_local_results=false`; zero `GET /ac/` under
  `--remote_accept_cached=false`). Source: `exit-39-…` Q6.
- **BZL-CACHE-31 added** (new) — no client-side symlink-strategy flag exists;
  the observable behaviour is an upload-time `IOException … is not allowed by
  the remote cache` against any server not advertising `ALLOWED`, unset
  included. MUST. Source: `cache-server-…` NEW-CACHE-2 (normative + codified).
- **BZL-CACHE-32 added** (new) — repository-cache pruning uses `-mtime`, never
  `-atime`; `#22516` open with zero comments. SHOULD. Source: `cache-server-…`
  NEW-CACHE-3 (codified + normative).
- **BZL-CACHE-33 added** (new) — `--bes_backend` shares the credential and TLS
  surface with the remote endpoints; one grep pass covers both. MUST where BES
  is configured. Source: `cache-server-…` NEW-CACHE-4 (normative, Bazel's own
  BEP doc verbatim).
- **BZL-CACHE-34 added** (new) — a shared cache is not checkout-scoped; an
  action key is workspace-path-independent, so ambient run-time state in an
  output is distributed to every consumer. Gates on `BZL-HERM-10` rather than
  re-deriving it. MUST. Source: `action-key-…` Q1/Q2 (measured).
- **NEW-CI-1/2/3 not adopted here** — `--bes_upload_mode` per lane, the BEP
  cache-hit-rate field trap and the `--remote_build_event_upload=minimal`
  `bytestream://` trap are forward-declared for `BZL-CI` by the follow-up's own
  family decision, and are recorded in Verdict 13 rather than claimed.
- **Open questions pruned** — cache-server capability survey, exit-39
  reachability, repository-cache growth and BES ownership are answered and
  removed; their residues (EngFlow/Buildbarn unknowns, shape F, the unidentified
  removal commit, the chunking selector, `--rewind_lost_inputs`, the fixture's
  HTTP quirks) replace them as narrower rows. `--remote_cache_compression` moved
  from "search for a benchmark" to "measure one; the search is done".
  Established gaps moved into Verdict 18.

**Wave-5 convergence round, 2026-09-06.** Row-scoped; no rule ID was added,
reused, reordered or retired, and no rule outside the four listed below changed.

- **Verdict 4's flag table corrected, `--rewind_lost_inputs` row** — "absent /
  absent / present" was a `bazel help build --long` artefact. The flag is
  present, default `false` and functional at 8.7.0, 8.8.0, 9.0.0 and 9.1.0 with
  `documentationCategory=UNDOCUMENTED`, flipping to `REMOTE` only at 9.2.0; a
  real 8.7.0 binary accepts `bazel build --rewind_lost_inputs`. Source:
  `bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md` §3.
- **Verdict 4's removal attribution corrected (the NEW-CACHE-35 material,
  folded not added)** — two commits eight months apart, not one PR:
  `91b1e8e2` (2025-02-20, closing #25334) for the exit-code flag and
  `30ca50950f` (2025-10-14, closing #25650) for the Merkle-tree flags, the
  latter incidental to a Merkle-tree rewrite. Neither touches eviction retries.
  Records that a `CLOSED`/`mergedAt: null` Bazel PR is the normal shape of a
  community PR superseded by the internal sync, and that 9.0.0's removed-flags
  appendix omits the Merkle-tree flag. Source: same file §2.
- **BZL-CACHE-23 verification cell corrected** — its "`mergedAt: null` means the
  PR is a proposal" inference was too strong and would have propagated the
  opposite error. The check is now two-step: PR state first, then the named
  commit in the tagged tree; only unmerged **and** no commit demotes a citation.
  Adds the incomplete-release-notes caveat. Source: same file §2.
- **AI-agent failure mode 2 rewritten** to the same two-step shape, since it
  taught the over-swung version. Source: same file §2.
- **Verdict 5 and BZL-CACHE-12 sharpened** — rewind does not rescue
  `retries=0`: re-measured on 9.2.0 under a second eviction shape, rewind
  engages and then exhausts a hard-coded `MAX_REPEATED_LOST_INPUTS = 20`
  (byte-identical 8.7.0 → 9.2.0; the 21st loss trips it, hence `#21`), exit 1
  either way. The rule gains a third check (`rewind_lost_inputs` alongside
  `retries=0` is the finding), the warning that `help build --long` cannot
  verify the flag's availability, and the untested-at-default-budget caveat.
  The NEW-CACHE-36 proposal demotes into this row rather than becoming a rule —
  it carries no separate obligation. Source:
  `bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md` Q4 and
  `…bcr-playbook…` §3.
- **BZL-CACHE-28 corrected twice, and Verdict 12's boundary list with it** —
  the `≥8.7.0/≥9.1.0` floor is withdrawn (the boolean is present with identical
  help text on 8.7.0, 8.8.0 and 9.2.0, so it predates 8.8.0 and 8.7.0 is only
  the oldest binary probed), and the `_function`/`rep_max_cdc` selector is
  confirmed never to have shipped anywhere — #30585 closed `merged: false` and
  `GrpcCacheClient.java` hardcodes `FAST_CDC_2020` at 8.8.0 and 9.0.0. The rule
  now gates on server capability instead of version, and names the untested
  runtime effect as a gap. Source: `bazel9-gate-…` Q4, `…bcr-playbook…` §2.
- **Verdict 18e RETRACTED, 18f/g/h added** — the `Expect: 100-continue` and
  explicit `Content-Length: 0` fixture requirement was fixture-side on both
  counts: `HttpCacheClient`'s Javadoc disclaims sending the header on every
  version 8.7.0–9.2.0, and `buchgr/bazel-remote` gets `Content-Length: 0` free
  from Go's `net/http`; only the Python `BaseHTTPRequestHandler` fixture needed
  either. The NEW-CACHE-37 proposal is retracted with it and never became a
  rule, so no row retires. The new gaps are rewind at the default retry budget,
  the commit introducing `--experimental_max_repeated_lost_inputs`, and
  chunking's runtime effect. Source: `…bcr-playbook…` §4.
- **Verdict 13 cross-reference extended** — `no-remote-cache-upload` is now
  measured at the wire level (only the `PUT /ac/` is suppressed; the CAS PUT
  still fires; indistinguishable from default against `--disk_cache` alone), so
  this family must not cite disk-cache or execlog `cacheable`/`remotable`
  readings about it. Ownership is unchanged: the tag rows are `BZL-TEST-08`'s,
  `external` included. Source: `bazel9-gate-…` Q2.
- **Open questions pruned** — the removal-commit row, the chunking-selector row
  and the `bazel-remote` HTTP-behaviour row are answered and removed; the
  rewind row keeps only its untested default-budget half. Two residues replace
  them: chunking's runtime effect against a capable backend, and rewind
  composed with `retries=5`.

## Sub-artifacts

Wave-2 dives (2026-09-05):

- [`bazel-caching-rbe/action-keys-and-cache-hygiene.md`](bazel-caching-rbe/action-keys-and-cache-hygiene.md)
  — what a REAPI Action digest contains and omits, the spec's sort orders, the
  stamping split, what `Action.salt` really is, and the execution-log diagnostic
  loop written as a runnable sequence.
- [`bazel-caching-rbe/bwob-eviction-and-cache-flags.md`](bazel-caching-rbe/bwob-eviction-and-cache-flags.md)
  — the current dated default for every remote-cache flag that matters, the
  exit-39 eviction path and its three mitigation flags, disk-cache GC, and the
  six-cache taxonomy with a symptom→cache routing table.
- [`bazel-caching-rbe/rbe-readiness-and-cache-trust-boundary.md`](bazel-caching-rbe/rbe-readiness-and-cache-trust-boundary.md)
  — the four mandatory RE-compatible-rule constraints and the ordered readiness
  gate, the cache-poisoning threat model and its two-tier mitigation, and
  `--credential_helper`'s protocol, stabilisation and permanent trust-origin
  gotcha.

Follow-ups and measurements folded in 2026-09-06 (this file commissioned the
first two; the measurements were commissioned against its own Open questions):

- [`bazel-followups/cache-server-capabilities-repo-cache-gc-and-bes.md`](bazel-followups/cache-server-capabilities-repo-cache-gc-and-bes.md)
  — the five-server capability survey and the client's enforcement point,
  repository-cache GC (`#22516`) versus the repo contents cache's shipped
  age-only GC, BES's shared credential surface and the BEP field trap, and the
  compression evidence audit.
- [`bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md`](bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md)
  — the three `bazel-diagnose` decision trees, one discriminating command per
  cache, execution-log tooling ownership (`parser` versus `converter`), and the
  8.x/9.x boundary on the exit-code flag. Cited, never restated: the procedure
  belongs to the skill.
- [`bazel-measurements/exit-39-and-bwob-on-cache-only-build.md`](bazel-measurements/exit-39-and-bwob-on-cache-only-build.md)
  — a real HTTP cache fixture, the BwoB materialisation behaviour per download
  mode, the eviction reproduction across five configurations and two majors, the
  cache-outage result, and the flag/PR-citation audit.
- [`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)
  — every remote-cache and hermeticity flag default read from the 8.7.0, 8.8.0
  and 9.2.0 binaries, including the two "phantom" flags and
  `--incompatible_strict_action_env`.
- [`bazel-measurements/action-key-path-sensitivity-and-execlog.md`](bazel-measurements/action-key-path-sensitivity-and-execlog.md)
  — cross-checkout action-key stability proved by a shared disk cache, the
  execution log's volatile fields, `--explain`'s blindness to a cache hit, and
  the demonstration that the log cannot see output non-determinism.

Wave-5 convergence round, folded in 2026-09-06:

- [`bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md`](bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md)
  — the `--experimental_remote_cache_chunking` / `_function` probe on three
  binaries, the `retries=0` rewind reproduction traced to
  `MAX_REPEATED_LOST_INPUTS`, and the wire-level `no-remote-cache-upload`
  measurement (AC PUT suppressed, CAS PUT still fires) against a real HTTP
  endpoint. Tag ownership stays with `BZL-TEST-08`.
- [`bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md`](bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md)
  — the two named flag-removal commits and the closed-unmerged-but-shipped
  pattern, `--rewind_lost_inputs`'s `UNDOCUMENTED` presence from 8.7.0, and the
  source-level retraction of the `Expect: 100-continue` fixture claim.

## Key sources

| URL | Why it is here |
|---|---|
| [REAPI v2 `remote_execution.proto`](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto) | Ground truth for the Action digest's contents, the two mandated sort orders, `Platform.properties` name-then-value, `SymlinkAbsolutePathStrategy` and `DigestFunction`. |
| `bazel help build --long` / `bazel help startup_options` on the pinned binaries | The authority for every flag default in this file. Re-run 2026-09-06 against real 8.7.0, 8.8.0 and 9.2.0 binaries; it beats the fetched CLI reference, which tracks only the newest release. |
| [Bazel command-line reference](https://bazel.build/reference/command-line-reference) | Useful for prose and categories; **not** version-scoped — the source of two of this file's own retracted claims. |
| [`bazel.build/remote/caching`](https://bazel.build/remote/caching) | "Bazel currently does not track tools outside a workspace"; the `--action_env` whitelisting statement; the disk-cache GC floor in prose. |
| [`bazel.build/remote/cache-remote`](https://bazel.build/remote/cache-remote) | The upstream cache-miss debugging procedure BZL-CACHE-16 is built on, including the two-machine variant. |
| [`bazel.build/remote/cache-local`](https://bazel.build/remote/cache-local) | The status-line format and the "local cache hits are not included in this summary" statement. |
| [`bazel.build/run/build`](https://bazel.build/run/build) | The repository cache "is never cleaned up automatically" and updates **mtime** on every hit — BZL-CACHE-32's basis. |
| [`bazel.build/remote/bep`](https://bazel.build/remote/bep) | BES and the remote endpoints "need to share the same authentication and TLS infrastructure" — BZL-CACHE-33 verbatim. |
| [`src/tools/execlog/README.md`](https://github.com/bazelbuild/bazel/blob/master/src/tools/execlog/README.md) | Corrects the usual paraphrase: the parser **reorders**, it does not diff; and `--sort` belongs to the converter. |
| [`src/main/protobuf/spawn.proto`](https://github.com/bazelbuild/bazel/blob/master/src/main/protobuf/spawn.proto) | "Spawns whose owning action hits the persistent action cache are never reported at all" — why absence from the log is a signal. |
| [`src/main/protobuf/action_cache.proto`](https://github.com/bazelbuild/bazel/blob/master/src/main/protobuf/action_cache.proto) | `ActionCacheStatistics.hits/misses/miss_details` measures the **local** cache, not the remote one. |
| [`bazel.build/remote/rules`](https://bazel.build/remote/rules) | The four mandatory RE-compatible-rule constraints, quoted verbatim into BZL-CACHE-07. |
| [`bazel.build/remote/dynamic`](https://bazel.build/remote/dynamic) | "It is not currently possible to use a cache-only remote system, as a cache miss would be considered a failed action." |
| [`RemoteExecutionService.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/RemoteExecutionService.java) | `buildSalt()` — the only authoritative answer to what Bazel puts in `Action.salt`. |
| [`UploadManifest.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/UploadManifest.java) | `checkAbsoluteSymlinkAllowed` — the exact client-side enforcement point and error text behind BZL-CACHE-31. |
| [Build without the Bytes in Bazel 7](https://blog.bazel.build/2023/10/06/bwob-in-bazel-7.html) | The default flip, the alias-expansion history, and exit 39's introduction, in the maintainers' own words. |
| [BuildBuddy — Unusual Builds with Bytes](https://www.buildbuddy.io/blog/unusual-builds-w-bytes/) | The full mechanism behind the 1.8 MB → 640 MB measurement, the `du -h` reproduction, the dated 8.2.0/7.6.0 comment, and the caveat against the obvious workaround. The **only** evidence for that floor — see the two PR rows below. |
| [`bazelbuild/bazel#25398`](https://github.com/bazelbuild/bazel/pull/25398) | The TTL-fix proposal — `CLOSED`, `mergedAt: null`. Cited here as a worked example of a citation that does not establish what it was cited for. |
| [`bazelbuild/bazel#25334`](https://github.com/bazelbuild/bazel/pull/25334) | The exit-code flag deletion — `CLOSED`, `mergedAt: null`, yet the change **shipped**: closed the same day the internal sync landed the identical commit. The worked counter-example to reading `mergedAt: null` as "did not ship". |
| [`91b1e8e2`](https://github.com/bazelbuild/bazel/commit/91b1e8e28afc7f76ed5930b469b23fd13303eda3) / [`30ca50950f`](https://github.com/bazelbuild/bazel/commit/30ca50950fdaff032925efe64c2690a9f05e074d) | The two named removal commits, eight months apart: the exit-code flag (2025-02-20) and `--experimental_remote_merkle_tree_cache*` (2025-10-14, incidental to a Merkle-tree rewrite). Neither touches the eviction-retry path. |
| [`bazelbuild/bazel#30585`](https://github.com/bazelbuild/bazel/pull/30585) | The `rep_max_cdc` chunking-selector proposal — `closed`, `merged: false`, zero comments, targeted `release-8.8.0`. `GrpcCacheClient.java` hardcodes `FAST_CDC_2020` at 8.8.0 and 9.0.0: the selector shipped nowhere. |
| [`BuildRequestOptions.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/buildtool/BuildRequestOptions.java) / [`ActionRewindStrategy.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/ActionRewindStrategy.java) | `--rewind_lost_inputs`'s `documentationCategory` across five tags (why `help --long` reads "absent" on 8.x) and `MAX_REPEATED_LOST_INPUTS = 20`, the hard-coded ceiling behind the `#21` text. |
| [`HttpCacheClient.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/remote/http/HttpCacheClient.java) | Class Javadoc: uploads "do not use `Expect: 100-CONTINUE` headers" — the source that retracts Verdict 18e's fixture-side claim. |
| [`bazelbuild/bazel#4276`](https://github.com/bazelbuild/bazel/issues/4276) | The cache-poisoning threat model and the execution-gated-write mitigation, from a maintainer. |
| [`bazelbuild/bazel#30439`](https://github.com/bazelbuild/bazel/issues/30439) | The `--credential_helper` trust-origin bypass, reproduced on 9.2.0 and closed as intended behaviour — permanent, not a stopgap. |
| [`bazelbuild/bazel#22516`](https://github.com/bazelbuild/bazel/issues/22516) | Repository-cache GC: open, P2, zero comments since 2024-05-23, no milestone. The evidence for "do not expect one". |
| [`bazelbuild/bazel#26080`](https://github.com/bazelbuild/bazel/pull/26080) | Repo contents cache GC — the touch-then-age-out mechanism behind `--repo_contents_cache_gc_max_age`. |
| [`bazelbuild/bazel#18997`](https://github.com/bazelbuild/bazel/issues/18997) | The only first-hand, numbers-bearing compression measurement anywhere: 3-5× heap, a public repro repo, and a maintainer's 750 %-inflation micro-benchmark. |
| [Bazel credential-helper design proposal](https://github.com/bazelbuild/proposals/blob/main/designs/2022-06-07-bazel-credential-helpers.md) | The actual subprocess protocol and host-pattern scoping the helper rules depend on. |
| [EngFlow — The Many Caches of Bazel](https://blog.engflow.com/2024/05/13/the-many-caches-of-bazel/) | The cache taxonomy behind BZL-CACHE-15's routing discipline, extended here with the repo contents cache. |
| [`buchgr/bazel-remote` `server/grpc.go`](https://github.com/buchgr/bazel-remote/blob/master/server/grpc.go) | The fleet's own backend: `SymlinkAbsolutePathStrategy_ALLOWED` and `[SHA256]` both hardcoded, with no knob for either. |
| [`bazelbuild/bazel-buildfarm` `NodeInstance.java`](https://github.com/bazelbuild/bazel-buildfarm/blob/main/src/main/java/build/buildfarm/instance/server/NodeInstance.java) / [NativeLink `capabilities_server.rs`](https://github.com/TraceMachina/nativelink/blob/main/nativelink-service/src/capabilities_server.rs) / [BuildBuddy `capabilities_server.go`](https://github.com/buildbuddy-io/buildbuddy/blob/master/server/remote_cache/capabilities_server/capabilities_server.go) | The other half of the survey: `DISALLOWED`, `DISALLOWED`, `ALLOWED` — all three hardcoded, proving the split is a per-server compile-time choice. |
| [Bazel 9 LTS announcement](https://blog.bazel.build/2026/01/20/bazel-9.html) | WORKSPACE support code fully removed, which dates every `rbe_autoconfig`-shaped setup snippet as impossible rather than merely stale. |

---
title: RBE readiness and the cache trust boundary
topic: rbe-readiness-and-cache-trust-boundary
group: bazel-caching-rbe
family: BZL-CACHE
agent: wave2-researcher (bazel-caching-rbe/rbe-readiness-and-cache-trust-boundary)
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 18
primary_sources_count: 16
settles: [M-D-03, M-D-04, M-D-10, M-D-11, M-D-12, M-D-13]
scope: >
  Two once-per-repo decisions: is remote execution reachable at all (the
  mandatory RE-compatible-rule constraints, the cache-only/dynamic-execution
  impossibility, the readiness gate), and who may write to the cache (the
  cache-poisoning threat model, the two-tier read/write split, and
  --credential_helper). Does not cover action-key composition or Merkle/env
  ordering (bazel-caching-rbe/action-keys-and-cache-hygiene.md), BwoB flag
  defaults, exit code 39, or cache TTL/eviction/compression tuning
  (bazel-caching-rbe/bwob-eviction-and-cache-flags.md), or repository-rule
  hermeticity mechanics beyond citing the gate they feed
  (bazel-hermeticity-determinism/*).
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

- Remote execution has four mandatory rule-shape constraints, stated directly by Bazel's own docs, not optional style advice: resolve tools via a toolchain (never host `PATH`/`JAVA_HOME`), declare every tool dependency explicitly, never mutate the host outside the runfiles tree, and never ship a tool binary you are not sure runs on the execution platform.
- A design that bakes an absolute, machine-specific install path into its own launchers (the "nixpkgs model") cannot be made RE-compatible by flags — it needs a shape change first. `rules_ocx` is the fleet's own worked example of this, confirmed at README.md:266-270.
- Dynamic execution is spec-impossible against a cache-only backend: Bazel's own docs state plainly that a cache miss would be read as a failed action, so `--dynamic_local_strategy`/`--dynamic_remote_strategy` require a real `--remote_executor`, not just `--remote_cache`.
- Cache poisoning is a real, demonstrated threat independent of RE: a write-capable actor can plant a backdoored tool an unrelated later build then downloads and executes instead of compiling from source ([bazelbuild/bazel#4276](https://github.com/bazelbuild/bazel/issues/4276); independently reproduced in the [bazel-discuss thread](https://groups.google.com/g/bazel-discuss/c/0005BAB_mlI)).
- The mitigation both primary sources converge on is a two-tier split: a broad, unauthenticated *read* tier, and a narrow, gated *write* tier — ideally the execution system itself (only the RE worker's own action-cache write, gated on action success), or, absent RE, a single CI role gated on an event untrusted contributors cannot trigger.
- `rules_ocx` already implements the portable form of that split correctly: PRs and forks get `--remote_upload_local_results=false` and no write credential in their environment at all; only a `push` to `main` supplies the write credential (`.github/actions/remote-cache/action.yml:27-34` plus `.github/workflows/ci.yml:30,56` — fleet repo, cited in full under Fleet evidence below).
- `--credential_helper` has been stable since Bazel 7.0 (`bazelbuild/bazel` CHANGELOG for the 7.0.0 tag lists "Declare credential helpers to be a stable feature. (#18752)"), replacing the bare `--remote_header=authorization="Basic <token>"` pattern the fleet still uses.
- The credential-helper protocol is a subprocess contract: Bazel writes `{"uri": "..."}` to the helper's stdin and expects `{"headers": {"name": ["value", ...]}}` on stdout; a non-zero exit or malformed JSON aborts the build. Configured with `--credential_helper=[<pattern>=]<path>`, where `<pattern>` is a DNS name or `*.`-wildcard scoping which remote host the helper applies to.
- A very recent, still-live gotcha qualifies any "just turn on `--credential_helper`" advice: setting it in a *committed*, workspace-level `.bazelrc` to a `%workspace%`-relative path lets anyone who clones the repo and runs even a read-only command (`bazel query //...`) execute an attacker-controlled binary with their full shell environment, before the sandbox engages and with no trust-origin check ([bazelbuild/bazel#30439](https://github.com/bazelbuild/bazel/issues/30439), reproduced on Bazel 9.2.0, closed 2026-08-11 as Google's own OSS VRP panel's "intended behavior" call). The flag must be set from a user-, machine-, or CI-level rc — never from a file that ships with the repository.
- The owner has already decided the MUST/SHOULD split for this fleet (frame Corrections, Decisions table row 6): `--credential_helper` is **MUST** for a new setup and **SHOULD** for an existing one, because it costs nothing to adopt new (stable since 7.0) but migrating a live setup means rotating a credential a running CI pipeline depends on.
- A cache-only setup does not fall back to local execution on a cache outage unless `--incompatible_remote_local_fallback_for_remote_cache` is explicitly set — it defaults `false`, so an unavailable cache is a hard build failure, not a graceful degrade, until someone opts in.
- Sandboxing is documented as a rehearsal for remote execution ("mimics the behavior of remote execution") — a sandbox-clean build is a cheap necessary precondition to check before ever touching `--remote_executor`, though not sufficient on its own (RE workers add network isolation and multi-tenancy the local sandbox does not).
- Read-side cache disclosure (an unauthenticated cache leaking build inputs/outputs to anyone who can reach it) is a distinct threat from write-poisoning, named in the map (M-D-05) but explicitly not settled here — the fleet has no publicly reachable endpoint today, so this stays a documented gap rather than a shipped MUST.
- No fleet repo runs remote execution; RBE guidance in the shipped rule set targets the future adopting monorepo (shape F), never `rules_ocx` (shape A) itself.

## Findings

### 1. The mandatory RE-compatible-rule constraints

[`bazel.build/remote/rules`](https://bazel.build/remote/rules) (fetched 2026-09-05) states the shape a rule or macro must have before remote execution is safe to turn on, in four parts:

1. **No host `PATH`/`JAVA_HOME` lookups.** Quoted: *"use a toolchain rule instead of invoking build tools via the `PATH`, `JAVA_HOME`, or other local variables that may not be set to equivalent values (or at all) in the remote execution environment."*
2. **Every tool dependency declared explicitly.** Quoted: *"Some build tools retain state across build actions and access dependencies that have not been explicitly included in the tool invocation, which will cause remotely executed build actions to fail."*
3. **No host-mutating repository rules or actions.** Quoted: *"Avoid creating files outside of the Bazel `runfiles` tree, creating environment variables, and similar actions, as they may behave unexpectedly on the remote execution platform."*
4. **Platform-appropriate tool binaries only.** Quoted: *"Do not ship binaries of build tools required by your build with your source code unless you are sure they will safely run in your execution platform."*

These are correctness requirements, not tuning knobs — a repo that violates any of them does not get a slower RE build, it gets a build that silently or loudly fails on a worker that lacks whatever ambient state the local machine happened to supply.

### 2. Sandboxing as an RE rehearsal, not RE itself

[`bazel.build/docs/sandboxing`](https://bazel.build/docs/sandboxing) states directly: *"Sandboxing mimics the behavior of remote execution — if a build works well with sandboxing, it will likely also work with remote execution."* Three strategies exist: `linux-sandbox` (namespaces, can optionally also block network access), `darwin-sandbox` (`sandbox-exec`), and `processwrapper-sandbox` (the portable, POSIX-only fallback with no namespace isolation — the one Windows gets). A sandbox-clean build is the cheapest first check in the RE-readiness gate below, but it is necessary, not sufficient: RE workers add cross-tenant isolation and network policy the local sandbox does not exercise identically.

### 3. Dynamic execution requires a real executor, not just a cache

[`bazel.build/remote/dynamic`](https://bazel.build/remote/dynamic) (fetched 2026-09-05): *"It is not currently possible to use a cache-only remote system, as a cache miss would be considered a failed action."* Dynamic execution races a local branch (`--dynamic_local_strategy`, e.g. `worker,sandboxed`) against a remote branch (`--dynamic_remote_strategy`) and takes whichever finishes first; *"if one of the branches of dynamic execution finishes first but is a failure, the entire action fails"* — deliberate, to surface local/remote discrepancies rather than mask them. None of this is optional tuning against a cache-only deployment: the remote branch of a dynamic-execution race needs an executor to race against, and a plain cache endpoint cannot fill that role. This settles M-D-11: a team must never propose dynamic execution as a "free win" layered on top of an existing remote cache alone.

### 4. The nixpkgs-model counter-example: RE is a shape question before it is a flag question

[`bazel.build/remote/rbe`](https://bazel.build/remote/rbe) is thin by design and defers to `/remote/rules` for the actual constraints — its own value here is confirming that RE is framed as "reuse of build outputs across a development team" layered on top of the same execution model, not a separate contract. The fleet's own `rules_ocx` is the worked counter-example that shows why the constraints in Finding 1 are not academic: its README states, currently at lines 266–270:

> *"Remote execution is a non-goal for now: launchers reference absolute `OCX_HOME` store paths (the nixpkgs model). Use `isolated_home = True` to keep a store per repository if you need stricter isolation — at the cost of a full per-repository re-download, and it cannot be combined with `bins` (lazy provisioning) below."*

(The topic map cites this passage at README.md:246-249; the file has since drifted four lines — current content is unchanged in substance, only the line numbers moved. Cite the number you actually measure, not the one a prior wave recorded — this is the map's own conflict-13 lesson: measured beats documented.)

A launcher that resolves `$OCX_HOME/<content-hash>/bin/tool` at run time depends on that path having been populated by a prior, out-of-band provisioning step on *that specific machine*. An RE worker is not that machine — Constraint 3 above (no host-mutating repository rules) and Constraint 1 (no ambient-variable tool resolution) are both violated by construction, not by omission. This is the portable lesson: before `--remote_executor` is even a question, check whether any part of the build's own output *references its own location on the machine that built it*. If yes, the fix is architectural (repackage as a relocatable, hermetic tool input; drop the shared-store model; or accept cache-only forever) — no flag closes this gap.

### 5. The cache-poisoning threat model and the two-tier mitigation

[`bazelbuild/bazel#4276`](https://github.com/bazelbuild/bazel/issues/4276) ("Saving the remote cache from cache poisoning?", filed 2017-12-11) states the concrete failure: a CI instance with a disk-space problem exits 0 on an action but uploads a malformed output; once a bad Action-Cache entry is live, every later build that accepts it inherits the corruption, and if the corrupted output is itself an executable tool, "the wrong action proto gets uploaded to the cache" and poisons builds. Maintainer reply (ola-rozenfeld): *"allowing machines to set your remote cache results is a big problem. CI-specific machines is better than dev ones... but it's still not bulletproof."* The mitigation that reply names as actually working in their own system: *"only the remote execution server is allowed to write the AC entry, after the action has succeeded on the worker."* — i.e., the write-capable actor is the execution system itself, not any client machine.

The [bazel-discuss thread "Security risks of a publicly available remote HTTP cache"](https://groups.google.com/g/bazel-discuss/c/0005BAB_mlI) (2023-02-14) independently converges on the same shape from the opposite direction — a client-write threat, not a server-write one. Quoted attack (Alexandre Rostovtsev): *"Imagine a malicious client uploads a backdoored foobar-compiler-1.0 binary into your cache. You invoke a bazel build command... Bazel happily downloads the backdoored binary from the remote cache instead of building from source, executes the backdoored binary."* Mitigation (Fredrik Medley): *"For the AC (action cache), you should restrict uploads to trusted users only, e.g. your remote execution system."* No Bazel maintainer responded in that thread, but a community member confirmed the attack is reproducible by referencing CAS files from a forged AC entry.

**The two-tier mitigation, stated generally**: a *broad* tier (every build client — dev machines, PR runners, forks) gets read-only, unauthenticated cache access; a *narrow* tier (the RE execution system itself, or, absent RE, exactly one CI role gated on an event untrusted contributors cannot trigger) holds the only credential capable of writing an Action-Cache entry. Read being public is not itself the vulnerability; write being equally available as read is. This settles M-D-04.

### 6. `--credential_helper`: protocol, stabilization, and a live trust-origin gotcha

The [Credential Helpers for Bazel design proposal](https://github.com/bazelbuild/proposals/blob/main/designs/2022-06-07-bazel-credential-helpers.md) (created 2022-06-07, status **Implemented**, last updated 2023-06-13) specifies the actual protocol: Bazel spawns `<path> get`, writes `{"uri": "<the endpoint URI>"}` to its stdin, and expects `{"headers": {"name1": ["value1", ...]}}` on stdout; a non-zero exit code or invalid JSON aborts the build with a `FailureDetail`. Multiple helpers are scoped by host pattern: `--credential_helper=<pattern>=<path>`, where `<pattern>` is a DNS name (`example.com`) or a `*.`-prefixed wildcard (`*.example.com`); the most specific match wins, and with no matching helper Bazel sends no credentials at all (no implicit default). The design explicitly names the pattern it replaces: *"there's `--remote_header`, but also `--bes_header`... which makes this way of providing credentials not very ergonomic"* and calls out `.netrc`/plaintext-`.bazelrc` credentials as insecure by construction.

Stabilization: the `bazelbuild/bazel` CHANGELOG.md at the `7.0.0` tag lists *"Declare credential helpers to be a stable feature. (#18752)"* among its entries — this is what "stable since Bazel 7.0" cites (an earlier tracking issue, [#18751](https://github.com/bazelbuild/bazel/issues/18751), targeted "6.3.0" in its title but was forked/superseded and the change actually shipped in the 7.0.0 release). Bazel 7.0's own LTS announcement corroborates the surrounding release ([blog.bazel.build/2023/12/11/bazel-7-release.html](https://blog.bazel.build/2023/12/11/bazel-7-release.html)), though it does not itself mention credential helpers — the changelog is the primary source for that specific claim, not the blog post.

**The gotcha** — [`bazelbuild/bazel#30439`](https://github.com/bazelbuild/bazel/issues/30439) ("Bazel `--credential_helper` Trust Boundary Bypass via Workspace `.bazelrc`", filed 2026-07-23, closed 2026-08-11): setting `common --credential_helper=%workspace%/tools/credential-helper` in a *committed* `.bazelrc` means `CommandLinePathFactory.java` resolves that `%workspace%`-relative path with, quoted from the report, *"no check on where the option came from"*, and `CredentialHelper.java` then spawns it *"with the full client environment"* — before the sandbox engages, and even for a read-only invocation like `bazel query //...`. The reporter's own reproduction: clone a repo whose `.bazelrc` points at a helper script that just echoes `{"headers":{}}` while writing evidence to `/tmp`; running `bazel query //...` against the freshly-cloned repo executes it silently, no prompt, no warning — confirmed on Bazel 9.2.0. Google's OSS VRP panel assessed this as **intended behavior** under Bazel's documented threat model (anyone who controls `.bazelrc`/`BUILD`/`.bzl` in a workspace you build is already fully trusted) and the issue is closed with no fix planned. This is not a bug that will be patched — it is a permanent property of where the trust boundary actually sits. The actionable consequence: `--credential_helper` must be configured from a rc file that does **not** ship with the repository (user rc, machine rc, or CI-injected flags/env) — never from a workspace-committed `.bazelrc`, and especially never as a `%workspace%`-relative path.

### 7. Cache-outage fallback is opt-in, not automatic

`--incompatible_remote_local_fallback_for_remote_cache` defaults **false** (current command-line reference, fetched 2026-09-05); `--remote_local_fallback` (the general remote-execution fallback flag) also defaults **false**. For a cache-only deployment (`--remote_cache` set, no `--remote_executor`), this means a cache-service outage is a hard build failure unless a team explicitly opts into local fallback — the "does a cache-only setup fall back to local execution" question (M-D-10) resolves to: not unless you turn it on. `rules_ocx` sets neither flag today (confirmed absent via `grep -rn "remote_local_fallback"` returning nothing across every `.bazelrc*`/workflow/action file, per [`build-contracts-and-ci-posture.md`§4](../bazel-audit/build-contracts-and-ci-posture.md)), meaning any outage of `bazel-cache.ocx.sh` is currently a hard CI failure across every cache-using job, not a graceful slowdown.

### 8. BES shares the same trust surface as remote cache/execution

[`bazel.build/remote/bep`](https://bazel.build/remote/bep) (fetched 2026-09-05): the Build Event Service accepts `--bes_backend=[SCHEME://]HOST[:PORT]` (`grpc://` or `grpcs://`); because a remote BES server cannot read a local build's log files directly, Bazel's own docs point teams at pairing BES with remote caching so referenced artifacts are fetchable from the cache instead — and consequently *"the Build Event Service and Remote Execution Endpoints need to share the same authentication and TLS infrastructure."* A credential rotation that updates `--remote_header`/`--credential_helper` but not whatever `--bes_backend` uses (or vice versa) silently breaks one surface while leaving the other looking fine. This is a narrow operational footgun rather than a settled M-ID for this dive, but it is directly relevant wherever a team is migrating off a bare token (Finding 6) at the same time it stands up BES.

## Decisions

**Decision 1 — RE-readiness is a structural gate, checked before any flag.** Evidence: `remote/rules`' four constraints (Finding 1) plus the fleet's own worked failure (Finding 4, `rules_ocx` README.md:266-270). The shipped rule states RE-readiness as an ordered gate (below), not as prose advice, and the guidance targets shape F (the future adopting monorepo) exclusively — `rules_ocx` itself never gets RE guidance because it structurally cannot pass gate step 1. Assumption named: any design whose own artifacts embed a reference to their own build-time location (a store path, an absolute install prefix, a baked-in shebang to a machine-specific interpreter) fails the gate regardless of ruleset or language, and the fix is a redesign, not a flag — this generalizes past OCX's specific nixpkgs model.

**Decision 2 — the portable trust-boundary pattern is the two-tier read/write split, not "rules_ocx's setup."** Evidence: two independent primary sources ([#4276](https://github.com/bazelbuild/bazel/issues/4276), [bazel-discuss](https://groups.google.com/g/bazel-discuss/c/0005BAB_mlI)) converge on the same shape from opposite directions (a misbehaving trusted writer vs. a malicious untrusted one), and `rules_ocx` already implements a correct instance of it (Fleet evidence, below). The shipped rule states the pattern generically — broad read tier, narrow gated write tier, credential absent (not just unused) outside that tier — with `rules_ocx`'s CI wiring cited only as a worked example, never as the pattern's definition. Assumption: "narrow" means gated on an event untrusted contributors cannot trigger (a push to a protected branch, not merely "not a PR" — a same-repo PR is still untrusted content by this standard, and `rules_ocx` correctly treats it that way).

**Decision 3 — `--credential_helper` is MUST for a new setup, SHOULD for an existing one.** This was already decided by the owner (frame Corrections, "Decisions taken by the orchestrator" table, row 6, given a plaintext write credential in `rules_ocx`'s gitignored `.bazelrc.user` is the fleet's current state). This dive's evidence firms up why the split holds rather than "MUST" everywhere: adoption cost for a *new* setup is zero (stable since 7.0.0, no version floor to clear), while migrating an *existing* setup means rotating a live secret a running CI pipeline depends on — a real, one-time operational cost the owner's "fleet fix filed separately" note acknowledges rather than mandates on this artifact's timeline. Added qualifier this dive contributes: the MUST for a new setup carries a second clause — configure the helper from a non-workspace-committed rc file (Finding 6) — because a naive "just add `--credential_helper=%workspace%/...` to `.bazelrc`" migration would trade one credential-hygiene problem for a worse one (arbitrary code execution on clone-and-query, per [#30439](https://github.com/bazelbuild/bazel/issues/30439)).

## Normative guidance candidates

1. **Before proposing `--remote_executor` for any repo, check whether any generated launcher, wrapper, or action output embeds a hardcoded absolute path rooted outside the workspace** (a package-manager store, `$HOME`, any machine-specific install prefix).
   Rationale: an RE worker never ran the provisioning step that populated that path; the action either can't find it or picks up another tenant's leftover content.
   Verify: read every `.bzl` site that emits launcher/wrapper file content (string concatenation defeats `grep`) for a hardcoded absolute-path pattern; a repo-specific mechanical pass is `grep -rn '"/home/\|"/Users/\|\$HOME'` over generator templates as a first filter, followed by manual review of what it misses.
   Empty output on the grep does not mean pass — treat it as inconclusive and complete the manual review.
   Severity: MUST. Bazel: all (7/8/9). Settles: M-D-12.

2. **Resolve every tool a rule invokes through a declared toolchain or `File` input, never through the invoking shell's `PATH`/`JAVA_HOME`.**
   Rationale: `remote/rules` states these variables "may not be set to equivalent values (or at all) in the remote execution environment."
   Verify: named reading heuristic — read every `ctx.actions.run`/`run_shell` call's `executable=`; a bare string literal (not sourced from an attr or a registered toolchain) is a finding.
   Empty finding list = pass.
   Severity: MUST. Bazel: all. Ruleset: any (applies to rule/macro authors regardless of language). Settles: M-D-13.

3. **Do not ship a build tool's binary in source control unless you have verified it runs on the actual execution platform.**
   Rationale: `remote/rules`, verbatim: "Do not ship binaries of build tools required by your build with your source code unless you are sure they will safely run in your execution platform."
   Verify: named reading heuristic — for every checked-in binary referenced by a `BUILD`/`.bzl` file, confirm a platform constraint or toolchain resolution selects the matching one per execution platform; a single binary used unconditionally across all platforms is a finding.
   Empty finding list = pass.
   Severity: MUST for any repo turning RE on. Bazel: all. Settles: M-D-13.

4. **No repository rule or action reachable by an RE-bound target may create files outside the Bazel-managed tree or set persistent environment variables.**
   Rationale: `remote/rules`: such actions "may behave unexpectedly on the remote execution platform."
   Verify: cross-reference the non-hermetic-operation check owned by `bazel-hermeticity-determinism/sandbox-environment-and-toolchain-leakage.md` (the `.execute`/unchecksummed `.download`/`.symlink`/`.os`/`.which` grep via `--experimental_workspace_rules_log_file`). This candidate gates RE readiness on that check's result — it does not re-derive the check itself.
   A clean report there = pass for this gate step.
   Severity: MUST. Bazel: all. Settles: M-D-13.

5. **Validate a sandbox-clean build before ever pointing `--remote_executor` at a real backend.**
   Rationale: sandboxing docs, verbatim: "mimics the behavior of remote execution — if a build works well with sandboxing, it will likely also work with remote execution."
   Verify: `bazel test //... --spawn_strategy=sandboxed` (or the platform default sandbox) passes fully.
   All green = proceed to the next gate step; any failure = fix before RE, not after.
   Severity: SHOULD (a strong precondition, not itself sufficient proof of RE-readiness). Bazel: all. Settles: M-D-13.

6. **Never enable dynamic execution (`--dynamic_local_strategy`/`--dynamic_remote_strategy`) when the deployment configures only `--remote_cache`, with no `--remote_executor`.**
   Rationale: Bazel's own docs state a cache miss under a cache-only backend "would be considered a failed action" — dynamic execution's remote branch has nothing to race against.
   Verify: `grep -n 'dynamic_local_strategy\|dynamic_remote_strategy' *.bazelrc*` non-empty AND `grep -n 'remote_executor' *.bazelrc*` empty ⇒ finding.
   Empty output on the first grep = pass (dynamic execution not attempted).
   Severity: MUST. Bazel: all. Settles: M-D-11.

7. **State explicitly whether a cache-only setup should fall back to local execution on a cache outage; do not rely on the flag's default.**
   Rationale: `--incompatible_remote_local_fallback_for_remote_cache` defaults `false` (current command-line reference) — an unavailable cache is a hard build failure by default, not a graceful degrade.
   Verify: `grep -n 'incompatible_remote_local_fallback_for_remote_cache\|remote_local_fallback' *.bazelrc*`.
   Empty output = the default (no fallback) is silently in effect; treat as a finding unless the repo has a written, deliberate reason to accept hard-fail-on-outage.
   Severity: SHOULD. Bazel: all (flag introduced 7.0, default unchanged through 9.x). Settles: M-D-10.

8. **Every CI lane that untrusted content can trigger (a pull request, especially from a fork) must run the remote cache read-only, with the write credential absent from that lane's environment entirely — not merely unused.**
   Rationale: [#4276](https://github.com/bazelbuild/bazel/issues/4276) and the [bazel-discuss thread](https://groups.google.com/g/bazel-discuss/c/0005BAB_mlI): any write-capable actor can plant a tool a later trusted build then executes.
   Verify: confirm the write credential is gated on an event untrusted content cannot trigger (e.g. GitHub Actions `github.event_name == 'push'` to the protected branch), and that `--remote_upload_local_results=false` is unconditional on every other path.
   Empty output on `grep -n 'remote_upload_local_results=false'` scoped to the PR-triggered job's effective flags = finding (a PR lane can write).
   Severity: MUST. Bazel: all. Settles: M-D-04.

9. **Never carry a cache-write credential as a bare `--remote_header=authorization=...` (or any static bearer token in an rc file, gitignored or not) for a new remote-cache setup.**
   Rationale: a static token is a long-lived, unscoped secret readable by anything that can read the file, with no expiry and no automatic rotation.
   Verify: `grep -n 'remote_header' *.bazelrc*`.
   A match on a **new** setup is the finding; on an **existing** setup it is a tracked, accepted gap (see candidate 10), not itself a blocking finding.
   Severity: MUST for new setups, SHOULD for existing ones. Bazel: 7.0+ (helper protocol requires it). Settles: M-D-03.

10. **For an existing setup still on a bare token, adopt `--credential_helper` on a stated timeline rather than treating the token as permanent.**
    Rationale: owner decision (Decisions, item 3) — stable since 7.0.0, zero version-floor cost, but migration requires rotating a live secret.
    Verify: named reading heuristic — the repo's own docs or issue tracker names a tracked item for the migration; its absence is the finding.
    Severity: SHOULD. Bazel: 7.0+. Settles: M-D-03.

11. **When `--credential_helper` is configured, it must come from a rc file that does not ship with the repository — never a workspace-committed `.bazelrc`, and never a `%workspace%`-relative helper path.**
    Rationale: Bazel resolves and executes the helper with the full client environment, before the sandbox engages, with no trust-origin check on where the flag was set — confirmed exploitable on Bazel 9.2.0 and closed by Google's own VRP panel as intended behavior, not a bug that will be fixed ([#30439](https://github.com/bazelbuild/bazel/issues/30439)).
    Verify: `grep -n 'credential_helper' .bazelrc MODULE.bazel* $(git ls-files | grep -v '\.bazelrc\.user$')` — any match outside a gitignored/user-level file is a finding.
    Empty output = pass.
    Severity: MUST. Bazel: all (the flag exists 7.0+; the trust-origin property predates it and is unrelated to version). Settles: M-D-03.

12. **Write access to the Action Cache must be strictly narrower than read access — never symmetric.**
    Rationale: same two sources as candidate 8, stated as a standalone principle so it also covers non-CI producers (a developer's own machine should never default to holding the write credential).
    Verify: named reading heuristic — enumerate every actor (CI role, developer default config, any documented alternate path) that could plausibly hold the write credential; more than one un-gated actor is the finding.
    Severity: MUST. Bazel: all. Settles: M-D-04.

13. **Record a structural RE "no" in the repository's own docs when the gate above fails, rather than leaving it as tribal knowledge.**
    Rationale: `rules_ocx` states its own limitation plainly in its README; the alternative is someone later spending a debugging session rediscovering a known structural incompatibility.
    Verify: named reading heuristic — grep top-level docs for "remote execution"/"RBE"; a design that fails gate step 1 (candidate 1) with no such statement anywhere is the finding.
    Severity: SHOULD. Bazel: all. Settles: M-D-12.

14. **A CI job whose entire purpose is proving hermetic, offline, or registry-parity behavior should run without any remote cache, and should say why in an adjacent comment.**
    Rationale: a cache hit on such a job proves cache-warmth, not the property the job exists to assert — the fleet's own two such jobs (`ci.yml:98-99`, `171-172`) each carry the "why" comment that makes the omission legible rather than looking like an oversight.
    Verify: for every job/task lacking the remote-cache setup, confirm an adjacent comment names the reason.
    Empty comment where the cache is absent = finding.
    Severity: CONSIDER (argued from one repo's convention plus the map's own reasoning, not a spec). Bazel: all. Adjacent to M-D-14 (not itself settled by this dive — see Contested).

15. **If a remote cache is ever made reachable without authentication for reads, treat that as a distinct, separately-tracked risk from write-poisoning.**
    Rationale: anonymous reads disclose build inputs/outputs, a different harm than a poisoned write, and is easy to wave away as "it's just a cache" once write access is already locked down.
    Verify: attempt an unauthenticated read against the deployed cache endpoint from outside the trusted network; a `200` with content is the finding.
    Severity: CONSIDER — no current fleet exposure (single non-public endpoint); this is a first check to run only if a cache is newly exposed. Bazel: all. Adjacent to M-D-05 (deferred by the map, not settled here).

16. **When rotating a remote-cache/RE credential, check `--bes_backend` for shared authentication/TLS configuration before declaring the rotation complete.**
    Rationale: Bazel's own BEP docs state the Build Event Service and Remote Execution endpoints "need to share the same authentication and TLS infrastructure" — rotating one silently breaks the other if they're not both updated.
    Verify: `grep -n 'bes_backend\|remote_header\|credential_helper' *.bazelrc*`; if `bes_backend` and either credential mechanism both appear, confirm the rotation runbook names both.
    Severity: CONSIDER (operational footgun, not a correctness gate). Bazel: all.

## Fleet evidence

- **`rules_ocx` cannot use RBE, by design, not by omission.** `README.md:266-270` (measured 2026-09-05; the topic map's own citation of `246-249` has drifted four lines — content unchanged): *"Remote execution is a non-goal for now: launchers reference absolute `OCX_HOME` store paths (the nixpkgs model)."* Confirmed independently by `grep -rn "remote_executor" .` across every `.bazelrc*`/workflow/action file returning no output ([`build-contracts-and-ci-posture.md`§4](../bazel-audit/build-contracts-and-ci-posture.md)).
- **The two-tier trust boundary is already implemented correctly.** `.github/actions/remote-cache/action.yml:27-34`: the action always writes `build --remote_cache=https://bazel-cache.ocx.sh` and `build --remote_timeout=60`; when `$BAZEL_CACHE_AUTH` is non-empty it appends `build --remote_header=authorization="Basic $BAZEL_CACHE_AUTH"` (line 32), otherwise it appends `build --remote_upload_local_results=false` (line 34). `.github/workflows/ci.yml:30` and `:56` gate `auth` identically in both the `lint` and `test` jobs: `${{ github.event_name == 'push' && secrets.BAZEL_CACHE_AUTH || '' }}` — every PR, including same-repo PRs, gets the empty string and therefore read-only, anonymous-read access; the write secret is simply not materialized outside a `push` event.
- **The write credential is a bare token, the exact pattern candidate 9 flags.** `.bazelrc.user` (gitignored, 494 bytes, confirmed present and UTF-8 text but not read beyond that per this program's SECRETS instruction) receives the `--remote_header=authorization="Basic ..."` line from the action above. This is the fleet's own live instance of Decision 3's SHOULD-not-MUST case: an existing setup with a real migration cost, not a hypothetical.
- **No RBE flag exists anywhere in the fleet.** `grep -rn "remote_executor\|bes_backend\|disk_cache\|remote_download" .` over every `.bazelrc*`/workflow/action file returns nothing ([`build-contracts-and-ci-posture.md`§4](../bazel-audit/build-contracts-and-ci-posture.md)) — no BES, no disk cache, no explicit BwoB tuning; whatever the Bazel-version default is applies unmodified.
- **No fallback flag is set.** Neither `--remote_local_fallback` nor `--incompatible_remote_local_fallback_for_remote_cache` appears anywhere in the fleet's rc/workflow/action files (same grep sweep), meaning candidate 7 is currently an open finding against `rules_ocx`'s own CI: an outage of `bazel-cache.ocx.sh` is a hard failure across the lint and test jobs, with no stated rationale for accepting that.
- **Two jobs deliberately opt out of the cache, each with a reason on record** (candidate 14): `ci.yml:98-100`, quoted: *"Deliberately NO remote cache: this job has to build exactly what BCR's own presubmit builds, on infrastructure BCR cannot reach. A cache hit here would hide a break that BCR would then find in the submission PR."* `ci.yml:171-172`, quoted: *"Deliberately NO remote cache: this job asserts hermetic offline behaviour, which a network-backed cache would mask."* The `examples` job has no such comment and no remote-cache step at all — an omission with no stated rationale, distinct from the two deliberate ones (noted by the audit, not itself one of this dive's settled M-IDs).

## AI-agent angle

- **Recommending WORKSPACE-era RBE setup.** Bazel's own [`remote/ci`](https://bazel.build/remote/ci) page still instructs readers to add an `rbe_autoconfig` target via a `bazel-toolchains` WORKSPACE dependency — flatly impossible on Bazel 9, which removed WORKSPACE support entirely. Mechanical check: any RBE setup snippet that mentions `rbe_autoconfig`, `bazel-toolchains`, or a `WORKSPACE`/`WORKSPACE.bazel` edit is stale; reject it outright on a Bzlmod-only (Bazel 8+) repo.
- **Citing `--experimental_credential_helper` instead of `--credential_helper`.** The pre-7.0 experimental flag name still appears in training-data-era material. Mechanical check: `grep -rn 'experimental_credential_helper'` over any proposed rc snippet — any hit on a Bazel 7.0+ target is wrong.
- **Treating a "just add `--credential_helper` to `.bazelrc`" migration as strictly safer than the token it replaces.** As Finding 6 and candidate 11 show, a naive migration that writes the flag into a *committed* `.bazelrc` (rather than a user/CI-level one) trades a leaked-token risk for an arbitrary-code-execution-on-clone risk. Mechanical check: after any credential-helper migration, `grep -n 'credential_helper' .bazelrc` on the committed file must return nothing.
- **Recommending dynamic execution as a "free" layer on top of an existing remote cache.** An agent that sees `--remote_cache` configured and reaches for `--dynamic_local_strategy`/`--dynamic_remote_strategy` as a performance suggestion is proposing something the docs state cannot function. Mechanical check: candidate 6's grep pair (dynamic flags present, `remote_executor` absent ⇒ reject the suggestion).
- **Treating "no RBE" as "no security surface" for a cache-only repo.** Cache poisoning ([#4276](https://github.com/bazelbuild/bazel/issues/4276), the bazel-discuss thread) applies fully to a cache-only deployment; an agent auditing a repo with no `--remote_executor` should not skip the trust-boundary review on the assumption that RE is the only thing worth checking. Mechanical check: run candidate 8/12's write-actor enumeration regardless of whether `--remote_executor` is set.
- **Copying a nixpkgs-style absolute-store-path launcher pattern into a "Bazel-friendly architecture" adoption guide without flagging the RE trade-off.** An agent drafting adoption guidance from `rules_ocx`-adjacent examples could reproduce the exact pattern that forecloses RE later, without stating the trade-off the original repo states explicitly. Mechanical check: candidate 1's launcher-content grep, run against any newly generated adoption scaffold, not just existing repos.
- **Citing the fleet's own `.bazelrc.user` content directly.** This program's SECRETS instruction (not a Bazel-specific fact, but a live trap for any agent working in this fleet) forbids quoting that file's write-credential line or token in any artifact — an agent asked to "show the current cache config" must describe it in words, as this file does, never paste the line.

## Contested / evolving

- **The MUST/SHOULD split on `--credential_helper` is a fleet-specific decision, not a universal one.** For a greenfield repo with no existing token, MUST is unambiguous — there is no migration cost to weigh. This dive's SHOULD-for-existing case rests on one fleet's stated migration cost being real, not on any upstream ambiguity about the helper's maturity; the spec side has been settled since 7.0.0. As of 2026-09-05, no primary source argues the helper protocol itself is anything but the recommended path forward for any newly adopted authentication scheme.
- **The `--credential_helper` trust-origin bypass ([#30439](https://github.com/bazelbuild/bazel/issues/30439)) is closed as intended behavior, not trending toward a fix.** Google's own OSS VRP panel's determination means this is a permanent property of Bazel's trust model (a workspace's own config files are fully trusted the moment any command processes them), not a bug awaiting a patch. The reporter's own framing — that this doesn't match how `bazel query` is commonly treated as a safe, read-only inspection command — is a legitimate documentation gap the issue leaves open for community discussion, but no maintainer commitment to change the behavior exists as of this writing. Treat the mitigation (candidate 11) as durable guidance, not a stopgap.
- **Dynamic execution's cache-only impossibility is structural, not a temporary limitation.** It follows from what a cache-only backend can even express (an accept/reject on a stored result, no execution capability) rather than from an implementation gap Bazel might close. No primary source suggests this is on a roadmap to change.
- **Read-side cache disclosure (M-D-05) is real but explicitly out of this dive's scope.** The bazel-discuss thread demonstrates the attack surface exists in principle; this program's map defers it because no fleet cache is publicly reachable today. Candidate 15 states the check to run the day that changes, without shipping it as a current MUST.
- **The `examples` CI job's uncached-with-no-rationale state (fleet evidence, last bullet) is an open question this dive surfaces but does not resolve** — it may be an oversight (unlike the two deliberate omissions) or may deserve its own stated rationale; settling which is not one of this dive's M-IDs.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Adapting Bazel Rules for Remote Execution](https://bazel.build/remote/rules) | Official Bazel doc, primary | Current, fetched 2026-09-05 | The four mandatory RE-compatible-rule constraints, quoted directly |
| [Dynamic Execution](https://bazel.build/remote/dynamic) | Official Bazel doc, primary | Current, fetched 2026-09-05 | The exact cache-only-can't-do-dynamic statement and failure semantics |
| [Sandboxing](https://bazel.build/docs/sandboxing) | Official Bazel doc, primary | Current, fetched 2026-09-05 | The three strategies and the "mimics remote execution" framing |
| [Remote Execution Overview](https://bazel.build/remote/rbe) | Official Bazel doc, primary | Current, fetched 2026-09-05 | Entry point; confirms RE is framed on top of the caching model |
| [Build Event Protocol](https://bazel.build/remote/bep) | Official Bazel doc, primary | Current, fetched 2026-09-05 | BES/RE shared-authentication statement |
| [Command-Line Reference](https://bazel.build/reference/command-line-reference) | Official Bazel doc, primary | Current, fetched 2026-09-05 | Exact current defaults: `--remote_upload_local_results`, `--incompatible_remote_local_fallback_for_remote_cache`, `--remote_local_fallback`, `--remote_cache`/`--remote_executor` scheme defaults |
| [Bazel Credential Helpers design proposal](https://github.com/bazelbuild/proposals/blob/main/designs/2022-06-07-bazel-credential-helpers.md) | Official Bazel design doc, primary | 2022-06-07, status Implemented (updated 2023-06-13) | The actual subprocess protocol (`get`, stdin/stdout JSON, host-pattern scoping) |
| [`bazelbuild/bazel` CHANGELOG.md at tag `7.0.0`](https://raw.githubusercontent.com/bazelbuild/bazel/7.0.0/CHANGELOG.md) | Official repo, primary | Release-dated (7.0.0) | Confirms "Declare credential helpers to be a stable feature. (#18752)" shipped in this release |
| [Bazel 7.0 LTS announcement](https://blog.bazel.build/2023/12/11/bazel-7-release.html) | Official Bazel blog | 2023-12-09/11 | Corroborates the 7.0 release window (BwoB default flip); does not itself mention credential helpers |
| [`bazelbuild/bazel#4276`](https://github.com/bazelbuild/bazel/issues/4276) | Official repo issue, primary | Filed 2017-12-11, still the canonical reference | The cache-poisoning threat model and the execution-gated-write mitigation, straight from a maintainer |
| [`bazelbuild/bazel#18751`](https://github.com/bazelbuild/bazel/issues/18751) | Official repo issue, primary | 2023-06-22/23 | The superseded tracking issue for stabilizing credential helpers, useful for the version-history nuance |
| [`bazelbuild/bazel#30439`](https://github.com/bazelbuild/bazel/issues/30439) | Official repo issue, primary | Filed 2026-07-23, closed 2026-08-11 | The live credential-helper trust-origin bypass — this dive's chased surprise, current as of the program's own era |
| [bazel-discuss: "Security risks of a publicly available remote HTTP cache"](https://groups.google.com/g/bazel-discuss/c/0005BAB_mlI) | Community mailing-list thread, first-hand | 2023-02-14 | The exact thread the brief names; independent confirmation of the poisoning threat and the trusted-uploader mitigation |
| `rules_ocx` `README.md` (lines 266-270 as measured 2026-09-05) | Fleet repo, primary evidence | Current | The exact "nixpkgs model, non-goal" statement this dive treats as the centerpiece |
| `rules_ocx` `.github/actions/remote-cache/action.yml` | Fleet repo, primary evidence | Current | The exact read/write cache-configuration mechanism (lines 27-34) |
| `rules_ocx` `.github/workflows/ci.yml` | Fleet repo, primary evidence | Current | The exact push-gated credential wiring (lines 30, 56) and the two deliberately-uncached jobs (98-100, 171-172) |
| [`build-contracts-and-ci-posture.md`](../bazel-audit/build-contracts-and-ci-posture.md) | Grounding audit | 2026-09-05 | §4 Remote cache posture — independently cross-checked file:line evidence this dive builds on |
| [`bazel-topic-map/rbe-and-caching.md`](../bazel-topic-map/rbe-and-caching.md) | Wave-1 landscape scout | 2026-09-05 | Prior survey and source list this dive verifies against and extends, not substitutes for |

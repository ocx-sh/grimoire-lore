---
title: "BZL-HERM — determinism, sandboxing, environment, generated files"
topic: bazel-hermeticity-determinism
family: BZL-HERM
model: opus
consolidates:
  - bazel-hermeticity-determinism/action-nondeterminism-taxonomy.md
  - bazel-hermeticity-determinism/sandbox-environment-and-toolchain-leakage.md
  - bazel-followups/macos-windows-sandbox-and-runfiles-parity.md
  - bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md
  - bazel-measurements/action-key-path-sensitivity-and-execlog.md
  - bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
grounded_in:
  - bazel-frame.md (body + Corrections, waves 1, post-map, 2, 3a, 4a, 3b)
  - bazel-topic-map.md ("How to read this", "Conflicts resolved" 1-18, "The map" § C, "Selected for wave 2" § Group 4)
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/fleet-bazel-readiness.md
date: 2026-09-05
revised: 2026-09-06
---

# BZL-HERM

## Verdict

Hermeticity in Bazel is **not a property you have, it is a set of defaults you have to turn
off** — and the defaults differ between the two live majors, in three phases of the build,
at three different maturity levels, on three operating systems that do not agree. Every rule
below reduces to Skyframe's own stated invariant: "if all the input data of all functions is
recorded, Bazel can invalidate only the exact set of nodes that need to be invalidated"
(`action-nondeterminism-taxonomy.md:48`).

1. **The frame is wrong about the single most consequential flag, and the map inherited the
   error — now measured, not only source-read.** Frame correction 2 and map row M-C-05 both
   state `--incompatible_strict_action_env` "now defaults true" as a blanket era fact. Direct
   per-tag source reads of `BazelRuleClassProvider.java` at 6.0.0 … 9.2.0 show it defaults
   **`false` across the entire Bazel 8.x line** and `true` only from 9.0.0
   (`sandbox-environment-and-toolchain-leakage.md:151-170`). Two independent live runs now
   confirm it at the binary: `bazel help build --long` reads `false` on 8.7.0 and 8.8.0 and
   `true` on 9.2.0 (`flag-defaults-and-trivial-builds-across-versions.md:57`), and a sandboxed
   `env | sort` genrule shows 9.2.0's default output **byte-identical** to 8.7.0 run with the
   flag explicitly on (`sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md:371-385`).
   Two refinements the wave-2 text did not have, both of which correct an overclaim in the
   original phrasing: (a) the non-strict default is a **named short list**, not a full
   client-environment passthrough — exactly `PATH` and `LD_LIBRARY_PATH` inherit; an arbitrary
   exported `FOO` never leaked in either mode, and `HOME` is absent from the action environment
   in every configuration tested; (b) the "static PATH" strict mode installs is **OS-shaped**:
   POSIX gets the literal `/bin:/usr/bin:/usr/local/bin` (measured), Windows gets the MSYS root
   parsed from the resolved `bash.exe` plus `C:\Windows;C:\Windows\System32;…\WindowsPowerShell\v1.0`
   (`macos-windows-sandbox-and-runfiles-parity.md:168`). **BZL-HERM-01 is a MUST because of this
   correction, not in spite of it.**
2. **The two dives disagree on `--incompatible_repo_env_ignores_action_env`, and the
   version-split reading wins.** `action-nondeterminism-taxonomy.md:137` reports its default
   as "**true** currently", full stop; `sandbox-environment-and-toolchain-leakage.md:134-149`
   fetched `CommonCommandOptions.java` at tags 8.7.0/8.8.0/9.0.0/9.1.0/9.2.0 and measured
   `false` on all of 8.x, `true` from 9.0.0. Re-checked at the binary on 2026-09-06:
   `bazel help build --long` prints `default: "false"` on 8.7.0 and `default: "true"` on 9.2.0.
   Resolved for the multi-tag read: a single current-reference fetch cannot see a version split.
   **On Bazel 8, `--action_env` still reaches `repository_ctx.getenv()`; on Bazel 9 it does not,
   silently** (BZL-HERM-04).
3. **The sandbox does not block the network by default on any OS, it blocks it well on two of
   three when told to, and it cannot reach a repository rule at all.**
   `--sandbox_default_allow_network` defaults `true` on 8.7.0, 8.8.0 and 9.2.0 (measured at the
   binary). Set false, it is now *measured* to work under `linux-sandbox` — a `curl` genrule
   returns `NONET` where the default run returns `HTTP/2 200`
   (`sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md:280-306`) — and *source-settled*
   under `darwin-sandbox`, whose `sandbox-exec` profile emits a real `(deny network*)`
   (`macos-windows-sandbox-and-runfiles-parity.md:39`). It does nothing on Windows, which has no
   strategy with a network namespace to revoke. Two scope limits ride inside the rule's own text:
   an action tagged `no-sandbox` or `local` runs under the `local` runner where the flag is a
   no-op (measured), and the flag is `execution`-tagged, so it **cannot govern a repository
   rule's loading-phase fetch** — `repository_ctx.download`/`.execute` have never been sandboxed
   (bazelbuild/bazel#7764, open since 2019; frame correction 3b-5). Where the dives split on
   severity — MUST as an rc line versus SHOULD as one CI leg — we take **MUST**.
4. **The frame's suspected pain points are absent from the fleet, so shape F carries this
   family.** `rules_ocx` has 0 production genrules, 0 stamping, 0 real `**` globs, 0 `cc_*`
   targets (`starlark-code-shape.md:155,159,291`; `build-contracts-and-ci-posture.md:37`).
   Five of the eight non-determinism causes are latent here, not live. That is a reason to
   ship the rules, not to drop them: they are the rules an agent authoring the *adopting*
   monorepo gets wrong with no fleet instance to learn from.
5. **One dive fact about the fleet is wrong and it changes two rules.**
   `sandbox-environment-and-toolchain-leakage.md:347` says "fleet has zero Windows CI legs
   today". `rules_ocx`'s test matrix is `[ubuntu-latest, macos-latest, windows-latest]`
   × `["8.7.0","9.x","rolling"]` (`.github/workflows/ci.yml:41-42`) and BCR-parity carries a
   `windows-amd64` target (`ci.yml:110`). So **3 of 9 test shards run `processwrapper-sandbox`**
   — the only cross-platform strategy, which enforces nothing beyond "no undeclared-input
   read" and cannot revoke a network namespace at all
   (`sandbox-environment-and-toolchain-leakage.md:71-79`). BZL-HERM-27 (short
   `--output_user_root`) therefore binds for shape A today, and BZL-HERM-02's green Windows
   leg proves nothing.
6. **`--repo_env` is not an allowlist and never was.** Bazel's own help text, read verbatim off
   both binaries on 2026-09-06, says repository rules "see the full environment anyway"; only
   `--experimental_strict_repo_env` (added 8.6.0, default `false` on 8.7.0 and 9.2.0 alike, no
   announced graduation) restricts anything. Bazel 9 adds one affordance 8.x lacks: the
   `=NAME` special syntax that explicitly *unsets* a variable, present on 9.2.0's
   `--repo_env`/`--action_env`/`--host_action_env`/`--test_env` and absent from all four on
   8.7.0. Any documentation claiming `--repo_env` restricts is a correction, not a preference —
   hence BZL-HERM-05 at MUST severity for a *claim*.
7. **There are three environment tiers, not one, and one of them does not exist yet.**
   Build/host actions have `--incompatible_strict_action_env`; repository rules and module
   extensions have the experimental `--experimental_strict_repo_env`; **test actions have no
   strict mode at all** — bazelbuild/bazel#29472 is open as of 2026-09-05
   (`action-nondeterminism-taxonomy.md:51,127-137`). Every blanket "we run hermetically"
   claim is false for at least two of the three. Correcting the wave-2 phrasing: on Bazel 8
   there is no removal affordance for a test variable at all — `--test_env=NAME=` is an
   *assignment to the empty string*, not an unset; the explicit unset (`--test_env==NAME`)
   arrives only on 9.x.
8. **The checked-in-generated-file pattern is settled and it is `write_source_files`/`diff_test`,
   not a genrule plus a manual `cp`.** It works because `bazel build`/`test` cannot write the
   source tree by construction while `bazel run` sets `BUILD_WORKSPACE_DIRECTORY`
   (`sandbox-environment-and-toolchain-leakage.md:203-225,247-250`). The shipped rule states
   the *mechanism*, not the dependency, so it applies to a repo that never takes
   bazel-contrib/bazel-lib — `rules_ocx` implements it by hand at `docs/BUILD.bazel:38-47,51-77`.
9. **A glob's match set is not readable from its pattern.** Both dives leave this at SHOULD;
   we raise it to **MUST** (BZL-HERM-19). Reason: the source is normative (`glob()`'s own
   reference doc, `sandbox-environment-and-toolchain-leakage.md:189`), the failure is
   completely silent — fewer sources, no error, no warning — and the map ranks it P0 with a
   named check. A deliberate severity upgrade over a dive is recorded here, not hidden.
10. **A deliberately uncached CI job proves cold-store correctness, never determinism.** It
    would pass every run with a fully non-deterministic action, because it compares no action
    keys (`sandbox-environment-and-toolchain-leakage.md:331-335`). `rules_ocx` currently calls
    its uncached job an offline-*determinism* job; that name overclaims (BZL-HERM-23).
11. **Most of this family is a reading heuristic, and that does not lower its severity.**
    Only the flag rules are grep-checkable. "Does this tool embed a timestamp" and "does this
    stamped value need rebuild-on-change" are judgments no `bazel query` answers
    (`action-nondeterminism-taxonomy.md:230-242`). Severity tracks the *standard's*
    certainty, not the *check's* automation — a normatively documented standard with a manual
    check stays MUST; a real failure mode resting only on an argued source (jmmv.dev,
    fzakaria.com) is CONSIDER.
12. **Version boundaries the ruleset depends on**, every row below re-read from
    `bazel help build --long` against the 8.7.0 and 9.2.0 binaries on 2026-09-06 unless marked.
    Bazel 8.0.0–8.8.0: `--incompatible_strict_action_env=false`,
    `--incompatible_repo_env_ignores_action_env=false`, `--incompatible_sandbox_hermetic_tmp=true`,
    `--verbose_explanations` documented. Bazel 9.0.0–9.2.0: the first two `true`,
    `--incompatible_sandbox_hermetic_tmp` gone from the help surface entirely,
    `--verbose_explanations` gone from the help surface but **still parsing** (a doc-surface
    change, not a removal — a build with it set completes), `=NAME` unset syntax added to the
    four `*_env` flags, WORKSPACE support code *deleted* and `--enable_workspace` a no-op.
    Unchanged on both: `--sandbox_default_allow_network=true`, `--sandbox_debug=false`,
    `--sandbox_fake_hostname=false`, `--sandbox_fake_username=false`, `--stamp=false`,
    `--reuse_sandbox_directories=true`, `--experimental_use_hermetic_linux_sandbox=false`,
    `--execution_log_sort=true`. `--experimental_strict_repo_env` exists from 8.6.0, default
    `false` on both. Ruleset pins: rules_python 2.3.3, rules_cc current `main` (2026-09),
    bazel-contrib/bazel-lib 3.7.2, toolchains_llvm 1.9.0, hermetic_cc_toolchain 4.3.0.
13. **One rule was dropped from the dives' 38 candidates as out of family, and the second drop
    was wrong on its facts.** The deprecated-provider modernization notice
    (`action-nondeterminism-taxonomy.md:125,298`) is real but is `BZL-LARK`'s territory, not a
    determinism claim; it survives only as an AI-agent failure mode below. The other drop said
    `--experimental_reuse_sandbox_directories` is "a performance knob with no M-ID and no
    pass/fail reading". Three of those four clauses are wrong (frame correction 3b-4, confirmed
    here at the binary): the flag was **renamed `--reuse_sandbox_directories`** — the
    `experimental_` spelling is a silent alias — it **defaults `true`** identically on 8.7.0 and
    9.2.0, it has M-ID M-L-18, and it has a pass/fail reading, because an explicit `=false` is
    the finding. The *drop from this family* stands: the flag is a sandbox-cost knob owned by
    `BZL-CC-30` and `bazel-diagnose`, not a hermeticity control. What must never be repeated is
    the flag name or the "still experimental" framing.
14. **Action-key path sensitivity is settled, and the fear was aimed at the wrong mechanism
    (M-C-13).** Measured on 8.7.0 and 9.2.0: two byte-identical checkouts at different absolute
    paths, sharing one `--disk_cache`, produced **byte-identical action digests** for all five
    probe actions, and the second checkout served every one as a `disk cache hit`
    (`action-key-path-sensitivity-and-execlog.md:73-94`). `$(location)`/`$(execpath)` resolve to
    exec-root-relative strings at analysis time, so no absolute path enters the hashed material.
    The illusion of path dependence comes from somewhere else entirely: an action that reads
    `$PWD` **at run time** picks up the sandbox exec root, whose parent `output_base` *is* a hash
    derived from the workspace's absolute path — so the *output bytes* differ across checkouts
    while the *key* does not. Stable key does not imply portable output (BZL-HERM-31). Documented
    gap: only native-substitution genrule shapes were measured; a hand-written action that shells
    `pwd` into a *tool argument* was not, and could plausibly destabilise the key.
15. **The execution log answers one question and cannot be made to answer the other — and
    `--explain` answers neither.** Measured: two clean builds whose execlog `commandArgs`,
    `inputs[].digest` and `environmentVariables` were identical for every action still produced
    three output files with different SHA-256s; only an independent `sha256sum` pass over
    `bazel-out` caught it (`action-key-path-sensitivity-and-execlog.md:204-234`). So an empty
    execlog diff means "the action key is stable", never "the build is deterministic"
    (BZL-HERM-30). Three tooling facts belong with it. The log's `metrics` object
    (`startTime`, `executionWallTime`, `totalTime`) is volatile on every action and is safe to
    strip unconditionally; `actualOutputs[].digest` is **not** volatile and must never be
    stripped as if it were. An action whose owning target hits the persistent local action cache
    is **never written to the log at all** — its absence is the signal, per `spawn.proto`'s own
    comment. And `--explain` reported `no entry in the cache (action is new)` for actions that
    were confirmed disk-cache hits, because it reasons only from the local dependency checker
    under a freshly expunged `output_base`
    (`action-key-path-sensitivity-and-execlog.md:95`; `diagnosis-procedures-…:136`).
16. **Sandbox parity is settled per OS, and macOS is not a Linux equivalent in two named
    ways.** Linux: measured — `linux-sandbox` remounts the entire host root read-only and
    allowlists `/dev/shm`, `/tmp` and the execroot, and it enforces the network flag
    (`sandbox-strategy-…:121-160,313-322`). macOS: source-settled — `darwin-sandbox`'s profile
    genuinely denies the network, but it **starts from `(allow default)` and denies only
    `file-write*` and, conditionally, `network*`**, so it does *not* isolate host **reads** the
    way linux-sandbox's remount does; and its localhost carve-out shares the host's real
    loopback interface, an open parity gap (bazelbuild/bazel#11325). This corrects
    BZL-HERM-26's original rationale, which asserted the read-only whole-filesystem mount for
    both. Windows: a `windows-sandbox` (BuildXL) code path exists in-tree but is off by default
    and needs a `BazelSandbox.exe` Bazel does not ship, so in practice Windows gets
    `processwrapper-sandbox` or `local` — BZL-HERM-26 is *vacuous* there, not unmet
    (BZL-HERM-32). Documented gap: `processwrapper-sandbox` itself was never exercised; the
    measurement used `local` as an analogous, non-identical proxy.
17. **The hermetic Linux sandbox is runnable today, and one gap is why BZL-HERM-26 stays
    SHOULD.** `--experimental_use_hermetic_linux_sandbox` exists and works on both 8.7.0 and
    9.2.0. With it, `/home` and `/etc/hostname` genuinely disappear from the action's view — the
    exact isolation the default sandbox does not give. The minimal mount set for a genrule whose
    `cmd` runs under `/bin/bash` on a usrmerge host is **all four** of `/usr`, `/bin`, `/lib`,
    `/lib64`; mounting `/usr` alone still fails `execvp(/bin/bash)`
    (`sandbox-strategy-…:199-266`). **Documented gap**: the mount set a real rules_js or
    rules_python build needs — interpreter paths, shared libraries beyond libc, `/etc/resolv.conf`
    and CA bundles for TLS — was not probed. Until that is known, the flag is not adoptable as a
    CI gate, so BZL-HERM-26 stays SHOULD rather than rising to a hard gate. Secondary gap noted
    in passing and worth a dedicated check: `--sandbox_add_mount_pair` did **not** appear to bust
    an action-cache hit.

## The ruleset

**This topic owns `BZL-HERM` exclusively.** 35 rules. Boundaries: module-extension
`reproducible = True` and BCR repo-rule mechanics belong to `BZL-MOD`; cache-hit analysis,
BwoB, eviction and execution-tag cacheability semantics belong to `BZL-CACHE`; buildifier
warning names belong to `BZL-LARK`; sandbox *cost* knobs (`--reuse_sandbox_directories`) belong
to `BZL-CC`/`bazel-diagnose`; per-language toolchain mechanics belong to
`BZL-CC`/`BZL-PY`/`BZL-JS`/`BZL-RUST`, which cite BZL-HERM-24 rather than restating it; a
ruleset forcing `--enable_runfiles` at the rule level on Windows (rules_python ≥1.9.0) is
`BZL-PY`'s row, not one of these. `Cargo.toml`, `pyproject.toml` and `package.json` hygiene is
covered by `rust-cargo`, `python-packaging` and `typescript-packaging`.

Rows 01-09 are all caught by one pass: `grep -rn 'sandbox\|_env=\|strict_action_env\|strict_repo_env\|layering_check\|try-import\|output_user_root' .bazelrc* .github/workflows/*.yml .github/actions/*/*.yml`.
Rows 10-14 are one read of every `cmd`/`run_shell` string. Rows 20-22 are one read of the
generated-file targets. Rows 27, 32, 34 and 35 bind only where a Windows leg exists; row 33
only where a macOS leg does. **Every grep-based verification below is blind to generated-repo
`BUILD`/`.bzl` text** — a repository rule that writes Starlark into an external repo is out of
reach of all of them (frame correction 2-9).

| ID | Rule | Rationale | Verification (and how EMPTY OUTPUT reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| **BZL-HERM-01** | Pin `--incompatible_strict_action_env=true` in the committed `.bazelrc` whenever any Bazel 8.x version is in the supported range or the CI matrix, and remove the line only once the floor is ≥9.0.0 everywhere the rc file applies. Never quote one PATH value as "the" static PATH: it is `/bin:/usr/bin:/usr/local/bin` on POSIX and the MSYS root plus `C:\Windows;C:\Windows\System32;…\WindowsPowerShell\v1.0` on Windows. | The flag defaults `false` across all of 8.0.0–8.8.0 and `true` only from 9.0.0, so an unpinned multi-major matrix runs each leg under a different inheritance policy with no configuration difference to explain it. Measured, the difference is exact and narrow: non-strict inherits the client's `PATH` and `LD_LIBRARY_PATH` and nothing else (an arbitrary exported variable never leaks; `HOME` is absent in every mode), and 9.2.0's default output is byte-identical to 8.7.0 run with the flag on. On Windows the flip additionally changes *which* PATH-construction branch every action takes, not just whether `LD_LIBRARY_PATH` is dropped. | `grep -rn 'incompatible_strict_action_env' .bazelrc* .github/workflows/*.yml`, read against `.bazelversion` and every Bazel version in the matrix. EMPTY **with any Bazel-8 leg present = finding** (undocumented cross-major divergence); EMPTY with a ≥9.0.0 floor everywhere = pass. To see the live value on any pin: `bazel help build --long \| grep -A1 -- '--\[no\]incompatible_strict_action_env'`. | MUST | Bazel 8 (false, measured 8.7.0/8.8.0) vs 9 (true, measured 9.2.0); all three OSes, with a Windows-specific PATH shape; shapes A, F | M-C-05 |
| **BZL-HERM-02** | Set `--sandbox_default_allow_network=false` for the build; never read a green leg on Windows or any `processwrapper-sandbox`/`local` host as evidence that it held; and never cite this flag as a control over a repository-rule fetch. | The flag defaults `true` on both majors — every sandboxed action may reach the network unless told otherwise. Enforcement is real under `linux-sandbox` (measured: `NONET` with the flag, `HTTP/2 200` without) and under `darwin-sandbox`, whose `sandbox-exec` profile emits `(deny network*)`; it is impossible on Windows, which has no strategy with a network namespace to revoke. It is also `execution`-tagged, so it never reaches `repository_ctx.download`/`.execute`, which run unsandboxed in the loading phase (bazelbuild/bazel#7764, open since 2019) — an agent pattern-matching "sandbox + network + hermeticity" onto a fetch problem ships a flag that does nothing. | `grep -rn 'sandbox_default_allow_network' .bazelrc* .github/workflows/*.yml` → EMPTY = **finding** (network silently allowed). Then `bazel build --sandbox_default_allow_network=false //...` on a Linux or macOS leg: the first failing target names the network-dependent action; a clean build there = pass, a clean build only on Windows = no signal. Read the per-action escape hatches before calling a green run a pass: `tags=["requires-network"]` overrides the block while staying sandboxed, and `tags=["no-sandbox"]`/`["local"]` force the `local` runner where the flag is a no-op (both measured). | MUST | Bazel 8 & 9 (default `true`, measured on 8.7.0/8.8.0/9.2.0); Linux measured, macOS source-settled, Windows vacuous; shapes A, F | M-C-11, M-C-10 (part) |
| **BZL-HERM-03** | Never commit `--sandbox_debug` to a `.bazelrc`, a personal rc file, or a CI workflow. | It suppresses sandbox-directory cleanup by design, so leaving it on is an unbounded disk leak on every future invocation; it is a single-session inspection tool. | `grep -rn 'sandbox_debug' .bazelrc* .github/workflows/*.yml` — EMPTY = pass, any hit = finding. | MUST | all majors (default `false`, re-checked 8.7.0/9.2.0); shapes A, F | M-C-10 |
| **BZL-HERM-04** | Use `--repo_env=NAME=VALUE`, never `--action_env=NAME=VALUE`, for anything a repository rule or module extension must read. | `--incompatible_repo_env_ignores_action_env` defaults `false` on all of 8.x and `true` from 9.0.0, so a repo rule reading an `--action_env` value works by accident on Bazel 8 and returns empty on Bazel 9 — no error, just a fallback to the default. | For every name set via `--action_env` in any rc file or workflow, `grep -rn 'getenv(' --include='*.bzl' .` and check no repository-rule or module-extension call site expects it. EMPTY (no overlap, or no `--action_env` at all) = pass. Generated-repo `.bzl` text is out of this grep's reach. | MUST | Bazel 8 (leaks) vs 9 (does not) — both re-checked at the binary 2026-09-06; shapes A, F | M-C-06 |
| **BZL-HERM-05** | Never describe `--repo_env` as restricting what a repository rule may read — only `--experimental_strict_repo_env` does that, and it is off by default on both live majors. | Bazel's own flag help, verbatim on 8.7.0 and 9.2.0, states repository rules "see the full environment anyway"; `--repo_env` guarantees invalidation tracking for the named variables and builds no allowlist, so a hardened-environment claim resting on it is false. | `grep -rn 'experimental_strict_repo_env' .bazelrc*`. EMPTY reads: **the repository rules see the full client environment, full stop** — not a partial mitigation. Then read the repo's own prose for any "`--repo_env` restricts…" claim; a hit is a finding to correct to "guarantees invalidation tracking for the named variables". | MUST | Bazel ≥8.6.0 (flag exists, default `false` on 8.7.0 and 9.2.0, both re-checked); shapes A, F | M-C-06 |
| **BZL-HERM-06** | Do not add `--action_env=<VAR>` for a variable whose value differs between machines on any repo sharing a remote cache across users. | The flag's own reference warns this "can prevent cross-user caching if a shared cache is used" — the exact opposite of the intended effect. The default leak set is exactly the shape that bites: a machine-local `LD_LIBRARY_PATH` reaches every 8.x action with nobody configuring it. | `grep -n 'action_env=' .bazelrc*`, then read each named variable for machine-stability (a `$HOME`-derived path fails; a semantic version string passes). EMPTY (no `--action_env` at all) = pass. Both forms (`NAME=VALUE` and bare `NAME` to inherit) behave identically on 8.7.0 and 9.2.0; only Bazel 9 adds the `=NAME` unset form. | MUST | all majors; shapes A, F | M-C-06 |
| **BZL-HERM-07** | In a repository with zero `cc_*` targets and no plan to add any, set `common --repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1`; never spell it as `--define`, `--action_env`, or a loadable Starlark symbol. | The autodetection probe runs at repository/module-extension setup whether or not any `cc_*` target exists, and this environment variable — read via `repository_ctx.os.environ` in rules_cc's `cc/private/toolchain/cc_configure.bzl`, not in Bazel core — is its only documented off switch. | `grep -rn 'cc_binary(\|cc_library(\|cc_toolchain(' --include='*.bzl' --include='BUILD*' .` (EMPTY = no C++ targets, rule applies), then `grep -n 'BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN' .bazelrc*` (EMPTY = finding). Confirm with `bazel clean --expunge && bazel query '@local_config_cc//...'` — an error or empty result = pass. | SHOULD | Bazel 8/9; rules_cc `main` 2026-09; shapes A, F | M-C-08, M-C-09 |
| **BZL-HERM-08** | Record a host-specific, non-hermetic toolchain override (`CC=`, `-layering_check`, a writable host mount) that currently governs zero targets as a **latent trap with its activation condition named**, never as harmless and never as a live bug. **pinned** | It is inert only because nothing compiles against it; the first dependency that pulls in a `cc_library` makes it load-bearing, and by then its correctness has never been exercised anywhere, including CI. | `grep -n 'CC=\|layering_check' .bazelrc*`, then `grep -rn 'cc_binary(\|cc_library(\|cc_toolchain(' --include='*.bzl' --include='BUILD*' .`. First non-empty + second EMPTY = **CONSIDER, tracked as latent**; both non-empty = **escalate to MUST, live**; first EMPTY = pass. | CONSIDER → MUST | all majors; shape A | M-C-09 |
| **BZL-HERM-09** | Keep a personal, gitignored `.bazelrc.user`-style override outside every path CI reads, and verify that negative rather than assuming it. | The override stays inert only while CI never sources it; a `try-import` copied into a workflow, a checked-in symlink, or a copy step promotes it to load-bearing with nobody deciding it should be. | `grep -rn 'bazelrc.user\|try-import' .github/workflows/*.yml .github/actions/*/*.yml` — a hit that *reads* the developer file is a finding; a hit that *writes* CI-only content into a same-named file is fine. Confirm the file is gitignored. EMPTY on the read question = pass. | SHOULD | all majors; shapes A, F | M-C-09 |
| **BZL-HERM-10** | Never let a genrule or custom action write a timestamp, PID, UID/GID, hostname, username, or absolute path into a declared output. | The Build Encyclopedia's own General Advice names this the literal cause of "Bazel not rebuilding a genrule you thought it would" and of degraded cache performance. Measured mechanism for the absolute-path half: `$PWD` read at run time resolves inside the sandbox exec root, whose parent `output_base` is a hash derived from the workspace's absolute path — so the same action emits different bytes at two checkouts while its key stays identical, and a cache hit then serves the *other* checkout's bytes verbatim. | Reading heuristic over every `cmd`/`cmd_bash`/`ctx.actions.run_shell(command=…)` string: look for `date`, `$$` (PID), `whoami`, `id -u`, `hostname`, `$(pwd)`/`$PWD`, or a bare `/home`, `/Users`, `/root` literal. EMPTY (no hits) = pass. Generated-repo BUILD/`.bzl` text is out of this grep's reach. | MUST | all majors; all shapes | M-C-01, M-C-03 |
| **BZL-HERM-11** | Sort every set, dict or map before it is serialised into a command line, a template, or a generated file. | `be/general` requires "stable ordering for sets and maps" by name; hash and set iteration order is a process artifact that no Bazel input contract records. | Reading heuristic over the macro or tool source: a bare `for k in d:`, `.items()` or `set(...)` feeding written output with no `sorted()`/explicit ordering between. EMPTY = pass, but this is absence of evidence — say so when reporting. | MUST | all majors; all shapes | M-C-01, M-C-03 |
| **BZL-HERM-12** | Do not declare a genrule output that is a symlink or a directory tree. | Bazel does not copy a genrule-created directory or symlink structure, and its dependency checking of directories is unsound — a correctness bug routinely mistaken for non-determinism. | Reading heuristic over genrule `outs`/`cmd`: `ln -s`, `mkdir -p`, or `cp -r` producing a declared directory output. EMPTY = pass. | SHOULD | all majors; shape F | M-C-03 |
| **BZL-HERM-13** | Treat any action that shells into a foreign build system (`make`, `cmake`, `cargo build`, `npm run`, `go build`) as non-deterministic until an execution-log diff **and an output-digest diff** prove otherwise, and pin its `PATH` explicitly with `--action_env=PATH=<fixed>`. | Nested build systems carry none of Bazel's purity obligations, and `be/general` states directly that any change to `PATH` re-executes the command on the next build — so an unpinned `PATH` that drifts with the CI runner image is a whole-genrule-set cache-buster with no code change involved. One log diff is not enough: a foreign tool embedding its own clock changes no declared input and shows nothing in the log (BZL-HERM-30). | `grep -rn 'genrule(' --include='BUILD*' .` then read each `cmd` for a foreign build binary; if any exist, `grep -n 'action_env=PATH' .bazelrc*`. EMPTY on the first grep = pass; genrules present with no pinned `PATH` = finding. | SHOULD → MUST once the output feeds a shared or trusted cache | all majors; shape F | M-C-04, M-C-01 |
| **BZL-HERM-14** | Set `--sandbox_fake_hostname=true` and `--sandbox_fake_username=true` wherever a build's output has ever varied by machine identity. | Both default `false` on 8.7.0 and 9.2.0 (re-checked at the binary); they neutralise the hostname and username leaks at the sandbox layer without touching the offending tool, so nobody gets this normalisation for free. | `grep -rn 'hostname\|whoami\|\$USER\|getenv(.USER' --include='*.bzl' --include='BUILD*' .` to find candidate tools, then `grep -n 'sandbox_fake_hostname\|sandbox_fake_username' .bazelrc*`. First non-empty + second EMPTY = finding; first EMPTY = pass. | MUST where such a tool exists | all majors; shape F | M-C-01 |
| **BZL-HERM-15** | Diagnose an unexplained rebuild by diffing two `--execution_log_compact_file` runs through `//src/tools/execlog:parser` — never by re-reading the BUILD file and never with `--explain` — and work the causes in cost order: log diff, then environment tier, then command line, then output ordering, then local-versus-remote divergence, then nested build systems, `/dev/urandom` last. Prefer the compact log over `--execution_log_json_file` for any new tooling. **pinned** | The compact log records the action's actual resolved command line, environment and input digests — the only reliable view of an undeclared read — and the reference states it is "significantly smaller and cheaper to produce" than the JSON form. `--explain` cannot substitute: it reasons only from the local dependency checker and was measured reporting `no entry in the cache (action is new)` for actions that were confirmed disk-cache hits. | `bazel clean; bazel build --execution_log_compact_file=/tmp/before.log //t` twice, parse both with `bazel-bin/src/tools/execlog/parser --log_path=… --output_path=…`, `diff -u`. **EMPTY DIFF reads: the action key is stable — it does NOT read "the build is deterministic"; pair it with BZL-HERM-30's output-digest diff before concluding anything about determinism.** A non-empty diff names the differing input, env var or argument directly. Three tooling facts: `--restrict_to_runner` is the *parser*'s flag and `--sort` the *converter*'s; `--execution_log_sort` (default `true` on both majors) never applies to the compact format; an action hitting the persistent local action cache is **absent from the log entirely**, so absence is a signal, not a bug. If scripting `--execution_log_json_file` instead, note it emits concatenated pretty-printed objects with no separator — a `JSONDecoder().raw_decode()` loop, never `json.loads()` on the file or a line. Also `grep -rn 'execution_log_json_file' .bazelrc* .github` — a hit with no migration note is a finding. | MUST (process) | all majors; all shapes | M-C-02 |
| **BZL-HERM-16** | Enumerate a repository rule's actual host-touching calls with `bazel clean --expunge` plus `--experimental_workspace_rules_log_file` through the workspacelog parser before trusting a code read. | `execute`, unchecksummed `download`/`download_and_extract`, `which`, `.os` and unconstrained `.symlink` are exactly the operations Bazel's own docs name non-hermetic, and a code read misses dynamically constructed calls. The expunge is load-bearing: a warm fetch never re-invokes the calls you are hunting. | `bazel clean --expunge && bazel build --experimental_workspace_rules_log_file=/tmp/wsl.log //... && bazel build src/tools/workspacelog:parser && bazel-bin/src/tools/workspacelog/parser --log_path=/tmp/wsl.log > /tmp/wsl.txt`, then `grep -c '"which"\|sha256: ""' /tmp/wsl.txt`. 0 matches = pass; any match names the non-hermetic call. | SHOULD | all majors (flag name and `experimental_` status unchanged on 8.7.0 and 9.2.0, re-checked); shapes A, F | M-C-12 |
| **BZL-HERM-17** | Take `ctx.info_file` (stable status) only for a value that must force a rebuild, and `ctx.version_file` (volatile status) only for a value that may go stale. | Bazel deliberately does not invalidate dependents when only the volatile status file changes; picking the volatile file for a rebuild-worthy value reproduces bazelbuild/bazel#5573 exactly — the artifact simply does not rebuild. | `grep -rn 'ctx\.info_file\|ctx\.version_file' --include='*.bzl' .`, then read each call site against "does this value need rebuild-on-change?". EMPTY = pass (no stamping in use). | MUST wherever stamping exists | all majors; shape F | M-C-07 |
| **BZL-HERM-18** | Never treat `--stamp` as a target's determinism control. | `--stamp` defaults `false`, but most `*_binary` rules ship `stamp = -1` ("defer to the flag") while `*_test` rules force `stamp = 0` — so a target flips between stamped and unstamped from the invocation alone, with no change to its definition, and bazelbuild/bazel#14341 (open since 2021-11-29) confirms there is still no contract between Bazel and rulesets on what `--stamp` means. | `bazel query 'attr(stamp, -1, //...)'` enumerates every target deferring to the flag; then check whether any CI job builds a member of that set both with and without `--stamp` and diffs the result. EMPTY (no `stamp = -1` targets) = pass. | MUST wherever such targets exist | all majors; shape F | M-C-07 |
| **BZL-HERM-19** | Never conclude a `glob()`'s match set from its pattern; re-verify the expansion with `bazel query` whenever a change adds, moves or removes a `BUILD`/`BUILD.bazel` file anywhere under it. **pinned** | A glob silently stops matching inside any subdirectory that becomes its own package — no error, no warning, no diagnostic, just fewer sources from that moment on; the reference states plainly that "the result of the glob expression actually depends on the existence of BUILD files". | `bazel query 'kind("source file", deps(//path/to:target))'` before and after the change. An unchanged result set = pass; a shrinking result = finding. EMPTY output from the query at all = the target has no source deps and the check did not run — re-scope the query, do not read it as a pass. | MUST (raised from both dives' SHOULD — see Verdict 9) | all majors (the `BUILD.bazel`-recognition bug #4194 fixed 2017); shapes A, F | M-C-15 |
| **BZL-HERM-20** | Pair every checked-in generated file with a `write_source_files`/`diff_test`-style target whose failure message names the exact `bazel run` command that fixes it. **pinned** | `bazel build`/`bazel test` cannot write the source tree by construction, while `bazel run` sets `BUILD_WORKSPACE_DIRECTORY` — so a stale generated file surfaces only as an unexplained CI failure unless a paired target both detects the drift and prints the fix. | Intersect `git ls-files` with every rule's `outs`/`out_file`; each path in the intersection must be named by a `diff_test`/`write_source_files` target. EMPTY intersection-minus-covered (every generated-and-tracked file has a matching test) = pass. | MUST | all majors; bazel-contrib/bazel-lib 3.7.2 or a hand-rolled bazel_skylib `diff_test` pair; shapes A, F | M-C-16 |
| **BZL-HERM-21** | Never tag a `diff_test`/`write_source_files` target `manual`, and never exclude it from `//...`. | That test's failure *is* the safety mechanism the whole pattern rests on; excluding it silently reintroduces the "stale file, no signal" problem the pattern exists to close — and it is what an agent reaches for to turn a red CI green. | `grep -A6 'diff_test(\|write_source_file' **/BUILD.bazel \| grep -n 'manual'` — EMPTY = pass. A platform exclusion via `target_compatible_with` is not a violation; a `tags = ["manual"]` is. | MUST | all majors; shapes A, F | M-C-16 |
| **BZL-HERM-22** | Name the Bazel major a golden-diff or snapshot test is authoritative for, in a comment adjacent to the CI condition that excludes the other legs. **pinned** | A golden pinned to one major leaves the rest of a multi-major matrix with zero signal on the surface most likely to drift across majors; the comment is the only thing that makes the hole legible instead of silent. The bar is "name the gap", not "close the gap", for a repo whose pin is deliberately held. | `grep -B3 'matrix.bazel !=' .github/workflows/*.yml` (or the CI system's equivalent conditional-skip). A guarded exclusion with no adjacent comment naming the reason and the affected major = finding. EMPTY (no guarded exclusion) = pass only when the matrix is single-major. | MUST (name it) / SHOULD (widen to per-major goldens) | Bazel 8 vs 9 (stardoc's `repo_mapping` row is the live instance); shape A | M-C-17 |
| **BZL-HERM-23** | Do not describe a deliberately uncached CI job as proving determinism. | It proves the build is correct starting from an empty store; it compares no action keys, so it would pass every run with a fully non-deterministic action. | Reading heuristic: does the job compare two independent action-key or execution-log captures, or only assert an exit code and the presence of outputs? No key-comparison step = **finding** — re-scope the job's name and its documentation to "cold-store correctness". | SHOULD | all majors; shape A | M-C-18 |
| **BZL-HERM-24** | Treat rules_cc's and rules_python's default toolchain configuration as host-installed and non-hermetic until an explicit hermetic toolchain is registered ahead of it — "the repo uses Bazel" does not imply "the repo is hermetic". | A peer-reviewed 150-million-syscall study across 70 real Bazel projects found **zero** with a fully hermetic build, with the official rulesets' own defaults the largest single documented cause: 38.1% of non-hermetic top-level toolchains come from the default configuration of official Bazel rules. | For rules_python: `python.toolchain(python_version = …)` registered and no unpinned system-Python fallback. For rules_cc: a hermetic toolchain module (`toolchains_llvm`, `hermetic_cc_toolchain`) registered. No explicit hermetic registration found = **finding** for any repo with real `cc_*`/`py_*` targets; not applicable to a repo with none. Note for rules_python specifically, per `BZL-PY`: a zero grep count means "hermetic but unpinned", never "non-hermetic". | MUST (repos with real targets) | Bazel 8/9; rules_python 2.3.3, rules_cc `main` 2026-09; shapes D, E, F | M-C-08 |
| **BZL-HERM-25** | Confirm a hermetic toolchain actually *resolves* ahead of the autodetected one, rather than merely being registered. | Toolchain resolution takes the first matching registered toolchain for the requested constraints, so one listed after the autoconfigured one only wins when something forces that exact constraint set — registering it "for completeness" changes nothing for a default build. | Read `MODULE.bazel`'s `register_toolchains(...)` order, or `bazel cquery --transitions=full //target 2>&1 \| grep -i toolchain` for the live selection; `--toolchain_resolution_debug=<regex>` (default `-.*`, i.e. exclude everything) prints the resolution decisions themselves. No hermetic toolchain resolving ahead of the autoconfigured one = finding (registered but not in effect). EMPTY cquery output = the query did not resolve a toolchain; re-scope, do not read as pass. | CONSIDER | Bazel 8/9; toolchains_llvm 1.9.0, hermetic_cc_toolchain 4.3.0 (era pins, not fleet-exercised); shape F | M-C-08 |
| **BZL-HERM-26** | Name which sandbox strategy actually ran, per action and not per build, before calling a build sandboxed; and never mount a real host directory writable (`--sandbox_writable_path`, `--sandbox_add_mount_pair`) where an empty `--sandbox_tmpfs_path` would serve. | The three strategies do not isolate the same things. `linux-sandbox` remounts the whole host root read-only and allowlists only `/dev/shm`, `/tmp` and the execroot (measured, `--sandbox_debug`) — Bazel's documented "original sin" and the mechanism behind GNU-versus-BSD tool mismatches. `darwin-sandbox` is **not** its equal on reads: its `sandbox-exec` profile begins `(allow default)` and denies only `file-write*` and, conditionally, `network*`, so host reads stay visible. `processwrapper-sandbox`, the only cross-platform strategy, enforces nothing beyond "no undeclared-input read". A writable host mount defeats whatever isolation remains. Per-action, `tags=["no-sandbox"]` and `tags=["local"]` force the unsandboxed `local` runner regardless of the build's strategy (measured). | `bazel build --sandbox_debug <target> 2>&1 \| grep -i sandbox` and read which strategy was selected — EMPTY (no strategy surfaced) = cannot confirm the isolation level, treat as finding. Cross-check per action with the execution log's `runner` field, and `grep -rn 'no-sandbox\|"local"' --include='BUILD*' .` for tags that opt individual actions out. Then `grep -rn 'sandbox_writable_path\|sandbox_add_mount_pair' .bazelrc*` — EMPTY = pass; each hit must name a scoped, commented path. On a Windows-only leg the rule is **vacuous, not unmet**: the strategy is always `processwrapper-sandbox`/`local` and there is no sandbox mount set to violate. | SHOULD (stays SHOULD — see Verdict 17) | all majors; Linux measured, macOS read-isolation weaker, Windows vacuous; shapes A, F | M-C-10 |
| **BZL-HERM-27** | Set a short `--output_user_root` on every Windows CI leg and in the Windows developer docs — Bazel's own documented recipe is `startup --output_user_root=C:/tmp`. | The Windows path-length ceiling was never lifted: `bazel.build/configure/windows` states plainly that "some tools have the Maximum Path Length Limitation on Windows, including the MSVC compiler", and a Bazel maintainer's own explanation is that Bazel "did many improvements" on long paths but "the MSVC compiler still doesn't support long path" — so the mitigation is operator-side and permanent. | Reading heuristic: does the Windows CI config or dev doc set `--output_user_root` to a short path? EMPTY **with a Windows leg present = finding**; not applicable with no Windows leg. `--output_user_root` is a **startup** option — a `build --output_user_root=…` line is a second, distinct finding. | SHOULD (raised from CONSIDER — the original citation did not support the rule; the current one does) | all majors; Windows only, and unmeasurable on Linux/WSL2; shapes A, F (any repo with a Windows leg) | none (fleet instance found; see Verdict 5) |
| **BZL-HERM-28** | Reject a proposed fix that reintroduces `WORKSPACE`, `local_repository()`, or a top-level `cc_configure()` on a repo targeting Bazel 9. | Bazel 9.0 deleted the WORKSPACE support code outright rather than disabling it, and `--enable_workspace` is a no-op — measured, it is gone from both `help build --long` and `help startup_options` on 9.2.0. This is dead machinery, not legacy-but-working code, so the proposal cannot work at all. | `grep -rn '^WORKSPACE\|local_repository(\|native.local_repository\|cc_configure(' --include='WORKSPACE*' --include='*.bzl' .` — EMPTY = pass; any hit outside an explicit, commented compatibility shim = finding. | MUST | Bazel 9 (code deleted at 9.0.0; flags absent from every help surface at 9.2.0); shapes A, F | none (AI-agent trap; see failure modes) |
| **BZL-HERM-29** | State the three environment tiers separately wherever a repo documents a hermeticity posture: build and host actions, repository rules and module extensions, and test actions. | A blanket "we run with a strict environment" is false for two of the three — repository-rule strictness is experimental and off by default, and test actions have **no** strict mode at all (bazelbuild/bazel#29472, open at 2026-09-05). On Bazel 8 there is not even a removal affordance: `--test_env=NAME=` is an assignment to the empty string, not an unset; the explicit unset syntax (`--test_env==NAME`) exists only from Bazel 9. | Reading heuristic: does the repo's hermeticity documentation distinguish the three tiers by name? A blanket claim with no distinction = finding; no such claim anywhere = not applicable, not a pass. | CONSIDER (prose quality, not independently machine-verifiable) | all majors; the unset affordance is Bazel 9 only (re-checked on both binaries); shapes A, F | M-C-06 |
| **BZL-HERM-30** | Pair every execution-log diff with an independent two-run **output-digest** comparison, and never let an empty log diff stand as a determinism claim on its own. | Measured on 8.7.0: two clean builds whose `commandArgs`, `inputs[].digest` and `environmentVariables` were identical for every action still produced three output files with different SHA-256s. The log answers "did the action's declared inputs or command change"; it cannot answer "did the output change for the same declared inputs". Nothing in the log's own fields distinguishes the two, so a reviewer reading only a clean diff concludes the opposite of the truth. | `bazel clean --expunge; bazel build //...; sha256sum bazel-out/<config>/bin/*` executed twice and diffed, in addition to BZL-HERM-15's log diff. **A non-empty digest diff with an EMPTY log diff = finding, and it is the strongest kind** — the action is non-deterministic with a stable key, so the cache will serve one run's bytes forever. Both empty = pass. When comparing logs, strip the `metrics` object (`startTime`, `executionWallTime`, `totalTime` — volatile on every action) but **never** strip `actualOutputs[].digest`, which is exactly this signal. | MUST (process) | all majors (measured 8.7.0, cross-checked 9.2.0); all shapes | none (measurement finding; delimits M-C-02's scope) |
| **BZL-HERM-31** | Never read a stable action key as proof that an action's output is portable across checkouts; name the ambient state the action reads at run time instead. | Measured on 8.7.0 and 9.2.0: two byte-identical checkouts at different absolute paths, sharing one `--disk_cache`, produced identical action digests and the second served every action as a `disk cache hit` — `$(location)`/`$(execpath)` resolve to exec-root-relative strings at analysis time, so no absolute path reaches the hashed material. Yet the cache-hit checkout's output files literally contained the *other* checkout's `output_base` hash, because `$PWD` read at run time resolves under a directory whose name is derived from the workspace's absolute path. Stable key, non-portable bytes — the exact failure a "the keys match, so we are fine" review misses. | For any action suspected of path sensitivity, build the same target from two different absolute paths against one shared `--disk_cache`: a `disk cache hit` on the second proves the key is path-independent. Then read the served output for a host path (`grep -rn '/home\|/Users\|output_base\|<hash>' <output>`). Cache hit **plus** a host path in the served bytes = finding, routed to BZL-HERM-10. EMPTY (no host path in the output) = pass. `--experimental_output_paths=strip` is not the fix and does not apply here: it is opt-in per action via `execution_requirements = {"supports-path-mapping": …}`, which `genrule` never sets, and it was measured to have zero effect on a genrule's recorded paths on either major. | MUST | Bazel 8.7.0 and 9.2.0 (measured, `linux-sandbox`, genrule/native-substitution shapes only); all shapes | M-C-13 |
| **BZL-HERM-32** | State the Windows sandbox position precisely: no default, no shipped binary, not documented on bazel.build — but an experimental `windows-sandbox` (BuildXL) code path does exist in Bazel's source. | Both blanket claims are wrong and each misleads differently. "Windows has no sandbox code" is false at the source level (`WindowsSandboxedSpawnRunner`, `--experimental_use_windows_sandbox`, default `false`, needing a `BazelSandbox.exe` Bazel does not distribute). "Windows is sandboxed" is false in practice, and it is the claim that makes a green Windows leg look like evidence for BZL-HERM-02 and BZL-HERM-26. | `grep -rn 'experimental_use_windows_sandbox' <the guidance under review>` against any claim that no Windows sandbox code exists, and `grep -rn 'sandbox' <Windows CI config>` against any claim that a Windows leg is sandboxed. A blanket claim in either direction = finding; a precise statement naming the default and the missing binary = pass. No evidence of real-world `windows-sandbox` adoption surfaced in this research. | CONSIDER (prose correction, not machine-verifiable) | all majors; Windows only; shapes A, F | none |
| **BZL-HERM-33** | Never assume `darwin-sandbox`'s localhost allowance behaves like Linux's network-namespace loopback; a test that binds a fixed local port can behave differently on macOS. | macOS has no network namespace, so "localhost" inside the darwin sandbox is the *same* loopback interface the host uses — a sandboxed process can be blocked from binding a port an unsandboxed process already owns, which cannot happen on Linux. Open and unfixed (bazelbuild/bazel#11325). The failure presents as a macOS-only flake with no visible connection to sandboxing. | `grep -rln 'block-network\|requires-network' --include='BUILD*' .` intersected with tests that bind a fixed port (`grep -rn 'listen(\|bind(\|:[0-9]\{4\}' <those targets' sources>`); each intersection member is a manual-review item on any macOS leg. EMPTY intersection = pass. A macOS-only flake in a port-binding test with a green Linux leg = read this rule before reading the test. | CONSIDER | all majors (source identical 8.7.0/9.2.0); macOS only; shapes A, F | none |
| **BZL-HERM-34** | Before diagnosing a "runfiles are stale or missing on Windows" report, name whether the entry is directory-shaped or file-shaped — they use different mechanisms and only one is gated on a flag. | `WindowsFileSystem.createSymbolicLink` is a three-way branch: a directory target always becomes an NTFS **junction** (no privilege needed, works regardless of `--windows_enable_symlinks`); a file target becomes a real **symlink** only with `--windows_enable_symlinks` plus Developer Mode or Administrator, and otherwise **silently becomes a full copy**. A tool walking the tree with POSIX `is_symlink()` semantics gets inconsistent answers across the three, so "the flag is set, therefore the tree is symlinks" is wrong for every directory entry and "the flag is unset, therefore there is no tree" is wrong too. | Reading heuristic on the failing entry: is the missing path a directory (an external repo's tree, a sub-binary's `.runfiles`) or a single file? Then `grep -rn 'windows_enable_symlinks\|enable_runfiles' .bazelrc* .github/workflows/*.yml` — but read that grep against the pinned ruleset too, because a ruleset may force `--enable_runfiles` at the rule level and make an EMPTY grep a false finding (rules_python ≥1.9.0 does; that row is `BZL-PY`'s). EMPTY grep alone = **not** a conclusion. | MUST (when diagnosing a Windows runfiles report) | all majors (`--enable_runfiles` default `"auto"`, byte-identical 8.7.0/9.2.0); Windows only; shapes A, E, F | none |
| **BZL-HERM-35** | On a Windows CI leg that relies on Bazel auto-finding Bash, either pin `BAZEL_SH` explicitly or document that the leg rides on the runner image's MSYS2 placement — never read a green leg as proof that Bash resolution is hermetic. | Bazel needs Bash for `genrule`, `sh_binary`/`sh_test` and any `ctx.actions.run_shell()`. Its hardcoded Windows probe path is `c:/msys64/usr/bin/bash.exe`, and GitHub's `windows-latest` image happens to preinstall MSYS2 at exactly `C:\msys64`. That is two independently maintained defaults lining up, not a contract: a self-hosted runner, another CI vendor, or a future image that relocates MSYS2 breaks every Bash-dependent target with no warning. And `BAZEL_SH` names a path, not a hash, so two Windows machines with different MSYS2 point releases are never proven identical. | `grep -rn 'BAZEL_SH\|msys' .github/workflows/*.yml .bazelrc*` — EMPTY **with a Windows leg that builds any genrule, `sh_*` target or `run_shell` action = finding** (undocumented coupling), and the fix is either the pin or one comment naming the assumption. EMPTY with no Bash-dependent target on Windows = pass. | CONSIDER | all majors; Windows only; shapes A, F | none |

## Applied to rules_ocx

The fleet's only Bazel repository. Every claim below is re-derivable from the cited audit
line or from a read-only command against `/home/mherwig/dev/rules_ocx`.

**Already satisfies**

- **BZL-HERM-03, -06** — vacuously. The committed `.bazelrc` is 14 lines and sets exactly
  five flags plus one `try-import` (`.bazelrc:2-14`; `build-contracts-and-ci-posture.md:53-60`);
  `grep -rn 'sandbox\|action_env\|execution_log\|stamp' .bazelrc .github taskfile.yml` returns
  nothing. No `--sandbox_debug`, no `--action_env`.
- **BZL-HERM-04** — the one hermeticity-relevant override in the repo is on the *correct*
  flag: `.bazelrc.user:2` uses `common --repo_env=CC=…`, not `--action_env`
  (`build-contracts-and-ci-posture.md:71,220`). `.bazelrc:11-13`'s own comment states the
  right model — repo rules see their environment and the `getenv()` declarations do the
  tracking — which is exactly BZL-HERM-05's correct phrasing.
- **BZL-HERM-09** — verified negative. CI never reads the developer file's content; the
  remote-cache action *creates* `.bazelrc.user` fresh at runtime containing only cache flags
  (`.github/actions/remote-cache/action.yml:27-34`;
  `build-contracts-and-ci-posture.md:79,264`). The `CC=`/`layering_check` pair never reaches
  a CI machine.
- **BZL-HERM-20, -21** — a hand-rolled instance of the pattern, complete.
  `docs/BUILD.bazel:38-47` generates one `diff_test` per doc with
  `failure_message = "docs are stale — run: bazel run //docs:update"`;
  `docs/BUILD.bazel:51-77` is the updater `sh_binary` whose script `cp`s into
  `$BUILD_WORKSPACE_DIRECTORY`. Neither test is tagged `manual` — the only exclusion is
  `target_compatible_with = _NOT_WINDOWS` (`docs/BUILD.bazel:19-22,44`), a platform
  incompatibility, which BZL-HERM-21 explicitly does not count as a violation.
- **BZL-HERM-22 (the MUST half)** — `ci.yml:57-60` carries the comment naming both the reason
  (stardoc emits an extra `repo_mapping` row under Bazel 9+) and the authoritative major
  (8.7.0), directly above the guarded exclusion at `ci.yml:62`.
- **BZL-HERM-28** — zero `WORKSPACE`/`WORKSPACE.bazel` files anywhere; pure Bzlmod from birth
  (`starlark-code-shape.md:59`).

**Violates**

- **BZL-HERM-01.** No `--incompatible_strict_action_env` anywhere, and the test matrix is
  `[ubuntu, macos, windows]` × `[8.7.0, 9.x, rolling]` (`ci.yml:41-42`). The 8.7.0 legs
  inherit `LD_LIBRARY_PATH` and the client `PATH` — and, per the measurement, exactly those two
  and nothing else; the 9.x and rolling legs inherit neither. Nothing in the repository
  announces the split (`sandbox-environment-and-toolchain-leakage.md:382`). On the three Windows
  shards the flip would additionally change which PATH-construction branch every action takes
  (`macos-windows-sandbox-and-runfiles-parity.md:168`). This is the family's single
  highest-value finding for this repo, and it costs one line to fix or one paragraph to document.
- **BZL-HERM-02.** No `--sandbox_default_allow_network` anywhere, so every action may reach
  the network. Three complications the rule's text already anticipates: the `examples` job
  builds against the live `ocx.sh` registry by design (`ci.yml:64-91`), so the flag has to be
  scoped away from that job; 3 of the 9 test shards are `windows-latest`, where nothing can
  enforce it; and the repo's own non-hermetic surface is repository-rule fetches, which this
  flag can never reach at all (#7764) — so setting it would not harden the part of `rules_ocx`
  that actually touches the network.
- **BZL-HERM-23.** The `offline` job (`ci.yml:170-199`) is deliberately uncached with a stated
  rationale (`ci.yml:171-172`) and asserts three things: a warm fetch succeeds, an offline
  refetch against the warmed OCX store succeeds, and an offline refetch against an empty
  store *fails* (`build-contracts-and-ci-posture.md:222-227`). That is a sound store-warmth
  proof and nothing more — it compares no action keys and would pass unchanged with a
  non-deterministic action. The frame calls it the "Offline-determinism job"
  (`bazel-frame.md:53`); the name overclaims.
- **BZL-HERM-27.** Windows legs exist in both the test matrix (`ci.yml:41`) and BCR-parity
  (`ci.yml:110`), and nothing sets `--output_user_root` (`grep` over `.bazelrc`, `.github`,
  `taskfile.yml` → empty; re-confirmed by the wave-4a follow-up). This corrects
  `sandbox-environment-and-toolchain-leakage.md:347`'s "fleet has zero Windows CI legs today".
- **BZL-HERM-29 (partially).** `AGENTS.md:34-35` states the tier-2 posture correctly
  ("repository rules are unsandboxed; that's inherent to Bazel, not a bug",
  `config-inventory.md:186`), but no document distinguishes the three tiers, and
  `config-inventory.md:313` records the total gap: "Action-key determinism (timestamps,
  absolute paths, `PYTHONHASHSEED`, archive metadata) — zero mentions" across all existing
  Bazel-adjacent config.
- **BZL-HERM-35 (new).** `.bazelrc` sets `startup --windows_enable_symlinks` and
  `common:windows --enable_runfiles`, but no `BAZEL_SH`, no MSYS2 install step, and no comment
  anywhere naming the assumption. The Windows legs work today only because GitHub's
  `windows-latest` image preinstalls MSYS2 at exactly the path Bazel's own fallback hardcodes
  (`macos-windows-sandbox-and-runfiles-parity.md:169`). One comment closes this.

**New commitments**

- **BZL-HERM-07** — cheap and structural. The repo has zero `cc_*` targets
  (`build-contracts-and-ci-posture.md:37`) and the C++ autodetection probe is the *entire*
  reason `.bazelrc.user:2` exists (`build-contracts-and-ci-posture.md:220`). One committed
  `common --repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` line removes the probe for every
  developer and retires the latent trap at its root instead of managing it.
- **BZL-HERM-08** — applies today, at CONSIDER. `.bazelrc.user:2-3` sets `CC=` to an
  absolute path under one machine's home directory and disables `layering_check` for both
  build and host; the repo compiles nothing that would exercise either. This is the map's
  M-C-09 distinction and the orchestrator's decision to preserve it, not flatten it.
- **BZL-HERM-15, -30** — no execution-log capture and no output-digest comparison exist
  anywhere in the repo, so there is currently no way to answer "why did this rebuild" except by
  reading code, and no way at all to answer "is this action deterministic".
- **BZL-HERM-16** — this is presently the *only* mechanical check available for the four
  repository-rule `_impl` functions, which have zero offline orchestration test coverage of
  their own `ctx.download`/`ctx.execute`/`ctx.symlink`/`ctx.file` sequencing
  (`starlark-code-shape.md:209,272`; framing corrected by frame correction 3a-6 — the technique
  is a fake-ctx `unittest`, not `analysistest`). Nothing else would catch a hermeticity
  regression before the live-registry example tests do.

**Cannot exhibit** — and this is a finding about the corpus, not about the repo

Rules **10-14** (action content), **17-18** (stamping), **19** (glob expansion), **24-26**
(toolchain hermeticity) and **31** (action-key path sensitivity, whose measurement used a
purpose-built scratch module rather than this repo) have no fleet instance to test against.
`rules_ocx` has 0 production genrules — the two that exist are in `examples/`
(`starlark-code-shape.md:159`) — 0 stamping
(`grep -rn 'info_file\|version_file\|--stamp' ocx docs BUILD.bazel MODULE.bazel` → empty),
0 real `**` globs (`starlark-code-shape.md:155,291`), and 0 `cc_*`/`py_*`/`js_*`/`rust_*`
targets (`starlark-code-shape.md:293`). To exhibit these rules the fleet would have to build:
a production `genrule` or `ctx.actions.run_shell` that emits generated source; a stamped
`*_binary` with `stamp = -1`; a recursive glob over a tree that later gains a subpackage; and
any `cc_*` or `py_*` target at all. The nearest real candidate is `bob` — 9 crates, a clean
DAG, no Python or TypeScript, no CI to preserve — which the frame's post-map decision table
already names as the `bazel-adopt` pilot candidate. Until then these ten rules are grounded
on upstream sources, the practitioner corpus and the wave-4b scratch measurements alone, and
every one of them says so.

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`).** Binds now and hardest:
  01-09, 15-16, 20-23, 26-30, 32-35 all have a live instance or a live absence; 10-14, 17-19,
  24-25, 31 are latent because the repo builds no actions of the relevant kind. The three
  Windows shards make 27, 32, 34 and 35 live today, and the three macOS shards make 33 live.
- **B — Rust CLI + Python acceptance harness (`ocx`, `grimoire`, `ocx-mirror`, `bob`,
  `rust-oci-client`).** Binds only on adoption, but the shape is already primed for two rules:
  the harness resolves its binary under test through `OCX_COMMAND`/`GRIM_COMMAND` with a fixed
  `test/bin/<name>` fallback (`fleet-bazel-readiness.md:170`) — an undeclared input by
  construction, which BZL-HERM-10, -15 and -30 are exactly the checks for; and `ocx`'s
  `vergen-gix` build script bakes git, build, rustc and CI provenance into the binary
  (`fleet-bazel-readiness.md:119`), which becomes a BZL-HERM-17/18 stamping question the moment
  it becomes a `cargo_build_script` — and, per frame correction 3b-3, one that
  `cargo_build_script` cannot answer on its own, because it parses and discards
  `cargo:rerun-if-changed`.
- **C — Rust + TypeScript monorepo (`creeptd-ng`).** The fleet's sharpest live instance of
  this family without a single line of Bazel: two services compile only against a live
  Postgres, with no `.sqlx/` offline cache committed (`fleet-bazel-readiness.md:270`) — a
  network-and-host dependency that BZL-HERM-02 finds on the first
  `--sandbox_default_allow_network=false` run, provided it is a build action and not a fetch.
  Its checked-in protobuf-generated `web/src/gen/**/*_pb.ts` (`fleet-bazel-readiness.md:241`)
  is BZL-HERM-20's exact shape today with nothing guarding freshness.
- **D — Python library or automation (`ocx-sdk-python`, `ocx-mirror-sdk`, `arcana/nox`,
  `index/bot-tools`, `ocx-indexbot`).** BZL-HERM-24 binds on adoption, in the *pin explicitly*
  form frame correction 3a-1 establishes: seven projects with `requires-python` floors from
  3.10 to 3.13 and no shared floor (`fleet-bazel-readiness.md:142`), against a rules_python
  soft-default whose rolling version moved from 3.11 to 3.14 in four months.
- **E — TypeScript package, extension or Action (7 repos + `creeptd-ng/web`).** BZL-HERM-24
  binds through rules_js's host-Node default; the two bun-locked packages (`setup-ocx`,
  `kate-middlechild`) cannot even reach a Bazel graph today, because `bun.lock` is not what
  `npm_translate_lock` consumes (`fleet-bazel-readiness.md:166`) — no instance to make
  hermetic yet. BZL-HERM-34 binds first here of any shape: rules_js 3.4.1 is the one ruleset
  that documents the exact Windows empty-coverage failure a missing runfiles tree causes.
- **F — Future polyglot Bazel monorepo (none today; `rules_ocx`'s own users).** Every rule
  binds. 12, 13, 17, 18, 24, 25, 31 exist only for this shape, and the map's own priority note
  applies: a topic inert in this fleet is not inert for the audience the artifacts ship to.

## AI-agent failure modes

Ranked by how often the corpus and the audits show it biting.

1. **Asserting a flag default without naming the Bazel major** — above all
   "`--incompatible_strict_action_env` now defaults true", which the frame itself does. A
   model trained mostly on Bazel-9-era material states the 9.x default as if it always held.
   *Check*: any guidance line naming either strict-env flag's default with no major attached
   is a gap, not a fact — re-derive it from the per-version table before trusting it, and
   prefer `bazel help build --long` against the pinned binary over any prose page.
2. **Reading an empty execution-log diff as proof of determinism.** The log's fields cannot
   see output non-determinism at all; a `date`-embedding genrule produces a clean diff and
   different bytes on the same host. *Check*: BZL-HERM-30's paired `sha256sum` run — an
   execlog diff alone is never the answer.
3. **Tagging a failing `diff_test`/`write_source_files` target `manual` to turn CI green.**
   This deletes the entire safety mechanism rather than regenerating the stale file.
   *Check*: any diff that adds a `manual` tag to such a target without also regenerating the
   file it guards (BZL-HERM-21's grep).
4. **Editing a `glob()` pattern and stopping there.** The agent re-reads the Starlark and
   never notices that an unrelated new `BUILD.bazel` elsewhere in the same PR shrank the match
   set. *Check*: any diff touching a glob's containing tree must be paired with a
   `bazel query 'kind("source file", deps(…))'` diff (BZL-HERM-19), not a visual read.
5. **Believing the sandbox blocks the network by default.** "Bazel sandboxes the build, so it
   must be network-isolated" is wrong on the default, doubly wrong on Windows, and wrong in a
   third way for a repository-rule fetch, which no sandbox flag reaches.
   *Check*: `grep -n 'sandbox_default_allow_network' .bazelrc*` before any "hermetic by
   default" claim; then ask which phase the problem is in — `ctx.actions.run*` (in scope) or a
   `repository_rule` implementation (loading phase, out of reach entirely).
6. **Believing `--repo_env=X` restricts a repository rule's environment to `X`.**
   *Check*: does the generated text say "`--repo_env` restricts…"? Rewrite to "guarantees
   invalidation tracking for the named variables"; the restriction is
   `--experimental_strict_repo_env`, default off.
7. **Spelling a name that does not exist, or a name that has moved**:
   `--experimental_strict_action_env` (renamed years ago),
   `build --define=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1`, a `load()` of that symbol, or
   `--experimental_reuse_sandbox_directories` (silently aliased to `--reuse_sandbox_directories`).
   *Check*: `grep -rn 'experimental_strict_action_env\|define=BAZEL_DO_NOT_DETECT\|experimental_reuse_sandbox'` —
   any hit is wrong on its face; the only correct forms are
   `common --repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` (or the variable in the process
   environment before Bazel starts) and `--reuse_sandbox_directories`.
8. **Citing an issue without reading whether its own resolution matches the claim.**
   bazelbuild/bazel#11482 is the textbook trap: its title and its reporter's theory match the
   common "a long symlink name falls back to a copy" story, but the maintainer redirected the
   thread to a DLL-basename collision and closed it as that. This exact mis-citation stood
   inside BZL-HERM-27 for a wave. *Check*: read the closing comments, not the opening body.
9. **Proposing a `WORKSPACE`, `local_repository()` or `cc_configure()` fix on a Bazel-9
   target.** *Check*: BZL-HERM-28's grep — the machinery was deleted, not deprecated.
10. **Adding `--sandbox_debug` to a shared `.bazelrc` "to help debug CI failures."**
    *Check*: BZL-HERM-03's grep must always return empty on committed files.
11. **Using `--explain` to diagnose a cache or hermeticity question.** It reasons only from
    the local dependency checker and reports "action is new" for actions that were confirmed
    disk-cache hits. *Check*: BZL-HERM-15 — the execution log's `runner`/`cache_hit` fields,
    never `--explain`.
12. **Writing a genrule that shells into `cargo build`, `npm run` or `make`** because the
    familiar tool invocation is easier to emit than a purpose-built rule.
    *Check*: `grep -rn 'genrule(' --include='BUILD*' .` then read each `cmd` for a foreign
    build binary.
13. **Swapping `ctx.info_file` and `ctx.version_file`.** Picking the volatile file when the
    intent is "rebuild when this changes" reproduces a real, shipped regression.
    *Check*: BZL-HERM-17's grep plus a read of each site against the value's meaning.
14. **Treating "roughly the same as the Linux sandbox" as either full parity or no isolation.**
    Both extremes fail on reading `DarwinSandboxedSpawnRunner.java`: darwin-sandbox denies
    writes and (conditionally) the network, and does not isolate host reads.
    *Check*: BZL-HERM-26's rationale before any macOS hermeticity claim.
15. **Returning a `struct(...)`-based provider, or using `collect_data`/`collect_default`/
    `DefaultInfo(data_runfiles=…)`.** All four are explicitly deprecated on the current
    rules-authoring page but appear throughout the tutorials a model trained on.
    *Check*: `grep -rn 'collect_data\|collect_default\|data_runfiles' --include='*.bzl' .` —
    a modernization finding owned by `BZL-LARK`, listed here because it surfaces during the
    same read.

## Open questions

### Needs a human decision

1. **Set `--incompatible_strict_action_env=true` in `rules_ocx`'s committed `.bazelrc`, or
   document the split?** The flag's *behaviour* is no longer in question — it is measured on
   both majors — but the decision is. Setting it changes the 8.7.0 legs' action environment on
   all three operating systems, and the 2018 attempt at this exact flip broke macOS (`md5` in
   `/sbin`) and Windows (Python, PowerShell) builds and was reverted within one release cycle.
   On the three Windows shards it additionally switches which PATH-construction branch every
   action takes, which is a larger change there than on Linux. The owner already decided (frame
   decision table, row 2) to hold the 8.7.0 pin; this is the follow-on question that decision
   creates. Documenting the split satisfies BZL-HERM-01's companion SHOULD without any
   behaviour change.
2. **Add `common --repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` to the committed `.bazelrc`?**
   It would retire the developer `.bazelrc.user` `CC=` line and the latent trap with it, at
   the cost of changing what every consumer's local build probes for. Cheap and reversible,
   but it is a change to a file consumers inherit.
3. **Rename or re-scope the `offline` CI job.** It proves cold-store correctness, not
   determinism, and the frame's own prose calls it a determinism job. Renaming is free;
   making it *actually* prove determinism means adding an execution-log capture **and** an
   output-digest comparison (BZL-HERM-15 plus BZL-HERM-30), which is real CI time.

### Deserves another research round

| Subarea | Exact question |
|---|---|
| `bazel-hermeticity-determinism` — hermetic sandbox, second half | What mount set does a real rules_js or rules_python build need under `--experimental_use_hermetic_linux_sandbox`? The bare-shell set (`/usr`, `/bin`, `/lib`, `/lib64`) is measured; an interpreter, its shared libraries, `/etc/resolv.conf` and a CA bundle are not. This is the one thing standing between BZL-HERM-26 and a real CI gate. |
| `bazel-hermeticity-determinism` — action key from a tool argument | Can an action key be destabilised by an absolute path constructed into a *tool argument* (a custom rule or `run_shell` that shells `pwd` into an argument, rather than reading it inside the command body)? The genrule/native-substitution half is measured and stable; this half was never probed, and it is the shape a rule author writes. |
| `bazel-starlark-and-build` — glob linting | What does buildifier's `constant-glob` warning catch that `--incompatible_disallow_empty_glob` does not, and does the pair together cover both the empty-match and the literal-pattern bug? `rules_ocx` sets the flag (`.bazelrc:8`) and nothing sets the warning. |
| `bazel-hermeticity-determinism` — mount pairs and the action key | `--sandbox_add_mount_pair` was observed *not* to bust an action-cache hit when its value changed. If that reproduces deliberately, a build's isolation level is not part of its action key — which would mean a cache populated under one mount set silently serves a build running under another. |

### M-C rows this ruleset does not settle

- **M-C-14** — "Does `--incompatible_disallow_empty_glob` catch a different bug from
  `constant-glob`?" Unclaimed by every wave-2 dive; the buildifier warning taxonomy lives
  in `bazel-starlark-and-build/buildifier-taxonomy-and-style.md`, whose `settles` list is
  M-A-only, and the wave-4b buildifier measurement does not touch either name. It is a
  `BZL-HERM`-section row whose evidence lives in `BZL-LARK`'s corpus — a map-partition
  artefact, not a research gap of this group. First row of the next round, above.

All other section-C rows (M-C-01 through M-C-13 and M-C-15 through M-C-18) are settled by at
least one rule above. **M-C-13 moved from unsettled to settled in this revision**
(BZL-HERM-31, measured).

## Revision log

**2026-09-06 — wave 4b.** Folded two follow-up dives and three host measurements. 29 rules → 35;
18 MUST → 21. Every existing ID keeps its number and its meaning; none retired.

| Change | IDs | Why | Input |
|---|---|---|---|
| Sharpened the non-strict action environment from "inherits the client PATH/`LD_LIBRARY_PATH`" to "inherits exactly those two names and nothing else"; added the Windows PATH-shape clause; added the measured runtime confirmation of the 8→9 default flip. | BZL-HERM-01, Verdict 1 | The looser phrasing reads as a broad client-env leak. Measured: an arbitrary exported variable never leaks in either mode, and `HOME` is absent in all four configurations. | `sandbox-strategy-…:330-410`; `flag-defaults-…:57`; `macos-windows-…:168` |
| Added the loading-phase clause: the flag is `execution`-tagged and cannot reach `repository_ctx.download`/`.execute`. Added the measured Linux enforcement, the source-settled darwin enforcement, and the `no-sandbox`/`local`/`requires-network` tag behaviour. | BZL-HERM-02, Verdict 3 | An overclaim by omission: the rule read as a general network control, and an agent would ship it against a fetch problem where it does nothing (bazelbuild/bazel#7764). | frame correction 3b-5; `bazel-flags-and-versions.md:49-59`; `sandbox-strategy-…:274-328`; `macos-windows-…:39,93` |
| **Corrected an overclaimed guarantee**: BZL-HERM-26's rationale asserted that `linux-sandbox` *and* `darwin-sandbox` mount the whole filesystem read-only. darwin-sandbox's profile begins `(allow default)` and denies only writes and (conditionally) the network — it does not isolate host reads. Also added the measured Linux remount evidence, the per-action tag caveat, and the Windows-vacuous clause. | BZL-HERM-26, Verdict 16 | The old text would let a reviewer certify a macOS leg as read-isolated when it is not. | `macos-windows-…:91-100`; `sandbox-strategy-…:121-160,445-505` |
| Replaced BZL-HERM-27's citation. Dropped bazelbuild/bazel#11482 (its own resolution is a DLL-basename collision, not a symlink-length-to-copy defect) for `bazel.build/configure/windows` plus the maintainer comment naming MSVC as the reason. Added the exact recipe `startup --output_user_root=C:/tmp` and the startup-vs-build-flag check. Raised **CONSIDER → SHOULD**. | BZL-HERM-27 | The rule's conclusion always stood; its evidence did not. With a normative source it earns SHOULD. | frame correction 4a-10; `macos-windows-…:128,196` |
| Extended BZL-HERM-15: `--explain` cannot see a disk/remote cache hit (measured); the persistent-local-cache hit is absent from the log entirely; `--restrict_to_runner` is the parser's flag and `--sort` the converter's; `--execution_log_sort` never applies to the compact format; the JSON log needs a `raw_decode` loop. **Corrected the EMPTY-DIFF reading** so it can no longer be read as a determinism claim. | BZL-HERM-15, Verdict 15 | The old EMPTY-DIFF text was the most dangerous sentence in the file: measured, a clean log diff coexists with changed output bytes. | `action-key-…:95,164-234`; `diagnosis-…:112-141` |
| New rule: pair every execution-log diff with an independent two-run output-digest comparison. | BZL-HERM-30 (new) | Measured, and it is the other half of the check BZL-HERM-15 was doing alone. | `action-key-…:204-234` |
| New rule: a stable action key is not a portable output. Settles M-C-13 with a cross-checkout disk-cache-hit proof, names `output_base`-hash-via-`$PWD` as the real mechanism, and records that `--experimental_output_paths=strip` is opt-in per action and does nothing for a genrule. | BZL-HERM-31 (new); BZL-HERM-10 rationale; Verdict 14 | M-C-13 was the first row of the previous round's research list; it is now measured on both majors. | `action-key-…:46-162` |
| New rules for the per-OS binding the follow-up settled: the precise Windows sandbox statement; darwin-sandbox's localhost non-parity; the Windows runfiles junction/symlink/copy branch; the Windows `BAZEL_SH`/MSYS2 coupling. | BZL-HERM-32, -33, -34, -35 (new) | The follow-up's NEW-1, NEW-2, NEW-3 and NEW-5 proposed revisions, all normative or codified. | `macos-windows-…:199-203` |
| **Fixed Verdict 13.** `--experimental_reuse_sandbox_directories` was renamed `--reuse_sandbox_directories` (old spelling a silent alias), defaults `true` on 8.7.0 and 9.2.0 (re-checked at the binary), has M-ID M-L-18 and a pass/fail reading. The drop from this family stands, for a corrected reason: it is a cost knob owned by `BZL-CC-30`. | Verdict 13; failure mode 7 | Three of the four clauses in the original drop were factually wrong. | frame correction 3b-4; `bazel-cpp.md:149-159`; own re-check |
| **Corrected BZL-HERM-29's removal claim.** On Bazel 8 `--test_env=NAME=` is an assignment to the empty string, not an unset; the explicit unset (`=NAME`) exists only from Bazel 9, uniformly across `--action_env`/`--host_action_env`/`--repo_env`/`--test_env`. | BZL-HERM-29, Verdict 6, Verdict 7 | Re-check of the verification cell against both binaries: 8.7.0 prints `a 'name=value' assignment`, 9.2.0 adds "or the special syntax `=name` to unset a variable". | own re-check, `bazel help build --long` on 8.7.0 and 9.2.0, 2026-09-06 |
| Re-read every flag this file names off `bazel help build --long` on the 8.7.0 and 9.2.0 binaries. Two new version facts recorded in Verdict 12: `--incompatible_sandbox_hermetic_tmp` (true on 8.7.0) is gone from the 9.2.0 help surface; `--verbose_explanations` is gone from the 9.2.0 help surface but **still parses** — documented-away, not removed. | Verdict 12 | The task's re-check instruction; also guards against citing a flag that no longer documents itself. | own re-check, 2026-09-06 |
| Routed out of family rather than adopted: the follow-up's NEW-4 (`rules_python` ≥1.9.0 forces `--enable_runfiles` at the rule level on Windows, so an EMPTY `.bazelrc` grep can false-positive) belongs to `BZL-PY`/`BZL-TEST-24`. Recorded as a caveat inside BZL-HERM-34's verification so this file's own grep cannot mislead. | BZL-HERM-34; Boundaries paragraph | It is a per-ruleset behaviour, not a Bazel-level hermeticity standard. | `macos-windows-…:198,202` |
| Removed three "deserves another research round" rows the inputs answered (action-key path sensitivity, sandbox parity, hermetic sandbox) and the M-C-13 row. Added two replacement rows for the gaps the research established rather than closed, plus the mount-pair/action-key observation. | Open questions | The task's rule: an answered question leaves; an established gap moves into the Verdict and, where it is still actionable, becomes a narrower question. | all five inputs |
| Added the "generated-repo BUILD/`.bzl` text is out of reach" statement to the ruleset preamble and to the two greps most likely to be trusted blindly. | preamble, BZL-HERM-04, -10 | Frame correction 2-9 requires it of every grep-based verification in the shipped set. | frame correction 2-9 |

## Sub-artifacts

- [`bazel-hermeticity-determinism/action-nondeterminism-taxonomy.md`](bazel-hermeticity-determinism/action-nondeterminism-taxonomy.md)
  — the language-independent eight-cause list for an action that is not a pure function of its
  declared inputs, each cause with its symptom and check, plus the stamping stable/volatile
  contract and the ordered rebuild triage. Per-language depth files cite it rather than
  restating it.
- [`bazel-hermeticity-determinism/sandbox-environment-and-toolchain-leakage.md`](bazel-hermeticity-determinism/sandbox-environment-and-toolchain-leakage.md)
  — how a build reaches the host despite the sandbox: the three strategies and what each does
  not isolate, the read-only host mount and its measured cost across 70 projects, C++
  autodetection's one escape hatch, the two Bazel-8-versus-9 environment default flips
  verified per tag, the glob package-boundary trap, and the checked-in-generated-file pattern.
- [`bazel-followups/macos-windows-sandbox-and-runfiles-parity.md`](bazel-followups/macos-windows-sandbox-and-runfiles-parity.md)
  — the per-OS half this family could not close in wave 2: darwin-sandbox's actual
  `sandbox-exec` profile and its `(deny network*)` line, the localhost non-parity bug, the
  `windows-sandbox`/BuildXL code path that ships without its binary, the Windows
  junction/symlink/copy branch, the MSYS2 coupling, and the correction to BZL-HERM-27's
  citation. Source-read only — no macOS or Windows runner was exercised.
- [`bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md`](bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md)
  — the execution-log and profiling tool surface behind BZL-HERM-15 and `bazel-diagnose`:
  parser-versus-converter flag ownership, what `--explain` can and cannot report, the
  `SpawnExec` fields, `bb explain` as the packaged log diff, and the three decision trees.
- [`bazel-measurements/action-key-path-sensitivity-and-execlog.md`](bazel-measurements/action-key-path-sensitivity-and-execlog.md)
  — the cross-checkout disk-cache experiment that settles M-C-13, the execution log's volatile
  field list, the `--explain`-on-a-cache-hit trap, and the pairing that proves the log cannot
  see output non-determinism. Measured on 8.7.0 and 9.2.0, `linux-sandbox`, WSL2.
- [`bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md`](bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md)
  — the `--sandbox_debug` remount transcript behind BZL-HERM-26, the network flag measured
  under `linux-sandbox` and under three tags, the strict-action-env side-by-side on both
  majors, and the minimal hermetic-sandbox mount set. WSL2 host; the mount list is
  WSL-specific, the mechanism is not.
- [`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)
  — flag defaults read off the 8.7.0, 8.8.0 and 9.2.0 binaries themselves, including the
  `--incompatible_strict_action_env` flip and the reminder that a flag can live in
  `help startup_options` and never appear in `help build --long`.

## Key sources

| URL | What it grounds |
|---|---|
| [bazel.build/reference/skyframe](https://bazel.build/reference/skyframe) | The invalidation invariant every rule in this family reduces to, quoted verbatim |
| [bazel.build/reference/be/general](https://bazel.build/reference/be/general) | The genrule "General Advice" determinism checklist and the `PATH`-re-execution fact (BZL-HERM-10, -11, -12, -13) |
| [bazel.build/extending/rules](https://bazel.build/extending/rules) | The action purity contract, and the deprecated provider/runfiles APIs an LLM reaches for |
| [bazel.build/docs/sandboxing](https://bazel.build/docs/sandboxing) | The three strategies, `--sandbox_debug`'s disk-leak warning (BZL-HERM-03, -26); also the page that never mentions Windows (BZL-HERM-32) |
| [bazel.build/remote/workspace](https://bazel.build/remote/workspace) | The named non-hermetic `repository_ctx` operations and the workspacelog mechanism (BZL-HERM-16) |
| [bazel.build/reference/be/functions](https://bazel.build/reference/be/functions) | `glob()`'s own package-boundary semantics (BZL-HERM-19) |
| [bazel.build/docs/user-manual](https://bazel.build/docs/user-manual) | Stable-versus-volatile status keys, `--stamp` per-rule defaults, `BUILD_WORKSPACE_DIRECTORY`, `--explain`'s exact scope (BZL-HERM-15, -17, -18, -20) |
| [bazel.build/configure/windows](https://bazel.build/configure/windows) | The MAX_PATH limitation and the exact `startup --output_user_root=C:/tmp` recipe (BZL-HERM-27), `--windows_enable_symlinks`'s Dev-Mode requirement (BZL-HERM-34) |
| [bazel.build/remote/cache-remote](https://bazel.build/remote/cache-remote) | Bazel's own two-run and two-machine execution-log diff recipes, independent of this program's derivation (BZL-HERM-15) |
| `bazel help build --long` on the 8.7.0 and 9.2.0 binaries, 2026-09-06 | Every flag name, default and help string this file asserts — the CLI reference read at the pin, not a prose page |
| [BazelRuleClassProvider.java, fetched per tag 6.0.0 → 9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/8.7.0/src/main/java/com/google/devtools/build/lib/bazel/rules/BazelRuleClassProvider.java) | `--incompatible_strict_action_env`'s exact per-version default and its per-OS `pathOrDefault` PATH construction (BZL-HERM-01) |
| [CommonCommandOptions.java, fetched at 8.7.0/8.8.0/9.0.0/9.1.0/9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/runtime/CommonCommandOptions.java) | `--repo_env`/`--action_env`/`--incompatible_repo_env_ignores_action_env` and their 8→9 flip (BZL-HERM-04, -05) |
| [SandboxOptions.java (master and @8.7.0)](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java) | Exact defaults for `--sandbox_default_allow_network`, `--sandbox_debug`, `--sandbox_fake_*`, `--sandbox_tmpfs_path`, `--experimental_use_windows_sandbox` (BZL-HERM-02, -03, -14, -26, -32) |
| [DarwinSandboxedSpawnRunner.java @8.7.0](https://github.com/bazelbuild/bazel/blob/8.7.0/src/main/java/com/google/devtools/build/lib/sandbox/DarwinSandboxedSpawnRunner.java) | The generated `sandbox-exec` profile: `(allow default)` first, `(deny network*)` conditionally, no read isolation (BZL-HERM-26, -33) |
| [WindowsFileSystem.java @8.7.0](https://github.com/bazelbuild/bazel/blob/8.7.0/src/main/java/com/google/devtools/build/lib/windows/WindowsFileSystem.java) | The junction-vs-symlink-vs-copy branch for every Windows link Bazel creates (BZL-HERM-34) |
| [src/main/protobuf/spawn.proto @9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/main/protobuf/spawn.proto) | `SpawnExec`'s fields and the "spawns whose owning action hits the persistent action cache are never reported" comment (BZL-HERM-15) |
| [rules_cc `cc/private/toolchain/cc_configure.bzl`](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/cc/private/toolchain/cc_configure.bzl) | The `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN` implementation — source-verified, not doc-verified (BZL-HERM-07) |
| [bazelbuild/bazel#7764](https://github.com/bazelbuild/bazel/issues/7764) | Open since 2019: repository-rule fetches are not sandboxed, so no sandbox flag reaches them (BZL-HERM-02) |
| [bazelbuild/bazel#11325](https://github.com/bazelbuild/bazel/issues/11325) | Open: darwin-sandbox's localhost is the host's real loopback (BZL-HERM-33) |
| [bazelbuild/bazel#29472](https://github.com/bazelbuild/bazel/issues/29472) | Test actions have no strict-env equivalent; open at 2026-09-05 (BZL-HERM-29) |
| [bazelbuild/bazel#14341](https://github.com/bazelbuild/bazel/issues/14341) | The unresolved stamping contract between Bazel and rulesets (BZL-HERM-18) |
| [src/tools/execlog README @9.2.0](https://raw.githubusercontent.com/bazelbuild/bazel/9.2.0/src/tools/execlog/README.md) | Parser-versus-converter flag ownership and the exact invocation (BZL-HERM-15) |
| [bazel-contrib/bazel-lib `lib/private/write_source_file.bzl`](https://raw.githubusercontent.com/bazel-contrib/bazel-lib/main/lib/private/write_source_file.bzl) | The `BUILD_WORKSPACE_DIRECTORY` mechanism behind the checked-in-generated-file pattern (BZL-HERM-20, -21) |
| [actions/runner-images Windows2022-Readme.md](https://github.com/actions/runner-images/blob/main/images/windows/Windows2022-Readme.md) | MSYS2 preinstalled at `C:\msys64`, matching Bazel's hardcoded probe path (BZL-HERM-35) |
| Zheng, Adams, Hassan — "On Build Hermeticity in Bazel-based Build Systems" (IEEE Software, 2024/2025) | 150M-syscall study across 70 projects: zero fully hermetic, official rulesets' defaults the largest cause (BZL-HERM-24) |
| [blog.bazel.build/2026/01/20/bazel-9.html](https://blog.bazel.build/2026/01/20/bazel-9.html) | WORKSPACE code deletion and the era grounding for every version-split claim (BZL-HERM-28) |

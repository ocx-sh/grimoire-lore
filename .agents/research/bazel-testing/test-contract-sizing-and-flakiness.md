---
title: "Bazel test contract: size, sharding, flakiness, and the tag taxonomy"
topic: test-contract-sizing-and-flakiness
group: bazel-testing
family: BZL-TEST
agent: sonnet-research-wave3a
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 16
primary_sources_count: 12
settles: [M-E-01, M-E-02, M-E-03, M-E-04, M-E-05, M-E-06, M-E-07, M-E-08, M-E-09]
scope: >
  The contract every `*_test` target signs with Bazel: `size`/`timeout` and their
  RAM/CPU/seconds numbers, the sharding protocol and its failure mode, `flaky`/
  `--flaky_test_attempts`/`--runs_per_test`, the full sandbox-and-cache tag
  taxonomy split by action kind, and the test-encyclopedia's environment
  invariants. Does NOT cover: `analysistest`/`unittest`, hand-rolled `ctx` fakes,
  `--instrumentation_filter` or runfiles-and-coverage-on-Windows — that is
  `bazel-testing/testing-starlark-and-coverage` (M-E-10..M-E-13), cited but not
  re-derived here.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Size: the RAM/CPU/timeout table](#1-size-the-ramcputimeout-table)
   2. [Timeout is independent of size](#2-timeout-is-independent-of-size)
   3. [The `cpu:n` tag: size never buys more than 1 core](#3-the-cpun-tag-size-never-buys-more-than-1-core)
   4. [Sharding: the cap, the protocol, and a documentation self-contradiction the source code resolves](#4-sharding-the-cap-the-protocol-and-a-documentation-self-contradiction-the-source-code-resolves)
   5. [`flaky = True`: three reruns, "generally discouraged"](#5-flaky--true-three-reruns-generally-discouraged)
   6. [`--flaky_test_attempts` vs `--runs_per_test`: opposite jobs wearing similar names](#6---flaky_test_attempts-vs---runs_per_test-opposite-jobs-wearing-similar-names)
   7. [The tag taxonomy, part 1: tests and genrules read `tags` directly](#7-the-tag-taxonomy-part-1-tests-and-genrules-read-tags-directly)
   8. [The tag taxonomy, part 2: Starlark actions read `execution_requirements`, and `tags` only arrives via a flag](#8-the-tag-taxonomy-part-2-starlark-actions-read-execution_requirements-and-tags-only-arrives-via-a-flag)
   9. [`no-remote-cache` vs `no-remote-cache-upload`](#9-no-remote-cache-vs-no-remote-cache-upload)
   10. [`manual` vs `query`: the asymmetry, confirmed twice](#10-manual-vs-query-the-asymmetry-confirmed-twice)
   11. [Environment invariants: two writable paths, no atimes, no runfiles mutation](#11-environment-invariants-two-writable-paths-no-atimes-no-runfiles-mutation)
   12. [Network: sandboxed by default is not blocked by default](#12-network-sandboxed-by-default-is-not-blocked-by-default)
   13. [`external` and `--cache_test_results`](#13-external-and---cache_test_results)
   14. [Test execution platform (new prose in 9.1.0)](#14-test-execution-platform-new-prose-in-91-0)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `size` implies RAM/CPU/timeout: small=20MB, medium=100MB (default), large=300MB, enormous=800MB — CPU is **always 1 core** regardless of size ([be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes-tests)).
- `timeout` (short/moderate/long/eternal = 60/300/900/3600s) is set **independently** of `size`; every combination is legal, including a "short" `enormous` test ([test-encyclopedia](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#role-build-system)).
- `shard_count` is capped at 50 and defaults to `-1` (unsharded); Bazel enforces the cap at analysis time, so a rule never needs to check it itself ([be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes-tests)).
- A sharded test whose runner never touches `TEST_SHARD_STATUS_FILE` does **not** silently run the whole suite per shard: Bazel throws `LOCAL_TEST_PREREQ_UNMET` and force-fails a would-be pass — source-verified, and it contradicts the prose on the `shard_count` attribute itself (finding 4 below).
- `flaky = True` retries up to 3 times and reports FAILED only if all 3 fail; the docs call the attribute "generally discouraged" ([be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes-tests)).
- `--flaky_test_attempts` and `flaky=True` are built to make a test **pass** (any single success wins, remaining attempts skipped) — not to detect flakiness. Use `--runs_per_test=N --runs_per_test_detects_flakes` to detect it instead ([bazelbuild/bazel#3783](https://github.com/bazelbuild/bazel/issues/3783)).
- The sandbox/cache tags (`no-sandbox`, `no-cache`, `no-remote-cache`, `no-remote-exec`, `no-remote`, `no-remote-cache-upload`, `local`, `requires-network`, `block-network`, `requires-fakeroot`) apply **unconditionally** on a test or genrule's `tags =` list — no flag gates them there.
- The same tags on a **Starlark action** only take effect via `execution_requirements = {...}` on the action call, or by copy-through from the target's `tags` when `--incompatible_allow_tags_propagation` is true (**default true** as of both 8.7.0 and 9.1.0) — and an explicit `execution_requirements` entry always wins over a propagated tag ([TargetUtils.java](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/packages/TargetUtils.java)).
- `no-remote-cache` disables remote caching entirely (read + write); `no-remote-cache-upload` disables only the upload half — reads (cache hits) still happen. Treating them as synonyms either poisons or forfeits a shared cache silently.
- `manual` removes a target from `...`/`:*`/`:all` and unlisted `test_suite` expansion for `build`/`test`/`coverage` — but **not** from `bazel query`, confirmed identically in both the test-encyclopedia and the Build Encyclopedia ("Note: bazel query does not respect the manual tag").
- Only `TEST_TMPDIR` (required) and `TEST_UNDECLARED_OUTPUTS_DIR` (optional) are writable; tests must not assume atimes are enabled, must not assume any constant path is theirs, and must not mutate the runfiles tree during execution ([test-encyclopedia](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#test-interaction-filesystem)).
- `--sandbox_default_allow_network` defaults **true** in both 8.7.0 and 9.1.0 — network is allowed inside the sandbox by default, so an untagged network-touching test passes today by accident of a flag default, not by declared intent.
- `requires-network`/`block-network` only have any effect "if sandboxing is enabled" — under `--spawn_strategy=local` or `local = True` they are no-ops.
- `external` forces unconditional re-execution regardless of `--cache_test_results` (default `"auto"`) — it is a caching override, not a sandboxing one, and is easy to confuse with `requires-network`.
- Bazel 9.1.0's test-encyclopedia adds a new "Execution platform" section (test exec groups, `@bazel_tools//tools/test:default_test_toolchain`) absent from the 8.7.0 snapshot; everything else in size/timeout/sharding/tags/environment is byte-for-byte unchanged between the two majors.
- rules_ocx: 6 of ~84 test targets (7%) declare `size` explicitly (all `"small"`); the other 78 (93%, all `analysistest`/`unittest`/`diff_test`) silently default to `"medium"` (100MB, 300s) despite finishing in milliseconds.
- rules_ocx has zero `flaky`, zero `shard_count`, zero sandbox/cache/network tags anywhere — and that absence is correct, not a gap: its only network-touching mechanism is repository-rule fetch (a different, unsandboxed phase `requires-network` does not gate), and its one construct that *would* need it (`e2e/bzlmod`'s lazy `jq` launcher) is deliberately left build-only, by the repo's own comment, specifically to dodge this exact question.
- rules_ocx's two `tags = ["manual"]` targets (`ocx/tests/launcher_test.bzl:1572,1581`) are fixture-only rules consumed as `target_under_test`, correctly excluded from `bazel build/test //...` while still visible to `bazel query` — the documented asymmetry, applied correctly.

## Findings

### 1. Size: the RAM/CPU/timeout table

The Build Encyclopedia's `size` attribute doc states the table verbatim (identical in the [8.7.0](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes-tests) and [9.1.0](https://bazel.build/versions/9.1.0/reference/be/common-definitions#common-attributes-tests) snapshots):

| Size | RAM (MB) | CPU (cores) | Default timeout |
|---|---|---|---|
| `small` | 20 | 1 | short (60s) |
| `medium` (default) | 100 | 1 | moderate (300s) |
| `large` | 300 | 1 | long (900s) |
| `enormous` | 800 | 1 | eternal (3600s) |

`size` is `nonconfigurable` (cannot be `select()`ed) and defaults to `"medium"` when omitted. It also feeds local scheduling: "Bazel tries to respect `--local_{ram,cpu}_resources` and not overwhelm the local machine by running lots of heavy tests at the same time" — so an under-declared `size` can cause Bazel to over-schedule concurrent heavy tests locally, and an over-declared one under-utilizes the machine by reserving RAM the test never uses.

### 2. Timeout is independent of size

> "While a test's size attribute controls resource estimation, a test's timeout may be set independently. If not explicitly specified, the timeout is based on the test's size." — [be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes-tests)

The four `timeout` values and their seconds (identical across 8.7.0/9.1.0):

| `timeout` | Seconds | Recommended minimum (test-encyclopedia) |
|---|---|---|
| `short` | 60 | 0 |
| `moderate` | 300 | 30 |
| `long` | 900 | 300 |
| `eternal` | 3600 | 900 |

"All combinations of `size` and `timeout` labels are legal, so an 'enormous' test may be declared to have a timeout of 'short'." ([test-encyclopedia](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#role-build-system)) `--test_timeout=<seconds>` overrides per-invocation, e.g. for a known-slow CI runner. `--test_verbose_timeout_warnings` (default `false`) prints a warning when a size's implied timeout is much larger than the test's actual runtime — the mechanical way to catch a stale, over-generous `size`.

### 3. The `cpu:n` tag: size never buys more than 1 core

The CPU column in the table above is `1` for **every** size — there is no size class that reserves more than one core. The test-encyclopedia's "Other resources" section names the actual lever: "You can increase the reservation to a higher number of CPU cores by adding the tag `cpu:n` (where n is a positive number) to a test rule." ([test-encyclopedia](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#other-resources)) Bumping `size` to get more parallelism for an internally-threaded test is a no-op; the `cpu:n` tag is the only attribute that changes the CPU reservation.

### 4. Sharding: the cap, the protocol, and a documentation self-contradiction the source code resolves

`shard_count`: "Non-negative integer less than or equal to 50; default is `-1`." Bazel enforces the ≤50 cap itself at analysis time (an attribute-validation error, not something a rule needs to police). Sharding additionally requires `--test_sharding_strategy` to not be `disabled` (default: `explicit` — only shards when `shard_count` is present; a `forced=k` mode exists for ad hoc overrides) — [command-line-reference](https://bazel.build/versions/8.7.0/reference/command-line-reference).

**The self-contradiction.** The `shard_count` attribute's own prose says:

> "Sharding requires the test runner to support the test sharding protocol. If it does not, then it will most likely run every test in every shard, which is not what you want." — [be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes-tests) (unchanged in 9.1.0)

But the test-encyclopedia — "intended to be both normative and authoritative… If this specification and the implemented behavior of test runner disagree, the specification takes precedence" — says the opposite:

> "If a runner supports sharding, it must create or update the last modified date of the file specified by `TEST_SHARD_STATUS_FILE`, otherwise Bazel will fail the test if it is sharded." — [test-encyclopedia](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#test-sharding)

Source-verified, this is the real, current behavior. `StandaloneTestStrategy.java` checks after a shard finishes:

```java
// Do not override a more informative test failure with a generic failure due to the missing
// shard file, which may have been caused by the test failing before the runner had a chance to
// touch the file
if (testResultDataBuilder.getTestPassed()
    && testAction.isSharded()
    && !actionExecutionContext.getPathResolver().convertPath(resolvedPaths.getTestShard()).exists()) {
  TestExecException e = createTestExecException(
      TestAction.Code.LOCAL_TEST_PREREQ_UNMET,
      "Sharding requested, but the test runner did not advertise support for it by touching "
      + "TEST_SHARD_STATUS_FILE. Either remove the 'shard_count' attribute or use a test "
      + "runner that supports sharding.");
  throw e;
}
```
[`StandaloneTestStrategy.java:709-724`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/exec/StandaloneTestStrategy.java#L709-L724)

The override fires only when the shard would otherwise be reported as a **pass** — a shard that fails for its own reason keeps that original failure. Net effect: a sharding-unaware runner cannot silently pass by running the whole suite in every shard; it gets a hard `LOCAL_TEST_PREREQ_UNMET` failure the first time a shard would have passed. The `be/common-definitions` prose is stale relative to the actual implementation and has not been corrected in either the 8.7.0 or 9.1.0 snapshot.

### 5. `flaky = True`: three reruns, "generally discouraged"

> "Marks test as flaky. If set, executes the test up to three times, marking it as failed only if it fails each time. … Note, that use of this attribute is generally discouraged - tests should pass reliably when their assertions are upheld." — [be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes-tests)

`flaky` is `nonconfigurable`, default `False`. Command-line reference confirms the same three-attempt default is what `--flaky_test_attempts=default` uses for rule-marked-flaky tests specifically: "three for tests marked explicitly as flaky by their rule (`flaky=1` attribute)" ([command-line-reference](https://bazel.build/versions/8.7.0/reference/command-line-reference)).

### 6. `--flaky_test_attempts` vs `--runs_per_test`: opposite jobs wearing similar names

`--runs_per_test=<N>`: "Specifies number of times to run each test. **If any of those attempts fail for any reason, the whole test is considered failed.**" ([command-line-reference](https://bazel.build/versions/8.7.0/reference/command-line-reference))

`--flaky_test_attempts=<N|default>`: "Each test will be retried up to the specified number of times in case of any test failure. Tests that required more than one attempt to pass are marked as 'FLAKY' in the test summary." ([command-line-reference](https://bazel.build/versions/8.7.0/reference/command-line-reference))

These read similarly but do opposite things. [bazelbuild/bazel#3783](https://github.com/bazelbuild/bazel/issues/3783) (filed 2017, closed as working-as-intended) is the tracking issue the brief points at:

> "If you use `--flaky_test_attempts=N`, Bazel runs the test up to N times. If the test passes the first time, it's marked PASSED and remaining attempts are skipped. If it passes but not the first time, it's marked FLAKY and remaining attempts are skipped." — reporter's characterization, confirmed by maintainer `damienmg` in the closing discussion: "the goal of flaky test is … you want a test to pass even though sometimes it might fail."

So a test that is flaky 50% of the time passes `--flaky_test_attempts=10` roughly 100% of the time (first success wins), not `0.5^10` of the time as a naive reader would expect — `--flaky_test_attempts` is built to **paper over** flakiness, not detect it. The reporter's own conclusion after the maintainer's reply: "My mistake was in trying to use it to detect flakes. For that, `--runs_per_test`…" `--runs_per_test`'s default behavior (fail on any failure) is closer to detection, and pairing it with `--runs_per_test_detects_flakes` (default `false`) gets the actual FLAKY signal: "If true, any shard in which at least one run/attempt passes and at least one run/attempt fails gets a FLAKY status." ([command-line-reference](https://bazel.build/versions/8.7.0/reference/command-line-reference))

### 7. The tag taxonomy, part 1: tests and genrules read `tags` directly

Verbatim from the `tags` attribute doc, unconditional for "any test or `genrule` target":

| Tag | Effect |
|---|---|
| `no-sandbox` | Never sandboxed; may still be cached or run remotely |
| `no-cache` | Never cached, locally or remotely |
| `no-remote-cache` | Never cached **remotely** (local caching, remote execution still allowed) |
| `no-remote-exec` | Never executed remotely (remote caching still allowed) |
| `no-remote` | `no-remote-cache` + `no-remote-exec` combined |
| `no-remote-cache-upload` | Disables only the **upload** half of remote caching; execution unaffected |
| `local` | No remote cache, no remote exec, no sandbox — equivalent to `local = True` |
| `requires-network` | Allows external network from inside the sandbox (no-op unless sandboxing is on) |
| `block-network` | Restricts sandbox to localhost only (no-op unless sandboxing is on) |
| `requires-fakeroot` | Runs as uid/gid 0 on Linux; overrides `--sandbox_fake_username` |

Test-only tags, from the same source plus the test-encyclopedia's "Tag conventions" table:

| Tag | Effect |
|---|---|
| `exclusive` | Serializes the test after all other build/test activity; disables remote execution for it |
| `exclusive-if-local` | `exclusive` only when run locally; parallel when run remotely |
| `manual` | See §10 |
| `external` | See §13 |
| `small`/`medium`/`large` (bare) | `test_suite` convention only, no runtime effect |

Source: [be/common-definitions §tags](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes) and [test-encyclopedia §tag-conventions](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#tag-conventions).

### 8. The tag taxonomy, part 2: Starlark actions read `execution_requirements`, and `tags` only arrives via a flag

The same doc paragraph draws the line explicitly: "Bazel modifies the behavior of its sandboxing code if it finds the following keywords in the `tags` attribute of any test or `genrule` target, **or the keys of `execution_requirements` for any Starlark action.**" For a custom rule's `ctx.actions.run(...)`, `tags =` on the BUILD-file target does **not** reach the action unless copied in — either explicitly by the rule author, or automatically via tag propagation.

Tag propagation is gated by `--incompatible_allow_tags_propagation` (default **`true`** — confirmed identical in both [8.7.0](https://bazel.build/versions/8.7.0/reference/command-line-reference) and [9.1.0](https://bazel.build/versions/9.1.0/reference/command-line-reference) references; tracked at [bazelbuild/bazel#8830](https://github.com/bazelbuild/bazel/issues/8830)). When enabled, `TargetUtils.getExecutionInfo(rule)` filters the target's `tags` down to a fixed set of prefixes and merges them into every action's execution requirements:

```java
// TargetUtils.java — the propagated-prefix allowlist
private static boolean legalExecInfoKeys(String tag) {
  return tag.startsWith("block-")
      || tag.startsWith("requires-")
      || tag.startsWith("no-")
      || tag.startsWith("supports-")
      || tag.startsWith("disable-")
      || tag.startsWith("cpu:")
      || tag.equals(ExecutionRequirements.LOCAL)
      || tag.equals(ExecutionRequirements.WORKER_KEY_MNEMONIC)
      || tag.startsWith("resources:");
}
```
[`TargetUtils.java:50-60`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/packages/TargetUtils.java#L50-L60)

Precedence: an action's own explicit `execution_requirements = {...}` entry always wins over a same-key propagated tag — the merge is `putIfAbsent`, propagated tags only fill gaps ([`TargetUtils.java:262-291`, `getFilteredExecutionInfo`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/packages/TargetUtils.java#L262-L291)). And because the mapping is target-wide, a rule that registers several actions with different sandbox/cache needs cannot express that split through `tags =` alone — every action gets the same propagated set.

### 9. `no-remote-cache` vs `no-remote-cache-upload`

Two tags that read as synonyms but are not: `no-remote-cache` disables remote caching **completely** (no read, no write; local caching and remote execution unaffected); `no-remote-cache-upload` "disables upload part of remote caching of a spawn. It does not disable remote execution" ([be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes)) — reads (cache hits) still happen. Using the wrong one either (a) silently stops an action from ever benefiting from the shared cache when only the upload should have been suppressed, or (b) — the more dangerous direction — lets an action whose output should never be trusted from the cache continue to read stale/wrong entries because only the upload was blocked.

### 10. `manual` vs `query`: the asymmetry, confirmed twice

Build Encyclopedia: "`manual` keyword will exclude the target from expansion of target pattern wildcards (`...`, `:*`, `:all`, etc.) and `test_suite` rules which do not list the test explicitly when computing the set of top-level targets to build/run for the `build`, `test`, and `coverage` commands. It does not affect target wildcard or test suite expansion in other contexts, **including the `query` command**." ([be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes))

Test-encyclopedia, independently: "Note: bazel `query` does not respect the manual tag." ([test-encyclopedia](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#tag-conventions))

Both also note the intent is not "never run automatically" — only excluded from the three named commands' wildcard expansion; a properly-configured CI job that lists the target explicitly still runs it.

### 11. Environment invariants: two writable paths, no atimes, no runfiles mutation

From the test-encyclopedia's normative environment table and prose ([test-encyclopedia](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#initial-conditions), [§test-interaction-filesystem](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#test-interaction-filesystem)):

- Writable: `$TEST_TMPDIR` (required, private) and `$TEST_UNDECLARED_OUTPUTS_DIR` (optional; contents get zipped into `bazel-testlogs/.../outputs.zip`). Nothing else.
- "Tests must not assume that any constant path is available for their exclusive use." `/home/*` may be unavailable; `/tmp` is writable but discouraged.
- "Tests must not assume that atimes are enabled for any mounted filesystem."
- "No directory, file, or symlink within the runfiles tree … should be writable… The runfiles tree … must not change during test execution."
- Tests access inputs only through the runfiles mechanism, never by inferring a path from their own executable's location.
- `TEST_PREMATURE_EXIT_FILE`: a test may create this file on start and remove it on exit; if Bazel still sees it at completion, the test is marked failed regardless of exit code — catches early/silent exits.

### 12. Network: sandboxed by default is not blocked by default

`--sandbox_default_allow_network` — "Allow network access by default for actions; this may not work with all sandboxing implementations." **Default: `"true"`**, confirmed identical in [8.7.0](https://bazel.build/versions/8.7.0/reference/command-line-reference) and [9.1.0](https://bazel.build/versions/9.1.0/reference/command-line-reference). `requires-network`/`block-network` only matter "if sandboxing is enabled" ([be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes)) — under the `local`/`standalone` strategy or `local = True` they're no-ops because there's no sandbox network boundary to toggle. The [sandboxing doc](https://bazel.build/docs/sandboxing) adds that `linux-sandbox`/`darwin-sandbox` are the two strategies that can enforce network denial at all; `processwrapper-sandbox` (the POSIX fallback used inside Docker or nested sandboxes) cannot.

### 13. `external` and `--cache_test_results`

`external`: "will force test to be unconditionally executed (regardless of `--cache_test_results` value)" ([test-encyclopedia](https://bazel.build/versions/8.7.0/reference/test-encyclopedia#tag-conventions)). `--cache_test_results` (`-t`) defaults `"auto"`: reruns "if and only if: (1) Bazel detects changes … (2) the test is marked as external, (3) multiple test runs were requested with `--runs_per_test`, or (4) the test previously failed" ([command-line-reference](https://bazel.build/versions/8.7.0/reference/command-line-reference)). `external` is a **caching** override — it says nothing about network or sandbox access — and is easy to reach for when `requires-network` was the tag actually needed.

### 14. Test execution platform (new prose in 9.1.0)

Diffing the pinned [8.7.0](https://raw.githubusercontent.com/bazelbuild/bazel/master/docs/versions/8.7.0/reference/test-encyclopedia.mdx) and [9.1.0](https://raw.githubusercontent.com/bazelbuild/bazel/master/docs/versions/9.1.0/reference/test-encyclopedia.mdx) test-encyclopedia snapshots byte-for-byte, the **only** substantive addition is a new "Execution platform" section: every test rule now has an implicit `test` exec group defaulting to a mandatory toolchain requirement on `@bazel_tools//tools/test:default_test_toolchain_type`, gated by `--@bazel_tools//tools/test:incompatible_use_default_test_toolchain` (default enabled) — the legacy `legacy_test_toolchain` path ("often not the intended behavior in multi-platform builds," e.g. a Linux test binary getting executed on a Windows host) is explicitly flagged as due for removal ("expect this option to be unavailable in a future Bazel release"). Everything covered in findings 1–13 above is byte-identical between the two snapshots.

## Decisions

**1. Is `size` MUST or SHOULD? → SHOULD, with a MUST-level check reserved for a size/timeout that visibly lies about a test's real cost.**
Evidence: an unset or wrong `size` never breaks correctness — the test still runs, still reports pass/fail — it only affects local-scheduling assumptions and the default timeout ([finding 1](#1-size-the-ramcputimeout-table)). rules_ocx's own 78-of-84 silent-default rate ([Fleet evidence](#fleet-evidence)) is real waste, not a defect: the 76 `analysistest` targets finish in milliseconds and the 100MB `medium` reservation is never actually used. Elevating this to MUST would demand busywork on every fast fake-`ctx` unit test with no payoff. The mechanically checkable, higher-value MUST sits one layer down: a test whose measured runtime doesn't match its declared/implied timeout (`--test_verbose_timeout_warnings`) is worth blocking on, because that mismatch is the one that actually causes CI flakiness (too-tight) or wasted executor slots (too-loose). Assumption: CI has budget to run the verbose-timeout check at least occasionally (e.g., on a schedule, not every PR) — it is not free.

**2. The shipped position on `flaky`. → `flaky = True` and `--flaky_test_attempts` are SHOULD-NOT-without-a-linked-cause; `--runs_per_test` + `--runs_per_test_detects_flakes` is the recommended detection tool.**
Evidence: the docs' own "generally discouraged" ([finding 5](#5-flaky--true-three-reruns-generally-discouraged)), the semantics confirmed by the tool's own maintainers as "pass on any success" rather than "detect instability" ([finding 6](#6---flaky_test_attempts-vs---runs_per_test-opposite-jobs-wearing-similar-names), [#3783](https://github.com/bazelbuild/bazel/issues/3783)), and rules_ocx's own zero-usage baseline. Not a MUST-NOT: a test with a genuinely external, occasionally-unreliable dependency (a live registry, per the frame) may have a real, temporary, tracked reason to mask it while the root cause is fixed. Assumption: "linked cause" means a comment with a bug/issue reference next to the tag or flag invocation — a bare `flaky = True` with no comment is the actual finding, not the attribute's mere presence.

**3. The tag-to-effect table: written once for tests/genrules, once for Starlark actions, never merged. → Done, above (findings 7 and 8).**
Evidence: [finding 8](#8-the-tag-taxonomy-part-2-starlark-actions-read-execution_requirements-and-tags-only-arrives-via-a-flag) shows the two paths are genuinely different mechanisms (unconditional native read vs. flag-gated Starlark propagation with `putIfAbsent` precedence), not a stylistic split. A merged table would either wrongly imply every custom rule's `tags` always reaches its actions (false when the incompatible flag is flipped off, or when the rule's own `execution_requirements` shadows it) or wrongly imply a test/genrule's tags need a flag (false — they're unconditional). Assumption: none beyond what's cited; this is source-verified, not argued.

## Normative guidance candidates

1. **Give every test target an explicit `size`, or accept `medium` deliberately.**
   Rationale: the silent default (`medium`, 100MB/300s) either wastes a CI slot on a trivial test or under-provisions a genuinely heavy one.
   Verify: `bazel query 'attr(size, "medium", tests(//...))'` — lists every test whose *effective* size is medium, explicit or defaulted; review each. Empty output = every test has chosen a non-medium size (PASS by exclusion, not proof of correctness).
   Empty reads: PASS (no medium-sized tests to review). Severity: SHOULD. Applies: Bazel 8, 9 (table unchanged 8.7.0→9.1.0). Settles: M-E-01.

2. **Re-run `--test_verbose_timeout_warnings` after any test's runtime changes materially.**
   Rationale: a `size`/`timeout` that no longer matches reality either risks flaking under a too-tight budget or silently reserves resources it never uses.
   Verify: `bazel test --test_verbose_timeout_warnings //path:target` and grep stderr for "considered too big" or similarly-worded size-mismatch warnings.
   Empty reads: PASS (no mismatch warning). Severity: SHOULD. Applies: Bazel 8, 9. Settles: M-E-01.

3. **Use the `cpu:n` tag, not a bigger `size`, when a test needs more than one core.**
   Rationale: every size class reserves exactly 1 CPU core; bumping `size` for parallelism is a no-op that also silently changes the RAM reservation and default timeout as a side effect.
   Verify: reading heuristic — grep the test's own harness/binary for internal thread-pool or `-j`-style parallelism flags; if present, confirm a `cpu:n` tag exists alongside.
   Empty reads: PASS (no internally-parallel test found without a matching tag). Severity: CONSIDER. Applies: Bazel 8, 9. Settles: M-E-01.

4. **Never add `shard_count` to a test target without independently confirming the harness touches `TEST_SHARD_STATUS_FILE`.**
   Rationale: an unaware runner does not silently run everything per shard — Bazel force-fails a would-be pass with `LOCAL_TEST_PREREQ_UNMET` ([finding 4](#4-sharding-the-cap-the-protocol-and-a-documentation-self-contradiction-the-source-code-resolves)) — but that failure only surfaces the first time a shard would otherwise pass, so it can hide behind other, unrelated shard failures for a while.
   Verify: `bazel test --test_sharding_strategy=forced=2 //path:target 2>&1 | grep -i "did not advertise support for it by touching"`.
   Empty reads: PASS (harness supports sharding, or target isn't sharded). A match is the finding. Severity: MUST. Applies: Bazel 8, 9 (source-identical). Settles: M-E-02.

5. **Never rely on `be/common-definitions`' `shard_count` prose ("will most likely run every test in every shard") as the behavior spec — the test-encyclopedia and the source both say Bazel fails loudly instead.**
   Rationale: the two official docs pages disagree, and only one matches the shipped implementation ([finding 4](#4-sharding-the-cap-the-protocol-and-a-documentation-self-contradiction-the-source-code-resolves)); an agent that reads only the attribute-table page will describe the wrong failure mode.
   Verify: named reading heuristic — cite `test-encyclopedia#test-sharding` (or the `StandaloneTestStrategy.java` check) whenever describing this behavior, never the `shard_count` attribute prose alone.
   Empty reads: N/A (a documentation heuristic, not a grep). Severity: MUST (for anything the shipped rule set asserts as fact). Applies: Bazel 8, 9. Settles: M-E-02.

6. **Never set `flaky = True` (or a target-scoped `--flaky_test_attempts` regex) without a comment naming the root cause and a tracking link.**
   Rationale: the attribute passes on the first of up to three successes, converting a genuine intermittent bug into silence; the docs call this "generally discouraged."
   Verify: `grep -rn 'flaky\s*=\s*True' --include=BUILD.bazel --include=BUILD .` then confirm each hit has an adjoining comment with a bug/issue reference.
   Empty reads: PASS (no `flaky = True` targets exist). Severity: SHOULD. Applies: Bazel 8, 9. Settles: M-E-03.

7. **To detect a suspected flake, use `--runs_per_test=N --runs_per_test_detects_flakes`, never `--flaky_test_attempts` or `flaky = True`.**
   Rationale: the latter two are built to make a test pass on the first success and skip remaining attempts — they cannot distinguish "reliably passes" from "got lucky once" ([finding 6](#6---flaky_test_attempts-vs---runs_per_test-opposite-jobs-wearing-similar-names), [#3783](https://github.com/bazelbuild/bazel/issues/3783)).
   Verify: named reading heuristic — any investigation doc or CI runbook that recommends `--flaky_test_attempts` for *detecting* (rather than tolerating) a flake is itself the finding.
   Empty reads: PASS (no such recommendation found). Severity: SHOULD. Applies: Bazel 8, 9. Settles: M-E-04.

8. **On a test or genrule, read cache/sandbox tags (`no-sandbox`, `no-cache`, `no-remote*`, `local`, `requires-network`, `block-network`, `requires-fakeroot`) as taking effect unconditionally — no flag gates them there.**
   Rationale: this is the simple, always-true half of the taxonomy; treating it as flag-gated (confusing it with the Starlark-action half) leads to unnecessary defensive checks.
   Verify: named reading heuristic — cite `be/common-definitions#common-attributes` for this half of the table specifically, never conflate with `execution_requirements`.
   Empty reads: N/A. Severity: MUST (as a documentation-accuracy rule for anything the rule set asserts). Applies: Bazel 8, 9. Settles: M-E-08.

9. **On a Starlark rule's own actions, don't assume the target's `tags =` reaches `ctx.actions.run(execution_requirements=...)` — verify `--incompatible_allow_tags_propagation` is at its default, and know an explicit `execution_requirements` key always wins over a same-key propagated tag.**
   Rationale: this is the flag-gated, precedence-sensitive half of the taxonomy ([finding 8](#8-the-tag-taxonomy-part-2-starlark-actions-read-execution_requirements-and-tags-only-arrives-via-a-flag)); assuming tag-to-action parity with tests/genrules is the exact bug this candidate exists to catch.
   Verify: `grep -n 'incompatible_allow_tags_propagation' .bazelrc*` (repo has not flipped it off) **and** grep the rule's `.bzl` implementation for a hardcoded `execution_requirements = {...}` dict that might shadow an intended tag.
   Empty reads: PASS (flag at default `true`, no shadowing dict found). Severity: SHOULD. Applies: Bazel 8, 9 (flag default identical in both). Settles: M-E-08.

10. **A rule that registers multiple actions with different sandbox/cache needs must set `execution_requirements` per action call — target-level `tags` propagate identically to every action the rule registers.**
    Rationale: `TargetUtils.getExecutionInfo(rule)` returns one map, applied wherever any action of that target asks for it; there is no per-action targeting through `tags =` alone.
    Verify: named reading heuristic — inspect the rule implementation for 2+ `ctx.actions.*` calls; if the rule relies on target `tags` for cache/sandbox behavior and the actions have genuinely different needs, that's the finding (no query can surface this — it is a rule-implementation-shape check).
    Empty reads: PASS (single-action rule, or all actions share needs). Severity: CONSIDER. Applies: Bazel 8, 9. Settles: M-E-08.

11. **Never treat `no-remote-cache` and `no-remote-cache-upload` as interchangeable.**
    Rationale: one disables remote caching entirely (read + write); the other disables only the upload half, leaving cache reads live — using the wrong one either silently forfeits all cache reuse or silently continues trusting cached results that should never have been written in the first place.
    Verify: `grep -rn '"no-remote-cache"\|"no-remote-cache-upload"' --include=BUILD.bazel --include=*.bzl .` and confirm intent against [finding 9](#9-no-remote-cache-vs-no-remote-cache-upload)'s definitions for each hit.
    Empty reads: PASS (neither tag present — nothing to confuse). Severity: MUST. Applies: Bazel 8, 9. Settles: M-E-09.

12. **Treat `manual` as a `build`/`test`/`coverage`-only exclusion — never assume it hides a target from `bazel query`, a CI inventory script, or a dependency graph.**
    Rationale: the canonical "why didn't this run" incident is a target that's invisible to the tool that reports on CI health (`query`-based) yet excluded from the tool that actually executes tests (`test`) — the two disagree by design.
    Verify: `diff <(bazel query 'tests(//...)' | sort) <(bazel test --nobuild --test_output=summary //... 2>&1 | grep '^//' | sort)` (or equivalently `except attr(tags, "manual", ...)` on the query side) — any line only in the `query` output is `manual`-tagged and invisible to what `test //...` actually runs.
    Empty reads: PASS (no manual-tagged test targets, or all are consciously excluded with a comment). Severity: MUST. Applies: Bazel 8, 9 (identical in both docs). Settles: M-E-07.

13. **A `manual`-tagged target used purely as a test fixture (a `target_under_test`) is a correct, not a suspicious, use of the tag — don't flag it as a "why didn't this run" candidate.**
    Rationale: distinguishes the legitimate use (a fixture rule nobody should `bazel build //...` on its own) from the dangerous one (a real, buildable, testable target quietly opted out of CI). rules_ocx's own two uses are this pattern ([Fleet evidence](#fleet-evidence)).
    Verify: named reading heuristic — check whether the `manual` target is consumed as `target_under_test` by an `analysistest`/`unittest` elsewhere in the same package; if yes, it's a fixture, not a hidden test.
    Empty reads: N/A (a classification heuristic applied per-hit from candidate 12, not a standalone scan). Severity: CONSIDER. Applies: Bazel 8, 9. Settles: M-E-07.

14. **Give a test the `requires-network` tag whenever its *own execution* (not its dependencies' build/fetch step) reaches the network — and don't add it reflexively to a target merely because something in its closure was fetched from a registry.**
    Rationale: `--sandbox_default_allow_network` defaults `true`, so an untagged network-touching test action passes today by flag-default accident; the tag only matters "if sandboxing is enabled" and only describes the *action's* own network use, not a repository rule's separate, unsandboxed fetch phase.
    Verify: reading heuristic — for each test whose source or harness makes a live network call (`curl`, a known registry hostname, a socket connect) at **execution** time, confirm `tags = [..., "requires-network"]`; for a test that merely *consumes* an already-fetched external repo's runfiles, confirm no such tag was added.
    Empty reads: a FINDING if a known-network-executing test lacks the tag (silently relying on the sandbox default); PASS if it's tagged, or if the only network use is at repository-fetch time and no tag was added. Severity: MUST for the execution-time case, MUST-NOT for the fetch-time-only case. Applies: Bazel 8, 9 (flag default identical in both). Settles: M-E-06.

15. **Don't reach for `external` when `requires-network` was the tag actually needed, or vice versa.**
    Rationale: `external` overrides `--cache_test_results` caching only; `requires-network` overrides sandbox network denial only — they solve different problems and neither substitutes for the other.
    Verify: `grep -rn 'tags = \[.*"external"' --include=BUILD.bazel .` and confirm the adjoining comment names an actual caching concern (nondeterministic-but-not-network dependency), not a network one.
    Empty reads: PASS (`external` not used, or used with a caching-specific rationale). Severity: SHOULD. Applies: Bazel 8, 9. Settles: M-E-08 (taxonomy completeness).

16. **Never write test output, temp files, or intermediate state outside `$TEST_TMPDIR` (or `$TEST_UNDECLARED_OUTPUTS_DIR` if declared) — no `/tmp`, no `/home`, no path derived from the test's own executable location.**
    Rationale: those are the only two paths the test-encyclopedia guarantees are private and writable; anything else is unspecified, may not exist, or may be shared with concurrently running tests.
    Verify: reading heuristic — grep test source/harness for hardcoded `/tmp/`, `/home/`, or `os.path.dirname(sys.argv[0])`-style self-location writes not routed through `$TEST_TMPDIR`.
    Empty reads: PASS (no such writes found). Severity: MUST. Applies: Bazel 8, 9. Settles: M-E-05.

17. **Never mutate the runfiles tree during test execution, and never assume filesystem atimes are enabled.**
    Rationale: "The runfiles tree … must not change during test execution," and "Tests must not assume that atimes are enabled for any mounted filesystem" — both explicit MUST-level prohibitions in the normative spec.
    Verify: reading heuristic — grep test code for a `chmod`/`chgrp`/`touch`/write call targeting a path under `$TEST_SRCDIR` or a `*.runfiles` directory; grep for any assertion or cache-key that reads a file's atime.
    Empty reads: PASS (no runfiles writes, no atime dependence found). Severity: MUST. Applies: Bazel 8, 9. Settles: M-E-05.

18. **Don't assume `flaky = True` behaves identically to `--flaky_test_attempts=default` for a non-flaky-marked test — the "default" string means one attempt for ordinary tests, three only for rule-marked-flaky ones.**
    Rationale: a reader might assume passing `--flaky_test_attempts=default` on the command line universally grants three attempts; it only does for targets that already carry `flaky = True` — everything else still gets exactly one.
    Verify: named reading heuristic — cite the exact command-line-reference wording ("three for tests marked explicitly as flaky by their rule") whenever describing `--flaky_test_attempts=default`'s effect.
    Empty reads: N/A. Severity: CONSIDER. Applies: Bazel 8, 9. Settles: M-E-03.

## Fleet evidence

- **Size**: `rules_ocx/ocx/tests/BUILD.bazel:25,33`, `examples/project/BUILD.bazel:21,41`, `examples/package/BUILD.bazel:16`, `examples/cross_platform/BUILD.bazel:38` — 6 `sh_test` targets declare `size = "small"`. The other ~78 test targets (76 `analysistest`/`unittest` across 5 `.bzl` files, per [starlark-code-shape.md:54,163](../bazel-audit/starlark-code-shape.md), plus 2 `diff_test`s in `docs/BUILD.bazel`) declare no `size` at all and default to `medium` (100MB/300s) despite running fake-`ctx` unit tests with zero I/O and zero network. Not a defect (candidate 1 is SHOULD, not MUST) but a clean illustration of the decision's reasoning: mandating explicit `size` here would be pure busywork.
- **Flaky / sharding**: `grep -rn "flaky\|shard_count" **/*.bazel **/*.bzl` across the repo returns zero attribute uses (one prose mention of "flaky" in a comment, `e2e/bzlmod/BUILD.bazel:5`, and one in `ocx/private/repo_utils.bzl:172` — neither is the `flaky` attribute). Consistent with candidates 4–7's guidance; nothing to fix.
- **`manual`**: `ocx/tests/launcher_test.bzl:1572` and `:1581` are the repo's only two `tags = ["manual"]` uses, both on fixture-generating rules (`_bad_closure_report`, `_guard`) consumed exclusively as `target_under_test` by `closure_packages_guard_test`/`guard_test` in the same `launcher_test_suite` macro ([`launcher_test.bzl:1557-1617`](../bazel-audit/starlark-code-shape.md)). This is candidate 13's positive case: correctly excluded from `bazel build/test //...`, still visible to `bazel query //...`.
- **`requires-network`**: zero uses anywhere, and this is correct rather than an omission. The six `size = "small"` `sh_test` targets above all consume `data = [...]` from already-fetched external repos (`@ocx_tool`, `@dev_tools`, `@tools`, `@jq`, `@tools_arm64`) — the network round-trip happened during the repository rule's fetch (a separate, unsandboxed phase `requires-network` does not gate; see the sibling `repository-rule-hermeticity-and-bcr` dive for that mechanism), not during the test action itself. The one place in the repo that *would* need it — executing (not just building) the lazy-provisioned `jq` launcher in `e2e/bzlmod` — is deliberately left build-only, in the repo's own words: "Executing jq would pull from the ocx.sh registry across the whole BCR platform matrix (flaky); add an sh_test that runs the launcher if BCR CI proves reliable" (`e2e/bzlmod/BUILD.bazel:5-7`). If that `sh_test` is ever added, it is exactly the target candidate 14 would require to carry `requires-network`.
- **`.bazelrc`**: `common --enable_platform_specific_config`; `common:windows --enable_runfiles` is present specifically because `sh_test` needs runfiles on Windows ([config-inventory.md:72](../bazel-audit/config-inventory.md)) — a Windows-runfiles caveat, but for `sh_test` generally, not coverage specifically (coverage-and-runfiles-on-Windows is `testing-starlark-and-coverage`'s scope, M-E-13).
- **Coverage of this exact ledger gap**: `config-inventory.md` states plainly: "Test size, sharding, flakiness, `--runs_per_test` — zero mentions" in `AGENTS.md`/`starlark.md` ([config-inventory.md:311](../bazel-audit/config-inventory.md)) — confirming this entire topic is currently `uncovered` in the fleet's own AI config, matching the map's coverage column for every M-E-01..09 row.

## AI-agent angle

- **Reading only `be/common-definitions`' `shard_count` prose and concluding an unaware runner "runs everything per shard" silently.** Wrong as of the current implementation (finding 4) — the mechanical check is `bazel test --test_sharding_strategy=forced=2` on the target and grepping for the `LOCAL_TEST_PREREQ_UNMET` message; don't trust the attribute-table prose alone.
- **Assuming a rule's `tags = [...]` automatically reaches every `ctx.actions.run()` it registers.** True for native tests/genrules, false-by-default-flag for custom Starlark rules unless `--incompatible_allow_tags_propagation` (default true) is on, and even then an explicit `execution_requirements` entry silently wins over the propagated tag. Check: grep the `.bzl` for a hardcoded `execution_requirements` dict before assuming a target-level tag "did nothing" or "worked."
- **Recommending `--flaky_test_attempts` to "find" a flaky test.** It is built to make a test pass on the first success, the opposite of a detection tool ([#3783](https://github.com/bazelbuild/bazel/issues/3783)). The mechanical tell: does the recommendation pair the flag with `--runs_per_test_detects_flakes`? If not, it's the wrong flag for the stated goal.
- **Treating `no-remote-cache-upload` and `no-remote-cache` as the same tag with a longer name.** They differ by exactly the read/write half of caching (finding 9); the mechanical check is the grep in candidate 11 plus a one-line read of which behavior the surrounding code actually wants.
- **Adding `requires-network` to a test because *something in its dependency closure* was fetched from the internet.** The tag governs the test *action's own* sandboxed network access, not a repository rule's separate fetch phase; rules_ocx's own untagged network-adjacent tests (fleet evidence) are the correct baseline to pattern-match against, not a gap to "fix."
- **Assuming `manual` hides a target from `bazel query`, from a dependency graph, or from a hand-rolled CI-coverage script that walks `query //...`.** It doesn't, in either direction of the split (test-encyclopedia and Build Encyclopedia both say so independently) — the mechanical check is candidate 12's `diff`.
- **Citing a RAM/CPU number for `size` from memory instead of the table.** The numbers (20/100/300/800 MB, always 1 CPU) are easy to misremember as scaling CPU too; verify against [be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes-tests) directly, every time, per this program's own house rule against training-data version drift.
- **Assuming Bazel 9 changed anything about size/timeout/sharding/tags/environment invariants.** It did not — the only textual delta between the 8.7.0 and 9.1.0 test-encyclopedia snapshots is the new execution-platform/test-toolchain section (finding 14); an agent inventing a Bazel-9-specific test-contract change here is fabricating one.

## Contested / evolving

- **The `shard_count` documentation self-contradiction (finding 4) is unresolved in the docs themselves**, as of both the 8.7.0 and 9.1.0 snapshots (2026-09-05). The trend is not visibly toward a fix — the prose has stood unchanged across at least one major version boundary. Treat the test-encyclopedia and the source as authoritative over the `be/common-definitions` attribute-table sentence until a doc PR lands.
- **`--incompatible_allow_tags_propagation` is a stable-`true`-default flag that has not been fully retired** (it's still a real, toggleable flag in both 8.7.0 and 9.1.0, seven years after its introducing issue, [#8830](https://github.com/bazelbuild/bazel/issues/8830)) — unlike some `--incompatible_*` flags that get flipped and deleted within a major or two. No evidence found (in the sources this dive fetched) of a scheduled removal date; treat it as durable, checkable state rather than assume it will disappear.
- **The legacy test toolchain path** (`--@bazel_tools//tools/test:incompatible_use_default_test_toolchain=false`) is explicitly marked in the 9.1.0 test-encyclopedia as "expect this option to be unavailable in a future Bazel release" — trending toward removal, no date given as of 2026-09-05.
- **`flaky = True` vs `--runs_per_test_detects_flakes`-based detection** is a genuine practice split this dive did not find fully settled in the wider ecosystem sources it fetched (only the primary flag docs and the 2017 tracking issue) — the primary sources are unambiguous about what each *does*, but which one a given team's culture treats as acceptable everyday practice is a live judgment call this dive resolves only for what the shipped rule set recommends (Decision 2), not for the industry at large.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [bazel.build/reference/test-encyclopedia](https://bazel.build/versions/8.7.0/reference/test-encyclopedia) (8.7.0 snapshot) | Primary spec, "normative and authoritative" | Pinned 8.7.0, fetched 2026-09-05 | The full test environment contract: sharding protocol, environment invariants, tag conventions, execution platform |
| [bazel.build/reference/test-encyclopedia](https://bazel.build/versions/9.1.0/reference/test-encyclopedia) (9.1.0 snapshot) | Same, Active-LTS version | Pinned 9.1.0 | Confirms cross-major stability; isolates the one real 9.x addition (finding 14) |
| [bazel.build/reference/be/common-definitions](https://bazel.build/versions/8.7.0/reference/be/common-definitions) (8.7.0 snapshot) | Build Encyclopedia, generated from Java rule-attribute docs | Pinned 8.7.0 | The `size`/`timeout`/`flaky`/`shard_count`/`tags` attribute tables verbatim, with the RAM/CPU numbers |
| [bazel.build/reference/be/common-definitions](https://bazel.build/versions/9.1.0/reference/be/common-definitions) (9.1.0 snapshot) | Same, 9.1.0 | Pinned 9.1.0 | Byte-diffed against 8.7.0 to confirm the attribute tables are unchanged |
| [bazel.build/docs/sandboxing](https://bazel.build/docs/sandboxing) | Primary docs, sandbox mechanics | Current (fetched 2026-09-05) | What each sandbox strategy (`linux-sandbox`, `darwin-sandbox`, `processwrapper-sandbox`) actually restricts and why `requires-network`/`block-network` need real sandboxing to mean anything |
| [bazel.build/reference/command-line-reference](https://bazel.build/versions/8.7.0/reference/command-line-reference) (8.7.0) | Primary CLI reference, generated from `@Option` annotations | Pinned 8.7.0 | Exact defaults for `--flaky_test_attempts`, `--runs_per_test`, `--runs_per_test_detects_flakes`, `--test_sharding_strategy`, `--sandbox_default_allow_network`, `--incompatible_allow_tags_propagation`, `--cache_test_results`, `--test_verbose_timeout_warnings` |
| [`StandaloneTestStrategy.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/exec/StandaloneTestStrategy.java) | Bazel source, the actual sharding-failure check | HEAD, fetched 2026-09-05 | Resolves the `shard_count` doc self-contradiction against the real implementation (finding 4) |
| [`TargetUtils.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/packages/TargetUtils.java) | Bazel source, tag-to-execution-info propagation | HEAD, fetched 2026-09-05 | The exact prefix allowlist and `putIfAbsent` precedence for tag propagation onto Starlark actions (finding 8) |
| [`ExecutionRequirements.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/actions/ExecutionRequirements.java) | Bazel source, execution-requirement key constants | HEAD, fetched 2026-09-05 | Class-level doc comment pointing at `TargetUtils#getExecutionInfo` as the propagation entry point |
| [bazelbuild/bazel#3783](https://github.com/bazelbuild/bazel/issues/3783) | Project's own issue tracker, closed 2017 | Filed 2017-09-21 | The `--flaky_test_attempts` "surprising and suboptimal" semantics, confirmed working-as-intended by a Bazel maintainer in the closing discussion |
| [bazelbuild/bazel#8830](https://github.com/bazelbuild/bazel/issues/8830) | Project's own issue tracker | Filed pre-2020 | The `--incompatible_allow_tags_propagation` design/migration issue, names the exact propagated-prefix list independently of the source read |
| `rules_ocx` (fleet repo) | The one Bazel repo in the fleet | Measured 2026-09-05 | Ground truth for every fleet-evidence claim above: `ocx/tests/BUILD.bazel`, `examples/*/BUILD.bazel`, `ocx/tests/launcher_test.bzl`, `e2e/bzlmod/BUILD.bazel` |
| [`bazel-audit/starlark-code-shape.md`](../bazel-audit/starlark-code-shape.md) | This program's own wave-1 audit | 2026-09-05 | Pre-counted the 76 `analysistest`/`unittest` targets and the `manual`-tagged fixture pattern, cross-checked directly against the repo in this dive |
| [`bazel-audit/config-inventory.md`](../bazel-audit/config-inventory.md) | This program's own wave-1 audit | 2026-09-05 | Confirms the fleet's existing `AGENTS.md`/`starlark.md` have zero mentions of size/sharding/flakiness/`--runs_per_test` — the uncovered baseline this dive fills |
| [`bazel-topic-map/canonical-bazel.md`](../bazel-topic-map/canonical-bazel.md) | This program's own wave-1 scout | 2026-09-05 | Candidate-topic framing for the tag taxonomy and `manual`/query asymmetry, cross-checked against primary sources rather than re-derived from it |
| [`bazel-topic-map.md`](../bazel-topic-map.md) | This program's own map (conflicts + M-E ledger) | 2026-09-05 | The M-E-01..13 question ledger this dive settles against, and Conflict 4's uv/rules_python framing referenced in scope |

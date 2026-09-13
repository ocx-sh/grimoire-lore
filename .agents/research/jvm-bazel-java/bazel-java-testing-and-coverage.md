---
title: The minimum wiring for a JUnit 5 suite and a readable coverage report under Bazel
topic: bazel-java-testing-and-coverage
agent: bazel-java-testing-and-coverage-dive
model: sonnet
date_researched: 2026-09-12
sources_count: 15
scope: |
  Covers exactly two mechanisms — running a JUnit 5 test under `bazel test //...`
  (rule choice, deps, the hand-rolled-launcher alternative, and the
  `apple_rules_lint` coupling question) and what `bazel coverage //...` produces
  for Java plus whether/where a numeric floor can be enforced. Does not cover
  test sizing, timeouts, tags, sharding policy, `manual`, or flakiness handling
  (sibling `testing.md` in `bazel-quality`), JDK/toolchain pinning or Error Prone
  under Bazel (`bazel-java-toolchains-and-compilation`), or `maven_install` /
  Kotlin bytecode traps (`bazel-java-external-deps-and-kotlin`).
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The minimum JUnit 5 wiring, and the hand-rolled second path](#1-the-minimum-junit-5-wiring-and-the-hand-rolled-second-path)
  2. [Does `java_junit5_test` drag in `apple_rules_lint`?](#2-does-java_junit5_test-drag-in-apple_rules_lint)
  3. [What `bazel coverage //...` actually emits for Java](#3-what-bazel-coverage--actually-emits-for-java)
  4. [Where the floor can live, and what routes to `testing.md`](#4-where-the-floor-can-live-and-what-routes-to-testingmd)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Bazel's own `java_test` has no JUnit 5 support: no `test_class` alone gets you Jupiter annotations recognized — the JVM test-runner contract (`main_class`, implicit `name_deploy.jar`) is JUnit-4-shaped by default ([bazel.build/reference/be/java](https://bazel.build/reference/be/java)).
- The only maintained JUnit 5 path is `bazel-contrib/rules_jvm`'s `java_junit5_test` (or `java_test_suite(runner = "junit5")`) — no first-party `rules_java`/`@bazel_tools` equivalent exists, confirmed by 0/6 Bazel-carrying exemplars referencing `contrib_rules_jvm`, `apple_rules_lint`, or `junit.jupiter` in `MODULE.bazel`/`WORKSPACE`.
- `java_junit5_test` is a **thin wrapper around `java_test`**: it sets `main_class = "com.github.bazel_contrib.contrib_rules_jvm.junit5.JUnit5Runner"`, adds its own `runtime_deps`, and injects a `-javaagent` that blocks `System.exit` — read straight from `java/private/junit5.bzl` in the tool's own repo.
- A hand-rolled second path — `java_test(main_class = "your.own.Launcher", ...)` calling the JUnit Platform Launcher API directly — is technically viable (contrib_rules_jvm's own `ActualRunner.java` *is* that code) but is not a small shim: to behave like a real Bazel test binary it must also honor `XML_OUTPUT_FILE`, `TESTBRIDGE_TEST_ONLY` (`--test_filter`), `TEST_PREMATURE_EXIT_FILE`, and the `TEST_SHARD_*` variables ([bazel.build/reference/test-encyclopedia](https://bazel.build/reference/test-encyclopedia)) — none of which JUnit's own `LauncherFactory.execute()` provides for free.
- `java_junit5_test`'s generated target ships **zero** JUnit 5 dependencies by default; `JUNIT5_DEPS` / `JUNIT5_VINTAGE_DEPS` from `//java:defs.bzl` must be added to `deps` explicitly.
- `java_test_suite`'s `runner` attribute **defaults to `"junit4"`**, not `"junit5"` — a suite of files using `@Test`/`@BeforeEach` from `org.junit.jupiter` needs `runner = "junit5"` passed explicitly or the generated `java_test` targets run the wrong engine.
- Adopting `java_junit5_test`/`java_test_suite` does **not** require adopting `apple_rules_lint`. The README separates "Java Rules" from "Linting" as two independent sections, and states linting is "opt-in: if there's no `lint_setup` call in your repo's `WORKSPACE` then everything will continue working just fine and no additional lint tests will be generated" ([bazel-contrib/rules_jvm README](https://github.com/bazel-contrib/rules_jvm/blob/master/README.md)).
- `contrib_rules_jvm`'s own `MODULE.bazel` does carry an unconditional (non-dev) `bazel_dep(name = "apple_rules_lint", version = "0.4.0")` — a downstream `bazel_dep(name = "contrib_rules_jvm")` transitively resolves and fetches that module, but fetching is not using: no lint target, no build action, and no `apple_rules_lint` extension call is generated unless the consumer writes `linter.register()`/`lint_setup()` themselves.
- BZL-JAVA-23's CONSIDER rating is scoped to the checkstyle/PMD/SpotBugs **wrappers**, which do require `apple_rules_lint` configuration to do anything; `java_junit5_test` and `java_test_suite` are a **separate, higher-confidence decision** with no such coupling — the file's own text flags this split and this dive settles it in the wrappers' favor.
- Bazel's official Java coverage doc is one sentence: "Java should work out-of-the-box with the default configuration. The bazel toolchains contain everything necessary for remote execution, as well, including JUnit." ([bazel.build/configure/coverage](https://bazel.build/configure/coverage)) — no JaCoCo flag, no XML/CSV report shape, and no coverage-report-generator customization is documented for Java specifically.
- The actual JaCoCo wiring (`JacocoCoverageRunner`, `JACOCO_METADATA_JAR`, `JAVA_COVERAGE_FILE`) lives only in Bazel's own source (`tools/test/collect_coverage.sh`, `src/java_tools/junitrunner/.../JacocoCoverageRunner.java`), not in any prose doc — a claim about it is a source-reading claim, not a documented contract.
- `bazel coverage --combined_report=lcov //...` is the whole command; output lands at `$(bazel info output_path)/_coverage/_coverage_report.dat` in **lcov format only** — never JaCoCo XML/CSV — merged across all tested targets ([bazel.build/configure/coverage](https://bazel.build/configure/coverage)).
- `--coverage_report_generator` defaults to `@bazel_tools//tools/test:coverage_report_generator` and is a build-target label, meaning it can be swapped for a custom binary — but 0/6 Bazel-carrying exemplars (including `bazelbuild/bazel` building itself) customize it or set any other coverage flag in their `.bazelrc` ([bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference)).
- Bazel's command-line reference has **no** `--coverage_threshold`, `--fail_under`, `--minimum_coverage`, or any numeric-floor flag at all — coverage enforcement over a Bazel build has no first-party gate.
- A JaCoCo-percentage-style floor (`JAVA-TEST-10`'s Gradle/`BRANCH`-counter formulation) cannot read Bazel's coverage output directly — the artifact shapes don't match (lcov line/branch counts vs. JaCoCo's XML report), so any numeric floor over `bazel coverage` output is necessarily a CI-side script parsing the merged `.dat` file (e.g. via `lcov --summary`) or converting it, never a Bazel flag and never a per-`java_test` gate.
- A **per-target** coverage floor is not expressible in Bazel: `bazel coverage` only ever produces one combined report across everything it runs; there is no target-level pass/fail signal tied to a percentage. Enforcement is necessarily a CI step over the combined report, full stop.
- `bazelbuild/bazel#12159` ("Improved Jacoco coverage support"), a feature request for a richer per-class coverage format for JVM rule authors, was closed `not_planned` in 2024 — the gap this dive documents is a maintainer-acknowledged, deliberately-unaddressed one, not an oversight this research missed.
- Sizing, timeouts, tags, sharding policy, and `manual` semantics for any `*_test` target (JUnit 5 or not) belong entirely to the sibling `bazel-quality` `testing.md` — nothing in this file restates them.

## Findings

### 1. The minimum JUnit 5 wiring, and the hand-rolled second path

**Path A — `contrib_rules_jvm`'s `java_junit5_test` (the only maintained path).**
Minimum `BUILD.bazel`:

```starlark
load("@contrib_rules_jvm//java:defs.bzl", "java_junit5_test", "JUNIT5_DEPS")

java_junit5_test(
    name = "FooTest",
    srcs = ["FooTest.java"],
    test_class = "com.example.FooTest",
    deps = [
        ":foo",
        "@maven//:org_junit_jupiter_junit_jupiter_api",
    ] + JUNIT5_DEPS,
)
```

Setup, once per module (bzlmod): `bazel_dep(name = "contrib_rules_jvm", version = "0.31.0")` — no `lint_setup()`, no `apple_rules_lint` bazel_dep of your own, needed. The WORKSPACE-era two-call setup (`contrib_rules_jvm_deps()` then `contrib_rules_jvm_setup()`) is the same shape documented for the non-bzlmod path ([bazel-contrib/rules_jvm README](https://github.com/bazel-contrib/rules_jvm/blob/master/README.md)).

For a whole directory of test files, `java_test_suite` is the macro to reach for — but its `runner` parameter **defaults to `"junit4"`**:

```starlark
# WRONG for JUnit 5 sources — silently uses the junit4 runner
java_test_suite(
    name = "unit_tests",
    srcs = glob(["*Test.java"]),
    deps = [...],
)

# CORRECT
java_test_suite(
    name = "unit_tests",
    srcs = glob(["*Test.java"]),
    runner = "junit5",
    deps = [...] ,
)
```
(both signatures read from [`java/defs.bzl`](https://github.com/bazel-contrib/rules_jvm/blob/master/java/defs.bzl) via the README's generated parameter table — `runner` documented as `"One of junit4 or junit5."` with default `"junit4"`.)

Mechanically, `java_junit5_test` is not a distinct Bazel rule kind — it is `java_test` underneath, verified by reading the macro's body directly:

```python
# bazel-contrib/rules_jvm@master:java/private/junit5.bzl (fetched 2026-09-12)
java_test(
    name = name,
    main_class = "com.github.bazel_contrib.contrib_rules_jvm.junit5.JUnit5Runner",
    test_class = clazz,
    runtime_deps = runtime_deps + JUNIT5_RUNTIME_DEPS,   # ships the runner + system-exit agent
    jvm_flags = jvm_flags,                                # -javaagent:...system-exit-agent_deploy.jar
    data = data,
    **kwargs
)
```
The generated test does **not** carry JUnit 5 dependencies itself — `JUNIT5_DEPS` (`junit-jupiter-engine`, `junit-platform-launcher`, `junit-platform-reporting`) or `JUNIT5_VINTAGE_DEPS` (adds `junit-vintage-engine`) from `//java:defs.bzl` must be added to `deps` by hand, and `JUnit5Runner.main()` fails fast with a message naming the missing `artifact(...)` coordinate if any of the six required classes aren't on the classpath ([`JUnit5Runner.java`](https://github.com/bazel-contrib/rules_jvm/blob/master/java/src/com/github/bazel_contrib/contrib_rules_jvm/junit5/JUnit5Runner.java)).

**Path B — a hand-written `java_test` + JUnit Platform Launcher `main_class` — viable, but not small.**
Bazel's own `java_test` doc says only that the "test runner's main method is invoked instead of the main class being compiled" and lists `main_class` as the entry point ([bazel.build/reference/be/java](https://bazel.build/reference/be/java)) — nothing stops a project from writing:

```java
public class MyLauncher {
  public static void main(String[] args) {
    String testClass = System.getProperty("bazel.test_suite");
    LauncherDiscoveryRequest req = LauncherDiscoveryRequestBuilder.request()
        .selectors(DiscoverySelectors.selectClass(testClass))
        .build();
    LauncherFactory.create().execute(req);
  }
}
```
and wiring `java_test(main_class = "MyLauncher", runtime_deps = [junit-platform-launcher, junit-jupiter-engine, ...])`. This is *exactly* what `contrib_rules_jvm`'s `ActualRunner.java` does, read in full at [bazel-contrib/rules_jvm@master:java/src/.../junit5/ActualRunner.java](https://github.com/bazel-contrib/rules_jvm/blob/master/java/src/com/github/bazel_contrib/contrib_rules_jvm/junit5/ActualRunner.java) — but that class is ~150 lines, not five, because being a well-behaved Bazel test binary additionally means:

| Bazel test-runner contract piece | What `ActualRunner.java` does with it | Source |
|---|---|---|
| `XML_OUTPUT_FILE` | Wraps a `BazelJUnitOutputListener` `TestExecutionListener` around the launcher run and writes JUnit XML there; without it Bazel just wraps the raw test log as a synthetic XML, losing per-test granularity in `bazel test` output and any CI XML consumer | [test-encyclopedia](https://bazel.build/reference/test-encyclopedia); `ActualRunner.java:37-46` |
| `TESTBRIDGE_TEST_ONLY` | Read into a `PatternFilter` added to the launcher request — this is what makes `bazel test --test_filter=...` work at all | `ActualRunner.java:90-91` |
| `TEST_PREMATURE_EXIT_FILE` | Written at start, deleted on clean completion — Bazel uses its continued presence to detect a test that called `System.exit` or crashed the JVM before reporting a result | `ActualRunner.java:118,123,154-168` |
| `TEST_SHARD_INDEX` / `TEST_SHARD_STATUS_FILE` | Delegated to a `TestSharding.makeShardFilter()` post-discovery filter | `ActualRunner.java:60` |
| `System.exit` inside a test | Trapped via a `-javaagent` (`AgentSystemExitToggle`) so one test calling `exit()` can't kill the whole run | `JUnit5Runner.java:21,29` |

None of this is optional if the "second path" is meant to work with `bazel test`'s `--test_filter`, sharding, retries, or CI test-result parsing — it is the JUnit Platform Launcher API plus a from-scratch reimplementation of Bazel's test protocol. **Verdict: technically a real second path, but "hand-write a `main_class`" undersells the work; for anything beyond a one-off spike, depending on `contrib_rules_jvm` is strictly less code than reimplementing it.**

### 2. Does `java_junit5_test` drag in `apple_rules_lint`?

No, for *use*; partially, for *dependency resolution*. Two separate facts, read directly from the tool's own repo:

1. The README structures "Java Rules" (`java_binary`, `java_export`, `java_junit5_test`, `java_library`, `java_test`, `java_test_suite`) and "Linting" as independent sections. The linting section is explicit: *"linting is 'opt-in': if there's no `lint_setup` call in your repo's `WORKSPACE` then everything will continue working just fine and no additional lint tests will be generated"* ([README §Linting](https://github.com/bazel-contrib/rules_jvm/blob/master/README.md)).
2. `contrib_rules_jvm`'s **own** `MODULE.bazel` carries `bazel_dep(name = "apple_rules_lint", version = "0.4.0")` with no `dev_dependency = True` — this is how the ruleset lints *itself* (it calls `linter.register()`/`linter.configure()` on its own three well-known lint names). Under bzlmod, a consumer's `bazel_dep(name = "contrib_rules_jvm")` therefore resolves and fetches `apple_rules_lint` transitively as part of MVS — but resolving a module is not running it. No `lint_setup`/`linter.register()` call exists in a consumer's own `MODULE.bazel` unless the consumer writes one, so no lint `java_test` targets are generated and no `apple_rules_lint` build action ever runs for a project that only calls `java_junit5_test`/`java_test_suite`.

This settles the question the file's own BZL-JAVA-23 left open ("a separate, unblocked decision"): the CONSIDER rating is about whether the checkstyle/PMD/SpotBugs *wrapper macros* are worth a second linting framework on top of Error Prone + Gradle-side `JAVA-LINT` — a real, project-level cost, because those wrappers only do anything once `lint_setup()` is called and configured. The JUnit 5 test rules carry none of that cost: adopting them means one transitive module fetch, zero configuration, zero generated targets beyond the tests you asked for. Corpus check: 0/6 Bazel-carrying exemplars (`bazelbuild/bazel`, `bazelbuild/rules_java`, `bazelbuild/rules_kotlin`, `bazel-contrib/rules_jvm_external`, `google/dagger`, `grpc/grpc-java`) reference `contrib_rules_jvm`, `apple_rules_lint`, or JUnit 5 anywhere in `MODULE.bazel`/`WORKSPACE` at their pinned SHAs — so this is unadopted upstream in this corpus, consistent with the ruleset itself and its lint wrappers both being a project-level opt-in nobody in the corpus has opted into.

### 3. What `bazel coverage //...` actually emits for Java

The command is `bazel coverage --combined_report=lcov //...`. Two flags govern it, both read from [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) (unversioned/current docs, matching the `bazelbuild/bazel` exemplar's own `.bazelversion` of `9.2.0` and `MODULE.bazel` version `10.0.0-prerelease` at HEAD `948b8c70e2`):

| Flag | Type / default | What it does |
|---|---|---|
| `--combined_report` | `none` or `lcov`, default `"lcov"` | "Specifies desired cumulative coverage report type. At this point only LCOV is supported." |
| `--coverage_report_generator` | build target label, default `@bazel_tools//tools/test:coverage_report_generator` | "Location of the binary that is used to generate coverage reports. This must be a binary target." |
| `--coverage_support` | build target label, default `@bazel_tools//tools/test:coverage_support` | Support files required on the inputs of every coverage-collecting test action |
| `--instrument_test_targets` | boolean | Required to get instrumentation (and therefore coverage numbers) for the test code itself, not just the code under test |
| `--instrumentation_filter` | filter spec, auto-derived from the target package(s) if unset | Scopes which targets get instrumented; `bazel coverage` prints the derived filter as an `INFO` line |

Output: a single merged file at `$(bazel info output_path)/_coverage/_coverage_report.dat`, lcov format, viewable via the external `genhtml` tool (part of the `lcov` project, not shipped by Bazel) run from the workspace root. Coverage is reported for **passing tests only** — a failed test contributes nothing to the merged report ([bazel.build/configure/coverage](https://bazel.build/configure/coverage)).

For Java specifically, the entire documented contract is one sentence: *"Java should work out-of-the-box with the default configuration. The bazel toolchains contain everything necessary for remote execution, as well, including JUnit."* No JaCoCo flag, no report-shape note, no threshold mechanism is documented for Java on this page — confirmed against the `bazelbuild/bazel` exemplar's own doc source (`git show 948b8c70e2:docs/configure/coverage.mdx`), which is byte-for-byte the same one-line Java section as the live site.

The actual JaCoCo wiring exists, but only in Bazel's source, not in any prose doc: `tools/test/collect_coverage.sh` exports `JAVA_COVERAGE_FILE` and (for the Java case) sets `JACOCO_METADATA_JAR` for `JacocoCoverageRunner` to merge into; `src/java_tools/junitrunner/java/com/google/testing/coverage/JacocoCoverageRunner.java` is the class doing the merge, built on `org.jacoco.agent.rt`/`org.jacoco.core`. **This is a source-reading claim, not a documented one** — there is no `JAVA_COVERAGE_TOOL` flag or environment variable exposed for a project to configure (no evidence of one existing at all was found by fetching the coverage doc, the command-line reference, or searching the exemplar `.bazelrc`s).

`--coverage_report_generator` is swappable in principle (it's a build-target label), but **0/6** Bazel-carrying exemplars set it or any other coverage flag — including `bazelbuild/bazel` building itself, whose `.bazelrc` has zero coverage-related lines. `bazelbuild/rules_kotlin`'s only coverage-adjacent file, `KotlinBuilderJvmCoverageTest.kt`, is a `@RunWith(JUnit4::class)` internal test of the *compiler-builder's* own instrumentation logic — not a user-facing coverage configuration or report example ([`rules_kotlin@7c51dd1210:src/test/kotlin/io/bazel/kotlin/builder/tasks/jvm/KotlinBuilderJvmCoverageTest.kt`](https://github.com/bazelbuild/rules_kotlin)). No exemplar customizes `coverage_report_generator`, matching the audit's `0/6` figure exactly.

**No numeric floor exists in Bazel at all.** The command-line reference has no `--coverage_threshold`, `--fail_under`, or `--minimum_coverage` flag (checked by full-text search of the fetched reference page). `bazel coverage` either succeeds (producing a report) or fails (a test failed) — it never fails *because* a percentage was too low. `JAVA-TEST-10`'s floor (`jvm-quality-gates.md`) is expressed against JaCoCo's `BRANCH` XML counters, an artifact shape `bazel coverage` never produces — a Gradle-side floor construct does not transfer to a Bazel-side lcov report, and nothing in the corpus attempts the conversion.

### 4. Where the floor can live, and what routes to `testing.md`

Given (3), a numeric coverage floor over Bazel-built Java code is necessarily a **CI step over the combined report** — parsing `_coverage_report.dat` (e.g. `lcov --summary combined.dat` for an aggregate line/branch percentage, or a small script reading the `LF`/`LH`/`BRF`/`BRH` lcov record fields) and failing the CI job if the number is below a threshold **checked outside Bazel's own exit code**. There is no per-target mechanism to attach a floor to, because `bazel coverage` produces exactly one merged artifact regardless of how many `java_test`/`java_junit5_test` targets ran — the finest granularity available is per-file, inside that one file, not per-target.

**What stays out of this file, one sentence:** test sizing (`small`/`medium`/`large`), `timeout`, tag-driven selection (`--test_tag_filters`), `manual` visibility semantics, sharding *policy* (as opposed to the `TEST_SHARD_*` mechanism a hand-rolled runner must honor, §1), and flakiness/retry handling for any `*_test` target — JUnit 5 or not — are all owned by the sibling `bazel-quality` `testing.md` and are not restated here.

## Normative guidance candidates

1. **BZL-JAVA-24** — For a JUnit 5 test under Bazel, use `bazel-contrib/rules_jvm`'s `java_junit5_test` (single class) or `java_test_suite(runner = "junit5", ...)` (a directory of `*Test.java` files). Do not hand-write a `java_test` + custom `main_class` launcher unless you are prepared to reimplement `XML_OUTPUT_FILE`, `TESTBRIDGE_TEST_ONLY`, `TEST_PREMATURE_EXIT_FILE`, and the `TEST_SHARD_*` contract yourself.
   - *Rationale:* the wrapper is ~150 lines of already-correct Bazel-test-protocol code (`ActualRunner.java`) sitting behind a five-line macro call; a naive hand-rolled `LauncherFactory.execute()` main class runs the tests but silently breaks `--test_filter`, sharding, premature-exit detection, and CI XML parsing — all without a build error.
   - *Verify:* `grep -rn 'load(' BUILD.bazel BUILD | grep -i junit5` should resolve only to `@contrib_rules_jvm//java:defs.bzl`; a `java_test(` block whose `deps`/`runtime_deps` include `org.junit.jupiter` or `org.junit.platform` artifacts but whose `main_class` is not `com.github.bazel_contrib.contrib_rules_jvm.junit5.JUnit5Runner` (or an equivalent that visibly implements the table in Finding 1) is the finding. Empty grep output on a repo with no JUnit 5 usage means nothing to check.
2. **BZL-JAVA-25** — Adopting `java_junit5_test`/`java_test_suite` never requires calling `lint_setup()`/`linter.register()` or adding your own `bazel_dep(name = "apple_rules_lint")`. `apple_rules_lint` is only load-bearing for `contrib_rules_jvm`'s checkstyle/PMD/SpotBugs wrapper macros, which stay a project-level CONSIDER (BZL-JAVA-23); the test rules are unconditional and configuration-free.
   - *Rationale:* the ruleset's own `MODULE.bazel` `bazel_dep`s on `apple_rules_lint` unconditionally (for its own dogfooding), so it is always transitively fetched once you depend on `contrib_rules_jvm` at all — but nothing runs or is generated from it until you write `lint_setup()`/`linter.register()` yourself. Conflating "it gets fetched" with "it must be configured" produces unrequested lint-framework scope creep on a PR that only wanted JUnit 5.
   - *Verify:* `grep -n 'lint_setup(\|linter.register(' MODULE.bazel WORKSPACE` — its presence alongside `java_junit5_test` usage is a deliberate, separate choice to review against BZL-JAVA-23's CONSIDER criteria; its **absence** is the correct, unremarkable default and needs no justification.
3. **BZL-JAVA-26** — Treat `bazel coverage --combined_report=lcov //...`'s single merged `_coverage_report.dat` as the only Java coverage artifact Bazel produces, and enforce any numeric floor as a separate CI step over that file — never as a Bazel flag, and never per-target.
   - *Rationale:* Bazel's command-line reference has no coverage-threshold flag of any kind, and `bazel coverage` only ever emits one combined lcov file regardless of target count — there is no per-`java_test` pass/fail signal to hang a floor on, and the artifact is not JaCoCo XML, so a `JAVA-TEST`-style `BRANCH`-percentage rule cannot read it without a conversion step written and owned outside Bazel.
   - *Verify:* `grep -n 'coverage_report_generator\|JAVA_COVERAGE_TOOL' .bazelrc BUILD.bazel MODULE.bazel` — expect empty (0/6 exemplars customize this, including `bazelbuild/bazel` building itself; empty is the pass, not a gap). Then confirm the CI lane that runs `bazel coverage` pipes `_coverage_report.dat` through `lcov --summary` or an equivalent parser with an explicit percentage check — its absence, on a repo that claims a coverage gate, is the finding.
4. **BZL-JAVA-27** — In a `java_test_suite` call over JUnit 5 sources, always pass `runner = "junit5"` explicitly. Never rely on the macro's default.
   - *Rationale:* `runner` defaults to `"junit4"`; a suite of `*Test.java` files written against `org.junit.jupiter` annotations left on the default silently gets JUnit4-runner `java_test` targets instead of JUnit5-runner ones — the failure mode is either "zero tests discovered, build still green" or an opaque classload error, never a clear "wrong runner" message.
   - *Verify:* reading heuristic — for every `java_test_suite(` call, check whether any file matched by its `srcs` glob imports `org.junit.jupiter.api.Test`; if so, the same call must carry `runner = "junit5"`. `grep -rln 'org.junit.jupiter' <package>` cross-referenced against the `java_test_suite(` block covering that package's `*Test.java` files is the mechanical half; the cross-reference itself is not a one-line grep.

## Exemplar evidence

| Candidate | Evidence |
|---|---|
| BZL-JAVA-24, -25, -27 | No exemplar to check against for *violation* — 0/6 Bazel-carrying exemplars (`bazelbuild/bazel@948b8c70e2`, `bazelbuild/rules_java@4206909b6d`, `bazelbuild/rules_kotlin@7c51dd1210`, `bazel-contrib/rules_jvm_external@449754dcbb`, `google/dagger@4fbc045d2b`, `grpc/grpc-java@fc4314419d`) reference `contrib_rules_jvm`, `apple_rules_lint`, `junit.jupiter`, or `junit5` anywhere in `MODULE.bazel`/`WORKSPACE` at their pinned SHAs. Every one of these rules is prospective guidance for a corpus gap this dive confirms, not a corpus-measured violation. |
| BZL-JAVA-26 | `bazelbuild/bazel@948b8c70e2:.bazelrc` — zero coverage-related lines anywhere in the file, for the one repo in this set that could plausibly need custom coverage wiring (it builds itself, including its own Java sources) and doesn't have one. `bazelbuild/rules_kotlin@7c51dd1210:src/test/kotlin/io/bazel/kotlin/builder/tasks/jvm/KotlinBuilderJvmCoverageTest.kt` is the only "coverage" hit in any of the six repos and it is a `@RunWith(JUnit4::class)` test of the Kotlin builder's own instrumentation code, not a coverage-report configuration. |
| BZL-JAVA-26 (floor) | `jvm-quality-gates.md` JAVA-TEST-10 (this program's own prior consolidation): "An unconditional coverage floor, enforced Linux-only in CI" against JaCoCo's `BRANCH` XML counters — a Gradle-shaped artifact with no Bazel-side equivalent; cited to show the floor construct this dive explicitly does *not* carry over. |
| BZL-JAVA-23 (context, not re-litigated) | `jvm-bazel-java.md:154` (this program's wave-3 consolidation) already states the CONSIDER rating and explicitly flags the test rules as "a separate, unblocked decision" — this dive is that decision. |

## AI-agent angle

- **Hallucinated first-party rule.** A model trained on general Bazel/Java material may write `load("@rules_java//java:defs.bzl", "java_junit5_test")` or assume `@bazel_tools` ships JUnit 5 support — neither exists. *Check:* `grep -rn 'java_junit5_test\|java_test_suite' BUILD.bazel BUILD | grep -v 'contrib_rules_jvm'` — any hit naming a different `load()` source is a hallucination, not a valid alternative.
- **Default-runner trap (BZL-JAVA-27).** A model asked for "a JUnit 5 test suite" reaches for `java_test_suite(srcs = glob([...]))` without attribute review and gets the JUnit4 default silently. *Check:* the reading heuristic in BZL-JAVA-27 — presence of `org.junit.jupiter` imports without a sibling `runner = "junit5"`.
- **Assumed JaCoCo XML/HTML output.** Because "Java coverage" reads as "JaCoCo" in most training data (Gradle's `jacocoTestReport` task, Maven's `jacoco:report`), a model will write a CI step expecting `**/jacocoTestReport.xml` or a JaCoCo HTML index after `bazel coverage`. The actual, only output is lcov at `$(bazel info output_path)/_coverage/_coverage_report.dat`. *Check:* grep the CI script for `.xml`/`jacoco` path references immediately after a `bazel coverage` invocation — any such reference with no intervening lcov→XML conversion step is broken.
- **Invented coverage-threshold flag.** A model may write `bazel coverage --coverage_threshold=80 //...` or similar, reasoning from other tools' CLIs (pytest-cov's `--cov-fail-under`, JaCoCo's Gradle `violationRules`). No such flag exists in Bazel's command-line reference. *Check:* the flag simply errors as unrecognized on any real Bazel invocation — a static review can grep any script for `--coverage_threshold\|--fail_under\|--minimum_coverage` immediately following `bazel coverage` and flag it as a doc-unsupported flag pending a runtime check (no `bazel` binary is available in this environment to confirm the error directly, so this is itself a doc claim to verify against a real Bazel install before shipping the script).
- **Reflexive lint-framework scope creep (BZL-JAVA-25).** A model adding `contrib_rules_jvm` for JUnit 5 support may also add `lint_setup()`/`linter.register()` calls or a `checkstyle_test`/`pmd_test` per package "since the ruleset supports it," expanding a test-only change into a linting-policy change nobody asked for. *Check:* diff review — a PR whose stated goal is "add JUnit 5 tests" that also touches `MODULE.bazel`'s `linter.register(...)` block or adds new `*_config`/`*_test` lint targets is doing two unrelated things in one change.

## Contested / evolving

- **Richer Java/JVM coverage support is a closed door, not an open question.** [`bazelbuild/bazel#12159`](https://github.com/bazelbuild/bazel/issues/12159), a feature request for an improved, rule-author-facing coverage format for JVM languages, was closed `not_planned` (closed 2024-06-29, still `not_planned` as of the 2026-09-06 metadata refresh checked for this dive). The direction is stable: Bazel core will not add a richer Java coverage contract; any improvement lives in a ruleset (like `contrib_rules_jvm`, which currently offers none) or in downstream CI tooling over lcov, and that is not expected to change.
- **`contrib_rules_jvm` itself is pre-1.0 (`0.31.0` at time of reading, no tagged GitHub Releases found — versioned only through its `MODULE.bazel`/BCR entry).** Its `java_junit5_test`/`java_test_suite` API surface is comparatively young next to `rules_java`'s `java_test`, and 0/6 exemplars in this corpus have exercised it — this dive's guidance rests on reading the tool's own source and README, not on corpus-measured stability.
- **lcov as "the" coverage format is itself narrower than the ecosystem's default expectation.** Every other JVM-adjacent gate this program has documented (JaCoCo for Gradle, Kover for Kotlin, Maven's JaCoCo plugin) centers on JaCoCo XML; Bazel's insistence on lcov-only output (`--combined_report` "At this point only LCOV is supported") is a genuine format mismatch with the rest of the ecosystem this program covers, not a stylistic difference — a JVM shop running both Gradle and Bazel needs two different coverage-report toolchains, with no first-party bridge between them as of 2026-09-12.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/reference/be/java](https://bazel.build/reference/be/java) | Official Bazel Build Encyclopedia, `java_test`/`java_binary` | Current/unversioned docs, read 2026-09-12 against Bazel 9.2.0-era corpus | Primary source for `java_test`'s attributes and implicit outputs (`name_deploy.jar` "only built if explicitly requested") |
| [bazel.build/configure/coverage](https://bazel.build/configure/coverage) | Official Bazel docs, "Code coverage with Bazel" | Current/unversioned, read 2026-09-12 | Primary source for `bazel coverage --combined_report=lcov`, the merged `.dat` output path, and the one-line Java section |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Official Bazel flag reference | Current/unversioned, read 2026-09-12 | Primary source for `--combined_report`, `--coverage_report_generator`, `--coverage_support`, `--instrument_test_targets`, `--instrumentation_filter` exact text and defaults; confirms no threshold flag exists |
| [bazel.build/reference/test-encyclopedia](https://bazel.build/reference/test-encyclopedia) | Official Bazel Test Encyclopedia | Current/unversioned, read 2026-09-12 | Primary source for `XML_OUTPUT_FILE`, `TESTBRIDGE_TEST_ONLY`, `TEST_PREMATURE_EXIT_FILE`, `TEST_SHARD_*` — the contract a hand-rolled launcher must satisfy |
| [bazel-contrib/rules_jvm README](https://github.com/bazel-contrib/rules_jvm/blob/master/README.md) | The ruleset's own repository, fetched raw via `curl` | `master`, fetched 2026-09-12 | Primary source for `java_junit5_test`/`java_test_suite` attribute tables, the `runner` default, and the "linting is opt-in" statement |
| [bazel-contrib/rules_jvm java/defs.bzl](https://github.com/bazel-contrib/rules_jvm/blob/master/java/defs.bzl) | Public API re-export file | `master`, fetched 2026-09-12 | Confirms `JUNIT5_DEPS`/`JUNIT5_RUNTIME_DEPS`/`JUNIT5_VINTAGE_DEPS` are the public symbols |
| [bazel-contrib/rules_jvm java/private/junit5.bzl](https://github.com/bazel-contrib/rules_jvm/blob/master/java/private/junit5.bzl) | The `java_junit5_test` macro's actual implementation | `master`, fetched 2026-09-12 | Shows `java_junit5_test` is `java_test` plus a fixed `main_class`, `runtime_deps`, and a `-javaagent` — ground truth for Finding 1 |
| [bazel-contrib/rules_jvm JUnit5Runner.java](https://github.com/bazel-contrib/rules_jvm/blob/master/java/src/com/github/bazel_contrib/contrib_rules_jvm/junit5/JUnit5Runner.java) | The runner's bootstrap `main()` | `master`, fetched 2026-09-12 | Shows the `bazel.test_suite` system property and the dependency-presence check with actionable error text |
| [bazel-contrib/rules_jvm ActualRunner.java](https://github.com/bazel-contrib/rules_jvm/blob/master/java/src/com/github/bazel_contrib/contrib_rules_jvm/junit5/ActualRunner.java) | The JUnit Platform Launcher invocation itself | `master`, fetched 2026-09-12 | The exact code a "hand-rolled second path" would need to reproduce — `XML_OUTPUT_FILE`, `TESTBRIDGE_TEST_ONLY`, `TEST_PREMATURE_EXIT_FILE`, sharding, all in one class |
| `bazel-contrib/rules_jvm@master:MODULE.bazel` | The ruleset's own bzlmod manifest, fetched raw | `master`, fetched 2026-09-12 | Shows the unconditional `bazel_dep(name = "apple_rules_lint", version = "0.4.0")` and the ruleset's own `linter.register()` dogfooding — the evidence behind Finding 2 |
| `bazelbuild/bazel@948b8c70e2` (exemplar corpus) | `.bazelrc`, `MODULE.bazel`, `docs/configure/coverage.mdx` at the pinned SHA | Pinned 2026-09-05 | Confirms 0 coverage-flag customization in the repo that builds Bazel itself, and that the doc source matches the live site verbatim |
| `bazelbuild/rules_kotlin@7c51dd1210` (exemplar corpus) | `src/test/kotlin/.../KotlinBuilderJvmCoverageTest.kt` | Pinned 2026-09-05 | The only "coverage" hit among the six Bazel-carrying exemplars; establishes it is internal-only, not a usage example |
| [bazelbuild/bazel#12159](https://github.com/bazelbuild/bazel/issues/12159) | GitHub issue, "Improved Jacoco coverage support" | Opened pre-2024, closed `not_planned` 2024-06-29 | Confirms the JVM-coverage-format gap is a deliberate maintainer decision, not an unexamined hole |
| `jvm-quality-gates.md` (this program) | Prior consolidation, `JAVA-TEST-10` | 2026-09-12 | Source of the JaCoCo-`BRANCH`-percentage floor shape this dive shows does not transfer to Bazel's lcov output |
| `jvm-bazel-java.md` (this program) | Prior wave-3 consolidation, `BZL-JAVA-23` | 2026-09-12 | The row this dive is explicitly asked to settle ("a separate, unblocked decision") |

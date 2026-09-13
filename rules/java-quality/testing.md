---
title: Tests, Parallelism and Coverage Gates
summary: The JAVA-TEST family: the JUnit floor and its one blocking removal, the two silent no-ops in junit-platform.properties, Gradle's two parallelism axes, and what separates a coverage report from a coverage gate
---

# Tests, Parallelism and Coverage Gates

Owns whether a suite runs what it claims to run and whether a coverage number
means anything: the JUnit floor, the `junit-platform.properties` keys, the two
independent Gradle parallelism axes, and the constructs that make a floor real.
It does not own the static-analysis gate (Error Prone, NullAway, Checkstyle,
SpotBugs, Spotless), which is `JAVA-LINT`, in this set's lint-gate file. Kover
and `runTest` are `KT-TEST`, in the Kotlin set's testing file. JDK floors,
toolchains, encoding and locale determinism are `JAVA-PLAT`, in this set's
platform file. Convention plugins, version catalogs, TestKit matrices and CI
legs are the `GRADLE-*` and `MVN-*` sets.

Contents: [The Dependency Declaration](#the-dependency-declaration) ·
[junit-platform.properties](#junit-platformproperties) ·
[The Gradle Test Task](#the-gradle-test-task) ·
[Report Versus Gate](#report-versus-gate) ·
[What Not to Invent](#what-not-to-invent) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## The Dependency Declaration

No test run catches any of these. The check is a read of the declared
coordinates plus, for a plugin version, one registry query. Where the
declaration is indirect, `./gradlew dependencies --configuration testRuntimeClasspath`
and `mvn dependency:tree` print the resolved major.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-TEST-01 | State the JUnit floor as **5, with 6 as the dated target**: 6.0.0 shipped 2025-09-30 requiring Java 17 and Kotlin 2.2, and 6.1.3 is current as of 2026-09-12. Never write a rule, a build file or a claim that assumes 6 is already in place. **pinned:** a greenfield module with no Vintage and no `junit-platform-runner` legacy takes **6 as its actual floor**. That is a default an adopter overrides once, in their own version catalog, never per module. | Adoption of 6 was 4 of 32 flagship JVM repositories measured 2026-09-12, and Gradle's own build pins `junit5ForTests = "5.12.2!!"` for its own tests. Assuming 6 produces build files that do not resolve and migration advice nobody can run. | `grep -rn --include='*.versions.toml' --include='*.gradle.kts' --include='pom.xml' -e 'junit-bom' -e 'junit-jupiter' -e 'junit-platform' .` then read the pinned **major**. The presence of `org.junit.jupiter` imports proves nothing about the version. Empty output in a module that has tests is the finding: the version is inherited from somewhere you have not read. | MUST |
| JAVA-TEST-02 | Before any JUnit 6 bump, grep for `junit-platform-runner`. A hit blocks the bump until the dependent tooling is moved to a native Platform launch. | It was removed in 6.0.0 **without replacement**, in JUnit's own wording. Do not conflate it with `junit-platform-jfr`, which was folded into `junit-platform-launcher` in the same release. Two removals, one destination, and a model paraphrasing "modules removed in JUnit 6" gets them backwards. | `grep -rln --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' --include='*.java' -e 'junit-platform-runner' -e 'JUnitPlatform' .` **Empty output is the pass.** Any hit is a hard blocker, not a warning. It was 0 of 32 repositories measured 2026-09-12, so a hit in an adopter's tree is genuinely unusual. | MUST |
| JAVA-TEST-12 | Query the artifact registry for the newest published version before emitting any build-plugin version, and never copy one from the vendor's documentation banner. Any row citing a behaviour carries the version that shipped it **and** the date it was verified. | Surefire's documentation page was headed "Version: 3.6.0" from 2026-08-31 while Maven Central's newest artifact was `3.6.0-M1` (2026-06-02) and the newest GA line was `3.5.6`. `3.6.0` only reached GA on Central on 2026-09-03 (verified 2026-09-12), so a build pinning it in between pinned something that did not exist. The banner text never changed across that transition, which is the whole point: it is not a version source. | `curl -s 'https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=5&wt=json'` and read the newest `v`. Substitute the group and artifact for any other plugin. An empty or failed response means the check did not run, not that the pinned version is fine. | MUST |

## junit-platform.properties

Both traps here are silent. The suite passes, the configuration does nothing,
and the build log says nothing either. `find . -name junit-platform.properties -print`
lists every file to read. Empty output means no such configuration exists, which
is a pass for rows 03 and 04 and moves row 05's question to the Gradle side.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-TEST-03 | Every key in a `junit-platform.properties` file is fully qualified with `junit.jupiter.` or `junit.platform.`. A bare suffix is not a property and silently does nothing. | The two namespaces are different and routinely confused, and blog-post snippets print the suffix form as shorthand. A grep written from that shorthand matches nothing in a real file, verified against live files 2026-09-12. | `grep -rn --include='junit-platform.properties' -e '^[a-z]' .` Every key printed must start with `junit.jupiter.` or `junit.platform.`. Any other prefix is the finding. | MUST |
| JAVA-TEST-04 | Pair `junit.jupiter.execution.parallel.enabled=true` with `junit.jupiter.execution.parallel.mode.default=concurrent` (or `mode.classes.default`, or `@Execution(CONCURRENT)`). Alone it is a no-op. | Nodes default to `same_thread` regardless of the enabled flag, so the half-configuration reads as "parallel tests are on" while nothing runs concurrently. A flagship framework ships exactly this one-line file today. | `grep -rn --include='junit-platform.properties' --include='*.gradle.kts' -e 'parallel.enabled' -e 'parallel.mode.default' -e 'parallel.mode.classes.default' .` An `enabled` hit with no `mode` hit in the same configuration is the finding. Empty output means parallel execution is off, which is a pass. | MUST |
| JAVA-TEST-05 | A test that mutates shared global state (`System.setProperty`, `System.setOut`, `System.setErr`, `TimeZone.setDefault`, `Locale.setDefault`) under parallel execution carries `@ResourceLock` or `@Isolated`. Treat an absence as a flake source, not a style nit. | These are the only declared synchronisation primitives, and the area is still being hardened upstream: four PRs merged 2025 to 2026 changed what the annotations can express ([#4151](https://github.com/junit-team/junit-framework/pull/4151), [#3889](https://github.com/junit-team/junit-framework/pull/3889), [#4242](https://github.com/junit-team/junit-framework/pull/4242), [#2614](https://github.com/junit-team/junit-framework/pull/2614), read 2026-09-12). "The annotation exists somewhere" is not sufficient, and the `worker_thread_pool` executor service is still experimental. | `grep -rn --include='*.java' -e 'System.setProperty' -e 'System.setOut' -e 'System.setErr' -e 'TimeZone.setDefault' -e 'Locale.setDefault' .` restricted to test sources, then read each hit's enclosing class for `@ResourceLock` or `@Isolated`. Empty output is the pass. A hit with neither annotation, in a module where JAVA-TEST-04 holds, is the finding. A row naming a specific capability of this area carries the version it was verified against. | MUST |

```properties
# wrong: line 1 is not a property at all, line 2 is a prefixed no-op on its own
execution.parallel.enabled = true
junit.jupiter.execution.parallel.enabled = true
```

```properties
# right: prefix on every key, and an explicit default mode
junit.jupiter.execution.parallel.enabled = true
junit.jupiter.execution.parallel.mode.default = concurrent
junit.jupiter.execution.parallel.config.strategy = dynamic
```

## The Gradle Test Task

`./gradlew check --dry-run` prints the task graph that will actually run. A
suite you declared and cannot find in that output is JAVA-TEST-06's finding,
and it is the cheapest way to see it.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-TEST-06 | Any `jvm-test-suite` suite other than `test` (`integrationTest`, `functionalTest`) is explicitly attached to `check`. Declaring a suite does not run it. | The plugin creates the suite and its task but never adds it to `check`'s dependency graph, the same trap as `jacocoTestCoverageVerification` in JAVA-TEST-08. Gradle's own documentation still flags the whole API as incubating (Gradle 9.x, read 2026-09-12), and adoption was 4 of 32 repositories on 2026-09-12. | `grep -rn -A3 --include='*.gradle.kts' -e 'JvmTestSuite' .` and require a matching `tasks.named("check") { dependsOn(...) }` or `check.dependsOn(testing.suites.named(...))`. Empty output means no extra suites exist, which is a pass. A declared suite with no wiring runs only when invoked by name, which CI does not do. | MUST |
| JAVA-TEST-07 | Set `maxParallelForks` explicitly, scaled to the box, with the ratio in a comment. Drop it to `1` only for one named expensive suite, never repository-wide. | The default is `1`, which leaves multi-core CI idle. This is Gradle's out-of-process worker axis and **not** JUnit's in-process thread parallelism from JAVA-TEST-04. A rule that conflates the two mis-prescribes: the observed range runs from `cores * 2` to `cores / 2`, and the strictest build measured sets `1` only for its smoke-test suite, with the reason inline. | `grep -rn --include='*.gradle.kts' --include='*.gradle' -e 'maxParallelForks' .` Empty output in a multi-module Gradle build is the finding, because the default is one fork. A hardcoded small integer with no adjacent comment is a weaker finding. | SHOULD |

## Report Versus Gate

The only evidence a floor exists is watching `./gradlew check` or `mvn verify`
fail on a deliberately under-covered branch. Everything below is how to read the
configuration before you have that evidence, and the order matters: run
JAVA-TEST-08's greps, then read their context for JAVA-TEST-09.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-TEST-08 | A coverage floor exists only where `jacocoTestCoverageVerification` with `violationRules` is explicitly wired into `check` or `build` (Gradle), or an `<execution>` binding JaCoCo's `check` goal exists (Maven). Applying the plugin or configuring `jacocoTestReport` is never evidence of a floor and must never be reported as one. **Kover is the exception:** its `check` task has depended on `koverVerify` by default since Kover **0.7.0**, so a Kotlin module applying Kover and defining any `verify { rule {} }` already fails `./gradlew check` ([kotlinx-kover#523](https://github.com/Kotlin/kotlinx-kover/issues/523), verified 2026-09-12). The `KT-TEST` family, in the Kotlin set's testing file, owns that inverse default. | Gradle's own documentation states that `jacocoTestCoverageVerification` "is not a task dependency of the `check` task". Of the 32 repositories measured 2026-09-12, 27 with any coverage tool stopped at the report. Maven's `check` goal binds to `verify` by default and `haltOnFailure` defaults to `true`, so the Maven half fails closed where the Gradle half fails open. | Gradle: `grep -rn --include='*.gradle.kts' --include='*.gradle' -e 'violationRules' -e 'jacocoTestCoverageVerification' .` **and** confirm a `check { dependsOn(...) }` or `finalizedBy(...)` wire on a printed hit. Maven: `grep -rn -A6 --include='pom.xml' -e 'jacoco-maven-plugin' .` and confirm a printed execution binds the `check` goal. Matching only `jacocoTestReport` or `koverHtmlReport` is a negative result, not a partial pass. Empty output on a module that claims a floor is the finding. | MUST |
| JAVA-TEST-09 | Read the five lines around every coverage-verification block for an enclosing conditional (`enabled =`, `if (...) disable()`, a `properties[...]` or `-P` gate) before calling the floor real. | Of the three repositories counted as enforcing a floor, two gate their gate: one switches verification off whenever predictive test selection is on, the other disables Kover unless a `-P` flag is passed. A bare `./gradlew check` verifies nothing in either, and a presence-only grep for `violationRules` reports both as unconditionally enforced. | Read, do not grep. `grep -rn -B5 -A5 --include='*.gradle.kts' -e 'violationRules' -e 'koverVerify' -e 'jacocoTestCoverageVerification' .` prints the window. A conditional anywhere in that window is the finding. Empty output is a pass only where JAVA-TEST-08 already matched, otherwise it means there is no floor to read. | MUST |
| JAVA-TEST-10 | For a library authored under this rule set, the coverage floor is a hard number with **no conditional gate**, enforced in CI, Linux-only where platform branches make full coverage unreachable elsewhere. The number lives in the build configuration, never in a CI flag. **pinned:** **90 % line and branch**. That is a default an adopter overrides once, in their own build configuration. For an existing codebase being retrofitted, a floor is CONSIDER. | A number reachable by editing a workflow file is not a floor, it is a suggestion with a YAML file in front of it. The one unconditional gate among the 32 repositories measured 2026-09-12 is a Maven project running `CLASS` at 100 % and `INSTRUCTION`, `METHOD`, `BRANCH`, `COMPLEXITY` and `LINE` at 80 %, bound to the default `check` execution. Prescribing a hard floor to every adopter would flag 29 of 32, including the strictest. For a Gradle **plugin**, the gate of record is a TestKit cross-version matrix (`GRADLE-PLUG-12`), not a percentage: its failure mode is "breaks on the next Gradle minor", which no percentage measures. | JAVA-TEST-08 passes **and** JAVA-TEST-09 finds no conditional, **and** `grep -rn --include='*.yml' --include='*.yaml' -e 'jacoco' -e 'kover' -e 'coverage' .` prints no threshold number. A threshold that exists only in a workflow file is the finding. | MUST (authored library) · CONSIDER (retrofit) |

```kotlin
// wrong: a floor that is in the file and never runs: check does not depend on it,
// and the conditional switches it off on exactly the runs that matter
tasks.jacocoTestCoverageVerification { enabled = !predictiveTestSelection.enabled }
```

```kotlin
// right: wired into check, no enclosing conditional
tasks.check { dependsOn(tasks.jacocoTestCoverageVerification) }
```

## What Not to Invent

This family's one CONSIDER row exists to stop a specific reflex, so it carries
no gate command of its own.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-TEST-11 | Do not add test retry, a `-Duser.timezone` or `TZ` pin, or mutation testing as a MUST or a SHOULD. Each is CONSIDER. Test retry is a workaround for **infrastructure** flakiness only, never for flaky test logic. | Measured across 32 repositories on 2026-09-12: the official retry plugin 1 of 32 plus 1 hand-rolled, timezone pin **0 of 32**, mutation testing 1 of 32. The strictest gates in the set simply do not retry. The observed environment discipline runs the opposite way, one repository running its whole suite under a non-English, non-Latin locale to *find* locale bugs rather than pin them away, which is the positive practice `JAVA-PLAT-18` owns in this set's platform file. | `grep -rn --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' -e 'test-retry' -e 'testRetryPlugin' -e 'user.timezone' -e 'pitest' .` Presence is informational and never a compliance signal in either direction, so neither empty output nor a hit is a finding on its own. A newly added hit inside a diff is the prompt to ask what broke. | CONSIDER |

## What Agents Get Wrong Here

1. **Reporting a coverage floor that does not exist.** Asked whether a project
   enforces coverage, a model answers yes on a `jacoco` plugin id or a
   `jacocoTestReport` block. The second-order version is worse: it answers yes
   on a `violationRules` block wrapped in `disable()` or `enabled = false`.
   JAVA-TEST-08 then JAVA-TEST-09, in that order, and never from the plugin id.
2. **Assuming Kover behaves like JaCoCo.** The defaults are opposite. Never
   state either tool's `check` wiring from plausibility, and look for
   `onCheck = false`, `.disable()` or a property gate before calling any
   `verify { rule {} }` enforced.
3. **Writing `junit-platform.properties` from a blog-post snippet.** Two
   distinct failures out of one source, the unprefixed key and
   `parallel.enabled=true` with no `mode.default`. Both are live in real
   repositories today, and both read as configured.
4. **Declaring a `jvm-test-suite` suite and assuming `./gradlew check` runs
   it.** The incubating status plus the non-default wiring make this silent in
   both directions.
5. **Conflating two removals in one release.** `junit-platform-jfr` folded into
   `junit-platform-launcher`, `junit-platform-runner` did not. Quote the
   removed-module sentence from the primary release notes, never a search
   snippet.
6. **Citing a version from the vendor's documentation banner.** The banner runs
   ahead of what the registry serves, sometimes by a full milestone-to-GA
   cycle. Query the registry, then write the version and the date.
7. **Inventing hardening the measured practice does not have** when told to
   "harden the test gate": test retry, timezone pins, mutation testing, a
   commit-time format hook. All plausible, all near-absent, and each one
   displaces the check that would have caught the real defect.
8. **Conflating the two parallelism axes.** `maxParallelForks` is Gradle's
   out-of-process worker count and `junit.jupiter.execution.parallel.*` is
   JUnit's in-process threads. Setting one and reporting the other as done is a
   silent half-configuration.
9. **Treating a passing suite as evidence that the gate can fail.** Nothing in
   this family is confirmed until the check has been watched go red against a
   deliberately planted violation: an uncovered branch, an unprefixed property
   key, a suite absent from `check --dry-run`.

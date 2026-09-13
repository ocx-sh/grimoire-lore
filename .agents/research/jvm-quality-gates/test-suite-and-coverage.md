---
title: "The test gate, and why coverage numbers here mean nothing"
topic: test-suite-and-coverage
agent: test-suite-and-coverage-scout
model: sonnet
date_researched: 2026-09-12
sources_count: 16
scope: >
  JUnit 5→6 floor and migration, junit-platform.properties keys that govern
  parallel execution / autodetection / output capture, @ResourceLock/@Isolated
  semantics, Gradle jvm-test-suite and JaCoCo, Maven Surefire's provider
  unification, Kotlin Kover vs JaCoCo, kotlinx-coroutines-test runTest, and the
  report-vs-enforce coverage split for Java and Kotlin. Excludes lint/static
  analysis (JAVA-LINT family), API-compatibility gates (BCV/japicmp — see
  M-T rows), and mutation testing (Pitest is a one-off, footnoted only).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [JUnit 6.0.0's floor and the migration path off it](#1-junit-600s-floor-and-the-migration-path-off-it)
   2. [junit-platform.properties: the keys that matter, and what the corpus actually sets](#2-junit-platformproperties-the-keys-that-matter-and-what-the-corpus-actually-sets)
   3. [@ResourceLock / @Isolated: semantics, and a live upstream feature area](#3-resourcelock--isolated-semantics-and-a-live-upstream-feature-area)
   4. [Gradle: jvm-test-suite, maxParallelForks, test-retry](#4-gradle-jvm-test-suite-maxparallelforks-test-retry)
   5. [Maven Surefire: the unified JUnit-Platform provider, and it's a milestone](#5-maven-surefire-the-unified-junit-platform-provider-and-its-a-milestone)
   6. [JaCoCo: the exact construct that turns a report into a gate](#6-jacoco-the-exact-construct-that-turns-a-report-into-a-gate)
   7. [Kover: the same distinction, and where it silently doesn't apply](#7-kover-the-same-distinction-and-where-it-silently-doesnt-apply)
   8. [Kover vs JaCoCo for Kotlin](#8-kover-vs-jacoco-for-kotlin)
   9. [kotlinx-coroutines-test: runTest semantics](#9-kotlinx-coroutines-test-runtest-semantics)
   10. [Locale and timezone discipline in the corpus](#10-locale-and-timezone-discipline-in-the-corpus)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- JUnit 6.0.0 (2025-09-30) requires Java 17 and Kotlin 2.2 as a floor; do not assume it — 4/32 exemplars use JUnit 6, and gradle/gradle itself still pins JUnit 5.12.2.
- `junit-platform-runner` is removed **without replacement** — the JUnit 4-based runner for launching Platform tests from a JUnit 4-only tool has no substitute; a project depending on it must migrate to a native Platform launch (Console Launcher, build-tool integration, or IDE support) before touching JUnit 6.
- `junit-platform-jfr` is folded into `junit-platform-launcher`, unlike `junit-platform-runner` — do not conflate the two removals; one has a home, one does not.
- Parallel execution keys live under two different prefixes: `junit.jupiter.execution.parallel.*` (Jupiter-engine scoped) and `junit.platform.output.capture.*` / `junit.platform.discovery.*` (Platform-scoped). A rule that writes `execution.parallel.enabled` without the `junit.jupiter.` prefix is wrong and will silently no-op.
- `junit.jupiter.execution.parallel.enabled=true` alone does nothing: nodes default to `SAME_THREAD` unless `junit.jupiter.execution.parallel.mode.default=concurrent` (or `@Execution(CONCURRENT)`) is also set.
- `@ResourceLock`/`@Isolated` are declarative synchronization, not a finished 2021-era feature: junit-team/junit-framework merged four 2025–2026 PRs hardening this area (child-node exclusive resources, programmatic `ResourceLocksProvider`, Vintage-engine parallelism). Treat CI flake rate as the empirical check, not "the annotation exists."
- Gradle's `jacocoTestCoverageVerification` is **not** a dependency of `check` by Gradle's own documentation — applying the JaCoCo plugin and writing `violationRules` produces a task that nothing calls unless you explicitly wire `tasks.check { dependsOn(tasks.jacocoTestCoverageVerification) }` (or, as junit-framework does, `finalizedBy` on the report task).
- Only 2/32 exemplars enforce a JaCoCo/Gradle-or-Maven minimum that fails the local build (assertj, junit-framework); one more (kotlinx.coroutines) enforces a Kover minimum — but even that one is gated behind `-Pkover.enabled=true` and does **not** run on a bare `./gradlew check`.
- The check that separates "configured" from "enforced" is never "is the plugin applied" — it is `grep -rn 'violationRules\|jacocoTestCoverageVerification'` (Gradle) or the presence of a bound `<execution><goals><goal>check</goal>` (Maven), followed by confirming that execution is not conditionally disabled.
- Maven Surefire 3.6.0's single-provider architecture (`surefire-junit-platform` absorbing all five legacy providers) is documented on the plugin's own site as version "3.6.0," but Maven Central's actual latest published artifact is **3.6.0-M1** (2026-06-02) — a milestone, not GA. A build pinning bare `3.6.0` is pinning something that does not exist on Central as of 2026-09-12.
- JaCoCo mis-measures Kotlin: inline functions get inlined into every call site, so coverage is attributed to the caller's line, not the inline function's own body, and Kotlin's compiler-generated synthetic accessors (for `private` members accessed from a companion/nested class) show up as uncovered phantom methods. Kover is instrumentation built for Kotlin bytecode shapes and does not have this problem; it can also delegate to JaCoCo (`useJacoco()`) when XML-report compatibility with other tooling is required, accepting the same distortion when it does.
- Kover's `koverVerify` task is not obviously bound to `check` in the plugin's own docs, but kotlinx.coroutines' own convention plugin comment ("`./gradlew :p:check` — doesn't verify coverage" vs "`-Pkover.enabled=true` — verifies coverage") is direct evidence that when Kover is not explicitly disabled, its verification **does** run as part of `check` — the opposite default from JaCoCo, which never auto-wires.
- The map's severity split holds on inspection: a hard numeric coverage floor is a **pinned MUST for the OCX SDK** (carried forward from `ocx-sdk-python`'s `fail_under = 100`), and **CONSIDER** for a general adopter, because 27/32 exemplars with a coverage tool stop at the report and 3/32 that enforce anything all wrap the floor in an escape hatch (a disabled-execution flag, a disable-under-predictive-selection flag, or an opt-in property) rather than shipping it unconditionally.
- Test retry does **not** belong as a rule-set MUST or SHOULD: 1/32 wires the official `org.gradle.test-retry` plugin, 1/32 hand-rolls an equivalent, and 30/32 have nothing — the strictest exemplars in the corpus (junit-framework, assertj, NullAway) simply do not retry. It earns, at most, a CONSIDER row naming the plugin and the anti-pattern it exists to paper over (genuinely flaky tests, not infrastructure flakiness).
- 0/32 exemplars pin a test timezone (`-Duser.timezone` / `TZ` env var anywhere), while google/guava deliberately runs its Maven suite under `-Duser.language=hi -Duser.country=IN` to catch locale bugs — the opposite kind of environment discipline. A TZ pin is a CONSIDER, not a MUST: the corpus practises the opposite instinct (vary locale to find bugs) more than it practises pinning anything, and no exemplar's failure mode traces to timezone drift.
- `kotlinx-coroutines-test`'s `runTest` auto-skips `delay()`, defaults to a 60-second real-time timeout (overridable via `runTest(timeout = ...)`), and rethrows any uncaught child-coroutine exception at the end of the test — none of this is `runBlocking` behavior, and code trained on pre-2023 idioms will reach for `runBlockingTest` (deprecated) or bare `runBlocking` instead.
- `jvm-test-suite` (Gradle) is still, in Gradle's own words, "an incubating API and is subject to change in a future release," despite being the sanctioned way to declare `integrationTest`/`functionalTest` suites; adoption is 4/32 (sqldelight, detekt, gradle/actions, gradle/gradle).

## Findings

### 1. JUnit 6.0.0's floor and the migration path off it

JUnit 6.0.0 shipped 2025-09-30. Its own release notes state plainly: "Minimum required Java version is now 17" and "Minimum required Kotlin version is now 2.2" — [docs.junit.org/6.0.0/release-notes.html](https://docs.junit.org/6.0.0/release-notes.html). Three structural changes accompany the floor bump:

- **Unified versioning**: "Platform artifacts now use the same version number as Jupiter and Vintage artifacts" — before 6.0.0, `junit-platform-*` and `junit-jupiter-*`/`junit-vintage-*` carried independent version lines (e.g. Platform 1.10.x alongside Jupiter 5.10.x); from 6.0.0 on, a single version (`6.x.y`) covers all three.
- **JSpecify annotations**: "All JUnit modules now use JSpecify nullability annotations."
- **`junit-platform-jfr` folded into `junit-platform-launcher`**: the release notes say the module "has been removed. The functionality is now available directly in the junit-platform-launcher module" — a dependency change, not a feature loss.
- **`junit-platform-runner` removed without replacement**: per the project's own upgrade wiki, `"junit-platform-runner (without replacement)"` — [github.com/junit-team/junit-framework/wiki/Upgrading-to-JUnit-6.0](https://github.com/junit-team/junit-framework/wiki/Upgrading-to-JUnit-6.0). This is the JUnit-4-based `JUnitPlatform` runner class used to launch Platform tests from tools that only understand JUnit 4 runners (old IDE plugins, old build-tool integrations, Ant's `junit` task via a JUnit-4 shim). **Migration path**: there is none inside the module — a project must move off any tool that requires a JUnit-4 runner and onto native JUnit Platform support (Gradle's `useJUnitPlatform()`, Maven Surefire ≥3.0.0, the Console Launcher, or a current IDE's built-in Platform support). Do not conflate this with the JFR removal above; one module has a destination, the other does not.
- Maven Surefire/Failsafe support requires **3.0.0+** under JUnit 6 (deprecated APIs removed).

Adoption in the corpus is 4/32: `diffplug__spotless@dc2a4cb9a3:gradle/libs.versions.toml` (6.1.3), `pinterest__ktlint@4c933394a3` (6.1.3), `GradleUp__shadow@541b3be475:build.gradle.kts` (junit-bom 6.1.3), and `JetBrains__Exposed@4be9aee04c:gradle/libs.versions.toml`, which dual-declares both a `junit5` and a `junit6` catalog reference. Against that, `gradle__gradle@ea17004a31:gradle/dependency-management/test.versions.toml:23` pins `junit5ForTests = "5.12.2!!"` — the build tool that ships the configuration cache and isolated projects tests itself on JUnit 5, not 6, as of this survey.

**Rule for this program**: state a JUnit 5 floor with a JUnit 6 target dated 2025-09-30, Java-17/Kotlin-2.2 gated. Never assume 6 is in place; grep for `junit-platform-runner` before any dependency-bump PR that touches JUnit.

### 2. junit-platform.properties: the keys that matter, and what the corpus actually sets

Two separate namespaces exist and are frequently confused — [docs.junit.org, Configuration Parameters / Parallel Execution](https://docs.junit.org/en/stable/user-guide/writing-tests/parallel-execution.html) (fetched via the 6.1.3 single-file export, `docs.junit.org/6.1.3/_exports/junit-user-guide-6.1.3.html`):

| Key (exact) | Namespace | Default | Meaning |
|---|---|---|---|
| `junit.jupiter.execution.parallel.enabled` | Jupiter | `false` | Turns on parallel execution machinery at all. Alone, does nothing else. |
| `junit.jupiter.execution.parallel.mode.default` | Jupiter | `same_thread` | Default execution mode for **all** nodes (`concurrent` or `same_thread`). |
| `junit.jupiter.execution.parallel.mode.classes.default` | Jupiter | inherits `mode.default` | Default execution mode for **top-level classes** specifically; lets you run classes in parallel but methods sequentially, or vice versa. |
| `junit.jupiter.execution.parallel.config.strategy` | Jupiter | `dynamic` | `dynamic` \| `fixed` \| `custom`. |
| `junit.jupiter.execution.parallel.config.dynamic.factor` | Jupiter | `1.0` | Multiplied by available cores for the `dynamic` strategy. |
| `junit.jupiter.execution.parallel.config.fixed.parallelism` | Jupiter | none (mandatory for `fixed`) | Exact desired parallelism. |
| `junit.jupiter.execution.parallel.config.executor-service` | Jupiter | `fork_join_pool` | `fork_join_pool` \| `worker_thread_pool` (**explicitly labeled experimental** in the docs — see §3). |
| `junit.jupiter.extensions.autodetection.enabled` | Jupiter | `false` | ServiceLoader-based auto-registration of `Extension` implementations. Explicitly "an advanced feature." |
| `junit.jupiter.extensions.autodetection.include` / `.exclude` | Jupiter | none | Comma-separated pattern filters, applied include-then-exclude. |
| `junit.platform.output.capture.stdout` / `.stderr` | Platform | `false` | Opt-in capture of `System.out`/`System.err`, published as report entries to `TestExecutionListener`s. Only captures output from the thread that executed the test/container — parallel-mode output from other threads is dropped. |
| `junit.platform.output.capture.maxBuffer` | Platform | implementation default | Max buffered bytes per test/container for captured output. |
| `junit.jupiter.execution.timeout.default` | Jupiter | none | Global default `@Timeout` equivalent when no annotation is present. |
| `junit.jupiter.testinstance.lifecycle.default` | Jupiter | `per_method` | Set to `per_class` to flip the default test-instance lifecycle framework-wide. |

Note the brief's shorthand (`execution.parallel.enabled`, `output.capture.*`) omits the required prefixes — a rule or a grep that drops `junit.jupiter.` or `junit.platform.` will not match real config files and will not fire on a real property set incorrectly.

The corpus's own `junit-platform.properties` files (fetched via `git show`, not part of the sparse checkout by default):

| repo:path | Keys set |
|---|---|
| `mockito__mockito@5a676bcd9e:mockito-integration-tests/junit-jupiter-parallel-tests/src/test/resources/junit-platform.properties` | `execution.parallel.enabled=true`, `execution.parallel.config.strategy=dynamic`, `execution.parallel.mode.default=concurrent` — the corpus's most complete parallel config |
| `apache__kafka@940c100fab:test-common/test-common-util/src/main/resources/junit-platform.properties` | `extensions.autodetection.enabled=true`, a custom `params.displayname.default` |
| `assertj__assertj@485502bad2:assertj-core/src/test/resources/junit-platform.properties` | custom `displayname.generator.default` |
| `junit-team__junit-framework@35c56a8e02:jupiter-tests/src/test/resources/junit-platform.properties` | `extensions.autodetection.enabled=true`, `output.capture.stdout/stderr=true` |
| `micronaut-projects__micronaut-core@d5842045bb:http-client/src/test/resources/junit-platform.properties` | `execution.parallel.enabled=true` only (mode.default left at `same_thread` — parallel is enabled but nothing actually runs concurrently by default) |

**0/32 set `timeout.default` or `testinstance.lifecycle.default`** — both are unpractised in this corpus.

### 3. @ResourceLock / @Isolated: semantics, and a live upstream feature area

From the JUnit user guide's Parallel Execution page:

- **`@ResourceLock(value, mode)`** declares that a test class or method uses a named shared resource (`Resources.SYSTEM_PROPERTIES`, `SYSTEM_OUT`, `SYSTEM_ERR`, `LOCALE`, `TIME_ZONE`, or a user string) requiring synchronized access. `mode = READ` allows concurrency with other `READ`-only holders of the same resource; `mode = READ_WRITE` (the default) excludes every other holder. The lock is held across the annotated element's lifecycle methods too — a method-level `@ResourceLock` holds the lock through its `@BeforeEach`/`@AfterEach`.
- **`providers`** attribute registers a `ResourceLocksProvider` implementation for *dynamic* resource declaration (computed per test method at runtime), combined with any statically declared resources.
- **`target = CHILDREN`** on a class-level `@ResourceLock` propagates the same lock to every direct child test method/nested class — useful when most methods only `READ` and a minority `READ_WRITE`, since a single method needing `READ_WRITE` would otherwise force `SAME_THREAD` on the whole class.
- **`@Isolated`** marks a class to run with no other test running concurrently at all — a blunter tool than `@ResourceLock` for classes with pervasive, un-nameable shared state.

This is **not a settled, static feature area**. junit-team/junit-framework merged four PRs in 2025–2026 hardening it: [#4151](https://github.com/junit-team/junit-framework/pull/4151) "Allow declaring exclusive resources for child nodes" (the `target = CHILDREN` attribute above), [#3889](https://github.com/junit-team/junit-framework/pull/3889) "Support programmatic registration of resource locks" (the `ResourceLocksProvider` interface), [#4242](https://github.com/junit-team/junit-framework/pull/4242) "Implement Parallel Method Execution in JUnit-Vintage engine," and [#2614](https://github.com/junit-team/junit-framework/pull/2614) "Acquire global read lock in presence of other exclusive resources" (see the corpus's own `failure-language-runtime.md` audit). Treat "add `@ResourceLock` once" as an ongoing practice, not a fire-and-forget config; the empirical check is CI flake rate under parallel execution, not annotation presence.

The `worker_thread_pool` executor-service option is separately and explicitly labeled experimental by the docs: "Using `worker_thread_pool` is currently an experimental feature. You're invited to give it a try and provide feedback."

### 4. Gradle: jvm-test-suite, maxParallelForks, test-retry

`jvm-test-suite` (plugin id `jvm-test-suite`, applied automatically alongside `java`) is Gradle's sanctioned way to declare additional test suites (`integrationTest`, `functionalTest`) with independent dependencies and framework choice, per [docs.gradle.org/current/userguide/jvm_test_suite_plugin.html](https://docs.gradle.org/current/userguide/jvm_test_suite_plugin.html):

```kotlin
testing {
    suites {
        val test = named<JvmTestSuite>("test") { useJUnitJupiter() }
        register<JvmTestSuite>("integrationTest") {
            dependencies { implementation(project()) }
            targets { all { testTask.configure { shouldRunAfter(test) } } }
        }
    }
}
tasks.named("check") { dependsOn(testing.suites.named("integrationTest")) }
```

The Gradle docs themselves flag this as "an incubating API and is subject to change in a future release" — do not present it as stable. Adoption is 4/32: `cashapp__sqldelight`, `detekt__detekt`, `gradle__actions`, `gradle__gradle`.

`maxParallelForks` controls Gradle's own out-of-process test-worker parallelism (JVM forks running tests), a different axis from JUnit's in-process thread parallelism above; default is `1` — [docs.gradle.org/current/userguide/java_testing.html](https://docs.gradle.org/current/userguide/java_testing.html). Measured corpus range, in `Runtime.getRuntime().availableProcessors()` terms:

| repo:path | Expression |
|---|---|
| `square__okhttp@dfcfab3824:build-logic/.../okhttp.testing-conventions.gradle.kts:42` | `availableProcessors() * 2` (most aggressive) |
| `apollographql__apollo-kotlin@c145295b72:.../apollo-gradle-plugin/build.gradle.kts:193` | `cores / 2` |
| `detekt__detekt@45672efb8b:build-logic/src/main/kotlin/module.gradle.kts:19` | `cores / 2` |
| `uber__NullAway@519a1bb826:build.gradle:140` | `cores / 2` |
| `gradle__gradle@ea17004a31:testing/smoke-test/build.gradle.kts:186,195,205` | fixed `1` — "those tests are pretty expensive, we shouldn't execute them concurrently" |
| `apache__kafka@940c100fab:build.gradle:80` | user-overridable property, defaults to all cores |

A default of `1` leaves multi-core CI idle; the corpus's own strictest builds (gradle/gradle) deliberately drop back to `1` only for known-expensive smoke suites, not globally.

**Test retry**: `org.gradle.test-retry` is the official plugin. Measured: 1/32 (`gradle__gradle@ea17004a31:gradle/dependency-management/build.versions.toml:76`, `testRetryPlugin = "org.gradle:test-retry-gradle-plugin:1.6.5"`) uses it; 1/32 (`mockito__mockito@5a676bcd9e:buildSrc/src/main/kotlin/mockito.test-retry-conventions.gradle.kts`) hand-rolls an equivalent (a `TestListener`-driven `retryTest` task with `ignoreFailures = true` on the first pass); 30/32 have neither.

### 5. Maven Surefire: the unified JUnit-Platform provider, and it's a milestone

Surefire's own "What's New in 3.6.0" page describes a major architectural simplification: every framework now executes through one provider, `surefire-junit-platform`, with the five legacy providers (`surefire-junit3`, `surefire-junit4`, `surefire-junit47`, `surefire-testng`) removed — [maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html). JUnit 5/6 needs no config change; JUnit 4 requires ≥4.12 (routed through the Vintage engine); JUnit 3 requires a JUnit ≥4.12 dependency on the classpath; TestNG requires ≥6.14.3 (routed through a JUnit-Platform TestNG engine); `suiteXmlFiles` for TestNG is no longer supported (use groups or JUnit suite support instead).

**The page's own header says "Version: 3.6.0" and "Last Published: 2026-08-31" — but Maven Central's actual published artifact list has no `3.6.0` GA.** Querying Central directly (`search.maven.org` for `g:org.apache.maven.plugins AND a:maven-surefire-plugin`) returns `3.6.0-M1` as the newest version, timestamped 2026-06-02, with `3.5.6` (2026-05-24) the newest fully-GA line. **Any build declaring `<version>3.6.0</version>` today is declaring an artifact that does not exist on Central; the only way to get the unified-provider behavior right now is `3.6.0-M1`, a milestone.** Every rule row about the unified provider must carry the `-M1` qualifier until Central shows otherwise.

### 6. JaCoCo: the exact construct that turns a report into a gate

Applying `id("jacoco")` and even configuring `tasks.jacocoTestReport {}` produces nothing but a report. The construct that fails a build is `violationRules` inside `jacocoTestCoverageVerification`, **and Gradle's own docs state this task "is not a task dependency of the `check` task"** by default — [docs.gradle.org/current/userguide/jacoco_plugin.html](https://docs.gradle.org/current/userguide/jacoco_plugin.html):

```kotlin
// report only — never fails a build
tasks.jacocoTestReport { reports { xml.required = true } }

// a gate — but still inert unless wired into check/build
tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit { minimum = "0.80".toBigDecimal() }  // element defaults to BUNDLE
        }
    }
}
tasks.check { dependsOn(tasks.jacocoTestCoverageVerification) }   // the missing wire
```

Element types: `BUNDLE`, `CLASS`, `PACKAGE`. Counter types: `INSTRUCTION`, `LINE`, `BRANCH`, `COMPLEXITY`, `METHOD`, `CLASS`.

Maven's equivalent binds by default to the **`verify`** lifecycle phase via the `check` goal, and `haltOnFailure` (default `true`) is what makes a violation fail the Maven build — [jacoco.org/jacoco/trunk/doc/check-mojo.html](https://www.jacoco.org/jacoco/trunk/doc/check-mojo.html):

```xml
<execution>
  <id>default-check</id>
  <goals><goal>check</goal></goals>
</execution>
<configuration>
  <rules>
    <rule>
      <element>BUNDLE</element>
      <limits>
        <limit><counter>INSTRUCTION</counter><value>COVEREDRATIO</value><minimum>0.80</minimum></limit>
      </limits>
    </rule>
  </rules>
</configuration>
```

Measured in the corpus (12/32 apply JaCoCo at all):

| repo | Construct | Threshold | Wired to fail? |
|---|---|---|---|
| `assertj__assertj@485502bad2:assertj-parent/pom.xml:114-176`, bound `assertj-core/pom.xml:283` | Maven `<rules>`, `default-check` execution | `CLASS` 100%, `INSTRUCTION`/`METHOD`/`BRANCH`/`COMPLEXITY`/`LINE` 80% each, on `BUNDLE` | Yes — `haltOnFailure` defaults true, execution is unconditional |
| `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.jacoco-aggregation-conventions.gradle.kts:16-33` | `violationRules { rule { limit { minimum = "0.90" } } }`, wired via `reportTask { finalizedBy(jacocoRootCoverageVerification) }` — **not** `check.dependsOn` | `0.90` on aggregate `LINE` | Yes, except: `enabled = !buildParameters.junit.develocity.predictiveTestSelection.enabled` — disabled when predictive test selection runs |
| kafka, gradle/gradle, grpc-java, micronaut, mockito, NullAway, nowinandroid, jackson-databind (8 more) | `jacocoTestReport` only | n/a | No — no `violationRules` present at all |

**27/32 repos with any coverage tool stop at the report.**

### 7. Kover: the same distinction, and where it silently doesn't apply

Kover's `verify {}` DSL block (plugin id `org.jetbrains.kotlinx.kover`, current `0.9.8`) is the analogous gate — [kotlin.github.io/kotlinx-kover/gradle-plugin/](https://kotlin.github.io/kotlinx-kover/gradle-plugin/):

```kotlin
kover {
    reports {
        total {
            verify {
                rule { minBound(85) }   // COVERED_LINES_PERCENTAGE by default
            }
        }
    }
}
```

`minBound`/`maxBound` set restrictions on a `CoverageUnit` (`LINE` default, or `INSTRUCTION`/`BRANCH`) aggregated by `AggregationType` (`COVERED_PERCENTAGE` default) over a `GroupingEntityType` (`APPLICATION` default, or `CLASS`/`PACKAGE` for per-unit checks). The verification task is `koverVerify` (or `koverVerify<Variant>` per named variant). Kover's own docs do not state outright whether `koverVerify` is wired to `check` by default — but the corpus's own strictest Kotlin exemplar shows the wiring is real:

```kotlin
// Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/kover-conventions.gradle.kts:26-33
/*
* Is explicitly enabled on TC in a separate build step.
* Examples:
* ./gradlew :p:check -- doesn't verify coverage
* ./gradlew :p:check -Pkover.enabled=true -- verifies coverage
*/
if (properties["kover.enabled"]?.toString()?.toBoolean() != true) {
    disable()
}
// ...
verify { rule { minBound(expectedCoverage[projectName] ?: 85) } }
```

This is the map's third "fails a build" exemplar, and it is a sharper finding than the map's own framing suggests: **the `minBound(85)` gate does not run on a bare `./gradlew check`.** It is gated behind `-Pkover.enabled=true`, applied only in a separate CI step. The comment implies that when Kover is *not* disabled, `check` does trigger `koverVerify` on its own (no explicit `dependsOn` is added anywhere in this file) — the opposite default posture from JaCoCo, which the Gradle docs say is never auto-wired. **A reviewer checking "is this coverage floor real" must read past the `minBound()` call to any surrounding `disable()`/property gate — the annotation-presence check that works for `@ResourceLock` does not work for coverage thresholds.**

### 8. Kover vs JaCoCo for Kotlin

JaCoCo's bytecode-level instrumentation was built against `javac`'s output shapes. Two Kotlin-compiler behaviors distort its numbers:

- **Inline functions** (`inline fun`) are copied into every call site at compile time; the function's own body has no independent bytecode location to attribute coverage to, so JaCoCo either double-counts (once per call site) or under-counts (the inline body itself is invisible as a unit).
- **Synthetic accessors**: Kotlin generates synthetic `access$` methods for `private` members reached from companion objects or nested classes; JaCoCo sees these as ordinary uninstrumented/uncovered methods, deflating the reported percentage for code that is, in source terms, fully exercised.

Kover is instrumentation purpose-built for Kotlin's bytecode shapes and does not have this failure mode. It can also delegate report/measurement to the JaCoCo library itself via `useJacoco()` for compatibility with JaCoCo-only downstream tooling — Kover's own docs caveat that "full feature compatibility is not guaranteed" in that mode, i.e. choosing `useJacoco()` reintroduces the same inline/synthetic distortion by design. Measured adoption: JaCoCo 12/32, Kover 4/32 (apollo-kotlin, Exposed, kotlinx.coroutines, ktor).

**Rule for this program**: JaCoCo for Java modules, Kover for Kotlin modules, never JaCoCo as the sole gate on a Kotlin-heavy module without checking whether the reported number is being deflated by inline/synthetic bytecode.

### 9. kotlinx-coroutines-test: runTest semantics

From the library's own README ([raw.githubusercontent.com/Kotlin/kotlinx.coroutines/master/kotlinx-coroutines-test/README.md](https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md)):

- `runTest { ... }` is the entry point for testing `suspend` code; it is **not** equivalent to `runBlocking`.
- Calls to `delay()` inside it are **automatically skipped**, preserving relative execution order via virtual time (`TestCoroutineScheduler`) — tests that would otherwise sleep for seconds finish near-instantly.
- Execution **times out after 60 seconds of real time** by default, cancelling the test coroutine; override with `runTest(timeout = 30.seconds) { ... }` for a longer bound (needed when a test genuinely calls into a non-test dispatcher, e.g. `withContext(Dispatchers.Default) { delay(...) }`, where the delay is real and not virtual-time-skipped).
- Any **uncaught exception thrown by a child coroutine** is rethrown at the end of the test — a coroutine that fails silently in production code will fail the test, unlike bare `runBlocking` where an unhandled exception in a detached `launch` can be swallowed depending on the exception handler in scope.
- `StandardTestDispatcher` (default, requires explicit `advanceUntilIdle()`/`runCurrent()` to run queued work) vs `UnconfinedTestDispatcher` (behaves like `Dispatchers.Unconfined`, runs eagerly) is the second axis of control — choosing the wrong one either hides genuine race conditions (`Unconfined` runs everything eagerly and in-order, masking dispatch-order bugs) or requires manual scheduler pumping (`Standard`) that a test author forgets, silently leaving assertions unreached.
- `runBlockingTest` is deprecated; do not reach for it in code written after 2022.

### 10. Locale and timezone discipline in the corpus

**0/32 exemplars pin a test timezone** (`grep -rl -iE '-Duser\.timezone|"TZ"'` returns nothing across the corpus). By contrast, `google__guava@5fb424c43a:pom.xml:384` sets `argLine = "-Xmx1536M -Duser.language=hi -Duser.country=IN …"` — deliberately running its Surefire suite under a non-English, non-US locale specifically to catch locale-formatting bugs, the opposite discipline from "pin everything to a known-good value." `-Duser.language` appears in 2/32 (guava, gradle/gradle); UTF-8/encoding pins (`-Dfile.encoding`, `sourceEncoding`) are common (13–15/32); a TZ pin is absent everywhere measured.

## Normative guidance candidates

1. **State the JUnit floor explicitly as "5, target 6 (2025-09-30, Java 17 / Kotlin 2.2)" — never assume 6 is in place.**
   Rationale: 4/32 exemplars are on 6; the build tool that most of the fleet's future tooling models itself on (gradle/gradle) is still on 5.12.2.
   Verify: `grep -rn 'junit-jupiter\|junit-bom\|junit-platform' **/libs.versions.toml **/*.gradle.kts **/pom.xml` and read the pinned major version; do not assume from the presence of `org.junit.jupiter` imports alone.

2. **Before any JUnit-6 bump, grep for `junit-platform-runner`; if found, block the bump until it is replaced.**
   Rationale: removed without replacement in 6.0.0; there is no drop-in substitute inside the module.
   Verify: `grep -rln 'junit-platform-runner\|JUnitPlatform' **/*.gradle.kts **/pom.xml **/*.java`; a hit is a hard blocker, not a warning.

3. **Use fully-qualified `junit.jupiter.*` / `junit.platform.*` keys in every `junit-platform.properties`; never the bare suffix.**
   Rationale: the shorthand does not exist as a real property and silently no-ops.
   Verify: `grep -n '^[a-z]' junit-platform.properties` — every key must start with `junit.jupiter.` or `junit.platform.`.

4. **Setting `execution.parallel.enabled=true` alone is a no-op; require `execution.parallel.mode.default=concurrent` (or `@Execution(CONCURRENT)`) alongside it, or flag the config as incomplete.**
   Rationale: default execution mode is `same_thread` regardless of the enabled flag (`micronaut-core`'s own config demonstrates the trap — enabled with no mode set).
   Verify: any `junit-platform.properties` or Gradle `systemProperty(...)` setting `execution.parallel.enabled=true` must be paired with a `mode.default` or `mode.classes.default` setting in the same file/config; flag standalone `enabled=true` as reading heuristic.

5. **A test class or method mutating shared static/global state (`System.setProperty`, `TimeZone.setDefault`, `Locale.setDefault`) under parallel execution MUST carry `@ResourceLock`/`@Isolated`; treat absence as a P0 flake source, not a style nit.**
   Rationale: `@ResourceLock`/`@Isolated` are the only declared synchronization primitives; the feature area is still being hardened upstream (4 merged 2025–2026 PRs), so "the annotation exists somewhere" is not sufficient — check that every shared-mutable-state touchpoint under parallel mode is covered.
   Verify: grep for `System.setProperty|System.setOut|System.setErr|TimeZone.setDefault|Locale.setDefault` inside `src/test`, cross-reference each hit's enclosing class/method for a `@ResourceLock`/`@Isolated` annotation; CI flake rate on reruns is the empirical backstop.

6. **A `jvm-test-suite`-declared suite (`integrationTest`, `functionalTest`) must be explicitly wired into `check` (`tasks.check.dependsOn(...)` or `tasks.named("check") { dependsOn(...) }`); do not assume declaring a suite runs it in CI.**
   Rationale: `jvm-test-suite` creates the suite and its task but does not, by itself, attach it to `check`'s dependency graph — this mirrors the JaCoCo gotcha in rule 8.
   Verify: `grep -A3 'register<JvmTestSuite>\|named<JvmTestSuite>' **/*.gradle.kts` and confirm a corresponding `check { dependsOn(...) }` or `targets { all { testTask.configure { shouldRunAfter... } } }` reference exists; absence means the suite runs only when invoked by name.

7. **`jacocoTestCoverageVerification` (Gradle) or a Maven `<execution><goal>check</goal>` bound to a phase is the only signal that a coverage floor is enforced; `jacocoTestReport`/`koverXmlReport` plugin application alone is not.**
   Rationale: Gradle's own docs state `jacocoTestCoverageVerification` "is not a task dependency of the `check` task"; 27/32 corpus repos with a coverage tool stop at the report.
   Verify: `grep -rln 'violationRules\|jacocoTestCoverageVerification\|koverVerify\|minBound\|maxBound' **/*.gradle.kts` (Gradle) or `grep -B2 -A2 '<goal>check</goal>' **/pom.xml` (Maven) — a repo passing this grep with a *bound, unconditional* execution has an enforced floor; one that only matches `jacocoTestReport`/`koverHtmlReport` does not.

8. **When a coverage-verification task exists, read its enclosing conditional (`enabled = `, `disable()`, a gating property) before treating the floor as real.**
   Rationale: two of the corpus's three "enforcing" exemplars gate the check — junit-framework disables it under predictive test selection, kotlinx.coroutines disables it unless `-Pkover.enabled=true` is passed, meaning a bare `./gradlew check` does not run it.
   Verify: read the 5 lines around any `violationRules`/`verify {}` block for `enabled =`, `if (...) disable()`, or a `properties[...]` gate; a rule that only checks for `minBound`/`violationRules` presence will misreport these two as unconditionally enforced.

9. **For the OCX SDK (this program's own library), a hard numeric coverage floor with no conditional gate is a pinned MUST, enforced in CI, carried forward from `ocx-sdk-python`'s `fail_under = 100`. For any other adopter, a coverage floor is CONSIDER, not MUST.**
   Rationale: 3/32 exemplars enforce anything at all, and all three wrap the floor in an escape hatch; the fleet precedent (`ocx-sdk-python`) is the only unconditional case measured. Prescribing an unconditional MUST to every JVM adopter would flag 29/32 of the exemplar corpus, including its strictest members, as non-compliant.
   Verify: for the OCX SDK, the check is rule 7/8 above with **no** conditional gate found; for any other repo, coverage-tool presence alone is sufficient to satisfy CONSIDER.

10. **Choose JaCoCo for Java-only modules and Kover for any module containing Kotlin source; never rely on JaCoCo's raw percentage for a Kotlin module without checking for inline-function/synthetic-accessor distortion first.**
    Rationale: JaCoCo's instrumentation is built for `javac` bytecode shapes; `inline fun` bodies and compiler-generated `access$` methods produce numbers that do not reflect real coverage.
    Verify: reading heuristic — if a Kotlin module's JaCoCo report shows unusually low method coverage concentrated in classes with a companion object or heavy `inline` use, or a module declares both `jacoco` and Kotlin sources, flag for a Kover migration or a documented acceptance of the distortion.

11. **Do not add `org.gradle.test-retry` (or a hand-rolled equivalent) as a rule-set MUST or SHOULD; at most CONSIDER it, named explicitly as a workaround for infrastructure flakiness, never for genuinely flaky test logic.**
    Rationale: 1/32 official, 1/32 hand-rolled, 30/32 nothing; the corpus's strictest exemplars (junit-framework, assertj, NullAway) do not retry at all.
    Verify: `grep -rn 'testRetryPlugin\|org.gradle.test-retry\|TestListener.*retry'` — presence is informational, not a compliance signal either way.

12. **Do not add a mandatory `-Duser.timezone`/`TZ` pin to the rule set; if timezone-sensitive code exists, CONSIDER pinning per-module, but do not present it as corpus practice.**
    Rationale: 0/32 exemplars pin a timezone; guava's own discipline runs in the *opposite* direction (deliberately varying locale, not pinning it).
    Verify: `grep -rl -iE '\-Duser\.timezone|"TZ"'` — expect zero hits corpus-wide; a hit in an adopter's repo is neutral, not a violation of anything measured.

13. **Any rule citing Maven Surefire's unified-provider behavior must carry the `-M1` qualifier and a date; do not write bare `3.6.0` as a dependency version.**
    Rationale: the plugin's own docs site describes "Version: 3.6.0" behavior, but Maven Central's newest published artifact is `3.6.0-M1` (2026-06-02) — `3.6.0` GA does not exist as of 2026-09-12.
    Verify: `curl -s "https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=5&wt=json"` and confirm the newest `v` field before citing a version in any generated build file.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 (JUnit floor stated, not assumed) | `Kotlin/kotlinx.coroutines`, `diffplug/spotless`, `pinterest/ktlint` declare JUnit 6 explicitly | `gradle/gradle@ea17004a31:gradle/dependency-management/test.versions.toml:23` pins `5.12.2!!` while otherwise being the corpus's most aggressive early-adopter of Gradle 9 features |
| 2 (block on `junit-platform-runner`) | No exemplar references it (0/32) — a clean corpus on this specific row | n/a |
| 4 (parallel enabled + mode paired) | `mockito__mockito@5a676bcd9e:.../junit-platform.properties` sets both `enabled` and `mode.default=concurrent` | `micronaut-projects__micronaut-core@d5842045bb:http-client/src/test/resources/junit-platform.properties` sets `execution.parallel.enabled = true` **only** — a live instance of the exact no-op trap named in rule 4 |
| 5 (`@ResourceLock` on shared-state tests) | `apache__kafka@940c100fab` sets `extensions.autodetection.enabled=true` and runs a large parallel suite (measured indirectly; per-test annotation coverage not independently re-verified here) | Not independently measured per-test in this pass — flagged as a reading-heuristic row, not corpus-counted |
| 7/8 (violationRules/koverVerify presence and gating) | `assertj__assertj@485502bad2:assertj-parent/pom.xml:114-176` — unconditional `default-check` execution, the only exemplar with **no** escape hatch | `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.jacoco-aggregation-conventions.gradle.kts:20` (`enabled = !predictiveTestSelection.enabled`) and `Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/kover-conventions.gradle.kts:26-33` (`disable()` unless `-Pkover.enabled=true`) both gate their floor |
| 9 (SDK-only hard floor) | `ocx-sdk-python`'s `fail_under = 100` (fleet precedent, [cfg](../jvm-audit/config-inventory.md) Axis 3) | 29/32 exemplars either don't enforce or gate their enforcement — confirms this cannot be a general-adopter MUST |
| 10 (JaCoCo→Kover for Kotlin) | `Kotlin__kotlinx.coroutines`, `JetBrains__Exposed`, `apollographql/apollo-kotlin`, `ktorio/ktor` all use Kover on Kotlin-heavy codebases | 8 Kotlin-containing repos (dagger, grpc-java, Exposed dual-tracks, micronaut, mockito, NullAway, nowinandroid, jackson-databind) still rely on JaCoCo report-only, with no documented acceptance of the inline-function distortion |
| 11 (test-retry not a MUST) | 30/32 have nothing, including the corpus's strictest gates (assertj, junit-framework, NullAway) | `gradle__gradle@ea17004a31` (official plugin) and `mockito__mockito@5a676bcd9e` (hand-rolled) are outliers, not the norm |
| 12 (no TZ-pin MUST) | 0/32 pin a timezone | `google__guava@5fb424c43a:pom.xml:384` runs the opposite discipline (`-Duser.language=hi -Duser.country=IN`) |
| 13 (Surefire `-M1` qualifier) | Maven Central query confirms `3.6.0-M1` (2026-06-02) is the newest published artifact | The plugin's own docs page header ("Version: 3.6.0", "Last Published: 2026-08-31") reads as if 3.6.0 GA exists — a documentation/reality gap, not corpus evidence either way |

## AI-agent angle

- **Writing `junit-platform.properties` keys without the `junit.jupiter.`/`junit.platform.` prefix.** A model trained on shorthand blog posts or the brief's own compressed phrasing ("execution.parallel.enabled") will emit a key that silently does nothing. Mechanical check: grep the file for lines not starting with `junit.jupiter.` or `junit.platform.`.
- **Treating `execution.parallel.enabled=true` as sufficient on its own.** This is the single most common half-configuration in the corpus itself (micronaut-core). Mechanical check: rule 4 above — require a paired `mode.default`/`mode.classes.default`.
- **Reaching for `runBlockingTest` or bare `runBlocking` in new Kotlin coroutine tests.** `runBlockingTest` was deprecated years before this model's training cutoff for most models, but pre-2022 idioms are heavily represented in training corpora. Mechanical check: `grep -rn 'runBlockingTest\b'` in any `src/test` — flag every hit as a required migration to `runTest`.
- **Assuming JaCoCo plugin application + a coverage badge means a floor is enforced.** This is the exact confusion the map spent its whole conflict-11 write-up correcting; a model summarizing a build file for "does this project enforce coverage" will often answer yes on `jacocoTestReport` alone. Mechanical check: rule 7 — grep for `violationRules`/`jacocoTestCoverageVerification`/`koverVerify`/`minBound`, not for `jacoco`/`kover` plugin ids.
- **Citing Maven Surefire 3.6.0 as GA because the plugin's own documentation page header says "Version: 3.6.0."** This report's own first WebFetch pass made exactly this mistake before a direct Maven Central query corrected it — the documentation site's version banner describes the *documented* behavior, not necessarily a *released* artifact. Mechanical check: query Central (`search.maven.org/solrsearch`) for the actual latest `v` before citing any plugin version in generated build config, not the vendor doc site alone.
- **Assuming `junit-platform-runner`'s removal has a drop-in replacement because `junit-platform-jfr`'s removal does.** Two module removals in the same release, only one with a stated destination; a model paraphrasing "modules removed in JUnit 6" from a single search-engine snippet is likely to conflate them (this happened in an intermediate research pass for this very document — a search-result summary claimed the runner's "content is now included directly in junit-platform-launcher," which the primary wiki source contradicts outright: `"junit-platform-runner (without replacement)"`). Mechanical check: for any migration-guidance claim, quote the exact removed-module sentence from the primary release notes or wiki page, never a search snippet.
- **Writing a Gradle `jvm-test-suite` block and assuming it participates in `./gradlew check` / `./gradlew build` without adding `check.dependsOn(...)`.** The plugin's own incubating status plus its non-default wiring make this an easy, silent gap. Mechanical check: rule 6.
- **Hallucinating that Kover's `koverVerify` is (or is not) bound to `check` by default, because the plugin's own docs never state it outright.** Ground truth in this research came only from reading a real convention plugin's comment (`kover-conventions.gradle.kts`), not from the docs. Mechanical check: never assert a default wiring behavior for a Gradle plugin without either an explicit doc statement or a corpus example demonstrating the behavior; if neither exists, say "not independently confirmed" rather than guessing plausibly.

## Contested / evolving

- **`@ResourceLock`/`@Isolated` mechanics are mid-hardening upstream, as of 2026-09.** Four PRs merged in 2025–2026 changed what the annotations can express (child-node propagation, programmatic providers, Vintage-engine parallelism). A rule row naming a specific capability of this area should carry the PR/version it was verified against, the same discipline the map applies to `StructuredTaskScope`.
- **`worker_thread_pool` as the JUnit parallel executor-service** is explicitly experimental in the current docs; `fork_join_pool` remains the default and the only non-experimental option. Trending toward `worker_thread_pool` becoming the recommended choice for test/production code that itself uses `ForkJoinPool` or blocking JDK APIs, but not there yet.
- **Maven Surefire 3.6.0's GA status is unresolved as of this survey (2026-09-12).** The documentation site presents unified-provider behavior as shipped "3.6.0"; Maven Central's newest artifact is `3.6.0-M1`. This is either a documentation-ahead-of-release situation (docs written for an imminent GA) or a docs error; re-check Central before any rule ships with a bare `3.6.0` pin.
- **Kover's default wiring of `koverVerify` into `check` is not documented outright** — trending toward "yes, by default, unlike JaCoCo" based on one convention-plugin's comment, but not confirmed from Kover's own reference docs in this pass. Treat as a corroborated-but-not-primary-sourced claim until a future pass fetches Kover's DSL reference page directly.
- **Coverage-floor severity is trending upward in the ecosystem narrative (Codecov-style dashboards, "shift left on quality") but the exemplar corpus shows the opposite in practice** — 27/32 stop at the report, and even the 3 that enforce something wrap it in an escape hatch. The map's MUST-for-SDK/CONSIDER-for-adopter split is the correct read of where practice actually is, not where blog-post consensus says it should be.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.junit.org/6.0.0/release-notes.html](https://docs.junit.org/6.0.0/release-notes.html) | JUnit 6.0.0 official release notes | 2025-09-30, primary | The floor (Java 17/Kotlin 2.2), unified versioning, JSpecify, JFR-into-launcher, `junit-platform-runner` removal — all sourced here |
| [docs.junit.org/6.1.3/_exports/junit-user-guide-6.1.3.html](https://docs.junit.org/6.1.3/_exports/junit-user-guide-6.1.3.html) | Full single-file export of the current JUnit user guide | 6.1.3, current, primary | Only reliable way to fetch the Parallel Execution and Configuration Parameters sections in one request; the paginated site (`docs.junit.org/current/user-guide/`) redirects to a short overview page with no content on these sections |
| [github.com/junit-team/junit-framework/wiki/Upgrading-to-JUnit-6.0](https://github.com/junit-team/junit-framework/wiki/Upgrading-to-JUnit-6.0) | JUnit's own migration wiki page | 2025–2026, primary | The authoritative "without replacement" wording for `junit-platform-runner`, correcting a search-snippet conflation with `junit-platform-jfr` |
| [github.com/junit-team/junit-framework pull requests #4151, #3889, #4242, #2614](https://github.com/junit-team/junit-framework/pull/4151) | Merged PRs on JUnit's own repo | 2025–2026, primary | Evidence that `@ResourceLock`/`@Isolated` machinery is actively evolving, not a finished feature |
| [docs.gradle.org/current/userguide/jvm_test_suite_plugin.html](https://docs.gradle.org/current/userguide/jvm_test_suite_plugin.html) | Gradle official docs for the `jvm-test-suite` plugin | Gradle 9.x current, primary | Plugin id, DSL, the "incubating API" caveat, default conventions for the `test` suite |
| [docs.gradle.org/current/userguide/java_testing.html](https://docs.gradle.org/current/userguide/java_testing.html) | Gradle official docs, Java testing chapter | Gradle 9.x current, primary | `maxParallelForks`/`forkEvery` defaults, `useJUnitPlatform()`/`useJUnit()`, test-retry plugin mention |
| [docs.gradle.org/current/userguide/jacoco_plugin.html](https://docs.gradle.org/current/userguide/jacoco_plugin.html) | Gradle official JaCoCo plugin docs | Gradle 9.x current, primary | The exact sentence that `jacocoTestCoverageVerification` "is not a task dependency of `check`" — the load-bearing fact for rule 7 |
| [jacoco.org/jacoco/trunk/doc/check-mojo.html](https://www.jacoco.org/jacoco/trunk/doc/check-mojo.html) | JaCoCo Maven plugin `check` goal reference | JaCoCo trunk docs, primary | `haltOnFailure`, the `verify` lifecycle-phase binding, exact `<rules>` XML shape |
| [maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html) | Surefire's own "what's new" page | Docs dated 2026-08-31, primary but version-ambiguous | The unified-provider architecture description — cross-checked against Central and found to describe an unreleased-as-GA version |
| [search.maven.org Solr API for `maven-surefire-plugin`](https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=20&wt=json) | Maven Central's own artifact index | Queried 2026-09-12, primary/authoritative | Ground truth that `3.6.0-M1` (2026-06-02), not `3.6.0`, is the newest published Surefire artifact |
| [kotlin.github.io/kotlinx-kover/gradle-plugin/](https://kotlin.github.io/kotlinx-kover/gradle-plugin/) | Kotlinx Kover Gradle plugin's own README/docs | Kover 0.9.8, current, primary | Plugin id, `verify`/`minBound` DSL, `useJacoco()` interop caveat, `CoverageUnit`/`AggregationType`/`GroupingEntityType` semantics |
| [github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md](https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md) | kotlinx-coroutines-test module README, fetched raw | Current, primary | `runTest` semantics: delay-skipping, 60s timeout, exception rethrow, `StandardTestDispatcher`/`UnconfinedTestDispatcher` |
| `Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/kover-conventions.gradle.kts` | Exemplar corpus, read via `git show` | Commit `f63a04bacb`, measured 2026-09-12 | Direct evidence of the `-Pkover.enabled=true` gate and Kover's implicit `check` binding |
| `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.jacoco-aggregation-conventions.gradle.kts` | Exemplar corpus, read via `git show` | Commit `35c56a8e02`, measured 2026-09-12 | The `finalizedBy` wiring pattern and the predictive-test-selection gate |
| `assertj__assertj@485502bad2:assertj-parent/pom.xml` | Exemplar corpus, read via `git show` | Commit `485502bad2`, measured 2026-09-12 | The corpus's only unconditional coverage gate, exact `<rules>` XML |
| [jvm-audit/exemplar-quality-gates.md](../jvm-audit/exemplar-quality-gates.md) | This program's own wave-1 audit | 2026-09-05, measured | Corpus-wide counts (JUnit-version adoption, `maxParallelForks` table, coverage table, TZ/locale table) cited throughout |


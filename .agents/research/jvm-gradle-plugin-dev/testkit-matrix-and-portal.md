---
title: "TestKit matrix and Portal publishing for a Gradle plugin"
topic: gradle-plugin-dev/testkit-matrix-and-portal
agent: testkit-matrix-and-portal
model: sonnet
date_researched: 2026-09-12
sources_count: 14
scope: |
  Covers how a Gradle plugin proves cross-version compatibility with TestKit
  (GradleRunner, JvmTestSuite functional-test wiring, the compileOnly/
  withPluginClasspath incompatibility, TestKit's process/daemon model,
  working-directory control) and how it ships to the Plugin Portal
  (com.gradle.plugin-publish 2.x, auto-applied plugins, credentials,
  validation, the Compatibility Plugin, required gradlePlugin{} metadata).
  Does not cover writing the plugin's own logic (see plugin-contract-and-
  validation.md), convention-plugin structure, or non-Portal distribution
  (private repos, included builds) beyond what TestKit needs to consume them.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The TestKit cross-version pattern](#1-the-testkit-cross-version-pattern)
   2. [TestKit + JvmTestSuite wiring](#2-testkit--jvmtestsuite-wiring)
   3. [The compileOnly / withPluginClasspath incompatibility](#3-the-compileonly--withpluginclasspath-incompatibility)
   4. [TestKit's process and daemon model](#4-testkits-process-and-daemon-model)
   5. [Working-directory control](#5-working-directory-control)
   6. [Publishing to the Portal: com.gradle.plugin-publish 2.x](#6-publishing-to-the-portal-comgradleplugin-publish-2x)
   7. [The Compatibility Plugin (stable since March 2026)](#7-the-compatibility-plugin-stable-since-march-2026)
   8. [Auto-fat-jar via com.gradleup.shadow](#8-auto-fat-jar-via-comgradleupshadow)
   9. [The exact gradlePlugin{} metadata set](#9-the-exact-gradleplugin-metadata-set)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A plugin's minimum defensible TestKit matrix has **three legs**: declared floor, current stable, and `release-candidate` — plus a configuration-cache leg run separately, not folded into the version matrix ([test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html), [gradle__actions@a27deee331](https://github.com/gradle/actions)).
- `GradleRunner.withGradleVersion("<version>")` is the only documented way to test against a Gradle version other than the one running the build ([test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html)).
- **`GradleRunner.withPluginClasspath()` does not work** for a plugin that declares `compileOnly` on another plugin's API — the injected classpath omits the `compileOnly` classes, symptom is `ClassNotFoundException` at test runtime, and the documented fix is publishing to a local Maven repository and pulling from it in the functional test's `settings.gradle(.kts)` ([test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html)).
- TestKit builds run **in a separate process** through the Tooling API, with **dedicated TestKit daemons** distinct from ordinary build daemons, auto-shut-down after the test run — a functional test is not testing the current JVM's classpath ([test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html)).
- `org.gradle.testkit.dir` (system property) or `GradleRunner.withTestKitDir(File)` (API) redirect TestKit's working directory; by default those working directories are **not deleted**, so CI disk pressure is a real, if minor, operational concern ([test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html)).
- The standard way to wire TestKit into a build is a dedicated `functionalTest` `JvmTestSuite` with `gradleTestKit()` as a dependency and `gradlePlugin { testSourceSets(...) }` pointing at it — `GradleUp__shadow@541b3be475:build.gradle.kts:138` (`testKitImplementation(gradleTestKit())`) and `:166` (`register<JvmTestSuite>("functionalTest")`) is a live example, and `detekt-gradle-plugin/build.gradle.kts` runs **two** functional-test suites, one against the min-supported Gradle version, both listed in `testSourceSets(...)`.
- `com.gradle.plugin-publish` **2.0.0 requires Gradle 7.4+**; it has auto-applied `java-gradle-plugin` and `maven-publish` since **1.0.0** ([publishing_gradle_plugins.html](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html)).
- Applying the `signing` plugin makes plugin-publish auto-sign every published artifact; applying `com.gradleup.shadow` makes it auto-publish the shadow jar as the plugin's main artifact — both since 1.0.0 ([publishing_gradle_plugins.html](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html), [plugins.gradle.org/docs/publish-plugin](https://plugins.gradle.org/docs/publish-plugin)).
- Credentials are `gradle.publish.key` / `gradle.publish.secret` Gradle properties, or `GRADLE_PUBLISH_KEY` / `GRADLE_PUBLISH_SECRET` environment variables for CI — never commit the key/secret pair ([publishing_gradle_plugins.html](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html)).
- `./gradlew publishPlugins --validate-only` validates metadata and packaging **without uploading** — run it in CI on every PR; run bare `publishPlugins` only on a release job with the real credentials ([publishing_gradle_plugins.html](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html)).
- Portal review of a genuinely new plugin (new group or new plugin id) is **manual and can take days**; a version bump to an already-approved plugin id is not re-reviewed ([publishing_gradle_plugins.html](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html), [plugins.gradle.org/docs/publish-plugin](https://plugins.gradle.org/docs/publish-plugin)).
- `com.gradle.plugin-publish` **2.1.0** (dated to the **March 2026** Gradle newsletter) auto-applies the separate `gradle-plugin-compatibility-plugin`, which lets a plugin declare `compatibility { features { configurationCache = true } }` per plugin id — publishing without a compatibility declaration is **deprecated now, planned to become a hard rejection later** ([newsletter.gradle.org/2026/03](https://newsletter.gradle.org/2026/03), [gradle/gradle-plugin-compatibility-plugin](https://github.com/gradle/gradle-plugin-compatibility-plugin)).
- The minimum `gradlePlugin{}` metadata set for a Portal submission is: top-level `website` and `vcsUrl`, and per-plugin `id`, `implementationClass`, `displayName`, `description`, `tags` — plus, since 2.1.0, `compatibility { features { ... } }` ([publishing_gradle_plugins.html](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html)).
- Shading a **plugin's own** dependencies (what plugin-publish auto-wires through Shadow) is the sanctioned path — it is not the same decision as shading a **library** (never) or an **application** (shading is the naive baseline, not the recommendation); a plugin's fat jar exists because Gradle loads plugin classes into a shared, long-lived daemon classpath region where dependency version collisions with other plugins are common ([topic-map conflict 1](../jvm-topic-map.md)).
- Relocation (`relocate(...)`) inside a shaded plugin jar is a narrower, separate decision from shading itself (M-G-04): shade to bundle, relocate only the dependencies at real risk of colliding with another plugin's or Gradle's own copy of the same library — Shadow's own build does **not** relocate anything and is not itself shaded, because Gradle isolates each plugin's classpath into its own classloader by default; a plugin that reflectively loads into a shared classloader (the `error-prone` javac-plugin case) is the sharper case for mandatory relocation, not the general Gradle-plugin case.
- `validatePlugins` presence in a build is **not** a reliable signal that a repo publishes to the Portal: `java-gradle-plugin` registers the task for any convention-plugin module (10/32 exemplar files hit it; 7 of those repos have zero other Portal signal) — the routing condition for "is this a published Gradle plugin" is `com.gradle.plugin-publish` presence, not `validatePlugins` ([exemplar-publishing-ci-bazel.md:182,420](../jvm-audit/exemplar-publishing-ci-bazel.md)).
- `validatePlugins { enableStricterValidation = true }` is the stricter opt-in that also checks a plugin's *exported* types (not just its own task types) for missing `@Input`/`@OutputFile`-family annotations — turn it on for anything published, not just internal convention plugins (`detekt-gradle-plugin/build.gradle.kts:229-231`).
- The `detektFunctionalTestMinSupportedGradle` pattern — a second, parallel functional-test task/source-set that pins the declared floor Gradle version instead of "current" — is a stronger signal of real floor-testing than a `GradleRunner.withGradleVersion(...)` call buried in one test, because it forces the whole functional-test suite (dependencies included) to resolve against that floor (`detekt__detekt@45672efb8b:detekt-gradle-plugin/build.gradle.kts:150-233`).

## Findings

### 1. The TestKit cross-version pattern

Gradle's own TestKit documentation gives `GradleRunner.create().withGradleVersion(gradleVersion)…` iterated over a list of version strings as the canonical cross-version pattern, historically shown as a Spock `where:` block over `['5.0', '6.0.1']` ([test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html)). The mechanism is identical whatever the test framework: `withGradleVersion` downloads (or reuses a cached) Gradle distribution for that version and runs the build under test against it — the version string can be a fixed release (`"8.11"`), or the sentinels `"release-candidate"` / `"current"` (nightly and current-CLI aliases used by `gradle/actions` itself, not part of the `GradleRunner` API but the same shape of the same problem — see below).

`gradle/actions` — not a Gradle *plugin* but a GitHub Action that provisions Gradle — runs the equivalent matrix at the CI level rather than inside `GradleRunner`, and is the sharpest concrete exemplar of "which legs actually matter" cited by the brief:

```yaml
# gradle__actions@a27deee331:.github/workflows/integ-test-provision-gradle-versions.yml
- name: Setup Gradle with v6.9
  uses: ./setup-gradle
  with:
    gradle-version: '6.9'
- name: Setup Gradle with v7.1.1
  uses: ./setup-gradle
  with:
    gradle-version: '7.1.1'
# (JDK bumped to 17 here, required for Gradle 9+)
- name: Setup Gradle with release-candidate
  uses: ./setup-gradle
  with:
    gradle-version: release-candidate
- name: Setup Gradle with current
  uses: ./setup-gradle
  with:
    gradle-version: current
```

and separately, `ci-check-and-unit-test.yml:33` pins the *primary* CI job (not the matrix) to a single released version:

```yaml
# gradle__actions@a27deee331:.github/workflows/ci-check-and-unit-test.yml:33
uses: gradle/actions/setup-gradle@9c971963bec38e04b3d30dcc455b5382be2fdbfb # v6.3.0
with:
  gradle-version: '8.14.2'
```

Read together this is the shape a plugin's own TestKit matrix should copy: one job runs the full test suite (unit + functional + lint) pinned to one concrete, currently-supported version for fast, deterministic feedback; a second, separate matrix job exists purely to prove the *floor* and the *bleeding edge* still work, and explicitly includes `release-candidate` so a plugin does not find out about a breaking Gradle change only after the next Gradle GA ships.

`detekt` shows the same idea expressed as build-file structure rather than CI YAML — a second, parallel task (`detektFunctionalTestMinSupportedGradle`) rather than a second CI job:

```kotlin
// detekt__detekt@45672efb8b:build.gradle.kts:79-88
setOf(
    "detektMain",
    "detektTest",
    "detektFunctionalTest",
    "detektFunctionalTestMinSupportedGradle",
    "detektTestFixtures",
).forEach { taskName ->
    tasks.register(taskName) {
        dependsOn(gradle.includedBuild("detekt-gradle-plugin").task(":$taskName"))
    }
}
```

and inside the included build, the min-supported-Gradle variant is a genuinely separate compilation with its own dependency set pinned to the floor:

```kotlin
// detekt__detekt@45672efb8b:detekt-gradle-plugin/build.gradle.kts:150-233
testKitGradleMinVersionRuntimeOnly(libs.kotlin.gradle.plugin) {
    attributes {
        attribute(GradlePluginApiVersion.GRADLE_PLUGIN_API_VERSION_ATTRIBUTE, named("7.6.3"))
    }
}
// ...
register<PluginUnderTestMetadata>("gradleMinVersionPluginUnderTestMetadata") {
    pluginClasspath.setFrom(sourceSets.main.get().output, testKitGradleMinVersionRuntimeOnly)
    outputDirectory = layout.buildDirectory.dir(name)
}
```

This is stronger evidence of floor-compatibility than a single `withGradleVersion("7.6.3")` call buried in one test method, because a whole dependency resolution graph (including the Kotlin Gradle Plugin dependency it will `testKitRuntimeOnly`) is forced to resolve against the floor, not just the Gradle distribution the test harness launches.

### 2. TestKit + JvmTestSuite wiring

The standard, current (`jvm_test_suite_plugin.html`, current docs) way to give a plugin its own functional-test compilation is a second `JvmTestSuite` registered in the `testing { suites { } }` block, with `gradleTestKit()` added as a dependency and the suite handed to `gradlePlugin { testSourceSets(...) }` so `pluginUnderTestMetadata`/classpath injection knows to wire it up:

```kotlin
testing {
    suites {
        register<JvmTestSuite>("functionalTest") {
            dependencies {
                implementation(project())
                implementation(gradleTestKit())
            }
        }
    }
}
gradlePlugin {
    testSourceSets(sourceSets["functionalTest"])
}
```

`Shadow` is the live version of exactly this pattern the brief names:

```kotlin
// GradleUp__shadow@541b3be475:build.gradle.kts:138
testKitImplementation(gradleTestKit())
...
// GradleUp__shadow@541b3be475:build.gradle.kts:166
register<JvmTestSuite>("functionalTest") {
  targets.configureEach {
    testTask {
      // Required to test configuration cache in tests when using withDebug().
      jvmArgs(
        "--add-opens=java.base/java.util=ALL-UNNAMED",
        "--add-opens=java.base/java.util.concurrent.atomic=ALL-UNNAMED",
        "--add-opens=java.base/java.lang.invoke=ALL-UNNAMED",
        "--add-opens=java.base/java.net=ALL-UNNAMED",
      )
    }
  }
  ...
}
```

and separately, at line ~218:

```kotlin
gradlePlugin {
  ...
  testSourceSets(sourceSets["test"], sourceSets["functionalTest"], sourceSets["documentTest"])
}
```

Two details worth naming explicitly: Shadow uses a **custom** `testKitImplementation` configuration (not the built-in test-suite `implementation`) to control exactly which of its own compile classpath leaks into the TestKit-launched build, and it registers `--add-opens` JVM args on the functional-test target because testing configuration-cache behaviour via `GradleRunner.withDebug()` runs the test build in-process against a modern JDK's module system, which needs the opens to introspect Gradle internals during the test itself — an operational wrinkle worth naming rather than copying blindly.

`detekt` shows the multi-suite variant named in Finding 1: `testSourceSets(sourceSets["testFixtures"], sourceSets["functionalTest"], sourceSets["functionalTestMinSupportedGradle"])`, plus a manual override of the injected plugin classpath because the default is sourced from `main.runtime` and detekt wants its `testKitRuntimeOnly` configuration used instead:

```kotlin
// detekt-gradle-plugin/build.gradle.kts
pluginUnderTestMetadata {
    pluginClasspath.from(testKitRuntimeOnly)
}
```

### 3. The compileOnly / withPluginClasspath incompatibility

This is the sharpest-worded warning in the TestKit page and the brief singles it out for good reason: `GradleRunner.withPluginClasspath()`'s automatic classpath injection is documented as **incompatible** with a plugin that depends on another plugin's API via `compileOnly` — the recommended pattern for that dependency shape (`compileOnly` so the API is not bundled and the consumer's own copy of the other plugin wins at runtime) actively defeats the recommended TestKit shortcut ([test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html)). The symptom is a `ClassNotFoundException` at functional-test runtime, not a compile error, which makes it a debugging trap rather than a build-time signal: the plugin compiles cleanly, unit tests pass, and only a functional test that actually applies another plugin first fails, with a stack trace that points at the wrong layer (the *other* plugin's class, not the missing-classpath configuration). The documented fix is to publish the plugin under test to a local Maven repository (`maven-publish` + a `file://` or `mavenLocal()`-style local repo) and have the functional test project's `settings.gradle(.kts)` declare that repository in `pluginManagement { repositories { } }`, so the test build resolves the plugin the same way a real consumer would rather than through TestKit's injected classpath. A plugin whose OWN Gradle Kotlin DSL declares `compileOnly` on `org.jetbrains.kotlin.jvm.gradle-plugin` or any other plugin's artifact and still uses `withPluginClasspath()` in its functional tests has an untested code path by construction, not by oversight.

### 4. TestKit's process and daemon model

TestKit runs the build under test **in a separate process**, via the Tooling API, and explicitly states the test build "does not share the same classpath or classloaders as the test process" ([test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html)). It further uses **dedicated TestKit daemons**, distinct from a developer's or CI runner's ordinary Gradle daemons, and those daemons are automatically shut down once the test run completes. Two practical consequences: (1) a functional test cannot assert on in-process JVM state (a static field set by the plugin under test, a thread-local) because the plugin actually ran in a different JVM — only build output, task outcomes, and files on disk are legitimate assertions; (2) TestKit's process isolation means a functional-test suite is comparatively expensive (each test spins a real Gradle build, potentially downloading a distribution on first use of a given version) — this is the practical argument for keeping the cross-version matrix (Finding 1) to three or four legs rather than testing every Gradle minor a plugin claims to support.

### 5. Working-directory control

`org.gradle.testkit.dir` (a system property set on the JVM running the tests) or `GradleRunner.withTestKitDir(File testKitDir)` (set programmatically per `GradleRunner` instance) control where TestKit puts the working directories it creates for each test build ([test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html)). The documented default behaviour is that these directories are **not deleted** after the test run — a deliberate choice so a failing test's build output can be inspected — which means a CI job running the functional-test suite repeatedly without pointing `org.gradle.testkit.dir` at a location the runner cleans up (a `$RUNNER_TEMP`-style ephemeral path, or an explicit `rm -rf` step) accumulates disk usage across runs. Pinning `org.gradle.testkit.dir` to a project-relative `build/testkit` directory (cleaned by the ordinary `clean` task) is the common way to make this deterministic without losing the debug-on-failure benefit locally.

### 6. Publishing to the Portal: com.gradle.plugin-publish 2.x

`com.gradle.plugin-publish` **2.0.0 requires Gradle 7.4 or later** to build ([publishing_gradle_plugins.html](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html)); this is the *consumer* floor for the module that publishes the plugin, not the plugin's own declared minimum-supported-Gradle version (Finding 1's matrix), and the two are frequently different numbers in the same repo. Since **1.0.0** it auto-applies `java-gradle-plugin` (the Plugin Development plugin — this is what registers `validatePlugins` and `pluginUnderTestMetadata`) and `maven-publish` (the only supported publication mechanism as of 2.x; there is no non-Maven-publish path). Applying the `signing` plugin alongside it causes every published artifact (jar, sources, javadoc) to be signed automatically; applying `com.gradleup.shadow` causes the shadow jar to be published as the plugin's main artifact automatically (Finding 8). Credentials are read from `gradle.publish.key` / `gradle.publish.secret` Gradle properties (typically in `~/.gradle/gradle.properties`, fetched from the publisher's Portal profile page) or from `GRADLE_PUBLISH_KEY` / `GRADLE_PUBLISH_SECRET` environment variables — the environment-variable form is the one to use in CI so the secret pair never touches a checked-in properties file.

`./gradlew publishPlugins --validate-only` runs every check the Portal would run (metadata completeness, packaging shape, plugin id namespace rules) **without uploading anything** — this is the command to run on every pull request, before a release job runs the bare `publishPlugins` with real credentials. Review of a genuinely new submission (a new plugin id, or a first-time group id) is manual and, per Gradle's own publishing docs and the Portal's own submission guidance, can take "a few days"; publishing a new *version* of an already-approved plugin id is not re-reviewed and appears on the Portal promptly. Portal submission guidance (`plugins.gradle.org/docs/publish-plugin`) additionally requires: the plugin do more than "Hello world," documentation in English, a plugin id whose top-level namespace matches the group coordinate and reflects real authorship (`io.github.<username>` for an individual GitHub-backed submission, a reverse-DNS domain the submitter controls for an organisation), and no `SNAPSHOT` versions submitted.

### 7. The Compatibility Plugin (stable since March 2026)

`com.gradle.plugin-publish` **2.1.0**, dated by the Gradle newsletter to **March 2026** ([newsletter.gradle.org/2026/03](https://newsletter.gradle.org/2026/03)), auto-applies a separate, purpose-built plugin — [gradle/gradle-plugin-compatibility-plugin](https://github.com/gradle/gradle-plugin-compatibility-plugin) — that lets a plugin declare, per plugin id, which opt-in Gradle features it supports. Configuration Cache is the first (and, at time of writing, only) declarable feature:

```kotlin
gradlePlugin {
    plugins {
        create("myPlugin") {
            // ...
            compatibility { features { configurationCache = true } }
        }
    }
}
```

Plugins that declare `configurationCache = true` are promoted in Portal search results. Publishing **without** any compatibility declaration is deprecated now — the build emits a warning at publish time — with Gradle stating an intent to eventually reject undeclared submissions outright; there is no announced date for the hard cutover as of 2026-09-12, so treat this as "add the declaration now" rather than "add it before a deadline." This changes what the `gradlePlugin{}` metadata set requires (Finding 9): as of 2.1.0+, `compatibility { features { ... } }` per plugin id is part of the set a Portal submission needs, not an optional extra.

Both exemplars measured for this brief have already adopted it. `Shadow` imports the extension function directly and declares it on its single plugin id:

```kotlin
// GradleUp__shadow@541b3be475:build.gradle.kts:210-217
import org.gradle.plugin.compatibility.compatibility
// ...
gradlePlugin {
  plugins {
    create("com.gradleup.shadow") {
      // ...
      compatibility { features { configurationCache = true } }
    }
  }
}
```

`detekt` declares it identically on both of its published plugin ids:

```kotlin
// detekt__detekt@45672efb8b:detekt-gradle-plugin/build.gradle.kts (register blocks)
register("dev.detekt.gradle.base") {
    // ...
    compatibility { features.configurationCache = true }
}
register("dev.detekt") {
    // ...
    compatibility { features.configurationCache = true }
}
```

(Note the two equivalent DSL spellings in live use — `features { configurationCache = true }` as a nested lambda, and `features.configurationCache = true` as a direct property assignment; both compile against the same extension, and a rule's example should pick one and not treat the other as wrong.)

### 8. Auto-fat-jar via com.gradleup.shadow

When a module that applies `com.gradle.plugin-publish` also applies `com.gradleup.shadow`, plugin-publish switches its published main artifact to the shadow jar automatically — this is the documented, current behaviour, not a manual wiring step a plugin author writes (`publishing_gradle_plugins.html`; corroborated on `plugins.gradle.org/docs/publish-plugin`). This is the one place in the whole distribution-shape decision tree (topic-map conflict 1, M-G-01–M-G-07) where shading is the *sanctioned default* rather than a last resort: a Gradle plugin's classes are loaded into the build's own long-lived JVM alongside every other plugin the consumer applies, so an un-shaded plugin with an ordinary `implementation` dependency on, say, a specific ASM or Guava version is exposed to whatever version another plugin (or Gradle itself) also put on that shared classpath region. Shading collapses the plugin's own dependency graph into its jar so the plugin's behaviour does not depend on sibling-plugin resolution order.

Relocation is a narrower, separate question from shading itself (M-G-04) and the exemplar evidence argues against treating "shade a plugin" and "relocate a plugin's dependencies" as the same MUST. `Shadow`'s own build applies `com.gradle.plugin-publish` but does **not** apply `com.gradleup.shadow` to itself and contains no `relocate(...)` call — Shadow ships as an ordinary, un-shaded plugin jar. This is consistent with Gradle's plugin-classloading model: each plugin resolved through `plugins { id(...) }` gets its own isolated classloader by default (unlike a shared `buildscript { classpath }` dependency), so version collisions between two *separately-applied* plugins are less common than the shared-classpath framing above suggests, and shading exists primarily to make a plugin's *own* dependency footprint self-contained and independently versioned, not to defend against another plugin's classloader. The sharper, genuinely mandatory case for relocation remains the one M-G-04 already names: a component that is not isolated in its own classloader at all because it is loaded directly into a shared, ambient classloader — `google__error-prone@c1f99ad5d3` relocates because `error_prone_core` is loaded straight into `javac`'s own classloader, where a version collision with anything else on that classloader is a hard classpath conflict, not a resolvable one. **Decision for the depth file: shading a plugin's own dependencies is right, and is the sanctioned/auto-wired path; treat relocation as its own, narrower call — required only for a dependency at genuine risk of colliding in a *shared* (non-isolated) classloader, not as a blanket consequence of "we shaded."**

### 9. The exact gradlePlugin{} metadata set

Consolidated from `publishing_gradle_plugins.html` and cross-checked against `plugins.gradle.org/docs/publish-plugin`, the metadata a Portal submission needs, as of `com.gradle.plugin-publish` 2.1.x:

| Scope | Field | Required? | Notes |
|---|---|---|---|
| `gradlePlugin{}` top-level | `website` | Yes for Portal | Project homepage URL |
| `gradlePlugin{}` top-level | `vcsUrl` | Yes for Portal | Source repository URL |
| per-plugin `plugins { create/register("<key>") }` | `id` | Yes | Permanent once published; reverse-DNS, top-level namespace must match the submitter's group/authorship |
| per-plugin | `implementationClass` | Yes | Fully-qualified plugin entry-point class |
| per-plugin | `displayName` | Yes for Portal | Shown in search results |
| per-plugin | `description` | Yes for Portal | Shown in search results and the plugin's Portal page |
| per-plugin | `tags` | Yes for Portal | Discovery categories; `detekt`/`spotless`/`shadow` set 3+ tags each, `spring-boot` sets `website`+`vcsUrl` but omits `tags` (still accepted, but hurts discoverability) ([exemplar-publishing-ci-bazel.md:182](../jvm-audit/exemplar-publishing-ci-bazel.md)) |
| per-plugin | `compatibility { features { ... } }` | Deprecated-if-absent since 2.1.0 (March 2026) | Currently only `configurationCache`; absence is a warning today, a planned future rejection |

## Normative guidance candidates

1. **A plugin claiming support for a Gradle range MUST be tested with `GradleRunner.withGradleVersion(...)` against at least three legs: the declared floor, current stable, and `release-candidate`.**
   Rationale: a matrix that only runs against "whatever Gradle built it" cannot detect a floor regression or an upcoming-release break.
   Verify: the functional-test source set contains at least three distinct `withGradleVersion(...)` (or task/source-set-level) targets; a CI workflow step or matrix entry names `release-candidate` explicitly (`grep -rn "withGradleVersion\|release-candidate" <plugin-module>`).

2. **A separate configuration-cache leg MUST run in addition to the version matrix, not be folded into one of its legs.**
   Rationale: configuration-cache compatibility and Gradle-version compatibility are orthogonal failure modes (M-F-04) — a plugin can be version-compatible and configuration-cache-broken, or vice versa, at the same Gradle version.
   Verify: a functional test or CI step passes `--configuration-cache` explicitly, separate from the version-matrix tests (`grep -rn -- "--configuration-cache" <plugin-module>`); the plugin's own `gradlePlugin { plugins { ... compatibility { features { configurationCache = true } } } }` is present and matches whether that leg actually passes.

3. **A plugin that declares `compileOnly` on another plugin's API MUST NOT rely on `GradleRunner.withPluginClasspath()` for its functional tests; it MUST publish to a local Maven repository and consume it from the test's `settings.gradle(.kts)`.**
   Rationale: this is a documented, sharp incompatibility whose failure mode (`ClassNotFoundException`) looks like a missing dependency, not a test-harness limitation, and wastes debugging time (Finding 3).
   Verify: `grep -rn "compileOnly(" <plugin-module>/build.gradle.kts` paired with `grep -rn "withPluginClasspath" <plugin-module>/src/*Test/**` — the two MUST NOT co-occur; when both are present, confirm the functional test's `settings.gradle(.kts)` declares a local `maven { url = ... }` / `mavenLocal()`-shaped `pluginManagement.repositories` entry instead.

4. **A plugin functional test MUST NOT assert on in-process state (statics, thread-locals) of the code under test.**
   Rationale: TestKit runs the build in a separate process via the Tooling API with its own classpath and classloaders — in-process assertions silently test nothing, or test stale state from the test process itself, not the plugin (Finding 4).
   Verify: reading heuristic — a functional test file that imports/references the plugin's own implementation classes directly (rather than only asserting on `BuildResult`/task outcomes/files) is suspect; grep for an `import <plugin base package>.*` inside a `functionalTest`/`*FunctionalTest` source set.

5. **CI MUST pin `org.gradle.testkit.dir` (or call `withTestKitDir(...)`) to a project-relative, `clean`-swept location, rather than leaving TestKit's default (undeleted) working directories to accumulate.**
   Rationale: TestKit's documented default does not delete per-test working directories — unbounded on a long-lived CI runner or self-hosted agent (Finding 5).
   Verify: `grep -rn "testkit.dir\|withTestKitDir" <plugin-module>`; absence on a CI system that reuses runners across builds is the failure mode to flag, not a hard rule violation on ephemeral (GitHub-hosted) runners.

6. **A published Gradle plugin MUST run `./gradlew publishPlugins --validate-only` in CI on every change, and MUST read `GRADLE_PUBLISH_KEY`/`GRADLE_PUBLISH_SECRET` from environment variables (never committed properties) in the release job that runs the unqualified `publishPlugins`.**
   Rationale: `--validate-only` catches metadata/packaging defects before the Portal's manual review queue does, at zero cost and no credential exposure; the environment-variable form keeps the publish key/secret out of source control (Finding 6).
   Verify: a CI workflow step invoking `publishPlugins --validate-only` on pull requests/pushes; `grep -rn "gradle.publish.key\|gradle.publish.secret" .` returns no hits in tracked files (only `GRADLE_PUBLISH_KEY`/`GRADLE_PUBLISH_SECRET` env references in CI YAML).

7. **`validatePlugins { enableStricterValidation = true }` MUST be enabled for any module that is actually published to the Portal (i.e., applies `com.gradle.plugin-publish`), not left at the `java-gradle-plugin` default.**
   Rationale: the default `validatePlugins` run checks only the plugin's own declared task types; stricter validation also checks types the plugin *exports* to consumers, catching missing input/output annotations that would otherwise surface as a silent configuration-cache or up-to-date-checking bug for every consumer (`detekt-gradle-plugin/build.gradle.kts:229-231`).
   Verify: `grep -rn "enableStricterValidation" <plugin-module>/build.gradle.kts` in every module that also matches `grep -l "com.gradle.plugin-publish" <module>/build.gradle.kts`.

8. **`validatePlugins` task presence MUST NOT be used, by a reviewer or a routing rule, as a signal that a repo/module publishes a Gradle plugin to the Portal; the signal is `com.gradle.plugin-publish` (or the corresponding `id(...)`) in that module's `plugins {}` block.**
   Rationale: `java-gradle-plugin` registers `validatePlugins` for any internal convention-plugin module too — measured 10/32 exemplar files across 7 repos, with 7 of those repos showing zero other Portal signal ([exemplar-publishing-ci-bazel.md:182,420](../jvm-audit/exemplar-publishing-ci-bazel.md)).
   Verify: `grep -l "com.gradle.plugin-publish" **/build.gradle.kts` is the routing grep; `grep -l "validatePlugins" **/build.gradle.kts` alone over-counts.

9. **A `gradlePlugin{}` block for a Portal-published plugin MUST set `website`, `vcsUrl`, and per-plugin `id`, `implementationClass`, `displayName`, `description`, `tags`, and (for `com.gradle.plugin-publish` 2.1.0+) a `compatibility { features { ... } }` block.**
   Rationale: this is the literal Portal submission requirement (Finding 9); omitting `tags` is accepted but measurably hurts discoverability (spring-boot omits it), and omitting `compatibility` is deprecated as of 2.1.0 with a stated (undated) plan to become a hard rejection.
   Verify: for each `create(...)`/`register(...)` entry inside `gradlePlugin { plugins { } }`, confirm `id`, `implementationClass`, `displayName`, `description`, `tags` are all set and non-empty; confirm `compatibility { features { configurationCache = ... } }` is present when `com.gradle.plugin-publish` is `2.1.0+`.

10. **Applying `com.gradleup.shadow` to a plugin module MUST be treated as "shade this plugin's own dependencies" and not conflated with "relocate every shaded dependency"; add `relocate(...)` only for a dependency at genuine risk of colliding in a shared, non-isolated classloader.**
    Rationale: Gradle isolates each `plugins { id(...) }`-resolved plugin into its own classloader by default, so the sharpest relocation case (a component loaded into a truly shared classloader, e.g. `error-prone` inside `javac`) does not generalise to every shaded Gradle plugin — Shadow's own build ships shaded-plugin-adjacent tooling without relocating itself (Finding 8, M-G-04).
    Verify: for a plugin module applying `com.gradleup.shadow`, `grep -n "relocate(" <module>/build.gradle.kts` — absence is not a defect by itself; presence should name, in a comment or commit message, which specific dependency and collision it defends against.

## Exemplar evidence

| Candidate | Exemplar | Satisfies / violates | Citation |
|---|---|---|---|
| 1 (3-leg matrix) | `gradle/actions` | Satisfies (at the Action level: 6.9 → 7.1.1 → release-candidate → current) | `gradle__actions@a27deee331:.github/workflows/integ-test-provision-gradle-versions.yml` |
| 1 (3-leg matrix) | `detekt` | Satisfies via a parallel min-supported-Gradle functional-test task | `detekt__detekt@45672efb8b:build.gradle.kts:79-88`, `detekt-gradle-plugin/build.gradle.kts:150-170` |
| 2 (separate CC leg) | `Shadow` | Partial — declares `configurationCache = true` compatibility and adds `--add-opens` JVM args explicitly to support testing configuration-cache with `withDebug()`, but the audit did not find a distinct "run functional tests twice, once with `--configuration-cache`" CI step in the checked-out files | `GradleUp__shadow@541b3be475:build.gradle.kts:166-203,210-217` |
| 3 (compileOnly/withPluginClasspath) | not directly exercised by the three named exemplars (none observed using `withPluginClasspath()` in the sparse checkout) | n/a — Gradle's own doc page is the load-bearing citation here | [test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html) |
| 6 (`--validate-only` in CI) | not directly observed in the checked-out build/CI files for the three named exemplars | n/a | [publishing_gradle_plugins.html](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html) |
| 7 (`enableStricterValidation`) | `detekt` | Satisfies | `detekt__detekt@45672efb8b:detekt-gradle-plugin/build.gradle.kts:229-231` |
| 8 (routing on plugin-publish, not validatePlugins) | `nowinandroid`, `sqldelight` | Violates the naive heuristic (would be false positives) | [exemplar-publishing-ci-bazel.md:182,420](../jvm-audit/exemplar-publishing-ci-bazel.md) |
| 9 (gradlePlugin metadata completeness) | `detekt`, `spotless`, `shadow` (all three fields) vs `spring-boot` (missing `tags`) | Mixed | [exemplar-publishing-ci-bazel.md:182](../jvm-audit/exemplar-publishing-ci-bazel.md) |
| 9 (compatibility declaration) | `Shadow`, `detekt` | Satisfies — both declare `configurationCache = true` on every published plugin id | `GradleUp__shadow@541b3be475:build.gradle.kts:210-217`; `detekt__detekt@45672efb8b:detekt-gradle-plugin/build.gradle.kts` (both `register(...)` blocks) |
| 10 (shade vs relocate) | `Shadow` | Satisfies the "don't blanket-relocate" half — applies `com.gradle.plugin-publish`, does not shade or relocate itself | `GradleUp__shadow@541b3be475:build.gradle.kts` (no `com.gradleup.shadow` or `relocate(` application to its own module) |
| 10 (mandatory-relocation counter-case) | `error-prone` | Confirms the sharper case: relocates because loaded into `javac`'s shared classloader | `google__error-prone@c1f99ad5d3` (per M-G-04, [jvm-audit/exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md)) |

## AI-agent angle

- **Hallucinating `GradleRunner.create().withPluginClasspath()` as the default/only functional-test setup.** Training data over-represents this call because it is the simplest tutorial-shaped example; it silently breaks the moment the plugin has a `compileOnly` dependency on another plugin's API (Finding 3). Mechanical check: any generated functional-test scaffold that calls `withPluginClasspath()` should be paired with a grep for `compileOnly(` in the same module's `build.gradle.kts` — co-occurrence is the trigger to switch to the local-Maven-repo pattern.
- **Writing `com.github.johnrengelman.shadow` instead of `com.gradleup.shadow`.** The old plugin id is heavily represented in pre-2023 training data (Shadow's maintainer transfer happened in 2023, tracked as [GradleUp/shadow#908](https://github.com/GradleUp/shadow/issues/908)); the old id is effectively dead for any build past Shadow 8.3.0. Mechanical check: `grep -rn "johnrengelman" **/build.gradle*` should return nothing in new code.
- **Assuming `publishPlugins` alone is safe to run in any CI job, including on pull requests from forks.** A model trained mostly on the existence of the task, not on the credential-safety discussion around it, will happily wire `publishPlugins` into a generic "CI" job rather than a gated release job. Mechanical check: `publishPlugins` (without `--validate-only`) should appear in CI YAML only inside a job gated on a tag/release trigger or an environment requiring approval, never on a `pull_request` trigger.
- **Omitting the `compatibility { features { ... } }` block entirely, or inventing a feature name that does not exist.** `com.gradle.plugin-publish` 2.1.0 is very recent (March 2026) relative to most training data, and a model may either skip the block (matching older, still-common exemplars) or hallucinate feature names beyond the one that currently exists (`configurationCache`). Mechanical check: if `compatibility { features { ... } }` is present, every named feature inside must be `configurationCache` as of 2026-09-12 — anything else is either a hallucination or a forward-looking Gradle release the rule has not been updated for; re-check `gradle/gradle-plugin-compatibility-plugin`'s README before accepting a new feature name.
- **Testing against only "the Gradle version the plugin happens to build with" and calling that "TestKit coverage."** This produces a plugin whose CI is green while its declared floor (in its `README` or `gradlePlugin{}` compatibility metadata) has never actually been exercised. Mechanical check: candidate 1's grep — at least three distinct `withGradleVersion` targets, or an equivalent min-supported-Gradle task/source-set — must exist somewhere in the module.
- **Treating "the plugin applies Shadow, therefore relocate every dependency" as a blanket rule.** A model that over-generalises the "shaded jars need relocation to avoid collisions" advice (correct for a `javac`-loaded component, or a CLI bundling a library also used elsewhere on the classpath) onto every shaded Gradle plugin will produce noisy, unnecessary `relocate(...)` calls that bloat the jar and complicate stack traces for no measured benefit — Shadow's own build is the counter-example (Finding 8, candidate 10). Mechanical check: a `relocate(` call should cite, in a comment, the specific consumer-side collision it prevents; an unexplained blanket `relocate("", "shadow.")`-style catch-all is a smell, not a best practice.

## Contested / evolving

- **The Compatibility Plugin's deprecation-to-rejection timeline is unannounced.** As of 2026-09-12, publishing without a `compatibility` declaration only warns; Gradle has stated an intent to eventually reject such submissions but no date is public in the newsletter or the plugin's own README ([newsletter.gradle.org/2026/03](https://newsletter.gradle.org/2026/03), [gradle/gradle-plugin-compatibility-plugin](https://github.com/gradle/gradle-plugin-compatibility-plugin)). Trending toward mandatory; treat "add the declaration" as a MUST today rather than waiting for enforcement.
- **Which Gradle features the Compatibility Plugin can declare is still a list of one (`configurationCache`).** Isolated Projects compatibility — a distinct, lagging gate per M-F-04 — is not yet a declarable feature as of the versions fetched for this brief. Any rule row naming "Isolated Projects compatibility declaration" as a Portal metadata field is premature until the plugin adds it.
- **Whether `--add-opens` JVM args are still required for `GradleRunner.withDebug()` configuration-cache testing is JDK-version-dependent and not settled in the fetched docs.** Shadow's build sets four explicit `--add-opens` flags on its functional-test target, tied to a 2022-era Gradle issue ([gradle/gradle#22765](https://github.com/gradle/gradle/issues/22765)); whether this is still required on the JDK 17 floor Gradle 9.x mandates, or is an artifact of an older JDK the exemplar has not revisited, was not independently re-verified against current Gradle internals for this brief and should be treated as "copy if debugging via `withDebug()`, re-verify if it silently becomes unnecessary."
- **The two `gradlePlugin { plugins { } }` id-declaration idioms (`create("id") { }` vs an explicit `id = "…"` property) remain split with no measured winner** (topic-map conflict 5, M-F-07) — both `Shadow` (`create("com.gradleup.shadow") { ... }`) and `detekt` (`register("dev.detekt") { ... }`, no separate `id =` line — the map key *is* the id) use the map-key form in the exemplars fetched for this brief; a rule's own example should pick one and say the other compiles identically, not imply one is deprecated.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.gradle.org/current/userguide/test_kit.html](https://docs.gradle.org/current/userguide/test_kit.html) | Gradle's own TestKit reference | Current docs, fetched 2026-09-12 (Gradle 9.7.1-era) | Primary source for the cross-version pattern, the compileOnly/withPluginClasspath incompatibility, the separate-process/daemon model, and testkit.dir |
| [docs.gradle.org/current/userguide/publishing_gradle_plugins.html](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html) | Gradle's own Plugin Portal publishing reference | Current docs, fetched 2026-09-12 | Primary source for plugin-publish 2.0.0's Gradle 7.4+ floor, auto-applied plugins, signing/shadow auto-behaviour, credentials, `--validate-only`, gradlePlugin{} metadata |
| [docs.gradle.org/current/userguide/jvm_test_suite_plugin.html](https://docs.gradle.org/current/userguide/jvm_test_suite_plugin.html) | Gradle's own JVM Test Suite plugin reference | Current docs, fetched 2026-09-12 | Primary source for declaring a `functionalTest` JvmTestSuite; note it does not itself document `gradleTestKit()` wiring, which is covered by test_kit.html and the exemplars instead |
| [plugins.gradle.org/docs/publish-plugin](https://plugins.gradle.org/docs/publish-plugin) | Plugin Portal's own publishing/submission guidance | Current, fetched 2026-09-12; references plugin-publish up to 2.1.0+ | Corroborates and extends docs.gradle.org with Portal-side submission rules (id namespace, no SNAPSHOT, "more than Hello world") and the 2.1.0 Compatibility Plugin auto-application |
| [github.com/gradle/gradle-plugin-compatibility-plugin](https://github.com/gradle/gradle-plugin-compatibility-plugin) | The Compatibility Plugin's own repository/README | Current, fetched 2026-09-12 | Primary source for the exact `compatibility { features { configurationCache = true } }` DSL and its auto-application by plugin-publish 2.1.0+ |
| [newsletter.gradle.org/2026/03](https://newsletter.gradle.org/2026/03) | Official Gradle newsletter, March 2026 issue | 2026-03, fetched 2026-09-12 | Dates the Compatibility Plugin / plugin-publish 2.1.0 stabilisation to March 2026 and states the Portal-promotion and future-rejection intent |
| [gradleup.com/shadow/](https://gradleup.com/shadow/) | Shadow plugin's own docs site | Current, fetched 2026-09-12 (documents Shadow 9.5.0+, Gradle 9.2+/Java 17+ floor) | Confirms current Shadow plugin-id/version/Gradle/Java compatibility table used to date the exemplar's Shadow usage |
| `gradle__actions@a27deee331:.github/workflows/integ-test-provision-gradle-versions.yml` | gradle/actions' own CI workflow (exemplar corpus) | Measured 2026-09-05, re-fetched 2026-09-12 via `git show` | Concrete cross-version-testing shape (6.9 → 7.1.1 → release-candidate → current) the depth file's matrix recommendation is built on |
| `gradle__actions@a27deee331:.github/workflows/ci-check-and-unit-test.yml:33` | Same repo, primary CI job | Measured 2026-09-05, re-fetched 2026-09-12 | Shows the companion pattern: one pinned version for the main job, a separate matrix for floor/RC/current |
| `detekt__detekt@45672efb8b:build.gradle.kts:79-88` and `detekt-gradle-plugin/build.gradle.kts` | detekt's own build (exemplar corpus) | Measured 2026-09-05 ([exemplar-quality-gates.md](../jvm-audit/exemplar-quality-gates.md)), re-fetched 2026-09-12 | Live `…MinSupportedGradle` parallel-task pattern, `enableStricterValidation = true`, and the Compatibility Plugin declaration on two plugin ids |
| `GradleUp__shadow@541b3be475:build.gradle.kts` | Shadow's own build (exemplar corpus) | Measured 2026-09-05 ([exemplar-quality-gates.md](../jvm-audit/exemplar-quality-gates.md)), re-fetched 2026-09-12 | Live `gradleTestKit()` + dedicated `functionalTest` JvmTestSuite wiring, the Compatibility Plugin declaration, and (as a negative example) no self-shading/relocation |
| [jvm-audit/exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md) | Wave-1 audit of publishing/CI/Bazel signal across all 32 exemplars | Measured 2026-09-05 | Source of the `validatePlugins`-is-not-a-Portal-signal finding and the gradlePlugin metadata-field coverage table |
| [jvm-topic-map/gradle-canonical.md](../jvm-topic-map/gradle-canonical.md) | Wave-1 canonical-Gradle scout | Measured/fetched 2026-09-05 | Independent corroboration of the TestKit and publish-plugin primary-source readings; used to cross-check rather than substitute for this brief's own fetches |
| [jvm-topic-map.md](../jvm-topic-map.md) (conflict 1, M-F-01–M-F-12, M-G-01–M-G-07) | The phase-3 topic map that commissioned this dive | 2026-09-05 | Binding decisions this brief must honour: fat-jar-by-consumer-kind resolution, and the exact rows (M-F-*, M-G-04) this dive answers |


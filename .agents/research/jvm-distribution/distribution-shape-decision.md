---
title: "Distribution shape decision: fat jar, nested jar, runtime image, installer, or container"
topic: distribution-shape-decision
agent: distribution-shape-decision
model: sonnet
date_researched: 2026-09-12
sources_count: 14
scope: |
  Covers how to choose a JVM distribution shape for something this program's
  consumers ship: the application plugin's start-script distribution, Spring
  Boot's nested/layered jar, jlink runtime images, jpackage installers, and
  Jib/container images — routed off one question (program vs. plugin-host vs.
  API dependency), not off "we need a jar that runs." Does NOT cover the
  merge-failure taxonomy inside a shaded jar (ServiceLoader loss, signed-jar
  SecurityException, relocation) — that is `shading-failure-taxonomy.md`
  (family GRADLE-DIST, same directory) — nor Bazel `java_binary` deploy jars
  (BZL-JAVA, ships to `bazel-quality`) nor Maven assembly/shade mechanics
  beyond what the routing decision needs.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The routing question](#1-the-routing-question)
   2. [Application plugin: the start-script baseline](#2-application-plugin-the-start-script-baseline)
   3. [Spring Boot nested jar: BOOT-INF without merging](#3-spring-boot-nested-jar-boot-inf-without-merging)
   4. [Spring Boot layered jars: the fixed layer order](#4-spring-boot-layered-jars-the-fixed-layer-order)
   5. [jlink: runtime images and the automatic-module wall](#5-jlink-runtime-images-and-the-automatic-module-wall)
   6. [jpackage: native installers and per-OS signing](#6-jpackage-native-installers-and-per-os-signing)
   7. [Jib and containers: layering without a Dockerfile](#7-jib-and-containers-layering-without-a-dockerfile)
   8. [Where shading is still correct](#8-where-shading-is-still-correct)
   9. [The OCX SDK: no executable at all](#9-the-ocx-sdk-no-executable-at-all)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A consumable library is **never shaded** — zero counterexamples in 32 exemplar repos; every shaded/relocated artifact found is a CLI, a javac/annotation-processor plugin, or an internal vendoring step ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md#axis-2--fatjar-shadow-jars-and-distribution-shapes)).
- Pick the shape by answering one question first: is this thing **(a)** invoked as a program, **(b)** loaded as a plugin/agent into someone else's process, or **(c)** declared as a dependency and called through its API? (c) stops here — ship a plain jar plus POM/Gradle module metadata, full stop.
- For (a) — an application — the application plugin (`application`) is the baseline that always works: start scripts, an unmodified dependency classpath, no merge, no class-identity change. Fat-jar shading is the naive fallback, not the recommendation, the moment a better-fitting shape's precondition holds.
- Spring Boot's nested `BOOT-INF/classes` + `BOOT-INF/lib/*.jar` layout ships every dependency jar intact, so none of shading's failure modes (`ServiceLoader` provider loss, signed-jar `SecurityException`, `module-info.class` collision, split packages) can occur — because nothing is merged.
- The nested layout's one real cost — a small classloading startup penalty from reading class bytes out of a jar-in-a-jar — is erased by `java -Djarmode=tools -jar app.jar extract`, which unpacks to a plain `lib/` directory plus a thin app jar with zero code changes required.
- A layered jar's layer order is fixed and load-bearing: `dependencies → spring-boot-loader → snapshot-dependencies → application`, least-likely-to-change first. Reordering it (or putting `application` earlier) defeats Docker's layer-cache reuse on every single code change, because Docker invalidates every layer after the first one that changed.
- `jlink` refuses to build an image the moment any module on the module path is an **automatic** module (a plain jar with no `module-info.class`, only an inferred or `Automatic-Module-Name`-declared name) — the error is `automatic module cannot be used with jlink`, and it is a hard stop, not a warning.
- The two fixes for a jlink-blocking automatic module are: exclude it from the module graph and put it on the classpath instead (losing strong encapsulation for that one dependency), or replace it with a real modularized version if one exists. There is no third option — `jlink` never links automatic modules.
- Since JDK 24 (JEP 493, `--enable-linkable-runtime`), `jlink` can link a custom runtime image straight from the running JDK's own image with no `jmods/` directory on disk — but only when the vendor's JDK build opted in, only against the *current* platform (no cross-linking), and never when `jdk.jlink` itself must be included in the produced image.
- `jpackage` produces a native, double-clickable artifact per OS (`.msi`/`.exe` on Windows, `.dmg`/`.pkg` on macOS, `.deb`/`.rpm` on Linux, or a bare `app-image`) and **must be run once per target OS** — there is no cross-platform build.
- `jpackage` has macOS signing flags (`--mac-sign`, `--mac-signing-keychain`, `--mac-entitlements`) but **no notarization step of its own** — notarization is a separate `xcrun notarytool` (or equivalent) invocation after `jpackage` runs, and skipping it means Gatekeeper blocks the app on a clean Mac.
- Jib builds an OCI/Docker image with no Dockerfile and no Docker daemon on the build machine, splitting the application into its own layers (all other dependencies, snapshot dependencies, project dependencies, resources, classes, plus one layer per `extraDirectories` entry) — deliberately separating what changes rarely from what changes on every commit.
- Do not shade a fat jar and then `COPY` it into a Dockerfile: that stacks the fat jar's internal duplication (nothing about it is layered) on top of Docker's own layer cache, so every code change invalidates the entire image layer. Use the nested/layered jar, or Jib, or a Dockerfile that copies `BOOT-INF/lib` and `BOOT-INF/classes` as separate `COPY` layers instead.
- Shading **is** the sanctioned shape for a Gradle plugin product: `com.gradle.plugin-publish` has auto-applied `com.gradleup.shadow` to relocate a plugin's third-party dependencies since 1.0.0, because a Gradle plugin is loaded into the host build's own classloader and any un-relocated dependency can collide with the host's or another plugin's copy.
- Shading is also correct for a CLI tool, a javac/annotation-processor/Error-Prone-style compiler plugin, or an internal vendoring step — every real shading use in the corpus is one of these three, never a declared-dependency library (`uber__NullAway`'s `jar-infer-cli`, `pinterest__ktlint`'s `ktlint-cli`, `detekt__detekt`'s `detekt-cli`, `google__error-prone`'s `error_prone_core` loaded into `javac` itself).
- The OCX SDK is case (c): declared as a Gradle/Maven dependency and called through its API. It ships **no executable at all** — a plain library jar plus a complete published POM/Gradle Module Metadata — because the thing it wraps (the `ocx` CLI) is an already-installed external binary the SDK's process boundary shells out to, not something the SDK packages or distributes itself.
- Application-plugin usage in the corpus (7/32) skews to sample/example modules (`apollo-kotlin`, `grpc-java`, `Exposed`), and Spring Boot's 383 `bootJar`/boot-plugin hits are dominated by its own smoke-test and sample modules — neither count is 7 or 383 shipped, distinct executables; cite the per-real-module caveat whenever quoting either number ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md#smells-ranked) smell 6).
- Testcontainers-java's 62 Dockerfiles are per-database test fixtures (one per supported database image), not 62 distinct shipped container distributions — the same monorepo-noise caveat applies.

## Findings

### 1. The routing question

An agent choosing a distribution shape should answer exactly one question before touching a build file:

> **Is this artifact (a) invoked as a program, (b) loaded as a plugin or agent into someone else's process, or (c) declared as a dependency and called through its API?**

This is [conflict 1](../jvm-topic-map.md#conflicts-resolved)'s adjudication, and the exemplar corpus resolves it with zero counterexamples: no repo in 32 shades a library whose primary consumption mode is "declare as a Gradle/Maven dependency and call its API" — every shaded/relocated artifact found is a CLI, a javac/annotation-processor plugin, or an internal vendoring step ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md#axis-2--fatjar-shadow-jars-and-distribution-shapes)). That makes the MUST unconditional and first:

**MUST: a consumable library is never shaded.** Not "shading a library is discouraged" — shading a library has no precondition under which it is correct, because relocating or merging classes changes the library's binary identity for every consumer, defeats `equals`/`instanceof` checks against the original classes, and duplicates transitive dependencies a consumer may already have on its own classpath.

```
                 ┌─────────────────────────────────────────┐
                 │ How is this artifact consumed?           │
                 └─────────────────────────────────────────┘
                            │
       ┌────────────────────┼─────────────────────────┐
       ▼                    ▼                          ▼
  (a) invoked as       (b) loaded into            (c) declared as a
      a program            someone else's              dependency, called
                            process (Gradle              through its API
                            plugin, javac
                            plugin, java agent)
       │                    │                          │
       ▼                    ▼                          ▼
  pick among:          shading IS the           NEVER shade.
  - application         sanctioned shape.        Ship: plain jar +
    plugin (baseline)    Relocate every           complete POM /
  - Spring Boot nested   third-party package      Gradle Module
    / layered jar        that could collide       Metadata. No
  - jlink runtime        with the host's own      executable needed
    image                copy or another          unless a separate,
  - jpackage installer   plugin's.                 clearly distinct
  - Jib / container                                CLI artifact is
                                                     independently
                                                     justified.
```

### 2. Application plugin: the start-script baseline

Applying `application` (which implicitly applies `java` and `distribution`) gets a project generated start scripts for Unix and Windows, a `build/install/<name>` exploded image, and `distZip`/`distTar` archives — every dependency stays an unmodified jar on the generated classpath, so nothing is merged and no class-identity change occurs ([Gradle application plugin docs](https://docs.gradle.org/current/userguide/application_plugin.html)). Its precondition is minimal: **a JVM must already be present on the target machine** — the plugin ships no runtime, just a launcher.

```kotlin
// build.gradle.kts
plugins {
    application
}

application {
    mainClass.set("com.example.App")
    applicationDefaultJvmArgs = listOf("-Xmx512m")
}
```

Key tasks: `run` (local execution), `startScripts`, `installDist` (unzipped install image), `distZip`/`distTar` (packaged distribution), `assembleDist` (from the underlying `distribution` plugin, plugin id `distribution`) which depends on both archive tasks ([Gradle distribution plugin docs](https://docs.gradle.org/current/userguide/distribution_plugin.html)).

This is the shape to reach for by default for any JVM-only application with no framework-specific packaging story (Spring Boot, etc.) and no need for a native installer or a minimal runtime image — it "works everywhere" a JVM does, at the cost of the consumer needing that JVM.

### 3. Spring Boot nested jar: BOOT-INF without merging

Spring Boot's executable jar keeps `BOOT-INF/classes` (application classes/resources) and `BOOT-INF/lib/*.jar` (every dependency, each still a complete, unmodified jar) inside one outer jar, launched via a small `spring-boot-loader` bootstrap that reads nested jar entries directly. Because no dependency jar is opened and re-merged into a single class-file namespace, **none of the shading failure modes apply**: no `META-INF/services/*` provider file can be silently dropped by a duplicate-strategy pick, no `META-INF/*.SF`/`.RSA` signature can go stale, no `module-info.class` from two different multi-release jars can collide, no split package across two dependencies can occur — because every dependency jar remains exactly as its own build produced it ([Spring Boot efficient-deployments doc](https://docs.spring.io/spring-boot/reference/packaging/efficient.html)).

The one real cost is a **nested-jar classloading startup penalty**: `spring-boot-loader`'s `NestedJarFile`/custom classloader reads class bytes out of a jar nested inside another jar, which is measurably slower than reading directly off disk. This is erasable with zero code changes:

```bash
java -Djarmode=tools -jar app.jar extract
java -jar app/app.jar
```

`extract` unpacks the executable jar into a plain directory — a `lib/` folder holding every dependency jar unmodified, plus a thin application jar whose manifest classpath points at `lib/` — which removes the nested-read penalty entirely and is also what makes the layout AOT-cache/CDS-friendly ([Spring Boot efficient-deployments doc](https://docs.spring.io/spring-boot/reference/packaging/efficient.html)). `spring-boot-jarmode-tools` is added automatically the moment a layered jar is built and can be turned off with `includeTools = false` if genuinely unwanted.

Precondition: this shape exists only inside the Spring Boot Gradle/Maven plugin (`org.springframework.boot`, task `bootJar`/`bootWar`); it is not a general-purpose Gradle feature.

### 4. Spring Boot layered jars: the fixed layer order

Layered jars split `BOOT-INF` content across named layers for Docker layer-cache reuse. The **default and only sanctioned order** is:

```
dependencies → spring-boot-loader → snapshot-dependencies → application
```

Spring's own docs state the rule directly: "the layers order is important as it determines how likely previous layers can be cached... Content that is least likely to change should be added first, followed by layers that are more likely to change" ([Spring Boot Gradle plugin packaging doc](https://docs.spring.io/spring-boot/gradle-plugin/packaging.html)). This is a Docker mechanism, not a Spring one: a container image layer's cache key depends on every layer beneath it, so once a layer changes, every layer stacked *after* it must rebuild regardless of whether its own content changed. Putting `application` (which changes on every commit) before `dependencies` (which barely ever changes) means the dependency layer rebuilds on every commit too — reordering does not just weaken the feature, it defeats the entire reason it exists.

```kotlin
// build.gradle.kts — correct: default order, only layer membership customized
tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    layered {
        application {
            intoLayer("spring-boot-loader") {
                include("org/springframework/boot/loader/**")
            }
            intoLayer("application")
        }
        dependencies {
            intoLayer("application") { includeProjectDependencies() }
            intoLayer("snapshot-dependencies") { include("*:*:*SNAPSHOT") }
            intoLayer("dependencies")
        }
        layerOrder.set(listOf("dependencies", "spring-boot-loader", "snapshot-dependencies", "application"))
    }
}
```

```kotlin
// WRONG — application first defeats Docker layer caching on every commit
layerOrder.set(listOf("application", "dependencies", "spring-boot-loader", "snapshot-dependencies"))
```

`layerOrder` must be set explicitly and must cover every layer referenced by an `intoLayer` call, or the build fails ([Spring Boot Gradle plugin packaging doc](https://docs.spring.io/spring-boot/gradle-plugin/packaging.html)).

### 5. jlink: runtime images and the automatic-module wall

`jlink` assembles a custom, minimal runtime image containing only the JDK modules (and application modules) actually needed. Its precondition is unforgiving: **every module discovered on the module path must be a real module** — an explicit module (has `module-info.class`) or, at minimum, an automatic module `jlink` is willing to treat as one. In practice a plain jar with no `module-info.class` (an "automatic module," named either by its filename or an `Automatic-Module-Name` manifest entry) makes `jlink` refuse outright with:

```
Error: automatic module cannot be used with jlink: <module-name> from <path>
```

This is a hard stop, not a warning ([tacosteemers.com jlink automatic-module walkthrough](https://tacosteemers.com/articles/java_jlink_automatic_module_cannot_be_used_with_jlink.html); topic corroborated by [YouTrack SUPPORT-A-2700](https://youtrack.jetbrains.com/articles/SUPPORT-A-2700/jlink-fails-with-the-automatic-module-cannot-be-used-with-jlink-error), whose article body renders client-side and could not be scraped directly — cite the tacosteemers walkthrough for the exact error text and fix steps, and treat the YouTrack article as topic confirmation only).

There are exactly two fixes, no third option:

1. **Exclude the automatic-module dependency from the module graph and put it on the classpath instead** (via a split classpath/module-path launch), accepting that this one dependency no longer participates in strong encapsulation.
2. **Replace it with a modularized version** that ships a real `module-info.class`, if one exists upstream.

Generating a synthetic `module-info.java` via `jdeps --generate-module-info`, compiling it, and injecting it into the jar with `jar uf` is a documented workaround, but it produces an unofficial module descriptor the upstream project did not publish and does not ship — treat it as a stopgap, not a fix, and prefer option 2 when a real modularized release exists.

`jlink`'s own module-path handling ([Oracle `jlink` tool spec](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jlink.html)): the module path accepts modular jars, JMOD files, or exploded modules; if `--module-path` is given but `java.base` cannot be resolved from it, `jlink` silently appends `$JAVA_HOME/jmods`. `--add-modules mod[,mod...]` seeds the root module set (empty by default) and `jlink` pulls in transitive dependencies from there.

**Since JDK 24, JEP 493** ("Linking Run-Time Images without JMODs") lets `jlink` extract modules directly from the running JDK's own run-time image instead of requiring a separate `jmods/` directory on disk, when the vendor's JDK build was compiled with `--enable-linkable-runtime` — the resulting JDK distribution can omit `jmods/` entirely, cutting installed size by roughly a quarter, which matters for container base images pulled repeatedly ([JEP 493](https://openjdk.org/jeps/493)). Preconditions/limits: not on by default (a vendor opt-in build flag); if JMOD files *are* present on the module path, `jlink` still prefers them; no cross-platform linking; fails if `$JAVA_HOME/conf/` was modified from the vendor defaults; and an image built this way cannot itself include `jdk.jlink` (so it cannot be used to link a further image).

### 6. jpackage: native installers and per-OS signing

`jpackage` produces a self-contained native package — an installer or a bare application image — per operating system: `.msi`/`.exe` on Windows, `.dmg`/`.pkg` on macOS, `.deb`/`.rpm` on Linux, or `app-image` (no installer, just a runnable bundle) anywhere ([Oracle `jpackage` tool spec](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jpackage.html)). The spec states plainly: **"each format must be built on the platform it runs on, there is no cross-platform support."** A CI matrix building all three OS installers needs a runner per OS.

macOS packages need signing to run past Gatekeeper on someone else's Mac. `jpackage` exposes the signing flags — `--mac-sign`, `--mac-signing-keychain`, `--mac-signing-key-user-name`, `--mac-entitlements` — but does **not** perform notarization itself; notarization (submitting the signed package to Apple's notary service and stapling the ticket) is a separate step run after `jpackage` completes, typically via `xcrun notarytool submit` / `xcrun stapler staple`. Skipping that step produces a signed-but-unnotarized app that macOS still blocks by default on a machine that isn't the one that built it.

Precondition for reaching for `jpackage` at all: you want something end users double-click or install through their OS's native installer mechanism — desktop tooling, not a server workload. 0/32 exemplars in the corpus use it ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md#axis-2--fatjar-shadow-jars-and-distribution-shapes)), so this is real but thin, platform-narrow guidance rather than corpus-corroborated convention.

### 7. Jib and containers: layering without a Dockerfile

Jib builds an OCI/Docker image directly — no `Dockerfile`, no Docker daemon needed on the build machine, "without deep mastery of Docker best-practices" ([Jib project README](https://github.com/GoogleContainerTools/jib/blob/master/README.md)). Its layering strategy deliberately separates content by how often it changes, in this fixed order: **all other (non-snapshot) dependencies, snapshot dependencies, project dependencies, resources, classes**, plus one additional layer per `jib.extraDirectories` entry ([Jib FAQ](https://github.com/GoogleContainerTools/jib/blob/master/docs/faq.md#how-are-jib-applications-layered)) — the same "stable things first, volatile things last" principle Spring Boot's layered jar uses, expressed as Jib's own default rather than something a build author configures.

```kotlin
// build.gradle.kts
plugins {
    id("com.google.cloud.tools.jib") version "<pinned version>"
}

jib {
    to {
        image = "registry.example.com/my-app"
    }
}
```

Precondition for Jib over a hand-rolled Dockerfile: you are targeting a container platform and want Docker's layer-cache benefit without hand-maintaining a Dockerfile or running a local Docker daemon in CI. Precondition for a **plain Dockerfile** instead: you need Dockerfile-level control (custom base image steps, non-Java processes in the same image, `RUN` commands Jib cannot express) — but if you reach for one, copy `BOOT-INF/lib` and `BOOT-INF/classes` (or the application-plugin's `lib/` and application jar) as **separate `COPY` instructions in separate layers**, in stable-to-volatile order; never `COPY` a single fat jar into a Dockerfile, because that collapses everything Jib and layered jars exist to keep apart back into one all-or-nothing layer that invalidates on every commit.

Corpus reality check: Jib appears in exactly 1/32 repos (`grpc-java`), and Dockerfiles cluster heavily in `testcontainers-java` (62 — one per supported database's test fixture, not 62 shipped images) ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md#axis-2--fatjar-shadow-jars-and-distribution-shapes)) — real, correct trade-offs, thin corpus evidence for either choice.

### 8. Where shading is still correct

Two consumer kinds genuinely need a merged jar, and both are the exception the routing question in §1 already carves out:

- **A Gradle plugin as the product.** `com.gradle.plugin-publish` has auto-applied `com.gradleup.shadow` (formerly `com.github.johnrengelman.shadow`) to relocate third-party dependencies since 1.0.0 — a plugin is loaded into the host build's own classloader alongside every other plugin, so an un-relocated dependency can silently collide with the host's or a sibling plugin's copy of the same library at a different version.
- **A CLI tool, a javac/annotation-processor compiler plugin, or an internal vendoring step.** Every genuine shading use measured in the corpus is one of these: `uber__NullAway@519a1bb826`'s `jar-infer-cli`/`jdk-javac-plugin`/`astubx-generator-cli`, `pinterest__ktlint@4c933394a3`'s `ktlint-cli`, `detekt__detekt@45672efb8b`'s `detekt-cli`, `grpc__grpc-java@fc4314419d`'s `netty/shaded` (dependency vendoring), and `google__error-prone@c1f99ad5d3`'s Maven-shaded `error_prone_core`, relocated because it is loaded straight into `javac` and must not leak its own Guava/ASM copy onto the compilation classpath ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md#axis-2--fatjar-shadow-jars-and-distribution-shapes)). None of these shade the artifact a consumer actually declares as a dependency (`nullaway`, `ktlint-rule-engine-core`, `detekt-api`) — only the standalone launcher/plugin form.

The merge mechanics themselves (which transformer, which exclusion, `minimize()`'s blind spot on reflection/ServiceLoader) are out of scope here — see `shading-failure-taxonomy.md` in this same directory.

### 9. The OCX SDK: no executable at all

The OCX SDK for the JVM is case (c) in the routing question: it is declared as a Gradle/Maven dependency by a consumer's build and called through its public API. It follows the MUST from §1 unconditionally — **it is never shaded** — and, further, it ships **no executable artifact of its own**: no `bootJar`, no application-plugin distribution, no jlink image, no jpackage installer, no container image. The `ocx-sdk-python` analogue this program targets wraps an *already-installed* `ocx` CLI binary as a subprocess — the SDK's process boundary is to something external it does not package, distribute, or ship a launcher for ([cfg](../jvm-audit/config-inventory.md), Axis 3; [conflict 13](../jvm-topic-map.md#conflicts-resolved)). What the SDK publishes is a plain library jar (or a Kotlin-compiled jar with a Java-facing API surface per [conflict 14](../jvm-topic-map.md#conflicts-resolved)) plus a complete POM (or Gradle Module Metadata + a Maven-consumable POM, since the SDK is Gradle-built but Maven-consumed) — nothing more. If a standalone `ocx` CLI wrapper or launcher is ever wanted as a *separate* deliverable, it is a distinct artifact with its own routing decision (case (a), application plugin baseline), never bundled into the library jar.

## Normative guidance candidates

1. **A jar declared as a Gradle/Maven/Bazel dependency and consumed through its public API MUST NOT be shaded.** *Rationale*: shading changes the jar's binary identity for every consumer with zero counterexamples of it being correct in 32 exemplars. *Verify*: for every `build.gradle(.kts)`/`pom.xml` applying `com.gradleup.shadow` or `maven-shade-plugin`, read the shaded module's own name and confirm it is a CLI/agent/plugin module (e.g. `*-cli`, `*-agent`, a `java-gradle-plugin` module), never the library module a consumer would declare (e.g. `grep -l 'com.gradleup.shadow\|maven-shade-plugin' **/build.gradle.kts **/pom.xml` then check the module is not also the one referenced in the project's own README/BOM as the dependency to add).
2. **Before choosing a distribution shape, classify the artifact as (a) program, (b) plugin/agent host-loaded, or (c) API dependency, and record which.** *Rationale*: the shape decision is a lookup on this classification, not a preference. *Verify*: a named reading heuristic — check the module's own consumption instructions (README "add this dependency" vs. "run this jar" vs. "apply this plugin") before touching any packaging DSL.
3. **A general-purpose JVM application distribution SHOULD start from the `application` Gradle plugin unless a more specific shape's precondition is met.** *Rationale*: it is the only shape with no merge, no class-identity change, and no framework lock-in. *Verify*: `grep -l '^\s*application\b' **/build.gradle.kts` or presence of the `application {}` block; `./gradlew tasks --group=distribution` lists `distZip`/`distTar`/`installDist` when applied.
4. **A Spring Boot application MUST use `bootJar`'s nested layout, never `com.gradleup.shadow`, to produce its executable jar.** *Rationale*: nested BOOT-INF keeps every dependency jar intact, so the entire shading failure taxonomy (ServiceLoader loss, signed-jar exceptions, `module-info.class` collisions, split packages) cannot occur. *Verify*: `grep -L 'org.springframework.boot' **/build.gradle.kts` cross-checked against any `com.gradleup.shadow` application on the same module — flag co-application as a defect, and confirm `bootJar { }`/`bootWar { }` is the task producing the shipped artifact (`./gradlew bootJar` succeeds and the jar's `META-INF/MANIFEST.MF` has `Start-Class`).
5. **A layered Spring Boot jar MUST declare `layerOrder` as `dependencies, spring-boot-loader, snapshot-dependencies, application` (or a superset preserving that relative order), never reordered.** *Rationale*: Docker's layer cache invalidates every layer after the first changed one; putting `application` earlier defeats the entire feature. *Verify*: read the `layered { layerOrder.set(...) }` (or Groovy `layerOrder = [...]`) list literally and confirm `application` is last; a CI check can `docker history` the built image and confirm the `application` layer is the smallest/most-recently-changed one.
6. **`jlink` MUST NOT be applied to a module graph containing an automatic module; either exclude it (classpath fallback) or replace it with a modularized release before wiring `jlink` into the build.** *Rationale*: `jlink` hard-fails with `automatic module cannot be used with jlink` — there is no flag to suppress this. *Verify*: run (or have CI run) `jdeps --list-deps` / `jlink --module-path <path> --add-modules <mod> --output <dir>` in a dry pass before shipping a jlink-based distribution; a non-zero exit naming "automatic module" is the signal, not a warning to triage later.
7. **`jpackage` output MUST be built once per target OS in CI (no cross-compilation), and a macOS build MUST run notarization as a separate CI step after `jpackage`.** *Rationale*: `jpackage`'s own spec states each format is platform-native only; signing without notarization still fails Gatekeeper on a clean Mac. *Verify*: CI matrix has one job per OS producing `jpackage` output; the macOS job's log shows both a `jpackage --mac-sign` (or equivalent) step and a subsequent `xcrun notarytool submit`/`stapler staple` step, not just the former.
8. **A container image for a JVM application MUST NOT `COPY` a single fat/shaded jar as its only application layer; use Jib, or `COPY` the nested/layered-jar's `lib/`/`BOOT-INF/lib` and application classes as separate Dockerfile layers.** *Rationale*: a fat jar collapses dependency and application code into one blob, so every code change invalidates the whole image layer regardless of which packaging tool wrote it. *Verify*: `grep -n '^COPY' Dockerfile` — a single `COPY *-all.jar` / `COPY *-fat.jar` line feeding the image's only application layer is the defect signature; a correct Dockerfile has at least two `COPY` lines (dependencies, then application classes) or applies `com.google.cloud.tools.jib` instead of a Dockerfile at all.
9. **The OCX SDK for the JVM ships no executable artifact — no `bootJar`, no application-plugin distribution, no jlink/jpackage/container output — only a library jar and a complete POM/Gradle Module Metadata.** *Rationale*: it is case (c) in the routing question, and the CLI it wraps is external and pre-installed, not something the SDK packages. *Verify*: the SDK's `build.gradle.kts` applies none of `application`, `org.springframework.boot`, a jlink/jpackage plugin, or `com.google.cloud.tools.jib`; its published artifact list (`./gradlew outgoingVariants` or the published POM) contains exactly the library jar, sources jar, javadoc/dokka jar, and POM — no `-all`/`-fat`/`-shaded` classifier and no OS-suffixed archive.

## Exemplar evidence

| Candidate | Repo@sha:path | Satisfies / violates | Note |
|---|---|---|---|
| #1 (library never shaded) | `uber__NullAway@519a1bb826:jar-infer-cli/build.gradle:39` | Satisfies | Shades `jar-infer-cli`, not the `nullaway` library artifact ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md)). |
| #1 | `pinterest__ktlint@4c933394a3:ktlint-cli/build.gradle.kts:18` | Satisfies | Shades `ktlint-cli` only. |
| #1 | `detekt__detekt@45672efb8b` (`detekt-cli`, `ktlint-repackage`) | Satisfies | CLI and single-dependency vendoring only; `detekt-api` untouched. |
| #1 | `google__error-prone@c1f99ad5d3` (Maven `<relocation>`) | Satisfies, correctly a case-(b) exception | `error_prone_core` is loaded into `javac`, matching §8's plugin-host exception, not a violation. |
| #3 (application plugin baseline) | `apollographql__apollo-kotlin`, `grpc__grpc-java`, `JetBrains__Exposed` | Partial | Application plugin used, but in sample/example modules, not the library's own shipped distribution ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) — cite with the per-module caveat, never as "7/32 ship applications"). |
| #4 (Spring Boot nested, never shaded) | `spring-projects__spring-boot@93b23c40c2` | Satisfies | 383 `bootJar`/boot-plugin hits, zero co-application of `com.gradleup.shadow`/`maven-shade-plugin` found in the same audit pass ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2 table) — but the 383 figure is monorepo/sample-module noise, cite with the caveat. |
| #8 (Docker layer discipline) | `testcontainers/testcontainers-java@a4d3a033d8` | Neutral | 62 Dockerfiles are per-database test fixtures, not evidence of application-image practice either way; do not cite as a container-shape exemplar ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) smell 6). |
| §7 (Jib) | `grpc__grpc-java@fc4314419d` | Satisfies (only positive instance) | 4 Jib-related hits, the sole repo of 32 using Jib at all ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2 table, `Jib` column). |
| §6 (jpackage) | *(none)* | No evidence | 0/32 exemplars use `jpackage` — guidance here is precondition-derived, not corpus-corroborated ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md)). |
| §5 (jlink automatic-module wall) | *(none in corpus)* | No evidence | No exemplar builds a jlink image; the failure mode is documented from JEP 493 and the tacosteemers walkthrough, not measured against the corpus — flag as precondition-derived guidance, same caveat as jpackage. |

## AI-agent angle

- **Defaulting to a fat jar as "the" Java distribution shape.** Pre-2023 tutorials and Stack Overflow answers overwhelmingly show `shadowJar`/`maven-shade-plugin` as the generic "how do I run my Java app" answer. An LLM trained on that corpus will reach for shading even for a library. **Check**: before applying any shading plugin, confirm the artifact is case (a) or (b) from §1's routing question — if the module is also referenced by the project's own README as "add this as a dependency," shading it is wrong regardless of what shape the rest of the build uses.
- **Hallucinating an official Gradle jlink/jpackage plugin.** There is no first-party Gradle plugin for either tool; real builds use community plugins (`org.beryx.jlink`, `org.beryx.runtime`, `org.panteleyev.jpackageplugin`) or a raw `Exec`/`JavaExec` task invoking the JDK binary directly. A model may invent a plugin id like `org.gradle.jlink` or `application.jpackage`. **Check**: `./gradlew plugins` (or a `grep` over the Gradle Plugin Portal id in the build file) — if the id doesn't resolve on `plugins.gradle.org`, it's fabricated.
- **Assuming the old Shadow coordinates.** Pre-2023 examples use `id("com.github.johnrengelman.shadow")`; the maintained plugin moved to `com.gradleup.shadow` under the GradleUp org. A model trained on older material emits the dead coordinate. **Check**: `grep -rn 'johnrengelman.shadow'` — any hit outside a deliberately-pinned legacy build (the corpus's only such case is `dagger`) is stale.
- **Treating `preserveFileTimestamps`/`reproducibleFileOrder` grep hits as evidence of a correctly configured reproducible archive.** The corpus itself shows a 3x overcount from naive grepping — one "hit" was a hand-written `Transformer` method parameter with the same name, unrelated to the Gradle archive-task property, and another just restated Gradle's own current defaults ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) smell 1). **Check**: read the surrounding archive-task block, not just the token; confirm the property sits inside a `tasks.withType<AbstractArchiveTask>` or `jar {}`/`shadowJar {}` block, not inside an unrelated method signature.
- **Reordering Spring Boot's layer list "for clarity" or alphabetically.** A model asked to "clean up" a `layered {}` block may reorder the `layerOrder` list without understanding it encodes cache-invalidation order, not documentation order. **Check**: diff the `layerOrder` list against the canonical `dependencies, spring-boot-loader, snapshot-dependencies, application` before accepting any edit that touches it.
- **Recommending shading + a Dockerfile together as "belt and suspenders."** A model may suggest both a fat jar and a multi-stage Dockerfile, believing more packaging is safer. This is strictly worse than either alone — it collapses Docker's layer cache while adding shading's merge-failure surface for no benefit. **Check**: a Dockerfile with both a `COPY *-all.jar` line and a Spring Boot or application-plugin build upstream is the tell; pick one shape, not both.
- **Assuming `jlink` "just works" on any dependency set.** A model that has not internalized the automatic-module wall will write a jlink Gradle task against an arbitrary dependency graph and expect it to succeed. **Check**: run the jlink invocation once in CI as a dry pass before merging; a first-time author should not discover the `automatic module cannot be used with jlink` failure in production tooling.

## Contested / evolving

- **Configuration cache and jlink/jpackage community plugins.** Several third-party jlink/jpackage Gradle plugins predate Gradle's configuration-cache and Provider-API conventions and may not be configuration-cache compatible as of 2026-09; this program did not re-verify any specific plugin's current compatibility status, and a rule row should say "confirm configuration-cache compatibility for the specific plugin version pinned" rather than assume it.
- **Whether Jib's project momentum continues.** The Jib README does not show recent release cadence signals fetched in this pass beyond confirming it is marked `stable`; corpus usage is 1/32. Treat Jib as a real, correct choice under its precondition, not as the default container-build answer the way it may have been positioned circa 2019-2021.
- **JEP 493's practical reach.** As of 2026-09-12 it requires the *vendor's* JDK build to opt in with `--enable-linkable-runtime`; whether a given LTS distribution (Temurin, Zulu, Oracle) ships that flag by default for JDK 24/25/26 builds was not independently re-verified against each vendor's release notes in this pass — a rule citing "no jmods needed" should name the specific vendor/version combination it was checked against, not assume universal availability.
- **`jpackage`'s Linux packaging maturity relative to Windows/macOS.** The tool's own spec treats all three platforms uniformly, but community reporting (not independently re-verified here) suggests Linux `.deb`/`.rpm` output has historically lagged the Windows/macOS paths in polish; flag as an area to re-check against the current JDK release's own `jpackage` changelog before treating Linux installer output as equally mature.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.gradle.org/current/userguide/application_plugin.html](https://docs.gradle.org/current/userguide/application_plugin.html) | Gradle official docs | Current (Gradle 9.x docs site) | Primary source for the application-plugin baseline: plugin id, task names, `mainClass`/`applicationDefaultJvmArgs`. |
| [docs.gradle.org/current/userguide/distribution_plugin.html](https://docs.gradle.org/current/userguide/distribution_plugin.html) | Gradle official docs | Current | Primary source for `distribution`/`distribution-base`, `distZip`/`distTar`/`assembleDist`/`installDist`. |
| [docs.spring.io/spring-boot/gradle-plugin/packaging.html](https://docs.spring.io/spring-boot/gradle-plugin/packaging.html) | Spring Boot official Gradle plugin docs | Current (Spring Boot 4.x doc set) | Primary source for the layered-jar layer names, order, and the "order is important" statement quoted verbatim. |
| [docs.spring.io/spring-boot/reference/packaging/efficient.html](https://docs.spring.io/spring-boot/reference/packaging/efficient.html) | Spring Boot official reference docs | Current | Primary source for the nested BOOT-INF layout, the `jarmode=tools extract` command, and the startup-cost/AOT-CDS discussion. |
| [openjdk.org/jeps/493](https://openjdk.org/jeps/493) | OpenJDK JEP (normative spec) | Targeted JDK 24 | Primary, normative source for jlink-without-JMODs: `--enable-linkable-runtime`, the ~25% size reduction, and every stated precondition/limitation. |
| [youtrack.jetbrains.com SUPPORT-A-2700](https://youtrack.jetbrains.com/articles/SUPPORT-A-2700/jlink-fails-with-the-automatic-module-cannot-be-used-with-jlink-error) | JetBrains support-knowledge-base article | Undated, current as of access | Brief-named primary source; article body is a client-rendered SPA that could not be scraped directly in this pass — cited for topic confirmation, substance corroborated via the tacosteemers walkthrough below. |
| [tacosteemers.com jlink automatic-module article](https://tacosteemers.com/articles/java_jlink_automatic_module_cannot_be_used_with_jlink.html) | Independent technical walkthrough | Undated | Supplies the exact `jlink` error text and the `jdeps --generate-module-info` workaround steps the YouTrack article's title describes but its content couldn't be fetched to confirm. |
| [docs.oracle.com jlink tool spec (JDK 25)](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jlink.html) | Oracle official tool reference | JDK 25 doc set | Primary source for `--module-path`/`--add-modules`/`--output` semantics and the modular-jar/JMOD/exploded-module module-path contract. |
| [docs.oracle.com jpackage tool spec (JDK 25)](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jpackage.html) | Oracle official tool reference | JDK 25 doc set | Primary source for per-OS output formats, the "no cross-platform support" statement, and the macOS signing flags. |
| [github.com/GoogleContainerTools/jib README](https://github.com/GoogleContainerTools/jib/blob/master/README.md) | Jib project's own repository | Current (`stable` badge) | Primary source: Jib's own description of building images with no Dockerfile and no Docker daemon. |
| [github.com/GoogleContainerTools/jib docs/faq.md](https://github.com/GoogleContainerTools/jib/blob/master/docs/faq.md) | Jib project's own repository | Current | Primary source for the exact layer split (other deps, snapshot deps, project deps, resources, classes, extra directories). |
| [jvm-audit/exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md) | This program's own wave-1 audit | Measured 2026-09-05/06 | The zero-counterexample measurement across 32 repos that resolves conflict 1; source of every "N/32" figure and the per-module noise caveats. |
| [jvm-topic-map.md, "Conflicts resolved" §1](../jvm-topic-map.md#conflicts-resolved) | This program's own adjudication | 2026-09-05 | The binding decision this file turns into a decision tree; cited throughout for the four-way resolution (library / application / plugin / CLI). |


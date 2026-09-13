---
title: "What a Maven, Gradle and Bazel consumer each see"
topic: publishing
agent: consumability-across-build-systems
model: sonnet
date_researched: 2026-09-12
sources_count: 15
scope: >
  Covers what a Maven, Gradle, and Bazel consumer each resolve when a library is
  published from Gradle (with or without Gradle Module Metadata, with or without
  a Shadow-published shaded variant), what Maven 4's consumer-POM flattening
  changes and does not change (still RC, not shipping mechanism), and whether the
  OCX SDK needs a Maven-consumability verification module. Does NOT cover the
  Central Portal upload/signing runbook (central-portal-and-provenance),
  Maven-side dependency mediation/enforcer rules (maven-mediation-and-enforcer),
  or the shading merge-correctness taxonomy itself (jvm-distribution.md) beyond
  what is needed to answer the POM-accuracy question DIST-13 handed over.
---

# What a Maven, Gradle and Bazel consumer each see

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Gradle Module Metadata is invisible to Maven, by design, with a literal marker](#1-gradle-module-metadata-is-invisible-to-maven-by-design-with-a-literal-marker)
   2. [What maven-publish actually writes into the POM, and what it never touches](#2-what-maven-publish-actually-writes-into-the-pom-and-what-it-never-touches)
   3. [Maven 4's consumer-POM flattening: opt-in, still RC, migration-preview only](#3-maven-4s-consumer-pom-flattening-opt-in-still-rc-migration-preview-only)
   4. [The java-platform / BOM triangle across three build systems](#4-the-java-platform--bom-triangle-across-three-build-systems)
   5. [How a Bazel consumer pins a Maven-published artifact, regardless of producer](#5-how-a-bazel-consumer-pins-a-maven-published-artifact-regardless-of-producer)
   6. [DIST-13 resolved: Shadow's POM-accuracy mechanism has existed since 2014 — the GMM shadow variant is what's new in 9.0.0](#6-dist-13-resolved-shadows-pom-accuracy-mechanism-has-existed-since-2014--the-gmm-shadow-variant-is-whats-new-in-900)
   7. [kafka's hand-rolled pom.withXml, read correctly](#7-kafkas-hand-rolled-pomwithxml-read-correctly)
   8. [The Maven-consumability verification module is the corpus's real "dual build system" pattern](#8-the-maven-consumability-verification-module-is-the-corpuss-real-dual-build-system-pattern)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A Maven consumer never reads a module's `.module` (Gradle Module Metadata) file — it is invisible by design, and the POM instead carries a literal `<!-- do_not_remove: published-with-gradle-metadata -->` marker comment that Gradle reads and Maven ignores ([Gradle docs](https://docs.gradle.org/current/userguide/publishing_gradle_module_metadata.html); confirmed verbatim as a test assertion at `junit-team__junit-framework@35c56a8e02:platform-tooling-support-tests/src/test/java/platform/tooling/support/tests/MavenPomFileTests.java:69-77`).
- Any Gradle-only variant — a feature variant, a KMP target, an optional `shadowRuntimeElements` variant — does not exist for a Maven or Bazel-via-Coursier consumer. If it matters to non-Gradle consumers it must ship as a **classified artifact** (a second `<dependency classifier="...">`-addressable jar) or a **separate publication**, never left as a GMM-only variant.
- Maven 4.0.0 is still `4.0.0-rc-6` on Central as of 2026-09-12 (confirms `MVN-DEP-11`, `jvm-dependencies.md`). Consumer-POM flattening (`maven.consumer.pom.flatten=true`) and `<packaging>bom</packaging>` are Maven-4-only, opt-in, and unadopted in the corpus (0/32). Treat both as a dated migration-preview row, never as shipping mechanism to recommend today.
- Maven 4's build-POM/consumer-POM split is a naming clarification, not a new capability: Maven 3 already stripped parent references, resolved properties, and filtered `<dependencyManagement>` into concrete versions for the deployed POM via `flatten-maven-plugin`; Maven 4 makes that behavior a first-class, opt-in core feature (`maven.consumer.pom.flatten`) instead of a third-party plugin.
- `java-platform` (Gradle) publishes a BOM whose Maven-side shape is identical to a Maven `<packaging>pom</packaging>` module with `<dependencyManagement>` — a Maven consumer imports it with `<scope>import</scope>` exactly as it would a Maven-authored BOM; the difference (Gradle's `api`/`runtime` split) collapses on export, since Maven has one dependencyManagement, not two.
- A Bazel consumer resolves a Maven-published artifact through Coursier against the plain Maven-repository layout (POM + jar + checksums) — GMM is never fetched, never interpreted, and irrelevant to Bazel resolution; `maven_install.json` (produced by `bazel run @maven//:pin`) is the sole source of truth after pinning, and re-running `MODULE.bazel`/`maven.install()` changes without repinning is silently ignored ([rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md)).
- **DIST-13 is resolved.** Shadow's mechanism for putting the correct non-bundled runtime dependencies into the published POM (the `shadow` configuration → `RUNTIME`-scope POM entries) has existed since **Shadow 1.1.0 (2014-08-26)** — it is not new in 9.x and was never broken. What Shadow 9.0.0 (2025-08-07) actually added is the **`shadowRuntimeElements` optional GMM variant** on the `java` component (`addShadowVariantIntoJavaComponent`, on by default; opt-out landed in 9.1.0), which is a Gradle-only artifact-selection mechanism, invisible to Maven exactly per Finding 1.
- kafka's 20-line hand-rolled `pom.withXml` (`apache__kafka@940c100fab:build.gradle:410-420`) is **not** working around a Shadow defect — it is deliberately avoiding Shadow's built-in `shadow` configuration because that configuration *also* writes the same dependencies into the shaded jar's `META-INF/MANIFEST.MF` `Class-Path` header ([GradleUp/shadow#324](https://github.com/GradleUp/shadow/issues/324), open 2017–2025), which kafka does not want. kafka gets the POM-only half by naming its own configuration (`shadowed`, not `shadow`) and copying the mechanism by hand.
- The corollary rule for anyone who does not have kafka's Class-Path objection: **use the built-in `shadow` configuration** (`shadow("group:artifact:version")` for a dependency excluded from the merged jar) and Shadow writes the correct `<dependencies>` automatically — no `pom.withXml` needed, on any Shadow version since 1.1.0.
- A Maven consumer resolving `components.shadow`'s primary POM sees a flat, ordinary `<dependencies>` list with no scope information about what got merged versus what stayed external — it cannot tell "shaded" from "always was a plain dependency" from the POM alone; only the (Gradle-only, Maven-invisible) `org.gradle.dependency.bundling = shadowed` GMM attribute records that distinction.
- `tasks.withType(GenerateModuleMetadata) { enabled = false }` is set for kafka's `:clients` project (`apache__kafka@940c100fab:build.gradle:2068-2070`) — kafka's own precedent for a shaded-under-primary-coordinates library is to **suppress GMM entirely** for that module, sidestepping the whole "what does a Maven consumer see through GMM" question by never publishing GMM for it.
- **DECIDE (a): the OCX SDK should suppress GMM only if it ever ships a case-(c) library module that shades under primary coordinates (the DIST-02 carve-out); otherwise it should keep GMM on.** GMM costs a Maven consumer nothing (it is ignored) and gives Gradle consumers variant-aware resolution (test-fixtures, sources, feature variants) for free; suppressing it is a deliberate, narrow response to a specific shading ambiguity, not a general Maven-friendliness measure.
- **DECIDE (b): yes, ship a `maven-consumability` verification module**, following the corpus's own convention — a small module (Maven `pom.xml` + one smoke test) that depends on the just-published (or `mavenLocal()`-published) SDK coordinates and asserts the POM resolves and the runtime classpath is complete. This is the corpus's real "dual build system" pattern (0/10 Gradle-tagged repos with an actual dual production build system) — it exists in `square__okhttp@dfcfab3824:maven-tests/`, `google__dagger@4fbc045d2b:examples/maven/`, `grpc__grpc-java`, `JetBrains__Exposed`, and `junit-team__junit-framework@35c56a8e02:platform-tooling-support-tests/`.
- **DECIDE (c):** the SDK's published POM must declare, beyond what `maven-publish` generates by default from `components.java`: `name`, `description`, `url`, at least one `<license>`, at least one `<developer>`, and `<scm>` (Central rejects upload without all of these — `GRADLE-PUB` M-H-03, `jvm-topic-map.md`); none of these are inferred from Gradle project metadata, all must be written explicitly inside `publishing { publications { ... pom { ... } } }`.
- A repo carrying both a `build.gradle*` and a `pom.xml` is a false-positive "dual build system" signal 10/10 times in this corpus — read the directory name (`maven-tests/`, `examples/maven/`, `tooling-support-tests/`) before concluding a project builds with two systems (frame correction, `jvm-topic-map.md` §"Failure modes").
- `google/error-prone` is the corpus's one Maven-consumed-only, Bazel-built-nothing example running the opposite direction from the brief's premise — a reminder that "consumable in Bazel" and "built by Bazel" are unrelated facts; error-prone is Maven-built and only *consumed* under Bazel via a plain Maven-repository coordinate, no `MODULE.bazel` of its own.

## Findings

### 1. Gradle Module Metadata is invisible to Maven, by design, with a literal marker

Gradle publishes GMM (a `.module` JSON sidecar) *alongside* the POM whenever `maven-publish` is used, never instead of it: "Gradle Module Metadata is automatically published on Maven or Ivy repositories. However, it doesn't replace the pom.xml or ivy.xml files: it is published alongside those files." ([Gradle docs, publishing_gradle_module_metadata.html](https://docs.gradle.org/current/userguide/publishing_gradle_module_metadata.html)). Maven tooling never fetches or parses the `.module` file; the POM instead carries a marker comment that exists purely so Gradle can skip a network round-trip when GMM is absent — the doc calls this marker "for Gradle users only."

This is not paraphrase: `junit-team__junit-framework@35c56a8e02` ships a snapshot-style test that asserts the exact marker text appears in the generated `junit-jupiter` aggregator POM:

```java
// platform-tooling-support-tests/src/test/java/platform/tooling/support/tests/MavenPomFileTests.java:69-77
@Test
void jupiterAggregatorGradleMetadataMarker() throws Exception {
    var expected = List.of(">> HEAD >>",
        "  <!-- do_not_remove: published-with-gradle-metadata -->",
        ">> TAIL >>");
    assertLinesMatch(expected, Files.readAllLines(MavenRepo.pom("junit-jupiter")));
}
```

Consequence: any dependency information that lives *only* in GMM — a feature variant (`optional-feature`), a Kotlin Multiplatform target, or an "optional variant of the java component" such as Shadow's `shadowRuntimeElements` (Finding 6) — is completely absent to a Maven `<dependency>` declaration and to a Bazel/Coursier resolution walking the same repository layout. Gradle's own docs describe non-GMM-aware consumption as "degraded mode": the consumer falls back to whatever the POM alone encodes.

### 2. What maven-publish actually writes into the POM, and what it never touches

`MavenPublication.from(component)` derives the POM's identity (`groupId`/`artifactId`/`version` default from `project.group`/`project.name`/`project.version`) and its `<dependencies>` from the component's variants. Two customization points exist: the structured `pom { }` DSL (licenses, developers, scm, custom `<properties>`) and the low-level `pom.withXml { }` escape hatch for anything the DSL cannot express ([Gradle docs, publishing_maven.html](https://docs.gradle.org/current/userguide/publishing_maven.html)).

What it does **not** do: none of `name`, `description`, `url`, `licenses`, `developers`, `scm` is populated from any Gradle project property by default — every one of them is silence unless written explicitly inside `pom { }`. This is exactly the `GRADLE-PUB` M-H-03 gap (`jvm-topic-map.md`), reused here because it is what DECIDE (c) below hinges on.

```kotlin
// correct — every Central-required field present
publishing {
    publications {
        create<MavenPublication>("mavenJava") {
            from(components["java"])
            pom {
                name = "ocx-sdk"
                description = "Typed handles over the ocx CLI"
                url = "https://github.com/<org>/ocx-sdk-jvm"
                licenses { license { name = "Apache-2.0"; url = "https://www.apache.org/licenses/LICENSE-2.0.txt" } }
                developers { developer { id = "ocx"; name = "OCX maintainers" } }
                scm {
                    connection = "scm:git:https://github.com/<org>/ocx-sdk-jvm.git"
                    developerConnection = "scm:git:git@github.com:<org>/ocx-sdk-jvm.git"
                    url = "https://github.com/<org>/ocx-sdk-jvm"
                }
            }
        }
    }
}
```

```kotlin
// incorrect — builds, publishes, and is then rejected at the Portal or silently
// leaves consumers with no license/URL metadata; from(components["java"]) alone
// generates <groupId>/<artifactId>/<version>/<dependencies> and nothing else
publishing {
    publications {
        create<MavenPublication>("mavenJava") {
            from(components["java"])
        }
    }
}
```

### 3. Maven 4's consumer-POM flattening: opt-in, still RC, migration-preview only

Maven 4 formalizes a distinction that Maven 3 users already approximated with the third-party `flatten-maven-plugin`: the **build POM** (`pom.xml`, checked into source control — parent references, plugin config, properties, profiles) versus the **consumer POM** (what gets deployed — parent references resolved away, properties substituted, `<dependencyManagement>`-derived versions written concrete, only compile/runtime-scope dependencies retained) ([Maven docs, whatsnewinmaven4.html](https://maven.apache.org/whatsnewinmaven4.html)).

The mechanism is explicitly opt-in and off by default: "The flatten feature is disabled by default to avoid unexpected behavior... To publish a flattened consumer POM instead of the full build POM, the user property `maven.consumer.pom.flatten` must be set to `true`." Model version 4.1.0+ also introduces a dedicated `<packaging>bom</packaging>` type distinct from the traditional `<packaging>pom</packaging>` parent/aggregator use, so tooling can tell "this is a BOM" from "this is a reactor parent" without inspecting contents.

As of 2026-09-12, Maven Central's index gives `maven-core` 3.9.16 as the stable release and `4.0.0-rc-6` as the top of the 4.0 line — no plain `4.0.0` exists (confirms `MVN-DEP-11`, `jvm-dependencies.md`, and frame correction 29 in `jvm-frame.md`). Corollary: `maven.consumer.pom.flatten=true` and `<packaging>bom</packaging>` are **migration-preview rows carrying this date and a re-check command** (`curl -s "https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json"`), never something the SDK's release runbook should depend on today.

### 4. The java-platform / BOM triangle across three build systems

| Build system | How a BOM is authored | What a consumer writes | What travels on the wire |
|---|---|---|---|
| Gradle | `java-platform` plugin; `constraints { api("g:a:v") }` | `implementation(platform("g:bom:v"))` — constraints are non-forcing recommendations | Published as GMM **and** a Maven POM whose `<dependencyManagement><dependencies>` mirror the constraints ([Gradle docs, java_platform_plugin.html](https://docs.gradle.org/current/userguide/java_platform_plugin.html)) |
| Maven | `<packaging>pom</packaging>` (Maven ≤3 / early 4) or `<packaging>bom</packaging>` (Maven ≥4.1.0, RC) with `<dependencyManagement>` | `<dependencyManagement><dependencies><dependency>…<scope>import</scope></dependency>` | A plain POM; identical wire shape to a Gradle-exported platform's POM |
| Bazel (`rules_jvm_external`) | N/A — Bazel does not author BOMs | `maven.install(boms = ["group:bom-artifact:version"], artifacts = [...])` | Coursier resolves the BOM's `<dependencyManagement>` the same as any Maven client, letting a bare `artifacts` entry omit its version ([rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md#support-for-maven-bom-files)) |

A Gradle `java-platform`'s only feature Maven cannot represent is scoping constraints separately for `api` versus `runtime` — on export both collapse into one `<dependencyManagement>`, so this loss is silent and one-directional (Gradle→Maven only; nothing is lost going the other way, since Maven never had the distinction).

7/32 corpus repos publish a `java-platform` (measured in `jvm-audit/exemplar-publishing-ci-bazel.md`, cited at M-H-07); 0/32 declare `<packaging>bom</packaging>` (Finding 3) — the BOM-authoring convention in this era is overwhelmingly Gradle-side even for libraries that also want Maven consumers, because a Gradle-exported BOM's POM is a fully valid, ordinary Maven BOM on the wire.

### 5. How a Bazel consumer pins a Maven-published artifact, regardless of producer

`rules_jvm_external`'s `maven.install()` (bzlmod) resolves `artifacts` through Coursier against ordinary Maven-repository HTTP endpoints — GET the POM, GET the jar, GET the checksums. Nothing about this path is aware of GMM, of who built the artifact, or of Gradle's variant model; a Gradle-published, a Maven-published, and a hand-rolled `mvn deploy:deploy-file` artifact are indistinguishable to Coursier as long as the POM is valid.

```
bazel run @unpinned_maven//:pin
```
regenerates `maven_install.json`, and from that point the lock file — not `MODULE.bazel`'s `maven.install()` block — is the resolution source of truth: "Without re-pinning, `maven_install` will not pick up the changes made to `MODULE.bazel`" ([rules_jvm_external README §Updating maven_install.json](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md#updating-maven_installjson)). `version_conflict_policy = "pinned"` additionally forces every version explicitly listed in `artifacts` to win over a higher transitively-resolved version, mirroring what a Maven `<dependencyManagement>` or a Gradle `resolutionStrategy.force` would do.

For the producing side (should the OCX Gradle plugin or its Bazel-side test fixtures ever need to publish from Bazel): `java_export` (or `kt_jvm_export` for Kotlin) is the rule that generates a `pom.xml` plus `*.publish` targets from an ordinary `java_library`-shaped target — but this is out of scope for a consumer question and is not how the OCX SDK itself should publish (it is Gradle-built).

### 6. DIST-13 resolved: Shadow's POM-accuracy mechanism has existed since 2014 — the GMM shadow variant is what's new in 9.0.0

DIST-13's handed-over question was: *does `components.shadow` on Shadow ≥ 9.0.0 produce a POM whose `<dependencies>` correctly equal the non-bundled runtime set without hand-patching, and from which version; and what does a Maven consumer see through GMM for a shadowJar variant?*

Fetching Shadow's own current publishing docs and full changelog answers both halves precisely, and revises the premise:

**The POM-accuracy mechanism is not new in 9.x.** Shadow has always supported a special `shadow` configuration whose members become `RUNTIME`-scoped POM `<dependencies>` automatically, with no `pom.withXml` required — documented today at [gradleup.com/shadow/publishing](https://gradleup.com/shadow/publishing/) ("dependencies in the `shadow` configuration... are translated to become `RUNTIME` scoped dependencies of the published artifact") and traceable in the changelog to **Shadow 1.1.0, 2014-08-26**: "Properly configure integration with the `'maven'` plugin... adding the `'shadow'` configuration as a `RUNTIME` scope in the POM." Any dependency *excluded* from the shaded jar through any other mechanism (a custom `configurations` list on `shadowJar`, an ad-hoc `exclude(dependency(...))`) is explicitly **not** auto-added: "No other dependencies are automatically configured for inclusion in the POM file... publishing **must** be manually configured."

```kotlin
// correct — Shadow 1.1.0 onward, no pom.withXml needed
dependencies {
    implementation("com.squareup.retrofit2:retrofit:2.11.0")       // bundled, absent from POM
    shadow("com.squareup.retrofit2:converter-java8:2.11.0")        // excluded from jar,
                                                                     // auto-added to POM as RUNTIME
}
publishing {
    publications {
        create<MavenPublication>("shadow") { from(components["shadow"]) }
    }
}
```

```kotlin
// incorrect — a home-grown exclusion configuration gets nothing for free;
// this is the shape that forces a hand-rolled pom.withXml
val vendored by configurations.creating
dependencies { vendored("com.squareup.retrofit2:converter-java8:2.11.0") }
tasks.shadowJar { dependencies { exclude(dependency(vendored.allDependencies)) } }
// <dependencies> in the published POM stays empty for this artifact — silent gap
```

**What is genuinely new in 9.0.0 (2025-08-07)** is the `shadowRuntimeElements` **optional GMM variant** added to the `java` component — a second, GMM-only artifact selection representing the shaded jar, distinguished from the plain jar variant by `org.gradle.dependency.bundling = shadowed` (or `Bundling.EMBEDDED` if reconfigured). It is on by default and was made opt-out-able one release later, 9.1.0 (2025-08-29), via `shadow { addShadowVariantIntoJavaComponent = false }`. Per Finding 1, this variant is **pure GMM** — a Maven consumer, and a Bazel/Coursier consumer, never see it; they resolve whichever artifact the primary POM's `<dependencies>`/coordinates point at, full stop. A Gradle consumer, by contrast, can select the shaded jar automatically by requesting the `shadowed` bundling attribute.

### 7. kafka's hand-rolled pom.withXml, read correctly

`apache__kafka@940c100fab:build.gradle:401-420` is frequently read (as the audits and wave-2 consolidation did, per frame correction 27/`jvm-distribution.md` verdict 7) as evidence that "Gradle doesn't sidestep Maven's dependency-reduced-POM problem." That conclusion survives, but *why* kafka hand-rolls it is more specific than "Shadow doesn't do this automatically" — Shadow does, via the built-in `shadow` configuration (Finding 6). kafka instead defines its own, differently-named `shadowed` configuration:

```groovy
// apache__kafka@940c100fab:build.gradle:2011-2039 (project(':clients'))
configurations {
  generator
  shadowed
}
dependencies {
  implementation libs.zstd
  implementation libs.lz4
  implementation libs.snappy
  implementation libs.slf4jApi
  // libraries which should be added as runtime dependencies in generated pom.xml should be defined here:
  shadowed libs.zstd
  shadowed libs.lz4
  shadowed libs.snappy
  shadowed libs.slf4jApi
}

// :2089-2100
shadowJar {
  archiveClassifier = null
  relocate('io.opentelemetry.proto', 'org.apache.kafka.shaded.io.opentelemetry.proto')
  // ...
  dependencies {
    project.configurations.shadowed.allDependencies.each { exclude(dependency(it)) }
  }
}

// :2068-2070 — GMM suppressed outright for this shaded module
tasks.withType(GenerateModuleMetadata) { enabled = false }

// :410-420 — the hand-rolled POM patch
// Fix for avoiding inclusion of runtime dependencies marked as 'shadow' in MANIFEST Class-Path.
// https://github.com/GradleUp/shadow/issues/324
pom.withXml { xml ->
  def dependenciesNode = xml.asNode().get('dependencies') ?: xml.asNode().appendNode('dependencies')
  project.configurations.shadowed.allDependencies.each {
    def dependencyNode = dependenciesNode.appendNode('dependency')
    dependencyNode.appendNode('groupId', it.group)
    dependencyNode.appendNode('artifactId', it.name)
    dependencyNode.appendNode('version', it.version)
    dependencyNode.appendNode('scope', 'runtime')
  }
}
```

The reason `shadowed` exists instead of Shadow's own `shadow` configuration: using `shadow` also writes the same coordinates into the shaded jar's `META-INF/MANIFEST.MF` `Class-Path` header, per the current docs ("This will be excluded from the shadowed JAR but declared as a runtime dependency in `META-INF/MANIFEST.MF` file's `Class-Path` entry, **and also** in the POM file"). kafka's inline comment cites [GradleUp/shadow#324](https://github.com/GradleUp/shadow/issues/324) — filed 2017-09-06 as "Shadowed JARs should not be added to JAR manifest Class-Path header," open for almost eight years, closed 2025-01-24 — meaning kafka deliberately opted out of the coupled Class-Path behavior by not using the reserved configuration name, and re-implemented only the POM half by hand. Two more facts complete the picture, previously unrecorded: kafka also disables `GenerateModuleMetadata` outright for `:clients` (line 2068-2070), so the GMM-shadow-variant question (Finding 6, second half) never arises for kafka's own shaded artifact — kafka ships no GMM there at all.

### 8. The Maven-consumability verification module is the corpus's real "dual build system" pattern

The topic map's own test ("0 of the 10 Gradle-tagged repos carrying a `pom.xml` build with both systems") holds under direct re-check: every incidental `pom.xml` sitting inside a Gradle repo is a small, deliberately separate consumability probe, never a second production build:

| Exemplar | Path | What it proves |
|---|---|---|
| `square__okhttp@dfcfab3824` | `maven-tests/pom.xml` | A Maven module importing `okhttp-bom` and declaring `okhttp-jvm`, `mockwebserver3`, `logging-interceptor` with no explicit versions — the BOM must resolve them (Finding 4's Gradle→Maven BOM path, exercised end to end) |
| `google__dagger@4fbc045d2b` | `examples/maven/coffee/pom.xml` | A worked example, not a test harness, but the same shape: a plain Maven consumer of dagger's Central coordinates |
| `grpc__grpc-java@fc4314419d` | `examples/maven-assembly-jar-with-dependencies.xml` | Maven-Assembly descriptor for one example module, not a repo-wide Maven build |
| `junit-team__junit-framework@35c56a8e02` | `platform-tooling-support-tests/src/test/java/platform/tooling/support/tests/MavenPomFileTests.java`, `MavenStarterTests.java`, `MavenSurefireCompatibilityTests.java` | The most rigorous version of the pattern: JUnit-run tests that shell out to a real `mvn` invocation against the just-built local repo and snapshot-assert the resolved POM/output, including Finding 1's exact GMM marker text |

This is the shape the OCX SDK should copy for DECIDE (b): a `maven-consumability/` (or `maven-tests/`) module with its own minimal `pom.xml` declaring the SDK's coordinates against a `mavenLocal()`/staged repository, plus one test that resolves and runs a trivial smoke check — not a parallel Maven build of the SDK itself, and not a second CI matrix leg beyond "run this one module's `mvn test` after `./gradlew publishToMavenLocal`."

## Normative guidance candidates

1. **State every module's consumption classification (program / host-loaded plugin / API dependency) before adding a publishing block**, and if it is a case-(c) library, never let it acquire a `shadowJar` publication under its own primary coordinates without the DIST-02 carve-out being true and stated. *Rationale:* the shape drives whether GMM-only variants and shading are even legitimate options. *Verify:* reuse `GRADLE-DIST-01`'s reading check — no new command.
2. **Every published POM must declare `name`, `description`, `url`, `licenses`, `developers`, `scm` inside an explicit `pom { }` block** — never rely on `from(components["java"])` alone. *Rationale:* Central rejects an upload missing any of these; none is Gradle-project-property-derived. *Verify:* `grep -A20 "MavenPublication" **/*.gradle.kts | grep -c "licenses\|developers\|scm"` inside the publishing block must be ≥ 3, or inspect the actually-generated POM under `build/publications/*/pom-default.xml` for all six elements.
3. **Never propose `maven.consumer.pom.flatten` or `<packaging>bom</packaging>` as shipping mechanism.** Both require Maven 4.0.0 GA, which does not exist as of 2026-09-12 (`4.0.0-rc-6` is the ceiling). *Rationale:* an RC feature in a release runbook silently breaks when the RC changes shape before GA. *Verify:* `curl -s "https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=3&wt=json"` — a hit with `v` matching `4\.0\.0$` (no suffix) is the only signal that changes this rule.
4. **If a library needs to expose a `shadowRuntimeElements`/feature/KMP-target variant to non-Gradle consumers, republish it as a classified artifact, never leave it GMM-only.** *Rationale:* Maven and Bazel/Coursier consumers cannot select a GMM variant; it is invisible to them by construction (Finding 1). *Verify:* for every `create<MavenPublication>` whose `from(...)` is a component with more than one variant, confirm a matching `artifact(...)` with an explicit `classifier` exists, or that non-Gradle consumption is explicitly out of scope for that artifact.
5. **To exclude a runtime dependency from a shaded jar while keeping it correctly declared in the published POM, add it to Shadow's built-in `shadow` configuration — do not hand-roll `pom.withXml`.** *Rationale:* the `shadow` configuration → `RUNTIME`-scope POM mapping has existed since Shadow 1.1.0 (2014); a hand-rolled loop duplicates a decade-old built-in and is a maintenance liability. *Verify:* `grep -n "pom.withXml" **/build.gradle.kts **/build.gradle` — any hit whose body appends `<dependency>` nodes for dependencies also present in a Shadow-adjacent exclude list is a candidate for deletion in favor of the `shadow(...)` configuration, **unless** the module also needs to avoid the paired manifest `Class-Path` write (kafka's documented reason — verify by checking whether `META-INF/MANIFEST.MF` `Class-Path` entries are undesired for that artifact).
6. **A CLI/plugin module using `components.shadow` under `com.gradleup.shadow` ≥ 9.0.0 should leave `addShadowVariantIntoJavaComponent` at its default (`true`) unless a documented reason requires disabling it**, since disabling it removes a real capability (Gradle consumers picking the shaded jar via bundling attribute) for zero Maven/Bazel benefit (they never saw it anyway). *Rationale:* the flag exists to solve build-graph/configuration-timing edge cases (`shadow#1662`), not a general recommendation to suppress. *Verify:* `grep -n "addShadowVariantIntoJavaComponent" **/*.gradle.kts` — a `= false` without an adjoining comment naming the specific conflict is a defect to question.
7. **When a module shades under its own primary coordinates (the DIST-02 carve-out), decide GMM suppression per-module, not repo-wide** — kafka's `tasks.withType(GenerateModuleMetadata) { enabled = false }` scoped to `:clients` alone is the template. *Rationale:* suppressing GMM elsewhere in the same build discards free variant-aware resolution (test fixtures, platform BOM) for consumers who gain nothing from the suppression. *Verify:* if `GenerateModuleMetadata` is disabled, confirm the disabling block's scope (a single `project(...)` or `tasks.withType` inside `afterEvaluate` on one subproject) rather than a build-wide `tasks.withType(GenerateModuleMetadata).configureEach { enabled = false }`.
8. **Ship a `maven-consumability` module for the OCX SDK** — a minimal `pom.xml` (or `maven-tests/` directory) that declares the SDK's just-published/`mavenLocal()` coordinates and one smoke test resolving the runtime classpath, run as a distinct CI/release step, never as a second production build system. *Rationale:* this is the corpus's actual, load-bearing pattern (dagger, grpc-java, okhttp, Exposed, junit-framework all ship it) for proving cross-build-system consumability without doubling the build surface. *Verify:* the module's `pom.xml` has no `<parent>` pointing at the Gradle-built reactor, and its one test fails loudly (non-zero exit) if the coordinate does not resolve or a declared class is missing from the classpath.
9. **A repo carrying both a `build.gradle*` and a `pom.xml` is not evidence of a dual build system — read the directory name and the POM's own `<packaging>`/dependency list before concluding anything.** *Rationale:* 10/10 such repos in the corpus are a consumability probe or example, 0/10 are a parallel production build. *Verify (reading heuristic, no command)*: does the enclosing directory read as `*-tests/`, `examples/*`, or `*tooling-support*`? If yes, it is Finding 8's pattern, not a second build.
10. **Never publish a `java-platform`/BOM whose `<dependencyManagement>` a Maven consumer must merge across an `api`/`runtime` split that does not exist on their side** — collapse to one dependencyManagement block intentionally and document which scope wins if the two Gradle-side lists ever disagree. *Rationale:* Finding 4's asymmetry is silent; a divergence is invisible until a Maven consumer gets a different resolved version than a Gradle consumer of the identical published coordinate. *Verify:* diff the `api`- and `runtime`-configuration constraint sets in the `java-platform` module's `constraints { }` block; any dependency present in one but not the other is a candidate for an explicit comment, not a silent Gradle-only distinction.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 (classify before publishing) | `apache__kafka@940c100fab:build.gradle:2011` — `shouldPublishWithShadow` branch makes the classification an explicit boolean, read at :401 | No exemplar states the classification in prose; it is inferred from code shape everywhere, including kafka |
| 2 (complete POM metadata) | Measured at M-H-03 (`jvm-topic-map.md`): licenses/developers/scm travel together 15-17/32; `url` lags at 8/32 — a real, common gap |
| 3 (no Maven-4-flatten mechanism) | 0/32 use `maven.consumer.pom.flatten` or `<packaging>bom</packaging>` (`jvm-dependencies.md` MVN-DEP-11) — the rule flags nothing today, which is the correct state |
| 4 (classify GMM-only variants for republication) | `GradleUp__shadow@541b3be475` itself ships no example of a downstream consumer needing the shadow variant reclassified — this is a forward-looking rule for the OCX SDK, not corpus-backed today |
| 5 (use `shadow` config, not `pom.withXml`) | Violated by `apache__kafka@940c100fab:build.gradle:410-420` deliberately, for a stated and legitimate reason (Class-Path avoidance) — the rule's verification clause exists exactly to not flag kafka incorrectly |
| 6 (don't disable the GMM shadow variant without reason) | `apache__kafka@940c100fab` disables GMM *entirely* for `:clients` rather than disabling only the shadow variant — a stronger, differently-scoped action than this rule targets; no exemplar disables only `addShadowVariantIntoJavaComponent` |
| 7 (scope GMM suppression per-module) | `apache__kafka@940c100fab:build.gradle:2068-2070` — `tasks.withType(GenerateModuleMetadata) { enabled = false }` sits inside `project(':clients') { ... }`, correctly scoped to one subproject, not build-wide |
| 8 (ship a maven-consumability module) | `square__okhttp@dfcfab3824:maven-tests/pom.xml`; `google__dagger@4fbc045d2b:examples/maven/coffee/pom.xml`; `junit-team__junit-framework@35c56a8e02:platform-tooling-support-tests/src/test/java/platform/tooling/support/tests/MavenPomFileTests.java` (all satisfy) |
| 9 (dual-pom is a false positive) | Confirmed for all of okhttp, dagger, grpc-java, Exposed, junit-framework — 5/5 checked directly |
| 10 (BOM api/runtime collapse) | 7/32 publish `java-platform` (M-H-07); none audited for an api/runtime divergence specifically — this is a forward-looking check, not yet corpus-tested |

## AI-agent angle

- **Trained-era assumption: "Gradle Module Metadata replaces the POM."** Wrong since GMM's introduction (Gradle 5, 2018) — it is always additive, never a replacement, and an agent asked to "modernize" a `maven-publish` block by removing POM customization on the theory that GMM now carries the metadata will silently break every Maven and Bazel consumer. **Check:** after any publishing-block edit, `unzip -p build/libs/*.jar META-INF/MANIFEST.MF` is irrelevant — instead read the generated `build/publications/*/pom-default.xml` directly and confirm it alone (no `.module` file) contains every dependency a consumer needs.
- **Hallucinated fix: reaching for `pom.withXml` on sight of "the POM is missing a dependency" from a shaded module.** An agent trained on kafka-shaped examples (or on Stack Overflow answers from Shadow's pre-1.1.0 era) will reproduce the hand-rolled loop even when the built-in `shadow` configuration would do it with zero code (Finding 6). **Check:** before writing `pom.withXml`, `grep -n "^\s*shadow(" build.gradle.kts` — if the dependency in question isn't already there, add it there first and delete the `pom.withXml` block; only keep hand-rolling if there's a stated Class-Path objection.
- **Stale citation risk: treating GradleUp/shadow#324 as still-open or as describing a POM defect.** The issue title is about the JAR manifest `Class-Path` header, not the POM; a model pattern-matching on "shadow#324" + "pom" from kafka's comment can misattribute the issue's scope. **Check:** `gh api repos/GradleUp/shadow/issues/324 --jq .title,.state` before citing it — confirm the title mentions "Class-Path," not "POM dependencies."
- **Outdated idiom: recommending Maven 4's consumer-POM flattening or `bom` packaging as available today.** A model with a mid-2025-or-later training cut may have seen "Maven 4" discussed as imminent and round it up to shipped. **Check:** query Central (`curl -s "https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=3&wt=json"`) — never the Maven website's own version banner, which (per `jvm-topic-map.md` correction 38 on Surefire) is known to run ahead of what Central actually serves.
- **Missight: assuming a repo with both `build.gradle*` and `pom.xml` builds twice.** An agent asked to "add CI for the Maven build too" on a repo that actually has an `okhttp`-style `maven-tests/` probe will invent an unnecessary, parallel release pipeline. **Check:** `find . -maxdepth 3 -iname pom.xml | xargs -r dirname` — if every hit's path contains `test`, `example`, or `tooling-support`, there is no second production build to wire up.
- **Confusing Gradle's `java-platform` BOM with Maven's `<packaging>bom</packaging>`.** A model may assert these are "the same feature, different names," missing that Maven's `bom` packaging is Maven-4-RC-only and unshipped, while `java-platform` is Gradle-9-stable and exports a Maven-3-compatible plain-POM BOM regardless. **Check:** confirm which build system is actually authoring the BOM before citing either page; `java-platform` needs no Maven-4 dependency at all.

## Contested / evolving

- **Whether `addShadowVariantIntoJavaComponent` should default to `true` long-term.** Shadow's own changelog frames the 9.1.0 opt-out as a response to `afterEvaluate`-timing configuration issues (`#1662`), not a signal the default is wrong; as of 9.6.1 (2026-07-22, the changelog's newest tagged release) the default remains `true`. Trending: stable, revisit only if a future Shadow major changes the default.
- **Whether Maven 4's consumer-POM flattening becomes a MUST once GA.** The mechanism is sound and solves a real problem (Maven 3's deployed POM still contains build-only content unless `flatten-maven-plugin` is bolted on) — but GA timing is unknown; `4.0.0-rc-6` has held since at least wave-2's 2026-09-12 measurement with no announced GA date found in either `whatsnewinmaven4.html` or Central's index during this dive. Trending: toward eventual GA and adoption, but not imminently — no date to commit to.
- **Whether kafka's Class-Path-avoidance reason for hand-rolling `pom.withXml` still applies once GradleUp/shadow#324 is fully closed (2025-01-24).** The issue is closed, but this dive did not read its resolution comments in full to determine whether the underlying manifest-writing behavior actually changed for the `shadow` configuration, or whether it was closed as "working as intended, use a different configuration name" (which the current docs, still describing the coupled behavior, suggest is the real outcome). Treat kafka's pattern as still-necessary-if-you-share-its-constraint until someone reads shadow#324's full comment thread.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.gradle.org/current/userguide/publishing_gradle_module_metadata.html](https://docs.gradle.org/current/userguide/publishing_gradle_module_metadata.html) | Gradle official docs, GMM | Gradle 9.x current | Primary source for Finding 1 — the marker-comment mechanism and "degraded mode" language |
| [docs.gradle.org/current/userguide/publishing_maven.html](https://docs.gradle.org/current/userguide/publishing_maven.html) | Gradle official docs, `maven-publish` | Gradle 9.x current | Primary source for Finding 2 — POM generation, `pom{}` DSL, `withXml` |
| [docs.gradle.org/current/userguide/java_platform_plugin.html](https://docs.gradle.org/current/userguide/java_platform_plugin.html) | Gradle official docs, `java-platform` | Gradle 9.x current | Primary source for Finding 4's Gradle-side BOM mechanics |
| [maven.apache.org/pom.html](https://maven.apache.org/pom.html) | Apache Maven official POM reference | current (Maven 3/4-agnostic) | Consumer-facing metadata requirements — `name`/`description`/`url`/`licenses`/`developers`/`scm` |
| [maven.apache.org/whatsnewinmaven4.html](https://maven.apache.org/whatsnewinmaven4.html) | Apache Maven official, Maven 4 migration guide | Maven 4.0.0-rc line, actively updated | Primary source for Finding 3 — build POM vs consumer POM, `maven.consumer.pom.flatten`, `bom` packaging, explicitly "updated at least until 4.0.0 is released" (i.e. not yet GA) |
| [github.com/bazel-contrib/rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | Official `rules_jvm_external` repository README | fetched 2026-09-12, master branch | Primary source for Finding 5 (`maven_install.json`, `version_conflict_policy`) and Finding 4's Bazel row (`boms`); also `java_export`/`kt_jvm_export` |
| [gradleup.com/shadow/publishing/](https://gradleup.com/shadow/publishing/) | Shadow plugin's own current documentation site | current (Shadow 9.x doc site) | Primary source for Finding 6 — the `shadow` configuration → POM mechanism, the `shadowRuntimeElements` GMM variant, `addShadowVariantIntoJavaComponent` |
| [github.com/GradleUp/shadow CHANGELOG.md](https://raw.githubusercontent.com/GradleUp/shadow/main/CHANGELOG.md) | Shadow plugin's own changelog, fetched raw | 1.0.1 (2014-06-28) through Unreleased (post-9.6.1, 2026-xx) | Dates the `shadow`-configuration POM mechanism to 1.1.0 (2014-08-26) and the GMM shadow variant to 9.0.0 (2025-08-07)/9.1.0 (2025-08-29) — the load-bearing evidence for DIST-13 |
| [github.com/GradleUp/shadow/issues/324](https://github.com/GradleUp/shadow/issues/324) | Shadow plugin issue tracker, fetched via `gh api` | filed 2017-09-06, closed 2025-01-24 | Confirms the issue is about manifest `Class-Path` inclusion, not POM dependencies — corrects a likely AI-agent misreading (AI-agent angle) |
| `apache__kafka@940c100fab:build.gradle` (exemplar corpus) | Real production build script, Apache Kafka | measured against pinned SHA, 2026-09-12 | Findings 6–7's primary exemplar: `shadowed` configuration, `archiveClassifier = null`, `GenerateModuleMetadata` suppression, hand-rolled `pom.withXml` |
| `junit-team__junit-framework@35c56a8e02:platform-tooling-support-tests/.../MavenPomFileTests.java` (exemplar corpus) | Real production test suite, JUnit | measured against pinned SHA, 2026-09-12 | Finding 1 and Finding 8's strongest exemplar — asserts the exact GMM marker text and models the maven-consumability-test pattern |
| `square__okhttp@dfcfab3824:maven-tests/pom.xml`, `google__dagger@4fbc045d2b:examples/maven/coffee/pom.xml` (exemplar corpus) | Real Maven-consumability probes | measured against pinned SHAs, 2026-09-12 | Finding 8's remaining exemplars for the verification-module pattern |
| `jvm-topic-map.md`, `jvm-distribution.md`, `jvm-dependencies.md` (this research program) | Prior-wave consolidations, `.agents/research/` | 2026-09-05 to 2026-09-12 | Settled findings this dive builds on rather than re-derives: DIST-02's carve-out, M-H-03's metadata gaps, MVN-DEP-11's RC status |
| Maven Central Solr search API (`search.maven.org/solrsearch/select`) | Live registry query, not a document | queried 2026-09-12 | The re-check command for Finding 3/Candidate 3 — the method this dive used to confirm `4.0.0-rc-6` is still the ceiling, generalizing the "query the registry, not the vendor banner" lesson from `jvm-topic-map.md` correction 38 |

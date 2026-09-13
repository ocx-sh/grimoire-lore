---
title: "Distribution: what actually ships (GRADLE-DIST)"
topic: distribution
model: opus
id_family: GRADLE-DIST
consolidates:
  - jvm-distribution/distribution-shape-decision.md
  - jvm-distribution/shading-failure-taxonomy.md
date: 2026-09-12
---

# Distribution: what actually ships

Consolidation for the `gradle-build/distribution.md` depth file (topic-map group
G, rows M-G-01 … M-G-12). Sources: the two dives in `jvm-distribution/`, the four
wave-1 audits, and three re-measurements run for this consolidation against the
pinned exemplar SHAs.

## Verdict

1. **The shape follows from the consumption mode, and nothing else.** An agent
   answers one question before touching a packaging DSL: is this thing *(a)*
   invoked as a program, *(b)* loaded into someone else's process (Gradle plugin,
   javac plugin, java agent), or *(c)* declared as a dependency and called through
   its API? Case (c) stops immediately — plain jar plus complete metadata.
2. **"A library is never shaded" survives, but not as an absolute — the
   zero-counterexample claim is false.** Both dives and the wave-1 map assert
   "zero counterexamples in 32 repos." Re-measured for this consolidation:
   `apache__kafka@940c100fab:build.gradle:2089-2100` shades `:clients` with
   `archiveClassifier = null` and `:401-420` publishes `components.shadow` as the
   `mavenJava` publication — `kafka-clients`, the single most-declared JVM
   library dependency in the corpus, **ships as a shaded jar under its primary
   coordinates**. The audit mis-filed it as "build-tooling submodule, not
   `kafka-clients`." The rule stands as a MUST with a named precondition
   (DIST-02), not as a law of nature.
3. **Shading is a merge problem; merging is what breaks.** Every failure in the
   taxonomy — dropped `ServiceLoader` providers, `SecurityException` on signed
   jars, leaked `module-info.class`, split packages, `minimize()` stripping
   reflective classes — is a consequence of collapsing N jars into one namespace.
   The shapes that do not merge (application plugin, Spring Boot `BOOT-INF/lib`,
   jlink, Jib) are immune to all of it by construction, and that immunity, not
   file size, is the reason to prefer them for an **application**.
4. **For a Gradle plugin, shading is mandatory and already automatic.**
   `com.gradle.plugin-publish` ≥ 1.0.0 auto-applies `com.gradleup.shadow`; a
   plugin author's job is to check what it relocated, not to decide whether to
   shade.
5. **For a CLI, shading is correct and the transformer taxonomy is the MUST
   list.** Every legitimate shading module in the corpus is a CLI, a
   javac/annotation-processor plugin, or a vendoring step.
6. **Under-specified merge configuration is the corpus's real failure, not
   over-shading.** Re-measured: **0/32** exemplars exclude
   `META-INF/*.SF`/`.DSA`/`.RSA`/`.EC`, and **0/32** use `minimize()`. The first
   is a latent runtime bomb every shading repo carries; the second is restraint
   that happens to be correct. Rules must enforce the first and keep the second.
7. **Gradle does not sidestep Maven's dependency-reduced-POM problem.** The
   taxonomy claims Gradle's publication model makes the trade-off disappear;
   kafka's 20-line hand-rolled `pom.withXml` against
   [shadow#324](https://github.com/GradleUp/shadow/issues/324) is the measured
   refutation. A shaded publication under primary coordinates owes its consumers
   an accurate POM in either build system (DIST-13).
8. **The OCX SDK (case c) ships no executable at all** — no `application`, no
   `bootJar`, no jlink image, no jpackage installer, no container. The `ocx` CLI
   it wraps is an already-installed external binary. **The OCX Gradle plugin
   (case b)** inherits plugin-publish's auto-shading and owes an explicit
   relocation audit of whatever JSON parser it bundles, because it lands in the
   host build's classloader beside every other plugin.
9. **jlink and jpackage are precondition-derived guidance, not corpus-backed.**
   0/32 exemplars build either. They ship as rules because their failure modes
   are hard stops discovered late (the automatic-module wall; unnotarized macOS
   builds), not because anyone measured them here — the depth file must say so.

## The ruleset

Family **GRADLE-DIST**. Rows are grouped by the check that catches them, because
an agent runs one check and clears a whole block.

### Group 1 — Routing: read the module's consumption mode before touching a packaging DSL

| ID | Rule | Rationale | Verification | Severity | Version floor |
|---|---|---|---|---|---|
| **GRADLE-DIST-01** | Classify the module as (a) program, (b) host-loaded plugin/agent, or (c) API dependency, and state the classification in the build file or its README, before adding any packaging plugin. | The shape is a lookup on the classification; every downstream rule branches on it. | Reading check: the module's own consumption instructions — "add this dependency" ⇒ (c), "run this jar" ⇒ (a), "apply this plugin" ⇒ (b). No command; absence of a stated classification alongside a shading plugin is the defect. | MUST | — |
| **GRADLE-DIST-02** | Do not publish a merged jar under a case-(c) library's primary coordinates. If a library genuinely must vendor a colliding dependency, relocate **every** bundled package under the library's own namespace, leave every non-vendored dependency a real POM dependency, and record why in the build file. | Merging changes the library's binary identity for every consumer and duplicates transitives the consumer may already carry. The one measured exception (`kafka-clients`) satisfies all three conditions of the carve-out; nothing else in the corpus does. | `grep -ln 'com.gradleup.shadow\|maven-shade-plugin' **/build.gradle.kts **/build.gradle **/pom.xml`, then for each hit read whether that module's artifact is the one the project's README/BOM tells consumers to declare. Empty output means no module shades at all — a pass, not a skipped check. | MUST | — |
| **GRADLE-DIST-03** | For a published Gradle plugin, do not add a shading plugin by hand — `com.gradle.plugin-publish` already applies `com.gradleup.shadow`; audit what it relocated instead. | A plugin loads into the host build's classloader beside every other plugin; an un-relocated dependency collides silently. Adding Shadow a second time double-configures the same task. | `grep -n 'com.gradle.plugin-publish' build.gradle.kts` present **and** an explicit `com.gradleup.shadow` in the same module = the defect; `./gradlew shadowJar` then `unzip -l build/libs/*.jar \| grep -v '^.*<your-package>'` to see what actually got bundled. | MUST | `com.gradle.plugin-publish` ≥ 1.0.0 |
| **GRADLE-DIST-04** | A library SDK ships exactly: the library jar, a sources jar, a javadoc/Dokka jar, and a complete POM/Gradle Module Metadata — no `application`, `bootJar`, jlink, jpackage or container output. | Any executable in a case-(c) module is a second, unclassified product smuggled into the library's release. | `./gradlew outgoingVariants` or the published POM lists no `-all`/`-fat`/`-shaded` classifier and no OS-suffixed archive. | MUST | — |

### Group 2 — `unzip -l` on the built artifact (run once, clears three rules)

| ID | Rule | Rationale | Verification | Severity | Version floor |
|---|---|---|---|---|---|
| **GRADLE-DIST-05** | Every shaded jar excludes `META-INF/*.SF`, `META-INF/*.DSA`, `META-INF/*.RSA` **and** `META-INF/*.EC`. | A signed dependency's signature no longer matches the merged content; the JVM throws `SecurityException: Invalid signature file digest for Manifest main attributes` at class-load time. Re-signing does not fix it — the original signer never signed these bytes. `.EC` (ECDSA) is the extension the most-copied fix omits. | `unzip -l <shaded-jar> \| grep -E 'META-INF/.*\.(SF\|DSA\|RSA\|EC)$'` must print nothing. Any line is the defect. | MUST | — |
| **GRADLE-DIST-06** | Every shaded jar excludes `META-INF/versions/*/module-info.class`; keep the exclusion explicit even on Shadow ≥ 9.0.0 where it is the default. | A multi-release dependency's module descriptor describes *that* dependency, not the merged artifact — it breaks JPMS resolution or exposes a garbage automatic-module name. Below Shadow 9.0.0 there is no default to inherit. | `unzip -l <shaded-jar> \| grep 'META-INF/versions/.*module-info.class'` must print nothing; cross-check the applied Shadow version against 9.0.0. | MUST | Default since Shadow 9.0.0 (2025-08-07, [#1177](https://github.com/GradleUp/shadow/pull/1177) closing [#729](https://github.com/GradleUp/shadow/issues/729)) |
| **GRADLE-DIST-07** | Call `mergeServiceFiles()` (Gradle) or configure `ServicesResourceTransformer` (Maven) on any shaded jar bundling more than one dependency that ships `META-INF/services/*`. | Shadow's default duplicate strategy is `EXCLUDE`: the first provider file wins and the rest are dropped with no warning and no build failure — a missing JDBC driver or Jackson module at runtime. Maven's transformer additionally rewrites class names inside the service files when relocation is in play. | `unzip -l <shaded-jar> 'META-INF/services/*'` compared against the union across the pre-shade dependency jars; statically, `grep -n 'mergeServiceFiles\|ServicesResourceTransformer' <build file>`. | MUST | — |

### Group 3 — build-file grep before enabling a merge feature

| ID | Rule | Rationale | Verification | Severity | Version floor |
|---|---|---|---|---|---|
| **GRADLE-DIST-08** | Apply `Log4j2PluginsCacheFileTransformer` when more than one bundled jar ships `META-INF/Log4j2Plugins.dat`. | It is a binary plugin index, not a text list: `mergeServiceFiles()` ignores it and naive concatenation corrupts it, so the losing dependency's appenders/layouts silently never register. | `unzip -l dep.jar \| grep Log4j2Plugins.dat` across bundled deps; count > 1 without the transformer in the build file is the defect. Runtime cross-check: `-Dlog4j2.debug` reports a lower plugin count than the sum across inputs. | MUST | — |
| **GRADLE-DIST-09** | Do not merge `META-INF/spring.factories` (or `spring-autoconfigure-metadata.properties`, `spring.handlers`, `spring.schemas`) with `AppendingTransformer`. Shadow ships no transformer for them; either write a key-aware one or do not shade those modules together. `META-INF/spring/*.imports` **is** a line list and is correct under `mergeServiceFiles()`. | These are `Properties` files whose duplicate keys must be comma-joined; appending produces a syntactically valid file where the last stanza silently wins. [GradleUp/shadow#1489](https://github.com/GradleUp/shadow/issues/1489) is still open. | `grep -n 'spring.factories\|AppendingTransformer\|PropertiesTransformer' <build file>` — `spring.factories` under a plain `AppendingTransformer` is the defect. | MUST | Open as of 2026-09-12; Maven Shade has `properties.PropertiesTransformer` since 3.2.2 |
| **GRADLE-DIST-10** | Enable `minimize()` only when every reflectively- or SPI-loaded dependency carries a `minimize { exclude(dependency(...)) }` entry **and** CI runs a functional test against the built shaded jar, not the pre-shade classpath. | `minimize()` is static reachability analysis; its one documented blind spot, `Class.forName(String)`, is exactly how `ServiceLoader`, JDBC registration and DI classpath scanning locate implementations. It strips the provider class even when `mergeServiceFiles()` correctly merged the provider *list*. | `grep -A3 'minimize()' <build file>` must show ≥ 1 `exclude(` whenever any bundled dependency has a `META-INF/services/*` entry; and a test task must consume `shadowJar`'s output. Empty `minimize()` grep output is a pass. | MUST | — |
| **GRADLE-DIST-11** | Relocate only as a defence against a named collision with the consumer's classpath, and name that collision in a comment next to each `relocate(` call. | Relocation is a separate concern from merging: only 6/32 exemplars use it, and every real use is defensive (Netty, IntelliJ platform, protobuf). A relocation with no stated reason cannot be safely removed later. | `grep -n 'relocate(\|<relocation>' <build file>` — each hit needs an adjacent reason. Note the grep trap: a `<distributionManagement><relocation>` element is an artifact-move notice, **not** package relocation. | SHOULD | — |
| **GRADLE-DIST-12** | Use the `com.gradleup.shadow` plugin id; `com.github.johnrengelman.shadow` is the dead pre-2023 coordinate. | Measured 12/32 vs 1/32; the maintained plugin moved to the GradleUp org and only the new id receives fixes such as the 9.0.0 MRJAR default. | `grep -rn 'johnrengelman' **/*.gradle*` must print nothing outside a deliberately pinned legacy build. | MUST | Shadow 9.3.0+ requires Gradle ≥ 9.0 and Java ≥ 17; current 9.6.1 (2026-07-22) |
| **GRADLE-DIST-13** | A shaded artifact published under non-classified coordinates must publish a POM that declares exactly the dependencies it did **not** bundle — Maven: leave `createDependencyReducedPom` at its `true` default; Gradle: publish `components.shadow` and verify the generated POM, patching it only if the `shadow` configuration does not already describe the runtime set. Set `createDependencyReducedPom = false` only when the shaded jar carries a classifier alongside an unshaded primary artifact. | Without it a downstream resolver re-fetches every embedded dependency at whatever version its own graph picks — duplicate classes at two versions, or dead classpath weight. Gradle does **not** make this free: kafka needed a hand-rolled `pom.withXml` against [shadow#324](https://github.com/GradleUp/shadow/issues/324). | Read the published POM (not the build file): every dependency listed must be absent from the jar, and every jar-embedded package absent from the POM. `unzip -l` the jar against `<dependencies>`. | MUST | Maven Shade 3.6.2; `createDependencyReducedPom` default `true` |
| **GRADLE-DIST-14** | Before shading two dependencies together, diff their package sets; treat any overlap as a blocker requiring relocation of one side, not a merge-configuration problem. | Split packages are a JPMS-level prohibition ([JEP 261](https://openjdk.org/jeps/261)); no transformer, exclude or duplicate strategy resolves them, and the failure is a `FindException` at module resolution. | `unzip -l dep-a.jar \| grep '\.class$' \| sed 's#/[^/]*$##' \| sort -u` diffed against the same for `dep-b.jar`; any shared package is a hit. | MUST | — |

### Group 4 — non-merging shapes: read the build file, run the shape's own task

| ID | Rule | Rationale | Verification | Severity | Version floor |
|---|---|---|---|---|---|
| **GRADLE-DIST-15** | Start a case-(a) JVM application from the `application` plugin unless a more specific shape's precondition holds; reach for shading only after naming which precondition failed. | It is the only shape with no merge, no class-identity change and no framework lock-in. Its sole precondition is a JVM on the target machine. | `./gradlew tasks --group=distribution` lists `installDist`/`distZip`/`distTar` when applied; a `shadowJar` in an application module with no `application {}` block is the shape worth questioning. | SHOULD | — |
| **GRADLE-DIST-16** | Never co-apply `com.gradleup.shadow` and `org.springframework.boot` on the same module; `bootJar`'s nested `BOOT-INF/classes` + `BOOT-INF/lib/*.jar` layout is the executable artifact. | Nothing is merged, so GRADLE-DIST-05 … -14 cannot fire at all. The nested-read startup cost is erased by `java -Djarmode=tools -jar app.jar extract`, zero code changes. | `grep -ln 'org.springframework.boot' <build file>` intersected with `grep -ln 'com.gradleup.shadow'` — a module in both sets is the defect. Confirm the shipped jar's `META-INF/MANIFEST.MF` carries `Start-Class`. | MUST | Spring Boot 4.x doc set; `tools` jarmode |
| **GRADLE-DIST-17** | Keep a layered `bootJar`'s `layerOrder` as `dependencies, spring-boot-loader, snapshot-dependencies, application` (or a superset preserving that relative order). | Docker invalidates every layer after the first changed one; putting `application` earlier rebuilds the dependency layer on every commit, defeating the only reason the feature exists. | Read the `layered { layerOrder... }` list literally and confirm `application` is last. `layerOrder` must also cover every layer an `intoLayer` call names, or the build fails. | SHOULD | Spring Boot 4.x doc set |
| **GRADLE-DIST-18** | Do not wire `jlink` into a build whose module graph contains an automatic module; either put that dependency on the classpath instead, or replace it with a modularised release. Treat a `jdeps --generate-module-info` graft as a stopgap, never the fix. | `jlink` hard-fails with `Error: automatic module cannot be used with jlink: <name>` — there is no suppression flag and no third option. | Run the `jlink` invocation as a dry pass in CI before shipping; a non-zero exit naming "automatic module" is the signal. 0/32 exemplars exercise this — precondition-derived. | MUST | All JDKs; JEP 493 (JDK 24) removes the on-disk `jmods/` requirement only when the vendor built with `--enable-linkable-runtime` |
| **GRADLE-DIST-19** | Build `jpackage` output once per target OS (no cross-compilation), and run notarization as a separate CI step after a macOS `jpackage` run. | The tool's own spec: "each format must be built on the platform it runs on." `jpackage` exposes `--mac-sign`/`--mac-entitlements` but performs no notarization; a signed-but-unnotarized app is still blocked by Gatekeeper on any machine but the builder's. | CI has one job per OS producing `jpackage` output; the macOS job's log shows a `jpackage --mac-sign` step **and** a subsequent `xcrun notarytool submit` / `stapler staple`. 0/32 exemplars — precondition-derived. | CONSIDER | JDK 25 `jpackage` tool spec |
| **GRADLE-DIST-20** | Never `COPY` a single fat jar as a container image's only application layer — use Jib, or `COPY` `BOOT-INF/lib` (or the application plugin's `lib/`) and the application classes as separate layers, stable-to-volatile. | A fat jar collapses dependencies and application code into one blob, so every code change invalidates the whole layer — it undoes exactly what layered jars and Jib exist to provide. | `grep -n '^COPY' Dockerfile`: a lone `COPY *-all.jar` / `*-fat.jar` feeding the only application layer is the defect signature; a correct file has ≥ 2 `COPY` lines, or applies `com.google.cloud.tools.jib` and has no Dockerfile. | SHOULD | Jib layer split: other deps → snapshot deps → project deps → resources → classes → `extraDirectories` |

**Severity tally — 20 rules: 15 MUST, 4 SHOULD, 1 CONSIDER.**
MUST: DIST-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -12, -13, -14, -16, -18.
SHOULD: DIST-11, -15, -17, -20. CONSIDER: DIST-19.

## Applied to the exemplars and the two future consumers

### Satisfied by the strict exemplars

| Rule | Evidence |
|---|---|
| DIST-01/-02 (routing, library never shaded) | `uber__NullAway@519a1bb826` shades `jar-infer-cli`, `jdk-javac-plugin`, `astubx-generator-cli` — never `nullaway`; `pinterest__ktlint@4c933394a3` shades `ktlint-cli`, not the rule-set libraries; `detekt__detekt@45672efb8b` shades `detekt-cli`, not `detekt-api` ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2, "who consumes the shaded artifact"). |
| DIST-07 (`mergeServiceFiles()`) | 9/32 call it: `uber__NullAway@519a1bb826:jar-infer/jar-infer-cli/build.gradle:39`, `pinterest__ktlint@4c933394a3:ktlint-cli/build.gradle.kts:18`, `detekt__detekt@45672efb8b:detekt-cli/build.gradle.kts:68`, `grpc__grpc-java@fc4314419d:netty/shaded/build.gradle:103`, plus junit-framework, dagger, okhttp, testcontainers-java, gradle/gradle ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2). |
| DIST-10 (`minimize()` precondition) | Re-measured 2026-09-12 across the 10 shading repos: **0/32 use `minimize()` at all.** The corpus's restraint is the rule's own recommendation, arrived at independently. |
| DIST-11 (relocation is defensive) | `grpc__grpc-java@fc4314419d:netty/shaded/build.gradle:95-101` relocates `io.grpc.netty`/`io.netty` against a consumer's own Netty; `detekt__detekt@45672efb8b:detekt-rules-ktlint-wrapper/ktlint-repackage/build.gradle.kts:14` relocates `org.jetbrains.kotlin.com.intellij` → `com.intellij` against an IntelliJ-platform collision. 6/32 relocate; no cosmetic use found. |
| DIST-13 (dependency-reduced POM) | `google__error-prone@c1f99ad5d3:core/pom.xml:412-413` — `shadedClassifierName = with-dependencies` with `createDependencyReducedPom = false`, exactly the classifier-plus-unshaded-primary precondition for turning it off. Verified by reading the file at the pinned SHA. |
| DIST-16 (Spring Boot never shades) | `spring-projects__spring-boot@93b23c40c2` — 383 `bootJar`/boot-plugin hits, zero co-application of `com.gradleup.shadow` or `maven-shade-plugin` anywhere in the repo. (The 383 figure is monorepo/sample-module noise; cite it only with that caveat, per [pub](jvm-audit/exemplar-publishing-ci-bazel.md) smell 6.) |

### Violated by prominent exemplars

| Rule | Violation | Note |
|---|---|---|
| **DIST-02** | `apache__kafka@940c100fab:build.gradle:2089-2100` — `project(':clients')`'s `shadowJar` sets `archiveClassifier = null`, and `:401-420` publishes `components.shadow` as the `mavenJava` publication. `kafka-clients` — the artifact every Kafka application declares — **is** the shaded jar. | Verified by reading the build file at the pinned SHA, 2026-09-12. It lands inside DIST-02's carve-out: all three relocations (`io.opentelemetry.proto`, `com.google.protobuf`, `org.apache.commons.net` → `org.apache.kafka.shaded.*`) are namespaced under Kafka's own package, and `configurations.shadowed` (zstd, lz4, snappy, slf4j-api) is excluded from the jar and re-declared in the POM. Defensible, and a direct refutation of "zero counterexamples." |
| **DIST-07** | Same module: no `mergeServiceFiles()` anywhere in `apache__kafka@940c100fab:build.gradle`. | Benign only while none of the three bundled artifacts ever ships a provider file — nothing in the build asserts that, so it is an undeclared dependency on upstream packaging. |
| **DIST-13** | Same module, `apache__kafka@940c100fab:build.gradle:410-420` — a hand-rolled `pom.withXml` loop re-adding the `shadowed` dependencies, worked around [shadow#324](https://github.com/GradleUp/shadow/issues/324). | The POM ends up correct, but by a mechanism that also trips topic-map row M-D-12 (`withXml` on `GenerateMavenPom` reintroduces non-deterministic element ordering). Satisfies DIST-13's intent at the cost of a GRADLE-CACHE row. |
| **DIST-05** | **0/32.** Re-measured 2026-09-12 across every shading repo (`apache__kafka`, `detekt__detekt`, `pinterest__ktlint`, `uber__NullAway`, `grpc__grpc-java`, `google__dagger`, `junit-team__junit-framework`, `square__okhttp`, `testcontainers__testcontainers-java`, `gradle__gradle`): not one excludes `META-INF/*.SF`/`.DSA`/`.RSA`/`.EC`. | Latent, not yet triggered — none of their bundled deps is currently signed. This is the ruleset's single largest new commitment against the corpus, and the reason DIST-05 is a MUST rather than a SHOULD. |
| **DIST-12** | `google__dagger@4fbc045d2b` still carries `com.github.johnrengelman.shadow` (1/32) alongside its migrated `com.gradleup.shadow` modules. | The corpus's only legacy-coordinate holdout. |
| **DIST-11** (grep trap, not a violation) | `google__error-prone@c1f99ad5d3` was cited in the wave-1 map and audit as relocating "because it loads into javac." It does not. | Re-verified 2026-09-12: `core/pom.xml:403-413` carries `<artifactSet><includes>`, `shadedClassifierName` and `createDependencyReducedPom` but **no `<relocations>` block**; the repo's only `<relocation>` is `type_annotations/pom.xml:31-34`, a `<distributionManagement>` artifact-move notice reading "error_prone_type_annotations has been merged into error_prone_annotations". error-prone avoids javac's Guava/ASM by version-pinned artifact selection, not renaming. |

### New commitments for the OCX SDK (case c)

- **DIST-04 is the whole packaging spec.** Library jar + sources + Dokka/javadoc + POM/GMM. No `application`, no `bootJar`, no jlink, no jpackage, no Jib. The `ocx` CLI the SDK wraps is an already-installed external binary ([cfg](jvm-audit/config-inventory.md) Axis 3: the Python analogue's process boundary is `subprocess` over an installed binary, not a bundled one).
- **DIST-02 binds unconditionally.** The SDK is the artifact consumers declare; the kafka carve-out does not apply, because a zero-runtime-dependency SDK ([cfg](jvm-audit/config-inventory.md) Axis 3, `dependencies = []`) has nothing to vendor. If the Kotlin-first option is taken and `kotlinx.serialization` is pulled in, that decision breaks the zero-dep claim before it ever reaches a shading question.
- **DIST-14 pre-empts a JPMS choice.** If the SDK ships a `module-info.java` (12/32 exemplars do), no consumer can ever safely shade it — which is the intended outcome, and worth stating in the SDK's own README as the reason not to.
- A standalone `ocx` CLI wrapper, if ever wanted, is a **separate artifact** with its own routing decision (case (a), DIST-15 baseline), never folded into the library jar.

### New commitments for the OCX Gradle plugin (case b)

- **DIST-03 is automatic and must still be audited.** `com.gradle.plugin-publish` applies Shadow for it; the plugin author's obligation is to run `unzip -l` on the published jar and confirm every third-party package landed under a relocated prefix. The plugin parses `ocx --format json` output ([cfg](jvm-audit/config-inventory.md) Axis 4: "`--format json` is the only parse surface"), so whatever JSON library it picks is the collision candidate — it will sit in the host build's classloader next to every other plugin's JSON library.
- **DIST-05 and DIST-07 apply to that auto-shaded jar** exactly as to a hand-configured one; plugin-publish configures neither.
- **DIST-01 is the plugin's own most-repeated advice.** The plugin provisions tools for *other people's* builds; the classification question it answers for itself is the one it should make its consumers answer.
- Not GRADLE-DIST's call, but adjacent: the plugin's `ValueSource`/`BuildService` provisioning shape is [cfg](jvm-audit/config-inventory.md) Axis 4's load-bearing carry-over and belongs to GRADLE-CACHE / GRADLE-PLUG.

## AI-agent failure modes

Ranked by how often it bites, each with the mechanical check.

1. **Defaulting to a fat jar as "the" Java distribution shape.** Pre-2023 tutorials answer "how do I run my Java app" with `shadowJar`/`maven-shade-plugin` universally, so a model reaches for shading even for a library. **Check**: before adding any shading plugin, confirm the module is case (a) or (b); if the project's own README says "add this as a dependency," shading it is wrong regardless of what the rest of the build does (DIST-01/-02).
2. **Emitting the dead `com.github.johnrengelman.shadow` coordinate.** The single highest-frequency stale-training-data artifact in this family. **Check**: `grep -rn 'johnrengelman' **/*.gradle*` — any hit in new code is stale (DIST-12).
3. **Copy-pasting the three-extension signature exclude and omitting `.EC`.** The most-copied fix — including jmh-gradle-plugin's own upstream `JMHPlugin.groovy:84` — lists only `.SF`/`.DSA`/`.RSA`. **Check**: `grep -n '\.RSA' <build file>` without an adjacent `.EC` in the same list (DIST-05).
4. **Treating `minimize()` as a free size win.** Tutorials show it as a one-liner with no excludes; it compiles, runs the happy path, then loses a reflectively-loaded class in production. **Check**: any `minimize()` with zero `exclude(` entries in a build bundling an SPI-using dependency (DIST-10).
5. **Assuming `mergeServiceFiles()` covers everything under `META-INF/`.** It handles line lists. It does not handle `Log4j2Plugins.dat` (binary) or `spring.factories` (keyed properties) — and the two Spring files (`spring.factories` vs `spring/*.imports`) look identical in a file listing but need different treatment. **Check**: `grep -n 'spring.factories\|Log4j2Plugins' <build file>` whenever either file appears in a bundled dependency (DIST-08/-09).
6. **Hallucinating tooling that does not exist** — a `SpringFileTransformer`/`SpringBootTransformer` class in Shadow, or a first-party `org.gradle.jlink`/`application.jpackage` plugin. The *need* is well documented, which is exactly what makes the hallucination plausible. **Check**: the id must resolve on `plugins.gradle.org`; Shadow's transformers package contains no class with "Spring" in the name as of 2026-09-12 ([shadow#1489](https://github.com/GradleUp/shadow/issues/1489) open).
7. **Reordering a Spring Boot `layerOrder` list "for clarity."** A model asked to tidy a `layered {}` block may sort it, not knowing it encodes cache-invalidation order. **Check**: diff against `dependencies, spring-boot-loader, snapshot-dependencies, application` before accepting any edit touching it (DIST-17).
8. **Recommending shading *and* a Dockerfile as belt-and-suspenders.** Strictly worse than either alone: it collapses the layer cache and adds the merge-failure surface. **Check**: a Dockerfile with `COPY *-all.jar` downstream of a Spring Boot or application-plugin build (DIST-20).
9. **Citing `google/error-prone` as a relocation exemplar.** Widely repeated, including in this program's own wave-1 map, and superficially plausible ("it loads into javac, so of course it relocates"). It does not relocate. **Check**: `grep -n 'relocation\|relocate' core/pom.xml` at the pinned SHA — a `<relocation>` inside `<distributionManagement>` is an artifact-move notice, not shade-plugin package renaming (DIST-11).
10. **Assuming `jlink` works against an arbitrary dependency graph.** A model writes a jlink task and expects it to succeed; the automatic-module wall is a hard stop, discovered late. **Check**: run the jlink invocation once as a CI dry pass before merging (DIST-18).
11. **Reading a `preserveFileTimestamps` grep hit as reproducibility configuration.** The corpus over-counts 3x: `google__dagger@4fbc045d2b:tools/shader/build.gradle:72` and `grpc__grpc-java@fc4314419d:netty/shaded/build.gradle:176-179` both name a hand-written `Transformer` method *parameter* that way. **Check**: confirm the property sits inside `tasks.withType<AbstractArchiveTask>` / `jar {}` / `shadowJar {}`, not a method signature.

## Open questions

**Owner decisions**

1. **Does DIST-02 ship as a MUST with the kafka carve-out, or as a MUST with no exception and kafka named as a documented deviation?** The carve-out is honest but gives an agent a door to walk through. Recommendation: keep the carve-out but make its three conditions conjunctive and verifiable, as written.
2. **Do jlink/jpackage rules ship at all?** 0/32 corpus evidence, and neither future OCX consumer will ever build one. They are two of the twelve rows the map allocated to this family. Recommendation: ship DIST-18 (a hard stop an agent will hit) and demote DIST-19 to a line in the depth file's prose rather than a numbered rule.
3. **Container guidance with 1/32 evidence.** Jib appears once (`grpc__grpc-java`), Dockerfiles cluster in test fixtures. DIST-20 is a real trade-off on thin evidence; keep or cut.

**Needs another research round**

- **Shaded-library publication metadata (DIST-13) under Gradle.** The taxonomy asserted Gradle sidesteps the dependency-reduced-POM problem; kafka's `pom.withXml` workaround for [shadow#324](https://github.com/GradleUp/shadow/issues/324) refutes it, but nobody has established what `components.shadow` actually emits into the POM today on Shadow 9.6.1, nor what a Maven consumer sees when a Gradle module publishes a `shadowJar` variant through Gradle Module Metadata (topic-map row M-H-02 asks the second half and is owned by GRADLE-PUB). **Question: on Shadow ≥ 9.0.0, does publishing `components.shadow` produce a POM whose `<dependencies>` correctly equal the non-bundled runtime set without hand-patching — and if so, from which version?**
- **`minimize()` in 2026.** Every claim in this family about `minimize()` traces to Shadow's own documentation sentence about `Class.forName(String)`; 0/32 exemplars exercise it, so nothing is corroborated. **Question: has jdependency-backed minimization gained any ServiceLoader/`META-INF/services` awareness since Shadow 9.0.0, and does `minimize()` interact correctly with `mergeServiceFiles()` on a current version?**
- **Reproducible shaded archives.** Gradle 9 makes archive tasks reproducible by default (map M-D-11), but no dive checked whether `shadowJar` inherits that default or whether merging reintroduces ordering nondeterminism. Straddles GRADLE-DIST and GRADLE-CACHE. **Question: is a `shadowJar` output byte-identical across two clean builds on Shadow 9.6.1 / Gradle 9.7, and does `mergeServiceFiles()` preserve entry order?**

## Sub-artifacts

- [jvm-distribution/distribution-shape-decision.md](jvm-distribution/distribution-shape-decision.md) — the routing question (program / host-loaded plugin / API dependency) and the five non-shading shapes: application plugin, Spring Boot nested and layered jars, jlink, jpackage, Jib/containers, with each shape's precondition.
- [jvm-distribution/shading-failure-taxonomy.md](jvm-distribution/shading-failure-taxonomy.md) — every checkable way a merged jar breaks (ServiceLoader loss, Log4j2 cache, Spring properties, signed-jar `SecurityException`, MRJAR `module-info`, split packages, `minimize()`), the exact transformer or exclusion that fixes each, the Maven Shade transformer catalogue, and the dependency-reduced POM.

## Key sources

| URL | Why |
|---|---|
| [gradleup.com/shadow/configuration/merging/](https://gradleup.com/shadow/configuration/merging/) | `mergeServiceFiles()`, the default `EXCLUDE` duplicate strategy, `Log4j2PluginsCacheFileTransformer` — the source for DIST-07 and DIST-08. |
| [gradleup.com/shadow/configuration/minimizing/](https://gradleup.com/shadow/configuration/minimizing/) | Shadow's own statement of `minimize()`'s `Class.forName(String)` blind spot (DIST-10). |
| [gradleup.com/shadow/configuration/relocation/](https://gradleup.com/shadow/configuration/relocation/) | `relocate()` semantics and the Guava/ASM textbook cases (DIST-11). |
| [GradleUp/shadow CHANGELOG.md](https://github.com/GradleUp/shadow/blob/main/CHANGELOG.md) | Dates the MRJAR `module-info.class` exclusion default to 9.0.0 (2025-08-07) — the version floor in DIST-06. |
| [GradleUp/shadow#1489](https://github.com/GradleUp/shadow/issues/1489) | Open since 2025-06-26: no built-in Spring transformer, with the exact file list and the `*.imports` vs `spring.factories` distinction (DIST-09). |
| [GradleUp/shadow#729](https://github.com/GradleUp/shadow/issues/729) / [#1177](https://github.com/GradleUp/shadow/pull/1177) | The MRJAR `module-info` leak report and the PR that made the exclusion default. |
| [GradleUp/shadow#324](https://github.com/GradleUp/shadow/issues/324) | The runtime-dependency-in-POM gap kafka hand-patches around — the evidence for DIST-13's Gradle half. |
| [melix/jmh-gradle-plugin#5](https://github.com/melix/jmh-gradle-plugin/issues/5) + [`JMHPlugin.groovy`](https://github.com/melix/jmh-gradle-plugin/blob/master/src/main/groovy/me/champeau/jmh/JMHPlugin.groovy) | Canonical signed-jar `SecurityException` report and the live fix that omits `.EC` — DIST-05 and agent failure mode 3. |
| [maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html](https://maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html) | The full Maven transformer catalogue, including `ServicesResourceTransformer` and `properties.PropertiesTransformer` (3.2.2+). |
| [maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html](https://maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html) | `createDependencyReducedPom` default `true`, `minimizeJar`, `artifactSet`, `filters` — DIST-13. |
| [openjdk.org/jeps/261](https://openjdk.org/jeps/261) | The split-package prohibition no shading tool can override (DIST-14). |
| [openjdk.org/jeps/493](https://openjdk.org/jeps/493) | jlink without JMODs: `--enable-linkable-runtime`, its vendor opt-in and every stated limitation (DIST-18's version note). |
| [docs.oracle.com jpackage tool spec (JDK 25)](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jpackage.html) | "Each format must be built on the platform it runs on" and the macOS signing flags that stop short of notarization (DIST-19). |
| [docs.spring.io/spring-boot/reference/packaging/efficient.html](https://docs.spring.io/spring-boot/reference/packaging/efficient.html) | The nested `BOOT-INF` layout and `java -Djarmode=tools -jar app.jar extract` (DIST-16). |
| [docs.spring.io/spring-boot/gradle-plugin/packaging.html](https://docs.spring.io/spring-boot/gradle-plugin/packaging.html) | The layer names, the fixed order, and the verbatim "the layers order is important" statement (DIST-17). |
| [docs.gradle.org/current/userguide/application_plugin.html](https://docs.gradle.org/current/userguide/application_plugin.html) | The start-script baseline: tasks, `mainClass`, `installDist`/`distZip` (DIST-15). |
| [GoogleContainerTools/jib docs/faq.md](https://github.com/GoogleContainerTools/jib/blob/master/docs/faq.md#how-are-jib-applications-layered) | Jib's exact layer split, the stable-to-volatile ordering DIST-20 points at. |

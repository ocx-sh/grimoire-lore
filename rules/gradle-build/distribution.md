---
title: "Distribution: What Actually Ships"
summary: The GRADLE-DIST family, covering which packaging shape a module is allowed to have, every checkable way a merged jar breaks, the published POM a merged jar owes its consumers, and the shapes that merge nothing at all
---

# Distribution: What Actually Ships

Owns the artifact a module emits as its shippable product: whether it merges
other jars into itself, what a merge is then obliged to configure, and the
packaging shapes that merge nothing. It does not own coordinates, signing or the
Central upload, which are the GRADLE-PUB family in this rule's publishing file,
and GRADLE-DIST-13 cites GRADLE-PUB-11 for the POM mechanism rather than
restating it. Whether a published Gradle plugin relocates its own dependencies
is GRADLE-PLUG-21 in the plugin-authoring file. Which dependencies a module has
at all, and `api` versus `implementation`, is GRADLE-DEP in the dependencies
file. Archive reproducibility and `pom.withXml` determinism are GRADLE-CACHE in
the caching-and-correctness file. Whether the module ships a `module-info.java`
is JAVA-API-12 in the separate `java-quality` rule, and it decides GRADLE-DIST-14
for every downstream consumer. The `maven-shade-plugin` half of each merge row
is carried here rather than in the `maven-build` rule, because the failure is
the merge and not the build system.

Contents: [Classify the Module First](#classify-the-module-first) ·
[One Listing of the Built Jar](#one-listing-of-the-built-jar) ·
[The Build File Before a Merge Feature](#the-build-file-before-a-merge-feature) ·
[The Published POM](#the-published-pom) ·
[Shapes That Merge Nothing](#shapes-that-merge-nothing) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Classify the Module First

The shape follows from how the module is consumed and from nothing else. One
question is answered before a packaging DSL is touched, and for a library the
answer ends the decision immediately.

Gate, one grep over every build file in the repository:
`grep -rln --include='build.gradle.kts' --include='build.gradle' --include='pom.xml' -e 'com.gradleup.shadow' -e 'maven-shade-plugin' .`
Empty output means no module merges anything, which is the pass for this section
and the two that follow.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-DIST-01 | Classify every module as (a) a program someone runs, (b) something loaded into another process such as a Gradle plugin, a javac plugin or a java agent, or (c) a dependency someone declares and calls, and write that classification into the build file beside the packaging block before adding one. | Every rule in this file branches on the classification, and case (c) ends the decision with a plain jar. An unclassified module gets whatever shape its tutorial had. | Reading check, no command. The module's own consumption instructions decide it: "add this dependency" is (c), "run this jar" is (a), "apply this plugin" is (b). A shading plugin in a module that states no classification is the finding. | MUST |
| GRADLE-DIST-02 | Do not publish a merged jar under a case (c) library's primary coordinates. A library that genuinely must vendor a colliding dependency satisfies all three of: every bundled package relocated under the library's own namespace, every non-vendored dependency left a real POM dependency, and the reason recorded in the build file. | Merging changes the library's binary identity for every consumer and duplicates transitives the consumer may already carry. The carve-out is conjunctive because exactly one artifact in the 32-repository corpus meets it: `kafka-clients` ships shaded under its primary coordinates with all three conditions held. Nothing else measured does. | The gate grep above. For each module it names, read whether that module's artifact is the one the project README or BOM tells consumers to declare. If it is, all three conditions must be visible in the build file. Empty gate output is the pass, not a skipped check. | MUST |
| GRADLE-DIST-04 | A library ships exactly four things: the library jar, a sources jar, a javadoc or Dokka jar, and a complete POM plus Gradle Module Metadata. No `application`, no `bootJar`, no jlink image, no jpackage installer, no container. | Any executable in a case (c) module is a second, unclassified product smuggled into the library's release, and consumers resolve it whether or not they want it. | `./gradlew outgoingVariants`, or read the published POM: no `-all`, `-fat` or `-shaded` classifier and no operating-system-suffixed archive. A classifier of that shape is the finding. | MUST |
| GRADLE-DIST-03 | Shading a published Gradle plugin is opt-in. `com.gradle.plugin-publish` does not apply Shadow for you, so neither assume a plugin jar is already merged nor add Shadow to make the plugin self-contained. Where a module does apply `com.gradleup.shadow`, audit the built jar for third-party packages that landed un-relocated. | Measured against `com.gradle.plugin-publish` 2.1.0 on 2026-09-12: it publishes the shadow jar as the main artifact only when the module applies Shadow itself, and Shadow's own build applies plugin-publish while neither shading nor relocating. A plugin's classes land in the host build's classloader beside every other plugin's, so an un-relocated bundled parser collides silently. Whether to relocate at all is GRADLE-PLUG-21. | Intersect the gate grep with `grep -rln --include='build.gradle.kts' --include='build.gradle' -e 'com.gradle.plugin-publish' .`. A plugin module in only the second set publishes a thin jar, which is the pass. A module in both is audited from the jar listing in the next section. | SHOULD |

## One Listing of the Built Jar

Three gates over the assembled artifact and never over the build file, because a
configured transformer proves the task was configured, not that it ran. Build
first with `./gradlew shadowJar` or `mvn package`, then, for a jar built at
`build/libs/app-all.jar`:

- `unzip -l build/libs/app-all.jar | grep -E 'META-INF/.*\.(SF|DSA|RSA|EC)$'`
- `unzip -l build/libs/app-all.jar | grep 'META-INF/versions/.*module-info.class'`
- `unzip -l build/libs/app-all.jar 'META-INF/services/*'`, compared against the
  same listing taken across every pre-merge dependency jar

The first two must print nothing, and empty output there is the pass. The third
must print the union of the inputs, and a short listing is the finding.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-DIST-05 | Every shaded jar excludes `META-INF/*.SF`, `META-INF/*.DSA`, `META-INF/*.RSA` and `META-INF/*.EC`. All four, in one list. | A signed dependency's signature no longer matches the merged content, so the JVM throws `SecurityException: Invalid signature file digest for Manifest main attributes` at class load. Re-signing does not fix it, because the original signer never signed these bytes. `.EC` for ECDSA is the extension the most-copied fix omits, jmh-gradle-plugin's own upstream source included. Measured 0 of 32 corpus repositories exclude any of them, so this is the ruleset's largest commitment against current practice and it is latent in all ten shading repositories. | Gate 1. Any line printed is the defect. Statically, `grep -rn --include='build.gradle.kts' --include='build.gradle' --include='pom.xml' -e 'META-INF/\*\.RSA' .` and confirm `.EC` sits in the same list. **Empty output here is the finding, not the pass**, because it means no signature exclusion exists anywhere. | MUST |
| GRADLE-DIST-06 | Every shaded jar excludes `META-INF/versions/*/module-info.class`, and the exclusion stays written down even on Shadow 9.0.0 and above where it is the default. | A multi-release dependency's module descriptor describes that dependency, not the merged artifact, so it breaks JPMS resolution or exposes a garbage automatic-module name. The default arrived in Shadow 9.0.0 (2025-08-07, verified 2026-09-12) and below that version there is nothing to inherit. | Gate 2, which must print nothing, and empty output is the pass. Cross-check the applied Shadow version against 9.0.0 before relying on the default instead of the line. | MUST |
| GRADLE-DIST-07 | Call `mergeServiceFiles()` in Gradle, or configure `ServicesResourceTransformer` in Maven, on any shaded jar bundling more than one dependency that ships `META-INF/services/*`. | Shadow's default duplicate strategy is `EXCLUDE`: the first provider file wins, the rest are dropped with no warning and no build failure, and the symptom is a missing JDBC driver or Jackson module at runtime. Maven's transformer additionally rewrites class names inside the service files when relocation is in play. | Gate 3: the merged jar's service-file list equals the union across the inputs, and any shortfall is the finding. Statically, `grep -rn --include='build.gradle.kts' --include='pom.xml' -e 'mergeServiceFiles' -e 'ServicesResourceTransformer' .`, where empty output beside a multi-provider merge is the finding and not the pass. | MUST |

```kotlin
// wrong: builds, runs the happy path, and ships three latent failures
tasks.shadowJar {
    archiveClassifier = ""
    minimize()
}
```

```kotlin
// right: the four signature extensions, the MRJAR descriptor, the provider merge
tasks.shadowJar {
    archiveClassifier = "all"
    exclude("META-INF/*.SF", "META-INF/*.DSA", "META-INF/*.RSA", "META-INF/*.EC")
    exclude("META-INF/versions/*/module-info.class")
    mergeServiceFiles()
    // minimize() only with an exclude() per reflectively loaded dependency: GRADLE-DIST-10
}
```

## The Build File Before a Merge Feature

Four greps, each run before the feature it names is switched on:

- `grep -rn --include='build.gradle.kts' --include='pom.xml' -e 'spring.factories' -e 'AppendingTransformer' -e 'PropertiesTransformer' .`
- `grep -rn -A3 --include='build.gradle.kts' -e 'minimize()' .`
- `grep -rn --include='build.gradle.kts' --include='pom.xml' -e 'relocate(' -e 'Log4j2PluginsCacheFileTransformer' .`
- `grep -rn --include='build.gradle.kts' --include='build.gradle' -e 'johnrengelman' .`

The fourth must print nothing and empty output there is the pass. The other three
are read for what is missing beside what they find.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-DIST-12 | Use the `com.gradleup.shadow` plugin id. `com.github.johnrengelman.shadow` is the dead pre-2023 coordinate. | Measured 12 of 32 against 1 of 32. The maintained plugin moved to the GradleUp organisation and only the new id receives fixes such as the 9.0.0 multi-release default. Shadow 9.3.0 requires Gradle 9.0 and Java 17, and 9.5.0 and later raise that to Gradle 9.2 (`GRADLE-PLUG-21` carries the same floor); current line 9.6.1 (2026-07-22, verified 2026-09-12). | Gate grep 4 must print nothing outside a deliberately pinned legacy build, and empty output is the pass. | MUST |
| GRADLE-DIST-10 | Enable `minimize()` only when every reflectively loaded or SPI-loaded dependency carries a `minimize { exclude(dependency(...)) }` entry and CI runs a functional test against the built shaded jar rather than the pre-merge classpath. | `minimize()` is static reachability analysis, and its documented blind spot, `Class.forName(String)`, is exactly how `ServiceLoader`, JDBC registration and DI classpath scanning locate implementations. It strips the provider class even when `mergeServiceFiles()` correctly merged the provider list. 0 of 32 corpus repositories use it at all, so the corpus's restraint is this rule. | Gate grep 2 must show at least one `exclude(` under every `minimize()` in a build bundling any dependency with a `META-INF/services/*` entry, and a test task must consume the `shadowJar` output. Empty grep output means nothing minimizes, which is the pass. | MUST |
| GRADLE-DIST-08 | Apply `Log4j2PluginsCacheFileTransformer` when more than one bundled jar ships `META-INF/Log4j2Plugins.dat`. | It is a binary plugin index, not a text list. `mergeServiceFiles()` ignores it and naive concatenation corrupts it, so the losing dependency's appenders and layouts never register and logging degrades with no error. | Count `Log4j2Plugins.dat` across the bundled dependency jars, one `unzip -l` per jar. More than one without the transformer named in gate grep 3 is the defect. Runtime cross-check: `-Dlog4j2.debug` reports a lower plugin count than the sum across the inputs. | MUST |
| GRADLE-DIST-09 | Do not merge `META-INF/spring.factories`, `spring-autoconfigure-metadata.properties`, `spring.handlers` or `spring.schemas` with `AppendingTransformer`. Shadow ships no transformer for them, so either write a key-aware one or do not shade those modules together. `META-INF/spring/*.imports` is a line list and is correct under `mergeServiceFiles()`. | These are `Properties` files whose duplicate keys must be comma-joined, and appending produces a syntactically valid file where the last stanza silently wins. GradleUp/shadow#1489 is still open, verified 2026-09-12. Maven Shade has `properties.PropertiesTransformer` from 3.2.2 and is the one build system with a stock answer. | Gate grep 1: `spring.factories` under a plain `AppendingTransformer` is the defect, and empty output is the pass. The two Spring paths look identical in a jar listing and need opposite treatment, so read the path and not the extension. | MUST |
| GRADLE-DIST-14 | Before shading two dependencies together, diff their package sets and treat any overlap as a blocker requiring one side to be relocated, never as a merge-configuration problem. | Split packages are a JPMS-level prohibition, JEP 261, that no transformer, exclusion or duplicate strategy resolves, and the failure is a `FindException` at module resolution far from the build that caused it. | Per jar, take the `unzip -l` listing filtered to `.class` entries, keep the directory part only, sort unique, and diff that set for `dep-a.jar` against `dep-b.jar`. Any shared package is a hit, and an empty diff is the pass. | MUST |
| GRADLE-DIST-11 | Relocate only as a defence against a named collision with the consumer's classpath, and state that collision in a comment beside each `relocate(` call. | Relocation is a separate concern from merging. 6 of 32 corpus repositories relocate, and every measured use is defensive: grpc-java against a consumer's own Netty, detekt against the IntelliJ platform. Blanket relocation bloats the jar and mangles stack traces, and a relocation with no stated reason cannot be safely removed later. | Gate grep 3: each `relocate(` hit needs an adjacent reason, and empty output is the pass. Note the trap: a `<relocation>` element inside `<distributionManagement>` is an artifact-move notice, not package relocation. | SHOULD |

## The Published POM

One row, checked against the published POM and never against the build file.
Gate: read the generated POM under `build/publications/` or the deployed `.pom`,
then take the `unzip -l` listing of the jar and compare the two lists by hand.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-DIST-13 | A shaded artifact published under non-classified coordinates must publish a POM declaring exactly the dependencies it did not bundle. In Maven, leave `createDependencyReducedPom` at its `true` default. In Gradle, publish `components.shadow` and verify the generated POM. Set `createDependencyReducedPom = false` only when the shaded jar carries a classifier alongside an unshaded primary artifact. | Without it a downstream resolver re-fetches every embedded dependency at whatever version its own graph picks, giving duplicate classes at two versions or dead classpath weight. Gradle does make this available rather than needing a hand-rolled `pom.withXml`: Shadow's `shadow` configuration has mapped to `RUNTIME`-scope POM entries since Shadow 1.1.0 (2014-08-26, verified 2026-09-12). The mechanism is GRADLE-PUB-11. | Every dependency the published POM lists must be absent from the jar, and every package embedded in the jar must be absent from the POM. A dependency present in both is the finding. Maven Shade 3.6.2 keeps `createDependencyReducedPom` at `true` by default, verified 2026-09-12. | MUST |

## Shapes That Merge Nothing

These shapes are immune to every row above by construction, and that immunity,
not file size, is the reason an application prefers them. `jpackage` is the one
shape with neither corpus evidence nor a rule: build its output once per target
operating system, since the tool's own specification states each format must be
built on the platform it runs on, and run notarization as a separate CI step
after a macOS run, since `jpackage` signs with `--mac-sign` but never notarizes
and Gatekeeper blocks a signed-but-unnotarized application everywhere except the
build machine (JDK 25 tool specification, verified 2026-09-12).

Gate: `./gradlew tasks --group=distribution`, then
`grep -rln --include='build.gradle.kts' --include='build.gradle' -e 'org.springframework.boot' .`
intersected with the same grep for `com.gradleup.shadow`, then
`grep -n -e '^COPY' Dockerfile` where one exists.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-DIST-16 | Never co-apply `com.gradleup.shadow` and `org.springframework.boot` on the same module. `bootJar`'s nested `BOOT-INF/classes` plus `BOOT-INF/lib/*.jar` layout is the executable artifact. | Nothing is merged, so none of the merge rows above can fire at all. The nested-read startup cost is erased by `java -Djarmode=tools -jar app.jar extract` with no code changes (Spring Boot 4.x, verified 2026-09-12). | The intersection of the two build-file greps: a module in both sets is the defect, and an empty intersection is the pass. Confirm the shipped jar's `META-INF/MANIFEST.MF` carries `Start-Class`. | MUST |
| GRADLE-DIST-18 | Do not wire `jlink` into a build whose module graph contains an automatic module. Put that dependency on the classpath instead, or replace it with a modularised release, and treat a `jdeps --generate-module-info` graft as a stopgap rather than the fix. | `jlink` hard-fails with `Error: automatic module cannot be used with jlink`, with no suppression flag and no third option, and it is discovered late because everything compiles first. | Run the `jlink` invocation as a dry pass in CI before shipping. A non-zero exit naming "automatic module" is the signal and a zero exit is the pass. 0 of 32 corpus repositories build a jlink image, so this row is derived from the tool's stated behaviour rather than from measured practice. JEP 493 (JDK 24) removes only the on-disk `jmods/` requirement, and only where the vendor built with `--enable-linkable-runtime`. | MUST |
| GRADLE-DIST-15 | Start a case (a) JVM application from the `application` plugin unless a more specific shape's precondition holds, and reach for shading only after naming which precondition failed. | It is the only shape with no merge, no class-identity change and no framework lock-in, and its sole precondition is a JVM on the target machine. | `./gradlew tasks --group=distribution` lists `installDist`, `distZip` and `distTar` when the plugin is applied, and an empty distribution group is the finding for a case (a) module. A `shadowJar` in an application module with no `application {}` block is the shape to question. | SHOULD |
| GRADLE-DIST-17 | Keep a layered `bootJar`'s `layerOrder` as `dependencies`, `spring-boot-loader`, `snapshot-dependencies`, `application`, or a superset preserving that relative order. | Docker invalidates every layer after the first changed one, so moving `application` earlier rebuilds the dependency layer on every commit and defeats the only reason the feature exists (Spring Boot 4.x, verified 2026-09-12). | Read the `layered { layerOrder ... }` list literally and confirm `application` is last. `layerOrder` must also name every layer an `intoLayer` call mentions, or the build fails outright. | SHOULD |
| GRADLE-DIST-20 | Never `COPY` a single fat jar as a container image's only application layer. Use Jib, or `COPY` `BOOT-INF/lib` (or the application plugin's `lib/`) and the application classes as separate layers ordered stable to volatile. | A fat jar collapses dependencies and application code into one blob, so every code change invalidates the whole layer, undoing exactly what layered jars and Jib exist to provide. | `grep -n -e '^COPY' Dockerfile`: a lone `COPY` of an `-all` or `-fat` jar feeding the only application layer is the defect signature. Two or more `COPY` lines is the pass, as is a module applying `com.google.cloud.tools.jib` with no Dockerfile at all. | SHOULD |

Nineteen rows, fourteen of them MUST. The density is deliberate: each MUST is
either a runtime failure a green build cannot detect, or a decision that a
consumer, not the author, pays for.

## What Agents Get Wrong Here

1. **Defaulting to a fat jar as the JVM distribution shape.** Pre-2023 tutorials
   answer "how do I run my Java app" with `shadowJar` or `maven-shade-plugin`
   universally, so a model reaches for shading even for a library. If the
   project's own README says "add this as a dependency", shading it is wrong no
   matter what the rest of the build does (GRADLE-DIST-01, GRADLE-DIST-02).
2. **Emitting the dead `com.github.johnrengelman.shadow` coordinate.** The
   highest-frequency stale-training-data artifact in this family, and any hit in
   new code is stale (GRADLE-DIST-12).
3. **Copy-pasting the three-extension signature exclusion and omitting `.EC`.**
   The most-copied fix lists only `.SF`, `.DSA` and `.RSA`. The tell is a `.RSA`
   line with no `.EC` beside it (GRADLE-DIST-05).
4. **Treating `minimize()` as a free size win.** Tutorials show it as a one-liner
   with no exclusions. It compiles, runs the happy path, then loses a
   reflectively loaded class in production (GRADLE-DIST-10).
5. **Assuming `mergeServiceFiles()` covers everything under `META-INF/`.** It
   handles line lists. It does not handle `Log4j2Plugins.dat`, which is binary,
   nor `spring.factories`, which is keyed properties, and the two Spring files
   look identical in a listing while needing different treatment
   (GRADLE-DIST-08, GRADLE-DIST-09).
6. **Hallucinating tooling that does not exist**, such as a `SpringTransformer`
   class in Shadow or a first-party `org.gradle.jlink` plugin. The need is well
   documented, which is what makes the invention plausible. The id must resolve
   on the Gradle Plugin Portal, and Shadow's transformer package contained no
   class with "Spring" in the name when it was read on 2026-09-12.
7. **Believing `com.gradle.plugin-publish` shades the plugin for you.** It does
   not, so a model either skips an audit it should run or adds Shadow to fix a
   problem that does not exist (GRADLE-DIST-03).
8. **Reordering a Spring Boot `layerOrder` list for clarity.** A model asked to
   tidy a `layered {}` block may sort it, not knowing the list encodes
   cache-invalidation order (GRADLE-DIST-17).
9. **Recommending shading and a Dockerfile together as belt and braces.**
   Strictly worse than either alone: it collapses the layer cache and adds the
   whole merge-failure surface (GRADLE-DIST-20).
10. **Assuming `jlink` works against an arbitrary dependency graph.** The
    automatic-module wall is a hard stop discovered after everything already
    compiled (GRADLE-DIST-18).
11. **Citing error-prone as a relocation exemplar** because it loads into
    javac and the inference is plausible. Re-read on 2026-09-12, its shade
    configuration carries no relocations at all, and its only `<relocation>`
    element is an artifact-move notice (GRADLE-DIST-11).

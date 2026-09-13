---
title: "Fat-jar shading failure taxonomy: Gradle Shadow and Maven Shade"
topic: shading-failure-taxonomy
agent: jvm-distribution/shading-failure-taxonomy
model: sonnet
date_researched: 2026-09-12
sources_count: 18
scope: >
  Every checkable way a merged (shaded/uber) jar breaks silently in Gradle
  (com.gradleup.shadow) and Maven (maven-shade-plugin), with the exact
  transformer, exclusion or flag that fixes each, plus what minimize() cannot
  see and what the Maven dependency-reduced POM changes for a consumer. Does
  NOT cover the shape decision itself (fat jar vs nested jar vs jlink vs Jib —
  that is `distribution-shape-decision.md`), Bazel `java_binary` deploy jars,
  or plugin-development-specific shading (`com.gradle.plugin-publish`'s
  auto-applied shadow — that is `gradle-build/plugin-authoring.md`).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [ServiceLoader providers vanish under the default duplicate strategy](#1-serviceloader-providers-vanish-under-the-default-duplicate-strategy)
   2. [Log4j2Plugins.dat needs its own transformer](#2-log4j2pluginsdat-needs-its-own-transformer)
   3. [Spring's spring.factories and spring/*.imports: no built-in transformer](#3-springs-springfactories-and-springimports-no-built-in-transformer)
   4. [The signed-jar SecurityException](#4-the-signed-jar-securityexception)
   5. [Multi-release jars leak module-info.class](#5-multi-release-jars-leak-module-infoclass)
   6. [Split packages across two shaded libraries break JPMS with no fix](#6-split-packages-across-two-shaded-libraries-break-jpms-with-no-fix)
   7. [minimize() cannot see reflection, ServiceLoader or SPI](#7-minimize-cannot-see-reflection-serviceloader-or-spi)
   8. [Relocation: what it is, and what it is not](#8-relocation-what-it-is-and-what-it-is-not)
   9. [Maven Shade's transformer catalogue](#9-maven-shades-transformer-catalogue)
   10. [The dependency-reduced POM](#10-the-dependency-reduced-pom)
   11. [The non-merging alternative: Spring Boot's nested layout](#11-the-non-merging-alternative-spring-boots-nested-layout)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- ServiceLoader provider files (`META-INF/services/*`) are silently dropped by Shadow's default `EXCLUDE` duplicate strategy — the fix is `mergeServiceFiles()`, not a broader `duplicatesStrategy = INCLUDE` (which reintroduces class-file collisions).
- Maven Shade's equivalent is the `ServicesResourceTransformer`, which additionally relocates class names *referenced inside* the service files — Shadow's `mergeServiceFiles()` does the same via its general relocation pass.
- `mergeServiceFiles { path = "..." }` retargets the merge to a non-standard service directory; `mergeServiceFiles { exclude("META-INF/services/com.acme.*") }` opts specific services out of merging.
- `Log4j2Plugins.dat` is a binary cache file, not a text list — merging it needs Shadow's dedicated `Log4j2PluginsCacheFileTransformer`; `mergeServiceFiles()` does not touch it and naive concatenation corrupts it.
- Spring's `META-INF/spring.factories` and `META-INF/spring-autoconfigure-metadata.properties` have **no built-in Shadow transformer as of 2026-09-12** ([GradleUp/shadow#1489](https://github.com/GradleUp/shadow/issues/1489), open since 2025-06-26) — a plain `AppendingTransformer` mis-merges them because they are `key=value` Properties files, not line lists, and duplicate keys must be comma-joined, not concatenated as separate stanzas.
- `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` **is** a line-per-entry file shaped like a `META-INF/services` provider list and is correctly handled by `ServiceFileTransformer`/`mergeServiceFiles()` today — the two Spring files need two different transformers, and conflating them under one is the common mistake.
- The signed-jar `SecurityException: Invalid signature file digest for Manifest main attributes` fires because a shaded jar's manifest/class bytes no longer match the signature block copied in from a signed dependency — the only fix is excluding `META-INF/*.SF`, `*.DSA`, `*.RSA`, `*.EC` from the shaded output; re-signing the merged jar does not help because the merge itself, not the missing signature, is what breaks verification of the *original* signer's claim.
- The commonly copy-pasted fix (including jmh-gradle-plugin's own, [melix/jmh-gradle-plugin#5](https://github.com/melix/jmh-gradle-plugin/issues/5)) excludes only `.SF`/`.DSA`/`.RSA` and omits `.EC` (ECDSA signature files) — add `.EC` explicitly for any dependency signed with an elliptic-curve key.
- Shadow excludes `module-info.class` found under `META-INF/versions/<N>/` (multi-release jars) **by default since Shadow 9.0.0** (2025-08-07, [GradleUp/shadow#1177](https://github.com/GradleUp/shadow/pull/1177), closing [#729](https://github.com/GradleUp/shadow/issues/729)) — builds pinned below 9.0.0 must add the exclude manually.
- Split packages — two shaded dependencies that already occupy the same Java package — are not fixable by any transformer; the JPMS split-package prohibition ("a package on the class path is ignored if it is also defined in a named module," [JEP 261](https://openjdk.org/jeps/261)) means the only real fix is relocating one side's package, which is an API-breaking dependency-level decision, not a merge-time transform.
- `minimize()` is a static reachability analysis (via jdependency) — its one documented blind spot is dynamic loading via `Class.forName(String)`, which is exactly the mechanism `ServiceLoader` and most reflection-based frameworks use internally, so minimize() routinely strips SPI providers, JDBC drivers and Jackson modules that are never referenced by a static call site.
- `minimize()` is safe to recommend only paired with `minimize { exclude(dependency("g:a:v-regex")) }` for every dependency the project knows uses reflection/SPI, and only when CI runs the actual shaded jar's functional/integration tests (not just unit tests against the pre-shaded classpath) as the gate that would catch a stripped provider.
- Maven Shade's `createDependencyReducedPom` defaults to `true` and rewrites the shaded artifact's published POM to drop the `<dependencies>` that got embedded — required whenever the shaded jar is published under the library's *normal* coordinates (no classifier), because otherwise a consumer's dependency resolver re-fetches and re-puts the same classes on the classpath a second time, at whatever version the consumer's own graph picks, causing duplicate-class or version-skew failures.
- It is **not** required, and error-prone's own `core/pom.xml` explicitly sets `createDependencyReducedPom = false` ([google/error-prone@c1f99ad5d3:core/pom.xml:413](https://github.com/google/error-prone)), when the shaded artifact ships under a separate classifier (`shadedClassifierName = "with-dependencies"`) alongside an unshaded primary artifact — the reduced POM would describe the wrong artifact's dependencies if attached to the thin jar.
- Package relocation (`relocate()` / `<relocations>`) exists to prevent a shaded dependency's classes from colliding with a different copy of the same library on the *consumer's* classpath — it is a distinct feature from merging and only 6/32 exemplars use it ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2).
- Contrary to the wave-1 map's conflict-1 note, `google/error-prone`'s Maven shade config does **not** relocate packages: `core/pom.xml`'s `maven-shade-plugin` execution only restricts `<artifactSet><includes>` (license-compatible deps to bundle) and carries no `<relocations>` block at all; the one `<relocation>` grep-hit in the repo is a `<distributionManagement><relocation>` artifact-move notice in an unrelated module (`type_annotations/pom.xml:31-34`), not a shade-plugin package rename. error-prone avoids classpath collision with javac's own bundled Guava/ASM by pinning exact dependency versions and excluding conflicting artifacts, not by renaming packages.
- Spring Boot's own packaging docs recommend **not** merging at all for applications: extract the executable jar to a directory (`java -Djarmode=tools -jar app.jar extract`) and run the exploded `lib/` + application-jar layout, which the docs say has no startup-time penalty versus the executable jar after the first run and is compatible with AOT cache and CDS.

## Findings

### 1. ServiceLoader providers vanish under the default duplicate strategy

Shadow's default `duplicatesStrategy` is `EXCLUDE`: the documentation states plainly that among files with the same path across merged inputs, "the **first** `foo/bar` file will be included in the final JAR" and every subsequent one is dropped silently — no warning, no build failure ([gradleup.com/shadow/configuration/merging](https://gradleup.com/shadow/configuration/merging/)). `META-INF/services/<InterfaceName>` provider-registration files are the textbook casualty: two dependencies that both ship a `META-INF/services/java.sql.Driver` (two JDBC drivers) or `META-INF/services/com.fasterxml.jackson.databind.Module` (two Jackson modules) end up with only one provider surviving in the shaded jar, and the failure surfaces at runtime as "no suitable driver found" or a missing Jackson feature, not at build time.

**Wrong (default, silent data loss):**
```kotlin
tasks.shadowJar {
    // no merge configuration — first-registered service file wins, the rest vanish
}
```

**Right:**
```kotlin
tasks.shadowJar {
    mergeServiceFiles()
}
```

Two refinements from the same page ([gradleup.com/shadow/configuration/merging](https://gradleup.com/shadow/configuration/merging/)):

```kotlin
tasks.shadowJar {
    mergeServiceFiles {
        // merge a non-standard service-descriptor directory instead of META-INF/services
        path = "META-INF/custom"
    }
}
```

```kotlin
tasks.shadowJar {
    mergeServiceFiles {
        // opt specific service names out of merging (e.g. a provider you deliberately override)
        exclude("META-INF/services/com.acme.*")
    }
}
```

Maven Shade's equivalent is the `ServicesResourceTransformer`, which the plugin's own resource-transformers page describes as "relocat[ing] class names in `META-INF/services` resources and merg[ing] them" — the relocation half matters because if the shaded build *also* relocates the provider classes' packages, the plain-text service file must be rewritten to reference the new package or `ServiceLoader.load()` fails with a `ClassNotFoundException` even though the class is present ([maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html](https://maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html)):

```xml
<transformer implementation="org.apache.maven.plugins.shade.resource.ServicesResourceTransformer"/>
```

**Verification**: `mergeServiceFiles()` (Gradle) or a `ServicesResourceTransformer` entry (Maven) must be present whenever the shaded jar's `configurations`/`artifactSet` include more than one dependency that ships `META-INF/services/*`; grep the pre-shade dependency jars (`unzip -l some-dep.jar | grep META-INF/services`) for duplicate service-interface names across two or more deps as the concrete trigger.

### 2. Log4j2Plugins.dat needs its own transformer

`Log4j2Plugins.dat` (under `META-INF/`) is Log4j2's binary plugin cache — a serialized index of every `@Plugin`-annotated class in a jar, generated at compile time by `log4j-core`'s annotation processor. It is not a `META-INF/services` text file and `mergeServiceFiles()` does not touch it; naive first/last-wins duplicate handling silently keeps only one dependency's cache, so any Log4j2 plugin (a custom appender, layout, or lookup) shipped by the losing dependency becomes invisible to Log4j2 at runtime with no error — plugins simply do not register. Shadow ships a dedicated transformer for exactly this file:

```kotlin
tasks.shadowJar {
    transform<com.github.jengelman.gradle.plugins.shadow.transformers.Log4j2PluginsCacheFileTransformer>()
}
```

([gradleup.com/shadow/configuration/merging](https://gradleup.com/shadow/configuration/merging/))

**Verification**: any shaded jar whose runtime classpath includes more than one dependency bundling a Log4j2 plugin cache (`unzip -l <jar> | grep Log4j2Plugins.dat` across every dependency jar, count > 1) must carry `Log4j2PluginsCacheFileTransformer`; absent that, `-Dlog4j2.debug` logs a plugin-scan count lower than the sum across the individual dependency jars.

### 3. Spring's spring.factories and spring/*.imports: no built-in transformer

The brief asks this to be settled either way; it is settled **no, not fully, as of 2026-09-12**. [GradleUp/shadow#1489](https://github.com/GradleUp/shadow/issues/1489) ("Support Spring shading and relocation," opened 2025-06-26, still open) is the maintainers' own tracking issue and lays out the shape of the problem precisely:

- `META-INF/spring.factories`, `META-INF/spring-autoconfigure-metadata.properties`, `META-INF/spring.handlers`, `META-INF/spring.schemas`, `META-INF/spring.tooling` are Java `Properties` files. Some map `key = comma,separated,class,list` (`spring.factories`), others map `key = path` (`spring.handlers`/`spring.schemas`). Two dependencies contributing the same key need their **values comma-joined**, not the file naively concatenated — a plain `AppendingTransformer` produces a syntactically-valid-but-wrong properties file where the second occurrence of a key silently shadows the first when `Properties.load()` parses it (last-stanza-wins per key, not a merge of the two dependencies' registrations).
- The issue author explicitly names `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` (the Spring Boot 2.7+ replacement for the auto-configuration part of `spring.factories`) as **already handled correctly today** by `ServiceFileTransformer`/`mergeServiceFiles()`, because that file is one fully-qualified class name per line with no key/value structure — the same shape `META-INF/services/*` files have.
- No maintainer response or shipped `SpringFileTransformer` exists in the tracked issue as of this research date; the reporter's own workaround is a hand-written `SpringFileTransformer` shared as a GitHub Gist, not something Shadow ships.

**Concrete guidance**: for a project shading Spring dependencies, split the fix in two:

```kotlin
tasks.shadowJar {
    // AutoConfiguration.imports: line-list, works with mergeServiceFiles today
    mergeServiceFiles()

    // spring.factories and friends: Shadow has no built-in transformer (shadow#1489, open).
    // AppendingTransformer is WRONG here — it produces a properties file with
    // duplicate keys where only the last stanza's value for that key survives.
    // Either write a custom key-aware ResourceTransformer, or (simpler) avoid
    // shading Spring Boot autoconfiguration modules together at all.
}
```

Maven Shade users have the built-in fix Shadow lacks: the `AppendingTransformer` example in Maven's own docs is captioned specifically for `META-INF/spring.handlers`/`spring.schemas` ([maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html](https://maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html)) — those two files are path-valued and rarely collide on the same key across dependencies in practice, which is why plain appending is tolerable there but not for `spring.factories`' comma-separated class lists. Maven Shade 3.2.2+ also ships a purpose-built `PropertiesTransformer` (`org.apache.maven.plugins.shade.resource.properties.PropertiesTransformer`) for ordinal-based properties merging, which is the closer analogue to what `spring.factories` needs, though it is not Spring-specific either.

**Verification**: grep the shaded jar for `META-INF/spring.factories` and `META-INF/spring-autoconfigure-metadata.properties`; if more than one input dependency contributes either, confirm a transformer is configured for it (`grep -n "spring.factories\|PropertiesTransformer\|SpringFileTransformer"` in the build file) — absence with 2+ contributing deps is a silent-drop risk, not a build failure.

### 4. The signed-jar SecurityException

[melix/jmh-gradle-plugin#5](https://github.com/melix/jmh-gradle-plugin/issues/5) documents the canonical case: shading a signed dependency (a jar whose `META-INF/` carries a `.SF` signature file and a `.DSA`/`.RSA`/`.EC` block file) throws at class-load time, not at build time:

```
java.lang.SecurityException: Invalid signature file digest for Manifest main attributes
```

The mechanism: the JAR signature covers the *original* jar's manifest and per-entry digests. Once shading rewrites the manifest (new `Main-Class`, merged attributes) and mixes in classes from other jars, the signature no longer matches what `JarVerifier` recomputes at class-load time — `URLClassLoader`/`JarFile` still finds the `.SF`/`.RSA` entries in the merged jar and attempts to verify against content that has changed underneath them. **Re-signing the merged jar does not fix this**: the exception is not "the signature is missing," it is "the signature that is present does not match this content" — the original signer never signed *this* combination of bytes, and re-signing with your own key does not restore the original signer's guarantee (which is usually the entire point of the dependency being signed, e.g. a JCE provider or a jar loaded under a `SecurityManager` policy keyed to a specific signer). The only correct fix is removing the stale signature metadata so the JVM does not attempt to verify it at all:

```kotlin
tasks.shadowJar {
    exclude("META-INF/*.SF", "META-INF/*.DSA", "META-INF/*.RSA", "META-INF/*.EC")
}
```

jmh-gradle-plugin's own upstream fix for this exact issue applies the same exclude list to its generated jar tasks, in both the Shadow and non-Shadow code paths (`me.champeau.jmh.JMHPlugin`, current `master`):

```groovy
// src/main/groovy/me/champeau/jmh/JMHPlugin.groovy:84
def metaInfExcludes = ['module-info.class', 'META-INF/*.SF', 'META-INF/*.DSA', 'META-INF/*.RSA']
...
it.exclude(metaInfExcludes)   // applied to the ShadowJar/Jar task, line 258 / 279
```

Note this reference implementation **omits `.EC`** (the extension for ECDSA signature blocks). Elliptic-curve-signed jars are less common today but the omission is a real gap in the most commonly copy-pasted version of this fix — carry `.EC` explicitly rather than copying the three-extension list verbatim.

Maven Shade needs the same filter, expressed as a global `<filter>` with no `<artifact>` restriction, or scoped per signed dependency:

```xml
<filters>
  <filter>
    <artifact>*:*</artifact>
    <excludes>
      <exclude>META-INF/*.SF</exclude>
      <exclude>META-INF/*.DSA</exclude>
      <exclude>META-INF/*.RSA</exclude>
      <exclude>META-INF/*.EC</exclude>
    </excludes>
  </filter>
</filters>
```

**Verification**: `unzip -l <shaded-jar> | grep -E 'META-INF/.*\.(SF|DSA|RSA|EC)$'` on the *output* jar must return nothing; if it returns entries, the exclude filter is missing or mis-scoped. This is a build-time check that catches a failure that otherwise only manifests at `java -jar` runtime.

### 5. Multi-release jars leak module-info.class

A multi-release jar (JEP 238) ships version-specific class overrides under `META-INF/versions/<N>/`, and some libraries (Log4j2 among them) place a `module-info.class` there to provide a module descriptor on JDK 9+ while keeping the base jar usable on JDK 8. Shading two or more such libraries — or shading one alongside anything else — pulled every `META-INF/versions/<N>/module-info.class` into the merged jar by default through Shadow 8.x, producing a shaded jar whose declared module descriptor(s) describe the *original* individual dependency, not the merged artifact, which is nonsensical and can make the shaded jar fail JPMS module resolution or silently expose a garbage automatic-module name.

[GradleUp/shadow#729](https://github.com/GradleUp/shadow/issues/729) tracked this from Shadow 7.1.0 (Gradle 7.3) onward. It was closed by [#1177](https://github.com/GradleUp/shadow/pull/1177) ("Exclude `module-info.class` in Multi-Release folders by default"), which shipped in **Shadow 9.0.0 (2025-08-07)** per the plugin's own changelog:

> "Exclude `module-info.class` in Multi-Release folders by default. ([#1177])" — under the `[9.0.0] - 2025-08-07` heading, [GradleUp/shadow CHANGELOG.md](https://github.com/GradleUp/shadow/blob/main/CHANGELOG.md)

**Any build pinned below Shadow 9.0.0 must add the exclusion manually**:

```kotlin
tasks.shadowJar {
    exclude("META-INF/versions/*/module-info.class")
}
```

On Shadow ≥ 9.0.0 this is the default and no action is needed — but a build that pins an older Shadow version and has never seen this bug (because it never shaded a multi-release dependency) will hit it silently the first time one enters the dependency graph, so the exclude is worth keeping explicit regardless of version as defensive documentation.

**Verification**: `unzip -l <shaded-jar> | grep 'META-INF/versions/.*module-info.class'` on the output must return nothing; check the applied Shadow version (`./gradlew dependencies --configuration classpath | grep shadow` or the `plugins {}` block) against the 9.0.0 floor before relying on the default.

### 6. Split packages across two shaded libraries break JPMS with no fix

This is the one failure mode in this taxonomy that genuinely has **no transformer, exclusion, or flag that fixes it** — it is a property of the Java Platform Module System itself, not of the shading tool. [JEP 261](https://openjdk.org/jeps/261) states the restriction plainly in its risks-and-assumptions discussion: "If a package is defined in both a named module and on the class path then the package on the class path will be ignored" — generalized, the module system refuses to let the same package be owned by two different modules readable in the same graph, "to avoid splitting packages across class loaders and across modules."

The concrete failure: if two dependencies being shaded together already ship (or, once shaded, are consumed as) separate JPMS modules or automatic modules, and both contain classes under the same package name — e.g. two vendored copies of a shared internal utility library that were never relocated — the resulting single artifact cannot get a coherent module descriptor for that package, and if the merged jar coexists on the module path with either original dependency unshaded elsewhere in the graph, module resolution fails outright with a `java.lang.module.FindException`/`ResolutionException` naming the split package. Merging the two jars into one artifact does not "fix" this the way it fixes a plain classpath duplicate-class problem, because the module system's complaint is about package *ownership crossing module boundaries*, and a shading tool has no mechanism to declare "this package now belongs jointly to the classes that came from two different upstream libraries" — the only real fix is relocating (renaming) one side's package, which is a source-incompatible change to that dependency's own API and not something a merge transformer can safely automate.

**Verification (reading heuristic, not a single command)**: before shading two dependencies together, diff their package sets (`unzip -l dep-a.jar | grep '\.class$' | sed 's#/[^/]*$##' | sort -u` for each) and flag any package name present in both; if either dependency is JPMS-explicit (ships `module-info.class`) or is consumed elsewhere in the same dependency graph as an automatic module, treat an overlapping package as a hard blocker requiring relocation of one side, not a shading concern to be configured away.

### 7. minimize() cannot see reflection, ServiceLoader or SPI

Shadow's `minimize()` runs a static reachability analysis (backed by [jdependency](https://github.com/tcurdt/jdependency)) that strips classes and whole dependency jars unreferenced by any statically-analyzable call site from the project's own classes. Shadow's own documentation states the one blind spot explicitly:

> "This is useful when the dependency analyzer cannot find the usage of a class programmatically, for example if the class is loaded dynamically via `Class.forName(String)`." — [gradleup.com/shadow/configuration/minimizing](https://gradleup.com/shadow/configuration/minimizing/)

`Class.forName(String)` is not a corner case — it is the load-bearing mechanism `java.util.ServiceLoader` uses internally to instantiate every provider named in a `META-INF/services/*` file, and it is how most reflection-based frameworks (JDBC driver registration pre-JDBC-4.6, plugin systems, most dependency-injection classpath scanning) locate implementation classes whose fully-qualified name is only known at runtime, from a string in a config file or resource. `minimize()` sees no static edge from "the project's code" to "this provider class" in any of these cases and strips the provider — the failure surfaces identically to the `mergeServiceFiles()` failure in finding 1 (a missing JDBC driver, a missing Jackson module) except it happens *even when* `mergeServiceFiles()` correctly merged the provider *list*, because `minimize()` then deletes the listed *class*.

**Wrong (silently strips SPI providers):**
```kotlin
tasks.shadowJar {
    mergeServiceFiles()
    minimize()   // deletes provider classes minimize() cannot see are used
}
```

**Right — protect every dependency known to be located reflectively:**
```kotlin
tasks.shadowJar {
    mergeServiceFiles()
    minimize {
        exclude(dependency("org.postgresql:postgresql:.*"))       // JDBC driver, ServiceLoader-loaded
        exclude(dependency("com.fasterxml.jackson.module:.*:.*")) // Jackson modules, ServiceLoader-loaded
    }
}
```

**Decision for the MUST list**: `minimize()` is **not** safe to recommend unconditionally. It is safe to recommend under one precondition: every dependency in the shaded artifact that is located via `ServiceLoader`, reflection, or any other `Class.forName(String)`-shaped mechanism is explicitly excluded from minimization via `minimize { exclude(dependency(...)) }`, **and** CI runs the shaded jar's actual functional/integration test suite (invoking the built artifact, not just unit tests against the pre-shade compile classpath) as the gate that would catch a stripped provider before release. Without both halves, `minimize()` is a build-time size optimization with a runtime correctness cost that is invisible until a code path nobody's tests exercise loads a class that is no longer there.

### 8. Relocation: what it is, and what it is not

`relocate()` (Shadow) / `<relocations>` (Maven Shade) rewrites a package prefix across every class file, resource path, and (via the transformer machinery) every text reference to that package inside merged resource files — its purpose is preventing a shaded copy of a dependency from colliding with a different version of the same dependency elsewhere on a consumer's classpath (Shadow's docs give Guava and ASM as the textbook cases, [gradleup.com/shadow/configuration/relocation](https://gradleup.com/shadow/configuration/relocation/)):

```kotlin
tasks.shadowJar {
    relocate("com.google.common", "shaded.com.google.common")
}
```

It is a *narrower and separate* concern from merging (findings 1–3) and from filtering signature/module files (findings 4–5) — a jar can merge correctly and still ship unrelocated, colliding packages, and vice versa. Only 6/32 exemplars use `relocate(` at all ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2), and every use in the corpus is defensive (avoiding a collision with the *consumer's* environment), never cosmetic.

**Correction to the wave-1 map's conflict-1 characterization**: `google__error-prone@c1f99ad5d3` was cited there as relocating packages "because it loads into javac." Reading the actual build file shows this is not what happens. `core/pom.xml`'s `maven-shade-plugin` execution (lines 400–441) restricts `<artifactSet><includes>` to a license-compatible allowlist of dependencies to bundle and sets `shadedClassifierName = with-dependencies`, `createDependencyReducedPom = false` — it carries **no `<relocations>` block at all**. The single `<relocation>` grep-hit in the repository is a Maven `<distributionManagement><relocation>` element in `type_annotations/pom.xml:31-34`, announcing that the `error_prone_type_annotations` artifact has moved into `error_prone_annotations` — an artifact-coordinate migration notice, unrelated to shade-plugin package renaming. error-prone avoids colliding with javac's own bundled Guava/ASM by pinning exact, tested dependency versions and controlling exactly which artifacts get bundled, not by renaming their packages. Any rule text citing error-prone as a relocation example should be corrected.

### 9. Maven Shade's transformer catalogue

For completeness against the brief's ask to "name the transformer" rather than warn vaguely, the full documented set ([maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html](https://maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html)), all under `org.apache.maven.plugins.shade.resource` unless noted:

| Transformer | Purpose |
|---|---|
| `ServicesResourceTransformer` | Merges and relocates `META-INF/services/*` — the Maven analogue of `mergeServiceFiles()` |
| `AppendingTransformer` | Concatenates same-path text files; correct for line-list or simple-append files, wrong for keyed Properties files with overlapping keys |
| `XmlAppendingTransformer` | Concatenates XML resources; does not load external DTDs by default (network-access safety) |
| `ManifestResourceTransformer` | Sets/replaces manifest entries; by default relocates `Export-Package`/`Import-Package`/`Provide-Capability`/`Require-Capability` |
| `ApacheLicenseResourceTransformer` | De-duplicates `LICENSE`/`LICENSE.txt`/`LICENSE.md` |
| `ApacheNoticeResourceTransformer` | Aggregates Apache-2.0 `NOTICE` files from bundled dependencies |
| `ComponentsXmlResourceTransformer` | Aggregates Plexus `components.xml` |
| `GroovyResourceTransformer` | Merges `META-INF/services/org.codehaus.groovy.runtime.ExtensionModule` entries |
| `PluginXmlResourceTransformer` | Aggregates Maven's own `plugin.xml` |
| `ResourceBundleAppendingTransformer` | Merges `java.util.ResourceBundle` property files |
| `DontIncludeResourceTransformer` / `IncludeResourceTransformer` | Force-exclude / force-include specific resources |
| `properties.PropertiesTransformer` (since 3.2.2) | Ordinal-based Properties merging — closer than `AppendingTransformer` to what `spring.factories`-shaped files need, though not Spring-specific |
| `properties.OpenWebBeansPropertiesTransformer` / `properties.MicroprofileConfigTransformer` | Framework-specific Properties mergers, same package, since 3.2.2 |

Shadow has no 1:1 equivalent for several of these (notably `ApacheNoticeResourceTransformer` and the ordinal `PropertiesTransformer`) — a Maven-to-Gradle migration that assumes parity will silently drop that merging behavior unless a custom `Transformer` is hand-written, the same pattern seen in grpc-java's hand-rolled `NettyResourceTransformer` ([grpc__grpc-java@fc4314419d:netty/shaded/build.gradle:165-181](https://github.com/grpc/grpc-java)).

### 10. The dependency-reduced POM

`createDependencyReducedPom` (Maven Shade, default **`true`**) rewrites the POM published alongside the shaded artifact to drop `<dependencies>` that have been embedded in the uber jar:

> "If set to `true`, dependencies that have been included into the uber JAR will be removed from the `<dependencies>` section of the generated POM." — [maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html](https://maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html)

**Why it matters to a consumer**: without this, a downstream Maven build resolving the shaded artifact would *also* resolve and place on the classpath every dependency the shaded jar already embeds — at whatever version the consumer's own dependency-mediation picks, which need not match the version actually embedded. This produces either duplicate classes at two versions (`NoSuchMethodError`/`NoClassDefFoundError` depending on classloading order) or, at best, dead weight on the classpath. The dependency-reduced POM prevents this by declaring the shaded jar as if it had no embedded dependencies at all.

**When it is required vs. not**, per the brief's decision (c): it is **required** whenever the shaded (uber) jar is published under the library's normal coordinates with no classifier — i.e., the shaded jar *is* the artifact consumers declare a dependency on. It is **not required**, and actively wrong to force on, when the shaded jar is published under a separate classifier alongside an unshaded primary artifact — exactly the shape `google__error-prone@c1f99ad5d3:core/pom.xml:413` uses (`shadedClassifierName = "with-dependencies"`, `createDependencyReducedPom = false`): the reduced POM describes the *shaded* artifact's absent dependencies, and Maven Shade would otherwise overwrite the *project's own* `pom.xml` reference used for the primary (unshaded) artifact — turning off the reduced-POM generation avoids corrupting the metadata for the artifact most consumers actually depend on. Gradle Shadow has no direct equivalent switch because Gradle's publication model (Gradle Module Metadata plus a generated POM per publication) lets a shaded and unshaded artifact each carry independently correct dependency metadata without this trade-off — this is a Maven-specific decision point, not one Gradle projects need to make.

### 11. The non-merging alternative: Spring Boot's nested layout

The brief asks this to be established as the counterpoint to merging, per the map's conflict-1 resolution. Spring Boot's own packaging documentation does not describe merging dependencies into the application jar at all; the default and recommended shape is nested, unmerged jars — `BOOT-INF/classes/` for the application's own classes and `BOOT-INF/lib/*.jar` holding every dependency jar intact, loaded through Spring Boot's own launcher classloader. None of findings 1–6 (which are all consequences of *merging* class/resource content from multiple jars into one namespace) apply to this layout, because no merging happens — each dependency jar keeps its own identity.

Spring Boot's efficient-packaging guidance goes further and recommends **extracting** the executable jar to a directory rather than running it packed:

```bash
java -Djarmode=tools -jar my-app.jar extract
java -jar my-app/my-app.jar
```

> "Depending on the size of the jar, running the application from an exploded structure is faster and recommended in production... After startup, you should not expect any differences in execution time between running an executable jar and running an extracted jar." — [docs.spring.io/spring-boot/reference/packaging/efficient.html](https://docs.spring.io/spring-boot/reference/packaging/efficient.html)

The extracted layout is also what makes the AOT cache and Class Data Sharing (CDS) usable, and is what several PaaS platforms (the docs name Cloud Foundry) already do automatically before running an uploaded jar. This is the concrete alternative a rule should point to before defaulting an *application's* distribution shape to a shaded uber jar.

## Normative guidance candidates

1. **Never shade a consumable library** (an artifact declared as a dependency and called through its API). **Rationale**: zero counterexamples across 32 exemplars — every shaded artifact in the corpus is a CLI, a javac/annotation-processor plugin, or an internal vendoring step ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2, conflict-1 in [jvm-topic-map.md](../jvm-topic-map.md)). **Verify**: for any module applying `com.gradleup.shadow`, check whether the module's artifact is declared as a plain dependency (`implementation("g:a:v")`) anywhere else in the org/consumer set — if yes, it is a library and should not shade.

2. **Every shaded jar merging more than one dependency's `META-INF/services/*` MUST call `mergeServiceFiles()`** (Gradle) or configure `ServicesResourceTransformer` (Maven). **Rationale**: the default duplicate strategy drops providers with no build failure (finding 1). **Verify**: `unzip -l <shaded-jar> META-INF/services/\* 2>/dev/null | wc -l` compared against the union of service files across the pre-shade dependency jars — a shortfall means providers were dropped; or statically, `grep -n "mergeServiceFiles\|ServicesResourceTransformer" <build file>` when 2+ input jars carry `META-INF/services/*`.

3. **A shaded jar bundling `log4j-core` (or any dependency with a `Log4j2Plugins.dat`) MUST apply `Log4j2PluginsCacheFileTransformer`** if more than one bundled jar carries the file. **Rationale**: this is a binary cache, not merged by `mergeServiceFiles()` or plain concatenation (finding 2). **Verify**: `unzip -l dep.jar | grep Log4j2Plugins.dat` across bundled deps; count > 1 without the transformer configured is a defect.

4. **A shaded jar bundling Spring Boot autoconfiguration modules MUST NOT rely on `AppendingTransformer` for `META-INF/spring.factories`**; treat `spring.factories` merging as unsolved by Shadow as of 2026-09-12 and either write a key-aware transformer or avoid shading those modules together. `META-INF/spring/*.imports` files ARE safely handled by `mergeServiceFiles()`. **Rationale**: [GradleUp/shadow#1489](https://github.com/GradleUp/shadow/issues/1489) is open; `AppendingTransformer` corrupts keyed Properties merges (finding 3). **Verify**: `grep -rn "spring.factories" <build file>` — if present alongside `AppendingTransformer` and not a custom transformer, flag it.

5. **Every shaded jar MUST exclude `META-INF/*.SF`, `*.DSA`, `*.RSA`, and `*.EC`.** **Rationale**: shading a signed dependency without this throws `SecurityException: Invalid signature file digest for Manifest main attributes` at class-load time, and re-signing the output does not fix it because the original signer's signature is now over the wrong content (finding 4). **Verify**: `unzip -l <shaded-jar> | grep -E 'META-INF/.*\.(SF|DSA|RSA|EC)$'` on the built artifact must return nothing.

6. **A shaded jar consuming any multi-release-jar dependency on Shadow < 9.0.0 MUST exclude `META-INF/versions/*/module-info.class`; on Shadow ≥ 9.0.0 this is the default and only needs a version check.** **Rationale**: [GradleUp/shadow#729](https://github.com/GradleUp/shadow/issues/729)/[#1177](https://github.com/GradleUp/shadow/pull/1177), fixed in the [9.0.0 changelog entry](https://github.com/GradleUp/shadow/blob/main/CHANGELOG.md) dated 2025-08-07. **Verify**: check the applied Shadow version against 9.0.0; below it, `grep -n "module-info" <build file>` for the manual exclude.

7. **Before shading two dependencies together, diff their package sets for overlap; treat any overlap as a blocker requiring relocation, not a merge-configuration problem.** **Rationale**: split packages across module boundaries are a JPMS-level prohibition ([JEP 261](https://openjdk.org/jeps/261)) that no transformer, exclude, or merge strategy resolves (finding 6). **Verify**: `unzip -l dep-a.jar | grep '\.class$' | sed 's#/[^/]*$##' | sort -u` diffed against the same for `dep-b.jar`; any shared package name is a hit.

8. **Do not enable `minimize()` unless every reflectively/SPI-loaded dependency is explicitly excluded via `minimize { exclude(dependency(...)) }`, and CI runs the shaded jar's own functional tests, not just unit tests against the unshaded classpath.** **Rationale**: `minimize()`'s one documented blind spot, dynamic `Class.forName(String)` loading, is exactly how `ServiceLoader` and most reflection frameworks locate implementations ([gradleup.com/shadow/configuration/minimizing](https://gradleup.com/shadow/configuration/minimizing/), finding 7). **Verify**: for every dependency in the shaded artifact, `unzip -l dep.jar | grep META-INF/services` — any hit is a candidate for a required `minimize { exclude(...) }` entry; absence of a functional-test task that exercises the built shaded jar (not the pre-shade `test` task) is a gate gap.

9. **Package relocation is a defensive tool against classpath collision with the consumer's environment, never a default or cosmetic step — apply it only to dependencies with a documented history of version conflicts (Guava, ASM, protobuf, Netty are the corpus's real cases).** **Rationale**: only 6/32 exemplars relocate anything, and every real use is defensive (finding 8). **Verify**: `grep -n "relocate(" <build file>` — each hit should have a comment or commit message naming the specific collision it prevents; a relocation with no stated reason is a maintenance liability, not a safety measure.

10. **If the shaded artifact is published under its library's normal (non-classified) coordinates, `createDependencyReducedPom` MUST stay at its default (`true`); if it is published under a separate classifier alongside an unshaded primary artifact, set it to `false`.** **Rationale**: the reduced POM prevents duplicate/version-skewed classes at the consumer for the first shape, and describes the wrong artifact's dependencies for the second (finding 10). **Verify**: read the `shadedClassifierName`/classifier configuration alongside `createDependencyReducedPom` — a non-empty classifier with the flag left at its Maven default is worth a second look, following `error-prone`'s explicit override as the precedent.

11. **For an application (not a library, CLI, or plugin), default the distribution shape question to "does this run on Spring Boot" before reaching for shading**; Spring Boot's own nested `BOOT-INF/lib` layout plus `java -Djarmode=tools -jar app.jar extract` sidesteps every finding in this taxonomy because it never merges. **Rationale**: Spring Boot's own docs recommend the extracted layout over any merged jar for production (finding 11). **Verify**: `grep -n "org.springframework.boot" <build file>` — if the Spring Boot Gradle plugin is applied and a `shadowJar`/`bootJar` coexist, question why both are needed.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts / N/A |
|---|---|---|
| 1 (never shade a library) | All 32 exemplars: `uber__NullAway@519a1bb826` shades `jar-infer-cli`/`jdk-javac-plugin`/`astubx-generator-cli` but never `nullaway` itself; `pinterest__ktlint@4c933394a3` shades `ktlint-cli` not the ruleset libs; `detekt__detekt@45672efb8b` shades `detekt-cli` not `detekt-api` ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2) | none found |
| 2 (`mergeServiceFiles()` MUST) | `uber__NullAway@519a1bb826:jar-infer/jar-infer-cli/build.gradle:39`; `pinterest__ktlint@4c933394a3:ktlint-cli/build.gradle.kts:18`; `detekt__detekt@45672efb8b:detekt-cli/build.gradle.kts:68`; `grpc__grpc-java@fc4314419d:netty/shaded/build.gradle:103`; `junit-team__junit-framework` and `google__dagger` also hit it (9/32 total, [pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2) | `apache__kafka@940c100fab`'s shaded build-tooling submodule uses `com.gradleup.shadow` with no `mergeServiceFiles` hit ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) row 226-233) — not verified whether it bundles 2+ services-contributing deps, flagged as unconfirmed rather than a violation |
| 3 (Log4j2 transformer) | none of the 32 exemplars bundle `log4j-core` inside a shaded jar (no hit for `Log4j2Plugins` in any build file) | N/A — no exemplar exercises this path; guidance is sourced entirely from Shadow's own docs, not corroborated by the corpus |
| 4 (spring.factories no built-in transformer) | none of the 32 exemplars shade Spring Boot autoconfiguration modules together (spring-boot itself, 383 `bootJar` hits, never combines with `com.gradleup.shadow`, [pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2) | N/A — corroborated by the upstream issue tracker, not the corpus |
| 5 (signature exclude) | not directly observed in any of the 32 exemplars' `exclude(` calls for `.SF`/`.DSA`/`.RSA`/`.EC` specifically | none of the corpus's shaded deps are known to be signed jars; sourced from `melix/jmh-gradle-plugin#5` and its own current fix, `me.champeau.jmh.JMHPlugin:84,258` |
| 6 (multi-release module-info) | `pinterest__ktlint@4c933394a3` and `detekt__detekt@45672efb8b` both bundle `kotlin-compiler-embeddable`, which is not itself a known MRJAR-with-module-info case in this corpus; no direct hit found | N/A for this corpus; sourced from `GradleUp/shadow#729`/`#1177` and the 9.0.0 changelog |
| 6 (split packages) | none of the exemplars' shaded modules exhibit an overlapping-package pair (`jar-infer-cli`, `ktlint-cli`, `detekt-cli` each bundle a disjoint dependency set by construction) | N/A — a reading heuristic, not something the corpus's shading modules currently trigger |
| 7 (`minimize()` precondition) | `google__dagger@4fbc045d2b` and `apache__kafka@940c100fab` both hit `relocate(` and are shading tools, not observed using `minimize()` in the audited files ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md)); no exemplar in the corpus was found configuring `minimize()` at all | none found using `minimize()`, so no exemplar violates or corroborates the precondition directly — the corpus's restraint (nobody minimizes) is itself consistent with candidate 8's caution |
| 9 (relocation is defensive) | `grpc__grpc-java@fc4314419d:netty/shaded/build.gradle:95-101` relocates `io.grpc.netty`/`io.netty` to avoid colliding with a consumer's own Netty; `detekt__detekt@45672efb8b:detekt-rules-ktlint-wrapper/ktlint-repackage/build.gradle.kts:14` relocates `org.jetbrains.kotlin.com.intellij` to `com.intellij` to avoid an IntelliJ-platform classpath collision | `google__error-prone@c1f99ad5d3` does **not** relocate at all (correction to the wave-1 map, finding 8) — cited here as a corrected data point, not a violation |
| 10 (dependency-reduced POM) | `google__error-prone@c1f99ad5d3:core/pom.xml:400-441` sets `createDependencyReducedPom = false` with `shadedClassifierName = with-dependencies`, exactly matching the "classifier + unshaded primary" precondition for turning it off; root `pom.xml:105-116` sets `dependencyReducedPomLocation` in `pluginManagement` for the (default-true) case elsewhere in the reactor | none found violating — no exemplar publishes a shaded jar under normal coordinates with the flag forced off |
| 11 (Spring Boot nested layout) | `spring-projects__spring-boot@93b23c40c2` — the framework whose own docs this candidate cites — ships 383 `bootJar`/boot-plugin hits and 0 combination with `com.gradleup.shadow` anywhere in the repo ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2) | none found |

## AI-agent angle

- **Reflexively reaching for `com.github.johnrengelman.shadow`.** This was the plugin id before the 2023 maintainer handoff; the current id is `com.gradleup.shadow` and has been for every actively-maintained exemplar except `google__dagger@4fbc045d2b`, which still carries one legacy hit alongside its migrated modules ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md): `com.gradleup.shadow` 12/32 vs `com.github.johnrengelman.shadow` 1/32). **Check**: `grep -rn "johnrengelman" *.gradle*` — any hit in new code is a training-data-era artifact, not a deliberate legacy pin.
- **Assuming `minimize()` is always a safe size optimization.** An LLM trained on tutorials that show `minimize()` as a one-line size win, with no exclude configuration, will reproduce that shape verbatim — it compiles and runs the happy path, then breaks in production the first time a reflectively-loaded class is hit. **Check**: any `minimize()` call with zero accompanying `minimize { exclude(...) }` entries, in a project that bundles any dependency with a `META-INF/services/*` entry, is a red flag — `grep -A3 "minimize()" <build file>` should show at least one exclude when the shaded deps include an SPI-using library.
- **Copy-pasting the three-extension signature exclude (`.SF`/`.DSA`/`.RSA`) and omitting `.EC`.** This is the exact shape of jmh-gradle-plugin's own upstream fix ([finding 4](#4-the-signed-jar-securityexception)), so an LLM trained on that code (or the many blog posts copying it) will reproduce the same gap. **Check**: `grep -n "\.RSA" <build file>` without an adjacent `.EC` in the same exclude list.
- **Treating `mergeServiceFiles()` as sufficient for Spring Boot autoconfiguration shading.** A model may pattern-match "merge conflicting META-INF files" to "call mergeServiceFiles" without distinguishing line-list files (`*.imports`, correctly handled) from keyed Properties files (`spring.factories`, not handled) — the shapes look similar in file listings but are not. **Check**: if the build shades a Spring Boot starter/autoconfigure module and the only merge configuration present is `mergeServiceFiles()`, verify the shaded jar's `META-INF/spring.factories` (if any dependency still ships one — legacy pre-2.7 Spring Boot modules do) actually contains every expected key by unzipping and inspecting it, not by trusting the build succeeded.
- **Hallucinating a `SpringTransformer` or `SpringBootTransformer` class that Shadow ships.** Because the *need* is well-documented (the open issue, blog posts, Stack Overflow answers describing hand-rolled fixes), a model may assert Shadow has solved this natively when it has not, as of 2026-09-12 ([GradleUp/shadow#1489](https://github.com/GradleUp/shadow/issues/1489) still open). **Check**: `gradleup.com/shadow` search / the plugin's `transformers` package listing for any class name containing "Spring" — none exists; treat any generated code that references one as a hallucination.
- **Assuming `google/error-prone` relocates packages when shading**, because this is a widely-repeated claim (it appears in this program's own wave-1 map before correction) about a well-known, security-adjacent tool ("it loads into javac, so of course it relocates"). The actual mechanism is version-pinned artifact selection with no relocation at all ([finding 8](#8-relocation-what-it-is-and-what-it-is-not)). **Check**: before citing error-prone as a relocation exemplar, `grep -n "relocation\|relocate" core/pom.xml` in the actual repository at the cited SHA — a plain `<relocation>` hit inside `<distributionManagement>` is not shade-plugin relocation.

## Contested / evolving

- **Whether Shadow should ship a first-party Spring transformer.** [GradleUp/shadow#1489](https://github.com/GradleUp/shadow/issues/1489) has sat open since 2025-06-26 with the reporter volunteering a Groovy-averse partial implementation; there is no maintainer commitment visible as of 2026-09-12. Direction: unresolved, worth re-checking before any rule asserts a fixed answer past this date.
- **The `preserveFileTimestamps` Gradle property vs. hand-written `Transformer` parameter naming collision.** `google__dagger@4fbc045d2b:tools/shader/build.gradle:72` and `grpc__grpc-java@fc4314419d:netty/shaded/build.gradle:176-179` both define a custom `Transformer.modifyOutputStream(ZipOutputStream, boolean preserveFileTimestamps)` method — a parameter name that happens to match Shadow's real `preserveFileTimestamps` archive property, which is why a naive repo-wide grep for that string overcounts real usage by treating a local variable name as a build-level reproducibility setting ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) line 178, confirming the brief's own warning). Not a contested practice, but a durable grep trap this taxonomy's own "Test against" instructions flagged correctly — worth keeping in the depth file as a named caveat rather than assuming future greps will avoid it.
- **Whether shading is ever appropriate for a Gradle plugin's own runtime dependencies.** [gradle-canonical.md](../jvm-topic-map/gradle-canonical.md) (per the wave-1 map's conflict-1) notes `com.gradle.plugin-publish` auto-applies `com.gradleup.shadow` since 1.0.0, making shading the *sanctioned* path for plugin authors specifically — a genuinely different answer from "never shade a library," and one this dive's scope (merged-jar failure taxonomy) does not adjudicate; `gradle-build/plugin-authoring.md` (`GRADLE-PLUG`) owns that decision.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [gradleup.com/shadow/](https://gradleup.com/shadow/) | Shadow plugin official docs, landing page | Current, Shadow 9.6.1 (2026-07-22) | Plugin id, version floors, primary-use-case framing |
| [gradleup.com/shadow/configuration/merging/](https://gradleup.com/shadow/configuration/merging/) | Shadow official docs, merging configuration | Current | `mergeServiceFiles()`, `path=`, per-service exclude, `AppendingTransformer`, `Log4j2PluginsCacheFileTransformer`, default duplicate strategy |
| [gradleup.com/shadow/configuration/relocation/](https://gradleup.com/shadow/configuration/relocation/) | Shadow official docs, relocation configuration | Current | `relocate()` syntax, include/exclude, auto-relocation |
| [gradleup.com/shadow/configuration/minimizing/](https://gradleup.com/shadow/configuration/minimizing/) | Shadow official docs, minimizing configuration | Current | `minimize()`'s one documented blind spot (`Class.forName(String)`) |
| [gradleup.com/shadow/configuration/filtering/](https://gradleup.com/shadow/configuration/filtering/) | Shadow official docs, filtering configuration | Current | `exclude()`/`include()` syntax for arbitrary file patterns |
| [GradleUp/shadow CHANGELOG.md](https://github.com/GradleUp/shadow/blob/main/CHANGELOG.md) | Shadow's own changelog, primary source | Fetched 2026-09-12, covers through 9.6.1 | Dates the module-info-exclusion default to 9.0.0 (2025-08-07) |
| [GradleUp/shadow#729](https://github.com/GradleUp/shadow/issues/729) | Shadow issue tracker | Opened against 7.1.0/Gradle 7.3, closed by #1177 | Original report of module-info leaking from multi-release folders |
| [GradleUp/shadow#1489](https://github.com/GradleUp/shadow/issues/1489) | Shadow issue tracker, open feature request | Opened 2025-06-26, open as of 2026-09-12 | Authoritative "no built-in Spring transformer yet" evidence, with the exact file list and format nuances |
| [melix/jmh-gradle-plugin#5](https://github.com/melix/jmh-gradle-plugin/issues/5) | jmh-gradle-plugin issue tracker | Historical report, closed | Canonical signed-jar `SecurityException` report and root cause |
| [melix/jmh-gradle-plugin `JMHPlugin.groovy`](https://github.com/melix/jmh-gradle-plugin/blob/master/src/main/groovy/me/champeau/jmh/JMHPlugin.groovy) | jmh-gradle-plugin source, primary | Current `master` | Live reference fix for the signed-jar issue; shows the common `.EC`-omission gap |
| [maven.apache.org/plugins/maven-shade-plugin/](https://maven.apache.org/plugins/maven-shade-plugin/) | Maven Shade plugin official docs, landing page | Current, 3.6.2 | Plugin overview and goal |
| [maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html](https://maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html) | Maven Shade official docs, transformers | Current | Full transformer catalogue with XML examples |
| [maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html](https://maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html) | Maven Shade official docs, goal parameters | Current | `minimizeJar`, `createDependencyReducedPom` (default `true`), `artifactSet`, `filters` |
| [docs.spring.io/spring-boot/reference/packaging/efficient.html](https://docs.spring.io/spring-boot/reference/packaging/efficient.html) | Spring Boot official reference docs | Current | The non-merging nested-jar/extracted-layout alternative |
| [openjdk.org/jeps/261](https://openjdk.org/jeps/261) | JEP 261, the Java Platform Module System, primary spec source | Normative, JDK 9-origin, still governing | Authoritative statement of the split-package prohibition that no shading tool can override |
| `google/error-prone@c1f99ad5d3` (`core/pom.xml`, `type_annotations/pom.xml`) | Exemplar corpus, primary reading | Pinned SHA, 2026-09-05 fetch | Grounds the dependency-reduced-POM and relocation-correction findings against an actual build file, not a grep |
| `uber/NullAway@519a1bb826`, `pinterest/ktlint@4c933394a3`, `detekt/detekt@45672efb8b`, `grpc/grpc-java@fc4314419d` (shading modules) | Exemplar corpus, primary reading | Pinned SHAs, 2026-09-05 fetch | Grounds `mergeServiceFiles()`/relocation citations in real, currently-building code rather than the audit's grep counts |
| [jvm-audit/exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md) | This program's own wave-1 audit | 2026-09-05 | Axis 2 counts (6/32 relocate, 9/32 mergeServiceFiles, 4/32 maven-shade-plugin) and the `preserveFileTimestamps` false-positive note |

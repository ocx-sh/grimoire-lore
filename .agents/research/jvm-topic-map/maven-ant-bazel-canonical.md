---
title: Maven, Ant and Bazel Java/Kotlin — canonical documentation survey
corpus: "Maven guides + POM/settings reference + plugins index + Maven 4 whatsnew; Central Portal publishing docs; Apache Ant manual; rules_java, rules_jvm_external, rules_kotlin, contrib_rules_jvm (Bazel Java/Kotlin rulesets)"
agent: jvm-topic-map-scout-maven-ant-bazel
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 26
scope: |
  Covers: Maven's own documentation (guides, POM/settings reference, core plugin
  index and key plugin pages, Maven 4 changes, ASF parent POM, Wrapper,
  reproducible builds), Maven Central publishing via the Central Portal and the
  OSSRH sunset, the Apache Ant manual as a recognise-and-migrate source (not an
  authoring guide), and the three Bazel rulesets that fill the gap the sibling
  Bazel program declared out of scope: rules_java, rules_jvm_external,
  rules_kotlin, plus contrib_rules_jvm.
  Does not cover: Gradle (a different scout's corpus), generic Bazel mechanics
  (bzlmod, hermeticity, remote cache, CI, flags — owned by the sibling
  bazel-quality topic map), or any fleet-repo measurement (the fleet has zero
  JVM code; this file is pure canonical-docs survey).
---

## Table of contents

- [Summary](#summary)
- [Survey](#survey)
  1. [Maven guides index](#1-maven-guides-index)
  2. [The POM reference](#2-the-pom-reference)
  3. [The build lifecycle](#3-the-build-lifecycle)
  4. [The dependency mechanism — mediation and scopes](#4-the-dependency-mechanism--mediation-and-scopes)
  5. [settings.xml reference](#5-settingsxml-reference)
  6. [Core plugins index and versions](#6-core-plugins-index-and-versions)
  7. [maven-compiler-plugin](#7-maven-compiler-plugin)
  8. [maven-surefire-plugin](#8-maven-surefire-plugin)
  9. [maven-shade-plugin](#9-maven-shade-plugin)
  10. [maven-enforcer-plugin](#10-maven-enforcer-plugin)
  11. [Maven 4 — what's new](#11-maven-4--whats-new)
  12. [Reproducible builds guide](#12-reproducible-builds-guide)
  13. [Maven Wrapper](#13-maven-wrapper)
  14. [The ASF parent POM](#14-the-asf-parent-pom)
  15. [Central Portal publishing](#15-central-portal-publishing)
  16. [OSSRH end-of-life](#16-ossrh-end-of-life)
  17. [Apache Ant manual — structure and core concepts](#17-apache-ant-manual--structure-and-core-concepts)
  18. [Ant javac task](#18-ant-javac-task)
  19. [Ant signjar task](#19-ant-signjar-task)
  20. [Gradle's ant.importBuild](#20-gradles-antimportbuild)
  21. [rules_java — the Java toolchain model](#21-rules_java--the-java-toolchain-model)
  22. [rules_jvm_external README](#22-rules_jvm_external-readme)
  23. [rules_kotlin — toolchain, KSP, workers](#23-rules_kotlin--toolchain-ksp-workers)
  24. [contrib_rules_jvm](#24-contrib_rules_jvm)
- [Candidate topics](#candidate-topics)
- [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
- [Contested](#contested)
- [Sources](#sources)

## Summary

- Maven's dependency mediation is **"nearest wins" by tree depth, not by version**, with `dependencyManagement` taking precedence over mediation entirely — a reviewer must check depth, not just version numbers, when explaining why a transitive got picked.
- The `<systemPath>` element in a POM "is used _only_ if the dependency `scope` is `system`. Otherwise, the build will fail if this element is set" — a footgun the reference itself calls out.
- Maven 4 makes declaring the same plugin twice in one `<build>` a **hard build failure**, where Maven 3 only warned — silent-until-upgrade breakage for old POMs.
- Maven 4 splits the POM into a **build POM** (model 4.1.0, full config, stays in source control) and a **consumer POM** (model 4.0.0, flattened, no parent refs, published) — the Flatten Maven Plugin's job is now core, but disabled by default (`maven.consumer.pom.flatten=true`).
- Maven 4 adds a dedicated **`bom` packaging type**, separate from `pom` parent packaging, and BOMs can be imported by `classifier` (`<classifier>bom</classifier>`).
- Maven 4 requires **Java 17** to run Maven itself, independent of what Java version a project compiles against.
- Reproducible builds in Maven hinge on one property, `project.build.outputTimestamp` (ISO-8601, e.g. `2023-01-01T00:00:00Z`) — and as of **Maven 4.0.0-beta-5** reproducible mode is the default without touching the POM at all.
- OSSRH (`oss.sonatype.org` / `s01.oss.sonatype.org`) reached end-of-life **2025-06-30**; all namespaces were migrated to the Central Portal, and a compatibility "OSSRH Staging API Service" translates a subset of the old Nexus 2 API — but the Portal (`central-publishing-maven-plugin`) is the only forward-looking path.
- The `central-publishing-maven-plugin` supports SNAPSHOT publishing only **as of its own 0.7.0** — treating SNAPSHOT support as always-available in Central Portal docs is a version-specific mistake.
- Maven Central publishing is **immutable by policy**: "you will not be able to remove/update/modify your components" once published — this is a hard non-negotiable a release-runbook skill must state up front.
- Ant's `javac` task defaults `includeantruntime` in an environment-sensitive way; the manual itself says "It is usually best to set this to false so the script's behavior is not sensitive to the environment in which it is run" — an unset `includeantruntime` is a portability bug waiting to happen.
- Gradle's `ant.importBuild()` **disables the configuration cache** the moment an Ant build is imported — a load-bearing incompatibility for any migration-in-place strategy that keeps `build.xml` alive alongside Gradle.
- The ASF parent POM (`org.apache:apache`) enforces `minimalMavenBuildVersion` (default 3.9) and `minimalJavaBuildVersion` via the enforcer plugin, and — since its own version 22 — expects its managed plugin versions to be Reproducible-Builds compliant.
- Bazel's Java toolchain model runs **two parallel flag pairs**: `--java_language_version`/`--java_runtime_version` for application code vs `--tool_java_language_version`/`--tool_java_runtime_version` (defaulting to `11`/`remotejdk_11`) for the build tools themselves — conflating the two is a common misconfiguration.
- `rules_jvm_external`'s lock file (`maven_install.json`) is a **build input, not a cache**: the README's own words are "rules_jvm_external will fail the build and notify you if a repin is ever required" once `fail_if_repin_required = True` is set — this maps directly onto Maven's dependency-lock-equivalent gap (Maven has no first-class lockfile; enforcer + BOMs are the closest analogue).
- `rules_jvm_external` warns explicitly that naive `java_import` of Kotlin jars breaks inlined functions because the native `ijar` tool "does not know about kotlin metadata with respect to inlined functions, and will remove method bodies inappropriately" — a Bazel + Kotlin interop trap that has nothing to do with Gradle/Maven.
- `rules_kotlin`'s `kt_kotlinc_options` defaults `x_lambdas` to `"class"`, which **differs from Kotlin 2.x's own default and Gradle's default of `"indy"`** (invokedynamic) — a cross-build-system behavioral divergence for the same compiler.
- Persistent and multiplex workers are **on by default** for `KotlinCompile`, `KotlinKsp2`, and `JdepsMerge` in rules_kotlin — opting out requires an explicit `--strategy=<mnemonic>=local`.
- `rules_jvm_external`'s versionless `artifact()` helper macro trades ergonomics for tooling friction: the README states it "makes BUILD file refactoring with tools like `buildozer` more difficult, because the macro hides the actual target label at the syntax level."
- contrib_rules_jvm's JUnit5 runner installs a Java agent specifically to **prevent `System.exit()` calls** from a test silently killing the whole Bazel test worker.
- The Maven ↔ Gradle ↔ Bazel equivalence for "lockfile" is asymmetric: Bazel's `maven_install.json` is a mandatory, repin-gated pinning file; Maven has no default equivalent (enforcer's `dependencyConvergence`/`requireUpperBoundDeps` are opt-in, advisory-until-configured rules, not a generated lockfile) — a rule set porting Bazel's rigor to Maven needs the enforcer plugin explicitly wired in, it is not the default.
- Maven's own guide index lists **51 distinct guides/miniguides**, spanning getting-started, introductions, MiniGuides for repositories/security/manifests/classloading/toolchains, and plugin-development guides — this is a large surface an AI-config rule should route into task-worded pointers, not restate.

## Survey

### 1. Maven guides index

[https://maven.apache.org/guides/index.html](https://maven.apache.org/guides/index.html)

Enumerates 51 guides in categories: Getting Started ("Getting Started in 5 Minutes" at `getting-started/maven-in-five-minutes.html`, "Getting Started in 30 Minutes"), Introduction guides (standard directory layout, repositories, archetypes, dependency mechanism, optional/exclusion dependencies, the build lifecycle, the POM, profiles, plugins, **plugin prefix resolution** at `introduction/introduction-to-plugin-prefix-mapping.html`), Site Documentation, Configuration (`guide-configuring-plugins.html`, `guide-creating-archetypes.html`), Plugin Development (`guide-java-plugin-development.html`, plugin documentation standard, testing dev plugin versions), Repository Management (installing/deploying 3rd-party jars, multiple repositories, large-scale centralized deployments, mirror settings, deployment/security settings, proxies, authenticated HTTPS, artifact relocation), Build and Development (reproducible builds, assemblies, archive configuration, generating sources, manifests, **Maven classloading**, multi-module builds, the release plugin, **using Ant with Maven**, Modello, extensions, building for different environments, **toolchains**, injecting POM properties via settings, bash auto-completion, naming conventions, single-source-directory override), and Maven's own development guides.

### 2. The POM reference

[https://maven.apache.org/pom.html](https://maven.apache.org/pom.html)

Full element inventory under `<project>`: `modelVersion` (only `4.0.0` supported pre-Maven-4), `groupId`/`artifactId`/`version`, `packaging` (default `jar`; valid values `pom`, `jar`, `maven-plugin`, `ejb`, `war`, `ear`, `rar`), `parent`, `modules`, `dependencies`, `dependencyManagement`, `properties`, `build`, `reporting`, project-info elements (`name`, `description`, `url`, `inceptionYear`, `licenses`, `organization`, `developers`, `contributors`), environment elements (`issueManagement`, `ciManagement`, `mailingLists`, `scm`, `prerequisites`, `repositories`, `pluginRepositories`, `distributionManagement`), `profiles`.

Dependency scopes documented: `compile` (default, all classpaths, transitive), `provided` (compile+test classpath only, not transitive), `runtime` (runtime+test, not compile), `test` (test-only, not transitive), `system` (like provided but never repository-resolved). Exact quote on the footgun: **"`systemPath`... is used _only_ if the dependency `scope` is `system`. Otherwise, the build will fail if this element is set."**

`<build>` warns: **"the `scriptSourceDirectory` is nowhere used in Maven and is obsolete."**

Plugin declaration rule, quoted: **"It is not allowed to declare the same plugin multiple times in the same build. Multiple declarations of the same plugin result in warnings using Maven 3 and fail the build using Maven 4."**

Configuration inheritance uses `combine.children` (`merge` default, or `append`) and `combine.self` (`merge` default, or `override`) attributes on child elements — the mechanism a reviewer needs to explain why a child POM's plugin config didn't override the parent's.

Version range syntax: `1.0` (soft), `[1.0]` (hard exact), `(,1.0]`, `[1.2,1.3]`, `[1.0,2.0)`, `[1.5,)`, union ranges like `(,1.0],[1.2,)`, and exclusion ranges like `(,1.1),(1.1,)`.

Inherited-vs-not: inherited — `groupId`, `version`, project-info fields, `properties`, `dependencyManagement`, `dependencies`, `repositories`, `pluginRepositories`, `build`; **not** inherited — `artifactId`, `name`, `prerequisites`, `profiles` (though active-profile *effects* are inherited).

### 3. The build lifecycle

[https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)

Three built-in lifecycles: `default`, `clean`, `site`. The `default` lifecycle's 23 phases in order: `validate, initialize, generate-sources, process-sources, generate-resources, process-resources, compile, process-classes, generate-test-sources, process-test-sources, generate-test-resources, process-test-resources, test-compile, process-test-classes, test, prepare-package, package, pre-integration-test, integration-test, post-integration-test, verify, install, deploy`.

Explicit guidance against invoking hyphenated intermediate phases directly: calling `integration-test` from the command line skips report generation and can leave a container environment (Tomcat, Docker) "in a hanging state." The recommended entry point is `mvn verify`, which runs the full chain including cleanup.

### 4. The dependency mechanism — mediation and scopes

[https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)

Mediation is **"nearest definition"**: quoted — "Maven picks the 'nearest definition'. That is, it uses the version of the closest dependency to your project in the tree of dependencies." Depth wins over version number; ties break on declaration order. An explicit direct dependency at the project's own POM level always wins regardless of depth elsewhere in the graph.

Scope propagation table: `compile`-scope dependencies of a `compile`-scope dependency propagate as `compile`; `provided` only propagates if the downstream is also `provided` (otherwise omitted); `runtime` propagates as `runtime`; `test`-scope dependencies never propagate.

`dependencyManagement` precedence, in order: (1) current POM's `dependencyManagement`, (2) parent POM's `dependencyManagement`, (3) mediation ("nearest definition") — i.e. an explicit `dependencyManagement` entry always beats tree-depth mediation, even from a distant parent.

### 5. settings.xml reference

[https://maven.apache.org/settings.html](https://maven.apache.org/settings.html)

Top-level elements: `localRepository` (default `${user.home}/.m2/repository`), `interactiveMode` (default `true`), `offline` (default `false`), `pluginGroups` (implicit `org.apache.maven.plugins` and `org.codehaus.mojo`), `servers`, `mirrors`, `proxies`, `profiles`, `activeProfiles`.

Security note, quoted: **"The `passphrase` and `password` elements may be externalized in the future, but for now they must be set plain-text in the `settings.xml` file"** — with the encryption guide (`guide-encryption.html`) as the mitigation.

### 6. Core plugins index and versions

[https://maven.apache.org/plugins/index.html](https://maven.apache.org/plugins/index.html)

Snapshot of current versions (as fetched 2026-09-05): `maven-clean-plugin` 3.5.0, `maven-compiler-plugin` 3.16.0 (with a 4.x line at `4.0.0-beta-5`), `maven-deploy-plugin` 3.1.4, `maven-failsafe-plugin` 3.6.0-M1, `maven-install-plugin` 3.1.4, `maven-resources-plugin` 3.5.0, `maven-site-plugin` 3.22.0, `maven-surefire-plugin` 3.6.0-M1, `maven-jar-plugin` 3.5.1, `maven-war-plugin` 3.5.1, `maven-shade-plugin` 3.6.2, `maven-source-plugin` 3.4.0, `maven-jlink-plugin` 3.3.0, `maven-jmod-plugin` 3.0.0, `maven-checkstyle-plugin` 3.6.0, `maven-javadoc-plugin` 3.12.0, `maven-jdeps-plugin` 3.2.0, `maven-jxr-plugin` 3.6.0, `maven-pmd-plugin` 3.28.0, `maven-project-info-reports-plugin` 3.9.0, `maven-antrun-plugin` 3.2.0, `maven-artifact-plugin` (referenced for `compare`/`check-buildplan`), `maven-archetype-plugin` 3.4.1, `maven-assembly-plugin` 3.8.0, `maven-dependency-plugin` 3.11.0, `maven-enforcer-plugin` 3.6.3, `maven-gpg-plugin` 3.2.8, `maven-help-plugin` 3.5.2, `maven-invoker-plugin` 3.10.1, `maven-jarsigner-plugin` 3.1.0, `maven-plugin-plugin` 3.15.2, `maven-release-plugin` 3.3.1, `maven-remote-resources-plugin` 3.3.0, `maven-scm-plugin` 2.2.1, `maven-scm-publish-plugin` 3.3.0, `maven-toolchains-plugin` 3.3.0, `maven-wrapper-plugin` 3.3.4. `versions` and `flatten` are MojoHaus (not Apache-namespace) plugins, not on this index page; `jpackage` was not present on the fetched index either — both need a direct MojoHaus/plugin-page check if a rule cites their exact current version.

### 7. maven-compiler-plugin

[https://maven.apache.org/plugins/maven-compiler-plugin/](https://maven.apache.org/plugins/maven-compiler-plugin/)

Version 3.16.0. Quoted default-version warning: **"At present the default `source` and the default `target` setting are both `8`, independently of the JDK you run Maven with. You are highly encouraged to change these defaults by setting the `release` option."** Key parameters: `release` (preferred over `source`/`target`), `annotationProcessorPaths`, `showWarnings`, `failOnWarning`, `compilerArgs`, `fork`. Goals: `compiler:compile` (bound to `compile` phase), `compiler:testCompile` (bound to `test-compile`).

### 8. maven-surefire-plugin

[https://maven.apache.org/plugins/maven-surefire-plugin/](https://maven.apache.org/plugins/maven-surefire-plugin/)

Version 3.6.0-M1 — still a milestone, not GA, as of this survey date. Parameters: `parallel`, `forkCount`, `reuseForks`, `argLine`, include/exclude patterns; a dedicated example page for "Using JUnit 5 Platform" confirms JUnit Platform provider support exists as a documented, first-class path. Default report location: `${basedir}/target/surefire-reports/TEST-*.xml`.

### 9. maven-shade-plugin

[https://maven.apache.org/plugins/maven-shade-plugin/](https://maven.apache.org/plugins/maven-shade-plugin/)

Version 3.6.2. Purpose stated directly: "packages an artifact into an uber-jar... and provides the capability to shade (rename) the packages of some dependencies." Features: relocation (`ShadeRelocation`), `ServicesResourceTransformer` and `ManifestResourceTransformer`, filters/excludes for uber-jar content selection, and a dependency-reduced POM generation path. Bound goal: `shade:shade` at the `package` phase.

### 10. maven-enforcer-plugin

[https://maven.apache.org/enforcer/maven-enforcer-plugin/](https://maven.apache.org/enforcer/maven-enforcer-plugin/)

Version 3.6.3. Built-in rules referenced by name: `requireJavaVersion`, `requireMavenVersion`, `banDuplicatePomDependencyVersions`, `dependencyConvergence`, `requireUpperBoundDeps`, `banCircularDependencies`, `requireReleaseDeps`, and (from the ASF parent POM survey below) `requirePluginVersions` with its `banLatest`/`banRelease`/`banSnapshots` sub-flags. Single bound goal: `enforcer:enforce`.

### 11. Maven 4 — what's new

[https://maven.apache.org/whatsnewinmaven4.html](https://maven.apache.org/whatsnewinmaven4.html)

Requires Java 17 to run Maven itself. Splits POM into **build POM** (model `4.1.0`, full config) and **consumer POM** (model `4.0.0`, flattened, no parent, only compile/runtime deps, no plugin config) — consumer-POM flattening is opt-in via `maven.consumer.pom.flatten=true`. New artifact/packaging types for JAR dependencies: `jar` (heuristic classpath/module-path placement), `classpath-jar`, `modular-jar`, `processor`, `classpath-processor`, `modular-processor`. New `bom` packaging type, distinct from `pom`, with classifier-based BOM imports (`<type>pom</type><classifier>bom</classifier><scope>import</scope>`). Terminology shift: "modules" → "subprojects" (new `<subprojects>` element replaces deprecated `<modules>`), and root-directory properties `${project.rootDirectory}`, `${session.topDirectory}`, `${session.rootDirectory}` plus a `<project root="true">` marker attribute. New `<sources>` element replaces hardcoded `sourceDirectory`/`testSourceDirectory`. Automatic subproject discovery when no `<subprojects>` is declared; CI-friendly `${revision}` versioning is now native (no Flatten Maven Plugin needed). Reactor: `--also-make` bug fix (MNG-6863), new `--resume`/`-r` flag, consistent SNAPSHOT timestamps across subprojects, `deployAtEnd=true` by default — recommendation: **use `mvn verify` instead of `mvn clean install`**. New `--fail-on-severity`/`-fos` flag; `-Dmaven.plugin.validation=verbose`. Optional profiles via `-P?nonexistent`; new `<condition>` activation element (MNG-8286). Lifecycle changed from ordered graph to tree: `before:<phase>`/`after:<phase>` with numeric ordering (`before:integration-test[100]`), deprecated `pre-*`/`post-*` phase aliases, new `all`/`each`/`before:all`/`after:all`/`before:each`/`after:each` hook phases; new concurrent builder via `-b concurrent`. Removed Plexus-container DI (deprecated since ~2010) — old Maven-2-style plugins using Plexus DI break; JSR-330 required. Encryption redesigned via `mvnenc` CLI, replacing "password obfuscation." Maven Resolver updated to 2.0+, now hidden behind the new Maven API. New tools: `mvnsh` (Maven Shell, keeps one JVM warm across invocations) and `mvnup` (automated 3→4 migration tool, targets model `4.1.0`).

### 12. Reproducible builds guide

[https://maven.apache.org/guides/mini/guide-reproducible-builds.html](https://maven.apache.org/guides/mini/guide-reproducible-builds.html)

Single controlling property: `project.build.outputTimestamp`, ISO-8601 UTC format (e.g. `2023-01-01T00:00:00Z`). As of **Maven 4.0.0-beta-5**, reproducible mode is on by default with no POM change required; before that version the property must be set explicitly. Migration command: `mvn artifact:check-buildplan`. Verification: `mvn clean verify artifact:compare`, with a `-Dreference.repo=<staging-url>` variant for comparing against a staged release.

### 13. Maven Wrapper

[https://maven.apache.org/wrapper/](https://maven.apache.org/wrapper/)

Bootstrapped via `mvn wrapper:wrapper` (optionally `-Dmaven=<version>`). Creates `.mvn/wrapper/maven-wrapper.properties`, `mvnw`, `mvnw.cmd`. Security: `wrapperSha256Sum` and `distributionSha256Sum` properties in `maven-wrapper.properties` guard against supply-chain tampering of the downloaded wrapper jar and Maven distribution respectively — checksums must be lowercase hex.

### 14. The ASF parent POM

[https://maven.apache.org/pom/asf/](https://maven.apache.org/pom/asf/)

`org.apache:apache` parent enforces, via `maven-enforcer-plugin`: `minimalMavenBuildVersion` (default Maven **3.9**) and `minimalJavaBuildVersion` (defaults to the `javaVersion` property, itself defaulting to **8**). The `javaVersion` property drives `maven.compiler.source`/`target` on JDK 8-and-under, or `maven.compiler.release` on JDK 9+. Plugin versions are pinned via `pluginManagement` using per-plugin properties (`version.<artifactId>`, with special-cased exceptions for `version.apache-resource-bundles`, `version.maven-plugin-tools`, `version.maven-surefire`). **Since version 22**, the parent's managed plugin versions are expected to be Reproducible-Builds compliant, and child POMs can override `project.build.outputTimestamp` to control release timestamps.

### 15. Central Portal publishing

[https://central.sonatype.org/publish/publish-portal-maven/](https://central.sonatype.org/publish/publish-portal-maven/) and [https://central.sonatype.org/publish/requirements/](https://central.sonatype.org/publish/requirements/)

Plugin: `org.sonatype.central:central-publishing-maven-plugin` (version 0.11.0 as fetched), declared with `<extensions>true</extensions>` and `<configuration><publishingServerId>central</publishingServerId></configuration>`. Auth via a `<server>` block in `settings.xml` using a generated token username/password (not your Sonatype login password). `<autoPublish>true</autoPublish>` skips the manual-release step for CI; `<waitUntil>` accepts `validated` (default), `uploaded`, or `published`. SNAPSHOT publishing supported **only as of plugin version 0.7.0** — do not assume it on older pins. Hard requirements from the requirements page, quoted: **"All files deployed need to be signed with GPG/PGP"**; sources jar and javadoc jar are required per artifact jar; MD5 and SHA1 checksums required; POM must declare `name`, `description`, `url`, license(s), developer info, and SCM connection. Immutability, quoted: **"you will not be able to remove/update/modify your components"** once published.

### 16. OSSRH end-of-life

Search-aggregated from [central.sonatype.org/news/20250326_ossrh_sunset/](https://central.sonatype.org/news/20250326_ossrh_sunset/) and [central.sonatype.org/pages/ossrh-eol/](https://central.sonatype.org/pages/ossrh-eol/). OSSRH (backed by Nexus Repository Manager v2, itself EOL) reached end-of-life **2025-06-30**. All OSSRH namespaces were auto-migrated to the Central Portal, oldest accounts first. Legacy `oss.sonatype.org` / `s01.oss.sonatype.org` endpoints are kept alive only through a **compatibility layer** — "the OSSRH Staging API Service" — that translates a subset of the old Nexus 2 API to the new Portal API; it is a bridge for unmigrated tooling, not a long-term target.

### 17. Apache Ant manual — structure and core concepts

[https://ant.apache.org/manual/index.html](https://ant.apache.org/manual/index.html), [https://ant.apache.org/manual/toc.html](https://ant.apache.org/manual/toc.html), [https://ant.apache.org/manual/using.html](https://ant.apache.org/manual/using.html)

Manual structure: Introduction, Installation, Usage, Running Ant, Ant Tasks (single consolidated reference rather than a Core/Optional split at the ToC level), Concepts and Types, Loggers & Listeners, Editor/IDE Integration, Development, Tutorials, API Documentation, License/Support. Core model: a `project` contains `target`s, targets contain `task`s and declare dependency ordering; `property` values are set once and read via `${propertyname}` interpolation; a typical `build.xml` declares properties first, then targets (`init`, `compile`, `dist`, `clean`) whose tasks include `javac`, `jar`, `mkdir`.

### 18. Ant javac task

[https://ant.apache.org/manual/Tasks/javac.html](https://ant.apache.org/manual/Tasks/javac.html)

Attributes relevant to a migration checklist: `srcdir`, `destdir`, `classpath`, `source`, `target`, `release` (JDK 9+, overrides `source`/`target`), `fork` (external javac process), `executable` (explicit javac path when forking), `includeantruntime`. Quoted portability warning: **"It is usually best to set this to false so the script's behavior is not sensitive to the environment in which it is run"** — `includeantruntime` otherwise defaults in an environment-sensitive way (governed by whether `build.sysclasspath` is set), which is exactly the kind of classpath-order/determinism bug this program's brief flags as boring-but-bites.

### 19. Ant signjar task

[https://ant.apache.org/manual/Tasks/signjar.html](https://ant.apache.org/manual/Tasks/signjar.html)

Wraps `jarsigner`. Attributes: `jar`, `alias`, `keystore`, `storepass`, `signedjar` (omit for in-place signing), `lazy` (skip if already signed by that alias, default `false`), `preservelastmodified` (reproducibility: keeps the signed file's mtime equal to the source jar's).

### 20. Gradle's ant.importBuild

[https://docs.gradle.org/current/userguide/ant.html](https://docs.gradle.org/current/userguide/ant.html)

`ant.importBuild("build.xml")` turns every Ant target into a Gradle task, addressable with normal task dependency/`doLast` syntax; a name-transforming variant avoids collisions (`ant.importBuild("build.xml") { "a-" + it }`). Properties/references bridge both ways (`ant.buildDir`, `ant.properties['key']`, `ant.references`). **Explicit, load-bearing limitation, quoted: "importing the Ant build is not supported" with the configuration cache — Gradle disables the configuration cache automatically the moment an Ant build is imported.** This is the single most important fact for any "migrate incrementally, keep Ant alive under Gradle" strategy.

### 21. rules_java — the Java toolchain model

[https://bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java), cross-checked against [bazelbuild/rules_java README.md](https://github.com/bazelbuild/rules_java/blob/master/README.md) (fetched from the local exemplar clone, `bazelbuild__rules_java@4206909b6d`)

Two parallel flag pairs: `--java_language_version`/`--java_runtime_version` for application code (runtime defaults to `local_jdk`), vs `--tool_java_language_version` (default `11`) / `--tool_java_runtime_version` (default `remotejdk_11`) for the build tools that compile Bazel's own machinery. `remotejdk_*` gives hermetic, downloaded JDKs vs `local_jdk`'s system dependency. Compilation runs through **JavaBuilder**, which "patches" `java.compiler`/`jdk.compiler` modules via `--patch_module` and integrates Error Prone (`--javacopt=-Xep:MissingOverride:ERROR` style flags) and strict-deps checking. Header compilation uses `ijar` to strip method bodies down to call signatures for faster incremental builds ("turbine" is the specific header compiler; the fetched page names `ijar` as the mechanism). Configuration surfaces: `--javacopt`/`--jvmopt` flags, or the `default_java_toolchain` macro's `javacopts`/`jvm_opts`/`javabuilder_jvm_opts` attributes, plus `java_package_configuration` for package-scoped overrides. Toolchain resolution note, quoted: "when multiple definitions for the same operating system and CPU architecture are given, the first one is used" — order-dependent resolution registered via `local_java_repository`/`remote_java_repository` in `MODULE.bazel`. `rules_java`'s own release process (`distro/README.md`) shows the minimal `MODULE.bazel` / `WORKSPACE` bootstrap snippet, including the Bazel 8.0–8.3 workaround flag `--repositories_without_autoloads=bazel_features_version,bazel_features_globals` tied to autoload externalization ([bazelbuild/bazel#26119](https://github.com/bazelbuild/bazel/pull/26119)) — direct evidence of the Bazel 9 externalization the frame hypothesizes.

### 22. rules_jvm_external README

[bazel-contrib/rules_jvm_external README.md](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) (fetched from the local exemplar clone, `bazel-contrib__rules_jvm_external@449754dcbb`)

Compatibility policy, quoted: "This project aims to be backwards compatible with the (current LTS - 2) version" — i.e. against Bazel 9 LTS, versions 7/8/9 are supported, and only the last release of each non-LTS line.

Core mechanics: `maven.install()` under bzlmod (`use_extension("@rules_jvm_external//:extensions.bzl", "maven")`), artifacts as `"group:artifact:version"` strings, `repositories` list, `lock_file` (conventionally `maven_install.json`). Pinning is a **three-step, source-controlled process**: add `lock_file`, `touch maven_install.json BUILD.bazel`, then `REPIN=1 bazel run @maven//:pin`. Without pinning, every clean checkout re-resolves and re-fetches with no checksum verification and no cross-workspace sharing; with pinning, Bazel's own downloader caches by SHA-256 and **fully offline builds become possible** after one `bazel fetch @maven//...`.

`fail_if_repin_required = True` turns a stale lock file from a warning into a build failure; repin scoped to just this ruleset via `RULES_JVM_EXTERNAL_REPIN=1 bazel run @maven//:pin`.

Versionless target labels: `foo.bar:baz-qux:1.2.3` → `@maven//:foo_bar_baz_qux` (non-alphanumerics become underscores). BOM support via `maven.install(boms = [...])`. `bazel run @maven//:outdated` lists updatable coordinates. `fetch_sources = True` pulls source jars. `fail_on_missing_checksum` (default effectively true) fails the build on a missing SHA-1/MD5 rather than silently trusting an unverified artifact. Per-artifact `neverlink = "true"` (compile-only, e.g. for `javapoet`), `testonly = "true"` (propagates Bazel's `testonly` bit). `version_conflict_policy` (`"pinned"` vs default "highest wins" for unspecified artifacts) controls how conflicting transitive versions resolve — the direct Bazel analogue of Maven's mediation. `excluded_artifacts` for global exclusion. `strict_visibility`/`strict_visibility_value` hides transitive-only artifacts from direct use. `duplicate_version_warning`: `"none"` to silence, `"error"` to fail the build on duplicate declared artifacts. `generate_compat_repositories = True` produces per-artifact aliasing repos for legacy migration paths. `java_export` is the publish-oriented rule (parallels `maven_publish`); a `kt_jvm_library`-based variant exists for Kotlin. Resolver choice via `resolver` attribute: default `coursier`-backed, or `"maven"` (needs a `pom.xml`, env vars like `RJE_ASSUME_PRESENT` to skip remote-presence checks), or `"gradle"` (explicitly marked **experimental**). Kotlin-specific warning, quoted: naive `java_import` of Kotlin jars "will cause bazel to make an interface-only (`ijar`), or ABI jar, and the native `ijar` tool does not know about kotlin metadata with respect to inlined functions, and will remove method bodies inappropriately." Tooling-friction note on the `artifact()` macro: it "makes BUILD file refactoring with tools like `buildozer` more difficult, because the macro hides the actual target label at the syntax level."

### 23. rules_kotlin — toolchain, KSP, workers

[bazelbuild/rules_kotlin README.md](https://github.com/bazelbuild/rules_kotlin/blob/master/README.md) and [docs/kotlin.md](https://github.com/bazelbuild/rules_kotlin/blob/master/docs/kotlin.md) (fetched from the local exemplar clone, `bazelbuild__rules_kotlin@7c51dd1210`)

Toolchain configured via `define_kt_toolchain(api_version=..., jvm_target=..., language_version=...)`, with `api_version`/`language_version` accepting `"1.9"` through `"2.3"` and `jvm_target` accepting `"1.8"` through `"25"`. Third-party deps come from `rules_jvm_external` or similar; the README explicitly warns to use recent versions because older ones "naively use `java_import`" and break Kotlin inline functions (see §22). `kt_kotlinc_options` and `kt_javac_options` set compiler flags per-target or per-toolchain; documented divergence, quoted: `kt_kotlinc_options` "defaults `x_sam_conversions` to `\"indy\"`, matching the Kotlin compiler's own default, but defaults `x_lambdas` to `\"class\"`, which differs from Kotlin 2.x and Gradle's default of `\"indy\"`" — a cross-tool inconsistency worth flagging to anyone porting Gradle Kotlin flags into a Bazel build. Debug knobs: `kt_trace=1` (full kotlinc command line), `kt_timings=1` (per-step timing). The **Build Tools API** ("a modern compilation interface provided by JetBrains... required for incremental compilation support") is opt-in via `--@rules_kotlin//kotlin/settings:experimental_build_tools_api=true` or `define_kt_toolchain(experimental_build_tools_api=True)`. Persistent + multiplex workers are **on by default** for three action mnemonics: `KotlinCompile`, `KotlinKsp2`, `JdepsMerge`; disable per-mnemonic via `--strategy=<mnemonic>=local`. Experimental transitive-dependency pruning (`--@rules_kotlin//kotlin/settings:experimental_prune_transitive_deps=True`) strips the Kotlin compile classpath down to direct deps only, with an explicit allow-list flag for Maven graphs that must stay transitive. KSP: `kt_ksp_plugin` rule, "officially supported as of rules_kotlin 1.8" (kapt is not mentioned as a first-class rule in this README — a signal that KSP is treated as the modern path and kapt support, if present, is not headline material).

### 24. contrib_rules_jvm

[bazel-contrib/rules_jvm README.md](https://raw.githubusercontent.com/bazel-contrib/rules_jvm/main/README.md) (fetched live; not in the local exemplar corpus)

Complements `rules_java` rather than replacing it. Testing: `java_test_suite` (auto-generates targets from `*Test.java`, JUnit4 and JUnit5), `java_junit5_test` (drop-in `java_test` replacement with tag/engine filtering). Linting integration wraps checkstyle (`checkstyle_config`/`checkstyle_binary`), PMD (`pmd_ruleset`/`pmd_binary`/`pmd_test`, html/text/xml output), and SpotBugs (`spotbugs_config`/`spotbugs_binary`/`spotbugs_test`, configurable effort/filter) as opt-in generated targets via `apple_rules_lint` integration — lint targets are generated alongside `java_library`/`java_binary`/`java_test`/`java_export` wrapper rules, not forced on every target. The JUnit5 runner installs a Java agent specifically to intercept and prevent `System.exit()` calls from inside a test, which would otherwise kill the whole test worker process silently. Requires Java 11+ (Go 1.18+ additionally for the Gazelle plugin, which is the Java extension for Gazelle BUILD-file generation).

## Candidate topics

| # | Topic (question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|---|
| 1 | When does Maven's "nearest wins" mediation pick a version a reviewer wouldn't expect, and how do you force the right one? | Silent version drift is the #1 dependency bug class; the rule (depth, not recency) is counter-intuitive | [Dependency mechanism guide](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) | no | maven | P0 — direct dependency-management correctness gate |
| 2 | Is `dependencyManagement` actually overriding mediation here, or did you just add a coincidentally-matching version? | `dependencyManagement` precedence over mediation is a distinct mechanism from mediation itself; conflating them misdiagnoses fixes | [Dependency mechanism guide](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) | no | maven | P0 |
| 3 | Does this POM ever set `<systemPath>` without `scope=system` — and will that build even run under Maven 4? | Reference itself calls this a hard-fail footgun; easy grep-able check | [POM reference](https://maven.apache.org/pom.html) | no | maven | P1 — mechanical, cheap to check |
| 4 | Does this project declare the same plugin twice across `<build>` and a profile-level `<build>` — a Maven 3 warning that becomes a Maven 4 hard failure? | Direct Maven-3→4 migration breakage the reference documents explicitly | [POM reference](https://maven.apache.org/pom.html); [Maven 4 whatsnew](https://maven.apache.org/whatsnewinmaven4.html) | no | maven | P0 — silent-until-upgrade break |
| 5 | Is this project's `project.build.outputTimestamp` set (or is it relying on pre-4.0.0-beta-5 default nondeterminism)? | Direct reproducible-builds gate; a numeric/format check (ISO-8601, UTC) | [Reproducible builds guide](https://maven.apache.org/guides/mini/guide-reproducible-builds.html) | no | maven | P1 |
| 6 | Should this SDK's BOM use the new Maven-4 `bom` packaging, or the classic `pom`-with-import-scope pattern, for consumer compatibility? | Frame names BOM publishing as load-bearing for the future OCX SDK; the two packagings are NOT interchangeable across Maven 3/4 consumers | [Maven 4 whatsnew](https://maven.apache.org/whatsnewinmaven4.html) | no | sdk / maven | P0 |
| 7 | Does the build assume `mvn clean install` where `mvn verify` (or Maven 4's `deployAtEnd=true` default) is the safer command for a multi-module reactor? | Cross-subproject deploy-ordering correctness; Maven 4 changed the safe default | [Maven 4 whatsnew](https://maven.apache.org/whatsnewinmaven4.html) | no | maven | P1 |
| 8 | Is this library still consumable from Maven even though the fleet builds with Gradle/Bazel — does the published POM (not the Gradle module metadata) carry correct scopes/BOM imports? | Frame's stated contradiction: "Maven may still be the format an SDK must be consumable from even when it is not the build" | [POM reference](https://maven.apache.org/pom.html) | no | sdk / maven | P0 |
| 9 | Does `maven-compiler-plugin` configuration use `release` or the deprecated `source`/`target` pair, and does it rely on the (wrong) default of Java 8? | Reference calls out the Java-8 default as a trap independent of the running JDK | [maven-compiler-plugin](https://maven.apache.org/plugins/maven-compiler-plugin/) | no | maven / java | P0 |
| 10 | Are annotation processors pinned via `annotationProcessorPaths`, or leaking in through the main compile classpath? | Classpath-order and reproducibility; a common source of nondeterministic annotation-processing behavior | [maven-compiler-plugin](https://maven.apache.org/plugins/maven-compiler-plugin/) | no | maven / java | P1 |
| 11 | Is `maven-surefire-plugin` pinned to a milestone (`3.6.0-M1`) in a way that could regress on a Maven-Central resolution of "latest"? | Version pinned to milestone; a GA vs pre-GA distinction a rule should surface | [maven-surefire-plugin](https://maven.apache.org/plugins/maven-surefire-plugin/) | no | maven | P2 |
| 12 | Does the test suite run under the JUnit Platform provider, or an old JUnit4-only Surefire provider that silently skips JUnit 5/6 tests? | Provider mismatch is a classic "tests silently don't run" failure | [maven-surefire-plugin](https://maven.apache.org/plugins/maven-surefire-plugin/) | no | maven / java | P0 |
| 13 | Does forked-test configuration (`forkCount`, `reuseForks`) leak state between tests, or under-parallelize CI? | Direct performance/isolation trade-off, explicitly documented as configurable | [maven-surefire-plugin](https://maven.apache.org/plugins/maven-surefire-plugin/) | no | maven | P2 |
| 14 | If this project shades a fat jar, does it relocate conflicting packages, or just merge and hope? | Classpath collision is the primary shading failure mode; relocation is the documented fix | [maven-shade-plugin](https://maven.apache.org/plugins/maven-shade-plugin/) | no | maven / fat-jar | P0 |
| 15 | Does the shaded jar merge `META-INF/services` files via `ServicesResourceTransformer`, or does shading silently drop ServiceLoader providers? | A specific, well-known fat-jar correctness bug the plugin has a named fix for | [maven-shade-plugin](https://maven.apache.org/plugins/maven-shade-plugin/) | no | maven / fat-jar | P0 |
| 16 | Is a fat jar even the right shape here, or would a BOM + `provided`/`runtime` split, `jlink`, or a layered/exploded distribution serve better for a library vs an application? | Frame's stated contradiction: fat jars may be anti-pattern for libraries | [maven-shade-plugin](https://maven.apache.org/plugins/maven-shade-plugin/); frame | no | fat-jar / sdk | P0 |
| 17 | Does the build enforce `dependencyConvergence` or `requireUpperBoundDeps`, or is version drift only caught by a human reading `dependency:tree`? | Enforcer rules exist specifically to make mediation failures a build error instead of a runtime surprise | [maven-enforcer-plugin](https://maven.apache.org/enforcer/maven-enforcer-plugin/) | no | maven | P0 |
| 18 | Does the build enforce a minimum Java/Maven version (`requireJavaVersion`/`requireMavenVersion`), or does it silently build wrong on an old toolchain? | Direct reproducibility/toolchain-drift gate | [maven-enforcer-plugin](https://maven.apache.org/enforcer/maven-enforcer-plugin/); [ASF parent POM](https://maven.apache.org/pom/asf/) | no | maven | P1 |
| 19 | Does every declared plugin have an explicit version (`requirePluginVersions`), or is the build silently drifting onto whatever "latest" resolves to today? | Non-idempotent builds across time; a named enforcer rule with `banLatest`/`banRelease`/`banSnapshots` sub-flags exists for exactly this | [ASF parent POM search result](https://maven.apache.org/pom/asf/) | no | maven | P0 — reproducibility |
| 20 | Is this library's public API guarded by a binary-compatibility gate (japicmp/revapi/BCV) before every release, and does the POM even declare one? | Frame names this as load-bearing for the OCX SDK; not covered by any survey source directly but implied by the enforcer/release-plugin ecosystem | frame; [maven-enforcer-plugin](https://maven.apache.org/enforcer/maven-enforcer-plugin/) | no | sdk / maven | P0 |
| 21 | Is Maven's own consumer-POM/build-POM split (Maven 4) something the OCX SDK's POM needs to plan for now, even while still targeting Maven 3 compatibility? | Directly changes what "the POM" means as a publishable artifact | [Maven 4 whatsnew](https://maven.apache.org/whatsnewinmaven4.html) | no | sdk / maven | P1 |
| 22 | Does the project rely on OSSRH (`oss.sonatype.org`/`s01.oss.sonatype.org`) release automation that stopped being the primary path on 2025-06-30? | Direct, dated breakage — anyone copying a 2023-era Central publish recipe is following a dead path | [OSSRH sunset](https://central.sonatype.org/news/20250326_ossrh_sunset/) | no | maven / sdk | P0 |
| 23 | Is `central-publishing-maven-plugin` pinned to a version ≥0.7.0 if the release process needs SNAPSHOT publishing? | Version-specific feature gate the docs state explicitly | [Central Portal publishing](https://central.sonatype.org/publish/publish-portal-maven/) | no | maven / sdk | P1 |
| 24 | Does the release process assume components can be re-published/patched after upload — i.e. does it violate Central's immutability policy? | "you will not be able to remove/update/modify" is an absolute constraint a release runbook must design around (version bumps only, no re-tagging) | [Central requirements](https://central.sonatype.org/publish/requirements/) | no | sdk / maven | P0 |
| 25 | Does the release plugin/CI produce sources and javadoc jars for every published artifact, or only the main jar? | A named, hard Central requirement, easy to miss for a fast-moving internal library | [Central requirements](https://central.sonatype.org/publish/requirements/) | no | sdk / maven | P0 |
| 26 | If this repo still runs Ant, does `javac`'s `includeantruntime` default introduce environment-sensitive, non-reproducible compiles? | Ant's own manual calls this out; a one-line, mechanically-checkable migration/audit item | [Ant javac task](https://ant.apache.org/manual/Tasks/javac.html) | no | ant | P1 — recognise-and-migrate |
| 27 | If migrating Ant to Gradle via `ant.importBuild`, does the team know this permanently disables the configuration cache for that module? | Direct, load-bearing, easy-to-miss incompatibility for an "incremental migration" strategy | [Gradle ant.html](https://docs.gradle.org/current/userguide/ant.html) | no | ant / gradle | P0 — migration-blocking fact |
| 28 | Does the Ant build's `signjar` step preserve `preservelastmodified` for reproducible signed artifacts, and is it Java-version-compatible with the `jarsigner` in use? | Reproducibility + toolchain-version interaction across a legacy signing step | [Ant signjar task](https://ant.apache.org/manual/Tasks/signjar.html) | no | ant | P2 |
| 29 | What does this Ant `build.xml` encode that a migration must preserve — targets-as-tasks, filesets, custom `taskdef`s, fork settings, manifest content? | This is the deliverable the brief explicitly asks for: a recognise-and-migrate checklist, not authoring guidance | [Ant manual: using.html](https://ant.apache.org/manual/using.html) | no | ant | P1 |
| 30 | Under Bazel, is `--tool_java_language_version`/`--tool_java_runtime_version` being confused with `--java_language_version`/`--java_runtime_version`, silently building the wrong JDK target for either the tool or the app code? | Two parallel, easily-conflated flag pairs is exactly the kind of thing a rule's grep-able check should catch | [bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java) | no | bazel-java | P0 |
| 31 | Is `maven_install.json` checked into source control and is `fail_if_repin_required` set — or can a `MODULE.bazel` artifact-list edit silently diverge from the lock file? | Direct Bazel analogue of Maven's "no default lockfile" gap; rules_jvm_external makes this an opt-in build-breaking check | [rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | no | bazel-java | P0 |
| 32 | Does a Kotlin jar pulled in via `rules_jvm_external`/`maven_install` risk inline-function corruption from a naive `java_import`/`ijar` interaction, and is the ruleset version recent enough to have the fix? | Named, specific correctness bug (silently removed method bodies) unique to Bazel+Kotlin | [rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md); [rules_kotlin README](https://github.com/bazelbuild/rules_kotlin/blob/master/README.md) | no | bazel-java / kotlin | P0 |
| 33 | Does `kt_kotlinc_options` leave `x_lambdas` at its rules_kotlin default (`"class"`) when the team's Gradle builds use Kotlin 2.x's `"indy"` default — creating divergent bytecode shapes across build systems for "the same" code? | Direct cross-build-system behavioral inconsistency, quoted from the README | [rules_kotlin docs](https://github.com/bazelbuild/rules_kotlin/blob/master/docs/kotlin.md) | no | bazel-java / kotlin | P1 |
| 34 | Is `version_conflict_policy = "pinned"` set where deterministic dependency resolution matters, or is Bazel silently doing "highest wins" like unmanaged Maven mediation? | This is the Bazel-side equivalent of candidate #1/#2; a reviewer needs the mapping to explain drift across build systems | [rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | no | bazel-java | P1 |
| 35 | Does a `java_export`/BOM-consuming Bazel target duplicate a Maven `dependencyManagement` decision, and which one is the actual source of truth when both exist in a dual Maven+Bazel repo? | Frame explicitly lists dagger/grpc-java/bazel itself as dual-build exemplars; drift between the two dependency graphs is a real risk | [rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | no | bazel-java / maven | P1 |
| 36 | Are lint targets (checkstyle/PMD/SpotBugs via contrib_rules_jvm) actually wired into `bazel test //...`, or generated but never invoked because they're opt-in? | Named as "opt-in" in the docs; a rule should check the wrapper macro is actually used, not assume presence of the ruleset implies enforcement | [contrib_rules_jvm README](https://raw.githubusercontent.com/bazel-contrib/rules_jvm/main/README.md) | no | bazel-java | P2 |
| 37 | Does a JUnit5 test under Bazel call `System.exit()` (intentionally or via a library), and is the contrib_rules_jvm agent-based guard actually engaged for that target? | Specific, named failure mode (silent worker death) with a named fix | [contrib_rules_jvm README](https://raw.githubusercontent.com/bazel-contrib/rules_jvm/main/README.md) | no | bazel-java | P2 |
| 38 | Is a `java_binary`'s deploy jar (`_deploy.jar`) being used as the distribution artifact when a `jlink` custom runtime image or layered container would avoid the fat-jar classpath-collision risk entirely? | Same fat-jar-vs-alternative question as candidate #16, now on the Bazel side | frame; [rules_java](https://bazel.build/docs/bazel-and-java) | no | bazel-java / fat-jar | P1 |
| 39 | Does the project's persistent-worker usage (`KotlinCompile`, `KotlinKsp2`, `JdepsMerge`) assume a clean/idempotent worker process, or could stale worker state produce non-reproducible incremental builds? | Persistent workers trade speed for a new class of state-leak bug; on-by-default makes this silent unless investigated | [rules_kotlin docs](https://github.com/bazelbuild/rules_kotlin/blob/master/docs/kotlin.md) | no | bazel-java / kotlin | P2 |
| 40 | Does a Gradle-backed `resolver` in `maven_install` get used in production despite being marked experimental in the docs? | Direct "docs say don't rely on this yet" flag | [rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | no | bazel-java | P2 |
| 41 | Are BUILD files using the versionless `artifact()` macro in a way that blocks `buildozer`-based automated refactors, when a fully-expanded target label would be safer for tooling? | Documented trade-off, directly affects any future automation this fleet builds against these BUILD files | [rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | no | bazel-java / plugin-dev | P2 |
| 42 | Does the wrapper (`mvnw`) checked into the repo have `wrapperSha256Sum`/`distributionSha256Sum` set, or is it trusting an unverified download on every clean CI checkout? | Direct supply-chain check, mirrors the same class of risk as Gradle wrapper verification | [Maven Wrapper](https://maven.apache.org/wrapper/) | no | maven | P1 |
| 43 | Does a multi-module Maven reactor rely on build-order side effects from `mvn install` into `~/.m2` rather than the reactor's own resolved artifacts — breaking under `mvn verify` or parallel/concurrent builds? | Reactor correctness under Maven 4's new concurrent builder (`-b concurrent`) | [Maven 4 whatsnew](https://maven.apache.org/whatsnewinmaven4.html) | no | maven | P1 |
| 44 | Is `charset`/locale assumed platform-default anywhere in the compiler, resource-filtering, or Javadoc configuration, rather than pinned (`-Dfile.encoding=UTF-8`, `project.build.sourceEncoding`)? | Named directly in the brief as a boring-but-bites topic; the POM reference documents `project.build.sourceEncoding` as the standard property | [POM reference](https://maven.apache.org/pom.html) (properties section) | partial | maven / java | P1 |
| 45 | Does CI run on a case-insensitive filesystem assumption (macOS/Windows) that would hide a Java package/class name collision only caught on Linux? | Windows-paths / cross-platform determinism concern named in the brief; not directly documented in this corpus but implied by Maven's directory-layout conventions | [Standard directory layout guide](https://maven.apache.org/guides/introduction/introduction-to-the-standard-directory-layout.html) (listed in guides index) | no | maven / java | P2 |
| 46 | Does a Gradle-plugin-development surface (out of this scout's corpus) duplicate any of Bazel's `java_export`/Maven's Central-publish flow in a way that could drift — i.e. does the future OCX Gradle plugin need to mirror the enforcer-style "fail on drift" pattern seen in `fail_if_repin_required`? | Cross-scout synthesis flag for the map, not a source-groundable claim from this corpus alone | [rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | covered-elsewhere (Gradle scout) | plugin-dev | P1 |
| 47 | Is the Ant→Maven/Gradle migration checklist (targets, filesets, taskdefs, fork settings, manifest, signjar) actually captured anywhere in this fleet's config, or does "Ant as legacy" mean zero recognise-and-migrate tooling exists at all? | Direct test of frame hypothesis 1 ("Ant is legacy") — currently true: nothing recognises Ant | survey §17–20 | no | ant | P1 |
| 48 | Does a BOM published from this ecosystem use Maven 4's dedicated `bom` packaging, Bazel's `maven.install(boms=...)` consumption, or Gradle's `java-platform` — and is the equivalence table (below) the thing an SDK-authoring skill should route through before publishing? | Directly the deliverable (b) the brief asks for; ties all three build systems' BOM handling together | survey §11, §22 | no | sdk / any | P0 |

## Recent shifts seen in this corpus

- **OSSRH sunset, 2025-06-30**: any Central-publish recipe referencing `oss.sonatype.org` or `s01.oss.sonatype.org` as the primary deploy target is now historical-only; the Central Portal + `central-publishing-maven-plugin` is the only forward path, with the OSSRH Staging API Service as a compatibility bridge, not a target. ([OSSRH sunset](https://central.sonatype.org/news/20250326_ossrh_sunset/))
- **`central-publishing-maven-plugin` SNAPSHOT support since 0.7.0**: pre-0.7.0 guidance ("Central Portal doesn't do snapshots") is now wrong. ([Central Portal publishing](https://central.sonatype.org/publish/publish-portal-maven/))
- **Maven 4.0.0-beta-5 reproducible-by-default**: guidance to always manually set `project.build.outputTimestamp` predates this; post-beta-5, the property becomes an override rather than a requirement. ([Reproducible builds guide](https://maven.apache.org/guides/mini/guide-reproducible-builds.html))
- **Maven 4's plugin-duplicate hard failure**: Maven-3-era guidance treating duplicate plugin declarations as "just a build warning, harmless" is invalidated the moment a project moves to Maven 4. ([Maven 4 whatsnew](https://maven.apache.org/whatsnewinmaven4.html))
- **Maven 4's Java 17 requirement for the Maven runtime itself**: separate from a project's own compile target; older "Maven runs on Java 8" assumptions (still true for Maven 3) no longer apply once a team upgrades the Maven binary. ([Maven 4 whatsnew](https://maven.apache.org/whatsnewinmaven4.html))
- **ASF parent POM Reproducible-Builds compliance since its own version 22**: pins predating v22 may not carry reproducible-compliant plugin versions even when inheriting the "latest" ASF parent guidance found online. ([ASF parent POM](https://maven.apache.org/pom/asf/))
- **rules_kotlin KSP as the documented-first path since 1.8**, with kapt not mentioned as a headline rule in the current README — guidance built around kapt as the default annotation-processing story for Bazel+Kotlin is dated relative to this corpus. ([rules_kotlin README](https://github.com/bazelbuild/rules_kotlin/blob/master/README.md))
- **rules_kotlin Build Tools API as the path to incremental compilation**, still gated behind an `experimental_` flag — treating Bazel+Kotlin incremental compilation as GA/default is premature as of this survey date. ([rules_kotlin docs](https://github.com/bazelbuild/rules_kotlin/blob/master/docs/kotlin.md))
- **rules_java toolchain externalization tied to Bazel 9**: the `--repositories_without_autoloads=bazel_features_version,bazel_features_globals` workaround, tied to [bazelbuild/bazel#26119](https://github.com/bazelbuild/bazel/pull/26119), is scoped to "Bazel 8.0.0 and before 8.3.0" per the release-notes template itself — meaning the autoload-externalization transition is mid-flight across Bazel 8→9, not a settled Bazel-9-only concern. ([rules_java distro/relnotes.bzl](https://github.com/bazelbuild/rules_java))

## Contested

- **Fat jars: best practice or anti-pattern?** `maven-shade-plugin` and Bazel's `java_binary` deploy jars both treat the uber-jar as a first-class, actively-maintained distribution shape (shade plugin is at 3.6.2, not deprecated). But the frame's own contradiction-hunting hypothesis — fat jars as second-best next to `jlink`/`jpackage`/layered images for applications, and an anti-pattern for libraries specifically — is not contradicted by anything in this corpus; if anything the shade plugin's dependency-reduced-POM and relocation machinery exists precisely because uber-jars cause classpath collisions, which is evidence *for* the anti-pattern reading for libraries. Trend: no clear directional signal in this canonical-docs corpus; needs the Gradle/Shadow-plugin scout's material to resolve.
- **Where does dependency-lock rigor belong in Maven?** Bazel (`rules_jvm_external`) treats a checked-in, repin-gated lock file as close to mandatory practice (`fail_if_repin_required`). Maven has no equivalent by default — `dependencyConvergence`/`requireUpperBoundDeps` are enforcer rules a project must opt into, and even then they gate *convergence*, not a full resolved-graph lockfile. Trend: Maven is not moving toward a native lockfile in this corpus (Maven 4's whatsnew makes no mention of one); the practice gap between Bazel-style pinning and Maven-style enforcer rules stays open and is worth naming explicitly in the equivalence table rather than glossing over.
- **Kotlin annotation processing: KSP vs kapt.** rules_kotlin's README foregrounds KSP (`kt_ksp_plugin`, "officially supported as of rules_kotlin 1.8") and does not give kapt equivalent billing. Whether kapt is still supported at all under rules_kotlin was not resolved by this survey (the README excerpt fetched does not mention `kt_jvm_import`-style kapt rules) — flag as an open question for the Kotlin-specific scout rather than assert kapt is gone.
- **Gradle-backed Maven artifact resolution.** `rules_jvm_external`'s own README marks its Gradle resolver "experimental" — contested only in the sense that it exists as an option at all; not something to recommend as of this survey.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [maven.apache.org/guides/index.html](https://maven.apache.org/guides/index.html) | Maven's official guide index (51 guides) | current, live doc | Primary — the full curriculum surface, table-of-contents by design |
| [maven.apache.org/pom.html](https://maven.apache.org/pom.html) | POM reference | current, live doc | Primary — every element, scope table, inheritance rules, quoted warnings |
| [maven.apache.org/settings.html](https://maven.apache.org/settings.html) | settings.xml reference | current, live doc | Primary — credentials/mirror/proxy model and its plaintext-password caveat |
| [maven.apache.org/plugins/index.html](https://maven.apache.org/plugins/index.html) | Core plugin index with live versions | current, live doc | Primary — exact current version numbers for every core plugin |
| [maven.apache.org/plugins/maven-compiler-plugin/](https://maven.apache.org/plugins/maven-compiler-plugin/) | compiler plugin docs | current, live doc (v3.16.0) | Primary — `release` vs `source`/`target`, default-Java-8 warning |
| [maven.apache.org/plugins/maven-surefire-plugin/](https://maven.apache.org/plugins/maven-surefire-plugin/) | surefire plugin docs | current, live doc (v3.6.0-M1) | Primary — fork/parallel config, JUnit Platform provider |
| [maven.apache.org/plugins/maven-shade-plugin/](https://maven.apache.org/plugins/maven-shade-plugin/) | shade plugin docs | current, live doc (v3.6.2) | Primary — relocation, transformers, fat-jar mechanics |
| [maven.apache.org/enforcer/maven-enforcer-plugin/](https://maven.apache.org/enforcer/maven-enforcer-plugin/) | enforcer plugin docs | current, live doc (v3.6.3) | Primary — the named built-in rules that make drift a build failure |
| [maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) | lifecycle guide | current, live doc | Primary — phase list and the "don't invoke integration-test directly" warning |
| [maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) | dependency mechanism guide | current, live doc | Primary — nearest-wins mediation, quoted, with a worked tree example |
| [maven.apache.org/whatsnewinmaven4.html](https://maven.apache.org/whatsnewinmaven4.html) | Maven 4 changes | "continuously updated until 4.0.0 release" per the page itself | Primary — the single richest source for what changed and what breaks |
| [maven.apache.org/guides/mini/guide-reproducible-builds.html](https://maven.apache.org/guides/mini/guide-reproducible-builds.html) | reproducible-builds guide | current, live doc | Primary — the exact property and its Maven-4-default status |
| [maven.apache.org/wrapper/](https://maven.apache.org/wrapper/) | Maven Wrapper docs | current, live doc | Primary — files created, checksum-verification properties |
| [maven.apache.org/pom/asf/](https://maven.apache.org/pom/asf/) | ASF parent POM docs | current, live doc | Primary — what a widely-inherited parent actually enforces, by property name |
| [central.sonatype.org/publish/publish-portal-maven/](https://central.sonatype.org/publish/publish-portal-maven/) | Central Portal Maven-plugin guide | current, live doc | Primary — plugin coordinates, `autoPublish`, `waitUntil`, SNAPSHOT-since-0.7.0 |
| [central.sonatype.org/publish/requirements/](https://central.sonatype.org/publish/requirements/) | Central publishing requirements | current, live doc | Primary — GPG, sources/javadoc jars, checksum, immutability, quoted |
| [central.sonatype.org/news/20250326_ossrh_sunset/](https://central.sonatype.org/news/20250326_ossrh_sunset/) | OSSRH sunset announcement | dated 2025-03-26, describes 2025-06-30 EOL | Primary — the exact end-of-life date and migration mechanics |
| [ant.apache.org/manual/index.html](https://ant.apache.org/manual/index.html) / [toc.html](https://ant.apache.org/manual/toc.html) | Ant user manual, top level | current, live doc (legacy tool, actively maintained docs) | Primary — manual structure and section inventory |
| [ant.apache.org/manual/using.html](https://ant.apache.org/manual/using.html) | Ant core concepts | current, live doc | Primary — project/target/task/property model |
| [ant.apache.org/manual/Tasks/javac.html](https://ant.apache.org/manual/Tasks/javac.html) | Ant javac task reference | current, live doc | Primary — `includeantruntime` portability warning, quoted |
| [ant.apache.org/manual/Tasks/signjar.html](https://ant.apache.org/manual/Tasks/signjar.html) | Ant signjar task reference | current, live doc | Primary — signing attributes, `preservelastmodified` reproducibility hook |
| [docs.gradle.org/current/userguide/ant.html](https://docs.gradle.org/current/userguide/ant.html) | Gradle's Ant-interop guide | current, live doc | Primary — `ant.importBuild`, and the configuration-cache incompatibility, quoted |
| [bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java) | Bazel's own Java toolchain guide | current, live doc | Primary — the two parallel version-flag pairs, JavaBuilder, `ijar`, toolchain resolution order |
| [github.com/bazel-contrib/rules_jvm_external](https://github.com/bazel-contrib/rules_jvm_external) (README, fetched from local exemplar clone `@449754dcbb`) | rules_jvm_external's own README | 2026-08-25 commit | Primary — the ruleset's own canonical usage doc, exhaustive on pinning/conflict/visibility attributes |
| [github.com/bazelbuild/rules_kotlin](https://github.com/bazelbuild/rules_kotlin) (README + docs/kotlin.md, fetched from local exemplar clone `@7c51dd1210`) | rules_kotlin's own docs | 2026-09-02 commit | Primary — toolchain flags, KSP, workers, Build Tools API, all quoted from source |
| [github.com/bazelbuild/rules_java](https://github.com/bazelbuild/rules_java) (README + distro/relnotes.bzl, fetched from local exemplar clone `@4206909b6d`) | rules_java's own README and release-notes template | 2026-09-05 commit | Primary — confirms the ruleset's minimal doc footprint (defers to bazel.build) and the exact Bazel-8→9 autoload workaround flag |
| [raw.githubusercontent.com/bazel-contrib/rules_jvm/main/README.md](https://raw.githubusercontent.com/bazel-contrib/rules_jvm/main/README.md) | contrib_rules_jvm README | fetched live, main branch | Primary — the rule names for `java_test_suite`, checkstyle/PMD/SpotBugs wrappers, JUnit5 runner |


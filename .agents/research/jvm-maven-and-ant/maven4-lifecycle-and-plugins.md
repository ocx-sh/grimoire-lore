---
title: "Maven 4 (still RC), MVN-DEP's missing supply-chain row, and the Ant exit"
topic: maven-and-ant
agent: maven-ant-dive
model: sonnet
date_researched: 2026-09-12
sources_count: 20
scope: |
  Three merged deliverables under family MVN-BUILD (+ the MVN-ANT rows):
  (1) Maven lifecycle/plugin mechanics and what Maven 4 actually changes, given
  it has not GA'd; (2) the supply-chain-integrity row MVN-DEP lacks — Maven
  Resolver checksum config, the Maven-wrapper checksum fields, and whether
  anything plays the role of Gradle's verification-metadata.xml; (3) Ant
  recognise-and-migrate. Does not cover Maven dependency mediation/enforcer
  (owned by jvm-dependencies.md MVN-DEP) or Maven/Gradle publishing (MVN-PUB,
  owned elsewhere in the map).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [D1. Maven lifecycle and plugins (MVN-BUILD)](#d1-maven-lifecycle-and-plugins-mvn-build)
   - [D2. MVN-DEP's missing supply-chain row](#d2-mvn-deps-missing-supply-chain-row)
   - [D3. Ant: recognise and migrate (MVN-ANT)](#d3-ant-recognise-and-migrate-mvn-ant)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **Maven 4.0.0 has not shipped as of 2026-09-12** — Central tops out at `4.0.0-rc-6`, `maven-core` GA is `3.9.16`. Re-check with `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml` before any Maven-4 claim ships as unconditional.
- The default lifecycle has **23 phases**; invoking a hyphenated intermediate phase (`integration-test`) directly skips `post-integration-test` cleanup/reporting and can leave a container (Tomcat, Docker) hanging — `mvn verify` is the correct entry point, not `mvn clean install` ([lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html), [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html)).
- Maven 4 **requires Java 17 to run Maven itself** — the project can still target Java 8 via `--release`; running JDK and compiled bytecode are independent facts ([whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html)).
- Maven 4 turns **duplicate plugin declarations across `<build>` and a profile's `<build>`** from a Maven-3 warning into a hard build failure — the single highest-value "will this silently break on upgrade" check.
- Maven 4 removes **Plexus container-based dependency injection** (deprecated since Maven 3.2, 2010); a plugin still using it does not load under Maven 4 and needs a JSR-330 rewrite.
- `maven-compiler-plugin`'s `source`/`target` default to **`8` unconditionally, regardless of the running JDK** — `release` is the documented fix, not a style preference.
- `annotationProcessorPaths` pins annotation processors to an explicit, versioned list instead of letting them ride the compile classpath — nondeterministic otherwise.
- Surefire **3.6.0** (released 2026, doc banner reads "Last Published: 2026-08-31") collapsed `surefire-junit3/junit4/junit47/testng` into **one `surefire-junit-platform` provider**; JUnit 4 below **4.12** is no longer supported at all.
- JDK 17+ forked tests needing `--add-opens` and a JaCoCo `argLine` agent is a real, currently-open interaction bug — [apache/maven#11605](https://github.com/apache/maven/pull/11605) is an unmerged fix, not a shipped one; a rule must state the workaround (append, don't replace, `argLine`), not point at a PR as done.
- Maven is **reproducible-by-default only from `4.0.0-beta-5`** — under the shipping 3.9.x line, `project.build.outputTimestamp` (ISO-8601 UTC) must be set explicitly; `mvn artifact:check-buildplan` and `mvn clean verify artifact:compare` are the two verification commands.
- **assertj's `.mvn/maven.config` checksum flags are version-conditional, not universal**: `-Daether.checksums.algorithms=...` and `-Daether.connector.smartChecksums=false` are Maven-Resolver-**1.x** property names (bundled by Maven 3.9.16, which is what assertj's wrapper pins). Resolver **2.0.x** (Maven 4 only) renamed them to `aether.checksums.checksumAlgorithms` and `aether.connector.basic.smartChecksums` — the same `.mvn/maven.config` silently stops doing anything the day the wrapper is bumped to Maven 4, with no error.
- Maven Resolver's **own docs reject the premise that MD5/SHA-1 are "insecure" in this context**: "Checksums only provide integrity verification. They do not provide security or trust. They do not protect against man-in-the-middle or supply chain attacks" — GPG signing is Maven's actual trust mechanism, checksums are corruption detection only.
- `smartChecksums`/`aether.connector.basic.smartChecksums` **only ever validates SHA-1** (an HTTP-header shortcut); leaving it on with a SHA-512/SHA-256-first algorithm list means the stronger digests are configured but never actually exercised — this is *why* `smartChecksums=false` is the half of assertj's config that matters, not the algorithm list itself.
- **Maven has no equivalent of Gradle's `verification-metadata.xml`.** There is no artifact-pin/checksum-manifest file native to Maven; the closest levers are per-invocation resolver checksum properties (transport-integrity only) and GPG signature verification (trust) — they are not substitutes for each other.
- `.mvn/wrapper/maven-wrapper.properties`'s `wrapperSha256Sum`/`distributionSha256Sum` are **optional, off by default, and absent in the corpus's only sample** (`assertj/assertj`) — the same unpinned-wrapper supply-chain gap the Gradle rules already flag.
- Ant's core model is a project of **targets** (units of `depends`-ordered execution) built from **tasks** (single executable operations); properties are **write-once** — a second `<property>` for the same name is a no-op, not an overwrite.
- `<javac>`'s `includeantruntime` **defaults to `build.sysclasspath`-dependent, effectively "yes" unless set**, and Ant's own manual says "it is usually best to set this to false" — apache/ant's own build.xml sets it explicitly `false` on all 4 live `<javac>` invocations.
- Gradle's `ant.importBuild()` **permanently and unconditionally disables the configuration cache** for the whole build the moment it runs, per Gradle's own docs — not a partial or task-scoped cost.
- The Ant migration checklist never recommends `ant.importBuild()` as an end state: the corpus has **zero real usages** of it (only Gradle's own migration-teaching snippets), and the config-cache cost outweighs the incremental-migration convenience for any build that plans to stay on Gradle.

## Findings

### D1. Maven lifecycle and plugins (MVN-BUILD)

#### 1.1 The 23-phase default lifecycle, and why `verify` is the entry point

Maven's default lifecycle has exactly 23 phases, executed in order whenever a later one is invoked (invoking any phase runs every phase before it too): `validate`, `initialize`, `generate-sources`, `process-sources`, `generate-resources`, `process-resources`, `compile`, `process-classes`, `generate-test-sources`, `process-test-sources`, `generate-test-resources`, `process-test-resources`, `test-compile`, `process-test-classes`, `test`, `prepare-package`, `package`, `pre-integration-test`, `integration-test`, `post-integration-test`, `verify`, `install`, `deploy` ([introduction-to-the-lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)).

The guide is explicit that hyphenated phases (`pre-*`, `post-*`, `process-*`) are "not usually directly called from the command line" because they "sequence the build, producing intermediate results that are not useful outside the build." The concrete failure mode: plugins such as JaCoCo, Tomcat, Cargo or Docker bind setup goals to `pre-integration-test` and teardown/report goals to `post-integration-test`. Calling `mvn integration-test` runs setup but never reaches the teardown phase, so "the integration test container environment is left in a hanging state; the Tomcat webserver or Docker instance is left running, and Maven may not even terminate by itself" ([introduction-to-the-lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)).

`mvn verify` is the correct target for CI: it runs every phase through `verify` inclusive, which reaches `post-integration-test` and lets reporting/teardown goals fire ([introduction-to-the-lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)). Maven's own What's New page independently states the operational corollary for the *install* boundary: **"Do not use `mvn clean install` for your regular builds. Instead, use `mvn verify`!"** — `install`'s side effect of writing into the shared `~/.m2` local repository is a build-machine-specific mutation CI should not depend on ([whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html)).

#### 1.2 Maven 4 breaking changes (still RC — see 1.0 below for the GA gate)

All items below are drawn from Maven's own What's New and migration guide, current for `4.0.0-rc-6` as queried 2026-09-12; re-run `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml` before treating any of these as "the shipping behavior."

| Change | What breaks | Source |
|---|---|---|
| Java 17 required to *run* Maven | Build agents/CI images on Java 8/11 cannot invoke `mvn` at all under Maven 4, independent of the project's own `--release` target | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |
| Duplicate `<plugin>` in `<build>` **and** a profile's `<build>` | Maven 3.9 warns; Maven 4 **fails the build** | [migration guide](https://maven.apache.org/guides/mini/guide-migration-to-mvn4.html) |
| Plexus DI removed (deprecated since Maven 3.2, 2010) | A plugin using Plexus container injection instead of JSR-330 does not load | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |
| `pre-*`/`post-*` phases deprecated to aliases for `before:`/`after:` | Maven 4's phase-scope rule changed: `after:clean` (nee `post-clean`) now runs on plain `mvn clean`, where Maven 3 ran it only via explicit `mvn post-clean` — a plugin execution silently starts firing on a build it previously didn't | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |
| `executionRootDirectory`, `multiModuleProjectDirectory` removed | Replaced by `${project.rootDirectory}`, `${session.topDirectory}`, `${session.rootDirectory}` | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |
| Build-POM / consumer-POM split, model `4.1.0` | Opt-in via `maven.consumer.pom.flatten=true`; consumer POM strips parent refs, flattens BOM imports, drops build-only info — still emitted as model `4.0.0` on the wire so Maven-3 consumers are unaffected | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |
| `<modules>` → `<subprojects>` | `<modules>` still works (deprecated, not removed); `<subprojects>`/`<subproject>` requires model `4.1.0` | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html), [migration guide](https://maven.apache.org/guides/mini/guide-migration-to-mvn4.html) |
| Lifecycle becomes a tree (`before:`/`after:` per phase, numeric `[N]` ordering, `all`/`each`/`before:all`/`after:all`/`before:each`/`after:each`) | Enables the `-b concurrent` builder to start a dependent subproject once a dependency reaches the `ready` phase, instead of waiting for the whole reactor phase to complete | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |
| `mvnenc` replaces Maven 3's password obfuscation | Standalone CLI tool; adds `decrypt` and external-vault support | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |
| `mvnup` (since `4.0.0-rc-4`) | Automates POM-to-`4.1.0` migration, flags deprecated plugin config, checks Maven-4 readiness | [migration guide](https://maven.apache.org/guides/mini/guide-migration-to-mvn4.html) |
| `deployAtEnd` defaults `true` | Multi-module builds now deploy only after every subproject builds successfully, by default | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |
| `-b concurrent` builder | Opt-in; needed to actually exploit the tree lifecycle's parallelism | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |
| New `bom` packaging type (model `4.1.0`) | Distinct from classic `pom`-packaging-plus-`<scope>import</scope>`; not usable by a Maven-3-only consumer | [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html) |

Migration guide's own three-step sequence: **Prepare** (latest Maven 3.9, upgrade every plugin to its latest Maven-3-compatible version via `versions-maven-plugin:display-plugin-updates`) → **Test** (Java 17 build environment, install Maven 4 RC, fix duplicate-plugin declarations and removed directory properties, run in parallel with Maven 3) → **Migrate** (drop Maven 3, adopt `4.1.0` model features) ([migration guide](https://maven.apache.org/guides/mini/guide-migration-to-mvn4.html)).

#### 1.3 `maven-compiler-plugin`: the Java-8 default and `release`

"At present the default `source` and the default `target` setting are both `8`, independently of the JDK you run Maven with" — this is a fixed constant, not a JDK-detected default. The plugin's own docs: "You are highly encouraged to change these defaults by setting the `release` option" ([maven-compiler-plugin](https://maven.apache.org/plugins/maven-compiler-plugin/)). `release` is a single javac flag that pins both the language-level source and the target bytecode version, and — unlike `source`/`target` — also fixes the API baseline (no compiling against JDK 21 APIs while targeting JDK 8 bytecode). `google__guava@5fb424c43a:pom.xml` hard-codes `1.8` via `<maven.compiler.source>`/`<maven.compiler.target>` in three places rather than `release`, matching the plugin's warned-against default ([jvm-topic-map/maven-ant-bazel-canonical.md](../jvm-topic-map.md), corpus).

`annotationProcessorPaths` (type `List<DependencyCoordinate>`, since 3.5, exclusions since 3.11.0) restricts annotation-processor discovery to an explicit, versioned, Maven-coordinate list instead of scanning the whole compile classpath for `META-INF/services/javax.annotation.processing.Processor` — without it, adding *any* dependency that happens to carry a processor changes what runs at compile time, unannounced ([compile-mojo](https://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html)).

#### 1.4 Surefire: one provider, and the version-vs-doc-banner gap

Surefire **3.6.0** consolidated every framework-specific provider into a single `surefire-junit-platform` provider: "Starting with 3.6.0, one provider runs all tests" — `surefire-junit3`, `surefire-junit4`, `surefire-junit47` and `surefire-testng` are removed as separate modules ([whats-new-3-6-0](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html)). JUnit 4 below **4.12** is no longer supported at all under the unified provider.

The plugin's own front page carries **"Version: 3.6.0, Last Published: 2026-08-31"** ([maven-surefire-plugin](https://maven.apache.org/surefire/maven-surefire-plugin/)) — this is a documentation-site banner, not a Central release query. Frame correction 38 already establishes the split between the two: Central's newest published artifact is `3.6.0-M1` (2026-06-02) and `3.5.6` is the newest GA line. **Treat the doc-site version banner and the Central release index as two different questions** — a rule or an agent picking a Surefire version for a `<pluginManagement>` entry must query Central, not read the doc banner, exactly as frame correction 38/wave-2 correction 13 generalizes for every Maven/Gradle plugin.

#### 1.5 JDK 17+, `--add-opens`, and the JaCoCo `argLine` clobber

`FasterXML__jackson-databind@a906e1782b:pom.xml:44` shows the live pattern: Surefire's `argLine` needs `--add-opens` entries for JDK 17+ reflective access, injected via the placeholder Surefire itself provides for JaCoCo (`@{argLine}`, populated by `jacoco-maven-plugin`'s `prepare-agent` goal). [apache/maven#11605](https://github.com/apache/maven/pull/11605) — titled "Fix jdk21 tests," rebased onto `maven-3.9.x`, fixing [#11398](https://github.com/apache/maven/issues/11398) — is an **open, unmerged** pull request as of 2026-09-12 (`"merged": false`). Its own description states the mechanism precisely: "the forked test JVM did not receive the required `--add-opens` options" because the two configuration sources (a hand-written `argLine` and JaCoCo's injected `@{jacocoArgLine}`/`@{argLine}`) clobber rather than concatenate unless the POM explicitly composes them. The correct pattern is to append, not overwrite: `<argLine>@{argLine} --add-opens java.base/java.lang=ALL-UNNAMED</argLine>` (or the reverse composition, matching whichever plugin populates the placeholder). **A rule may not cite #11605 as a shipped fix** — it is a fix proposal, and the workaround must be stated as the mitigating pattern in the POM, not "upgrade and this goes away."

#### 1.6 Reproducibility: default-on only from `4.0.0-beta-5`

"Starting with Maven 4.0.0-beta-5, Reproducible Builds mode will be active by default" ([MNG-8258](https://issues.apache.org/jira/browse/MNG-8258), via [reproducible-builds guide](https://maven.apache.org/guides/mini/guide-reproducible-builds.html)). On the shipping Maven 3.9.x line, `project.build.outputTimestamp` must be set explicitly, in ISO-8601 UTC (`2026-09-12T00:00:00Z`), to pin archive-entry timestamps. Two verification commands, both real Maven goals: `mvn artifact:check-buildplan` (detects plugin versions that are not reproducible-builds-compliant) and `mvn clean verify artifact:compare` (rebuilds and diffs against the first build byte-for-byte; `-Dreference.repo=<staging-url>` compares against an already-staged release) ([reproducible-builds guide](https://maven.apache.org/guides/mini/guide-reproducible-builds.html)). Measured: 3/32 corpus repos set `project.build.outputTimestamp` ([pub audit](../jvm-audit/exemplar-publishing-ci-bazel.md)).

#### 1.7 The ASF parent POM: floors only, no drift protection

Parent version **39** (Last Published 2026-06-25) configures `maven-enforcer-plugin` to check `minimalMavenBuildVersion` (default **Maven 3.9**) and `minimalJavaBuildVersion` (defaults to the project's own `javaVersion` property, itself defaulting to **8**) ([pom/asf](https://maven.apache.org/pom/asf/)). Since parent v22 it also expects managed plugin versions to be Reproducible-Builds compliant and documents setting `project.build.outputTimestamp` to a Unix epoch integer example (`10`) rather than an ISO-8601 string in its own snippet — read that as a placeholder, not a format spec; the reproducible-builds guide's own ISO-8601 format is the normative one. **The parent POM does not configure `dependencyConvergence`, `banDuplicatePomDependencyVersions`, `requireUpperBoundDeps`, or any other drift-detecting enforcer rule** — it fixes floors (which Maven, which Java) and one release-signing/reproducibility posture, and nothing about dependency-version drift ([pom/asf](https://maven.apache.org/pom/asf/)). This falsifies the assumption that inheriting a strict ASF-style parent already buys convergence protection — a non-ASF adopter copying only the enforced-floors idea gets nothing for the MVN-DEP-03 (`dependencyConvergence`) question; that has to be bound separately, per jvm-dependencies.md's own MVN-DEP rows.

#### 1.8 `mvnw` and the wrapper's checksum fields

`.mvn/wrapper/maven-wrapper.properties` carries `distributionUrl` plus two **optional** fields, `wrapperSha256Sum` and `distributionSha256Sum`: "To avoid supply-chain-attacks by downloading a corrupted artifact, it is possible to specify checksums for both the maven-wrapper.jar and the downloaded distribution" ([wrapper](https://maven.apache.org/wrapper/)). Both are opt-in and unset by default. See D2 below for the measured state of the one corpus sample.

---

### D2. MVN-DEP's missing supply-chain row

#### 2.1 assertj's checksum flags are resolver-version-conditional — the central finding

`assertj__assertj@485502bad2:.mvn/maven.config` sets:

```
-Daether.checksums.algorithms=SHA-512,SHA-256,SHA-1,MD5
-Daether.connector.smartChecksums=false
```

These are **Maven Resolver 1.x property names.** `assertj`'s own `.mvn/wrapper/maven-wrapper.properties` pins `distributionUrl` to `apache-maven-3.9.16`, and Maven 3.9.16's own reactor POM fixes `<resolverVersion>1.9.27</resolverVersion>` (`repo.maven.apache.org/…/maven/3.9.16/maven-3.9.16.pom:146`, confirmed by direct fetch 2026-09-12). Resolver **1.9.22**'s own archived configuration reference documents exactly these two property names verbatim:

```
aether.checksums.algorithms          "SHA-1,MD5"   (String)
aether.connector.smartChecksums      true          (boolean)
```

([resolver-archives/resolver-1.9.22/configuration.html](https://maven.apache.org/resolver-archives/resolver-1.9.22/configuration.html), fetched directly)

**Resolver 2.0.x — the version Maven 4 bundles ("Maven 4 includes the new 2.0 release," [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html)) — renamed both properties**: `aether.checksums.checksumAlgorithms` (default `"SHA-1,MD5"`, since 1.8.0/renamed at 2.0) and `aether.connector.basic.smartChecksums` — confirmed against the *current* configuration reference, fetched and grepped directly, which contains **no** `aether.checksums.algorithms` or `aether.connector.smartChecksums` entry at all ([resolver/configuration.html](https://maven.apache.org/resolver/configuration.html), fetched 2026-09-12).

Consequence: assertj's `.mvn/maven.config` is a correctly-functioning hardening measure **today**, under Maven 3.9.16/resolver 1.9.27 — and becomes a **silent no-op** (unrecognized system properties are ignored, not rejected) the day the project's wrapper is bumped to any Maven 4.0.0-rc build. A migration checklist item follows directly from this (see MVN-BUILD-13 below).

#### 2.2 What the checksum config actually buys — and Maven's own stated limit

Maven Resolver's own docs state the boundary explicitly: **"Checksums only provide integrity verification. They do not provide security or trust. They do not protect against man-in-the-middle or supply chain attacks."** And on the "MD5/SHA-1 are unsafe" objection specifically: **"This argument does not apply to Maven Resolver because checksums do not provide security. This fact is true for the SHA-1 algorithm and the MD5 algorithm. Industry still uses both algorithms today to verify transport integrity and to detect errors."** GPG signing (`maven-gpg-plugin`) is named as the actual trust mechanism: "To prove that artifacts have not been tampered with, you need signatures" ([resolver/about-checksums.html](https://maven.apache.org/resolver/about-checksums.html)). This directly answers the brief's "does it harden or weaken" question with a third option: **it does neither, because Maven checksums were never a security control** — the framing borrowed from Gradle's dependency-verification docs (which do treat checksum *and* signature as security layers) does not transfer.

Given that, `-Daether.connector.smartChecksums=false` is the operative half of assertj's config, not the algorithm list: `smartChecksums` "only supports SHA-1" (both the current and the 1.9.22 doc say this) because it extracts the reference digest from an HTTP response header (`ETag`) instead of fetching the repository's separate `.sha512`/`.sha256` checksum file. Leaving `smartChecksums=true` with a SHA-512-first algorithm preference would configure algorithms that are then never exercised, because the header-shortcut never produces anything but a SHA-1 comparison. Disabling it forces the full checksum-file fetch, which is the only path that actually validates the stronger digests when the repository publishes them ([resolver-archives/resolver-1.9.22/configuration.html](https://maven.apache.org/resolver-archives/resolver-1.9.22/configuration.html)).

#### 2.3 No Maven equivalent of `verification-metadata.xml`

There is no artifact — no file, no plugin goal, no built-in feature — in native Maven that plays Gradle's `verification-metadata.xml` role (a repo-committed manifest pinning expected checksums/PGP keys per coordinate, checked on every resolve). The two Maven-native levers are orthogonal and neither substitutes for it: (a) the per-invocation resolver checksum properties above (transport-integrity only, not committed to the repo, not artifact-specific), and (b) GPG signature verification via `maven-gpg-plugin`, which the Central Portal mandates for *publishing* but which is not wired as a *consuming*-build gate by default. `apache__maven@ea4a417bd2:.mvn/maven.config` itself sets no checksum property at all — only `sessionRootDirectory` and a repository-id property (`apache.snapshots`) ([apache/maven .mvn/maven.config](https://repo.maven.apache.org), corpus fetch). A Maven adopter wanting Gradle-verification-metadata-equivalent guarantees has to reach outside Maven core — e.g. a Nexus/Artifactory repository-manager policy, or `maven-enforcer-plugin`'s `requireVersion`-style rules bound to specific coordinates plus a manually-maintained checksum list — there is no first-party single command.

#### 2.4 The wrapper's checksum row: 0/1 in the corpus sample

assertj's `.mvn/wrapper/maven-wrapper.properties` sets `wrapperVersion`, `distributionType=only-script`, and `distributionUrl` — **no `wrapperSha256Sum`, no `distributionSha256Sum`** (fetched directly, both fields absent). This is the same pre-toolchain supply-chain gap the Gradle wrapper rules already flag: the very first `mvnw` invocation on a fresh clone/CI runner downloads and executes the Maven distribution with nothing pinning its hash. `apache/maven` itself, being the tool rather than a wrapper consumer, carries no `.mvn/wrapper/` directory at all — it is not a corpus counterexample, just not applicable.

---

### D3. Ant: recognise and migrate (MVN-ANT)

#### 3.1 Ant's core model

A **project** is the top-level container (name, default target, `basedir`). A **target** is "a set of tasks you want to be executed," ordered by its `depends` attribute — but `depends` orders execution, it does not force it: "Ant's `depends` attribute only specifies the order in which targets should be executed — it does not affect whether the target that specifies the dependency(s) gets executed if the dependent target(s) did not (need to) run" ([using.html](https://ant.apache.org/manual/using.html)). A **task** is "a piece of code that can be executed," configured via XML attributes and nested elements, each optionally given an `id` for later reference. **Properties are write-once**: once `${propertyname}` is set, a second `<property name="x" value="y"/>` for the same name is silently ignored, not an overwrite — the opposite of a variable-assignment mental model, and a common source of "why didn't my override take effect" confusion when migrating or debugging.

#### 3.2 The six things a migration must preserve

| Ant concept | Gradle equivalent | Maven equivalent |
|---|---|---|
| Target (unit of work, `depends`-ordered) | `Task` (`dependsOn`, lazy configuration) | `<execution>` bound to a lifecycle phase |
| Fileset / patternset (include/exclude glob selection) | `ConfigurableFileTree` / `PatternSet`, `sourceSets` | `<includes>`/`<excludes>` inside a plugin's `<configuration>`, or `resources`/`testResources` |
| Custom taskdef (`<taskdef>`/`<typedef>`) | A custom Gradle `Task` type, or a `Plugin` | A custom Maven Mojo in a plugin module |
| Fork settings (`fork`, `forkmode` on `<javac>`/`<junit>`) | `JavaExec`/`Test` task's `javaLauncher`, `jvmArgs`, `fork` semantics | Surefire/compiler-plugin `<fork>`, `<argLine>`, toolchain config |
| Manifest content (`<manifest>` nested in `<jar>`) | `Jar` task's `manifest { attributes(...) }` | `maven-jar-plugin`'s `<archive><manifest>` |
| Signing (`<signjar>`) | `signing` plugin | `maven-jarsigner-plugin` |

`apache__ant@8c96cd6869:build.xml` is itself the worked example for filesets, manifests and custom taskdefs: its `<jar>` targets (lines 810, 823, 857) build the manifest inline (`<manifest><attribute name="Main-Class" .../></manifest>`) and pull `LICENSE.txt`/`NOTICE.txt` into `META-INF` via a `<metainf>` fileset rather than a separately-packaged file; a `<typedef uri="antlib:org.apache.ant.cyclonedx" .../>` (build.xml:2246) is the one custom-taskdef declaration in the corpus's only genuine Ant build.

Ant's own manual on the `<jar>` task's manifest element: it "is identical to the manifest task, but the file and mode attributes must be omitted," and `whenmanifestonly` (`skip`/`fail`/`create`, default `create`) governs what happens if the archive would otherwise be empty ([Tasks/jar.html](https://ant.apache.org/manual/Tasks/jar.html)). `<signjar>` requires `jar`, `alias` and `storepass`; its `preservelastmodified` attribute "give[s] the signed files the same last modified time as the original jar files," which is the one Ant-signing attribute directly relevant to reproducibility, alongside pinning `digestalg`/`sigalg` explicitly rather than taking the JDK-default algorithm ([Tasks/signjar.html](https://ant.apache.org/manual/Tasks/signjar.html)).

#### 3.3 `includeantruntime`: the decision that governs everything else

`<javac>`'s `includeantruntime` attribute defaults to environment-sensitive behavior governed by the `build.sysclasspath` property — effectively "yes" (Ant's own runtime jars end up on the compile classpath) unless explicitly set otherwise. Ant's own manual: **"It is usually best to set this to false so the script's behavior is not sensitive to the environment in which it is run"** ([Tasks/javac.html](https://ant.apache.org/manual/Tasks/javac.html)). apache/ant's own build.xml practices this: all 4 live `<javac>` invocations set `includeantruntime="false"` explicitly (`build.xml:666,720,773,1654`); a 5th occurrence (`build.xml:1774`) sits inside a commented-out `<!-- FIXME: removed junit collector build code -->` block and is dead, not a counterexample. A stray comment nearby (`build.xml:1788`, next to a `<junit>` task) notes `includeantruntime="false"` alone "does not solve 'multiple versions of ant detected in path for junit' warning" — a reminder that this one attribute fixes compile-classpath leakage specifically, not every Ant-classpath ambiguity.

#### 3.4 `ant.importBuild()`: the configuration-cache cost is total, not partial

Gradle's own Ant integration guide: **"Ant integration is not fully compatible with the configuration cache. Using Task.ant to run Ant task in the task action may work, but importing the Ant build is not supported. As a result, the configuration cache is automatically disabled when importing an Ant build."** ([docs.gradle.org/ant.html](https://docs.gradle.org/current/userguide/ant.html)). This is whole-build, not scoped to the imported targets — every other task in the same Gradle invocation loses configuration-cache reuse too, for as long as `ant.importBuild()` remains on the classpath of evaluation. The corpus has **zero real usages**: every `ant.importBuild` hit in the 32-repo set is inside `gradle/gradle`'s own documentation-snippet tree, teaching migration *away* from Ant, never a live build depending on it.

#### 3.5 Migration checklist, ordered, with a defensible stopping point

1. **Read, don't run.** Enumerate every `<target>`, its `depends` chain, and every property referenced but never assigned in the visible file (look for `-propertyfile`/CI-injected properties) — a build.xml frequently depends on externally-supplied state invisible in the file itself.
2. **Fix `includeantruntime` first, in place, before touching anything else.** Set it `false` explicitly on every `<javac>` (§3.3) — this is a same-system, zero-risk change that removes one axis of "it built on my machine" before any migration work begins.
3. **Extract the six preserved concepts (§3.2) into a table**: which target does what, which filesets/patternsets it selects, which taskdefs are custom (those need a Gradle/Maven equivalent written, not a mechanical translation), fork/manifest/signing settings.
4. **Do not reach for `ant.importBuild()` as the incremental step** (§3.4) — the configuration-cache cost is paid immediately and for the whole build, in exchange for a migration convenience that only defers the real rewrite. If an incremental bridge is unavoidable, prefer `AntBuilder`/`ant.<task>(...)` calls for individual tasks inside a real Gradle task, which Gradle's guide states may work under the configuration cache, over importing the whole build.
5. **Port target-by-target, leaf targets first** (targets nothing else `depends` on), verifying each output against the Ant build's own artifact (same jar contents, same manifest attributes, same signed-jar digest) before deleting the Ant equivalent.
6. **Defensible stopping point for a project that cannot finish**: keep `build.xml` for tasks with no economical Gradle/Maven equivalent yet (a bespoke custom taskdef with no port written), invoked as an **external process** (`Exec`/`exec {}` calling `ant -f build.xml <target>`) rather than via `ant.importBuild()` — this preserves the configuration cache for the rest of the build and keeps the boundary explicit and inspectable, at the cost of losing incremental up-to-date checking for that one step. This is a stopping point, not a recommendation to leave it there indefinitely.

## Normative guidance candidates

1. **State every Maven-4-specific claim with its verified currency, on every use.** Rationale: `4.0.0` has never shipped as of this writing; a rule that says "Maven 4 does X" without a recheck instruction ages into a false claim the day RC-N ships or GA lands. Verify: the row/rule text must contain the literal re-check command `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml`.
2. **Never invoke `integration-test` directly from the CLI or in CI; use `mvn verify`.** Rationale: hyphenated intermediate phases skip `post-integration-test` teardown/reporting and can leave containers running. Verify: grep CI config (`.github/workflows/**`, `Jenkinsfile`, `.gitlab-ci.yml`) for `mvn(w)? .*\bintegration-test\b` as a final goal, and for `mvn(w)? clean install` used as the CI gate instead of `verify`.
3. **Pin every plugin version explicitly in `<pluginManagement>`; never rely on the Super POM default.** Rationale: Maven 4 warns on unpinned defaults and default versions change across the 3→4 boundary, changing build behavior without a source change. Verify: `mvn help:effective-pom` and check every `<plugin>` entry carries `<version>`, or run `mvn -N versions:display-plugin-updates`.
4. **Before promoting a fresh Maven-3 project to Maven 4, grep for duplicate plugin declarations across `<build>` and any `<profile><build>`.** Rationale: Maven 3.9 only warns; Maven 4 hard-fails the build. Verify: `grep -c '<artifactId>' pom.xml` per plugin groupId/artifactId pair across both `<build>` and every `<profile>`, or run against a `4.0.0-rc-N` toolchain in CI as a canary before switching the default.
5. **Set `<release>` on `maven-compiler-plugin`; never rely on unset `source`/`target`.** Rationale: unset defaults to Java 8 regardless of the running JDK — a silent downlevel-compile trap. Verify: `grep -L '<release>' $(find . -name pom.xml)` combined with `grep -l 'maven-compiler-plugin'` — any file matching both is a hit.
6. **Pin annotation processors via `annotationProcessorPaths`; never let them ride the compile classpath.** Rationale: classpath-order-dependent, nondeterministic processor activation otherwise. Verify: any `pom.xml` with a `provided`/`compile`-scope dependency whose jar contains `META-INF/services/javax.annotation.processing.Processor`, and no matching `<annotationProcessorPaths><path>` entry for it.
7. **State the Surefire floor as "single JUnit-Platform provider, JUnit 4 ≥ 4.12" and cite Central, never the doc-site version banner, for the current release.** Rationale: the plugin's own doc banner and Central's release index disagree (banner: 3.6.0; Central GA: 3.5.6, newest artifact 3.6.0-M1). Verify: `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-plugin/maven-metadata.xml` before pinning a version in `<pluginManagement>`.
8. **On JDK 17+, compose `argLine` additively when both JaCoCo and manual JVM flags are present — never let one overwrite the other.** Rationale: [apache/maven#11605](https://github.com/apache/maven/pull/11605) is an open, unmerged bug describing exactly this clobber. Verify: grep `pom.xml` for a literal `<argLine>` value that does not reference `@{argLine}`/`@{jacocoArgLine}` in a module that also binds `jacoco-maven-plugin`'s `prepare-agent` goal.
9. **Set `project.build.outputTimestamp` (ISO-8601 UTC) explicitly on every Maven 3.9.x project that publishes.** Rationale: reproducible-by-default only starts at `4.0.0-beta-5`; the shipping 3.9.x line needs it stated. Verify: `mvn artifact:check-buildplan`, and `mvn clean verify artifact:compare` for a bit-identical rebuild.
10. **Never treat "inherits the ASF parent POM" as satisfying a dependency-convergence requirement.** Rationale: v39 enforces only Maven/Java version floors and a reproducible-release posture — zero drift protection. Verify: read the parent's own `enforcer-plugin` execution block (`mvn help:effective-pom | grep -A30 dependencyConvergence`) — its absence there is the finding, not an assumption.
11. **State Maven's checksum config (`aether.checksums.*`/`aether.connector.*`) by resolver-version family, and flag any `.mvn/maven.config` setting the pre-2.0 names as a Maven-4-migration breakage.** Rationale: property names changed between resolver 1.x and 2.0.x with no error on the old name — a silent no-op, not a failure. Verify: grep `.mvn/maven.config` for `aether.checksums.algorithms` or `aether.connector.smartChecksums` (old names) versus `aether.checksums.checksumAlgorithms`/`aether.connector.basic.smartChecksums` (2.0.x names), and cross-check against `.mvn/wrapper/maven-wrapper.properties`'s pinned Maven version.
12. **Never present Maven checksum configuration as a security/supply-chain control on its own.** Rationale: Maven Resolver's own docs state checksums provide integrity only, not trust, and do not defend against MITM or supply-chain tampering — GPG signing is the trust layer. Verify: any rule or doc claiming "checksums secure the build" against Maven should instead name `maven-gpg-plugin`/Central's mandatory signing as the actual control, and state checksum config as corruption-detection only.
13. **If `.mvn/maven.config` sets `aether.connector.smartChecksums=false`, treat it as load-bearing, not cosmetic — do not remove it when "cleaning up" build flags.** Rationale: `smartChecksums` only ever validates SHA-1 via an HTTP-header shortcut; disabling it is what makes a stronger algorithm preference (SHA-512/SHA-256) actually get exercised. Verify: reading heuristic — confirm the accompanying `aether.checksums(.checksumAlgorithms)?` list includes an algorithm beyond SHA-1/MD5 before treating the smartChecksums flag as removable.
14. **Set `wrapperSha256Sum` and `distributionSha256Sum` in every `.mvn/wrapper/maven-wrapper.properties`.** Rationale: both are optional and off by default; an unpinned wrapper download is an unauthenticated first-run supply-chain gap, identical to the unpinned-Gradle-wrapper risk already flagged elsewhere in this rule set. Verify: `grep -L 'distributionSha256Sum' $(find . -name maven-wrapper.properties)`.
15. **Set `includeantruntime="false"` explicitly on every live `<javac>` in any `build.xml` a rule touches, before any other Ant change.** Rationale: Ant's own manual recommends it, the default is environment-sensitive, and it is a same-system, zero-risk fix that should happen before any migration work. Verify: `grep -L 'includeantruntime' <build.xml>` intersected with `grep -c '<javac' <build.xml>` > 0, excluding XML-commented blocks.
16. **Never recommend `ant.importBuild()` as a target end-state or even as the default incremental-migration bridge.** Rationale: it disables the configuration cache for the entire Gradle build, unconditionally, per Gradle's own docs — and the corpus shows 0 real adopters. Verify: `grep -rn 'importBuild' **/*.gradle.kts **/*.gradle` — any hit outside a code comment/migration-notes file is a finding.
17. **State explicitly, per rule that touches Maven mechanics, whether it applies to Maven 3, Maven 4, or both — never leave it implicit.** Rationale: the two differ on plugin-declaration strictness, phase-scope semantics (`after:clean` on `mvn clean`), default `deployAtEnd`, and reproducibility defaults; an unqualified rule reads as universally true when it is version-specific. Verify: reading heuristic — every MVN-BUILD row states "(Maven 3)"/"(Maven 4)"/"(both)" inline.

## Exemplar evidence

| Candidate | Exemplar | Satisfies / violates | Evidence |
|---|---|---|---|
| #2 (`verify` not `integration-test`/`install`) | apache/maven's own CI | not directly measured this dive; carried from M-J-10 | [jvm-topic-map.md](../jvm-topic-map.md) row M-J-10 |
| #5 (`release` not `source`/`target`) | google/guava | **violates** | `google__guava@5fb424c43a:pom.xml` hard-codes `1.8` via `maven.compiler.source`/`target` in 3 places |
| #6 (`annotationProcessorPaths`) | not independently re-measured this dive | — | carried from M-J-07, uncovered in corpus per config-inventory |
| #8 (`--add-opens`/JaCoCo `argLine` composition) | FasterXML/jackson-databind | **satisfies the pattern this rule asks for** | `FasterXML__jackson-databind@a906e1782b:pom.xml:44` |
| #9 (`project.build.outputTimestamp`) | 3/32 corpus-wide | mostly **violates** | [exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md) |
| #10 (ASF parent ≠ convergence) | apache/maven, apache/ant (both ASF, parent v39-family) | **confirms the gap** — neither binds `dependencyConvergence` | `apache__maven@ea4a417bd2:pom.xml`, `apache__ant@8c96cd6869` build config; [pom/asf](https://maven.apache.org/pom/asf/) |
| #11 (resolver-version-conditional checksum config) | assertj/assertj | **the only exemplar with this config at all; it is version-conditional as described** | `assertj__assertj@485502bad2:.mvn/maven.config`, `.mvn/wrapper/maven-wrapper.properties` (`distributionUrl=…apache-maven-3.9.16…`) |
| #12 (checksums ≠ security) | n/a — a documentation claim, not a corpus pattern | — | [resolver/about-checksums.html](https://maven.apache.org/resolver/about-checksums.html) |
| #14 (wrapper checksum fields) | assertj/assertj | **violates** — both fields absent | `assertj__assertj@485502bad2:.mvn/wrapper/maven-wrapper.properties` (fetched directly, no `wrapperSha256Sum`/`distributionSha256Sum` keys present) |
| #15 (`includeantruntime=false`) | apache/ant | **satisfies**, 4/4 live occurrences | `apache__ant@8c96cd6869:build.xml:666,720,773,1654` (5th occurrence at :1774 is dead code inside a `<!-- FIXME -->` comment block) |
| #16 (never `ant.importBuild()` as end-state) | corpus-wide | **0/32 real usages**; only gradle/gradle's own doc snippets | [maven-ant-bazel-canonical.md](../jvm-topic-map/maven-ant-bazel-canonical.md), confirmed via `git -C .tmp-jvm-exemplars/gradle__gradle grep -l importBuild` scoped to docs paths only |

## AI-agent angle

- **Hallucinating Maven 4 as GA.** An LLM trained through 2026-era chatter about Maven 4 will confidently write `<parent><artifactId>maven-core</artifactId><version>4.0.0</version></parent>` or recommend Maven-4-only features as safe defaults. Check: resolve every Maven coordinate against Central's `maven-metadata.xml` before emitting it in a POM or a recommendation — the same mechanism-not-a-rate rule wave 2 already applied to dependency hallucination generally (frame correction 34).
- **Citing the Surefire plugin doc-site's version banner as "the current version."** The doc site itself reads "Version: 3.6.0" while Central's GA line stops at 3.5.6 and the newest artifact is 3.6.0-M1 — a model pattern-matching on the doc page will pin a non-GA milestone as if it were stable. Check: query Central's `maven-metadata.xml`, never the plugin site header, before pinning a `<pluginManagement>` version.
- **Writing `<source>`/`<target>` instead of `<release>` on `maven-compiler-plugin`**, because pre-2020 tutorials (heavily represented in training data) universally use the deprecated pair. Check: `grep -n '<source>\|<target>' pom.xml` inside a `maven-compiler-plugin` `<configuration>` block flags the outdated idiom even if the values look modern (e.g. `<source>21</source>`).
- **Treating `mvn clean install` as the default CI command**, an extremely common pre-4 idiom in training data, when Maven's own current guidance is `mvn verify`, and `install`'s `~/.m2` write is a CI-non-determinism risk. Check: grep CI config for `install` as the last goal on the Maven invocation line; flag unless a documented reason (a multi-job pipeline reusing a shared local repo) is present.
- **Recommending `ant.importBuild()` as "the standard way to bridge Ant into Gradle"**, since Gradle's own tutorial-era docs (still widely mirrored in blog posts a model was trained on) present it as the headline feature without foregrounding the configuration-cache cost, which is a comparatively recent (Gradle 7+ configuration-cache era) consequence. Check: any generated Gradle build script containing `ant.importBuild` should be flagged for a config-cache-impact callout, regardless of how the surrounding prose frames it.
- **Assuming `-Daether.checksums.algorithms=...` "just works" on any Maven version**, because the flag reads as self-evidently correct system-property syntax and a model has no version-awareness of the resolver rename baked in. Check: cross-reference against the pinned wrapper's Maven version (§2.1) before treating the flag as functional; flag any `.mvn/maven.config` using the pre-2.0 names on a wrapper pinned to a `4.0.0-*` distribution.
- **Treating a checksum-algorithm list as a security hardening measure for Maven**, importing the framing correctly used for Gradle's dependency verification. Check: any generated documentation or rule stating "SHA-512 secures the Maven build against supply-chain attacks" contradicts Maven Resolver's own stated design and should cite GPG signing instead.

## Contested / evolving

- **Whether `ant.importBuild()` should ever ship as a documented migration step at all**, versus being omitted from guidance entirely. This dive's answer (never recommend it as an end-state or default bridge; the `Exec`-boundary alternative in §3.5 step 6 is the fallback) follows directly from Gradle's own docs plus the 0/32 corpus adoption, but Gradle's tutorial-era materials still present it uncritically — as of 2026-09-12 the trend in Gradle's own current userguide is toward foregrounding the configuration-cache cost, not away from it, so this is settling rather than genuinely contested.
- **Maven 4's GA date remains unknown.** `4.0.0-rc-6` is the latest as of 2026-09-12; nothing in Maven's own release notes or JIRA roadmap fetched this dive commits to a date. Every Maven-4-specific claim in this document is date-stamped and re-check-scripted for exactly this reason (candidate #1, #17).
- **Whether Maven should adopt something verification-metadata.xml-shaped natively.** No open Maven JIRA ticket surfaced in this dive's fetches proposing it; the gap (§2.3) is stated as a fact about the current tool, not a prediction about where Maven is heading. Treat as an open question, not a roadmap item, until a primary source says otherwise.
- **The `argLine`/JaCoCo clobber (#8) has a proposed but unmerged fix** ([apache/maven#11605](https://github.com/apache/maven/pull/11605)). Whether it lands as-is, gets redesigned, or is superseded by a different mechanism in a future Surefire/JaCoCo release is unsettled; the workaround in candidate #8 is what to apply meanwhile, not a permanent recommendation.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) | Primary — Maven's own lifecycle guide | current, 2026-09-12 fetch | Defines the 23 phases and the "don't call hyphenated phases directly" warning verbatim |
| [maven.apache.org/whatsnewinmaven4.html](https://maven.apache.org/whatsnewinmaven4.html) | Primary — Maven 4 feature/breaking-change page | current, tracks `4.0.0-rc-6` era | Single richest source for every Maven-4 breaking change in this dive |
| [maven.apache.org/guides/mini/guide-migration-to-mvn4.html](https://maven.apache.org/guides/mini/guide-migration-to-mvn4.html) | Primary — official 3→4 migration guide | current | The three-step Prepare/Test/Migrate sequence behind the checklist in §1.2 |
| [maven.apache.org/plugins/maven-compiler-plugin/](https://maven.apache.org/plugins/maven-compiler-plugin/) | Primary — plugin overview page | current | States the Java-8-regardless-of-JDK default in the plugin's own words |
| [maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html](https://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html) | Primary — compile mojo parameter reference | current | `annotationProcessorPaths` type and behavior |
| [maven.apache.org/surefire/maven-surefire-plugin/](https://maven.apache.org/surefire/maven-surefire-plugin/) | Primary — Surefire plugin front page | doc banner reads 2026-08-31 | Source of the doc-banner-vs-Central-GA gap (candidate #7) |
| [maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html) | Primary — Surefire 3.6.0 release notes | 2026 | The single-provider consolidation and JUnit-4-≥4.12 floor, verbatim |
| [maven.apache.org/guides/mini/guide-reproducible-builds.html](https://maven.apache.org/guides/mini/guide-reproducible-builds.html) | Primary — reproducible builds guide | current | `outputTimestamp` format, `4.0.0-beta-5` default-on date, verification commands |
| [maven.apache.org/pom/asf/](https://maven.apache.org/pom/asf/) | Primary — ASF parent POM (v39) docs | current (Last Published 2026-06-25) | What the widely-inherited parent actually enforces — and what it doesn't |
| [maven.apache.org/wrapper/](https://maven.apache.org/wrapper/) | Primary — Maven Wrapper docs | current | `wrapperSha256Sum`/`distributionSha256Sum` semantics, opt-in status |
| [maven.apache.org/resolver/configuration.html](https://maven.apache.org/resolver/configuration.html) | Primary — current Maven Resolver (2.0.x) config reference | current, fetched+grepped directly | Confirms the renamed `aether.checksums.checksumAlgorithms`/`aether.connector.basic.smartChecksums` and the *absence* of the old names |
| [maven.apache.org/resolver/about-checksums.html](https://maven.apache.org/resolver/about-checksums.html) | Primary — Resolver team's own design rationale for checksums | current | States plainly that checksums are integrity-only, not a security/trust mechanism |
| [maven.apache.org/resolver-archives/resolver-1.9.22/configuration.html](https://maven.apache.org/resolver-archives/resolver-1.9.22/configuration.html) | Primary — archived Resolver 1.9.22 config reference | historical (resolver line bundled by Maven 3.9.x) | Confirms `aether.checksums.algorithms`/`aether.connector.smartChecksums` as the *live* 1.x names — the other half of the version-conditional finding |
| [maven.apache.org/resolver-archives/resolver-1.6.3/configuration.html](https://maven.apache.org/resolver-archives/resolver-1.6.3/configuration.html) | Primary — archived Resolver 1.6.3 config reference | historical | Cross-check that the old property names predate 1.9.x too, i.e. are the long-standing 1.x convention, not a one-version fluke |
| [repo.maven.apache.org/.../maven/3.9.16/maven-3.9.16.pom](https://repo.maven.apache.org/maven2/org/apache/maven/maven/3.9.16/maven-3.9.16.pom) | Primary — Central registry artifact | current | Fixes `resolverVersion=1.9.27` for the exact Maven build assertj's wrapper pins |
| [github.com/apache/maven/pull/11605](https://github.com/apache/maven/pull/11605) | Primary — apache/maven PR (fetched via `gh api`) | open, unmerged as of 2026-09-12 | Confirms the `--add-opens`/JaCoCo `argLine` bug is proposed-fix-only, not shipped |
| [ant.apache.org/manual/using.html](https://ant.apache.org/manual/using.html) | Primary — Ant user manual, core concepts | current (Ant's manual is stable/slow-moving) | Project/target/task/property definitions, `depends`-orders-not-forces semantics |
| [ant.apache.org/manual/Tasks/javac.html](https://ant.apache.org/manual/Tasks/javac.html) | Primary — Ant `<javac>` task reference | current | `includeantruntime` default behavior and the manual's own "usually best... false" recommendation |
| [ant.apache.org/manual/Tasks/jar.html](https://ant.apache.org/manual/Tasks/jar.html) | Primary — Ant `<jar>` task reference | current | `<manifest>`, `whenmanifestonly`, `<metainf>`, `index` semantics |
| [ant.apache.org/manual/Tasks/signjar.html](https://ant.apache.org/manual/Tasks/signjar.html) | Primary — Ant `<signjar>` task reference | current | Required attributes and the `preservelastmodified` reproducibility flag |
| [docs.gradle.org/current/userguide/ant.html](https://docs.gradle.org/current/userguide/ant.html) | Primary — Gradle's own Ant-integration guide | current | The verbatim "configuration cache is automatically disabled when importing an Ant build" statement |
| `apache__ant@8c96cd6869:build.xml` | Exemplar corpus (measured directly this dive) | pinned SHA, 2026-09-05 clone | The corpus's only genuine Ant build; source of every Ant exemplar-evidence row |
| `assertj__assertj@485502bad2:.mvn/{maven.config,wrapper/maven-wrapper.properties}` | Exemplar corpus (measured directly this dive) | pinned SHA | The corpus's only checksum-config sample; source of the resolver-version-conditional finding |
| `apache__maven@ea4a417bd2:.mvn/maven.config` | Exemplar corpus (measured directly this dive) | pinned SHA | Confirms Maven's own build sets no checksum property at all |
| [jvm-topic-map.md](../jvm-topic-map.md) (rows M-J-01…M-J-16, §"Artifact set decision", §"Conflicts resolved") | Program-internal — the binding decisions for this dive | 2026-09-05/09-12 | The brief's authority; every row this dive was commissioned to settle |
| [jvm-dependencies.md](../jvm-dependencies.md) (MVN-DEP-01…11, §"assertj's checksum config") | Program-internal — sibling consolidation, handed this dive its open question | 2026-09-12 | The exact gap ("MVN-DEP has no supply-chain row") this dive's D2 closes |

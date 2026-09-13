---
paths:
  - "**/*.gradle.kts"
  - "**/*.gradle"
  - "**/gradle.properties"
  - "**/*.versions.toml"
  - "**/gradle/wrapper/gradle-wrapper.properties"
  - "**/gradle/verification-metadata.xml"
  - "**/gradle.lockfile"
  - "**/buildscript-gradle.lockfile"
summary: "The Gradle build index: the gate, the non-negotiables, and where the depth lives for build scripts, settings files, catalogs, the wrapper and lockfiles"
keywords: gradle,kotlin-dsl,build-logic,convention-plugin,version-catalog,configuration-cache,build-cache,toolchain,wrapper,dependency-locking,verification-metadata,shadow,publishing,central-portal,testkit,ci
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---

# Gradle Build

Traps, not maps. Everything here names a mistake a build makes without it, and
the shape of any particular build is discoverable by reading its settings file.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Rules This File Owns](#rules-this-file-owns) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) ·
[Siblings](#siblings)

**Before trusting any rule below, know what a green `./gradlew build` does not
prove.** It does not prove the configuration cache is on, because Gradle 9
disables it for a task and carries on rather than failing (`GRADLE-CACHE-08`).
It does not run `validatePlugins`, so every task-annotation defect stays a
`jar`-time warning nobody reads (`GRADLE-PLUG-01`). It does not pin a version,
because a version catalog constrains requests and pins nothing
(`GRADLE-DEP-09`). And it never reports an `org.gradle.*` key placed in a
`gradle.properties` that is not a build root, which is read by nothing and
believed by everyone (`GRADLE-STRUCT-11`). All four look exactly like a pass.

## The Gate

Run it after every change, narrowest scope first. Each stage costs more than the
last, so the common case never reaches the slow ones. Gradle 9.x, verified
2026-09-12.

```bash
./gradlew help --configuration-cache   # the configuration phase, cheapest of all
./gradlew validatePlugins              # any module defining a task or a plugin
./gradlew check                        # compile, tests, coverage floor, lint, ABI
./gradlew build                        # the invocation CI runs, artifacts included
./gradlew buildHealth                  # api vs implementation, unused, undeclared
./gradlew publishToMavenLocal          # modules that publish
```

`./gradlew`, never a `gradle` off `$PATH`. A `gradle` on the path is whatever
the runner image happens to ship, which is the most common way two people get
different answers from one build (`GRADLE-CI-01`), and the committed wrapper is
trustworthy only once `distributionSha256Sum` sits beside `distributionUrl`
(`GRADLE-TOOL-03`).

Line one is the whole configuration-cache contract in one command: no problems
line and no report file under `build/reports/configuration-cache/` is the pass,
and any report file is the finding (`GRADLE-CACHE-01`, `-02`, `-05`). Run
`./gradlew -q javaToolchains` beside it to read which JDK actually compiles,
rather than which one the build file names (`GRADLE-TOOL-01`).

Gradle's one named target is the `check` lifecycle task. Wire every gate task
into it from a convention plugin, and keep the switches in the root
`gradle.properties` where every invocation inherits them, never in a CI-only
`--configuration-cache` or `--build-cache` flag (`GRADLE-CI-04`).
`validatePlugins` is the single deliberate exception: nothing under `build`
invokes it, so it runs as its own CI step whose exit code gates the job
(`GRADLE-PLUG-01`).

A task is done when a command, its exit code, and the tree it ran against are
all named. Narration is not evidence.

## Non-Negotiables

Every line below blocks a merge. IDs resolve to the depth files in
[Where the Depth Is](#where-the-depth-is), where each rule carries its rationale
and verification.

| # | Rule | ID |
|---|---|---|
| 1 | Every committed `gradle-wrapper.properties` carries a `distributionSha256Sum`, regenerated with the `wrapper` task rather than by editing the line. CI sets Gradle up with `gradle/actions/setup-gradle` and invokes `./gradlew`, or carries `gradle/actions/wrapper-validation` instead, and never neither. | GRADLE-TOOL-03, GRADLE-CI-01, GRADLE-DEP-17 |
| 2 | The compiling JDK is pinned by a toolchain that reaches every module, never by an ambient `JAVA_HOME` and never by a `sourceCompatibility` line. Its acquisition is one explicit choice: the foojay resolver in the settings file, or `auto-download=false` plus a CI-installed JDK. Never neither, never both. | GRADLE-TOOL-01, GRADLE-TOOL-02 |
| 3 | UTF-8 is set at both layers: `options.encoding` on every `JavaCompile`, and, wherever a Windows or otherwise non-UTF-8 runner is in scope, `-Dfile.encoding=UTF-8` inside the root `org.gradle.jvmargs` for the daemon. A JDK 18+ floor fixes neither, and a task-level flag alone is a half-fix. | JAVA-PLAT-12, JAVA-PLAT-13 |
| 4 | Nothing reads a file, spawns a process, resolves a `Configuration`, enumerates the environment, or holds live-JVM state at configuration time, and a task action never touches `Project`. | GRADLE-CACHE-01, GRADLE-CACHE-02, GRADLE-CACHE-03, GRADLE-CACHE-05 |
| 5 | Every task and transform property carries exactly one input or output annotation, a file-typed property is never `@Input`, every cacheable file input declares its normalization, and one task consumes another's output through the provider chain, never through a bare `File` or `archivePath`. | GRADLE-CACHE-11, GRADLE-CACHE-12, GRADLE-CACHE-13, GRADLE-CACHE-15 |
| 6 | `validatePlugins` runs as its own CI step whose exit code gates the job, and every module applying `com.gradle.plugin-publish` sets `enableStricterValidation = true`. | GRADLE-PLUG-01, GRADLE-PLUG-02 |
| 7 | Plugin code never calls `afterEvaluate {}` (the one carve-out being fail-fast validation of its own extension's final state), never imports a Gradle type from an `internal` package or one named `Internal` or `Impl`, and never reaches the environment or an external CLI at configuration time. A `ValueSource` reads, a `BuildService` holds and enforces, never the reverse. | GRADLE-PLUG-05, GRADLE-PLUG-03, GRADLE-PLUG-07, GRADLE-PLUG-08 |
| 8 | A type that appears in a public signature is declared `api`, everything else is `implementation`, and the only evidence for either is `projectHealth`, never a local `build` going green. | GRADLE-DEP-01 |
| 9 | Never write a version string that has not been observed to resolve against the real repository in this session, and never declare a range, a `+` suffix, `latest.release`, `latest.integration` or a `-SNAPSHOT` coordinate in a build that produces a release artifact. | GRADLE-DEP-18, GRADLE-DEP-07 |
| 10 | A version catalog is a request, never a pin: no committed lockfile on disk means nothing is pinned. Detect a catalog by content, never by a `libs.versions.toml` filename glob. | GRADLE-DEP-09, GRADLE-DEP-08 |
| 11 | **pinned.** A repository that publishes releases commits `gradle.lockfile` from `lockAllConfigurations()` and a `verification-metadata.xml` bootstrapped with `--write-verification-metadata sha256,pgp`, reviews every regeneration diff by hand, and never clears a missing-checksum entry by editing the file. | GRADLE-DEP-12, GRADLE-DEP-15, GRADLE-DEP-16 |
| 12 | Never `enforcedPlatform()` in a module that is published or consumed as a library, and never `strictly(...)` or the `!!` shorthand in a published library's own `api` or `implementation` declarations. | GRADLE-DEP-05, GRADLE-DEP-06 |
| 13 | An `org.gradle.*` key lives only in a build root's `gradle.properties`, the configuration and build caches are switched on there rather than by a CI flag, and remote build-cache **push** is gated on possession of a write credential read through `providers.environmentVariable(...).isPresent`, never on CI-ness or a branch name. | GRADLE-STRUCT-11, GRADLE-CI-04, GRADLE-STRUCT-12 |
| 14 | Inside a precompiled script plugin, never a dot-notation catalog accessor, never an `org.gradle.accessors.dm.LibrariesForLibs` import to restore one, and never `alias(libs.plugins.x)`. Bind the catalog through `VersionCatalogsExtension` and declare the plugin's marker artifact in the build-logic module's own `dependencies {}`. | GRADLE-STRUCT-03, GRADLE-STRUCT-04, GRADLE-STRUCT-05 |
| 15 | Never publish a merged jar under a library's primary coordinates: vendoring requires namespace relocation, real POM dependencies for everything left unbundled, and a written reason. Every shaded jar excludes `META-INF/*.SF`, `*.DSA`, `*.RSA` and `*.EC`, all four in one list, or the JVM throws `SecurityException` at class load. The plugin id is `com.gradleup.shadow`, and `com.github.johnrengelman.shadow` is the dead pre-2023 coordinate (verified 2026-09-12). | GRADLE-DIST-02, GRADLE-DIST-05, GRADLE-DIST-13, GRADLE-DIST-12 |
| 16 | Author a release against the Central Portal directly, never against `oss.sonatype.org`, `s01.oss.sonatype.org` or `io.codearte.nexus-staging`, because OSSRH ended 2025-06-30 (verified 2026-09-12). No `credentials { }` username or password is a string literal, and no committed `repositories { }` block declares `mavenLocal()`. | GRADLE-PUB-16, GRADLE-PUB-08, GRADLE-PUB-15 |
| 17 | Every workflow `uses:` is pinned to a 40-character commit SHA, a `./` local action excepted, and every workflow declares `permissions:` at its root starting from `contents: read`. | GRADLE-CI-09, GRADLE-CI-10 |
| 18 | Never reach green by weakening the check, and never ship a verification nobody has watched go red. | GRADLE-CORE-01, GRADLE-CORE-02 |

## Rules This File Owns

Three cross-cutting rules that belong to no single depth file. Everything else
is defined in a depth file and only cited here.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CORE-01 | Never reach green by weakening the check: no new `ignoreFailures = true`, no `enabled = false` on a gate task, no new `-PskipX` or `-x` exclusion on the CI invocation, no widened test `exclude` or lint baseline, no lowered JaCoCo or Kover floor, no new `@Suppress` or `@SuppressWarnings`, and no edit to the convention plugin that owns the gate as part of a functional change. | The gate's whole value is that it can go red. A change that edits both the build and the logic that judges it reports nothing and looks identical to a passing change. Gradle makes this cheap, because every gate in the build is one property or one `configureEach` block away from being a silent no-op. | `git diff --stat -- gradle.properties build-logic buildSrc '*.versions.toml'` in a change that is not itself a gate change: any hit is the violation. Then, for the build files the change touches, `grep -rn --include='*.gradle.kts' --include='*.gradle' -e 'ignoreFailures' -e 'enabled = false' -e 'onlyIf' -e 'Suppress' -e 'exclude(' .` and read which lines this change added. A line added by this change is the finding, and empty output is the pass. | MUST |
| GRADLE-CORE-02 | A verification enters a rule table, a CI job, or a review only after it has been watched go red against a deliberately planted violation. | A check that cannot fail launders an unchecked change as a checked one, and reads exactly like a passing one forever. Gradle's failure modes here are specific and all silent: a task whose configuration cache Gradle disabled rather than failing, a `validatePlugins` that no lifecycle task invokes, an `org.gradle.*` key in a `gradle.properties` that is not a build root, and a `verification-metadata.xml` whose entries a hand edit emptied. | Copy the subject, break the thing the rule forbids, run the verification. A pass on the broken copy is the violation. Planting a violation is cheap in a build script: read a file at configuration time, drop the `@PathSensitive`, or blank the `distributionSha256Sum`. | MUST |
| GRADLE-CORE-03 | State whether empty output means a pass or means the finding, in every verification that is not self-evidently one or the other. | Most checks in this rule set are inverted. An absent `distributionSha256Sum`, an absent `gradle.lockfile`, an absent toolchain block, an absent `options.encoding`, an absent `permissions:` root and an absent `exclusiveContent` are each *the finding*, not the pass. | Read each verification cell: one whose empty output is ambiguous is the violation. | SHOULD |

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed
under. One level deep. These files do not point at each other.

| Doing… | Read |
|---|---|
| Adding a subproject or a convention plugin, choosing `buildSrc` or `build-logic`, wiring a version catalog into build logic, or editing a settings file or a `gradle.properties` | [gradle-build/structure-and-conventions.md](gradle-build/structure-and-conventions.md) |
| Declaring a dependency, choosing `api` or `implementation` or `compileOnly`, importing a platform or BOM, resolving a version conflict, locking or verifying dependencies, or bumping a version | [gradle-build/dependencies.md](gradle-build/dependencies.md) |
| Touching any version catalog file, including one whose name does not end `.versions.toml` and which therefore loads no rule by glob at all | [gradle-build/dependencies.md](gradle-build/dependencies.md), read from here, because `GRADLE-DEP-08`'s whole subject is that the filename is a false negative |
| Writing a task action or build script that must survive `--configuration-cache`, declaring task inputs and outputs, reading an environment variable or a file at configuration time, or editing an archive task | [gradle-build/caching-and-correctness.md](gradle-build/caching-and-correctness.md) |
| Declaring or changing a Java toolchain, deciding how a JDK is acquired, setting `options.release` or a source encoding, or editing the wrapper's `distributionUrl` | [gradle-build/toolchains-and-compilation.md](gradle-build/toolchains-and-compilation.md) |
| Writing a Gradle plugin or a `Plugin<Settings>`: annotating task inputs, reading the environment or an external CLI, wiring a `ValueSource` or a `BuildService`, building the TestKit matrix, or publishing to the Plugin Portal | [gradle-build/plugin-authoring.md](gradle-build/plugin-authoring.md) |
| Shipping something runnable, or deciding whether a library may shade at all: fat jars and transformers, the `application` plugin, Spring Boot `bootJar` and layers, jlink, jpackage, Jib and Dockerfiles | [gradle-build/distribution.md](gradle-build/distribution.md) |
| Publishing an artifact anyone else consumes, or changing what a consumer sees: publications, POM metadata, signing, Gradle Module Metadata, `mavenLocal`, release-job exit semantics | [gradle-build/publishing.md](gradle-build/publishing.md) |
| Writing or editing a CI workflow that runs Gradle: the setup and wrapper-validation step, who owns the cache switches, build scans, the JDK matrix, action pinning and workflow permissions, Dependabot or Renovate | [gradle-build/ci.md](gradle-build/ci.md), read from here, because no glob in this rule reaches `.github/workflows/`, so the whole `GRADLE-CI` family loads only through this line |
| Writing the Java or Kotlin sources this build compiles | `java-quality`, `kotlin-quality` (sibling sets, see below) |
| Editing a `pom.xml`, a `.mvn` directory or a `build.xml` in the same repository | `maven-build` (sibling set, see below) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the
commit body. CONSIDER = Suggest: never blocks, never re-raised after a decline.

Rules marked **pinned** here or in a depth file (dependency locking and
verification metadata, the consumer-Gradle floor and its TestKit matrix, the
CI JDK legs) encode an agreed decision rather than a derivable fact. They are
defaults an adopter may override, once, in their own convention plugin or root
`gradle.properties`, never per module. Overriding one is a decision. Ignoring
one is a violation.

Keep the Block list short enough that a blocked change is unusual. A rule set
where everything blocks teaches the reader to negotiate with all of it. The two
deliberate exceptions are `GRADLE-PUB`, where published coordinates are
immutable and a bad release is unrecoverable, and `GRADLE-CACHE`, where the
defect never surfaces as a failure and is paid for as a stale artifact instead.

## Siblings

- **`maven-build`**, the same questions answered by the other build system:
  resolution and mediation, the lifecycle and its plugins, toolchains, and the
  Maven side of Central publishing. Loads on `**/pom.xml`, `**/.mvn/**`, the
  Maven wrapper and the Ant files, globs this set deliberately does not cover,
  so the two rules never load together. Where the two ecosystems genuinely
  disagree it says so: `MVN-BUILD-12` carries the contrast with `GRADLE-DEP-16`
  on what a checksum proves, and Maven has no analogue of
  `verification-metadata.xml` at all.
- **`java-quality`** and **`kotlin-quality`**, the sources this build compiles,
  on `**/*.java` and on `**/*.kt` plus `**/*.kts`. The `.kts` overlap is
  deliberate, because a Kotlin-DSL build script is Kotlin source: editing one
  loads both indexes, and editing a `.kt` source file loads only theirs. Two
  rows in `toolchains-and-compilation.md` keep their `JAVA-PLAT` IDs for the
  same reason, since the edit site is a build file and the decision is the
  language's.
- **`bazel-quality`**, for a repository that builds with Bazel and keeps a
  Gradle build only as a publishing handoff. Whether `rules_jvm_external`'s
  `java_export` can produce a Portal-acceptable bundle was unresolved as of
  2026-09-12; the hand-off-to-Gradle path, which is dagger's own answer, is
  governed here.

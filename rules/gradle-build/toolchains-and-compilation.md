---
title: Gradle Toolchains, Encoding and the Wrapper
summary: "The GRADLE-TOOL family: which JDK compiles, how that JDK is acquired, what the wrapper pins, the charset at both layers, and the build-script spellings that no longer work"
---

# Gradle Toolchains, Encoding and the Wrapper

`GRADLE-TOOL` owns the JDKs a Gradle build involves (the one that runs Gradle
itself, the one that runs `javac`, and how the second is acquired), what
`gradle/wrapper/gradle-wrapper.properties` pins, the charset at both the compile
task and the daemon, which `gradle.properties` keys are worth setting, and the
dead build-script syntax that still appears in generated diffs. It does not own
the bytecode and API floor itself, which is `JAVA-PLAT` in the `java-quality` set
and `MVN-BUILD` in `maven-build`, nor Kotlin's `jvmTarget`, `jvmToolchain` and
compiler flags, which are `KT-COMP` in `kotlin-quality`. Inside this rule set,
the configuration cache, task-input annotations and archive reproducibility are
`GRADLE-CACHE`, the settings file, build-logic layout and version catalogs are
`GRADLE-STRUCT`, dependency coordinates, locking and the CI check on the
committed wrapper *jar* are `GRADLE-DEP`, plugin authoring is `GRADLE-PLUG`, and
CI matrix legs are `GRADLE-CI`. Two rows below keep `JAVA-PLAT` IDs: their edit
site is a build file so they load from here, and a shipped ID is never
renumbered.

Contents: [Measurement and Floors](#measurement-and-floors) ·
[The Toolchain](#the-toolchain) ·
[Source and Daemon Encoding](#source-and-daemon-encoding) ·
[The Wrapper](#the-wrapper) · [gradle.properties](#gradleproperties) ·
[Dead Build-Script Syntax](#dead-build-script-syntax) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Measurement and Floors

Corpus counts are over the 32-repository JVM exemplar set, verified 2026-09-12.
Re-read the wrapper's pinned Gradle version before applying any row that carries
one.

| Fact | State on 2026-09-12 |
|---|---|
| JVM that runs Gradle | Gradle 9.0.0 (2025-07-31) raised the minimum to JVM 17. The current line requires a JVM between 17 and 26, and states that JVM 27 and later are not yet supported. The wrapper, Tooling API and TestKit clients stay compatible with JVM 8 |
| Toolchain support | JDK 25 toolchains land in Gradle 9.1.0 (2025-09-18), JDK 26 in Gradle 9.4.0. A toolchain newer than the wrapper's Gradle fails at configuration time |
| Provisioning | `org.gradle.toolchains.foojay-resolver-convention` version 1.0.0, applied in the **settings** file. 8 of 32 apply it. GA releases only, with no support for downloading early-access builds |
| Wrapper checksums | `distributionSha256Sum` present in 12 of 21 committed wrappers. `networkTimeout` and `validateDistributionUrl` are in 21 of 21 because the wrapper task writes them, not because authors add them |
| Distribution type | 20 of 21 pin `-bin`. One repository pins `-all`, for IDE source attach during its own development |
| Encoding | 15 of 32 set the source encoding and 13 of 32 set the daemon's, and they are not the same repositories |
| Removed configurations | `compile` and `runtime` were removed with Gradle 7.0. The true corpus count of `compile`, `runtime` and `testCompile` is 0 of 32 once one build's own custom configuration named `runtime` is excluded |

## The Toolchain

One command shows what the build will actually pick:
`./gradlew -q javaToolchains` prints every detected JDK with the source that
detected it. Read it before trusting any grep below, because a matching JDK found
by accident on one machine is indistinguishable in a build log from a pinned one.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-TOOL-01 | Pin the compiling JDK with `java { toolchain { languageVersion = JavaLanguageVersion.of(N) } }`, in a convention plugin that reaches every JVM module rather than per module. Never let an ambient `JAVA_HOME` decide it, and never read a `sourceCompatibility` or `targetCompatibility` line as evidence that a toolchain is pinned. | Three JDK numbers are in play and only one of them is this rule's: the JVM that runs Gradle (17 to 26 on the 9.x line), the JDK that runs `javac`, and the bytecode and API floor that `JAVA-PLAT` owns as `options.release`. Without a toolchain the second one is whatever the runner image shipped, so the class files differ between two green builds and nothing in either log says so. `sourceCompatibility` sets a class-file version and performs no API check, so it answers neither question. | `./gradlew -q javaToolchains`, then `grep -rn --include='*.gradle' --include='*.gradle.kts' -e 'JavaLanguageVersion.of' -e 'jvmToolchain(' .`. Empty output in a repository with Java or Kotlin sources is the finding. Cross-check the requested version against the wrapper's Gradle version, because 25 needs Gradle 9.1.0 or later and 26 needs 9.4.0 or later (verified 2026-09-12). A green `./gradlew build` is not evidence: it proves one machine had a matching JDK. | MUST |
| GRADLE-TOOL-02 | Make JDK acquisition an explicit decision, one of two. Either apply `org.gradle.toolchains.foojay-resolver-convention` in the root **settings** file, or set `org.gradle.java.installations.auto-download=false` and install the JDK in the runner image or a CI step. Never ship a toolchain declaration with neither, and never both. | Without a toolchain download repository Gradle can auto-*detect* a local JDK but cannot auto-*download* one, so the build succeeds wherever a matching JDK happens to exist and fails on a clean runner with a message about no matching toolchain. The opposite posture is also defensible and is argued in public: provisioning replaces an explicit JDK requirement with a network call to a vendor API on the critical path, and `JavaToolchainDownload` carries a bare URI with no checksum field anywhere in the resolver contract, foojay included, so what arrives is unverified (`GRADLE-PLUG` owns the plugin-side consequence). Either posture is fine. The silent middle is not. | `grep -rn --include='settings.gradle' --include='settings.gradle.kts' -e 'foojay-resolver' .` and `grep -n 'auto-download' gradle.properties`. In a repository that declares a toolchain, empty output from both is the finding, and exactly one hit is the pass. Hits from both is dead configuration to read and delete: the property wins and the resolver never runs. | MUST |

```kotlin
// wrong: compiles with whatever JDK the runner shipped, and pins a class-file
// version with no check against the target platform's API surface
java { sourceCompatibility = JavaVersion.VERSION_17 }
```

```kotlin
// right: the JDK that compiles, the floor it targets, and the charset, all stated.
// 25 and 17 are this program's pinned default, owned by the JAVA-PLAT family;
// an adopter overrides the pair once, in their own convention plugin.
java { toolchain { languageVersion = JavaLanguageVersion.of(25) } }
tasks.withType<JavaCompile>().configureEach {
    options.release = 17
    options.encoding = "UTF-8"
}
```

## Source and Daemon Encoding

Two layers, two fixes, and a JDK 18 or later floor repairs neither. The gate is
`grep -rn --include='*.gradle' --include='*.gradle.kts' -e 'options.encoding' .`
for the first and `grep -n 'file.encoding' gradle.properties` for the second.
These two rows keep the IDs they were assigned before the family split.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-PLAT-12 | Set `options.encoding = "UTF-8"` on every `JavaCompile` task, from a `tasks.withType<JavaCompile>().configureEach` block or a convention plugin that reaches every module, regardless of the JDK floor. | `javac`'s own source-reading default is a separate fallback point from the runtime default that [JEP 400](https://openjdk.org/jeps/400) changed, so a JDK 25 toolchain still reads sources in the host's charset. A non-ASCII string literal or comment then compiles differently on a Windows runner than on Linux, which surfaces as a test-only diff much later. Measured at 15 of 32 exemplars, 2026-09-12. | The gate grep above. Empty output is the finding. One hit inside a `configureEach` block or a convention plugin is the pass, and a handful of per-module hits is a partial pass to be read: every module the build compiles must be covered, and the modules added since the last audit are the ones that will not be. | MUST |
| JAVA-PLAT-13 | Set `org.gradle.jvmargs=-Dfile.encoding=UTF-8` in the root `gradle.properties` whenever any supported development platform or CI runner is not UTF-8 by default, which means any Windows runner. A task-level `-Dfile.encoding` does not satisfy this. | The daemon's JVM is launched before toolchain selection applies, and Gradle never sets `file.encoding` for it ([gradle/gradle#2270](https://github.com/gradle/gradle/issues/2270), open at milestone 10.0.0-RC1 as of 2026-09-12). The project's JDK floor is irrelevant to the daemon's own launch. The daemon is also what reads version catalogs and properties files at configuration time, before any task JVM exists, and an untagged encoding lets cached task outputs cross OS boundaries incorrectly. Two exemplars set `org.gradle.jvmargs` for heap sizing without the flag, which is the shape of the gap. | `grep -n 'file.encoding' gradle.properties`, and confirm the hit sits inside the `org.gradle.jvmargs` value. Empty output is the finding wherever the CI matrix names a `windows` runner, and is a warning elsewhere. Then `grep -rn --include='*.gradle' --include='*.gradle.kts' -e '-Dfile.encoding' .`: hits only inside a `test` or `JavaExec` block mean the task JVMs were fixed and the daemon was not, which is the common half-fix rather than a pass. The permitted values are fixed at two, and `JAVA-PLAT` owns that row. | MUST when a non-UTF-8 host is in scope, SHOULD otherwise |

## The Wrapper

Read `gradle/wrapper/gradle-wrapper.properties` in full before editing any line
of it, and change nothing in it by hand. Both rows below are one file read.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-TOOL-03 | Commit a `distributionSha256Sum` in every `gradle/wrapper/gradle-wrapper.properties`, and regenerate it with the wrapper task rather than editing the line. | The wrapper downloads and executes a Gradle distribution before any of Gradle's own dependency resolution, verification or configuration-cache machinery exists, so no later control in the build can check it. This is the one artifact in a JVM repository whose integrity has no other lever. Present in 12 of 21 committed wrappers as of 2026-09-12, so the absent case is the majority. `GRADLE-DEP-17`, owned by this rule set's `GRADLE-DEP` family in `gradle-build/dependencies.md`, is the separate CI check on the committed wrapper *jar*. Neither substitutes for the other: one pins what gets downloaded, the other pins what is already in the tree. | `find . -name gradle-wrapper.properties` to list them, then `grep -rn --include='gradle-wrapper.properties' -e 'distributionSha256Sum' .`. One hit per listed file is the pass, and any file without one is the finding. To write both lines together: `./gradlew wrapper --gradle-version 9.7.1 --gradle-distribution-sha256-sum "$SUM"`. | MUST |
| GRADLE-TOOL-04 | Pin the `-bin` distribution, and treat `distributionUrl` and `distributionSha256Sum` as a single edit that moves together. | `-all` bundles sources and documentation for IDE attach, and every contributor and CI runner pays that download and cache footprint for a convenience one developer wanted. 20 of 21 corpus wrappers pin `-bin`, 2026-09-12. The load-bearing half is the pairing: the checksum belongs to one specific distribution zip, so a `-bin` sum left beside a changed URL fails every wrapper invocation with a verification error that reads like a corrupted download, and the reflexive next edit is to delete the checksum line, which is GRADLE-TOOL-03's violation arrived at sideways. | `grep -rn --include='gradle-wrapper.properties' -e 'distributionUrl' .` and read each URL. Empty output means no wrapper is committed at all, which is a worse finding than either row here, because CI then runs whatever `gradle` the runner image ships. An `-all` URL with no adjacent comment stating the reason is the finding, and so is any diff that changes the URL without changing the checksum in the same hunk. | SHOULD |

## gradle.properties

One read of the file: `grep -vE '^\s*#|^\s*$' gradle.properties`. Values for the
configuration-cache and isolated-projects keys are `GRADLE-CACHE`'s decision and
are not re-taken here.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-TOOL-05 | Add a performance key to `gradle.properties` only where a measurement on this repository justifies it, and put that measurement in a comment on the line. The measured-adopted set across the corpus is `org.gradle.jvmargs` (20 of 20 files), `org.gradle.caching` (19 of 20), `org.gradle.parallel` (17 of 20) and `org.gradle.configuration-cache` (11 of 20), all verified 2026-09-12. | `org.gradle.workers.max` and every `org.gradle.vfs.*` key are 0 of 20 in a corpus that includes the Gradle build itself, and `org.gradle.daemon=true` restates a default. These keys are the reflexive answer to "make the build faster", they never fail and never warn, and a `workers.max` or a heap size chosen for the author's laptop silently degrades every other machine, including the CI runner with half the cores. Naming the adopted set is what makes an unmeasured addition visible in review. | The read above, then judge each key against the named set. A key outside it with no comment naming the measurement is the finding. Empty output is itself the finding on a multi-module build, because `org.gradle.jvmargs` is then unset and both the daemon heap and JAVA-PLAT-13's encoding flag are absent. | SHOULD |

## Dead Build-Script Syntax

Both rows are grep-then-read. Neither count is a finding on its own, because both
patterns have a legitimate occurrence that a count cannot distinguish.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-TOOL-06 | Never declare a dependency on the `compile`, `runtime`, `testCompile` or `testRuntime` configuration. Use `implementation`, `api`, `runtimeOnly`, `testImplementation` and `testRuntimeOnly`. | Those configurations were removed with Gradle 7.0, so on any supported Gradle the line is a configuration-time failure rather than a deprecation warning. It remains the dominant spelling in pre-2021 material, which is where a generated build file comes from. The corpus's true count is 0 of 32, and the only apparent hits are one build's own custom configuration that happens to be named `runtime`, which is exactly why this is a read and not a count. | `grep -rn --include='*.gradle' --include='*.gradle.kts' -e 'compile(' -e 'runtime(' -e 'testCompile(' -e 'testRuntime(' .`, one `-e` per spelling, then open each hit. A hit inside a `dependencies {}` block whose build declares no configuration of that name is the finding. A hit that resolves to a locally declared configuration is correct, and so is `compileOnly` or a task name, which these patterns do not match. Empty output is the pass. | MUST |
| GRADLE-TOOL-07 | Declare plugins in a `plugins {}` block in new and edited build logic. Do not convert an existing `apply plugin:` line in a sample, example or integration-fixture module as part of an unrelated change. | The `plugins {}` block is what routes through plugin resolution, which is what makes a version catalog alias and a precompiled convention plugin reachable at all, so `apply plugin:` in real build logic quietly opts out of both. But corpus-wide the surviving hits sit almost entirely in example and fixture trees (35, 25 and 15 hits in three repositories), where the module is often built standalone and the legacy form is deliberate. Converting those is churn a reviewer has to read and that changes no behaviour. | `grep -rn --include='*.gradle' --include='*.gradle.kts' -e 'apply plugin:' .`, then read the path of each hit. A hit in a module the root settings file includes is the finding. A hit under an examples, samples or test-fixture directory is not, and neither is a plain Groovy build file: a Groovy DSL build is not itself a defect. Empty output is the pass. | SHOULD |

## What Agents Get Wrong Here

1. **Declares a toolchain and assumes Gradle will download the JDK.** With no
   resolver applied Gradle detects but never downloads, so the build is green on
   the machine that already had that JDK and fails on a clean runner with a
   message about no matching toolchain. (GRADLE-TOOL-02)
2. **Writes `sourceCompatibility` and calls the JDK pinned.** It is neither a
   toolchain nor an API check, and the value usually looks modern, which defeats
   an eyeball check on the number. (GRADLE-TOOL-01)
3. **Confuses the JVM that runs Gradle with the JDK that compiles the code**, and
   answers a daemon-version error by lowering the toolchain. Gradle 9.x needs a
   JVM between 17 and 26 to start, independent of what the project targets.
   (GRADLE-TOOL-01)
4. **Sets `jvmToolchain(21)` in a Kotlin build and believes the bytecode target
   moved.** It did not, because `jvmTarget` still defaults to `"1.8"` and the
   toolchain only back-fills an unset value. `KT-COMP-04` owns that row.
5. **Adds `-Dfile.encoding` to the `test` or `JavaExec` task and stops there.**
   That fixes task JVMs and leaves the daemon, which read the version catalog and
   the properties files long before any task started. (JAVA-PLAT-13)
6. **Treats JEP 400 as "encoding is solved since JDK 18" and sets nothing at
   either layer.** The default value changed. The compiler's source-reading
   fallback and Gradle's daemon launch did not. (JAVA-PLAT-12, JAVA-PLAT-13)
7. **Bumps `distributionUrl` by hand and leaves the checksum.** Every later
   wrapper run fails a verification that reads like a corrupted download, and the
   next edit deletes the checksum rather than regenerating it.
   (GRADLE-TOOL-03, GRADLE-TOOL-04)
8. **Volunteers a `gradle.properties` performance block** with `workers.max`,
   `vfs.watch`, `daemon=true` or `configureondemand` when asked to speed a build
   up. The first two have zero adoption in a 32-repository corpus and none of the
   four can fail loudly enough to be noticed. (GRADLE-TOOL-05)
9. **Writes `compile 'group:artifact:version'`** from pre-2021 material. On any
   supported Gradle that is a build failure, not a warning, so the cost is a
   failed run rather than a silent defect. (GRADLE-TOOL-06)
10. **Counts `apply plugin:` hits and opens a migration change across the example
    modules.** The count is real and the finding is not. (GRADLE-TOOL-07)
11. **Puts the foojay resolver in a `build.gradle.kts`.** It is a settings plugin
    and belongs in `settings.gradle.kts`, and applied to a project it fails as a
    missing plugin rather than pointing at the mistake. (GRADLE-TOOL-02)
12. **Reports the toolchain as pinned because `./gradlew build` passed.** That
    result is a statement about one machine's installed JDKs, which is what
    `./gradlew -q javaToolchains` exists to show. (GRADLE-TOOL-01)

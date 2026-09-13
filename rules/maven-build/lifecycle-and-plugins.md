---
title: Maven Lifecycle, Plugins and the Wrapper
summary: The MVN-BUILD family: the compiler plugin's release and annotation-processing configuration, toolchain wiring, the `mvn verify` gate, Surefire pinning, reproducible archives, the `.mvn` directory and the wrapper, and Maven 4 readiness
---

# Maven Lifecycle, Plugins and the Wrapper

Owns how a POM configures the build: the bytecode and API floor, whether
annotation processors run at all, which JDK compiles and which JDK tests, what a
CI pipeline's last Maven goal is, and what the `.mvn` directory and the wrapper
pin. It does not own which coordinates a POM depends on or how they are
constrained, which is `MVN-DEP`, nor staging and releasing to Central, which is
`MVN-PUB`, nor anything inside a `build.xml`, which is `MVN-ANT`. Java source
rules live in the `JAVA-*` families and never load on a POM. `JAVA-PLAT`,
`GRADLE-TOOL` and `GRADLE-DEP` state the Gradle and Java half of several
decisions below, and a Maven-only adopter never loads any of them, so every row
here is complete on its own and restates nothing.

Contents: [Measurement and Floors](#measurement-and-floors) ·
[The Compiler Plugin's Configuration](#the-compiler-plugins-configuration) ·
[Toolchain Wiring](#toolchain-wiring) · [The CI Gate](#the-ci-gate) ·
[Maven 4 Readiness](#maven-4-readiness) ·
[Reproducible Archives](#reproducible-archives) ·
[The .mvn Directory and the Wrapper](#the-mvn-directory-and-the-wrapper) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Measurement and Floors

Every number here was queried from Central and verified **2026-09-12**. Re-query
before copying one into a POM, because the plugin documentation sites publish a
banner that does not distinguish a milestone from a GA release.

| Artifact | State on 2026-09-12 |
|---|---|
| `org.apache.maven:maven-core` | `3.9.16` GA, `4.0.0-rc-6` latest. No plain `4.0.0` exists, so every Maven-4 row below is migration readiness, never mechanism |
| `maven-surefire-plugin` | `3.6.0` GA (`lastUpdated 20260903221843`), one release past the `3.5.6`-GA / `3.6.0-M1` snapshot. On the 3.6.0 line one `surefire-junit-platform` provider replaces the four old providers and JUnit 4 below 4.12 is unsupported |
| `maven-compiler-plugin` | `3.13.0` is the floor for the `<proc>full</proc>` **value**. The `proc` parameter is `since 2.2`, which is the trap |
| `maven-toolchains-plugin` | `3.3.0`, `org.apache.maven.plugins`. Selects only. No download path, no `skip` parameter of any name |
| `org.mvnsearch:toolchains-maven-plugin` | `4.5.0`, single maintainer, Central metadata last touched 2023-04. The only Foojay-backed downloader. No rule here recommends it |
| `maven-wrapper-plugin` | `3.3.4` |
| Maven Resolver | `1.9.27` bundled by Maven 3.9.16, `2.0.x` bundled by Maven 4. The property names differ and the old ones are ignored without error |
| The annotation-processing policy | JDK 21 and 22 warn, **JDK 23** enforces. Never write "JDK 21" and never write "modern JDKs" |

## The Compiler Plugin's Configuration

One read of every `maven-compiler-plugin` block, plus one artifact check that no
POM read can replace. Run `mvn compile` first, then:
`grep -rn --include='pom.xml' -e '</source>' -e '</target>' .` and
`find . -path '*/target/generated-sources/annotations/*' -name '*.java'`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-BUILD-01 | Set the bytecode and API floor with `maven.compiler.release` (or `<release>` on the plugin) in exactly one place per module. Never leave it unset, and never express it as `<source>` and `<target>`. | The compiler plugin's own documentation: the default `source` and the default `target` are both `8`, independently of the JDK you run Maven with. A fixed constant, so an unset POM silently downlevel-compiles on a JDK 25 runner. `release` also pins the API baseline, which the old pair cannot, so a Java-9+ API called from a Java-8-targeted build compiles and fails at runtime with `NoSuchMethodError`. | `grep -rn --include='pom.xml' -e '</source>' -e '</target>' .`, then **open the owning compile execution** and confirm a `release` value governs the same compilation. A hit paired with a `release` in the same execution (a multi-release jar's base layer) is correct, not a finding. Empty grep output with a `release` present is also a pass. guava is the counter-example, not the example: it hard-codes `1.8` in three places with no `maven.compiler.release` anywhere, which is the finding. Empty output with no `maven.compiler.release` anywhere is the finding: run `mvn -q help:effective-pom -Doutput=effective-pom.xml` and `grep -c 'maven.compiler.release' effective-pom.xml`, which must be at least 1 per module. | MUST |
| MVN-BUILD-02 | Declare every annotation processor in `annotationProcessorPaths` with an explicit version, and never let one ride the compile classpath. Pair it with MVN-BUILD-16, because this rule alone does not make processors run. | On JDK 22 and below javac scans the whole compile classpath for `META-INF/services/javax.annotation.processing.Processor`, so adding any dependency that happens to carry a processor changes what runs at compile time, unannounced and order-dependent. On JDK 23+ that implicit scan is gone, which removes the nondeterminism and replaces it with silence. Naming paths here controls **which** processors run. MVN-BUILD-16 controls **whether any** run. | Bind the jar first, then read its entries: `JAR=lib/example.jar` and `unzip -l "$JAR" > jar-entries.txt`, then `grep -n 'javax.annotation.processing.Processor' jar-entries.txt` for each `provided`- or `compile`-scope dependency. A hit with no matching `<path>` entry under `annotationProcessorPaths` is the finding, and empty output for that jar is the pass. Then run MVN-BUILD-16's artifact check, because a populated `annotationProcessorPaths` beside an empty generated-sources directory means this rule passed and nothing ran. | MUST (any module with a processor on the compile classpath) |
| MVN-BUILD-16 | In every module that declares an annotation processor, set `maven.compiler.proc` to `full` (or `<proc>full</proc>` on the plugin) and pin `maven-compiler-plugin` at 3.13.0 or later. Below that floor the only working spelling is a raw `-proc:full` in `compilerArgs`. Verify by the generated artifact, never by the POM alone. | From JDK 23 javac runs annotation processing only when something configures it explicitly, and otherwise behaves as `-proc:none`. `annotationProcessorPaths` does not count, so an otherwise-correct POM processes nothing, prints no warning, and `mvn verify` exits 0. The `proc` parameter is `since 2.2` but the `full` value only became legal in maven-compiler-plugin 3.13.0 (MCOMPILER-548, verified 2026-09-12), so `full` on an older pin is not a fix. | `grep -rl --include='pom.xml' 'annotationProcessorPaths' . > proc-poms.txt`, then `xargs -r grep -L 'maven.compiler.proc' < proc-poms.txt`. Any path printed is the finding and empty output is the pass. A printed path whose parent POM sets the property is a false positive: confirm with `mvn -q help:effective-pom -Doutput=effective-pom.xml` and `grep -c 'maven.compiler.proc' effective-pom.xml` before recording it. Setting it once at the parent, with a `<proc>none</proc>` override on every module that defines annotations but consumes no processor, is the endorsed shape. Check the pinned plugin version against 3.13.0 in the same pass. **Then the load-bearing half:** after `mvn compile`, `find . -path '*/target/generated-sources/annotations/*' -name '*.java'` must print at least one file per module with a populated `annotationProcessorPaths`. Empty output there is the finding. A config-only review cannot tell "processors ran" from "processors were skipped". | MUST (any module declaring a processor) |
| MVN-BUILD-17 | Name **JDK 23** as the release where implicit annotation processing stops. Never write "JDK 21" and never write "modern JDKs". Declaring `<proc>none</proc>` on a module that defines annotations but consumes no processor is the explicit, correct opt-out. | The rollout took three tickets and reads as one line. JDK-8306819 proposed disablement for 22 on supply-chain grounds (a transitively pulled processor executes at compile time with no opt-in), JDK-8321321 deferred it leaving 21 and 22 warning-only, JDK-8321319 made it live in 23. Training data over-weights the loud 2023 warning over the quiet reinstatement, so "JDK 21 disabled it" is the default wrong answer, and the javac specification text itself differs between the 21 and 25 pages. | Reading check over every rule, comment and document this build emits: `grep -rn 'annotation processing' .`, then read each hit for a JDK number. "JDK 21" or "modern JDKs" next to "disabled", "stops" or "no longer runs" is the finding. Empty output is the pass, because nothing claims a release at all. | MUST |

```xml
<!-- wrong: pins the class-file version with no API baseline, and on JDK 23+ the declared processor never runs -->
<configuration>
  <source>21</source>
  <target>21</target>
  <annotationProcessorPaths><path>...</path></annotationProcessorPaths>
</configuration>
```

```xml
<!-- right: one release value, plus the conjunct that makes processing happen at all -->
<properties>
  <maven.compiler.release>17</maven.compiler.release>
  <maven.compiler.proc>full</maven.compiler.proc>
</properties>
```

## Toolchain Wiring

Maven has no `java { toolchain {} }`. The mechanism is three cooperating parts
and it falls back to the launching JVM if any one is missing, with no error and
no warning. One read settles all three rows:
`grep -rn --include='pom.xml' -B2 -A5 'toolchains' .`

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-BUILD-18 | A build that must compile or test on a JDK other than the one running Maven needs all three parts present: a matching `~/.m2/toolchains.xml` entry, `maven-toolchains-plugin`'s `toolchain` goal bound (default phase `validate`), and a toolchain-aware consuming plugin. Never infer a toolchain from a `maven.compiler.release` pin, and never trust an ambient `JAVA_HOME`. | The mechanism is opt-in at each of three layers and silently falls back. `release` pins the API baseline (MVN-BUILD-01), not the JDK that runs javac, so the two rules do not substitute for each other. Toolchain-aware since compiler 2.1, surefire 2.5, javadoc 2.5 and jarsigner 1.3, verified 2026-09-12 against the toolchains guide. | `grep -rn --include='pom.xml' -A5 'maven-toolchains-plugin' .` for a bound `toolchain` goal, cross-checked against a `toolchains.xml` that exists (committed, CI-generated, or plugin-generated). Empty output on a single-JDK build is a pass. Empty output where the compile JDK differs from the test JDK or from the CI runner JDK is the finding: the build compiles on whatever JDK `mvn` started under, so state that rather than calling it toolchained. | SHOULD (MUST once the compile JDK differs from the test or CI-runner JDK) |
| MVN-BUILD-19 | Keep the two toolchain plugins apart. `org.apache.maven.plugins:maven-toolchains-plugin` **selects only**, and `org.mvnsearch:toolchains-maven-plugin` (Foojay-backed) is the one that **downloads**. Never claim Apache's plugin provisions a JDK, and never write `-Dtoolchain.skip` unless the `org.mvnsearch` plugin is actually bound. | Apache's `ToolchainMojo` has three parameters and none of them is a download path or a `skip` of any name, so an unmatched requirement fails the build rather than fetching one. The two artifact names are transpositions of each other, and a model defaulting to Maven's usual `<function>-maven-plugin` convention picks the wrong one. `-Dtoolchain.skip` against Apache's plugin is a silent no-op, not a skip. Acquisition is CI's job (`actions/setup-java` or its equivalent) unless an adopter deliberately opts into the third-party plugin. | `grep -rn --include='pom.xml' -B2 -A1 'toolchains' .` and confirm each artifactId pairs with its own groupId. Any other pairing fails resolution. Before writing `-Dtoolchain.skip` into CI or into a document, `grep -rn --include='pom.xml' 'org.mvnsearch' .`: empty output means the flag does nothing and using it is the finding. Reading check: any sentence saying `maven-toolchains-plugin` downloads or installs a JDK is the finding. | MUST |
| MVN-BUILD-20 | To run tests on a JDK other than the compile JDK, set `jdkToolchain` inside `maven-surefire-plugin`'s own configuration. Never widen the shared reactor toolchain to reach it, and never hardcode `<jvm>` as an absolute path. | `jdkToolchain` is Surefire's documented per-execution override against the same `toolchains.xml` entries. Changing the shared toolchain instead moves the **compile** JDK too, which is almost never the intent, and `<jvm>` is an absolute path that breaks on the next machine. Live in the corpus: guava compiles on one JDK and tests across four. | `grep -rn --include='pom.xml' -A3 'jdkToolchain' .` scoped inside the surefire block, and confirm it differs from the version on the shared `maven-toolchains-plugin` execution wherever divergence is intended. Then `grep -rn --include='pom.xml' -e '</jvm>' .`: a hit in a repo that has any toolchain wiring is the finding, and empty output is the pass. | SHOULD |

## The CI Gate

One read of every Maven invocation in CI, plus one local run. The locator is
`grep -rn --include='*.yml' --include='*.yaml' --include='Jenkinsfile' -e 'mvn ' -e 'mvnw ' .`
and empty output in a Maven repository is itself the finding, because no job
runs Maven at all.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-BUILD-03 | **pinned.** Make `verify` the last Maven goal of every CI gate, with `maven-enforcer-plugin` bound to an execution rather than invoked ad hoc (`MVN-DEP-03` owns the enforcer half). Never end a pipeline on `install`, `test`, `package`, or any hyphenated intermediate phase. A `-DskipTests install` reactor bootstrap **before** a `verify` gate is permitted. | Hyphenated phases sequence the build and produce intermediate results that are not useful outside it, so stopping at `integration-test` runs the `pre-integration-test` setup and never the teardown, leaving a container running and possibly hanging Maven itself. Maven's own guidance is explicit: do not use `mvn clean install` for regular builds, use `mvn verify`. `install` additionally mutates the shared local repository. | Read each job from the locator above. The pass is that the last Maven goal in the job is `verify`. A job whose last goal is `install`, `test`, `package` or a hyphenated phase, with no later `verify` on the same line or in a later step of the same job, is the finding. Read the job, do not count the grep: a bootstrap `install` followed by a `verify` gate is correct. | MUST |
| MVN-BUILD-04 | In any module that binds `jacoco-maven-plugin`'s `prepare-agent`, compose `argLine` additively as `@{argLine}` followed by your own flags. Never write a bare flag list. | The two sources clobber rather than concatenate. A hand-written `argLine` property overrides JaCoCo's injected agent flag, no `jacoco.exec` is produced, and any coverage gate downstream either fails for an unrelated-looking reason or gets switched off. The upstream fix (apache/maven#11605) is open and unmerged as of 2026-09-12, so the additive form is the fix, not an upgrade. jackson-databind carries the whole failure in one file: the clobber, a comment disabling the strict coverage check because "release fails due to missing jacoco", and an enforcer `requireFilesExist` on `target/jacoco.exec` that is therefore silently non-failing. | `grep -rn --include='pom.xml' -A3 'argLine' .`. For each module that also declares `jacoco-maven-plugin`, an `argLine` body with no `@{argLine}` or `@{jacocoArgLine}` reference is the finding. Empty output is a pass only where no module binds `prepare-agent`. Confirm by running `mvn verify` and asserting `target/jacoco.exec` exists. | MUST |
| MVN-BUILD-05 | Pin `maven-surefire-plugin` to a version queried from Central, never from the plugin's documentation-site banner, and confirm the tests actually ran. | The banner read `3.6.0` while 3.6.0 was a milestone and reads `3.6.0` now that it is GA (verified 2026-09-12), and nothing on the page distinguishes the two states. Copying it was wrong for months and right this week with no way to tell which. The durable finding is the method, not the number. On the 3.6.0 line a wrong provider silently runs zero Jupiter tests rather than failing. | `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-plugin/maven-metadata.xml` before writing the version. After the run, `mvn -X test > mvn-x.log` and `grep -n 'Using configured provider' mvn-x.log`: the named provider must be `JUnitPlatformProvider` and the Surefire report's test count must be non-zero. Empty output means no provider line was printed, which is the finding. | MUST |

```xml
<!-- wrong: overrides JaCoCo's injected agent flag, no jacoco.exec is written, the coverage gate passes vacuously -->
<argLine>--add-opens java.base/java.lang=ALL-UNNAMED</argLine>
<!-- right -->
<argLine>@{argLine} --add-opens java.base/java.lang=ALL-UNNAMED</argLine>
```

## Maven 4 Readiness

Every row here is Maven 3 to Maven 4 migration only. The gate is one run of the
reactor under a pinned RC in a non-blocking job, because that is what names the
breakage. The static proxies below are locators, not substitutes.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-BUILD-06 | Before any Maven-4 move, find every plugin declared in both the top-level build block and a profile's build block, and de-duplicate. | Maven 3.9 emits a warning and Maven 4 **fails the build**. It is the single highest-yield silent-until-upgrade breakage in the migration guide. | Run the reactor once under a `4.0.0-rc-*` toolchain (MVN-BUILD-07) and the failure names the plugin. Static proxy: `grep -rln --include='pom.xml' '</profile>' .` lists every POM that can carry the defect, and empty output is the pass because a POM with no profile cannot duplicate. For each POM listed, extract the `groupId:artifactId` set under the top-level plugins block and under each profile's plugins block and diff the two. A coordinate in both is the finding. | MUST (migration only) |
| MVN-BUILD-07 | Exercise Maven 4 as a separate, non-blocking CI job that re-generates the wrapper at a pinned RC. Never bump the committed `distributionUrl` to an RC. | Keeps the shipping build on the 3.9.x GA line while surfacing every MVN-BUILD-06 and MVN-BUILD-09 breakage against the real reactor. apache/maven itself does exactly this, running `maven-wrapper-plugin:3.3.4:wrapper` with `-Dmaven=4.0.0-rc-6` for that job only and leaving the committed wrapper untouched. | `grep -rn --include='*.yml' --include='*.yaml' 'maven-wrapper-plugin' .`. The pass shape is a `maven-wrapper-plugin:3.3.4:wrapper` invocation carrying `-Dmaven=4.0.0-rc-N` inside a job whose failure does not block merge, with the committed `.mvn/wrapper/maven-wrapper.properties` still naming a 3.9.x distribution. Empty output means no Maven-4 leg exists, which is the finding for a build that intends to migrate and a pass for one that does not. | SHOULD |
| MVN-BUILD-08 | State "(Maven 3)", "(Maven 4)" or "(both)" on every Maven mechanic you write down, and re-verify GA before publishing any unconditional Maven-4 claim. | Maven 3 and 4 differ on plugin-declaration strictness, phase scope, the default `deployAtEnd`, and reproducibility defaults, so an unqualified sentence reads as universally true when it is version-specific. And `4.0.0` has never shipped, so "Maven 4 does X" is a claim about a release candidate. | `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml` and read the `latest` and `release` elements, which were `4.0.0-rc-6` and `3.9.16` on 2026-09-12. Anything other than a plain `4.0.0` in `release` means Maven 4 is still RC and every Maven-4 row stays migration-scoped. Reading check: an unqualified "Maven 4" sentence in anything this build publishes is the finding. | MUST |
| MVN-BUILD-09 | Treat these four as the Maven-4 readiness checklist, each with its own check. (a) Maven itself now requires **Java 17 to run**, independent of the project's release target. (b) Plexus container DI is removed, so a plugin still using it does not load. (c) `executionRootDirectory` and `multiModuleProjectDirectory` are gone, replaced by `project.rootDirectory`, `session.topDirectory` and `session.rootDirectory`. (d) `pre-*` and `post-*` are aliases for `before:` and `after:`, so an execution bound to `post-clean` now fires on a plain `mvn clean`. | Each is a hard break with a different symptom, and (d) is the sneakiest: a plugin execution silently **starts** running on a build it previously skipped, changing behaviour with no error anywhere. | (a) the CI image's `java -version` must report 17 or later. (b) `mvn -N versions:display-plugin-updates`, then read each plugin's Maven-4 compatibility note. (c) `grep -rn --include='pom.xml' -e 'executionRootDirectory' -e 'multiModuleProjectDirectory' .`, where empty output is the pass. (d) `grep -rn --include='pom.xml' -e 'phase>pre-' -e 'phase>post-' .` and read each enclosing execution, where empty output is the pass. | MUST (migration only) |

## Reproducible Archives

Gated by `mvn artifact:check-buildplan` and `mvn clean verify artifact:compare`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-BUILD-10 | Set `project.build.outputTimestamp` to an explicit ISO-8601 UTC instant in every POM that publishes. | Reproducible-builds mode is on by default only from `4.0.0-beta-5` (MNG-8258), so on the shipping 3.9.x line an unset timestamp bakes the wall clock into every archive entry. Measured 3 of 32 repositories corpus-wide. Do not copy the ASF parent POM's own snippet, which shows a Unix-epoch integer: the reproducible-builds guide's ISO-8601 form is the normative one. | `grep -rn --include='pom.xml' 'project.build.outputTimestamp' .`, where empty output in a module that publishes is the finding. Then `mvn artifact:check-buildplan`, which names any plugin version that is not reproducible-compliant, and `mvn clean verify artifact:compare`, which rebuilds and diffs byte for byte. An empty diff is the pass. | MUST (any published POM) |

## The .mvn Directory and the Wrapper

Read every `.mvn` file against the Maven version the wrapper pins, because the
same property name means different things on either side of the resolver 1.x to
2.0 rename. One caveat applies to this whole section: the CI-injected case of
MVN-BUILD-15 lives in a workflow file, which no glob in this rule set reaches,
so that check runs from the index's routing line rather than from a POM edit.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-BUILD-21 | Set `<project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>` in every published POM or its parent, regardless of the JDK floor. | `javac`'s source-reading default is a separate fallback point from the runtime default [JEP 400](https://openjdk.org/jeps/400) changed, so a JDK 25 toolchain still reads sources in the host's charset and a non-ASCII literal compiles differently on Windows than on Linux. Maven warns "platform encoding ... is platform dependent" and builds anyway. | `grep -rn --include='pom.xml' -e 'project.build.sourceEncoding' .` **Empty output is the finding, not the pass.** A value other than `UTF-8` is a second finding. `JAVA-PLAT-12` is the Gradle statement of the same decision, on a glob a Maven-only adopter never loads. | MUST |
| MVN-BUILD-11 | Read every `aether.` property in `.mvn/maven.config` against the Maven version the wrapper pins, and treat a resolver-1.x name under a Maven-4 distribution as a migration breakage. | Resolver 1.x names `aether.checksums.algorithms` and `aether.connector.smartChecksums`. Resolver 2.0.x, which Maven 4 bundles, renamed them to `aether.checksums.checksumAlgorithms` and `aether.connector.basic.smartChecksums`, and the current reference contains no entry for the old names at all. Unrecognised system properties are **ignored, not rejected**, so the config becomes a silent no-op the day the wrapper is bumped and the hardening disappears with it. assertj is the live example: correct today against a pinned 3.9.16 distribution, a landmine on the first Maven-4 bump. | `grep -rn --include='maven.config' 'aether' .` next to `grep -rn --include='maven-wrapper.properties' 'distributionUrl' .`. Pre-2.0 names beside an `apache-maven-4.` distribution is the finding. Empty output from the first grep is the pass, because there is no resolver configuration to break. Maven 3.9.16 bundles resolver 1.9.27, verified 2026-09-12. | MUST |
| MVN-BUILD-12 | Never describe Maven checksum configuration as a supply-chain or security control. When the subject is trust, name `maven-gpg-plugin` and Central's mandatory signing instead. | Maven Resolver's own design note: checksums only provide integrity verification, they do not provide security or trust, and they do not protect against man-in-the-middle or supply-chain attacks. The note rejects the "MD5 and SHA-1 are unsafe" framing on the same grounds. **Contrast with `GRADLE-DEP-16`**, owned by the `gradle-build` rule's `GRADLE-DEP` family, where checksums plus signatures genuinely are layered security controls: Gradle's dependency-verification framing does not transfer to Maven, and the two must never read as one ecosystem claim. | Reading check over generated documents and rules: `grep -rn 'checksum' .`, then read each hit. Any sentence pairing a Maven checksum algorithm with "secure", "supply chain" or "tamper" is the finding. Empty output is the pass. | MUST |
| MVN-BUILD-13 | Do not remove `smartChecksums=false` when tidying build flags. | `smartChecksums` extracts the reference digest from an HTTP response header and only ever validates SHA-1, so leaving it on beside a SHA-512-first or SHA-256-first algorithm list configures digests that are then never exercised. Disabling it is what forces the full checksum-file fetch. | Before removing the flag, `grep -rn --include='maven.config' 'checksums' .` and confirm the sibling algorithm list contains an algorithm beyond SHA-1 and MD5. If it does, the flag is load-bearing and removing it is the finding. Empty output means there is no such configuration and nothing to preserve. | CONSIDER |
| MVN-BUILD-14 | Set both `wrapperSha256Sum` and `distributionSha256Sum` in every committed `.mvn/wrapper/maven-wrapper.properties`. | Both are optional and off by default, so the first `mvnw` on a fresh clone or CI runner downloads and executes a Maven distribution with nothing pinning its hash and no signature checked anywhere. This is the one place MVN-BUILD-12's caveat does not apply: no trust chain exists yet, so integrity is the only available control. `GRADLE-DEP-17` is the Gradle statement of the same decision, on a glob a Maven-only adopter never loads. | `grep -rL --include='maven-wrapper.properties' 'distributionSha256Sum' .` and the same for `wrapperSha256Sum`. Any path printed is the finding and empty output is the pass. A repository with no wrapper at all is a separate and worse finding: `find . -name 'maven-wrapper.properties'` printing nothing means CI runs whatever `mvn` the runner image happens to ship. | MUST (any repo committing a wrapper) |
| MVN-BUILD-15 | Check for build extensions in CI as well as in the tree. A `.mvn/extensions.xml` written by a workflow step changes dependency resolution for that build and is invisible to a census of committed files. | An extension can replace the local repository wholesale, so "no extensions" read off the committed tree is not a finding about the build that actually runs. Committed extensions measured 0 of 32 corpus-wide, yet apache/maven's own CI copies one in before the build and swaps it before the Maven-4 leg. | `grep -rn --include='*.yml' --include='*.yaml' --include='Jenkinsfile' 'extensions.xml' .` alongside `find . -name 'extensions.xml'`. Either hit means resolution is extended, and the two must be reconciled before asserting anything about it. Empty output from both is the pass. | SHOULD |

## What Agents Get Wrong Here

1. **Writes `<source>` and `<target>` instead of `release`.** Pre-2020 tutorials
   dominate the training data and use the deprecated pair universally, and the
   values often look modern (`<source>21</source>`), which defeats a value-based
   eyeball check. (MVN-BUILD-01)
2. **Emits `mvn clean install` as the CI command.** The single most common Maven
   idiom in training data, contradicted by Maven's own current guidance. Grep the
   last Maven goal per job, and read the job rather than the line. (MVN-BUILD-03)
3. **Writes Maven 4 as shipped.** A literal `4.0.0`, or Maven-4-only features as
   safe defaults. Resolve every coordinate against Central before emitting it.
   (MVN-BUILD-08)
4. **Pins a plugin version read off its documentation site.** The banner is a
   doc-publish date, not a release index, and it does not change when a milestone
   becomes GA. (MVN-BUILD-05)
5. **Writes a bare `argLine` in a module that has JaCoCo.** The flags look
   correct in isolation and the build stays green. Coverage just stops being
   produced. (MVN-BUILD-04)
6. **Treats a green `mvn verify` as proof the processors ran.** Nothing in
   Maven's exit code, console output or the POM distinguishes "processed and
   generated" from "silently skipped", so the model reports success truthfully
   and is wrong about the artifact. (MVN-BUILD-16)
7. **Says "JDK 21" disabled implicit annotation processing.** The 2023 warning
   rollout was announced loudly and the reinstatement for JDK 23 was announced
   quietly eighteen months later, so the wrong release dominates. (MVN-BUILD-17)
8. **Writes `<proc>full</proc>` against a pre-3.13.0 compiler plugin.** The
   parameter is `since 2.2` and appears in decade-old tutorials, but the value
   only became legal in 3.13.0, so the configuration looks right and does not
   apply. (MVN-BUILD-16)
9. **Assumes `maven-toolchains-plugin` downloads a JDK**, by analogy with
   Gradle's toolchain block, and transposes it with `toolchains-maven-plugin`.
   The two artifact names differ only in word order. (MVN-BUILD-19)
10. **Writes `-Dtoolchain.skip` as a general Maven flag.** It reads like
    `-DskipTests` but it is one third-party plugin's own property and a silent
    no-op everywhere else. (MVN-BUILD-19)
11. **Assumes `aether.checksums.algorithms` works on any Maven.** The flag reads
    as self-evidently correct system-property syntax, the model has no
    version-awareness of the resolver 1.x to 2.0 rename, and the wrong name fails
    silently. (MVN-BUILD-11)
12. **Frames Maven checksum configuration as supply-chain security**, importing
    the framing that is correct for Gradle's dependency verification and wrong
    for Maven Resolver. The control to name is GPG signing. (MVN-BUILD-12)
13. **Hardcodes `<jvm>` in Surefire to test on another JDK.** Older, more common
    in tutorials, and portable-looking until the next machine. (MVN-BUILD-20)

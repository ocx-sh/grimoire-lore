---
title: "Maven and Ant: the other half of the ecosystem (MVN-BUILD)"
topic: maven-and-ant
model: opus
id_family: MVN-BUILD
consolidates:
  - jvm-maven-and-ant/maven4-lifecycle-and-plugins.md
  - jvm-maven-and-ant/maven-annotation-processing-and-toolchains.md
date: 2026-09-12
revised: 2026-09-12
---

# Maven and Ant — the other half of the ecosystem

Family `MVN-BUILD` (+ the `MVN-ANT` rows), for `rules/maven-build/lifecycle-and-plugins.md`
and `rules/maven-build/ant-legacy.md`. Glob: `**/pom.xml`, `**/.mvn/**`, `**/mvnw*`,
`**/build.xml` ([topic map](jvm-topic-map.md) conflict 3).

## Verdict

1. **The rule set targets Maven 3.9.x as the shipping floor. Every Maven-4 row ships as
   migration-readiness, never as mechanism.** Central tops `org.apache.maven:maven-core`
   out at `3.9.16` GA and `4.0.0-rc-6`; no plain `4.0.0` exists as of 2026-09-12
   ([dive](jvm-maven-and-ant/maven4-lifecycle-and-plugins.md) §1.2, confirming
   [frame](jvm-frame.md) correction 29 and [MVN-DEP-11](jvm-dependencies.md)). A row that
   says "Maven 4 does X" without a re-check command rots the day RC-7 or GA lands, so
   every one of them carries the Central metadata curl inline.
2. **`mvn verify` is the CI gate — but the rule binds the gate, not every invocation.**
   The dive stated a flat prohibition on `install`; measured, `google__guava` runs a
   deliberate `-DskipTests install` reactor bootstrap *before* a `verify` gate, which is
   correct. The violation shape is a pipeline whose last Maven goal never reaches
   `verify`, so `post-integration-test` teardown and every verify-bound check silently
   never fire. That is `google__error-prone`, not guava (see Applied).
3. **The Maven supply-chain rows live in `MVN-BUILD`, not `MVN-DEP`.** The dive was
   commissioned to close [jvm-dependencies.md](jvm-dependencies.md)'s open
   "Maven-side checksum and verification policy" question, but `MVN-DEP` routes on
   *"adding a dependency"*; an agent editing `.mvn/maven.config` or
   `.mvn/wrapper/maven-wrapper.properties` is editing build configuration. Family
   membership follows the file kind, so they land here. `MVN-DEP-01…11` stand unchanged.
4. **Maven checksums are corruption detection, not a trust control — with one carve-out.**
   Maven Resolver's own docs: *"Checksums only provide integrity verification. They do not
   provide security or trust."* GPG signing is Maven's trust layer. The carve-out is the
   **wrapper**: `wrapperSha256Sum`/`distributionSha256Sum` pin a distribution downloaded
   and executed *before* any trust chain exists and where no signature is ever checked, so
   there integrity is the only available control. Both rows survive; they are not the same
   claim.
5. **Ant ships as rules, not as prose — but as conditional-entry rules.** The map folded
   Ant into a depth file on the grounds that recognise-and-migrate fails the
   "it changes a diff" test. It does for an adopter who never opens a `build.xml`; it does
   not for the one who just did. All `MVN-ANT` rows fire only on that file kind.
   `MVN-ANT-02` is the exception that earns a MUST at 0/32 adoption, because its blast
   radius lands on the *Gradle* build (whole-build configuration-cache loss), not on Ant.
6. **This binds the OCX SDK only through its published POM and a Maven consumability
   module; it binds the OCX Gradle plugin not at all.** The SDK is Gradle-built
   (map artifact-set decision), and the corpus shape for "Gradle-built library with Maven
   consumers" is a `maven-tests/`-style verification module, not a second build
   ([shape](jvm-audit/exemplar-build-shape.md) §Smells). That module's POM must itself
   satisfy MVN-BUILD-01 and -05 — otherwise it passes green having run zero tests, which
   is the exact failure it exists to catch.
7. **Surefire is pinned from Central, never from the plugin's doc-site banner — and the
   disagreement that motivated this has already resolved, which is the argument *for* the
   rule.** As of 2026-09-12 `maven-surefire-plugin` **3.6.0 is GA on Central**
   (`lastUpdated 20260903221843`), one release past [frame](jvm-frame.md) correction 38's
   `3.5.6`-GA/`3.6.0-M1` snapshot ([AP dive](jvm-maven-and-ant/maven-annotation-processing-and-toolchains.md)
   §Summary). The banner read `3.6.0` while it was a milestone and reads `3.6.0` now that it
   is GA; nothing in the banner distinguishes the two states. The durable finding is the
   method, never the number — MVN-BUILD-05 keeps its MUST and loses its example.
8. **`annotationProcessorPaths` answers *which* processors run; nothing in it answers
   *whether any* run.** **JDK 23** — not 21 — is where `javac` stops enabling annotation
   processing implicitly (JDK-8306819 proposed it for 22, JDK-8321321 deferred it to
   warning-only, JDK-8321319 reinstated it for 23). On JDK 23+ a POM that gets MVN-BUILD-02
   perfectly right still compiles with an effective `-proc:none` unless something sets
   `maven.compiler.proc`, and the build **exits 0 with no diagnostic**. MVN-BUILD-16 is the
   missing conjunct; its check is an *artifact* check (`target/generated-sources/annotations/`
   non-empty) because no config-level check can see this failure. Documented gap: **0/32
   exemplars pair the two**, and no exemplar's CI asserts the generated-sources directory —
   this rule imposes practice rather than codifying it, exactly like MVN-BUILD-02 itself.
9. **Maven has no toolchain block, and no first-party way to acquire a JDK — that gap is
   carried, not closed.** Gradle's `java { toolchain {} }` is one declarative surface;
   Maven's equivalent is three cooperating parts (`~/.m2/toolchains.xml` + Apache's
   `maven-toolchains-plugin`, which **selects only** + a toolchain-aware consuming plugin),
   and it silently no-ops if any part is missing. Apache's plugin has no download path and
   no `skip` parameter at all; the only Foojay-backed downloader is a **single-maintainer
   third-party plugin**, `org.mvnsearch:toolchains-maven-plugin` 4.5.0, whose Central
   metadata was last touched 2023-04 and which `google/guava` nonetheless depends on today.
   So: MVN-BUILD-18 requires selection to be explicit, MVN-BUILD-19 keeps the two
   transposable plugin names apart, MVN-BUILD-20 scopes a test-JDK override to Surefire —
   and *acquisition* stays CI's job (`actions/setup-java`) unless an adopter deliberately
   opts into the third-party plugin. No rule recommends it.

## The ruleset

### MVN-BUILD — editing `**/pom.xml`, `**/.mvn/**`, `**/mvnw*`

#### Caught by reading the compiler plugin's configuration

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-BUILD-01 | Set the bytecode target with `<maven.compiler.release>` (or `<release>` on the plugin) in exactly one place. Never leave it unset, and never express it as `<source>`/`<target>`. | "At present the default `source` and the default `target` setting are both `8`, independently of the JDK you run Maven with" — a fixed constant, so an unset POM silently downlevel-compiles on a JDK 25 runner. `release` also pins the *API* baseline, which `source`/`target` cannot ([maven-compiler-plugin](https://maven.apache.org/plugins/maven-compiler-plugin/)). | `grep -n '<source>\|<target>' pom.xml` inside any `maven-compiler-plugin` `<configuration>` — any hit is the finding, even when the value looks modern. Then `mvn help:effective-pom \| grep -c 'maven.compiler.release'` must be ≥ 1 per module. | MUST | maven-compiler-plugin 3.6+ |
| MVN-BUILD-02 | Declare every annotation processor in `<annotationProcessorPaths>` with an explicit version; never let one ride the compile classpath. **Pair it with MVN-BUILD-16 — this rule alone does not make processors run.** | **On JDK ≤ 22**, javac scans the whole compile classpath for `META-INF/services/javax.annotation.processing.Processor`, so adding *any* dependency that happens to carry a processor changes what runs at compile time, unannounced and order-dependent ([compile-mojo](https://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html)). **On JDK 23+ the implicit scan is gone** (JDK-8321319) — which removes the nondeterminism but replaces it with silence: naming paths here is what makes the *right* processors run, and MVN-BUILD-16 is what makes *any* run ([AP dive](jvm-maven-and-ant/maven-annotation-processing-and-toolchains.md) §D1, §D3). | For each `provided`/`compile`-scope dependency, `unzip -l <jar> \| grep 'javax.annotation.processing.Processor'`; a hit with no matching `<annotationProcessorPaths><path>` entry is the finding. Then run MVN-BUILD-16's artifact check — a populated `annotationProcessorPaths` with an empty `target/generated-sources/annotations/` means this rule passed and nothing ran. | MUST *(any module with a processor on the compile classpath)* | `annotationProcessorPaths` 3.5; `<exclusions>` 3.11.0 |
| MVN-BUILD-16 | In every module that declares an annotation processor, set `<maven.compiler.proc>full</maven.compiler.proc>` (or `<proc>full</proc>` on the plugin) and pin `maven-compiler-plugin` ≥ **3.13.0**. Below that floor the only spelling is a raw `-proc:full` in `<compilerArgs>`. Verify by the generated artifact, never by the POM alone. | From **JDK 23** javac runs annotation processing only when *something* configures it explicitly — `-processor`, `--processor-path`, `--processor-module-path`, `-proc:only` or `-proc:full`; otherwise it behaves as `-proc:none`. `<annotationProcessorPaths>` does **not** count, so an otherwise-correct POM silently processes nothing. There is no warning and `mvn verify` exits 0 ([javac 25/26 spec](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html#option-proc), [JDK-8321319](https://bugs.openjdk.org/browse/JDK-8321319)). The `proc` *parameter* is `since 2.2`, but the `full` *value* only became legal in 3.13.0 ([MCOMPILER-548](https://issues.apache.org/jira/browse/MCOMPILER-548)) — a `full` on an older pin is not a fix. | `grep -L 'maven.compiler.proc' $(grep -l 'annotationProcessorPaths' $(find . -name pom.xml))` — any output is the finding; check the pinned `maven-compiler-plugin` version against 3.13.0 in the same pass. **Then the artifact check, which is the load-bearing half:** after `mvn compile`, `target/generated-sources/annotations/` must be non-empty (better: must contain the file the processor is supposed to emit) in every module with a populated `annotationProcessorPaths`. A config-only review cannot distinguish "processors ran" from "processors were skipped". | MUST *(any module declaring a processor)* | maven-compiler-plugin 3.13.0 for `<proc>full</proc>`; JDK 23+ for the behaviour (`-proc:full` backported to 17.0.11 / 11.0.23 / 8u411) |
| MVN-BUILD-17 | Name **JDK 23** as the release where implicit annotation processing stops. Never write "JDK 21", never write "modern JDKs". Declaring `<proc>none</proc>` on a module that defines annotations but consumes no processor is the explicit, correct way to opt out. | The rollout took three tickets and reads as one line: [JDK-8306819](https://bugs.openjdk.org/browse/JDK-8306819) proposed disablement for 22 on *supply-chain* grounds (a transitively-pulled processor executes at compile time with no opt-in), [JDK-8321321](https://bugs.openjdk.org/browse/JDK-8321321) deferred it leaving 21/22 **warning-only**, [JDK-8321319](https://bugs.openjdk.org/browse/JDK-8321319) made it live in **23**. Training data over-weights the loud 2023 warning announcement over the quiet 2024 reinstatement, so "JDK 21 disabled it" is the default wrong answer. The javac *spec text itself* differs between the 21 and 25/26 pages, so "the javac docs say" is version-dependent. | Reading check on any generated rule, doc or comment: "JDK 21" co-occurring with "disable"/"stops"/"no longer runs" + "annotation processing" is the finding. The opt-out shape to copy is `apache__maven@ea4a417bd2:api/maven-api-di/pom.xml:34`. | MUST | JDK 21/22 warn · JDK 23+ enforce |

#### Caught by reading the toolchain wiring (three parts, or it silently no-ops)

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-BUILD-18 | A Maven build that must compile or test on a JDK other than the one running Maven needs all three parts present: a matching `~/.m2/toolchains.xml` entry, `maven-toolchains-plugin`'s `toolchain` goal bound (default phase `validate`), and a toolchain-aware consuming plugin. Never infer a toolchain from a `<maven.compiler.release>` pin, and never trust ambient `JAVA_HOME`. | Maven has no `java { toolchain {} }`; the mechanism is opt-in at each of three layers and **silently falls back** to the launching JVM if any is missing — no error, no warning. `release` pins the *API baseline* (MVN-BUILD-01), not the JDK that runs javac, so the two rules do not substitute for each other. Toolchain-aware since: compiler 2.1, surefire 2.5, javadoc 2.5, jarsigner 1.3 ([toolchains guide](https://maven.apache.org/guides/mini/guide-using-toolchains.html)). | `grep -A5 'maven-toolchains-plugin' pom.xml` for a bound `toolchain` goal, cross-checked against a `toolchains.xml` that exists (committed, CI-generated, or plugin-generated). A `<release>` pin with no toolchain binding anywhere means the build compiles on whatever JDK `mvn` happened to start under — state that, do not call it toolchained. | SHOULD *(MUST once compile-JDK ≠ test-JDK or ≠ CI-runner JDK)* | maven-toolchains-plugin 3.3.0; `--global-toolchains` Maven 3.3.1+ |
| MVN-BUILD-19 | Keep the two toolchain plugins apart: `org.apache.maven.plugins:maven-toolchains-plugin` **selects only**; `org.mvnsearch:toolchains-maven-plugin` (Foojay-backed) is the one that **downloads**. Never claim Apache's plugin provisions a JDK, and never write `-Dtoolchain.skip` unless the `org.mvnsearch` plugin is actually bound. | Apache's `ToolchainMojo.java` has three `@Parameter` fields (`toolchainManagerPrivate`, `session`, `toolchains`) — **no download path and no `skip` parameter of any name**; an unmatched requirement fails the build rather than fetching. The names are transpositions of each other (`maven-toolchains-plugin` vs `toolchains-maven-plugin`), and a model defaulting to Maven's usual `<function>-maven-plugin` convention picks the wrong one. `-Dtoolchain.skip` against Apache's plugin is a silent no-op, not a skip ([ToolchainMojo.java](https://raw.githubusercontent.com/apache/maven-toolchains-plugin/master/src/main/java/org/apache/maven/plugins/toolchain/ToolchainMojo.java), [linux-china/toolchains-maven-plugin](https://github.com/linux-china/toolchains-maven-plugin)). | `grep -B2 -A1 '<artifactId>.*toolchains.*plugin' pom.xml` and confirm each groupId pairs with its own artifactId. Before writing `-Dtoolchain.skip` into CI or docs, `grep -q 'org.mvnsearch' pom.xml`. Reading check: any sentence saying maven-toolchains-plugin downloads or installs a JDK is the finding. | MUST | maven-toolchains-plugin 3.3.0 · org.mvnsearch:toolchains-maven-plugin 4.5.0 |
| MVN-BUILD-20 | To run tests on a JDK other than the compile JDK, set `<jdkToolchain>` inside `maven-surefire-plugin`'s own `<configuration>`. Never widen the reactor toolchain to reach it, and never hardcode `<jvm>` as an absolute path. | `jdkToolchain` is Surefire's documented per-execution override against the same `toolchains.xml` entries — *"it may be desirable to compile and test using different jvms"*. Changing the shared toolchain instead moves the **compile** JDK too, which is almost never the intent; `<jvm>` is an absolute path that breaks on the next machine. Live in the corpus, not hypothetical ([surefire toolchains](https://maven.apache.org/surefire/maven-surefire-plugin/examples/toolchains.html)). | `grep -A3 'jdkToolchain' pom.xml` scoped inside the surefire block, and confirm it differs from the version on the shared `maven-toolchains-plugin` execution where divergence is intended. `grep -n '<jvm>' pom.xml` in a repo that has any toolchain wiring — a hit is the finding. | SHOULD | maven-surefire-plugin `jdkToolchain` (3.x) |

#### Caught by grepping CI configuration

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-BUILD-03 | Make `verify` the last Maven goal of every CI gate. Never end a pipeline on `install`, `test`, `package`, or any hyphenated intermediate phase. A `-DskipTests install` reactor bootstrap *before* a `verify` gate is permitted. | Hyphenated phases "sequence the build, producing intermediate results that are not useful outside the build": stopping at `integration-test` runs `pre-integration-test` setup and never the teardown, leaving a Tomcat or Docker container running and possibly hanging Maven itself. Maven's own guidance: *"Do not use `mvn clean install` for your regular builds. Instead, use `mvn verify`!"* — `install` additionally mutates the shared `~/.m2` ([lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html), [whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html)). | `grep -rnE 'mvnw?\b.*\b(install\|test\|package\|integration-test)\b' .github/workflows/ Jenkinsfile .gitlab-ci.yml` — a hit is a finding only when no `verify` appears later on the same invocation line **or** in a later step of the same job. Read the job, do not count the grep. | MUST | Maven 3.9.x and 4 |
| MVN-BUILD-04 | In any module that binds `jacoco-maven-plugin`'s `prepare-agent`, compose `argLine` additively — `<argLine>@{argLine} --add-opens …</argLine>` — never as a bare flag list. | The two sources clobber rather than concatenate: a hand-written `<argLine>` property overrides JaCoCo's injected agent flag, no `jacoco.exec` is produced, and any coverage gate downstream either fails for an unrelated-looking reason or gets switched off. [apache/maven#11605](https://github.com/apache/maven/pull/11605) describes exactly this and is **open and unmerged** as of 2026-09-12 — the workaround is the fix, not an upgrade. | `grep -n -A3 '<argLine>' pom.xml` in every module that also matches `grep -l jacoco-maven-plugin` — an `<argLine>` body with no `@{argLine}`/`@{jacocoArgLine}` reference is the finding. Confirm by running `mvn verify` and asserting `target/jacoco.exec` exists. | MUST | JDK 17+; jacoco-maven-plugin any |
| MVN-BUILD-05 | Pin `maven-surefire-plugin` to a version queried from Central, never from the plugin's documentation-site banner, and confirm tests actually ran. | **Superseded evidence, same rule:** [frame](jvm-frame.md) correction 38 recorded banner `3.6.0` against Central GA `3.5.6` + artifact `3.6.0-M1`; re-queried 2026-09-12, **`3.6.0` is GA** (`lastUpdated 20260903221843`). The banner text never changed across that transition — it named a milestone, then named a GA release, identically. Copying it was wrong for months and right this week, with no way to tell which from the page. On the 3.6.0 line one `surefire-junit-platform` provider replaces `surefire-junit3/junit4/junit47/testng` and JUnit 4 below **4.12** is unsupported outright ([whats-new-3-6-0](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html)) — a wrong provider silently runs zero Jupiter tests rather than failing. | `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-plugin/maven-metadata.xml` before writing the version. After the run, `mvn -X test \| grep 'Using configured provider'` must name `JUnitPlatformProvider`, and the surefire report's test count must be non-zero. | MUST | surefire 3.6.0 GA (2026-09-12) |

#### Caught by a Maven-4 readiness pass (all rows: Maven 3 → 4 migration only)

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-BUILD-06 | Before any Maven-4 move, find every plugin declared in both `<build>` and a `<profile><build>`, and de-duplicate. | Maven 3.9 emits a warning; Maven 4 **fails the build**. It is the single highest-yield silent-until-upgrade breakage ([migration guide](https://maven.apache.org/guides/mini/guide-migration-to-mvn4.html)). | Run the reactor once under a `4.0.0-rc-*` toolchain (MVN-BUILD-07) — the failure names the plugin. Static proxy: extract every `groupId:artifactId` under `<build><plugins>` and under each `<profile><build><plugins>` and diff the two lists per POM. | MUST | Maven 4.0.0-rc-6 |
| MVN-BUILD-07 | Exercise Maven 4 as a *separate, non-blocking CI job* that re-generates the wrapper at a pinned RC; never bump the committed `distributionUrl` to an RC. | Keeps the shipping build on the 3.9.x GA line while surfacing every MVN-BUILD-06/-09 breakage on the real reactor. `apache/maven` itself does exactly this. | `grep -rn 'maven-wrapper-plugin.*:wrapper' .github/workflows/` — the pass shape is `maven-wrapper-plugin:<v>:wrapper "-Dmaven=4.0.0-rc-N"` inside a job whose failure does not block merge, with the committed `.mvn/wrapper/maven-wrapper.properties` still naming a 3.9.x distribution. | SHOULD | maven-wrapper-plugin 3.3.4 |
| MVN-BUILD-09 | Treat these four as the Maven-4 readiness checklist, each with its own check: (a) Maven itself now requires **Java 17 to run** — independent of the project's `--release` target; (b) Plexus container DI is removed, so a plugin still using it does not load; (c) `executionRootDirectory`/`multiModuleProjectDirectory` are gone, replaced by `${project.rootDirectory}`/`${session.topDirectory}`/`${session.rootDirectory}`; (d) `pre-*`/`post-*` are aliases for `before:`/`after:`, so an execution bound to `post-clean` now fires on plain `mvn clean`. | Each is a hard break with a different symptom; (d) is the sneakiest — a plugin execution silently *starts* running on a build it previously skipped, changing behaviour with no error ([whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html)). | (a) the CI image's `java -version`; (b) `mvn -N versions:display-plugin-updates` then read each plugin's Maven-4 compatibility note; (c) `grep -rn 'executionRootDirectory\|multiModuleProjectDirectory' . --include=pom.xml --include='*.xml'` — empty is the pass; (d) `grep -rn '<phase>post-\|<phase>pre-' --include=pom.xml` and read each enclosing execution. | MUST *(migration only)* | Maven 4.0.0-rc-6 |
| MVN-BUILD-08 | State "(Maven 3)", "(Maven 4)" or "(both)" on every Maven mechanic you write down, and re-verify GA before publishing any unconditional Maven-4 claim. | Maven 3 and 4 differ on plugin-declaration strictness, phase scope, default `deployAtEnd`, and reproducibility defaults; an unqualified sentence reads as universally true when it is version-specific. And `4.0.0` has never shipped, so "Maven 4 does X" is a claim about an RC. | `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml \| grep -o '<release>[^<]*'` — anything other than a plain `4.0.0` means Maven 4 is still RC and every such row stays migration-scoped. | MUST | — |

#### Caught by `mvn artifact:check-buildplan` / `artifact:compare`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-BUILD-10 | Set `<project.build.outputTimestamp>` to an explicit ISO-8601 UTC instant in every POM that publishes. | Reproducible-builds mode is on by default only from `4.0.0-beta-5` ([MNG-8258](https://issues.apache.org/jira/browse/MNG-8258)); on the shipping 3.9.x line an unset timestamp bakes the wall clock into every archive entry. Measured **3/32** corpus-wide ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)). Do not copy the ASF parent's own snippet, which shows a Unix-epoch integer — [the reproducible-builds guide's ISO-8601 form is normative](https://maven.apache.org/guides/mini/guide-reproducible-builds.html). | `mvn artifact:check-buildplan` names any plugin version that is not reproducible-compliant; `mvn clean verify artifact:compare` rebuilds and diffs byte-for-byte (add `-Dreference.repo=<staging-url>` to compare against an already-staged release). Empty diff is the pass. | MUST *(any published POM)* | Maven 3.9.x |

#### Caught by a grep over `.mvn/` cross-checked against the pinned Maven version

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-BUILD-11 | Read every `aether.*` property in `.mvn/maven.config` against the Maven version the wrapper pins, and treat a resolver-1.x name under a Maven-4 distribution as a migration breakage. | Resolver 1.x names `aether.checksums.algorithms` / `aether.connector.smartChecksums`; Resolver 2.0.x (what Maven 4 bundles) renamed them to `aether.checksums.checksumAlgorithms` / `aether.connector.basic.smartChecksums`, and the current reference contains no entry for the old names at all. Unrecognised system properties are **ignored, not rejected** — the config becomes a silent no-op on the day the wrapper is bumped ([resolver config](https://maven.apache.org/resolver/configuration.html), [resolver 1.9.22 config](https://maven.apache.org/resolver-archives/resolver-1.9.22/configuration.html)). | `grep -n 'aether\.' .mvn/maven.config` next to `grep distributionUrl .mvn/wrapper/maven-wrapper.properties`: pre-2.0 names + a `apache-maven-4.*` distribution is the finding. Maven 3.9.16 bundles resolver 1.9.27 (`maven-3.9.16.pom:146`). | MUST | Maven Resolver 1.9.x / 2.0.x |
| MVN-BUILD-12 | Never describe Maven checksum configuration as a supply-chain or security control. When the subject is trust, name `maven-gpg-plugin` and Central's mandatory signing instead. | Resolver's own design note: *"Checksums only provide integrity verification. They do not provide security or trust. They do not protect against man-in-the-middle or supply chain attacks"* — and it rejects the "MD5/SHA-1 are unsafe" framing on the same grounds. Gradle's dependency-verification framing (checksum *and* signature as security layers) does not transfer ([about-checksums](https://maven.apache.org/resolver/about-checksums.html)). | Reading check on generated docs/rules: any sentence pairing a Maven checksum algorithm with "secure"/"supply chain"/"tamper" is the finding. Contrast with `GRADLE-DEP-16`, where the framing is correct. | MUST | — |
| MVN-BUILD-13 | Do not remove `smartChecksums=false` when tidying build flags. | `smartChecksums` extracts the reference digest from an HTTP response header and **only ever validates SHA-1**; leaving it on with a SHA-512/SHA-256-first algorithm list configures digests that are then never exercised. Disabling it is what forces the full checksum-file fetch. | Before removing the flag, confirm the sibling `aether.checksums(.checksumAlgorithms)?` list contains an algorithm beyond SHA-1/MD5 — if it does, the flag is load-bearing. | CONSIDER | Maven Resolver 1.9.x / 2.0.x |
| MVN-BUILD-14 | Set both `wrapperSha256Sum` and `distributionSha256Sum` in every committed `.mvn/wrapper/maven-wrapper.properties`. | Both are optional and off by default, so the first `mvnw` on a fresh clone or CI runner downloads and executes a Maven distribution with nothing pinning its hash and no signature checked. This is the one place MVN-BUILD-12's caveat does not apply: no trust chain exists yet, so integrity is the only control ([wrapper](https://maven.apache.org/wrapper/)). Mirrors `GRADLE-DEP-17`. | `grep -L 'distributionSha256Sum' $(find . -name maven-wrapper.properties)` — empty output is the pass. A repo with **no** wrapper at all is a separate, worse finding: CI then runs whatever `mvn` the runner image ships. | MUST *(any repo committing a wrapper)* | maven-wrapper any |
| MVN-BUILD-15 | Check for build extensions in CI as well as in the tree: a `.mvn/extensions.xml` written by a workflow step changes dependency resolution for that build and is invisible to a census of committed files. | `.mvn/extensions.xml` is **0/32 committed** ([shape](jvm-audit/exemplar-build-shape.md) §1) yet `apache/maven`'s own CI copies one in before the build and swaps it for a `~/.m2/extensions.xml` before the Maven-4 leg. An extension can replace the local repository wholesale, so "no extensions" read off `git ls-tree` is not a finding about the build that actually runs. | `grep -rn 'extensions\.xml' .github/workflows/ Jenkinsfile .gitlab-ci.yml` alongside `git ls-tree -r HEAD \| grep extensions.xml`. Either hit means resolution is extended; reconcile before asserting anything about it. | SHOULD | Maven 3.3.1+ (core extensions) |

### MVN-ANT — you opened a `build.xml`

These fire only when an Ant file is in the diff. Nothing here recommends Ant.

#### Caught by a grep over the `build.xml`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-ANT-01 | Set `includeantruntime="false"` explicitly on every live `<javac>`, before any other change to the file. | The default is governed by `build.sysclasspath` and is effectively "yes", putting Ant's own runtime jars on the compile classpath. Ant's manual: *"It is usually best to set this to false so the script's behavior is not sensitive to the environment in which it is run"* ([javac](https://ant.apache.org/manual/Tasks/javac.html)). Same-system, zero-risk, and it removes one axis of "it built on my machine" before migration work starts. | `grep -n -A4 '<javac' build.xml` — any live `<javac>` without the attribute is the finding. Exclude `<!-- … -->` blocks; `apache/ant`'s own file has one dead occurrence inside a `FIXME` comment. | MUST | Ant 1.8+ |
| MVN-ANT-02 | Never introduce `ant.importBuild()`. If an incremental bridge is unavoidable, call the Ant build as an external process (`Exec` / `exec {}` running `ant -f build.xml <target>`), or use `ant.<task>(…)` inside a real Gradle task action. | Gradle's own guide: *"the configuration cache is automatically disabled when importing an Ant build."* The cost is **whole-build and permanent**, not scoped to the imported targets — every other task in that invocation loses cache reuse. 0/32 real usages corpus-wide; every hit is gradle/gradle's own migration documentation ([ant.html](https://docs.gradle.org/current/userguide/ant.html), [shape](jvm-audit/exemplar-build-shape.md) §8). | `grep -rn 'importBuild' --include='*.gradle' --include='*.gradle.kts' .` — any hit outside a comment or docs tree is the finding. Confirm the cost: a second identical invocation must print the literal line `Reusing configuration cache.` ([frame](jvm-frame.md) correction 36). | MUST | Gradle 7+ (configuration cache) |
| MVN-ANT-03 | Never "change" an Ant property by re-declaring it. Properties are write-once: a second `<property name="x" …>` for a name already set is silently ignored. | The opposite of a variable-assignment mental model, and the standard source of "my override did not take effect". The working overrides are setting it *earlier* (including `-Dx=…` on the command line, which is set first) or `<var>` from antcontrib ([using.html](https://ant.apache.org/manual/using.html)). | `grep -n '<property name=' build.xml \| sed 's/.*name="\([^"]*\)".*/\1/' \| sort \| uniq -d` — any duplicated name is a silent no-op at the second and later occurrence. | MUST | Ant any |
| MVN-ANT-04 | Do not read a `depends` chain as proof a target ran. `depends` orders execution; it does not force it. | Ant's manual: *"Ant's `depends` attribute only specifies the order in which targets should be executed — it does not affect whether the target that specifies the dependency(s) gets executed if the dependent target(s) did not (need to) run."* A migration that assumes "B depends on A therefore A produced its output" ports a build that only worked by accident ([using.html](https://ant.apache.org/manual/using.html)). | `ant -p` lists targets and descriptions; `ant -v <target>` prints each target's `if`/`unless` skip decision. Read the skip lines, not the graph. | SHOULD | Ant any |

#### Caught by comparing the ported artifact against the Ant one

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-ANT-05 | Port leaf targets first and verify each ported output *against the Ant build's own artifact* — same entry list, same manifest attributes, same signed digest — before deleting the Ant target. | The six things a migration silently loses are targets, filesets/patternsets, custom `<taskdef>`s, fork settings, inline `<manifest>` content and `<signjar>` config. Only the last three are invisible in a source diff, which is why artifact comparison and not code review is the check. A custom taskdef needs an equivalent *written*, never a mechanical translation. | `unzip -l` both jars and diff the entry lists; `unzip -p <jar> META-INF/MANIFEST.MF` and diff; for a signed jar, `jarsigner -verify -verbose`. Keep the Ant target until all three match. | SHOULD | — |
| MVN-ANT-06 | Pin `digestalg` and `sigalg` on `<signjar>` and set `preservelastmodified="true"`; never take the JDK default algorithm. | The JDK-default signing algorithm moves between releases, so an unpinned `<signjar>` produces a different signature on a different JDK. `preservelastmodified` "give[s] the signed files the same last modified time as the original jar files" — the one Ant signing attribute that bears on reproducibility ([signjar](https://ant.apache.org/manual/Tasks/signjar.html)). | `grep -n -A8 '<signjar' build.xml` — absence of `digestalg`/`sigalg` is the finding. | CONSIDER | Ant 1.7+ |

## Applied to the exemplars and the two future consumers

### Already satisfied

| Rule | Exemplar evidence |
|---|---|
| MVN-BUILD-01 | `assertj__assertj@485502bad2:pom.xml:116` and `apache__maven@ea4a417bd2:pom.xml:134` both set `<maven.compiler.release>` as a property. Both also carry redundant `source`/`target` properties (`:117-118`, `:132-133`) — harmless, since `release` wins, but noise a cleanup should remove. |
| MVN-BUILD-03 | **3 of the 5 Maven-primary repos.** `assertj__assertj@485502bad2:.github/workflows/main.yml:37,64` (`./mvnw $MAVEN_ARGS verify`); `FasterXML__jackson-databind@a906e1782b:.github/workflows/main.yml:57` (`./mvnw -B -ff -ntp verify`); `apache__maven@ea4a417bd2:.github/workflows/maven.yml:101` (`./mvnw verify -e -B -V`). Measured this consolidation — map row M-J-10 was carried unmeasured. |
| MVN-BUILD-07 | `apache__maven@ea4a417bd2:.github/workflows/maven.yml:90` runs `maven-wrapper-plugin:3.3.4:wrapper "-Dmaven=4.0.0-rc-6"` to regenerate the wrapper at the RC for that job only; the committed wrapper is untouched. The canonical shape for this rule. |
| MVN-BUILD-10 | **3/32, now named:** `google__guava@5fb424c43a:pom.xml:100` + `android/pom.xml:99` (`2026-01-02T00:00:00Z`), `FasterXML__jackson-databind@a906e1782b:pom.xml:69` (`2026-06-08T23:40:29Z`), `apache__maven@ea4a417bd2:pom.xml:143` (`2025-06-24T20:18:00Z`). Confirms the [pub audit](jvm-audit/exemplar-publishing-ci-bazel.md)'s count and identifies the three. |
| MVN-BUILD-11 | `assertj__assertj@485502bad2:.mvn/maven.config` — correct *today*: resolver-1.x property names against a wrapper pinned to `apache-maven-3.9.16` (resolver 1.9.27). Listed here and under Violated for the same two lines, deliberately: the config works and is a migration landmine. |
| MVN-BUILD-16 / -17 | **1/32, and it is the tool's own repo.** `apache__maven@ea4a417bd2:pom.xml:135` sets `<maven.compiler.proc>full</maven.compiler.proc>` reactor-wide next to `<maven.compiler.release>${javaVersion}</maven.compiler.release>` (`:131-134`, `javaVersion`=17) — a pre-emptive fix for the JDK-23 policy applied at the parent. `api/maven-api-di/pom.xml:34` then overrides back to `none` for the module that *defines* DI annotations but never consumes a processor. That pair is the canonical shape for both rules: turn it on at the parent, declare the exception explicitly. |
| MVN-BUILD-18 / -19 / -20 | **`google__guava@5fb424c43a` — the corpus's only live split-toolchain build, and it is correct on all three.** `guava/pom.xml:56-62` binds both plugins under their own groupIds; the parent pins the select-toolchain to JDK 26 (`pom.xml:388-403`) and the download half via `org.mvnsearch:toolchains-maven-plugin`'s `download-26-and-surefire-version` execution fetching `<jdk>` 26 plus `<testJdk>` `${surefire.toolchain.version}` (`pom.xml:541-577`); Surefire's own `<jdkToolchain>` at `pom.xml:363-365` is scoped to `${surefire.toolchain.version}` (defaulting to `${java.specification.version}`, `pom.xml:55`). CI (`.github/workflows/ci.yml:22-24,39-56`) then varies `java: [8, 11, 17, 25]`, installs the matrix JDK *and* 26 in one `setup-java`, and passes `-Dtoolchain.skip` — valid precisely because the `org.mvnsearch` plugin is bound (MVN-BUILD-19). Net: javac always on 26, tests on 8/11/17/25. |
| MVN-ANT-01 | `apache__ant@8c96cd6869:build.xml:666,720,773,1654` — all 4 live `<javac>` invocations set it. The 5th occurrence at `:1774` is inside a `<!-- FIXME -->` block and is dead code, not a counterexample. Re-verified this consolidation. |
| MVN-ANT-02 | **0/32 real usages.** Every `ant.importBuild` hit in the corpus is under `gradle__gradle@ea17004a31:platforms/documentation/docs/src/snippets/{antMigration,releases/migrating,…}` — documentation teaching migration *away* from Ant ([shape](jvm-audit/exemplar-build-shape.md) §8). |

### Violated

| Rule | Violation |
|---|---|
| MVN-BUILD-04 | **`FasterXML__jackson-databind@a906e1782b`** — and this corrects the dive, which recorded it as satisfying the rule. `pom.xml:44-46` sets `<argLine>` to two bare `--add-opens` flags with **no** `@{argLine}` placeholder, while `pom.xml:212-215` binds `jacoco-maven-plugin`. The POM carries the symptom in its own comments: `pom.xml:51-54` sets `<jacocoStrict>false</jacocoStrict>` with the note *"For some reason, release fails due to missing jacoco... so disable for now"*, and `pom.xml:226-243` is an enforcer execution whose `requireFilesExist` check on `target/jacoco.exec` is therefore silently non-failing. The clobber, its consequence and its workaround-by-disabling are all in one file. |
| MVN-BUILD-03 | **`google__error-prone@c1f99ad5d3:.github/workflows/ci.yml:88,91`** — `mvn install -DskipTests=true -Dmaven.javadoc.skip=true -B -V` followed by `mvn test -B`. No job in that workflow ever reaches `verify`, so `post-integration-test` and every verify-bound gate never run. (By contrast `google__guava@5fb424c43a:.github/workflows/ci.yml:53,56` runs `./mvnw … install -DskipTests=true` purely as a reactor bootstrap and then gates on `verify` at `:56` — permitted by the rule's carve-out. This distinction is why the dive's flat prohibition was narrowed.) |
| MVN-BUILD-01 | **`google__guava@5fb424c43a:pom.xml:215-216,255-256,324`** — `<source>1.8</source><target>1.8</target>` hard-coded on `maven-compiler-plugin`, the literal `1.8` repeated three times in one POM so a single bump needs three coordinated edits. **`google__error-prone@c1f99ad5d3:pom.xml:175,204-205`** — the same pattern at `21`. Neither sets `release`, so neither pins an API baseline ([shape](jvm-audit/exemplar-build-shape.md) §5). |
| MVN-BUILD-10 | **`assertj__assertj@485502bad2`** — publishes to Central (`.github/workflows/main.yml:180`, `./mvnw $MAVEN_ARGS -DskipTests -Ppublish deploy`) with no `project.build.outputTimestamp` anywhere in the reactor. The strictest Maven exemplar in the corpus on every other axis — `dependencyConvergence`, pitest, resolver checksum hardening — and it ships non-reproducible archives. `google__error-prone@c1f99ad5d3` likewise. |
| MVN-BUILD-14 | **`assertj__assertj@485502bad2:.mvn/wrapper/maven-wrapper.properties`** sets `wrapperVersion`, `distributionType=only-script` and `distributionUrl` — neither checksum field present. Worse: **`google__error-prone@c1f99ad5d3` has no wrapper at all** (`git ls-tree -r HEAD \| grep -iE 'mvnw\|\.mvn/'` returns nothing) and its CI invokes bare `mvn`, so the build runs on whatever Maven the GitHub runner image happens to ship. `apache/maven` carries no wrapper either, but self-hosts and generates one in CI — not applicable rather than a violation. |
| MVN-BUILD-11 | **`assertj__assertj@485502bad2:.mvn/maven.config`** — `-Daether.checksums.algorithms=SHA-512,SHA-256,SHA-1,MD5 -Daether.connector.smartChecksums=false`, both resolver-1.x names. The day the wrapper moves to any `4.0.0-rc-*` distribution, both flags become unrecognised system properties, are ignored without error, and the hardening disappears silently. |
| MVN-BUILD-02 | **Uncovered corpus-wide** ([cfg](jvm-audit/config-inventory.md)); no exemplar was measured as binding `annotationProcessorPaths` for every processor. This rule imposes practice rather than codifying it — flag it as such when it reaches an adopter. |
| MVN-BUILD-16 | **0/32 pair the two conjuncts, and the violation is unobservable by construction.** The one POM setting `maven.compiler.proc` (`apache__maven`) has no populated `annotationProcessorPaths`; no Maven-primary exemplar was measured depending on Lombok, MapStruct, Dagger, AutoValue or Immutables, so the corpus cannot show a *live* silent-skip case — only the repo that pre-empted it. Worse for census purposes: a processor that stopped running leaves the POM unchanged, the build green and the exit code 0, so "no violations found" here is a statement about the measurement, not about the builds ([AP dive](jvm-maven-and-ant/maven-annotation-processing-and-toolchains.md) §D4–D5). The artifact half of the verification is a **new commitment**: no exemplar's CI asserts `target/generated-sources/annotations/`. |
| MVN-BUILD-18 | **`apache__maven@ea4a417bd2` has no toolchain binding of any kind** — the project that documents the toolchains mechanism does not use it on itself. Recorded as out of scope (single-JDK build, Java 17 floor) rather than as a counter-example; do not cite it either way. |

### New commitments for the OCX SDK and the OCX Gradle plugin

| Consumer | What this family binds |
|---|---|
| **OCX SDK (JVM)** | Gradle-built, so MVN-BUILD binds it through exactly two surfaces. (1) The **published POM** — already owned by [`MVN-DEP-10`](jvm-dependencies.md) (no ranges, no `LATEST`, no unresolved placeholder). (2) A **Maven consumability module** in the `maven-tests/` shape that dagger, grpc-java, okhttp, Exposed and junit-framework all ship ([shape](jvm-audit/exemplar-build-shape.md) §Smells) — new commitment: that module's POM must itself satisfy MVN-BUILD-01, MVN-BUILD-05 **and MVN-BUILD-16**, or it passes green having compiled against the wrong API baseline, run zero tests, and — if the SDK ships or consumes any annotation processor — generated nothing, which is the exact set of failures it exists to detect. Not new, but load-bearing: MVN-BUILD-10 applies to it if it publishes anything. New, and cheap: if the SDK's Java floor differs from the JDK the module's CI job runs, MVN-BUILD-18 applies — and `actions/setup-java` is the provisioning answer, not a third-party Maven plugin (Verdict 9). |
| **OCX Gradle plugin** | No Maven build surface at all beyond the Plugin Portal's generated POM. One defensive commitment: the plugin's own documentation and any build snippet it generates must never offer `ant.importBuild()` (MVN-ANT-02) — the plugin's product is configuration-cache-correct provisioning per `GRADLE-PLUG`, and a snippet that disables the consuming build's configuration cache destroys the thing it sells. |
| **Both** | MVN-BUILD-08's version-stamping discipline binds every rule, doc and README this program publishes, not just POM edits: no unqualified "Maven 4" sentence ships while Central tops out at `4.0.0-rc-6`. MVN-BUILD-17 extends the same discipline to the JDK axis: no "modern JDKs" and no "JDK 21" in any annotation-processing sentence either program publishes — the release number is **23**. |

## AI-agent failure modes

Ranked by how often it bites, each with the mechanical check.

1. **Writes `<source>`/`<target>` instead of `<release>`.** Pre-2020 tutorials dominate the
   training data and use the deprecated pair universally; the values often look modern
   (`<source>21</source>`), which defeats a value-based eyeball check.
   → `grep -n '<source>\|<target>' pom.xml` scoped inside a `maven-compiler-plugin`
   `<configuration>`. Any hit. (MVN-BUILD-01)
2. **Emits `mvn clean install` as the CI command.** The single most common Maven idiom in
   training data, contradicted by Maven's own current guidance.
   → grep the last Maven goal per CI job; `install` or `test` with no later `verify` is
   the finding. Read the job, not the line. (MVN-BUILD-03)
3. **Writes Maven 4 as shipped** — `<version>4.0.0</version>`, or Maven-4-only features
   (`<subprojects>`, `<packaging>bom</packaging>`, consumer-POM flattening) as safe
   defaults. Mechanism, not a rate: resolve every coordinate against the registry before
   emitting it ([frame](jvm-frame.md) correction 34).
   → `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml`.
   (MVN-BUILD-08, and [`MVN-DEP-11`](jvm-dependencies.md))
4. **Pins a plugin version read off its documentation site.** The Surefire page says 3.6.0;
   Central's GA line says 3.5.6. The banner is a doc-publish date, not a release index.
   → query `maven-metadata.xml` for that plugin before writing any `<version>`.
   (MVN-BUILD-05)
5. **Writes a bare `<argLine>` in a module that has JaCoCo.** The flags look correct in
   isolation and the build stays green — coverage just stops being produced.
   → `<argLine>` body with no `@{argLine}` in a module matching `jacoco-maven-plugin`.
   (MVN-BUILD-04)
6. **Assumes `-Daether.checksums.algorithms=…` works on any Maven.** The flag reads as
   self-evidently correct system-property syntax; the model has no version-awareness of
   the resolver 1.x → 2.0 rename, and the wrong name fails silently.
   → cross-reference `.mvn/maven.config` against the wrapper's pinned distribution.
   (MVN-BUILD-11)
7. **Recommends `ant.importBuild()` as "the standard Ant→Gradle bridge."** Gradle's own
   tutorial-era material presents it as a headline feature; the configuration-cache cost
   is a later consequence that the mirrored blog posts do not carry.
   → any generated Gradle script containing `importBuild`. (MVN-ANT-02)
8. **"Overrides" an Ant property by adding a second `<property>`.** Variable-assignment
   intuition; Ant silently ignores the second write and the agent reports success.
   → duplicate `name=` values in `<property>` declarations. (MVN-ANT-03)
9. **Frames Maven checksum configuration as supply-chain security**, importing the framing
   that is correct for Gradle's dependency verification and wrong for Maven Resolver.
   → any generated sentence pairing a Maven checksum algorithm with "secure"/"supply
   chain"; the correct control to name is GPG signing. (MVN-BUILD-12)
10. **Says "JDK 21" disabled implicit annotation processing.** The 2023 warning rollout was
    announced loudly; the 2024 reinstatement for JDK 23 was announced quietly eighteen
    months later, so the wrong release dominates the training data.
    → "JDK 21" next to "disable"/"stops" + "annotation processing". The answer is **23**.
    (MVN-BUILD-17)
11. **Treats a green `mvn verify` as proof the processors ran.** Nothing in Maven's exit
    code, console output or the POM distinguishes "processed and generated" from "silently
    skipped"; the model reports success truthfully and is wrong about the artifact.
    → the only mechanical check is `target/generated-sources/annotations/` being non-empty
    in a module with a populated `annotationProcessorPaths`. (MVN-BUILD-16)
12. **Writes `<proc>full</proc>` against a pre-3.13.0 `maven-compiler-plugin`.** The
    *parameter* is `since 2.2` and appears in decade-old tutorials; the *value* only became
    legal in 3.13.0, so the config looks right and does not apply.
    → check the pinned plugin version whenever `full` is emitted. (MVN-BUILD-16)
13. **Assumes `maven-toolchains-plugin` downloads a JDK, by analogy with Gradle's toolchain
    block, and transposes it with `toolchains-maven-plugin`.** The two artifact names differ
    only in word order and Maven's usual `<function>-maven-plugin` convention points the
    model at the wrong one.
    → `org.apache.maven.plugins` = select-only; `org.mvnsearch` = download-capable. Any
    other pairing fails resolution. (MVN-BUILD-19)
14. **Writes `-Dtoolchain.skip` as a general Maven flag.** It reads like `-DskipTests`; it
    is one third-party plugin's own property and a silent no-op elsewhere.
    → confirm `org.mvnsearch:toolchains-maven-plugin` is bound first. (MVN-BUILD-19)
15. **Hardcodes `<jvm>` in Surefire to test on another JDK.** Older, more common in
    tutorials, and portable-looking until the next machine.
    → `<jdkToolchain>` is the portable equivalent Surefire's own docs prefer. (MVN-BUILD-20)

## Open questions

**Needs an owner decision**

- **Q-MVN-1 — Does `rules/maven-build/` ship in the first bundle at all?** The map resolved
  it as its own rule, but the fleet has zero Maven consumers, the corpus has 5 Maven-primary
  repos of 32, and both named OCX consumers are Gradle-first. The case for shipping is the
  third audience (catalog adopters with a `pom.xml`); the case against is carrying four
  depth files nobody in the fleet loads. If it ships trimmed, `ant-legacy.md` is the first
  cut.
- **Q-MVN-2 — Does the OCX SDK ship a Maven consumability module on day one, or later?**
  Verdict 6 assumes yes, on the corpus shape. It is a real cost (a second POM, a second CI
  job) for a guarantee nothing else provides. Deciding "later" changes MVN-BUILD from
  "binds the SDK" to "binds nothing we own", which is worth knowing before the authoring
  pass sizes the file.
- **Q-MVN-3 — Is MVN-BUILD-02 (`annotationProcessorPaths`) a MUST at 0/32 adoption?** This
  file rules MUST on nondeterminism grounds. Same shape as `Q-DEP-1` in
  [jvm-dependencies.md](jvm-dependencies.md): ahead of the ecosystem, or matching it.

**Deserves another research round**

- **Subarea: Gradle-side handback — does `GRADLE-TOOL`/`JAVA-PLAT` need a `-proc:` row at
  all?** Question: *given that Gradle emits `-proc:none` or `-processorpath` unconditionally
  on every `JavaCompile` (so JDK-23's policy never bites it), is the only Gradle-side rule
  the narrow one — that `-processorpath`/`--processor-path` in `compilerArgs` is rejected
  outright, so an agent must use the typed `annotationProcessorPath`?* Evidence is settled
  (`gradle__gradle@ea17004a31:…/JavaCompilerArgumentsBuilder.java:110-112,209-216`); the
  *decision* is the map's, not this family's. Hand it over rather than writing an MVN row.
- **Subarea: `maven-antrun-plugin` — Ant inside Maven.** Question: *what does a rule say
  about `<tasks>`/`<target>` blocks embedded in a POM, which is the one Ant surface that
  appears in live Maven builds rather than in legacy files?* The map's Ant brief named the
  plugin; the dive never fetched it, and `MVN-ANT` as written only fires on a `build.xml`.
- **Subarea: Maven build extensions as a resolution mechanism.** Question: *does
  MVN-BUILD-15 become a MUST, and what does a rule say about an extension that replaces
  the local repository (`apache/maven`'s Mimir) for CI only?* Measured as 0/32 committed,
  which is exactly why the CI-injected case was missed.

## Sub-artifacts

- [maven4-lifecycle-and-plugins.md](jvm-maven-and-ant/maven4-lifecycle-and-plugins.md) —
  the whole group in one dive: the 23-phase lifecycle and why `verify` is the entry point,
  every Maven-4 breaking change against `4.0.0-rc-6`, the compiler plugin's unconditional
  Java-8 default, Surefire's single-provider consolidation, the JaCoCo `argLine` clobber,
  reproducibility, the ASF parent's floors-only posture, the resolver-version-conditional
  checksum finding, and Ant recognise-and-migrate. Three of its rows are corrected here
  (jackson's `argLine`, the flat `install` prohibition, Surefire's pinnable version).
- [maven-annotation-processing-and-toolchains.md](jvm-maven-and-ant/maven-annotation-processing-and-toolchains.md)
  — the wave-4 follow-up this file commissioned: the three-ticket JDK 21→22→23 rollout of
  the implicit-annotation-processing shutoff with verbatim javac spec text from the 21, 25
  and 26 pages, `maven.compiler.proc`'s `since 2.2` parameter / 3.13.0 value trap, the
  distinguishability problem (a green build proves nothing), the three-part Maven toolchain
  mechanism, Apache's select-only plugin versus `org.mvnsearch`'s Foojay downloader, and
  guava's split compile-26 / test-8·11·17·25 pattern read end to end. Supersedes this file's
  Surefire version snapshot (3.6.0 is now GA) and hands the Gradle `-proc:` question back to
  the map.

## Revision log

| Date | Change | IDs | Why |
|---|---|---|---|
| 2026-09-12 | Added the annotation-processing conjunct MVN-BUILD-02 was missing: `maven.compiler.proc=full`, with a plugin-version floor and an **artifact-level** verification, because no config-level check can see a skipped processor. | +MVN-BUILD-16 | JDK 23 makes an `annotationProcessorPaths`-only POM silently process nothing; `mvn verify` still exits 0 ([AP dive](jvm-maven-and-ant/maven-annotation-processing-and-toolchains.md) §D1–D5). |
| 2026-09-12 | **Corrected MVN-BUILD-02's rationale in place.** It asserted the compile-classpath processor scan unconditionally; that mechanism is JDK ≤ 22 only. Rule text and meaning unchanged — the rationale is now version-stamped, cross-referenced to -16, and the verification gained the artifact check. | MVN-BUILD-02 | The old text implied that declaring paths controlled processing. On JDK 23+ it controls *which*, never *whether* — the most dangerous shape of overclaim. |
| 2026-09-12 | Added the JDK-release-stamping rule for annotation-processing defaults, with `<proc>none</proc>` as the explicit opt-out shape. | +MVN-BUILD-17 | "JDK 21" is the default wrong answer in training data; 21/22 warn, **23** enforces ([JDK-8306819](https://bugs.openjdk.org/browse/JDK-8306819) → [-8321321](https://bugs.openjdk.org/browse/JDK-8321321) → [-8321319](https://bugs.openjdk.org/browse/JDK-8321319)). |
| 2026-09-12 | Added the three toolchain rows: selection wiring, the two transposable plugin names plus `-Dtoolchain.skip` ownership, and Surefire's scoped `jdkToolchain`. | +MVN-BUILD-18, +MVN-BUILD-19, +MVN-BUILD-20 | Closes the "Maven toolchains" open subarea and explains the `-Dtoolchain.skip` / `-Dsurefire.toolchain.version` flags in guava's CI that no audit had read. |
| 2026-09-12 | **Corrected MVN-BUILD-05's evidence and floor.** Surefire `3.6.0` is now **GA** on Central (`lastUpdated 20260903221843`), superseding [frame](jvm-frame.md) correction 38's `3.5.6`-GA / `3.6.0-M1` snapshot. Rule, severity and meaning unchanged. | MVN-BUILD-05 | The banner/Central disagreement resolved within one release *without the banner text changing* — which strengthens the method rule and retires the specific numbers. Frame correction 38 is now stale on the numbers, correct on the method. |
| 2026-09-12 | Verdict 7 rewritten; Verdicts 8 and 9 added (annotation processing; the toolchain-acquisition gap, carried rather than closed). Both answered subareas removed from Open questions, with their residual gaps — 0/32 pairing, no CI asserting generated-sources, the single-maintainer downloader — moved into the Verdict as documented gaps. | Verdict | Settled questions leave Open questions; established gaps become Verdict text. |
| 2026-09-12 | Added six AI-agent failure modes (10–15) and one new open subarea: the Gradle `-proc:` handback. | — | The Gradle evidence is settled (`JavaCompilerArgumentsBuilder` always emits `-proc:none` or `-processorpath`), but the decision belongs to `GRADLE-TOOL` and the map, not to MVN-BUILD. |

## Key sources

| URL | Why |
|---|---|
| [maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) | The 23 phases and the verbatim "don't call hyphenated phases directly" warning (MVN-BUILD-03) |
| [maven.apache.org/whatsnewinmaven4.html](https://maven.apache.org/whatsnewinmaven4.html) | Every Maven-4 breaking change, plus "Do not use `mvn clean install` … use `mvn verify`!" (MVN-BUILD-03, -09) |
| [maven.apache.org/guides/mini/guide-migration-to-mvn4.html](https://maven.apache.org/guides/mini/guide-migration-to-mvn4.html) | The Prepare/Test/Migrate sequence and the duplicate-plugin hard failure (MVN-BUILD-06) |
| [maven.apache.org/plugins/maven-compiler-plugin/](https://maven.apache.org/plugins/maven-compiler-plugin/) | "source and target … both 8, independently of the JDK you run Maven with" (MVN-BUILD-01) |
| [maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html](https://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html) | `annotationProcessorPaths` semantics and version floors (MVN-BUILD-02); `proc`/`maven.compiler.proc` and its own "Starting with JDK 21, this option must be set explicitly" note (MVN-BUILD-16) |
| [docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html#option-proc](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html#option-proc) | Verbatim `-proc:none/only/full`, and the double-negative sentence that *is* the JDK-23 policy; identical on the JDK 26 page, different on the JDK 21 one (MVN-BUILD-16, -17) |
| [bugs.openjdk.org/browse/JDK-8306819](https://bugs.openjdk.org/browse/JDK-8306819) | The supply-chain rationale for disabling implicit annotation processing — and, with [-8321321](https://bugs.openjdk.org/browse/JDK-8321321) and [-8321319](https://bugs.openjdk.org/browse/JDK-8321319), the 22-deferred/23-live sequence (MVN-BUILD-17) |
| [issues.apache.org/jira/browse/MCOMPILER-548](https://issues.apache.org/jira/browse/MCOMPILER-548) | The `full` value only became legal in maven-compiler-plugin 3.13.0 — closes the `since 2.2` trap (MVN-BUILD-16) |
| [maven.apache.org/guides/mini/guide-using-toolchains.html](https://maven.apache.org/guides/mini/guide-using-toolchains.html) | `toolchains.xml` format and the toolchain-aware-plugin table; the plugin selects, never provisions (MVN-BUILD-18) |
| [ToolchainMojo.java (apache/maven-toolchains-plugin)](https://raw.githubusercontent.com/apache/maven-toolchains-plugin/master/src/main/java/org/apache/maven/plugins/toolchain/ToolchainMojo.java) | Primary proof: no download path, no `skip` parameter — the basis for MVN-BUILD-19 |
| [github.com/linux-china/toolchains-maven-plugin](https://github.com/linux-china/toolchains-maven-plugin) | `org.mvnsearch:toolchains-maven-plugin` 4.5.0: Foojay-backed download, `testJdk`, and the real owner of `-Dtoolchain.skip` (MVN-BUILD-19) |
| [maven.apache.org/surefire/maven-surefire-plugin/examples/toolchains.html](https://maven.apache.org/surefire/maven-surefire-plugin/examples/toolchains.html) | `jdkToolchain` and the explicit "compile and test using different jvms" use case (MVN-BUILD-20) |
| [maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html) | Single `surefire-junit-platform` provider; JUnit 4 ≥ 4.12 floor (MVN-BUILD-05) |
| [maven.apache.org/guides/mini/guide-reproducible-builds.html](https://maven.apache.org/guides/mini/guide-reproducible-builds.html) | `outputTimestamp` ISO-8601 form, `4.0.0-beta-5` default-on, `artifact:check-buildplan`/`artifact:compare` (MVN-BUILD-10) |
| [maven.apache.org/resolver/configuration.html](https://maven.apache.org/resolver/configuration.html) | Resolver 2.0.x property names, and the absence of the 1.x names (MVN-BUILD-11) |
| [maven.apache.org/resolver-archives/resolver-1.9.22/configuration.html](https://maven.apache.org/resolver-archives/resolver-1.9.22/configuration.html) | The live 1.x names, the other half of the version-conditional finding (MVN-BUILD-11) |
| [maven.apache.org/resolver/about-checksums.html](https://maven.apache.org/resolver/about-checksums.html) | "Checksums … do not provide security or trust" — the basis for MVN-BUILD-12 and -13 |
| [maven.apache.org/wrapper/](https://maven.apache.org/wrapper/) | `wrapperSha256Sum`/`distributionSha256Sum` semantics and opt-in status (MVN-BUILD-14) |
| [maven.apache.org/pom/asf/](https://maven.apache.org/pom/asf/) | ASF parent v39: enforces version floors only, no `dependencyConvergence` — the "inheriting a strict parent buys convergence" assumption falsified |
| [github.com/apache/maven/pull/11605](https://github.com/apache/maven/pull/11605) | Open and unmerged: the `--add-opens`/JaCoCo `argLine` clobber is a workaround, not an upgrade (MVN-BUILD-04) |
| [ant.apache.org/manual/using.html](https://ant.apache.org/manual/using.html) | Write-once properties; `depends` orders but does not force (MVN-ANT-03, -04) |
| [ant.apache.org/manual/Tasks/javac.html](https://ant.apache.org/manual/Tasks/javac.html) | "It is usually best to set this to false" — `includeantruntime` (MVN-ANT-01) |
| [docs.gradle.org/current/userguide/ant.html](https://docs.gradle.org/current/userguide/ant.html) | "the configuration cache is automatically disabled when importing an Ant build" (MVN-ANT-02) |

## Revision log (2026-09-13, orchestrator)

**`MVN-BUILD-21` allocated at authoring.** The phase-8 review found gradle-build making explicit source encoding merge-blocking while maven-build only mentioned it in a rationale, a cross-set contradiction on a JVM fact. The fix added a MUST row to `rules/maven-build/lifecycle-and-plugins.md`: set `project.build.sourceEncoding=UTF-8` in every published POM or its parent regardless of the JDK floor (JEP 400 changed `file.encoding`, not Maven's own property default). The reviewer proposed `MVN-BUILD-20`, which this consolidation already uses for the surefire `jdkToolchain` row, so the fixer allocated `MVN-BUILD-21`. Recorded here so the ID resolves; MVN-BUILD tally is now 21.

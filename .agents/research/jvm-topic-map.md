---
title: "JVM topic map — wave 1 consolidated and adjudicated, wave 2 commissioned, wave 3 staged"
phase: 3
model: opus
date: 2026-09-05
wave: "1 consolidated → 2 commissioned, 3 staged"
sources_surveyed: 13
candidates_deduplicated: 247
---

# JVM topic map (phase 3)

## How to read this

1. **Every row is a question**, not a subject area — a question a later rule
   answers with a named verification. "Dependency management" is a wave;
   "when must a dependency be `api` rather than `implementation`, and how does
   a reviewer detect the leak before a consumer's build breaks" is a row.

2. **Coverage is measured against the sibling lore sets and the frame's
   inventory, never against a fleet codebase — there is no fleet codebase.**
   `grep -rn -iE '\b(java|kotlin|gradle|maven|jvm|jar)\b' rules/ skills/`
   returns zero matches across the catalog's 8 rule sets and 2 skills
   ([cfg](jvm-audit/config-inventory.md) headline 1), and
   `find /home/mherwig/dev -maxdepth 7` found no `*.java`, `*.kt`, `*.kts`,
   `pom.xml`, `build.gradle` or `build.xml` anywhere in the fleet
   ([frame](jvm-frame.md)). So `covered` here can only mean *a sibling set
   already owns this glob and this content*; `partial` means a sibling owns the
   **shape** (a packaging rule loading on a manifest, a lockfile row, a coverage
   row) but none of the JVM content; `uncovered` is the default and the honest
   answer for almost every row. All evidence about practice comes from the
   32-repo exemplar corpus fetched at the SHAs in [frame](jvm-frame.md), never
   from a repository the fleet owns.

3. **Priority is against this program's three consumers**, in order: the future
   **OCX SDK for the JVM** (a published library with a public API, a
   CLI-subprocess boundary, a strict test/coverage gate and Central publishing —
   the analogue of `ocx-sdk-python`, [cfg](jvm-audit/config-inventory.md) Axis 3),
   the future **OCX Gradle plugin** (tool/toolchain provisioning through OCX
   from a Gradle build — the analogue of `rules_ocx` and `setup-ocx`,
   [cfg](jvm-audit/config-inventory.md) Axis 4), and the **general JVM adopter**
   of the lore catalog. A topic that is P0 in JVM-in-general and irrelevant to
   all three is P2 here; the reverse also happens (see M-C-09, dependency
   locking, which 0/32 exemplars practise but which both future consumers need).

4. **SURFACE legend** — `java` · `kotlin` · `gradle` · `maven` · `ant` ·
   `bazel-java` · `sdk` (authoring a published library) · `plugin-dev`
   (authoring a Gradle plugin) · `any` (binds every surface).

5. **Exemplar-shape legend** (the six shapes in
   [shape](jvm-audit/exemplar-build-shape.md), named here so every row can say
   what it binds):
   **A** = Kotlin library on the Gradle Kotlin DSL publishing to Central
   (okhttp, kotlinx.coroutines, Exposed, ktor, apollo-kotlin) ·
   **B** = Java library on Gradle with `build-logic`/`buildSrc` convention
   plugins (junit-framework, micronaut-core, spring-boot, mockito,
   testcontainers-java, NullAway) ·
   **C** = Java library on Maven (guava, jackson-databind, error-prone, assertj,
   apache/maven) ·
   **D** = Gradle plugin as the product (shadow, detekt, sqldelight, spotless,
   ktlint, gradle/actions, gradle/gradle's own `build-logic`) ·
   **E** = Java under Bazel, or a genuine Gradle+Bazel dual build (dagger,
   grpc-java, bazelbuild/bazel, rules_java, rules_kotlin, rules_jvm_external) ·
   **F** = legacy Groovy DSL or Ant (apache/kafka, spring-boot's Groovy half,
   testcontainers-java, grpc-java, apache/ant) ·
   `all` = binds every shape.

6. **Source keys**, all links, 13 of 13 wave-1 workers returned:
   [frame](jvm-frame.md) ·
   [cfg](jvm-audit/config-inventory.md) ·
   [shape](jvm-audit/exemplar-build-shape.md) ·
   [gates](jvm-audit/exemplar-quality-gates.md) ·
   [pub](jvm-audit/exemplar-publishing-ci-bazel.md) ·
   [cjava](jvm-topic-map/canonical-java.md) ·
   [ckt](jvm-topic-map/canonical-kotlin.md) ·
   [cgrad](jvm-topic-map/gradle-canonical.md) ·
   [cmab](jvm-topic-map/maven-ant-bazel-canonical.md) ·
   [lint](jvm-topic-map/codified-lint-catalogue.md) ·
   [failb](jvm-topic-map/failure-build-and-deps.md) ·
   [failr](jvm-topic-map/failure-language-runtime.md) ·
   [prac](jvm-topic-map/practitioner-and-conferences.md) ·
   [shift](jvm-topic-map/recent-shifts.md).

7. **Every P0 names a check** in its justification cell: a command, a lint ID, a
   plugin task, a grep, or a named reading heuristic. A P0 that cannot name one
   was demoted.

8. **Version-specific rows carry their version.** Where a row's truth depends on
   a Java, Kotlin, Gradle, Maven or Bazel version, the version is in the
   question or the justification. Undated version claims were treated as
   defects during adjudication.

## Conflicts resolved

Twenty-two places where two wave-1 artifacts disagree, or where an artifact
disagrees with the frame or with the requester's hypotheses. Each resolution
names the evidence that decided it, ranked **normative** (a spec, a JEP, an
official release note) > **measured** (a count over the exemplar corpus with the
command inline) > **codified** (a shipped tool default or rule catalogue) >
**argued** (a named practitioner with a reason) > **asserted** (a claim with no
underlying source).

**1. Fat/shadow jars: not "best practice" and not "anti-pattern" — a
distribution-shape decision, resolved per consumer kind.** The frame's
hypothesis 2 says fat jars are a best-practice topic in their own right;
[cgrad](jvm-topic-map/gradle-canonical.md) notes Shadow's and Spring Boot's docs
never discuss shading a *library* at all; [failb](jvm-topic-map/failure-build-and-deps.md)
finds Spring Boot's own packaging docs argue *against* merging in favour of
nested, unmerged jars. **[pub](jvm-audit/exemplar-publishing-ci-bazel.md)
settles it by measurement, with zero counterexamples in 32 repos**: every shaded
artifact in the corpus is a CLI, a javac/annotation-processor plugin, or an
internal vendoring step — `uber__NullAway@519a1bb826` shades `jar-infer-cli`,
`jdk-javac-plugin` and `astubx-generator-cli` but never `nullaway`;
`detekt__detekt@45672efb8b` shades `detekt-cli`, not `detekt-api`;
`pinterest__ktlint@4c933394a3` shades `ktlint-cli`, not the rule-set libraries;
`google__error-prone@c1f99ad5d3` shades `error_prone_core` because it is loaded
into `javac` itself. **Resolved four ways.** *Library* (declared as a dependency
and called through its API): never shade — MUST. *Application*: shading is the
naive baseline, not the recommendation; nested (Spring Boot `BOOT-INF/lib`),
`jlink` image, `jpackage`, or a Jib/layered container all beat it where their
preconditions hold. *Gradle plugin*: `com.gradle.plugin-publish` auto-applies
`com.gradleup.shadow` since 1.0.0 ([cgrad](jvm-topic-map/gradle-canonical.md)),
so shading is the sanctioned path there. *CLI*: shading is correct, with the
merge-transformer and signature-exclusion taxonomy as MUSTs. Hypothesis 2 is
reshaped, not refuted; the depth file routes on "are you building something
invoked as a program or loaded as a plugin", never on "are you publishing a jar".

**2. One `jvm-quality` rule, or separate `java-quality` and `kotlin-quality`?
Separate.** The frame left this open. `rule-distillation`'s bar is "a second
rule file is justified only by a genuinely different glob; same glob ⇒ same
rule" — and `**/*.java` and `**/*.kt` *are* different globs, both
extension-shaped, both unmissable. The content confirms the split rather than
merely permitting it: [ckt](jvm-topic-map/canonical-kotlin.md)'s densest page
(backward compatibility) has no Java analogue at all — widening *or* narrowing a
return type breaks Kotlin bytecode, a `data class` in a public API breaks
`copy()`, `@JvmOverloads` does not preserve binary compatibility for Kotlin
callers — while [cjava](jvm-topic-map/canonical-java.md)'s densest material
(sealed + records + exhaustive `switch`, `StructuredTaskScope`, FFM restricted
methods) has no Kotlin analogue. A merged index carrying both non-negotiable
lists lands near 300 lines against the catalog's observed 114-229
([cfg](jvm-audit/config-inventory.md) Axis 1.1) and blows the sub-200-line index
budget. **Resolved: two rules.** The ~6 genuinely shared MUST rows (charset,
locale, JSpecify boundary, JDK floor vs `--release`, JPMS metadata, secure
deserialization) are duplicated *bounded* — the MUST line only, never the depth —
which is the same hedge `rule-distillation` sanctions for review skills.

**3. Maven and Ant: their own rule, not extra globs on the Gradle rule.**
[cfg](jvm-audit/config-inventory.md) smell 3 argues `gradle-build` is already
quality-shaped rather than packaging-shaped and warns against loading it wider.
[cmab](jvm-topic-map/maven-ant-bazel-canonical.md) produced 48 candidates whose
mechanics share *concepts* with Gradle (BOMs, publishing, reproducibility) but
share no *text*: nearest-wins-by-depth mediation, the 23-phase lifecycle,
`dependencyManagement` precedence, enforcer rule names, the build-POM/consumer-POM
split. [shape](jvm-audit/exemplar-build-shape.md) measured 5 Maven-primary repos
of 32 and — decisively — **0 of the 10 Gradle-tagged repos carrying a `pom.xml`
actually build with both**; every incidental pom is a Maven-consumability example
or a plugin's integration-test fixture. A Maven-only adopter loading a Gradle
index gets nothing but noise. **Resolved: `maven-build.md` + `maven-build/`,
globbing `**/pom.xml`, `**/.mvn/**`, `**/mvnw*`.** Ant folds in as one depth
file, not a rule: only `apache/ant` itself is genuinely built by Ant (1/32,
[shape](jvm-audit/exemplar-build-shape.md) §8), `ant.importBuild` is 0/32 in real
use, and the whole surface is recognise-and-migrate, which fails
`rule-distillation`'s "it changes a diff" test for every adopter who is not
migrating.

**4. `buildSrc` vs included `build-logic`: recommend `build-logic`, never call
`buildSrc` broken.** [cgrad](jvm-topic-map/gradle-canonical.md) quotes Gradle's
own Best Practices page — "the preferred location for build logic is an included
build (typically named `build-logic`), **not** in `buildSrc`" — which is
normative and wins on direction. But [shape](jvm-audit/exemplar-build-shape.md)
measured the split live: 10 repos on an included build (gradle/gradle, ktor,
detekt, shadow, sqldelight's camelCase `buildLogic`, ktlint, okhttp, nowinandroid,
junit-framework, apollo-kotlin) against 9 still on `buildSrc` (dagger, grpc-java,
Exposed, micronaut-core, mockito, kotlinx.coroutines, spring-boot,
testcontainers-java, NullAway) — including flagships under active maintenance.
[cgrad](jvm-topic-map/gradle-canonical.md) also records Gradle's own two
caveats: Settings plugins need `pluginManagement{}` inclusion (which "reduces
Build Caching capability", hence a separate minimal `build-logic-settings`), and
very-large-subproject-count builds can hit Build Service breakage from
per-subproject classpath variation. **Resolved: SHOULD, with both caveats named
and `buildSrc` explicitly not flagged as a defect.** A MUST here would flag nine
of the corpus's best repos.

**5. Kotlin DSL for the rules' examples, with one Groovy row where the idiom
differs.** [prac](jvm-topic-map/practitioner-and-conferences.md) records the
trend strongly toward Kotlin DSL (IDE default since IntelliJ 2023.1) and
[lint](jvm-topic-map/codified-lint-catalogue.md) records "Use Kotlin DSL" as the
first of Gradle's own 31 named Best Practices — both normative-adjacent.
[shape](jvm-audit/exemplar-build-shape.md) measured the counterweight: 13 root
`.kts` vs 8 root Groovy settings files, and Groovy is *dominant* in
`spring-boot` (736 vs 54) and `apache/kafka` (9 vs 0). **Resolved: Kotlin DSL is
the example language; Groovy appears only where the two DSLs need genuinely
different text** (the `apply plugin:` → `plugins {}` migration row, and the
`gradlePlugin { plugins { } }` id-declaration idiom, which
[shape](jvm-audit/exemplar-build-shape.md) §2 found split with no dominant
winner). Owner may override — Q4.

**6. Gradle plugin development: a depth file (two, in fact), not a skill.** The
frame's hypothesis 3 and its skills row both propose `gradle-plugin-dev` as a
skill. Applying `rule-distillation`'s split — rules carry standards, skills carry
procedures — nearly all of the measured content is standards enforced *while
editing a build file*: no `Project` at execution time, every task property
annotated, no Gradle internal APIs, no `afterEvaluate`, a declared minimum-Gradle
floor consistent with the DSL language, `validatePlugins` clean
([cgrad](jvm-topic-map/gradle-canonical.md), [lint](jvm-topic-map/codified-lint-catalogue.md)'s
31 validation-problem IDs, [prac](jvm-topic-map/practitioner-and-conferences.md)).
Those load on `**/*.gradle.kts`, which `gradle-build` already globs. Writing them
as a skill means they fire probabilistically exactly where they should be
constant. **Resolved: `gradle-build/plugin-authoring.md` (GRADLE-PLUG) plus the
TestKit/Portal material inside it; the skill slot goes to `jvm-release` and
`jvm-dependency-triage`, both of which are genuine occasional procedures for
every adopter rather than for one future consumer.**

**7. JUnit 5 is the baseline; JUnit 6 is the stated target with a dated floor.**
[shift](jvm-topic-map/recent-shifts.md) and [failr](jvm-topic-map/failure-language-runtime.md)
both fetched JUnit 6.0.0's release notes (2025-09-30, Java 17 / Kotlin 2.2 floor,
unified Platform/Jupiter/Vintage versioning, JSpecify annotations,
`junit-platform-runner` discontinued) — normative and current, JUnit is at 6.1.3.
[gates](jvm-audit/exemplar-quality-gates.md) measured adoption at **4/32**
(spotless, ktlint, shadow, Exposed which dual-declares 5 and 6) and found
`gradle__gradle@ea17004a31:gradle/dependency-management/test.versions.toml:23`
pinning `junit5ForTests = "5.12.2!!"` — the flagship build tool, measured this
week, is on JUnit 5. **Resolved: rules state a JUnit 5 floor and a JUnit 6 target
with the 2025-09-30 date and the Java-17/Kotlin-2.2 precondition, and never
assume 6.** The one hard row is the `junit-platform-runner` removal, which is a
migration blocker regardless of baseline.

**8. JSpecify is the direction and the rule's recommendation; it is not the
installed base, and the rule must say so.** [cjava](jvm-topic-map/canonical-java.md)
(JSpecify 1.0's own "never make backwards-incompatible changes" guarantee),
[ckt](jvm-topic-map/canonical-kotlin.md) (JSpecify is the only flavour whose
Kotlin default is `strict`, i.e. errors; JSR-305 defaults to `warn`),
[prac](jvm-topic-map/practitioner-and-conferences.md) (Spring Framework 7 /
Boot 4 completed migration November 2025) and
[shift](jvm-topic-map/recent-shifts.md) (Gradle 9 switched *its own API
annotations* from JSR-305 to JSpecify) all converge — four independent normative
or argued sources. [gates](jvm-audit/exemplar-quality-gates.md) measured the
counterweight: JSpecify declared in **9/32**, NullAway's JSpecify-native mode
(`jspecifyMode`, `onlyNullMarked`) in **2/32** (junit-framework and NullAway's own
`jdk-javac-plugin`), against **jsr305 in 13/32** and checker-framework in 8/32 —
four incompatible nullness systems live simultaneously. **Resolved: recommend
JSpecify for new public API surface (MUST for the OCX SDK), and require any rule
row to carry a coexistence/migration note rather than a bare "use JSpecify",
because a bare version contradicts most of the corpus as it stands.**

**9. Error Prone + NullAway is the Java gate of record; Checkstyle is style-only;
SpotBugs is opt-in with `find-sec-bugs`; PMD is out.**
[gates](jvm-audit/exemplar-quality-gates.md) measured: Error Prone **13/32**,
NullAway 4/32, a real wired Checkstyle config 8/32, SpotBugs as a gate 3/32, and
**PMD enforced in 0/32** — `apache__maven@ea4a417bd2:pom.xml:800-810` declares
`maven-pmd-plugin` in `<pluginManagement>` with no `<executions>` bound, and
gradle/gradle *implements* the Gradle PMD plugin without running it on itself.
The strictest exemplars (`junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.java-errorprone-conventions.gradle.kts:52-63`,
`uber__NullAway@519a1bb826:build.gradle:84-113`) both lean on Error Prone +
NullAway rather than PMD. [lint](jvm-topic-map/codified-lint-catalogue.md)'s
counts (PMD 315 rules, only 18 at priority 1; SpotBugs' `SECURITY` category
deliberately thin without `find-sec-bugs`) corroborate. **Resolved: the frame's
tool list is wrong to name PMD as a peer. PMD gets one footnote row
("some legacy Maven repos declare it; enforced nowhere measured"). Checkstyle
stays as the formatting/style gate with a named ruleset choice
(`google_checks.xml` 89 modules vs `sun_checks.xml` 73, and they diverge sharply —
[lint](jvm-topic-map/codified-lint-catalogue.md) §3). SpotBugs earns a row only
paired with `find-sec-bugs`.**

**10. detekt for logic, ktlint for formatting — both, with the overlap named.**
[lint](jvm-topic-map/codified-lint-catalogue.md) settles this from the tools'
own source: detekt 2.0 renamed `:detekt-formatting` to
`:detekt-rules-ktlint-wrapper` ([detekt#8474](https://github.com/detekt/detekt/pull/8474)),
an explicit admission that detekt's formatting rule set *is* a ktlint wrapper,
not an independent implementation. [gates](jvm-audit/exemplar-quality-gates.md)
measured detekt 4/32 and ktlint 6/32 with real overlap (sqldelight, detekt,
spotless, junit-framework run both). **Resolved: detekt for logic rules, ktlint
(directly, or via Spotless's `ktlint()`) for formatting, and an explicit
"enabling detekt's `formatting` rule set alongside standalone ktlint buys
nothing" row.** Spotless is the umbrella that wires both plus
`googleJavaFormat`/`ktfmt` for Java (11/32, the widest formatter adoption in the
corpus).

**11. JaCoCo for Java, Kover for Kotlin — but the real finding is that neither is
a gate.** [gates](jvm-audit/exemplar-quality-gates.md) measured JaCoCo 12/32 and
Kover 4/32, and **only 3/32 repos fail the build on any numeric threshold**
(`assertj__assertj@485502bad2:assertj-parent/pom.xml:114-176` — CLASS 100% /
everything else 80%, bound to `default-check`, the strictest in the corpus and a
*Maven* repo; `junit-team__junit-framework@35c56a8e02` at `minimum = 0.90` on the
aggregate report; `Kotlin__kotlinx.coroutines@f63a04bacb` at Kover
`minBound(85)`). **Resolved: tool choice follows language (JaCoCo mis-reads
Kotlin inline-function and synthetic-accessor bytecode —
[failr](jvm-topic-map/failure-language-runtime.md)), and the load-bearing rule
is not "which tool" but "report-only is not a gate": a `jacocoTestReport` or a
Kover plugin application is not evidence of a floor, and the check must look for
`violationRules`/`jacocoTestCoverageVerification`/`minBound`/`<rules>`.**

**12. Coverage thresholds: enforce on the SDK, do not prescribe for adopters.**
The frame's hypothesis 4 puts linting *and* coverage among the most prominent
topics. [gates](jvm-audit/exemplar-quality-gates.md) holds it for lint and
**contradicts it for coverage**: 3/32 enforce anything. Against that,
[cfg](jvm-audit/config-inventory.md) Axis 3 records `ocx-sdk-python`'s
`fail_under = 100` as an existing, shipped fleet commitment for exactly this
artefact shape. **Resolved as two rules with different severities**: for a
library this program itself authors (the OCX SDK), a hard numeric floor enforced
Linux-only in CI is a pinned project decision carried forward from
`ocx-sdk-python` — MUST, and it does not need to be derivable. For an adopter,
CONSIDER, with the assertj tiered-by-counter and kotlinx.coroutines
per-project-`minBound` configs quoted as the two legible shapes.

**13. Virtual threads vs reactive for the SDK: virtual threads, and the SDK's
concurrency surface is a process boundary, not a request-per-thread server.**
[prac](jvm-topic-map/practitioner-and-conferences.md) records the trend
"strongly toward virtual threads for new blocking-style code since JDK 21 GA"
but warns the correctness half (structured concurrency) is still preview.
[cjava](jvm-topic-map/canonical-java.md) and
[failr](jvm-topic-map/failure-language-runtime.md) both quote JEP 444's
"a new virtual thread should be created for every application task" and
"should never be pooled". **Resolved: virtual threads, no reactive stack, and no
`StructuredTaskScope` in shipped SDK code while it is preview (see conflict 15).**
The concrete shape is `ocx-sdk-python`'s `_process.py` translated: an injectable
process factory, a one-shot `run_command`, a `spawn` with a kill ladder, and
sysexit-to-exception mapping ([cfg](jvm-audit/config-inventory.md) Axis 3) —
which needs `ProcessBuilder` behind a test seam and a bounded fan-out, not a
reactive runtime. Java's lack of a mockable process API makes the seam a design
requirement, not a preference.

**14. Java-first or Kotlin-first for the OCX SDK: framed, not decided — but the
frame's premises need correcting first.** Owner question Q1. Three wave-1 facts
change the shape of the decision and must be on the table before it is made.
(a) [cfg](jvm-audit/config-inventory.md) smell 5: `ocx-sdk-python`'s
zero-runtime-dependency commitment is reachable in Java (`java.net.http` plus a
hand-rolled JSON reader over the CLI's `--format json` output) and is *not*
reachable in idiomatic Kotlin the moment `kotlinx.serialization` or
`kotlinx.coroutines` enters — a Kotlin-first SDK either drops the zero-dep claim
or writes Java-shaped Kotlin. (b) [gates](jvm-audit/exemplar-quality-gates.md)
§5: Kotlin has one converged binary-compatibility mechanism (BCV `.api` dumps,
5/32) while Java scatters across japicmp, Animal Sniffer and bespoke allowlists
with **no single "Java equivalent of BCV"** — the artifact plan must say this
rather than imply parity. (c) [ckt](jvm-topic-map/canonical-kotlin.md): a
Kotlin-first public API needs `explicitApi()`, `@JvmStatic`/`@JvmName`/
`@JvmOverloads`-or-`@IntroducedAt`/`@Throws` on every Java-facing member, and a
blocking wrapper for every `suspend fun`, because `suspend` compiles to a
`Continuation`-parameter method Java cannot call naturally. **Default if
unanswered: Java-first with a Kotlin-friendly API surface** (JSpecify-annotated,
no `Optional` parameters, no varargs-into-generics), because it keeps the
zero-dependency commitment, keeps Kotlin consumers first-class through JSpecify's
`strict` default, and does not require the SDK to solve `suspend`-across-the-
boundary on day one.

**15. Structured concurrency is preview through JDK 27 and must not appear in
shipped code — and the two scouts' preview counts are both right.**
[cjava](jvm-topic-map/canonical-java.md) reports JEP 533 as the **7th** preview
in JDK 27; [failr](jvm-topic-map/failure-language-runtime.md) reports JEP 525 as
the **6th** in JDK 26 with finalisation targeted at JDK 28;
[shift](jvm-topic-map/recent-shifts.md) confirms both and adds that JDK 27 is in
RC with GA fixed for **2026-09-15** — ten days after this map. **Resolved: not a
contradiction; the shipping JDK today is 26 (6th preview, JEP 525) and JDK 27
lands the 7th (JEP 533) next week.** The API changed shape in nearly every
iteration — `fork()` returning `Subtask` not `Future` (JDK 21), constructors
replaced by `open()`/`Joiner` static factories (JEP 505),
`allSuccessfulOrThrow()` returning a list not a stream and `onTimeout()` added
(JEP 525), a third type parameter for the thrown exception type plus
`awaitAll()` removed and `onTimeout()` renamed `timeout()` (JEP 533). Any rule
row naming a concrete `StructuredTaskScope` call **must** carry the JDK number
it was written against, and the SDK rule is: not in shipped code while preview.

**16. Bazel-Java ships from here, is delivered to `bazel-quality`, and the
handover reopens a decision that sibling program closed.**
[cfg](jvm-audit/config-inventory.md) Axis 2.1 is decisive: `bazel-topic-map.md`
lists **twelve finalized `BZL-` depth files with no Java one**, and its
"Explicitly out of scope" table names `rules_java`/`rules_kotlin`/`rules_scala`
by name with "zero fleet consumers". Two rule sets both globbing `BUILD.bazel`
would double-load on every Bazel edit, so shipping a Bazel-Java *rule* here is
out. [pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 4 supplies the
content: 6 genuinely Bazel-carrying repos, the two-flag-pair toolchain model,
`maven_install.json` as a build input, `dagger`'s explicit
build-JDK-17/`-source 8 -target 8` split, and `grpc-java` pinning **nothing**.
**Resolved: this program researches and drafts the file; `bazel-quality`'s
authoring pass copies it in.** Path and family in the artifact-set decision.
The coordination ask is real and is owner question Q6.

**17. Kotlin explicit API mode: default ON for anything this program publishes,
SHOULD for adopters.** [ckt](jvm-topic-map/canonical-kotlin.md) quotes
kotlinlang's own library-author guidance unconditionally — "We recommend using
the explicit API mode… you must add visibility modifiers… define the types for
all your public functions and properties" — which is normative for library
authors. [gates](jvm-audit/exemplar-quality-gates.md) and
[shape](jvm-audit/exemplar-build-shape.md) both measured **5/32**
(dagger, shadow, kotlinx.coroutines via `-Xexplicit-api=strict`, ktor's KMP
modules only, okhttp's `mockwebserver` only) against 15 Kotlin-library repos —
and ktor sets `explicitApi = null` per module
(`ktorio__ktor@f92fad0435:build-logic/src/main/kotlin/ktorbuild.project.internal.gradle.kts:11`).
**Resolved: the gap is between "recommended" and "enabled", not a documentation
disagreement.** A greenfield published library has no reason to be in the
minority; an adopter with an existing surface faces a real migration, so SHOULD.

**18. Configuration cache is "preferred with fallback" in Gradle 9, not on by
default — the frame is wrong.** The frame's era list says "the configuration
cache on by default". [shift](jvm-topic-map/recent-shifts.md) read the 9.0.0
release notes: *preferred* execution mode **with automatic graceful fallback**.
[cgrad](jvm-topic-map/gradle-canonical.md) agrees and adds that Gradle 9.0 made
warning-mode entries always discarded for incompatible tasks (so the old
"ignore and still cache" escape hatch is gone).
[prac](jvm-topic-map/practitioner-and-conferences.md) adds the schedule: the
default-execution-mode target **moved from Gradle 10.0 to 11.0**.
[shape](jvm-audit/exemplar-build-shape.md) measured 11/20 repos setting
`org.gradle.configuration-cache=true` explicitly. **Resolved for
[shift](jvm-topic-map/recent-shifts.md)/[cgrad](jvm-topic-map/gradle-canonical.md):
preferred-with-fallback, default targeted at Gradle 11**, and the check for
"is it on" reads `gradle.properties` first, because
[pub](jvm-audit/exemplar-publishing-ci-bazel.md) measured the CLI flag in only
3/32 CI workflows against the property in 10/32.

**19. Maven 4.0.0 GA is not confirmed; hold at RC.**
[prac](jvm-topic-map/practitioner-and-conferences.md) asserts "GA was cut in
October 2025", sourced to mailing-list posts — argued, second-hand.
[shift](jvm-topic-map/recent-shifts.md) fetched
`maven.apache.org/docs/4.0.0-rc-6/release-notes.html` and found only release
candidates, flagged it Contested, and recommended a direct re-check.
[cmab](jvm-topic-map/maven-ant-bazel-canonical.md) quotes
`whatsnewinmaven4.html`, whose own header says it is "continuously updated until
the 4.0.0 release" — i.e. the page itself implies 4.0.0 had not shipped when
fetched. [failb](jvm-topic-map/failure-build-and-deps.md) cites `mvnup`
shipping "since 4.0.0-rc-4". **Resolved for
[shift](jvm-topic-map/recent-shifts.md) on evidence rank (fetched release notes
beat a summarised mailing list): treat Maven 4 as release-candidate.** Every
Maven-4 row carries "4.0.0-rc-6 as of 2026-09-05" until a wave-2 worker cites the
GA note; the first task of the wave-3 `maven-and-ant` group is to settle it with
a Central query for `org.apache.maven:maven-core:4.0.0`. This confirms frame
correction 1.

**20. Maven Surefire 3.6.0 is a milestone, not GA — and the two scouts read two
different pages.** [shift](jvm-topic-map/recent-shifts.md) read
`whats-new-3-6-0.html` and reports the single-`surefire-junit-platform`-provider
collapse as shipped. [cmab](jvm-topic-map/maven-ant-bazel-canonical.md) read the
core-plugin index and records `maven-surefire-plugin 3.6.0-M1` — "still a
milestone, not GA, as of this survey date". **Resolved: both are right about
different things.** The behaviour change is documented and real; the released
line is at `3.6.0-M1`. Any rule row about the unified provider carries the `-M1`
qualifier, and a build pinning `3.6.0` today is pinning a milestone.

**21. Gradle 9 makes archive tasks reproducible by default — which turns one
exemplar's "harmless" setting into an active opt-out.**
[shift](jvm-topic-map/recent-shifts.md) read the 9.0.0 release notes: archive
tasks are reproducible by default. [pub](jvm-audit/exemplar-publishing-ci-bazel.md)
headline 5 measured `apache__kafka@940c100fab:build.gradle:361-364` setting
`reproducibleFileOrder = false; preserveFileTimestamps = true` and dismissed it
as "just restates Gradle's own defaults, a no-op". **Resolved for
[shift](jvm-topic-map/recent-shifts.md) (release notes are normative):** those
were the pre-9 defaults. Kafka runs Gradle 9.7.1
([shape](jvm-audit/exemplar-build-shape.md) §1 wrapper table), so on its own
current toolchain that block now **disables** reproducibility rather than
restating it. This is the map's sharpest measured surprise and is a named
chase-the-surprise item in wave 2 (M-D-11). It also demotes the "set
`preserveFileTimestamps = false`" advice from a MUST to "verify the Gradle
version first, then check nobody has opted out".

**22. Kotlin 2.2.0's date, and the `-Xjvm-default` flip.**
[shift](jvm-topic-map/recent-shifts.md) dates Kotlin 2.2.0 to "2026-03-27 per the
JetBrains blog naming used by search" and flags it for cross-check.
[ckt](jvm-topic-map/canonical-kotlin.md) dates it to **2025-06-23**, with a
coherent chain (2.1.0 on 2024-11-27, 2.2.0 on 2025-06-23, 2.3.0 in 2025-12,
2.4.0 in 2026-06) that [shift](jvm-topic-map/recent-shifts.md)'s own 2.3/2.4
dates make internally impossible for a 2026-03 2.2.0. **Resolved for
[ckt](jvm-topic-map/canonical-kotlin.md): Kotlin 2.2.0 = 2025-06-23.** Both agree
on the substance that matters: `-Xjvm-default` is deprecated in favour of a
stable `-jvm-default` flag and a `jvmDefault` Gradle DSL property, and **the
default value itself flipped to `ENABLE` in 2.2.0** — a behaviour change, not a
rename, and the row must say so.

Two further corrections that were not disagreements between artifacts but between
an artifact and the frame are folded into **Frame corrections** at the end:
virtual-thread pinning (JEP 491 fixed the `synchronized` case in JDK **24**, and
`jdk.tracePinnedThreads` was *removed* — [failr](jvm-topic-map/failure-language-runtime.md),
[shift](jvm-topic-map/recent-shifts.md) — against
[cjava](jvm-topic-map/canonical-java.md)'s "narrowed but did not eliminate", which
is true only of the three residual native-frame cases), and
`google/error-prone`'s build system ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)
found zero `MODULE.bazel`/`WORKSPACE`/`BUILD` files: it is Maven-built and
Bazel-*consumed*).

## The map

247 rows after dedup, from 423 raw candidates across the four audits and nine
scouts ([frame](jvm-frame.md) correction 13). Sections are lettered by the
depth file that will own them (the artifact-set decision below names the file
for each letter). Merged rows say what they merged. Coverage is against the
sibling lore sets and [cfg](jvm-audit/config-inventory.md)'s inventory — there
is no fleet codebase to measure against.

### A. Era, floors and version currency — 12 rows (routes to JAVA-PLAT, KT-COMP, GRADLE-TOOL, MVN-BUILD)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-A-01 | Which JDK is the floor a published JVM library must still support in 2026 — 17, 21 or 25 — and does the build's toolchain match its declared floor? | java, gradle, maven, sdk | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Spring Boot 4 (2025-11-20) and JUnit 6 both hold at 17 ([shift](jvm-topic-map/recent-shifts.md)); check `java { toolchain { languageVersion } }` vs `options.release` vs the CI `setup-java` matrix | JAVA-PLAT |
| M-A-02 | Does the build separate the toolchain JDK (build-time) from the bytecode target (`--release`), or conflate them? | java, gradle, maven | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `google__guava@5fb424c43a:pom.xml:215-216` still ships Java 8 bytecode and `grpc__grpc-java@fc4314419d` sets `options.release = 8`, both from modern JDKs ([shape](jvm-audit/exemplar-build-shape.md)); check for `sourceCompatibility` without `release` | JAVA-PLAT |
| M-A-03 | Is Java 25 the current LTS, 26 shipped, 27 GA on 2026-09-15 — and does any rule row cite a JEP to the wrong release? | java | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JEPs 483/491/493 shipped in JDK **24**, not 25 ([shift](jvm-topic-map/recent-shifts.md)); every version-specific row must be date-stamped or it rots | JAVA-PLAT |
| M-A-04 | Is Kotlin's floor 2.0 (K2-only) now that 2.4.0 rejects `-language-version 1.9` outright? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `grep -rn 'language-version' build.gradle.kts` and any `freeCompilerArgs`; K1 fallback advice is dead ([shift](jvm-topic-map/recent-shifts.md), [ckt](jvm-topic-map/canonical-kotlin.md)) | KT-COMP |
| M-A-05 | Does the Gradle daemon's JVM (17+ since Gradle 9.0.0) get confused with the toolchain used to compile the project? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `./gradlew -q javaToolchains` lists both; the frame's own artifact plan conflated them ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-TOOL |
| M-A-06 | Which Gradle 9.x minor is current, and does the rule set hard-code a point release it will outlive? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 9.0 (2025-07-31) through 9.7.1 (2026-08-20) in ~13 months ([cgrad](jvm-topic-map/gradle-canonical.md)); a rule pinning "9.4" has a short half-life | GRADLE-TOOL |
| M-A-07 | Is Maven 4 GA, or still release-candidate, and does any artifact assume GA? | maven | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — latest verified is `4.0.0-rc-6` ([shift](jvm-topic-map/recent-shifts.md)); check Central for `org.apache.maven:maven-core:4.0.0` before any Maven-4 claim ships | MVN-BUILD |
| M-A-08 | Does the KGP/Gradle/AGP compatibility envelope hold for the pinned versions (KGP 2.4.0-2.4.10 → Gradle 7.6.3-9.5.0)? | kotlin, gradle | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — a versioned table, mechanically checkable ([ckt](jvm-topic-map/canonical-kotlin.md)); silent build breakage otherwise | KT-COMP |
| M-A-09 | Is Bazel 9.0 LTS (2026-01-20) assumed, with WORKSPACE removed and `--incompatible_autoload_externally` empty by default? | bazel-java | E | covered-elsewhere ([cfg](jvm-audit/config-inventory.md) §2.1 — `bazel-quality/flags-and-versions.md` owns the flag) | P1 — Java-specific residue only: `java_*` symbols now need an explicit `load()` from `rules_java` ([shift](jvm-topic-map/recent-shifts.md)) | BZL-JAVA |
| M-A-10 | Does the rule set distinguish "Develocity the company (renamed 2025-06-30)" from a Gradle Build Tool version requirement? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P3 — naming hygiene only; the tool's name, license and ownership are unchanged ([shift](jvm-topic-map/recent-shifts.md)) | GRADLE-CORE |
| M-A-11 | Which static-analysis tool versions actually parse Java 25 syntax (Checkstyle 14.x, SpotBugs via ASM 9.8 + BCEL 6.11)? | java | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — a lint that cannot parse the source silently under-reports; version floors are per-tool and dependency-chained ([shift](jvm-topic-map/recent-shifts.md)) | JAVA-LINT |
| M-A-12 | Does a PMD ruleset XML still reference a pre-7 rule name renamed by the 2024-03-22 grammar rewrite? | java | C·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — old names deprecated-but-working, so failure is a warning, not an error ([shift](jvm-topic-map/recent-shifts.md)); low value given PMD is enforced 0/32 | JAVA-LINT |

### B. Build structure and convention plugins — 10 rows (`gradle-build/structure-and-conventions.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-B-01 | Should shared build logic live in `buildSrc` or an included `build-logic` build, and what does each cost? | gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — any `buildSrc` change invalidates the whole configuration phase ([cgrad](jvm-topic-map/gradle-canonical.md)); check `grep -c includeBuild settings.gradle*` vs a `buildSrc/` directory | GRADLE-STRUCT |
| M-B-02 | Do Settings plugins need their own minimal `build-logic-settings` included build, and why does folding them into `build-logic` reduce build caching? | gradle, plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Gradle's own named caveat; `gradle__gradle@ea17004a31:settings.gradle.kts` includes `build-logic-settings` separately ([cgrad](jvm-topic-map/gradle-canonical.md), [shape](jvm-audit/exemplar-build-shape.md)) | GRADLE-STRUCT |
| M-B-03 | Are type-safe version-catalog accessors reachable from a precompiled script plugin, or does `build-logic` fall back to string literals? | gradle, plugin-dev | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the most-reacted open issue in `gradle/gradle` (387, [#15383](https://github.com/gradle/gradle/issues/15383)); check any `build-logic/**/*.gradle.kts` for literal GAV strings ([failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-STRUCT |
| M-B-04 | Is convention logic expressed as a convention plugin, or as `allprojects{}`/`subprojects{}` cross-configuration? | gradle | B·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `apache__kafka@940c100fab:build.gradle` is a 4425-line root file configuring every subproject inline, the corpus's starkest cohesion smell ([shape](jvm-audit/exemplar-build-shape.md)); grep `subprojects\s*\{` in a root build file | GRADLE-STRUCT |
| M-B-05 | Do two subprojects share a name, silently causing wrong conflict resolution? | gradle | B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — 137-reaction open bug with no build failure ([#847](https://github.com/gradle/gradle/issues/847), [failb](jvm-topic-map/failure-build-and-deps.md)); `./gradlew projects` then check for duplicate leaf names | GRADLE-STRUCT |
| M-B-06 | Is `rootProject.name` set explicitly, or left to directory-name defaulting? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — 6/20 root settings files leave it defaulted ([shape](jvm-audit/exemplar-build-shape.md)); a named Gradle Best Practice, one-line check | GRADLE-STRUCT |
| M-B-07 | Does a subproject carry its own `gradle.properties` overriding root settings the configuration cache assumes fixed? | gradle | B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — named Gradle anti-pattern; a stealth configuration-cache invalidation source ([lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-STRUCT |
| M-B-08 | Is the module list generated programmatically (directory walk, `includeProject()` helper, custom DSL), and does any tooling assume literal `include()` lines? | gradle | B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — 8 of 20 multi-module repos generate it, including ktor and gradle/gradle ([shape](jvm-audit/exemplar-build-shape.md)); a rule counting `include(` lines is wrong for a third of large builds | GRADLE-STRUCT |
| M-B-09 | Is `enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")` on, and what does it change for cross-project references? | gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P3 — 10/25 adopt it ([shape](jvm-audit/exemplar-build-shape.md)); ergonomic, not correctness | GRADLE-STRUCT |
| M-B-10 | Are source files present in the root project, contrary to Gradle's own structuring guidance? | gradle | B·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — named Best Practice; `test -d src` at the root is the check ([lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-STRUCT |

### C. Gradle dependency declaration and supply chain — 13 rows (`gradle-build/dependencies.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-C-01 | When must a dependency be `api` rather than `implementation`, and how does a reviewer detect a leaked type before a consumer's build breaks? | gradle, sdk | A·B·D | partial ([cfg](jvm-audit/config-inventory.md) — `python-packaging`/`typescript-packaging` have the manifest-rule shape, no JVM content) | P0 — the single highest-blast-radius declaration in a published library; the failure surfaces at the *consumer's* compile task, so the check is `./gradlew :consumer:compileJava` or DAGP `projectHealth` ([cgrad](jvm-topic-map/gradle-canonical.md), [failb](jvm-topic-map/failure-build-and-deps.md)). Merges 4 rows | GRADLE-DEP |
| M-C-02 | Is `compileOnly` used for something needed by reflection or generated bytecode at runtime? | gradle, java | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `NoClassDefFoundError` in production, invisible in unit tests that share the compile classpath ([failb](jvm-topic-map/failure-build-and-deps.md)); check the runtime classpath, not the test run | GRADLE-DEP |
| M-C-03 | Are annotation processors declared via the `annotationProcessor` configuration rather than left on the compile classpath? | gradle, java | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the two-configuration pattern (`compileOnly` + `annotationProcessor`) is how Dagger/MapStruct/Lombok are declared today; `-proc:none` is the escape hatch ([failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-DEP |
| M-C-04 | Is a version catalog used to centralise coordinates, and is it at a path a glob can find? | gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — 15/25 use `gradle/libs.versions.toml`, but `apollographql__apollo-kotlin@c145295b72:gradle/libraries.toml` proves the filename is not guaranteed and gradle/gradle wires named catalogs programmatically ([shape](jvm-audit/exemplar-build-shape.md), [pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-DEP |
| M-C-05 | Does a version catalog pin *resolved* versions, or only *declared* ones? | gradle, sdk | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Gradle's own docs say declared only; a catalog without locking or platform alignment does not enforce a resolved version ([prac](jvm-topic-map/practitioner-and-conferences.md)) | GRADLE-DEP |
| M-C-06 | Are version-catalog entries named to Gradle's own convention (single catalog, `-plugin` suffix for plugin coordinates used as dependencies)? | gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — a named Gradle blog convention; catalog sizes run 4-92 versions across the corpus ([shape](jvm-audit/exemplar-build-shape.md), [prac](jvm-topic-map/practitioner-and-conferences.md)) | GRADLE-DEP |
| M-C-07 | Is `enforcedPlatform()` restricted to applications and `platform()` used for library BOM import? | gradle, sdk | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `spring-projects__spring-boot@93b23c40c2` is the corpus's only user (13 hits) and it is a library, the exact case Gradle's docs warn against ([shape](jvm-audit/exemplar-build-shape.md), [cgrad](jvm-topic-map/gradle-canonical.md)); grep `enforcedPlatform\(` | GRADLE-DEP |
| M-C-08 | Are rich versions (`strictly`/`require`/`prefer`/`reject`, `!!`) used correctly, and is `strictly` kept out of a library's own declarations? | gradle, sdk | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — `strictly` propagates a hard constraint to every consumer and is lossy through the published POM ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-DEP |
| M-C-09 | Is dependency locking enabled, and does the lockfile shape match the Gradle version (`gradle.lockfile` / `buildscript-gradle.lockfile`)? | gradle, sdk | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — **0/32 exemplars lock** ([shape](jvm-audit/exemplar-build-shape.md), [pub](jvm-audit/exemplar-publishing-ci-bazel.md)); a new commitment the rules impose, not a convention they codify, and incompatible with `-SNAPSHOT` ([failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-DEP |
| M-C-10 | Is `gradle/verification-metadata.xml` present, generated with `--write-verification-metadata sha256,pgp`, and was the bootstrapped file diff-reviewed rather than trusted? | gradle, sdk | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 1/32 (gradle/gradle only, 1030 lines, `verify-signatures=true`, 258 trusted keys); Gradle's own docs concede bootstrapping "trusts whatever is currently in your repositories" ([shape](jvm-audit/exemplar-build-shape.md), [cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-DEP |
| M-C-11 | Are repositories declared centrally in `settings.gradle.kts` (`dependencyResolutionManagement`, `repositoriesMode`), and is repository content filtering used against dependency confusion? | gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — only 4/25 set `FAIL_ON_PROJECT_REPOS` ([shape](jvm-audit/exemplar-build-shape.md)); content filtering is the documented control for internal-coordinate confusion ([lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-DEP |
| M-C-12 | Does any dependency use a version range, `LATEST`, `RELEASE`, or a `-SNAPSHOT` in a release build? | gradle, maven | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Maven has `banDynamicVersions`/`requireReleaseDeps`; **Gradle has no built-in equivalent** and needs a custom check ([lint](jvm-topic-map/codified-lint-catalogue.md), [failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-DEP |
| M-C-13 | Does `dependency-analysis-gradle-plugin`'s `projectHealth` gate the build, and is `fixDependencies --upgrade` (safe mode) distinguished from unrestricted auto-fix? | gradle, sdk | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — unrestricted auto-fix can remove a dependency a *consumer* needs while the library still compiles ([lint](jvm-topic-map/codified-lint-catalogue.md), [prac](jvm-topic-map/practitioner-and-conferences.md)) | GRADLE-DEP |

### D. Configuration cache, task correctness, reproducible archives — 12 rows (`gradle-build/caching-and-correctness.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-D-01 | Does any task or plugin touch a `Project` object during execution (including `Task.getProject()`)? | gradle, plugin-dev | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — hard configuration-cache violation and an independently-stated Gradle Best Practice; `./gradlew --configuration-cache` reports it, and the fix pattern is `@get:Inject abstract val fs: FileSystemOperations` ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-CACHE |
| M-D-02 | Does build logic enumerate `System.getenv()`/`System.getProperties()` instead of naming a key, poisoning the cache-input set? | gradle, plugin-dev | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — turns every environment variable into a cache-invalidating input; `providers.environmentVariablesPrefixedBy()` is the fix ([cgrad](jvm-topic-map/gradle-canonical.md), [failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-CACHE |
| M-D-03 | Does build logic read a file, run a process, or resolve a `Configuration` at configuration time? | gradle, plugin-dev | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `providers.fileContents(...)`, `providers.exec()`/`ValueSource` are the documented replacements; [#2298](https://github.com/gradle/gradle/issues/2298) ("forbid resolution at configuration time") is still open, so this is still legal ([cgrad](jvm-topic-map/gradle-canonical.md), [failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-CACHE |
| M-D-04 | Is `afterEvaluate {}` used where `plugins.withId()`, a lazy `Provider`, or an explicit opt-in function would do? | gradle, plugin-dev | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the single most-cited Gradle plugin-authoring mistake; using it in a plugin forces every consumer into it too ([prac](jvm-topic-map/practitioner-and-conferences.md)); grep `afterEvaluate` | GRADLE-CACHE |
| M-D-05 | Does every custom task property carry an incremental-build annotation, and does `validatePlugins` run explicitly rather than warning at `jar` time? | gradle, plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `java-gradle-plugin` only *warns* by default; `./gradlew validatePlugins` is the gate, and there are 31 named problem IDs ([cgrad](jvm-topic-map/gradle-canonical.md), [lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-CACHE |
| M-D-06 | Is a JVM classpath input annotated `@Classpath`/`@CompileClasspath` rather than plain `@InputFiles`? | gradle, plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — `@CompileClasspath` enables ABI-level compile avoidance; `@InputFiles` busts the cache on irrelevant jar-internal timestamps ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-CACHE |
| M-D-07 | Is `@PathSensitive` set per input kind (`NONE` for files, `RELATIVE` for directories)? | gradle, plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — a top cause of cross-machine build-cache misses; named in Gradle's own Best Practices with a worked example ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-CACHE |
| M-D-08 | Is `dependsOn` used where input/output wiring, `mustRunAfter` or `finalizedBy` expresses the real relationship? | gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — named Best Practice ("Avoid DependsOn"); wrong ordering primitives cause stale-input and cache-correctness bugs ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-CACHE |
| M-D-09 | Are `@CacheableTask`/`@DisableCachingByDefault` used instead of imperative `outputs.cacheIf(Spec)`? | gradle, plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — declarative caching intent is the documented preference ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-CACHE |
| M-D-10 | Is Isolated Projects worth enabling yet, and what is the diagnostics-first rollout order? | gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — **incubating only since Gradle 9.7.0 (2026-08-06)**, and the property is `org.gradle.isolated-projects`, never `org.gradle.unsafe.isolated-projects` (5/32 vs **0/32**) ([shape](jvm-audit/exemplar-build-shape.md), [cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-CACHE |
| M-D-11 | On Gradle 9, does an explicit `preserveFileTimestamps = true` / `reproducibleFileOrder = false` block now *opt out* of reproducibility that is on by default? | gradle | A·B·D·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — **chase the surprise**: Gradle 9 makes archive tasks reproducible by default ([shift](jvm-topic-map/recent-shifts.md)), and `apache__kafka@940c100fab:build.gradle:361-364` sets exactly that pair while running Gradle 9.7.1 ([shape](jvm-audit/exemplar-build-shape.md)); grep both properties and read the Gradle version before judging | GRADLE-CACHE |
| M-D-12 | Does `withXml()` on `GenerateMavenPom` reintroduce non-deterministic element ordering into an otherwise-reproducible POM? | gradle, sdk | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — a named, specific reproducibility footgun ([lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-CACHE |

### E. Toolchains, compilation and the wrapper — 8 rows (`gradle-build/toolchains-and-compilation.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-E-01 | Is a Java toolchain pinned (`languageVersion`) rather than inheriting ambient `JAVA_HOME`, and is the Foojay resolver applied for auto-provisioning? | gradle, java | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — without a resolver Gradle can auto-*detect* but not auto-*download*; `./gradlew -q javaToolchains` is the check ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-TOOL |
| M-E-02 | Is toolchain auto-provisioning deliberately disabled in offline/locked-down CI, or does it fail unexpectedly behind a proxy? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — `org.gradle.java.installations.auto-download=false`; Wharton argues toolchains trade an explicit JDK requirement for opaque environment-dependent resolution ([cgrad](jvm-topic-map/gradle-canonical.md), [prac](jvm-topic-map/practitioner-and-conferences.md)) — contested, present both sides | GRADLE-TOOL |
| M-E-03 | Does `gradle-wrapper.properties` carry `distributionSha256Sum`, and does CI validate the wrapper jar's checksum? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — **only 12/21 wrappers set the checksum**, and `gradle/actions/wrapper-validation` as a standalone action is used by exactly 1/32 ([shape](jvm-audit/exemplar-build-shape.md), [pub](jvm-audit/exemplar-publishing-ci-bazel.md)); the wrapper jar runs before any sandboxing ([failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-TOOL |
| M-E-04 | Does the build pin `options.encoding`/`-Dfile.encoding=UTF-8` for the Gradle daemon, rather than trusting JEP 400? | gradle, java | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JEP 400 (JDK 18) does not cover Gradle's own daemon launch, which predates toolchain selection; 13/32 set `-Dfile.encoding` ([failb](jvm-topic-map/failure-build-and-deps.md), [gates](jvm-audit/exemplar-quality-gates.md)); grep `org.gradle.jvmargs` | GRADLE-TOOL |
| M-E-05 | Which `gradle.properties` flags does a modern build actually set, and which are cargo-culted? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — measured: `jvmargs` 20/20, `caching` 19/20, `parallel` 17/20, `configuration-cache` 11/20, `isolated-projects` 5/20, `workers.max`/`vfs.*` **0/20** ([shape](jvm-audit/exemplar-build-shape.md)) | GRADLE-TOOL |
| M-E-06 | Does the build use the `-bin` Gradle distribution rather than `-all`? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P3 — named Best Practice; 20/21 already do, testcontainers-java is the lone `-all` ([shape](jvm-audit/exemplar-build-shape.md), [lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-TOOL |
| M-E-07 | Does the build still use `compile`/`runtime`/`testCompile` configurations or `apply plugin:` rather than the `plugins {}` block? | gradle | F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — deprecated configurations are **0/32 for real** once gradle/gradle's custom `runtime` configuration false positive is excluded ([shape](jvm-audit/exemplar-build-shape.md)); `apply plugin:` survives in example/test modules; a plain grep over-counts | GRADLE-TOOL |
| M-E-08 | Does the "classes instead of jar for compilation" optimisation get applied on Windows for a large multi-project build? | gradle | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P3 — Gradle's own docs flag a significant Windows performance drop for this specific case ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-TOOL |

### F. Gradle plugin authoring, testing and publishing — 12 rows (`gradle-build/plugin-authoring.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-F-01 | Does a plugin's declared minimum Gradle version match its DSL language (Kotlin-DSL plugins built on Gradle 9.x require consumer Gradle ≥ 8.11; Groovy-DSL ≥ 7.0)? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — a plugin that violates this fails to *load* on a still-supported consumer version, with no useful error ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-PLUG |
| M-F-02 | Does the plugin's functional-test setup avoid `GradleRunner.withPluginClasspath()` when it uses `compileOnly` on another plugin's API? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the recommended API-dependency pattern breaks the recommended TestKit shortcut with a misleading `ClassNotFoundException`; fix is a local Maven repo ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-PLUG |
| M-F-03 | Is the plugin's cross-Gradle-version compatibility actually tested with `GradleRunner.withGradleVersion(...)`, and does the matrix include 9.7+ alongside the declared floor? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `gradle__actions@a27deee331:.github/workflows/integ-test-provision-gradle-versions.yml` matrixes 6.9 → `release-candidate`; `detekt__detekt@45672efb8b:build.gradle.kts:79-88` runs a parallel `…MinSupportedGradle` task ([gates](jvm-audit/exemplar-quality-gates.md)) | GRADLE-PLUG |
| M-F-04 | Does the plugin declare and test configuration-cache compatibility, and separately Isolated-Projects compatibility? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the two are distinct gates and IP compatibility lags CC compatibility ecosystem-wide; TestKit + `--configuration-cache` is the check ([failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-PLUG |
| M-F-05 | Does the plugin reference a Gradle internal API (any `internal` package segment, or an `*Internal`/`*Impl` type)? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Gradle states these break "during any new Gradle release, even during minor releases"; grep the import list ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-PLUG |
| M-F-06 | Does a convention plugin assume another plugin is already applied, rather than using `pluginManager.withPlugin`? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — named Gradle anti-pattern ("Don't Assume your Plugin is Applied after Another"); a classic flaky-build cause ([lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-PLUG |
| M-F-07 | Which `gradlePlugin { plugins { } }` id-declaration idiom does the plugin use, and does the rule's example match either? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — two incompatible idioms coexist with no winner across 13 plugin-shipping repos (`create("id"){}` map-key vs explicit `id = "…"`) ([shape](jvm-audit/exemplar-build-shape.md)) | GRADLE-PLUG |
| M-F-08 | Is `validatePlugins` presence used as a signal that a repo publishes a plugin? | plugin-dev | B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — it is not: 10/32 files run `validatePlugins` because `java-gradle-plugin` registers it for internal convention-plugin modules; the routing condition must be `com.gradle.plugin-publish` presence ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-PLUG |
| M-F-09 | Is the `gradlePlugin{}` metadata block complete (`website`, `vcsUrl`, per-plugin `id`/`displayName`/`description`/`tags`) before a Portal publish? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — the three fields travel together in detekt/spotless/shadow; spring-boot omits `tags` ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)); Portal approval is manual and can take days ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-PLUG |
| M-F-10 | Does `com.gradle.plugin-publish` 2.0.0's Gradle 7.4+ floor and its Compatibility Plugin (stable only since March 2026) change what the plugin must declare? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — very recent stabilisation; `./gradlew publishPlugins --validate-only` validates without uploading ([prac](jvm-topic-map/practitioner-and-conferences.md), [cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-PLUG |
| M-F-11 | Does a plugin's own API surface still target JSR-305 nullability, breaking under Gradle 9's JSpecify-annotated API under Kotlin 2.2/K2? | plugin-dev, kotlin | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — JSpecify is `strict` (errors) by default in Kotlin; JSR-305 is `warn` ([shift](jvm-topic-map/recent-shifts.md), [ckt](jvm-topic-map/canonical-kotlin.md)) | GRADLE-PLUG |
| M-F-12 | Is a plugin's extensibility seam still eager `Property` initialisation rather than lazy `Provider` chains, ahead of Gradle 10's Provider API migration? | plugin-dev | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Gradle 10 (targeted 2026) lands the deferred Provider API migration and removes parent-project implicit `findProperty()` resolution deprecated since 9.6.0 ([shift](jvm-topic-map/recent-shifts.md)) | GRADLE-PLUG |

### G. Distribution shape: shading, nesting, images, containers — 12 rows (`gradle-build/distribution.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-G-01 | Is the artifact a library, an application, a CLI, or a Gradle plugin — and does the distribution shape follow from that, rather than from "we need a jar that runs"? | gradle, sdk | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — **zero counterexamples in 32 repos**: no consumable library shades ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)); the decision tree is the depth file's spine (conflict 1) | GRADLE-DIST |
| M-G-02 | Does a shaded jar merge `META-INF/services/*` (`mergeServiceFiles()` / `ServicesResourceTransformer`)? | gradle, maven | A·B·C·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the default duplicate strategy silently drops ServiceLoader providers (JDBC drivers, Jackson modules) with no build failure; 9/32 repos call it ([failb](jvm-topic-map/failure-build-and-deps.md), [pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-DIST |
| M-G-03 | Does the shaded jar exclude `META-INF/*.SF`, `*.DSA`, `*.RSA`, `*.EC` from signed dependencies? | gradle, maven | A·B·C·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `SecurityException: Invalid signature file digest for Manifest main attributes` at runtime; re-signing is not a fix because the content changed ([failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-DIST |
| M-G-04 | Are packages relocated for any shaded dependency at risk of colliding with a consumer's own copy? | gradle, maven | C·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — `google__error-prone@c1f99ad5d3` relocates specifically because it loads into `javac`; 6/32 use `relocate(` ([pub](jvm-audit/exemplar-publishing-ci-bazel.md), [cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | GRADLE-DIST |
| M-G-05 | Does shading a multi-release jar leak a `module-info.class` from `META-INF/versions/<N>/`, or create a split package across two shaded libraries? | gradle, java | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Shadow now excludes MRJAR `module-info.class` by default ([shadow#729](https://github.com/GradleUp/shadow/issues/729)), but split packages break JPMS regardless and no transformer fixes them ([failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-DIST |
| M-G-06 | Does `minimize()` strip classes reached only by reflection, ServiceLoader or SPI? | gradle | D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — a static-usage heuristic that cannot see dynamic use ([failb](jvm-topic-map/failure-build-and-deps.md)); confirm current Shadow behaviour before writing the row | GRADLE-DIST |
| M-G-07 | Is the Shadow plugin applied under `com.gradleup.shadow`, and does its version match the project's Gradle/Java floor? | gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — measured: `com.gradleup.shadow` 12/32, `com.github.johnrengelman.shadow` 1/32 (dagger only); Shadow 9.3.0+ needs Gradle ≥ 9.0 and Java ≥ 17 ([pub](jvm-audit/exemplar-publishing-ci-bazel.md), [cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-DIST |
| M-G-08 | Is Spring Boot's nested-jar layout (`BOOT-INF/classes` + `BOOT-INF/lib/*.jar`) the right answer instead of shading, and what does the nested classloader cost? | gradle, java | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — no merge, no class-identity change, so none of M-G-02..05 apply; `java -Djarmode=tools -jar app.jar extract` erases the startup cost ([failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-DIST |
| M-G-09 | Does a Spring Boot layered jar preserve the documented layer order (`dependencies → spring-boot-loader → snapshot-dependencies → application`)? | gradle | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — reordering defeats the Docker layer-cache reuse the feature exists for ([cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-DIST |
| M-G-10 | Does `jlink` fail because a dependency is an automatic module, and is the fix to exclude it or to find a modularised replacement? | java, sdk | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — documented, common, non-obvious fix; JEP 493 (JDK 24) also removed the JMOD-on-disk requirement ([failb](jvm-topic-map/failure-build-and-deps.md), [shift](jvm-topic-map/recent-shifts.md)) | GRADLE-DIST |
| M-G-11 | Does `jpackage`'s per-OS signing (macOS notarization/entitlements) fail loudly or silently in CI? | java, sdk | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — real but platform-narrow; 0/32 exemplars use `jpackage` ([failb](jvm-topic-map/failure-build-and-deps.md)) | GRADLE-DIST |
| M-G-12 | Should a container image come from Jib, Spring Boot layered repackaging, or a hand-rolled Dockerfile over a fat jar? | gradle, sdk | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — Jib is 1/32 (grpc-java) and Dockerfiles cluster in test fixtures (testcontainers-java 62) ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)); real trade-offs, thin corpus evidence | GRADLE-DIST |

### H. Gradle publishing and consumability — 10 rows (`gradle-build/publishing.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-H-01 | Which publishing path does a Gradle library use — raw `maven-publish`, vanniktech, nmcp, nexus-publish, or JReleaser — and is the choice deliberate? | gradle, sdk | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — measured: `maven-publish`/`MavenPublication` 18/32 but a higher-level plugin only 11/32; the rest hand-roll `pom {}` blocks ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-PUB |
| M-H-02 | What does a Maven consumer actually see when a Gradle module publishes extra Gradle Module Metadata variants? | gradle, sdk, maven | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — nothing: Maven has no GMM concept, so a `shadowJar` publication or a feature variant is invisible and must be mapped as a classified artifact ([failb](jvm-topic-map/failure-build-and-deps.md), [cgrad](jvm-topic-map/gradle-canonical.md)) | GRADLE-PUB |
| M-H-03 | Is the published POM's metadata complete (`name`, `description`, `url`, `licenses`, `developers`, `scm`)? | gradle, maven, sdk | A·B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Central rejects the upload wholesale if any is missing; measured, licenses/developers/scm travel together in 15-17/32 while `url` lags at 8/32 ([pub](jvm-audit/exemplar-publishing-ci-bazel.md), [lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-PUB |
| M-H-04 | Where does the published version number come from — a literal in `gradle.properties`, a tag, or a plugin? | gradle, sdk | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — **0/32 use a git-tag-driven version plugin** (`axion-release`, `nebula-release`, `reckon`, `gradle-git-version` all zero); 14/32 use a literal ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) — this contradicts the "modern Gradle uses semver plugins" assumption | GRADLE-PUB |
| M-H-05 | Does the release job fail when the git tag and the declared version disagree? | gradle, maven, sdk | all | partial ([cfg](jvm-audit/config-inventory.md) Axis 3 — `ocx-sdk-python`'s `release.yml` does exactly this) | P0 — a direct carry-over from the fleet's Python SDK; the check is one workflow step | GRADLE-PUB |
| M-H-06 | Are signing keys supplied in-memory (`useInMemoryPgpKeys`) or via `useGpgCmd`, and is either safe in CI? | gradle, sdk | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — measured 4/32 in-memory, 2/32 gpg-cmd, signing plugin 6/32 ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-PUB |
| M-H-07 | Does the build publish a `java-platform` BOM, and how does that differ from Maven's `bom` packaging and Bazel's `maven.install(boms=...)`? | gradle, maven, sdk, bazel-java | A·B·C·E | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 7/32 publish a `java-platform`; the three-build-system equivalence table is a named deliverable ([pub](jvm-audit/exemplar-publishing-ci-bazel.md), [cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | GRADLE-PUB |
| M-H-08 | Does the library publish its own version catalog (the `version-catalog` plugin)? | gradle | A | uncovered ([cfg](jvm-audit/config-inventory.md)) | P3 — 1/32 (ktor); real but not load-bearing, a MAY-level mention ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-PUB |
| M-H-09 | Are sources and javadoc jars produced for **every** published artifact, not just the main one? | gradle, maven, sdk | A·B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — a hard Central requirement enforced at upload, i.e. late in the release ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md), [lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-PUB |
| M-H-10 | Does the release pipeline understand that Maven Central is immutable — no re-publish, no patch, version bumps only? | gradle, maven, sdk | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — "you will not be able to remove/update/modify your components" is an absolute the runbook must design around ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | GRADLE-PUB |

### I. Gradle CI and build observability — 7 rows (`gradle-build/ci.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-I-01 | Does CI use `gradle/actions/setup-gradle` (which validates the wrapper by default), and is caching keyed correctly? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 15/32 use `setup-gradle`; 1/32 uses standalone wrapper validation ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-CI |
| M-I-02 | Does CI re-assert `--configuration-cache`/`--build-cache`, or inherit from `gradle.properties`? | gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — measured: the property in 10/32 and 17/32, the CLI flags in only 3/32 and 7/32; "check `gradle.properties` first" is the reading heuristic ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-CI |
| M-I-03 | Are build scans published, and is publishing gated so a fork PR cannot leak data? | gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — `apache__kafka@940c100fab:settings.gradle:39-45` is the corpus's one exemplar-grade template: `uploadInBackground = !isGithubActions`, `publishing.onlyIf { it.authenticated }`, plus IP obfuscation ([gates](jvm-audit/exemplar-quality-gates.md)) | GRADLE-CI |
| M-I-04 | Are GitHub Actions pinned by SHA and do workflows declare least-privilege `permissions:`? | gradle, maven, sdk | all | covered-elsewhere for the generic case; uncovered for JVM ([cfg](jvm-audit/config-inventory.md)) | P1 — 523 SHA-pinned vs 235 tag-pinned references, mixed within single repos (`apache__kafka` mixes 9 and 49); the 30/32 "has a permissions block" number is a weak signal that needs a root-level read ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-CI |
| M-I-05 | Is there a JDK-version matrix, and does the coverage/lint gate run on one leg only? | gradle, maven | all | partial ([cfg](jvm-audit/config-inventory.md) Axis 3 — `ocx-sdk-python` gates coverage Linux-only for a stated reason) | P1 — temurin 13/32, zulu 10/32, oracle **0/32**, graalvm 4/32 ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | GRADLE-CI |
| M-I-06 | Does a CVE/vulnerability scanner gate the build, and does the build emit an SBOM (CycloneDX/SPDX) for it to consume? | gradle, maven, sdk | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Gradle has no built-in answer ([#8400](https://github.com/gradle/gradle/issues/8400) still open); 2/32 emit a CycloneDX SBOM, **0/32** run OWASP dependency-check or Snyk ([pub](jvm-audit/exemplar-publishing-ci-bazel.md), [lint](jvm-topic-map/codified-lint-catalogue.md)) | GRADLE-CI |
| M-I-07 | Is Dependabot or Renovate configured, and does tooling assume one of them? | gradle, maven | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — a clean either/or: 13/32 each, **zero overlap**, 6/32 neither ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)); a triage skill must detect, not assume | GRADLE-CI |

### J. Maven and Ant — 16 rows (`maven-build/dependencies.md`, `lifecycle-and-plugins.md`, `publishing.md`, `ant-legacy.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-J-01 | When does Maven's "nearest definition wins" mediation pick a version a reviewer would not expect, and how is the right one forced? | maven | C·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — depth beats version number, ties break on declaration order; `mvn dependency:tree -Dverbose` is the check ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | MVN-DEP |
| M-J-02 | Is `dependencyManagement` actually overriding mediation, or was a coincidentally-matching version added? | maven | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `dependencyManagement` (own POM, then parent) always beats tree-depth mediation; conflating the two misdiagnoses every fix ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | MVN-DEP |
| M-J-03 | Does the build enforce `dependencyConvergence` / `requireUpperBoundDeps` / `banDynamicVersions` / `requirePluginVersions`, or is version drift invisible until runtime? | maven | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — **Enforcer ships zero rules active**; measured, only assertj enables `dependencyConvergence` and **0/32 enable `banDuplicatePomDependencyVersions`** ([shape](jvm-audit/exemplar-build-shape.md), [lint](jvm-topic-map/codified-lint-catalogue.md)) | MVN-DEP |
| M-J-04 | Does the POM set `<systemPath>` without `scope=system`? | maven | C·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — the reference itself says the build fails otherwise; a one-line grep ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | MVN-DEP |
| M-J-05 | Is the same plugin declared twice across `<build>` and a profile's `<build>` — a Maven 3 warning that becomes a Maven 4 hard failure? | maven | C·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — silent-until-upgrade breakage, stated verbatim in the POM reference ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | MVN-BUILD |
| M-J-06 | Does `maven-compiler-plugin` use `release`, or the deprecated `source`/`target` pair — and does it know the default is **Java 8 regardless of the running JDK**? | maven, java | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the plugin's own docs call this out; `google__guava@5fb424c43a:pom.xml` hard-codes `1.8` in three separate places ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md), [shape](jvm-audit/exemplar-build-shape.md)) | MVN-BUILD |
| M-J-07 | Are annotation processors pinned via `annotationProcessorPaths` rather than leaking through the compile classpath? | maven, java | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — classpath-order-dependent, nondeterministic processing otherwise ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | MVN-BUILD |
| M-J-08 | Does the test suite actually run under the JUnit Platform provider, or an old JUnit-4-only Surefire provider that silently skips Jupiter tests? | maven, java | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — classic "tests silently do not run"; Surefire **3.6.0-M1** collapsed to one `surefire-junit-platform` provider and dropped JUnit 4 < 4.12 entirely ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md), [shift](jvm-topic-map/recent-shifts.md)) | MVN-BUILD |
| M-J-09 | Does Surefire on JDK 17+ need `--add-opens` in `argLine`, and does adding JaCoCo's agent clobber it? | maven, java | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — `FasterXML__jackson-databind@a906e1782b:pom.xml:44` shows the pattern; [apache/maven#11605](https://github.com/apache/maven/pull/11605) fixes exactly this propagation bug ([failb](jvm-topic-map/failure-build-and-deps.md)) | MVN-BUILD |
| M-J-10 | Does CI use `mvn verify` rather than `mvn clean install`, and does anything rely on `install`'s `~/.m2` side effect? | maven | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Maven's own lifecycle guide warns against invoking hyphenated intermediate phases; Maven 4 makes `deployAtEnd=true` the default and adds a concurrent builder ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | MVN-BUILD |
| M-J-11 | Is `project.build.outputTimestamp` set (ISO-8601 UTC), or is the build relying on pre-`4.0.0-beta-5` non-determinism? | maven | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — measured 3/32 set it; `mvn artifact:check-buildplan` and `mvn clean verify artifact:compare` are the checks ([pub](jvm-audit/exemplar-publishing-ci-bazel.md), [cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | MVN-BUILD |
| M-J-12 | Does the release path use `central-publishing-maven-plugin` (≥ 0.7.0 if SNAPSHOTs are needed), and has the namespace been verified in the Central Portal? | maven, sdk | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `nexus-staging-maven-plugin` is **0/32** and OSSRH died 2025-06-30; namespace verification is a mandatory precondition of any upload ([pub](jvm-audit/exemplar-publishing-ci-bazel.md), [shift](jvm-topic-map/recent-shifts.md)) | MVN-PUB |
| M-J-13 | Should the SDK's BOM use Maven 4's dedicated `bom` packaging or the classic `pom`-with-import-scope pattern? | maven, sdk | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — the two are not interchangeable across Maven 3/4 consumers, and Maven 4 is still RC (M-A-07) ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | MVN-PUB |
| M-J-14 | Does `.mvn/wrapper/maven-wrapper.properties` set `wrapperSha256Sum` and `distributionSha256Sum`? | maven | C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — the same pre-toolchain supply-chain risk as the Gradle wrapper; `.mvn/extensions.xml` appears in **0/32** ([shape](jvm-audit/exemplar-build-shape.md), [cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | MVN-PUB |
| M-J-15 | Does an Ant `build.xml` leave `includeantruntime` unset on `<javac>`, making compilation environment-sensitive? | ant | F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Ant's own manual says "it is usually best to set this to false"; a one-attribute grep, and the corpus's only real Ant build is `apache__ant@8c96cd6869` itself ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md), [shape](jvm-audit/exemplar-build-shape.md)) | MVN-ANT |
| M-J-16 | Does an incremental Ant→Gradle migration via `ant.importBuild()` know that it **permanently disables the configuration cache**? | ant, gradle | F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — migration-blocking, stated verbatim in Gradle's Ant guide; and `ant.importBuild` has **0 real usages** in the corpus, appearing only in gradle/gradle's own docs snippets ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md), [shape](jvm-audit/exemplar-build-shape.md)) | MVN-ANT |

### K. Java public API and its evolution — 9 rows (`java-quality/api-and-evolution.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-K-01 | Does a public method-signature change (added overload, widened parameter, narrowed return) break binary compatibility for already-compiled callers? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JLS ch.13 is the normative source; the check is a japicmp/revapi/Animal-Sniffer gate in CI, and **there is no single "Java equivalent of BCV"** ([cjava](jvm-topic-map/canonical-java.md), [gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-API |
| M-K-02 | Does a `@Deprecated` element carry `forRemoval` and `since`, and does the Javadoc `@deprecated` tag accompany the annotation? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JEP 277 states both "should be present or both absent" and that `forRemoval=true` needs a definite removal plan; `-Xlint:deprecation,removal` is the check ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-API |
| M-K-03 | Is a class designed for extension (documented, no overridable calls from constructors) or sealed/final by default? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Item 19 plus Oracle `OBJECT-4`; `-Xlint:this-escape` (JDK 21+) catches the constructor half mechanically ([cjava](jvm-topic-map/canonical-java.md), [lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-API |
| M-K-04 | Does a public method return `null` for "no result" instead of an empty collection or an `Optional`? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Item 54; NullAway and SonarJava both flag it once nullness annotations are in place ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-API |
| M-K-05 | Is `Optional` used as a field, a constructor parameter, or a method parameter? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Goetz's stated design intent is return-type-only; still one of the most commonly violated rules per 2024-2025 retrospectives ([prac](jvm-topic-map/practitioner-and-conferences.md), [failr](jvm-topic-map/failure-language-runtime.md)); greppable signature check | JAVA-API |
| M-K-06 | Is a public API's package or module documenting its own compatibility policy (semver, `@since`, deprecation timeline)? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — a pinned project decision rather than a derivable rule; belongs in the index so it is never re-litigated ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-API |
| M-K-07 | Is overloading used in a way that is ambiguous at the call site, where differently-named methods would be unambiguous? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — Item 52; a reading heuristic, no mechanical check ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-API |
| M-K-08 | Are generics and varargs combined safely (`@SafeVarargs` where warranted), avoiding heap pollution? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — Item 32; `-Xlint:unchecked` surfaces it ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-API |
| M-K-09 | Does a public method declare a checked exception it never recoverably throws? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — Item 71; forces every caller into ceremony for nothing ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-API |

### L. Java data modelling and pattern matching — 8 rows (`java-quality/data-and-patterns.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-L-01 | Is a closed set of alternatives modelled as a tagged class or enum-with-switch, or as `sealed` + records + an exhaustive pattern-matching `switch`? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the single biggest 2018→2026 language shift in the corpus; the compiler proves exhaustiveness from the `permits` clause, so the check is "does the switch have a `default` that would silently absorb a new case" ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-DATA |
| M-L-02 | Does a record accessor expose a mutable array or collection verbatim, defeating the record's apparent immutability? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the most common "I used a record but it is not immutable" bug; SpotBugs `EI_EXPOSE_REP` and Oracle `MUTABLE-2`/`-3`/`-12` both catch it ([cjava](jvm-topic-map/canonical-java.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-DATA |
| M-L-03 | Does a value class override `equals`/`hashCode`/`toString` as a consistent set, or does a record replace the whole obligation? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Error Prone `EqualsHashCode` (ENABLED_ERRORS, on by default) and SonarJava `S1206` both fire; two independent mechanical checks ([lint](jvm-topic-map/codified-lint-catalogue.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-DATA |
| M-L-04 | Does a `switch` over a sealed hierarchy or enum carry an unreachable `default`, and is `case null` handled deliberately? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — without `case null` a pattern switch still throws NPE exactly as before; Error Prone `UnnecessaryDefaultInEnumSwitch` is in `DISABLED_CHECKS` and must be turned on ([cjava](jvm-topic-map/canonical-java.md), [lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-DATA |
| M-L-05 | Do the four Data-Oriented Programming principles (v1.1, 2024) apply here, and is the cited version the 2024 one rather than the 2022 original? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — the fourth principle *changed* between versions ("validate at the boundary" → "separate operations from data"); a rule citing the old set is citing withdrawn guidance ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-DATA |
| M-L-06 | Is `Comparable`/`Comparator` consistent with `equals`, so sorted and hash-based collections agree? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — Item 14; a reading heuristic plus SonarJava coverage ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-DATA |
| M-L-07 | Does a stream pipeline hand-roll a `Collector` mid-pipeline where a `Gatherer` (JEP 485, final JDK 24) fits the intermediate-operation shape? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — idiom modernisation, not a correctness gate; windowing and stateful filters are the concrete cases ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-DATA |
| M-L-08 | Does a subclass use a static-helper workaround for validation-before-`super()` that JEP 513 (final, JDK 25) makes unnecessary — and does the new prologue avoid touching `this`/`super`? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — new capability, easy to misuse; the early-construction context forbids `this`/`super` member access and value `return` ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-DATA |

### M. Java nullness — 7 rows (`java-quality/nullness.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-M-01 | Does the public API use JSpecify (`@Nullable`/`@NonNull`/`@NullMarked`), a vendor annotation, or nothing — and does the rule carry a coexistence note for the four systems live today? | java, kotlin, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JSpecify 9/32 against jsr305 13/32 and checker-framework 8/32; the day-one contract for the OCX SDK ([gates](jvm-audit/exemplar-quality-gates.md), [cjava](jvm-topic-map/canonical-java.md)) | JAVA-NULL |
| M-M-02 | Does NullAway use `AnnotatedPackages` or `OnlyNullMarked` (0.12.3+), and is exactly one of them set? | java | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — mutually exclusive; passing neither crashes the build immediately with an explicit "do not report this" message ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-NULL |
| M-M-03 | Is NullAway's `JSpecifyMode` toolchain-compatible (JDK 22+, or 17.0.19+/21.0.8+ with `-XDaddTypeAnnotationsToSymbol=true`)? | java, gradle | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — an under-pinned toolchain fails with `IllegalStateException`, not a missing-feature warning ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-NULL |
| M-M-04 | Is NullAway's JSpecify mode production-ready for lambda-heavy Spring/Reactor call patterns? | java | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — a named open issue (`NullAway#1290`); "verify before enforcing" ([prac](jvm-topic-map/practitioner-and-conferences.md)) | JAVA-NULL |
| M-M-05 | Does a Java type reaching Kotlin without a nullness annotation surface as an unchecked platform type, deferring an NPE to runtime? | java, kotlin, sdk | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the exact boundary JSpecify + NullAway + Kotlin's `strict` default exist to close ([failr](jvm-topic-map/failure-language-runtime.md), [ckt](jvm-topic-map/canonical-kotlin.md)) | JAVA-NULL |
| M-M-06 | Are Error Prone's nullness-adjacent `DISABLED_CHECKS` (`EqualsMissingNullable`, `FieldMissingNullable`, `VoidMissingNullable`) turned on? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — silent unless explicitly enabled; `uber__NullAway@519a1bb826:build.gradle:84-113` promotes 14 checks to `ERROR` and is the strictest exemplar ([lint](jvm-topic-map/codified-lint-catalogue.md), [gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-NULL |
| M-M-07 | Does the codebase still use `javax.annotation`/JSR-305 or Spring's own `@Nullable` where the ecosystem has moved to JSpecify? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Spring Framework 7 / Boot 4 completed the migration November 2025; Gradle 9 switched its own API annotations ([shift](jvm-topic-map/recent-shifts.md), [prac](jvm-topic-map/practitioner-and-conferences.md)) | JAVA-NULL |

### N. Java concurrency — 11 rows (`java-quality/concurrency.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-N-01 | Are virtual threads created one-per-task, or pooled/cached as platform-thread habits suggest? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JEP 444 says verbatim they "should never be pooled"; a common port-forward mistake, and `jackson-core#919` is a flagship library auditing itself for exactly this ([cjava](jvm-topic-map/canonical-java.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-CONC |
| M-N-02 | On which JDK does `synchronized` stop pinning a virtual thread, and what should the rule say for code that must also run below it? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JEP 491 fixed the monitor case in **JDK 24** and *removed* `jdk.tracePinnedThreads`; the `jdk.VirtualThreadPinned` JFR event is the surviving check, and three native-frame cases remain ([failr](jvm-topic-map/failure-language-runtime.md), [shift](jvm-topic-map/recent-shifts.md)) | JAVA-CONC |
| M-N-03 | Is `StructuredTaskScope` used in shipped code, and does the rule row carry the JDK it was written against? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — still preview at the 6th (JDK 26) and 7th (JDK 27, GA 2026-09-15) iterations with breaking shape changes nearly every release; `--enable-preview` presence is the grep ([cjava](jvm-topic-map/canonical-java.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-CONC |
| M-N-04 | Is cross-task context carried in a `ThreadLocal` where `ScopedValue` (final, JDK 25) is now the answer? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Error Prone `ThreadLocalUsage` plus the JEP; note `orElse` no longer accepts `null` after finalisation ([cjava](jvm-topic-map/canonical-java.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-CONC |
| M-N-05 | Is a CPU-bound workload on `ForkJoinPool`/parallel streams while an I/O-bound one is on virtual threads, or are the two regimes conflated? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — a genuine 2026 decision point the corpus does not fully resolve; a blocking `parallelStream()` starves the shared common pool for unrelated code ([cjava](jvm-topic-map/canonical-java.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-CONC |
| M-N-06 | Is an `ExecutorService` shut down on every exit path, and is `newVirtualThreadPerTaskExecutor()` closed inside try-with-resources with its await-termination semantics understood? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — thread leak or an unexpectedly blocking shutdown; a common, greppable misuse ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-CONC |
| M-N-07 | Does a `CompletableFuture` chain end without `.exceptionally`/`.handle`/`.whenComplete`, so exceptions vanish? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — exceptions are silently swallowed unless something calls `.join()`/`.get()`; a reading heuristic over every chain's terminal operation ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-CONC |
| M-N-08 | Is double-checked locking applied to a non-`volatile` field? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Error Prone `DoubleCheckedLocking` and SpotBugs `DC_DOUBLECHECK`, two independent mechanical checks; CERT `LCK10-J` ([lint](jvm-topic-map/codified-lint-catalogue.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-CONC |
| M-N-09 | Is a `SimpleDateFormat`/`DateFormat` held in a shared static field? | java | B·C·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Error Prone `DateFormatConstant`; not thread-safe, corrupts output under concurrency, still common in legacy code ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-CONC |
| M-N-10 | Is thread-safety documented for shared mutable state (`@GuardedBy`, `@Immutable`, `@ThreadSafe`)? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Item 82 plus JCiP Appendix A; Error Prone's `GuardedBy` checker enforces the annotation once present ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-CONC |
| M-N-11 | Does `ReentrantReadWriteLock` still work at scale under virtual threads, or does the 65,536-concurrent-read-lock ceiling bite? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — a named, concrete ceiling with a named workaround (`StampedLock.asReadWriteLock()`); narrow but exactly the "boring topic that bites" class ([prac](jvm-topic-map/practitioner-and-conferences.md)) | JAVA-CONC |

### O. Java errors and resources — 7 rows (`java-quality/errors-and-resources.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-O-01 | Is `InterruptedException` caught and swallowed without re-interrupting the thread? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Error Prone `InterruptedInCatchBlock` and SonarJava `S2142`; breaks cooperative cancellation for every caller up the stack ([lint](jvm-topic-map/codified-lint-catalogue.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-ERR |
| M-O-02 | Is `catch (Throwable)`/`catch (Error)` used, masking `OutOfMemoryError` or a test's real failure? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Error Prone `TryFailThrowable` and SonarJava `S1181` ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-ERR |
| M-O-03 | Is a broad `Exception` caught and then swallowed rather than chained or logged? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Error Prone `CatchingUnchecked` and `UnusedException`, **both in `DISABLED_CHECKS`** — the single most characteristic LLM-written pattern is silent by default everywhere measured ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-ERR |
| M-O-04 | Is a `Closeable`/`AutoCloseable` closed via try-with-resources, and is `Files.walk`/`list`/`lines` ever used outside one? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — three tools claim it with different defaults (SonarJava `S2095`, PMD `CloseResource`, Error Prone `MustBeClosedChecker`/`StreamResourceLeak`); the rule must name which one is the build's gate ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-ERR |
| M-O-05 | Does cleanup rely on `finalize()` rather than try-with-resources or `Cleaner`? | java | B·C·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — deprecated for removal since JDK 18 (JEP 421); Google style §6.4 forbids it, and `-Xlint:removal` catches it ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-ERR |
| M-O-06 | Does exception handling distinguish recoverable conditions from programming errors, and is the original cause always preserved? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Items 69/70/75, SEI CERT `ERR`; a reading heuristic plus a grep for `new X(e.getMessage())` ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-ERR |
| M-O-07 | Does library code call `System.exit()`, or use `printStackTrace()` instead of the configured logger? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — a library must not own process lifecycle; SonarJava `S4507` supersedes the deprecated `S1148` for the stack-trace half, a rule-lineage detail worth citing correctly ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-ERR |

### P. Java security and untrusted input — 9 rows (`java-quality/security-and-untrusted-input.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-P-01 | Does untrusted data ever reach `ObjectInputStream` without an `ObjectInputFilter` allow-list? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the `ysoserial` gadget-chain RCE class; Error Prone `BanSerializableRead`, CERT `SER12-J`, OWASP's Deserialization sheet all name it ([lint](jvm-topic-map/codified-lint-catalogue.md), [cjava](jvm-topic-map/canonical-java.md)) | JAVA-SEC |
| M-P-02 | Is Jackson configured with global default typing, or a `@JsonTypeInfo` base type broad enough to admit gadget classes, without a current `PolymorphicTypeValidator`? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Jackson's own policy refuses new default-typing CVEs, yet the validator itself was bypassed again in 2026 (CVE-2026-54512/54513, nested generic type parameters, fixed in 2.18.8/2.21.4/3.1.4) ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-SEC |
| M-P-03 | Is every XML parser factory hardened against XXE — `DocumentBuilderFactory`, `SAXParserFactory`, `XMLInputFactory`, `TransformerFactory`, `SchemaFactory`, `Validator`, JAXB, XPath each separately? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — hardening one factory does not harden the others; the checks live in `find-sec-bugs`' `XXE_*` family, **not** core SpotBugs ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-SEC |
| M-P-04 | Does any code perform a JNDI lookup on untrusted input? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — Error Prone ships `BanJNDI` by name; Log4Shell's root cause is still exploitable in hand-written JNDI code ([lint](jvm-topic-map/codified-lint-catalogue.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-SEC |
| M-P-05 | Does archive-extraction code verify each entry's *resolved* path stays under the target directory (ZipSlip)? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the JDK ships no safe high-level extraction API, so every extractor re-derives the check by hand; a one-line resolve-and-contains fix ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-SEC |
| M-P-06 | Is `java.util.Random` used where unpredictability is a security requirement? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — SonarJava `S2245`, SpotBugs `DMI_RANDOM_USED_ONLY_ONCE`; direct account-takeover impact ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-SEC |
| M-P-07 | Does `Runtime.exec`/`ProcessBuilder` build a command from concatenated attacker-influenced strings rather than an argument array? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — directly on the OCX SDK's own CLI-subprocess boundary; `find-sec-bugs` `COMMAND_INJECTION` ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-SEC |
| M-P-08 | Does path handling resolve a caller-supplied path without a base-directory containment check? | java, sdk | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — `PT_RELATIVE_PATH_TRAVERSAL`, CERT `FIO16-J` ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-SEC |
| M-P-09 | Which SonarJava rules are simultaneously `BUG`/`VULNERABILITY` **and** `Blocker`/`Critical`, and does the quality gate fail on any of them? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 46 of 501 rules sit in that intersection; it is the closest thing to a ready-made "never ship" list ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-SEC |

### Q. Java platform, modules and portability — 9 rows (`java-quality/platform-and-versions.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-Q-01 | Does a published library ship a real `module-info.java` or a deliberate `Automatic-Module-Name`, rather than a filename-derived automatic module name? | java, sdk | A·B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — measured: `module-info.java` in 12/32 (79 files), `Automatic-Module-Name` in 10/32, and **largely a different set of repos — a library picks one strategy, rarely both** ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | JAVA-PLAT |
| M-Q-02 | Is a module's exported package set minimised, or does everything leak through an open module? | java, sdk | A·B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the SDK's API-surface control; Oracle `EXTEND-2`; `jdeps` and the `module-info` `exports` list are the check ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-PLAT |
| M-Q-03 | Does code reflect into a JDK-internal class that JEP 403 strongly encapsulates, and does the build carry the matching `--add-opens`/`--add-exports`? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — since JDK 17 there is no global relax flag; `jdeps --jdk-internals` and `jdeprscan` are the pre-upgrade checks ([failr](jvm-topic-map/failure-language-runtime.md), [lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-PLAT |
| M-Q-04 | Does any charset-less legacy API (`new String(byte[])`, `getBytes()`, `FileReader`, `new PrintStream(OutputStream)`) rely on the platform default? | java | B·C·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JEP 400 fixed most APIs in JDK 18+ but explicitly did not remove these overloads; Error Prone `DefaultCharset` and SpotBugs `DM_DEFAULT_ENCODING`, two independent checks ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-PLAT |
| M-Q-05 | Is a locale-sensitive call (`toUpperCase()`, `String.format()`, `NumberFormat`) missing an explicit `Locale`? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the Turkish-i bug; Error Prone `StringCaseLocaleUsage` and `DefaultLocale` (the latter in `DISABLED_CHECKS`); `google__guava@5fb424c43a:pom.xml:384` deliberately runs its suite under `hi`/`IN` to catch it ([lint](jvm-topic-map/codified-lint-catalogue.md), [gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-PLAT |
| M-Q-06 | Does anything pin a test timezone, and should it? | java, gradle, maven | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — **0/32 pin `-Duser.timezone` or `TZ`**, in a corpus full of date/time-sensitive libraries (kafka, guava, jackson, Exposed) — a real, checkable, entirely unpractised gap ([gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-PLAT |
| M-Q-07 | Does output ordering depend on `HashMap`/`HashSet` iteration order, or on classpath scan order (`ServiceLoader`, DI frameworks)? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — reproducibility-class bug, brittle golden-file tests; a reading heuristic over any serialisation or generated-file path ([cjava](jvm-topic-map/canonical-java.md), [failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-PLAT |
| M-Q-08 | Does any code path still assume `SecurityManager`/`AccessController` exists, or call `sun.misc.Unsafe` memory-access methods? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Security Manager permanently disabled JDK 24 (JEP 486, no re-enable flag); `Unsafe` warns on first use since JDK 24 (JEP 498) — dead code masquerading as a control ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-PLAT |
| M-Q-09 | Does an AOT cache / training-run artifact (JEPs 483/514/515/516) regenerate deterministically, or silently go stale against the classes it profiled? | java, gradle, sdk | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — a build-artifact class that did not exist before JDK 24, with its own versioning and reproducibility concerns; narrow adoption so far ([cjava](jvm-topic-map/canonical-java.md)) | JAVA-PLAT |

### R. The lint gate, Java and Kotlin — 11 rows (`java-quality/lint-gate.md`, `kotlin-quality/lint-gate.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-R-01 | Which Error Prone checks are in `DISABLED_CHECKS` but catch mistakes an agent makes routinely, and how does the build turn them on? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — **150 checks are silent by default**, and the docs' `severity` field is not the gate: `BuiltInCheckerSuppliers.java` is (187 ENABLED_ERRORS / 312 ENABLED_WARNINGS / 150 DISABLED); `-Xep:Name:ERROR` is the switch ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-LINT |
| M-R-02 | Does the build enable post-Java-8 `-Xlint` keys an agent's training data predates (`this-escape`, `dangling-doc-comments`, `restricted`, `missing-explicit-ctor`, `output-file-clash`)? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — 40 keys exist on JDK 25; roughly a dozen postdate the JDK-8-era list ([lint](jvm-topic-map/codified-lint-catalogue.md)) | JAVA-LINT |
| M-R-03 | Is `-Werror` set, and is it a convention-plugin decision rather than scattered per module? | java, kotlin, gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 9/32 for javac, 7/32 for Kotlin's `allWarningsAsErrors`; the exemplars concentrate it in one convention plugin (`gradlebuild.strict-compile.gradle.kts`, `junitbuild.java-library-conventions.gradle.kts`) ([shape](jvm-audit/exemplar-build-shape.md), [gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-LINT |
| M-R-04 | Which Checkstyle ruleset does the project start from, and does it know the 40+ modules where `google_checks.xml` (89 enabled) and `sun_checks.xml` (73) diverge? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — not a subset relationship: Google-only includes `EmptyCatchBlock`/`MissingOverrideOnRecordAccessor`, Sun-only includes `MagicNumber`/`HiddenField`/`DesignForExtension`; and 7 of 8 real users fork heavily ([lint](jvm-topic-map/codified-lint-catalogue.md), [gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-LINT |
| M-R-05 | Does the build run SpotBugs with `find-sec-bugs`, or only core SpotBugs' deliberately thin `SECURITY` category? | java | B·C | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 519 patterns in 10 categories; injection/SSRF/weak-crypto live only in the plugin; SpotBugs as a real gate is 3/32 ([lint](jvm-topic-map/codified-lint-catalogue.md), [gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-LINT |
| M-R-06 | Is PMD worth configuring at all for a JVM project in 2026? | java | C·F | uncovered ([cfg](jvm-audit/config-inventory.md)) | P3 — enforced in **0/32**; one footnote row, not a peer to Error Prone ([gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-LINT |
| M-R-07 | Which of detekt's 10 rule sets does the config activate, and are `formatting`/`libraries`/`ruleauthors` deliberately opted in or silently absent? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — only **129 of 231 rules are active** out of the box, and three whole rule sets are absent from the default config entirely, needing a `detektPlugins(...)` dependency ([lint](jvm-topic-map/codified-lint-catalogue.md)) | KT-LINT |
| M-R-08 | Which of ktlint's 62 `.editorconfig` properties does the project actually set, versus silently inheriting ktlint's own defaults? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — ktlint's whole configuration surface is `.editorconfig`, and only 3/32 repos set any `ktlint_*` key; ktor disables 10 standard rules explicitly ([lint](jvm-topic-map/codified-lint-catalogue.md), [gates](jvm-audit/exemplar-quality-gates.md)) | KT-LINT |
| M-R-09 | Does enabling detekt's `formatting` rule set alongside standalone ktlint buy anything? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — no: detekt 2.0 renamed the module `:detekt-rules-ktlint-wrapper`, an explicit admission it wraps ktlint; detekt-for-logic + ktlint-for-formatting is the split ([lint](jvm-topic-map/codified-lint-catalogue.md)) | KT-LINT |
| M-R-10 | Is Spotless the umbrella (one plugin covering Java + Kotlin + build files), wired into `check`, and is detaching it (`isEnforceCheck = false`) deliberate? | java, kotlin, gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 11/32 use Spotless, the widest formatter adoption; `mockito__mockito@5a676bcd9e:buildSrc/src/main/kotlin/mockito.quality-spotless-conventions.gradle.kts:12` is the one deliberate detach, with a stated CI reason ([gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-LINT |
| M-R-11 | Should the build turn on Kotlin's `-Wextra`/`extraWarnings`, and does it treat the result as errors? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — catches `CAN_BE_VAL`, `UNREACHABLE_CODE`, `USELESS_CALL_ON_NOT_NULL`, `ASSIGNED_VALUE_IS_NEVER_READ` that plain compilation never flags; still Experimental, and `-Xsuppress-warning=NAME` cannot silence errors ([lint](jvm-topic-map/codified-lint-catalogue.md)) | KT-LINT |

### S. Test suites and coverage, Java and Kotlin — 12 rows (`java-quality/testing.md`, `kotlin-quality/testing.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-S-01 | Is the project's JUnit floor 5 or 6, and does anything still depend on `junit-platform-runner`? | java, kotlin | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JUnit 6.0.0 (2025-09-30) unified Platform/Jupiter/Vintage versioning and **discontinued `junit-platform-runner`**; adoption is 4/32 and gradle/gradle itself pins 5.12.2 ([shift](jvm-topic-map/recent-shifts.md), [gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-TEST |
| M-S-02 | Is a coverage tool merely reporting, or actually failing the build on a threshold? | java, kotlin, sdk | all | partial ([cfg](jvm-audit/config-inventory.md) Axis 3 — `ocx-sdk-python`'s `fail_under = 100` is the fleet precedent) | P0 — **only 3/32 enforce anything**; the check is `violationRules`/`jacocoTestCoverageVerification`/`minBound`/`<rules>` presence, never plugin application ([gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-TEST |
| M-S-03 | Which coverage tool fits the language — JaCoCo for Java, Kover for Kotlin — and what does JaCoCo mis-read in Kotlin bytecode? | java, kotlin | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — inline functions and synthetic accessors distort the number; JaCoCo 12/32, Kover 4/32 ([failr](jvm-topic-map/failure-language-runtime.md), [gates](jvm-audit/exemplar-quality-gates.md)) | KT-TEST |
| M-S-04 | Are parallel JUnit tests isolated with `@ResourceLock`/`@Isolated` wherever they touch shared static state? | java, kotlin | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — still an actively-hardened feature area (four merged 2025-2026 PRs in `junit-team/junit-framework`), not a set-once config; CI flake rate is the empirical check ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-TEST |
| M-S-05 | Is `maxParallelForks` scaled to the box with an explicit escape hatch for known-expensive suites? | java, kotlin, gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — measured range from `cores * 2` (okhttp) to `cores / 2` (detekt, NullAway) with gradle/gradle setting `1` only for smoke tests; default 1 leaves multi-core CI idle ([gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-TEST |
| M-S-06 | Does the `jvm-test-suite` plugin declare additional suites, or are `sourceSets` + `Test` tasks hand-rolled? | java, kotlin, gradle | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 4/32 use it (sqldelight, detekt, gradle/actions, gradle/gradle); it is also how a plugin's functional-test suite should be declared ([gates](jvm-audit/exemplar-quality-gates.md), [cgrad](jvm-topic-map/gradle-canonical.md)) | JAVA-TEST |
| M-S-07 | Does CI or a checked-in `org.mockito.plugins.MockMaker` file still assume the pre-5.0 default mock maker? | java, kotlin | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Mockito 5.0.0 flipped the default to the inline maker (final classes, final methods, statics); pre-2023 advice is now backwards ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-TEST |
| M-S-08 | Is `.withReuse(true)` left on a Testcontainers container that also runs in CI? | java, kotlin | B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — reuse deliberately bypasses Ryuk cleanup and is documented as unsuited to CI; the symptom is accumulating zombie containers ([failr](jvm-topic-map/failure-language-runtime.md)) | JAVA-TEST |
| M-S-09 | Should a test reach for a hand-written fake, a mock, or Testcontainers — and what can a fake express that a container structurally cannot? | java, kotlin, sdk | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — the sharpest argued distinction in the corpus: a container gives binary up/down, a fake injects *partial* failure; contested, present the trade-off ([prac](jvm-topic-map/practitioner-and-conferences.md)) | JAVA-TEST |
| M-S-10 | Which testing framework should a Kotlin project use — JUnit 5/6, kotlin.test, Kotest, Prepared, TestBalloon? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — genuinely unsettled as of 2025-2026, unlike Java; must be framed as contested, not answered flatly; Kotest is 2/32, `kotlin.test` 8/32 ([prac](jvm-topic-map/practitioner-and-conferences.md), [gates](jvm-audit/exemplar-quality-gates.md)) | KT-TEST |
| M-S-11 | What does `runTest` change relative to `runBlocking` (auto delay-skip, 60-second default timeout, end-of-test exception propagation), and when does virtual time hide a real race? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — governs the correctness of the SDK's own coroutine tests if Kotlin-first; `StandardTestDispatcher` vs `UnconfinedTestDispatcher` is the second half ([ckt](jvm-topic-map/canonical-kotlin.md), [failr](jvm-topic-map/failure-language-runtime.md)) | KT-TEST |
| M-S-12 | Is test retry (`org.gradle.test-retry`) a corpus norm worth recommending? | java, kotlin, gradle | all | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — **1/32 official, 1/32 hand-rolled, 30/32 nothing**; the strict exemplars simply do not retry ([gates](jvm-audit/exemplar-quality-gates.md)) | JAVA-TEST |

### T. Kotlin public API and ABI — 10 rows (`kotlin-quality/api-and-abi.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-T-01 | Does every published Kotlin library module enable explicit API mode, and how is a violation caught in CI? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — kotlinlang's library guidance is unconditional; measured adoption is **5/32** against 15 Kotlin-library repos, so the gap is "recommended vs enabled", not a doc disagreement; `explicitApi()` or `-Xexplicit-api=strict` is the grep ([ckt](jvm-topic-map/canonical-kotlin.md), [gates](jvm-audit/exemplar-quality-gates.md)) | KT-API |
| M-T-02 | Why does **widening as well as narrowing** a public function's return type break binary compatibility, and what `NoSuchMethodError` results? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — counter-intuitive (narrowing "should" be safe and is not); kotlinlang shows the exact error text ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-API |
| M-T-03 | Why must a published library never expose a `data class` in its public API? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — adding one property changes both the constructor and the generated `copy()` signature; a greppable shape (`public data class`, or a `data class` with no visibility modifier) ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-API |
| M-T-04 | Does `@JvmOverloads` or `@IntroducedAt` preserve binary compatibility when a default parameter is added? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — JetBrains explicitly warns `@JvmOverloads` does **not** for Kotlin callers, and its replacement `@IntroducedAt` is still Experimental — no non-experimental mechanism fully solves it, and the rule must state the gap rather than pick ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-API |
| M-T-05 | Standalone `binary-compatibility-validator` or the in-KGP experimental `abiValidation {}` — which does a project adopt today? | kotlin, sdk, gradle | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the standalone plugin declares itself maintenance-mode and points at the KGP feature, which needs `@OptIn(ExperimentalAbiValidation::class)`; **5/32 repos run the standalone one, 0 run `abiValidation`** ([ckt](jvm-topic-map/canonical-kotlin.md), [gates](jvm-audit/exemplar-quality-gates.md)) | KT-API |
| M-T-06 | Are `api/*.api` dump files committed and reviewed as part of the diff? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — 10/32 repos carry `.api` files (ktor up to 240); `apiDump`/`apiCheck` wired into `check` is the mechanism ([gates](jvm-audit/exemplar-quality-gates.md), [pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | KT-API |
| M-T-07 | Does a library propagate an experimental API's `@RequiresOptIn` marker when that type appears in a public signature? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — opt-in is **not** propagated by default, so consumers unknowingly depend on unstable API; `@SubclassOptInRequired` covers the inheritance-only case ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-API |
| M-T-08 | Does `@PublishedApi` bind an internal declaration to the same binary-compatibility rules as a public one? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — inline-function internals leak into client bytecode ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-API |
| M-T-09 | Does the public API take a `Boolean` argument where a named type would read better, and does every stateful type have a meaningful `toString`? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — both are named kotlinlang library rules with mechanically detectable shapes; the `toString` one carries an explicit "do not reach for a `data class` just to get it" ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-API |
| M-T-10 | Is `@RequiresOptIn` being misused to deprecate an already-shipped declaration, where a `@Deprecated(message, replaceWith, level)` cycle is the sanctioned path? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — kotlinlang calls out this exact misuse ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-API |

### U. Kotlin coroutines — 10 rows (`kotlin-quality/coroutines.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-U-01 | Is `GlobalScope.launch`/`.async` used anywhere outside a deliberate, justified fire-and-forget case? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — defeats structured concurrency outright (no cancellation, no propagation, no lifecycle tie-in); requires an explicit `@OptIn(DelicateCoroutinesApi::class)`, so it is greppable ([failr](jvm-topic-map/failure-language-runtime.md), [prac](jvm-topic-map/practitioner-and-conferences.md)) | KT-CORO |
| M-U-02 | Is `runBlocking` called from inside a `suspend` function, or on a thread shared with other work? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — blocks a thread the scheduler assumed free; can deadlock a limited dispatcher; greppable ([failr](jvm-topic-map/failure-language-runtime.md)) | KT-CORO |
| M-U-03 | Is `CoroutineExceptionHandler` installed on a root coroutine, or on a nested `launch` where it silently does nothing — and does anyone expect it to fire for `async`? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — kotlinlang names this exact mistake with a labelled wrong/right pair; `async` captures into the `Deferred` and surfaces only at `.await()` ([failr](jvm-topic-map/failure-language-runtime.md), [ckt](jvm-topic-map/canonical-kotlin.md)) | KT-CORO |
| M-U-04 | Does `catch (e: Exception)` or `runCatching { }` swallow `CancellationException` instead of rethrowing it? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — silently breaks cooperative cancellation across the whole coroutine tree; named and greppable ([failr](jvm-topic-map/failure-language-runtime.md)) | KT-CORO |
| M-U-05 | Is `Dispatchers.IO` treated as unbounded, and does the code know its 64-threads-or-core-count ceiling and how `limitedParallelism(n)` makes a non-additive elastic view? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — silent thread-pool exhaustion is a classic Kotlin/JVM production bug; the ceiling is governed by the `kotlinx.coroutines.io.parallelism` system property ([ckt](jvm-topic-map/canonical-kotlin.md), [failr](jvm-topic-map/failure-language-runtime.md)) | KT-CORO |
| M-U-06 | Does a long-running coroutine loop check cancellation (`isActive`, `ensureActive()`, `yield()`)? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — cancellation is cooperative, not preemptive; without a check the coroutine never stops after `cancel()` ([prac](jvm-topic-map/practitioner-and-conferences.md)) | KT-CORO |
| M-U-07 | Is a `Flow`'s exception caught inside the builder, violating exception transparency, instead of via the `catch` operator upstream of collection? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — breaks Flow's designed propagation contract ([failr](jvm-topic-map/failure-language-runtime.md)) | KT-CORO |
| M-U-08 | Which shared-mutable-state fix is right here — thread confinement, `Mutex`, an actor — and why are volatiles insufficient for compound operations? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — mixing a suspending `Mutex` with a blocking `synchronized` in one critical section deadlocks ([ckt](jvm-topic-map/canonical-kotlin.md), [failr](jvm-topic-map/failure-language-runtime.md)) | KT-CORO |
| M-U-09 | Does a `SupervisorJob` child differ from a `supervisorScope` child for exception handling, and does the code rely on the wrong one? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — kotlinlang distinguishes them explicitly; only the closest ancestor matters ([failr](jvm-topic-map/failure-language-runtime.md)) | KT-CORO |
| M-U-10 | Does a `StateFlow` consumer assume every emitted value is delivered, missing conflation? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — silent lost-update under a fast producer and a slow collector ([failr](jvm-topic-map/failure-language-runtime.md)) | KT-CORO |

### V. Kotlin/Java interop — 8 rows (`kotlin-quality/java-interop.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-V-01 | Does a public function returning a Java platform-typed expression declare its Kotlin type explicitly? | kotlin, java | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — kotlinlang's coding conventions name this the rule that closes the most common silent-NPE seam at the boundary ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-INTEROP |
| M-V-02 | Which nullability-annotation flavour governs a mismatch's severity — JSpecify (`strict`, errors) or JSR-305 (`warn`) — and which flag controls it? | kotlin, java, sdk | A·B·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — a wrong assumption silently downgrades an NPE risk to a warning; `-Xjspecify-annotations`, `-Xjsr305`, `-Xnullability-annotations` are the knobs ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-INTEROP |
| M-V-03 | Are the five Java-interop annotations used for the five distinct problems they solve (`@JvmStatic`, `@JvmName`, `@JvmField`, `@JvmOverloads`/`@IntroducedAt`, `@Throws`)? | kotlin, java, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — a rule teaching one as "the Java interop annotation" is incomplete; `@JvmStatic` on a companion behaves differently from a named `object` ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-INTEROP |
| M-V-04 | Does a Java caller need `@Throws` to catch an exception a Kotlin function throws? | kotlin, java, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — Kotlin has no checked exceptions, so without it the Java caller gets a compile error ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-INTEROP |
| M-V-05 | Is a `suspend fun` part of a public API meant to be callable from Java? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — it compiles to a `Continuation`-parameter method Java cannot call naturally; needs an explicit blocking or future-returning wrapper. Directly load-bearing for a Kotlin-first OCX SDK ([failr](jvm-topic-map/failure-language-runtime.md)) | KT-INTEROP |
| M-V-06 | Is a Kotlin `value`/inline class used across the Java boundary without accounting for its mangled JVM signature? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — Java callers see a mangled name or an unexpected boxed type ([failr](jvm-topic-map/failure-language-runtime.md)) | KT-INTEROP |
| M-V-07 | Is `kotlin.Result<T>` used as a public return type across a module boundary? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — JetBrains discourages it publicly while it is widely used internally; genuinely split, keep at CONSIDER ([failr](jvm-topic-map/failure-language-runtime.md)) | KT-INTEROP |
| M-V-08 | For JPMS-enabled mixed Java/Kotlin sources, why does `compileJava` need a `--patch-module` `CommandLineArgumentProvider`? | kotlin, java, gradle | A·B | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — absent from most team playbooks; the build silently fails to see Kotlin output as part of the module ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-INTEROP |

### W. Kotlin compiler, toolchain and codegen — 8 rows (`kotlin-quality/compiler-and-toolchain.md`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-W-01 | Which previously-cited `-X` flags have stabilised or vanished (`-Xjvm-default`, `-Xwhen-guards`, `-Xnon-local-break-continue`, `-Xcontext-parameters`), and does a rule naming the old flag silently no-op? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — guard conditions and non-local break/continue went Stable in 2.2.0, context parameters in 2.4.0; `-Xjvm-default` is deprecated **and its default flipped to `ENABLE`** in 2.2.0 (2025-06-23), a behaviour change, not a rename ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-COMP |
| M-W-02 | How do `jvmToolchain` and `compilerOptions.jvmTarget` interact, and what happens if `jvmTarget` is set without a toolchain? | kotlin, gradle | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — the toolchain sets `jvmTarget` **only when the user has not**, and `jvmTarget` still defaults to `"1.8"` ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-COMP |
| M-W-03 | What does `jvmTargetValidationMode` (default **`ERROR`**) check, and what is the failure shape when `compileJava` and `compileKotlin` disagree? | kotlin, gradle | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — any rule assuming a soft warning describes behaviour current KGP no longer has; Kotlin 2.4.0 added a Maven-side automatic alignment too ([ckt](jvm-topic-map/canonical-kotlin.md)) | KT-COMP |
| M-W-04 | Is kapt used where KSP2 would work, and can the two coexist per module during a staged migration? | kotlin, gradle | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P0 — kapt stubs Kotlin to Java and reruns processors on the stubs; KSP2 has been the default since KSP 2.0.0 and KSP1 stops working past Kotlin 2.3.0 / AGP 9.0. Measured: `kapt.*` set in **1/32** (dagger), `ksp.*` in 2/32 ([shift](jvm-topic-map/recent-shifts.md), [shape](jvm-audit/exemplar-build-shape.md)) | KT-COMP |
| M-W-05 | Is the doc build on the classic Dokka Gradle plugin or v2 (Dokkatoo-based), and is K2 analysis stable there (Dokka ≥ 2.2.0)? | kotlin, sdk | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P1 — v1→v2 restructures multi-module aggregation, output directories and visibility settings; a migration, not a bump ([ckt](jvm-topic-map/canonical-kotlin.md), [shift](jvm-topic-map/recent-shifts.md)) | KT-COMP |
| M-W-06 | Are Kotlin daemon JVM arguments set at the right precedence level, and does `kotlin.build.report.output` give CI a way to diagnose a slow incremental build? | kotlin, gradle | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — four precedence levels each override the last; `kotlin.daemon.jvmargs` is set in 4/32 ([ckt](jvm-topic-map/canonical-kotlin.md), [shape](jvm-audit/exemplar-build-shape.md)) | KT-COMP |
| M-W-07 | Is `-progressive` or `-opt-in=` used, and what does each commit the project to? | kotlin | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — measured after false-positive removal: `-progressive` real usage 1/25 (kotlinx.coroutines), `optIn` 8/25 ([shape](jvm-audit/exemplar-build-shape.md)) | KT-COMP |
| M-W-08 | Does `kotlin("jvm") version "…"` appear as a literal in a main build file rather than resolving through the catalog? | kotlin, gradle | A·D | uncovered ([cfg](jvm-audit/config-inventory.md)) | P2 — measured: literal versions appear almost exclusively in sample and documentation sub-builds; main builds go through the catalog ([shape](jvm-audit/exemplar-build-shape.md)) | KT-COMP |

### X. Java and Kotlin under Bazel — 10 rows (handed to `bazel-quality`, family `BZL-JAVA`)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-X-01 | Is `--tool_java_language_version`/`--tool_java_runtime_version` being confused with `--java_language_version`/`--java_runtime_version`? | bazel-java | E | uncovered here; the sibling's 12 files own the generic mechanics ([cfg](jvm-audit/config-inventory.md) §2.3) | P0 — two parallel flag pairs with different defaults (tools default to `11`/`remotejdk_11`); a `.bazelrc` grep, and `bazelbuild__bazel@948b8c70e2:.bazelrc:70-73` is the one exemplar pinning all four ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md), [pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | BZL-JAVA |
| M-X-02 | Does a Java-under-Bazel build pin **any** JDK version, or ride whatever the default toolchain supplies? | bazel-java | E | uncovered here ([cfg](jvm-audit/config-inventory.md)) | P0 — `grpc__grpc-java@fc4314419d:.bazelrc:1-3` pins **nothing** (its rc file carries only C++ flags): silent JDK drift across CI runners ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | BZL-JAVA |
| M-X-03 | Is `maven_install.json` committed, and is `fail_if_repin_required = True` set? | bazel-java | E | uncovered here ([cfg](jvm-audit/config-inventory.md)) | P0 — the lock file is a **build input, not a cache**; without pinning every clean checkout re-resolves with no checksum verification; `REPIN=1 bazel run @maven//:pin` is the workflow ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md), [failb](jvm-topic-map/failure-build-and-deps.md)) | BZL-JAVA |
| M-X-04 | Does a Kotlin jar pulled through `rules_jvm_external` risk inline-function corruption from a naive `java_import`/`ijar` interaction? | bazel-java, kotlin | E | uncovered here ([cfg](jvm-audit/config-inventory.md)) | P0 — the native `ijar` "does not know about kotlin metadata with respect to inlined functions, and will remove method bodies inappropriately": a Bazel+Kotlin-only correctness bug with no Gradle analogue ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | BZL-JAVA |
| M-X-05 | Does `kt_kotlinc_options` leave `x_lambdas` at rules_kotlin's `"class"` default while the same code's Gradle build uses Kotlin 2.x's `"indy"`? | bazel-java, kotlin | E | uncovered here ([cfg](jvm-audit/config-inventory.md)) | P1 — divergent bytecode shapes for "the same" code across build systems, quoted from the ruleset's own docs ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | BZL-JAVA |
| M-X-06 | Is `version_conflict_policy = "pinned"` set where deterministic resolution matters, or is Bazel silently doing highest-wins like unmanaged Maven mediation? | bazel-java | E | uncovered here ([cfg](jvm-audit/config-inventory.md)) | P1 — the Bazel-side analogue of M-J-01/M-J-02; a reviewer needs the mapping to explain drift across build systems ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | BZL-JAVA |
| M-X-07 | In a genuine dual Gradle+Bazel repo, which build is the source of truth, and is anything checking that the two dependency graphs agree? | bazel-java, gradle | E | uncovered here ([cfg](jvm-audit/config-inventory.md)) | P0 — **nothing checks it**: neither dagger nor grpc-java generates one from the other, and neither documents why it carries two; dagger's answer is a `CONTRIBUTING.md:29` line plus CI job ordering, not a generator ([pub](jvm-audit/exemplar-publishing-ci-bazel.md), [shape](jvm-audit/exemplar-build-shape.md)) | BZL-JAVA |
| M-X-08 | Should a `java_binary`'s `_deploy.jar` be the distribution artifact, given the same shading failure taxonomy as M-G-02..05? | bazel-java, sdk | E | uncovered here ([cfg](jvm-audit/config-inventory.md)) | P1 — 5/32 declare `java_binary(`, 1/32 has `_deploy.jar` paths; the fat-jar decision tree crosses build systems ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)) | BZL-JAVA |
| M-X-09 | Are lint targets (checkstyle/PMD/SpotBugs via `contrib_rules_jvm`) actually wired into `bazel test //...`, or generated and never invoked? | bazel-java | E | uncovered here ([cfg](jvm-audit/config-inventory.md)) | P2 — opt-in via wrapper macros; ruleset presence is not enforcement ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | BZL-JAVA |
| M-X-10 | Do persistent and multiplex workers (`KotlinCompile`, `KotlinKsp2`, `JdepsMerge`, on by default) risk stale-state non-reproducibility? | bazel-java, kotlin | E | uncovered here ([cfg](jvm-audit/config-inventory.md)) | P2 — on-by-default makes this silent; `--strategy=<mnemonic>=local` is the opt-out ([cmab](jvm-topic-map/maven-ant-bazel-canonical.md)) | BZL-JAVA |

### Y. The OCX SDK's own contract — 6 rows (cross-cutting; each routes to a named family)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-Y-01 | Does a JVM SDK reproduce the fleet's 16-member sysexit table byte-for-byte as an enum plus an exception hierarchy, and never parse stderr text? | java, kotlin, sdk | B | partial ([cfg](jvm-audit/config-inventory.md) Axis 3/4 — `ocx-sdk-python/src/ocx_sdk/_errors.py:28-46` and `rules_ocx/AGENTS.md:161-178` agree byte-for-byte) | P0 — a pinned project decision, not a derivable rule; the check is a diff of the enum against those two sources | JAVA-API |
| M-Y-02 | Is the CLI-subprocess boundary behind an injectable factory seam for both the one-shot and the streaming path, with a kill ladder? | java, kotlin, sdk | B | partial ([cfg](jvm-audit/config-inventory.md) Axis 3 — `_process.py:101-105,383-421,444-457,762-799`) | P0 — Java has no mockable process API, so the seam is a design requirement: `ProcessBuilder` behind an interface, or `ExecOperations` on the plugin side | JAVA-CONC |
| M-Y-03 | Can a JVM SDK hold the zero-runtime-dependency commitment, and what does that cost in JSON parsing and Kotlin idiom? | java, kotlin, sdk | B | partial ([cfg](jvm-audit/config-inventory.md) Axis 3 and smell 5) | P0 — feeds owner question Q1: `java.net.http` plus a hand-rolled reader holds it; `kotlinx.serialization` or `kotlinx.coroutines` breaks it | JAVA-API |
| M-Y-04 | Does the SDK's public surface get stated in exactly one place, the way `__all__` states Python's 116 names? | java, kotlin, sdk | B | partial ([cfg](jvm-audit/config-inventory.md) Axis 3) | P1 — `module-info.java`'s `exports` list (Java) or `explicitApi()` plus `internal` (Kotlin) each give the same "one file states the contract" property | JAVA-PLAT |
| M-Y-05 | Does the OCX Gradle plugin read anything to decide task behaviour that is not a declared `@Input` or a `ValueSource` key? | plugin-dev | D | partial ([cfg](jvm-audit/config-inventory.md) Axis 4 — `rules_ocx/AGENTS.md:65`'s "no `module_ctx.os`, no getenv" invariant) | P0 — the single clearest transferable constraint from the Bazel prior art: configuration-cache compliance under another name, checked by `./gradlew --configuration-cache` | GRADLE-PLUG |
| M-Y-06 | Do Java and Kotlin have a tested-documentation-example story, and does `docs-quality`'s generator table have room for Dokka or Javadoc? | java, kotlin, sdk | all | **gap in a sibling set** ([cfg](jvm-audit/config-inventory.md) Axis 5 — zero Java/Kotlin rows in `tested-examples-by-language.md`, zero Dokka/Javadoc rows in `wiring-by-generator.md`) | P1 — neither language ships a doctest runner, so both fall to the generic subprocess harness; Dokka emits its own site and fits none of the existing table's columns. Fixable by editing a sibling file, not by shipping a new artifact | JAVA-API |

## Artifact set decision

Decisions, not options. Each names the assumption it rests on.

### The rules and their glob lists

Four rules, each with a support directory. Every glob below is measured against
`rule-distillation`'s bar — *narrow the glob only when it cannot miss* — using
the exemplar counts in [shape](jvm-audit/exemplar-build-shape.md) and
[pub](jvm-audit/exemplar-publishing-ci-bazel.md).

```yaml
# rules/java-quality.md
paths: ["**/*.java"]

# rules/kotlin-quality.md
paths: ["**/*.kt", "**/*.kts"]

# rules/gradle-build.md
paths:
  - "**/*.gradle.kts"
  - "**/*.gradle"
  - "**/gradle.properties"
  - "**/*.versions.toml"
  - "**/gradle/wrapper/gradle-wrapper.properties"
  - "**/gradle/verification-metadata.xml"
  - "**/gradle.lockfile"
  - "**/buildscript-gradle.lockfile"

# rules/maven-build.md
paths:
  - "**/pom.xml"
  - "**/.mvn/**"
  - "**/mvnw"
  - "**/mvnw.cmd"
  - "**/build.xml"
  - "**/ivy.xml"
  - "**/ivysettings.xml"
```

Which names the build systems or the JDK **require**, and therefore cannot miss:

- **`**/*.java`, `**/*.kt`** — `javac` requires `.java`; `kotlinc` requires
  `.kt`. Extension globs, structurally underwritten, cannot miss.
- **`**/*.kts`** is on `kotlin-quality`, not `gradle-build`, only as a
  catch-all for standalone Kotlin scripts; `*.gradle.kts` files match
  `gradle-build`'s more specific glob too and correctly load both when a build
  script *is* Kotlin. This double-load is intentional and bounded: a build
  script is Kotlin source and the Kotlin index's non-negotiables apply to it.
- **`**/*.gradle.kts`, `**/*.gradle`** — Gradle's own script-file contract, and
  they subsume `settings.gradle{,.kts}` and `init.gradle{,.kts}`, so those are
  not listed separately. Measured: 13 root `.kts` + 8 root Groovy settings
  files, 2435/2357 in gradle/gradle alone.
- **`**/gradle.properties`** — Gradle requires this exact name at the root, per
  subproject, and in `GRADLE_USER_HOME`. 20/25 Gradle repos have one. Cannot
  miss.
- **`**/gradle/wrapper/gradle-wrapper.properties`** — `gradlew` hardcodes this
  exact relative path; the wrapper cannot find it anywhere else. 21/21
  wrapper-bearing repos have it there, including `gradle/actions`' one instance
  under `.github/workflow-samples/…`, which the `**/` prefix correctly still
  matches.
- **`**/gradle/verification-metadata.xml`**, **`**/gradle.lockfile`**,
  **`**/buildscript-gradle.lockfile`** — all three are names Gradle itself
  requires. They match **0-1 times in 32 repos today**
  ([shape](jvm-audit/exemplar-build-shape.md), [pub](jvm-audit/exemplar-publishing-ci-bazel.md)).
  That is the argument *for* including them, the same one `bazel-quality` made
  for `WORKSPACE`: a glob that never matches costs nothing, and a glob that
  matches once catches the single moment that matters — someone opening a
  verification or lock file, where the intuitive edit (hand-fix the conflicting
  entry) silently destroys the mechanism's whole purpose (M-C-09, M-C-10).
- **`**/*.versions.toml` is IN and `**/gradle/libs.versions.toml` is OUT**, and
  this reverses the frame's glob. The frame lists the conventional path.
  [pub](jvm-audit/exemplar-publishing-ci-bazel.md) measured
  `apollographql__apollo-kotlin@c145295b72:gradle/libraries.toml` — a real
  catalog at a non-conventional name — and
  [shape](jvm-audit/exemplar-build-shape.md) found gradle/gradle wiring three
  named catalogs (`libs`, `testLibs`, `buildLibs`) programmatically from
  arbitrary files via `versionCatalogs { create("buildLibs") { from(files(…)) } }`.
  The conventional-path glob would silently miss both. `**/*.versions.toml`
  catches `libs.versions.toml`, `test.versions.toml`, `build.versions.toml` and
  every `<name>.versions.toml`. **Residual miss, named rather than papered
  over:** `libraries.toml` and any other non-`.versions.toml` name. It is
  covered by routing, not by a glob — a catalog is *wired* from
  `settings.gradle.kts`, which always loads the index, whose routing table says
  "adding or repinning a dependency → `gradle-build/dependencies.md`".
- **`**/pom.xml`** — Maven's own file-name contract, the one name in the whole
  ecosystem that is genuinely non-negotiable. Cannot miss.
- **`**/.mvn/**`** — a directory glob, which the bar normally rejects. It is IN
  because Maven itself requires the directory name for `maven.config`,
  `jvm.config`, `extensions.xml` and `wrapper/maven-wrapper.properties`; there
  is no alternative location.
  [shape](jvm-audit/exemplar-build-shape.md) measured `.mvn/maven.config` in 2/5
  Maven-primary repos and `.mvn/extensions.xml` in **0/32** — thin, but every
  hit is load-bearing (assertj's `.mvn/maven.config` pins the checksum
  algorithms).
- **`**/mvnw`, `**/mvnw.cmd`** — names `mvn wrapper:wrapper` generates and that
  every CI invocation types.
- **`**/build.xml`** — Ant's default build-file name. It matches 5/32 repos and
  only one of those (`apache/ant`) is genuinely an Ant build; the other four are
  documentation snippets and test fixtures
  ([shape](jvm-audit/exemplar-build-shape.md) §8). **Encountering the file is the
  finding** — the same argument as `WORKSPACE` in the sibling set — and the
  index's first instruction is "read `maven-build/ant-legacy.md` before touching
  this; if you are migrating to Gradle, `ant.importBuild` disables the
  configuration cache permanently" (M-J-16).
- **`**/ivy.xml`, `**/ivysettings.xml`** — Ivy's required names. Present only in
  `apache/ant`'s own release tooling and nowhere else in the corpus; in for the
  same reason as `build.xml`.

Deliberately **out**: `**/BUILD.bazel`, `**/*.bzl`, `**/MODULE.bazel` (the
sibling set owns them and two rules on one glob double-load); `**/*.groovy` (the
language is out of scope, and Groovy *build scripts* are already covered by
`**/*.gradle`); `**/.editorconfig` (ktlint's real configuration surface, but the
file is owned by every language at once and a JVM rule loading on it would fire
in Python and TypeScript repos — the ktlint rows load through
`kotlin-quality`'s index instead, M-R-08).

### Depth files, one line each, routed by task

Twenty-seven depth files across four support directories, one ID family per
file. Every line below is written as the routing table's own left column — the
task, never the topic name.

**`rules/java-quality/`** — index family `JAVA-CORE`

| File | Family | Doing this → read this |
|---|---|---|
| `api-and-evolution.md` | `JAVA-API` | Adding, changing or removing anything a caller outside this module can see; deprecating something; deciding whether a signature change is safe |
| `data-and-patterns.md` | `JAVA-DATA` | Modelling a value, a closed set of alternatives, or a state machine; writing or reviewing a `switch` over a sealed type or enum |
| `nullness.md` | `JAVA-NULL` | Annotating a public surface, wiring NullAway, or debugging why a null reached somewhere it should not have |
| `concurrency.md` | `JAVA-CONC` | Starting a thread, forking work, sharing mutable state, or wiring a timeout or a cancellation |
| `errors-and-resources.md` | `JAVA-ERR` | Throwing, catching, wrapping or logging a failure; opening anything that must be closed |
| `security-and-untrusted-input.md` | `JAVA-SEC` | Parsing, deserialising, extracting, executing, or resolving a path from data you did not write |
| `platform-and-versions.md` | `JAVA-PLAT` | Choosing a JDK, writing `module-info`, reading bytes or text, or chasing "works on my machine" |
| `lint-gate.md` | `JAVA-LINT` | Standing up or changing what fails the build: Error Prone, NullAway, `-Xlint`, Checkstyle, SpotBugs, Spotless |
| `testing.md` | `JAVA-TEST` | Writing or reviewing a test, parallelising a suite, or deciding what coverage number means anything |

**`rules/kotlin-quality/`** — index family `KT-CORE`

| File | Family | Doing this → read this |
|---|---|---|
| `api-and-abi.md` | `KT-API` | Publishing anything other people compile against; adding a parameter, a default, or an overload |
| `coroutines.md` | `KT-CORO` | Launching, awaiting, cancelling, or collecting; anything with `suspend` in the signature |
| `java-interop.md` | `KT-INTEROP` | Writing Kotlin a Java caller will use, or calling Java from Kotlin |
| `compiler-and-toolchain.md` | `KT-COMP` | Setting a compiler flag, a JVM target, an annotation processor, or a doc generator |
| `lint-gate.md` | `KT-LINT` | Configuring detekt, ktlint or Spotless, or deciding which one owns which check |
| `testing.md` | `KT-TEST` | Writing a coroutine test, choosing a test framework, or reading a Kotlin coverage number |

**`rules/gradle-build/`** — index family `GRADLE-CORE`

| File | Family | Doing this → read this |
|---|---|---|
| `structure-and-conventions.md` | `GRADLE-STRUCT` | Adding a subproject, moving shared build logic, or editing `settings.gradle.kts` |
| `dependencies.md` | `GRADLE-DEP` | Adding, removing, upgrading or pinning a dependency; touching a version catalog, a BOM, a lock file or a repository declaration |
| `caching-and-correctness.md` | `GRADLE-CACHE` | Writing a task, chasing a cache miss, or fixing a configuration-cache failure |
| `toolchains-and-compilation.md` | `GRADLE-TOOL` | Choosing a JDK, upgrading the wrapper, or setting a compiler or encoding flag |
| `plugin-authoring.md` | `GRADLE-PLUG` | Writing a Gradle plugin or a convention plugin, testing it across versions, or publishing it |
| `distribution.md` | `GRADLE-DIST` | Producing something that runs: a fat jar, a start script, a runtime image, an installer, a container |
| `publishing.md` | `GRADLE-PUB` | Publishing an artifact anyone else consumes, or changing what a consumer sees |
| `ci.md` | `GRADLE-CI` | Standing up or changing a pipeline that runs Gradle |

**`rules/maven-build/`** — index family `MVN-CORE`

| File | Family | Doing this → read this |
|---|---|---|
| `dependencies.md` | `MVN-DEP` | Adding a dependency, explaining why a transitive version won, or making drift a build failure |
| `lifecycle-and-plugins.md` | `MVN-BUILD` | Binding a plugin, choosing a phase, setting compiler or Surefire options, or moving to Maven 4 |
| `publishing.md` | `MVN-PUB` | Releasing to Maven Central, or publishing a BOM |
| `ant-legacy.md` | `MVN-ANT` | You opened a `build.xml`: recognising what it encodes and migrating it out |

Three notes on what is deliberately **not** a depth file. **No
`performance.md`** — performance is a wave, not a topic; its standards go to the
file that owns the check (`caching-and-correctness.md` for cache hits,
`testing.md` for fork counts), and its procedures do not exist as a skill
because [gates](jvm-audit/exemplar-quality-gates.md) found build-scan tooling is
a 12/32 vendor product, not a portable procedure. **No `migration.md`** — the
Gradle 8→9, Kotlin K1→K2, Maven 3→4 and OSSRH→Central moves are each a section
of the file that owns the standard, because each is a checklist with a
verification and nobody runs it twice. **No `agent-legibility.md`** — the
catalog's other sets fold that into the index.

### ID-family allocation

`JAVA-`, `KT-`, `GRADLE-` and `MVN-` are confirmed free everywhere checked:
zero hits in `rules/` ([cfg](jvm-audit/config-inventory.md) headline 2) and no
overlap with the Bazel program's `BZL-` reservation. The catalog's post-Rust
convention is a language prefix on every family (`PY-`, `TS-`, `DOC-`, `CSS-`),
so the JVM set uses `JAVA-<FAMILY>-NN` and siblings, never bare families.
Twenty-seven families, one per depth file, plus four index families
(`JAVA-CORE`, `KT-CORE`, `GRADLE-CORE`, `MVN-CORE`) for the rows an index owns
outright — the shape `python-quality` and `typescript-quality` already use.
`BZL-JAVA` belongs to the sibling set and is never emitted by an artifact this
program publishes.

### How the Bazel-Java depth file reaches `bazel-quality`

The file is **researched and drafted in this corpus, and copied in by the
sibling program's authoring pass**. Concretely:

- Wave 3 group `bazel-java` writes its dives to
  `.agents/research/jvm-bazel-java/<slug>.md` and consolidates to
  `.agents/research/jvm-bazel-java.md`, exactly like every other group here.
- The authoring pass then writes one ready-to-paste depth file to
  **`.agents/research/handoff/bazel-quality-java.md`**, whose destination path
  is `rules/bazel-quality/java.md` on the branch carrying the Bazel program, and
  whose ID family is **`BZL-JAVA`**.
- It is written to the sibling's contract, not this program's: **no
  `pom.xml`/`build.gradle*` glob of its own** (the sibling deliberately declines
  manifest globs and routes by task from its index), and it *routes into* the
  six existing mechanic-owning files rather than restating them — `bzlmod.md`
  for lockfile hygiene, `hermeticity.md` for toolchain leakage,
  `caching-rbe.md` for deploy-jar action keys, `testing.md` for sizing,
  `flags-and-versions.md` for `--incompatible_autoload_externally`,
  `architecture.md` for target granularity
  ([cfg](jvm-audit/config-inventory.md) §2.3). Its own residue is exactly the
  M-X rows: the two flag pairs, `maven_install.json` pinning, `rules_kotlin`'s
  `ijar`/inline-function trap and `x_lambdas` divergence, dual-build source of
  truth, deploy jars, and worker state.
- **Assumption named, and it is a coordination assumption, not a technical one:**
  the sibling program's own artifact-set decision calls its twelve depth files
  finalized and lists `rules_java`/`rules_kotlin` as explicitly out of scope
  ([cfg](jvm-audit/config-inventory.md) §2.1, smell 2). Accepting a thirteenth
  family reopens a closed decision. If the owner declines (Q6), the file stays
  in this corpus as research, `BZL-JAVA` is never allocated, and the M-X rows are
  recorded here as the deferred backlog rather than papered over.

### Skills — two, both procedures, both cross-build-system

**`jvm-release`** — take a JVM artifact from a green build to a published,
consumable release. Opens with the immutability gate ("Maven Central will not let
you remove, update or modify a component" — M-H-10) because it changes every
later step, then: verify the namespace in the Central Portal, assemble the
required set (sources jar, javadoc/Dokka jar, GPG signature per file, checksums,
complete POM metadata), decide `autoPublish`/`waitUntil`, run the
binary-compatibility gate *before* upload, check the tag against the declared
version, and know that OSSRH and `nexus-staging-maven-plugin` are dead paths.
It carries both build systems because the Portal requirements are identical and
only the plugin differs (`central-publishing-maven-plugin` vs
vanniktech/nmcp/jreleaser). Sources: [cmab](jvm-topic-map/maven-ant-bazel-canonical.md),
[pub](jvm-audit/exemplar-publishing-ci-bazel.md), [shift](jvm-topic-map/recent-shifts.md).

**`jvm-dependency-triage`** — work out why a version won, whether it is safe, and
what to change. Three entry points because the symptoms are distinct: *a version
you did not choose* (`dependencyInsight` / `dependency:tree -Dverbose`,
nearest-wins vs `dependencyManagement` vs highest-wins vs
`version_conflict_policy`, the Guava `listenablefuture:9999.0` trick as the
worked teaching case), *a declaration that is wrong* (DAGP `projectHealth`,
`api`-vs-`implementation`, unused and used-transitive, `compileOnly` needed at
runtime), and *a version you are about to bump* (detect Dependabot vs Renovate —
13/32 each, zero overlap — validate the coordinate against the registry before
applying, and check the namespace for a typosquat). The last step exists because
[failb](jvm-topic-map/failure-build-and-deps.md) records Sonatype measuring
**28% of ~37,000 LLM-assisted dependency upgrades as hallucinated
packages/versions** — this fleet's own agents are the population that statistic
describes.

**Dropped: `gradle-plugin-dev`.** Its content is 80% standards enforced while
editing a `*.gradle.kts` file, which `gradle-build` already globs; writing them
as a skill makes them fire probabilistically where they must be constant
(conflict 6). The one-shot scaffolding half survives as a "new plugin checklist"
section inside `gradle-build/plugin-authoring.md`. **Assumption named:** the
requester's emphasis on Gradle plugin development is honoured by *two* depth
files' worth of GRADLE-PLUG rows and three wave-2 dives, not by a skill slot. If
the owner wants the scaffold procedure as a third artifact, it displaces
`jvm-dependency-triage`.

### Bundle

**`jvm-essentials`** — the four rules with their support directories, plus both
skills. Members carry **no tag at all**, per the catalog's bundle convention
(every `bundles/*.toml` states it identically). Each entry needs
`description = { readme = "docs/<name>.md", logo = "assets/lore-java.svg" }`;
none of `docs/jvm-*.md`, `assets/lore-java.svg` or `assets/glyphs/java.svg`
exist yet ([cfg](jvm-audit/config-inventory.md) Axis 1.3), so the authoring pass
creates them or every JVM package falls back to the repo README — a shipped bug
in the publish contract.

### Explicitly not in scope

| Not covered | Why |
|---|---|
| Android, AGP, Compose | Zero consumers, and the one Android exemplar (`nowinandroid`) is in the corpus purely as a convention-plugin shape. AGP appears only inside the KGP compatibility table (M-A-08), because a version mismatch there breaks a *Gradle* build |
| Kotlin Multiplatform, Kotlin/Native, Kotlin/JS | The frame excludes them, and [ckt](jvm-topic-map/canonical-kotlin.md) confirms the whole KMP surface (expect/actual visibility, KLib ABI validation, the `.jvm.kt` file-facade clash) is a separate discipline. One row survives as M-deferred, not as a rule |
| Scala, Groovy-the-language, Clojure | No exemplar, no consumer, and Groovy appears only as a *build-script DSL*, which `**/*.gradle` already covers |
| Spring beyond build and packaging facts | Spring Boot's layered jar, its nested-jar alternative to shading, its Jakarta EE 11 baseline and its JSpecify migration are all in scope because they are packaging and dependency facts. Spring as an application framework — DI, web, data — is a different rule set nobody asked for |
| App servers, Jakarta EE, servlet containers | Zero corpus evidence beyond the Spring Boot baseline row; writing them would be documentation with nothing to verify against |
| Writing a linter, a formatter or a Gradle plugin as a shipped artifact | The frame is explicit and the map agrees: the gate is the *existing* tools' configuration, stated in one line each. This program ships prose and globs, not code |
| Bazel mechanics that are not Java-specific | bzlmod, hermeticity, remote cache, CI target selection, flags — all owned by the sibling's twelve files ([cfg](jvm-audit/config-inventory.md) §2.3). `BZL-JAVA` restates none of them |
| Dokka and Javadoc as documentation-site generators | `docs-quality` owns generator wiring, and its table has no shape for an output-only API-doc generator ([cfg](jvm-audit/config-inventory.md) Axis 5). M-Y-06 records the gap and proposes fixing the sibling's file; this set does not grow a docs surface to fill it |
| JVM internals, GC tuning, JIT behaviour | Out of every scout's scope by design; the only exceptions are the two places a JEP changed an *authoring* concern (compact object headers as a default, AOT cache as a build artifact — M-Q-09) |

## Selected for wave 2

Six groups, fourteen dives. Chosen by the phase-3 order — uncovered first (every
row is uncovered; [cfg](jvm-audit/config-inventory.md) headline 1 is zero), then
leverage for the two future consumers, then "an area where agents demonstrably
get it wrong", then "a rule could actually check this".

**Why concurrency is not here.** It is the biggest agent-failure surface in the
corpus and it is the one area wave 1 already nailed down: two scouts fetched
JEP 444/491/506/525/533 directly and produced ~40 rows with named checks, JDK
numbers and Error Prone/Sonar rule IDs. A dive there buys confirmation. Wave 2
buys what wave 1 could not: version-pinned flag and API detail tested against
named exemplar evidence, in the areas the requester named and the two future
consumers need on day one. Concurrency leads wave 3, where the SDK's process
boundary needs it.

**Chase-the-surprise items named in the briefs**, each something the frame did
not anticipate and that is load-bearing: Gradle 9's reproducible-by-default
archives turning kafka's setting into an opt-out (M-D-11), the precompiled-script-plugin
version-catalog seam being the most-reacted open Gradle issue (M-B-03), 0/32
lockfiles and 1/32 verification metadata against a requester hypothesis that
called dependency management load-bearing (M-C-09/10), zero counterexamples to
"no library shades" (M-G-01), Error Prone's 150 silent `DISABLED_CHECKS`
(M-R-01), coverage gates at 3/32 (M-S-02), and Sonatype's 28%-hallucinated
LLM dependency upgrades (in the `dependencies` group).

### 1. `gradle-core` — the build that configures itself correctly

**Dive `config-cache-contract`** · family `GRADLE-CACHE` · label "The configuration-cache contract, and what Gradle 9 actually changed"

```
Settle what the configuration cache requires of build logic in Gradle 9.x, and
what "preferred with fallback" means in practice, so a rule can fail a diff
rather than describe a feature.

Fetch, primary only:
 - docs.gradle.org/current/userguide/configuration_cache_requirements.html
 - docs.gradle.org/current/userguide/isolated_projects.html
 - docs.gradle.org/9.0.0/release-notes.html and /9.7.0/release-notes.html
 - blog.gradle.org/road-to-configuration-cache
 - gradle/gradle issues #18520, #19793, #24040 (migration-friction cluster)

Pin down and write out as a table an agent can grep against: every disallowed
type at execution time (ClassLoader, Thread, Socket, Lock/Semaphore/CountDownLatch,
Project, Settings, SourceSet, Configuration), every configuration-time
disallowed operation (file reads, ProcessBuilder/Runtime.exec/ExecOperations.exec,
System.getenv()/getProperties() enumeration, BuildListener/TaskExecutionListener
registration), and the exact documented replacement for each
(providers.fileContents(...).asText, providers.exec(), ValueSource,
providers.environmentVariablesPrefixedBy(), @Inject FileSystemOperations /
ExecOperations). Name the CLI surface precisely:
--configuration-cache-problems=warn|fail, and the Gradle 9 change that
incompatible-task entries are now always discarded even in warning mode.

DECIDE: (a) is enabling the configuration cache a MUST, a SHOULD, or a
CONSIDER for an adopter on Gradle 9.x, given it is preferred-with-fallback and
the default moved to Gradle 11 — state the severity and the reason; (b) what is
the single command whose output a reviewer reads to answer "is this build
config-cache clean", and what does empty output mean; (c) is Isolated Projects
a gate today or a diagnostics-only exercise, given it reached incubating only
in 9.7.0 (2026-08-06) and its own release notes list two constraint categories
as not fully enforced.

Test against: gradle.properties across the corpus — 11/20 set
org.gradle.configuration-cache=true, 5/20 set org.gradle.isolated-projects=true
(nowinandroid, gradle/gradle, shadow, junit-framework, okhttp) and 0/20 set the
dead org.gradle.unsafe.isolated-projects key. Say explicitly which key is
current. Also cross-check Square's 2022 migration postmortem: the blockers were
third-party plugin compatibility (Anvil, Wire), not application code — if that
holds, the rule's first instruction is about dependencies, not about tasks.
```

**Dive `build-logic-and-catalog-seam`** · family `GRADLE-STRUCT` · label "build-logic versus buildSrc, and the accessor seam between them"

```
Settle the convention-plugin layout question and the one real ergonomic seam in
it, with enough specificity that a rule can name a fix rather than a preference.

Fetch, primary only:
 - docs.gradle.org/current/userguide/best_practices_structuring_builds.html
 - docs.gradle.org/current/userguide/sharing_build_logic_between_subprojects.html
 - docs.gradle.org/current/userguide/version_catalogs.html
 - blog.gradle.org/best-practices-naming-version-catalog-entries
 - gradle/gradle#15383 (387 reactions — read the full thread, not the title)
 - jjohannes/gradle-project-setup-howto README (a concrete convention-plugin taxonomy)

Pin down: the exact invalidation difference (any buildSrc change invalidates the
whole configuration phase; an included build invalidates only its consumers);
the two documented caveats where buildSrc or a special-cased included build is
still right (Settings plugins needing pluginManagement inclusion, which reduces
build caching — hence a separate minimal build-logic-settings; and
very-large-subproject-count builds where per-subproject classpath variation
breaks Build Services); and the current state of #15383 — whether type-safe
catalog accessors are reachable from a precompiled script plugin today, what the
supported workaround is, and whether any of it changed in 9.x.

DECIDE: (a) severity for "use an included build-logic build" — the map's
adjudication says SHOULD, confirm or overturn it against these sources;
(b) what a build-logic module should do *instead* when it needs catalog
coordinates, stated as code, not as a complaint; (c) whether the
build-logic-settings split is a MUST for anyone shipping a Settings plugin
(which the future OCX Gradle plugin will be — it provisions tools before
projects configure).

Test against: 10 corpus repos on an included build (gradle/gradle with
build-logic-settings/build-logic-commons/build-logic; ktor with
build-settings-logic/build-logic/ktor-test-server; junit-framework with
gradle/base + gradle/plugins; detekt; shadow's gradle/build-logic; okhttp;
ktlint; nowinandroid; apollo-kotlin; sqldelight's camelCase buildLogic) versus 9
still on buildSrc (dagger, grpc-java, Exposed, micronaut-core, mockito,
kotlinx.coroutines, spring-boot's 249-file/25907-LOC buildSrc, testcontainers-java,
NullAway). A rule that calls buildSrc a defect flags nine flagships; say so.
```

**Dive `task-inputs-and-cache-hits`** · family `GRADLE-CACHE` · label "Task inputs, path sensitivity, and why the cache misses"

```
Produce the annotation and normalisation reference a task author needs, plus the
reproducible-archive answer for Gradle 9 — the map's sharpest measured surprise.

Fetch, primary only:
 - docs.gradle.org/current/userguide/incremental_build.html (full annotation table)
 - docs.gradle.org/current/userguide/best_practices_tasks.html
 - docs.gradle.org/current/userguide/java_gradle_plugin.html (validation at jar time)
 - gradle/gradle .../userguide/unused/validation_problems.adoc (31 problem IDs)
 - docs.gradle.org/9.0.0/release-notes.html (archive reproducibility)
 - reproducible-builds.org/docs/jvm/

Pin down: every incremental-build annotation and what it changes
(@Input/@InputFile/@InputDirectory/@InputFiles/@OutputFile/@OutputDirectory/
@Nested/@Internal/@Console/@SkipWhenEmpty/@NormalizeLineEndings), the
@PathSensitive levels and Gradle's own per-kind recommendation (NONE for files,
RELATIVE for directories), and the @Classpath versus @CompileClasspath
distinction including exactly what @CompileClasspath ignores (everything but
ABI-affecting class changes). List the 31 validation-problem IDs and mark which
are caching-correctness rather than style (disable_caching_by_default,
implicit_dependency, cacheable_transform_cant_use_absolute_sensitivity,
artifact_transform_should_not_declare_output).

CHASE THE SURPRISE — this is the dive's most valuable output. Gradle 9.0.0's
release notes say archive tasks are reproducible by default. Establish exactly
what that flipped (which properties, on which task types, from which defaults),
then resolve what apache__kafka@940c100fab:build.gradle:361-364 now does: it sets
reproducibleFileOrder = false and preserveFileTimestamps = true while the repo
runs Gradle 9.7.1. Is that an active opt-out of reproducibility? If yes, the
"set preserveFileTimestamps = false" advice everyone repeats is now the wrong
shape and the rule must read the Gradle version first and then look for an
opt-out. Verify against the other two real hits:
diffplug__spotless@dc2a4cb9a3:gradle/java-publish.gradle:208-209 and
micronaut-projects__micronaut-core@d5842045bb:buildSrc/src/main/groovy/io.micronaut.build.internal.convention-base.gradle:74-75.

DECIDE: (a) the severity and exact wording of the reproducible-archive rule for
Gradle 9+ versus Gradle 8; (b) whether `validatePlugins` should be a MUST-run
task rather than a jar-time warning, and what command a CI job runs.
```

### 2. `gradle-plugin-dev` — the plugin as a product

**Dive `plugin-contract-and-validation`** · family `GRADLE-PLUG` · label "What a Gradle plugin must not do, and how the build proves it"

```
Write the contract a published Gradle plugin honours, with the OCX Gradle plugin
as the specific consumer: a Settings plugin that provisions tools by shelling to
`ocx --format json` before projects configure.

Fetch, primary only:
 - docs.gradle.org/current/userguide/java_gradle_plugin.html
 - docs.gradle.org/current/userguide/implementing_gradle_plugins_binary.html
 - docs.gradle.org/current/userguide/best_practices_general.html
 - docs.gradle.org/current/userguide/configuration_cache_requirements.html (plugin-author half)
 - docs.gradle.org/current/userguide/upgrading_major_version_9.html (plugin version floors)
 - docs.gradle.org/current/javadoc/deprecated-list.html (Gradle 10 removals)

Pin down and state as rules: no Gradle internal API (any package segment named
`internal`, any type suffixed Internal/Impl — Gradle says these break "during any
new Gradle release, even during minor releases"); no assuming another plugin is
applied (pluginManager.withPlugin is the replacement); no afterEvaluate (name
the three documented replacements: an extension function that runs immediately,
explicit opt-in for defaults, plugins.withId for cross-plugin coordination — the
one carve-out is validation scoped to your own plugin's state); every task
property annotated; a globally-unique reverse-DNS plugin id chosen deliberately
because it is permanent once published. Then the version floors as hard numbers:
a Kotlin-DSL plugin built with Gradle 9.x runs only on consumer Gradle >= 8.11
(Kotlin metadata version 2), a Groovy-DSL one on >= 7.0, minimum KGP 2.0.0.

Then the OCX-specific half. rules_ocx/AGENTS.md:65 forbids extension
implementations from reading module_ctx.os or getenv — repository rules only.
Establish the exact Gradle analogue: what must a Settings plugin do to read the
environment, run `ocx --format json env`, and hold the result for later tasks,
without breaking the configuration cache? Name the mechanism (ValueSource,
BuildService, Provider) and show the shape. Then answer the second half of
rules_ocx's contract: how does a spawned process get an explicitly-classified
environment (site/translucent/explicit/pinned) rather than inheriting ambient
env, using ExecOperations?

DECIDE: (a) the MUST list for a published plugin, five rows or fewer;
(b) whether ValueSource or BuildService is the right seat for the
`ocx --format json` read, with the reason; (c) what the plugin's own
`validatePlugins` and `--configuration-cache` CI steps look like, as commands.
```

**Dive `testkit-matrix-and-portal`** · family `GRADLE-PLUG` · label "Testing a plugin across versions, and getting it onto the Portal"

```
Settle how a plugin proves compatibility and how it ships, with named versions.

Fetch, primary only:
 - docs.gradle.org/current/userguide/test_kit.html
 - docs.gradle.org/current/userguide/publishing_gradle_plugins.html
 - docs.gradle.org/current/userguide/jvm_test_suite_plugin.html
 - plugins.gradle.org publishing docs for com.gradle.plugin-publish 2.x
 - GradleUp/shadow docs (plugin-publish auto-applies shadow since 1.0.0)

Pin down: the GradleRunner.withGradleVersion(...) cross-version pattern and how
it composes with a JvmTestSuite; the sharply-worded incompatibility — automatic
classpath injection via GradleRunner.withPluginClasspath() does not work for a
plugin that uses compileOnly on another plugin's API, symptom
ClassNotFoundException, fix is publishing to a local Maven repo and pulling from
there in the test's settings file; that TestKit runs builds in a separate
process via the Tooling API with its own daemons; and org.gradle.testkit.dir /
withTestKitDir() for working-directory control. Then the Portal side:
com.gradle.plugin-publish 2.0.0 requires Gradle 7.4+, auto-applies
java-gradle-plugin and maven-publish since 1.0.0, auto-signs when the signing
plugin is applied, auto-fat-jars when com.gradleup.shadow is applied; credentials
via gradle.publish.key/secret or GRADLE_PUBLISH_KEY/SECRET; `publishPlugins
--validate-only`; a manual approval process measured in days. Establish when the
bundled Compatibility Plugin went stable (reported as March 2026) and what it
changes about what a plugin declares.

DECIDE: (a) what the minimum defensible TestKit matrix is for a plugin claiming
support for a Gradle range — name the legs (declared floor, current stable,
release-candidate) and whether a configuration-cache leg is separate;
(b) whether shading a plugin's dependencies (which plugin-publish does for you)
is right or whether relocation is required, given M-G-04; (c) the exact
gradlePlugin{} metadata set a Portal submission needs.

Test against: gradle__actions@a27deee331:.github/workflows/integ-test-provision-gradle-versions.yml
(matrix 6.9 → 7.1.1 → release-candidate → current, with
ci-check-and-unit-test.yml:33 pinning 8.14.2 for the primary job);
detekt__detekt@45672efb8b:build.gradle.kts:79-88 (a parallel
detektFunctionalTestMinSupportedGradle task) and detekt-gradle-plugin/build.gradle.kts:229-231
(validatePlugins { enableStricterValidation = true });
GradleUp__shadow@541b3be475:build.gradle.kts:138,166 (gradleTestKit() inside a
dedicated JvmTestSuite("functionalTest")).
```

### 3. `dependencies` — what version wins, and can you trust it

**Dive `declaration-and-catalogs`** · family `GRADLE-DEP` · label "api versus implementation, and the catalog that does not pin"

```
Settle Gradle dependency declaration for a library author, which is the OCX SDK's
day-one decision, and the two things practitioners reliably blur about catalogs.

Fetch, primary only:
 - docs.gradle.org/current/userguide/java_library_plugin.html (the api/implementation contract)
 - docs.gradle.org/current/userguide/java_platform_plugin.html
 - docs.gradle.org/current/userguide/dependency_versions.html (rich versions)
 - docs.gradle.org/current/userguide/version_catalogs.html
 - docs.gradle.org/current/userguide/best_practices_dependencies.html
 - autonomousapps/dependency-analysis-gradle-plugin README + wiki FAQ

Pin down: the precise definition of an api dependency (a type appearing in a
public superclass or interface, a public method parameter or return type, a
public field, or a public annotation) versus implementation (everything used
only in method bodies or private members), and Gradle's own rule of thumb
("prefer implementation when possible"); the four things DAGP's projectHealth
reports (unused, used-transitive-should-be-direct, wrong configuration, unused
annotation processors) plus its plugin-applied-but-unused advice, and why
`fixDependencies --upgrade` is the safe mode (it never removes or downgrades —
which matters precisely because an unused-looking dependency may be needed by a
*consumer*); the rich-version hierarchy strictly/require/prefer/reject with the
`!!` shorthand and what is lossy when published to a POM; and the exact
statement that a version catalog constrains *declared* versions only, never
resolved ones.

DECIDE: (a) the verification cell for the api/implementation rule — name the
command a reviewer runs and say what empty output means, given the failure
surfaces at the consumer's compile task and not the declaring module's;
(b) whether enforcedPlatform() is ever acceptable and under exactly what
condition; (c) whether a version catalog alone satisfies "versions are pinned"
or whether the rule must pair it with locking or platform alignment.

Test against: spring-projects__spring-boot@93b23c40c2 is the corpus's only
enforcedPlatform() user (13 hits) and it is a library — the exact case the docs
warn against; api/implementation counts run 2051/1620 in gradle/gradle and
1045/350 in spring-boot; 15/25 repos have a conventional catalog while
apollographql__apollo-kotlin@c145295b72 names its gradle/libraries.toml — say
what a glob or grep can and cannot see.
```

**Dive `locking-verification-supply-chain`** · family `GRADLE-DEP` · label "Locking, verification, and the 28% problem"

```
Settle what a JVM build can actually guarantee about the bytes it resolves, and
say plainly which parts are a new commitment rather than a codified convention.

Fetch, primary only:
 - docs.gradle.org/current/userguide/dependency_locking.html
 - docs.gradle.org/current/userguide/dependency_verification.html
 - docs.gradle.org/current/userguide/filtering_repository_content.html
 - github.com/gradle/wrapper-validation-action (and gradle/actions/wrapper-validation)
 - central.sonatype.org/publish/publish-portal-guide (namespace verification)
 - sonatype.com/state-of-the-software-supply-chain/2026/open-source-malware
 - aikido.dev/blog/maven-central-jackson-typosquatting-malware
 - slsa.dev/spec/v1.1/levels; github.com/ossf/scorecard docs/checks.md

Pin down: the locking commands and on-disk shapes (`dependencies --write-locks`,
`--update-locks group:module`, gradle.lockfile per project,
buildscript-gradle.lockfile, lockAllConfigurations(), LockMode STRICT vs LENIENT),
the documented incompatibility with changing/-SNAPSHOT versions, and the fact
that a failed build does not persist lock changes. Then verification: the
bootstrap command (`--write-verification-metadata sha256,pgp`), the exact
failure message on an unverified new dependency, that only SHA-256/SHA-512 count
as secure, that signature verification is PGP-only and proves signing not
legitimacy, and the documented chicken-and-egg — bootstrapping "trusts whatever
is currently in your repositories", so the reviewed diff is the control, not the
file.

CHASE THE SURPRISE: 0/32 exemplars carry a real lockfile (the single
gradle.lockfile hit in the whole corpus is a documentation snippet inside
gradle/gradle's own docs tree) and 1/32 carries verification-metadata.xml
(gradle/gradle, 1030 lines, verify-metadata=false / verify-signatures=true, 258
trusted keys). The requester's hypothesis 6 called dependency management
load-bearing; that is true for BOM/platform alignment and false for
locking/verification. Say which half is which, and write the locking rule as a
new commitment with its cost stated, not as a codification of practice.

Then the agent-specific row, which is why this dive matters to this fleet:
Sonatype analysed ~37,000 LLM-assisted dependency upgrades across
Maven/npm/PyPI/NuGet and found 28% referenced hallucinated packages or versions.

DECIDE: (a) severity for locking and for verification, separately, for an
adopter and for the OCX SDK; (b) the exact validation step an agent must run
before proposing any dependency version bump, as a command; (c) whether
repository content filtering is a MUST given internal coordinates are otherwise
resolvable from a public repo.
```

**Dive `maven-mediation-and-enforcer`** · family `MVN-DEP` · label "Nearest wins, and the enforcer rules nobody enables"

```
Settle Maven's resolution semantics and its mechanical guards, so the JVM set can
state a three-build-system equivalence rather than describing Gradle twice.

Fetch, primary only:
 - maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html
 - maven.apache.org/pom.html (scopes, inheritance, combine.children/combine.self, version ranges)
 - maven.apache.org/enforcer/enforcer-rules/index.html (v3.6.3, 2026-05-15)
 - maven.apache.org/pom/asf/ (what a widely-inherited parent actually enforces)
 - maven.apache.org/whatsnewinmaven4.html (bom packaging, consumer POM)
 - bazel-contrib/rules_jvm_external README (version_conflict_policy, maven.install boms)

Pin down: mediation is nearest-definition by tree depth with declaration order
as the tiebreak, and a direct declaration always wins; dependencyManagement
precedence order (own POM, then parent, then mediation) and why that is a
different mechanism from mediation itself; the scope propagation table; and the
full built-in enforcer rule list with the five that catch drift and supply-chain
problems — banDynamicVersions, banDuplicatePomDependencyVersions,
dependencyConvergence, requireUpperBoundDeps, requirePluginVersions with its
banLatest/banRelease/banSnapshots sub-flags. State plainly that enforcer ships
with zero rules active and every one needs an <execution> binding.

Then produce the deliverable this group exists for: a **BOM and pinning
equivalence table** across Gradle (java-platform, platform() vs
enforcedPlatform(), dependency locking), Maven (dependencyManagement with
scope=import, Maven 4's dedicated bom packaging and classifier import, enforcer
convergence, no native lockfile) and Bazel (maven.install(boms=...),
maven_install.json as a mandatory-by-convention build input,
version_conflict_policy = "pinned"). Name what each mechanism does and does not
guarantee.

DECIDE: (a) whether the JVM rule set tells a Maven adopter to bind enforcer, and
which rules, at what severity; (b) whether the OCX SDK's published POM needs
anything Maven-specific beyond complete metadata, given it will be Gradle-built
but Maven-consumed; (c) whether Maven 4's bom packaging is usable yet — settle
the GA question first with a Central query for org.apache.maven:maven-core:4.0.0
and report the answer, because the whole map currently hedges at rc-6.

Test against: assertj is the corpus's only dependencyConvergence user;
banDuplicatePomDependencyVersions is 0/32; guava binds 8 enforcer executions but
uses them for requireJavaVersion/requireMavenVersion, not convergence; assertj
and guava both pin every plugin version in pluginManagement rather than relying
on super-POM defaults.
```

### 4. `distribution` — what actually ships

**Dive `shading-failure-taxonomy`** · family `GRADLE-DIST` · label "Every way a fat jar breaks silently"

```
Produce the complete, checkable failure taxonomy for merged jars, in both Gradle
and Maven, so a rule can name the transformer or the exclusion rather than
warning vaguely about shading.

Fetch, primary only:
 - gradleup.com/shadow/ and /configuration/merging/ and /configuration/relocation/
 - maven.apache.org/plugins/maven-shade-plugin/ (transformers, filters, dependency-reduced POM)
 - GradleUp/shadow#729 (module-info.class inside META-INF/versions)
 - melix/jmh-gradle-plugin#5 (signed-jar SecurityException)
 - docs.spring.io/spring-boot/reference/packaging/efficient.html (the non-merging alternative)

Pin down, each with the exact fix as code: ServiceLoader provider files
(META-INF/services/*) vanishing under the default first/last-wins duplicate
strategy — mergeServiceFiles() / ServicesResourceTransformer, with the path=
and per-service exclude options; Log4j2Plugins.dat needing
Log4j2PluginsCacheFileTransformer; Spring's spring.factories and
spring/*.imports, which Shadow's own merging page does not cover — establish
whether an AppendingTransformer handles them and say so either way; the signed-jar
SecurityException ("Invalid signature file digest for Manifest main attributes")
and why excluding META-INF/*.SF/*.DSA/*.RSA/*.EC is the only fix and re-signing
is not; multi-release jars leaking module-info.class from META-INF/versions/<N>/
and which Shadow version made the exclusion a default; split packages across two
shaded libraries breaking JPMS with no transformer that can fix it; and what
minimize() cannot see (reflection, ServiceLoader, SPI).

DECIDE: (a) the MUST list for anyone who shades at all, as a short block with
one verification each; (b) whether minimize() is safe to recommend, and under
what precondition; (c) what Maven Shade's dependency-reduced POM changes for a
consumer, and whether it is required.

Test against, reading the actual shading module in each rather than the grep:
uber__NullAway@519a1bb826 (jar-infer-cli, jdk-javac-plugin,
astubx-generator-cli — mergeServiceFiles at jar-infer-cli/build.gradle:39, no
relocation), pinterest__ktlint@4c933394a3 (ktlint-cli/build.gradle.kts:18),
detekt__detekt@45672efb8b (detekt-cli plus a ktlint-repackage vendoring step
that does relocate), grpc__grpc-java@fc4314419d:netty/shaded (Netty vendoring),
google__error-prone@c1f99ad5d3 (Maven <relocation> because it loads into javac).
Note that grpc-java's and dagger's "preserveFileTimestamps" hits are a hand-written
Transformer method parameter, not the Gradle property — a plain grep over-counts.
```

**Dive `distribution-shape-decision`** · family `GRADLE-DIST` · label "Fat jar, nested jar, runtime image, installer, or container"

```
Turn the map's conflict-1 adjudication into a decision tree with preconditions,
so an agent picks a shape instead of defaulting to a fat jar.

Fetch, primary only:
 - docs.gradle.org/current/userguide/application_plugin.html and distribution_plugin.html
 - docs.spring.io/spring-boot/gradle-plugin/packaging.html (layered jars, layer order)
 - docs.spring.io/spring-boot/reference/packaging/efficient.html (nested layout, jarmode extract)
 - openjdk.org/jeps/493 (jlink without JMODs, JDK 24) and the jlink/jpackage tool docs
 - youtrack.jetbrains.com SUPPORT-A-2700 (jlink + automatic module)
 - cloud.google.com/java/getting-started/jib or the Jib plugin docs

Pin down the precondition for each shape, not its marketing: the application
plugin's start-script distribution (works everywhere, no merge, no
class-identity change); Spring Boot's nested BOOT-INF layout (dependency jars
stay intact, so none of the shading failure modes apply; costs a nested-jar
classloading startup penalty erasable with `java -Djarmode=tools -jar app.jar
extract`); layered jars and the documented layer order
dependencies → spring-boot-loader → snapshot-dependencies → application, and why
reordering defeats the whole feature; jlink (needs every module on the module
path to be a real module — an automatic module makes jlink refuse, and the fix
is exclude-and-classpath or find a modularised replacement; since JDK 24 no
JMODs on disk are needed); jpackage (per-OS signing and notarization); Jib and
plain Dockerfile.

DECIDE, and this is the file's spine: a routing question an agent can answer
in one read — "is this thing invoked as a program, loaded as a plugin into
someone else's process, or declared as a dependency and called through its API?"
— mapping to a shape, with the MUST "a consumable library is never shaded"
stated first. Also decide whether the OCX SDK ships anything executable at all,
or purely a library jar plus the published POM.

Test against: application-plugin usage is 7/32 and skews toward sample and
example modules rather than the library's own distribution (apollo-kotlin,
grpc-java, Exposed); spring-boot's 383 bootJar/boot-plugin hits are dominated by
its own smoke-test and sample modules, not 383 shipped executables;
testcontainers-java's 62 Dockerfiles are per-database test fixtures. Do not cite
raw grep counts from those two repos without the per-real-module caveat.
```

### 5. `quality-gates` — what fails the build

**Dive `java-lint-gate`** · family `JAVA-LINT` · label "The Java gate of record, and the 150 checks that are silent"

```
Write the Java static-analysis gate as a configuration, not a tool list: which
tools, which checks, which severities, and what an agent turns on that is off by
default.

Fetch, primary only:
 - github.com/google/error-prone .../scanner/BuiltInCheckerSuppliers.java (the real enabled/disabled lists)
 - errorprone.info/bugpatterns (per-check pages, for the ones you promote)
 - github.com/uber/NullAway/wiki/Configuration and /wiki/JSpecify-Support
 - docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html (the -Xlint key list)
 - checkstyle google_checks.xml and sun_checks.xml (the shipped rulesets themselves)
 - spotbugs/etc/messages.xml; find-sec-bugs docs
 - jspecify.dev/blog/release-1.0.0

Pin down: the three disjoint Error Prone sets from source, not from the docs
page — ENABLED_ERRORS (187), ENABLED_WARNINGS (312), DISABLED_CHECKS (150) — and
name the disabled checks worth promoting for agent-written code, each with the
mistake it catches: DefaultLocale, StringCaseLocaleUsage, EqualsMissingNullable,
FieldMissingNullable, VoidMissingNullable, CatchingUnchecked, UnusedException,
ConstantPatternCompile, UnnecessaryDefaultInEnumSwitch. Give the exact switch
syntax (-Xep:Name:ERROR) and how it is set in Gradle and in Maven. For NullAway:
AnnotatedPackages versus OnlyNullMarked (0.12.3+, mutually exclusive, neither
crashes the build), JSpecifyMode versus JSpecifyExperimental, and the toolchain
precondition (JDK 22+, or 17.0.19+/21.0.8+ with -XDaddTypeAnnotationsToSymbol=true,
else IllegalStateException). For javac: the post-Java-8 -Xlint keys an agent's
priors predate — this-escape, dangling-doc-comments, restricted,
missing-explicit-ctor, output-file-clash, lossy-conversions, identity/synchronization.

DECIDE: (a) the gate of record for a JVM project in 2026, stated as a short
config block per build system, and whether PMD appears at all; (b) whether to
start from google_checks.xml or sun_checks.xml, given they enable 89 and 73
modules with a large symmetric difference and 7 of 8 real corpus users fork
heavily; (c) whether SpotBugs earns a place without find-sec-bugs.

Test against, as the strictest and most lenient poles:
junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.java-errorprone-conventions.gradle.kts:52-63
(onlyNullMarked, jspecifyMode, checkContracts, a short error(...) promotion list
and a short disable(...) list with a reason each) and
uber__NullAway@519a1bb826:build.gradle:84-113 (-Werror plus 14 checks forced to
ERROR) against FasterXML__jackson-databind@a906e1782b:pom.xml:359-417 (one check
at ERROR, ~20 turned OFF). Error Prone is 13/32, NullAway 4/32, JSpecify 9/32 but
NullAway's JSpecify-native mode only 2/32, jsr305 13/32 — write the coexistence
note, not a bare "use JSpecify".
```

**Dive `test-suite-and-coverage`** · family `JAVA-TEST` · label "The test gate, and why coverage numbers here mean nothing"

```
Settle the test-suite and coverage configuration for both languages, and
separate what the corpus practises from what this program will require of its own
SDK.

Fetch, primary only:
 - docs.junit.org/6.0.0/release-notes.html and docs.junit.org/current/user-guide/
   (parallel execution, @ResourceLock, @Isolated, junit-platform.properties keys)
 - docs.gradle.org/current/userguide/jvm_test_suite_plugin.html and java_testing.html
 - maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html
 - jacoco.org docs (violationRules / jacocoTestCoverageVerification / Maven <rules>)
 - kotlin.github.io/kotlinx-kover docs (verify, minBound)
 - kotlinlang.org kotlinx-coroutines-test README (runTest semantics)

Pin down: JUnit 6.0.0's floor (Java 17, Kotlin 2.2), unified artifact
versioning, JSpecify annotations, JFR folded into junit-platform-launcher, and
junit-platform-runner discontinued — with the migration path for anything using
it; the junit-platform.properties keys that matter
(execution.parallel.enabled/mode.default/config.strategy,
extensions.autodetection.enabled, output.capture.*) and which the corpus sets;
@ResourceLock/@Isolated semantics and the fact that this is still actively
changing upstream; Surefire's single JUnit-Platform provider and that the
released line is 3.6.0-M1, a milestone; the exact JaCoCo and Kover constructs
that make a threshold *fail a build* rather than print a report.

DECIDE: (a) the rule that separates "a coverage tool is configured" from "a
coverage floor is enforced", with the grep or task that tells them apart;
(b) the coverage severity split the map adjudicated — a hard numeric floor as a
pinned decision for the OCX SDK, CONSIDER for adopters — confirm or overturn it;
(c) which coverage tool for Kotlin and why, given JaCoCo mis-reads inline
functions and synthetic accessors; (d) whether test retry belongs in the rule set
at all.

Test against: only 3/32 repos fail a build on a coverage number —
assertj__assertj@485502bad2:assertj-parent/pom.xml:114-176 (CLASS 100%,
INSTRUCTION/METHOD/BRANCH/COMPLEXITY/LINE 80% each, bound to default-check, and
notably a Maven repo),
junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.jacoco-aggregation-conventions.gradle.kts:24-29
(minimum = 0.90 on the aggregate, disabled when predictive test selection is
active), and
Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/kover-conventions.gradle.kts:56,69
(minBound(85) with a per-project override map). Twelve more repos wire JaCoCo and
stop at the report. Also: 0/32 pin a test timezone, while
google__guava@5fb424c43a:pom.xml:384 deliberately runs its suite under
-Duser.language=hi -Duser.country=IN — decide whether a TZ pin becomes a rule.
```

### 6. `language-api` — the surface the SDK publishes

**Dive `java-api-evolution-and-nullness`** · family `JAVA-API` · label "A Java public API that can survive its second release"

```
Write the rules for a Java library's public surface and its evolution, aimed
squarely at the OCX SDK's day-one design.

Fetch, primary only:
 - docs.oracle.com/javase/specs/jls/se25/html/ chapter 13 (Binary Compatibility)
 - openjdk.org/jeps/277 (enhanced deprecation), /409 (sealed), /441 (pattern switch), /440 (record patterns)
 - inside.java/2024/05/23/dop-v1-1-introduction (v1.1, not the 2022 essay)
 - jspecify.dev/docs and /blog/release-1.0.0
 - openjdk.org/projects/jigsaw/quick-start; the module-info directive reference
 - japicmp and revapi documentation; Animal Sniffer's own docs

Pin down: which source-compatible changes are binary-incompatible (widening a
parameter type, adding an overload that changes resolution, changing a constant's
value, adding an abstract method to an interface without a default); the JEP 277
rules (@Deprecated(forRemoval, since) and the Javadoc @deprecated tag "both
present or both absent", forRemoval only with a definite plan); sealed-hierarchy
exhaustiveness and how an `else`/`default` branch silently absorbs a new
permitted subtype in a *downstream* consumer; the JSpecify annotation set and
what @NullMarked at package or module scope actually changes for a Kotlin caller.

Then answer the question the corpus leaves open and the map flagged
(gates §5): **there is no single Java equivalent of Kotlin's BCV**. Compare
japicmp, revapi (0/32 in the corpus), Animal Sniffer (6/32, and it checks a
signature surface, not a diff) and gradle/gradle's bespoke accepted-changes
JSON allowlist. Say which one the OCX SDK should adopt, what it costs, and where
the accepted-breaks list lives.

DECIDE: (a) the MUST list for a published Java API, five rows or fewer, each with
a verification; (b) which binary-compatibility tool the SDK gates on and at which
lifecycle point (before upload, per M-H-10's immutability); (c) whether the SDK
declares module-info.java or Automatic-Module-Name — the corpus says libraries
pick one, rarely both (module-info 12/32, Automatic-Module-Name 10/32, largely
different repos), so pick, and say what the choice costs a non-modular consumer.

Test against: junit-framework ships 19 module-info files and okhttp 15;
grpc-java sets Automatic-Module-Name in 28 places and no module-info; guava
carries 3 module-info files and still targets Java 8 bytecode.
```

**Dive `kotlin-api-and-abi`** · family `KT-API` · label "A Kotlin public API, and the ABI gate that is mid-migration"

```
Write the rules for a Kotlin library's public surface, and settle the one tooling
question the corpus explicitly leaves contested.

Fetch, primary only:
 - kotlinlang.org/docs/api-guidelines-backward-compatibility.html (the densest page in the corpus)
 - kotlinlang.org/docs/api-guidelines-simplicity.html and -readability.html and -predictability.html
 - kotlinlang.org/docs/coding-conventions.html#coding-conventions-for-libraries
 - kotlinlang.org/docs/opt-in-requirements.html
 - kotlinlang.org/docs/java-to-kotlin-interop.html (overloads generation)
 - kotlinlang.org/docs/gradle-binary-compatibility-validation.html
 - github.com/Kotlin/binary-compatibility-validator README (the maintenance-mode notice)

Pin down with the exact bytecode consequence, quoting the NoSuchMethodError
signatures kotlinlang prints: adding a default-valued parameter; widening AND
narrowing a return type; a data class in a public API gaining a property
(constructor and copy() both change); @JvmOverloads not preserving binary
compatibility for Kotlin callers versus @IntroducedAt under
@OptIn(ExperimentalVersionOverloading::class); @PublishedApi binding an internal
declaration to public rules; adding a @Target value silently redirecting
Java-reflection lookups from field to property; and the sanctioned
@Deprecated(message, replaceWith, level) removal cycle, including why
@RequiresOptIn is the wrong tool for an already-shipped declaration.

DECIDE, and this is the deliverable: **standalone binary-compatibility-validator
or the in-KGP abiValidation {} block, for a greenfield library starting today.**
The standalone plugin declares itself maintenance-mode and redirects to the KGP
feature; the KGP feature requires @OptIn(ExperimentalAbiValidation::class);
5/32 corpus repos run the standalone one (apollo-kotlin 28 .api files,
sqldelight 9, dagger 6, Exposed 21, okhttp 13) and 0 run abiValidation. Pick one,
name the task names (apiDump/apiCheck versus updateKotlinAbi/checkKotlinAbi),
say what the migration costs if the direction of travel completes, and say what
a rule authored today should tell an adopter who already runs the standalone one.

Also DECIDE: (a) whether explicitApi() is a MUST for a published module and what
CI failure it produces; (b) the three-rule library checklist from the coding
conventions (always specify visibility, always specify return and property types,
KDoc every public member) — severity and verification for each; (c) whether the
SDK's public API may take a Boolean argument or expose a data class at all.

Test against: explicitApi is 5/32 and ktor sets explicitApi = null per module at
ktorio__ktor@f92fad0435:build-logic/src/main/kotlin/ktorbuild.project.internal.gradle.kts:11;
kotlinx.coroutines uses the compiler-flag form -Xexplicit-api=strict at
Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/configure-compilation-conventions.gradle.kts:19.
ktlint and detekt both carry .api dump files with no locatable plugin
application in the checked-out slice — resolve where their BCV wiring lives
before citing them either way.
```

## Staged for wave 3

Six groups, fourteen dives, written to the same standard so wave 3 launches
mechanically the moment wave 2's consolidations land. **Four briefs must be
revised first**, marked below with the wave-2 result they depend on.

### 1. `concurrency` — the correctness surface agents get wrong most

**Dive `java-virtual-threads-and-structured-concurrency`** · family `JAVA-CONC` · label "Virtual threads after JDK 24, and a preview API that will not stand still"

```
Write the Java concurrency rules with a JDK number on every version-sensitive
row, and settle what a rule may say about an API in its seventh preview.

Fetch, primary only: openjdk.org/jeps/444 (virtual threads, final JDK 21),
/491 (synchronize without pinning, JDK 24), /506 (scoped values, final JDK 25),
/525 (structured concurrency 6th preview, JDK 26), /533 (7th preview, JDK 27,
GA 2026-09-15); the JDK 25 javadoc for StructuredTaskScope and
java.util.concurrent; jcip.net/contents.html for the pre-Loom baseline.

Pin down: JEP 444's two absolutes ("a new virtual thread should be created for
every application task", "should never be pooled"); exactly what JEP 491 fixed in
JDK 24 (monitors acquired, held and released independently of the carrier, so
synchronized/wait/notify no longer pin) and exactly what it did not (blocking
while resolving a class reference, blocking inside a class initializer, waiting
on another thread's class initialization); that jdk.tracePinnedThreads was
REMOVED in JDK 24 and setting it now does nothing, leaving the
jdk.VirtualThreadPinned JFR event as the only detector; ScopedValue's finalised
shape including that orElse no longer accepts null; and the full
StructuredTaskScope changelog across previews — fork() returning Subtask not
Future, constructors replaced by open()/open(Joiner), Joiner's built-in
factories, allSuccessfulOrThrow() changing from a stream to a list, onTimeout()
added then renamed to timeout() with CancelledByTimeoutException, a third type
parameter for the thrown exception type, awaitAll() removed.

DECIDE: (a) the exact wording of the synchronized-versus-ReentrantLock rule for
a project whose floor is JDK 17 or 21 versus one at 24+, because a single
unconditional sentence is wrong for one of them; (b) whether shipped code may
use StructuredTaskScope at all, and if so under what guard; (c) the rule for
bounding fan-out when virtual threads have removed the platform-thread ceiling
that used to throttle it accidentally, naming the downstream resources that
still have limits (connection pools, native libraries, rate-limited APIs).

Test against: jackson-core#919 is a flagship library auditing its own
ThreadLocal-based parser/buffer pooling ahead of virtual threads — use it as the
worked example for why per-thread caching fights the model. micronaut-core is
the corpus's only --enable-preview user (1/32), so preview-flag usage is not a
corpus norm and a rule recommending one must say so.
```

**Dive `kotlin-coroutines-correctness`** · family `KT-CORO` · label "Where a coroutine loses an exception or refuses to stop"

```
Write the coroutine rules from JetBrains' own wrong/right pairs, so each row
names a mistake rather than a principle.

Fetch, primary only: kotlinlang.org/docs/exception-handling.html,
/coroutine-context-and-dispatchers.html, /shared-mutable-state-and-concurrency.html,
/cancellation-and-timeouts.html; the kotlinx-coroutines-test README; the
Dispatchers KDoc; elizarov.medium.com "Kotlin and Exceptions" and "Structured
Concurrency" for the design rationale.

Pin down: that CoroutineExceptionHandler is consulted only on a root coroutine
(one created directly in a CoroutineScope/supervisorScope, or a direct child of
SupervisorJob) and has NO effect on async, whose exception surfaces only at
await(); that supervisorScope makes each direct child behave as an independent
root, which is not the same as being a child of a SupervisorJob; that
CancellationException is transparent to handlers by design and must be rethrown,
never swallowed by catch(Exception) or runCatching; the first-exception-wins
plus .suppressed aggregation rule; Dispatchers.IO's ceiling (64 threads or the
core count, whichever is larger, via kotlinx.coroutines.io.parallelism) and that
limitedParallelism(n) yields an elastic view reusing IO's own threads rather
than allocating new ones, so views do not sum; and runTest's three properties
(auto delay-skip, 60-second default timeout, end-of-test propagation of uncaught
child exceptions) plus StandardTestDispatcher versus UnconfinedTestDispatcher.

DECIDE: (a) the MUST list, five rows or fewer, each greppable — GlobalScope,
runBlocking inside suspend, handler on a non-root coroutine, swallowed
CancellationException, unbounded blocking work on Dispatchers.IO; (b) whether
"never use GlobalScope" is absolute or carries a named exception; (c) how a
review skill detects a missing cooperative-cancellation check in a long-running
loop, given there is no lint for it.

Also settle the corpus's one open Kotlin-testing question: whether
runTest's virtual time can hide a real suspension-point race that only appears
on a real dispatcher, and if so what a test must do about it.
```

**Dive `process-and-cli-boundary`** · family `JAVA-CONC` · label "Wrapping a CLI: the SDK's actual concurrency surface" · **REVISE after wave 2 and after owner Q1** — the language choice changes the seam, and the plugin-contract dive settles the Gradle-side mechanism

```
Design the process boundary for a JVM SDK that wraps a CLI one command at a
time, by translating ocx-sdk-python's measured contract rather than inventing one.

Read first, as the specification: ocx-sdk-python/src/ocx_sdk/_process.py:101-105,
383-421, 444-457, 762-799 (injectable PopenFactory/ExecFactory seams for the sync
and async paths, one-shot run_command, spawn, a kill ladder) and
_errors.py:28-46 (the 16-member ExitCode IntEnum mapped to an exception
hierarchy, never parsed from stderr text); rules_ocx/AGENTS.md:103-159 (the
two-tier CLI JSON contract), :161-178 (14 sysexits), :66-72 (every reachable
sysexit maps to a failure naming the fix, and 75 is retried before failing), and
:211-249 (OCX_ENV_CLASSES: 10 site, 4 translucent, 2 explicit, 5 pinned).

Fetch, primary only: the ProcessBuilder and Process javadoc for JDK 25
(destroy/destroyForcibly, waitFor(timeout), onExit, the redirect and
environment surfaces); docs.gradle.org ExecOperations and ValueSource; the
java.net.http HttpClient javadoc if the zero-dependency JSON question is live.

Pin down: how a JVM caller reads stdout and stderr concurrently without
deadlocking on a full pipe buffer; what a kill ladder looks like on the JVM
(destroy, wait, destroyForcibly, wait, report) and what each step guarantees on
POSIX and on Windows; how the child's environment is built explicitly rather
than inherited, matching the four OCX_ENV_CLASSES; and how the same boundary is
expressed on the Gradle-plugin side through ExecOperations under
configuration-cache rules.

DECIDE: (a) the seam — an interface with a constructor-injected factory, since
Java has no mockable process API; state it as a design MUST for the SDK;
(b) whether the async path uses virtual threads, Process.onExit's
CompletableFuture, or coroutines, and how that survives the Java-first/Kotlin-first
decision either way; (c) the retry rule for sysexit 75 and where it lives so it
cannot be forgotten; (d) whether the exit-code enum is generated from a shared
source or hand-maintained against the two prior-art files, and what keeps it
byte-identical.
```

### 2. `publishing` — getting an artifact out, and keeping consumers working

**Dive `central-portal-and-provenance`** · family `GRADLE-PUB` / `MVN-PUB` · label "The Central Portal runbook, and how far provenance has actually got"

```
Produce the release runbook that becomes the jvm-release skill, with every
requirement stated as a gate rather than a step.

Fetch, primary only: central.sonatype.org/publish/publish-portal-guide/,
/publish/requirements/, /publish/publish-portal-maven/, /register/central-portal/,
/pages/ossrh-eol/ and /news/20250326_ossrh_sunset/; the vanniktech
gradle-maven-publish-plugin and com.gradleup.nmcp READMEs; slsa.dev/spec/v1.1/levels;
the Sigstore-validation announcement dated 2025-01-28.

Pin down: namespace verification as a mandatory precondition and how it is
proven (DNS TXT, or GitHub repo ownership for io.github.*); the per-artifact
requirement set (sources jar, javadoc jar, a GPG/PGP signature per file, MD5 and
SHA1 checksums, a POM carrying name/description/url/licenses/developers/scm);
autoPublish and waitUntil (validated | uploaded | published) and what each
means for a CI job's exit; that SNAPSHOT publishing needs
central-publishing-maven-plugin >= 0.7.0; the OSSRH Staging API compatibility
shim as a bridge, not a target; and immutability as an absolute.

Then place the supply-chain bar honestly. Sigstore bundles are validated at the
Portal since 2025-01-28 but not required. Across all 32 exemplars, uses of
actions/attest-build-provenance, sigstore/cosign, dependency-review-action and
any container or dependency scanner are ZERO — including in bazelbuild/bazel and
gradle/gradle themselves. Establish which SLSA build level a normal GitHub
Actions release reaches, and state whether provenance attestation is a
forward-looking rule this program introduces deliberately or a practice it
codifies. It is not the latter; say so.

DECIDE: (a) the ordered gate list for the runbook, with the immutability
consequence stated first; (b) whether the tag-versus-declared-version check is a
MUST (ocx-sdk-python already does it); (c) whether Sigstore signing is a
SHOULD or a CONSIDER for the OCX SDK's first release.
```

**Dive `consumability-across-build-systems`** · family `GRADLE-PUB` · label "What a Maven, Gradle and Bazel consumer each see" · **REVISE after wave 2** — the `maven-mediation-and-enforcer` dive settles the Maven 4 GA question and the BOM equivalence table this one builds on

```
Settle what a library published from one build system looks like to consumers on
the other two, so the OCX SDK is consumable everywhere it is claimed to be.

Fetch, primary only: docs.gradle.org/current/userguide/publishing_gradle_module_metadata.html,
/publishing_maven.html, /java_platform_plugin.html; maven.apache.org/pom.html
(the consumer's view) and whatsnewinmaven4.html (build POM versus consumer POM);
bazel-contrib/rules_jvm_external README (java_export, maven.install boms,
version_conflict_policy).

Pin down: that Gradle Module Metadata is invisible to Maven by design — a Maven
consumer sees only the legacy POM, with a marker comment it cannot act on — so
any Gradle-only variant (a shadowJar publication, a feature variant, a KMP
target) simply does not exist for it and must be republished as a classified
artifact if it matters; what Maven 4's consumer-POM flattening changes about
what is published versus what is in source control, and that it is opt-in via
maven.consumer.pom.flatten=true; and how a Bazel consumer pins a Maven-published
artifact through maven_install.json regardless of what produced it.

DECIDE: (a) whether the OCX SDK suppresses GMM publishing or keeps it, and what
each choice costs; (b) whether a Maven-consumability verification module is
required — the corpus's own pattern, since dagger, grpc-java, okhttp, Exposed and
junit-framework all ship a small maven-tests/examples/maven module that proves
the published POM resolves, rather than carrying a second build system; (c) what
the SDK's published POM must declare that Gradle does not generate by default.

Test against: 0 of the 10 Gradle-tagged repos carrying a pom.xml build with both
systems; every incidental pom is either a Maven-consumability example
(dagger examples/maven, grpc-java examples/*, okhttp maven-tests, Exposed,
junit-framework tooling-support-tests) or a plugin's own integration-test fixture
(spring-boot's 170, gradle/gradle's 46). The "dual build system" reading of those
repos is a false positive; the real pattern is a consumability test.
```

### 3. `bazel-java` — the file the sibling set does not have

**Dive `bazel-java-toolchains-and-compilation`** · family `BZL-JAVA` · label "Two flag pairs, header compilation, strict deps, Error Prone under Bazel" · **REVISE after wave 2** — the `distribution-shape-decision` dive settles whether deploy jars are a recommended shape, and owner Q6 settles whether this file ships at all

```
Write the Java-toolchain half of the depth file the sibling bazel-quality set is
missing, routing into its twelve existing files rather than restating them.

Read first: .agents/research/bazel-topic-map.md's "Artifact set decision"
(read-only, on main) so the file matches the sibling's shape exactly — no
manifest glob of its own, task-worded routing, one BZL- family, and no restating
of bzlmod, hermeticity, caching, testing, CI, flags or architecture mechanics.

Fetch, primary only: bazel.build/docs/bazel-and-java; bazelbuild/rules_java
README and distro/relnotes.bzl; blog.bazel.build/2026/01/20/bazel-9.html;
bazel-contrib/rules_jvm README (contrib_rules_jvm: java_test_suite,
java_junit5_test, the checkstyle/PMD/SpotBugs wrappers).

Pin down: the two parallel flag pairs and their different defaults —
--java_language_version / --java_runtime_version for application code (runtime
defaults to local_jdk) versus --tool_java_language_version /
--tool_java_runtime_version for build tooling (defaulting to 11 /
remotejdk_11); remotejdk_* versus local_jdk for hermeticity; JavaBuilder's
--patch_module of java.compiler/jdk.compiler; header compilation via ijar/turbine
and what it buys; strict deps (--experimental_strict_java_deps) and what it
rejects; Error Prone under Bazel via --javacopt="-Xep:Name:ERROR" and
java_package_configuration for package-scoped overrides; and the order-dependent
toolchain resolution rule ("when multiple definitions for the same operating
system and CPU architecture are given, the first one is used").

DECIDE: (a) the MUST row for JDK pinning under Bazel, given grpc-java pins
nothing at all; (b) whether a bytecode-target-below-toolchain split is a
recommended pattern and how it is expressed; (c) whether contrib_rules_jvm's
lint wrappers belong in the file or are a CONSIDER.

Test against, all measured: bazelbuild/bazel@948b8c70e2:.bazelrc:70-73 pins
language, runtime AND tool versions at 25; rules_java@4206909b6d:.bazelrc:4-7
deliberately pins Java 8 because a rules repo must keep building for old
callers; rules_kotlin@7c51dd1210 pins only the runtime (remotejdk_17);
rules_jvm_external@449754dcbb pins 17 and sets --experimental_strict_java_deps=strict;
dagger@4fbc045d2b:.bazelrc:17,22-28 pins build/tool at 17 with
--javacopt="-source 8 -target 8" for output and one Error Prone severity
override; grpc-java@fc4314419d:.bazelrc:1-3 carries only C++ flags.
```

**Dive `bazel-java-external-deps-and-kotlin`** · family `BZL-JAVA` · label "maven_install, repinning, and the Kotlin traps that have no Gradle analogue" · **REVISE after wave 2** — the `locking-verification-supply-chain` dive settles how this program talks about lock files generally

```
Write the external-dependency and Kotlin half of the BZL-JAVA file.

Fetch, primary only: bazel-contrib/rules_jvm_external README (fetch the current
one, not only the clone at 449754dcbb); bazelbuild/rules_kotlin README and
docs/kotlin.md; the rules_jvm_external releases page to confirm the current
version and whether any merge with bazel-contrib/rules_jvm has happened — the
recent-shifts scout flagged this as unverified and it must be settled by a
direct fetch of both repos' READMEs, not by search.

Pin down: the three-step pinning process (add lock_file, touch
maven_install.json + BUILD.bazel, REPIN=1 bazel run @maven//:pin) and what
changes once pinned — SHA-256 caching by Bazel's downloader, cross-workspace
sharing, fully offline builds after one bazel fetch; fail_if_repin_required =
True turning a stale lock from a warning into a failure, and
RULES_JVM_EXTERNAL_REPIN=1 for scoping; the lock file's own shape (an
__AUTOGENERATED_FILE_DO_NOT_MODIFY_THIS_FILE_MANUALLY header and an
__INPUT_ARTIFACTS_HASH map, with drift detected by re-hashing the declared
artifact list rather than by a version field); version_conflict_policy pinned
versus highest-wins; strict_visibility; excluded_artifacts; neverlink and
testonly; fail_on_missing_checksum; and the artifact() macro's documented
tooling cost (it hides the real target label from buildozer).

Then the two Kotlin traps with no Gradle analogue: naive java_import of a Kotlin
jar producing an ijar that "does not know about kotlin metadata with respect to
inlined functions, and will remove method bodies inappropriately" — establish
which rules_jvm_external versions have the fix; and kt_kotlinc_options defaulting
x_lambdas to "class" while Kotlin 2.x and Gradle default to "indy", producing
different bytecode for the same source across build systems. Also cover
persistent and multiplex workers being on by default for KotlinCompile,
KotlinKsp2 and JdepsMerge, and the --strategy=<mnemonic>=local opt-out.

DECIDE: (a) whether committing maven_install.json plus fail_if_repin_required is
a MUST; (b) what the rule says about x_lambdas in a repo that also builds with
Gradle; (c) whether the dual-build source-of-truth question (M-X-07) gets a rule
or only a reading heuristic, given nothing in the corpus verifies parity and
dagger's answer is a CONTRIBUTING line plus CI job ordering.
```

### 4. `maven-and-ant` — the other half of the ecosystem

**Dive `maven4-lifecycle-and-plugins`** · family `MVN-BUILD` · label "What Maven 4 changes, once we know whether it shipped" · **REVISE after wave 2** — `maven-mediation-and-enforcer` reports the GA answer; if Maven 4 is still RC this brief narrows to migration-readiness only

```
Settle the Maven build half: lifecycle, plugin configuration, and what a 3→4
move actually breaks.

Fetch, primary only: maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html,
/whatsnewinmaven4.html, /guides/mini/guide-migration-to-mvn4.html,
/plugins/maven-compiler-plugin/, /surefire/maven-surefire-plugin/,
/guides/mini/guide-reproducible-builds.html, /pom/asf/, /wrapper/;
and maven.apache.org/docs/history.html plus a Central query for
org.apache.maven:maven-core:4.0.0 to settle GA.

Pin down: the 23 default-lifecycle phases and why invoking a hyphenated
intermediate phase directly (integration-test) skips reports and can leave a
container hanging, making mvn verify the entry point; the Maven 4 changes with a
breaking consequence — Java 17 required to run Maven itself, duplicate plugin
declarations becoming a hard failure, the build-POM/consumer-POM split at model
4.1.0 with opt-in flattening, subprojects replacing modules, the lifecycle
becoming a tree with before:/after: hooks and numeric ordering, Plexus DI removed
so Maven-2-era plugins break, mvnenc replacing password obfuscation, mvnup as
the migration tool, deployAtEnd defaulting true, -b concurrent; the compiler
plugin's Java-8 default for source/target regardless of the running JDK and why
release is the fix; Surefire's single JUnit-Platform provider and the 3.6.0-M1
milestone status; and reproducible-by-default from 4.0.0-beta-5 with
project.build.outputTimestamp as an override.

DECIDE: (a) the migration-readiness checklist a Maven 3 project runs today, in
order; (b) whether the JVM rule set targets Maven 3, Maven 4, or both, and how a
row states which; (c) whether the ASF parent POM's enforced floors
(minimalMavenBuildVersion 3.9, minimalJavaBuildVersion, requirePluginVersions,
Reproducible-Builds compliance since parent v22) are worth recommending to a
non-ASF project as a template.
```

**Dive `ant-recognise-and-migrate`** · family `MVN-ANT` · label "You opened a build.xml: what it encodes and how to leave" · **REVISE after owner Q5** — if Ant moves onto the Gradle rule instead, the routing changes

```
Produce the recognise-and-migrate content for the one build system this program
covers without ever recommending it.

Fetch, primary only: ant.apache.org/manual/index.html, /using.html,
/Tasks/javac.html, /Tasks/jar.html, /Tasks/signjar.html;
docs.gradle.org/current/userguide/ant.html; maven.apache.org's "Using Ant with
Maven" guide and the maven-antrun-plugin page.

Pin down: Ant's core model (a project of targets, targets of tasks, ordering by
dependency, properties set once and interpolated) and the six things a
migration must preserve, each with what it maps to in Gradle and in Maven —
targets-as-tasks, filesets and patternsets, custom taskdefs, fork settings,
manifest content, and signing. Then the two facts that decide the migration
strategy: javac's includeantruntime defaults in an environment-sensitive way
(governed by build.sysclasspath) and Ant's own manual says "it is usually best to
set this to false so the script's behavior is not sensitive to the environment
in which it is run"; and Gradle's ant.importBuild() — the obvious
incremental-migration tool — **disables the configuration cache the moment an Ant
build is imported**, which makes "keep build.xml alive under Gradle" a strategy
that costs the single biggest Gradle performance feature.

DECIDE: (a) whether the rule ever recommends ant.importBuild, given that
trade-off and given the corpus has 0 real usages; (b) the migration checklist,
ordered, with a stopping point that is defensible for a project that cannot
finish; (c) whether signjar's preservelastmodified matters enough for a
reproducibility row.

Test against: apache/ant@8c96cd6869 is the only genuine Ant build in the corpus
(21 build.xml files, 5179 lines, root 3051) and it uses Ivy only for its own
release tooling, not for main-build dependency resolution. Every other build.xml
in the corpus is a documentation snippet or a test fixture — gradle/gradle's 20
files are all snippets teaching people how to migrate away, spring-boot's 2 are
an antlib integration-test fixture and a smoke test proving Boot repackaging
still works from Ant. Do not present Ant as live practice.
```

### 5. `platform-and-toolchains` — JDK floors, determinism, and the Kotlin toolchain

**Dive `jdk-floors-modules-and-removed-apis`** · family `JAVA-PLAT` · label "Choosing a JDK, declaring a module, surviving an upgrade"

```
Write the platform rules: what JDK a library targets, how it declares itself to
the module system, and what breaks on the next upgrade.

Fetch, primary only: openjdk.org/projects/jdk/{21,25,26,27}/; openjdk.org/jeps/403
(strong encapsulation), /400 (UTF-8), /421 (finalization), /431 (sequenced
collections), /486 (security manager), /493 (jlink without JMODs), /498 (Unsafe
warnings), /472 (JNI restriction), /511 (module imports), /519 and /534 (compact
object headers); openjdk.org/projects/jigsaw/quick-start; inside.java's
2023-05-12 Quality Outreach heads-up on SequencedCollection.

Pin down: the toolchain-versus---release separation and how each is expressed in
Gradle and Maven; module-info.java versus Automatic-Module-Name and what each
gives a consumer on the module path; the strong-encapsulation consequence — since
JDK 17 there is no global relax flag, so every reflective reach into a JDK
internal needs a per-module --add-opens or --add-exports chosen deliberately,
which is why ORMs, mocking and serialization libraries are the recurring
casualties; the removed-or-disabled list with its JDK number (Security Manager
permanently disabled JDK 24, finalization deprecated for removal JDK 18, Unsafe
memory-access warning JDK 24, 32-bit x86 port removed JDK 25, Applet API removed
JDK 26); and jdeps --jdk-internals / jdeprscan as the pre-upgrade commands.

Also settle the SequencedCollection retrofit as the worked example of "a JDK
feature that adds default methods to a widely-implemented interface breaks real
code": the three documented incompatibility shapes (method-name conflict,
covariant-override conflict on a type implementing both List and Deque, and
silent type-inference change) and the concrete instance — Kotlin's .first()
colliding with the new getFirst() on Gradle's own Kotlin DSL build at JDK 21
(gradle/gradle#27699).

DECIDE: (a) the declared floor for the OCX SDK, given Spring Boot 4 and JUnit 6
both hold at 17 while the current LTS is 25; (b) module-info or
Automatic-Module-Name, with the cost of each stated; (c) the pre-upgrade
checklist a project runs before moving a JDK major.
```

**Dive `encoding-locale-timezone-determinism`** · family `JAVA-PLAT` · label "Same source, different bytes"

```
Write the determinism rules — the boring class that bites, and the one place the
whole corpus has a measured gap.

Fetch, primary only: openjdk.org/jeps/400; reproducible-builds.org/docs/jvm/;
docs.gradle.org/current/userguide/working_with_files.html and the 9.0.0 release
notes; maven.apache.org/guides/mini/guide-reproducible-builds.html;
gradle/gradle#2270 (the daemon's own file.encoding).

Pin down: exactly which APIs JEP 400 fixed and which charset-less overloads it
deliberately left alone (String(byte[]), getBytes(), FileReader,
new PrintStream(OutputStream)); that file.encoding is a supported property only
as UTF-8 or COMPAT since JDK 18 and anything else is undefined; that Gradle
never sets file.encoding for its own daemon launch, which precedes toolchain
selection, so org.gradle.jvmargs=-Dfile.encoding=UTF-8 is still needed on a
non-UTF-8 host; Properties.store() always writing a timestamp comment;
jar/zip entry timestamps and ordering as the primary non-determinism source, and
the Gradle-9 default change (M-D-11) that wave 2 settles; and
project.build.outputTimestamp on the Maven side.

Then the measured gap. Across all 32 exemplars: -Dfile.encoding is set in 13,
options.encoding or project.build.sourceEncoding in 15, -Duser.language in 2
(guava deliberately runs its suite under hi/IN to catch locale bugs), and
**-Duser.timezone or a TZ pin in ZERO** — in a corpus containing kafka, guava,
jackson and Exposed, all date/time-sensitive.

DECIDE: (a) whether pinning a test timezone becomes a rule, at what severity,
and what the verification is; (b) the encoding rule's exact wording for JDK 18+
versus below, since half the fix is the build tool's own launch and not the
compiler; (c) whether HashMap/HashSet iteration order and classpath scan order
get their own rows or fold into one determinism row.
```

**Dive `kotlin-toolchain-and-codegen`** · family `KT-COMP` · label "Compiler flags that moved, and the annotation processor that should not be kapt"

```
Settle the Kotlin build-side configuration: flags, targets, code generation and
docs, all with version numbers.

Fetch, primary only: kotlinlang.org/docs/compiler-reference.html,
/gradle-compiler-options.html, /gradle-configure-project.html,
/gradle-compilation-and-caches.html, /ksp-quickstart.html,
/ksp-kapt-migration.html, /ksp-overview.html (the supported-libraries list),
/dokka-introduction.html, /dokka-migration.html, and whatsnew21 through
whatsnew24; github.com/google/ksp README.

Pin down: which -X flags stabilised and when — guard conditions, non-local
break/continue and multi-dollar interpolation Stable in 2.2.0 (2025-06-23),
context parameters Stable in 2.4.0 — so that a rule naming -Xwhen-guards or
-Xcontext-parameters is telling an agent to pass a flag that no longer exists;
that -Xjvm-default is deprecated in favour of a stable -jvm-default flag and a
jvmDefault Gradle DSL property whose **default value flipped to ENABLE in
2.2.0**, a behaviour change rather than a rename; the JVM attribute table
(jvmTarget defaulting to "1.8", jvmTargetValidationMode defaulting to ERROR,
javaParameters, noJdk) and how jvmToolchain interacts with jvmTarget; the
KGP/Gradle/AGP compatibility envelope as a versioned table; the Kotlin daemon's
four-level JVM-argument precedence; kotlin.build.report.output sinks; KSP2 as
the default since KSP 2.0.0 with KSP1 incompatible past Kotlin 2.3.0 or AGP 9.0,
and whether any commonly-used processor still lacks a KSP implementation and
forces kapt for one module; and what Dokka v1→v2 restructures (multi-module
aggregation, output directories, visibility settings) with K2 analysis stable
from 2.2.0.

DECIDE: (a) whether kapt may appear in a new module at all and what the rule
says to a project that still needs it; (b) whether -Wextra/extraWarnings is a
recommendation given it is still Experimental; (c) the Dokka version floor a
rule cites, and whether Dokka's output belongs in docs-quality's world or
outside it (M-Y-06 says the sibling's generator table has no shape for it).
```

### 6. `java-runtime-safety` — untrusted input and failure handling

**Dive `untrusted-input-and-deserialization`** · family `JAVA-SEC` · label "Every place attacker-controlled data picks a class or a path"

```
Write the Java security rows as a small set of shapes with named checks, not as a
survey of OWASP.

Fetch, primary only: cheatsheetseries.owasp.org Deserialization, XML External
Entity Prevention, Java Security, Input Validation and Cryptographic Storage
sheets; cmu-sei.github.io SEI CERT Oracle Java rules index (the IDS, FIO, SER
and SEC categories); github.com/FasterXML/jackson/wiki/Jackson-Polymorphic-Deserialization-CVE-Criteria
and advisory GHSA-j3rv-43j4-c7qm (CVE-2026-54512/54513); snyk.io/research/zip-slip-vulnerability;
find-sec-bugs' rule list; oracle.com/java/technologies/javase/seccodeguide.html.

Pin down, each as a shape a reviewer can find: native deserialization of
untrusted data without an ObjectInputFilter; Jackson with global default typing
or a too-broad @JsonTypeInfo base type without a current
PolymorphicTypeValidator — and the 2026 bypass that mattered, where the validator
checked only the raw container class and never the nested generic type
parameters (fixed in 2.18.8 / 2.21.4 / 3.1.4), which is why "a validator is
present" is not the check, "the validator is current" is; XXE per parser factory,
because hardening DocumentBuilderFactory does not harden SAXParserFactory,
XMLInputFactory, TransformerFactory, SchemaFactory, Validator, JAXB or XPath;
JNDI lookup on untrusted input; ZipSlip; path traversal; command construction by
concatenation; java.util.Random where unpredictability is required.

State clearly which of these core SpotBugs covers and which need find-sec-bugs,
because teams assume the former.

DECIDE: (a) the MUST list, and whether it lives in the java-quality index
(always loaded) or only in the depth file; (b) whether Oracle's Secure Coding
Guidelines section 9 (Access Control) may be cited at all, given JEP 486 removed
the mechanism it describes in JDK 24 — the answer shapes how the file cites its
own sources; (c) whether the OCX SDK, which parses JSON from a subprocess it
launched, is inside or outside the untrusted-input boundary, and say why.
```

**Dive `errors-resources-and-lifecycle`** · family `JAVA-ERR` · label "Failures that vanish, and resources that do not close"

```
Write the error-handling and resource rows, which is where the highest-frequency
agent mistakes live and where several checks exist but are off by default.

Fetch, primary only: errorprone.info/bugpatterns pages for
InterruptedInCatchBlock, TryFailThrowable, UnusedException, CatchingUnchecked,
MustBeClosedChecker, StreamResourceLeak; spotbugs messages.xml entries for
OS_OPEN_STREAM, UL_UNRELEASED_LOCK, RV_RETURN_VALUE_IGNORED, DE_MIGHT_IGNORE,
REC_CATCH_EXCEPTION, SE_NO_SERIALVERSIONID; rules.sonarsource.com/java for
S2142, S1181, S4507 (and the deprecated S1148 it supersedes), S2095, S2057;
the Effective Java item list for items 69-77; openjdk.org/jeps/421.

Pin down which of these fire by default and which do not — this is the dive's
main value. CatchingUnchecked and UnusedException are in Error Prone's
DISABLED_CHECKS, meaning the single most characteristic pattern in
agent-written Java (wrap risky code in try/catch, log or ignore) is silent in
every default configuration measured. Establish the exact enabling syntax and
whether promoting them produces tolerable noise on a real codebase.

Cover: swallowed InterruptedException without re-interrupt; catch(Throwable);
try-with-resources including Files.walk/list/lines; ExecutorService shutdown on
every path; exception chaining and the new X(e.getMessage()) shape that drops the
cause; checked-versus-unchecked selection; System.exit() in library code;
printStackTrace over the logger; finalize() versus Cleaner; and
serialVersionUID on a Serializable class.

DECIDE: (a) the five rows that go in the index because they must be true in
every edit, and everything else that stays in the depth file; (b) whether the
three tools that all claim resource-leak detection (SonarJava S2095, PMD
CloseResource, Error Prone MustBeClosedChecker) get named individually or
whether the rule names one gate; (c) whether the sneaky-throw question — Goetz
calls the workarounds irresponsible, Kabutz documents the mechanics as a
pragmatic escape hatch — gets a rule or is recorded as contested with both
positions stated.
```

## Deferred

Sixty-two of the 247 rows are not commissioned to a wave-2 or wave-3 dive. They
split three ways, and only the third group is deferred in the sense of "nobody
has the evidence yet".

### Ready to author from wave-1 evidence — no dive needed (31 rows)

These already have a primary source, a measured count and a named check in the
wave-1 corpus. Sending a worker would buy confirmation, not a decision. The
authoring pass writes them straight from the citations in the map.

| M-IDs | Why no dive |
|---|---|
| M-E-01 … M-E-08 (toolchains, wrapper, encoding, `gradle.properties`, `-bin`, dead configurations, the Windows classes-vs-jar note) | [cgrad](jvm-topic-map/gradle-canonical.md) and [shape](jvm-audit/exemplar-build-shape.md) between them give the mechanism, the exemplar counts and the command for every row; the only open piece (daemon encoding) is settled by the wave-3 determinism dive |
| M-I-01 … M-I-07 (CI mechanics, scans, action pinning, JDK matrix, SBOM, Dependabot-vs-Renovate) | [pub](jvm-audit/exemplar-publishing-ci-bazel.md) measured all seven with commands inline; the one judgment call (is SBOM emission a MUST) belongs to the wave-3 provenance dive, which will hand it back |
| M-L-01 … M-L-08 (records, sealed types, exhaustive switch, DOP v1.1, defensive copies, `Comparable`, Gatherers, flexible constructors) | [cjava](jvm-topic-map/canonical-java.md) fetched every JEP directly and quotes the normative rule; Error Prone and SonarJava supply the checks |
| M-V-01 … M-V-08 (platform types, nullability flavours, the five interop annotations, `@Throws`, `suspend` across the boundary, value-class mangling, `Result`, `--patch-module`) | [ckt](jvm-topic-map/canonical-kotlin.md) is a page-by-page read of kotlinlang's own interop docs; nothing here is contested except M-V-07, which stays CONSIDER by design |

### Waits on a wave-2 or wave-3 result (18 rows)

| M-IDs | Waiting on |
|---|---|
| M-A-01, M-A-02, M-A-03 | the wave-3 `jdk-floors-modules-and-removed-apis` dive fixes the SDK's declared floor, which every era row then inherits |
| M-A-07, M-J-13 | the Maven 4 GA answer from wave-2 `maven-mediation-and-enforcer`; both rows currently hedge at rc-6 |
| M-A-08, M-W-01 … M-W-03 | the wave-3 `kotlin-toolchain-and-codegen` dive settles the flag and version tables these rows cite |
| M-C-13 | the wave-2 `declaration-and-catalogs` dive decides whether DAGP gates the build or advises |
| M-D-09, M-D-12 | the wave-2 `task-inputs-and-cache-hits` dive; both are second-order once the reproducibility default is settled |
| M-G-11, M-G-12 | the wave-2 `distribution-shape-decision` dive decides whether jpackage and container images are in the decision tree at all |
| M-H-08 | the wave-3 `consumability-across-build-systems` dive; a MAY-level row either way (1/32) |
| M-K-07, M-K-08, M-K-09 | the wave-2 `java-api-evolution-and-nullness` dive returns a five-row MUST list; these three are the overflow it will rank |
| M-T-09, M-T-10 | the wave-2 `kotlin-api-and-abi` dive's checklist decision |
| M-Y-06 | owner question Q8 — whether `docs-quality` grows JVM rows or marks Dokka "Not Studied" |

### Genuinely deferred — would need a dive nobody has commissioned (13 rows)

| M-ID | One line | What would promote it |
|---|---|---|
| M-A-10 | Develocity-the-company versus Gradle-the-tool is naming hygiene, not a defect | Never; one sentence in the index covers it |
| M-A-11 | Which lint versions parse Java 25 (Checkstyle 14.x, SpotBugs' ASM 9.8 / BCEL 6.11 chain) — [shift](jvm-topic-map/recent-shifts.md) could not resolve the 10.x→14.x mapping | A direct Checkstyle changelog read; promote if an adopter reports under-reported findings |
| M-A-12 | Pre-PMD-7 rule names in a ruleset XML | Only if PMD re-enters the gate, which 0/32 says it should not |
| M-B-06, M-B-08, M-B-09, M-B-10 | Settings hygiene: `rootProject.name`, programmatic module inclusion, typesafe project accessors, sources in the root project | Promote M-B-08 if a rule or script ever needs a reliable module count — the corpus says three metrics disagree by a wide margin on 8 of 20 repos |
| M-F-07, M-F-09 | The two `gradlePlugin{}` id idioms and the Portal metadata set | Promote if the OCX Gradle plugin's own Portal submission is blocked; the wave-2 dive already reads the same pages |
| M-N-11 | The `ReentrantReadWriteLock` 65,536-read-lock ceiling under virtual threads | A primary source beyond Kabutz's newsletter; the failure is real but the citation is thin |
| M-Q-09 | AOT cache / training-run artifacts as a new reproducibility surface | Promote when an adopter ships one; JDK 24-26 adoption is negligible today |
| M-R-06 | Whether PMD is worth configuring at all | Never, unless the 0/32 measurement is overturned |
| M-S-12 | Test retry | Never as a recommendation (1/32 official, 30/32 nothing); it survives as one "the strict exemplars do not retry" line |
| M-U-10 | `StateFlow` conflation dropping intermediate values | Promote if the SDK exposes a Flow-shaped API, which the Java-first default (Q1) makes unlikely |
| M-X-09, M-X-10 | `contrib_rules_jvm` lint wiring and Bazel worker state | Both are inside the wave-3 `bazel-java` group's reach but below its two dives' line; promote if the sibling accepts the file (Q6) and wants breadth |

Also deferred by scope decision rather than by priority: every Kotlin
Multiplatform row ([ckt](jvm-topic-map/canonical-kotlin.md) surfaced the
`.jvm.kt` file-facade clash, expect/actual visibility and KLib ABI validation),
which is out of scope per the frame and stays out.

## Questions for the owner

Eight, each with the default this program assumes if unanswered. None can be
settled by research.

**Q1. Java-first or Kotlin-first for the OCX SDK?**
Research can frame it and has (conflict 14): Java-first holds the
zero-runtime-dependency commitment that `ocx-sdk-python` established and keeps
Kotlin consumers first-class through JSpecify's `strict` default; Kotlin-first
gets one converged ABI gate (BCV) where Java has none, at the cost of the
zero-dep claim and of solving `suspend`-across-the-Java-boundary on day one.
**Default if unanswered: Java-first with a Kotlin-friendly API** — JSpecify
annotated, no `Optional` parameters, no generics-into-varargs, no `data`-shaped
public types.

**Q2. What is the SDK's minimum JDK?**
The current LTS is 25, but Spring Boot 4 and JUnit 6 both hold their floor at 17,
and guava and grpc-java still ship Java 8 bytecode.
**Default: floor 17 (`--release 17`), toolchain 25, CI matrix 17 / 21 / 25.**
Raising the floor to 21 buys virtual threads and pattern matching in the SDK's
own code; raising it to 24 buys the un-pinned `synchronized` behaviour. Say if
reach matters less than modern APIs.

**Q3. Does the OCX Gradle plugin support Gradle 8.x, or 9.x only?**
This is a support-cost decision, not a technical one, but it has one hard
constraint: a Kotlin-DSL plugin built with Gradle 9.x can only run on consumer
Gradle ≥ 8.11.
**Default: declared floor 8.11, TestKit matrix of 8.11 / current 9.x /
release-candidate, and a configuration-cache leg on the current version.**
9.x-only would let the plugin use the isolated-projects-compatible APIs
directly and drop a matrix leg.

**Q4. Kotlin DSL only in the rules' examples, or Groovy too?**
Kotlin DSL is the trend and Gradle's own first Best Practice, but Groovy is
dominant in real large builds (spring-boot 736 files, kafka 9-and-no-kts).
**Default: Kotlin DSL for every example, with exactly two Groovy appearances** —
the `apply plugin:` → `plugins {}` migration row, and the `gradlePlugin { plugins
{ } }` id idiom where the two DSLs genuinely differ. Say if adopters on Groovy
should see parallel snippets throughout, which roughly doubles the depth files'
snippet budget.

**Q5. Does Maven get its own rule, and does Ant live on it?**
The map decided yes (conflict 3): `maven-build.md` with `**/pom.xml`,
`**/.mvn/**`, `**/mvnw*`, plus `**/build.xml` and the Ivy files, with Ant as one
depth file. The alternative is folding Maven's globs onto `gradle-build` as a
`jvm-build` rule, which halves the artifact count and makes every Maven-only
adopter load Gradle content.
**Default: the four-rule set as decided.** Say if the artifact count is the
binding constraint.

**Q6. Will `bazel-quality` accept a thirteenth depth file and a `BZL-JAVA`
family?** The sibling program's artifact-set decision calls its twelve files
finalized and lists `rules_java`/`rules_kotlin` as explicitly out of scope, so
this reopens a closed decision — a coordination call, not a technical one.
**Default: this program researches and drafts
`.agents/research/handoff/bazel-quality-java.md` and offers it.** If declined,
the wave-3 `bazel-java` group's output stays in this corpus as research, the
`BZL-JAVA` family is never allocated, and the M-X rows become backlog.

**Q7. What coverage floor does the OCX SDK enforce?**
`ocx-sdk-python` enforces `fail_under = 100` with `show_missing`, gated
Linux-only. On the JVM the strictest exemplar is a Maven repo with a
tiered rule (100% CLASS, 80% everything else), and only 3 of 32 repos enforce
anything at all.
**Default: 90% line and branch, enforced Linux-only, with the number written in
the config rather than in a CI flag** — legible, auditable, and reachable
without the test-shaped-hole problem a JVM 100% target creates. Say if parity
with the Python SDK's 100% matters more than that.

**Q8. Does `docs-quality` grow JVM rows, or is Dokka marked "Not Studied"?**
Its per-language tested-example table has no Java or Kotlin row and its
generator-wiring table has no shape for an output-only API-doc generator; both
are sibling-set files, not this program's.
**Default: propose one row to `tested-examples-by-language.md` (neither language
ships a doctest runner, so both fall to the generic subprocess harness) and add
an explicit "Not Studied" line for Dokka and Javadoc**, matching the precedent
already in `css-theming.md` and `docs-quality.md`. Say if the docs program
should own the Dokka question instead.

## Explicitly not a defect

Frame suspicions the wave-1 audits cleared. Recorded so nobody re-investigates
them, and so no rule flags them.

1. **Duplication with the sibling lore sets.** There is nothing to duplicate.
   `grep -rn -iE '\b(java|kotlin|gradle|maven|jvm|jar)\b' rules/ skills/` returns
   zero matches, and every lockfile, coverage and CI row in the catalog is
   manifest-format-specific to Rust, Python or TypeScript
   ([cfg](jvm-audit/config-inventory.md) §1.2). The real work is starting from
   zero, not avoiding overlap.
2. **Deprecated `compile`/`runtime`/`testCompile` configurations.** Zero across
   the whole corpus. gradle/gradle's ten apparent hits are `runtime(projects.xyz)`
   against a *custom* configuration its own convention plugin declares
   ([shape](jvm-audit/exemplar-build-shape.md) §3). Do not grep for the token.
3. **`buildscript { classpath(...) }` as a live anti-pattern.** A plain string
   match over-counts roughly 3×: almost every hit is AGP or `com.android.tools:r8`
   inside an Android sample module, or an unrelated `classpath =
   startScripts.classpath` task property ([shape](jvm-audit/exemplar-build-shape.md) §3).
   Read three lines of context before flagging.
4. **`buildSrc`.** Not a defect. Nine actively-maintained flagships still use it,
   including spring-boot's 249-file convention layer
   ([shape](jvm-audit/exemplar-build-shape.md) §2). A rule that flags it flags
   them.
5. **A Groovy-DSL build.** Not stale by itself. spring-boot has 736 Groovy build
   files to 54 Kotlin; kafka has 9 to 0
   ([shape](jvm-audit/exemplar-build-shape.md) §1). Groovy DSL is legacy-common,
   not historical.
6. **A repo carrying both a `build.gradle` and a `pom.xml`.** Almost never a dual
   build: 0 of the 10 Gradle-tagged repos with a pom build with both. Every
   incidental pom is a Maven-consumability example or a plugin's integration-test
   fixture ([shape](jvm-audit/exemplar-build-shape.md) §1).
7. **A dual-build repo with no explainer document.** dagger and grpc-java each
   carry Gradle and Bazel and neither documents why; the split is discoverable
   only from file layout ([shape](jvm-audit/exemplar-build-shape.md)). Do not
   expect the doc and do not flag its absence.
8. **`google/error-prone` as a Bazel exemplar.** It ships no `MODULE.bazel`,
   `WORKSPACE` or `BUILD` file at all — it is Maven-built and Bazel-*consumed*
   ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)). A worker sent to read its
   Bazel configuration will find nothing.
9. **apache/maven's 2031 `pom.xml` files.** That is Maven's own integration-test
   harness spinning up hundreds of fixture projects, not a structural smell
   ([shape](jvm-audit/exemplar-build-shape.md) §1).
10. **spring-boot's 383 `bootJar` hits and testcontainers-java's 62 Dockerfiles.**
    Monorepo noise from smoke-test, sample and per-database modules — not 383
    shipped executables or 62 images
    ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)).
11. **`validatePlugins` running in a repo.** Not evidence that the repo publishes
    a plugin: `java-gradle-plugin` registers the task for any internal
    convention-plugin module, and nowinandroid and sqldelight both hit it with
    zero Plugin Portal signal ([pub](jvm-audit/exemplar-publishing-ci-bazel.md)).
    Route on `com.gradle.plugin-publish` instead.
12. **`org.gradle.unsafe.isolated-projects` in the wild.** Zero occurrences; the
    stabilised `org.gradle.isolated-projects` is what five repos use
    ([shape](jvm-audit/exemplar-build-shape.md) §4). Teach the new key; do not
    hunt for the old one.
13. **The catalog's glob-liveness check having no JVM consumer.** Precedented —
    CSS and docs hit the same branch today, and running `check-artifacts.py`
    with no `--root` plus the "not checked" note is the documented fallback
    ([cfg](jvm-audit/config-inventory.md) §1.3). Do not invent a fix.

## Frame corrections

Every frame premise the wave-1 evidence overturned, one line each with the
source key. The orchestrator appends these to `jvm-frame.md` verbatim.

1. **Configuration cache is "preferred with automatic fallback" in Gradle 9, not
   on by default**, and the default-execution-mode target moved from Gradle 10 to
   **Gradle 11** (shift, cgrad, prac).
2. **Maven 4.0 GA is not confirmed** — latest verified is `4.0.0-rc-6`; treat
   Maven 4 as release-candidate until a worker cites the GA note (shift).
3. **JEPs 483, 491 and 493 shipped in JDK 24, not 25** — a full LTS cycle earlier
   than the frame's era list implies (shift).
4. **Virtual threads no longer pin on `synchronized`/`wait`/`notify` as of JDK 24
   (JEP 491), and `jdk.tracePinnedThreads` was removed** — three native-frame
   cases remain, and the `jdk.VirtualThreadPinned` JFR event is now the only
   detector (failr, shift).
5. **Structured concurrency is still preview** — 6th in JDK 26 (JEP 525), 7th in
   JDK 27 (JEP 533, GA 2026-09-15), finalisation targeted at JDK 28, with
   breaking API changes in nearly every iteration (cjava, failr, shift).
6. **The isolated-projects property is `org.gradle.isolated-projects`**;
   `org.gradle.unsafe.isolated-projects` is dead (0/32 versus 5/32) (shape).
7. **Isolated Projects reached *incubating* only in Gradle 9.7.0 (2026-08-06)**,
   promoted from experimental, with two constraint categories still not fully
   enforced (cgrad, shift).
8. **JUnit 6 shipped 2025-09-30 but is not the corpus baseline** — 4/32 reference
   it and gradle/gradle pins JUnit 5.12.2 for its own suite; rules must state the
   5→6 floor explicitly (gates, shift).
9. **JSpecify adoption is overstated** — declared in 9/32, NullAway's
   JSpecify-native mode in 2/32, while jsr305 (13) and checker-framework (8)
   remain more common. JSpecify is the direction, not the installed base (gates).
10. **PMD is not a peer tool** — enforced in 0/32. Error Prone (+ NullAway),
    Checkstyle, SpotBugs, Spotless, detekt and ktlint are the gate-of-record
    candidates (gates).
11. **Fat jars are an executable and plugin-loader topic, not a library topic** —
    every shaded artifact in the corpus is a CLI, a javac plugin or a vendoring
    step, with zero counterexamples. Hypothesis 2 is reshaped, not refuted (pub).
12. **Dependency locking and verification are essentially unpractised** — 0/32
    lockfiles, 1/32 `verification-metadata.xml`, 2/32 correct reproducible-archive
    settings. BOM and platform alignment is the practised half of "dependency
    management" (shape, pub).
13. **Coverage floors are rare** — 3/32 enforce any numeric minimum, and the
    strictest is a Maven repo. Hypothesis 4 holds for lint, not for coverage
    (gates).
14. **`google/error-prone` is Maven-built and Bazel-consumed, never Bazel-built** —
    the frame's classification table should read "maven; consumed under Bazel"
    (pub).
15. **Bytecode target lags the toolchain in real libraries** — guava ships Java 8
    bytecode and grpc-java sets `options.release = 8` from modern JDKs; rules must
    separate toolchain floor from `--release` target (shape).
16. **The sibling Bazel set treats its twelve depth files as closed** and lists
    `rules_java`/`rules_kotlin` as explicitly out of scope; handing over a
    `java.md` reopens a decision rather than filling a reserved slot (cfg).
17. **Nothing in the catalog mentions the JVM**, so the frame's duplication worry
    is moot; the conventions to match are structural (index plus depth,
    task-worded routing, language-prefixed families, verification cells that say
    what empty output means) (cfg).
18. **Gradle 9 makes archive tasks reproducible by default**, which inverts the
    familiar advice: `preserveFileTimestamps = true` / `reproducibleFileOrder =
    false` is now an opt-*out*, and `apache/kafka` sets exactly that pair while
    running Gradle 9.7.1 (shift + shape).
19. **Kotlin 2.2.0 released 2025-06-23**, not 2026-03; the release chain is 2.1.0
    (2024-11-27) → 2.2.0 (2025-06-23) → 2.3.0 (2025-12) → 2.4.0 (2026-06) (ckt,
    correcting shift's hedged date).
20. **Surefire's single-JUnit-Platform-provider change is documented but the
    released line is `3.6.0-M1`, a milestone** — a build pinning "3.6.0" today is
    pinning a milestone (cmab, shift).
21. **Version catalogs are not reliably at `gradle/libs.versions.toml`** —
    apollo-kotlin uses `gradle/libraries.toml` and gradle/gradle wires three named
    catalogs programmatically from arbitrary files, so the frame's glob would
    silently miss both (pub, shape).
22. **No repo derives its version from git tags via a plugin** — `axion-release`,
    `nebula-release`, `reckon` and `gradle-git-version` are 0/32 each; versioning
    is a literal string in `gradle.properties` (14/32) or the POM (pub).
23. **Gradle plugin development is standards, not a procedure** — nearly all of it
    fires while editing a `*.gradle.kts` file that `gradle-build` already globs,
    so it ships as two depth files' worth of `GRADLE-PLUG` rows and the two skill
    slots go to `jvm-release` and `jvm-dependency-triage` (this map, conflict 6).
24. **The artifact set is four rules, not the frame's three-plus-open-questions**:
    separate `java-quality` and `kotlin-quality` (different globs, disjoint depth),
    `gradle-build`, and `maven-build` carrying Ant as a depth file (this map,
    conflicts 2 and 3).
25. **Sonatype measured 28% of ~37,000 LLM-assisted dependency upgrades as
    hallucinated packages or versions** — this fleet's own agents are the
    population that statistic describes, which makes registry validation before a
    version bump a rule about us, not about adopters (failb).

## Wave 2 landed (2026-09-12)

Six groups, fourteen dives, six consolidations. **145 rule IDs, 105 of them
MUST**, and 79 ranked AI-agent failure modes. Nothing above this section is
edited; M-IDs are stable and every row below cites the file that now owns it.

### Per group

| Group | Consolidation | MUSTs | IDs | Families |
|---|---|---|---|---|
| gradle-core | [jvm-gradle-core.md](jvm-gradle-core.md) | 18 | 26 | GRADLE-CACHE, GRADLE-STRUCT |
| gradle-plugin-dev | [jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md) | 15 | 21 | GRADLE-PLUG |
| dependencies | [jvm-dependencies.md](jvm-dependencies.md) | 23 | 29 | GRADLE-DEP, MVN-DEP |
| distribution | [jvm-distribution.md](jvm-distribution.md) | 15 | 20 | GRADLE-DIST |
| quality-gates | [jvm-quality-gates.md](jvm-quality-gates.md) | 15 | 23 | JAVA-LINT, JAVA-TEST |
| language-api | [jvm-language-api.md](jvm-language-api.md) | 19 | 26 | JAVA-API, KT-API |

**gradle-core** resolved six: kafka's archive block is an *active* opt-out, not
a no-op (release notes normative over audit inference, closing conflict 21 and
M-D-11); "configuration cache on by default in Gradle 9" is an overstatement in
[shape](jvm-audit/exemplar-build-shape.md)'s own Contradictions section, not
only in the frame (conflict 18 re-confirmed); the `build-logic-settings` split
falls MUST→SHOULD because junit-framework and a Gradle Developer Advocate's
reference repo both ship the merged form; `gradle.properties` is the canonical
configuration-cache switch and a CLI flag is an override; `validatePlugins`
(fails) and the jar-time check (warns) are two gates at two times; Isolated
Projects adoption is not Isolated Projects maturity. Follow-ups it named:
`maven-publish` × configuration cache ([#24040](https://github.com/gradle/gradle/issues/24040));
the never-dived GRADLE-STRUCT rows M-B-05 and M-B-07; remote build-cache
push-gating; Gradle 10's archive defaults (no source exists yet).

**gradle-plugin-dev** resolved six, two of which correct this map: `plugin-publish`
does **not** auto-apply Shadow (conflict A, correcting our conflict 1), and
`validatePlugins` is not a Portal-publishing signal (conflict E, confirming
M-F-08). It split the TestKit matrix severity (floor+current MUST, RC SHOULD and
scheduled-only), closed the `ValueSource`-vs-`BuildService` seat on a documented
impossibility, made `enableStricterValidation` a MUST at 1/32 on mechanism rather
than count, and demoted the `gradlePlugin{plugins{}}` idiom (M-F-07) from a rule
to a failure mode. Follow-ups: Settings-plugin tool provisioning (0/32, the cell
[cfg](jvm-audit/config-inventory.md) Axis 4 left "Open"); Isolated-Projects
compatibility for a Settings plugin (M-F-04's second half); plugin API-surface
nullability (M-F-11).

**dependencies** resolved eight, including the two sharpest measured reversals
in the wave: **spring-boot is not an `enforcedPlatform` violator** (all 13 hits
are smoke-test, test, or internal-tooling modules and the one `api(enforcedPlatform)`
carries a comment saying so at `platform/spring-boot-internal-dependencies/build.gradle:254-258`),
and **Maven 4 is still RC** (Central queried 2026-09-12: `maven-core` 3.9.16
stable, 4.0.0-rc-6 the top of the 4.0 line — settling conflict 19, M-A-07 and
M-J-13). It also ruled that a platform is not a substitute for a lockfile,
narrowed locking to MUST-for-this-program/SHOULD-elsewhere against 0/32, raised
`strictly`/`!!` to MUST-with-scope on a fresh count, required at least one
failing DAGP category rather than `onAny`, picked `requireUpperBoundDeps` as the
Maven floor, and **removed the 28 % hallucination figure entirely** in favour of
the mechanism. Follow-ups: `mavenLocal()` and repository hygiene (42 build files,
no dive, no rule); Maven-side checksum and verification policy (`MVN-DEP` has no
supply-chain row at all); Dependabot-vs-Renovate as a rule surface.

**distribution** resolved five and falsified one of this map's own headline
measurements: `apache__kafka@940c100fab:build.gradle:2089-2100` + `:401-420`
publishes `kafka-clients` as a **shaded jar under primary coordinates**, so the
"zero counterexamples in 32 repos" claim behind conflict 1 and M-G-01 is wrong.
DIST-02 survives as a MUST with three conjunctive carve-out conditions. It also
established that `google/error-prone` does **not** relocate (the map's M-G-04
claim is a grep false positive on a `<distributionManagement>` artifact-move
notice), that Gradle does **not** sidestep Maven's dependency-reduced-POM
trade-off (kafka hand-rolls 20 lines of `pom.withXml` against
[shadow#324](https://github.com/GradleUp/shadow/issues/324)), made
Spring-Boot-plus-Shadow co-application a MUST-level defect, and made `minimize()`
a conditional MUST rather than a ban. Follow-ups: what `components.shadow` emits
into a POM on Shadow ≥ 9.0.0; `minimize()`'s ServiceLoader awareness in 2026;
whether `shadowJar` inherits Gradle 9's reproducible-archive default.

**quality-gates** resolved nine. The two that change a rule's text: the coverage
count is **3/32 declare, 1/32 enforce unconditionally** (junit-framework and
kotlinx.coroutines both gate their own gate), which splits M-S-02 into a
presence check and a read-the-enclosing-conditional check; and
`StringCaseLocaleUsage` is an `ENABLED_WARNINGS` member, so M-R-01's "promote"
means a severity bump, not an activation. It also verified the
`junit.jupiter.`-prefixed property keys against the real files (both wave-1
audits printed the suffix form, so a grep written from them matches nothing),
split Error Prone + NullAway severity by consumer kind, kept the find-sec-bugs
rule with its 0/32 violation stated rather than softened, and settled Surefire
at `3.6.0-M1`/GA `3.5.6` by registry query. Follow-ups: Kover's `check` wiring
(KT-TEST); whether plain SpotBugs earns anything next to Error Prone (JAVA-LINT);
`@ResourceLock` capability-to-version mapping (JAVA-TEST).

**language-api** resolved eight, two of them corrections to wave-1 measurement:
`abiValidation{}` is **2/32** (ktlint and detekt, both under
`@OptIn(ExperimentalAbiValidation::class)`), not 0/32; and gradle/gradle's
"bespoke Groovy checker" **is japicmp** — `JapicmpTaskWithKotlin` extends
`me.champeau.gradle.japicmp.JapicmpTask`. It merged M-K-02's two halves into one
rule so they cannot drift, overruled its own dive on `AbstractMethodError`
(JLS §13.5.3), took japicmp over revapi on measured practice with the decision
flagged for re-taking, and fixed explicit-API-mode adoption at 6/32 by union of
two greps that each missed a spelling. Follow-ups: source-level public-API
measurement (six rows unmeasured in both dives); japicmp configuration depth;
a revapi revisit.

### Surprises

Every dive finding this map did not anticipate, with its verdict.

| Surprise | Verdict |
|---|---|
| `maven-publish` with explicit `credentials {}` silently **disables** the configuration cache on Gradle 9 rather than failing ([#24040](https://github.com/gradle/gradle/issues/24040)) — a green build that is permanently uncached | **Promote** — wave-3 `central-portal-and-provenance` owns it; it blocks a precise GRADLE-CACHE-08 and lands in GRADLE-PUB |
| M-B-05 (two subprojects sharing a leaf name → wrong conflict resolution, no build failure) and M-B-07 (subproject `gradle.properties` vs the configuration cache) were adjudicated P0/P1 and dived by nobody | **Promote** — wave-3 `settings-time-surface-and-tool-provisioning` |
| No checked-out `settings.gradle*` shows `remote(HttpBuildCache) { isPush = … }` in 10 `buildCache{}` blocks across 6 repos — "who may push to the shared cache" is unanswered | **Promote** — same dive; `buildCache{}` is a settings-file block |
| `mavenLocal()` in 42 corpus build files with no dive, no rule, and no fetched source — the second-most-likely thing an agent adds to "fix" a resolution failure | **Fold** into `central-portal-and-provenance` (the `publishToMavenLocal`-to-verify / never-`mavenLocal()`-to-consume pair) |
| Settings-plugin tool provisioning has **0/32** precedent and `config-inventory` Axis 4 leaves the cell literally "Open" — it is the OCX Gradle plugin's central mechanism | **Promote** — wave-3 `settings-time-surface-and-tool-provisioning` |
| A Settings plugin registering one shared `BuildService` across every project is exactly the Isolated-Projects-hostile shape, and IP is not yet a declarable Compatibility-Plugin feature | **Promote** — same dive (M-F-04's second half) |
| Plugin API nullability: does JSR-305 on a plugin API *break* consumer Kotlin build scripts under K2, or only warn? (M-F-11, untouched by both dives) | **Fold** into the same dive as a single DECIDE |
| `kafka-clients` ships as a shaded jar under primary coordinates — the "no consumable library shades" claim is falsified | **Reject as a new dive; accept as a correction** — DIST-02 already ships the carve-out; recorded as frame correction 26 |
| Gradle does not sidestep the dependency-reduced-POM trade-off; kafka hand-patches via `pom.withXml` against [shadow#324](https://github.com/GradleUp/shadow/issues/324); what `components.shadow` emits on Shadow ≥ 9.0.0 is unestablished | **Fold** into wave-3 `consumability-across-build-systems`, which already owns M-H-02 |
| Whether `shadowJar` inherits Gradle 9's reproducible-archive default, and whether `mergeServiceFiles()` preserves entry order | **Fold** into wave-3 `encoding-locale-timezone-determinism`, which owns jar entry order and M-D-11 |
| `minimize()` has 0/32 corroboration and every claim traces to one sentence of Shadow's docs | **Defer** — M-G-06; DIST-10's conditional MUST is safe either way, and 0/32 means the rule flags nothing today |
| Maven-side checksum policy: assertj's `.mvn/maven.config` enumerates SHA-512, SHA-256, SHA-1 **and** MD5; nobody established whether that hardens or weakens | **Fold** into wave-3 `maven4-lifecycle-and-plugins` — `MVN-DEP` currently has no supply-chain row while `GRADLE-DEP` has three |
| Dependabot vs Renovate, 13/32 each with zero overlap, interacts with GRADLE-DEP-18 (resolve before emitting) | **Defer** — M-I-07 is already "ready to author from wave-1 evidence"; the interaction is one sentence in the `jvm-dependency-triage` skill, not a dive |
| Kover's `koverVerify` may auto-bind to `check`, the opposite of JaCoCo, on the evidence of one convention-plugin comment | **Fold** into wave-3 `kotlin-toolchain-and-codegen` — it is the only Kotlin build-side dive left |
| With find-sec-bugs at 0/32, does plain SpotBugs earn anything next to Error Prone + NullAway? Needs a `CORRECTNESS`/`MT_CORRECTNESS`-vs-`ENABLED_ERRORS` diff nobody attempted | **Fold** into wave-3 `errors-resources-and-lifecycle`, which already reads both catalogues |
| `@ResourceLock` semantics changed across four merged PRs in 2025-2026 and no PR is mapped to a release | **Defer** — M-S rows; JAVA-TEST-05's "carry the PR you verified against" is the correct hedge and a version map would buy precision, not correctness |
| Six JAVA-API/KT-API rows are "not independently measured" — every audit read config files, never `.java`/`.kt` source | **Defer, named** — the rows derive from the JLS and JEP 277, so measurement calibrates severity rather than correctness. Promote if an adopter disputes a severity |
| japicmp depth: are the six "declared" repos build-blocking, and is there an accepted-breaks template outside gradle/gradle's Groovy scaffolding? | **Fold** into wave-3 `jdk-floors-modules-and-removed-apis` — JAVA-API-02 currently ships one template nobody will copy |
| revapi has the better design and 0/32 adoption | **Defer** — M-K-01's decision is explicitly flagged for re-taking, not inheriting |
| `com.gradle.plugin-publish` 2.1.0 auto-applies `gradle/gradle-plugin-compatibility-plugin`, making a configuration-cache declaration deprecated-if-absent with an **undated** intent to hard-reject | **Defer as a dated re-check** — GRADLE-PLUG-17 carries the deprecation; no research can produce a cutover date that does not exist |
| NullAway's `-XDaddTypeAnnotationsToSymbol=true` workaround does **not** work on Oracle JDK builds — a toolchain-*vendor* trap, not a version trap | **Fold** into wave-3 `jdk-floors-modules-and-removed-apis` (it sets the SDK's JDK matrix, and quality-gates' Q2 is blocked on it) |
| Shadow's functional tests need four `--add-opens` args to test configuration-cache behaviour via `GradleRunner.withDebug()`; necessity on a JDK 17 floor unverified | **Reject** — one repo, one 2022 issue, and GRADLE-PLUG-10's separate CC leg does not need `withDebug()` |
| Gradle's 31 validation-problem IDs live under a docs directory literally named `unused/` yet the page is live and current | **Reject as a topic; keep as a note** — recorded so no later worker discounts the source |
| The `!!` catalog pins (98) are all in gradle/gradle's *distribution*/*test*/*provided* catalogs, and all 3 `strictly(` call sites are build-logic/compat/CLI | **Reject** — GRADLE-DEP-06's scope clause already encodes exactly this |
| dagger centralises the string-keyed catalog workaround into `buildSrc`'s `VersionCatalogs.kt` rather than repeating it per convention plugin | **Reject as a dive; keep as a citation** — GRADLE-STRUCT-03 should quote it as the concrete fix |
| jmh-gradle-plugin's own upstream signed-jar fix omits `.EC` — the most copy-pasted reference fix has the gap | **Reject** — DIST-05 and failure mode 3 already carry it |

### Map rows affected

**Uncovered → covered.** M-B-01, M-B-02, M-B-03, M-B-04, M-B-06, M-B-08
(GRADLE-STRUCT-01…09); M-C-01…M-C-13 (GRADLE-DEP-01…18); M-D-01…M-D-07,
M-D-10, M-D-11 (GRADLE-CACHE-01…17); M-F-01…M-F-06, M-F-08, M-F-09, M-F-10,
M-F-12 (GRADLE-PLUG-01…21); M-G-01…M-G-10 (DIST-01…20); M-J-01…M-J-04, M-J-13
(MVN-DEP-01…11); M-K-01…M-K-09 and M-Y-04 (JAVA-API-01…15); M-R-01…M-R-05,
M-R-07…M-R-11 (JAVA-LINT); M-S-01…M-S-11 (JAVA-TEST); M-T-01…M-T-10 (KT-API);
M-A-07 (Maven 4 settled at RC).

**Still uncovered after wave 2, and commissioned in wave 3.** M-B-05, M-B-07
(settings dive); M-F-04's Isolated-Projects half and M-F-11 (settings dive);
M-H-01…M-H-10 (the two publishing dives); M-X-01…M-X-10 (the two bazel-java
dives); M-J-05…M-J-12, M-J-14…M-J-16 (the Maven dive); M-A-01…M-A-03, M-Q-*
(the platform dive); M-N-*, M-U-*, M-O-*, M-P-* (concurrency, errors, security);
M-W-01…M-W-03, M-A-08 (the Kotlin toolchain dive).

**Priority moved by evidence.**

- **M-D-11 P0 → resolved and version-gated.** GRADLE-CACHE-17 branches on the
  wrapper version; the familiar "add `preserveFileTimestamps = false`" advice is
  now dead code on Gradle ≥ 9.0.0 and its inverse is an active regression.
- **M-C-07 P0 → same priority, opposite verification.** Zero violations exist.
  GRADLE-DEP-05's cell must say "read the owning module", because a raw grep
  flags the one repo that gets it right.
- **M-G-01 P0 → the evidence beneath it is falsified, the row survives.** The
  decision tree stands; "zero counterexamples" does not.
- **M-G-04 P1 → demoted to a grep trap.** error-prone does not relocate;
  DIST-11 and failure mode 9 carry the false positive.
- **M-F-07 P2 → dropped from the ruleset.** Both idioms are current; an
  idiom-only rewrite is churn (failure mode 11).
- **M-B-06 and M-B-08 P2 → covered anyway.** Both were in "genuinely deferred";
  the build-logic dive produced GRADLE-STRUCT-08/09 for them.
- **M-S-02 P0 → split in two.** Presence of the construct and the enclosing
  conditional are separate checks; a presence-only rule misreports two of the
  three exemplars.
- **M-R-01 P0 → one member reclassified.** `StringCaseLocaleUsage` is a
  severity bump, not an activation.
- **M-H-02 P0 → carried into wave 3 with new evidence attached** (kafka's
  `pom.withXml`, shadow#324, `components.shadow`).
- **M-J-13 / M-A-07 → settled at RC**, so `bom` packaging and consumer-POM
  flattening are migration-preview rows, not shippable mechanism.

### Frame corrections

Appended to [jvm-frame.md](jvm-frame.md) verbatim, continuing the wave-1
numbering.

26. **"No consumable library shades" has a counterexample** — `kafka-clients`
    ships shaded under primary coordinates (`apache__kafka@940c100fab:build.gradle:2089-2100`,
    `:401-420`). Corrects frame correction 11 and the measurement behind
    conflict 1 (dist).
27. **`com.gradle.plugin-publish` does not auto-apply Shadow** — it auto-publishes
    the shadow jar as the main artifact *if the module applies Shadow itself*;
    `GradleUp__shadow@541b3be475:build.gradle.kts` applies plugin-publish and
    neither shades nor relocates. Corrects conflict 1's plugin clause.
    **[jvm-distribution.md](jvm-distribution.md) verdict 4 still states the old
    version; the authoring pass takes
    [jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md) conflict A, which read
    the primary doc and measured the build** (plug vs dist).
28. **`google/error-prone` does not relocate packages when shading** — its one
    `<relocation>` is a `<distributionManagement>` artifact-move notice. Corrects
    M-G-04 and the pub audit's Axis-2 count (dist).
29. **Maven 4.0.0 is still RC as of 2026-09-12** — Central: `maven-core` 3.9.16
    stable, 4.0.0-rc-6 top of the 4.0 line. Confirms frame correction 2 and
    closes conflict 19 (deps).
30. **`StringCaseLocaleUsage` is in Error Prone's `ENABLED_WARNINGS`, not
    `DISABLED_CHECKS`** — the action is `-Xep:StringCaseLocaleUsage:ERROR`, a
    severity bump. Corrects M-R-01 (gates).
31. **gradle/gradle's binary-compatibility checker is japicmp** —
    `JapicmpTaskWithKotlin extends me.champeau.gradle.japicmp.JapicmpTask`;
    the bespoke part is the `ViolationRule` layer and the reviewed JSON
    allowlist. Corrects the gates audit's filename inference (api).
32. **`abiValidation{}` is 2/32, not 0/32** — ktlint and detekt both call it
    under `@OptIn(ExperimentalAbiValidation::class)`. Corrects the Kotlin dive's
    own measurement (api).
33. **spring-boot is not an `enforcedPlatform` violator** — 13 hits, all
    smoke-test, test or internal-tooling modules; the one `api(enforcedPlatform)`
    is in an internal platform whose next line says so. Corrects M-C-07's framing
    (deps).
34. **The Sonatype hallucination rate is a 7 %–25 %+ range by model generation,
    not a flat 28 %** — the figure is removed from the rule, which cites the
    mechanism instead. Corrects frame correction 25 (deps).
35. **Coverage: 3/32 *declare* a numeric floor; exactly 1/32 enforces one
    unconditionally** — junit-framework disables its floor under predictive test
    selection and kotlinx.coroutines gates Kover behind `-Pkover.enabled=true`.
    Sharpens frame correction 13 (gates).
36. **A green Gradle 9 build is not a cached build** — `maven-publish` with
    explicit `credentials {}` silently disables the configuration cache for that
    task ([#24040](https://github.com/gradle/gradle/issues/24040)); the pass
    signal is `Reusing configuration cache.` on a second identical run (core).
37. **`junit-platform.properties` keys carry the `junit.jupiter.` prefix** —
    both wave-1 audits printed the suffix form, so a grep written from their
    tables matches nothing (gates).
38. **Surefire: `3.6.0-M1` is the newest artifact on Central and `3.5.6` the
    newest GA line** — the plugin's own doc-site header reads "Version: 3.6.0".
    Extends frame correction 20 with the GA line (gates).
39. **Isolated Projects cannot yet enforce what it forbids** — Gradle's own
    9.7.0 docs mark two of four constraint categories "not fully enforced yet",
    and 5/32 adoption of the property is not adoption of a gate (core).

### Convergence

**Wave 2 was not convergent, and it was not close.** It produced 105 MUST rules
and 79 ranked failure modes, and a significant fraction of both had no M-ID at
all — GRADLE-STRUCT-06 (`buildSrc` must re-declare the root catalog or fail at
configuration time), GRADLE-PLUG-14 (`compileOnly` on another plugin's API
defeats `withPluginClasspath()`, and the exception names the wrong class),
DIST-16 (Spring Boot plus Shadow co-applied), JAVA-LINT-05 (NullAway's JSpecify
mode excludes Oracle JDK builds, not just old JDKs), GRADLE-DEP-05's inverted
verification. It also overturned five wave-1 measurements, two of them headline
claims this map built a conflict resolution on. A wave that falsifies its own
inputs at that rate is still discovering, not confirming.

**By the wave-plan's stop condition, wave 3 will not be convergent either** — it
opens five surfaces with zero prior dive coverage (JAVA-CONC, JAVA-SEC,
JAVA-ERR, JAVA-PLAT, KT-CORO, MVN-BUILD, BZL-JAVA), and new MUST rules there are
the expected outcome, not a failure. The stop condition that actually applies is
the third clause: **no open question a reviewer would call load-bearing.** Wave 3
converges if, when its six consolidations land, every remaining open question
falls into one of three classes and none requires a new source read:

1. **Dated re-checks nothing can close today** — Gradle 10's archive defaults,
   Maven 4's GA, plugin-publish's undated hard-reject of undeclared
   configuration-cache compatibility, `@ResourceLock`'s capability-to-version
   map, whether revapi acquires an adopter.
2. **Measurements the corpus cannot supply** — jlink, jpackage, `minimize()`,
   dependency locking, timezone pinning and find-sec-bugs are each 0/32, so the
   rules that cover them are precondition-derived and must say so in the file.
3. **The eight owner questions**, plus the four wave-2 consolidations added
   (Q-DEP-1/2/3, the plugin's Portal question, the SDK's coverage number, the
   JSpecify toolchain floor, the DIST-02 carve-out, the `abiValidation` opt-in).

**Expected residue at the end of wave 3**, stated now so nobody treats it as
failure: roughly a dozen dated re-checks, the six source-level JAVA-API/KT-API
rows left unmeasured by design, M-A-11 (which lint versions parse Java 25),
M-N-11, M-Q-09, M-U-10, M-X-09/10 if the owner declines Q6, and every Kotlin
Multiplatform row, which is out of scope by the frame and stays out.

## Wave 3 landed (2026-09-12)

Seven groups, eleven dives, seven consolidations. **Across all thirteen
consolidations: 296 rule IDs, 215 of them MUST, in 21 families.** Wave 3 alone
added 151 IDs and 110 MUSTs and opened seven families that had no rule before
(JAVA-CONC, KT-CORO, JAVA-PLAT, KT-COMP, JAVA-SEC, JAVA-ERR, MVN-BUILD/MVN-ANT,
BZL-JAVA, GRADLE-PUB/MVN-PUB). Nothing above this section is edited; M-IDs stay
stable and every row below cites the file that now owns it.

### Per group

| Group | Consolidation | MUSTs | IDs | Families |
|---|---|---|---|---|
| concurrency | [jvm-concurrency.md](jvm-concurrency.md) | 23 | 27 | JAVA-CONC, KT-CORO |
| gradle-settings | [jvm-gradle-settings.md](jvm-gradle-settings.md) | 9 | 10 | GRADLE-PLUG, GRADLE-STRUCT |
| publishing | [jvm-publishing.md](jvm-publishing.md) | 14 | 21 | GRADLE-PUB, MVN-PUB |
| bazel-java | [jvm-bazel-java.md](jvm-bazel-java.md) | 12 | 23 | BZL-JAVA |
| maven-and-ant | [jvm-maven-and-ant.md](jvm-maven-and-ant.md) | 15 | 21 | MVN-BUILD, MVN-ANT |
| platform-and-toolchains | [jvm-platform-and-toolchains.md](jvm-platform-and-toolchains.md) | 22 | 31 | JAVA-PLAT, KT-COMP |
| java-runtime-safety | [jvm-java-runtime-safety.md](jvm-java-runtime-safety.md) | 15 | 18 | JAVA-SEC, JAVA-ERR |

**concurrency** resolved eight. The two that change a rule's basis: the
no-`StructuredTaskScope`-in-shipped-code rule is a *class-file* constraint (JEP
12 pins preview bytecode to the exact feature release that compiled it), not a
maturity opinion; and the `synchronized`-vs-`ReentrantLock` guidance is
floor-conditional at JDK 24, where JEP 491 itself quotes JCIP §13.4 for
defaulting to `synchronized`. It also split map conflict 13 (virtual threads
were mandated *nowhere*, only a reactive runtime was rejected — the SDK's async
path is `Process.onExit()` at floor 17), scoped the `--enable-preview` grep to
the owning task so micronaut's test-only `jvmArg` is not a violation, promoted
detekt's activation gap to KT-CORO-01, named the one `GlobalScope` exception
(ktor's `CIOEngine.kt:73`), corrected "views do not sum" to "the base dispatcher
is the anti-pattern", and established that `runTest` cannot fail a real race.
Follow-ups: M-N-05…11 (rule or `JAVA-LINT` config?); Kotlin `Flow`; the JDK 27 GA
re-read; detekt's next stable activation table.

**gradle-settings** resolved five, all of them re-measurements that overturned
its own dive: duplicate leaf names are 3/32 and need a *uniform explicit group*
conjunct (Gradle's default group is the dotted parent path), subproject
`gradle.properties` is 17/32 with **zero** violations, spotless moves from the
violator list to the corpus's cleanest credential gate, the push-gate glob must
include `**/*.settings.gradle.kts` (tally 3 satisfy / 2 violate), and
`build-logic-settings` splits are 3/32 not 1/32 with ktor's
`build-settings-logic` the copy-target. It also inverted the wave-2 assumption
that a shared `BuildService` is Isolated-Projects-hostile: Gradle's own IP page
calls `registerIfAbsent(…)` safe. Follow-ups: Settings-plugin functional testing
under TestKit; cold-runner provisioning cost; latent-collision detection.

**publishing** resolved six. It raised the literal-credentials ban to MUST and
closed `GRADLE-CACHE-08`'s open question as "partially incompatible, exactly one
config shape"; falsified `GRADLE-DIST-13`'s rationale (Shadow's
`shadow`-configuration → POM mapping dates to 1.1.0, and kafka's `pom.withXml`
avoids the coupled manifest `Class-Path` write, not a POM defect); found **no
OIDC path** at the Central Portal in any primary source; resolved the
`mavenLocal()` × consumability-probe collision by a carve-out written into the
verification cell; departed from the corpus majority on publishing-plugin choice
by naming the departure; and split Sigstore (SHOULD) from provenance (CONSIDER)
on whether a consumer can act on the artifact. Follow-ups: Portal OIDC and the
Gradle SNAPSHOT path; the 42-file `mavenLocal()` census; release-gate ordering;
shadow#324's closure; M-H-08.

**bazel-java** resolved seven, three of them by re-measurement: the ruleset that
*ships* `fail_if_repin_required` does not set it on its own resolution;
`strict_visibility` rises to SHOULD on 3-of-4 adoption; dagger's unset
`x_lambdas` is a **confirmed** dual-build violation, not a silent default. It
split ijar from turbine by scope (source vs prebuilt jar), split strict-deps into
a runnable SHOULD and a MUST about the misreading that licenses `=off`, and
recovered the Bazel-only `_deploy.jar` residue the toolchains dive had deferred
wholesale to `jvm-distribution.md`. It also corrected every dagger `.bazelrc`
line number the toolchains dive cited. Follow-ups: JUnit 5 + coverage wiring;
`java_export` to Central; worker-state reproducibility.

**maven-and-ant** resolved seven. Three change a rule's text: jackson-databind
**violates** the JaCoCo `argLine` rule the dive filed it under satisfying (with
`<jacocoStrict>false</jacocoStrict>` and a non-failing `requireFilesExist` as its
own smoking gun); `mvn verify` binds the CI *gate*, not every invocation, so
guava's `-DskipTests install` bootstrap is correct and error-prone's
`install`→`test` pipeline is the violation; and Surefire is pinned from Central's
`maven-metadata.xml`, never the doc-site banner. It also moved the supply-chain
rows from MVN-DEP to MVN-BUILD (family follows file kind), kept both halves of
the checksum question by scope (Resolver checksums are integrity-only; the
wrapper checksum is the one place integrity is the only available control), and
shipped Ant as conditional-entry rules that fire only on a `build.xml`.
Follow-ups: `maven.compiler.proc`; Maven toolchains; `maven-antrun-plugin`;
CI-injected build extensions.

**platform-and-toolchains** resolved ten, more than any other file, and most of
them are ownership splits rather than fact disputes: timezone stays CONSIDER
against the map's P1; `JAVA-PLAT-01`'s check reads the owning compile execution
(guava's 1.8 base layer is the correct base of a two-execution MR-JAR); the
adversarial-locale job drops to CONSIDER because the call-site lint is the MUST;
`jvmTarget` and `options.release` are one decision written twice (KT-COMP-04);
the Kotlin floor has two distinct halves (language-version values died at 2.3.0,
the K1 compiler at 2.4.0); archive reproducibility stays with `GRADLE-CACHE-17`;
japicmp depth and the Kover `check` wiring are handed back as evidence rather
than duplicated as rules. Follow-ups: mixed-module bytecode floor; Dokka in
`docs-quality`; `Properties.store()` on the Gradle side; JEP 472's deny release;
the CI-runner timezone audit.

**java-runtime-safety** resolved seven. The two that edit landed rules:
`JAVA-LINT-10` is amended (core SpotBugs independently earns a slot for
`UL_UNRELEASED_LOCK` and the annotation-free `NP_*` family, separately from
find-sec-bugs' security coverage), and `removal` is added to `JAVA-LINT-07`'s
enumerated `-Xlint` list. It corrected the gates audit's headline counts (Error
Prone **11/32**, SpotBugs-as-gate **2/32**), split the SDK's subprocess into two
trust boundaries in one library, cut the index allocation from five JAVA-ERR rows
to three plus one JAVA-SEC line, split M-N-06 at the `AutoCloseable` seam, and
removed PMD from M-O-04's peer list on SonarSource's own deprecation record.
Follow-ups: find-sec-bugs' maintenance status; Kotlin's half of the family;
the trust boundary for a subprocess with no live upstream.

### Surprises

Every wave-3 finding this map did not anticipate, with its verdict.

| Surprise | Verdict |
|---|---|
| jackson-core made a lock-free `BufferRecyclerPool` the default in 2.17.0, **reverted it in 2.17.1** after production regressions, and deprecated the pool in 2.18.0 — the obvious virtual-thread fix for `ThreadLocal` caching was tried by the flagship and rolled back | **Promote** — JAVA-CONC-08's worked example; the rule forbids the blanket swap and requires a stated strategy |
| JEP 12's class-file mechanism pins preview bytecode to the *exact* feature release that compiled it, `--enable-preview` re-passed or not | **Promote** — it is JAVA-CONC-05's whole basis, and it replaces map conflict 15's maturity argument |
| detekt ships `GlobalCoroutineUsage` and `SuspendFunSwallowedCancellation` and both are `active: false`; 1/32 activates any, **0/32** activates the swallowed-cancellation pair | **Promote** — KT-CORO-01, the gate row the rest of the family depends on |
| micronaut-core's sole `--enable-preview` is a `Test{jvmArgs}` entry with no preview compile — the corpus's only precedent is inert, and the naive grep flags it | **Fold** into JAVA-CONC-05's verification (read the owning task). Same failure shape as the wave-2 correction to GRADLE-DEP-05 |
| The JVM has no `killpg`: `destroy()`/`destroyForcibly()` reach only the immediate child, and on Windows `destroy()` is already `TerminateProcess` so the grace window is POSIX-only | **Promote** — JAVA-CONC-11's `descendants()` walk and its platform note |
| `java.net.http` ships zero JSON support of any kind — the hand-rolled reader is the only option the JDK leaves, not a corner being cut | **Fold** into JAVA-API-15's rationale; it is the zero-dependency commitment's mechanism, not a separate rule |
| Gradle's own Isolated Projects page calls `gradle.sharedServices.registerIfAbsent(…)` explicitly "safe with Isolated Projects" — the reverse of the wave-2 brief | **Promote** — GRADLE-PLUG-26, with the bound (two of four IP constraint categories still unenforced) stated |
| `JavaToolchainDownload` carries only a bare URI: **no checksum field anywhere** in the toolchain-resolver contract, and foojay (8/32) exposes no hash setting either | **Promote** — GRADLE-PLUG-22's basis. The sanctioned toolchain seat never enforces a hash, so provisioning cannot live there |
| 17/32 repos carry a subproject `gradle.properties` and **zero** are violations; nowinandroid's even cites gradle/gradle#2534 as the reason it must exist | **Promote as a correction** — GRADLE-STRUCT-11 is scoped to `org.gradle.*` keys outside a build root; the general best practice is deliberately not shipped |
| gradle/gradle#847 is open since 2016 and reproduces on 8.12.1, but the collision needs a *uniform explicit group* — Gradle's default group is the dotted parent path | **Promote with the conjunct** — GRADLE-STRUCT-10. Without it the rule condemns nowinandroid's five `:api` / six `:impl` modules |
| Shadow's `shadow`-configuration → RUNTIME-scope POM mapping dates to **1.1.0 (2014)**; kafka's `pom.withXml` avoids the coupled manifest `Class-Path` write, not a POM defect | **Promote as a correction** — GRADLE-PUB-11 owns the mechanism; GRADLE-DIST-13's rationale is rewritten, its rule survives |
| The Central Portal has **no OIDC/trusted-publishing path** in the guide, requirements, Publisher API or registration pages fetched 2026-09-12 | **Reject the claim; record the negative** — config-inventory Axis 3's assertion is withdrawn; a Portal token in CI secrets is the only documented path |
| junit-framework's own test suite asserts the literal `<!-- do_not_remove: published-with-gradle-metadata -->` marker as a golden line | **Fold** into GRADLE-PUB-09 as corpus proof that the consumer view is under test |
| kafka disables `GenerateModuleMetadata` for its shaded `:clients` module only — a real exemplar for the SDK's "suppress GMM or not" question | **Fold** into GRADLE-PUB-10 as the scoping template |
| `fail_if_repin_required` defaults to **False** — a stale or hand-corrupted `maven_install.json` is a printed warning and the build continues, the opposite shape from crate_universe's unconditional gate | **Promote** — BZL-JAVA-11, the single highest-yield row in that family |
| `name_deploy.jar` is an implicit output "only built if explicitly requested": a green `bazel build //...` never builds the shipped artifact (1/32 name one) | **Promote** — BZL-JAVA-21, against the toolchains dive's decision to defer M-X-08 wholesale |
| `x_lambdas` is unset in **0/6** Bazel-carrying repos, and dagger compiles the same `.kt` files under both Gradle and Bazel — a confirmed bytecode divergence, not a hypothetical | **Promote** — BZL-JAVA-19 at MUST for a dual build, SHOULD otherwise |
| assertj's `.mvn/maven.config` uses Resolver-1.x property names that resolver 2.0 renamed — the config becomes a silent no-op the day the wrapper moves to Maven 4 | **Promote** — MVN-BUILD-11; unrecognised system properties are ignored, never rejected |
| Maven Resolver's own docs reject the "MD5/SHA-1 are insecure" framing: checksums are integrity-only and never a trust control; Gradle's mental model does not transfer | **Promote** — MVN-BUILD-12, with the wrapper checksum (MVN-BUILD-14) as the named carve-out |
| apache/maven's own `--add-opens`/JaCoCo `argLine` fix ([apache/maven#11605](https://github.com/apache/maven/pull/11605)) is **open and unmerged** — the workaround is the fix | **Promote** — MVN-BUILD-04 |
| `.mvn/extensions.xml` is 0/32 committed, yet apache/maven's CI copies one in before the Maven-3 leg and swaps it for `~/.m2/extensions.xml` on the Maven-4 leg | **Promote** — MVN-BUILD-15 requires reading CI configs, not only `git ls-tree`. A census of committed files is not a finding about the build that runs |
| Shadow's `ShadowJar` never overrides `createCopyActionExecuter()`, so Gradle 9's `reproducibleFileOrder` guarantee reaches shadow output for free | **Fold** — it answers the wave-2 handover question and keeps archive reproducibility entirely inside GRADLE-CACHE-17 |
| `mergeServiceFiles()` merges into a `LinkedHashSet`, so merged provider order is classpath-resolution order, not sorted — Shadow's docs state this nowhere | **Promote** — JAVA-PLAT-11's second half; any "byte-identical shadowJar" claim without locked versions is unverified |
| Shadow already ships `internal/ReproducibleProperties.kt`, which overrides `store()` to throw and sorts entries — proof the `Properties.store()` date-comment bug is real and the template for the fix | **Promote** — JAVA-PLAT-15's reference shape |
| `jvmToolchain(N)` does not raise the bytecode target: `jvmTarget` still defaults to `"1.8"` and the toolchain only back-fills an unset value | **Promote** — KT-COMP-04. A Kotlin build on JDK 21 shipping Java 8 bytecode is the default state, not an accident |
| `jvmDefault`'s default flipped to `ENABLE` in Kotlin 2.2.0, confirmed by two exemplars explicitly overriding back to `NO_COMPATIBILITY` | **Promote** — KT-COMP-03 at MUST for a library publishing interfaces |
| kapt in google/dagger is a deliberately preserved regression fixture under `javatests/artifacts/**`, not legacy cruft being phased out | **Fold** into KT-COMP-08's rationale — the corpus has no production kapt to point at |
| Kover's `check` depends on `koverVerify` by default since 0.7.0 — the opposite default from JaCoCo, proven by a task tree and a maintainer reply, stated in Kover's docs nowhere | **Promote as a correction to a landed rule** — JAVA-TEST-08 gains a Kotlin exception; see contradictions table row 5 |
| Oracle's `seccodeguide.html` has already been edited for JDK 24: all twenty section-9 guidelines carry a "permanently disabled since Java 24" note — the source resolves its own currency problem | **Fold** into JAVA-SEC-09 — cite section 9 only through that note; sections 0/1/2/3/5/8 stay current |
| CVE-2026-54512 and CVE-2026-54513 are two *distinct* PTV bypasses in one advisory (generic-parameter substring vs array-component); patching one code path closes neither the other nor the pair | **Promote** — JAVA-SEC-02 is a resolved-version check, never a configuration check |
| Core SpotBugs has **zero** detectors for XXE, command injection or path traversal — the coverage gap is total, not partial, for three of the six core shapes | **Promote** — JAVA-SEC-08, and the amendment to JAVA-LINT-10 |
| `KafkaProducer.java:1074`'s published Javadoc teaches `e.printStackTrace()` in the async callback, and it is the **only** `printStackTrace` in kafka's 6,177 `.java` files | **Promote as the provenance of a failure mode** — JAVA-ERR-07's agent failure mode is cited, not asserted |
| gradle/gradle runs Error Prone on its build-logic and still drops an interrupt bit at `KillLeakingJavaProcesses.java:267-271`, because `InterruptedExceptionSwallowed` sits in `DISABLED_CHECKS` | **Promote** — the sharpest single argument for JAVA-LINT-02's promotion list |
| assertj declares SpotBugs at `<effort>Max</effort>` inside `<reporting>` and no workflow ever runs `mvn site` or `spotbugs:check` — a gate that has never run | **Promote as a correction** — SpotBugs-as-gate is 2/32, not 3/32 |
| Medium blocks every fetch path for the two Elizarov coroutine design articles (403/DNS on WebFetch, curl+UA, web.archive.org, freedium.cfd) | **Reject as a topic; keep as a method note** — the coroutine rules stand on JetBrains' own docs; the Elizarov excerpts are flagged partial-confidence in Sources and nothing normative rests on them |
| detekt's coroutine rule classes moved to `dev.detekt.rules.coroutines` from `io.gitlab.arturbosch.detekt.rules.coroutines` | **Reject as a dive; keep as a failure mode** — an agent emitting the historical package coordinates writes config that will not compile |
| bazel-and-java states the default javac options are `-source 8 -target 8` two paragraphs from stating `--java_language_version` defaults to 11 — an internal doc contradiction, unfixed at `dateModified: 2026-09-05` | **Reject** — recorded so no later worker treats either sentence as authority; the user-manual page is the self-consistent one |
| Bazel's two doc pages disagree on the strict-deps flag name and no `bazel` binary exists in this program's sandbox | **Defer as a one-command re-check** — BZL-JAVA-05 ships SHOULD with the exemplar-evidenced spelling as the writable default |
| rules_kotlin transferred from `bazelbuild/` to `bazel-contrib/`; `rules_jvm_external` and `rules_jvm` never merged and are both live | **Reject as a dive; keep as a failure mode** — a `gh api` read, not a search, is the check |
| The one wrapper-checksum exemplar in the corpus (assertj) sets **neither** `wrapperSha256Sum` nor `distributionSha256Sum` — 0/1, not partial adoption | **Promote** — MVN-BUILD-14's violation row |
| `WebFetch`'s summarisation mangled `-Xwhen-guards` into `-Xguard-conditions` on a kotlinlang page; flag-name precision needed cross-checking three pages | **Reject as a topic; keep as a method note** — every flag name in KT-COMP-01 was cross-checked against `compiler-reference.html` |

### Map rows affected

**Uncovered → covered.** M-N-01…04 and M-Y-02 (JAVA-CONC-01…14); M-U-01…06,
M-U-08, M-U-09 (KT-CORO-01…13); M-B-05, M-B-07 (GRADLE-STRUCT-10, -11);
M-F-04's Isolated-Projects half and M-F-11 (GRADLE-PLUG-26/27, -28); M-H-01…M-H-10
(GRADLE-PUB-01…18, MVN-PUB-01…03); M-X-01…M-X-08 (BZL-JAVA-01…23);
M-J-05…M-J-12, M-J-14…M-J-16 (MVN-BUILD-01…15, MVN-ANT-01…06); M-A-01…M-A-03,
M-Q-01…M-Q-08 (JAVA-PLAT-01…18); M-A-08, M-W-01…M-W-03 (KT-COMP-01…13);
M-O-01…M-O-07 (JAVA-ERR-01…09); M-P-01…M-P-09 (JAVA-SEC-01…09).

**Still uncovered after wave 3.** M-N-05…M-N-11 (commissioned to wave 4);
M-U-07 and M-U-10 (Kotlin `Flow` — stays deferred under Q1's Java-first default);
M-X-09, M-X-10 (partly absorbed by BZL-JAVA-23 and -20 as CONSIDER rows);
M-Y-06 (owner Q8). Seven depth files still have **no consolidation at all** and
are authored straight from wave-1 evidence: `JAVA-DATA` (M-L-01…08), `JAVA-NULL`
(M-M-01…07), `KT-INTEROP` (M-V-01…08), `KT-LINT` (M-R-07…11), `KT-TEST`
(M-S-03, -10, -11), `GRADLE-TOOL` (M-E-01…08), `GRADLE-CI` (M-I-01…07). That is
by design — the Deferred section's first table already ruled a dive would buy
confirmation, not a decision — but the authoring pass must not mistake the
absence of a consolidation for the absence of a file.

**Priority moved by evidence.**

- **M-N-05…M-N-11 P0/P1 → commissioned.** Adjudicated P0/P1 in wave 1, dived by
  nobody in waves 2 or 3; they are wave 4's fifth dive.
- **M-J-10 → narrowed, not dropped.** The `mvn verify` rule binds the CI gate;
  guava's `-DskipTests install` bootstrap is correct and error-prone's pipeline
  is the violation. A flat prohibition would have flagged the right repo.
- **M-Q-06 (timezone) P0/P1 → CONSIDER, and its rule is dropped as a
  duplicate.** Priority ranks research value; severity ranks what fails a build.
  0/32 cannot carry a MUST, and `JAVA-TEST-11` already owns the "do not invent"
  list.
- **M-A-01/02/03 → settled.** Floor 17, toolchain 25, matrix 17/21/25, with the
  trigger for moving the floor written as "when Spring Boot and JUnit move", not
  as an LTS date.
- **M-H-02 → closed.** `components.shadow` is not the mechanism; Shadow's
  `shadow` configuration is, and has been since 1.1.0.
- **M-H-08 P2 → MAY at most**, and only if the OCX Gradle plugin ships a catalog
  for consumers. 1/32 (ktor).
- **M-X-08 → recovered from a wholesale deferral.** BZL-JAVA-21 carries the
  Bazel-only implicit-output residue that `jvm-distribution.md` cannot.
- **M-F-04 and M-F-11 → closed, and one assumption inverted.** A Settings
  plugin's shared `BuildService` is the IP-*safe* shape; keeping JSR-305 on a
  plugin API is safe and migrating it to JSpecify is the consumer-breaking move.

### Frame corrections

Appended to [jvm-frame.md](jvm-frame.md) verbatim, continuing the wave-2
numbering (which ended at 41).

42. **A preview-dependent class file is pinned to the exact JDK feature release
    that compiled it** (JEP 12, `minor_version` all-16-bits-set). A jar built
    with `--enable-preview` on JDK 26 will not load on JDK 27 even with the flag
    re-passed. Replaces map conflict 15's maturity argument with a technical one
    (conc).
43. **JEP 491 quotes JCIP §13.4 for defaulting to `synchronized` on JDK 24+**,
    and says migrated code need not be reverted. The unconditional "migrate to
    `ReentrantLock` to avoid pinning" formulation is wrong above 24 (conc).
44. **jackson-core made a lock-free `BufferRecyclerPool` the default in 2.17.0
    and reverted it in 2.17.1**, deprecating the pool in 2.18.0 — the flagship
    tried the blanket `ThreadLocal` swap in production and backed it out (conc).
45. **detekt's four coroutine-correctness rules ship `active: false`.** 1/32
    activates any (detekt itself, `GlobalCoroutineUsage` only); **0/32** activate
    `SuspendFunSwallowedCancellation` or `SuspendFunInFinallySection`. "detekt is
    configured" is not "these checks run" (conc).
46. **The JVM has no `killpg`.** `Process.destroy()`/`destroyForcibly()` reach
    only the immediate child, so a kill ladder for a forking CLI needs an
    explicit `descendants()` walk; on Windows `destroy()` is already
    `TerminateProcess`, so the grace window is POSIX-only (conc).
47. **`java.net.http` ships zero JSON support** — `BodyHandlers` return only
    `String`/`InputStream`/`Path`. The hand-rolled reader is the only option the
    JDK leaves, not a corner being cut (conc).
48. **Gradle documents `gradle.sharedServices.registerIfAbsent(…)` as "safe with
    Isolated Projects"** — the reverse of the wave-2 brief's assumption that a
    Settings-plugin BuildService is IP-hostile. Bounded: two of IP's four
    constraint categories are still unenforced at 9.7.0 (settings).
49. **`JavaToolchainDownload` carries only a bare URI — there is no checksum
    field anywhere in the toolchain-resolver contract**, and foojay (8/32)
    exposes no hash setting. Gradle's sanctioned toolchain seat never enforces a
    hash, so a non-JDK binary cannot be provisioned through it (settings).
50. **A subproject `gradle.properties` is 17/32 and zero are violations.** Every
    non-root file carrying an `org.gradle.*` key is a build root; nowinandroid's
    cites [gradle/gradle#2534](https://github.com/gradle/gradle/issues/2534) as
    the reason it must exist. The naive `find -mindepth 2` check flags 17 correct
    repos (settings).
51. **Duplicate subproject leaf names collide only under a uniform explicit
    `group`** — Gradle's default group is the dotted parent path
    (`Project.java:393-394`), which already disambiguates nested paths. 3/32
    carry duplicates; nowinandroid's are correct (settings).
52. **`build-logic-settings` splits are 3/32, not 1/32.** ktor's
    `build-settings-logic` is the cleanest instance and the copy-target;
    junit-framework is a partial split, correcting
    [jvm-gradle-core.md](jvm-gradle-core.md) verdict 7's "ships the merged form"
    (settings).
53. **Shadow's `shadow`-configuration → RUNTIME-scope POM mapping dates to 1.1.0
    (2014-08-26).** kafka's hand-rolled `pom.withXml` avoids the coupled manifest
    `Class-Path` write ([shadow#324](https://github.com/GradleUp/shadow/issues/324)),
    not a POM defect. `GRADLE-DIST-13`'s rule survives; its rationale is wrong
    (pub).
54. **The Central Portal has no OIDC / trusted-publishing path** in the guide,
    requirements, Publisher API or registration pages fetched 2026-09-12.
    Withdraws `config-inventory.md` Axis 3's assertion; a Portal token in CI
    secrets is the only documented path (pub).
55. **Error Prone is 11/32 and SpotBugs-as-a-gate is 2/32**, not 13/32 and 3/32.
    kafka's and maven's hits are `error_prone_annotations` *exclusions* with no
    plugin applied; assertj's SpotBugs block is `<reporting>`-only and no
    workflow runs `mvn site` or `spotbugs:check`. Every downstream "N/32
    adopters" claim inherits the correction (safety).
56. **Core SpotBugs has zero detectors for XXE, command injection or path
    traversal** — the gap is total for three of the six JAVA-SEC shapes. But
    `CORRECTNESS`+`MT_CORRECTNESS` independently earns a slot for
    `UL_UNRELEASED_LOCK` and the annotation-free `NP_*` family. `JAVA-LINT-10`
    is amended, not replaced (safety).
57. **`fail_if_repin_required` defaults to `False`** (`coursier.bzl:1683`): a
    stale or hand-corrupted `maven_install.json` prints a warning and the build
    continues. Both lock-file self-checks are advisory until the flag is set —
    the opposite shape from crate_universe's unconditional gate (bazel).
58. **`name_deploy.jar` is an implicit output "only built if explicitly
    requested"** — a green `bazel build //...` never builds the shipped
    artifact. 5/32 declare `java_binary(`; **1/32** names a `_deploy.jar` path
    anywhere (bazel).
59. **`x_lambdas` defaults to `"class"` under rules_kotlin while Kotlin 2.x and
    Gradle both default to `"indy"`.** 0/6 Bazel-carrying repos set it, and
    dagger compiles the same `.kt` files under both builds — a confirmed bytecode
    divergence (bazel).
60. **jackson-databind violates the JaCoCo `argLine` composition rule**
    (`pom.xml:44-46` is two bare `--add-opens` flags with no `@{argLine}`), and
    the POM carries its own smoking gun at `:51-54`
    (`<jacocoStrict>false</jacocoStrict>`, "release fails due to missing
    jacoco... so disable for now"). It is the counterexample, not the exemplar
    (maven).
61. **`mvn verify` binds the CI gate, not every invocation.** guava's
    `-DskipTests install` reactor bootstrap followed by a `verify` gate is
    correct; error-prone's `install` → `test` pipeline, which never reaches
    `verify`, is the violation (maven).
62. **Maven Resolver's own docs reject the "MD5/SHA-1 are insecure" framing**:
    checksums provide integrity only, never trust or MITM protection, and Maven
    has no `verification-metadata.xml` equivalent at all. Gradle's mental model
    does not transfer. The wrapper checksum is the one carve-out — nothing signs
    a distribution downloaded before any trust chain exists (maven).
63. **`.mvn/extensions.xml` is 0/32 committed and apache/maven's CI injects
    one** — an extension can replace the local repository wholesale, so "no
    extensions" read off `git ls-tree` is not a finding about the build that runs
    (maven).
64. **`jvmToolchain(N)` does not raise the bytecode target.** `jvmTarget` still
    defaults to `"1.8"` and the toolchain only back-fills an unset value — a
    Kotlin build compiling on JDK 21 and shipping Java 8 bytecode is the default
    state (plat).
65. **Kotlin's `jvmDefault` default flipped to `ENABLE` in 2.2.0**, confirmed by
    two exemplars explicitly overriding back to `NO_COMPATIBILITY`. A library
    publishing interfaces that does not state it silently starts emitting real
    `default` methods on upgrade (plat).
66. **`-language-version 1.8/1.9` was dropped in Kotlin 2.3.0; the K1 compiler
    was removed in 2.4.0.** Two distinct facts; frame correction 2 states only
    the second, and a claim must name which it depends on (plat).
67. **Kover's `check` depends on `koverVerify` by default since 0.7.0** — the
    opposite default from JaCoCo, proven by a task tree and a maintainer's
    `onCheck = false` reply
    ([kotlinx-kover#523](https://github.com/Kotlin/kotlinx-kover/issues/523)) and
    stated in Kover's own docs nowhere (plat).
68. **`mergeServiceFiles()` merges into a `LinkedHashSet`**, so merged
    `META-INF/services` order is classpath-resolution order, not sorted. Shadow's
    docs state this neither way. Any "byte-identical shadowJar" claim made
    without locked dependency versions is unverified (plat).
69. **Oracle's `seccodeguide.html` is already edited for JDK 24** — all twenty
    section-9 Access Control guidelines carry a "security manager permanently
    disabled since Java 24" note. The source resolves its own currency problem
    and does not need excluding wholesale (safety).
70. **CVE-2026-54512 and CVE-2026-54513 are two distinct bypass mechanisms in
    one advisory** (generic-parameter substring check vs `allowIfSubTypeIsArray()`
    component check). Only a version bump closes both; a correctly configured
    `PolymorphicTypeValidator` closes neither (safety).
71. **`rule-distillation`'s "60-100 shipped rules" band is per rule set, not per
    program.** This program ships four rule sets plus a Bazel handoff; 296 merged
    IDs across 21 families at roughly 70 shipped per rule set is inside the
    funnel, not over it. The binding budgets are the per-index line count
    (< 200) and the per-depth-file size the catalog already ships (this map).
72. **A depth file's ID family does not decide its glob; the index it hangs from
    does.** `JAVA-PLAT` rows whose edit site is a build file (source encoding,
    `org.gradle.jvmargs`, `project.build.outputTimestamp`, the floor numbers)
    cannot fire from `**/*.java` and belong to `GRADLE-TOOL` / `MVN-BUILD`. This
    is the structural error behind three of the contradictions below (this map).

### Cross-consolidation contradictions

All thirteen rulesets read against each other. A GRADLE row and an MVN row
answering the same question differently is fine where the build system is the
difference; the rows below are the ones where it is not, plus the overlaps that
would ship the same rule twice on one glob. **The drafters apply the resolution
column and keep only the ID named in the last column.** No row here starts with
a bare rule ID, because `check-artifacts.py` reads such a row as a rule
definition.

| # | What conflicts | Resolution the drafters apply | Text that survives |
|---|---|---|---|
| 1 | Shading a Gradle plugin: `GRADLE-DIST-03` (MUST) says `com.gradle.plugin-publish` already applies `com.gradleup.shadow`, so do not add it by hand; `GRADLE-PLUG-21` (SHOULD) and [jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md) conflict A say it does **not** — it auto-publishes the shadow jar as the main artifact only if the module applies Shadow itself, and `GradleUp__shadow@541b3be475:build.gradle.kts` applies plugin-publish while neither shading nor relocating. Same tool, two answers | Primary doc plus measurement beats a paraphrase (frame correction 27). `GRADLE-DIST-03`'s premise, MUST severity and rationale are rewritten to "shading a plugin is opt-in; if the module applies Shadow, audit what was relocated" — and [jvm-distribution.md](jvm-distribution.md) verdict 4 and its OCX-plugin "inherits plugin-publish's auto-shading" commitment are rewritten with it | `GRADLE-PLUG-21` |
| 2 | `--release` versus `source`/`target`: `JAVA-API-13` (MUST, "empty grep output is the pass"), `JAVA-PLAT-01` (MUST, "open the owning compile execution — guava's 1.8 base layer is correct") and `MVN-BUILD-01` (MUST, "any hit is the finding, even when the value looks modern") are three rules on one fact with three verifications, two of which flag `google__guava@5fb424c43a:pom.xml:215-216` — the file [jvm-platform-and-toolchains.md](jvm-platform-and-toolchains.md) verdict 2 rules **correct** | One fact, one owner. `JAVA-API-13` is dropped outright (same glob, same index, worse cell). `JAVA-PLAT-01`'s read-the-owning-execution correction is copied verbatim into `MVN-BUILD-01`, whose surviving complaint against guava narrows to the true one: no `maven.compiler.release` property at all and the literal `1.8` repeated three times. `MVN-BUILD-01` keeps its own ID as bounded duplication — a Maven-only adopter never loads `java-quality` | `JAVA-PLAT-01` + `MVN-BUILD-01` |
| 3 | JPMS metadata: `JAVA-API-12` and `JAVA-PLAT-04` are the same MUST ("ship a real `module-info.java`; `Automatic-Module-Name` is not a lighter version"), in two depth files behind one index | [jvm-platform-and-toolchains.md](jvm-platform-and-toolchains.md) already says PLAT-04 "confirms JAVA-API-12 rather than re-deciding it" — make that literal. `JAVA-PLAT-04` is dropped; `JAVA-PLAT-05` (the floor-below-9 MR-JAR execution split) survives because `JAVA-API-12` only mentions it in passing | `JAVA-API-12` + `JAVA-PLAT-05` |
| 4 | Maven reproducibility: `JAVA-PLAT-16` (SHOULD, "modules making a reproducibility claim") versus `MVN-BUILD-10` (MUST, "any published POM"). Same fact, two severities — and `java-quality` does not glob `**/pom.xml`, so PLAT-16 can never fire on the file it governs | `MVN-BUILD-10` keeps the text, the MUST and the `artifact:check-buildplan`/`artifact:compare` verification. `JAVA-PLAT-16` is dropped (frame correction 72) | `MVN-BUILD-10` |
| 5 | Coverage floors: `JAVA-TEST-08` (MUST) asserts a floor exists only when explicitly wired into `check`, on Gradle's JaCoCo docs. [jvm-platform-and-toolchains.md](jvm-platform-and-toolchains.md) hands back the settled opposite for Kover — `check` depends on `koverVerify` by default since 0.7.0. Applied to a Kotlin project, the landed rule reports "no floor" on a project that has one | Amend `JAVA-TEST-08` in place with a Kover exception naming 0.7.0 and [kotlinx-kover#523](https://github.com/Kotlin/kotlinx-kover/issues/523); the `KT-TEST` sibling row states the inverse default and cites it. Do not create a new rule for the correction | `JAVA-TEST-08` (amended) |
| 6 | SpotBugs' value: `JAVA-LINT-10` (SHOULD) says SpotBugs earns a slot **only** with find-sec-bugs; [jvm-java-runtime-safety.md](jvm-java-runtime-safety.md) conflict 1 measures that core `CORRECTNESS`+`MT_CORRECTNESS` independently earns one for `UL_UNRELEASED_LOCK` and the annotation-free `NP_*` family, which Error Prone has no analog for at any promotion level | Both are right about different families. `JAVA-LINT-10`'s text gains the second clause — "…**or** the module needs the lock/wait/notify and annotation-free null-dataflow families". `JAVA-SEC-08` keeps the security half and cites LINT-10. This edits a landed rule and is an owner decision | `JAVA-LINT-10` (amended) + `JAVA-SEC-08` |
| 7 | `-Xlint` keys: `JAVA-LINT-07` mandates `-Werror` with an **enumerated** key list naming seven keys, none of which is `removal`; `JAVA-ERR-06`'s only free mechanical check is `-Xlint:removal` | Add `removal` to `JAVA-LINT-07`'s enumerated list; leave `deprecation` out deliberately (it fires on every use of a deprecated-but-present API). Edits a landed rule — owner decision | `JAVA-LINT-07` (amended) |
| 8 | Gate adoption counts: [jvm-quality-gates.md](jvm-quality-gates.md) verdict 2 and `JAVA-LINT-01`'s violation row print Error Prone 13/32, SpotBugs-as-gate 3/32 and "19/32 run neither"; [jvm-java-runtime-safety.md](jvm-java-runtime-safety.md) conflict 2 read the build files and found 11/32, 2/32 | Read-the-file beats grep-the-repo. Every "N/32" in `JAVA-LINT`'s shipped text becomes **11/32** Error Prone, **2/32** SpotBugs-as-gate, **21/32** run neither. The severity split (SHOULD for adopters, MUST for what this program authors) is unchanged — it gets stronger | corrected counts everywhere |
| 9 | Plugin validation, stated twice on one glob: `GRADLE-CACHE-16` (MUST, plugin) and `GRADLE-PLUG-01`+`GRADLE-PLUG-02` are the same requirement — run `validatePlugins` as its own CI step with `enableStricterValidation = true`. Both depth files live in `gradle-build/` and load together | `plugin-authoring.md` is the file the index routes plugin work to. `GRADLE-CACHE-16` is dropped; `caching-and-correctness.md` cites `GRADLE-PLUG-01/02` in one line. [jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md) already has a "deliberately not repeated here" list; gradle-core did not reciprocate | `GRADLE-PLUG-01` + `GRADLE-PLUG-02` |
| 10 | Configuration-cache testing, stated twice on one glob: `GRADLE-CACHE-07` (MUST, plugin — a TestKit test asserting `--configuration-cache` succeeds) and `GRADLE-PLUG-10` (MUST — a dedicated functional-test leg, plus the `compatibility { features { } }` claim it licenses) | `GRADLE-PLUG-10` is strictly richer and owns the Portal-claim half. `GRADLE-CACHE-07` is dropped and cited | `GRADLE-PLUG-10` |
| 11 | Timezone pinning: `JAVA-TEST-11` (CONSIDER, "do not add test retry, a TZ pin, or mutation testing") and `JAVA-PLAT-17` (CONSIDER, "pin the test-suite timezone on date-sensitive modules") point opposite ways at CONSIDER severity on the same 0/32 measurement | `JAVA-TEST-11` owns the "do not invent" list and keeps the text. `JAVA-PLAT-17` is dropped to one prose line in `platform-and-versions.md` citing it. `JAVA-PLAT-18` (the adversarial-locale job) survives — it is the opposite, positive, guava-evidenced practice | `JAVA-TEST-11` + `JAVA-PLAT-18` |
| 12 | NullAway's JSpecify precondition, stated twice at MUST: `JAVA-LINT-05` (lint wiring) and `JAVA-PLAT-03` (toolchain and vendor) carry near-identical text | Keep both IDs — the edit sites genuinely differ (a lint block versus a toolchain block) — but `JAVA-PLAT-03` states the precondition only and `JAVA-LINT-05` cites PLAT-03 for the JDK/vendor matrix instead of restating it. Neither file carries the matrix twice | both, de-duplicated |
| 13 | `ValueSource` versus `BuildService`: `GRADLE-PLUG-08` says ValueSource reads and BuildService holds; `GRADLE-PLUG-24` forbids computing an enforcement hash in a `ValueSource` and `GRADLE-PLUG-23` puts the download in the service's execution-time method. Quoted apart they read as contradictory | Not a conflict — compute versus enforce. The drafters ship 07/08/09 and 22…27 adjacent in `plugin-authoring.md` under one heading, "ValueSource reads, BuildService enforces", and neither text changes | both, co-located |
| 14 | Checksum framing: `GRADLE-DEP-16` treats checksums plus signatures as security layers; `MVN-BUILD-12` (MUST) forbids ever describing a Maven checksum as a supply-chain control | Deliberate asymmetry, and it is the build system that differs — Maven Resolver's own docs reject the framing Gradle's docs adopt. Keep `MVN-BUILD-12`'s explicit "contrast with GRADLE-DEP-16" clause so the two never read as one ecosystem claim | both |
| 15 | Locking and verification: `GRADLE-DEP-12`/`-15` are MUSTs for this program's repos; the Maven family has no analogue and the maven dive established Maven has **no** `verification-metadata.xml` equivalent at all | `maven-build/dependencies.md` states the absence explicitly rather than inventing a substitute, and names `maven-gpg-plugin` plus `MVN-BUILD-14` as the two real levers. Do not write a Maven locking rule | both, with the gap stated |
| 16 | `mavenLocal()`: `GRADLE-PUB-15` (MUST NOT in a committed `repositories { }`) versus `GRADLE-PUB-13`'s consumability probe, which resolves through `~/.m2` by design | Already resolved inside [jvm-publishing.md](jvm-publishing.md) by a carve-out written into PUB-15's verification cell. Keep the carve-out in the shipped cell, not only in the consolidation — an agent running the grep must not flag the probe | both |
| 17 | Cross-family citation error: `BZL-JAVA-14` cites "`GRADLE-DEP-09`" for "pinning locks resolution, never legitimacy". `GRADLE-DEP-09` is the version-catalog-is-not-a-lockfile rule; the locking-versus-legitimacy claim is [jvm-dependencies.md](jvm-dependencies.md) verdict 4 and `GRADLE-DEP-12` | Fix the citation to verdict 4 / `GRADLE-DEP-12` before the handoff file ships. A wrong cross-reference in a published rule sends the reader to a rule that does not say what was claimed | `BZL-JAVA-14` (citation corrected) |
| 18 | Deploy jars: `BZL-JAVA-21` answers a distribution question that `GRADLE-DIST` owns the taxonomy for, and [jvm-bazel-java.md](jvm-bazel-java.md) open question 2 raises the ownership | Stays `BZL-JAVA-21`: the implicit-output fact is Bazel-only and `GRADLE-DIST` never loads on a `BUILD.bazel`. `distribution.md` carries one pointer line. Owner may move it; the default is stated | `BZL-JAVA-21` |
| 19 | The SDK's subprocess call site is governed by three MUSTs in two families: `JAVA-SEC-06` (array/varargs form), `JAVA-CONC-09` (injectable launcher seam) and `JAVA-CONC-12` (clear the environment first) | Complementary, one code site. `concurrency.md` cites `JAVA-SEC-06` rather than restating the array-form rule, and `security-and-untrusted-input.md` cites `JAVA-CONC-12` for the environment half. Neither restates the other | all three, cross-cited |
| 20 | Virtual threads: map conflict 13 reads as "virtual threads everywhere"; `JAVA-CONC-13` says the SDK's process boundary uses `Process.onExit()` and must **not** adopt virtual threads, because that would force the floor 17 → 21 for a fan-out it never performs | Resolved inside [jvm-concurrency.md](jvm-concurrency.md) verdict 1 and recorded here so it is not reopened: conflict 13 rejected a reactive runtime, it never mandated `Thread.ofVirtual()`. `JAVA-CONC-01/02` bind wherever the fleet does fan out | `JAVA-CONC-13` (SDK) + `JAVA-CONC-01/02` (elsewhere) |
| 21 | Settings-plugin split count: [jvm-gradle-core.md](jvm-gradle-core.md) verdict 7 says junit-framework ships the merged form (1/32); [jvm-gradle-settings.md](jvm-gradle-settings.md) conflict E re-measured 3/32 with junit-framework a *partial* split | The re-measurement wins. `GRADLE-STRUCT-02` stays SHOULD — the cost argument is caching throughput, unchanged by the count — but its evidence line names ktor's `build-settings-logic` as the copy-target, ahead of gradle/gradle's | `GRADLE-STRUCT-02` (evidence corrected) |
| 22 | Publishing-POM correctness: `GRADLE-DIST-13`'s rationale ("Gradle does not make this free; kafka needed a hand-rolled `pom.withXml`") is falsified by `GRADLE-PUB-11` | DIST-13's **rule** survives (a shaded artifact under primary coordinates owes an accurate POM); its rationale clause is replaced and it cites `GRADLE-PUB-11` for the mechanism. Frame correction 53 | `GRADLE-DIST-13` (rationale replaced) + `GRADLE-PUB-11` |

### Convergence

**Verdict: needs another round — one small wave, six dives.**

New MUST rules and new failure modes in freshly opened families are expected and
do not fail the stop condition; wave 3 opened nine families and produced 110
MUSTs, which is the designed outcome. The clause that decides is the third:
*no open question a reviewer would call load-bearing*. Every remaining open
question across the thirteen files was classified, and six of them are both
load-bearing **and** closable by a source read.

**Dated re-checks nothing can close today** (nine). JDK 27's GA javadoc — GA is
2026-09-15, three days after these files; detekt's activation table on the first
stable release cut from the `dev.detekt.*` branch; Gradle 10's archive defaults;
Maven 4's GA; `com.gradle.plugin-publish`'s undated intent to hard-reject an
absent `compatibility` block; JEP 472's JNI `deny` release; `@ResourceLock`'s
capability-to-version map; whether revapi acquires an adopter; whether
`GradleUp/shadow#324`'s closure changed the `shadow` configuration's manifest
write. Every one of these already ships as a dated row with a re-check command.

**Measurements the corpus cannot supply** (eight). `jlink`, `jpackage`,
`minimize()`, dependency locking, `verification-metadata.xml` beyond
gradle/gradle, timezone pinning, find-sec-bugs adoption, Sigstore and provenance,
Settings-plugin tool provisioning, `_deploy.jar` — each 0/32 or 1/32. The rules
that cover them are precondition-derived and each file already says so. Adding
the cold-runner provisioning benchmark and the CI-runner timezone audit does not
change a rule's text in either direction.

**Owner decisions** (sixteen; listed in the structured receipt with the default
the drafters assume). None is closable by research, and every one has a stated
default, so none blocks drafting.

**Answerable now, and load-bearing** (six). These are wave 4, and the briefs are
in the structured receipt:

1. **find-sec-bugs' maintenance status.** `JAVA-SEC-08` recommends a tool with
   0/32 adoption. If it is unmaintained against SpotBugs 4.9+ / JDK 25 bytecode,
   six of the nine JAVA-SEC rules lose their only automatable gate and collapse
   to grep — which changes their **severity**, not just their verification
   column. A severity change across six MUSTs is the definition of load-bearing.
2. **Kotlin's half of errors and resources (`KT-ERR`).** `java-quality` ships
   nine error/resource rules; `kotlin-quality` ships zero, because JAVA-ERR's
   depth file does not load on `**/*.kt`. `runCatching` swallows
   `CancellationException`, `use {}` is the try-with-resources analogue, and
   `@Throws` placement replaces the checked-exception contest. This decides
   whether the artifact set has 27 depth files or 28.
3. **Maven compilation under modern JDKs.** `MVN-BUILD-02` is a MUST about
   annotation processors, and nobody established whether a modern `javac`
   disables implicit annotation processing by default — which would mean a
   Maven build needs `<maven.compiler.proc>full</maven.compiler.proc>` for
   processors to run at all. The consolidation calls it "the highest-value gap
   in the family". Folded together with the Maven toolchain question, which is
   the same doc set and leaves `MVN-BUILD` with no answer to the one decision
   `JAVA-PLAT` calls the program's most-cited.
4. **Settings-plugin functional testing.** All seven of `GRADLE-PLUG-22…28`,
   six of them MUST, are verified by *reading source*, because nothing
   established how `GradleRunner` applies a `Plugin<Settings>` at all.
   `rule-distillation` is explicit: no verification, no rule. The OCX Gradle
   plugin is a named future consumer of every one of them.
5. **The seven unresearched JAVA-CONC rows (M-N-05…11).** Adjudicated P0/P1 in
   wave 1 and dived by nobody. Concurrency is the corpus's largest agent-failure
   surface and seven of its map rows have no rule; the question is which earn a
   row and which are `JAVA-LINT` configuration, answerable from catalogues the
   program has already read.
6. **Bazel-Java testing and coverage.** `BZL-JAVA` is the only family in the
   program with no test or coverage row, `rules_java` ships no first-party JUnit
   5 rule, and the sibling `testing.md` owns sizing and `manual` tags rather than
   JUnit-platform wiring — a real hole between two files. Conditional on Q6.

Everything else is drafting. Wave 4 is deliberately narrow: five of the six dives
close a verification or a severity, not a topic, and none of them opens a family.

### Residue

What the program deliberately leaves open, recorded so nobody re-investigates it.

- **One command, no research.** The strict-deps flag's canonical name
  (`--experimental_strict_java_deps` versus `--strict_java_deps`) needs one
  `bazel help build --long` on a pinned binary. `BZL-JAVA-05` ships SHOULD with
  the exemplar-evidenced spelling as the writable default.
- **Corpus-unmeasurable, stated in the files as precondition-derived.** jlink,
  jpackage, `minimize()`, dependency locking, dependency verification beyond
  gradle/gradle, timezone pinning, find-sec-bugs, Sigstore, provenance,
  Settings-plugin provisioning, `_deploy.jar`, `annotationProcessorPaths`,
  `banDuplicatePomDependencyVersions`, `requirePluginVersions`.
- **Measured only in config files, never in source.** Six JAVA-API and eight
  KT-API rows derive from the JLS and from kotlinlang's own compatibility page,
  so measurement would calibrate severity rather than correctness. Promote only
  if an adopter disputes a severity.
- **Out of scope by the frame, and staying out.** Kotlin Multiplatform,
  Kotlin/Native, Kotlin/JS, Android/AGP/Compose, Scala, Groovy-the-language,
  Clojure, Spring beyond packaging facts, app servers, JVM internals and GC
  tuning.
- **Genuinely deferred map rows.** M-A-11 (which lint versions parse Java 25),
  M-A-12, M-B-09, M-B-10, M-N-11 (the `ReentrantReadWriteLock` 65,536-reader
  ceiling — real failure, thin citation), M-Q-09 (AOT cache artifacts), M-R-06,
  M-S-12, M-U-07 and M-U-10 (Kotlin `Flow`, non-binding under Q1's Java-first
  default), M-X-09 and M-X-10 (absorbed as CONSIDER rows).
- **Answerable but not worth a worker.** The 42-file `mavenLocal()` census (one
  grep over the clones — an authoring note handles it), `maven-antrun-plugin`,
  `java_export` publishing from Bazel (dagger's answer is "hand off to Gradle",
  which is sufficient for the skill), latent-collision detection for
  `GRADLE-STRUCT-10`, a Gradle-side `Properties.store()` mechanism, the
  mixed-module bytecode floor (the honest answer is "nothing mechanical; a
  convention plugin"), worker-state reproducibility for `KotlinCompile`.

## Authoring notes (binding on the drafters)

Decisions already taken. A drafter who re-takes one of these is re-running the
program. Where a note says *drop*, *rename* or *amend*, it overrides the
consolidation's own text and the consolidation stays unedited as the record.

### 1. Four rules, and the exact glob lists

Each glob below was re-checked against `rule-distillation`'s *narrow the glob
only when it cannot miss* bar, using the exemplar counts in the wave-1 audits and
the wave-2/3 evidence. Ship these lists verbatim.

```yaml
# rules/java-quality.md
paths: ["**/*.java"]

# rules/kotlin-quality.md
paths: ["**/*.kt", "**/*.kts"]

# rules/gradle-build.md
paths:
  - "**/*.gradle.kts"
  - "**/*.gradle"
  - "**/gradle.properties"
  - "**/*.versions.toml"
  - "**/gradle/wrapper/gradle-wrapper.properties"
  - "**/gradle/verification-metadata.xml"
  - "**/gradle.lockfile"
  - "**/buildscript-gradle.lockfile"

# rules/maven-build.md
paths:
  - "**/pom.xml"
  - "**/.mvn/**"
  - "**/mvnw"
  - "**/mvnw.cmd"
  - "**/build.xml"
  - "**/ivy.xml"
  - "**/ivysettings.xml"
```

- **`**/*.versions.toml` is IN and `**/gradle/libs.versions.toml` stays OUT**,
  and wave 2 strengthened the case rather than weakening it. The conventional
  path misses `apollographql__apollo-kotlin@c145295b72:gradle/libraries.toml`
  (a real catalog at a non-conventional name) **and** gradle/gradle's three
  programmatically-wired catalogs, one of which —
  `gradle/dependency-management/test.versions.toml:23` — is the file
  `JAVA-TEST-01`'s own evidence quotes. `**/*.versions.toml` catches the second
  set and misses only the first. **Residual miss, named not papered over:**
  `libraries.toml` and any other catalog whose name does not end
  `.versions.toml`. It is covered by routing, not by a glob — a catalog is
  *wired* from a settings file, which always matches `**/*.gradle.kts` — and by
  `GRADLE-DEP-08`, whose whole subject is that a filename check is a false
  negative. Do not "fix" the glob by adding the conventional path back; that
  makes the set strictly worse (two globs, same misses).
- **`**/*.kts` on `kotlin-quality` double-loads with `gradle-build` on every
  `*.gradle.kts`.** Intentional and bounded — a build script is Kotlin source.
  The cost is that `kotlin-quality`'s **index** fires while editing a build
  file, so every non-negotiable line in that index must read sensibly against a
  `.gradle.kts`. Check each one before shipping; a line about `data class`
  exposure that fires on a settings file trains the reader to skim the list.
- **`**/*.gradle.kts` subsumes `settings.gradle.kts`, `init.gradle.kts` and
  every precompiled `*.settings.gradle.kts`** — which `GRADLE-STRUCT-12`'s
  verification depends on (gradle-settings conflict D). Do not list settings
  files separately; do make every settings-shaped grep in a verification cell
  include `*.settings.gradle.kts` explicitly, because the *check* has a narrower
  reach than the glob.
- **`**/gradle/verification-metadata.xml`, `**/gradle.lockfile` and
  `**/buildscript-gradle.lockfile` match 0-1 times in 32 repos and stay in.** A
  glob that never matches costs nothing; one that matches once catches the single
  moment where the intuitive edit (hand-fix the conflicting entry) destroys the
  mechanism (`GRADLE-DEP-16`'s missing-checksum trap).
- **`**/.mvn/**` is a directory glob and stays in** — Maven requires the
  directory name and there is no alternative location. It reaches
  `.mvn/maven.config` (`MVN-BUILD-11`, `-13`),
  `.mvn/wrapper/maven-wrapper.properties` (`MVN-BUILD-14`) and
  `.mvn/extensions.xml` (`MVN-BUILD-15`). **Named residual:** `MVN-BUILD-15`'s
  CI-injected case lives in `.github/workflows/`, which no glob in this set
  reaches; the index's routing line carries it.
- **Deliberately out:** `**/BUILD.bazel`, `**/*.bzl`, `**/MODULE.bazel` (the
  sibling set owns them; two rules on one glob double-load), `**/*.groovy` (the
  language is out of scope and Groovy build scripts already match
  `**/*.gradle`), `**/.editorconfig` (owned by every language at once — a JVM
  rule loading on it would fire in Python and TypeScript repos, so the ktlint
  rows load through `kotlin-quality`'s index instead).

### 2. The 27 depth files, their families, and where each draws from

One ID family per file. "Draws from" names the consolidation sections that are
the file's source — the Verdict, the ruleset block for that family, its failure
modes and its Applied tables. Nothing else is a source.

**`rules/java-quality/`** — index family `JAVA-CORE`

| File | Family | Draws from |
|---|---|---|
| `api-and-evolution.md` | `JAVA-API` | [jvm-language-api.md](jvm-language-api.md) §JAVA-API + conflicts 3-5, 7-8; [jvm-platform-and-toolchains.md](jvm-platform-and-toolchains.md) §"Handed back" (japicmp templates) |
| `data-and-patterns.md` | `JAVA-DATA` | **no consolidation** — M-L-01…08, written from [canonical-java](jvm-topic-map/canonical-java.md)'s JEP reads plus Error Prone / SonarJava checks |
| `nullness.md` | `JAVA-NULL` | **no consolidation** — M-M-01…07; the tooling rows are `JAVA-LINT-04/05/06`, the contract rows are `JAVA-API-09/10/11`, and this file carries only what neither owns |
| `concurrency.md` | `JAVA-CONC` | [jvm-concurrency.md](jvm-concurrency.md) §JAVA-CONC + verdicts 1-4, 8-9 |
| `errors-and-resources.md` | `JAVA-ERR` | [jvm-java-runtime-safety.md](jvm-java-runtime-safety.md) §JAVA-ERR + conflicts 4-7 |
| `security-and-untrusted-input.md` | `JAVA-SEC` | [jvm-java-runtime-safety.md](jvm-java-runtime-safety.md) §JAVA-SEC + verdicts 1-3, conflicts 1-3 |
| `platform-and-versions.md` | `JAVA-PLAT` | [jvm-platform-and-toolchains.md](jvm-platform-and-toolchains.md) §JAVA-PLAT + verdicts 1-9, **minus** the rows dropped in the contradictions table |
| `lint-gate.md` | `JAVA-LINT` | [jvm-quality-gates.md](jvm-quality-gates.md) §JAVA-LINT (amended per contradictions 6-8) |
| `testing.md` | `JAVA-TEST` | [jvm-quality-gates.md](jvm-quality-gates.md) §JAVA-TEST (amended per contradiction 5) |

**`rules/kotlin-quality/`** — index family `KT-CORE`

| File | Family | Draws from |
|---|---|---|
| `api-and-abi.md` | `KT-API` | [jvm-language-api.md](jvm-language-api.md) §KT-API + conflicts 1-2, 6 |
| `coroutines.md` | `KT-CORO` | [jvm-concurrency.md](jvm-concurrency.md) §KT-CORO + verdicts 5-7 |
| `java-interop.md` | `KT-INTEROP` | **no consolidation** — M-V-01…08 from [canonical-kotlin](jvm-topic-map/canonical-kotlin.md); plus `@Throws` placement if wave 4's KT-ERR dive lands it here |
| `compiler-and-toolchain.md` | `KT-COMP` | [jvm-platform-and-toolchains.md](jvm-platform-and-toolchains.md) §KT-COMP + verdicts 10-15 |
| `lint-gate.md` | `KT-LINT` | **no consolidation** — M-R-07…11; the detekt-activation row is `KT-CORO-01` and is cited, not restated |
| `testing.md` | `KT-TEST` | **no consolidation** — M-S-03/10/11, plus the Kover `check` finding handed back by [jvm-platform-and-toolchains.md](jvm-platform-and-toolchains.md), plus `KT-CORO-11/12/13` cited |

**`rules/gradle-build/`** — index family `GRADLE-CORE`

| File | Family | Draws from |
|---|---|---|
| `structure-and-conventions.md` | `GRADLE-STRUCT` | [jvm-gradle-core.md](jvm-gradle-core.md) §GRADLE-STRUCT; [jvm-gradle-settings.md](jvm-gradle-settings.md) §GRADLE-STRUCT + conflicts A, B, E |
| `dependencies.md` | `GRADLE-DEP` | [jvm-dependencies.md](jvm-dependencies.md) §GRADLE-DEP + §"Corrections to the wave-1 measurement" |
| `caching-and-correctness.md` | `GRADLE-CACHE` | [jvm-gradle-core.md](jvm-gradle-core.md) §GRADLE-CACHE + conflicts 1-6, **minus** CACHE-07 and CACHE-16 |
| `toolchains-and-compilation.md` | `GRADLE-TOOL` | **no consolidation** — M-E-01…08, **plus** the build-file rows relocated here per frame correction 72 (`JAVA-PLAT-12`'s Gradle half and `JAVA-PLAT-13`) |
| `plugin-authoring.md` | `GRADLE-PLUG` | [jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md) (all of it); [jvm-gradle-settings.md](jvm-gradle-settings.md) §GRADLE-PLUG + verdicts 1-5 |
| `distribution.md` | `GRADLE-DIST` | [jvm-distribution.md](jvm-distribution.md) (all of it), with DIST-03 rewritten and DIST-13's rationale replaced |
| `publishing.md` | `GRADLE-PUB` | [jvm-publishing.md](jvm-publishing.md) §GRADLE-PUB + conflicts 1-6 |
| `ci.md` | `GRADLE-CI` | **no consolidation** — M-I-01…07 from the publishing/CI audit; cross-references `GRADLE-STRUCT-12` rather than restating it |

**`rules/maven-build/`** — index family `MVN-CORE`

| File | Family | Draws from |
|---|---|---|
| `dependencies.md` | `MVN-DEP` | [jvm-dependencies.md](jvm-dependencies.md) §MVN-DEP |
| `lifecycle-and-plugins.md` | `MVN-BUILD` | [jvm-maven-and-ant.md](jvm-maven-and-ant.md) §MVN-BUILD + verdicts 1-4, 7 |
| `publishing.md` | `MVN-PUB` | [jvm-publishing.md](jvm-publishing.md) §MVN-PUB |
| `ant-legacy.md` | `MVN-ANT` | [jvm-maven-and-ant.md](jvm-maven-and-ant.md) §MVN-ANT + verdict 5 |

### 3. Index-owned versus depth-owned

The four `*-CORE` families own only what belongs to no depth file, and they are
where the catalog's cross-cutting rows live. Follow `rules/typescript-quality.md`
§"Rules This File Owns" exactly: three rows, defined in the index with a full
rationale and verification, cited nowhere else.

- `JAVA-CORE-01` / `KT-CORE-01` / `GRADLE-CORE-01` / `MVN-CORE-01` — **never
  reach green by weakening the check**: no new `@SuppressWarnings`, no new
  `disable(...)`/`:OFF`, no widened Checkstyle/SpotBugs exclusion, no lowered
  coverage floor, no `-PskipX`, no edit to the gate's own convention plugin as
  part of a functional change.
- `*-CORE-02` — **a verification enters a rule table, a CI job or a review only
  after it has been watched go red** against a deliberately planted violation.
  This program has three worked reasons: a `violationRules` block wrapped in
  `disable()`, a `junit-platform.properties` key with no `junit.jupiter.`
  prefix, and a `spotbugs` block that only `mvn site` would ever invoke.
- `*-CORE-03` — **every verification cell states what empty output means.** Half
  the checks in this corpus are inverted.

Everything else is depth-owned and appears in the index only as a
**non-negotiable line citing the ID**, never as a second definition. The
index's non-negotiable list for `java-quality.md` carries exactly four rows from
the wave-3 safety work: `JAVA-ERR-01` (re-interrupt), `JAVA-ERR-03`
(try-with-resources), `JAVA-ERR-04` (chain the cause) and `JAVA-SEC-01`
(filtered `readObject`) — three and one, per
[jvm-java-runtime-safety.md](jvm-java-runtime-safety.md) conflict 4. `JAVA-ERR-02`
and `JAVA-ERR-05` stay in the depth file; they are reviewer-facing, not
every-edit.

### 4. Bounded duplication — the only rows that appear in two indexes

`rule-distillation` sanctions duplicating the MUST *line*, never the depth. Six
facts are genuinely shared between `java-quality` and `kotlin-quality`. Ship the
one-line form in both indexes, citing both IDs; ship the depth in exactly one
file.

| Shared fact | Java ID (depth here) | Kotlin ID / treatment |
|---|---|---|
| Explicit charset at every boundary | `JAVA-PLAT-10` | one index line in `kotlin-quality.md` citing `JAVA-PLAT-10`; no KT rule |
| Locale-sensitive case and format conversion | `JAVA-LINT-02` (`DefaultLocale`, `StringCaseLocaleUsage`) | one index line; detekt has no equivalent, so the Kotlin side names the Java lint |
| JSpecify on the published surface, never mixed flavours | `JAVA-API-09`, `JAVA-API-10` | one index line; `KT-API` cites it for the Kotlin-caller `strict` default |
| Toolchain JDK and bytecode floor are two numbers | `JAVA-PLAT-01` | `KT-COMP-04` is the Kotlin statement of the same decision and carries its own depth (the `jvmTarget` default and `jvmTargetValidationMode`) |
| `module-info.java`, not `Automatic-Module-Name` | `JAVA-API-12` | one index line; a Kotlin module's descriptor is the same file |
| Filtered deserialization across a trust boundary | `JAVA-SEC-01` | one index line; `KT-ERR`'s scope (wave 4) decides whether Kotlin gets more |

Nothing else is duplicated. In particular `MVN-BUILD-01` and `JAVA-PLAT-01`,
and `GRADLE-DEP-17` and `MVN-BUILD-14`, are *parallel build-system rows on
disjoint globs*, not duplication — a Maven-only adopter never loads
`gradle-build` or `java-quality`, and each row must be complete on its own.

### 5. Pinned decisions and their defaults

These encode agreement, not derivation. Mark each **pinned** in the shipped file,
say it is a default an adopter may override once in their own config, and do not
re-litigate.

| Decision | Default | Owner |
|---|---|---|
| SDK language | Java-first with a Kotlin-friendly API — JSpecify-annotated, no `Optional` parameters, no generics-into-varargs, no `data`-shaped public types | `JAVA-API` / Q1 |
| JDK floor / toolchain / CI matrix | floor **17**, toolchain **25**, matrix **17 / 21 / 25**; the trigger for moving the floor is "when Spring Boot and JUnit move", never the LTS calendar | `JAVA-PLAT-02` |
| Gradle plugin's consumer floor | **8.11** (Kotlin-DSL plugin built on Gradle 9.x), TestKit matrix 8.11 / current 9.x, `release-candidate` on a scheduled job only | `GRADLE-PLUG-11`, `-12`, `-13` |
| Coverage floor | **90 % line and branch**, ungated, enforced Linux-only in CI, the number written in the build config and never in a CI flag | `JAVA-TEST-10` |
| JUnit baseline | **5 is the floor, 6 is the dated target** (6.0.0, 2025-09-30, Java 17 / Kotlin 2.2) for adopters; **6 is the actual floor** for the OCX SDK, which is greenfield and has no Vintage legacy | `JAVA-TEST-01` |
| Java gate of record | **Error Prone + NullAway** inside `javac`; Checkstyle is style-only with a committed ruleset; PMD is out (0/32); SpotBugs earns a slot with find-sec-bugs **or** for the lock and null-dataflow families | `JAVA-LINT-01`, `-08`, `-09`, `-10` |
| Kotlin gate of record | **detekt for logic, ktlint for formatting**, with the four coroutine rules explicitly set `active: true` — a `buildUponDefaultConfig` build runs none of them | `KT-CORO-01` |
| Gradle plugin's gate of record | a **TestKit cross-version matrix**, not a coverage percentage | `GRADLE-PLUG-12` |
| Maven gate of record | `mvn verify` as the last goal of the CI gate, with `maven-enforcer-plugin` bound to an `<execution>` | `MVN-BUILD-03`, `MVN-DEP-03` |
| Bazel gate of record | all four JDK version flags pinned in the root `.bazelrc`, plus `lock_file` + `fail_if_repin_required = True` | `BZL-JAVA-01`, `-10`, `-11` |
| Java ABI gate | **japicmp**, bound to `check`/`verify` and upstream of every publish task, with a reviewed accepted-breaks file carrying a reason per entry. Decision flagged for re-taking, not inheriting | `JAVA-API-01`, `-02` |
| Kotlin ABI gate | **exactly one** — standalone BCV by default, `abiValidation()` where the build already carries the Experimental opt-in. Running neither is the finding | `KT-API-03` |
| Publishing plugin | `com.gradleup.nmcp` (or vanniktech), deliberately against the 18/32 raw-`maven-publish` majority | [jvm-publishing.md](jvm-publishing.md) verdict 3 |
| Exit-code contract | the 16-member sysexit enum diffed against `ocx-sdk-python/_errors.py` and `rules_ocx/AGENTS.md`, with sysexit 75 retried **below** exception construction | `JAVA-API-14`, `JAVA-CONC-14` |
| Runtime dependencies | **zero** for the SDK — `java.net.http` plus a hand-rolled reader over `--format json`; JSpecify is `compileOnly` and does not break it | `JAVA-API-15` |

### 6. Drop at authoring time

Named by ID, with the reason. Nine are duplicates the contradictions table
resolves; the rest fail `rule-distillation`'s selection bar.

**Dropped as duplicates** (the surviving ID is in the contradictions table):
`JAVA-API-13`, `JAVA-PLAT-04`, `JAVA-PLAT-16`, `JAVA-PLAT-17`,
`GRADLE-CACHE-07`, `GRADLE-CACHE-16`.

**Dropped for no usable verification, or because a frontier model already does
it** — each becomes at most one prose sentence in its depth file:

- `GRADLE-PUB-03` ("state immutability as the first line of the runbook") — this
  is the `jvm-release` skill's opening paragraph, not a rule. A rule whose
  verification is "is this sentence above step 1" is documentation with an ID.
- `JAVA-ERR-09` (sneaky-throw) — CONSIDER, explicitly contested by two named
  practitioners with neither displacing the other, reading heuristic only. Both
  positions go in prose; no ID.
- `KT-API-10` (no bare `Boolean` parameter) — SHOULD with a carve-out the dive
  itself wrote, no mechanical check, and a well-known API-design restatement.
- `KT-API-11` (adding an `AnnotationTarget`) — CONSIDER, reading heuristic, and
  narrow enough that the prose line is cheaper than the row.
- `BZL-JAVA-17` (`artifact()` macro versus literal label) — CONSIDER, explicitly
  "tooling cost, not a correctness bug".
- `BZL-JAVA-20` (KotlinCompile worker state) — CONSIDER, no primary source
  states a defect, no exemplar overrides the default, and the consolidation
  itself puts it below the line.
- `GRADLE-DIST-19` (jpackage notarization) — CONSIDER at 0/32, and
  [jvm-distribution.md](jvm-distribution.md)'s own open question recommends
  demoting it to prose.

**Rewritten, not dropped:** `GRADLE-DIST-03` (premise falsified — see
contradiction 1) and `GRADLE-DIST-13` (rationale replaced — see contradiction
22).

That leaves roughly **283 IDs across four rule sets plus the Bazel handoff**,
about 70 per rule set, which is inside the funnel's band read per rule set
(frame correction 71). If a file still feels long after drafting, cut CONSIDER
rows before MUST rows and cut snippets before rows — snippets are the most
expensive content per byte in the set.

### 7. Version dating

Every version-specific row names **the version and the date it was verified**.
The corpus-wide verification date is **2026-09-12**; wave-1 measurements carry
2026-09-05/06. The shipped form is the one
[jvm-quality-gates.md](jvm-quality-gates.md) `JAVA-TEST-12` already uses:
"Surefire `3.6.0-M1`, 2026-06-02, verified 2026-09-12". A row that names a
version without a date is the finding in review.

Three method rules that every version row inherits:

- **Query the registry, never the vendor banner.** Surefire's doc site says
  3.6.0; Central's newest artifact is 3.6.0-M1 and its newest GA line 3.5.6.
  Maven's site header runs ahead of what Central serves.
- **Name the JDK number on every removal, disablement or deprecation claim.**
  The corpus itself mis-attributed JEPs 483/491/493 to 25 when they shipped in
  24.
- **Name the JDK on every `StructuredTaskScope`/`Joiner` member**, and the Kotlin
  version on every `-X` flag. Both APIs changed shape in most of their releases.

### 8. Kotlin DSL, and the two Groovy appearances

Kotlin DSL is the example language throughout. Groovy appears exactly twice, and
both appearances are places the two DSLs need genuinely different text:

1. The `apply plugin:` → `plugins {}` migration row.
2. Agent failure mode 11 in `plugin-authoring.md` — the two
   `gradlePlugin { plugins { } }` id idioms. Note the change from the map: wave 2
   demoted this from a rule to a failure mode ([jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md)
   conflict F), so the Groovy pair lives in the failure-mode list, not in a rule
   table. Both idioms compile identically and an idiom-only rewrite is churn.

Everywhere else, a Groovy build is **not** a finding: spring-boot ships 736
Groovy build files to 54 Kotlin, kafka 9 to 0.

### 9. Verification-command shape — every cell, without exception

`check-artifacts.py` lints verification cells and the consolidations were not
written against those lints. Assume **every** cell needs rewriting, and apply
these transforms:

- **No bare shell-glob operands.** `grep -rn 'x' **/*.gradle.kts` becomes
  `grep -rn --include='*.gradle.kts' 'x' .` — a directory operand plus
  `--include`. This is the single most common defect in the consolidations'
  cells.
- **One `-e` per alternative**, never `\|` inside a single pattern:
  `grep -rn -e 'sourceCompatibility' -e 'targetCompatibility' …`, not
  `grep -rn 'sourceCompatibility\|targetCompatibility' …`.
- **No angle-bracket placeholders inside a quoted pattern.** `grep -n '<source>'`
  reads as a placeholder to the checker; write the XML tag outside the pattern
  (`grep -n -e '<source>' -e '<target>' pom.xml` still trips it — use
  `grep -nE '</?(source|target)>' pom.xml` instead) and keep prose placeholders
  outside quotes entirely.
- **No operands from `$(git ls-files …)`** and no unquoted `**` anywhere.
- **`xargs -r`** on every pipeline that can receive an empty list.
- **No table row whose first cell is a rule ID unless that row *is* the rule
  definition.** Citation tables, contradiction tables and skill finding-tables
  must start their rows with a number or a label. This is why every row in this
  section's tables starts with a `#` or a noun.
- **Every cell says what empty output means.** The corpus is full of inverted
  checks: an absent `fail_if_repin_required`, an absent `lock_file`, an absent
  `-Dfile.encoding`, an absent `violationRules`, an absent find-sec-bugs beside a
  SpotBugs gate, an absent fourth `.bazelrc` flag — each is *the finding*, not
  the pass. Where empty output is the pass, say so in the same words
  (`GRADLE-CACHE-09`'s "empty output is the pass" is the model).
- **Fenced code blocks:** python blocks must be `ruff format`-stable; Starlark
  and BUILD snippets are tagged `starlark`, never `python`. Shell is `bash`.

Run `python3 .claude/skills/research-lang/scripts/check-artifacts.py rules/ --root .`
before declaring any file done, and add `--allow-absent` for the JVM globs, which
have no consumer in this repository (the precedent and the documented fallback
are recorded in "Explicitly not a defect" #13).

### 10. Skills — two, procedures only

`jvm-release` and `jvm-dependency-triage`. Neither carries a standard; both carry
an ordered procedure a person runs occasionally.

- **`jvm-release`** opens with `GRADLE-PUB-03`'s immutability statement (which is
  dropped as a rule precisely because it is this skill's first line), then: verify
  the namespace, check the tag against the declared version **before any build**,
  run the binary-compatibility gate **before** sign/checksum/upload, assemble the
  required per-file set, set `autoPublish` + `waitUntil = published`, and know
  that OSSRH and `nexus-staging-maven-plugin` are dead paths. It carries both
  build systems because the Portal requirements are identical and only the plugin
  differs. Add the Bazel line: Bazel hands off to Gradle or Maven for publishing
  (dagger's own answer), pending wave 4's `java_export` finding if it lands.
- **`jvm-dependency-triage`** keeps its three entry points (a version you did not
  choose / a declaration that is wrong / a version you are about to bump) and
  carries the Dependabot-vs-Renovate interaction as one sentence, not a section.

Both skills **duplicate the MUST rows they enforce** in a
`| # | Finding | Rule |` table — number first, finding second, rule ID last —
because a row whose first cell is a rule ID is read as a rule definition and a
skill must not define rules. Duplicate the MUST list; never duplicate the depth.

### 11. The Bazel-Java handoff

Draft **one file** at
`.agents/research/handoff/bazel-quality-java.md`, whose destination is
`rules/bazel-quality/java.md` on the branch carrying the Bazel program. Write it
in the **exact shape of the shipped `rules/bazel-quality/rust.md`**, which is the
per-language exemplar:

- Frontmatter is `title` + `summary` only — **no `paths`**. The file has no glob
  of its own; the sibling index routes to it by task.
- `# Java and Kotlin under Bazel`, then an owns/does-not-own paragraph in
  rust.md's voice: what `BZL-JAVA` owns, what the language-side rule sets own
  (`java-quality`, `kotlin-quality`, `gradle-build`, `maven-build` own their own
  manifest files and a row here touches one only where the edit is
  Bazel-specific), and the sibling families **cited never restated**.
- A `Contents:` line, then a measurement paragraph carrying the pinned versions
  (Bazel 8.7.0/8.8.0/9.2.0, `rules_jvm_external` 7.1 of 2026-07-23,
  `rules_kotlin` v2.4.10 of 2026-08-20), the date, the "no `bazel` binary was
  run" disclosure, and rust.md's two-help-surfaces rule for any flag.
- `##` sections grouped **by the check that clears them**, matching this
  consolidation's Groups A-F, then `## Gaps` and `## What Agents Get Wrong Here`.
  rust.md is 247 lines; aim there.

**Route into the sibling files by their shipped names, not the map's older
working names.** The map says `caching-rbe.md` and `flags-and-versions.md`;
neither exists. The shipped set is:

| Cite for | Shipped file |
|---|---|
| `MODULE.bazel`, lockfile modes, module extensions, repository rules, lockfile merges | `bzlmod.md` |
| Toolchain leakage, the action environment, `--repo_env` versus `--action_env`, determinism claims | `hermeticity.md` |
| Remote and disk cache, credentials, download-mode and eviction flags, deploy-jar action keys | `caching.md` |
| Test sizing, timeouts, tags, `manual` semantics, coverage reports | `testing.md` |
| `--incompatible_autoload_externally`, rc-file flags, Bazel-version floors | `flags.md` |
| Target granularity, visibility, `select()`, generator wiring | `architecture.md` |
| `.bzl` and BUILD authoring, the buildifier gate | `starlark.md` |
| CI jobs, matrix legs, target selection | `ci.md` |
| The other per-language files, for shape and for cross-language cites | `rust.md`, `python.md`, `typescript.md`, `cpp.md` |

Before shipping, fix `BZL-JAVA-14`'s cross-reference (contradiction 17) and carry
the dagger `.bazelrc` line-number corrections — a grep written from the dive's
numbers misses.

**The one routing row to add** to `rules/bazel-quality.md`'s "Where the Depth Is"
table, placed immediately after the `cpp.md` row so the per-language block reads
rust / python / typescript / cpp / java:

```markdown
| Writing a `java_*` or `kt_jvm_*` target, pinning the JDK version flags, repinning `maven_install.json`, or building a deploy jar | [bazel-quality/java.md](bazel-quality/java.md) |
```

Nothing else in `bazel-quality.md` changes: no new non-negotiable line, no new
gate step. If the owner declines Q6, the handoff file stays in this corpus as
research, `BZL-JAVA` is never allocated, and the M-X rows become backlog.

### 12. Two citation defects to fix before anything ships

- **The `mavenLocal()` count.** `GRADLE-PUB-15` cites "42 corpus build files"
  with no per-repo attribution, and nobody established how many of those 42 are
  inside a committed consuming `repositories { }` (the finding) versus a probe or
  a gitignored override (the carve-out). One grep over
  `/home/mherwig/dev/.tmp-jvm-exemplars/` settles it. **Until it is run, do not
  ship the number** — ship the mechanism ("Gradle's own docs restrict it to
  prototyping; resolution silently depends on that machine's `~/.m2`") and the
  carve-out. A count nobody can reproduce is folklore with a decimal point.
- **`JAVA-API-12` versus `JAVA-PLAT-04`'s measured counts.** Both cite
  `module-info.java` 12/32 and `Automatic-Module-Name` 10/32 as "largely
  disjoint" sets. Ship the disjointness claim only where the file names the two
  sets; otherwise ship the two counts and drop the adjective.

## Wave 4 landed (2026-09-12)

Six dives, five revisions (reviser contract: IDs stable, contradicted rows changed in place, revision logs appended). Receipts in `jvm-topic-map/scratch/wave4-receipt.json`. Written by the orchestrator from the receipts; the consolidations are authoritative.

### java-runtime-safety — `jvm-java-runtime-safety.md`, 24 IDs, 21 MUST

- Dive `find-sec-bugs-viability` (16 sources): find-sec-bugs 1.14.0 has a confirmed, reproduced NoSuchMethodError crash (not just a false-positive/staleness issue) against SpotBugs 4.9.5/4.9.6, caused by SpotBugs itself deleting a method it depended on — SpotBugs reverted the deletion within weeks, citing find-sec-bugs by name in its own PR.; The deprecated method SpotBugs restored is scheduled for permanent removal ~1 year after 2025-10-08 (i.e. around October 2026, about a month after this research date), and find-sec-bugs's own unreleased master has already removed its usage — but no release has shipped that fix, so the public artifact will likely break again on schedule.
- Dive `kotlin-errors-resources-and-throws` (15 sources): detekt's SwallowedException default config whitelists InterruptedException as 'nonexceptional' — the opposite gap direction from Java, where JAVA-ERR-01's mistake at least has an off-by-default Error Prone check to promote; no detekt rule ID exists for this at all; detekt's default gate is stronger than Java's for exception-chaining: SwallowedException (catches throw X(e.message)) is active by default, while Java's equivalent UnusedException is in Error Prone's DISABLED_CHECKS and must be promoted

Conflicts resolved in revision:
- 8 — find-sec-bugs demoted from "the check" to "the automated check where wired": the wave-3 text made a 15-month-stale, provided-scope plugin with a confirmed NoSuchMethodError load-bearing for six MUSTs; every Group 2 rule now carries its grep as the severity floor, so no MUST depends on a tool being installed. Severities unchanged.
- 9 — JAVA-SEC-08's floor corrected from an unsourced `com.github.spotbugs` 6.4.8+ to the measured 6.4.3+ (SpotBugs 4.9.7+), with 6.4.1/6.4.2 named as the forbidden crash window and 6.5.6 as current; decided on the plugin's own README compatibility table.
- 10 — OVERCLAIM FIX: JAVA-SEC-03 said "an adjacent setFeature block" and implied the eight XXE_* detectors covered the family. Neither find-sec-bugs nor SonarJava does interprocedural dataflow, so hardening in a helper is invisible to both. Rule text now requires hardening in the SAME METHOD as construction, and verification states that absence of a tool finding is not evidence of safety.
- 11 — 27 vs 28 depth files: resolved as 28. `kotlin-quality/errors-and-resources.md` (family KT-ERR, rows 01-05) joins the six; the map's depth-file table and its twenty-seven-families count are amended by this file. Index budget resolved at two KT-ERR rows (KT-ERR-01, KT-ERR-03) in `rules/kotlin-quality.md`, the map's reserved JAVA-SEC-01 line unchanged.
- 12 — ID-MAPPING CORRECTION: the Kotlin dive cross-references JAVA-ERR by the sub-artifact's numbering, not this consolidation's (its "JAVA-ERR-05"=chaining, "-08"=System.exit, "-11"=sneaky-throw). Mapping recorded once so the later author does not propagate it: chaining→JAVA-ERR-04, System.exit→JAVA-ERR-07, try-with-resources→JAVA-ERR-03, catch(Throwable)→JAVA-ERR-02, sneaky-throw→JAVA-ERR-09.
- 13 — `-Xallow-result-return-type` is historical-only (lifted in Kotlin 1.5, flag later removed); any rule text presenting it as a live gate is wrong. KT-ERR gets no row; the live question stays M-V-07's.
- Header note — the sentence declaring Kotlin's exception model "uncovered" is now false and was replaced in place by the KT-ERR scope statement plus the cite-don't-restate list (M-U-04, M-V-04, M-V-07).
- JAVA-SEC-07 — SonarJava S2245 was cited as a gate on catalogue strength alone; the viability dive did not verify it. Now marked unverified as of 2026-09-12, grep promoted from fallback to primary check, and Semgrep confirmed to carry no equivalent rule at all.

Still open after wave 4:
- SonarJava rule keys — for S2245, S2076, the path-traversal key, S1181, S2095 and S2142, fetched from rules.sonarsource.com or sonar-java metadata rather than search: is each (a) Community-tier or commercial-only, (b) an Issue or a Security Hotspot (the S4507 trap), and (c) what does it actually match? Five verification columns currently cite them on catalogue strength alone.
- Subprocess trust boundary with no live upstream — does the OCX Gradle plugin's `ocx --format json inspect --closure` read, which may run entirely against a local OCX_HOME cache, sit on the same side of the deserialization line as the SDK's (Verdict 3), or does decision (c) mean it must be re-derived?
- (Not a round — dated re-checks noted in the file) whether find-sec-bugs 1.15.0 ships before SpotBugs removes the restored IO.close(InputStream) around Oct 2026, and whether jackson-databind's three floors move.

### maven-and-ant — `jvm-maven-and-ant.md`, 26 IDs, 18 MUST

- Dive `maven-annotation-processing-and-toolchains` (19 sources): The JDK-23 policy change was deferred mid-flight: proposed for JDK 22 (JDK-8306819), reverted to warning-only for that release (JDK-8321321), then reinstated a full release later for JDK 23 (JDK-8321319) -- three bug IDs for what reads as one release-note line; The origin motive is a supply-chain security concern (an unwitting dependency-shipped annotation processor auto-executing at compile time), not a build-hygiene cleanup

Conflicts resolved in revision:
- MVN-BUILD-02 overclaimed the mechanism: it asserted javac's compile-classpath processor scan unconditionally. That scan is JDK ≤22 only — JDK-8321319 removed it in JDK 23. Rationale rewritten in place and version-stamped; rule text and meaning unchanged, with the dangerous implication ("declaring paths controls processing") replaced by the explicit split: -02 controls WHICH processors run, MVN-BUILD-16 controls WHETHER any run.
- MVN-BUILD-05's evidence was stale: Surefire 3.6.0 is GA on Central as of 2026-09-12 (lastUpdated 20260903221843), superseding frame correction 38's 3.5.6-GA/3.6.0-M1 snapshot. Rule, severity and meaning unchanged; the banner/Central example is now the rule's strongest support rather than its illustration (the banner text never changed while the artifact went from milestone to GA). Frame correction 38 is now stale on the numbers, correct on the method — noted in the Revision log, frame not edited.
- Verdict 7 rewritten to match the new Surefire evidence; Verdicts 8 (annotation processing) and 9 (toolchain-acquisition gap) added.
- The follow-up proposed folding proc=full into MVN-BUILD-02 as a "second conjunct". Rejected under ID stability: -02 keeps its number and meaning, the conjunct ships as new MVN-BUILD-16 with a cross-reference in both directions.
- Two of the dive's ten normative candidates were folded rather than given IDs: the artifact-level verification (§2) lives in MVN-BUILD-16's Verification column, and §6/§7/§9 (Apache's plugin does not download, the transposed names, -Dtoolchain.skip ownership) are one rule, MVN-BUILD-19 — three separate rows would have been three statements of the same confusion.

Still open after wave 4:
- Gradle-side handback (GRADLE-TOOL / JAVA-PLAT, not MVN-BUILD) — given that Gradle emits -proc:none or -processorpath unconditionally on every JavaCompile and so was never exposed to the JDK-23 policy, is the only Gradle-side rule the narrow one, that -processorpath/--processor-path in compilerArgs is rejected outright so an agent must use the typed annotationProcessorPath? Evidence is settled at gradle__gradle@ea17004a31:.../JavaCompilerArgumentsBuilder.java:110-112,209-216; the decision is the map's.
- maven-antrun-plugin — Ant inside Maven: what does a rule say about <target> blocks embedded in a POM, the one Ant surface that appears in live Maven builds? MVN-ANT as written only fires on a build.xml. (Carried unchanged from the previous round.)
- Maven build extensions as a resolution mechanism: does MVN-BUILD-15 become a MUST, and what does a rule say about an extension that replaces the local repository (apache/maven's Mimir) for CI only? (Carried unchanged.)

### gradle-settings — `jvm-gradle-settings.md`, 11 IDs, 10 MUST

- Dive `settings-plugin-testkit-verification` (14 sources): No corpus exemplar (ktor's build-settings-logic, junit-framework's settings-conventions) and no gradle/gradle-own TestKit integration test ever applies a plugin from a functional test's generated settings.gradle — the mechanism is real but completely unexercised anywhere in the ecosystem read; Gradle's own ConfigurationCacheTestKitIntegrationTest.groovy carries a doc comment explicitly naming both plugin-resolution routes (INJECTED_CLASSPATH via DefaultInjectedClasspathPluginResolver, MAVEN_REPO via DefaultScriptClassPathResolver) and parametrizes every test case over both — direct source confirmation of Q1/Q4 nobody had to infer

Conflicts resolved in revision:
- F (new) — GRADLE-PLUG-27's old cell claimed 'diagnostics output reports no violation (empty is the pass)'. gradle/gradle's `IsolatedProjectsFixture.groovy:124-132` routes `IsolatedProjectsMode.DIAGNOSTICS` to `assertStateStoredAndDiscarded`, so diagnostics always stores-then-discards and prints through the configuration-cache problem pipeline: output is never empty. Resolved against the old cell as an overclaim; cell now asserts presence/absence of a violation report, carries a dated re-check for the wording, and records that `BuildResult.output` is a legal TestKit surface.
- Verification overclaim, GRADLE-PLUG-24 — a grep proves where the hash check lives, not that it fires; a `Provider` nothing `.get()`s passes it. Replaced with a tampered-pin `buildAndFail()` test plus a `--configuration-cache` repeat.
- Verification overclaim, GRADLE-PLUG-25 — a source read cannot distinguish `exists()` from a hash compare whose result is discarded. Replaced with two runnable legs.
- Verification gap, GRADLE-PLUG-23 — the 'registered exactly once' guarantee was asserted with no way to observe it; no Gradle API or build-scan value reports instantiation count. Resolved with a marker-file leg, and `withDebug(true)`/static counters explicitly rejected (they defeat the process isolation GRADLE-PLUG-15 requires).
- Wave-3 framing retired — 'every GRADLE-PLUG rule is verified by reading source' is false: `withPluginClasspath()` reaches settings scope (`DefaultPluginRequestApplicator` never branches on target type; `SettingsScopeServices` builds the same `DefaultPluginManager`). Recorded as verdict 11.
- Conflicts A–E (wave-3 corpus re-measurements) carried forward unchanged; the follow-up contradicts none of them.

Still open after wave 4:
- Settings-plugin test route default — absent the `compileOnly` trap, should `MAVEN_REPO` (local publish + `pluginManagement { repositories { maven(…) } }`) or `withPluginClasspath()` be the default, given the local-publish step's cost and its `maven-publish` × configuration-cache interaction (gradle/gradle#24040)? GRADLE-PLUG-29 ships a preference, not a measurement — no corpus repo, no gradle/gradle test and no primary doc settles it at settings scope.
- Cold-runner cost of execution-time provisioning — what does GRADLE-PLUG-23's first-task-pays download cost on a GitHub-hosted runner versus a `setup-ocx`-style CI step, and does that change whether the Gradle plugin should provision at all when a CI action already did? (carried forward, unanswered)
- Latent-collision detection for GRADLE-STRUCT-10 — is there a Gradle-side way to detect an actually-losing project (resolution-result walk, build-scan dependency view, `dependencies` report diff) so the rule reports a real defect rather than a latent one? (carried forward, unanswered)
- Dated re-check, not a research round — Isolated Projects' diagnostics console wording is unpinned by any primary source (IP incubating since 9.7.0, 2026-08-06); re-confirm and freeze a literal string in GRADLE-PLUG-27 when IP leaves incubating.

### concurrency — `jvm-concurrency.md`, 30 IDs, 25 MUST

- Dive `java-concurrency-residual-rows` (19 sources): @ThreadSafe's own javadoc claims ThreadSafeChecker validation, but ThreadSafeChecker is never imported into BuiltInCheckerSuppliers.java (0 matches vs. 8 wired sibling threadsafety.* checkers) — the annotation's documented enforcement does not actually ship; GuardedByChecker recognizes exactly five annotation packages, and net.jcip.annotations.GuardedBy — the package from Java Concurrency in Practice, the textbook most training data quotes — is not one of them

Conflicts resolved in revision:
- JAVA-CONC-13 overclaimed: 'Do not use ForkJoinPool.commonPool() for a blocking callback' was unconditional, but the JDK ships ForkJoinPool.ManagedBlocker as a sanctioned escape hatch that expands pool parallelism for the blocking call's duration. Rule text amended in place to name it as the one exception; rationale now also records that CompletableFuture's no-Executor ...Async default IS that same common pool.
- Wrong number corrected: this file's old open question 1 called it the 'ReentrantReadWriteLock 65,536-reader ceiling'. The lock's own javadoc ('Implementation Notes', JDK 21, unchanged since JDK 5) says 65535 recursive write locks and 65535 read locks, and the failure is an Error throw. Corrected everywhere; the wrong figure's only home (open question 1) was removed.
- Residual dive vs. virtual-threads dive on structured-concurrency status: the residual's Contested section says 'still preview as of JDK 25, JEP 505 in JDK 25'. The vt dive read the full seven-preview changelog (JEP 505/25, 525/26, 533/27, finalisation targeted at 28). Primary-source changelog outranks a passing status aside; JAVA-CONC-05/06 unchanged, conflict recorded in verdict 16.
- Map row M-N-07's framing ('CompletableFuture chains with no terminal handler') narrowed: a chain RETURNED to a caller or assigned to a field transfers exception-handling responsibility and is correct (micronaut-core AsyncInterceptor:100-102 confirms). Only a bare unassigned statement is the bug. Row therefore lands as a JAVA-LINT severity bump, not a reading-heuristic rule here.
- Enable-vs-bump, third instance: DoubleCheckedLocking, DateFormatConstant and FutureReturnValueIgnored are ENABLED_WARNINGS (BuiltInCheckerSuppliers.java:982, 972, 1015), not DISABLED_CHECKS. 'Enable it' asks an agent to do nothing; the action is -Xep:<Name>:ERROR. Same shape as frame correction 30's StringCaseLocaleUsage.
- @ThreadSafe's own javadoc contradicted by source: it claims validation by ThreadSafeChecker, which is imported into none of BuiltInCheckerSuppliers.java's three built-in sets (0 matches vs 8 wired threadsafety.* siblings). Resolved against the javadoc; JAVA-CONC-16 states it is prose only, and verdict 12 records it as a documented GAP.

Still open after wave 4:
- Kotlin Flow (map rows M-U-07, M-U-10) — does Flow need its own depth section with the catch-operator placement rule and the StateFlow conflation contract, or do two rows in coroutines.md cover it? Unchanged from the previous round; this dive did not touch Kotlin.
- JDK 27 GA re-verification — JDK 27 reached GA 2026-09-15, after every JEP 533 claim here was written against the RC. Did the 7th preview's shape (R_X type parameter, timeout(), awaitAll() removed) ship unchanged, and is structured concurrency still targeted at JDK 28?
- detekt activation defaults — the audited snapshot is a main-branch build mid-package-rename (dev.detekt.*). Do the four coroutine rules stay active:false in the first stable release from that branch? KT-CORO-01's whole premise depends on it.
- Error Prone ThreadSafeChecker registration — re-read BuiltInCheckerSuppliers.java's import list on any Error Prone bump past 2.36.0. If ThreadSafeChecker appears, JAVA-CONC-16's '@ThreadSafe is prose only' clause inverts. New question opened by this round.

### bazel-java — `jvm-bazel-java.md`, 27 IDs, 15 MUST

- Dive `bazel-java-testing-and-coverage` (15 sources): java_junit5_test is literally java_test underneath (main_class=JUnit5Runner + a -javaagent blocking System.exit) — reading the macro source directly settles the 'hand-rolled second path' question: contrib_rules_jvm's own ActualRunner.java IS that second path, and it's ~150 lines to be Bazel-protocol-correct, not five.; apple_rules_lint is still transitively resolved via bzlmod even though the test rules don't need it — a nuance beyond the README's clean 'linting is opt-in' framing (fetched vs. used are different things).

Conflicts resolved in revision:
- BZL-JAVA-23 overclaimed what the apple_rules_lint dependency means — its old text required 'record the apple_rules_lint dependency explicitly' and its grep flagged a bare `bazel_dep(name = "contrib_rules_jvm")` / `bazel_dep(name = "apple_rules_lint")` as a review finding. That would have made the JUnit 5 adoption BZL-JAVA-24 now requires a finding against itself. Rewritten in place: the decision is the `lint_setup()`/`linter.register()` call only, a transitive fetch is explicitly not evidence of adoption, severity stays CONSIDER.
- BZL-JAVA-23's dangling clause 'Its java_test_suite and java_junit5_test are a separate, unblocked decision' removed — that decision is now settled by BZL-JAVA-24 (use them) and BZL-JAVA-25 (they carry no lint coupling).
- Open question 7 ('Bazel-Java testing and coverage') answered and removed. Its testing half became rules BZL-JAVA-24/25/27; its coverage half had no mechanism to regulate, so it moved into the Verdict as documented gap item 13 (lcov-only, one combined report, no threshold flag in Bazel at all, bazelbuild/bazel#12159 closed not_planned) rather than being dropped or left open.
- JAVA-TEST-10's JaCoCo-BRANCH coverage floor was implicitly assumed portable to Bazel; BZL-JAVA-26 records it is not — the artifact shapes do not match and a CI step globbing jacocoTestReport.xml after `bazel coverage` passes vacuously.
- Evidence class made explicit rather than averaged: new 'Unmeasured in the corpus' subsection records that BZL-JAVA-24/25/27 have zero exemplars on either side (0/6 reference contrib_rules_jvm, apple_rules_lint, junit.jupiter or junit5) and that BZL-JAVA-26's evidence is one-sided, so a reader cannot mistake source-reading guidance for measured practice.

Still open after wave 4:
- java_export / Maven Central publishing from Bazel — does rules_jvm_external's java_export/maven_publish produce a Central-Portal-acceptable bundle (sources jar, javadoc jar, per-file GPG signature, complete POM), or is Bazel a non-publisher that always hands off to Gradle or Maven? Load-bearing for the OCX SDK's jvm-release skill. (carried, unchanged)
- KotlinCompile worker-state reproducibility — does building twice with and without --strategy=KotlinCompile=local produce byte-identical jars? Would promote BZL-JAVA-20 from CONSIDER to SHOULD or retire it. Below the line for this program. (carried, unchanged)
- contrib_rules_jvm stability — the ruleset is pre-1.0 (0.31.0, no tagged GitHub releases) and 0/6 exemplars exercise it, yet BZL-JAVA-24/27 are MUSTs resting entirely on reading its source. A round measuring its adoption outside this corpus, or its API churn across recent BCR versions, would tell us whether a MUST on a pre-1.0 dependency is defensible.
- lcov→JaCoCo conversion ownership — BZL-JAVA-26 says any numeric floor is a CI script over the merged .dat, but names no tool. Whether a maintained lcov→Cobertura/JaCoCo converter exists that a dual Gradle+Bazel shop could standardise on was not run down; without one, a JVM shop needs two coverage toolchains with no bridge.

### Decision carried into authoring

- `kotlin-quality/errors-and-resources.md` ships as the 28th depth file, family `KT-ERR`, rows KT-ERR-01..05; two rows (KT-ERR-01, KT-ERR-03) join the kotlin-quality index non-negotiables. Authoring notes §2 and the "27 depth files" count are amended by this line.
- JAVA-SEC: no MUST depends on find-sec-bugs being installed; every rule carries its grep as the severity floor; the `com.github.spotbugs` 6.4.1/6.4.2 window is forbidden, floor 6.4.3+.

## Authoring landed (2026-09-13)

Phase 7 and 8 receipts in `jvm-topic-map/scratch/`: `author-a-receipt.json`, `author-b-receipt.json`, `review-a-receipt.json`, `review-b-receipt.json`; scripts `jvm-author-{a,b}.mjs`, `jvm-review-{a,b}.mjs`, `jvm-fix-{a,b}.mjs` (generated by `mkfix.py` from the review receipts). Written by the orchestrator; the shipped files are authoritative.

### What shipped

| Package | Kind | Index lines | Non-negotiables | Depth files | IDs | MUST |
|---|---|---|---|---|---|---|
| `java-quality` | rule | 146 | 16 | 9 | 103 | 72 |
| `kotlin-quality` | rule | 156 | 17 | 7 | 66 | 42 |
| `gradle-build` | rule | 171 | 18 | 8 | 134 | 93 |
| `maven-build` | rule | 163 | 18 | 4 | 51 | 39 |
| `jvm-release` | skill | 421 | — | — | — | 16 restated |
| `jvm-dependency-triage` | skill | 357 | — | — | — | 22 restated |
| `jvm-essentials` | bundle | six members, untagged | | | | |

Plus `handoff/bazel-quality-java.md` (BZL-JAVA, 281 lines) and `handoff/bazel-quality-index-row.md`, offered to the shipped `bazel-quality` set and not published from here. Companions in `docs/`, marks in `assets/`, entries in `publish.toml`, the checker step in `taskfile.yml`. `grim publish --dry-run` lists all seven at 0.1.0.

### Authoring drops and allocations

- 24 IDs dropped at authoring in batch a and a comparable set in batch b, each with the reason in the receipts (rule-distillation's four tests; the notes' §6 list; rows the compiler already enforces; JEP 485/513 above the JDK 17 floor). Retired IDs are named as retired in the file that would have owned them: `JAVA-API-13`, `KT-API-10`, `KT-API-11`, `GRADLE-CACHE-07`, `GRADLE-CACHE-16`.
- Allocated at authoring, recorded in the consolidations' revision logs: `MVN-PUB-04..10` (Maven transpositions of GRADLE-PUB rows, `jvm-publishing.md`) and `MVN-BUILD-21` (source encoding, `jvm-maven-and-ant.md`).
- Notes §12 defects: the `mavenLocal()` census is run and recorded (42 files, 4 of them the anti-pattern); no shipped file carries the count or the "disjoint" adjective.
- Kotlin index trimmed to the wave-4 budget (two KT-ERR rows), 18 → 17 non-negotiables.

### Review findings worth remembering

The opus review pass (5 reviewers, ~1.45M tokens) ran verification commands against planted fixtures rather than reading them. Two systemic defects the checker had passed as clean: 85 unquoted `--include=*.x` operands (zsh aborts before grep runs, so every "empty output is the pass" cell read green) and 10 table rows split by a `|` inside a backticked command (Verification and Severity columns shifted). Both are now checker lints with self-tests. Content blockers fixed: the Error Prone promotion list contradiction (nine named in the index, thirteen required across depth files), `extraWarnings` mandated in KT-LINT and forbidden in KT-COMP, two Shadow version-floor statements, the `mvn -X deploy` "dry run" in `jvm-release`, `<url>` checks matching `<scm><url>`, the central-publishing-maven-plugin 0.7.0 floor stated unconditionally.

### Not done, deliberately

- Rule trigger evals in a fresh client session (validation.md) need a consumer with Java or Kotlin files; none exists in the fleet. Skill trigger evals were judged from utterances by the reviewer, not run against a client.
- Q6 (`java.md` into `bazel-quality`) remains the owner's; the handoff file is ready.
- Dated re-checks listed under Residue and Wave 4 stand.

### Q6 resolved (2026-09-13): Bazel-Java ships in `bazel-quality`

Owner said yes. `handoff/bazel-quality-java.md` moved to `rules/bazel-quality/java.md` (BZL-JAVA, 25 IDs, 15 MUST) with its routing row in the index, the manifest and source rows of "Where the Depth Is" and "Siblings" extended to the JVM sets, and the Bazel companions and bundle description updated to thirteen depth files and 353 depth rules. The `handoff/` directory is gone.

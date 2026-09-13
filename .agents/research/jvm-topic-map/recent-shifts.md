---
title: JVM recent shifts (2024-2026) — "use X not Y in 2026" ledger
corpus: Web (primary release material) — JEPs, JDK project pages, Kotlin/JetBrains blog, Gradle/Sonatype/JUnit/Bazel/Spring release notes and official docs; no fleet or exemplar-corpus filesystem reads performed by this scout
agent: jvm-recent-shifts-scout
model: sonnet
date_researched: 2026-09-05
sources_count: 34
scope: |
  Covers what changed across Java, Kotlin, Gradle, Maven, JUnit/test tooling,
  static analysis, Bazel-for-Java, distribution, and supply chain in the last
  ~24 months (2024-09 to 2026-09), each row dated/versioned, to invalidate
  stale model-trained advice before the JVM rule set is authored.
  Does NOT cover: exemplar-corpus file measurements (that is the audit
  scouts' job), Android/Compose/KMP specifics, or a full feature tour of any
  tool — only what changed and what it invalidates.
---

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- Java 25 (2025-09-16) is confirmed LTS; Java 26 shipped 2026-03-17 on schedule; Java 27 is in Release Candidate with GA fixed for 2026-09-15 — the frame's era hypothesis holds exactly.
- The three JEPs the frame flagged as "recent" (483 AOT cache, 491 synchronous virtual threads, 493 jlink-without-JMODs) all actually shipped in **JDK 24** (2025-03), a full LTS cycle before 25 — any advice that treats them as 25-era news is stale by one release.
- FFM API has been **final since JDK 22** (JEP 454, 2024-03) — it is not preview-era anything by 2026; Structured Concurrency is still preview as of JDK 26 (JEP 525, sixth preview) and JDK 27 (JEP 533, seventh preview) — do not tell agents it is stable.
- Java 25 finalized Compact Object Headers (JEP 519) and Generational Shenandoah (JEP 521) as GC/footprint defaults-adjacent features, and removed the 32-bit x86 port (JEP 503) — old advice that assumes a 32-bit Windows/Linux x86 JDK exists is now wrong.
- JDK 26 removed the Applet API (JEP 504) and previewed "Prepare to Make Final Mean Final" (JEP 500) — `Unsafe`-adjacent and reflection-breaking-final advice needs a forward-looking caveat, not yet an enforced floor.
- Kotlin: 2.0 (2024-05) made K2 the default compiler; **K1 support was removed outright in Kotlin 2.4.0** (`-language-version 1.9` now rejected, floor is 2.0) — any rule that still gestures at "K1 fallback" is dead advice once the fleet's Kotlin floor reaches 2.4.
- kapt is in maintenance-only mode and KSP2 has been the K2-based default since KSP `2.0.0`; KSP1 stops being compatible once Kotlin reaches 2.3.0 or AGP reaches 9.0 — "add kapt" is now a last resort, not a default recommendation.
- Dokka 2.0.0 (2024-12) replaced the classic Gradle plugin with a Dokkatoo-based v2 plugin and introduced experimental K2 analysis; K2 analysis became the stable, default, fully-migrated path as of Dokka 2.2.0 — pin Dokka ≥2.2 before recommending K2-based doc generation.
- Kotlin's own Binary Compatibility Validator (`kotlinx.validation`) is in maintenance mode; the successor lives inside the Kotlin Gradle plugin as an experimental `abiValidation {}` block — a rule authored today should route new projects there, not to the standalone `org.jetbrains.kotlinx.binary-compatibility-validator` plugin, once it stabilizes.
- Gradle 9.0.0 (2025) is a hard floor-raise: **Java 17+ to run the daemon** (older JVMs still buildable via toolchains), embeds **Kotlin 2.2.x / K2**, upgrades to **Groovy 4.0**, switches Gradle's own API nullability annotations from JSR-305 to **JSpecify**, and adopts strict SemVer (`9.0.0`, not `9.0`) — any pre-9 doc that says "Gradle runs on Java 8" or cites JSR-305 `@Nullable` on Gradle APIs is stale.
- Configuration Cache is now the **preferred** execution mode in Gradle 9 with automatic fallback (not yet mandatory-on); Isolated Projects only reached **incubating** (from experimental) in Gradle **9.7.0** (2026) — treat both as "opt in and verify," not "on by default," when writing a rule.
- The Develocity rename is corporate, not tooling: the company (formerly Gradle Inc.) renamed to Develocity on 2025-06-30; the Gradle Build Tool itself is unrenamed, unrelicensed, and unaffiliated in ownership terms — do not conflate "Develocity plugin" adoption with a Gradle Build Tool version requirement.
- Gradle 10 (targeted 2026, no fixed date found) is where the deferred Provider API migration lands, and where the Software Model and the parent-project implicit-property lookups (`findProperty()`/`property()`/`hasProperty()` resolving into parent projects, deprecated since 9.6.0) get removed — a rule enforcing "no implicit parent property access" is future-proofing, not paranoia.
- Maven 4.0.0 is **not yet GA** as of the sources fetched (latest confirmed candidate: `4.0.0-rc-6`); the frame's "Maven 4.0 GA" era hypothesis is **unconfirmed/premature** — any artifact must hedge this, citing the RC line, not assume GA shipped.
- OSSRH (Sonatype's Nexus-2-based old publishing path) hit **end-of-life on 2025-06-30**; every namespace was migrated to the Central Publisher Portal, and publishers must now hold a **verified namespace** before uploading — "deploy via `nexus-staging-maven-plugin` to OSSRH" is dead advice for any project publishing after that date.
- Central Publisher Portal began **validating Sigstore signature bundles** on 2025-01-28 (layered on top of the pre-existing PGP requirement) — validated, not yet universally mandatory; treat "Sigstore-sign your Central artifacts" as an emerging, not required, gate.
- Two dated Maven Central supply-chain incidents anchor the "why" for namespace verification: a Jenkins/Maven plugin-name-squatting campaign (846 downloads in 10 days vs. 23M legitimate) and a `com.fasterxml.jackson.core`-mimicking typosquat package pulled within 1.5 hours of report; a further `org.mvnpm:posthog-node` incident (2025-11-25) shows npm-mirrored malware reaching Central via the `mvnpm` bridge — a rule that pins exact groupId/artifactId and checks namespace verification status earns its keep.
- JUnit 6.0.0 shipped **2025-09-30** with a **Java 17 / Kotlin 2.2** floor, unified all Platform/Jupiter/Vintage artifacts onto one version number, adopted JSpecify nullability annotations across all modules, folded JFR support directly into `junit-platform-launcher`, and discontinued `junit-platform-runner` (the JUnit-4-style runner for the Platform) — a project still depending on `junit-platform-runner` needs a migration path.
- Maven Surefire **3.6.0** collapsed to a single JUnit Platform provider (`surefire-junit-platform`) for both JUnit 5 (via Jupiter Engine) and JUnit 4 ≥4.12 (via Vintage Engine); JUnit 4 <4.12 is no longer runnable at all — a Surefire config still declaring `surefire-junit47` or pinning a pre-4.12 JUnit 4 is broken advice.
- PMD 7 (2024-03-22) is a breaking grammar rewrite: multiple rules renamed (e.g. `DefaultLabelNotLastInSwitchStmt`→`DefaultLabelNotLastInSwitch`, `NonCaseLabelInSwitchStatement`→`NonCaseLabelInSwitch`, `TooFewBranchesForASwitchStatement`→`TooFewBranchesForSwitch`, `SwitchStmtsShouldHaveDefault`→`NonExhaustiveSwitch`) with old names deprecated-but-working — a rule citing the old rule names should carry both, dated.
- JSpecify hit **1.0 in July 2024**; adoption now spans OpenJDK, Error Prone, Guava, Kotlin, IntelliJ, Sonar, and — completed **November 2025** — Spring Framework 7 / Spring Boot 4's full migration off its home-grown `@Nullable` — JSpecify is the 2026 default nullness-annotation choice, not javax/JSR-305 or Spring's own.
- Spring Boot **4.0 shipped 2025-11-20** (paired with Spring Framework 7.0) on a **Jakarta EE 11 / Servlet 6.1** baseline, keeping **Java 17 as the floor** (25 supported) — bundles Jackson 3, split auto-configuration jars, JSpecify null-safety, and Gradle 9 support; this is the ecosystem marker the frame wanted, and it confirms Java 17 (not 21) as the practical floor most libraries must still support.
- Bazel **9.0 LTS shipped 2026-01-20**: WORKSPACE is completely removed and Bzlmod is the sole external-dependency system; `--incompatible_autoload_externally` is **empty by default** in 9.0 and the flag itself is slated for removal in 10.0 — any BUILD file still relying on autoloaded native symbols needs an explicit `load()` of the now-external ruleset.
- `bazel-contrib/rules_jvm_external` is alive and versioned independently (6.10 as of 2026-02-04) — no merger into a "rules_jvm" mono-repo was found in this pass; treat any claim of such a merge as unconfirmed and re-check before publishing.
- Shadow (fat-jar plugin) fully rewrote itself in Kotlin as **9.0.0** under the `com.gradleup.shadow` plugin ID (migrated off the unmaintained `com.github.johnrengelman.shadow`), requires **Java 17** for Gradle-9-targeting versions, and carries several breaking changes — a rule referencing the old plugin ID is stale for any project past the migration.
- kotlinx.coroutines **1.10.0** bumped its own Kotlin baseline to 2.1.0, reorganized `kotlinx-coroutines-debug` to stop splitting packages with `-core` (breaking the direct `AgentPremain` reference path), and dropped its shaded Byte Buddy dependency — a debug-agent integration written against pre-1.10 internals will break silently.

## Survey

### 1. OpenJDK per-release JEP pages and JEPs 483/491/493 (Java 21, 25, 26, 27)

[JDK 21 project page](https://openjdk.org/projects/jdk/21/), [JDK 25](https://openjdk.org/projects/jdk/25/), [JDK 26](https://openjdk.org/projects/jdk/26/), [JDK 27](https://openjdk.org/projects/jdk/27/), [JEP 483](https://openjdk.org/jeps/483), [JEP 491](https://openjdk.org/jeps/491), [JEP 493](https://openjdk.org/jeps/493).

JDK 21 (2023-09-19, LTS) finalized Virtual Threads (444), Record Patterns (440), Pattern Matching for switch (441), Sequenced Collections (431); FFM API was still 3rd preview (442), Structured Concurrency 1st preview (453). JDK 25 (2025-09-16, LTS) finalized Scoped Values (506), Key Derivation Function API (510), Module Import Declarations (511), Compact Source Files/instance main (512), Flexible Constructor Bodies (513), the two Leyden-lineage AOT ergonomics JEPs (514, 515), Compact Object Headers (519), Generational Shenandoah (521), and removed the 32-bit x86 port (503, final); Structured Concurrency was still only 5th preview (505), PEM encodings 1st preview (470), Vector API 10th incubator (508). JDK 26 (2026-03-17) previewed "Prepare to Make Final Mean Final" (500), removed the Applet API (504), added HTTP/3 to the HTTP Client (517), AOT object caching with any GC (516), and pushed Structured Concurrency to 6th preview (525) and Primitive Types in Patterns to 4th preview (530). JDK 27 (RC as of 2026-09-05, GA fixed 2026-09-15) targets G1-as-default-everywhere (523), post-quantum hybrid TLS key exchange (527), Compact Object Headers **by default** (534), and Structured Concurrency's 7th preview (533) — seven previews in and still not final, the single most persistently-preview feature on the whole ledger. Separately, JEP 483 (AOT class loading/linking cache) and JEP 491 (virtual threads no longer pin on `synchronized`) both closed/delivered in **JDK 24**, and JEP 493 (jlink from the running runtime image, no JMODs, via `--enable-linkable-runtime`, opt-in) also targeted **JDK 24** — none of these are 25-era news despite how they get talked about.

### 2. Kotlin What's New pages and JetBrains blog (2.0-2.4)

[whatsnew22](https://kotlinlang.org/docs/whatsnew22.html), [whatsnew23](https://kotlinlang.org/docs/whatsnew23.html), [Kotlin 2.3.0 released](https://blog.jetbrains.com/kotlin/2025/12/kotlin-2-3-0-released/), [Kotlin 2.4.0 released](https://blog.jetbrains.com/kotlin/2026/06/kotlin-2-4-0-released/), [Inside Kotlin 2.4 — end of K1](https://doveletter.dev/articles/whats-new-kotlin-2-4).

Kotlin 2.2.0 (2026-03-27 per the JetBrains blog naming used by search, cross-check against kotlinlang docs before quoting a date in the rule itself) changed default interface-method generation on JVM, brought Binary Compatibility Validation into the Kotlin Gradle plugin, and stabilized `Base64`/`HexFormat` in stdlib. Kotlin 2.3.0 (2025-12) is the last release where `-language-version=1.9` (K1) still works; **Kotlin 2.4.0 rejects `-language-version=1.9` outright** — the floor becomes 2.0 (K2-only), formally ending K1 as a selectable mode.

### 3. Gradle 9.0.0 / 9.7.x release notes, "what's new," and the Develocity/Isolated-Projects/Gradle-10 blog posts

[9.0.0 release notes](https://docs.gradle.org/9.0.0/release-notes.html), [What's new in Gradle 9.0.0](https://gradle.org/whats-new/gradle-9/), [9.7.0 release notes](https://docs.gradle.org/9.7.0/release-notes.html), [current release notes](https://docs.gradle.org/current/release-notes.html), [The Company Formerly Known as Gradle](https://blog.gradle.org/the-company-formerly-known-as-gradle), [Gradle newsletter Aug 2026](https://newsletter.gradle.org/2026/08), [Deprecated List (Gradle API 9.7.1)](https://docs.gradle.org/current/javadoc/deprecated-list.html).

Gradle 9.0.0 requires Java 17+ to run the daemon (build-time toolchains can still target older JVMs), embeds Kotlin 2.2.x/K2 (up from 1.8), moves to Groovy 4.0, switches API nullability annotations from JSR-305 to JSpecify, adopts strict SemVer versioning, makes Configuration Cache the *preferred* execution mode with automatic fallback, and makes archive tasks reproducible by default. As of 9.7.1 (2026-08-20, the latest patch found), Isolated Projects is "incubating" (promoted from experimental in 9.7.0), cutting median IDE sync on Gradle's own 300-subproject build from 84s to 47s; "Resilient Sync" lets IntelliJ IDEA 2026.2 keep code intelligence alive on a broken IDE-import build. The company (not the tool) renamed from Gradle Inc./Gradle Technologies to Develocity on 2025-06-30, moving to develocity.ai — the build tool's name, license, and ownership are unaffected. Gradle 10 (targeted for 2026, no fixed date confirmed) is where the previously-deferred Provider API migration is aimed to land, and where the Software Model and parent-project implicit `findProperty()`/`property()`/`hasProperty()` resolution (deprecated as of 9.6.0) are slated for removal.

### 4. JUnit 6.0.0 release notes

[docs.junit.org/6.0.0/release-notes.html](https://docs.junit.org/6.0.0/release-notes.html).

Released 2025-09-30. Floor: Java 17, Kotlin 2.2. Platform/Jupiter/Vintage artifacts now share one version number (no more independent Platform versioning). All modules carry JSpecify nullability annotations. JFR support is now built into `junit-platform-launcher` rather than a separate integration. `junit-platform-runner` (the JUnit-4-style runner that let JUnit 4 test-runners drive Platform tests) is discontinued.

### 5. OSSRH sunset and Central Publisher Portal (Sonatype official docs)

[OSSRH Sunset docs](https://central.sonatype.org/pages/ossrh-eol/), [OSSRH Sunset Announcement](https://central.sonatype.org/news/20250326_ossrh_sunset/), [Central Publisher Portal Guide](https://central.sonatype.org/publish/publish-portal-guide/), [Register to Publish via Central Portal](https://central.sonatype.org/register/central-portal/).

OSSRH (the Nexus-2-based legacy publishing path) reached end-of-life 2025-06-30, coinciding with Nexus Repository Manager v2's own EOL. All existing OSSRH namespaces were auto-migrated to the Central Publisher Portal; publishers log in with the same OSSRH credentials at central.sonatype.com/publishing/namespaces and either self-migrate or use the OSSRH Staging API compatibility shim (a subset of the Nexus 2 API translated to Portal calls) as a stopgap. Namespace **verification** (proving control of the groupId, e.g. via DNS TXT record or GitHub-repo-ownership for `io.github.*`) is a mandatory precondition of uploading any component.

### 6. Maven Central supply-chain incidents and Sigstore validation

[Sonatype: malware removed from Maven Central](https://www.sonatype.com/blog/malware-removed-from-maven-central), [Aikido: Jackson typosquatting](https://www.aikido.dev/blog/maven-central-jackson-typosquatting-malware), [Maven Central Sigstore Validation Defender Guide 2026](https://safeguard.sh/resources/blog/maven-central-sigstore-validation-2026).

Documented incidents: (1) Jenkins/Maven plugin name-squatting — malicious artifacts under legitimate-sounding names pulled 846 downloads in 10 days against 23M legitimate downloads of the real plugins in the same window; (2) a package published under `org.fasterxml.jackson.core` (the real Jackson group is `com.fasterxml.jackson.core`) exfiltrating to a `fasterxml.org` C2 domain mimicking the real `fasterxml.com`, taken down 1.5 hours after report; (3) `org.mvnpm:posthog-node:4.18.1` (2025-11-25) — the Shai-Hulud 2.0 npm supply-chain worm reaching Central via the `mvnpm` npm-to-Maven mirror bridge. Sonatype began validating Sigstore signature bundles on the Central Publisher Portal starting **2025-01-28**, layered on the pre-existing PGP signature requirement; this is validated, not yet a hard publish-time gate.

### 7. Maven Surefire 3.6.0 "What's New"

[maven.apache.org/surefire/.../whats-new-3-6-0.html](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html).

Since 3.6.0, Surefire collapses to one provider module, `surefire-junit-platform`, for everything: JUnit 5 via the Jupiter Engine, JUnit 4 (≥4.12 only) via the Vintage Engine. JUnit 4 versions older than 4.12 can no longer run under Surefire at all.

### 8. PMD 7.0.0 announcement

[PMD 7 is here](https://pmd.github.io/2024/03/22/PMD-7-is-here/), [Detailed PMD 7 release notes](https://pmd.github.io/pmd/pmd_release_notes_pmd7.html).

Released 2024-03-22. Grammar rewritten to natively support records, sealed types, pattern matching, and other post-Java-8 syntax — this forced node renames, which forces rule renames since custom/XPath rules key off node names. Confirmed renames: `DefaultLabelNotLastInSwitchStmt`→`DefaultLabelNotLastInSwitch`, `NonCaseLabelInSwitchStatement`→`NonCaseLabelInSwitch`, `TooFewBranchesForASwitchStatement`→`TooFewBranchesForSwitch`, `SwitchStmtsShouldHaveDefault`→`NonExhaustiveSwitch`. Old names still resolve but emit deprecation warnings. The public API was also split into a stable surface vs. internal implementation.

### 9. Checkstyle release notes / site

[checkstyle.org](https://checkstyle.org/), [Release Notes](https://checkstyle.org/releasenotes.html).

As of the pages fetched, Checkstyle parses all Java 25 syntax and is buildable under JDK 21 through 25; a 14.0.0 release (dated "August 18" in the source, year unstated in the fetched summary — re-verify before citing precisely) added `module-info.java` grammar support. Treat the exact 10.x→14.x version-to-feature mapping as needing a direct changelog re-check before a rule cites a specific version floor.

### 10. Dokka 2.0/2.1/2.2 releases

[Kotlin blog announcement (X/Twitter)](https://x.com/kotlin/status/1869012171369132339), [Dokka 2.0.0 release](https://github.com/Kotlin/dokka/releases/tag/v2.0.0), [Dokka 2.2.0 release](https://github.com/Kotlin/dokka/releases/tag/v2.2.0).

Dokka 2.0.0 (2024-12) replaced the classic Gradle plugin with a new one built on the Dokkatoo architecture and introduced K2 analysis as *experimental*, sharing the same Analysis API IntelliJ's K2 mode uses. K2 analysis became stable, default, and fully migrated off the old shared-analysis path as of Dokka **2.2.0**.

### 11. KSP (Kotlin Symbol Processing) README and kapt maintenance status

[google/ksp README](https://github.com/google/ksp/blob/main/README.md).

KSP2 (K2-compiler-based) has been the default implementation since KSP `2.0.0`. KSP1 is deprecated and stops being compatible once a project's Kotlin reaches 2.3.0 or AGP reaches 9.0. kapt itself is described across secondary sources as "maintenance mode," with annotation processors on KSP measured at up to 2x faster builds than the kapt path.

### 12. Kotlin Gradle plugin binary-compatibility-validation docs

[kotlinlang.org/docs/gradle-binary-compatibility-validation.html](https://kotlinlang.org/docs/gradle-binary-compatibility-validation.html).

The standalone `kotlinx.validation`/Binary Compatibility Validator project is now maintenance-only (critical fixes and Kotlin-version compat only); new feature work moved into the Kotlin Gradle plugin's own experimental `abiValidation {}` block (opt-in via `@OptIn`).

### 13. Spring Boot 4.0 / Spring Framework 7.0 coverage

[Baeldung: Spring Boot 4 & Spring Framework 7](https://www.baeldung.com/spring-boot-4-spring-framework-7), [Jakarta EE 11 under the hood](https://www.javacodegeeks.com/2026/07/jakarta-ee-11-under-the-hood-what-spring-boot-4-inherits-and-what-it-ignores.html).

Spring Boot 4.0 shipped 2025-11-20 alongside Spring Framework 7.0. Baseline: Jakarta EE 11, Servlet 6.1-compatible containers, **Java 17 floor** (25 supported) — this is an ecosystem-wide confirmation that 17, not 21, remains the practical minimum most libraries still target in 2026. Ships Jackson 3, split auto-configuration jars, and completes the JSpecify null-safety migration (Spring's own `@Nullable`/`@NonNull` retired in favor of JSpecify as of November 2025).

### 14. Bazel 9.0 LTS announcement

[blog.bazel.build/2026/01/20/bazel-9.html](https://blog.bazel.build/2026/01/20/bazel-9.html).

Released 2026-01-20 as an LTS. WORKSPACE is completely removed; Bzlmod is the sole external-dependency mechanism. `--incompatible_autoload_externally` is empty by default in 9.0 (native/autoloaded symbols must be explicitly `load()`ed from their now-external rule sets) and the flag itself is scheduled for removal in Bazel 10. The post did not itself enumerate Java-specific toolchain defaults or remote-JDK availability — that detail needs a follow-up read of `rules_java`'s own release notes, which this pass did not fetch directly (see Contested).

### 15. rules_jvm_external releases

Search-derived (no raw fetch): latest tag found is **6.10** (2026-02-04) under `bazel-contrib/rules_jvm_external`; no evidence surfaced in this pass of a rename or merge into a unified "rules_jvm" repository, despite a same-named `bazel-contrib/rules_jvm` repo existing with its own release history — these read as two distinct, still-independent projects as of 2026-09-05, and should be re-verified directly (`git ls-remote` / README fetch) before a rule cites one as superseding the other.

### 16. Shadow (fat-jar) plugin GradleUp fork

[GradleUp/shadow README](https://github.com/GradleUp/shadow), [Shadow "About"](https://gradleup.com/shadow/about/), [Shadow "Changes"](https://gradleup.com/shadow/changes/).

Maintenance passed from the original `com.github.johnrengelman.shadow` plugin ID to the GradleUp org's `com.gradleup.shadow`. Version 9.0.0 is a full Kotlin rewrite with several breaking changes; Shadow versions supporting Gradle 9 (9.3.0+, per the fetched summary) require Java 17, and only Gradle-9 support is being backported into the 8.x line going forward — the 8.x branch is not gaining new Gradle-9-unrelated features.

### 17. kotlinx.coroutines 1.10.0 release

[Release 1.10.0](https://github.com/Kotlin/kotlinx.coroutines/releases/tag/1.10.0), [CHANGES.md](https://github.com/Kotlin/kotlinx.coroutines/blob/master/CHANGES.md).

Bumped internal Kotlin baseline to 2.1.0. Reorganized `kotlinx-coroutines-debug` so it no longer splits a package with `-core`; anything directly referencing `kotlinx.coroutines.debug.AgentPremain` must move to the `.internal` package. Dropped the shaded Byte Buddy dependency from `-debug`, shrinking the artifact. Added `Flow.any`/`Flow.all`/`Flow.none`.

### 18. JSpecify 1.0 and adoption chain

[Scott Logic: Using JSpecify 1.0](https://blog.scottlogic.com/2024/12/18/taming-nullness-in-java-with-jspecify.html), [NullAway JSpecify Support wiki](https://github.com/uber/NullAway/wiki/JSpecify-Support), [Spring: Null Safety with JSpecify and NullAway](https://spring.io/blog/2025/03/10/null-safety-in-spring-apps-with-jspecify-and-null-away/).

JSpecify 1.0 released July 2024. Consensus adopter list per the sources read: OpenJDK, EISOP, PMD, Android, Error Prone, Guava, Kotlin, IntelliJ, Azure SDK, Sonar, Spring. NullAway added JSpecify support as its standard checking mode starting around 0.11.1; Spring Framework 7/Boot 4 completed migration off its home-grown annotations onto JSpecify in November 2025.

### 19. Kotest 6.0 release docs

[Features and Changes in Kotest 6.0](https://kotest.io/docs/next/release6/).

Floor: JDK 11, Kotlin 2.2. All extensions (including the Testcontainers extension) now publish under the `io.kotest` group with version cadence tied to core Kotest releases, rather than independently versioned.

### 20. SpotBugs Java 25 support issue/docs

[SpotBugs docs (introduction, 4.9.7)](https://spotbugs.readthedocs.io/en/stable/introduction.html), [GitHub issue #3564 — Add Java 25 support](https://github.com/spotbugs/spotbugs/issues/3564).

SpotBugs's GA line dropped JDK 24 support in favor of JDK 25, driven by its ASM (9.8, which supports Java 25) and BCEL (6.11, needed for Java 25; 6.10 only reached Java 24) dependencies — a two-stage dependency-upgrade story, not a single flag.

## Candidate topics

| Topic (question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|
| Does the project's stated Java floor still match the JDK it actually builds/tests on (17 vs 21 vs 25)? | Spring Boot 4 and JUnit 6 both confirm 17 as the practical 2026 floor, not 21 — a rule assuming 21 over-restricts | [Spring Boot 4](https://www.baeldung.com/spring-boot-4-spring-framework-7), [JUnit 6](https://docs.junit.org/6.0.0/release-notes.html) | no | java | P0 |
| Is a `synchronized` block on a virtual-thread hot path still assumed to pin the carrier thread? | JEP 491 (JDK 24) removed pinning-on-monitor; stale advice tells people to avoid `synchronized` entirely | [JEP 491](https://openjdk.org/jeps/491) | no | java | P0 |
| Does the build still assume JMOD files are required for `jlink`? | JEP 493 (JDK 24) allows linking straight from the running runtime image | [JEP 493](https://openjdk.org/jeps/493) | no | java | P2 |
| Is Structured Concurrency (still preview through JDK 27) gated behind `--enable-preview` everywhere it's used? | 7 previews in and still unstable API — code depending on it needs a recheck path every release | [JDK 27 schedule](https://openjdk.org/projects/jdk/27/) | no | java | P1 |
| Does any code path assume a 32-bit x86 JDK exists? | Removed as of JDK 25 (JEP 503, final) | [JDK 25](https://openjdk.org/projects/jdk/25/) | no | java | P2 |
| Is the Applet API (or any dependency on it) still referenced? | Removed JDK 26 (JEP 504) | [JDK 26](https://openjdk.org/projects/jdk/26/) | no | java | P3 |
| Does the codebase's nullness annotations use JSR-305/`javax.annotation` instead of JSpecify? | JSpecify 1.0 is now the converged annotation set across Error Prone/NullAway/Kotlin/Spring/Gradle itself | [JSpecify 1.0](https://blog.scottlogic.com/2024/12/18/taming-nullness-in-java-with-jspecify.html), [Gradle 9](https://docs.gradle.org/9.0.0/release-notes.html) | no | java, kotlin, sdk | P0 |
| Is NullAway configured in its legacy mode instead of JSpecify mode? | JSpecify mode is the forward-compatible NullAway configuration | [NullAway JSpecify wiki](https://github.com/uber/NullAway/wiki/JSpecify-Support) | no | java | P1 |
| Does a Kotlin build still pass `-language-version 1.9` (K1) anywhere in CI or a compiler-args override? | Rejected outright starting Kotlin 2.4.0 | [Kotlin 2.4.0 released](https://blog.jetbrains.com/kotlin/2026/06/kotlin-2-4-0-released/) | no | kotlin | P0 |
| Is kapt the annotation-processing tool where KSP2 would work instead? | kapt maintenance-mode, KSP2 default & ~2x faster, KSP1 incompatible past Kotlin 2.3/AGP 9.0 | [google/ksp README](https://github.com/google/ksp/blob/main/README.md) | no | kotlin, gradle | P0 |
| Does the project use the classic Dokka Gradle plugin or older K1-analysis Dokka? | Dokka 2.0 replaced the plugin; K2 analysis stable/default since 2.2.0 | [Dokka 2.0.0](https://github.com/Kotlin/dokka/releases/tag/v2.0.0) | no | kotlin, sdk | P1 |
| Is the standalone `kotlinx.validation`/BCV plugin used where the in-KGP `abiValidation` block would be the forward path? | BCV standalone is maintenance-only | [Kotlin BCV docs](https://kotlinlang.org/docs/gradle-binary-compatibility-validation.html) | no | kotlin, sdk | P2 |
| Does the Gradle build assume a Java 8 (or <17) daemon JVM? | Gradle 9 requires 17+ to *run* (toolchains can still target lower) | [Gradle 9.0.0 release notes](https://docs.gradle.org/9.0.0/release-notes.html) | no | gradle | P0 |
| Does a plugin's own Kotlin DSL script depend on JSR-305 `@Nullable` semantics against Gradle's API? | Gradle 9 switched its own API annotations to JSpecify, which is stricter under Kotlin 2.2/K2 | [Gradle 9.0.0](https://docs.gradle.org/9.0.0/release-notes.html) | no | gradle, plugin-dev | P1 |
| Is Configuration Cache treated as mandatory-on, or as "preferred with fallback"? | 9.0 makes it preferred, not forced; a rule asserting either extreme is wrong | [What's new in 9.0.0](https://gradle.org/whats-new/gradle-9/) | no | gradle | P0 |
| Is Isolated Projects assumed stable/GA? | Only "incubating" as of 9.7.0 (2026), promoted from experimental | [9.7.0 release notes](https://docs.gradle.org/9.7.0/release-notes.html) | no | gradle | P1 |
| Does a script rely on `findProperty()`/`property()`/`hasProperty()` resolving through parent-project scope? | Deprecated since 9.6.0, removal targeted for Gradle 10 | [Deprecated list, 9.7.1](https://docs.gradle.org/current/javadoc/deprecated-list.html) | no | gradle | P1 |
| Does documentation conflate "Develocity" (the company/build-scan product) with a Gradle Build Tool version requirement? | Rename is corporate only, 2025-06-30 | [The Company Formerly Known as Gradle](https://blog.gradle.org/the-company-formerly-known-as-gradle) | no | gradle | P3 |
| Is the build still on the pre-9.0.0 version-number scheme (`9.0` vs `9.0.0`)? | Gradle 9 adopted strict SemVer MAJOR.MINOR.PATCH | [Gradle 9.0.0 release notes](https://docs.gradle.org/9.0.0/release-notes.html) | no | gradle | P3 |
| Does a Maven project still publish via `nexus-staging-maven-plugin`/OSSRH? | OSSRH EOL 2025-06-30; Central Portal is the only path now | [OSSRH Sunset docs](https://central.sonatype.org/pages/ossrh-eol/) | no | maven, sdk | P0 |
| Has the project's Maven Central namespace been verified in the Central Portal? | Verification is now a mandatory publish precondition | [Central Publisher Portal Guide](https://central.sonatype.org/publish/publish-portal-guide/) | no | maven, sdk | P0 |
| Does the SDK sign releases with PGP only, with no path toward Sigstore? | Central Portal validates Sigstore bundles since 2025-01-28 (emerging, not yet mandatory) | [Sigstore Validation guide](https://safeguard.sh/resources/blog/maven-central-sigstore-validation-2026) | no | maven, sdk, plugin-dev | P1 |
| Is the artifact's `groupId` distinguishable at a glance from a plausible typosquat (e.g. `.org` vs `.com`, missing/extra path segment)? | Documented incidents (Jackson typosquat, Jenkins plugin squat) exploited exactly this | [Aikido Jackson typosquat](https://www.aikido.dev/blog/maven-central-jackson-typosquatting-malware) | no | maven, sdk | P1 |
| Is Maven 4 assumed GA anywhere in the artifact set? | Not confirmed GA in this pass (latest found: 4.0.0-rc-6) — must hedge | [rc-6 release notes](https://maven.apache.org/docs/4.0.0-rc-6/release-notes.html) | no | maven | P0 |
| Does a Surefire config still reference `surefire-junit47` or a JUnit-4-<4.12 dependency? | 3.6.0 unified onto one JUnit-Platform provider; sub-4.12 JUnit 4 no longer runs | [Surefire 3.6.0 What's New](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html) | no | maven, java | P1 |
| Does test code still depend on `junit-platform-runner`? | Discontinued in JUnit 6.0.0 | [JUnit 6.0.0 release notes](https://docs.junit.org/6.0.0/release-notes.html) | no | java, kotlin | P1 |
| Does a PMD ruleset XML still reference a pre-7 rule name (e.g. `DefaultLabelNotLastInSwitchStmt`)? | Renamed in PMD 7 (old names deprecated-but-working) | [PMD 7 is here](https://pmd.github.io/2024/03/22/PMD-7-is-here/) | no | java | P2 |
| Does the build's Checkstyle/PMD/SpotBugs version predate the tool's own Java-25 grammar/bytecode support? | Each tool gates Java-25 parsing behind a specific version (Checkstyle 14.x; SpotBugs's ASM 9.8/BCEL 6.11 chain) | [Checkstyle.org](https://checkstyle.org/), [SpotBugs #3564](https://github.com/spotbugs/spotbugs/issues/3564) | no | java | P2 |
| When must a library declare a Gradle dependency as `api` rather than `implementation`, and how does a reviewer detect a leaked type? | Central to the OCX SDK's public-surface discipline; unaffected by recent-shift churn but load-bearing | (frame, not a dated shift) | no | gradle, sdk | P0 |
| Does the shadow/fat-jar plugin ID still say `com.github.johnrengelman.shadow`? | GradleUp fork moved to `com.gradleup.shadow`; old ID unmaintained | [GradleUp/shadow](https://github.com/GradleUp/shadow) | no | gradle | P1 |
| Is a Gradle-9-targeting Shadow build still on Java <17? | Shadow 9.3.0+ backport line requires Java 17 for Gradle 9 support | [Shadow changes](https://gradleup.com/shadow/changes/) | no | gradle | P2 |
| Does code reference `kotlinx.coroutines.debug.AgentPremain` directly? | Moved to `.internal` package as of coroutines 1.10.0 | [coroutines 1.10.0](https://github.com/Kotlin/kotlinx.coroutines/releases/tag/1.10.0) | no | kotlin | P3 |
| Does the Bazel build still rely on autoloaded native Java/C++ rule symbols without an explicit `load()`? | `--incompatible_autoload_externally` is empty by default in Bazel 9.0 | [Bazel 9 blog](https://blog.bazel.build/2026/01/20/bazel-9.html) | no | bazel-java | P0 |
| Does a Bazel `MODULE.bazel` still reference WORKSPACE-era macros? | WORKSPACE fully removed in Bazel 9.0 | [Bazel 9 blog](https://blog.bazel.build/2026/01/20/bazel-9.html) | no | bazel-java | P0 |
| Is `rules_jvm_external`'s bzlmod `maven.install` extension pinned to a pre-6.x lock-file format? | 6.10 is current; lock-file format changes across the 5→6 line are a known migration pain point (not independently re-verified this pass) | [rules_jvm_external releases](https://github.com/bazel-contrib/rules_jvm_external/releases) | partial | bazel-java | P1 |
| Is there really a merged "rules_jvm" repo superseding `rules_jvm_external`? | Search surfaced a same-family repo name but no confirmed merge — needs direct verification before any rule claims it | (search only, no raw fetch) | no | bazel-java | P2 |
| Does the Kotlin Gradle plugin's stated Gradle/AGP compatibility table match the pinned Gradle version? | Kotlin 2.x ships tied to specific Gradle floors (K2/Groovy4/Kotlin-2.2 chain via Gradle 9) — compatibility drift breaks builds silently | [Gradle 9.0.0](https://docs.gradle.org/9.0.0/release-notes.html) | no | kotlin, gradle | P1 |
| Does a test suite pin Kotest below 6.0 while depending on the (now-`io.kotest`-grouped) Testcontainers extension? | Kotest 6.0 unified extension versioning/group | [Kotest 6.0 release docs](https://kotest.io/docs/next/release6/) | no | kotlin | P2 |
| Does a Gradle plugin's own `compileOnly`/API surface still target JSR-305, breaking under Gradle 9's JSpecify-annotated API? | Directly affects the OCX Gradle plugin's forward compatibility | [Gradle 9.0.0](https://docs.gradle.org/9.0.0/release-notes.html) | no | plugin-dev | P0 |
| Does a `java-gradle-plugin` project's TestKit matrix include Gradle 9.7+ (Isolated-Projects-incubating) alongside 8.x? | Plugin compatibility matrices are the single most cited Gradle-plugin-dev failure mode | (frame + Gradle 9 series) | no | plugin-dev | P0 |
| Does Spring-based code still reference Spring's own `@Nullable`/`@NonNull` instead of JSpecify's? | Spring completed the JSpecify migration Nov 2025 | [Spring Boot 4](https://www.baeldung.com/spring-boot-4-spring-framework-7) | no | java, sdk | P1 |
| Does the project assume Jakarta EE 8/9/10 instead of 11 when targeting current Spring Boot? | Spring Boot 4.0 baseline is Jakarta EE 11 / Servlet 6.1 | [Jakarta EE 11 under the hood](https://www.javacodegeeks.com/2026/07/jakarta-ee-11-under-the-hood-what-spring-boot-4-inherits-and-what-it-ignores.html) | no | java | P3 |
| What charset/locale defaults does a build assume when running tests across CI images? | Boring-but-bites topic; unaffected by recent shifts but a perennial nondeterminism source in JVM CI | (frame, general) | no | java, gradle, maven | P1 |
| Does the build pin reproducible timestamps for archive tasks, and does it rely on Gradle 9's reproducible-archive-by-default behavior correctly? | Gradle 9 made archive tasks reproducible by default — a rule should verify, not merely trust | [Gradle 9.0.0 release notes](https://docs.gradle.org/9.0.0/release-notes.html) | no | gradle | P2 |
| Does dependency-locking/verification metadata exist and is it actually enforced in CI, not merely present on disk? | 2026 playbooks treat this as still largely unenforced despite being available since Gradle 6 | (search summary; needs primary re-check) | no | gradle | P1 |
| Is classpath ordering assumed deterministic across `implementation`/`api`/`runtimeOnly` configurations without a resolution-strategy check? | Boring-but-bites determinism topic named in the brief | (frame, general) | no | gradle | P1 |
| Does Windows-path handling (backslashes, drive letters, long-path limits) get exercised in the build's own CI matrix? | Named directly in the brief as a bites-in-practice topic | (frame, general) | no | gradle, maven, sdk | P2 |
| Is a Gradle convention plugin's extensibility seam (e.g. `abstract` DSL classes for Gradle to instantiate) still using eager `Property` initialization instead of lazy `Provider` chains? | Directly targeted by the incoming Gradle 10 Provider API migration | [Gradle 10 targeted 2026](https://newsletter.gradle.org/2026/08) | no | gradle, plugin-dev | P1 |
| Does the OCX Gradle plugin's on-disk cache/lockfile format carry an explicit version field for forward migration? | Load-bearing for the future OCX Gradle plugin; a generic but critical seam | (frame) | no | plugin-dev | P0 |

## Recent shifts seen in this corpus

- **2024-03 (PMD 7.0.0):** grammar rewrite renames rule identifiers; old names deprecated, not removed. Invalidates: any custom PMD ruleset XML written against pre-7 rule names without an upgrade note.
- **2024-05 (Kotlin 2.0):** K2 becomes the default compiler. Invalidates: any advice assuming K1 is still the default.
- **2024-07 (JSpecify 1.0):** first stable cross-ecosystem nullness annotation set. Invalidates: recommending JSR-305 (`javax.annotation.Nullable`) or a tool's home-grown nullness annotations as the 2026 default.
- **2024-12 (Dokka 2.0.0):** new Gradle plugin architecture (Dokkatoo-based), K2 analysis experimental. Invalidates: classic Dokka Gradle plugin usage docs.
- **2025-01-28 (Central Portal Sigstore validation begins):** Invalidates: "PGP signature is the whole story" for Central publishing — Sigstore is now validated too, trending toward required.
- **2025-03 (JDK 24 — JEPs 483, 491, 493):** AOT cache, unpinned virtual-thread synchronization, jlink-without-JMODs. Invalidates: "virtual threads pin on `synchronized`" and "jlink needs JMOD files" as blanket advice for any JDK ≥24.
- **2025-06-30 (OSSRH sunset + Develocity corporate rename, same date):** Invalidates: OSSRH-based publishing instructions; and any doc conflating the Develocity company rename with a Gradle Build Tool requirement.
- **2025-09-16 (JDK 25 LTS):** confirms the frame's era hypothesis exactly; removes 32-bit x86 (JEP 503, final).
- **2025-09-30 (JUnit 6.0.0):** unified versioning, JSpecify annotations, discontinued `junit-platform-runner`, Java 17/Kotlin 2.2 floor. Invalidates: pinning JUnit Platform/Jupiter/Vintage to independent version numbers; relying on `junit-platform-runner`.
- **2025 (Gradle 9.0.0, exact GA date not independently pinned in this pass — cross-check before quoting to the day):** Java 17+ daemon floor, Kotlin 2.2/K2 embedded, Groovy 4.0, JSpecify-annotated API, strict SemVer, Configuration Cache preferred-not-forced. Invalidates: Gradle-on-Java-8 assumptions, JSR-305 usage against Gradle's own API.
- **2025-11-20 (Spring Boot 4.0 / Spring Framework 7.0):** Jakarta EE 11 baseline, Java 17 floor confirmed, JSpecify migration completed. Invalidates: assuming Java 21 is the practical floor across the ecosystem; assuming Spring's own `@Nullable` is still the annotation to reach for.
- **2025-11-25 (Shai-Hulud 2.0 reaches Central via `mvnpm`):** Invalidates: treating Maven Central as isolated from npm-ecosystem supply-chain attacks.
- **Surefire 3.6.0 (date not independently pinned this pass):** single JUnit-Platform provider, JUnit 4 <4.12 unsupported. Invalidates: `surefire-junit47`-based configs.
- **2026-01-20 (Bazel 9.0 LTS):** WORKSPACE removed, Bzlmod-only, `--incompatible_autoload_externally` empty by default. Invalidates: WORKSPACE-based Bazel Java/Kotlin build docs; implicit-autoload `BUILD` files.
- **2026-03-17 (JDK 26):** Applet API removed; "final mean final" prepared. Invalidates: any lingering Applet-API reference; forward-signals reflection-breaking-final changes to watch, not yet enforce.
- **Dokka 2.2.0 (date not independently pinned this pass):** K2 analysis goes stable/default. Invalidates: treating Dokka's K2 support as merely experimental.
- **Kotlin 2.4.0 (2026-06 per JetBrains blog):** K1 (`-language-version 1.9`) rejected outright. Invalidates: any "fall back to K1" contingency advice once a project's Kotlin floor reaches 2.4.
- **Gradle 9.7.0 (2026, exact month not independently pinned):** Isolated Projects promoted experimental→incubating. Invalidates: "Isolated Projects is purely experimental, don't touch it" as the 2026 default answer.

## Contested

- **Maven 4.0.0 GA status.** Multiple searches in this pass found only release candidates (`4.0.0-rc-4` through `-rc-6`); the frame's hypothesis of "Maven 4.0 GA" is unconfirmed. Trend: clearly heading to GA (RC line is far advanced, a GA checklist page exists), but this scout could not verify a shipped GA build or date. **Recommendation: hedge as RC in the topic map and re-check at map time with a direct fetch of `maven.apache.org/docs/history.html` or a Central-repository query for `org.apache.maven:maven-core:4.0.0`.**
- **`rules_jvm_external` vs. a "rules_jvm" merger.** Search surfaced a distinctly-named `bazel-contrib/rules_jvm` repository alongside the long-standing `rules_jvm_external`, but no primary source in this pass confirmed a merge, rename, or deprecation relationship between them. Trend: unclear — could be a new incubating project, a rename in progress, or an unrelated repo. **Needs a direct README fetch of both repos before either the frame or the topic map treats them as the same thing.**
- **Whether Gradle Configuration Cache is "on by default."** The frame's era hypothesis says "on by default"; the primary release notes this pass fetched say "preferred, with automatic graceful fallback" — a meaningfully weaker claim (opt-out-able, not force-on). Trend: moving toward mandatory, not there yet as of 9.7.x.
- **Whether Isolated Projects is production-ready.** Community blog posts (not fetched directly in this pass) sometimes describe it as usable now; the official 9.7.0 notes place it only at "incubating" (one rung above experimental, still pre-stable). Treat official wording as authoritative for a rule's verification bar.
- **Checkstyle's exact 10.x→14.x version/feature mapping.** This pass's WebFetch of checkstyle.org returned a jump straight to "13.x/14.x" without resolving what changed at 10, 11, or 12 specifically — the frame's ask for "10.x→11/12" coverage is not fully answered here and needs a direct changelog read at map time.
- **Whether kapt is merely "deprecated" or formally scheduled for removal.** Sources this pass found describe kapt as "maintenance mode" and note deprecation "may" happen in 2026, but no JEP/KEEP-style formal removal announcement was found — treat "kapt is being removed" as directional, not yet a dated commitment.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [openjdk.org/projects/jdk/21/](https://openjdk.org/projects/jdk/21/) | Official JDK 21 project page | 2023-09 (LTS) | Baseline LTS for the "17 vs 21 vs 25 floor" question |
| [openjdk.org/projects/jdk/25/](https://openjdk.org/projects/jdk/25/) | Official JDK 25 project page | 2025-09-16 (LTS) | Confirms the frame's current-LTS hypothesis with a full JEP list |
| [openjdk.org/projects/jdk/26/](https://openjdk.org/projects/jdk/26/) | Official JDK 26 project page | 2026-03-17 | Confirms the frame's "26 shipped March 2026" hypothesis |
| [openjdk.org/projects/jdk/27/](https://openjdk.org/projects/jdk/27/) | Official JDK 27 project page | RC as of 2026-09, GA 2026-09-15 | Confirms the frame's JDK 27 schedule hypothesis exactly |
| [openjdk.org/jeps/483](https://openjdk.org/jeps/483) | JEP text, AOT cache | Delivered JDK 24 | Corrects the frame's implicit JDK-25 dating of this feature |
| [openjdk.org/jeps/491](https://openjdk.org/jeps/491) | JEP text, virtual-thread pinning fix | Delivered JDK 24 | Same correction; also a P0 candidate topic on its own |
| [openjdk.org/jeps/493](https://openjdk.org/jeps/493) | JEP text, jlink without JMODs | Delivered JDK 24 | Same correction; feeds the jlink/jpackage distribution topic |
| [kotlinlang.org/docs/whatsnew23.html](https://kotlinlang.org/docs/whatsnew23.html) | Official Kotlin 2.3 release notes | 2025-12 | Primary source for the K1-still-usable-here dating |
| [blog.jetbrains.com/kotlin/2026/06/kotlin-2-4-0-released](https://blog.jetbrains.com/kotlin/2026/06/kotlin-2-4-0-released/) | JetBrains official blog, Kotlin 2.4.0 | 2026-06 | Primary source for K1's actual removal |
| [docs.gradle.org/9.0.0/release-notes.html](https://docs.gradle.org/9.0.0/release-notes.html) | Official Gradle 9.0.0 release notes | 2025 | Primary source for the whole Gradle-9 floor-raise cluster |
| [docs.gradle.org/9.7.0/release-notes.html](https://docs.gradle.org/9.7.0/release-notes.html) | Official Gradle 9.7.0 release notes | 2026 | Primary source for Isolated Projects' incubating status |
| [docs.gradle.org/current/javadoc/deprecated-list.html](https://docs.gradle.org/current/javadoc/deprecated-list.html) | Official Gradle API deprecated-list javadoc | live/current | Primary source for the Gradle-10-targeted removals |
| [blog.gradle.org/the-company-formerly-known-as-gradle](https://blog.gradle.org/the-company-formerly-known-as-gradle) | Official Gradle/Develocity blog | 2025-06-30 | Primary source disambiguating the corporate rename from the tool |
| [docs.junit.org/6.0.0/release-notes.html](https://docs.junit.org/6.0.0/release-notes.html) | Official JUnit 6.0.0 release notes | 2025-09-30 | Primary source for the whole JUnit-6 cluster |
| [central.sonatype.org/pages/ossrh-eol/](https://central.sonatype.org/pages/ossrh-eol/) | Official Sonatype/Central docs | 2025-06-30 | Primary source for the OSSRH sunset date and migration mechanics |
| [maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html) | Official Surefire release notes | 3.6.0 | Primary source for the unified JUnit-Platform-provider shift |
| [pmd.github.io/2024/03/22/PMD-7-is-here/](https://pmd.github.io/2024/03/22/PMD-7-is-here/) | Official PMD project blog | 2024-03-22 | Primary source for the PMD 7 rule-rename list |
| [github.com/Kotlin/dokka/releases/tag/v2.0.0](https://github.com/Kotlin/dokka/releases/tag/v2.0.0) | Official Dokka GitHub release | 2024-12 | Primary source for the Dokka-2 plugin rearchitecture |
| [github.com/google/ksp/blob/main/README.md](https://github.com/google/ksp/blob/main/README.md) | Official KSP repository README | live/current | Primary source for KSP2-default and KSP1-incompatibility dating |
| [kotlinlang.org/docs/gradle-binary-compatibility-validation.html](https://kotlinlang.org/docs/gradle-binary-compatibility-validation.html) | Official Kotlin docs | live/current | Primary source for BCV's move into the Kotlin Gradle plugin |
| [blog.bazel.build/2026/01/20/bazel-9.html](https://blog.bazel.build/2026/01/20/bazel-9.html) | Official Bazel blog | 2026-01-20 | Primary source for Bazel 9 LTS's WORKSPACE removal and autoload flag |
| [github.com/GradleUp/shadow](https://github.com/GradleUp/shadow) | Official Shadow plugin repository | live/current | Primary source for the plugin-ID migration and 9.0.0 rewrite |
| [github.com/Kotlin/kotlinx.coroutines/releases/tag/1.10.0](https://github.com/Kotlin/kotlinx.coroutines/releases/tag/1.10.0) | Official coroutines GitHub release | 1.10.0 | Primary source for the debug-package reorg breaking change |
| [github.com/uber/NullAway/wiki/JSpecify-Support](https://github.com/uber/NullAway/wiki/JSpecify-Support) | Official NullAway wiki | live/current | Primary source for JSpecify-mode adoption in NullAway |
| [kotest.io/docs/next/release6/](https://kotest.io/docs/next/release6/) | Official Kotest docs | 6.0 | Primary source for Kotest 6's floor and extension-versioning change |
| [spotbugs.readthedocs.io/en/stable/introduction.html](https://spotbugs.readthedocs.io/en/stable/introduction.html) | Official SpotBugs docs | 4.9.7 | Primary source for the ASM/BCEL-driven Java-25 support story |
| [checkstyle.org](https://checkstyle.org/) | Official Checkstyle site | live/current | Primary source, though version-to-feature mapping needs a follow-up read |
| [central.sonatype.org/publish/publish-portal-guide/](https://central.sonatype.org/publish/publish-portal-guide/) | Official Central Portal publishing guide | live/current | Primary source for namespace verification as a hard precondition |
| [www.sonatype.com/blog/malware-removed-from-maven-central](https://www.sonatype.com/blog/malware-removed-from-maven-central) | Official Sonatype security blog | 2025 | Primary vendor source for the Jenkins/Maven plugin-squat incident |
| [www.aikido.dev/blog/maven-central-jackson-typosquatting-malware](https://www.aikido.dev/blog/maven-central-jackson-typosquatting-malware) | Security-research blog (secondary) | 2025 | Detailed, dated account of the Jackson typosquat and its C2 domain |
| [www.baeldung.com/spring-boot-4-spring-framework-7](https://www.baeldung.com/spring-boot-4-spring-framework-7) | Practitioner deep-dive (secondary) | 2025-11 | Consolidated, well-sourced summary of the Spring Boot 4 baseline shift |
| [maven.apache.org/docs/4.0.0-rc-6/release-notes.html](https://maven.apache.org/docs/4.0.0-rc-6/release-notes.html) | Official Maven release notes | rc-6 | Primary source anchoring the "Maven 4 not yet confirmed GA" contested item |
| [github.com/bazel-contrib/rules_jvm_external/releases](https://github.com/bazel-contrib/rules_jvm_external/releases) | Official GitHub releases page | 6.10, 2026-02-04 | Primary source for the current version; anchors the rules_jvm contested item |
| [github.com/spotbugs/spotbugs/issues/3564](https://github.com/spotbugs/spotbugs/issues/3564) | Official SpotBugs issue tracker | live/current | Confirms the exact ASM/BCEL dependency chain gating Java-25 support |


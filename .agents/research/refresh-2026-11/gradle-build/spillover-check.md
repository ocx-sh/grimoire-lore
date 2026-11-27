---
title: Spillover check for gradle-build (10 items from java-quality, kotlin-quality, maven-build)
target: gradle-build
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/google/error-prone/releases (v2.43.0 and 2.46.0 notes)
  - https://checkstyle.org/releasenotes.html and the GitHub release checkstyle-13.0.0, plus pom.xml at tag checkstyle-13.0.0
  - https://github.com/spotbugs/spotbugs-gradle-plugin (README at tag 6.5.15, releases page)
  - https://plugins.gradle.org/m2/me/champeau/gradle/japicmp/me.champeau.gradle.japicmp.gradle.plugin/maven-metadata.xml
  - https://github.com/palantir/gradle-revapi/releases
  - https://github.com/advisories/GHSA-rr8v-fxxf-c986
  - https://github.com/GradleUp/shadow/releases
  - https://inside.java/2026/11/25/quality-heads-up/
  - https://github.com/advisories/GHSA-r937-wjx7-w2jp
  - https://kotlinlang.org/docs/ksp-overview.html and https://github.com/google/ksp/releases
  - https://github.com/JetBrains/kotlin/releases/tag/v2.5.0-Beta2
  - https://central.sonatype.org/register/namespace/
  - https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/
  - https://docs.gradle.org/current/userguide/configuration_cache.html
  - https://blog.gradle.org/gradle-is-going-agentic
---

# Spillover check: gradle-build

Target files: `rules/gradle-build.md` and `skills/gradle-build-reference/*.md`. Paths below are relative to `skills/gradle-build-reference/` unless they start with `rules/`.

Summary: one item makes the target false today (item 8, `publishing.md` GRADLE-PUB-01). Items 5a, 6 and 9 are real gaps worth one sentence each. The rest are optional or belong to the sibling sets.

## 1. Error Prone 2.43.0+ needs JDK 21; 2.46.0+ needs `-XDaddTypeAnnotationsToSymbol=true` on JDK 21 (from java-quality)

Verdict: confirmed by primary source.
Source: Error Prone GitHub release notes. v2.43.0 says "The minimum supported JDK version to run Error Prone is now JDK 21" (issue 4867), published 2025-10-22 (GitHub API). v2.46.0 says "The javac flag `-XDaddTypeAnnotationsToSymbol=true` is now required for Error Prone invocations on JDK 21"; the page shows the day and month only (08 Jan), the year was not stated.
Affected target text: the target says nothing about Error Prone. Closest row is `toolchains-and-compilation.md` GRADLE-TOOL-01: "Pin the compiling JDK with `java { toolchain { languageVersion = JavaLanguageVersion.of(N) } }`, in a convention plugin that reaches every JVM module rather than per module."
Smallest change: none required, because Error Prone is owned by `java-quality`. If the author wants the cross-reference, append to GRADLE-TOOL-01's rationale: "A convention plugin that applies Error Prone needs a JDK 21 or newer toolchain from Error Prone 2.43.0 (JAVA-PLAT-02 in `java-quality` owns the detail)."

## 2. Checkstyle 13.0.0+ targets Java 21, so a Checkstyle task on JDK 17 fails (from java-quality)

Verdict: confirmed by primary source.
Source: Checkstyle GitHub release checkstyle-13.0.0 (published 2026-01-04): "Breaking backward compatibility: #17430 - Use jdk21 as minimial required". `pom.xml` at that tag sets `<java.version>21</java.version>`. The same value is in checkstyle-14.4.0.
Affected target text: the target says nothing about Checkstyle (no match in the rule or any depth file).
Smallest change: none required, same ownership as item 1. Optional: the same GRADLE-TOOL-01 sentence can name Checkstyle 13.0.0 beside Error Prone.

## 3. SpotBugs Gradle plugin README mapping table is stale at 6.5.6; 6.5.15 defaults to SpotBugs 4.10.5 (from java-quality)

Verdict: confirmed by primary source for the stale table and for 6.5.15 being current; the default 4.10.5 is an inference.
Source: spotbugs-gradle-plugin README at tag 6.5.15: first table row is "6.5.6 | 4.10.2". Releases page: 6.5.15 published 2026-11-26 (its only entry is a tag-naming fix); 6.5.13 (2026-10-12) "update dependency com.github.spotbugs:spotbugs to v4.10.5". No later release changes the SpotBugs version, so 6.5.15 defaults to 4.10.5. No release note states that sentence for 6.5.15 directly.
Affected target text: the target says nothing about SpotBugs.
Smallest change: none.

## 4. japicmp plugin 0.4.6 does not name its bundled japicmp; palantir/gradle-revapi 2.5.0 is the maintained revapi plugin (from java-quality)

Verdict: confirmed by primary source.
Source: Plugin Portal metadata: `me.champeau.gradle.japicmp` latest 0.4.6, last updated 2025-02-14. gradle-revapi releases page: 2.5.0 is "Latest", released 27 Oct (year not shown on the page; the java-quality artifact records 2026-10-27, and the GitHub API was not queried for it).
Affected target text: the target says nothing about japicmp or revapi. `publishing.md` line 18 defers the whole gate: "binary-compatibility gate that must pass before an upload is JAVA-API in the".
Smallest change: none; the target already defers to `java-quality`.

## 5a. Gradle Shadow zip-slip, GHSA-rr8v-fxxf-c986 (from java-quality)

Verdict: confirmed by primary source, with a date correction. The item says 2026-11-09; the advisory page gives GitHub publication 2026-07-16, NVD 2026-11-06, GitHub Advisory Database listing 2026-11-09. Affected: `com.gradleup.shadow` below 9.6.0; patched 9.6.0 (release 2026-07-16; 9.6.1 followed 2026-07-22). CVE-2026-75598, CVSS 8.1 High, `ShadowCopyAction` does not sanitize ZIP entry names.
Source: https://github.com/advisories/GHSA-rr8v-fxxf-c986 and https://github.com/GradleUp/shadow/releases.
Affected target text, `distribution.md` GRADLE-DIST-03: "Where a module does apply `com.gradleup.shadow`, audit the built jar for third-party packages that landed un-relocated." The target never states a Shadow version floor.
Smallest change: append to GRADLE-DIST-03, or add as a short bullet under the shading rules: "Use Shadow 9.6.0 or newer: earlier releases copy a `../` ZIP entry from a dependency into the fat jar unchanged (GHSA-rr8v-fxxf-c986, CVSS 8.1, verified 2026-11-27)."

## 5b. JDK 28 `jlink --security-properties` (from java-quality)

Verdict: confirmed by first-party source, not a JDK specification. The inside.java post (Oracle Java team blog) dated 2026-11-25 says "As of JDK 28, the `jlink` tool has a new `security-properties` plugin to configure security properties", used as `--security-properties=filename`. It was not checked against the JDK 28 `jlink` man page.
Source: https://inside.java/2026/11/25/quality-heads-up/
Affected target text: `distribution.md` GRADLE-DIST-18, "Do not wire `jlink` into a build whose module graph contains an automatic module." The target says nothing on security properties. JDK 28 is also not yet GA in the target's own timeline.
Smallest change: none required. Optional one clause in the jlink pitfall (item 10 under "What Agents Get Wrong"): "From JDK 28, `jlink --security-properties=<file>` sets the image's `java.security` entries."

## 6. KGP below 2.4.20 deserializes build-cache metadata unsafely, GHSA-r937-wjx7-w2jp, CVSS 6.7 (from kotlin-quality)

Verdict: confirmed by primary source.
Source: https://github.com/advisories/GHSA-r937-wjx7-w2jp. CVE-2026-53914, published 2026-06-26, affects `kotlin-gradle-plugin` before 2.4.20 (patched in 2.4.20-Beta1), CVSS 6.7 Moderate, CWE-502.
Affected target text, `structure-and-conventions.md` GRADLE-STRUCT-12 and its section lead-in (line 33): "an `org.gradle.*` key nobody reads, a cache push from an untrusted". The target says nothing about the Kotlin plugin version as a cache-trust issue.
Smallest change: add one sentence to the GRADLE-STRUCT-12 rationale: "A build-cache entry is also an attack surface on the reading side: Kotlin Gradle plugin releases before 2.4.20 deserialize cache metadata unsafely (GHSA-r937-wjx7-w2jp, CVSS 6.7, verified 2026-11-27), so `KT-COMP-14` in `kotlin-quality` owns the 2.4.20 floor." The KGP floor rule itself stays in `kotlin-quality`.

## 7. KSP 2.3.12+ documents AGP 8.13.0, Gradle 8.13, JDK 17 as minimums; Kotlin 2.5.0-Beta2 drops non-BTA compiler execution mode, KT-85434 (from kotlin-quality)

Verdict: confirmed by primary source, with two caveats. The KSP overview page names KSP 2.3.12 as latest (the GitHub release page shows 2.3.14, published 2026-11-13 per the kotlin-quality artifact; 2.3.12 itself is 2026-09-09), with KGP 2.3.20 to 2.4.x, AGP 8.13.0 or later, Gradle 8.13 or later, JDK 17 or later. KT-85434 is listed in the v2.5.0-Beta2 release notes (published 2026-10-21): "Gradle: drop support for non-BTA JVM compiler execution mode". YouTrack returned no content, so the issue's own state is unread; the release note is the source.
Affected target text: `toolchains-and-compilation.md` line 39: "Gradle 9.0.0 (2025-07-31) raised the minimum to JVM 17." The target says nothing about KSP or the Kotlin compiler execution mode.
Smallest change: none required for the target to be true. These are Kotlin-side rows that `kotlin-quality` owns. KT-85434 is a Beta note, not a release.

## 8. Central namespace proofs: DNS TXT, temporary public repository, automatic `io.github.<user>` (from maven-build)

Verdict: confirmed by primary source. The target is wrong today.
Source: https://central.sonatype.org/register/namespace/ (read 2026-11-27; the page states no date). It names DNS TXT ("adding a DNS TXT record with a value set to the Verification Key"), a temporary public repository on a code-hosting service ("create a temporary, public repository with a name having the value set to the Verification Key") and automatic verification ("Sonatype can, in most cases, automatically verify and provision publishing access to a namespace that looks like ...").
Affected target text, `publishing.md` line 47, GRADLE-PUB-01: "Prove a reverse-domain namespace with a DNS TXT record, or an `io.github.<user>` namespace with GitHub repository ownership." Rationale: "There is no third path and no way to upload before verification completes." Verification: "The runbook names which of the two methods was used and where the Portal token lives."
Smallest change: replace the rule sentence with "Prove a reverse-domain namespace with a DNS TXT record carrying the Portal's Verification Key, or a code-hosting namespace (GitHub, GitLab, Gitee or Bitbucket, such as `io.github.<user>`) with a temporary public repository named with that key; an account that signs up through GitHub may get `io.github.<user>` verified automatically." Delete "There is no third path and no way to upload" down to "There is no way to upload", and change "which of the two methods" to "which method". The wording is already drafted in the maven-build decision file (MVN-PUB-04).

## 9. Sonatype publisher tiers and limits in effect from 2026-10-01 (from maven-build)

Verdict: confirmed by primary source for the effective date and the Publisher Pro conditions; the 30-day grace and the rejection of over-limit releases could not be confirmed on the news post. The post (published 2026-09-08) says "From October 1, 2026, Maven Central Publisher Pro is required if either of the following applies" (volume above free thresholds, or any commercial-nature artifact) and "Rate limiting begins on October 1, 2026." It does not use the word grace or say what is rejected. The 30-day grace comes from a community.sonatype.com post cited in the maven-build artifact; that is a secondary source and was not fetched here.
Source: https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/
OIDC: the Portal pages were not re-read for OIDC in this check; the maven-build artifact states none was found on 2026-11-27. The target already says so, in `publishing.md` "What Agents Get Wrong" 7: "the first three still described none on 2026-11-27." The target is already correct on OIDC.
Affected target text: `publishing.md` says nothing on tiers or limits (grep for tier, rate limit, Publisher Pro, commercial finds nothing).
Smallest change: add one sentence to GRADLE-PUB-01's rationale or to the release-job pitfalls: "From 2026-10-01 Central enforces publisher tiers and monthly limits, and a commercial-nature artifact needs Publisher Pro regardless of volume; a rejection that cites a limit is not a POM defect (Sonatype news, 2026-09-08)." Leave out the 30-day grace unless a Sonatype page is read for it.

## 10. Configuration cache preferred since Gradle 9.0.0, on by default in Gradle 10; 9.9.x current (from maven-build)

Verdict: target already correct. The Gradle 9.9.2 user manual does say "Since Gradle 9.0.0, the Configuration Cache is the preferred mode of execution" and "This feature will be enabled by default in Gradle 10." The newer source is the Gradle blog post of 2026-08-19: "The plan is now to make Configuration Cache the default in Gradle 11 rather than Gradle 10, not to drop it." So the item's "Gradle 10" is the stale half.
Source: https://docs.gradle.org/current/userguide/configuration_cache.html (version 9.9.2) and https://blog.gradle.org/gradle-is-going-agentic (2026-08-19).
Affected target text, `caching-and-correctness.md` lines 29 to 33: "The configuration cache is not on by default in Gradle 9. 9.x is preferred with automatic graceful fallback, and the default-on target slipped from Gradle 10 to Gradle 11 (Gradle blog, [2026-08-19](https://blog.gradle.org/gradle-is-going-agentic), re-read 2026-11-27). The 9.9.2 user manual still says Gradle 10; the blog is the newer source." The index (`rules/gradle-build.md`) says "Gradle 9.x, current 9.9.2, verified 2026-11-27" and "Gradle 9 disables it and carries on rather than failing", consistent with this.
Smallest change: none. Do not apply the item's "Gradle 10" wording.

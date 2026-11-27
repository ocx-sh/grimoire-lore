---
title: "java-quality spillover check, items from sibling pipelines"
target: java-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://kotlinlang.org/docs/whatsnew-eap.html
  - https://www.jacoco.org/jacoco/trunk/doc/changes.html
  - https://docs.gradle.org/9.8.0/release-notes.html
  - https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html
  - https://github.com/advisories/GHSA-q233-g92q-qxp6
  - https://github.com/advisories/GHSA-4v53-57pg-c464
  - https://github.com/advisories/GHSA-6cx8-rjf8-pr8g
  - https://github.com/advisories/GHSA-xxph-c9ww-hj94
---

# java-quality spillover check

Targets: `rules/java-quality.md` and `skills/java-quality-reference/`. Five items. The two cross-pair evidence trails are `kotlin-quality/kover-test-frameworks-delta.md`, `kotlin-quality/kotlin-compiler-kgp-delta.md`, `gradle-build/jdk27-toolchains-and-wrapper.md`, `maven-build.md` and `java-quality.md` (section 8) under `.agents/research/refresh-2026-11/`.

## 1. Kotlin 2.5.0-RC2 makes a compiler JDK below 17 an error (from kotlin-quality, JAVA-PLAT)

Verdict: confirmed by primary source, as a release-candidate fact only.

Source: https://kotlinlang.org/docs/whatsnew-eap.html, "What's new in Kotlin 2.5.0-RC2", dated 25 November 2026. It says the RC "introduces an error as the next step to raising the minimum JDK version required to run the Kotlin compiler from JDK 8 to JDK 17" and that "Opt out of the error with the `-Xallow-pre-17-runtime-jdk` compiler option. This option will be removed in Kotlin 2.5.20 or 2.6.0 when JDK 17 becomes mandatory." The kotlin-quality pair holds this as watch-only until 2.5.0 GA.

Affected text: `skills/java-quality-reference/platform-and-versions.md`, JAVA-PLAT-02: "floor **17**, toolchain the current LTS (**25** as of 2026-11-27 ... CI matrix **17 / 21 / 25**". The target already holds a floor of 17 and says nothing about the Kotlin compiler floor. The item concerns the JDK that runs the Kotlin compiler, not the JDK a library targets, so the row stays true.

Smallest change: none required. Optional: after Kotlin 2.5.0 GA, add one clause to the JAVA-PLAT-02 rationale that a Kotlin 2.5 compiler needs JDK 17 to run, which the 17 floor and the 17 CI leg already satisfy.

## 2. JaCoCo 0.8.16 and JUnit 6.0.3 on the JetBrains page (from kotlin-quality, JAVA-TEST)

Verdict: JaCoCo half confirmed by primary source. JUnit half: the JetBrains page is the only evidence and is a vendor example page, not a JUnit release record, so treat it as only a secondary source for any claim about JUnit releases.

Source: https://www.jacoco.org/jacoco/trunk/doc/changes.html, "Release 0.8.16 (2026/10/24)": "JaCoCo now officially supports Java 27" and "Experimental support for Java 28 class files". The JetBrains JUnit page (https://kotlinlang.org/docs/jvm-test-using-junit.html, end-dated 13 October 2026 per the kotlin-quality delta) was not refetched. The decision file for java-quality already cites https://docs.junit.org/current/release-notes/ for JUnit 6.1.3 and 6.2.0-M1, which supersedes 6.0.3.

Affected text: `skills/java-quality-reference/testing.md`, JAVA-TEST-01: "State the JUnit floor as **5, with 6 as the dated target**: 6.0.0 shipped 2025-09-30 with a Java 17 and Kotlin 2.1 baseline". JAVA-TEST-08 names JaCoCo only by task and goal and carries no JaCoCo version number or Java-class-file-support claim. Neither JaCoCo 0.8.16 nor JUnit 6.0.3 appears in the target.

Smallest change: none. The target states neither fact. If a JaCoCo Java 27 claim is ever added, cite the JaCoCo changes page for 0.8.16, 2026-10-24.

## 3. Gradle 9.8.0 supports JDK 27, PMD does not yet (from gradle-build, JAVA-PLAT)

Verdict: confirmed by primary source.

Source: https://docs.gradle.org/9.8.0/release-notes.html (release date not stated in the fetched excerpt). It says "In this release, Java 27 is supported for both the Gradle daemon and Java toolchains." and "Some third-party tools (for example, PMD) do not yet support Java 27."

Affected text: `skills/java-quality-reference/platform-and-versions.md`, JAVA-PLAT-02: "toolchain the current LTS (**25** as of 2026-11-27; JDK 27 is not an LTS and the next is 29, due September 2027)". The target pins toolchain 25, so the PMD limit does not bite. `skills/java-quality-reference/lint-gate.md` JAVA-LINT-09 already says "Do not add PMD to a new JVM project's gate." The target is silent on Gradle 9.8.0.

Smallest change: none required, because the pinned toolchain stays at 25 and PMD is already out. Optional: one sentence in JAVA-PLAT-02 that a toolchain above 25 needs Gradle 9.8.0 or later and that PMD 7.30.0 does not yet parse Java 27.

## 4. JDK 27 went GA on 2026-09-15 (from maven-build, covering java-quality and kotlin-quality)

Verdict: could not confirm from a primary source in this run, and the target is already correct.

The primary page https://openjdk.org/projects/jdk/27/ returned HTTP 403, and jdk.java.net and oracle.com checks were rate-limited. Indirect primary evidence: Gradle 9.8.0 notes and the JaCoCo 0.8.16 page both say Java 27 is supported, and the java-quality delta `openjdk-27-ga-28-concurrency.md` records the project page as saying "General Availability on 15 September 2026" (an earlier fetch by that pipeline, not re-verified here).

Affected text: `skills/java-quality-reference/concurrency.md` line 40: "JDK 27 reached GA 2026-09-15 with JEP 533's members as". A search of `rules/java-quality.md` and the whole reference directory found no "JDK 27 not yet GA" wording. `platform-and-versions.md` line 150 says "still defaults to `warn` in JDK 27 and the 28 early-access build", which is consistent with GA.

Smallest change: none. The java-quality pair has no stale wording. The kotlin-quality and maven-build pairs were not part of this check.

## 5. Verifier finding: decision file section 8 lacks rows for JAVA-API-03 and JAVA-SEC-11 (from java-quality verifier)

Verdict: confirmed by primary source for every claim. The finding itself is also correct: `.agents/research/refresh-2026-11/java-quality.md` section 8 has no JLS row and no GHSA URLs (its only security-adjacent row is "Oracle security guidance, JDK 27 GA window"). One date in the target is slightly wrong.

JAVA-API-03. Source: https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html. Headings: "13.5.3. Superinterfaces", "13.5.4. Interface Members". §13.5.4 says "Adding an `abstract`, `private`, or `static` method to an interface does not break compatibility with pre-existing binaries." Target `skills/java-quality-reference/api-and-evolution.md` line 75 reads "Linkage survives (JLS SE 25 §13.5.4, Interface Members)". Already correct. Fix needed only in the decision file: add the row "JAVA-API-03 section number | https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html".

JAVA-SEC-11 advisories (target `skills/java-quality-reference/security-and-untrusted-input.md` line 84):
- snappy-java, https://github.com/advisories/GHSA-q233-g92q-qxp6: published 2026-10-03 (GitHub), into the Advisory Database 2026-10-27, affects 1.1.10.8 and earlier, patched 1.1.10.9, buffer from declared uncompressed length up to 2 GB. Matches "fixed 1.1.10.9".
- lz4-java, https://github.com/advisories/GHSA-4v53-57pg-c464 (`LZ4BlockInputStream`, header length) and https://github.com/advisories/GHSA-6cx8-rjf8-pr8g (`LZ4DecompressorWithLength`, 4-byte header, 1 GiB): both published 2026-08-06, into the Advisory Database 2026-10-07, `at.yawk.lz4:lz4-java` patched in 1.11.2. Matches "(1.11.2)".
- Guava, https://github.com/advisories/GHSA-xxph-c9ww-hj94: published 2026-09-29, Advisory Database 2026-10-27, affects up to 33.7.1, patched 33.7.2, `CompactHashMap`, `CompactHashSet` and `MapMakerInternalMap` `readObject`. Matches "(33.7.2)".

Date error in the target: "Advisories published between 2026-09-17 and 2026-11-19 share the one shape". Both lz4-java advisories were published 2026-08-06, before 2026-09-17. They entered the GitHub Advisory Database on 2026-10-07, inside the window. The async-http-client, HAPI FHIR and PGPainless advisories were not checked here and are not in the verifier's list.

Smallest change to the target: in JAVA-SEC-11 replace "Advisories published between 2026-09-17 and 2026-11-19" with "Advisories listed in the GitHub Advisory Database between 2026-09-17 and 2026-11-19".

Smallest change to the decision file: add two rows to section 8, one for the JLS URL above (artifact: api-and-evolution.md edit) and one listing the four GHSA URLs above (artifact: the JAVA-SEC-11 section).

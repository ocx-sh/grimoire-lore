---
title: ABI gate and Spring floor delta, 2026-09-12 to 2026-11-27
pair: java-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 9
---

# ABI gate and Spring floor delta

This is a delta against `jvm-language-api.md` and `jvm-platform-and-toolchains.md` (both dated 2026-09-12). Every outcome below is one of "unchanged", "changed" or "could not determine". Facts came from the GitHub API (via `gh`), the Gradle plugin portal metadata, docs.spring.io, the spring.io blog, the Spring Framework wiki and the Oracle JLS pages. Nothing is written from memory.

## 1. japicmp and its Gradle plugin

**Outcome: changed (versions), unchanged (the two classifications).**

- japicmp: latest release is 0.27.0, published 2026-11-04 (tag `japicmp-base-0.27.0`, https://github.com/siom79/japicmp/releases). In the window it shipped 0.26.3 (2026-10-03), 0.26.5 (2026-10-16) and 0.27.0. The 0.26.2 tag dated 2026-09-03 is before the window. Master is at 0.27.1-SNAPSHOT.
- 0.27.0 release note: japicmp "now detects added type bounds on generics, new super interfaces of interfaces, and changes to the native modifier on methods" (PR 534). This is new detection. It does not touch the two classifications at risk.
- Gradle plugin `me.champeau.gradle.japicmp`: latest published is 0.4.6 (maintainer metadata `lastUpdated` 20250214), https://plugins.gradle.org/m2/me/champeau/gradle/japicmp/me.champeau.gradle.japicmp.gradle.plugin/maven-metadata.xml. No release in the window. The repository melix/japicmp-gradle-plugin only gets dependency-bot commits (last 2026-07-19) and sits at 0.4.7-SNAPSHOT. Its CHANGELOG.txt does not name the japicmp version bundled; pin `japicmpVersion` explicitly if 0.27.0 detection is wanted.
- JAVA-API-03 (added interface method is binary-compatible): unchanged. Source `JApiCompatibilityChangeType.java` on master still defines `METHOD_ADDED_TO_INTERFACE(true, false, MINOR)`, binary-compatible true, source-compatible false.
- JAVA-API-04 (changed constant value is not failed): unchanged. The same enum on master has no field-constant-value change type (the FIELD_* entries are NOW_FINAL, NOW_STATIC, TYPE_CHANGED, REMOVED and similar). A changed constant value therefore still raises no compatibility change. Caveat: this was read from the enum, not from running 0.27.0 on a sample, so treat the classification claim as source-verified only.

## 2. Does revapi re-take the pin?

**Outcome: no, unchanged.**

- revapi/revapi: not archived. Last commit 2025-11-08 ("remove links to obsolete online presence of Revapi"). Zero commits since 2025-11-09 and zero GitHub releases, so nothing in the window. Tags are per module (for example `revapi-yaml_v0.4.1`).
- Gradle plugin: the maintained one is palantir/gradle-revapi (releases 2.3.0 on 2026-07-29, 2.4.0 on 2026-10-01, 2.5.0 on 2026-10-27; commits through 2026-11-27). The earlier open question (a maintained Gradle plugin) is therefore answered: a plugin exists and is actively released, but it is Palantir's, not the revapi project's. The old `revapi/revapi-gradle-plugin` repository returns 404.
- Adoption: could not determine. The 32-repository corpus was not re-measured in this delta, so "0 adopters as of 2026-09-12" stands as dated. A maintained plugin alone does not outweigh the measured-practice reason for the pin.
- Candidate rule change: none. Suggested wording tweak for api-and-evolution.md, only if the author wants it: add that palantir/gradle-revapi is the active revapi Gradle plugin as of 2026-11-27, with 2.5.0 the latest. Rationale: the re-taking note should point at the real alternative. Verification: `gh api repos/palantir/gradle-revapi/releases --jq '.[0].tag_name'`.

## 3. Spring Java floor

**Outcome: unchanged. No floor above 17 announced.**

- Spring Boot 4.2.0 was released 2026-11-19 (spring.io blog; Boot 4.1.3 and 4.0.10 on 2026-11-20). Its system-requirements page (https://docs.spring.io/spring-boot/system-requirements.html) says Java 17 minimum, compatible up to Java 27, Spring Framework 7.1.0 or above, Gradle 8.14+ or 9.x, Maven 3.6.3+.
- The Spring Framework versions wiki lists 7.0.x with a JDK 17-25+ baseline and 7.1.x due November 2026. It says nothing about Framework 8 or a Boot 5. The spring.io release feed through 2026-11-20 has no Boot 5 or Framework 8 post.
- JAVA-PLAT-02 text "Spring Boot 4 (2025-11-20) and JUnit 6 both hold their own floor at 17 as of 2026-09-12": the Spring half still holds as of 2026-11-27. The JUnit half is out of scope here. The trigger "when Spring Boot 4 moves" has not fired. Optional wording update: the supported Java range on Boot 4.2 now extends to 27 at the top. Not a floor change.

## 4. JLS section numbers

**Outcome: unchanged.** JLS SE 27 chapter 13 (https://docs.oracle.com/javase/specs/jls/se27/html/jls-13.html) has 13.4.9 "final Fields and static Constant Variables", 13.4.14 "Method and Constructor Formal Parameters", 13.4.15 "Method Result Type" and 13.5.3 "Superinterfaces", identical to SE 25.

Pre-existing observation, not a change: JAVA-API-03 cites 13.5.3 (Superinterfaces) for "linkage survives when an interface gains a method". The better-matching sections are 13.5.4 "Interface Members" or 13.5.7 "Interface Method Declarations". Candidate fix: cite 13.5.4. Verification: read the section titles above against the cited claim.

## 5. Nullness claims

**Outcome: Spring half unchanged; Gradle half could not determine.**

- "Spring Framework 7 and Boot 4 completed the move to JSpecify in November 2025": nothing in this window contradicts it. The Boot 4.2 release notes page was fetched only up to its first 100000 characters and says nothing on nullability in that portion.
- "Gradle 9 switching its own API annotations off JSR-305": Gradle's own API and release notes were not opened in this run. Could not determine.

## Sources

| URL | What | Date |
|---|---|---|
| https://github.com/siom79/japicmp/releases | japicmp releases, via `gh api repos/siom79/japicmp/releases` | 0.27.0 on 2026-11-04 |
| https://github.com/siom79/japicmp (JApiCompatibilityChangeType.java) | classification enum | master, 2026-11 |
| https://plugins.gradle.org/m2/me/champeau/gradle/japicmp/me.champeau.gradle.japicmp.gradle.plugin/maven-metadata.xml | plugin latest version | 0.4.6, 2025-02-14 |
| https://github.com/melix/japicmp-gradle-plugin | plugin repo, commits and CHANGELOG | 2026-07-19 |
| https://github.com/revapi/revapi | revapi repo, commits and tags | last commit 2025-11-08 |
| https://github.com/palantir/gradle-revapi | revapi Gradle plugin releases | 2.5.0 on 2026-10-27 |
| https://docs.spring.io/spring-boot/system-requirements.html | Boot 4.2.0 requirements | 2026-11 |
| https://spring.io/blog/category/releases | release feed | to 2026-11-20 |
| https://github.com/spring-projects/spring-framework/wiki/Spring-Framework-Versions | Framework JDK baselines | 2026-11 |
| https://docs.oracle.com/javase/specs/jls/se27/html/jls-13.html | JLS SE 27 chapter 13 | SE 27 |

---
title: Shadow and packaging shapes delta, 2026-09-12 to 2026-11-27
pair: gradle-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 13
---

# Shadow and packaging shapes delta

## Summary

- GradleUp Shadow has published no release after 9.6.1 (2026-07-22). Current line stays 9.6.1; Gradle floor 9.2.0 and Java floor 17 stay true for released versions.
- The unreleased CHANGELOG section (header date placeholder "2026-xx-xx") already queues a Gradle 9.4.0 floor. Do not write 9.4 as a fact until a release ships.
- Issue GradleUp/shadow#1489 is now CLOSED as not planned (2026-10-25). GRADLE-DIST-09 must change.
- Issue #324 was closed as not planned on 2025-01-24, before the window; the manifest Class-Path coupling is documented intended behaviour. The open question can be closed.
- Spring Boot's current stable line is 4.2.0 (2026-11-19, year inferred, see Sources); the jarmode extract command and layer order are unchanged in wording.
- Maven Shade is still 3.6.2 and `createDependencyReducedPom` still defaults to `true`.

## Findings

### 1. Shadow version, floors, plugin id (GRADLE-DIST-12, GRADLE-PLUG-21, rules/gradle-build.md)

Unchanged. The [GitHub releases page](https://github.com/GradleUp/shadow/releases) lists 9.6.1 (22 Jul) as newest, then 9.6.0, 9.5.1, 9.5.0 (06 Jul), 9.4.3. The [changes page](https://gradleup.com/shadow/changes/) states latest 9.6.1 (2026-07-22), Gradle minimum 9.2.0 (raised in 9.5.0, 2026-07-06), Java minimum 17 (raised in 9.2.1, 2025-09-24). The [CHANGELOG](https://raw.githubusercontent.com/GradleUp/shadow/main/CHANGELOG.md) quotes "Bump min Gradle requirement to 9.2.0" (9.5.0), "Bump min Gradle requirement to 9.0.0" (9.3.0), "Bump min Java requirement to 17" (9.2.1). The existing wording ("9.3.0 requires Gradle 9.0 and Java 17") is consistent, with the nuance that Java 17 dates from 9.2.1. The plugin id `com.gradleup.shadow` is unchanged. Only the "verified" date needs bumping to 2026-11-27.

Pending (unreleased, not a rule change): the CHANGELOG "Unreleased" section, header `2026-xx-xx`, says "Bump min Gradle requirement to 9.4.0", default R8 9.1.31 to 9.5.33, a shadowed sources JAR by default when `java.withSourcesJar()` is set (opt out `generateSourcesJar = false`), a new `ProGuardFilesResourceTransformer`, `R8Spec.configurationFile/useDefaultRules/classpath`, and deprecation of `ShadowJar.minimizeJar` in favour of `minimize()`. The rendered changes page showed no Unreleased section, so the two sources disagree on presentation; the raw CHANGELOG is authoritative. A watch-item for the next refresh.

### 2. GRADLE-DIST-06 and -07

Unchanged. The [merging page](https://gradleup.com/shadow/configuration/merging/) says `ShadowJar` recognizes `EXCLUDE` as the default and the first file wins. The page does not mention multi-release JARs, so the 9.0.0 (2025-08-07) MRJAR claim could not be re-confirmed from this page; the CHANGELOG fetch of the window showed no change to it. Verdict: unchanged (the 9.0.0 date was not re-read in this delta).

### 3. GRADLE-DIST-09 and agent-mistake item 6: CHANGED

Old: "GradleUp/shadow#1489 is still open, verified 2026-09-12." New: [#1489](https://github.com/GradleUp/shadow/issues/1489) "Support Spring shading and relocation" was closed as not planned on 2026-10-25 by maintainer Goooler. His stated reasons: Spring resource formats keep changing, and relocation also touches string class references, reflection and AOT output. His suggested approach is `mergeServiceFiles("META-INF/spring")` for `.imports` files and `PropertiesFileTransformer` with comma-separated merging for properties files, plus a custom `ResourceTransformer` for class names inside them. So "Shadow ships no transformer for them" stays true and is now permanent policy. The merging page lists no Spring transformer (nine transformer classes named). Item 6 text "contained no class with 'Spring' in the name" remains true per the merging page's list; the 2026-09-12 package read was not repeated, so re-date it to the merging-page read of 2026-11-27.

### 4. GRADLE-DIST-10 minimize blind spot

Unchanged for the default analyzer. The [minimizing page](https://gradleup.com/shadow/configuration/minimizing/) still names `Class.forName(String)` as a case needing `exclude`, and never mentions `ServiceLoader`. New fact: the page documents an optional R8 mode in which "service descriptors in `META-INF/services` are used to keep service providers". So the open question is answered: the default `minimize()` analyzer has not gained ServiceLoader awareness; R8 mode keeps providers listed in `META-INF/services`. The unreleased changes add more R8 options (finding 1). The rule stays correct; add the R8 note as an aside.

### 5. GRADLE-PUB-10, -11, DIST-13 and #324

PUB-10 unchanged. The [publishing page](https://gradleup.com/shadow/publishing/) says `addShadowVariantIntoJavaComponent` is "enabled by default" and adds a shadowed-jar variant to the `java` component. The 9.0.0/9.1.0 dating was not re-read. PUB-11 unchanged: `configurations.shadow` becomes `RUNTIME`-scoped POM dependencies, and the page's example says a shadow dependency is also "declared as a runtime dependency in `META-INF/MANIFEST.MF`" via `Class-Path`. [#324](https://github.com/GradleUp/shadow/issues/324) ("Shadowed JARs should not be added to JAR manifest Class-Path header") is closed as not planned on 2025-01-24, with no PR; the maintainers call it intended. So the coupling did not change, and the kafka-style exception in PUB-11 stands. The question "did closing #324 change the coupling" is answered: no.

### 6. GRADLE-DIST-16 and -17 (Spring Boot)

Wording unchanged, version label changed. The [efficient packaging page](https://docs.spring.io/spring-boot/reference/packaging/efficient.html) is now Spring Boot 4.2.0 (Stable) and still gives `java -Djarmode=tools -jar my-app.jar extract`. The [Gradle plugin packaging page](https://docs.spring.io/spring-boot/gradle-plugin/packaging.html) (4.2.0) still lists layers `dependencies`, `spring-boot-loader`, `snapshot-dependencies`, `application` in that default order, and says `layerOrder` "must cover all layers referenced by the `intoLayer` calls". The [releases page](https://github.com/spring-projects/spring-boot/releases) shows 4.2.0, 4.1.3 and 4.0.10 on 19 Nov (year not printed; 4.2.0 is the one the live docs mark Stable). Relevant fixes: 4.1.3 and 4.0.10 fix Gradle-plugin custom layers that included content meant to be excluded; 4.0.10 and 4.2.0-RC2 fix directories created by `jarmode tools extract` that made Docker layers non-reproducible. Neither changes a rule. Change the stamp to "Spring Boot 4.0 to 4.2, verified 2026-11-27".

### 7. Maven Shade version note (GRADLE-DIST-13)

Unchanged. The [plugin site](https://maven.apache.org/plugins/maven-shade-plugin/) shows 3.6.2 (site published 2026-03-02) and the [shade:shade goal](https://maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html) shows `createDependencyReducedPom` boolean, default `true`. No newer release found.

## Claim verdict table

| Claim | Verdict | New fact / source / date |
|---|---|---|
| DIST-12 floors, 9.6.1, plugin id | unchanged | no release after 9.6.1; changes page 2026-11-27 |
| PLUG-21 9.5.0 needs Gradle 9.2, Java 17 | unchanged | CHANGELOG |
| DIST-06 MRJAR 9.0.0 | unchanged (not re-read) | merging page silent |
| DIST-07 default EXCLUDE | unchanged | merging page |
| DIST-09 #1489 open | changed | closed not planned 2026-10-25 |
| Item 6 no Spring transformer | unchanged | merging page lists none |
| DIST-10 minimize blind spot | unchanged | R8 mode keeps META-INF/services providers |
| PUB-10 variant flag | unchanged | publishing page, default enabled |
| PUB-11 / DIST-13 shadow config to RUNTIME | unchanged | publishing page |
| #324 open question | answered | closed not planned 2025-01-24; intended |
| DIST-16 / -17 Spring Boot | unchanged | now 4.2.0 stable docs |
| Maven Shade 3.6.2 default true | unchanged | shade-mojo page |
| 9.0.0 / 9.1.0 / 1.1.0 historical dates | could not determine | not re-read in this delta |

## Normative guidance candidates

1. Rewrite GRADLE-DIST-09's sentence to "GradleUp/shadow#1489 was closed as not planned on 2026-10-25; Shadow will not ship a Spring transformer." Rationale: the maintainer decision makes the gap permanent. Verify: reader checks the issue state at the URL; grep `still open` in distribution.md returns nothing.
2. Add to GRADLE-DIST-09 the maintainer-recommended recipe: `mergeServiceFiles("META-INF/spring")` for `.imports`, `PropertiesFileTransformer` with comma merge for properties files. Rationale: it is the only sanctioned path now. Verify: grep `PropertiesFileTransformer` in the gradle-build skill.
3. Add to GRADLE-DIST-10 one sentence: R8 minimization keeps providers named in `META-INF/services`; the default analyzer does not. Rationale: answers the open question. Verify: grep `R8` in distribution.md.
4. Re-stamp the verified dates (DIST-12, DIST-16, DIST-17, rules/gradle-build.md) to 2026-11-27 and keep 9.6.1. Rationale: facts re-read. Verify: grep `2026-09-12` in the pair shows only claims not re-read.
5. Do not state a Gradle 9.4 floor until a release carries it. Rationale: it is unreleased. Verify: the CHANGELOG header for the version names a real date.

## AI-agent angle

- An agent may claim Shadow has a Spring transformer or that #1489 is open; check the issue state and the merging page's transformer list.
- An agent may state the 9.4 floor from the Unreleased CHANGELOG; check the release date of the cited version.
- An agent may call `minimize()` ServiceLoader-safe; the default analyzer is not, only R8 mode keeps `META-INF/services` providers.

## Contested / evolving

Shadow's R8 minimization is expanding (unreleased: new spec options, deprecations of `keepRules`, `minimizeJar`); trending toward R8 as the primary minimizer, as of 2026-11-27. Spring Boot 4.2 is the new stable line, so version stamps drift quickly.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/GradleUp/shadow/main/CHANGELOG.md | CHANGELOG (fetched twice) | Unreleased 2026-xx-xx; 9.6.1 2026-07-22 | primary, versions and floors |
| https://github.com/GradleUp/shadow/releases | releases list | newest 9.6.1 | primary |
| https://gradleup.com/shadow/changes/ | rendered changelog | 2026-11-27 read | primary |
| https://github.com/GradleUp/shadow/issues/1489 | Spring issue | closed 2026-10-25 | primary |
| https://github.com/GradleUp/shadow/issues/324 | Class-Path issue | closed 2025-01-24 | primary |
| https://gradleup.com/shadow/configuration/minimizing/ | minimizing docs | read 2026-11-27 | primary |
| https://gradleup.com/shadow/configuration/merging/ | merging docs | read 2026-11-27 | primary |
| https://gradleup.com/shadow/publishing/ | publishing docs | read 2026-11-27 | primary |
| https://docs.spring.io/spring-boot/reference/packaging/efficient.html | Boot 4.2.0 efficient packaging | 4.2.0 | primary |
| https://docs.spring.io/spring-boot/gradle-plugin/packaging.html | Boot 4.2.0 Gradle packaging | 4.2.0 | primary |
| https://github.com/spring-projects/spring-boot/releases | Boot releases (first 100000 chars read) | 19 Nov | primary |
| https://maven.apache.org/plugins/maven-shade-plugin/ | Shade site | 3.6.2, published 2026-03-02 | primary |
| https://maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html | shade goal | 3.6.2 | primary |

Note: the Spring Boot releases page printed no year; the 2026 year is inferred from its tag ordering against the 4.x docs. This delta had 13 primary sources and the minimum of 12 sources is met only by counting the CHANGELOG once and all else once.

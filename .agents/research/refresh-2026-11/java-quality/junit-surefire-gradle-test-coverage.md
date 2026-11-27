---
title: "Delta 2026-09-12 to 2026-11-27: JUnit, Surefire, Gradle jvm-test-suite and JaCoCo, Kover check default"
pair: java-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 14
---

# Delta: JUnit, Surefire, jvm-test-suite, JaCoCo, Kover check default

Scope: only the testing.md and platform-and-versions.md claims listed in the commission. Baseline is jvm-quality-gates.md (2026-09-12). Kover rules belong to kotlin-quality and general Gradle wiring to gradle-build, so they are only checked here for the one claim JAVA-TEST-08 makes.

## Summary

- JUnit current GA is still 6.1.3 (released 2026-08-07). No GA release landed in the window. The only newer artifact is the pre-release 6.2.0-M1 (2026-11-15). JAVA-TEST-01 "6.1.3 is current" is unchanged.
- No JUnit 5.x end of support. The upstream SECURITY.md lists 6.1.x and 5.14.x as supported and everything below 5.14 as unsupported. The newest 5.x is 5.14.4 (2026-04-26), before the window. The floor of 5 stays valid.
- JUnit floor is unchanged at Java 17. The release notes say the Kotlin baseline is 2.1, not 2.2 as testing.md claims. That is a baseline error, not a window change.
- The Surefire claim is changed: the newest GA is now 3.6.1, and 3.6.0 is also GA. Maven Central's Solr index is stale and still shows 3.6.0-M1 as newest, so the JAVA-TEST-12 verification command is unreliable.
- `worker_thread_pool` is still marked experimental in the current user guide.
- `jvm-test-suite` is still incubating (Gradle 9.9.2 docs).
- The JaCoCo statement still holds in substance (Gradle 9.9.2 docs), though the exact wording differs from the quote in testing.md.
- The Kover `check` default could not be re-confirmed from the changelog or docs; nothing contradicts it either. Kover moved to 0.9.11 (2026-09-29).

## Findings

### 1. JUnit current release, floor, 5.x support (JAVA-TEST-01, JAVA-PLAT-02)

- Status: unchanged for "6.1.3 is current". The GitHub release list shows 6.1.3 flagged Latest, dated 2026-08-07, and the only newer entry is the pre-release 6.2.0-M1, 2026-11-15 ([releases](https://github.com/junit-team/junit-framework/releases)). Maven Central metadata for `junit-jupiter` ends with 6.1.3 then 6.2.0-M1, last updated 2026-11-15 ([maven-metadata.xml](https://repo.maven.apache.org/maven2/org/junit/jupiter/junit-jupiter/maven-metadata.xml)). The release notes page lists no entries after 6.1.3 ([release notes](https://docs.junit.org/current/release-notes/)).
- Status: unchanged for the Java 17 floor (JAVA-PLAT-02). The release notes record "Java 17 and Kotlin 2.1 baseline" under 6.0.0 and no later raise in 6.1.0 through 6.1.3. I could not read 6.2.0-M1 notes, because the release notes page has no 6.2.0 content; a floor change in that milestone is possible but not documented and not GA.
- Status: changed (error in baseline text, not an upstream change). Old text: "6.0.0 shipped 2025-09-30 requiring Java 17 and Kotlin 2.2". New fact: the 6.0.0 scope reads "Java 17 and Kotlin 2.1 baseline" ([release notes](https://docs.junit.org/current/release-notes/)). The 6.0.0 date 2025-09-30 is correct ([releases](https://github.com/junit-team/junit-framework/releases)). Upstream date of change: none; the claim was wrong at baseline.
- Status: unchanged for "JUnit 5 reached end of support" being false. [SECURITY.md](https://raw.githubusercontent.com/junit-team/junit-framework/main/SECURITY.md) lists "6.1.x" and "5.14.x" as supported and "< 5.14" as unsupported. 5.14.4 (2026-04-26) is the newest 5.x. So a floor of "5" is only safe for 5.14.x; any earlier 5.x is unsupported. This refines, but does not break, the rule.
- Gradle's own pin `junit5ForTests = "5.12.2!!"`: could not determine. I did not open Gradle's version catalog this run. No upstream signal suggests change; treat as unverified.

### 2. Removed modules (JAVA-TEST-02)

Status: unchanged. The 6.0.0 notes state: "The junit-platform-runner module which provided the JUnit 4 based JUnitPlatform runner has been removed." and "The junit-platform-jfr module ... has been removed. The functionality is now available directly in the junit-platform-launcher module." No replacement is named for the runner ([6.0.0 release notes](https://docs.junit.org/6.0.0/release-notes.html)). Nothing in 6.1.x reverses this.

### 3. @ResourceLock capabilities and PRs (JAVA-TEST-05)

Status: unchanged in substance, but the open question in jvm-quality-gates.md is now answered. Release mapping is derived by the GitHub compare API: a merge commit is contained in a tag when the tag is "behind" the commit. All four PRs have `milestone: null`, so milestone labels give nothing; the mapping is by tag containment.

| Item | PR | Merged | First tag containing it |
|---|---|---|---|
| `@ResourceLock(target = CHILDREN)` | [#4151](https://github.com/junit-team/junit-framework/pull/4151) | 2024-11-26 | r5.12.0 (not in 5.11.0) |
| `ResourceLocksProvider` (programmatic locks, `providers` attribute) | [#3889](https://github.com/junit-team/junit-framework/pull/3889) | 2024-10-07 | r5.12.0 (not in 5.11.0) |
| Vintage parallel method execution | [#4242](https://github.com/junit-team/junit-framework/pull/4242) | 2025-02-10 | r5.12.0 (not in 5.11.0) |
| Global read lock with other exclusive resources | [#2614](https://github.com/junit-team/junit-framework/pull/2614) | 2021-05-15 | r5.8.0 (not in 5.7.0) |

Consequence: testing.md says "four PRs merged 2025 to 2026". That is wrong. Merge dates are 2021, 2024, 2024 and 2025, and three of four are in 5.12.0 and so available on the 5.x floor. Tag containment is my inference from the compare API, not a statement in the release notes; I did not read the 5.12.0 notes. The current user guide documents `target = CHILDREN` and the `providers` attribute ([parallel execution](https://docs.junit.org/current/writing-tests/parallel-execution.html)); it does not mention Vintage parallelism. No `@ResourceLock` change appears in 6.1.0 through 6.1.3. The only related entry is 6.0.2: "Allow using `@ResourceLock` on classes annotated with `@ClassTemplate` (or `@ParameterizedClass`)" ([release notes](https://docs.junit.org/current/release-notes/)).

### 4. worker_thread_pool (JAVA-TEST-05)

Status: unchanged. The user guide marks it "(experimental)" and says: "Using `worker_thread_pool` is currently an _experimental_ feature." `fork_join_pool` remains the default ([parallel execution](https://docs.junit.org/current/writing-tests/parallel-execution.html)). It shipped in 6.1.0 (2026-05-19): "New `WorkerThreadPoolHierarchicalTestExecutorService` implementation used for parallel test execution", with the Jupiter side making the executor service configurable ([release notes](https://docs.junit.org/current/release-notes/)). 6.1.0 also deprecated the `ForkJoinPoolHierarchicalTestExecutorService` constructors.

### 5. Default execution mode (JAVA-TEST-04)

Status: unchanged. "By default, nodes in the test tree use the `SAME_THREAD` execution mode." and `junit.jupiter.execution.parallel.mode.default` "(defaults to `same_thread`)" ([parallel execution](https://docs.junit.org/current/writing-tests/parallel-execution.html)).

### 6. Surefire (JAVA-TEST-12)

Status: changed.
- Old text: newest GA line was `3.5.6`; `3.6.0` reached GA on Central 2026-09-03 (verified 2026-09-12).
- New fact: Central's `maven-metadata.xml` lists `3.5.6, 3.6.0-M1, 3.6.0, 3.6.1`, last updated 2026-10-26. The newest GA is **3.6.1**. The 3.6.1 POM carries `Last-Modified: Thu, 22 Oct 2026`; the 3.6.0 POM carries `Mon, 31 Aug 2026` ([maven-metadata.xml](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml)). Upstream date of change: 3.6.1 on 2026-10-22 per the POM header, an HTTP header, not a release announcement.
- The `3.6.0` POM header date of 2026-08-31 is earlier than the baseline's "GA on Central on 2026-09-03". The two may differ because of upload versus index time; I could not reconcile them.
- Separate defect: the rule's verification command queries `search.maven.org/solrsearch`. On 2026-11-27 that returned `3.6.0-M1` as newest and no 3.6.0 or 3.6.1, so the index is stale relative to the repository ([solr query](https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=8&wt=json)). This reproduces the exact failure JAVA-TEST-12 warns about, in the verification command itself.

### 7. jvm-test-suite incubating (JAVA-TEST-06)

Status: unchanged. The Gradle 9.9.2 page says: "The JVM Test Suite plugin is an incubating API and is subject to change in a future release." and "By convention, test suite targets are not associated with the `check` task." ([jvm_test_suite_plugin](https://docs.gradle.org/current/userguide/jvm_test_suite_plugin.html)). The 9.9 release notes say the documentation rewrite continues with the JVM Test Suite and JaCoCo pages and list no functional changes for these plugins ([release notes](https://docs.gradle.org/current/release-notes.html)). Update the version tag from "Gradle 9.x" to "Gradle 9.9.2, read 2026-11-27".

### 8. JaCoCo and Kover check (JAVA-TEST-08)

- JaCoCo: unchanged in substance, wording differs. The 9.9.2 page reads: "The JacocoCoverageVerification task is not a task dependency of the `check` task provided by the Java plugin." It also says rule violations fail the build "when executing the `check` task" ([jacoco_plugin](https://docs.gradle.org/current/userguide/jacoco_plugin.html)). testing.md quotes "jacocoTestCoverageVerification ... is not a task dependency of the `check` task" in quotation marks; the quote should use the current wording or drop the quote marks. Default JaCoCo `toolVersion` is 0.8.15 on this page.
- Kover: could not determine. The Kover docs say nothing on `check` wiring, only "call `koverVerify`" ([Kover docs](https://kotlin.github.io/kotlinx-kover/gradle-plugin/)). The changelog's newest entries (0.9.11 on 2026-09-29, 0.9.10 on 2026-09-28) mention no change to `check` ([CHANGELOG](https://raw.githubusercontent.com/Kotlin/kotlinx-kover/main/CHANGELOG.md)). So no change in the window, but the "since 0.7.0" attribution was not re-confirmed. kotlin-quality owns this and should hold the authoritative check. Update the cited "latest" if any is stated: current is 0.9.11.
- Maven `check` binds to `verify` with `haltOnFailure` true: not re-fetched; no upstream signal; could not determine.

## Normative guidance candidates

1. Rule: in JAVA-TEST-12, replace the Solr verification with `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml | grep '<version>' | tail -3`, and say the Solr index can lag Central. Rationale: the Solr result on 2026-11-27 omitted two GA releases. Verification: run the command and compare with a direct POM fetch of the newest version (HTTP 200).
2. Rule: in JAVA-TEST-12, state the newest Surefire GA as 3.6.1 (verified 2026-11-27). Rationale: the baseline's 3.5.6 and 3.6.0 are both superseded. Verification: the same metadata command.
3. Rule: in JAVA-TEST-01, correct "Kotlin 2.2" to "Kotlin 2.1" and add that 5.14.x is the only supported 5.x line. Rationale: release notes and SECURITY.md say so. Verification: grep the 6.0.0 scope line "Java 17 and Kotlin 2.1 baseline".
4. Rule: in JAVA-TEST-05, delete "merged 2025 to 2026"; add that `target = CHILDREN`, `ResourceLocksProvider` and Vintage parallel execution are in 5.12.0 and later. Rationale: tag containment shows 5.12.0; the rule's floor is 5. Verification: `gh api repos/junit-team/junit-framework/compare/r5.12.0...<merge sha> -q .status` returns `behind` for each of the three merge commits.
5. Rule: refresh dates to 2026-11-27 for the "still experimental" and "still incubating" claims and name Gradle 9.9.2. Rationale: those claims are dated reads. Verification: grep "experimental" in the parallel-execution page and "incubating" in the jvm_test_suite page.
6. Rule: in JAVA-TEST-08, reword the JaCoCo quote to the current Gradle text. Rationale: the quoted string no longer matches the page. Verification: grep the jacoco_plugin page for "not a task dependency".

## AI-agent angle

- A model pins Surefire from the Solr index or from memory and lands on 3.5.6 or 3.6.0. Check: query `maven-metadata.xml`.
- A model assumes JUnit 6 needs Kotlin 2.2 or that 5.x is end of life. Check: SECURITY.md and the 6.0.0 scope line.
- A model enables `worker_thread_pool` as stable. Check: grep for `executor.service` in `junit-platform.properties` and treat it as experimental.
- A model claims `@ResourceLock(target = CHILDREN)` needs JUnit 6. It is in 5.12.0.

## Contested / evolving

- JUnit 6.2.0-M1 (2026-11-15) is out. Its content could not be read. Re-check floor and `worker_thread_pool` status at 6.2.0 GA.
- Gradle's JVM Test Suite and JaCoCo pages are being rewritten (9.9 notes), which may change quoted wording again.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://docs.junit.org/current/release-notes/ | JUnit 6.x release notes | read 2026-11-27 | primary, 6.0.0 through 6.1.3 |
| https://docs.junit.org/6.0.0/release-notes.html | 6.0.0 removals | 2025-09-30 | primary, exact removal wording |
| https://github.com/junit-team/junit-framework/releases | release list and dates | read 2026-11-27 | primary, current and pre-release |
| https://raw.githubusercontent.com/junit-team/junit-framework/main/SECURITY.md | supported versions | read 2026-11-27 | primary, 5.x support |
| https://docs.junit.org/current/writing-tests/parallel-execution.html | parallel execution guide | read 2026-11-27 | primary, defaults and experimental status |
| https://github.com/junit-team/junit-framework/pull/4151 | CHILDREN PR | merged 2024-11-26 | primary |
| https://github.com/junit-team/junit-framework/pull/3889 | ResourceLocksProvider PR | merged 2024-10-07 | primary |
| https://github.com/junit-team/junit-framework/pull/4242 | Vintage parallel PR | merged 2025-02-10 | primary |
| https://github.com/junit-team/junit-framework/pull/2614 | global read lock PR | merged 2021-05-15 | primary |
| https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml | Surefire versions on Central | updated 2026-10-26 | primary |
| https://repo.maven.apache.org/maven2/org/junit/jupiter/junit-jupiter/maven-metadata.xml | Jupiter versions on Central | updated 2026-11-15 | primary |
| https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=8&wt=json | Solr index | read 2026-11-27 | shows stale index |
| https://docs.gradle.org/current/userguide/jvm_test_suite_plugin.html | jvm-test-suite doc, Gradle 9.9.2 | read 2026-11-27 | primary |
| https://docs.gradle.org/current/userguide/jacoco_plugin.html | JaCoCo doc, Gradle 9.9.2 | read 2026-11-27 | primary |
| https://docs.gradle.org/current/release-notes.html | Gradle 9.9 notes | 2026-11 | primary |
| https://raw.githubusercontent.com/Kotlin/kotlinx-kover/main/CHANGELOG.md | Kover changelog | 0.9.11 on 2026-09-29 | primary |
| https://kotlin.github.io/kotlinx-kover/gradle-plugin/ | Kover docs | read 2026-11-27 | primary, silent on check wiring |

Not fetched: 5.12.0 release notes, 6.2.0-M1 notes, Gradle's own version catalog, Maven JaCoCo `check` goal docs.

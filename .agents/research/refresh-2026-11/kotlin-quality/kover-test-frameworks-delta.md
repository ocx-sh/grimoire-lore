---
title: Kover and Kotlin test-framework delta, 2026-09-12 to 2026-11-27
pair: kotlin-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 11
---

# Kover and Kotlin test-framework delta

Scope: a delta against the 2026-09-12 baseline for KT-TEST-01, KT-TEST-02 and KT-TEST-04 and row 14 of `rules/kotlin-quality.md`. JUnit releases belong to the java-quality sibling. Corpus adoption counts are out of scope.

## Summary

- Current stable Kover is 0.9.11, released 2026-09-29. No 1.0 exists. Two releases fell in the window: 0.9.10 (2026-09-28) and 0.9.11 (2026-09-29).
- Neither release touches `check` wiring, `onCheck`, `disable()` or the `verify` DSL. Row 14 and KT-TEST-02 are unchanged in substance.
- The Kover Gradle plugin documentation still never states that `check` depends on `koverVerify`. Row 14's "since 0.7.0" sentence still has no primary documentation citation and keeps resting on kotlinx-kover#523. The baseline's remark that the docs were read at 0.9.8 is now stale: the docs examples still say 0.9.8 while the plugin is at 0.9.11. Re-date to read 2026-11-27, docs examples still pinned at 0.9.8.
- JaCoCo's only release in the window is 0.8.16 (2026-10-24): Java 27 support, experimental Java 28 class files, ASM 9.11.1. No Kotlin filtering. KT-TEST-01 is unchanged.
- Kotest has no major since 6.0.0. 6.2.5 to 6.2.7 are minor patches. TestBalloon went 1.1.0 (2026-09-03) to 1.2.0 (2026-10-25). Prepared is at 2.7.0, still active.
- JetBrains' JUnit page (dated 13 October 2026) still names only JUnit Jupiter, now JUnit 6.0.3, with `kotlin.test` as the optional Gradle add-on, and recommends no other framework. KT-TEST-04 is unchanged.

## Findings per claim

### 1. Row 14 / KT-TEST-02: `check` depends on `koverVerify` since 0.7.0

Verdict: unchanged. Needs no new citation, but gains one weakly relevant note.

- Releases: [GitHub releases](https://github.com/Kotlin/kotlinx-kover/releases) and the [CHANGELOG](https://raw.githubusercontent.com/Kotlin/kotlinx-kover/main/CHANGELOG.md) list 0.9.11 (2026-09-29, "Reverted the fix of #827"), 0.9.10 (2026-09-28: "Fixed concurrency problem with Kover reporter" #822, "Added check on duplicate project dependencies" #825, "Added skip of test tasks without binary report" #827), 0.9.9 (2026-07-17), 0.9.8 (2026-03-25). Release dates confirmed against the tags via the GitHub API. None mentions `check`, `koverVerify`, the DSL or distribution.
- #827, the one behaviour-adjacent item, is [still open](https://github.com/Kotlin/kotlinx-kover/issues/827) as "Disabled `Test` task's stale binary report is still merged into reports". It concerns stale binary reports, not verification wiring. Not a rule input.
- Docs: the [Gradle plugin page](https://kotlin.github.io/kotlinx-kover/gradle-plugin/) has no `check` or `build` statement. It says only that `koverVerify` validates verification rules. It shows `onCheck = false` in the `xml`, `html`, `log` and `binary` report examples without explaining it. Examples use `version "0.9.8"`. So "Kover's own documentation ... never states the binding" remains true. Re-date it to "read 2026-11-27; examples still show 0.9.8".
- `onCheck` still exists under that name (docs). `disable()` is not found in the docs page. The page documents `disableForTestTasks` and `disabledForTestTasks` (instrumentation and test-task exclusion) and `disableForAll = true`. This does not contradict the rule, but `disable()` as a literal call is not documented. Could not determine whether `disable()` is a documented DSL name. The rule's "a `disable()` call" wording is a loose label for the disabling constructs; consider naming the documented spellings in the grep.
- #523 ([API read](https://github.com/Kotlin/kotlinx-kover/issues/523)): opened and closed 2024-01-08, title "The Gradle `check` task depends on `koverVerify` one after migration to 0.7.0". The maintainer's fix there is `koverReport { defaults { verify { onCheck = false } } }`, which is the pre-0.8 DSL. Under the 0.9 DSL the equivalent lives at `kover { reports { verify { ... } } }`. This confirms the 0.7.0 statement but the quoted `onCheck` spelling is the old DSL position. The docs page only shows `onCheck` in the report-task examples; I did not find the `verify` block's `onCheck` documented there. Could not determine whether `verify { onCheck }` is still the exact 0.9 spelling; a build-file grep for `onCheck` still catches it either way.
- Floor shape: the docs show `kover { reports { verify { rule { ... } } } }` and, inside a rule, `minBound(50)`. `minValue` does not appear on the page. The row's `bound { minValue = 90 }` shape is therefore not the documented example. Verdict: changed in presentation only. Old text: "`bound { minValue = N }`" as the sole floor form. New fact: docs show `minBound(N)` as the documented shortcut; `bound { minValue }` was not found in docs. I did not verify against Kover source or 0.9.11 API whether `bound { minValue = }` still compiles. Recommended action: have the authoring pass confirm by one `./gradlew koverVerify` run, or name both forms. Could not determine compile status from primary sources fetched.

Row 14 "since 0.7.0" sentence: no new primary citation exists. Keep citing #523 and the plugin task tree. Needs a citation only if someone wants one from documentation, and none exists.

### 2. KT-TEST-01: JaCoCo versus Kover rationale

Verdict: unchanged. [JaCoCo changes page](https://www.jacoco.org/jacoco/trunk/doc/changes.html): 0.8.16 (2026/10/24) lists Java 27 support, experimental Java 28 class files and ASM 9.11.1. The 0.8.17 snapshot (2026/11/26) lists no changes. No entry about Kotlin, inline functions, or `access$` synthetic accessors. The reading is from a summarising fetch, so a future auditor should grep the page for "Kotlin".

### 3. KT-TEST-04: framework landscape

Verdict: unchanged.

- Kotest: [releases](https://github.com/kotest/kotest/releases) v6.2.5 (2026-09-10), v6.2.6 (2026-10-14), v6.2.7 (2026-11-11). Latest minor v6.2.0 (2026-06-15); no 7.x tag. Major 6.0.0 dates 2025-08-19. Patch notes cover IntelliJ runner, timeouts, matchers, AI skills. Nothing changes `kotlin.test` integration. [kotest.io changelog](https://kotest.io/docs/changelog) fetched but truncated at 6.0.2, so the GitHub releases are the evidence.
- TestBalloon (infix-de/testBalloon): [1.1.0](https://github.com/infix-de/testBalloon/releases) 2026-09-03 (single unified artifact set for Kotlin 2.2.0 and higher), [1.2.0](https://github.com/infix-de/testBalloon/releases/tag/1.2.0) 2026-10-25 (tested up to Kotlin 2.5.0-Beta2, minimum JDK 8, Kotest assertions integration needs Kotest 6.1.4 or later, experimental JS test DSL support). Still a minor-version-1.x library; not a default.
- Prepared (mirrored at CLOVIS-AI/Prepared; canonical host is not the mirror): tags up to 2.7.0, last commit 2026-11-18. Alive. I did not fetch its release notes; status only.
- JetBrains: [JUnit page](https://kotlinlang.org/docs/jvm-test-using-junit.html), end-dated "13 October 2026", states "Kotlin/JVM supports the latest stable JUnit version, JUnit 6", uses JUnit 6.0.3, Kotlin 2.4.21, and `testImplementation(kotlin("test"))` described as integrating with JUnit. It names no other framework. The date is probably, not certainly, the last-update stamp. The `kotlin.test` on JUnit Platform pin stands. Only integration note: the page's examples are JUnit 6 (6.0.3); the java-quality sibling owns JUnit version claims.
- The "2025-06-17 practitioner survey compares five live options" claim is a dated fact about an article and cannot change; all five options (Kotest, TestBalloon, Prepared, kotlin.test/JUnit, others) remain live. Re-date to 2026-11-27 for liveness.

## Normative guidance candidates

1. Re-date KT-TEST-02 and row 14 "read 2026-09-12" to "read 2026-11-27" and say the docs examples still use 0.9.8 while stable is 0.9.11. Rationale: the baseline read is now stale against the newest release. Verification: `grep -n "0.9.8\|2026-09-12" skills/kotlin-quality-reference/testing.md rules/kotlin-quality.md`.
2. Optional: in KT-TEST-02, name `minBound(N)` alongside `bound { minValue = N }` as accepted floor spellings, or confirm `minValue` against a 0.9.11 build first. Rationale: the docs show only `minBound`; an agent grepping for `minValue` alone would miss a real floor. Verification: grep adds `minBound\|minValue` to block KT-TEST-02.
3. Optional: in KT-TEST-02's grep, add `disableForAll` and `disabledForTestTasks` to the disabling patterns. Rationale: they are the documented spellings; `disable()` is not documented. Verification: `grep -rnE 'onCheck *= *false|disableForAll|disabledForTestTasks|disable\(\)' --include=*.gradle.kts .`.
4. No change to KT-TEST-01 or KT-TEST-04 text. Re-dating liveness is optional.

## AI-agent angle

- An agent trained before 0.8 emits the pre-0.8 DSL (`koverReport { defaults { verify { ... } } }`, `kover { ... }` mixed with `koverReport`). Catch with `grep -n 'koverReport' *.gradle.kts`; the 0.9 DSL uses `kover { reports { ... } }`.
- An agent adds `tasks.check { dependsOn(koverVerify) }`. Still a no-op; the rule already covers it.
- An agent pins Kover "1.0" or invents a KGP-bundled coverage. None exists as of 2026-11-27.

## Contested / evolving

- Kover has had no DSL or wiring change since 0.9.8's era; the trend is bugfix-only. Watch #827 (open) and a possible 0.10 or 1.0.
- Kotest 6.2.x and TestBalloon 1.2 keep maturing; neither displaces `kotlin.test` as the JetBrains-documented default.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/Kotlin/kotlinx-kover/releases | Kover releases | to 2026-09-29 | newest stable |
| https://raw.githubusercontent.com/Kotlin/kotlinx-kover/main/CHANGELOG.md | Kover changelog | to 2026-09-29 | no wiring change |
| https://kotlin.github.io/kotlinx-kover/gradle-plugin/ | plugin docs | examples at 0.9.8 | no check binding stated |
| https://github.com/Kotlin/kotlinx-kover/issues/523 | the 0.7.0 binding issue (API read) | 2024-01-08 | old-DSL onCheck |
| https://github.com/Kotlin/kotlinx-kover/issues/827 | stale binary report issue (API read) | open | reverted fix |
| https://www.jacoco.org/jacoco/trunk/doc/changes.html | JaCoCo changes | 0.8.16 2026-10-24 | no Kotlin filtering |
| https://kotlinlang.org/docs/jvm-test-using-junit.html | JetBrains JUnit page | 13 Oct 2026 | no framework recommendation |
| https://github.com/kotest/kotest/releases | Kotest releases | to 2026-11-11 | no major |
| https://kotest.io/docs/changelog | Kotest changelog (truncated) | 6.0.2 visible | incomplete |
| https://github.com/infix-de/testBalloon/releases | TestBalloon releases | to 2026-10-25 | 1.2.0 |
| https://github.com/CLOVIS-AI/Prepared | Prepared mirror (API tags and commits) | 2.7.0, 2026-11-18 | liveness only |

Primary: 9 of 11. Fewer than the 12-source minimum because this is a bounded delta.

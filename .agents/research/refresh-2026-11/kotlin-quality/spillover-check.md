---
title: Spillover check for kotlin-quality
target: kotlin-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://raw.githubusercontent.com/Kotlin/kotlinx-kover/main/CHANGELOG.md
  - https://github.com/Kotlin/kotlinx-kover/issues/523
  - https://kotlin.github.io/kotlinx-kover/gradle-plugin/
  - https://docs.junit.org/current/release-notes/
  - https://kotlinlang.org/docs/gradle-configure-project.html
  - https://kotlinlang.org/docs/compatibility-guide-24.html
  - https://www.oracle.com/news/announcement/oracle-releases-java-27-2026-09-15/ (HTTP 403)
  - https://openjdk.org/projects/jdk/27/ (HTTP 403)
  - https://docs.oracle.com/en/java/javase/27/docs/specs/man/javac.html
---

# Spillover check for kotlin-quality

Files checked: rules/kotlin-quality.md and every file under skills/kotlin-quality-reference/.

## 1. Kover "check depends on koverVerify since 0.7.0" (from java-quality)

Item: java-quality could not re-confirm the claim from docs or changelog; Kover current is 0.9.11 (2026-09-29).

Verdict: confirmed by primary source (the project's own issue tracker). The changelog and docs do not state it, but the maintainers' issue does.

Evidence:
- Changelog (https://raw.githubusercontent.com/Kotlin/kotlinx-kover/main/CHANGELOG.md): heading "0.7.0 / 2023-05-16"; newest headings "0.9.11 / 2026-09-29" and "0.9.10 / 2026-09-28". No entry states that `check` depends on `koverVerify`.
- Docs (https://kotlin.github.io/kotlinx-kover/gradle-plugin/): only says "call `koverVerify` Gradle task"; never explains `onCheck`.
- Issue https://github.com/Kotlin/kotlinx-kover/issues/523, dated 2024-01-08, titled "The Gradle `check` task depends on `koverVerify` one after migration to 0.7.0." A maintainer answers with `onCheck = false` to remove the dependency between `check` and Kover verification. This is a first-party maintainer source for "since 0.7.0".

Affected text in target (skills/kotlin-quality-reference/testing.md, KT-TEST-02): "Do **not** add `tasks.check { dependsOn(koverVerify) }`: Kover's `check` has depended on `koverVerify` since **0.7.0** (verified 2026-09-12)". Also rules/kotlin-quality.md row 14: "`check` already depends on `koverVerify` since 0.7.0".
The same row already states "(read 2026-11-27, examples still pinned at 0.9.8 while the newest release is 0.9.11) never states the binding" and cites kotlinx-kover#523.

Smallest change: none required. Target already correct. Optional: change "(verified 2026-09-12)" to "(verified 2026-11-27)" in that KT-TEST-02 sentence, since the issue was re-read on that date.

## 2. JUnit 6.0.0 baseline is Kotlin 2.1, not 2.2 (from java-quality)

Item: check any KT-TEST row that cites Kotlin 2.2 for JUnit 6.

Verdict: confirmed by primary source, and target already correct (target makes no such claim).

Evidence: https://docs.junit.org/current/release-notes/ lists under 6.0.0 the scope line "Java 17 and Kotlin 2.1 baseline", release date September 30, 2025.

Target: a grep for "JUnit 6", "JUnit" and "2.2" across the pair finds no JUnit-to-Kotlin-version claim. KT-TEST-04 says only "Default a Kotlin module's test stack to the JUnit Platform with `kotlin.test` assertions", and testing.md says "Unlike Java, where JUnit 5 and 6 are unchallenged". The only "2.2" hits are jvmDefault (Kotlin 2.2.0) and Dokka/abiValidation rows, which are unrelated and correct.

Smallest change: none.

## 3. KGP 2.4.20/2.4.21 caps at Gradle 9.7.0; Kotlin 2.4.0 made Jakarta nullability mismatches errors (from gradle-build)

Verdict: confirmed by primary source for both halves. Gradle half: target already correct. Jakarta half: target says nothing.

Evidence:
- https://kotlinlang.org/docs/gradle-configure-project.html (read 2026-11-27): row "2.4.20-2.4.21 | 7.6.3-9.7.0 | 8.5.2-9.3.1" and "2.4.0-2.4.10 | 7.6.3-9.5.0 | 8.5.2-9.1.0". The "9.8 and 9.9 may warn" part is gradle-build's inference ("warnings possible, not breakage"), not stated by this page.
- https://kotlinlang.org/docs/compatibility-guide-24.html: "Enforce Jakarta nullability annotations", KTLC-285; deprecation cycle "2.2.0: report a warning ... 2.4.0: raise the warning to an error". The page gives no calendar date.

Affected text in target:
- skills/kotlin-quality-reference/compiler-and-toolchain.md KGP table: "| 2.4.0 through 2.4.10 | 9.5.0 |" and "| 2.4.20 through 2.4.21 | 9.7.0 |", ending "Verified 2026-11-27." Correct as is.
- Jakarta: skills/kotlin-quality-reference/java-interop.md KT-INTEROP-02 says "JSpecify is `strict` by default from Kotlin 2.1.0 (verified 2026-09-12) ... JSR-305 behaves as `warn` by default". It never mentions `jakarta.annotation.Nullable` or `Nonnull`. KT-INTEROP-03 lists flavours needing `-Xnullability-annotations` (JetBrains, Android, FindBugs, Eclipse, Lombok, RxJava3, Vert.x) and omits Jakarta.

Smallest change (optional, a gap rather than an error): in KT-INTEROP-02 or KT-INTEROP-03, add one sentence: "Jakarta `@Nullable` and `@Nonnull` mismatches were warnings from Kotlin 2.2.0 and are compile errors from Kotlin 2.4.0 (verified 2026-11-27, compatibility-guide-24)." The Gradle ceiling row needs no change.

## 4. JDK 27 went GA on 2026-09-15; "JDK 27 not yet GA" wording is stale (from maven-build)

Item addressed to java-quality and kotlin-quality.

Verdict: could not confirm from a primary source in this session; target says nothing on the point, so there is nothing stale in kotlin-quality either way.

Evidence: maven-build's own file cites the Oracle press release URL but only from a search snippet. Here the Oracle press release and openjdk.org/projects/jdk/27 both returned HTTP 403, and the web search budget was exhausted. The Oracle javac man page header reads "Java SE 27 & JDK 27" with copyright 2026 but shows no build string or date, and early-access docs carry the same labels, so it does not settle GA. The 2026-09-15 date is therefore secondary (a search snippet) until someone opens the press release.

Affected text in target: none. A grep for "JDK 27", "JDK 26" and "GA" across rules/kotlin-quality.md and skills/kotlin-quality-reference/ finds no JDK 27 statement and no "not yet GA" wording. The nearest GA-adjacent text, "2.5.0 still a release candidate" in java-interop.md, is about Kotlin and is unrelated.

Smallest change: none for kotlin-quality.

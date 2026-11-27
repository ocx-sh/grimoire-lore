---
title: Kotlin JVM recent shifts delta, 2026-09-12 to 2026-11-27
pair: kotlin-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 24
---

# Kotlin JVM recent shifts delta

This is a delta against the baseline of 2026-09-12 and against jvm-topic-map/recent-shifts.md (2026-09-05). That earlier scan covered K1 removal in 2.4.0, KSP and kapt, Dokka 2.2, the in-KGP `abiValidation`, JUnit 6, JSpecify adoption and coroutines 1.10. None of that is re-reported. Only what is new, or what the pair never mentions, is stated. Anything not listed is "unchanged".

## Release timeline read from the JetBrains/kotlin GitHub releases API

- 2.4.0 on 2026-06-03, 2.4.10 on 2026-07-14, 2.4.20 on 2026-09-07 (five days before the window), 2.4.21 on 2026-10-08.
- 2.5.0-Beta1 on 2026-09-23, Beta2 on 2026-10-21, RC on 2026-11-11, RC2 on 2026-11-25.
- Kotlin 2.5.0 is not stable as of 2026-11-27. Every 2.5.0 fact below is RC-level and must be labelled so in any rule.
- Source: https://api.github.com/repos/JetBrains/kotlin/releases (fetched 2026-11-27).

## Candidate shifts

### C1. Unused return value checker moves toward default-on (2.5.0)
- Dates: Experimental opt-in since 2.3.0 and 2.4.0 (`-Xreturn-value-checker=check|full|disable`). In **2.5.0-Beta2 (2026-10-21)** KT-87295 "Enable Return Value Checker by default" (check mode: warns only for ignored results of marked callables, such as most of the stdlib) and KT-74808 (a Gradle DSL option) were fixed; KT-12719 itself appears in the Beta2 notes.
- Sources: https://github.com/JetBrains/kotlin/releases/tag/v2.5.0-Beta2 and https://youtrack.jetbrains.com/api/issues/KT-87295 (Fixed, Available in 2.5.0-Beta2). The 2.5.0-RC2 what's-new page (https://kotlinlang.org/docs/whatsnew-eap.html) lists the checker under "Stable language features" as "now enabled by default".
- Stability: Stable per the RC2 what's-new page; the feature's own page https://kotlinlang.org/docs/unused-return-value-checker.html still says "not yet stable" and "disable (default)". The two pages disagree. Treat the what's-new page and the KT-87295 fix as newer, but state it as "RC2 documentation" until 2.5.0 GA.
- Detail: annotations `@MustUseReturnValues` and `@IgnorableReturnValue`; escape hatch `val _ = f()`; Error Prone `@CheckReturnValue` and `@CanIgnoreReturnValue` are recognised. Diagnostic id family is `RETURN_VALUE_NOT_USED` (KT-85169, KT-87775).
- Overlap with reading-only rows: **partial and not proven**. The checker catches a discarded non-Unit result in general. Whether an unused `Deferred` from `async` is reported depends on whether `kotlinx.coroutines` marks `async` as must-use. kotlinx.coroutines has no release in the window (latest 1.11.0, 2026-05-08, https://github.com/Kotlin/kotlinx.coroutines/blob/master/CHANGES.md); its 1.11.0 changelog does not mention must-use annotations. Result for `Deferred`: could not determine. No compiler diagnostic exists for `runBlocking` in `suspend` (KT-CORO-03), `CoroutineExceptionHandler` placement (KT-CORO-04) or swallowed `CancellationException` (KT-CORO-05, KT-ERR-01). Those stay reading checks.
- Decision: **new rule needed in compiler-and-toolchain.md**, version-gated: on a Kotlin 2.5 floor keep the checker on and treat `RETURN_VALUE_NOT_USED` as part of the warnings-as-errors gate; before 2.5, opt in with `-Xreturn-value-checker=check`. Also **amend KT-CORO-05 prose only to say the checker does not replace it**. Do not promote KT-CORO-03/04/05 or KT-ERR-01.
- Rationale: an agent that ignores a returned value (`list.sorted()`, a dropped `Deferred`, a dropped `Result`) is the exact class this compiler check catches. Making it a gate removes a reading check.
- Verification: `./gradlew compileKotlin -Werror` fails on a fixture containing `listOf(1).sorted()` as a bare statement; grep the build files for `Xreturn-value-checker`.
- Risk: 2.5.0 is RC2; default-on may add warnings to existing builds that run `allWarningsAsErrors`. State that in the rule.

### C2. Name-based destructuring reaches Stable in `only-syntax` mode (2.5.0)
- Date: planned by KT-86201 (listed in the 2.4.20 changelog, https://github.com/JetBrains/kotlin/releases/tag/v2.4.20); RC2 what's-new lists it Stable and default (https://kotlinlang.org/docs/whatsnew-eap.html). KEEP-0438 itself still says "Working on the implementation, it's not public yet" (https://github.com/Kotlin/KEEP/blob/main/proposals/KEEP-0438-name-based-destructuring.md), so the KEEP status line is stale.
- What it is: `val (x, y)` stays position-based; `(val x, val y)` is name-based.
- Decision: **watch only, not yet actionable.** Candidate "What Agents Get Wrong" entry once a 2.5 floor is adopted: an agent must not assume `val (a, b) = obj` became name-based. No rule in this pair needs it today because the pair has no destructuring row (grep for "destructur" in the pair returns nothing).

### C3. Value classes are being redefined (full value classes, `inline value class`)
- 2.5.0-RC2: full value classes (abstract value classes, value objects) are **Experimental** behind `-Xfull-value-classes` (https://kotlinlang.org/docs/whatsnew-eap.html). RC notes also carry KT-84904 "Alpha release of Multi-Field Value Classes" (https://github.com/JetBrains/kotlin/releases/tag/v2.5.0-RC).
- KEEP-0468 (commit of 2026-11-05 "Commit to Beta status in 2.5.20"): single-field value classes get the explicit spelling `inline value class`; `@JvmInline value class` "remains valid without a mandatory source migration"; after the migration period a bare `value class` means a full value class. Source: https://github.com/Kotlin/KEEP/blob/main/proposals/KEEP-0468-inline-value-classes.md. KEEP-0470 `@WillBecomeValue` is "Proposed"; KEEP-0471 Valhalla value classes is a design proposal (KEEP commit log, https://api.github.com/repos/Kotlin/KEEP/commits).
- Overlap: the pair says `@JvmInline public value class` (java-interop.md example) and KT-INTEROP-06, KT-API-05 treat `value class` as an inline wrapper. That stays correct today.
- Decision: **watch only, not yet actionable** until 2.5.20 Beta ships. Contingent amend of KT-INTEROP-06 and KT-API-05 wording then: always write `@JvmInline value class` (or `inline value class`), never bare `value class`, because the bare form will change meaning.

### C4. `@JvmExposeBoxed` and `-Xjvm-expose-boxed` give Java a way to reach value classes
- The pair never mentions this (grep for "JvmExpose" returns nothing) and KT-INTEROP-06 says a value-class member "is not callable from Java at all".
- Current docs: `@JvmExposeBoxed` at class, constructor or function level, or module-wide with `-Xjvm-expose-boxed`; opt-in `@OptIn(ExperimentalStdlibApi::class)`; inherited functions are not exposed unless overridden. Source: https://kotlinlang.org/docs/java-to-kotlin-interop.html (fetched 2026-11-27). Introduction version could not be determined from the page.
- Stability signal: Experimental in practice. The 2.4.20 and 2.5.0-Beta and RC changelogs list a stream of defects against it (KT-85954 and KT-85955 index-out-of-bounds, KT-88388 `NoSuchMethodError` from another module, KT-88339 missing null check, KT-87664 behaviour change when exposing an ordinary class constructor). Sources: https://github.com/JetBrains/kotlin/releases/tag/v2.4.20 and v2.5.0-Beta2.
- Decision: **amend KT-INTEROP-06** with a carve-out: the exposure annotation exists but is Experimental, so a published Java-facing surface must still not rely on it; if an adopter turns it on module-wide, require the javap gate to re-run and require a pinned Kotlin patch. Add to "What Agents Get Wrong": an agent adds `@JvmExposeBoxed` to make a value-class signature "Java friendly" and ships an experimental binary contract.
- Verification: `grep -rn -e 'JvmExposeBoxed' -e 'jvm-expose-boxed'`; javap gate from KT-INTEROP-06.

### C5. ktlint left Pinterest and changed its Maven group
- Date: 2.0.0-ALPHA-4 on 2026-08-21 (before the window, so the pair missed it); **2.0.0-ALPHA-5 on 2026-11-23** (in window). Latest stable is still 1.8.0 (2025-11-14). Source: https://github.com/ktlint/ktlint/releases/tag/2.0.0-ALPHA-5 and https://ktlint.github.io/ktlint/dev-snapshot/api/migrate-to-ktlint-2.x/.
- Facts: "This project is no longer maintained by Pinterest." Group changes from `com.pinterest.ktlint` to `io.github.ktlint.core` (ALPHA-4 notes wrote `io.github.ktlint`; ALPHA-5 and the migration page write `io.github.ktlint.core`). Packages move to `io.github.ktlint.core`. `kotlin-compiler-embeddable` is replaced by Kotlin Analysis API artifacts. Custom rules change to `RuleV2`. ALPHA-5 is built against Kotlin 2.5.0-RC2 and warns against production use. Stability: Alpha.
- Pair state: grep for "pinterest" in rules/kotlin-quality.md and skills/kotlin-quality-reference returns nothing; lint-gate.md names no ktlint coordinate.
- Decision: **new rule needed in lint-gate.md** (or an amend of KT-LINT-04/05 preamble): the ktlint gate pins stable 1.8.x under `com.pinterest.ktlint`; do not adopt 2.0.0-ALPHA for a gate of record; an agent must not rewrite `com.pinterest.ktlint` to a guessed group. Re-check when 2.0.0 stable ships.
- Verification: `grep -rn -e 'com.pinterest.ktlint' -e 'io.github.ktlint' --include='*.kts' --include='*.toml' .`; the pinned version must not match `ALPHA`.
- Open point: whether the Gradle plugin `org.jlleitschuh.gradle.ktlint` and Spotless already support the new group could not be determined.

### C6. Security: JetBrains Kotlin build cache deserialization (GHSA-r937-wjx7-w2jp)
- Published 2026-06-26, updated 2026-08-12, CVSS 6.7. "In JetBrains Kotlin before 2.4.20 code execution was possible via unsafe deserialization in the build cache metadata." Affected: `org.jetbrains.kotlin:kotlin-gradle-plugin` below 2.4.20-Beta1; fixed in 2.4.20-Beta1. Source: https://github.com/advisories/GHSA-r937-wjx7-w2jp (read through `gh api advisories`).
- The publication predates the window, but neither the pair nor the 2026-09-05 scan mentions it (the pair mentions 2.4.20 only in the KGP and Gradle table).
- Decision: **amend KT-COMP-06** (KGP and Gradle envelope): the KGP floor on any build that uses a shared or remote build cache is 2.4.20 or newer. Verification: `grep -rn 'kotlin' gradle/libs.versions.toml` shows `kotlin >= 2.4.20`.
- Other advisory searches in the window (maven ecosystem, published 2026-09-12 to 2026-11-27) found none for kotlin-stdlib, KGP, KSP, detekt, ktlint or Kover. The only detekt advisory found is the 2022 XXE one (GHSA-2cfc-865j-gm4w). Repository-level security advisory listings for JetBrains/kotlin, kotlinx.coroutines, detekt, ktlint, kotlinx-kover, google/ksp and Dokka returned empty.
- Roadmap item KT-83525 "18-month support window for stdlib security fixes" was completed since February 2026 (https://kotlinlang.org/docs/roadmap.html, last modified August 2026). Decision: watch only.

### C7. Kotlin 2.5.0 raises the minimum compiler JDK to 17
- RC2 what's-new: "Minimum compiler JDK raised to 17: now an error. Opt out with `-Xallow-pre-17-runtime-jdk`, which will be removed in Kotlin 2.5.20 or 2.6.0." Also Java 28 bytecode generation (https://kotlinlang.org/docs/whatsnew-eap.html).
- Pair: compiler-and-toolchain.md has `jvmToolchain` and `jvmTarget` rules (KT-COMP-04) but no statement about the JDK that runs the compiler.
- Decision: **amend KT-COMP-06** once 2.5.0 GA ships: Gradle daemon and kotlinc must run on JDK 17 or newer; never add `-Xallow-pre-17-runtime-jdk`. Until GA: watch only.

### C8. Kotlin Build Tools API and KGP execution mode
- 2.5.0-Beta2 (2026-10-21): KT-85434 "Gradle: drop support for non-BTA JVM compiler execution mode". 2.4.20 (2026-09-07): Build Tools API now carries diagnostic ids (KT-85567), a daemon crash fix for typos in key-value `freeCompilerArgs` (KT-85504), JS, Wasm and metadata compilation via BTA as Experimental. 2.5.0-Beta2: KT-86611 deprecates the hidden `kotlin.mpp.freeCompilerArgsForSourceSet` property. Sources: the v2.4.20 and v2.5.0-Beta2 release notes on GitHub, https://kotlinlang.org/docs/whatsnew2420.html.
- `freeCompilerArgs` itself: **unchanged**, not deprecated. The 2.5.0-RC2 page still shows `freeCompilerArgs.add("-X...")` as the opt-in mechanism.
- Amper: could not determine; the roadmap page (August 2026) does not mention it; "Kotlin Toolchain: a single entry point into Kotlin (KTC-5718)" is a New roadmap item with no release.
- Decision: **watch only, not yet actionable.**

### C9. Lombok plugin: `@Builder` disabled in Kotlin code
- 2.5.0-RC (2026-11-11): KT-90666 "Lombok: disable `@Builder` annotation in Kotlin code due to many issues". Source: https://github.com/JetBrains/kotlin/releases/tag/v2.5.0-RC. Roadmap lists "Improve the Lombok compiler plugin experience" as In focus.
- Pair mentions Lombok only as a nullability annotation flavour (KT-INTEROP-03). Decision: **watch only**; becomes an amend of java-interop.md if a fleet module uses Lombok builders from Kotlin.

### C10. Detekt, Kover, BCV, coroutines, Dokka, KSP in the window
- detekt: latest is 2.0.0-alpha.6 (2026-08-04, Kotlin 2.4.10, Gradle 9.6.1, JDK 25); no release in the window. Unchanged from lint-gate.md line 54. Source: https://github.com/detekt/detekt/releases.
- Kover: 0.9.10 (2026-09-28: concurrency fix in the reporter, duplicate project dependency check, skip of test tasks with no binary report) and 0.9.11 (2026-09-29: reverts the #827 skip). Sources: https://github.com/Kotlin/kotlinx-kover/releases/tag/v0.9.10 and v0.9.11. Decision: watch only; 0.9.11 is the pin to cite if testing.md names a Kover version. The "skip test tasks without binary report" behaviour was added then reverted, so it needs no rule.
- Standalone BCV: 0.18.2 on 2026-09-02, before the window. In-KGP `abiValidation` docs page dated 2026-04-28, no deprecation text, still needs `@OptIn(ExperimentalAbiValidation::class)`; the 2.4.0 what's-new says the DSL was "streamlined" and "deprecated some parts" with no stability level. Roadmap says coverage and BCV "in the Kotlin distribution" are completed (KT-71297). Decision for api-and-abi.md KT-API-03: watch only; confirm the DSL names against the 2.5 docs before touching the row.
- kotlinx.coroutines: no release since 1.11.0 (2026-05-08); only documentation commits in the window. Unchanged.
- Dokka 2.3.0 and KSP 2.3.14: covered in ksp-kapt-dokka-delta.md; not repeated.

### C11. Language items checked with no action
- Explicit backing fields: Stable in 2.4.0 (2026-06-03), outside the window. The pair does not mention explicit backing fields. Decision: watch only; there is no published-API rule to change because the feature is source-level only. Source: https://kotlinlang.org/docs/whatsnew24.html (the page's own release-date line says July 14, which conflicts with the GitHub tag of 2026-06-03; the GitHub date is used here).
- Rich errors and error union types: KEEP-0462 status is "Public discussion"; last edits 2026-07-15 (https://github.com/Kotlin/KEEP/blob/main/proposals/KEEP-0462-rich-errors.md). Not in 2.4.20, 2.4.21 or any 2.5.0 notes. Decision: watch only. KT-ERR rules are not affected.
- Collection literals: Experimental (`-Xcollection-literals`) in 2.4.0. Companion blocks and extensions: Experimental in 2.5.0 (`-Xcompanion-blocks-and-extensions`). KEEP-0472 flexible constructor bodies: Public discussion (commit 2026-11-06). All watch only.
- Kotlin roadmap (last modified August 2026, next update February 2027): no JetBrains-shipped Kotlin linter, no Error Prone or OpenRewrite K2 item. The detekt-plus-ktlint gate of record has no first-party replacement. Roadmap item "Default warnings/errors for unused non-Unit return values (KT-12719)" is In focus (matches C1). Source: https://kotlinlang.org/docs/roadmap.html.
- JSpecify: nothing new in the Kotlin notes beyond K2 bug fixes (KT-86319 `StackOverflowError` with mixed `@NullMarked` and `@NullUnmarked`, KT-63746). Unchanged.
- Java interop `@Jvm*`: KT-86286 `all-open` makes `@JvmRecord` classes non-final (error); KT-85626 `@JvmRecord` in commonMain breaks metadata compilation. No new `@Jvm*` annotation other than the value-class exposure in C4. Watch only.

## Per-claim verdicts for claims this pair makes

- "K1 removed in 2.4.0, language versions below 2.0 rejected": unchanged.
- "JSpecify is strict by default from 2.1.0": unchanged.
- "KGP and Gradle table, 2.4.20 maps to Gradle 9.7.0": unchanged (the 2.4.20 what's-new page states Gradle 7.6.3 through 9.7.0).
- "`-Xjvm-default` must be the typed `jvmDefault` property": could not determine for 2.5; the notes read for 2.4.20 through 2.5.0-RC2 contain no change to it.
- "Value classes are not callable from Java (KT-INTEROP-06)": changed in the sense of C4, old text still correct for the default compile; the new fact is an Experimental opt-in.

## Normative candidates in summary

1. compiler-and-toolchain.md: new rule, unused return value checker on and gated (C1), version-gated on 2.5 GA.
2. lint-gate.md: new carve-out, pin ktlint stable 1.8.x, no 2.0 alpha, record the group change (C5).
3. java-interop.md: amend KT-INTEROP-06 with the `@JvmExposeBoxed` carve-out and a new agent-failure entry (C4).
4. compiler-and-toolchain.md: amend KT-COMP-06 for KGP at or above 2.4.20 (C6) and for the JDK 17 compiler floor on 2.5 GA (C7).
5. Watch only: C2, C3, C8, C9, rich errors, Kover pin, BCV DSL.

## Sources fetched

1. https://api.github.com/repos/JetBrains/kotlin/releases (release list and notes for 2.4.20, 2.4.21, 2.5.0-Beta1, Beta2, RC, RC2)
2. https://kotlinlang.org/docs/whatsnew-eap.html (2.5.0-RC2)
3. https://kotlinlang.org/docs/whatsnew2420.html
4. https://kotlinlang.org/docs/whatsnew24.html
5. https://kotlinlang.org/docs/whatsnew23.html (checker section)
6. https://kotlinlang.org/docs/unused-return-value-checker.html
7. https://youtrack.jetbrains.com/api/issues/KT-87295, KT-74808 and KT-12719
8. https://kotlinlang.org/docs/roadmap.html
9. https://kotlinlang.org/docs/java-to-kotlin-interop.html
10. https://kotlinlang.org/docs/gradle-binary-compatibility-validation.html
11. https://github.com/Kotlin/KEEP (commit log since 2026-09-12; KEEP-0412, 0438, 0462, 0468, 0470, 0472)
12. https://github.com/Kotlin/kotlinx.coroutines (releases, CHANGES.md, commit log)
13. https://github.com/detekt/detekt/releases
14. https://github.com/ktlint/ktlint/releases (2.0.0-ALPHA-4, ALPHA-5) and the ktlint 2.x migration page
15. https://github.com/Kotlin/kotlinx-kover/releases (0.9.10, 0.9.11)
16. https://github.com/Kotlin/binary-compatibility-validator/releases
17. https://github.com/Kotlin/dokka/releases
18. GitHub advisory database queries (GHSA-r937-wjx7-w2jp, in-window maven search, repository advisory lists)
19. https://kotlinlang.org/docs/whatsnew25.html and https://kotlinlang.org/docs/compatibility-guide-25.html returned 404; not used.
20. jvm-topic-map/recent-shifts.md and the pair's own files (read for the baseline).

Not determinable: the exact name of the Gradle DSL option from KT-74808; whether kotlinx.coroutines marks `async` as must-use; the introduction version of `@JvmExposeBoxed`; Spotless and Gradle ktlint plugin support for the new ktlint group.

---
title: Kotlin ABI validation, opt-in and Java interop delta, 2026-09-12 to 2026-11-27
pair: kotlin-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 16
---

# Delta verdict

No KT-API or KT-INTEROP row is falsified. One text claim is stale and needs a re-date: the current-patch statement in java-interop.md Scope. One decision is flagged for the owner: KT-API-03's pinned default (standalone BCV) still holds, but the reasons to keep it are unchanged and not weakened.

Fetch limits: kotlinlang.org pages are summarised by the fetch tool, not read raw, so "unchanged" means the page text returned contained the baseline fact and no contradicting text. Where a page did not contain a fact, this file says "could not determine" or cites another source.

# Per-claim decisions

## KT-API-03 and rules/kotlin-quality.md gate block (ABI validation)

Decision: unchanged, re-date to 2026-11-27. FLAG for owner below.

- Task names `updateKotlinAbi` and `checkKotlinAbi`: unchanged. The kotlinlang page (footer 28 April 2026) lists exactly `./gradlew checkKotlinAbi` and `./gradlew updateKotlinAbi`.
- Wiring into `check`: the page says that by default `check` also runs `checkKotlinAbi`. The baseline text says "its check task wired into `check`" as a requirement, which stays correct. The `./gradlew :module:check --dry-run` verification still works.
- DSL: `kotlin { abiValidation() }` or `abiValidation { ... }` unchanged. New detail the page shows: `binariesSource = MAVEN_PUBLICATIONS`, `keepLocallyUnsupportedTargets`, `filters { excluded/included }`. KGP source at tag v2.4.21 exposes `checkTaskProvider` and marks the extension `@ExperimentalAbiValidation`; the old name for it is deprecated and errors. A build that reads the old property name breaks; the rule text does not name it, so no change.
- Still Experimental: unchanged. In the KGP source, `ExperimentalAbiValidation` is `@RequiresOptIn(... Level.ERROR)` with the message "The ABI Validation DSL is experimental and may be changed or removed in any future release." Fetched from the JetBrains/kotlin repository master.
- KT-71172 "Stabilize migrated ABI Validation in Kotlin": still open. YouTrack REST API (fetched 2026-11-27): state Submitted, resolved null, Planned for empty, Available in empty, affected version 2.2.0, last updated 2026-04-24. Not closed, no stabilisation version planned.
- BCV standalone: not archived (`archived: false`). Latest release is 0.18.2, published 2026-09-02, before the baseline date, so the baseline already covered it. No release in the window. README still carries "This plugin is in maintenance mode" and the Kotlin Alpha badge; it points to the "experimental binary compatibility validation in the Kotlin Gradle plugin".
- Requirements text "Standalone BCV 0.18.x needs Gradle 6.1.1+ and Kotlin 1.6.20+; `abiValidation()` needs Kotlin 2.2.0+": the Kotlin 2.2.0 floor is confirmed by api-guidelines-backward-compatibility.html ("Starting with version 2.2.0, the Kotlin Gradle plugin supports binary compatibility validation"). The standalone Gradle/Kotlin floors were not re-fetched from the README in this run (README head only was read): could not determine whether they changed; 0.18.2 is the unchanged latest release, so a change is unlikely.
- Kotlin 2.4.0 what's-new mentions "binary compatibility validation DSL changes" and an `AbiValidationToolchain` in the Build Tools API, with no detail. Could not determine what the DSL changes are. Action for the next full refresh: read the 2.4.0 compatibility guide.

FLAG for owner (not a rewrite): the pinned default (standalone BCV) rests on two things, maintenance mode without an Experimental opt-in. Both still hold at 2026-11-27: `abiValidation()` is still Experimental with a compile-error opt-in, and KT-71172 is still open. Stabilisation has not happened, so the pin's rationale is intact. The risk is the other direction: standalone is in maintenance mode, and JetBrains states new features go only to the KGP tool. Re-check when KT-71172 closes or a Kotlin release note calls `abiValidation()` Beta or Stable.

## api-and-abi.md Wrong-move 6 (`@OptIn(ExperimentalAbiValidation::class)` required)

Unchanged. The current kotlinlang example still wraps `abiValidation()` in `@OptIn(org.jetbrains.kotlin.gradle.dsl.abi.ExperimentalAbiValidation::class)`, and the annotation is `RequiresOptIn.Level.ERROR`, so omitting it fails compilation. The fetch tool noted some page examples omit the annotation; the source file settles it: required.

## KT-API-07 (`@IntroducedAt`)

Unchanged, re-date. kotlinlang api-guidelines-backward-compatibility.html calls it "Experimental" and requires `@OptIn(ExperimentalVersionOverloading::class)`. The Kotlin 2.4.0 what's-new page (released 2026-07-14) still lists it under Experimental features with the same opt-in. The baseline words "Experimental as of Kotlin 2.2" are not wrong; "as of Kotlin 2.4" is now the better dating. The same guideline page also says `@JvmOverloads` "doesn't preserve binary compatibility for Kotlin callers" and recommends `@IntroducedAt` or manual overloads, consistent with the row.

## KT-API-01 (explicit API spellings)

Unchanged. whatsnew14.html still shows `explicitApi()`, `explicitApi = ExplicitApiMode.Strict`, and `-Xexplicit-api={strict|warning}`. The Kotlin DSL property form is the same. Did not find a status change in the 2.4.x notes.

## KT-API-02 (Dokka)

Unchanged for the task name: dokka-gradle.html (page dated 18 December 2025) lists `./gradlew :dokkaGeneratePublicationHtml`, and `dokkaGenerateHtml` is an alias. `failOnWarning` exists in dokka-gradle-configuration-options.html with default false. That page shows it as `dokkaPublications.html { failOnWarning.set(...) }` and as `publication.failOnWarning.set(true)` in a convention plugin. The row's `dokkaPublications.configureEach { failOnWarning = true }` spelling is not shown verbatim; it is the same property on the same container, but could not determine from a fetched page that the `= true` assignment form is documented. Maven Central lists dokka-gradle-plugin 2.3.0 as latest, newer than the 2.2.0 the docs and the row cite; its release date was not fetched, so could not determine whether it falls in the window. The row says "K2-stable from 2.2.0"; that stays true.

## KT-API-08 (`@SubclassOptInRequired` and nested classes)

Unchanged. opt-in-requirements.html states twice that the requirement "is not propagated to any inner or nested classes", with an example.

## api-and-abi.md Scope and KT-INTEROP-02 (nullability severities)

Unchanged. java-interop.html (footer 17 November 2026): "By default, the Kotlin compiler reports nullability mismatches for JSpecify annotations as errors", `strict` is the default, and JSpecify is "the only supported flavor that uses `strict` report level by default". JSR-305: "The default behavior is the same to `-Xjsr305=warn`". The page states no Kotlin version, so the "from Kotlin 2.1.0" part of the row rests on the baseline fetch and is not re-verified here.

## KT-INTEROP-03 (flavour list)

Unchanged. The page lists JetBrains, JSpecify, Android (four packages), JSR-305, FindBugs, Eclipse, Lombok `lombok.NonNull`, RxJava 3, Vert.x. Checker Framework is not mentioned. The row's claim that Checker Framework sits outside the set is consistent, but it is an absence on this page, and the page defers to compiler source for the full list.

## KT-INTEROP-06 (value classes and `@JvmExposeBoxed`)

Unchanged for the core claim, but the row needs a carve-out (change flagged, new text proposed below). Facts:
- `@JvmExposeBoxed` is still Experimental: java-to-kotlin-interop.html says "you must opt in by using `@OptIn(ExperimentalStdlibApi::class)`". Also `-Xjvm-expose-boxed` applies it module-wide. No stabilisation in the 2.4.0 or 2.4.20 notes. Not stabilised.
- The mechanism: it generates a public boxed constructor and a boxed variant of annotated functions that Java can call. It does not generate for inherited functions unless overridden.
- inline-classes.html confirms mangling `compute-<hashcode>` and says a manual `@JvmName` makes such a function callable from Java.
- So "the member is not callable from Java at all" is imprecise on two counts that predate the window: `@JvmName` un-mangles, and `@JvmExposeBoxed` adds a callable variant. The baseline row's grep (hyphen in the javap output) remains a sound detector for the default case.

Proposed change, for owner decision, not applied: append to the KT-INTEROP-06 rule cell "Exception: a member annotated `@JvmExposeBoxed` (Experimental, needs `@OptIn(ExperimentalStdlibApi::class)`, or the `-Xjvm-expose-boxed` option) or given an explicit `@JvmName` is callable from Java; review that the Experimental opt-in is deliberate." Verification: `grep -rn -E 'JvmExposeBoxed|jvm-expose-boxed' src build.gradle.kts`, each hit read as a deliberate decision; and the existing javap hyphen grep. Rationale: avoids a false positive on a member that is intentionally exposed and keeps the Experimental opt-in visible. Source: https://kotlinlang.org/docs/java-to-kotlin-interop.html (inline value classes section) and https://kotlinlang.org/docs/inline-classes.html.

## java-interop.md Scope ("Kotlin 2.4.0, 2.4.10 being the current patch")

Changed (re-date needed). Maven Central kotlin-stdlib lists 2.4.0, 2.4.10, 2.4.20, 2.4.21, and 2.5.0-RC2 as latest. The Kotlin 2.4.20 what's-new page says 2.4.20 was released 2026-09-07 (before the window start, after the 2026-09-05 baseline fetch). Old text: "read from kotlinlang.org at Kotlin 2.4.0, 2.4.10 being the current patch". New fact: the 2.4 line is at 2.4.21, 2.5.0 is in RC. The pages in this delta carry footer dates of 17 November 2026 (java-interop) and are not version-tagged, so they now reflect the 2.4.x state at least through 2.4.20. Suggested new text: "read from kotlinlang.org on 2026-11-27, Kotlin 2.4.21 being the current patch and 2.5.0-RC2 the newest candidate." Release date of 2.4.21 and 2.5.0-RC2 not fetched; could not determine.

The Kotlin 2.4.20 what's-new page contains nothing on ABI validation, explicit API, JSpecify, nullability, value classes, `@JvmExposeBoxed`, version overloading or Dokka. The 2.4.0 page contains only the `@IntroducedAt` and ABI DSL mentions above. Kotlin 2.4.20 is compatible with Gradle 7.6.3 through 9.7.0 (2.4.0: through 9.5.0); no row cites Gradle's upper bound.

# Normative candidates

1. KT-INTEROP-06 carve-out for `@JvmExposeBoxed` and `@JvmName`. Rationale and verification in the section above. Severity: SHOULD refine, wording only.
2. Re-date all "verified 2026-09-12" stamps for the rows above to 2026-11-27 only where this file says unchanged; keep 2026-09-12 where it says could not determine (the standalone BCV Gradle/Kotlin floors, the "Kotlin 2.1.0" JSpecify origin, the Dokka `= true` spelling).

# Sources fetched

- https://kotlinlang.org/docs/gradle-binary-compatibility-validation.html
- https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html
- https://kotlinlang.org/docs/api-guidelines-simplicity.html
- https://kotlinlang.org/docs/opt-in-requirements.html
- https://kotlinlang.org/docs/java-interop.html
- https://kotlinlang.org/docs/java-to-kotlin-interop.html
- https://kotlinlang.org/docs/inline-classes.html
- https://kotlinlang.org/docs/whatsnew24.html
- https://kotlinlang.org/docs/whatsnew2420.html
- https://kotlinlang.org/docs/whatsnew14.html
- https://kotlinlang.org/docs/dokka-gradle.html
- https://kotlinlang.org/docs/dokka-gradle-configuration-options.html
- https://github.com/Kotlin/binary-compatibility-validator (page, README raw, REST API repo and releases)
- https://youtrack.jetbrains.com/api/issues/KT-71172 (REST; the HTML page returned empty)
- https://raw.githubusercontent.com/JetBrains/kotlin/master/libraries/tools/kotlin-gradle-plugin-api/src/common/kotlin/org/jetbrains/kotlin/gradle/dsl/abi/ExperimentalAbiValidation.kt
- https://repo.maven.apache.org/maven2/org/jetbrains/kotlin/kotlin-stdlib/maven-metadata.xml and .../dokka-gradle-plugin/maven-metadata.xml

Not found or not usable: whatsnew2410.html (404), jvm-api-guidelines-backward-compatibility.html (redirect stub), dokka-gradle-configuration.html (404), gradle-configure-project.html and gradle-compiler-options.html (no explicit API content).

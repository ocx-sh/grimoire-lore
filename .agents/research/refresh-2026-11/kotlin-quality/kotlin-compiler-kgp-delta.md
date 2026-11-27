---
title: Kotlin compiler and KGP delta, 2026-09-12 to 2026-11-27
pair: kotlin-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 12
---

# Kotlin compiler and KGP delta, 2026-09-12 to 2026-11-27

This is a delta update. Baseline is `jvm-platform-and-toolchains.md` and `kotlin-toolchain-and-codegen.md` (2026-09-12). Anything not listed as changed stays as written. Every statement below was read on the page cited; the two URLs that returned 404 (`whatsnew25.html`, `compatibility-guide-25.html`) are not counted and were not used.

## Contents

- Release state as of 2026-11-27
- Per-claim verdicts
- Normative candidates
- AI-agent angle
- Contested and evolving
- Sources

## Release state as of 2026-11-27

- Current stable Kotlin and KGP: **2.4.21**, released 2026-10-08 (GitHub releases marks it "Latest"; the compatibility page uses 2.4.21 in its examples). 2.4.20 was released 2026-09-07, five days before the baseline, and 2.4.10 is no longer the current patch.
- **2.5.0 is a Release Candidate, not GA.** Beta1 2026-09-23, Beta2 2026-10-21, RC 2026-11-11, RC2 2026-11-25. No 2.5.0 GA is listed. Release dates come from the GitHub releases page, which shows day and month only; the year is inferred from the 2026 footer and the 2.4.21 asset timestamps.
- Sources: [GitHub releases](https://github.com/JetBrains/kotlin/releases), [gradle-configure-project](https://kotlinlang.org/docs/gradle-configure-project.html), [whatsnew-eap](https://kotlinlang.org/docs/whatsnew-eap.html) (titled "What's new in Kotlin 2.5.0-RC2").

## Per-claim verdicts

### KT-COMP-01 (context flags)
- "all three Stable and flag-retired in 2.2.0": **unchanged**. No page in the window revisits it. Not re-read in a 2.2.0 source this run.
- "`-Xcontext-parameters` Stable in 2.4.0, 2026-07-14": **unchanged**, with one nuance. [whatsnew24](https://kotlinlang.org/docs/whatsnew24.html) says context parameters "except for context arguments and callable references" are Stable. The compiler reference ([compiler-reference](https://kotlinlang.org/docs/compiler-reference.html)) still lists `-Xexplicit-context-arguments`, so that subset remains behind a flag. Candidate: scope the sentence to "context parameters, except context arguments and callable references".
- "`-Xcontext-receivers` is a defect on 2.2.0 or newer": **unchanged**. The compiler reference does not document the flag.
- New `-X` flags stabilised or retired in 2.4.20 or the 2.5.0 previews that belong in the grep: **none found**. 2.4.20 ([whatsnew2420](https://kotlinlang.org/docs/whatsnew2420.html), 2026-09-07) removed `-Xklib-normalize-absolute-path` (KT-85591, per [ChangeLog.md](https://raw.githubusercontent.com/JetBrains/kotlin/master/ChangeLog.md)), a Native klib flag outside this pair. 2.5.0-RC2 adds Experimental `-Xcompanion-blocks-and-extensions`, `-Xfull-value-classes`, `-Xstrict-equality-for-structural-classes` and the opt-out `-Xklib-ir-inliner=disabled`. None is a retirement.
- ChangeLog KT-86473 and KT-86405 (2.4.20) add warnings for removed or deprecated CLI arguments in general. This makes stale `-X` flags louder; it does not name new ones.

### KT-COMP-02 / KT-COMP-03 / rules row 5 (`jvmDefault`)
- Values `ENABLE`, `NO_COMPATIBILITY`, `DISABLE`, default `ENABLE`: **unchanged** ([gradle-compiler-options](https://kotlinlang.org/docs/gradle-compiler-options.html), [compiler-reference](https://kotlinlang.org/docs/compiler-reference.html)).
- "Is `-Xjvm-default` removed rather than deprecated?": **could not determine.** The compiler reference documents only the stable `-jvm-default` (`enable` is "(Default)") and says nothing about `-Xjvm-default` being removed or deprecated. No removal appears in the 2.4.20 or 2.4.21 ChangeLog entries read, and the compatibility guide for 2.4 lists none. Keep "deprecated". Do not write "removed".
- "default flipped to `ENABLE` in 2.2.0": **unchanged** (whatsnew22 not re-read; the current table still shows `ENABLE`).

### KT-COMP-04 and index row 4 (`jvmTarget` default)
- **Unchanged.** [gradle-compiler-options](https://kotlinlang.org/docs/gradle-compiler-options.html) lists default `"1.8"` with values `"1.8"` through `"26"`; [compiler-reference](https://kotlinlang.org/docs/compiler-reference.html) says "The default value is `1.8`" with values up to `26`. The 2.5.0 RC page notes the compiler "can generate classes containing Java 28 bytecode", but does not move the default. If the rule text states an upper bound on `jvmTarget`, it is now 26 on the docs and 28 as a bytecode capability in 2.5.0-RC2; the baseline text should not name a bound.
- Related, from [whatsnew-eap](https://kotlinlang.org/docs/whatsnew-eap.html): 2.5.0-RC2 errors when the compiler itself runs on a JDK older than 17, opt-out `-Xallow-pre-17-runtime-jdk`, to be removed in 2.5.20 or 2.6.0. This concerns the JDK floor, owned by JAVA-PLAT; recorded here for cross-reference only.

### KT-COMP-05 (`kotlin.jvm.target.validation.mode`)
- **Unchanged.** [gradle-configure-project](https://kotlinlang.org/docs/gradle-configure-project.html): `error` is "the default value for projects on Gradle 8.0+", `warning` below 8.0.

### KT-COMP-06 (KGP to Gradle table)
- Read the current table on [gradle-configure-project](https://kotlinlang.org/docs/gradle-configure-project.html).
- **Changed (add row).** New text: "2.4.20 through 2.4.21 | 7.6.3 to 9.7.0 (AGP 8.5.2 to 9.3.1)". The old row "2.4.20 | 9.7.0" becomes "2.4.20 to 2.4.21 | 9.7.0".
- Unchanged: "2.4.0 through 2.4.10 | 9.5.0" (AGP 8.5.2 to 9.1.0). Minimum across 2.4.x stays Gradle 7.6.3; [whatsnew2420](https://kotlinlang.org/docs/whatsnew2420.html) states "Gradle 7.6.3 through 9.7.0".
- No 2.5.x row is published. Gradle's own release content is out of scope.

### KT-COMP-07 (language versions)
- 1.8 and 1.9 dropped, K1 removed in 2.4.0: **unchanged** ([whatsnew24](https://kotlinlang.org/docs/whatsnew24.html): "Starting with Kotlin 2.4.0, the compiler no longer supports `-language-version=1.9`"; [compatibility-guide-24](https://kotlinlang.org/docs/compatibility-guide-24.html): 2.2.0 warning, 2.4.0 error, KT-80590).
- "Is `-language-version 2.0` deprecated or scheduled for removal?": **changed, in the sense that the docs now state the rule.** [compiler-reference](https://kotlinlang.org/docs/compiler-reference.html): "You can configure one of the latest three stable versions of Kotlin as the language version. For example, Kotlin 2.5.0 supports language versions as old as 2.2." Under that rule, 2.4.x supports 2.1 through 2.4, and 2.5.0 will drop 2.0 and 2.1 (its minimum is 2.2). The [gradle-compiler-options](https://kotlinlang.org/docs/gradle-compiler-options.html) table still lists `"2.0"` through `"2.5" (EXPERIMENTAL)`, so the two pages disagree until 2.5.0 ships; the compiler reference describes the 2.5.0 target. This is a documented rule plus a statement about 2.5.0, not a dated deprecation notice for 2.0; no YouTrack issue was fetched. Also 2.4.20 ChangeLog KT-85703 drops pre-2.0 language features from K2 and common code, and KT-85667 adds experimental language version 2.6.

### KT-COMP-12 and lint-gate Group 3 / KT-LINT-06/07 (warning flags)
- "`extraWarnings` experimental since 2.1.0 and not promoted through 2.4.0": **could not determine for 2.4.20 through 2.5.0-RC2.** Neither the compiler reference nor the options page labels `-Wextra` or `extraWarnings` as Experimental or Stable, and neither gives a since-version; both describe it with default `false`. The 2.4.20 and 2.5.0-RC2 release notes do not mention it. Rewrite the claim as "not promoted through 2.4.0 (verified 2026-09-12); the 2026-11-27 reference pages show no stability label" rather than assert "still experimental".
- "`-Xsuppress-warning=NAME` still Experimental": **could not determine.** The current [compiler-reference](https://kotlinlang.org/docs/compiler-reference.html) does not document `-Xsuppress-warning` at all. It documents `-nowarn`, `-Werror`, `-Wextra` and **`-Xwarning-level=DIAGNOSTIC_NAME:(error|warning|disabled)`**, where `disabled` "suppresses only the specified warning module-wide" and `error` raises one warning. I found no source (official or otherwise) stating that `-Xsuppress-warning` is deprecated; forum reports are mixed on whether it still works and are not sources.
- "An unknown warning name is itself a compile error": **could not determine.** The reference says nothing about unknown names. Keep with the date 2026-09-12 and the baseline's own source.
- Consequence for KT-LINT-07: "after promotion, the per-name escape hatch is gone" may now be wrong. `-Werror -Xwarning-level=NAME:warning` is the documented per-warning exemption from a blanket promotion. **Changed (candidate).** Verify it with `kotlinc -Xwarning-level=X:warning -Werror` before wording a rule, because the page gives no behaviour for names that are errors rather than warnings.

### KT-COMP-13 (daemon JVM arguments)
- Read [gradle-compilation-and-caches](https://kotlinlang.org/docs/gradle-compilation-and-caches.html). It lists **five** ways, each overriding the previous: (1) Gradle daemon arguments inheritance (`org.gradle.jvmargs`), (2) `kotlin.daemon.jvm.options` system property, (3) `kotlin.daemon.jvmargs`, (4) `kotlin { kotlinDaemonJvmArgs }`, (5) `CompileUsingKotlinDaemon` task arguments.
- **Could not determine whether this changed in the window.** The baseline says "four levels" and numbers `kotlin.daemon.jvmargs` as level 2, which does not match the five-item list now shown (where it is third). Change "Four precedence levels" to "Five ways, each overriding the one before" and renumber, citing the page. Either the baseline miscounted or the page was edited; the page has no revision date.
- **buildSrc exception: not supported by the page.** The page does not mention buildSrc at all. The claim that the buildSrc daemon reads `-Dkotlin.daemon.jvm.options` inside `org.gradle.jvmargs` rests only on the in-repo comment in ktor's `gradle.properties` (baseline). Keep it, but cite ktor, not the Kotlin docs, as its source; the docs link in KT-COMP-13 currently implies docs support.
- Also new on the page: KGP applies `ReservedCodeCacheSize=320m` by default when unset.

### `freeCompilerArgs` "slated for future deprecation"
- **Unchanged.** [gradle-compiler-options](https://kotlinlang.org/docs/gradle-compiler-options.html) still reads "We are going to deprecate the attribute `freeCompilerArgs` in future releases." No deprecation shipped in 2.4.20, 2.4.21 or 2.5.0-RC2 (release notes read). The KT-COMP-02 wrong/right example is unaffected.

## Normative candidates

1. **Scope KT-COMP-01 to "context parameters except context arguments and callable references".** Rationale: whatsnew24 carves those out and `-Xexplicit-context-arguments` still exists. Verify: `grep -rn 'Xcontext-receivers\|Xcontext-parameters' --include=*.gradle.kts` stays the grep; reader checks any `-Xexplicit-context-arguments` hit is intentional.
2. **Add the 2.4.20 to 2.4.21 row to the KT-COMP-06 table** (7.6.3 to 9.7.0). Rationale: 2.4.21 is now the current patch. Verify: compare to the gradle-configure-project table.
3. **Re-word the KT-LINT-07 escape-hatch sentence** to mention `-Xwarning-level=NAME:warning` as the documented exemption from `-Werror`. Rationale: removes a claim the reference now contradicts. Verify: `grep -rn 'Xwarning-level' --include=*.gradle.kts`.
4. **Re-word KT-COMP-13**: five ways, and source the buildSrc exception to ktor. Verify: `grep -n 'kotlin.daemon' gradle.properties` on a project with `buildSrc/`.
5. **Date KT-COMP-12** "verified 2026-09-12; no stability label on the 2026-11-27 pages". Verify: reference pages.
6. **Do not name `-language-version 2.0` as a safe floor**; state "latest three stable versions". Rationale: 2.5.0 will accept only 2.2 or newer. Verify: `grep -rn 'languageVersion\|language-version'`.

## AI-agent angle

- An agent trained before 2026 writes `-Xsuppress-warning=NAME` or `-Xsuppress-version-warnings`. Check: run `kotlinc -X` on the build's compiler and diff against the grep hits.
- An agent says "KGP 2.4.10 is current" or "2.5.0 is released". Check: version catalogue against 2.4.21; any 2.5.0 value must read `-RC2` or lower.
- An agent assumes `jvmTarget` follows the JDK. The docs default is `"1.8"`, though a Gradle toolchain overrides it; check `grep -rn 'jvmTarget\|jvmToolchain'`.

## Contested and evolving (as of 2026-11-27)

- 2.5.0 is RC2; GA date unannounced. The gradle-configure-project table has no 2.5 row. Re-check after GA.
- The Kotlin roadmap ([roadmap](https://kotlinlang.org/docs/roadmap.html), updated August 2026, next February 2027) names no flag deprecations. It lists KT-12719 (default warnings for unused non-Unit returns). Separately, [whatsnew-eap](https://kotlinlang.org/docs/whatsnew-eap.html) says the unused return value checker is now Stable and enabled by default in 2.5.0-RC2; this may become a new default-warnings item for KT-LINT, outside the commission.
- Build Tools API is planned on by default from 2.5.0 ([whatsnew2420](https://kotlinlang.org/docs/whatsnew2420.html)).
- Compiler reference and options page disagree on supported language versions until 2.5.0 ships.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://kotlinlang.org/docs/whatsnew2420.html | 2.4.20 release notes | 2026-09-07 | Gradle 7.6.3 to 9.7.0, BTA, compiler items |
| https://github.com/JetBrains/kotlin/releases | Release list | to 2026-11-25 | 2.4.21 latest, 2.5.0-RC2 |
| https://github.com/JetBrains/kotlin/releases/tag/v2.5.0-RC2 | RC2 notes (partial) | 2026-11-25 | No flag removals in the portion shown |
| https://raw.githubusercontent.com/JetBrains/kotlin/master/ChangeLog.md | Changelog (first 100k characters) | 2.4.20, 2.4.21 | KT ids; no 2.5.0 section in range read |
| https://kotlinlang.org/docs/whatsnew-eap.html | 2.5.0-RC2 notes | 2026-11-25 | Experimental flags, JDK 17 error |
| https://kotlinlang.org/docs/whatsnew24.html | 2.4.0 notes | 2026-07-14 | Context parameters, K1 removal |
| https://kotlinlang.org/docs/compatibility-guide-24.html | 2.4 compatibility | 2.4.x | Language version removal cycle; no 2.5 items |
| https://kotlinlang.org/docs/gradle-configure-project.html | KGP table, validation mode | current | New 2.4.20 to 2.4.21 row |
| https://kotlinlang.org/docs/gradle-compiler-options.html | DSL options | current | jvmTarget, jvmDefault, freeCompilerArgs note |
| https://kotlinlang.org/docs/compiler-reference.html | CLI reference | current | -Xwarning-level, language-version rule |
| https://kotlinlang.org/docs/gradle-compilation-and-caches.html | Daemon arguments | current | Five precedence ways |
| https://kotlinlang.org/docs/roadmap.html | Roadmap | 2026-08 | No flag deprecations listed |

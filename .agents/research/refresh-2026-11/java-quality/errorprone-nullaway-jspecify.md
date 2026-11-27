---
title: Error Prone, NullAway, JSpecify and the two Gradle plugins, delta 2026-09-12 to 2026-11-27
pair: java-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 24
---

# Error Prone, NullAway, JSpecify and the two Gradle plugins: delta

This is a delta update of the baseline `jvm-quality-gates.md` (2026-09-12). Everything that upstream did not change stays as it is. All facts below were read from primary sources on 2026-11-27: GitHub release bodies (via the GitHub API), raw files at named release tags, the NullAway wiki raw pages, the plugin READMEs and Maven Central metadata.

## Summary

- Latest releases on 2026-11-27: `error_prone_core` 2.53.0 (2026-11-18), NullAway 0.14.4 (2026-11-16), JSpecify 1.0.1 (2026-07-29), `net.ltgt.errorprone` 5.2.0 (2026-10-30), `net.ltgt.nullaway` 3.3.0 (2026-10-05).
- The pair's "floors verified 2026-09-12" line pins Error Prone 2.36.0, NullAway 0.12.11 and JSpecify 1.0, all of which were already stale on 2026-09-12 (the then-latest were 2.50.0, 0.14.1 and 1.0.1). Only the two plugin floors (5.1.1, 3.2.0) were the latest at the time.
- One change moves the toolchain matrix: Error Prone 2.43.0 (2025-10-22, before the window but after the pinned floor) requires JDK 21 to run. Error Prone 2.42.0 is the last version that runs on JDK 17. The pair's CI matrix 17 / 21 / 25 therefore cannot compile with Error Prone 2.43.0 or later on its 17 leg.
- NullAway 0.13.0 (2026-01-20) raised its own floor to JDK 17 and Error Prone 2.36.0. That does not conflict with floor 17.
- Error Prone 2.46.0 (2026-01-08) requires `-XDaddTypeAnnotationsToSymbol=true` on every Error Prone invocation on JDK 21, not only in NullAway's `jspecifyMode`.
- The `jspecifyMode` JDK and vendor matrix on the NullAway wiki is unchanged: JDK 22+, or 21.0.8+ / 17.0.19+ with the flag, never Oracle JDK 17 or 21, and `IllegalStateException` since 0.12.11.
- No named check moved between the three built-in sets between 2.36.0 and 2.53.0, with one exception: `InterruptedInCatchBlock` did not exist in any set at 2.36.0 and was added to `ENABLED_WARNINGS` in 2.47.0 (2026-02-05).
- The three set counts at 2.53.0 are 187 `ENABLED_ERRORS`, 310 `ENABLED_WARNINGS` and 156 `DISABLED_CHECKS`. The pair's "150 / 187 / 312" does not reproduce at any tag I counted, including 2.36.0.
- `GuardedByUtils` recognises exactly five packages at 2.53.0 (unchanged claim), but the fifth, `com.android.internal.annotations.GuardedBy`, arrived in 2.48.0 (2026-02-24 commit). At 2.36.0 the checker matched the simple name `GuardedBy` in any package.
- `ThreadSafeChecker` (bug pattern name `ThreadSafe`) is still in none of the three sets at 2.53.0. JAVA-CONC-16's clause stands.
- JSpecify shipped 1.0.1 (2026-07-29) with no semantic change; the four annotations are unchanged.
- NullAway#1290 closed 2026-10-24 and shipped in 0.14.4; JAVA-NULL-06's citation is now a closed issue, though the wiki still lists full generic-method inference as outstanding.

## Findings

### 1. Current versions and release dates

| Tool | Latest on 2026-11-27 | Released | Source |
|---|---|---|---|
| `com.google.errorprone:error_prone_core` | 2.53.0 | 2026-11-18 | [Error Prone releases](https://github.com/google/error-prone/releases/tag/v2.53.0) |
| NullAway | 0.14.4 | 2026-11-16 | [NullAway releases](https://github.com/uber/NullAway/releases/tag/v0.14.4) |
| JSpecify | 1.0.1 | 2026-07-29 | [JSpecify 1.0.1](https://github.com/jspecify/jspecify/releases/tag/v1.0.1) |
| `net.ltgt.errorprone` | 5.2.0 | 2026-10-30 | [plugin release](https://github.com/tbroyer/gradle-errorprone-plugin/releases/tag/v5.2.0) |
| `net.ltgt.nullaway` | 3.3.0 | 2026-10-05 | [plugin release](https://github.com/tbroyer/gradle-nullaway-plugin/releases/tag/v3.3.0) |

Releases inside the window:

- Error Prone 2.51.0 (2026-10-22), 2.52.0 (2026-11-02), 2.53.0 (2026-11-18). Release 2.50.0 (2026-06-10) is before the window.
- NullAway 0.14.2 (2026-09-25), 0.14.3 (2026-10-22), 0.14.4 (2026-11-16).
- `net.ltgt.errorprone` 5.2.0 (2026-10-30) adds `-XepPrintTimings` and `-XepRecordTimings` support. Nothing else.
- `net.ltgt.nullaway` 3.3.0 (2026-10-05) lets the project-level extension configure check severity and exposes NullAway's additional checks in the DSL. Release 3.2.0 (2026-08-25, before the window) added `jspecifyExperimental` and `jspecifyJdkModels`.
- JSpecify: no release in the window.

The pair's Group 1 line "Floors verified 2026-09-12: `error_prone_core` 2.36.0, `net.ltgt.errorprone` 5.1.1, `net.ltgt.nullaway` 3.2.0, NullAway 0.12.11, JSpecify 1.0 (2024-07-17)" is therefore status **changed** for four of five values (plugins: 5.1.1 to 5.2.0 and 3.2.0 to 3.3.0 inside the window; Error Prone, NullAway and JSpecify were already behind on 2026-09-12). Whether to keep old numbers as "floors" is a decision for the pair author; if they are floors, they must be stated as floors and the JDK consequence in section 3 must be stated with them.

### 2. Set membership at 2.53.0

Method: fetched `core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java` at tags v2.36.0, v2.50.0, v2.51.0, v2.52.0 and v2.53.0 from raw.githubusercontent.com, and counted `Name.class` entries inside each of the three `getSuppliers(...)` blocks (comments stripped). Source for 2.53.0: [BuiltInCheckerSuppliers.java at v2.53.0](https://github.com/google/error-prone/blob/v2.53.0/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java).

| Release | `ENABLED_ERRORS` | `ENABLED_WARNINGS` | `DISABLED_CHECKS` |
|---|---|---|---|
| 2.36.0 (2024-11-19) | 180 | 275 | 139 |
| 2.50.0 (2026-06-10) | 186 | 310 | 145 |
| 2.51.0 (2026-10-22) | 187 | 310 | 151 |
| 2.52.0 (2026-11-02) | 187 | 309 | 155 |
| 2.53.0 (2026-11-18) | 187 | 310 | 156 |

Claim at risk (lint-gate.md JAVA-LINT-02): "Eight sit in Error Prone 2.36.0's `DISABLED_CHECKS` (150 members against 187 `ENABLED_ERRORS` and 312 `ENABLED_WARNINGS`, verified 2026-09-12)". Status: the eight-of-nine split is **unchanged** (see the table below). The three counts are **changed or wrong**: at the 2.36.0 tag they are 139 / 180 / 275, and no tag I counted yields 150 / 187 / 312. The baseline likely counted an unreleased master snapshot, which would also explain the next point. Recommended replacement text: "(156 members against 187 `ENABLED_ERRORS` and 310 `ENABLED_WARNINGS`, Error Prone 2.53.0, read 2026-11-27)". The rule index sentence "Eight of the nine ... ship in `DISABLED_CHECKS`" is **unchanged**.

Per-name set, identical at 2.36.0, 2.50.0 and 2.53.0 unless noted:

| Check | Set at 2.53.0 | Status vs pair |
|---|---|---|
| `DefaultLocale` | `DISABLED_CHECKS` | unchanged |
| `StringCaseLocaleUsage` | `ENABLED_WARNINGS` | unchanged |
| `EqualsMissingNullable` | `DISABLED_CHECKS` | unchanged |
| `FieldMissingNullable` | `DISABLED_CHECKS` | unchanged |
| `VoidMissingNullable` | `DISABLED_CHECKS` | unchanged |
| `CatchingUnchecked` | `DISABLED_CHECKS` | unchanged |
| `UnusedException` | `DISABLED_CHECKS` | unchanged |
| `ConstantPatternCompile` | `DISABLED_CHECKS` | unchanged |
| `UnnecessaryDefaultInEnumSwitch` | `DISABLED_CHECKS` | unchanged |
| `InterruptedExceptionSwallowed` | `DISABLED_CHECKS` | unchanged |
| `BanSerializableRead` | `DISABLED_CHECKS` | unchanged |
| `BanJNDI` | `ENABLED_ERRORS` | unchanged (JAVA-LINT-02 only says it is promoted alongside; it is already an error, so for it the promotion is a no-op) |
| `DefaultCharset` | `ENABLED_WARNINGS` | unchanged |
| `InterruptedInCatchBlock` | `ENABLED_WARNINGS` | **changed**: absent from all sets at 2.36.0 through 2.46.0, added in 2.47.0 (2026-02-05; verified by grepping `BuiltInCheckerSuppliers.java` at tags 2.37.0 to 2.49.0). errors-and-resources.md says "Error Prone 2.36.0 `ENABLED_WARNINGS`", which is false for 2.36.0 and true from 2.47.0 |
| `StreamResourceLeak` | `ENABLED_WARNINGS` | unchanged |
| `MustBeClosedChecker` | `ENABLED_ERRORS` | unchanged (2.51.0 extends it to `Arena.ofConfined`/`Arena.ofShared`; 2.53.0 to method and constructor references) |
| `CatchAndPrintStackTrace` | `ENABLED_WARNINGS` | unchanged |
| `TryFailThrowable` | `ENABLED_ERRORS` | unchanged |
| `EqualsHashCode` | `ENABLED_ERRORS` | set unchanged; behaviour widened in 2.53.0, see below |
| `GuardedByChecker` | `ENABLED_ERRORS` | unchanged |
| `ImmutableChecker` | `ENABLED_ERRORS` | unchanged |
| `DoubleCheckedLocking` | `ENABLED_WARNINGS` | unchanged |
| `DateFormatConstant` | `ENABLED_WARNINGS` | unchanged |
| `FutureReturnValueIgnored` | `ENABLED_WARNINGS` | unchanged |
| `ThreadSafeChecker` | none of the three | unchanged |

Behaviour changes in the window that touch pair checks but not set membership (all from the release bodies [2.51.0](https://github.com/google/error-prone/releases/tag/v2.51.0), [2.52.0](https://github.com/google/error-prone/releases/tag/v2.52.0), [2.53.0](https://github.com/google/error-prone/releases/tag/v2.53.0)):

- `EqualsHashCode` (2.53.0, 2026-11-18): now also flags a class that overrides `hashCode` without overriding `equals`, gated by `-XepOpt:EqualsHashCode:CheckHashCodeWithoutEquals`, enabled by default. data-and-patterns.md line 83 describes `EqualsHashCode` as being in `ENABLED_ERRORS`; that stays true, and the rule text should mention that the check now fires in both directions.
- `CompareToZero` was promoted from warning to error in 2.51.0, and `IfChainToSwitch` was enabled by default as a warning in 2.51.0. Neither is named by the pair.
- New `DISABLED_CHECKS` members in the window: 2.51.0 added `MissingJavadoc`, `PreferPreconditions`, `RequireNonNullRefactoring`, `SimplifyTestParameter`, `TraditionalJavadocToMarkdown`, `ValueClassIdentity` and others; 2.52.0 added `AlmostExhaustiveTestParameter`, `SingleTestParameter`, `SingleValueTestParameter`; 2.53.0 added `BootclasspathShadowing`. None is named by the pair. `ValueClassEquals` (2.52.0) is enabled.
- Open question 4 of jvm-concurrency.md (re-read `BuiltInCheckerSuppliers.java` on any release after 2.36.0): answered for 2.53.0 by the table above. No concurrency check named in concurrency.md changed set.

### 3. JDK required to run Error Prone and NullAway

Error Prone:

- 2.43.0 (2025-10-22): "The minimum supported JDK version to run Error Prone is now JDK 21" ([release notes](https://github.com/google/error-prone/releases/tag/v2.43.0)). The [Error Prone install page](https://errorprone.info/docs/installation) states: "Error Prone must be run on JDK 21 or newer ... Error Prone 2.42.0 is the latest version to support running on JDK 17."
- 2.46.0 (2026-01-08): `-XDaddTypeAnnotationsToSymbol=true` is required for Error Prone invocations on JDK 21 ([release notes](https://github.com/google/error-prone/releases/tag/v2.46.0), [issue 5426](https://github.com/google/error-prone/issues/5426)). The issue says the flag exists in OpenJDK 21.0.8 and newer and is not needed on JDK 22 and newer. Whether Error Prone 2.46+ can run at all on an Oracle JDK 21 (where NullAway documents the flag as unsupported) is **could not determine** from the sources read.
- The [plugin README](https://github.com/tbroyer/gradle-errorprone-plugin) table: "Starting from 2.43, minimum JDK 21".

NullAway:

- 0.13.0 (2026-01-20): "NullAway now requires a minimum of JDK 17 and Error Prone 2.36.0 to run". The wiki [Compatibility page](https://github.com/uber/NullAway/wiki/Compatibility) tabulates: JDK 17 runs Error Prone 2.36.0 through 2.42.0 only; JDK 21 or later runs 2.36.0 and later. It recommends `--release` to target older bytecode while building on a recent JDK.

Conflict with the pair (rules/java-quality.md pinned default 2, platform-and-versions.md JAVA-PLAT-02: floor 17, toolchain 25, CI matrix 17 / 21 / 25):

- Floor 17 expressed as `options.release = 17` is not in conflict: Error Prone runs on the 25 toolchain and compiles to 17 bytecode, which the Error Prone install page states is supported.
- Toolchain 25 is not in conflict.
- The CI matrix leg that compiles with a JDK 17 `javac` is in conflict with Error Prone 2.43.0 and later. The pair does not say whether the matrix legs are launcher-only (compile on 25, test on 17) or compile-and-test. Required statement in the pair: the 17 leg must run tests on a 17 launcher while compiling on a JDK 21+ toolchain, or the Error Prone version on that leg must be capped at 2.42.0.
- Status of the pair's claims: platform-and-versions.md JAVA-PLAT-02 text is **not contradicted but incomplete** (it says nothing about this constraint). Recommend adding one sentence to JAVA-PLAT-02 or JAVA-LINT-01 (candidate 1 below).

### 4. `jspecifyMode` JDK and vendor matrix

Source: [NullAway wiki JSpecify-Support, "Supported JDK versions"](https://github.com/uber/NullAway/wiki/JSpecify-Support#supported-jdk-versions), read 2026-11-27.

- Text: JSpecify mode needs either JDK 22 or higher, or `-XDaddTypeAnnotationsToSymbol=true`. The flag works on JDK 21 from 21.0.8 and JDK 17 from 17.0.19, and "is **not** supported by Oracle JDK 21 or 17; you must use an OpenJDK build like those from Temurin or Zulu". Since 0.12.11 the build fails with `IllegalStateException`.
- Status of JAVA-LINT-05 and JAVA-PLAT-03: **unchanged**, including the "NullAway 0.12.11+ throws `IllegalStateException`" sentence.
- Refinement in the window: NullAway 0.14.2 (2026-09-25) "now more precisely detects whether the JDK used for the build properly supports reading type use annotations from bytecode ... This may lead NullAway to crash on certain build configurations that were unsupported before but we were not detecting precisely" ([0.14.2 notes](https://github.com/uber/NullAway/releases/tag/v0.14.2), PR 1794 "Detect support for the addTypeAnnotationsToSymbol flag on JDK 17 / 21"). The matrix does not change, but the failure moves from imprecise to precise detection, so a CI image that previously slipped through can now fail on upgrade. Worth one clause in JAVA-PLAT-03's rationale.
- Interaction with section 3: on JDK 21 the flag is now needed for Error Prone itself (2.46.0+), so the "pass the flag on JDK 21" instruction in JAVA-PLAT-03 applies to every Error Prone module on 21, not only `jspecifyMode` modules.
- JDK 17 cannot run Error Prone 2.43+, so the pair's "17.0.19+ with the flag" arm of the matrix is only reachable with Error Prone 2.42.0 or earlier.

Other NullAway facts relevant to the pair, read from the [Configuration wiki](https://github.com/uber/NullAway/wiki/Configuration):

- JAVA-LINT-04: `OnlyNullMarked` (version 0.12.3 and after) and `AnnotatedPackages` are still mutually exclusive and exactly one is required; the build fails at load otherwise. Status: **unchanged**. The Gradle plugin's `onlyNullMarked = true` is documented in the [plugin README](https://github.com/tbroyer/gradle-nullaway-plugin).
- JAVA-DATA-09: `CheckOptionalEmptiness` "Type: boolean. Default: `false`" on the Configuration page. Status: **unchanged**.
- New and not named by the pair: `JSpecifyJDKModels` (since 0.14.0, 2026-08-21, JSpecify mode only), `JSpecifyExperimental` (enables JDK models, wildcard generics handling and generic-inference-failure warnings together), the opt-in `JSpecifyUnrecognizedAnnotationLocation` checker (0.14.2) and `RequireExplicitNullMarking` (0.12.13, off by default). `LegacyAnnotationLocations` was removed in 0.14.0. The 0.14.0 release notes warn that the JDK models "lead to new errors in existing projects", so a bump from the pinned 0.12.11 to 0.14.x can add findings under `jspecifyMode` plus experimental.

### 5. JSpecify after 1.0.0

- 1.0.1 shipped 2026-07-29 ([release](https://github.com/jspecify/jspecify/releases/tag/v1.0.1)): "small changes to documentation and build setup but no semantic changes". It moves `module-info.class` to the jar root (removing a multi-release `META-INF/versions/9/OSGI-INF/MANIFEST.MF`), embeds the version in `module-info.class`, and improves Javadoc.
- The [JSpecify blog](https://jspecify.dev/blog/) lists only the 1.0.0 post (2024-07-17) and the 2022 welcome post; the repository tags are v1.0.1, v1.0.0, v0.3.0. The Maven Central latest is 1.0.1.
- Status of nullness.md "JSpecify (1.0.0, 2024-07-17 ...) annotation set frozen for life": the annotation set claim is **unchanged**; the version label is **changed** to 1.0.1 (2026-07-29) with 1.0.0 as the semantics baseline. NullAway 0.14.0 itself updated to JSpecify 1.0.1.
- Kotlin fact (confirmation only, kotlin-quality owns the flags): [Kotlin 2.1.0 what's new](https://kotlinlang.org/docs/whatsnew21.html) says "Starting from Kotlin 2.1.0, nullability mismatches are raised from warnings to errors by default" for `org.jspecify.annotations`, and the [Kotlin Java interop page](https://kotlinlang.org/docs/java-interop.html) says JSpecify is the only flavour whose default report level is `strict`. Status: **unchanged**.

### 6. ThreadSafeChecker and `GuardedByUtils`

- `ThreadSafeChecker.java` at v2.53.0 declares `@BugPattern(name = "ThreadSafe", ... severity = ERROR)`. A grep for `ThreadSafe` in `BuiltInCheckerSuppliers.java` at v2.53.0 returns no match, so it sits in none of the three sets. Status of JAVA-CONC-16 "`ThreadSafeChecker` ships in none of the three built-in sets": **unchanged** at 2.53.0. The checker is addressable by its bug-pattern name `ThreadSafe`, which is a point worth adding to the pair's verification (candidate 4).
- `GuardedByUtils.java` at v2.53.0 holds `ACCEPTED_GUARDED_BY_ANNOTATIONS` with exactly five entries: `android.support.annotation.GuardedBy`, `androidx.annotation.GuardedBy`, `com.android.internal.annotations.GuardedBy`, `com.google.errorprone.annotations.concurrent.GuardedBy`, `javax.annotation.concurrent.GuardedBy` ([file at v2.53.0](https://github.com/google/error-prone/blob/v2.53.0/core/src/main/java/com/google/errorprone/bugpatterns/threadsafety/GuardedByUtils.java)). `net.jcip.annotations` is not among them. Status of "recognises exactly five packages": **unchanged** at 2.53.0. Version history I read by fetching the file at tags: at 2.36.0 the file filtered by simple name `GuardedBy` (so any package, JCIP included, would have been recognised); from 2.37.0 an explicit list of four; from 2.48.0 five (commit "Add android internal GuardedBy to ACCEPTED_GUARDED_BY_ANNOTATIONS", 2026-02-24). JAVA-CONC-16 cites "2.36.0, read 2026-09-12" for the set facts; the five-package fact is true only from 2.48.0, so the version stamp on that sentence should read 2.48.0 or later.

### 7. NullAway#1290

- [uber/NullAway#1290](https://github.com/uber/NullAway/issues/1290), titled "Better support lambda parameters in generic method inference", is closed (2026-10-24, last commit `b76829a`, "Add regression tests for cast map reads and nullable Supplier type arguments (#2046)", which is contained in 0.14.4 and not in 0.14.3).
- JAVA-NULL-06 cites it as evidence of "known gaps on lambda-heavy call patterns". Status: **changed** in part. The cited issue is now closed and the lambda-inference work shipped across 0.14.x (0.14.3 and 0.14.4 notes list many lambda and generic-inference fixes). The wiki JSpecify-Support page still lists "full inference support for generic methods" and "checking of generic class implementations" as outstanding and says JSpecify mode "may report false positive warnings", so the rule itself (enable in a no-production-change PR, do not suppress to reach green) still holds. Recommended edit: cite the wiki's outstanding-features list as the standing evidence and mention #1290 as closed in 0.14.4.

## Normative guidance candidates

1. **Run Error Prone on JDK 21 or newer, and cap it at 2.42.0 on any JDK 17 compile.**
   Rationale: Error Prone 2.43.0 dropped JDK 17; the pair's CI matrix has a 17 leg.
   Verification: `grep -rn "errorprone" --include=*.gradle* --include=*.toml . | grep -n "2\.\(4[3-9]\|5\)"` against a build whose `JavaCompile` toolchain is `JavaLanguageVersion.of(17)`; or run `./gradlew compileJava -Dorg.gradle.java.installations.auto-download=false` on the 17 leg and look for an Error Prone "requires JDK 21" failure. Reading heuristic: every matrix leg named 17 must compile on the 25 toolchain with `options.release = 17` and test on a 17 launcher.
2. **Pass `-XDaddTypeAnnotationsToSymbol=true` on every Error Prone compile that runs on JDK 21, not only under `jspecifyMode`.**
   Rationale: required since Error Prone 2.46.0; on Oracle JDK 21 the flag is unsupported, so use an OpenJDK build (Temurin, Zulu) there.
   Verification: `grep -rn "addTypeAnnotationsToSymbol" build-logic buildSrc *.gradle*`; reading heuristic: a JDK 21 compile leg with Error Prone and no hit is the finding.
3. **Pin `InterruptedInCatchBlock` as `ENABLED_WARNINGS` only for Error Prone 2.47.0 and later.**
   Rationale: absent from every set before 2.47.0; the pair's current text claims it for 2.36.0.
   Verification: `curl -sL https://raw.githubusercontent.com/google/error-prone/<tag>/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java | grep -c InterruptedInCatchBlock` returns 2 at v2.47.0 and later, 0 before.
4. **Cite `ThreadSafe` (the bug-pattern name), not only `ThreadSafeChecker`, when checking whether the check is wired.**
   Rationale: `ThreadSafeChecker.java` declares `name = "ThreadSafe"`; a grep of the suppliers file for the class name and the pattern name both return nothing at 2.53.0.
   Verification: `grep -n "ThreadSafe" BuiltInCheckerSuppliers.java` returning no `ThreadSafeChecker.class` line.
5. **State the three set counts with the release and read date: 187 / 310 / 156 at 2.53.0 (errors / warnings / disabled).**
   Rationale: the current "150 / 187 / 312" does not reproduce at any tag counted.
   Verification: `awk '/ENABLED_ERRORS =/{s="E"} /ENABLED_WARNINGS =/{s="W"} /DISABLED_CHECKS =/{s="D"} /\.class/{c[s]++} END{for(k in c)print k,c[k]}' BuiltInCheckerSuppliers.java`. Counts shift with every release (DISABLED_CHECKS grew by 17 from 2.36.0 to 2.53.0), so prefer stating the invariant (names, not totals) in prose.
6. **Add one clause to JAVA-PLAT-03: since NullAway 0.14.2 the JDK precondition is detected more precisely and can fail builds that previously passed.**
   Rationale: avoids a surprise on a NullAway bump.
   Verification: run the module's compile on the CI image after bumping NullAway; look for the `IllegalStateException` text quoted on the JSpecify-Support wiki page.
7. **On a NullAway bump past 0.13.x, expect new findings from the JSpecify JDK models and re-baseline in a no-production-change PR.**
   Rationale: 0.14.0 says the JDK models cause "new errors in existing projects"; extends JAVA-NULL-06.
   Verification: compare `./gradlew compileJava` finding counts before and after with `jspecifyMode = true` and `jspecifyExperimental = true`.

## AI-agent angle

- An agent will propose bumping `error_prone_core` to the newest release in a build that still has a JDK 17 toolchain, because it remembers "Error Prone supports JDK 17". Smallest check: read the toolchain `languageVersion` next to the Error Prone version; JDK 17 with Error Prone above 2.42.0 is the failure.
- An agent will assume `-XDaddTypeAnnotationsToSymbol=true` is only for NullAway's `jspecifyMode`. It is also required for Error Prone 2.46.0+ on JDK 21. Check: grep the flag in every convention plugin that applies Error Prone on a JDK 21 leg.
- An agent will repeat "`InterruptedInCatchBlock` is on by default since 2.36.0". Check: the grep in candidate 3.
- An agent will copy the set counts "150 / 187 / 312". Check: candidate 5's awk command.
- An agent will say JSpecify "has no releases after 1.0.0" or that it added annotations. 1.0.1 exists and is documentation and packaging only.
- An agent will treat `ThreadSafeChecker` as wired because the `@ThreadSafe` annotation's javadoc names it. Check: grep the suppliers file for `ThreadSafe`.

## Contested / evolving

- NullAway says it expects to enable `JSpecifyExperimental` by default in a future release (JSpecify-Support wiki, read 2026-11-27). If that lands, the JDK models and wildcard inference come on for every `jspecifyMode` user. Trend: toward stricter default checking.
- Error Prone's minimum JDK has risen on a roughly 12 to 14 month cadence (11 to 17 at 2.32.0, 17 to 21 at 2.43.0). A move to 25 is not announced in any source I read; do not predict it.
- Error Prone may remove its internal workarounds for JDK-8225377 now that the flag is required on 21 (issue 5426 says so). Not yet done as of 2.53.0.
- `EqualsHashCode`'s new reverse direction (2.53.0) is configurable with `CheckHashCodeWithoutEquals`; whether Google flips its default again is unknown.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/google/error-prone/releases/tag/v2.53.0 | Error Prone 2.53.0 release notes | 2026-11-18 | Latest release; `EqualsHashCode` change |
| https://github.com/google/error-prone/releases/tag/v2.52.0 | Error Prone 2.52.0 release notes | 2026-11-02 | In-window release; new disabled checks |
| https://github.com/google/error-prone/releases/tag/v2.51.0 | Error Prone 2.51.0 release notes | 2026-10-22 | In-window; `CompareToZero` to error, `IfChainToSwitch` on |
| https://github.com/google/error-prone/releases/tag/v2.46.0 | Error Prone 2.46.0 release notes | 2026-01-08 | Flag required on JDK 21 |
| https://github.com/google/error-prone/releases/tag/v2.43.0 | Error Prone 2.43.0 release notes | 2025-10-22 | JDK 21 minimum to run |
| https://github.com/google/error-prone/releases/tag/v2.36.0 | Error Prone 2.36.0 release notes | 2024-11-19 | The pair's pinned floor |
| https://github.com/google/error-prone/blob/v2.53.0/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java | Set membership at the latest tag | 2.53.0 | Source of truth for sets |
| https://github.com/google/error-prone/blob/v2.36.0/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java | Set membership at the floor tag | 2.36.0 | Comparison and count check |
| https://github.com/google/error-prone/blob/v2.53.0/core/src/main/java/com/google/errorprone/bugpatterns/threadsafety/GuardedByUtils.java | Accepted `GuardedBy` packages | 2.53.0 | Five-package claim |
| https://github.com/google/error-prone/blob/v2.53.0/core/src/main/java/com/google/errorprone/bugpatterns/threadsafety/ThreadSafeChecker.java | `ThreadSafe` bug pattern | 2.53.0 | Bug-pattern name |
| https://github.com/google/error-prone/issues/5426 | Issue requiring the `addTypeAnnotationsToSymbol` flag | closed, 2026 | Rationale and JDK 21.0.8 caveat |
| https://errorprone.info/docs/installation | Error Prone install page | read 2026-11-27 | JDK 21 minimum, 2.42.0 last on JDK 17 |
| https://github.com/uber/NullAway/releases/tag/v0.14.4 | NullAway 0.14.4 notes | 2026-11-16 | Latest; contains the #1290 work |
| https://github.com/uber/NullAway/releases/tag/v0.14.3 | NullAway 0.14.3 notes | 2026-10-22 | In-window; `PolyNull` models |
| https://github.com/uber/NullAway/releases/tag/v0.14.2 | NullAway 0.14.2 notes | 2026-09-25 | In-window; precise JDK flag detection |
| https://github.com/uber/NullAway/releases/tag/v0.14.0 | NullAway 0.14.0 notes | 2026-08-21 | JDK models, JSpecify 1.0.1 |
| https://github.com/uber/NullAway/releases/tag/v0.13.0 | NullAway 0.13.0 notes | 2026-01-20 | JDK 17 and Error Prone 2.36.0 floor |
| https://github.com/uber/NullAway/issues/1290 | Lambda generic inference issue | closed 2026-10-24 | JAVA-NULL-06 citation |
| https://github.com/uber/NullAway/wiki/JSpecify-Support | Wiki, supported JDK versions, outstanding features | read 2026-11-27 | `jspecifyMode` matrix |
| https://github.com/uber/NullAway/wiki/Configuration | Wiki, all options | read 2026-11-27 | `OnlyNullMarked`, `CheckOptionalEmptiness` default |
| https://github.com/uber/NullAway/wiki/Compatibility | Wiki, JDK / Error Prone / NullAway table | read 2026-11-27 | JDK 17 ceiling of 2.42.0 |
| https://github.com/tbroyer/gradle-errorprone-plugin/releases/tag/v5.2.0 | `net.ltgt.errorprone` 5.2.0 and README JDK table | 2026-10-30 | Plugin version and JDK minimums |
| https://github.com/tbroyer/gradle-nullaway-plugin/releases/tag/v3.3.0 | `net.ltgt.nullaway` 3.3.0 and README DSL table | 2026-10-05 | DSL property names |
| https://github.com/jspecify/jspecify/releases/tag/v1.0.1 | JSpecify 1.0.1 | 2026-07-29 | No semantic change |
| https://jspecify.dev/blog/ | JSpecify blog | read 2026-11-27 | Only the 1.0.0 post |
| https://kotlinlang.org/docs/whatsnew21.html | Kotlin 2.1.0 what's new | 2.1.0 era | Confirms strict JSpecify default |
| https://kotlinlang.org/docs/java-interop.html | Kotlin Java interop | read 2026-11-27 | Strict is JSpecify-only default |
| https://repo1.maven.org/maven2/com/google/errorprone/error_prone_core/maven-metadata.xml | Maven Central metadata | lastUpdated 2026-11-18 | Latest-version cross-check |

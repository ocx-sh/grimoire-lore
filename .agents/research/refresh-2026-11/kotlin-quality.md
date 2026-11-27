---
title: kotlin-quality delta refresh, 2026-09-12 to 2026-11-27
pair: kotlin-quality
date: 2026-11-27
window_start: 2026-09-12
model: opus
consolidates:
  - .agents/research/refresh-2026-11/kotlin-quality/kotlin-compiler-kgp-delta.md
  - .agents/research/refresh-2026-11/kotlin-quality/kotlin-abi-interop-delta.md
  - .agents/research/refresh-2026-11/kotlin-quality/ksp-kapt-dokka-delta.md
  - .agents/research/refresh-2026-11/kotlin-quality/detekt-ktlint-delta.md
  - .agents/research/refresh-2026-11/kotlin-quality/kotlinx-coroutines-delta.md
  - .agents/research/refresh-2026-11/kotlin-quality/kover-test-frameworks-delta.md
  - .agents/research/refresh-2026-11/kotlin-quality/kotlin-recent-shifts.md
revises:
  - .agents/research/jvm-platform-and-toolchains.md
  - .agents/research/jvm-language-api.md
  - .agents/research/jvm-concurrency.md
  - .agents/research/jvm-java-runtime-safety.md
  - .agents/research/jvm-quality-gates.md
  - .agents/research/jvm-topic-map.md
---

# kotlin-quality delta refresh

## Verdict

- Correct the detekt default-config counts everywhere they appear. The 129 active rules are unchanged, but the denominator on detekt's main branch is now 237 (commit `72e93bc5967f`, 2026-11-26), so the off count is 108, not 102. The newest release tag, `v2.0.0-alpha.6`, carries an older file (119 of 227), so the text now names "main" as the read point. This touches the rule index and `lint-gate.md`. Rule bump: patch.
- Add two rules to the reference skill. KT-COMP-14 sets a KGP floor of 2.4.20, because GHSA-r937-wjx7-w2jp (CVSS 6.7) documents code execution through build-cache metadata deserialization in KGP before 2.4.20. KT-LINT-09 pins ktlint's stable 1.x line under `com.pinterest.ktlint`, because the project left Pinterest and its 2.x line exists only as alphas published under two different groups in one cycle. Both greps were watched go red on a planted fixture and stay empty on a clean one. Skill bump: minor.
- Change KT-LINT-07 in place. The compiler reference read 2026-11-27 no longer documents `-Xsuppress-warning=NAME`, and it documents `-Xwarning-level=NAME:disabled` as a module-wide suppression of one warning. So the claim that the per-name escape hatch disappears after promotion is no longer true as written. The rule now names the documented exemption and treats it as a weakening that needs its reason.
- Correct the `ExitOutsideMain` example in `errors-and-resources.md`. The rule lives in detekt's `potential-bugs` rule set, not `exceptions`, so the shipped YAML example promoted nothing. This is a pre-window defect, but the delta read the default config from source, and the example as written makes KT-ERR-05's promotion a no-op.
- Make small fact corrections in place: the KGP-to-Gradle table gains 2.4.21; KT-COMP-01 scopes context parameters to exclude context arguments and callable references; KT-COMP-08 names only Auto Factory as the KSP gap; KT-COMP-10 notes that `ksp.useKSP2` is slated for removal; KT-COMP-11 records Dokka 2.3.0 as the preferred pin; KT-COMP-12 records the missing stability label; KT-COMP-13 counts five daemon-argument ways and attributes the buildSrc exception to ktor rather than the Kotlin docs; KT-INTEROP-06 records `@JvmName` and the Experimental `@JvmExposeBoxed`; KT-TEST-02 names the documented `minBound(N)` floor form; three stamps are re-dated where the delta re-read the fact.
- Hold every Kotlin 2.5.0 fact as watch-only. 2.5.0 is at RC2 on 2026-11-27, and the return-value checker default, the JDK 17 compiler floor, the language-version floor of 2.2 and the value-class redefinition all wait for GA. None becomes a rule in this pass.
- Leave the coroutines and the Kover-wiring rows unchanged in substance. kotlinx.coroutines has had no release since 1.11.0 (2026-05-08), and Kover 0.9.10 and 0.9.11 touch neither `check` wiring nor the `verify` DSL.

## Changed rules

### Rule index (rules/kotlin-quality.md, opening paragraph)

- Old text: "detekt's shipped `default-detekt-config.yml` activates 129 of its 231 rules, so `buildUponDefaultConfig = true` runs 102 of them not at all"
- New text: "detekt's `default-detekt-config.yml` on its main branch (read 2026-11-27) activates 129 of its 237 rules, so `buildUponDefaultConfig = true` runs 108 of them not at all"
- Source: https://github.com/detekt/detekt/blob/main/detekt-core/src/main/resources/default-detekt-config.yml (commit `72e93bc5967f`, 2026-11-26), and https://github.com/detekt/detekt/blob/v2.0.0-alpha.6/detekt-core/src/main/resources/default-detekt-config.yml for the older tag.

### KT-LINT-01 (lint-gate.md)

- Old text (rationale): "detekt's default config runs 129 of 231 rules: `comments` ships 0 of 10 active, `style` 38 of 78, `potential-bugs` 18 of 32." Old text (verification): "which for 102 of the 231 rules is off."
- New text (rationale): "detekt's default config on main runs 129 of 237 rules: `comments` ships 0 of 10 active, `style` 38 of 80, `potential-bugs` 18 of 34." New text (verification): "which for 108 of the 237 rules on main is off."
- Verification is unchanged in mechanism. Source: the same default config on main.

### KT-LINT-07 (lint-gate.md)

- Old text (rule): "Before promoting, know that `-Xsuppress-warning=NAME` silences a warning globally and cannot silence an error." Old text (rationale): "Once a warning is promoted the per-name escape hatch is gone, and the remaining exits are fixing the code or un-promoting the whole set, so the promotion is a commitment rather than a setting. An unknown warning name passed to that flag is itself a compile error, so the hatch cannot be used speculatively either."
- New text (rule): "The one per-name exemption from that promotion is `-Xwarning-level=NAME:disabled`, which suppresses that warning module-wide: declare it in the same plugin with its reason on the line above, because it is a weakening under `KT-CORE-01`." New text (rationale): "Once warnings are promoted, the exits are fixing the code, a per-name `-Xwarning-level` exemption, or un-promoting the whole set, so the promotion is a commitment rather than a setting. `-Xsuppress-warning=NAME`, the older per-name flag, is absent from the compiler reference read 2026-11-27, so it is not the exemption to reach for."
- New verification clause: "Every `Xwarning-level` hit ending in `:disabled` with no reason on the line above is also the finding." The KT-LINT-07 grep gains `-e 'Xwarning-level' -e 'Xsuppress-warning'`. The Group 3 floor sentence, the code-example comment and "What Agents Get Wrong" item 6 are updated to match.
- Source: https://kotlinlang.org/docs/compiler-reference.html (documents `-nowarn`, `-Werror`, `-Wextra` and `-Xwarning-level=DIAGNOSTIC_NAME:(error|warning|disabled)`; does not document `-Xsuppress-warning`).

### KT-COMP-01 (compiler-and-toolchain.md)

- Old text: "or `-Xcontext-parameters` (Stable in 2.4.0, 2026-07-14)."
- New text: "or `-Xcontext-parameters` (context parameters Stable in 2.4.0, 2026-07-14, except context arguments and callable references, which stay behind the separate `-Xexplicit-context-arguments`)."
- Verification is unchanged: the retired-flag grep does not include `-Xexplicit-context-arguments`, because that flag is live. Source: https://kotlinlang.org/docs/whatsnew24.html and https://kotlinlang.org/docs/compiler-reference.html.

### KT-COMP-06 (compiler-and-toolchain.md, table)

- Old text: "| 2.4.20 | 9.7.0 |" and "Verified 2026-09-12." under the table.
- New text: "| 2.4.20 through 2.4.21 | 9.7.0 |" and "Verified 2026-11-27."
- Source: https://kotlinlang.org/docs/gradle-configure-project.html and https://github.com/JetBrains/kotlin/releases (2.4.21 latest, 2026-10-08).

### KT-COMP-08 (compiler-and-toolchain.md)

- Old text: "The one recorded upstream gap is `auto-value` and Auto Factory ([ksp-overview](https://kotlinlang.org/docs/ksp-overview.html)), verified 2026-09-12."
- New text: "The one upstream gap the supported-libraries table records is Auto Factory ([ksp-overview](https://kotlinlang.org/docs/ksp-overview.html)), verified 2026-11-27."
- Verification is unchanged. Source: https://kotlinlang.org/docs/ksp-overview.html (Auto Factory listed as "Not yet supported"; no auto-value row).

### KT-COMP-10 (compiler-and-toolchain.md)

- Old text (verification): "and an explicit `true` is a recorded migration carve-out rather than a defect."
- New text: "and an explicit `true` is not a defect but is cleanup, because the plugin's own error text says the `ksp.useKSP2` property will be removed."
- Source: google/ksp `KspSubplugin.kt` on main ("The ksp.useKSP2 property will be removed in the future").

### KT-COMP-11 (compiler-and-toolchain.md)

- Old text (rationale): "DGP v2 has been the default since Dokka 2.1.0 and K2 analysis is stable from 2.2.0, which is where the corpus converges."
- New text: the same sentence, followed by "Dokka 2.3.0 (2026-11-05, verified 2026-11-27) removed K1 analysis and updates its bundled FreeMarker, jsoup and Jackson for security advisories, so it is the preferred pin above that floor."
- The 2.2.0 floor stays, because the Dokka docs examples still show 2.2.0. Verification is unchanged. Source: https://github.com/Kotlin/dokka/releases/tag/v2.3.0.

### KT-COMP-12 (compiler-and-toolchain.md)

- Old text: "was still not promoted through 2.4.0 (verified 2026-09-12),"
- New text: "was still not promoted through 2.4.0 (verified 2026-09-12; the reference pages read 2026-11-27 give it no stability label),"
- Source: https://kotlinlang.org/docs/compiler-reference.html and https://kotlinlang.org/docs/gradle-compiler-options.html.

### KT-COMP-13 (compiler-and-toolchain.md)

- Old text (rationale): "Four precedence levels each override the last, and the buildSrc exception is the one that silently does nothing: ... ([gradle-compilation-and-caches](...))."
- New text: "The Kotlin docs list five ways to set daemon arguments, each overriding the one before ([gradle-compilation-and-caches](...), read 2026-11-27). The buildSrc exception is not on that page and rests on an in-repository comment in ktor's `gradle.properties`, and it is the one that silently does nothing: ..."
- The rule and verification are unchanged. Source: https://kotlinlang.org/docs/gradle-compilation-and-caches.html.

### KT-INTEROP-06 (java-interop.md)

- Old text (rationale): "so the member is not callable from Java at all, and nothing in the Kotlin source says so."
- New text: "so under default compilation the member is not callable from Java, and nothing in the Kotlin source says so. An explicit `@JvmName` removes the hyphen, and `@JvmExposeBoxed` (or module-wide `-Xjvm-expose-boxed`) adds a boxed variant Java can call, but that annotation is Experimental behind `@OptIn(ExperimentalStdlibApi::class)` and drew a stream of defects from 2.4.20 through 2.5.0-RC, a cross-module `NoSuchMethodError` among them (verified 2026-11-27)."
- Rule cell gains: "Turning on `@JvmExposeBoxed` or `-Xjvm-expose-boxed` in a published module is an Experimental adoption recorded as a decision, never a quiet interop fix." Verification gains: "Then see block KT-INTEROP-06: a hit in a published module with no comment recording the Experimental adoption is the finding, and empty output is the pass." A new grep block KT-INTEROP-06 is added.
- Source: https://kotlinlang.org/docs/java-to-kotlin-interop.html, https://kotlinlang.org/docs/inline-classes.html, and the v2.4.20 and v2.5.0-Beta2 release notes on GitHub (KT-85954, KT-85955, KT-88388, KT-88339).

### KT-API-02, KT-API-03, KT-API-07 (api-and-abi.md)

- KT-API-02 old: "Dokka 2.x, K2-stable from 2.2.0, verified 2026-09-12." New: "Dokka 2.x, K2-stable from 2.2.0 (verified 2026-09-12) and K2-only from 2.3.0 (verified 2026-11-27)."
- KT-API-03 old: "Standalone BCV 0.18.x needs Gradle 6.1.1+ and Kotlin 1.6.20+. `abiValidation()` needs Kotlin 2.2.0+ and is still Experimental. Verified 2026-09-12." New: "Standalone BCV 0.18.x needs Gradle 6.1.1+ and Kotlin 1.6.20+ (verified 2026-09-12). `abiValidation()` needs Kotlin 2.2.0+ and is still Experimental, its stabilisation issue KT-71172 still open (verified 2026-11-27)."
- KT-API-07 old: "and it is Experimental as of Kotlin 2.2, verified 2026-09-12." New: "and it is still Experimental in Kotlin 2.4, verified 2026-11-27."
- Sources: https://github.com/Kotlin/dokka/releases/tag/v2.3.0; https://youtrack.jetbrains.com/api/issues/KT-71172 (state Submitted); the `ExperimentalAbiValidation.kt` source in JetBrains/kotlin; https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html and https://kotlinlang.org/docs/whatsnew24.html.

### KT-TEST-02 (testing.md)

- Old text (rule): "A Kover floor is a `verify { rule { bound { minValue = N } } }` block." Old text (rationale): "and Kover's own documentation (0.9.8, read 2026-09-12) never states the binding."
- New text (rule): "A Kover floor is a `verify { rule { minBound(N) } }` block, the documented form, or the longer `bound { minValue = N }` inside the same `rule`." New text (rationale): "and Kover's own documentation (read 2026-11-27, examples still pinned at 0.9.8 while the newest release is 0.9.11) never states the binding."
- The KT-TEST-02 grep gains `-e 'minBound'`, so a floor written in the documented form is no longer missed. The right-hand example switches to `minBound(90)`. Source: https://kotlin.github.io/kotlinx-kover/gradle-plugin/ and https://github.com/Kotlin/kotlinx-kover/releases.

### KT-ERR-05 (errors-and-resources.md)

- Old text (example): `ExitOutsideMain` under `exceptions:`. Old text (verification): "and a hit setting `active: true` is the pass."
- New text (example): `ExitOutsideMain` under `potential-bugs:`, with `exceptions:` keeping the other two rules. New text (verification): "and a hit setting `active: true` under `potential-bugs:`, the rule set that holds it, is the pass."
- Source: detekt default config on main, where `ExitOutsideMain` sits in the `potential-bugs` section.

### KT-CORO-09 and the dates block (coroutines.md)

- Old text: "**No lint exists**, confirmed across detekt's whole ten-rule coroutines module." New text: "**No lint exists**, confirmed across detekt's whole coroutines module: ten rules on main at 2026-11-26, nine at `v2.0.0-alpha.6`."
- Old text: "Verified 2026-09-12 unless a row says otherwise." New text: "Verified 2026-09-12 unless a row says otherwise, and re-checked 2026-11-27, when kotlinx.coroutines 1.11.0 was still the newest release."
- Source: https://github.com/detekt/detekt/tree/main/detekt-rules-coroutines (ten rule classes; the tenth, `MissingStackTraceRecoverable`, was added 2026-11-04 and ships inactive) and https://repo1.maven.org/maven2/org/jetbrains/kotlinx/kotlinx-coroutines-core/maven-metadata.xml.

## New rules

### KT-COMP-14 (compiler-and-toolchain.md, The JVM-Target Block and the Version Pins)

- Rule: Pin the Kotlin Gradle plugin at 2.4.20 or newer on every build.
- Rationale: KGP before 2.4.20 allowed code execution through unsafe deserialization of build-cache metadata (GHSA-r937-wjx7-w2jp, CVSS 6.7, fixed in 2.4.20-Beta1). Any build whose cache entries someone else can write is exposed. The fix stays inside the 2.4 line and raises the Gradle ceiling rather than lowering it, so no other pin has to move. The advisory was published 2026-06-26, before the window, but neither the pair nor the earlier recent-shifts scan named it.
- Verification: the KT-COMP-14 grep, read against 2.4.20. A version below 2.4.20 is the finding. Empty output means the version is declared where the grep does not read, and that declaration is read instead. Watched red on 2026-11-27: a fixture with `kotlin = "2.4.10"` in the catalog and `kotlin("jvm") version "2.4.10"` plus `id("org.jetbrains.kotlin.plugin.serialization") version "2.4.10"` in a build script printed all three lines.
- Severity: MUST.
- Source: https://github.com/advisories/GHSA-r937-wjx7-w2jp.

### KT-LINT-09 (lint-gate.md, Group 2)

- Rule: Pin ktlint's stable 1.x line, coordinate group `com.pinterest.ktlint`, in a gate of record. Never wire a `2.0.0-ALPHA` build, and never rewrite a `com.pinterest.ktlint` coordinate to a guessed new group.
- Rationale: The project left Pinterest and now lives at `github.com/ktlint/ktlint`. Its 2.x line exists only as alphas: `2.0.0-ALPHA-4` (2026-08-21) under `io.github.ktlint` and `2.0.0-ALPHA-5` (2026-11-23) under `io.github.ktlint.core`, built against Kotlin 2.5.0-RC2 and marked not for production. The group changed twice in one cycle, so a coordinate written from memory is wrong either way, and detekt's ktlint wrapper still bundles ktlint 1.8.0. Re-check when ktlint 2.0.0 stable ships.
- Verification: the KT-LINT-09 grep; any hit is the finding and empty output is the pass. Then read the version the ktlint plugin or Spotless step pins, where a value containing `ALPHA` is the finding. Watched red on 2026-11-27: a catalog with `ktlint = "2.0.0-ALPHA-5"` and an `io.github.ktlint.core` module printed both lines (exit 0); a catalog with `ktlint = "1.8.0"` printed nothing (exit 123).
- Severity: SHOULD.
- Source: https://github.com/ktlint/ktlint/releases/tag/2.0.0-ALPHA-5, https://ktlint.github.io/ktlint/dev-snapshot/api/migrate-to-ktlint-2.x/, and https://github.com/detekt/detekt/blob/main/gradle/libs.versions.toml.

## Confirmed unchanged

- `jvmTarget` still defaults to `"1.8"`, and `jvmToolchain` still does not move it (KT-COMP-04, index row 4).
- `jvmDefault` values and the `ENABLE` default are unchanged, and `-Xjvm-default` is still described as deprecated, not removed (KT-COMP-02, KT-COMP-03, index row 5).
- `kotlin.jvm.target.validation.mode` still defaults to `error` on Gradle 8.0 or newer (KT-COMP-05).
- The Gradle 7.6.3 floor across Kotlin 2.4.x and the 2.4.0 through 2.4.10 ceiling of 9.5.0 are unchanged (KT-COMP-06).
- `freeCompilerArgs` is still only announced for future deprecation.
- KSP2 is still the default; kapt is not deprecated; KSP and kapt still coexist per processor; `ksp.useKSP2=false` still fails hard on KSP 2.3.0 or newer (KT-COMP-08, -09, -10). KSP 2.3.14 (2026-11-13) is the current release.
- DGP v2 is still the default since Dokka 2.1.0, and the v1 task names are still the stale shape (KT-COMP-11).
- Explicit API spellings, the BCV and `abiValidation()` task names, the required `@OptIn(ExperimentalAbiValidation::class)`, the non-propagation of `@SubclassOptInRequired`, and the JSpecify `strict` and JSR-305 `warn` defaults are unchanged (KT-API-01, -03, -08, KT-INTEROP-02, -03). The KT-API-03 pin's rationale still holds, because `abiValidation()` is still Experimental and KT-71172 is still open.
- The four coroutine rules still ship `active: false` and the four others still ship active on detekt main; `dev.detekt.rules.coroutines` is still the package (KT-CORO-01). `SwallowedException` and `ThrowingNewInstanceOfSameException` still ship active, `ExitOutsideMain` still ships inactive, `InterruptedException` is still in `ignoredExceptionTypes`, and no `InterruptedException` rule exists (KT-ERR-02, -04, -05).
- detekt 2.0 is still alpha, `v2.0.0-alpha.6` is still the newest tag, and every "read the coordinate first" and "mid package rename" phrase stays (KT-LINT-02, -03).
- `ktlint_official` is still ktlint's default code style (KT-LINT-04), and the `ignoreFailures` semantics of detekt and ktlint-gradle are unchanged (KT-LINT-08).
- `Dispatchers.IO` sizing, `limitedParallelism` elasticity, the `runTest` contract, the `CoroutineExceptionHandler` root-only rule and `withContext(NonCancellable)` in `finally` are unchanged at kotlinx.coroutines 1.11.0 (KT-CORO-02 through -13, KT-TEST-05, -06).
- Kover's `check` still depends on `koverVerify` by default, `onCheck` still exists, and no release in the window touched the wiring (KT-TEST-02, index row 14). JaCoCo 0.8.16 adds no Kotlin filtering (KT-TEST-01). The JetBrains JUnit page still names no framework other than JUnit with `kotlin.test` (KT-TEST-04).

## Open questions

- Kotlin 2.4.0's release date: the GitHub releases API gives 2026-06-03, while the whatsnew24 page's own date line, and KT-COMP-01, give 2026-07-14, which the API assigns to 2.4.10. Re-read both before changing the KT-COMP-01 date.
- Language-version 1.9: KT-COMP-07 and the index say 1.8 and 1.9 were dropped in Kotlin 2.3.0, but the delta quotes whatsnew24 ("Starting with Kotlin 2.4.0, the compiler no longer supports `-language-version=1.9`") and the 2.4 compatibility guide (KT-80590: warning in 2.2.0, error in 2.4.0) while marking the row unchanged. Re-read KT-80590 and the 2.3 compatibility guide before touching the sentence.
- Kotlin 2.5.0 at GA: whether to gate `RETURN_VALUE_NOT_USED` from the now default-on return-value checker (KT-87295); whether to add the JDK 17 compiler floor and forbid `-Xallow-pre-17-runtime-jdk`; whether KT-COMP-07 should state the 2.2 language-version minimum the compiler reference already describes; and whether KT-INTEROP-06 and KT-API-05 must write `@JvmInline value class` once KEEP-0468 gives bare `value class` a new meaning (Beta planned for 2.5.20).
- KT-LINT-07: confirm on a fixture that `-Xwarning-level=NAME:disabled` keeps a warning from failing a `-Werror` build. No `kotlinc` was available for this pass, and the reference states the suppression without stating the interaction.
- Whether ktlint-gradle and Spotless already accept the `io.github.ktlint.core` group.
- Whether `kover { disable() }` is still a documented 0.9 DSL name, and whether `bound { minValue = N }` still compiles on 0.9.11; the docs show only `minBound(N)`.
- Whether the Dokka `dokkaPublications.configureEach { failOnWarning = true }` assignment form is documented; the docs show `failOnWarning.set(true)`.
- The 62-property ktlint count could not be reproduced (80 with per-rule toggles, 25 without); it stays dated 2026-09-12.
- Whether kotlinx.coroutines marks `async` as must-use for the return-value checker.

## Revision log

- rules/kotlin-quality.md: detekt counts changed from 129 of 231 and 102 off to 129 of 237 and 108 off, read on main.
- lint-gate.md: detekt counts corrected in the family preamble, the Group 1 floor, KT-LINT-01 and agents item 1; the Group 1 floor now names the main commit and the older alpha.6 tag.
- lint-gate.md: Group 2 floor re-dated and relabelled to 99 rule ids under 55 sections, with 1.8.0 named as the newest stable ktlint.
- lint-gate.md: new KT-LINT-09 with its grep block.
- lint-gate.md: Group 3 floor, KT-LINT-07 rule, rationale, verification, grep, example comment and agents item 6 changed from `-Xsuppress-warning` to `-Xwarning-level=NAME:disabled`.
- compiler-and-toolchain.md: KT-COMP-01 context-parameter scope narrowed.
- compiler-and-toolchain.md: KT-COMP-06 table row extended to 2.4.21 and the table re-dated.
- compiler-and-toolchain.md: new KT-COMP-14 with its grep block.
- compiler-and-toolchain.md: KT-COMP-08 gap narrowed to Auto Factory and re-dated.
- compiler-and-toolchain.md: KT-COMP-10 explicit `true` reclassified as cleanup.
- compiler-and-toolchain.md: KT-COMP-11 records Dokka 2.3.0 as the preferred pin.
- compiler-and-toolchain.md: KT-COMP-12 records the missing stability label at 2026-11-27.
- compiler-and-toolchain.md: KT-COMP-13 counts five ways and attributes the buildSrc exception to ktor.
- java-interop.md: Scope re-dated to 2.4.21; KT-INTEROP-06 gains the `@JvmName` and `@JvmExposeBoxed` facts, an adoption clause, a verification clause and a grep block.
- api-and-abi.md: KT-API-02, KT-API-03 and KT-API-07 re-dated with the facts the delta re-read.
- testing.md: KT-TEST-02 names `minBound(N)`, re-dates the docs read, extends the grep and updates the example.
- errors-and-resources.md: `ExitOutsideMain` moved to `potential-bugs:` in the example and the KT-ERR-05 verification.
- coroutines.md: KT-CORO-09 module count stated per read point; dates block re-checked.
- java-interop.md (spillover round): KT-INTEROP-02 states that Jakarta `@Nullable` and `@Nonnull` mismatches are compile errors from Kotlin 2.4.0, so that flavour is left unset.
- java-interop.md (spillover round): KT-INTEROP-03 excludes Jakarta from the flavours that need `-Xnullability-annotations`.

## Edit list

Each entry gives the file, the exact text to find, and the exact replacement. Text inside a fenced block is verbatim, including leading spaces. Apply in order.

1. rules/kotlin-quality.md

Find:
```
shipped `default-detekt-config.yml` activates 129 of its 231 rules, so
```
Replace with:
```
`default-detekt-config.yml` on its main branch (read 2026-11-27) activates 129 of its 237 rules, so
```

2. rules/kotlin-quality.md

Find:
```
`buildUponDefaultConfig = true` runs 102 of them not at all, and the four
```
Replace with:
```
`buildUponDefaultConfig = true` runs 108 of them not at all, and the four
```

3. skills/kotlin-quality-reference/lint-gate.md

Find:
```
shipped config activates 129 of its 231 rules, and every ktlint property you do
```
Replace with:
```
main-branch config activates 129 of its 237 rules, and every ktlint property you do
```

4. skills/kotlin-quality-reference/lint-gate.md

Find:
```
Gate: `./gradlew detekt`. Floors verified 2026-09-12: detekt's shipped
`default-detekt-config.yml` defines 231 rules across 10 rule sets with 129
active, and detekt 2.0 has been in alpha since 2025-09-04, reaching
`2.0.0-alpha.6` on 2026-08-04 against Kotlin 2.4.10 and Gradle 9.6.1.
```
Replace with:
```
Gate: `./gradlew detekt`. Floors verified 2026-11-27: detekt's
`default-detekt-config.yml` on main (commit `72e93bc5967f`, 2026-11-26) defines
237 rules across 10 rule sets with 129 active. The newest release tag,
`v2.0.0-alpha.6`, ships an older file with 119 of 227 active and no
`standard-library` set, so a count names the commit or tag it was read at.
detekt 2.0 has been in alpha since 2025-09-04, and `2.0.0-alpha.6`
(2026-08-04, Kotlin 2.4.10, Gradle 9.6.1) is still its newest release.
```

5. skills/kotlin-quality-reference/lint-gate.md

Find:
```
detekt's default config runs 129 of 231 rules: `comments` ships 0 of 10 active, `style` 38 of 78, `potential-bugs` 18 of 32.
```
Replace with:
```
detekt's default config on main runs 129 of 237 rules: `comments` ships 0 of 10 active, `style` 38 of 80, `potential-bugs` 18 of 34.
```

6. skills/kotlin-quality-reference/lint-gate.md

Find:
```
which for 102 of the 231 rules is off.
```
Replace with:
```
which for 108 of the 237 rules on main is off.
```

7. skills/kotlin-quality-reference/lint-gate.md

Find:
```
says nothing about the 102 rules that are off
```
Replace with:
```
says nothing about the 108 rules that are off
```

8. skills/kotlin-quality-reference/lint-gate.md

Find:
```
2026-09-12: ktlint documents 55 `standard` rules and at least 8 more
`experimental` ones, configured through 62 distinct `ktlint_*` and
`ij_kotlin_*` properties.
```
Replace with:
```
2026-11-27: ktlint 1.8.0 (2025-11-14) is the newest stable release. Its
snapshot documentation lists 99 `standard` rule ids under 55 sections and 8
`experimental` ids (93 and 6 at the 1.8.0 tag), configured through 62 distinct
`ktlint_*` and `ij_kotlin_*` properties (counted 2026-09-12).
```

9. skills/kotlin-quality-reference/lint-gate.md (insertion)

Anchor (end of the KT-LINT-05 row):
```
Empty output means the project takes its code style unmodified, which is the pass. | SHOULD |
```
Insert after it, as the next table row on its own line:
```
| KT-LINT-09 | Pin ktlint's stable 1.x line, coordinate group `com.pinterest.ktlint`, in a gate of record. Never wire a `2.0.0-ALPHA` build, and never rewrite a `com.pinterest.ktlint` coordinate to a guessed new group. Verified 2026-11-27, when 1.8.0 was the newest stable release. | The project left Pinterest and now lives at `github.com/ktlint/ktlint`. Its 2.x line exists only as alphas: `2.0.0-ALPHA-4` (2026-08-21) published under `io.github.ktlint`, and `2.0.0-ALPHA-5` (2026-11-23) under `io.github.ktlint.core`, built against Kotlin 2.5.0-RC2 and marked not for production. The group changed twice in one cycle, so a coordinate written from memory is wrong either way, and detekt's ktlint wrapper still bundles ktlint 1.8.0. Re-check when ktlint 2.0.0 stable ships. | see block KT-LINT-09. Any hit is the finding, and empty output is the pass. Then read the version the ktlint plugin or Spotless step pins: a value containing `ALPHA` is the finding. | SHOULD |
```

10. skills/kotlin-quality-reference/lint-gate.md (insertion)

Anchor:
```
  xargs -0 -r grep -H -n -e 'ktlint_standard_' -e 'ktlint_experimental' --
```
Insert after it:
```
# KT-LINT-09
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.gradle.kts' \
  ':(glob)**/*.gradle' ':(glob)**/*.toml' |
  xargs -0 -r grep -H -n -i -e 'io.github.ktlint' -e 'ktlint.*alpha' --
```

11. skills/kotlin-quality-reference/lint-gate.md

Find:
```
Gate: `./gradlew compileKotlin`. Floors verified 2026-09-12: `-Wextra`, spelled
`extraWarnings` in the Gradle DSL, arrived in Kotlin 2.1 and is still
Experimental, as is `-Xsuppress-warning=NAME` from the same release.
```
Replace with:
```
Gate: `./gradlew compileKotlin`. Floors verified 2026-09-12: `-Wextra`, spelled
`extraWarnings` in the Gradle DSL, arrived in Kotlin 2.1 and was still
Experimental through 2.4.0. The compiler reference read 2026-11-27 gives it no
stability label, no longer documents `-Xsuppress-warning=NAME`, and documents
`-Xwarning-level=NAME:(error|warning|disabled)` as the per-warning control.
```

12. skills/kotlin-quality-reference/lint-gate.md

Find:
```
Before promoting, know that `-Xsuppress-warning=NAME` silences a warning globally and cannot silence an error. |
```
Replace with:
```
The one per-name exemption from that promotion is `-Xwarning-level=NAME:disabled`, which suppresses that warning module-wide: declare it in the same plugin with its reason on the line above, because it is a weakening under `KT-CORE-01`. |
```

13. skills/kotlin-quality-reference/lint-gate.md

Find:
```
Once a warning is promoted the per-name escape hatch is gone, and the remaining exits are fixing the code or un-promoting the whole set, so the promotion is a commitment rather than a setting. An unknown warning name passed to that flag is itself a compile error, so the hatch cannot be used speculatively either.
```
Replace with:
```
Once warnings are promoted, the exits are fixing the code, a per-name `-Xwarning-level` exemption, or un-promoting the whole set, so the promotion is a commitment rather than a setting. `-Xsuppress-warning=NAME`, the older per-name flag, is absent from the compiler reference read 2026-11-27, so it is not the exemption to reach for.
```

14. skills/kotlin-quality-reference/lint-gate.md

Find:
```
which is the pass for an adopter and the finding for a module you author. | SHOULD |
```
Replace with:
```
which is the pass for an adopter and the finding for a module you author. Every `Xwarning-level` hit ending in `:disabled` with no reason on the line above is also the finding. | SHOULD |
```

15. skills/kotlin-quality-reference/lint-gate.md

Find:
```
  xargs -0 -r grep -H -n -e 'allWarningsAsErrors' --
```
Replace with:
```
  xargs -0 -r grep -H -n -e 'allWarningsAsErrors' -e 'Xwarning-level' -e 'Xsuppress-warning' --
```

16. skills/kotlin-quality-reference/lint-gate.md

Find:
```
        allWarningsAsErrors.set(true)  // KT-LINT-07: after this, -Xsuppress-warning cannot reach them
```
Replace with:
```
        allWarningsAsErrors.set(true)  // KT-LINT-07: after this, only a reasoned -Xwarning-level exemption reaches one
```

17. skills/kotlin-quality-reference/lint-gate.md

Find:
```
6. **Promoting warnings to errors and then reaching for `-Xsuppress-warning`**
   when one bites. The flag cannot silence an error, so the reflex fix does not
   compile, and the next reflex is to un-promote the whole set.
```
Replace with:
```
6. **Promoting warnings to errors and then reaching for `-Xsuppress-warning`**
   when one bites. The compiler reference no longer documents that flag, the
   documented per-name exemption is `-Xwarning-level=NAME:disabled`, and either
   one is a weakening that needs its reason, not a reflex.
```

18. skills/kotlin-quality-reference/compiler-and-toolchain.md

Find:
```
or `-Xcontext-parameters` (Stable in 2.4.0, 2026-07-14).
```
Replace with:
```
or `-Xcontext-parameters` (context parameters Stable in 2.4.0, 2026-07-14, except context arguments and callable references, which stay behind the separate `-Xexplicit-context-arguments`).
```

19. skills/kotlin-quality-reference/compiler-and-toolchain.md (insertion)

Anchor (end of the KT-COMP-07 row):
```
as is any prose or comment offering a K1 fallback. | MUST |
```
Insert after it, as the next table row on its own line:
```
| KT-COMP-14 | Pin the Kotlin Gradle plugin at **2.4.20** or newer on every build. Verified 2026-11-27, when 2.4.21 was the current patch. | KGP before 2.4.20 allowed code execution through unsafe deserialization of build-cache metadata ([GHSA-r937-wjx7-w2jp](https://github.com/advisories/GHSA-r937-wjx7-w2jp), CVSS 6.7, fixed in 2.4.20-Beta1). Any build whose cache entries someone else can write, a shared or remote cache or one restored in CI, is exposed. The fix stays inside the 2.4 line and raises the Gradle ceiling rather than lowering it, so no other pin has to move. | see block KT-COMP-14, read against 2.4.20. A KGP version below 2.4.20 is the finding. Empty output means the version is declared somewhere this grep does not read, such as a convention plugin's dependency, and that declaration is read instead. | MUST |
```

20. skills/kotlin-quality-reference/compiler-and-toolchain.md (insertion)

Anchor:
```
  xargs -0 -r grep -H -n -e 'jvmTargetValidationMode' --
```
Insert after it:
```
# KT-COMP-14
git ls-files -z --cached --others --exclude-standard -- 'gradle/libs.versions.toml' \
  ':(glob)**/*.gradle.kts' |
  xargs -0 -r grep -H -n -E -e '^kotlin[[:space:]]*=' \
    -e '(kotlin\("[a-z.]+"\)|id\("org\.jetbrains\.kotlin\.[a-z.]+"\))[[:space:]]+version' --
```

21. skills/kotlin-quality-reference/compiler-and-toolchain.md

Find:
```
| 2.4.20 | 9.7.0 |
```
Replace with:
```
| 2.4.20 through 2.4.21 | 9.7.0 |
```

22. skills/kotlin-quality-reference/compiler-and-toolchain.md

Find:
```
range on the same page, and Android is otherwise outside this rule set's scope.
Verified 2026-09-12.
```
Replace with:
```
range on the same page, and Android is otherwise outside this rule set's scope.
Verified 2026-11-27.
```

23. skills/kotlin-quality-reference/compiler-and-toolchain.md

Find:
```
The one recorded upstream gap is `auto-value` and Auto Factory ([ksp-overview](https://kotlinlang.org/docs/ksp-overview.html)), verified 2026-09-12.
```
Replace with:
```
The one upstream gap the supported-libraries table records is Auto Factory ([ksp-overview](https://kotlinlang.org/docs/ksp-overview.html)), verified 2026-11-27.
```

24. skills/kotlin-quality-reference/compiler-and-toolchain.md

Find:
```
and an explicit `true` is a recorded migration carve-out rather than a defect.
```
Replace with:
```
and an explicit `true` is not a defect but is cleanup, because the plugin's own error text says the `ksp.useKSP2` property will be removed.
```

25. skills/kotlin-quality-reference/compiler-and-toolchain.md

Find:
```
DGP v2 has been the default since Dokka 2.1.0 and K2 analysis is stable from 2.2.0, which is where the corpus converges.
```
Replace with:
```
DGP v2 has been the default since Dokka 2.1.0 and K2 analysis is stable from 2.2.0, which is where the corpus converges. Dokka 2.3.0 (2026-11-05, verified 2026-11-27) removed K1 analysis and updates its bundled FreeMarker, jsoup and Jackson for security advisories, so it is the preferred pin above that floor.
```

26. skills/kotlin-quality-reference/compiler-and-toolchain.md

Find:
```
The option has been experimental since Kotlin 2.1.0 and was still not promoted through 2.4.0 (verified 2026-09-12),
```
Replace with:
```
The option has been experimental since Kotlin 2.1.0 and was still not promoted through 2.4.0 (verified 2026-09-12; the reference pages read 2026-11-27 give it no stability label),
```

27. skills/kotlin-quality-reference/compiler-and-toolchain.md

Find:
```
Four precedence levels each override the last, and the buildSrc exception is the one that silently does nothing: a heap bump that never reaches the daemon it was written for reads as a fix and changes no behaviour ([gradle-compilation-and-caches](https://kotlinlang.org/docs/gradle-compilation-and-caches.html)).
```
Replace with:
```
The Kotlin docs list five ways to set daemon arguments, each overriding the one before ([gradle-compilation-and-caches](https://kotlinlang.org/docs/gradle-compilation-and-caches.html), read 2026-11-27). The buildSrc exception is not on that page and rests on an in-repository comment in ktor's `gradle.properties`, and it is the one that silently does nothing: a heap bump that never reaches the daemon it was written for reads as a fix and changes no behaviour.
```

28. skills/kotlin-quality-reference/java-interop.md

Find:
```
- **Every version fact below was read from kotlinlang.org at Kotlin 2.4.0,
  2.4.10 being the current patch, fetched 2026-09-05 and unchanged at the
  corpus verification date 2026-09-12.** K1 was removed in 2.4.0, so nothing
```
Replace with:
```
- **Every version fact below was read from kotlinlang.org at Kotlin 2.4.0,
  fetched 2026-09-05, and the pages were re-read 2026-11-27 with 2.4.21 the
  current patch and 2.5.0 still a release candidate.** K1 was removed in 2.4.0, so nothing
```

29. skills/kotlin-quality-reference/java-interop.md

Find:
```
That includes `kotlin.Result`, which is a value class. |
```
Replace with:
```
That includes `kotlin.Result`, which is a value class. Turning on `@JvmExposeBoxed` or `-Xjvm-expose-boxed` in a published module is an Experimental adoption recorded as a decision, never a quiet interop fix. |
```

30. skills/kotlin-quality-reference/java-interop.md

Find:
```
A hyphen is not a legal Java identifier character, so the member is not callable from Java at all, and nothing in the Kotlin source says so.
```
Replace with:
```
A hyphen is not a legal Java identifier character, so under default compilation the member is not callable from Java, and nothing in the Kotlin source says so. An explicit `@JvmName` removes the hyphen, and `@JvmExposeBoxed` (or module-wide `-Xjvm-expose-boxed`) adds a boxed variant Java can call, but that annotation is Experimental behind `@OptIn(ExperimentalStdlibApi::class)` and drew a stream of defects from 2.4.20 through 2.5.0-RC, a cross-module `NoSuchMethodError` among them (verified 2026-11-27).
```

31. skills/kotlin-quality-reference/java-interop.md

Find:
```
Any hit on a member Java is meant to call is the finding. Empty output is the pass. |
```
Replace with:
```
Any hit on a member Java is meant to call is the finding. Empty output is the pass. Then see block KT-INTEROP-06: a hit in a published module with no comment recording the Experimental adoption is the finding, and empty output is the pass. |
```

32. skills/kotlin-quality-reference/java-interop.md (insertion)

Anchor:
```
  xargs -0 -r grep -H -n -e '@Throws' --
```
Insert after it:
```
# KT-INTEROP-06
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.kt' ':(glob)**/*.gradle.kts' |
  xargs -0 -r grep -H -n -e 'JvmExposeBoxed' -e 'jvm-expose-boxed' --
```

33. skills/kotlin-quality-reference/api-and-abi.md

Find:
```
Dokka 2.x, K2-stable from 2.2.0, verified 2026-09-12.
```
Replace with:
```
Dokka 2.x, K2-stable from 2.2.0 (verified 2026-09-12) and K2-only from 2.3.0 (verified 2026-11-27).
```

34. skills/kotlin-quality-reference/api-and-abi.md

Find:
```
Standalone BCV 0.18.x needs Gradle 6.1.1+ and Kotlin 1.6.20+. `abiValidation()` needs Kotlin 2.2.0+ and is still Experimental. Verified 2026-09-12.
```
Replace with:
```
Standalone BCV 0.18.x needs Gradle 6.1.1+ and Kotlin 1.6.20+ (verified 2026-09-12). `abiValidation()` needs Kotlin 2.2.0+ and is still Experimental, its stabilisation issue KT-71172 still open (verified 2026-11-27).
```

35. skills/kotlin-quality-reference/api-and-abi.md

Find:
```
and it is Experimental as of Kotlin 2.2, verified 2026-09-12.
```
Replace with:
```
and it is still Experimental in Kotlin 2.4, verified 2026-11-27.
```

36. skills/kotlin-quality-reference/testing.md

Find:
```
A Kover floor is a `verify { rule { bound { minValue = N } } }` block.
```
Replace with:
```
A Kover floor is a `verify { rule { minBound(N) } }` block, the documented form, or the longer `bound { minValue = N }` inside the same `rule`.
```

37. skills/kotlin-quality-reference/testing.md

Find:
```
and Kover's own documentation (0.9.8, read 2026-09-12) never states the binding.
```
Replace with:
```
and Kover's own documentation (read 2026-11-27, examples still pinned at 0.9.8 while the newest release is 0.9.11) never states the binding.
```

38. skills/kotlin-quality-reference/testing.md

Find:
```
-e 'koverVerify' -e 'minValue' -e 'onCheck' --
```
Replace with:
```
-e 'koverVerify' -e 'minBound' -e 'minValue' -e 'onCheck' --
```

39. skills/kotlin-quality-reference/testing.md

Find:
```
kover { reports { verify { rule { bound { minValue = 90 } } } } }
```
Replace with:
```
kover { reports { verify { rule { minBound(90) } } } }
```

40. skills/kotlin-quality-reference/errors-and-resources.md

Find:
```
exceptions:
  ExitOutsideMain:
    active: true          # ships false
  SwallowedException:
```
Replace with:
```
potential-bugs:
  ExitOutsideMain:
    active: true          # ships false
exceptions:
  SwallowedException:
```

41. skills/kotlin-quality-reference/errors-and-resources.md

Find:
```
a hit setting `active: true` is the pass.
```
Replace with:
```
a hit setting `active: true` under `potential-bugs:`, the rule set that holds it, is the pass.
```

42. skills/kotlin-quality-reference/coroutines.md

Find:
```
**No lint exists**, confirmed across detekt's whole ten-rule coroutines module.
```
Replace with:
```
**No lint exists**, confirmed across detekt's whole coroutines module: ten rules on main at 2026-11-26, nine at `v2.0.0-alpha.6`.
```

43. skills/kotlin-quality-reference/coroutines.md

Find:
```
Verified 2026-09-12 unless a row says otherwise.
```
Replace with:
```
Verified 2026-09-12 unless a row says otherwise, and re-checked 2026-11-27, when kotlinx.coroutines 1.11.0 was still the newest release.
```

## Spillover round

Input: the spillover check for kotlin-quality (four items relayed from java-quality, gradle-build and maven-build), read 2026-11-27.

### Verdict

- Change KT-INTEROP-02 and KT-INTEROP-03 in place for Jakarta nullability. Kotlin 2.4.0 raised Jakarta `@Nullable` and `@Nonnull` mismatches from warnings (since 2.2.0) to compile errors, so Jakarta is now a flavour the compiler enforces by default. KT-INTEROP-02 never said so, and KT-INTEROP-03's "neither JSpecify nor JSR-305" premise wrongly put Jakarta among the flavours that need `-Xnullability-annotations`. Skill bump: patch. Rule bump: none, because the rule index row 12 is unchanged and still true.
- Leave the Kover `check` wiring (KT-TEST-02, index row 14), the JUnit 6 baseline and the KGP-to-Gradle ceiling as they are: each is confirmed and the target already states it correctly or makes no claim.
- Make no change for JDK 27 GA: the date is secondary only, and the pair makes no JDK 27 statement.

### Changed rules

#### KT-INTEROP-02 (java-interop.md)

- Old text (rule): "JSpecify is `strict` by default from Kotlin 2.1.0 (verified 2026-09-12), so leave it unset."
- New text (rule): the same sentence, followed by "Jakarta `@Nullable` and `@Nonnull` (`jakarta.annotation`) mismatches were warnings from Kotlin 2.2.0 and are compile errors from 2.4.0 (verified 2026-11-27), so leave that flavour unset as well."
- Verification is unchanged in mechanism: the existing flag grep already reads `Xnullability-annotations`, so a `-Xnullability-annotations=@jakarta.annotation:warn` or `:ignore` hit is a value of `warn` or `ignore`, which the cell already names as the finding.
- Source: https://kotlinlang.org/docs/compatibility-guide-24.html, entry "Enforce Jakarta nullability annotations" (KTLC-285, deprecation cycle "2.2.0: report a warning ... 2.4.0: raise the warning to an error"), re-read 2026-11-27.

#### KT-INTEROP-03 (java-interop.md)

- Old text (rule): "A Java dependency annotated with a flavour that is neither JSpecify nor JSR-305 gets its package named"
- New text (rule): "A Java dependency annotated with a flavour that is neither JSpecify, JSR-305 nor Jakarta gets its package named"
- Verification is unchanged: the coordinate grep does not list Jakarta, so no new finding or pass changes.
- Source: the same compatibility-guide entry, whose summary states that the compiler now enforces declared nullability for Java declarations using `jakarta.annotation.Nullable` or `jakarta.annotation.Nonnull`, with no flag named.

### New rules

None.

### Declined

- Kover `check` depends on `koverVerify` since 0.7.0 (from java-quality): confirmed by the maintainers' issue https://github.com/Kotlin/kotlinx-kover/issues/523, and KT-TEST-02 and index row 14 already state it and cite that issue. The optional re-date of "(verified 2026-09-12)" is declined because the text is true as written and the first round already re-dated the docs read in the same cell.
- JUnit 6.0.0 baseline is Kotlin 2.1 (from java-quality): confirmed by https://docs.junit.org/current/release-notes/ ("Java 17 and Kotlin 2.1 baseline"), but the pair makes no JUnit-to-Kotlin-version claim, so there is nothing to correct.
- KGP 2.4.20 and 2.4.21 cap at Gradle 9.7.0 (from gradle-build): confirmed by https://kotlinlang.org/docs/gradle-configure-project.html, and the KT-COMP-06 table already reads "2.4.20 through 2.4.21 | 9.7.0" after the first round. The "9.8 and 9.9 may warn" part is gradle-build's inference, not stated by the page, so it is not added.
- JDK 27 GA on 2026-09-15 (from maven-build): unconfirmed. The Oracle press release and the OpenJDK project page returned HTTP 403, and the date rests on a search snippet. The pair also makes no JDK 27 or "not yet GA" statement, so nothing is stale either way.

### Sources

| Change | Source | Read |
|---|---|---|
| KT-INTEROP-02 Jakarta sentence | https://kotlinlang.org/docs/compatibility-guide-24.html (KTLC-285) | 2026-11-27 |
| KT-INTEROP-03 Jakarta exclusion | https://kotlinlang.org/docs/compatibility-guide-24.html (KTLC-285) | 2026-11-27 |

### Edit list (spillover round)

Each entry gives the file, the exact text to find, and the exact replacement. Text inside a fenced block is verbatim. Apply in order, after the first-round edit list.

1. skills/kotlin-quality-reference/java-interop.md

Find:
```
JSpecify is `strict` by default from Kotlin 2.1.0 (verified 2026-09-12), so leave it unset.
```
Replace with:
```
JSpecify is `strict` by default from Kotlin 2.1.0 (verified 2026-09-12), so leave it unset. Jakarta `@Nullable` and `@Nonnull` (`jakarta.annotation`) mismatches were warnings from Kotlin 2.2.0 and are compile errors from 2.4.0 (verified 2026-11-27), so leave that flavour unset as well.
```

2. skills/kotlin-quality-reference/java-interop.md

Find:
```
A Java dependency annotated with a flavour that is neither JSpecify nor JSR-305 gets its package named
```
Replace with:
```
A Java dependency annotated with a flavour that is neither JSpecify, JSR-305 nor Jakarta gets its package named
```

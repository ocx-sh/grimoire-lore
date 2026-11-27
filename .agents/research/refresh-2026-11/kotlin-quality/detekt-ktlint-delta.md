---
title: detekt and ktlint delta, 2026-09-12 to 2026-11-27
pair: kotlin-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 17
---

# detekt and ktlint delta, 2026-09-12 to 2026-11-27

Scope: a delta against the 2026-09-12 baseline (catalogue dated 2026-09-05; default config read at main commit `45672efb8b`, committed 2026-09-04). Every fact below was read from the GitHub API or a documentation page on 2026-11-27. Nothing is from memory.

## Contents

1. Summary
2. Findings
3. Per-claim verdict
4. Normative guidance candidates
5. AI-agent angle
6. Contested / evolving
7. Sources

## Summary

- detekt did NOT cut 2.0 stable. The newest tag is still `v2.0.0-alpha.6` (2026-08-04); the newest release overall is still the 1.x line's `v1.23.8` as the stable one. No tag or release appeared in the window. A release-candidate or `2.0.0` tag does not exist.
- The detekt website changelog for 2.0.0 on main still says "Detekt 2.0.0 is still in alpha" and carries an `## UNRELEASED` section that names `2.0.0-alpha.7` as the next version.
- The default config at the newest release TAG (`v2.0.0-alpha.6`, 859 lines) is OLDER than the baseline commit: it has 119 active of 227 rules and no `standard-library` rule set. The baseline's 129 of 231 came from main, not from a tag. Main today (commit `72e93bc5967f`, 2026-11-26, 868 lines) still activates exactly 129 rules, but of 237.
- Main added 6 rules, all `active: false`: `MissingStackTraceRecoverable` (coroutines), `UnnecessarySubjectlessWhen`, `EqualsWithHashCodeUseSameFields`, `IgnoredJavaDefaultMethod`, `CollapseAnnotationUseSiteTargets`, `ForbiddenSuperclass`. One default changed: `maxDestructuringEntries` 3 to 5. One option added: `onlyConditionals: true`.
- Coroutines count is settled: 9 rules at the baseline commit (4 active), 10 rules on main since 2026-11-04 (still 4 active, the tenth is inactive).
- ktlint changed hands and moved to a new major line. The project is no longer maintained by Pinterest, lives at `github.com/ktlint/ktlint`, and shipped `2.0.0-ALPHA-4` (2026-08-21 tag, release notes dated 2026-08-20 in the changelog) and `2.0.0-ALPHA-5` (2026-11-23). No stable 2.x. The newest stable is still `1.8.0` (2025-11-14).
- ktlint 2.x coordinates: `io.github.ktlint` in ALPHA-4, `io.github.ktlint.core` in ALPHA-5; Java 8 and 11 support dropped in ALPHA-4. The default code style is still `ktlint_official`.
- ktlint-gradle plugin: no release in the window (newest `v14.2.0`, 2026-03-12). `ignoreFailures` semantics are unchanged.

## Findings

### 1. detekt release state

`gh api repos/detekt/detekt/releases` returns, newest first: `v2.0.0-alpha.6` 2026-08-04, `v2.0.0-alpha.5` 2026-06-17, `v2.0.0-alpha.4` 2026-06-13, alpha.3 2026-04-24, alpha.2 2026-01-27, alpha.1 2025-10-21, all `prerelease: true`. The tags endpoint agrees (newest `v2.0.0-alpha.6`). Sources: [releases](https://github.com/detekt/detekt/releases), [alpha.6 release](https://github.com/detekt/detekt/releases/tag/v2.0.0-alpha.6).

The alpha.6 release body states "built against Kotlin 2.4.10, Gradle 9.6.1, AGP 9.3.1 and is tested against JDK 25" and that `detekt-rules-ktlint-wrapper` now targets JVM 17 "in preparation for the next ktlint major release which requires JVM 17+". This confirms the lint-gate Group 1 sentence verbatim.

The 2.0.0 changelog page on main ([changelog-2.0.0.mdx](https://github.com/detekt/detekt/blob/main/website/src/pages/changelog-2.0.0.mdx)) opens with "Detekt 2.0.0 is still in alpha. ... you can expect further breaking changes before we reach a stable release." Its `UNRELEASED` section lists: ktlint rules no longer carry per-rule `autoCorrect: true` (PR 9688); strict YAML typing, `active: "true"` no longer parses (PR 9049); complexity and statistics reports moved out of core into `dev.detekt:detekt-report-complexity` and `dev.detekt:detekt-report-statistics`, shown at version `2.0.0-alpha.7`.

Main moved a lot in the window (252 commits ahead of alpha.6) and also contains: Clikt replacing JCommander in the CLI (#9737), Gradle task property `classpath` renamed `libraries` (#9872), a custom `dependencies` block for plugin dependencies (#9871), "[6/6][autoCorrect] Enable capable rules by default" (#9689). None of these are in a released tag.

### 2. detekt default config

Read three times:

| Read at | Lines | Active / total | Rule sets present |
|---|---|---|---|
| Tag `v2.0.0-alpha.6` (newest release tag) | 859 | 119 / 227 | comments 0/10, complexity 7/15, coroutines 4/9, empty-blocks 15/15, exceptions 11/15, naming 13/21, performance 4/8, potential-bugs 21/39, style 44/95; no `standard-library` |
| Commit `45672efb8b` (baseline, 2026-09-04) | 853 | 129 / 231 | comments 0/10, complexity 7/13, coroutines 4/9, empty-blocks 15/15, exceptions 13/15, naming 13/21, performance 2/5, potential-bugs 18/32, standard-library 19/33, style 38/78 |
| main `72e93bc5967f` (2026-11-26) | 868 | 129 / 237 | same as baseline except complexity 7/13, coroutines 4/10, performance 2/6, potential-bugs 18/34, style 38/80 |

Counts are from a rule-block parse of `detekt-core/src/main/resources/default-detekt-config.yml` (top-level key, rule name at two-space indent, `active:` at four). The baseline row reproduces the corpus figures exactly (129/231, style 38/78, potential-bugs 18/32, comments 0/10), so the method matches the baseline method. `formatting`, `libraries` and `ruleauthors` are absent from the config at all three reads (the modules `detekt-rules-libraries` and `detekt-rules-ruleauthors` exist in the repository tree but contribute no section to this file).

Diff baseline to main (all of it): six new `active: false` rules, `maxDestructuringEntries: 3` to `5`, one new option `onlyConditionals: true`. The activated count did not move.

Rule-level checks on main:
- Coroutines: `CoroutineLaunchedInTestWithoutRunTest`, `GlobalCoroutineUsage`, `SuspendFunInFinallySection`, `SuspendFunSwallowedCancellation`, `SuspendFunWithCoroutineScopeReceiver` and the new `MissingStackTraceRecoverable` are `active: false`; `InjectDispatcher`, `RedundantSuspendModifier`, `SleepInsteadOfDelay`, `SuspendFunWithFlowReturnType` are `active: true`. Source tree `detekt-rules-coroutines/src/main` lists 10 rule classes. Package is `dev.detekt.rules.coroutines`.
- Exceptions: `SwallowedException` and `ThrowingNewInstanceOfSameException` active; `ExitOutsideMain` `active: false`. `SwallowedException`'s `ignoredExceptionTypes` still lists `InterruptedException` (present in the config at the baseline, not in the diff). In alpha.6 `ErrorUsageWithThrowable` and `ObjectExtendsThrowable` were inactive (exceptions 11/15); at baseline and main both are active (13/15). That is a pre-baseline change, but note the tag is older.
- No rule named for `InterruptedException` handling was added (new rule list above). Claim "no InterruptedException-specific rule exists" still holds on main.

### 3. detekt ktlint wrapper and packaging

- Module `detekt-rules-ktlint-wrapper` still exists on main, source package `dev/detekt/rules/ktlintwrapper`. It still bundles `com.pinterest.ktlint:ktlint-ruleset-standard` at version `ktlint = "1.8.0"` (`gradle/libs.versions.toml`). It does NOT follow ktlint 2.x yet.
- Strict `active: true` typing is documented in the UNRELEASED changelog section (PR 9049), unchanged from the baseline claim, still not in a tag.
- Report plugins: `dev.detekt:detekt-report-complexity` and `-statistics` are now documented as plugins; the repository root also lists `detekt-report-checkstyle`, `-html`, `-markdown`, `-sarif`. The claim "separate `dev.detekt:detekt-report-*` plugins" holds and widened.

### 4. ktlint

- `gh api repos/pinterest/ktlint/releases` redirects to `ktlint/ktlint`. Releases: `2.0.0-ALPHA-5` 2026-11-23, `2.0.0-ALPHA-4` 2026-08-21, `1.8.0` 2025-11-14 (latest stable). Both alphas are `prerelease`. Both alpha notes open with "This project is no longer maintained by Pinterest" and give the new Maven group. [Releases](https://github.com/ktlint/ktlint/releases), [ALPHA-5](https://github.com/ktlint/ktlint/releases/tag/2.0.0-ALPHA-5), [ALPHA-4](https://github.com/ktlint/ktlint/releases/tag/2.0.0-ALPHA-4), [CHANGELOG](https://github.com/ktlint/ktlint/blob/master/CHANGELOG.md).
- ALPHA-5 is built on a release candidate of Kotlin (`2.5.0-RC2`) and warns against production use. It switches from `kotlin-compiler-embeddable` to Kotlin Analysis API dependencies and moves violation emission into `RuleV2`. Migration guide: [migrate-to-ktlint-2.x](https://ktlint.github.io/ktlint/dev-snapshot/api/migrate-to-ktlint-2.x/) (group `com.pinterest.ktlint` to `io.github.ktlint.core`, packages `com.pinterest.ktlint` to `io.github.ktlint.core`).
- JVM: CHANGELOG, ALPHA-4 section, "Drop support for Java 8 and 11" (PR 3256). The minimum is therefore 17 by implication; no page read states the number 17 for ktlint itself. detekt alpha.6 states "next ktlint major release which requires JVM 17+".
- Default code style: [code-styles](https://ktlint.github.io/ktlint/dev-snapshot/rules/code-styles/) still says "`ktlint_official` is the default code style". ALPHA-4's only default change is `blank-line-before-declaration` now enabled for `android_studio`. A prior change, `no-unused-imports` kept opt-in, was already in 1.7.0.
- Rule counts (snapshot docs, `documentation/snapshot/docs/rules/standard.md`): 55 `## ` sections, but 99 unique `Rule id:` lines; experimental page: 8 ids (`blank-line-before-file-annotation`, `blank-line-before-imports`, `blank-line-before-package`, `call-expression-wrapping`, `expression-operand-wrapping`, `kdoc-delimiter`, `lambda-return`, `no-blank-line-at-start-of-file`). At tag 1.8.0 the same page has 51 sections, 93 ids, 6 experimental. The baseline "55 `standard` rules" therefore reproduces as a section count, not a rule count. `StandardRuleSetProvider` registers 99 providers at 1.8.0 and 101 on master.
- The "62 distinct `ktlint_*`/`ij_kotlin_*` properties" figure could not be reproduced: my own grep of the documentation pages gives 80 distinct names including per-rule `ktlint_standard_*` toggles and 25 excluding them, so the figure depends on a counting method I cannot see. Treat as "could not determine".
- ktlint-gradle ([releases](https://github.com/JLLeitschuh/ktlint-gradle/releases)): newest `v14.2.0` 2026-03-12; no release in the window. `KtlintExtension.ignoreFailures` is a `Property<Boolean>` defaulting to `false`; `ConsoleReportWorkAction` fails only when `!ignoreFailures && isLintErrorsFound`. detekt: `ignoreFailures` remains on `DetektExtension` and the tasks, and `FailOnSeverityArgument` maps `ignoreFailures` to `FailOnSeverity.Never`.

## Per-claim verdict

| Claim | Verdict | Detail |
|---|---|---|
| "activates 129 of its 231 rules" | **changed (denominator), re-dated** | On main 2026-11-26 (`72e93bc5967f`): 129 of 237. The 129 is unchanged. The newest release tag `v2.0.0-alpha.6` reads 119 of 227, so say "main" never "release". Source: default-detekt-config.yml, 2026-11-26. |
| `comments` 0/10, `style` 38/78, `potential-bugs` 18/32 | **changed (denominators)** | main: comments 0/10, style 38/80, potential-bugs 18/34. Active counts unchanged. Alpha.6 tag: 0/10, 44/95, 21/39. |
| `formatting`, `libraries`, `ruleauthors` absent | unchanged | Absent at alpha.6, baseline and main. |
| 2.0 alpha since 2025-09-04, `alpha.6` 2026-08-04, Kotlin 2.4.10, Gradle 9.6.1 | unchanged | No newer tag. Re-date to 2026-11-27: still newest. |
| KT-LINT-02/03: wrapper rename, `dev.detekt.rules.ktlintwrapper`, `dev.detekt`, `active: "true"` rejection, separate report plugins | unchanged | All still unreleased-or-alpha; wrapper still bundles ktlint 1.8.0. Report plugin list widened (complexity, statistics now first party plugins at `2.0.0-alpha.7`). |
| "Read the coordinate first" / "mid package rename" phrases | unchanged | Do NOT convert to plain statements: detekt 2.0 is not stable. |
| KT-CORO-01: four rules `active: false`, four others active, `dev.detekt.rules.coroutines` | unchanged | Premise holds on main 2026-11-26. This closes jvm-concurrency.md open question 3 only to the extent of "main" and "alpha.6"; no stable branch release exists to answer it. |
| KT-CORO-09 "ten-rule coroutines module" / catalogue "9 rules" | **changed** | Both were right at different times. 9 at `45672efb8b`; 10 on main since PR 9775 (2026-11-04, `MissingStackTraceRecoverable`, inactive). Write "ten rules on main, four active; nine rules at alpha.6". |
| errors-and-resources: `ExitOutsideMain` inactive; `SwallowedException`, `ThrowingNewInstanceOfSameException` active; `InterruptedException` in `ignoredExceptionTypes`; no InterruptedException rule | unchanged | Verified on main. Note `ExitOutsideMain` is in the potential-bugs section, not exceptions. |
| ktlint "55 standard and 8 experimental, 62 properties" | **changed (relabel)** | 55 is a section count; unique rule ids are 99 standard plus 8 experimental on snapshot docs (93 and 6 at 1.8.0). 62: could not determine. |
| `ktlint_official` vs `intellij_idea` | unchanged | Default remains `ktlint_official`. |
| ktlint next major requires JVM 17+ | unchanged, now shipped in alpha | ktlint 2.0.0-ALPHA-4 dropped Java 8 and 11. Not stable. |
| Did ktlint ship a new major / change default style? | answer | New major only as alphas (2.0.0-ALPHA-4, -5); no stable; default style unchanged. Project moved from Pinterest to `ktlint/ktlint`, group `io.github.ktlint.core`. New fact the corpus lacks. |
| KT-LINT-08 `ignoreFailures` semantics | unchanged | Verified in source of both plugins. |

## Normative guidance candidates

1. Rule: when citing detekt default-config counts, name the commit or tag and use "main" for 129/237; never "release". Rationale: the only tag with a 2.0 config reads 119/227. Verify: `grep -nE "129 of its 231|of 231" rules/kotlin-quality.md skills/kotlin-quality-reference/*.md` must be empty or carry a read-at commit.
2. Rule: replace "nine"/"ten" coroutines-module counts with "ten on main, nine at alpha.6, four active in both". Verify: `grep -nE "ten-rule|9 rules|nine" skills/kotlin-quality-reference/coroutines.md`.
3. Rule: pin ktlint by group and say which line; a gate on 1.x uses `com.pinterest.ktlint`, any 2.x alpha uses `io.github.ktlint.core` and must not ship in production. Rationale: 2.0.0-ALPHA-5 is built on a Kotlin RC. Verify: grep build files for `com.pinterest.ktlint` and `io.github.ktlint` and reject `ALPHA` coordinates.
4. Rule: relabel "55 standard rules" as "55 documented sections, about 99 rule ids". Verify: `grep -n "55" skills/kotlin-quality-reference/lint-gate.md`.
5. Rule: keep KT-LINT-03's "Read the coordinate first" and every "mid package rename" phrase. Rationale: detekt 2.0 is alpha; a stable cut is the trigger to convert them. Verify: `gh api repos/detekt/detekt/releases --jq '.[].tag_name' | grep -E '^v?2\.0\.0$'` returns nothing until then.

## AI-agent angle

- An agent will read the `main` default config and report it as "the 2.0 default". Mechanical check: ask which commit or tag; compare against `gh api repos/detekt/detekt/tags`.
- An agent will write `com.pinterest.ktlint` for ktlint 2.x or `io.github.ktlint` for ALPHA-5 (the group changed twice in one cycle). Check the migration guide page and the Maven group in the lockfile.
- An agent may assume ktlint-gradle follows ktlint 2.x; the plugin has no release since 2026-03-12.

## Contested / evolving

- detekt 2.0 stable date unknown; next tag expected is `alpha.7` (named in the unreleased changelog). Trend: alphas every 2 to 4 months; none since 2026-08-04 (115 days at 2026-11-27).
- ktlint 2.x is moving under new maintainers; ALPHA-5 on a Kotlin RC. Whether detekt's wrapper follows 2.x is open (still 1.8.0 on main).
- Autocorrect-by-default for capable detekt rules (PR 9689) landed on main 2026-11-13 and could change active semantics for formatting-style rules once released; it did not change `active` counts.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/detekt/detekt/releases | detekt release list | read 2026-11-27 | Newest tag evidence (primary) |
| https://github.com/detekt/detekt/releases/tag/v2.0.0-alpha.6 | alpha.6 notes | 2026-08-04 | Kotlin/Gradle/JVM 17 claims (primary) |
| https://github.com/detekt/detekt/blob/main/website/src/pages/changelog-2.0.0.mdx | 2.0.0 changelog and migration guide | main 2026-11-26 | Still alpha; UNRELEASED notes (primary) |
| https://github.com/detekt/detekt/blob/v2.0.0-alpha.6/detekt-core/src/main/resources/default-detekt-config.yml | default config at newest tag | 2026-08-04 | 119/227 (primary) |
| https://github.com/detekt/detekt/blob/45672efb8b/detekt-core/src/main/resources/default-detekt-config.yml | baseline config | 2026-09-04 | Reproduces 129/231 (primary) |
| https://github.com/detekt/detekt/blob/main/detekt-core/src/main/resources/default-detekt-config.yml | main config at `72e93bc5967f` | 2026-11-26 | 129/237 (primary) |
| https://github.com/detekt/detekt/blob/main/gradle/libs.versions.toml | version catalogue | 2026-11-26 | Wrapper on ktlint 1.8.0 (primary) |
| https://github.com/detekt/detekt/tree/main/detekt-rules-coroutines | coroutines module | 2026-11-26 | 10 rule classes (primary) |
| https://github.com/detekt/detekt/tree/main/detekt-gradle-plugin | Gradle plugin source | 2026-11-26 | ignoreFailures (primary) |
| https://github.com/ktlint/ktlint/releases | ktlint releases | read 2026-11-27 | 2.0.0-ALPHA-4/5, 1.8.0 (primary) |
| https://github.com/ktlint/ktlint/blob/master/CHANGELOG.md | ktlint changelog | 2026-11-23 | Java 8/11 dropped (primary) |
| https://ktlint.github.io/ktlint/dev-snapshot/api/migrate-to-ktlint-2.x/ | migration guide | snapshot | Coordinates, RuleV2 (primary) |
| https://ktlint.github.io/ktlint/dev-snapshot/rules/code-styles/ | code styles | snapshot | Default `ktlint_official` (primary) |
| https://ktlint.github.io/ktlint/dev-snapshot/rules/standard/ | standard rules page | snapshot | 55 sections, 99 ids (primary) |
| https://ktlint.github.io/ktlint/dev-snapshot/rules/experimental/ | experimental rules page | snapshot | 8 ids (primary) |
| https://github.com/JLLeitschuh/ktlint-gradle/releases | ktlint-gradle releases | 2026-03-12 newest | No release in window (primary) |
| https://github.com/JLLeitschuh/ktlint-gradle/blob/main/plugin/src/main/kotlin/org/jlleitschuh/gradle/ktlint/KtlintExtension.kt | plugin source | 2026-11-23 | ignoreFailures default false (primary) |

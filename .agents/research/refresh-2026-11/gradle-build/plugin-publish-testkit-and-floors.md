---
title: Gradle plugin publishing, Compatibility Plugin and TestKit floors, delta 2026-09-12 to 2026-11-27
pair: gradle-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 14
---

# Delta: plugin publishing, Compatibility Plugin, floors

This is a delta update of the baseline research dated 2026-09-12. Anything not listed as changed stays as it is. Fetches used a summarising page reader, so quotes below are paraphrases of the fetched pages, not verbatim copies.

## Summary

- Current `com.gradle.plugin-publish` is 2.2.1, created 2026-09-10 (a Portal page, so it is dated two days BEFORE the baseline; the baseline measured 2.1.0 and missed 2.2.x).
- 2.2.1 bundles Compatibility Plugin 1.1.0, which adds the `isolatedProjects` feature. Declaring it requires plugin-publish 2.2.1 or later.
- Declarable features are now two: `configurationCache` and `isolatedProjects`, each true or false.
- The Portal has NOT begun rejecting submissions without `compatibility`. The user guide still says rejection is planned for a future version; today it is a deprecation warning.
- New rule on the guide: once a feature is declared, later versions must keep declaring it, or the publish request fails.
- Plugin-publish 2.2.0 renames the artifact and its page says to use 2.2.1 instead. Do not pin 2.2.0.
- The 8.11 / 7.0 / 2.0.0 floors are not contradicted by anything fetched. Gradle 9.9.0 embeds Kotlin 2.4.21; no source says the floor moved.
- No Gradle 10 release or milestone was found. The 9.x upgrade guide lists Gradle 10 removals, including that the configuration cache becomes enabled by default.
- No Kotlin 2.4 page mentions a change to the `-Xjsr305` or `-Xjspecify-annotations` defaults.
- `--validate-only` and the `GRADLE_PUBLISH_KEY` / `GRADLE_PUBLISH_SECRET` names are unchanged.

## Findings and per-claim verdicts

### GRADLE-PLUG-10: changed (version detail only)

Old text: "Since `com.gradle.plugin-publish` 2.1.0 (March 2026) the declaration is a public Portal claim".
New fact: the Compatibility Plugin was declared stable in plugin-publish 2.1.1 (19 March 2026, bundled Compatibility Plugin 0.1.0 to 1.0.0), and 2.2.1 (10 September 2026) adds Isolated Projects. The 2.1.0 statement remains accurate for the deprecation-warning start. Suggest adding that the claim now covers `isolatedProjects` too once declared, and that a declared feature cannot be removed later.
Sources: https://plugins.gradle.org/plugin/com.gradle.plugin-publish/2.1.1 (2026-03-19), https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html (fetched 2026-11-27).

### GRADLE-PLUG-17: changed

Old text: "As of 2026-09-12 `configurationCache` is the only declarable feature."
New fact: `isolatedProjects` is declarable since plugin-publish 2.2.1 / Compatibility Plugin 1.1.0 (2026-09-10; the Compatibility Plugin README names 1.1.0 as the version that added it). The guide notes there is no Isolated Projects badge yet. Rejection of undeclared submissions: not begun; the guide says the Portal "plans to reject undeclared submissions in a future version". The README points to `CompatibleFeatures.java` for the authoritative list, which was not fetched, so "exactly two" rests on the user guide.
Sources: https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html, https://plugins.gradle.org/plugin/com.gradle.plugin-publish/2.2.1 (2026-09-10), https://github.com/gradle/gradle-plugin-compatibility-plugin (README; the Releases tab was empty, so no release date for 1.1.0 other than the bundling date above).

### GRADLE-PLUG-11 and -12 floors (8.11, 7.0, KGP 2.0.0): unchanged, with one gap

Gradle embedded Kotlin per the compatibility page: 8.11 = 2.0.20, 8.12 = 2.0.21, 9.0 = 2.2.0, 9.2 = 2.2.20, 9.3 = 2.2.21, 9.4 = 2.3.0, 9.5 = 2.3.20, 9.6 = 2.3.21, 9.7 = 2.4.0, 9.8 = 2.4.10, 9.9 = 2.4.21; Kotlin language version stays 2.2 across 9.x. Gradle is tested with Kotlin 2.0.0 through 2.5.0-Beta1. The 9.8 and 9.9 upgrade sections say nothing about minimum consumer versions. Gradle 9.8.0 appears in the September 2026 newsletter, 9.8.2 in October; the release-notes page showed 9.9 (9.9.0 dated 2026-11-23, current 9.9.2). The baseline's "current 9.x release" therefore moved from 9.7.1 to 9.9.x. No Gradle 10.0 milestone or release was found. Could not determine: whether a Kotlin-DSL plugin compiled on 9.9 (Kotlin language 2.2) still loads on 8.11 (reads up to Kotlin metadata 2.1); the baseline floor reasoning is not refuted but not re-measured either.
Sources: https://docs.gradle.org/current/userguide/compatibility.html, https://docs.gradle.org/current/userguide/upgrading_version_9.html, https://newsletter.gradle.org (2026-09, 2026-10 issues).

### GRADLE-PLUG-12 matrix, TestKit: unchanged plus one note

The TestKit guide says GradleRunner supports the same range as the Tooling API, older versions "may still work" without guarantees; no new minimum stated. Gradle 9.9.2 carries a TestKit security fix (GHSA-99wf-vhq9-wm2x, predictable directory in the system temp directory, plus a per-user default directory change outside a `Test` task). That touches GRADLE-PLUG-16's reasoning about `org.gradle.testkit.dir`; its pin advice stays valid.
Sources: https://docs.gradle.org/current/userguide/test_kit.html, https://docs.gradle.org/current/release-notes.html.

### GRADLE-DIST-03: could not determine for 2.2.x

The 2.1.0 measurement is not re-run. No release notes beyond the Portal descriptions were reachable (the GitHub release URLs I tried returned 404), and those descriptions mention no shading change. 2.2.0 renames the artifact and is superseded by 2.2.1; mark the measurement as "against 2.1.0" (already so worded) and re-measure on 2.2.1 before changing the claim.
Sources: https://plugins.gradle.org/plugin/com.gradle.plugin-publish/2.2.0 (2026-09-09), .../2.2.1 (2026-09-10).

### GRADLE-PLUG-28: unchanged (not disproven)

Current Kotlin java-interop page: `-Xjsr305` default equals `warn`; `-Xjspecify-annotations` default is `strict`. The Kotlin 2.4.0 what's-new and compatibility guide mention neither flag. The one nullness change found is Jakarta `@Nullable`/`@Nonnull` mismatches turning from warning (2.2.0) to error (2.4.0). The "since Kotlin 1.1.50" and "since Kotlin 2.1" dates were not confirmed from any fetched page.
Sources: https://kotlinlang.org/docs/java-interop.html, https://kotlinlang.org/docs/whatsnew24.html, https://kotlinlang.org/docs/compatibility-guide-24.html.

### GRADLE-PLUG-18 and -19: unchanged

`./gradlew publishPlugins --validate-only` still documented. Credentials: Gradle properties `gradle.publish.key` / `gradle.publish.secret`, env vars `GRADLE_PUBLISH_KEY` / `GRADLE_PUBLISH_SECRET`, or `-P` flags. Id rules: the guide gives no new formatting rules; group and artifact must "reasonably represent the organization, person, and the plugin" (the baseline's lowercase / one dot / controlled namespace wording is not contradicted, not re-sourced).
Source: https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html.

## Normative guidance candidates

1. Pin `com.gradle.plugin-publish` to 2.2.1 or later, never 2.2.0. Rationale: 2.2.0 renames the artifact and its Portal page redirects to 2.2.1. Verify: `grep -rn "com.gradle.plugin-publish" --include=*.kts --include=*.gradle --include=*.toml .` and reject version 2.2.0.
2. A plugin may declare `isolatedProjects` only with plugin-publish 2.2.1 or later, and only once a TestKit leg runs with `-Dorg.gradle.unsafe.isolated-projects=true` green (same logic as GRADLE-PLUG-10). Rationale: it is a public Portal claim. Verify: grep for `isolatedProjects` in `gradlePlugin {}` and a distinct leg in the functional-test source set.
3. Never remove a declared compatibility feature in a later release. Rationale: the Portal fails the publish. Verify: diff `compatibility { features { ... } }` between the released tag and the branch; a deletion is the finding.
4. Treat a missing `compatibility` block as a build-breaking defect now, even though the Portal only warns. Rationale: rejection is announced. Verify: `./gradlew publishPlugins --validate-only` output contains no compatibility deprecation warning.

## AI-agent angle

- Models trained before 2026-09 say `configurationCache` is the only feature: check by grepping for `isolatedProjects` before "correcting" it.
- Models suggest plugin-publish 2.2.0 or copy 2.1.0 pins: the version grep above catches both.
- Models remove a `compatibility` entry to quiet a failing leg; the diff check in candidate 3 catches it.

## Contested / evolving

- Portal rejection of missing `compatibility`: announced, no date (as of 2026-11-27).
- Gradle 10: no release or milestone found; the 9.9 upgrade guide says the configuration cache becomes the default in Gradle 10 and Gradle 9 gets no fixes after 11.0.0. The Gradle 10 upgrade guide URL was not fetched successfully (404); the "Upgrading to Gradle 10" guide may not exist yet.
- Kotlin DSL scripts compile via the Kotlin Build Tools API in 9.9; this may eventually change embedded-Kotlin floors.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://plugins.gradle.org/plugin/com.gradle.plugin-publish | Portal page, version list | fetched 2026-11-27, latest 2.2.1 | current version |
| https://plugins.gradle.org/plugin/com.gradle.plugin-publish/2.2.0 | version page | 2026-09-09 | artifact rename |
| https://plugins.gradle.org/plugin/com.gradle.plugin-publish/2.2.1 | version page | 2026-09-10 | Isolated Projects |
| https://plugins.gradle.org/plugin/com.gradle.plugin-publish/2.1.1 | version page | 2026-03-19 | Compatibility Plugin 1.0.0 |
| https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html | user guide | 2026-11-27 | features, warning, validate-only, credentials |
| https://github.com/gradle/gradle-plugin-compatibility-plugin | README | 2026-11-27 | isolatedProjects since 1.1.0 |
| https://newsletter.gradle.org | newsletter | Sep, Oct 2026 | 9.8.0, 9.8.2; no publishing news; no Nov issue |
| https://docs.gradle.org/current/release-notes.html | release notes | 9.9.x, Nov 2026 | TestKit fix |
| https://docs.gradle.org/current/userguide/compatibility.html | compatibility | 2026-11-27 | embedded Kotlin table |
| https://docs.gradle.org/current/userguide/test_kit.html | TestKit guide | 2026-11-27 | version range |
| https://docs.gradle.org/current/userguide/upgrading_version_9.html | upgrade guide | 2026-11-27 | Gradle 10 notes |
| https://kotlinlang.org/docs/java-interop.html | Kotlin docs | 2026-11-27 | flag defaults |
| https://kotlinlang.org/docs/whatsnew24.html | Kotlin 2.4 | 2026 | no flag change |
| https://kotlinlang.org/docs/compatibility-guide-24.html | Kotlin 2.4 compat | 2026 | Jakarta change only |

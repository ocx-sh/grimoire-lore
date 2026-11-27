---
title: Gradle JVM range, JDK 27 toolchains, foojay resolver and wrapper, delta 2026-09-12 to 2026-11-27
pair: gradle-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 9
---

# Gradle JVM range, JDK 27 toolchains, foojay and wrapper: delta

Scope: a delta against the baseline verified 2026-09-12. Only the claims quoted in the commission are covered. The JAVA-PLAT floor (JDK 25 toolchain, release 17) is not re-decided. The sources fetched were nine pages. Two attempts failed with HTTP 403 (the openjdk.org project page and the announce-list GA thread); the GA date comes from a search result that quotes the project page and was not opened directly, so it is marked below.

## Summary

- Gradle 9.8.0 (released 2026-09-24) added JDK 27 both as a JVM to run Gradle and as a toolchain.
- The running range is now 17 to 27. The compatibility page says "JVM 28 and later versions are not yet supported."
- The current Gradle release is 9.9.2. 9.9.0 was released 2026-11-06. The 9.9.0 notes mention neither JVM support nor toolchains.
- The foojay resolver is still 1.0.0 (2025-05-19). Its changelog has no entry after 1.0.0 and no early-access support.
- The `wrapper` task still has bin and all only, `--network-timeout`, `--validate-url`. 9.9.0 changed it to preserve existing property values.
- jpackage: the per-platform-build sentence is identical in the JDK 25 and JDK 27 man pages. Notarization is still never described as a jpackage feature.

## Findings

### 1. JVM that runs Gradle: changed

Old text: "The current line requires a JVM between 17 and 26, and states that JVM 27 and later are not yet supported."
New fact: the compatibility page now reads "A JVM version between 17 and 27 is required to execute Gradle. JVM 28 and later versions are not yet supported." Java 27 runs Gradle from 9.8.0. Date of the upstream change: 2026-09-24 ([9.8.0 release notes](https://docs.gradle.org/9.8.0/release-notes.html), [compatibility](https://docs.gradle.org/current/userguide/compatibility.html), fetched 2026-11-27).
Also rewrite "Gradle 9.x needs a JVM between 17 and 26 to start" and GRADLE-TOOL-01's "(17 to 26 on the 9.x line)". A precision worth keeping: 27 needs 9.8.0 or later to run, so on 9.0 to 9.7 the upper bound is lower. The compatibility page is the per-version source, so the wording should be "17 up to the newest JVM the wrapper's Gradle lists" with 27 as the current maximum.
New caveat from the compatibility page: "Gradle is not tested on macOS `AMD64` with Java 27 or newer."
Floor of 17 and the 9.0.0 (2025-07-31) origin: unchanged (compatibility page still says 17 as the minimum).

### 2. Toolchain map: changed (27 added)

| JDK | Toolchain support from | Source and date |
|---|---|---|
| 25 | Gradle 9.1.0 | compatibility page, Table 1, fetched 2026-11-27. Unchanged. |
| 26 | Gradle 9.4.0 | same. Unchanged. |
| 27 | Gradle 9.8.0, released 2026-09-24 | same, and the 9.8.0 release notes: "You can now run the Gradle daemon on Java 27, in addition to using Java 27 via toolchains." |

The 9.8.0 notes add: "Some third-party tools (for example, PMD) do not yet support Java 27." The 9.1.0 release date (2025-09-18) in the baseline text was not re-fetched and stays.
GRADLE-TOOL-01 cross-check becomes "25 needs 9.1.0 or later, 26 needs 9.4.0 or later, 27 needs 9.8.0 or later".
JDK 27 GA date: 2026-09-15, per a search result quoting the openjdk.org JDK 27 project page ([project page](https://openjdk.org/projects/jdk/27/), 403 on direct fetch, so unverified at source). Gradle support followed GA by nine days.

### 3. Foojay resolver: unchanged

Latest plugin version is 1.0.0, created 2025-05-19 ([plugin portal](https://plugins.gradle.org/plugin/org.gradle.toolchains.foojay-resolver-convention)). The [CHANGELOG](https://github.com/gradle/foojay-toolchains/blob/main/CHANGELOG.md) lists nothing after 1.0.0 and has an empty Unreleased section; it never mentions early-access builds or Java 27. The "GA releases only, no early-access" claim is not contradicted. It stays, with the caveat that the changelog does not state it either way, so the wording rests on the baseline evidence.
Not a release, but a signal: the repository's main branch had merges on 2026-11-26 and 2026-11-27 (PRs 239 and 240) declaring configuration cache and Isolated Projects support for both resolver plugins, unreleased ([GitHub API, commits](https://api.github.com/repos/gradle/foojay-toolchains/commits), queried 2026-11-27). A 1.0.1 or 1.1.0 may follow; recheck before the next refresh. No GitHub releases page entries exist (the releases page is empty; versions are tags only).

### 4. Wrapper example version: changed (recommend avoiding a pinned number)

9.7.1 is no longer current. The latest is 9.9.2 ([wrapper docs](https://docs.gradle.org/current/userguide/gradle_wrapper.html), which uses 9.9.2 in its own examples). A hard-coded version in a rule goes stale each release. Recommend `--gradle-version "$VERSION"` with the placeholder, or `latest` only for a first-time adoption. The 9.7.1 measurements in other files (Kafka pinning 9.7.1, "no deprecation as of 9.7.1") are history claims and are outside this question.

### 5. Wrapper task behaviour: unchanged apart from one addition

Still true on the current docs page: distribution types "are bin and all" (bin default); `--network-timeout` (default 10000 ms); `--validate-url` writes `validateDistributionUrl=false` when disabled and is on by default; `--gradle-distribution-sha256-sum`; also `--retries` and `--retry-back-off-ms`.
Changed in 9.9.0 (2026-11-06): the wrapper task "now preserves values from an existing `gradle-wrapper.properties` file when you regenerate the wrapper", including the distribution type; `distributionUrl` is regenerated, so a custom host is not preserved ([9.9.0 notes](https://docs.gradle.org/9.9.0/release-notes.html)). Effect on GRADLE-TOOL-03: regenerating with the wrapper task keeps an existing sum unless one is passed, so the "regenerate rather than edit" advice holds, but a stale `distributionSha256Sum` can now survive a version bump if `--gradle-distribution-sha256-sum` is omitted. The sum must be passed on every version change.
The "networkTimeout and validateDistributionUrl are written by the task" claim: unchanged.

### 6. JAVA-PLAT numbers: no change to Gradle support

JDK 25 toolchain (9.1.0) and `options.release = 17` (any Gradle 9) are unaffected by the window. Only addition: JDK 27 is now also a valid toolchain on 9.8.0 or later.

### 7. jpackage man page (distribution.md): unchanged

Both the [JDK 25 page](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jpackage.html) and the [JDK 27 page](https://docs.oracle.com/en/java/javase/27/docs/specs/man/jpackage.html) say "Each format must be built on the platform it runs on, there is no cross-platform support." Neither describes notarization as a jpackage action. The only notarization mention is a macOS warning under `--app-content` that a bad bundle may fail "code signing and/or notarization" (JDK 27 page). One difference: the JDK 25 page lists `--mac-package-signing-prefix` while the JDK 27 page lists `--mac-signing-prefix`, so that option name changed between the two pages. distribution.md does not name the option, so the claim stays. Citation edit: "JDK 25 tool specification" may become "JDK 25 and JDK 27 tool specifications, verified 2026-11-27". Fetches note: the page-comparison tool summarises pages, so the option rename should be spot-checked with `grep` on the raw man pages if the rule ever names it.

## Claim ledger

| Claim | Verdict |
|---|---|
| JVM 17 to 26, 27 unsupported | changed to 17 to 27, 28 unsupported; 9.8.0, 2026-09-24 |
| 9.x needs 17 to 26 to start | changed, same |
| GRADLE-TOOL-01 "(17 to 26 on the 9.x line)" | changed, same |
| JDK 25 in 9.1.0, JDK 26 in 9.4.0 | unchanged |
| JDK 27 toolchain | new: 9.8.0, 2026-09-24 |
| GRADLE-TOOL-01 cross-check 25/26 | extend with 27 needs 9.8.0 |
| foojay 1.0.0, GA only | unchanged (1.0.0, 2025-05-19; unreleased work on main) |
| GRADLE-TOOL-03 example 9.7.1 | changed: use a placeholder, current is 9.9.2 |
| wrapper writes networkTimeout, validateDistributionUrl; bin and all only | unchanged |
| JAVA-PLAT numbers | unchanged by window |
| jpackage per-platform and notarization | unchanged |

## Normative guidance candidates

1. State the Gradle run range as "17 up to the highest JVM the wrapper's Gradle lists on the compatibility page (27 from 9.8.0)". Rationale: the upper bound moves with each release. Verify: read `distributionUrl` in `gradle/wrapper/gradle-wrapper.properties` and compare the JDK on the runner against the compatibility table.
2. Cross-check a toolchain against the wrapper: 25 needs 9.1.0, 26 needs 9.4.0, 27 needs 9.8.0. Rationale: a toolchain newer than the wrapper fails at configuration time. Verify: `./gradlew -q javaToolchains` plus `grep -n distributionUrl gradle/wrapper/gradle-wrapper.properties`.
3. Pass `--gradle-distribution-sha256-sum` on every wrapper version bump, and write the example with a `$VERSION` placeholder. Rationale: from 9.9.0 the task keeps the old sum when none is passed, producing a mismatch or a stale pin. Verify: after the bump, `grep -n 'distributionSha256Sum\|distributionUrl' gradle/wrapper/gradle-wrapper.properties` shows a sum matching the published `.sha256` of the new distribution.

## AI-agent angle

- An agent trained before September 2026 will say Gradle cannot run on JDK 27 or that 26 is the maximum. Check: read the compatibility page for the wrapper's version.
- An agent may add JDK 27 toolchains on a 9.4 to 9.7 wrapper. Check: guidance 2.
- An agent may regenerate the wrapper on 9.9 and assume the checksum was refreshed. Check: guidance 3.

## Contested / evolving

- foojay 1.x may gain configuration cache and Isolated Projects declarations soon (unreleased merges 2026-11-26 and 2026-11-27). Trend: a minor release likely. Could not determine the date.
- JDK 28 is the next Gradle JVM bump; the page says unsupported as of 2026-11-27.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://docs.gradle.org/current/userguide/compatibility.html | compatibility matrix | current 9.9.2, fetched 2026-11-27 | primary for ranges and toolchain map |
| https://docs.gradle.org/9.8.0/release-notes.html | 9.8.0 notes | 2026-09-24 | JDK 27 support announcement |
| https://docs.gradle.org/9.9.0/release-notes.html | 9.9.0 notes | 2026-11-06 | wrapper preservation, no JVM change |
| https://docs.gradle.org/current/release-notes.html | 9.9.2 notes | 2026-11-27 fetch | current version |
| https://docs.gradle.org/current/userguide/gradle_wrapper.html | wrapper docs | fetched 2026-11-27 | options and types |
| https://github.com/gradle/foojay-toolchains/blob/main/CHANGELOG.md | foojay changelog | 1.0.0 on 2025-05-19 | no later entries |
| https://plugins.gradle.org/plugin/org.gradle.toolchains.foojay-resolver-convention | plugin portal | fetched 2026-11-27 | latest version |
| https://docs.oracle.com/en/java/javase/27/docs/specs/man/jpackage.html | JDK 27 jpackage | 2026 | per-platform and notarization |
| https://docs.oracle.com/en/java/javase/25/docs/specs/man/jpackage.html | JDK 25 jpackage | fetched 2026-11-27 | baseline comparison |
| https://openjdk.org/projects/jdk/27/ | JDK 27 page | GA 2026-09-15 via search result only; 403 on fetch | GA date, unverified at source |

---
title: Dependency-analysis plugin, Gradle locking and verification, and supply-chain evidence, delta 2026-09-12 to 2026-11-27
pair: gradle-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 14
---

# Dependency-analysis plugin, locking, verification and supply-chain evidence: delta

Scope: a delta against the baseline verified 2026-09-12. Only the claims quoted in the commission are covered. Anything not listed as changed stays exactly as written. Two things could not be fully confirmed: Central's own policy pages were not fetched (only a secondary article and search results), and the Gradle 9.9.2 security advisory text was not opened (only its title and severity on the release notes).

## Table of contents

- Summary
- Findings
- Normative guidance candidates
- AI-agent angle
- Contested / evolving
- Sources

## Summary

- The DAGP major version is still 3. The latest release is 3.20.4, published 2026-11-16. No 4.x exists. No task, DSL option or default named in the claims was renamed or changed.
- Gradle still ships no dynamic-version ban. Gradle 9.8.0 (2026-09-24), 9.9.0 (2026-11-06) and 9.9.2 (2026-11-19) notes and the current locking page contain no `banDynamicVersions` equivalent or fail-on-dynamic option.
- The dependency locking page text quoted by GRADLE-DEP-12 to -16 is unchanged, with one wording nuance on `strictly()` below.
- The verification text is unchanged, but the page moved. `dependency_verification.html` is now a meta-refresh redirect to `securing_dependencies.html#verifying-dependencies`. Citations to the old URL still resolve through the redirect, yet the canonical home changed.
- Gradle 9.9.2 fixes a High (8.8) advisory titled "Transitive snapshot dependencies skip dependency verification". This is new evidence relevant to the verification rows.
- Sonatype: the quoted rates do not match the page as it reads today. The page says the best ungrounded models fabricate "about 6%" and earlier models about "one in four". No retraction and no newer headline figure on that page.
- Central: no change to namespace verification found after the Jackson lookalike incident. Evidence is thin (see item 7).

## Findings

### 1. DAGP version, tasks, DSL, defaults: unchanged

Claim: "`com.autonomousapps.dependency-analysis` plugin (DAGP 3.x, verified 2026-09-12)", alias `com.autonomousapps.build-health`, tasks `buildHealth` and `projectHealth`, DSL `severity("fail")`, default `warn`, `fixDependencies` only with `--upgrade`, advice name `unusedAnnotationProcessors`.

Verdict: unchanged for the version and every named task and DSL. The window holds these releases (dates from the [GitHub releases page](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/releases), read 2026-11-27, where the year is inferred from the page footer):

| Release | Date | Relevant content |
|---|---|---|
| 3.19.2 | 2026-09-14 | Fixes, ASM 9.10.1, duplicate advice removal. No rename. |
| 3.20.0 | 2026-10-28 | Breaking only for KMP: needs Kotlin 2.3.0+ and Gradle 9.4.0+. Lazy configuration only. |
| 3.20.1 | 2026-10-31 | KMP advice fixes. |
| 3.20.2 | 2026-11-08 | Regression fixes. |
| 3.20.3 | 2026-11-14 | Source-set fixes. Build now targets Gradle 9.9.1. |
| 3.20.4 | 2026-11-16 | Shared source dir fix. |

The [CHANGELOG](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/blob/main/CHANGELOG.md) top section is `# Unreleased` (relocating the bundled gradle-script-grammar), then `# Version 3.20.4`. The [Gradle plugin portal](https://plugins.gradle.org/plugin/com.autonomousapps.dependency-analysis) shows 3.20.4 as latest. A grep of the changelog finds `severity(<"fail"|"warn"|"ignore">)` (version 2.7.0), the `--upgrade` flag for `fixDependencies` (older entry, still the documented behavior), and `buildHealth` and `projectHealth` in many entries, with no rename or removal. The only default flip in 3.x is 3.17.0: the binary-compatibility check DSL option "now defaults to 'false'" (before the window, 2026-08-26). It does not touch the severity default.

Could not determine: the default severity `warn` is a claim from the plugin wiki, not from the changelog. The changelog has no entry that changes it, so it is unchanged by absence. The advice name `unusedAnnotationProcessors` does not appear in the changelog at all, so it could not be re-confirmed from this source. It stays as written because nothing indicates a change. One related changelog line is 3.0.0: "annotations always treated as `compileOnly`", before the window.

`rules/gradle-build.md` runs `./gradlew buildHealth` in The Gate. That task still exists. No edit needed.

### 2. GRADLE-DEP-07, no native dynamic-version ban: unchanged

Old text: "Gradle has no built-in `banDynamicVersions` equivalent".
Fact: still true as of Gradle 9.9.2. The release notes for [9.8.0](https://docs.gradle.org/9.8.0/release-notes.html) (2026-09-24) and [9.9.0](https://docs.gradle.org/9.9.0/release-notes.html) (2026-11-06) mention nothing on dynamic versions, locking or verification. The [9.9.2 notes](https://docs.gradle.org/9.9.2/release-notes.html) (2026-11-19) list the verification advisory plus three unrelated fixes. The current [locking page](https://docs.gradle.org/current/userguide/dependency_locking.html) says dynamic versions "can cause builds to break unexpectedly" and "Dependency locking is effective with dynamic versions". The current [securing dependencies page](https://docs.gradle.org/current/userguide/securing_dependencies.html) has no dynamic-version ban either. Release notes were read in full only through the fetch tool's summary for 9.9.2 and 9.9.0, so the negative rests on those summaries plus the page greps.

### 3. GRADLE-DEP-12 to -16, locking text: unchanged (one nuance)

- "won't write the lock state to disk if the build fails": unchanged. Current text, verbatim from the page served 2026-11-27: "Gradle won't write the lock state to disk if the build fails, preventing the persistence of potentially invalid states."
- "locked versions enforced as if `strictly()`": the substance is unchanged and now stated more explicitly. The page says "Gradle adds locked versions as strictly dependency constraints during resolution" and "the strictly constraint overrides it, just as a hand-written strictly declaration would." It also documents a conflict case: a declared `require 1.2.0` against a locked `1.0.0` fails resolution, and the fix is to update the lock state. The page footer version is 9.9.2. Whether that conflict paragraph is new in the window could not be determined, because the baseline text was not diffed. The old wording "as if `strictly()`" is still accurate.

### 4. GRADLE-DEP-12 to -16, verification text: unchanged text, changed location

All four quoted strings are present word for word in [securing_dependencies.md](https://docs.gradle.org/current/userguide/securing_dependencies.md), fetched 2026-11-27:

- "only `SHA-256` and `SHA-512` are considered secure for modern use." (line 406)
- "bootstrapping has a critical security limitation: **it trusts whatever is currently in your repositories**." (line 382)
- "checksum is missing from verification metadata." (lines 662 and 1172)
- `./gradlew --write-verification-metadata sha256,pgp` (line 415). A second form `pgp,sha256 --export-keys` also appears (line 1084).

Changed: the old URL `https://docs.gradle.org/current/userguide/dependency_verification.html` now serves an HTML page whose meta tag is `http-equiv="refresh" content="0;URL=securing_dependencies.html#verifying-dependencies"`. The 9.9.0 notes mention a new "Securing Gradle Builds" chapter as documentation work. The date the move happened is not stated on any page read. The same 9.7.1 URL fetch showed the same quoted strings, so the text itself did not change. The prior docs fetch via a summarising tool found none of the strings on the old URL, which is explained by the redirect stub.

New evidence: Gradle 9.9.2 (2026-11-19) fixes "Transitive snapshot dependencies skip dependency verification" (GHSA-7f7r-77ff-fr6f, High 8.8), per the [9.9.2 release notes](https://docs.gradle.org/9.9.2/release-notes.html). Its text was not opened, so the affected version range is not known. The securing dependencies page line 215 says "Gradle also verifies changing dependencies, such as `SNAPSHOT` versions."

### 5. Version catalogs page: unchanged for these claims

[version_catalogs.md](https://docs.gradle.org/current/userguide/version_catalogs.md) has no mention of banning dynamic versions or of locking. Nothing quoted from it is at risk beyond what the commission lists.

### 6. GRADLE-DEP-18, Sonatype figure: mismatch with the page as it reads now

Old text: "from about 7 percent for 2026 frontier models to over 25 percent for older ones", citing [making-ai-work-safely](https://www.sonatype.com/resources/research/making-ai-work-safely).
Fact: the page, read 2026-11-27, says "The best ungrounded models still fabricate about 6% of dependency recommendations" (executive summary) and "roughly 1 in 16" (data section). For older models it says "around one in four recommendations for models like Claude Sonnet 3.7, Gemini 2.5 Pro, and GPT-5". The only nearby "7%" figure is "GPT-5 Nano + Guide achieves a 6.8% hallucination rate", which is a grounded small model on an adversarial subsample, not a 2026 frontier model. "37,000 unique (package, version) pairs" matches. The page carries no publication date. Data windows are scans June to August 2025, models released February 2025 to February 2026, and a February 2026 pipeline refresh. No retraction notice was found. A Sonatype blog item from October 2026 is reported by search results as saying live-checked recommendations produced zero hallucinated versions, and an earlier Sonatype study reports about 27.76% for GPT-5 on 36,870 recommendations. The search results were not opened as primary pages, so treat those two as unverified.
Verdict: changed or never exact. The rule body quotes no rate, so only the table cell in this row is affected. Suggested wording: "about 6 percent for the best ungrounded models to roughly one in four for earlier ones". The rule's check does not depend on the rate.

### 7. GRADLE-DEP-11 and agent item 10, Jackson lookalike and Central: could not determine a change

The incident: `org.fasterxml.jackson.core` next to the legitimate `com.fasterxml.jackson.core`, lookalike domain `fasterxml.org` registered 2025-12-17, spotted by Aikido Security 2025-12-25, removed from Central about ninety minutes after report, per a [TuxCare article published 2026-08-28](https://tuxcare.com/blog/maven-central-jackson-lookalike/). That article does not say Central changed namespace verification in response. It says Central verifies control of a domain or account, not the relation to the project the name resembles, and it points to Sonatype's paid Repository Firewall as the protection. A search found one unrelated Central change reported as of 2026-10-01: monthly per-organization publishing limits. That claim came from a search summary and was not opened. No official Sonatype or Central policy page on lookalike namespaces was found. Verdict: could not determine. The existing wording stays.

## Normative guidance candidates

1. Rule: GRADLE-DEP-12 to -16 and any cited source URL should link `https://docs.gradle.org/current/userguide/securing_dependencies.html#verifying-dependencies` rather than `dependency_verification.html`. Rationale: the old URL is now a client-side redirect stub that text-only fetchers read as empty. Verification: `grep -rn "dependency_verification.html" skills/gradle-build-reference rules` returns no hits.
2. Rule: the GRADLE-DEP-18 rationale cell should replace "about 7 percent for 2026 frontier models to over 25 percent for older ones" with "about 6 percent for the best ungrounded models to roughly one in four for earlier ones". Rationale: matches the page text read 2026-11-27. Verification: `grep -n "7 percent" skills/gradle-build-reference/dependencies.md` returns no hit.
3. Rule: update the baseline stamp "DAGP 3.x, verified 2026-09-12" to "verified 2026-11-27, latest 3.20.4". Rationale: records the re-check. Verification: grep `verified 2026-11-27` in dependencies.md.
4. Rule (optional, SHOULD): note in GRADLE-DEP-13 to -16 that Gradle 9.9.2 is the first release after the transitive-snapshot verification advisory, and require 9.9.2 or later where verification metadata is relied on. Rationale: a High advisory on a gate the rows depend on. Verification: read `gradle/wrapper/gradle-wrapper.properties`; `distributionUrl` must name 9.9.2 or later. The affected range must be confirmed from the advisory before the rule is written.

## AI-agent angle

- Agents still invent a `banDynamicVersions` or `failOnDynamicVersions` Gradle option, because Maven Enforcer has `banDynamicVersions`. Check: grep the build for `banDynamicVersions` and `failOnDynamic`; no hit is the pass.
- Agents cite `dependency_verification.html` and, on a text-only fetch, conclude the page is empty. Check: use the securing dependencies URL.
- Agents state the Sonatype rate from memory. Check: quote only what the page says, with its data window.

## Contested / evolving

- Sonatype's grounding result (zero hallucinated versions when checked against live repositories, October 2026 blog, unopened) supports the existing resolve-first rule. The trend is toward lower ungrounded rates, yet the check stays mandatory.
- Central namespace verification remains control-of-domain only. The trend, as of 2026-11-27, is vendor products rather than a Central policy change. Revisit when Central publishes a policy.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/autonomousapps/dependency-analysis-gradle-plugin/blob/main/CHANGELOG.md | DAGP changelog | read 2026-11-27, top 3.20.4 | tasks, DSL, defaults |
| https://github.com/autonomousapps/dependency-analysis-gradle-plugin/releases | DAGP releases | 3.19.2 to 3.20.4, 2026-09-14 to 2026-11-16 | release dates |
| https://plugins.gradle.org/plugin/com.autonomousapps.dependency-analysis | plugin portal | latest 3.20.4 | confirms no 4.x |
| https://docs.gradle.org/9.8.0/release-notes.html | Gradle 9.8.0 notes | 2026-09-24 | no locking or verification change |
| https://docs.gradle.org/9.9.0/release-notes.html | Gradle 9.9.0 notes | 2026-11-06 | new Securing Gradle Builds chapter |
| https://docs.gradle.org/9.9.2/release-notes.html | Gradle 9.9.2 notes | 2026-11-19 | verification advisory GHSA-7f7r-77ff-fr6f |
| https://docs.gradle.org/current/userguide/dependency_locking.html | locking page | 9.9.2 | quoted sentences |
| https://docs.gradle.org/current/userguide/dependency_verification.html | redirect stub | read 2026-11-27 | shows the move |
| https://docs.gradle.org/current/userguide/securing_dependencies.md | verification text | 9.9.2 | quoted strings |
| https://docs.gradle.org/current/userguide/version_catalogs.md | catalogs page | 9.9.2 | no dynamic ban |
| https://docs.gradle.org/llms.txt | docs index | 2026-11-27 | page inventory |
| https://www.sonatype.com/resources/research/making-ai-work-safely | Sonatype research | data 2025 to Feb 2026, undated | rates |
| https://tuxcare.com/blog/maven-central-jackson-lookalike/ | secondary incident write-up | 2026-08-28 | incident dates, no Central change |
| Search results only (not opened): Sonatype blog Oct 2026, SD Times 27.76% report, Central publishing limits | unverified | 2026 | leads for a follow-up |

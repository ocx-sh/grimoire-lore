---
title: Central Portal and release plugins delta, 2026-09-12 to 2026-11-27
pair: gradle-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 21
---

# Central Portal and release plugins delta

Scope: delta update only. Baseline is the 2026-09-12 reading in skills/gradle-build-reference/publishing.md. Everything marked "unchanged" was re-read on 2026-11-27 and matched the baseline.

## Summary

- OIDC or trusted publishing: no Sonatype primary source documents it. Item 7 stays. The Portal news archive has no entry after 2026-09-08, the Portal changelog has no entry after 2021-09-30, and the Publisher API, requirements and Gradle pages do not mention OIDC.
- One new Portal-side fact in the window: Maven Central publishing limits and the Publisher Pro tier, with rate limiting starting 2026-10-01. This is not in the pair today and is a candidate addition (see Normative candidates).
- Sigstore, checksum, POM, sources/javadoc, deployment-state and OSSRH claims are unchanged.
- Plugin versions: nmcp latest is v1.6.2 (2026-08-31) and vanniktech latest is 0.37.0 (2026-06-21). Both predate the window, so no release happened in it. Both predate the 2026-09-12 baseline too, so the pair should state these as current versions.
- vanniktech 0.36.0 and 0.37.0 renamed or added options (see claim table); if the pair's text pre-dates them it needs a check.
- rules_jvm_external 7.2 shipped 2026-10-12; its notes mention no Central Portal work, so the java_export question stays unresolved.

## Findings per claim at risk

| Claim | Verdict | Evidence |
|---|---|---|
| Item 7: no OIDC path documented | unchanged | Publisher API page: requests "must be authenticated via a user token header" ([API](https://central.sonatype.org/publish/publish-portal-api/), read 2026-11-27). Requirements and Gradle pages: no OIDC ([requirements](https://central.sonatype.org/publish/requirements/), [gradle](https://central.sonatype.org/publish/publish-portal-gradle/)). News archive latest entry 2026-09-08 ([archive](https://central.sonatype.org/news/archive/)). Web search found no announcement either; a third-party glossary dated 2026-10 says the same, but it is not a primary source. Caveat: the registration pages were not re-read this run. |
| GRADLE-PUB-17 Sigstore | unchanged | The 2025-01-28 post still says "Sigstore signature files are not required to publish at this time" and "We have no intention of replacing PGP signatures with Sigstore signatures", adding that Central "may eventually make both Sigstore and PGP signatures required" ([post](https://central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/)). The baseline wording "sets no date for replacing PGP" still holds. Optional sharpening: the post also says both could become required, which the pair does not mention. |
| GRADLE-PUB-06 checksums | unchanged | Requirements page: ".md5 and .sha1 are required", ".sha256 and .sha512 are supported but not mandatory", all files need a matching `.asc` ([requirements](https://central.sonatype.org/publish/requirements/)). |
| GRADLE-PUB-04 POM | unchanged | Coordinates, `name`, `description`, `url`, license, developer, SCM on the same page. The page lists coordinates too, which Gradle always supplies. |
| GRADLE-PUB-05 sources/javadoc | unchanged | Same page: sources and javadoc jar per main jar, placeholder jars allowed. |
| GRADLE-PUB-14 states | unchanged | `PENDING, VALIDATING, VALIDATED, PUBLISHING, PUBLISHED, FAILED` ([API](https://central.sonatype.org/publish/publish-portal-api/)). The API page also says "future versions of the API may drop support for `UserToken`" and recommends the `Bearer` header; the pair should prefer Bearer wording if it names the header. |
| GRADLE-PUB-14 spellings | unchanged for the spellings, extended for vanniktech | `publishToMavenCentral(automaticRelease = true)` and the property `mavenCentralAutomaticPublishing=true` still stand (vanniktech [CHANGELOG](https://raw.githubusercontent.com/vanniktech/gradle-maven-publish-plugin/main/CHANGELOG.md), read 2026-11-27). nmcp `publishingType = "AUTOMATIC"` was not re-verified in the README this run (the README fetch only confirmed the compatibility lines). |
| nmcp configuration cache and Isolated Projects | unchanged | README lines: "Compatible with Configuration Cache" and "Compatible with Isolated projects" ([README](https://github.com/GradleUp/nmcp/blob/main/README.md), via GitHub API 2026-11-27). v1.6.2 (2026-08-31) adds Gradle 9.8 milestone compatibility and Gradle 10 warning fixes ([release](https://github.com/GradleUp/nmcp/releases/tag/v1.6.2)). |
| List of dead plugins | could not determine | The Portal Gradle page names no dead plugins and still states "there is no official Gradle plugin" and lists nmcp and vanniktech among unsupported third-party options ([gradle](https://central.sonatype.org/publish/publish-portal-gradle/)). Per-plugin liveness was not checked this run. |
| GRADLE-PUB-16 OSSRH | unchanged | "As of June 30, 2025 OSSRH has reached end of life" ([EOL](https://central.sonatype.org/pages/ossrh-eol/)). No end date for the Staging API on that page or on the Staging API page, which says only "We hope that over time plugins will adopt the Portal API" ([staging](https://central.sonatype.org/publish/publish-portal-ossrh-staging-api/)). Answer to the question: no end date announced. |
| GRADLE-PUB-18 attestation | changed (wording only, upstream change predates window) | `actions/attest-build-provenance` v4 and later is "simply a wrapper on top of `actions/attest`"; "new implementations should use `actions/attest` instead", existing users may continue ([repo](https://github.com/actions/attest-build-provenance)). Latest release v4.2.2, 2026-08-06 ([releases](https://github.com/actions/attest-build-provenance/releases)). The pair should name `actions/attest` as the preferred action and keep the old name as accepted. The page states no SLSA level; the L2 claim comes from GitHub docs the pair already cites, not re-read. SLSA spec is now v1.2, Approved ([slsa.dev](https://slsa.dev/spec/)); the pair says v1.1 Build L2. Whether v1.2 changes Build L2 text was not checked, so treat the v1.1 wording as stale-risk. "Nothing Portal-side consumes the attestation": no Portal source mentions attestations, so unchanged. |
| Siblings: java_export | unchanged, still unresolved | rules_jvm_external 7.2 (2026-10-12) notes list "perf: speed up java export exclusions" and an example update, nothing on Portal bundles ([7.2](https://github.com/bazel-contrib/rules_jvm_external/releases/tag/7.2)). Issue [#1186](https://github.com/bazel-contrib/rules_jvm_external/issues/1186) "Support token-based auth in maven_export/MavenPublisher" (opened 2024-06-28) appeared in a search; its state and last update were not shown. Date of last check: 2026-11-27. |

## Findings: new facts in the window

1. Maven Central publishing limits and Publisher Pro. On 2026-09-08 Sonatype published a clarification: the soft-limit phase is informational, "Rate limiting begins on October 1, 2026", and commercial-nature artifacts "require Maven Central Publisher Pro from October 1, 2026, regardless of publishing volume" ([news](https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/), [limits](https://central.sonatype.org/publish/maven-central-publishing-limits/)). Limits are per organisation per calendar month across file count, release size and release count; the 90th-percentile reference row is 1,167 files, 78 MB and 7 releases per month. Exceeding starts a 30-day grace period; afterwards releases that keep the organisation over the limit "are no longer accepted". The pages describe no API error code or CI behaviour. An earlier 2026-07-16 post covers Publisher Pro ([news](https://central.sonatype.org/news/20260716_publisher_pro_update/), not fetched; title only from the archive).
2. vanniktech 0.37.0 (2026-06-21): by default only `md5,sha1` checksums are published; new `mavenCentralChecksums` property and `checksums(...)` DSL; new `mavenCentralExcludeSignatureChecksums` property. This matches GRADLE-PUB-06 (sha256 and sha512 not required). 0.36.0 (2026-01-13): `validateDeployment` became the `DeploymentValidation` enum, default waits for `VALIDATED`, `PUBLISHED` restores the older behaviour, `NONE` disables it; `configure(...)` without an explicit `javadocJar` publishes an empty javadoc jar. This interacts with GRADLE-PUB-14: a release job that needs "live on Central" must set `PUBLISHED`, not rely on the default. Source: [CHANGELOG](https://raw.githubusercontent.com/vanniktech/gradle-maven-publish-plugin/main/CHANGELOG.md).
3. Current versions: nmcp v1.6.2 (2026-08-31); vanniktech 0.37.0 (2026-06-21); attest-build-provenance v4.2.2 (2026-08-06); rules_jvm_external 7.2 (2026-10-12). Sources: GitHub releases API, 2026-11-27.

## Normative guidance candidates

1. Add a row (or a clause in GRADLE-PUB-14) saying a release job targeting "live on Central" sets vanniktech `validateDeployment = DeploymentValidation.PUBLISHED` (or the equivalent), because 0.36.0 made `VALIDATED` the default. Rationale: a green job at `VALIDATED` is not live. Verify: grep the build for `DeploymentValidation` and `mavenCentralAutomaticPublishing`.
2. Add a short row on Central publishing limits: a release job over the monthly limit is rejected after a 30-day grace period, and commercial-nature artifacts need Publisher Pro. Rationale: a new, dated, primary-sourced Portal requirement that can fail a release for non-technical reasons. Verify: reading heuristic, check the Usage Center before a release burst; no lint exists.
3. Reword GRADLE-PUB-18 to prefer `actions/attest` and accept `actions/attest-build-provenance` as a wrapper. Rationale: upstream says new code should use `actions/attest`. Verify: `grep -rn "attest-build-provenance" .github/workflows`.
4. No new OIDC row. Keep item 7. If OIDC appears later, the credential guidance in GRADLE-PUB needs a new row, but nothing is documented now.

## AI-agent angle

- An agent will write a tokenless OIDC release job from PyPI habit. Check: grep workflows for `id-token: write` next to a Central publish step with no `MAVEN_CENTRAL_*` secrets.
- An agent will omit `.asc`-independent Sigstore reasoning or drop PGP for Sigstore. Check: `.asc` present for every deployed file.
- An agent will treat the Staging API as permanent. Check: grep for `ossrh-staging-api`.

## Contested / evolving

- Central may eventually require both Sigstore and PGP (2025-01-28 post); no date.
- Publishing limits thresholds "may change"; the Usage Center is the source of truth, and a third-party search result gave a conflicting earlier enforcement date (2026-08-11) that the primary pages do not support.
- OIDC: unconfirmed absence. Primary sources are silent; silence is not a promise.

## Could not determine

- nmcp `publishingType = "AUTOMATIC"` spelling in the current README.
- Per-plugin liveness for the dead-plugin list.
- Whether SLSA v1.2 changes Build L2 wording, and its release date.
- Last-update date of rules_jvm_external issue 1186; GitHub rate limit blocked a search of issues after 2026-09-12.
- Registration pages not re-read.

## Sources

| URL | What | Date/era |
|---|---|---|
| https://central.sonatype.org/publish/publish-portal-api/ | Publisher API, auth, states | read 2026-11-27 |
| https://central.sonatype.org/publish/requirements/ | Requirements | read 2026-11-27 |
| https://central.sonatype.org/publish/publish-portal-gradle/ | Gradle guidance | read 2026-11-27 |
| https://central.sonatype.org/publish/publish-portal-ossrh-staging-api/ | Staging API | read 2026-11-27 |
| https://central.sonatype.org/pages/ossrh-eol/ | OSSRH EOL | read 2026-11-27 |
| https://central.sonatype.org/news/archive/ | News list, latest 2026-09-08 | read 2026-11-27 |
| https://central.sonatype.org/changelog/ | Changelog, latest 2021-09-30 | read 2026-11-27 |
| https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/ | Tiers and limits | 2026-09-08 |
| https://central.sonatype.org/publish/maven-central-publishing-limits/ | Limits | read 2026-11-27 |
| https://central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/ | Sigstore | 2025-01-28 |
| https://raw.githubusercontent.com/vanniktech/gradle-maven-publish-plugin/main/CHANGELOG.md | vanniktech changelog | 0.37.0, 2026-06-21 |
| https://github.com/GradleUp/nmcp/releases | nmcp releases | v1.6.2, 2026-08-31 |
| https://github.com/GradleUp/nmcp/blob/main/README.md | nmcp README | read 2026-11-27 |
| https://github.com/actions/attest-build-provenance | attest action | v4.2.2, 2026-08-06 |
| https://slsa.dev/spec/ | SLSA spec | v1.2 |
| https://github.com/bazel-contrib/rules_jvm_external/releases/tag/7.2 | rules_jvm_external | 2026-10-12 |
| https://github.com/bazel-contrib/rules_jvm_external/issues?q=central+portal | issues list | read 2026-11-27 |

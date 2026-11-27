---
title: Sonatype Central Portal publishing (delta)
pair: maven-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 10
---

# Central Portal publishing, delta 2026-09-12 to 2026-11-27

This is a delta against the baseline of 2026-09-12 (jvm-publishing.md; MVN-PUB-04 to MVN-PUB-10 were allocated on 2026-09-13 from the same evidence). Only claims made by publishing.md, dependencies.md and rules/maven-build.md are checked. All sources below were fetched on 2026-11-27.

## Verdict

- The plugin moved from the 0.9.x line to 0.12.0 (metadata `lastUpdated` 2026-10-13). The 0.7.0 SNAPSHOT floor still holds. MVN-PUB-01's "Current line 0.9.x" and the `0.9.0` example are stale.
- No trusted publishing, OIDC or Sigstore-required path appeared on any Portal page read. Failure mode 2 is unchanged.
- Required files, POM elements, deployment states and the `autoPublish`/`waitUntil` defaults are unchanged.
- MVN-PUB-04's "exactly two namespace proofs" is wrong as written. The namespace page lists DNS TXT plus a temporary-public-repository proof for GitHub, GitLab, Gitee and Bitbucket. I cannot date when that appeared, so I cannot say it changed inside the window; it is a baseline inaccuracy or an undated change.
- The solrsearch URL is still served (Solr `status":0`, results returned).
- One new fact outside the claims list: publisher tiers and rate limits start 2026-10-01 (see item 11).

## Claim by claim

| # | Claim at risk | Status | Evidence |
|---|---|---|---|
| 1 | rules row 13 and MVN-PUB-01: pin 0.7.0 or later for SNAPSHOT | unchanged | Plugin page: SNAPSHOT support added in 0.7.0 ("Support for -SNAPSHOT publishing."). 0.7.0 is still in the version list. |
| 2 | MVN-PUB-01: "Current line 0.9.x, verified 2026-09-12"; example `<version>0.9.0</version>` | changed | Old: 0.9.x. New: latest and release are 0.12.0, versions 0.10.0, 0.11.0, 0.11.1, 0.12.0 exist after 0.9.0. `lastUpdated` 20261013214743. Source: repo.maven.apache.org metadata. Plugin page examples show 0.12.0. Release date of 0.10.0 to 0.11.1 not determinable from metadata alone. |
| 3 | rules row 13: OSSRH ended 2025-06-30 | unchanged | ossrh-eol page: "As of June 30, 2025 OSSRH has reached end of life and has been shut down." |
| 4 | MVN-PUB-03: OSSRH Staging API is a translation shim | unchanged | ossrh-eol page: "a compatibility service that translates a subset of the Nexus 2 APIs to the Portal API." |
| 5 | MVN-PUB-09: `.asc`, `.md5`, `.sha1` required; `.sha256`, `.sha512` accepted not required | unchanged | Requirements page: md5 and sha1 required, sha256 and sha512 "supported but optional"; every deployed file needs `.asc`. New detail: the plugin option `checksums` defaults to `all` (MD5, SHA1, SHA256, SHA512), `required` (MD5, SHA1) and `none` ("validation might fail"). |
| 6 | MVN-PUB-07: six required POM elements | unchanged | Requirements page: `name`, `description`, `url`, at least one license, at least one developer, scm with `connection`, `developerConnection`, `url`. Also: version cannot end in `-SNAPSHOT` (for release deployments). |
| 7 | MVN-PUB-08: placeholder jars for sources and javadoc | unchanged | Requirements page: non-pom packaging needs `-sources.jar` and `-javadoc.jar`; placeholder JARs pass validation; README.md in the placeholder suggested. |
| 8 | MVN-PUB-10: state machine and defaults | unchanged | Portal API page lists `PENDING`, `VALIDATING`, `VALIDATED`, `PUBLISHING`, `PUBLISHED`, `FAILED`. `VALIDATED` means "waiting on a user to manually publish via the Central Portal UI". Plugin page: `autoPublish` default false; `waitUntil` default `validated`, values `published`, `uploaded`, `validated`; `published` requires `autoPublish`. API `publishingType` default `USER_MANAGED`. |
| 9 | MVN-PUB-04: exactly two proofs, DNS TXT and `io.github.<user>` | changed or wrong at baseline (undated) | Old: "no third path". New: register/namespace page lists (1) DNS TXT with the Verification Key, (2) code-hosting proof for GitHub, GitLab, Gitee and Bitbucket namespaces by creating a temporary public repository named with the Verification Key, (3) users who sign up with GitHub may get `io.github.<username>` verified automatically. Source: https://central.sonatype.org/register/namespace/ . Note the baseline text also says GitHub "ownership" proof; the mechanism is a temp repo. Date of upstream change: could not determine. |
| 10 | Failure mode 2: no OIDC path in the Portal guide | unchanged | Not mentioned on the Maven plugin page, requirements page, Portal API page, central-portal register page, namespace page or the 2026 news posts. Auth is still a user token (`settings.xml`; API `Bearer base64(user:pass)`). The news archive lists only 5 posts (2026-09-08, 2026-07-16, 2025-03-26, 2025-01-28, 2025-01-14). A search found no trusted-publishing announcement. Sigstore validation exists since 2025-01-28 as optional validation, not a requirement; requirements page does not mention it. Verdict: no OIDC found; absence on 2026-11-27 is not proof the feature is not in preview elsewhere. |
| 11 | solrsearch URL (MVN-DEP-11, MVN-PUB-02) | unchanged, still served | `https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json` returned `{"responseHeader":{"status":0,...` with a `docs` array. No redirect. I did not find a deprecation notice; none fetched either. |

## New facts relevant to the pair

1. Publisher tiers and rate limits (news post 2026-09-08, https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/ ; earlier post 2026-07-16 moved the date to 2026-10-01). From 2026-10-01 Maven Central Publisher Pro is required if org volume exceeds free thresholds without an adjustment, or if any published artifact is commercial in nature (service SDKs, generated clients, drivers, agents, integrations, developer tools), regardless of volume. Open-source projects can request higher limits or an exemption (central-support@sonatype.com). The producer-terms page (last updated 2026-03-31) gives no numeric thresholds. The posts mention no change to required files, API, authentication or plugin versions. Effect on the ruleset: none technical; a release job can now fail from a limit, not from validation.
2. Plugin page known issue: "Publishing doesn't work when using Maven 4.x.x". This interacts with MVN-PUB-02 and rules row 11 (Maven 4 is migration readiness only). Worth stating in publishing.md that release jobs stay on Maven 3.
3. Plugin 0.12.0 options: `skipUpload` (builds the bundle but stops before upload, default false; new in 0.12.0), `skipPublishing` corrected in 0.12.0 (per module since 0.9.0), 0.12.0 fixed Central rejections with Maven 3.10.0 caused by leftover metadata files, 0.11.0 added usage limit warnings. Deprecated: `publishCompletionPollInterval` (use `waitPollingInterval`), `waitForPublishCompletion` (use `autoPublish` with `waitUntil`). `waitMaxTime` minimum 1800 seconds, `waitPollingInterval` minimum 5 seconds. `centralSnapshotsUrl` falls back to `<distributionManagement>`.
4. The plugin does not sign: GPG signing stays with `maven-gpg-plugin` (consistent with MVN-PUB-09).

## Normative guidance candidates

1. Change MVN-PUB-01's current-line text to "0.12.x, verified 2026-11-27" and the example to `<version>0.12.0</version>`; keep the 0.7.0 floor. Rationale: stale pin teaches agents an outdated version. Verify: `curl -s https://repo.maven.apache.org/maven2/org/sonatype/central/central-publishing-maven-plugin/maven-metadata.xml | grep -E '<(latest|release)>'` and `grep -n '0\.9' skills/maven-build-reference/publishing.md` returns nothing.
2. Rewrite MVN-PUB-04: DNS TXT works for any reverse-domain namespace; GitHub, GitLab, Gitee and Bitbucket namespaces (such as `io.github.<user>`) are proved by a temporary public repository named with the Verification Key. Drop "no third path" and the exact-two wording. Rationale: the namespace page lists more than two proofs. Verify: reading heuristic, compare publishing.md MVN-PUB-04 against https://central.sonatype.org/register/namespace/.
3. Add to MVN-PUB-10 or a note: the `checksums` option defaults to `all`; set `required` only deliberately, and never `none`. Rationale: plugin page says `none` may fail validation. Verify: `grep -n '<checksums>' pom.xml` shows no `none`.
4. Add a note under MVN-PUB-02 or MVN-PUB-01: release jobs run Maven 3, because the plugin page lists Maven 4.x publishing as a known issue. Verify: CI config pins Maven 3.x for the deploy job (`grep -n 'maven' .github/workflows/*`).
5. Add one line that publishing can be limited from 2026-10-01 under Publisher Pro rules, and that a failed deployment with limit text is not a POM fault. Rationale: avoids misdiagnosing rate-limit rejections as validation bugs. Verify: reading heuristic against the 2026-09-08 news post.
6. Keep failure mode 2 as is but change the sentence to the dated "read on 2026-11-27" evidence; keep "do not write an OIDC path without a primary source".

## AI-agent angle

- Models pin 0.9.0 or older (for example 0.6.0, 0.7.0) copied from training data; mechanical check: compare the pin to the metadata `<release>`.
- Models assert Central offers OIDC trusted publishing like PyPI; check: grep new CI for `id-token: write` combined with a Central deploy step and demand a cited Portal page.
- Models state only DNS or GitHub-OAuth namespace proofs; check against the namespace page.
- Models treat `VALIDATED` as published; check: `waitUntil` is `published` with `autoPublish` true.

## Contested / evolving

- Publisher tiers and the commercial-nature rule (effective 2026-10-01) are the one live policy change; Sonatype said lower-tier Pro pricing was "coming soon" (2026-07-16). Trend: more limit and commercial-use rules, not a change in the technical format.
- Maven 4 publishing through the plugin is a known issue; watch the plugin page.
- Trusted publishing or OIDC: none announced as of 2026-11-27 on the fetched pages.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://repo.maven.apache.org/maven2/org/sonatype/central/central-publishing-maven-plugin/maven-metadata.xml | Plugin metadata | lastUpdated 2026-10-13 | Current version 0.12.0 |
| https://central.sonatype.org/publish/publish-portal-maven/ | Plugin guide | read 2026-11-27 | Options, defaults, SNAPSHOT, known issues |
| https://central.sonatype.org/publish/requirements/ | Requirements | read 2026-11-27 | POM, files, placeholders |
| https://central.sonatype.org/publish/publish-portal-api/ | Portal API | read 2026-11-27 | States, publishingType, auth |
| https://central.sonatype.org/register/central-portal/ | Portal registration | read 2026-11-27 | No namespace methods or OIDC there |
| https://central.sonatype.org/register/namespace/ | Namespace registration | read 2026-11-27 | Verification methods |
| https://central.sonatype.org/pages/ossrh-eol/ | OSSRH EOL | 2025-06-30 | Shutdown, Staging API shim |
| https://central.sonatype.org/news/archive | News archive | read 2026-11-27 | Full post list; nothing on OIDC |
| https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/ | News | 2026-09-08 | Publisher Pro from 2026-10-01 |
| https://central.sonatype.org/news/20260716_publisher_pro_update/ | News | 2026-07-16 | Limits moved to 2026-10-01 |
| https://central.sonatype.org/publish/producer-terms/ | Producer terms | updated 2026-03-31 | Tiers, no numeric thresholds |
| https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json | Solr search | read 2026-11-27 | Still served |

Note: https://central.sonatype.org/news/ returned HTTP 404; the archive page at /news/archive was used instead. WebFetch summaries come from a small model, so quotes are as returned, not byte-verified.

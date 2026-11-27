---
title: Maven build ecosystem, recent shifts (delta)
pair: maven-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 17
---

# Maven build ecosystem, recent shifts, 2026-09-12 to 2026-11-27

This is a delta over the baseline of 2026-09-12 (corpus files jvm-maven-and-ant.md, jvm-dependencies.md, jvm-publishing.md). Core versions, Maven 3.10 and Maven 4 rc-7 are owned by the sibling file maven-core-release-and-maven4-status.md and are not repeated here.

Verdict: no new rule is required. One existing rule (MVN-BUILD-15) gets new context, and two items could not be determined because the primary source was unreachable.

## Sources fetched (2026-11-27)

- https://maven.apache.org/security.html (last published 2026-11-25)
- https://maven.apache.org/index.html (last published 2026-11-25)
- https://maven.apache.org/docs/3.10.0/release-notes.html
- https://maven.apache.org/enforcer/index.html (last published 2026-10-26)
- https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-enforcer-plugin/maven-metadata.xml
- https://github.com/advisories (Maven ecosystem, reviewed list)
- https://github.com/actions/setup-java/releases
- https://github.com/apache/maven-mvnd/releases
- https://github.com/maveniverse/mimir/releases
- https://central.sonatype.org/ and https://central.sonatype.org/news/archive/
- https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/
- https://community.sonatype.com/t/maven-central-publishing-limits-are-now-in-effect/16675
- https://maven.apache.org/mailing-lists.html

Not fetched: the announce@maven archive (lists.apache.org is a JavaScript app and returned no message list; mail-archives redirects to it). Plugin-level GitHub advisories for apache/maven-* repos beyond the Maven ecosystem feed. maven-wrapper metadata (404). Claims depending on these are "could not determine".

## Shifts found

| Date | Shift | Source | Rule or failure mode needed |
|---|---|---|---|
| 2026-09-08 | Sonatype: Publisher Pro required for commercial-nature artifacts regardless of volume; includes "build tooling" and "developer tools distributed as part of a commercial offering". | central.sonatype.org/news/20260908_publisher_tiers_commercial_use | Possible new failure mode in the publishing pair (not maven-build): a publishing workflow can be rejected after a grace period. See candidate 2. |
| 2026-10-01 | Maven Central publishing limits in effect (file count, release size, release count per month). Over a limit starts a 30-day grace; after it, releases that keep the org over the limit are rejected. Downloads and already-published packages are unaffected. Soft notices began 2026-06-16; enforcement moved from 2026-08-11 to 2026-10-01. | community.sonatype.com thread 16675 | Same as above. Download-side (repo1) rate limits: none announced. |
| 2026-09-09 to 2026-11-14 | setup-java v6.0.1 (09 Sep), v6.1.0 (14 Oct), v6.2.0 (04 Nov), v6.3.0 (14 Nov). v6.1.0 adds plugin repositories and server credential origin to the generated settings.xml; v6.2.0 adds Maven mirrors; v6.3.0 makes the Java problem matcher opt-in (`problem-matcher: true` to keep PR annotations). No cache or toolchain change in these releases. | github.com/actions/setup-java/releases | Candidate 3: weak, mostly informational. |
| 2026-10-30 | maven-enforcer-plugin 3.7.0 on Central (3.6.3 before). Release notes not fetched, so new or deprecated rules are unknown. | maven-metadata.xml, lastUpdated 20261030194909 | "could not determine" whether a rule is new or deprecated. |
| 2026-09-27 (3.10.0) | Maven 3.10.0 documents user-wide `~/.m2/extensions.xml` and installation-wide `$MAVEN_HOME/conf/extensions.xml` in addition to `.mvn/extensions.xml`. Also: settings.xml server credentials scoped to repository origin. | docs/3.10.0/release-notes.html | Candidate 1, extends MVN-BUILD-15. |

## Corpus open questions

- Maven-side checksum and verification policy, dependency-update automation (jvm-dependencies.md): not settled by any fetched source. No new Maven checksum or attestation requirement appeared on Sonatype's news list. Status: could not determine beyond that.
- `maven-antrun-plugin` (jvm-maven-and-ant.md): not checked on a primary source in this brief; no change surfaced from the sources above. Status: could not determine.
- Build extensions and MVN-BUILD-15 severity (jvm-maven-and-ant.md line 306): partly informed. Mimir is not mentioned on maven.apache.org or in the 3.10.0 notes; it is not official or default. Mimir releases in window are 0.12.2 (04 Sep), 0.12.3 (04 Sep), 0.12.4 (30 Sep), 0.13.0 (27 Oct); still 0.x, maveniverse project. Maven 3.10.0 does add two more extension locations, which widens the surface MVN-BUILD-15 must cover. No event justifies raising SHOULD to MUST; the severity question stays open but the new locations are a reason to extend the verification grep.

## Claims at risk

| Claim | Status | Detail |
|---|---|---|
| MVN-BUILD-15 "a .mvn/extensions.xml written by a workflow step changes resolution" | changed (scope grew) | Old: project-level file in the tree or CI. New fact: Maven 3.10.0 (2026-09-27) also reads `~/.m2/extensions.xml` and `$MAVEN_HOME/conf/extensions.xml` as core extensions. Source: 3.10.0 release notes. Note apache/maven's own CI already used `~/.m2/extensions.xml` for the 4.x leg. |
| Mimir is not official/default | unchanged | No source says otherwise; latest Mimir 0.13.0 (2026-10-27). |
| mvnd status | could not determine | The releases page showed 1.0.6 (2026-05-30) as newest on Maven 3.9.16 and Maven-4 based 2.0.0 only as pre-releases (rc-3 as latest, date year not printed). Nothing in the window. No rule needed. |
| Maven security advisories | unchanged | maven.apache.org/security.html lists no entry after 2021 except unnumbered plugin items; GitHub Maven-ecosystem feed shows no org.apache.maven advisory 2026-09-01 to 2026-11-27. |
| Central download or repo1 rate limits | unchanged (none) | Sonatype states downloads are unaffected. |

## Normative candidates

1. MVN-BUILD-15: extend the check to user-wide and install-wide extension files.
   - Rationale: 3.10 makes three extension locations legitimate; a CI image or setup step can place one outside the tree.
   - Verification: `grep -rn 'extensions\.xml' .github/workflows/ Jenkinsfile .gitlab-ci.yml; ls ~/.m2/extensions.xml "$MAVEN_HOME/conf/extensions.xml" 2>/dev/null` and `git ls-tree -r HEAD | grep extensions.xml`. Severity stays SHOULD.
2. Publishing pair (optional, belongs to maven-publishing, not this pair): a release job must not assume Central accepts the upload; over-limit orgs and commercial-nature artifacts are rejected after a 30-day grace.
   - Verification reading heuristic: before a release PR, check Usage Center on central.sonatype.com; no command available.
3. Setup-java problem matcher is opt-in since v6.3.0 (2026-11-14): CI relying on compiler annotations must set `problem-matcher: true`.
   - Verification: `grep -n 'setup-java' -A8 .github/workflows/*.yml | grep problem-matcher`. Weak, informational; recommend no rule.

## Keep-out list (checked, not rule-worthy)

- Maven core, wrapper, resolver, plugin CVEs: none in window.
- Mimir becoming official or default: no; still 0.x.
- mvnd: no release in window; Maven-4 line is still pre-release.
- setup-java caching or toolchain changes: none in v6.0.1 to v6.3.0. Mirror and plugin-repo settings.xml generation is a convenience, not a failure mode.
- Central SBOM, signature or attestation requirement, repo1 download rate limits: none announced in Sonatype news (items in window: 2026-09-08 only; prior 2026-07-16).
- Enforcer 3.7.0: content unknown; revisit when release notes are read.
- Maven 4 final shape beyond rc-7: owned by the sibling file.

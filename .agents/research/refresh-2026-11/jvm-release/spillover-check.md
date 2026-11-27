---
title: jvm-release spillover check (from gradle-build)
target: jvm-release
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://raw.githubusercontent.com/vanniktech/gradle-maven-publish-plugin/main/CHANGELOG.md
  - https://central.sonatype.org/publish/maven-central-publishing-limits/
  - https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/
---

## Item 1: vanniktech 0.36.0 default stops at VALIDATED

Origin: gradle-build (central-portal-and-release-plugins.md, normative candidate 1).

Verdict: confirmed by primary source.

Source: the vanniktech CHANGELOG, entry dated 2026-01-13 (version 0.36.0): "`validateDeployment` now has the `DeploymentValidation` enum as type instead of being a boolean." The default is now to wait only for `VALIDATED`; `PUBLISHED` restores the previous behaviour; `NONE` disables validation.

Affected text, skills/jvm-release/SKILL.md line 250, in the spelling table:

    | vanniktech | `publishToMavenCentral(automaticRelease = true)` |

and line 362, in the Maven/Gradle comparison table:

    | Exit semantics | `publishingType = "AUTOMATIC"` or `automaticRelease = true` | `<autoPublish>true</autoPublish>` and `<waitUntil>published</waitUntil>` |

The prose above them (lines 240 to 243) says the job must wait for `published` and that "the default stops at `VALIDATED`", so the vanniktech cell contradicts it: with the 0.36.0 default, `automaticRelease = true` alone exits at `VALIDATED`.

Smallest change: line 250 becomes
`| vanniktech | `publishToMavenCentral(automaticRelease = true)` with `validateDeployment = DeploymentValidation.PUBLISHED` |`
and the vanniktech half of line 362 becomes `automaticRelease = true` with `validateDeployment = DeploymentValidation.PUBLISHED`. Note: the 0.36.0 entry does not name the property's exact DSL location; the delta file cites the same spelling, so check it against the plugin docs before shipping.

## Item 2: Central publishing limits and Publisher Pro from 2026-10-01

Origin: gradle-build (central-portal-and-release-plugins.md, normative candidate 2; the decision file declines it for GRADLE-PUB).

Verdict: confirmed by primary source, with one precision correction to the item wording.

Sources (Sonatype, the operator of Central, so primary):
- News post dated 2026-09-08: "Rate limiting begins on October 1, 2026." and "From October 1, 2026, Maven Central Publisher Pro is required if either of the following applies", namely exceeding the free thresholds without an adjusted limit or exemption, or publishing any artifact of a commercial nature.
- Limits page (no stated date of its own; the news slug carries 20260908): "Exceeding a threshold in a given month initiates a 30-day grace period rather than immediate enforcement." and "If a grace period expires while an organization is still over a threshold, new releases that would keep the organization over that metric's limit are no longer accepted." The page states 2026-10-01 only for commercial-nature artifacts ("regardless of publishing volume"), and says the limits themselves are already in effect, so "took effect 2026-10-01" is exact only for rate limiting (news post) and Publisher Pro. Enforcement is per metric and does not touch already-published artifacts.

Affected text: the target says nothing on the point. A search of every file under skills/jvm-release/ (only SKILL.md exists) finds no "Publisher Pro", "rate limit" or grace-period text.

Smallest change: one runbook sentence in the publishing section near line 240, for example: "From 2026-10-01 Maven Central enforces monthly publishing limits per organisation and requires Publisher Pro for commercial-nature artifacts; a release that keeps the organisation over a limit after the 30-day grace period is rejected, so check the Usage Center before a release burst." This is a candidate only; the gradle-build decision file placed it in the runbook, not in GRADLE-PUB.

---
title: jvm-release refresh decision (spillover round)
target: jvm-release
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/jvm-release/spillover-check.md
---

## Verdict

Both spillover items from gradle-build are confirmed by primary sources and both change the target. The skill has a single file, skills/jvm-release/SKILL.md, and the first round of this refresh left it unchanged, so there is no earlier edit to build on or contradict. The skill is a runbook with numbered steps rather than a rule set with IDs, so no step number changes and no ID is added.

Item 1 is a contradicted statement. Step 6 says the default stops at `VALIDATED` and the job must wait for `PUBLISHED`, yet the vanniktech spelling it gives, `publishToMavenCentral(automaticRelease = true)`, exits at `VALIDATED` from vanniktech 0.36.0 on. The cell changes in place, in step 6 and in the Gradle and Maven comparison table. The plugin documentation confirms the exact DSL spelling, which the spillover check had flagged as unverified. Step 6 gains a check, because the changed statement needs a verification.

Item 2 is a new fact the skill does not mention: Central's monthly publishing limits, the 30-day grace period, and the Publisher Pro requirement for commercial-nature artifacts from 2026-10-01. A model trained before that date does not know it, and it decides whether a release is accepted, so it earns two sentences and a check in step 8.

## Changed statements

- Step 6, spelling table, vanniktech row. Old: `publishToMavenCentral(automaticRelease = true)`. New: `publishToMavenCentral(automaticRelease = true, validateDeployment = DeploymentValidation.PUBLISHED)`, or `mavenCentralDeploymentValidation=PUBLISHED` in `gradle.properties`, required from 0.36.0 on, where the default wait stops at `VALIDATED`. Source: the vanniktech CHANGELOG 0.36.0 entry (2026-01-13) and the plugin's Central documentation, which gives the Kotlin DSL spelling and the Gradle property verbatim.
- Gradle and Maven side-by-side table, Exit semantics row, Gradle cell. Old: `publishingType = "AUTOMATIC"` or `automaticRelease = true`. New: `publishingType = "AUTOMATIC"`, or `automaticRelease = true` with `validateDeployment = DeploymentValidation.PUBLISHED`. Same sources.
- Step 6 gains a check: a grep over Gradle build files and `gradle.properties` for `automaticRelease`, `DeploymentValidation` and `mavenCentralDeploymentValidation`. A vanniktech build on 0.36.0 or later that sets automatic release without `PUBLISHED` validation is the finding. This mirrors the GRADLE-PUB-14 gate grep the gradle-build round shipped, extended to the Gradle property form.

## New rules

No rule IDs exist in this skill. One new runbook paragraph with its check goes into step 8, "Upload, read the terminal state, and stop":

- Central enforces monthly publishing limits per organisation. Sonatype began rate limiting on 2026-10-01. Exceeding a limit opens a 30-day grace period, after which a new release that would keep the organisation over that limit is no longer accepted. From the same date a commercial-nature artifact needs Maven Central Publisher Pro whatever the volume. Already-published artifacts are not touched.
- Check: before a release, or a burst of releases, open Publishing, then Usage Center, in the Portal. A metric over its limit with the grace period running is the finding. So is a commercial-nature artifact published without Publisher Pro.

The numeric thresholds are left out on purpose. The limits page says they may change and names the Usage Center as the source of truth for current limits.

## Declined

- The exact form of a rejection when a limit is enforced (error text, status code, or deployment state) is not written. The limits page does not describe it, so there is no primary source for it.
- The numeric thresholds from the limits page (the 90th-percentile row: 1,167 files per month, 78 MB release size, 7 releases per month) are not written. The page calls them changeable and points to the Usage Center instead.

## Sources

- https://raw.githubusercontent.com/vanniktech/gradle-maven-publish-plugin/main/CHANGELOG.md, entry 0.36.0 (2026-01-13): `validateDeployment` became the `DeploymentValidation` enum; the default waits only for `VALIDATED`; `PUBLISHED` restores the earlier behaviour; `NONE` disables validation. Primary.
- https://raw.githubusercontent.com/vanniktech/gradle-maven-publish-plugin/main/docs/central.md, fetched 2026-11-27: the Kotlin DSL spelling `publishToMavenCentral(automaticRelease = true, validateDeployment = DeploymentValidation.PUBLISHED)`, the Groovy spelling `publishToMavenCentral(true, DeploymentValidation.PUBLISHED)`, and the Gradle property `mavenCentralDeploymentValidation=PUBLISHED`. Primary.
- https://central.sonatype.org/news/20260908_publisher_tiers_commercial_use/ (2026-09-08): rate limiting begins 2026-10-01, and Publisher Pro is required from that date for publishers over the free thresholds without an adjusted limit or exemption, or for any commercial-nature artifact. Primary.
- https://central.sonatype.org/publish/maven-central-publishing-limits/, fetched 2026-11-27: the 30-day grace period, rejection of new releases that would keep the organisation over a metric's limit once the grace period expires, enforcement per metric rather than a blanket suspension, already-published artifacts unaffected, the Usage Center under Publishing as the source of truth, and Publisher Pro for commercial-nature artifacts from 2026-10-01 regardless of volume. Primary.

## Revision log

- 2026-11-27, spillover round (opus): fixed the vanniktech exit spelling in step 6 and the side-by-side table, added a step 6 check, and added the Central publishing-limits paragraph with its check to step 8. No step renumbered, no ID touched. SKILL.md grows from 423 lines to about 436, under the 500-line body budget, and the existing table of contents still covers every section.

### Edit list (spillover round)

1. File: skills/jvm-release/SKILL.md
   Find:

       | vanniktech | `publishToMavenCentral(automaticRelease = true)` |

   Replace with:

       | vanniktech | `publishToMavenCentral(automaticRelease = true, validateDeployment = DeploymentValidation.PUBLISHED)`, or `mavenCentralDeploymentValidation=PUBLISHED` in `gradle.properties`. Required from 0.36.0 on, where the default wait stops at `VALIDATED` |

2. File: skills/jvm-release/SKILL.md
   Anchor (insert after):

       summary says "validated, not published" in those words. Silence is the defect,
       not the choice.

   Insert:

       
       **Check:** `git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.gradle.kts' ':(glob)**/*.gradle' ':(glob)**/gradle.properties' | xargs -0 -r grep -H -n -e 'automaticRelease' -e 'mavenCentralAutomaticPublishing' -e 'DeploymentValidation' -e 'mavenCentralDeploymentValidation' --`
       A vanniktech build on 0.36.0 or later that turns on automatic release with no
       `PUBLISHED` deployment validation exits at `VALIDATED`, which is the finding
       unless its summary says "validated, not published".

3. File: skills/jvm-release/SKILL.md
   Anchor (insert after):

       reports `FAILED`. Nothing else is a terminal state.

   Insert:

       
       Central also enforces monthly publishing limits per organisation, and Sonatype
       began rate limiting on 2026-10-01. Exceeding a limit opens a 30-day grace
       period, after which a new release that would keep the organisation over that
       limit is no longer accepted. From the same date a commercial-nature artifact
       needs Maven Central Publisher Pro, whatever the volume. Neither affects
       artifacts already published.

       **Check:** before a release, or a burst of releases, open Publishing, then
       Usage Center, in the Portal. A metric over its limit with the grace period
       running is the finding, and so is a commercial-nature artifact without
       Publisher Pro.

4. File: skills/jvm-release/SKILL.md
   Find:

       | Exit semantics | `publishingType = "AUTOMATIC"` or `automaticRelease = true` | `<autoPublish>true</autoPublish>` and `<waitUntil>published</waitUntil>` |

   Replace with:

       | Exit semantics | `publishingType = "AUTOMATIC"`, or `automaticRelease = true` with `validateDeployment = DeploymentValidation.PUBLISHED` | `<autoPublish>true</autoPublish>` and `<waitUntil>published</waitUntil>` |

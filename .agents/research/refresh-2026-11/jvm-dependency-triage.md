---
title: Refresh 2026-11 decision for jvm-dependency-triage (spillover round)
target: jvm-dependency-triage
date: 2026-11-27
model: opus
consolidates:
  - /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/jvm-dependency-triage/spillover-check.md
---

# jvm-dependency-triage: spillover round decision

## Verdict

One edit. The spillover check carried one item from the gradle-build refresh, and it is confirmed by a primary source: the Gradle project's own advisory GHSA-7f7r-77ff-fr6f, re-fetched for this decision on 2026-11-27. The skill's existing text is correct but incomplete. Section 3.2 names only the `checksum is missing from verification metadata` failure, and from Gradle 9.9.2 and 8.14.8 a build that resolves a snapshot or other changing module fails with `Dependency verification failed` until that module is covered. The edit adds one paragraph to section 3.2 that routes that failure to the same bootstrap re-run and diff review. The skill has no first-round changes in this refresh, so nothing earlier is contradicted.

The spillover check proposed "On Gradle 9.9.2 and later". The advisory also patches the 8.x line at 8.14.8, so the inserted text names both releases. The check also proposed listing the exemption under `<trusted-artifacts>` as the triage's own fix. That would conflict with the skill's stop condition, which keeps hand-editing `gradle/verification-metadata.xml` out of scope for a triage. The inserted text therefore names a `<trusted-artifacts>` entry as a reviewed change for the owner, not as a triage fix.

## Changed statements

None. No existing statement in the skill is contradicted. The prohibition on disabling verification and on hand-editing the XML stays exactly as written.

## New rules

No new rule IDs. The addition is procedure text in section 3.2 of `skills/jvm-dependency-triage/SKILL.md`, not a rule row. The underlying standards are already carried by GRADLE-DEP-15 (a regenerated `verification-metadata.xml` that no human reviewed as a diff) and GRADLE-DEP-16 (verification disabled or hand-edited), both already listed in the skill's MUST table as rows 13 and 14.

Verification of the added guidance: after the bootstrap re-run, `git diff -- gradle/verification-metadata.xml` shows entries for the snapshot coordinates that failed, the build passes with verification still enabled, and `gradle/verification-metadata.xml` still has `<verify-metadata>true</verify-metadata>` and no new `<trusted-artifacts>` entry that the triage added itself.

## Declined

None. The check reported 1 confirmed, 0 unconfirmed and 0 already correct, and the one confirmed item is applied.

## Sources

- https://github.com/gradle/gradle/security/advisories/GHSA-7f7r-77ff-fr6f — "Transitive snapshot dependencies skip dependency verification", Gradle project advisory, published 2026-11-19, High, CVSS v4 8.8. Affected `org.gradle:gradle-core` 8.14.7 and earlier and 9.0.0 through 9.9.1; patched in 8.14.8 and 9.9.2. With verification enabled, changing modules are now checked, `--write-verification-metadata` records them, builds that resolve snapshots may fail with "Dependency verification failed" until those modules are covered, and snapshots accepted without verification must be trusted explicitly with a `<trusted-artifacts>` entry. Re-fetched 2026-11-27.

## Revision log

- 2026-11-27, spillover round: added one paragraph to section 3.2 of `SKILL.md` for the GHSA-7f7r-77ff-fr6f snapshot verification failure. No rule IDs added or changed. The SKILL.md body grows from 362 to 369 lines, under the 500-line budget, and its table of contents is unchanged.

### Edit list (spillover round)

1. File: `skills/jvm-dependency-triage/SKILL.md`

   Insertion. Anchor text (verbatim, unique):

   ```
   `checksum is missing from verification metadata` failure (the transitive-dependency trap) by
   re-running the bootstrap, never by hand editing the XML and never by disabling verification.
   ```

   Text to insert after the anchor (a blank line, then the new paragraph):

   ```

   On Gradle 9.9.2 and 8.14.8 and later (GHSA-7f7r-77ff-fr6f, 2026-11-19, verified 2026-11-27), a
   build that resolves a `-SNAPSHOT` or other changing module, direct or transitive, also fails with
   `Dependency verification failed` until that module is in the metadata. Route it the same way:
   re-run the bootstrap and review the diff. A snapshot accepted without verification belongs under
   `<trusted-artifacts>`, which is a reviewed change for the owner rather than a triage fix, and
   verification is never disabled to clear it.
   ```

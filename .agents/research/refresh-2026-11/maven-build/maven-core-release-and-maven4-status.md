---
title: Maven core release and Maven 4 status (delta)
pair: maven-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 8
---

# Maven core release and Maven 4 status, delta 2026-09-12 to 2026-11-27

Sources fetched on 2026-11-27 (all primary):
- https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml (lastUpdated 2026-11-22 11:58:57)
- https://maven.apache.org/docs/history.html
- https://maven.apache.org/whatsnewinmaven4.html
- https://maven.apache.org/guides/mini/guide-migration-to-mvn4.html
- https://maven.apache.org/docs/3.10.0/release-notes.html
- https://maven.apache.org/docs/3.10.1/release-notes.html
- https://maven.apache.org/docs/3.10.2/release-notes.html
- https://maven.apache.org/docs/4.0.0-rc-7/release-notes.html

Not fetched: dev@/announce@ vote threads, MNG JIRA fix-version lists, apache/maven CI workflow files, the GitHub release pages. Claims that depend on them are marked "could not determine".

## Decision 1: current versions (queried 2026-11-27)

Maven Central metadata for maven-core lists 3.9.x ending at 3.9.16, then 3.10.0-rc-1, 3.10.0, 3.10.1, 3.10.2, and the 4.x line ending at 4.0.0-rc-7. The metadata `latest` and `release` fields are both `4.0.0-rc-7`.

| Line | Newest | Release date |
|---|---|---|
| 3.9.x | 3.9.16 (no 3.9.17) | 2026-05-13 |
| 3.10.x (new line, GA, Java 8+) | 3.10.2 | 2026-11-18 |
| 4.0.x | 4.0.0-rc-7 (no plain 4.0.0) | 2026-09-24 |

Key change: the baseline missed a third line. 3.10.0 GA was released 2026-09-27 (3.10.0-rc-1 on 2026-07-09), 3.10.1 on 2026-11-11, 3.10.2 on 2026-11-18. The history page still says Maven 4.0+ is "not yet GA". The 3.10 series is a stable 3.x line, so "3.9.16 GA" is no longer the newest stable. rc-6 was released 2026-08-04, so the baseline (2026-09-12) was correct for rc-6; rc-7 came 12 days later.

## Decision 2: is 4.0.0 GA?

No. The "Maven 4 is release-candidate only" premise holds, with the number moved to `4.0.0-rc-7`. Therefore MVN-BUILD-07, MVN-BUILD-08, MVN-DEP-11 and MVN-PUB-02 do not retire and do not move from migration-only to mechanism. The "(Maven 4)" labelling rule stays valid as a migration label. Trigger to watch: a `4.0.0` row in docs/history.html and a 4.0.0 entry in the Central metadata. None exists.

## Decision 3 and per-claim status

| Claim | Status | Detail |
|---|---|---|
| row 11 "`4.0.0-rc-6` against `3.9.16` GA, 2026-09-12" | changed | New fact: `4.0.0-rc-7` (2026-09-24); stable lines are 3.9.16 and 3.10.2 (2026-11-18). Sources: history.html, maven-metadata.xml. |
| gate line "Maven 3.9.x, verified 2026-09-12" | changed | Maven 3.10.x is a GA line with stricter defaults (see Decision 4). Sources: 3.10.0 to 3.10.2 notes. |
| Measurement table "`3.9.16` GA, `4.0.0-rc-6` latest. No plain 4.0.0" | changed | Add 3.10.2 GA; latest is `4.0.0-rc-7`; still no plain 4.0.0. Date of change: rc-7 2026-09-24, 3.10.2 2026-11-18. |
| MVN-BUILD-08 `latest`/`release` were `4.0.0-rc-6` and `3.9.16` | changed | Both Central metadata fields now read `4.0.0-rc-7`; `release` is an RC, so a wrapper or tool pinned to `release` resolves an RC. Same hazard, new value. Source: maven-metadata.xml, lastUpdated 2026-11-22. |
| MVN-BUILD-07 apache/maven CI uses `-Dmaven=4.0.0-rc-6` | could not determine | CI file not fetched. Likely drifted to rc-7 but unverified. Recommend replacing the literal with "an RC of the 4.0 line". |
| MVN-DEP-11 "Central lists 3.9.16 as newest stable ... 4.0 line tops at rc-6" | changed | Newest stable is 3.10.2; 4.0 line tops at rc-7. |
| MVN-PUB-02 "rc-6 top of 4.0 line as of 2026-09-12" | changed | rc-7, 2026-09-24. |
| MVN-BUILD-06 / -09 (a) duplicate plugin across top-level and profile builds fails in 4 | changed in scope | Migration guide: Maven 4 fails on any duplicate plugin declaration (3.9 only warns). New: Maven 3.10.x also fails on duplicate plugins (and duplicate dependencies), bypass `-Dmaven.resolver.validation=off`. Source: 3.10.0 notes. The top-level versus profile wording could not be confirmed from the guide; it says only "declared only once". |
| (b) Java 17 needed to run Maven 4 | unchanged | Guide and whatsnew confirm Java 17. 3.10.x needs Java 8+. |
| (c) Plexus DI removed | could not determine | Migration guide does not mention it. rc-7 notes list "Add validation for Plexus-based plugin dependency injection" (#12649), so Plexus plugins are still handled with validation; "removed" may be too strong. Check against the MNG fix list. |
| (d) `executionRootDirectory`/`multiModuleProjectDirectory` replaced | unchanged, plus news | Guide: replaced by `${project.rootDirectory}`, `${session.topDirectory}`, `${session.rootDirectory}`. These three properties were also added in 3.10.0. |
| (e) `pre-*`/`post-*` as `before:`/`after:` aliases | unchanged | whatsnew: aliases deprecated; `mvn clean` now runs `post-clean` bindings. |
| MVN-BUILD-10 reproducible default-on from `4.0.0-beta-5` (MNG-8258) | partly could not determine | whatsnew does not mention reproducibility; MNG-8258 not re-fetched. New fact: Maven 3.10.0 also enables reproducible builds by default via a default `project.build.outputTimestamp` in the Super POM (fixed archive timestamp). Date 2026-09-27. |
| MVN-DEP-11 / PUB-02 `maven.consumer.pom.flatten` opt-in | unchanged | whatsnew (rc-7 era): flattening disabled by default; set `maven.consumer.pom.flatten=true`, can live in `.mvn/maven-user.properties`; flattened build POM is also published with classifier `build`. |
| `bom` packaging opt-in | unchanged, extra detail | Needs model version 4.1.0; Maven 4 warns when a BOM comes from the same reactor. |

rc-7 consumer-POM fixes (rc-7 notes): strip `executable()` conditions, BOM consumer POM must not carry inherited dependencyManagement (#12802), packaging profile resolution fix (#12967). No property rename.

## Decision 4: 3.9.x after 3.9.16

No 3.9 release after 3.9.16 (2026-05-13). One line: nothing moved on 3.9. The real change is the 3.10 line, not 3.9.

## Normative candidates

1. Rule: Treat Maven 3.10.x as the current stable 3.x target; its stricter validation (duplicate plugins and dependencies are errors, classpath order level-order, credentials scoped to repository origin) is migration-relevant even before Maven 4.
   - Rationale: 3.10.x GA since 2026-09-27 makes the duplicate-plugin and Super POM changes real on a stable line.
   - Verification: `grep -rn "3.9.16\|3\.9\.x" rules/maven-build.md skills/maven-build-reference/`; `mvn -Dmaven.resolver.validation=default validate` on a sample POM with a duplicate plugin must fail.
2. Rule: Never pin the wrapper or tool to Central `latest`/`release`; both are `4.0.0-rc-7`.
   - Verification: grep `distributionUrl` and `-Dmaven=` for `latest|release`.
3. Rule: Rewrite version literals as "as of <date>" and keep rc number out of normative text where possible.
   - Verification: grep `rc-6` across the pair; expect zero.
4. Rule: Reproducible default holds on 3.10 and 4; builds that read real timestamps must set `project.build.outputTimestamp`.
   - Verification: `mvn -q help:evaluate -Dexpression=project.build.outputTimestamp -DforceStdout`.

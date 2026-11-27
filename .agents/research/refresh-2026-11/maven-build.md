---
title: "maven-build delta refresh, 2026-09-12 to 2026-11-27"
pair: maven-build
date: 2026-11-27
window_start: 2026-09-12
model: opus
consolidates:
  - .agents/research/refresh-2026-11/maven-build/maven-core-release-and-maven4-status.md
  - .agents/research/refresh-2026-11/maven-build/maven-resolver-wrapper-and-mvn-dir.md
  - .agents/research/refresh-2026-11/maven-build/apache-maven-plugins-versions-and-behaviour.md
  - .agents/research/refresh-2026-11/maven-build/central-portal-publishing.md
  - .agents/research/refresh-2026-11/maven-build/ant-and-gradle-bridge-and-jdk-side.md
  - .agents/research/refresh-2026-11/maven-build/maven-recent-shifts.md
revises:
  - .agents/research/jvm-maven-and-ant.md
  - .agents/research/jvm-dependencies.md
  - .agents/research/jvm-publishing.md
  - .agents/research/jvm-frame.md
---

# maven-build delta refresh, 2026-09-12 to 2026-11-27

## Verdict

This is a delta update of the pair as verified on 2026-09-12. Claims whose
upstream did not change stay exactly as written, including their "verified
2026-09-12" stamps. The decisions:

1. Maven 4 is still release-candidate only. The number moves from
   `4.0.0-rc-6` to `4.0.0-rc-7`, and no plain `4.0.0` exists on Central or on
   the history page, so `MVN-BUILD-07`, `MVN-BUILD-08`, `MVN-DEP-11` and
   `MVN-PUB-02` do not retire and stay migration-scoped.
2. The baseline missed a third line: Maven 3.10.0 went GA on 2026-09-27, and
   3.10.2 (2026-11-18) is the newest stable release beside the maintained
   3.9.16. 3.10 bundles resolver 2.x, fails on duplicate plugin and dependency
   declarations, adds the `project.rootDirectory` / `session.*Directory`
   properties, defaults a reproducible `project.build.outputTimestamp`, and
   reads two more extension locations. Those facts change `MVN-BUILD-06`, `-07`,
   `-08`, `-09`, `-10`, `-11` and `-15` in place. `MVN-BUILD-08` and
   Non-Negotiable 11 gain one clause: write "(Maven 3.9)" or "(Maven 3.10)"
   where the two lines differ, because "(Maven 3)" alone is now ambiguous.
3. `MVN-BUILD-11` is corrected, not only restamped. Its 2.x names were wrong
   for every resolver from 2.0.15 (2026-02-12, before the baseline), and its
   "old names are ignored" premise is half wrong: the 2.x upgrade guide still
   reads the two 1.x checksum names as aliases. The silent no-ops are the
   2.0.0-to-2.0.14 spellings and any 1.x key outside the alias table.
   assertj, the rule's own example, uses exactly the two aliased names and is
   no longer a landmine. Severity stays MUST. `MVN-BUILD-13` names the 2.x
   property `includedChecksums`, says the headers carry SHA-1 and MD5, and its
   grep becomes case-insensitive so it matches `includedChecksums`.
4. `MVN-BUILD-04` drops its citation of apache/maven#11605. That PR targeted
   Maven's own test build and was closed unmerged on 2026-01-25, so it was
   never an upstream fix and was not open on 2026-09-12.
5. `MVN-BUILD-05` gets two verification fixes. The Surefire metadata URL in it
   returns 404 (Surefire's groupId is `org.apache.maven.plugins`, checked by
   request on 2026-11-27). And the version to pin is the newest unsuffixed
   entry in the version list, never the `<latest>` or `<release>` element,
   because maven-compiler-plugin's `<release>` reads `4.0.0-beta-5` and
   maven-core's reads `4.0.0-rc-7`.
6. The measurement table moves Surefire to 3.6.1, maven-core to 3.10.2 and
   rc-7, names compiler 3.16.0 as current GA (the 3.13.0 `proc` floor stands),
   and states the resolver each line bundles. The enforcer stops quoting an
   exact rule count ("37" is stale at 3.7.0, and the new count could not be
   reconciled), in the rule index and in the dependencies file.
7. `MVN-BUILD-17` gains one rationale clause: maven-compiler-plugin 3.16.0's own
   `proc` documentation still reads "Starting with JDK 21, this option must be
   set explicitly", which is a second route to the wrong release.
8. Publishing: `MVN-PUB-01` and the plugin example move to 0.12.0 (the 0.7.0
   SNAPSHOT floor stands). `MVN-PUB-04` is corrected: the namespace page lists
   DNS TXT, a temporary public repository for GitHub, GitLab, Gitee and
   Bitbucket namespaces, and automatic `io.github.<user>` verification for
   GitHub sign-ups, so "no third path" goes. `MVN-PUB-09` treats
   `<checksums>none</checksums>` as a finding. `MVN-PUB-02` records the plugin
   page's known issue "Publishing doesn't work when using Maven 4.x.x", so the
   release job runs on Maven 3.
9. One new rule, `MVN-PUB-11`: pin `central-publishing-maven-plugin` at 0.12.0
   or later on Maven 3.10, because 0.12.0 fixed Central rejecting deployments
   built with Maven 3.10.0 over leftover metadata files. It is MUST, like every
   `MVN-PUB` row, and it is added to Non-Negotiable 13.
10. Ant, the Gradle bridge and the JDK-side claims: no change (the artifact for
    them is "no change"). JDK 27 went GA on 2026-09-15, but the pair never said
    otherwise, so nothing moves.
11. Rejected for this window: an `evaluateBeanshell` rule (deprecated in
    enforcer 3.7.0, removal only announced for 4.0.0, and it fails loudly
    then); a Publisher Pro / publishing-limit rule (a policy and account matter
    a competent model does not misdiagnose as a POM fault, with no command to
    check); a setup-java problem-matcher rule (informational, no silent build
    failure); a generic "never pin from `<release>`" rule (folded into
    `MVN-BUILD-05`'s verification, which is where metadata is read).
12. Budgets hold: the rule body stays at 170 lines, lifecycle-and-plugins grows
    from 273 to 275 and publishing from 174 to 175, both keep their tables of
    contents, and SKILL.md is untouched.

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| Rule index, enforcer paragraph and dependencies.md enforcer section | "ships 37 built-in rules"; "3.6.3 (released 2026-05-15, verified 2026-09-12) ships 37 built-in rules" | "ships dozens of built-in rules"; "3.7.0 (on Central 2026-10-30, verified 2026-11-27) ships dozens of built-in rules, 3.7.0 adding `banPropertyPrefix`" | maven-enforcer-plugin metadata (lastUpdated 2026-10-30); apache/maven-enforcer releases 3.7.0 (MENFORCER-433); enforcer rules index |
| Non-Negotiable 11 | "(`4.0.0-rc-6` against `3.9.16` GA, 2026-09-12) ... says "(Maven 3)", "(Maven 4)" or "(both)"" | "(`4.0.0-rc-7` against the `3.9.16` and `3.10.2` GA lines, 2026-11-27) ... narrowed to "(Maven 3.9)" or "(Maven 3.10)" where those lines differ" | maven-core maven-metadata.xml (lastUpdated 2026-11-22); maven.apache.org/docs/history.html |
| Non-Negotiable 13 | "pin 0.7.0 or later before relying on a SNAPSHOT channel" | adds "and 0.12.0 or later on Maven 3.10", cites `MVN-PUB-11` | central.sonatype.org/publish/publish-portal-maven/ (read 2026-11-27) |
| The Gate | "Maven 3.9.x, verified 2026-09-12." | adds "Maven 3.10.x, GA since 2026-09-27, is not re-measured here." | maven.apache.org/docs/3.10.0/release-notes.html |
| Measurement table (lifecycle) | maven-core `3.9.16` GA, `4.0.0-rc-6`; Surefire `3.6.0` GA; resolver "`2.0.x` bundled by Maven 4 ... old ones are ignored without error" | maven-core `3.9.16` and `3.10.2` GA, `4.0.0-rc-7`; Surefire `3.6.1` GA (`lastUpdated 20261026024848`); compiler current GA `3.16.0` with `<release>` reading `4.0.0-beta-5`; resolver 2.0.x bundled by 3.10.x (2.0.26 in 3.10.2) and Maven 4 (2.0.23 in rc-7), two 1.x names aliased | Central metadata for each artifact; maven-3.10.2.pom and maven-4.0.0-rc-7.pom `resolverVersion`; resolver upgrade guide |
| MVN-BUILD-04 | "The upstream fix (apache/maven#11605) is open and unmerged as of 2026-09-12, so the additive form is the fix, not an upgrade." | "The additive form is the fix, not an upgrade." | github.com/apache/maven/pull/11605 (closed unmerged 2026-01-25, scope is Maven's own tests) |
| MVN-BUILD-05 (verification) | `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-plugin/maven-metadata.xml` before writing the version. | the `org/apache/maven/plugins/maven-surefire-plugin` URL, plus "take the newest entry in its version list with no `-M`, `-alpha`, `-beta` or `-rc` suffix, never the `<latest>` or `<release>` element, which can name a milestone (maven-compiler-plugin's read `4.0.0-beta-5` on 2026-11-27)" | Central (old path 404, new path 200, requested 2026-11-27); maven-compiler-plugin metadata |
| MVN-BUILD-06 | "Before any Maven-4 move"; "Maven 3.9 emits a warning and Maven 4 **fails the build**"; "under a `4.0.0-rc-*` toolchain"; "MUST (migration only)" | "Before any move to Maven 3.10 or Maven 4"; "Maven 3.10.x (GA since 2026-09-27, which also fails on a duplicate dependency declaration) and Maven 4 **fail the build**"; "under a 3.10.x wrapper or a `4.0.0-rc-*` toolchain"; "MUST (migration to 3.10 or 4)" | 3.10.0 release notes; migration guide to Maven 4 |
| MVN-BUILD-07 | "on the 3.9.x GA line"; "apache/maven itself does exactly this"; "still naming a 3.9.x distribution" | "on a 3.x GA line"; "did exactly this when observed on 2026-09-12"; "still naming a 3.x GA distribution" | history.html (3.10 is a maintained GA series); apache/maven CI not re-fetched |
| MVN-BUILD-08 | rule text without a 3.9/3.10 split; "which were `4.0.0-rc-6` and `3.9.16` on 2026-09-12" | adds the "(Maven 3.9)" / "(Maven 3.10)" narrowing and a rationale sentence naming three 3.10 differences; "which both read `4.0.0-rc-7` on 2026-11-27, so `release` is not an index of stable versions" | maven-core metadata; 3.10.0 release notes |
| MVN-BUILD-09 (c) | "replaced by `project.rootDirectory`, `session.topDirectory` and `session.rootDirectory`." | adds "(all three also exist from Maven 3.10.0, so the replacement can land before the move)" | migration guide; 3.10.0 release notes |
| MVN-BUILD-10 | "on by default only from `4.0.0-beta-5` (MNG-8258), so on the shipping 3.9.x line" | "on by default from Maven 3.10.0 (a default `project.build.outputTimestamp` in the Super POM) and from `4.0.0-beta-5` (MNG-8258), so on the 3.9.x line ... and an explicit value is what keeps the archive the same whichever line builds it" | 3.10.0 release notes |
| MVN-BUILD-11 | 2.x names `aether.checksums.checksumAlgorithms` / `aether.connector.basic.smartChecksums`; old names ignored; assertj "a landmine on the first Maven-4 bump"; finding "Pre-2.0 names beside an `apache-maven-4.` distribution" | per-line name table (1.x, 2.0.0 to 2.0.14, 2.0.15 and later); the alias table; bundled resolvers for 3.9.16, 3.10.2, rc-7; assertj survives through the alias; finding is the 2.0.0-to-2.0.14 spellings or an unaliased 1.x key beside `apache-maven-3.10.` or `apache-maven-4.` | resolver configuration pages 1.9.27, 2.0.14, 2.0.15, 2.0.26; maven.apache.org/resolver/upgrading-resolver.html ("Old key still read: yes", "Every other old key is ignored silently") |
| MVN-BUILD-13 | "`smartChecksums` ... only ever validates SHA-1"; grep `-e 'checksums'` | names `includedChecksums=false` for resolver 2.0.15 and later; headers carry SHA-1 and MD5 only (`x-checksum-sha1`, `x-checksum-md5` on Central); grep `-i -e 'checksums'` | maven.apache.org/resolver/expected-checksums.html; resolver 2.0.15 configuration page |
| MVN-BUILD-15 | committed and workflow-written `.mvn/extensions.xml` only | adds `~/.m2/extensions.xml` and `$MAVEN_HOME/conf/extensions.xml` from Maven 3.10.0, with an `ls` inside the CI image; severity stays SHOULD | 3.10.0 release notes |
| MVN-BUILD-17 (rationale) | ends "differs between the 21 and 25 pages." | adds the maven-compiler-plugin 3.16.0 `proc` doc quote "Starting with JDK 21, this option must be set explicitly" | maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html (3.16.0) |
| MVN-DEP-11 (rationale) | "`3.9.16` as the newest stable ... `4.0.0-rc-6` ... (queried 2026-09-12)" | "`3.10.2` as the newest stable ..., beside the maintained `3.9.16`, ... `4.0.0-rc-7` ... (queried 2026-11-27)" | maven-core metadata; history.html; solrsearch still served |
| MVN-PUB-01 (rationale) | "Current line 0.9.x, verified 2026-09-12." | "Current release 0.12.0, verified 2026-11-27." | central-publishing-maven-plugin metadata (lastUpdated 2026-10-13) |
| MVN-PUB-02 | "3.9.16 as the stable line and `4.0.0-rc-6` ... as of 2026-09-12" | "3.9.16 and 3.10.2 as the stable lines and `4.0.0-rc-7` ... as of 2026-11-27", plus the plugin's Maven 4.x known issue and a deploy-job check for a 3.x distribution | maven-core metadata; publish-portal-maven page known issues |
| MVN-PUB-04 | DNS TXT or "GitHub repository ownership"; "There is no third path"; "which of the two methods" | DNS TXT with the Verification Key, a temporary public repository for GitHub, GitLab, Gitee and Bitbucket namespaces, automatic `io.github.<user>` for GitHub sign-ups; "which method" | central.sonatype.org/register/namespace/ (read 2026-11-27) |
| MVN-PUB-09 (verification) | no `<checksums>` check | `<checksums>none</checksums>` is a finding; default `all` writes MD5, SHA-1, SHA-256 and SHA-512 | publish-portal-maven page |
| publishing.md "What Agents Get Wrong" 2 | "when they were read on 2026-09-12" | "when they were read on 2026-09-12 and again on 2026-11-27" | Portal guide, requirements, API, registration and namespace pages, news archive (read 2026-11-27) |
| lifecycle "What Agents Get Wrong" 11 | "Assumes `aether.checksums.algorithms` works on any Maven ... the wrong name fails silently." | "Writes `aether.connector.basic.smartChecksums` for resolver 2.x, or assumes Maven 3 means resolver 1.x." | resolver configuration pages and upgrade guide |

## New rules

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-PUB-11 | Pin `central-publishing-maven-plugin` to at least **0.12.0** in any release job that builds with Maven 3.10. | The plugin's 0.12.0 release fixed Central rejecting deployments built with Maven 3.10.0 because of leftover metadata files (plugin page, read 2026-11-27). Central rejects at upload, after signing, so an older pin under a 3.10 distribution fails the release late. Whether a later 3.10.x release stops writing those files is not determined, so the floor covers the whole 3.10 line. | `grep -n -A2 'central-publishing-maven-plugin' pom.xml` next to `grep distributionUrl .mvn/wrapper/maven-wrapper.properties`. A version below 0.12.0 by a real version comparator, beside an `apache-maven-3.10.` distribution or a CI step that installs Maven 3.10, is the finding. An older pin beside a 3.9.x distribution passes this row. | MUST |

The next free IDs are `MVN-BUILD-22`, `MVN-DEP-12`, `MVN-PUB-12`, `MVN-ANT-07`
and `MVN-CORE-04`.

## Confirmed unchanged

- No plain `4.0.0`; Maven 4 needs Java 17 to run (`MVN-BUILD-09` a); the
  `pre-*`/`post-*` aliases and `mvn clean` running `post-clean` (`-09` d).
- `maven.consumer.pom.flatten` is opt-in and `bom` packaging is Maven 4 only
  (`MVN-DEP-11`, `MVN-PUB-02`); the solrsearch query URL is still served.
- No Maven 3.9 release after 3.9.16; it still bundles resolver 1.9.27.
- `maven-wrapper-plugin` is still 3.3.4, and `wrapperSha256Sum` and
  `distributionSha256Sum` are still optional with no default (`MVN-BUILD-14`).
- The resolver design note still says checksums give integrity, not trust
  (`MVN-BUILD-12`); unrecognised resolver keys are still ignored silently
  (Non-Negotiable 9).
- Compiler: the `full` value floor 3.13.0 (MCOMPILER-548), allowed values
  `none`, `only`, `full`, user property `maven.compiler.proc`, default
  `source`/`target` 1.8 on 3.x (`MVN-BUILD-01`, `-16`).
- JDK 26 and 27 javac pages carry the same `-proc` text, so JDK 23 stays the
  switch-off release (`MVN-BUILD-17`); javac `-encoding` still falls back to the
  platform default (`MVN-BUILD-21`).
- `maven-toolchains-plugin` 3.3.0 has one parameter and no download path;
  `org.mvnsearch:toolchains-maven-plugin` is still 4.5.0, last touched
  2023-04-09 (`MVN-BUILD-19`).
- Enforcer: no rule active by default, `enforce` binds to `validate`, no
  default flag changed in 3.6.3 or 3.7.0 (`MVN-DEP-03` to `-07`).
- `maven-artifact-plugin` still has `check-buildplan` and `compare` (3.7.0).
- `maven-source-plugin` `jar-no-fork`, `maven-javadoc-plugin` `jar` and
  `maven-gpg-plugin` 3.2.8: no release in the window.
- Portal: 0.7.0 SNAPSHOT floor, OSSRH end of life on 2025-06-30, the Staging
  API shim, the six POM elements, required `.asc`, `.md5`, `.sha1`, sources and
  javadoc jars with placeholders allowed, the deployment state machine,
  `autoPublish` default false and `waitUntil` default `validated`; no OIDC or
  trusted-publishing path on any page read.
- Ant: `includeantruntime` default and quote, `<signjar>` attributes, Ant
  1.10.18 still the latest core release; Gradle's Ant guide still says the
  configuration cache is disabled automatically on import (`MVN-ANT-01`, `-02`,
  `-06`).
- No Maven core, resolver, wrapper or plugin advisory in the window.

## Open questions

1. Surefire 3.6.0's single `surefire-junit-platform` provider and the JUnit
   4.12 floor are neither confirmed nor falsified: the 3.6.0 what's-new page
   returned 404. The `JUnitPlatformProvider` line in `MVN-BUILD-05` rests on
   the same gap.
2. `MVN-BUILD-09` (b), "Plexus container DI is removed": the migration guide
   does not mention it, and the rc-7 notes add "validation for Plexus-based
   plugin dependency injection", so "removed" may be too strong. Check the MNG
   fix list before changing it.
3. Which RC apache/maven's own Maven-4 CI leg uses now (`MVN-BUILD-07`); the
   workflow file was not fetched.
4. `MVN-BUILD-10`: MNG-8258 was not re-fetched, and the value of the 3.10 Super
   POM default timestamp was not read.
5. The exact enforcer built-in rule count at 3.7.0 (38 by arithmetic, 39 by the
   index fetch).
6. Maven 3.10 changes not yet assessed against this pair: level-order classpath
   ordering, `settings.xml` server credentials scoped to repository origin
   (does it affect the `MVN-PUB-06` `<server>` lookup?), and the validation
   bypass property. The "Maven 3.9.x, verified 2026-09-12" stamps on
   `MVN-DEP-01`, `-02` and `-09` were not re-measured on 3.10.
7. Whether Maven 3.10.1 or 3.10.2 stopped writing the leftover metadata files
   that `MVN-PUB-11` guards against.
8. The resolver release that first read the 1.x names as aliases (likely
   2.0.15, not determined); `included-checksum-strategies.html` returned 404.
9. Ant: target.html returned 404, so the `MVN-ANT-03` and `MVN-ANT-04` quotes
   were not re-fetched; the "Ant 1.7+" annotation on `MVN-ANT-06` is not backed
   by the signjar `preservelastmodified` row; the literal `Reusing
   configuration cache.` line was not confirmed; `maven-antrun-plugin` usage is
   still unmeasured.
10. `MVN-BUILD-18`'s toolchain-aware plugin versions were not re-checked.
11. `MVN-BUILD-15` severity (SHOULD or MUST) stays open; 3.10's extra
    extension locations widen its scope but are not an incident.
12. Central OIDC or trusted publishing: absent on every page read on
    2026-11-27, which does not prove it is absent from a preview elsewhere.

## Revision log

1. rules/maven-build.md, enforcer paragraph: drop the exact rule count.
2. rules/maven-build.md, The Gate: note that 3.10.x is GA and not re-measured.
3. rules/maven-build.md, Non-Negotiable 11: rc-7, the 3.9.16 and 3.10.2 GA lines, the 3.9/3.10 label.
4. rules/maven-build.md, Non-Negotiable 13: 0.12.0 on Maven 3.10, cite `MVN-PUB-11`.
5. lifecycle-and-plugins.md, measurement intro and table header: re-queried 2026-11-27.
6. lifecycle-and-plugins.md, measurement rows: maven-core, Surefire, compiler, resolver.
7. lifecycle-and-plugins.md, MVN-BUILD-17: the compiler plugin's JDK 21 doc wording.
8. lifecycle-and-plugins.md, MVN-BUILD-04: drop the apache/maven#11605 citation.
9. lifecycle-and-plugins.md, MVN-BUILD-05: correct metadata URL, unsuffixed-version method.
10. lifecycle-and-plugins.md, Maven 4 Readiness intro: MVN-BUILD-06 also gates 3.10.
11. lifecycle-and-plugins.md, MVN-BUILD-06: 3.10 fails on duplicates, verification, severity scope.
12. lifecycle-and-plugins.md, MVN-BUILD-07: a 3.x GA line, dated observation.
13. lifecycle-and-plugins.md, MVN-BUILD-08: 3.9/3.10 label, rc-7 metadata values.
14. lifecycle-and-plugins.md, MVN-BUILD-09 (c): properties exist from 3.10.0.
15. lifecycle-and-plugins.md, MVN-BUILD-10: reproducible default from 3.10.0.
16. lifecycle-and-plugins.md, MVN-BUILD-11: corrected names, alias table, bundled resolvers, assertj.
17. lifecycle-and-plugins.md, MVN-BUILD-13: `includedChecksums`, SHA-1 and MD5 headers, case-insensitive grep.
18. lifecycle-and-plugins.md, MVN-BUILD-15: user-wide and installation-wide extensions.
19. lifecycle-and-plugins.md, What Agents Get Wrong 11: the current wrong spelling.
20. dependencies.md, enforcer section: 3.7.0, no exact count, `banPropertyPrefix`.
21. dependencies.md, MVN-DEP-11: 3.10.2 and rc-7, queried 2026-11-27.
22. publishing.md, MVN-PUB-04: three namespace proofs.
23. publishing.md, One Read of pom.xml: five rows.
24. publishing.md, MVN-PUB-01: current release 0.12.0.
25. publishing.md, new row MVN-PUB-11.
26. publishing.md, plugin example: 0.12.0.
27. publishing.md, MVN-PUB-09: `<checksums>none</checksums>` finding.
28. publishing.md, MVN-PUB-02: rc-7, 3.10.2, Maven 4.x known issue and deploy-job check.
29. publishing.md, row count: eleven.
30. publishing.md, What Agents Get Wrong 2: re-read on 2026-11-27.
31. Spillover round: dependencies.md, MVN-DEP-11 query block: read maven-core's maven-metadata.xml instead of the lagging Solr index.
32. Spillover round: dependencies.md, MVN-DEP-11 verification: the metadata grep result, and the Solr lag.
33. Spillover round: publishing.md, MVN-PUB-02 rationale: "Central's maven-metadata.xml lists" instead of "Central's index gives".
34. Spillover round: publishing.md, MVN-PUB-02 verification: maven-metadata.xml instead of the Solr query, and the Solr lag.

## Edit list

Apply each entry as an exact, single-occurrence string replacement. Every find
string was checked against the file text on 2026-11-27.

1. File: `rules/maven-build.md`
   Find:
   ```
   `maven-enforcer-plugin` ships 37 built-in rules and zero of them active, and a
   ```
   Replace:
   ```
   `maven-enforcer-plugin` ships dozens of built-in rules and zero of them active, and a
   ```

2. File: `rules/maven-build.md`
   Find:
   ```
   last, so the common case never reaches the slow ones. Maven 3.9.x, verified
   2026-09-12.
   ```
   Replace:
   ```
   last, so the common case never reaches the slow ones. Maven 3.9.x, verified
   2026-09-12. Maven 3.10.x, GA since 2026-09-27, is not re-measured here.
   ```

3. File: `rules/maven-build.md`
   Find:
   ```
   | 11 | Maven 4 is release-candidate only (`4.0.0-rc-6` against `3.9.16` GA, 2026-09-12), so every Maven-4 row is migration readiness and every Maven mechanic written down says "(Maven 3)", "(Maven 4)" or "(both)". |
   ```
   Replace:
   ```
   | 11 | Maven 4 is release-candidate only (`4.0.0-rc-7` against the `3.9.16` and `3.10.2` GA lines, 2026-11-27), so every Maven-4 row is migration readiness and every Maven mechanic written down says "(Maven 3)", "(Maven 4)" or "(both)", narrowed to "(Maven 3.9)" or "(Maven 3.10)" where those two lines differ. |
   ```

4. File: `rules/maven-build.md`
   Find:
   ```
   pin 0.7.0 or later before relying on a SNAPSHOT channel. `oss.sonatype.org`, `s01.oss.sonatype.org` and `nexus-staging-maven-plugin` are dead paths: OSSRH ended 2025-06-30. | MVN-PUB-03, MVN-PUB-01 |
   ```
   Replace:
   ```
   pin 0.7.0 or later before relying on a SNAPSHOT channel, and 0.12.0 or later on Maven 3.10. `oss.sonatype.org`, `s01.oss.sonatype.org` and `nexus-staging-maven-plugin` are dead paths: OSSRH ended 2025-06-30. | MVN-PUB-03, MVN-PUB-01, MVN-PUB-11 |
   ```

5. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
   Find:
   ```
   Every number here was queried from Central and verified **2026-09-12**. Re-query
   ```
   Replace:
   ```
   Every number here was queried from Central and verified **2026-09-12**, and the
   rows that moved were re-queried **2026-11-27**. Re-query
   ```

6. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
   Find:
   ```
   | Artifact | State on 2026-09-12 |
   ```
   Replace:
   ```
   | Artifact | State on 2026-11-27 |
   ```

7. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
   Find:
   ```
   | `org.apache.maven:maven-core` | `3.9.16` GA, `4.0.0-rc-6` latest. No plain `4.0.0` exists,
   ```
   Replace:
   ```
   | `org.apache.maven:maven-core` | `3.9.16` and `3.10.2` GA (the 3.10 line went GA on 2026-09-27), `4.0.0-rc-7` latest. No plain `4.0.0` exists,
   ```

8. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
   Find:
   ```
   `3.6.0` GA (`lastUpdated 20260903221843`), one release past the `3.5.6`-GA / `3.6.0-M1` snapshot.
   ```
   Replace:
   ```
   `3.6.1` GA (`lastUpdated 20261026024848`), after `3.6.0` GA, which was one release past the `3.5.6`-GA / `3.6.0-M1` snapshot.
   ```

9. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
   Find:
   ```
   The `proc` parameter is `since 2.2`, which is the trap |
   ```
   Replace:
   ```
   The `proc` parameter is `since 2.2`, which is the trap. Current GA `3.16.0`, while the metadata's `<latest>` and `<release>` read `4.0.0-beta-5`, a Maven-4-only milestone |
   ```

10. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    | Maven Resolver | `1.9.27` bundled by Maven 3.9.16, `2.0.x` bundled by Maven 4. The property names differ and the old ones are ignored without error |
    ```
    Replace:
    ```
    | Maven Resolver | `1.9.27` bundled by Maven 3.9.16. The 2.0.x line is bundled by Maven 3.10.x (`2.0.26` in 3.10.2) and by Maven 4 (`2.0.23` in 4.0.0-rc-7). The property names differ: 2.x still reads two 1.x checksum names as aliases and ignores every other old name without error |
    ```

11. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    and the javac specification text itself differs between the 21 and 25 pages. |
    ```
    Replace:
    ```
    and the javac specification text itself differs between the 21 and 25 pages. maven-compiler-plugin 3.16.0's own `proc` documentation also reads "Starting with JDK 21, this option must be set explicitly", so copying from the plugin page reproduces the wrong release. |
    ```

12. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    The upstream fix (apache/maven#11605) is open and unmerged as of 2026-09-12, so the additive form is the fix, not an upgrade.
    ```
    Replace:
    ```
    The additive form is the fix, not an upgrade.
    ```

13. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-plugin/maven-metadata.xml` before writing the version.
    ```
    Replace:
    ```
    `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml` before writing the version, and take the newest entry in its version list with no `-M`, `-alpha`, `-beta` or `-rc` suffix, never the `<latest>` or `<release>` element, which can name a milestone (maven-compiler-plugin's read `4.0.0-beta-5` on 2026-11-27).
    ```

14. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    Every row here is Maven 3 to Maven 4 migration only. The gate is one run of the
    ```
    Replace:
    ```
    Every row here is Maven 3 to Maven 4 migration only, except that MVN-BUILD-06
    also gates a 3.9 to 3.10 move. The gate is one run of the
    ```

15. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    | MVN-BUILD-06 | Before any Maven-4 move, find every plugin declared in both the top-level build block and a profile's build block, and de-duplicate. | Maven 3.9 emits a warning and Maven 4 **fails the build**.
    ```
    Replace:
    ```
    | MVN-BUILD-06 | Before any move to Maven 3.10 or Maven 4, find every plugin declared in both the top-level build block and a profile's build block, and de-duplicate. | Maven 3.9 emits a warning, while Maven 3.10.x (GA since 2026-09-27, which also fails on a duplicate dependency declaration) and Maven 4 **fail the build**.
    ```

16. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    Run the reactor once under a `4.0.0-rc-*` toolchain (MVN-BUILD-07) and the failure names the plugin.
    ```
    Replace:
    ```
    Run the reactor once under a 3.10.x wrapper or a `4.0.0-rc-*` toolchain (MVN-BUILD-07) and the failure names the plugin.
    ```

17. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    A coordinate in both is the finding. | MUST (migration only) |
    ```
    Replace:
    ```
    A coordinate in both is the finding. | MUST (migration to 3.10 or 4) |
    ```

18. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    Keeps the shipping build on the 3.9.x GA line while
    ```
    Replace:
    ```
    Keeps the shipping build on a 3.x GA line while
    ```

19. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    apache/maven itself does exactly this, running
    ```
    Replace:
    ```
    apache/maven itself did exactly this when observed on 2026-09-12, running
    ```

20. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    still naming a 3.9.x distribution.
    ```
    Replace:
    ```
    still naming a 3.x GA distribution.
    ```

21. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    | MVN-BUILD-08 | State "(Maven 3)", "(Maven 4)" or "(both)" on every Maven mechanic you write down, and re-verify GA before publishing any unconditional Maven-4 claim. |
    ```
    Replace:
    ```
    | MVN-BUILD-08 | State "(Maven 3)", "(Maven 4)" or "(both)" on every Maven mechanic you write down, narrowing "(Maven 3)" to "(Maven 3.9)" or "(Maven 3.10)" where those two lines differ, and re-verify GA before publishing any unconditional Maven-4 claim. |
    ```

22. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    And `4.0.0` has never shipped, so "Maven 4 does X" is a claim about a release candidate. |
    ```
    Replace:
    ```
    And `4.0.0` has never shipped, so "Maven 4 does X" is a claim about a release candidate. Maven 3.10.x, GA since 2026-09-27, already differs from 3.9.x on several of these: it bundles resolver 2.x, fails on duplicate declarations and supplies a default `project.build.outputTimestamp`, so "(Maven 3)" alone is ambiguous there. |
    ```

23. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    which were `4.0.0-rc-6` and `3.9.16` on 2026-09-12.
    ```
    Replace:
    ```
    which both read `4.0.0-rc-7` on 2026-11-27, so `release` is not an index of stable versions.
    ```

24. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    replaced by `project.rootDirectory`, `session.topDirectory` and `session.rootDirectory`.
    ```
    Replace:
    ```
    replaced by `project.rootDirectory`, `session.topDirectory` and `session.rootDirectory` (all three also exist from Maven 3.10.0, so the replacement can land before the move).
    ```

25. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    Reproducible-builds mode is on by default only from `4.0.0-beta-5` (MNG-8258), so on the shipping 3.9.x line an unset timestamp bakes the wall clock into every archive entry.
    ```
    Replace:
    ```
    Reproducible-builds mode is on by default from Maven 3.10.0 (a default `project.build.outputTimestamp` in the Super POM) and from `4.0.0-beta-5` (MNG-8258), so on the 3.9.x line an unset timestamp bakes the wall clock into every archive entry, and an explicit value is what keeps the archive the same whichever line builds it.
    ```

26. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find (the whole row):
    ```
    | MVN-BUILD-11 | Read every `aether.` property in `.mvn/maven.config` against the Maven version the wrapper pins, and treat a resolver-1.x name under a Maven-4 distribution as a migration breakage. | Resolver 1.x names `aether.checksums.algorithms` and `aether.connector.smartChecksums`. Resolver 2.0.x, which Maven 4 bundles, renamed them to `aether.checksums.checksumAlgorithms` and `aether.connector.basic.smartChecksums`, and the current reference contains no entry for the old names at all. Unrecognised system properties are **ignored, not rejected**, so the config becomes a silent no-op the day the wrapper is bumped and the hardening disappears with it. assertj is the live example: correct today against a pinned 3.9.16 distribution, a landmine on the first Maven-4 bump. | see block MVN-BUILD-11 (1 of 2) next to see block MVN-BUILD-11 (2 of 2). Pre-2.0 names beside an `apache-maven-4.` distribution is the finding. Empty output from the first grep is the pass, because there is no resolver configuration to break. Maven 3.9.16 bundles resolver 1.9.27, verified 2026-09-12. | MUST |
    ```
    Replace:
    ```
    | MVN-BUILD-11 | Read every `aether.` property in `.mvn/maven.config` against the resolver line the wrapper's Maven bundles: resolver 1.x for Maven 3.9.x, resolver 2.x for Maven 3.10.x and Maven 4. Treat a name that line does not read as a breakage. | Resolver 1.x names `aether.checksums.algorithms` and `aether.connector.smartChecksums`. Resolver 2.0.0 to 2.0.14 spelled them `aether.layout.maven2.checksumAlgorithms` and `aether.connector.basic.smartChecksums`, and from 2.0.15 (2026-02-12) they are `aether.checksums.checksumAlgorithms` and `aether.connector.basic.includedChecksums`. The 2.x upgrade guide still reads the two 1.x names as aliases and states that every other old key is ignored silently, so the silent no-ops are the 2.0.0-to-2.0.14 spellings on every 2.x resolver Maven now ships, and any 1.x key outside the guide's alias table. Unrecognised system properties are **ignored, not rejected**, so such a config becomes a no-op the day the wrapper is bumped and the hardening disappears with it. Maven 3.9.16 bundles resolver 1.9.27, 3.10.2 bundles 2.0.26 and 4.0.0-rc-7 bundles 2.0.23, verified 2026-11-27. assertj's `.mvn/maven.config` uses exactly the two aliased 1.x names, so it survives a 2.x bump through the alias. | see block MVN-BUILD-11 (1 of 2) next to see block MVN-BUILD-11 (2 of 2). `aether.connector.basic.smartChecksums` or `aether.layout.maven2.checksumAlgorithms` beside an `apache-maven-3.10.` or `apache-maven-4.` distribution is the finding, and so is any other 1.x key outside the upgrade guide's alias table. A 1.x `aether.checksums.algorithms` or `aether.connector.smartChecksums` there still works through the alias: propose the current 2.x spelling, but do not block on it. Empty output from the first grep is the pass, because there is no resolver configuration to break. | MUST |
    ```

27. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    | MVN-BUILD-13 | Do not remove `smartChecksums=false` when tidying build flags. | `smartChecksums` extracts the reference digest from an HTTP response header and only ever validates SHA-1, so leaving it on beside a SHA-512-first or SHA-256-first algorithm list configures digests that are then never exercised. Disabling it is what forces the full checksum-file fetch. |
    ```
    Replace:
    ```
    | MVN-BUILD-13 | Do not remove `smartChecksums=false` (resolver 1.x) or `includedChecksums=false` (resolver 2.0.15 and later) when tidying build flags. | Included checksums take the reference digest from HTTP response headers, which carry only SHA-1 and MD5 (`x-checksum-sha1` and `x-checksum-md5` on Central), so leaving them on beside a SHA-512-first or SHA-256-first algorithm list configures digests that are then never exercised. Disabling them is what forces the full checksum-file fetch. |
    ```

28. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
      xargs -0 -r grep -H -n -e 'checksums' --
    ```
    Replace:
    ```
      xargs -0 -r grep -H -n -i -e 'checksums' --
    ```

29. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    A `.mvn/extensions.xml` written by a workflow step changes dependency resolution for that build and is invisible to a census of committed files. |
    ```
    Replace:
    ```
    A `.mvn/extensions.xml` written by a workflow step changes dependency resolution for that build and is invisible to a census of committed files. From Maven 3.10.0 a user-wide `~/.m2/extensions.xml` and an installation-wide `$MAVEN_HOME/conf/extensions.xml` load core extensions too, and neither is ever in the tree. |
    ```

30. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    Either hit means resolution is extended, and the two must be reconciled before asserting anything about it. Empty output from both is the pass.
    ```
    Replace:
    ```
    On a runner with Maven 3.10 or later, also run `ls ~/.m2/extensions.xml "$MAVEN_HOME/conf/extensions.xml"` inside the CI image. Any hit means resolution is extended, and the sources must be reconciled before asserting anything about it. Empty output from all of them is the pass.
    ```

31. File: `skills/maven-build-reference/lifecycle-and-plugins.md`
    Find:
    ```
    11. **Assumes `aether.checksums.algorithms` works on any Maven.** The flag reads
        as self-evidently correct system-property syntax, the model has no
        version-awareness of the resolver 1.x to 2.0 rename, and the wrong name fails
        silently. (MVN-BUILD-11)
    ```
    Replace:
    ```
    11. **Writes `aether.connector.basic.smartChecksums` for resolver 2.x, or assumes
        Maven 3 means resolver 1.x.** The first is a 2.0.0-to-2.0.14 spelling that
        every current 2.x resolver ignores silently, and the second misses that
        Maven 3.10.x bundles resolver 2.x. (MVN-BUILD-11)
    ```

32. File: `skills/maven-build-reference/dependencies.md`
    Find:
    ```
    `maven-enforcer-plugin` 3.6.3 (released 2026-05-15, verified 2026-09-12) ships
    37 built-in rules and **zero** of them active.
    ```
    Replace:
    ```
    `maven-enforcer-plugin` 3.7.0 (on Central 2026-10-30, verified 2026-11-27) ships
    dozens of built-in rules, 3.7.0 adding `banPropertyPrefix`, and **zero** of them
    active.
    ```

33. File: `skills/maven-build-reference/dependencies.md`
    Find:
    ```
    Central lists `3.9.16` as the newest stable `org.apache.maven:maven-core` and tops the 4.0 line out at `4.0.0-rc-6`, with no plain `4.0.0` at all (queried 2026-09-12).
    ```
    Replace:
    ```
    Central lists `3.10.2` as the newest stable `org.apache.maven:maven-core`, beside the maintained `3.9.16`, and tops the 4.0 line out at `4.0.0-rc-7`, with no plain `4.0.0` at all (queried 2026-11-27).
    ```

34. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
    Prove a reverse-domain namespace with a DNS TXT record, or an `io.github.<user>` namespace with GitHub repository ownership. | There is no third path and no way to upload before verification completes.
    ```
    Replace:
    ```
    Prove a reverse-domain namespace with a DNS TXT record carrying the Portal's Verification Key, or a code-hosting namespace (GitHub, GitLab, Gitee or Bitbucket, such as `io.github.<user>`) with a temporary public repository named with that key. An account that signs up through GitHub may get `io.github.<user>` verified automatically. | There is no way to upload before verification completes.
    ```

35. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
    The runbook names which of the two methods was used
    ```
    Replace:
    ```
    The runbook names which method was used
    ```

36. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
    clears four rows.
    ```
    Replace:
    ```
    clears five rows.
    ```

37. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
    Current line 0.9.x, verified 2026-09-12.
    ```
    Replace:
    ```
    Current release 0.12.0, verified 2026-11-27.
    ```

38. File: `skills/maven-build-reference/publishing.md`
    Insert after the anchor (the end of the MVN-PUB-01 row):
    ```
    No `<version>` element at all is the finding. | MUST |
    ```
    Text to insert, as a new line directly below that row:
    ```
    | MVN-PUB-11 | Pin `central-publishing-maven-plugin` to at least **0.12.0** in any release job that builds with Maven 3.10. | The plugin's 0.12.0 release fixed Central rejecting deployments built with Maven 3.10.0 because of leftover metadata files (plugin page, read 2026-11-27). Central rejects at upload, after signing, so an older pin under a 3.10 distribution fails the release late. Whether a later 3.10.x release stops writing those files is not determined, so the floor covers the whole 3.10 line. | `grep -n -A2 'central-publishing-maven-plugin' pom.xml` next to `grep distributionUrl .mvn/wrapper/maven-wrapper.properties`. A version below 0.12.0 by a real version comparator, beside an `apache-maven-3.10.` distribution or a CI step that installs Maven 3.10, is the finding. An older pin beside a 3.9.x distribution passes this row. | MUST |
    ```

39. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
      <version>0.9.0</version>
    ```
    Replace:
    ```
      <version>0.12.0</version>
    ```

40. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
    Also confirm the `gpg` arguments contain no interactive prompt path, since an agent-backed signature cannot be reproduced by the release job. |
    ```
    Replace:
    ```
    Also confirm the `gpg` arguments contain no interactive prompt path, since an agent-backed signature cannot be reproduced by the release job. A `<checksums>none</checksums>` on `central-publishing-maven-plugin` is also the finding: its default `all` writes MD5, SHA-1, SHA-256 and SHA-512, and the plugin page warns that with `none` validation might fail. |
    ```

41. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
    Central's index gives `maven-core` 3.9.16 as the stable line and `4.0.0-rc-6` as the top of the 4.0 line as of 2026-09-12, so no plain `4.0.0` exists.
    ```
    Replace:
    ```
    Central's index gives `maven-core` 3.9.16 and 3.10.2 as the stable lines and `4.0.0-rc-7` as the top of the 4.0 line as of 2026-11-27, so no plain `4.0.0` exists. The Portal plugin's own page also lists "Publishing doesn't work when using Maven 4.x.x" as a known issue (read 2026-11-27), so the release job itself runs on Maven 3.
    ```

42. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
    No such version, which is today's state, means the rule stands. |
    ```
    Replace:
    ```
    No such version, which is today's state, means the rule stands. Separately, the deploy job's wrapper or Maven setup step must name a 3.x distribution, and a `4.0.0-rc` distribution there is the finding. |
    ```

43. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
    Ten rows, all MUST.
    ```
    Replace:
    ```
    Eleven rows, all MUST.
    ```

44. File: `skills/maven-build-reference/publishing.md`
    Find:
    ```
    OIDC path when they were read on 2026-09-12. Do not write one without a
    ```
    Replace:
    ```
    OIDC path when they were read on 2026-09-12 and again on 2026-11-27. Do not write one without a
    ```

## Spillover round

Input: `.agents/research/refresh-2026-11/maven-build/spillover-check.md`, items
raised by the java-quality pair and checked against this pair on 2026-11-27.

### Verdict

One item changes the target. The `MVN-PUB-02` and `MVN-DEP-11` verifications
query the search.maven.org Solr index, and on 2026-11-27 that index lagged
Central: for `org.apache.maven:maven-core` it returned 3.9.16 down to 3.9.12
and no 3.10.x, while Central's own maven-metadata.xml lists 3.10.0 to 3.10.2
and `4.0.0-rc-7`. A plain `4.0.0` could therefore reach Central before the
index shows it, and the check that retires both rules would read "still RC"
after Maven 4 shipped. Both verifications move to maven-core's
maven-metadata.xml, the source `MVN-BUILD-08` already uses. The grep matches
`<version>4\.0\.0</version>` exactly, because a looser `<version>4.0.0` would
also match `4.0.0-rc-7` and report a false retirement. Rule text and severity
do not change, no ID moves, and every edit replaces text inside an existing
line, so no file changes length.

Item 1 (the `MVN-BUILD-05` Surefire URL and 3.6.1) is already correct after the
first round. Item 3 (NullAway 0.14.2) is true but does not touch any claim in
this pair.

### Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| MVN-DEP-11 (query block and verification) | `curl -sS 'https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json'`; "A result set with no unsuffixed `"v":"4.0.0"` means Maven 4 is still RC" | `curl -sS 'https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml' \| grep -n '<version>4\.0\.0</version>'`; the verification names the Solr lag, and empty output means Maven 4 is still RC | maven-core maven-metadata.xml (lastUpdated 20261122115857) against the solrsearch gav query, both requested 2026-11-27 |
| MVN-PUB-02 (rationale and verification) | "Central's index gives `maven-core` 3.9.16 and 3.10.2"; the solrsearch `curl` | "Central's maven-metadata.xml lists `maven-core` 3.9.16 and 3.10.2"; the metadata `curl`, read its version list, not the Solr index, which lagged Central on 2026-11-27 | same pair of requests |

### New rules

None. The next free IDs stay `MVN-BUILD-22`, `MVN-DEP-12`, `MVN-PUB-12`,
`MVN-ANT-07` and `MVN-CORE-04`.

### Declined

- Item 1, `MVN-BUILD-05` URL path and newest Surefire GA: the target already
  uses `org/apache/maven/plugins/maven-surefire-plugin` and records `3.6.1` GA
  (`lastUpdated 20261026024848`) since the first round.
- Item 3, NullAway 0.14.2 treating Maven plugin `@Parameter` fields as
  externally initialized: confirmed by the release page, but no claim in this
  pair is about Mojo field nullness, so nothing here is false. It is a
  nullness-checker fact for the java-quality pair, not a build-configuration
  rule, and adding it would be guidance outside this pair's scope.

### Sources

| Claim | Source | Kind | Date |
|---|---|---|---|
| maven-core versions on Central: 3.10.0 to 3.10.2, `4.0.0-rc-7`, no plain `4.0.0` | https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml | primary | lastUpdated 2026-11-22, requested 2026-11-27 |
| The Solr index returned maven-core 3.9.16 to 3.9.12 only, and Surefire `3.6.0-M1` as newest | https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json and the Surefire equivalent | primary (live query) | 2026-11-27 |
| Surefire 3.6.1 is the newest GA (item 1, no change) | https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml | primary | lastUpdated 2026-10-26 |
| NullAway 0.14.2 "Treat Maven plugin parameters as externally initialized" (item 3, declined) | https://github.com/uber/NullAway/releases | primary | 2026-09-25 |

### Edit list (spillover round)

Apply each entry as an exact, single-occurrence string replacement. Every find
string was checked against the file text on 2026-11-27 and occurs once.

1. File: `skills/maven-build-reference/dependencies.md`
   Find:
   ```
   curl -sS 'https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json'
   ```
   Replace:
   ```
   curl -sS 'https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml' | grep -n '<version>4\.0\.0</version>'
   ```

2. File: `skills/maven-build-reference/dependencies.md`
   Find:
   ```
   The Central query above. A result set with no unsuffixed `"v":"4.0.0"` means Maven 4 is still RC and this row stands.
   ```
   Replace:
   ```
   The Central query above, which reads Central's own metadata because the search.maven.org Solr index lagged it on 2026-11-27 and listed no 3.10.x `maven-core`. Empty output, no plain `4.0.0` entry, means Maven 4 is still RC and this row stands.
   ```

3. File: `skills/maven-build-reference/publishing.md`
   Find:
   ```
   Central's index gives `maven-core` 3.9.16 and 3.10.2 as the stable lines
   ```
   Replace:
   ```
   Central's maven-metadata.xml lists `maven-core` 3.9.16 and 3.10.2 as the stable lines
   ```

4. File: `skills/maven-build-reference/publishing.md`
   Find:
   ```
   `curl -s "https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json"`. A version matching `4.0.0` with no suffix is the only signal that retires this rule. No such version, which is today's state, means the rule stands.
   ```
   Replace:
   ```
   `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml` and read its version list, not the search.maven.org Solr index, which lagged Central on 2026-11-27 and listed no 3.10.x `maven-core`. A `<version>4.0.0</version>` entry with no suffix is the only signal that retires this rule. No such version, which is today's state, means the rule stands.
   ```

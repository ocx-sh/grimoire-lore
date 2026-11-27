---
title: gradle-build delta refresh, 2026-09-12 to 2026-11-27
pair: gradle-build
date: 2026-11-27
window_start: 2026-09-12
model: opus
consolidates:
  - .agents/research/refresh-2026-11/gradle-build/gradle-release-line-and-gradle-10.md
  - .agents/research/refresh-2026-11/gradle-build/jdk27-toolchains-and-wrapper.md
  - .agents/research/refresh-2026-11/gradle-build/plugin-publish-testkit-and-floors.md
  - .agents/research/refresh-2026-11/gradle-build/shadow-and-packaging-shapes.md
  - .agents/research/refresh-2026-11/gradle-build/central-portal-and-release-plugins.md
  - .agents/research/refresh-2026-11/gradle-build/gradle-actions-and-develocity.md
  - .agents/research/refresh-2026-11/gradle-build/dependency-analysis-and-supply-chain.md
  - .agents/research/refresh-2026-11/gradle-build/recent-shifts-gradle-build.md
revises:
  - .agents/research/jvm-gradle-core.md
  - .agents/research/jvm-gradle-settings.md
  - .agents/research/jvm-gradle-plugin-dev.md
  - .agents/research/jvm-dependencies.md
  - .agents/research/jvm-distribution.md
  - .agents/research/jvm-publishing.md
  - .agents/research/jvm-platform-and-toolchains.md
  - .agents/research/jvm-topic-map.md
---

# gradle-build delta refresh

## Verdict

- Keep every rule ID and meaning. Change rows in place where a fetched primary source contradicts them, restamp the dates that were re-read, and add two rules to the toolchains depth file. Rule bump: patch. Reference skill bump: minor.
- Restamp `rules/gradle-build.md` to Gradle 9.9.2 (released 2026-11-19), and drop "for a task" from the sentence on GRADLE-CACHE-08. The #24040 closing comment says explicit credentials "disable the configuration cache", and the fetched text does not support a per-task scope. Every other rule-file edit is a date stamp on a fact that was re-read.
- Correct the JVM range to 17 to 27. Gradle 9.8.0 (2026-09-24) added JDK 27 as a daemon JVM and as a toolchain, and JVM 28 is unsupported. GRADLE-TOOL-01 gains the "27 needs 9.8.0" cross-check. GRADLE-TOOL-03's example drops the stale `9.7.1` for a `$VERSION` placeholder, and it now says to pass the checksum on every bump. From 9.9.0 the `wrapper` task keeps existing property values, so a stale sum can survive the bump.
- Add GRADLE-TOOL-08, the wrapper security floor. Four Gradle advisories from 2026-10-07 to 2026-11-19 break dependency-resolution integrity below 9.9.2, or below 8.14.8 on the 8.x line. One of them (GHSA-7f7r-77ff-fr6f) defeated GRADLE-DEP-15 and GRADLE-DEP-16 for transitive snapshots. The rule is MUST where `verification-metadata.xml` is committed and SHOULD otherwise. It covers the catalog code-injection, SFTP and SSL advisories too, so no separate GRADLE-DEP-19 or GRADLE-DEP-20 is added.
- Add GRADLE-TOOL-09 at SHOULD: no new Ant integration, `zipTo` or `unzipTo` in build logic. Gradle 9.9.0 deprecated them, and the 9.x upgrade guide removes them in Gradle 10.
- Correct GRADLE-CACHE-08 and the Scope bullets in `caching-and-correctness.md`. #24040 is closed, because 9.0.0 RC1 made the silent fallback the intended behaviour. The source for the "default-on slipped to Gradle 11" claim becomes the Gradle blog of 2026-08-19, not the 9.0.0 release notes, which never say it. GRADLE-CACHE-02 gains the 9.8.0 deprecation of configuration-time process starts, which becomes an error in Gradle 11.
- Fix the GRADLE-DEP-17 verification. Its grep `setup-gradle@v[4-9]` cannot match a SHA pin, which GRADLE-CI-09 requires. On planted input it returned nothing for `setup-gradle@<40 hex> # v6.4.1`, so a compliant repository read as a finding. The rule also names the documented `validate-wrappers: false` opt-out. GRADLE-DEP-15 moves to the canonical `securing_dependencies.html` URL. GRADLE-DEP-18's Sonatype figure becomes what the page says today.
- Correct GRADLE-CI-02's description of the cache key. Amend GRADLE-CI-11 for GHSA-chpw-2mqm-95cc: the two-workflow `download-and-submit` pattern needs `gradle/actions` v6.4.1 or later.
- Amend GRADLE-PUB-14 for vanniktech 0.36.0. Its default wait now stops at `VALIDATED`, so "live on Central" needs `DeploymentValidation.PUBLISHED`. GRADLE-PUB-18 names `actions/attest` as the preferred action, and its grep matches both names.
- Rewrite GRADLE-DIST-09. GradleUp/shadow#1489 closed as not planned on 2026-10-25. The maintainer's path is `PropertiesFileTransformer` with comma-joined merging, plus `mergeServiceFiles("META-INF/spring")` for `.imports`. The old text's no-argument `mergeServiceFiles()` merges only `META-INF/services`. GRADLE-DIST-10 gains one clause: R8 mode keeps `META-INF/services` providers.
- Update GRADLE-PLUG-17 and agent item 10. `isolatedProjects` is declarable from plugin-publish 2.2.1 (2026-09-10). A feature declared once must stay declared. The Portal still only warns on a missing `compatibility` block.
- Decline these candidates: a Central publishing-limits row, a `pull_request_target` row, the four deprecated `org.gradle.configuration-cache.*unsafe*` properties, implicit parallel model building, `Sync` deletion semantics, Gradle's own `gradle-skills`, and a "never pin plugin-publish 2.2.0" row. Each is either rare, outside Gradle build files, or already caught by an existing row. They go to open questions.

## Changed rules

Exact find and replace strings are in the Edit list. Only the changed sentence is quoted here.

### Rule index (`rules/gradle-build.md`, no ID)

- Old: "Gradle 9 disables it for a task and carries on rather than failing (`GRADLE-CACHE-08`)." New: "Gradle 9 disables it and carries on rather than failing (`GRADLE-CACHE-08`)." Source: https://github.com/gradle/gradle/issues/24040 (closing comment 2025-07-28: "explicit credentials disable the configuration cache").
- Old: "Gradle 9.x, verified 2026-09-12." New: "Gradle 9.x, current 9.9.2, verified 2026-11-27." Source: https://gradle.org/releases/.
- Non-negotiables 15 and 16 and the `bazel-quality` sibling note: restamped to 2026-11-27. Sources: https://gradleup.com/shadow/changes/, https://central.sonatype.org/pages/ossrh-eol/, https://github.com/bazel-contrib/rules_jvm_external/releases/tag/7.2.

### GRADLE-TOOL-01

- Old (rationale): "the JVM that runs Gradle (17 to 26 on the 9.x line)". New: "the JVM that runs Gradle (17 up to the newest JVM the wrapper's Gradle lists, 27 from 9.8.0)".
- Old (verification): "25 needs Gradle 9.1.0 or later and 26 needs 9.4.0 or later (verified 2026-09-12)". New: "25 needs Gradle 9.1.0 or later, 26 needs 9.4.0 or later and 27 needs 9.8.0 or later (verified 2026-11-27)".
- The Measurement and Floors rows for the running JVM and toolchain support, and agent item 3, change the same way.
- Source: https://docs.gradle.org/current/userguide/compatibility.html ("A JVM version between 17 and 27 is required to execute Gradle. JVM 28 and later versions are not yet supported."), https://docs.gradle.org/9.8.0/release-notes.html.

### GRADLE-TOOL-03

- Old (verification): "`./gradlew wrapper --gradle-version 9.7.1 --gradle-distribution-sha256-sum "$SUM"`."
- New: "`./gradlew wrapper --gradle-version "$VERSION" --gradle-distribution-sha256-sum "$SUM"`, with `$VERSION` observed on the release list and never from memory. Pass the sum on every version change: from Gradle 9.9.0 the task keeps existing property values, so a bump without it leaves the old sum beside the new URL."
- Source: https://docs.gradle.org/9.9.0/release-notes.html (the wrapper task "now preserves values from an existing `gradle-wrapper.properties` file"), https://docs.gradle.org/current/userguide/gradle_wrapper.html.

### JAVA-PLAT-13 (row lives in this pair's toolchains file)

- Old: "open at milestone 10.0.0-RC1 as of 2026-09-12". New: "open at milestone 10.0.0-RC1 as of 2026-11-27, with no Gradle 10 release candidate yet". Source: https://github.com/gradle/gradle/issues/2270, https://gradle.org/releases/.

### GRADLE-CACHE-02

- Old (rationale end): "It stays legal ([#2298](…) is open), so no tool fails it for you."
- New: the same sentence, then: "Gradle 9.8.0 (2026-09-24) deprecates starting a process at configuration time, with the cache on or off, and Gradle 11 makes it an error, but until then it surfaces only in the deprecation summary."
- Source: https://docs.gradle.org/9.8.0/release-notes.html, https://docs.gradle.org/9.9.2/userguide/upgrading_version_9.html.

### GRADLE-CACHE-04

- Old: "open as of 2026-09-12". New: "open as of 2026-11-27". Source: https://github.com/gradle/gradle/issues/18520.

### GRADLE-CACHE-08

- Old (rule): "Gradle 9 silently disables the cache for a task rather than failing, in several documented cases. The named one is a `maven-publish` repository with an explicit `credentials {}` block ([#24040](…))."
- New: "Gradle 9 silently disables the configuration cache rather than failing, in several documented cases. The named one is a `maven-publish` repository with an explicit `credentials {}` block, which [#24040](…) turned from a failure into this silent fallback in 9.0.0 RC1 ([PR 33830](…)). The issue is closed, and the fallback is the fix, not a bug awaiting one."
- The Scope bullets lose "live trackers" for #24040 and cite the Gradle blog for the Gradle 11 default-on target.
- Source: https://github.com/gradle/gradle/issues/24040 (closed 2025-06-13, milestone 9.0.0 RC1), https://github.com/gradle/gradle/pull/33830, https://blog.gradle.org/gradle-is-going-agentic (2026-08-19: "make Configuration Cache the default in Gradle 11 rather than Gradle 10"), https://docs.gradle.org/9.9.2/userguide/configuration_cache_enabling.html.

### GRADLE-DEP-15

- Old (citation): `dependency_verification.html`. New: `securing_dependencies.html#verifying-dependencies`. The old URL is now a meta-refresh stub that a text-only fetch reads as empty. Source: https://docs.gradle.org/current/userguide/securing_dependencies.md (the quoted "trusts whatever is currently in your repositories" is still at line 382).

### GRADLE-DEP-17

- Old (rule): "unless `gradle/actions/setup-gradle@v4` or later is already in the workflow, which validates automatically."
- New: "unless `gradle/actions/setup-gradle` v4 or later is already in the workflow without `validate-wrappers: false`, which validates automatically."
- Old (verification): "Either hit is the pass." New: a `wrapper-validation` hit is the pass, and so is a `setup-gradle@` hit whose tag or trailing version comment names v4 or later. A `validate-wrappers: false` hit in a job without `wrapper-validation` is the finding.
- Old (grep): `-e 'setup-gradle@v[4-9]'`. New: `-e 'setup-gradle@' -e 'validate-wrappers'`.
- Red/green, measured 2026-11-27 on planted workflow lines with GNU grep and busybox grep: the old pattern printed nothing for `uses: gradle/actions/setup-gradle@<40 hex> # v6.4.1` (exit 1). The new pattern printed it, and it printed the `validate-wrappers: false` line in the opt-out file.
- Source: https://github.com/gradle/actions/blob/main/docs/setup-gradle.md ("By default, this action will perform the same wrapper validation", disabled by `validate-wrappers: false`), https://github.com/gradle/actions/blob/main/docs/wrapper-validation.md.

### GRADLE-DEP-18

- Old (rationale): "from about 7 percent for 2026 frontier models to over 25 percent for older ones". New: "from about 6 percent for the best ungrounded models to roughly one in four for earlier ones (page read 2026-11-27)". Source: https://www.sonatype.com/resources/research/making-ai-work-safely.

### GRADLE-CI-02

- Old (rationale): "The setup action keys on the wrapper, the catalog and the build files together and prunes what it stores."
- New: "The setup action builds its own key from the runner OS, the job, a hash of the matrix and workflow name, and the commit SHA, and prunes what it stores after a successful job (`cache-cleanup` defaults to `on-success`)."
- Source: https://github.com/gradle/actions/blob/main/docs/setup-gradle.md (key `${cache-protocol}-gradle|${runner-os}|${job-id}[${hash-of-job-matrix-and-workflow-name}]-${git-sha}`).

### GRADLE-CI-11

- Rule gains: "Where a fork pull request's graph is submitted through the two-workflow `download-and-submit` pattern, pin `gradle/actions` v6.4.1 or later."
- Rationale gains the advisory. Verification gains block (2 of 2), which states its empty-output meaning.
- Source: https://github.com/gradle/actions/security/advisories/GHSA-chpw-2mqm-95cc (published 2026-10-28, High, affected 6.4.0 and earlier, patched 6.4.1), https://github.com/gradle/actions/blob/main/docs/dependency-submission.md.

### GRADLE-PUB-08

- Old: "(…, verified 2026-09-12): the build now *silently disables* the configuration cache for that task, so the publish task quietly stops being cached". New: "(…, verified 2026-11-27): the build now *silently disables* the configuration cache, so the publish run quietly stops being cached". Source: https://github.com/gradle/gradle/issues/24040.

### GRADLE-PUB-14

- Old (rule): "The shipped spellings are `publishToMavenCentral(automaticRelease = true)` for vanniktech and `publishingType = "AUTOMATIC"` for nmcp."
- New: "The shipped spellings are `publishToMavenCentral(automaticRelease = true)` for vanniktech, plus `validateDeployment = DeploymentValidation.PUBLISHED` from vanniktech 0.36.0 on, and `publishingType = "AUTOMATIC"` for nmcp."
- Rationale and verification gain the 0.36.0 default. The gate grep gains `-e 'DeploymentValidation'`.
- Source: https://raw.githubusercontent.com/vanniktech/gradle-maven-publish-plugin/main/CHANGELOG.md (0.36.0, 2026-01-13: `validateDeployment` became the `DeploymentValidation` enum, and the default waits for `VALIDATED`).

### GRADLE-PUB-17

- Restamp "verified 2026-09-12" to "verified 2026-11-27". Source: https://central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/.

### GRADLE-PUB-18

- Old (rule): "Add `actions/attest-build-provenance` to the release workflow". New: "Add `actions/attest` to the release workflow (`actions/attest-build-provenance` v4 and later wraps it, and stays accepted in existing workflows)".
- Old (grep): `-e 'attest-build-provenance'`. New: `-e 'actions/attest'`, which matches both names (checked on planted lines).
- Source: https://github.com/actions/attest-build-provenance ("new implementations should use `actions/attest` instead").

### GRADLE-DIST-09

- Old (rule): "Shadow ships no transformer for them, so either write a key-aware one or do not shade those modules together. `META-INF/spring/*.imports` is a line list and is correct under `mergeServiceFiles()`."
- New: "Shadow ships no Spring-specific transformer, so configure `PropertiesFileTransformer` to comma-join duplicate keys, write a key-aware transformer, or do not shade those modules together. `META-INF/spring/*.imports` is a line list and is correct under `mergeServiceFiles("META-INF/spring")`; the no-argument form merges only `META-INF/services`."
- Old (rationale): "GradleUp/shadow#1489 is still open, verified 2026-09-12." New: closed as not planned on 2026-10-25, with the maintainer's stated path.
- Gate grep 1 gains `-e 'PropertiesFileTransformer'`. The old `PropertiesTransformer` pattern is not a substring of it.
- Source: https://github.com/GradleUp/shadow/issues/1489, https://gradleup.com/shadow/configuration/merging/.

### GRADLE-DIST-10

- Rationale gains: "Shadow's optional R8 mode is the one minimizer that keeps the providers named in `META-INF/services`; the default analyzer does not." Source: https://gradleup.com/shadow/configuration/minimizing/.

### GRADLE-DIST-12, -13, -16, -17 and the jpackage paragraph

- Restamp to 2026-11-27. Spring Boot "4.x" becomes "4.0 to 4.2", and the jpackage citation names the JDK 25 and JDK 27 specifications. Sources: https://gradleup.com/shadow/changes/, https://maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html, https://docs.spring.io/spring-boot/gradle-plugin/packaging.html, https://docs.oracle.com/en/java/javase/27/docs/specs/man/jpackage.html.

### GRADLE-PLUG-17

- Rule gains: "Declare `isolatedProjects = true` there only after the `GRADLE-PLUG-27` diagnostics run is clean, and never drop a feature an earlier version declared."
- Old (rationale): "As of 2026-09-12 `configurationCache` is the only declarable feature." New: "As of 2026-11-27 the Portal still only warns, and the declarable features are `configurationCache` and, from plugin-publish 2.2.1 (2026-09-10), `isolatedProjects`. A feature declared in one version must stay declared in every later one, or the publish fails."
- Verification gains a diff of the `compatibility` block against the last released tag.
- Source: https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html, https://plugins.gradle.org/plugin/com.gradle.plugin-publish/2.2.1, https://github.com/gradle/gradle-plugin-compatibility-plugin.

### GRADLE-PLUG-06, -22, -27

- Restamp to the 9.9.2 re-read. Sources: https://docs.gradle.org/9.9.2/javadoc/deprecated-list.html, https://docs.gradle.org/9.9.2/javadoc/org/gradle/jvm/toolchain/JavaToolchainResolver.html, https://docs.gradle.org/9.9.2/userguide/isolated_projects.html.

### GRADLE-STRUCT-01, -10 and the #15383 paragraph

- Restamp "as of 9.7.1 (verified 2026-09-12)" to "as of 9.9.2 (verified 2026-11-27)", and both issue dates to 2026-11-27. Sources: https://docs.gradle.org/9.9.2/userguide/upgrading_version_9.html, https://github.com/gradle/gradle/issues/15383, https://github.com/gradle/gradle/issues/847.

## New rules

### GRADLE-TOOL-08 (toolchains-and-compilation.md, The Wrapper)

- Rule: Point `distributionUrl` at a Gradle release that carries every published security fix for its line. On 2026-11-27 that is 9.9.2 or later on 9.x, or 8.14.8 or later on 8.x. Read Gradle's security advisory index before any wrapper bump, because the next advisory moves this floor. Never take the version from memory (`GRADLE-DEP-18`).
- Rationale: GHSA-3cfg-jpcr-gfp3 (Critical, fixed in 9.9.1 and 8.14.7) runs catalog values as code at catalog load. GHSA-7f7r-77ff-fr6f (fixed in 9.9.2 and 8.14.8) let transitive changing modules skip verification. GHSA-j5m7-59rp-24f5 (fixed in 9.8.1 and 8.14.6) is the SSL fall-through. GHSA-4mf6-7pm2-6wm8 (fixed in 9.9.2) ignored SFTP `known_hosts`. None shows in a green build, and the second one undercuts the verification-metadata rows the pair already requires.
- Verification: see block GRADLE-TOOL-04 and read the version. A version below the line's floor, or on an older line, is the finding. Empty output means no wrapper is committed, which GRADLE-TOOL-04 already reports. Red/green measured 2026-11-27: a planted `gradle-9.7.1-bin.zip` line printed with its version, under GNU grep and busybox grep.
- Severity: MUST where the repository commits `verification-metadata.xml`, SHOULD otherwise.
- Sources: https://github.com/gradle/gradle/security/advisories/GHSA-3cfg-jpcr-gfp3, https://github.com/gradle/gradle/security/advisories/GHSA-7f7r-77ff-fr6f, https://github.com/gradle/gradle/security/advisories/GHSA-j5m7-59rp-24f5, https://github.com/gradle/gradle/security/advisories/GHSA-4mf6-7pm2-6wm8, https://docs.gradle.org/9.9.2/release-notes.html.

### GRADLE-TOOL-09 (toolchains-and-compilation.md, Dead Build-Script Syntax)

- Rule: Write no new Ant integration or Kotlin DSL archive helper into build logic. That means no `ant.` call, `Project.ant`, `AntBuilder`, `org.apache.tools.ant` import, `zipTo` or `unzipTo`. Use `Copy`, `Sync`, `Delete`, `Zip` and `Exec`, or an injected `FileSystemOperations` or `ExecOperations`.
- Rationale: Gradle 9.9.0 (2026-11-06) deprecated them, and the upgrade guide removes them in Gradle 10. They saturate pre-2026 build files, run cleanly on 9.x, and surface only in the deprecation summary.
- Verification: block GRADLE-TOOL-09 over build scripts and `build-logic` or `buildSrc` Kotlin sources, then `git diff`. A hit this change adds is the finding, and empty output is the pass. Red/green measured 2026-11-27 on a planted file: six planted calls printed, and `variant.name` and `constant.x` did not, under GNU grep and busybox grep. Application `.kt` and `.java` sources are deliberately out of scope, because an application may use the Ant library legitimately.
- Severity: SHOULD.
- Sources: https://docs.gradle.org/9.9.2/userguide/upgrading_version_9.html, https://blog.gradle.org/side-quest-removing-ant (2026-10-29), https://docs.gradle.org/9.9.0/release-notes.html.

## Confirmed unchanged

- Foojay resolver: 1.0.0 (2025-05-19) is still the latest version, and it still has no early-access support on record. Unreleased configuration-cache work landed on main on 2026-11-26 and 2026-11-27.
- Wrapper task: still `bin` and `all` only. It still writes `networkTimeout` and `validateDistributionUrl`.
- jpackage: the per-platform build sentence and the absence of notarization are unchanged on the JDK 27 page.
- The configuration cache is still off by default on 9.9.2. Isolated Projects is still incubating, and two of its four constraint categories are still not fully enforced. The `unsafe.isolated-projects` key is still deprecated with no removal version.
- The archive defaults (GRADLE-CACHE-17) are unchanged in 9.8 and 9.9. All five `validatePlugins` problem IDs still exist under the same names.
- Issues #15383, #847, #18520, #2298, #2534, #8400 and #2270 are still open.
- `buildSrc` has no deprecation through 9.9.2. `Project.getProperties()` and `Project.container(...)` are still scheduled for removal in Gradle 10. `JavaToolchainResolver` is still incubating, and `JavaToolchainDownload` still carries no checksum.
- DAGP: the latest release is 3.20.4 (2026-11-16), and there is no 4.x. `buildHealth`, `projectHealth`, `severity("fail")` and `fixDependencies --upgrade` are unchanged.
- Gradle still ships no dynamic-version ban. The locking and verification sentences quoted by GRADLE-DEP-12 to -16 are still verbatim on the 9.9.2 pages.
- The Jackson lookalike wording in GRADLE-DEP-11 and agent item 10 is unchanged: no Central policy change was found.
- `setup-gradle` still validates the wrapper automatically, still writes the cache only from the default branch, and still stops daemons in its post step. The current major is v6, at v6.4.1.
- The Develocity DSL (`publishing.onlyIf { it.authenticated }`, `uploadInBackground`, `obfuscation`, and `publishAlways()` as the removed spelling) is unchanged on plugin 4.6.1.
- Central: the Portal still documents no OIDC path. Sigstore is still optional, and PGP is still mandatory. The `.md5`, `.sha1` and `.asc` requirements, the POM elements and the sources and javadoc jars are unchanged. The deployment states and the OSSRH end of life on 2025-06-30 are unchanged. The Staging API has no announced end date.
- Shadow: the latest release is still 9.6.1, with floors of Gradle 9.2.0 and Java 17. The plugin id is unchanged. The default duplicate strategy is still `EXCLUDE`. `addShadowVariantIntoJavaComponent` is still enabled by default. The `shadow` configuration still maps to `RUNTIME`-scope POM entries plus the manifest `Class-Path`, and #324 is closed as intended behaviour.
- Spring Boot: the `jarmode=tools ... extract` command and the default layer order are unchanged on 4.2.0. Maven Shade is still at 3.6.2, and `createDependencyReducedPom` still defaults to `true`.
- Plugin publishing: the floors of 8.11, 7.0 and KGP 2.0.0 are not contradicted. `--validate-only` and the `GRADLE_PUBLISH_KEY` and `GRADLE_PUBLISH_SECRET` names are unchanged. The Kotlin `-Xjsr305` default is `warn`, and the `-Xjspecify-annotations` default is `strict`.

## Open questions

1. Is the GRADLE-CACHE-08 fallback scoped to the task or to the whole cache entry? The #24040 text says "the configuration cache", and the edit takes no position beyond that. Check it against the 9.9.2 configuration-cache docs or a TestKit run.
2. GRADLE-DIST-03 is still measured against plugin-publish 2.1.0. Re-measure it on 2.2.1 before restamping. The 2.2.0 artifact rename makes a 2.2.0 pin worth checking for, though no row is added for it now.
3. Does SLSA v1.2 (now Approved) change the Build L2 wording that GRADLE-PUB-18 cites as v1.1? This was not checked.
4. Central publishing limits and Publisher Pro took effect on 2026-10-01. A release over the monthly limit is rejected after a 30-day grace period, but nothing in a build file or workflow can check that. Decide whether a sentence belongs in the publishing runbook prose or in the `jvm-release` skill. No rule was added.
5. GitHub blocks `pull_request_target` by default in public repositories from 2026-12-02. The date has already slipped once, and the rule is not specific to Gradle. Re-check at the next refresh and decide whether GRADLE-CI-10 should name it.
6. Gradle 9.9.0 deprecated four `org.gradle.configuration-cache.*unsafe*` opt-out properties, removed in Gradle 11. Gradle 9.8.0 deprecated implicit parallel model building, an error in Gradle 10. From 9.9.0, `Sync` always deletes the whole destination. Each is a candidate CONSIDER row if a reviewed build is found using one.
7. The nmcp `publishingType = "AUTOMATIC"` spelling was not re-verified in the current README.
8. Is the JDK 27 GA date (2026-09-15) from a primary source? The openjdk.org page returned 403, and the pair does not quote that date.
9. Gradle published its own `gradle/gradle-skills` on 2026-09-30, and they overlap this pair. Decide whether the reference skill's description should say this pair's IDs take precedence.
10. Foojay 1.0.1 or 1.1.0 may ship with configuration-cache declarations. Re-check before the next refresh.

## Revision log

- `rules/gradle-build.md`: the GRADLE-CACHE-08 summary drops "for a task". The gate stamp moves to 9.9.2 and 2026-11-27. Non-negotiables 15 and 16 and the bazel sibling note are restamped.
- GRADLE-TOOL-01: the JVM range is 17 to 27, and the cross-check adds 27 on 9.8.0. The measurement rows and agent item 3 follow.
- GRADLE-TOOL-03: the example uses `$VERSION`, and the sum is passed on every bump because of 9.9.0's property preservation.
- GRADLE-TOOL-08: new. It sets the wrapper security floor at 9.9.2 on 9.x and 8.14.8 on 8.x.
- GRADLE-TOOL-09: new. It bans new Ant, `zipTo` and `unzipTo` in build logic.
- JAVA-PLAT-13: the #2270 stamp moves to 2026-11-27.
- GRADLE-CACHE-02: gains the 9.8.0 deprecation of configuration-time process starts.
- GRADLE-CACHE-04: the #18520 stamp moves.
- GRADLE-CACHE-08: #24040 is closed, and the fallback is the intended 9.0.0 behaviour. The Scope bullets cite the 2026-08-19 blog for Gradle 11.
- Isolated Projects stamp: re-verified on 9.9.2.
- GRADLE-DEP-01 to -04 section: the DAGP stamp moves to 3.20.4 and 2026-11-27.
- GRADLE-DEP-15: the canonical `securing_dependencies.html` URL.
- GRADLE-DEP-17: the grep is SHA-aware, and the `validate-wrappers: false` opt-out is named.
- GRADLE-DEP-18: the Sonatype figure matches the page.
- GRADLE-CI-02: the cache-key description matches setup-gradle.md.
- GRADLE-CI-11: `download-and-submit` needs v6.4.1 or later (GHSA-chpw-2mqm-95cc), with a new block (2 of 2).
- GRADLE-PUB-08: the fallback wording and its stamp.
- GRADLE-PUB-14: vanniktech 0.36.0 needs `DeploymentValidation.PUBLISHED`, and the gate grep follows.
- GRADLE-PUB-17: restamped.
- GRADLE-PUB-18: `actions/attest` is preferred, and the grep matches both names.
- Agent item 7 in `publishing.md`: the OIDC re-read on 2026-11-27.
- GRADLE-DIST-09: #1489 is closed as not planned. The maintainer recipe is recorded, `mergeServiceFiles("META-INF/spring")` is corrected, and gate grep 1 gains `PropertiesFileTransformer`.
- GRADLE-DIST-10: the R8 clause.
- GRADLE-DIST-12, -13, -16, -17, the jpackage paragraph and agent item 6 in `distribution.md`: restamped.
- GRADLE-PLUG-17 and agent item 10 in `plugin-authoring.md`: `isolatedProjects` is declarable, and a declared feature cannot be dropped.
- GRADLE-PLUG-06, -22, -27: restamped to 9.9.2.
- GRADLE-STRUCT-01, -10 and the #15383 paragraph: restamped.
- Feeding consolidations (not edited here): `.agents/research/jvm-gradle-core.md` and `.agents/research/jvm-topic-map.md` still carry #24040 as open, the 9.0.0 release-notes citation and the 9.7.1 current line. `.agents/research/jvm-platform-and-toolchains.md` still says 17 to 26. `.agents/research/jvm-distribution.md` still has #1489 as open. `.agents/research/jvm-publishing.md` still has `attest-build-provenance` and the pre-0.36.0 vanniktech wait. `.agents/research/jvm-dependencies.md` still has the 7-percent figure and the `setup-gradle@v[4-9]` grep. `.agents/research/jvm-gradle-plugin-dev.md` still has `configurationCache` as the only feature. `.agents/research/jvm-gradle-settings.md` still has the 9.7.1 buildSrc stamp.
- Spillover round, GRADLE-PUB-01: the namespace proofs are DNS TXT with the Verification Key, a temporary public repository for a code-hosting namespace, or automatic verification of `io.github.<user>` for a GitHub sign-up. "There is no third path" and "which of the two methods" are gone.
- Spillover round, GRADLE-STRUCT-12: the rationale names the read side of the build cache, KGP before 2.4.20 (GHSA-r937-wjx7-w2jp), and defers the floor to `KT-COMP-14`.
- Spillover round, GRADLE-DIST-21: new. It sets the Shadow floor at 9.6.0 for GHSA-rr8v-fxxf-c986, with its own block. The distribution row count moves to twenty, fifteen of them MUST.

## Edit list

All paths are relative to the repository root. Apply each entry exactly. Every find string is unique in its file.

1. File: `rules/gradle-build.md`
   Find:
   ```
   disables it for a task and carries on rather than failing (`GRADLE-CACHE-08`).
   ```
   Replace with:
   ```
   disables it and carries on rather than failing (`GRADLE-CACHE-08`).
   ```

2. File: `rules/gradle-build.md`
   Find:
   ```
   last, so the common case never reaches the slow ones. Gradle 9.x, verified
   2026-09-12.
   ```
   Replace with:
   ```
   last, so the common case never reaches the slow ones. Gradle 9.x, current
   9.9.2, verified 2026-11-27.
   ```

3. File: `rules/gradle-build.md`
   Find:
   ```
   is the dead pre-2023 coordinate (verified 2026-09-12).
   ```
   Replace with:
   ```
   is the dead pre-2023 coordinate (verified 2026-11-27).
   ```

4. File: `rules/gradle-build.md`
   Find:
   ```
   because OSSRH ended 2025-06-30 (verified 2026-09-12).
   ```
   Replace with:
   ```
   because OSSRH ended 2025-06-30 (verified 2026-11-27).
   ```

5. File: `rules/gradle-build.md`
   Find:
   ```
   bundle was unresolved as of
     2026-09-12; the hand-off-to-Gradle path
   ```
   Replace with:
   ```
   bundle was unresolved as of
     2026-11-27 (rules_jvm_external 7.2); the hand-off-to-Gradle path
   ```

6. File: `skills/gradle-build-reference/caching-and-correctness.md`
   Find:
   ```
   - **Measured against Gradle 9.0.0 through 9.7.1, verified 2026-09-12.** Corpus
   ```
   Replace with:
   ```
   - **Measured against Gradle 9.0.0 through 9.7.1, verified 2026-09-12, and
     re-checked against the 9.8.0 to 9.9.2 release notes on 2026-11-27.** Corpus
   ```

7. File: `skills/gradle-build-reference/caching-and-correctness.md`
   Find:
   ```
     Gradle 10 to Gradle 11 (verified 2026-09-12 against the 9.0.0 release notes).
   ```
   Replace with:
   ```
     Gradle 10 to Gradle 11 (Gradle blog,
     [2026-08-19](https://blog.gradle.org/gradle-is-going-agentic), re-read
     2026-11-27). The 9.9.2 user manual still says Gradle 10; the blog is the
     newer source.
   ```

8. File: `skills/gradle-build-reference/caching-and-correctness.md`
   Find:
   ```
     Gradle's documented requirements plus live trackers
     ([#18520](https://github.com/gradle/gradle/issues/18520),
     [#24040](https://github.com/gradle/gradle/issues/24040)), not on counted
   ```
   Replace with:
   ```
     Gradle's documented requirements plus two trackers
     ([#18520](https://github.com/gradle/gradle/issues/18520), open, and
     [#24040](https://github.com/gradle/gradle/issues/24040), closed in 9.0.0 RC1
     by graceful degradation), not on counted
   ```

9. File: `skills/gradle-build-reference/caching-and-correctness.md`
   Find:
   ```
   It stays legal ([#2298](https://github.com/gradle/gradle/issues/2298) is open), so no tool fails it for you. |
   ```
   Replace with:
   ```
   It stays legal ([#2298](https://github.com/gradle/gradle/issues/2298) is open), so no tool fails it for you. Gradle 9.8.0 (2026-09-24) deprecates starting a process at configuration time, with the cache on or off, and Gradle 11 makes it an error, but until then it surfaces only in the deprecation summary. |
   ```

10. File: `skills/gradle-build-reference/caching-and-correctness.md`
    Find:
    ```
    ([#18520](https://github.com/gradle/gradle/issues/18520), open as of 2026-09-12)
    ```
    Replace with:
    ```
    ([#18520](https://github.com/gradle/gradle/issues/18520), open as of 2026-11-27)
    ```

11. File: `skills/gradle-build-reference/caching-and-correctness.md`
    Find:
    ```
    Gradle 9 silently disables the cache for a task rather than failing, in several documented cases. The named one is a `maven-publish` repository with an explicit `credentials {}` block ([#24040](https://github.com/gradle/gradle/issues/24040)). |
    ```
    Replace with:
    ```
    Gradle 9 silently disables the configuration cache rather than failing, in several documented cases. The named one is a `maven-publish` repository with an explicit `credentials {}` block, which [#24040](https://github.com/gradle/gradle/issues/24040) turned from a failure into this silent fallback in 9.0.0 RC1 ([PR 33830](https://github.com/gradle/gradle/pull/33830)). The issue is closed, and the fallback is the fix, not a bug awaiting one. |
    ```

12. File: `skills/gradle-build-reference/caching-and-correctness.md`
    Find:
    ```
    Incubating since Gradle 9.7.0 (2026-08-06, verified 2026-09-12). Two of its four
    ```
    Replace with:
    ```
    Incubating since Gradle 9.7.0 (2026-08-06, re-verified on 9.9.2, 2026-11-27). Two of its four
    ```

13. File: `skills/gradle-build-reference/dependencies.md`
    Find:
    ```
    `com.autonomousapps.dependency-analysis` plugin (DAGP 3.x, verified 2026-09-12),
    ```
    Replace with:
    ```
    `com.autonomousapps.dependency-analysis` plugin (DAGP 3.x, latest 3.20.4, verified 2026-11-27),
    ```

14. File: `skills/gradle-build-reference/dependencies.md`
    Find:
    ```
    ([dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html))
    ```
    Replace with:
    ```
    ([securing_dependencies.html](https://docs.gradle.org/current/userguide/securing_dependencies.html#verifying-dependencies))
    ```

15. File: `skills/gradle-build-reference/dependencies.md`
    Find:
    ```
    unless `gradle/actions/setup-gradle@v4` or later is already in the workflow, which validates automatically. |
    ```
    Replace with:
    ```
    unless `gradle/actions/setup-gradle` v4 or later is already in the workflow without `validate-wrappers: false`, which validates automatically. |
    ```

16. File: `skills/gradle-build-reference/dependencies.md`
    Find:
    ```
    see block GRADLE-DEP-17 Either hit is the pass. Empty output while `gradle/wrapper/gradle-wrapper.jar` is tracked is the finding. |
    ```
    Replace with:
    ```
    see block GRADLE-DEP-17. A `wrapper-validation` hit is the pass, and so is a `setup-gradle@` hit whose tag, or whose trailing version comment on a SHA pin (`GRADLE-CI-09`), names v4 or later. A `validate-wrappers: false` hit in a job with no `wrapper-validation` step is the finding. Empty output while `gradle/wrapper/gradle-wrapper.jar` is tracked is the finding. |
    ```

17. File: `skills/gradle-build-reference/dependencies.md`
    Find:
    ```
      xargs -0 -r grep -H -n -E -e 'wrapper-validation' -e 'setup-gradle@v[4-9]' --
    ```
    Replace with:
    ```
      xargs -0 -r grep -H -n -E -e 'wrapper-validation' -e 'setup-gradle@' -e 'validate-wrappers' --
    ```

18. File: `skills/gradle-build-reference/dependencies.md`
    Find:
    ```
    found non-existent versions recommended at rates from about 7 percent for 2026 frontier models to over 25 percent for older ones
    ```
    Replace with:
    ```
    found non-existent versions recommended at rates from about 6 percent for the best ungrounded models to roughly one in four for earlier ones (page read 2026-11-27)
    ```

19. File: `skills/gradle-build-reference/ci.md`
    Find:
    ```
    The setup action keys on the wrapper, the catalog and the build files together and prunes what it stores. |
    ```
    Replace with:
    ```
    The setup action builds its own key from the runner OS, the job, a hash of the matrix and workflow name, and the commit SHA, and prunes what it stores after a successful job (`cache-cleanup` defaults to `on-success`). |
    ```

20. File: `skills/gradle-build-reference/ci.md`
    Find:
    ```
    runs `gradle/actions/dependency-submission` in its own job on the default branch, not on `pull_request`. |
    ```
    Replace with:
    ```
    runs `gradle/actions/dependency-submission` in its own job on the default branch, not on `pull_request`. Where a fork pull request's graph is submitted through the two-workflow `download-and-submit` pattern, pin `gradle/actions` v6.4.1 or later. |
    ```

21. File: `skills/gradle-build-reference/ci.md`
    Find:
    ```
    Submission needs write access to the graph, which a fork's pull request never has. |
    ```
    Replace with:
    ```
    Submission needs write access to the graph, which a fork's pull request never has. Up to v6.4.0 the `download-and-submit` mode let a crafted graph artifact from a fork obtain the submitting workflow's `GITHUB_TOKEN`, with whatever write scopes it held (GHSA-chpw-2mqm-95cc, fixed in v6.4.1 on 2026-10-28). Generating and submitting in one job was not affected. |
    ```

22. File: `skills/gradle-build-reference/ci.md`
    Find:
    ```
    see block GRADLE-CI-11. Empty output beside a `.github/dependabot.yml` that names the `gradle` ecosystem is the finding. Confirm the companion with `grep -n -e 'gradle' .github/dependabot.yml`. |
    ```
    Replace with:
    ```
    see block GRADLE-CI-11 (1 of 2). Empty output beside a `.github/dependabot.yml` that names the `gradle` ecosystem is the finding. Confirm the companion with `grep -n -e 'gradle' .github/dependabot.yml`. Then see block GRADLE-CI-11 (2 of 2): a hit in a workflow whose `gradle/actions` pin, read from its tag or trailing version comment, is below v6.4.1 is the finding, and empty output is the pass. |
    ```

23. File: `skills/gradle-build-reference/ci.md`
    Find:
    ```
    # GRADLE-CI-11
    git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**/*.yml' \
      ':(glob).github/workflows/**/*.yaml' |
      xargs -0 -r grep -l -e 'dependency-submission' --
    ```
    Replace with:
    ```
    # GRADLE-CI-11 (1 of 2)
    git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**/*.yml' \
      ':(glob).github/workflows/**/*.yaml' |
      xargs -0 -r grep -l -e 'dependency-submission' --
    # GRADLE-CI-11 (2 of 2)
    git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**/*.yml' \
      ':(glob).github/workflows/**/*.yaml' |
      xargs -0 -r grep -H -n -e 'download-and-submit' --
    ```

24. File: `skills/gradle-build-reference/publishing.md`
    Find:
    ```
    verified 2026-09-12): the build now *silently disables* the configuration cache for that task, so the publish task quietly stops being cached and nothing says so.
    ```
    Replace with:
    ```
    verified 2026-11-27): the build now *silently disables* the configuration cache, so the publish run quietly stops being cached and nothing says so.
    ```

25. File: `skills/gradle-build-reference/publishing.md`
    Find:
    ```
    The shipped spellings are `publishToMavenCentral(automaticRelease = true)` for vanniktech and `publishingType = "AUTOMATIC"` for nmcp.
    ```
    Replace with:
    ```
    The shipped spellings are `publishToMavenCentral(automaticRelease = true)` for vanniktech, plus `validateDeployment = DeploymentValidation.PUBLISHED` from vanniktech 0.36.0 on, and `publishingType = "AUTOMATIC"` for nmcp.
    ```

26. File: `skills/gradle-build-reference/publishing.md`
    Find:
    ```
    reporting success at a state that still needs a human click and can still fail asynchronously with no CI signal.
    ```
    Replace with:
    ```
    reporting success at a state that still needs a human click and can still fail asynchronously with no CI signal. vanniktech 0.36.0 (2026-01-13) made its own wait stop at `VALIDATED` by default, so `automaticRelease = true` alone no longer waits for `PUBLISHED`.
    ```

27. File: `skills/gradle-build-reference/publishing.md`
    Find:
    ```
    | The gate grep. A release job with none of the three keys sits at the weakest state,
    ```
    Replace with:
    ```
    | The gate grep. A vanniktech build on 0.36.0 or later with `automaticRelease = true` and no `DeploymentValidation.PUBLISHED` exits at `VALIDATED`, which is the finding. A release job with none of the three keys sits at the weakest state,
    ```

28. File: `skills/gradle-build-reference/publishing.md`
    Find:
    ```
    xargs -0 -r grep -H -n -e 'waitUntil' -e 'automaticRelease' -e 'publishingType' --`
    ```
    Replace with:
    ```
    xargs -0 -r grep -H -n -e 'waitUntil' -e 'automaticRelease' -e 'publishingType' -e 'DeploymentValidation' --`
    ```

29. File: `skills/gradle-build-reference/publishing.md`
    Find:
    ```
    The Portal has validated Sigstore bundles since 2025-01-28, verified 2026-09-12,
    ```
    Replace with:
    ```
    The Portal has validated Sigstore bundles since 2025-01-28, verified 2026-11-27,
    ```

30. File: `skills/gradle-build-reference/publishing.md`
    Find:
    ```
    | GRADLE-PUB-18 | Add `actions/attest-build-provenance` to the release workflow to reach SLSA v1.1 Build L2,
    ```
    Replace with:
    ```
    | GRADLE-PUB-18 | Add `actions/attest` to the release workflow (`actions/attest-build-provenance` v4 and later wraps it, and stays accepted in existing workflows) to reach SLSA v1.1 Build L2,
    ```

31. File: `skills/gradle-build-reference/publishing.md`
    Find:
    ```
      xargs -0 -r grep -H -n -e 'attest-build-provenance' --
    ```
    Replace with:
    ```
      xargs -0 -r grep -H -n -e 'actions/attest' --
    ```

32. File: `skills/gradle-build-reference/publishing.md`
    Find:
    ```
       OIDC path when all four were read on 2026-09-12. A Portal token in CI secrets
    ```
    Replace with:
    ```
       OIDC path when all four were read on 2026-09-12, and the first three still
       described none on 2026-11-27. A Portal token in CI secrets
    ```

33. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
    xargs -0 -r grep -H -n -e 'spring.factories' -e 'AppendingTransformer' -e 'PropertiesTransformer' --`
    ```
    Replace with:
    ```
    xargs -0 -r grep -H -n -e 'spring.factories' -e 'AppendingTransformer' -e 'PropertiesTransformer' -e 'PropertiesFileTransformer' --`
    ```

34. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
    current line 9.6.1 (2026-07-22, verified 2026-09-12).
    ```
    Replace with:
    ```
    current line 9.6.1 (2026-07-22, verified 2026-11-27).
    ```

35. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
    It strips the provider class even when `mergeServiceFiles()` correctly merged the provider list.
    ```
    Replace with:
    ```
    It strips the provider class even when `mergeServiceFiles()` correctly merged the provider list. Shadow's optional R8 mode is the one minimizer that keeps the providers named in `META-INF/services`; the default analyzer does not.
    ```

36. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
    Shadow ships no transformer for them, so either write a key-aware one or do not shade those modules together. `META-INF/spring/*.imports` is a line list and is correct under `mergeServiceFiles()`. |
    ```
    Replace with:
    ```
    Shadow ships no Spring-specific transformer, so configure `PropertiesFileTransformer` to comma-join duplicate keys, write a key-aware transformer, or do not shade those modules together. `META-INF/spring/*.imports` is a line list and is correct under `mergeServiceFiles("META-INF/spring")`; the no-argument form merges only `META-INF/services`. |
    ```

37. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
    GradleUp/shadow#1489 is still open, verified 2026-09-12.
    ```
    Replace with:
    ```
    GradleUp/shadow#1489 was closed as not planned on 2026-10-25, so no Spring transformer is coming. The maintainer's stated path is `PropertiesFileTransformer` plus `mergeServiceFiles("META-INF/spring")`, with a custom `ResourceTransformer` where relocated class names appear inside those files.
    ```

38. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
    Maven Shade 3.6.2 keeps `createDependencyReducedPom` at `true` by default, verified 2026-09-12.
    ```
    Replace with:
    ```
    Maven Shade 3.6.2 keeps `createDependencyReducedPom` at `true` by default, verified 2026-11-27.
    ```

39. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
    build machine (JDK 25 tool specification, verified 2026-09-12).
    ```
    Replace with:
    ```
    build machine (JDK 25 and JDK 27 tool specifications, verified 2026-11-27).
    ```

40. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
    with no code changes (Spring Boot 4.x, verified 2026-09-12).
    ```
    Replace with:
    ```
    with no code changes (Spring Boot 4.0 to 4.2, verified 2026-11-27).
    ```

41. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
    defeats the only reason the feature exists (Spring Boot 4.x, verified 2026-09-12).
    ```
    Replace with:
    ```
    defeats the only reason the feature exists (Spring Boot 4.0 to 4.2, verified 2026-11-27).
    ```

42. File: `skills/gradle-build-reference/distribution.md`
    Find:
    ```
       class with "Spring" in the name when it was read on 2026-09-12.
    ```
    Replace with:
    ```
       class with "Spring" in the name when it was read on 2026-09-12, and none is
       planned since GradleUp/shadow#1489 closed as not planned on 2026-10-25.
    ```

43. File: `skills/gradle-build-reference/plugin-authoring.md`
    Find:
    ```
    (deprecated list read 2026-09-12)
    ```
    Replace with:
    ```
    (deprecated list re-read on 9.9.2, 2026-11-27)
    ```

44. File: `skills/gradle-build-reference/plugin-authoring.md`
    Find:
    ```
    (incubating since Gradle 7.6, unchanged through 9.7)
    ```
    Replace with:
    ```
    (incubating since Gradle 7.6, unchanged through 9.9.2)
    ```

45. File: `skills/gradle-build-reference/plugin-authoring.md`
    Find:
    ```
    Two of IP's four constraint categories are not fully enforced as of 9.7.0,
    ```
    Replace with:
    ```
    Two of IP's four constraint categories are not fully enforced as of 9.9.2,
    ```

46. File: `skills/gradle-build-reference/plugin-authoring.md`
    Find:
    ```
    plus `compatibility { features { configurationCache = ... } }`. |
    ```
    Replace with:
    ```
    plus `compatibility { features { configurationCache = ... } }`. Declare `isolatedProjects = true` there only after the `GRADLE-PLUG-27` diagnostics run is clean, and never drop a feature an earlier version declared. |
    ```

47. File: `skills/gradle-build-reference/plugin-authoring.md`
    Find:
    ```
    As of 2026-09-12 `configurationCache` is the only declarable feature. |
    ```
    Replace with:
    ```
    As of 2026-11-27 the Portal still only warns, and the declarable features are `configurationCache` and, from plugin-publish 2.2.1 (2026-09-10), `isolatedProjects`. A feature declared in one version must stay declared in every later one, or the publish fails. |
    ```

48. File: `skills/gradle-build-reference/plugin-authoring.md`
    Find:
    ```
    then read every `create(...)` or `register(...)` entry and confirm all seven fields are non-empty. |
    ```
    Replace with:
    ```
    then read every `create(...)` or `register(...)` entry and confirm all seven fields are non-empty. Then diff the `compatibility` block against the last released tag: a feature line the branch removed is the finding. |
    ```

49. File: `skills/gradle-build-reference/plugin-authoring.md`
    Find:
    ```
        plugin-publish 2.1.0 is newer than most training data, and
        `configurationCache` is still the only declarable feature (GRADLE-PLUG-17).
    ```
    Replace with:
    ```
        plugin-publish 2.1.0 is newer than most training data, and the only
        declarable features are `configurationCache` and `isolatedProjects`
        (GRADLE-PLUG-17).
    ```

50. File: `skills/gradle-build-reference/structure-and-conventions.md`
    Find:
    ```
    Gradle has announced no deprecation as of 9.7.1 (verified 2026-09-12).
    ```
    Replace with:
    ```
    Gradle has announced no deprecation as of 9.9.2 (verified 2026-11-27).
    ```

51. File: `skills/gradle-build-reference/structure-and-conventions.md`
    Find:
    ```
    has been open since 2020-12-01 and is still open as of 2026-09-12.
    ```
    Replace with:
    ```
    has been open since 2020-12-01 and is still open as of 2026-11-27.
    ```

52. File: `skills/gradle-build-reference/structure-and-conventions.md`
    Find:
    ```
    still unfixed through 9.x as of 2026-09-12)
    ```
    Replace with:
    ```
    still unfixed through 9.x as of 2026-11-27)
    ```

53. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Find:
    ```
    The current line requires a JVM between 17 and 26, and states that JVM 27 and later are not yet supported.
    ```
    Replace with:
    ```
    The current line requires a JVM between 17 and 27, with 27 accepted from Gradle 9.8.0 (2026-09-24), and states that JVM 28 and later are not yet supported (verified 2026-11-27).
    ```

54. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Find:
    ```
    JDK 26 in Gradle 9.4.0. A toolchain newer
    ```
    Replace with:
    ```
    JDK 26 in Gradle 9.4.0, JDK 27 in Gradle 9.8.0 (2026-09-24, verified 2026-11-27). A toolchain newer
    ```

55. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Find:
    ```
    the JVM that runs Gradle (17 to 26 on the 9.x line)
    ```
    Replace with:
    ```
    the JVM that runs Gradle (17 up to the newest JVM the wrapper's Gradle lists, 27 from 9.8.0)
    ```

56. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Find:
    ```
    because 25 needs Gradle 9.1.0 or later and 26 needs 9.4.0 or later (verified 2026-09-12).
    ```
    Replace with:
    ```
    because 25 needs Gradle 9.1.0 or later, 26 needs 9.4.0 or later and 27 needs 9.8.0 or later (verified 2026-11-27).
    ```

57. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Find:
    ```
    open at milestone 10.0.0-RC1 as of 2026-09-12)
    ```
    Replace with:
    ```
    open at milestone 10.0.0-RC1 as of 2026-11-27, with no Gradle 10 release candidate yet)
    ```

58. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Find:
    ```
    of it, and change nothing in it by hand. Both rows below are one file read.
    ```
    Replace with:
    ```
    of it, and change nothing in it by hand. All three rows below are one file read.
    ```

59. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Find:
    ```
    To write both lines together: `./gradlew wrapper --gradle-version 9.7.1 --gradle-distribution-sha256-sum "$SUM"`. | MUST |
    ```
    Replace with:
    ```
    To write both lines together: `./gradlew wrapper --gradle-version "$VERSION" --gradle-distribution-sha256-sum "$SUM"`, with `$VERSION` observed on the release list and never from memory. Pass the sum on every version change: from Gradle 9.9.0 the task keeps existing property values, so a bump without it leaves the old sum beside the new URL. | MUST |
    ```

60. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Anchor (insert a new table row on the line after it):
    ```
    and so is any diff that changes the URL without changing the checksum in the same hunk. | SHOULD |
    ```
    Insert after:
    ```
    | GRADLE-TOOL-08 | Point `distributionUrl` at a Gradle release that carries every published security fix for its line: on 2026-11-27 that is 9.9.2 or later on 9.x, or 8.14.8 or later on 8.x. Read Gradle's security advisory index before any wrapper bump, because the next advisory moves this floor, and never take the version from memory (`GRADLE-DEP-18`). | Four advisories published between 2026-10-07 and 2026-11-19 break the integrity of ordinary dependency resolution below that floor, and none of them shows in a green build. GHSA-3cfg-jpcr-gfp3 (Critical, fixed in 9.9.1 and 8.14.7) ran version-catalog values as code when the catalog loaded, before any build script and during IDE sync. GHSA-7f7r-77ff-fr6f (fixed in 9.9.2 and 8.14.8) let changing modules reached transitively, `-SNAPSHOT` included, skip dependency verification, so `GRADLE-DEP-15` and `GRADLE-DEP-16` never covered a transitive snapshot. GHSA-j5m7-59rp-24f5 (fixed in 9.8.1 and 8.14.6) let a later repository answer after an SSL failure on an earlier one, and GHSA-4mf6-7pm2-6wm8 (fixed in 9.9.2) ignored `known_hosts` for `sftp://` repositories. After the bump, a build that resolves snapshots fails until they are listed in `verification-metadata.xml`: rerun the bootstrap and never disable verification (`GRADLE-DEP-16`). | see block GRADLE-TOOL-04 and read the version in each `distributionUrl`. A version below 9.9.2 on the 9.x line, below 8.14.8 on the 8.x line, or on any older line is the finding. Empty output means no wrapper is committed, which `GRADLE-TOOL-04` already reports. Before trusting the floor named here, read https://github.com/gradle/gradle/security/advisories for anything published after 2026-11-27. | MUST *(repository commits `verification-metadata.xml`)* / SHOULD *(otherwise)* |
    ```

61. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Find:
    ```
    Both rows are grep-then-read. Neither count is a finding on its own, because both
    patterns have a legitimate occurrence that a count cannot distinguish.
    ```
    Replace with:
    ```
    Every row is grep-then-read. No count is a finding on its own, because each
    pattern has a legitimate occurrence that a count cannot distinguish.
    ```

62. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Anchor (insert a new table row on the line after it):
    ```
    a Groovy DSL build is not itself a defect. Empty output is the pass. | SHOULD |
    ```
    Insert after:
    ```
    | GRADLE-TOOL-09 | Write no new Ant integration or Kotlin DSL archive helper into build logic: no `ant.` call, no `Project.ant`, no `AntBuilder`, no `org.apache.tools.ant` import, and no `zipTo` or `unzipTo`. Use Gradle's `Copy`, `Sync`, `Delete`, `Zip` and `Exec` task types, or an injected `FileSystemOperations` or `ExecOperations`. | Gradle 9.9.0 (2026-11-06) deprecated all of them, and the 9.x upgrade guide lists them, together with the Ant classes a build script sees on its classpath without declaring them, as removed in Gradle 10. They saturate pre-2026 build files and answers, run cleanly on every 9.x release, and surface only in the end-of-build deprecation summary, so a generated line works until the Gradle 10 bump breaks it. | see block GRADLE-TOOL-09, then read `git diff` for which hits this change added. An added hit is the finding. A hit already on the base branch is migration work for its own change, not this change's finding. Empty output is the pass. | SHOULD |
    ```

63. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Anchor (the last line of the GRADLE-TOOL-07 block, before the closing fence):
    ```
      xargs -0 -r grep -H -n -e 'apply plugin:' --
    ```
    Insert after (before the closing fence):
    ```
    # GRADLE-TOOL-09
    git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.gradle' \
      ':(glob)**/*.gradle.kts' ':(glob)build-logic/**/*.kt' ':(glob)buildSrc/**/*.kt' |
      xargs -0 -r grep -H -n -E -e '(^|[^A-Za-z0-9_])ant\.' -e 'AntBuilder' \
        -e 'org\.apache\.tools\.ant' -e 'zipTo\(' -e 'unzipTo\(' --
    ```

64. File: `skills/gradle-build-reference/toolchains-and-compilation.md`
    Find:
    ```
       answers a daemon-version error by lowering the toolchain. Gradle 9.x needs a
       JVM between 17 and 26 to start, independent of what the project targets.
    ```
    Replace with:
    ```
       answers a daemon-version error by lowering the toolchain. Gradle 9.8.0 and
       later need a JVM between 17 and 27 to start, independent of what the
       project targets.
    ```

## Spillover round

Input: `.agents/research/refresh-2026-11/gradle-build/spillover-check.md`, ten items from `java-quality`, `kotlin-quality` and `maven-build`. Nine are confirmed by a primary source and one was already correct. Items 5a and 5b count as two.

### Verdict

- Three changes. GRADLE-PUB-01 is false today and changes in place. GRADLE-STRUCT-12 gains one rationale sentence. GRADLE-DIST-21 is new, at MUST.
- No rule-file change, so the rule bump stays where the first round put it. The new depth row is a minor bump for the reference skill, which the first round already took.
- The other seven items are declined. Each one is owned by a sibling set, is already true in the target, or was declined for the same reason by the first round and by `maven-build`.

### Changed rules

#### GRADLE-PUB-01 (`publishing.md`)

- Old (rule): "Prove a reverse-domain namespace with a DNS TXT record, or an `io.github.<user>` namespace with GitHub repository ownership."
- New: "Prove a reverse-domain namespace with a DNS TXT record carrying the Portal's Verification Key, or a code-hosting namespace (GitHub, GitLab, Gitee or Bitbucket, such as `io.github.<user>`) with a temporary public repository named with that key. An account that signs up through GitHub may get `io.github.<user>` verified automatically."
- Old (rationale): "There is no third path and no way to upload before verification completes." New: "There is no way to upload before verification completes."
- Old (verification): "which of the two methods was used". New: "which method was used". The verification stays a reading check, and the `401` or `403` signal is unchanged.
- The wording matches `MVN-PUB-04` in `maven-build` word for word, so the two ecosystems state the same Portal gate.
- Source: https://central.sonatype.org/register/namespace/ (read 2026-11-27; it names the DNS TXT record "with a value set to the Verification Key", the "temporary, public repository with a name having the value set to the Verification Key", and automatic verification for a namespace "that looks like" `io.github.<user>`).

#### GRADLE-STRUCT-12 (`structure-and-conventions.md`)

- Rationale gains, after "A poisoned entry pushed once is then read by every trusted build afterwards.": "The reading side is an attack surface too: Kotlin Gradle plugin releases before 2.4.20 deserialize build-cache metadata unsafely ([GHSA-r937-wjx7-w2jp](https://github.com/advisories/GHSA-r937-wjx7-w2jp), CVSS 6.7, verified 2026-11-27), and `KT-COMP-14` in `kotlin-quality` owns that 2.4.20 floor."
- The rule and its verification do not change. The KGP floor is checked by `KT-COMP-14`'s own block, which exists in `skills/kotlin-quality-reference/compiler-and-toolchain.md`.
- Source: https://github.com/advisories/GHSA-r937-wjx7-w2jp (CVE-2026-53914, published 2026-06-26, `kotlin-gradle-plugin` before 2.4.20, patched in 2.4.20-Beta1, CVSS 6.7 Moderate, CWE-502).

### New rules

#### GRADLE-DIST-21 (`distribution.md`, The Build File Before a Merge Feature)

- ID: the GRADLE-DIST family runs to 20. GRADLE-DIST-19 was the jpackage row in `.agents/research/jvm-distribution.md` and now lives as prose, so it is not reused. The first round added no DIST ID.
- Rule: Apply `com.gradleup.shadow` at 9.6.0 or later.
- Rationale: Shadow before 9.6.0 does not validate or sanitize ZIP entry names before writing them to the fat jar, and relies on Gradle's `ZipFileTree` alone for that. An entry name with `../` that reaches the jar escapes the target directory wherever a downstream tool extracts it without its own protection. The build stays green either way. The floor sits inside the 9.x line that GRADLE-DIST-12 already records, so no Gradle floor moves.
- Verification: block GRADLE-DIST-21, then read the version on each hit, following a catalog `version.ref` to its `[versions]` entry. A version below 9.6.0 is the finding. Where no hit carries a version, read the resolved one from `./gradlew <module>:buildEnvironment`. Empty output means no module applies Shadow, which is the pass. The `**/*.toml` glob reads a catalog by any filename, as GRADLE-DEP-08 requires.
- Red/green, measured 2026-11-27 under GNU grep and busybox grep on a planted tree: a `version "9.5.0"` plugin line, a root `version "9.6.1" apply false` line and a catalog `version.ref` line all printed. A tree whose only build file applies `java` printed nothing.
- Severity: MUST, the same as the other security floors in this refresh (GRADLE-TOOL-08 here and `KT-COMP-14` in `kotlin-quality`). The patched release is inside the line already in use.
- Not added to the rule file's non-negotiables. Row 15 covers the plugin id, and the depth row is enough for a version floor.
- Source: https://github.com/advisories/GHSA-rr8v-fxxf-c986 (re-read 2026-11-27: CVE-2026-75598, CVSS 8.1 High, CWE-22, affected below 9.6.0, patched 9.6.0, published by the maintainer 2026-07-16, NVD 2026-11-06, GitHub Advisory Database 2026-11-09), https://github.com/GradleUp/shadow/releases (9.6.0 on 2026-07-16, 9.6.1 on 2026-07-22).

### Declined

- Item 1, Error Prone 2.43.0 needs JDK 21 and 2.46.0 needs `-XDaddTypeAnnotationsToSymbol=true`: confirmed, but Error Prone is `java-quality`'s subject (JAVA-PLAT-02), and the target never mentions it. A cross-reference in GRADLE-TOOL-01 adds nothing a toolchain choice needs.
- Item 2, Checkstyle 13.0.0 targets Java 21: confirmed. The ownership is the same as item 1, and the target has no Checkstyle text.
- Item 3, the SpotBugs Gradle plugin's mapping table is stale at 6.5.6: the target says nothing about SpotBugs. The 4.10.5 default is also an inference, not a stated fact.
- Item 4, japicmp 0.4.6 and gradle-revapi 2.5.0: the target already defers the binary-compatibility gate to `java-quality` and `kotlin-quality`.
- Item 5b, JDK 28 `jlink --security-properties`: the source is a first-party blog, not a JDK specification. JDK 28 is not GA, and no target rule depends on security properties.
- Item 7, KSP 2.3.12 minimums and KT-85434 in Kotlin 2.5.0-Beta2: these are Kotlin-side rows owned by `kotlin-quality`. KT-85434 is a Beta note, not a release, and the target's JVM-17 sentence is already true.
- Item 9, Sonatype publisher tiers and limits from 2026-10-01: confirmed for the effective date and the Publisher Pro conditions, but the 30-day grace is secondary-only and was not confirmed. The first round declined the same row (open question 4), and `maven-build` declined it for this window. It is an account and policy matter with no build-file or workflow check, and a competent model does not misread a limit rejection as a POM defect. This settles open question 4: no sentence is added. The "30-day grace" in open question 4 stays unconfirmed.
- Item 10, configuration cache on by default in Gradle 10: the target is already correct. `caching-and-correctness.md` follows the 2026-08-19 Gradle blog (Gradle 11), so the item's "Gradle 10" wording is not applied.

### Sources (spillover round)

| Change | Old text | New text | Source |
|---|---|---|---|
| GRADLE-PUB-01 rule | DNS TXT or "GitHub repository ownership" | DNS TXT with the Verification Key, a temporary public repository for GitHub, GitLab, Gitee and Bitbucket namespaces, automatic `io.github.<user>` for GitHub sign-ups | https://central.sonatype.org/register/namespace/ (read 2026-11-27) |
| GRADLE-PUB-01 rationale | "There is no third path and no way to upload" | "There is no way to upload" | same |
| GRADLE-PUB-01 verification | "which of the two methods" | "which method" | same |
| GRADLE-STRUCT-12 rationale | (none) | KGP before 2.4.20 deserializes cache metadata unsafely, owned by `KT-COMP-14` | https://github.com/advisories/GHSA-r937-wjx7-w2jp |
| GRADLE-DIST-21 row and block | (none) | Shadow 9.6.0 or later | https://github.com/advisories/GHSA-rr8v-fxxf-c986, https://github.com/GradleUp/shadow/releases |
| `distribution.md` row count | "Nineteen rows, fourteen of them MUST." | "Twenty rows, fifteen of them MUST." | the table count after GRADLE-DIST-21 |

### Edit list (spillover round)

All paths are relative to the repository root. Apply each entry exactly. Every find string and anchor is unique in its file.

1. File: `skills/gradle-build-reference/publishing.md`
   Find:
   ```
   Prove a reverse-domain namespace with a DNS TXT record, or an `io.github.<user>` namespace with GitHub repository ownership. |
   ```
   Replace with:
   ```
   Prove a reverse-domain namespace with a DNS TXT record carrying the Portal's Verification Key, or a code-hosting namespace (GitHub, GitLab, Gitee or Bitbucket, such as `io.github.<user>`) with a temporary public repository named with that key. An account that signs up through GitHub may get `io.github.<user>` verified automatically. |
   ```

2. File: `skills/gradle-build-reference/publishing.md`
   Find:
   ```
   | There is no third path and no way to upload before verification completes.
   ```
   Replace with:
   ```
   | There is no way to upload before verification completes.
   ```

3. File: `skills/gradle-build-reference/publishing.md`
   Find:
   ```
   The runbook names which of the two methods was used and where the Portal token lives.
   ```
   Replace with:
   ```
   The runbook names which method was used and where the Portal token lives.
   ```

4. File: `skills/gradle-build-reference/structure-and-conventions.md`
   Find:
   ```
   A poisoned entry pushed once is then read by every trusted build afterwards.
   ```
   Replace with:
   ```
   A poisoned entry pushed once is then read by every trusted build afterwards. The reading side is an attack surface too: Kotlin Gradle plugin releases before 2.4.20 deserialize build-cache metadata unsafely ([GHSA-r937-wjx7-w2jp](https://github.com/advisories/GHSA-r937-wjx7-w2jp), CVSS 6.7, verified 2026-11-27), and `KT-COMP-14` in `kotlin-quality` owns that 2.4.20 floor.
   ```

5. File: `skills/gradle-build-reference/distribution.md`
   Anchor (insert a new table row on the line after it; this is the end of the GRADLE-DIST-12 row):
   ```
   Gate grep 4 must print nothing outside a deliberately pinned legacy build, and empty output is the pass. | MUST |
   ```
   Insert after:
   ```
   | GRADLE-DIST-21 | Apply `com.gradleup.shadow` at 9.6.0 or later. | Shadow before 9.6.0 does not validate or sanitize ZIP entry names before writing them to the fat jar, and relies on Gradle's `ZipFileTree` alone for that, so an entry name with `../` that reaches the jar escapes the target directory wherever a downstream tool extracts it without its own protection ([GHSA-rr8v-fxxf-c986](https://github.com/advisories/GHSA-rr8v-fxxf-c986), CVE-2026-75598, CVSS 8.1 High, fixed in 9.6.0 on 2026-07-16, verified 2026-11-27). The build stays green either way. The floor sits inside the 9.x line `GRADLE-DIST-12` already records, so no Gradle floor moves. | see block GRADLE-DIST-21 and read the version on each hit, following a catalog `version.ref` to its `[versions]` entry. A version below 9.6.0 is the finding. Where no hit carries a version, read the resolved one from `./gradlew <module>:buildEnvironment`. Empty output means no module applies Shadow, which is the pass. | MUST |
   ```

6. File: `skills/gradle-build-reference/distribution.md`
   Anchor (the end of the GRADLE-DIST-11 row, the last row of the same table):
   ```
   Note the trap: a `<relocation>` element inside `<distributionManagement>` is an artifact-move notice, not package relocation. | SHOULD |
   ```
   Insert after (one blank line, then the block, so a blank line still precedes `## The Published POM`):
   ````

   ```sh
   # GRADLE-DIST-21
   git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.gradle.kts' \
     ':(glob)**/*.gradle' ':(glob)**/*.toml' |
     xargs -0 -r grep -H -n -e 'com.gradleup.shadow' --
   ```
   ````

7. File: `skills/gradle-build-reference/distribution.md`
   Find:
   ```
   Nineteen rows, fourteen of them MUST.
   ```
   Replace with:
   ```
   Twenty rows, fifteen of them MUST.
   ```

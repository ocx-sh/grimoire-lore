---
title: Apache Maven plugins, versions and behaviour delta
pair: maven-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 16
---

# Apache Maven plugins: delta 2026-09-12 to 2026-11-27

This is a delta update. Anything marked "unchanged" stays as written. Version facts come from Central `maven-metadata.xml` and the `Last-Modified` header of each release POM. Release-note content comes from GitHub release pages, which show day and month only; years are inferred from Central.

## Summary

- Surefire: GA `3.6.1` (Central `lastUpdated 20261026024848`, POM 2026-10-22; release page says 26 Oct). The text "3.6.0 GA (`lastUpdated 20260903221843`)" is stale. No milestone newer than GA exists.
- Enforcer: GA `3.7.0` (Central 2026-10-30), adds rule `banPropertyPrefix`. The "3.6.3 ... 37 built-in rules" text is stale.
- Compiler: `3.16.0` is GA and the docs show 3.16.0. It was released 2026-08-30 (POM `Last-Modified`), before the baseline, so the baseline pin was already behind. Newest milestone `4.0.0-beta-5` (2026-08-26). Nothing released in the window.
- Toolchains `3.3.0`, javadoc `3.12.0`, gpg `3.2.8`, source `3.4.0` / `4.0.0-beta-1`: no release in the window.
- Artifact plugin: `3.7.0`, POM dated 2026-09-11, one day before the baseline; Central `lastUpdated 20260915`.
- apache/maven#11605 is CLOSED, not merged, closed 2026-01-25. The baseline "open and unmerged as of 2026-09-12" was wrong on that date.
- `org.mvnsearch:toolchains-maven-plugin` stays at `4.5.0`, Central last touched 2023-04-09. Unchanged.

## Findings

### 1. Version table (current as of 2026-11-27)

| Plugin | Current GA | Newest milestone | Source |
|---|---|---|---|
| maven-surefire-plugin | 3.6.1 | none (3.6.0-M1 is older) | [metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml) |
| maven-compiler-plugin | 3.16.0 | 4.0.0-beta-5 | [metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-compiler-plugin/maven-metadata.xml) |
| maven-enforcer-plugin | 3.7.0 | none | [metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-enforcer-plugin/maven-metadata.xml) |
| maven-toolchains-plugin | 3.3.0 | none | [metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-toolchains-plugin/maven-metadata.xml) |
| maven-artifact-plugin | 3.7.0 | none | [metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-artifact-plugin/maven-metadata.xml) |
| maven-source-plugin | 3.4.0 | 4.0.0-beta-1 | [metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-source-plugin/maven-metadata.xml) |
| maven-javadoc-plugin | 3.12.0 | none | [metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-javadoc-plugin/maven-metadata.xml) |
| maven-gpg-plugin | 3.2.8 | none | [metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-gpg-plugin/maven-metadata.xml) |

Caution for any "latest" reading of the compiler metadata: its `<latest>` and `<release>` tags say `4.0.0-beta-5`, which is a Maven 4 only milestone. The newest GA is `3.16.0`, read from the version list. Selecting by the `<release>` tag would pick a beta.

### 2. Claims at risk

**Surefire `3.6.0` GA (`lastUpdated 20260903221843`)** - changed. New fact: GA is `3.6.1`, `lastUpdated 20261026024848`. Source: [Central metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml), [surefire releases](https://github.com/apache/maven-surefire/releases). Upstream date 2026-10-22 (Central POM) / 26 Oct (release page). 3.6.1 content: out-of-memory fix for big JUnit 4 suites, `IllegalAccessError` fixes, `groups`/`excludedGroups` ignored with TestNG on classpath fixed, `runOrder` no longer replaces other JUnit orderers, forked-JVM hang fix, optional StackWalker opt-out (SUREFIRE-3459). No breaking change listed. The 3.6.0 POM was uploaded 2026-08-31, so the baseline GA date was already right.

**"One `surefire-junit-platform` provider replaces the four old providers; JUnit 4 below 4.12 unsupported"** - could not determine. The [3.6.0 release notes](https://github.com/apache/maven-surefire/releases/tag/surefire-3.6.0) do not mention provider consolidation or a JUnit 4 floor. They link a "what's new" page, `whats-new-3-6-0.html`, which returned HTTP 404 under `maven.apache.org/surefire/maven-surefire-plugin/`. No evidence for or against; the sentence neither gets falsified nor confirmed here. Relevant 3.6.0 items: JUnit 6 ParameterizedClass, configurable JUnit 5 `TestExecutionListener` (SUREFIRE-1639), `-DskipTests` decoupled from Failsafe (SUREFIRE-823), and JUnit 6 documented as supported.

**MVN-BUILD-05 (`JUnitPlatformProvider`, `Using configured provider`)** - could not determine, same reason; nothing in 3.6.1 contradicts it. The "banner read 3.6.0 while it was a milestone" narrative is unaffected by the new version.

**MVN-BUILD-20 `jdkToolchain`** - unchanged in substance. 3.6.0 fixes "Discover tests in a fork when a toolchain JDK is used" (#3444). That is a bug fix, so a rule may mention that a toolchain fork with test discovery failure is fixed from 3.6.0. No parameter was renamed in either release's notes.

**Compiler `3.13.0` floor for `<proc>full</proc>` (MCOMPILER-548)** - unchanged. The [compile-mojo page](https://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html) (version 3.16.0) still reads: "`full` is the default. Starting with JDK 21, this option must be set explicitly." Allowed values `none`, `only`, `full`; user property `maven.compiler.proc`. 3.14.1, 3.15.0, 3.16.0 changed other proc-adjacent things only: empty annotation-processor list no longer breaks the build (3.16.0), generated annotation sources not added to source roots (MCOMPILER-538, 3.14.1), `useIncrementalCompilation=false` generated-sources fix (MCOMPILER-540, 3.15.0). Sources: [compiler releases](https://github.com/apache/maven-compiler-plugin/releases).

**Compiler default `source`/`target` both `8`** - unchanged on 3.x. Docs show `Default: 1.8` for both (changed 1.5 to 1.6 in 3.8.0, to 1.7 in 3.9.0, to 1.8 in 3.11.0). The 4.0.0-beta line is Maven 4 only and the notes say nothing about a default change; the 4.x defaults were not determined.

**Enforcer "3.6.3 ... 37 built-in rules, zero active"** - changed. New fact: `3.7.0` (Central 2026-10-30; [release page](https://github.com/apache/maven-enforcer/releases)) adds `banPropertyPrefix` (MENFORCER-433); the [rules index](https://maven.apache.org/enforcer/enforcer-rules/index.html) at 3.7.0 lists 39 entries by the fetch tool's count. The baseline count of 37 plus one new rule would be 38, so the 39 figure is not reconciled; I could not count rule classes from the jar (they are spread over several packages). Treat the exact count as "could not determine". "Zero active" is unchanged: the index says no rule is active by default; `level` defaults to ERROR. `enforceBytecodeVersion` appeared in 3.6.3 (2026-05-18 per release page, 2026-05-15 per baseline), so it was already in the baseline set. Also in 3.7.0: `evaluateBeanshell` deprecated, with enforcer 4.0.0 named as the release removing the legacy rule API; `enforcer.skip` works without a POM (ENFORCER-939); `requireFilesExist` accepts symbolic links. No default flag changed.

**Enforcer `enforce` binds to `validate`; `requirePluginVersions` sub-flags default true; `banDynamicVersions` allow flags default false** - unchanged (no default change listed in 3.6.3 or 3.7.0 notes; the pages were not re-read for these specific parameters, so this is "no contrary evidence").

**Toolchains `3.3.0`, "no download path, no `skip` parameter"** - unchanged. The [toolchain goal page](https://maven.apache.org/plugins/maven-toolchains-plugin/toolchain-mojo.html) at 3.3.0 lists one parameter, `toolchains`; binds to `validate`. Central `lastUpdated 20260726`.

**`org.mvnsearch:toolchains-maven-plugin` `4.5.0`, last touched 2023-04** - unchanged. Central `release 4.5.0`, `lastUpdated 20230409152649`. The [GitHub repo](https://github.com/linux-china/toolchains-maven-plugin) README still uses 4.5.0 and describes Foojay JDK download into `~/.m2/jdks`. Contributor count and last commit date were not visible; "single maintainer" is not re-verified.

**MVN-BUILD-18 "toolchain-aware since compiler 2.1, surefire 2.5, javadoc 2.5, jarsigner 1.3"** - could not determine, not covered by any release note in the window; no contradicting evidence.

**MVN-BUILD-04 "apache/maven#11605 is open and unmerged as of 2026-09-12"** - changed. [PR 11605](https://github.com/apache/maven/pull/11605), "Fix jdk21 tests", opened 2025-12-28 against `maven-3.9.x`, was closed without merge on 2026-01-25 by slachiewicz after a requested-changes review ("which test in Maven we try to fix by this PR?"). It adds `--add-opens` to Maven's own Surefire `argLine` next to `@{jacocoArgLine}`. It is a fix of Maven's own test build for JDK 21+, so it was never an upstream fix for user `argLine` clobbering. State on 2026-09-12 was closed, not open. The additive `@{argLine}` guidance stays valid, but the sentence "the upstream fix (apache/maven#11605)" is wrong on two counts and must be reworded or dropped.

**artifact-plugin `check-buildplan` / `compare`** - unchanged in existence. 3.7.0 (POM 2026-09-11): reference build origin displayed, no more reference buildinfo download attempt. 3.6.1 (2025-09-29 per Central): `compare` shows missing reference files, aggregate compare copied only on last module, diffoscope promoted in `.buildcompare`. Release notes do not mention `check-buildplan`. Source: [artifact releases](https://github.com/apache/maven-artifact-plugin/releases).

**source `jar-no-fork`** - unchanged: the plugin has no release after 3.4.0 / 4.0.0-beta-1 and the notes do not touch the goal. [source releases](https://github.com/apache/maven-source-plugin/releases).

**javadoc `jar`** - unchanged. 3.12.0 (2025-09-21): breaking change, `detectOfflineLinks` now defaults false for all jar mojos (#1258). Predates the baseline; list only if the pair does not already carry it. [javadoc releases](https://github.com/apache/maven-javadoc-plugin/releases).

**gpg `--batch --pinentry-mode loopback`** - unchanged. No release after 3.2.8 (2025-10-31). The release page does not document these options; they were not re-verified from site docs.

## Normative guidance candidates

1. Rule: in `lifecycle-and-plugins.md` replace the Surefire row with `3.6.1`, and tell readers to query Central. Rationale: 3.6.1 fixes forked-JVM hang and JUnit 4 out-of-memory. Verify: `curl -s https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml | grep release`.
2. Rule: when reading compiler or any plugin metadata, take the newest non-milestone from the `<version>` list and not the `<release>` tag. Rationale: compiler `<release>` is `4.0.0-beta-5`. Verify: reading heuristic; the selected version has no `-beta`, `-M` or `-alpha` suffix.
3. Rule: pin compiler at `3.16.0`, not `3.13.0`, and keep `3.13.0` only as the `proc` `full` floor. Rationale: 3.16.0 is current GA and the doc note is unchanged. Verify: the compile-mojo page text "Starting with JDK 21, this option must be set explicitly"; `grep -n '<proc>' pom.xml`.
4. Rule: do not state an exact enforcer rule count; say "dozens of built-in rules, none active until an execution lists them". Rationale: 37 is stale at 3.7.0 (rules index lists about 39) and drifts each release. Verify: `grep -rn "37 built-in" rules skills` returns nothing.
5. Rule: when enforcer 3.7.0 is pinned, do not use `evaluateBeanshell`. Rationale: deprecated, legacy rule API removed in 4.0.0. Verify: `grep -rn evaluateBeanshell pom.xml`.
6. Rule: remove the claim that apache/maven#11605 is the upstream fix for `argLine`. Rationale: the PR is closed unmerged and targets Maven's own tests. Verify: `grep -rn 11605 rules skills` returns nothing or only the corrected sentence.

## AI-agent angle

- An agent reading compiler `<release>` picks a Maven 4 only beta. Check: version string contains `beta`.
- An agent copies `3.6.0` Surefire or `3.6.3` enforcer from the older pair text. Check: compare against Central metadata.
- An agent assumes `evaluateBeanshell` is a normal enforcer rule. Check: grep above.

## Contested / evolving

- Surefire provider consolidation in 3.6.0 is not corroborated by the release notes; the what's-new page was unreachable. Re-check when the 3.6.0 doc page is reachable.
- Compiler and source plugins have Maven 4 only 4.x lines; they are not drop-in upgrades for Maven 3.9.x builds.
- Enforcer 4.0.0 is announced as removing the legacy rule API.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml | Central metadata | 2026-10-26 | current GA |
| https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-compiler-plugin/maven-metadata.xml | Central metadata | 2026-09-02 | GA vs beta |
| https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-enforcer-plugin/maven-metadata.xml | Central metadata | 2026-10-30 | current GA |
| https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-toolchains-plugin/maven-metadata.xml | Central metadata | 2026-07-26 | no change |
| https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-artifact-plugin/maven-metadata.xml | Central metadata | 2026-09-15 | current GA |
| https://repo.maven.apache.org/maven2/org/mvnsearch/toolchains-maven-plugin/maven-metadata.xml | Central metadata | 2023-04-09 | staleness |
| https://github.com/apache/maven-surefire/releases | release notes 3.6.0, 3.6.1 | 2026-09 to 10 | behaviour |
| https://github.com/apache/maven-compiler-plugin/releases | release notes | 2026-08 | proc, defaults |
| https://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html | mojo docs 3.16.0 | 2026-09 | source/target/proc text |
| https://github.com/apache/maven-enforcer/releases | release notes 3.6.3, 3.7.0 | 2026-10 | rules |
| https://maven.apache.org/enforcer/enforcer-rules/index.html | rules index 3.7.0 | 2026-10 | rule list |
| https://maven.apache.org/plugins/maven-toolchains-plugin/toolchain-mojo.html | goal docs 3.3.0 | 2026-07 | no skip param |
| https://github.com/linux-china/toolchains-maven-plugin | repo README | n/a | 4.5.0, download |
| https://github.com/apache/maven/pull/11605 | PR | closed 2026-01-25 | state |
| https://github.com/apache/maven-artifact-plugin/releases | release notes | 2026-09 | compare |
| https://github.com/apache/maven-gpg-plugin/releases, https://github.com/apache/maven-javadoc-plugin/releases, https://github.com/apache/maven-source-plugin/releases | release notes | 2025 | no change |

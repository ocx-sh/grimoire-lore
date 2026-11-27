---
title: Recent shifts in the Gradle build ecosystem, delta 2026-09-12 to 2026-11-27
pair: gradle-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 21
---

# Recent shifts, gradle-build delta

This is a delta against the baseline verified 2026-09-12 (Gradle 9.0.0 to 9.7.1). Only changes the pair does not mention at all are listed. The pages were read through a summarising fetcher, so statements are paraphrases of the fetched pages. JDK 27 toolchains, plugin-publish and Compatibility Plugin floors, and Shadow are covered by sibling delta files in this directory and are not repeated. Grep of `rules/gradle-build.md` and `skills/gradle-build-reference/` found zero hits for: Ant, CVE or GHSA, brotli, SFTP, `pull_request_target`, `destinationDir`, `failOnChangingVersions`, `known_hosts`, mirror, `zipTo`, gradle-skills.

## Summary

- Four of Gradle's ten 2026 advisories fall in the window and raise the wrapper floor: the pair's wrapper rule (GRADLE-TOOL-03) pins a checksum but names no minimum patched version. Current patched line is 9.9.2 (or 8.14.8).
- GHSA-3cfg-jpcr-gfp3 (Critical): version-catalog values run as code during catalog load. Directly bears on GRADLE-DEP catalog rules.
- GHSA-7f7r-77ff-fr6f: transitive `-SNAPSHOT` dependencies bypassed dependency verification until 9.9.2.
- gradle/actions 6.4.1 fixes a High token-exposure advisory in `download-and-submit` mode.
- GitHub blocks `pull_request_target` by default in public repositories from 2026-12-02.
- Gradle 9.9.0 deprecates Ant integration (removed in Gradle 10); 9.8.0 deprecates configuration-time process spawning (error in Gradle 11) and implicit parallel model building.
- Gradle 9.9.0 changes `Sync` semantics and the `wrapper` task regeneration behaviour.
- Gradle published official agent skills on 2026-09-30; an agent may find them and they overlap this pair.
- No Declarative Gradle, Isolated Projects stable, or native SBOM milestone surfaced in the release notes read (could not determine for Declarative: the notes pages say "not covered").

## Findings

### 1. Gradle releases in the window

Gradle 9.8.0 was released 2026-09-24 ([release notes](https://docs.gradle.org/9.8.0/release-notes.html)). Gradle 9.9.0 was released 2026-11-06 per its own [release notes](https://docs.gradle.org/9.9.0/release-notes.html). The "current" release-notes page states the current version is 9.9.2 and describes 9.9.0 as released 2026-11-23; that conflicts with the 9.9.0 page, which is the more primary source. Dates of 9.9.1 (patched GHSA-3cfg on 2026-11-10) and 9.9.2 (patched GHSA-7f7r and GHSA-4mf6 on 2026-11-19) are inferred from the advisories. Treat the 9.9.0 date as "changed: baseline stops at 9.7.1".

### 2. Security advisories (new family, nothing in the pair)

- [GHSA-3cfg-jpcr-gfp3](https://github.com/gradle/gradle/security/advisories/GHSA-3cfg-jpcr-gfp3), 2026-11-10, Critical (CVSS v4 9.3): Gradle writes catalog versions, coordinates and plugin IDs unescaped into generated accessor source, so a crafted published catalog executes code at catalog load, even during IDE sync. Affected 7.0 to 8.14.6 and 9.0.0 to 9.9.0. Fixed in 8.14.7 and 9.9.1; the fix rejects `*/` and `\u` in catalog entries. Workarounds: scan catalogs, import published catalogs at a fixed verified version, use dependency verification.
- [GHSA-7f7r-77ff-fr6f](https://github.com/gradle/gradle/security/advisories/GHSA-7f7r-77ff-fr6f), 2026-11-19, High (8.8): dependency verification skipped changing modules reached transitively, including `-SNAPSHOT`, and did not record them in `verification-metadata.xml`. Affected 9.0.0 to 9.9.1 and 8.14.7 and earlier; fixed in 9.9.2 and 8.14.8. After upgrade, builds that resolve snapshots fail until the snapshots appear in `verification-metadata.xml` or under `trusted-artifacts`. Maven Central and the Plugin Portal are not exposed.
- [GHSA-j5m7-59rp-24f5](https://github.com/gradle/gradle/security/advisories/GHSA-j5m7-59rp-24f5), 2026-10-07, High (8.6): an SSL handshake error on an earlier repository did not stop resolution, so a later repository could serve a malicious artifact. Affected to 9.8.0; fixed in 9.8.1 and 8.14.6. Mitigations: strict repository content filtering, dependency verification, remove unused repositories.
- [GHSA-4mf6-7pm2-6wm8](https://github.com/gradle/gradle/security/advisories/GHSA-4mf6-7pm2-6wm8), 2026-11-19, High (8.9): `sftp://` repositories ignored `known_hosts`. Fixed in 9.9.2; patched behaviour needs every host key in `known_hosts`. Mitigation: use HTTPS.
- [GHSA-xwqc-3h47-hg64](https://github.com/gradle/gradle/security/advisories/GHSA-xwqc-3h47-hg64), 2026-10-07, High (8.6): daemon deserialises untrusted Java objects before authenticating; local attacker only. Fixed in 9.8.1. Two sibling worker-channel and daemon-registry advisories (GHSA-mvvg-497x-hmj8, GHSA-gqrr-4j89-5267, GHSA-pcp8-98xm-c6pr, GHSA-35pj-rg5r-8rpv, GHSA-99wf-vhq9-wm2x) were listed on the [advisory index](https://github.com/gradle/gradle/security/advisories) with titles and dates only (2026-10-07 to 2026-11-19, all High); their affected ranges were not opened. All are local-privilege class; the single rule they support is "run on at least 9.9.2".
- [Black October post](https://blog.gradle.org/lets-talk-about-black-october), 2026-11-04: eight eMudhra intermediate CA certificates with recoverable keys were still trusted by JDKs (CVE-2026-91403 for the JDK fix); Brotli CVE-2026-111497 reaches JVM builds through `brotli4j` (fixed 1.24.0). Gradle recommends enabling dependency verification and dependency locking, updating JDKs, and enforcing brotli4j 1.24.0 with strict constraints. This is a one-off incident; only the recommendations generalise, and they are already in GRADLE-DEP-09 to -11 territory for locking.

Verification of the advisory index: page 2 of the index lists nothing newer than January 2026 (could not determine page 3).

### 3. GitHub Actions

- [gradle/actions v6.4.1](https://github.com/gradle/actions/releases), 2026-10-28, fixes [GHSA-chpw-2mqm-95cc](https://github.com/gradle/actions/security/advisories/GHSA-chpw-2mqm-95cc) (High, 8.1): in `download-and-submit` mode a fork PR's artifact could redirect the authenticated Dependency Submission request and expose `GITHUB_TOKEN`. Affected `setup-gradle` and `dependency-submission` 3.0.0 to 6.4.0. Workaround: submit from a single `pull_request` workflow. v6.4.0 (2026-09-28) added a new signing key to trust if dependency verification covers the action, and reports Gradle itself as an `org.gradle:gradle-core` dependency to the dependency graph.
- [GitHub changelog 2026-11-02](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2): from 2026-12-02 `pull_request_target` is blocked by default in public repositories (evaluate mode with brownouts on 2026-11-09 and 2026-11-16 beforehand; enforcement slipped from 2026-11-02). Private and Enterprise Server are unaffected.
- No changelog entry on enforced SHA pinning, new default `GITHUB_TOKEN` permissions or immutable actions was found in the November page (the September and October sections were empty in the fetch; could not determine for those months). GRADLE-CI-09 and -10: unchanged.

### 4. Deprecations that change how correct build code is written

Source: [upgrade guide 9.x](https://docs.gradle.org/9.9.0/userguide/upgrading_version_9.html) (first 100000 of about 180000 characters read; 9.9.0 and 9.8.0 sections complete).

- Ant integration deprecated in 9.9.0, removed in Gradle 10 (`ant`, `AntBuilder`, `Project.ant()`, implicit Ant classes on the script classpath). See [Side Quest post](https://blog.gradle.org/side-quest-removing-ant), 2026-10-29.
- Starting processes at configuration time via `ExecOperations`, `ProcessBuilder`, `Runtime.exec` or Groovy `execute`: deprecated 9.8.0, error in Gradle 11. The pair's GRADLE-CACHE non-negotiable 4 already forbids spawning a process at configuration; the new fact is the removal date and the Groovy `"cmd".execute()` spelling.
- `org.gradle.parallel` without `org.gradle.tooling.parallel`: implicit parallel model building deprecated 9.8.0, error in Gradle 10. The pair mentions `org.gradle.parallel` once in toolchains-and-compilation.md as a property, not this change.
- `Copy` and `Sync` gain `destinationDirectory` (incubating) in 9.8.0; `destinationDir` is slated for deprecation and `destinationDirectory` becomes the only output in Gradle 10.
- `Sync` in 9.9.0 always deletes the destination; an empty source empties it unless the incubating `skipWhenSourceIsEmpty` is set.
- `wrapper` task in 9.9.0 preserves existing `gradle-wrapper.properties` values and fails on invalid ones; `distributionUrl` is regenerated. Hard facts only; baseline GRADLE-TOOL-03 regenerate step is unchanged but its expected diff differs.
- Also deprecated, lower relevance: Kotlin DSL `zipTo`/`unzipTo` (removed 10), implicit task dependencies between builds (error 10), per-configuration legacy lock files not read in Gradle 10, catalog plugins with `prefer`/`strictly`/`reject` (error 10), `Signature` and classifier signing APIs (removed 10), macOS Intel dropped as a supported platform in Gradle 10, Gradle 9 receives no security fixes once Gradle 11.0.0 ships.
- Gradle 9.8.0 allows `org.gradle.mirror.maven.settings=true` (off by default); unchanged practice, not worth a rule.

### 5. Gradle's own agent skills

[blog.gradle.org, 2026-09-30](https://blog.gradle.org/introducing-gradle-skills): `gradle/gradle-skills` offers `gradle-best-practices` (audit or apply) and `gradle-wrapper-upgrade` (runs `wrapper` twice, pins SHA-256, restores on failure). Not a rule candidate; noted so the pair's skill description can acknowledge it. The 9.9.0 notes also add a "Securing Gradle Builds" user-manual chapter ([docs page URL guessed `securing_builds.html` returned 404; chapter content not read](https://docs.gradle.org/9.9.0/release-notes.html)).

### 6. KGP and AGP floors

[KGP compatibility table](https://kotlinlang.org/docs/gradle-configure-project.html): KGP 2.4.20 to 2.4.21 supports Gradle 7.6.3 to 9.7.0 and AGP 8.5.2 to 9.3.1. Gradle 9.8.0 and 9.9.0 are above the fully supported maximum (warnings possible, not breakage). The 9.9.0 upgrade guide bumps embedded Kotlin to 2.4.21 and says KGP below 2.1.0 hits an error in Gradle 10 (`KotlinNativeBundleArtifactsTypes`). No change to the Gradle floor a build must meet was found.

### 7. Not found

- Declarative Gradle, stable Isolated Projects, native dependency-update or SBOM features: not mentioned in the 9.8.0 or 9.9.0 release notes. 9.8.0 adds an Isolated Projects `compatibility { features { } }` plugin declaration and 9.9.0 adds Buildship sync support only (unchanged against the pair's Isolated Projects section).
- Compromised Plugin Portal plugins, wrapper-jar attacks: none found in the sources read (could not determine beyond them).
- Newly dead community plugins: none found.

## Normative guidance candidates

1. New rule GRADLE-TOOL-08, SHOULD (MUST for builds that resolve snapshots, SFTP or untrusted catalogs). File: `skills/gradle-build-reference/toolchains-and-compilation.md`, section "The Wrapper"; one-line pointer in `rules/gradle-build.md` non-negotiable 1. Text: the wrapper distribution is at least 9.9.2 (or 8.14.8 on the 8.x line); never write a lower version into `distributionUrl`. Rationale: ten advisories in the window, four of which (GHSA-3cfg, -7f7r, -j5m7, -4mf6) affect resolution integrity of ordinary builds. Verification: `grep -E 'gradle-[0-9]+\.[0-9]+(\.[0-9]+)?-(bin|all)' gradle/wrapper/gradle-wrapper.properties` and compare against 9.9.2; the version must have been observed on services.gradle.org per GRADLE-DEP rule on observed versions.
2. New rule GRADLE-DEP-19, MUST. File: `dependencies.md`, section "Verification Metadata and the Wrapper". Text: before adding or updating an imported version catalog (`from("g:a:v")` or a committed TOML), grep it for `*/` and `\u`, and import published catalogs only at a fixed, verified version. Rationale: GHSA-3cfg-jpcr-gfp3 code execution at catalog load, before any build script, so no later gate can catch it. Verification: `grep -rn -e '\*/' -e '\\u' --include='*.toml' .` must be empty. It extends GRADLE-DEP-08's catalog-by-content detection.
3. Amendment to GRADLE-DEP verification rule (the one stating `verification-metadata.xml` is committed), SHOULD. Text: with verification enabled and any snapshot-serving repository declared, every `-SNAPSHOT` reached transitively must appear in `verification-metadata.xml` or under `trusted-artifacts`; scope each snapshot repository with `mavenContent { snapshotsOnly() }` and every other repository with `releasesOnly()`. Rationale: GHSA-7f7r-77ff-fr6f; 9.9.2 makes unlisted snapshots fail the build. Verification: `./gradlew --dependency-verification=strict help` on 9.9.2 plus `grep -rn 'releasesOnly\|snapshotsOnly' settings.gradle*`.
4. New rule GRADLE-DEP-20, SHOULD. Text: repository declarations are minimal and use `exclusiveContent` or `content {}` filters; never an `sftp://` repository without HTTPS alternative; never `allowInsecureProtocol = true` to silence a host-key failure. Rationale: GHSA-j5m7-59rp-24f5 and GHSA-4mf6-7pm2-6wm8. Verification: `grep -rn "sftp://\|allowInsecureProtocol" -- '*.gradle' '*.gradle.kts'`.
5. Amendment to GRADLE-CI-09, MUST. File: `ci.md`, "The Workflow's Own Privileges". Text: a workflow using `gradle/actions` pins a SHA of at least v6.4.1, and must not use `download-and-submit` dependency-graph mode with a `workflow_run` workflow; submit from one `pull_request` job. Rationale: GHSA-chpw-2mqm-95cc exposed `GITHUB_TOKEN` to fork PRs. Verification: `grep -rn 'download-and-submit\|workflow_run' .github/workflows` and compare the pinned SHA to the v6.4.1 tag commit.
6. Amendment to GRADLE-CI-10, SHOULD. Text: no workflow in a public repository triggers on `pull_request_target` (blocked by default from 2026-12-02); a Gradle build must never check out fork code under it. Rationale: GitHub changelog 2026-11-02. Verification: `grep -rn 'pull_request_target' .github/workflows`.
7. New rule GRADLE-CORE-04 (or GRADLE-CACHE-18), SHOULD. File: `caching-and-correctness.md`, "Dead Build-Script Syntax" counterpart in `toolchains-and-compilation.md` section "Dead Build-Script Syntax". Text: write no new `ant.*`, `AntBuilder`, `Project.ant`, `import org.apache.tools.ant` or Kotlin DSL `zipTo`/`unzipTo`; replace with `Copy`, `Sync`, `Delete`, `Zip`, `ExecOperations` or `JavaExec`. Rationale: removed in Gradle 10; deprecated in 9.9.0. Verification: `git ls-files -z -- '*.gradle' '*.gradle.kts' | xargs -0 -r grep -n -e 'ant\.' -e 'AntBuilder' -e 'org.apache.tools.ant' -e 'zipTo' -e 'unzipTo'`.
8. Amendment to GRADLE-CACHE configuration-time-process rule, SHOULD. Text: add Groovy `"cmd".execute()`, `Runtime.exec` and `ProcessBuilder` at configuration time to the forbidden list and state that it becomes an error in Gradle 11; use a `ValueSource` with `ExecOperations`. Verification: grep for `\.execute()`, `ProcessBuilder`, `Runtime.getRuntime().exec` in build files outside task actions.
9. Amendment to `toolchains-and-compilation.md` section "gradle.properties", CONSIDER. Text: `org.gradle.parallel=true` alone leaves implicit parallel model building enabled; the Gradle 10 error means set `org.gradle.tooling.parallel` explicitly if IDE sync parallelism is wanted. Verification: grep `org.gradle.parallel` and `org.gradle.tooling.parallel` in `gradle.properties`.
10. Amendment to the wrapper regeneration step of GRADLE-TOOL-03, CONSIDER. Text: on 9.9.0 or later, `./gradlew wrapper` preserves existing properties and fails on invalid ones; `distributionUrl` is rewritten, so a custom mirror host must be re-applied and reviewed in the diff. Verification: `git diff gradle/wrapper/gradle-wrapper.properties` after regeneration.
11. Amendment to GRADLE-CACHE task-output guidance, CONSIDER. Text: `Sync` with an empty or absent source deletes the whole destination on 9.9.0 or later; never point `Sync` at a directory holding hand-written files; use `Copy` when merging. Verification: grep `Sync` tasks and check `into(...)` targets.

## AI-agent angle

- An agent trained before November 2026 will emit `ant.invokeMethod`, `ant.copy`, `zipTo` or `project.exec` at configuration time without warning of Gradle 10; check with the grep in candidate 7.
- An agent upgrading a wrapper will pick a version from memory (often 9.0 to 9.7) that falls inside every advisory range; candidate 1 forces 9.9.2 or later after observation.
- An agent will treat `libs.versions.toml` and `from("...")` imports as inert data; GHSA-3cfg shows they are code. Candidate 2.
- An agent writing `gradle/actions` workflows from memory pins an older v6 SHA and may choose `download-and-submit` for dependency graph submission; candidate 5.
- An agent adding a `pull_request_target` workflow for fork PR checks will find it blocked on public repositories from 2026-12-02; candidate 6.
- An agent reading Gradle's own `gradle-skills` may import conflicting severity and ID schemes; the pair's rules win for this repository's agents.

## Contested / evolving

- Release date of 9.9.0: 2026-11-06 per its release notes versus 2026-11-23 on the "current" release-notes page. Unresolved; use the release-specific page.
- Enforcement of `pull_request_target` blocking slipped from 2026-11-02 to 2026-12-02, so the date may move again.
- Whether KGP 2.4.x supports Gradle 9.8 and 9.9 officially: the table caps at 9.7.0; trend is that the maximum trails Gradle by one to two minors, with warnings only.
- Gradle will stop security fixes for the 9.x line once Gradle 11.0.0 ships; the pair's version floor guidance should be revisited then.

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://docs.gradle.org/current/release-notes.html | Current release notes (9.9.2) | 2026-11 | Current version; date conflict |
| https://docs.gradle.org/9.9.0/release-notes.html | 9.9.0 release notes | 2026-11-06 | Sync, wrapper, Isolated Projects |
| https://docs.gradle.org/9.8.0/release-notes.html | 9.8.0 release notes | 2026-09-24 | Java 27, deprecations |
| https://docs.gradle.org/9.9.0/userguide/upgrading_version_9.html | 9.x upgrade guide (partial read) | 2026-11 | Deprecation timeline |
| https://blog.gradle.org/ | Blog index | 2026-11 | Post list |
| https://blog.gradle.org/lets-talk-about-black-october | Security post | 2026-11-04 | JDK trust, brotli4j |
| https://blog.gradle.org/side-quest-removing-ant | Ant removal | 2026-10-29 | Migration options |
| https://blog.gradle.org/introducing-gradle-skills | Gradle agent skills | 2026-09-30 | Overlap with the pair |
| https://github.com/gradle/gradle/security/advisories | Advisory index (pages 1 and 2) | 2026-10 to 2026-11 | Ten new advisories |
| https://github.com/gradle/gradle/security/advisories/GHSA-3cfg-jpcr-gfp3 | Catalog code injection | 2026-11-10 | Critical |
| https://github.com/gradle/gradle/security/advisories/GHSA-7f7r-77ff-fr6f | Snapshot verification bypass | 2026-11-19 | Verification |
| https://github.com/gradle/gradle/security/advisories/GHSA-j5m7-59rp-24f5 | SSL repository fallthrough | 2026-10-07 | Repository content filtering |
| https://github.com/gradle/gradle/security/advisories/GHSA-4mf6-7pm2-6wm8 | SFTP host keys | 2026-11-19 | Repository protocol |
| https://github.com/gradle/gradle/security/advisories/GHSA-xwqc-3h47-hg64 | Daemon deserialisation | 2026-10-07 | Local only |
| https://github.com/gradle/actions/releases | gradle/actions releases | 2026-09-28, 2026-10-28 | 6.4.0, 6.4.1 |
| https://github.com/gradle/actions/security/advisories/GHSA-chpw-2mqm-95cc | Token exposure advisory | 2026-10-28 | CI-09 |
| https://github.blog/changelog/ | GitHub changelog index | 2026-11 | No pinning or token-default change |
| https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2 | pull_request_target block | 2026-11-02 | CI-10 |
| https://kotlinlang.org/docs/gradle-configure-project.html | KGP compatibility table | 2026-11 | Floors |
| https://docs.gradle.org/current/userguide/securing_builds.html | Guessed URL, returned 404 | n/a | Failed fetch |

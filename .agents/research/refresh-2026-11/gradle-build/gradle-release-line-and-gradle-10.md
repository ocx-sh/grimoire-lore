---
title: Gradle release line after 9.7.1 and the state of Gradle 10 (delta)
pair: gradle-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 21
---

# Gradle release line after 9.7.1 and the state of Gradle 10 (delta)

Scope: what changed in Gradle itself between 2026-09-12 and 2026-11-27, and the state of the cited GitHub issues. This is a delta against the baseline research of 2026-09-12. Corpus counts are not re-measured. Release dates come from the [Gradle releases page](https://gradle.org/releases/), read 2026-11-27. The patch-release notes pages quote the base minor's date, so they are not used for dates.

## Contents

- Summary
- Findings: releases in the window; Gradle 10 status; claim-by-claim verdicts; issue states
- Normative guidance candidates
- AI-agent angle
- Contested / evolving
- Sources

## Summary

- Six Gradle releases landed after 9.7.1, all in the 9.x line: 9.8.0 (2026-09-24), 9.8.1 (2026-10-07), 9.8.2 (2026-10-19), 9.9.0 (2026-11-06), 9.9.1 (2026-11-10), 9.9.2 (2026-11-19). 8.14.8 also shipped 2026-11-19. The "Gradle 9.x, verified 2026-09-12" claim needs a new version number: 9.9.2 is current.
- No Gradle 10.0 milestone or release candidate appears on the releases page, and a search found none. Gradle 10 is not released and has no public pre-release as of 2026-11-27 (could not determine whether one is scheduled).
- The claim that the configuration-cache default slipped from Gradle 10 to Gradle 11 still holds. The authoritative source is the Gradle blog post of 2026-08-19, which predates the window. The 9.9.2 user manual still says "Gradle 10" in two places, so the docs contradict the blog. Cite the blog and flag the conflict.
- Isolated Projects is still incubating, still two of four constraint categories unenforced, and the `unsafe` key deprecation still holds. The removal version is still unstated ("a future release").
- GRADLE-CACHE-08 and the cited issue #24040 need a correction: #24040 is closed (2025-06-13, milestone 9.0.0 RC1), and the closing comment says explicit credentials disable the configuration cache, not only a task.
- The five validatePlugins problem IDs all still exist under the same names in the 9.9.2 manual. Gradle's own runtime problem IDs were regrouped in 9.9.0, which does not touch these anchors.
- Issues #15383, #847, #18520, #2298, #2534, #8400 and #2270 are all still open. #24040 is closed.

## Findings

### 1. Releases after 9.7.1

Source for all dates: [gradle.org/releases](https://gradle.org/releases/).

| Release | Date | What matters to this pair |
|---|---|---|
| 9.8.0 | 2026-09-24 | Opt-in Plugin Portal compatibility declaration for Isolated Projects; Configuration Cache warn-mode messages reported through the Problems API. New deprecations: implicit parallel model building (error in 10), configuration-time external processes (error in 11), `startParameter.buildCacheEnabled` (removed in 10). See [9.8.0 release notes](https://docs.gradle.org/9.8.0/release-notes.html). |
| 9.8.1 | 2026-10-07 | Three high-rated security advisories (daemon deserialization, SSL repository handling). Toolchain warning fix on Debian and Ubuntu. See [9.8.1 notes](https://docs.gradle.org/9.8.1/release-notes.html). |
| 9.8.2 | 2026-10-19 | Virtual platform alignment warning fix. See [9.8.2 notes](https://docs.gradle.org/9.8.2/release-notes.html). |
| 9.9.0 | 2026-11-06 | Kotlin DSL incremental compilation via the Kotlin Build Tools API; Problems API groups and renamed Gradle problem IDs; four configuration-cache opt-out properties deprecated; Eclipse Buildship syncs with Isolated Projects; `Sync` always deletes the whole destination; Validating Plugins page returned to the manual. See [9.9.0 notes](https://docs.gradle.org/9.9.0/release-notes.html). |
| 9.9.1 | 2026-11-10 | Three security advisories (one Critical: version catalog values run as code in generated accessors). See [9.9.1 notes](https://docs.gradle.org/9.9.1/release-notes.html). |
| 9.9.2 | 2026-11-19 | Latest. Listed fixes: faster configuration-cache serialization of `GenerateModuleMetadata` and `GenerateMavenPom`. See [current release notes](https://docs.gradle.org/current/release-notes.html). |

The 9.9.2 upgrade guide lists no new deprecations in its 9.9.2 subsection ([upgrading_version_9](https://docs.gradle.org/9.9.2/userguide/upgrading_version_9.html)).

### 2. Gradle 10 status

- The releases page lists no 10.0 milestone or RC ([releases](https://gradle.org/releases/)). The 9.9.2 manual has no `upgrading_major_version_10.html` page (HTTP 404 on fetch, 2026-11-27).
- The 9.9.2 upgrade guide names what Gradle 10 will remove or turn into errors. New in the window: Ant integration and implicit Ant classes removed; `Project.ant` removed; legacy dependency lock file format no longer read; macOS Intel removed; `zipTo` and `unzipTo` removed; service injection into `ValueSource` parameters an error; artifact-transform output queried from a transform action an error; non-required version constraints for catalog plugins an error. Source: [upgrading_version_9](https://docs.gradle.org/9.9.2/userguide/upgrading_version_9.html).
- Gradle 11 is named for removal of the temporary configuration-cache opt-out properties and for the `ProblemGroup.create()` and `ProblemId.create()` removal, and for configuration-time external processes becoming an error.

### 3. Claim-by-claim verdicts

**rules/gradle-build.md "Gradle 9.x, verified 2026-09-12".** Changed. New fact: the line is now at 9.9.2 (2026-11-19). The rule text stays valid for 9.x; only the stamp changes to the new verification date and "9.0.0 through 9.9.2". Source: [releases](https://gradle.org/releases/).

**rules/gradle-build.md "Gradle 9 disables it for a task and carries on rather than failing (GRADLE-CACHE-08)".** Changed (precision, upstream change is pre-window). Old text: disables the cache for a task. New fact: the [#24040 closing comment, 2025-07-28](https://github.com/gradle/gradle/issues/24040) says "explicit credentials disable the configuration cache" instead of failing, fixed by [PR 33830](https://github.com/gradle/gradle/pull/33830) merged 2025-06-13 (milestone 9.0.0 RC1). Whether the scope is the task or the whole cache entry is not settled by the fetched text: could not determine. The "carries on rather than failing" half holds. Nothing in the window changed this.

**caching-and-correctness.md "Measured against Gradle 9.0.0 through 9.7.1".** Changed to "through 9.9.2" if the re-check of the 9.8 and 9.9 notes counts as measurement. Fetched 9.8.0, 9.9.0 and the 9.9.2 upgrade guide; none contradicts any configuration-cache statement in the file.

**"The configuration cache is not on by default in Gradle 9 ... the default-on target slipped from Gradle 10 to Gradle 11".** Unchanged in substance, but the citation is wrong. The file cites the 9.0.0 release notes; the [9.0.0 upgrade guide](https://docs.gradle.org/9.0.0/userguide/upgrading_major_version_9.html) says nothing about a default. The real source is the Gradle blog [Gradle Is Going Agentic, 2026-08-19](https://blog.gradle.org/gradle-is-going-agentic): "make Configuration Cache the default in Gradle 11 rather than Gradle 10". Contradicting text still ships in the 9.9.2 manual: [upgrading_version_9](https://docs.gradle.org/9.9.2/userguide/upgrading_version_9.html) (section "Upgrading from 9.7.0 and earlier", the configuration-time external process deprecation, introduced in 9.8.0, 2026-09-24) says "the Configuration Cache will be enabled by default in Gradle 10", and [configuration_cache_adoption](https://docs.gradle.org/current/userguide/configuration_cache_adoption.html) says "The work to make it the default in Gradle 10.0.0 is in progress". [configuration_cache_enabling](https://docs.gradle.org/9.9.2/userguide/configuration_cache_enabling.html) still says "By default, Gradle does not use the Configuration Cache." Verdict: the not-on-by-default claim holds; replace the source with the blog post and add that the manual lags the blog. The 9.0.0 pre-release blog ([road-to-configuration-cache, 2025-03-14](https://blog.gradle.org/road-to-configuration-cache)) stated the Gradle 10 goal, which is the historical origin.

**"Isolated Projects ... Incubating since Gradle 9.7.0 (2026-08-06)" and "Two of its four constraint categories are unenforced".** Unchanged. [isolated_projects](https://docs.gradle.org/9.9.2/userguide/isolated_projects.html) still says incubating since 9.7.0; cross-build access and build-to-project access are "not fully enforced yet". The only movement in the window: Buildship (Eclipse) can sync with Isolated Projects in 9.9.0 (2026-11-06), and 9.8.0 (2026-09-24) added the Plugin Portal compatibility declaration. The blog confirms the plan to take it "from incubating all the way to done" without a date.

**GRADLE-CACHE-09 "`org.gradle.unsafe.isolated-projects` ... was deprecated in 9.7.0 and is slated for removal".** Unchanged. The manual says the legacy name is "deprecated and will be removed in a future release", with no removal version ([upgrading_version_9](https://docs.gradle.org/9.9.2/userguide/upgrading_version_9.html), [isolated_projects](https://docs.gradle.org/9.9.2/userguide/isolated_projects.html)). New, adjacent: four `org.gradle.configuration-cache.*unsafe*` opt-out properties are deprecated since 9.9.0 and scheduled for removal in Gradle 11 ([configuration_cache_enabling](https://docs.gradle.org/9.9.2/userguide/configuration_cache_enabling.html), 2026-11-06). The properties are `org.gradle.configuration-cache.inputs.unsafe.ignore.file-system-checks`, `org.gradle.configuration-cache.inputs.unsafe.ignore.in-serialization`, `org.gradle.configuration-cache.unsafe.ignore.unsupported-build-events-listeners` and `org.gradle.configuration-cache.unsafe.skip-task-logging-listeners-serialization`.

**GRADLE-CACHE-17 archive defaults (9 versus 8) and the open question "does Gradle 10 change them again".** Unchanged. No Gradle 10 documentation exists, and the 9.8 and 9.9 upgrade sections never mention reproducible file order or preserved timestamps. The open question stays open. One adjacent fact: 9.9.0 changed `Sync` to always delete its whole destination ([9.9.0 notes](https://docs.gradle.org/9.9.0/release-notes.html)); this is not an archive default.

**validatePlugins problem IDs.** Unchanged. All five (`missing_annotation`, `incorrect_use_of_input_annotation`, `missing_normalization_annotation`, `cacheable_transform_cant_use_absolute_sensitivity`, `implicit_dependency`) exist under identical names on [validation_problems](https://docs.gradle.org/9.9.2/userguide/validation_problems.html), which lists 31 IDs and uses them as anchors. Note the 9.9.0 regrouping affected Gradle's runtime problem IDs (for example `deprecation:buildsrc-script` became `Gradle:Deprecation:BuildSrc script`), not these anchors. Tools that match runtime problem IDs by string need updating; that is outside this file's claims.

**structure-and-conventions.md "Gradle has announced no deprecation [of buildSrc] as of 9.7.1" and "Measured against 9.0.0 through 9.7.1".** Unchanged, version stamp may extend to 9.9.2. The 9.9.2 upgrade guide mentions buildSrc only as a problem-ID rename and in Kotlin DSL recompilation speed-ups; no deprecation of buildSrc itself ([upgrading_version_9](https://docs.gradle.org/9.9.2/userguide/upgrading_version_9.html), [9.9.0 notes](https://docs.gradle.org/9.9.0/release-notes.html)). The scan covered the first 100000 characters of 183444 for the buildSrc keyword; the unread tail covers 9.6 and older, so a buildSrc deprecation in the window cannot hide there.

**plugin-authoring.md GRADLE-PLUG-06 `Project.getProperties()` and `Project.container(...)`.** Unchanged. The [9.9.2 deprecated-list javadoc](https://docs.gradle.org/9.9.2/javadoc/deprecated-list.html) says getProperties "will be removed in Gradle 10.0.0"; the upgrade guide says the `container` methods "will be removed in Gradle 10". Gradle 10 is still unreleased, so "scheduled for removal in Gradle 10" holds.

**GRADLE-PLUG-22 `JavaToolchainResolver` "incubating since Gradle 7.6, unchanged through 9.7" and no checksum on `JavaToolchainDownload`.** Unchanged, version can extend to 9.9.2. Javadoc for [JavaToolchainResolver](https://docs.gradle.org/9.9.2/javadoc/org/gradle/jvm/toolchain/JavaToolchainResolver.html) shows `@Incubating`, since 7.6. [JavaToolchainDownload](https://docs.gradle.org/9.9.2/javadoc/org/gradle/jvm/toolchain/JavaToolchainDownload.html) has only `getUri()` and `fromUri(URI)`. 9.8 and 9.9 notes list no toolchain resolver change. Side fact: 9.8.0 made invalid toolchain installation paths warn instead of fail, and 9.9.0 reports toolchain problems under `Provisioning > Tools and Toolchains`.

**GRADLE-PLUG-26 and -27 (Isolated Projects on `registerIfAbsent`, diagnostics wording).** Unchanged. The 9.9.2 page says `gradle.sharedServices.registerIfAbsent(...)` is safe with Isolated Projects; only the first registration wins; mutating parameters outside the registration block should be avoided. It gives no exact diagnostics-mode wording beyond the violation message shape "Project ':app' cannot access 'Project.version' functionality on another project ':'" ([isolated_projects](https://docs.gradle.org/9.9.2/userguide/isolated_projects.html)). If -27 quotes exact wording, it cannot be re-confirmed: could not determine.

### 4. Issue states (read via the GitHub API 2026-11-27)

| Issue | State now | Last update | Verdict on the quoted claim |
|---|---|---|---|
| [gradle/gradle#15383](https://github.com/gradle/gradle/issues/15383) | open, no milestone | 2026-06-22 | "still open as of 2026-09-12" holds; restamp 2026-11-27 |
| [gradle/gradle#847](https://github.com/gradle/gradle/issues/847) | open, no milestone | 2026-11-26 (label or reference activity; last comment 2025-02-20) | holds; restamp |
| [gradle/gradle#18520](https://github.com/gradle/gradle/issues/18520) | open | 2026-04-20 | holds; restamp |
| [gradle/gradle#24040](https://github.com/gradle/gradle/issues/24040) | **closed** 2025-06-13, completed, milestone 9.0.0 RC1 | 2025-07-28 | any "open" reading is false. The file cites it as a "live tracker" and as the named fallback case. Reword to "fixed in 9.0.0 by graceful degradation, [PR 33830](https://github.com/gradle/gradle/pull/33830)" |
| [gradle/gradle#2298](https://github.com/gradle/gradle/issues/2298) | open | 2026-05-03 | holds |
| [gradle/gradle#2534](https://github.com/gradle/gradle/issues/2534) | open | 2026-03-17 | holds |
| [gradle/gradle#8400](https://github.com/gradle/gradle/issues/8400) | open | 2025-07-23 | ci.md "open" holds |
| [gradle/gradle#2270](https://github.com/gradle/gradle/issues/2270) | open, milestone still 10.0.0 RC1 | 2026-01-22 | "open at milestone 10.0.0-RC1" holds. Caveat: Gradle 10 has no RC, so the milestone is a plan, not progress |

## Normative guidance candidates

1. Rule: Cite the Gradle blog post of 2026-08-19 as the source for the configuration-cache default target, and state that the 9.9.2 manual still says Gradle 10. Rationale: the current source line is mis-cited and the manual contradicts the blog. Verification: grep `caching-and-correctness.md` for "9.0.0 release notes" and confirm the replacement link is `blog.gradle.org/gradle-is-going-agentic`.
2. Rule: Do not cite #24040 as open or as a live tracker; cite PR 33830 and the 2025-07-28 comment. Rationale: the issue closed 2025-06-13. Verification: `grep -n "24040" skills/gradle-build-reference/*.md` and read each use for "open", "live" or "tracker" wording.
3. Rule: Tell agents to move off the four deprecated `org.gradle.configuration-cache.*unsafe*` opt-out properties. Rationale: deprecated in 9.9.0, removed in Gradle 11. Verification: `grep -rE "configuration-cache\.(inputs\.)?unsafe" gradle.properties .` returns no hits in a reviewed build.
4. Rule: Do not start external processes at configuration time via `ExecOperations`, `ProcessBuilder`, `Runtime.exec` or Groovy `execute`; use `providers.exec` or `providers.javaexec`. Rationale: deprecated in 9.8.0 (2026-09-24) even with the cache off, an error in Gradle 11. Verification: `grep -rnE "ProcessBuilder|Runtime\.getRuntime\(\)\.exec|\.execute\(\)|execOperations\.exec" build.gradle* buildSrc build-logic` and manual check that none run in configuration phase; run once with `--warning-mode=all`.
5. Rule: Do not call `Project.ant`, `AntBuilder`, Kotlin DSL `zipTo` or `unzipTo`. Rationale: removed in Gradle 10, deprecated in 9.9.0. Verification: `grep -rnE "\bant\b|AntBuilder|zipTo|unzipTo" *.gradle* buildSrc`.
6. Rule: Do not set `startParameter.buildCacheEnabled` from build logic. Rationale: deprecated in 9.8.0, removed in Gradle 10. Verification: `grep -rn "buildCacheEnabled"`.
7. Rule: Plugin authors may declare Isolated Projects support with the `compatibility { features { isolatedProjects = true } }` block (plugin-publish 2.2.1 or later); an undeclared plugin warns on publish. Rationale: 9.8.0 deprecation. Verification: publish with `--warning-mode=all` and read for the compatibility warning.

## AI-agent angle

- An LLM will write "Gradle 9.8 or 9.9 does not exist" or pin 9.7.1 from training. Check: `gradle/wrapper/gradle-wrapper.properties` `distributionUrl` against [gradle.org/releases](https://gradle.org/releases/).
- An LLM will say the configuration cache becomes default in Gradle 10, because the shipped manual says so. The blog says 11. Check: read the dated blog, not the manual.
- An LLM will describe #24040 as an open bug. It is closed. Check: `gh api repos/gradle/gradle/issues/24040 --jq .state`.
- An LLM may invent Gradle 10 milestone version strings. None exist. Check: the releases page.

## Contested / evolving

- Gradle 10 content is drifting through the 9.x upgrade guide: it now lists Ant removal, lock-file format and macOS Intel as 10.0 breaking changes. Direction: Gradle 10 is a cleanup major and no timeline is public as of 2026-11-27.
- The manual and the blog disagree on the default-on version. Direction: the blog is newer and authoritative; expect the manual to be corrected.
- Whether `Copy` and `Sync` `destinationDir` gets deprecated depends on `destinationDirectory` being promoted from incubating ([9.8.0 notes](https://docs.gradle.org/9.8.0/release-notes.html)).

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://gradle.org/releases/ | Release list | read 2026-11-27 | Dates for every release in the window |
| https://docs.gradle.org/9.8.0/release-notes.html | 9.8.0 notes | 2026-09-24 | Deprecations, Isolated Projects declaration |
| https://docs.gradle.org/9.8.1/release-notes.html | 9.8.1 notes | 2026-10-07 | Security fixes |
| https://docs.gradle.org/9.8.2/release-notes.html | 9.8.2 notes | 2026-10-19 | Last 9.8 patch |
| https://docs.gradle.org/9.9.0/release-notes.html | 9.9.0 notes | 2026-11-06 | Problems API regroup, Buildship |
| https://docs.gradle.org/9.9.1/release-notes.html | 9.9.1 notes | 2026-11-10 | Security fixes |
| https://docs.gradle.org/current/release-notes.html | 9.9.2 notes | 2026-11-19 | Latest release |
| https://docs.gradle.org/9.9.2/userguide/upgrading_version_9.html | Upgrade guide (first 100000 of 183444 chars read) | 9.9.2 | Gradle 10 and 11 removal list |
| https://docs.gradle.org/9.0.0/userguide/upgrading_major_version_9.html | 9.0.0 upgrade guide | 2025-07-31 | Shows no default-on statement |
| https://docs.gradle.org/9.9.2/userguide/configuration_cache_enabling.html | Enabling the configuration cache | 9.9.2 | Not default; four deprecated properties |
| https://docs.gradle.org/current/userguide/configuration_cache_adoption.html | Adoption page | 9.9.2 | Stale "Gradle 10.0.0" statement |
| https://docs.gradle.org/9.9.2/userguide/isolated_projects.html | Isolated Projects | 9.9.2 | Incubating, enforcement, key naming |
| https://docs.gradle.org/9.9.2/userguide/validation_problems.html | Validation problems | 9.9.2 | 31 problem IDs |
| https://docs.gradle.org/9.9.2/javadoc/deprecated-list.html | Deprecated list (first 100000 of 119430 chars) | 9.9.2 | getProperties removal in 10 |
| https://docs.gradle.org/9.9.2/javadoc/org/gradle/jvm/toolchain/JavaToolchainResolver.html | Javadoc | 9.9.2 | Incubating since 7.6 |
| https://docs.gradle.org/9.9.2/javadoc/org/gradle/jvm/toolchain/JavaToolchainDownload.html | Javadoc | 9.9.2 | No checksum method |
| https://blog.gradle.org/gradle-is-going-agentic | Blog post | 2026-08-19 | Default moves to Gradle 11 |
| https://blog.gradle.org/road-to-configuration-cache | Blog post | 2025-03-14 | Original Gradle 10 goal |
| https://gradle.org/release-candidate/ | RC page (rendered empty) | 2026-11-27 | No RC information obtainable |
| https://github.com/gradle/gradle/issues/24040 | Issue and comments (API) | closed 2025-06-13 | Closed, graceful degradation |
| https://github.com/gradle/gradle/pull/33830 | Fixing PR (API) | merged 2025-06-13 | Fix for #24040 |
| GitHub issues #15383, #847, #18520, #2298, #2534, #8400, #2270 (API) | Issue state | read 2026-11-27 | State table above |

Not fetched: 9.9.2 upgrade guide characters 100000 onward, 9.9.2 deprecated-list characters 100000 onward; the `upgrading_major_version_10.html` page does not exist (404).

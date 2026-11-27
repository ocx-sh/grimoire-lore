---
title: gradle/actions and the Develocity build-scan DSL, delta 2026-09-12 to 2026-11-27
pair: gradle-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 9
---

# gradle/actions and Develocity DSL: delta

Scope: a delta against the baseline of 2026-09-12. Only the claims quoted in the commission are covered. The 32-repository census (read 2026-09-05) is not re-measured. Pages were read through a fetch tool that summarises, so quotes below are as that tool returned them. The GitHub releases page prints dates without a year; 2026 was inferred from the page footer.

## Table of contents

- Summary
- Findings (versions, then one verdict per claim)
- Normative guidance candidates
- AI-agent angle
- Contested / evolving

## Summary

- Current majors: gradle/actions is v6 (latest v6.4.1, 2026-10-28); the Develocity Gradle plugin is 4.6.1 (2026-10-20).
- No input was renamed and no default changed in the window. v6.4.0 (2026-09-28) added the value `cache-provider: 'external'`.
- Automatic wrapper validation in `setup-gradle` survives into v6. The DEP-17 grep `setup-gradle@v[4-9]` still matches v6, so the pattern does not need a new version range.
- Security change in the window: GHSA-chpw-2mqm-95cc (published 2026-10-28, High, CVSS 8.1) affects `dependency-submission` 6.4.0 and earlier in `download-and-submit` mode. Fixed in 6.4.1.
- The Develocity DSL used by GRADLE-CI-05 and -06 is unchanged. `publishAlways()` is still the removed legacy spelling.
- One existing sentence is inaccurate against the current docs: GRADLE-CI-02's description of the cache key (see claim 3).

## Findings

### Current major versions

| Component | Current | Date | Source |
|---|---|---|---|
| gradle/actions | v6.4.1 (v6.4.0 on 2026-09-28; v6.4.0-rc.1 on 2026-09-08, outside the window) | 2026-10-28 | [releases](https://github.com/gradle/actions/releases), fetched 2026-11-27 |
| v6 origin | v6.0.0, 2026-03-23, outside the window | 2026-03-23 | same |
| v5 origin | v5.0.2 on 2026-02-23, notes say "no functional changes" | 2026-02-23 | same |
| Develocity Gradle plugin | 4.6.1 | 2026-10-20 | [release history](https://docs.develocity.ai/gradle/4.6/release-history/), fetched 2026-11-27 |

Releases inside the window: v6.4.0 and v6.4.1 for the action; 4.6.0 (2026-09-24) and 4.6.1 (2026-10-20) for the plugin (4.5.1, 2026-09-09, is just before the window).

### Claim 1: GRADLE-CI-01 and GRADLE-DEP-17, automatic wrapper validation. Unchanged.

The setup-gradle doc still says "By default, this action will perform the same wrapper validation" as the standalone action, and `validate-wrappers: false` disables it ([setup-gradle.md](https://github.com/gradle/actions/blob/main/docs/setup-gradle.md), fetched 2026-11-27). The wrapper-validation doc says "Starting with v4 the `setup-gradle` action will automatically perform wrapper validation on each execution" and its example is `wrapper-validation@v6` ([wrapper-validation.md](https://github.com/gradle/actions/blob/main/docs/wrapper-validation.md), fetched 2026-11-27). Known-good checksums grew from 368 to 373 in v6.4.0 ([releases](https://github.com/gradle/actions/releases)).

Is the DEP-17 grep still right? Yes for tags: `setup-gradle@v[4-9]` matches v6. Add one caveat to the text: validation is off when the step sets `validate-wrappers: false`.

Interaction with GRADLE-CI-09: still true. CI-09 requires a 40-character SHA in `uses:` with the version in a trailing comment, for example `uses: gradle/actions/setup-gradle@<40 hex> # v6.4.1`. The grep `setup-gradle@v[4-9]` cannot match that line, so a fully compliant repository returns empty output for the first alternative. The official docs never mention SHA pinning, and every example uses tags. Verdict: not a fact change, but the grep is wrong for a CI-09-compliant repository.

### Claim 2: GRADLE-CI-03, cache write rule and input. Unchanged.

The doc says "By default, The `setup-gradle` action will only write to the cache from Jobs on the default (`main`/`master`) branch." The input is `cache-read-only` ([setup-gradle.md](https://github.com/gradle/actions/blob/main/docs/setup-gradle.md), fetched 2026-11-27). Could not determine: the literal default expression of `cache-read-only`; the doc states only the behaviour. Keep wording at behaviour level, as it is now. New in v6.4.0: `cache-provider` accepts `enhanced` (default), `basic` and `external`; `external` skips restore and save like `cache-disabled` but reports "External".

### Claim 3: GRADLE-CI-02, cache key and pruning. Changed (the key sentence).

Old text: "The setup action keys on the wrapper, the catalog and the build files together and prunes what it stores."
New fact: the documented key is `${cache-protocol}-gradle|${runner-os}|${job-id}[${hash-of-job-matrix-and-workflow-name}]-${git-sha}`, so it is derived from OS, job ID, a matrix and workflow hash and the commit SHA, not from hashes of the wrapper, catalog or build files. Pruning is real: `cache-cleanup` defaults to `on-success`, with `always` and `never` as other values. Source: [setup-gradle.md](https://github.com/gradle/actions/blob/main/docs/setup-gradle.md), fetched 2026-11-27. Date of the upstream change: could not determine; not in the release list for this window, so this looks like a baseline inaccuracy rather than a window change. The rule's conclusion (do not hand-roll `actions/cache` over `~/.gradle`) still holds, but the rationale should say the action owns key construction and cleanup, without naming the hashed files.

### Claim 4: what-agents-get-wrong item 12, daemon stop. Unchanged.

"By default, the action will stop all running Gradle daemons in the post-action step" before saving the Gradle User Home ([setup-gradle.md](https://github.com/gradle/actions/blob/main/docs/setup-gradle.md), fetched 2026-11-27).

### Claim 5: GRADLE-CI-11, dependency-submission. Unchanged, with a security addition.

The doc uses `gradle/actions/dependency-submission@v6` on `push` to the default branch with `permissions: contents: write`, and says `contents: write` is "not available for any workflow that is triggered by a pull request submitted from a public forked repository" ([dependency-submission.md](https://github.com/gradle/actions/blob/main/docs/dependency-submission.md), fetched 2026-11-27). So "needs write access a fork pull request lacks" is accurate. Nuance: the doc offers a two-workflow pattern (`pull_request` generates, `workflow_run` submits) for forks.

New in the window: [GHSA-chpw-2mqm-95cc](https://github.com/gradle/actions/security/advisories/GHSA-chpw-2mqm-95cc), published 2026-10-28, High, CVSS 8.1, no CVE. In `download-and-submit` mode (the `workflow_run` half of the two-workflow pattern) a crafted graph artifact lets a fork obtain the submitting workflow's `GITHUB_TOKEN`; with `contents: write` that token can alter contents, branches, tags and releases. Affected: 6.4.0 and earlier. Patched: 6.4.1. Same-job generate-and-submit is not affected. GRADLE-CI-11's design (own job, default branch, never `pull_request`) is not affected and is the safe shape. Also in v6.4.0: Dependency Graph plugin 1.5.0 with a new signing key; builds that verify dependency signatures "must add a **second** trusted key before upgrading", otherwise graph generation fails ([releases](https://github.com/gradle/actions/releases)). GitHub changelog: no 2026 entry about Gradle dependency submission was found by search (last relevant: [2025-05-27](https://github.blog/changelog/2025-05-27-dependency-auto-submission-now-supports-gradle/)); this is a negative search result, not a read of the monthly archive.

### Claim 6: GRADLE-CI-05 and -06, Develocity DSL. Unchanged.

From the plugin manual ([current](https://docs.develocity.ai/gradle-plugin/current/), fetched 2026-11-27, version 4.6.1): `publishing.onlyIf { it.authenticated }` in Groovy and `it.isAuthenticated` in Kotlin are current; `uploadInBackground = false` (Groovy) or `.set(false)` (Kotlin) is current and the `scan.uploadInBackground` system property overrides it; `obfuscation { ipAddresses { addresses -> ... } }` is current. The 4.6.0 and 4.6.1 release entries mention no DSL change, rename or deprecation ([release history](https://docs.develocity.ai/gradle/4.6/release-history/)). The manual page is 108,236 characters and the last 8,236 were not read. The docs domain moved from docs.gradle.com to docs.develocity.ai by 301; any URL baked into a rule should use the new host. Relevant 4.6.1 fix: a failed check-in with the server could stop the plugin publishing a scan.

### Claim 7: `termsOfUseAgree` and `publishAlways()`. Unchanged.

The manual lists `develocity.buildScan.termsOfUseAgree` as current (replacing the legacy `termsOfServiceAgree`) and `publishAlways()` as legacy and removed ("Remove it. Publishing every build is the default"); `publishAlwaysIf(condition)` became `develocity.buildScan.publishing.onlyIf { condition }` ([manual](https://docs.develocity.ai/gradle-plugin/current/), fetched 2026-11-27). Date of these renames: could not determine; not in the window.

### Claim 8: caching component licence. Unchanged in the window, one fact to carry.

Enhanced Caching is the proprietary, closed `gradle-actions-caching` library under a separate licence and Terms of Use, not the repository's MIT licence; Basic Caching is MIT ([DISTRIBUTION.md](https://github.com/gradle/actions/blob/main/DISTRIBUTION.md), fetched 2026-11-27). Public repositories: both free forever. Private repositories: Enhanced is a "Free Preview", with usage-based pricing planned for large commercial organisations. The shift happened in v6.0.0 (2026-03-23, outside the window); v6.0.1 mutes the licence notice when build-scan terms are accepted or a Develocity key is present. v6.4.0 adds `cache-provider: external` and changes no terms. The page gives no date for a terms change (only that a safe-harbour clause was added), so the terms status is "could not determine" for dating.

## Normative guidance candidates

1. Rule: in GRADLE-DEP-17, keep the "`setup-gradle@v4` or later" wording and add "and the step does not set `validate-wrappers: false`". Rationale: documented opt-out. Verification: `grep -rn 'validate-wrappers' .github/workflows`; any `false` is the finding.
2. Rule: make the DEP-17 grep SHA-aware: `grep -rnE 'gradle/actions/(setup-gradle|wrapper-validation)@' .github/workflows`, accepting a tag or a 40-hex SHA, because `setup-gradle@v[4-9]` cannot match a CI-09-compliant pin. Rationale: the two rules otherwise contradict. Verification: run it on a repo whose line is `setup-gradle@<40 hex> # v6.4.1`; empty output must not occur.
3. Rule: reword GRADLE-CI-02's rationale to "the action owns key construction (OS, job, matrix, commit SHA) and cleanup (`cache-cleanup: on-success`)". Rationale: current text names hashed wrapper and catalog files that the doc does not list. Verification: reading heuristic against setup-gradle.md.
4. Rule: GRADLE-CI-11 adds "use `gradle/actions/dependency-submission` 6.4.1 or later, and never `download-and-submit` mode on a version below 6.4.1". Rationale: GHSA-chpw-2mqm-95cc. Verification: `grep -rnE 'dependency-submission@' .github/workflows` and read the pinned version; `grep -rn 'download-and-submit' .github/workflows`.
5. Rule: where a build verifies dependency signatures and uses dependency-submission v6.4.0 or later, trust the second Dependency Graph plugin key. Verification: build fails with a signature error if absent (reading heuristic).

## AI-agent angle

- Agents write `setup-gradle@v3` or `@v4` from training data; both work but the current major is v6. Check: `grep -rn 'gradle/actions' .github/workflows`.
- Agents add `wrapper-validation` beside `setup-gradle`, which is redundant; or remove it believing `setup-gradle` is absent. Check the DEP-17 grep.
- Agents write `buildScan { termsOfUseAgree = ...; publishAlways() }`, the dead spelling. Check: `grep -rn 'publishAlways' .`.
- Agents set `cache-read-only: false` in pull_request jobs (CI-03).

## Contested / evolving

- Enhanced caching licence and any future pricing for private repositories: trending towards usage-based pricing, as of the DISTRIBUTION.md read on 2026-11-27.
- The two-workflow fork pattern for dependency submission is documented by the project but was the vulnerable path until 2026-10-28.
- Kotlin versus Groovy accessor (`isAuthenticated` versus `authenticated`) differs; the rule text uses Groovy's.

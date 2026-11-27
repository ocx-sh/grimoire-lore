---
title: Spillover check for jvm-dependency-triage
target: jvm-dependency-triage
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/gradle/gradle/security/advisories/GHSA-7f7r-77ff-fr6f
---

# Spillover check: jvm-dependency-triage

## Item 1 (from gradle-build)

Item: Gradle 9.9.2 fixes GHSA-7f7r-77ff-fr6f (transitive snapshots skipped dependency verification). After the upgrade, unlisted snapshots fail the build. Triage should route that failure to the bootstrap rerun, never to disabling verification.

Verdict: confirmed by primary source.

Source: https://github.com/gradle/gradle/security/advisories/GHSA-7f7r-77ff-fr6f, the Gradle project's own advisory, published 2026-11-19, High, CVSS v4 8.8. Affected: 8.14.7 and earlier, and 9.0.0 through 9.9.1. Fixed: 8.14.8 and 9.9.2. The advisory states that with verification enabled Gradle now verifies changing modules (snapshots), direct or transitive. It states that `--write-verification-metadata` now records them. It states that builds fail with "Dependency verification failed" until those modules are covered in `verification-metadata.xml`. Snapshots accepted without verification must be listed under `<trusted-artifacts>`. Originating evidence: .agents/research/refresh-2026-11/gradle-build/dependency-analysis-and-supply-chain.md (lines 29 and 77) and the decision file gradle-build.md.

Affected text in the target, skills/jvm-dependency-triage/SKILL.md, section 3.2:

> verification and key every trusted key by its full 40-character fingerprint, and fix a
> `checksum is missing from verification metadata` failure (the transitive-dependency trap) by
> re-running the bootstrap, never by hand editing the XML and never by disabling verification.

(Exact lines: "`checksum is missing from verification metadata` failure (the transitive-dependency trap) by re-running the bootstrap, never by hand editing the XML and never by disabling verification.") The target names only the checksum-missing message. It says nothing about the snapshot case or the "Dependency verification failed" message. Its prohibition on disabling verification is already correct, so the item is a gap, not an error.

Smallest change: after that sentence, add: "On Gradle 9.9.2 and later (GHSA-7f7r-77ff-fr6f, 2026-11-19), a build that reaches a `-SNAPSHOT` or other changing module also fails with `Dependency verification failed` until that module is in the metadata. Treat it the same way: re-run the bootstrap and review the diff, or list the exemption under `<trusted-artifacts>` as a reviewed change, never disable verification."

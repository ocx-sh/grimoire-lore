---
title: Maven Resolver and Maven Wrapper delta, 2026-09-12 to 2026-11-27
pair: maven-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 17
---

# Maven Resolver and Maven Wrapper delta

Baseline: `.agents/research/jvm-maven-and-ant.md` (2026-09-12). This is a delta, not a re-creation. All facts below were read from the cited pages on 2026-11-27.

## Summary

- A new Maven line exists: Maven 3.10.0 (2026-09-27), 3.10.1 (2026-11-11) and 3.10.2 (2026-11-18) bundle Resolver 2.x, not 1.x. The statement "Maven 3 bundles 1.x, Maven 4 bundles 2.x" is now false.
- Bundled resolvers: Maven 3.9.16 bundles 1.9.27 (unchanged, still the newest 3.9.x). Maven 3.10.2 bundles 2.0.26. Maven 4.0.0-rc-7 (2026-09-21) bundles 2.0.23.
- The 2.x property names in MVN-BUILD-11 are wrong for current 2.x. Since resolver 2.0.15 (2026-02-12, before the baseline) the names are `aether.connector.basic.includedChecksums` and `aether.checksums.checksumAlgorithms`. `aether.connector.basic.smartChecksums` and `aether.layout.maven2.checksumAlgorithms` existed only through 2.0.14.
- The "old names ignored without error" claim is partly wrong. Resolver 2.x still reads the 1.x names `aether.connector.smartChecksums` and `aether.checksums.algorithms` (upgrade guide, "Old key still read: yes"). Only keys not marked "yes" are ignored silently.
- Wrapper: `maven-wrapper-plugin` is still 3.3.4. No newer release. Verification stays opt-in. Property names unchanged.

## Findings

### 1. Bundled resolver versions

- Maven 3.9.16 (2026-05-13): `<resolverVersion>1.9.27</resolverVersion>` in [maven-3.9.16.pom](https://repo.maven.apache.org/maven2/org/apache/maven/maven/3.9.16/maven-3.9.16.pom). Metadata lists no 3.9.17: [apache-maven metadata](https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/maven-metadata.xml). Unchanged.
- Maven 3.10.0 (2026-09-27) bundles 2.0.24; 3.10.1 (2026-11-11) bundles 2.0.25; 3.10.2 (2026-11-18) bundles 2.0.26 ([3.10.0 POM](https://repo.maven.apache.org/maven2/org/apache/maven/maven/3.10.0/maven-3.10.0.pom), [3.10.1 POM](https://repo.maven.apache.org/maven2/org/apache/maven/maven/3.10.1/maven-3.10.1.pom), [3.10.2 POM](https://repo.maven.apache.org/maven2/org/apache/maven/maven/3.10.2/maven-3.10.2.pom)). [3.10.0 release notes](https://maven.apache.org/docs/3.10.0/release-notes.html): "Maven 3.10 is now using Resolver 2.0 lineage, same one that is used by Maven 4+". [Maven history](https://maven.apache.org/docs/history.html): the maintained series are 3.10.2 and 3.9.16.
- Maven 4.0.0-rc-7 (2026-09-21; `latest` in the metadata, no GA yet) bundles 2.0.23 ([maven-4.0.0-rc-7.pom](https://repo.maven.apache.org/maven2/org/apache/maven/maven/4.0.0-rc-7/maven-4.0.0-rc-7.pom)).
- Resolver on Central ([metadata](https://repo.maven.apache.org/maven2/org/apache/maven/resolver/maven-resolver-api/maven-metadata.xml)): 1.9.x ends at 1.9.27 (2026-02-20, no 1.9.28). 2.0.x newest is 2.0.26 (2026-11-18). In the window: 2.0.23 (2026-09-13), 2.0.24 (2026-09-27), 2.0.25 (2026-11-04), 2.0.26 (2026-11-18).

### 2. Resolver property names and unknown-name handling

Names per release, from the configuration pages:

| Resolver | Included-checksum flag | Algorithm list |
|---|---|---|
| [1.9.27](https://maven.apache.org/resolver-archives/resolver-1.9.27/configuration.html) | `aether.connector.smartChecksums` | `aether.checksums.algorithms` |
| [2.0.13](https://maven.apache.org/resolver-archives/resolver-2.0.13/configuration.html) and [2.0.14](https://maven.apache.org/resolver-archives/resolver-2.0.14/configuration.html) | `aether.connector.basic.smartChecksums` | `aether.layout.maven2.checksumAlgorithms` |
| [2.0.15](https://maven.apache.org/resolver-archives/resolver-2.0.15/configuration.html) to [current 2.0.26](https://maven.apache.org/resolver/configuration.html) | `aether.connector.basic.includedChecksums` | `aether.checksums.checksumAlgorithms` (plus `downloadChecksumAlgorithms` and `uploadChecksumAlgorithms`, since 2.0.15) |

The 2.0.15 release ([notes](https://github.com/apache/maven-resolver/releases/tag/maven-resolver-2.0.15), 2026-02-12) lists "Better checksum control (#1784)" and "Align configuration properties and more (#1785)", titles only. This rename predates the baseline. It is a baseline error, not a window change.

Unknown and legacy names: the [upgrade guide](https://maven.apache.org/resolver/upgrading-resolver.html) (version 2.0.26, rewritten by the 2.0.26 change "Rewrite the 1.x to 2.x upgrade guide", [release notes](https://github.com/apache/maven-resolver/releases/tag/maven-resolver-2.0.26), 2026-11-22 on GitHub) lists the 1.9.x keys `aether.connector.smartChecksums` and `aether.checksums.algorithms` with "Old key still read: yes" (also `aether.enhancedLocalRepository.*`, `aether.connector.basic.threads`, `aether.syncContext.named.time*`). It states: "Every other old key is ignored silently". No warning and no rejection was found. 2.0.26 also added "Read the 1.9.x name of the trackingFilename key as a fallback" (#2293). When the guide's alias behaviour first shipped is not stated; likely 2.0.15 (#1785), not determined.

### 3. Checksum design note and smartChecksums behaviour

- [about-checksums](https://maven.apache.org/resolver/about-checksums.html) (2.0.26, 2026-11-18) still says retrieved checksums "only provide integrity verification" and are not protection against man-in-the-middle or supply-chain attacks; trusted checksums are a separate mechanism ([expected-checksums](https://maven.apache.org/resolver/expected-checksums.html)). MVN-BUILD-12 core: unchanged. 2.0.24 documents "Clarified checksum trust boundaries (#2162)" ([2.0.24 notes](https://github.com/apache/maven-resolver/releases/tag/maven-resolver-2.0.24)), documentation only.
- The note does not mention smartChecksums at all. The "only ever validates SHA-1" claim in MVN-BUILD-13 is too narrow: expected-checksums says included checksums come from response headers, `x-checksum-sha1` and `x-checksum-md5` for Maven Central, plus `x-goog-meta-checksum-*` and `x-amz-meta-checksum-*` for Google and AWS S3 mirrors. Extraction from `x-amz-meta-*` headers was added in 2.0.22 (2026-08-24 on GitHub, before the window). Included checksums work only with transport-http, not transport-wagon. Verdict: SHA-1 and MD5 only, no SHA-256 or SHA-512; the load-bearing logic (stronger sibling algorithm list is bypassed while included checksums are on) is unchanged.
- `included-checksum-strategies.html` returned 404; strategy details not read.
- Defaults still `SHA-1,MD5`; default `omitChecksumsForExtensions` is now `.asc,.sigstore,.sigstore.json`.

### 4. Wrapper

- [maven-wrapper-plugin metadata](https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-wrapper-plugin/maven-metadata.xml): latest and release 3.3.4 (published 2025-09-08 per the [wrapper page](https://maven.apache.org/wrapper/), Central lastUpdated 2025-10-31). No newer. [GitHub releases](https://github.com/apache/maven-wrapper/releases): newest is 3.3.4, no release after 2026-09-12.
- [wrapper page](https://maven.apache.org/wrapper/) and [wrapper mojo](https://maven.apache.org/wrapper/maven-wrapper-plugin/wrapper-mojo.html): `wrapperSha256Sum` and `distributionSha256Sum` are unchanged, since 3.2.0, Required: No, no default. The page says "To apply verification, add" them, so opt-in. Not verified by default.

## Claim verdicts

| Claim at risk | Verdict | Detail |
|---|---|---|
| `maven-wrapper-plugin` `3.3.4` | unchanged | Source: wrapper metadata above. |
| "Resolver `1.9.27` bundled by Maven 3.9.16" | unchanged | Source: 3.9.16 POM. |
| "`2.0.x` bundled by Maven 4" | changed (incomplete) | Old: Maven 4 is the 2.0.x carrier. New: Maven 3.10.0 to 3.10.2 (2.0.24, 2.0.25, 2.0.26) also bundle 2.0.x; Maven 4.0.0-rc-7 bundles 2.0.23. Source: https://maven.apache.org/docs/3.10.0/release-notes.html. Date: 2026-09-27. |
| "old names ignored without error" (lifecycle table, row 9) | changed | Old: all 1.x names ignored. New: 2.x still reads `aether.connector.smartChecksums` and `aether.checksums.algorithms`; other old keys ignored silently. Source: https://maven.apache.org/resolver/upgrading-resolver.html. Date: guide rewritten 2026-11-18 (alias behaviour itself undated). |
| MVN-BUILD-11 2.0.x names `aether.checksums.checksumAlgorithms` and `aether.connector.basic.smartChecksums` | changed | `basic.smartChecksums` is correct only for 2.0.0 to 2.0.14; 2.0.15 and later use `aether.connector.basic.includedChecksums`. Source: 2.0.15 and 2.0.26 configuration pages. Date: 2026-02-12 (pre-baseline). |
| "current reference contains no entry for the old names" | changed | The current configuration page lists neither `aether.checksums.algorithms` nor `aether.connector.smartChecksums`, but the upgrade guide lists both as still read. |
| "Unrecognised system properties are ignored, not rejected" | unchanged | Confirmed: "ignored silently", no warning found. |
| "Maven 3.9.16 bundles 1.9.27, verified 2026-09-12" | unchanged | Re-verified 2026-11-27. |
| MVN-BUILD-12 integrity only | unchanged | |
| MVN-BUILD-13 smartChecksums "only SHA-1" | changed (narrower) | Headers carry SHA-1 and MD5; the property is now `includedChecksums` in 2.0.15 and later. |
| MVN-BUILD-14 optional, off by default | unchanged | |
| rules row 9 "Unrecognised resolver names are ignored, not rejected" | changed (qualified) | True only for names not in the upgrade-guide alias table. |

## Normative guidance candidates

1. Treat a resolver name as migration-sensitive on any Maven that bundles 2.x, not only Maven 4. Rationale: Maven 3.10.x is also 2.x. Verify: `grep -n 'aether\.' .mvn/maven.config` beside `grep distributionUrl .mvn/wrapper/maven-wrapper.properties`; a finding is any key outside the alias table beside `apache-maven-3.10.*` or `4.*`.
2. Name the current 2.x spellings `aether.connector.basic.includedChecksums` and `aether.checksums.checksumAlgorithms`; downgrade 1.x spellings from "silent no-op" to "works through the alias, but verify". Rationale: `smartChecksums` and `algorithms` are still read. Verify: grep for `basic.smartChecksums` or `layout.maven2.checksumAlgorithms` (stale 2.0.0 to 2.0.14 names, not in the alias table, ignored on 2.0.15 and later).
3. MVN-BUILD-13: say included checksums validate SHA-1 and MD5 only. Verify: reading heuristic against expected-checksums.
4. Keep MVN-BUILD-14 and the 3.3.4 pin. Verify: `grep -L distributionSha256Sum $(find . -name maven-wrapper.properties)`.

Severity: MVN-BUILD-11 shifts from MUST silent-failure to MUST name audit, since the common 1.x names survive; the stale 2.0.x names (`basic.smartChecksums`) are the silent no-ops.

## AI-agent angle

Models trained before 2026 will write `aether.connector.basic.smartChecksums` for 2.x (correct only through 2.0.14) and assume Maven 3 means resolver 1.x. Mechanical check: the greps above.

## Contested / evolving

Maven 4 is still RC (rc-7, 2026-09-21). 3.10 became the maintained series. Whether the wrapper plugin 3.3.x will ship a 3.10-aware release is unknown.

## Could not determine

Exact resolver release that began reading the 1.x names as aliases; the 2.0.15 PR bodies (#1784, #1785) were not fetched. `included-checksum-strategies.html` 404. JIRA issues were not opened (search only).

## Sources

| URL | What | Date |
|---|---|---|
| https://repo.maven.apache.org/maven2/org/apache/maven/resolver/maven-resolver-api/maven-metadata.xml | resolver versions | 2026-11-22 |
| https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/maven-metadata.xml | Maven versions | 2026-11-22 |
| https://repo.maven.apache.org/maven2/org/apache/maven/maven/3.9.16/maven-3.9.16.pom | bundled resolver | 2026-05-13 |
| https://repo.maven.apache.org/maven2/org/apache/maven/maven/3.10.0/maven-3.10.0.pom | bundled resolver | 2026-09-27 |
| https://repo.maven.apache.org/maven2/org/apache/maven/maven/4.0.0-rc-7/maven-4.0.0-rc-7.pom | bundled resolver | 2026-09-21 |
| https://maven.apache.org/docs/3.10.0/release-notes.html | 3.10 notes | 2026-09-27 |
| https://maven.apache.org/docs/history.html | maintained series | 2026-11 |
| https://maven.apache.org/resolver/configuration.html | current config | 2026-11-18 |
| https://maven.apache.org/resolver-archives/resolver-1.9.27/configuration.html | 1.x names | 2026-02 |
| https://maven.apache.org/resolver-archives/resolver-2.0.14/configuration.html | old 2.x names | 2025-12 |
| https://maven.apache.org/resolver-archives/resolver-2.0.15/configuration.html | renamed names | 2026-02 |
| https://maven.apache.org/resolver/upgrading-resolver.html | alias table, ignore rule | 2026-11-18 |
| https://maven.apache.org/resolver/about-checksums.html | design note | 2026-11-18 |
| https://maven.apache.org/resolver/expected-checksums.html | included headers | 2026-11 |
| https://github.com/apache/maven-resolver/releases (2.0.15, 2.0.24, 2.0.26 tags) | release notes | 2026-02 to 2026-11 |
| https://maven.apache.org/wrapper/ and wrapper-mojo.html | wrapper properties | 2025-09-08 |
| https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-wrapper-plugin/maven-metadata.xml, https://github.com/apache/maven-wrapper/releases | plugin versions | 2025-10-31 |

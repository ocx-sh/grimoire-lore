---
title: Jackson advisories, branch status and recycler pools, delta since 2026-06-04
pair: java-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 9
---

# Jackson advisories, branch status and recycler pools

Scope: a delta against the claims in `security-and-untrusted-input.md` (The Dated Numbers, JAVA-SEC-02) and `concurrency.md` (JAVA-CONC-08). Searched from 2026-06-04 to 2026-11-27. Only the GitHub Advisory Database (queried through `gh api /advisories`), the FasterXML release-notes files and the Jackson-Releases wiki were used.

## Summary

| Claim | Outcome |
|---|---|
| Floors `2.18.8` / `2.21.4` / `3.1.4` for jackson-databind | Changed. New floors are `2.18.12`, `2.21.8` and `3.1.8` (CVE-2026-110879, fixed 2026-10-17). The advisory itself is not yet in the GitHub Advisory Database, so the GHSA id is pending. |
| "fixed 2026-06-04" | Changed. The release notes date the fix releases 2026-05-28 (2.18.8, 2.21.4) and 2026-05-29 (3.1.4). The GHSA was published 2026-06-23. No source read gives 2026-06-04. |
| 2.18 is a safe floor line | Changed. 2.18 is still open, but only until the end of December 2026 and only for critical security backports. Say so in the floor list. |
| Mechanisms of CVE-2026-54512 / CVE-2026-54513 | Unchanged as mechanisms. They are incomplete, though: CVE-2026-110879 is a further PolymorphicTypeValidator bypass, and a further advisory is pending (GHSA-268j-6pjg-73vh). |
| JAVA-SEC-02 command misses the Jackson 3 group | Changed. It matters. Jackson 3 ships as `tools.jackson.core:jackson-databind`. |
| jackson-core must also be checked | Changed. jackson-core carries its own advisories. See finding 4. |
| JAVA-CONC-08 pool history and "five strategies" | Unchanged for 2.x. Changed for 3.x: 3.3.0 (2026-11-07) adds two pools. |

## Findings

### 1. New advisories raise the floors

Every advisory below was read through the GitHub Advisory Database API (`gh api /advisories/<id>`) and cross-read against the release notes.

| Advisory | Published | Fixed in (databind) | Note |
|---|---|---|---|
| GHSA-j3rv-43j4-c7qm / CVE-2026-54512 | 2026-06-23 | 2.18.8, 2.21.4, 3.1.4 | The old floor |
| GHSA-rmj7-2vxq-3g9f / CVE-2026-54513 | 2026-06-23 | 2.18.8, 2.21.4, 3.1.4 | The old floor |
| GHSA-mhm7-754m-9p8w (no CVE) | 2026-07-21 | 2.18.9, 2.21.5 | JsonView bypass |
| GHSA-5gvw-p9qm-jgwh / CVE-2026-59889 | 2026-07-21 | 2.18.9, 2.21.5, 3.1.5 | JsonView bypass |
| GHSA-vvgp-rfg2-7rr6 / CVE-2026-77310 | 2026-09-28 | 2.18.9, 2.21.5, 3.1.5 | Incomplete fix of CVE-2026-54514 (DNS lookup) |
| GHSA-gx83-3vf8-gh7j / CVE-2026-83557 | 2026-09-28 | 2.18.10, 2.21.6, 3.1.6 | Comparable missing from the unsafe base types |
| GHSA-q4xh-88c3-wmh7 / CVE-2026-68497 | 2026-09-28 | 2.18.10, 2.21.6, 3.1.6 | Number-parse DoS |
| GHSA-wjgm-6hv5-3cvf / CVE-2026-19032 | 2026-09-28 | 2.18.10, 2.21.6, 3.1.6 | Path scheme allowlist |
| GHSA-wv8q-qhhj-9h54 / CVE-2026-91776 | 2026-09-30 | 2.18.11, 2.21.7, 3.1.7 | Type-id cache growth (high) |
| GHSA-cxp5-3px4-pw24 / CVE-2026-91777 | 2026-09-30 | 2.18.11, 2.21.7, 3.1.7 | Quadratic forward references (high) |
| CVE-2026-110879 (#6287) | not in the GitHub DB | 2.18.12, 2.21.8, 3.1.8 | PolymorphicTypeValidator bypass through type parameters of generic type ids. Released 2026-10-17. |
| GHSA-268j-6pjg-73vh (#6496) | not in the GitHub DB | unreleased: 2.21.10, 3.1.10 | Validation on resolved content types. Not yet fixed in any release. |

Sources: the GitHub advisory pages for the ids above, [databind 2.x release notes](https://raw.githubusercontent.com/FasterXML/jackson-databind/2.x/release-notes/VERSION-2.x), [databind 2.18 release notes](https://raw.githubusercontent.com/FasterXML/jackson-databind/2.18/release-notes/VERSION-2.x), [databind 3.x release notes](https://raw.githubusercontent.com/FasterXML/jackson-databind/3.x/release-notes/VERSION).

Decision on question 1: yes. The old floors are no longer sufficient. CVE-2026-110879 is a polymorphic type validation bypass, so it is exactly the class JAVA-SEC-02 guards. The floors for polymorphic typing become `2.18.12`, `2.21.8` and `3.1.8`. Fix date 2026-10-17 (2.18.12, 2.21.8, 3.1.8, per the release notes). The GitHub Advisory Database returned 404 for the CVE id on 2026-11-27, so the GHSA id is pending. The 2.21.9 and 3.1.9 releases (2026-11-24) carry no CVE lines. The 2.22 and 3.2 lines are closed (see finding 2); their final fixes are 2.22.4 and 3.2.4.

The mechanism text for CVE-2026-54512 and CVE-2026-54513 stays accurate. The 3.x release notes describe the 110879 fix as a further tightening: type parameters and array element types validated like direct ids, and `allowIfSubTypeIsArray()` no longer accepts abstract or interface element types except `Number`. An allow-list that relies on `allowIfSubTypeIsArray()` therefore needs re-testing after the bump.

### 2. Branch maintenance

From the [Jackson-Releases wiki](https://github.com/FasterXML/jackson/wiki/Jackson-Releases), read 2026-11-27:

| Branch | Status |
|---|---|
| 2.18 | Open (LTS), until end of December 2026, backports for critical security fixes only |
| 2.19 | Closed |
| 2.21 | Open (LTS), at least until end of January 2028 |
| 2.22 | Closed in November 2026 with 2.23.0 |
| 3.1 | Open (LTS), at least until end of February 2028 |
| 3.2 | Closed in November 2026 with 3.3.0 |
| 3.3 | Open, not LTS, released 2026-11-07 |

Decision on question 2: 2.18 is not end-of-life today, but it ends in about five weeks. The floor list must not offer `2.18.12` as a long-term safe line. Write it as "2.18.12, supported only until the end of December 2026; prefer 2.21.8 or 3.1.8". Note that 2.22.x and 3.2.x are closed and stop at 2.22.4 and 3.2.4, so they must not appear as targets.

### 3. Jackson 3 group id

The advisory database lists the same advisories under two coordinates. For example GHSA-j3rv-43j4-c7qm covers `com.fasterxml.jackson.core:jackson-databind` (2.x, and also a 3.x range) and `tools.jackson.core:jackson-databind` (3.0.0 to 3.1.3, fixed 3.1.4). Later advisories (for example GHSA-gx83-3vf8-gh7j, GHSA-cxp5-3px4-pw24) list 3.x only under `tools.jackson.core`.

Decision on question 3: yes, the gap matters. The `-Dincludes=com.fasterxml.jackson.core:jackson-databind` filter in `security-and-untrusted-input.md` returns nothing for a Jackson 3 project, so a verifier reading an empty result could pass an unpatched `3.1.3`. Replace it with `-Dincludes='*:jackson-databind'`, or run both groups. The Gradle form `--dependency jackson-databind` already matches by name and is unaffected. Annotations stay in `com.fasterxml.jackson.core:jackson-annotations` under Jackson 3, so a project can legitimately show both groups at once.

### 4. jackson-core is also a floor

jackson-core has its own advisories (the `jackson-core` coordinate under both groups):

- GHSA-r7wm-3cxj-wff9 / CVE-2026-68494 (2026-07-21): async parser bypass of `maxNumberLength`. Fixed in 2.18.8, 2.21.4, 3.1.4.
- CVE-2026-68498 and GHSA-2c4j-63jj-9fqr: fixed 2.18.10, 2.21.6, 2.22.2, 3.1.6 (3.2.2).
- GHSA-p6pp-m3f8-5c89 / CVE-2026-89407 (2026-10-01, high): ReDoS in float number parsing. Fixed 2.18.11, 2.21.7, 2.22.3, 3.1.7, 3.2.2.
- CVE-2026-89425: fixed 2.18.11, 2.21.7, 3.1.7.
- CVE-2026-110729: fixed in 3.2.4 and 3.3.0 (the 3.1 line is not listed in the notes read).

Sources: [core 2.x release notes](https://raw.githubusercontent.com/FasterXML/jackson-core/2.x/release-notes/VERSION-2.x), [core 3.x release notes](https://raw.githubusercontent.com/FasterXML/jackson-core/3.x/release-notes/VERSION), GitHub advisory pages. These are denial-of-service issues on untrusted input and are not tied to polymorphic typing, so JAVA-SEC-02 as worded does not cover them. The pair currently pins no jackson-core floor. Candidate: add one row.

### 5. Recycler pools (JAVA-CONC-08)

From the [jackson-core 2.x release notes](https://raw.githubusercontent.com/FasterXML/jackson-core/2.x/release-notes/VERSION-2.x) and the [JsonRecyclerPools source](https://raw.githubusercontent.com/FasterXML/jackson-core/2.x/src/main/java/com/fasterxml/jackson/core/util/JsonRecyclerPools.java):

- 2.17.0 (2024-03-12): #1117 default changed to `newLockFreePool`. 2.17.1 (2024-05-04): #1256 reverts it to `threadLocalPool()`. Both unchanged.
- 2.18.0 (2024-09-26): #1271 "Deprecate `LockFreePool` implementation in 2.18 (remove from 3.0)". Unchanged.
- No entry in 2.19 to 2.23.0 touches `RecyclerPool` or `JsonRecyclerPools`. The default stays `threadLocalPool()`, and the Javadoc says it may change in Jackson 3.0.
- `JsonRecyclerPools` in 2.x still has five strategy classes: `ThreadLocalPool`, `NonRecyclingPool`, `ConcurrentDequePool`, `LockFreePool` (deprecated), `BoundedPool`. The quoted "five strategies" is accurate, with the caveat that one of them is deprecated.
- Jackson 3: 3.3.0 (2026-11-07) adds `StripedArrayPool` and a virtual-thread-aware `HybridPool` (#1687). The 3.x release notes do not name `JsonRecyclerPools` or the default pool. Whether the 3.3 default changed is "could not determine"; a read of the 3.x pool source was not made.

Decision on question 4: unchanged for the 2.x line the rule quotes. For 3.x, the count of strategies is now higher than five and the default is undetermined. JAVA-CONC-08 should say "in 2.x" and avoid a count for 3.x.

## Normative guidance candidates

1. Rule: in JAVA-SEC-02 and The Dated Numbers, the floors become `2.18.12`, `2.21.8` and `3.1.8`, with the note that 2.18 is supported only until the end of December 2026. Rationale: CVE-2026-110879 is a polymorphic validation bypass fixed on 2026-10-17. Verification: `./gradlew -q dependencyInsight --configuration runtimeClasspath --dependency jackson-databind` and read the resolved version against the floor for its line; fail on 2.22.x or 3.2.x below their final patch (2.22.4, 3.2.4) and on any 2.19.x or 3.0.x.
2. Rule: drop the `com.fasterxml.jackson.core:` prefix from the Maven check. Rationale: Jackson 3 is `tools.jackson.core`. Verification: `mvn -q dependency:tree -Dincludes='*:jackson-databind'` and `-Dincludes='*:jackson-core'`.
3. Rule: pin a jackson-core floor row (`2.18.11`, `2.21.7`, `3.1.7`, from CVE-2026-89407, fixed 2026-09-21) where untrusted JSON is parsed. Rationale: a ReDoS in number parsing, separate from the databind floor. Verification: same dependency command with `jackson-core`.
4. Rule: change "re-run on every release (floors dated 2026-06-04, verified 2026-09-12)" to the new dates, 2026-10-17 verified 2026-11-27, and mark that GHSA-268j-6pjg-73vh is unreleased and may raise the floor again to 2.21.10 / 3.1.10. Verification: re-read the VERSION-2.x file for any entry after 2.21.9.
5. Rule: in JAVA-CONC-08 add "in 2.x" to the strategy count and name the Jackson 3.3 additions. Verification: `grep -n "five strategies" skills/java-quality-reference/concurrency.md`.

## AI-agent angle

- A model with a mid-2026 cutoff treats `2.18.8` / `2.21.4` / `3.1.4` as current. Catch: grep the repository for those three literals and compare with this file.
- A model copies the `com.fasterxml.jackson.core` filter into Jackson 3 projects and reads an empty result as pass. Catch: run the wildcard filter in the candidate above.
- A model recommends 2.22 or 3.2 as the "newest safe" line. Both are closed. Catch: compare against the wiki table.

## Contested / evolving

- 2.18 end date (end of December 2026) is stated by the wiki, so the floor list will be stale in January 2027.
- The advisory for CVE-2026-110879 is not in the GitHub Advisory Database as of 2026-11-27. GHSA-268j-6pjg-73vh is fixed only in unreleased 2.21.10 / 3.1.10. Both may move floors. Re-check at the next refresh.
- The "fixed 2026-06-04" date in the pair could not be reproduced. The release notes say 2026-05-28 and 2026-05-29. Maven Central publication dates were not fetched, so this may be a Central date. Status: could not determine.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://github.com/advisories?query=ecosystem%3Amaven+jackson-databind | Advisory listing | read 2026-11-27 | Enumerates advisories |
| GitHub advisory pages via `gh api /advisories/<GHSA>` for GHSA-j3rv-43j4-c7qm, rmj7-2vxq-3g9f, mhm7-754m-9p8w, 5gvw-p9qm-jgwh, vvgp-rfg2-7rr6, gx83-3vf8-gh7j, q4xh-88c3-wmh7, wjgm-6hv5-3cvf, wv8q-qhhj-9h54, cxp5-3px4-pw24, r7wm-3cxj-wff9, p6pp-m3f8-5c89 | Patched ranges per coordinate | 2026-06 to 2026-10 | Primary, ranges |
| https://raw.githubusercontent.com/FasterXML/jackson-databind/2.x/release-notes/VERSION-2.x | databind 2.x notes | to 2.23.0 | Primary, fix dates |
| https://raw.githubusercontent.com/FasterXML/jackson-databind/2.18/release-notes/VERSION-2.x | databind 2.18 notes | to 2.18.12 | Primary. Only the first 100000 of 150027 characters were read. |
| https://raw.githubusercontent.com/FasterXML/jackson-databind/3.x/release-notes/VERSION | databind 3.x notes | to 3.3.1 | Primary, CVE-2026-110879 detail |
| https://raw.githubusercontent.com/FasterXML/jackson-core/2.x/release-notes/VERSION-2.x | core 2.x notes | to 2.23.0 | Primary, pool history |
| https://raw.githubusercontent.com/FasterXML/jackson-core/3.x/release-notes/VERSION | core 3.x notes | to 3.4.0 | Primary, HybridPool |
| https://raw.githubusercontent.com/FasterXML/jackson-core/2.x/src/main/java/com/fasterxml/jackson/core/util/JsonRecyclerPools.java | Pool source | 2.x branch | Primary, strategy count |
| https://github.com/FasterXML/jackson/wiki/Jackson-Releases | Branch status | read 2026-11-27 | Primary, maintenance |

Gap: fewer than 12 distinct sources, because the delta question has a small primary-source set. Content read through a summarising fetch tool, so exact wording of release-note lines is paraphrased from tool output, not from raw text.

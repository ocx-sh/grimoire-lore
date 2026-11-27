---
title: "java-quality delta: SpotBugs, find-sec-bugs, Checkstyle, PMD, Semgrep p/java, SonarJava (2026-09-12 to 2026-11-27)"
pair: java-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 24
---

# java-quality delta: static-analysis tool versions and rule keys

Baseline: `.agents/research/jvm-java-runtime-safety.md` (2026-09-12) and its `find-sec-bugs-viability.md`.
This is a delta. Anything marked "unchanged" stays exactly as written in the shipped files.

## Contents

- [Summary](#summary)
- [Findings](#findings)
- [Claim-by-claim ledger](#claim-by-claim-ledger)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- SpotBugs did NOT remove `IO.close(InputStream)`. It is still present, annotated `@Deprecated(forRemoval = true)`, in tag `4.10.5` and on `master`. The javadoc now says "will be removed in or after October 2026", which is softer than the "one year" wording in the baseline.
- Because the method is still present, find-sec-bugs `1.14.0` does not break against SpotBugs `4.10.5`. The forbidden window stays exactly `4.9.5` and `4.9.6` (Gradle plugin `6.4.1` and `6.4.2`). No new window is needed today.
- find-sec-bugs `1.15.0` has NOT shipped. The newest tag and release is still `version-1.14.0` (2025-06-17), now about 17 months old. `master` is `1.15.0-SNAPSHOT`, still active (last commit 2026-11-03), repository not archived, and builds against SpotBugs `4.10.5`.
- find-sec-bugs issue 766 was closed on 2026-03-25 and its maintainer comment says no release avoids the call; the open risk is "SpotBugs removes the method before find-sec-bugs releases". It has not been removed as of 2026-11-27, but it can happen in any SpotBugs release from now on.
- Current versions: SpotBugs `4.10.5` (2026-10-12); SpotBugs Gradle plugin `6.5.15` (2026-11-26), defaulting to SpotBugs `4.10.5` since `6.5.13`; find-sec-bugs `1.14.0`; Checkstyle `14.4.0` (2026-10-31); PMD `7.30.0` (2026-11-27); SonarJava `9.0.0.60184` (tag 2026-11-27, previous `8.46.0.59609`); Semgrep `p/java` still 60 rules.
- Checkstyle current major is 14 (`14.0.0`, 2026-08-18). Its Java runtime floor is 21 (`java.version` is `21` in the pom at `checkstyle-13.0.0` and `checkstyle-14.4.0`; it was `11` at `checkstyle-10.21.0`). The corpus's "Checkstyle 10.21.0" in lint-gate Group 3 is a measured pin, not a current version.
- SonarJava `S4507` is NOT a Security Hotspot any more. Commit `d1532ce` (2026-06-11, before the baseline date) changed its type from `SECURITY_HOTSPOT` to `VULNERABILITY` and tagged it `former-hotspot`. The same commit did the same for `S2245`. The baseline's "S4507 is a Security Hotspot" was already stale on 2026-09-12 and should be corrected.
- `S2245`, `S1181`, `S2142`, `S4507` are in the open-source `sonar-java` plugin and in the `Sonar_way` profile, so they are Community-tier. `S2095`, `S2076` and the path-injection key have no metadata in `sonar-java` `master`; tier could not be fully determined (details below).
- Checkstyle shipped rulesets at `checkstyle-14.4.0`: `google_checks.xml` has 88 enabled modules by my count (baseline said 89 at an unstated tag) and `sun_checks.xml` has 73. The named differences still hold.
- PMD 7.30.0 Java rule count by my count is 313 rules (22 marked deprecated) with 19 at priority 1; the baseline said 315 and 18. Counting method is not reproducible from the baseline, so treat the old numbers as "approximately unchanged".

## Findings

### 1. SpotBugs and `IO.close(InputStream)`

- `CHANGELOG.md` on `master` has the entry "Add back and deprecate `edu.umd.cs.findbugs.io.IO.close(InputStream)` method. (#3756)" under 4.9.7. Neither the 4.10.5 section nor the "Unreleased" section lists any removal of it. The only "Removed" item under Unreleased is the premature `jakarta.annotation.concurrent.*` support ([CHANGELOG](https://github.com/spotbugs/spotbugs/blob/master/CHANGELOG.md)).
- `IO.java` at tag `4.10.5` and on `master` still declares `public static void close(@Nullable InputStream inputStream)` with `@Deprecated(forRemoval = true)` and the javadoc "This method is deprecated and will be removed in or after October 2026. Use try-with resources when creating the stream instead." ([IO.java at 4.10.5](https://github.com/spotbugs/spotbugs/blob/4.10.5/spotbugs/src/main/java/edu/umd/cs/findbugs/io/IO.java)).
- Releases in the window: `4.10.5` published 2026-10-12 (changelog dated 2026-10-11). No `4.11.0` or `5.0.0` exists as of 2026-11-27 ([releases](https://github.com/spotbugs/spotbugs/releases)).
- Relevant `4.10.5` change for the security gate: "Fix `PT_ABSOLUTE_PATH_TRAVERSAL` false negative for `new File(parent, child)`" and a fix so that find-sec-bugs bugs are ranked like core bugs of the same category (the `-maxRank` / default rank threshold hid them before). The second one is under Unreleased, not in `4.10.5`.

### 2. find-sec-bugs

- Releases: newest is `version-1.14.0`, 2025-06-17. No `1.15.0` release or tag ([releases](https://github.com/find-sec-bugs/find-sec-bugs/releases)).
- `master`: last commit 2026-11-03 (merge of #778 "Include Jakarta in taint analysis"), plus 2026-11-01 merges adding Java 25 support and OWASP 2025 references. Root `pom.xml` is `1.15.0-SNAPSHOT` and manages SpotBugs at `4.10.5`. Repository is not archived (`archived: false`) ([commits](https://github.com/find-sec-bugs/find-sec-bugs/commits/master)).
- Issue [#766](https://github.com/find-sec-bugs/find-sec-bugs/issues/766) is closed (2026-03-25). The maintainer's 2025-10-16 comment states that the method will be removed from SpotBugs core after one year and that no find-sec-bugs release lacks the call.
- I scanned every `findsecbugs-plugin/src/main/java` file on `master` for `IO.close` and `edu.umd.cs.findbugs.io.IO`; there is no hit, so the call appears to be gone from `master` sources. No release carries this. Not tied to a specific commit, so treat it as "fix is on master, unreleased" (matches the baseline).
- Consequence: a consumer on find-sec-bugs `1.14.0` and a SpotBugs that finally removes the method gets `NoSuchMethodError` at analysis time. That is not true today.

### 3. SpotBugs Gradle plugin

- Latest `6.5.15` (2026-11-26, a Plugin Portal tag fix). `6.5.13` (2026-10-12) bumped the default SpotBugs to `4.10.5` ([6.5.13 notes](https://github.com/spotbugs/spotbugs-gradle-plugin/releases/tag/6.5.13)). I did not open `6.5.14`, so "`6.5.15` defaults to `4.10.5`" is an inference from `6.5.13` plus the `6.5.15` notes showing no dependency change.
- The README "SpotBugs version mapping" table is stale: its newest row is still `6.5.6 -> 4.10.2`, then `6.4.4 -> 4.9.8`, `6.4.3 -> 4.9.7`, `6.4.2 -> 4.9.6`, `6.4.1 -> 4.9.5` ([README](https://github.com/spotbugs/spotbugs-gradle-plugin#spotbugs-version-mapping)). Do not cite the README table for "current"; cite the release notes.

### 4. Checkstyle

- Releases: `14.2.0` and `14.3.0` on 2026-09-27, `14.4.0` on 2026-10-31. Major 14 started with `14.0.0` on 2026-08-18 (adds `module-info.java` grammar support) ([releases](https://github.com/checkstyle/checkstyle/releases)).
- Java floor: `<java.version>21</java.version>` in `pom.xml` at `checkstyle-14.4.0` and `checkstyle-13.0.0`; `11` at `checkstyle-10.21.0` ([pom 14.4.0](https://github.com/checkstyle/checkstyle/blob/checkstyle-14.4.0/pom.xml)). The 14.x release notes mention updating the JRE matrix for 14.x. This is the build target, and Checkstyle's documented minimum runtime follows it.
- `14.4.0` adds many new checks (for example `FinalPatternVariable`, `NoCauseGetMessageInExceptionConstructor`, `ExceptionThrowShouldUseContext`, `RedundantThis`, `BlockCommentEndPositionCheck` for Google style) ([14.4.0 notes](https://github.com/checkstyle/checkstyle/releases/tag/checkstyle-14.4.0)).
- Shipped rulesets at `checkstyle-14.4.0` (comments stripped, `Checker` and `TreeWalker` excluded, one count per distinct module name): `google_checks.xml` 88, `sun_checks.xml` 73. At `checkstyle-10.21.0` the Google file counts 73 the same way, so the ruleset grew with the version and the baseline's 89 was measured at some other tag or counting rule. Google-only still includes `EmptyCatchBlock`, `MissingOverrideOnRecordAccessor`, `TextBlockGoogleStyleFormatting`; Sun-only still includes `MagicNumber`, `HiddenField`, `DesignForExtension`. The sets are still not nested ([google_checks.xml](https://github.com/checkstyle/checkstyle/blob/checkstyle-14.4.0/src/main/resources/google_checks.xml), [sun_checks.xml](https://github.com/checkstyle/checkstyle/blob/checkstyle-14.4.0/src/main/resources/sun_checks.xml)).

### 5. PMD

- Releases: `7.28.0` (2026-09-25), `7.29.0` (2026-10-30), `7.30.0` (2026-11-27). No PMD 8 yet ([7.30.0 notes](https://github.com/pmd/pmd/releases/tag/pmd_releases%2F7.30.0)).
- `7.30.0`: security fix GHSA-p8c4-pmh9-36vf (StackOverflowError in regex of `UnnecessaryImport`, `AvoidUsingHardCodedIP`, `VfUnescapeEl`, affected `pmd-java` up to 7.29.0); new Java rule `ControlFlowInTest`; `AddEmptyString` deprecated for removal in 8.0.0.
- Rule counts from the eight Java category XMLs at tag `pmd_releases/7.30.0`: 313 rules (22 deprecated), 19 with `<priority>1</priority>`, `security` category 2 rules (`HardCodedCryptoKey`, `InsecureCryptoIv`). Baseline said "315 rules, 18 priority-1". The security category is unchanged at two rules.

### 6. Semgrep `p/java`

- The registry endpoint `https://semgrep.dev/api/registry/rulesets/java` returns 60 rule ids on 2026-11-27. No id contains "random". XML-factory rules present: `xmlinputfactory-possible-xxe`, `documentbuilderfactory-*` (4 rules), `saxparserfactory-disallow-doctype-decl-missing`, `transformerfactory-dtds-not-disabled`, which covers four factory families (XMLInputFactory, DocumentBuilderFactory, SAXParserFactory, TransformerFactory). Unchanged versus baseline ("4 of 8 factories", "60-rule"). The date of any upstream change inside the window cannot be established from a snapshot; the count is identical.

### 7. SonarJava rule keys (closes open question 1)

Source of truth: `SonarSource/sonar-java` `master`, directory `sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java/` (rule metadata) and `.../profiles/Sonar_way/` (default profile). `rules.sonarsource.com` is a client-rendered page and returned identical HTML for every key, so it was not usable.

| Key | In OSS plugin metadata | In `Sonar_way` | `type` | Tags of note | Verdict |
|---|---|---|---|---|---|
| `S2245` PRNGs in security contexts | yes | yes | `VULNERABILITY` (was `SECURITY_HOTSPOT` until 2026-06-11) | `former-hotspot` | Community-tier, Issue (Vulnerability). Matches `java.util.Random` and `Math.random()` in security contexts. |
| `S1181` Throwable and Error should not be caught | yes | yes | `CODE_SMELL` | `cwe`, `cert` (CWE-396, CERT ERR08-J) | Community-tier, Issue. |
| `S2142` InterruptedException and ThreadDeath should not be ignored | yes | yes | `BUG` | CWE-391 | Community-tier, Issue. |
| `S4507` debugging features in production | yes | yes | `VULNERABILITY` (was `SECURITY_HOTSPOT` until 2026-06-11) | `former-hotspot` | Community-tier, Issue (Vulnerability, severity Minor). The baseline's "Security Hotspot, invisible to the no-new-Issues gate" is no longer true on current SonarJava. |
| `S1148` printStackTrace | no metadata file | no | n/a | n/a | Could not determine; not present in `master`, consistent with "deprecated". |
| `S2095` resources should be closed | no. Last touched 2024-06-05 by commit "SONARJAVA-4975 Create custom rules plugin around symbolic execution engine" | no | n/a | n/a | Moved out of the OSS plugin into a separate symbolic-execution plugin. Tier could not be determined from primary sources. |
| `S2076` OS command injection | no | no | n/a | n/a | No metadata in OSS `sonar-java`; taint-analysis rules are described by Sonar staff and community as Developer Edition and above (secondary source, weak: [taint analysis thread](https://community.sonarsource.com/t/taint-analysis-capability/70624)). Treat as commercial-only, unverified. |
| path-traversal key (candidate `S2083`) | no | no | n/a | n/a | Key could not be confirmed from a primary source; no metadata in OSS repo. Do not cite a key in the shipped files. |

- Note on `S2755` (XXE), which the viability dive called Community-tier: its metadata was also removed from the OSS plugin in 2024-06 ("Remove forgotten SE rules metadata", commit dated 2024-06-19). It now lives with the symbolic-execution rules. The baseline's Community-tier claim for `S2755` should be downgraded to "could not determine".
- The Sonar docs Java page says only that Java analysis is available in all editions and does not state per-rule tiers ([docs](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/languages/java)).
- SonarJava releases in the window: `8.45.0.59462` (2026-10-22), `8.46.0.59609` (2026-10-29), `9.0.0.60184` (2026-11-27) ([releases](https://github.com/SonarSource/sonar-java/releases)). I did not open the `9.0.0` notes; a major bump may change profiles, so re-check `Sonar_way` membership if a gate depends on it.

## Claim-by-claim ledger

| Claim at risk | Status | Detail |
|---|---|---|
| `findsecbugs-plugin 1.14.0`, released 2025-06-17, "15 months stale", "a 1.15.0 ships" | changed (age only) | Still `1.14.0`, now about 17 months stale; `1.15.0` has not shipped. Old text "15 months stale at this date" -> "17 months stale as of 2026-11-27". Source: [releases](https://github.com/find-sec-bugs/find-sec-bugs/releases). Date: 2026-11-27 (no upstream release). |
| "Current is `6.5.6`, mapping to SpotBugs `4.10.2`" | changed | Plugin `6.5.15` (2026-11-26), default SpotBugs `4.10.5` from `6.5.13` (2026-10-12). Source: [plugin releases](https://github.com/spotbugs/spotbugs-gradle-plugin/releases). |
| Forbidden window plugin `6.4.1`/`6.4.2` (SpotBugs `4.9.5`/`4.9.6`) | unchanged | Method still present in `4.10.5`, so no new break. README table still maps `6.4.1 -> 4.9.5`, `6.4.2 -> 4.9.6`. |
| SpotBugs restored `IO.close(InputStream)` deprecated with a one-year clock ending around October 2026; no release carries the fix | changed | The clock has passed without removal. Javadoc now: "removed in or after October 2026". `forRemoval = true`. Still present in `4.10.5` and `master`. No find-sec-bugs release lacks the call. Source: [IO.java](https://github.com/spotbugs/spotbugs/blob/4.10.5/spotbugs/src/main/java/edu/umd/cs/findbugs/io/IO.java). Date: no removal as of 2026-11-27. |
| JAVA-SEC-08 "commits through 2026-03-25, repository unarchived" | changed | Commits through 2026-11-03 (Jakarta taint analysis, Java 25 support); still unarchived. Source: [commits](https://github.com/find-sec-bugs/find-sec-bugs/commits/master). |
| JAVA-SEC-10 "`toolVersion = \"4.9.7\"` or higher ... or plugin `6.4.3` or newer" | unchanged | Still correct as a floor. Candidate to add: explain that `4.9.7` is only the floor and that the pin must be rechecked on each SpotBugs release until a find-sec-bugs release without the call exists. |
| Failure mode 7 | unchanged | Wording about `NoSuchMethodError` at 4.9.5/4.9.6 remains true. |
| JAVA-SEC-03 "Semgrep `p/java` covers only 4 of the 8 factories" | unchanged | Registry on 2026-11-27 holds the same four factory families. |
| JAVA-SEC-07 "Semgrep's 60-rule `p/java`" | unchanged | 60 ids; no rule id contains "random". |
| JAVA-SEC-07 "SonarJava `S2245` not independently verified" | changed | Verified: Community-tier, `VULNERABILITY` (ex-hotspot since 2026-06-11), in `Sonar_way`. Source: [S2245.json](https://github.com/SonarSource/sonar-java/blob/master/sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java/S2245.json). |
| errors-and-resources: `S2095`, `S1181`, `S2142` not checked | changed | `S1181` and `S2142` verified Community-tier Issues (CODE_SMELL, BUG). `S2095` could not be determined (moved to a separate plugin in 2024-06). |
| errors-and-resources: `S4507` is a Security Hotspot | changed | It is `VULNERABILITY` with tag `former-hotspot` since 2026-06-11 (commit `d1532ce`). Source: [commit](https://github.com/SonarSource/sonar-java/commit/d1532ced2c48ef09e8ef1edb86899e2f214acd83). |
| errors-and-resources: `S1148` deprecated | could not determine | No metadata in `master`; consistent with deprecation but not proof. |
| lint-gate Group 3: Checkstyle `10.21.0`, PMD 7, find-sec-bugs `1.14.0` (2025-06-17) | changed (Checkstyle, PMD) | Checkstyle current is `14.4.0`, PMD `7.30.0`. find-sec-bugs `1.14.0` unchanged. If `10.21.0` is a corpus-measured pin, keep it labelled as such. |
| JAVA-LINT-08 `google_checks.xml` 89, `sun_checks.xml` 73, named symmetric difference | changed (Google count) | At `checkstyle-14.4.0`: Google 88, Sun 73 by the counting rule in section 4. Named examples unchanged. State the tag when quoting counts. |
| JAVA-LINT-09 "18 of PMD 7's 315 Java rules" | changed | At `7.30.0`: 313 rules, 19 priority-1; security category still two rules. |
| JAVA-LINT-10 "144 vulnerability types, 800-plus API signatures" and "175 patterns" | could not determine | Not re-measured in this delta. find-sec-bugs `master` gained Jakarta taint analysis and Java 25 support, so the signature count may have grown on `master`, but the released `1.14.0` is unchanged, so the numbers stay valid for the release. |

## Normative guidance candidates

1. **Pin, then recheck on every SpotBugs release.**
   Rule: where find-sec-bugs `1.14.0` is on the SpotBugs classpath, pin SpotBugs to an exact version in the `4.9.7`-to-`4.10.5` range and re-run the gate before bumping to any release newer than `4.10.5`.
   Rationale: the removal clock ("in or after October 2026") has expired, and no find-sec-bugs release lacks the call.
   Verification: `grep -rn "toolVersion" --include=*.gradle* .`; in CI run `./gradlew spotbugsMain` after the bump and fail on `NoSuchMethodError`. Reading heuristic: any dependency-bot PR that bumps `com.github.spotbugs` past `4.10.5` needs a green `spotbugsMain` run attached.
2. **Name the break symptom.**
   Rule: JAVA-SEC-10 and failure mode 7 list `java.lang.NoSuchMethodError: edu.umd.cs.findbugs.io.IO.close(Ljava/io/InputStream;)V` as the signature of both the 4.9.5/4.9.6 break and the future removal break.
   Rationale: an agent that sees this error must not "fix" it by disabling the task.
   Verification: `grep -rn "IO.close" build/reports 2>/dev/null` and reading the Gradle failure text.
3. **Do not cite the Gradle plugin README table as "current".**
   Rule: cite release notes for the default SpotBugs of a plugin version.
   Rationale: the README table stops at `6.5.6 -> 4.10.2` while releases are at `6.5.15`.
   Verification: compare against `gh api repos/spotbugs/spotbugs-gradle-plugin/releases`.
4. **Correct S4507 and S2245 wording.**
   Rule: replace "S4507 is a Security Hotspot" with "S4507 and S2245 are Vulnerability Issues on SonarJava since 2026-06-11 (tag `former-hotspot`); older SonarQube servers that ship an earlier SonarJava still render them as Hotspots, so check the server's SonarJava version before relying on the gate".
   Rationale: the type change is in `sonar-java` metadata dated 2026-06-11, but a server only takes it up when its bundled analyzer updates.
   Verification: `gh api repos/SonarSource/sonar-java/contents/sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java/S4507.json -H 'Accept: application/vnd.github.raw' | jq .type`.
5. **Do not name `S2076`, a path-traversal key, `S2095` or `S2755` as a Community-tier gate.**
   Rule: describe them as "taint or symbolic-execution rules, tier not verified" or drop the key and use the grep.
   Rationale: none has metadata in the open-source plugin; a verification column that depends on them is not honest.
   Verification: `ls sonar-java-plugin/src/main/resources/profiles/Sonar_way/ | grep -E "S(2076|2095|2755|2083)"` returns nothing on `sonar-java` `master`.
6. **State the tag when quoting Checkstyle or PMD counts.**
   Rule: write "Google 88 / Sun 73 at `checkstyle-14.4.0`" and "313 rules / 19 priority-1 at PMD `7.30.0`".
   Rationale: the counts move with every release (Google was 73 at `10.21.0`).
   Verification: reproduce with the Python snippet pattern in the method note below.
7. **Checkstyle runtime.**
   Rule: when a repo pins Checkstyle `13.x` or `14.x`, require JDK 21 or newer for the Checkstyle task; `10.x` pins stay on JDK 11.
   Rationale: `java.version` is 21 from `13.0.0` onward.
   Verification: `grep -rn "checkstyle" --include=*.gradle* --include=pom.xml .` and compare with the toolchain version.

Method note for rule 6: strip XML comments, collect `<module name="...">`, drop `Checker` and `TreeWalker`, count distinct names.

## AI-agent angle

- An agent trained on 2025 data will recommend `spotbugs { toolVersion = "4.9.5" }` or an older plugin. Mechanical check: forbid `4.9.5`/`4.9.6` with the grep from candidate 1.
- An agent may write "find-sec-bugs `1.15.0`" or `4.11.0` as if they exist. Mechanical check: `gh api repos/find-sec-bugs/find-sec-bugs/releases --jq '.[0].tag_name'` returns `version-1.14.0`.
- An agent will repeat "S4507 is a Hotspot" from the baseline. Mechanical check: candidate 4's `jq .type`.
- An agent will invent Sonar keys for path traversal (`S2083` is a guess) and cite them as default-on. Mechanical check: candidate 5's `ls`.
- An agent will assume Checkstyle runs on JDK 11 because `10.x` did. Mechanical check: the pom `java.version` property at the pinned tag.

## Contested / evolving

- Removal of `IO.close(InputStream)`: the date wording changed from a hard "one year" to "in or after October 2026". Trend: SpotBugs may remove it in any minor release; find-sec-bugs `master` already dropped the call, so a `1.15.0` release is the only fix. Neither project has announced a date. As of 2026-11-27.
- SonarSource is converting former Hotspot rules into Vulnerability Issues in the open-source analyzer (the `former-hotspot` tag appears on `S2245`, `S2077`, `S4507`, `S4790`). Which SonarQube server version surfaces this is not established here.
- SonarJava `9.0.0` (tag 2026-11-27) was not read; its effect on profiles is unknown.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/spotbugs/spotbugs/blob/master/CHANGELOG.md | SpotBugs changelog (primary) | read 2026-11-27 | Shows no removal of `IO.close`; `4.10.5` entries |
| https://github.com/spotbugs/spotbugs/blob/4.10.5/spotbugs/src/main/java/edu/umd/cs/findbugs/io/IO.java | `IO.java` at tag 4.10.5 (primary) | 2026-10-12 | The deprecated method and its javadoc |
| https://github.com/spotbugs/spotbugs/releases | SpotBugs releases (primary) | `4.10.5` 2026-10-12 | Current version |
| https://github.com/spotbugs/spotbugs/pull/3756 | PR restoring and deprecating the method (primary) | 2025-10 | Origin of the clock |
| https://github.com/spotbugs/spotbugs-gradle-plugin/releases | Gradle plugin releases (primary) | `6.5.15` 2026-11-26 | Current plugin and default SpotBugs bump |
| https://github.com/spotbugs/spotbugs-gradle-plugin#spotbugs-version-mapping | README mapping table (primary) | stale at `6.5.6` | The `6.4.1`/`6.4.2` window rows |
| https://github.com/find-sec-bugs/find-sec-bugs/releases | find-sec-bugs releases (primary) | `1.14.0` 2025-06-17 | No `1.15.0` |
| https://github.com/find-sec-bugs/find-sec-bugs/commits/master | find-sec-bugs commit log (primary) | last 2026-11-03 | Activity and unarchived state |
| https://github.com/find-sec-bugs/find-sec-bugs/blob/master/pom.xml | root pom (primary) | `1.15.0-SNAPSHOT`, SpotBugs 4.10.5 | Master's SpotBugs target |
| https://github.com/find-sec-bugs/find-sec-bugs/issues/766 | NoSuchMethodError issue (primary) | closed 2026-03-25 | Maintainer statement that no release avoids the call |
| https://github.com/checkstyle/checkstyle/releases/tag/checkstyle-14.4.0 | Checkstyle 14.4.0 notes (primary) | 2026-10-31 | Current release |
| https://github.com/checkstyle/checkstyle/blob/checkstyle-14.4.0/pom.xml | pom at 14.4.0 (primary) | 2026-10-31 | `java.version` 21 |
| https://github.com/checkstyle/checkstyle/blob/checkstyle-14.4.0/src/main/resources/google_checks.xml | shipped Google ruleset (primary) | 2026-10-31 | Module count |
| https://github.com/checkstyle/checkstyle/blob/checkstyle-14.4.0/src/main/resources/sun_checks.xml | shipped Sun ruleset (primary) | 2026-10-31 | Module count |
| https://github.com/pmd/pmd/releases/tag/pmd_releases%2F7.30.0 | PMD 7.30.0 notes (primary) | 2026-11-27 | Current release, security fix, deprecations |
| https://github.com/pmd/pmd/tree/pmd_releases/7.30.0/pmd-java/src/main/resources/category/java | PMD Java category XMLs (primary) | 2026-11-27 | Rule and priority-1 counts |
| https://semgrep.dev/api/registry/rulesets/java | Semgrep registry export of `p/java` (primary) | fetched 2026-11-27 | 60 rule ids |
| https://github.com/SonarSource/sonar-java/tree/master/sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java | SonarJava rule metadata (primary) | master 2026-11 | `type`, tags, presence per key |
| https://github.com/SonarSource/sonar-java/commit/d1532ced2c48ef09e8ef1edb86899e2f214acd83 | commit converting `S4507` and `S2245` to Vulnerability (primary) | 2026-06-11 | Date of the Hotspot-to-Issue change |
| https://github.com/SonarSource/sonar-java/tree/master/sonar-java-plugin/src/main/resources/profiles/Sonar_way | default profile (primary) | master 2026-11 | Community-tier membership |
| https://github.com/SonarSource/sonar-java/releases | SonarJava releases (primary) | `9.0.0.60184` 2026-11-27 | Current version |
| https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/languages/java | Sonar Java docs (secondary) | read 2026-11-27 | States no per-rule edition split |
| https://community.sonarsource.com/t/taint-analysis-capability/70624 | Sonar community thread (weak secondary) | 2022-08 | Only support for "taint rules are Developer Edition" |
| https://rules.sonarsource.com/java/RSPEC-4507/ | rules site (not usable) | fetched 2026-11-27 | Client-rendered; returned the same page for every key |

---
title: java-quality delta refresh decision, 2026-09-12 to 2026-11-27
pair: java-quality
date: 2026-11-27
window_start: 2026-09-12
model: opus
consolidates:
  - .agents/research/refresh-2026-11/java-quality/openjdk-27-ga-28-concurrency.md
  - .agents/research/refresh-2026-11/java-quality/openjdk-removals-and-javac-lint.md
  - .agents/research/refresh-2026-11/java-quality/errorprone-nullaway-jspecify.md
  - .agents/research/refresh-2026-11/java-quality/spotbugs-findsecbugs-checkstyle-pmd-sonar.md
  - .agents/research/refresh-2026-11/java-quality/jackson-advisories-and-recycler-pools.md
  - .agents/research/refresh-2026-11/java-quality/junit-surefire-gradle-test-coverage.md
  - .agents/research/refresh-2026-11/java-quality/api-gate-and-framework-floors.md
  - .agents/research/refresh-2026-11/java-quality/recent-shifts-java-quality.md
revises:
  - .agents/research/jvm-quality-gates.md
  - .agents/research/jvm-platform-and-toolchains.md
  - .agents/research/jvm-java-runtime-safety.md
  - .agents/research/jvm-concurrency.md
  - .agents/research/jvm-language-api.md
---

# java-quality delta refresh decision

This is a delta update of the pair `rules/java-quality.md` plus `skills/java-quality-reference/`, baselined 2026-09-12. Everything not named below stays exactly as written. Every change is backed by a primary source fetched in one of the eight delta artifacts listed in the frontmatter.

## Contents

1. Verdict
2. Changed rules
3. New rules
4. Confirmed unchanged
5. Open questions
6. Revision log
7. Edit list
8. Sources per changed fact

## 1. Verdict

- The rule index `rules/java-quality.md` is not edited. Every statement in it is still true on 2026-11-27: the eight-of-nine `DISABLED_CHECKS` claim holds at Error Prone 2.53.0, the pinned floor 17 / toolchain 25 / matrix 17, 21, 25 stands, and non-negotiable 13 stays until JDK 28 reaches GA. The rule's `bump` is `none`.
- The reference skill gets corrected facts in seven depth files and two new rules, so its `bumpSkill` is `minor`.
- New rule JAVA-SEC-11: cap every allocation sized by outside input (decompressed bytes, declared lengths and counts, serialization filter limits). Oracle's Secure Coding Guidelines 11.1 DOS-1 and a run of in-window advisories back it, and no existing row bounds bytes.
- New rule JAVA-PLAT-19: never mutate a `final` field through deep reflection. JEP 500 (JDK 26) warns by default and announces a `deny` default.
- The Jackson floor in JAVA-SEC-02 rises to `2.18.12`, `2.21.8` or `3.1.8`. The higher figures in the dedicated Jackson artifact (CVE-2026-110879, fixed 2026-10-17, read from FasterXML release notes) win over the lower figures in the recent-shifts artifact, because they supersede them and sit on the same lines. The 2.22 and 3.2 lines are closed and are not offered as targets. A jackson-core row joins the Dated Numbers table, and the Maven check drops its `com.fasterxml.jackson.core:` filter, which prints nothing for Jackson 3.
- The `sun.misc.Unsafe` "throws, 26 or later" row is wrong as written: through JDK 27 and the 28 early-access build the default is still `warn`. It is changed in place, and JEP 500 and the JDK 27 `ThreadPoolExecutor.finalize()` removal join the table.
- JAVA-PLAT-15 and agents item 12 were wrong that no JDK switch exists. `java.properties.date` is documented in `Properties.store` from JDK 18 (the 17 javadoc lacks it; the 18, 19 and 20 javadocs state it).
- Error Prone 2.43.0 and later needs JDK 21 to run, and 2.46.0 and later needs `-XDaddTypeAnnotationsToSymbol=true` on JDK 21. This does not move the pinned matrix, but JAVA-PLAT-02 now states how the 17 leg compiles, and the Group 1 preamble states the current versions next to the floors.
- `InterruptedInCatchBlock` is in `ENABLED_WARNINGS` only from Error Prone 2.47.0, not at the 2.36.0 floor. The set counts in JAVA-LINT-02 are replaced with counts that reproduce at 2.53.0. `GuardedByUtils`' five-package list holds only from 2.48.0, and 2.36.0 matched by simple name, so JAVA-CONC-16's rationale gets the version range.
- `StructuredTaskScope` is final in JDK 28 through JEP 543 (integrated, GA 2027-03-09). The "targeted at 28" text and the wrong `Scope: SE` re-check trigger are replaced. JAVA-CONC-05 itself is unchanged until GA.
- JAVA-LINT-07 gains the JDK 26 `-Werror:<keys>` form, so its verification no longer flags a correct 26+ configuration. JAVA-CONC-05 gains the warning that `--enable-preview` disables the `preview` lint category.
- SonarJava facts are corrected: `S4507` and `S2245` are Vulnerability Issues since 2026-06-11, `S1181` and `S2142` are verified Community-tier Issues, and `S2095`'s tier is unverified.
- SpotBugs, find-sec-bugs, Checkstyle, PMD, Surefire, JUnit and japicmp numbers are refreshed where a row states them. The `IO.close(InputStream)` removal clock has run out without the removal, so JAVA-SEC-10 now requires a re-run before any SpotBugs core past 4.10.5.
- JEP 401 value objects, JEP 542 PEM and JEP 540 JSON are JDK 28 preview, final-but-unreleased and incubator respectively. None is added before JDK 28 GA; they are open questions.

## 2. Changed rules

Old text is quoted from the file, new text is what replaces it. The exact replacements are in the Edit list.

| ID | Old text | New text | Source |
|---|---|---|---|
| JAVA-LINT-02 | "Eight sit in Error Prone 2.36.0's `DISABLED_CHECKS` (150 members against 187 `ENABLED_ERRORS` and 312 `ENABLED_WARNINGS`, verified 2026-09-12)" | Eight sit in `DISABLED_CHECKS` at every release from 2.36.0 through 2.53.0, with 156 / 187 / 310 at 2.53.0, read 2026-11-27 | `BuiltInCheckerSuppliers.java` at tags v2.36.0 to v2.53.0 (errorprone-nullaway-jspecify.md, section 2) |
| JAVA-LINT-07 | "`all` plus `-Werror` turns a toolchain bump into a build break"; verification flags any `-Werror` beside `-Xlint:all` | Adds that JDK 26 and later `javac` accepts `-Werror:<keys>`, absent on the pinned 25; verification flags a bare `-Werror` only | JDK 25, 26 and 27 javac manuals (recent-shifts, C3) |
| JAVA-LINT-08 | "`google_checks.xml` (89 enabled modules) and `sun_checks.xml` (73)" | 88 and 73 at `checkstyle-14.4.0` | shipped rulesets at the 14.4.0 tag (spotbugs-findsecbugs artifact, section 4) |
| JAVA-LINT-09 | "Only 18 of PMD 7's 315 Java rules" | Only 19 of PMD 7.30.0's 313 Java rules | PMD category XMLs at `pmd_releases/7.30.0` |
| JAVA-ERR-01 | "`InterruptedInCatchBlock` (Error Prone 2.36.0 `ENABLED_WARNINGS`, verified 2026-09-12)" | In `ENABLED_WARNINGS` from 2.47.0, in no set before it | `BuiltInCheckerSuppliers.java` at tags 2.37.0 to 2.49.0 |
| JAVA-ERR-03 | `MustBeClosedChecker` named with no `Arena` mention | `MustBeClosedChecker` requires `Arena.ofConfined()` and `Arena.ofShared()` to be closed from 2.51.0 | Error Prone 2.51.0 release notes |
| JAVA-ERR-07 | "Do not rely on SonarJava `S4507`: it is a Security Hotspot" | Do not rely on it without reading the server's analyzer version: retyped to Vulnerability on 2026-06-11 | sonar-java commit d1532ce and `S4507.json` |
| JAVA-SEC-02 | floors `2.18.8`, `2.21.4`, `3.1.4`; "floors dated 2026-06-04, verified 2026-09-12" | floors `2.18.12`, `2.21.8`, `3.1.8`; adds CVE-2026-110879 and the deny-list default validator; "floors dated 2026-10-17, verified 2026-11-27" | FasterXML databind release notes (CVE-2026-110879, #6287), GHSA-gx83-3vf8-gh7j (CVE-2026-83557, the `Comparable` deny-list gap; a different advisory) |
| JAVA-SEC-07 | "SonarJava `S2245` was **not** independently verified as of 2026-09-12" | Community-tier, in `Sonar_way`, typed Vulnerability since 2026-06-11 | `S2245.json`, `Sonar_way` profile |
| JAVA-SEC-08 | "commits through 2026-03-25 ... maintainers explicitly declining to track current SpotBugs in their own build" | commits through 2026-11-03, `master` building against SpotBugs 4.10.5, no release since 1.14.0 | find-sec-bugs commits and root `pom.xml` |
| JAVA-SEC-10 | "Set `spotbugs { toolVersion = "4.9.7" }` or higher explicitly, or use plugin `6.4.3` or newer." | Same, plus a required gate re-run before any core newer than 4.10.5, with the matching verification clause | `IO.java` at tag 4.10.5 ("removed in or after October 2026") |
| JAVA-PLAT-02 | "(**25** as of 2026-09-12)"; Spring and JUnit floor "as of 2026-09-12" | 25 as of 2026-11-27, next LTS 29; Spring Boot 4.2.0 still at 17; the 17 leg compiles on the toolchain, and a JDK 17 `javac` caps Error Prone at 2.42.0 | Oracle support roadmap, Spring Boot system requirements, Error Prone 2.43.0 notes and install page |
| JAVA-PLAT-03 | "NullAway 0.12.11+ throws `IllegalStateException` ... (verified 2026-09-12)" | Adds 0.14.2's more precise detection, the 2.46.0 flag requirement on JDK 21, and the 2.42.0 ceiling on the 17.0.19+ arm | NullAway 0.14.2 notes, Error Prone 2.46.0 notes and issue 5426 |
| JAVA-PLAT-09 table | "`sun.misc.Unsafe` memory access throws / 26 or later"; "Verified 2026-09-12." | Not yet thrown by default (still `warn` in 27 and 28 EA); adds JEP 500 (26) and `ThreadPoolExecutor.finalize()` removal (27); "Verified 2026-11-27." | `java` man pages 25 to 28 EA, JEP 498, JEP 500, Oracle JDK 27 release notes |
| JAVA-PLAT-10 | verification names `DefaultCharset` and `DM_DEFAULT_ENCODING` only | Adds `PreferCharsetOverload` for the string-named overloads, and one grep pattern for charset-name literals | Error Prone 2.51.0 notes, `PreferCharsetOverload` check page |
| JAVA-PLAT-15 | "Pin `java.properties.date` on the Maven side ... where no built-in flag exists (checked against the JDK 25 public surface, 2026-09-12)" | The property is a JDK feature documented from JDK 18, set on the JVM that runs `store()`, or the subclass | `Properties.store(Writer,String)` javadoc, JDK 18 to 27 |
| JAVA-CONC-03 | "HikariCP #1463 is a live report of exactly that case" | JEP 491 still lists class-initializer blocking; #1463 is an open thread, last active 2025-04-12 | JEP 491, HikariCP issue page |
| JAVA-CONC-05 | verification ends at the literal-string grep warning | Adds: never detect preview use with `-Xlint:preview`, which `--enable-preview` disables | JDK 26 and 27 javac manuals |
| JAVA-CONC-08 | "Its `JsonRecyclerPools` now offers five strategies rather than a winner." | Five in 2.x, one deprecated; Jackson 3.3.0 adds two pools, so no count for 3.x | jackson-core 2.x source and 3.x release notes |
| JAVA-CONC-16 | "(2.36.0, read 2026-09-12)"; "`GuardedByUtils` recognises exactly five packages" | 2.36.0 through 2.53.0; explicit list from 2.37.0, five packages from 2.48.0, simple-name match at 2.36.0; `ThreadSafe` as the bug-pattern name | `GuardedByUtils.java` and `ThreadSafeChecker.java` at tags |
| JAVA-NULL-06 | "known gaps on lambda-heavy call patterns ([NullAway#1290])" | The wiki's outstanding generic-inference list is the standing evidence; #1290 closed in 0.14.4 | NullAway wiki JSpecify-Support, issue 1290 |
| JAVA-TEST-01 | "requiring Java 17 and Kotlin 2.2, and 6.1.3 is current as of 2026-09-12" | Java 17 and Kotlin 2.1 baseline; 6.1.3 newest GA on 2026-11-27, 6.2.0-M1 a milestone; only 5.14.x of the 5 line supported | JUnit release notes, release list, `SECURITY.md` |
| JAVA-TEST-05 | "four PRs merged 2025 to 2026 ... read 2026-09-12" | merged 2021 to 2025, three first shipped in 5.12.0, read 2026-11-27 | GitHub PRs and compare API |
| JAVA-TEST-12 | verification queries `search.maven.org/solrsearch` | queries `maven-metadata.xml`; rationale notes the stale Solr index and 3.6.1 as newest GA | Central `maven-metadata.xml`, Solr query on 2026-11-27 |
| JAVA-API-03 | "Linkage survives (JLS SE 25 §13.5.3)" | §13.5.4, Interface Members (§13.5.3 is Superinterfaces) | JLS SE 27 chapter 13, same numbering as SE 25 |

Section-level corrections that carry no rule ID are in the Edit list: the Group 1, 2 and 3 preambles of lint-gate.md, the first two bullets of errors-and-resources.md, the Dated Numbers table, the resolved-version command and the frontmatter summary of security-and-untrusted-input.md, the Dates and Floors bullet of concurrency.md, the JSpecify row of the nullness flavour table, the japicmp and revapi notes of api-and-evolution.md, agents items 8 (errors) and 12 (platform), and the SKILL.md index row.

## 3. New rules

### JAVA-SEC-11

- Rule: cap every allocation sized by input that crossed a trust boundary. Read decompressed or streamed outside data through a byte ceiling, never through `readAllBytes()` or an unbounded `transferTo`. Check every declared length, count or uncompressed size against a named maximum before it sizes a buffer, an array or a collection. A Java-serialization filter carries `maxbytes`, `maxarray`, `maxdepth` and `maxrefs` limits beside its class allow-list.
- Rationale: Oracle's Secure Coding Guidelines for Java SE, document version 11.1 (November 2026), guideline DOS-1, says to limit decompressed size rather than trust compressed size or metadata, and to check untrusted sizes, lengths and counts before allocating. In-window advisories share the shape: snappy-java GHSA-q233-g92q-qxp6 (output buffer from the declared length, fixed 1.1.10.9), lz4-java GHSA-4v53-57pg-c464 and GHSA-6cx8-rjf8-pr8g (1.11.2), Guava GHSA-xxph-c9ww-hj94 (`CompactHashMap` `readObject`, 33.7.2), async-http-client GHSA-7grg-jcf7-rpmx and GHSA-x8v2-478q-2hvg, HAPI FHIR GHSA-3w98-rrpr-fprr and PGPainless GHSA-cvx8-9ff6-54xq. JAVA-SEC-01 bounds classes, JAVA-SEC-03 XML expansion and JAVA-SEC-05 paths; nothing bounds bytes, and no lint names the shape.
- Verification: a grep for `readAllBytes`, the decompressing stream types and the serialization-filter calls, then a read of every hit on outside data. A hit with no byte ceiling, or with a declared length used before it is checked, is the finding; empty output is the pass. A filter pattern with a class list and no limit clause is the finding for the serialization half.
- Severity: MUST.
- Placement: security-and-untrusted-input.md, in the "No Core SpotBugs Detector Exists" table after JAVA-SEC-06, with its grep block after JAVA-SEC-06's. The file grows by about seven lines, to roughly 225, and keeps its table of contents.

### JAVA-PLAT-19

- Rule: never mutate a `final` field through deep reflection (`Field.setAccessible(true)` followed by `set`) in shipped code or in tests. Use a constructor, a builder or a package-private seam, and leave the rest to serialization libraries, which JEP 500 directs to `sun.reflect.ReflectionFactory`.
- Rationale: JEP 500 (delivered in JDK 26) warns by default under `--illegal-final-field-mutation=warn` and says `deny` will become the default in a future release. A helper that passes on 25 warns on a consumer's 26 and will later throw. A model asked to "set a private final field in a test" generates exactly this.
- Verification: grep `setAccessible(true)` with three lines of context, then read for a following `set` on a `final` field; that is the finding, and empty output is the pass. Where a JDK 26 or newer launcher is available, one suite run with `--illegal-final-field-mutation=deny`, where a failure is the finding.
- Severity: SHOULD.
- Numbering: the PLAT family's highest number in use is 18. Numbers 16 and 17 appear nowhere in the pair or its consolidations, so they are treated as possibly retired and not reused.
- Placement: platform-and-versions.md, "Before a JDK Major Moves" table after JAVA-PLAT-09, with its grep after JAVA-PLAT-07's.

## 4. Confirmed unchanged

- JAVA-LINT-01, 03, 04, 05, 06, 10 and 11: no upstream change. `OnlyNullMarked` and `AnnotatedPackages` are still mutually exclusive, and the `jspecifyMode` JDK and vendor matrix and the `IllegalStateException` text are unchanged on the NullAway wiki.
- The nine JAVA-LINT-02 names and the four sibling names sit in the same sets at 2.36.0, 2.50.0 and 2.53.0. `BanJNDI` is already `ENABLED_ERRORS`, so its promotion is a no-op, which the rule text does not contradict.
- The `-Xlint` key set (39 named keys plus `none`) is identical in javac 25, 26, 27 and 28 EA, and `synchronization` is still a deprecated alias of `identity`.
- JAVA-ERR-02, 04, 05 and 06: `ExecutorService.close()` still has no timeout in JDK 27, and finalization still has no removal JEP.
- JAVA-SEC-01, 03, 04, 05, 06 and 09. Semgrep `p/java` still has 60 rules and covers four of the eight XML factories. New zip-slip and XML-helper advisories confirm SEC-05's "a fix for one archive does not cover a sibling" and SEC-03's same-method clause. JDK 25.0.5's JNDI and JAXP defaults are runtime backstops that change no rule. The forbidden SpotBugs window is still exactly plugin 6.4.1 and 6.4.2.
- JAVA-PLAT-01, 05, 06, 07, 08, 11, 14 and 18. JEP 472's `deny` default still has no release. JEP 400's `COMPAT` is still documented in the JDK 27 `Charset` javadoc. The JNI, Applet, 32-bit and finalization rows of the removal table are correct.
- JAVA-CONC-01, 02, 04, 06, 07 and 09 to 17 apart from the edits above. The JDK 27 GA javadoc matches every `StructuredTaskScope` and `Joiner` member JAVA-CONC-06 names. The `jdk.VirtualThreadPinned` threshold is still 20 ms. `ScopedValue.orElse(null)` still throws. `Process.waitFor(Duration)` is still `Since: 24`. `ThreadSafeChecker` is still in no built-in set.
- JAVA-API-01, 02, 04 and the rest: japicmp still classifies an added interface method as binary-compatible and raises nothing on a changed constant value. The cited JLS sections other than §13.5.3 still carry the same numbers in SE 27.
- JAVA-NULL-01 to 05: JSpecify 1.0.1 made no semantic change, and Kotlin's strict JSpecify default is unchanged.
- JAVA-DATA rows: `EqualsHashCode` is still in `ENABLED_ERRORS` (2.53.0 also flags `hashCode` without `equals`, which extends what the preamble claims without contradicting it). `CheckOptionalEmptiness` still defaults to `false`.
- JAVA-TEST-02, 03, 04, 06, 07, 08, 09, 10 and 11. `junit-platform-runner` was removed without replacement. The default execution mode is still `same_thread`. `jvm-test-suite` is still incubating in Gradle 9.9.2. The quoted JaCoCo fragment "is not a task dependency of the `check` task" is still a verbatim substring of the Gradle 9.9.2 page.
- Rule index: Spring Boot and JUnit floors at 17, JDK 25 as the current LTS, and all sixteen non-negotiables.

## 5. Open questions

- JDK 28 GA (scheduled 2027-03-09). Re-fetch the final `StructuredTaskScope` and `Joiner` javadoc, then revisit JAVA-CONC-05, JAVA-CONC-06 and non-negotiable 13. At the same point decide on a JEP 401 value-objects CONSIDER row (identity-sensitive operations on `Integer`, `Optional` and `java.time` types under `--enable-preview`, per the inside.java heads-up of 2026-10-27), a JEP 542 PEM row for a 28 floor, and whether JEP 540 (Simple JSON, incubator) affects JAVA-API-15.
- Whether Error Prone 2.46.0 and later runs at all on an Oracle JDK 21, where NullAway documents the type-annotation flag as unsupported.
- JUnit 6.2.0 GA. The recent-shifts artifact read the 6.2.0-M1 notes as making the worker-thread-pool executor the default, deprecating `ExtensionContext.Store` and tightening `@CsvSource`; the testing artifact could not read those notes. Nothing changes before GA.
- Jackson: the GHSA id for CVE-2026-110879; GHSA-268j-6pjg-73vh is fixed only in the unreleased 2.21.10 and 3.1.10 and may raise the floor; whether 2.22.4 and 3.2.4 carry the 110879 fix; 2.18 support ends at the end of December 2026, so the floor row needs a January 2027 re-read; the Jackson 3.3 default recycler pool.
- SonarJava 9.0.0 (tagged 2026-11-27) was not read, so `Sonar_way` membership may move. The tiers of `S2095`, `S2076`, `S2755` and any path-traversal key are unverified.
- find-sec-bugs 1.15.0 and SpotBugs' removal of `IO.close(InputStream)`: neither has a date.
- `deny` defaults for JEP 472, JEP 498 and JEP 500 have no announced release.
- Oracle Secure Coding Guidelines INJECT-9 (NaN and infinity from untrusted `Double.valueOf`): whether it is new in 11.1 is unknown, so no row is added.
- The JDK 28 early-access `ReflectionFactory.newConstructorForSerialization` two-argument deprecation is draft text.
- `java.properties.date`: propagation through the Gradle daemon's `org.gradle.jvmargs` is untested, and whether JDK 18 or 19 already documented it is unknown.
- The exact JDK that introduced `-Werror:<keys>` and the "`--enable-preview` disables preview lint" sentence: present in the 26 manual, absent from 25.
- Not re-measured: the 32-repository corpus counts, find-sec-bugs' signature counts in JAVA-LINT-10, Gradle 9's own JSR-305 switch cited in JAVA-NULL-04, Gradle's `junit5ForTests` pin, Maven JaCoCo `haltOnFailure`, the October 2026 Oracle CPU CVE table, and the OWASP Path Traversal and Java Security cheat-sheet changes of November and October 2026.

## 6. Revision log

- JAVA-LINT Group 1 preamble: current versions beside the floors, Error Prone's JDK 21 run floor and JDK 21 flag requirement, NullAway upgrade findings.
- JAVA-LINT-02: set counts replaced with 2.53.0 counts, release range stated.
- JAVA-LINT Group 2 preamble: key set re-verified identical through JDK 28 EA.
- JAVA-LINT-07: `-Werror:<keys>` from JDK 26, verification narrowed to a bare `-Werror`.
- JAVA-LINT Group 3 preamble: Checkstyle 10.21.0 marked as a corpus pin, current Checkstyle 14.4.0 and its Java 21 target, PMD 7.30.0, find-sec-bugs still newest.
- JAVA-LINT-08: Google ruleset count 88 at the stated tag.
- JAVA-LINT-09: PMD counts 19 of 313 at 7.30.0.
- errors-and-resources preamble: `DISABLED_CHECKS` release range; SonarJava key bullet rewritten from verified metadata.
- JAVA-ERR-01: `InterruptedInCatchBlock` from 2.47.0.
- JAVA-ERR "On by default" preamble: release range.
- JAVA-ERR-03: `Arena` closing under `MustBeClosedChecker` from 2.51.0.
- JAVA-ERR-07 and errors agents item 8: `S4507` retyped to Vulnerability on 2026-06-11.
- security frontmatter and SKILL.md row: input-sized allocation named.
- JAVA-SEC-08: commit recency and the contradicted "declining to track current SpotBugs" clause replaced.
- JAVA-SEC-10: re-run before any core past 4.10.5.
- JAVA-SEC-07: `S2245` verified.
- JAVA-SEC-11: new rule and grep block.
- Dated Numbers: date, Jackson databind floor, new jackson-core row, find-sec-bugs age, SpotBugs plugin current version, `IO.close` clock.
- Resolved-version command: wildcard group for Jackson 3, jackson-core too.
- JAVA-SEC-02: floors, CVE-2026-110879, deny-list default validator, dates.
- JAVA-PLAT-02: LTS date, Spring Boot 4.2.0, the 17-leg compile rule and its verification.
- JAVA-PLAT-03: NullAway 0.14.2 detection, Error Prone flag and JDK 17 ceiling.
- JAVA-PLAT-09 table: Unsafe row corrected, JEP 500 and `ThreadPoolExecutor.finalize()` rows, date.
- JAVA-PLAT-19: new rule and grep block.
- JAVA-PLAT-10: `PreferCharsetOverload` and a charset-name literal pattern.
- JAVA-PLAT-15 and platform agents item 12: `java.properties.date` is a JDK property. Corrected in the source check: the property first appears in the JDK 18 javadoc, not 20, and the published text now says 18.
- concurrency Dates and Floors: JEP 543 final in 28, correct re-check trigger.
- JAVA-CONC-03: HikariCP hedge, JEP 491 as the primary.
- JAVA-CONC-05: `-Xlint:preview` is not a detector.
- JAVA-CONC-08: pool count scoped to 2.x, Jackson 3.3 additions.
- JAVA-CONC-16: release ranges for the sets and `GuardedByUtils`, `ThreadSafe` name.
- nullness flavour table: JSpecify 1.0.1.
- JAVA-NULL-06: evidence moved from closed #1290 to the wiki's outstanding list.
- JAVA-TEST-01: Kotlin 2.1, newest GA, 5.14.x support.
- JAVA-TEST-05: PR dates and 5.12.0.
- JAVA-TEST-12: verification moved off the stale Solr index.
- api-and-evolution: japicmp 0.27.0 detection note, revapi status note, JAVA-API-03 JLS section.
- JAVA-SEC-11 (spillover round): the advisory window is measured by GitHub Advisory Database listing date, because both lz4-java advisories were published 2026-08-06, before the window.

## 7. Edit list

Apply in order. "Find" text is verbatim from the current file; "Replace" is the full replacement. For an insertion, "Anchor" is verbatim and "Insert after" is placed on the line after it. Table rows are single lines.

### 1. skills/java-quality-reference/lint-gate.md

Find:

```
pass. Floors verified 2026-09-12: `error_prone_core` 2.36.0, `net.ltgt.errorprone`
5.1.1, `net.ltgt.nullaway` 3.2.0, NullAway 0.12.11, JSpecify 1.0 (2024-07-17).
```

Replace:

```
pass. Floors: `error_prone_core` 2.36.0, `net.ltgt.errorprone` 5.1.1,
`net.ltgt.nullaway` 3.2.0, NullAway 0.12.11, JSpecify 1.0.0 (2024-07-17). Newest
on 2026-11-27: 2.53.0, 5.2.0, 3.3.0, 0.14.4, and JSpecify 1.0.1, which changed
packaging and documentation only. Error Prone 2.43.0 and later runs only on JDK
21 or newer (2.42.0 is the last release that runs on 17), and 2.46.0 and later
needs `-XDaddTypeAnnotationsToSymbol=true` on every compile that runs on JDK 21.
`JAVA-PLAT-02` and `JAVA-PLAT-03` own what that means for the CI matrix. A
NullAway bump past 0.13 adds findings to code that passed (the JDK models in
0.14.0, and unboxing checks in 0.14.3 and 0.14.4 that fire even outside JSpecify
mode): re-baseline it in a change with no production edits, never by
suppression (`JAVA-CORE-01`).
```

### 2. skills/java-quality-reference/lint-gate.md

Find:

```
Eight sit in Error Prone 2.36.0's `DISABLED_CHECKS` (150 members against 187 `ENABLED_ERRORS` and 312 `ENABLED_WARNINGS`, verified 2026-09-12) and never fire without a switch.
```

Replace:

```
Eight sit in `DISABLED_CHECKS` at every release from Error Prone 2.36.0 through 2.53.0 (at 2.53.0 that set has 156 members against 187 `ENABLED_ERRORS` and 310 `ENABLED_WARNINGS`, read 2026-11-27) and never fire without a switch.
```

### 3. skills/java-quality-reference/lint-gate.md

Find:

```
`this-escape` arrives in JDK 21, JDK 25's `javac` carries 40 `-Xlint` keys, and
`synchronization` is now a deprecated alias of `identity`.
```

Replace:

```
`this-escape` arrives in JDK 21, JDK 25's `javac` carries 40 `-Xlint` keys, and
`synchronization` is now a deprecated alias of `identity`. The key set is
identical in the JDK 26, 27 and 28 early-access `javac` (read 2026-11-27).
```

### 4. skills/java-quality-reference/lint-gate.md

Find:

```
`all` is open-ended, and every JDK release adds keys, so `all` plus `-Werror` turns a toolchain bump into a build break.
```

Replace:

```
`all` is open-ended, and every JDK release adds keys, so `all` plus `-Werror` turns a toolchain bump into a build break. From JDK 26, `javac` also accepts `-Werror:<keys>`, which fails only on the named categories, so on a 26 or newer toolchain `-Xlint:all -Werror:<the enumerated keys>` keeps new keys visible without breaking on a bump. The pinned 25 toolchain's `javac` has no such form.
```

### 5. skills/java-quality-reference/lint-gate.md

Find:

```
Co-occurrence with `-Werror` in one file is the finding, and empty output on that second command is the pass.
```

Replace:

```
Co-occurrence with a bare `-Werror` in one file is the finding, while `-Werror:<keys>` on a JDK 26 or newer toolchain is not, and empty output on that second command is the pass.
```

### 6. skills/java-quality-reference/lint-gate.md

Find:

```
Gate: `./gradlew check` or `mvn verify`. Floors verified 2026-09-12: Checkstyle
10.21.0, PMD 7, Spotless via `com.diffplug.spotless`, find-sec-bugs 1.14.0
(released 2025-06-17).
```

Replace:

```
Gate: `./gradlew check` or `mvn verify`. Floors verified 2026-09-12: Checkstyle
10.21.0 as pinned in the measured corpus, PMD 7, Spotless via
`com.diffplug.spotless`, find-sec-bugs 1.14.0 (released 2025-06-17, still the
newest release on 2026-11-27). Newest on 2026-11-27: Checkstyle 14.4.0, which
targets Java 21 from 13.0.0 on where 10.x targeted 11, and PMD 7.30.0.
```

### 7. skills/java-quality-reference/lint-gate.md

Find:

```
`google_checks.xml` (89 enabled modules) and `sun_checks.xml` (73) are not nested
```

Replace:

```
`google_checks.xml` (88 enabled modules at `checkstyle-14.4.0`) and `sun_checks.xml` (73 at the same tag) are not nested
```

### 8. skills/java-quality-reference/lint-gate.md

Find:

```
Only 18 of PMD 7's 315 Java rules carry its own priority-1
```

Replace:

```
Only 19 of PMD 7.30.0's 313 Java rules carry its own priority-1
```

### 9. skills/java-quality-reference/errors-and-resources.md

Find:

```
  `InterruptedExceptionSwallowed` are all in Error Prone 2.36.0's
  `DISABLED_CHECKS` (read from `BuiltInCheckerSuppliers.java`, verified
  2026-09-12).
```

Replace:

```
  `InterruptedExceptionSwallowed` are all in Error Prone's `DISABLED_CHECKS` at
  every release from 2.36.0 through 2.53.0 (read from
  `BuiltInCheckerSuppliers.java`, verified 2026-11-27).
```

### 10. skills/java-quality-reference/errors-and-resources.md

Find:

```
- **Three SonarJava keys below are cited from the catalogue, not verified.**
  `S2095`, `S1181` and `S2142` were not independently checked as of 2026-09-12.
  Before treating SonarQube as this family's gate, confirm each key is
  Community-tier and rendered as an Issue rather than a Security Hotspot. A
  Security Hotspot is invisible to the usual "no new Issues" quality gate, which
  is exactly how `JAVA-ERR-07` loses its Sonar coverage.
```

Replace:

```
- **Two of the three SonarJava keys below are verified, and one is not.**
  `S1181` (a code smell) and `S2142` (a bug) are open-source `sonar-java` rules
  in the default `Sonar_way` profile, so they are Community-tier Issues (read
  2026-11-27). `S2095` left the open-source plugin in June 2024 for a separate
  symbolic-execution plugin and its tier is unverified, so confirm it on the
  server before treating SonarQube as this family's gate. A Security Hotspot is
  invisible to the usual "no new Issues" quality gate, which is why each key's
  type matters.
```

### 11. skills/java-quality-reference/errors-and-resources.md

Find:

```
`InterruptedInCatchBlock` (Error Prone 2.36.0 `ENABLED_WARNINGS`, verified 2026-09-12) catches only the first mistake.
```

Replace:

```
`InterruptedInCatchBlock` (in `ENABLED_WARNINGS` from Error Prone 2.47.0, and in no set before it, verified 2026-11-27) catches only the first mistake.
```

### 12. skills/java-quality-reference/errors-and-resources.md

Find:

```
fire under a plain Error Prone run (2.36.0, verified 2026-09-12), so the gate
```

Replace:

```
fire under a plain Error Prone run (2.36.0 through 2.53.0, verified 2026-11-27), so the gate
```

### 13. skills/java-quality-reference/errors-and-resources.md

Find:

```
`StreamResourceLeak` and `MustBeClosedChecker`, both on by default, plus SonarJava `S2095` where SonarQube runs (key unverified, see above).
```

Replace:

```
`StreamResourceLeak` and `MustBeClosedChecker`, both on by default (from 2.51.0 `MustBeClosedChecker` also requires `Arena.ofConfined()` and `Arena.ofShared()` to be closed), plus SonarJava `S2095` where SonarQube runs (key unverified, see above).
```

### 14. skills/java-quality-reference/errors-and-resources.md

Find:

```
**Do not rely on SonarJava `S4507`**: it is a Security Hotspot, invisible to a "no new Issues" quality gate.
```

Replace:

```
**Do not rely on SonarJava `S4507` without reading the server's analyzer version**: SonarJava retyped it from Security Hotspot to Vulnerability on 2026-06-11 (tag `former-hotspot`), and a server bundling an older SonarJava still renders it as a Hotspot, invisible to a "no new Issues" quality gate.
```

### 15. skills/java-quality-reference/errors-and-resources.md

Find:

```
8. **Citing deprecated SonarJava `S1148`, or citing `S4507` without knowing it is
   a Security Hotspot.**
```

Replace:

```
8. **Citing deprecated SonarJava `S1148`, or citing `S4507` without checking
   whether the server's SonarJava still renders it as a Security Hotspot.**
```

### 16. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
summary: The JAVA-SEC family: deserialization filters, per-factory XML hardening, path containment, subprocess construction, unpredictable randomness, the Jackson version floor, and wiring find-sec-bugs
```

Replace:

```
summary: The JAVA-SEC family: deserialization filters, per-factory XML hardening, path containment, subprocess construction, input-sized allocation bounds, unpredictable randomness, the Jackson version floor, and wiring find-sec-bugs
```

### 17. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
The plugin is alive (commits through 2026-03-25, repository unarchived) but slow, with maintainers explicitly declining to track current SpotBugs in their own build.
```

Replace:

```
The plugin is alive (commits through 2026-11-03, `master` building against SpotBugs 4.10.5, repository unarchived, verified 2026-11-27) but slow: no release has followed 1.14.0 in seventeen months.
```

### 18. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
Set `spotbugs { toolVersion = "4.9.7" }` or higher explicitly, or use plugin `6.4.3` or newer.
```

Replace:

```
Set `spotbugs { toolVersion = "4.9.7" }` or higher explicitly, or use plugin `6.4.3` or newer, and re-run the gate before accepting any SpotBugs core newer than `4.10.5`.
```

### 19. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
The 4.9.5/4.9.6 combination is a hard `NoSuchMethodError` build break, not a missed finding.
```

Replace:

```
The 4.9.5/4.9.6 combination is a hard `NoSuchMethodError` build break, not a missed finding, and SpotBugs' restored `IO.close(InputStream)`, the method 1.14.0 calls, is deprecated for removal "in or after October 2026", so any core release after `4.10.5` can reopen the same break.
```

### 20. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
and `ignoreFailures = true` on the gating task is the finding. Then confirm
```

Replace:

```
and `ignoreFailures = true` on the gating task is the finding. A bump past `4.10.5` with no green `spotbugsMain` or `spotbugs:check` run attached is the finding too. Then confirm
```

### 21. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
and SonarJava `S2245` was **not** independently verified as of 2026-09-12, so confirm the key before citing it as the gate.
```

Replace:

```
and SonarJava `S2245` is a Community-tier rule in the default `Sonar_way` profile, typed Vulnerability rather than Security Hotspot since 2026-06-11 (verified 2026-11-27), so a server bundling an older SonarJava still renders it as a Hotspot.
```

### 22. skills/java-quality-reference/security-and-untrusted-input.md (insertion, new rule)

Anchor (the end of the JAVA-SEC-06 table row):

```
Where wired: find-sec-bugs `COMMAND_INJECTION`, and Semgrep `p/java`'s `tainted-system-command` covers the same shape. | MUST |
```

Insert after:

```
| JAVA-SEC-11 | Cap every allocation sized by input that crossed a trust boundary. Read decompressed or streamed outside data (`GZIPInputStream`, `InflaterInputStream`, `ZipInputStream`, a Snappy or LZ4 stream, an HTTP or WebSocket body) through a byte ceiling, such as `readNBytes(limit + 1)` followed by a failure when more than `limit` bytes came back, never through `readAllBytes()` or an unbounded `transferTo`. Check every declared length, count or uncompressed size against a named maximum before it sizes a buffer, an array or a collection. A Java-serialization filter carries `maxbytes`, `maxarray`, `maxdepth` and `maxrefs` limits beside its class allow-list. | Oracle's Secure Coding Guidelines for Java SE (document version 11.1, November 2026), guideline DOS-1: limit the decompressed data size rather than relying on compressed size or metadata, and check untrusted sizes, lengths and counts before allocating. Advisories published between 2026-09-17 and 2026-11-19 share the one shape: snappy-java sized its output buffer from the declared length, up to 2 GB from a few bytes (fixed 1.1.10.9), lz4-java trusted a block-header length (1.11.2), Guava's `CompactHashMap` and `CompactHashSet` `readObject` allocated from a stream-supplied count (33.7.2), and async-http-client, HAPI FHIR and PGPainless decompressed without a ceiling. `JAVA-SEC-01` bounds which classes a stream builds, `JAVA-SEC-03` XML expansion and `JAVA-SEC-05` paths, and none of them bounds bytes. No lint names this shape. | see block JAVA-SEC-11, then read each hit whose stream carries outside data: one with no byte ceiling, or with a declared length used to allocate before it is checked, is the finding. Empty output is the pass. A filter pattern on an outside stream with a class list and no limit clause is the finding for the serialization half. | MUST |
```

### 23. skills/java-quality-reference/security-and-untrusted-input.md (insertion, new grep block)

Anchor:

```
# JAVA-SEC-06
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.java' |
  xargs -0 -r grep -H -n -e 'Runtime.getRuntime().exec(' -e 'new ProcessBuilder(' --
```

Insert after:

```
# JAVA-SEC-11
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.java' |
  xargs -0 -r grep -H -n -e 'readAllBytes' -e 'GZIPInputStream' -e 'InflaterInputStream' \
    -e 'ZipInputStream' -e 'SnappyInputStream' -e 'LZ4BlockInputStream' \
    -e 'setObjectInputFilter' -e 'ObjectInputFilter.Config.createFilter' --
```

### 24. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
Defaults an adopter overrides once, not contracts. Every number was verified
**2026-09-12**.
```

Replace:

```
Defaults an adopter overrides once, not contracts. Every number was verified
**2026-11-27**.
```

### 25. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
| `jackson-databind` | `2.18.8`, `2.21.4` or `3.1.4` and above (GHSA-j3rv-43j4-c7qm, fixed 2026-06-04) | every release, because a transitive bump moves it silently |
```

Replace:

```
| `jackson-databind` | `2.18.12`, `2.21.8` or `3.1.8` and above (CVE-2026-110879, a further `PolymorphicTypeValidator` bypass, fixed 2026-10-17, GHSA id not yet published). Prefer `2.21.8` or `3.1.8`: the 2.18 line takes critical security backports only until the end of December 2026, and the 2.22 and 3.2 lines closed in November 2026 at `2.22.4` and `3.2.4`, so neither is a target. GHSA-268j-6pjg-73vh is fixed only in the unreleased `2.21.10` and `3.1.10` and may raise this floor again | every release, because a transitive bump moves it silently |
| `jackson-core` | `2.18.11`, `2.21.7` or `3.1.7` and above wherever outside JSON is parsed (GHSA-p6pp-m3f8-5c89, CVE-2026-89407, a high-severity ReDoS in float parsing, published 2026-10-01). It is a parser denial of service unrelated to polymorphic typing, so it binds even where `JAVA-SEC-02` does not | every release, with the `jackson-databind` check |
```

### 26. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
| `findsecbugs-plugin` | `1.14.0`, released 2025-06-17, 15 months stale at this date | a `1.15.0` ships |
```

Replace:

```
| `findsecbugs-plugin` | `1.14.0`, released 2025-06-17, still the newest release and 17 months stale at this date; `master` is `1.15.0-SNAPSHOT` | a `1.15.0` ships |
```

### 27. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
| `com.github.spotbugs` Gradle plugin | `6.4.3` or newer, which maps to SpotBugs `4.9.7`. Current is `6.5.6`, mapping to SpotBugs `4.10.2` | on any plugin bump, against the plugin's own compatibility table |
```

Replace:

```
| `com.github.spotbugs` Gradle plugin | `6.4.3` or newer, which maps to SpotBugs `4.9.7`. Current is `6.5.15` (2026-11-26), defaulting to SpotBugs `4.10.5` since `6.5.13`. The plugin README's mapping table stops at `6.5.6` and is not a current-version source | on any plugin bump, against the plugin's release notes |
```

### 28. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
| SpotBugs' restored `IO.close(InputStream)` | deprecated with a stated one-year clock ending around **October 2026** | October 2026. The fix exists on find-sec-bugs' `master` and no release carries it |
```

Replace:

```
| SpotBugs' restored `IO.close(InputStream)` | still present in `4.10.5` and on `master` as `@Deprecated(forRemoval = true)`, its javadoc saying it goes "in or after October 2026". The clock has run out, so any later core may drop it and break find-sec-bugs `1.14.0` with a `NoSuchMethodError` | every SpotBugs release after `4.10.5`. The fix exists on find-sec-bugs' `master` and no release carries it |
```

### 29. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
or `mvn -q dependency:tree -Dincludes=com.fasterxml.jackson.core:jackson-databind`.
```

Replace:

```
or `mvn -q dependency:tree -Dincludes='*:jackson-databind'`, never a
`com.fasterxml.jackson.core:` filter, because Jackson 3 ships as
`tools.jackson.core` and that filter prints nothing for it. Run the same pair
with `jackson-core` for its own row in The Dated Numbers.
```

### 30. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
`jackson-databind` must **resolve** to `2.18.8`, `2.21.4` or `3.1.4` or above
```

Replace:

```
`jackson-databind` must **resolve** to `2.18.12`, `2.21.8` or `3.1.8` or above
```

### 31. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
Teams already migrated onto a PTV per Jackson's own 2020 guidance were still exposed.
```

Replace:

```
Teams already migrated onto a PTV per Jackson's own 2020 guidance were still exposed. CVE-2026-110879 (fixed 2026-10-17) is a third bypass, through the type parameters of generic type ids, and its fix stops `allowIfSubTypeIsArray()` accepting abstract or interface element types other than `Number`, so an allow-list leaning on it needs re-testing after the bump. The validator Jackson applies when `@JsonTypeInfo` names none is a deny-list of nine base types, not an allow-list (GHSA-gx83-3vf8-gh7j: it omitted `Comparable`).
```

### 32. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
Re-run on every release (floors dated 2026-06-04, verified 2026-09-12).
```

Replace:

```
Re-run on every release (floors dated 2026-10-17, verified 2026-11-27).
```

### 33. skills/java-quality-reference/platform-and-versions.md

Find:

```
toolchain the current LTS (**25** as of 2026-09-12)
```

Replace:

```
toolchain the current LTS (**25** as of 2026-11-27; JDK 27 is not an LTS and the next is 29, due September 2027)
```

### 34. skills/java-quality-reference/platform-and-versions.md

Find:

```
Spring Boot 4 (2025-11-20) and JUnit 6 both hold their own floor at 17 as of 2026-09-12,
```

Replace:

```
Spring Boot 4 (2025-11-20, and 4.2.0 on 2026-11-19) and JUnit 6 both hold their own floor at 17 as of 2026-11-27,
```

### 35. skills/java-quality-reference/platform-and-versions.md

Find:

```
Raising the floor to chase the LTS drops consumers for nothing.
```

Replace:

```
Raising the floor to chase the LTS drops consumers for nothing. The 17 leg compiles on the toolchain with `options.release = 17` and runs its tests on a 17 launcher: Error Prone 2.43.0 and later does not run on JDK 17, so a leg whose `javac` is a JDK 17 caps Error Prone at 2.42.0.
```

### 36. skills/java-quality-reference/platform-and-versions.md

Find:

```
must list every supported major. Empty output from either grep is the finding.
```

Replace:

```
must list every supported major. Empty output from either grep is the finding. Then read which JDK runs `javac` on each 17 leg: a JDK 17 `javac` with Error Prone above 2.42.0 is the finding.
```

### 37. skills/java-quality-reference/platform-and-versions.md

Find:

```
The flag does nothing on Oracle JDK 17 and 21, and NullAway 0.12.11+ throws `IllegalStateException` at compile time rather than degrading quietly (verified 2026-09-12).
```

Replace:

```
The flag does nothing on Oracle JDK 17 and 21, and NullAway 0.12.11+ throws `IllegalStateException` at compile time rather than degrading quietly. Since 0.14.2 it detects the precondition more precisely, so a CI image that slipped through before can fail on a NullAway bump (verified 2026-11-27). On JDK 21, Error Prone 2.46.0 and later needs the same flag on every compile, not only under `jspecifyMode`, and the 17.0.19+ arm is reachable only with Error Prone 2.42.0 or earlier, the last release that runs on JDK 17.
```

### 38. skills/java-quality-reference/platform-and-versions.md (insertion, new rule)

Anchor (the end of the JAVA-PLAT-09 table row):

```
There is no empty-output pass here: the finding is a removal, disablement or deprecation claim, in the diff or in a comment, that names no JDK number. | MUST |
```

Insert after:

```
| JAVA-PLAT-19 | Never mutate a `final` field through deep reflection (`Field.setAccessible(true)` followed by `set`) in shipped code or in tests. Give the class a constructor, a builder or a package-private seam instead, and leave the rest to serialization libraries, which JEP 500 directs to `sun.reflect.ReflectionFactory`. | [JEP 500](https://openjdk.org/jeps/500) (JDK 26) makes this warn by default under `--illegal-final-field-mutation=warn` and states that `deny` will become the default in a future release, so a test helper or mapper that passes on 25 starts warning on a consumer's 26 and will later throw. A model asked to "set a private final field in a test" generates exactly this shape. | see block JAVA-PLAT-19, then read each hit for a following `set` call on a `final` field: that is the finding, and empty output is the pass. Where a JDK 26 or newer launcher is available, run the suite once with `--illegal-final-field-mutation=deny`, and a failure there is the finding. | SHOULD |
```

### 39. skills/java-quality-reference/platform-and-versions.md (insertion, new grep block)

Anchor:

```
# JAVA-PLAT-07
git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**' |
  xargs -0 -r grep -H -n -e 'jdeps' -e 'jdeprscan' --
```

Insert after:

```
# JAVA-PLAT-19
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.java' |
  xargs -0 -r grep -H -n -A 3 -e 'setAccessible(true)' --
```

### 40. skills/java-quality-reference/platform-and-versions.md

Find:

```
| `sun.misc.Unsafe` memory access throws | 26 or later |
| Applet API removed | 26 |

Verified 2026-09-12.
```

Replace:

```
| `sun.misc.Unsafe` memory access throws by default: not yet. [JEP 498](https://openjdk.org/jeps/498) said "26 or later", but `--sun-misc-unsafe-memory-access` still defaults to `warn` in JDK 27 and the 28 early-access build, and only `deny` throws | none yet |
| Applet API removed | 26 |
| Deep-reflection mutation of a `final` field warns, with no announced release for the `deny` default ([JEP 500](https://openjdk.org/jeps/500)) | 26 |
| `ThreadPoolExecutor.finalize()` removed, so a subclass's `super.finalize()` now binds to `Object.finalize()`, which declares `throws Throwable` (JDK-8371748) | 27 |

Verified 2026-11-27.
```

### 41. skills/java-quality-reference/platform-and-versions.md

Find:

```
see block JAVA-PLAT-10 (1 of 2). Empty output is the finding, because it means neither gate is wired.
```

Replace:

```
see block JAVA-PLAT-10 (1 of 2). Empty output is the finding, because it means neither gate is wired. Error Prone's `PreferCharsetOverload` (2.51.0, a warning, needs `-parameters`) catches the string-named overloads such as `new String(bytes, "UTF-8")`, which pass no `StandardCharsets` constant either and force a checked `UnsupportedEncodingException`.
```

### 42. skills/java-quality-reference/platform-and-versions.md

Find:

```
Grep floor where they are not: see block JAVA-PLAT-10 (2 of 2). Empty output is the pass.
```

Replace:

```
Grep floor where they are not: see block JAVA-PLAT-10 (2 of 2). Empty output is the pass, and a charset-name string literal it prints is the finding only where it sits in a charset argument.
```

### 43. skills/java-quality-reference/platform-and-versions.md

Find:

```
    -e 'new InputStreamReader\([^,)]*\)' -e 'new PrintStream\([^,)]*\)' -e 'new Scanner\([^,)]*\)' \
    --
```

Replace:

```
    -e 'new InputStreamReader\([^,)]*\)' -e 'new PrintStream\([^,)]*\)' -e 'new Scanner\([^,)]*\)' \
    -e '"(UTF-8|UTF8|ISO-8859-1|US-ASCII)"' --
```

### 44. skills/java-quality-reference/platform-and-versions.md

Find:

```
Pin `java.properties.date` on the Maven side, or write through a sorted, comment-free `Properties` subclass on the Gradle side, where no built-in flag exists (checked against the JDK 25 public surface, 2026-09-12).
```

Replace:

```
Pin the JDK system property `java.properties.date` to a fixed string on the JVM that runs `store()`, or write through a sorted, comment-free `Properties` subclass. `Properties.store` documents the property from JDK 18 (17's javadoc lacks it), it replaces the date with the fixed string rather than dropping the line, and it does nothing on an older JVM, where the subclass is the only form. Its propagation through the Gradle daemon's `org.gradle.jvmargs` is unverified, so the build-twice diff is the proof (checked against the JDK 27 javadoc, 2026-11-27).
```

### 45. skills/java-quality-reference/platform-and-versions.md

Find:

```
12. **Hallucinates a `Properties.store()` suppression flag.** None exists in the
    JDK as of 25. There is `java.properties.date` on the Maven side and a custom
    subclass everywhere else.
```

Replace:

```
12. **Hallucinates a `Properties.store()` suppression parameter, or claims no
    switch exists.** The only one is the JDK system property
    `java.properties.date` (JDK 18 and later), which fixes the date line rather
    than removing it. A sorted, comment-free subclass is the other form.
```

### 46. skills/java-quality-reference/concurrency.md

Find:

```
- **`StructuredTaskScope` is still preview through JDK 27** (JEP 505 / 525 /
  533, finalisation targeted at 28). JDK 27 reached GA 2026-09-15, after these
  rows were written against the RC. Re-read the GA javadoc before emitting a
  JDK-27 member, and re-check JAVA-CONC-05 when the JEP header flips to
  `Scope: SE`.
```

Replace:

```
- **`StructuredTaskScope` is preview through JDK 27** (JEP 505 / 525 / 533) and
  final in JDK 28 through [JEP 543](https://openjdk.org/jeps/543), integrated
  "without further change" from 27's shape, with GA scheduled 2027-03-09
  (verified 2026-11-27). JDK 27 reached GA 2026-09-15 with JEP 533's members as
  `JAVA-CONC-06` lists them. Re-check JAVA-CONC-05 when JDK 28 is GA and its
  javadoc drops the preview marker. The JEP header's `Scope: SE` is no signal,
  because the preview JEPs 505 and 525 carry it too.
```

### 47. skills/java-quality-reference/concurrency.md

Find:

```
and JDK 24 still pins in a `static` initializer: HikariCP [#1463](https://github.com/brettwooldridge/HikariCP/issues/1463) is a live report of exactly that case.
```

Replace:

```
and JDK 24 still pins while blocking in a class initializer, a case JEP 491 itself still lists and no JDK 26 to 28 JEP addresses (re-read 2026-11-27): HikariCP [#1463](https://github.com/brettwooldridge/HikariCP/issues/1463) is an open loom-friendliness thread, last active 2025-04-12, in which that case is reported.
```

### 48. skills/java-quality-reference/concurrency.md

Find:

```
With no preview-dependent class file compiled, a runtime flag permits loading nothing, and a grep that counts the literal string flags the repo that got it right.
```

Replace:

```
With no preview-dependent class file compiled, a runtime flag permits loading nothing, and a grep that counts the literal string flags the repo that got it right. Never detect preview use with `-Xlint:preview`: the JDK 26 and 27 `javac` manuals state that `--enable-preview` also disables the `preview` lint category, so that check is silent exactly where it is needed.
```

### 49. skills/java-quality-reference/concurrency.md

Find:

```
Its `JsonRecyclerPools` now offers five strategies rather than a winner.
```

Replace:

```
In 2.x its `JsonRecyclerPools` still offers five strategies, one of them the deprecated lock-free pool, rather than a winner, and Jackson 3.3.0 (2026-11-07) adds a striped pool and a virtual-thread-aware hybrid pool, so do not quote a count for 3.x.
```

### 50. skills/java-quality-reference/concurrency.md

Find:

```
`GuardedByChecker` and `ImmutableChecker` are both `ENABLED_ERRORS` in Error Prone's `BuiltInCheckerSuppliers` (2.36.0, read 2026-09-12)
```

Replace:

```
`GuardedByChecker` and `ImmutableChecker` are both `ENABLED_ERRORS` in Error Prone's `BuiltInCheckerSuppliers` (2.36.0 through 2.53.0, read 2026-11-27)
```

### 51. skills/java-quality-reference/concurrency.md

Find:

```
`GuardedByUtils` recognises exactly five packages and the *Java Concurrency in Practice* one is not among them, so the most-trained-on import compiles clean and enforces nothing.
```

Replace:

```
From 2.37.0 `GuardedByUtils` recognises an explicit package list, five packages from 2.48.0, and the *Java Concurrency in Practice* one is not among them, so the most-trained-on import compiles clean and enforces nothing (2.36.0 still matched the simple name `GuardedBy` in any package).
```

### 52. skills/java-quality-reference/concurrency.md

Find:

```
`ThreadSafeChecker` ships in none of the three built-in sets
```

Replace:

```
`ThreadSafeChecker` (bug pattern name `ThreadSafe`) ships in none of the three built-in sets at 2.53.0
```

### 53. skills/java-quality-reference/nullness.md

Find:

```
| JSpecify (1.0.0, 2024-07-17, verified 2026-09-12), annotation set frozen for life |
```

Replace:

```
| JSpecify (1.0.0, 2024-07-17; 1.0.1, 2026-07-29, changed packaging and documentation only; verified 2026-11-27), annotation set frozen for life |
```

### 54. skills/java-quality-reference/nullness.md

Find:

```
it has known gaps on lambda-heavy call patterns ([NullAway#1290](https://github.com/uber/NullAway/issues/1290)), so
```

Replace:

```
it has known gaps: NullAway's JSpecify-support wiki page still lists full generic-method inference as outstanding and says the mode may report false positives (read 2026-11-27), and the lambda-inference case [NullAway#1290](https://github.com/uber/NullAway/issues/1290) closed only in 0.14.4, so
```

### 55. skills/java-quality-reference/testing.md

Find:

```
6.0.0 shipped 2025-09-30 requiring Java 17 and Kotlin 2.2, and 6.1.3 is current as of 2026-09-12.
```

Replace:

```
6.0.0 shipped 2025-09-30 with a Java 17 and Kotlin 2.1 baseline, and 6.1.3 is the newest GA as of 2026-11-27 (6.2.0-M1, 2026-11-15, is a milestone). Of the 5 line, JUnit's security policy supports only 5.14.x.
```

### 56. skills/java-quality-reference/testing.md

Find:

```
the area is still being hardened upstream: four PRs merged 2025 to 2026 changed what the annotations can express
```

Replace:

```
the area kept being hardened upstream: four PRs merged 2021 to 2025 changed what the annotations can express
```

### 57. skills/java-quality-reference/testing.md

Find:

```
read 2026-09-12). "The annotation exists somewhere" is not sufficient, and the `worker_thread_pool` executor service is still experimental.
```

Replace:

```
read 2026-11-27), and `target = CHILDREN`, `ResourceLocksProvider` and Vintage parallel execution first ship in 5.12.0. "The annotation exists somewhere" is not sufficient, and the `worker_thread_pool` executor service is still experimental in the user guide (read 2026-11-27).
```

### 58. skills/java-quality-reference/testing.md

Find:

```
The banner text never changed across that transition, which is the whole point: it is not a version source.
```

Replace:

```
The banner text never changed across that transition, which is the whole point: it is not a version source. Nor is Central's search index: on 2026-11-27 its Solr API still listed `3.6.0-M1` as newest while the repository's `maven-metadata.xml` listed `3.6.0` and `3.6.1`, the newest GA.
```

### 59. skills/java-quality-reference/testing.md

Find:

```
`curl -s 'https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=5&wt=json'` and read the newest `v`. Substitute the group and artifact for any other plugin.
```

Replace:

```
`curl -s https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml | grep '<version>' | tail -3` and read the newest version with no `-M` or `-alpha` suffix. Substitute the group path and artifact for any other plugin, and never read the Solr search index instead.
```

### 60. skills/java-quality-reference/api-and-evolution.md

Find:

```
re-taking, not for inheriting.
```

Replace:

```
re-taking, not for inheriting. For whoever re-takes it: the revapi project has
had no commit since 2025-11-08, and the maintained Gradle plugin is
palantir/gradle-revapi (2.5.0, 2026-10-27).
```

### 61. skills/java-quality-reference/api-and-evolution.md

Find:

```
of the breaks below as binary-compatible and will not fail the build on them.
```

Replace:

```
of the breaks below as binary-compatible and will not fail the build on them.
Run japicmp 0.27.0 (2026-11-04) or newer: earlier releases report no added type
bound on a generic, no new superinterface of an interface and no changed
`native` modifier. The `me.champeau.gradle.japicmp` plugin (0.4.6, the newest on
2026-11-27) does not state which japicmp it bundles, so set the japicmp version
explicitly.
```

### 62. skills/java-quality-reference/api-and-evolution.md

Find:

```
Linkage survives (JLS SE 25 §13.5.3)
```

Replace:

```
Linkage survives (JLS SE 25 §13.5.4, Interface Members)
```

### 63. skills/java-quality-reference/SKILL.md

Find:

```
| [security-and-untrusted-input.md](security-and-untrusted-input.md) | Deserialization, XML hardening, path and command construction, randomness (JAVA-SEC) |
```

Replace:

```
| [security-and-untrusted-input.md](security-and-untrusted-input.md) | Deserialization, XML hardening, path and command construction, input-sized allocation, randomness (JAVA-SEC) |
```

## 8. Sources per changed fact

Each row names a changed fact and the primary sources behind it. The full evidence sits in the delta artifact named in the last column, under `.agents/research/refresh-2026-11/java-quality/`.

| Changed fact | Primary source URLs | Artifact |
|---|---|---|
| Error Prone 2.53.0, release range, set counts, `GuardedByUtils`, `ThreadSafe` | https://github.com/google/error-prone/releases/tag/v2.53.0, https://github.com/google/error-prone/blob/v2.53.0/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java, https://errorprone.info/docs/installation | errorprone-nullaway-jspecify.md |
| `PreferCharsetOverload` | https://errorprone.info/bugpattern/PreferCharsetOverload | recent-shifts-java-quality.md |
| JSpecify 1.0.1 | https://github.com/jspecify/jspecify/releases/tag/v1.0.1 | errorprone-nullaway-jspecify.md |
| NullAway 0.14.2 detection, closed #1290 versus the wiki | https://github.com/uber/NullAway/releases/tag/v0.14.2, https://github.com/uber/NullAway/issues/1290, https://github.com/uber/NullAway/wiki/JSpecify-Support | errorprone-nullaway-jspecify.md |
| japicmp 0.27.0 and its Gradle plugin | https://github.com/siom79/japicmp/releases, https://github.com/melix/japicmp-gradle-plugin, https://plugins.gradle.org/m2/me/champeau/gradle/japicmp/me.champeau.gradle.japicmp.gradle.plugin/maven-metadata.xml | api-gate-and-framework-floors.md |
| palantir/gradle-revapi 2.5.0 status, revapi | https://github.com/palantir/gradle-revapi, https://github.com/revapi/revapi | api-gate-and-framework-floors.md |
| Spring Boot 4.2.0 and framework floors | https://docs.spring.io/spring-boot/system-requirements.html, https://spring.io/blog/category/releases | api-gate-and-framework-floors.md |
| JUnit 6.1.3 and 6.2.0-M1 dates, JUnit PR dates, 5.12.0 | https://docs.junit.org/current/release-notes/, https://docs.junit.org/6.2.0-M1/release-notes.html, https://github.com/junit-team/junit-framework/releases | junit-surefire-gradle-test-coverage.md |
| Surefire 3.6.0 and 3.6.1, stale Solr index | https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-surefire-plugin/maven-metadata.xml, https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=8&wt=json | junit-surefire-gradle-test-coverage.md |
| Kotlin 2.1 nullness interop | https://kotlinlang.org/docs/whatsnew21.html, https://kotlinlang.org/docs/java-interop.html | errorprone-nullaway-jspecify.md |
| Jackson databind and core floors, 3.x release notes, recycler pools | https://raw.githubusercontent.com/FasterXML/jackson-databind/2.x/release-notes/VERSION-2.x, https://raw.githubusercontent.com/FasterXML/jackson-databind/3.x/release-notes/VERSION, https://raw.githubusercontent.com/FasterXML/jackson-core/3.x/release-notes/VERSION, https://github.com/FasterXML/jackson/wiki/Jackson-Releases | jackson-advisories-and-recycler-pools.md |
| SonarJava `S4507` retype, `S2245`, SonarQube Java docs | https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/languages/java, https://community.sonarsource.com/t/taint-analysis-capability/70624 | spotbugs-findsecbugs-checkstyle-pmd-sonar.md |
| Checkstyle 14.4.0, PMD 7.30.0, find-sec-bugs recency | https://github.com/checkstyle/checkstyle/releases/tag/checkstyle-14.4.0, https://github.com/pmd/pmd/releases/tag/pmd_releases%2F7.30.0, https://github.com/find-sec-bugs/find-sec-bugs/commits/master | spotbugs-findsecbugs-checkstyle-pmd-sonar.md |
| JEP 498 Unsafe row, JEP 500 final-field mutation | https://openjdk.org/jeps/498, https://openjdk.org/jeps/500, https://docs.oracle.com/en/java/javase/27/docs/specs/man/java.html | openjdk-removals-and-javac-lint.md |
| `-Werror:<keys>` from JDK 26, javac key set | https://docs.oracle.com/en/java/javase/26/docs/specs/man/javac.html, https://docs.oracle.com/en/java/javase/27/docs/specs/man/javac.html | openjdk-removals-and-javac-lint.md |
| JEP 543 final in 28, HikariCP #1463, JEP 491 | https://openjdk.org/jeps/543, https://github.com/brettwooldridge/HikariCP/issues/1463, https://openjdk.org/jeps/491 | openjdk-27-ga-28-concurrency.md |
| Oracle security guidance, JDK 27 GA window | https://inside.java/2026/10/28/java-secure-coding-guidelines/, https://openjdk.org/projects/jdk/27/ | recent-shifts-java-quality.md |
| JAVA-API-03 section number (§13.5.4, Interface Members; §13.5.3 is Superinterfaces), the api-and-evolution.md edit | https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html | spillover-check.md, item 5 |
| JAVA-SEC-11 advisories: snappy-java 1.1.10.9, lz4-java 1.11.2, Guava 33.7.2, and their dates | https://github.com/advisories/GHSA-q233-g92q-qxp6, https://github.com/advisories/GHSA-4v53-57pg-c464, https://github.com/advisories/GHSA-6cx8-rjf8-pr8g, https://github.com/advisories/GHSA-xxph-c9ww-hj94 | spillover-check.md, item 5 |
| JAVA-PLAT-15 and platform item 12: `java.properties.date` documented from JDK 18 (fetched 2026-11-27: the 17 javadoc lacks the property; the 18, 19 and 20 javadocs state it; the JDK 20 page was the one originally cited, and it carries the sentence too) | https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Properties.html, https://docs.oracle.com/en/java/javase/18/docs/api/java.base/java/util/Properties.html, https://docs.oracle.com/en/java/javase/20/docs/api/java.base/java/util/Properties.html#store(java.io.Writer,java.lang.String), https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/Properties.html | openjdk-removals-and-javac-lint.md |
| JAVA-SEC-10: SpotBugs `IO.close(InputStream)` removal clock, 4.10.5 | https://github.com/spotbugs/spotbugs/blob/4.10.5/spotbugs/src/main/java/edu/umd/cs/findbugs/io/IO.java | spotbugs-findsecbugs-checkstyle-pmd-sonar.md |
| JAVA-SEC-08: find-sec-bugs master builds against SpotBugs 4.10.5 | https://github.com/find-sec-bugs/find-sec-bugs/blob/master/pom.xml | spotbugs-findsecbugs-checkstyle-pmd-sonar.md |
| JAVA-ERR-07 and JAVA-SEC-07: sonar-java `S4507` and `S2245` rule metadata (commit d1532ce) | https://github.com/SonarSource/sonar-java/commit/d1532ced2c48ef09e8ef1edb86899e2f214acd83, https://github.com/SonarSource/sonar-java/blob/master/sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java/S2245.json | spotbugs-findsecbugs-checkstyle-pmd-sonar.md |
| JAVA-PLAT-02: JDK 29 as the next LTS | https://www.oracle.com/java/technologies/java-se-support-roadmap.html (fetched 2026-11-27; the page says "Java SE 8, 11, 17, 21, and 25 are LTS releases" and "the next planned LTS release is Java 29 in September 2027"; the Java 29 date is Oracle's plan, not a commitment) | recent-shifts-java-quality.md |
| JAVA-PLAT-09: JDK 27 `ThreadPoolExecutor.finalize()` removal | https://www.oracle.com/java/technologies/javase/27-relnote-issues.html (fetched 2026-11-27: "Removed ThreadPoolExecutor.finalize()", JDK-8371748, deprecated in 9 and for removal in 18). The jdk.java.net/27/release-notes page was fetched too and now shows only the 27.0.1.1 update notes, so it does not state this fact | openjdk-27-ga-28-concurrency.md |
| JAVA-ERR-03: `Arena` with `MustBeClosedChecker`, Error Prone 2.51.0 | https://github.com/google/error-prone/releases/tag/v2.51.0 | errorprone-nullaway-jspecify.md |
| JAVA-TEST-01: only 5.14.x of the JUnit 5 line is supported | https://raw.githubusercontent.com/junit-team/junit-framework/main/SECURITY.md | junit-surefire-gradle-test-coverage.md |
| JAVA-SEC-02: CVE-2026-110879 (no GHSA exists yet) and, separately, GHSA-gx83-3vf8-gh7j = CVE-2026-83557 (default validator omits `Comparable`; moderate; fixed 2.18.10, 2.21.6, 2.22.2, 3.1.6, 3.2.2) | CVE-2026-110879: https://raw.githubusercontent.com/FasterXML/jackson-databind/3.x/release-notes/VERSION and https://raw.githubusercontent.com/FasterXML/jackson-databind/2.x/release-notes/VERSION-2.x, issue #6287, fixed 2.18.12, 2.21.8, 3.1.8 on 2026-10-17; GHSA-gx83-3vf8-gh7j: https://github.com/advisories/GHSA-gx83-3vf8-gh7j (all fetched 2026-11-27) | jackson-advisories-and-recycler-pools.md |

## Spillover round

This round checks five items that sibling pipelines and the java-quality verifier raised against this pair, as recorded in `.agents/research/refresh-2026-11/java-quality/spillover-check.md`. Everything not named below stays as the first round left it.

### Verdict

- One statement in the target is contradicted by a primary source and changes in place: the JAVA-SEC-11 rationale says the advisories were "published between 2026-09-17 and 2026-11-19", but both lz4-java advisories were published 2026-08-06 and only entered the GitHub Advisory Database on 2026-10-07. The window now names the Advisory Database listing date, which every cited advisory falls inside.
- The rule `rules/java-quality.md` is not edited, so its `bump` stays `none`. The skill edit is a one-clause factual correction in a rationale; on its own it is a patch, and the first round's `minor` already covers it.
- Section 8 lacked source rows for the JAVA-API-03 section-number fix and for the JAVA-SEC-11 advisories. Both rows were added there in this round.
- No rule ID changes, and no new rule is added.

### Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| JAVA-SEC-11 | "Advisories published between 2026-09-17 and 2026-11-19 share the one shape" | "Advisories listed in the GitHub Advisory Database between 2026-09-17 and 2026-11-19 share the one shape" | GHSA-4v53-57pg-c464 and GHSA-6cx8-rjf8-pr8g (published 2026-08-06, Advisory Database 2026-10-07); GHSA-q233-g92q-qxp6 and GHSA-xxph-c9ww-hj94 (Advisory Database 2026-10-27) |

The JAVA-SEC-11 rule text, severity and verification are unchanged. Its existing verification (the grep block plus a read of each hit on outside data) still covers the rule, because only the rationale's date wording moves.

### New rules

None.

### Declined

- Kotlin 2.5.0-RC2 makes a compiler JDK below 17 an error: confirmed, but only as a release-candidate fact, and it concerns the JDK that runs the Kotlin compiler, not the library floor. JAVA-PLAT-02's floor of 17 and its 17 CI leg already satisfy it, so no text is false. Revisit at Kotlin 2.5.0 GA.
- JaCoCo 0.8.16 supports Java 27: confirmed, but the target states no JaCoCo version or class-file support claim, so nothing is false and nothing needs adding.
- JUnit 6.0.3 on the JetBrains page: secondary source only, and superseded by the 6.1.3 and 6.2.0-M1 facts the first round took from the JUnit release notes.
- Gradle 9.8.0 supports JDK 27 and PMD does not yet: confirmed, but the target pins toolchain 25 and JAVA-LINT-09 already keeps PMD out of a new gate. The optional sentence adds guidance no current rule needs.
- JDK 27 GA on 2026-09-15: not confirmed from a primary source in this round (the OpenJDK project page returned HTTP 403), and the target's existing wording is already consistent with GA. No change.
- JAVA-API-03 section number: the target already reads §13.5.4, confirmed against the JLS SE 25 chapter. Only the missing source row was needed, added to section 8.

### Sources for the spillover change

| Changed fact | Primary source URLs | Artifact |
|---|---|---|
| JAVA-SEC-11 window measured by GitHub Advisory Database listing date | https://github.com/advisories/GHSA-4v53-57pg-c464, https://github.com/advisories/GHSA-6cx8-rjf8-pr8g, https://github.com/advisories/GHSA-q233-g92q-qxp6, https://github.com/advisories/GHSA-xxph-c9ww-hj94 | spillover-check.md, item 5 |

### Edit list (spillover round)

Apply after the first-round Edit list. "Find" text is verbatim from the current file; "Replace" is the full replacement.

#### 1. skills/java-quality-reference/security-and-untrusted-input.md

Find:

```
Advisories published between 2026-09-17 and 2026-11-19 share the one shape
```

Replace:

```
Advisories listed in the GitHub Advisory Database between 2026-09-17 and 2026-11-19 share the one shape
```

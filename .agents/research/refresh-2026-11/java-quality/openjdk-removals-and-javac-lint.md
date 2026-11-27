---
title: OpenJDK removals, disablements and javac lint, delta 2026-09-12 to 2026-11-27
pair: java-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 24
---

# OpenJDK removals, disablements and javac lint: delta update

This is a delta against `.agents/research/jvm-platform-and-toolchains.md` (2026-09-12). Anything not listed as changed is unchanged. Concurrency APIs are out of scope. All sources below were fetched and read on 2026-11-27 (the Oracle and openjdk.org pages needed a plain `curl` with a browser user agent, because the fetch tool received HTTP 403).

## Contents

1. Summary
2. Findings: claim-by-claim verdicts
3. Findings: new removals and deprecations to add
4. Findings: javac lint keys
5. Findings: Properties.store date suppression
6. Normative guidance candidates
7. AI-agent angle
8. Contested / evolving
9. Sources

## Summary

- JDK 27 reached GA on 2026-09-15 with nine JEPs; none removes, disables or deprecates for removal a Java API or flag. The 27 release notes list removals (VFORK, `ThreadPoolExecutor.finalize()`, `java.locale.useOldISOCodes`, `-noverify`, JVMCI) but no JEP-level removal.
- JEP 472's `deny` default still has no release. The JDK 27 and JDK 28 early-access `java` man pages both say deny "will become the default in a future release". Unchanged.
- The `sun.misc.Unsafe` row "throws, 26 or later" is wrong as written: JEP 498 only promised "26 or later". The JDK 25, 26, 27 and 28-EA `java` man pages all say `--sun-misc-unsafe-memory-access` defaults to `warn`. Nothing throws by default through JDK 28 EA. Change the row to "not yet; default is still warn as of JDK 27 and 28 EA".
- JEP 500 shipped in JDK 26 (deep-reflection final-field mutation warnings). The `--illegal-final-field-mutation` and `--enable-final-field-mutation` options exist in the 26 and 27 man pages; default is `warn`, `deny` "will become the default in a future release". Add a row.
- JDK 28 targets JEP 541 (macOS/x64 port deprecated for removal) and an EA-notes change deprecating the two-argument `sun.reflect.ReflectionFactory.newConstructorForSerialization` for removal. No JDK 28 JEP removes an API.
- Finalization: no removal JEP exists. `ThreadPoolExecutor.finalize()` was removed in JDK 27 (JDK-8371748), and 26 removed finalization use from `javax.imageio.stream`. JAVA-ERR-06 stays correct.
- `-Xlint`: javac 25, 26, 27 and 28-EA have an identical key set. No new key. JAVA-LINT-07 is unaffected, and the toolchain-note caveat does not trigger.
- `Properties.store` date suppression exists: the system property `java.properties.date` is documented in the JDK's own `Properties.store(Writer,String)` javadoc, present in JDK 20 and later and absent in JDK 17. JAVA-PLAT-15 and item 12 are factually wrong that "no built-in flag exists".
- JDK 25 is still the current LTS; the next is JDK 29 in September 2027. JAVA-PLAT-02 is unchanged.
- `ExecutorService.close()` javadoc in 27 is unchanged: no timeout parameter. JAVA-ERR-05 unchanged.
- JEP 400 `COMPAT`: still documented in the JDK 27 `Charset.defaultCharset()` javadoc. JAVA-PLAT-14 unchanged.
- Oracle's Secure Coding Guidelines is now document version 11.1, last updated November 2026. Sections 0, 1, 2, 3, 5, 8 still carry no Security Manager caveat. Unchanged.

## Findings

### 1. Table rows and neighbouring claims

| Claim at risk | Verdict | Evidence |
|---|---|---|
| `sun.misc.Unsafe` memory access throws, "26 or later" | **Changed** (clarify) | Old text: "26 or later". New fact: through JDK 27 GA and 28 EA the default is still `warn`; `deny` (throws `UnsupportedOperationException`) is opt-in only. [JEP 498](https://openjdk.org/jeps/498) said only "JDK 26 or later will throw", and its removal plan ("releases after JDK 26") has no JEP. Source: [java 27 man page](https://docs.oracle.com/en/java/javase/27/docs/specs/man/java.html), identical text in the 25, 26 and [28 EA](https://download.java.net/java/early_access/jdk28/docs/specs/man/java.html) pages. Upstream change date: none in the window; the row was misleading from the start. |
| JNI native-access warning, no announced release for the `deny` default (JEP 472), 24 | **Unchanged** | JEP 472 is Closed, Release 24, last updated 2025-11-08. JDK 27 and 28-EA `java` man pages: `--illegal-native-access=deny` "will become the default in a future release". The JEP index (updated 2026-11-26) lists no follow-up JEP. This answers the baseline open question: no target release assigned as of 2026-11-27. |
| Applet API removed, 26 | **Unchanged** | [JEP 504](https://openjdk.org/jeps/504), Closed/Delivered, Release 26. |
| 32-bit x86 port removed, 25 | **Unchanged** | [JEP 503](https://openjdk.org/jeps/503) Release 25 (JEP 501 deprecated it in 24; JEP 479, Windows 32-bit removal, is 24). |
| Finalization deprecated for removal, 18 | **Unchanged** | [JEP 421](https://openjdk.org/jeps/421) Release 18. No removal JEP in the index. |
| JAVA-PLAT-09 neighbouring-JEP warning | **Unchanged** | The index confirms 479, 486, 498, 472 are all 24; 501 is 24; 503 is 25; 500 and 504 are 26. |
| JAVA-PLAT-02 "current LTS (25 as of 2026-09-12)" | **Unchanged** | [Oracle roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html): LTS are 8, 11, 17, 21, 25; next planned is Java 29 in September 2027. JDK 27 is non-LTS. |
| JAVA-PLAT-15 "no built-in flag exists (checked against JDK 25)" and item 12 "None exists in the JDK as of 25" | **Changed** | See section 5. The JDK itself reads `java.properties.date`. |
| JAVA-PLAT-14 only `UTF-8` and `COMPAT` | **Unchanged** | JDK 27 [`Charset.defaultCharset()`](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/nio/charset/Charset.html): "If the value is COMPAT, the default charset is derived from the native.encoding system property". Not deprecated, not removed. |
| lint-gate Group 2 "40 keys, `synchronization` deprecated alias of `identity`" | **Unchanged** | See section 4. The man page of 27 still says "synchronization: Deprecated alias for identity". |
| JAVA-ERR-06 "terminally deprecated since 18 (JEP 421)" | **Unchanged** | No removal JEP. `Object.finalize()` is still listed in the 27 deprecated list. `--finalization=` option still in the 27 man page. Related removals: `ThreadPoolExecutor.finalize()` (JDK 27), `ImageInputStreamImpl` finalization use (JDK 26 notes, "will be removed from a future JDK version"). |
| JAVA-ERR-05 `close()` "no timeout parameter" | **Unchanged** | JDK 27 [`ExecutorService.close()`](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/ExecutorService.html): "This method waits until all tasks have completed execution and the executor has terminated"; interruption triggers `shutdownNow()` then continues to wait. `Since: 19`. |
| JAVA-SEC-09 JEP 486 behaviour | **Unchanged** | [JEP 486](https://openjdk.org/jeps/486) Closed, Release 24. The Oracle SCG page still says "permanently disabled in Java 24". |
| JAVA-SEC-09 "sections 0, 1, 2, 3, 5, 8 carry no caveat" | **Unchanged** (with one nuance) | [SCG](https://www.oracle.com/java/technologies/javase/seccodeguide.html) version 11.1, "Last updated: November 2026" (baseline version not recorded, so the update date is the only change signal). In sections 1, 2, 3, 5, 8 the text contains no mention of the Security Manager, `doPrivileged` or `AccessController`. Section 0 mentions the Security Manager once, only as "Previous use of the security manager should be replaced with these stronger approaches", which is itself a historical note and not an obsolete instruction. Sections 4 and 9 do carry Security Manager references (section 9 heavily). Recommend keeping the claim but wording it "sections 1, 2, 3, 5 and 8 contain no Security Manager guidance; section 0 mentions it only as superseded" if the claim is touched. Parsing was by plain-text heading offsets, so treat the section-0 reading as "likely" rather than exact. |

### 2. New removals, disablements and for-removal deprecations to add

JDK 27 (GA 2026-09-15). JEP list: 523, 527, 531, 532, 533, 534, 536, 537, 538, none about removal ([project page](https://openjdk.org/projects/jdk/27/)). JEP 523 and 534 change defaults (G1 everywhere, compact object headers), not removals. From the [27 release notes](https://www.oracle.com/java/technologies/javase/27-relnote-issues.html), Removed Features (no Deprecated section appears in the 27 notes):

| Change | JDK | Reference |
|---|---|---|
| `-Djdk.lang.Process.launchMechanism=VFORK` removed (Linux) | 27 | JDK-8357089 |
| `ThreadPoolExecutor.finalize()` removed (deprecated 9, deprecated for removal 18). A subclass that calls `super.finalize()` now resolves to `Object.finalize()`, which declares `throws Throwable`, so it may stop compiling | 27 | JDK-8371748 |
| `java.locale.useOldISOCodes` property removed (no effect, runtime warning) | 27 | JDK-8355522 |
| `-noclassgc`, `-noverify`, `-verifyremote`, `-Xverify:none` removed | 27 | JDK-8373481 |
| JVMCI and `-XX:+UseGraalJIT` removed | 27 | JDK-8382582 |

JDK 26 items the baseline table lacks (all from the [26 release notes](https://www.oracle.com/java/technologies/javase/26-relnote-issues.html)): `Thread.stop()` removed (JDK-8368226; deprecated for removal 18; threads topic overlaps the concurrency brief, flag only), JEP 500 (below), `SocketPermission` deprecated for removal (JDK-8356557), `jrunscript` and the `jdk.jsobject` module removed, `MulticastSocket.setTTL/getTTL` removed.

JDK 26 JEP 500 ([JEP 500](https://openjdk.org/jeps/500), Closed/Delivered, Release 26): warns when deep reflection mutates a final field. Options `--illegal-final-field-mutation=allow|warn|debug|deny` and `--enable-final-field-mutation=<module>` exist in the 26 and 27 `java` man pages. Default is `warn`; `deny` "will become the default in a future release". No release number is assigned. Do not write one.

JDK 28 (GA planned 2027-03-09; rampdown one 2026-12-03; [project page](https://openjdk.org/projects/jdk/28/), last update 2026-11-24). Targeted JEPs: 401, 535, 539, 540, 541, 542, 543, 544, 545, 546, 547; 548 proposed. The only removal-class JEP is [JEP 541](https://openjdk.org/jeps/541) "Deprecate the macOS/x64 Port for Removal" (index status Closed/Delivered, Release 28, updated 2026-10-16). The [28 EA release notes](https://jdk.java.net/28/release-notes) (draft, 2026-11-20) add: the two-argument `sun.reflect.ReflectionFactory.newConstructorForSerialization` deprecated for removal and throwing `UnsupportedOperationException` by default (JDK-8393262; `-Djdk.reflect.allowNonSerializableConstruction=true` restores it), `java.awt.Desktop.browse()` disabled by default (JDK-8377972), `jdk.net.useFastTcpLoopback` removed. These are EA, subject to change before 2027-03-09.

### 3. Lint keys

Man pages for javac [25](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html), [26](https://docs.oracle.com/en/java/javase/26/docs/specs/man/javac.html), [27](https://docs.oracle.com/en/java/javase/27/docs/specs/man/javac.html) and the [28 EA](https://download.java.net/java/early_access/jdk28/docs/specs/man/javac.html) were extracted and the key lists compared by script: all four are identical, 39 named keys plus `none`, the same 40 entries the baseline counted. No key was added or removed in JDK 26, 27 or the 28 EA. The pinned toolchain is 25, and the question of a key that exists only on 26 or later does not arise, so JAVA-LINT-07 needs no toolchain note. If a later release adds a key, it must not join the list without a note that the toolchain is 25.

### 4. Properties.store date suppression

The JDK 27 [`Properties.store(Writer, String)`](https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/Properties.html) javadoc says: "If the java.properties.date is set on the command line and is non-empty, a comment line is written as follows. First, a # character is written, followed by the contents of the property". Otherwise it writes the current date. The same sentence appears in the JDK 20, 21, 22, 23, 24, 25 and 26 javadoc and not in 17. So the baseline's classification of this as a Maven-only mechanism was wrong. The property is a JDK feature and works on any JVM that runs `store()`, including the Gradle daemon (set via `-Djava.properties.date=...` in `org.gradle.jvmargs`, or on the forked JVM). Caveat: it replaces the date with a fixed string rather than omitting the line, so it gives determinism, not a comment-free file. I did not test the Gradle propagation here, so the Gradle part is "could not determine" until verified by a build. Exact introducing release between 18 and 20 not determined (JDK 18 and 19 pages were not fetched); "20 or later" is the proven floor.

## Normative guidance candidates

1. **Edit the removal table row for Unsafe.** Rule: replace "`sun.misc.Unsafe` memory access throws | 26 or later" with "`sun.misc.Unsafe` memory access throws only under `--sun-misc-unsafe-memory-access=deny`; default is still `warn` as of JDK 27 and 28 EA (JEP 498)". Rationale: the current row tells an agent the call already throws on 26+. Verification: `java --help-extra | grep -A3 sun-misc-unsafe` on a JDK 27, or the man page URL above.
2. **Add table row: deep-reflection final-field mutation warns, 26 ([JEP 500](https://openjdk.org/jeps/500)), no announced release for the `deny` default.** Rationale: same shape as the JEP 472 row, and the Unsafe/JNI/final-field trio is the whole "integrity by default" programme. Verification: `java --illegal-final-field-mutation=deny` run of the test suite.
3. **Add table row (optional, low value): `ThreadPoolExecutor.finalize()` removed, 27 (JDK-8371748)**, and "macOS/x64 port deprecated for removal, 28 ([JEP 541](https://openjdk.org/jeps/541))", marked as in-development until 2027-03-09. Rationale: JAVA-PLAT-09 demands exact numbers for these claims if an agent makes them. Verification: release-notes grep for the JDK-number.
4. **Rewrite JAVA-PLAT-15.** Rule: pin `-Djava.properties.date=<fixed string>` on the JVM that runs `store()` (Maven: via the plugin or `MAVEN_OPTS`; Gradle: `org.gradle.jvmargs` or the task's `jvmArgs` where the store runs in a forked JVM), or use a sorted comment-free `Properties` subclass; delete "where no built-in flag exists (checked against the JDK 25 public surface)". Rationale: the JDK documents the property since at least 20. Verification: build twice, diff the `.properties` bytes; also grep the Gradle properties and wrapper config for `java.properties.date`. Mark the Gradle propagation as untested until someone runs it.
5. **Rewrite item 12 of What Agents Get Wrong.** Rule: "Hallucinates a `Properties.store()` method flag" stays wrong (there is no method parameter), but "no flag exists" must become "the only supported switch is the system property `java.properties.date`, not an API". Verification: any suggested API must be shown against the javadoc.
6. **Optionally narrow JAVA-SEC-09's claim** to "sections 1, 2, 3, 5 and 8 carry no Security Manager guidance; section 0 cites it only as superseded", with document version 11.1 (November 2026). Verification: the SCG page text search for `security manager` per section.
7. **Leave unchanged:** JAVA-PLAT-02, -09, -14, JAVA-LINT-07 and Group 2, JAVA-ERR-05, -06, and the JNI, Applet, 32-bit, finalization rows. Re-stamp their "Verified" date to 2026-11-27 only if the pair does so mechanically.

## AI-agent angle

- Models trained before 2026 will say Unsafe memory access "throws since JDK 26" or "removed in 27". Neither is true: default `warn`, opt-in `deny`. Mechanical check: run on JDK 27 with `--sun-misc-unsafe-memory-access=deny` and read the exception.
- Models will say `ThreadPoolExecutor` still has a harmless `finalize()` override point. It was removed in 27; code calling `super.finalize()` compiles to `Object.finalize()` and needs `try/catch Throwable`. Check: compile with a JDK 27 toolchain.
- Models will invent a `Properties.store` flag or claim none exists. Check: the javadoc sentence about `java.properties.date`.
- Models will cite a JEP number for the `deny` flips. None exists. Check: the JEP index.
- Models tend to say "JDK 27 is the new LTS". It is not; 25 is, next is 29.

## Contested / evolving

- `deny` defaults for JNI (JEP 472), final-field mutation (JEP 500) and Unsafe: all three are announced, none has a release. Trend: likely follow-up JEPs after JDK 28; none is in the index as of 2026-11-26.
- JDK 28 is open until rampdown one on 2026-12-03; further JEPs or EA-note items may arrive. The ReflectionFactory and Desktop.browse items are draft notes.
- Whether the Unsafe memory-access removal JEP lands is unknown; JEP 498 says "in releases after JDK 26" for methods with standard replacements since JDK 22.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://openjdk.org/projects/jdk/27/ | JDK 27 project page | GA 2026-09-15 | JEP list, GA status |
| https://openjdk.org/projects/jdk/28/ | JDK 28 project page | updated 2026-11-24 | targeted JEPs, schedule |
| https://openjdk.org/jeps/0 | JEP index | updated 2026-11-26 | statuses and releases |
| https://www.oracle.com/java/technologies/javase/27-relnote-issues.html | JDK 27 release notes | 2026-09 | removed features |
| https://www.oracle.com/java/technologies/javase/26-relnote-issues.html | JDK 26 release notes | 2026-03 | removals and deprecations |
| https://jdk.java.net/27/release-notes | 27.0.1.1 update notes | 2026-11-17 | confirms no new removals |
| https://jdk.java.net/28/release-notes | JDK 28 EA draft notes | 2026-11-20 | ReflectionFactory, Desktop.browse |
| https://openjdk.org/jeps/498 | JEP 498 | 24, upd 2025-03 | Unsafe plan |
| https://openjdk.org/jeps/472 | JEP 472 | 24, upd 2025-11 | deny flip |
| https://openjdk.org/jeps/500 | JEP 500 | 26, upd 2026-01 | final-field warnings |
| https://openjdk.org/jeps/504 | JEP 504 | 26 | Applet removal |
| https://openjdk.org/jeps/503 | JEP 503 | 25 | 32-bit x86 removal |
| https://openjdk.org/jeps/541 | JEP 541 | 28, upd 2026-10-16 | macOS/x64 deprecation |
| https://openjdk.org/jeps/421 | JEP 421 | 18 | finalization |
| https://openjdk.org/jeps/400 | JEP 400 | 18 | UTF-8 default |
| https://docs.oracle.com/en/java/javase/27/docs/specs/man/java.html | java man page 27 | 2026 | defaults for the three deny flips |
| https://docs.oracle.com/en/java/javase/27/docs/specs/man/javac.html | javac man page 27 | 2026 | lint keys |
| https://docs.oracle.com/en/java/javase/26/docs/specs/man/javac.html | javac man page 26 | 2026 | lint keys |
| https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html | javac man page 25 | 2025 | lint keys |
| https://download.java.net/java/early_access/jdk28/docs/specs/man/javac.html | javac 28 EA man page | 2026-11 | lint keys |
| https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/Properties.html | Properties javadoc 27 | 2026 | java.properties.date |
| https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/ExecutorService.html | ExecutorService javadoc 27 | 2026 | close() |
| https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/nio/charset/Charset.html | Charset javadoc 27 | 2026 | COMPAT |
| https://www.oracle.com/java/technologies/javase/seccodeguide.html | Secure Coding Guidelines v11.1 | Nov 2026 | sections and caveats |
| https://www.oracle.com/java/technologies/java-se-support-roadmap.html | Oracle support roadmap | 2026 | LTS cadence |

---
title: Java quality recent shifts, 2026-09-12 to 2026-11-27
pair: java-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 58
---

# Java quality recent shifts, 2026-09-12 to 2026-11-27

This is a delta against the pair rules/java-quality.md plus skills/java-quality-reference/, whose feeding consolidations are dated 2026-09-12. It answers one question: what changed in the Java language, the JDK or the quality tooling that the pair does not mention at all, and that would need a new rule or a new table row. It is not a re-creation. Everything not listed here is unchanged. The sibling file openjdk-27-ga-28-concurrency.md in the same directory already covers JEP 533, JEP 543, pinning and HikariCP, so those are not repeated.

Method note. WebFetch is blocked by openjdk.org (HTTP 403), so JEP pages, project pages, javadoc, Oracle release notes and inside.java were fetched with curl and stripped to text. GitHub release notes, advisories and commits were read through the authenticated gh CLI. Every claim below names the page it came from. Search snippets were used only to find leads, never as evidence.

## Table of contents

1. Summary
2. Ranked candidates (findings)
3. Claims at risk in the existing pair
4. Normative guidance candidates
5. AI-agent angle
6. Contested and evolving
7. Rejected, with the owning sibling
8. Could not determine
9. Sources

## 1. Summary

- There are candidates. Ten are worth acting on, two of them pre-window gaps that were never in the pair. Ranked list in section 2.
- Highest impact: the Jackson floor in JAVA-SEC-02 is stale. Two high-severity jackson-databind advisories (2026-09-30) and two jackson-core advisories (2026-10-01) are fixed only in 2.18.11, 2.21.7, 2.22.3, 3.1.7 and 3.2.3. The pair's floors (2.18.8, 2.21.4, 3.1.4) pass the rule while shipping those high-severity denial-of-service bugs. A medium advisory the same week (GHSA-gx83-3vf8-gh7j) is a new hole in the default polymorphic type validator.
- Second: the pair has no rule for bounding decompressed or declared-length allocation. Eleven in-window advisories across snappy-java, lz4-java, Guava, async-http-client, HAPI FHIR and others share one shape, and Oracle's Secure Coding Guidelines 11.1 (November 2026) names it as DOS-1. JAVA-SEC-05 covers only path containment.
- Third: JAVA-LINT-07 forbids pairing `-Xlint:all` with `-Werror`, but the JDK 26 and 27 javac manual documents `-Werror:<keys>` (per-category failure) and the pair never mentions it. The pair's JDK 25 floor statement is not wrong, but the advice is now incomplete. The same manual says `--enable-preview` disables the `preview` lint category, which breaks a lint-based preview detector that JAVA-CONC-05 could be mistaken for.
- Error Prone moved from 2.36.0 (the pair's floor) to 2.53.0 and shipped three releases in the window. The ones that touch generated-Java mistakes: `PreferCharsetOverload`, `CompareToZero` (now ERROR), `EqualsHashCode` (now also flags `hashCode` without `equals`), `MustBeClosedChecker` for `Arena`, and `ValueClassIdentity` / `ValueClassEquals`. None of the nine JAVA-LINT-02 promotion names changed status in the 2.51 to 2.53 notes.
- JEP 401 (Value Objects, preview) is integrated for JDK 28. With `--enable-preview` on, 30 JDK classes including `Integer`, `Optional` and `LocalDate` become value classes even in code compiled before JDK 28. `==`, `synchronized`, `WeakHashMap` and `setAccessible` change behaviour. The inside.java quality heads-up (2026-10-27) asks libraries to test with preview on and off. This is a CONSIDER row, not a blocker, because JAVA-CONC-05 already forbids preview on the published path.
- JEP 500 (final-field mutation warns by default since JDK 26, `deny` coming) is not in the pair at all. It predates the window but belongs next to the pair's removal table.
- NullAway moved from 0.12.11 (the pair's floor) to 0.14.4. 0.14.0 added `JSpecifyExperimental`, 0.14.2 added the opt-in `JSpecifyUnrecognizedAnnotationLocation` check, and 0.14.3 and 0.14.4 report new unboxing errors that can appear outside JSpecify mode.
- JDK 25.0.5 (2026-10-20) changed JNDI and JAXP deserialization defaults. They are defence in depth and do not change JAVA-SEC-04 or JAVA-SEC-01; one sentence each is enough.
- JEP 542 finalises the PEM API in JDK 28. It matters only for a JDK 28 floor, so it is a table row, not a rule. JEP 540 (Simple JSON API) is an incubator in JDK 28 and cannot be used on a published path.
- Tool pins in the dated-numbers table moved: SpotBugs 4.10.5, SpotBugs Gradle plugin 6.5.15, japicmp 0.27.0, JUnit 6.2.0-M1 (milestone only, 6.1.3 is still the newest stable), find-sec-bugs still 1.14.0.
- No JDK 27 or 28 JEP changes JAVA-CONC-05's rule. JEPs 531/547 (lazy constants), 532 (primitive patterns) and 401 are all preview. JEPs 523, 527, 534, 536 have no correctness effect on Java source. JDK 27's deprecations are only compiler-tree and `Modifier` methods.

## 2. Ranked candidates

Each item gives the change, the primary source, the date, the owning family, new rule or edit, and the cost of omitting it.

### C1. Jackson floor refresh and a new default-validator hole (family SEC, edit to JAVA-SEC-02, rank 1)

Change. The pair's JAVA-SEC-02 sets the resolved floor at 2.18.8, 2.21.4 or 3.1.4. Since then:

- GHSA-cxp5-3px4-pw24 (CVE-2026-91777, high, 2026-09-30), jackson-databind quadratic forward-reference completion: fixed in 2.18.11, 2.21.7, 2.22.3, 3.1.7, 3.2.3.
- GHSA-wv8q-qhhj-9h54 (CVE-2026-91776, high, 2026-09-30), jackson-databind retains every unknown raw type ID: same fixed versions.
- GHSA-7hhh-6rmp-j9qf (CVE-2026-89425, high, 2026-10-01) and GHSA-p6pp-m3f8-5c89 (CVE-2026-89407, high, 2026-10-01), both jackson-core: fixed in 2.18.11, 2.21.7, 2.22.3, 3.1.7 and 3.2.2 or 3.2.3.
- GHSA-q4xh-88c3-wmh7 (high, 2026-09-28): Duration and XMLGregorianCalendar unbounded number parse, fixed in 2.18.10, 2.21.6, 2.22.2, 3.1.6, 3.2.2.
- GHSA-gx83-3vf8-gh7j (CVE-2026-83557, medium, 2026-09-28): `DefaultBaseTypeLimitingValidator`, the validator Jackson applies automatically when `@JsonTypeInfo` has no explicit one, denies only nine unsafe base types and omits `Comparable`. Its `isSafeSubType()` returns true for every other base type. Fixed in 2.18.10, 2.21.6, 2.22.2, 3.1.6, 3.2.2.
- GHSA-vvgp-rfg2-7rr6 (medium) eager DNS resolution (SSRF) in InetAddress deserialization, GHSA-wjgm-6hv5-3cvf (medium) Path deserialization with no scheme allow-list: both fixed by 2.18.10 or 2.21.6 and later.

Source: the GitHub advisory pages fetched with `gh api advisories/<id>`. Owner: JAVA-SEC. Edit, not a new rule. Cost of omission: a build that resolves 2.21.4 passes the rule as written while carrying two high-severity DoS bugs in databind and two in core. The pair's own text says the floors are re-checked "on every release", so the fix is a number change plus the one sentence that the default validator is not an allow-list.

### C2. Bound decompressed size and declared-length allocation (family SEC, new rule, rank 2)

Change. An attacker-declared length or ratio triggers allocation before validation. In-window advisories with the same mechanism:

- snappy-java GHSA-q233-g92q-qxp6 (CVE-2026-108106, high, 2026-10-27), fixed 1.1.10.9: output buffer sized from the declared uncompressed length, up to 2 GB from a few bytes. The earlier `maxChunkSize` fix does not cover it. The advisory's workaround is to check `Snappy.uncompressedLength(input)` against an application limit.
- snappy-java GHSA-gwq9-9ffj-mvrv (high, 2026-10-27), heap overflow in typed-array methods.
- lz4-java GHSA-4v53-57pg-c464 and GHSA-6cx8-rjf8-pr8g (medium, 2026-10-07), fixed 1.11.2: unvalidated length in the block header.
- Guava GHSA-xxph-c9ww-hj94 (CVE-2026-102554, high, 2026-10-27), fixed 33.7.2: `CompactHashMap` and `CompactHashSet` `readObject` allocate from an attacker-controlled count.
- async-http-client GHSA-7grg-jcf7-rpmx and GHSA-x8v2-478q-2hvg (high, 2026-09-17 and 2026-10-08): unbounded HTTP and WebSocket decompression.
- HAPI FHIR GHSA-3w98-rrpr-fprr (high, 2026-09-17): unbounded DEFLATE. PGPainless GHSA-cvx8-9ff6-54xq (high, 2026-11-19): unbounded compressed-packet descent.

The vendor statement is Oracle's Secure Coding Guidelines for Java SE, document version 11.1, last updated November 2026, guideline DOS-1: "When decompressing files, it is better to set limits on the decompressed data size rather than relying upon compressed size or meta-data", and "Code that uses untrusted sizes, lengths, dimensions, offsets ... may need to check those values before performing allocations". The OWASP cheat sheet commit of 2026-10-04 (PR 2713) likewise replaces the `resolveClass()` advice with serialization filters that carry "resource limits", noting that class checks alone do not bound resource use.

Owner: JAVA-SEC. New rule, because JAVA-SEC-01 is about classes, JAVA-SEC-05 about paths, and JAVA-SEC-03 about XML expansion; nothing bounds bytes. Cost of omission: generated Java reads `readAllBytes()`, `GZIPInputStream`, `ZipInputStream` or `InputStream.transferTo` into memory with no ceiling, and no lint names it.

### C3. `-Werror:<keys>` and the preview lint category (family LINT, edit to JAVA-LINT-07 and JAVA-CONC-05 verification, rank 3, pre-window)

Change. The JDK 26 and JDK 27 javac manuals document `-Werror:[-]key(,[-]key)*` ("Specify lint categories for which warnings should terminate compilation"; a category must also be enabled with `-Xlint`). The JDK 25 manual does not. The JDK 27 manual also states that `-Werror` now terminates on "any warnings ... in all lint categories, as well as non-lint warnings"; that `--enable-preview` "also disables the `preview` lint category"; that `lossy-conversions` now covers bit-shift operations; that `synchronization` is documented only as a deprecated alias of `identity`; and it lists the nine categories enabled by default: `dep-ann`, `identity`, `incubating`, `module`, `opens`, `preview`, `removal`, `requires-transitive-automatic`, `strictfp`. All of the `-Werror:key`, "also disables preview lint" and bit-shift changes are already in the JDK 26 manual, so they arrived at JDK 26 or earlier (after 25); the JDK 27 manual is dated 2026-09-14.

Owner: JAVA-LINT. Edit. Cost of omission: the pair tells the reader never to combine `-Xlint:all` with `-Werror`, which pushes adopters to a hand-enumerated list that rots; the finer form `-Xlint:all -Werror:this-escape,identity,removal,...` keeps new keys visible without breaking the build on a toolchain bump. Separately, a reviewer who tries to detect preview use through `-Xlint:preview -Werror` on a preview-enabled build gets silence, which is exactly the "check that cannot fail" pattern JAVA-CORE-02 warns about.

### C4. Error Prone 2.51 to 2.53 (family LINT with DATA, PLAT and ERR, mostly edits, rank 4)

Change, from the GitHub release notes for v2.51.0 (2026-10-22), v2.52.0 (2026-11-02) and v2.53.0 (2026-11-18), and the errorprone.info check pages:

- `PreferCharsetOverload` (new in 2.51, severity WARNING): prefer the `Charset` overload to the `String` encoding-name overload, for example `new String(bytes, "ISO-8859-1")`. It needs `-parameters` on the targeted class files. Adjacent to JAVA-PLAT-10, which bans charset-less overloads but never mentions the string-named ones that force a checked `UnsupportedEncodingException` and are the form models generate when told "pass a charset".
- `CompareToZero`: upgraded to ERROR in 2.51 and extended to unary negation and `switch` on a `compare` result. It flags `compare(a, b) == -1`.
- `EqualsHashCode` (2.53): now also flags a class that overrides `hashCode` without `equals`, behind `-XepOpt:EqualsHashCode:CheckHashCodeWithoutEquals`, enabled by default. data-and-patterns.md line 83 says only that the check "is in ENABLED_ERRORS", which stays true.
- `MustBeClosedChecker` (2.51): now requires `Arena.ofConfined()` and `Arena.ofShared()` to be closed; 2.53 enforces `@MustBeClosed` on method references. JAVA-ERR-03 does not mention `java.lang.foreign`.
- `ValueClassIdentity` (2.51, disabled by default) and `ValueClassEquals` (2.52): see C6.
- `BootclasspathShadowing` (2.53, WARNING, disabled by default): flags a top-level class whose binary name shadows a platform class.
- `UndefinedEquals` merges `ArrayAsKeyOfSetOrMap` and `CollectionUndefinedEquality` (2.51), keeping the old names as alternate names. The pair names neither, so nothing breaks.

Owner: LINT edits; one DATA edit (`CompareToZero` joins JAVA-DATA-05's neighbourhood), one PLAT edit (`PreferCharsetOverload` into JAVA-PLAT-10), one ERR edit (`Arena`). Cost of omission: low per item, medium in aggregate because the pair's pinned floor 2.36.0 now trails the current release by seventeen minor versions and the pair's "eight of nine in DISABLED_CHECKS" statement is only verified for 2.36.0.

### C5. JEP 500, final-field mutation (family PLAT, new table row, rank 5, pre-window)

Change. JEP 500 "Prepare to Make Final Mean Final" (delivered in JDK 26): deep-reflection mutation of a `final` field now warns once per module by default (`--illegal-final-field-mutation=warn`); `deny` "will become the default in a future release"; `allow` and `debug` exist; Serialization libraries should use `sun.reflect.ReflectionFactory`. The pair mentions neither the JEP nor the flag. The pair's removal table lists JEP 486, 498 and 472 and "`sun.misc.Unsafe` memory access throws, 26 or later", so a reader is told about the Unsafe half but not the reflection half. No JDK 27 or 28 JEP changes it (checked against both project pages). Owner: JAVA-PLAT-09's table. New row, plus one reading heuristic: a `Field.setAccessible(true)` followed by `set` on a `final` field. Cost: a test double or reflection-based mapper that works on 25 starts warning on 26 and will throw later, and a model asked to "set a private final field in a test" generates exactly this.

### C6. Value objects, JEP 401 (family PLAT or CONC, CONSIDER row, rank 6)

Change. JEP 401 (status Integrated, Release 28, preview, updated 2026-08-07). With preview features enabled at run time, 30 platform classes become value classes: `Integer`, `Long`, `Double` and the other wrappers, `Number`, `Record`, `Optional` and its primitive variants, and the `java.time` value types. The inside.java quality outreach heads-up of 2026-10-27 states this applies "even if the code was compiled with disabled preview features or on a version prior to 28", and lists: `==` may return true where it did not, no monitor (compile error or `IdentityException`), `java.lang.ref` and `WeakHashMap` throw `IdentityException`, and `setAccessible` on their fields throws even if final-field mutation is enabled. It also says record constructors compiled with preview enabled run in "early construction", so a compact constructor that calls an instance method fails to compile. The pair already enumerates `-Xlint:identity` in JAVA-LINT-07, so the compile-time half of the synchronization case is covered; the run-time and `==` halves are not.

This is the one place where the "already considered and not shipped" JEP 513 (flexible constructor bodies, M-L-08) gets new evidence: the heads-up ties JEP 513's early-construction rules to record constructors under JDK 28 preview. The evidence is about JEP 401, not a reason to add a JEP 513 rule. Re-proposal is narrow: fold it into the JEP 401 row, do not ship a standalone JEP 513 row. Gatherers (JEP 485, M-L-07) did not appear in any JDK 27 or 28 list and no evidence changed (the JDK 27 and 28 JEP lists were read in full; Gatherers is not among them).

Owner: JAVA-PLAT (a CI-matrix suggestion) with a pointer from JAVA-CONC-05. CONSIDER, never MUST. Cost of omission: low today, rising when JDK 28 reaches GA on 2027-03-09 and library authors start receiving reports from users who run with preview enabled.

### C7. NullAway 0.12.11 to 0.14.4 (family NULL and LINT, edit, rank 7)

Change, from the GitHub release notes and the NullAway wiki page "JSpecify Support":

- 0.14.0 (2026-08-21, pre-window): the `LegacyAnnotationLocations` flag is removed; type-use annotations must be placed correctly on qualified and array types even outside JSpecify mode (`String @Nullable []`, not `@Nullable String[]`). JAVA-API-11 already teaches the placement, so no change is needed there, but the pair's "0.12.11 floor" does not say the escape hatch is gone. The same release adds `JSpecifyExperimental` (JDK nullness models, wildcard checking, inference-failure warnings), off by default and expected to become default later.
- 0.14.2 (2026-09-25, in window): adds `JSpecifyUnrecognizedAnnotationLocation`, an opt-in check for nullness annotations in places JSpecify does not recognise; detects "more precisely" whether the JDK supports reading type-use annotations from bytecode, which "may lead NullAway to crash on certain build configurations that were unsupported before"; adds a script to remove unnecessary suppressions after an upgrade.
- 0.14.3 (2026-10-22) and 0.14.4 (2026-11-16): "bug fixes #2005 and #2003 may lead to new warnings even outside JSpecify mode": unboxing of a `@Nullable` operand or result in primitive conditional and switch expressions, unboxing of nullable `Iterable` elements in enhanced for loops.

Owner: JAVA-LINT-04/05 and JAVA-NULL-01. Edit. Cost: a floor of 0.12.11 is a floor, not a ceiling, but an agent that bumps to current without being told will see new errors in code that passed, and JAVA-CORE-01 then pushes it toward suppression. The suppression-remover script is the sanctioned alternative.

### C8. JDK 25.0.5 and 27.0.1.1 behaviour changes (family SEC, one-sentence edits, rank 8)

Change, from the Oracle JDK 25.0.5 release notes (release date 2026-10-20) and the OpenJDK 27.0.1.1 notes (2026-11-17):

- JNDI/LDAP: the new `jdk.jndi.ldap.disabledURLSchemes` property (default `rmi` while `com.sun.jndi.ldap.object.trustSerialData` is false) stops the built-in provider from transparently following RMI URL references. JAVA-SEC-04 says never pass an outside string to `lookup()`; this is a runtime backstop and does not change the rule. The Secure Coding Guidelines also now name `jdk.jndi.object.factoriesFilter` and the LDAP and RMI variants.
- JAXP: deserialization of `com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl` is disabled by default (`jdk.xml.enableTemplatesImplDeserialization`). A classic gadget class; JAVA-SEC-01 still stands.
- Post-quantum hybrid TLS (`X25519MLKEM768`, JEP 527) is on by default in JDK 27 and appears in the 25.0.5 notes; PKCS12 gains PBMAC1 with a planned default change; Symantec, Entrust and Camerfirma TLS server certificates are distrusted regardless of date; `com.sun.net.httpserver` rejects requests without or with duplicate `Host` headers. These are operational and test-fixture effects, not Java-source rules.
- 27.0.1.1 enables a Kerberos cross-realm transited field check.

Owner: JAVA-SEC. Edit only. Cost: low.

### C9. JEP 542 PEM API final in JDK 28 (family SEC and PLAT, row only, rank 9)

Change. JEP 542 (Completed, Release 28, updated 2026-09-09): `PEMEncoder`, `PEMDecoder`, `PEM` and the sealed `BinaryEncodable` become final in JDK 28 "without further change" after previews in 25 (JEP 470), 26 (JEP 524) and 27 (JEP 538). The pair does not mention PEM. `BinaryEncodable` has a non-public permitted class, so a pattern switch over it needs a `default` or `case BinaryEncodable` arm; this does not conflict with JAVA-DATA-08, which concerns enums the repository itself declares.

Owner: JAVA-PLAT's version table. Cost of omission: none until a floor of 28. Until then hand-rolled PEM parsing with `Base64` is the only portable path, and JAVA-CONC-05's preview ban means the JDK 27 preview API must not be used on a published module.

### C10. Tool pins in the dated-numbers tables (family LINT, SEC, API and TEST, edits, rank 10)

- SpotBugs 4.10.5 (2026-10-12), Gradle plugin 6.5.15 (2026-11-26). The pair says current is plugin 6.5.6 mapping to SpotBugs 4.10.2. 4.10.5 adds `ReflectiveAccessTracker` and fixes `PT_ABSOLUTE_PATH_TRAVERSAL` for `new File(parent, child)`, which sits directly on JAVA-SEC-05.
- find-sec-bugs is still 1.14.0 (2025-06-17), now about seventeen months old, though master merged JDK 25 and Jakarta taint work on 2026-11-01 and 2026-11-03. The pair's "restored `IO.close(InputStream)` deprecation clock ends around October 2026" has passed; `spotbugs/src/main/java/edu/umd/cs/findbugs/io/IO.java` still exists on SpotBugs master, so the removal has not happened. Treat the row as "clock lapsed, class still present" until a release removes it.
- japicmp 0.27.0 (2026-11-04) "now detects added type bounds on generics, new super interfaces of interfaces, and changes to the native modifier"; 0.26.5 makes reports reproducible. A pin below 0.27.0 silently misses those changes. JAVA-API-02 names no japicmp version.
- JUnit: 6.2.0-M1 (2026-11-15) is a milestone, and the newest stable is still 6.1.3 (2026-08-07), so JAVA-TEST-01 stays correct. The milestone notes matter at GA: a new parallel executor, `WORKER_THREAD_POOL`, is the default (JAVA-TEST-04 and 03 describe parallel configuration); `@CsvSource` records are stricter (a record starting with the comment character now fails); `ExtensionContext.Store` and `Namespace` are deprecated for `org.junit.jupiter.api.store`; timeouts below 1 ms or above 2^63 ns validate differently.

Owner: as listed. Edit. Cost: low but compounding; a stale number is the failure JAVA-TEST-12 already warns about.

### C11. Lower-ranked observations

- Oracle Secure Coding Guidelines 11.1, guideline INJECT-9: untrusted `Double.valueOf` input can inject NaN or infinity, and a cast to `int` turns NaN into 0 and infinity into `Integer.MAX_VALUE`. The pair has no numeric-sanitisation rule. Whether this guideline is new in 11.1 could not be determined, because no earlier version was fetched. Candidate for a SEC or DATA CONSIDER row.
- JEP 540 Simple JSON API (Incubator, JDK 28, updated 2026-11-12): module `jdk.incubator.json`, rejects duplicate member names, no data binding or streaming. For JAVA-API-15's zero-dependency SDK it becomes the "JDK's own JSON" only when it is final and the floor reaches that release. Watch item, no rule.
- JEP 539 (strict field initialization in the JVM, preview, JDK 28) is a JVM-level feature with no Java-source rule.
- JEPs 523 (G1 default everywhere) and 534 (compact object headers by default) in JDK 27 are runtime defaults. No pair owns operational tuning, so neither is a candidate.
- No JDK 27 or 28 JEP concerns the HTTP client, so JAVA-API-15's `java.net.http` premise is unchanged as far as the JEP lists show.

## 3. Claims at risk in the existing pair

| Claim (file) | Outcome |
|---|---|
| JAVA-SEC-02: floors `2.18.8`, `2.21.4`, `3.1.4` (security-and-untrusted-input.md) | Changed. Old text: floors dated 2026-06-04, verified 2026-09-12. New fact: high-severity fixes land at 2.18.11, 2.21.7, 2.22.3, 3.1.7, 3.2.3. Sources: GHSA-cxp5-3px4-pw24, GHSA-wv8q-qhhj-9h54, GHSA-7hhh-6rmp-j9qf, GHSA-p6pp-m3f8-5c89. Upstream dates 2026-09-30 and 2026-10-01. |
| `findsecbugs-plugin` 1.14.0, "15 months stale" (same file) | Changed only in age: latest release is still 1.14.0 on 2026-11-27, now seventeen months. Unchanged otherwise. |
| SpotBugs plugin "current is 6.5.6, mapping to 4.10.2" (same file) | Changed. 6.5.15 (2026-11-26) and SpotBugs 4.10.5 (2026-10-12). |
| `IO.close(InputStream)` deprecation clock "around October 2026" (same file) | Clock lapsed, class still present on SpotBugs master on 2026-11-27. |
| Error Prone floor 2.36.0 and "eight of nine in DISABLED_CHECKS" (lint-gate.md) | Unchanged for 2.36.0; for 2.51 to 2.53 the release notes name none of the nine as changed. Not re-verified against `DISABLED_CHECKS` of 2.53.0. |
| NullAway floor 0.12.11 and the `IllegalStateException` claim (lint-gate.md, platform-and-versions.md) | Changed in nuance: 0.14.2 (2026-09-25) states it detects the type-annotation capability more precisely and may now fail builds it previously let through. Floor itself unchanged. |
| JDK 25 javac carries 40 `-Xlint` keys; `synchronization` is a deprecated alias of `identity` (lint-gate.md) | Unchanged. The key set printed in the JDK 25 and JDK 27 manuals is identical; only descriptions changed (bit shifts under `lossy-conversions`, defaults list, `-Werror:key`). |
| JAVA-TEST-01: 6.1.3 is current (testing.md) | Unchanged on 2026-11-27 for stable releases. 6.2.0-M1 is a milestone. |
| JAVA-PLAT-09 removal table (platform-and-versions.md) | Unchanged. JDK 27's deprecated list adds only compiler-tree position methods and `Modifier` helpers. The table lacks JEP 500 (C5). |
| JAVA-SEC-01 and JAVA-SEC-05 text | Unchanged. In-window zt-zip (GHSA-52c6-99qm-3hqr, 2026-11-09) and Gradle Shadow (GHSA-rr8v-fxxf-c986) zip-slip advisories confirm the "a fix for one archive does not cover a sibling" sentence. |
| JAVA-SEC-03: harden "in the same method that constructs it" | Unchanged and reinforced: GHSA-xm28-xvqc-gxxg (2026-10-02, copernik-xml-factory 0.1.2) shows a hardening helper whose own XInclude guarantee failed. |
| JAVA-CONC-05, 06 and the preview-API rules | Unchanged by anything in this file; see the sibling concurrency delta for JEP 543. |

## 4. Normative guidance candidates

N1 (new, JAVA-SEC, MUST). Cap the decompressed size and any attacker-declared length before allocating. Read decompressed data through a counting wrapper or `readNBytes(limit + 1)` and fail when the limit is exceeded; check a declared count or length against a named maximum before sizing a buffer; do not use `readAllBytes()` on a stream that crossed a trust boundary. Rationale: eleven in-window advisories and Oracle DOS-1 share the mechanism, and no existing row bounds bytes. Verification: `git ls-files -z -- '*.java' | xargs -0 -r grep -n -e 'readAllBytes' -e 'GZIPInputStream' -e 'InflaterInputStream' -e 'ZipInputStream' -e 'SnappyInputStream' -e 'LZ4BlockInputStream'` then read each hit for a byte ceiling; a hit with no ceiling is the finding, empty output is the pass. Severity MUST for code that reads outside data, SHOULD elsewhere.

N2 (edit, JAVA-SEC-02). Raise the floors to 2.18.11, 2.21.7, 2.22.3, 3.1.7 or 3.2.3 and above, state that the default `DefaultBaseTypeLimitingValidator` is a deny-list of nine base types and not an allow-list, and keep the explicit `BasicPolymorphicTypeValidator.builder()` chain requirement. Rationale: C1. Verification: the pair's existing `dependencyInsight` or `dependency:tree` command; the resolved version must be at or above a floor for its line.

N3 (edit, JAVA-LINT-07). Add: where a gate needs new keys to fail the build but not every future key, `-Xlint:all -Werror:<enumerated keys>` is available from the JDK 26 javac; `-Werror` alone fails on non-lint warnings as well. Verification: `git ls-files -z -- '*.gradle.kts' '*.gradle' 'pom.xml' | xargs -0 -r grep -n -e '-Werror'` and read the argument form. Rationale: C3.

N4 (edit, JAVA-CONC-05 verification). A preview check must grep for `--enable-preview` in the build files and `--enable-preview` in the manifest or launcher, never rely on `-Xlint:preview`, because `--enable-preview` switches the `preview` lint category off. Verification: `git ls-files -z -- '*.gradle.kts' '*.gradle' 'pom.xml' | xargs -0 -r grep -n -e 'enable-preview'`; any hit on a main sourceset of a published module is the finding.

N5 (new row, JAVA-PLAT-09 table). Add "Deep-reflection mutation of `final` fields warns by default, `deny` planned ([JEP 500](https://openjdk.org/jeps/500)), JDK 26". Plus a reading rule: new code never calls `Field.set` on a `final` field outside a serialization library using `ReflectionFactory`. Verification: `git ls-files -z -- '*.java' | xargs -0 -r grep -n -e 'setAccessible(true)'` then read for a following `.set(` on a final field; also run the tests once with the JVM flag `--illegal-final-field-mutation=deny`. Severity SHOULD.

N6 (new CONSIDER, JAVA-PLAT). A published library adds one JDK 28 test leg run with `--enable-preview` once JDK 28 is GA, and never uses `==`, `synchronized`, `WeakReference` or `WeakHashMap` keys on `Integer`, `Long`, `Optional` or a `java.time` type. Rationale: C6. Verification: grep `synchronized *\(` and `new WeakHashMap` and read the argument type; promote `ValueClassIdentity` where Error Prone 2.51 or later runs.

N7 (edit, JAVA-PLAT-10). Add `PreferCharsetOverload` beside `DefaultCharset`, and name the string-named charset overloads (`new String(bytes, "UTF-8")`, `new InputStreamReader(in, "UTF-8")`) as the second wrong form. Verification: `git ls-files -z -- '*.java' | xargs -0 -r grep -n -E '"(UTF-8|UTF8|ISO-8859-1|US-ASCII)"'`; a hit in a charset position is the finding.

N8 (edit, JAVA-ERR-03). Add `java.lang.foreign.Arena.ofConfined()` and `Arena.ofShared()` to the must-close list. Verification: `git ls-files -z -- '*.java' | xargs -0 -r grep -n -e 'Arena.of'` then confirm each is in try-with-resources.

N9 (edit, JAVA-LINT-04/05 table). Record NullAway 0.14.4 as current, `JSpecifyExperimental` as an opt-in escalation, `JSpecifyUnrecognizedAnnotationLocation` as the misplaced-annotation check, and the suppression-remover script as the post-upgrade cleanup. Verification: `git ls-files -z -- '*.gradle.kts' '*.gradle' 'pom.xml' | xargs -0 -r grep -n -e 'JSpecifyExperimental' -e 'JSpecifyUnrecognizedAnnotationLocation'`.

N10 (edit, dated-numbers tables). Update SpotBugs 4.10.5, plugin 6.5.15, japicmp 0.27.0 or newer, find-sec-bugs 1.14.0 with age 17 months, and the lapsed `IO.close` clock note. Verification: re-query each artifact registry as JAVA-TEST-12 requires.

N11 (edit, JAVA-SEC-01). Add "and a limit on depth, references, array length and bytes (`maxdepth`, `maxrefs`, `maxarray`, `maxbytes` in the filter pattern)", citing the Guava `readObject` advisory and the OWASP change of 2026-10-04. Verification: the existing grep; the filter pattern or lambda must contain a limit clause.

## 5. AI-agent angle

- Models generate `new String(bytes, "UTF-8")` when told to pass a charset, because that form dominates pre-2011 training data; it compiles and forces a checked exception. Catch: `PreferCharsetOverload` or the grep in N7.
- Models read an HTTP, ZIP or gzip body with `readAllBytes()` or an unbounded `GZIPInputStream` loop and treat the declared `Content-Length` or header length as trusted. The compile succeeds and tests pass on small fixtures. Catch: N1's grep.
- Models trained before 2026-06 emit Jackson versions from their training window, which are below every new floor. Catch: resolved-version check, never the catalog entry.
- Models write `compare(a, b) == 1` or `== -1`. Catch: `CompareToZero` (ERROR since 2.51).
- Models write a test helper that sets a private final field by reflection. It passes on JDK 25 and warns from 26. Catch: N5.
- Models generate `synchronized (someInteger)` or use `Integer` or `Optional` as `WeakHashMap` keys; harmless today, `IdentityException` with preview on JDK 28. Catch: `-Xlint:identity` for the synchronization case, `ValueClassIdentity` for the rest.
- Models detect preview use by turning on `-Xlint:preview -Werror`; with `--enable-preview` that check is silent.
- Models bump NullAway to current to "fix" an annotation and then suppress the new unboxing errors. Catch: JAVA-CORE-01's diff check.

## 6. Contested and evolving

- JEP 401 is a preview, and its framing may change before GA on 2027-03-09. The Error Prone `ValueClassIdentity` message says relying on identity "will fail in a future version of Java", which is stronger than the JEP's preview status.
- `JSpecifyExperimental` is expected to become the NullAway default "in a future release" (0.14.0 notes). The pair's JSpecify mode advice may need to flip then.
- JUnit 6.2 changes its default parallel executor at GA; the milestone's final text may still move.
- JEP 500's `deny` default has no announced release.
- The OpenJDK Interim Policy on Generative AI (openjdk.org/legal/ai) bars AI-generated content from OpenJDK contributions and allows private use for comprehension and review. It does not document agent-authored Java failure modes and changes nothing for adopting repositories. No vendor or OpenJDK page in the window documents agent failure modes beyond the Sonar article surfaced by search, which was not fetched and is not used as evidence.

## 7. Rejected, with the owning sibling

| Item | Source | Owner |
|---|---|---|
| Gradle Shadow zip-slip in `ShadowCopyAction`, GHSA-rr8v-fxxf-c986 | GitHub advisory, 2026-11-09 | gradle-build (plugin authoring and shading); JAVA-SEC-05 already names the family |
| SpotBugs Gradle plugin wiring and forbidden-window mechanics beyond the version number | spotbugs-gradle-plugin releases | gradle-build |
| JUnit `junit-platform-console-standalone` joining the `junit-bom`, `@Suite` `@Disabled` | JUnit 6.2.0-M1 notes | gradle-build and maven-build (dependency declaration) |
| Kotlin `assertThrows` variants taking an exception class as a value | JUnit 6.2.0-M1 notes | kotlin-quality |
| jlink `--security-properties` plugin (JDK 28) | inside.java 2026-11-25 | gradle-build (distribution) |
| NullAway Maven plugin parameters treated as externally initialized | NullAway 0.14.2 notes | maven-build |
| Gatherers (JEP 485), flexible constructor bodies (JEP 513) | topic map M-L-07, M-L-08 | this pair, deliberately not shipped; only the JEP 401 record-constructor effect in C6 is new |
| JEP 523, 534, 536, 537, 544 to 546 (GC, headers, JFR redaction, Vector API, AOT, ZGC) | JDK 27 and 28 project pages | no pair; operational |
| Scala and Kotlin-only advisories (http4s-scala-xml XXE, jawn-parser) | GitHub advisories | not Java source; kotlin-quality at most |

## 8. Could not determine

- The final JDK 28 javadoc and javac manual: JDK 28 is not released (GA 2027-03-09, Rampdown One 2026-12-03). The JDK 28 javac manual was not found; any JDK 28 lint change is unknown.
- Whether Secure Coding Guidelines INJECT-9 (NaN and infinity) is new in version 11.1: no earlier version was fetched.
- Whether Error Prone 2.53.0's `DISABLED_CHECKS` still contains eight of the nine JAVA-LINT-02 names: not read from source. The release notes name none as changed.
- JBS-level changes to the HTTP client in JDK 26 to 28: only JEP lists were searched.
- Which exact JDK introduced `-Werror:key`: present in the JDK 26 manual and absent from the JDK 25 manual; the JDK 26 release notes were not read.
- Whether the Oracle October 2026 Critical Patch Update contains an exploitable Java SE core-library CVE that changes a rule: the cpuoct2026 page was fetched (HTTP 200, large) but its CVE table was not parsed.
- OWASP Path Traversal Prevention Cheat Sheet (new, 2026-11-16) and the 2026-10-17 change to the Java Security Cheat Sheet (homemade ECDH replaced by TLS and HPKE guidance) were seen as commit titles only, not read.

## 9. Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://openjdk.org/projects/jdk/27/ | JDK 27 project page, GA 2026-09-15, JEP list | 2026-09-15 | Authoritative 27 feature list |
| https://openjdk.org/projects/jdk/28/ | JDK 28 project page, targeted JEPs, schedule | 2026-11-24 | Authoritative 28 list: 401, 535, 539 to 548 |
| https://openjdk.org/jeps/401 | Value Objects (Preview), Integrated, Release 28 | 2026-08-07 | Identity-sensitive operations, 30 classes |
| https://openjdk.org/jeps/500 | Prepare to Make Final Mean Final | delivered 26 | Final-field flag and modes |
| https://openjdk.org/jeps/542 | PEM Encodings, Completed, Release 28 | 2026-09-09 | Final PEM API, sealed `BinaryEncodable` |
| https://openjdk.org/jeps/540 | Simple JSON API (Incubator) | 2026-11-12 | JDK JSON status |
| https://openjdk.org/jeps/539, /531, /547, /532, /523, /527, /534, /536, /538, /544 | Remaining 27 and 28 JEP pages | Aug to Nov 2026 | Status and preview checks |
| https://inside.java/2026/10/27/quality-heads-up/ | JDK 28 value classes quality outreach heads-up | 2026-10-27 | OpenJDK-team statement of compatibility effects |
| https://inside.java/2026/11/25/quality-heads-up/ | jlink security-properties heads-up | 2026-11-25 | Rejected item, sibling-owned |
| https://inside.java/2026/10/28/java-secure-coding-guidelines/ | Secure coding session note | 2026-10-28 | Pointer to guideline update |
| https://www.oracle.com/java/technologies/javase/seccodeguide.html | Secure Coding Guidelines for Java SE 11.1 | November 2026 | DOS-1 and INJECT-9 |
| https://www.oracle.com/java/technologies/javase/25-0-5-relnotes.html | JDK 25.0.5 release notes | 2026-10-20 | JNDI, JAXP, TLS, PKCS12 changes |
| https://jdk.java.net/27/release-notes | OpenJDK 27.0.1.1 notes | 2026-11-17 | Kerberos check only |
| https://docs.oracle.com/en/java/javase/27/docs/specs/man/javac.html (also /26/ and /25/) | javac manuals | 2026-09-14 | `-Werror:key`, preview lint, defaults |
| https://docs.oracle.com/en/java/javase/27/docs/api/deprecated-list.html | JDK 27 deprecated list | 2026-09-14 | Confirms no relevant removal |
| https://github.com/google/error-prone/releases (v2.51.0, v2.52.0, v2.53.0) | Error Prone release notes | 2026-10-22, 11-02, 11-18 | New and changed checks |
| https://errorprone.info/bugpattern/PreferCharsetOverload (also CompareToZero, ValueClassIdentity, BootclasspathShadowing) | Check pages | 2026 | Severity and rationale |
| https://github.com/uber/NullAway/releases (v0.14.0 to v0.14.4) | NullAway release notes | 2026-08-21 to 2026-11-16 | New modes and errors |
| https://github.com/uber/NullAway/wiki/JSpecify-Support | NullAway wiki | 2026 | Annotation placement, experimental flag |
| https://docs.junit.org/6.2.0-M1/release-notes.html | JUnit 6.2.0-M1 notes | 2026-11-15 | Parallel executor, store deprecations |
| https://github.com/spotbugs/spotbugs/releases (4.10.3 to 4.10.5) and CHANGELOG.md | SpotBugs notes | 2026-10-12 | New detectors, IO class |
| https://github.com/siom79/japicmp/releases (0.26.2 to 0.27.0) | japicmp notes | 2026-11-04 | New detections |
| https://github.com/find-sec-bugs/find-sec-bugs (releases, PR 786) | find-sec-bugs state | 2026-11-01 | No release since 1.14.0 |
| https://github.com/spotbugs/spotbugs-gradle-plugin/releases | Plugin releases | 2026-11-26 | Current plugin version |
| https://github.com/advisories (GHSA-cxp5-3px4-pw24, wv8q-qhhj-9h54, 7hhh-6rmp-j9qf, p6pp-m3f8-5c89, gx83-3vf8-gh7j, q4xh-88c3-wmh7, q233-g92q-qxp6, 4v53-57pg-c464, xxph-c9ww-hj94, 52c6-99qm-3hqr, xm28-xvqc-gxxg, rr8v-fxxf-c986) | Maven advisories | 2026-09-17 to 2026-11-09 | Versions and mechanisms |
| https://github.com/OWASP/CheatSheetSeries/pull/2713 | OWASP deserialization cheat sheet change | 2026-10-04 | Filters plus resource limits |
| https://openjdk.org/legal/ai | OpenJDK interim generative AI policy | current | Confirms no agent failure-mode catalogue |

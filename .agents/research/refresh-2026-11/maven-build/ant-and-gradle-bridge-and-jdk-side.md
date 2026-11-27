---
title: Ant legacy, Gradle Ant bridge and JDK-side claims (delta)
pair: maven-build
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 12
---

# Delta 2026-09-12 to 2026-11-27

Verdict: no fact behind ant-legacy.md or the JDK-side claims changed in the window. The MVN-ANT-02 mechanism and its verification string are unchanged. Three items could not be determined (listed at the end). Pages were read through WebFetch, which summarises, so quotes are as returned by the fetch tool.

## Per claim

| Claim | Status | Evidence |
|---|---|---|
| MVN-ANT-01 `includeantruntime` default via `build.sysclasspath` and "usually best to set this to false" | unchanged | javac manual row: "No; defaults to yes, unless build.sysclasspath property is set"; "It is usually best to set this to false". https://ant.apache.org/manual/Tasks/javac.html |
| MVN-ANT-01 "Ant 1.8+" | could not determine | The javac page row carries no since-version note. The only Ant 1.8 notes on the page concern `createMissingPackageInfoClass`, `compilerarg prefix/suffix`, `compilerclasspath`. The annotation is the baseline's own and is not contradicted. |
| MVN-ANT-03 write-once properties | could not determine | https://ant.apache.org/manual/target.html returned 404; the properties page was not fetched. |
| MVN-ANT-04 `depends` quote | could not determine | Same 404 as above. |
| MVN-ANT-06 `digestalg`, `sigalg` | unchanged | signjar manual: "name of digest algorithm", "name of signature algorithm", both optional. https://ant.apache.org/manual/Tasks/signjar.html |
| MVN-ANT-06 `preservelastmodified` | unchanged text, annotation unverified | Row: "Give the signed files the same last modified time as the original jar files." default false. The page row carries no "Ant 1.7" note (a "since 1.7" note exists only for the `path` element and timestamped jars). The "Ant 1.7+" in the rule is not backed by this row; treat it as unverified, not as changed upstream. |
| MVN-ANT-06 "JDK-default signing algorithm moves between releases" | unchanged, and now corroborated | The Ant page only mentions the JDK 7 jarsigner default of SHA256 and SHA256withRSA. The JDK 27 jarsigner page gives `-digestalg` default SHA-384 and a key-type table for `-sigalg` (RSA up to 7680 bits SHA384withRSA, EC under 512 SHA384withECDSA, EdDSA, ML-DSA). That differs from the JDK 7 default, which supports the claim. https://docs.oracle.com/en/java/javase/27/docs/specs/man/jarsigner.html. I did not fetch the JDK 27 release notes (403), so I cannot say whether JDK 27 itself changed these defaults. |
| New Ant 1.10.x after baseline | none | Ant news page: latest core release is 1.10.18 on 2026-09-06, which is before the baseline. Only Antlib releases follow (CycloneDX Antlib 0.2, 2026-09-25). WHATSNEW itself was not opened. https://ant.apache.org/antnews.html |
| MVN-ANT-02 and row 17: configuration cache automatically disabled on Ant import | unchanged | Gradle 9.9.2 Ant guide: "Ant integration is not fully compatible with the configuration cache." and "As a result, the configuration cache is automatically disabled when importing an Ant build." https://docs.gradle.org/current/userguide/ant.html |
| MVN-ANT-02 mechanism | unchanged | Same sentence; still automatic, still on import. Nothing in the window softens it to a per-task fallback. |
| MVN-ANT-02 verification string `Reusing configuration cache.` | could not determine | The configuration_cache page as summarised did not contain that literal line, so the page does not confirm or contradict it. https://docs.gradle.org/current/userguide/configuration_cache.html |
| "Gradle 7+ for the configuration cache" | changed in emphasis only | Same page: "Since Gradle 9.0.0, the Configuration Cache is the preferred mode of execution" and it "will be enabled by default in Gradle 10." Gradle 7+ is still not contradicted. Gradle 9.9.0 was released 2026-11-23 (9.9.1 and 9.9.2 followed); the release notes do not mention Ant, the cache default or the message. https://docs.gradle.org/release-notes.html. Owner of the general topic is gradle-build. |
| `maven-antrun-plugin` "unmeasured as of 2026-09-12" | could not determine | No measurement source was fetched in this task; remains open. |
| MVN-BUILD-16/-17 JDK 23 end of implicit processing; javac page text | unchanged | JDK 27 is GA (announced 2026-09-15 per Oracle press release surfaced by search, https://www.oracle.com/news/announcement/oracle-releases-java-27-2026-09-15/; build 27+35). The JDK 26 and 27 javac pages carry identical `-proc` text: "If this option is not used, annotation processing and compilation are done if at least one other option is used to explicitly configure annotation processing." https://docs.oracle.com/en/java/javase/27/docs/specs/man/javac.html and .../26/... |
| Baseline note "JDK 27 not yet GA" | changed | JDK 27 reached GA on 2026-09-15, three days after the baseline. Any "not GA" wording in the pair is now stale. |
| MVN-BUILD-21 javac source default separate from JEP 400 | unchanged | JDK 26 and 27 javac `-encoding`: "If the `-encoding` option is not specified, then the platform default converter is used." No later JDK changed javac's default. |

## Normative candidates

1. Drop or reword any "JDK 27 not yet GA" statement in the pair; state "JDK 27 GA 2026-09-15". Rationale: baseline fact expired. Verify: `grep -rn "27" rules/maven-build.md skills/maven-build-reference/`.
2. MVN-ANT-06: remove or re-verify the "Ant 1.7+" annotation; the signjar `preservelastmodified` row shows no version. Rationale: unsupported source claim. Verify: reading signjar.html against the rule.
3. Optionally add JDK 27 jarsigner defaults (SHA-384 digest, key-type sigalg table) as the concrete example of "moves between releases". Verify: compare the jarsigner man page.

## Could not determine (follow-ups)

- Ant target.html 404: re-fetch `https://ant.apache.org/manual/using.html` for `depends` and the properties page for write-once.
- JDK 27 release notes returned 403 (oracle.com pages and jdk.java.net/27); jarsigner or javac default changes in the notes are unconfirmed beyond the man pages.
- Literal `Reusing configuration cache.` and `maven-antrun-plugin` measurement not re-checked.

## Sources

Fetched: ant.apache.org javac.html, signjar.html, antnews.html; target.html (404); docs.gradle.org ant.html, configuration_cache.html, release-notes.html; docs.oracle.com javac 26 and 27, jarsigner 27; web search for JDK 27 GA (snippet only, Oracle press release link not opened).

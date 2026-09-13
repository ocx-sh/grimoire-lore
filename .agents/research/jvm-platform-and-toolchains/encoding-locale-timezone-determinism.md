---
title: "Same source, different bytes: encoding, locale, timezone and archive determinism"
topic: platform-and-toolchains
agent: encoding-locale-timezone-determinism-dive
model: sonnet
date_researched: 2026-09-12
sources_count: 16
scope: >
  JAVA-PLAT rules for byte-level and behavioural determinism: charset defaults
  (JEP 400 and its limits), the Gradle-daemon file.encoding trap, javac/kotlinc
  source-encoding pinning, Properties.store() timestamps, jar/zip archive
  reproducibility (inheriting, not re-deriving, GRADLE-CACHE-17/M-D-11), whether
  shadowJar actually gets Gradle 9's reproducible-archive defaults, Maven's
  project.build.outputTimestamp, and the practised-vs-unpractised gap on test
  locale/timezone pinning. Does NOT cover: per-call-site Locale-argument linting
  (M-Q-05, owned by the lint-gate consolidation), JDK floors/module system/removed
  APIs (the sibling jdk-floors-modules-and-removed-apis dive), or Kotlin compiler
  flags (the sibling kotlin-toolchain-and-codegen dive).
---

# Same source, different bytes

## Table of contents

1. [Findings](#findings)
   1. [JEP 400: what actually changed, and what it deliberately did not touch](#1-jep-400-what-actually-changed-and-what-it-deliberately-did-not-touch)
   2. [file.encoding is UTF-8 or COMPAT on JDK 18+ — nothing else is defined](#2-fileencoding-is-utf-8-or-compat-on-jdk-18---nothing-else-is-defined)
   3. [The Gradle daemon launches before your toolchain does](#3-the-gradle-daemon-launches-before-your-toolchain-does)
   4. [Source-encoding pinning at the build-tool layer](#4-source-encoding-pinning-at-the-build-tool-layer)
   5. [Properties.store() always writes a timestamp comment](#5-propertiesstore-always-writes-a-timestamp-comment)
   6. [Jar/zip entries: order, timestamps, permissions — inherited, not re-derived](#6-jarzip-entries-order-timestamps-permissions--inherited-not-re-derived)
   7. [Does shadowJar actually inherit Gradle 9's reproducible-archive defaults?](#7-does-shadowjar-actually-inherit-gradle-9s-reproducible-archive-defaults)
   8. [mergeServiceFiles(): order preserved, but it is classpath order, not sorted order](#8-mergeservicefiles-order-preserved-but-it-is-classpath-order-not-sorted-order)
   9. [Maven's project.build.outputTimestamp](#9-mavens-projectbuildoutputtimestamp)
   10. [The measured gap: locale and timezone](#10-the-measured-gap-locale-and-timezone)
   11. [HashMap/HashSet iteration order and classpath scan order](#11-hashmaphashset-iteration-order-and-classpath-scan-order)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Exemplar evidence](#exemplar-evidence)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- JEP 400 (JDK 18) standardised the JVM's **default charset** to UTF-8; it did **not** remove, deprecate, or add a mandatory-charset requirement to any charset-less API — `new String(byte[])`, `getBytes()`, `new FileReader(File)`, `new PrintStream(OutputStream)` all still compile and still silently use "the default," which is now usually UTF-8 but is not guaranteed to be ([JEP 400](https://openjdk.org/jeps/400)).
- The one documented value that overrides the JEP-400 default is `-Dfile.encoding=COMPAT`, which restores pre-JDK-17 platform-dependent behaviour — so "relies on the platform default" is not a solved problem, it is a problem whose failure mode moved from "every OS" to "only COMPAT mode or JDK ≤ 17" ([JEP 400](https://openjdk.org/jeps/400)).
- `file.encoding` is a supported command-line property only as `UTF-8` or `COMPAT` on JDK 18+; any other value's behaviour is explicitly unspecified by the JEP's own `System.getProperties()` implementation note ([JEP 400](https://openjdk.org/jeps/400)).
- Gradle **never** sets `file.encoding` for its own daemon JVM launch, and that launch happens before toolchain selection even applies — so `org.gradle.jvmargs=-Dfile.encoding=UTF-8` in `gradle.properties` is still load-bearing on a non-UTF-8-default host (Windows) even when the project's toolchain floor is JDK 18+ ([gradle/gradle#2270](https://github.com/gradle/gradle/issues/2270)).
- 13/32 exemplars set `-Dfile.encoding` explicitly and 15/32 set `options.encoding`/`project.build.sourceEncoding` — a materially different set of repos, and neither alone covers the other half of the problem ([gates](../jvm-audit/exemplar-quality-gates.md)).
- `Properties.store()` **always** writes a second, machine-generated date comment line regardless of whether the caller passes a `comments` argument — this is a standing, unconditional non-determinism source in any build-generated `.properties` file ([reproducible-builds.org](https://reproducible-builds.org/docs/jvm/)).
- Gradle 9.0.0 flipped all three archive defaults at once (`reproducibleFileOrder` false→true, `preserveFileTimestamps` true→false, permissions umask→0755/0644); this is settled ground owned by `jvm-gradle-core.md` **GRADLE-CACHE-17** (topic-map M-D-11) — cited here, not re-derived.
- **New for this dive: `shadowJar` DOES inherit Gradle 9's `reproducibleFileOrder`/`preserveFileTimestamps` defaults**, verified by reading Shadow 9.7.0's own source: `ShadowJar` never overrides `createCopyActionExecuter()`, so `AbstractArchiveTask`'s version (which reads `isReproducibleFileOrder()`, default `true` since 9.0.0) drives the file-tree walk order before Shadow's custom `CopyAction` ever sees a stream (`GradleUp__shadow@541b3be475:.../ShadowJar.kt:538-547`, cross-checked against `gradle__gradle@ea17004a31:subprojects/core/.../AbstractArchiveTask.java:362` and `AbstractCopyTask.java:165-181`).
- `mergeServiceFiles()` **does** preserve entry order deterministically, but it is **classpath-resolution order**, not sorted order: `ServiceFileTransformer` accumulates lines into a `mutableSetOf()` (a `LinkedHashSet`), so the merged file's line order is whichever order Shadow visits the bundled dependency jars in — reproducible only as long as the resolved dependency graph itself is reproducible (locked versions, no dynamic ranges) (`GradleUp__shadow@541b3be475:.../ServiceFileTransformer.kt:36-58`).
- Shadow's own `PropertiesFileTransformer` already engineered around the exact `Properties.store()` timestamp-comment bug this dive flags at the JDK level — its internal `ReproducibleProperties` class overrides `store()` to throw, sorts `entries` alphabetically, and exposes a comment-free `writeWithoutComments()` (`GradleUp__shadow@541b3be475:.../internal/ReproducibleProperties.kt`). This is the reference shape for anyone hand-rolling a merged `.properties` output.
- Maven's `project.build.outputTimestamp` (ISO-8601 UTC) drives both jar-entry timestamps and is automatic by default only from **Maven 4.0.0-beta-5** onward; the corpus's Maven 3.9.x-era baseline needs it declared explicitly ([Maven reproducible-builds guide](https://maven.apache.org/guides/mini/guide-reproducible-builds.html)).
- **0/32 exemplars pin a test timezone** (`-Duser.timezone` or `TZ=`), in a corpus containing kafka, guava, jackson-databind and Exposed — all date/time-sensitive libraries ([gates](../jvm-audit/exemplar-quality-gates.md)).
- That gap is a **new commitment, not a codified practice** — `jvm-quality-gates.md` verdict 10 already names timezone pinning as exactly the kind of thing an agent asked to "harden the test gate" invents with zero corpus support; this dive keeps it at **CONSIDER**, not MUST or SHOULD, on the same evidence.
- `-Duser.language` is set in 2/32 (guava, gradle/gradle), and guava's use is deliberately adversarial — it runs its whole test suite under `hi`/`IN` specifically to catch locale-sensitive bugs, not to declare a "correct" locale (`google__guava@5fb424c43a:pom.xml:384`).
- HashMap/HashSet iteration order and classpath/`ServiceLoader` scan order are folded into **one** determinism row rather than split: both are "an unspecified default silently becomes part of your output," the same shape as the encoding problem, and a single reading heuristic (does output feed a golden file, a serialised artifact, or a generated-code path?) catches both.
- The OCX SDK and the OCX Gradle plugin inherit this dive's rules unconditionally: a CLI-wrapping SDK that shells out to `ocx --format json` is exactly the kind of code where an implicit charset on `Process.getInputStream()`/`new String(bytes)` silently corrupts non-ASCII tool output on a COMPAT-mode or pre-18 JVM.

## Findings

### 1. JEP 400: what actually changed, and what it deliberately did not touch

JEP 400's stated goals are narrow and explicit: "Make Java programs more predictable and portable when their code relies on the default charset. Clarify where the standard Java API uses the default charset. Standardize on UTF-8 throughout the standard Java APIs, except for console I/O." Its non-goals are just as explicit: "It is not a goal to define new standard Java APIs... There is no intent to deprecate or remove standard Java APIs that rely on the default charset rather than taking an explicit charset parameter" ([JEP 400](https://openjdk.org/jeps/400)).

That framing matters more than the list of affected classes. JEP 400 named `InputStreamReader`, `FileReader`, `OutputStreamWriter`, `FileWriter`, and `PrintStream` (java.io), plus `Formatter`/`Scanner` (java.util) and the deprecated `URLEncoder`/`URLDecoder` methods (java.net) as APIs that "use the default charset" — but the fix is not a change to those classes. The fix is that `Charset.defaultCharset()` itself now returns UTF-8 (unless overridden), and every one of those APIs, plus every other default-charset consumer including `new String(byte[])` and `getBytes()`, inherits the new value automatically. **The charset-less overloads were not removed, not deprecated, and remain exactly as easy to call as before** — what changed is what silently happens when you call them.

```java
// Still compiles on every JDK, still charset-less, still a lint finding on JDK 18+ too:
String s = new String(bytes);           // Charset.defaultCharset() — usually UTF-8 since 18, NOT if COMPAT
byte[] b = s.getBytes();                // same
Reader r = new FileReader(file);        // same
PrintStream out = new PrintStream(os);  // same

// The only way to make the call site's behaviour independent of file.encoding:
String s = new String(bytes, StandardCharsets.UTF_8);
byte[] b = s.getBytes(StandardCharsets.UTF_8);
Reader r = new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8);
PrintStream out = new PrintStream(os, false, StandardCharsets.UTF_8);
```

This is why Error Prone's `DefaultCharset` and SpotBugs's `DM_DEFAULT_ENCODING` still exist and still fire on JDK 25/26 code: the checks are about the *call site's* provability, not about whether today's default happens to be correct. JEP 400 turned a near-universal bug class into a conditional one (COMPAT mode, JDK ≤ 17, or a locale-dependent library still reading the pre-18 `sun.jnu.encoding`-adjacent platform default for filesystem paths, which JEP 400 explicitly does not touch) — it did not turn it into a non-issue.

### 2. file.encoding is UTF-8 or COMPAT on JDK 18+ — nothing else is defined

JEP 400 rewrote the `System.getProperties()` implementation note for `file.encoding`: "If `file.encoding` is set to `"COMPAT"`... then the default charset will be the charset chosen by the algorithm in JDK 17 and earlier... If `file.encoding` is set to `"UTF-8"`... then the default charset will be UTF-8... **The treatment of values other than `"COMPAT"` and `"UTF-8"` is not specified**" ([JEP 400](https://openjdk.org/jeps/400)). Any build script, launcher script, or Dockerfile that pins `-Dfile.encoding=ISO-8859-1` (or any other charset name) on JDK 18+ is relying on undefined-by-spec behaviour — it may still work on a given JDK build, but it is not a portable configuration and is a different defect class from "no encoding pinned at all."

### 3. The Gradle daemon launches before your toolchain does

Gradle's own daemon is launched by whichever JVM starts the `gradle`/`gradlew` process — not by the JVM the project's `java { toolchain { ... } }` block requests. Toolchain resolution is a *build-time concept*: it selects the JDK used to compile and run tasks, but the daemon JVM itself is chosen (and its `file.encoding` fixed for the process's lifetime) before any build script line is evaluated. [gradle/gradle#2270](https://github.com/gradle/gradle/issues/2270) is the tracked request to make the daemon default to UTF-8 itself; as of 2026-09-12 it remains open (milestone 10.0.0-RC1), and its own text is explicit about why the gap matters for caching, not just output correctness: "different operating systems have different defaults — Windows typically uses CP-1252... When tasks don't explicitly declare file encoding as an input, cached task outputs can be incorrectly reused across different operating systems." The issue's own stated workaround is the one this dive's rule adopts verbatim: `org.gradle.jvmargs=-Dfile.encoding=UTF-8`.

The practical consequence: **a project whose declared JDK floor is 21 or 25 still needs this line if it ever builds on a machine whose launcher JVM's platform default is not UTF-8** — the floor governs compilation and runtime, not the daemon's own encoding. This is exactly the nuance the map's M-E-04 row calls out and this dive confirms unresolved as of 2026-09-12.

```kotlin
// gradle.properties — needed regardless of the project's own JDK floor
org.gradle.jvmargs=-Dfile.encoding=UTF-8
```

### 4. Source-encoding pinning at the build-tool layer

`javac`'s own `-encoding` flag and `kotlinc`'s source reading both fall back to the platform default when unset — a different fallback point from JEP 400's runtime-library scope, so pinning it is not redundant with pinning `file.encoding`. Gradle's `JavaCompile.options.encoding` and Maven's `<project.build.sourceEncoding>` are the two build-tool-level knobs:

```kotlin
// Gradle Kotlin DSL
tasks.withType<JavaCompile>().configureEach {
  options.encoding = "UTF-8"
}
```

```xml
<!-- Maven -->
<properties>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
```

Measured: 15/32 exemplars set one of these two forms, 13/32 set `-Dfile.encoding` as a JVM arg, and the two sets are **not the same repos** — a build can have one without the other ([gates](../jvm-audit/exemplar-quality-gates.md)). Half the fix is the compiler's own input encoding; the other half is every other JVM process the build spawns (test JVMs, annotation processors, exec'd tools) reading `file.encoding` for everything else. A rule that only sets `options.encoding` still leaves a test JVM vulnerable to the daemon-launch gap in §3.

### 5. Properties.store() always writes a timestamp comment

`java.util.Properties.store(Writer/OutputStream, String comments)` writes the caller's `comments` argument as an optional first comment line, then **unconditionally** writes a second comment line containing the current date — this happens whether `comments` is `null` or not, and there is no JDK-level flag to suppress it. reproducible-builds.org's own JVM guidance names this directly: "the `java.properties.date` system property [can] override this to ensure consistency" ([reproducible-builds.org/docs/jvm/](https://reproducible-builds.org/docs/jvm/)). Any build step that calls `Properties.store()` to write a `.properties` file into a published artifact — a generated `build-info.properties`, a merged resource bundle, a version-stamp file — is a non-determinism source independent of every archive-level fix in §6-8, because the difference is inside the file's bytes, not in the zip container around it.

```properties
#Generated by MyPlugin
#Fri Sep 11 23:58:04 CEST 2026     <- written unconditionally, changes every build
myapp.version=1.4.0
```

Maven's Reproducible Builds mode extends `project.build.outputTimestamp` to cover this path too (see §9); on the Gradle side there is no equivalent built-in flag, so a plugin generating `.properties` output needs its own workaround — Shadow's `ReproducibleProperties` (§5 of the summary, `internal/ReproducibleProperties.kt`) is the reference shape: override `store()` to refuse silent use, sort `entries` before serialisation, and expose an explicit comment-free write path.

### 6. Jar/zip entries: order, timestamps, permissions — inherited, not re-derived

This is settled ground, owned by `jvm-gradle-core.md`'s **GRADLE-CACHE-17** (topic-map row M-D-11), cited here rather than restated: Gradle 9.0.0 flipped `reproducibleFileOrder` (false→true), `preserveFileTimestamps` (true→false) and archive permissions (umask→fixed `0755`/`0644`) together, as one change. The consequence for any rule author: on Gradle ≥ 9.0.0, an *explicit* setting of any of these three properties is now the reproducibility **opt-out**, not the fix — and it needs a justifying comment or deletion. On Gradle < 9.0.0, the *absence* of `reproducibleFileOrder = true; preserveFileTimestamps = false` is the finding instead. `apache__kafka@940c100fab:build.gradle:362-364` is the corpus's sharpest example of the trap: it carries Gradle's own documented pre-9 "restore legacy behaviour" snippet, verbatim, while its wrapper pins Gradle 9.7.1 — an active, uncommented opt-out of reproducibility on its current toolchain (`jvm-gradle-core.md` §"Violated by prominent exemplars").

Gradle's upgrade guide states the new/old values plainly: "File order in the archive is now deterministic... Files have fixed timestamps... All directories have fixed permissions set to `0755`. All files have fixed permissions set to `0644`," with the documented revert snippet being:

```kotlin
tasks.withType<AbstractArchiveTask>().configureEach {
    isReproducibleFileOrder = false
    isPreserveFileTimestamps = true
    useFileSystemPermissions()
}
```
([Gradle upgrading-major-version-9 guide](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html))

### 7. Does shadowJar actually inherit Gradle 9's reproducible-archive defaults?

This is the carried-over question from wave 2 (`jvm-distribution.md` DIST-07/DIST-13's handover): does a `shadowJar` output actually get Gradle 9's archive-reproducibility defaults, or does Shadow's custom packaging bypass them the way it bypasses Gradle's normal `CopyAction`? **Answer: yes, it inherits both `reproducibleFileOrder` and `preserveFileTimestamps`, but by two different mechanisms, and it is worth knowing which.**

Traced through Shadow 9.7.0-SNAPSHOT's own source (`GradleUp__shadow@541b3be475`) and Gradle 9.7.1's own source (`gradle__gradle@ea17004a31`):

1. `ShadowJar : Jar()` (`ShadowJar.kt:83`), and `Jar` is `Zip` is `AbstractArchiveTask`. `ShadowJar` overrides `copy()` (`@TaskAction override fun copy() { ...; super.copy(); ... }`, `ShadowJar.kt:538-542`) and `createCopyAction()` (`ShadowJar.kt:547-...`, returning the custom `ShadowCopyAction`) — but it **never overrides `createCopyActionExecuter()`**.
2. `super.copy()` resolves to `AbstractCopyTask.copy()` (`AbstractCopyTask.java:165-170`): `CopyActionExecuter copyActionExecuter = createCopyActionExecuter(); CopyAction copyAction = createCopyAction(); copyActionExecuter.execute(rootSpec, copyAction);`
3. `createCopyActionExecuter()` is itself overridden by `AbstractArchiveTask` (`AbstractArchiveTask.java:362`): `return new CopyActionExecuter(..., isReproducibleFileOrder(), ...)` — where `isReproducibleFileOrder()` reads the task's own `archiveReproducibleFileOrder` property, whose convention is `true` since Gradle 9.0.0 (`AbstractArchiveTask.java:90`).
4. `CopyActionExecuter` threads that boolean into `CopySpecBackedCopyActionProcessingStream`, which drives `spec.walk(...)` — the file-tree traversal order — **before** `action.execute(stream)` ever calls into Shadow's `ShadowCopyAction` (`CopySpecBackedCopyActionProcessingStream.java`).

So the entry-order guarantee is enforced upstream of Shadow's own `CopyAction`, by machinery Shadow never touches — Shadow gets it for free precisely because it never overrides `createCopyActionExecuter()`. **`preserveFileTimestamps` is different**: Shadow's `ShadowCopyAction` re-implements zip-entry writing from scratch (it uses Apache Commons Compress's `ZipOutputStream`, not Gradle's internal one), so it explicitly re-reads the inherited `isPreserveFileTimestamps` value and threads it through its own constructor (`ShadowJar.kt:597: isPreserveFileTimestamps = isPreserveFileTimestamps`), applying it entry-by-entry against a fixed `CONSTANT_TIME_FOR_ZIP_ENTRIES` epoch when the flag is `false` (`internal/Zip.kt:writeEntry`).

**Practical conclusion**: on Shadow ≥ 9.0.0 / Gradle ≥ 9.0.0, a `shadowJar` task that sets neither property gets both reproducibility guarantees automatically, the same as any other `Jar` task — GRADLE-CACHE-17 applies to `shadowJar` unmodified, with no separate carve-out rule needed. The one caveat that is genuinely new: **entry order and timestamp determinism do not by themselves guarantee two clean builds produce byte-identical shaded jars** — see §8 for the remaining variable.

### 8. mergeServiceFiles(): order preserved, but it is classpath order, not sorted order

Shadow's own docs describe `mergeServiceFiles()`'s guaranteed **processing** order only loosely ("all files in projects are processed before any dependency files") and say nothing about the **output line order** within a merged `META-INF/services/*` file ([gradleup.com/shadow/configuration/merging/](https://gradleup.com/shadow/configuration/merging/)). Reading `ServiceFileTransformer.kt` directly settles it: each merged provider file's lines accumulate into `serviceEntries.getOrPut(resource) { mutableSetOf() }` (`ServiceFileTransformer.kt:36`) — Kotlin's `mutableSetOf()` returns a `LinkedHashSet`, which preserves **insertion order**, and insertion order here is the order Shadow's transformer visits the bundled dependency jars, which is the order the resolved `runtimeClasspath`/`shadow` configuration lists them in.

That means the merge is deterministic **for a fixed, resolved dependency graph** — the same lockfile/version set, resolved the same way, produces the same line order every time — but it is not alphabetically sorted, and a dependency-version bump that reorders the resolved graph (even one that changes no provider-file content at all) silently reorders the merged output. This is the missing half of "is a shadowJar byte-identical across two clean builds": **yes, given the same resolved classpath**, because reproducibleFileOrder (§7) fixes the archive-entry order and `mergeServiceFiles()`'s `LinkedHashSet` fixes the per-file line order for that same resolved graph — but "same resolved classpath" is an assumption that needs a lockfile or pinned versions to hold, not something `mergeServiceFiles()` itself provides.

```kotlin
tasks.shadowJar {
  mergeServiceFiles()   // line order = classpath resolution order, not sorted
}
```

### 9. Maven's project.build.outputTimestamp

Maven's own reproducible-builds guide specifies `project.build.outputTimestamp` as an ISO-8601 UTC timestamp property that governs jar-entry timestamps (and, per the reproducible-builds.org JVM page, cooperates with `java.properties.date` for `Properties.store()` output too):

```xml
<properties>
  <project.build.outputTimestamp>2026-09-12T00:00:00Z</project.build.outputTimestamp>
</properties>
```

Reproducible Builds mode is **active by default only from Maven 4.0.0-beta-5 onward** ([Maven reproducible-builds guide](https://maven.apache.org/guides/mini/guide-reproducible-builds.html)) — and per wave-2 correction 29, the GA line on Central as of 2026-09-12 is still `4.0.0-rc-6`, not a plain `4.0.0`, so treat "automatic in Maven 4" as forward-looking, not a fact about the shipped release. Every exemplar in the corpus is effectively pre-this-default and needs the property declared explicitly to get any reproducibility guarantee at all.

### 10. The measured gap: locale and timezone

Across all 32 exemplars ([gates](../jvm-audit/exemplar-quality-gates.md)):

| Signal | Count | grep |
|---|---|---|
| `-Dfile.encoding=…` (JVM arg) | 13/32 | `grep -rl -- '-Dfile.encoding'` |
| `options.encoding=` / `<project.build.sourceEncoding>` | 15/32 | `grep -rl -iE 'options\.encoding\s*=\|project\.build\.sourceEncoding'` |
| `-Duser.language` | 2/32 (guava, gradle/gradle) | `grep -rl -- '-Duser.language'` |
| `-Duser.timezone` / `TZ=` pin | **0/32** | `grep -rl -iE '\-Duser\.timezone\|"TZ"'` |

Guava's `-Duser.language=hi -Duser.country=IN` is not a "correct locale" setting — it is deliberately adversarial: `google__guava@5fb424c43a:pom.xml:384` runs the whole Surefire suite under a non-English, non-Latin locale specifically to surface `String.toUpperCase()`/`String.format()`/`NumberFormat` bugs that only manifest outside `en-US`. This is the opposite intent from the timezone question below: guava's rule is "flip the default to catch bugs," not "pin the default to a known value."

**The timezone finding is different in kind: it is a total absence, not a deliberate choice.** No exemplar sets `-Duser.timezone` or `TZ=` anywhere, in a corpus that includes kafka (log-segment retention timestamps), guava (`com.google.common.time`-adjacent utilities), jackson-databind (date/time (de)serialization is one of its largest surface areas), and Exposed (a SQL ORM whose `datetime` column type is directly timezone-sensitive). `jvm-quality-gates.md` verdict 10 already states the risk explicitly: "Test retry (1/32 official), timezone pinning (0/32), Pitest (1/32) and commit-time format hooks (0/29 non-Bazel) are all CONSIDER at most. An agent asked to 'harden the test gate' will invent these; the rules exist partly to stop it." **This dive keeps that verdict rather than promoting it**: 0/32 support means a MUST or SHOULD here would be pure invention dressed as a codified practice, and the corpus's silence on the question is not evidence the practice is unneeded — it is evidence nobody has looked, which is exactly why CONSIDER (not "no rule at all") is the right severity: it says "worth a comment in review," not "worth a build failure."

### 11. HashMap/HashSet iteration order and classpath scan order

Both `HashMap`/`HashSet` iteration order (an implementation-detail function of hash codes and insertion history, never a documented contract) and classpath/`ServiceLoader` scan order (a function of classpath entry order, itself downstream of the same dependency-resolution-order question as §8) share one failure shape: **an unspecified default silently becomes part of a build's observable output** — a golden-file test, a generated-code file, or a serialized artifact whose byte content depends on an iteration order nobody declared as meaningful. This dive folds them into **one** normative row rather than two, because the fix and the reading heuristic are identical in both cases: does this output path (test fixture, code generator, serialization) read from a `HashMap`/`HashSet` or an unsorted `ServiceLoader`/classpath-scan result without an explicit sort or a `LinkedHashMap`/`TreeMap` at the boundary? If yes, that is the finding, regardless of whether the unordered collection is JDK-native or DI/classpath-scan-sourced.

## Normative guidance candidates

| ID | Rule | Rationale | Verification |
|---|---|---|---|
| JAVA-PLAT-ENC-01 | Never call a charset-less overload (`new String(byte[])`, `String.getBytes()`, `new FileReader(File)`, `new InputStreamReader(InputStream)`, `new PrintStream(OutputStream)`, `new Scanner(InputStream)`, `new Formatter()`) — pass an explicit `Charset`/`StandardCharsets` constant, even on a JDK 18+ floor. | JEP 400 changed the *default value*, not the API surface; the call site is still unprovable by inspection and still breaks under `-Dfile.encoding=COMPAT` or a JDK ≤ 17 toolchain someone builds against later. | Error Prone `-Xep:DefaultCharset:ERROR`; SpotBugs `DM_DEFAULT_ENCODING`. Both flag independently — run both, not one as a substitute for the other. |
| JAVA-PLAT-ENC-02 | Pin `options.encoding = "UTF-8"` (Gradle `JavaCompile`) or `<project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>` (Maven) explicitly, regardless of the project's JDK floor. | `javac`'s own source-reading default is a separate fallback point from JEP 400's runtime-library scope; 15/32 corpus repos set this and it is not the same 15 that set `-Dfile.encoding`. | `grep -rn 'options\.encoding\s*=\|project\.build\.sourceEncoding' <build files>` — absence is the finding. |
| JAVA-PLAT-ENC-03 | Set `org.gradle.jvmargs=-Dfile.encoding=UTF-8` in the root `gradle.properties` on any project whose CI matrix or supported dev platform includes Windows (or any non-UTF-8-default host), regardless of the project's JDK floor. | The Gradle daemon launches before toolchain selection and Gradle itself never sets `file.encoding` for that launch ([gradle/gradle#2270](https://github.com/gradle/gradle/issues/2270), open as of 2026-09-12); a JDK-18+ floor does not fix the daemon's own encoding. | `grep -n 'file.encoding' gradle.properties`; cross-check the CI workflow's `runs-on`/matrix for a `windows-*` entry — absence of the property with a Windows job present is the finding. |
| JAVA-PLAT-ENC-04 | Treat any `-Dfile.encoding=<value>` other than `UTF-8` or `COMPAT` on a JDK 18+ floor as a defect, not a configuration choice. | JEP 400's own spec note: "The treatment of values other than `COMPAT` and `UTF-8` is not specified." | `grep -rn -- '-Dfile.encoding=' <build files, launcher scripts, Dockerfiles>` — any value not in `{UTF-8, COMPAT}` is the finding. |
| JAVA-PLAT-DET-05 | On Gradle ≥ 9.0.0, add nothing for archive reproducibility; any explicit `reproducibleFileOrder`/`preserveFileTimestamps`/`useFileSystemPermissions()` needs a justifying comment. **Inherited from `jvm-gradle-core.md` — see GRADLE-CACHE-17 / M-D-11 for the full rule and version-gate.** | Not re-derived here; cited to avoid two authoritative copies of the same version-gated rule drifting apart. | See GRADLE-CACHE-17's own verification cell. |
| JAVA-PLAT-DET-06 | Do not add a separate reproducibility rule for `shadowJar`/shaded jars beyond GRADLE-CACHE-17 — it inherits both `reproducibleFileOrder` and `preserveFileTimestamps` automatically on Shadow ≥ 9.0.0 / Gradle ≥ 9.0.0. Instead, confirm the shaded jar is byte-identical across two clean builds, and pin (lock or fix, no dynamic ranges) every dependency that feeds a `mergeServiceFiles()`-merged provider file. | Verified via source: `ShadowJar` never overrides `createCopyActionExecuter()`, so Gradle's own `AbstractArchiveTask` ordering guarantee applies upstream of Shadow's custom `CopyAction`; but `mergeServiceFiles()`'s merged line order is classpath-resolution order (a `LinkedHashSet`), not sorted, so a dependency-graph change can silently reorder merged output even with all archive flags correct. | `rm -rf build/ && ./gradlew shadowJar && sha256sum build/libs/*.jar > /tmp/a.sha && rm -rf build/ && ./gradlew shadowJar && sha256sum build/libs/*.jar > /tmp/b.sha && diff /tmp/a.sha /tmp/b.sha` from a clean checkout, twice, with no dependency version changed between runs. |
| JAVA-PLAT-DET-07 | Any build step that calls `Properties.store()` to write a `.properties` file into a published or reproducibility-claimed artifact must not ship the unconditional date-comment line — either pin `java.properties.date` (Maven), or write through a comment-free/sorted `Properties` subclass (Shadow's `internal/ReproducibleProperties.kt` pattern) on the Gradle side, where there is no built-in flag. | `Properties.store()` writes a second, machine-generated date comment line unconditionally — this is independent of every archive-level (entry order/timestamp) fix. | Two clean builds, diff the generated `.properties` file's bytes directly (not just the containing jar's hash) — a differing second comment line with identical `key=value` lines is the signature. |
| JAVA-PLAT-DET-08 | Maven builds declare `<project.build.outputTimestamp>` explicitly as an ISO-8601 UTC timestamp (not left to Maven-4-beta's future default), on any module making a reproducibility claim. | Automatic-by-default only from Maven 4.0.0-beta-5; the corpus's Maven baseline (3.9.x-era, and 4.0.0-rc-6 as the newest 4.x artifact per wave-2 correction 29) predates that default entirely. | `grep -n 'project.build.outputTimestamp' pom.xml` — absence on a repo claiming reproducible builds is the finding; presence with a non-ISO-8601 value is a second finding. |
| JAVA-PLAT-DET-09 | CONSIDER pinning a test-suite timezone (`-Duser.timezone=UTC` JVM arg, or `TZ=UTC` in the CI environment) on any module with date/time-sensitive logic. Do not raise this above CONSIDER without an owner decision — the corpus gives it zero support. | 0/32 exemplars pin a test timezone at all, including kafka, guava, jackson-databind and Exposed; `jvm-quality-gates.md` verdict 10 names this exact rule as something an agent invents unprompted when asked to harden a test gate, precisely because it sounds like an obvious hardening step. | `grep -rniE '\-Duser\.timezone|\bTZ=' <build files, CI workflows>` — absence is not itself a defect at this severity; presence with a value other than a fixed, named zone (e.g. bare `UTC` vs. an unset system default) is the positive check. |
| JAVA-PLAT-DET-10 | SHOULD run at least one CI job (or one dedicated test task) under a non-default, non-English `Locale` (guava's `-Duser.language=hi -Duser.country=IN` pattern) for any module doing string case conversion, number/date formatting, or collation. This is distinct from M-Q-05's per-call-site "pass an explicit `Locale` argument" lint — that rule catches the call site; this one catches what the call site's *absence of an argument* actually does. | 2/32 exemplars do this (guava, gradle/gradle) and guava's own commit history frames it as bug-catching, not compliance. | `grep -rn 'user\.language\|user\.country' <build files, CI workflows>` for presence; absent from a module using `String.format`, `toUpperCase()`/`toLowerCase()` without a `Locale` argument is the gap this row exists to flag (in coordination with M-Q-05's Error Prone check). |
| JAVA-PLAT-DET-11 | Any test fixture, golden file, generated-code output, or serialization path whose bytes depend on iterating a `HashMap`/`HashSet`, or on unsorted `ServiceLoader`/classpath-scan results, must sort or use an order-preserving collection (`LinkedHashMap`/`TreeMap`, or an explicit `.sorted()`) at the boundary where the output is produced. | Folds two questions (M-Q-07's JDK-collection half and the classpath/DI-scan half) into one row: both are "an unspecified default becomes part of your output," and the fix and check are identical for both. | Reading heuristic, not a single grep: find every write to a golden file / generated-source directory / serialized fixture and trace its input back to a `HashMap`/`HashSet`/`ServiceLoader.load()` call with no visible sort — flaky-on-CI-only or flaky-across-JVM-versions golden-file diffs are the runtime symptom. |

## Exemplar evidence

| Rule | Satisfies | Violates / gap |
|---|---|---|
| JAVA-PLAT-ENC-02/03 | 15/32 set `options.encoding`/`sourceEncoding`; `org.gradle.jvmargs` is paired with `-Dfile.encoding=UTF-8` in every `gradle.properties`-bearing repo **except kafka and apollo-kotlin** ([shape §](../jvm-audit/exemplar-build-shape.md) row "org.gradle.jvmargs"). | `apache__kafka@940c100fab` and `apollographql__apollo-kotlin@c145295b72` both set `org.gradle.jvmargs` for heap sizing without the encoding flag — exactly the gap JAVA-PLAT-ENC-03 exists to catch. |
| JAVA-PLAT-DET-06 (shadowJar reproducibility) | `apache__kafka@940c100fab` and `GradleUp__shadow@541b3be475` both pin wrapper Gradle **9.7.1** — the exact version this dive's source-reading conclusion is verified against. | `apache__kafka@940c100fab:build.gradle:362-364` explicitly opts the *whole build* (not just `shadowJar`) out of reproducibility (`reproducibleFileOrder = false; preserveFileTimestamps = true`), which also nullifies whatever `shadowJar` would otherwise inherit for free — the finding is GRADLE-CACHE-17's, but it is worth restating here because it directly undoes JAVA-PLAT-DET-06's "add nothing" advice for that one module. |
| JAVA-PLAT-DET-07 (Properties.store() timestamps) | `GradleUp__shadow@541b3be475:src/main/kotlin/.../internal/ReproducibleProperties.kt` and `.../transformers/PropertiesFileTransformer.kt` implement the exact workaround this rule asks for, for merged Properties output. | No exemplar's own *build-generated* `.properties` file (a `build-info.properties`-style artifact) was found pinning `java.properties.date` — this is a "the tooling proves the bug is real" citation, not a "the corpus already does this for its own artifacts" one. |
| JAVA-PLAT-DET-09 (test timezone) | None. | **0/32** — `apache__kafka`, `google__guava`, `FasterXML__jackson-databind`, `JetBrains__Exposed` all ship without a timezone pin despite being date/time-sensitive ([gates](../jvm-audit/exemplar-quality-gates.md)). |
| JAVA-PLAT-DET-10 (non-default test locale) | `google__guava@5fb424c43a:pom.xml:384`, `gradle__gradle@ea17004a31` (2/32). | Every other exemplar with locale-sensitive formatting code (jackson-databind's date formatters, Exposed's SQL literal rendering) runs its suite under the default locale only. |
| JAVA-PLAT-DET-11 (ordering) | Not independently re-measured for this dive — no wave-1/2 audit source-grepped Java/Kotlin bodies for `HashMap`/`HashSet` feeding serialization paths (the audits read config files, per topic-map surprise "Six JAVA-API/KT-API rows are 'not independently measured'"). | Named as a reading heuristic rather than a corpus-measured rule; treat it the same way the map treats GRADLE-CACHE-01..05 — resting on documented JDK/Gradle contract, not on a corpus counter-example. |

## AI-agent angle

1. **Treating JEP 400 as "the encoding problem is solved since JDK 18."** A model trained through 2024-2025 sources will correctly cite JEP 400 but then stop, omitting an explicit `Charset` argument because "it defaults to UTF-8 now anyway." **Check**: any new `new String(byte[])`/`getBytes()`/`FileReader`/`PrintStream(OutputStream)` call with no `Charset` argument in a diff, regardless of the stated JDK floor — Error Prone `DefaultCharset` catches it immediately, faster than reasoning about it.
2. **Reaching for `-Dfile.encoding` on the `JavaExec`/test task and stopping there, never touching `gradle.properties`.** This fixes the *build's own compiled output* but leaves the daemon's own launch (and thus any configuration-time file read, e.g. a version-catalog TOML) still running under the host's default. **Check**: `grep -c 'file.encoding' gradle.properties` should be non-zero independent of any task-level `-Dfile.encoding` the model already added.
3. **Copy-pasting Gradle's pre-9.0 "fix reproducibility" snippet from a blog or from its own training data, on a project whose wrapper already pins Gradle ≥ 9.0.0.** This is GRADLE-CACHE-17's failure mode, and it is the single most likely mistake in this whole family because the "fix" reads as correct, harmless boilerplate — it is the *opposite* of correct on a current wrapper. **Check**: read `gradle/wrapper/gradle-wrapper.properties`'s `distributionUrl` *before* accepting any diff that touches `reproducibleFileOrder`/`preserveFileTimestamps`/`useFileSystemPermissions()`.
4. **Assuming `shadowJar` needs its own hand-written reproducibility block because "shading is special."** A model that correctly learned GRADLE-CACHE-17 for plain `Jar` tasks may not know Shadow's `ShadowJar` extends `Jar` and never overrides the ordering hook — leading it to add a redundant (and, per §6/§7, actively wrong on Gradle 9+) reproducibility block to a `shadowJar {}` configuration block that already inherits the fix. **Check**: same grep as GRADLE-CACHE-17, scoped additionally to any `tasks.shadowJar { ... }` / `tasks.named<ShadowJar>(...)` block.
5. **Believing `mergeServiceFiles()` sorts or otherwise normalises merged output.** The function name and its "handles duplicates" framing invite the assumption that it produces a canonical, order-independent result. It does not — order is classpath order. **Check**: any reproducibility claim ("byte-identical shadowJar") made without also checking that the dependency versions feeding `mergeServiceFiles()`-covered artifacts are locked/pinned is unverified.
6. **Inventing a timezone-pinning rule as an obvious "best practice" addition with no corpus grounding, then stating it with MUST-level confidence.** This is `jvm-quality-gates.md` verdict 10's named failure mode, reproduced here for the sibling family: a model asked to review or harden a test gate reliably suggests `-Duser.timezone=UTC` as if it were standard practice. **Check**: any new rule or review comment asserting timezone pinning as required, rather than CONSIDER-level, should cite what broke — if it cites nothing, it is the invented pattern, not a diagnosed one.
7. **Hallucinating a `Properties.store()` suppression flag that does not exist** (e.g., a nonexistent `Properties.store(writer, null, false)` overload, or a JVM system property that silently disables the date comment). No such JDK-level flag exists as of JDK 25; the workaround is always either `java.properties.date` (build-tool level, Maven-specific) or a custom `Properties` subclass. **Check**: any code citing a JDK API to suppress the comment that is not `java.properties.date`-mediated should be treated as unverified until the exact override is shown to compile against `java.util.Properties`'s actual public API.

## Contested / evolving

- **[gradle/gradle#2270](https://github.com/gradle/gradle/issues/2270) is open, targeted at 10.0.0-RC1.** If Gradle ships a UTF-8-by-default daemon launch, `org.gradle.jvmargs=-Dfile.encoding=UTF-8` becomes redundant-but-harmless on that version and later — this dive's ENC-03 rule should be re-dated the moment that milestone ships, not assumed fixed today. As of 2026-09-12 it is unresolved and the workaround remains load-bearing.
- **Maven's Reproducible Builds mode becoming default-on is a beta-line commitment (4.0.0-beta-5+), not yet a GA fact.** Wave-2 correction 29 already establishes 4.0.0-rc-6 as the newest artifact on Central with no plain 4.0.0; JAVA-PLAT-DET-08's "declare it explicitly" advice should downgrade to "optional, confirm the default" only once a GA 4.0.0-or-later line ships and is measured.
- **Whether `mergeServiceFiles()`'s classpath-order dependency is a defect Shadow should fix (e.g., by sorting) or a documentation gap (state clearly that order is classpath-derived) is unresolved upstream** — no open Shadow issue proposing a sort was found during this dive; this dive's own read of `ServiceFileTransformer.kt` is the only source for the behaviour, not a stated Shadow design decision. Treat "sorted merge order" as a feature request this program could raise, not an existing contested position.
- **Timezone pinning's trajectory is genuinely open, not merely unpractised.** Corpus-wide 0/32 could mean either "nobody has needed it yet because CI runners default to UTC anyway" (many GitHub Actions runners do) or "it is a real latent gap." This dive cannot distinguish those from build-file evidence alone — a CI-runner-timezone-audit is a different (unperformed) measurement, which is why the rule stays at CONSIDER rather than being resolved either up or down.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [openjdk.org/jeps/400](https://openjdk.org/jeps/400) | JEP 400, "UTF-8 by Default" | JDK 18 (2022), still current authority | Primary spec for what changed and what explicitly did not; the non-goals section is the load-bearing part |
| [reproducible-builds.org/docs/jvm/](https://reproducible-builds.org/docs/jvm/) | Reproducible Builds project's JVM-specific guidance | Living document, checked 2026-09-12 | Names `Properties.store()`'s timestamp comment and `java.properties.date` directly; cross-ecosystem framing independent of any one build tool |
| [docs.gradle.org/current/userguide/working_with_files.html](https://docs.gradle.org/current/userguide/working_with_files.html) | Gradle User Guide, file operations chapter | Current (9.x line) | Gradle's own description of reproducible-archive behaviour and the `Reproducible archives` section structure |
| [docs.gradle.org/current/userguide/upgrading_major_version_9.html](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html) | Gradle 9 upgrade guide, "Reproducible archives by default" | Published with Gradle 9.0.0 (2025) | The exact old/new default values and the documented revert snippet, quoted verbatim in §6 |
| [docs.gradle.org/9.0.0/release-notes.html](https://docs.gradle.org/9.0.0/release-notes.html) | Gradle 9.0.0 release notes | 2025 | Confirms the three-defaults-at-once framing at the release-note level, not just the upgrade guide |
| [maven.apache.org/guides/mini/guide-reproducible-builds.html](https://maven.apache.org/guides/mini/guide-reproducible-builds.html) | Maven's own reproducible-builds mini-guide | Current, notes the Maven 4.0.0-beta-5 default-on change | Primary source for `project.build.outputTimestamp`'s format and scope |
| [github.com/gradle/gradle/issues/2270](https://github.com/gradle/gradle/issues/2270) | Gradle's own issue tracker, "Daemon should default to UTF-8" | Open as of 2026-09-12, milestone 10.0.0-RC1 | Primary evidence that the daemon-launch gap is real, unresolved, and the sanctioned workaround is stated by a maintainer in-thread |
| [gradleup.com/shadow/configuration/merging/](https://gradleup.com/shadow/configuration/merging/) | Shadow plugin's own documentation site, merging configuration page | Current (Shadow 9.x line) | Primary source for `mergeServiceFiles()`'s documented (partial) ordering guarantee, which this dive supplements by reading the source directly |
| `GradleUp__shadow@541b3be475` — `src/main/kotlin/.../tasks/ShadowJar.kt`, `ShadowCopyAction.kt`, `internal/Zip.kt`, `internal/ReproducibleProperties.kt`, `transformers/ServiceFileTransformer.kt`, `transformers/PropertiesFileTransformer.kt` | Shadow plugin's own source, exemplar corpus (blob-less clone, sparse-checked-out on demand) | Pinned SHA, `VERSION_NAME=9.7.0-SNAPSHOT`, wrapper Gradle 9.7.1 | Primary — the tool's own implementation, read directly rather than inferred from docs; this is where §7/§8's conclusions come from |
| `gradle__gradle@ea17004a31` — `subprojects/core/src/main/java/org/gradle/api/tasks/AbstractCopyTask.java`, `bundling/AbstractArchiveTask.java`; `platforms/core-configuration/file-operations/src/main/java/org/gradle/api/internal/file/copy/CopyActionExecuter.java`, `CopySpecBackedCopyActionProcessingStream.java` | Gradle's own source, exemplar corpus | Pinned SHA, wrapper-consistent with the 9.x line this dive targets | Primary — confirms exactly where `reproducibleFileOrder` is read and how it reaches a `CopyAction` regardless of which subclass is plugged in |
| [jvm-gradle-core.md](../jvm-gradle-core.md) | Wave-2 consolidation, `GRADLE-CACHE`/`GRADLE-STRUCT` | 2026-09-12 | Owns GRADLE-CACHE-17/M-D-11; this dive cites rather than re-derives it, per the brief |
| [jvm-distribution.md](../jvm-distribution.md) | Wave-2 consolidation, `GRADLE-DIST` | 2026-09-12 | Owns DIST-05/-07/-13 (signed-jar excludes, `mergeServiceFiles()` presence, dependency-reduced POM); this dive's §7-8 answer the open question its "Applied to the exemplars" section explicitly left unestablished |
| [jvm-quality-gates.md](../jvm-quality-gates.md) | Wave-2 consolidation, `JAVA-LINT`/`JAVA-TEST` | 2026-09-12 | Verdict 10 is the direct precedent for keeping timezone pinning at CONSIDER rather than inventing a stronger rule |
| [jvm-audit/exemplar-quality-gates.md](../jvm-audit/exemplar-quality-gates.md) | Wave-1 measurement audit | 2026-09-05, re-cited 2026-09-12 | Source of the encoding/locale/timezone counts (13/32, 15/32, 2/32, 0/32) this whole dive's "measured gap" section rests on |
| [jvm-audit/exemplar-build-shape.md](../jvm-audit/exemplar-build-shape.md) | Wave-1 measurement audit | 2026-09-05 | Source of the `org.gradle.jvmargs` pairing-with-encoding observation (20/20, except kafka/apollo-kotlin) |
| `apache__kafka@940c100fab:build.gradle:362-364` | kafka's own root build file, exemplar corpus | Wrapper pins Gradle 9.7.1, read 2026-09-12 | The single sharpest evidence instance in the whole family: a byte-for-byte copy of Gradle's own pre-9 legacy-revert snippet, active on a post-9 wrapper |


---
title: "Choosing a JDK, declaring a module, surviving an upgrade"
topic: platform-and-toolchains
agent: jdk-floors-modules-and-removed-apis
model: sonnet
date_researched: 2026-09-12
sources_count: 22
scope: >
  Covers the JDK-floor decision for the OCX SDK, the toolchain-vs-`--release`
  separation, module-info.java vs Automatic-Module-Name, the strong-
  encapsulation consequence and the removed/disabled API list with JDK
  numbers, the SequencedCollection retrofit as a worked upgrade-break example,
  the pre-upgrade checklist (jdeps/jdeprscan), and two carried wave-2 items
  (japicmp build-blocking depth across six repos, the NullAway jspecifyMode
  JDK-vendor matrix). Does NOT cover encoding/locale/timezone determinism
  (owned by the sibling `encoding-locale-timezone-determinism` dive) or
  Kotlin compiler/toolchain flags (owned by `kotlin-toolchain-and-codegen`,
  family KT-COMP).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Toolchain vs `--release`: two numbers, two jobs](#1-toolchain-vs---release-two-numbers-two-jobs)
   2. [module-info.java vs Automatic-Module-Name](#2-module-infojava-vs-automatic-module-name)
   3. [Strong encapsulation: no global relax flag since JDK 17](#3-strong-encapsulation-no-global-relax-flag-since-jdk-17)
   4. [The removed-or-disabled list, by JDK number](#4-the-removed-or-disabled-list-by-jdk-number)
   5. [SequencedCollection: a worked example of a default-method break](#5-sequencedcollection-a-worked-example-of-a-default-method-break)
   6. [The pre-upgrade checklist: jdeps and jdeprscan](#6-the-pre-upgrade-checklist-jdeps-and-jdeprscan)
   7. [Carried item (i): japicmp depth across six repos](#7-carried-item-i-japicmp-depth-across-six-repos)
   8. [Carried item (ii): the NullAway JDK-vendor matrix](#8-carried-item-ii-the-nullaway-jdk-vendor-matrix)
   9. [Two newer JEPs that do not change the floor decision](#9-two-newer-jeps-that-do-not-change-the-floor-decision)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **The OCX SDK's floor is 17, confirmed, not moved.** Spring Boot 4 and JUnit 6 both hold their own floor at 17 as of 2026-09-12; matching it costs the SDK nothing and buys the widest consumer base. Toolchain (build JDK) is 25; CI matrix is 17/21/25.
- **Toolchain and `--release` are different knobs and must never collapse to one.** Toolchain picks the `javac`/`java` binary that runs the build; `--release N` picks the API and bytecode surface the compiler checks against, independent of the JDK actually running.
- **`sourceCompatibility`/`targetCompatibility` (Gradle) and `<source>`/`<target>` (Maven) are the wrong knob** — they set bytecode version but do not check the target platform's API surface, so a Java-8-targeted build silently links a Java 9+-only API and only fails at runtime.
- **guava proves module-info.java and Java-8 bytecode coexist**: the main build compiles at `<source>1.8</source>`/`<target>1.8</target>` and *excludes* `module-info.java`; a second execution recompiles it alone with `<release>9</release>` into a multi-release-JAR `META-INF/versions/9/` layer.
- **grpc-java proves the opposite pairing is also live**: `options.release = 8` from a modern (25-era) toolchain, and it ships `Automatic-Module-Name` everywhere instead of a real descriptor — deliberately, because a Java-8-targeted build cannot host `module-info.java` in its primary source set at all.
- **Because the OCX SDK's floor is already 17 (≥ 9), it needs none of guava's MR-JAR complexity** — `module-info.java` compiles as ordinary source at `--release 17`, with `exports` naming exactly the public packages.
- **`Automatic-Module-Name` gives a stable module *name* and zero encapsulation.** It is not a lesser version of a real descriptor — it is a different tool for a different constraint (floor below 9, or a base build that cannot host module sources).
- **Since JDK 17 there is no global relax flag.** `--illegal-access` is a complete no-op; every reflective reach into a JDK-internal class needs its own `--add-opens`/`--add-exports`, chosen per module, or the JAR manifest's `Add-Opens` attribute. This is why ORMs, mocking frameworks (bytecode manipulation, `ClassLoader.defineClass()`), and serializers (`sun.util.calendar`, XML internals) are the recurring casualties on every major-version bump.
- **The removed-or-disabled list, each with its exact JDK number**: Security Manager permanently disabled and unrecoverable JDK 24 (`UnsupportedOperationException` on `setSecurityManager`); finalization deprecated-for-removal since JDK 18 (`Object.finalize()`, `Runtime.runFinalization()`); `sun.misc.Unsafe` memory-access methods warn-once on first use JDK 24, will throw JDK 26+; the 32-bit x86 port removed JDK 25; the Applet API removed JDK 26; JNI native-library loading warns per-module by default JDK 24 (`deny` becomes the eventual default).
- **The SequencedCollection retrofit (JDK 21) breaks real code in three distinct, documented shapes**: a method-name conflict when a user type already declares `getFirst()` with a different return type; a covariant-override conflict when a type implements both `List` and `Deque` (their `reversed()` return types diverge); and a silent type-inference change where a common-supertype computation now resolves to `SequencedCollection` instead of `Collection`, breaking a `var`-typed call site that compiled cleanly on JDK 20.
- **The concrete instance is Gradle's own Kotlin DSL build**: on JDK 21, Kotlin's `.first()` extension function loses to the new member `getFirst()` inside a `tasks { }` scope, resolving to the wrong receiver and producing a `TaskProvider<Task>` where a `String` was expected ([gradle/gradle#27699](https://github.com/gradle/gradle/issues/27699)).
- **`jdeps --jdk-internals` and `jdeprscan --for-removal` are the two pre-upgrade commands**, run against the built JAR before any JDK-major bump; the first surfaces every use of a strongly-encapsulated internal, the second every call to an API scheduled for removal.
- **japicmp's binding to `check`/`verify` is not universal even among the six japicmp adopters wave 2 confirmed.** Measured directly: apache/maven and gradle/gradle and testcontainers-java bind it into the default build (`verify` phase / `check` task); grpc-java wires the task but documents it as manual-only (`./gradlew japicmp --continue`); assertj configures the plugin but only turns on `breakBuildOnBinaryIncompatibleModifications` inside a dedicated GitHub Actions workflow, not the default `mvn verify`; micronaut-core's binding to `check` lives in an external convention plugin not present in this sparse checkout and could not be confirmed in-repo.
- **testcontainers-java's `gradle/japicmp.gradle` is the copyable Gradle template outside gradle/gradle's ViolationRule scaffolding** — plain `JapicmpTask` configuration, `check.dependsOn(japicmp)`, and an `enabled =` guard that turns the task off when no baseline artifact resolves yet (new-module bootstrap case).
- **micronaut-core's `config/accepted-api-changes.json` is the lighter accepted-breaks template**: a flat `{type, member, reason}` array consumed through the japicmp-gradle-plugin's own `richReport { addViolationTransformer(...) }` extension point, not a bespoke Groovy `ViolationRule` class hierarchy.
- **Maven's own copyable template is apache/maven's root `pom.xml`**: `japicmp-maven-plugin` bound to the `verify` phase's `cmp` goal with `breakBuildOnBinaryIncompatibleModifications=true` set in the default execution — no CI-only profile required.
- **`jspecifyMode = true` has an exact JDK-and-vendor precondition, not just a JDK-version one.** JDK 22+ works on any vendor with no flag. JDK 21.0.8+ or 17.0.19+ works **only** on an OpenJDK-family build (Temurin, Zulu) with `-XDaddTypeAnnotationsToSymbol=true` passed to `javac` — the same flag on Oracle JDK 17 or 21 does nothing, and NullAway ≥0.12.11 throws `IllegalStateException` at compile time rather than silently degrading.
- **Do not treat JEP 493 (jlink without JMODs) as a JDK-24+ guarantee.** It is a vendor build-time opt-in (`--enable-linkable-runtime`); `jlink --help` reporting "Linking from run-time image enabled" is the only way to know a given distribution has it.
- **Compact object headers (JEP 519 in 25, default in 27 via JEP 534) and module-import declarations (JEP 511, JDK 25) do not change the floor-17 decision** — both require a newer floor than the SDK declares and neither is reachable from code compiled at `--release 17`.

## Findings

### 1. Toolchain vs `--release`: two numbers, two jobs

The **toolchain** is the JDK that runs `javac`/`java` during the build — a build-time concern. `--release N` is the compiler flag that checks the source against the **API and bytecode surface of JDK N**, independent of which JDK is actually compiling. They are orthogonal and a build states both explicitly.

Gradle (Kotlin DSL):

```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)   // build-time JDK
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release = 17                               // API/bytecode floor
}
```

Maven:

```xml
<properties>
  <maven.compiler.release>17</maven.compiler.release>
</properties>
```

The wrong pairing — `sourceCompatibility`/`targetCompatibility` (Gradle) or `<source>`/`<target>` (Maven) — sets the bytecode major version but performs **no** check against the target platform's API surface, so code that calls a Java 9+-only method while targeting Java 8 bytecode compiles cleanly and fails only at runtime with `NoSuchMethodError`.

The exemplar corpus shows both legitimate uses of the "old" pair and the "wrong" pattern coexisting in the same file:

- `google__guava@5fb424c43a:pom.xml:215-216` sets `<source>1.8</source><target>1.8</target>` on the base build, and separately `google__guava@5fb424c43a:guava/pom.xml:118` sets `<release>9</release>` on the dedicated module-info execution — this is the *correct* two-layer use of the old pair plus `--release`, not a violation.
- `grpc__grpc-java@fc4314419d:build.gradle:279` and `:api/build.gradle:21` both set `options.release = 8` directly — the modern, single-knob form — from a build whose own toolchain runs on a current JDK.

### 2. module-info.java vs Automatic-Module-Name

A real module descriptor (`module-info.java`) is compiler-enforced: its `exports` clause is the only way code outside the module can see a package, checked at compile time and enforced at run time on the module path. `Automatic-Module-Name` (an `Automatic-Module-Name: <name>` manifest entry) gives a JAR a **stable, predictable module name** when placed on the module path — nothing else. It does not restrict what a module-path consumer can see; every package on the classpath-turned-automatic-module is exported. The two solve different problems and a library picks one, not both, per the corpus measurement: `module-info.java` in 12/32 repos (79 files: junit-team/junit-framework 19, square/okhttp 15, Kotlin/kotlinx.coroutines 15, gradle/gradle 11), `Automatic-Module-Name` in 10/32, **a largely different set of repos**.

For the OCX SDK, `module-info.java` is already the wave-2 decision (`jvm-language-api.md` JAVA-API-12) — this dive confirms and costs it rather than re-deciding:

- **Cost to a plain classpath consumer: none.** A module descriptor is inert unless the consuming build actually places the JAR on the module path; nothing about compiling or running it from the classpath changes.
- **Cost to the SDK's own build: none beyond the floor decision already made.** Because the SDK's floor is 17 (≥ 9), `module-info.java` compiles as ordinary source under `--release 17` — no multi-release-JAR indirection is needed. That indirection is guava's problem specifically *because* guava's floor is 8; it does not apply here.
- **The guava MR-JAR shape, for reference, in case an adopter's floor is below 9:** base build excludes `module-info.java` (`google__guava@5fb424c43a:pom.xml:255-258`), a second `maven-compiler-plugin` execution recompiles only that file at `<release>9</release>` (`google__guava@5fb424c43a:guava/pom.xml:118,123`), and the result is packaged under `META-INF/versions/9/module-info.class` by the JAR plugin's multi-release flag.
- **The Automatic-Module-Name pairing, for reference:** grpc-java ships `Automatic-Module-Name` on essentially every subproject (`grpc__grpc-java@fc4314419d:*/build.gradle`, e.g. `core/build.gradle`, `netty/build.gradle`, `stub/build.gradle`) and zero real `module-info.java` anywhere in the tree — a deliberate pairing with its `options.release = 8` floor, not an oversight.

### 3. Strong encapsulation: no global relax flag since JDK 17

[JEP 403](https://openjdk.org/jeps/403) (delivered JDK 17) made `--illegal-access` — the escape hatch that let JDK 9–16 code reach into internal APIs with a warning — a complete no-op: "Any use of this option, whether with `permit`, `warn`, `debug`, or `deny`, will have no effect other than to issue a warning message." Code outside a module can access only the `public`/`protected` members of packages that module *exports*; everything else, exported-but-non-public and everything in an unexported package, is inaccessible by default.

The only remaining workarounds are per-module and must be chosen deliberately at the point of use:

- `--add-opens <module>/<package>=<target-module>` — opens a package for **reflective** access (what `setAccessible(true)` needs).
- `--add-exports <module>/<package>=<target-module>` — exports a package for **compile-time/link-time** access.
- The JAR manifest's `Add-Opens`/`Add-Exports` attributes achieve the same thing declared in the artifact rather than the launch command.

JEP 403 names the exact library categories that keep hitting this on every major bump: bytecode-manipulation tools carrying an internal ASM/Xerces copy, reflection-based frameworks calling `ClassLoader.defineClass()`, date/time libraries touching `sun.util.calendar`, and XML processors/SQL row-set handlers reaching into JDK-internal implementation packages — i.e., exactly the ORM, mocking, and serialization categories the brief calls out.

### 4. The removed-or-disabled list, by JDK number

| Feature | JDK | Exact effect | Source |
|---|---|---|---|
| Security Manager | **24** | Permanently disabled; `System.setSecurityManager(sm)` throws `UnsupportedOperationException("Setting a Security Manager is not supported")`; `-Djava.security.manager` at launch is a fatal VM init error; **no re-enable flag exists at any level** | [JEP 486](https://openjdk.org/jeps/486) |
| Finalization (`Object.finalize()`, `Runtime.runFinalization()`, `System.runFinalization()`) | **18** (deprecated for removal) | `@Deprecated(forRemoval=true)`; `--finalization=disabled` lets you test without it ahead of an eventual hard removal; migrate to try-with-resources or `java.lang.ref.Cleaner` | [JEP 421](https://openjdk.org/jeps/421) |
| `sun.misc.Unsafe` memory-access methods | **24** (warn), **26+** (throw) | JDK 23: compile-time warning only. JDK 24: one consolidated runtime warning naming the caller, on first use of any memory-access method. JDK 26+: throws instead of warning. Controlled by `--sun-misc-unsafe-memory-access={allow,warn,debug,deny}` | [JEP 498](https://openjdk.org/jeps/498) |
| 32-bit x86 port | **25** | Removed entirely (JEP 503, targeted for JDK 25) | [JDK 25 project page](https://openjdk.org/projects/jdk/25/) |
| Applet API | **26** | Removed entirely (JEP 504) | [JDK 26 project page](https://openjdk.org/projects/jdk/26/) |
| JNI / native-library loading | **24** (warn), future release (deny by default) | [JEP 472](https://openjdk.org/jeps/472): loading a native library or binding a native method without `--enable-native-access=<module>` triggers a warning today (`--illegal-native-access=warn` is the JDK 24 default, one warning per module); a future release flips the default to `deny`, throwing `IllegalCallerException` | [JEP 472](https://openjdk.org/jeps/472) |

Cross-reference: `sun.misc.Unsafe` and Security Manager both show up in map row M-Q-08 ("dead code masquerading as a control") — this table is the exact version data that row's verification needs.

### 5. SequencedCollection: a worked example of a default-method break

[JEP 431](https://openjdk.org/jeps/431) (JDK 21) retrofits `List`, `Deque` (via the new `SequencedCollection`), `LinkedHashSet`/`SortedSet` (via `SequencedSet`), and `LinkedHashMap`/`SortedMap` (via `SequencedMap`) with ordered-access default methods: `getFirst()`, `getLast()`, `addFirst(E)`, `addLast(E)`, `removeFirst()`, `removeLast()`, `reversed()`. This is the textbook case the brief asks to settle: **adding default methods to a widely-implemented interface is source-and-binary-incompatible in three distinct, independently documented shapes**, per inside.java's [2023-05-12 Quality Outreach heads-up](https://inside.java/2023/05/12/quality-heads-up/):

1. **Method-name conflict.** A user type that already declares `getFirst()` with an incompatible return type (e.g. `Optional<E> getFirst()`) now collides with the interface's `E getFirst()`. Inside.java states plainly: "the only way to mitigate the source incompatibility is to rename the conflicting method or to rearrange the type hierarchy" — there is no silent fix.
2. **Covariant-override conflict.** `List.reversed()` returns `List<E>`; `Deque.reversed()` returns `Deque<E>`. A type implementing both — the JEP's own worked example is a hypothetical `MyDoubleEndedList` — fails to compile from JDK 21 build 20 onward unless it supplies its own `reversed()` whose return type satisfies both. The JDK's own `LinkedList` needed exactly this fix, and JDK-internal `IdentityLinkedList` was removed rather than patched.
3. **Silent type-inference change.** `var list = List.of(new ArrayDeque<String>(), List.of("foo"))` compiles under JDK 20 (common supertype: `Collection<String>`) and fails under JDK 21 (common supertype becomes `SequencedCollection<String>`), breaking any code whose type ascription assumed the old inferred type. The documented fix is to stop inferring — give the variable an explicit type.

**The concrete instance the brief names**: Gradle's own Kotlin DSL build script broke on JDK 21 because Kotlin's `.first()` stdlib extension function loses precedence to the new JDK member method `getFirst()` inside a `tasks { }` DSL scope — Kotlin resolves member functions ahead of extension functions, so `.first()` on a `List<String>` silently binds to an unrelated `TaskProvider<Task>`-returning `getFirst()` reachable through the scope's own type hierarchy, producing a `Type mismatch: inferred type is TaskProvider<Task> but String was expected` compile error on a script that worked unmodified through Gradle 8.5 on any pre-21 JDK ([gradle/gradle#27699](https://github.com/gradle/gradle/issues/27699)). This is reported as still open with the responsible team as of the issue's last visible triage comment; there is no code fix on the Gradle side, only "don't call `.first()`/`.last()` where a same-named JDK member could also resolve" as the workaround.

### 6. The pre-upgrade checklist: jdeps and jdeprscan

Two commands, run against the built artifact **before** raising a JDK-major floor or CI matrix entry:

```bash
# Every use of a strongly-encapsulated JDK-internal API, transitively
jdeps --jdk-internals -R myapp.jar

# Every call to an API already marked for removal
jdeprscan --for-removal myapp.jar
```

`jdeps --jdk-internals` (short form `-jdkinternals`) lists every class using a JDK-internal API; `-R`/`--recursive` follows the dependency graph rather than stopping at the direct classpath. It cannot be combined with `-p`/`-e`/`-s` filters. `jdeprscan` takes a `dir`/`jar`/`class` argument and, with `--for-removal`, restricts its report to APIs annotated `@Deprecated(forRemoval=true)` — it cannot be combined with a `--release` value of 6, 7, or 8.

The checklist a project runs before moving a JDK major, in order:

1. `jdeps --jdk-internals -R` against every published artifact — zero hits is the pass; a non-zero hit is either fixed (stop using the internal) or accepted with an explicit `--add-opens`/`--add-exports` recorded at the call site (build script, manifest, or module-info `opens`), never a blanket flag.
2. `jdeprscan --for-removal` against the same artifacts — anything reported is on a clock; do not raise the floor past the release that removes it without a migration plan.
3. Walk the removed-or-disabled table (§4) against the code and its dependencies' known behavior at the target JDK number.
4. Recompile at the new `--release` value and read the new `-Xlint` output for keys that did not exist before (each JDK release adds a few; see the sibling `java-quality/lint-gate.md` JAVA-LINT-07 for the enumerated-list rule this feeds).
5. Grep for a user-declared `getFirst`/`getLast`/`addFirst`/`addLast`/`removeFirst`/`removeLast`/`reversed` on any type implementing `List`, `Deque`, `Collection`, `Set`, or `Map` before crossing the JDK-21 line (§5) — this is a source-compatibility check `-Xlint` does not perform.
6. Run the full test suite on the new toolchain before merging; this dive does not own encoding/locale/timezone default drift (JAVA-PLAT rows M-Q-04/05/06) — see the sibling `encoding-locale-timezone-determinism` dive for that gate.

### 7. Carried item (i): japicmp depth across six repos

Wave 2 corrected the record that gradle/gradle's checker is a japicmp adopter (`JapicmpTaskWithKotlin extends me.champeau.gradle.japicmp.JapicmpTask`), not a bespoke alternative. This dive re-measured all six declared japicmp repos at their pinned SHAs to answer whether each is build-blocking or report-only, and what a copyable accepted-breaks file looks like outside gradle/gradle's scaffolding.

| Repo | Bound to default build? | Mechanism | Accepted-breaks shape |
|---|---|---|---|
| `apache__maven@ea4a417bd2` | **Yes** — `verify` phase | Root `pom.xml:731-753`: `japicmp-maven-plugin` execution with `<phase>verify</phase>`, `breakBuildOnBinaryIncompatibleModifications=true`, `oldVersionPattern` set to the release baseline | No allowlist file — new-API-only comparison (`includeExclusively=true`) means nothing to accept yet |
| `assertj__assertj@485502bad2` | **No** in the default lifecycle | `assertj-parent/pom.xml:90-103` and `assertj-core/pom.xml:171-207` configure the plugin (`onlyBinaryIncompatible`, exclude `internal`, `skipXmlReport`) but bind **no** `<execution>`/`<phase>`. The break is turned on only inside `.github/workflows/binary-compatibility.yml`, which explicitly re-invokes `mvnw ... japicmp:cmp -Djapicmp.breakBuildOnBinaryIncompatibleModifications=true` in a dedicated job (compare-with-base-branch and compare-with-latest-release) | `overrideCompatibilityChangeParameters` for one named JLS 13.5.6 case (`METHOD_NEW_DEFAULT`), not a growing allowlist |
| `gradle__gradle@ea17004a31` | **Yes** — `check` | `build-logic/binary-compatibility/src/main/groovy/gradlebuild.binary-compatibility.gradle:221`: `tasks.named("check").configure { dependsOn(checkBinaryCompatibility, checkSinceForNonPublicApi) }` | `testing/architecture-test/src/changes/accepted-changes/accepted-public-api-changes.json` — bespoke `ViolationRule` Groovy/Java classes render and filter it; heaviest scaffolding of the six |
| `grpc__grpc-java@fc4314419d` | **No** — manual only | `build.gradle:455-496`, task registered under `plugins.withId("me.champeau.gradle.japicmp")` with the comment `// Run with: ./gradlew japicmp --continue`; never wired to `check` | No allowlist — `packageExcludes = ['io.grpc.internal']` and `annotationExcludes = ['@io.grpc.ExperimentalApi']` substitute for one |
| `micronaut-projects__micronaut-core@d5842045bb` | **Unconfirmed in-repo** | `buildSrc/src/main/groovy/io.micronaut.build.internal.convention-base.gradle:59-68` configures every `JapicmpTask` with a `richReport { addViolationTransformer(AcceptedApiChangesRule, [CHANGES_FILE: ...]) }`, but the plugin that actually registers the task and binds it to `check` (`io.micronaut.build.internal.common`) is an **external** dependency (`micronaut-gradle-plugins`) not present in this sparse checkout | `config/accepted-api-changes.json` — flat `[{type, member, reason}, …]` array, 1370 lines observed at HEAD; consumed through the plugin's own `richReport` extension point rather than a custom Groovy class hierarchy |
| `testcontainers__testcontainers-java@a4d3a033d8` | **Yes** — `check` (non-Windows) | `gradle/japicmp.gradle` + `build.gradle:82-89`: `project.tasks.check.dependsOn(japicmp)` unless `OperatingSystem.current().isWindows()`; `enabled = ! configurations.baseline...isEmpty()` turns the task off when no prior published version exists yet (new-module bootstrap) | No allowlist file — `failOnModification = true` with no override path; `packageExcludes = ["org.testcontainers.shaded.*"]` is the only carve-out |

**The copyable non-gradle/gradle Gradle template is testcontainers-java's `gradle/japicmp.gradle`**: plain `JapicmpTask` properties, a `check.dependsOn` line, and a resolvable-baseline guard — no custom rule classes. **The copyable accepted-breaks shape is micronaut-core's `config/accepted-api-changes.json`**: a flat `{type, member, reason}` array wired through the plugin's own `richReport` hook rather than gradle/gradle's `ViolationRule` class hierarchy — lighter, though the `AcceptedApiChangesRule` transformer class itself still has to be written once (it is not shipped by the japicmp-gradle-plugin). **The copyable Maven template is apache/maven's root `pom.xml`** execution bound to `verify`.

### 8. Carried item (ii): the NullAway JDK-vendor matrix

`JAVA-LINT-05` in `jvm-quality-gates.md` already states the rule; this is the exact matrix behind it, confirmed against NullAway's own documentation:

| JDK version | Vendor | `jspecifyMode = true` works? | Flag needed |
|---|---|---|---|
| 22 or higher | any (Temurin, Zulu, Corretto, **Oracle**) | **Yes** | none — type-use annotations are natively retained in bytecode from 22 on |
| 21.0.8+ | OpenJDK-family (Temurin, Zulu, and equivalent OpenJDK builds) | **Yes** | `-XDaddTypeAnnotationsToSymbol=true` passed to `javac` |
| 21.0.8+ | **Oracle JDK** | **No** | the flag "is not supported by Oracle JDK 21 or 17" per NullAway's own wiki — there is no workaround |
| 17.0.19+ | OpenJDK-family | **Yes** | `-XDaddTypeAnnotationsToSymbol=true` |
| 17.0.19+ | **Oracle JDK** | **No** | same as above |
| below 21.0.8 / 17.0.19 | any | **No** | the flag does not exist on older point releases either |

NullAway ≥0.12.11 checks this precondition itself and throws `IllegalStateException` at compile time rather than degrading silently — so a CI image pinned to Oracle JDK 21 fails hard the instant `jspecifyMode = true` is set, which is exactly why the corpus (Temurin 13/32, Zulu 10/32, Oracle 0/32) has never hit it: nobody in the corpus builds on Oracle JDK. This is the JDK-matrix constraint promised back to Q2/`java-quality/lint-gate.md`'s JAVA-LINT-05 owner: **the safe, vendor-independent recommendation is JDK 22+ on the toolchain**, sidestepping the vendor branch entirely; a project that must stay below 22 has to pin an OpenJDK-family distribution and cannot ship an Oracle JDK CI image alongside `jspecifyMode`.

### 9. Two newer JEPs that do not change the floor decision

- **Module import declarations** ([JEP 511](https://openjdk.org/jeps/511), finalized JDK 25): `import module java.base;` imports every package a module exports in one declaration, working like `requires` (it cannot reach the unnamed/classpath module). Not usable at the OCX SDK's declared floor of 17 — this is a source-file convenience for code compiled at `--release 25`, irrelevant until the floor itself moves.
- **Compact object headers** ([JEP 519](https://openjdk.org/jeps/519), product feature JDK 25 via `-XX:+UseCompactObjectHeaders`; [JEP 534](https://openjdk.org/jeps/534), default-on JDK 27): a JVM memory-layout change, opt-in at 25, default at 27, disable with `-XX:-UseCompactObjectHeaders`. It is a runtime/GC concern, not a compile-time or API concern — no code the OCX SDK or its consumers write needs to change, though any library doing raw `Unsafe`/JNI field-offset arithmetic against object headers is exactly the population JEP 498 (§4) already flags as walking a removal path anyway.

## Normative guidance candidates

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| JAVA-PLAT-01 | Declare the toolchain (`java.toolchain.languageVersion` / no direct Maven equivalent — Maven's toolchain is the JDK invoking `mvn`) and the bytecode floor (`options.release` / `maven.compiler.release`) as two separate, explicit values; never let one stand in for the other. | The pair does not check target-platform API surface; `--release`/`.release` does ([frame](../jvm-frame.md) correction 10; §1 above). | `grep -n 'sourceCompatibility\|targetCompatibility\|<source>\|<target>' **/*.gradle.kts **/*.gradle **/pom.xml` — a hit *without* an adjacent `release` on the same execution is the finding. | MUST | JDK 9+ (`--release` exists since JDK 9) |
| JAVA-PLAT-02 | Ship `module-info.java` with an `exports` list matching exactly the intended public packages for the OCX SDK and any greenfield library; use `Automatic-Module-Name` only when the floor is below 9 or the module cannot host module sources at all, and never claim it as encapsulation. | `exports` is compiler-enforced; `Automatic-Module-Name` supplies a name only ([JAVA-API-12](../jvm-language-api.md), §2 above). | `find . -name module-info.java` non-empty for SDK/library targets; if absent, confirm `Automatic-Module-Name:` exists in the JAR manifest and that the module CONSIDER/SHOULD tier applies (application, CLI). | MUST (SDK, library) / CONSIDER (application, CLI) | JDK 9+ |
| JAVA-PLAT-03 | If the floor is below 9, isolate `module-info.java` in a dedicated compile execution at `<release>9</release>` (or the Gradle multi-release-jar equivalent) rather than compiling it alongside the base-floor sources. | The base-floor `javac` invocation cannot parse a module descriptor; guava's split-execution is the only correct shape observed ([google__guava@5fb424c43a:guava/pom.xml:118,123](https://github.com/google/guava)). | Confirm `module-info.java` is excluded from the primary compile execution (`<exclude>module-info.java</exclude>` or Gradle `exclude` filter) and present in a `release=9`+ execution/`META-INF/versions/9/` layer. | MUST when floor < 9 | JDK 9+ (target execution) |
| JAVA-PLAT-04 | Never rely on a global relax flag for reflective access to a JDK-internal class; every `--add-opens`/`--add-exports` is declared per module, at the call site (launch args, manifest `Add-Opens`, or a documented test-only JVM arg), with a comment naming which library needs it. | `--illegal-access` is a complete no-op since JDK 17; there is no blanket alternative ([JEP 403](https://openjdk.org/jeps/403); §3 above). | `jdeps --jdk-internals -R` on the built artifact — a hit not matched by a declared `--add-opens`/`--add-exports`/`Add-Opens` is the finding. | MUST | JDK 17+ |
| JAVA-PLAT-05 | Before targeting a new JDK major, run `jdeps --jdk-internals -R` and `jdeprscan --for-removal` against every published artifact and treat any hit as a blocking finding, not a warning to note. | These are the two commands the JDK itself ships for exactly this check; skipping them defers the failure to a consumer's runtime ([§6 above](#6-the-pre-upgrade-checklist-jdeps-and-jdeprscan)). | The two commands' exit output — zero internal-API hits, zero for-removal hits (or each one explicitly accepted with a migration note) is the pass. | MUST | any |
| JAVA-PLAT-06 | Before raising the CI JDK matrix past 21, grep every type implementing `List`, `Deque`, `Set`, `Map`, or `Collection` for a self-declared `getFirst`/`getLast`/`addFirst`/`addLast`/`removeFirst`/`removeLast`/`reversed`, and re-check any `var`-typed common-supertype inference across mixed collection literals. | The three documented SequencedCollection incompatibility shapes are otherwise invisible until the toolchain bump itself fails the build ([JEP 431](https://openjdk.org/jeps/431); [inside.java](https://inside.java/2023/05/12/quality-heads-up/); §5 above). | `grep -rnE '\b(getFirst|getLast|addFirst|addLast|removeFirst|removeLast)\s*\(' src/**/*.java` cross-checked against `implements .*\b(List|Deque|Set|Map|Collection)\b` in the same file; a `.kts`/`.kt` build script calling `.first()`/`.last()` inside a Gradle DSL scope on JDK 21+ is a named reading heuristic, no mechanical check exists (gradle/gradle#27699 has none either). | SHOULD | JDK 21+ |
| JAVA-PLAT-07 | State the removed-or-disabled table's JDK numbers exactly (Security Manager 24, finalization deprecated-for-removal 18, Unsafe warn 24 / throw 26+, 32-bit x86 removed 25, Applet API removed 26, JNI native-access warning 24) whenever a rule cites one; never state a bare "recent JDK" without a number. | Each is a specific, checkable JEP with its own release; a wrong number rots the rule the moment it is read against the wrong JDK ([map](../jvm-topic-map.md) M-A-03; §4 above). | Read the table in §4 against the JEP page cited; a rule citing "Security Manager removed" without "24" or citing JEP 483/491/493 against "25" instead of "24" is the finding ([shift](../jvm-topic-map/recent-shifts.md)). | MUST | — |
| JAVA-PLAT-08 | Bind the japicmp (or BCV/revapi) task to `check`/`verify` directly — `tasks.check.dependsOn(japicmp)` in Gradle, `<phase>verify</phase>` on the plugin execution in Maven — never leave it as a standalone task invoked only by a human or only inside a separate CI-only workflow step. | Of six measured japicmp adopters, three bind it into the default build (maven, gradle/gradle, testcontainers-java) and three do not (assertj is CI-workflow-only, grpc-java is manual-only, micronaut-core's binding is external and unconfirmed) — an unbound task is silently skippable by any contributor who runs `./gradlew build` or `mvn package` instead of the exact CI invocation (§7 above). | Gradle: `grep -n 'check.dependsOn\|tasks.named("check")' <build files>` names the japicmp/BCV task. Maven: the japicmp execution's `<phase>` is `verify` (or earlier), not absent. | MUST (SDK, library) | — |
| JAVA-PLAT-09 | Keep the accepted-breaks file a flat, reviewed `{type/class, member, reason}` array (JSON or equivalent), consumed through the checker's own extension point (a `ViolationTransformer`/`richReport` hook) rather than a bespoke rule-class hierarchy, unless the project's scale already justifies one. | micronaut-core's `config/accepted-api-changes.json` plus a single transformer class achieves the same reviewability as gradle/gradle's multi-file `ViolationRule` scaffolding with a fraction of the code to copy (§7 above). | Confirm the file is JSON (not a suppression flag or `-Xep:...:OFF`-style blanket disable) and every entry carries a non-empty `reason`. | SHOULD | — |
| JAVA-PLAT-10 | Before setting NullAway's `jspecifyMode = true`, confirm the build's toolchain is JDK 22+ (any vendor), or 21.0.8+/17.0.19+ **and** an OpenJDK-family distribution (Temurin/Zulu) with `-XDaddTypeAnnotationsToSymbol=true` passed to `javac`; never pin Oracle JDK 17/21 alongside this flag. | The flag has no effect on Oracle JDK 17/21; NullAway ≥0.12.11 throws `IllegalStateException` at compile time when the precondition fails rather than silently ignoring it ([NullAway wiki](https://github.com/uber/NullAway/wiki/JSpecify-Support); §8 above; carries forward `JAVA-LINT-05`). | Read the `setup-java`/toolchain `distribution:`; if `oracle` and version < 22, this is an immediate finding regardless of the flag's presence. If below 22 and OpenJDK-family, `grep -n 'addTypeAnnotationsToSymbol' <build file>` must match. | MUST | NullAway 0.12.11+ |
| JAVA-PLAT-11 | The OCX SDK declares floor **17**, toolchain **25**, CI matrix **17/21/25** — do not raise the floor to 21 or 24 without a stated reason, and do not silently drift the toolchain below the current LTS. | Spring Boot 4 and JUnit 6, the corpus's two lowest-floor major frameworks as of 2026-09-12, both hold 17; matching costs nothing and maximizes the SDK's addressable consumer base ([shift](../jvm-topic-map/recent-shifts.md); §Summary above). | `grep -n 'languageVersion\|JavaLanguageVersion.of\|maven.compiler.release' <build file>` — floor must read `17`, toolchain `25`. CI workflow matrix must list `17`, `21`, `25`. | MUST | — |

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts | Note |
|---|---|---|---|
| JAVA-PLAT-01 | `grpc__grpc-java@fc4314419d:build.gradle:279` (`options.release = 8`, correct single knob) | none in the six-repo japicmp set; broader corpus violators already tracked under `JAVA-API-13` in `jvm-language-api.md` | — |
| JAVA-PLAT-02/03 | `google__guava@5fb424c43a:guava/pom.xml:118,123` (MR-JAR module-info at `<release>9</release>`, excluded from the 1.8 base execution at `pom.xml:255-258`) | `grpc__grpc-java@fc4314419d` ships zero `module-info.java`, `Automatic-Module-Name` on nearly every subproject instead — a deliberate, not accidental, choice given its 8-floor | Both are correct for their own floor; neither is a counter-example to the other |
| JAVA-PLAT-04/05 | No exemplar runs `jdeps --jdk-internals`/`jdeprscan` in CI per the wave-1 gates audit — this is an unpractised-but-checkable gap, not a satisfied rule | — | Rule exists to introduce a practice, not codify one |
| JAVA-PLAT-06 | — | `gradle/gradle` itself is the violator: [gradle/gradle#27699](https://github.com/gradle/gradle/issues/27699), open, unfixed as of the last visible comment | The corpus's flagship Gradle-Kotlin-DSL build is the worked example, not a satisfier |
| JAVA-PLAT-08 | `testcontainers__testcontainers-java@a4d3a033d8:build.gradle:82-89` (`check.dependsOn(japicmp)`); `apache__maven@ea4a417bd2:pom.xml:731-753` (`verify` phase); `gradle__gradle@ea17004a31:build-logic/binary-compatibility/.../gradlebuild.binary-compatibility.gradle:221` | `grpc__grpc-java@fc4314419d:build.gradle:455-496` (manual-only, comment says so explicitly); `assertj__assertj@485502bad2` (CI-workflow-only, no default-lifecycle binding) | micronaut-core unconfirmed — binding lives outside the sparse checkout |
| JAVA-PLAT-09 | `micronaut-projects__micronaut-core@d5842045bb:config/accepted-api-changes.json` (1370-line flat array, `AcceptedApiChangesRule` transformer) | `gradle__gradle@ea17004a31`'s own file is the correct shape but wrapped in far more custom-class scaffolding than the rule asks a copier to reproduce | Both are "correct"; the rule states the minimum, not a ban on doing more |
| JAVA-PLAT-10 | 0/32 corpus repos build on Oracle JDK ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) Axis 3: Temurin 13/32, Zulu 10/32, Oracle 0/32) — the corpus satisfies the rule by never triggering its failure mode | — | Absence of violation is not evidence of a deliberate choice; it is evidence nobody has tested the Oracle path yet |
| JAVA-PLAT-11 | `spring-projects__spring-boot@93b23c40c2` and `junit-team__junit-framework@35c56a8e02` both hold a 17 floor per [shift](../jvm-topic-map/recent-shifts.md) | — | External frameworks, not corpus build files directly inspected in this dive; cited via the already-verified map correction |

## AI-agent angle

- **An LLM defaults to `sourceCompatibility`/`targetCompatibility` (Gradle) or `<source>`/`<target>` (Maven) because that is the dominant pre-2020 training-data idiom**, and it looks identical in effect to `--release` for a same-JDK build — the bug only appears when the compiling JDK is newer than the target, silently linking a too-new API. Check: `grep` for the old pair and confirm a `release`/`.release` value sits alongside it, not instead of it.
- **An LLM asked to "fix the module system" reaches for `--add-opens=ALL-UNNAMED` broadly, or worse, an `--illegal-access=permit` that has done nothing since JDK 17.** It does not know the per-module flag is now mandatory because that pattern was only ever a warning in its training window (JDK 9–16 behavior). Check: any `--add-opens`/`--add-exports` argument targeting `ALL-UNNAMED` for more than one library's actual internal package is a smell; `--illegal-access` anywhere in a build file or launch script is a hard finding on any JDK 17+ target.
- **An LLM writing "how to declare a module" reaches for `Automatic-Module-Name` as if it were a lighter version of `module-info.java`**, because both appear together in older tutorials as "two ways to modularize." It will not spontaneously state that one gives zero encapsulation. Check: any generated advice recommending `Automatic-Module-Name` for a *new* published library (not a floor-below-9 constraint) without stating the encapsulation trade-off is the finding.
- **An LLM upgrading a Gradle build to JDK 21+ will not know to check for a `getFirst()`/`reversed()` collision**, because SequencedCollection postdates most training corpora's idiomatic-Kotlin/Java examples and the compile error it produces (`Type mismatch: inferred type is TaskProvider<Task>`) reads like an unrelated Gradle DSL bug, not a JDK API retrofit. Check: any JDK-21-targeting migration PR that does not mention SequencedCollection in its description, on a codebase with user types implementing `List`/`Deque`/`Map`, is under-scoped.
- **An LLM will confidently state Security Manager, finalization, or Unsafe removal happened "in a recent JDK" without the exact number**, or attach the wrong number from adjacent JEP ranges (483/491/493 belong to JDK 24, not 25 — a documented map-level trap the corpus itself made once). Check: every removal claim must carry its JDK number, cross-checked against the table in §4.
- **An LLM asked to "add a binary-compatibility gate" will wire japicmp/BCV as a standalone task and call the job done**, because that is what most single-file tutorial examples show — it does not know to bind it to `check`/`verify`, and grpc-java's own manual-only comment ("Run with: `./gradlew japicmp --continue`") is exactly the kind of snippet a model would copy verbatim without adding the binding. Check: `grep -n 'check.dependsOn\|verify'` for the japicmp/BCV task name; its absence after "we added a compatibility gate" is the finding.
- **An LLM will set `jspecifyMode = true` and not check the JDK vendor**, because the JSpecify/NullAway interaction between vendor and flag postdates most training data and reads as an edge case rather than a hard precondition. Check: the CI `setup-java`/toolchain `distribution:` value against the matrix in §8 whenever `jspecifyMode` appears.

## Contested / evolving

- **Whether `Automatic-Module-Name` should ever appear alongside JEP 511's `import module` in the same ecosystem is unsettled** — JEP 511 (JDK 25) works only against real module descriptors, so a corpus that is 10/32 Automatic-Module-Name and 12/32 real module-info is not converging toward one strategy as of 2026-09-12; trend direction is toward real descriptors (12 > 10, and growing per the map's coverage note) but not decisively.
- **Compact object headers' default flip (JEP 519 → JEP 534, opt-in-25 to default-27) lands exactly at the edge of this dive's date window** (JDK 27 GA is 2026-09-15, three days after this research's date); whether any library in the corpus needs to special-case it (via `Unsafe`/JNI header assumptions) is not yet measurable from build-file inspection alone and would need a runtime test, which is out of this dive's read-only scope.
- **Whether the SDK's floor should move to 21 once Spring Boot 4/JUnit 6 themselves move is an open future trigger, not a current decision** — both are pinned to 17 as of this research date; the rule (JAVA-PLAT-11) is written to be re-checked against those two projects' own floors, not against the JDK LTS calendar directly, since the LTS calendar (25 current, 27 imminent) already outpaces both.
- **JNI restriction's `deny`-by-default flip (JEP 472) has no announced target release yet** — JDK 24 ships `warn` as the default; the JEP text itself only promises "a future release." Any rule citing a specific JDK number for the `deny` flip would be fabricating a date the source does not give.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [openjdk.org/jeps/403](https://openjdk.org/jeps/403) | JEP, Strong Encapsulation of JDK Internals | JDK 17 (2021) | Defines the no-relax-flag rule and names the affected library categories directly |
| [openjdk.org/jeps/400](https://openjdk.org/jeps/400) | JEP, UTF-8 by Default | JDK 18 (2022) | Lists exactly which charset-less APIs were fixed and which were deliberately left alone |
| [openjdk.org/jeps/421](https://openjdk.org/jeps/421) | JEP, Deprecate Finalization for Removal | JDK 18 (2022) | Establishes the finalization removal clock and its replacements |
| [openjdk.org/jeps/431](https://openjdk.org/jeps/431) | JEP, Sequenced Collections | JDK 21 (2023) | Source of the retrofit's exact new methods and the covariant-override risk it documents |
| [openjdk.org/jeps/486](https://openjdk.org/jeps/486) | JEP, Permanently Disable the Security Manager | JDK 24 (2025) | Exact runtime behavior when code tries to (re-)enable it |
| [openjdk.org/jeps/493](https://openjdk.org/jeps/493) | JEP, Linking Run-Time Images without JMODs | JDK 24 (2025) | Confirms this is a vendor build-time opt-in, not a universal 24+ guarantee |
| [openjdk.org/jeps/498](https://openjdk.org/jeps/498) | JEP, Warn upon Use of Memory-Access Methods in sun.misc.Unsafe | JDK 24 (2025) | Exact warn-then-throw timeline and the controlling flag |
| [openjdk.org/jeps/472](https://openjdk.org/jeps/472) | JEP, Prepare to Restrict the Use of JNI | JDK 24 (2025) | `--enable-native-access`/`--illegal-native-access` flag semantics |
| [openjdk.org/jeps/511](https://openjdk.org/jeps/511) | JEP, Module Import Declarations | JDK 25 (2025) | Confirms `import module` cannot reach the unnamed module, same constraint as `requires` |
| [openjdk.org/jeps/519](https://openjdk.org/jeps/519) | JEP, Compact Object Headers | JDK 25 (2025) | Confirms opt-in-at-25 status and the flag name |
| [openjdk.org/jeps/534](https://openjdk.org/jeps/534) | JEP, Compact Object Headers by Default | JDK 27 (2026, GA 2026-09-15) | Confirms the default flip and disable flag |
| [openjdk.org/projects/jigsaw/quick-start](https://openjdk.org/projects/jigsaw/quick-start) | Project Jigsaw quick-start guide | Written for JDK 9, still the canonical compile/run syntax | Exact `javac`/`java --module-path` invocation forms cited in §1/§2 |
| [openjdk.org/projects/jdk/21/](https://openjdk.org/projects/jdk/21/) | JDK 21 project page | GA 2023-09-19, LTS | Confirms JEP 431's release and JDK 21's LTS status |
| [openjdk.org/projects/jdk/25/](https://openjdk.org/projects/jdk/25/) | JDK 25 project page | GA 2025-09-16, LTS | Full JEP list; confirms 32-bit x86 removal (JEP 503) landed here, not JDK 24 |
| [openjdk.org/projects/jdk/26/](https://openjdk.org/projects/jdk/26/) | JDK 26 project page | GA 2026-03-17 | Confirms Applet API removal (JEP 504) landed here |
| [openjdk.org/projects/jdk/27/](https://openjdk.org/projects/jdk/27/) | JDK 27 project page | Planned GA 2026-09-15 (not yet GA as of this research date) | Confirms JEP 534's target release and the rampdown schedule |
| [inside.java/2023/05/12/quality-heads-up](https://inside.java/2023/05/12/quality-heads-up/) | Oracle Quality Outreach blog post | 2023-05-12, ahead of JDK 21 GA | Source of all three documented SequencedCollection incompatibility shapes with worked examples |
| [github.com/gradle/gradle/issues/27699](https://github.com/gradle/gradle/issues/27699) | GitHub issue, gradle/gradle | Filed 2024, still open | The concrete `.first()`/`getFirst()` collision instance, with the exact reproducer and compiler output |
| [docs.oracle.com .../man/jdeps.html](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jdeps.html) | Official `jdeps` man page (JDK 25 docs) | Current | Exact `--jdk-internals`/`-R` flag spellings and constraints |
| [docs.oracle.com .../man/jdeprscan.html](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jdeprscan.html) | Official `jdeprscan` man page (JDK 25 docs) | Current | Exact `--for-removal` flag and its release-version restriction |
| [github.com/uber/NullAway/wiki/JSpecify-Support](https://github.com/uber/NullAway/wiki/JSpecify-Support) | NullAway's own wiki page | Current as of NullAway 0.12.11+ | Source of the exact JDK-version-and-vendor matrix for `jspecifyMode` |
| Exemplar corpus (`apache__maven@ea4a417bd2`, `assertj__assertj@485502bad2`, `gradle__gradle@ea17004a31`, `grpc__grpc-java@fc4314419d`, `micronaut-projects__micronaut-core@d5842045bb`, `testcontainers__testcontainers-java@a4d3a033d8`, `google__guava@5fb424c43a`, `square__okhttp@dfcfab3824`) | Blob-less depth-1 clones under `/home/mherwig/dev/.tmp-jvm-exemplars/` | Fetched 2026-09-05/06, pinned SHAs | Direct re-measurement for the two carried wave-2 items and the toolchain/module-info evidence |

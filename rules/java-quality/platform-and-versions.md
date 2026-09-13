---
title: JDK Floors, Modules and Platform Determinism
summary: "The JAVA-PLAT family: the toolchain JDK and the bytecode floor as two separate numbers, module descriptors, surviving a JDK major bump, and keeping output bytes independent of the host"
---

# JDK Floors, Modules and Platform Determinism

`JAVA-PLAT` owns two numbers (the JDK that runs `javac`, and the bytecode and API
floor it targets), whether a module descriptor exists at all, what breaks when the
JDK major moves, and the places where output bytes silently depend on the host's
charset, locale or iteration order. It does not own the public API surface or the
`exports` contract inside `module-info.java`, which belong to `JAVA-API`
(`java-quality/api-and-evolution.md`), nor the lint wiring that catches charset and
locale call sites, which belongs to `JAVA-LINT` (`java-quality/lint-gate.md`), nor
the "do not invent a test gate" list that owns timezone pinning, which belongs to
`JAVA-TEST` (`java-quality/testing.md`). Edits whose site is a build file sit
outside this file's glob: source encoding on `JavaCompile` and the Gradle daemon's
own `file.encoding` belong to `GRADLE-TOOL`, archive reproducibility to
`GRADLE-CACHE`, `project.build.outputTimestamp` and a `<source>`/`<target>` pair
inside a POM to `MVN-BUILD`, and Kotlin's `jvmTarget`, `jvmDefault` and toolchain
half to `KT-COMP` (`kotlin-quality/compiler-and-toolchain.md`).

Contents: [Reading the Compile Task](#reading-the-compile-task) ·
[The Module Descriptor](#the-module-descriptor) ·
[Before a JDK Major Moves](#before-a-jdk-major-moves) ·
[The Call Site: Charset and Iteration Order](#the-call-site-charset-and-iteration-order) ·
[Build Files and CI Config](#build-files-and-ci-config) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Reading the Compile Task

Two greps locate candidates and neither settles anything alone. After every hit,
open the owning compile task or `<execution>` and read which `release` value
governs that compilation.

```bash
grep -rn --include='*.gradle' --include='*.gradle.kts' -e 'sourceCompatibility' -e 'targetCompatibility' .
grep -rnE --include='pom.xml' '</?(source|target)>' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-PLAT-01 | State the toolchain JDK and the bytecode floor as two separate explicit values, and express the floor as `options.release` (Gradle) or `maven.compiler.release` (Maven), never as `sourceCompatibility`, `targetCompatibility` or a `<source>`/`<target>` pair standing alone. `--release` exists from JDK 9 (verified 2026-09-12). | The old pair sets the class-file version but performs no check against the target platform's API surface, so a Java 9+ API called from a Java 8 target compiles clean and fails in a consumer's JVM with `NoSuchMethodError`. | The two greps above, then open the owning task or `<execution>`. A hit paired with a `release` governing the same compilation (a multi-release JAR's base layer, as guava ships) is correct, not a finding. Then `grep -rn --include='*.gradle' --include='*.gradle.kts' --include='pom.xml' -e 'options.release' -e 'maven.compiler.release' .`. Empty output there **is the finding**, whether or not the first two greps were empty. | MUST |
| JAVA-PLAT-02 | **Pinned default**, override once in your own config and record why: floor **17**, toolchain the current LTS (**25** as of 2026-09-12), CI matrix **17 / 21 / 25**. Move the floor when the frameworks you build against move, never on the LTS calendar. | Spring Boot 4 (2025-11-20) and JUnit 6 both hold their own floor at 17 as of 2026-09-12, so matching them maximises consumer reach at zero cost, and a toolchain at 25 clears JAVA-PLAT-03's vendor branch for free. Raising the floor to chase the LTS drops consumers for nothing. | `grep -rn --include='*.gradle' --include='*.gradle.kts' --include='pom.xml' -e 'JavaLanguageVersion.of' -e 'options.release' -e 'maven.compiler.release' .` must print both numbers, and `grep -rn -e 'java-version' .github/workflows/` must list every supported major. Empty output from either grep is the finding. | MUST |
| JAVA-PLAT-03 | Before setting NullAway's `jspecifyMode = true`, confirm the toolchain is JDK 22+ (any vendor), or 21.0.8+ / 17.0.19+ on an OpenJDK-family build (Temurin, Zulu) with `-XDaddTypeAnnotationsToSymbol=true` passed to `javac`. Never pair an Oracle JDK 17 or 21 with that flag. | The flag does nothing on Oracle JDK 17 and 21, and NullAway 0.12.11+ throws `IllegalStateException` at compile time rather than degrading quietly (verified 2026-09-12). This row owns the toolchain half only, and `JAVA-LINT-05` owns the lint wiring and cites this row for the matrix. | Read the vendor: `grep -rn -e 'distribution:' .github/workflows/` and `grep -rn --include='*.gradle' --include='*.gradle.kts' -e 'vendor' .`. An Oracle distribution below 22 with `jspecifyMode` present is an immediate finding. Below 22 on an OpenJDK-family build, `grep -rn --include='*.gradle' --include='*.gradle.kts' --include='pom.xml' -e 'addTypeAnnotationsToSymbol' .` must print a hit, and empty output is the finding. | MUST |

```kotlin
// wrong: sets the class-file version, checks nothing against the 17 API surface
java { sourceCompatibility = JavaVersion.VERSION_17 }
```

```kotlin
// right: two numbers, two jobs
java { toolchain { languageVersion = JavaLanguageVersion.of(25) } }
tasks.withType<JavaCompile>().configureEach { options.release = 17 }
```

## The Module Descriptor

Whether a descriptor exists, and what it owns, is `JAVA-API-12`'s decision. This
file carries only the packaging consequence for a floor below 9.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-PLAT-05 | When the floor is below 9, compile `module-info.java` in a dedicated execution at `release` 9 or higher, package it under `META-INF/versions/9/`, and exclude it from the base-floor compile. | A `javac` running at a pre-9 release cannot parse a module descriptor at all, so the build fails or, worse, the descriptor is silently dropped from the artifact. Guava's split execution is the only correct shape in the corpus. | `find . -name module-info.java`. Empty output means this rule does not apply. For each hit, `grep -rn --include='pom.xml' --include='*.gradle' --include='*.gradle.kts' -e 'module-info' .` must show both an explicit exclude on the base-floor execution and a second execution at `release` 9 or higher. A descriptor with neither is the finding. | MUST when the floor is below 9 |

## Before a JDK Major Moves

Bind the artifact path once, then run both JDK-shipped scanners against it. Both
are new commitments: 0 of 32 corpus exemplars run either in CI as of 2026-09-12.

```bash
JAR=build/libs/app.jar
jdeps --jdk-internals -R "$JAR"
jdeprscan --for-removal "$JAR"

# the SequencedCollection scan, two stages: locate, then read every hit
grep -rl --include='*.java' -e 'implements .*List' -e 'implements .*Deque' \
  -e 'implements .*Set' -e 'implements .*Map' -e 'implements .*Collection' . |
  xargs -r grep -nE '(getFirst|getLast|addFirst|addLast|removeFirst|removeLast|reversed)[[:space:]]*\('
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-PLAT-06 | Never reach for a global relax flag. Declare every `--add-opens` and `--add-exports` per module at the point of use (launch args, a manifest `Add-Opens`/`Add-Exports` entry, or a documented test-only JVM arg) with a comment naming the library that needs it. | `--illegal-access` has been a complete no-op since JDK 17, so a build carrying it is relying on behaviour that stopped existing. ORMs, mocking frameworks and serializers are the recurring casualties, and a blanket `ALL-UNNAMED` hides which one. | `jdeps --jdk-internals -R "$JAR"`. Empty output is the pass, and any hit not matched by a declared per-module flag is the finding. Separately, `grep -rn -e '--illegal-access' .`. Empty output is the pass, and any hit on a JDK 17+ target is an immediate finding. | MUST |
| JAVA-PLAT-07 | Before raising a JDK major, whether the floor or a CI matrix entry, run both scanners against every published artifact and treat any hit as blocking. | These are the two commands the JDK ships for exactly this check, and skipping them defers the failure into a consumer's runtime, where it surfaces as a link error with no build-side trail. | Zero internal-API hits and zero for-removal hits is the pass, and each accepted hit carries a written migration note in the diff. Empty output proves the check found nothing only if it ran: `grep -rn -e 'jdeps' -e 'jdeprscan' .github/workflows/` must print the invocation, and empty output there is the finding. | MUST |
| JAVA-PLAT-08 | Before crossing the JDK 21 line, check every type implementing `List`, `Deque`, `Set`, `Map` or `Collection` for a self-declared `getFirst`, `getLast`, `addFirst`, `addLast`, `removeFirst`, `removeLast` or `reversed`, and re-check any `var`-typed common-supertype inference over mixed collection literals. | [JEP 431](https://openjdk.org/jeps/431)'s `SequencedCollection` retrofit breaks source compatibility three documented ways: a name conflict, a covariant-override conflict across `List` plus `Deque`, and a silent inference change from `Collection` to `SequencedCollection`. `-Xlint` performs none of these checks, and the resulting error reads like an unrelated DSL bug. | The two-stage SequencedCollection scan in the gate block above. Empty output from the second stage is the pass, and every hit it prints needs reading against its own type's supertypes. | SHOULD |
| JAVA-PLAT-09 | Every claim that an API was removed, disabled or deprecated carries its exact JDK number, taken from the table below and its JEP page. | A bare "recent JDK" rots on first reading, and neighbouring numbers are the common error: JEPs 483, 491 and 493 shipped in **24**, and this program's own corpus mis-attributed them to 25 once. | Reading check against the table below. There is no empty-output pass here: the finding is a removal, disablement or deprecation claim, in the diff or in a comment, that names no JDK number. | MUST |

| Change | JDK number |
|---|---|
| `--illegal-access` became a complete no-op ([JEP 403](https://openjdk.org/jeps/403)) | 17 |
| Finalization deprecated for removal | 18 |
| Security Manager permanently disabled ([JEP 486](https://openjdk.org/jeps/486)) | 24 |
| `sun.misc.Unsafe` memory access warns ([JEP 498](https://openjdk.org/jeps/498)) | 24 |
| JNI native-access warning, with no announced release for the `deny` default ([JEP 472](https://openjdk.org/jeps/472)) | 24 |
| 32-bit x86 port removed | 25 |
| `sun.misc.Unsafe` memory access throws | 26 or later |
| Applet API removed | 26 |

Verified 2026-09-12.

## The Call Site: Charset and Iteration Order

Two independent checks cover the first row, and neither substitutes for the
other: Error Prone `-Xep:DefaultCharset:ERROR` and SpotBugs `DM_DEFAULT_ENCODING`.
Run both.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-PLAT-10 | Never call a charset-less overload (`new String(byte[])`, `String.getBytes()`, `new FileReader(File)`, `new InputStreamReader(InputStream)`, `new PrintStream(OutputStream)`, `new Scanner(InputStream)`, `new Formatter()`). Pass an explicit `StandardCharsets` constant, even on a JDK 18+ floor. | [JEP 400](https://openjdk.org/jeps/400) changed the default *value*, not the API surface, and names not deprecating these overloads as an explicit non-goal. The call site stays unprovable and still breaks under `-Dfile.encoding=COMPAT` or on a JDK 17 or older consumer. Reading a subprocess's stdout is the highest-value instance. | `grep -rn --include='*.gradle' --include='*.gradle.kts' --include='pom.xml' -e 'DefaultCharset' -e 'DM_DEFAULT_ENCODING' .`. Empty output is the finding, because it means neither gate is wired. Grep floor where they are not: `grep -rn -E --include='*.java' -e 'new String\([^,)]*\)' -e '\.getBytes\(\)' -e 'new FileReader\(' -e 'new InputStreamReader\([^,)]*\)' -e 'new PrintStream\([^,)]*\)' -e 'new Scanner\([^,)]*\)' .`. Empty output is the pass. | MUST |
| JAVA-PLAT-11 | Any golden file, generated-source output or serialized fixture whose bytes depend on iterating a `HashMap` or `HashSet`, or on unsorted `ServiceLoader` and classpath-scan results, must sort, or use `LinkedHashMap` or `TreeMap`, at the boundary where the output is produced. | JDK collection order and classpath scan order are the same shape of defect: an unspecified default becomes part of a committed output, and the diff flakes only across JVM versions or only on CI, which reads as infrastructure noise rather than a bug. | Reading heuristic, not a grep result. Locate candidates with `grep -rn -E --include='*.java' -e 'new HashMap' -e 'new HashSet' -e 'ServiceLoader\.load' .` (empty output is the pass), then trace only the hits that reach a golden file, a generated-source directory or a serialized fixture. | SHOULD |

```java
// wrong: the default changed in 18, the API did not, and a COMPAT-mode consumer still breaks
String out = new String(process.getInputStream().readAllBytes());
```

```java
// right
String out = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
```

## Build Files and CI Config

These three are read out of build files, launcher scripts, Dockerfiles and
workflow YAML rather than out of Java sources, so they are review-time rows.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-PLAT-14 | On a JDK 18+ floor, treat any `-Dfile.encoding` value other than `UTF-8` or `COMPAT` as a defect. | [JEP 400](https://openjdk.org/jeps/400) specifies exactly two values and says so: "the treatment of values other than `COMPAT` and `UTF-8` is not specified". This is a different defect class from setting nothing at all, and it survives review because the value looks deliberate. | `grep -rn -e '-Dfile.encoding=' .` and read each value. Empty output is the pass. Any value outside `UTF-8` and `COMPAT` is the finding. | MUST |
| JAVA-PLAT-15 | A build step that writes a `.properties` file into a published or reproducibility-claiming artifact must not ship `Properties.store()`'s unconditional date comment. Pin `java.properties.date` on the Maven side, or write through a sorted, comment-free `Properties` subclass on the Gradle side, where no built-in flag exists (checked against the JDK 25 public surface, 2026-09-12). | `Properties.store()` writes a machine-generated date line whether or not `comments` is null, and that line sits inside the file's own bytes, untouched by every archive-level fix. Shadow ships the subclass shape as `ReproducibleProperties`. | Build twice, then diff the generated `.properties` bytes directly, never the enclosing jar hash. Identical `key=value` lines with a differing second comment line is the signature. Locate candidates with `grep -rn --include='*.java' --include='*.kt' -e '.store(' .`, where empty output is the pass. | SHOULD |
| JAVA-PLAT-18 | CONSIDER running one CI job under a non-English, non-Latin locale for modules doing case conversion, number or date formatting, or collation. Guava's `-Duser.language=hi -Duser.country=IN` suite is the shape. | Adopted by 2 of 32 exemplars as of 2026-09-12, and guava's use is adversarial bug-hunting rather than compliance. The MUST that actually catches the defect is the call-site lint (`StringCaseLocaleUsage`, `DefaultLocale`), which `JAVA-LINT` owns, so this job is the residual belt-and-braces. | `grep -rn -e 'user.language' -e 'user.country' .`. Presence is the positive signal. Absence is never a defect at this severity, and is worth noting only where the call-site lint is also absent. | CONSIDER |

**Timezone pinning is not a rule here.** No exemplar in the corpus pins one, and
`JAVA-TEST-11` owns the "do not invent a test gate" list that names it. A review
comment demanding `-Duser.timezone=UTC` without citing what broke is the invented
pattern, not a finding.

## What Agents Get Wrong Here

1. **Writes `sourceCompatibility` or a `<source>`/`<target>` pair**, because that
   is the dominant pre-2020 idiom and it looks identical in effect on a same-JDK
   build. The bug appears only when the compiling JDK is newer than the target.
   Counting grep hits is the wrong check, and it flags the repo that gets it right.
2. **Reaches for a broad `--add-opens=ALL-UNNAMED`, or for `--illegal-access=permit`**,
   which has done nothing since JDK 17. The JDK 9 to 16 warning-only behaviour is
   what the training window recorded.
3. **Treats [JEP 400](https://openjdk.org/jeps/400) as "encoding is solved since 18"
   and omits the `Charset` argument.** The default value changed, the API surface
   did not, and JEP 400 lists not deprecating those overloads as an explicit goal
   of its own.
4. **Invents timezone pinning as an obvious hardening step and states it at MUST
   confidence.** See the note above.
5. **Upgrades to JDK 21+ without checking for a `getFirst()` or `reversed()`
   collision**, because the compiler error reads like an unrelated DSL bug. A JDK 21
   migration touching user types that implement `List`, `Deque` or `Map` and never
   mentioning `SequencedCollection` is under-scoped.
6. **Recommends `Automatic-Module-Name` for a new published library as if it were a
   lighter `module-info`.** It is a name with zero encapsulation, and older
   tutorials present the two as alternatives. `JAVA-API-12` owns the decision.
7. **States a removal without its JDK number, or attaches a neighbouring one.**
8. **Adds `-Dfile.encoding` to a test or `JavaExec` task and stops there.** That
   fixes task JVMs and leaves the Gradle daemon, which reads the version catalog
   and properties at configuration time, on the host default. `GRADLE-TOOL` owns
   the daemon-level fix.
9. **Copies a pre-Gradle-9 reproducibility snippet onto a wrapper that already pins
   9.0.0 or newer**, because it reads as correct boilerplate. It is the exact
   opposite of correct, and kafka ships one live. `GRADLE-CACHE-17` owns it. Read
   the wrapper's pinned version before accepting any such diff.
10. **Sets `jspecifyMode = true` without reading the JDK vendor.**
11. **Believes `mergeServiceFiles()` sorts.** It merges into a `LinkedHashSet`, so
    merged provider files carry classpath-resolution order and a dependency-graph
    reorder rewrites them. Any "byte-identical shaded jar" claim made without
    locked dependency versions is unverified.
12. **Hallucinates a `Properties.store()` suppression flag.** None exists in the
    JDK as of 25. There is `java.properties.date` on the Maven side and a custom
    subclass everywhere else.

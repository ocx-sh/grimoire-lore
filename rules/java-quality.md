---
paths:
  - "**/*.java"
  - "**/junit-platform.properties"
summary: The Java quality index — the gate, the non-negotiables, and where the depth lives
keywords: java,jvm,quality,standards,review,nullness,jspecify,nullaway,error-prone,concurrency,virtual-threads,records,exceptions,security,deserialization,junit,jacoco,japicmp,jdk,gradle,maven
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---

# Java Quality

Traps, not tutorials. Every line names a mistake generated Java makes by
default; the JLS is already in the model and any codebase's architecture is
discoverable by reading it, so neither is in this file.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Rules This File Owns](#rules-this-file-owns) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) ·
[Siblings](#siblings)

**Before trusting any rule below, confirm a lint gate exists at all — read
[java-quality/lint-gate.md](java-quality/lint-gate.md) first.** Eight of the
nine Error Prone checks in `JAVA-LINT-02`'s promotion list ship in
`DISABLED_CHECKS` and fire only under an explicit
`-Xep:UnnecessaryDefaultInEnumSwitch:ERROR`-style promotion, and 21 of 32 flagship JVM repositories measured 2026-09-12 wire
neither Error Prone nor SpotBugs. A build carrying a Checkstyle or SpotBugs
block and no Error Prone wiring is a style gate, not a lint gate. An inert check
is indistinguishable from a clean one, so most of this rule set is enforced by
reading until that wiring lands.

## The Gate

Run it after every change, narrowest scope first — each stage costs more than
the last, so the common case never reaches the slow ones.

```bash
./gradlew compileJava              # Error Prone and NullAway run inside javac
./gradlew check                    # tests, coverage verification, japicmp, Checkstyle, SpotBugs
./gradlew :sdk:publish --dry-run   # japicmp must be listed ahead of every upload task
```

A Maven repository replaces the first two lines with `./mvnw -q compile` and
`./mvnw verify`, and the third with reading the `<execution>` bindings in the
POM. Run every one of them through the project's wrapper, never a `gradle` or
`mvn` on `$PATH`: a globally installed build tool shadowing the pinned one is
the most common way two people get different answers from the same command.

`check` (Gradle) or `verify` (Maven) is the one named target, and CI invokes
that target rather than a hand-copied step list. Wiring is the whole job here,
because four of this set's constructs are *created without being attached*: a
`jvm-test-suite` suite other than `test` (JAVA-TEST-06),
`jacocoTestCoverageVerification` (JAVA-TEST-08), the japicmp task
(JAVA-API-02), and any Maven plugin declared with no bound `<execution>`. Each
one reports nothing and reads exactly like a passing gate.

A task is done when a command, its exit code, and the tree it ran against are
all named. Narration is not evidence.

## Non-Negotiables

Every line below blocks a merge. IDs resolve to the depth files in
[Where the Depth Is](#where-the-depth-is), where each rule carries its
rationale and verification.

| # | Rule | ID |
|---|---|---|
| 1 | Error Prone and NullAway are wired, and the nine named checks — the two locale checks among them — plus the four named for `JAVA-ERR`, `JAVA-SEC` and `JAVA-PLAT` are promoted to `ERROR`, before any rule below is claimed to hold. | JAVA-LINT-01, JAVA-LINT-02 |
| 2 | The toolchain JDK and the bytecode floor are two separate explicit numbers, and the floor is `options.release` or `maven.compiler.release`, never `sourceCompatibility`, `targetCompatibility` or a `<source>`/`<target>` pair standing alone. Floor 17, toolchain 25, CI matrix 17 / 21 / 25 is the pinned default. | JAVA-PLAT-01, JAVA-PLAT-02 |
| 3 | A caught `InterruptedException`, including one caught by a wider `catch (Exception)` or `catch (Throwable)`, re-interrupts or propagates. Never logged like any other exception. | JAVA-ERR-01 |
| 4 | Every `Closeable` and `AutoCloseable` is acquired inside try-with-resources, including the `Stream` returned by `Files.walk`, `list`, `lines`, `find` and `newDirectoryStream`, and including a wrapper whose inner stream is closed separately. | JAVA-ERR-03 |
| 5 | An exception constructed from a caught one passes it as the cause. `new SomeException("...: " + e.getMessage())` is always wrong. | JAVA-ERR-04 |
| 6 | Never `readObject()` or `readUnshared()` on bytes that crossed a trust boundary without an `ObjectInputFilter` allow-list attached to that stream. | JAVA-SEC-01 |
| 7 | An explicit `StandardCharsets` constant at every charset-less overload, even on a JDK 18+ floor. Reading a subprocess's stdout is the highest-value instance. | JAVA-PLAT-10 |
| 8 | Never change a published method's parameter or return type in place: add an overload. japicmp is bound to `check` or `verify`, and every publish task depends on it. | JAVA-API-01, JAVA-API-02 |
| 9 | The published surface is JSpecify-annotated with `@NullMarked` declared once at module scope, no file mixes nullness flavours, and no package a Kotlin caller reaches is left unmarked. Package scope does not cascade to subpackages. | JAVA-API-09, JAVA-API-10, JAVA-NULL-01, JAVA-NULL-02 |
| 10 | A published library ships a real `module-info.java` whose `exports` names the public packages. `Automatic-Module-Name` is a name with no encapsulation and is never offered as a lighter substitute. | JAVA-API-12 |
| 11 | Never construct a fixed-size pool of virtual threads. Bound fan-out at the downstream resource's own capacity with a `Semaphore`, and keep one virtual thread per task. | JAVA-CONC-01, JAVA-CONC-02 |
| 12 | A child process's stdout and stderr are drained concurrently, never one to completion before the other, and `ProcessBuilder.environment()` is `.clear()`-ed before anything is put into it. | JAVA-CONC-10, JAVA-CONC-12 |
| 13 | No preview API on the main sourceset compile path of a published module, and every `StructuredTaskScope` or `Joiner` member named in code, comment or sample carries the JDK it was verified against. | JAVA-CONC-05, JAVA-CONC-06 |
| 14 | A record component that is an array, `Collection`, `List`, `Set`, `Map` or `Date` is copied in the compact constructor; a pattern `switch` answers `case null`; a `switch` over an enum this repository declares carries no `default`. | JAVA-DATA-01, JAVA-DATA-07, JAVA-DATA-08 |
| 15 | A coverage floor counts only where verification is wired into `check` or `verify` **and** carries no enclosing conditional; every `junit-platform.properties` key is prefixed `junit.jupiter.` or `junit.platform.`, and `parallel.enabled=true` is paired with a default mode. | JAVA-TEST-08, JAVA-TEST-09, JAVA-TEST-03, JAVA-TEST-04 |
| 16 | Never reach green by weakening the check, and never ship a verification nobody has watched go red. | JAVA-CORE-01, JAVA-CORE-02 |

## Rules This File Owns

Three cross-cutting rules that belong to no single depth file. Everything else
is defined in a depth file and only cited here.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-CORE-01 | Never reach green by weakening the check: no new `@SuppressWarnings`, no new `disable(...)` or `:OFF` entry, no widened Checkstyle or SpotBugs exclusion, no lowered coverage floor, no new `@Disabled`, no `ignoreFailures = true` or `failOnError = false`, and no edit to the gate's own convention plugin as part of a functional change. | The gate's whole value is that it can go red. A change that edits both the code and the check that judges it reports nothing and looks identical to a passing change. Java gives the move four spellings — an annotation, a build-script call, an exclusion file and a tool version — so it rarely appears as one diff hunk. | `git diff --stat -- '*.gradle.kts' '*.gradle' 'pom.xml' '*.versions.toml'` — any hit in a change that is not itself a gate change is the violation. Then `git diff -U0 -- '*.java'` and read the added lines for `@SuppressWarnings`, `@Disabled` or `@Ignore`: a suppression added by the same change as the code it quiets is the finding. Empty output from both is the pass. A rising `@SuppressWarnings` count across changes is the proxy for how much is being silenced rather than fixed. | MUST |
| JAVA-CORE-02 | A verification enters a rule table, a CI job, or a review only after it has been watched go red against a deliberately planted violation. | A check that cannot fail launders an unchecked change as a checked one, and reads exactly like a passing one forever. This program hit three worked instances: a `violationRules` block wrapped in `disable()`, a `junit-platform.properties` key with no `junit.jupiter.` prefix, and a `spotbugs` block only `mvn site` would ever invoke. A fourth is structural — an Error Prone check that ships disabled reports nothing until it is promoted. | Copy the subject, break the thing the rule forbids (uncover a branch, drop a prefix, remove the `case null` arm), then run the verification. A pass on the broken copy is the violation. | MUST |
| JAVA-CORE-03 | State whether empty output means a pass or means the finding, in every verification that is not self-evidently one or the other. | Half the checks in this rule set are inverted. An absent `options.release`, an absent `violationRules`, fewer than three promoted Error Prone names, an absent find-sec-bugs beside a SpotBugs gate, an absent `module-info.java` on a library, and an absent `maxParallelForks` in a multi-module build are each *the finding*, not the pass. | Read each verification cell: one whose empty output is ambiguous is the violation. | SHOULD |

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed
under. One level deep; these files do not point at each other.

| Doing… | Read |
|---|---|
| Wiring or changing what fails the build: Error Prone, NullAway, `-Xlint` keys and `-Werror`, Checkstyle, SpotBugs, Spotless, or writing a suppression | [java-quality/lint-gate.md](java-quality/lint-gate.md) |
| Throwing, catching, rethrowing or logging a failure; closing a stream, a pool or any handle; handling `InterruptedException`; ending a process | [java-quality/errors-and-resources.md](java-quality/errors-and-resources.md) |
| Parsing or deserialising outside data, hardening an XML factory, building a path or a command from a caller's string, picking a random source, or wiring find-sec-bugs | [java-quality/security-and-untrusted-input.md](java-quality/security-and-untrusted-input.md) |
| Starting a thread or a virtual thread, choosing a lock, bounding a fan-out, spawning or reaping a subprocess, or reaching for a preview concurrency API | [java-quality/concurrency.md](java-quality/concurrency.md) |
| Changing a published signature, annotating nullness on an API, choosing a return type, deciding what a library exposes, or wiring the binary-compatibility gate | [java-quality/api-and-evolution.md](java-quality/api-and-evolution.md) |
| Adding a nullness annotation, choosing between JSpecify and an older flavour, marking a package or module `@NullMarked`, or tracing a null that reached Kotlin | [java-quality/nullness.md](java-quality/nullness.md) |
| Writing a record, a sealed hierarchy, a `switch` over a closed type, an `equals`/`hashCode` pair, or an `Optional` | [java-quality/data-and-patterns.md](java-quality/data-and-patterns.md) |
| Choosing a JDK floor or `--release`, writing or packaging `module-info.java`, passing a charset or locale at a call site, or reacting to a removed or disabled JDK API | [java-quality/platform-and-versions.md](java-quality/platform-and-versions.md) |
| Writing or reviewing a test, parallelising a suite, picking a JUnit major, editing a `junit-platform.properties` file, or deciding whether a coverage number means anything | [java-quality/testing.md](java-quality/testing.md) |
| Editing a build script, a `gradle.properties`, a version catalog, a lockfile or a wrapper descriptor | `gradle-build` (sibling set — see below) |
| Editing a `pom.xml`, anything under the `.mvn` directory, the Maven wrapper, or a legacy Ant build file | `maven-build` (sibling set — see below) |
| Writing the Kotlin half of any contract above, or editing a Kotlin source or script file | `kotlin-quality` (sibling set — see below) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the
commit body. CONSIDER = Suggest: never blocks, never re-raised after a decline.

Rules marked **pinned** in a depth file — the JDK floor and CI matrix, the
90 % coverage floor, Error Prone plus NullAway as the gate of record, JSpecify
as the nullness flavour, japicmp as the ABI gate, the 16-member exit-code enum,
the zero-runtime-dependency commitment — encode an agreed decision rather than a
derivable fact. They are defaults an adopter may override, once, in their own
convention plugin or build configuration, never per module and never per call
site. Overriding one is a decision, recorded with its reason; ignoring one is a
violation, and re-arguing one in a pull request is not a review comment.

Keep the Block list short enough that a blocked change is unusual. A rule set
where everything blocks teaches the reader to negotiate with all of it.

## Siblings

- **`kotlin-quality`** — the same questions answered for Kotlin, plus the ones
  Java does not have: coroutines and structured cancellation, the ABI gate,
  `data class` on a published surface, detekt and ktlint. Loads on `**/*.kt`
  and `**/*.kts`. Six facts are genuinely shared and ship as a one-line
  non-negotiable in both indexes with the depth in exactly one: the charset
  rule, the locale checks, JSpecify on the published surface, the two-numbers
  toolchain decision, the module descriptor, and filtered deserialization.
- **`gradle-build`** and **`maven-build`** — what a build claims about itself in
  files no compiler checks: project structure, dependency declaration and
  locking, caching correctness, toolchain provisioning, plugin authoring,
  distribution and publishing. They load on build scripts, manifests, catalogs
  and lockfiles, globs this set deliberately does not cover, so a Java source
  edit never pays for them and a build-file edit always does.
- **`code-docs`** — comments, Javadoc, decision-record pointers and test names
  as documentation, in every language: what a comment keeps, where each clause
  goes and how long a block runs. Loads on every source file.

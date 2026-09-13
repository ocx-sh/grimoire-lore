---
title: The Java Lint Gate
summary: The JAVA-LINT family, which owns what fails a Java build: the analyzers that are wired, the checks promoted to ERROR, the javac flags that gate the compile, and what an opt-out must carry
---

# The Java Lint Gate

Owns what fails a Java build before a single test runs: which static analyzers
are wired, which of their checks are promoted, which `javac` flags gate the
compile, and what an opt-out has to carry. It does not own the code shapes those
checks catch. `JAVA-ERR` and `JAVA-SEC` state the shape, `JAVA-LINT` states the
flag, and the flag is written once. Nullness in code is `JAVA-NULL`, the JSpecify
contract on a published surface is `JAVA-API`, the toolchain and vendor matrix is
`JAVA-PLAT`, the test and coverage gate is `JAVA-TEST`, and detekt plus ktlint on
Kotlin sources are `KT-LINT`. Wiring a convention plugin, a version catalog or a
CI matrix belongs to `GRADLE-CORE` and `MVN-CORE`. Never reaching green by
weakening a check is `JAVA-CORE-01`, in the index.

Contents: [The Gate of Record](#the-gate-of-record) ·
[Group 1: What compileJava Catches](#group-1-what-compilejava-catches) ·
[Group 2: What the javac Invocation Catches](#group-2-what-the-javac-invocation-catches) ·
[Group 3: What a Separate check Pass Catches](#group-3-what-a-separate-check-pass-catches) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## The Gate of Record

**Pinned.** Error Prone plus NullAway, running inside `javac`, is the Java gate.
Checkstyle is a style gate and never a substitute. PMD is out. SpotBugs earns a
slot only under `JAVA-LINT-10`'s two conditions. A pinned default is one an
adopter overrides once, in their own convention plugin, with the reason written
there. It is not a per-module decision and not a per-call-site one.

Measured across 32 flagship JVM repositories, re-read 2026-09-12: **11/32** wire
Error Prone, **2/32** gate on SpotBugs, **21/32** run neither. So the wiring rows
are SHOULD for an adopter with existing debt and **MUST** for any greenfield
module you author, which has no legacy findings to triage. The promotion rows are
MUST everywhere, because each one names a mistake generated Java makes by
default and none of them fires without an explicit switch.

## Group 1: What compileJava Catches

Gate: `./gradlew compileJava` or `mvn -q compile`. This is the only layer that
runs on every compile, with source-level context, rather than on a separate CI
pass. Floors verified 2026-09-12: `error_prone_core` 2.36.0, `net.ltgt.errorprone`
5.1.1, `net.ltgt.nullaway` 3.2.0, NullAway 0.12.11, JSpecify 1.0 (2024-07-17).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-LINT-01 | **Pinned.** Wire Error Prone and NullAway on every Java module that is compiled and shipped. A build with a Checkstyle or SpotBugs block and no Error Prone wiring has a style gate, not a lint gate, and must not be described as one. | Checkstyle catches no null dereference and no swallowed exception, and a post-compile bytecode pass sees no source context. Twenty-one of the thirty-two repositories measured 2026-09-12 wire neither Error Prone nor SpotBugs. | Gradle: `grep -rn -e 'net.ltgt.errorprone' -e 'net.ltgt.nullaway' --include='*.gradle.kts' --include='*.gradle' .` Maven: `grep -rn 'error_prone_core' --include='pom.xml' .` and confirm the hit sits inside an annotation-processor-path element. A match is the pass. No match beside a `checkstyle` or `spotbugs` block is the finding. No match with neither is an unlinted module. | SHOULD, **MUST** for a greenfield module |
| JAVA-LINT-02 | Promote these nine to `ERROR` on every new module: `DefaultLocale`, `StringCaseLocaleUsage`, `EqualsMissingNullable`, `FieldMissingNullable`, `VoidMissingNullable`, `CatchingUnchecked`, `UnusedException`, `ConstantPatternCompile`, `UnnecessaryDefaultInEnumSwitch`. Four further names are required by sibling rules and are promoted alongside these: `InterruptedExceptionSwallowed` (`JAVA-ERR-01`), `BanSerializableRead` and `BanJNDI` (`JAVA-SEC-01`, `JAVA-SEC-04`), and `DefaultCharset` (`JAVA-PLAT-10`). | Eight sit in Error Prone 2.36.0's `DISABLED_CHECKS` (150 members against 187 `ENABLED_ERRORS` and 312 `ENABLED_WARNINGS`, verified 2026-09-12) and never fire without a switch. `StringCaseLocaleUsage` is the exception: it is already an `ENABLED_WARNINGS` member, so its switch is a severity bump rather than an activation. No repository in the measured corpus promotes all nine, so this is a new commitment, not a codified norm. | `grep -rn -e 'CheckSeverity.ERROR' -e '-Xep:' -e 'error(' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .` then confirm all nine names appear. Empty output means the checks are off, which is the finding. The docs-site severity field is not the gate, `BuiltInCheckerSuppliers.java` is. | **MUST** |
| JAVA-LINT-03 | Every `disable(...)` or `:OFF` entry carries a one-line reason on the same line or the line above. | It is the only thing distinguishing a considered opt-out from silent erosion, and both poles of the corpus already do it (junit-framework's twenty `disable(...)` entries, jackson-databind's twenty XML comments). | `grep -rn -e 'disable(' -e ':OFF' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .` then read each hit's line and the line above. A reasonless opt-out is the finding. Empty output means no opt-outs exist, which is the pass. | SHOULD |
| JAVA-LINT-04 | Set exactly one of `-XepOpt:NullAway:OnlyNullMarked=true` or `-XepOpt:NullAway:AnnotatedPackages=...`, and prefer `OnlyNullMarked` for any module created on NullAway 0.12.3 or newer. | NullAway fails the build outright when both or neither is set, so the wrong shape costs a build, not a finding. Package-prefix lists rot as code moves, while `@NullMarked` travels with the code. | `grep -rn -e 'OnlyNullMarked' -e 'AnnotatedPackages' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .` Exactly one hit per module is the pass. Two hits in one `nullaway { }` block or one `-Xplugin:ErrorProne` argument string is the finding, and zero hits with NullAway applied is also the finding. | **MUST** |
| JAVA-LINT-05 | Before setting `jspecifyMode = true`, confirm the module's toolchain satisfies `JAVA-PLAT-03`'s JDK-and-vendor matrix, which this row does not restate. | The flag-based path does not work on Oracle JDK 17 or 21. NullAway 0.12.11 and newer check the precondition and throw `IllegalStateException` at compile time, so a CI image pinned to Oracle JDK 21 fails the moment the flag is set. | `grep -rn 'jspecifyMode' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .` For each hit, read the module's toolchain and its CI Java setup. Below JDK 22, `grep -rn 'addTypeAnnotationsToSymbol' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .` must match. Empty output there is the finding. | **MUST** |
| JAVA-LINT-06 | Never leave an `import javax.annotation.Nullable` in a module whose build sets `jspecifyMode = true`, and never emit a bare "use JSpecify" instruction without stating what happens to the `jsr305` and Checker Framework annotations already in the module. | Four nullness systems are live at once (jsr305 13/32, Checker Framework 8/32, JSpecify declared 9/32, NullAway's JSpecify-native mode 2/32, verified 2026-09-12). NullAway's default mode matches `@Nullable` by simple name across packages, so mixing is transparent right up until `jspecifyMode = true`, which is the exact point where it stops being. | `grep -rn 'import javax.annotation.Nullable' --include='*.java' .` Any hit in a module whose build sets `jspecifyMode` is a contradiction with undefined semantics and is the finding. Empty output is the pass. The coexistence note is a reading heuristic with no automated check. | **MUST** for the import check, SHOULD for the coexistence note |

```kotlin
// one convention plugin, applied to every Java module
nullaway { onlyNullMarked = true }  // JAVA-LINT-04: this or annotatedPackages, never both
tasks.withType<JavaCompile>().configureEach {
    options.errorprone {
        error(  // JAVA-LINT-02: eight activations and one severity bump, all off by default
            "DefaultLocale", "StringCaseLocaleUsage", "EqualsMissingNullable",
            "FieldMissingNullable", "VoidMissingNullable", "CatchingUnchecked",
            "UnusedException", "ConstantPatternCompile", "UnnecessaryDefaultInEnumSwitch",
        )
        disable("MissingSummary")  // JAVA-LINT-03: javadoc for this module is generated
    }
}
```

## Group 2: What the javac Invocation Catches

Gate: the same `compileJava` or `mvn -q compile` run. Floors verified 2026-09-12:
`this-escape` arrives in JDK 21, JDK 25's `javac` carries 40 `-Xlint` keys, and
`synchronization` is now a deprecated alias of `identity`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-LINT-07 | Declare `-Werror` in exactly one convention plugin, and pair it with an enumerated `-Xlint` key list naming the post-Java-8 keys: `this-escape`, `identity`, `restricted`, `removal`, `missing-explicit-ctor`, `dangling-doc-comments`, `output-file-clash`, `lossy-conversions`. Never pair `-Xlint:all` with `-Werror`, and leave `deprecation` out on purpose. | `all` is open-ended, and every JDK release adds keys, so `all` plus `-Werror` turns a toolchain bump into a build break. The enumerated keys are the ones a Java-8-shaped prior never reaches for. `removal` is in the list because it is the only free mechanical check `JAVA-ERR-06` has. `deprecation` is out because it fires on every use of a deprecated-but-present API, which trains the reader to suppress rather than fix. | `grep -rn -- '-Werror' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .` More than one declaring file is the finding (9/32 of the corpus sets it at all, verified 2026-09-12). Then `grep -rn -- '-Xlint:all' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .` Co-occurrence with `-Werror` in one file is the finding, and empty output on that second command is the pass. | SHOULD |

```kotlin
// wrong: `all` grows with every JDK, so the next toolchain bump is a build break
options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror"))
```

```kotlin
// right: enumerated keys, one declaring file, `deprecation` deliberately absent
options.compilerArgs.addAll(listOf(
    "-Xlint:this-escape,identity,restricted,removal,missing-explicit-ctor",
    "-Xlint:dangling-doc-comments,output-file-clash,lossy-conversions",
    "-Werror",
))
```

## Group 3: What a Separate check Pass Catches

Gate: `./gradlew check` or `mvn verify`. Floors verified 2026-09-12: Checkstyle
10.21.0, PMD 7, Spotless via `com.diffplug.spotless`, find-sec-bugs 1.14.0
(released 2025-06-17). The SpotBugs core version pin is `JAVA-SEC-10`'s, owned by
the `JAVA-SEC` family, and is not restated here.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-LINT-08 | **Pinned.** The Checkstyle ruleset is a file committed in the repository. Never resolve it from the Checkstyle jar with `resources.text.fromArchiveEntry(...)`, and never point a config-location element at an upstream name with no local file. | A ruleset read out of the tool's own artifact changes silently on every `toolVersion` bump, so the gate moves with no diff to review. `google_checks.xml` (89 enabled modules) and `sun_checks.xml` (73) are not nested: Google-only carries `EmptyCatchBlock`, `MissingOverrideOnRecordAccessor` and `TextBlockGoogleStyleFormatting`, Sun-only carries `MagicNumber`, `HiddenField` and `DesignForExtension`. okhttp is the corpus's one stock-ruleset repo and reads it from the jar. | `grep -rn -e 'fromArchiveEntry' -e 'configLocation' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .` A hit that does not resolve to a repo-relative committed file is the finding. Empty output beside a `checkstyle` block means the plugin default path is in use, which passes only if that file is committed. Then diff the committed file against a fresh upstream copy: byte-identical means nobody reviewed which checks apply, which is the SHOULD finding. | **MUST** for the committed file, SHOULD for pruning it |
| JAVA-LINT-09 | **Pinned.** Do not add PMD to a new JVM project's gate. | Enforced in 0/32 (verified 2026-09-12). Apache Maven declares `maven-pmd-plugin` in plugin management with zero bound executions, and gradle/gradle implements the Gradle PMD plugin without running it on itself. Only 18 of PMD 7's 315 Java rules carry its own priority-1 "change absolutely required", and its security category holds two rules. | `grep -rn -e 'maven-pmd-plugin' -e 'pmd {' --include='pom.xml' --include='*.gradle.kts' --include='*.gradle' .` Adding a bound `execution` element, or a `pmd { }` block with `check.dependsOn(pmdMain)`, to a project that had none is the finding. A declaration inside plugin management with no bound execution is not evidence PMD runs, and is the shape to recognise and leave alone. Empty output is the pass. | SHOULD |
| JAVA-LINT-10 | **Pinned.** SpotBugs earns a place in the gate only when `find-sec-bugs` is wired alongside it and the module parses, deserialises or executes untrusted input, **or** when the module needs the lock, wait and notify family and the annotation-free null-dataflow family. | Two different arguments, both measured. SpotBugs' own security category is one of ten and deliberately thin, so injection, SSRF and weak-crypto patterns live only in the plugin (144 vulnerability types, 800-plus API signatures). Separately, `CORRECTNESS` plus `MT_CORRECTNESS` (175 patterns) has roughly a dozen name-level overlaps with Error Prone's `ENABLED_ERRORS` and a large residual with no Error Prone analog at any promotion level, notably `UL_UNRELEASED_LOCK` and the interprocedural `NP_*` family, which works on bytecode with no annotations at all. Absent either argument, a SpotBugs pass duplicates Error Prone more slowly. | `grep -rn 'findsecbugs' --include='*.gradle' --include='*.gradle.kts' --include='*.toml' --include='pom.xml' .` in any module that also declares a `spotbugs { }` block or a bound `spotbugs-maven-plugin` execution. Empty output beside a SpotBugs gate is the finding unless the module's build states the lock or null-dataflow reason. Measured 2026-09-12: find-sec-bugs 0/32, and all three SpotBugs users run it without the plugin. | SHOULD |
| JAVA-LINT-11 | Wire Spotless, or whichever formatter you chose, into `check`. Detaching it with `isEnforceCheck = false` is allowed only when the same file names the CI job that runs it instead. | Spotless is the corpus's widest formatter adoption at 11/32 (verified 2026-09-12) and binds into `check` by plugin default in 10 of those 11. The single deliberate detach carries a stated reason naming its CI job, and is the sanctioned shape rather than a violation. Do not scaffold a commit-time hook for this: a pre-commit or lefthook config is 0/29 across the non-Bazel exemplars. | `grep -rn 'isEnforceCheck' --include='*.gradle.kts' --include='*.gradle' .` A `false` with no adjacent comment naming the CI job is the finding. Empty output is the pass. | SHOULD |

## What Agents Get Wrong Here

1. **Adding Checkstyle or PMD and calling the lint gate done.** The median
   tutorial-era answer to "add a lint gate to this Java project" is
   `maven-pmd-plugin` or a stock `sun_checks.xml`. Neither catches a null
   dereference or a swallowed exception, and PMD gates nothing in the measured
   corpus. `JAVA-LINT-01` is the check.
2. **Rethrowing without a cause.** `catch (IOException e) { throw new
   RuntimeException("failed"); }` is an extremely common generated shape, because
   the message reads as sufficient to a writer who will not be debugging it.
   `UnusedException` catches it and ships disabled.
3. **Reaching for `javax.annotation.Nullable` by muscle memory.** jsr305 is far
   more of the training distribution than of any live codebase, so an agent
   writing null-safe Java in 2026 reaches for it even inside a module that has
   migrated off it. `JAVA-LINT-06` is the check.
4. **Catching `Exception` broadly to be safe** around blocks that can only throw
   unchecked exceptions, because breadth reads as defensive. `CatchingUnchecked`
   catches it and ships disabled.
5. **Reading a plugin-management declaration as a running gate.** A
   `maven-pmd-plugin` or `spotbugs-maven-plugin` entry with no bound execution
   runs on no build. An agent that reports "PMD is configured here" from the
   declaration alone will then add findings-suppression for a tool that never ran.
6. **Assuming a wired SpotBugs covers the security family.** Core SpotBugs has
   zero detectors for XXE, command injection, path traversal or JNDI. Those live
   only in `find-sec-bugs`, which no measured repository wires. `JAVA-SEC`'s rules
   survive on their greps for exactly this reason, and absence of a tool finding
   is never evidence of safety.
7. **Silencing rather than fixing.** A new `@SuppressWarnings`, a reasonless
   `disable(...)`, a widened Checkstyle exclusion or an `ignoreFailures = true`
   added in the same change as the code it quiets is `JAVA-CORE-01`'s violation,
   and `JAVA-LINT-03` is why an opt-out has to say why it exists. A rising
   `@SuppressWarnings("this-escape")` count is the proxy for how much is being
   silenced rather than fixed.
8. **Recompiling regexes inline** in small validator and parser helpers, where the
   method looks self-contained and the cost is invisible without profiling.
   `ConstantPatternCompile` catches it and ships disabled.
9. **Pre-Java-9 constructor and identity patterns.** Registering a listener or
   starting a thread from a constructor, `synchronized` on a boxed value, `==` on
   boxed values. Silently fine under Java 8 and diagnosed from JDK 21 on, which is
   why `-Xlint:this-escape,identity` is in `JAVA-LINT-07`'s enumerated list.
10. **Pairing `-Xlint:all` with `-Werror`** because both read as maximum
    strictness. It is the one combination that makes a JDK upgrade break a build
    that changed nothing.
11. **Inventing hardening the corpus does not practise**, most often a commit-time
    formatting hook. Plausible, absent from every non-Bazel exemplar, and it moves
    the gate off CI where it can be skipped locally.

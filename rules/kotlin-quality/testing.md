---
title: Kotlin Tests, Kover and Virtual Time
summary: The KT-TEST family: which coverage tool reads Kotlin bytecode honestly, Kover's inverse check wiring, the contested test-framework choice, and what runTest changes relative to runBlocking
---

# Kotlin Tests, Kover and Virtual Time

Owns three decisions a Kotlin test makes that a Java test never does: which
coverage tool counts the bytecode and how its floor reaches `check`, which test
framework the module declares, and whether a coroutine test runs on virtual time
or real time. It does not own coroutine code itself, which is `KT-CORO`, in the
Kotlin set's coroutines file, and which also owns the three test-side coroutine
rules cited below (`KT-CORO-11`, `KT-CORO-12`, `KT-CORO-13`). The JUnit floor,
`junit-platform.properties`, Gradle's two parallelism axes and the JaCoCo half of
the coverage gate are `JAVA-TEST`, in the Java set's testing file. Activating
detekt and ktlint at all is `KT-LINT`, in this set's lint-gate file. Compiler
flags, JVM targets and Dokka are `KT-COMP`, in this set's compiler file.

Contents: [The Coverage Gate](#the-coverage-gate) ·
[The Test Framework](#the-test-framework) ·
[Coroutine Tests](#coroutine-tests) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## The Coverage Gate

One command decides whether a floor runs at all: `./gradlew check --dry-run`
prints the task graph, and `koverVerify` missing from it means verification is
gated off, not that Kover was never wired. The greps below read the
configuration before you have that evidence. The floor *number* is not this
family's to set: `JAVA-TEST-10`, in the Java set's testing file, pins 90 % line
and branch for a library authored under these rules.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-TEST-01 | Apply Kover, not JaCoCo, to a module whose main sources are Kotlin. Where one aggregate report spans a mixed Java and Kotlin build, produce the Kotlin modules' numbers with Kover and name in the build file which tool produced which number. | JaCoCo instruments javac-shaped bytecode. A Kotlin inline function's body is copied into each call site, and the compiler's synthetic `access$` accessors are counted as branches nothing exercises, so a well-tested Kotlin module reports low and the gap widens with inline use. Adoption measured 2026-09-12 across 32 flagship JVM repositories: JaCoCo 12, Kover 4, so the majority signal is a Java majority, not a verdict on Kotlin. | `grep -rln --include='*.gradle.kts' --include='*.gradle' -e 'jacoco' -e 'kotlinx.kover' .` lists every module declaring a coverage tool, then `find . -name '*.kt' -path '*/src/main/*' -print` names the Kotlin modules. A module in both lists with only `jacoco` is the finding. Empty output from the first command means no coverage tool is applied anywhere, which is a finding only where a floor is claimed. | SHOULD |
| KT-TEST-02 | A Kover floor is a `verify { rule { bound { minValue = N } } }` block. Applying the plugin, or configuring `koverHtmlReport` / `koverXmlReport`, is a report and never a floor. Do **not** add `tasks.check { dependsOn(koverVerify) }`: Kover's `check` has depended on `koverVerify` since **0.7.0** (verified 2026-09-12), so an absent wire is not the finding. The finding is an enclosing gate, an `onCheck = false`, a `disable()` call, or a `-P` property that switches verification off on exactly the runs CI performs. | This is the inverse of JaCoCo's default, which `JAVA-TEST-08` in the Java set's testing file owns, and Kover's own documentation (0.9.8, read 2026-09-12) never states the binding. It was settled from the plugin's task tree and a maintainer's `onCheck = false` fix in [kotlinx-kover#523](https://github.com/Kotlin/kotlinx-kover/issues/523). A reviewer applying JaCoCo's rule here reports "no floor" on a module that fails `./gradlew check` today, and an agent that "fixes" the missing wire ships a no-op. One flagship Kotlin coroutines library gates its entire Kover block behind a `-P` flag, which only makes sense because the wiring is on by default. | `grep -rn -B5 -A5 --include='*.gradle.kts' -e 'koverVerify' -e 'minValue' -e 'onCheck' .` prints each floor with its context. A printed window carrying `onCheck = false`, `disable()`, `enabled =`, or a `gradleProperty` or `-P` gate is the finding. Empty output on a module that claims a coverage floor is the finding. Empty output on a module that claims none is the pass. | MUST |
| KT-TEST-03 | Re-derive the floor number on any coverage-tool swap. A module moving between JaCoCo and Kover commits a number produced by one clean run of the new tool, with the tool named in a comment beside the number. | The two tools count different things on the same Kotlin bytecode (KT-TEST-01), so carrying `80` across the swap either loosens the gate silently or breaks the build for a reason nobody can attribute to a source change. The number's provenance is invisible once committed, and the next reader assumes it was measured. | In any change that touches a coverage plugin id, `git diff -- '*.gradle.kts' '*.gradle'` must also show the bound value changing, or a comment recording that it was re-measured on the new tool. An unchanged number across a tool swap is the finding. No build-file change in the diff means no swap happened, which is the pass. | SHOULD |

```kotlin
// wrong: the dependsOn is a no-op, and the property gate means a bare
// ./gradlew check verifies nothing on every run CI actually makes
tasks.check { dependsOn(tasks.koverVerify) }
if (!providers.gradleProperty("kover.enabled").isPresent) kover { disable() }
```

```kotlin
// right: declare the floor, leave the wiring alone, it is already there
kover { reports { verify { rule { bound { minValue = 90 } } } } }
```

## The Test Framework

No command decides this one. The check is a read of the declared test
coordinates, and the grep below is what finds them.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-TEST-04 | Default a Kotlin module's test stack to the JUnit Platform with `kotlin.test` assertions, and put a reason in the build file for any other choice. Never present Kotest, Prepared or TestBalloon as *the* Kotlin default, and never run two frameworks inside one module. **pinned:** this is a default an adopter overrides once, in their own convention plugin or version catalog, never per test class. | Unlike Java, where JUnit 5 and 6 are unchallenged, the Kotlin field is genuinely unsettled: a 2025-06-17 practitioner survey compares five live options side by side, and adoption measured 2026-09-12 across 32 flagship JVM repositories is `kotlin.test` 8 and Kotest 2. A confident "Kotest is the Kotlin way" is the common model answer, and acting on it commits the module to a second assertion vocabulary, a second runner integration and a second set of coverage and IDE quirks for its whole life. | `grep -rn --include='*.gradle.kts' --include='*.versions.toml' -e 'kotlin("test")' -e 'kotlin-test' -e 'kotest' -e 'testballoon' .` Two distinct frameworks printed for one module is the finding. Empty output in a module that has tests is also the finding: the framework is inherited from a file you have not read. | SHOULD |

## Coroutine Tests

`./gradlew detekt` is the gate, and it checks none of this until the four
coroutine rules are set `active: true`, which `KT-CORO-01`, in the Kotlin set's
coroutines file, is the row that does. Until that lands, the greps below are the
whole check. Floor for both rows: kotlinx-coroutines-test 1.11.0.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-TEST-05 | Test `suspend` code with `runTest`, never `runBlocking`. The one carve-out is a real-dispatcher stress test, which is deliberately outside `runTest` (`KT-CORO-11`, in the Kotlin set's coroutines file) and carries a comment saying which claim it is stressing. | `runTest` skips `delay` on a virtual clock, applies a 60-second wall-clock budget to the whole body, and rethrows a child coroutine's uncaught exception at the end of the test. `runBlocking` does none of the three. A `runBlocking` test that drives a `delay(30_000)` really sleeps for 30 seconds, and one whose `launch` fails can finish green, because nothing ever collects that child's failure. | `grep -rn --include='*.kt' -e 'runBlocking' .` restricted to test sources. Every hit is either a stress test on a real dispatcher with a comment naming why, or the finding. Empty output is the pass. detekt's `CoroutineLaunchedInTestWithoutRunTest` catches the adjacent half, a `launch` in a test body with no `runTest` at all, and it ships `active: false`. | MUST |
| KT-TEST-06 | A `runTest` body that performs real blocking work, a container start, a real network call or a `Thread.sleep`, passes an explicit `timeout`. Virtual time skips `delay`, it does not shorten real work. | The 60-second default is wall-clock across the whole body, so real work competes with that budget while every `delay` in the same body costs nothing. The failure then reads as a coroutine-dump timeout instead of as the slow dependency it is. The other frequent cause of the same 60-second failure is a child coroutine that never completes, which belongs on `backgroundScope` (`KT-CORO-12`, in the Kotlin set's coroutines file), so read the dump before raising any number. | `grep -rn -A5 --include='*.kt' -e 'runTest' .` restricted to test sources. A printed body that starts a container, opens a socket or calls `Thread.sleep`, on a `runTest` call carrying no `timeout` argument, is the finding. Empty output means the module has no coroutine tests, which is the pass. | SHOULD |

```kotlin
// wrong: really sleeps for 30 seconds, and the failing child is never collected
@Test fun retries() = runBlocking {
    launch { error("this failure never reaches the test") }
    service.retryWithBackoff()          // its internal delay(30_000) is real time
}
```

```kotlin
// right: delay is skipped on the virtual clock, and the child's failure fails the test
@Test fun retries() = runTest {
    launch { error("this failure fails the test at the end of the body") }
    service.retryWithBackoff()
}
```

## What Agents Get Wrong Here

1. **Assuming Kover behaves like JaCoCo: report-only until something wires it
   into `check`.** The default is the opposite and has been since 0.7.0, so the
   Java-shaped review reports "no coverage floor" on a module that already fails
   `./gradlew check`. Named independently by two rounds of this research, which
   is how often it bites.
2. **"Fixing" that non-finding with `tasks.check { dependsOn(koverVerify) }`.**
   The edit is a no-op, it reads in review as the gate being turned on, and it
   leaves the real defect, a property gate or an `onCheck = false` five lines
   away, untouched.
3. **Answering "Kotest" when asked which framework a Kotlin project should
   use.** Stated at the confidence Java's JUnit answer deserves, against a field
   where the measured split is 8 to 2 and a dated survey still lists five live
   contenders. The cost lands on every future test in the module, not on the
   one being written.
4. **Reaching for `runBlocking` in a test**, because it is the shape most
   training data shows and because it compiles. The suite then really waits out
   production's backoff delays, and a failing child coroutine cannot fail it.
5. **Treating a passing `runTest` as evidence a race is fixed.** Every test
   dispatcher runs one task at a time on one thread, so a real data race cannot
   fail there. `KT-CORO-11`, in the Kotlin set's coroutines file, owns the
   stress-test shape that can.
6. **Raising a `runTest` timeout to clear a 60-second failure** without reading
   what timed out. The two causes need opposite fixes: an explicit `timeout` for
   real blocking work, `backgroundScope` for a child that never completes.
7. **Carrying a coverage number across a tool swap** because the number looks
   like a policy rather than a measurement. It is the one edit in this family
   that can silently weaken the gate while reading as a pure migration.
8. **Asserting a Gradle plugin's default task wiring from plausibility.** Kover
   is the worked case: its own documentation never states the binding, and the
   answer came from a task tree and an issue thread. Where no primary source
   says it, write "not independently confirmed" rather than the plausible half.
9. **Emitting detekt rule coordinates from memory** when wiring the activation
   block section three depends on. The coroutine rules moved package under the
   `dev.detekt` rename, and the older spelling does not resolve against the
   current artifact.

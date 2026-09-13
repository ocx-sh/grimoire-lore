---
paths:
  - "**/*.kt"
  - "**/*.kts"
summary: The Kotlin quality index — the gate, the non-negotiables, and where the depth lives
keywords: kotlin,jvm,quality,standards,review,coroutines,cancellation,dispatchers,detekt,ktlint,kover,explicit-api,binary-compatibility,abi,jvmtarget,ksp,kapt,java-interop,jspecify,runtest,gradle
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---

# Kotlin Quality

Traps, not tutorials. Every line names a mistake generated Kotlin makes by
default. The language is already in the model and any codebase's architecture is
discoverable by reading it, so neither is in this file.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Rules This File Owns](#rules-this-file-owns) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) ·
[Siblings](#siblings)

**Before trusting any rule below, confirm the analyzers actually activate.
Read [kotlin-quality/lint-gate.md](kotlin-quality/lint-gate.md) first.** detekt's
shipped `default-detekt-config.yml` activates 129 of its 231 rules, so
`buildUponDefaultConfig = true` runs 102 of them not at all, and the four
coroutine rules this rule set leans on are among the off ones. ktlint reads only
`.editorconfig`, so every property left unset takes ktlint's default rather than
a project decision, and 3 of 32 flagship JVM repositories measured 2026-09-12 set
any `ktlint_*` key. Neither tool reports what it is not running, so an
unconfigured gate and a considered one print the same green line.

This file also loads while you edit a `*.gradle.kts`, because a build script is
Kotlin source. Rows 1, 4, 5, 6 and 15 below are the build-script rows and are
the ones that bind there. Every other row is scoped in its own text to the
source shape it governs, so none of them fires on a settings file.

## The Gate

Run it after every change, narrowest scope first, because each stage costs more
than the last and the common case never reaches the slow ones.

```bash
./gradlew compileKotlin            # explicit API strict mode and allWarningsAsErrors fail here
./gradlew detekt ktlintCheck       # detekt for logic, ktlint for formatting
./gradlew check                    # tests, koverVerify, apiCheck or checkKotlinAbi
./gradlew :module:check --dry-run  # prove koverVerify and the ABI check are in the graph
```

Run every one of them through the project's wrapper, never a `gradle` on `$PATH`:
a globally installed build tool shadowing the pinned one is the most common way
two people get different answers from the same command. `check` is the one named
target, and CI invokes that target rather than a hand-copied step list.

The fourth line is the wiring proof, run once per gate change rather than per
edit. Three of this set's checks are *created without being attached*: an `.api`
dump whose `apiCheck` never reaches `check` (KT-API-03), a Kover floor switched
off by an `onCheck = false` or a `-P` gate (KT-TEST-02), and a detekt or ktlint
task carrying `ignoreFailures = true` (KT-LINT-08). Each writes its reports and
exits zero, which reads exactly like a passing gate.

A task is done when a command, its exit code, and the tree it ran against are all
named. Narration is not evidence.

## Non-Negotiables

Every line below blocks a merge. `KT-*` IDs resolve to the depth files in
[Where the Depth Is](#where-the-depth-is), where each rule carries its rationale
and verification. The six shared facts below are defined in the `java-quality`
sibling set and duplicated here as a bare line citing their IDs, because a
Kotlin-only adopter never loads that set.

| # | Rule | ID |
|---|---|---|
| 1 | detekt points at a committed config through `config.setFrom(...)` with the four coroutine rules set `active: true`, and a committed `.editorconfig` sets `ktlint_code_style`, before any rule below is claimed to hold. | KT-LINT-01, KT-CORO-01, KT-LINT-04 |
| 2 | A published module compiles under explicit API **strict** mode and runs exactly one ABI gate whose `.api` dump is committed and whose check task is in `check`. `explicitApiWarning()` and running neither gate are the findings. | KT-API-01, KT-API-03 |
| 3 | Never add a parameter to a published function, because a default value does not help, never widen or narrow a published return type, and never expose a `data class` from a published module. | KT-API-04, KT-API-05 |
| 4 | `compilerOptions.jvmTarget` is set explicitly wherever `jvmToolchain(N)` is, and equals the Java side's `options.release` in a mixed module. The toolchain does not move the bytecode target, which still defaults to `"1.8"`. Floor 17 is the pinned default. | KT-COMP-04, JAVA-PLAT-01 |
| 5 | Never write `-Xjvm-default` as a string flag, and a library publishing Kotlin interfaces states `compilerOptions.jvmDefault` explicitly, because the default flipped to `ENABLE` in Kotlin 2.2.0 (verified 2026-09-12). | KT-COMP-02, KT-COMP-03 |
| 6 | A new module needing an annotation processor uses KSP. A `kapt(...)` line is acceptable only with a comment naming the processor that has no KSP implementation, and one processor is never split across `kapt(...)` and `ksp(...)`. | KT-COMP-08, KT-COMP-09 |
| 7 | Rethrow `CancellationException` from every catch clause wide enough to observe it, `runCatching { }` included, because it is a blanket `catch (Throwable)`. | KT-CORO-05 |
| 8 | No bare `GlobalScope.launch { }` or `GlobalScope.async { }`, no `runBlocking` inside a `suspend fun`, and a `CoroutineExceptionHandler` only on a root coroutine, never on `async` and never on a nested `launch`. | KT-CORO-02, KT-CORO-03, KT-CORO-04 |
| 9 | Never fix a shared-mutable-state race with `@Volatile`. Bound blocking work with a `Dispatchers.IO.limitedParallelism(n)` view, and give every long-running coroutine loop a suspension point or an `isActive` check. | KT-CORO-07, KT-CORO-06, KT-CORO-09 |
| 10 | Never wrap code that may throw a JVM `Error` or a test assertion in `runCatching { }`, because it catches `Throwable`, not `Exception`. | KT-ERR-01 |
| 11 | `.use { }` every `Closeable`, never return a `Sequence` or `Flow` built over one, and wrap a suspending `close()` called from `finally` or `onCompletion { }` in `withContext(NonCancellable) { }`. | KT-ERR-03 |
| 12 | A public declaration whose value comes from a Java call declares its Kotlin type from the Java side's annotation, and no nullability severity flag is ever lowered to `warn` or `ignore`. | KT-INTEROP-01, KT-INTEROP-02 |
| 13 | On a Java-facing published surface: `@Throws` on every member a Java caller must catch, no `value class` in a member Java calls, and a blocking or `CompletableFuture`-returning wrapper beside every `suspend` member. | KT-INTEROP-04, KT-INTEROP-06, KT-INTEROP-07 |
| 14 | A Kover floor is a `verify { rule { bound } }` block, and `check` already depends on `koverVerify` since 0.7.0, so the finding is an `onCheck = false`, a `disable()` or a `-P` gate, never a missing `dependsOn`. Test `suspend` code with `runTest`, never `runBlocking`. | KT-TEST-02, KT-TEST-05 |
| 15 | An explicit `StandardCharsets` constant at every charset-less overload, and an explicit `Locale` at every case or format conversion. Reading a subprocess's stdout is the highest-value instance of the first. | JAVA-PLAT-10, JAVA-LINT-02 |
| 16 | A published surface a Kotlin caller reaches is JSpecify-annotated with no mixed flavours, a published library ships a real `module-info.java`, and no `readObject()` runs on bytes that crossed a trust boundary without an `ObjectInputFilter` allow-list. | JAVA-API-09, JAVA-API-10, JAVA-API-12, JAVA-SEC-01 |
| 17 | Never reach green by weakening the check, and never ship a verification nobody has watched go red. | KT-CORE-01, KT-CORE-02 |

## Rules This File Owns

Three cross-cutting rules that belong to no single depth file. Everything else is
defined in a depth file and only cited here.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-CORE-01 | Never reach green by weakening the check: no new `@Suppress`, no `active: false` added to a detekt rule, no new `ktlint_standard_*` set to `disabled`, no widened `baseline.xml`, no lowered Kover bound, no new `@Ignore` or `@Disabled`, no `ignoreFailures = true`, and no edit to the gate's own convention plugin as part of a functional change. | The gate's whole value is that it can go red. A change that edits both the code and the check that judges it reports nothing and looks identical to a passing change. Kotlin spreads the move across four files that rarely appear in one diff hunk: a source annotation, a YAML rule block, an `.editorconfig` key, and a build script. | `git diff --stat -- '*.gradle.kts' '*.gradle' 'gradle.properties' '.editorconfig' '*.yml'` where any hit in a change that is not itself a gate change is the violation. Then `git diff -U0 -- '*.kt' '*.kts'` and read the added lines for `@Suppress`, `@Ignore` and `@Disabled`: a suppression added by the same change as the code it quiets is the finding. Empty output from both is the pass. A rising `@Suppress` count across changes is the proxy for how much is being silenced rather than fixed. | MUST |
| KT-CORE-02 | A verification enters a rule table, a CI job, or a review only after it has been watched go red against a deliberately planted violation. | A check that cannot fail launders an unchecked change as a checked one, and reads exactly like a passing one forever. This program hit four worked instances in Kotlin alone: a `buildUponDefaultConfig` build running none of the four coroutine rules, a `tasks.check { dependsOn(koverVerify) }` that is a no-op beside a `-P` gate switching verification off, an `explicitApiWarning()` where strict was asked for, and a detekt task carrying `ignoreFailures = true` that still writes every report. | Copy the subject, break the thing the rule forbids (swallow a `CancellationException`, expose a `data class`, uncover a branch), then run the verification. A pass on the broken copy is the violation. | MUST |
| KT-CORE-03 | State whether empty output means a pass or means the finding, in every verification that is not self-evidently one or the other. | Most of the checks in this rule set are inverted. An absent `jvmTarget`, an absent `jvmDefault` on a library, an absent coroutine-rule key in `detekt.yml`, an absent `ktlint_code_style`, an absent `ExitOutsideMain` promotion, an absent `.api` dump, and an unset `-Xjsr305` on a module resolving a JSR-305 coordinate are each *the finding*, not the pass. | Read each verification cell: one whose empty output is ambiguous is the violation. | SHOULD |

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed
under. One level deep, and these files do not point at each other.

| Doing… | Read |
|---|---|
| Wiring detekt or ktlint, activating or disabling a rule, editing `.editorconfig`, or promoting Kotlin compiler warnings to errors | [kotlin-quality/lint-gate.md](kotlin-quality/lint-gate.md) |
| Launching, awaiting, cancelling or collecting, choosing a dispatcher, sharing mutable state, or editing anything with `suspend` in the signature | [kotlin-quality/coroutines.md](kotlin-quality/coroutines.md) |
| Catching, wrapping or swallowing a failure, opening anything that must be closed, or leaving the process | [kotlin-quality/errors-and-resources.md](kotlin-quality/errors-and-resources.md) |
| Changing a public Kotlin signature, adding a default parameter, exposing a `data class`, turning on explicit API mode, or wiring BCV or `abiValidation()` | [kotlin-quality/api-and-abi.md](kotlin-quality/api-and-abi.md) |
| Exposing a Kotlin declaration to Java callers, calling Java from Kotlin, writing `@JvmStatic`, `@JvmOverloads` or `@Throws`, or setting a nullability severity flag | [kotlin-quality/java-interop.md](kotlin-quality/java-interop.md) |
| Setting `jvmToolchain` or `jvmTarget`, adding a `-X` compiler flag, applying KSP or kapt, or bumping Kotlin, KGP, KSP or Dokka | [kotlin-quality/compiler-and-toolchain.md](kotlin-quality/compiler-and-toolchain.md) |
| Writing a Kotlin test, wiring or reading a Kover coverage floor, or choosing a test framework | [kotlin-quality/testing.md](kotlin-quality/testing.md) |
| Writing the Java half of any contract above, or editing a `.java` source file | `java-quality` (sibling set, see below) |
| Editing a build script, a `gradle.properties`, a version catalog, a lockfile or a wrapper descriptor | `gradle-build` (sibling set, see below) |
| Editing a `pom.xml`, anything under the `.mvn` directory, the Maven wrapper, or a legacy Ant build file | `maven-build` (sibling set, see below) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the
commit body. CONSIDER = Suggest: never blocks, never re-raised after a decline.

Rules marked **pinned** in a depth file encode an agreed decision rather than a
derivable fact: detekt for logic and ktlint for formatting with the four
coroutine rules `active: true` (KT-CORO-01), exactly one ABI gate with standalone
BCV as the default (KT-API-03), `ktlint_code_style = ktlint_official`
(KT-LINT-04), a Java-callable wrapper beside every published `suspend` member
(KT-INTEROP-07), `kotlin.test` on the JUnit Platform (KT-TEST-04), and the
bytecode floor of 17 behind `jvmTarget` (KT-COMP-04). Each is a default an
adopter may override, once, in their own convention plugin or `.editorconfig`,
never per module and never per call site. Overriding one is a decision, recorded
with its reason. Ignoring one is a violation, and re-arguing one in a pull
request is not a review comment.

Keep the Block list short enough that a blocked change is unusual. A rule set
where everything blocks teaches the reader to negotiate with all of it.

## Siblings

- **`java-quality`**: the same questions answered for Java, plus the ones Kotlin
  does not have: records and pattern matching, virtual threads, nullness
  annotation placement, Error Prone and NullAway. Loads on `**/*.java`. Six facts
  are genuinely shared and ship as a one-line non-negotiable in both indexes with
  the depth in exactly one: the charset rule, the locale checks, JSpecify on the
  published surface, the two-numbers toolchain decision, the module descriptor,
  and filtered deserialization.
- **`gradle-build`** and **`maven-build`**: what a build claims about itself in
  files no compiler checks: project structure, dependency declaration and
  locking, caching correctness, toolchain provisioning, plugin authoring,
  distribution and publishing. `gradle-build` shares the `**/*.gradle.kts` glob
  with this set deliberately, because a build script is Kotlin source, so a
  build-script edit loads both indexes and a `.kt` source edit loads only this
  one.

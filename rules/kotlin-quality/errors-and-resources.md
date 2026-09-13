---
title: Failures and Resources in Kotlin
summary: The KT-ERR family, covering what happens to a Throwable once it exists, what closes a handle Kotlin's `.use` cannot reach, and why library code never leaves the process
---

# Failures and Resources in Kotlin

`KT-ERR` owns the fate of a `Throwable` once it exists in Kotlin source and of a
handle once it is acquired: what may be caught, what a rethrow carries, what
gets closed, and whether library code may end the process. It is not a
translation of the Java family. Three of its five rows have **no detekt rule at
any configuration**, and one of them is stronger than the Java gate. Cancelling
a coroutine and the `CancellationException` swallowed around a **suspend** call
belong to `KT-CORO` (`coroutines.md` in this rule set), which also owns the
pinned Kotlin gate of record and the detekt-activation row this file cites but
never restates. `@Throws` on a declaration a Java caller must catch is
`KT-INTEROP`'s (`java-interop.md`), and `kotlin.Result<T>` as a public return
type is `KT-INTEROP`'s (`java-interop.md`). Which analyzer runs at what severity in
which build file is `KT-LINT`'s (`lint-gate.md`). The Java statement of the same
concerns is `JAVA-ERR`, in the `java-quality` rule set.

Contents: [What detekt Cannot See](#what-detekt-cannot-see) ·
[Catches No Rule Can See](#catches-no-rule-can-see) ·
[Handles Nothing Closes](#handles-nothing-closes) ·
[Two detekt Rows, One On and One Off](#two-detekt-rows-one-on-and-one-off) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## What detekt Cannot See

- **`runCatching` is `inline`, so its `try`/`catch` is spliced into the caller's
  bytecode and never appears as a `KtCatchClause`.** `SwallowedException`,
  `TooGenericExceptionCaught` and `EmptyCatchBlock` are all keyed on a catch
  clause and are therefore *structurally* unable to fire on it. Not
  misconfigured, unable. `SuspendFunSwallowedCancellation` is the one rule that
  looks inside the lambda, and it fires only when a `suspend` call is in there,
  so a non-suspend `runCatching` has zero coverage under every configuration
  (verified against detekt's shipped rule set, 2026-09-12).
- **`SwallowedException` whitelists `InterruptedException` by default.** Its
  `ignoredExceptionTypes` treats it as a "part of Java" non-exceptional signal,
  alongside `NumberFormatException` and `ParseException` (read from detekt's
  shipped default config, 2026-09-12). Promoting or hardening the rule does not
  close that hole: the exemption lives in the rule's semantics, not its
  activation state, and no `InterruptedException`-specific rule exists anywhere
  in detekt's rule tree.
- **ktlint carries none of this surface.** Its standard rule set has zero rule
  classes referencing exceptions, resources or process exit (measured
  2026-09-12). There is nothing here to reconcile with it, and nothing to gain
  from wiring it for this family.
- **An agent that assumes detekt mirrors Error Prone has it backwards in both
  directions.** Exception chaining is caught by default here and disabled by
  default on the Java side. Interrupt swallowing is caught by a promotion on the
  Java side and by nothing at all here.
- **Not a live gate: `-Xallow-result-return-type`.** The restriction on
  `kotlin.Result` as a public return type was lifted in **Kotlin 1.5** and the
  flag later removed (verified 2026-09-12). Any guidance presenting it as a
  compiler check is historical only. The live question is the API-design one
  `KT-INTEROP` owns.

## Catches No Rule Can See

Both rows are reading checks. The greps below locate the sites. Nothing
mechanical decides them.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-ERR-01 | Never wrap code that must be allowed to propagate a JVM `Error` (`OutOfMemoryError`, `StackOverflowError`) or a test assertion (`AssertionError`, from `assert`, `check`, or any `assert*` call) in `runCatching { }`. It catches `Throwable`, not `Exception`. Where you need the `Result` shape around fallible work, catch the specific exception yourself and build the `Result` from it. | Both `runCatching` overloads catch `Throwable` (Kotlin stdlib, since 1.3, verified 2026-09-12), the forbidden broad-catch shape shipped as a stdlib function nobody has to type out. In a test source set it turns every failed assertion into a green run. Around a bulk or allocation-heavy path it turns an `OutOfMemoryError` into a value. No Kotlin gate sees either, for the structural reason in the scope notes above. | `grep -rn --include='*.kt' -e 'runCatching' .`. Empty output is the pass. Every hit is read: a hit under a test source tree, or in a bulk, recursive or allocation-heavy path, is the finding unless the block provably throws neither an `Error` nor an `AssertionError`. For the suspend-scoped sibling, `KT-CORO`'s `SuspendFunSwallowedCancellation` row applies instead. | MUST |
| KT-ERR-02 | A caught `InterruptedException` (directly, through a wider `catch (e: Exception)`, or inside a `runCatching` block around a blocking call) must re-interrupt with `Thread.currentThread().interrupt()` or rethrow. Never log it like any other exception, and never call `Thread.interrupted()`, which *clears* the bit. **No detekt rule ID exists for this at any version.** | Swallowing it clears cooperative cancellation for every caller up the stack: a Gradle worker thread stops honouring build cancellation, a pooled task stops honouring shutdown. This is a JVM fact, unchanged by source language, and detekt's default whitelist is wrong about it specifically. | Reading check, and no tool substitutes. `grep -rnE --include='*.kt' -e 'catch *\([^)]*: *InterruptedException' -e 'catch *\([^)]*: *Exception\b' .`. Empty output is the pass. For each hit, the body must contain `Thread.currentThread().interrupt()` or a rethrow. Apply the same check to every `runCatching` block that the KT-ERR-01 grep printed whose lambda calls `join`, `await`, `sleep`, `waitFor` or `get`. | MUST |

```kotlin
// wrong: catches Throwable, so this test passes however the assertion goes
@Test fun `parses the manifest`() {
    runCatching { assertEquals(expected, parse(bytes)) }
}

// wrong: the interrupt bit is dropped and cancellation stops working upstream
try { process.waitFor(1, MINUTES) } catch (e: Exception) { throw IllegalStateException(e) }

// right: re-interrupt before the exception leaves this frame
try {
    process.waitFor(1, MINUTES)
} catch (e: InterruptedException) {
    Thread.currentThread().interrupt()
    throw IllegalStateException("timed out waiting for the child", e)
}
```

## Handles Nothing Closes

No detekt rule covers either shape. The check is a grep for the two signatures
plus a read of each body.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-ERR-03 | Call `.use { }` on every `AutoCloseable`/`Closeable`. A function that returns a `Sequence` or a `Flow` built over one must keep and close the underlying handle explicitly, or take a lambda and close inside it, never hand the lazy view back and let the handle escape. Wrap a **suspending** `close()` or `shutdown()` called from `finally` or `onCompletion { }` in `withContext(NonCancellable) { }`. A synchronous `close()` needs no such wrapping. | Neither `Sequence` nor `Flow` is `AutoCloseable`, so `.use` never reaches them and the caller has no extension to reach for even when they remember. `fun readLines(p: Path): Sequence<String> = Files.lines(p).asSequence()` detaches the sequence from the stream's lifetime silently and compiles clean. `Flow` adds a timing hazard try-with-resources never has: after cancellation, a suspending cleanup call throws `CancellationException` immediately instead of running, so the handle is leaked exactly on the path that most needs it closed (`NonCancellable`, kotlinx.coroutines, verified 2026-09-12). A type whose contract is "the caller closes this" says so in its KDoc and names every way to do it. | `grep -rn --include='*.kt' -e ': Sequence<' -e ': Flow<' .`. Empty output is the pass. For each hit, the finding is a body that opens a `Stream`, `ResultSet`, `Channel`, socket or file handle with no `.use` and no explicit close in the same function. Then `grep -rn --include='*.kt' -e 'suspend fun close(' -e 'suspend fun shutdown(' .`. Again, empty is the pass, and each declaration's call sites in `finally` or `onCompletion` must sit inside `withContext(NonCancellable)`. | MUST |

```kotlin
// wrong: the stream outlives the function and nothing will ever close it
fun readLines(p: Path): Sequence<String> = Files.lines(p).asSequence()

// right: the handle's lifetime is the lambda's
fun <T> withLines(p: Path, block: (Sequence<String>) -> T): T =
    Files.lines(p).use { block(it.asSequence()) }
```

## Two detekt Rows, One On and One Off

One gate covers both: run detekt with `buildUponDefaultConfig = true` and read
the project's own `detekt.yml` for overrides. The greps are backstops for a repo
where detekt does not fail CI: a detekt that reports and exits zero is not a
gate (`KT-LINT` owns that wiring, and `KT-CORE-02` owns "watch it go red").

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-ERR-04 | Never write `SomeException(e.message)` where `SomeException(e)` is meant, and never re-wrap an exception in its own type. Keep detekt's `SwallowedException` and `ThrowingNewInstanceOfSameException` active. This row is "do not turn it off", not "turn it on". | `SomeException(e.message)` reads as if the failure survived and discards the cause, the stack and every suppressed exception under it. This is the one place Kotlin's default gate is **stronger** than Java's: detekt names `throw MyException(e.message)` as `SwallowedException`'s first noncompliant example and ships it `active: true`, where the Java analog sits disabled by default and the Java rule must spend a MUST on the promotion (detekt default config, verified 2026-09-12). | `grep -rn --include='*.yml' -e 'SwallowedException' -e 'ThrowingNewInstanceOfSameException' .`. Empty output is the pass, because the shipped defaults keep both active. Any hit whose block sets `active: false` is the violation. Backstop where detekt does not fail CI: `grep -rnE --include='*.kt' '[A-Za-z]+Exception\( *[a-z][A-Za-z0-9]*\.message *\)' .`. Here any hit is the finding. | MUST |
| KT-ERR-05 | Library code (an SDK, a Gradle plugin, anything a caller embeds) never calls `System.exit()`, `Runtime.exit()`, `Runtime.halt()` or `exitProcess()`. Translate a child process's exit status into a typed exception instead. Promote detekt's `ExitOutsideMain` to `active: true`, because it ships off. | One detekt rule covers all four call shapes, including `Runtime.halt()`, which the nearest SpotBugs pattern does not name, but it ships `active: false` (detekt default config, verified 2026-09-12), the same "correct rule, off by default" shape this family meets throughout. In a Gradle plugin the consequence is concrete and immediate: the call kills the Gradle daemon mid-build, and the user sees a dead build, not your error. Applies to library code only. A CLI's own `main` is where a status code belongs. | `grep -rn --include='*.yml' -e 'ExitOutsideMain' .`. Here empty output is **the finding**, because the rule ships off and silence means it is not promoted, and a hit setting `active: true` is the pass. Then `grep -rnE --include='*.kt' -e 'exitProcess\(' -e 'System\.exit\(' -e 'Runtime\.getRuntime\(\)\.exit\(' -e 'Runtime\.getRuntime\(\)\.halt\(' .`. Empty output is the pass, and any hit in a file with no `fun main(` is the violation. | MUST |

```yaml
# detekt.yml: one row is a promotion, the other two are a promise not to disable
exceptions:
  ExitOutsideMain:
    active: true          # ships false
  SwallowedException:
    active: true          # ships true, never set this false
  ThrowingNewInstanceOfSameException:
    active: true          # ships true, never set this false
```

## What Agents Get Wrong Here

1. **`runCatching { }` as the idiomatic "make this safe".** It is the reflexive
   Kotlin answer to "add error handling", it reads as the language's own
   blessed shape, and it silently catches `Error` and `AssertionError`. Nothing
   in any Kotlin gate can report it, so it survives every review that trusts
   the tooling.
2. **`catch (e: InterruptedException) { /* ignore */ }`, or logging it like any
   other checked exception.** An agent asked to "add error handling around this
   blocking call" treats it as noise from `waitFor`. Nothing catches it at any
   detekt configuration, and detekt's default whitelist actively endorses the
   mistake.
3. **Returning `Sequence<String>` or `Flow<String>` over a file, socket or
   process stream.** Presented as the idiomatic lazy API, and it detaches the
   handle from any lifetime the caller can see. The caller cannot fix it: there
   is no `.use` on either type.
4. **`throw ServiceException(e.message)` while mapping an exit code or an
   `IOException` onto a typed hierarchy.** The entire mapping layer is written
   this way in one pass, and every cause in it is lost at once.
5. **`exitProcess(1)` inside library or plugin code** as the way to report a
   fatal condition. In a Gradle plugin it takes the daemon down with it.
6. **Assuming detekt mirrors Error Prone**, in either direction: promoting
   `SwallowedException` and declaring interrupt handling covered, or disabling
   it as noise and losing the one default-on row in this family.
7. **A suspending `close()` called from `finally` after cancellation.** It
   throws `CancellationException` immediately instead of running, so the
   cleanup that looks present never happens. `withContext(NonCancellable)` is
   the fix, and only for the suspending case.
8. **Citing `-Xallow-result-return-type` as the reason not to return
   `kotlin.Result`.** Historical since Kotlin 1.5. The real argument is an
   API-design one and it lives in `KT-INTEROP`.

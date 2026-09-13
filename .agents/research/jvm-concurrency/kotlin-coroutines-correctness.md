---
title: Where a coroutine loses an exception or refuses to stop
topic: kotlin-coroutines-correctness
agent: kotlin-coroutines-correctness-researcher
model: sonnet
date_researched: 2026-09-12
sources_count: 14
scope: >
  Covers exception handling (CoroutineExceptionHandler root-only scope,
  launch vs async, supervisorScope vs SupervisorJob, first-exception-wins),
  CancellationException transparency, cooperative cancellation in
  long-running loops, Dispatchers.IO's elastic thread ceiling, the
  shared-mutable-state fix ladder, GlobalScope and its one defensible
  exception, and runTest's virtual-time properties. Does NOT cover Kover /
  coverage wiring (kotlin-toolchain-and-codegen dive), Flow-specific
  operators beyond the exception-transparency rule, or suspend-API binary
  compatibility beyond citing KT-API-07 (jvm-language-api.md owns that row).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [CoroutineExceptionHandler fires on root coroutines only](#1-coroutineexceptionhandler-fires-on-root-coroutines-only)
   2. [supervisorScope's direct children are roots; a SupervisorJob's children are not automatically](#2-supervisorscopes-direct-children-are-roots-a-supervisorjobs-children-are-not-automatically)
   3. [CancellationException is transparent by design — catch it, rethrow it, never absorb it](#3-cancellationexception-is-transparent-by-design--catch-it-rethrow-it-never-absorb-it)
   4. [First exception wins; the rest ride along as suppressed](#4-first-exception-wins-the-rest-ride-along-as-suppressed)
   5. [Cancellation is cooperative — a tight loop with no suspension point never stops](#5-cancellation-is-cooperative--a-tight-loop-with-no-suspension-point-never-stops)
   6. [Dispatchers.IO has a ceiling, and limitedParallelism views don't add to it](#6-dispatchersio-has-a-ceiling-and-limitedparallelism-views-dont-add-to-it)
   7. [The shared-mutable-state fix ladder — volatile is not on it](#7-the-shared-mutable-state-fix-ladder--volatile-is-not-on-it)
   8. [GlobalScope: not absolute — the one sanctioned pattern is an explicitly-passed parent Job](#8-globalscope-not-absolute--the-one-sanctioned-pattern-is-an-explicitly-passed-parent-job)
   9. [runTest: three properties, two dispatchers, and one thing virtual time cannot catch](#9-runtest-three-properties-two-dispatchers-and-one-thing-virtual-time-cannot-catch)
   10. [Boundary with KT-API: a suspend signature is not exempt from binary-compatibility rules](#10-boundary-with-kt-api-a-suspend-signature-is-not-exempt-from-binary-compatibility-rules)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- `CoroutineExceptionHandler` is consulted only on a **root coroutine** — one launched directly in a `CoroutineScope`/`supervisorScope`, or as a direct child of a `SupervisorJob` — never on a coroutine nested inside another `launch`/`async` ([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)).
- A handler installed on an `async` coroutine has **no effect**; `async`'s exception is captured in the `Deferred` and only surfaces when you call `.await()` — wrap the `await()` in try/catch instead ([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)).
- `supervisorScope { }` makes each **direct** child behave like an independent root for exception-handler purposes; a plain `SupervisorJob()` only stops failure propagating *to siblings* — it does not, by itself, make a nested `launch` a root for handler dispatch ([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)).
- `CancellationException` must always be rethrown from a `catch` block — `catch (e: Exception)` and `runCatching { }` both swallow it unless you special-case it, which silently breaks the coroutine's own cancellation ([coroutines-cancellation.html](https://kotlinlang.org/docs/coroutines-cancellation.html), [exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)).
- When multiple children fail, the **first exception wins** and reaches the handler; every subsequent exception is attached to it via `Throwable.addSuppressed` (`.suppressed`) — this is JVM 1.7+-only machinery ([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)).
- Cancellation is **cooperative**: a `while` loop or CPU-bound block with no suspension point and no `isActive`/`ensureActive()`/`yield()` check never notices it was cancelled ([coroutines-cancellation.html](https://kotlinlang.org/docs/coroutines-cancellation.html)).
- A suspending call in a `finally` block does not run if the coroutine is already cancelled unless wrapped in `withContext(NonCancellable) { }` ([coroutines-cancellation.html](https://kotlinlang.org/docs/coroutines-cancellation.html)).
- `Dispatchers.IO`'s thread ceiling defaults to `max(64, core count)`, tunable via the `kotlinx.coroutines.io.parallelism` JVM system property ([Dispatchers.kt KDoc](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-dispatchers/-i-o.html); [kotlinx.coroutines@f63a04bacb:kotlinx-coroutines-core/jvm/src/Dispatchers.kt:9,29-30](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-core/jvm/src/Dispatchers.kt)).
- `Dispatchers.IO.limitedParallelism(n)` returns an **elastic view that shares IO's own thread pool** rather than allocating `n` new threads — several such views do not sum on top of the 64-thread base the way a naive reading suggests ([Dispatchers.kt:34-48](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-core/jvm/src/Dispatchers.kt)).
- `@Volatile` does **not** fix a shared-counter race: it guarantees atomic reads/writes of the field, not atomicity of the read-modify-write sequence `counter++` — the fix is `AtomicInteger`, coarse-grained thread confinement, or `Mutex.withLock` ([shared-mutable-state-and-concurrency.html](https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html)).
- Fine-grained thread confinement (wrapping every single increment in `withContext(singleThreadDispatcher)`) is a correct but slow anti-pattern; coarse-grained confinement (wrapping the whole workload once) is the fast, correct version of the same idea ([shared-mutable-state-and-concurrency.html](https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html)).
- `GlobalScope` is not an unconditional ban: the one defensible pattern is `GlobalScope.launch(explicitParentContext, ...)` where the *first argument* supplies a real, externally-owned `Job` — the launched coroutine is then structurally tied to that Job, not actually detached. A bare `GlobalScope.launch { }` / `GlobalScope.async { }` with no context argument is always the violation ([ktor@f92fad04:ktor-client-cio/.../CIOEngine.kt:73](https://github.com/ktorio/ktor/blob/f92fad04353817c7eacf8599c8d69d517ba4882c/ktor-client/ktor-client-cio/common/src/io/ktor/client/engine/cio/CIOEngine.kt), [GlobalCoroutineUsage.kt doc](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-rules-coroutines/src/main/kotlin/dev/detekt/rules/coroutines/GlobalCoroutineUsage.kt) — detekt's own rule cannot distinguish the two forms and flags both).
- `runTest` auto-skips `delay`, times out at **60 seconds** by default, and rethrows any uncaught child-coroutine exception at the end of the test — it is not equivalent to `runBlocking` plus a timeout annotation ([kotlinx-coroutines-test README](https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md)).
- `StandardTestDispatcher` requires explicit `runCurrent()`/`advanceUntilIdle()` to observe launched-coroutine effects; `UnconfinedTestDispatcher` enters `launch`/`async` bodies eagerly up to the first suspension point — pick the second only when precise dispatch ordering does not matter to the assertion ([kotlinx-coroutines-test README](https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md)).
- `runTest`'s virtual time runs everything on **one** `TestCoroutineScheduler` thread — it cannot reproduce a race that only exists because two coroutines are genuinely running on separate real threads (a `Dispatchers.Default`/`IO` data race, a lock-ordering bug). That class of bug needs a *separate* real-dispatcher stress test, not a `runTest` variant (see [§9](#9-runtest-three-properties-two-dispatchers-and-one-thing-virtual-time-cannot-catch)).
- Adding a parameter — defaulted or not — to a published `suspend fun` is a hard `NoSuchMethodError` for Kotlin callers and `@JvmOverloads` does not fix it; this rule lives in KT-API-07 (`jvm-language-api.md`) and is cited here, not restated ([jvm-language-api.md](../jvm-language-api.md)).
- Contrary to the brief's working assumption, detekt as of the exemplar snapshot **does** ship lint coverage for `GlobalScope` (`GlobalCoroutineUsage`) and for swallowed `CancellationException` (`SuspendFunSwallowedCancellation`) — both shipped but **inactive by default**, so "detekt is configured" is not "these two checks run" ([detekt@45672efb8b:detekt-core/src/main/resources/default-detekt-config.yml:140-159](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-core/src/main/resources/default-detekt-config.yml)).
- No lint of any kind exists for "a long-running loop is missing a cooperative-cancellation check" — that one genuinely stays a reading heuristic (see [Normative guidance candidate 12](#normative-guidance-candidates)).

## Findings

### 1. CoroutineExceptionHandler fires on root coroutines only

The Kotlin docs are explicit: *"CoroutineExceptionHandler is invoked only on uncaught exceptions — exceptions that were not handled in any other way. In particular, all children coroutines … delegate handling of their exceptions to their parent coroutine, which also delegates to the parent, and so on until the root, so the CoroutineExceptionHandler installed in their context is never used."* ([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)).

`launch` and `async` diverge from there:

```kotlin
// launch — the handler fires
val job = GlobalScope.launch(handler) { throw AssertionError() }
// async — the handler is NEVER consulted, even installed on a root
val deferred = GlobalScope.async(handler) { throw ArithmeticException() } // nothing printed
```

The documented reason: *"async catches all exceptions and represents them in the resulting Deferred object"* — the handler has nothing to fire on until `await()` re-throws. The only correct way to observe an `async` failure is:

```kotlin
try {
    deferred.await()
} catch (e: ArithmeticException) { /* handle here */ }
```

An installed `CoroutineExceptionHandler` alongside `async` is dead configuration, not a weaker safety net — nothing will ever call it ([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)).

A handler on a coroutine launched inside `runBlocking` is also dead: *"It does not make sense to install an exception handler to a coroutine that is launched in the scope of the main runBlocking, since the main coroutine is going to be always cancelled when its child completes with exception despite the installed handler."* ([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)).

### 2. supervisorScope's direct children are roots; a SupervisorJob's children are not automatically

This is the distinction the brief calls out, and JetBrains states it directly: *"coroutines launched directly inside the supervisorScope do use the CoroutineExceptionHandler that is installed in their scope in the same way as root coroutines do"* ([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)):

```kotlin
supervisorScope {
    val child = launch(handler) { throw AssertionError() } // handler DOES fire — this child is a root
}
```

`SupervisorJob()` alone only breaks *propagation of failure/cancellation between siblings* — *"A failure or cancellation of a child does not propagate to the supervisor job or its other children"* — it says nothing about handler dispatch for a coroutine nested two levels deep under it:

```kotlin
val supervisor = SupervisorJob()
with(CoroutineScope(coroutineContext + supervisor)) {
    val firstChild = launch(handler) { throw AssertionError() } // this IS a direct child → handler fires
    // but a launch{} NESTED INSIDE firstChild is not a direct child of supervisor,
    // and delegates to firstChild as normal — the handler on firstChild does not help it.
}
```

The rule an agent needs is precise: **"direct child of a SupervisorJob" and "direct child of a supervisorScope" both count as roots for handler purposes; anything nested one level further does not**, regardless of which supervising mechanism sits above it.

### 3. CancellationException is transparent by design — catch it, rethrow it, never absorb it

*"Cancellation exceptions are transparent and are unwrapped by default"* — catching and rethrowing a `CancellationException` lets the **original** wrapped exception still reach the handler:

```kotlin
try {
    innerJob.join()
} catch (e: CancellationException) {
    println("Rethrowing CancellationException with original cause")
    throw e // the original IOException still reaches the handler
}
```
([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html))

The failure mode is `catch (e: Exception)` or `runCatching { }` around a suspending call — both are wider than `CancellationException` and swallow it unless the code special-cases it:

```kotlin
// WRONG — swallows cancellation, coroutine keeps running after scope.cancel()
suspend fun poll() = try {
    fetch()
} catch (e: Exception) {
    log.warn(e)   // CancellationException lands here and dies
}

// RIGHT — rethrow cancellation before the catch-all runs
suspend fun poll() = try {
    fetch()
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    log.warn(e)
}
```

`runCatching { }` has the identical problem because it is implemented as a blanket `catch (Throwable)` — see the [Exemplar evidence](#exemplar-evidence) table for detekt's `SuspendFunSwallowedCancellation`, a lint that already encodes this exact wrong/right pair, including the `runCatching` case. Docs: *"Coroutines internally use CancellationException for cancellation, these exceptions are ignored by all handlers, so they should be used only as the source of additional debug information."* ([coroutines-cancellation.html](https://kotlinlang.org/docs/coroutines-cancellation.html)).

### 4. First exception wins; the rest ride along as suppressed

*"When multiple children of a coroutine fail with an exception, the general rule is 'the first exception wins', so the first exception gets handled. All additional exceptions that happen after the first one are attached to the first exception as suppressed ones."*

```kotlin
val handler = CoroutineExceptionHandler { _, exception ->
    println("got $exception with suppressed ${exception.suppressed.contentToString()}")
}
val job = GlobalScope.launch(handler) {
    launch { try { delay(Long.MAX_VALUE) } finally { throw ArithmeticException() } } // second
    launch { delay(100); throw IOException() }                                       // first
}
// output: got java.io.IOException with suppressed [java.lang.ArithmeticException]
```

A reviewer reading a coroutine failure report must check `exception.suppressed` before concluding only one child failed — the aggregation is real, not lossy, but it is invisible unless you look. Docs note this mechanism is JVM-1.7+ only (`Throwable.addSuppressed`/`getSuppressed`) ([exception-handling.html](https://kotlinlang.org/docs/exception-handling.html)).

### 5. Cancellation is cooperative — a tight loop with no suspension point never stops

*"Coroutines react to cancellation only when they cooperate by suspending or checking for cancellation explicitly."* ([coroutines-cancellation.html](https://kotlinlang.org/docs/coroutines-cancellation.html))

```kotlin
// WRONG — ignores cancellation forever, keeps a thread pinned
launch {
    var i = 0
    while (i < 5) {
        if (System.currentTimeMillis() >= nextPrintTime) { println(i); i++ }
    }
}

// RIGHT — any one of these three makes the loop cooperative
while (i < 5) { if (!isActive) break; … }        // cheapest — just stop
while (i < 5) { ensureActive(); … }               // throws CancellationException — propagates like a failure
while (i < 5) { yield(); … }                      // also gives other coroutines a turn on the thread
```

Resource cleanup on cancellation goes in `finally`, which always runs — but a **suspending** call inside that `finally` will itself be immediately cancelled unless wrapped:

```kotlin
try {
    awaitCancellation()
} finally {
    withContext(NonCancellable) { shutdownServiceAndWait() } // completes even though the coroutine is cancelled
}
```

*"Without withContext(NonCancellable), this function doesn't complete because the coroutine is canceled."* `withTimeout(d) { }` throws `TimeoutCancellationException` (a `CancellationException` subtype — see Finding 3's transparency rule) on overrun; `withTimeoutOrNull(d) { }` returns `null` instead of throwing ([coroutines-cancellation.html](https://kotlinlang.org/docs/coroutines-cancellation.html)).

### 6. Dispatchers.IO has a ceiling, and limitedParallelism views don't add to it

The dispatcher's own KDoc, verified against its exemplar source, states the default in one sentence: *"It defaults to the limit of 64 threads or the number of cores (whichever is larger)"*, tunable via the `kotlinx.coroutines.io.parallelism` system property ([kotlinx.coroutines@f63a04bacb:kotlinx-coroutines-core/jvm/src/Dispatchers.kt:9,29-30](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-core/jvm/src/Dispatchers.kt)).

The elasticity clause matters more than the ceiling itself, because it inverts a common mental model — `limitedParallelism(n)` views do **not allocate n new threads**; they are windows onto the *same* underlying elastic pool that backs `Dispatchers.IO` itself:

```kotlin
// 100 threads for MySQL connection
val myMysqlDbDispatcher = Dispatchers.IO.limitedParallelism(100)
// 60 threads for MongoDB connection
val myMongoDbDispatcher = Dispatchers.IO.limitedParallelism(60)
// the system MAY have up to 64 + 100 + 60 = 224 threads at peak,
// but in steady state the three dispatchers SHARE threads — they do not sum by default.
```
([Dispatchers.kt:34-48](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-core/jvm/src/Dispatchers.kt))

The mechanism behind the view: `CoroutineDispatcher.limitedParallelism` returns a `LimitedDispatcher` that *"never dispatches originally sent tasks to the underlying dispatcher. Instead, it maintains its own queue of tasks … and dispatches at most `parallelism` 'worker-loop' tasks that poll the underlying queue"* — the limit bounds how many worker-loop tasks run concurrently on the shared pool, not how many threads exist ([kotlinx.coroutines@f63a04bacb:kotlinx-coroutines-core/common/src/internal/LimitedDispatcher.kt:7-19](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-core/common/src/internal/LimitedDispatcher.kt)). Practical consequence: giving every blocking-I/O call site its own `limitedParallelism(n)` view is cheap and does not multiply real OS threads — the anti-pattern is instead running truly unbounded blocking work (an infinite poll loop, an unmetered fan-out) directly on bare `Dispatchers.IO`, which can still exhaust the 64-thread ceiling because that ceiling *is* real for the base dispatcher itself.

### 7. The shared-mutable-state fix ladder — volatile is not on it

Starting from a plain shared counter incremented by 100 coroutines concurrently on `Dispatchers.Default`, the docs walk five fixes in order of how often people reach for the wrong one first ([shared-mutable-state-and-concurrency.html](https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html)):

| Fix | Verdict | Why |
|---|---|---|
| `@Volatile var counter` | ❌ still racy | *"volatile variables guarantee linearizable … reads and writes … but do not provide atomicity of larger actions (increment in our case)"* — `counter++` is read-modify-write, not one operation |
| `AtomicInteger` | ✅ fastest | single atomic `incrementAndGet()` |
| fine-grained confinement — `withContext(single-thread) { counter++ }` per increment | ✅ correct, ❌ slow | every single increment pays a context switch |
| coarse-grained confinement — `withContext(single-thread) { massiveRun { counter++ } }` once | ✅ correct and fast | one switch for the whole workload |
| `Mutex().withLock { counter++ }` | ✅ flexible | *"a good choice … where you absolutely must modify some shared state periodically, but there is no natural thread that this state is confined to"* |

The `@Volatile` row is the one an AI agent reaches for reflexively (it "sounds like" the Java `volatile` fix for visibility bugs) and is the one the docs call out by name as insufficient.

### 8. GlobalScope: not absolute — the one sanctioned pattern is an explicitly-passed parent Job

The design rationale, from Elizarov's own writing (accessed via search-index excerpt after Medium's bot wall returned HTTP 403 on direct fetch — see [Sources](#sources)): *"There is hardly ever reason to use GlobalScope in an application that is based on Kotlin coroutines"* because *"it is not hard to lose track of concurrent activities you have, run out of resources and/or introduce memory leaks this way"*; explicit `CoroutineScope` usage *"lets you contain, delimit and keep track of all the concurrent operations … and, importantly, tie them to the lifecycle of your application entities"* (elizarov.medium.com, "The reason to avoid GlobalScope").

"Hardly ever" is doing real work in that sentence, and the exemplar corpus shows the one pattern that survives it — ktor's CIO engine:

```kotlin
// ktor@f92fad04: ktor-client-cio/.../CIOEngine.kt:73
val parentContext = super.coroutineContext
val parent = parentContext[Job]!!
requestsJob = SilentSupervisor(parent)
…
GlobalScope.launch(parentContext, start = CoroutineStart.ATOMIC) {
    try { requestJob.join() } finally { selector.close() }
}
```
([ktor@f92fad04353817c7eacf8599c8d69d517ba4882c:ktor-client/ktor-client-cio/common/src/io/ktor/client/engine/cio/CIOEngine.kt:73](https://github.com/ktorio/ktor/blob/f92fad04353817c7eacf8599c8d69d517ba4882c/ktor-client/ktor-client-cio/common/src/io/ktor/client/engine/cio/CIOEngine.kt))

`GlobalScope` here contributes nothing but "start with no ambient scope"; the actual parent — and therefore the actual cancellation lifetime — comes from `parentContext`, which carries the caller's real `Job`. The coroutine is not orphaned: cancelling that `Job` cancels this launch exactly like a structured child would be cancelled. The other five `GlobalScope.launch`/`.writer(...)` sites in the same repo follow the identical shape — always passed an explicit `callContext`/`parentContext` argument, never a bare `GlobalScope.launch { }` ([ktorio/ktor grep, 6 hits, all with an explicit first-argument context](https://github.com/ktorio/ktor)).

The bare form is the actual violation, and it is the one detekt's `GlobalCoroutineUsage` rule flags — indiscriminately, including the sanctioned pattern (see the [Exemplar evidence](#exemplar-evidence) table).

### 9. runTest: three properties, two dispatchers, and one thing virtual time cannot catch

`runTest`'s own README states its three departures from `runBlocking` in one bulleted list:

> - *"The calls to `delay` are automatically skipped, preserving the relative execution order of the tasks."*
> - *"The execution times out after 60 seconds, cancelling the test coroutine to prevent tests from hanging forever and eating up the CI resources."*
> - *"Handling uncaught exceptions spawned in the child coroutines by throwing them at the end of the test."*

([kotlinx-coroutines-test README](https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md))

`StandardTestDispatcher` ("a simple dispatcher … linked to a TestCoroutineScheduler") requires you to call `runCurrent()`/`advanceUntilIdle()`/`advanceTimeBy(...)` before a `launch`ed coroutine's side effects are observable. `UnconfinedTestDispatcher` instead *"enters eagerly"* — child coroutines run immediately up to their first suspension point, with no `runCurrent()` needed:

```kotlin
@Test
fun testEagerlyEnteringChildCoroutines() = runTest(UnconfinedTestDispatcher()) {
    var entered = false
    val deferred = CompletableDeferred<Unit>()
    launch { entered = true; deferred.await() }
    assertTrue(entered) // already ran, no runCurrent() needed
}
```
([kotlinx-coroutines-test README, "Eagerly entering launch and async blocks"](https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md))

A coroutine that must genuinely outlive the test body (a background poller) belongs in `backgroundScope.launch { }`, which is cancelled automatically at test end instead of making `runTest` hang waiting for it ([kotlinx-coroutines-test README, "Running background work"](https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md)).

**The open question the brief asks to settle:** can virtual time hide a real race? Yes, structurally, and the reason is architectural rather than a documented caveat — every `TestDispatcher` backed by a `TestCoroutineScheduler` runs its queued tasks **one at a time on a single thread**, deterministically ordered by virtual time (`kotlinx-coroutines-test/common/src/TestCoroutineScheduler.kt`, part of the same corpus). There is no genuine thread-level interleaving inside `runTest` — by construction, it cannot reproduce a bug whose existence depends on two coroutines truly executing in parallel on separate OS threads (a `Dispatchers.Default`/`Dispatchers.IO` data race, a mutex-acquisition-order deadlock, a `@Volatile`-is-not-enough bug from Finding 7). A `runTest` suite that exercises Finding 7's counter with a `StandardTestDispatcher` will pass every time, correctly and uselessly, regardless of whether the production code races.

**What a test must therefore do:** treat `runTest` as the *default and correct* tool for anything whose correctness is defined by suspension order and cancellation (the great majority of coroutine logic), and add a **separate, real-dispatcher stress test** — the shape `shared-mutable-state-and-concurrency.html`'s own `massiveRun` helper uses (`runBlocking(Dispatchers.Default) { repeat(100) { launch { repeat(1000) { action() } } } }`, deliberately *not* wrapped in `runTest`) — for any code whose correctness claim is "safe under real concurrent access." The two tests answer different questions; neither substitutes for the other.

### 10. Boundary with KT-API: a suspend signature is not exempt from binary-compatibility rules

`jvm-language-api.md` (KT-API-07) already settles this and is cited, not restated: *"Never expose a `data class`, and never add a parameter — defaulted or not — to a published Kotlin function. Both are hard `NoSuchMethodError` breaks; `@JvmOverloads` fixes neither for Kotlin callers, and the only mechanism that does (`@IntroducedAt`) is Experimental."* ([jvm-language-api.md](../jvm-language-api.md)). Nothing in this dive weakens that: a `suspend fun` compiles to a regular JVM method taking an extra `Continuation` parameter, so it is exactly as exposed to the descriptor-mismatch failure as any other published function — do not write, or let a review skill imply, that a suspend function's signature can be evolved more freely than a blocking one's. `apiCheck`/Binary Compatibility Validator reports the changed descriptor the same way for both.

## Normative guidance candidates

1. **Never install a `CoroutineExceptionHandler` on anything but a root coroutine** (a coroutine started directly on a `CoroutineScope`/`supervisorScope`, or a direct child of a `SupervisorJob`/`GlobalScope`). *Rationale:* a handler on a non-root coroutine is silently never called — the failure mode is a handler that looks configured but is dead code. *Verify:* read every `CoroutineExceptionHandler(...)` construction site; confirm the `launch`/`async` call it is passed to is a direct call on a `CoroutineScope`, `supervisorScope { }`, or a `SupervisorJob`-backed scope — not nested one level inside another `launch`/`async`. No existing lint does this reliably; it is a reading heuristic, not a grep.
2. **Never rely on `CoroutineExceptionHandler` to observe an `async` failure.** *Rationale:* the handler is never invoked for `async` — the exception only surfaces at `.await()`. *Verify:* grep `\.async\(` sites; confirm every one either has its `Deferred` awaited inside a `try`/`catch`, or is deliberately fire-and-forget with a documented reason.
3. **Rethrow `CancellationException` from every `catch` clause that can observe it, before any other handling runs.** *Rationale:* swallowing it breaks the coroutine's own cancellation without any visible symptom until the leak is diagnosed. *Verify:* detekt's `dev.detekt.rules.coroutines.SuspendFunSwallowedCancellation` (`coroutines: SuspendFunSwallowedCancellation: active: true` in the detekt config) — ships but is **inactive by default**, so the config must explicitly turn it on; fallback grep: `catch\s*\(\s*\w+\s*:\s*Exception\s*\)` or `runCatching\s*\{` inside a `suspend fun` body that also contains a suspending call, with no `is CancellationException` branch or immediate rethrow ([detekt@45672efb8b default-detekt-config.yml:156-157](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-core/src/main/resources/default-detekt-config.yml)).
4. **Never call `runBlocking` from inside a `suspend fun`.** *Rationale:* it blocks the calling thread for the duration, defeating the reason the enclosing function is suspending in the first place, and can deadlock a limited-parallelism dispatcher. *Verify:* no dedicated lint exists in the audited detekt or ktlint rule sets; reading heuristic — flag any `runBlocking(` call whose enclosing function declaration carries the `suspend` modifier.
5. **`GlobalScope.launch { }` / `GlobalScope.async { }` with no context argument is a MUST-fix; `GlobalScope.launch(explicitParentJobOrContext) { }` at an adapter boundary bridging a non-coroutine API into structured code is the one named exception** — and only when the passed context actually carries a `Job` that the caller controls. *Rationale:* the bare form detaches the coroutine from any lifecycle and leaks on failure or app shutdown; the context-carrying form is not actually detached — see Finding 8. *Verify:* detekt's `GlobalCoroutineUsage` (`coroutines: GlobalCoroutineUsage: active: true`) flags every `GlobalScope.launch`/`.async` call site **without distinguishing the two forms** — a human/agent pass is still needed to confirm a flagged site either has no context argument (real violation) or does (accept, do not just silence the finding) ([detekt@45672efb8b default-detekt-config.yml:142-143](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-core/src/main/resources/default-detekt-config.yml); exemplar: [ktor CIOEngine.kt:73](https://github.com/ktorio/ktor/blob/f92fad04353817c7eacf8599c8d69d517ba4882c/ktor-client/ktor-client-cio/common/src/io/ktor/client/engine/cio/CIOEngine.kt)).
6. **Do not run unbounded or long-blocking work directly on bare `Dispatchers.IO`; give it a `Dispatchers.IO.limitedParallelism(n)` view sized to the real resource it guards** (a connection pool's max size, a rate limit). *Rationale:* `Dispatchers.IO` itself still has the 64-thread-or-cores ceiling (Finding 6); an unbounded fan-out of blocking calls against it starves every other IO consumer in the process, and unlike a raw thread pool the starvation has no visible queue-depth metric by default. *Verify:* grep `withContext(Dispatchers.IO)` / `Dispatchers.IO.limitedParallelism` call sites; for each, confirm the block performs bounded work (one request/one file) rather than an internal loop or fan-out with no cap; detekt's `SleepInsteadOfDelay` (`active: true` by default) catches the adjacent mistake of `Thread.sleep` inside any coroutine body regardless of dispatcher ([detekt@45672efb8b default-detekt-config.yml:151-152](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-core/src/main/resources/default-detekt-config.yml)).
7. **Fix a shared-mutable-state race with `AtomicInteger`/`AtomicReference`, coarse-grained thread confinement, or `Mutex.withLock` — never with `@Volatile`.** *Rationale:* `@Volatile` only makes single reads/writes atomic; a compound operation like `counter++` still races. *Verify:* grep `@Volatile\s+var` on a field that is also the target of a compound assignment (`++`, `+=`, `-=`) anywhere it is written from more than one coroutine/dispatcher — a `detekt` custom rule can encode this pattern; no built-in rule does as of the audited snapshot.
8. **Every suspending call inside a `finally` block that must complete despite cancellation is wrapped in `withContext(NonCancellable) { }`.** *Rationale:* a bare suspending call in `finally` is itself cancelled immediately once the coroutine is already cancelled, so cleanup silently does not run. *Verify:* detekt's `SuspendFunInFinallySection` (ships **inactive by default** — `coroutines: SuspendFunInFinallySection: active: true` must be set) flags a suspending call inside a `finally` with no enclosing `NonCancellable` context ([detekt@45672efb8b default-detekt-config.yml:153-154](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-core/src/main/resources/default-detekt-config.yml)).
9. **A long-running loop inside a coroutine body must contain a suspension point (`delay`, `yield`, another `suspend fun` call) or an explicit `isActive`/`ensureActive()` check.** *Rationale:* without either, the loop is not cooperative and cancellation is a no-op until the loop finishes on its own (Finding 5). *Verify:* no lint exists for this in the audited rule sets — the reading heuristic is: find every `while`/`for` loop nested directly inside a `launch`/`async`/`suspend fun` body whose bound is not a small fixed constant; confirm the loop body contains at least one of `isActive`, `ensureActive(`, `yield(`, `delay(`, or a call to another `suspend fun`. A loop containing none of these five is the finding.
10. **`runTest` is the default for suspend-order/cancellation logic; add a separate real-dispatcher stress test for anything whose correctness claim is about actual thread-level concurrency.** *Rationale:* Finding 9 — `runTest`'s virtual time runs on one thread and cannot exercise a genuine data race or lock-ordering bug. *Verify:* for any test file asserting a fix from candidate 7 (atomics/confinement/mutex), confirm at least one test in the suite launches on a real dispatcher (`Dispatchers.Default`, or a real thread pool) with real repetition (`massiveRun`-shaped: many coroutines × many iterations), not only inside `runTest`.
11. **Choose `StandardTestDispatcher` when the test asserts dispatch order or needs to interleave `advanceTimeBy`/`runCurrent` calls; choose `UnconfinedTestDispatcher` only when the test does not care about ordering and wants launched coroutines to run immediately.** *Rationale:* picking `UnconfinedTestDispatcher` for an ordering-sensitive test silently changes what the test actually exercises, because child coroutines run eagerly instead of on the scheduler's queue. *Verify:* reading heuristic — a test using `UnconfinedTestDispatcher` that also calls `runCurrent()`/`advanceUntilIdle()` is very likely a copy-paste from a `StandardTestDispatcher` test and should be re-examined.
12. **A `runTest` body that must outlive the test's own coroutines (a background poller, an event-collector) launches on `backgroundScope`, never on the test's own top-level scope.** *Rationale:* `runTest` waits for every non-`backgroundScope` child to finish; a genuinely-infinite child launched at the top level hangs the test until the 60-second timeout instead of failing fast with a clear cause. *Verify:* grep test files for `launch { while (true)` or `launch { for (` patterns not preceded by `backgroundScope.`.
13. **Do not add a parameter, defaulted or not, to a published `suspend fun`.** *Rationale/verify:* cited from KT-API-07 (`jvm-language-api.md`) — this dive does not restate its verification, only flags that suspend functions are equally exposed to it. See [Finding 10](#10-boundary-with-kt-api-a-suspend-signature-is-not-exempt-from-binary-compatibility-rules).

## Exemplar evidence

| Candidate | Repo@sha:path:line | Satisfies / violates / contradicts |
|---|---|---|
| 5 (bare `GlobalScope`) | [ktor@f92fad04:ktor-client/ktor-client-cio/common/src/io/ktor/client/engine/cio/CIOEngine.kt:73](https://github.com/ktorio/ktor/blob/f92fad04353817c7eacf8599c8d69d517ba4882c/ktor-client/ktor-client-cio/common/src/io/ktor/client/engine/cio/CIOEngine.kt) | Satisfies the *exception* clause — `GlobalScope.launch(parentContext, …)` passes the real parent `Job`; not a bare call |
| 5 (bare `GlobalScope`) | [ktor@f92fad04:ktor-client/ktor-client-android/jvm/src/io/ktor/client/engine/android/AndroidClientEngine.kt:131](https://github.com/ktorio/ktor/blob/f92fad04353817c7eacf8599c8d69d517ba4882c/ktor-client/ktor-client-android/jvm/src/io/ktor/client/engine/android/AndroidClientEngine.kt) | Same pattern — `GlobalScope.writer(callContext) { }`, context-carrying, not bare |
| 6 (Dispatchers.IO ceiling / elasticity) | [kotlinx.coroutines@f63a04ba:kotlinx-coroutines-core/jvm/src/Dispatchers.kt:9,29-48](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-core/jvm/src/Dispatchers.kt) | Primary source itself — the library's own KDoc states the 64-thread default and the elasticity guarantee verbatim |
| 6 (limitedParallelism mechanism) | [kotlinx.coroutines@f63a04ba:kotlinx-coroutines-core/common/src/internal/LimitedDispatcher.kt:7-19](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-core/common/src/internal/LimitedDispatcher.kt) | Implementation confirms the view queues its own tasks rather than owning dedicated threads |
| 3 (swallowed CancellationException — lint exists) | [detekt@45672efb8b:detekt-rules-coroutines/src/main/kotlin/dev/detekt/rules/coroutines/SuspendFunSwallowedCancellation.kt:104-193](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-rules-coroutines/src/main/kotlin/dev/detekt/rules/coroutines/SuspendFunSwallowedCancellation.kt) | Contradicts the brief's working assumption that no lint exists — a real, K2-Analysis-API-based rule ships with exactly this wrong/right pair in its own KDoc |
| 3 & 5 (both ship but inactive) | [detekt@45672efb8b:detekt-core/src/main/resources/default-detekt-config.yml:140-159](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-core/src/main/resources/default-detekt-config.yml) | `GlobalCoroutineUsage`, `SuspendFunSwallowedCancellation`, `SuspendFunInFinallySection`, `CoroutineLaunchedInTestWithoutRunTest` are all `active: false` by default; `InjectDispatcher`, `RedundantSuspendModifier`, `SleepInsteadOfDelay`, `SuspendFunWithFlowReturnType` are `active: true` |
| 8 (finally + NonCancellable — lint exists) | [detekt@45672efb8b:detekt-rules-coroutines/src/main/kotlin/dev/detekt/rules/coroutines/SuspendFunInFinallySection.kt:19-34](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-rules-coroutines/src/main/kotlin/dev/detekt/rules/coroutines/SuspendFunInFinallySection.kt) | Same wrong/right shape as the official docs' example, independently authored |
| 6 (SleepInsteadOfDelay, adjacent to unbounded-IO-work) | [detekt@45672efb8b:detekt-rules-coroutines/src/main/kotlin/dev/detekt/rules/coroutines/SleepInsteadOfDelay.kt:29-34](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-rules-coroutines/src/main/kotlin/dev/detekt/rules/coroutines/SleepInsteadOfDelay.kt) | Active by default — catches `Thread.sleep` inside any suspending function/coroutine block on any dispatcher |
| 9 (long-loop cancellation check — no lint) | none found across the audited detekt rule module (`detekt-rules-coroutines`, 10 rules total) | Confirms the brief's assumption for *this specific* check — genuinely no lint, unlike candidates 3/5/8 |
| 12 (backgroundScope discipline) | [kotlinx.coroutines@f63a04ba:kotlinx-coroutines-test/common/src/TestScopeImpl.kt](https://github.com/Kotlin/kotlinx.coroutines/tree/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-test/common/src) via the README's own worked example | README example (`Channel` + infinite `while(true)` producer) is exactly the shape candidate 12 targets |

## AI-agent angle

- **Reaching for `@Volatile` on a shared counter.** This is the single most-trained-on wrong answer: it is the correct fix for a *visibility* bug in plain Java and looks identical to the Kotlin syntax, but does nothing for a compound `counter++`. Smallest check: grep `@Volatile\s+var` fields that are also targets of `++`/`+=`/`-=` from more than one call site.
- **Treating `GlobalScope` as an unconditional ban and therefore "fixing" ktor-shaped adapter code by wrapping it in a locally-created `CoroutineScope` that then never gets cancelled** — trading a detekt warning for a real leak. Smallest check: before rewriting a flagged `GlobalScope.launch(context, …)` call, confirm whether `context` already carries a `Job`; if it does, the finding is a false positive to suppress with a comment, not a call to refactor.
- **Assuming `runCatching { }` is a safe, idiomatic Kotlin replacement for try/catch in suspending code.** It reads as more modern Kotlin than a `try`/`catch`, and models trained mostly on non-coroutine Kotlin over-generalize its safety. Smallest check: grep `runCatching\s*\{` inside any file containing `suspend fun`; each hit needs a manual check for whether a suspending call sits inside the block.
- **Installing a `CoroutineExceptionHandler` on every `launch`/`async` "for safety," including nested ones and `async`.** This produces code that looks defensive and passes a naive read, but roughly half of the handlers installed this way are dead. Smallest check: for each `CoroutineExceptionHandler(...)` construction, trace the one `launch`/`async` call it's passed to and confirm it is a *direct* call on a scope/`supervisorScope`/`SupervisorJob`, and that it's `launch` (not `async`).
- **Citing detekt rule IDs or default states from training-era knowledge.** detekt's coroutines rule classes now live under the `dev.detekt.rules.coroutines` package (not the historical `io.gitlab.arturbosch.detekt.rules.coroutines`), reflecting a package rename baked into the corpus snapshot; an agent that emits the old package/group coordinates for a config or a custom-rule import will fail to compile against the current artifact. Smallest check: before writing any `detekt` rule-set or provider reference, grep the target project's actual `detekt` dependency version/group and confirm the package prefix before naming it in generated config.
- **Assuming a passing `runTest` proves a shared-mutable-state fix is race-free.** `runTest`'s single-threaded virtual scheduler cannot fail on a real data race even when one exists (Finding 9) — a model that writes only `runTest`-based tests for concurrency-safety claims is validating something adjacent to, not identical with, the claim. Smallest check: any test file whose test *name* references "concurrent", "thread-safe", "race", or similar, but whose body only uses `runTest`/`StandardTestDispatcher`/`UnconfinedTestDispatcher` with no real-dispatcher variant, is a signal to add the stress-test companion from candidate 10.

## Contested / evolving

- **Whether "inject the dispatcher" is a MUST or a SHOULD.** detekt ships `InjectDispatcher` active by default, recommending every hardcoded `Dispatchers.IO`/`Default`/`Unconfined` reference become an injected parameter (sourced from Android's own coroutines-best-practices guide, not a JetBrains coroutines-library document). This is real and enforced-by-default in the audited snapshot, but it is a testability convention layered on top of the language-level rules in this dive, not one of JetBrains' own wrong/right pairs — treat it as a strong SHOULD for library/SDK code with its own test dispatcher story, not a blanket MUST, until a future wave measures adoption across the broader exemplar corpus.
- **detekt's coroutines ruleset activation defaults are a moving target.** Four of ten rules in the audited snapshot (`GlobalCoroutineUsage`, `SuspendFunSwallowedCancellation`, `SuspendFunInFinallySection`, `CoroutineLaunchedInTestWithoutRunTest`) ship inactive; the other six are active. A rule set that adds these specific checks to CI must pin the config explicitly rather than trusting "detekt is enabled" — and should re-check this activation table against whatever detekt version ships once the tool cuts a release from its current `dev.detekt`-package main branch, since a stable release could change these defaults.
- **`@IntroducedAt`-style mechanisms for safely widening a suspend signature remain Experimental** (per KT-API-07/jvm-language-api.md) — until that stabilizes, "never add a parameter to a published suspend fun" stays an absolute, not a "usually" rule, for any code targeting Kotlin binary compatibility.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [kotlinlang.org/docs/exception-handling.html](https://kotlinlang.org/docs/exception-handling.html) | Official Kotlin docs, coroutine exception handling | Fetched 2026-09-12; describes current (K2-era) coroutines library behavior | Primary source for the root-only handler rule, launch-vs-async, supervisorScope-vs-SupervisorJob, first-exception-wins/suppressed |
| [kotlinlang.org/docs/coroutines-cancellation.html](https://kotlinlang.org/docs/coroutines-cancellation.html) | Official Kotlin docs, cancellation and timeouts (brief's `/cancellation-and-timeouts.html` now redirects here) | Fetched 2026-09-12 | Primary source for cooperative cancellation, `isActive`/`ensureActive`/`yield`, `NonCancellable`, `withTimeout`/`withTimeoutOrNull` |
| [kotlinlang.org/docs/shared-mutable-state-and-concurrency.html](https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html) | Official Kotlin docs, shared mutable state | Fetched 2026-09-12 | Primary source for the volatile-doesn't-help fix ladder |
| [kotlinlang.org/docs/coroutine-context-and-dispatchers.html](https://kotlinlang.org/docs/coroutine-context-and-dispatchers.html) | Official Kotlin docs, coroutine context and dispatchers | Fetched 2026-09-12 | Confirmed this page does not itself cover `Dispatchers.IO`/`GlobalScope` specifics (both moved to the Dispatchers KDoc and other pages) — read to rule out, not for content |
| [kotlinlang.org/api/.../Dispatchers/-i-o.html](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-dispatchers/-i-o.html) | Rendered KDoc for `Dispatchers.IO` | Fetched 2026-09-12, matches kotlinx.coroutines main-branch source | Primary source for the 64-thread ceiling, `kotlinx.coroutines.io.parallelism`, and elasticity |
| [kotlinx-coroutines-test README](https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md) | Module README in the kotlinx.coroutines repository | Fetched via `raw.githubusercontent.com` 2026-09-12, `kotlinx-coroutines-test:1.11.0` referenced in the doc | Primary source for `runTest`'s three properties, `StandardTestDispatcher` vs `UnconfinedTestDispatcher`, `backgroundScope` |
| [kotlinx.coroutines@f63a04bacb — Dispatchers.kt](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-core/jvm/src/Dispatchers.kt) | Exemplar corpus, the actual library source behind the KDoc | SHA fixed 2026-09-05 per `jvm-frame.md` | Ground truth for Finding 6 — the KDoc rendering and the source agree verbatim |
| [kotlinx.coroutines@f63a04bacb — LimitedDispatcher.kt](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/kotlinx-coroutines-core/common/src/internal/LimitedDispatcher.kt) | Exemplar corpus, internal implementation | Same SHA | Confirms the mechanism behind `limitedParallelism`'s elasticity, not just the documented behavior |
| [ktor@f92fad0435 — CIOEngine.kt](https://github.com/ktorio/ktor/blob/f92fad04353817c7eacf8599c8d69d517ba4882c/ktor-client/ktor-client-cio/common/src/io/ktor/client/engine/cio/CIOEngine.kt) | Exemplar corpus | SHA fixed 2026-09-05 | Real-world instance of the sanctioned `GlobalScope` exception pattern |
| [detekt@45672efb8b — detekt-rules-coroutines module](https://github.com/detekt/detekt/tree/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-rules-coroutines) | Exemplar corpus, detekt's own coroutines lint rules and their KDoc | SHA fixed 2026-09-05; `dev.detekt.*` package (post io.gitlab.arturbosch.detekt rename, pre-stable-release main branch) | Overturns the brief's "no lint" assumption for two of the five MUST rows; ground truth for which checks exist and which are active by default |
| [detekt@45672efb8b — default-detekt-config.yml](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-core/src/main/resources/default-detekt-config.yml) | Exemplar corpus, the shipped default activation state for every rule | Same SHA | Sole source for "ships but inactive by default" — this is not stated anywhere in the rule KDoc itself |
| elizarov.medium.com, "The reason to avoid GlobalScope" and "Kotlin and Exceptions" (Roman Elizarov, JetBrains) | Design-rationale essays named in the brief | Direct fetch returned HTTP 403 (Medium/Cloudflare bot wall) on every attempt (WebFetch, curl with browser UA, web.archive.org, freedium.cfd mirror all blocked); content below is the verbatim-quoted excerpt returned by web search's own indexed snippet, not a full read | Cited for the GlobalScope/structured-concurrency design rationale; treat quotes as excerpts, not confirmed complete-article context — re-attempt a direct fetch in a future wave if full-article nuance becomes load-bearing |
| [jvm-language-api.md](../jvm-language-api.md) | This program's own wave-2 consolidation | 2026-09-12 | Source of KT-API-07, cited rather than restated per the wave-2 boundary in this brief |


---
title: Coroutines, Cancellation and Dispatchers
summary: The KT-CORO family: the detekt activation gate, GlobalScope and runBlocking, dead exception handlers, swallowed cancellation, dispatcher bounds, shared mutable state, and what runTest cannot prove
---

# Coroutines, Cancellation and Dispatchers

Owns launching, awaiting, cancelling and collecting: anything with `suspend` in
the signature, plus the coroutine-specific half of the detekt config. Does not
own general exception chaining or closing a resource, which are `KT-ERR`
(errors and resources), and this file governs only the rethrow of
`CancellationException`. Wiring detekt and ktlint at all is `KT-LINT`, which
cites `KT-CORO-01` rather than restating it. The published signature of a
`suspend fun` is `KT-API-07`, in `KT-API`. The rest of the Kotlin test gate is
`KT-TEST`, which cites `KT-CORO-11`, `-12` and `-13` for the coroutine-specific
rows. `jvmTarget` and compiler flags are `KT-COMP`. Threads, pools, locks and
the child-process boundary are `JAVA-CONC`, in the Java rule set. **Named gap:**
`Flow`'s `catch`-operator placement and `StateFlow`'s conflation contract have
no rule in this family as of 2026-09-12.

Contents: [Dates and Floors](#dates-and-floors) ·
[The Activation Gate](#the-activation-gate) ·
[Greppable at the Call Site](#greppable-at-the-call-site) ·
[Reading the Coroutine Body](#reading-the-coroutine-body) ·
[Reading the Test](#reading-the-test) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Verified 2026-09-12 unless a row says otherwise.

- **kotlinx.coroutines 1.11.x** is the floor for every dispatcher row.
  `Dispatchers.IO` ceilings at `max(64, core count)`, tunable only by the
  `kotlinx.coroutines.io.parallelism` system property, and
  `limitedParallelism(n)` is an elastic view onto that same pool, so views do
  not allocate `n` threads and do not sum.
- **kotlinx-coroutines-test 1.11.0** is the floor for the test rows: `runTest`
  auto-skips `delay`, waits for every non-`backgroundScope` child, rethrows
  uncaught child exceptions at test end, and times out at 60 seconds by default.
- **detekt** was audited at a main-branch snapshot taken mid package rename to
  `dev.detekt.*`. Coroutine rule coordinates are therefore
  `dev.detekt.rules.coroutines`, and the pre-rename
  `io.gitlab.arturbosch.detekt.rules.coroutines` does not compile against the
  current artifact. Read the project's own detekt dependency group before
  naming a package in generated config.
- **Re-check trigger:** `KT-CORO-01`'s whole premise is that the four coroutine
  rules stay `active: false`. Re-read the shipped
  `default-detekt-config.yml` on the first stable release from the renamed
  branch.

## The Activation Gate

Nothing below `KT-CORO-01` is checked automatically until this row passes.
Four coroutine rules ship `active: false` in detekt's own
`default-detekt-config.yml`, so `buildUponDefaultConfig = true` runs none of
them, while `InjectDispatcher`, `RedundantSuspendModifier`,
`SleepInsteadOfDelay` and `SuspendFunWithFlowReturnType` ship active and do run.

```bash
CFG=config/detekt/detekt.yml   # whichever file the build's config.setFrom(...) names
grep -n -A2 -e 'GlobalCoroutineUsage' -e 'SuspendFunSwallowedCancellation' \
  -e 'SuspendFunInFinallySection' -e 'CoroutineLaunchedInTestWithoutRunTest' "$CFG"
```

Empty output is **the finding**, not the pass: an absent key means the rule is
off, never defaulted-on. Each of the four must print with `active: true` beneath
it.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-CORO-01 | **Pinned default, override once in your own config.** Where detekt is the Kotlin logic gate, set `coroutines: GlobalCoroutineUsage`, `SuspendFunSwallowedCancellation`, `SuspendFunInFinallySection` and `CoroutineLaunchedInTestWithoutRunTest` to `active: true` in the committed config. Never treat "detekt is applied" as evidence that these run. | All four ship `active: false`, so a `buildUponDefaultConfig` build leaves the coroutine correctness checks off while reporting a green gate. Measured across 32 public JVM repositories on 2026-09-12: **1/32** activates any of the four (detekt's own dogfooding config, and only `GlobalCoroutineUsage`), and **0/32** activate `SuspendFunSwallowedCancellation` or `SuspendFunInFinallySection`. Turning them on is a new commitment, not a codified convention. | The gate command above. Empty output is the finding. | MUST |

## Greppable at the Call Site

Every row here has a grep that locates the sites. The greps produce a work
list, and the finding is what a read of each hit shows.

```bash
grep -rn --include='*.kt' -e 'GlobalScope.' -e 'runBlocking' \
  -e 'CoroutineExceptionHandler' -e 'Dispatchers.IO' .
grep -rl --include='*.kt' 'suspend fun' . | xargs -r grep -nE \
  -e 'runCatching\s*\{' -e 'catch\s*\([^)]*:\s*(Exception|Throwable)\)'
```

Empty output from both means this section does not apply.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-CORO-02 | `GlobalScope.launch { }` and `GlobalScope.async { }` with **no context argument** are MUST-fix. The one named exception is `GlobalScope.launch(explicitParentContext, …)` at an adapter boundary bridging a non-coroutine API, and only where that context carries a `Job` the caller owns. | The bare form detaches the coroutine from every lifecycle and leaks on failure or shutdown. The context-carrying form is not detached at all: cancelling the passed `Job` cancels the launch exactly like a structured child, which is how ktor's CIO engine parents all six of its `GlobalScope` sites. | `grep -rnE --include='*.kt' -e 'GlobalScope\.launch\s*\{' -e 'GlobalScope\.async\s*\{' -e 'GlobalScope\.writer\s*\{' .` where the brace follows the call name with no argument list: every hit is the finding, and empty output is the pass. detekt's `GlobalCoroutineUsage` finds the call sites but **cannot distinguish the two forms**, so each of its findings needs one read of the first argument before any edit. `@OptIn(DelicateCoroutinesApi::class)` is present on both forms and is not a discriminator. | MUST |
| KT-CORO-03 | Never call `runBlocking` from inside a `suspend fun`. | It blocks the calling thread for the duration, defeating the reason the enclosing function suspends, and it can deadlock a `limitedParallelism` dispatcher whose whole allowance is then held by blocked worker loops. | No lint covers this in the audited detekt or ktlint rule sets. Reading check: `grep -rn --include='*.kt' 'runBlocking' .`, then for each hit confirm the enclosing function declaration does **not** carry the `suspend` modifier. Empty output is the pass. | MUST |
| KT-CORO-04 | Install a `CoroutineExceptionHandler` only on a root coroutine: one started directly on a `CoroutineScope` or `supervisorScope`, or a direct child of a `SupervisorJob`. Never on `async`, and never on a `launch` nested inside another `launch` or `async`. | Children delegate exception handling to their parent, so a handler in a child's context is never used. `async` captures every exception into the resulting `Deferred`, so the handler has nothing to fire on and the failure surfaces only at `.await()`. A handler on a coroutine launched inside `runBlocking` is equally dead. One level below a supervising scope still counts as a root, two levels does not, whichever supervising mechanism sits above. | Reading check, per handler: `grep -rn --include='*.kt' 'CoroutineExceptionHandler' .`, then trace the single `launch` or `async` it is passed to. Three findings: the call is `async`, or the call is nested inside another `launch` or `async` body, or the enclosing scope is `runBlocking`. Companion grep: `grep -rnE --include='*.kt' '\.async\(' .` and confirm every `Deferred` is `await()`ed inside a `try`/`catch` or is deliberately fire-and-forget with a written reason. Empty output on both is the pass. | MUST |
| KT-CORO-05 | Rethrow `CancellationException` from every `catch` clause wide enough to observe it, before any other handling runs. `runCatching { }` is such a clause, because it is a blanket `catch (Throwable)`. | Swallowing it breaks the coroutine's own cancellation with no symptom until the leak is diagnosed. Cancellation exceptions are ignored by all handlers and are transparent, so rethrowing still lets the **original** wrapped exception reach the handler. | detekt `SuspendFunSwallowedCancellation`, which must be activated first (`KT-CORO-01`). Fallback, restricted to files that contain `suspend fun`: the second gate command above. A hit with no `is CancellationException` branch and no immediate rethrow is the finding, and empty output is the pass. | MUST |
| KT-CORO-06 | Do not run unbounded or long-blocking work on bare `Dispatchers.IO`. Give each blocking call site a `Dispatchers.IO.limitedParallelism(n)` view sized to the real resource it guards. | `Dispatchers.IO` ceilings at `max(64, core count)` and starvation there has no default queue-depth metric. Views are cheap and correct: `limitedParallelism(n)` maintains its own queue and dispatches at most `n` worker-loop tasks onto IO's existing pool, so views neither allocate threads nor sum. The anti-pattern is the unbounded work on the base dispatcher, not the number of views. | `grep -rn --include='*.kt' -e 'Dispatchers.IO' .`, then for each hit confirm the block does bounded work (one request, one file) rather than an internal loop or an uncapped fan-out. Empty output is the pass. detekt `SleepInsteadOfDelay` is active by default and catches the adjacent `Thread.sleep`-in-a-coroutine mistake. | MUST |

```kotlin
// wrong: the handler is dead code twice over, and both forms compile and read as defensive
val h = CoroutineExceptionHandler { _, e -> log(e) }
scope.launch { async(h) { fetch() } }        // async captures into the Deferred
scope.launch { launch(h) { fetch() } }       // a child delegates to its parent

// right: on the root, and the Deferred's failure observed where it actually surfaces
scope.launch(h) { val d = async { fetch() }; try { d.await() } catch (e: IOException) { recover(e) } }
```

## Reading the Coroutine Body

No grep decides any of these four. Each grep below lists candidates, and the
finding is in the body.

```bash
grep -rn --include='*.kt' '@Volatile' .
grep -rnE -A5 --include='*.kt' 'finally\s*\{' .
grep -rnE --include='*.kt' 'while\s*\(' .
```

Empty output from all three is the pass for the first three rows.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-CORO-07 | Fix a shared-mutable-state race with `AtomicInteger`/`AtomicReference`, coarse-grained thread confinement, or `Mutex.withLock`, never with `@Volatile`. Prefer one `withContext` around the whole workload over one per increment. Never mix a suspending `Mutex` with a blocking `synchronized` in one critical section. | JetBrains names this exact mistake: volatile variables guarantee linearizable reads and writes but do not provide atomicity of larger actions, and an increment is a larger action. Fine-grained confinement is correct but pays a context switch per operation. | `grep -rn --include='*.kt' '@Volatile' .`: a hit on a `var` that is also the target of `++`, `+=` or `-=` anywhere is the finding, and empty output is the pass. No built-in detekt rule covers this in the audited snapshot, so it is a custom-rule candidate. | MUST |
| KT-CORO-08 | Wrap any suspending call in a `finally` block that must complete despite cancellation in `withContext(NonCancellable) { }`. | A bare suspending call in `finally` is itself cancelled immediately once the coroutine is already cancelled, so the cleanup silently does not run. | detekt `SuspendFunInFinallySection`, which must be activated first (`KT-CORO-01`). Fallback: `grep -rnE -A5 --include='*.kt' 'finally\s*\{' .` and read for a suspending call with no enclosing `NonCancellable`. Empty output is the pass. | MUST |
| KT-CORO-09 | A long-running loop inside a coroutine body contains at least one of: a suspension point (`delay`, `yield`, a call to another `suspend fun`) or an explicit `isActive` or `ensureActive()` check. | Cancellation is cooperative, never preemptive. Without one of those, `cancel()` is a no-op until the loop finishes on its own. | **No lint exists**, confirmed across detekt's whole ten-rule coroutines module. Stated so a review skill can run it: `grep -rnE --include='*.kt' 'while\s*\(' .` lists the candidates, then keep every loop nested directly inside a `launch`, `async` or `suspend fun` body whose bound is not a small fixed constant. The finding is a loop body containing **none** of the five tokens `isActive`, `ensureActive(`, `yield(`, `delay(`, or a call to another `suspend fun`. Empty output is the pass. | MUST |
| KT-CORO-10 | In a library or SDK, take the dispatcher as an injected parameter rather than hardcoding `Dispatchers.IO`, `Default` or `Unconfined` at the call site. | detekt ships `InjectDispatcher` **active by default**, so this is already enforced wherever detekt runs at all. It is a testability convention rather than one of JetBrains' own correctness pairs, which is why it is a SHOULD and not a peer of `KT-CORO-02` through `-06`. | detekt `InjectDispatcher`, default-active, no config change needed: a detekt run reporting no `InjectDispatcher` finding is the pass. Where detekt is not wired, `grep -rn --include='*.kt' -e 'Dispatchers.IO' -e 'Dispatchers.Default' -e 'Dispatchers.Unconfined' src/main` and confirm each hit is a parameter default rather than a call site. | SHOULD |

```kotlin
// wrong: @Volatile is the fix for a visibility bug and does nothing for a compound update
@Volatile var counter = 0
suspend fun bump() = withContext(Dispatchers.Default) { counter++ }

// right: atomic, or one coarse confinement around the whole workload
val counter = AtomicInteger(0)
suspend fun bump() = withContext(Dispatchers.Default) { counter.incrementAndGet() }
```

## Reading the Test

`runTest` stays the default and correct tool for everything defined by
suspension order and cancellation. These three rows cover what it cannot do and
what it silently changes.

```bash
grep -rlniE --include='*.kt' -e 'concurrent' -e 'thread-?safe' -e 'race' src/test \
  | xargs -r grep -L -e 'Dispatchers.Default' -e 'Dispatchers.IO'
grep -rnE --include='*.kt' 'launch\s*\{\s*(while|for)\s*\(' src/test
grep -rn -A10 --include='*.kt' 'UnconfinedTestDispatcher' src/test
```

Empty output from all three is the pass. The first command prints the files that
claim thread safety without ever touching a real dispatcher, which is the
finding for `KT-CORO-11`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-CORO-11 | A test whose claim is thread safety (atomics, confinement, `Mutex`, a name containing "concurrent", "thread-safe" or "race") needs a real-dispatcher stress test **in addition to** `runTest`. | Every `TestDispatcher` backed by a `TestCoroutineScheduler` runs its queue one task at a time on a single thread, ordered deterministically by virtual time. By construction it cannot reproduce a bug that exists only because two coroutines truly run in parallel: a `Dispatchers.Default` data race, a lock-ordering deadlock, a compound update that `@Volatile` does not cover. Such a suite passes correctly and uselessly. | The first gate command above: every file it prints is the finding, and empty output is the pass. The companion shape is the docs' own `massiveRun`, deliberately **not** inside `runTest`: `runBlocking(Dispatchers.Default) { repeat(100) { launch { repeat(1000) { action() } } } }`. | MUST |
| KT-CORO-12 | A coroutine in a `runTest` body that must outlive the test's own coroutines (a background poller, an event collector) launches on `backgroundScope`. | `runTest` waits for every non-`backgroundScope` child, so a genuinely infinite child launched at the top level hangs until the 60-second default timeout instead of failing fast with a legible cause. | The second gate command above: a hit not prefixed by `backgroundScope.` is the finding, and empty output is the pass. | SHOULD |
| KT-CORO-13 | Choose `StandardTestDispatcher` when the test asserts dispatch order or interleaves `advanceTimeBy`/`runCurrent`. Choose `UnconfinedTestDispatcher` only when ordering does not matter. | `UnconfinedTestDispatcher` enters `launch` and `async` bodies eagerly up to the first suspension point, so picking it for an ordering-sensitive test silently changes what the test exercises. | The third gate command above: a hit whose test body also calls `runCurrent()` or `advanceUntilIdle()` is almost certainly a copy-paste from a `StandardTestDispatcher` test and is the finding. Empty output is the pass. | CONSIDER |

## What Agents Get Wrong Here

1. **Reaching for `@Volatile` on a shared counter.** The most-trained-on wrong
   answer in Kotlin concurrency. It is the correct fix for a visibility bug and
   does nothing for a compound `counter++`, and it reads as the deliberate,
   knowledgeable choice. Check: `KT-CORO-07`.
2. **Treating "detekt is configured" as "the coroutine checks run."**
   `buildUponDefaultConfig = true` with `ignoreFailures = false` looks like the
   strictest possible gate and runs zero of the four rules. Measured 1/32 and
   0/32 on 2026-09-12. Check: `KT-CORO-01`.
3. **Installing a `CoroutineExceptionHandler` on every `launch` and `async`
   "for safety."** Looks defensive, passes a naive read, and roughly half the
   handlers are dead code: all of the `async` ones, all of the nested ones.
   Check: `KT-CORO-04`.
4. **Treating `runCatching { }` as the modern, safe Kotlin try/catch.** It is a
   blanket `catch (Throwable)` and it swallows `CancellationException`, which
   breaks cancellation with no symptom at the call site. Check: `KT-CORO-05`.
5. **"Fixing" a flagged `GlobalScope.launch(context, …)` by wrapping it in a
   locally created `CoroutineScope` that is never cancelled**, trading a detekt
   warning for a real leak. Before rewriting, read whether the first argument
   already carries a `Job`. If it does, suppress with a comment explaining the
   parenting, and do not refactor. Check: `KT-CORO-02`.
6. **Assuming a passing `runTest` proves a race fix.** The dispatcher that makes
   the test deterministic is the same thing that makes it blind to the bug.
   Check: `KT-CORO-11`.
7. **Emitting detekt rule coordinates from memory.** The coroutines rules now
   live under `dev.detekt.rules.coroutines`, and the pre-rename
   `io.gitlab.arturbosch.detekt.rules.coroutines` does not compile against the
   current artifact. Read the project's actual detekt dependency group before
   naming any package in generated config.

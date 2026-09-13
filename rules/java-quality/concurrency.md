---
title: Threads, Locks and the Process Boundary
summary: The JAVA-CONC family: virtual threads and fan-out bounds, floor-conditional lock choice, preview concurrency APIs, shared-state annotations, and spawning and reaping a child process
---

# Threads, Locks and the Process Boundary

Owns whether a task gets a thread, how many run at once, which lock guards shared
state, and everything about starting and reaping a child process. Does not own
closing what concurrency opened. `ExecutorService` shutdown is `JAVA-ERR-05` and
re-interrupting is `JAVA-ERR-01`, both in `JAVA-ERR` (errors and resources). The
argv handed to a spawn is `JAVA-SEC-06` in `JAVA-SEC` (security and untrusted
input): this file governs the environment and the reaping, that rule governs the
argv, and neither restates the other. Wiring Error Prone or SpotBugs, and bumping
a warning to an error, is `JAVA-LINT`. The exit-code enum is `JAVA-API-14`, the
dependency budget `JAVA-API-15`. Anything with `suspend` in the signature is
`KT-CORO`, in the Kotlin rule set.

Contents: [Dates and Floors](#dates-and-floors) ·
[Threads, Pools and Fan-Out](#threads-pools-and-fan-out) ·
[The Declared JDK Floor Decides](#the-declared-jdk-floor-decides) ·
[Preview APIs on a Published Compile Path](#preview-apis-on-a-published-compile-path) ·
[Context Carriers and Per-Thread Caches](#context-carriers-and-per-thread-caches) ·
[Shared State and Lock Ceilings](#shared-state-and-lock-ceilings) ·
[The Process Boundary](#the-process-boundary) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Verified 2026-09-12 unless a row says otherwise.

- **JDK 21 (JEP 444)** finalised virtual threads. `Process.onExit()` and
  `Process.descendants()` are JDK 9 and cost no floor at all.
- **JDK 24 (JEP 491)** made monitors release the carrier and **removed**
  `-Djdk.tracePinnedThreads`. It is the split point for lock advice.
- **JDK 25 (JEP 506)** finalised `ScopedValue`, and `orElse` no longer accepts `null`.
- **`StructuredTaskScope` is still preview through JDK 27** (JEP 505 / 525 /
  533, finalisation targeted at 28). JDK 27 reached GA 2026-09-15, after these
  rows were written against the RC. Re-read the GA javadoc before emitting a
  JDK-27 member, and re-check JAVA-CONC-05 when the JEP header flips to
  `Scope: SE`.

## Threads, Pools and Fan-Out

One gate lists the sites, and every row is read against that list.

```bash
grep -rn --include='*.java' -e 'ofVirtual()' -e 'newVirtualThreadPerTaskExecutor' \
  -e 'newFixedThreadPool' -e 'new ThreadPoolExecutor' -e 'parallelStream()' \
  -e 'ForkJoinPool.commonPool()' .
```

Its output is the work list, not the finding, and empty output means the section does not apply.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-CONC-01 | Never construct a fixed-size pool of virtual threads. Limit concurrency with a `Semaphore` or the resource's own admission control, and keep one virtual thread per task. | JEP 444 (JDK 21) states both absolutes verbatim: *"a new virtual thread should be created for every application task"*, *"virtual threads should never be pooled"*, and *"do not be tempted to pool virtual threads in order to limit concurrency… use constructs specifically designed for that purpose, such as semaphores"*. The fixed-pool form compiles, runs, and defeats the whole design. | `grep -rn --include='*.java' -e 'newFixedThreadPool' -e 'new ThreadPoolExecutor' .` then read each hit's thread-factory argument: a `Thread.ofVirtual()` factory there is the finding. `newVirtualThreadPerTaskExecutor()` alone is correct and needs no pairing. Empty output is the pass. | MUST |
| JAVA-CONC-02 | Bound fan-out at the real downstream resource's known capacity (a connection pool's `maximumPoolSize`, a native library's own limit, an API's rate budget), never at "however many tasks exist". | Virtual threads removed the accidental throttle a 20-thread platform pool used to impose, and the resources with real ceilings did not get cheaper. | Reading check, no grep substitutes. For every `executor.submit(…)` or `scope.fork(…)` loop over a collection whose size is caller-controlled, confirm a `Semaphore`, a bounded `Joiner`, or a named pool size sits between the loop and the downstream call **in the same method**. A loop with none, calling a pooled or rate-limited client, is the finding. | MUST |
| JAVA-CONC-15 | Size a pool by its workload's regime, never by habit. CPU-bound work, meaning no blocking call anywhere in the task body, stays on a pool sized to `Runtime.availableProcessors()`. Blocking-style I/O (network, JDBC, file, subprocess wait) goes one-virtual-thread-per-task, never onto a CPU-sized pool and never onto the common pool through a no-argument `…Async` call. | JEP 444 states the boundary condition in its own text: throughput needs *"the number of concurrent tasks is high"* **and** *"the workload is not CPU-bound, since having many more threads than processor cores cannot improve throughput in that case"*, with a Non-Goal of offering *"a new data parallelism construct"*. The two pools are genuinely different: the virtual-thread carrier pool is a FIFO `ForkJoinPool` while the common pool runs LIFO. Documented gap: this rests on JEP 444's text, not on a measured violation rate. | `grep -rn --include='*.java' -e 'parallelStream()' -e 'ForkJoinPool.commonPool()' .` then read each lambda for a blocking call (network, JDBC, `Thread.sleep`, `waitFor()`): a hit is the finding unless it is wrapped in `ForkJoinPool.ManagedBlocker`. Then `grep -rnE --include='*.java' '\.then[A-Za-z]*Async\(' .`: a call with no trailing `Executor` whose lambda blocks is the same finding at a second site. Empty output on both is the pass. | MUST |

```java
// wrong: reads as "limit concurrency to 8", compiles, and pools virtual threads
var pool = Executors.newFixedThreadPool(8, Thread.ofVirtual().factory());

// right: one virtual thread per task, the bound expressed where the resource is
var gate = new Semaphore(8);
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
  for (var t : tasks) exec.submit(() -> { gate.acquire(); try { call(t); } finally { gate.release(); } });
}
```

## The Declared JDK Floor Decides

Read the floor before writing either row's advice:

```bash
grep -rn --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' \
  -e 'languageVersion' -e 'sourceCompatibility' -e 'maven.compiler.release' .
```

Empty output means the floor is undeclared, which is itself the finding: neither
rule below has a correct answer without it.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-CONC-03 | State `synchronized`-versus-`ReentrantLock` guidance conditionally on the module's minimum supported JDK, never as one sentence. Floor 17 or 21: migrate `synchronized` sections that are hot **and** block on I/O while holding the monitor. Floor 24 or higher: default to `synchronized`, and reach for `java.util.concurrent.locks` only for `tryLock`, fairness, interruptible or timed acquisition, `Condition`, or read-write splitting. Never require reverting already-migrated code. | JEP 491 (JDK 24) made monitors acquire, hold and release independently of the carrier, then quoted *Java Concurrency in Practice* §13.4 for the post-24 default and said explicitly *"you need not revert code that has been migrated"*. Below 24 the pre-491 advice is still correct, and JDK 24 still pins in a `static` initializer: HikariCP [#1463](https://github.com/brettwooldridge/HikariCP/issues/1463) is a live report of exactly that case. One unconditional sentence is provably wrong for one side of the split. | The gate command above, run **before** writing either half. Any generated advice recommending `ReentrantLock` "to avoid pinning virtual threads" with no JDK floor named is incomplete by construction and is the finding. | MUST |
| JAVA-CONC-04 | Do not use `-Djdk.tracePinnedThreads` anywhere: not in a script, a Dockerfile, a CI job, or a troubleshooting doc. On JDK 24 and above the `jdk.VirtualThreadPinned` JFR event is the only pinning detector. | JEP 491 removed the property: *"setting it on the command line will have no effect"*. A silent no-op gives false confidence that no pinning occurred. The JFR event is on by default at a 20 ms threshold and carries the pinning reason and the carrier's identity. | `grep -rn 'tracePinnedThreads' .`: any hit in a module whose floor is 24 or higher is the finding. Empty output is the pass. Replacement: record with `-XX:StartFlightRecording=filename=vt.jfr,settings=profile`, then `jfr print --events jdk.VirtualThreadPinned vt.jfr`. | MUST |

## Preview APIs on a Published Compile Path

Two greps, and the second one is read rather than counted:

```bash
grep -rn --include='*.java' 'StructuredTaskScope' src/main
grep -rn --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' \
  -e 'enable-preview' -e 'enablePreview' .
```

Empty output from the first is the pass. The second produces a work list: read
which task each hit feeds before calling anything a violation.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-CONC-05 | No preview API (`StructuredTaskScope`, `Joiner`, or anything else needing `--enable-preview`) on the main sourceset compile path of any published module. | Not an opinion about maturity. JEP 12 stamps a preview-dependent class file with `minor_version` all-16-bits-set, and *"if preview features are not enabled at run time, a JVM implementation will not load a class file that depends on the preview features of any Java SE release"*, pinned to the **exact** feature release that compiled it. A jar built with `--enable-preview` on JDK 26 does not run on JDK 27 even with the flag re-passed, because JDK 27's preview is a different shape. | The two gate commands. A `compilerArgs` entry on a published module's main sourceset is the violation, while a test-task `jvmArgs` entry is **not**. With no preview-dependent class file compiled, a runtime flag permits loading nothing, and a grep that counts the literal string flags the repo that got it right. | MUST |
| JAVA-CONC-06 | Any code sample, comment or generated snippet naming a concrete `StructuredTaskScope` or `Joiner` member carries the JDK number it was verified against, and the member is re-read against that JDK's javadoc before being emitted. | The shape changed in five of seven previews: `Subtask` replaced `Future` at 21, `open()`/`open(Joiner)` replaced the `ShutdownOnFailure`/`ShutdownOnSuccess` constructors at 25, `allSuccessfulOrThrow()` returns `List` not a stream and `onTimeout()` arrived at 26, and at 27 a third `R_X` type parameter arrived, `awaitAll()` was removed and `onTimeout()` became `timeout()`. An undated sample is a compile error waiting to happen. | `grep -rn --include='*.java' --include='*.md' -e 'StructuredTaskScope' -e 'Joiner.' .`: a hit with no adjacent "(JDK N)" qualifier is the finding. Three compile-breakers to grep for by name: `new StructuredTaskScope.ShutdownOn` (gone since 25), `allSuccessfulOrThrow()` iterated as a stream (pre-26 shape), `onTimeout(` in JDK-27-targeted code. | MUST |

## Context Carriers and Per-Thread Caches

```bash
grep -rn --include='*.java' -e 'ScopedValue' -e 'ThreadLocal' .
```

Empty output means the section does not apply.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-CONC-07 | Carry one-way context into child and forked tasks with `ScopedValue`, not `ThreadLocal`, and never pass a literal `null` to `ScopedValue.orElse`. | `ScopedValue` finalised in JDK 25 (JEP 506) with exactly one behavioural change: *"the `ScopedValue.orElse` method no longer accepts `null` as its argument"*. The class's blanket null contract makes `orElse(null)` a **runtime** `NullPointerException`, not a compile error, so preview-era code that compiled now throws. Bindings are immutable, flow one way, and are inherited by forked subtasks. | `grep -rn --include='*.java' '.orElse(null)' .`: a hit on a `ScopedValue` receiver is the MUST finding. Empty output is the pass. Error Prone's `ThreadLocalUsage` is the complementary signal for new `ThreadLocal` fields in code that also uses virtual threads. | MUST (no `orElse(null)`) · SHOULD (prefer `ScopedValue`) |
| JAVA-CONC-08 | Audit `static final ThreadLocal<…>` caches before scaling code onto virtual threads, and do **not** default to "replace it with a lock-free pool". State the chosen strategy: pooled, bounded, non-recycling, or kept with a written rationale. | A cache sized for "few, long-lived threads" becomes never-reused garbage under one-thread-per-task. But jackson-core, which owns the extension point, made a lock-free pool the default in 2.17.0 (2024-03-12), reverted it in 2.17.1 (2024-05-04) after production regressions, and deprecated the pool in 2.18.0. Its `JsonRecyclerPools` now offers five strategies rather than a winner. | `grep -rn --include='*.java' -e 'static final ThreadLocal' -e 'ThreadLocal.withInitial(' .`: for each hit guarding a non-trivially-constructed reusable object (buffer, formatter, parser), the finding is an **undocumented** strategy, not the `ThreadLocal` itself. | SHOULD |

## Shared State and Lock Ceilings

```bash
grep -rn --include='*.java' -e 'import net.jcip.annotations' -e '@GuardedBy' \
  -e '@Immutable' -e '@ThreadSafe' -e 'ReentrantReadWriteLock' -e 'asReadWriteLock()' .
```

A hit on the first pattern is a finding on its own, and the rest are a work list.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-CONC-16 | Document shared mutable state with the **checker-recognised** annotation: `@GuardedBy("lock")` from `com.google.errorprone.annotations.concurrent` or `javax.annotation.concurrent`, never from `net.jcip.annotations`, and `@Immutable` from `com.google.errorprone.annotations`. Treat `@ThreadSafe`, in any package, as prose only. | `GuardedByChecker` and `ImmutableChecker` are both `ENABLED_ERRORS` in Error Prone's `BuiltInCheckerSuppliers` (2.36.0, read 2026-09-12), so both are free, zero-config and build-breaking the moment the annotation exists. The only missing piece is the convention of writing it. `GuardedByUtils` recognises exactly five packages and the *Java Concurrency in Practice* one is not among them, so the most-trained-on import compiles clean and enforces nothing. `ThreadSafeChecker` ships in none of the three built-in sets despite its own annotation's javadoc claiming it does, a documented gap that inverts if a later release wires it. | `grep -rn --include='*.java' 'import net.jcip.annotations' .`: any hit is the finding, independent of whether Error Prone is wired. Empty output is the pass for that half. The writing half is a reading pass: a class with a shared mutable `static` or instance field and **no** annotation at all is the finding, and no grep can prove that absence. A build failing on `GuardedByChecker` is the rule working, and suppressing it is the violation. | SHOULD (writing it) · MUST (never the JCIP package) |
| JAVA-CONC-17 | Treat `ReentrantReadWriteLock`'s 65535-hold ceiling as reachable under virtual-thread fan-out. Where a read/write lock guards a resource whose reader count scales with concurrent tasks rather than a fixed platform pool, either bound readers below 65535 with a `Semaphore` or use `StampedLock`'s optimistic-read path directly. If `asReadWriteLock()` is used as a drop-in, audit first for `Condition` use and reentrant re-acquisition. | The lock's own javadoc ("Implementation Notes", JDK 21, unchanged since JDK 5): *"This lock supports a maximum of 65535 recursive write locks and 65535 read locks. Attempts to exceed these limits result in `Error` throws from locking methods"*. That is an `Error`, which a routine `catch (Exception e)` never sees. A platform pool self-limited far below this by the cost of its threads, and one-virtual-thread-per-task does not. `asReadWriteLock()` is a view with real lost behaviour: the returned locks *"do not support a `Condition`"*, `StampedLock`s are *"not reentrant"*, and they *"have no notion of ownership"*. | `grep -rn --include='*.java' 'ReentrantReadWriteLock' .` then, per hit, read whether the reader count scales with virtual-thread fan-out rather than a bounded platform pool with no `Semaphore` between. That is the finding. Mechanically: `grep -rn --include='*.java' 'asReadWriteLock()' .` and `grep -rn --include='*.java' 'newCondition()' .`: a file appearing in both lists is a guaranteed runtime `UnsupportedOperationException`, invisible at compile time. | SHOULD |

## The Process Boundary

For a library that wraps an external CLI, the process boundary **is** the
concurrency surface. These six rows have no exemplar in the 32-repo corpus read
for this program: they are commitments, not codified convention.

```bash
grep -rn --include='*.java' -e 'new ProcessBuilder' -e 'onExit()' -e '.environment()' src/main
```

Empty output means no spawn site exists and this section does not apply.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-CONC-09 | Every spawn point takes a launcher interface (or an equivalently narrow functional interface) by constructor injection. Production code never calls `new ProcessBuilder(…).start()` outside the one real implementation. | Java has no mockable process API: `ProcessBuilder.start()` is a concrete method on a concrete class that always talks to the OS, so the interface **is** the test seam. The test double is a subclass of the abstract `java.lang.Process`, not a mocking-library trick. | `grep -rn --include='*.java' 'new ProcessBuilder' src/main`: every hit must sit inside the single launcher implementation, and a hit anywhere else is the finding. Then `grep -rn --include='*.java' -e 'mock(ProcessBuilder' -e 'mock(Process.class' src/test`: empty output is the pass, and any hit is the tell that the seam was skipped. | MUST |
| JAVA-CONC-10 | Drain `getInputStream()` and `getErrorStream()` concurrently, as two tasks, or as one plus `redirectErrorStream(true)`. Never read one to completion before touching the other. | The JDK javadoc states it as a warning, not folklore: *"failure to promptly write the input stream or read the output stream of the process may cause the process to block, or even deadlock"*. `redirectErrorStream(true)` is wrong wherever stdout carries a machine-readable payload a parser must consume verbatim, because it mixes diagnostics into it. | Reading check, no lint exists. Any method that calls `readAllBytes()` or `readAllLines()` on one process stream and then blocks on `waitFor()` or on the other stream, without both reads already submitted to separate threads or futures, is the finding. | MUST |
| JAVA-CONC-11 | The kill ladder is `destroy()` → `waitFor(grace)` → `destroyForcibly()` → `waitFor()`, reached from a `finally` (or a try-with-resources close) on every spawn path. If the wrapped CLI can fork children, the ladder walks `process.descendants()` and destroys each handle. | The platform asymmetry is real: on POSIX `destroy()` is `SIGTERM` and the grace window means something, while on Windows both calls are `TerminateProcess`, so there is no graceful phase, and `Process.supportsNormalTermination()` detects which regime applies. Neither call reaches descendants: the JVM has no `killpg` and `ProcessBuilder` has no new-session option, so a forking CLI leaves orphans. `descendants()` is JDK 9 and `waitFor(Duration)` is JDK 24 sugar, so pick one spelling and use it consistently. | `grep -rn --include='*.java' -e 'new ProcessBuilder' -e 'launch(' src/main`: each hit's enclosing method must reach a shared kill-ladder helper from a `finally`. Then `grep -rn --include='*.java' 'descendants()' src/main`: empty output is the finding unless a reviewed written statement records that the wrapped CLI never forks. | MUST |
| JAVA-CONC-12 | `ProcessBuilder.environment()` is `.clear()`-ed before anything is written to it, and `System.getenv()` is read in exactly one place: the class that builds your classified environment table. Variables you classify as caller-explicit are never read from the ambient environment under any code path, including a fallback branch. | `environment()` returns *"a copy of the current process environment"*, so it does not start empty: `pb.environment().put(k, v)` adds one key onto the full ambient environment and silently leaks whatever launched the JVM: a CI runner's secrets, a developer shell's overrides. One classified seam is the same discipline the Gradle-side `ValueSource`/`BuildService` spine enforces in `GRADLE-PLUG`, and if both exist they must agree on one table or they will drift. | `grep -rn -A3 --include='*.java' '.environment()' src/main`: a `.put` or `.putAll` not preceded by `.clear()` is the finding. `grep -rn --include='*.java' 'System.getenv' src/main`: every hit outside the one designated builder class is a finding. Empty output on both is the pass. | MUST |
| JAVA-CONC-13 | The async path for a one-command-at-a-time wrapper is `Process.onExit()`'s `CompletableFuture`, and every stage doing blocking work takes an explicit bounded `Executor`. Do not use `ForkJoinPool.commonPool()` for a blocking callback (the one named exception is a block wrapped in `ForkJoinPool.ManagedBlocker`), and do not adopt virtual threads here as the reason to raise the JDK floor. **pinned**: the default is `onExit()` on a floor of 17, and an adopter whose floor is already 21 or higher overrides it once, after which JAVA-CONC-01/02 bind instead. | `onExit()` is unmodified since JDK 9, so it costs no floor at all, and it matches a bounded boundary's shape. Virtual threads solve a fan-out problem this boundary does not have and force the floor to 21. A blocking callback on the common pool starves unrelated JVM-wide code, and it is literally that pool: `CompletableFuture`'s javadoc says *"all async methods without an explicit Executor argument are performed using `ForkJoinPool.commonPool()`"*. The `ManagedBlocker` carve-out is the JDK's own, so an unconditional "never block on a ForkJoinPool" is over-broad. | `grep -rn --include='*.java' 'onExit()' src/main`: every `…Async` stage on that chain must pass an `Executor` argument, and a no-arg `…Async`, or a blocking body inside a plain `.thenApply`, is the finding. `grep -rn --include='*.java' -e 'Thread.ofVirtual' -e 'newVirtualThreadPerTaskExecutor' src/main`: empty output is the pass unless the floor was raised for an unrelated reason. | MUST (explicit `Executor`) · SHOULD (`onExit` over virtual threads here) |
| JAVA-CONC-14 | A retryable exit status is retried **inside** the spawn or run call, strictly before any exception object for that attempt is constructed. Retryability is a fixed no-argument property on the exception type (or on the exit-code enum), never a constructor parameter threaded from a retry policy. **pinned**: the exit-code enum itself is `JAVA-API-14`, and an adopter overrides the table once, not the placement. | Placement is the mechanism, not documentation discipline. A caller that only catches exceptions cannot skip a retry that happens below exception construction, and any future call site that builds its exception through the shared exit-code map inherits correct retryability for free. | Two tests: one raising the retryable status from a fake launcher and asserting the retry count matches the configured policy **before** any exception reaches the caller, and one asserting `isRetryable()` is `true` for that subtype and `false` for every other, with no policy object in scope. Then `grep -rnE --include='*.java' -e 'stderr.*contains' -e 'stderr.*matches' -e 'stderr.*startsWith' src/main`: empty output is the pass, and any hit deciding control flow (as opposed to building a message) violates the exit-code-is-the-classification premise. | MUST |

```java
// wrong: stdout drained to EOF before stderr is touched, the classic deadlock
var out = p.getInputStream().readAllBytes();
var err = p.getErrorStream().readAllBytes();
int code = p.waitFor();

// right: both drains in flight before anything blocks on exit
var outF = CompletableFuture.supplyAsync(() -> readAll(p.getInputStream()), io);
var errF = CompletableFuture.supplyAsync(() -> readAll(p.getErrorStream()), io);
int code = p.waitFor();
var out = outF.join(); var err = errF.join();
```

## What Agents Get Wrong Here

1. **Reading stdout fully, then stderr fully, then calling `waitFor()`.** The
   most common process-handling bug in generated Java. It looks correct line by
   line and only deadlocks at output volumes the demo never reaches.
2. **`Executors.newFixedThreadPool(n, Thread.ofVirtual().factory())` "to limit
   concurrency."** Correct for platform threads, identical-looking for virtual
   ones, and it defeats the entire design.
3. **Forgetting `ProcessBuilder.environment()` starts pre-populated.**
   `pb.environment().put(k, v)` reads as "building an explicit environment" and
   is actually "adding one key to the ambient one". Every test that does not
   assert the child's environment is minimal still passes.
4. **Emitting a removed or renamed `StructuredTaskScope` member**:
   `new StructuredTaskScope.ShutdownOnFailure()` (gone since 25),
   `allSuccessfulOrThrow()` treated as a stream (pre-26), `onTimeout()` on
   JDK-27 code. Training data over-indexes on JDK-21-era posts.
5. **Importing `net.jcip.annotations.GuardedBy`.** The textbook package is what
   training data quotes, it compiles, it looks right, and `GuardedByChecker`
   cannot see it, so there is zero enforcement and no warning.
6. **Citing `-Djdk.tracePinnedThreads` as the pinning diagnostic.** Every
   pre-JDK-24 source recommends it, and it is now a silent no-op.
7. **Reaching for virtual threads because "it is 2026," and conflating their
   stability with structured concurrency's.** On a bounded boundary the floor
   jump buys nothing, and the two shipped together in public attention, not in
   status: final since 21 versus preview at 27.
8. **`ScopedValue.orElse(null)`.** Compiles on every JDK, throws
   `NullPointerException` since 25.
9. **Believing `@ThreadSafe`'s own javadoc.** It names a validator registered in
   none of Error Prone's built-in sets, so "the linter enforces this" is false.
10. **Saying "enable `DoubleCheckedLocking`"** (or `DateFormatConstant`, or
    `FutureReturnValueIgnored`). All three already run at warning level, so the
    action is a severity bump. That bump list is `JAVA-LINT`, which also owns
    the bare unassigned `CompletableFuture` chain.
11. **Tuning `-Djava.util.concurrent.ForkJoinPool.common.parallelism` to "help"
    virtual threads.** Both are `ForkJoinPool`s and JEP 444 documents them as
    operationally distinct, so the knob moves the wrong one.

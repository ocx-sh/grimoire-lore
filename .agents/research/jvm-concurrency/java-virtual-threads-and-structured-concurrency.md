---
title: Virtual threads and structured concurrency
topic: java-virtual-threads-and-structured-concurrency
agent: jvm-concurrency-virtual-threads
model: sonnet
date_researched: 2026-09-12
sources_count: 17
scope: |
  Covers the JDK 21-27 virtual-thread and structured-concurrency mechanics that
  feed `java-quality/concurrency.md` (family JAVA-CONC): virtual-thread creation
  and the never-pool rule (JEP 444), monitor pinning before and after JDK 24
  (JEP 444 / JEP 491), the finalised ScopedValue shape (JEP 506), the full
  StructuredTaskScope/Joiner API changelog across its 4th-7th previews (JEP
  499/505/525/533), the shipped-code guard for a still-preview API, and bounding
  fan-out once virtual threads remove the platform-thread ceiling. Every
  version-sensitive claim is dated against the JDK it was verified on
  (2026-09-12: JDK 26 is current-stable, JDK 27 is RC with GA fixed 2026-09-15).
  Does NOT cover Kotlin coroutines (KT-CORO, a separate dive), JUnit parallel
  test execution (JAVA-TEST-03/04), the SDK's async-path/process-boundary choice
  (a separate future dive that consumes these facts without pre-empting them),
  or the other JAVA-CONC rows outside this brief's source list (CompletableFuture
  exception chains, double-checked locking, SimpleDateFormat statics, @GuardedBy
  documentation, ReentrantReadWriteLock's 65,536-reader ceiling).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Virtual threads: the two absolutes (JEP 444)](#1-virtual-threads-the-two-absolutes-jep-444)
   2. [Pinning before and after JDK 24 (JEP 444 → JEP 491)](#2-pinning-before-and-after-jdk-24-jep-444--jep-491)
   3. [The pinning detector: tracePinnedThreads removed, JFR remains](#3-the-pinning-detector-tracepinnedthreads-removed-jfr-remains)
   4. [ScopedValue's finalised shape (JEP 506)](#4-scopedvalues-finalised-shape-jep-506)
   5. [StructuredTaskScope: the full changelog across four previews](#5-structuredtaskscope-the-full-changelog-across-four-previews)
   6. [Why preview bytecode cannot ship: the JEP 12 mechanism](#6-why-preview-bytecode-cannot-ship-the-jep-12-mechanism)
   7. [Bounding fan-out once the accidental throttle is gone](#7-bounding-fan-out-once-the-accidental-throttle-is-gone)
   8. [Per-thread caching fights the model: jackson-core#919](#8-per-thread-caching-fights-the-model-jackson-core919)
   9. [Dating every claim: what's true on 2026-09-12 vs. Tuesday](#9-dating-every-claim-whats-true-on-2026-09-12-vs-tuesday)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A virtual thread is created **one per task and never pooled** — JEP 444's own words: "a new virtual thread should be created for every application task" and virtual threads "should never be pooled since each is intended to run only a single task over its lifetime." [[JEP 444]](https://openjdk.org/jeps/444)
- To limit concurrency on virtual threads, use a **`Semaphore`** or another purpose-built construct — never a fixed-size thread pool of virtual threads. JEP 444 names this explicitly: "do not be tempted to pool virtual threads in order to limit concurrency." [[JEP 444]](https://openjdk.org/jeps/444)
- **JDK 24 (JEP 491)** made `synchronized` blocks/methods stop pinning virtual threads: monitors are now acquired, held and released independently of the carrier. Below JDK 24, `synchronized` still pins. [[JEP 491]](https://openjdk.org/jeps/491)
- JEP 491 did **not** fix three specific cases, which still pin on JDK 24+: (1) blocking while resolving a symbolic class/interface reference during class loading, (2) blocking inside a class initializer, (3) waiting for another thread to finish initializing a class — plus the pre-existing native-frame case (native methods, FFM calls back into blocking Java). [[JEP 491]](https://openjdk.org/jeps/491)
- `jdk.tracePinnedThreads` was **removed** in JDK 24; "setting it on the command line will have no effect." The only surviving detector is the `jdk.VirtualThreadPinned` JFR event, enabled by default with a 20ms threshold. [[JEP 491]](https://openjdk.org/jeps/491), [[JEP 444]](https://openjdk.org/jeps/444)
- The `synchronized`-vs-`ReentrantLock` rule is **JDK-floor-dependent, not universal**: below JDK 24 (17, 21), migrate hot/blocking `synchronized` sections to `ReentrantLock`; on JDK 24+, JEP 491 itself quotes JCIP §13.4 — "use `synchronized` where practical... use `ReentrantLock`... when more flexibility is required" — and explicitly says code already migrated need **not** be reverted. [[JEP 491]](https://openjdk.org/jeps/491)
- **`ScopedValue` (JEP 506) finalised in JDK 25** with exactly one behavioural change from preview: `orElse` **no longer accepts `null`** as its argument — passing `null` now throws `NullPointerException` per the class's blanket null-argument contract. [[JEP 506]](https://openjdk.org/jeps/506), [[ScopedValue javadoc]](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html)
- `StructuredTaskScope` is still a **preview API on JDK 26 (6th preview, JEP 525) and JDK 27 (7th preview, JEP 533, not yet GA)** as of 2026-09-12; JDK 27 GA is fixed for 2026-09-15 but has not shipped. Every preview iteration since JDK 21 has changed the API's shape. [[JEP 525]](https://openjdk.org/jeps/525), [[JEP 533]](https://openjdk.org/jeps/533), [[JDK 27 project]](https://openjdk.org/projects/jdk/27/)
- `fork()` has returned `Subtask<T>`, not `Future<T>`, since the very first preview (JEP 453, JDK 21) — this part of the brief's premise is already old news, not a recent change. [[JEP 525]](https://openjdk.org/jeps/525)
- **JDK 25 (JEP 505)** replaced `StructuredTaskScope`'s public constructors (`ShutdownOnFailure`, `ShutdownOnSuccess`) with static factories: `open()` and `open(Joiner)`. Code written against JDK 21-24's constructor-based shape does not compile on 25+. [[JEP 525]](https://openjdk.org/jeps/525)
- **JDK 26 (JEP 525)** changed `Joiner::allSuccessfulOrThrow()` to return a `List<T>` instead of a stream of subtasks, renamed `anySuccessfulResultOrThrow()` to `anySuccessfulOrThrow()`, and added `Joiner.onTimeout()`. [[JEP 525]](https://openjdk.org/jeps/525)
- **JDK 27 (JEP 533, RC as of 2026-09-12)** adds a third type parameter `R_X extends Throwable` to both `StructuredTaskScope<T,R,R_X>` and `Joiner<T,R,R_X>`; removes `Joiner.awaitAll()`; and replaces `onTimeout()` with `timeout()`, whose thrown exception carries a new `CancelledByTimeoutException` as its cause. [[JEP 533]](https://openjdk.org/jeps/533)
- A rule row naming a concrete `StructuredTaskScope`/`Joiner` method **must** carry the JDK number it was verified against — the shape changed in nearly every release from 21 through 27.
- **Shipped code must not use `StructuredTaskScope` while it is preview** (already decided by the topic map's conflict 15). The guard is mechanical: preview usage requires `--enable-preview` at both compile and runtime, and the JVM literally refuses to load a class file whose minor version marks it preview-dependent unless preview is re-enabled on the *exact same major JDK version* that compiled it (JEP 12) — a published library built this way cannot be consumed by anyone not passing the same flag on the same JDK feature release. [[JEP 12]](https://openjdk.org/jeps/12)
- The re-check trigger for that guard is the JEP's own status field flipping from preview (Scope: Implementation) to final (Scope: SE) — currently targeted at JDK 28 for structured concurrency, one release past JDK 27's 7th preview.
- Virtual threads remove the accidental concurrency ceiling that a small platform-thread pool used to impose. **Fan-out must be bounded at the real downstream resource** — a connection-pool size, a native library's own concurrency limit, or an external API's rate limit — not left unbounded because "threads are now cheap." A `Semaphore` sized to that resource, or a bounded `Joiner` policy, is the mechanism; the resource, not the thread count, sets the number.
- `--enable-preview` is used in **1 of 32** exemplar repos (`micronaut-core`, and only as a **test-runtime** JVM argument, not a compiler flag on the module's own production sourceset) — it is not a corpus norm, and a rule recommending it must say so.
- `jackson-core` is the flagship worked example for why per-thread caching fights the virtual-thread model: issue [#919](https://github.com/FasterXML/jackson-core/issues/919) is the library auditing its own `ThreadLocal`-based buffer pool; the maintainers then tried switching the *default* pool to a lock-free concurrent implementation (2.17.0), **reverted that default in 2.17.1** after production regressions, and deprecated the lock-free pool entirely in 2.18.0. The naive "swap ThreadLocal for a concurrent pool" fix is not safe as a blanket default even for the library that owns the problem.
- `HikariCP` is independent corroborating evidence outside the exemplar corpus: two PRs proposing to replace internal `synchronized` with `ReentrantLock` for virtual-thread friendliness were both closed unmerged (2023, 2024), and a maintainer response on the open "Loom friendly" issue confirms a real production case of the JEP-491-unfixed class-initializer pinning case on JDK 24.

## Findings

### 1. Virtual threads: the two absolutes (JEP 444)

JEP 444 shipped virtual threads as final in **JDK 21** (Status: Closed/Delivered, Release 21). Two sentences are load-bearing and unconditional — they do not soften with JDK version:

> "Virtual threads are cheap and plentiful, and thus should never be pooled: A new virtual thread should be created for every application task." [[JEP 444 §Summary]](https://openjdk.org/jeps/444)

> "Virtual threads should never be pooled since each is intended to run only a single task over its lifetime." [[JEP 444 §Using virtual threads]](https://openjdk.org/jeps/444)

The JEP is explicit about *why* people reach for pooling anyway, and names the correct replacement:

> "Developers sometimes use thread pools to limit concurrent access to limited resources... do not be tempted to pool virtual threads in order to limit concurrency. Instead use constructs specifically designed for that purpose, such as semaphores." [[JEP 444 §Do not pool virtual threads]](https://openjdk.org/jeps/444)

```java
// WRONG — pools virtual threads to throttle a downstream call
ExecutorService pool = Executors.newFixedThreadPool(
    20, Thread.ofVirtual().factory());

// RIGHT — unbounded virtual-thread creation, bounded by a semaphore
// sized to the actual downstream ceiling (see §7)
Semaphore permits = new Semaphore(20);
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (var task : tasks) {
        executor.submit(() -> {
            permits.acquire();
            try { return call(task); } finally { permits.release(); }
        });
    }
}
```

The JEP also documents that virtual threads carry `ThreadLocal`/`InheritableThreadLocal` for compatibility but warns against using them to pool costly resources across tasks sharing a thread — directly relevant to §8. [[JEP 444 §Thread-local variables]](https://openjdk.org/jeps/444)

### 2. Pinning before and after JDK 24 (JEP 444 → JEP 491)

JEP 444 (JDK 21) documents two pinning scenarios: executing inside `synchronized` blocks/methods, and running native code (native methods or FFM calls). Pinning is not incorrectness, only a scalability hazard: "Pinning does not make an application incorrect, but it might hinder its scalability... Frequent pinning for long durations can harm the scalability of an application by capturing carriers." Its own guidance for JDK 21-23 was to migrate hot, I/O-guarding `synchronized` sections to `java.util.concurrent.locks.ReentrantLock`. [[JEP 444 §Pinning]](https://openjdk.org/jeps/444)

**JEP 491, delivered in JDK 24**, closed the monitor half of that problem:

> "Virtual threads can acquire, hold, and release monitors, independently of their carriers." [[JEP 491 §Description]](https://openjdk.org/jeps/491)

When a virtual thread blocks acquiring a monitor or in `Object.wait()`, it now unmounts and frees its carrier, exactly like blocking I/O already did.

What JEP 491 explicitly did **not** fix — quoted directly from its own "Future Work" section:

> "There are a few remaining cases, unrelated to the `synchronized` keyword, in which a virtual thread cannot unmount when blocking: When resolving a symbolic reference (JVMS §5.4.3) to a class or interface and the virtual thread blocks while loading a class... When blocking inside a class initializer... When waiting for a class to be initialized by another thread (JVMS §5.5)." [[JEP 491 §Future Work]](https://openjdk.org/jeps/491)

All three pin because the carrier holds a native frame on the stack (the first two) or because the virtual thread blocks inside the JVM itself (the third). Native-code pinning (native methods, FFM callbacks into blocking Java) is unrelated to JEP 491 and remains, unchanged from JEP 444.

**The floor-dependent rule JEP 491 itself states**, after the fix:

> "Once the `synchronized` keyword no longer pins virtual threads, you can choose between `synchronized` and the APIs in the `java.util.concurrent.locks` package based solely upon which best solves the problem at hand... If you are writing new code, we agree with the recommendation in Java Concurrency in Practice §13.4: Use `synchronized` where practical, since it is more convenient and less error prone, and use `ReentrantLock` and the other APIs in `java.util.concurrent.locks` when more flexibility is required... You need not revert code that has been migrated to use `ReentrantLock` back to using `synchronized`." [[JEP 491 §Choosing between synchronized and java.util.concurrent.locks]](https://openjdk.org/jeps/491)

```java
// Floor = JDK 17 or 21 (pre-491): synchronized still pins.
// A hot method that blocks on I/O while holding the lock MUST use ReentrantLock.
private final ReentrantLock lock = new ReentrantLock();
void put(Item item) {
    lock.lock();
    try { channel.write(item); }   // blocking I/O held under the lock
    finally { lock.unlock(); }
}

// Floor = JDK 24+: synchronized no longer pins. Default to it; reach for
// ReentrantLock only for its extra capabilities (tryLock, fairness,
// interruptible/timed acquisition, Condition, read-write splitting).
synchronized void put(Item item) throws IOException {
    channel.write(item);
}
```

### 3. The pinning detector: tracePinnedThreads removed, JFR remains

JEP 444 introduced `-Djdk.tracePinnedThreads=full|short` as the original diagnostic. JEP 491 removed it in JDK 24:

> "This system property will no longer be needed once the `synchronized` keyword no longer pins virtual threads. It has, in addition, proved to be problematic since the stack traces are printed while executing critical code. We will therefore remove this system property; setting it on the command line will have no effect." [[JEP 491 §The system property jdk.tracePinnedThreads is no longer needed]](https://openjdk.org/jeps/491)

The surviving, JDK-24-and-later detector is the JFR event, retained and *enhanced*:

> "This JFR event will no longer be needed for that purpose once the `synchronized` keyword no longer pins virtual threads, but we will retain it for other pinning situations... We will therefore change the JVM to issue a `jdk.VirtualThreadPinned` event in these cases, and we will enhance the event itself to convey both the reason why the virtual thread is pinned and the identity of the carrier thread." [[JEP 491 §Diagnosing pinning]](https://openjdk.org/jeps/491)

JEP 444 documents the event's default configuration: "This event is enabled by default, with a threshold of 20ms." [[JEP 444 §JDK Flight Recorder]](https://openjdk.org/jeps/444)

```bash
# JDK 24+ — the only working diagnostic path
java -XX:StartFlightRecording=filename=vt.jfr,settings=profile MyApp
jfr print --events jdk.VirtualThreadPinned vt.jfr

# NOT this — silently does nothing on JDK 24+
java -Djdk.tracePinnedThreads=full MyApp
```

### 4. ScopedValue's finalised shape (JEP 506)

`ScopedValue` finalised in **JDK 25** (JEP 506, Status: Closed/Delivered, Release 25), after previewing through JEP 429/446/464/481/487 across JDK 20-24. The finalisation carried exactly one behavioural change:

> "We here propose to finalize the scoped values API in JDK 25, with one small change: The `ScopedValue.orElse` method no longer accepts `null` as its argument." [[JEP 506 §Summary]](https://openjdk.org/jeps/506)

`ScopedValue` lives in `java.lang` (not `java.util.concurrent`). Its shape: `get()` (throws `NoSuchElementException` if unbound), `isBound()`, `where(key, value).run(...)`/`.call(...)` to bind for a block's execution, and `orElse(other)` for a fallback. The class carries a blanket contract — "passing a `null` argument to a method in this class will cause a `NullPointerException` to be thrown" — so `orElse(null)` is not a compile error, it is a **runtime `NullPointerException`**. [[ScopedValue javadoc]](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html)

```java
static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();

// JDK 21-24 preview: compiled and ran.
// JDK 25+: throws NullPointerException at the orElse call.
String id = REQUEST_ID.orElse(null);

// Correct on every JDK
String id = REQUEST_ID.orElse("unknown");
```

Unlike `ThreadLocal`, a `ScopedValue` binding is immutable for the dynamic scope of `run`/`call`, flows one-way from caller to callees (including forked subtasks, which inherit bindings — see §5), and has no `set()` — it is designed specifically to pair with virtual threads and structured concurrency rather than with long-lived pooled threads.

### 5. StructuredTaskScope: the full changelog across four previews

`StructuredTaskScope` incubated in JDK 19/20 (JEP 428/437) and has been a preview feature since **JDK 21 (JEP 453)**, where `fork()` was already returning `Subtask<T>`, not `Future<T>` — this is not a recent change. [[JEP 525 §History]](https://openjdk.org/jeps/525)

| JDK | JEP | Preview # | What changed |
|---|---|---|---|
| 21 | 453 | 1st | `fork()` returns `Subtask<T>`, not `Future<T>` |
| 22 | 462 | 2nd | re-preview, no headline API change |
| 23 | 480 | 3rd | re-preview, no headline API change |
| 24 | 499 | 4th | re-preview, no headline API change |
| 25 | 505 | 5th | Public constructors (`ShutdownOnFailure`, `ShutdownOnSuccess`) replaced by static factories `open()` / `open(Joiner)` |
| 26 | 525 | 6th (current stable, 2026-03-17) | `Joiner.onTimeout()` added; `allSuccessfulOrThrow()` now returns `List<T>` (was a stream of subtasks); `anySuccessfulResultOrThrow()` renamed `anySuccessfulOrThrow()`; the config lambda parameter is now `UnaryOperator<Configuration>` (was `Function`) |
| 27 | 533 | 7th (RC, GA fixed 2026-09-15, not yet shipped as of 2026-09-12) | Third type parameter `R_X extends Throwable` on `StructuredTaskScope<T,R,R_X>` and `Joiner<T,R,R_X>`; `Joiner.awaitAll()` **removed**; `onTimeout()` replaced by `timeout()`, whose thrown exception carries `CancelledByTimeoutException` as its cause; `allSuccessfulOrThrow()`/`anySuccessfulOrThrow()`/`awaitAllSuccessfulOrThrow()` gain overloads taking a `Function` to produce a custom exception type |

[[JEP 525]](https://openjdk.org/jeps/525), [[JEP 533]](https://openjdk.org/jeps/533)

The JDK 26 (JEP 525) shape:

```java
public sealed interface StructuredTaskScope<T, R> extends AutoCloseable {
    static <T> StructuredTaskScope<T, Void> open();
    static <T, R> StructuredTaskScope<T, R> open(Joiner<? super T, ? extends R> joiner);
    <U extends T> Subtask<U> fork(Callable<? extends U> task);
    Subtask<? extends T> fork(Runnable task);
    R join() throws InterruptedException;
    void close();
}

public interface Joiner<T, R> {
    default boolean onFork(Subtask<T> subtask);
    default boolean onComplete(Subtask<T> subtask);
    void onTimeout();                 // new in JEP 525 (JDK 26)
    R result() throws Throwable;
}
```
[[JEP 525 §Joiners]](https://openjdk.org/jeps/525)

Built-in `Joiner` factories, JDK 26 shape: `allSuccessfulOrThrow()` → `List<T>`, all must succeed; `anySuccessfulOrThrow()` → first successful `T`, cancels the rest ("race"); `awaitAll()` → wait for every subtask regardless of outcome; `awaitAllSuccessfulOrThrow()` → wait for all successes (the zero-arg `open()` default's semantics, made explicit); `allUntil(Predicate<Subtask<T>> isDone)` → cancel and return the subtask list once all succeed or the predicate fires on one. [[JEP 525 §Joiners]](https://openjdk.org/jeps/525)

The JDK 27 (JEP 533) shape, the newest preview as of this brief, not yet GA:

```java
public sealed interface StructuredTaskScope<T, R, R_X extends Throwable>
        extends AutoCloseable {
    static <T> StructuredTaskScope<T, Void, ExecutionException> open();
    static <T, R, R_X extends Throwable> StructuredTaskScope<T, R, R_X> open(
            Joiner<? super T, ? extends R, R_X> joiner);
    <U extends T> Subtask<U> fork(Callable<? extends U> task);
    Subtask<? extends T> fork(Runnable task);
    R join() throws R_X, InterruptedException;
    void close();
}
```
[[JEP 533]](https://openjdk.org/jeps/533)

> "The `onTimeout()` method of the `Joiner` interface has been replaced by the `timeout()` method, which either produces the result or throws an exception when the scope is cancelled by a timeout. If the `timeout()` method throws an exception then the exception is thrown with a `CancelledByTimeoutException` as the cause." [[JEP 533]](https://openjdk.org/jeps/533)

A timeout is set once, at `open()`, via the `Configuration` lambda, regardless of preview:

```java
try (var scope = StructuredTaskScope.open(
        Joiner.<T>allSuccessfulOrThrow(),
        cf -> cf.withTimeout(Duration.ofSeconds(5)))) {
    tasks.forEach(scope::fork);
    return scope.join();
}
```
[[JEP 525 §Cancelling a scope after a timeout]](https://openjdk.org/jeps/525)

Scoped values (§4) are inherited automatically by forked subtasks, and the API enforces structure at run time: forking from a thread other than the scope's owner fails, and misused nesting throws `StructureViolationException`. `StructuredTaskScope` deliberately does not implement `Executor`/`ExecutorService`. [[JEP 525 §Structured use is enforced]](https://openjdk.org/jeps/525)

### 6. Why preview bytecode cannot ship: the JEP 12 mechanism

This is the mechanical reason behind "not in shipped code while preview" (topic map conflict 15), one level deeper than "the API keeps changing." JEP 12 (Preview Features), which governs every preview JEP including 525/533, specifies how a preview dependency is recorded and enforced:

> "A class file denotes that it depends on the preview features of Java SE $N by having a `major_version` item that corresponds to Java SE $N and a `minor_version` item that has all 16 bits set." [[JEP 12 §Class file format]](https://openjdk.org/jeps/12)

> "...if preview features are not enabled at run time, a JVM implementation will not load a class file that depends on the preview features of any Java SE release." [[JEP 12 §Superstructure]](https://openjdk.org/jeps/12)

And critically, preview status is pinned to one exact feature release, not "preview in general":

> "The meaning of `--enable-preview` changes from one JDK to the next. Requiring the developer to spell out a concrete version number with `--release` sets the expectation that code which relies on the preview features of JDK $N is tied to that release, and may not compile on JDK $N+1." [[JEP 12 §Requiring --release]](https://openjdk.org/jeps/12) — JEP 12 gives the concrete example that `javac --release 17 --enable-preview Foo.java` run on a JDK 18 toolchain is **DISALLOWED**.

Consequence for a published library or SDK: a jar compiled with `--enable-preview` on JDK 26 is unusable by any consumer not running that exact JDK 26 feature release with `--enable-preview` also set at their runtime — it will not run on JDK 27 even with `--enable-preview` there, because JDK 27's preview is JEP 533's *different* shape. This is a harder constraint than API instability and is why the guard below is unconditional, not a style preference.

### 7. Bounding fan-out once the accidental throttle is gone

A platform-thread `ExecutorService` used to double as an accidental concurrency limiter: a pool of 20 platform threads could not fan out more than 20 concurrent downstream calls even if nobody meant to bound it that way. Virtual threads remove that side effect entirely — `newVirtualThreadPerTaskExecutor()` will happily start as many concurrent tasks as there are `submit()` calls, because it *is* one thread per task by design (§1).

The resources that still have a real ceiling, unaffected by how many virtual threads exist:

- **Connection pools** (JDBC via HikariCP, an HTTP client's connection pool) — a fixed `maximumPoolSize`; exceeding it means callers queue or fail, not that more concurrency exists.
- **Native libraries / JNI / FFM downcalls** — many are not internally thread-safe past some concurrency level, or serialize access via their own native lock.
- **Rate-limited external APIs** — a fixed requests-per-second budget that unbounded fan-out will exceed regardless of how cheap the calling thread was.
- File descriptors and OS-level limits (`ulimit -n`), and CPU-bound work, which virtual threads do not help with at all — a CPU-bound task still needs `ForkJoinPool`/parallel streams sized to core count, not virtual threads (this pairs with M-N-05, out of this brief's scope but adjacent).

The rule is: **bound at the resource, with a construct sized to that resource** — a `Semaphore(n)` where `n` is the pool's real capacity, or a `Joiner.allUntil(...)` that stops forking once a bounded number of results are needed — never by resurrecting a fixed-size thread pool of virtual threads (§1), and never left unbounded on the theory that "threads are now free."

### 8. Per-thread caching fights the model: jackson-core#919

`jackson-core`'s `BufferRecyclers`/`BufferRecycler` machinery caches parser/generator scratch buffers in a `ThreadLocal`, reused for the lifetime of the (platform) thread across many parse calls. Issue [#919](https://github.com/FasterXML/jackson-core/issues/919), opened by a Quarkus contributor investigating virtual-thread readiness, states the conflict directly:

> "The common usage scenario for virtual threads is to NOT cache them (as the Loom team advertise against it) and to be 'a lot' and short lived; meaning that Jackson will end up creating tons of useless garbage that won't be reused, defeating the purpose and benefit of pooling." [[jackson-core#919]](https://github.com/FasterXML/jackson-core/issues/919)

A `ThreadLocal` pool designed around "a small, stable number of long-lived threads" becomes, under "one new virtual thread per task, never pooled" (§1), a per-task allocation that is *never reused* — the exact opposite of what a pool is for.

The library's own subsequent history is the worked example for why the fix is not "just switch to a lock-free/concurrent pool":

| Version | Date | Change |
|---|---|---|
| 2.6.0 | 2015-07-17 | `JsonFactory.Feature.USE_THREAD_LOCAL_FOR_BUFFER_RECYCLING` added (default `true`), predating virtual threads entirely, as an opt-out escape hatch |
| 2.16.0 | 2023-11-15 | `BufferRecyclerPool` extension point added (#1089) — pluggable pool implementation |
| 2.17.0 | 2024-03-12 | Default pool changed from `threadLocalPool()` to `newLockFreePool()` (#1117) |
| 2.17.1 | 2024-05-04 | Default **reverted** back to `threadLocalPool()` (#1256): "Revert #1117... due to problems reported" |
| 2.18.0 | 2024-09-26 | `LockFreePool` **deprecated** for removal in 3.0 (#1271) |

[[jackson-core VERSION-2.x]](https://raw.githubusercontent.com/FasterXML/jackson-core/2.19/release-notes/VERSION-2.x), the library's own `JsonRecyclerPools` javadoc confirms the story in its source:

> "as of Jackson 2.18 this [default] is same as calling `threadLocalPool()`: Jackson 2.17.0 instead had this call `newLockFreePool()` but this was reverted due to problems reported." [[JsonRecyclerPools.java]](https://raw.githubusercontent.com/FasterXML/jackson-core/2.19/src/main/java/com/fasterxml/jackson/core/util/JsonRecyclerPools.java)

`JsonRecyclerPools` today exposes `threadLocalPool()` (default), `nonRecyclingPool()`, `sharedConcurrentDequePool()`/`newConcurrentDequePool()`, the deprecated `sharedLockFreePool()`/`newLockFreePool()`, and `sharedBoundedPool()`/`newBoundedPool(int)` — the library made the choice pluggable rather than picking one default that fits every workload.

The rule this yields: **auditing per-thread caching ahead of a virtual-thread migration is correct (`ThreadLocal` static fields are the grep target), but the replacement is not "always swap in a lock-free pool" — even the library that ships the extension point tried that as its default and had to revert it.** State the trade-off (a bounded or non-recycling pool trades peak throughput for predictable footprint under massive thread counts) rather than naming one universal replacement.

### 9. Dating every claim: what's true on 2026-09-12 vs. Tuesday

As of this brief's date, **JDK 26 is the current stable release** (GA 2026-03-17, per the frame's correction) and **JDK 27 is in the Release Candidate phase**, feature-frozen, with GA fixed for **2026-09-15**:

> "JDK 27 is in the Release Candidate phase. The overall feature set is frozen." Schedule: Rampdown Phase One 2026-06-04, Rampdown Phase Two 2026-07-16, Release Candidate 2026-08-06, **General Availability 2026-09-15**. [[JDK 27 project page]](https://openjdk.org/projects/jdk/27/)

So on 2026-09-12: `StructuredTaskScope`'s 6th preview (JEP 525, JDK 26) is what a project on the latest *shipped* JDK can enable with `--enable-preview`; its 7th preview (JEP 533) is already integrated into the JDK 27 mainline (JEP status "Closed/Delivered, Release 27" reflects integration, not GA) but not yet installable as a released JDK. **Any row in the published rule that names a JEP 533 method signature is describing JDK 27, which ships in three days — re-verify against the GA javadoc after 2026-09-15 rather than assuming the RC shape is final**, since a JEP's mainline integration has, in this exact feature's own history, still been followed by further preview iterations in every prior cycle.

## Normative guidance candidates

1. **Never pool virtual threads; never use a fixed-size `ExecutorService` of virtual threads to throttle concurrency.**
   Rationale: JEP 444's own unconditional rule; a pooled virtual thread defeats the one-thread-per-task design and the cost model it relies on.
   Verify: grep for `Executors.newFixedThreadPool(` or `new ThreadPoolExecutor(` combined with `Thread.ofVirtual()`/`Thread.ofVirtual().factory()` in the same file or constructor call; any hit is a violation. A clean `newVirtualThreadPerTaskExecutor()` call needs no such pairing.

2. **State the `synchronized`-vs-`ReentrantLock` rule conditionally on the project's minimum supported JDK, never as one unconditional sentence.**
   - Floor JDK 17 or 21: migrate `synchronized` blocks/methods that are hot **and** perform blocking I/O or long waits while holding the lock to `ReentrantLock`.
   - Floor JDK 24+: default to `synchronized` (JEP 491 quoting JCIP §13.4); reach for `ReentrantLock`/`java.util.concurrent.locks` only for capabilities `synchronized` cannot provide (`tryLock`, fairness, interruptible or timed acquisition, `Condition`, read-write splitting). Do not require reverting already-migrated code.
   Rationale: a single sentence is provably wrong for one side of the JDK-24 line; JEP 491 states both halves explicitly.
   Verify: read the project's declared JDK floor (`sourceCompatibility`/`languageVersion`/`--release`) before applying either half; a reviewer heuristic, not a context-free grep.

3. **`StructuredTaskScope`/`Joiner` MUST NOT appear in shipped (published, GA) code while the API is preview.**
   Rationale: preview status is not a maturity opinion — JEP 12's class-file mechanism means a jar compiled with `--enable-preview` cannot run on any JDK feature release other than the exact one that compiled it, with `--enable-preview` set again at the consumer's runtime; every preview iteration to date has also changed the API shape (§5).
   Verify: grep build files for `--enable-preview`/`enablePreview` in any `compilerArgs`/`sourceCompatibility` block that feeds the module's **main** sourceset (not a test-only or sample-only module); any hit on a published artifact's compile path is a violation. `micronaut-core`'s usage (test-only JVM arg, not main-sourceset compile) is the corpus's only precedent and does not count as a counter-example.

4. **Re-check candidate 3 when the JEP's own status field changes, not on a fixed calendar.**
   Rationale: structured concurrency's finalisation is currently targeted at JDK 28, one release past JDK 27's 7th preview (JEP 533); "currently preview" is a moving target that must be re-verified against the live JEP, not assumed stable from this document.
   Verify: fetch the current `StructuredTaskScope`/`Joiner` JEP page and read its `Status`/`Scope` header — `Scope: Implementation` (or an explicit "(Nth Preview)" in the title) means still preview; `Scope: SE` with no preview qualifier in the title means finalised.

5. **Prefer `ScopedValue` over `ThreadLocal` for one-way context carried into child/forked tasks; never pass a literal `null` to `orElse`.**
   Rationale: `ScopedValue` is immutable, scope-bound, and designed to compose with virtual threads and `StructuredTaskScope` inheritance; `orElse(null)` compiles but throws `NullPointerException` at runtime as of JDK 25's finalisation (JEP 506).
   Verify: grep for `.orElse(null)` on any `ScopedValue` receiver; Error Prone's `ThreadLocalUsage` check as the complementary signal for new `ThreadLocal` introductions in code paths that also use virtual threads.

6. **Do not rely on `jdk.tracePinnedThreads`; use the `jdk.VirtualThreadPinned` JFR event as the only pinning diagnostic on JDK 24+.**
   Rationale: the system property was removed in JDK 24 and "setting it on the command line will have no effect" — a silent no-op, not an error, so a script or CI job using it gives false confidence that no pinning occurred.
   Verify: grep scripts, Dockerfiles, and CI config for `-Djdk.tracePinnedThreads`; flag any hit on a JDK 24+ floor. Replace with `jfr print --events jdk.VirtualThreadPinned <recording>` or an equivalent JFR-consuming check.

7. **Bound fan-out at the real downstream resource's known capacity, never at "however many tasks exist."**
   Rationale: virtual threads remove the platform-thread pool's accidental throttle; the resources that still have limits (connection pools, native library concurrency, rate-limited APIs, file descriptors) do not scale with thread cheapness.
   Verify: for every unbounded `tasks.forEach(scope::fork)`/`executor.submit()` loop that calls into a pooled or rate-limited resource, confirm a `Semaphore`, bounded `Joiner`, or the resource's own admission control sits between the fan-out and the call; a reading heuristic (no single grep covers "is this bounded"), but a missing `Semaphore`/pool-size reference near an unbounded fan-out loop into a named pooled client is the smell to flag.

8. **Audit `ThreadLocal`-based per-thread caching before scaling code onto virtual threads; do not default to "replace with a lock-free pool."**
   Rationale: a `ThreadLocal` cache sized for "few, long-lived threads" becomes non-reusing garbage under "one thread per task, never pooled" (§1); but jackson-core's own attempt to make a lock-free pool the *default* replacement was reverted after production regressions (2.17.0 → 2.17.1), so the fix must be evaluated per workload, with a pluggable/bounded pool or a non-recycling pool as legitimate alternatives, not asserted as a universal swap.
   Verify: grep for `static final ThreadLocal<` or `ThreadLocal.withInitial(` guarding a reusable, non-trivial-to-construct object (buffers, formatters, parsers); for each hit, confirm the owning code path documents its chosen replacement strategy (pooled, non-recycling, or left as `ThreadLocal` with a stated rationale) rather than silently keeping the pre-Loom shape.

9. **Every rule row or code sample naming a concrete `StructuredTaskScope`/`Joiner` member MUST carry the JDK number it was verified against.**
   Rationale: `fork()`'s return type, the constructor-vs-factory split, `allSuccessfulOrThrow()`'s return type, and `onTimeout()`/`timeout()` have all changed at least once each across JDK 21-27; an undated code sample silently assumes one specific JDK.
   Verify: a reading heuristic — no `StructuredTaskScope`/`Joiner` code block or prose claim in published rule content lacks an explicit "(JDK N)"/"(Nth preview)" qualifier.

10. **`--enable-preview` is not a corpus norm; a rule recommending it for any purpose must say so explicitly.**
    Rationale: 1 of 32 exemplars uses it at all, and even there only as a test-runtime JVM argument, not a production compile flag — recommending it without that caveat implies a practice the ecosystem has not adopted.
    Verify: `git grep -l "enable-preview\|enablePreview"` across the fleet or an adopter's build files; a hit outside a clearly-named experimental/sample module is worth a second look, not an automatic pass.

## Exemplar evidence

- **`micronaut-projects__micronaut-core@d5842045bb:buildSrc/src/main/groovy/io.micronaut.build.internal.convention-base.gradle:36`** — `jvmArgs "--enable-preview"` inside a `tasks.withType(Test)` block; the sibling `tasks.withType(JavaCompile)` block in the same file (lines 44-49) carries no `--enable-preview` compiler arg. This is the corpus's only `--enable-preview` occurrence (1/32, confirmed by `git grep` across every checked-out repo's `*.gradle*`/`*.kts` files) and it is scoped to test execution, not the module's own compiled output — supporting candidate 3 and 10 exactly: the one corpus precedent for preview flags is not a main-sourceset compile flag.
- **No exemplar in the corpus contains source-level `StructuredTaskScope`, `Thread.ofVirtual()`, or `newVirtualThreadPerTaskExecutor()` usage** in the checked-out build/config files — expected, since the exemplar fetch is a blob-less, build-file-only sparse checkout ([jvm-frame.md §Exemplar corpus as fetched](../jvm-frame.md)); this dive's exemplar evidence for source-level virtual-thread/structured-concurrency practice therefore comes from named external repositories per the brief ("test against"), not the fleet's own 32.
- **`FasterXML/jackson-core` issue [#919](https://github.com/FasterXML/jackson-core/issues/919)** (opened by a Quarkus/virtual-thread contributor, closed 2023-11-23) and its own `JsonRecyclerPools.java` source javadoc — a flagship library both diagnosing the exact failure mode in candidate 8 and demonstrating, in its own shipped release history (2.16.0→2.18.0), that the "obvious" concurrent-pool fix regressed and was reverted. Confirms candidate 8's "not a universal swap" framing directly, from the tool's own repository rather than commentary about it.
- **`brettwooldridge/HikariCP`** PRs [#2027](https://github.com/brettwooldridge/HikariCP/pull/2027) (closed 2023-01-15, unmerged) and [#2055](https://github.com/brettwooldridge/HikariCP/pull/2055) (closed 2024-11-01, unmerged), both titled around replacing internal `synchronized` with `ReentrantLock` for virtual-thread friendliness — independent, outside-the-corpus corroboration that the pre-JEP-491 migration advice was live practitioner activity, and that maintainers were not uniformly adopting it even before JEP 491 shipped. A comment on the open issue [#1463](https://github.com/brettwooldridge/HikariCP/issues/1463) ("JDK 24 can still deadlock in `static` initializers of classes. There virtual threads pin their carrier threads so you could be hitting something like that.") is a real production report matching JEP 491's own documented "not fixed" class-initializer case (§2) — supports candidate 2's precision about what JDK 24 did and did not fix.
- Wave-1's own concurrency scouting (already covered, cited here rather than re-derived) recorded `jackson-core#919` and micronaut-core's preview-flag isolation as P0/M-N-01 and M-N-03 evidence in [`jvm-topic-map.md` rows M-N-01 through M-N-04](../jvm-topic-map.md); this dive fetched the primary JEPs directly rather than relying on that summary, per the brief.

## AI-agent angle

- **Recommending a fixed-size virtual-thread pool "to limit concurrency."** A model trained on platform-thread idioms reaches for `Executors.newFixedThreadPool(n, Thread.ofVirtual().factory())` because that pattern is correct for platform threads and looks identical for virtual ones. It compiles and runs, but defeats the entire design (§1). Smallest check: grep for `Thread.ofVirtual()`/`ofVirtual().factory()` appearing anywhere near `newFixedThreadPool`/`ThreadPoolExecutor` construction.
- **Citing `-Djdk.tracePinnedThreads` as the pinning diagnostic.** Training data before JDK 24 uniformly recommends it; it is a silent no-op now. Smallest check: grep for the property name in any code, script, or generated troubleshooting doc; flag unconditionally on a JDK 24+ floor.
- **Writing `StructuredTaskScope` code with `new StructuredTaskScope.ShutdownOnFailure()`/`.ShutdownOnSuccess()`.** These were the pre-JEP-505 (JDK 21-24) public-constructor shape; on JDK 25+ the constructors are gone in favour of `open()`/`open(Joiner)`. A model with an older training cutoff, or one that has seen more JDK-21-era blog posts than the current javadoc, reproduces the removed constructors confidently. Smallest check: grep for `new StructuredTaskScope.ShutdownOn` — any hit targeting JDK 25+ does not compile.
- **Assuming `ScopedValue.orElse(null)` is safe** because it compiled during preview. It compiles on every version (the parameter type is generic and accepts `null` syntactically) but throws `NullPointerException` at runtime since JDK 25's finalisation. Smallest check: grep for `.orElse(null)` on a `ScopedValue`.
- **Treating a single, unconditional `synchronized → ReentrantLock` migration rule as always correct**, because most training material predates JEP 491 or does not carry the JDK 24 caveat. Smallest check: any generated migration advice or lint suggestion that recommends `ReentrantLock` "to avoid pinning virtual threads" without naming a JDK floor is incomplete; require the floor to be stated.
- **Emitting `Joiner::allSuccessfulOrThrow()` code expecting a `Stream<Subtask<T>>`** (the pre-JDK-26/JEP-525 return shape) when the target is JDK 26+, where it returns `List<T>` directly. Smallest check: if generated code calls `.stream()` or iterates `Subtask` objects on the result of `allSuccessfulOrThrow()`, that code targets JDK ≤25 and will not compile on 26+.
- **Hallucinating `onTimeout()` on JDK 27+ code**, since it was renamed `timeout()` in JEP 533 and the model's most recent seen example may be JDK 26 (JEP 525). Smallest check: grep any JDK-27-targeted `Joiner` implementation for `onTimeout(` — it should not compile against JEP 533's shape (though it remains a valid default method name inherited if unimplemented, so the check is "is this the method meant to be overridden for custom timeout behaviour" — verify against the target JDK's actual `Joiner` interface, not by name match alone).

## Contested / evolving

- **Whether residual pinning exists beyond JEP 491's three documented cases.** Secondary practitioner reporting (InfoQ, 2026) states "residual pinning persists around native frames, class loading, and local file I/O on Linux" post-JDK 24 — the first two match JEP 491's own text exactly; the file-I/O claim is not in JEP 444 or 491 and is not independently confirmed here. Treat it as an open practitioner report, not a JEP-documented fact, until a primary source names it. [[InfoQ, 2026]](https://www.infoq.com/articles/virtual-threads-after-jdk24/)
- **Whether connection-pool libraries should proactively migrate off `synchronized`.** HikariCP's maintainer has left two virtual-thread-motivated `ReentrantLock` migration PRs unmerged across 2023 and 2024, reportedly preferring to wait for JEP 491 rather than carry a parallel locking strategy — consistent with this dive's candidate 2 (JDK-24+ floor: default to `synchronized`), but it means adopters on a pre-24 floor using such libraries inherit whatever pinning behaviour the library's own maintainers chose not to change.
- **The default `RecyclerPool`/pooling strategy for virtual-thread-heavy workloads remains unsettled even inside one flagship library.** jackson-core tried and reverted a default change once (§8) and now exposes five pool strategies rather than picking a winner; the direction (as of 2026-09-12) is "make it pluggable and let the caller choose," not "here is the one correct virtual-thread-safe pool."
- **Structured concurrency's finalisation date.** JEP 525 (JDK 26) targets finalisation at JDK 28 per the topic map's wave-1 correction; JEP 533 (JDK 27, RC as of this writing) is itself still a preview, so the two-release-out estimate could move again — this document's JDK 27 API description should be re-verified once JDK 27 actually reaches GA on 2026-09-15.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [openjdk.org/jeps/444](https://openjdk.org/jeps/444) | JEP 444, Virtual Threads | Final, JDK 21 (2023) | The two absolutes ("never pooled", "one per task"), the original pinning description, and the semaphore recommendation, in the feature owners' own words |
| [openjdk.org/jeps/491](https://openjdk.org/jeps/491) | JEP 491, Synchronize Virtual Threads without Pinning | Final, JDK 24 (2025) | Exact scope of the JDK 24 pinning fix, the three unfixed cases, the `tracePinnedThreads` removal, and the JCIP-quoting `synchronized`-vs-`ReentrantLock` guidance for JDK 24+ |
| [openjdk.org/jeps/506](https://openjdk.org/jeps/506) | JEP 506, Scoped Values | Final, JDK 25 (2025) | The one behavioural change at finalisation (`orElse` rejects `null`) and `ScopedValue`'s design rationale versus `ThreadLocal` |
| [openjdk.org/jeps/525](https://openjdk.org/jeps/525) | JEP 525, Structured Concurrency (Sixth Preview) | Preview, JDK 26 (2026-03, current stable as of this brief) | The full JDK-26 `StructuredTaskScope`/`Joiner` API shape, the preview history back to JDK 19, and the JDK-25→26 changelog |
| [openjdk.org/jeps/533](https://openjdk.org/jeps/533) | JEP 533, Structured Concurrency (Seventh Preview) | Preview, JDK 27 (RC, GA 2026-09-15, not shipped as of 2026-09-12) | The newest API shape (`R_X` type parameter, `timeout()`, `awaitAll()` removal) — the row every future rule update must re-check against GA |
| [openjdk.org/jeps/12](https://openjdk.org/jeps/12) | JEP 12, Preview Features | Process JEP, governs all preview JEPs | The class-file/`--enable-preview` mechanism that makes "not in shipped code while preview" a hard technical constraint, not a style preference |
| [openjdk.org/projects/jdk/27/](https://openjdk.org/projects/jdk/27/) | JDK 27 project schedule page | Live status page, checked 2026-09-12 | Confirms JDK 27 is RC, feature-frozen, GA fixed 2026-09-15 — the fact this brief's every JDK-27 claim is dated against |
| [StructuredTaskScope javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html) | Official JDK 25 API docs | JDK 25 (5th preview shape) | Confirms the sealed-interface declaration, preview-API banner, and nested-type list as shipped, not just as proposed |
| [ScopedValue javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html) | Official JDK 25 API docs | Final, JDK 25 | The blanket null-argument contract that makes `orElse(null)` an `NullPointerException`, not a compile error |
| [jcip.net/contents.html](http://jcip.net/contents.html) | Java Concurrency in Practice, table of contents | Pre-Loom (2006), still the baseline JEP 491 itself cites | The §13.4 recommendation ("use `synchronized` where practical... `ReentrantLock`... when more flexibility is required") that JEP 491 quotes verbatim as its post-JDK-24 guidance |
| [jackson-core issue #919](https://github.com/FasterXML/jackson-core/issues/919) | GitHub issue, FasterXML/jackson-core | Opened 2023-02, closed 2023-11-23 | The flagship library's own audit of `ThreadLocal`-based buffer pooling against virtual threads — this dive's worked example |
| [jackson-core VERSION-2.x release notes](https://raw.githubusercontent.com/FasterXML/jackson-core/2.19/release-notes/VERSION-2.x) | Project's own changelog | 2015-2026 (2.6.0 → 2.19) | Dates the `USE_THREAD_LOCAL_FOR_BUFFER_RECYCLING` flag, the pluggable-pool addition, and the tried-and-reverted lock-free default |
| [JsonRecyclerPools.java](https://raw.githubusercontent.com/FasterXML/jackson-core/2.19/src/main/java/com/fasterxml/jackson/core/util/JsonRecyclerPools.java) | Source file, FasterXML/jackson-core | 2.19 branch, `@since 2.16` | The library's own javadoc admitting the 2.17.0→2.17.1 default revert, and the full list of pool strategies offered instead of one winner |
| `micronaut-projects/micronaut-core@d5842045bb` | Exemplar corpus repository (this program's audit) | Measured 2026-09-05 | The corpus's sole `--enable-preview` user, and confirmation it is test-runtime-only, not a production compile flag |
| [HikariCP PR #2027](https://github.com/brettwooldridge/HikariCP/pull/2027) / [#2055](https://github.com/brettwooldridge/HikariCP/pull/2055) / [issue #1463](https://github.com/brettwooldridge/HikariCP/issues/1463) | GitHub PRs/issue, brettwooldridge/HikariCP | 2023-2026, ongoing | Independent, outside-corpus evidence of unmerged pre-JEP-491 migration attempts and a live JDK-24 class-initializer pinning report |
| [InfoQ: Virtual Threads after JDK 24](https://www.infoq.com/articles/virtual-threads-after-jdk24/) | Practitioner article | 2026 | Secondary corroboration of the HikariCP maintainer's stated preference to wait for JEP 491, and a residual-pinning claim flagged as unconfirmed in Contested/evolving |

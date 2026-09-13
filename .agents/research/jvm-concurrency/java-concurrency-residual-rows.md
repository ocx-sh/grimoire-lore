---
title: Java concurrency — the seven residual JAVA-CONC rows (M-N-05…11)
topic: jvm-concurrency
agent: java-concurrency-residual-rows
model: sonnet
date_researched: 2026-09-12
sources_count: 19
scope: >
  Adjudicates the seven JAVA-CONC map rows (M-N-05…M-N-11) left unresearched
  after wave 3: which earn a new rule row in `jvm-concurrency.md`, which are
  `JAVA-LINT` configuration (Error Prone severity/SpotBugs-scope lines), which
  are prose with no ID, and which drop entirely. Reads
  `BuiltInCheckerSuppliers.java` directly (frame correction 30) to settle the
  ENABLED_ERRORS/ENABLED_WARNINGS/DISABLED_CHECKS axis for each row, not the
  docs-site `severity` field. Does not touch `M-N-06`'s `close()`-blocks
  finding (already `JAVA-ERR-05`) or the VT-admission-control rows
  (`JAVA-CONC-01/02`, already covered) beyond citing them.
---

## Contents

- [Summary](#summary)
- [Findings](#findings)
  1. [M-N-05 — CPU-bound vs. I/O-bound: the pool-choice fork](#1-m-n-05--cpu-bound-vs-io-bound-the-pool-choice-fork)
  2. [M-N-06 — ExecutorService shutdown and pool sizing: mostly already owned](#2-m-n-06--executorservice-shutdown-and-pool-sizing-mostly-already-owned)
  3. [M-N-07 — CompletableFuture chains with no terminal handler](#3-m-n-07--completablefuture-chains-with-no-terminal-handler)
  4. [M-N-08 — Double-checked locking on a non-volatile field](#4-m-n-08--double-checked-locking-on-a-non-volatile-field)
  5. [M-N-09 — SimpleDateFormat in a shared static](#5-m-n-09--simpledateformat-in-a-shared-static)
  6. [M-N-10 — @GuardedBy/@Immutable/@ThreadSafe documentation](#6-m-n-10--guardedbyimmutablethreadsafe-documentation)
  7. [M-N-11 — ReentrantReadWriteLock's 65,535-hold ceiling](#7-m-n-11--reentrantreadwritelocks-65535-hold-ceiling)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Of the seven rows, **three earn a new `JAVA-CONC` rule** (M-N-05+06's sizing
  half merged into one, M-N-10, M-N-11); **three are `JAVA-LINT` severity-bump
  config**, no new rule (M-N-07, M-N-08, M-N-09); **one drops as fully
  subsumed** (M-N-06's shutdown half, already `JAVA-ERR-05`).
- **`GuardedByChecker` is `ENABLED_ERRORS`** — fully on, zero config, blocks
  the build the moment an `@GuardedBy` annotation exists (`BuiltInCheckerSuppliers.java:790`). The gap isn't enforcement, it's that nothing makes an
  agent *write* the annotation in the first place — that's the M-N-10 rule.
- **`DoubleCheckedLocking`, `DateFormatConstant`, `FutureReturnValueIgnored`
  are all `ENABLED_WARNINGS`**, not `DISABLED_CHECKS` (lines 982, 972, 1015) —
  they already run at `WARNING` by default. "Turning them on" is a **severity
  bump to `ERROR`**, the same shape frame correction 30 already established
  for `StringCaseLocaleUsage`, not an activation from off.
- **`@ThreadSafe`'s own javadoc overclaims.** `com.google.errorprone.annotations.ThreadSafe`'s javadoc says it's "validated by … `ThreadSafeChecker`" —
  but `ThreadSafeChecker` is never imported into `BuiltInCheckerSuppliers.java`
  (0 matches for `ThreadSafe\b`, vs. 8 sibling `threadsafety.*` imports that
  are all wired). The checker class exists in source; it ships in none of the
  three built-in sets. `@ThreadSafe` is pure documentation in practice.
- **`@GuardedBy`'s checker recognizes five packages, and `net.jcip.annotations`
  is not one of them.** `GuardedByUtils.java` hard-codes `android.support.*`,
  `androidx.*`, `com.android.internal.*`, `com.google.errorprone.annotations.concurrent.GuardedBy`, and `javax.annotation.concurrent.GuardedBy`. The
  textbook package from *Java Concurrency in Practice* is silently ignored.
- **SpotBugs' `DC_DOUBLECHECK` is on by default too**, independently of Error
  Prone: `findbugs.xml`'s `FindDoubleCheck` detector carries no `disabled="true"` attribute (category `MT_CORRECTNESS`, CWE-609) — it fires the moment
  `JAVA-LINT-10` wires SpotBugs at all, no separate switch.
- **JEP 444 settles M-N-05 in its own text**, not by inference: *"The workload
  is not CPU-bound, since having many more threads than processor cores
  cannot improve throughput in that case."* Virtual threads are explicitly
  *not* a data-parallelism construct (Non-Goals). The two-branch rule is
  textual, not a preference.
- **The virtual-thread scheduler and the parallel-stream common pool are
  different pools, both fork-join, and JEP 444 says so directly**: the VT
  carrier pool is FIFO work-stealing; *"the common pool used by parallel
  streams … operates in LIFO mode."* Conflating them (e.g. assuming
  `-Djava.util.concurrent.ForkJoinPool.common.parallelism` tunes virtual-thread
  scheduling) is a distinct, citable mistake.
- **`CompletableFuture`'s own async default is the same common pool**: *"All
  async methods without an explicit Executor argument are performed using
  `ForkJoinPool.commonPool()`."* A blocking `.thenApplyAsync(fn)` with no
  executor argument starves the same shared pool `parallelStream()` does —
  one mistake, two call sites.
- **`ForkJoinPool.ManagedBlocker` is the sanctioned escape hatch** for a
  FJ-scheduled task that must block, expanding the pool's parallelism for the
  call's duration — cite it once, don't ask agents to avoid all blocking on a
  FJ pool unconditionally.
- **`ReentrantReadWriteLock`'s ceiling has a primary source that isn't a
  newsletter**: its own JDK 21 javadoc "Implementation Notes" section states
  *"This lock supports a maximum of 65535 recursive write locks and 65535
  read locks. Attempts to exceed these limits result in `Error` throws."*
  M-N-11 promotes on this citation; the newsletter is no longer the only
  source and doesn't need to be cited at all.
- **`StampedLock.asReadWriteLock()` is a view, and it costs real behavior**:
  no `Condition` support, not reentrant, and no lock ownership — converting
  to escape the 65,535 ceiling is not a drop-in swap.
- **`ErroneousThreadPoolConstructorChecker` (`ENABLED_WARNINGS`) catches one
  narrow, real pool-sizing bug**: an unbounded `workQueue` paired with
  `maximumPoolSize > corePoolSize` — the pool never grows past `corePoolSize`
  because the queue absorbs everything first. Cite it as a bonus lint fact,
  not the answer to M-N-05/06's real sizing question.
- **`FutureReturnValueIgnored`'s real target is the fire-and-forget statement**,
  not every unterminated chain: a `CompletableFuture` **returned to a caller**
  transfers exception-handling responsibility and is correct as-is (confirmed
  in the exemplar corpus); only a chain whose final stage is a bare, unassigned
  statement is the bug the check exists for.
- **M-N-06 splits three ways and none of the pieces is new**: `close()`'s
  unbounded block is `JAVA-ERR-05` (cited, not duplicated); virtual-thread
  admission control is `JAVA-CONC-01`/`-02` (cited, not duplicated); pool
  *sizing regime* is answered by the new M-N-05 rule below. Nothing is left
  to write a standalone M-N-06 rule about.
- **Exemplar corpus confirms the safe shapes exist in the wild**: guava's
  `MemoizingSupplier` (volatile-boolean-guarded DCL), guava's `Monitor`/`LocalCache` (`@GuardedBy` via the errorprone-recognized package), and
  micronaut-core's `AsyncInterceptor` (a `CompletableFuture` chain returned to
  the caller with no terminal handler — correct, not a violation).
- **Deliver 3 new rule rows, not 7**: this dive filters four of the seven map
  rows into existing config lines or drops them as subsumed, per
  rule-distillation's instruction not to duplicate what a linter already
  denies.

## Findings

### 1. M-N-05 — CPU-bound vs. I/O-bound: the pool-choice fork

JEP 444 states the boundary condition itself, not as a stylistic preference:
throughput from virtual threads requires *"the number of concurrent tasks is
high (more than a few thousand)"* **and** *"the workload is not CPU-bound,
since having many more threads than processor cores cannot improve throughput
in that case."* The JEP's own Non-Goals list is explicit that this is not an
oversight: *"It is not a goal to offer a new data parallelism construct in
either the Java language or the Java libraries"* — virtual threads solve
concurrency (many waiting tasks), not parallelism (many simultaneously
computing tasks) ([JEP 444](https://openjdk.org/jeps/444)).

The two regimes use genuinely different pools, and JEP 444 names both:
virtual threads are scheduled on a work-stealing `ForkJoinPool` running in
**FIFO** mode; *"the common pool used by parallel streams … operates in
**LIFO** mode"* ([JEP 444](https://openjdk.org/jeps/444) §Scheduling). These
are not the same pool, and tuning one's parallelism
(`-Djava.util.concurrent.ForkJoinPool.common.parallelism`) has no effect on
the other's carrier-thread count.

`ForkJoinPool.commonPool()`'s own javadoc scopes it explicitly for CPU-bound,
non-blocking work: parallelism defaults to `Runtime.availableProcessors()`,
and `ForkJoinTask`'s javadoc (referenced from the same page) states *"tasks
should not normally entail blocking operations. But if they do, they must
abort them on interrupt."* For a task that genuinely must block on the common
pool, the sanctioned mechanism is `ForkJoinPool.ManagedBlocker`: *"If running
in a ForkJoinPool, the pool may first be expanded to ensure sufficient
parallelism available during the call to `blocker.block()`"* ([ForkJoinPool
javadoc, JDK 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ForkJoinPool.html)).

`CompletableFuture`'s async methods share this exact same pool by default:
*"All async methods without an explicit Executor argument are performed using
`ForkJoinPool.commonPool()`"* ([CompletableFuture javadoc, JDK 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html)). A blocking `.thenApplyAsync(fn)` with
no executor is the same starvation bug as a blocking `.parallelStream()`
callback, at a second call site — the `jvm-concurrency/process-and-cli-boundary.md` dive already found this for `Process.onExit()`
([process](../jvm-concurrency/process-and-cli-boundary.md) §4).

There is one narrow, mechanically-caught pool-**sizing** bug adjacent to this
decision, not a substitute for it: Error Prone's `ErroneousThreadPoolConstructorChecker` (`ENABLED_WARNINGS`,
`BuiltInCheckerSuppliers.java:997`) flags a `ThreadPoolExecutor` built with an
unbounded `workQueue` and `maximumPoolSize > corePoolSize` — *"the pool size
will never go beyond `corePoolSize`"* because the queue absorbs every task
before the executor ever tries to grow ([errorprone.info/bugpattern/ErroneousThreadPoolConstructorChecker](https://errorprone.info/bugpattern/ErroneousThreadPoolConstructorChecker)). This catches a config typo; it does not
tell an agent which regime a given pool belongs to.

### 2. M-N-06 — ExecutorService shutdown and pool sizing: mostly already owned

The map row bundles two independent things, and both already have a home:

- **Shutdown on every exit path and `close()`'s unbounded block** is
  `JAVA-ERR-05` verbatim: *"Shut down every `ExecutorService` on every exit
  path… `close()` … blocks indefinitely — there is no timeout parameter"*
  ([java-runtime-safety](../jvm-java-runtime-safety.md) — JAVA-ERR-05). That
  rule's own text explicitly carves out *"Pool sizing, virtual-thread-per-task
  semantics and `ForkJoinPool` regime are `JAVA-CONC`'s M-N-05/06, not this
  rule"* — so this dive must not restate it, only cite it.
- **`newVirtualThreadPerTaskExecutor()`'s admission control** — never size a
  fixed pool of virtual threads, bound fan-out with a `Semaphore` instead —
  is `JAVA-CONC-01` and `-02`, already landed in wave 3
  ([concurrency](../jvm-concurrency.md) JAVA-CONC-01/02).
- **Pool *sizing regime*** — when a pool should exist at all, and how big —
  is exactly M-N-05's CPU/I-O fork above.

Nothing is left over for a standalone M-N-06 rule; it is fully covered by
citation to three existing rules, one of them new in this dive.

### 3. M-N-07 — CompletableFuture chains with no terminal handler

Error Prone's `FutureReturnValueIgnored` is `ENABLED_WARNINGS`
(`BuiltInCheckerSuppliers.java:1015`), summary: *"Return value of methods
returning Future must be checked. Ignoring returned Futures suppresses
exceptions thrown from the code that completes the Future"* ([source](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/bugpatterns/FutureReturnValueIgnored.java#L44)). Because
every `CompletableFuture` chaining method (`.thenApply`, `.thenAccept`,
`.thenCompose`, …) itself returns a `Future` subtype, a chain used as a bare
expression statement — `future.thenAccept(this::log);` with nothing capturing
the result — is exactly the shape this check flags. This is the common,
dangerous instance of the map row: a fire-and-forget async chain whose
eventual exception has no observer at all.

The check does **not** fire, and should not, when the final stage is
**returned** to a caller or assigned to a field: the value is not "ignored,"
responsibility for `.exceptionally`/`.handle`/`.whenComplete` (or `.join()`
turning the exception into a thrown one) transfers to whoever holds the
reference. The exemplar corpus confirms this exact, correct pattern in
production code (see [Exemplar evidence](#exemplar-evidence)). So the map
row's *"chains with no terminal handler"* framing is over-broad: the bug is
specifically an **unobserved, discarded** chain, which `FutureReturnValueIgnored` already covers at `WARNING`; the fix is a severity bump, not a
new reading-heuristic rule.

### 4. M-N-08 — Double-checked locking on a non-volatile field

Confirmed independently by two tools, both already on by default:

- Error Prone's `DoubleCheckedLocking` is `ENABLED_WARNINGS`
  (`BuiltInCheckerSuppliers.java:982`): *"Using double-checked locking on
  mutable objects in non-volatile fields is not thread-safe. If the field is
  not volatile, the compiler may re-order the code in the accessor"* — fix is
  `private volatile Bar bar;`, and the doc notes volatile is worth keeping
  even for immutable payloads because it is *"almost free on x86 and makes the
  code more obviously correct"* ([errorprone.info/bugpattern/DoubleCheckedLocking](https://errorprone.info/bugpattern/DoubleCheckedLocking)).
- SpotBugs' `DC_DOUBLECHECK` detector (`FindDoubleCheck`, category
  `MT_CORRECTNESS`, CWE-609) carries no `disabled="true"` attribute in the
  shipped `findbugs.xml` — it is enabled the moment SpotBugs runs at all
  ([findbugs.xml:438-439](https://github.com/spotbugs/spotbugs/blob/master/spotbugs/etc/findbugs.xml#L438-L439)).

Both are lint config, not a new rule: bump Error Prone's severity, and note
that `JAVA-LINT-10`'s SpotBugs scoping already gets this check for free
whenever it applies. A related, adjacent Error Prone check worth naming in
the same breath: `SynchronizeOnNonFinalField` (`ENABLED_WARNINGS`,
`BuiltInCheckerSuppliers.java:1184`) — synchronizing on a field whose
identity can change is a sibling DCL-class mistake, not identical to it.

### 5. M-N-09 — SimpleDateFormat in a shared static

`DateFormatConstant` is `ENABLED_WARNINGS` (`BuiltInCheckerSuppliers.java:972`): *"`DateFormat` is not thread-safe, and should not be used as a
constant field"* — the check specifically targets `static final` fields in
`CONSTANT_CASE`, because the Google Java Style Guide's naming rule requires
`CONSTANT_CASE` fields to be *"deeply immutable"* and a mutable, stateful
`DateFormat` violates that by construction ([errorprone.info/bugpattern/DateFormatConstant](https://errorprone.info/bugpattern/DateFormatConstant)). Same
shape as M-N-08: severity bump, not a new rule. In greenfield 2026 Java the
mechanical fix is also the modernization fix — `java.time.DateTimeFormatter`
is immutable and thread-safe by design, so promoting this check doubles as
nudging code off the legacy `java.text` API entirely.

### 6. M-N-10 — @GuardedBy/@Immutable/@ThreadSafe documentation

Three annotations, three different enforcement stories — this is the row
that most needs the `BuiltInCheckerSuppliers.java` read, because the docs
site gives no hint of the gap:

- **`@GuardedBy`**: `GuardedByChecker` is `ENABLED_ERRORS`
  (`BuiltInCheckerSuppliers.java:790`) — *"checks that fields or methods
  annotated with `@GuardedBy(lock)` are only accessed when the specified lock
  is held"* — fully on, zero configuration, blocks the build. But the checker
  only has anything to validate once the annotation exists; nothing forces an
  agent to write it. Critically, it recognizes exactly five packages
  (`GuardedByUtils.java:70-75`): `android.support.annotation.GuardedBy`,
  `androidx.annotation.GuardedBy`, `com.android.internal.annotations.GuardedBy`, `com.google.errorprone.annotations.concurrent.GuardedBy`, and
  `javax.annotation.concurrent.GuardedBy`. **`net.jcip.annotations.GuardedBy`
  — the package from *Java Concurrency in Practice*, and the one most LLM
  training data quotes — is not in that list.** An agent that imports it
  compiles clean and gets zero enforcement, silently.
- **`@Immutable`**: `com.google.errorprone.annotations.Immutable`'s
  `ImmutableChecker` is also `ENABLED_ERRORS` (`BuiltInCheckerSuppliers.java:794`) — equally free, equally on.
- **`@ThreadSafe`**: `com.google.errorprone.annotations.ThreadSafe` exists and
  its own javadoc claims *"the annotated class/interface … to be validated by
  the `com.google.errorprone.bugpatterns.threadsafety.ThreadSafeChecker`
  `BugChecker`"* ([source](https://github.com/google/error-prone/blob/master/annotations/src/main/java/com/google/errorprone/annotations/ThreadSafe.java)) — but `ThreadSafeChecker` is never imported into
  `BuiltInCheckerSuppliers.java` (`grep -n 'ThreadSafe\b'` on the fetched file:
  zero matches, versus every sibling `threadsafety.*` checker —
  `DoubleCheckedLocking`, `GuardedByChecker`, `ImmutableChecker`,
  `ImmutableAnnotationChecker`, `ImmutableEnumChecker`, `ImmutableRefactoring`,
  `StaticGuardedByInstance`, `SynchronizeOnNonFinalField`, `ThreadPriorityCheck` — all being imported). The annotation's own promise of
  mechanical validation does not ship. `@ThreadSafe` is prose-only in
  practice, whatever its javadoc says.

This is a documentation-convention gap two of the three annotations already
enforce for free (Effective Java Item 82 — *"How a class behaves when its
methods are used concurrently is … part of its contract with its clients …
[document it] with a carefully worded prose description or a thread safety
annotation"* ([summary](https://github.com/clxering/Effective-Java-3rd-edition-Chinese-English-bilingual/blob/dev/Chapter-11/Chapter-11-Item-82-Document-thread-safety.md))) — not a lint-config line, because no
flag turns "write the annotation" on. It earns its own rule.

### 7. M-N-11 — ReentrantReadWriteLock's 65,535-hold ceiling

The map's own citation concern is resolved: the JDK's own `ReentrantReadWriteLock` javadoc states the ceiling directly, under "Implementation
Notes," with no newsletter needed: *"This lock supports a maximum of 65535
recursive write locks and 65535 read locks. Attempts to exceed these limits
result in `Error` throws from locking methods"* ([ReentrantReadWriteLock
javadoc, JDK 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantReadWriteLock.html)). This is a
primary source (the lock's own specification), not the Kabutz newsletter the
topic map flagged as thin — **promote**, don't defer.

The practical trigger is virtual threads: before JEP 444, a platform-thread
pool self-limited well under 65,535 concurrent readers by cost of the threads
themselves; a virtual-thread-per-task workload can plausibly reach that count
under real fan-out, at which point every lock acquisition throws `Error`
(not an exception a normal `catch (Exception e)` even sees).

`StampedLock.asReadWriteLock()` is the JDK's own named escape valve — *"a
`ReadWriteLock` view of this `StampedLock`"* — but it is a view with real
lost behavior, not a drop-in replacement: the returned locks *"do not support
a `Condition`… throw `UnsupportedOperationException`"*; `StampedLock`s are
*"not reentrant, so locked bodies should not call other unknown methods that
may try to re-acquire locks"*; and *"StampedLocks have no notion of
ownership. Locks acquired in one thread can be released or converted in
another"* ([StampedLock javadoc, JDK 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/StampedLock.html)). Swapping the type without auditing for
`Condition` usage or reentrant call paths trades one failure mode for a
different, quieter one.

## Normative guidance candidates

New `JAVA-CONC` rule rows (continuing the family's existing `JAVA-CONC-01…14`
numbering from [jvm-concurrency.md](../jvm-concurrency.md); final IDs are the
consolidator's call):

1. **`JAVA-CONC-15` — Size a pool by its workload's regime, not by habit.**
   CPU-bound work (no blocking calls in the task body) stays on a pool sized
   to `Runtime.availableProcessors()` — the shared `ForkJoinPool.commonPool()`
   for ad-hoc fork/join work and `parallelStream()`, or an explicitly-sized
   `ForkJoinPool`/`ExecutorService` for a dedicated one. Blocking-style I/O
   (network calls, JDBC, file I/O, subprocess waits) goes one-virtual-thread-per-task via `Executors.newVirtualThreadPerTaskExecutor()` or a
   `StructuredTaskScope`, never onto a CPU-sized pool and never onto the
   common pool via a no-argument `…Async` call.
   **Rationale:** JEP 444 states the CPU-bound exclusion in its own text —
   *"having many more threads than processor cores cannot improve throughput
   in that case"* — and virtual threads are explicitly *"not … a new data
   parallelism construct."* `CompletableFuture`'s async default and
   `parallelStream()` share the same common pool; a blocking call on either
   starves unrelated JVM-wide work.
   **Verify:** `grep -rn 'parallelStream()\|ForkJoinPool.commonPool()' src/main/java`, then read each call site's lambda body for a blocking call
   (network/JDBC/`Thread.sleep`/subprocess `.waitFor()`) — any hit is the
   finding. Separately, `grep -rn '\.then\w*Async(' src/main/java` with a
   single-argument call (no trailing `Executor`) whose lambda blocks is the
   same finding. `grep -rn 'newVirtualThreadPerTaskExecutor\|StructuredTaskScope' src/main/java` used for CPU-bound work (a tight numeric loop, no I/O)
   is the inverse finding.
   **Severity:** MUST. **Floor:** JDK 21 (JEP 444); `ForkJoinPool`/parallel
   streams available since JDK 7/8, no floor cost.

2. **`JAVA-CONC-16` — Document shared mutable state with the checker-recognized annotation, not the JCIP one.** Annotate a field or method guarded
   by a lock with `@GuardedBy("lock")` from `com.google.errorprone.annotations.concurrent` or `javax.annotation.concurrent` — never
   `net.jcip.annotations.GuardedBy`, which compiles but is invisible to the
   checker. Annotate a genuinely immutable type with `com.google.errorprone.annotations.Immutable`. Treat `@ThreadSafe` (any package) as prose only — it
   has no working mechanical enforcement in the public Error Prone
   distribution, regardless of what its own javadoc claims.
   **Rationale:** `GuardedByChecker` and `ImmutableChecker` are both
   `ENABLED_ERRORS` — free, on-by-default enforcement the moment the
   annotation exists in a recognized package; the only missing piece is the
   convention of writing it, and picking the wrong (JCIP) package silently
   disables that enforcement. `ThreadSafeChecker` exists in source but ships
   in none of Error Prone's three built-in sets, so `@ThreadSafe` cannot be
   "turned on."
   **Verify:** `grep -rn 'import net.jcip.annotations.GuardedBy' src/main/java`
   — any hit is the finding (wrong package, silent no-op). `grep -rln '@GuardedBy\|@Immutable\|@ThreadSafe'` against a reading pass over every class
   with a shared mutable static or instance field with no annotation at all —
   the absence is the finding rule-distillation calls a "reading heuristic,"
   no grep proves it. Compilation itself is the enforcement for `@GuardedBy`/`@Immutable` once written — a build that fails on `GuardedByChecker`/`ImmutableChecker` is doing its job, not a bug to suppress.
   **Severity:** SHOULD (documentation convention); the annotation's own
   enforcement is MUST once written (already default-on, not this rule's to
   assert). **Floor:** none — annotations available since Error Prone's
   earliest releases.

3. **`JAVA-CONC-17` — Treat `ReentrantReadWriteLock`'s 65,535-hold ceiling as
   a real ceiling under virtual-thread fan-out, not a theoretical one.** For
   any read/write lock guarding a resource whose readers scale with
   concurrent virtual-thread tasks (not a fixed platform-thread pool), either
   bound the reader count with a `Semaphore` below 65,535, or use
   `StampedLock`'s optimistic-read path directly instead of its `asReadWriteLock()` view. If `asReadWriteLock()` is used as a drop-in, audit for
   `Condition` usage (throws `UnsupportedOperationException`) and reentrant
   re-acquisition (silently unsupported — `StampedLock` is not reentrant).
   **Rationale:** the lock's own javadoc: *"This lock supports a maximum of
   65535 recursive write locks and 65535 read locks. Attempts to exceed these
   limits result in `Error` throws."* A platform-thread pool self-limited
   below this by thread cost; a virtual-thread workload does not.
   **Verify:** `grep -rn 'ReentrantReadWriteLock' src/main/java`, then for
   each hit, a reading check — does the lock guard a resource whose reader
   count scales with `Thread.ofVirtual()`/`newVirtualThreadPerTaskExecutor()`
   fan-out rather than a bounded platform pool? If yes and no `Semaphore`
   bounds it, that is the finding. `grep -rn 'asReadWriteLock()' src/main/java` paired with `grep -n 'newCondition()'` in the same file — any
   co-occurrence is the finding (guaranteed `UnsupportedOperationException`
   at runtime, not compile time).
   **Severity:** SHOULD (no lint catches this; a reading heuristic, narrow but
   concrete). **Floor:** JDK 5 (`ReentrantReadWriteLock`); JDK 8
   (`StampedLock`); JDK 21 relevance trigger (virtual-thread fan-out).

`JAVA-LINT` additions (no new ID; lines for the consolidator to fold into
[jvm-quality-gates.md](../jvm-quality-gates.md)):

4. **Extend `JAVA-LINT-02`'s severity-bump list** (the `StringCaseLocaleUsage`
   precedent — already `ENABLED_WARNINGS`, needs a severity bump not an
   activation) with three more names: `DoubleCheckedLocking`,
   `DateFormatConstant`, `FutureReturnValueIgnored`. Exact switches:
   `-Xep:DoubleCheckedLocking:ERROR`, `-Xep:DateFormatConstant:ERROR`,
   `-Xep:FutureReturnValueIgnored:ERROR`.
   **Rationale:** all three are `ENABLED_WARNINGS` (`BuiltInCheckerSuppliers.java:982, 972, 1015`) — on by default at `WARNING`, invisible unless
   `-Werror` is set globally (which `JAVA-LINT-07` explicitly scopes away from
   `-Xlint:all`). A severity bump makes each one build-breaking without
   depending on an unrelated global flag.
   **Verify:** `grep -n '\-Xep:DoubleCheckedLocking:ERROR\|-Xep:DateFormatConstant:ERROR\|-Xep:FutureReturnValueIgnored:ERROR' <build file>` — absence with
   the check's default `WARNING` still printing in build logs is the finding.
   **Severity:** SHOULD.

5. **Add one sentence to `JAVA-LINT-10`'s SpotBugs residual clause**: `DC_DOUBLECHECK` (`MT_CORRECTNESS`, CWE-609) carries no `disabled="true"` in
   SpotBugs' shipped `findbugs.xml` — it runs automatically the moment
   `JAVA-LINT-10`'s untrusted-input scoping wires SpotBugs at all; no separate
   activation, no additional plugin.
   **Verify:** none needed beyond `JAVA-LINT-10`'s own SpotBugs-presence check;
   this is a fact about what that presence already buys, not a new gate.

Dropped or folded, not promoted (rule-distillation: don't duplicate a linter
that already denies the mistake):

- **M-N-06** (shutdown half → cite `JAVA-ERR-05`; admission-control half →
  cite `JAVA-CONC-01`/`-02`; sizing half → `JAVA-CONC-15` above). No
  standalone row.
- **M-N-08, M-N-09** fold entirely into the `JAVA-LINT-02` extension above —
  both checks are already on, both need only a severity bump, and both have
  a second independent detector (SpotBugs, for M-N-08 only) that needs no
  configuration at all.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| `JAVA-CONC-15` (CPU/IO pool regime) | `micronaut-projects__micronaut-core@d5842045bb:context/src/main/java/io/micronaut/context/python/PythonAsyncioRuntime.java` uses `CompletableFuture` for I/O-shaped async interop, not a fixed CPU pool. | No corpus violation found in the files sampled (targeted checks on kafka, guava, micronaut-core, grpc-java, spring-boot); a full-corpus `.parallelStream()`-with-blocking-body scan was out of this dive's budget. |
| Extended `JAVA-LINT-02` (`DoubleCheckedLocking` severity) | `google__guava@5fb424c43a:guava/src/com/google/common/base/Suppliers.java:126-147` — `MemoizingSupplier` uses `transient volatile boolean initialized` plus `synchronized (lock)`, the exact correct DCL shape the check exists to require. | None found in the files sampled; guava is the strict-exemplar pole for this family generally. |
| `JAVA-CONC-16` (`@GuardedBy`/`@Immutable` package) | `google__guava@5fb424c43a:guava/src/com/google/common/util/concurrent/Monitor.java:24,342` and `guava/src/com/google/common/cache/LocalCache.java:54,1908` both `import com.google.errorprone.annotations.concurrent.GuardedBy` — the checker-recognized package, used at scale (9+ call sites in `Monitor.java` alone). | No `net.jcip.annotations.GuardedBy` import found in the corpus files sampled; the mis-import risk is evidenced by the annotation's continued wide use elsewhere in the OSS ecosystem (`net.jcip.annotations.GuardedBy` is actively maintained as its own artifact — [stephenc/jcip-annotations](https://github.com/stephenc/jcip-annotations)), not inside this corpus. |
| M-N-07 / `FutureReturnValueIgnored` | `micronaut-projects__micronaut-core@d5842045bb:context/src/main/java/io/micronaut/scheduling/async/AsyncInterceptor.java:100-102` — `CompletableFuture.supplyAsync(...).thenCompose(Function.identity())` has no terminal `.exceptionally`/`.handle`, **and is correct**: the value is passed to `interceptedMethod.handleResult(...)` and returned, transferring responsibility to the caller. Confirms the map row's framing needs narrowing (finding 3). | Same file's `SYNCHRONOUS`/`void` branch (lines ~104-112) hand-rolls a `try { context.proceed(); } catch (Throwable e) { LOG.error(...) }` inside `executorService.submit(...)` — not `CompletableFuture` at all, but shows the alternative correct pattern (log inside the fire-and-forget task) when a real bare submission is unavoidable. |
| `JAVA-CONC-17` (`ReentrantReadWriteLock` ceiling) | `apache__kafka@940c100fab:core/src/main/java/kafka/server/share/SharePartition.java:93,393` constructs a `ReentrantReadWriteLock` guarding per-share-partition state — a plausible high-fan-out reader site (share-group consumer tracking), though exact concurrent reader counts were not independently measured. | `StampedLock` usage was not found in the files sampled; the corpus has not adopted it as a `ReentrantReadWriteLock` replacement in the paths checked. |

## AI-agent angle

- **Importing `net.jcip.annotations.GuardedBy` instead of the recognized
  packages.** This is the single highest-value catch in this dive: an LLM
  trained on *Java Concurrency in Practice* examples (the book that
  popularized `@GuardedBy`) reaches for `net.jcip.annotations`, which
  compiles, looks correct, and is invisible to `GuardedByChecker`. **Smallest
  check:** `grep -rn 'import net.jcip.annotations.GuardedBy'` — any hit is
  the finding, independent of whether the build even has Error Prone wired.
- **Believing `@ThreadSafe`'s own javadoc.** An agent that reads the
  annotation's javadoc (which explicitly claims `ThreadSafeChecker`
  validation) and reports "the linter enforces this" is wrong — the checker
  is not registered. **Smallest check:** there is none by grep; the fact is
  established by reading `BuiltInCheckerSuppliers.java`'s import list once,
  which is exactly what this dive did and what the frame's correction 30
  generalizes to every Error Prone claim in this program.
- **Assuming `-Xep:Name:WARN`/`ERROR` is "turning on" `DoubleCheckedLocking`,
  `DateFormatConstant`, or `FutureReturnValueIgnored`.** These already run at
  `WARNING`; the flag changes severity, and a model that writes "enable
  DoubleCheckedLocking" and stops there has not actually changed build
  behavior if the flag is missing, but also has not been told anything false
  if it says "already runs" — the risk is describing a severity bump as an
  activation and vice versa. **Smallest check:** `grep -n 'ENABLED_WARNINGS\|ENABLED_ERRORS\|DISABLED_CHECKS'` is not a grep on the codebase under
  review — it's the one-time read of `BuiltInCheckerSuppliers.java` that
  settles which of the two framings is correct for a given check name.
  Frame correction 30 exists precisely because an agent got this backwards
  for `StringCaseLocaleUsage`.
- **Porting `ExecutorService.shutdown()` + `awaitTermination(30, SECONDS)` +
  `shutdownNow()` to `try (var pool = Executors.newVirtualThreadPerTaskExecutor())` and assuming the timeout carried over.** It didn't —
  `close()` blocks indefinitely. This is `JAVA-ERR-05`'s finding, restated
  here only because M-N-06 surfaces it again from the concurrency angle:
  don't re-derive it, cite it.
- **Treating `ForkJoinPool.commonPool()` and the virtual-thread scheduler as
  the same tunable pool.** Both are `ForkJoinPool`s; JEP 444 documents them as
  operationally distinct (FIFO vs. LIFO, different purposes). An agent tuning
  `-Djava.util.concurrent.ForkJoinPool.common.parallelism` to "help" virtual
  threads is tuning the wrong knob. **Smallest check:** a reading heuristic —
  does the system property appear anywhere near virtual-thread-related code?
  If so, ask what it's actually meant to affect.
- **Writing a `CompletableFuture` chain as a bare statement with no terminal
  handler and no assignment**, the classic fire-and-forget shape LLMs produce
  when asked to "kick off an async task." **Smallest check:**
  `-Xep:FutureReturnValueIgnored:ERROR` catches exactly this at compile time,
  which is why it belongs on the severity-bump list rather than as a
  hand-written reading heuristic.

## Contested / evolving

- **Whether `@ThreadSafe` should be dropped from agent guidance entirely,
  given it has no working checker, or kept as pure documentation alongside
  `@GuardedBy`/`@Immutable`.** This dive keeps it (Effective Java Item 82
  treats "prose or annotation" as equally valid documentation, and the
  annotation is self-documenting even unenforced), but a future audit could
  find `ThreadSafeChecker` gets wired into a later Error Prone release —
  worth re-checking `BuiltInCheckerSuppliers.java` on any Error Prone version
  bump past 2.36.0, since this specific gap is exactly the kind of thing that
  gets fixed silently upstream.
- **Whether `StructuredTaskScope`'s eventual finalization (still preview as
  of JDK 25, JEP 505 in JDK 25) changes the CPU/IO framing.** Structured
  concurrency composes virtual-thread fan-out with cancellation and doesn't
  itself change the CPU-bound exclusion JEP 444 states — but once it exits
  preview, some of `JAVA-CONC-15`'s "use `newVirtualThreadPerTaskExecutor()`"
  guidance for I/O-bound work may read as legacy next to
  `StructuredTaskScope.open()`. Re-check on JDK 25/27 GA.
- **Whether the 65,535 ceiling is worth a `MUST` or stays `SHOULD`.** Zero
  corpus repos were found hitting it (none would — it requires either
  extreme fan-out or a bug), so this stays a "boring topic that bites"
  `SHOULD` per the map's own P2 framing, not a build-breaking `MUST` — there
  is no mechanical way to detect proximity to the ceiling short of
  instrumenting `getReadLockCount()` at runtime.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [JEP 444: Virtual Threads](https://openjdk.org/jeps/444) | JDK Enhancement Proposal, official OpenJDK | JDK 21 (2023, current as of 2026) | Primary source for M-N-05's CPU-bound exclusion and the FIFO/LIFO pool distinction — settles the decision without inference |
| [ForkJoinPool javadoc, JDK 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ForkJoinPool.html) | Official JDK API doc | JDK 21 | `commonPool()` scoping, default parallelism, `ManagedBlocker` escape hatch |
| [CompletableFuture javadoc, JDK 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html) | Official JDK API doc | JDK 21 | Confirms async-method default executor is the same common pool as parallel streams |
| [ReentrantReadWriteLock javadoc, JDK 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantReadWriteLock.html) | Official JDK API doc | JDK 21 (limit unchanged since JDK 5) | Primary source for the 65,535-hold ceiling — replaces the newsletter citation the map flagged as thin |
| [StampedLock javadoc, JDK 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/StampedLock.html) | Official JDK API doc | JDK 21 (since JDK 8) | `asReadWriteLock()`'s exact caveats: no `Condition`, not reentrant, no ownership |
| [BuiltInCheckerSuppliers.java](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java) | Error Prone's actual runtime checker registration | master branch, read 2026-09-12 (matches 2.36.0-era line ranges already pinned elsewhere in this program) | Frame-correction-30-mandated primary source: settles ENABLED_ERRORS/ENABLED_WARNINGS/DISABLED_CHECKS for all seven map rows in one file |
| [FutureReturnValueIgnored.java](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/bugpatterns/FutureReturnValueIgnored.java) | Error Prone check source | master branch, read 2026-09-12 | Exact `@BugPattern` summary and severity, confirms `WARNING`/`ENABLED_WARNINGS` |
| [GuardedByUtils.java](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/bugpatterns/threadsafety/GuardedByUtils.java) | Error Prone check source | master branch, read 2026-09-12 | The exact five recognized `@GuardedBy` package names — the source of the `net.jcip.annotations` gap finding |
| [ThreadSafe.java (annotation) + ThreadSafeChecker.java](https://github.com/google/error-prone/blob/master/annotations/src/main/java/com/google/errorprone/annotations/ThreadSafe.java) | Error Prone annotation + checker source | master branch, read 2026-09-12 | Confirms the checker class exists but is never imported into the built-in supplier sets — the `@ThreadSafe` overclaim finding |
| [errorprone.info/bugpattern/DoubleCheckedLocking](https://errorprone.info/bugpattern/DoubleCheckedLocking) | Official generated bug-pattern doc | current (Error Prone 2.36.0-era) | Human-readable explanation and correct-fix example for M-N-08 |
| [errorprone.info/bugpattern/DateFormatConstant](https://errorprone.info/bugpattern/DateFormatConstant) | Official generated bug-pattern doc | current | Explanation and Google Style Guide tie-in for M-N-09 |
| [errorprone.info/bugpattern/GuardedBy](https://errorprone.info/bugpattern/GuardedBy) | Official generated bug-pattern doc | current | Checker behavior description for M-N-10 |
| [errorprone.info/bugpattern/ErroneousThreadPoolConstructorChecker](https://errorprone.info/bugpattern/ErroneousThreadPoolConstructorChecker) | Official generated bug-pattern doc | current | The one mechanically-caught pool-sizing bug adjacent to M-N-05/06 |
| [findbugs.xml (spotbugs/spotbugs)](https://github.com/spotbugs/spotbugs/blob/master/spotbugs/etc/findbugs.xml) | SpotBugs' own detector-registration descriptor | master branch, read 2026-09-12 | Primary source that `DC_DOUBLECHECK`'s `FindDoubleCheck` detector has no `disabled="true"`, i.e. runs by default |
| [jcip-annotations (stephenc mirror)](https://github.com/stephenc/jcip-annotations/blob/master/src/main/java/net/jcip/annotations/GuardedBy.java) | Maintained mirror of the JCIP annotations jar | current | Confirms `net.jcip.annotations.GuardedBy` is a real, actively-published package developers do reach for — context for the AI-agent-angle finding |
| [Effective Java Item 82 summary](https://github.com/clxering/Effective-Java-3rd-edition-Chinese-English-bilingual/blob/dev/Chapter-11/Chapter-11-Item-82-Document-thread-safety.md) | Bilingual chapter summary of Bloch's book | 3rd edition (2018), still current guidance | Secondary source for "document thread safety" — the rationale for `JAVA-CONC-16`; the map already cites this item by number |
| [jvm-java-runtime-safety.md — JAVA-ERR-05](../jvm-java-runtime-safety.md) | This program's own wave-3 consolidation | 2026-09-12 | The `ExecutorService`/`close()` rule M-N-06 must cite, not duplicate |
| [jvm-concurrency.md — JAVA-CONC-01/02/13](../jvm-concurrency.md) | This program's own wave-3 consolidation | 2026-09-12 | The virtual-thread admission-control and `Process.onExit()` common-pool rules M-N-05/06/07 must cite, not duplicate |
| [jvm-quality-gates.md — JAVA-LINT-02/07/10](../jvm-quality-gates.md) | This program's own wave-3 consolidation | 2026-09-12 | The exact severity-bump precedent (`StringCaseLocaleUsage`) and SpotBugs-scoping rule this dive's lint additions extend |
| Exemplar corpus (guava, apache/kafka, micronaut-core) | Upstream repository source, pinned SHAs | fetched 2026-09-05, read 2026-09-12 | `repo@sha:path:line` evidence for DCL, `@GuardedBy`, and the fire-and-forget-vs-returned `CompletableFuture` distinction — see [Exemplar evidence](#exemplar-evidence) |

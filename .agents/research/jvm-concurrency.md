---
title: "Concurrency: the correctness surface agents get wrong most (JAVA-CONC + KT-CORO)"
topic: "JVM concurrency — virtual threads after JDK 24, a preview API that will not stand still, coroutine cancellation and exception loss, and the SDK's real concurrency surface (a process boundary)"
model: opus
id_family:
  - JAVA-CONC
  - KT-CORO
consolidates:
  - jvm-concurrency/java-virtual-threads-and-structured-concurrency.md
  - jvm-concurrency/kotlin-coroutines-correctness.md
  - jvm-concurrency/process-and-cli-boundary.md
  - jvm-concurrency/java-concurrency-residual-rows.md
audits_read:
  - jvm-audit/config-inventory.md
  - jvm-audit/exemplar-quality-gates.md
  - jvm-audit/exemplar-build-shape.md
  - jvm-audit/exemplar-publishing-ci-bazel.md
map_rows: "M-N-01..M-N-11 (JAVA-CONC; M-N-05..M-N-11 adjudicated in the wave-4 revision); M-U-01..M-U-06, M-U-08, M-U-09 (KT-CORO); M-Y-02 (process boundary); map conflicts 13 and 15"
date: 2026-09-12
revised: 2026-09-12
---

# Concurrency: the correctness surface agents get wrong most

Two families, two globs. `JAVA-CONC` is the depth file read while editing
`**/*.java` — *"Starting a thread, forking work, sharing mutable state, or
wiring a timeout or a cancellation"* ([map](jvm-topic-map.md) §depth tables) —
and it owns the process boundary, because for the OCX SDK the process boundary
**is** the concurrency surface. `KT-CORO` is read while editing `**/*.kt` —
*"Launching, awaiting, cancelling, or collecting; anything with `suspend` in the
signature."*

Deliberately not restated here, only cited: `JAVA-API-14`/`JAVA-API-15` (the
hand-maintained 16-member sysexit enum; the zero-runtime-dependency commitment),
`KT-API-07` (never widen a published `suspend fun`'s signature), and
`GRADLE-PLUG-07/08/09` (the `ValueSource` → `BuildService` → `ExecOperations`
spine that is the Gradle-side mirror of this file's env and spawn discipline),
`JAVA-ERR-05` (shut down every `ExecutorService` on every exit path;
`close()` blocks with no timeout parameter — which is why map row M-N-06 is
absent from the ruleset below rather than duplicated into it), and
`JAVA-LINT-02`/`JAVA-LINT-07`/`JAVA-LINT-10` (the Error Prone severity-bump
list, the `-Xlint:all`/`-Werror` scoping, and SpotBugs' wiring — where map rows
M-N-07/08/09 land instead of here).

## Verdict

1. **Virtual threads are the Java concurrency model, one per task, never
   pooled — and that decision does not reach the OCX SDK's process boundary.**
   Map conflict 13 settled "virtual threads, no reactive stack" by rejecting a
   reactive runtime, not by mandating `Thread.ofVirtual()` everywhere. For a
   library that wraps one CLI command at a time, the async path is
   `Process.onExit()`'s `CompletableFuture` (JDK 9, free on the map's default
   floor of 17) and the drain pair is two plain threads
   ([process](jvm-concurrency/process-and-cli-boundary.md) §4). Adopting virtual
   threads there instead buys nothing and costs a floor jump 17 → 21.
   *Binds: SDK.* Everywhere the fleet does fan out, JAVA-CONC-01/02 apply
   unchanged.
2. **`StructuredTaskScope` must not appear on any published module's main
   compile path, and the reason is a class-file constraint, not an opinion
   about maturity.** JEP 12 stamps preview-dependent class files with
   `minor_version` all-16-bits-set and pins them to the exact feature release
   that compiled them; a jar built with `--enable-preview` on JDK 26 does not
   run on JDK 27 even with the flag re-passed
   ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §6).
   *Binds: library, SDK, Gradle plugin — everything this program publishes.*
3. **Every rule row, code sample and generated snippet naming a
   `StructuredTaskScope`/`Joiner` member carries the JDK it was verified
   against.** The shape changed in five of seven previews: `fork()`→`Subtask`
   (21), constructors→`open()`/`Joiner` (25), `allSuccessfulOrThrow()`
   stream→`List` and `onTimeout()` added (26), a third `R_X` type parameter,
   `awaitAll()` removed and `onTimeout()`→`timeout()` (27) ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §5).
   An undated sample is a hallucination waiting for a compile error.
4. **The `synchronized`-vs-`ReentrantLock` rule is floor-conditional and a
   single unconditional sentence is provably wrong for one side of JDK 24.**
   Below 24: migrate hot `synchronized` sections that block while holding the
   monitor. On 24+: JEP 491 itself quotes JCIP §13.4 and says default to
   `synchronized`, and says migrated code need not be reverted.
5. **Kotlin's five coroutine MUSTs are greppable, and four of the five have a
   shipped detekt lint that is `active: false` by default** — so "detekt is
   configured" is not "these checks run". Re-measured across all 32 clones on
   2026-09-12: exactly **1/32** activates any of them (detekt itself, and only
   `GlobalCoroutineUsage`); **0/32** activate `SuspendFunSwallowedCancellation`
   or `SuspendFunInFinallySection`. Turning them on is a new commitment, not a
   codified convention.
6. **`GlobalScope` carries one named exception, and the lint cannot see it.**
   `GlobalScope.launch(explicitParentContext, …)` at an adapter boundary is
   structurally parented and is not a violation; the bare form is. detekt's
   `GlobalCoroutineUsage` flags both identically, so a flagged site is a
   question, never an automatic rewrite
   ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §8).
7. **A passing `runTest` is not evidence of thread safety.** Every
   `TestDispatcher` runs its queue one task at a time on a single scheduler
   thread; a real data race or lock-ordering bug cannot fail there. A
   thread-safety claim needs a separate real-dispatcher stress test.
   *Binds: SDK, library.*
8. **The SDK's process boundary has no exemplar in the 32-repo corpus** — M-Y-02
   is `partial`, sourced only from `ocx-sdk-python`'s measured contract. Every
   rule in the JAVA-CONC process block is a **new commitment**, and the OCX SDK
   for the JVM will be the fleet's first measurable instance.
9. **`--enable-preview` is not a corpus norm (1/32) and the one occurrence is
   inert.** micronaut-core passes it as a test-runtime `jvmArg` while its
   sibling `JavaCompile` block passes nothing — no preview-dependent class file
   exists for the flag to permit loading. A rule that greps for the literal
   string without reading which task it feeds flags the corpus's only
   precedent as a violation.
10. **The seven residual map rows resolve 3 / 3 / 1, not 7 rules.** M-N-05
    (merged with M-N-06's sizing half), M-N-10 and M-N-11 earn rules —
    `JAVA-CONC-15/16/17`. M-N-07, M-N-08 and M-N-09 are **already-running
    Error Prone checks**, so they are severity-bump lines in `JAVA-LINT`, not
    rules here. M-N-06 drops entirely: its shutdown half is `JAVA-ERR-05`
    verbatim, its admission-control half is `JAVA-CONC-01/02`, its sizing half
    is `JAVA-CONC-15`
    ([residual](jvm-concurrency/java-concurrency-residual-rows.md) §Summary).
11. **`DoubleCheckedLocking`, `DateFormatConstant` and `FutureReturnValueIgnored`
    are `ENABLED_WARNINGS`, not `DISABLED_CHECKS`** (`BuiltInCheckerSuppliers.java:982,
    972, 1015). The action for each is `-Xep:<Name>:ERROR` — a **severity bump**,
    exactly the shape frame correction 30 established for `StringCaseLocaleUsage`.
    SpotBugs' `DC_DOUBLECHECK` (`FindDoubleCheck`, `MT_CORRECTNESS`, CWE-609)
    carries no `disabled="true"` and fires the moment `JAVA-LINT-10` wires
    SpotBugs at all. *Handoff, not a gap:* these belong in
    [jvm-quality-gates.md](jvm-quality-gates.md) as an extension of
    `JAVA-LINT-02`'s bump list and one sentence on `JAVA-LINT-10`'s SpotBugs
    residual clause — the authoring pass must carry them, because this file
    cannot.
12. **`@ThreadSafe`'s own javadoc overclaims, and this is a documented GAP.**
    `com.google.errorprone.annotations.ThreadSafe` says it is *"validated by …
    `ThreadSafeChecker`"*, but `ThreadSafeChecker` is never imported into
    `BuiltInCheckerSuppliers.java` (0 matches for `ThreadSafe\b` against 8
    wired `threadsafety.*` siblings). The class exists in source and ships in
    none of the three built-in sets. `@ThreadSafe` is **prose only**; an agent
    that reads the javadoc and reports "the linter enforces this" is wrong.
    `@GuardedBy`'s `GuardedByChecker` and `@Immutable`'s `ImmutableChecker`
    are both `ENABLED_ERRORS` (lines 790, 794) — free, build-breaking, on.
13. **`net.jcip.annotations.GuardedBy` is silently unenforced.**
    `GuardedByUtils.java:70-75` hard-codes exactly five recognised packages —
    `android.support.annotation`, `androidx.annotation`,
    `com.android.internal.annotations`,
    `com.google.errorprone.annotations.concurrent` and
    `javax.annotation.concurrent` — and the *Java Concurrency in Practice*
    package that most training data quotes is not among them. The wrong import
    compiles clean and buys zero enforcement.
14. **M-N-11's citation problem is solved and the number was wrong.** The
    ceiling is **65535** recursive write locks and **65535** read locks
    (`ReentrantReadWriteLock` javadoc, "Implementation Notes", JDK 21;
    unchanged since JDK 5), *"Attempts to exceed these limits result in `Error`
    throws"* — a primary source, so the Kabutz newsletter the map flagged as
    thin need not be cited at all. This file previously wrote "65,536-reader";
    that figure is corrected everywhere it appeared.
15. **Documented GAP: `JAVA-CONC-15`'s corpus evidence is one-sided.** The
    residual dive sampled kafka, guava, micronaut-core, grpc-java and
    spring-boot and found the correct shape but **no violation**; a full-corpus
    scan for `.parallelStream()` / `commonPool()` with a blocking lambda body
    was out of its budget. The rule rests on JEP 444's own text
    (*"having many more threads than processor cores cannot improve throughput
    in that case"*, plus the Non-Goal *"not … a new data parallelism
    construct"*), not on a measured violation rate.
16. **The residual dive's own JDK-status sentence is stale and JAVA-CONC-05/06
    win.** It says structured concurrency is *"still preview as of JDK 25, JEP
    505 in JDK 25"*. The virtual-threads dive read the full changelog: JEP 505
    (25), JEP 525 (26), JEP 533 (27), seven previews, finalisation targeted at
    JDK 28. The primary-source changelog outranks the aside; nothing in
    `JAVA-CONC-05/06` changes.

## The ruleset

### JAVA-CONC — Java concurrency and the process boundary

Depth file: `rules/java-quality/concurrency.md`. Glob `**/*.java`.
Routing line: *"Starting a thread, forking work, sharing mutable state, or
wiring a timeout or a cancellation."*

#### Group 1 — caught by grepping thread and executor construction

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-CONC-01** | Never construct a fixed-size pool of virtual threads. To limit concurrency, use a `Semaphore` (or the resource's own admission control) and keep one virtual thread per task. | JEP 444 states both absolutes verbatim: *"a new virtual thread should be created for every application task"*, *"virtual threads should never be pooled"*, and *"do not be tempted to pool virtual threads in order to limit concurrency… use constructs specifically designed for that purpose, such as semaphores"* ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §1). | `grep -rn 'ofVirtual()' --include='*.java' .` then, for each hit's file, `grep -n 'newFixedThreadPool\|new ThreadPoolExecutor'` — the two names in one construction is the finding. `newVirtualThreadPerTaskExecutor()` alone needs no pairing and is correct. | **MUST** | JDK 21 (JEP 444) |
| **JAVA-CONC-02** | Bound fan-out at the real downstream resource's known capacity — a connection pool's `maximumPoolSize`, a native library's own concurrency limit, an API's rate budget — never at "however many tasks exist". | Virtual threads removed the accidental throttle a 20-thread platform pool used to impose; the resources with real ceilings did not get cheaper ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §7). | Reading check, not a grep: for every `executor.submit(…)` / `scope.fork(…)` loop over a collection whose size is caller-controlled, confirm a `Semaphore`, a bounded `Joiner`, or a named pool size sits between the loop and the downstream call **in the same method**. A loop with none, calling a pooled or rate-limited client, is the finding. | **MUST** | JDK 21 |

#### Group 2 — caught by reading the module's declared JDK floor first

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-CONC-03** | State the `synchronized`-vs-`ReentrantLock` guidance conditionally on the module's minimum supported JDK, never as one sentence. Floor 17/21: migrate `synchronized` sections that are hot **and** block on I/O while holding the monitor. Floor 24+: default to `synchronized`; reach for `java.util.concurrent.locks` only for `tryLock`, fairness, interruptible/timed acquisition, `Condition` or read-write splitting. Never require reverting already-migrated code. | JEP 491 (JDK 24) made monitors acquire, hold and release independently of the carrier, then quoted JCIP §13.4 for the post-24 default and said explicitly *"you need not revert code that has been migrated"* ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §2). Below 24 the pre-491 advice is still correct. | Read `languageVersion` / `sourceCompatibility` / `--release` / `<maven.compiler.release>` **before** writing either half. Any generated advice recommending `ReentrantLock` "to avoid pinning virtual threads" with no JDK floor named is incomplete by construction. | **MUST** | split at JDK 24 (JEP 491) |
| **JAVA-CONC-04** | Do not use `-Djdk.tracePinnedThreads` anywhere — script, Dockerfile, CI job or troubleshooting doc. The `jdk.VirtualThreadPinned` JFR event is the only pinning detector on JDK 24+. | JEP 491 removed the property: *"setting it on the command line will have no effect"* — a silent no-op that gives false confidence that no pinning occurred. The JFR event is enabled by default at a 20 ms threshold and was enhanced to carry the pinning reason and the carrier's identity ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §3). | `grep -rn 'tracePinnedThreads' .` — any hit on a JDK 24+ floor is the finding. Replacement: `java -XX:StartFlightRecording=filename=vt.jfr,settings=profile …` then `jfr print --events jdk.VirtualThreadPinned vt.jfr`. | **MUST** | JDK 24 |

#### Group 3 — caught by grepping the preview flag and the preview API's own name

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-CONC-05** | No preview API — `StructuredTaskScope`, `Joiner`, or anything else requiring `--enable-preview` — on the main sourceset compile path of any published module. | Not an opinion about maturity: JEP 12 marks a preview-dependent class file with `minor_version` all-16-bits-set, and *"if preview features are not enabled at run time, a JVM implementation will not load a class file that depends on the preview features of any Java SE release"* — pinned to the **exact** feature release that compiled it. A jar built with `--enable-preview` on JDK 26 will not run on JDK 27 even with the flag re-passed, because JDK 27's preview is JEP 533's different shape ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §6). | `grep -rn 'StructuredTaskScope' --include='*.java' src/main` must be empty. Then `grep -rn 'enable-preview\|enablePreview' --include='*.gradle*' --include='*.kts' --include='pom.xml' .` and **read which task each hit feeds**: a `compilerArgs`/`<compilerArgs>` entry on a published module's main sourceset is the violation; a `Test { jvmArgs }` entry is not (see the micronaut row below). Empty output on the first grep is the pass. | **MUST** | preview through JDK 27 (JEP 533); re-check when the JEP's header flips from `Scope: Implementation`/"(Nth Preview)" to `Scope: SE` — currently targeted at JDK 28 |
| **JAVA-CONC-06** | Any code sample, comment or generated snippet naming a concrete `StructuredTaskScope`/`Joiner` member carries the JDK number it was verified against, and the member is re-read against that JDK's javadoc before being emitted. | The shape changed in five of seven previews (`Subtask` not `Future` at 21; `open()`/`open(Joiner)` replacing the `ShutdownOnFailure`/`ShutdownOnSuccess` constructors at 25; `allSuccessfulOrThrow()` returning `List<T>` not a stream and `onTimeout()` added at 26; `R_X` type parameter added, `awaitAll()` removed and `onTimeout()` renamed `timeout()` with `CancelledByTimeoutException` at 27) ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §5). | `grep -rn 'StructuredTaskScope\|Joiner\.' <rule or doc file>` — a hit with no adjacent "(JDK N)" / "(Nth preview)" qualifier is the finding. Three named compile-breakers to grep for directly: `new StructuredTaskScope.ShutdownOn` (gone since 25), `.allSuccessfulOrThrow()` followed by `.stream()` or `Subtask` iteration (pre-26 shape), `onTimeout(` in JDK-27-targeted code. | **MUST** | JDK 21–27; re-verify against the JDK 27 GA javadoc after 2026-09-15 |

#### Group 4 — caught by grepping context carriers and per-thread caches

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-CONC-07** | Carry one-way context into child and forked tasks with `ScopedValue`, not `ThreadLocal`. Never pass a literal `null` to `ScopedValue.orElse`. | `ScopedValue` finalised in JDK 25 (JEP 506) with exactly one behavioural change: *"the `ScopedValue.orElse` method no longer accepts `null` as its argument"* — the class's blanket null contract makes `orElse(null)` a **runtime** `NullPointerException`, not a compile error, so preview-era code that compiled now throws ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §4). Bindings are immutable, flow one-way, and are inherited by forked subtasks. | `grep -rn '\.orElse(null)' --include='*.java' .` on any `ScopedValue` receiver is the MUST finding. Error Prone's `ThreadLocalUsage` is the complementary signal for new `ThreadLocal` fields introduced in code that also uses virtual threads. | **MUST** (no `orElse(null)`) · SHOULD (prefer `ScopedValue`) | JDK 25 (JEP 506) |
| **JAVA-CONC-08** | Audit `static final ThreadLocal<…>` caches before scaling code onto virtual threads — and do **not** default to "replace it with a lock-free pool". State the chosen strategy (pooled, bounded, non-recycling, or kept with a written rationale). | A cache sized for "few, long-lived threads" becomes never-reused garbage under one-thread-per-task. But jackson-core — the library that owns the extension point — made a lock-free pool the default in 2.17.0 (2024-03-12) and **reverted it in 2.17.1** (2024-05-04) after production regressions, then deprecated the pool in 2.18.0; its `JsonRecyclerPools` now offers five strategies rather than a winner ([vt](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) §8). | `grep -rn 'static final ThreadLocal<\|ThreadLocal.withInitial(' --include='*.java' .` — for each hit guarding a non-trivially-constructed reusable object (buffer, formatter, parser), the finding is an **undocumented** strategy, not the `ThreadLocal` itself. | SHOULD | JDK 21 (the migration trigger) |

#### Group 5 — the process boundary (no corpus exemplar; every row is a new commitment)

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-CONC-09** | Every CLI spawn point takes a `ProcessLauncher` (or equivalently narrow functional interface) by constructor injection. Production code never calls `new ProcessBuilder(…).start()` outside the one real implementation. | Java has no mockable process API — `ProcessBuilder.start()` is a concrete method on a concrete class that always talks to the OS, so the interface **is** the test seam, mirroring `ocx-sdk-python`'s `popen_factory`/`exec_factory` optional-with-real-default shape ([process](jvm-concurrency/process-and-cli-boundary.md) §1; [cfg](jvm-audit/config-inventory.md) Axis 3). The test double is a subclass of the `abstract` `java.lang.Process`, not a mocking-library trick. | `grep -rn 'new ProcessBuilder' src/main/java \| grep -v ProcessLauncher` must be empty. In tests, `grep -rn 'mock(ProcessBuilder\|mock(Process\.class' src/test` must also be empty — a hit there is the tell that the seam was skipped. | **MUST** | JDK 17 |
| **JAVA-CONC-10** | Drain `getInputStream()` and `getErrorStream()` concurrently — two tasks, or one plus `redirectErrorStream(true)`. Never read one to completion before touching the other. | The JDK javadoc states it as a warning, not folklore: *"failure to promptly write the input stream or read the output stream of the process may cause the process to block, or even deadlock"* ([process](jvm-concurrency/process-and-cli-boundary.md) §2). `redirectErrorStream(true)` is wrong for this SDK specifically — it would mix diagnostic stderr into the `--format json` payload a parser must consume verbatim. | Reading check: any method that calls `.readAllBytes()`/`.readAllLines()` on one process stream and then blocks on `waitFor()` or the other stream, without both reads already submitted to separate threads/futures, is the finding. | **MUST** | JDK 17 |
| **JAVA-CONC-11** | The kill ladder is `destroy()` → `waitFor(grace)` → `destroyForcibly()` → `waitFor()`, reached from a `finally` (or a try-with-resources close) on every spawn path. If the wrapped CLI can fork children, the ladder walks `process.descendants()` and destroys each handle. | Mirrors `ocx-sdk-python`'s `_kill_ladder`/`_reap` (`KILL_GRACE = 5.0`). The platform asymmetry is real: on POSIX `destroy()` is `SIGTERM` and the grace window means something; on Windows both calls are `TerminateProcess`, so there is no graceful phase — `Process.supportsNormalTermination()` detects which regime applies. And neither call reaches descendants: the JVM has no `killpg` and `ProcessBuilder` has no `start_new_session` equivalent, so a forking CLI leaves orphans ([process](jvm-concurrency/process-and-cli-boundary.md) §3). | `grep -rn '\.start()\|launcher.launch(' src/main/java` — each hit's enclosing method must reach a shared `killLadder(Process, Duration)` helper from a `finally`. Then `grep -n 'descendants()' ` in that helper's file, **or** a reviewed written statement that the wrapped CLI never forks. | **MUST** | JDK 9 (`descendants()`); `waitFor(Duration)` is JDK 24 sugar — either spelling, used consistently |
| **JAVA-CONC-12** | `ProcessBuilder.environment()` is `.clear()`-ed before anything is written to it, and `System.getenv()` is read in exactly one place — the classified `OCX_ENV_CLASSES` table builder. The two `explicit`-class variables are never read from the ambient environment under any code path, including a fallback branch. | `environment()` returns *"a copy of the current process environment"* — it does not start empty, so `pb.environment().put(k, v)` adds one key onto the full ambient environment and silently leaks whatever launched the JVM (a CI runner's secrets, a shell's `OCX_*` overrides). One classified seam mirrors `rules_ocx`'s own "no `module_ctx.os`/getenv — repository rules only" discipline and the Gradle-side `ValueSource` isolation ([process](jvm-concurrency/process-and-cli-boundary.md) §5; cf. `GRADLE-PLUG-07/08/09`). | `grep -rn -A3 '\.environment()' src/main/java` — a `.put`/`.putAll` not preceded by `.clear()` is the finding. `grep -rn 'System.getenv' src/main/java` — every hit outside the one designated builder class is a finding. `grep -rn 'getenv("OCX_NO_VERIFY"\|getenv("OCX_ALLOW_YANKED"' src/main/java` must be empty. | **MUST** | JDK 17 |
| **JAVA-CONC-13** | The async path is `Process.onExit()`'s `CompletableFuture<Process>`, and every stage doing blocking work takes an explicit bounded `Executor`. Do not use `ForkJoinPool.commonPool()` for a blocking callback — the one named exception is a block wrapped in `ForkJoinPool.ManagedBlocker` — and do not adopt virtual threads here as the reason to raise the JDK floor. | `onExit()` has been available unmodified since JDK 9 — zero floor cost against the map's default of 17 — and matches a one-command-at-a-time SDK's bounded shape. Virtual threads solve a fan-out problem this boundary does not have, and choosing them forces the floor to 21 (JEP 444, no back-port). A blocking callback on the shared common pool starves unrelated JVM-wide code, the same failure class as a blocking `parallelStream()` ([process](jvm-concurrency/process-and-cli-boundary.md) §4) — it is literally the same pool, because `CompletableFuture`'s javadoc states *"all async methods without an explicit Executor argument are performed using `ForkJoinPool.commonPool()`"*. The `ManagedBlocker` carve-out is the JDK's own: *"if running in a ForkJoinPool, the pool may first be expanded to ensure sufficient parallelism available during the call to `blocker.block()`"*, so "never block on a FJ pool" is over-broad as an unconditional ([residual](jvm-concurrency/java-concurrency-residual-rows.md) §1). | `grep -rn 'onExit()' src/main/java` — every `.thenApplyAsync`/`.thenComposeAsync`/`.whenCompleteAsync` on that chain must pass an `Executor` argument; a no-arg `…Async` or a blocking body inside a plain `.thenApply` is the finding. `grep -rn 'Thread.ofVirtual\|newVirtualThreadPerTaskExecutor' src/main/java` should be empty unless the owner raised the floor to 21+ for an unrelated reason. | **MUST** (explicit `Executor`) · SHOULD (`onExit` over virtual threads for this boundary) | JDK 9 (`onExit`); virtual threads would require 21 |
| **JAVA-CONC-14** | Sysexit 75 is retried **inside** the spawn/run call, strictly before any exception object for that attempt is constructed. Retryability is a fixed no-argument property on the exception type (or the exit-code enum), never a constructor parameter threaded from a retry policy. | Placement is the mechanism, not documentation discipline: a caller that only catches exceptions cannot skip a retry that happens below exception construction, and any future call site that builds the exception through the shared exit-code map inherits correct retryability for free ([process](jvm-concurrency/process-and-cli-boundary.md) §6; `rules_ocx/AGENTS.md:66-72` — *"75 is retried before it ever reaches a `fail()`"*). The 16 exit codes themselves are `JAVA-API-14`, cited not restated. | Two tests: one raising `TempFailException` from a fake `ProcessLauncher` and asserting the retry count matches the configured policy **before** any exception reaches the caller; one asserting `isRetryable()` is `true` for that subtype and `false` for every other, with no policy object in scope. Plus `grep -rn 'stderr.*contains\|stderr.*matches\|stderr.*startsWith' src/main/java` — any hit deciding control flow (as opposed to building a message) is a violation of the exit-code-is-the-classification premise. | **MUST** | ocx 0.6.0 sysexit table |

#### Group 6 — the residual map rows (M-N-05, M-N-10, M-N-11), adjudicated in the wave-4 revision

The other four residual rows are deliberately **not** here: M-N-07, M-N-08 and
M-N-09 are Error Prone checks that already run at `WARNING`, so they are
`-Xep:<Name>:ERROR` lines on `JAVA-LINT-02`'s bump list (verdict 11), and M-N-06
is fully covered by `JAVA-ERR-05` + `JAVA-CONC-01/02` + `JAVA-CONC-15`. Not
duplicating a linter that already denies the mistake is the distillation rule,
not an omission.

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-CONC-15** | Size a pool by its workload's regime, never by habit. CPU-bound work — no blocking call anywhere in the task body — stays on a pool sized to `Runtime.availableProcessors()`: `ForkJoinPool.commonPool()` / `parallelStream()` for ad-hoc fork-join, or an explicitly sized `ForkJoinPool`/`ExecutorService`. Blocking-style I/O — network, JDBC, file, subprocess wait — goes one-virtual-thread-per-task via `Executors.newVirtualThreadPerTaskExecutor()` or a `StructuredTaskScope`, never onto a CPU-sized pool and never onto the common pool through a no-argument `…Async` call. | JEP 444 states the boundary condition in its own text, not by inference: throughput needs *"the number of concurrent tasks is high (more than a few thousand)"* **and** *"the workload is not CPU-bound, since having many more threads than processor cores cannot improve throughput in that case"*, with the Non-Goals list confirming *"it is not a goal to offer a new data parallelism construct"*. The two regimes are genuinely different pools — the virtual-thread carrier pool is a work-stealing `ForkJoinPool` in **FIFO** mode while *"the common pool used by parallel streams … operates in LIFO mode"* — so `-Djava.util.concurrent.ForkJoinPool.common.parallelism` tunes one and not the other ([residual](jvm-concurrency/java-concurrency-residual-rows.md) §1). | `grep -rn 'parallelStream()\|ForkJoinPool.commonPool()' src/main/java`, then read each call site's lambda for a blocking call (network, JDBC, `Thread.sleep`, subprocess `.waitFor()`) — a hit is the finding unless it is wrapped in `ForkJoinPool.ManagedBlocker`. Separately `grep -rn '\.then\w*Async(' src/main/java` — a single-argument call (no trailing `Executor`) whose lambda blocks is the same finding at a second call site. The inverse finding: `grep -rn 'newVirtualThreadPerTaskExecutor\|StructuredTaskScope' src/main/java` used for a tight numeric loop with no I/O. Empty output on all three is the pass. | **MUST** | JDK 21 (JEP 444); `ForkJoinPool`/parallel streams since JDK 7/8, no floor cost |
| **JAVA-CONC-16** | Document shared mutable state with the **checker-recognised** annotation. `@GuardedBy("lock")` from `com.google.errorprone.annotations.concurrent` or `javax.annotation.concurrent` — never `net.jcip.annotations.GuardedBy`. `@Immutable` from `com.google.errorprone.annotations`. Treat `@ThreadSafe`, in any package, as prose only. | `GuardedByChecker` (`BuiltInCheckerSuppliers.java:790`) and `ImmutableChecker` (`:794`) are both `ENABLED_ERRORS` — free, zero-config, build-breaking the moment the annotation exists. The only missing piece is the convention of writing it. `GuardedByUtils.java:70-75` recognises exactly five packages and the JCIP one is not among them, so the most-trained-on import compiles clean and enforces nothing. `ThreadSafeChecker` ships in none of the three built-in sets despite its annotation's javadoc claiming otherwise (verdict 12). Effective Java Item 82: thread-safety behaviour *"is … part of its contract with its clients"* ([residual](jvm-concurrency/java-concurrency-residual-rows.md) §6). | `grep -rn 'import net.jcip.annotations' src/main/java` — any hit is the finding (wrong package, silent no-op), independent of whether Error Prone is even wired. Then a reading pass: every class with a shared mutable `static` or instance field and **no** annotation at all is the finding — the absence is what no grep can prove. A build failing on `GuardedByChecker`/`ImmutableChecker` is the rule working; suppressing it is the violation. | SHOULD (writing the annotation) · **MUST** (never the JCIP package) | none — annotations predate every Error Prone release in use |
| **JAVA-CONC-17** | Treat `ReentrantReadWriteLock`'s 65535-hold ceiling as reachable under virtual-thread fan-out. Where a read/write lock guards a resource whose reader count scales with concurrent virtual-thread tasks rather than a fixed platform pool, either bound readers below 65535 with a `Semaphore` or use `StampedLock`'s optimistic-read path directly. If `asReadWriteLock()` is used as a drop-in, audit first for `Condition` usage and reentrant re-acquisition. | The lock's own javadoc, "Implementation Notes": *"This lock supports a maximum of 65535 recursive write locks and 65535 read locks. Attempts to exceed these limits result in `Error` throws from locking methods"* — an `Error`, which a routine `catch (Exception e)` never sees. A platform-thread pool self-limited far below this by the cost of the threads; a virtual-thread-per-task workload does not. `asReadWriteLock()` is a **view** with real lost behaviour, not a swap: the returned locks *"do not support a `Condition` … throw `UnsupportedOperationException`"*, `StampedLock`s are *"not reentrant"*, and they *"have no notion of ownership"* ([residual](jvm-concurrency/java-concurrency-residual-rows.md) §7). | `grep -rn 'ReentrantReadWriteLock' src/main/java`, then per hit a reading check: does the reader count scale with `Thread.ofVirtual()`/`newVirtualThreadPerTaskExecutor()` fan-out rather than a bounded platform pool, with no `Semaphore` in between? That is the finding. Mechanically: `grep -rn 'asReadWriteLock()' src/main/java` paired with `grep -n 'newCondition()'` in the same file — co-occurrence is a guaranteed runtime `UnsupportedOperationException`, invisible at compile time. | SHOULD | JDK 5 (`ReentrantReadWriteLock`); JDK 8 (`StampedLock`); JDK 21 is the relevance trigger |

Bonus lint fact, not a rule: Error Prone's `ErroneousThreadPoolConstructorChecker`
(`ENABLED_WARNINGS`, `:997`) catches one narrow real sizing bug — an unbounded
`workQueue` with `maximumPoolSize > corePoolSize`, where *"the pool size will
never go beyond `corePoolSize`"* because the queue absorbs everything first. It
catches a config typo; it does not answer JAVA-CONC-15's regime question.
`SynchronizeOnNonFinalField` (`ENABLED_WARNINGS`, `:1184`) is the adjacent
sibling of the double-checked-locking mistake.

### KT-CORO — Kotlin coroutines

Depth file: `rules/kotlin-quality/coroutines.md`. Glob `**/*.kt`.
Routing line: *"Launching, awaiting, cancelling, or collecting; anything with
`suspend` in the signature."*

#### Group 1 — the gate that decides whether any of the rest is checked automatically

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **KT-CORO-01** | If detekt is the Kotlin gate, explicitly set `coroutines: GlobalCoroutineUsage / SuspendFunSwallowedCancellation / SuspendFunInFinallySection / CoroutineLaunchedInTestWithoutRunTest: active: true` in the committed config. Never treat "detekt is applied" as evidence these run. | All four ship `active: false` in `detekt@45672efb8b:detekt-core/src/main/resources/default-detekt-config.yml:140-159`, while `InjectDispatcher`, `RedundantSuspendModifier`, `SleepInsteadOfDelay` and `SuspendFunWithFlowReturnType` ship active. `buildUponDefaultConfig = true` therefore leaves the four coroutine correctness checks off ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §Exemplar evidence). Re-measured across all 32 clones 2026-09-12: **1/32** activates any (detekt itself, `GlobalCoroutineUsage` only); **0/32** activate the swallowed-cancellation or finally-section rules. | `grep -n -A2 'SuspendFunSwallowedCancellation\|GlobalCoroutineUsage\|SuspendFunInFinallySection\|CoroutineLaunchedInTestWithoutRunTest' <the config named by `config.setFrom(...)`>` — an absent key means the rule is **off**, not defaulted-on. Silence here is the finding. | **MUST** | detekt at the `dev.detekt.*` package (post-rename); re-check the activation table on the next stable detekt release |

#### Group 2 — the five greppable MUSTs (the dive's decision (a))

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **KT-CORO-02** | `GlobalScope.launch { }` / `GlobalScope.async { }` **with no context argument** is a MUST-fix. The one named exception is `GlobalScope.launch(explicitParentContext, …)` at an adapter boundary bridging a non-coroutine API, and only when that context actually carries a `Job` the caller owns. | The bare form detaches the coroutine from every lifecycle and leaks on failure or shutdown. The context-carrying form is not detached at all: `ktor@f92fad04:ktor-client/ktor-client-cio/common/src/io/ktor/client/engine/cio/CIOEngine.kt:73` passes `parentContext` carrying a real parent `Job`, so cancelling that `Job` cancels the launch exactly like a structured child; all six `GlobalScope` sites in that repo follow the same shape ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §8). | `grep -rn 'GlobalScope\.\(launch\|async\|writer\)\s*{' --include='*.kt' .` — the `{` immediately after the call name (no argument list) is the violation. detekt's `GlobalCoroutineUsage` finds the call sites but **cannot distinguish the two forms**, so every finding needs one read of the first argument before any edit. The `@OptIn(DelicateCoroutinesApi::class)` marker is necessary but not sufficient as a grep — it is present on both forms. | **MUST** (bare form) | kotlinx.coroutines 1.11.x |
| **KT-CORO-03** | Never call `runBlocking` from inside a `suspend fun`. | It blocks the calling thread for the duration, defeating the reason the enclosing function suspends, and can deadlock a `limitedParallelism` dispatcher whose whole allowance is now held by blocked worker loops ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) candidate 4). | No lint exists in the audited detekt or ktlint rule sets. Reading check: `grep -rn 'runBlocking' --include='*.kt' .` and for each hit confirm the enclosing function declaration does **not** carry the `suspend` modifier. | **MUST** | — |
| **KT-CORO-04** | Install a `CoroutineExceptionHandler` only on a root coroutine — one started directly on a `CoroutineScope`/`supervisorScope`, or a direct child of a `SupervisorJob`. Never on `async`, and never on a `launch` nested inside another `launch`/`async`. | *"All children coroutines … delegate handling of their exceptions to their parent … so the CoroutineExceptionHandler installed in their context is never used."* For `async`, *"async catches all exceptions and represents them in the resulting Deferred"* — the handler has nothing to fire on; the failure surfaces only at `.await()`. A handler installed on a coroutine launched inside `runBlocking` is equally dead ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §1, §2). "Direct child of a `SupervisorJob`" and "direct child of a `supervisorScope`" both count as roots; one level deeper does not, regardless of which supervising mechanism sits above. | Reading check, per handler: `grep -rn 'CoroutineExceptionHandler' --include='*.kt' .`, then trace the single `launch`/`async` it is passed to. Findings: the call is `async`; or the call is nested inside another `launch`/`async` body; or the enclosing scope is `runBlocking`. Companion grep: `grep -rn '\.async(' --include='*.kt' .` — every `Deferred` must be `await()`ed inside a `try`/`catch` or be deliberately fire-and-forget with a written reason. | **MUST** | — |
| **KT-CORO-05** | Rethrow `CancellationException` from every `catch` clause wide enough to observe it, before any other handling runs. `runCatching { }` is such a clause — it is a blanket `catch (Throwable)`. | Swallowing it silently breaks the coroutine's own cancellation with no symptom until the leak is diagnosed; the docs are explicit that cancellation exceptions *"are ignored by all handlers"* and are transparent — a rethrow lets the **original** wrapped exception still reach the handler ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §3). | detekt `SuspendFunSwallowedCancellation` (**must be activated** — KT-CORO-01). Fallback grep: `grep -rn 'catch\s*(\s*\w*\s*:\s*Exception\s*)\|runCatching\s*{' --include='*.kt' .` inside any file containing `suspend fun`; a hit with no `is CancellationException` branch and no immediate rethrow above the catch-all is the finding. | **MUST** | — |
| **KT-CORO-06** | Do not run unbounded or long-blocking work on bare `Dispatchers.IO`. Give each blocking call site a `Dispatchers.IO.limitedParallelism(n)` view sized to the real resource it guards. | `Dispatchers.IO` itself ceilings at `max(64, core count)` (tunable only by the `kotlinx.coroutines.io.parallelism` system property), and starvation there has no default queue-depth metric. Creating views is *cheap and correct*: `limitedParallelism(n)` is an elastic window onto IO's own pool — a `LimitedDispatcher` that *"maintains its own queue … and dispatches at most `parallelism` worker-loop tasks"* — so views do not allocate n threads and do not sum. The anti-pattern is the **unbounded work on the base dispatcher**, not the number of views ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §6). | `grep -rn 'withContext(Dispatchers.IO)\|Dispatchers.IO\b' --include='*.kt' .` — for each, confirm the block does bounded work (one request, one file) rather than an internal loop or fan-out with no cap. detekt `SleepInsteadOfDelay` (active by default) catches the adjacent `Thread.sleep`-in-a-coroutine mistake. | **MUST** | kotlinx.coroutines 1.11.x |

#### Group 3 — caught by reading the coroutine body

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **KT-CORO-07** | Fix a shared-mutable-state race with `AtomicInteger`/`AtomicReference`, coarse-grained thread confinement, or `Mutex.withLock` — never with `@Volatile`. Prefer coarse-grained confinement (one `withContext` around the whole workload) over fine-grained (one per increment). | JetBrains names this exact mistake: *"volatile variables guarantee linearizable … reads and writes … but do not provide atomicity of larger actions (increment in our case)"*. Fine-grained confinement is correct but pays a context switch per operation ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §7). Never mix a suspending `Mutex` with a blocking `synchronized` in one critical section. | `grep -rn '@Volatile' --include='*.kt' .` — a hit on a `var` that is also the target of `++`, `+=` or `-=` anywhere is the finding. No built-in detekt rule covers this as of the audited snapshot; it is a custom-rule candidate. | **MUST** | — |
| **KT-CORO-08** | Wrap any suspending call in a `finally` block that must complete despite cancellation in `withContext(NonCancellable) { }`. | A bare suspending call in `finally` is itself immediately cancelled once the coroutine is already cancelled, so the cleanup silently does not run — *"without `withContext(NonCancellable)`, this function doesn't complete because the coroutine is canceled"* ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §5). | detekt `SuspendFunInFinallySection` (**must be activated** — KT-CORO-01). Fallback: `grep -rn -A5 'finally\s*{' --include='*.kt' .` and look for a suspending call with no enclosing `NonCancellable`. | **MUST** | — |
| **KT-CORO-09** | A long-running loop inside a coroutine body contains at least one of: a suspension point (`delay`, `yield`, another `suspend fun` call) or an explicit `isActive` / `ensureActive()` check. | Cancellation is cooperative, never preemptive — *"coroutines react to cancellation only when they cooperate by suspending or checking for cancellation explicitly"*. Without one, `cancel()` is a no-op until the loop finishes on its own ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §5). | **No lint exists** — confirmed across detekt's whole 10-rule `detekt-rules-coroutines` module. The reading heuristic, stated precisely so a review skill can run it: find every `while`/`for` loop nested directly inside a `launch`/`async`/`suspend fun` body whose bound is not a small fixed constant; the finding is a loop body containing **none** of the five tokens `isActive`, `ensureActive(`, `yield(`, `delay(`, or a call to another `suspend fun`. | **MUST** | — |
| **KT-CORO-10** | In a library or SDK, take the dispatcher as an injected parameter rather than hardcoding `Dispatchers.IO`/`Default`/`Unconfined` at the call site. | detekt ships `InjectDispatcher` **active by default**, so this one is already enforced wherever detekt runs. But it is a testability convention sourced from Android's best-practices guide, not one of JetBrains' own correctness pairs — which is why it is a SHOULD, not a peer of KT-CORO-02..06 ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §Contested). | detekt `InjectDispatcher` (default-active — no config change needed). | SHOULD | detekt (`dev.detekt.*`) |

#### Group 4 — caught by reading the test

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **KT-CORO-11** | A test whose claim is thread safety (atomics, confinement, `Mutex`, "concurrent", "race") needs a real-dispatcher stress test **in addition to** `runTest`. `runTest` stays the default and correct tool for everything defined by suspension order and cancellation. | Every `TestDispatcher` backed by a `TestCoroutineScheduler` runs its queue one task at a time on a single thread, deterministically ordered by virtual time. By construction it cannot reproduce a bug that exists only because two coroutines truly run in parallel — a `Dispatchers.Default`/`IO` data race, a lock-ordering deadlock, a `@Volatile`-is-not-enough compound update. Such a suite passes correctly and uselessly ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §9). | Any test file whose test name references "concurrent", "thread-safe" or "race" but whose body uses only `runTest`/`StandardTestDispatcher`/`UnconfinedTestDispatcher` is the finding. The companion shape is the docs' own `massiveRun`: `runBlocking(Dispatchers.Default) { repeat(100) { launch { repeat(1000) { action() } } } }`, deliberately **not** inside `runTest`. | **MUST** (for a thread-safety claim) · SHOULD (elsewhere) | kotlinx-coroutines-test 1.11.0 |
| **KT-CORO-12** | A coroutine in a `runTest` body that must outlive the test's own coroutines (a background poller, an event collector) launches on `backgroundScope`. | `runTest` waits for every non-`backgroundScope` child; a genuinely infinite child launched at the top level hangs until the 60-second default timeout instead of failing fast with a legible cause. `runTest` also auto-skips `delay` and rethrows uncaught child exceptions at test end — it is not `runBlocking` plus a timeout annotation ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §9). | `grep -rn 'launch\s*{\s*while (true)\|launch\s*{\s*for (' --include='*.kt' src/test` — a hit not prefixed by `backgroundScope.` is the finding. | SHOULD | kotlinx-coroutines-test 1.11.0 |
| **KT-CORO-13** | Choose `StandardTestDispatcher` when the test asserts dispatch order or interleaves `advanceTimeBy`/`runCurrent`; choose `UnconfinedTestDispatcher` only when ordering does not matter. | `UnconfinedTestDispatcher` enters `launch`/`async` bodies eagerly up to the first suspension point, so picking it for an ordering-sensitive test silently changes what the test exercises ([coro](jvm-concurrency/kotlin-coroutines-correctness.md) §9). | `grep -rn -A10 'UnconfinedTestDispatcher' --include='*.kt' src/test` — a hit whose test body also calls `runCurrent()`/`advanceUntilIdle()` is almost certainly a copy-paste from a `StandardTestDispatcher` test. | CONSIDER | kotlinx-coroutines-test 1.11.0 |

## Applied to the exemplars and the two future consumers

### Satisfied

| Rule | Evidence |
|---|---|
| KT-CORO-02 (the named exception, correctly used) | `ktorio__ktor@f92fad0435:ktor-client/ktor-client-cio/common/src/io/ktor/client/engine/cio/CIOEngine.kt:73` — `GlobalScope.launch(parentContext, start = CoroutineStart.ATOMIC)` where `parentContext[Job]` is the caller's real `Job`. All six `GlobalScope` sites in the repo carry an explicit first-argument context; none is bare. |
| KT-CORO-01 (partially) | `detekt__detekt@45672efb8b:config/detekt/detekt.yml:36-45` — detekt's own dogfooding config sets `coroutines: active: true` and explicitly activates `GlobalCoroutineUsage`. It is the **only** repo of 32 that activates any inactive-by-default coroutine rule. |
| KT-CORO-06 (the ceiling is primary source, not folklore) | `Kotlin__kotlinx.coroutines@f63a04bacb:kotlinx-coroutines-core/jvm/src/Dispatchers.kt:9,29-48` and `…/common/src/internal/LimitedDispatcher.kt:7-19` — the library's own KDoc and implementation state the 64-thread default and the non-additive elastic view verbatim. |
| JAVA-CONC-05 (nobody ships preview bytecode) | Corpus-wide: **0/32** pass `--enable-preview` on any main-sourceset compile path (re-measured 2026-09-12 over the checked-out build files of all 32 clones). |
| JAVA-CONC-16 (the recognised `@GuardedBy` package, at scale) | `google__guava@5fb424c43a:guava/src/com/google/common/util/concurrent/Monitor.java:24,342` and `…/cache/LocalCache.java:54,1908` both `import com.google.errorprone.annotations.concurrent.GuardedBy` — 9+ call sites in `Monitor.java` alone. No `net.jcip.annotations` import was found anywhere in the files sampled. |
| The correct double-checked-locking shape (M-N-08's target) | `google__guava@5fb424c43a:guava/src/com/google/common/base/Suppliers.java:126-147` — `MemoizingSupplier` pairs `transient volatile boolean initialized` with `synchronized (lock)`, exactly what `DoubleCheckedLocking` exists to require. |
| M-N-07's narrowing (a returned chain is not a violation) | `micronaut-projects__micronaut-core@d5842045bb:context/src/main/java/io/micronaut/scheduling/async/AsyncInterceptor.java:100-102` — `CompletableFuture.supplyAsync(...).thenCompose(Function.identity())` with no terminal `.exceptionally`/`.handle`, **correct** because the value is returned through `interceptedMethod.handleResult(...)` and responsibility transfers to the caller. |

### Violated

| Rule | Violation |
|---|---|
| **KT-CORO-01** | `detekt__detekt@45672efb8b:config/detekt/detekt.yml:36-45` — the tool that **ships** `SuspendFunSwallowedCancellation`, `SuspendFunInFinallySection` and `CoroutineLaunchedInTestWithoutRunTest` does not activate any of the three on its own Kotlin source. Its `coroutines:` block names four rules; those three are absent, so they remain `active: false`. |
| **KT-CORO-01** | `JetBrains__Exposed@4be9aee04c:detekt/detekt-config.yml` has **no `coroutines:` section at all**, and `JetBrains__Exposed@4be9aee04c:buildSrc/src/main/kotlin/org/jetbrains/exposed/gradle/Detekt.kt:18-23` sets `buildUponDefaultConfig = true` with `ignoreFailures = false`. A Kotlin database library with a hard-failing detekt gate runs **zero** of the four coroutine correctness checks, including `GlobalCoroutineUsage`. |
| **KT-CORO-01** (corpus-wide) | `SuspendFunSwallowedCancellation` and `SuspendFunInFinallySection`: activated in **0/32**. The rule is a new commitment for the whole ecosystem, not a codified convention. |
| **JAVA-CONC-08** | `FasterXML/jackson-core` 2.17.0 (2024-03-12) shipped `newLockFreePool()` as the **default** `BufferRecycler` pool and reverted it in 2.17.1 (2024-05-04) — *"Revert #1117 … due to problems reported"* — then deprecated the pool in 2.18.0. The library that owns the extension point committed the exact blanket swap this rule forbids, in production, and had to back it out. Outside the 32-repo corpus; cited as the worked example the map's M-N-01 asked for. |
| **JAVA-CONC-17** (the plausible high-fan-out site) | `apache__kafka@940c100fab:core/src/main/java/kafka/server/share/SharePartition.java:93,393` — a `ReentrantReadWriteLock` guarding per-share-partition state under share-group consumer tracking. Concurrent reader counts were not independently measured, so this is a candidate site, not a demonstrated breach; no `StampedLock` adoption exists anywhere in the files sampled. |
| **JAVA-CONC-03** (confirms its precision) | `brettwooldridge/HikariCP` issue [#1463](https://github.com/brettwooldridge/HikariCP/issues/1463) — a maintainer reports a live JDK 24 deadlock in a `static` initializer, matching JEP 491's own documented "still pins" case. PRs [#2027](https://github.com/brettwooldridge/HikariCP/pull/2027) and [#2055](https://github.com/brettwooldridge/HikariCP/pull/2055) proposing the `synchronized` → `ReentrantLock` migration were both closed unmerged. Outside the corpus. |

### Would be falsely flagged by the naive rule

`micronaut-projects__micronaut-core@d5842045bb:buildSrc/src/main/groovy/io.micronaut.build.internal.convention-base.gradle:36` — `jvmArgs "--enable-preview"` inside `tasks.withType(Test)`, while the sibling `tasks.withType(JavaCompile)` block (lines 44-49) passes no preview compiler arg and `java { sourceCompatibility = VERSION_25 }`. This is the corpus's **only** `--enable-preview` occurrence (1/32) and it is inert: with no preview-dependent class file compiled, the runtime flag permits loading nothing. The process dive's proposed grep (`grep -rn 'StructuredTaskScope\|--enable-preview' … build.gradle.kts pom.xml` must be empty) would score this a violation; JAVA-CONC-05's verification reads the owning task instead. Same failure shape as the wave-2 correction to `GRADLE-DEP-05` — a raw-count grep flags the repo that gets it right.

### New commitments for the OCX SDK (JVM)

- **JAVA-CONC-09 through JAVA-CONC-14, wholesale.** M-Y-02 is `partial` coverage sourced only from `ocx-sdk-python`'s measured contract; none of the 32 exemplars is a JVM SDK that wraps an external CLI one command at a time. The SDK will be the fleet's first measurable instance of this pattern, and these six rows are what it should be measured against once it exists ([process](jvm-concurrency/process-and-cli-boundary.md) §Exemplar evidence).
- **JAVA-CONC-13's SHOULD half is the load-bearing one**: `onExit()` keeps the floor at 17. Adopting virtual threads here would move it to 21 for a fan-out this SDK does not perform. If the owner raises the floor to 21+ for an unrelated reason, JAVA-CONC-01/02 become live and this row relaxes.
- **JAVA-CONC-05 is unconditional for the SDK** — it is a published library; `--enable-preview` propagates to every consumer's compile *and* runtime on one exact feature release.
- **KT-CORO applies only if owner Q1 lands Kotlin-first.** The map's default (Java-first with a Kotlin-friendly surface) keeps the zero-dependency commitment; a Kotlin-first SDK pulls in `kotlinx.coroutines` and makes KT-CORO-01..13 binding on day one, including the detekt activation block.
- `JAVA-API-14`/`JAVA-API-15` (the sysexit enum, the zero-dep commitment) and `KT-API-07` (never widen a published `suspend fun`) are cited, not re-derived — a `suspend fun` compiles to a method with an extra `Continuation` parameter and is exactly as exposed to descriptor-mismatch `NoSuchMethodError` as any other published function.

### New commitments for the OCX Gradle plugin

- **JAVA-CONC-05 applies to the plugin's own sources** unchanged — a plugin jar is a published artifact.
- **The plugin does not hand-roll JAVA-CONC-10/11.** `ExecOperations` drains and reaps for it; the plugin-side spine is `GRADLE-PLUG-07/08/09` (`ValueSource` reads, `BuildService` holds, `ExecOperations` executes — a one-way dependency, per frame correction 40). JAVA-CONC-12's "one classified env seam" is the same discipline expressed on the other side of the boundary, and the two must agree on the `OCX_ENV_CLASSES` table (10 site / 4 translucent / 2 explicit / 5 pinned) or they will drift.
- **JAVA-CONC-14's retry placement is shared.** Sysexit 75 is retried below exception construction in both the SDK and the plugin, or the plugin's `fail()` messages will name a user action for a failure that was transient.

## AI-agent failure modes

Ranked by how often it bites, each with its mechanical check.

1. **Reading stdout fully, then stderr fully, then calling `waitFor()`.** The single most common process-handling bug in AI-generated Java — it looks obviously correct line by line and only deadlocks under output volume the demo never reaches. *Check:* JAVA-CONC-10's reading heuristic.
2. **`Executors.newFixedThreadPool(n, Thread.ofVirtual().factory())` "to limit concurrency."** Correct for platform threads, identical-looking for virtual ones, compiles, runs, and defeats the entire design. *Check:* JAVA-CONC-01's paired grep.
3. **Reaching for `@Volatile` on a shared counter.** The most-trained-on wrong answer in Kotlin concurrency: it is the correct fix for a *visibility* bug and does nothing for a compound `counter++`. *Check:* `@Volatile var` that is also a `++`/`+=` target.
4. **Forgetting `ProcessBuilder.environment()` starts pre-populated.** `pb.environment().put(k, v)` reads as "building an explicit environment" and is actually "adding one key to the ambient one". Compiles, runs, passes every test that does not assert the child's environment is minimal. *Check:* JAVA-CONC-12's `-A3` grep.
5. **Emitting a removed or renamed `StructuredTaskScope` member.** `new StructuredTaskScope.ShutdownOnFailure()` (gone since JDK 25), `allSuccessfulOrThrow()` treated as a stream (pre-26), `onTimeout()` on JDK-27 code (renamed `timeout()`). Models over-index on JDK-21-era blog posts. *Check:* JAVA-CONC-06's three named greps.
6. **Installing a `CoroutineExceptionHandler` on every `launch`/`async` "for safety."** Looks defensive, passes a naive read, and roughly half the handlers are dead code — all of the `async` ones, all of the nested ones. *Check:* KT-CORO-04's trace-one-call-site heuristic.
7. **Treating `runCatching { }` as the modern, safe Kotlin try/catch.** It is a blanket `catch (Throwable)` and swallows `CancellationException`. *Check:* KT-CORO-05's grep, restricted to files containing `suspend fun`.
8. **Citing `-Djdk.tracePinnedThreads` as the pinning diagnostic.** Every pre-JDK-24 source recommends it; it is now a silent no-op that produces false confidence. *Check:* JAVA-CONC-04's grep.
9. **"Fixing" a flagged `GlobalScope.launch(context, …)` by wrapping it in a locally-created `CoroutineScope` that is never cancelled** — trading a detekt warning for a real leak. *Check:* before rewriting, read whether the first argument already carries a `Job`; if it does, suppress with a comment, do not refactor.
10. **Reaching for virtual threads because "it is 2026."** Training data over-indexes on enthusiasm posts and under-indexes on JEP 444's own scoping. *Check:* count the actual concurrent invocations; on a bounded boundary this is a floor-raising decision with no payoff (JAVA-CONC-13).
11. **Conflating virtual threads' stability with structured concurrency's.** They shipped together in public attention, not in status: final since 21 versus preview at 27. *Check:* JAVA-CONC-05's grep.
12. **Assuming a passing `runTest` proves a race fix.** *Check:* KT-CORO-11's test-name-versus-dispatcher heuristic.
13. **Emitting detekt rule coordinates from memory.** The coroutines rules now live under `dev.detekt.rules.coroutines`, not `io.gitlab.arturbosch.detekt.rules.coroutines`; the old package will not compile against the current artifact. *Check:* read the project's actual detekt dependency group before naming any package in generated config.
14. **`ScopedValue.orElse(null)`.** Compiles on every JDK, throws `NullPointerException` since 25. *Check:* JAVA-CONC-07's grep.
15. **Importing `net.jcip.annotations.GuardedBy`.** The highest-value catch the residual dive found: the *Java Concurrency in Practice* package is what training data quotes, it compiles, it looks correct, and `GuardedByChecker` cannot see it. *Check:* `grep -rn 'import net.jcip.annotations' src/main/java` — any hit, regardless of whether Error Prone is wired.
16. **Believing `@ThreadSafe`'s own javadoc.** It names `ThreadSafeChecker` as its validator; that checker is registered in none of Error Prone's three built-in sets. An agent reporting "the linter enforces this" is stating something false. *Check:* no grep on the codebase settles it — the one-time read of `BuiltInCheckerSuppliers.java`'s import list does, which is exactly what frame correction 30 generalises.
17. **Saying "enable `DoubleCheckedLocking`" (or `DateFormatConstant`, or `FutureReturnValueIgnored`).** All three already run at `WARNING`; the flag is a **severity bump**. Advice that stops at "enable it" asks an agent to do nothing — the same failure frame correction 30 caught for `StringCaseLocaleUsage`. *Check:* the required text is `-Xep:<Name>:ERROR`.
18. **Tuning `-Djava.util.concurrent.ForkJoinPool.common.parallelism` to "help" virtual threads.** Both are `ForkJoinPool`s, and JEP 444 documents them as operationally distinct pools — FIFO carrier pool versus the LIFO common pool. The knob moves the wrong one. *Check:* reading heuristic — the property appearing anywhere near virtual-thread code is a question.
19. **Writing a `CompletableFuture` chain as a bare, unassigned statement** (`future.thenAccept(this::log);`) — the shape models produce for "kick off an async task", and the one whose eventual exception has no observer at all. A chain *returned* to a caller is correct and must not be flagged. *Check:* `-Xep:FutureReturnValueIgnored:ERROR` catches exactly the bare-statement form at compile time.

## Open questions

**Owner decisions**

1. **Q1 (Java-first or Kotlin-first for the OCX SDK) still gates half this file.** Java-first keeps JAVA-CONC-09..14 as written and makes KT-CORO advisory; Kotlin-first makes KT-CORO-01..13 binding, adds `kotlinx.coroutines` as a runtime dependency (breaking `JAVA-API-15`'s zero-dep claim), and re-opens JAVA-CONC-13 because a Kotlin SDK's async path would be `suspend`, not `CompletableFuture`.
2. **Does the JVM SDK offer an async surface at all?** `ocx-sdk-python` ships both because Python's ecosystem expects both. Whether JVM consumers expect a dual surface, or whether one blocking API plus `CompletableFuture.supplyAsync(…)` at the call site suffices, is unresolved and is an API-shape decision, not a concurrency one ([process](jvm-concurrency/process-and-cli-boundary.md) §Contested).
3. **Does the OCX Gradle plugin's env table share a source of truth with the SDK's?** JAVA-CONC-12 and `GRADLE-PLUG-07/08/09` both encode `OCX_ENV_CLASSES`; two hand-maintained copies will drift the way `JAVA-API-14` deliberately accepts for the sysexit enum. Accepting drift here is a decision, not an oversight.

**Subareas that deserve another research round**

1. **Kotlin `Flow`.** Map rows M-U-07 (an exception caught inside the builder, violating exception transparency) and M-U-10 (a `StateFlow` consumer assuming every emitted value is delivered, missing conflation) were explicitly out of the coroutines dive's scope. **Question:** does `Flow` need its own depth section with the `catch`-operator placement rule and the conflation contract, or do two rows in `coroutines.md` cover it?
2. **JDK 27 GA re-verification.** JDK 27 reached GA on 2026-09-15, three days after this file was written; every JEP 533 claim here describes the RC. **Question:** did the 7th preview's shape (`R_X`, `timeout()`, `awaitAll()` removed) ship unchanged, and is structured concurrency still targeted at JDK 28 for finalisation? JAVA-CONC-05/06 must be re-read against the GA javadoc, and JAVA-CONC-05's re-check trigger is the JEP header flipping from `Scope: Implementation` to `Scope: SE`.
3. **detekt's activation defaults on its next stable release.** The audited snapshot is a main-branch build mid-package-rename (`dev.detekt.*`). **Question:** do the four coroutine rules stay `active: false` in the first stable release from that branch? KT-CORO-01's whole premise is that they do.
4. **Does `ThreadSafeChecker` get wired on a later Error Prone release?** The gap in verdict 12 is exactly the kind upstream fixes silently. **Question:** re-read `BuiltInCheckerSuppliers.java`'s import list on any Error Prone bump past 2.36.0 — if `ThreadSafeChecker` appears, `JAVA-CONC-16`'s "`@ThreadSafe` is prose only" clause inverts.

## Revision log

| Date | Change | IDs touched | Why |
|---|---|---|---|
| 2026-09-12 | Folded in `jvm-concurrency/java-concurrency-residual-rows.md`; added it to `consolidates`, added `revised:`, widened `map_rows` to M-N-01..M-N-11. | — | The follow-up round this file commissioned in its own open question 1. |
| 2026-09-12 | **Added** three rules for the residual map rows: pool regime by workload (M-N-05 + M-N-06's sizing half), checker-recognised thread-safety annotations (M-N-10), the `ReentrantReadWriteLock` hold ceiling (M-N-11). | JAVA-CONC-15, -16, -17 | JEP 444 states the CPU-bound exclusion textually; `GuardedByChecker`/`ImmutableChecker` are `ENABLED_ERRORS` but nothing makes an agent write the annotation; the 65535 ceiling now has a primary-source citation. |
| 2026-09-12 | **Amended in place:** `ForkJoinPool.ManagedBlocker` added as the one named exception to "no blocking callback on the common pool", and the rationale now records that `CompletableFuture`'s no-executor `…Async` default *is* that same pool. | JAVA-CONC-13 | The unconditional prohibition overclaimed — the JDK ships a sanctioned escape hatch that expands pool parallelism for the blocking call's duration. Fixing an overclaimed guarantee, not adding a nuance. |
| 2026-09-12 | **Corrected a wrong number:** the ceiling is 65535 read and 65535 recursive write holds, not "65,536-reader". Removed from Open questions where the wrong figure lived. | JAVA-CONC-17 (new), old open question 1 (removed) | `ReentrantReadWriteLock` javadoc, "Implementation Notes", JDK 21 — a primary source replacing the newsletter the map flagged as thin. |
| 2026-09-12 | **Verdict extended** with the 3/3/1 adjudication, the severity-bump-not-activation finding, the `@ThreadSafe` and `net.jcip` gaps, the corrected ceiling, and two documented GAPs (one-sided corpus evidence for JAVA-CONC-15; the `JAVA-LINT` handoff this file cannot make itself). | verdicts 10–16 | The round settled the question rather than answering it with rules alone; gaps are recorded as gaps per the revision contract. |
| 2026-09-12 | **Conflict resolved against the new dive.** Its aside that structured concurrency is "still preview as of JDK 25, JEP 505 in JDK 25" is stale against the virtual-threads dive's seven-preview changelog (JEP 505 / 525 / 533, finalisation targeted at 28). No rule text changed. | JAVA-CONC-05, -06 (unchanged) | Primary-source changelog outranks a passing status sentence in a Contested section. |
| 2026-09-12 | **Six AI-agent failure modes added**, and four exemplar rows (three satisfied, one candidate violation). | JAVA-CONC-13, -15, -16, -17 | The jcip mis-import and the "enable vs bump" confusion are both silent no-ops an agent cannot self-detect. |
| 2026-09-12 | Open question 1 removed (answered); survivors renumbered 1–3; a new question 4 added on Error Prone's next release. | — | Renumbering open questions is safe — they are not rule IDs. |

## Sub-artifacts

- [java-virtual-threads-and-structured-concurrency.md](jvm-concurrency/java-virtual-threads-and-structured-concurrency.md) — JEP 444/491/506/525/533 read as primary sources: the never-pool absolutes, exactly what JDK 24 fixed and what still pins, the `tracePinnedThreads` removal, `ScopedValue`'s one finalisation change, and the full `StructuredTaskScope` changelog across seven previews.
- [kotlin-coroutines-correctness.md](jvm-concurrency/kotlin-coroutines-correctness.md) — JetBrains' own wrong/right pairs turned into greppable rows: handler-root-only, `async` versus `launch`, `CancellationException` transparency, cooperative cancellation, `Dispatchers.IO`'s ceiling and non-additive views, the `@Volatile`-is-not-a-fix ladder, and what `runTest`'s virtual time cannot catch.
- [java-concurrency-residual-rows.md](jvm-concurrency/java-concurrency-residual-rows.md) — the wave-4 adjudication of M-N-05..M-N-11 against `BuiltInCheckerSuppliers.java` read directly: which rows are rules, which are severity bumps, which are subsumed; the five recognised `@GuardedBy` packages; the unregistered `ThreadSafeChecker`; and the `ReentrantReadWriteLock`/`StampedLock` primary sources.
- [process-and-cli-boundary.md](jvm-concurrency/process-and-cli-boundary.md) — `ocx-sdk-python`'s `_process.py` contract translated to the JVM: the injectable launcher seam, concurrent drains, the kill ladder's POSIX/Windows asymmetry and the `descendants()` gap, explicit child-environment construction, and why the async path is `onExit()` rather than virtual threads.

## Key sources

| URL | What it settles here |
|---|---|
| [openjdk.org/jeps/444](https://openjdk.org/jeps/444) | "A new virtual thread should be created for every application task" / "should never be pooled" / "use semaphores" — JAVA-CONC-01, and the fan-out framing behind JAVA-CONC-02 |
| [openjdk.org/jeps/491](https://openjdk.org/jeps/491) | The JDK 24 monitor fix, the three cases it did **not** fix, the `tracePinnedThreads` removal, and the JCIP-quoting post-24 default — JAVA-CONC-03, JAVA-CONC-04 |
| [openjdk.org/jeps/12](https://openjdk.org/jeps/12) | The class-file `minor_version` mechanism and the exact-feature-release pinning that makes JAVA-CONC-05 a technical constraint rather than a style preference |
| [openjdk.org/jeps/525](https://openjdk.org/jeps/525) | The JDK 26 `StructuredTaskScope`/`Joiner` shape and the preview history back to JDK 19 — JAVA-CONC-06 |
| [openjdk.org/jeps/533](https://openjdk.org/jeps/533) | The JDK 27 shape (`R_X`, `timeout()`, `awaitAll()` removed) — the row to re-verify against GA |
| [openjdk.org/jeps/506](https://openjdk.org/jeps/506) | `ScopedValue` finalised in JDK 25 with `orElse` no longer accepting `null` — JAVA-CONC-07 |
| [Process — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Process.html) | The stdout/stderr deadlock warning verbatim, `destroy()`/`destroyForcibly()` platform dependence, `descendants()`, `onExit()`'s semantics — JAVA-CONC-10, 11, 13 |
| [ProcessBuilder — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ProcessBuilder.html) | `environment()` returns "a copy of the current process environment" — the whole basis of JAVA-CONC-12 |
| [kotlinlang.org/docs/exception-handling.html](https://kotlinlang.org/docs/exception-handling.html) | Handler-root-only, `async` capture into the `Deferred`, `supervisorScope` versus `SupervisorJob`, first-exception-wins with `.suppressed` — KT-CORO-04, KT-CORO-05 |
| [kotlinlang.org/docs/coroutines-cancellation.html](https://kotlinlang.org/docs/coroutines-cancellation.html) | Cooperative cancellation, `isActive`/`ensureActive`/`yield`, `NonCancellable` in `finally` — KT-CORO-08, KT-CORO-09 |
| [kotlinlang.org/docs/shared-mutable-state-and-concurrency.html](https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html) | "Volatile variables … do not provide atomicity of larger actions" and the five-fix ladder, plus the `massiveRun` stress-test shape — KT-CORO-07, KT-CORO-11 |
| [Dispatchers.IO KDoc](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-dispatchers/-i-o.html) | The `max(64, cores)` ceiling, `kotlinx.coroutines.io.parallelism`, and the elastic-view guarantee — KT-CORO-06 |
| [kotlinx-coroutines-test README](https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-test/README.md) | `runTest`'s three properties, `Standard` versus `Unconfined` dispatchers, `backgroundScope` — KT-CORO-11, 12, 13 |
| [detekt default-detekt-config.yml @45672efb8b](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-core/src/main/resources/default-detekt-config.yml) | The only source for which coroutine rules ship `active: false` — the entire premise of KT-CORO-01 |
| [jackson-core issue #919](https://github.com/FasterXML/jackson-core/issues/919) + [VERSION-2.x](https://raw.githubusercontent.com/FasterXML/jackson-core/2.19/release-notes/VERSION-2.x) | The `ThreadLocal`-versus-virtual-threads conflict and the 2.17.0 → 2.17.1 default revert — JAVA-CONC-08's worked example |
| [BuiltInCheckerSuppliers.java](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java) | The one file that settles ENABLED_ERRORS / ENABLED_WARNINGS / DISABLED_CHECKS for every check this program names — `GuardedByChecker`:790, `ImmutableChecker`:794, `DateFormatConstant`:972, `DoubleCheckedLocking`:982, `ErroneousThreadPoolConstructorChecker`:997, `FutureReturnValueIgnored`:1015, `SynchronizeOnNonFinalField`:1184, and `ThreadSafeChecker` absent — verdicts 11 and 12, JAVA-CONC-16 |
| [GuardedByUtils.java](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/bugpatterns/threadsafety/GuardedByUtils.java) | Lines 70-75: the exact five recognised `@GuardedBy` packages, and the absence of `net.jcip.annotations` — JAVA-CONC-16's MUST half |
| [ReentrantReadWriteLock — Java SE 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantReadWriteLock.html) | "Implementation Notes": 65535 recursive write locks and 65535 read locks, *"attempts to exceed these limits result in `Error` throws"* — JAVA-CONC-17, and the correction to this file's earlier "65,536" |
| [StampedLock — Java SE 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/StampedLock.html) | `asReadWriteLock()`'s three lost behaviours — no `Condition`, not reentrant, no ownership — the reason JAVA-CONC-17 forbids a blind swap |
| [ForkJoinPool — Java SE 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ForkJoinPool.html) + [CompletableFuture](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html) | `commonPool()`'s CPU-bound scoping, the `ManagedBlocker` escape hatch, and *"all async methods without an explicit Executor argument are performed using `ForkJoinPool.commonPool()`"* — JAVA-CONC-13's amendment and JAVA-CONC-15 |
| [findbugs.xml (spotbugs/spotbugs)](https://github.com/spotbugs/spotbugs/blob/master/spotbugs/etc/findbugs.xml) | `FindDoubleCheck` carries no `disabled="true"` — `DC_DOUBLECHECK` runs the moment `JAVA-LINT-10` wires SpotBugs at all; verdict 11's second half |

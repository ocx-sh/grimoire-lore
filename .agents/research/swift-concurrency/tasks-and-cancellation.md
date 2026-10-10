---
title: "Tasks, cancellation, continuations and GCD in async code (SW-CONC)"
topic: swift/concurrency/tasks-and-cancellation
agent: W2-2 tasks-and-cancellation
model: sonnet
date_researched: 2026-10-10
sources_count: 26
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/tasks-and-cancellation/
scope: >
  Covers unstructured Task ownership and Task.detached, the swallowed-error diagnostics (NoUseUnstructuredThrowingTask, unhandled_throwing_task),
  cancellation observers, continuations, timeouts while SE-0526 withDeadline is absent, GCD and blocking calls in async code, off-pool blocking work,
  AsyncStream buffering, task-group growth, actor reentrancy, cleanup after cancellation (SE-0493 + SE-0504), close()/shutdown contracts.
  Linux only (swift:6.4 and swift:6.3 containers, x86_64, 32 cores). Apple, Windows and Android behaviour is "unverified: read only" (owner Q7).
  Not covered: isolation/Sendable escape hatches (W2-1), MainActor defaults, Swift Testing of concurrent code (W2-5), subprocess teardown (W2-11).
---

# Tasks, cancellation, continuations and GCD in async code

Researched 2026-10-10 against Swift 6.4.0 (released 2026-09-14) and 6.3.x. Every runtime claim below was produced by a fixture under
`/home/mherwig/.cache/research-lang/swift-tools/fixtures/tasks-and-cancellation/` (called `fixtures/` below), each built in Swift 6 language mode with
`~/.cache/research-lang/swift-tools/run.sh`, `SWIFT_VERSION=6.4` and `6.3`. Raw outputs: `fixtures/results-6.4.txt`, `results2-6.4.txt`, `results-6.3.txt`, `results2-6.3.txt`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Unstructured tasks: inheritance, ownership, and what the compiler and SwiftLint each catch](#1-unstructured-tasks)
   2. [Task.detached](#2-taskdetached)
   3. [What observes cancellation and what does not](#3-what-observes-cancellation)
   4. [Continuations](#4-continuations)
   5. [GCD and blocking calls in async code; LIBDISPATCH_COOPERATIVE_POOL_STRICT](#5-gcd-and-blocking-calls)
   6. [Timeouts while withDeadline is absent](#6-timeouts)
   7. [Off-pool pattern for blocking work](#7-off-pool-pattern)
   8. [AsyncStream buffering](#8-asyncstream-buffering)
   9. [Task groups: growth, discarding, throttling](#9-task-groups)
   10. [Actor reentrancy](#10-actor-reentrancy)
   11. [Cleanup after cancellation: async defer and shields](#11-cleanup-after-cancellation)
   12. [close()/shutdown() contract and deinit](#12-closeshutdown-contract)
   13. [Completion-handler bridging](#13-completion-handler-bridging)
   14. [Crash signals and exit codes](#14-crash-signals-and-exit-codes)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A bare statement `Task { ... }` (no binding, no `return`, no `_ =`) is the ownership violation to grep for; it is invisible to the compiler and to SwiftLint when the body does not throw.
- Swift 6.4 added warning group `NoUseUnstructuredThrowingTask` (SE-0520); it fires on `Task`, `Task.detached` and `Task.immediate` with a throwing body that is not stored or discarded. It does not exist in 6.3 (build says `unknown warning group`). Promote it with `.treatWarning("NoUseUnstructuredThrowingTask", as: .error)` (manifest tools 6.2+) or `-Xswiftc -Werror -Xswiftc NoUseUnstructuredThrowingTask`.
- The compiler and SwiftLint `unhandled_throwing_task` are complementary, not redundant: measured on one file the compiler flagged `Task.detached` and `Task.immediate` but not `Task { try ... }.cancel()`; SwiftLint flagged only the last. `unhandled_throwing_task` is opt-in (default off).
- `Task {}` inherits actor isolation, priority and task-locals; `Task.detached` inherits none of them; neither inherits the parent's cancellation. An unstructured task outlives a cancelled parent, so someone must own and cancel it.
- Only `Task.sleep`, `clock.sleep`, `Task.checkCancellation()`, `Task.isCancelled` and `for await` over an `AsyncStream` observe cancellation. `read(2)`, libc `sleep`, `Thread.sleep`, `DispatchSemaphore.wait`, `Process.waitUntilExit`, a parked continuation and a CPU loop without a check all ignore it (measured: 1000 ms vs 200 ms).
- `try? await Task.sleep(...)` inside `while true` turns cancellation into a hot spin (measured 18,426 iterations in 500 ms after cancel) and the loop never ends.
- A continuation must be resumed exactly once on every path. A leak hangs forever (`timeout` exit 124; the runtime only logs `SWIFT TASK CONTINUATION MISUSE ... leaked`), a double resume of a checked continuation traps (SIGILL, exit 132 on x86_64), an unsafe continuation gives no diagnostic at all (leak) or heap corruption (double resume, exit 134).
- `withTaskCancellationHandler` runs `onCancel` immediately and before the body when the task is already cancelled (SE-0304); a continuation stored in the body is not yet visible to `onCancel`, so a handler-plus-continuation needs a pre-cancel check (measured: hang without it, exit 124).
- `DispatchSemaphore.wait()`, `DispatchGroup.wait()`, libc `sleep`/`usleep`, `DispatchQueue.sync` and `Process.waitUntilExit` compile cleanly in async code on 6.3 and 6.4. Only `Thread.sleep`, `NSLock.lock/unlock` and `NSCondition.lock/unlock` are compile errors (noasync). The GCD-in-async grep is therefore mandatory.
- `LIBDISPATCH_COOPERATIVE_POOL_STRICT=1` has no effect on Linux: the string is absent from the 6.4 `libdispatch.so`, and the semaphore plant did not deadlock under it. On Linux the cooperative pool is as wide as the core count (31 blocked tasks passed, 32 hung on a 32-core host); test pool starvation by blocking `ncores` tasks, not with the variable.
- A `Task {}` created from `@MainActor` code (including top-level code in `main.swift`) inherits the main actor, so `semaphore.wait()` inside it blocks the main thread and deadlocks deterministically (exit 124).
- A task-group timeout race (the containerization `Timeout.run` shape) does not stop non-cooperative work: with a 1 s limit around a 4 s blocking `read(2)` the caller got `TimedOut` at 4000 ms, not 1000 ms. An unstructured race returns at 1000 ms but leaves the read running (orphan finished at 4000 ms). Only a cancellable off-pool read returned at 1000 ms.
- `withDeadline` (SE-0526) is "Accepted with modifications" (2026-07-30) and is expected in 6.5; it does not exist in 6.4 (`cannot find 'withDeadline' in scope`). Until then use a structured race with its own `TimeoutError`, never `CancellationError`.
- `AsyncStream` defaults to `.unbounded` (SE-0314). A 100,000 x 4 KiB producer against a 10 ms consumer peaked at 416,220 KiB RSS unbounded versus 11,404 KiB with `.bufferingNewest(8)`; 75 of 78 exemplar streams take the default.
- A `withTaskGroup` that never drains results held 1,089,664 KiB for 200,000 finished children; `withDiscardingTaskGroup` held 17,836 KiB, a 64-wide window 17,512 KiB. Discarding groups do not bound live children: 200,000 sleeping children still cost 641,392 KiB.
- Actor methods that read state, `await`, then write it are racy by construction (reentrancy): 10 concurrent withdrawals drove a balance of 100 to -500; mutate before the suspension point or store an in-flight `Task`.
- Swift 6.4 (SE-0493 + SE-0504) makes `defer { await withTaskCancellationShield { await r.close() } }` the supported cleanup form; on 6.3 `await` in `defer` is a compile error, and `defer { Task { await close() } }` leaves cleanup running after the owning task has already finished.
- `deinit { Task { await self.close() } }` is a compile error (`capture of 'self' in a closure that outlives deinit`); `deinit { let w = wire; Task { await w.close() } }` compiles but the close was lost when the process ended right after (measured). Resources need an explicit awaited `close()`/`shutdown()` or a scoped `with...` API.
- SwiftLint 0.65.1's static Linux binary skips `custom_rules` ("requires SourceKit and SourceKit access is prohibited") and exits 0 on planted violations: do not rely on `custom_rules` as a Linux gate; use the greps in this file.

## Findings

### 1. Unstructured tasks

**Inheritance.** `Task {}` inherits priority, task-local values and actor isolation from the creating context; `Task.detached {}` inherits none of them ([SE-0304 context inheritance](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md#L475), [detached](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md#L493)). Neither inherits cancellation: plant `fixtures/h-detached` (6.4 and 6.3 identical) printed

```text
Task{} child      : requestID=req-42 priority=17 cancelled=false
Task{} (MA-isolated): requestID=req-42 priority=21 cancelled=false
Task.detached     : requestID=none priority=21 cancelled=false
after parent.cancel(): Task{} sees cancelled=false, Task.detached sees cancelled=false
```

Structured children (`async let`, groups) do get cancelled with the parent ([TSPL](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Concurrency.md#L566): "When a parent task is canceled, each of its child tasks is also automatically canceled"). So an unstructured task survives its creator's cancellation and must have an owner. The exemplar corpus shows the cost: 709 of 882 `Task {}` are bare statements, and only 88 of 159 stored handles are cancelled by name in the same file ([conc audit](../swift-audit/exemplar-concurrency.md), tasks section, a 55% floor).

**Ownership forms** (the rule this file recommends, see SW-CONC-T01):

```swift
// WRONG: statement-position Task. Nobody can cancel it, nobody sees its error.
func start() { Task { await self.poll() } }

// RIGHT: stored, with a cancel on the owner's shutdown path (Nuke TaskQueue.swift:174 shape)
final class Poller {
    private var task: Task<Void, Never>?
    func start() { task = Task { await self.poll() } }
    func stop()  { task?.cancel(); task = nil }
}

// RIGHT: returned, or awaited by the creating scope
func makeTask() -> Task<Int, Never> { Task { await compute() } }
let v = await Task { await compute() }.value

// RIGHT only for callback-to-async bridges (UI action, onGracefulShutdown), errors handled inside, reason on the line
_ = Task { await shutdownAll() }   // fire-and-forget: sync callback cannot await; shutdownAll() handles its own errors
```

**Swallowed errors.** `Task.init` carries `@discardableResult`, so `Task { try await f() }` drops the error silently ([SE-0304](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md#L704)). SE-0520 (Implemented in Swift 6.4) adds warning group `NoUseUnstructuredThrowingTask` for unused throwing `Task.init`, `Task.detached`, `Task.immediate` ([SE-0520](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0520-discardableresult-task-initializers.md); [group doc](https://github.com/swiftlang/swift/blob/main/userdocs/diagnostics/no-use-throwing-unstructured-task.md)). Measured with plant `fixtures/f-throwing-task` and `fixtures/f2-throwing-variants`:

| Form | swiftc 6.4 | swiftc 6.3 | SwiftLint 0.65.1 `unhandled_throwing_task` |
|---|---|---|---|
| `Task { try await work() }` statement | warns (group `NoUseUnstructuredThrowingTask`) | silent; with the setting `unknown warning group` | fires (error severity) |
| `Task.detached { try await work() }` statement | warns | silent | does NOT fire |
| `Task.immediate { try await work() }` statement | warns | n/a (immediate is 6.2+, no group) | does NOT fire |
| `Task { try await work() }.cancel()` | does NOT warn (handle consumed) | silent | fires |
| `_ = Task { try await work() }`, `let t = Task {...}`, `Task { try? ... }`, `Task { try! ... }`, `Task { do {} catch {} }` | silent | silent | silent |
| `Task { () throws(Boom) in throw Boom() }` | swift-frontend crashes in IRGen (6.3 and 6.4, `fixtures/f3-typed-throws-crash`) | same crash | not run |

The rule is opt-in: `Enabled by default: No`, default severity `error` ([SwiftLint rule page](https://realm.github.io/SwiftLint/unhandled_throwing_task.html); source `SwiftLint@ec4691d9e813:Source/SwiftLintBuiltInRules/Rules/Lint/UnhandledThrowingTaskRule.swift:4`). Neither tool flags a non-throwing bare `Task {}` and neither flags `_ = Task { throwing }`, so ownership needs the grep in SW-CONC-T01.

Promoting the compiler group (needs `// swift-tools-version: 6.2` for the `treatWarning` API; a 6.0 manifest says `'treatWarning(_:as:_:)' is unavailable`):

```swift
.target(name: "App", swiftSettings: [
    .swiftLanguageMode(.v6),
    .treatWarning("NoUseUnstructuredThrowingTask", as: .error),   // 6.4 toolchains; 6.3 prints "unknown warning group" and continues
])
```

### 2. Task.detached

`Task.detached` drops actor isolation, priority and task-locals (measured above: `requestID=none`). It was the pre-6.2 idiom for "get off the main actor"; since SE-0461 the supported spelling is a `nonisolated` async function (runs on the global executor when `NonisolatedNonsendingByDefault` is off) or `@concurrent` ([SE-0461](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md)). Massicotte lists `Task.detached` among "problematic patterns": "Detached tasks do not inherit priority or task-local values" ([Problematic Swift Concurrency Patterns](https://www.massicotte.org/problematic-patterns), updated 2026-04-27). In the exemplars it is rare (34 uses in 9 repos) and mostly for priority: `sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SourceKitDCore.swift:82` (`Task.detached(priority: .background)`). Neither SwiftLint nor swiftc flags a non-throwing `Task.detached` ([fail scout §2.14](../swift-topic-map/failure.md)); only grep does.

### 3. What observes cancellation

Cancellation is cooperative and synchronous: "cancellation has no effect at all unless something checks for cancellation" ([SE-0304](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md#L394); [TSPL Task Cancellation](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Concurrency.md#L655)). Plant `fixtures/l-cancel-observers` starts each primitive in a `Task`, cancels at 200 ms and reports completion time (6.4; 6.3 identical within 3 ms):

| Primitive (1 s long) | Finished after | Observes cancellation |
|---|---|---|
| `Task.sleep(for:)`, `ContinuousClock().sleep(for:)` | 200 ms, throws `CancellationError` | yes |
| `for await` over a never-yielding `AsyncStream` | 200 ms, returns normally (loop just ends) | yes, silently |
| CPU loop with `try Task.checkCancellation()` | 200 ms, throws | yes |
| CPU loop with `if Task.isCancelled { break }` | 200 ms, returns normally | yes |
| `Task.yield()` loop | 1000 ms | no |
| `withCheckedContinuation` parked on a callback | 1000 ms | no |
| libc `sleep(1)`, `Thread.sleep` (via sync helper), `DispatchSemaphore.wait(timeout:)` | 1000 ms | no |
| `read(2)` on a pipe, `Process.waitUntilExit()` | 1000 ms | no |
| CPU loop without a check | 1000 ms | no |

A `for await` that ends because of cancellation returns normally, so code after the loop cannot tell "stream finished" from "cancelled" without checking `Task.isCancelled`.

**`try?` on a cancellation point turns cancel into a hot loop.** Plant `fixtures/r-trysleep`: `while true { try? await Task.sleep(for: .milliseconds(50)); tick() }` ran 3 ticks before cancel and 18,426 ticks in the 500 ms after (6.3: 17,686), because `Task.sleep` throws immediately on a cancelled task. `while !Task.isCancelled { try await Task.sleep(...) }` ran 1 tick after cancel. Exit 1 (red) versus 0 (green).

`withTaskCancellationHandler(operation:onCancel:)` runs `onCancel` immediately when cancellation happens, even if the operation never checks, and "if the task has already been cancelled at the point `withTaskCancellationHandler` is called, the cancellation handler is invoked immediately, before the `operation` block is executed" ([SE-0304 cancellation handlers](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md#L885)). Under a shield (SE-0504) the static `Task.isCancelled`, `Task.checkCancellation` and `withTaskCancellationHandler` do not observe the outer cancellation; the instance `task.isCancelled` does ([SE-0504](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md)).

### 4. Continuations

[SE-0300](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0300-continuation.md) (Implemented 5.5) requires every continuation to be resumed exactly once. Plants `fixtures/a-continuation` and `fixtures/a2-continuation-cancel` (6.4 and 6.3 identical):

| Plant | Result |
|---|---|
| checked, never resumed | runtime logs `SWIFT TASK CONTINUATION MISUSE: value(mode:) leaked its continuation without resuming it. This may cause tasks waiting on it to remain suspended forever.`; the awaiting task hangs; `timeout 20` exit **124** |
| checked, resumed once | `value=1`, exit **0** |
| checked, resumed twice | `_Concurrency/CheckedContinuation.swift:169: Fatal error: SWIFT TASK CONTINUATION MISUSE: value(mode:) tried to resume its continuation more than once, returning 2!`, `Signal 4`, `Illegal instruction`, exit **132** (128 + SIGILL 4, x86_64 Linux; identical with `SWIFT_BACKTRACE=enable=no`) |
| unsafe, never resumed | no log line at all, hangs, exit **124** |
| unsafe, resumed twice | no `CONTINUATION MISUSE` message; `freed pointer was not the last allocation`, exit **134** (SIGABRT, allocator corruption: undefined behaviour, not a contract) |
| checked, parked on a callback, task cancelled at 200 ms | cancellation does not wake it; exit **124** |
| same, wrapped in `withTaskCancellationHandler` with a once-guard that resumes `CancellationError` | `threw CancellationError()`, exit **0** |
| same, task already cancelled when it reaches `withTaskCancellationHandler`, no pre-check | `onCancel` ran before the continuation was stored, found nothing, and the body then parked forever: exit **124** |
| same with `if Task.isCancelled { once.take()?.resume(throwing: CancellationError()) }` after storing | `threw CancellationError()`, exit **0** |

Correct and incorrect:

```swift
// WRONG: handler registration may never fire, and cancellation cannot wake the task
func next() async -> Event {
    await withCheckedContinuation { c in source.onEvent { c.resume(returning: $0) } }
}

// RIGHT: once-guard, cancellation handler, and the already-cancelled check after storing
func next() async throws -> Event {
    let slot = OnceSlot<Event>()                       // Mutex<CheckedContinuation<Event, Error>?> inside
    return try await withTaskCancellationHandler {
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Event, Error>) in
            slot.store(c)
            source.onEvent { slot.take()?.resume(returning: $0) }   // take() makes resume at-most-once
            if Task.isCancelled { slot.take()?.resume(throwing: CancellationError()) }
        }
    } onCancel: {
        slot.take()?.resume(throwing: CancellationError())
    }
}
```

The exemplar that gets this right uses the same two-phase shape with a token: `swift-async-algorithms@cbde9aed744b:Sources/AsyncStreaming/DuplexChannel/DuplexAsyncChannel.swift:353-358` (`withTaskCancellationHandler` around `withUnsafeThrowingContinuation`, `onCancel: { storage.cancelProducer(callbackToken: token) }`). The exemplar that gets it wrong is containerization's `AsyncLock`: waiters use `withCheckedContinuation` with no cancellation handler (`apple/containerization@3e7bc39e66b3:Sources/ContainerizationExtras/AsyncLock.swift:40`), so a cancelled task waiting for the lock stays queued until the holder releases.

Do not resume under a lock or inside an actor-isolated critical region; `Mutex.withLock { take }` then resume outside, as in the `take()` above ([fail scout §2.8](../swift-topic-map/failure.md) records SwiftPM#10405/#10403 for the lock-held-resume class; not re-measured here).

### 5. GCD and blocking calls

**Compiler coverage (noasync), plant `fixtures/p-noasync`, identical on 6.3 and 6.4:** errors `unavailable from asynchronous contexts` for `Thread.sleep` (`class method 'sleep' is unavailable from asynchronous contexts`), `NSLock.lock`/`unlock` and `NSCondition.lock`/`unlock` (`Use async-safe scoped locking instead`). No diagnostic at all for `DispatchSemaphore.wait(timeout:)`, `DispatchGroup.wait()`, libc `sleep`, `usleep`, `DispatchQueue.sync`, `Process.waitUntilExit()`, `FileManager.contents(atPath:)`. Hiding `Thread.sleep` inside a plain synchronous helper also passes (`fixtures/l-cancel-observers`). SwiftLint has no rule for any of them ([fail scout §2.14](../swift-topic-map/failure.md)).

**Deadlocks measured, plant `fixtures/c-semaphore` (6.4 and 6.3 identical):**

| Plant | Exit |
|---|---|
| consumer `Task { sem.wait() }` and producer `Task { sem.signal() }` created inside a nonisolated async function | 0 (pool has spare threads) |
| the same two tasks created from `main.swift` top-level code (`@MainActor`, so both `Task {}` inherit the main actor) | **124**, deterministic |
| the continuation twin of that main-actor shape (`cont-main`) | **0** |
| 64 consumers blocking in `sem.wait()` before one producer | **124** |
| N consumers blocking before one producer: N = 31 / N = 32 | **0** / **124** (host has 32 cores; the cooperative pool is core-count wide and not affected by `taskset`) |

**`LIBDISPATCH_COOPERATIVE_POOL_STRICT=1`.** The brief expected the semaphore plant to deadlock under it. It did not on Linux: the one-consumer plant exited 0 with and without the variable, and every other plant's result was identical with and without. `strings /usr/lib/swift/linux/libdispatch.so` in the 6.4 image lists `LIBDISPATCH_LOG` and `LIBDISPATCH_STRICT` but not `LIBDISPATCH_COOPERATIVE_POOL_STRICT`. On Apple platforms the variable is part of the debug runtime Apple recommends for finding forward-progress violations ([WWDC21 10254](https://developer.apple.com/videos/play/wwdc2021/10254/): "this runs your app under a modified debug runtime, which enforces the invariant of forward progress"; the variable name itself is on a slide and was not verified in the transcript). Apple behaviour: unverified, read only. Consequence: on Linux CI there is no strict mode; saturate the pool deliberately (`ncores` blocking tasks, see `many` above) or rely on the grep.

The runtime contract being protected: "Unlike GCD's concurrent queues, which will spawn more threads when work items block, with Swift threads can always make forward progress" and "primitives like semaphores and condition variables are unsafe to use with Swift concurrency" (same session). Practitioner positions differ in strength: "Don't use `DispatchSemaphore` or `DispatchGroup` to wait on async work ... you are eventually going to deadlock" (Massicotte, [Problematic patterns](https://www.massicotte.org/problematic-patterns)) versus "GCD is still here and you should not be afraid to use it" for moving blocking work off the pool ([Stateless Actors](https://www.massicotte.org/stateless-actors/), 2026-05-29). They agree on the verdict: no waiting on async work with a semaphore; blocking work belongs off the cooperative pool (section 7).

Exemplar baseline: 20 blocking waits in 8 repos, none inside an `async` function except the one `noasync` bridge `swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/ConcurrencyHelpers.swift:28-40` (`@available(*, noasync, message: "This method blocks the current thread indefinitely...")`). GCD in the corpus is an app/community-library phenomenon: 550 `DispatchQueue` (Alamofire 126, element-x-ios 190), `DispatchQueue.main.async` 76, `MainActor.run` 23 ([conc audit](../swift-audit/exemplar-concurrency.md)).

### 6. Timeouts

`withDeadline` (SE-0526) takes a `ContinuousClock` instant, cancels the operation at the deadline and "waits for the operation to return"; "If deadline expires and operation completes successfully: Returns the operation result" ([SE-0526](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0526-deadline.md)). Status "Accepted with modifications" announced 2026-07-30; John McCall: "it's expected in 6.5" ([forum acceptance](https://forums.swift.org/t/accepted-with-modifications-se-0526-withdeadline/88645)). Plant `fixtures/n-withdeadline` on 6.4: `error: cannot find 'withDeadline' in scope`, exit 1. The WWDC26-era claim that it ships in 6.4 is wrong.

The exemplar shape is `apple/containerization@3e7bc39e66b3:Sources/ContainerizationExtras/Timeout.swift:26-41`: task group, second child `Task.sleep` then `throw CancellationError()`, `group.next()` with `fatalError()` on nil, `cancelAll()`. Three defects, all measured or visible in the source:

1. A group does not return until all children finish, so it cannot stop work that ignores cancellation. Plant `fixtures/d-timeout-race` (1 s limit, work needs 4 s, run on 6.4 and 6.3):

   | Mode | Caller sees the timeout at | What the work does |
   |---|---|---|
   | `coop` (`Task.sleep`) | 1000 ms | cancelled |
   | `blocking-group` (`read(2)` in the task) | **4000 ms** (`op: read returned 1` at 4000 ms, then `caller got TimedOut()`) | runs to completion |
   | `blocking-unstructured` (continuation race with two unstructured tasks) | 1000 ms | **keeps running**: `op: read returned 1` printed at 4000 ms, 3 s after the caller moved on |
   | `blocking-offpool` (pthread + `poll` on {fd, wake pipe}, `onCancel` writes the wake pipe) | 1000 ms | cancelled, no read |

2. A timeout reported as `CancellationError` is indistinguishable from the caller's own cancellation; containerization callers must re-derive it with `if Task.isCancelled { throw error }` (`containerization@3e7bc39e66b3:Sources/Containerization/LinuxProcess.swift:185-199`, comment "A cancelled sibling — or a cancelled caller — lands here too").
3. `fatalError()` on an empty group is unreachable but violates the no-trap rule for library code.

Recommended stop-gap while `withDeadline` is absent, plant `fixtures/o-timeout-pattern` (6.4 and 6.3):

```swift
struct TimeoutError: Error, Equatable {}

func withTimeout<T: Sendable>(
    _ limit: Duration, clock: ContinuousClock = ContinuousClock(),
    _ operation: @escaping @Sendable () async throws -> T
) async throws -> T {
    try await withThrowingTaskGroup(of: T?.self) { group in
        group.addTask { try await operation() }
        group.addTask { try await clock.sleep(for: limit); return nil }     // nil == deadline fired
        var timedOut = false
        do {
            for try await result in group {
                if let value = result { group.cancelAll(); return value }
                timedOut = true; group.cancelAll()              // cancel the operation, keep draining
            }
        } catch is CancellationError where timedOut { throw TimeoutError() }
        throw TimeoutError()
    }
}
```

Measured: fast op returns `1` at 50 ms; slow cooperative op throws `TimeoutError` at 200 ms; an op that ignores cancellation returns its value at 1000 ms (SE-0526's result rule, and the documented limit: the timeout is only as prompt as the operation's cancellation points); outer `cancel()` throws `CancellationError`, `error is TimeoutError == false`.

### 7. Off-pool pattern

A task that blocks a cooperative thread is acceptable only for short, forward-progressing work ("As long as the work satisfies the runtime's requirement of forward progress, you should be fine", [Massicotte](https://www.massicotte.org/stateless-actors/)); long synchronous CPU or indefinite blocking IO must move off the pool. The pattern that the exemplars and the fixture agree on is: run the blocking body on a dedicated thread or a pool you own, return its result through one checked continuation, and make cancellation wake the thread.

- `NIOThreadPool.runIfActive` is the shipped form: `swift-nio@e12881f2a691:Sources/NIOPosix/NIOThreadPool.swift:454-476` (`withTaskCancellationHandler` around `withCheckedThrowingContinuation`; `onCancel` marks the work ID cancelled so a not-yet-started item resumes `CancellationError`; a body that already started still runs to completion). Hummingbird/AHC users reach it through `NonBlockingFileIO` (`NonBlockingFileIO.swift:382`).
- Hand-rolled form (plant `d-timeout-race`, `cancellableRead`): `pthread_create` a thread that `poll`s the data fd and a wake pipe; `onCancel` writes one byte to the wake pipe; the thread resumes `CancellationError` or the read result. Measured: 1000 ms instead of 4000 ms.
- A private serial `DispatchQueue` wrapped in a continuation is still acceptable for a single blocking C call that has its own timeout ([map conflict 19](../swift-topic-map.md): "A dedicated queue wrapped in a continuation stays acceptable"), but never `DispatchQueue.global()` in a loop of blocking calls (GCD spawns threads until the system limit, which is how it hides pool starvation).
- Bound the blocking call at the OS level whenever possible (`poll(..., timeout)`, `SO_RCVTIMEO`, `Process` with a kill timer) so that "cancellable" does not depend on a wake pipe.

### 8. AsyncStream buffering

[SE-0314](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md#L325) declares `bufferingPolicy limit: Continuation.BufferingPolicy = .unbounded`; `makeStream(of:bufferingPolicy:)` defaults the same way. Plant `fixtures/e-asyncstream` (100,000 yields of 4 KiB, consumer sleeps 10 ms per element, VmHWM from `/proc/self/status`; 6.4):

| Policy | Peak RSS (VmHWM) | `yield` results |
|---|---|---|
| default (no argument) | 416,220 KiB (start 9,664) | all `.enqueued` |
| explicit `.unbounded` (separate manual run) | 416,744 KiB | all `.enqueued` |
| `.bufferingNewest(8)` | 11,404 KiB | 99,992 `.dropped` |
| `.bufferingOldest(8)` | 11,200 KiB | 99,992 `.dropped` |

6.3: 416,336 / 10,888 / 10,856 KiB. `.bufferingNewest(n)`/`.bufferingOldest(n)` drop silently apart from the `YieldResult`, so use them only where loss is semantically fine (latest-state snapshots, progress ticks); for lossless flows with backpressure the corpus supplies `AsyncChannel` (`swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/Channels/AsyncChannel.swift:23`, send suspends until a consumer takes the element) and `MultiProducerSingleConsumerAsyncChannel`; both are package dependencies, not stdlib, and were read only. The corpus has zero bounded `AsyncStream` constructions out of 78 ([conc audit](../swift-audit/exemplar-concurrency.md), failure-class row 6; e.g. `apple/container@f70ecbb926d9:Sources/ContainerXPC/XPCServer.swift:112`). Termination: `continuation.onTermination` fires on finish, on stream release and when the consuming task is cancelled ([SE-0314](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md#L486)); the producer must stop on `.terminated`.

### 9. Task groups

[SE-0381](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0381-task-group-discard-results.md#L34) (Implemented 5.9): a plain `TaskGroup` "will leak all the child `Task` objects until the listening socket either terminates or throws" in a server loop; the recommended form is `withDiscardingTaskGroup` (line 169). Plant `fixtures/j-groups` (200,000 children, each returns 4 KiB the loop never reads; VmHWM; 6.4, 6.3 within 2%):

| Mode | Peak RSS |
|---|---|
| `withTaskGroup`, results never drained | 1,089,664 KiB |
| `withTaskGroup` with at most 64 in flight (`group.next()` before each `addTask`) | 17,512 KiB |
| `withDiscardingTaskGroup` | 17,836 KiB |
| `withDiscardingTaskGroup`, children sleep 3 s (all 200,000 alive at once) | 641,392 KiB (all spawned before any finished) |
| 64-wide window, children sleep 1 ms | 15,260 KiB |

A discarding group fixes result retention, not live-child growth: a server needs a bound on in-flight children when the accept rate can exceed the service rate. Exemplar use: `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117` (`withDiscardingTaskGroup` per accepted connection) and `grpc-swift-2@ac33066eb6ed:Sources/GRPCInProcessTransport/InProcessTransport+Server.swift:123`. Hummingbird's `onGracefulShutdown: { Task { do { try await self.shutdownGracefully() } catch { logger.error(...) } } }` at `Server.swift:130-131` is the sanctioned unowned-task form: a synchronous callback bridge whose errors are handled inside.

### 10. Actor reentrancy

An actor method suspends at every `await`; other calls interleave and state read before the suspension is stale after it. Plant `fixtures/i-reentrancy` (10 concurrent callers; 6.4 and 6.3 identical):

```swift
// WRONG: check, suspend, act on the stale check -> balance=-500
func withdraw(_ n: Int) async -> Bool {
    guard balance >= n else { return false }
    await audit()
    balance -= n
    return true
}
// RIGHT: mutate before suspending (or re-check after) -> balance=40
func withdraw(_ n: Int) async -> Bool {
    guard balance >= n else { return false }
    balance -= n
    await audit()
    return true
}
// WRONG: cache stampede -> remote_fetches=10;  RIGHT: store the in-flight Task -> remote_fetches=1
func get(_ k: String) async -> Int {
    if let v = cache[k] { return v }
    if let t = inflight[k] { return await t.value }
    let t = Task { await self.remote(k) }; inflight[k] = t
    let v = await t.value; cache[k] = v; inflight[k] = nil
    return v
}
```

The `AsyncLock` exemplar is designed against reentrancy (`while self.busy` loop re-checks after each resume, `AsyncLock.swift:39`). Detection is a concurrent test with an invariant check (exit 1 on violation), not a compiler diagnostic.

### 11. Cleanup after cancellation

`defer` cannot `await` before Swift 6.4: `error: 'async' call cannot occur in a defer body` (6.3). [SE-0493](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md) (Implemented 6.4) allows it; [SE-0504](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md) (Implemented 6.4) adds `withTaskCancellationShield`, which hides outer cancellation from static `Task.isCancelled`, `checkCancellation` and handlers and stops propagation into child tasks started inside it. Both are in the [6.4 release post](https://www.swift.org/blog/swift-6.4-released/). Plant `fixtures/k-defer-shield` (task cancelled at 100 ms; `Resource.close()` itself does `Task.sleep` like real flush code):

| Mode | Journal when the task finished | 200 ms later |
|---|---|---|
| `naive` (cleanup only on the happy path) | `[]` | `[]` (never closed) |
| `defer { Task { await r.close() } }` (pre-6.4 workaround) | `[]` | `["close: completed"]` (ran after the owner finished, untracked) |
| `defer { await r.close() }` (SE-0493 only) | `["close: ABORTED by cancellation (CancellationError())"]` | same |
| `defer { await withTaskCancellationShield { await r.close() } }` | `["close: completed"]` | same |

Pre-6.4 equivalent that stays structured: do/catch with `await close()` on both exits, or NIO's `asyncDo` shape that awaits `Task { try await finally(error) }.value` (`swift-nio@e12881f2a691:Sources/NIOPosix/StructuredConcurrencyHelpers.swift:47` and `:58`, comment "We need to have an uncancelled task here"). Source that must build on both: `#if compiler(>=6.4)` around the shielded `defer`, `#else` the do/catch form; plant `fixtures/s-compat` built and ran on 6.4 and 6.3 (`closed`, exit 0).

### 12. close()/shutdown() contract

`deinit` is synchronous and cannot await. Plants:

- `fixtures/m2-deinit-self`: `deinit { Task { await self.close() } }` is `error: capture of 'self' in a closure that outlives deinit` on 6.4 and 6.3.
- `fixtures/m-deinit` `field-in-deinit`: `deinit { let w = wire; Task { await w.close() } }` compiles, but `main` ended right after the release and `wire closed (flushed)` was never printed; with a 200 ms sleep afterwards it was (`field-in-deinit-sleep`). Cleanup that depends on the process staying alive is not cleanup.
- `scoped`: `withClient { ... }` with `defer { await withTaskCancellationShield { await c.wire.close() } }` printed `wire closed (flushed)` before the body's `CancellationError` propagated.

Contract recommended: a resource that owns a connection, file, thread or pool exposes `func close() async` or `func shutdown() async throws`, idempotent, awaited by the owner on every exit path; `deinit` may assert (debug only) that it already happened. Exemplars: `async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPClient.swift:196-217` (`deinit` runs `debugOnly { preconditionFailure("Client not shut down before the deinit. Please call client.shutdown()...") }`, `shutdown()` async at `:302-310`, `syncShutdown()` marked `noasync`); `swift-nio@e12881f2a691:Sources/NIOCore/AsyncChannel/AsyncChannel.swift:288` `executeThenClose` (scoped, closes on exit; the unscoped accessors are deprecated "Use the executeThenClose scoped method instead"); `swift-nio@e12881f2a691:Sources/NIOPosix/MultiThreadedEventLoopGroup.swift:327` (perpetual group must not deinit). `isolated deinit` (SE-0371, Implemented 6.2) lets a deinit touch actor state synchronously but still cannot await; in the corpus it appears only in tests (`element-x-ios@14e33866ced2:UnitTests/Sources/CreateRoomViewModelTests.swift:30`).

### 13. Completion-handler bridging

On Apple platforms Objective-C completion-handler methods are imported with an `async` alternative automatically ([SE-0297](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0297-concurrency-objc.md), Implemented 5.5): check the async overload before writing a continuation wrapper (unverified: read only, no Apple SDK here). A hand-written wrapper loses the underlying request's cancellation (the parked continuation row in section 3) unless it adds the section 4 handler. Where no async form exists, write one adapter around one `withChecked(Throwing)Continuation` that resumes exactly once. New public API should be `async`, not `completion:` (Python-SDK and CLI parity aside). The exemplar `Alamofire` and `element-x-ios` carry the callback surface for compatibility ([conc audit](../swift-audit/exemplar-concurrency.md): GCD and completion handlers are an app/community-library phenomenon).

### 14. Crash signals and exit codes

The backtracer is on by default on Linux ([Backtracing.rst](https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst): `enable` default `yes*`; "the runtime will not install its signal handlers for a signal if it finds that there is already a handler") and the process dies with the original signal: x86_64 trap = SIGILL = 132, abort = SIGABRT = 134, SIGSEGV = 139; arm64 traps as SIGTRAP 133 (reported, not measured here). Plant results: double resume 132, unsafe double resume 134, leaked continuation or deadlock = no exit at all (hang), which is why every plant that can hang is run under `timeout` and a CI test of continuation code needs a timeout wrapper (exit 124 from coreutils `timeout`, not from Swift). Stdout is block-buffered when piped, so `print` before a hang or trap can be lost (observed: `mode=leak` line missing from the leak run).

## Normative guidance candidates

IDs are candidates inside family SW-CONC (T = tasks-and-cancellation). Each rule gives: rule, rationale, VERIFY, RUN (was the verification watched red on a planted violation and green on a twin; fixture path under `fixtures/`).

**SW-CONC-T01. Every unstructured `Task`/`Task.detached` has an owner.**
Rule: a `Task {}` is (a) assigned to a property, local or collection whose owner calls `.cancel()` on its shutdown path, or (b) returned or awaited (`.value`/`.result`) by the creating scope, or (c) a callback-to-async bridge written `_ = Task { ... } // fire-and-forget: <why safe>` whose body handles all errors. A statement-position `Task {` is a violation.
Rationale: unstructured tasks survive cancellation of their creator (measured), and 45% of stored handles in the corpus are never cancelled by name.
VERIFY (output is the violation, empty = pass): `grep -rn -e '^[[:space:]]*Task[[:space:]]*{' -e '^[[:space:]]*Task[[:space:]]*(.*)[[:space:]]*{' -e '^[[:space:]]*Task[^.[:alnum:]_ (].*{' -e '^[[:space:]]*Task\.detached' --include='*.swift' Sources`; then `grep -rn -e '_ = Task' --include='*.swift' Sources` and read: each hit needs the `fire-and-forget:` comment; for stored handles read that a `.cancel()` is reachable from `stop`/`close`/`deinit`-adjacent code. Multi-line `Task(\n priority:` is a known miss.
RUN: yes, `fixtures/g-grep/task.sh` (bad: 7 lines, grep exit 0; good: empty, exit 1).

**SW-CONC-T02. Throwing unstructured tasks never drop their error: compiler group at error plus SwiftLint opt-in.**
Rule: on toolchains >= 6.4 build with `.treatWarning("NoUseUnstructuredThrowingTask", as: .error)` (tools-version >= 6.2 manifest), and enable SwiftLint `unhandled_throwing_task` (`opt_in_rules: [unhandled_throwing_task]`) until the fleet's floor is >= 6.4 and the tools agree; use both because they cover different forms.
Rationale: `Task.init` is `@discardableResult`; swiftc 6.4 covers `Task.detached`/`Task.immediate`, SwiftLint covers `Task {...}.cancel()`.
VERIFY: `swift build -Xswiftc -Werror -Xswiftc NoUseUnstructuredThrowingTask` exits non-zero on a violation; `swiftlint lint --config .swiftlint.yml` with `only_rules: [unhandled_throwing_task]` exits 2 on a violation.
RUN: yes. Compiler: `fixtures/f-throwing-task` exit 1 (error `unstructured throwing task created by 'init(name:priority:operation:)' is not used ... [#NoUseUnstructuredThrowingTask]`), twin `fixtures/f-throwing-task-twin` exit 0; CLI form on `fixtures/f2-throwing-variants` exit 1 (detached and immediate). SwiftLint: violation exit 2, twin exit 0. On 6.3 the group is unknown (warning only, exit 0).

**SW-CONC-T03. No `Task.detached` without a stated reason; prefer a `nonisolated`/`@concurrent` async function.**
Rule: `Task.detached` needs an adjacent comment naming which of isolation, priority or task-locals must be dropped. "Off the main actor" is not a reason (use `@concurrent`, Swift 6.2+, or a nonisolated async function).
Rationale: detached drops task-locals (`requestID=none` measured) and still ignores parent cancellation.
VERIFY: `grep -rn -e 'Task\.detached' -e 'detached[[:space:]]*[{(]' --include='*.swift' Sources` (every hit needs the comment).
RUN: yes, `fixtures/g-grep/checks.sh detached` (bad 2 hits exit 0, good empty exit 1).

**SW-CONC-T04. Never block the cooperative pool or the main actor in async code; the GCD-in-async grep is a required gate.**
Rule: no `DispatchSemaphore`, `DispatchGroup.wait`, `Thread.sleep`, `usleep`/`sleep`, `DispatchQueue.main.async`, `DispatchQueue.global`, `MainActor.run` in new async code; hop with isolation (`@MainActor`, `isolated` parameters), wait with `await`, delay with `Task.sleep(for:)`. A deliberate sync-over-async bridge must be `@available(*, noasync)` and commented (SwiftPM `unsafe_await` shape).
Rationale: swiftc 6.3/6.4 rejects only `Thread.sleep`, `NSLock.lock` and `NSCondition` in async contexts; the semaphore deadlocks deterministically on the main actor (exit 124) and when `ncores` tasks block.
VERIFY (output is the violation): `grep -rn -e 'DispatchSemaphore(' -e 'MainActor\.run[[:space:]]*[{(]' -e 'DispatchQueue\.main\.async' -e 'DispatchQueue\.global' -e 'Thread\.sleep(' -e 'usleep(' -e '[^a-zA-Z_.]sleep(' -e '\.wait()' --include='*.swift' Sources`. Test directories are excluded by the directory operand. `.wait()` also hits `DispatchGroup`/`Process`; read each.
RUN: yes, `fixtures/g-grep/gcd.sh` (bad 7 lines exit 0; good empty exit 1); deadlock behaviour `fixtures/c-semaphore` (`sem-main` 124 vs `cont-main` 0).

**SW-CONC-T05. Blocking or CPU-bound work longer than a few milliseconds runs off the pool through one cancellable continuation.**
Rule: dedicated thread, `NIOThreadPool.runIfActive`, or a private serial queue, wrapped in `withTaskCancellationHandler` + one `withChecked(Throwing)Continuation`; `onCancel` must wake the blocked call (wake pipe, `kill`, `close` of the peer) or the call must carry an OS-level timeout. Pure-CPU loops in async code call `try Task.checkCancellation()` at least once per unit of bounded work.
Rationale: pool width equals core count (31 blocked passed, 32 hung); a blocking read ignored cancellation for 1000 ms of 1000 ms.
VERIFY: reading heuristic (a blocking syscall inside an `async` function body without the wrapper), backed by the SW-CONC-T04 grep; behavioural test: cancel the task at 200 ms and assert it returns within 2x. 
RUN: yes for the behaviour, `fixtures/d-timeout-race blocking-offpool` returns at 1000 ms while `blocking-group` takes 4000 ms; `fixtures/l-cancel-observers` for the observer table. The reading heuristic itself: no.

**SW-CONC-T06. Continuations: checked by default, resumed exactly once on every path, cancellation-aware when waiting on an external event.**
Rule: use `withChecked(Throwing)Continuation`; `withUnsafe*` needs a comment citing a measurement. Store at most one continuation per wait in a once-guard (`Mutex<CheckedContinuation?>` with `take()`); resume outside any lock; wrap external-event waits in `withTaskCancellationHandler` and re-check `Task.isCancelled` after storing; tests that exercise continuation code run under `timeout`.
Rationale: leak = silent hang (exit 124), double resume = SIGILL 132, unsafe variants give no diagnostic; `onCancel` runs before the body when already cancelled.
VERIFY: `grep -rn -e 'withUnsafeContinuation' -e 'withUnsafeThrowingContinuation' --include='*.swift' Sources` (each hit commented); `timeout 60 swift test` exit 124 is the leak signal; reading heuristic: every `withChecked*` that registers a callback has a handler or a documented never-cancelled reason.
RUN: yes. `fixtures/a-continuation leak` exit 124 vs `ok` exit 0; `double` exit 132; `fixtures/a2-continuation-cancel hang` 124 vs `handler` 0; `precancel-noguard` 124 vs `precancel-guard` 0; grep `fixtures/g-grep/checks.sh unsafecont` bad 1 hit vs good empty.

**SW-CONC-T07. Timeouts return a `TimeoutError`, never `CancellationError`, and say what they cannot stop.**
Rule: until `withDeadline` ships (SE-0526, expected 6.5; guard with `#if compiler(>=6.5)` only after it lands), use the `withTimeout` of section 6 (structured race, `ContinuousClock`, distinct error, result-wins rule). Document at the API that the timeout is bound by the operation's cancellation points; operations that block must follow T05. Do not race with two unstructured tasks and a continuation (orphans keep running).
Rationale: containerization's shape reports timeouts as `CancellationError` and returns after the blocked work (4000 ms measured for a 1 s limit).
VERIFY: `grep -rn -e 'throw CancellationError()' --include='*.swift' Sources` (a hit must be a response to observed cancellation, not a timer); behavioural test with a blocking operation asserting the caller returns within limit + slack.
RUN: yes. `fixtures/g-grep/checks.sh cancelerr` bad 1 hit vs good empty; `fixtures/o-timeout-pattern` outputs `TimeoutError` at 200 ms and `CancellationError` on outer cancel; `fixtures/d-timeout-race` for the limits; `fixtures/n-withdeadline` exit 1 on 6.4.

**SW-CONC-T08. Cancellation is never swallowed in a loop.**
Rule: no `try? await Task.sleep`/`clock.sleep`/other cancellation points inside `while true`/`repeat`; loops test `!Task.isCancelled` or let the error propagate; `catch` blocks that handle `CancellationError` rethrow or break.
Rationale: `try?` turns cancellation into a hot spin that never ends (18,426 iterations in 500 ms).
VERIFY: `grep -rn -e 'try? await Task.sleep' -e 'try? await clock.sleep' --include='*.swift' Sources` (read each in a loop; outside loops it is a legitimate "best effort delay").
RUN: yes. `fixtures/r-trysleep` bad exit 1, good exit 0; grep `checks.sh trysleep` bad 1 hit vs good empty.

**SW-CONC-T09. Cleanup that must run after cancellation uses an awaited `defer` with a shield (6.4+), or an explicit both-paths close before.**
Rule: 6.4+: `defer { await withTaskCancellationShield { await x.close() } }`; floor < 6.4: `#if compiler(>=6.4)` split with do/catch and `await x.close()` on both exits; never `defer { Task { ... } }`.
Rationale: awaited `defer` alone still runs `close()` under the cancelled task and aborts (`close: ABORTED`); `defer { Task {} }` completes after the owner finished.
VERIFY: `grep -rlPz -e 'defer\s*\{[^}]*\bTask\b' --include='*.swift' Sources` (output = violating files); `swift build` on 6.3 fails with `'async' call cannot occur in a defer body` if an unguarded `defer { await ... }` ships.
RUN: yes. `fixtures/k-defer-shield` (`defer` aborted, `defer-shield` completed, `defer-task` orphan); grep `fixtures/g-grep` bad 1 file vs good empty; `fixtures/s-compat` builds on 6.4 and 6.3.

**SW-CONC-T10. Resources expose an awaited `close()`/`shutdown()`; `deinit` never starts async work.**
Rule: connection/file/thread/pool owners have `func close() async` (idempotent) and, where practical, a scoped `withX { }` API; `deinit` only asserts it was closed (`debugOnly`/`assert`).
Rationale: `deinit { Task { await self.close() } }` does not compile; field-capturing variants lose the close when the process exits.
VERIFY: `grep -rlPz -e 'deinit\s*\{[^}]*\bTask\b' --include='*.swift' Sources` (output = violating files); compile error `capture of 'self' in a closure that outlives deinit` catches the `self` form.
RUN: yes. `fixtures/m2-deinit-self` exit 1; `fixtures/m-deinit field-in-deinit` (close lost) vs `scoped` (closed); grep `fixtures/g-grep` bad 1 file vs good empty (note: the `[^}]*` stops at the first `}`, so a `Task` after an inner brace in the same deinit is missed).

**SW-CONC-T11. `AsyncStream`/`AsyncThrowingStream` always name a buffering policy.**
Rule: pass `bufferingPolicy:` explicitly; `.bufferingNewest(n)` for latest-state, `.bufferingOldest(n)` for first-wins, `.unbounded` only with a comment that the producer is externally bounded; lossless flows needing backpressure use `AsyncChannel`/MPSC channel; the producer checks `yield`'s result and stops on `.terminated`; set `onTermination` to release the source.
Rationale: default `.unbounded` grew to 416,220 KiB versus 11,404 KiB.
VERIFY: `grep -rnE -e 'makeStream\(of: [^),]*\.self\)' -e 'Async(Throwing)?Stream[^(]*\{' -e 'Async(Throwing)?Stream\([A-Za-z0-9_]+\.self[^)]*\)[[:space:]]*\{' --include='*.swift' Sources` (single-line constructions without a policy; multi-line constructions and `var x: AsyncStream<T> { ... }` property types are known misses/false positives).
RUN: yes. Memory `fixtures/e-asyncstream` default 416,220 KiB vs newest 11,404 KiB; grep `checks.sh stream` bad 4 hits vs good empty.

**SW-CONC-T12. Servers use `withDiscardingTaskGroup` and bound in-flight children.**
Rule: per-connection/per-request loops use `withDiscardingTaskGroup`; a plain group whose children return `Void` is a violation; when accepts can outrun service, cap in-flight children (window of N via `group.next()` or a semaphore-free counter).
Rationale: 1,089,664 KiB vs 17,836 KiB; discarding alone does not bound live children (641,392 KiB).
VERIFY: `grep -rn -e 'withTaskGroup(of: Void' -e 'withThrowingTaskGroup(of: Void' --include='*.swift' Sources`; the live-children bound is a reading heuristic.
RUN: yes for the grep (`checks.sh group` bad 1 hit vs good empty) and memory (`fixtures/j-groups`); bound check: reading heuristic only.

**SW-CONC-T13. Actor methods re-establish invariants after every `await`.**
Rule: in an actor, never read state, `await`, then act on the earlier read; mutate before suspending, re-check after, or park an in-flight `Task` in a dictionary for dedupe.
Rationale: reentrancy broke the balance invariant (-500) and a cache (10 fetches).
VERIFY: concurrent test with 10 callers asserting the invariant (`exit(1)` on violation); reading heuristic: an `if`/`guard` on actor state followed by `await` followed by a write to the same state.
RUN: yes for the test shape (`fixtures/i-reentrancy` bad exit 1 vs good exit 0); the reading heuristic: no.

**SW-CONC-T14. New APIs are `async`, not completion-handler; bridge only callback-only sources, once.**
Rule: do not add `completion:`/`completionHandler:` parameters to new public API; check for an existing async overload before wrapping (Apple: SE-0297 auto-import, unverified: read only); a bridge is one adapter with T06 properties.
Rationale: wrappers lose cancellation and invite double/leaked resumes.
VERIFY: `grep -rn -e 'completion:' -e 'completionHandler:' -e 'completion handler' --include='*.swift' Sources`.
RUN: yes for the grep (`checks.sh callback` bad 1 hit vs good empty); the "async overload exists" half: no (needs an Apple SDK).

**SW-CONC-T15. Use `Task.sleep(for:)`/`clock.sleep(for:)`, not `sleep(nanoseconds:)`; and never name APIs that do not exist.**
Rule: `Task.sleep(for: .seconds(1))` (Duration form); no `withTimeout`, `withDeadline` (before 6.5), `Task.timeout`, `Task.cancelAfter`, `Task.sleep(seconds:)`.
Rationale: 18 legacy nanosecond uses remain in the corpus; the invented names do not compile on 6.4.
VERIFY: `grep -rn -e 'sleep(nanoseconds' --include='*.swift' Sources`; `swift build` for the invented names.
RUN: yes (`fixtures/g-grep` nanos bad 1 hit vs good empty; `fixtures/t-hallucination` exit 1 with `cannot find 'withTimeout' in scope`, `cannot find 'withDeadline' in scope`, `extraneous argument label 'seconds:'`, `has no member 'cancelAfter'`, `has no member 'runAsync'`, `cannot find 'withTaskTimeout'`, `has no member 'withTimeout'`).

**SW-CONC-T16. Do not use `LIBDISPATCH_COOPERATIVE_POOL_STRICT` or SwiftLint `custom_rules` as Linux gates.**
Rule: the variable is a no-op on Linux libdispatch (Apple debugging aid, unverified: read only); SwiftLint's static Linux binary skips `custom_rules` and exits 0. Gates for T01, T04 and the others are the greps above, run in CI with an explicit directory operand.
Rationale: both fail open.
VERIFY: `strings` on `libdispatch.so` lacks the variable; `swiftlint lint --config <yml with custom_rules>` prints `Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` and exits 0 on a planted violation.
RUN: yes, and it did NOT go red by design (reported in Verification runs V12 and V37); the greps are the red/green replacements.

## Verification runs

All via `~/.cache/research-lang/swift-tools/run.sh`; fixture build outputs under `--scratch-path ~/.cache/research-lang/swift-tools/build/tasks-and-cancellation-<tag>-<ver>`. `runbin.sh <fixture> <ver> <timeout> [ENV=V] -- <mode>` builds with `swift build` and runs the product under `timeout`. Exit codes are the process exit (`124` = coreutils `timeout` killed it; `132` = SIGILL; `134` = SIGABRT). Versions 6.4 unless noted; "6.3 =" means the same result on 6.3.

| # | Fixture / command | Violation (red) | Compliant twin (green) | Key output |
|---|---|---|---|---|
| V01 | `fixtures/f-throwing-task` `swift build` (manifest `.treatWarning("NoUseUnstructuredThrowingTask", as: .error)`) | exit 1 | `f-throwing-task-twin` exit 0 | `error: unstructured throwing task created by 'init(name:priority:operation:)' is not used, which may accidentally ignore errors thrown inside the task [#NoUseUnstructuredThrowingTask]` ; 6.3: `warning: unknown warning group: 'NoUseUnstructuredThrowingTask' [#UnknownWarningGroup]`, exit 0 |
| V02 | `fixtures/f2-throwing-variants`: `swift build -Xswiftc -Werror -Xswiftc NoUseUnstructuredThrowingTask` | exit 1 | n/a (variants v3,v5-v8 produced no diagnostic) | errors for `detached(name:priority:operation:)` (line 3) and `immediate(name:priority:executorPreference:operation:)` (line 4) only |
| V03 | `swiftlint lint --quiet --config .swiftlint.yml` (`only_rules: [unhandled_throwing_task]`) in `f-throwing-task` | exit 2 | twin exit 0 | `main.swift:6:5: error: Unhandled Throwing Task Violation ... (unhandled_throwing_task)`; on `f2`: flags line 5 (`Task {...}.cancel()`) only |
| V04 | `a-continuation leak` / `ok` | `timeout 20` exit 124 (6.3 = 124) | exit 0 | `SWIFT TASK CONTINUATION MISUSE: value(mode:) leaked its continuation without resuming it.` |
| V05 | `a-continuation double` | exit 132 (6.3 = 132; `SWIFT_BACKTRACE=enable=no` also 132) | `ok` exit 0 | `CheckedContinuation.swift:169: Fatal error: ... tried to resume its continuation more than once, returning 2!` / `*** Signal 4` / `Illegal instruction` |
| V06 | `a2-continuation-cancel hang` / `handler` | exit 124 | exit 0 | `threw CancellationError()` |
| V07 | `a2 precancel-noguard` / `precancel-guard` | exit 124 | exit 0 | `threw CancellationError()` |
| V08 | `a2 unsafe-leak` | exit 124, no log line | n/a | observation: no diagnostic |
| V09 | `a2 unsafe-double` | exit 134 | n/a | `freed pointer was not the last allocation` (UB, nondeterministic by nature) |
| V10 | `c-semaphore sem-main` / `cont-main` | exit 124 (6.3 = 124) | exit 0 (6.3 = 0) | green prints `producer runs`, `consumer woke`, `done` |
| V11 | `c-semaphore many 64`; threshold `many 31` / `many 32` | exit 124 (n>=32) | exit 0 (n<=31) | `all woke` for n=31; `taskset -c 0` did not change the width |
| V12 | `c-semaphore sem` with `LIBDISPATCH_COOPERATIVE_POOL_STRICT=1` | **did NOT go red**: exit 0, identical with and without the variable (6.4 and 6.3) | n/a | `strings /usr/lib/swift/linux/libdispatch.so` shows `LIBDISPATCH_LOG`, `LIBDISPATCH_STRICT`, not `..._COOPERATIVE_POOL_STRICT` |
| V13 | `d-timeout-race blocking-group` (1 s limit, 4 s read) | caller sees timeout at 4000 ms | `blocking-offpool` 1000 ms | `t+4000ms  op: read returned 1` / `t+4000ms  caller got TimedOut()`; offpool: `t+1000ms  caller got TimedOut()` (6.3 = same) |
| V14 | `d-timeout-race blocking-unstructured` | caller at 1000 ms, op still running | n/a | `t+4000ms  op: read returned 1` after `t+1000ms  caller moved on` |
| V15 | `e-asyncstream default` vs `newest` | VmHWM 416,220 KiB (6.3: 416,336) | `newest` 11,404 KiB (6.3: 10,888); `oldest` 11,200 | `producer done: dropped=99992` for bounded modes; `dropped=0` default |
| V16 | `k-defer-shield defer` / `defer-task` / `defer-shield` | `close: ABORTED by cancellation (CancellationError())`; `defer-task` journal `[]` at task end | `defer-shield`: `close: completed` | 6.3: `error: 'async' call cannot occur in a defer body`, `cannot find 'withTaskCancellationShield' in scope`, exit 1 |
| V17 | `m2-deinit-self` `swift build` | exit 1 (6.3 = 1) | n/a | `error: capture of 'self' in a closure that outlives deinit` |
| V18 | `m-deinit field-in-deinit` / `scoped` | `end of main`, no `wire closed` | `scoped`: `wire closed (flushed)` then `body threw CancellationError()`; `field-in-deinit-sleep` also closes | |
| V19 | `i-reentrancy bad` / `good` | exit 1 `balance=-500 remote_fetches=10` / `INVARIANT BROKEN` | exit 0 `balance=40 remote_fetches=1` | 6.3 = same |
| V20 | `r-trysleep bad` / `good` | exit 1 `ticks_500ms_after_cancel=18426` (6.3: 17686) | exit 0 `=1` | `LOOP SURVIVED CANCELLATION` |
| V21 | `j-groups group` vs `discarding`/`window` | 1,089,664 KiB (6.3: 1,090,868) | 17,836 / 17,512 KiB (6.3: 17,100 / 16,220) | `discarding-slow` 641,392 KiB; `window-slow` 15,260 KiB (6.4) |
| V22 | `n-withdeadline` `swift build` | exit 1 | n/a | `error: cannot find 'withDeadline' in scope` |
| V23 | `p-noasync` `swift build` (6.4 and 6.3) | exit 1 | n/a | errors only for `Thread.sleep`, `NSLock.lock/unlock`, `NSCondition.lock/unlock`; none for semaphore/group/`sleep`/`usleep`/`DispatchQueue.sync`/`waitUntilExit` |
| V24 | `t-hallucination` `swift build` | exit 1 | n/a | `cannot find 'withTimeout' in scope`, `extraneous argument label 'seconds:'`, `value of type 'Task<Int, Never>' has no member 'cancelAfter'`, `type 'MainActor' has no member 'runAsync'`, `cannot find 'withTaskTimeout' in scope` |
| V25 | `g-grep/gcd.sh` (SW-CONC-T04 grep) on `bad/Sources` / `good/Sources` | 7 lines, exit 0 | empty, exit 1 | lines 5, 8, 12-16 of `Gcd.swift` |
| V26 | `g-grep/task.sh` (T01) | 7 lines, exit 0 | empty, exit 1 | `Task {` x3 (incl. `Task { await self.close() }` in a deinit), `Task(priority:) {`, `Task<Void, Never> {`, `Task.detached` x2 |
| V27 | `checks.sh detached` | 2 lines | empty | |
| V28 | `checks.sh cancelerr` | 1 line (`throw CancellationError()` after the timer) | empty | |
| V29 | `checks.sh deinit` | `bad/Sources/More.swift` | empty | |
| V30 | `checks.sh stream` | 4 lines | empty | |
| V31 | `checks.sh group` | 1 line | empty | |
| V32 | `checks.sh callback` | 1 line | empty | |
| V33 | `checks.sh trysleep` | 1 line | empty | |
| V34 | `checks.sh unsafecont` | 1 line | empty | |
| V35 | `grep -rlPz -e 'defer\s*\{[^}]*\bTask\b' --include='*.swift' bad/Sources` | 1 file, exit 0 | empty, exit 1 | |
| V36 | `grep -rn -e 'sleep(nanoseconds' --include='*.swift'` | 1 line | empty | |
| V37 | `swiftlint lint --config g-grep/.swiftlint.yml bad/Sources` with `custom_rules` regexes for T01/T04 | **did NOT go red**: exit 0 on planted violations | n/a | `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` (`SWIFTLINT_DISABLE_SOURCEKIT` is compiled into the static 0.65.1 binary: `realm/SwiftLint@ec4691d9e813:Source/SwiftLintCore/Extensions/Request+SwiftLint.swift:8-13`) |
| V38 | `h-detached` | observation (properties) | n/a | see section 1 |
| V39 | `l-cancel-observers` | observation (table) | n/a | see section 3 |
| V40 | `o-timeout-pattern` | green-only behaviour test: 50 ms / `TimeoutError` at 200 ms / 1000 ms value / `CancellationError` on outer cancel | n/a | 6.3 = same |
| V41 | `s-compat` (`#if compiler(>=6.4)`) | n/a | exit 0 on 6.4 and 6.3 | `closed` |
| V42 | `f3-typed-throws-crash` | swift-frontend crash exit 1 (6.4 and 6.3) | n/a | `While emitting IR SIL function`; unrelated surprise, report upstream |

Watched red on a planted fixture: V01-V11, V13-V17, V19-V24, plus the 12 greps V25-V36 = 35 verifications (V12 and V37 did not go red and are reported as such; V08, V09, V14, V38-V42 are observations).

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| T01 ownership | `kean/Nuke@d5548dd61395:Sources/Nuke/Pipeline/TaskQueue.swift:174` stores `operation.task = Task { @ImagePipelineActor [weak self] in ... operation.task = nil }` with a retain-cycle break and cancels via the operation; `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:130-131` is the sanctioned bridge (`onGracefulShutdown: { Task { do { ... } catch { logger.error } } }`); `IceCubesApp@2ad6e6891258:Packages/Env/Sources/Env/StreamWatcher.swift:173` stores and cancels | 709 of 882 `Task {}` are bare statements, 586 of them in element-x-ios (416) and IceCubes (170), e.g. `element-x-ios@14e33866ced2:ElementX/Sources/Screens/JoinRoomScreen/JoinRoomScreenViewModel.swift:413` (`{ Task { await self.declineInvite() } }`); a bare throwing one: `tuist@2f6ac74754bf:app/Sources/TuistPreviews/PreviewRunButton.swift:39` (`Task { ... try await Task.sleep(for: .seconds(2)); isLoading = false }`). Only 88 of 159 stored handles are cancelled by name ([conc audit](../swift-audit/exemplar-concurrency.md)). |
| T03 detached | `sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SourceKitDCore.swift:82` (`Task.detached(priority: .background)`: priority is the stated reason) | 34 uses in 9 repos; tuist 9 and element 5 (stated reasons not checked) |
| T04/T05 blocking | `swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/ConcurrencyHelpers.swift:28-40` (`unsafe_await`, semaphore, `@available(*, noasync)`); `swift-nio@e12881f2a691:Sources/NIOPosix/NIOThreadPool.swift:454-476` (off-pool + cancellation handler) | none inside `async` bodies in 40 repos; 550 `DispatchQueue` uses remain as compat surface (Alamofire 126, element 190) |
| T06 continuations | `swift-async-algorithms@cbde9aed744b:Sources/AsyncStreaming/DuplexChannel/DuplexAsyncChannel.swift:353-358` (handler + unsafe continuation + token); `NIOThreadPool.swift:457-470` (checked + handler) | `containerization@3e7bc39e66b3:Sources/ContainerizationExtras/AsyncLock.swift:40` waiters use `withCheckedContinuation` with no cancellation handler (a cancelled waiter stays queued); 46 `withUnsafe*` uses, 35 in async-algorithms only |
| T07 timeouts | none (no exemplar returns a typed timeout from a structured race) | `containerization@3e7bc39e66b3:Sources/ContainerizationExtras/Timeout.swift:26-41, :49-64` (`throw CancellationError()` on timeout, `fatalError()` on empty group, cannot stop non-cooperative work); callers compensate at `Sources/Containerization/LinuxProcess.swift:185-199` |
| T09 cleanup | `swift-nio@e12881f2a691:Sources/NIOPosix/StructuredConcurrencyHelpers.swift:47,58` (`try await Task { try await finally(error) }.value`, the pre-shield workaround) | none uses SE-0493/SE-0504 yet (both 6.4-only) |
| T10 close/deinit | `async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPClient.swift:196-217,302-310`; `swift-nio@e12881f2a691:Sources/NIOCore/AsyncChannel/AsyncChannel.swift:288` (`executeThenClose`) | none found with `deinit { Task {` of the `self` form (it does not compile); the field-capturing form was not scanned |
| T11 streams | none bounded (0 of 78); `swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/Channels/AsyncChannel.swift:23` is the backpressure alternative | 75 of 78 default-unbounded, e.g. `apple/container@f70ecbb926d9:Sources/ContainerXPC/XPCServer.swift:112`; 3 explicit `.unbounded` incl. `swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/SerialEventQueue.swift:32` |
| T12 groups | `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117`; `grpc-swift-2@ac33066eb6ed:Sources/GRPCInProcessTransport/InProcessTransport+Server.swift:123` (12 discarding groups corpus-wide) | 143 plain groups; no exemplar bounds in-flight children explicitly |
| T13 reentrancy | `containerization` `AsyncLock.swift:39` re-checks `while self.busy` after resume | not scanned further |

Contradiction: the audit finds the corpus almost never uses `MainActor.run` (23) while agents emit it; the exemplars cannot ground T04's `MainActor.run` clause, it comes from [Massicotte](https://www.massicotte.org/problematic-patterns) ("rarely the right solution") and the map (conflicts 19, 24).

## AI-agent angle

| Typical LLM mistake | Why it compiles | Smallest mechanical check |
|---|---|---|
| `Task { try await f() }` as fire-and-forget | `@discardableResult`; error vanishes | `-Werror NoUseUnstructuredThrowingTask` (6.4) + SwiftLint `unhandled_throwing_task`; the T01 grep for non-throwing bare tasks |
| `Task.detached { }` "to leave the main actor" | compiles; drops task-locals | T03 grep |
| `DispatchSemaphore` to call async from sync, `DispatchQueue.main.async`, `await MainActor.run { }` hops, `Thread.sleep` | only `Thread.sleep` is rejected | T04 grep; `timeout` on tests |
| `withCheckedContinuation` around a callback with no cancellation handler, or resumed in both success and fallback branches | trap or hang only at runtime | T06: `timeout` wrapper on tests, once-guard review |
| `withUnsafeContinuation` "for performance" | no checks at all | T06 grep |
| `try? await Task.sleep` in a retry/poll loop | compiles; hot-spins on cancel | T08 grep + cancel test |
| Timeout helper that throws `CancellationError()` or races with `Task.sleep` and expects the work to stop | compiles; blocking work keeps running | T07 grep + behavioural test with a blocking op |
| Invented API: `withTimeout`, `Task.timeout`, `Task.sleep(seconds:)`, `cancelAfter`, `withDeadline` on <6.5 | no, `swift build` fails (V24) | `swift build` |
| `deinit { Task { await self.close() } }` or `defer { Task { await ... } }` | `self` form is rejected, the others compile and lose work | T09/T10 greps |
| `AsyncStream` with the default buffer for event firehoses | compiles | T11 grep |
| `withTaskGroup(of: Void.self)` per connection | compiles; leaks results | T12 grep |
| Actor "check balance, await audit, subtract" | compiles | T13 concurrency test |
| Completion-handler API in new code, `ObservableObject`/Combine habits, `Task.sleep(nanoseconds:)` | compiles | T14/T15 greps |
| Treating `LIBDISPATCH_COOPERATIVE_POOL_STRICT=1` as a Linux CI gate; trusting SwiftLint `custom_rules` on the static binary | both silently pass | T16 |
| Using `Task { }` in top-level `main.swift` code and blocking in it | inherits the main actor | T04 grep |

## Contested / evolving

- **withDeadline timing.** Accepted with modifications 2026-07-30; implementation PR [swiftlang/swift#91190](https://github.com/swiftlang/swift/pull/91190); McCall says 6.5; WWDC26 material that implied 6.4 is wrong (absent on 6.4, V22). Trend: when it lands, T07's helper becomes a one-line `#if compiler(>=6.5)` swap; the "cancel then wait for the operation" semantics will be identical, so T05 still applies.
- **GCD in new code.** "Never use old-style GCD" (agent-config assertions) versus "GCD is still here and you should not be afraid to use it" for blocking work (Massicotte 2026-05-29). Resolved here: no `DispatchSemaphore`/`MainActor.run` in async code, but a private dedicated queue or thread behind a continuation is fine (T05). Trend: blocked pool threads are tolerated if short.
- **Checked vs unsafe continuations.** swift-async-algorithms uses `withUnsafeThrowingContinuation` at 35 sites for performance; the fleet default stays checked because the checked leak log is the only diagnostic (V04). No measurement of the checked overhead was made.
- **Bounded streams.** The ecosystem has `AsyncChannel` and an MPSC channel with backpressure, but 0 of 78 corpus streams use any bound; whether the stdlib will grow a first-party bounded stream is open (no proposal read).
- **Shields adoption.** SE-0493/0504 are 6.4-only; libraries with a lower floor need `#if compiler(>=6.4)` splits (V41). Expect this guard to disappear once the floor reaches 6.4.
- **Tool agreement on throwing tasks.** swiftc (6.4) and SwiftLint disagree on `Task.detached`/`Task.immediate` versus `.cancel()`-consumed handles; either could converge (SE-0520 describes the compiler group as the long-term mechanism). Re-measure on each toolchain bump.
- **Typed-throws `Task` closure crash** (V42) on 6.3 and 6.4 is a toolchain bug as of 2026-10-10; avoid `Task { () throws(E) in ... }` until fixed.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md | SE-0304 structured concurrency (primary) | Swift 5.5, read 2026-10-10 | cooperative cancellation, inheritance rules, `withTaskCancellationHandler` pre-cancel semantics |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0300-continuation.md | SE-0300 continuations (primary) | Swift 5.5 | exactly-once contract, checked vs unsafe |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md | SE-0314 AsyncStream (primary) | Swift 5.5 | `.unbounded` default, `onTermination` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0381-task-group-discard-results.md | SE-0381 discarding groups (primary) | Swift 5.9 | why plain groups leak in server loops |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0371-isolated-synchronous-deinit.md | SE-0371 isolated deinit (primary) | Swift 6.2 | what deinit can and cannot do |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md | SE-0493 await in defer (primary) | Implemented 6.4 | async cleanup form |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md | SE-0504 cancellation shields (primary) | Implemented 6.4 | shield semantics, static vs instance observers |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0520-discardableresult-task-initializers.md | SE-0520 throwing Task warning (primary) | Implemented 6.4 | origin of `NoUseUnstructuredThrowingTask` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0526-deadline.md | SE-0526 withDeadline (primary) | accepted with modifications, 2026 | API and result rule; not in 6.4 |
| https://forums.swift.org/t/accepted-with-modifications-se-0526-withdeadline/88645 | LSG acceptance post (primary, core team) | 2026-07-30 | modification and "expected in 6.5" |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0297-concurrency-objc.md | SE-0297 ObjC concurrency interop (primary) | Swift 5.5 | auto-imported async overloads (read only) |
| https://github.com/swiftlang/swift/blob/main/userdocs/diagnostics/no-use-throwing-unstructured-task.md | compiler diagnostic-group doc (primary) | 6.4 | exact fix advice |
| https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst | runtime backtracer doc (primary) | current main | default-on crash catching, exit via signal |
| https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Concurrency.md | The Swift Programming Language, Concurrency chapter (primary) | current | cooperative cancellation, child cancellation |
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release post (primary) | 2026-09-15 | SE-0493/SE-0504 listed |
| https://developer.apple.com/videos/play/wwdc2021/10254/ | WWDC21 "Swift concurrency: Behind the scenes" (primary) | 2021 | forward-progress contract, pool = cores, strict debug runtime (Apple-only) |
| https://realm.github.io/SwiftLint/unhandled_throwing_task.html | SwiftLint rule page (tool docs) | 0.65.1 | opt-in, error severity, examples |
| https://github.com/realm/SwiftLint (clone `realm__SwiftLint@ec4691d9e813`) | `UnhandledThrowingTaskRule.swift`, `Request+SwiftLint.swift` | 0.65.1 | exact rule body; SourceKit-disabled build |
| https://www.massicotte.org/problematic-patterns | Matt Massicotte, Problematic Swift Concurrency Patterns | 2024-10-29, updated 2026-04-27 | detached, semaphore, MainActor.run positions |
| https://www.massicotte.org/stateless-actors/ | Matt Massicotte, Stateless Actors | 2026-05-29 | "GCD is still here"; blocking pool threads |
| https://github.com/apple/containerization (clone `3e7bc39e66b3`) | `Timeout.swift`, `AsyncLock.swift`, `LinuxProcess.swift` | 2026-10 | timeout shape and its costs |
| https://github.com/apple/swift-nio (clone `e12881f2a691`) | `NIOThreadPool.swift`, `StructuredConcurrencyHelpers.swift`, `AsyncChannel.swift` | 2026-10 | off-pool blocking, cancel-safe cleanup |
| https://github.com/swift-server/async-http-client (clone `017115279d09`) | `HTTPClient.swift` deinit/shutdown | 2026-10 | close/shutdown contract |
| https://github.com/hummingbird-project/hummingbird (clone `1bd3b407fb47`) | `Server.swift` | 2026-10 | discarding group and sanctioned shutdown Task |
| https://github.com/apple/swift-async-algorithms (clone `cbde9aed744b`) | `DuplexAsyncChannel.swift`, `AsyncChannel.swift` | 2026-10 | handler + continuation; backpressure channel |
| https://github.com/kean/Nuke (clone `d5548dd61395`) | `TaskQueue.swift` | 2026-10 | owned stored Task with cancellation |

---
title: "Swift concurrency revision: bounded streams, accept-loop caps, cleanup under cancellation"
topic: "SW-CONC revision (rules append from SW-CONC-30): AsyncStream buffering and AsyncChannel, in-flight caps in accept loops, async defer plus withTaskCancellationShield, signal-handler isolation, 6.3 floor"
agent: concurrency/backpressure-and-cleanup (wave 3)
model: sonnet
date_researched: 2026-10-10
sources_count: 27
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/backpressure-and-cleanup/
scope: |
  Covers: Swift 6.4.0 and 6.3.3 on Linux x86_64 (docker swift:6.4 and swift:6.3); AsyncStream buffering policies, AsyncStream(unfolding:), swift-async-algorithms 1.1.7 AsyncChannel and MultiProducerSingleConsumerAsyncChannel; in-flight caps for per-connection child tasks; SE-0493 async defer, SE-0504 cancellation shields, their 6.3 diagnostics and the pre-6.4 shape; signal-source isolation; shields around swift-subprocess children.
  Not covered: Darwin or Windows behaviour (every such claim says "unverified: read only"); NIO-level backpressure (NIOAsyncSequenceProducer) beyond a read of its defaults; withDeadline (SE-0526, 6.5); exit-code mapping (SW-CLI); the SW-CONC-01..29 rules, which keep their numbers and are only cross-referenced.
---

# Swift concurrency revision: bounded streams, accept-loop caps, cleanup under cancellation

Date 2026-10-10. Toolchains: Swift 6.4.0 (`swift-6.4.0-RELEASE`) and 6.3.3, Linux x86_64 in Docker. Rule IDs SW-CONC-01..29 are the consolidated ruleset ([swift-concurrency.md](../swift-concurrency.md)); the rules below append from SW-CONC-30. Fixture root `FX` = `/home/mherwig/.cache/research-lang/swift-tools/fixtures/backpressure-and-cleanup/`. `RUN` = `/home/mherwig/.cache/research-lang/swift-tools/run.sh`; every build used `--scratch-path "$SWIFT_SCRATCH/backpressure-and-cleanup/<pkg>-64"` (or `-63` with `SWIFT_VERSION=6.3`). Raw outputs of every run are under `FX/results/`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Status of the 6.4 primitives and the 6.3 diagnostics](#1-status-of-the-64-primitives-and-the-63-diagnostics)
   2. [AsyncStream buffering on 6.4](#2-asyncstream-buffering-on-64)
   3. [Measured memory: unbounded versus bounded versus pull](#3-measured-memory-unbounded-versus-bounded-versus-pull)
   4. [AsyncChannel and the multi-producer channel](#4-asyncchannel-and-the-multi-producer-channel)
   5. [Accept loops: three caps measured](#5-accept-loops-three-caps-measured)
   6. [Cleanup under cancellation: the matrix](#6-cleanup-under-cancellation-the-matrix)
   7. [What a shield does not do: bound, second press, subprocess](#7-what-a-shield-does-not-do-bound-second-press-subprocess)
   8. [Signal-source handlers and isolation](#8-signal-source-handlers-and-isolation)
   9. [The 6.2/6.3 floor](#9-the-6263-floor)
   10. [Names that do not exist](#10-names-that-do-not-exist)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Bound every stream by data kind, not by habit.** Pull source (file chunks, paged registry reads): `AsyncStream(unfolding:)`, lossless, 12,248 KiB peak against 138,956 KiB unbounded. Lossy push: `.bufferingNewest(n)` with `n >= 1`, 12,184 KiB. Lossless push: `AsyncChannel` or the multi-producer channel, 14.1 to 15.7 MiB (SW-CONC-30, -35).
- **`.unbounded` is the default of every `AsyncStream` initializer on 6.4** and nothing in 6.4 changed it ([AsyncStream.swift@swift-6.4.0-RELEASE:301,476](https://github.com/swiftlang/swift/blob/swift-6.4.0-RELEASE/stdlib/public/Concurrency/AsyncStream.swift#L301)); SE-0406, the stdlib backpressure proposal, was returned for revision on 2023-09-13 and the work went to swift-async-algorithms.
- **`bufferingNewest(0)` and `bufferingOldest(0)` are legal and drop every element** (measured: 2000 yielded, 2000 dropped, 0 received); a zero or negative count is a bug, grep it (C2).
- **A synchronous burst into a bounded buffer loses all but `n` elements** (2000 yielded, 8 received): bounded-lossy is for snapshots and progress ticks, never for payload bytes.
- **`AsyncChannel.send` returns normally when its task is cancelled and sends nothing**: a producer loop ran all 2000 iterations after cancel and delivered 69. The multi-producer channel throws `CancellationError` instead (36 sent, 37 received). Producer loops check cancellation after every `send` (C5a/C5b).
- **AsyncChannel is a server/CLI/app tool, not an SDK tool**: it brings swift-async-algorithms 1.1.7 plus swift-collections 1.7.2 (release binary 6,244,408 B against 83,160 B for the stdlib twin) and breaks the owner's stdlib-plus-swift-subprocess budget (Q4). Keep it out of public API; `final class`, `Element: Sendable`, `send` is `async` only.
- **The multi-producer channel has traps**: `Source` is `~Copyable` and cannot be captured by a child-task closure in Swift 6 mode (`[#SendingClosureRisksDataRace]`); 1.1.7 ships only `.watermark(low:high:)` although the Evolution document lists `.unbounded()` (build exit 1); it is availability-gated at macOS 15 / iOS 18 (read only); the `AsyncStreaming` module stays behind the `UnstableAsyncStreaming` trait.
- **An accept loop that spawns a child per connection must cap in-flight children.** 10,000 instant accepts held 10,000 live handlers and 201,060 KiB; a `group.next()` window, a token stream and a counter shed all held 256 (26 to 34 MiB; shed 16.7 MiB with 9,744 refused) (SW-CONC-31).
- **Default accept-loop cap: the `group.next()` window on a plain `withTaskGroup(of: Void.self)`** (the kernel backlog holds the rest); a discarding group cannot call `next()` (`value of type 'DiscardingTaskGroup' has no member 'next'`), so it needs the token stream.
- **Cleanup under cancellation is the one place `defer { await ... }` is wrong without a shield**: `defer { await cleanup() }` aborted (`cleanup ABORTED by cancellation`, file left, exit 1), `defer { Task { await cleanup() } }` finished after the process exited (exit 1), `defer { await withTaskCancellationShield { await cleanup() } }` completed (exit 0, 5 of 5 runs, 0.401 to 0.405 s) (SW-CONC-32).
- **A shield also keeps child tasks alive**: cleanup fanned out over a task group aborted unshielded (`cleanupGroup ABORTED (children saw cancellation)`) and completed shielded.
- **A swift-subprocess child spawned by cleanup is killed on the cancelled owner**: `run()` returned `.signaled(9)` after 0.20 s (cleanup child cut short, exit 1); under a shield `.exited(0)` after 1.2 s (exit 0). Every cleanup that shells out (the future ocx SDK) is shielded.
- **A shield bounds nothing**: a shielded cleanup that never ends kept the process alive past 5 s (timeout exit 124) until a second signal (exit 130, or 143 for SIGTERM). Race the cleanup against a deadline inside the shield (exit 3 at 0.60 s) and keep the second-press escape (SW-CONC-33).
- **Floor for the shield is 6.4; the pre-6.4 form is `await Task { await cleanup() }.value`** on both exits (exit 0 on 6.3 and 6.4), split with `#if compiler(>=6.4)`. 6.3 rejects the 6.4 forms with `error: 'async' call cannot occur in a defer body` and `error: cannot find 'withTaskCancellationShield' in scope`.
- **A `DispatchSource` signal handler written in `main.swift` top-level code traps** (`_dispatch_assert_queue_fail`, exit 132, both toolchains); install it from a nonisolated function or an `@Sendable` closure (SW-CONC-34).
- **Vapor (tools 6.4) already ships awaited defers**: two unshielded (`HTTPServerHandler.swift:41`, `routes.swift:131`) and one that works around the missing shield with `await Task { ... }.value` and a comment about the crash it fixes (`FileIO.swift:182-185`); zero shields in the 40-clone corpus.
- **Hallucination guards, all compiled**: `Task.hasActiveCancellationShield` exists; `Task.hasActiveTaskCancellationShield`, `withCancellationIgnored`, `AsyncChannel(bufferingPolicy:)` and `BackpressureStrategy.unbounded()` do not.
- **The mechanical checks run as grep and as SwiftLint `custom_rules` through the SourceKit image** (exit 2 on the planted violations, 0 on the twin); the static SwiftLint binary skips them (SW-CONC-21).

## Findings

### 1. Status of the 6.4 primitives and the 6.3 diagnostics

- **SE-0493 (`await` in `defer`)**: status "Implemented (Swift 6.4)", review manager Holly Borla, accepted 2025-11-04 ([proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md), [acceptance](https://forums.swift.org/t/accepted-se-0493-support-async-calls-in-defer-bodies/83023)). The body is implicitly awaited at every scope exit and inherits the enclosing isolation (proposal L55-65, L89). The proposal rejects suppressing cancellation inside `defer`: "all code called from the `defer` will observe that cancellation" (L124-132), and the acceptance says task cancellation must be consistent between synchronous and asynchronous `defer`. So `defer { await x }` alone runs under the cancelled task.
- **SE-0504 (cancellation shields)**: "Implemented (Swift 6.4)", review manager John McCall, accepted with revisions 2026-02-10 ([proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md), [acceptance](https://forums.swift.org/t/accepted-se-0504-task-cancellation-shields/84667)). API (L74-81): `withTaskCancellationShield(_:)` in a synchronous and a `nonisolated(nonsending) async` overload, typed throws. Semantics: static `Task.isCancelled`, `Task.checkCancellation()` and `withTaskCancellationHandler` respect the shield (L196-206); the instance `task.isCancelled` does not; structured children created inside a shield are not cancelled by the outer task (L95-121), but `group.cancelAll()` inside still works (L123-133); the shield "will not be available in back-deployment" (L331-333). The acceptance moved the debugging property to a static on `Task`; on 6.4 it compiles as `Task.hasActiveCancellationShield` and `UnsafeCurrentTask.hasActiveCancellationShield` (fixture `FX/names`, V14). The review's stated doc position is that "code should never have observably different behavior in the presence of a shield".
- **Both are in the 6.4 release notes**: [CHANGELOG release/6.4.x L41](https://github.com/swiftlang/swift/blob/release/6.4.x/CHANGELOG.md#L41) (SE-0493) and [L192-205](https://github.com/swiftlang/swift/blob/release/6.4.x/CHANGELOG.md#L192) (SE-0504, "intended for use with cleanup actions"). Swift 6.4.0 is the tag `swift-6.4.0-RELEASE`.
- **6.3.3 diagnostics (V09)**, one `defer` per function in `FX/defer-bad`:

```
$ SWIFT_VERSION=6.3 RUN swift build       # exit 1
dbad/Client.swift:12:21: error: 'async' call cannot occur in a defer body
dbad/Client.swift:7:19: error: cannot find 'withTaskCancellationShield' in scope
```

  The same sources build on 6.4 (exit 0). The `#if compiler(>=6.4)` twin (`FX/defer-good`) builds on both (exit 0, exit 0).

### 2. AsyncStream buffering on 6.4

- The stdlib source at the release tag defines three policies ([AsyncStream.swift@swift-6.4.0-RELEASE:161-182](https://github.com/swiftlang/swift/blob/swift-6.4.0-RELEASE/stdlib/public/Concurrency/AsyncStream.swift#L161-L182)): `.unbounded`; `.bufferingOldest(Int)` ("discard the newly received element", keeps the oldest n); `.bufferingNewest(Int)` ("discard the oldest element in the buffer", keeps the newest n). "If the specified number is zero or negative, no elements are buffered; an iterator receives an element only if it is already awaiting a value when the continuation yields" (L171-172, L179-180). `yield` returns `YieldResult` (L132-159): `.enqueued(remaining:)`, `.dropped(Element)`, `.terminated`.
- Every initializer defaults to `.unbounded`: `init(_:bufferingPolicy:_:)` (L301), `makeStream(of:bufferingPolicy:)` (L476, back-deployed before 5.9), the throwing twins (L559). SE-0314 (Swift 5.5) states the same default ([L325](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md#L325)) and that concurrent iteration "is considered a programmer error" ([L185](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md#L185)): an `AsyncStream` has one consumer.
- `AsyncStream(unfolding:onCancel:)` is pull-based: the producer closure runs only when the consumer asks. Its parameter is `@escaping @Sendable () async -> Element?` ([L345-348](https://github.com/swiftlang/swift/blob/swift-6.4.0-RELEASE/stdlib/public/Concurrency/AsyncStream.swift#L345)), so mutable cursor state needs a `Mutex` or an actor; a captured `var` produced `warning: reference to captured var 'i' in concurrently-executing code [#SendableClosureCaptures]` in the first fixture draft and `Mutex` cleared it.
- There is no bounded, backpressured stream in the 6.4 stdlib. SE-0406 "Backpressure support for AsyncStream" has status **Returned for revision** ([proposal header](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0406-async-stream-backpressure.md), [return post by Xiaodi Wu, 2023-09-13](https://forums.swift.org/t/returned-for-revision-se-0406-backpressure-support-for-asyncstream/67248)). Its successor is the multi-producer channel in swift-async-algorithms, whose pitch says `AsyncStream`'s `YieldResult` "can only signal stop" and has no resume signal ([pitch, Franz Busch, 2025-03-29](https://forums.swift.org/t/pitch-multiproducersingleconsumerasyncchannel/78932)).

### 3. Measured memory: unbounded versus bounded versus pull

Plant `FX/stream`: 2,000 elements of 64 KiB, a producer that yields as fast as it can, a consumer that sleeps 3 ms per element, peak = `VmHWM` from `/proc/self/status`. 6.4, one run (V01); the three repetitions are in `FX/results/reps-6.4.txt` and `reps-stream-6.4.txt`.

| Design | VmHWM peak (start about 9.6 MiB) | Delivered | API cost |
|---|---|---|---|
| `makeStream(of:)` default `.unbounded` | **138,956 KiB** (reps 138,980 / 139,084 / 139,016) | 2000 / 2000 | none (the trap) |
| `.bufferingNewest(8)` | 12,184 KiB (reps 11,960 to 12,192) | 8 / 2000 (1992 `.dropped`) | one argument; `YieldResult` check |
| `.bufferingOldest(8)` | 12,036 KiB | 8 / 2000 | same |
| `.bufferingNewest(0)` | 11,200 KiB | **0** / 2000 | same; silent total loss |
| `AsyncStream(unfolding:)` | **12,248 KiB** (reps 11,920 to 12,272) | 2000 / 2000 | `@Sendable` closure, cursor in a `Mutex`; pull sources only |
| `AsyncChannel<Payload>` (async-algorithms 1.1.7) | 14,204 KiB (reps 14,100 / 14,400 / 14,384) | 2000 / 2000 | dependency; producer is a `Task` calling `await send` |
| `MultiProducerSingleConsumerAsyncChannel`, `.watermark(low: 2, high: 8)` | 16,100 KiB (reps 15,368 / 15,716 / 15,636) | 2000 / 2000 | dependency; `~Copyable` source; section 4 |

6.3.3 repeats the shape: 138,916 / 11,732 / 11,824 / 10,784 / 11,500 KiB for the first five rows, 13,552 and 14,896 for the two channels (`FX/results/stream-6.3.txt`, `channel-6.3.txt`). Wall time: the lossless rows take 6.3 to 6.7 s (the consumer's pace); the lossy rows finish in 0.03 s because the burst is dropped. A bounded policy therefore cuts memory by 11x and, for a synchronous burst, also cuts the work done.

Gate: `LIMIT_KIB=32768` makes the fixture exit 1 when peak growth exceeds 32 MiB: unbounded **exit 1** (`FAIL: peak RSS grew 129252 KiB`), newest8 / oldest8 / unfolding / channel / mpsc **exit 0** (growth 2,652 / 2,636 / 2,484 / 4,012 / 5,476 KiB), same on 6.3 (V01, V02).

### 4. AsyncChannel and the multi-producer channel

- **Status.** swift-async-algorithms 1.1.7 was released 2026-09-30 (tags via `gh api`); `AsyncChannel` and `AsyncThrowingChannel` are in the default `AsyncAlgorithms` product since 1.0 ([Channel.md@1.1.7](https://github.com/apple/swift-async-algorithms/blob/1.1.7/Sources/AsyncAlgorithms/AsyncAlgorithms.docc/Guides/Channel.md#L26-L52): `public final class AsyncChannel<Element: Sendable>: AsyncSequence, Sendable`, `send` is `async`, `finish()` is synchronous). It "applies back pressure": `send` suspends "until the next call to `next()`" (L54), an effective buffer of 1. The package is tools 6.2 and requires swift-collections (`from: "1.7.0"`, resolved 1.7.2): `swift package show-dependencies` printed `swift-async-algorithms@1.1.7 -> swift-collections@1.7.2` (V17; [Package.swift@1.1.7](https://github.com/apple/swift-async-algorithms/blob/1.1.7/Package.swift)). The README promises semantic versioning ([README L99](https://github.com/apple/swift-async-algorithms/blob/main/README.md)); the `AsyncStreaming` module (duplex and reader/writer channels, macOS 27 availability, ~Copyable buffers) is off by default behind the `UnstableAsyncStreaming` trait whose description reads "Do not rely on this module in API stable packages" (`apple/swift-async-algorithms@cbde9aed744b:Package.swift:38-51`).
- **Cancellation is silent on the producer side.** The source says "If the task is cancelled, this function will resume without sending the element" ([AsyncChannel.swift@1.1.7:33-40](https://github.com/apple/swift-async-algorithms/blob/1.1.7/Sources/AsyncAlgorithms/Channels/AsyncChannel.swift#L33-L40)). Measured (V05, `channel-cancel`): the producer loop of 2000 `await channel.send(...)` calls returned from all 2000 and the consumer received 69 (6.3: 58) before the channel finished at 0.237 s; the remaining 1,931 iterations were allocation-only no-ops. The multi-producer channel throws: `producer threw: CancellationError()`, 36 sent, 37 received ([MPSC Internal.swift:347-352](https://github.com/apple/swift-async-algorithms/blob/cbde9aed744b/Sources/AsyncAlgorithms/MultiProducerSingleConsumerChannel/MultiProducerSingleConsumerAsyncChannel+Internal.swift#L347)).
- **The multi-producer channel API cost** (Swift 6 mode, 6.4):
  - `makeChannel(of:throwing:backpressureStrategy:)` returns a `~Copyable` `ChannelAndStream`; `takeChannel()` traps if called twice (`MultiProducerSingleConsumerAsyncChannel.swift:143-150,171-182`, `@cbde9aed744b`).
  - `Source` is `~Copyable` and `send` is `mutating` (`:223,370,586`), so `group.addTask { try await source.send(...) }` fails: `error: passing closure as a 'sending' parameter risks causing data races ... note: closure captures reference to mutable var 'source' [#SendingClosureRisksDataRace]`; `[source = source]` fails `noncopyable 'source' cannot be consumed when captured by an escaping closure`. What compiled: the producer stays in the calling task and the consumer moves out as `channel.elements()` (`consuming func`, `:674`) into an `async let` (`FX/channel/Sources/channel/Mpsc.swift`). The upstream tests only build because the test target is in Swift 5 mode.
  - Only `.watermark(low:high:)` and `.watermark(low:high:waterLevelForElement:)` exist (`:233,250`); the second makes a byte-based bound possible (the closure runs under the lock, must be O(1)). The Evolution document (`Evolution/0016-...md:575-580`) still lists `unbounded()`: `error: type '...BackpressureStrategy' has no member 'unbounded'` (V14).
  - Availability macro `AsyncAlgorithms 1.1` = macOS 15 / iOS 18 / watchOS 11 (`Package.swift:11-20`): unverified: read only. There is no DocC guide for it in `Sources/AsyncAlgorithms/AsyncAlgorithms.docc/Guides/` (21 files, none named for it).
- **Cost of the dependency**: stdlib twin 83,160 B (dynamic stdlib) against 6,244,408 B for the `AsyncChannel` binary, both `swift build -c release`, unstripped, 6.4 (V17). Under the owner's Q4 (SDK depends on stdlib plus swift-subprocess) it is not acceptable for the SDK; swift-service-lifecycle (`from: "1.1.3"`, `Package.swift:26-27`) and hummingbird already depend on it, so servers are fine.
- **Who uses what**: swift-service-lifecycle holds an `AsyncChannel<ServiceConfiguration>` for dynamically added services (`swift-service-lifecycle@c55297914e26:Sources/ServiceLifecycle/ServiceGroup.swift:34,147,188`) and its own back-port shim defaults to `.unbounded` for a `Void` signal stream (`:934`). NIO bounds inbound data by itself: `NIOAsyncChannel` defaults to `HighLowWatermark(low: 2, high: 10)` (`swift-nio@e12881f2a691:Sources/NIOCore/AsyncChannel/AsyncChannel.swift:38-64`, read).

### 5. Accept loops: three caps measured

Plant `FX/accept`: a pull-based acceptor yielding 10,000 connections instantly (worst case: accepts outrun service), each handler holds 16 KiB and sleeps 200 ms, cap 256. Peak in-flight is a `Mutex` gauge (V06).

| Mode | peak in-flight | completed / shed | VmHWM peak | Wall |
|---|---|---|---|---|
| `unbounded`: `withDiscardingTaskGroup`, `group.addTask` per accept (SW-CONC-19 shape) | **10,000** | 10,000 / 0 | **201,060 KiB** | 0.25 s |
| `window`: plain `withTaskGroup(of: Void.self)`, `if inFlight == limit { await group.next(); inFlight -= 1 }` | 256 | 10,000 / 0 | 26,540 KiB | 8.05 s |
| `tokens`: discarding group plus `AsyncStream<Void>` pre-filled with 256 tokens, take a token before pulling the next accept, `tokens.yield()` on handler exit | 256 | 10,000 / 0 | 27,760 KiB | 8.01 s |
| `shed`: `Mutex` counter, over the cap `continue` (close, 503) | 256 | 256 / 9,744 | 16,732 KiB | 0.20 s |

Three window and three token runs: 26.5 / 31.5 / 28.0 MiB against 31.7 / 27.7 / 33.9 MiB, so the two waiting designs are indistinguishable in memory (one outlier of 46 MiB under host load in the first run). 6.3: 203,940 KiB unbounded, 26,008 window, 27,512 tokens, 15,944 shed, same peak counts.

- Why the window: the loop stops pulling accepts while 256 are in flight, so the kernel backlog and NIO's inbound watermark hold the rest; this is what apple/containerization writes for image pulls and pushes (`apple/containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:123-141`, `ImageStore.swift:342-353`: fill `maxConcurrent*` children, then add one per completion).
- Plain-group caveat: the window drains each child with `next()`, so results are consumed; an unconsumed plain group keeps every finished child (SW-CONC-19: 1,089,664 KiB for 200,000).
- A discarding group has no `next()` and no `waitForAll()` for this: `error: value of type 'DiscardingTaskGroup' has no member 'next'` (V14, `FX/names/n9.swift`), so the cap there is the token stream or a gauge.
- `shed` is the only design that does not add latency under flood, and the only lossy one; use it when refusing is a defined response (HTTP 503, close). Do not combine it with `window` on the same listener.
- Satisfying exemplars cap (containerization); the servers do not: hummingbird (`hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117-125`) and the NIO echo servers (`swift-nio@e12881f2a691:Sources/NIOTCPEchoServer/Server.swift:60-76`, comment on the leak it avoids but no cap) use a discarding group with no in-flight bound. Hummingbird relies on the listener, so `ulimit -n` and memory are the real cap (unverified).

### 6. Cleanup under cancellation: the matrix

Plant `FX/cleanup`: the work task sleeps; a self-sent SIGINT after 300 ms reaches a `DispatchSource` signal source whose handler cancels the task. Cleanup = a cancellable `Task.sleep(100 ms)` standing for an awaited flush, then `unlink(tmp)`. Exit 0 means the temp file is gone after the work task ended; exit 1 means cleanup skipped or cut short. 6.4 unless noted (V07, V08):

| Mode | Cleanup form | Result | Exit |
|---|---|---|---|
| `naive` | cleanup after the body on the happy path only | file left | **1** |
| `defer-sync` | `defer { r.syncCleanup() }`, blocking `usleep` then `unlink` | `syncCleanup completed` at 0.40 s, but parks a pool thread for the duration | 0 |
| `defer-task` | `defer { Task { await cleanup(r) } }` | owner finished at 0.30 s, file left | **1** |
| `task-value` | `do { try await body } catch { await Task { await cleanup(r) }.value; throw error }` and the same on the normal exit | `cleanup completed` 0.40 s; **builds and passes on 6.3** | 0 |
| `compat` | `#if compiler(>=6.4)` shielded `defer`, `#else` the `task-value` shape | completed on 6.4 and 6.3 | 0 |
| `defer-async` (6.4) | `defer { await cleanup(r) }` | `cleanup ABORTED by cancellation (CancellationError()); file left behind` at 0.30 s | **1** |
| `defer-shield` (6.4) | `defer { await withTaskCancellationShield { await cleanup(r) } }` | `cleanup completed` at 0.40 s; five more runs 0.401 to 0.405 s | 0 |
| `async-group` (6.4) | `defer { await cleanupGroup(r) }`, cleanup over two child tasks | `cleanupGroup ABORTED (children saw cancellation)` | **1** |
| `shield-group` (6.4) | same under the shield | `cleanupGroup completed` 0.43 s | 0 |

6.3.3 ran `naive` (1), `defer-sync` (0), `defer-task` (1), `task-value` (0) and `compat` (0); the three shield modes do not compile there (section 1). A real external `kill -INT` from another process (`FX/external-sigint.sh`) matched the self-signal: `defer-async` exit 1 with `ABORTED`, `defer-shield` exit 0 with `cleanup completed`. SIGTERM (`SIG=15`) took the same path: `defer-shield` exit 0 (V12). SIGTERM, SIGINT and the second press are the same `DispatchSource` mechanism; Darwin and Windows are unverified: read only.

Reading the matrix:

- A synchronous cleanup (`unlink`, `close(fd)`, `fsync`) needs none of this: plain `defer` completes under cancellation because nothing in it observes cancellation. The shield is for cleanup that `await`s.
- `defer { Task { ... } }` is the same defect as the pre-6.4 "fire and forget" habit: nobody awaits it, and the process may end first.
- The structured pre-6.4 form is `await Task { await cleanup() }.value`: an unstructured task is not cancelled with its parent, and awaiting it keeps the work inside the scope. NIO uses it (`swift-nio@e12881f2a691:Sources/NIOPosix/StructuredConcurrencyHelpers.swift:47,58`, comment "We need to have an uncancelled task here") and so does Vapor inside a 6.4 `defer` (section 11 of Exemplar evidence). SE-0504 names it the workaround it replaces and lists its costs: an extra scheduling hop and no use from synchronous code (L48-65).

### 7. What a shield does not do: bound, second press, subprocess

- **No bound (V10).** `shield-hang` (shielded cleanup that sleeps for an hour): after the first signal the process was still alive when `timeout 5` fired, exit **124**. With a second signal 200 ms later: `signal 2: forcing`, **exit 130** (SIGINT) and **143** for two SIGTERMs. With a 100 ms cleanup and a second press at +50 ms: exit 130, temp file left behind. That is the designed trade of SW-CLI-10/11 (the second press wins) and the reason clig.dev says "if you hit Ctrl-C during clean-up operations that might take a long time, skip them" ([clig.dev](https://clig.dev/)).
- **Deadline inside the shield (V10).** `shield-deadline`: a `withTaskGroup` of the cleanup and a `Task.sleep(300 ms)` race inside `withTaskCancellationShield`, `g.cancelAll()` on the winner: `cleanup DEADLINE exceeded (300 ms); leaving file, exiting 3` at 0.61 s, **exit 3**. It works because children created in a shield are not cancelled by the outer task but `cancelAll()` still cancels them (SE-0504 L95-133). The outer `withDeadline` of SE-0526 is not in 6.4 (SW-CONC-24).
- **Server precedent.** swift-service-lifecycle bounds both stages: `maximumGracefulShutdownDuration` and `maximumCancellationDuration` on `ServiceGroupConfiguration` (`swift-service-lifecycle@c55297914e26:Sources/ServiceLifecycle/ServiceGroupConfiguration.swift:155,183`). SwiftPM's `Cancellator` does the pre-shield version for a CLI: SIGINT source, 30 s deadline, per-handler deadline at 80% of it, `DispatchGroup.wait(timeout:)`, SIG_DFL re-raise (`swiftlang/swift-package-manager@5546f44a3b52:Sources/Basics/Cancellator.swift:56,69-75,154-157,179`).
- **Subprocess children (V13).** `FX/sub-shield`, swift-subprocess 1.0.1 (released 2026-10-09), cleanup = `run(.name("sleep"), arguments: ["1"], output: .discarded)` in a cancelled task: unshielded `child termination: signaled(9)` at 0.20 s, exit 1; `withTaskCancellationShield` `exited(0)` at 1.21 s, exit 0; the pre-6.4 `await Task { ... }.value` `exited(0)` on 6.3 and 6.4. This is the same mechanism as SW-IO-27 ("a cancelled `run()` returns `.signaled(9)`"), which said the shield "may change cleanup inside bodies"; it does, for the whole `run()`.

### 8. Signal-source handlers and isolation

SW-CLI-11 prescribes `DispatchSource.makeSignalSource` per signal. In Swift 6 mode a handler closure written in `main.swift` top-level code is inferred `@MainActor` and libdispatch runs it on its own queue, which traps (V11, `defer-shield` and `compat` modes):

```
$ TOPLEVEL_HANDLER=plain  cleanup defer-shield     # closure written inline in main.swift
*** Program crashed: Illegal instruction ... _dispatch_assert_queue_fail ... exit=132   (6.4 and 6.3)
$ TOPLEVEL_HANDLER=sendable ...   s.setEventHandler { @Sendable in ... }      exit=0
$ (default)  installSigint(worker)  // nonisolated func in the same module    exit=0
```

Same family as SW-CONC-26 (`assumeIsolated`, isolation traps). Exemplars install the source from a class: `AsyncSignalHandler` (`apple/containerization@3e7bc39e66b3:Sources/ContainerizationOS/AsyncSignalHandler.swift:30,100-101`) and `Cancellator` (above). Also measured: `print` from the log helper loses lines when the process is killed by the second signal and stdout is a pipe (block buffering); the fixture logs with `write(2, ...)`, and `setvbuf(stdout, ...)` is rejected in Swift 6 mode (`reference to var 'stdout' is not concurrency-safe`, SW-CLI-08/09 territory).

### 9. The 6.2/6.3 floor

- Libraries at the 6.2 floor (the owner default for SDKs) cannot write the 6.4 forms unconditionally. The measured shape (`FX/defer-good`, `FX/sub-shield` mode `taskvalue`): `#if compiler(>=6.4)` shielded `defer`, `#else` do/catch with `await Task { await close() }.value` on both exits. Built and run on 6.3.3 and 6.4.0.
- CLIs and servers pinned at the current release (6.4) use the shield directly (owner Q1 default).
- Expect the guard to disappear when the floor reaches 6.4; no 6.5 change is known for these two proposals (the next `Task` addition is `withDeadline`, SE-0526, expected 6.5).
- Apple: SE-0504 needs runtime support ("will not be available in back-deployment", L333), so an app with an OS floor below the 6.4 runtime cannot use it: unverified: read only.

### 10. Names that do not exist

Compiled on 6.4 (`FX/names.sh`, `FX/chan-names.sh`; V14):

| Written | Result |
|---|---|
| `Task.hasActiveCancellationShield`, `UnsafeCurrentTask.hasActiveCancellationShield` | exit 0 |
| `Task.hasActiveTaskCancellationShield` (the acceptance post's wording) | `generic parameter 'Success' could not be inferred` |
| `unsafeTask.hasActiveTaskCancellationShield` | `has no member` |
| `withCancellationIgnored { }` (named in SE-0493's alternatives) | `cannot find 'withCancellationIgnored' in scope` |
| `withTaskCancellationShield { }` without `await` in an `async` function | exit 0 (the synchronous overload) |
| `await group.next()` on `withDiscardingTaskGroup` | `value of type 'DiscardingTaskGroup' has no member 'next'` |
| `AsyncChannel<Int>(bufferingPolicy: .bufferingNewest(8))` | `argument passed to call that takes no arguments` |
| `MultiProducerSingleConsumerAsyncChannel...makeChannel(... backpressureStrategy: .unbounded())` | `has no member 'unbounded'` |

## Normative guidance candidates

Numbers continue the SW-CONC ruleset; SW-CONC-18, -19, -20 keep their numbers and are tightened by -30, -31, -32. "Run" names the verification in the Verification runs section.

**SW-CONC-30 (MUST). Choose a stream's shape by its data kind, and never ship an unannotated `.unbounded`: pull sources use `AsyncStream(unfolding:)` or an `AsyncSequence` type; lossy push sources pass `.bufferingNewest(n)` (latest state, progress ticks) or `.bufferingOldest(n)` (first wins) with a named constant `n >= 1`; lossless push sources use the channel of SW-CONC-35; `.unbounded` carries a same-line `// unbounded: <what bounds the producer>`.**
- Why: the default is `.unbounded` on every initializer (stdlib L301, L476): 138,956 KiB against 12,184 (newest 8) and 12,248 (unfolding) for the same 2000 x 64 KiB flood; `bufferingNewest(0)` delivered 0 of 2000; a bounded buffer drops a synchronous burst down to `n`, so payload bytes may never use it.
- Verify: (1) `grep -rnP -e '\.unbounded(?!.*//\s*unbounded:)' --include='*.swift' Sources` (C1, output is the violation); (2) `grep -rnF -e 'bufferingNewest(0)' -e 'bufferingOldest(0)' -e 'bufferingNewest(-' -e 'bufferingOldest(-' --include='*.swift' Sources` (C2); (3) the three construction greps that replace the noisy grep of SW-CONC-18: C3a `grep -rnP -e 'makeStream\((of:\s*[^),]*\.self)?\)' --include='*.swift' Sources`, C3b `grep -rnP -e '(?<!\x2D\x3E\s)Async(Throwing)?Stream(\x3C[^\x3E]*\x3E)?\(\s*[A-Za-z0-9_]+\.self(?![^)]*bufferingPolicy)[^)]*\)\s*\{' --include='*.swift' Sources`, C3c `grep -rnP -e '(?<!\x2D\x3E\s)(?<!:\s)Async(Throwing)?Stream\x3C[^\x3E]*\x3E\s*\{' --include='*.swift' Sources` (`\x3C` and `\x3E` are the angle brackets, `\x2D` the hyphen, so the patterns carry no literal `<` or `>`); (4) behaviour: a flood test with `LIMIT_KIB` as in `FX/stream` (producer 10x faster than consumer, assert peak growth). SwiftLint form (SourceKit image only): `custom_rules` `unbounded_stream_without_reason` and `zero_buffer` (`FX/checks/.swiftlint.yml`).
- Run: yes. `FX/checks.sh` C1, C2, C3a, C3b, C3c each exit 0 with the violation lines on `checks/bad` and exit 1 with empty output on `checks/good`; `FX/swiftlint-sk` exit 2 with 2 stream violations versus 0; V01/V02 memory gate exit 1 versus 0. The old SW-CONC-18 grep printed 8 lines on `bad` of which 4 were signatures and 1 had a policy, and 6 false positives on `good` (`FX/results/checks.txt`, check C3old before the split); C3a/b/c print 4 true hits and none.
- Binds: SDK, CLI, server, OCI tooling. Floor: Swift 5.5 (`unfolding:`, `AsyncStream`), 5.9 (`makeStream`). Default policy: `.bufferingNewest(n)`.

**SW-CONC-31 (MUST for servers and daemons, SHOULD for CLIs). An accept loop that spawns one child task per connection or request caps in-flight children at a named constant (`maxInFlight`, `maxConnections` or `maxConcurrent...`): default a `group.next()` window on a plain `withTaskGroup(of: Void.self)`; use a token `AsyncStream<Void>` before pulling the next accept when the loop must stay in a discarding group; use a gauge that refuses (HTTP 503 or close) only where refusing is the defined overload response. A discarding group alone is not a cap.**
- Why: 10,000 instant accepts held 10,000 live handlers and 201,060 KiB; window, tokens and shed held 256 at 26.5, 27.8 and 16.7 MiB; `group.next()` does not exist on a discarding group; apple/containerization already writes the window; hummingbird and the NIO echo servers do not cap.
- Verify: `grep -rl -e 'DiscardingTaskGroup' --include='*.swift' Sources | xargs -r grep -L -e 'maxInFlight' -e 'maxConnections' -e 'maxConcurrent' -e 'group.next()'` (C6, output = files with a discarding group and no cap vocabulary; judge by output, `xargs` exits 123 when any inner `grep -L` finds none); behavioural: a flood test with 10x the cap connections asserting peak in-flight <= cap (`LIMIT_INFLIGHT`, `FX/accept`); reading heuristic: the cap constant is named in the config surface, has a documented default, and every accept path (including TLS handshake and HTTP/2 stream children) passes through it.
- Run: yes. C6 on `bad` lists `Server.swift` (xargs exit 123), on `good` (window file and a token file that use the vocabulary) empty, exit 0; flood gate `unbounded` exit 1 (`FAIL: peak_in_flight 10000 > LIMIT_INFLIGHT=256`), `window`, `tokens`, `shed` exit 0, on 6.4 and 6.3. The "every accept path" clause is a reading heuristic.
- Binds: server, daemon, OCI registry and proxy code. Floor: Swift 5.9 (discarding groups); the window needs 5.5. Amends SW-CONC-19.

**SW-CONC-32 (MUST). Cleanup that awaits and must survive cancellation is `defer { await withTaskCancellationShield { await x.close() } }` on 6.4; below 6.4 it is `#if compiler(>=6.4)` around that form with `await Task { await x.close() }.value` on both exits in the `#else`; cleanup with no `await` stays a plain `defer`; never `defer { Task { ... } }`, never an unshielded `defer { await ... }`, and a cleanup that spawns a subprocess is always shielded.**
- Why: unshielded `defer { await cleanup() }` aborted at 0.30 s (`ABORTED by cancellation`, exit 1); `defer { Task { } }` left the file (exit 1); the shield completed in 5 of 5 runs (exit 0); child tasks of a shielded cleanup are not cancelled (`shield-group` exit 0 versus `async-group` exit 1); a swift-subprocess child was SIGKILLed unshielded (`.signaled(9)`, exit 1) and finished shielded (`.exited(0)`, exit 0); Vapor's `FileIO.swift:182-185` comments the crash it hit before wrapping its close in a `Task`.
- Verify: `grep -rlPz -e 'defer\s*\{(?![^}]*withTaskCancellationShield)[^}]*\bawait\b' --include='*.swift' Sources` (C4, output = files; it also catches `defer { Task { await ... } }`, which SW-CONC-20's grep names separately); `swift build` on 6.3 fails `'async' call cannot occur in a defer body` if an unguarded 6.4 form ships (the `#if` split is the fix); behavioural: a cancel-then-assert-file-gone test run against the process as in `FX/cleanup` (exit 0 required). SwiftLint form: `custom_rules` `awaited_defer_without_shield`.
- Run: yes. C4 lists `Cleanup.swift` (both a single-line and a multi-line unshielded `defer`) on `bad`, empty on `good` (single-line and multi-line shields); `FX/swiftlint-sk` flags both defers, 0 on the twin; the matrix in section 6 (red: `naive`, `defer-task`, `defer-async`, `async-group`; green: `defer-sync`, `task-value`, `compat`, `defer-shield`, `shield-group`); `FX/gate.sh` 6.3 red (exit 1, the two diagnostics) / 6.4 green; `FX/run-sub.sh`.
- Binds: SDK, CLI, server, OCI tooling. Floor: Swift 6.4 for the shield and for `await` in `defer`; the `#if` split below. Amends SW-CONC-20.

**SW-CONC-33 (MUST). A shielded cleanup is bounded: it races a deadline inside the shield (a task group of the cleanup and a `Task.sleep`, `cancelAll()` on the winner) and ends in a defined outcome; a CLI keeps the second-press escape of SW-CLI-11 (second signal restores `SIG_DFL` and re-raises); a server sets `ServiceGroupConfiguration.maximumCancellationDuration` and `maximumGracefulShutdownDuration`.**
- Why: a shielded sleep of one hour kept the process alive past 5 s (exit 124 under `timeout`); the second press ended it (130; 143 for SIGTERM); the deadline race ended at 0.61 s with exit 3. SE-0504's shield hides cancellation, it does not time anything out.
- Verify: reading heuristic: `grep -rn -e 'withTaskCancellationShield' --include='*.swift' Sources` lists every shield and each body that awaits I/O has a deadline in scope; behavioural: a cleanup stub that never returns must make the process exit within deadline + slack with the documented code, and a second signal must exit 128+n.
- Run: yes for the behaviour (`shield-hang` 124 without the second press, 130 with it; `shield-deadline` exit 3; `FX/run-signals.sh`); the grep and the "every shield has a deadline" judgement are reading only.
- Binds: CLI, daemon, server. Floor: 6.4 for the shield; the deadline race needs only Swift 5.7 (`Clock`).

**SW-CONC-34 (MUST). Install `DispatchSource` signal sources from a nonisolated function (or with an `@Sendable` handler closure) in a file other than `main.swift`; never write the handler closure in top-level code.**
- Why: the closure inferred `@MainActor` is run by libdispatch on a global queue and traps in `_dispatch_assert_queue_fail`, exit 132, on 6.4 and 6.3 (`plain` form); the `@Sendable` closure and the nonisolated installer both exited 0.
- Verify: `grep -rl -e 'makeSignalSource' --include='main.swift' Sources` (C7, output = violating files); behavioural: send the signal to the built binary once (`kill -INT`) and assert the exit code is not 132. SwiftLint form: `custom_rules` `signal_source_in_main_swift`.
- Run: yes. C7 lists `main.swift` on `bad`, empty (exit 1) on `good`; `FX/swiftlint-sk` exit 2 versus 0; `FX/run-handler.sh` `plain` 132, `sendable` 0, `nonisolated-func` 0 on 6.4 and 6.3.
- Binds: CLI, daemon. Floor: Swift 6.0. Refines SW-CLI-11 and SW-CONC-26.

**SW-CONC-35 (SHOULD). `AsyncChannel` is for server, CLI-internal and app code that needs lossless one-to-one backpressure between tasks and already depends on swift-async-algorithms; the SDK and any library below the dependency budget (stdlib plus swift-subprocess) do not import it, and no public API exposes it; every producer loop checks cancellation after each `send`; reach for `MultiProducerSingleConsumerAsyncChannel` (`.watermark(low:high:)`, optionally byte-weighted) only for multiple producers or a byte bound, with the producer in the calling task and the consumer as `elements()`.**
- Why: `AsyncChannel.send` returns silently on cancel (2000 loops returned, 69 delivered); the SDK budget (owner Q4) excludes swift-async-algorithms 1.1.7 and its swift-collections 1.7.2 (6,244,408 B against 83,160 B); `send` is `async` so it cannot serve a synchronous callback or GCD source, which stay on `AsyncStream` with a bounded policy; the multi-producer channel's `Source` is `~Copyable` (capture error in Swift 6 mode), macOS 15 gated (read) and has no `.unbounded`.
- Verify: for the SDK and any library: `grep -rn -e 'swift-async-algorithms' --include='Package.swift' .` (C8, output = violation; add `--include='Package@swift-*.swift'` when versioned manifests exist); for the producer loop: `grep -rlPz -e 'for\b(?![^{]*isCancelled)[^{]*\{(?![^}]*isCancelled)(?![^}]*checkCancellation)[^}]*await\s+\w+\.send\(' --include='*.swift' Sources` (C5a) and the same with `while\b` (C5b), output = files whose send loop never checks (known miss: `try Task.checkCancellation()` in a callee; nested braces end the scan at the first `}`).
- Run: yes. C8 prints the dependency lines on a planted SDK manifest, empty on the subprocess-only twin; C5a and C5b list `Streams.swift` on `bad` and are empty on `good` (the `while ..., !Task.isCancelled` header form included, after the first draft false-positived on it); behaviour in V05; capture error and missing members in V14. The "no public API" clause is a reading heuristic.
- Binds: servers (yes), CLIs and apps (internal only), SDK (no). Floor: swift-async-algorithms 1.0 (`AsyncChannel`), 1.1 (multi-producer); Apple OS floors are unverified: read only.

**SW-CONC-36 (MUST). Use only the shield and backpressure names that exist: `withTaskCancellationShield`, `Task.hasActiveCancellationShield`, `UnsafeCurrentTask.hasActiveCancellationShield`, `AsyncChannel()`, `makeChannel(of:throwing:backpressureStrategy:)` with `.watermark(low:high:)`, and `group.next()` only on a plain group.**
- Why: each invented neighbour compiled to a confusing error (`generic parameter 'Success' could not be inferred`) or to the wrong construct; SE-0493 and the SE-0504 acceptance post use different spellings from the shipped API.
- Verify: `swift build` (compile error; no grep is needed).
- Run: yes. V14: five invented forms exit 1, the real ones exit 0.
- Binds: all. Floor: 6.4.

## Verification runs

All runs on Linux x86_64 Docker. Commands that read or write `FX` files are shown relative to `FX`; `S` = `RUN`, `SC` = `/home/mherwig/.cache/research-lang/swift-tools/build/backpressure-and-cleanup`. "red" = the violation, "green" = the compliant twin.

| ID | Fixture and command (6.4 unless noted) | Red | Green | Key output |
|---|---|---|---|---|
| V01 | `FX/stream`; `S env LIMIT_KIB=32768 $SC/stream-64/debug/stream <mode>` (build: `S swift build --scratch-path $SC/stream-64`) | `unbounded` **exit 1** | `newest8`, `oldest8`, `unfolding` **exit 0** | `FAIL: peak RSS grew 129252 KiB > LIMIT_KIB=32768` versus `OK: peak RSS grew 2652 / 2636 / 2484 KiB`; raw: `VmHWM_peak=138956 / 12184 / 12036 / 12248 KiB`; `newest0` `received=0` |
| V02 | same, `SWIFT_VERSION=6.3`, `stream-63` | `unbounded` exit 1 (`grew 129104 KiB`) | newest8 2304, oldest8 2400, unfolding 2416 KiB, exit 0 | `FX/results/verdicts-6.3.txt` |
| V03 | `FX/channel` (async-algorithms 1.1.7); `S env LIMIT_KIB=32768 $SC/channel-64/debug/channel channel` and `mpsc` | n/a (the twins of V01's red) | `channel` exit 0 (grew 4012 KiB), `mpsc` exit 0 (5476 KiB); 6.3: 3520 / 4928 | `VmHWM_peak=14204 / 16100 KiB` |
| V04 | `FX/reps.sh`, `FX/results/reps-stream-6.4.txt`: three runs per mode | n/a | unbounded 138,980-139,104; newest8 11,960-12,192; unfolding 11,920-12,272; channel 14,100-14,400; mpsc 15,368-15,716 KiB | stable within 3% |
| V05 | `S $SC/channel-64/debug/channel channel-cancel` and `mpsc-cancel` (producer cancelled after 100 ms of consumption) | `channel-cancel`: `sent_returned=2000 received=69` (6.3: 58): silent loss, exit 0 | `mpsc-cancel`: `producer threw: CancellationError()`, `sent_returned=36 received=37` | not a gate; evidence for SW-CONC-35 |
| V06 | `FX/accept`; `S env LIMIT_INFLIGHT=256 $SC/accept-64/debug/accept <mode>` | `unbounded` **exit 1**, `peak_in_flight=10000`, `VmHWM_peak=201060 KiB` | `window` (26540 KiB), `tokens` (27760), `shed` (16732, `completed=256 shed=9744`) all **exit 0**, `peak_in_flight=256`; 6.3 identical counts | `FAIL: peak_in_flight 10000 > LIMIT_INFLIGHT=256` |
| V07 | `FX/cleanup`; `FX/run-cleanup.sh 64` (each mode: `S env TMPFILE=... $SC/cleanup-64/debug/cleanup <mode>`) | `naive` 1, `defer-task` 1, `defer-async` 1, `async-group` 1 | `defer-sync` 0, `task-value` 0, `compat` 0, `defer-shield` 0, `shield-group` 0; `shield-deadline` 3 | `cleanup ABORTED by cancellation (CancellationError()); file left behind` versus `cleanup completed`; `EXIT 1: tmp file still exists` versus `EXIT 0: tmp file removed`; 5 more `defer-shield` runs all exit 0 at 0.401-0.405 s |
| V08 | same, `SWIFT_VERSION=6.3`, `MODES="naive defer-sync defer-task task-value compat" FX/run-cleanup.sh 63` | `naive` 1, `defer-task` 1 | `defer-sync` 0, `task-value` 0, `compat` 0 | the shield modes are absent (`#if compiler(>=6.4)`) |
| V09 | `FX/gate.sh`: `swift build` in `FX/defer-bad` and `FX/defer-good` on both toolchains | 6.3 `defer-bad` **exit 1** | 6.4 `defer-bad` 0; `defer-good` 0 on 6.4 and 6.3 | `error: 'async' call cannot occur in a defer body`; `error: cannot find 'withTaskCancellationShield' in scope` |
| V10 | `FX/run-signals.sh 64`: `shield-hang` plain, with `SECOND_PRESS_MS=200`; `defer-shield` with `SECOND_PRESS_MS=50` | `shield-hang` no second press: `timeout 5` **exit 124** | with second press: `signal 2: forcing`, **exit 130**; `shield-deadline` exit 3 (V07) | `defer-shield` + second press at +50 ms: exit 130, temp file left (by design) |
| V11 | `FX/run-handler.sh 64` and `MODE=compat SWIFT_VERSION=6.3 FX/run-handler.sh 63` | `TOPLEVEL_HANDLER=plain` **exit 132** on both | `sendable` 0, nonisolated installer 0 on both | `Program crashed: Illegal instruction ... _dispatch_assert_queue_fail` |
| V12 | `FX/external-sigint.sh`: another process sends `kill -INT` / `kill -TERM` (`SIG=15`) | `defer-async` exit 1 | `defer-shield` exit 0 for INT and TERM; two TERMs on `shield-hang` exit 143 | `signal 1: cancelling work`, `cleanup completed` |
| V13 | `FX/sub-shield`; `FX/run-sub.sh` (swift-subprocess 1.0.1) | `plain` **exit 1** | `shield` 0 (6.4); `taskvalue` 0 (6.4 and 6.3) | `child termination: signaled(9)` at 0.20 s versus `exited(0)` at 1.21 s |
| V14 | `FX/names.sh` (`swiftc -typecheck -swift-version 6`), `FX/chan-names.sh` (`swift build --product bad / bad2 / good`) | `n2`, `n4`, `n5`, `n6`, `n9`, `bad`, `bad2` exit 1 | `n1`, `n3`, `n7`, `n8`, `n10`, `good` exit 0 | messages in section 10 |
| V15 | `FX/checks.sh` (runs each check in `checks/bad` and `checks/good`) | C1, C2, C3a, C3b, C3c, C4, C5a, C5b, C7, C8: output + exit 0; C6 output + exit 123 | all empty, exit 1 (C6: exit 0) | e.g. C1 `Streams.swift:4: ... bufferingPolicy: .unbounded`; C4 `Sources/App/Cleanup.swift` |
| V16 | `FX/lint.sh`: `swiftlint-sk.sh lint --no-cache --quiet --config .swiftlint.yml Sources` in `checks/bad` and `checks/good` | **exit 2**, 5 violations (`awaited_defer_without_shield` x2, `unbounded_stream_without_reason`, `zero_buffer`, `signal_source_in_main_swift`) | exit 0, no output | requires the SourceKit image; the static binary skips `custom_rules` (SW-CONC-21) |
| V17 | `S swift package show-dependencies` in `FX/channel`; `S swift build -c release --scratch-path $SC/channel-rel` and `stream-rel`; `stat -c %s` | n/a | n/a | `swift-async-algorithms@1.1.7 -> swift-collections@1.7.2`; `channel` 6,244,408 B, `stream` 83,160 B |

Notes: V15 exit codes are the `grep` exit codes inside the harness; C6's 123 is `xargs` reporting an inner `grep -L` exit; "red" for C-checks means output lines present. Each C-check was written before its twin and watched on both. The first drafts of C5 (false positive on a `while ... , !Task.isCancelled` header) and of C3 (noisy SW-CONC-18 grep) were corrected after going wrong on the twin; the shipped forms are the ones above. Timing numbers (0.30, 0.40 s) are host-specific; one `defer-shield` run took 0.85 s under load and still exited 0.

## Exemplar evidence

Corpus: 40 clones under `~/.cache/research-lang/exemplars/swift/<owner>__<repo>` (SHAs in `swift-audit/scratch/exemplar-shas.md`). Greps were run read-only over `.` of the corpus directory.

| Rule | Satisfies | Violates or contradicts |
|---|---|---|
| SW-CONC-30 | `swift-async-algorithms` tests pass explicit policies; Alamofire exposes the policy as a parameter on each public stream (`Alamofire@bda9ed57d729:Source/Features/Concurrency.swift:38,51,64,77,90`, default `.unbounded`) so the caller can bound it | 0 uses of `bufferingNewest`/`bufferingOldest` outside async-algorithms and tests (the audit: 75 of 78 corpus streams unbounded); C3a/C3b/C3c print 57 + 1 + 19 lines outside `/Tests/`, `/Examples/` and benchmarks; `apple/container@f70ecbb926d9:Sources/ContainerBuild/URL+Extensions.swift:90-125` (`zeroCopyReader`: `buffer: ... = .unbounded`, 1 MiB chunks yielded from a `DispatchIO` read with no consumer pacing, a build-context file of any size lands in memory); `swiftlang/swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/SerialEventQueue.swift:32` (`.unbounded`, no stated bound); `rules_swift@50450ed24dde:tools/test_observer/SwiftTestingRunner.swift:115,311`; `swift-container-plugin` subprocess pipe `AsyncThrowingStream` with the default policy (`Plugins/ContainerImageBuilder/Pipe+lines.swift:19`) |
| SW-CONC-31 | `containerization@3e7bc39e66b3:ImageStore+Import.swift:123-141` and `ImageStore.swift:342-353` (fill N, then one per completion; `maxConcurrentDownloads: Int = 3`, `maxConcurrentUploads: Int = 3`) | `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117-125` (discarding group, no bound), `swift-nio@e12881f2a691:Sources/NIOTCPEchoServer/Server.swift:60-76`, `Sources/NIOWebSocketServer/Server.swift:123-124`, `swift-aws-lambda-runtime@8abd464310c7:Sources/MockServer/MockHTTPServer.swift:103-115` (one connection by design); C6 lists 18 files outside tests, among them grpc-swift-2 `GRPCServer.swift` and vapor `Application.swift` (candidates: each needs the reading step, a listener-level limit may exist) |
| SW-CONC-32 | `swift-nio@e12881f2a691:Sources/NIOPosix/StructuredConcurrencyHelpers.swift:47,58` (pre-shield `Task { }.value`); `vapor@bf77fc69b142:Sources/Vapor/Utilities/FileIO.swift:182-185` (`defer { await Task { try? await handle.close() }.value }` with the comment "Wrap the close handle in a task to avoid inheriting cancellation ... leading to a crash"; Vapor `Package.swift` is `swift-tools-version:6.4`) | `vapor@bf77fc69b142:Sources/Vapor/HTTP/Server/HTTPServerHandler.swift:41` (`defer { try? await bodyStream.drain(max: drainLimit) }`, unshielded), `Sources/Development/routes.swift:131` (`defer { try? await handle.close() }`, unshielded; whether NIOFS `close()` observes cancellation is unread), `tuist@2f6ac74754bf:cli/Sources/TuistLoader/ProjectDescriptionHelpers/ProjectDescriptionHelpersBuilder.swift:208-211` and `app/Sources/TuistPreviews/PreviewsView/PreviewsViewModel.swift:82-90,108-116` (`defer { Task { ... } }`); zero uses of `withTaskCancellationShield` in all 40 clones, which corrects the "none uses SE-0493" line of the tasks dive (Vapor does) |
| SW-CONC-33 | `swift-service-lifecycle@c55297914e26:ServiceGroupConfiguration.swift:155,183` (both durations); SwiftPM `Cancellator.swift:56,69-75,154-157,179` (30 s, handlers at 80%, SIG_DFL after) | none found; the containerization `AsyncSignalHandler` has no deadline (cleanup lives in callers) |
| SW-CONC-34 | `containerization@3e7bc39e66b3:AsyncSignalHandler.swift:30,100-101` (class method installs the source); `swift-package-manager@5546f44a3b52:Cancellator.swift:69-70` | C7 over the corpus lists none in a `main.swift` under `Sources`; 10 files contain `makeSignalSource`, none at top level of an executable `main.swift`, so the trap has no corpus instance (an agent habit, not a corpus one) |
| SW-CONC-35 | `swift-service-lifecycle@c55297914e26:ServiceGroup.swift:34,147,188` (internal `AsyncChannel`, not in public API; dependency `from: "1.1.3"`); hummingbird and service-lifecycle depend on swift-async-algorithms (C8 over the corpus lists their manifests) | no Swift SDK in the corpus to violate the budget; `AsyncChannel` is otherwise used only as `NIOAsyncChannel`, a different type with its own `HighLowWatermark(low: 2, high: 10)` default |

## AI-agent angle

What a model writes, why it survives the build, and the smallest mechanical check:

| Mistake | Why it compiles | Check |
|---|---|---|
| `AsyncStream { continuation in ... }` or `makeStream(of:)` for a firehose, no policy | unbounded default; 139 MB versus 12 MB | C3a/C3b/C3c; C1 for the annotated `.unbounded` |
| `.bufferingNewest(0)` or a guessed tiny `n` "to save memory" | legal; 0 of 2000 delivered | C2; flood test asserting delivered count |
| Using a bounded stream for payload bytes (blob chunks) | compiles; silently drops 1992 of 2000 | reading: lossless data must be pull (`unfolding:`) or a channel |
| `defer { Task { await close() } }` | compiles (the pre-6.4 workaround it learned) | C4 (also SW-CONC-20 grep) |
| `defer { await close() }` on 6.4 with no shield, "async defer fixes cleanup" | compiles on 6.4; aborts under cancellation | C4 |
| `Task.detached { await cleanup() }` to escape cancellation | compiles; unawaited, may outlive the process | SW-CONC-14 grep; use the shield |
| Shield around an unbounded wait, no deadline | compiles; process unkillable by the first signal (124) | SW-CONC-33 reading check; hang-stub test |
| `signal`/`DispatchSource` handler inline in `main.swift` | compiles; traps off-main (132) | C7, SwiftLint `signal_source_in_main_swift` |
| Accept loop `for await c in inbound { group.addTask { ... } }` with no cap, or `await group.next()` on a discarding group | first compiles; second is an error the model "fixes" by dropping the discarding group | C6; flood test; `swift build` |
| Poll-for-slot loop `while inFlight >= max { try? await Task.sleep(...) }` | compiles; hot spin after cancel | SW-CONC-17 grep |
| `DispatchSemaphore` as the connection cap | compiles on Linux; blocks the cooperative pool | SW-CONC-15 grep |
| Adding swift-async-algorithms to the SDK for `AsyncChannel` | builds; breaks the dependency budget | C8 |
| `AsyncChannel` producer `for ... { await ch.send(x) }` with no cancel check; or treating `send` returning as delivery | silent no-op loop after cancel | C5a/C5b |
| `AsyncChannel(bufferingPolicy:)`, `BackpressureStrategy.unbounded()`, `Task.hasActiveTaskCancellationShield`, `withCancellationIgnored` | invented | `swift build` (SW-CONC-36) |
| Capturing the multi-producer `Source` in `group.addTask` | the upstream doc comment shows it; Swift 6 mode rejects it | `swift build` (`SendingClosureRisksDataRace`) |
| `print` progress in a signal path, then exit by signal | stdout block-buffered, lines lost | log to stderr (SW-CLI-09) |
| Cleanup `Task.sleep` / `URLSession` call inside plain `defer` assumed to run to completion | each of those checks cancellation | C4 plus the shield rule |

## Contested / evolving

- **Where backpressure lives (as of 2026-10-10).** The stdlib has none: SE-0406 was returned in 2023 and nothing replaced it in 6.4 (the stdlib file is unchanged in the three policy cases). Apple's answer is the package: `AsyncChannel` (1.0), the multi-producer channel (1.1, implemented), and an unstable `AsyncStreaming` module with `~Copyable` buffers gated to macOS 27 and 6.4 behind a trait. Trend: toward noncopyable, scoped channels (`withChannel`, ownership of the buffer); not source-stable yet. This round recommends the 1.0/1.1 types and avoids the trait module.
- **Unbounded default.** No proposal to change `.unbounded` was found; an SE-0314 reviewer objected to it in 2021 ("the default of Int.max"). Libraries (Alamofire) keep it but expose the parameter. Trend: policy at call sites, via lint, not a language change.
- **Shield versus "defer should un-cancel".** SE-0493 deliberately kept cancellation visible in `defer`; SE-0504 supplies the opt-in. The acceptance asks that "code should never have observably different behavior in the presence of a shield", which is in tension with using it for exactly the cleanup that must behave differently. Trend: shield-in-defer becomes the documented pair (CHANGELOG L192-197, the swift.org release notes for 6.4); Vapor is the first exemplar to use awaited defer, and half its sites are unshielded, so the agent/linter gap is real now.
- **AsyncChannel versus MPSC for new code.** Both are 1.x; `AsyncChannel` has no multi-producer story and a silent-cancel contract; MPSC fixes the contract and costs ownership ergonomics and a macOS 15 floor (unverified: read only). Practitioners disagree on a default; this round picks `AsyncChannel` for one-to-one lossless server code because it builds on every Swift 6 mode and has the smallest surface, and MPSC where a byte watermark or multiple producers are needed.
- **Window versus shed.** Whether a server should wait (window) or refuse (shed) when saturated is a product decision (latency versus availability), not a Swift one; this round fixes the default as the window and requires the choice to be named.
- **Pending re-checks.** `withDeadline` (SE-0526, expected 6.5) will change the bounded-cleanup recipe; re-measure `shield-deadline` against it at that toolchain. macOS and Windows behaviour of the signal and shield paths needs a runner (owner Q5/Q7).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md | SE-0504 task cancellation shields (primary) | Implemented 6.4; accepted 2026-02-10 | API, child-task and handler semantics, static versus instance, no back-deployment |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md | SE-0493 async calls in `defer` (primary) | Implemented 6.4; accepted 2025-11-04 | rejects cancellation suppression inside `defer`; implicit await |
| https://forums.swift.org/t/accepted-se-0504-task-cancellation-shields/84667 | Acceptance post, John McCall (core team) | 2026-02-10 | revision to the static `hasActive...` property; documentation stance |
| https://forums.swift.org/t/accepted-se-0493-support-async-calls-in-defer-bodies/83023 | Acceptance post, Holly Borla (core team) | 2025-11-04 | cancellation must stay consistent between sync and async `defer` |
| https://github.com/swiftlang/swift/blob/release/6.4.x/CHANGELOG.md | Swift 6.4 changelog (primary) | 6.4 | SE-0493 (L41) and SE-0504 (L192) listed as shipped |
| https://github.com/swiftlang/swift/blob/swift-6.4.0-RELEASE/stdlib/public/Concurrency/AsyncStream.swift | stdlib `AsyncStream` source at the release tag (primary) | 6.4.0 | the three `BufferingPolicy` cases, `YieldResult`, defaults, `@Sendable` `unfolding:` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md | SE-0314 AsyncStream (primary) | Swift 5.5 | original `.unbounded` default; single-consumer rule |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0406-async-stream-backpressure.md | SE-0406 backpressure for AsyncStream (primary) | status "Returned for revision" | why the stdlib has no bounded stream |
| https://forums.swift.org/t/returned-for-revision-se-0406-backpressure-support-for-asyncstream/67248 | Return post, Xiaodi Wu | 2023-09-13 | reason: design not sufficient for reviewers' use cases |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0381-task-group-discard-results.md | SE-0381 discarding task groups (primary) | Swift 5.9 | what a discarding group does not bound |
| https://github.com/apple/swift-async-algorithms/blob/1.1.7/Sources/AsyncAlgorithms/AsyncAlgorithms.docc/Guides/Channel.md | AsyncChannel guide (primary, tool repo) | 1.1.7, 2026-09-30 | API, back-pressure and cancellation contract |
| https://github.com/apple/swift-async-algorithms/blob/1.1.7/Sources/AsyncAlgorithms/Channels/AsyncChannel.swift | AsyncChannel source | 1.1.7 | "If the task is cancelled, this function will resume without sending the element" |
| https://github.com/apple/swift-async-algorithms/blob/1.1.7/Package.swift | Package manifest | 1.1.7, tools 6.2 | swift-collections dependency, `UnstableAsyncStreaming` trait |
| https://github.com/apple/swift-async-algorithms/blob/cbde9aed744b/Evolution/0016-multi-producer-single-consumer-channel.md and the `MultiProducerSingleConsumerChannel` sources at that SHA | SAA-0016 and implementation | 2026-10-05 | `.watermark` API, `~Copyable` source, cancellation throws, doc/code drift on `.unbounded()` |
| https://forums.swift.org/t/pitch-multiproducersingleconsumerasyncchannel/78932 | MPSC pitch, Franz Busch | 2025-03-29 | what `AsyncStream` cannot do (no resume signal) |
| https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Concurrency.md | The Swift Programming Language, Concurrency (primary) | current | cooperative cancellation, `checkCancellation`, `addTaskUnlessCancelled` (L655-709) |
| https://clig.dev/ | Command Line Interface Guidelines | current | Ctrl-C: exit fast, skip long cleanup, second press forces |
| https://github.com/swift-server/swift-service-lifecycle (clone `c55297914e26`) | ServiceLifecycle | 2026-10 | `maximumCancellationDuration`, `maximumGracefulShutdownDuration`, `AsyncChannel` use |
| https://github.com/apple/swift-nio (clone `e12881f2a691`) | SwiftNIO | 2026-10 | `NIOAsyncChannel` watermark default, pre-shield `Task { }.value` helper |
| https://github.com/vapor/vapor (clone `bf77fc69b142`) | Vapor, tools 6.4 | 2026-10-04 | first exemplar with awaited `defer`; the shield-less workaround and its comment |
| https://github.com/apple/containerization (clone `3e7bc39e66b3`) | apple/containerization | 2026-10 | `group.next()`-style windows; `AsyncSignalHandler` |
| https://github.com/swiftlang/swift-package-manager (clone `5546f44a3b52`) | SwiftPM | 2026-10 | `Cancellator`: bounded cancellation cycle with SIGINT source |
| https://github.com/apple/container (clone `f70ecbb926d9`) | apple/container | 2026-10 | `zeroCopyReader` unbounded file stream |
| https://github.com/Alamofire/Alamofire (clone `bda9ed57d729`) | Alamofire | 2026-10 | libraries exposing `bufferingPolicy` to callers |
| https://github.com/swiftlang/swift-subprocess/releases (`gh api`) | swift-subprocess release list | 1.0.1, 2026-10-09 | the version the cleanup fixture ran against |
| https://github.com/apple/swift-async-algorithms/releases (`gh api`) | swift-async-algorithms releases | 1.1.7, 2026-09-30 | the tag the fixtures pin |
| https://github.com/realm/SwiftLint (clone `ec4691d9e813`, image `ghcr.io/realm/swiftlint:0.65.1`) | SwiftLint 0.65.1 | 2026 | `custom_rules` need the SourceKit image |

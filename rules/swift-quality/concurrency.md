---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: Swift Concurrency
summary: The SW-CONC family. Sendable and its escape hatches, Mutex versus actor versus MainActor, isolation settings, task ownership, cancellation, continuations, blocking in async code, bounded streams, accept-loop caps, cleanup under cancellation and signal-source isolation
---

# Swift Concurrency

Rows bind to Swift 6.4.0 and 6.3.x on Linux x86_64 (measured 2026-10-10), with swift-async-algorithms 1.1.7,
swift-subprocess 1.0.1 and SwiftLint 0.65.1 where a row names them. Apple, Windows and Android behaviour is
`unverified: read only`.

Owns `Sendable` and its hatches, shared-state tool choice, isolation settings, unstructured tasks, blocking in
async code, continuations, timeouts, streams and their buffering, accept-loop caps, cleanup that awaits under
cancellation, and the isolation of signal sources. Not owned here: the manifest spelling of `defaultIsolation`,
`NonisolatedNonsendingByDefault` and `ApproachableConcurrency` is `SW-PKG` (`SW-PKG-08`, `SW-PKG-16`,
`SW-PKG-19`). CI wiring of the greps, the warning flags and the TSan job is `SW-GATE`. The subprocess wrapper
and pipe draining are `SW-IO`. Signal protocol, second-press escape and `ServiceGroup` durations are `SW-CLI`.
The TSan test leg is `SW-TEST-17`. Capture rules and the `Thread` ban are `SW-LANG`. Apple deployment floors
are `SW-APPLE`. Network deadlines are `SW-NET`. **SDK** means the pinned default shape, a library that wraps a
CLI on the stdlib plus swift-subprocess. Without one, read "library".

Contents: [Dates and Defaults](#dates-and-defaults) · [Group 1: The Compiler or a Build Exit Decides](#group-1-the-compiler-or-a-build-exit-decides) ·
[Group 2: A Grep or Awk Decides](#group-2-a-grep-or-awk-decides) ·
[Group 3: A Behavioural Test Decides](#group-3-a-behavioural-test-decides) ·
[Group 4: A Reading Heuristic Decides](#group-4-a-reading-heuristic-decides) ·
[Check Scripts](#check-scripts) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Defaults

- **Pinned defaults, the adopter may override:** libraries and the SDK use tools 6.2 and Swift 6 mode, CLIs and
  servers use 6.4. No `defaultIsolation` outside apps. The SDK imports no package beyond swift-subprocess, so it
  never imports swift-async-algorithms (`SW-CONC-35`).
- Floors name their mechanism. Manifest-gated: `defaultIsolation` and the upcoming-feature spellings, tools 6.2.
  Compiler-gated: `~Sendable` and `withTaskCancellationShield` with `await` in `defer`, Swift 6.4 (SE-0493,
  SE-0504, no back-deployment). `weak let`: introduced in 6.2.3, declared floor 6.3 behind `#if compiler(>=6.3)`
  (`SW-LANG-03`). Stdlib: `Mutex` Swift 6.0 (Apple floor macOS 15 and iOS 18, `SW-APPLE-04`).
- Absent on 6.4: `withDeadline` ([SE-0526](https://forums.swift.org/t/accepted-with-modifications-se-0526-withdeadline/88645), accepted 2026-07-30, expected 6.5) and a first-party bounded lossless
  stream ([SE-0406](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0406-async-stream-backpressure.md) was returned for revision on 2023-09-13). Invented spellings fail `swift build`.
- `NoUseUnstructuredThrowingTask` exists on 6.4 only (measured 2026-10-10). Naming it on a 6.3 leg fails with
  `unknown warning group` (`SW-GATE-15`).

## Group 1: The Compiler or a Build Exit Decides

The gate is `SW-GATE-01` steps 2 and 3 on the floor and the current legs (`SW-GATE-25`). A non-zero exit is the
finding. Script names S1 to S10 are under [Check Scripts](#check-scripts).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CONC-01 | Add `@unchecked Sendable` only when deleting it breaks the build, a guard is visible in the type body, and a comment directly above or trailing names the guard and what keeps every access inside it. | swiftc and SwiftLint are silent on an unguarded body: a `var`-holding class built clean under `-warnings-as-errors` on 6.3 and 6.4 and lost 128,131 of 400,000 increments. 380 of 554 corpus `@unchecked` lines carry no comment, so the reason check gates changed files, not the tree. | (a) Removal test S5, per file: exit 0 means delete the hatch in that file, non-zero means the compiler needs it. (b) S3 over changed files, then read each hit: "silences a compiler error", "needed for Swift 6" and "temporary" are not reasons. (c) S1 with `@unchecked Sendable` over changed files. S1 proves a comment exists, the 3-word gate is `checks/k07.sh` (`SW-GATE-10`). Exempt from (c): generated files and the lock primitive itself when its doc comment says so. Empty output from S1 or S3 is the pass. S1, S3 and S5 watched red and green (measured 2026-10-10, 6.4 and 6.3). (b)'s reading is a heuristic. | MUST |
| SW-CONC-02 | Declare a `final class` whose only stored state is `let` `Mutex<…>` values as plain `Sendable`, never `@unchecked`. | Checked `Sendable` holds on 6.3 and 6.4 for any `Value`, and the compiler then rejects the first stray mutable property (`stored property 'extra' of 'Sendable'-conforming class 'Leaky' is mutable`). Floor: Swift 6.0. | S5 per file over every file that declares an `@unchecked` class: exit 0 is the violation. Candidates: `grep -Rn -e 'Mutex<' --include='*.swift' Sources`, where empty output means no candidates. Watched red and green (measured 2026-10-10). | MUST |
| SW-CONC-03 | On 6.4 legs treat `NoUseUnstructuredThrowingTask` as an error through the blanket flag of `SW-GATE-13`, and never name the group on a leg that lacks it. The group fires on statement-position `Task`, `Task.detached` and `Task.immediate` with a throwing body. It misses `_ = Task { try … }`, a non-throwing task and `Task { try … }.cancel()`. `SW-CONC-13` is the floor-independent gate. | `Task.init` is `@discardableResult`, so a throwing body's error vanishes. The group is a default-on warning on 6.4, so `-warnings-as-errors` already errors on it. SwiftLint's opt-in `unhandled_throwing_task` adds only the `.cancel()` form and ships in no default config (SwiftLint 0.65.1, read 2026-10-10). A typed-throws `Task { () throws(E) in … }` crashes swift-frontend in IRGen (swift-frontend 6.3 and 6.4, measured 2026-10-10), so avoid it. Floor: Swift 6.4. | `swift build -Xswiftc -warnings-as-errors` exits non-zero on a statement-position throwing `Task` on 6.4 and exits 0 on 6.3. Watched red (measured 2026-10-10). | SHOULD |
| SW-CONC-04 | Every public type of a library or SDK states `Sendable`, an unavailable `Sendable`, or on 6.4 `~Sendable`. Use `weak let` instead of `@unchecked` for a weak back-reference to a `Sendable` referent. | An unannotated public type silently becomes someone else's data race. `final class Child: Sendable { weak let parent: Parent? }` builds on 6.3 and 6.4 (measured 2026-10-10), but not when the referent is `AnyObject`. On 6.3 `~Sendable` needs `-enable-experimental-feature TildeSendable`. Floors: `weak let` 6.3, `~Sendable` 6.4, and at the 6.2 library floor use the unavailable conformance. | `SW-GATE-17` owns the group promotion and its exit code, one error per public type lacking a statement. Empty build output on the gate leg is the pass. `weak let` needs only `swift build` on the floor and current legs. | SHOULD |
| SW-CONC-05 | Replace a transfer box (`struct Box<T>: @unchecked Sendable`) with a `sending` parameter or result when the value is handed off once. | The box compiles a use-after-send silently and `sending` rejects it (`sending 'n' risks causing data races [#RegionIsolation::SendingRisksDataRace]` on 6.4, `[#SendingRisksDataRace]` on 6.3). Floor: Swift 6.0. | Candidates: `grep -Rn -e 'Unsafe.*Box' -e 'TransferBox' --include='*.swift' Sources`, where empty output means none. Then rewrite the signature and run S5 on that file. `-Xswiftc -Werror -Xswiftc SendingRisksDataRace` promotes just that group. Watched red (measured 2026-10-10). | SHOULD |
| SW-CONC-06 | A published library with public async or protocol API ships a `CompileTests/` package that builds the API under a consumer's defaults, and CI builds it on the floor and the current toolchain. | The library compiles alone and breaks consumers: a generic API needing a nonisolated `Sendable` conformance fails with `main actor-isolated conformance of 'MyHandler' to 'Handler' cannot be used in @concurrent context [#IsolatedConformances]` on 6.4. Default: document the recipe, ship no template. | `swift build` in `CompileTests/` exits 0. Its settings are `.defaultIsolation(MainActor.self)`, `.enableUpcomingFeature("NonisolatedNonsendingByDefault")`, `.enableUpcomingFeature("InferIsolatedConformances")`, `swiftLanguageModes: [.v6]`, tools 6.2 and a path dependency on the library. Fix shape: `public nonisolated(nonsending) func run<T: Handler>(_ h: T) async`. Watched red and green on 6.4 and 6.3 (measured 2026-10-10). | SHOULD |
| SW-CONC-07 | Never paste `NonisolatedNonsendingByDefault` into existing code. Run `swift package migrate --target MyLib --to-feature NonisolatedNonsendingByDefault` (rename the target, procedure `SW-CORE-12`), review each `@concurrent` it adds, build on the floor and the current toolchain, and keep one runtime isolation assert. An async wrapper forwarding to an isolation-capable API takes `isolation: isolated (any Actor)? = #isolation` and passes it on. | SE-0461 says the same code "means something different" with the feature, and no diagnostic fires. A nonisolated async helper asserting caller isolation exits 132 (`Illegal instruction`) without the feature and 0 with it, on 6.3 and 6.4, under the default backtracer and under `SWIFT_BACKTRACE=enable=no` (measured 2026-10-10). A wrapper iterator doing `return await self.iterator.next()` fails with `sending 'self.iterator' risks causing data races`. Floor: Swift 6.2. | A test calling the helper from `@MainActor` with `MainActor.preconditionIsolated()`, run with and without the feature. `swift build` with the feature on both toolchains. Twin: `public mutating func next(isolation actor: isolated (any Actor)? = #isolation) async -> Int? { await iterator.next(isolation: actor) }`. Watched red: 132 versus 0, build exit 1 versus 0 (measured 2026-10-10). | MUST |
| SW-CONC-08 | Hold a `Mutex` or lock only to read or write the guarded value: no `await`, no call to a user-supplied closure or delegate, no re-entry of the same lock, no continuation resume, no logging. | `Mutex` is non-recursive: direct re-entry hangs on 6.4.0 (`timeout 20` exit 124) and traps on 6.3.3 (`Recursive call to lock Mutex`, exit 132). SE-0433 calls re-entry platform-dependent (measured 2026-10-10). Floor: Swift 6.0. | The compiler rejects `await` inside `withLock` and `NSLock.lock()` in async code (exit 1, watched). Callbacks, re-entry, resume and logging are a reading heuristic: "the `withLock` body calls no closure parameter, no method that takes the same lock, no `resume`, no logger". | MUST |

```swift
// wrong: the hatch also hides the next stray var from the compiler
final class Cache: @unchecked Sendable {
    private let state = Mutex<[String: Int]>([:])
}

// right: all stored state is a let Mutex, so plain Sendable is checked
final class Cache: Sendable {
    private let state = Mutex<[String: Int]>([:])
}
```

## Group 2: A Grep or Awk Decides

Each command prints the violation and empty output is the pass (grep exits 1). Replace `Sources` with the target's
source directories, test directories are excluded by the operand. A check run on a diff feeds it the changed files.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CONC-09 | Add `nonisolated(unsafe)` on a `let` of an immutable non-Sendable value only with a one-line reason. On a `var`, also name the lock and route every access through one function. | 58% of 191 audited sites are `let`, and the `var` form is the dangerous one. 98 of 200 corpus lines carry no reason. Floor: `nonisolated(unsafe)` 5.10, `unsafe` expressions 6.2. | S1 with `nonisolated(unsafe)` over changed files, empty output is the pass. Then `grep -Rn -e 'nonisolated(unsafe) var' -e 'nonisolated(unsafe) public var' --include='*.swift' Sources`, where each hit must name its lock (reading). `.strictMemorySafety()` (SE-0458) lists each *use* as `[#StrictMemorySafety]` but neither the declaration nor `@unchecked Sendable`, so it is no hatch audit. Watched red and green (measured 2026-10-10). | MUST |
| SW-CONC-10 | Write `@preconcurrency import X` only for libc and OS shims (`Glibc Musl WASILibc Android Bionic Darwin CRT WinSDK Dispatch EmscriptenLibc`), otherwise with a comment naming the module, the missing annotation and a removal trigger. Declaration-level `@preconcurrency` on a protocol or function you evolve stays allowed. | The attribute is a per-import mute switch: a real `[#SendingRisksDataRace]` error became no diagnostic, and an unneeded `@preconcurrency import Foundation` drew no warning. 98 of 101 non-shim imports in the corpus have no comment. Floor: Swift 6 mode. | S2 over changed files, empty output is the pass. Watched red and green: 2 lines on the plant, 0 on the twin (measured 2026-10-10). S2 reads the module as the first dotted component after an optional visibility modifier and kind keyword: `@preconcurrency import struct Glibc.timeval` and `@preconcurrency import Glibc.sys` are shims and print nothing, `@preconcurrency public import Foo` and `@preconcurrency internal import Bar` print (a plant file printed 3 lines: `public`, `internal` and `Foundation`, and none for the `Glibc.timeval`, `Glibc.sys`, plain `Glibc` and comment-justified lines, measured 2026-10-10). | MUST |
| SW-CONC-11 | Libraries, SDKs, CLIs, daemons and servers never set `.defaultIsolation(MainActor.self)`. Only app targets, app-internal UI packages that no other package consumes, and compile-test executables may, with explicit `.swiftLanguageMode(.v6)`. | A library that sets it breaks every nonisolated consumer (6 errors on 6.4, 5 on 6.3: `[#ActorIsolatedCall]`, `[#IsolatedConformances]`). An executable's entry point is already `@MainActor`, so a CLI gains nothing. 0 of 38 library and tool roots set it. Floor: tools 6.2 (SE-0466). | `grep -Rn --exclude-dir='.build' -e 'defaultIsolation' --include='Package*.swift' .`, where every hit must be an app or compile-test manifest and empty output is the pass (`SW-PKG-19` is the manifest-side pointer). S6 names exported targets that set it. Watched red and green (measured 2026-10-10). | MUST |
| SW-CONC-12 | In new library, SDK, CLI and server targets and their test targets, enable `NonisolatedNonsendingByDefault` by name. Do not ship the toolchain template's `ApproachableConcurrency` bundle (`SW-PKG-16`); a manifest that mirrors an Xcode project spells the members too (`SW-APPLE-05`). `InferIsolatedConformances` follows `SW-PKG-08`. Mark non-suspending public async functions whose CPU work stays under the `SW-CONC-23` threshold (a few milliseconds) `@concurrent` with a reason. Longer CPU work follows `SW-CONC-23`. | NNBD removes the trap where `nonisolated async` hops off the caller's actor: `f()` printed `Optional(Swift.MainActor)` with it and `nil` without. `@concurrent` leaves the caller's actor but stays on the cooperative pool, so it is not the answer for blocking calls (`SW-CONC-23`). In Swift 6 mode the bundle adds only NNBD and `InferIsolatedConformances` (read 2026-10-10, Swift 6.4.0), and the 6.4 template also writes it on test targets (measured 2026-10-10). Floor: Swift 6.2. | `grep -Rn --exclude-dir='.build' -e 'ApproachableConcurrency' --include='Package*.swift' .` where output is the violation. Presence: `grep -Rn --exclude-dir='.build' -e 'NonisolatedNonsendingByDefault' --include='Package*.swift' .` where empty output means not enabled. Watched red on the 6.4 template (2 lines) and empty on the 6.3 template (measured 2026-10-10). | SHOULD |
| SW-CONC-13 | Every unstructured `Task {}` is stored and cancelled on its owner's shutdown path, returned or awaited by its creator, or is a callback-to-async bridge written `_ = Task { … } // fire-and-forget: <why safe>` whose body handles all errors, or the `Task {` of a `@available(*, noasync)` bridge that its creator waits on (semaphore or group), marked `// bridge: <what waits>` on the `Task {` line (SW-CONC-15). Any other statement-position `Task {` is a violation. | Unstructured tasks survive their creator's cancellation (`Task{}` and `Task.detached` both saw `cancelled=false` after the parent was cancelled). 709 of 882 corpus `Task {}` are bare statements. Floor: Swift 5.5. | `grep -Rn -e '^[[:space:]]*Task[[:space:]]*{' -e '^[[:space:]]*Task[[:space:]]*(.*)[[:space:]]*{' -e '^[[:space:]]*Task[^.[:alnum:]_ (].*{' -e '^[[:space:]]*Task\.detached' --include='*.swift' Sources`, then drop marked bridge lines with `grep -v -e '// bridge:'` on the output. Then `grep -Rn -e '_ = Task' --include='*.swift' Sources`, where each hit needs the `fire-and-forget:` marker. For stored handles, read that a `.cancel()` is reachable from stop or close. Known miss: multi-line `Task(\n priority:`. Watched red and green, 7 lines versus empty (measured 2026-10-10). | MUST (library, SDK, CLI, server) · SHOULD (app) |
| SW-CONC-14 | `Task.detached` carries an adjacent comment naming which of isolation, priority or task-locals must be dropped. "To leave the main actor" is not a reason, write a `@concurrent` function. | Detached drops task-locals, priority and isolation, and still ignores parent cancellation. With NNBD on, a plain `nonisolated async` function does not leave the actor. Floor: `@concurrent` Swift 6.2. | `grep -Rn -e 'Task\.detached' -e 'detached[[:space:]]*[{(]' --include='*.swift' Sources`, where every hit needs the comment. Watched red and green (measured 2026-10-10). | SHOULD |
| SW-CONC-15 | Do not block a cooperative-pool thread or the main actor in async code: no `DispatchSemaphore`, `DispatchGroup.wait`, `Thread.sleep`, libc `sleep` or `usleep`. Wait with `await`, delay with `Task.sleep(for:)`. A deliberate sync-over-async bridge is `@available(*, noasync)`, and its semaphore, `Task {` and wait lines each end in `// bridge: <why safe>`, which this rule's grep and `SW-CONC-13`'s both skip. | swiftc 6.3 and 6.4 reject only `Thread.sleep`, `NSLock.lock/unlock` and `NSCondition` in async contexts. Semaphores, group waits, libc sleeps, `DispatchQueue.sync` and `Process.waitUntilExit()` compile cleanly, and a consumer created by `Task {}` in `main.swift` inherits the main actor and deadlocks (`timeout` exit 124). 0 blocking waits inside `async` bodies in 40 strict repos. | `grep -Rn -e 'DispatchSemaphore(' -e 'Thread\.sleep(' -e 'usleep(' -e '[^a-zA-Z_.]sleep(' -e '\.wait()' --include='*.swift' Sources`, then drop awaited waits and marked bridge lines with `grep -v -e 'await ' -e '// bridge:'` on the output and read each hit (`.wait()` also matches `DispatchGroup` and `Process`, and a hit in a file with no `async` is synchronous code, which is fine). Watched red and green, 4 lines versus empty (measured 2026-10-10). The soto-core `syncShutdown` bridge, marked, printed 0 lines from both `SW-CONC-13` and this cell and the same shape unmarked printed 3 (measured 2026-10-10). | MUST |
| SW-CONC-16 | Treat `MainActor.run`, `DispatchQueue.main.async` and `DispatchQueue.global` in new async code as tells to justify, not a ban. Isolate the function or type with `@MainActor`, or take an `isolated` parameter. | `MainActor.run` is an agent habit the corpus does not share (23 uses against 614 `@MainActor`). `DispatchQueue.global()` is width-limited on Linux (`SW-CONC-23`). | `grep -Rn -e 'MainActor\.run[[:space:]]*[{(]' -e 'DispatchQueue\.main\.async' -e 'DispatchQueue\.global' --include='*.swift' Sources`. Output is the list of sites to justify, and a justification is a reason an annotation or isolated parameter cannot satisfy. Watched red and green (measured 2026-10-10). | SHOULD |
| SW-CONC-17 | Never write `try? await` on a cancellation point (`Task.sleep`, `clock.sleep`, other throwing awaits) inside a loop. Test `!Task.isCancelled` or let the error propagate. | `while true { try? await Task.sleep(for: .milliseconds(50)); tick() }` ran 18,426 ticks in the 500 ms after cancel and never ended, while `while !Task.isCancelled { try await Task.sleep(…) }` ran 1. | `grep -Rn -e 'try? await Task.sleep' -e 'try? await clock.sleep' --include='*.swift' Sources`, then read each hit inside a loop (outside a loop it is a legitimate best-effort delay, so the grep is a candidate list). Behavioural twin: cancel at 500 ms and assert at most 1 further tick. Watched red and green (measured 2026-10-10). | MUST |
| SW-CONC-18 | Pass `bufferingPolicy:` to every `AsyncStream`, `AsyncThrowingStream` and `makeStream`. Write `.unbounded` only with a same-line `// unbounded: <what bounds the producer>`. The producer stops on `.terminated`. The choice of policy is `SW-CONC-30` and lossless flows needing backpressure are `SW-CONC-35`. | The default is `.unbounded` on every initializer and 6.4 did not change it (SE-0314): 100,000 × 4 KiB yields against a 10 ms consumer peaked at 416,220 KiB against 11,404 KiB with `.bufferingNewest(8)`. 75 of 78 corpus streams take the default and none is bounded. An `AsyncStream` has one consumer. Floor: Swift 5.5, `makeStream` 5.9. | Script S7, four greps whose output is the violation. Known misses: constructions whose arguments span lines and `AsyncStream(unfolding:)`, which is deliberately not listed. That the producer stops on `.terminated` is a reading heuristic. Watched red and green, lines versus empty (measured 2026-10-10). | MUST (SDK, CLI, server, OCI tooling) · SHOULD (app) |
| SW-CONC-19 | A server's per-connection and per-request loops retain no finished children: use `withDiscardingTaskGroup`, or a plain group drained by `group.next()` (the window of `SW-CONC-31`). An undrained plain `of: Void.self` group is the violation. | A plain group holding 200,000 finished children peaked at 1,089,664 KiB against 17,836 KiB for a discarding group and 17,512 KiB for a 64-wide `next()` window (SE-0381). A discarding group alone does not bound live children (`SW-CONC-31`). Floor: Swift 5.9, the window 5.5. | Script S8 lists files that build a plain Void group and never call `.next()`. Reading: the `.next()` is on the group that `addTask` fills. Known miss: a `.next()` elsewhere in the file hides an undrained group. Expected noise: test harnesses, clients and executors that use a group, only a server accept loop is a violation. Watched red (lists the plant, exit 123) and green (empty, exit 0) (measured 2026-10-10). | SHOULD |
| SW-CONC-20 | A resource that owns a connection, file, thread or pool exposes an idempotent awaited `close()` or `shutdown()` (and where practical a scoped `withX { }`). `deinit` and `defer` never start async work with `Task { }`. Cleanup that must survive cancellation is `SW-CONC-32`. | `deinit { Task { await self.close() } }` does not compile (`capture of 'self' in a closure that outlives deinit`). The field-capturing form compiled but the close was lost when the process ended, and `defer { Task { … } }` completed after the owner finished. Floor: Swift 5.5. | `grep -RlPz -e 'deinit\s*\{[^}]*\bTask\b' --include='*.swift' Sources` and `grep -RlPz -e 'defer\s*\{[^}]*\bTask\b' --include='*.swift' Sources`. Output is files and the `[^}]*` stops at the first brace. Watched red and green (measured 2026-10-10). | SHOULD |
| SW-CONC-21 | Gate the concurrency bans with the greps and compiler flags of this file. The static Linux SwiftLint binary skips `custom_rules` silently and exits 0, so a `custom_rules` mirror runs only in the SourceKit image through the `SW-GATE-26` wrapper (`SW-GATE-11`). Never rely on `LIBDISPATCH_COOPERATIVE_POOL_STRICT` on Linux. | Both fail open on the toolchain image. The static 0.65.1 binary prints `Skipping enabled rule 'custom_rules' because it requires SourceKit` and exits 0 on planted violations. The same config in the SourceKit image exits 2 on the plant and 0 on the twin. The variable is a no-op on Linux: identical results with and without it, and the string is absent from the 6.4 `libdispatch.so`. | The `SW-GATE-26` wrapper (`swiftlint-gate.sh`) exits 70 on any `Skipping enabled rule` line. Static binary did not go red (watched, by design) and the SourceKit image went red and green (measured 2026-10-10). The variable is a reading heuristic: any CI or Dockerfile line that sets `LIBDISPATCH_COOPERATIVE_POOL_STRICT` is the finding. Test starvation by blocking `ncores` tasks instead (`SW-CONC-23`). | MUST |
| SW-CONC-30 | Choose a stream's shape by its data kind. Pull sources (file chunks, paged registry reads) use `AsyncStream(unfolding:)` or an `AsyncSequence` type. Lossy push sources (latest state, progress ticks) pass `.bufferingNewest(n)` or `.bufferingOldest(n)` with a named constant `n >= 1`. Lossless push sources use the channel of `SW-CONC-35` where that dependency is allowed and otherwise become pull sources, a lossy bounded stream or an annotated `.unbounded`. Payload bytes never use a lossy policy. | `unfolding:` is lossless at 12,248 KiB against 138,956 KiB unbounded for 2,000 × 64 KiB. `.bufferingNewest(8)` held 12,184 KiB but delivered 8 of 2,000. `.bufferingNewest(0)` and `.bufferingOldest(0)` are legal and delivered 0 of 2,000 (the stdlib says "no elements are buffered"). The `unfolding:` closure is `@Sendable`, so cursor state lives in a `Mutex` or an actor. Floor: Swift 5.5, `makeStream` 5.9. | (1) `grep -RnF -e 'bufferingNewest(0)' -e 'bufferingOldest(0)' -e 'bufferingNewest(-' -e 'bufferingOldest(-' --include='*.swift' Sources` where output is the violation. (2) S7. (3) A flood test with the producer ten times the consumer's pace, asserting peak `VmHWM` growth under a limit and the delivered count for lossless streams. (4) Reading: a bounded policy on a stream that carries payload bytes is the defect. Watched red and green (measured 2026-10-10, 6.4 and 6.3). | MUST |
| SW-CONC-31 | An accept loop that spawns one child task per connection or request caps in-flight children at a named constant (`maxInFlight`, `maxConnections` or `maxConcurrent…`). Default: a `group.next()` window on a plain `withTaskGroup(of: Void.self)`. When the loop must stay in a discarding group, take a token from an `AsyncStream<Void>` (`bufferingPolicy: .bufferingNewest(maxInFlight)`, pre-filled with `maxInFlight` tokens) before pulling the next accept and `yield()` it on handler exit. Use a counter that refuses (HTTP 503 or close) only where refusing is the defined overload response, and do not combine both on one listener. A discarding group alone is not a cap. | 10,000 instant accepts held 10,000 live handlers and 201,060 KiB. The window, the tokens and the shedding counter held 256 in flight at 26,540, 27,760 and 16,732 KiB. `group.next()` does not exist on a discarding group. Precedent: `apple/containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:123-141`. Window against shed is a product choice, name it. Floor: Swift 5.9, the window 5.5. | Script S10: output is files with a discarding group and no cap vocabulary, and a cap word anywhere in the file silences it. Expected noise: test harnesses, clients and executors that use a group, only a server accept loop is a violation. Behaviour: a flood test with ten times the cap's connections asserting peak in-flight at most the cap. Reading: the constant is named in the config surface with a documented default and every accept path (TLS handshake, HTTP/2 stream children) passes through it. Whether a framework's listener bounds accepts is unmeasured, so this binds the loop you write. Watched red and green (measured 2026-10-10). | MUST (server, daemon) · SHOULD (CLI) |
| SW-CONC-32 | Cleanup that awaits and must survive cancellation is `defer { await withTaskCancellationShield { await x.close() } }` on 6.4. Below 6.4 it is `#if compiler(>=6.4)` around that form, with `do { try await body } catch { await Task { await x.close() }.value; throw error }` and the same `await Task { … }.value` after the normal exit in the `#else`. Cleanup with no `await` stays a plain `defer`. Never `defer { Task { … } }`, never an unshielded `defer { await … }`, never a plain `await x.close()` on the cancel path. A cleanup that spawns a subprocess is always shielded. | SE-0493 keeps cancellation visible inside `defer`: an unshielded awaited cleanup aborted at 0.30 s (`cleanup ABORTED by cancellation`, file left, exit 1), while the shield completed in 5 of 5 runs. A plain `await cleanup(r)` in `catch` aborted on 6.3 and 6.4 and `await Task { await cleanup(r) }.value` completed, because an unstructured task is not cancelled with its parent. A cancelled swift-subprocess `run()` was SIGKILLed (`.signaled(9)`) and finished shielded (`.exited(0)`). Zero shields in 40 clones, and one popular framework works around the missing shield with `await Task { … }.value`. Floor: Swift 6.4 (no back-deployment, Apple OS floors unverified: read only). | `grep -RlPz -e 'defer\s*\{(?![^}]*withTaskCancellationShield)[^}]*\bawait\b' --include='*.swift' Sources` where output is files. It also lists `defer { Task { await … } }`, which `SW-CONC-20` names separately. Known misses: nested braces end the scan at the first `}`, and cleanup that may be abandoned on cancel, such as a progress line, is read and not auto-fixed. On 6.3 an unguarded 6.4 form fails `swift build` with `'async' call cannot occur in a defer body`, and the `#if` split is the fix. The pre-6.4 `catch` branch has no grep. Its gate is a behavioural test that cancels the work task and asserts the temp file is gone, plus reading. Watched red and green (measured 2026-10-10, 6.4 and 6.3). | MUST |
| SW-CONC-34 | Install a `DispatchSource` signal source from a nonisolated function in a file other than `main.swift`. Never write the handler closure in `main.swift` top-level code, inside a `@MainActor` function or in a method of a `@MainActor` type. An explicit `@Sendable` closure is the other safe form. | A handler closure written inline in `main.swift` is inferred `@MainActor` and libdispatch runs it on its own queue: `_dispatch_assert_queue_fail`, `Illegal instruction`, exit 132 on 6.4 and 6.3 under `SWIFT_BACKTRACE=enable=no` (measured 2026-10-10). The cause is the inference, so a plain closure in a `@MainActor` function or type traps the same way. Under the default backtracer the same plant exited 0 in 9 of 9 runs with `Program crashed:` on stderr and the handler never ran, when the main thread kept running (`SW-CORE-16`). Floor: Swift 6.0. | (1) `grep -Rl -e 'makeSignalSource' --include='main.swift' Sources` where output is violating files, including the `@Sendable` form that is safe, so move the call into a function in another file. (2) S9 lists `@MainActor` candidates, read whether the handler closure sits in the isolated scope. (3) Behaviour: run the built binary with the per-command prefix `SWIFT_BACKTRACE=enable=no` (the `SW-CORE-18` carve-out), send the signal once with `kill -INT`, and assert the exit code is not 132 and that the handler's side effect happened. The exit code alone is not a gate under the default backtracer. Watched red and green (measured 2026-10-10). | MUST |
| SW-CONC-35 | `AsyncChannel` is for server, CLI-internal and app code that needs lossless one-to-one backpressure between tasks and already depends on swift-async-algorithms. The SDK and any library below the dependency budget (stdlib plus swift-subprocess) do not import it and expose it in no public API. Every producer loop checks cancellation after each `send`. Reach for `MultiProducerSingleConsumerAsyncChannel` (`.watermark(low:high:)`) only for several producers or a byte bound, with the producer in the calling task and the consumer moved out as `elements()`. | `AsyncChannel.send` "will resume without sending the element" when its task is cancelled: a 2,000-iteration loop ran all iterations and delivered 69 (6.3: 58). The multi-producer `send` throws `CancellationError`. The package costs a 6,244,408 B release binary against 83,160 B for the stdlib twin. `send` is `async`, so a synchronous callback or GCD source stays on `AsyncStream` with a bounded policy. The multi-producer `Source` is `~Copyable`, and `group.addTask { try await source.send(…) }` fails in Swift 6 mode with `[#SendingClosureRisksDataRace]`. It ships only `.watermark` in 1.1.7. Floor: swift-async-algorithms 1.0 (`AsyncChannel`), 1.1 (multi-producer), Apple OS floors unverified: read only. | For the SDK: `grep -Rn --exclude-dir='.build' -e 'swift-async-algorithms' --include='Package.swift' --include='Package@swift-*.swift' .` where output is the violation. For the producer loop: `grep -RlPz -e 'for\b(?![^{]*isCancelled)[^{]*\{(?![^}]*isCancelled)(?![^}]*checkCancellation)[^}]*await\s+\w+\.send\(' --include='*.swift' Sources`, then the same with `while\b` in place of `for\b`. Output is files whose send loop never checks. Known misses: a `try Task.checkCancellation()` inside a callee, and nested braces. "No public API" is a reading heuristic. Watched red and green (measured 2026-10-10). | SHOULD |

```swift
// wrong: the awaited cleanup sees the cancellation and aborts at its first suspension
func export(to file: TempFile) async throws {
    defer { await file.remove() }
    try await write(to: file)
}

// right on 6.4: the shield lets the cleanup finish, bounded as in SW-CONC-33
func export(to file: TempFile) async throws {
    defer { await withTaskCancellationShield { await file.remove() } }
    try await write(to: file)
}
```

## Group 3: A Behavioural Test Decides

The gate is a test run under `timeout`, for example `timeout 60 swift test`, where exit 124 is a hang. Each row
names its assertion. Thresholds that depend on core count are host-specific (measured on 32 cores).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CONC-22 | Use checked continuations. Resume each exactly once on every path (a once-guard `Mutex<CheckedContinuation?>` with `take()`) and outside any lock. Wrap external-event waits in `withTaskCancellationHandler` and re-check `Task.isCancelled` after storing the continuation. Run tests of continuation code under `timeout`. `withUnsafe*Continuation` needs a comment citing a measurement. Where an async overload exists, use it instead of a wrapper. | SE-0300: a leaked checked continuation hangs (`timeout` exit 124, the runtime only logs `SWIFT TASK CONTINUATION MISUSE … leaked`). A double resume is `Fatal error … more than once`, SIGILL, exit 132 on x86_64 under both the default backtracer and `SWIFT_BACKTRACE=enable=no` (measured 2026-10-10, arm64 SIGTRAP 133 reported, not measured). Unsafe variants give no diagnostic. `onCancel` runs before the body when the task is already cancelled, so a handler plus continuation needs the pre-check (hang without it, exit 124). Floor: Swift 5.5. | `timeout 60 swift test` exit 124 is the leak signal. `grep -Rn -e 'withUnsafeContinuation' -e 'withUnsafeThrowingContinuation' --include='*.swift' Sources`, where each hit needs the comment and empty output is the pass. Reading: every `withChecked*` registering a callback has a handler or a documented never-cancelled reason. Watched red and green (measured 2026-10-10). | MUST |
| SW-CONC-23 | Blocking syscalls or CPU work longer than a few milliseconds run off the pool behind one cancellable continuation on a dedicated `Thread`, a private `DispatchQueue(label:)` or `NIOThreadPool.runIfActive`, not on `DispatchQueue.global()` and not via `@concurrent`. `onCancel` wakes the call (wake pipe, kill, close of the peer) or the call carries an OS-level timeout. Pure-CPU loops call `try Task.checkCancellation()` once per bounded unit. | Of the primitives measured, only `Task.sleep`, `clock.sleep`, `checkCancellation`, `isCancelled`, `for await` over an `AsyncStream` and library awaits that implement it observe cancellation. `read(2)`, libc `sleep`, `Thread.sleep`, `DispatchSemaphore.wait`, `Process.waitUntilExit`, a parked continuation and an unchecked CPU loop all ran to 1000 ms after a cancel at 200 ms. swift-subprocess `run()` reacts: it returns normally with `.signaled(9)` on cancel (`SW-IO` owns the wrapper). Pool width is the core count: `@concurrent` blocking consumers hang at 32 on a 32-core host, `DispatchQueue.global()` hangs between 48 and 56, and private queues and threads scaled to 256. Floor: Swift 5.5. | Cancel the task at 200 ms and assert it returns within 2×. A pool-starvation test blocks `ncores` tasks. Reading: a blocking syscall in an `async` body without the wrapper, backed by the `SW-CONC-15` grep. Watched red: timeout seen at 4000 ms on the pool and 1000 ms off it (measured 2026-10-10). The reading heuristic itself was not run. | SHOULD |
| SW-CONC-24 | A timeout helper returns a distinct `TimeoutError`, never `CancellationError`, from a structured race on `ContinuousClock`. Document that it is only as prompt as the operation's cancellation points. Never race with two unstructured tasks and a continuation. Adopt `withDeadline` only after it ships (SE-0526, expected 6.5, absent in 6.4). | A helper that throws `CancellationError` on timeout makes callers re-derive the cause, and one returned at 4000 ms for a 1 s limit around a blocking `read`. The unstructured race returns on time but the orphan read finishes at 4000 ms. Floor: Swift 5.7 (`Clock`). | `grep -Rn -e 'throw CancellationError()' --include='*.swift' Sources`, where a hit must answer observed cancellation, not a timer. A test with a blocking operation asserting the caller returns within limit plus slack. `swift build` rejects invented names (`withTimeout`, `Task.timeout`, `cancelAfter`, `Task.sleep(seconds:)`, `withDeadline` on 6.4). The same race inside a shield is `SW-CONC-33`, and the SDK's `ProcessFailure.timedOut` precedence is `SW-IO-26`. Watched red and green (measured 2026-10-10). | SHOULD |
| SW-CONC-25 | In an actor, never read state, `await`, then act on the earlier read. Mutate before suspending, re-check after, or park the in-flight `Task` in a dictionary for dedupe. | Reentrancy drove a balance of 100 to -500 under 10 concurrent withdrawals, and a cache stampede made 10 remote fetches instead of 1 (6.3 and 6.4 identical). Floor: Swift 5.5. | A concurrent test with 10 callers asserting the invariant (exit 1 on violation, watched red and green, measured 2026-10-10). Reading: an `if` or `guard` on actor state, then `await`, then a write to the same state. | SHOULD |
| SW-CONC-26 | Never rely on `MainActor.assumeIsolated` for a callback whose queue you do not control. Hand Swift-5-mode or C callers a `@Sendable` closure and hop with `Task { @MainActor in … }`. Assert isolation with `MainActor.preconditionIsolated()` or `#isolation`, never `Thread.isMainThread`. A `@MainActor` type adopting a nonisolated protocol writes `: @MainActor P`, not a `nonisolated` witness over `assumeIsolated`. | Three traps run through `_dispatch_assert_queue_fail`: exit 132 under `SWIFT_BACKTRACE=enable=no`, and under the default backtracer exit 132 only when the main thread is parked (`dispatchMain`) and exit 0 with `Program crashed:` on stderr when main keeps running (6.4 and 6.3, measured 2026-10-10, `SW-CORE-16`): `assumeIsolated` off main, a closure inferred `@MainActor` invoked by Swift-5-mode code off main, and a `@preconcurrency` conformance called off main. The signal-source shape is `SW-CONC-34`. `Thread.isMainThread` read false after a hop away from and back to the `MainActor` while the function was still isolated. Isolated conformances (SE-0470): `@MainActor class Model: @MainActor Equatable` builds, and using it where `Sendable` is required fails `[#IsolatedConformances]`. Floor: Swift 6.0, isolated conformances 6.2. | `grep -Rn -e 'MainActor\.assumeIsolated' -e 'isMainThread' -e 'nonisolated static func ==' --include='*.swift' Sources`, where output is the sites to justify (a non-`MainActor` `assumeIsolated` is `SW-GATE-10` territory). Then run the callback path once on the target OS. A trap on a libdispatch worker thread exits 132 only if the process dies from it, so run with the per-command prefix `SWIFT_BACKTRACE=enable=no` and check the callback's side effect. Watched red and green (measured 2026-10-10). | SHOULD |
| SW-CONC-27 | Keep a deterministic count assertion for every hatch-guarded type. The TSan job and its pass criteria are `SW-GATE-27` and the test-leg recipe is `SW-TEST-17`. | TSan reports `Swift access race` on a correct `Mutex` class (1 race on 6.3 and 6.4, [Swift Forums thread 84801](https://forums.swift.org/t/threadsanitizer-in-a-swift-concurrency-world/84801)), so a green or red TSan run is no proof either way for `Mutex` code. `#expect(c.n == expected)` failed 5 of 5 runs on the racy class. Floor: Linux, Swift 6.3 and 6.4. | `swift test --filter CounterTests`, where the suite name is yours: exit 1 on a lost update and exit 0 on the compliant twin. Watched red and green (measured 2026-10-10, 6.4 and 6.3). | SHOULD |
| SW-CONC-33 | A shielded cleanup is bounded: it races a deadline inside the shield (a task group of the cleanup and a `Task.sleep`, `cancelAll()` on the winner) and ends in a defined outcome. A CLI keeps the second-press escape of `SW-CLI-11`. A server built on swift-service-lifecycle sets `ServiceGroupConfiguration.maximumGracefulShutdownDuration` and `maximumCancellationDuration`, and any other server bounds both stages itself. | A shielded sleep of one hour kept the process alive past `timeout 5` (exit 124) until a second signal ended it (exit 130, 143 for two SIGTERMs). The deadline race inside the shield ended at 0.61 s. Children created in a shield are not cancelled by the outer task, but `cancelAll()` still cancels them (SE-0504). The shield times nothing out, and `withDeadline` is absent in 6.4. Both service-lifecycle durations default to nil (no bound), and `maximumCancellationDuration` is documented to escalate to a `fatalError` (read 2026-10-10). The exit code of a missed deadline is `SW-CLI`'s. Floor: Swift 6.4 for the shield, Swift 5.7 for the race. | A cleanup stub that never returns must make the process exit within deadline plus slack with the documented code, and a second signal must exit 128+n. `grep -Rn -e 'withTaskCancellationShield' --include='*.swift' Sources` lists every shield, and each body that awaits I/O needs a deadline in scope (reading, no mechanical check exists). Watched red and green for the behaviour (measured 2026-10-10). | MUST |

```swift
// wrong: onCancel can run before the body, and then nothing ever resumes the continuation
try await withTaskCancellationHandler {
    try await withCheckedThrowingContinuation { cont in slot.withLock { $0 = cont } }
} onCancel: {
    finish(.failure(CancellationError()))
}

// right: store, then re-check, and let finish() take the continuation exactly once
try await withTaskCancellationHandler {
    try await withCheckedThrowingContinuation { cont in
        slot.withLock { $0 = cont }
        if Task.isCancelled { finish(.failure(CancellationError())) }
    }
} onCancel: {
    finish(.failure(CancellationError()))
}
// finish(_:) does `slot.withLock { $0.take() }?.resume(with: result)`, resuming outside the lock
```

## Group 4: A Reading Heuristic Decides

No command decides these. Each row names the question a reviewer asks of the diff.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-CONC-28 | Resolve a Sendable or isolation diagnostic in ladder order and name the highest rung that applies before adding a hatch. (1) Delete the sharing. (2) Value type or `let` (`weak let` for weak back-references, 6.3). (3) `@MainActor`. (4) `sending`. (5) `Mutex<State>` in a `final class: Sendable`. (6) A commented `actor`. (7) Per-import `@preconcurrency`. (8) `@unchecked Sendable` or `nonisolated(unsafe)`. (9) `MainActor.assumeIsolated` for callbacks documented to arrive on main. Never `Task.detached` to dodge a diagnostic, `MainActor.run` as a fix, a semaphore bridge or `Thread.isMainThread` as a test. | Agents jump to rung 8 and the compiler cannot tell the rungs apart. The migration guide says "attempting to make it `Sendable` should not be your first approach". Floor: Swift 6.0. | Reading heuristic: "for every hatch the diff adds (S1 and S3 output on the diff), name the highest rung that applies and show why it does not". A hatch added while a lower rung applies is the defect. The mechanical parts are `SW-CONC-01`, `SW-CONC-02`, `SW-CONC-05` and `SW-CONC-09`. | MUST |
| SW-CONC-29 | Choose shared-state tools by condition. `Mutex<State>` for synchronous short sections. `actor` only with a "this is an actor because" comment naming a condition (non-Sendable state mutated atomically across suspension points, or callers must `await` anyway). `@MainActor` for UI and singletons. A custom `@globalActor` only with the same comment. `NIOLockedValueBox` only inside the NIO stack. `OSAllocatedUnfairLock` only when an Apple floor is below macOS 15 and iOS 18 and at least iOS 16 (`SW-APPLE-04`); a library below iOS 16 uses its one `Locked` wrapper with the `// floor:` comment, which `k07.sh` skips. | An actor whose bodies are synchronous over `Sendable` state costs an `await` on every call. The corpus has 3 global actors in 40 repos. The NIO stack predates `Mutex` and keeps `NIOLockedValueBox`, while vapor and grpc-swift-2 use `Mutex`. Floor: Swift 6.0 for `Mutex`. | S4 over changed files (a whole-tree run fails most of the 151 audited actors), empty output is the pass. Then read the sentence: "helps with concurrency errors" is not a reason. Watched red and green: S4 prints the unexplained actors and is empty on the twin (measured 2026-10-10). | SHOULD |

## Check Scripts

Every script prints the violation and empty output is a pass, except S5 (an exit code per file) and S6 (target names), described in
their comments. Watched red on a planted violation and green on its twin (measured 2026-10-10). Replace `Sources`
with the target's source directories.

```bash
# S1 reason-comment check (SW-CONC-01, -09). PAT is a fixed string. On a diff, feed the changed files (set BASE to the merge target). The diff form needs the guard: an unresolved BASE printed `fatal: bad revision` and exited 0, and a new untracked file is listed only after `git add -N` (measured 2026-10-10).
S1='FNR == 1 { lead = 0 } /^[ \t]*\/\// { lead = 1; next } /^[ \t]*@[A-Za-z_]+(\(.*\))?[ \t]*$/ { next } index($0, pat) { if (!lead && $0 !~ /\/\//) print FILENAME ":" FNR ": " $0 } { lead = 0 }'
find -L Sources -name '*.swift' -print0 | xargs -0 -r awk -v pat='@unchecked Sendable' "$S1"
find -L Sources -name '*.swift' -print0 | xargs -0 -r awk -v pat='nonisolated(unsafe)' "$S1"
git rev-parse --verify -q "${BASE}^{commit}" > /dev/null || { echo "S1: BASE does not resolve: $BASE" >&2; exit 66; }
git add -N . && git diff --name-only -z --diff-filter=AM --merge-base "$BASE" -- '*.swift' | xargs -r -0 awk -v pat='@unchecked Sendable' "$S1"
```

```bash
# S2 @preconcurrency import check (SW-CONC-10)
find -L Sources -name '*.swift' -print0 | xargs -0 -r awk '
BEGIN { split("Glibc Musl WASILibc Android Bionic Darwin CRT WinSDK Dispatch EmscriptenLibc", OK, " ") }
/^[ \t]*\/\// { lead = 1; next }
index($0, "@preconcurrency") > 0 {
  mod = $0; sub(/.*@preconcurrency[ \t]+/, "", mod); sub(/^(public|package|internal|private|fileprivate)[ \t]+/, "", mod)
  if (mod ~ /^import[ \t]/) {
    sub(/^import[ \t]+/, "", mod); sub(/^(struct|class|enum|func|var|let|typealias|protocol)[ \t]+/, "", mod); sub(/[. \t\/;].*/, "", mod)
    shim = 0; for (k in OK) if (OK[k] == mod) shim = 1
    if (!shim && !lead && $0 !~ /\/\//) print FILENAME ":" FNR ": " $0
  }
}
{ lead = 0 }'
```

```bash
# S3 guard suspects (SW-CONC-01 b): @unchecked Sendable declarations with a stored var and no lock, mutex, atomic, queue, pthread, eventloop, isolat or confin token. A suspect list for new code.
find -L Sources -name '*.swift' -print0 | xargs -0 -r awk '
function flush() { if (inb && hasvar && !guarded) print file ":" line ": " decl; inb = 0 }
BEGIN { split("lock mutex atomic queue pthread eventloop isolat confin", T, " ") }
{
  if (inb) {
    body = tolower($0)
    for (k in T) if (index(body, T[k]) > 0) guarded = 1
    if ($0 ~ /^[ \t]*[a-z() ]*var [A-Za-z_][A-Za-z_0-9]*[^{]*$/) hasvar = 1
    depth += gsub(/\{/, "{") - gsub(/\}/, "}")
    if (depth <= 0) flush()
    next
  }
  if (index($0, "@unchecked Sendable") > 0 && index($0, "{") > 0 && $0 !~ /\{[ \t]*\}/ && ($0 ~ /class / || $0 ~ /struct /)) {
    inb = 1; file = FILENAME; line = FNR; decl = $0; hasvar = 0; guarded = 0
    depth = gsub(/\{/, "{") - gsub(/\}/, "}")
    body = tolower($0); for (k in T) if (index(body, T[k]) > 0 && $0 !~ /Sendable/) guarded = 0
  }
}
FNR == 1 && inb { inb = 0 }'
```

```bash
# S4 actor reason (SW-CONC-29): actor declarations and @globalActor types (struct, enum, class or actor) whose leading comment lacks the word "because".
find -L Sources -name '*.swift' -print0 | xargs -0 -r awk '
/^[ \t]*\/\// { if (index($0, "because") > 0) why = 1; next }
/^[ \t]*@[A-Za-z_]+(\(.*\))?[ \t]*$/ { if ($0 ~ /@globalActor/) ga = 1; next }
($0 ~ /^[ \t]*[a-z ]*actor [A-Z]/ && $0 !~ /actor isolation/) || ($0 ~ /@globalActor/ || ga) && $0 ~ /(struct|enum|class|actor) [A-Z]/ { if (!why) print FILENAME ":" FNR ": " $0 }
{ why = 0; ga = 0 }'
```

```bash
# S5 removal test for one file (SW-CONC-01, -02, -05). Usage: bash s5.sh Path/To/Package Sources/App/File.swift
# exit 0  => deleting @unchecked in that file still builds (violation: delete the hatch in the real tree)
# exit 70 => the build outran S5_TIMEOUT seconds (default 1200): no verdict, rerun with a larger value
# exit other !=0 => the compiler needs it (keep it, it still needs S1 and S3)
set -u
src=$1; file=$2; work="$src/../.removal-work-$(basename "$src")"
rm -rf "$work"; cp -R "$src" "$work"; rm -rf "$work/.build"
sed -i 's/@unchecked Sendable/Sendable/' "$work/$file"
(cd "$work" && timeout "${S5_TIMEOUT:-1200}" swift build >/dev/null 2>&1); rc=$?
rm -rf "$work"
[ "$rc" -eq 124 ] && { echo "removal-build-timeout" >&2; exit 70; }
echo "removal-build-exit=$rc"
exit $rc
```

```bash
# S6 defaultIsolation exported through a library product (SW-CONC-11). Output = target names. Requires jq.
swift package dump-package | jq -r '[.products[] | select(.type | has("library")) | .targets[]] as $exp | .targets[] | select(.name as $n | $exp | index($n)) | select(any(.settings[]?; .kind | has("defaultIsolation"))) | .name'
```

```bash
# S7 stream construction and annotation checks (SW-CONC-18). PCRE: \x3C and \x3E are the angle brackets and \x2D the hyphen.
grep -RnP -e '\.unbounded(?!.*//\s*unbounded:)' --include='*.swift' Sources
grep -RnP -e 'Async(Throwing)?Stream(\x3C[^\x3E]*\x3E)?\.makeStream\((of:\s*[^),]*\.self)?\)' --include='*.swift' Sources
grep -RnP -e '(?<!\x2D\x3E\s)Async(Throwing)?Stream(\x3C[^\x3E]*\x3E)?\(\s*[A-Za-z0-9_]+\.self(?![^)]*bufferingPolicy)[^)]*\)\s*\{' --include='*.swift' Sources
grep -RnP -e '(?<!\x2D\x3E\s)(?<!:\s)Async(Throwing)?Stream(\x3C[^\x3E]*\x3E)?\s*\{' --include='*.swift' Sources
# known miss: constructions whose arguments span lines. The (?<!:\s) look-behind skips `var x: AsyncStream<T> { … }` property types.
```

```bash
# S8 undrained plain Void group (SW-CONC-19). Output = files, NUL-separated lists so a path with a space survives. The pipeline exits 123 when a batch lists files and none matched (GNU grep 3.12), 0 for a mixed batch, so judge by output.
grep -RlZ -e 'withTaskGroup(of: Void' -e 'withThrowingTaskGroup(of: Void' --include='*.swift' Sources | xargs -0 -r grep -L -e '\.next()'
```

```bash
# S9 signal source next to @MainActor (SW-CONC-34). Output = candidate files, judge by output (xargs exits 123 when a batch has no match, which is the clean twin).
grep -RlZ -e 'makeSignalSource' --include='*.swift' Sources | xargs -0 -r grep -l -e '@MainActor'
# known misses: isolation inherited from a protocol or superclass in another file, and defaultIsolation(MainActor.self) (apps only, SW-CONC-11).
```

```bash
# S10 accept-loop cap vocabulary (SW-CONC-31). Output = files that call `withDiscardingTaskGroup` or `withThrowingDiscardingTaskGroup` and have no cap word (a bare type name is not a call: RediStack's `protocol DiscardingTaskGroupProtocol` polyfill listed, measured 2026-10-10). Exits 123 when a batch lists files and none matched, 0 for a mixed batch, so judge by output.
grep -RlZ -E -e 'with(Throwing)?DiscardingTaskGroup[[:space:]]*[({]' --include='*.swift' Sources | xargs -0 -r grep -L -e 'maxInFlight' -e 'maxConnections' -e 'maxConcurrent' -e 'group.next()'
```

## What Agents Get Wrong Here

Ranked by measured corpus prevalence times how likely a coding agent emits it unprompted.

1. **Statement-position `Task { … }` as fire-and-forget**, including `Task { try await f() }`. Nothing diagnoses a non-throwing task, and the 6.4 group covers only the throwing statement form. `SW-CONC-13`, `SW-CONC-03`.
2. **`@unchecked Sendable` or `nonisolated(unsafe)` to silence an error**, on an unguarded class or on a `Mutex`-only class that needs neither. The compiler and SwiftLint stay silent while updates are lost. `SW-CONC-01`, `SW-CONC-02`, `SW-CONC-09`, `SW-CONC-28`.
3. **`DispatchSemaphore`, `Thread.sleep`, `usleep` or `.wait()` in async code.** Only `Thread.sleep` and locks are rejected, and the rest deadlocks the main actor. `SW-CONC-15`.
4. **`await MainActor.run { }`, `DispatchQueue.main.async` or `Task.detached` "to leave the main actor".** `SW-CONC-16`, `SW-CONC-14`.
5. **`@preconcurrency import` to silence a Sendable error.** It hides the race with no warning. `SW-CONC-10`.
6. **`try? await Task.sleep` in a poll or retry loop.** It spins hot after cancel. `SW-CONC-17`. A `Task.sleep(nanoseconds:)` clock choice is `SW-IO-16`.
7. **A timeout helper that throws `CancellationError`, races with `Task.sleep` and expects the work to stop, or calls an invented API** (`withTimeout`, `withDeadline`, `Task.timeout`). `SW-CONC-24`.
8. **A continuation around a callback with no cancellation handler, resumed on two branches, or `withUnsafe*Continuation` "for speed".** Hang or SIGILL only at runtime. `SW-CONC-22`.
9. **An unbounded `AsyncStream` for an event firehose, `bufferingNewest(0)`, or a lossy policy on payload bytes.** 416 MB against 11 MB, and 0 of 2,000 delivered. `SW-CONC-18`, `SW-CONC-30`.
10. **Settings errors:** `defaultIsolation` in a library or CLI, flipping NNBD without `migrate`, copying the template's `ApproachableConcurrency`, or hallucinating `.defaultIsolation(.MainActor)`. Behaviour flips silently (132 versus 0). `SW-CONC-07`, `SW-CONC-11`, `SW-CONC-12`.
11. **An `actor` for a client with only `Sendable` members, or check-await-act inside an actor.** `SW-CONC-29`, `SW-CONC-25`.
12. **`deinit { Task { … } }`, `defer { Task { … } }`, an awaited `defer` without a shield, or a plain `await close()` in a `catch`.** The work is lost or aborts under cancellation. `SW-CONC-20`, `SW-CONC-32`.
13. **`MainActor.assumeIsolated` in a delegate or callback, or `Thread.isMainThread` as the isolation test.** `SW-CONC-26`.
14. **An undrained `withTaskGroup(of: Void.self)` per connection, or a discarding group with no in-flight cap.** `SW-CONC-19`, `SW-CONC-31`.
15. **Trusting TSan for `Mutex` code, or treating `LIBDISPATCH_COOPERATIVE_POOL_STRICT` or SwiftLint `custom_rules` on the static binary as a gate.** All fail open. `SW-CONC-27`, `SW-CONC-21`.
16. **A shield around an unbounded wait, a subprocess in cleanup with no shield, or `Task.detached { await cleanup() }` to escape cancellation.** The process ignored the first signal for 5 s. `SW-CONC-33`, `SW-CONC-32`, `SW-CONC-14`.
17. **A `DispatchSource` signal handler written inline in `main.swift` or in a `@MainActor` scope.** It traps off the main actor, and under the default backtracer the exit can be 0. `SW-CONC-34`.
18. **swift-async-algorithms added to the SDK for `AsyncChannel`, or a send loop with no cancellation check.** `SW-CONC-35`.
19. **Invented shield and backpressure names:** `Task.hasActiveTaskCancellationShield`, `withCancellationIgnored`, `AsyncChannel(bufferingPolicy:)`, `await group.next()` on a discarding group. The compiler rejects each, sometimes with a misleading message. Real on 6.4: `withTaskCancellationShield`, `Task.hasActiveCancellationShield`, `AsyncChannel()`, `makeChannel(of:throwing:backpressureStrategy:)` with `.watermark(low:high:)`, and `group.next()` on a plain group.

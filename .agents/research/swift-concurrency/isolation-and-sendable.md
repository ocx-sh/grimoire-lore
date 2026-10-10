---
title: "Isolation, Sendable and the escape hatches (SW-CONC, wave 2 dive 1)"
topic: "Swift concurrency: default isolation, NonisolatedNonsendingByDefault, Sendable, Mutex vs actor, @unchecked Sendable, nonisolated(unsafe), @preconcurrency, sending, isolated conformances, runtime isolation traps"
agent: "wave2/concurrency/isolation-and-sendable"
model: sonnet
date_researched: 2026-10-10
sources_count: 30
fixtures: "/home/mherwig/.cache/research-lang/swift-tools/fixtures/isolation-and-sendable/ (a-unchecked, a-twin, b-mutex-only, c-default-isolation, d-nonsending, d2-nnbd-break, d-migrate, e-init, f-consumer-default, g-runtime-trap, h-preconcurrency, i-lock-misuse, j-remove-hatch, k-groups, l-weaklet-tilde, m-sending, n-isolated-conformance, o-explicit-sendable, p-actor-reason, q-diff-gate, checks/, logs/)"
scope: |
  Covers rows M-B-01..M-B-10, M-B-22, M-B-23, M-B-24, M-B-25, M-B-28 and M-L-03: when a Sendable or isolation hatch is acceptable, the fix ladder, shared-state choice
  (Mutex / actor / global actor / NIOLockedValueBox), defaultIsolation and NonisolatedNonsendingByDefault per target kind, the template's ApproachableConcurrency, and how
  a library proves it survives a consumer's defaults. Measured on Linux x86_64 with swift:6.4 and swift:6.3 images; every verification below was run against a planted
  violation and a compliant twin. Apple-platform and Windows behaviour is "unverified: read only".
  Not covered (sibling dives): tasks, cancellation, continuations, GCD in async code, AsyncStream (W2-2); Package.swift policy beyond M-L-03 (SW-PKG); swift-testing rules.
---

# Isolation, Sendable and the escape hatches

Date everything 2026-10-10. Toolchains: Swift 6.4.0 (`swift:6.4`) and 6.3.x (`swift:6.3`) on Linux. Fixture root `FX=/home/mherwig/.cache/research-lang/swift-tools/fixtures/isolation-and-sendable`; every log cited as `logs/<name>.log` is under `$FX/logs/`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1. What the 6.4 template writes, and what the bundle expands to
   - 2. The compiler is silent on an unguarded `@unchecked Sendable` (plant a)
   - 3. What does catch it: TSan on Linux, its Docker prerequisite and its Mutex false positive
   - 4. Mutex-only classes are checked `Sendable` on 6.3 and 6.4 (plant b); the removal test
   - 5. `nonisolated(unsafe)`: `let` vs `var`, and what StrictMemorySafety does and does not flag
   - 6. The acceptance test for the two hatches (grep + reading heuristic)
   - 7. The fix ladder
   - 8. Mutex vs actor vs `@globalActor` vs `NIOLockedValueBox`
   - 9. What must never happen under a lock
   - 10. `defaultIsolation(MainActor.self)` per target kind (plant c; conflict 4)
   - 11. `NonisolatedNonsendingByDefault` per target kind (plants d, d2, migrate)
   - 12. Keep or strip the template's `ApproachableConcurrency` (plant e, M-L-03)
   - 13. The consumer-default compile-test recipe (plant f)
   - 14. `@preconcurrency import` (plant h)
   - 15. Runtime isolation traps (plant g)
   - 16. `sending`, isolated conformances, `~Sendable`, `weak let` (plants l, m, n, o)
   - 17. Diagnostic group names (Sendable and isolation)
   - 18. Re-sample of 25 `@unchecked Sendable` sites
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Fix ladder, in this order:** delete the sharing, make it a value or `let`, isolate to an actor you already have (`@MainActor`), `sending`, `Mutex<State>` in a `final class: Sendable`, a dedicated `actor`, `@preconcurrency` (per import, commented), and only then `@unchecked Sendable` / `nonisolated(unsafe)`. A hatch added in a diff while a lower rung applies is a defect.
- **`@unchecked Sendable` is accepted only with both a visible guard and an in-code reason.** swiftc and SwiftLint 0.65.1 are silent on an unguarded body (plant a: `swift build -Xswiftc -warnings-as-errors` exit 0 on 6.3 and 6.4 for a `var`-holding class, while the program lost 128,131 of 400,000 increments).
- **Removal test beats reading:** delete `@unchecked`, build; exit 0 means the hatch was redundant (every `Mutex`-only class), exit non-zero means the compiler needs it and the guard + reason rule then applies (`j-remove-hatch`, same on 6.3 and 6.4).
- **A `final class` whose only stored state is `let m: Mutex<S>` is checked `Sendable` on 6.3 and on 6.4**, and `S` need not be `Sendable`; adding one mutable stored property turns it into `error: stored property 'extra' of 'Sendable'-conforming class 'Leaky' is mutable` (plant b). `@unchecked` on such a class is a defect.
- **ThreadSanitizer catches plant (a) on Linux but needs `--security-opt seccomp=unconfined` under Docker here** (default: `FATAL: ThreadSanitizer: encountered an incompatible memory layout but was unable to disable ASLR`, exit 1) **and reports a false positive on a correct `Mutex`-guarded class** (1 warning, exit 1, on 6.3 and 6.4). The `NSLock`-guarded hatch and the actor twin are TSan-green. A deterministic `#expect(count == expected)` also catches it (exit 1 in 5/5 runs).
- **`nonisolated(unsafe)`:** `let` of an immutable non-Sendable handle with a reason is fine; `var` needs a named lock. `.strictMemorySafety()` flags every *use* of a `nonisolated(unsafe)` binding (4 warnings `[#StrictMemorySafety]`, 6.3 and 6.4) but neither the declaration nor any `@unchecked Sendable` use; `unsafe` on the use clears it.
- **defaultIsolation (conflict 4 confirmed, sharpened):** published libraries, the SDK, CLIs and servers never set `defaultIsolation(MainActor.self)`. A library that does breaks every nonisolated consumer (5-6 compile errors in plant c). CLI entry points are already `MainActor` (`main.swift` and `@main` both compiled against MainActor-default UILib), so a CLI gains nothing and its helper types stop being usable from nonisolated targets.
- **`NonisolatedNonsendingByDefault` changes meaning without a diagnostic:** the same source gives `#isolation == nil` / exit 132 (precondition trap) without it and `Optional(Swift.MainActor)` / exit 0 with it, on 6.3 and 6.4 identically (plant d). It also broke a real wrapper (`return await self.iterator.next()`) with `sending 'self.iterator' risks causing data races` (plant d2, reproduces `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:80`).
- **Conflict 4 on NNBD is confirmed with one change:** recommended for new libraries, CLIs and servers by *naming the feature*, not the bundle; for existing code use `swift package migrate --to-feature NonisolatedNonsendingByDefault` (adds `@concurrent`, verified); build on the floor and current toolchain.
- **Strip the template's `ApproachableConcurrency` bundle (M-L-03).** It expands to the same five features on 6.3 and 6.4.0 (`CompilerInvocation.cpp`), three of which (`DisableOutwardActorInference`, `InferSendableFromCaptures`, `GlobalActorIsolatedTypesUsability`) are already on in Swift 6 mode (`Features.def:308,311,316`). The two that remain are `LanguageMode::future`. 0 of 8 exemplar manifests that enable them use the bundle name; all spell the two names.
- **The 6.4 template drops `swiftLanguageModes`** (6.3 wrote `[.v6]`); Swift 6 mode is implied by tools 6.4 (a racy global errors `[#MutableGlobalVariable]`; `dump-package` shows `swiftLanguageVersions: null` vs `["6"]`). Greps for `.v6` miss it.
- **A library proves it survives consumer defaults with a `CompileTests/` package** that depends on it by path and sets `defaultIsolation(MainActor.self)`, `NonisolatedNonsendingByDefault`, `InferIsolatedConformances` (plant f: exit 1 on a generic API needing a nonisolated conformance, exit 0 after redesign; precedent `swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25`).
- **`@preconcurrency import X` silences a real race** (plant h: error `[#SendingRisksDataRace]` becomes nothing, no warning even for an unneeded one). Allowed only for libc/OS shims, or with a comment naming the module, the missing annotation and a removal trigger.
- **Runtime isolation traps are exit 132** (SIGILL from `_dispatch_assert_queue_fail` via `swift_task_isCurrentExecutorWithFlags`) in all three cases: `MainActor.assumeIsolated` off main, a Swift 6 closure inferred `@MainActor` invoked by Swift-5-mode code off main, and a `@preconcurrency` conformance called off main. Explicit `@Sendable` closure plus `Task { @MainActor in }` is the exit-0 twin (plant g).
- **`Thread.isMainThread` is not an isolation probe on Linux** (false after a hop away and back to the `MainActor`); assert with `MainActor.preconditionIsolated()` or compare `#isolation`.
- **Replace transfer boxes with `sending`:** `UnsafeBox<T>: @unchecked Sendable` compiles a use-after-send silently; `sending` rejects it (`[#SendingRisksDataRace]`, plant m).
- **`~Sendable` is 6.4-only** (6.3: `'~Sendable' requires -enable-experimental-feature TildeSendable`); **`weak let` works in 6.3 without a flag** and lets a class with a weak back-reference be checked `Sendable`.
- **Group-name drift:** 6.4 prints `[#RegionIsolation::SendingRisksDataRace]`, 6.3 prints `[#SendingRisksDataRace]`; `-Werror SendingRisksDataRace` works with the leaf name on 6.4 (Swift 5 mode + `StrictConcurrency`).

## Findings

### 1. What the 6.4 template writes, and what the bundle expands to

`swift package init --type library|executable|tool` on 6.4.0 writes `// swift-tools-version: 6.4`, `.enableUpcomingFeature("ApproachableConcurrency")` on every target *including the test target*, and no `swiftLanguageModes`. The 6.3 template wrote `swiftLanguageModes: [.v6]` and no upcoming features (`e-init/6.4/lib/Package.swift:16-31`, `e-init/6.3/lib/Package.swift`; the unified diff is in `logs/` via `diff -u`, ran 2026-10-10):

```diff
-// swift-tools-version: 6.3
+// swift-tools-version: 6.4
...
         .target(
-            name: "Demo"
+            name: "Demo",
+            swiftSettings: [
+                .enableUpcomingFeature("ApproachableConcurrency"),
+            ],
         ),
         .testTarget(
             name: "DemoTests",
-            dependencies: ["Demo"]
+            dependencies: ["Demo"],
+            swiftSettings: [
+                .enableUpcomingFeature("ApproachableConcurrency"),
+            ],
         ),
-    ],
-    swiftLanguageModes: [.v6]
+    ]
 )
```

Neither template sets `defaultIsolation`. The executable and tool templates carry the same two changes (`e-init/6.4/exe/Package.swift`, `e-init/6.4/tool/Package.swift`).

Swift 6 mode is still on: adding `var racyGlobal = 0` to the 6.4 template library fails with `error: var 'racyGlobal' is not concurrency-safe because it is nonisolated global shared mutable state [#MutableGlobalVariable]` (exit 1, `logs/e-lib-6.4.log`), because a tools version of 6.0 or later defaults the language mode to 6. `swift package dump-package` prints `"swiftLanguageVersions" : null` for 6.4 and `["6"]` for 6.3 (`e-init/6.4/logs/e-dump-6.4.log`).

`ApproachableConcurrency` is a pseudo upcoming feature handled in the frontend option parser, not a documented API. The expansion is identical in the 6.3 release tag, the 6.4.0 release tag and `main`:

```cpp
// swiftlang/swift lib/Frontend/CompilerInvocation.cpp @ swift-6.4.0-RELEASE:1009-1016 (main:1068, swift-6.3-RELEASE:996)
if (featureName->compare("ApproachableConcurrency") == 0) {
  Opts.enableFeature(Feature::DisableOutwardActorInference);
  Opts.enableFeature(Feature::GlobalActorIsolatedTypesUsability);
  Opts.enableFeature(Feature::InferIsolatedConformances);
  Opts.enableFeature(Feature::InferSendableFromCaptures);
  Opts.enableFeature(Feature::NonisolatedNonsendingByDefault);
```

Of these five, `Features.def` at `swift-6.4.0-RELEASE` marks `DisableOutwardActorInference` (line 308), `InferSendableFromCaptures` (311) and `GlobalActorIsolatedTypesUsability` (316) as `LanguageMode::v6`, i.e. already enabled in Swift 6 mode, and `InferIsolatedConformances` (325) and `NonisolatedNonsendingByDefault` (326) as `LanguageMode::future`. So in a Swift 6 mode target the bundle adds exactly two features, and it does *not* touch default isolation. Practitioner guidance written before the 6.4 template existed is stale on this point: Wals (2025-09-11) says "a newly created SPM Package will not have its defaultIsolation flag set at all" (still true) and "won't have Approachable Concurrency turned on" (false on 6.4) ([Wals](https://www.donnywals.com/should-you-opt-in-to-swift-6-2s-main-actor-isolation/)).

### 2. The compiler is silent on an unguarded `@unchecked Sendable` (plant a)

Plant `a-unchecked`: a class declared `final class RacyCounter: @unchecked Sendable { var n = 0 }`, hammered by 8 child tasks of a `TaskGroup`, 50,000 increments each, in a Swift 6 mode target:

```swift
// VIOLATION: nothing guards `n`, no reason given.
public final class RacyCounter: @unchecked Sendable {
    public var n = 0
    public init() {}
}
// COMPLIANT: checked Sendable, guarded by a Mutex.
public final class SafeCounter: Sendable {
    private let state = Mutex(0)
    public func increment() { state.withLock { $0 += 1 } }
}
```

- `swift build --target Counter -Xswiftc -warnings-as-errors` exits 0 with no diagnostic on **6.4 and 6.3** (`logs/a-build-6.4.log`, `logs/a-build-6.3.log`). Both with and without `.strictMemorySafety()` for the class (see 5).
- The unsanitized test passes and prints `racy n = 271869 expected 400000` (`logs/` for the first run; a separate run printed 168170 under TSan): lost updates are silent.
- SwiftLint 0.65.1 has no rule for `@unchecked Sendable`, `nonisolated(unsafe)`, `Task.detached` or `MainActor.run` (topic map conflict 1; [cod] §12), so no linter route exists.

### 3. What does catch it: TSan on Linux, its Docker prerequisite and its Mutex false positive

Chase from the brief: TSan on Linux **does catch plant (a)**, with conditions.

| Command (cwd `a-unchecked`, 6.4 and 6.3) | Result |
|---|---|
| `swift test --sanitize=thread --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"` through the stock `run.sh` | exit 1, `error: terminated(66): ...CounterTests-test-runner --dump-tests-json`, `FATAL: ThreadSanitizer: encountered an incompatible memory layout but was unable to disable ASLR (perhaps sandboxing is enabled?)` (`logs/a-tsan-plain.log`). The WSL2 host's `vm.mmap_rnd_bits` is not readable and Docker's default seccomp profile blocks the `personality` call TSan makes. |
| same, container started with `--security-opt seccomp=unconfined` | works. `RacyCounter`: `WARNING: ThreadSanitizer: Swift access race` + `SUMMARY: ThreadSanitizer: Swift access race ...CounterTests.swift`, exit 1. |
| `LockedCounter` (`NSLock` + reason comment, `@unchecked Sendable`) | 0 warnings, exit 0 |
| `ActorCounter` (`actor`) | 0 warnings, exit 0 |
| `SafeCounter` (`Mutex`, **correct**, checked `Sendable`) | **1 warning `Swift access race`, exit 1 on 6.4 and on 6.3** (`logs/a-tsan-6.4-safeCounter.log`, `logs/a-tsan-6.3-safeCounter.log`) |

So the brief's "Mutex twin is green" does **not** hold under TSan on Linux: `Mutex` is a stdlib type built on futex atomics that TSan does not see as synchronization, so it reports the protected stored value as racing. This matches a 2026-02 Swift Forums report of Linux TSan "false positives ... the synchronisation framework ... not detecting the usages of Mutex correctly" ([forum 84801](https://forums.swift.org/t/threadsanitizer-in-a-swift-concurrency-world/84801); ktoso asked for reproducers; no fix named). On 6.3 the `Mutex` test also took 226.9 s versus 1.5 s on 6.4 under TSan (one run; observation only).

What catches plant (a) without TSan: a deterministic lost-update assertion in the test (`#expect(c.n == expected)`) failed 5/5 runs on 6.4 (`logs/a-plain-asserted-1..5.log`, each exit 1; `Expectation failed: c.n == expected`), the locked twin passes (exit 0). It is probabilistic in principle: use it as a cheap smoke, not as proof.

Consequence for the rule: "TSan green" is not the acceptance test for `Mutex`-guarded code on Linux. Use TSan to hunt races in `@unchecked` code guarded by pthread/`NSLock`/NIO locks (instrumented), expect noise on `Mutex`, and run it as an advisory CI leg with the `seccomp=unconfined` container flag documented.

### 4. Mutex-only classes are checked `Sendable` on 6.3 and 6.4 (plant b); the removal test

`b-mutex-only/Sources/MutexOnly/MutexOnly.swift`:

```swift
public final class Registry: Sendable {          // builds: exit 0 on 6.4 and 6.3
    private let m = Mutex<[String: Int]>([:])
}
public final class Holder: Sendable {            // builds: Mutex does not require a Sendable Value
    private let m = Mutex<Plain>(Plain())        // Plain is a non-Sendable class
}
#if B2
public final class Leaky: Sendable { private let m = Mutex<Int>(0); var extra = 0 }
// error: stored property 'extra' of 'Sendable'-conforming class 'Leaky' is mutable   (exit 1, 6.4 and 6.3)
#endif
public final class Redundant: @unchecked Sendable { private let m = Mutex<Int>(0) }   // compiles; the hatch says nothing
```

No difference between 6.3 and 6.4 (`logs/b-build-6.4.log` exit 0, `logs/b-build-6.3.log` exit 0, `logs/b2-build-*.log` exit 1). The mechanism is in the stdlib source: `extension Mutex: @unchecked Sendable where Value: ~Copyable {}` ([Mutex.swift @ swift-6.4.0-RELEASE](https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.0-RELEASE/stdlib/public/Synchronization/Mutex/Mutex.swift)), with `@available(SwiftStdlib 6.0, *)`, which [availability-macros.def:46](https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.0-RELEASE/utils/availability-macros.def) maps to `macOS 15.0, iOS 18.0, watchOS 11.0, tvOS 18.0, visionOS 2.0` (Apple docs agree: macOS 15.0, iOS 18.0 [Apple JSON](https://developer.apple.com/tutorials/data/documentation/synchronization/mutex.json); Apple floors are **unverified: read only**). SE-0433 documents the safety argument: the `withLock` closure takes `inout sending`, so the mutex is its own isolation domain ([SE-0433](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0433-mutex.md)). The SwiftPM maintainers apply this in review: on [swift-package-manager#10425](https://github.com/swiftlang/swift-package-manager/pull/10425) (merged 2026-09-03) FranzBusch wrote "Mutex doesn't require its value to be `Sendable` so why do you need the `@unchecked`?" and "Since all stored properties of this class are in a `Mutex` this class can be `Sendable` without `@unchecked`".

**Removal test** (`checks/hatch-removal.sh`, run inside the toolchain): copy the package, rewrite `@unchecked Sendable` to `Sendable`, build the copy.

| Package | 6.4 | 6.3 | Meaning |
|---|---|---|---|
| `j-remove-hatch/redundant` (`Mutex`-only class) | `removal-build-exit=0` | `removal-build-exit=0` | hatch is redundant: violation |
| `j-remove-hatch/legit` (`NSLock` + `private var _n`) | `removal-build-exit=1` | `removal-build-exit=1` | compiler needs it: apply guard + reason rule |

### 5. `nonisolated(unsafe)`: `let` vs `var`, and what StrictMemorySafety does and does not flag

The migration guide's three-step ladder for an unsafe global is `let`, then `@MainActor`, then `nonisolated(unsafe)` "if there is synchronization in place that protects this variable in a way that is invisible to the compiler", and its own example carries the reason as a comment: `/// This value is only ever accessed while holding styleLock.` ([CommonProblems.md](https://github.com/swiftlang/swift-migration-guide/blob/main/Guide.docc/CommonProblems.md), "Unsafe Global and Static Variables", cloned at 949b5e1be201). Corpus split: 191 sites in 40 repos, 110 `let` (58%) and 76 `var` ([conc] Axis 1). The `let` form is an immutable binding of a non-Sendable value (`swiftlang/sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SKDRequestDictionary.swift:57`); the `var` form must be paired with a lock (`swiftlang/swift-testing@c7d68ca20cd7:Sources/Testing/Test+Cancellation.swift:35` pairs it with a `Mutex`).

Measured with `.strictMemorySafety()` (SE-0458; `STRICT=1 swift build --target Counter`, `a-unchecked`, 6.4 and 6.3 identical, `logs/a-strict-6.4.log`, `logs/a-strict-6.3.log`):

```text
Uses.swift:3:5: warning: expression uses unsafe constructs but is not marked with 'unsafe' [#StrictMemorySafety]   // sharedCache["a"] = 1
Uses.swift:4:9: warning: ...                                                                                     // _ = sharedCache["a"]
Uses.swift:5:9: warning: ...                                                                                     // _ = immutableHandle   (nonisolated(unsafe) let)
Globals.swift:12:12: warning: ...                                                                                // body(&_guardedCache)
```

Not flagged: the `nonisolated(unsafe)` declarations themselves, and every use of the `@unchecked Sendable` class (`c.n += 1`). Writing `unsafe sharedCache["a"] = 1` clears it: 0 warnings (`logs/a-strict-unsafe-6.4.log`, `logs/a-strict-unsafe-6.3.log`). So the topic map's "StrictMemorySafety flags each use" is right for `nonisolated(unsafe)` bindings and wrong for `@unchecked Sendable`; it is a useful audit for the former only, and the `unsafe` keyword needs 6.2+.

### 6. The acceptance test for the two hatches (grep + reading heuristic)

The test has three parts. Parts 1 and 2 are mechanical; part 3 is a named reading heuristic.

1. **Needed at all?** Removal test (finding 4): a hatch that builds without `@unchecked` is deleted.
2. **Reason present** (`checks/hatch-reason.sh`, the exact awk is in rule SW-CONC-02): a declaration containing `@unchecked Sendable` or `nonisolated(unsafe)` needs a `//` or `///` comment line directly above (attribute-only lines in between are skipped; a blank line breaks the link) or a trailing `//` comment. Output is the violating lines; empty means pass. Run on the touched files of a diff (`git diff --name-only --diff-filter=AM main -- '*.swift' | xargs -r awk ...`), not on the tree: over the 40 exemplars **610 of 866** non-test `@unchecked Sendable` lines (70%) and **2090 of 2495** `nonisolated(unsafe)` lines (84%) fail it, so a whole-tree gate would fail every exemplar (`checks/corpus-reason.txt`).
3. **Guard visible and named** (`checks/hatch-guard.sh` lists suspects; the reader decides). Output: `@unchecked Sendable` class/struct declarations whose body has a stored `var` and none of the tokens `lock`, `mutex`, `atomic`, `queue`, `pthread`, `eventloop`, `isolat`, `confin`. Over the corpus it lists 202 of 695 decls (29%), 68 of them swift-protobuf generated copy-on-write storage and 59 swift-build, so it is a *suspect list for new code*, not a gate. The reading heuristic for each hit: the comment must name (a) the guard (lock, atomic, queue, event-loop confinement, immutability after init, C handle documented thread-safe) and (b) what keeps every access inside the guard. "Silences a compiler error", "needed for Swift 6", "temporary" are not reasons.

Accepted shapes (all exemplar-grounded):

```swift
// guard = immutability + C handle; reason names both  (swift-nio@e12881f2a691:Sources/NIOPosix/ThreadWindows.swift:28-37)
/// `HANDLE` is an opaque pointer imported from WinSDK ... The stored `handle` is `let` ... each handle is owned by exactly one `NIOThread`
struct ThreadHandle: @unchecked Sendable { let handle: HANDLE }

// guard = lock named in a doc comment  (swift-distributed-tracing@a5270bd1280a:Sources/Instrumentation/Locks.swift:190-195)
/// Marked as @unchecked Sendable due to the synchronization being performed manually using locks.
public final class LockedValueBox<Value: Sendable>: @unchecked Sendable { private let lock = ReadWriteLock(); private var value: Value }

// guard = immutability, reason says what must not change  (tuist@2f6ac74754bf:cli/Sources/TuistHTTP/TuistURLSessionDelegate.swift:28-32)
/// ... an immutable `[SecCertificate]` assigned once at init and never mutated ... Adding mutable state here would need to re-establish that invariant.
final class TuistURLSessionDelegate: NSObject, URLSessionTaskDelegate, @unchecked Sendable { private let additionalCertificates: [SecCertificate] }
```

Rejected shape (silent in swiftc and SwiftLint; fails parts 2 and 3 on the planted fixture): `public final class RacyCounter: @unchecked Sendable { public var n = 0 }`.

### 7. The fix ladder

Decision (rung order; a diff that adds a lower rung while a higher one applies is the defect). The ladder merges the migration guide's order ([CommonProblems.md](https://github.com/swiftlang/swift-migration-guide/blob/main/Guide.docc/CommonProblems.md) "Sendable Conformance": global isolation, actors, manual synchronization, "attempting to make it `Sendable` should not be your first approach") with Massicotte's ordering ("Have an already thread-safe type? `@unchecked Sendable`. Otherwise, `@MainActor` is likely the best option", [Singletons](https://massicotte.org/singletons/)) and the new `Mutex`/`sending`/`weak let` rungs.

| Rung | Fix | Applies when | Verified |
|---|---|---|---|
| 1 | Delete the sharing: pass arguments, composition root | the global exists for convenience | reading |
| 2 | Value type / immutable `let`; `weak let` (6.3) for weak back-references | state can be a `Sendable` struct, enum or `final class` with only `let` | plant l: `final class Child: Sendable { weak let parent: Parent? }` builds on 6.3 and 6.4 |
| 3 | Isolate to an actor you already have: `@MainActor` | UI-bound state, singletons, anything touched mostly on main | migration guide; Massicotte |
| 4 | `sending` parameter/result | a one-shot hand-off of a non-Sendable value | plant m: ok exit 0; use after send exit 1 `[#SendingRisksDataRace]` |
| 5 | `Mutex<State>` in a `final class: Sendable` | synchronous access, short critical section, state fits one value | plant b |
| 6 | A dedicated `actor` with a "this is an actor because" comment | non-Sendable state mutated atomically across suspension points | check `actor-reason.sh` |
| 7 | `@preconcurrency` | per import of a module you cannot change, or staged adoption on your own protocol | plant h |
| 8 | `@unchecked Sendable` / `nonisolated(unsafe)` | an existing lock, atomic, queue, confinement or immutable C handle the compiler cannot see | finding 6 |
| 9 | `MainActor.assumeIsolated` | a callback documented to arrive on main | plant g (traps otherwise) |
| never | `Task.detached` to dodge a diagnostic, `MainActor.run` as a fix, `DispatchSemaphore` bridges, `Thread.isMainThread` as an isolation test | | |

### 8. Mutex vs actor vs `@globalActor` vs `NIOLockedValueBox`

| Choose | When (observable conditions) | Not when | Exemplar |
|---|---|---|---|
| `Mutex<State>` in `final class: Sendable` (`import Synchronization`, Swift 6.0+; Apple floor macOS 15 / iOS 18, unverified: read only) | callers need a synchronous API; the critical section is short and never suspends; the guarded state is one value | the state holds non-Sendable references that must stay consistent across several awaits; the Apple deployment floor is below the `SwiftStdlib 6.0` set | `containerization` uses `Mutex<>` 38 times, vapor 12, swift-foundation 46 ([conc] Axis 1); `swiftlang/swift-package-manager#10425` |
| `actor` | the three Massicotte conditions hold: non-Sendable state, atomic operations, cannot live on an existing actor; callers can `await`; comment says why | the actor has no non-Sendable state (a "network client" actor with only `Sendable` members), or the API must be synchronous | [When should you use an actor?](https://massicotte.org/actors/); corpus has few actors (see check) |
| `@MainActor` | UI state, singletons ("the correct solution for the majority of singletons") | background throughput matters and the type is data layer | [Singletons](https://massicotte.org/singletons/) |
| custom `@globalActor` | several types must serialize against each other, off the main thread, and annotations on them are acceptable; niche | any case a `Mutex` or one actor covers: "can be a real pain to remove" | 3 definitions in the corpus: `kean/Nuke@d5548dd61395:Sources/Nuke/Pipeline/ImagePipelineActor.swift:14` (used at `Sources/Nuke/Internal/RateLimiter.swift:16-17,55`), `swift-build@2187330e13e7:Sources/SWBUtil/PluginManager.swift:15`, `element-x-ios@14e33866ced2:ElementX/Sources/Services/AlertTones/NotificationToneManager.swift:14` |
| `NIOLockedValueBox<State>` / `NIOLock` | inside the swift-nio, async-http-client and hummingbird stacks, which predate `Mutex` and target tools 6.1; it is `@unchecked Sendable where Value: Sendable`, so unlike `Mutex` it requires `Sendable` state | outside the NIO stack: use `Mutex` | `swift-nio@e12881f2a691:Sources/NIOConcurrencyHelpers/NIOLockedValueBox.swift:24,82`; `swift-server/async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:543-548` (`private struct MutableState: Sendable` behind `NIOLockedValueBox`, no hatch on the user type) |
| `OSAllocatedUnfairLock` (Apple only) | Apple floor below macOS 15 / iOS 18 | Linux | Massicotte; `kean/Nuke` uses it 21 times; unverified: read only |
| `NSLock`/`pthread`/`DispatchQueue` + `@unchecked` | the type is itself a lock primitive or must back-deploy before `Mutex` | new code with a 6.0+ floor | `swift-log@4038b6a4f74a:Sources/Logging/Locks.swift:183`, `swift-distributed-tracing@a5270bd1280a:Sources/Instrumentation/Locks.swift:193` |

The grep from the topic map (`NSLock|os_unfair_lock` outside the NIO stack) is replaced by the removal test plus the guard check; the actor half is `checks/actor-reason.sh` (output = `actor`/`@globalActor` declarations whose leading comment lacks the word "because").

### 9. What must never happen under a lock

Measured on 6.4 (`i-lock-misuse`):

- `await` inside `Mutex.withLock`: compile error, exit 1: `cannot pass function of type '(inout sending Int) async -> sending ()' to parameter expecting synchronous function type` (`logs/i-AWAIT_UNDER_LOCK-6.4.log`).
- `NSLock.lock()` / `unlock()` in an `async` function: compile error, exit 1: `instance method 'lock' is unavailable from asynchronous contexts; Use async-safe scoped locking instead` (`logs/i-NSLOCK_ACROSS_AWAIT-6.4.log`).
- Re-entering the same `Mutex` (direct nested `withLock`, or through a callback that locks again): **hangs**, `timeout 20` exit 124 for both (`logs/i-recurse-6.4.log`, `logs/i-callout-6.4.log`). SE-0433 documents this as "platform-dependent behavior" (panic, deadlock or unspecified), so "calls out to user code under a lock" is a deadlock risk, not a style point.
- The compiler cannot see calls out to user closures, resuming a continuation, or logging under the lock; those stay a reading heuristic (the `swiftlang/swift-package-manager` threads #10405 and #10403 cited by [fail] §2.8 were not fetched here).

### 10. `defaultIsolation(MainActor.self)` per target kind (plant c; conflict 4)

API: `SwiftSetting.defaultIsolation(_ globalActor: MainActor.Type?, ...)`, `@available(_PackageDescription, introduced: 6.2)`; the only valid values are `MainActor.self` and `nil` ([SE-0466](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0466-control-default-actor-isolation.md)). The vision says executables "start running on the main actor" and "The same argument does not apply to libraries ... It would be reasonable for library targets to default to `nonisolated` the same way they do today"; "specific libraries could still decide to default to the main actor, such as ... libraries of UI widgets, or ... code organization within an executable project" ([vision](https://github.com/swiftlang/swift-evolution/blob/main/visions/approachable-concurrency.md)). Massicotte recommends against it everywhere ([MainActor by Default](https://massicotte.org/blog/mainactor-by-default), 2025-11-20).

Plant c: `UILib` sets `.defaultIsolation(MainActor.self)` and exports `struct Config: Equatable`, `class Store`, `var counter`, `func compute()`, `protocol Named`. `Consumer` is an ordinary (nonisolated) library target. `swift build --target Consumer`:

```text
6.4  Consumer.swift:5:13  error: call to main actor-isolated initializer 'init()' in a synchronous nonisolated context [#ActorIsolatedCall]
6.4  Consumer.swift:6:7   error: call to main actor-isolated instance method 'add' in a synchronous nonisolated context [#ActorIsolatedCall]
6.4  Consumer.swift:7:5   error: main actor-isolated var 'counter' can not be mutated from a nonisolated context
6.4  Consumer.swift:8:12  error: call to main actor-isolated global function 'compute()' in a synchronous nonisolated context [#ActorIsolatedCall]
6.4  Consumer.swift:12:7  error: main actor-isolated conformance of 'Config' to 'Equatable' cannot be used in nonisolated context [#IsolatedConformances]
6.4  Consumer.swift:15:56 error: main actor-isolated property 'name' can not be referenced from a nonisolated context   // t.name on a generic T: Named, because Named itself became @MainActor
6.3  same, except line 7 reads "reference to var 'counter' is not concurrency-safe because it involves shared mutable state" and line 8 is not reported
```

Exit 1 on both (`logs/c-build-6.4.log`, `logs/c-build-6.3.log`). The consumer *executables* did not break: `ConsumerApp/main.swift` printed `true` and `ConsumerMain` (`@main struct Entry { static func main() async }`) printed `1 42 false`, exit 0 on both toolchains, because an executable's entry point is inferred `@MainActor` (`logs/c-ConsumerApp-6.4.log`, `logs/c-ConsumerMain-6.4.log`). So the CLI never needs `defaultIsolation`, and a CLI that sets it makes its helper types unusable from its own nonisolated library targets.

Corpus (re-measured 2026-10-10 over `Package*.swift`): 13 `defaultIsolation(...)` hits in 12 manifests, **0 in a published library**: IceCubesApp 9 app-internal packages (`Dimillian/IceCubesApp@2ad6e6891258:Packages/Timeline/Package.swift:41-42`, with `.swiftLanguageMode(.v6)` beside it; they are `.library` products of path dependencies of the app, never tagged), `element-x-ios@14e33866ced2:compound-ios/Package.swift`, one tuist example, and the compile test `swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25` that sets it only to check the library survives it.

**Decision (conflict 4 confirmed on defaultIsolation):**

| Target kind | `defaultIsolation(MainActor.self)` | Why |
|---|---|---|
| published library / SDK / package consumed by others | never | vision; plant c; 0/0 in corpus |
| CLI / daemon / server executable | never | entry already `@MainActor`; breaks nonisolated helpers; Q3 default |
| compile-test executable inside the library repo | yes, on purpose | swift-protobuf precedent; finding 13 |
| app target / app-internal UI package that no other package consumes | allowed, with explicit `.swiftLanguageMode(.v6)` | IceCubes, element compound-ios; Apple's Xcode 26 template (unverified: read only) |

Check (mechanical, planted): `defaultisolation-exported.sh` over `swift package dump-package` output prints the names of targets that set `defaultIsolation` **and** are reachable from a `library` product (`EXPORT=1` manifest: prints `UILib`; `EXPORT=0`: empty). The reviewer then applies "is this package published to outsiders".

### 11. `NonisolatedNonsendingByDefault` per target kind (plants d, d2, migrate)

SE-0461 (Swift 6.2): without the feature a nonisolated `async` function runs off the caller's actor (`@concurrent`); with `NonisolatedNonsendingByDefault` it runs on the caller's actor (`nonisolated(nonsending)`); the proposal itself calls the change one that "allows writing code that is valid with and without the upcoming feature flag, but means something different", and says migration tooling "will provide fix-its to preserve behavior by annotating nonisolated async functions with `@concurrent`" ([SE-0461](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md), Source compatibility).

Plant d (`d-nonsending`): one source tree, built with `NNBD=0` and `NNBD=1` (the manifest adds `.enableUpcomingFeature("NonisolatedNonsendingByDefault")`). A `@MainActor` caller awaits three functions from a nonisolated library module; the probe is `String(describing: #isolation)`, and `fAssert()` runs `MainActor.preconditionIsolated(...)`:

```swift
public func f() async -> String { String(describing: #isolation) }                      // implicit
public func fAssert() async { MainActor.preconditionIsolated("must run on the caller's MainActor") }
public nonisolated(nonsending) func fNonsending() async -> String { String(describing: #isolation) }
@concurrent public func fConcurrent() async -> String { "concurrent: \(String(describing: #isolation))" }
```

| | NNBD off (default) | NNBD on |
|---|---|---|
| `f()` | `nil` | `Optional(Swift.MainActor)` |
| `fNonsending()` | `Optional(Swift.MainActor)` | `Optional(Swift.MainActor)` |
| `fConcurrent()` | `concurrent: nil` | `concurrent: nil` |
| `swift run probe-cli assert` | **exit 132**, `Program crashed: Illegal instruction`, frames `Actor.preconditionIsolated`, `static GlobalActor.preconditionIsolated` | exit 0, `fAssert() passed` |

Identical on 6.4 and 6.3 (`logs/d-run-6.4-nnbd0.log` / `nnbd1`, `logs/d-run-6.3-nnbd0.log` / `nnbd1`). Both builds exit 0 with no diagnostic: **red is a runtime trap, found only by an isolation assert or by reading the setting.**

Plant d2 (`d2-nnbd-break`) reproduces the corpus break. A wrapper `AsyncIteratorProtocol` whose `next()` does `return await self.iterator.next()` on an `AsyncStream<Int>.Iterator`:

```text
NNBD=0                 swift build            exit 0 (6.4, 6.3)
NNBD=1 -DBREAK         swift build            exit 1
  6.4: error: sending 'self.iterator' risks causing data races [#RegionIsolation::SendingRisksDataRace]
       note: sending 'self.iterator' to @concurrent instance method 'next()' risks causing data races between @concurrent code and code in the current isolation context
  6.3: same message, group [#SendingRisksDataRace]
NNBD=1 (twin)          exit 0 on both:   public mutating func next(isolation actor: isolated (any Actor)? = #isolation) async -> Int? { await iterator.next(isolation: actor) }
```

This is the same shape as `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:79-81` ([conc] Axis 7 measured it: 2 of 6 packages broke when the feature was flipped). The fix for an `AsyncSequence` wrapper is to forward `next(isolation:)` (SE-0421), which is also the M-B-10 rule: an async API that forwards to another isolated-capable API accepts `isolation: isolated (any Actor)? = #isolation` (used in `swift-async-algorithms` 9+10 sites, `swift-testing` 14+14, `swift-distributed-tracing` 8+8 per [conc] Axis 2).

Migration (`d-migrate`, 6.4): `swift package migrate --to-feature NonisolatedNonsendingByDefault` exits 0, prints `warning: feature 'NonisolatedNonsendingByDefault' will cause nonisolated async global function 'f' to run on the caller's actor; use '@concurrent' [#NonisolatedNonsendingByDefault]`, applies 2 fix-its (`@concurrent` added to `f` and `fAssert`) and edits the manifest to enable the feature. `swift package migrate` takes no `--scratch-path`.

Exemplar practice (manifests): `NonisolatedNonsendingByDefault` by name in swift-log (`Package.swift:68`), swift-async-algorithms (`:79,155`), vapor (`:251-252`), swift-aws-lambda-runtime (`:11`), swift-dependencies (`:145,148`), sourcekit-lsp (`:710-711`), element-x-ios (`:42-43`); 7 of 40 repos. `swift-aws-lambda-runtime@8abd464310c7:Examples/Streaming+Codable/Package.swift:5-16` documents the interop rule: a consumer with the feature off writes explicit `nonisolated(nonsending)` where it must match a library that has it on.

**Decision (conflict 4 on NNBD confirmed, refined):**

- New libraries, SDKs, CLIs and servers: enable `NonisolatedNonsendingByDefault` by name on every target and its test target at creation. Public async functions that do CPU-bound or blocking work say `@concurrent` with a comment why.
- Existing code: never paste the setting. Run `swift package migrate --to-feature NonisolatedNonsendingByDefault`, review each `@concurrent` it adds (most should lose it), build on the floor toolchain and the current one.
- `InferIsolatedConformances` goes beside it only in modules that declare global-actor-isolated public types or whose consumers use default MainActor isolation; in a nonisolated module with no such types it is inert. Six of the seven NNBD exemplars pair them, `swift-testing` enables only the conformance feature.
- Apps and app-internal packages: Massicotte calls NNBD "the only setting of consequence" in the bundle and recommends adopting it ([What Setting Should I Use?](https://massicotte.org/blog/what-settings/)); same rule.

### 12. Keep or strip the template's `ApproachableConcurrency` (plant e, M-L-03)

**Strip the bundle; spell the named features** (finding 11). Evidence: (1) the bundle is a pseudo-feature with no documentation page and an expansion that lives in `CompilerInvocation.cpp`; the five-feature expansion is stable on 6.3 and 6.4.0 but is not a contract. (2) In a Swift 6 mode target three of five members are already on (`Features.def:308,311,316`), so the bundle name overstates what it does. (3) Practice: of the 8 manifests that enable the two relevant features (swift-log, swift-async-algorithms, vapor, swift-aws-lambda-runtime, swift-dependencies, sourcekit-lsp, element-x-ios, swift-testing), **none uses the bundle name**; the only `ApproachableConcurrency` hits in the corpus are SwiftPM's own fixtures and `swiftlang/swift-package-manager@5546f44a3b52:Examples/package-registry/Package.swift:38,48,58`. (4) The template also puts it on the test target, where it silently changes how a test helper's `nonisolated async` functions run.

Check (planted, `V4` in Verification runs): `grep -rn -e 'ApproachableConcurrency' --include='Package*.swift' e-init/6.4/lib` prints 2 lines (exit 0); on `e-init/6.3/lib` nothing (exit 1). Also record for the manifest dive: the 6.4 template's missing `swiftLanguageModes` means an explicit `swiftLanguageModes: [.v6]` (or `.swiftLanguageMode(.v6)`) must be added by hand if the repo wants the mode visible to greps.

### 13. The consumer-default compile-test recipe (plant f)

Recipe (adapted from `swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25`): a sibling package `CompileTests/` that depends on the library by path, has an executable target with the consumer-side defaults, and uses the library's public API the way a consumer would. CI runs `swift build` in it on the floor and current toolchains; exit 0 is the gate.

```swift
// CompileTests/Package.swift   (swift-tools-version: 6.2)
let package = Package(
    name: "CompileTests",
    dependencies: [.package(path: "../Lib")],
    targets: [
        .executableTarget(
            name: "ConsumerDefault",
            dependencies: [.product(name: "Lib", package: "Lib")],
            swiftSettings: [
                .defaultIsolation(MainActor.self),
                .enableUpcomingFeature("NonisolatedNonsendingByDefault"),
                .enableUpcomingFeature("InferIsolatedConformances"),
            ])
    ],
    swiftLanguageModes: [.v6]
)
```

Plant f: the library compiles on its own in both variants; the consumer test is what goes red.

```swift
// Lib (BAD): generic API that needs a nonisolated, Sendable conformance
public protocol Handler { func handle() }
public func run<T: Handler>(_ h: T) async { h.handle() }
public func runDetached<T: Handler & Sendable>(_ h: T) { Task.detached { h.handle() } }
// consumer (MainActor-default module):  final class MyHandler: Handler { var count = 0; func handle() { count += 1 } }
//   6.4: ConsumerDefault/main.swift:10:7  error: main actor-isolated conformance of 'MyHandler' to 'Handler' cannot be used in @concurrent context [#IsolatedConformances]
//   6.4 and 6.3: main.swift:14:1  error: ... cannot satisfy conformance requirement for a 'Sendable' type parameter [#IsolatedConformances]
// Lib (FIXED):
public nonisolated(nonsending) func run<T: Handler>(_ h: T) async { h.handle() }
public func runDetached(_ work: sending @escaping () async -> Void) { Task.detached { await work() } }
```

`swift build` in `CompileTests` exits 1 on BAD and 0 on FIXED, on 6.4 and 6.3 (`logs/f-bad-*.log`, `logs/f-good-*.log`, under `f-consumer-default/logs/`). Note the 6.4-only extra error on `run`: a nonisolated library built *without* NNBD cannot be called with an isolated conformance from a MainActor consumer on 6.4, but 6.3 accepted it; building the library with NNBD (or `nonisolated(nonsending)` on the function) removes the error. That is a concrete, measured reason for libraries to enable NNBD.

### 14. `@preconcurrency import` (plant h)

Corpus: 410 `@preconcurrency import`, 347 of them libc/OS shims in per-OS `#if` blocks (`swift-nio@e12881f2a691:Sources/NIOConcurrencyHelpers/lock.swift:25` `@preconcurrency import Bionic`), 63 real gaps ([conc] Axis 1). Plant h, a Swift-5-mode `Legacy` module with `public class Session`, a Swift 6 `Modern` module passing it to a `@MainActor` function:

- Without the attribute: `error: sending 's' risks causing data races` (`[#RegionIsolation::SendingRisksDataRace]` on 6.4, `[#SendingRisksDataRace]` on 6.3), exit 1.
- With `@preconcurrency import Legacy`: **no diagnostic at all**, exit 0 on both. The race is real and hidden.
- `@preconcurrency import Foundation` where nothing needs it: no warning (`logs/h-build2-6.4.log`, `logs/h-build2-6.3.log`).

So the attribute is a per-import mute switch. Massicotte: it means "missing annotations, but I'm using it correctly" and he prefers a targeted `nonisolated(unsafe)` ([unanswered Q&A](https://www.massicotte.org/blog/wwdc26-unanswered-qa/), as summarized in [prac] §1; not re-fetched). Check `checks/preconcurrency-import.sh`: prints `@preconcurrency import X` lines where `X` is not in `Glibc Musl WASILibc Android Bionic Darwin CRT WinSDK Dispatch` and has no comment. The migration guide's use of `@preconcurrency` on *declarations* (a protocol, a conformance) is the library-evolution use and stays allowed ([CommonProblems.md](https://github.com/swiftlang/swift-migration-guide/blob/main/Guide.docc/CommonProblems.md) "Preconcurrency Conformance"): 422 declaration uses in the corpus, 345 on funcs, only 2 on conformances.

### 15. Runtime isolation traps (plant g)

`g-runtime-trap`: `Legacy` (Swift 5 mode) calls a closure or protocol method on a `DispatchQueue.global()` thread; `Modern` (Swift 6) is `@MainActor`. All three failure scenarios exit **132** on 6.4 and 6.3:

```text
assume       fireOffMain { MainActor.assumeIsolated { hits += 1 } }
closure      fireOffMain { hits += 1 }                      // closure inferred @MainActor inside a @MainActor function
conformance  applyOffMain(W())                              // @MainActor final class W: @preconcurrency Styler
*** Program crashed: Illegal instruction ***
 0 _dispatch_assert_queue_fail + 82 in libdispatch.so
 2 dispatch_assert_queue + 118 in libdispatch.so
 4 swift_task_isCurrentExecutorWithFlags + 409 in libswift_Concurrency.so
 5 closure #2 in scenario(_:) in Modern
 6 closure #1 in fireOffMain(_:) in Modern at Sources/Legacy/Legacy.swift
```

The compliant twin: `fireOffMain { @Sendable in Task { @MainActor in hits += 1 } }` exits 0 on both. `@Sendable` makes the closure nonisolated, so no executor check is inserted; the hop is explicit. This is the SE-0423 dynamic isolation checking the vision describes: "Mitigating runtime assertions due to isolation mismatches" ([vision](https://github.com/swiftlang/swift-evolution/blob/main/visions/approachable-concurrency.md)). Apple-runtime cases (`awakeFromNib`, ObjC callbacks, `EXC_BREAKPOINT` in `assumeIsolated`, [forum 80624](https://forums.swift.org/t/mainactor-assumeisolated-crashes-on-main-thread/80624)) are **unverified: read only**.

Trap probe warning: in plant d, `Thread.isMainThread` read `true` before the first hop and `false` after an `await` that left and re-entered the `MainActor`, while the `@MainActor` function was still correctly isolated (`logs/d-run-6.4-nnbd0.log` of the first design). On Linux the main actor's executor is not necessarily the main thread, so thread identity is the wrong probe.

### 16. `sending`, isolated conformances, `~Sendable`, `weak let` (plants l, m, n, o)

- **`sending` (SE-0430, 6.0):** "A function parameter or result that is annotated with `sending` is required to be disconnected at the function boundary" ([SE-0430](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0430-transferring-parameters-and-results.md)); the migration guide offers it before a `Sendable` conformance ("This technique also works for types you do not control"). Plant m: `public func spawn(_ work: sending NonSendable)` accepts a fresh value (exit 0), rejects `spawn(n); n.x += 1` with `error: sending 'n' risks causing data races [#RegionIsolation::SendingRisksDataRace]` on 6.4 (`[#SendingRisksDataRace]` on 6.3), exit 1, while the box version `struct UnsafeBox<T>: @unchecked Sendable` accepted the same race silently. Sample evidence: 3 of 25 hatch sites in [conc] and 2 of 25 here are transfer boxes replaceable by `sending` (`swift-server/swift-aws-lambda-runtime@8abd464310c7:Sources/AWSLambdaRuntime/HTTPServer/Lambda+LocalServer.swift:117-123` already takes `init(value: sending Value)`).
- **Isolated conformances (SE-0470, 6.2):** `@MainActor class Model: @MainActor Equatable` builds on 6.3 and 6.4 (exit 0); using it where a `Sendable` type parameter is required fails `[#IsolatedConformances]` (exit 1). The old workaround `nonisolated static func ==` + `MainActor.assumeIsolated` traps off main (finding 15). `InferIsolatedConformances` is `LanguageMode::future`, enabled by `defaultIsolation(MainActor.self)` per Massicotte ([What Setting Should I Use?](https://massicotte.org/blog/what-settings/)); the proposal notes it is source-breaking where a conformance is currently `nonisolated` ([SE-0470](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0470-isolated-conformances.md)).
- **`~Sendable` (SE-0518, 6.4):** `public final class Connection: ~Sendable {}` builds on 6.4 (exit 0); on 6.3 `error: '~Sendable' requires -enable-experimental-feature TildeSendable` (exit 1) (`l-weaklet-tilde`). The `ExplicitSendable` audit (`-Xfrontend -require-explicit-sendable`, `unsafeFlags`) prints `warning: public struct 'Options' does not specify whether it is 'Sendable' or not [#ExplicitSendable]` for `Options` and `Client` and nothing for the annotated twins (6.3 and 6.4; the docs list `Sendable`, unavailable `Sendable` or `~Sendable` as the three accepted statements, [explicit-sendable-annotations.md](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/explicit-sendable-annotations.md)). I could not make it fail the build: `.treatWarning("ExplicitSendable", as: .error)` and `-Xswiftc -warnings-as-errors` left exit 0 in 4 attempts (`o-explicit-sendable/logs`), so it is a log-reading audit. Exemplars gate it behind a dev-only switch because `unsafeFlags` and `treatWarning` do not work for dependents: `swift-testing@c7d68ca20cd7:Package.swift:436-441`, `swift-server/async-http-client@017115279d09:Package.swift:22-27`.
- **`weak let` (SE-0481, 6.3):** `final class Child: Sendable { weak let parent: Parent? }` builds on 6.3 and 6.4 with no flag; `weak var` in a class needs `@unchecked` (`l-weaklet-tilde/Sources/L/WeakLet.swift`). It does not help when the referent is `AnyObject` (not Sendable): [conc] sample item 25 still failed.

### 17. Diagnostic group names (Sendable and isolation)

All measured; docs at `https://docs.swift.org/compiler/documentation/diagnostics/<kebab-name>`. Warning-only groups can be raised with `-Werror <Group>` / `.treatWarning`; errors are errors ([diagnostic-groups.md](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/diagnostic-groups.md)).

| Group (as printed) | Fired by | Mode | Versions |
|---|---|---|---|
| `SendingRisksDataRace` (6.4: `RegionIsolation::SendingRisksDataRace`) | non-Sendable value sent across isolation | error in 6; warning in 5 + `StrictConcurrency` | 6.3: leaf only; 6.4: nested |
| `SendingClosureRisksDataRace` | closure passed as `sending` captures isolated state | same | 6.3, 6.4 |
| `ActorIsolatedCall` | sync call to actor-isolated code from nonisolated | error | 6.3, 6.4 |
| `IsolatedConformances` | isolated conformance used where nonisolated/`Sendable` is required | error | 6.3, 6.4 |
| `MutableGlobalVariable` | `var` global not concurrency-safe | error in 6; warning in 5 + `StrictConcurrency` | 6.3, 6.4 |
| `SendableClosureCaptures` | non-Sendable capture in `@Sendable` closure | error | 6.3, 6.4 ([fail] §2.8) |
| `PreconcurrencyImport`, `AddPreconcurrencyImport` | fix-it/diagnostic about `@preconcurrency import` | warning | listed in the groups index; **silent in plant h** |
| `ExplicitSendable` | public type without a Sendable statement | warning, needs `-require-explicit-sendable` | 6.3, 6.4 |
| `StrictMemorySafety` | use of an unsafe construct incl. `nonisolated(unsafe)` bindings | warning, needs `.strictMemorySafety()` | 6.3, 6.4 |
| `NonisolatedNonsendingByDefault` | `:migrate` mode: function will change executor | warning | 6.4 (`swift package migrate`) |
| `NoUseUnstructuredThrowingTask` | `Task { throw ... }` unused | warning | **6.4 only** (6.3 silent); owned by W2-2 |

Plain diagnostics have no group: `stored property 'extra' of 'Sendable'-conforming class 'Leaky' is mutable`, `main actor-isolated property 'name' can not be referenced from a nonisolated context`, `non-final class ... cannot conform to 'Sendable'` ([conc] Axis 1). Greps and CI filters must match message text for these, and the leaf name for the groups above. Swift 5 mode + `.enableUpcomingFeature("StrictConcurrency")` turns the Sendable errors into `warning: ...; this is an error in the Swift 6 language mode [#Group]` (plant k), and `-Xswiftc -Werror -Xswiftc SendingRisksDataRace` promotes just that group (6.4, exit 1).

### 18. Re-sample of 25 `@unchecked Sendable` sites (new seed 2026-10-10)

Method: all non-test class/struct/enum/extension/actor lines containing `@unchecked Sendable` (815 sites, 33 repos), at most 2 drawn per repo, 25 drawn uniformly from that pool with `random.seed(20261010)` (`samp.py`, scratch). Each read in context (8-20 lines). One site (#22) coincides with the earlier audit sample (#5 there). "Avoidable" = a checked `Sendable`, `Mutex`, `sending` or a value type would satisfy the compiler on a Swift 6.0+/macOS 15 floor; marked (read) when not compiled.

| # | Site (repo@sha12:path:line) | Guard | Reason comment | Avoidable |
|---|---|---|---|---|
| 1 | IceCubesApp@2ad6e6891258:Packages/Models/Sources/Models/Alias/HTMLString.swift:9 | none; `var`s and `NSRegularExpression?` | no | yes, likely (read) |
| 2 | SwiftLint@ec4691d9e813:Source/SwiftLintBuiltInRules/Rules/Lint/ArrayInitRule.swift:5 | none; `var configuration` of a `Sendable` struct | no | yes, likely (read) |
| 3 | swift-aws-lambda-runtime@8abd464310c7:Sources/AWSLambdaRuntime/HTTPServer/Lambda+LocalServer.swift:117 | transfer box, immutable `let` | no | yes, `sending` |
| 4 | Nuke@d5548dd61395:Sources/Nuke/Caching/Cache.swift:13 | lock (`lock.lock()` at :40) | no | yes, `Mutex` (Apple floor) |
| 5 | container@f70ecbb926d9:Sources/ContainerBuild/Builder.pb.swift:213 | generated copy-on-write `_storage` | generated | no (generator) |
| 6 | swift-system@486d48c80fce:Sources/System/Internals/Exports.swift:190 | no state at all (WASI single-thread branch) | yes: "Carries no state of its own" (:189) | yes, plain `Sendable` |
| 7 | swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Parsing/Parsed.swift:32 | conditional on `Value: Sendable` | yes, 4-line comment :28-31 | no |
| 8 | sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SourceKitD.swift:22 | retroactive conformance on an imported C struct | no | no |
| 9 | Nuke@d5548dd61395:Sources/Nuke/ImageContainer.swift:147 | none; copy-on-write box | no | yes, struct storage (read) |
| 10 | element-x-ios@14e33866ced2:ElementX/Sources/Mocks/Generated/GeneratedMocks.swift:4983 | `NSLock` + `nonisolated(unsafe) var` | generated | partly (generated) |
| 11 | tuist@2f6ac74754bf:server/native/xcresult_nif/Sources/XCResultParser/XCResultTool.swift:76 | `NSLock` | no | yes, `Mutex` |
| 12 | hummingbird@1bd3b407fb47:Sources/HummingbirdHTTP2/HTTP2ServerConnectionManager.swift:231 | event-loop confinement, `preconditionInEventLoop()` at :238 | no | no (NIO) |
| 13 | swift-composable-architecture@bc2db5ba8ad3:Sources/ComposableArchitecture/Internal/CurrentValueRelay.swift:4 | `os_unfair_lock_t` | no | yes, `OSAllocatedUnfairLock`/`Mutex` (floor) |
| 14 | swift-distributed-tracing@a5270bd1280a:Sources/Instrumentation/Locks.swift:193 | `ReadWriteLock` | yes (:190-191) | no (lock wrapper, back-deploy) |
| 15 | swift-composable-architecture@bc2db5ba8ad3:Sources/ComposableArchitecture/Reducer/Reducers/PresentationReducer.swift:51 | none; copy-on-write box in a value | no | partly |
| 16 | swift-collections@935f696a549a:Sources/SortedCollections/SortedSet/SortedSet+Sendable.swift:16 | conditional on `Element: Sendable` | file purpose | no |
| 17 | swift-dependencies@b476cc576105:Sources/Dependencies/Dependency.swift:207 | `#if compiler(>=6)` uses checked `Sendable`; hatch only for older compilers | version shim | n/a (already removed on 6) |
| 18 | swift-async-algorithms@cbde9aed744b:Sources/AsyncAlgorithms/UnsafeTransfer.swift:13 | transfer box, immutable `let` | yes (:12) | partly, `sending` |
| 19 | swift-syntax@be549876fe91:Sources/SwiftSyntax/Syntax.swift:383 | platform mutex (:384-388) | yes | no (pre-`Mutex` floor) |
| 20 | tuist@2f6ac74754bf:cli/Sources/TuistHTTP/TuistURLSessionDelegate.swift:31 | immutable `[SecCertificate]` | yes, :28-30 | no |
| 21 | swift-log@4038b6a4f74a:Sources/Logging/LoggingSystem.swift:135 | `ReadWriteLock` | yes (:134) | no (lock wrapper) |
| 22 | swift-openapi-generator@c4f943e14015:Sources/_OpenAPIGeneratorCore/YamlFileDiagnosticsCollector.swift:23 | `NSLock`, "Protects `diagnostics`" (:24) | yes | yes, `Mutex<[Diagnostic]>` (earlier audit #5, compiled) |
| 23 | swift-crypto@1c80d3aff53f:Sources/CryptoExtras/Digests/SHA512256.swift:32 | value semantics over a `final class` BoringSSL context | no | no |
| 24 | container@f70ecbb926d9:Sources/ContainerBuild/Builder.pb.swift:414 | generated copy-on-write | generated | no |
| 25 | swift-log@4038b6a4f74a:Sources/Logging/Locks.swift:183 | it is the lock (pthread_rwlock / SRWLOCK) | yes (:180-182) | no |

Tally: visible lock/queue guard 9 (#4, 10, 11, 13, 14, 19, 21, 22, 25), event-loop confinement 1, immutability/stateless/C handle 3, conditional generic or version shim 3, copy-on-write storage 5, transfer box 2, unguarded stored vars 2. Avoidable on a 6.0+ floor: 9 clearly (#1-4, 6, 9, 11, 13, 22) plus 1 partly (#18) = **36-40%**; together with the earlier 12/25 = **21-22 of 50 (~43%)**. A comment saying why the hatch is safe: **8/25 (32%)**, so a reason requirement fails two thirds of existing sites and must gate new code only. 7 of 25 are generated (3), lock wrappers (3) or already-version-gated (1); a generated-file exclusion belongs in the rule.

## Normative guidance candidates

Each candidate: rule; rationale; how a reviewer VERIFIES it; whether the verification was RUN against a planted violation. IDs are provisional SW-CONC numbers for the consolidation step.

**SW-CONC-01 (M-B-03). Resolve a Sendable or isolation diagnostic in the ladder order: remove the sharing; value type or `let` (`weak let` for weak back-references, 6.3+); `@MainActor`; `sending`; `Mutex<State>` in a `final class: Sendable`; a commented `actor`; `@preconcurrency`; and only then `@unchecked Sendable` / `nonisolated(unsafe)`.**
Rationale: agents jump to the last rung; the compiler cannot tell the rungs apart. Verify: reading heuristic "for every added hatch (V1 output on the diff), name the highest rung that applies and show why it does not"; plus the removal test (SW-CONC-02). RUN: the mechanical parts, yes (`a-unchecked`, `j-remove-hatch`, `m-sending`, `q-diff-gate`); the ladder judgement is reading only.

**SW-CONC-02 (M-B-01). `@unchecked Sendable` is allowed only when (a) the removal test fails, (b) a guard is visible in the type body, and (c) a comment directly above or trailing names the guard and what keeps all access inside it.**
Rationale: swiftc, SwiftLint 0.65.1 and TSan-less CI are silent on an unguarded body. Verify, run inside the toolchain, output = violations, empty = pass:

```bash
# (a) removal test: exit 0 means the hatch is redundant (violation). Script copies the package, rewrites '@unchecked Sendable' to 'Sendable', builds.
sed -i 's/@unchecked Sendable/Sendable/' file.swift && swift build            # exit 0 => delete the hatch; non-zero => keep, apply (b) and (c)
# (c) reason present, on the files a diff touches (output = violating lines)
git diff --name-only --diff-filter=AM main -- '*.swift' | xargs -r awk 'FNR == 1 { lead = 0 } /^[ \t]*\/\// { lead = 1; next } /^[ \t]*@[A-Za-z_]+(\(.*\))?[ \t]*$/ { next } /@unchecked Sendable/ { if (!lead && $0 !~ /\/\//) print FILENAME ":" FNR ": " $0 } { lead = 0 }'
# (b) guard suspects over a directory (output = decls with a stored var and no lock/atomic/queue/confinement token; read each)
find Sources -name '*.swift' -print0 | xargs -0 -r awk '...'      # checks/hatch-guard.sh in the fixtures, body scanner with brace depth
```

RUN: yes. (c): red prints `a-unchecked/Sources/Counter/Counter.swift:6: public final class RacyCounter: @unchecked Sendable {` and `Globals.swift:5: nonisolated(unsafe) public var sharedCache`, green `a-twin` prints nothing; the diff-gate variant flags only the added `Added` class, 0 lines on an unchanged branch (`q-diff-gate`). (b): red prints `RacyCounter`, green (`LockedCounter` with `NSLock`) prints nothing. (a): `redundant` exit 0, `legit` exit 1 on 6.4 and 6.3. (b)'s reading step is heuristic only.

**SW-CONC-03 (M-B-02). `nonisolated(unsafe)` on a `let` of an immutable non-Sendable value needs a one-line reason; on a `var` it also needs the named lock, and every access goes through one `withLock`-style function.**
Rationale: 58% of corpus uses are `let`; the `var` form is the dangerous one. Verify: the same awk with `nonisolated\(unsafe\)` as the pattern (`checks/hatch-reason.sh`); `swift build` with `.strictMemorySafety()` lists every use as `[#StrictMemorySafety]` (acknowledge with `unsafe`, 6.2+); grep for the form: `grep -rn -e 'nonisolated(unsafe) var' --include='*.swift' Sources` (each hit needs a named lock; reading). RUN: yes (6.4 and 6.3: 4 warnings red, 0 after `unsafe`; reason awk red 1 line / green 0 lines). Note: StrictMemorySafety does not flag `@unchecked Sendable`.

**SW-CONC-04 (M-B-05). A `final class` whose only stored properties are `let` `Mutex<...>` values is declared plain `Sendable`, never `@unchecked`.**
Rationale: checked on 6.3 and 6.4; the compiler then rejects the first stray mutable property. Verify: the removal test (SW-CONC-02a) on every `@unchecked` class that contains `Mutex<`; `grep -rn -e 'Mutex<' --include='*.swift' Sources` to find candidates. RUN: yes (`b-mutex-only`: Registry/Holder green on both, Leaky red exit 1, Redundant removal exit 0).

**SW-CONC-05 (M-B-04). Pick shared-state tools by the table: `Mutex` for synchronous short sections, `actor` only with a "this is an actor because" comment, `@MainActor` for UI/singletons, custom `@globalActor` only with the same comment, `NIOLockedValueBox` only inside the NIO stack.**
Rationale: Massicotte's three conditions; the corpus has 3 global actors. Verify (output = violations): `find Sources -name '*.swift' -print0 | xargs -0 -r awk '/^[ \t]*\/\// { if (index($0, "because") > 0) why = 1; lead = 1; next } /^[ \t]*@[A-Za-z_]+(\(.*\))?[ \t]*$/ { next } $0 ~ /^[ \t]*[a-z ]*actor [A-Z]/ && $0 !~ /actor isolation/ { if (!why) print FILENAME ":" FNR ": " $0 } { lead = 0; why = 0 }'`. Reading: the sentence is a reason, not "helps with concurrency errors". RUN: yes (`p-actor-reason`: red prints `Counter` and `ImageActor`, green prints nothing).

**SW-CONC-06 (M-B-06). Inside `Mutex.withLock` / a held lock: no `await`, no call to a user-supplied closure, no re-entry into the same lock, no logging; keep it to reading and writing the guarded value.**
Rationale: `Mutex` is non-recursive; re-entry hangs (exit 124 measured). The compiler already rejects `await` under `withLock` and `NSLock.lock()` in async code. Verify: compile errors (exit 1) for the first two; reading heuristic for callbacks and re-entry. RUN: yes for hang and both compile errors (`i-lock-misuse`); the callback rule is reading only.

**SW-CONC-07 (M-B-07). Published libraries, SDKs, CLIs, daemons and servers never set `.defaultIsolation(MainActor.self)`; app targets and app-internal UI packages may, with `.swiftLanguageMode(.v6)`; a compile-test executable may, on purpose.**
Rationale: finding 10; vision; plant c. Verify: `grep -rn -e 'defaultIsolation' --include='Package*.swift' .` (output must be empty or only in app/compile-test manifests), and for library packages `swift package dump-package > pkg.json; jq -r '[.products[] | select(.type | has("library")) | .targets[]] as $exp | .targets[] | select(.name as $n | $exp | index($n)) | select(any(.settings[]?; .kind | has("defaultIsolation"))) | .name' pkg.json` (output = exported targets with the setting). RUN: yes (`EXPORT=1` prints `UILib`, `EXPORT=0` prints nothing; grep exit 0 red / exit 1 green; the jq program contains pipes because it is jq, not a search pattern).

**SW-CONC-08 (M-B-08). A published library with public async or protocol API ships a `CompileTests/` package that builds the API under `defaultIsolation(MainActor.self)` + `NonisolatedNonsendingByDefault` + `InferIsolatedConformances`; CI runs `swift build` there on the floor and the current toolchain.**
Rationale: the library compiles alone and breaks consumers (plant f). Verify: `swift build` in `CompileTests`, exit 0. RUN: yes (BAD exit 1, FIXED exit 0 on 6.4 and 6.3).

**SW-CONC-09 (M-B-09). Enable `NonisolatedNonsendingByDefault` by name for new libraries, SDKs, CLIs and servers (and their test targets); migrate existing targets with `swift package migrate --to-feature NonisolatedNonsendingByDefault`; mark CPU-bound public async functions `@concurrent` with a reason; forward `isolation: isolated (any Actor)? = #isolation` when wrapping `next(isolation:)`.**
Rationale: the setting flips meaning with no diagnostic (exit 132 vs 0) and breaks `AsyncSequence` wrappers. Verify: (1) runtime isolation assert as in plant d (`MainActor.preconditionIsolated()` in a nonisolated async test helper called from `@MainActor`), (2) `swift build` on both toolchains with the setting on, (3) `grep -rn -e 'NonisolatedNonsendingByDefault' --include='Package*.swift' .` for presence. RUN: yes for (1) and (2) (d: exit 132 / 0; d2: exit 1 / 0 on 6.4 and 6.3; migrate exit 0 with fix-its).

**SW-CONC-10 (M-L-03). Do not ship `.enableUpcomingFeature("ApproachableConcurrency")`; replace the template's line on every target (and its test target) with the explicit names the rule SW-CONC-09 and the vision call for (`NonisolatedNonsendingByDefault`, plus `InferIsolatedConformances` for modules with global-actor-isolated public types).**
Rationale: pseudo-feature with an undocumented expansion; three of five members are already on in Swift 6 mode. Verify (output = violation, exit 0; no output, exit 1 = pass): `grep -rn -e 'ApproachableConcurrency' --include='Package*.swift' .`. RUN: yes (`e-init/6.4/lib` prints 2 lines, `e-init/6.3/lib` prints nothing). Exempt: a manifest that must match an Xcode `SWIFT_APPROACHABLE_CONCURRENCY` setting (unverified: read only).

**SW-CONC-11 (M-B-22). `@preconcurrency import X` only for libc/OS shims (`Glibc Musl WASILibc Android Bionic Darwin CRT WinSDK Dispatch`), or with a comment naming the module, the missing annotation and the removal trigger.**
Rationale: it silences real races with no warning (plant h). Verify: `find Sources -name '*.swift' -print0 | xargs -0 -r awk` over `checks/preconcurrency-import.sh` (prints non-shim, uncommented imports). RUN: yes (red prints `Legacy` and `Foundation` imports; green with a tracker comment prints nothing).

**SW-CONC-12 (M-B-23). Never rely on `MainActor.assumeIsolated` for a callback whose queue you do not control; hand a `@Sendable` closure to Swift-5-mode or C callers and hop with `Task { @MainActor in }`; assert isolation with `MainActor.preconditionIsolated()` or compare `#isolation`, never `Thread.isMainThread`.**
Rationale: three traps measured (exit 132, `_dispatch_assert_queue_fail`). Verify: `grep -rn -e 'assumeIsolated' -e 'MainActor.run' -e 'isMainThread' --include='*.swift' Sources` (output = sites to justify); run the callback path once on the target OS. RUN: yes (g: 132 vs 0 on 6.4 and 6.3; grep exit 0 on the fixture, exit 1 on a clean one).

**SW-CONC-13 (M-B-24). Replace transfer boxes (`struct Box<T>: @unchecked Sendable`) with `sending` parameters/results wherever the value is handed off once.**
Rationale: a box compiles a use-after-send silently; `sending` rejects it. Verify: `grep -rn -e 'Unsafe.*Box' -e 'TransferBox' --include='*.swift' Sources` for candidates, then the removal test after rewriting the signature with `sending`. RUN: yes (`m-sending`: use-after-send exit 1 `[#SendingRisksDataRace]`, box version exit 0 silent).

**SW-CONC-14 (M-B-25). A `@MainActor` type adopting a nonisolated protocol declares `: @MainActor P` (6.2+); do not write `nonisolated` witnesses over `MainActor.assumeIsolated`.**
Rationale: the workaround traps off main; the isolated conformance is checked. Verify: `grep -rn -e 'nonisolated static func ==' --include='*.swift' Sources` and `grep -rn -e 'assumeIsolated' --include='*.swift' Sources`; build. RUN: yes (`n-isolated-conformance` ok exit 0, Sendable use exit 1 `[#IsolatedConformances]`); the grep is reading-level.

**SW-CONC-15 (M-B-28). Public types state `Sendable`, `~Sendable` (6.4+) or an unavailable conformance; weak back-references use `weak let` (6.3+) instead of `@unchecked`.**
Rationale: removes two historic reasons for the hatch; the audit is a build log filter. Verify: `EXPLICIT=1 swift build > build.log 2>&1` then `grep -rn -e 'ExplicitSendable' --include='build.log' .` (output = public types with no statement); on 6.3 `~Sendable` fails with `requires -enable-experimental-feature TildeSendable`, so gate on the toolchain floor. RUN: yes for red/green output (o-explicit-sendable: 2 warnings vs 0), no for failing the build (exit stayed 0 in 4 attempts).

**SW-CONC-16 (M-B-01 supplement). Race checks on Linux: run `swift test --sanitize=thread` as an advisory leg; in Docker add `--security-opt seccomp=unconfined`; expect a false positive on correct `Mutex` code; keep a deterministic count assertion for every hatch-guarded type.**
Rationale: measured TSan behaviour (finding 3). Verify: the TSan run (red `RacyCounter` exit 1, green lock/actor exit 0) and `swift test` with the count `#expect`. RUN: yes (6.4 and 6.3).

**SW-CONC-17 (M-B-10). An async function that forwards to an isolated-capable API takes `isolation: isolated (any Actor)? = #isolation` and passes it on.**
Rationale: under `NonisolatedNonsendingByDefault` a forwarding wrapper without it fails to compile (d2). Verify: build with the feature on; reading for the parameter. RUN: yes (d2 twin exit 0).

**SW-CONC-18. Do not write to stderr through the C `stderr` global in Swift 6 mode.**
Rationale: `fputs(..., stderr)` fails `error: reference to var 'stderr' is not concurrency-safe because it involves shared mutable state` on 6.3 and 6.4 (hit twice while building plant d); use `FileHandle.standardError`. Verify: `grep -rn -e ', stderr)' --include='*.swift' Sources`. RUN: yes (compile error exit 1; grep reading-level).

## Verification runs

All run 2026-10-10 in `swift:6.4` and `swift:6.3` images through `run.sh` (`SWIFT_VERSION=6.3` for the older), `--scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"`, fixtures under `$FX`. TSan runs used a copy of `run.sh` with `--security-opt seccomp=unconfined` added (the stock script fails, row V7a). "Red" = violation exit code or output; "green" = compliant twin. Logs: `$FX/logs/` unless noted.

| ID | Fixture | Command (verbatim) | Red | Green | Key output |
|---|---|---|---|---|---|
| V0 | `a-unchecked` | `swift build --target Counter -Xswiftc -warnings-as-errors --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"` | **no red**: exit 0 on 6.4 and 6.3 for `RacyCounter` | n/a | `Build complete!`, zero diagnostics (this is the finding, not a gate) |
| V7a | `a-unchecked` | `swift test --sanitize=thread --filter lockedCounter --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"` via stock `run.sh` | exit 1 | n/a | `FATAL: ThreadSanitizer: encountered an incompatible memory layout but was unable to disable ASLR` |
| V7b | `a-unchecked` | `swift test --sanitize=thread --filter racyCounterAsserted --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"` (unconfined seccomp) | exit 1, 3 warnings (6.4 and 6.3) | `--filter lockedCounter` exit 0, 0 warnings; `--filter actorCounter` exit 0, 0 warnings | `WARNING: ThreadSanitizer: Swift access race`; **`--filter safeCounter` (Mutex) exit 1, 1 warning: false positive** |
| V8 | `a-unchecked` | `swift test --filter racyCounterAsserted --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"` | exit 1 (5/5 runs) | `--filter lockedCounter` exit 0 | `Expectation failed: c.n == expected` |
| V1 | `a-unchecked` / `a-twin` | `find Sources -name '*.swift' -print0 \| xargs -0 -r awk '/^[ \t]*\/\// { lead=1; next } /^[ \t]*@[A-Za-z_]+(\(.*\))?[ \t]*$/ { next } /@unchecked Sendable/ { if (!lead && $0 !~ /\/\//) print FILENAME ":" FNR ": " $0 } { lead=0 }'` (and the same with `nonisolated\(unsafe\)`; `checks/hatch-reason.sh`) | 2 lines (`Counter.swift:6`, `Globals.swift:5`) | `a-twin`: empty | `Sources/Counter/Counter.swift:6: public final class RacyCounter: @unchecked Sendable {` |
| V1d | `q-diff-gate` | `git diff --name-only --diff-filter=AM main -- '*.swift' \| xargs -r awk 'FNR == 1 { lead = 0 } ...'` | 1 line (`Sources/Counter.swift:45: public final class Added: @unchecked Sendable {`) | unchanged branch: empty | existing commented `LockedCounter` not reported |
| V2 | `a-unchecked` / `a-twin` | `checks/hatch-guard.sh Sources` (brace-depth awk, tokens `lock mutex atomic queue pthread eventloop isolat confin`) | prints `RacyCounter` | empty (`LockedCounter` contains `NSLock`) | corpus: 202 of 695 decls flagged |
| V3 | `j-remove-hatch` | `sed -i 's/@unchecked Sendable/Sendable/'` on a copy, then `swift build` (`checks/hatch-removal.sh`) | `redundant`: `removal-build-exit=0` (6.4, 6.3) | `legit`: `removal-build-exit=1` (6.4, 6.3) | exit 0 = hatch unnecessary |
| V3b | `b-mutex-only` | `swift build` ; `swift build -Xswiftc -DB2` | `-DB2` exit 1 | default exit 0 (6.4, 6.3) | `error: stored property 'extra' of 'Sendable'-conforming class 'Leaky' is mutable` |
| V4 | `e-init/6.4/lib`, `e-init/6.3/lib` | `grep -rn -e 'ApproachableConcurrency' --include='Package*.swift' e-init/6.4/lib` | exit 0, 2 lines (`Package.swift:21,28`) | `e-init/6.3/lib` exit 1, empty | |
| V5 | `c-default-isolation` | `grep -rn -e 'defaultIsolation' --include='Package*.swift' c-default-isolation/Package.swift` | exit 0 (2 lines) | `d-nonsending`: exit 1, empty | |
| V5b | `c-default-isolation` | `swift package dump-package > pkg.json` then the jq program of SW-CONC-07 | `EXPORT=1`: prints `UILib` | `EXPORT=0`: empty | |
| V6 | `c-default-isolation` | `swift build --target Consumer --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"` | exit 1 on 6.4 (6 errors) and 6.3 (5 errors) | `swift run ConsumerApp` / `ConsumerMain` exit 0, print `true` / `1 42 false` | `[#ActorIsolatedCall]`, `[#IsolatedConformances]` |
| V9 | `d-nonsending` | `NNBD=0 swift run --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable" probe-cli assert` | exit 132 (6.4 and 6.3) | `NNBD=1`: exit 0 | `Program crashed: Illegal instruction`; `f() -> nil` vs `Optional(Swift.MainActor)` |
| V9b | `d2-nnbd-break` | `NNBD=1 swift build -Xswiftc -DBREAK --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"` | exit 1 (6.4 `[#RegionIsolation::SendingRisksDataRace]`, 6.3 `[#SendingRisksDataRace]`) | without `-DBREAK` exit 0; `NNBD=0` exit 0 | `sending 'self.iterator' risks causing data races` |
| V9c | `d-migrate` | `swift package migrate --to-feature NonisolatedNonsendingByDefault` | exit 0, 2 fix-its | n/a | `@concurrent` added; manifest edited |
| V10 | `f-consumer-default/CompileTests` | `swift build --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable"` and `swift build -Xswiftc -DFIXED ...` | BAD exit 1 (6.4: lines 10 and 14; 6.3: line 14) | FIXED exit 0 (both) | `[#IsolatedConformances]` |
| V11 | `h-preconcurrency` | `checks/preconcurrency-import.sh Sources` (awk with the shim list) | prints `B_Preconcurrency.swift:1` and `C_Unneeded.swift:1` | `twin-Sources`: empty | `swift build`: file A without the attribute exit 1, B/C silent exit 0 |
| V12 | `p-actor-reason` | `checks/actor-reason.sh red` / `green` | prints `Counter`, `ImageActor` | empty | |
| V13 | `g-runtime-trap` | `swift run --scratch-path "$SWIFT_SCRATCH/isolation-and-sendable" Modern assume` (also `closure`, `conformance`) | exit 132 each, 6.4 and 6.3 | `hop` exit 0 | `_dispatch_assert_queue_fail` ... `swift_task_isCurrentExecutorWithFlags` |
| V13b | `g-runtime-trap` | `grep -rn -e 'assumeIsolated' -e 'MainActor.run' --include='*.swift' g-runtime-trap/Sources` | exit 0, 2 lines | `d-nonsending`: exit 1 | |
| V14 | `m-sending` | `swift build -Xswiftc -DBAD ...` | exit 1 `[#SendingRisksDataRace]` | default exit 0 | box version silent |
| V15 | `n-isolated-conformance` | `swift build -Xswiftc -DBAD ...` | exit 1 `[#IsolatedConformances]` | default exit 0 | |
| V16 | `i-lock-misuse` | `timeout 20 .build/debug/Misuse recurse` (also `callout`); `swift build -Xswiftc -DAWAIT_UNDER_LOCK`, `-DNSLOCK_ACROSS_AWAIT` | exit 124 (hang); exit 1; exit 1 | `ok` exit 0 | `instance method 'lock' is unavailable from asynchronous contexts` |
| V17 | `l-weaklet-tilde` | `swift build -Xswiftc -DTILDE ...` | 6.3 exit 1 | 6.4 exit 0 | `'~Sendable' requires -enable-experimental-feature TildeSendable` |
| V18 | `o-explicit-sendable` | `EXPLICIT=1 swift build ...` | exit 0 **with 2 `[#ExplicitSendable]` warnings** (6.3, 6.4) | annotated twin: exit 0, 0 warnings | not made to fail: `.treatWarning("ExplicitSendable", as: .error)` and `-Xswiftc -warnings-as-errors` left exit 0 (4 attempts); a log-reading audit |
| V19 | `a-unchecked` | `STRICT=1 swift build --target Counter ...` | exit 0, 4 `[#StrictMemorySafety]` warnings | uses prefixed `unsafe`: 0 warnings | not red by exit code; output-based |
| V20 | `e-init/6.4/lib` | `swift build` after adding `var racyGlobal = 0` | exit 1 `[#MutableGlobalVariable]` (tools 6.4, no `swiftLanguageModes`) | n/a | proves Swift 6 mode is implied |

## Exemplar evidence

Satisfy (guard + reason, or ladder-conformant):
- SW-CONC-02: `swift-nio@e12881f2a691:Sources/NIOPosix/ThreadWindows.swift:28-37` (guard: `let` handle + kernel table; reason in a doc comment); `swift-distributed-tracing@a5270bd1280a:Sources/Instrumentation/Locks.swift:190-193`; `tuist@2f6ac74754bf:cli/Sources/TuistHTTP/TuistURLSessionDelegate.swift:28-31`; `swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Parsing/Parsed.swift:28-32`; `swift-system@486d48c80fce:Sources/System/Internals/Exports.swift:188-196`; `swift-openapi-generator@c4f943e14015:Sources/_OpenAPIGeneratorCore/YamlFileDiagnosticsCollector.swift:23-26` (guarded, but avoidable with `Mutex`).
- SW-CONC-04/05: `swift-server/async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:543-548` (`MutableState: Sendable` in `NIOLockedValueBox`, no hatch on the user type); `Dimillian/IceCubesApp`-less: `swift-package-manager#10425` (Mutex adoption, hatch removed in review); `kean/Nuke@d5548dd61395:Sources/Nuke/Internal/RateLimiter.swift:16-17,55` (`@ImagePipelineActor final class RateLimiter` with `Task { @ImagePipelineActor in ... }`, a commented-by-name global actor at `Sources/Nuke/Pipeline/ImagePipelineActor.swift:14`).
- SW-CONC-07/08: `swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25` (the compile-test precedent); `Dimillian/IceCubesApp@2ad6e6891258:Packages/Timeline/Package.swift:41-42` (app-internal use, with `.swiftLanguageMode(.v6)`); 0 published libraries set it.
- SW-CONC-09: named `NonisolatedNonsendingByDefault` in swift-log, swift-async-algorithms, vapor, swift-aws-lambda-runtime, swift-dependencies, sourcekit-lsp, element-x-ios manifests (lines in finding 11); interop note at `swift-aws-lambda-runtime@8abd464310c7:Examples/Streaming+Codable/Package.swift:5-16`.
- SW-CONC-13: `swift-aws-lambda-runtime@8abd464310c7:Sources/AWSLambdaRuntime/HTTPServer/Lambda+LocalServer.swift:120` (`init(value: sending Value)` on a hatch box that could drop the box).

Violate (or are avoidable):
- SW-CONC-02(c): 610 of 866 non-test `@unchecked Sendable` lines have no comment; sample #1, #2, #4, #9, #11, #13 above (e.g. `IceCubesApp@2ad6e6891258:Packages/Models/Sources/Models/Alias/HTMLString.swift:9` unguarded `var`s; `Nuke@d5548dd61395:Sources/Nuke/ImageContainer.swift:147`).
- SW-CONC-04: `swift-server/swift-service-lifecycle@c55297914e26:Sources/ConcurrencyHelpers/LockedValueBox.swift:54` (lock wrapper that [conc] judged replaceable by `Mutex`).

Contradict or complicate:
- Conflict 4 / SW-CONC-09: `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:79-81` is the break the setting causes (reproduced as plant d2); `swift-testing@c7d68ca20cd7:Package.swift:475` enables `InferIsolatedConformances` without `NonisolatedNonsendingByDefault`; Alamofire pairs tools 6.4 with `.v5`.
- SW-CONC-10: the bundle name appears only in SwiftPM's own fixtures and `swift-package-manager@5546f44a3b52:Examples/package-registry/Package.swift:38,48,58`.
- SW-CONC-15 gating: `swift-log@4038b6a4f74a:Package.swift:70-71` and `async-http-client@017115279d09:Package.swift:22-27` apply `-require-explicit-sendable` only for development; `swift-testing@c7d68ca20cd7:Package.swift:436-441` states `treatWarning` "cannot be used in packages which are used as dependencies".

## AI-agent angle

What an LLM characteristically gets wrong here, with the smallest mechanical check:

| Mistake (pre-6 or hallucinated habit) | Why it compiles and is wrong | Smallest check |
|---|---|---|
| Adds `@unchecked Sendable` to silence an error | silent in swiftc and SwiftLint; plant a lost 128,131 of 400,000 updates | SW-CONC-02 removal test + reason awk on the diff |
| Wraps state in a class with `NSLock`/`DispatchQueue` + `@unchecked` instead of `Mutex` (2023-24 habit) | works, but the whole type is unchecked | grep `NSLock\|DispatchQueue` is banned as a pipe pattern here, so `grep -rn -e 'NSLock' -e 'DispatchQueue(' --include='*.swift' Sources`, then the removal test after swapping to `Mutex` |
| Writes `@unchecked Sendable` on a `Mutex`-only class | redundant, reviewers reject it | removal test exit 0 |
| `nonisolated(unsafe) var` for every 6-mode global error | declaration is not flagged by StrictMemorySafety; uses are | reason awk; `.strictMemorySafety()` uses |
| `Task.detached { ... }` or `MainActor.run { ... }` to dodge a diagnostic | drops isolation, priority, task locals; or is a migration crutch ([Problematic patterns](https://www.massicotte.org/problematic-patterns): "rarely the right solution"); MainActor.run is rare in the corpus (23 sites) | `grep -rn -e 'Task.detached' -e 'MainActor.run' --include='*.swift' Sources` |
| Makes a network client an `actor` with only `Sendable` members | an actor with no non-Sendable state; every call now `await`s | actor-reason awk plus the three conditions |
| Copies the template's `ApproachableConcurrency`, or thinks it implies MainActor default | it never sets default isolation; Wals/AvdLee-era text says packages get neither | SW-CONC-10 grep |
| Hallucinates `.defaultIsolation(.MainActor)` or uses it in a library | the signature is `defaultIsolation(_ globalActor: MainActor.Type?)`, tools 6.2+ | `swift build` fails on the spelling; SW-CONC-07 grep/jq |
| Flips `NonisolatedNonsendingByDefault` and calls the build green | semantics change with no diagnostic (exit 132 vs 0) | runtime isolation assert test; `swift package migrate --to-feature` |
| `@preconcurrency import SomeLib` to silence a Sendable error | hides the race with no warning | SW-CONC-11 awk |
| Writes `fputs(..., stderr)` in Swift 6 mode | `error: reference to var 'stderr' is not concurrency-safe` (hit while building plant d on 6.3 and 6.4) | compile; `FileHandle.standardError` |
| Uses `Thread.isMainThread` as the isolation assertion | false after a hop and return on Linux | grep `isMainThread`; use `MainActor.preconditionIsolated()` |
| `MainActor.assumeIsolated` in a delegate/callback | traps (exit 132) when the framework calls off main | grep `assumeIsolated`; run the callback path |
| Closure passed from a `@MainActor` function to a Swift-5 or C API | inferred `@MainActor`, trapped when invoked off main | `@Sendable` closure + hop; plant g |
| `UnsafeSendableBox<T>`/`UncheckedSendable` wrappers | compile the use-after-send race | SW-CONC-13 |
| Holds a lock across `await` | Mutex: compile error; `NSLock`: compile error; but `DispatchSemaphore` bridges deadlock (W2-2) | compile; see W2-2 |
| Assumes TSan green proves `Mutex` code safe, or red proves it racy | false positive on `Mutex` (Linux, 6.3 and 6.4); Docker blocks TSan by default | SW-CONC-16 |
| Expects `swift package init` 6.4 to emit `swiftLanguageModes: [.v6]` | it does not; mode 6 is implied by tools 6.4 | `swift package dump-package` |

## Contested / evolving

- **Default MainActor isolation.** Massicotte: "We should not" (2025-11-20); Wals: good default for app targets and UI packages, not networking; vision: executables yes, libraries `nonisolated`, with a "permanent language dialect" risk acknowledged. This dive follows the vision for libraries/CLIs/servers and allows it for apps. Trend (2026-10): Apple's template keeps it for app targets; library guidance stays `nonisolated`.
- **`@unchecked Sendable` as "cheating".** Massicotte (2025-10-19): asserting an existing lock is legitimate, "before the compiler was able to check this stuff, literally all types were `@unchecked Sendable`"; the migration guide: "not your first approach". Resolved here by the guard + reason + removal test. Trend: `Mutex`, `sending`, `weak let` and `~Sendable` shrink the legitimate set (about 40% of sampled sites avoidable today).
- **Actors vs `Mutex`.** Massicotte tightened the actor criterion (three conditions) in 2025 and softened on stateless actors in 2026-05 ([Stateless Actors](https://massicotte.org/stateless-actors/), summarized in [prac]); SE-0433 itself notes actors cannot deadlock but suffer reentrancy. Trend: fewer actors, `Mutex` for synchronous state, `@MainActor` for UI.
- **`NonisolatedNonsendingByDefault` for libraries.** Seven of 40 repos have it on; it removes the "nonisolated async hops off-actor" trap but silently moves CPU-bound work onto the caller's actor. Massicotte recommends adopting it; the vision frames it as progressive disclosure. This dive recommends it for new code with `@concurrent` marked and a CI build on two toolchains. Trend: more adoption as 6.4 becomes the floor; the not-yet-decided piece is whether a future language mode folds it in (it is `LanguageMode::future` as of 6.4.0).
- **TSan on Linux.** Reported unreliable by users in 2026-02 (forum 84801); measured here: catches classic hatch races, false-positives on `Mutex`, blocked by Docker's default seccomp on this host. No fix named upstream as of 2026-10-10.
- **`ExplicitSendable` gating.** Exemplars keep it behind a dev-only switch; I could not make it an error through `treatWarning` or `-warnings-as-errors` in 4 attempts. Needs a SwiftPM-side confirmation (W2 gates dive).
- **Bundle vs named features.** Xcode exposes `SWIFT_APPROACHABLE_CONCURRENCY`; SwiftPM's template now writes the bundle. SwiftPM manifests in the wild name the features. Trend: unclear whether the template changes in 6.5; re-check at the next release.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0466-control-default-actor-isolation.md | SE-0466, `-default-isolation` and `SwiftSetting.defaultIsolation` | Swift 6.2 | exact API (`MainActor.Type?`, tools 6.2) and exemptions |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md | SE-0461, `nonisolated(nonsending)`, `@concurrent`, `NonisolatedNonsendingByDefault` | Swift 6.2 | admits same code means different things per setting; fix-its preserve behaviour |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0433-mutex.md | SE-0433 `Mutex` | Swift 6.0 | non-recursive warning; `sending` closure makes it its own isolation domain |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0430-transferring-parameters-and-results.md | SE-0430 `sending` | Swift 6.0 | semantics of disconnected regions |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0470-isolated-conformances.md | SE-0470 isolated conformances, `InferIsolatedConformances` | Swift 6.2 | replaces `nonisolated`+`assumeIsolated` |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0518-tilde-sendable.md | SE-0518 `~Sendable` | Swift 6.4 | 6.3 needs an experimental flag (verified) |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0481-weak-let.md | SE-0481 `weak let` | Swift 6.3 | checked-Sendable weak back-references |
| https://github.com/swiftlang/swift-evolution/blob/main/visions/approachable-concurrency.md | Language Steering Group vision | 2024-11 onward | executables vs libraries default, dynamic isolation assertions |
| https://github.com/swiftlang/swift-migration-guide/blob/main/Guide.docc/CommonProblems.md (clone 949b5e1be201) | official migration guide, common errors | 2026 | ladder for globals, `Sendable` conformance four ways, "not your first approach" |
| https://github.com/swiftlang/swift-migration-guide/blob/main/Guide.docc/IncrementalAdoption.md | dynamic isolation, `@preconcurrency`, `assumeIsolated` | 2026 | `MainActor.run` "should not be used as a substitute" |
| https://www.swift.org/migration/documentation/migrationguide/ | rendered migration guide index (JS app; content read from the repo above) | 2026 | entry point |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.0-RELEASE/lib/Frontend/CompilerInvocation.cpp | `ApproachableConcurrency` expansion at 6.4.0 (also `swift-6.3-RELEASE`, `main:1068`) | 6.4.0 | the five features |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.0-RELEASE/include/swift/Basic/Features.def | which features are `LanguageMode::v6` vs `future` | 6.4.0 | shows three of five are redundant in mode 6 |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.0-RELEASE/stdlib/public/Synchronization/Mutex/Mutex.swift | `Mutex` source | 6.4.0 | `@unchecked Sendable where Value: ~Copyable`, `SwiftStdlib 6.0` |
| https://raw.githubusercontent.com/swiftlang/swift/swift-6.4.0-RELEASE/utils/availability-macros.def | `SwiftStdlib 6.0` mapping | 6.4.0 | Apple floor macOS 15 / iOS 18 (read only) |
| https://docs.swift.org/compiler/documentation/diagnostics/ and https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/diagnostic-groups.md | compiler diagnostic groups index | 2026 | group names, `-Werror <group>` |
| https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/explicit-sendable-annotations.md | `ExplicitSendable` group | 2026 | three accepted statements |
| https://github.com/swiftlang/swift-package-manager/pull/10425 | SwiftPM review rejecting `@unchecked` on `Mutex`-only class | merged 2026-09-03 | maintainer practice, quoted |
| https://forums.swift.org/t/threadsanitizer-in-a-swift-concurrency-world/84801 | Linux TSan false positives with `Mutex` | 2026-02 | corroborates plant a finding |
| https://forums.swift.org/t/mainactor-assumeisolated-crashes-on-main-thread/80624 | `assumeIsolated` crash report (Apple runtime) | 2025-06 | unverified: read only |
| https://www.massicotte.org/blog/mainactor-by-default | default MainActor, recommends against | 2025-11-20 | strongest counter-position |
| https://massicotte.org/singletons/ | singletons with Swift concurrency | 2025-10-19 | ladder order `@MainActor` before locks |
| https://massicotte.org/actors/ | when to use an actor | 2025-09-06, updated 2026-05-27 | three conditions, "this is an actor because" |
| https://massicotte.org/blog/what-settings/ | which settings to enable | 2025-12-05 | NNBD "the only setting of consequence"; `InferIsolatedConformances` |
| https://www.massicotte.org/problematic-patterns | problematic concurrency patterns | 2024-10, updated 2026-04 | `MainActor.run`, detached, stateless actors |
| https://www.donnywals.com/should-you-opt-in-to-swift-6-2s-main-actor-isolation/ | MainActor isolation for apps and packages | 2025-09-11 | stale on the 6.4 template; app/UI vs networking split |
| https://www.donnywals.com/what-is-approachable-concurrency-in-xcode-26/ | Approachable Concurrency in a package | 2025 | the pre-6.4 manual setup |
| https://developer.apple.com/tutorials/data/documentation/synchronization/mutex.json | Apple platform availability for `Mutex` | 2026 | confirms macOS 15 / iOS 18 (read only) |
| exemplar corpus `~/.cache/research-lang/exemplars/swift/<owner>__<repo>` at the SHAs in `swift-audit/scratch/exemplar-shas.md` | 40 upstream repositories | 2026-10-10 | all repo@sha12 cites above |
| swift-audit/exemplar-concurrency.md ([conc]), swift-topic-map/failure.md ([fail]), swift-topic-map/practitioner.md ([prac]), swift-topic-map/shifts.md ([shift]) | earlier-wave audits and scouts | 2026-10-10 | counts and sample 1 this dive re-uses |

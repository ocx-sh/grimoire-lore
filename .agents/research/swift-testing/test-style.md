---
title: "Swift test style: framework per test kind, parallelism, sleeps, exit tests, CLI end-to-end, coverage and sanitizers"
topic: "swift / testing / test-style (SW-TEST, rows M-E-01..M-E-13)"
agent: w2-testing-test-style
model: sonnet
date_researched: 2026-10-10
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/test-style/
scope: >
  Covers which framework each kind of Swift test uses (Swift Testing vs XCTest), the XCTest interop modes by toolchain and tools version,
  shared-state isolation, `.serialized`, flake triage, sleeps and their replacements, time limits, exit tests, CLI end-to-end harnesses,
  coverage commands and gates, the Linux sanitizer leg, and the small M-E-07/08/09/13 rows (parameterized tests, init/deinit, require vs expect, skips).
  Linux only (swift:6.4 and swift:6.3 images): Apple-platform, Windows, Wasm and Android behaviour is marked "unverified: read only".
  Not covered: snapshot testing, mocking strategy, test target layout (M-E-14..16), benchmark libraries, XCUITest mechanics.
---

# Swift test style (2026-10-10, Swift 6.4 era)

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Framework per test kind](#1-framework-per-test-kind)
   2. [XCTest interop: modes, defaults, override](#2-xctest-interop-modes-defaults-override)
   3. [Parallelism, shared state and `.serialized`](#3-parallelism-shared-state-and-serialized)
   4. [Flaky-test triage: serial flags and repetition](#4-flaky-test-triage-serial-flags-and-repetition)
   5. [Sleeps and what replaces them](#5-sleeps-and-what-replaces-them)
   6. [Time limits](#6-time-limits)
   7. [Exit tests](#7-exit-tests)
   8. [CLI end-to-end tests](#8-cli-end-to-end-tests)
   9. [Coverage on Linux](#9-coverage-on-linux)
   10. [Sanitizers on Linux](#10-sanitizers-on-linux)
   11. [Parameterized tests, init/deinit, require vs expect, skips (M-E-07/08/09/13)](#11-parameterized-tests-initdeinit-require-vs-expect-skips)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

Conventions used below. Every `swift ...` command in this file was run through the fixture wrapper
`fixtures/test-style/run-in.sh <fixture> swift ...`, which executes `~/.cache/research-lang/swift-tools/run.sh` and appends
`--scratch-path "$SWIFT_SCRATCH/test-style/<fixture>-<toolchain>"` (expanded inside the container). "tc" is the toolchain image (6.4 default, `SWIFT_VERSION=6.3` for 6.3.3),
"tools" is the `swift-tools-version` of the fixture manifest. Exit codes are those of the `swift` process (or of the whole pipeline where stated).
Fixture names are directories under `fixtures/test-style/`; raw logs are in `fixtures/test-style/logs/`.

## Summary

- New unit, integration, async, crash (exit test) and CLI end-to-end tests are written in Swift Testing (`import Testing`); XCTest stays only for XCUITest and for suites that already exist. The 6.4 `swift package init` already emits Swift Testing (map conflict 3).
- XCTest interop is decided by toolchain AND manifest tools version: tc <6.4 = `none` (an `XCTAssertEqual(1, 2)` inside `@Test` passes silently, exit 0); tc 6.4 + tools <6.4 = `limited` (warning only, exit 0); tc 6.4 + tools >=6.4 = `complete` (error, exit 1). Observed on both images.
- `SWIFT_TESTING_XCTEST_INTEROP_MODE` overrides the default on a 6.4 toolchain (`none`/`limited` exit 0, `complete`/`strict` exit 1; `strict` dies with `Fatal error` and SIGILL); a 6.3 toolchain silently ignores the variable, so setting it in CI proves nothing unless the toolchain is also >=6.4.
- Do not call `XCTAssert*`/`XCTFail`/`XCTUnwrap`/`XCTSkip`/`XCTestExpectation` from Swift Testing tests or helpers; `throw XCTSkip` inside `@Test` is a failure on 6.4, and `XCTestExpectation` is documented as unsafe in Swift Testing.
- Swift Testing runs tests of different suites concurrently in one process; two `@Test`s sharing a `static var` fail (planted: exit 1 on 6.3 and 6.4). The fix is per-test instance state (struct suite `init`), not `.serialized`.
- `.serialized` only orders tests inside one suite or the cases of one parameterized test: `@Test(.serialized)` on a plain test does nothing, and two `@Suite(.serialized)` suites still race each other (both planted, exit 1 on 6.3 and 6.4).
- `swift test --no-parallel` serializes Swift Testing globally (race plant green, exit 0); `--num-workers 1` does NOT (still red); `--parallel` is XCTest's flag. Use `--no-parallel` as the first triage step for a suspected shared-state flake.
- `swift test --repeat-until fail --maximum-repetitions N` exists only from 6.4 (6.3 exits 64 "Unknown option"); it caught an intermittent race that 3 of 4 plain runs missed.
- No `Task.sleep`/`Thread.sleep`/`usleep` for synchronisation in tests: a sleep-guarded async test went green unpinned and red under `taskset -c 0` (exit 1); the `confirmation()` + `withCheckedContinuation` twin stayed green (exit 0). Inject a `Clock` for time-driven logic (a 30 s backoff tested in 1 ms).
- `confirmation()` only counts confirmations made before its closure returns; wrapping a fire-and-forget callback without awaiting it fails deterministically ("confirmed 0 times").
- `.timeLimit(.minutes(n))` rescues cancellation-aware waits (red after exactly 60.000 s) but NOT an uncancellable `withCheckedContinuation` or a blocked thread (hung >300 s). It is a backstop; CI also needs a job-level wall-clock timeout.
- Crash and precondition paths are tested with `await #expect(processExitsWith: .failure)` (Swift >=6.2; value capture via `[n]` needs >=6.3). They need `precondition`, not `assert`: `assert` vanishes in `-c release` and the exit test goes red; `precondition` survives `-c release` but its message does not reach stderr, and `-Ounchecked` removes it.
- Exit tests are available on macOS, Linux, FreeBSD, OpenBSD and Windows only; guard the file with `#if compiler(>=6.2) && (os(macOS) || os(Linux) || os(FreeBSD) || os(OpenBSD) || os(Windows))` as swift-nio does. iOS/WASI are unsupported (read only).
- CLI end-to-end tests run the built executable out of process and assert stdout, stderr and exit status separately. Redirect streams to temp files (or use `swift-subprocess` 1.0.0 with `.string(limit:)`): the `Pipe()` + `waitUntilExit()` + read shape used by swift-argument-parser deadlocks above the 64 KiB pipe buffer (planted: 1 MiB of stdout, killed by `timeout` at 110 s, exit 124).
- Coverage: `swift test --enable-code-coverage`, then `swift test --show-codecov-path` prints the JSON path (the path differs between 6.3 and 6.4, so never hard-code it). The JSON `totals` include test files and generated anchors (37.5 % vs 16.7 % for `Sources/` in the plant), so a gate must filter to `<root>/Sources/`. SwiftPM has no threshold flag; the gate is a `jq -e` expression.
- Sanitizer leg on Linux: `swift test --sanitize=thread` and `--sanitize=address` both work with Swift Testing, but `Synchronization.Mutex` is reported as a data race by TSan (false positive, 6.3 and 6.4), ASan reports ~400 bytes of libXCTest leaks on an empty package unless `ASAN_OPTIONS=detect_leaks=0` or `--disable-xctest`, and TSan needs `--security-opt seccomp=unconfined` under Docker on WSL2.
- Pre-release or invented exit-test spellings (`#expect(exitsWith:)`, `.crash`) fail to compile on 6.4, so `swift build --build-tests` is the cheap hallucination gate for test code.

## Findings

### 1. Framework per test kind

**Decision (binds the artifact set; map conflict 3).** By test kind:

| Test kind | Framework | Why / evidence |
|---|---|---|
| New unit and integration tests | Swift Testing | `swift package init` emits it in 6.4; corpus Testing share: servers 64.5 %, community libs 66.8 %, apps 92.4 %, Apple OCI tooling 100 % ([gates](../swift-audit/exemplar-quality-gates.md) Axis 2). |
| Async, callback and event tests | Swift Testing: `confirmation()` and `async` | The migration guide maps `XCTestExpectation` to `confirmation()` ([MigratingFromXCTest.md](https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/MigratingFromXCTest.md), "Validate asynchronous behaviour"); ST-0021 declines to make `XCTestExpectation`/`XCTWaiter` interoperate "They cannot be used safely in a Swift concurrency context" ([ST-0021](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0021-targeted-interoperability-swift-testing-and-xctest.md)). |
| Crash, `precondition`, `fatalError` tests | Swift Testing exit tests, `#expect(processExitsWith:)` | XCTest has no equivalent; Swift >=6.2 ([ST-0008](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0008-exit-tests.md)). 238 uses in 9 exemplar repos (gates 2b). |
| CLI end-to-end tests (run the built product) | Swift Testing plus an out-of-process harness | swift-argument-parser migrated its harness to a Swift Testing twin `requireExecuteCommand` and deprecated the XCTest one (`swift-argument-parser@efd239f0055b:Sources/ArgumentParserTestHelpers/TestHelpers+SwiftTesting.swift:233`, `TestHelpers.swift:325-330`). |
| Existing XCTest suites | Leave in XCTest; do not rewrite for its own sake | Mixed trees are normal: 23 repos import both, 68 files in 12 repos import both (map conflict 3; gates 2a). Interop (finding 2) makes shared helpers safe. |
| XCUITest | XCTest (Apple only; unverified: read only) | `XCUIApplication` is XCTest API; 30 uses in 2 repos, element-x-ios 29 (gates 2b). |
| Performance `measure {}` | XCTest on Apple per the map; unverified: read only | Counter-example: Nuke has 0 `import XCTest` files and 153 `import Testing` files and replaced `measure {}` with a hand-written `ContinuousClock` helper (`Nuke@d5548dd61395:Tests/NukePerformanceTests/Measure.swift:16-27`). |

The map's wording "Nuke (a mixed tree)" does not survive re-measurement: `grep -rl 'import XCTest' Tests` finds 0 files, `grep -rl 'import Testing' Tests` finds 153, 2,506 `@Test` and 1 `func test` (Nuke@d5548dd61395).
Core-library age, not vendor, predicts the split (gates 2a: swift-crypto, protobuf, nio, collections are XCTest-first; log, tracing, argument-parser, foundation are Testing-first).

### 2. XCTest interop: modes, defaults, override

ST-0021 is **Implemented (Swift 6.4)** and was amended in April 2026 to change the definition of the limited mode ([ST-0021](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0021-targeted-interoperability-swift-testing-and-xctest.md) header; amendment accepted 2026-05-04 by the review manager Rachel Brindle, [forum](https://forums.swift.org/t/amended-st-0021-targeted-interoperability-between-swift-testing-and-xctest/86479)).
The release post says "You can now safely use `XCTAssert` in Swift Testing tests or `#expect` within XCTests" ([swift.org 6.4](https://www.swift.org/blog/swift-6.4-released/)).

Documented defaults ([MigratingFromXCTest.md, "Select an interoperability mode"](https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/MigratingFromXCTest.md)):

| Toolchain | `swift-tools-version` | Default mode |
|---|---|---|
| <6.4 | any | `none` |
| >=6.4 | <6.4 | `limited` |
| >=6.4 | >=6.4 | `complete` |

Override: environment variable `SWIFT_TESTING_XCTEST_INTEROP_MODE` = `none | limited | complete | strict` (`Documentation/EnvironmentVariables.md:68` at `swift-testing@c7d68ca20cd7`).

**Measured on Linux** (fixtures `interop-st-t63`, `interop-st-t64`: one `@Test` that calls a helper doing `XCTAssertEqual(1, 2, "helper mismatch")`; `interop-t63`/`interop-t64` add an `XCTestCase` that calls `#expect(1 == 2)`):

| tc | tools | env | result for `XCTAssert` in `@Test` | exit |
|---|---|---|---|---|
| 6.3.3 | 6.3 | - | passes silently, no message (`none`) | 0 |
| 6.3.3 | 6.4 | - | manifest rejected: `package 'interop-t64' is using Swift tools version 6.4.0 but the installed version is 6.3.3` | 1 |
| 6.4 | 6.3 | - | `limited`: two warnings, `passed after 0.001 seconds with 2 warnings` | 0 |
| 6.4 | 6.4 | - | `complete`: `✘ ... recorded an issue` plus warning `Replace XCTest API such as 'XCTAssert' with a Swift Testing equivalent such as '#expect'` | 1 |
| 6.4 | 6.3 | `none` | silent pass | 0 |
| 6.4 | 6.3 | `limited` | warnings only | 0 |
| 6.4 | 6.3 | `complete` | failure | 1 |
| 6.4 | 6.3 and 6.4 | `strict` | `Fatal error: Replace XCTest API ... This is a fatal error because strict interop mode is active`, `Program crashed: Illegal instruction` | 1 |
| 6.4 | 6.3 and 6.4 | `bogus` | behaves like `limited` (two warnings, exit 0) | 0 |
| 6.3.3 | 6.3 | `complete` | variable ignored, silent pass | 0 |

Three points follow from the table. (1) The proposal's table says an empty or invalid value means `complete`; 6.4.0 as shipped treats an invalid value as `limited` (observed on both manifests), so never rely on an invalid or empty value. (2) `#expect` inside an `XCTestCase` is an error on a 6.4 toolchain regardless of tools version (`error: LegacyTests.testExpectInsideXCTest : Expectation failed` in `tc6.4-tools63`), and silently ignored on 6.3.3. (3) `throw XCTSkip` is a plain failure inside `@Test` ("Caught error: XCTSkip(...)", exit 1), by ST-0021 design; `XCTestExpectation` + `XCTWaiter` happened to pass in a trivial plant but are documented as unsafe, so the interop gap is not detectable by running them.

Release/CI consequence: a repo on `swift-tools-version` 6.2 or 6.3 that builds on a 6.4 toolchain gets `limited`, which turns every lingering `XCTAssert` in a Swift Testing test into a warning that CI does not fail on. Setting `SWIFT_TESTING_XCTEST_INTEROP_MODE=complete` (later `strict`) is the explicit fix, and it is only meaningful when the toolchain is >=6.4 (row 6.3.3 above). Xcode behaves differently and is read only here: the shifts scout records that Xcode 26.4 turned interop off by default and Xcode 27 reports cross-framework failures as warnings ([shifts](../swift-topic-map/shifts.md) line 267; unverified: read only).

### 3. Parallelism, shared state and `.serialized`

Swift Testing "tests generally all run in the same process" and run in parallel by default; `.serialized` applies to a suite or a parameterized test, "recursively", and "doesn't affect the execution of a test relative to its peers or to unrelated tests" ([Parallelization.md](https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/Parallelization.md)). ST-0003 adds "If applied to just a test this trait does not have any effect" for non-parameterized tests ([ST-0003](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0003-make-serialized-trait-api.md)).

Plants (all `tools 6.2`, two tests that each reset and increment `Shared.counter` 2000 times with `await Task.yield()` and `#expect(Shared.counter == 2000)`):

| Fixture | Shape | tc 6.4 | tc 6.3 |
|---|---|---|---|
| `shared-red` | two `@Test`s, `nonisolated(unsafe) static var counter` | exit 1 (`Shared.counter → 3974`) | exit 1 |
| `shared-serialized` | same two tests inside one `@Suite(.serialized)` | exit 0 | exit 0 |
| `shared-instance` | `@Suite struct` with `var counter = Counter()` and `mutating` tests (fresh instance per `@Test`) | exit 0 | exit 0 |
| `shared-serialized-pertest` | `@Test(.serialized)` on each of the two plain tests | exit 1 | exit 1 |
| `shared-serialized-split` | test A in `@Suite(.serialized) struct A`, test B in `@Suite(.serialized) struct B` | exit 1 | exit 1 |

Correct and incorrect shapes:

```swift
// WRONG: global mutable state shared by tests that run concurrently
enum Shared { nonisolated(unsafe) static var counter = 0 }
@Test func first() async { Shared.counter = 0; /* ... */ #expect(Shared.counter == 2000) }

// WRONG: no effect on a non-parameterized test
@Test(.serialized) func first() async { /* ... */ }

// WRONG: serializes inside each suite only; A and B still run concurrently
@Suite(.serialized) struct A { @Test func bumps() async { /* touches Shared */ } }
@Suite(.serialized) struct B { @Test func bumps() async { /* touches Shared */ } }

// RIGHT: state belongs to the test (a fresh suite instance per @Test)
@Suite struct OwnStateTests {
    var counter = Counter()
    @Test mutating func firstBumps() async { /* ... */ }
}

// RIGHT when the state really is process-global (a file, an env var): ONE suite owns every test touching it
@Suite(.serialized) struct SharedCounterTests { @Test func firstBumps() async { } @Test func secondBumps() async { } }
```

Experimental knobs exist and must not be used by fleet code. `Trait/serialized(for:)` is `@_spi(Experimental)` (`swift-testing@c7d68ca20cd7:Sources/Testing/Traits/ParallelizationTrait.swift:47`, TODO to document it at `:17`; swift-testing uses `.serialized(for: \Environment.self)` in its own tests, `Tests/TestingTests/Support/EnvironmentTests.swift:14`). `SWT_EXPERIMENTAL_SERIALIZED_TRAIT_APPLIES_GLOBALLY` (`ParallelizationTrait.swift:211`, `EnvironmentVariables.md:69`) did not turn the split-suites plant green (`=1` and `=true`, both exit 1). `SWT_EXPERIMENTAL_MAXIMUM_PARALLELIZATION_WIDTH=1` did (exit 0 on `shared-red`), but the document states "This document is not an API contract" (`EnvironmentVariables.md`).

Nuke documents the same fact from the field: "`.serialized` only orders the tests within a suite, so the NukePerformanceTests scheme turns parallel execution off for the whole target" (`Nuke@d5548dd61395:Tests/NukePerformanceTests/Measure.swift:6-8`). apple/container names its serialized integration files `*Serial.swift` and puts `@Suite(.serialized)` on each (`container@f70ecbb926d9:Tests/IntegrationTests/Machine/TestCLIMachineRuntimeSerial.swift:24`).

### 4. Flaky-test triage: serial flags and repetition

`swift test --help` on 6.4 lists (6.3.3 lacks the last two; `Unknown option '--repeat-until'`, exit 64):

```
--parallel/--no-parallel   Determines whether tests run in parallel. (default: --no-parallel)
--num-workers <n>          The number of tests to execute in parallel.
--maximum-repetitions <n>  The maximum number of times each test will repeat. Only supported for Swift Testing test suites.   (6.4+)
--repeat-until <pass|fail> The condition upon which to stop repeating a test. Only supported for Swift Testing test suites.   (6.4+)
```

ST-0024 (Implemented 6.4) makes repetition per test case, not per run: only the test cases that meet the condition are repeated; `swift test` accepts `--maximum-repetitions` and `--repeat-until`, the Swift Testing entrypoint itself uses `--repetitions` ([ST-0024](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0024-per-test-case-repetitions.md)).

Measured behaviour on the race plants:

| Command | Fixture | Result |
|---|---|---|
| `swift test` (no flag) | `shared-red` | exit 1 (Swift Testing is parallel by default even though `--help` says `--no-parallel`) |
| `swift test --no-parallel` | `shared-red` | exit 0 three times in a row, and on tc 6.3 (exit 0) |
| `swift test --parallel` | `shared-red` | exit 1 |
| `swift test --num-workers 1` | `shared-red` | exit 1 (no effect on Swift Testing) |
| `swift test --no-parallel` | `shared-serialized-split` | exit 0 |
| `swift test` x4 | `shared-flaky` (300-iteration loops, no yield) | exit 0, 0, 0, 1: an intermittent race |
| `swift test --repeat-until fail --maximum-repetitions 200` | `shared-flaky` | exit 1 |
| `swift test --repeat-until fail --maximum-repetitions 50` | `shared-serialized` (compliant) | exit 0 (0.849 s against 0.03 s: it did repeat) |

So the triage order is: (1) rerun with `--no-parallel`: green means the failure is test-to-test interference through shared state; (2) `--repeat-until fail --maximum-repetitions N` on the suspect with `--filter` to expose an intermittent failure on 6.4+; (3) fix the isolation, never keep `--no-parallel` as the answer. Wide use in the corpus is rare and deliberate: SwiftLint (`swift test --no-parallel`, `SwiftLint@ec4691d9e813:.github/workflows/test.yml:94`, `Makefile:57`) and swift-build (`swift test --no-parallel`, `swift-build@2187330e13e7:.github/workflows/pull_request.yml:23`); no exemplar workflow uses `--repeat-until` (all 40 are on pre-6.4 CI or never adopted it).

### 5. Sleeps and what replaces them

Sleeps are common even in Apple repos: across 40 exemplars 5,113 files sit under `Tests`-named directories; 235 of them contain 638 lines matching `.sleep(`, `usleep(` or `nanosleep(` (own measurement, 2026-10-10; 375 of the lines are in files importing Testing, 281 in files importing XCTest). Examples: `swift-package-manager@5546f44a3b52:Tests/PackageCollectionsTests/TrieTests.swift:206`, `containerization@3e7bc39e66b3:Tests/ContainerizationOSTests/BidirectionalRelayTests.swift:287` (a 3 s sleep), `hummingbird@1bd3b407fb47:Tests/HummingbirdCoreTests/CoreTests.swift:126`, `swift-aws-lambda-runtime@8abd464310c7:Tests/AWSLambdaRuntimeTests/LocalServerPoolCancellationTests.swift:67`, `swift-nio@e12881f2a691:Tests/NIOCoreTests/AsyncChannel/AsyncChannelTests.swift:230`. A fraction are legitimate (simulating slow work in a fake), so the ban is on sleeps used as synchronisation, and the grep (rule SW-TEST-07) is a review trigger, not an auto-fail. The corpus therefore does not satisfy the rule; the rule rests on the plant and on the field reports below.

Field reports: raska.io (2026-09-21) states that sleep-based tests are not deterministic under load, "Every sleep also makes the suite slower", and that "even the latest models" generate `Task.sleep(for:)` or polling unless shown spies ([raska.io](https://raska.io/blog/testing-concurrent-code/)); Point-Free's 2023 post on `withMainSerialExecutor` is the XCTest-era deterministic approach ([pointfree 110](https://www.pointfree.co/blog/posts/110-reliably-testing-async-code-in-swift); XCTest, Swift 5.5 era, not re-verified on 6.4).

**Plant (b).** `Worker.start(onDone:)` spawns 8 `Thread`s each doing ~80 ms of CPU work and calls `onDone` after the last one (about 100 ms wall on a multi-core box, about 640 ms on one core).

```swift
// RED: guess how long the work takes
@Test func workerFinishes() async throws {
    let done = Mutex(false)
    Worker().start { done.withLock { $0 = true } }
    try await Task.sleep(for: .milliseconds(300))
    #expect(done.withLock { $0 })
}

// GREEN: wait for the event itself
@Test func workerFinishes() async {
    await confirmation("worker reports completion") { done in
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            Worker().start { done(); cont.resume() }
        }
    }
}
```

Results (`taskset -c 0 swift test --skip-build`, build done unpinned first): `sleep-red` unpinned exit 0 (0.300 s), pinned run1/2/3 exit 1 (`Expectation failed: done.withLock { $0 }`, "failed after 0.329 seconds"); `sleep-confirm` unpinned exit 0, pinned run1/2/3 exit 0 (0.63-0.76 s, it simply waited). Same on tc 6.3 (pinned red exit 1, twin exit 0). The first attempts at this plant taught two traps that make load tests lie: if the work runs on the cooperative pool (`Task`/`TaskGroup`) or on `DispatchQueue.global()`, the `Task.sleep` wake-up itself is starved on one CPU and the sleep returns only after the work is done, so the test goes green under load (observed: sleep resumed at 0.613 s for a 0.300 s request); real threads were needed to reproduce the flake. Treat that as an observation, not a diagnosis.

**`confirmation()` pitfall.** The closure must not return before the event; `confirmation` counts only confirmations made inside it. Fire-and-forget fails deterministically on both toolchains:

```swift
await confirmation("done") { done in
    Worker().start { done() }          // returns at once -> "Confirmation was confirmed 0 times, but expected to be confirmed 1 time"
}
```

(`confirm-misuse`, exit 1 on 6.4 and 6.3.) A completion callback therefore needs the `withCheckedContinuation` bridge above (or an `AsyncStream` consumed inside the closure); a pure `async` API needs no confirmation at all ([testing-asynchronous-code.md](https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/testing-asynchronous-code.md): "Mark your test function as `async` and ... `await`"). `confirmation(expectedCount: 0)` asserts that something does not happen; ranges such as `1...` assert "at least once" (same page).

**Injected clock (time-driven logic).** `retry(attempts:backoff:clock:operation:)` takes `some Clock`; the test passes an `ImmediateClock` whose `sleep(until:tolerance:)` returns at once and records the requested time. `sleep-clock` asserts a 3-attempt retry with a 30 s backoff requested 60 s in total and finished in 0.001 s (exit 0 on 6.4 and 6.3). The stdlib has no test clock; the 20-line `ImmediateClock` is the minimum, and it must be a `final class` (a `Mutex` stored property makes a struct non-copyable). Point-Free's swift-clocks is the packaged alternative (not evaluated here).

### 6. Time limits

`@Test(.timeLimit(.minutes(n)))` has minute granularity ([ST-0004](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0004-constrain-the-granularity-of-test-time-limit-durations.md); `TimeLimitTrait.swift` message "Time limit must be specified in minutes"). Implementation: `withTimeLimit` races the body against a timer in a task group and cancels the body (`swift-testing@c7d68ca20cd7:Sources/Testing/Traits/TimeLimitTrait.swift:273-294`).

| Fixture | Body | tc 6.4 result |
|---|---|---|
| `timelimit-cancellable` | `try await Task.sleep(for: .seconds(3600))` | exit 1 at 60.000 s: `Time limit was exceeded: 60.000 seconds` (`real 1:04`) |
| `timelimit-async` | `await withCheckedContinuation { _ in }` that never resumes | no result in 300 s; killed by `timeout 300`, exit 124 |
| `cli-flood-pipe` | blocking `waitUntilExit()` in a synchronous test, `.timeLimit(.minutes(1))` | no result in 110 s; killed by `timeout 110`, exit 124 |

Because the task group waits for the cancelled body to finish, a body that cannot observe cancellation hangs the run despite the trait. Every end-to-end or async-heavy test gets a `.timeLimit`, the code under test must use cancellation-aware waits (`Task.sleep`, `AsyncStream`, `withTaskCancellationHandler`), and the CI job carries its own wall-clock timeout (`timeout-minutes:` in the workflow; unverified: not run here).

### 7. Exit tests

API (Swift >=6.2, [ST-0008](https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0008-exit-tests.md); [exit-testing.md](https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/exit-testing.md)):

```swift
await #expect(processExitsWith: .failure) { _ = positive(0) }                       // macro is async: it needs await
let r = await #expect(processExitsWith: .failure, observing: [\.standardErrorContent]) { _ = positive(0) }
await #expect(processExitsWith: .success) { _ = positive(5) }
// Conditions: .success, .failure, .exitCode(_:), .signal(_:); #require(processExitsWith:) returns the result
@Test(arguments: [0, -1, Int.min])
func nonPositiveTraps(_ n: Int) async { await #expect(processExitsWith: .failure) { [n] in _ = positive(n) } }   // capture list: Swift >=6.3, ST-0012
```

Platforms: "Exit tests are available on macOS, Linux, FreeBSD, OpenBSD, and Windows" (exit-testing.md; ST-0008 lists iOS/WASI as future work and says Android "is an ongoing area of research"). Where unsupported the macros are `unavailable` with the message "Exit tests are not available on this platform." and `SWT_NO_EXIT_TESTS` is not visible to test targets, so the guard is written by hand: swift-nio uses `#if compiler(>=6.2) && (os(macOS) || os(Linux) || os(FreeBSD) || os(OpenBSD) || os(Windows))` around the whole suite (`swift-nio@e12881f2a691:Tests/NIOCoreTests/ByteBufferCrashTests.swift:21`), swift-foundation defines a package-level `FOUNDATION_EXIT_TESTS` for `[.macOS, .linux, .openbsd, .windows]` (`swift-foundation@aadd9259be07:Package.swift:92`). Linux is the only verified row; the rest is unverified: read only.

Capture rules (ST-0012 / exit-testing.md): only values listed in the closure capture list cross the process boundary, they must be `Sendable & Codable`, and non-parameter values need `as` (`[food = food as Food]`); the body runs in a fresh child process "as its `main()`", so no test state is shared and an exit test cannot nest.

**Plant (c)** (`exit-red`, `exit-green`, tools 6.2; `positive(_:)` calls `precondition(n > 0, "n must be positive")`):

| Fixture / command | tc 6.4 | tc 6.3 |
|---|---|---|
| `exit-red`: body calls `positive(5)` (does not trap) but expects `.failure`; `swift test` | exit 1: `expected exit status ".failure", but ".exitCode(EXIT_SUCCESS)" was reported instead` | exit 1 |
| `exit-green`: 3 parameterized traps, one `.success`, one `observing: [\.standardErrorContent]` that finds `n must be positive`; `swift test` | exit 0 (4 tests) | exit 0 |
| `exit-green`: `swift test -c release` | exit 1, only the stderr-message test fails (stderr is empty in release) | not run |
| `exit-green`: `swift test -c release -Xswiftc -Ounchecked` | exit 1: `precondition` removed, `.exitCode(EXIT_SUCCESS)` | not run |
| `exit-assert` (same tests, `assert(n > 0)` instead of `precondition`): `swift test` | exit 0 | not run |
| `exit-assert`: `swift test -c release` | exit 1 (`assert` compiled out, all trap tests fail) | not run |

Consequences. (1) Test contracts guarded by `precondition`, not `assert`, or run the exit tests only in debug. (2) Do not assert on the trap message text; it is stderr content in debug and absent in release. (3) Prefer `.failure` over a specific signal: the trap signal differs per architecture (SIGILL on x86_64, SIGTRAP on arm64 is the usual mapping; not pinned in the plant). (4) Add a `swift test -c release` leg if release-only behaviour matters (assert stripped, preconditions kept). (5) Hallucinated spellings fail to compile on 6.4 (`halluc`: `#expect(exitsWith: .failure)` gives `type 'Bool' has no member 'failure'` plus `extra trailing closure passed in macro expansion`; `.crash` gives `type 'ExitTest.Condition' has no member 'crash'`; a missing `await` gives `'async' call in a function that does not support concurrency`; exit 1).

### 8. CLI end-to-end tests

The rule from the Rust `cli-contract` carries over: a CLI end-to-end test runs the built executable and checks stdout, stderr and the exit status as three separate facts. The exemplar harness is Pipe-based: `swift-argument-parser@efd239f0055b:Sources/ArgumentParserTestHelpers/TestHelpers.swift:401-428` (XCTest) and its Swift Testing twin `TestHelpers+SwiftTesting.swift:233-281`. Both create `Pipe()`s (`:256-259`), call `process.waitUntilExit()` (`:275`) and only then `readDataToEndOfFile()` (`:277-281`), concatenate `errorActual + outputActual` for the comparison (`TestHelpers.swift:433`, `TestHelpers+SwiftTesting.swift:285-287`), and `#if os(Windows) return ""` (`+SwiftTesting.swift:240-241`) which makes every end-to-end test on Windows a vacuous pass (unverified: read only). The executable is located next to the test bundle: `Bundle(for: _BundleMarker.self).bundleURL`, stripping `.xctest` (`:17-24`).

**Plant (d).** `cli-green` is a `mycli greet NAME` (stdout `hello NAME`, exit 0; `greet` without NAME prints `error: missing NAME` to stderr and exits 64); `cli-red` has the classic bug (error text on stdout, exit 0). The test target has no dependency on the executable target: `swift test` still builds it, and the harness finds it beside the test binary via `CommandLine.arguments[0]`.

```swift
func runCLI(_ args: [String]) throws -> CLIResult {
    let exe = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().appendingPathComponent("mycli")
    guard FileManager.default.isExecutableFile(atPath: exe.path) else { throw CLIError.executableNotFound(exe.path) }
    // stdout/stderr -> temp files: no pipe buffer, no deadlock, streams stay separate
    let p = Process(); p.executableURL = exe; p.arguments = args
    p.standardOutput = try FileHandle(forWritingTo: outURL); p.standardError = try FileHandle(forWritingTo: errURL)
    try p.run(); p.waitUntilExit()
    return CLIResult(stdout: ..., stderr: ..., status: p.terminationStatus)
}
@Test func missingNameIsAUsageErrorOnStderr() throws {
    let r = try runCLI(["greet"])
    #expect(r.stdout.isEmpty); #expect(r.stderr.contains("missing NAME")); #expect(r.status == 64)
}
```

Alternative with a dependency: swift-subprocess 1.0.0 (`.package(url: "https://github.com/swiftlang/swift-subprocess", exact: "1.0.0")` plus `swift-system` product `SystemPackage` for `FilePath`):

```swift
let r = try await run(.path(mycli), arguments: ["greet"], output: .string(limit: 64 * 1024), error: .string(limit: 64 * 1024))
#expect(r.standardOutput == ""); #expect(r.standardError.contains("missing NAME")); #expect(r.terminationStatus == .exited(64))
```

(`cli-subprocess`: tc 6.4 and 6.3 exit 0; `cli-subprocess-red` against the buggy CLI exit 1 with 3 issues. In 1.0.0 `standardOutput` and `standardError` are non-optional `String` for `.string(limit:)`; the README comment shows `Optional("...")`, and `r.standardError?.contains(...)` failed to compile with `cannot use optional chaining on non-optional value`.) swiftly pins `exact: "1.0.0"` (`swiftly@c8cf2e35bfca:Package.swift:34`), element-x-ios `.upToNextMinor(from: "0.3.0")` (`element-x-ios@14e33866ced2:Package.swift:11`), tuist `exact: "0.4.0"` (`tuist@2f6ac74754bf:Package.swift:1991`). The Q4 default (SDK depends on stdlib + swift-subprocess) makes it the natural choice for the fleet's own CLI tests; plain `Process` with temp files is the zero-dependency fallback.

Results: `cli-green` exit 0 / `cli-red` exit 1 on tc 6.4 and 6.3 (red: `Expectation failed: r.stdout.isEmpty`, `r.stderr.contains("missing NAME")`, `r.status == 64`, 3 issues). Pipe-after-wait deadlock: `cli-flood-pipe` (child writes 1 MiB to stdout) hung until `timeout 110` (exit 124), twin `cli-flood-file` passed in 0.007 s (exit 0 on 6.4 and 6.3). Locating the product through `CommandLine.arguments[0]` works under both build engines (6.3 native: `.build/x86_64-unknown-linux-gnu/debug/`, 6.4 Swift Build: `.build/out/Products/Debug-linux-x86_64/`). Apple (`.xctest` bundle layout, `Bundle(for:)`) and Windows (`.exe`) are unverified: read only; `CommandLine.executablePath` does not exist in 6.4 (frame corrections) so do not use it.

apple/container separates unit and integration targets and drives its CLI through an `f.run([...]).check()` fixture (`container@f70ecbb926d9:Tests/IntegrationTests/Containers/TestCLIExecCommand.swift:58`); its coverage Makefile excludes them with `--skip TestCLI --skip IntegrationTests` (`Makefile:387`), the usual pattern for slow end-to-end suites.

### 9. Coverage on Linux

Commands (flags verified in `swift test --help` on 6.3 and 6.4):

```
swift test --enable-code-coverage                 # writes <scratch>/.../codecov/<Package>.json and default.profdata
swift test --show-codecov-path                    # prints the JSON path; does not run tests, file exists only after a coverage run
```

Path by engine: tc 6.4 (Swift Build) `<scratch>/out/Products/Debug-linux-x86_64/codecov/Fx.json`; tc 6.3 (native) `<scratch>/x86_64-unknown-linux-gnu/debug/codecov/Fx.json`. The file is `llvm.coverage.json.export` version 3.0.1 (6.4); `swift test --show-codecov-path` is the stable accessor. With only Swift Testing tests the run also emits `Swift Testing...profraw` and an empty-XCTest `XCTest...profraw`.

`.data[0].totals` is not a library coverage number: it counts the test target and generated files. Plant `cov` (one covered and one uncovered function): `totals.lines.percent` = 37.5 while `Sources/` alone is 16.7 (1 of 6 lines); `files[]` contained `.../LibTests-p.build/DerivedSources/test_anchor.swift` (6.4) and `Tests/LibTests/T.swift`. The gate therefore filters by file prefix. SwiftPM has no `--coverage-threshold`; `llvm-cov` and `jq` are not in the swift image (`jq` and `python3` are on the host, `llvm-cov` is in the image). Gate (run through `gate.sh`):

```
swift test --enable-code-coverage
swift test --show-codecov-path | xargs -r jq -e --arg root "$PWD" --argjson min 90 '[.data[0].files[] | select(.filename | startswith($root + "/Sources/"))] | ((map(.summary.lines.covered) | add) / (map(.summary.lines.count) | add) * 100) as $pct | ($pct >= $min)'
```

`jq -e` exits 1 on `false`; through `xargs -r` that becomes exit 123. Measured: `cov` (16.7 %) against 90 prints `false`, exit 123; `cov-full` (all branches) prints `true`, exit 0; `cov` against 10 prints `true`, exit 0; identical on tc 6.3. Using `startswith($root + "/Sources/")` rather than `contains("/Sources/")` keeps dependency checkouts (which also have `Sources/` directories) out of the number. Exemplars: apple/container `--enable-code-coverage -Xswiftc -DCONTAINER_COVERAGE` (`container@f70ecbb926d9:Makefile:368`), containerization (`containerization@3e7bc39e66b3:Makefile:407`), hummingbird CI (`hummingbird@1bd3b407fb47:.github/workflows/ci.yml:56`); only 3 of 40 repos run coverage in a script or workflow and none enforces a threshold (own grep over workflows, Makefiles and scripts).

### 10. Sanitizers on Linux

`swift test --sanitize=<address|thread|undefined|scudo|fuzzer>` (help text, 6.4 and 6.3). The swift-protobuf matrix is the corpus precedent: `address` and `thread`, `debug` and `release`, `swift:6.3`, with the comment "Looks like 6.4 is failing for some reason" (`swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:148-176`, comment at `:157-159`).

Plants (tools 6.2, a `Counter` hit by 8 tasks x 1000 `bump()`s; the test asserts only `c.value > 0`, so only a sanitizer can see the race):

| Fixture (the Counter) | `swift test` | `--sanitize=thread` (tc 6.4 / 6.3) |
|---|---|---|
| `tsan-red`: `@unchecked Sendable` class, plain `n += 1` | exit 0 | exit 1 / exit 1: `WARNING: ThreadSanitizer: Swift access race`, `SUMMARY: ThreadSanitizer: data race ... Lib.swift:4:28 in $s3Lib7CounterC4bumpyyF` |
| `tsan-actor`: `actor Counter` | exit 0 | exit 0 |
| `tsan-nslock`: `@unchecked Sendable` + `NSLock` | exit 0 | exit 0 |
| `tsan-green`: `Sendable` class with `Synchronization.Mutex<Int>` | exit 0 | exit 1 / exit 1: **false positive**, `Swift access race ... bump()` at the `withLock` closure |

So the TSan leg works with Swift Testing on Linux (tests run, report, nonzero exit) but flags correct `Mutex` code. Hypothesis, not verified: the `Synchronization` module is not TSan-instrumented, so the lock's atomics create no happens-before edge. Practical consequence: a TSan leg is only usable on a codebase that protects state with actors, `NSLock`, `pthread` or `DispatchQueue`, or it needs a suppression file (not evaluated). This interacts with concurrency-set guidance that prefers `Mutex` over `@unchecked Sendable`.

Environment note (research host only): under Docker on WSL2 every TSan run died with `FATAL: ThreadSanitizer: encountered an incompatible memory layout but was unable to disable ASLR` (12 of 12 runs, exit 1, red and green alike) until the container was started with `--security-opt seccomp=unconfined` (`fixtures/test-style/run-tsan.sh`, a copy of `run.sh` plus that flag). A sanitizer verification that cannot tell the twin from the violation is not a verification; check the log for `FATAL` before trusting an exit code.

ASan: `asan-red` (read one past the end of a heap buffer) is `swift test` exit 0 and `swift test --sanitize=address --disable-xctest` exit 1 (`ERROR: AddressSanitizer: heap-buffer-overflow ... Lib.swift:4:14`). On a clean package (`shared-instance`) `--sanitize=address` is already exit 1 on both toolchains: `ERROR: LeakSanitizer: detected memory leaks`, `SUMMARY: AddressSanitizer: 432 byte(s) leaked in 7 allocation(s)` (6.4; 368 bytes/6 on 6.3), allocated from `XCTest.XCTestSuiteRun`. Either `ASAN_OPTIONS=detect_leaks=0` (exit 0; swift-protobuf does exactly this, `build.yml:170-175`, citing a Linux Swift issue) or `--disable-xctest` for a Swift-Testing-only package (exit 0) removes it. `--sanitize=undefined` was exit 0 on the clean package.

### 11. Parameterized tests, init/deinit, require vs expect, skips

All from the `misc` fixture (tc 6.4, exit 1 by design, output lines quoted):

- **Arguments (M-E-07).** `@Test(arguments: [1, 2, 3], ["a", "b"])` ran `with 6 test cases` (Cartesian product); `@Test(arguments: zip([1, 2, 3], ["a", "b", "c"]))` ran `with 3 test cases`. Use `zip` for paired inputs. 1,478 `@Test(arguments:)` in 28 exemplar repos (gates 2b); swift-testing's own docs treat each case as an independent test, and capture of the case in an exit test needs the `[arg]` list (finding 7).
- **setUp/tearDown (M-E-08).** `init()` replaces `setUp()`, `deinit` replaces `tearDown()`; each `@Test` gets a fresh instance of the suite type. `deinit` exists only on classes/actors and "cannot be asynchronous or throwing, unlike `tearDown()`" ([MigratingFromXCTest.md](https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/MigratingFromXCTest.md)); for async cleanup use a scoping trait (`TestScoping`, 6.1+, ST-0007; not run here).
- **require vs expect (M-E-09).** `#expect` records and continues (`expectContinues` recorded 2 issues, "first" and "second"); `try #require(x)` throws and stops (`requireStops` recorded `Expectation failed: x`, `needs a value` and never reached the next line). `try #require(optional)` replaces `XCTUnwrap`.
- **Skips (M-E-13).** `@Test(.enabled(if: cond, "reason"))` is reported as `➜ Test runtimeGated() skipped: "needs NO_SUCH_VAR"`; code under `#if os(Windows)` is absent from every other platform's report. Use traits for runtime conditions (visible skips) and `#if` only where the code does not compile (exit tests, platform APIs). 65 `.enabled(if:)` and 107 `.disabled` in the corpus (gates 2b).

## Normative guidance candidates

Each rule lists the verification, whether it was RUN against a planted violation (fixture under `fixtures/test-style/`), and the result. Greps print the violation; empty output is a pass (a grep with no match exits 1, `xargs -r` over no match exits 123). "RUN yes" means the red/green pair is in Verification runs.

**SW-TEST-01. New tests are Swift Testing.** A diff must not add a test file that imports XCTest (UI test directories excepted); existing XCTest files are not rewritten for their own sake.
Rationale: 6.4 init emits Swift Testing, XCTest has no exit tests/`confirmation`, interop makes mixed trees safe.
Verify: `git diff --name-only --diff-filter=A origin/main...HEAD -- 'Tests/*.swift' ':(exclude)Tests/*UITests/*' | xargs -r grep -l -e 'import XCTest'` (output = added XCTest files; empty = pass). Whole-tree inventory: `grep -rln -e 'import XCTest' --include='*.swift' Tests/`.
RUN: yes (`xctest-diff`, branches `red`/`green`; whole-tree grep on `interop-t64`/`shared-instance`).

**SW-TEST-02. No XCTest assertions, skips or expectations inside Swift Testing code.** In files that `import Testing`, replace `XCTAssert*` with `#expect`, `XCTUnwrap` with `try #require`, `XCTFail` with `Issue.record`, `XCTSkip` with `.enabled(if:)`/`Test.cancel`, `XCTestExpectation`/`XCTWaiter` with `confirmation()` or plain `await`.
Rationale: `throw XCTSkip` is a failure in `@Test`; `XCTestExpectation` is unsupported; `XCTAssert` is a warning, not an error, under `limited`.
Verify: `grep -rl -e 'import Testing' Tests/ | xargs -r grep -n -e 'XCTAssert' -e 'XCTFail' -e 'XCTUnwrap' -e 'XCTExpectFailure' -e 'XCTSkip'` and `grep -rl -e 'import Testing' Tests/ | xargs -r grep -n -e 'XCTestExpectation' -e 'XCTWaiter' -e 'wait(for:'`. Limit: a helper file that imports only XCTest is invisible to the grep; SW-TEST-03 catches it at run time.
RUN: yes (`interop-st-t64` red, 2 lines; `interop-skip` red, 2 lines; `shared-instance` green).

**SW-TEST-03. Pin the interop mode in CI and require a >=6.4 toolchain for the leg that proves it.** Test jobs on a 6.4 toolchain run `env SWIFT_TESTING_XCTEST_INTEROP_MODE=complete swift test` (target `strict` once no XCTest API remains in Swift Testing code); manifests that want `complete` by default carry `swift-tools-version: 6.4`. Never set the variable on a <6.4 toolchain as the only gate.
Rationale: tc 6.4 + tools <6.4 is `limited` (warnings, exit 0); tc <6.4 ignores the variable (exit 0).
Verify: `swift test` with the variable set on a fixture containing a stray `XCTAssert` in an `@Test` must exit nonzero: `env SWIFT_TESTING_XCTEST_INTEROP_MODE=complete swift test`; and the toolchain check `swift --version` must print 6.4 or later in that job (reading heuristic for the version assertion).
RUN: yes (`interop-st-t63`/`interop-st-t64`: complete exit 1, limited exit 0, none exit 0, strict exit 1, tc 6.3 + complete exit 0).

**SW-TEST-04. Tests share no mutable global state; state is per-test.** No `static var`, `nonisolated(unsafe)` or mutable globals in test targets; use a `@Suite` struct whose stored properties are the fixture (fresh instance per `@Test`), or pass dependencies as arguments.
Rationale: tests run concurrently in one process; shared state fails on both toolchains.
Verify: `grep -rn -e 'static var' -e 'nonisolated(unsafe)' --include='*.swift' Tests/` (each hit is a review item: `static var` used as an `arguments:` source is fine). Run-time check: `swift test --no-parallel` green while `swift test` is red means interference.
RUN: yes (`shared-red` hit, `shared-instance` empty; `--no-parallel` exit 0 vs plain exit 1).

**SW-TEST-05. `.serialized` goes on the one `@Suite` that owns every test touching a shared external resource, or on a parameterized `@Test`; never on a plain `@Test`, never as cross-suite protection.**
Rationale: the trait orders tests within its own suite/test only (ST-0003, Parallelization.md); the plants prove the other shapes race.
Verify: `grep -rn -e '@Test(\.serialized)' -e '@Test("[^"]*", \.serialized)' --include='*.swift' Tests/` (output = no-op traits). Cross-suite sharing is a reading heuristic: every `@Suite(.serialized)` that touches the same file/env/port as another suite must be merged into one suite.
RUN: yes for the grep (`shared-serialized-pertest` red, 2 lines; `shared-serialized` green); the cross-suite shape is proven by `shared-serialized-split` (exit 1) but its detection is a reading heuristic.

**SW-TEST-06. Flake triage order: `--no-parallel`, then `--repeat-until fail`.** Rerun the failing target with `swift test --no-parallel`; if green, fix isolation (SW-TEST-04/05). For intermittent failures on 6.4+ run `swift test --filter MyTests --repeat-until fail --maximum-repetitions 100`. Do not use `--num-workers` for Swift Testing and do not commit `--no-parallel` as the fix; `--no-parallel` is acceptable as a permanent flag only for suites that measure timing (Nuke, SwiftLint precedents).
Rationale: `--num-workers 1` is a no-op for Swift Testing; repetition exists only from 6.4.
Verify: `swift test --repeat-until fail --maximum-repetitions 50` exits 0 on the fixed suite and 1 on the racy one.
RUN: yes (`shared-flaky` exit 1 under repeat; `shared-serialized` exit 0; tc 6.3 exit 64).

**SW-TEST-07. No sleep as synchronisation in tests.** `Task.sleep`, `Thread.sleep`, `usleep`, `nanosleep` and `clock.sleep` do not appear under `Tests/` except where a fake deliberately simulates slow work (comment the reason). Wait for the event: `await` the async API, `confirmation()` bridged with `withCheckedContinuation`, an `AsyncStream` consumed in the test, or an injected `Clock`.
Rationale: sleep-guarded test is green idle and red under load (plant); every sleep also slows the suite.
Verify: `grep -rn -e '\.sleep(' -e 'usleep(' -e 'nanosleep(' --include='*.swift' Tests/` (output = violations to review; empty = pass). `func sleep(until:` in a test clock does not match because the pattern requires the dot.
RUN: yes (`sleep-red` 1 hit; `sleep-confirm` and `sleep-clock` empty; behavioural pair: `taskset -c 0` red exit 1 / green exit 0).

**SW-TEST-08. `confirmation()` wraps the wait, not just the trigger.** The closure must not return until every expected confirmation has happened: bridge callbacks with `withCheckedContinuation`, or consume the stream inside the closure. Use `expectedCount:` (a range such as `1...` for "at least once") rather than a fixed count when the number is nondeterministic.
Rationale: confirmations after the closure returns are not counted ("confirmed 0 times").
Verify: run the test; a fire-and-forget misuse fails deterministically (exit 1). Reading heuristic: `confirmation` closure with no `await` inside is suspect.
RUN: yes (`confirm-misuse` exit 1 on 6.4 and 6.3; `sleep-confirm` twin exit 0).

**SW-TEST-09. Backstops: `.timeLimit` on every end-to-end or externally-waiting test, cancellation-aware waits, and a CI job timeout.** `@Test(.timeLimit(.minutes(1)))` (minute granularity). The code under test must not block a thread or await an uncancellable continuation; the CI job also sets `timeout-minutes`.
Rationale: the limit cancels the body; it cannot interrupt a body that ignores cancellation (planted hang >300 s).
Verify: reading heuristic: every `@Test` that calls the CLI harness or contains `processExitsWith` carries `.timeLimit` (a file-level grep for `timeLimit` cannot pair a test with its helper, so no grep is offered). Behavioural: a `timelimit-cancellable` style test fails at 60.000 s with `Time limit was exceeded`.
RUN: yes for the behaviour (`timelimit-cancellable` exit 1 at 60 s; `timelimit-async` hang, exit 124); the static check is a reading heuristic only.

**SW-TEST-10. Crash and precondition paths are tested with exit tests, against `precondition`.** `await #expect(processExitsWith: .failure) { ... }` for traps; parameterize with a capture list `[arg]` (Swift >=6.3); never assert on the trap message text; use `precondition`/`preconditionFailure`/`fatalError` for contracts that tests rely on, not `assert`.
Rationale: `assert` is compiled out in release (exit test red), the message is absent in release, `-Ounchecked` removes `precondition`.
Verify: `swift test` (debug) and `swift test -c release` both exit 0 on the compliant suite; `grep -rn -e 'assert(' --include='*.swift' Sources/` lists candidates whose contract is exercised by an exit test (review each). Hallucinated spellings: `swift build --build-tests` exits nonzero.
RUN: yes (`exit-red` exit 1, `exit-green` exit 0; `exit-assert` debug exit 0 / release exit 1; `halluc` exit 1).

**SW-TEST-11. Exit-test files are guarded for platform and compiler.** Wrap exit-test suites in `#if compiler(>=6.2) && (os(macOS) || os(Linux) || os(FreeBSD) || os(OpenBSD) || os(Windows))` (or a package-level define like `FOUNDATION_EXIT_TESTS`); on unsupported platforms the macros are unavailable.
Rationale: iOS, WASI and Android have no exit tests; an unguarded file breaks `swift build --build-tests` there.
Verify: `grep -rl -e 'processExitsWith' --include='*.swift' Tests/ | xargs -r grep -L -e 'compiler(>=6.2)' -e 'EXIT_TESTS'` (output = unguarded files; read the output, the exit codes are inverted by `-L`; whether the guard's platform list is right is a reading heuristic).
RUN: yes for the grep (G11: `exit-green` prints `Tests/LibTests/T.swift`, `exit-guarded` prints nothing, and `exit-guarded` still passes `swift test`, exit 0 on 6.4); no for non-Linux behaviour (unverified: read only).

**SW-TEST-12. CLI end-to-end tests run the built executable out of process and assert stdout, stderr and the exit status separately.** Use swift-subprocess 1.0.0 with `.string(limit:)` outputs, or `Process` with stdout/stderr redirected to temp files; locate the product beside the test binary (`CommandLine.arguments[0]`); fail (throw) when the executable is missing; assert `stdout` empty on error paths and `stderr` empty on success paths; never concatenate the streams; no `#if os(Windows) return` shortcuts that pass vacuously.
Rationale: separate-stream and exit-code bugs are the contract (planted: error text on stdout, exit 0); merged streams hide them.
Verify: run the suite against the product; a CLI with the stream/exit bug exits nonzero.
RUN: yes (`cli-green` exit 0, `cli-red` exit 1 on 6.4 and 6.3; `cli-subprocess` exit 0, `cli-subprocess-red` exit 1).

**SW-TEST-13. Never read a child's pipes after `waitUntilExit()`.** Redirect to files, or read the pipes concurrently (swift-subprocess does).
Rationale: a child writing more than the pipe buffer (~64 KiB) blocks forever; planted with 1 MiB.
Verify: `grep -rn -e 'Pipe()' --include='*.swift' Tests/` (every hit is a review item: the same file must not call `waitUntilExit()` before reading).
RUN: yes (`cli-flood-pipe` 2 hits and a hang, exit 124 under `timeout 110`; `cli-flood-file` empty and exit 0).

**SW-TEST-14. Coverage is gated on `Sources/` lines from the JSON, never on `totals`.** CI runs `swift test --enable-code-coverage` and the `jq -e` gate from finding 9 (threshold set per repo; the SDK's bar of 100 % is the Q4 default), locating the file with `--show-codecov-path`.
Rationale: `totals` include tests and generated files (37.5 % vs 16.7 %); the JSON path differs per toolchain.
Verify: `swift test --show-codecov-path | xargs -r jq -e --arg root "$PWD" --argjson min 90 EXPR` (EXPR is the jq expression in finding 9) exits 0 when the threshold holds and 123 when it does not.
RUN: yes (`cov` exit 123 against 90, `cov-full` exit 0, `cov` against 10 exit 0, tc 6.3 identical).

**SW-TEST-15. The sanitizer leg is separate, Linux debug, and knows its two false positives.** `swift test --sanitize=thread` and `--sanitize=address --disable-xctest` (or `ASAN_OPTIONS=detect_leaks=0`) as their own CI jobs; TSan is usable only where state is protected by actors/locks it can see (`Synchronization.Mutex` is flagged); check the log for `FATAL: ThreadSanitizer` (ASLR) before reading an exit code.
Rationale: sanitizers find races/overflows that assertions do not; the noise sources are known.
Verify: `swift test --sanitize=thread` exits 1 on a racy `@unchecked Sendable` class and 0 on an actor/`NSLock` twin; `swift test --sanitize=address --disable-xctest` exits 1 on a heap overflow and 0 on a clean package.
RUN: yes (`tsan-red` exit 1, `tsan-actor`/`tsan-nslock` exit 0, `tsan-green` (Mutex) exit 1 = false positive; `asan-red` exit 1, `shared-instance` exit 0 with `--disable-xctest`).

**SW-TEST-16. Parameterized tests: `zip` for paired inputs.** `@Test(arguments: a, b)` is a Cartesian product; use `zip(a, b)` when the inputs are pairs, and read the reported case count.
Rationale: 3 pairs silently become 6 cases.
Verify: the `with N test cases` line equals the intended count; `grep -rn -e '@Test(arguments: [^z]' --include='*.swift' Tests/` lists argument tests whose first argument is not a `zip` (review whether a second collection follows; single-collection tests are listed too).
RUN: yes (`misc`: 6 vs 3 cases; G16 hit `T.swift:5:@Test(arguments: [1, 2, 3], ["a", "b"])`, `zip` line not listed, `shared-instance` empty).

**SW-TEST-17. `#require` for preconditions of the test, `#expect` for the assertion under test.** `try #require(optional)` replaces `XCTUnwrap`/`guard ... else { XCTFail }`; `#expect` continues after failure and reports all failures.
Rationale: observed: `#require` stops the test, `#expect` records every failing line.
Verify: reading heuristic: a test that unwraps an optional or indexes an array before asserting uses `#require`.
RUN: yes for behaviour (`misc`), reading heuristic for the rule.

**SW-TEST-18. Fixtures use `init`/`deinit`, not method-name conventions.** Suite types (struct for per-test state, `final class` when `deinit` is needed) replace `setUp`/`tearDown`; async cleanup uses a scoping trait.
Rationale: fresh instance per test removes ordering dependence; `deinit` cannot be async or throwing.
Verify: `grep -rn -e 'func setUp' -e 'func tearDown' --include='*.swift' Tests/` in files that import Testing (output = leftover XCTest lifecycle; they never run in Swift Testing).
RUN: no (reading heuristic; behaviour of init/deinit observed in `misc`).

**SW-TEST-19. Skips are visible: traits for runtime conditions, `#if` only for non-compiling code.** `.enabled(if:)`, `.disabled(_:)`, `.bug(_:)` with reasons; `#if os(...)` around exit tests and platform-only API.
Rationale: a trait-skipped test shows in the report as skipped; an `#if`-removed test disappears.
Verify: `grep -rn -e '#if os(' --include='*.swift' Tests/` lists compile-time removals to review; the run must print `skipped:` lines for trait skips.
RUN: yes for the behaviour (`misc`: `➜ Test runtimeGated() skipped`); grep is a reading heuristic.

**SW-TEST-20. Experimental Swift Testing knobs are banned in fleet code.** No `SWT_EXPERIMENTAL_*` variables, no `@_spi(Experimental)` imports, no `.serialized(for:)`.
Rationale: documented as not an API contract; the global-serialization variable did not work in the plant.
Verify: `grep -rn -e 'SWT_EXPERIMENTAL' -e '_spi(Experimental)' -e 'serialized(for' . --include='*.swift' --include='*.yml' --include='Makefile'` (output = violations).
RUN: yes for the grep (G20: `spi-red` 2 lines, `shared-serialized` empty); the env var's ineffectiveness was observed in `shared-serialized-split`.

## Verification runs

All runs 2026-10-10. `V` = verification id. "Violation" and "twin" columns are exit codes. Raw logs: `fixtures/test-style/logs/<label>.log`, summary `logs/_summary.txt`. Scripts: `run-in.sh`, `v.sh`, `pinned.sh`, `gate.sh`, `greps.sh`, `run-tsan.sh`, `xdiff-setup.sh`, `xdiff-check.sh` in the fixture directory.

| V | Fixture(s) | Command | Violation | Twin | Relevant output |
|---|---|---|---|---|---|
| V1 | `shared-red` / `shared-serialized`, `shared-instance` | `swift test` (tc 6.4; tc 6.3 identical) | 1 | 0, 0 | `✘ Test firstBumps() recorded an issue at T.swift:8:5: Expectation failed: Shared.counter == 2000`, `Shared.counter → 3974` |
| V2 | `shared-serialized-pertest` | `swift test` (6.4 and 6.3) | 1 | - | `@Test(.serialized)` on plain tests still red |
| V3 | `shared-serialized-split` | `swift test` (6.4 and 6.3) | 1 | 0 with `--no-parallel` | two `@Suite(.serialized)` still race |
| V4 | `shared-red` | `swift test --no-parallel` (x3, plus 6.3) / `--parallel` / `--num-workers 1` | 0,0,0,0 / 1 / 1 | - | Swift Testing honours `--no-parallel` only |
| V5 | `shared-flaky` | `swift test` x4 then `swift test --repeat-until fail --maximum-repetitions 200` | 0,0,0,1 then 1 | `shared-serialized` repeat 50: 0 | intermittent race exposed by repetition; 6.3: `error: Unknown option '--repeat-until'`, exit 64 |
| V6 | `sleep-red` / `sleep-confirm` | `taskset -c 0 swift test --skip-build` (via `pinned.sh`, x3 on 6.4, x1 on 6.3) | 1,1,1 / 1 | 0,0,0 / 0 | red: `Expectation failed: done.withLock { $0 }`, `failed after 0.329 seconds`; unpinned both exit 0 |
| V7 | `confirm-misuse` | `swift test` (6.4, 6.3) | 1 | `sleep-confirm`: 0 | `Confirmation was confirmed 0 times, but expected to be confirmed 1 time` |
| V8 | `sleep-clock` | `swift test` (6.4, 6.3) | - | 0 | 30 s backoff, 60 s requested, 0.001 s elapsed |
| V9 | `timelimit-cancellable`, `timelimit-async`, `cli-flood-pipe` | `swift test` under `timeout` | 1 at 60.000 s / 124 (300 s) / 124 (110 s) | - | `Time limit was exceeded: 60.000 seconds`; non-cancellable bodies hang |
| V10 | `exit-red` / `exit-green` | `swift test` (6.4, 6.3) | 1 | 0 | `expected exit status ".failure", but ".exitCode(EXIT_SUCCESS)" was reported instead` |
| V11 | `exit-assert`, `exit-green` | `swift test -c release`; `-c release -Xswiftc -Ounchecked` | 1 (assert), 1 (precondition message / Ounchecked) | debug 0 | stderr `""` in release; precondition removed in `-Ounchecked` |
| V12 | `halluc` | `swift test` (`swift build --build-tests` equivalent) | 1 | - | `type 'ExitTest.Condition' has no member 'crash'`, `type 'Bool' has no member 'failure'` |
| V13 | `cli-red` / `cli-green` | `swift test` (6.4, 6.3) | 1 | 0 | `Expectation failed: r.stdout.isEmpty`; `r.stderr.contains("missing NAME")`; `r.status == 64` |
| V14 | `cli-subprocess-red` / `cli-subprocess` | `swift test` (6.4; green also 6.3) | 1 | 0 | swift-subprocess 1.0.0, `✘ Test run ... failed ... with 3 issues` |
| V15 | `cli-flood-pipe` / `cli-flood-file` | `swift test` (timeout 110 on the pipe variant) | 124 | 0 | 1 MiB stdout deadlocks `waitUntilExit()` before the read |
| V16 | `interop-st-t63`, `interop-st-t64` | `swift test`, with and without `env SWIFT_TESTING_XCTEST_INTEROP_MODE=<m>`; tc 6.4 and 6.3 | see finding 2 | - | `⚠︎ ... An API was misused ... Replace XCTest API such as 'XCTAssert'...` |
| V17 | `interop-skip` | `swift test` (6.4) | 1 | - | `Caught error: XCTSkip(message: Optional("not supported here")...` |
| V18 | `cov`, `cov-full` | `gate.sh <fixture> 90` (6.4; 6.3 identical) | 123 (`false`) | 0 (`true`) | 37.5 % `totals` vs 16.7 % `Sources/`; `cov` against 10: 0 |
| V19 | `tsan-red`, `tsan-actor`, `tsan-nslock`, `tsan-green` | `swift test --sanitize=thread` via `run-tsan.sh` | 1 | 0, 0 (actor, NSLock); 1 (Mutex, false positive) | `WARNING: ThreadSanitizer: Swift access race`; without seccomp: `FATAL: ThreadSanitizer: encountered an incompatible memory layout` |
| V20 | `asan-red`, `shared-instance` | `swift test --sanitize=address [--disable-xctest]` | 1 | 1 (leaks) / 0 (`--disable-xctest` or `ASAN_OPTIONS=detect_leaks=0`) | `ERROR: AddressSanitizer: heap-buffer-overflow`; `SUMMARY: AddressSanitizer: 432 byte(s) leaked in 7 allocation(s)` |
| V21 | `misc` | `swift test` | - | - | product 6 cases, `zip` 3 cases, `skipped: "needs NO_SUCH_VAR"`, `requireStops`/`expectContinues` as in finding 11 |

Grep checks (`greps.sh`, each run from the fixture directory; "violation" fixture then "twin" fixture; exit codes are the grep's, `xargs -r` pipelines give 123 on an empty result):

| G | Command (verbatim) | Violation fixture: exit, lines | Twin: exit, lines |
|---|---|---|---|
| G1 | `grep -rn -e '\.sleep(' -e 'usleep(' -e 'nanosleep(' --include='*.swift' Tests/` | `sleep-red`: 0, 1 (`Tests/LibTests/T.swift:8: ... Task.sleep(for: .milliseconds(300))`) | `sleep-confirm`: 1, 0; `sleep-clock`: 1, 0 |
| G2 | `grep -rl -e 'import Testing' Tests/ \| xargs -r grep -n -e 'XCTAssert' -e 'XCTFail' -e 'XCTUnwrap' -e 'XCTExpectFailure' -e 'XCTSkip'` | `interop-st-t64`: 0, 2 | `shared-instance`: 123, 0 |
| G3 | `grep -rn -e 'static var' -e 'nonisolated(unsafe)' --include='*.swift' Tests/` | `shared-red`: 0, 1 | `shared-instance`: 1, 0 |
| G4 | `grep -rn -e 'Pipe()' --include='*.swift' Tests/` | `cli-flood-pipe`: 0, 2 | `cli-flood-file`: 1, 0 |
| G5 | `grep -rn -e '@Test(\.serialized)' -e '@Test("[^"]*", \.serialized)' --include='*.swift' Tests/` | `shared-serialized-pertest`: 0, 2 | `shared-serialized`: 1, 0 |
| G6 | `grep -rl -e 'import Testing' Tests/ \| xargs -r grep -n -e 'XCTestExpectation' -e 'XCTWaiter' -e 'wait(for:'` | `interop-skip`: 0, 2 | `shared-instance`: 123, 0 |
| G7 | `grep -rln -e 'import XCTest' --include='*.swift' Tests/` | `interop-t64`: 0, 1 | `shared-instance`: 1, 0 |
| G11 | `grep -rl -e 'processExitsWith' --include='*.swift' Tests/ \| xargs -r grep -L -e 'compiler(>=6.2)' -e 'EXIT_TESTS'` | `exit-green`: xargs 123, 1 line (`Tests/LibTests/T.swift`) | `exit-guarded`: 0, 0 lines (exit codes inverted by `-L`: read the output) |
| G16 | `grep -rn -e '@Test(arguments: [^z]' --include='*.swift' Tests/` | `misc`: 0, 1 (`T.swift:5:@Test(arguments: [1, 2, 3], ["a", "b"])`) | `shared-instance`: 1, 0 |
| G20 | `grep -rn -e 'SWT_EXPERIMENTAL' -e '_spi(Experimental)' -e 'serialized(for' . --include='*.swift' --include='*.yml' --include='Makefile'` | `spi-red`: 0, 2 | `shared-serialized`: 1, 0 |
| G7d | `git diff --name-only --diff-filter=A main...HEAD -- 'Tests/*.swift' ':(exclude)Tests/*UITests/*' \| xargs -r grep -l -e 'import XCTest'` | `xctest-diff` branch `red`: xargs 0, prints `Tests/LibTests/NewTests.swift` | branch `green` (adds a Testing file and a UITests XCTest file, modifies an old XCTest file): 123, empty |

Not red, reported as such: (1) The `shared-red` plant fails on every run, not only under repetition (`Task.yield()` loops overlap reliably); the genuinely intermittent case is `shared-flaky`. (2) `SWT_EXPERIMENTAL_SERIALIZED_TRAIT_APPLIES_GLOBALLY` did not make `shared-serialized-split` green (exit 1 with `=1` and `=true`). (3) The first `sleep-red` calibrations were green under load (0.444 to 0.786 s) because the work ran on the cooperative pool or Dispatch, starving the sleep itself; the committed plant uses `Thread`s. (4) TSan without `seccomp=unconfined` returned exit 1 for red and green alike (12 of 12), which is why finding 10 requires the log check. (5) A file-level grep pairing end-to-end files with `timeLimit` was tried (`cli-green` listed, but the helper file never contains the trait) and dropped as a non-check; SW-TEST-09's static side stays a reading heuristic. (6) Reading heuristics, never run: SW-TEST-17, SW-TEST-18, SW-TEST-19's grep, SW-TEST-03's version assertion.

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| SW-TEST-01 | Apple OCI tooling 100 % Testing (container, containerization, container-plugin); argument-parser, log, tracing, foundation, Nuke (`Nuke@d5548dd61395`: 0 XCTest files, 153 Testing files); vapor/hummingbird 100 % (gates 2a) | Core libraries still XCTest-first by age: crypto 0 %, protobuf 0 %, collections 1 %, nio 11 %, Alamofire 9 % (gates 2a); the rule allows these as legacy. |
| SW-TEST-02/03 | SPM is the migration exemplar: 1,732 `@Test` next to 1,392 `func test*`, 33 files import both (gates 2a); swift-testing's own tests use `EventHandlingInteropTests` (`swift-testing@c7d68ca20cd7:Tests/TestingTests/EventHandlingInteropTests.swift`) | No exemplar sets `SWIFT_TESTING_XCTEST_INTEROP_MODE` in a workflow or script (own grep, 0 of 40). |
| SW-TEST-04 | Foundation/swift-build use suites with `static var` only as data (208 `static var` declarations in Testing files, mostly `arguments:` sources: foundation 69, swift-build 30; counting caveat: not every one is mutable shared state) | Not audited per declaration; the plant is the evidence. |
| SW-TEST-05 | apple/container `*Serial.swift` + `@Suite(.serialized)` (`container@f70ecbb926d9:Tests/IntegrationTests/Machine/TestCLIMachineRuntimeSerial.swift:24`); swift-testing `RunnerTests.swift:965`; Nuke documents the within-suite limit (`Measure.swift:6-8`) | `.serialized` used 464 times in 40 repos (own measurement incl. docs-only mentions); the 22 uses on `@Test` (gates 2b) are the ones to inspect for the no-op shape; not individually audited. |
| SW-TEST-06 | SwiftLint (`test.yml:94`), swift-build (`pull_request.yml:23`) run `--no-parallel` deliberately | No exemplar uses `--repeat-until` / `--maximum-repetitions`. |
| SW-TEST-07 | Local doc rule is new; compliant: swift-testing's own `confirmation` use (90 in swift-testing, 65 in element-x-ios; gates 2b) | Violated broadly: 638 sleep lines in 235 files (`swift-package-manager@5546f44a3b52:Tests/PackageCollectionsTests/TrieTests.swift:206`, `containerization@3e7bc39e66b3:Tests/ContainerizationOSTests/BidirectionalRelayTests.swift:287`, `hummingbird@1bd3b407fb47:Tests/HummingbirdCoreTests/CoreTests.swift:126`, `swift-nio@e12881f2a691:Tests/NIOCoreTests/AsyncChannel/AsyncChannelTests.swift:230`). Contradiction to note: the Apple-maintained repos do not follow the ban; element-x-ios (76 lines) is the largest. |
| SW-TEST-08 | `confirmation(` 205 uses in 8 repos (gates 2b) | Not audited for the fire-and-forget shape. |
| SW-TEST-09 | vapor uses `.timeLimit` 71 times (99 total in 8 repos; gates 2b) | A `.timeLimit` does not rescue uncancellable waits (plants); no exemplar documents this. |
| SW-TEST-10/11 | swift-nio `ByteBufferCrashTests.swift:21` guard; swift-foundation `Package.swift:92` define; 238 `processExitsWith` in 9 repos (gates 2b), nio 41-43, foundation 58, swift-testing 142 uses in its own tests | swift-async-algorithms (3) and swift-collections (11) have exit-test counts in an XCTest-first tree; guard style not audited. |
| SW-TEST-12/13 | apple/container integration harness drives the CLI out of process (`TestCLIExecCommand.swift:58`); swiftly uses swift-subprocess 1.0.0 (`swiftly@c8cf2e35bfca:Package.swift:34`) | **swift-argument-parser itself violates 13 and 12:** Pipe-then-wait (`TestHelpers+SwiftTesting.swift:256-281`, `TestHelpers.swift:401-428`), merged streams, vacuous Windows pass (`+SwiftTesting.swift:240-241`). Its harness is the best-known Swift CLI test helper and is the pattern an agent will copy. |
| SW-TEST-14 | container Makefile `:346,368,387`; containerization `Makefile:407`; hummingbird `ci.yml:56` run coverage | None enforces a threshold; none filters `totals`. |
| SW-TEST-15 | swift-protobuf sanitizer matrix with `detect_leaks=0` (`swift-protobuf@6c84c3dedac0:.github/workflows/build.yml:148-176`); SwiftLint has a TSan Makefile flag (`SwiftLint@ec4691d9e813:Makefile:15`) | swift-protobuf pins `swift:6.3` because 6.4 "is failing for some reason" (`build.yml:157-159`); this research's 6.4 run worked only after `seccomp=unconfined`, so the cause may be environmental. |
| SW-TEST-16/17/18/19 | 1,478 `@Test(arguments:)`; 65 `.enabled(if:)`, 107 `.disabled` (gates 2b) | Product-vs-zip misuse not audited. |

## AI-agent angle

What an LLM characteristically gets wrong in test code, with the smallest mechanical check (all commands above):

| Characteristic mistake | Why it compiles/passes | Smallest check |
|---|---|---|
| New tests as `final class FooTests: XCTestCase { func testX() }` with `import XCTest` | Habit from pre-2024 corpora; still compiles | SW-TEST-01 diff grep (G7d) |
| Reusing an old XCTest helper (`XCTAssertEqual`) from an `@Test` | Silent pass on tc <6.4, warning on `limited` | G2 grep; `SWIFT_TESTING_XCTEST_INTEROP_MODE=complete swift test` |
| `Task.sleep(for: .milliseconds(100))` then assert | Green on a laptop, red under load | G1 grep; `taskset -c 0 swift test` |
| `confirmation { c in service.start { c() } }` without awaiting | Compiles; fails deterministically but the cause is unclear | the run itself (exit 1, "confirmed 0 times") |
| `@Test(.serialized)` on a single test, or `@Suite(.serialized)` on two suites, to fix a global-state race | Reads like a fix; has no effect | G5 grep; `swift test --repeat-until fail --maximum-repetitions 50` |
| `static var` counters / singletons in test targets, `nonisolated(unsafe)` to silence Swift 6 diagnostics | Compiles in Swift 6 mode with the escape hatch | G3 grep; `swift test --no-parallel` comparison |
| `swift test --num-workers 1` or `--parallel` to control Swift Testing | Both flags exist and are accepted | V4: only `--no-parallel` works |
| `#expect(exitsWith: .failure)` / `.crash` / forgetting `await` on `processExitsWith` | Pre-release or invented API spellings | `swift build --build-tests` (compile error, V12) |
| `assert(...)` for a contract, then an exit test for it | Green in debug, red in release | `swift test -c release` leg |
| Asserting on the trap message in an exit test | Present in debug stderr, absent in release | `swift test -c release` leg |
| `Process` + `Pipe` + `waitUntilExit()` then read (copied from argument-parser) | Works for small output; deadlocks above 64 KiB | G4 grep |
| One merged `output + error` string compared to expected | Hides stream-routing and exit-code bugs | reading heuristic; SW-TEST-12 plant (`cli-red` passes a merged-output test, fails separate-stream assertions) |
| `#if os(Windows) return ""` to "skip" an end-to-end test | The test passes vacuously | reading heuristic; prefer `.disabled`/`.enabled(if:)` so the skip is reported |
| Setting `SWIFT_TESTING_XCTEST_INTEROP_MODE` on a 6.3 toolchain and trusting the green | Variable is ignored there | `swift --version` assertion in the same job |
| `@unchecked Sendable` test doubles with unprotected state, "verified" by a passing run | The test passes (V19 `tsan-red` exit 0 without TSan) | `swift test --sanitize=thread` leg |
| Treating `.data[0].totals.lines.percent` as the coverage figure, or hard-coding `.build/debug/codecov/...` | Totals include tests; path differs between 6.3 and 6.4 | G-gate in finding 9; always `--show-codecov-path` |
| `swift test --sanitize=address` red on a fresh package, then disabling the leg | Leak noise from libXCTest | `--disable-xctest` or `ASAN_OPTIONS=detect_leaks=0` |
| `@Test(arguments: [1, 2, 3], ["a", "b", "c"])` expecting pairs | Compiles; runs 9 cases | read the case count; use `zip` |
| `XCTestExpectation` + `wait(for:)` inside an `async @Test` | Passed in the trivial plant | G6 grep |

## Contested / evolving

- **Interop default (as of 2026-10).** ST-0021 chose `complete` for new tools versions and `limited` for older manifests, with `strict` as a future default ("In a future release, we would consider making strict interop mode the default"). Xcode 26.4 reportedly turned interop off by default and Xcode 27 reports cross-framework failures as warnings (shifts scout; unverified: read only). Trend: warning-first, promoted to failure after migration. The April 2026 amendment redefined `limited` once already; re-check the mode table on each toolchain bump.
- **Sleep ban vs corpus practice.** Even Apple repos keep sleeps (638 lines); the 2026 practitioner position (raska.io) and the plant favour event-driven waits, but a deterministic test clock is still hand-rolled in the stdlib-only case. Trend: toward injected clocks and spies; unsettled which packaged test clock the fleet should adopt.
- **`.timeLimit` semantics.** Minute granularity (ST-0004) makes it a backstop, and it cannot interrupt uncancellable waits; no proposal in the ST series changes that as of 6.4.
- **Repetition.** ST-0024 shipped per-test-case repetition in 6.4; a per-test repetition *trait* is only a "future direction", so CI reruns are command-line only.
- **Exit tests on more platforms.** iOS/WASI are "future work" and Android "an ongoing area of research" (ST-0008); the Testing Workgroup agreed no new proposal is needed if the interface does not change, so support may arrive silently in a point release.
- **`measure {}` replacement.** The map keeps performance tests in XCTest; Nuke's all-Swift-Testing performance target with a `ContinuousClock` helper shows the alternative is viable on Apple platforms (unverified: read only). Trend: away from XCTest metrics, but Instruments/XCTMetric parity is unresolved.
- **TSan and `Mutex`.** The concurrency guidance prefers `Mutex`; TSan on Linux flags it. Whether this is a toolchain gap or a missing suppression is open (not pursued); swift-protobuf reports an unspecific 6.4 sanitizer failure.
- **`serialized(for:)`.** Experimental SPI with a documentation TODO (`ParallelizationTrait.swift:17`); `.serialized` semantics ("globally" vs "within the branch") are under active design (`SWT_EXPERIMENTAL_SERIALIZED_TRAIT_APPLIES_GLOBALLY`). Do not build on it.
- **Swift Build engine.** 6.4 changes the products layout (`out/Products/Debug-linux-x86_64`) and names the runner `LibTests-test-runner`; hard-coded `.build/debug` paths in CI scripts break (the `--show-codecov-path` and `CommandLine.arguments[0]` recipes survive).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0021-targeted-interoperability-swift-testing-and-xctest.md | ST-0021 interop proposal (primary) | Implemented 6.4, amended 2026-04 | Modes, defaults by tools version, env var, `XCTSkip`/expectations decisions. |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0008-exit-tests.md | ST-0008 exit tests (primary) | Implemented 6.2 | API, platforms, `SWT_NO_EXIT_TESTS`, future platforms. |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0012-exit-test-value-capturing.md | ST-0012 capture list (primary) | Implemented 6.3 | `[n]` capture, `Sendable & Codable`, visibility rules. |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0024-per-test-case-repetitions.md | ST-0024 repetition (primary) | Implemented 6.4 | `--maximum-repetitions`, `--repeat-until`, per-case semantics, "serialized order is an anti-pattern". |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0003-make-serialized-trait-api.md | ST-0003 `.serialized` (primary) | Implemented 6.0 | Why a single `@Test(.serialized)` has no effect. |
| https://raw.githubusercontent.com/swiftlang/swift-evolution/main/proposals/testing/0004-constrain-the-granularity-of-test-time-limit-durations.md | ST-0004 time limits (primary) | Implemented 6.0 | Minute granularity. |
| https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/MigratingFromXCTest.md | Migration guide (primary) | main, 2026 (6.4) | Interop mode table, `confirmation` mapping, `init`/`deinit`, `.serialized`. |
| https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/exit-testing.md | Exit-testing article (primary) | 6.2, captures 6.3 | Platform list, capture syntax, observing stdout/stderr. |
| https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/Parallelization.md | Parallelization article (primary) | 2024 | "unrelated tests" caveat, `--no-parallel`. |
| https://raw.githubusercontent.com/swiftlang/swift-testing/main/Sources/Testing/Testing.docc/testing-asynchronous-code.md | Async testing article (primary) | 2024+ | `confirmation` usage and ranges. |
| https://raw.githubusercontent.com/swiftlang/swift-testing/main/Documentation/EnvironmentVariables.md | Env var inventory (primary) | main, 2026 | `SWIFT_TESTING_XCTEST_INTEROP_MODE`, experimental serialization knobs, "not an API contract". |
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release post (primary) | 2026-09-15 | ST-0021/0022/0024 summary. |
| https://forums.swift.org/t/amended-st-0021-targeted-interoperability-between-swift-testing-and-xctest/86479 | Review-manager acceptance of the ST-0021 amendment (primary, forums) | 2026-05-04 | Dates the amendment. |
| https://developer.apple.com/tutorials/data/documentation/testing.json and `.../testing/exittest.json` | DocC data behind developer.apple.com/documentation/testing | 2026 | Topic structure; `ExitTest` availability "Swift 6.2, Xcode 26.0" (the HTML page itself needs JavaScript). |
| https://github.com/swiftlang/swift-subprocess (README fetched via raw.githubusercontent.com/swiftlang/swift-subprocess/main/README.md) | swift-subprocess (primary) | 1.0.0 | `run(.path/.name, output: .string(limit:))`, `terminationStatus`. |
| https://raska.io/blog/testing-concurrent-code/ | "Stop Sleeping: Deterministic Tests for Concurrent Swift Code" (practitioner) | 2026-09-21 | States agents write `Task.sleep`; spies, streams, `Sleeping` protocol. |
| https://www.pointfree.co/blog/posts/110-reliably-testing-async-code-in-swift | Point-Free on deterministic async XCTests (practitioner) | 2023-07-19 | `withMainSerialExecutor` background; XCTest-era, not re-verified. |
| `swift test --help` on swift:6.4 and swift:6.3.3 (fixtures/test-style/logs/help-test-64.txt, help-test-63.txt) | Toolchain CLI reference (primary) | 2026-10-10 | Flag availability by toolchain. |
| swift-testing@c7d68ca20cd7 `Sources/Testing/Traits/ParallelizationTrait.swift`, `TimeLimitTrait.swift`, `Documentation/EnvironmentVariables.md` | The library's own source (primary) | 2026 | `serialized(for:)` SPI, time-limit implementation. |
| swift-argument-parser@efd239f0055b `Sources/ArgumentParserTestHelpers/TestHelpers.swift`, `TestHelpers+SwiftTesting.swift` | Apple CLI test harness (exemplar) | 2026 | Pipe-then-wait shape, Windows vacuous pass, XCTest to Swift Testing twin. |
| swift-nio@e12881f2a691 `Tests/NIOCoreTests/ByteBufferCrashTests.swift`; swift-foundation@aadd9259be07 `Package.swift` | Exit-test guard idioms (exemplar) | 2026 | Two production guard patterns. |
| Nuke@d5548dd61395 `Tests/NukePerformanceTests/Measure.swift` | Swift-Testing-only performance tests (exemplar) | 2026 | `.serialized` limit, `measure` replacement. |
| swift-protobuf@6c84c3dedac0 `.github/workflows/build.yml` | Sanitizer matrix (exemplar) | 2026 | Leak workaround, 6.4 note. |
| SwiftLint@ec4691d9e813, swift-build@2187330e13e7, container@f70ecbb926d9, containerization@3e7bc39e66b3, hummingbird@1bd3b407fb47 CI files and Makefiles | `--no-parallel` and coverage usage (exemplar) | 2026 | How production repos gate. |
| ../swift-audit/exemplar-quality-gates.md (Axis 2) and ../swift-topic-map.md (conflict 3, M-E rows) | Wave-1 audit and map (internal) | 2026-10-10 | Corpus shares and the binding decisions. |

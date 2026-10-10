---
# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.
paths:
  - "**/.swift-quality-depth-on-demand"
title: Testing
summary: The SW-TEST family, owning Swift Testing against XCTest, waiting without sleep, process-global state, temp paths and ports, exit tests, the out-of-process CLI harness, recorded fixtures and spawn seams, coverage gates and sanitizer legs
---

# Testing

Binds to Swift 6.4.0 (prior line 6.3.3), the Swift Testing bundled with each toolchain and swift-subprocess 1.0.1, Linux only
(measured 2026-10-10). Every Apple, Windows, Wasm and Android claim is `unverified: read only`.

Owns the framework choice, test isolation, waits, flake triage, exit tests, the CLI and SDK process harness, fixtures, coverage
thresholds and the test-side sanitizer recipe. Not owned here: the spawn module itself and the pipe-drain rule are `SW-IO`
(`SW-IO-24` to `SW-IO-26`), the TSan job script is `SW-GATE-27` (`SW-GATE`), the exit-status table is `SW-CLI-01` and its per-case
contract tests are `SW-CLI-14` (`SW-CLI`), the trap and `precondition` policy is `SW-ERR`, and the SDK's fake-CLI coverage design is `SW-API-13`
(`SW-API`). **SDK** means the pinned default shape, a stdlib-plus-swift-subprocess library that wraps a CLI. The names `OcxSdk` (module),
`OcxSdkProcess` (its spawn module) and `OCX_SDK_CONTRACT` (the contract-tier switch) are examples an adopter renames once.

Contents: [Dates and Floors](#dates-and-floors) · [Grep Over Test Sources or the Diff](#grep-over-test-sources-or-the-diff) ·
[Compile or Run the Suite](#compile-or-run-the-suite) · [Out-of-Process Harness](#out-of-process-harness) ·
[Spawn Seam and Recorded Fixtures](#spawn-seam-and-recorded-fixtures) · [CI Legs](#ci-legs) ·
[Smaller Rules](#smaller-rules) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- Swift Testing ships in the toolchain from Swift 6.0, and `swift package init` emits it (checked on 6.3 and 6.4). Exit tests need 6.2
  and the `[n]` capture list 6.3. `Test.cancel` needs 6.3 (a 6.2.0 leg fails with `no member cancel`, use the `.enabled(if:)` trait there). `TestScoping` traits need 6.1. `--repeat-until` and `--maximum-repetitions` need 6.4 (on 6.3.3 `swift test` exits 64
  with `Unknown option`). The interop variable acts only on a 6.4 or later toolchain.
- **Pinned defaults, the adopter may override:** interop is `complete`. Apple `measure {}` performance tests stay XCTest. Clocks and
  fakes are hand-written, with no swift-clocks and no mock framework, to hold the SDK's dependency budget. Legacy XCTest trees are not
  rewritten for their own sake. The SDK's coverage design is `SW-API-13` (fake CLI out of process, 100% lines over `Sources/`, nothing
  excluded), and `SW-TEST-20` to `SW-TEST-22` bind a CLI core and any SDK that keeps a replacing runner.
- Gap: Swift has no line or region coverage exclusion. Four comment markers, `#sourceLocation`, `@_transparent` and `@_semantics` left
  every count unchanged on 6.3 and 6.4 (measured 2026-10-10). [llvm-project#33625](https://github.com/llvm/llvm-project/issues/33625)
  is open since 2017 and the inline-marker PR 203723 closed unmerged on 2026-06-13. Re-check at 6.5 (`SW-TEST-22`).
- Gap: `.serialized(for:)` is `@_spi(Experimental)` and does not compile from a shipped toolchain even with the SPI import (exit 1 on
  6.3 and 6.4). The built-in `.taskLocal(_:withValue:)` trait is Swift 6.5 only. Re-check at 6.5 (`SW-TEST-05`, `SW-TEST-08`).
- Gap: the TSan filter of `SW-GATE-27` passes a real race that TSan reports only as `Swift access race`. No such plant exists, and
  why a correct `Mutex` yields only that kind is not established (`SW-GATE-27`).
- Gap: the `setenv` against `getenv` crash is a glibc fact. It killed the test process on glibc 2.39 (54 of 60 runs) and not on
  glibc 2.43 (0 of 100). A green run on a newer libc proves nothing. musl, macOS and Windows are unmeasured.
- Gap: a replay seam covers exit status and streams only. The recorded replay ignores the argv it receives, and the timeout race,
  cancellation and kill ladder of `SW-IO-26` need a real child, which is why `SW-API-13` runs a fake CLI instead.
- Gap: 100% regions has one real-code measurement and it missed, 179 of 182 on the reference SDK (read 2026-10-10). Generic
  specializations, `defer` and `catch` arms are the suspects.

## Grep Over Test Sources or the Diff

Run from the package root, `Tests` and `Sources` being literal directories. Source trees may be symlinks (RxSwift's `Sources/` is a symlink farm of 412 files): every scan here uses `grep -R` and `find -L`, because `grep -r` skips symlinked files and `find` without `-L` skips a symlinked directory, so the scan and the `SW-CORE-03` canary must count the same files (measured 2026-10-10: `find` 412 files, `grep -r` 1, `grep -R` 412). Every command prints the violation, so **empty output is
the pass**. File lists cross `xargs` NUL-separated (`grep -lZ`, `xargs -0`) so a path with a space survives. A pipeline ending in `xargs -0 -r` exits 123 whenever its last `grep` exits 1 for a whole batch (no match, or `-L` listing only files), so judge by the output and never by the status, and a missing `Tests` operand exits 2, which
is an error and not a pass. The diff commands need `origin/main` fetched (the guard line exits 64 without it) and read the work tree, so uncommitted and untracked files count. In an adopted tree gate the added lines, in a new tree gate the whole tree.

```sh
# guard for the diff commands below: empty output is a pass only after these lines succeed. `git add -N .` marks untracked
# files (intent-to-add, no content staged; --merge-base needs git 2.30) so the work-tree diff sees them. A three-dot diff
# sees committed changes only and printed nothing for an untracked XCTest file plus an uncommitted setenv (measured 2026-10-10)
git rev-parse --verify -q origin/main >/dev/null || { echo 'sw-test: origin/main not fetched (use fetch-depth: 0)' >&2; exit 64; }
git add -N . || { echo 'sw-test: git add -N failed' >&2; exit 64; }

# sw-test-01: files added by the diff that import XCTest
git diff -z --name-only --diff-filter=A --merge-base origin/main -- 'Tests/*.swift' ':(exclude)Tests/*UITests/*' \
  ':(exclude)Tests/*PerfTests/*' ':(exclude)Tests/*PerformanceTests/*' | xargs -0 -r grep -l -e 'import XCTest'

# sw-test-02: XCTest API and lifecycle methods in a file that imports Testing
grep -RlZ --include='*.swift' -e 'import Testing' Tests | xargs -0 -r grep -nE \
  '\b(XCTAssert(Equal|NotEqual|True|False|Nil|NotNil|Identical|NotIdentical|GreaterThan|GreaterThanOrEqual|LessThan|LessThanOrEqual|ThrowsError|NoThrow)?|XCTFail|XCTUnwrap|XCTSkip[A-Za-z]*|XCTExpectFailure|XCTestExpectation|XCTWaiter)\b|wait\(for: *\[|fulfillment\(of:'
grep -RlZ --include='*.swift' -e 'import Testing' Tests | xargs -0 -r grep -n -e 'func setUp' -e 'func tearDown'

# sw-test-03: whole-tree inventory, then the gate on added lines
grep -RnE --include='*.swift' '(^|[^[:alnum:]_])(usleep|nanosleep|sleep)\(' Tests | grep -v -E 'func +(usleep|nanosleep|sleep)\(' | grep -v -e '// sleep ok:'
git diff -U0 --merge-base origin/main -- 'Tests/*.swift' | grep -E '^\+' | grep -vE '^\+\+\+' \
  | grep -E '(^\+|[^[:alnum:]_])(usleep|nanosleep|sleep)\(' | grep -v -E 'func +(usleep|nanosleep|sleep)\(' | grep -v -e '// sleep ok:'

# sw-test-05: .serialized shapes that do nothing (a plain @Test, multi-trait forms included)
grep -RnE --include='*.swift' '@Test\(.*\.serialized' Tests | grep -v -E 'arguments:|serialized\(for'

# sw-test-18: process-global writes in Tests, then the same patterns on added lines
grep -Rn --include='*.swift' -e 'setenv(' -e 'putenv(' -e 'putenv_s(' -e 'chdir(' -e 'changeCurrentDirectoryPath(' -e 'umask(' \
  -e 'SetEnvironmentVariable' -e 'SetCurrentDirectory' Tests | grep -v -e '// exit-test child'
git diff -U0 --merge-base origin/main -- 'Tests/*.swift' | grep -E '^\+' | grep -vE '^\+\+\+' | grep -F -e 'setenv(' -e 'putenv(' \
  -e 'putenv_s(' -e 'chdir(' -e 'changeCurrentDirectoryPath(' -e 'umask(' -e 'SetEnvironmentVariable' -e 'SetCurrentDirectory' \
  | grep -v -e '// exit-test child'

# sw-test-19: fixed temp paths and fixed ports (apply the sw-test-18 diff wrapper for added lines)
grep -RnE --include='*.swift' -e '"/(var/)?tmp/' \
  -e 'temporaryDirectory\.appendingPathComponent\("[^"\\]*"' -e 'NSTemporaryDirectory\(\) *\+ *"[^"\\]*"' \
  -e '[Pp]ort: *[1-9][0-9]{3,4}' -e '(localhost|127\.0\.0\.1|0\.0\.0\.0):[1-9][0-9]{3,4}' Tests | grep -v -e '// literal ok:'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-TEST-01 | A diff adds no test file that imports XCTest. New tests are Swift Testing. Exceptions are XCUITest and Apple-only `measure {}` performance directories, listed in the pathspec. Existing XCTest files are neither rewritten nor forbidden to grow. | XCTest has no exit tests, `confirmation()` or parameterization, and agents default to `XCTestCase` from pre-2024 training. | Block `sw-test-01`. Output is the violating added file, empty is the pass (judge by output, the exit status is 0 or 123 on a pass, and the guard line exits 64 when `origin/main` is missing). Inventory: `grep -Rln -e 'import XCTest' --include='*.swift' --exclude=LinuxMain.swift --exclude=XCTestManifests.swift Tests` (the two excluded names are pre-5.4 Linux discovery shims, dead on a current toolchain: delete them, they are not violations). Without the excludes Mint prints 7 files and with them 5 (measured 2026-10-10). Watched red (measured 2026-10-10): the red branch prints the new file, a Testing-only branch prints nothing. With only the UI exclusion a perf directory is flagged, hence the extra pathspecs. | MUST |
| SW-TEST-02 | No XCTest API runs under Swift Testing. `XCTAssert*` becomes `#expect`, `XCTUnwrap` becomes `try #require`, `XCTFail` becomes `Issue.record`, `XCTSkip` becomes an `.enabled(if:)` trait or `try Test.cancel(...)` (6.3+), and `XCTestExpectation`, `XCTWaiter` and `wait(for:)` become `confirmation()` or a plain `await`. `setUp` and `tearDown` become `init` and `deinit` of a suite type (a struct for per-test state, a `final class` when `deinit` is needed, and async cleanup uses a scoping trait). | With interop `none` an `XCTAssertEqual(1, 2)` inside `@Test` passes silently (exit 0), under `limited` it is a warning, `throw XCTSkip` is a failure, and a leftover `func setUp()` in a Testing suite is never called. | Block `sw-test-02`, two greps. Output is the review items, empty is the pass. In a file importing both frameworks a hit inside an `XCTestCase` class is legitimate (68 such files in 12 repos). A helper file that imports only XCTest is invisible here and caught at run time by `SW-TEST-10`. Watched red (measured 2026-10-10): the plants are flagged, a local `XCTAssertMatch` shim is not, and `swift test` exits 1 on a leftover `setUp` that never ran. | MUST |
| SW-TEST-03 | A sleep is never how a test waits. No `Task.sleep`, `clock.sleep`, `Thread.sleep`, `usleep`, `nanosleep` or bare `sleep(n)` on lines a diff adds or changes. Wait for the event (`SW-TEST-12`). A sleep that deliberately simulates slow work inside a fake ends its line with `// sleep ok: reason`. A timeout is `.timeLimit` (`SW-TEST-13`), never a racing sleep. | A sleep-guarded async test is green idle and red under load, and every sleep slows the suite. The corpus has 638 sleep lines in 235 test files, Apple repos included. | Block `sw-test-03`. The first command is the inventory, the second is the gate on added lines. Empty is the pass. Behavioural: build, then `taskset -c 0 swift test --skip-build`, which exposes a sleep-guarded test. Watched red (measured 2026-10-10): all 7 sleep spellings flagged, a `func sleep(until:)` clock twin clean, and the diff form flags only the added line. | MUST on added lines, inventory otherwise |
| SW-TEST-04 | Tests share no mutable state. No `static var`, global `var` or `nonisolated(unsafe)` that two `@Test`s touch. State belongs to the test, as stored properties of a `@Suite struct` (a fresh instance per `@Test`, `mutating` test functions) or as arguments. Process-global state is not shared state to protect but state not to touch (`SW-TEST-18`), a temp path or port is made unique per test (`SW-TEST-19`), and only a resource that can be neither injected nor made unique goes to one suite (`SW-TEST-05`). | Suites run concurrently in one process, and two tests bumping a shared counter failed on 6.3 and 6.4. | `grep -RnP --include='*.swift' '^(?!.*@Ta).*static var [A-Za-z_]\w*[^{]*$' Tests` and `grep -Rn --include='*.swift' '^nonisolated(unsafe) var ' Tests` (stored statics and file-scope globals only: a computed `static var x: T { ... }`, an `@Tag` or `@TaskLocal` static is not shared state, and a local `nonisolated(unsafe) var` inside one test is a reading item). Empty is the pass for both. Behavioural: `swift test --no-parallel` green while `swift test` is red means test-to-test interference. Watched red (measured 2026-10-10): exit 1 on both toolchains, `--no-parallel` exit 0. | MUST |
| SW-TEST-05 | Put `.serialized` on the one `@Suite` that owns every test touching a shared resource, or on a parameterized `@Test`. Never alone on a plain `@Test`, never as cross-suite protection. A single owner suite is safe only while no other suite and no library code reads or writes the same state. It is the residual tool for a resource that can be neither injected nor made unique (`SW-TEST-18`, `SW-TEST-19`). | The trait orders tests inside its own suite or test only (ST-0003: on a non-parameterized test it "does not have any effect"). Two `@Suite(.serialized)` suites still race each other, 50 of 50 runs on 6.4 and 49 of 50 on 6.3. | Block `sw-test-05`, output is the no-op shapes, empty is the pass. The cross-suite shape has no grep because the shared resource is not syntactic, so it is a reading heuristic: every `@Suite(.serialized)` touching the same file, variable or port must be one suite and the only reader. Watched red (measured 2026-10-10) for both bad shapes. | MUST |
| SW-TEST-18 | No test mutates process-global state. `setenv`, `unsetenv`, `putenv`, `chdir`, `FileManager.changeCurrentDirectoryPath`, `umask` and their Windows spellings do not appear in `Tests/`, except on a line ending `// exit-test child` inside a `#expect(processExitsWith:)` body. Ladder: (1) pass the value (`endpoint(environment: [String: String])`, `readData(in: URL)`, a `Configuration` struct), with production reading `ProcessInfo.processInfo.environment` and the cwd only at its composition root and in the spawn module's child-environment merge (`SW-IO-24`, `SW-IO-25`), (2) a hand-written `TestScoping` trait binding a `@TaskLocal` (Swift 6.1, no trailing `//` comment on the `@TaskLocal static var` line, it breaks the macro on 6.4), (3) an exit test, (4) a child process with `environment:`. `.serialized` is no protection and `.serialized(for:)` does not exist. A global actor serializing cwd users protects only callers that go through it. A Unix-domain socket path over the `sockaddr_un` limit is no reason to `chdir`, shorten the per-test root instead (`SW-TEST-19`). | Suites run concurrently in one process, and the environment block, cwd and umask belong to the process. Planted pairs were red 48 of 50 (env), 32 of 50 (cwd) and 30 of 30 (umask) and green 0 of 50 when injected, with no compiler diagnostic. A `getenv` racing `setenv` killed the test process on the 6.3 image (SIGSEGV), and `swift test` then exits 1 and prints `Program crashed`. POSIX: `setenv` "need not be thread-safe". | Block `sw-test-18`, gate then added lines, empty is the pass. `setenv(` also matches `unsetenv(`, `Glibc.setenv(`, `POSIX.setenv(` and a method named `setenv` (rename it or mark the line). Never exempt a whole file that holds an exit test, that hid a leak. A SwiftLint `custom_rules` regex is an optional carrier and works only on the SourceKit-enabled binary, the static `swiftlint` exits 0 on the red plant. Behavioural: `swift test --maximum-repetitions 50 --repeat-until fail` (6.4+). Watched red (measured 2026-10-10) for the `Tests/` half. The production half is a reading heuristic: `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e 'ProcessInfo.processInfo.environment' -e 'getenv(' -e 'currentDirectoryPath' Sources` should list the composition root and the spawn module only. | MUST for `Tests/` · SHOULD for the production half |
| SW-TEST-19 | A test never names a temp path or a port that another test or process can also name. Temp: `FileManager.default.temporaryDirectory.appendingPathComponent("fx-\(UUID().uuidString)")`, created per test and removed in `defer`, with no `/tmp` or `/var/tmp` literal and no literal file name directly under the shared temp directory. Port: bind to port 0 and read the bound port back (`getsockname` or the server's reported address). A distinct hard-coded port per test is not a fix. A hit passes only on a line ending `// literal ok: reason` (an OCI reference that is parsed and never dialled). Order (SHOULD): sort, or compare as `Set` or dictionary, and never assert on `Dictionary` or `Set` iteration. `SWIFT_DETERMINISTIC_HASHING=1` reproduces an order failure for triage and is never committed. | Two tests writing one fixed file and binding one fixed port were 30 of 30 red on both toolchains, and 0 of 50 with a per-test directory and port 0. A `Dictionary` render asserted in iteration order was red 28 of 30 on 6.4 and 30 of 30 on 6.3 (a new hash seed per process). | Block `sw-test-19`, empty is the pass. Expect parse-only address literals in mature trees (nio 60 hits, hummingbird 6) and, in a protocol library, port values that are message fields and never bound (swift-nio-ssh prints 15 lines: the `.listen(host:port:)` and `.cancel` forwarding requests, `originatorAddress` and `firstPort:` fixtures, measured 2026-10-10): mark each `// literal ok:` or take the port inventory from bind sites (`bind(`, `serverBootstrap`). A temp name built from a variable or a port reached through a helper is invisible (reading heuristic, as is order: `Array(d.keys)` or `Array(set)` flowing into an `==` assertion). On a legacy tree the same patterns are an inventory (183 test files carry a `/tmp` literal in the corpus, most never opened). Watched red (measured 2026-10-10): five literal shapes flagged, the twin clean. | MUST for temp path and port · SHOULD for order |

```swift
// wrong: a process-global write the compiler accepts, racing every other suite
@Test func readsEndpoint() throws {
    setenv("SDK_ENDPOINT", "http://x", 1)
    #expect(try endpoint() == "http://x")
}

// right: the value is a parameter, production reads the environment once at its composition root
@Test func readsEndpoint() throws {
    #expect(try endpoint(environment: ["SDK_ENDPOINT": "http://x"]) == "http://x")
}
```

## Compile or Run the Suite

```sh
env SWIFT_TESTING_XCTEST_INTEROP_MODE=complete swift test -Xswiftc -warnings-as-errors   # sw-test-10, gate-block step 3
swift --version                                                      # same job, must print 6.4 or later
swift test && swift test -c release                                  # sw-test-11, both exit 0 on a compliant suite
swift test --no-parallel                                             # sw-test-14 step 1, never committed
swift test --filter MyTests --repeat-until fail --maximum-repetitions 100   # sw-test-14 step 2, 6.4 and later, Swift Testing only (an XCTest suite needs a shell loop)
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-TEST-10 | CI pins XCTest interop to `complete` on every 6.4+ test leg whose manifest tools version is below 6.4, and asserts the toolchain is 6.4 or later. Gate-block step 3 carries the `env` prefix above. Never use `strict` (it ends in `Fatal error`, SIGILL, not a failing test). Never rely on an empty or invalid value (6.4.0 treats it as `limited`). | Toolchain 6.4 with tools below 6.4 is `limited`, so an `XCTAssert` inside `@Test` is a warning and the gate still exits 0. A toolchain below 6.4 ignores the variable, so a green there proves nothing. SwiftPM sets `complete` itself only at tools 6.4 or later, so CLIs and servers at tools 6.4 need no variable (swift-package-manager `TestingSupport.swift`, read 2026-10-10). | The command above exits non-zero on a fixture whose `@Test` calls an XCTest helper. The version assertion (`swift --version` in the same job) is a reading heuristic. Watched red (measured 2026-10-10): `complete` exits 1, `limited` and `none` exit 0, a 6.3 toolchain with `complete` exits 0. | MUST for libraries and the SDK, not needed at tools 6.4 |
| SW-TEST-11 | Each documented trap is covered by an exit test, and the contract is `precondition`, never `assert`. `await #expect(processExitsWith: .failure) { ... }` for traps, `.exitCode(n)` for a defined `exit(n)`, a capture list `{ [n] in ... }` for parameters (6.3+; on 6.2 write the values as literals inside the closure). Below a 6.2 floor exit tests do not exist: use the out-of-process harness of `SW-TEST-15` and assert the trap's status as a separate fact. Never assert on the trap's message text, never `.signal(_)` (architecture-dependent), and run `swift test -c release` as well when release behaviour matters. | `assert` is compiled out in release, so the exit test goes red there. A `precondition` message is absent from release stderr, and `-Ounchecked` removes the precondition (`SW-ERR` bans that flag). A trap with no test is the CVE shape recorded in `SW-ERR`. | Both commands in the block exit 0 on a compliant suite. `swift build --build-tests` rejects invented spellings (`exitsWith:`, `.crash`, a missing `await`). `grep -Rn --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' -e 'assert(' --include='*.swift' Sources` is a reading heuristic that lists contracts a test may lean on (expect noise, nio lists 329 lines), review each. Watched red (measured 2026-10-10). `@testable import` also works under `-c release`. | MUST where a documented trap exists |
| SW-TEST-12 | `confirmation()` wraps the wait, and time-driven logic takes an injected clock. The closure must not return before the event, so bridge a callback with `withCheckedContinuation` or consume the `AsyncStream` inside it. Use `expectedCount:` ranges for nondeterministic counts. A pure `async` API needs no confirmation, only `await`. Retry, backoff and timeout code takes `some Clock` and the test injects an immediate clock (a `final class` of about 20 lines, the stdlib has none). | A confirmation made after the closure returns is not counted ("confirmed 0 times"). The clock tests a 30 s backoff in 1 ms. | Run the test: a fire-and-forget confirmation fails deterministically with exit 1. Reading heuristic: a `confirmation` closure with no `await` inside. Watched red (measured 2026-10-10) on both toolchains, with a sleep-based twin passing. | SHOULD |
| SW-TEST-13 | Every end-to-end or externally waiting test carries `.timeLimit`, the code under test waits cancellably, and the CI job has its own wall-clock timeout. `.timeLimit(.minutes(1))` has minute granularity. A live-child suite (the `LiveSpawn` suite of `SW-TEST-20`, or the fake-CLI tests of `SW-API-13`) is such a test. | The limit cancels the body, so it rescues `Task.sleep` (red at exactly 60.000 s) and cannot rescue an uncancellable `withCheckedContinuation` or a thread blocked in `waitUntilExit()` (both hung past 300 s). | Reading heuristic, no grep exists because a test and its helper live in different files. Behavioural: the cancellable plant fails with `Time limit was exceeded: 60.000 seconds`. The workflow's `timeout-minutes` is unverified here and belongs to `SW-GATE`. | SHOULD |
| SW-TEST-14 | Triage a flake in this order, and fix the isolation, never commit the flag. First `swift test --no-parallel`. If green, apply `SW-TEST-04`, `SW-TEST-05`, `SW-TEST-18` and `SW-TEST-19`. For an intermittent failure on 6.4+ run `swift test --filter MyTests --repeat-until fail --maximum-repetitions 100`. On 6.3.3 use a parameterized repeat, `@Test(arguments: 0..<100)` over the suspect body, whose cases run concurrently in one process. `--num-workers` and `--parallel` do nothing for Swift Testing. `--repeat-until` and `--maximum-repetitions` act on Swift Testing only: on an XCTest-only suite they exit 0 after one execution (a planted XCTest that fails every third run printed `Executed 1 test` and passed), so XCTest needs a shell loop that runs `swift test --filter MyTests` up to 100 times and stops at the first non-zero exit and a run that executed 0 tests is not a pass. A committed `--no-parallel` is acceptable only for suites that measure timing. A test-process crash (`Program crashed`) exits 1, not 139. | Each step rules out one cause before the next, and `--no-parallel` alone hides interference instead of fixing it. | `swift test --repeat-until fail --maximum-repetitions 50` exits 0 on the fixed suite and 1 on the racy one (6.4). On 6.3.3 the same flag exits 64 and the 100-case parameterized repeat exits 1 on a planted flake and 0 on its twin. Watched red (measured 2026-10-10) on 6.4.0 and 6.3.3. | SHOULD |

```swift
// wrong: the closure returns before the callback fires, so the confirmation counts 0
await confirmation { done in
    service.start { done() }
}

// right: the closure does not return until the event has happened
await confirmation { done in
    await withCheckedContinuation { (resume: CheckedContinuation<Void, Never>) in
        service.start {
            done()
            resume.resume()
        }
    }
}
```

## Out-of-Process Harness

The harness is `swift test` itself. `SW-TEST-15` is a run against the built product, so it has no extra gate command.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-TEST-15 | A CLI, and the SDK's process layer, has end-to-end tests that run the built executable out of process and assert stdout, stderr and exit status as three separate facts: empty stdout on error paths, empty stderr on success paths, streams never concatenated. Use swift-subprocess (`output: .string(limit:)`, `terminationStatus == .exited(n)`) or `Process` with both streams redirected to temp files. Locate the product beside the test binary through `CommandLine.arguments[0]` (not `CommandLine.executablePath`, absent in 6.4, and not a hard-coded `.build/debug`). Throw when the executable is missing, and never add an `#if os(Windows) return` shortcut. Every such test carries `.timeLimit` (`SW-TEST-13`). Pipes are never read after `waitUntilExit()` (`SW-IO-25`). For the SDK the process layer runs against a real child, the fake CLI of `SW-API-13` or the `LiveSpawn` suite of `SW-TEST-20`, and behind `SW-TEST-06`'s gate the real wrapped CLI. | Separate-stream and exit-code bugs are the contract: error text on stdout with exit 0 passes a merged-output test. The `Pipe` then wait shape deadlocks above the 64 KiB pipe buffer (1 MiB planted, killed at 110 s). swift-argument-parser's own harness does this and merges streams, so do not copy it (`TestHelpers+SwiftTesting.swift`, read 2026-10-10). | The check is `swift test --filter` against a product built from each variant: the buggy CLI plant exits 1 with 3 issues, the compliant one exits 0. `grep -Rn -e '\bPipe()' --include='*.swift' Tests` lists pipe uses, and a file in the list must not call `waitUntilExit()` before reading. Watched red (measured 2026-10-10) on swift-subprocess 1.0.1, tools 6.2, toolchain 6.4. | MUST for CLIs and the SDK |

```swift
let mycli = ProductLocator.path("mytool")  // a FilePath found through CommandLine.arguments[0], see the rule

@Test(.timeLimit(.minutes(1))) func missingNameIsAUsageError() async throws {
    let r = try await run(
        .path(mycli), arguments: ["greet"], output: .string(limit: 65_536), error: .string(limit: 65_536))
    #expect(r.standardOutput == "")
    #expect(r.standardError.contains("missing NAME"))
    #expect(r.terminationStatus == .exited(64))
}
```

## Spawn Seam and Recorded Fixtures

Scope, the pinned default: `SW-API-13` owns the SDK's test design. `SW-TEST-20`, `SW-TEST-21` and `SW-TEST-22` bind a CLI core and any
SDK that keeps a replacing runner, which is what "where a replay seam exists" means below. Recorded fixtures stay useful for an
`SW-API-13` SDK's mapping logic too.

```sh
# sw-test-20: spawn APIs outside the spawn module (rename Sources/OcxSdkProcess/ to your spawn module's directory)
grep -RnE --exclude-dir=Fixtures --exclude-dir=TestUtils --exclude-dir='*.playground' --include='*.swift' -e '\bProcess\(\)' -e 'import Subprocess' -e '\b(posix_spawn[p]?|popen|system|execv[pe]?|fork)\(' Sources \
  | grep -v '^Sources/OcxSdkProcess/'

# sw-test-21: path-by-location lookups, then the .process manifest check, then the provenance presence check
grep -RnE --include='*.swift' -e '(URL|FilePath)\(.*#file(Path)?\b' -e '(forReadingAt|fileURLWithPath|atPath|contentsOf):? *[^,)]*#file(Path)?\b' \
  -e 'deletingLastPathComponent.*#file' -e 'contentsOfFile: "' -e 'FileManager\.default\.currentDirectoryPath' -e '"(\./)?Tests/' Tests
grep -n -e '\.process(' Package.swift
find -L Tests -path '*/Fixtures/cli/PROVENANCE.md' | grep -q .      # exit 0 is the pass, exit 1 means missing
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-TEST-20 | Where a replay seam exists, the spawn is a substitutable seam owned by exactly one module, and the unit and coverage run starts no process. Only the spawn module imports `Subprocess` (`SW-IO-26`) or constructs a `Process`. The core receives the runner by injection and never builds the live one, and tests inject a literal. The seam is a value a test can replace, a struct holding a `@Sendable async throws(ProcessFailure)` closure or a protocol with the same `run` signature, carrying every parameter of `SW-IO-26`'s `run`. The live adapter has its own `LiveSpawn` suite (real children, `.timeLimit`), the coverage run passes `--skip LiveSpawn` (a regex on test names, `swift test` has no tag filter, so a `.tags(.spawns)` tag filters nothing) and a separate CI step runs it. Keep the excluded file to the lines that call the spawn API and put pure mapping (termination status to exit code, error mapping, `path` or `name` dispatch) in covered code as a function of plain values (SHOULD, reading heuristic). | Replaying seven recorded cases covered 25 of 25 core lines and 19 of 19 core regions with no child started. A core that calls `Process()` inline cannot be tested without the CLI installed. The Python original does the same through `PopenFactory`, `ExecFactory` and `Clock` seams. | Block `sw-test-20`, output is a spawn API outside the spawn module, empty is the pass (`system(` and `fork(` can also match a method of those names, rename it or move it). Behavioural: the default unit run passes on a machine with no wrapped CLI on `PATH` (not run). Watched red (measured 2026-10-10): the inline `Process()` plant prints its line, the seam twin prints nothing, and the widened spawn synonyms catch 4 shapes where `Process()` alone caught 2. | MUST where a replay seam exists · SHOULD for a CLI core |
| SW-TEST-21 | Recorded CLI output is a fixture directory per case, located through the resource bundle, guarded by an inventory test and a provenance file. Layout `Tests/<Target>/Fixtures/cli/<case>/{stdout,stderr,exit}`, three byte-exact files so `SW-TEST-15`'s three facts stay separate. Manifest `resources: [.copy("Fixtures")]`, never `.process`, which flattens the tree and fails the manifest with `multiple resources named 'stdout'`. The loader reads through `Bundle.module` and throws when the bundle or a file is missing, it never returns early or skips. No `#filePath`, `#file`, cwd-relative or `"Tests/..."` literal path. One parameterized table of cases, plus a test asserting that the directory set equals the table's recording names. A `PROVENANCE.md` beside the cases names the CLI version and the capture command. The replay closure records the argv it receives and the test asserts it (SHOULD, unwatched). | After the source tree moved, `Bundle.module` stayed green while `#filePath` and the cwd-relative path failed (`NSCocoaErrorDomain Code=260`). An orphan directory, a table row without a recording and a recording without a row each exit 1, but only because the loader and the inventory test cooperate. A prebuilt test bundle breaks `#filePath` the same way (unverified: read only). | Block `sw-test-21`. The first command's output is the violations, the second's output is a `.process` on the fixtures directory, both empty is the pass. The `find` check exits 1 when the file is missing. Behavioural: deleting a recording, adding an orphan directory or deleting a table row each makes `swift test` exit 1. Watched red (measured 2026-10-10): location grep 3 lines on the plant and 0 on the twin, `.process` grep 1 line, provenance check exit 1 then 0. The argv assertion and Windows or Apple resource lookup are not watched. | MUST where a replay seam exists · SHOULD otherwise |

## CI Legs

```sh
# sw-test-16: lines gate over Sources/. SDK: MIN=100. Any other kind: read -r MIN < coverage-floor.txt
command -v jq >/dev/null || { echo 'sw-test-16: needs jq' >&2; exit 69; }
swift test --enable-code-coverage
MIN=100
swift test --show-codecov-path | tail -1 | xargs -r jq -e --arg root "$PWD" --argjson min "$MIN" \
  '[.data[0].files[] | select(.filename | startswith($root + "/Sources/"))] | ((map(.summary.lines.covered) | add) / (map(.summary.lines.count) | add) * 100) as $pct | ($pct >= $min)'

# sw-test-22: replay-seam core, lines and regions over the core prefix (rename Sources/OcxSdk/), adapter skipped by name
swift test --enable-code-coverage --skip LiveSpawn
swift test --show-codecov-path | tail -1 > codecov-path.txt
read -r P < codecov-path.txt
: "${P:?swift test printed no codecov path}"
for m in lines regions; do
  jq -e --arg root "$PWD/Sources/OcxSdk/" --arg m "$m" --argjson min 100 \
    '[.data[0].files[] | select(.filename | startswith($root))] | ((map(.summary[$m].covered) | add) / (map(.summary[$m].count) | add) * 100) as $pct | ($pct >= $min)' \
    "$P" > /dev/null || { echo "gate failed on $m"; exit 1; }
done

# sw-test-17: the ASan leg (the TSan job is SW-GATE-27)
swift test --sanitize=address --disable-xctest
# XCTest-only package, or a dependency leak: ASAN_OPTIONS=detect_leaks=0 swift test --sanitize=address
```

`jq` is not in the swift image, so the host or a CI step supplies it. The `sw-test-16` gate exits 0 when the threshold holds and 123
when it does not.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-TEST-16 | Compute a coverage threshold from `Sources/` lines of the JSON that `swift test --show-codecov-path` prints, never from `totals` and never from a hard-coded path. Floor by code kind: the SDK 100% lines on Linux legs only (owner default Q4), gated by `SW-API-13` over `Sources/` or by `SW-TEST-22` over the core where a replay seam exists. Every other kind gets a ratchet, the floor being the last merged value held in a committed file. Exclude code only by whole file in the jq filter or by structure, never by marker (no inline exclusion exists). | `totals` counts the test target and generated anchors (37.5% against 16.7% for `Sources/`). The JSON path differs between engines (6.4 `out/Products/Debug-linux-x86_64/codecov/`, 6.3 `x86_64-unknown-linux-gnu/debug/codecov/`). Code reached only through a child that traps records no coverage (0 of 6 lines), so trap-only lines cap the SDK below 100%. | Block `sw-test-16`: exit 0 passes, 123 fails. Watched red (measured 2026-10-10): `false` and exit 123 against 90 on a 16.7% export, exit 0 on the full-coverage twin, a floor file of 16 gives 0 and of 17 gives 123. | MUST for the SDK · SHOULD otherwise |
| SW-TEST-17 | Sanitizers are their own CI jobs. An ASan leg may gate: `swift test --sanitize=address --disable-xctest` (or `ASAN_OPTIONS=detect_leaks=0`) in debug. `--disable-xctest` skips every XCTest case, so on an XCTest-only package it exits 0 with `Test run with 0 tests in 0 suites passed`, a vacuous green: use the `detect_leaks=0` form there (`ASAN_OPTIONS=detect_leaks=0 swift test --sanitize=address` ran swift-prometheus's 40 XCTest cases, exit 0) and read the test count. A leak inside a dependency (swift-crypto's BoringSSL, 96 bytes under RSA key creation) also fails the leg: set `ASAN_OPTIONS=detect_leaks=0` rather than editing the dependency. The TSan leg is the job of `SW-GATE-27`, with its pass criteria, seccomp flag, no-suppressions rule and the `Swift access race` blind spot, none repeated here. Back every hatch-guarded type with a deterministic count assertion (`SW-CONC-27`). | Sanitizers find races and overflows an assertion does not. A clean package leaks about 400 bytes from libXCTest under ASan, hence `--disable-xctest`. | ASan with `--disable-xctest` exits 1 on a heap overflow and 0 on a clean package. Watched red (measured 2026-10-10) on 6.4.0 and 6.3.3. On swift-prometheus (XCTest only) the same command exited 0 with 0 tests run, and on jwt-kit it exited non-zero from the 96-byte dependency leak (measured 2026-10-10). The TSan evidence is `SW-GATE-27`'s. | SHOULD |
| SW-TEST-22 | Where a replay seam exists, the coverage gate checks lines and regions of the core prefix at 100, and code that cannot be covered lives in its own excluded file. The loop runs the `SW-TEST-16` filter once per metric over the core directory (the regions floor is a default pending a regions ratchet). The spawn adapter's file is excluded by path and covered by the `LiveSpawn` suite as a contract test, not toward the bar. A function-name allowlist (mangled symbols) is a last resort and carries a comment per entry. Comment markers (`LCOV_EXCL_*`, `coverage:ignore`), `#sourceLocation`, `@_transparent`, `@_semantics` and `#if` build switches are not exclusions and are never used to fake one. An `SW-API-13` SDK gates `SW-API-13`'s lines over `Sources/` instead and reports regions until a ratchet records a reason per unreachable region. | The lines gate stayed green (25 of 25) when a recorded case and its table row were deleted, because `case 64: throw .usage(...)` is one line executed by every exit code reaching the `switch`. The regions gate went red (18 of 19). No marker changed any count. Whole-file exclusion avoids chasing error arms that cannot be forced, but it is the fallback for code that cannot be forced, not a requirement. | Block `sw-test-22`: exit 0 passes, exit 1 names the failing metric. Marker grep: `grep -Rni --include='*.swift' -e 'LCOV_EXCL' -e 'coverage:ignore' -e 'cov-ignore' -e 'excluded from coverage' Sources Tests`, output is a violation, empty is the pass. Watched red (measured 2026-10-10): the loop exits 1 naming `regions` when a case is deleted (a lines-only run exits 0), exit 0 on the twin, and the marker grep prints the 5-marker plant. Re-check the LLVM issue at 6.5. | MUST where a replay seam exists |

## Smaller Rules

```sh
# sw-smaller: in order, the sw-test-06 inventory, sw-test-07 unguarded exit-test files, sw-test-08 experimental knobs, sw-test-09 non-zip arguments
grep -RPzo --include='*.swift' '#if[^\n]*\bos\([^\n]*\n(?:(?!#endif)[^\n]*\n)*?[^\n]*(@Test\b|func test\w*\()[^\n]*' Tests | tr '\0' '\n'
grep -RlZ --include='*.swift' -e 'processExitsWith' Tests | xargs -0 -r grep -L -e 'compiler(>=6.2)' -e 'EXIT_TESTS'
grep -Rn --include='*.swift' --include='*.yml' --include='Makefile' --exclude-dir='.build*' \
  -e 'SWT_EXPERIMENTAL' -e '_spi(Experimental)' -e 'serialized(for' .
grep -RnE -e '@Test\(arguments: [^z].*\], *\[' --include='*.swift' Tests

# sw-test-23: test targets missing the feature (meaningful only when the library targets enable it)
command -v jq >/dev/null || { echo 'sw-test-23: needs jq' >&2; exit 69; }
swift package dump-package | jq -r '.targets[] | select(.type=="test")
  | select(([.settings[]?.kind.enableUpcomingFeature?._0?] | index("NonisolatedNonsendingByDefault")) == null) | .name'
```

The guard `SW-TEST-07` asks for, around the exit-test suite:

```swift
#if compiler(>=6.2) && (os(macOS) || os(Linux) || os(FreeBSD) || os(OpenBSD) || os(Windows))
    // exit-test suite
#endif
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| SW-TEST-06 | Skips are visible. Use traits or `Test.cancel` (6.3+) for runtime conditions, `#if` only for code that does not compile, and never an early `return`. A gated tier (the SDK's contract tests against the real CLI, behind `OCX_SDK_CONTRACT=1`) uses `.enabled(if: ProcessInfo.processInfo.environment["OCX_SDK_CONTRACT"] == "1", "set OCX_SDK_CONTRACT=1")`. `Test.cancel` returns `Never`, so code after it warns "will never be executed", an error under `-warnings-as-errors`. | A trait skip prints `skipped:`, while an `#if`-removed or early-returning test passes or vanishes. swift-argument-parser's harness returns `""` under `#if os(Windows)`, a vacuous pass (read 2026-10-10). | The run prints `skipped:` or `was cancelled` lines for the gated tests (watched, exit 0 on 6.4 and 6.3). The first command in block `sw-smaller` prints each `#if` on an `os(` condition (`#if os(`, `#if !os(`, `#if compiler && os(`) that encloses a `@Test` or a `func test` before its `#endif`, a reading heuristic: a gate around a platform API (`import AppKit`) is the compliant use and prints nothing, a gate that removes a test that compiles everywhere is the finding. Watched (measured 2026-10-10): the plant with `#if !os(Windows)` around an `@Test` prints the block, the twin with `#if os(macOS) import AppKit #endif` prints nothing, and Mint prints its one gated `func test` block. The old `#if os(` line grep missed the `#if !os(` spelling. | SHOULD |
| SW-TEST-07 | Exit-test files are guarded for compiler and platform with the `#if` above, or a package-level define as swift-foundation does. | iOS and WASI have no exit tests and the macros are `unavailable`, so an unguarded file breaks `swift build --build-tests` there (unverified: read only). | Second command in block `sw-smaller`: output is unguarded files, so read the output because `-L` inverts the exit codes (xargs exits 123 when a batch lists files and none matched, and 0 for a batch that also holds a matching file). Watched red (measured 2026-10-10): unguarded file listed, guarded file silent and still passing `swift test`. | SHOULD |
| SW-TEST-08 | No experimental Swift Testing knobs in your code. No `SWT_EXPERIMENTAL_*` variable, `@_spi(Experimental)` import or `.serialized(for:)`. | They are documented as "not an API contract". The global-serialization variable did not turn the split-suite plant green. `.serialized(for:)` has three `@_spi(Experimental)` overloads in the 6.4.0 tag, and even `@_spi(Experimental) import Testing` fails to compile on 6.3 and 6.4 (exit 1) because the shipped interface lists only the public `serialized` property. | Third command in block `sw-smaller`, output is a violation, empty is the pass. `swift build --build-tests` also rejects the call. Watched red (measured 2026-10-10): plant prints 3 lines, twin none, and the compile proof has no green twin. Re-check at 6.5. | SHOULD |
| SW-TEST-09 | Paired inputs use `zip`. `@Test(arguments: a, b)` is a Cartesian product, so read the reported `with N test cases` against the intended count. | Three intended pairs silently became six cases. | The `with N test cases` line in the run. The fourth command in block `sw-smaller` lists two collections on one line, a reading heuristic that still lists some single-collection tests (expect noise). Watched red (measured 2026-10-10): 6 cases against 3. | CONSIDER |
| SW-TEST-23 | Every test target of a module that enables `NonisolatedNonsendingByDefault` enables it too, by name. The 6.4 template's `ApproachableConcurrency` on a test target is replaced by the member names (`SW-CONC-12`). A test-target `nonisolated async` helper is written for that semantics and not pasted into a target without it (`SW-CONC-07` governs existing code). | Measured for `@MainActor` tests only. With the feature off, a `nonisolated async` helper trapped on a hop (`Actor.preconditionIsolated`, exit 1) and passing a main-actor value failed to compile (`SendingRisksDataRace`, exit 1). With it on, both pass on 6.3 and 6.4. `Thread.isMainThread` is not a valid detector on Linux, use `MainActor.preconditionIsolated()` or the compile diagnostic. | Block `sw-test-23`, output is test targets missing the feature, empty is the pass. Watched red (measured 2026-10-10): the off fixture prints its test target, the on fixture prints nothing. | SHOULD |
| SW-TEST-24 | SDK contract tests use a plain `import` of the public module. `@testable import` is for white-box suites only. A fake is a hand-written value behind the seam, and no mock macro is added unless the protocol already exists for production reasons. Recordings or fakes used by a second test target move to a `<Package>TestSupport` library target that only test targets depend on. | The same code with `@testable import` compiled and passed (exit 0) while the public type had no public `init`, and with a plain `import` it failed to compile (exit 1). Mocking in the corpus is hand-written, 128 files declaring `Mock*` types in 12 repos, and only tuist depends on a mock framework. | `grep -Rn --include='*.swift' -e '@testable import' Tests`: a hit is a finding only in a contract suite (white-box suites use it by design, Nuke 157 and nio 100 hits). `grep -Rn --include='Package.swift' -e 'Mockable' -e 'Cuckoo' -e 'Mockolo' -e 'SwiftyMocky' .` prints mock-framework dependencies, empty is the pass. Watched red (measured 2026-10-10): plant 1 line, plain-import twin 0. | SHOULD |

## What Agents Get Wrong Here

Ranked by how often each bites.

1. **A new test written as `final class FooTests: XCTestCase`.** Habit from pre-2024 training, and it still compiles (`SW-TEST-01`).
2. **Sleep, then assert.** Green on a laptop, red under load (`SW-TEST-03`, `SW-TEST-12`).
3. **`setenv`, `chdir` or `umask` in a `@Test`, copying XCTest `setUp` or pytest `monkeypatch` habits.** It compiles silently, flakes
   48 of 50 runs and can crash a 6.3 image. A green run on a newer glibc proves nothing (`SW-TEST-18`).
4. **`.serialized` as the fix for shared state.** On a plain `@Test` it does nothing, and two serialized suites still race each other
   (`SW-TEST-04`, `SW-TEST-05`).
5. **An old XCTest helper called from an `@Test`, or `throw XCTSkip` and `XCTestExpectation`.** A silent pass below 6.4, a warning
   under `limited`, and a green gate (`SW-TEST-02`, `SW-TEST-10`). Setting the interop variable on a 6.3 toolchain and trusting the green is the same hole.
6. **A fixed temp path or port** (`/tmp/test.json`, `127.0.0.1:8080`), or an assertion on `Dictionary` order (`SW-TEST-19`).
7. **Copying swift-argument-parser's `Pipe`, `waitUntilExit()`, read harness**, merging streams, or returning early on Windows
   (`SW-TEST-15`, `SW-TEST-06`).
8. **Hallucinated isolation or exit-test API.** `.serialized(for: \Env.self)`, `.taskLocal(_:withValue:)`, `#expect(exitsWith:)`,
   `.crash`, a missing `await`, `assert` as the contract, or asserting the trap message (`SW-TEST-08`, `SW-TEST-11`).
9. **Locating fixtures with `#filePath`, `.process("Fixtures")` or a directory listing feeding `arguments:`.** A deleted fixture then
   drops a case silently (`SW-TEST-21`).
10. **A lines-only coverage gate, `// LCOV_EXCL_LINE` expecting it to work, or reading `.data[0].totals`** (`SW-TEST-16`, `SW-TEST-22`).
11. **Spawning the real CLI inside SDK core code** and testing only on machines that have it (`SW-TEST-20`).
12. **Wrong Swift Testing flags.** `--num-workers 1` or `--parallel` for control, `--repeat-until` on a 6.3 toolchain (`SW-TEST-14`).
13. **TSan red on `Mutex` code read as a real race, TSan green read as proof, or ASan red on a fresh package disabled** (`SW-TEST-17`, `SW-GATE-27`).
14. **An exit-test file with no platform guard** (`SW-TEST-07`), or `confirmation { c in service.start { c() } }` without awaiting
    (`SW-TEST-12`).
15. **`@Test(arguments: [1, 2, 3], ["a", "b", "c"])` expecting pairs** (`SW-TEST-09`).
16. **Pasting a pre-`NonisolatedNonsendingByDefault` `nonisolated async` helper into a target without the feature, `@testable import`
    everywhere, or reaching for a mock framework for a closure-sized runner** (`SW-TEST-23`, `SW-TEST-24`).
17. **`@unchecked Sendable` test doubles with unprotected state, "verified" by a passing run.** Add a deterministic count assertion
    and the TSan leg (`SW-TEST-17`).

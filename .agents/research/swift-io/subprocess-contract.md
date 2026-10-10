---
title: "swift-subprocess 1.0.1, Foundation.Process pitfalls and child teardown"
topic: "SW-IO / W2-11 io/subprocess-contract (rows M-G-06..M-G-09, M-I-06)"
agent: "W2-11 subprocess-contract"
model: sonnet
date_researched: 2026-10-10
sources_count: 21
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/subprocess-contract/
scope: |
  Covered: the swift-subprocess 1.0.1 API as it matters to a rule author (run overloads, output limits, errors, termination status, teardown, platform options, traits, tools-version floor), the same behaviours measured on Linux with Swift 6.4.0 and 6.3.x, the legacy Foundation.Process pipe/cancel/environment hazards, command injection through a shell, and the wrapper shape the future Swift ocx SDK should use.
  Not covered: Apple-platform behaviour (no macOS here: every Darwin and Windows statement is marked "unverified: read only"), swift-argument-parser exit-code policy (SW-CLI), file/atomic-write rules (other SW-IO dives), pty/terminal programs, and SwiftPM's own `AsyncProcess` (TSC) internals.
---

# swift-subprocess 1.0.1, `Foundation.Process` pitfalls and child teardown

Date: 2026-10-10. Toolchains: Swift 6.4.0 (`swift:6.4`) and 6.3.x (`swift:6.3`), Linux x86_64 (Ubuntu 26.04 image with uutils coreutils), swift-subprocess tags `1.0.0` (`b3937ab85dd3`) and `1.0.1` (`55d30558b8b1`). Every behaviour claim marked RAN was watched on both toolchains unless said otherwise. macOS, Xcode and Windows were not available: those claims are marked "unverified: read only".

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The 1.0.1 API surface (the pin)](#1-the-101-api-surface-the-pin)
   2. [The requirement line and what 1.0.1 fixed](#2-the-requirement-line-and-what-101-fixed)
   3. [Output limits, decoding and non-zero exits](#3-output-limits-decoding-and-non-zero-exits)
   4. [Teardown: cancellation, body exit, process groups](#4-teardown-cancellation-body-exit-process-groups)
   5. [Environment and executable lookup](#5-environment-and-executable-lookup)
   6. [Command injection](#6-command-injection)
   7. [Foundation.Process: the rules for legacy code](#7-foundationprocess-the-rules-for-legacy-code)
   8. [The wrapper shape for the Swift SDK](#8-the-wrapper-shape-for-the-swift-sdk)
   9. [Traits and dependency weight](#9-traits-and-dependency-weight)
   10. [Tooling notes: what can and cannot be machine-checked](#10-tooling-notes-what-can-and-cannot-be-machine-checked)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Requirement line.** New process-spawning code depends on `.package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.1", traits: [])` with `// swift-tools-version: 6.2` and a CI/consumer toolchain of at least Swift 6.2. A Swift 6.1 toolchain cannot resolve it: `error: Dependencies could not be resolved because 'swift-subprocess' >= 0.5.0 contains incompatible tools version (6.2.0)` (RAN, exit 1; the `0.4.x` line resolves, exit 0).
- **Never `exact: "1.0.0"`.** 1.0.0 leaks one file descriptor per `run()` whose `.sequence` body stops reading early: 50 runs grew `/proc/self/fd` by 50 on 1.0.0 and by 0 on 1.0.1 (RAN, exit 1 vs 0, identical on 6.3 and 6.4). All six `swift-subprocess` pins in the 40-repo corpus fail the `from: "1.0.1"` rule (five are 0.x, swiftly is `exact: "1.0.0"`).
- **`traits: []` unless you need `Data`.** The default `SubprocessFoundation` trait links `libFoundationEssentials.so`; `traits: []` removes it (RAN: `ldd` count 1 vs 0, 3,514,368 vs 3,448,928 bytes release binary). The module still depends on `swift-system` (`SystemPackage`) on Linux.
- **A non-zero exit is a result, not a throw.** `run(...)` returns `terminationStatus` `.exited(7)`; only spawn, I/O and limit failures throw `SubprocessError` (RAN). Check `terminationStatus.isSuccess` at every call site; map `.signaled(n)` to `128+n` in the SDK (owner Q6 default).
- **Every collected stream needs an explicit `limit:`.** `.string`, `.bytes`, `.data` without a limit no longer compile (RAN: error `type '@Sendable (Int) -> StringOutput<Unicode.UTF8>' cannot conform to 'OutputProtocol'`). Overflow throws `SubprocessError` with code `.outputLimitExceeded`, tears the child down within milliseconds and leaves no process behind (RAN, even for `yes`); exactly `limit` bytes is accepted.
- **`.string(limit:)` is lossy.** Invalid UTF-8 becomes U+FFFD (RAN: bytes `61 ff 62` decode to scalars `61 fffd 62`). Use `.bytes(limit:)` for digests, archives and any binary stream.
- **Cancellation does not throw.** Cancelling the task that awaits `run()` makes it return normally with `terminationStatus == .signaled(9)` (RAN); a caller that wants to stop must check `Task.isCancelled` after `run()` returns.
- **Default teardown kills only the direct child.** With an empty `teardownSequence`, cancel sends SIGKILL to the child within 0.5 ms; a grandchild survives (`sh -c 'sleep 3004 & wait'`: `pgrep` exit 0, RAN). `createSession = true` plus `.gracefulShutDown(toProcessGroup: true, ...)` leaves nothing (`pgrep` exit 1, RAN).
- **Returning from the body does not stop the child.** A `.sequence` body that returns at once while the child sleeps 2 s makes `run()` wait the full 2.0 s (RAN); a child that keeps writing receives SIGPIPE and is reported as `.signaled(13)` (RAN). A body that throws triggers the teardown sequence (RAN: child killed in 2 ms).
- **`Executable.name` is PATH-only.** `.name("./tool")` and `.name("/bin/sh")` are rejected with `.spawnFailed` ("must not contain the path separator"); a tool in the working directory is never found, even with `PATH=.:/usr/bin` (RAN). Use `.path(...)` for a known location.
- **Environment overrides must reach `Subprocess.run`.** swiftly's `output(environment:)` sets `c.environment` on a copy and then runs `self.config()`: the child saw an empty `SENTINEL`, the fixed copy saw `reached-child` (RAN, exit 1 vs 0). `Environment.inherit.updating(["K": nil])` removes a key (RAN).
- **Injection rule.** Argument arrays only. `["-c", "echo \(userInput)"]` executed the planted `touch` (canary file created, exit 1); `[userInput]` and the positional form `["-c", "echo \"$1\"", "sh", userInput]` left no canary (RAN). The grep `C3a` found the planted lines and nothing in the compliant twin.
- **Legacy `Foundation.Process`: drain, then wait.** Reading a `Pipe` after `waitUntilExit()` hung at 256 MiB (`timeout 60` exit 124); concurrent drain exited 0 in the same run (RAN). The threshold is the kernel pipe capacity: 65,536 bytes completed, 65,537 hung. Two pipes drained one after the other deadlock at 1 MiB on stderr (RAN, exit 124).
- **Pipe capacity depends on the writer.** uutils `head`/`yes`/`cat` raise the pipe to 1 MiB, so a naive `head -c` reproducer hangs only above 1 MiB on this image; use a writer that does not call `F_SETPIPE_SZ` when you measure (the `emit` helper in the fixture).
- **`Process.environment` replaces, it does not merge.** Setting `["ONLY": "1"]` produced exactly `ONLY=1` in the child (RAN); merge with `ProcessInfo.processInfo.environment` first.
- **The SDK wrapper is one spawn point.** A 90-line `ProcessRunner` (stdout/stderr limits, `128+n`, `createSession` plus group teardown, race-with-timer timeout, closed `ProcessFailure` enum, no Subprocess types in the public API) passed nine behavioural cases, including a timed-out grandchild that left no process (RAN).
- **`run` is declared plain `throws`.** The "only `SubprocessError` escapes" guarantee is documentary (release note), so the wrapper needs `error as? SubprocessError`; do not match on `description` strings (RAN: compile error for `error.code` without the cast).
- **SwiftLint `custom_rules` is a silent no-op in the static Linux build.** `swiftlint 0.65.1` here printed `Skipping enabled rule 'custom_rules' because it requires SourceKit` and exited 0 on a planted violation: it did NOT go red, so grep and compiler diagnostics are the admissible checks.

## Findings

### 1. The 1.0.1 API surface (the pin)

Source reads: [README](https://github.com/swiftlang/swift-subprocess/blob/main/README.md), [release 1.0.0](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0), [release 1.0.1](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.1), [SF-0037](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md), [SF-0007](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0007-swift-subprocess.md), and the sources at tag 1.0.1 (`swift-subprocess@55d30558b8b1`).

**Six `run` overloads** (`swift-subprocess@55d30558b8b1:Sources/Subprocess/API.swift:37,83,141,189,223,261`). All are `async throws` (untyped), all return `ExecutionResult<ClosureResult, Output, Error>`:

| # | first parameter | input | closure | line |
|---|---|---|---|---|
| 1 | `Executable` + `arguments:`/`environment:`/`workingDirectory:`/`platformOptions:` | `Input: InputProtocol = .none` | none (collected) | `API.swift:37` |
| 2 | `Executable` | `borrowing Span<InputElement>` | none | `:83` |
| 3 | `Executable` | `Input` (required) | `body: (Execution<Input, Output, Error>) async throws -> Result`, `Result: ~Copyable` | `:141` |
| 4 | `Configuration` | `borrowing Span<InputElement>` | none | `:189` |
| 5 | `Configuration` | `Input = .none` | none | `:223` |
| 6 | `Configuration` | `Input` (required) | closure | `:261` |

- Collected overloads default `input: .none` and `error: .discarded`; `output:` has no default. Closure overloads require explicit `input:`, `output:`, `error:` ([release 1.0.0](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0) "A single `run()` closure form").
- `ExecutionResult` has `processIdentifier`, `terminationStatus`, `standardOutput`, `standardError`, `closureResult` and is `~Copyable` unless the closure result is Copyable; a move-only value leaves via `takeClosureResult()`.
- Streams: `execution.standardInputWriter` needs `input: .inputWriter`; `execution.standardOutput`/`standardError` need `.sequence`. `Execution`, `SubprocessOutputSequence` and `StandardInputWriter` are valid only inside the closure ([README](https://github.com/swiftlang/swift-subprocess/blob/main/README.md) CAUTION). `SubprocessOutputSequence` is single-pass: a second `makeAsyncIterator()` traps ([release 1.0.0](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0)). `.strings()` buffers lines up to 128 KB by default and throws beyond it.

**Output types** (README table; factory names verified by compilation): `.discarded`, `.fileDescriptor(_:closeAfterSpawningProcess:)`, `.currentStandardOutput`/`.currentStandardError`, `.string(limit:)`, `.string(limit:encoding:)`, `.bytes(limit:)`, `.data(limit:)` (trait `SubprocessFoundation`), `.sequence`, and for `error:` only `.combinedWithOutput` (the `ErrorOutputProtocol` refinement). Input types: `.none`, `.fileDescriptor`, `.currentStandardInput`, `.string`, `.array`, `Span`, `.inputWriter`, `.data`, `.sequence(_:)`.

**`SubprocessError.Code`** (`Error.swift:83-101`): `.spawnFailed`, `.executableNotFound`, `.failedToChangeWorkingDirectory`, `.failedToMonitorProcess`, `.failedToReadFromSubprocess`, `.failedToWriteToSubprocess`, `.outputLimitExceeded`, `.asyncIOFailed`, `.processControlFailed`. On Windows `WindowsError` is an enum (`.ntStatus`, `.win32`, `.hresult`, `.cRuntime`) (unverified: read only).

**`TerminationStatus`** (`Configuration.swift:766-772`):

| platform | cases | status |
|---|---|---|
| Linux, Darwin, BSD, Android | `.exited(CInt)`, `.signaled(CInt)` | Linux RAN (`signaled(9)`, `signaled(13)`, `signaled(15)`); others unverified: read only |
| Windows | `.exited(DWORD)` only; `.signaled` does not exist | unverified: read only |

`isSuccess` is true only for `.exited(0)`. The 0.x/beta name `.unhandledException` was renamed `.signaled` on Unix and removed on Windows (RAN: `type 'TerminationStatus' has no member 'unhandledException'`). `ProcessIdentifier` carries `value: pid_t` plus `processDescriptor` (a `pidfd` on Linux) so teardown cannot signal a recycled PID; the release note recommends the descriptor.

**`PlatformOptions`** (`Platforms/Subprocess+Unix.swift:671-725`): on Linux and non-Darwin Unix `userID`, `groupID`, `supplementaryGroups`, `processGroupID`, `createSession`, `teardownSequence`; the `preSpawnProcessConfigurator` escape hatch exists only on Darwin (`posix_spawnattr_t`/file actions) and Windows (`dwCreationFlags`/`STARTUPINFOW`). macOS adds `qualityOfService`. Windows adds user credentials (internal in 1.0), console behaviour, window style. All of Darwin/Windows: unverified: read only.

**`TeardownStep`** (`Teardown.swift:53,85`): `.send(signal:toProcessGroup:allowedDurationToNextStep:)` (Unix only) and `.gracefulShutDown(toProcessGroup:allowedDurationToNextStep:)`. `.gracefulShutDown` is SIGTERM on Unix; on Windows `WM_CLOSE`, then `CTRL_C_EVENT`, then `CTRL_BREAK_EVENT` (unverified: read only). The sequence always ends with an implicit `.kill`.

**Platform matrix** (README): macOS, Ubuntu 22.04/24.04, UBI 9, Debian 12, Amazon Linux 2023, Windows 11, Android, FreeBSD are tested in CI; the **static Linux SDK is "Build only"**, OpenBSD manual. This matters for the fleet's static-musl CLI path (map conflict 17 context).

**README drift (read, not run).** The README's Getting Started block still says `.upToNextMinor(from: "0.4.0")` and its first example comments `// e.g. Optional("LICENSE\nPackage.swift\n...")`, while its own Swift-versions table lists `1.0.x`, and `StringOutput.OutputType` is non-optional since 1.0.0. An agent copying the README snippet pins the pre-1.0 line. SF-0037's header still says "Second review: 2026-07-10...2026-07-17" although 1.0.0 shipped 2026-08-04.

### 2. The requirement line and what 1.0.1 fixed

[Release 1.0.1](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.1) (2026-10-09, "bug fix release with no API changes"):

1. `.sequence` output/error pipes closed only at EOF, so breaking out of `for try await` leaked one fd per `run()` without bound (#369).
2. Pipes now created with `pipe2(O_CLOEXEC)` and duplicates with `F_DUPFD_CLOEXEC`; before, a separate `fcntl()` left a window in which a process launched from another thread inherited the descriptor (#373). Darwin keeps the old creation until its SDK declares `pipe2`.
3. `supplementaryGroups: []` now calls `setgroups()` and drops groups; an unprivileged process now fails with `.spawnFailed` (EPERM) (#384).
4. `posix_spawn` is preferred on Linux/FreeBSD (`clone(CLONE_VM | CLONE_VFORK)`), falling back to fork/exec (#365).

**Plant (a), RAN** (`plant.sh 1.0.0 a` / `1.0.1 a`, fixture `pkg/Sources/leak`): 5 warm-up runs, then 50 `run(.path("/usr/bin/printf"), output: .sequence)` calls whose body does `for try await _ in execution.standardOutput { break }`, counting `/proc/self/fd`:

| toolchain | 1.0.0 `break` | 1.0.0 full drain | 1.0.1 `break` | 1.0.1 full drain |
|---|---|---|---|---|
| 6.4 | `before=17 after=67 delta=50`, exit 1 | `delta=0`, exit 0 | `delta=0`, exit 0 | `delta=0`, exit 0 |
| 6.3 | identical | identical | identical | identical |

The leak is specific to the early exit, which is why an agent that always drains never sees it.

**Requirement line, decided.**

```swift
// swift-tools-version: 6.2
dependencies: [
    .package(url: "https://github.com/swiftlang/swift-subprocess", from: "1.0.1", traits: []),
],
// target:  .product(name: "Subprocess", package: "swift-subprocess")
```

- **Toolchain floor 6.2, not manifest floor.** The README table says `swift-subprocess 1.0.x` needs Swift >= 6.2 (Xcode >= 26), and the 1.0.1 manifest is `// swift-tools-version: 6.2` (`Package.swift:1`). The root manifest's tools version does not have to be 6.2: a root declared `6.1` built fine with the 6.4 toolchain (RAN, exit 0); only the toolchain matters (`traits:` on `.package` needs a root tools version of 6.1+, [SE-0450](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0450-swiftpm-package-traits.md)). The program's library floor is tools 6.2 (owner Q1), so declare 6.2 and the floor is self-consistent.
- **Resolver proof, RAN** with `swift:6.1`: `from: "1.0.1"` fails (`swift package resolve` exit 1, "contains incompatible tools version (6.2.0)"), `.upToNextMinor(from: "0.4.0")` resolves (exit 0). The 0.4 line is the last for Swift 6.1 ([release 1.0.0](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0) "Swift 6.2 is now required").
- **`from:` not `exact:`.** SwiftPM applications get determinism from `Package.resolved`; an `exact:` in a library blocks resolution for every consumer, and swiftly's `exact: "1.0.0"` is precisely the pin that holds the leak (`swiftly@c8cf2e35bfca:Package.swift:34`). Patch releases do not raise the toolchain floor ([README](https://github.com/swiftlang/swift-subprocess/blob/main/README.md) "Swift Versions").
- **Version-bump trap.** Anyone moving to 1.0 from 0.x hits compile errors, all RAN: `output: .string` without a limit, `.unhandledException`, `guard let out = result.standardOutput`, `.sendSignal(...)`, `runDetached` (see [Verification runs](#verification-runs) table V9).

### 3. Output limits, decoding and non-zero exits

- Explicit limits are the 1.0 design: "makes the maximum memory a `run()` call may allocate visible at the call site"; overflow throws `outputLimitExceeded` ([SF-0037](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md), Output factories bullet).
- **Plant (d), RAN** (`pkg/Sources/limit`), both toolchains, identical:
  - `head -c 5000 /dev/zero` with `.string(limit: 100)` and with `.bytes(limit: 100)` throws `SubprocessError`, `code == .outputLimitExceeded`, description `The process's output exceeded the limit of 100 bytes.`, in about 3 ms.
  - `yes` (infinite) with `.string(limit: 100)` throws the same error in 4 ms and `pgrep -x yes` finds nothing afterwards: overflow tears the child down; the caller does not need to.
  - Exactly 100 bytes with `.bytes(limit: 100)` returns normally (`exited(0)`): the limit is inclusive.
  - `output: .sequence` has no limit (streamed 5000 bytes). The streaming bound is `strings(bufferingPolicy: .maxLineLength(_))`, default 128 KB.
  - `Error.Code` in this build prints as `Code(storage: ...outputLimitExceeded)`; match on `error.code == .outputLimitExceeded`, never on the text.
- **Decoding, RAN.** `/usr/bin/printf 'a\377b'` through `.string(limit: 100)` yields scalars `["61", "fffd", "62"]`: `String(decoding:as:)` substitutes U+FFFD, and `OutputType` is a non-optional `String` ([release 1.0.0](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0)). Anything hashed or parsed byte-exactly (digests, tar, JSON with arbitrary bytes) must use `.bytes(limit:)`.
- **`error:` defaults to `.discarded`** (README). `error: .combinedWithOutput` is `2>&1` (RAN: `"out\nerr\n"`); collect stderr with `.string(limit:)` when a diagnostic is wanted.
- **Non-zero exit does not throw, RAN:** `sh -c 'echo out; echo err 1>&2; exit 7'` returned `stdout: "out\n" status: exited(7) isSuccess: false`. The `run` doc comment says so explicitly (`API.swift:33-36`). The Python SDK's `check=True` habit does not carry over.
- **Sizing is a decision, not a number.** swiftly uses `1024 * 10` for `xcrun -f swift`, `100 * 1024` for `dpkg -l`, `1024 * 100` for general command output (`swiftly@c8cf2e35bfca:Sources/MacOSPlatform/MacOS.swift:65`, `Sources/LinuxPlatform/Linux.swift:372`, `Sources/SwiftlyCore/Commands+Runnable+Output.swift:6`); tuist's `swifterpm` passes a configurable `outputLimit` for both streams (`tuist@2f6ac74754bf:swifterpm/Sources/swifterpm/Support.swift:125-126`). A limit of `Int.max` defeats the point (grep C6).
- The fleet's Python SDK deliberately has **no capture ceiling** ("a truncated [JSON document] is worse than a large one") (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:` `run_command` docstring, def at `:199`). The Swift SDK cannot copy that: a limit is mandatory in 1.0. Decision: the SDK takes `stdoutLimit` with a generous default (the prototype uses 4 MiB) and surfaces `.outputTooLarge(limit:)` as a distinct failure so a caller can raise it.

### 4. Teardown: cancellation, body exit, process groups

Mechanics read in `swift-subprocess@55d30558b8b1`:

- Cancellation of the task awaiting `run()` runs `execution.teardown(using: platformOptions.teardownSequence)` through `withAsyncTaskCleanupHandler { ... } onCleanup:` (`Configuration.swift:190`). A body that **throws** runs the same teardown (`:157`). A body that **returns** does not: the process monitor child task simply waits for the child to exit.
- `teardown(using:)` (`Teardown.swift:103`) runs in an uncancelled task (`withUncancelledTask`, `:280`) so a cancelled parent still completes the sequence. `runTeardownSequence` appends an implicit `.kill` to every sequence (`:202`), re-checks liveness with `kill(pid, 0)` before each step (`:268`), and the final `.kill` inherits `toProcessGroup` from the last explicit step.
- SF-0007 states the contract: on cancel Subprocess "releases all the resources it acquired (i.e. file descriptors) and then terminate[s] the child process according to the `TeardownSequence`" ([SF-0007](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0007-swift-subprocess.md) "Task Cancellation").

**Plant (c), RAN** (`plant.sh 1.0.1 c`, fixture `pkg/Sources/cancel`, `pgrep -f` with bracket-trick patterns inside one container so orphans are visible; identical on 6.3 and 6.4):

| mode | setup | `pgrep` exit | result of `run()` after `t.cancel()` |
|---|---|---|---|
| `proc` (red) | `Foundation.Process` `sleep 3001` inside `Task.detached`, `t.cancel()`, parent exits | **0** (`192 /bin/sleep 3001`) | no signal ever sent |
| `sub-default` (green) | `Subprocess.run(sleep)`, empty `teardownSequence` | 1 | returned normally, `signaled(9)`, 0.7 ms |
| `sub-graceful` (green) | `sh -c` that traps TERM, `[.gracefulShutDown(allowedDurationToNextStep: .seconds(1))]` | 1 | `signaled(9)` after 1.0008 s: SIGTERM ignored, escalated to the implicit kill |
| `sub-group-bad` (red) | `sh -c 'sleep 3004 & wait'`, default options | **0** (`250 sleep 3004`) | `signaled(9)`: the shell died, its child was orphaned |
| `sub-group-good` (green) | same script, `createSession = true`, `[.gracefulShutDown(toProcessGroup: true, ...)]` | 1 | `signaled(15)`: SIGTERM reached the group |

Consequences:

1. `run()` **returns normally on cancellation**; it does not throw `CancellationError`. The status is `.signaled(9)` or the signal of the teardown step. A wrapper must test `Task.isCancelled` (or translate the signalled status) itself.
2. The default is "kill the direct child immediately, leave descendants". Anything that spawns helpers (shell scripts, `swift build`, `git`, package managers) needs `createSession = true` and a `toProcessGroup: true` step. The doc comment warns that `toProcessGroup` without `createSession` or a non-inherited `processGroupID` "includes the calling process. This is almost never what you want" (`Teardown.swift:53-60`). That variant was deliberately not run here.
3. Early return from the body, RAN (`pkg/Sources/bodyexit`): body `{ _ in }` against `sleep 2` returned after **2.0030 s**; `yes` with `for try await _ in execution.standardOutput { break }` returned after 3 ms with `signaled(13)` (SIGPIPE on the closed pipe); a throwing body against `sleep 30` returned in 2 ms. `signaled(13)` is a normal result, not a failure of the wrapper.
4. Windows: `gracefulShutDown` ignores `toProcessGroup`; `.send(signal:)` does not exist; `execution.terminate(withExitCode:toProcessGroup:)` is the kill (unverified: read only).
5. Corpus: only one exemplar sets `teardownSequence`: tuist `CommandRunner.swift:241-246` (`[.gracefulShutDown(allowedDurationToNextStep:)]`, with `processGroupID = 0` when `ownProcessGroup` at `:247-249`), but without `toProcessGroup: true`, so descendants of a child in its own group still outlive a cancel. swiftly sets none and runs `tar`/`git`/`gpg` with the default.
6. Python SDK analogue: SIGTERM the child's whole group, wait `KILL_GRACE = 5.0`, SIGKILL the group (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py:68,752,763`), the child in its own session (`:481` `{"start_new_session": True}`), SIGINT forwarded to the group for passthrough runs (`:714`). The Swift equivalent is exactly `createSession` + `.send(signal: .terminate, toProcessGroup: true, allowedDurationToNextStep: 5s)`.

### 5. Environment and executable lookup

- **`environment:`** takes `Environment.inherit`, `.inherit.updating([Key: String?])` (a `nil` value deletes an inherited key, RAN: `printenv HOME` exit 1 after `["HOME": nil]`) or `.custom([Key: String])` (replaces everything; tuist uses it, `tuist@2f6ac74754bf:cli/Sources/TuistProcess/CommandRunner.swift:237-239,254`). Keys are `Environment.Key`, case-insensitive on Windows (unverified: read only).
- **Plant (e), RAN** (`pkg/Sources/envovr`, `plant.sh 1.0.1 e`): the swiftly pattern

  ```swift
  // swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71
  var c = self.config()
  c.environment = environment                 // set on the copy
  let result = try await Subprocess.run(
      self.config(),                          // ...but the ORIGINAL is run
      output: .string(limit: limit), error: .discarded)
  ```

  printed `swiftly output(environment:) -> []` (override dropped, `printenv SENTINEL` exit 1, fixture exit 1). The one-word fix `Subprocess.run(c, ...)` printed `fixed copy -> [reached-child]`. swiftly's `run(environment:)` overloads at `:20-25` and `:37-48` run `c` correctly; the defect sits in both `output(...)` overloads (`:64-71`, `:82-83`, `:102-109`, `:121-122`). It is latent: swiftly's callers never pass `environment:` to `output(...)` (`Commands+Runnable+Output.swift:6` uses the default), and the second overload ignores its `limit` (`limit _: Int`, `:98`). A copy-mutate-run-the-original bug compiles clean and warns about nothing (`c` is only written).
- **Executable resolution (1.0.0+), RAN** (`pkg/Sources/resolve`, cwd contains an executable `here-tool`): `.name("here-tool")` -> `executableNotFound`; `.name("./here-tool")` and `.name("/bin/sh")` -> `.spawnFailed` with the reason "must not contain the path separator ... use Executable.path(_:)"; `PATH=.:/usr/bin` still -> `executableNotFound` (relative and empty PATH entries are skipped). This closes the dot-in-PATH hazard where a checkout containing a file named `git` or `make` runs arbitrary code ([release 1.0.0](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0) "`Executable.name(_:)` searches `PATH` and nothing else"). The wrapper's rule `executable.contains("/") ? .path : .name` (tuist `CommandRunner.swift:233-235`) is the correct dispatch.
- **Stdin default** is `.none`; to feed bytes use `input: .array(...)`/`.string(...)` or `.inputWriter` in the closure form.

### 6. Command injection

- **Plant (f), RAN** (`pkg/Sources/injectbad`, `injectgood`; canary file path passed as argument): red `run(.path("/bin/sh"), arguments: ["-c", "echo \(userInput)"], output: .string(limit: 4096))` with `userInput = "x; touch <canary>"` created the canary (`injectbad exit=1`). Green `run(.path("/bin/echo"), arguments: [userInput], ...)` printed the string verbatim and created nothing (`injectgood exit=0`); the shell-required form `["-c", "echo \"$1\"", "sh", userInput]` also printed the string verbatim and created nothing.
- Arguments are passed as an array to `posix_spawn`, so no shell parses them. The class is CWE-78; the standard mitigation is "functions that take separate arguments" instead of a command string ([CWE-78](https://cwe.mitre.org/data/definitions/78.html)). The Windows batch-file variant (CVE-2024-24576) is mitigated inside Subprocess: a `.bat`/`.cmd` runs through a hardened `cmd.exe` invocation ([release 1.0.0](https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0)); [Rust's advisory](https://blog.rust-lang.org/2024/04/09/cve-2024-24576/) explains the class (unverified on Windows: read only).
- When a shell is unavoidable (pipelines, redirection, `cd && build`): the script text must be a literal or a file the repo owns; values travel as positional parameters (`"$1"`) or environment variables, never in the script string.
- **Grep set** (all RAN against the planted pair, [Verification runs](#verification-runs) V6-V8):
  - C3a (narrow, same line as a shell name): `grep -rn --include='*.swift' -e 'sh"[^]]*"-c", *"[^"]*\\(' -e 'sh"[^]]*"-c", *[a-zA-Z_]' .`
  - C3b (wide triage, any `"-c"` followed by an interpolation or non-literal; false positives are compiler and `git -c`/`swift build -c` flags): `grep -rn --include='*.swift' -e '"-c", *"[^"]*\\(' -e '"-c", *[a-zA-Z_]' .`
  - C3a misses calls where the shell name is on a previous line (`executable: "/bin/sh",` then `arguments: ["-c", ...]`): apple/container's `K8sHelper+Bootstrap.swift:43,63` is that shape and only C3b finds it.
- Corpus: C3a found 45 hits in 6 repos, 5 outside `Tests/` and `Integration/` directories; they are listed in [Exemplar evidence](#exemplar-evidence). None of the 5 interpolates attacker data in an obviously exploitable way, but 2 (`K8sHelper+Bootstrap.swift:43` heredoc `<<'EOF'\n\(configYAML)`, `:63` unquoted `cp \(kubeconfigPath)`) and `tuist ForeignBuildSideEffectGraphMapper.swift:32-33` (`export SRCROOT=\(projectPath.pathString)` unquoted) are the exact shape the rule exists to retire: a path with a space, `;`, or a line equal to `EOF` changes the command.

### 7. `Foundation.Process`: the rules for legacy code

New code uses swift-subprocess ([SF-0007](https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0007-swift-subprocess.md) "will eventually replace `Process` as the canonical way to launch a process in Swift"). Existing code that cannot move follows these rules; each was measured.

- **Pipe capacity is the deadlock threshold.** `pipe(7)`: default 16 pages = 65,536 bytes; a full pipe makes a blocking `write` wait ([pipe(7)](https://manpages.debian.org/bookworm/manpages/pipe.7.en.html)). swift-corelibs-foundation's `Pipe()` is a plain `pipe()` (`FileHandle.swift`, `Pipe.init`), and `waitUntilExit()` only spins the run loop at 50 ms steps (`Process.swift` `waitUntilExit`), it never reads. Apple documents `waitUntilExit()` as "Blocks the process until the receiver is finished" ([Process](https://developer.apple.com/documentation/foundation/process)).
- **Plant (b), RAN** (`pkg/Sources/procdeadlock`, writer `emit` = plain `write(2)` loop, Swift 6 and 5 language mode compile): `Process` writing 268,435,456 bytes to a stdout `Pipe`:
  - red `waitUntilExit()` then `readDataToEndOfFile()`: `timeout 60 procdeadlock bad 268435456` -> **exit 124**.
  - green read first, then wait: same size -> `good 268435456 0`, **exit 0**.
  - threshold: `bad 65536` -> exit 0; `bad 65537`, `1048576`, `1048577` -> exit 124 (timeout 5).
  - two pipes: child writes 1 MiB to stderr then `echo ok`; parent drains stdout to EOF first, then stderr -> `bad2` exit 124; draining stderr on a thread -> `good2 3 1048576 0`, exit 0.
  - Identical on 6.3 and 6.4.
- **Reproducer trap.** The first attempt used `head -c N /dev/zero`: it completed up to 1,048,576 bytes and hung only above, because this image's uutils `head` (like `yes`, `cat`, `dd`) enlarges the pipe to 1 MiB. Measure with a writer that does not (the fixture's `emit`); a documentation claim of "hangs above 64 KiB" holds for GNU tools and for a typical long-lived child, not for every tool. macOS pipe size was not measured (unverified: read only).
- **Safe legacy shapes seen in the corpus:** redirect to `FileHandle.nullDevice` when the output is not needed (`container@f70ecbb926d9:Sources/ContainerPlugin/ServiceManager.swift:26-35`, `Services/ContainerAPIService/Client/PacketFilter.swift:181-189`); redirect to temp files and read after exit (`ContainerTestSupport/ContainerFixture.swift:195-255`); drain with a handler/thread before waiting (`Sources/Services/ContainerAPIService/Client/ProcessIO.swift:101-137` uses `readabilityHandler`). **Latent-deadlock shape:** `ServiceManager.swift:74-80` reads stdout to EOF, then stderr to EOF, then waits: correct only while stderr stays under one pipe buffer (the `bad2` shape, harmless for `launchctl list` today).
- **`Process.environment` replaces the environment, RAN:** `q.environment = ["ONLY": "1"]` -> the child printed only `ONLY=1`. Merge into `ProcessInfo.processInfo.environment` first (as `ContainerFixture.swift:200-204` does).
- **Other `Process` hazards (read, not run):** `terminate()` "Sends a terminate signal to the receiver and all of its subtasks" ([Process](https://developer.apple.com/documentation/foundation/process)) (Darwin wording; Linux group semantics unverified), `launch()` and `launchPath` are the deprecated spellings (use `run()` and `executableURL`), `terminationHandler` runs on an undefined context and `waitUntilExit()` does not wait for it, `Process` can run once per instance, and nothing in it responds to Swift task cancellation (RAN: plant c `proc`).

### 8. The wrapper shape for the Swift SDK

Feeds wave 3 `api/sdk-shape`. Prototype: `fixtures/subprocess-contract/pkg/Sources/wrapper/Runner.swift`; nine cases RAN on 6.3 and 6.4 (`runall.sh`).

```swift
public struct Completed: Sendable, Equatable { exitCode: Int32; stdout: String; stderr: String }
public enum ProcessFailure: Error, Sendable, Equatable {
    case executableNotFound(String), launchFailed(String)
    case outputTooLarge(limit: Int), timedOut(after: Duration), ioFailed(String)
}
public struct ProcessRunner: Sendable {            // one spawn point, limits and grace configured once
    public func run(_ exe: String, _ args: [String],
                    environment: [String: String?] = [:], workingDirectory: String? = nil,
                    timeout: Duration? = nil) async throws(ProcessFailure) -> Completed
}
```

Decisions and the evidence for each:

1. **One module imports `Subprocess`.** The public surface is primitives in (argv, `[String: String?]` overrides) and a closed vocabulary out. `Execution`/`ExecutionResult` are `~Copyable` or closure-scoped and must not leak. Check: `grep -rln --include='*.swift' -e 'import Subprocess' Sources` lists one directory/file (rule P13).
2. **`Executable` dispatch** `contains("/") ? .path : .name`, as tuist does.
3. **Always `.string(limit:)` for stdout and stderr** (SDK stdout default 4 MiB, stderr 256 KiB in the prototype), `OutputTooLarge` as its own failure. JSON payloads that may contain invalid UTF-8 are not expected from `ocx --format json`; use `.bytes(limit:)` if that changes.
4. **Exit mapping:** `.exited(c)` -> `c`; `.signaled(s)` -> `128 + s` (RAN: `kill -TERM $$` -> 143, `kill -KILL $$` -> 137), the Q6 default. The Python SDK keeps the raw negative code (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_errors.py:123` comment: a killed process "exits with a code ocx never assigns"). `#if os(Windows)` must drop the `.signaled` arm (unverified: read only).
5. **Teardown:** `createSession = true`; `teardownSequence = [.send(signal: .terminate, toProcessGroup: true, allowedDurationToNextStep: killGrace)]` with `killGrace = 5 s` to match `KILL_GRACE = 5.0`. Windows ignores `toProcessGroup` and has no `createSession` (unverified: read only).
6. **Timeout is a race in a task group:** `group.addTask { run }`, `group.addTask { try await Task.sleep(for: timeout); return nil }`; first result wins, `group.cancelAll()` triggers the teardown, then await the run task before throwing `.timedOut`. RAN: a shell with a `sleep 3009 &` grandchild timed out after 1.0009 s and `pgrep` found nothing; `run` itself has no timeout parameter in 1.0.1.
7. **Typed throws at the wrapper boundary, untyped inside.** `Subprocess.run` is plain `throws`; the wrapper casts `error as? SubprocessError` and switches on `.code`. The compiler enforces nothing about the cast (RAN: `error.code` on `any Error` is a compile error), so any new `SubprocessError.Code` falls into `.ioFailed` and needs a test.
8. **Cancellation:** because `run()` returns normally on cancel, the wrapper should check `Task.isCancelled` after the call and throw `CancellationError` itself; the prototype does not yet (listed as open).
9. **Env overrides `[String: String?]`** map onto `.inherit.updating(...)` (nil deletes), RAN (`SENTINEL` reached the child, `HOME: nil` removed it).
10. **Dependency budget:** stdlib + swift-subprocess (+ transitive swift-system on Linux) with `traits: []` (V11). Foundation may still be imported by the SDK for `Duration`-free needs; `Duration`, `ContinuousClock` and `Task.sleep` are stdlib.

### 9. Traits and dependency weight

`SubprocessFoundation` is the package's only trait and is on by default (`Package.swift`: `traits: ["SubprocessFoundation", .default(enabledTraits: ["SubprocessFoundation"])]`); it adds `Data` conveniences (`.data(limit:)`, `Data` input, `StandardInputWriter.write(Data)`). Package-trait syntax: `.package(url:from:traits: [])` disables all ([SE-0450](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0450-swiftpm-package-traits.md)).

**RAN** (`traitprobe`, release builds, identical `main.swift`, Swift 6.4): default traits -> `ldd` lists `libFoundationEssentials.so`, 15 libraries, 3,514,368-byte binary; `traits: []` -> no Foundation line, 13 libraries, 3,448,928 bytes. That is `FoundationEssentials`, not full Foundation; the saving for a static-musl CLI follows the map's M-G-11 (FoundationEssentials 10.3 MB vs 55.6 MB). Only swiftly in the corpus disables it (`swiftly@c8cf2e35bfca:Package.swift:34`).

### 10. Tooling notes: what can and cannot be machine-checked

- **Compiler diagnostics are the strongest check for stale spellings** (all RAN, `neg/`): `output: .string` -> `cannot conform to 'OutputProtocol'`; `.unhandledException` -> `has no member`; optional-binding of `standardOutput` -> `initializer for conditional binding must have Optional type`; `.sendSignal` -> `has no member 'sendSignal'`; `runDetached` -> `cannot find 'runDetached' in scope`. The new spellings built clean (exit 0). These only fire when the code is built against 1.0.x.
- **No compiler or lint catches** `Process()` + `waitUntilExit()` order, `sh -c` interpolation, dropped environment overrides, a missing teardown group, or an unchecked `terminationStatus`. Those need grep (C1-C7) or review.
- **SwiftLint `custom_rules` did not go red** in this toolchain image. `swiftlint 0.65.1` (static Linux build, `SWIFTLINT_DISABLE_SOURCEKIT` compiled in, `realm__SwiftLint@ec4691d9e813:Source/SwiftLintCoreMacros/DisabledWithoutSourceKit.swift:21`) printed `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` and exited 0 on `lint/bad/Bad.swift` under `--strict`. The map's "SwiftLint only as a `custom_rules` vehicle" (conflict 1) therefore needs a SourceKit-enabled SwiftLint to enforce these bans; on a static build the same rule set silently passes. Use grep for the gate.
- **grep dialect.** The container's `grep` is ugrep 7.8.4; the host's too. Every pattern here is BRE with one `-e` per alternative (no `\|`), tested in that dialect.

## Normative guidance candidates

Family SW-IO, prefix `P` (process). "RAN" means the verification was watched red on a planted violation and green on a compliant twin; fixture paths are under `/home/mherwig/.cache/research-lang/swift-tools/fixtures/subprocess-contract/`. A check's **output is the violation; empty output = pass** unless a rule says otherwise. All greps are run from the repository root with an explicit directory operand.

**SW-IO-P01. New code spawns processes with swift-subprocess, never `Foundation.Process`.**
Rationale: `Process` has no cancellation, no output limit, an easy pipe deadlock and a dropped-environment trap; the Foundation team names Subprocess its replacement (SF-0007).
Verify: `grep -rn --include='*.swift' -e '[^A-Za-z0-9_]Process()' .` lists every use; each remaining hit must carry a `// legacy: <issue>` comment and follow P10-P12. A review heuristic exempts files under `Tests/` that call a binary with output redirected to a file.
RAN: yes, `gr/bad` exit 0 with 2 hits, `gr/good` (contains `ProcessInfo.processInfo`) exit 1 with none.

**SW-IO-P02. The manifest declares `.package(url: ".../swift-subprocess", from: "1.0.1", traits: [])` under `// swift-tools-version: 6.2`; never `exact:`, never a 0.x range.**
Rationale: 1.0.0 leaks an fd per early `.sequence` exit; 0.x has implicit 128 KB caps and a different API; the toolchain floor is 6.2.
Verify: `grep -rn --include='Package.swift' --include='Package@swift-*.swift' -e 'swift-subprocess.*exact' -e 'swift-subprocess.*upToNextMinor' -e 'swift-subprocess.*from: "0\.' -e 'swift-subprocess.*from: "1\.0\.0"' .` (any output is a violation). Keep `traits: []` unless a call site needs `.data(limit:)` or `Data` input; then drop the argument and say why in a comment.
RAN: yes, `gr/bad/Package.swift` exit 0 (1 hit), `gr/good` exit 1; on the corpus it hits 6/6 subprocess pins. Toolchain floor RAN with `SWIFT_VERSION=6.1` (resolve exit 1 vs the 0.4 line exit 0).

**SW-IO-P03. Every collected `output:` and `error:` has an explicit `limit:` sized to the largest legitimate output; no `Int.max`.**
Rationale: the limit is the memory ceiling of the call; overflow is a typed error and the child is torn down.
Verify: compiler (a missing limit does not compile against 1.0.x) plus `grep -rn --include='*.swift' -e 'limit: Int.max' -e 'limit: .max' .`.
RAN: yes: `neg/nolimit` build exit 1 vs `neg/withlimit` exit 0 (6.4 and 6.3); grep C6 exit 0 on `lint/bad` (1 hit), exit 1 on `lint/good`.

**SW-IO-P04. Handle `SubprocessError` by `code`, never by message text; an `.outputLimitExceeded` is a configuration error to surface, not retry blindly.**
Rationale: only `SubprocessError` escapes `run` (documentary: the signature is plain `throws`); codes are stable, descriptions are not.
Verify: reading heuristic; `grep -rn --include='*.swift' -e 'description.contains' -e 'localizedDescription.contains' .` for message matching.
RAN: no for the grep; yes for the behaviour (`limit` fixture prints `code=...outputLimitExceeded` on both toolchains).

**SW-IO-P05. A non-zero exit is not thrown: every `run` result's `terminationStatus` is checked (`isSuccess`, or a `switch` handling `.exited` and, off Windows, `.signaled`).**
Rationale: `run` returns `exited(7)` normally; an ignored status turns a failed tool into silent success.
Verify: `grep -rl --include='*.swift' -e 'import Subprocess' . | xargs -r grep -L -e 'terminationStatus' -e 'isSuccess'` lists files that import the module but never look at a status (output = violation).
RAN: yes, `lint/bad` listed (exit 123 from xargs), `lint/good` empty (exit 0); behaviour RAN in `limit stderr-default` (`exited(7) isSuccess: false`). File-level only: a file that checks one call and ignores another passes; the per-call check is a named reading heuristic.

**SW-IO-P06. Long-lived and shell-spawning children get an explicit platform policy: `createSession = true` and a teardown sequence whose steps use `toProcessGroup: true`; `toProcessGroup: true` is never used without `createSession` or a non-inherited `processGroupID`.**
Rationale: the default cancel is an immediate SIGKILL of the direct child only; grandchildren survive, and an inherited group includes the caller (`Teardown.swift:53-60`).
Verify: for each `run(`/`Configuration(` that starts a shell, build tool or server, `grep -rn --include='*.swift' -e 'teardownSequence' -e 'createSession' .` must show both in the same function; behavioural test: cancel the task, then `pgrep -f '<unique marker>'` must exit 1.
RAN: yes, `plant.sh 1.0.1 c` `sub-group-bad` pgrep exit 0 (child `250 sleep 3004` survived) vs `sub-group-good` exit 1; `proc` (Foundation.Process) exit 0; `sub-default` exit 1.

**SW-IO-P07. Callers of `run()` treat a cancelled task as an outcome: `run()` returns normally with a signalled status after cancellation; check `Task.isCancelled` (or map the status) before using the result.**
Rationale: no `CancellationError` is thrown; a retry loop that only catches errors will happily proceed on a killed child's partial output.
Verify: reading heuristic (a `try Task.checkCancellation()` or `Task.isCancelled` follows each `run` in cancellable code); behaviour RAN.
RAN: yes for the behaviour, `sub-default` and `sub-graceful` lines show `run returned normally after cancel`; no for an automated check of the follow-up.

**SW-IO-P08. A `.sequence` body that stops early also stops the child, or accepts that `run()` blocks until the child exits.**
Rationale: returning from the body never signals the child; `run()` waited 2.0 s for `sleep 2`. On 1.0.0 the early exit also leaks an fd (P02).
Verify: reading heuristic (a `break`/`return` inside `for try await ... in execution.standardOutput` is paired with `execution.teardown(using:)` or `execution.send(signal:)`); behavioural: `bodyexit return-sleep` elapsed 2.0030 s.
RAN: yes for the behaviour and the fd leak; no for an automated check of the pairing.

**SW-IO-P09. Environment overrides reach the child: run the `Configuration` you mutated, and test the override with a sentinel variable.**
Rationale: `var c = self.config(); c.environment = e; run(self.config(), ...)` compiles and drops the override.
Verify: behavioural test: `printenv SENTINEL` through the wrapper with `environment: ["SENTINEL": "x"]` must print `x`; grep for the single-line shape `grep -rn --include='*.swift' -e 'run(self.config()' .`, plus the reading heuristic that the variable passed to `run` is the one assigned `.environment`.
RAN: yes, `envovr` red (child saw empty, fixture exit 1), fixed copy and `ProcessRunner` env-override green (`reached`); the single-line grep was not planted (the swiftly shape is multi-line), so only the behavioural test is admissible.

**SW-IO-P10. `Executable.name` names a PATH tool only; a known location uses `.path`. Never pass a value containing `/` to `.name`.**
Rationale: 1.0.0+ rejects `./tool` and absolute paths given to `.name` with `.spawnFailed` and never searches the working directory.
Verify: `grep -rn --include='*.swift' -e '\.name("[^"]*/' .` (any hit is a violation: a path in `.name`); wrapper helper dispatches on `contains("/")`.
RAN: partly: behaviour RAN (`resolve ./here-tool` -> spawnFailed; `PATH=.:/usr/bin` -> executableNotFound); the grep was not planted.

**SW-IO-P11. Command lines are argument arrays. No `sh -c`/`bash -c`/`cmd /c` with an interpolated or non-literal script; when a shell is unavoidable the script is a literal and values travel as positional parameters (`["-c", "cmd \"$1\"", "sh", value]`).**
Rationale: CWE-78; the planted `echo \(userInput)` executed `touch`.
Verify: C3a `grep -rn --include='*.swift' -e 'sh"[^]]*"-c", *"[^"]*\\(' -e 'sh"[^]]*"-c", *[a-zA-Z_]' .`; triage widening C3b `grep -rn --include='*.swift' -e '"-c", *"[^"]*\\(' -e '"-c", *[a-zA-Z_]' .` (false positives: `git -c`, `swift build -c`, `clang -c`; read each hit).
RAN: yes, C3a: `gr/bad` exit 0 with 2 hits, `gr/good` exit 1; C3b: 3 hits vs exit 1; fixture `injectbad` exit 1 (canary created) vs `injectgood` exit 0 (no canary), positional variant included.

**SW-IO-P12. Legacy `Process`: read every `Pipe` concurrently with the child running (thread/task per pipe, or `readabilityHandler`), or redirect it to `FileHandle.nullDevice`/a temp file; never call `waitUntilExit()` before the pipes are drained, and never drain two pipes one after the other.**
Rationale: a full pipe (65,536 bytes) blocks the child's `write`; `waitUntilExit()` never reads. Measured: 256 MiB hang, `timeout 60` exit 124; sequential two-pipe drain hangs at 1 MiB.
Verify: `grep -rn --include='*.swift' -e 'waitUntilExit()' -e 'readDataToEndOfFile()' .` and read each file's order (a `waitUntilExit()` on a lower line than the reads of a pipe it owns is the violation); behavioural: run the wrapper against `emit 268435456` under `timeout 60` (expect 0, not 124).
RAN: yes for the behaviour (`bad` exit 124 vs `good` exit 0; `bad2` 124 vs `good2` 0; threshold 65536 ok / 65537 hang); the grep lists both orders and needs the reading step (reading heuristic).

**SW-IO-P13. `Process.environment` is built by merging `ProcessInfo.processInfo.environment`; a partial dictionary replaces the environment.**
Rationale: RAN `["ONLY":"1"]` -> child saw only `ONLY=1`.
Verify: `grep -rn --include='*.swift' -e '\.environment = \[' .` (a literal dictionary assigned to `Process.environment` is a violation unless it merges).
RAN: behaviour yes (`procdeadlock env`); the grep was not planted.

**SW-IO-P14. The SDK has one spawn module: only that module imports `Subprocess`; its public API exposes no Subprocess type; failures are a closed enum; signal deaths map to `128+n`; cancellation and timeout run the group teardown.**
Rationale: `Execution`/`ExecutionResult` are `~Copyable`/closure-scoped; one place owns limits, grace, environment and exit mapping (mirrors `_process.py`, "Every ocx spawn in this SDK goes through this module").
Verify: `grep -rln --include='*.swift' -e 'import Subprocess' Sources` lists exactly the spawn module's file(s); behavioural suite = the nine `wrapper` cases.
RAN: yes: `wrapper` suite exit 0 on both toolchains, `pgrep` after the timed-out grandchild case empty; the import-count check was run on `pkg/Sources/wrapper` (1 file).

**SW-IO-P15. Do not use `.string(limit:)` for bytes that must round-trip (digests, archives, signatures): use `.bytes(limit:)`.**
Rationale: invalid UTF-8 becomes U+FFFD silently (`61 ff 62` -> `61 fffd 62`).
Verify: reading heuristic: `.string(limit:` in a function that hashes, parses a tar or compares bytes; `grep -rn --include='*.swift' -e '\.string(limit:' .` lists candidates.
RAN: behaviour yes (`limit badutf8`); the heuristic is reading only.

**SW-IO-P16. Cross-platform code guards the Unix-only API: `.signaled`, `.send(signal:)`, `createSession`, `processGroupID` sit inside `#if !os(Windows)`; Darwin-only `preSpawnProcessConfigurator` inside `#if canImport(Darwin)`.**
Rationale: `.signaled` and `.send(signal:)` do not exist on Windows; `preSpawnProcessConfigurator` exists only on Darwin and Windows.
Verify: a Windows build (`swift build` on a Windows host) is the only complete check; `grep -rn --include='*.swift' -e '\.signaled' -e 'createSession' -e 'processGroupID' .` lists spots to check for a surrounding `#if`.
RAN: no (unverified: read only; no Windows or macOS host). Linux compile of the `.signaled` arm is yes (`neg/newstatus` exit 0).

## Verification runs

Working directory for all commands: `/home/mherwig/.cache/research-lang/swift-tools/fixtures/subprocess-contract/`. `plant.sh <sp-version> <plant>` builds `pkg/` against `upstream/sp-<version>` (`git clone --branch <tag> https://github.com/swiftlang/swift-subprocess.git`) with `--scratch-path "$SWIFT_SCRATCH/subprocess-contract-<version>-<toolchain>"` through `run.sh`, then runs the case; `runall.sh` repeats everything (`SWIFT_VERSION=6.3 ./runall.sh`, `SWIFT_VERSION=6.4 ./runall.sh`); logs in `logs/`. A red result is the intended failure of the violation; a green result is the compliant twin.

| ID | Check (exact command inside the container) | Violation: exit / output | Compliant twin: exit / output | 6.3 vs 6.4 |
|---|---|---|---|---|
| V1 (a) | `SWIFT_VERSION=6.4 ./plant.sh 1.0.0 a` then `./plant.sh 1.0.1 a`; inner: `$B/leak break` and `$B/leak drain` | 1.0.0 `break`: **exit 1**, `fds before=17 after=67 delta=50` | 1.0.1 `break`: exit 0, `delta=0`; 1.0.0 `drain`: exit 0, `delta=0` | identical |
| V2 (b) | `timeout 60 $B/procdeadlock bad 268435456` / `timeout 60 $B/procdeadlock good 268435456` | **exit 124**, no output | exit 0, `good 268435456 0` | identical |
| V2b | `timeout 5 $B/procdeadlock bad N` for N = 65536, 65537, 1048576, 1048577 | 65536: exit 0 `bad 65536`; the rest **exit 124** | n/a (threshold) | identical |
| V2c | `timeout 10 $B/procdeadlock bad2 1048576` / `good2 1048576` (stderr 1 MiB, stdout `ok`) | **exit 124** | exit 0, `good2 3 1048576 0` | identical |
| V3 (c) | `./plant.sh 1.0.1 c` (per mode: `$B/cancel <mode>; sleep 0.3; pgrep -f "[s]leep 300|[t]dsig|[g]rpbad|[g]rpgood"`) | `proc`: pgrep **exit 0** `192 /bin/sleep 3001`; `sub-group-bad`: pgrep **exit 0** `250 sleep 3004` | `sub-default`, `sub-graceful`, `sub-group-good`: pgrep exit 1, empty; graceful: cancel->return 1.0008 s, `signaled(9)` | identical |
| V4 (d) | `./plant.sh 1.0.1 d` (modes `finite`, `exact`, `infinite`, `bytes`, `sequence`) | `SubprocessError code=...outputLimitExceeded description=The process's output exceeded the limit of 100 bytes.` in 2-4 ms; `yes left: 0` | `exact` (100 bytes, `.bytes(limit: 100)`): `exited(0)`; `sequence`: streamed 5000 | identical |
| V5 (e) | `./plant.sh 1.0.1 e` (`$B/envovr`) | swiftly pattern prints `[]`; fixture **exit 1** | fixed copy prints `[reached-child]`; `Runnable.run(environment:)` `exited(0)` | identical |
| V6 (f) | `./plant.sh 1.0.1 f` (`injectbad "x; touch <canary>" <canary>`, `injectgood ...`) | `injectbad` **exit 1**; canary-bad exists | `injectgood` exit 0; no canary-good, no canary-good-pos | identical |
| V7 | `./grepchecks.sh <dir>` C1 `grep -rn --include='*.swift' -e '[^A-Za-z0-9_]Process()' <dir>` | `gr/bad`: exit 0, 2 hits | `gr/good`: exit 1, none | n/a (grep) |
| V7b | C2 `grep -rn --include='Package.swift' --include='Package@swift-*.swift' -e 'swift-subprocess.*exact' -e 'swift-subprocess.*upToNextMinor' -e 'swift-subprocess.*from: "0\.' -e 'swift-subprocess.*from: "1\.0\.0"' <dir>` | exit 0, 1 hit (`exact: "1.0.0"`) | exit 1 | n/a |
| V7c | C3a, C3b (strings in P11) | `gr/bad`: exit 0; C3a 2 hits, C3b 3 hits | `gr/good`: exit 1 for both | n/a |
| V7d | C6 `grep -rn --include='*.swift' -e 'limit: Int.max' -e 'limit: .max' <dir>`; C7 `grep -rl --include='*.swift' -e 'import Subprocess' <dir> \| xargs -r grep -L -e 'terminationStatus' -e 'isSuccess'` | `lint/bad`: C6 exit 0 (1 hit); C7 prints `lint/bad/Bad.swift`, exit 123 | `lint/good`: C6 exit 1; C7 empty, exit 0 | n/a |
| V8 | `./plant.sh 1.0.1 g` | `badutf8`: scalars `["61","fffd","62"]` (lossy); `stderr-default`: `exited(7) isSuccess: false`, no throw | `combined`: `"out\nerr\n"` | identical |
| V9 | `./negrun.sh` (builds one `--target` each) | `nolimit` exit 1; `oldstatus` exit 1 (`no member 'unhandledException'`); `staleopt` exit 1; `oldteardown` exit 1 (`no member 'sendSignal'`); `olddetached` exit 1 (`cannot find 'runDetached'`) | `withlimit`, `newstatus`, `newteardown`: exit 0 | identical (`logs/extras-6.4.log`, `logs/extras-6.3.log`) |
| V10 | `SWIFT_VERSION=6.1 run.sh sh -c 'cd toolsreq/new && swift package resolve ...'` | `from: "1.0.1"`: **exit 1**, `contains incompatible tools version (6.2.0)` | `.upToNextMinor(from: "0.4.0")`: exit 0; 6.4 + root tools 6.1 + `from: "1.0.1"`: `swift build` exit 0 | n/a |
| V11 | `TP_TRAITS=default swift build -c release` vs `TP_TRAITS=none`, then `ldd .../tp \| grep -c -i foundation` | default: 1 (`libFoundationEssentials.so`), 3,514,368 bytes | none: 0, 3,448,928 bytes | 6.4 only |
| V12 | `./plant.sh 1.0.1 h` (`bodyexit`) | `return-sleep`: returned after 2.0030 s (blocks on the child); `return-yes`: `signaled(13)` in 3 ms | `throw`: child killed, 2 ms | identical |
| V13 | `./plant.sh 1.0.1 i` (`procdeadlock env 0`) | `Process.environment = ["ONLY":"1"]` -> `env: ["ONLY=1"]` (replaces) | n/a | 6.4 |
| V14 | wrapper: `$B/wrapper` (9 cases) then `pgrep -af "[w]rapgc|[s]leep 3009"` | n/a | exit 0; `ok`, `exit3`, `self-sigterm`=143, `self-sigkill`=137, `env-override`, `env-remove-HOME`, `missing`=`executableNotFound`, `overflow`=`outputTooLarge`, `timeout-with-grandchild`=`timedOut` in 1.0009 s; pgrep empty | identical |
| V15 | `swiftlint lint --strict --no-cache --config .swiftlint.yml bad` (custom_rules for `Process()`, `-c` interpolation) | **did not go red**: exit 0, `Skipping enabled rule 'custom_rules' because it requires SourceKit` | exit 0 | 6.4 image only |

V15 is a failure to go red: SwiftLint 0.65.1's static Linux build skips `custom_rules`, so no SwiftLint-based check is proposed. `V2` (the exact reading of the 256 MiB claim) took 62 s wall per run because `timeout 60` has to expire.

## Exemplar evidence

Corpus: 40 repos, `/home/mherwig/.cache/research-lang/exemplars/swift/`, shas from `swift-audit/scratch/exemplar-shas.md`. The audit already counted `Process()` at 50 uses in 16 repos and `import Subprocess` in 14 files in 3 repos ([audit](../swift-audit/exemplar-packaging-and-release.md) line 436); this dive's C1 pattern gives 96 hits in 19 repos (it also matches repo-local `Process` types such as SwiftPM's TSC `Process()`), so the audit number stands for Foundation-only use.

**P02 (pin).** Violating all six: `swiftly@c8cf2e35bfca:Package.swift:34` (`exact: "1.0.0", traits: []`); `element-x-ios@14e33866ced2:Package.swift:11` (`.upToNextMinor(from: "0.3.0")`, resolved 0.3.0); `tuist@2f6ac74754bf:Package.swift:1991`, `swifterpm/Package.swift:17`, `swifterpm/third_party/nio/Package.swift:8`, `cli/Sources/XcodeGraph/Package.swift:60` (all `exact: "0.4.0"`). Compliant: none. Only swiftly uses `traits: []`.

**P01/P12 (Process).** Foundation `Process` in swift-corelibs terms: container `ServiceManager.swift:26,68,106,138`, `HostDNSResolver.swift:127`, `PacketFilter.swift:181`, `SystemLogs.swift:61`, `ContainerFixture.swift:195`; containerization `IntegrationSuite+CctlCLI.swift:41`; swift-container-plugin `Plugins/ContainerImageBuilder/runner.swift:37`, `Tests/TarTests/TarInteropTests.swift:32`; argument-parser (5 files), swift-openapi-generator (4), JavaScriptKit (9 files). Satisfying P12: `container@f70ecbb926d9:ServiceManager.swift:26-35` and `PacketFilter.swift:181-189` (nullDevice), `ContainerFixture.swift:195-255` (stdout/stderr to temp files, read after exit, environment merged at `:200-204`). Violating P12 in the latent sense: `ServiceManager.swift:68-80` (stdout drained to EOF, then stderr, then `waitUntilExit`; same at `:106-116` and `:138-149` for one pipe each, which is safe).

**P03/P05 (limits and status).** Satisfying: swiftly `1024 * 10` at `MacOS.swift:65` and `100 * 1024` at `Linux.swift:372`, status checked via `RunProgramError` at `ModeledCommandLine.swift:26,44,49,76`; tuist `swifterpm/Support.swift:125-126` (`outputLimit` on both streams) with `isSuccess` guards at `:110,129`; element-x-ios `Tools/Sources/Commands/CI/CI.swift:155` (`limit: 4096`). Weakness: swiftly `ModeledCommandLine.swift:98` takes `limit _: Int` and never uses it.

**P06/P07 (teardown).** Only tuist sets a sequence: `cli/Sources/TuistProcess/CommandRunner.swift:241-246` plus `processGroupID = 0` at `:247-249`; no `toProcessGroup: true`. swiftly, element-x-ios and the other 0.x users rely on the default.

**P09 (environment).** Violating (latent): `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71,82-83,102-109,121-122`. Satisfying: same file `:20-25`, `:37-48`; swiftly `Proxy.swift:77` (`env.updating([...])`); tuist `CommandRunner.swift:237-239,254` (`.custom`).

**P11 (injection).** C3a over the corpus: 45 hits in 6 repos (containerization 17, container 12, tuist 7, swift-build 6, swiftly 2, SwiftPM 1); 40 are in `Tests/` or `Integration/` directories (guest-side commands and test fixtures). The 5 outside tests: `containerization@3e7bc39e66b3:examples/sandboxy/Sources/sandboxy/RunAgentCommand.swift:858` (`["/bin/sh", "-c", command]`, a configured install command run in the guest), `swift-package-manager@5546f44a3b52:Sources/swift-build-prebuilts/BuildPrebuilts.swift:320` (`/bin/bash -c command`), `swift-build@2187330e13e7:Sources/SWBTaskConstruction/TaskProducers/BuildPhaseTaskProducers/ShellScriptTaskProducer.swift:189` (an Xcode shell-script phase, by design), `tuist@2f6ac74754bf:cli/Sources/TuistHasher/ForeignBuildHasher.swift:59` and `AdditionalHashingInputsHasher.swift:72` (user-declared scripts, by design). C3b adds the multi-line shape: `container@f70ecbb926d9:Sources/ContainerK8s/Support/K8sHelper+Bootstrap.swift:43` (heredoc with `\(configYAML)`), `:63` (`cp \(kubeconfigPath) ...`), and `tuist ForeignBuildSideEffectGraphMapper.swift:32-33` (`export SRCROOT=\(projectPath.pathString)`). Test-only interpolation: swiftly `Tests/SwiftlyTests/SwiftlyTests.swift:814,906` (`bash -c "tar -C \(swiftlyDir) ..."`) and `Sources/TestSwiftly/TestSwiftly.swift:48,135,177,190` (a `sh -c` helper fed interpolated strings). Argument-array positives: `tuist ... CommandRunner.swift:233-235`, `GitController+History.swift:53` (`git -c core.quotePath=false`, a `-c` that is a git flag, i.e. a C3b false positive).

**Python SDK analogue (P14).** `ocx-sdk-python@80136dde4162:src/ocx_sdk/_process.py`: single spawn module (docstring `:1-30`); `_pump` thread per pipe so "a child that fills one pipe buffer while the SDK waits on the other cannot deadlock" (`:616-624`, the same hazard as V2c); kill ladder SIGTERM group -> `KILL_GRACE = 5.0` -> SIGKILL group (`:68,752-780`); `start_new_session` (`:481`); pid-recycling guard citing CWE-367 (`:803-811`, the problem Subprocess solves with `processDescriptor`); unbounded capture by design (`run_command`, `:199`); raw (not 128+n) signal exit (`_errors.py:123`).

## AI-agent angle

What an LLM characteristically gets wrong here, with the smallest mechanical check:

| # | Mistake | Why it happens | Smallest check |
|---|---|---|---|
| 1 | `Process()` + `Pipe()` + `waitUntilExit()` + `readDataToEndOfFile()` in that order | the dominant pre-2025 idiom in training data | grep C1 + C4 order read; V2 `timeout 60` |
| 2 | `run(.name("ls"), output: .string)` (no limit), `.unhandledException`, `guard let out = result.standardOutput`, `.sendSignal(...)`, `runDetached` | 0.x / SF-0007 spellings | compile against 1.0.1: V9 (exit 1 each) |
| 3 | Copying the README Getting Started pin `.upToNextMinor(from: "0.4.0")` or `exact: "1.0.0"` | README block is stale; 1.0.0 is the version the model saw most | grep C2 (V7b) |
| 4 | Assuming a non-zero exit throws (Python `check=True`, `Process` habit) and skipping `terminationStatus` | other languages | grep C7 (V7d) |
| 5 | Assuming `Task.cancel()` throws out of `run()` or kills the whole tree | structured-concurrency intuition | cancel test with `pgrep` (V3); wrapper `Task.isCancelled` |
| 6 | `["/bin/sh", "-c", "tool \(arg)"]` for convenience, `bash -c` helpers | shell is the shortest way to write a pipeline | grep C3a/C3b (V7c), canary test V6 |
| 7 | `Task.detached { Process().run(); waitUntilExit() }` for "background" work | avoids actor isolation | grep `Task.detached` near `Process()` (reading heuristic); `proc` mode in V3 leaves the child alive |
| 8 | Setting `Process.environment = ["FOO": "1"]` and losing `PATH`/`HOME` | partial dictionary replaces | V13; grep P13 |
| 9 | `c.environment = e; run(self.config())`, mutating a copy | value-type copy semantics | sentinel test V5 |
| 10 | `.name("./build/tool")` or `.name("/usr/bin/git")` | `Process` required a URL so models mix styles | grep P10; runtime `spawnFailed` |
| 11 | `limit: Int.max`/`1 << 40` to "make the compile error go away" | the limit is the new mandatory argument | grep C6 (V7d) |
| 12 | Using `.string(limit:)` for tar/digest/binary | `String` is the convenient type | reading heuristic (P15); V8 |
| 13 | `error.code` directly in a `catch` (typed-throws assumption) | the release notes say "typed throws" | compile (the cast is required); wrapper tests |
| 14 | Inventing APIs: `Subprocess.run(command: "ls -la")`, `.timeout:`, `Execution.waitForExit()`, `.exitCode` | no timeout or string-command overload exists | compile against 1.0.1 (any of these fails to build) |
| 15 | `toProcessGroup: true` without `createSession`, killing the test runner or the caller | doc warning is in a comment only | read `PlatformOptions`; V3 `sub-group-good` shape |
| 16 | `import Subprocess` plus `import Foundation` collisions on `Process`/`run` names in files that also keep legacy code | both in scope | compile; keep one process API per file |

## Contested / evolving

- **Subprocess vs `Process` for new code (as of 2026-10-10):** settled for new code by SF-0007 ("will eventually replace `Process`") and the Swift 6.4 blog naming the 1.0 release; swift-argument-parser's own test helper and SwiftPM/swift-build still use `Process` or their own spawn layers (corpus), so legacy `Process` survives for years. Trend: Subprocess; 0.x pins in tuist and element-x-ios show adoption is gated by the 6.2 toolchain floor.
- **Exact pin vs range (as of 2026-10-10):** swiftly pins `exact: "1.0.0"` (it is an application with a lockfile), which this dive shows holds a known leak. The map's decision `from: "1.0.1"` stands; the counter-argument (an exact pin for reproducible binaries) is answered by `Package.resolved`, but only for executables, so libraries and the SDK use `from:`.
- **Teardown default (as of 1.0.1):** an empty sequence means immediate SIGKILL of the direct child. A graceful default (SIGTERM, then kill) is arguably what most callers want, and the group-kill needing `createSession` is a footgun the doc comment already admits; the API may grow convenience presets, but nothing in SF-0037's "Future Directions" promises it. Re-check at the next minor.
- **Typed throws on `run`:** the 1.0 notes say only `SubprocessError` escapes and most internals use typed throws, but the public signatures stayed `throws`. If a later minor adopts `throws(SubprocessError)`, the wrapper's cast disappears; not a source break to adopt it now.
- **Task-cancel semantics:** returning normally with `.signaled(9)` instead of throwing `CancellationError` is the current behaviour (RAN, 6.3 and 6.4); SE-0504's `withTaskCancellationShield` (6.4) may change how cleanup inside bodies is written, not how `run()` reports.
- **Windows and Darwin parity:** README claims "feature parity across all supported platforms". Teardown on Windows has a different step sequence (`WM_CLOSE`, `CTRL_C_EVENT`, `CTRL_BREAK_EVENT`), `TerminationStatus` has fewer cases, and pipe creation differs on Darwin (no `pipe2` until the SDK declares it). None verified here (unverified: read only).
- **Static Linux SDK:** README lists "Build only" (not tested in CI). The fleet's static-musl CLIs depend on a path the maintainers do not run tests for; a smoke test of `run()` under `--swift-sdk x86_64-swift-linux-musl` belongs with the release dive (not run here).
- **SwiftLint as a rule vehicle:** the static Linux binary cannot run `custom_rules`. Whether that is a defect or a documented limit was not established; the map's SwiftLint-only-for-custom-rules decision should be re-examined if the gate runs on Linux static builds.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/swiftlang/swift-subprocess/blob/main/README.md | Package README (read raw, 2026-10-10) | 1.0.x | Teardown, platform table, output/input options, Swift-versions table; also the stale 0.4 snippet |
| https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.1 | Release notes 1.0.1 | 2026-10-09 | The fd-leak, CLOEXEC, posix_spawn and supplementaryGroups fixes |
| https://github.com/swiftlang/swift-subprocess/releases/tag/1.0.0 | Release notes 1.0.0 (what changed since SF-0007 and beta.1) | 2026-08-04 | Limits, TerminationStatus, teardown group parameter, `Executable.name` semantics, tools 6.2 |
| https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0037-subprocess-1.0.md | SF-0037 Subprocess 1.0 update | 2026-07 review | Normative description of every 1.0 API change |
| https://github.com/swiftlang/swift-foundation/blob/main/Proposals/0007-swift-subprocess.md | SF-0007 original proposal | 2024-25 | Motivation against `Process`; Task Cancellation section |
| https://github.com/swiftlang/swift-subprocess/blob/1.0.1/Sources/Subprocess/Teardown.swift | Teardown implementation at tag 1.0.1 | 1.0.1 | Exact sequence, implicit kill, process-group warnings |
| https://github.com/swiftlang/swift-subprocess/blob/1.0.1/Sources/Subprocess/Configuration.swift | Run/cancel/termination machinery at tag 1.0.1 | 1.0.1 | Where cancel and body-throw trigger teardown; `TerminationStatus`; `Executable.name` |
| https://github.com/swiftlang/swift-subprocess/blob/1.0.1/Sources/Subprocess/API.swift | The six `run` overloads | 1.0.1 | Exact signatures and defaults |
| https://github.com/swiftlang/swift-subprocess/blob/1.0.1/Package.swift | Manifest (`swift-tools-version: 6.2`, trait, swift-system) | 1.0.1 | Floor and dependency proof |
| https://www.swift.org/blog/swift-6.4-released/ | Swift 6.4 release post (raw post read) | 2026-09-15 | Official statement that Subprocess reached 1.0 |
| https://developer.apple.com/documentation/foundation/process | Apple `Process` reference | current | `waitUntilExit`, `terminate`, `environment`, run-once semantics (Darwin wording) |
| https://github.com/swiftlang/swift-corelibs-foundation/blob/main/Sources/Foundation/Process.swift | Linux/Windows `Process` implementation | 6.x | `waitUntilExit` is a run-loop spin, never a read |
| https://github.com/swiftlang/swift-corelibs-foundation/blob/main/Sources/Foundation/FileHandle.swift | `Pipe` implementation (`pipe()`) | 6.x | Shows no pipe resizing on Linux |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0450-swiftpm-package-traits.md | SE-0450 package traits | 2024-25 | `traits: []` syntax and semantics |
| https://manpages.debian.org/bookworm/manpages/pipe.7.en.html | pipe(7) man page | stable | 64 KiB capacity, blocking write on a full pipe, F_SETPIPE_SZ |
| https://cwe.mitre.org/data/definitions/78.html | CWE-78 OS command injection | current | Parameterization mitigation (separate arguments) |
| https://blog.rust-lang.org/2024/04/09/cve-2024-24576/ | Rust advisory for the Windows batch-file escaping class | 2024-04 | Why Subprocess hardens `.bat`/`.cmd` |
| https://github.com/swiftlang/swiftly (swiftly@c8cf2e35bfca) | Exemplar: exact 1.0.0 pin, dropped env override | 2026-10 | Real defects used as plants |
| https://github.com/apple/container (container@f70ecbb926d9) | Exemplar: `Process` launch paths, `sh -c` interpolation | 2026-10 | Safe and latent-deadlock legacy shapes |
| https://github.com/tuist/tuist (tuist@2f6ac74754bf) | Exemplar: only `teardownSequence` user | 2026-10 | Partial-compliance wrapper with `.custom` environment |
| /home/mherwig/dev/ocx-sdk-python (ocx-sdk-python@80136dde4162, `src/ocx_sdk/_process.py`) | Fleet's Python process wrapper | 2026-10 | The contract the Swift SDK mirrors: pump threads, kill ladder, new session |

Primary (maintainer, swift.org, SE/SF proposal or normative): rows 1-14, plus pipe(7) and CWE-78 as normative references: 16 of 21. Exemplar and fleet sources: the last five rows.

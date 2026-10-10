---
title: "Swift CLI: log bootstrap, config precedence, ServiceGroup signals, the root main() hook, aggregate errors and the remaining Rust CLI rows"
topic: "cli/services-and-config (W3-8, revised): rows M-F-09, M-F-10, M-F-12, M-F-14, M-F-15 plus Rust CLI-04, CLI-08, CLI-10, ERR-21 (and CLI-03, found on the way)"
agent: "swift-cli-services-and-config"
model: sonnet
date_researched: 2026-10-10
sources_count: 29
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/services-and-config/
id_family: SW-CLI (new rules append from SW-CLI-15)
scope: >-
  Covers: the swift-log bootstrap rule, flag/env/file precedence with XDG paths, the swift-service-lifecycle
  ServiceGroup signal rule and its exit status, the root `static func main() async` hook (run, not just read),
  aggregate batch errors ("K of N failed"), and a decision on which of error envelope, progress, prompts,
  @OptionGroup global flags and completions become rules. Every runnable claim was run on Swift 6.4.0 and 6.3.3
  (Linux x86_64, Docker swift:6.4 and swift:6.3).
  Not covered: Windows, WASI, macOS and arm64 behaviour (marked "unverified: read only", owner Q7), SW-CLI-01..14
  themselves (cited, not re-derived), child-process status mapping (SW-IO), trap policy (SW-ERR), cleanup under
  cancellation (SW-CONC), and Bazel.
---

# Swift CLI: services, logging and configuration

All dates 2026-10-10. Versions: Swift 6.4.0 and 6.3.3; swift-service-lifecycle 2.12.1 (tools 6.1, 2026-10-05); swift-log 1.16.1 (tools 6.2, 2026-10-07); swift-configuration 1.2.2 (tools 6.2, 2026-10-05); swift-argument-parser 1.8.2 (resolved by the fixtures; the exemplar clone is `efd239f0055b`). Abbreviations: **[cli]** = `swift-cli.md` (SW-CLI-01..14); **[ces]** = `swift-cli/exit-codes-and-streams.md`; **[map]** = `swift-topic-map.md`; **R** = `/home/mherwig/.cache/research-lang/swift-tools/run.sh`; **FX** = the fixture root above; **B** = `/home/mherwig/.cache/research-lang/swift-tools/build`. The consolidated outputs of every run are in `FX/results-6.4.txt` and `FX/results-6.3.txt`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What this dive corrects in SW-CLI-08 and SW-CLI-09](#1-what-this-dive-corrects-in-sw-cli-08-and-sw-cli-09)
   2. [ServiceGroup signals](#2-servicegroup-signals-m-f-14)
   3. [Exit status when a signal ends the run](#3-exit-status-when-a-signal-ends-the-run-plant-f)
   4. [The root main() hook](#4-the-root-main-hook-plant-c)
   5. [Log bootstrap](#5-log-bootstrap-m-f-09)
   6. [Configuration precedence](#6-configuration-precedence-m-f-10-plant-b)
   7. [XDG paths](#7-xdg-paths)
   8. [Aggregate errors](#8-aggregate-errors-err-21-plant-d)
   9. [The remaining Rust CLI rows](#9-the-remaining-rust-cli-rows-cli-03-04-08-09-10-m-f-12-m-f-15)
   10. [FoundationEssentials in place of Foundation](#10-foundationessentials-in-place-of-foundation-plant-e)
   11. [Decision table](#11-decision-table)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **`ServiceGroup` ignores every signal unless told otherwise.** `ServiceGroupConfiguration.gracefulShutdownSignals` and `.cancellationSignals` default to `[]` (`swift-service-lifecycle@c55297914e26:Sources/ServiceLifecycle/ServiceGroupConfiguration.swift:140,143`). Measured: with no signals SIGTERM ends the process with 143 and no cleanup; with `[.sigterm]` the cleanup lines print and the process exits 0.
- **List `[.sigterm, .sigint]` explicitly.** `[.sigterm]` alone leaves Ctrl-C at 130 with no cleanup (measured). Hummingbird, Vapor and the Lambda runtime example already list both or split them (`hummingbird@1bd3b407fb47:Sources/Hummingbird/Application.swift:161`, `vapor@bf77fc69b142:Sources/Vapor/Application.swift:227`).
- **Bound the escalation.** A service that ignores graceful shutdown hangs until the orchestrator's SIGKILL (measured 137 after 3 s); `maximumGracefulShutdownDuration = .seconds(1)` escalates to cancellation and exits 0.
- **Three `ServiceGroup` traps beyond the defaults:** overlapping graceful and cancellation signals trap (exit 132, `ServiceGroup.swift:62`); a service whose `run()` returns early makes `group.run()` throw `ServiceGroupError.serviceFinishedUnexpectedly` (status 1 after classification); the library's own DocC example uses `.shutdownGracefully`, which does not exist (the member is `.gracefullyShutdownGroup`; compile error measured).
- **Exit status of a signal ending.** A service that shut down gracefully and returned exits 0. A finite command that was interrupted runs its cleanup, flushes, then restores `SIG_DFL` and re-raises with `kill(getpid(), sig)`, so the shell sees 143 or 130 (measured: re-raise 143, `return` after cleanup 0, unhandled 143 with no cleanup). A second signal during cleanup forces 143 at once.
- **`await Self.main(nil)` plus a flush check is not a complete root hook.** `--help`, `--version` and `--generate-completion-script` leave through `exit(withError:)` inside `main(_:)`; `fx --help >/dev/full` exits 0 under the simple hook and 74 under a hook that owns parse, run and catch (measured). This corrects the placement paragraph of SW-CLI-09 and SW-CLI-08, which were not run.
- **Detect a clean exit with `Self.exitCode(for: error) == .success`.** `error is CleanExit` is false for `--help` (measured: the help text went to stderr).
- **The flush check must record errno at write time and exempt EPIPE.** Without the exemption `fx big | head -1` exits 74 (measured), contradicting SW-CLI-08.
- **`>&-` is not EBADF in a Swift process.** The runtime opens an epoll descriptor that takes fd 1 (`readlink /proc/self/fd/1` is `anon_inode:[eventpoll]`), so writes fail with EINVAL and the hook reports 74. Rust's std ignores EBADF; this fleet rule differs on purpose.
- **Log bootstrap: once, in the executable, stderr named, level resolved first.** A second `LoggingSystem.bootstrap` traps (exit 132, `LoggingSystem.swift:165`). A `Logger` created before the bootstrap keeps the default handler at `.info` and ignores `--log-level debug` (measured). The doc comment at `LoggingSystem.swift:18` says the default is STDOUT; the code at `:30` and the run both say stderr.
- **Configuration precedence is flag > env > project file > user file > system file > default.** The `@Option` that feeds it must be `Int?` with no default: `@Option var timeout: Int = 30` makes the flag always present and the env var never wins (measured end to end). A 32-case table test over all layer subsets goes red on a naive resolver (31 issues) and green on the real one.
- **An empty env var is unset, and a bad value is an error.** swift-configuration 1.2.2 treats `CFGCLI_TIMEOUT=` as set, fails the Int parse and returns the default instead of the lower layers (measured, 1 issue); filter empty values before the provider.
- **XDG: Foundation covers two of five directories.** `FileManager.urls(for: .cachesDirectory/.applicationSupportDirectory, in: .userDomainMask)` maps to `XDG_CACHE_HOME` and `XDG_DATA_HOME` on Linux; there is no config or state mapping, so `XDG_CONFIG_HOME`, `XDG_CONFIG_DIRS` and `XDG_STATE_HOME` need one small helper that ignores empty and relative values. SwiftPM and sourcekit-lsp each deviate from the spec in a different way.
- **Every throwing task-group form is first-error-wins.** `waitForAll()`, `for try await` and `withThrowingDiscardingTaskGroup` all lose the second failure (measured). The fix is children that return a `Result`, a sorted per-item list, a `K of N failed` line and one status.
- **Five Rust rows become Swift rules:** prompts MUST, `@OptionGroup` global flags MUST for fleet-family CLIs, error envelope SHOULD, progress SHOULD, completions CONSIDER. A sixth, found on the way, is CLI-03: ArgumentParser echoes raw ESC and BEL from argv into its error text (measured), so the root hook sanitizes.
- **`import FoundationEssentials` removes the import-order trap but not the need for Glibc.** `@preconcurrency import Glibc` before or after it compiles (exit 0); alone it cannot see `ferror` (`cannot find 'ferror' in scope`). It also has no `JSONSerialization`.

## Findings

### 1. What this dive corrects in SW-CLI-08 and SW-CLI-09

[cli] leaves two paragraphs unrun, and this dive ran them:

- SW-CLI-08 "Placement": a root `static func main() async` that sets `SIG_IGN` and then `await Self.main(nil)` "is the hook". It compiles, but `AsyncParsableCommand.main(_:)` handles `--help` and every error by calling `exit(withError:)`, which is `Never` (`swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Parsable Types/AsyncParsableCommand.swift:65-76`, `.../ParsableArguments.swift:223-241`). The flush check placed after `await Self.main(nil)` therefore runs only on the success path.
- SW-CLI-09 "Place it once, after `await Self.main(nil)` returns in the root `main()`... The flush-in-root placement was not run." Run: see finding 4. Under the simple hook `fx --help >/dev/full` exits 0.

Both are superseded by SW-CLI-23 below. The mechanism of SW-CLI-08 and SW-CLI-09 (SIG_IGN first, `ferror` plus `fflush`, exit 74) stands. One more correction to SW-CLI-07's rationale: with `import FoundationEssentials` the import order no longer matters (finding 10).

### 2. ServiceGroup signals (M-F-14)

**Defaults.** `ServiceGroupConfiguration` declares `public var gracefulShutdownSignals = [UnixSignal]()` at `:140` and `public var cancellationSignals = [UnixSignal]()` at `:143`; both public initializers default the parameters to `[]` (`:226-227`, `:258-259`). `ServiceGroup.init(services:gracefulShutdownSignals:cancellationSignals:logger:)` also defaults both to `[]` and, since 2.12.0, defaults `logger` to `.current` (`ServiceGroup.swift:86-91`; [map] domain note, release 2.12.0). The README example passes `gracefulShutdownSignals: [.sigterm]` ([swift-service-lifecycle README](https://github.com/swift-server/swift-service-lifecycle)).

**Plant (a), run.** Fixture `FX/a-servicegroup` (tools 6.2, swift-service-lifecycle `exact: "2.12.1"`, Swift 6 mode). A `Worker: Service` runs `cancelWhenGracefulShutdown { sleep 30 s }`, then prints `cleanup-begin`, sleeps 300 ms and prints `cleanup-done`; `main` maps `run()` returning to `Status.success` (0) and a throw to `Status.failure` (1) per SW-CLI-01. The harness `signal-check.sh` starts the binary, waits 1.5 s, sends the signal and waits up to 3 s.

| Config | Signal | Result (6.4.0 and 6.3.3) |
|---|---|---|
| `gracefulShutdownSignals: []` (default) | SIGTERM | exit 143, stderr `worker: started` only (RED) |
| `[.sigterm]` | SIGTERM | exit 0; `cleanup-begin`, `cleanup-done`, `run() returned normally` (GREEN) |
| default | SIGINT | exit 130, no cleanup |
| `[.sigterm]` | SIGINT | exit 130, no cleanup (Ctrl-C is not covered) |
| graceful `[.sigterm]`, cancellation `[.sigint]` | SIGINT | exit 0, cleanup runs |
| service ignores graceful shutdown, no limit | SIGTERM | still alive after 3 s; SIGKILL gives 137 |
| same, `maximumGracefulShutdownDuration = .seconds(1)` | SIGTERM | exit 0, `stubborn: cancelled` |
| graceful `[.sigterm]` and cancellation `[.sigterm]` | none | exit 132: `ServiceLifecycle/ServiceGroup.swift:62: Precondition failed: Overlapping graceful shutdown and cancellation signals` |
| a service whose `run()` returns at once | none | `group.run()` throws `ServiceGroupError ... A service has finished unexpectedly`, status 1 |

Two harness facts matter for anyone repeating this. Background jobs in non-interactive bash start with SIGINT ignored, so the SIGINT rows need `set -m` (otherwise the first run read 137, a lie; SW-CLI-11 already warns). And the escalation row only works because the stubborn service honours task cancellation; a service that ignores both survives `maximumGracefulShutdownDuration` and is killed by the orchestrator.

**Why the signals work.** `UnixSignalsSequence` creates one `DispatchSource.makeSignalSource` per signal and feeds an `AsyncStream` (`swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:101-150`); `await withTaskCancellationHandler` at `:151` awaits each source's registration so an early signal is not missed. On Darwin it first calls `signal(sig, SIG_IGN)` so kqueue can deliver; on Linux it does not, and the registered handler replaces the default action.

**Platforms (unverified: read only).** `UnixSignalsSequence` bodies sit under `#if !os(Windows) && !os(WASI)` (`:85,99,113`); on those platforms the else branch builds `AsyncStream<UnixSignal> { _ in }`, which never yields. `gracefulShutdownSignals: [.sigterm]` there is a silent no-op. A service for Windows or WASI must call `await group.triggerGracefulShutdown()` (public, `ServiceGroup.swift:235`) from its own mechanism. `UnixSignal` offers 13 members (`sigabrt, sighup, sigill, sigint, sigsegv, sigterm, sigusr1, sigusr2, sigalrm, sigquit, sigwinch, sigcont, sigpipe`; `UnixSignal.swift:31-45`); SIGKILL and SIGSTOP cannot be caught, so they are not there.

**Stale and wrong documentation (an agent trap).**
- The 2020 swift.org post says the 1.x `ServiceLifecycle` "by default" installs handlers for `INT` and `TERM` ([blog](https://www.swift.org/blog/swift-service-lifecycle/)). That is the pre-2.0 API. The 2.x `ServiceGroup` defaults to none; the 2.x announcement shows both `[]` and `[.sigterm]` without stating a default ([forum](https://forums.swift.org/t/new-servicelifecycle-apis/65521)).
- The 2.12.1 DocC article "Adopting ServiceLifecycle in applications" writes `successTerminationBehavior: .shutdownGracefully` (lines 269-270) and a stray `,,` in a `ServiceGroup` call. Measured: `type 'ServiceGroupConfiguration.ServiceConfiguration.TerminationBehavior' has no member 'shutdownGracefully'`; with `.gracefullyShutdownGroup` the same file builds (fixture `FX/a-servicegroup/Sources/svc/DocBug.swift`, `docbug.sh`).

**Hummingbird shows both shapes in one file.** `Application.run()` builds `ServiceGroup(configuration: .init(services: services, logger: self.logger))` with no signals (`hummingbird@1bd3b407fb47:Sources/Hummingbird/Application.swift:153-156`), and `runService(gracefulShutdownSignals: [UnixSignal] = [.sigterm, .sigint])` is the signal-aware wrapper (`:161-170`). A file-level grep for "constructs a group but never mentions the signals" misses this (see V17a, Limits).

### 3. Exit status when a signal ends the run (plant f)

Two cases with two answers.

**A finite command interrupted by a signal** (a long pull, a batch): cleanup must complete, and the shell must still see the signal. Fixture `FX/c-fx`, command `fx long`, three policies:

| `--mode` | SIGTERM result |
|---|---|
| `unhandled` | exit 143, `long: started` only; no cleanup |
| `exit0` (handler, cleanup, `return`) | cleanup lines printed, **exit 0**: an interrupted run reports success (RED) |
| `reraise` (handler, cleanup, flush, `signal(sig, SIG_DFL); kill(getpid(), sig)`) | cleanup lines printed, **exit 143** (GREEN); SIGINT gives 130 |

Two SIGTERMs 0.1 s apart under `reraise`: exit 143 after `cleanup-begin` and before `cleanup-done` (the second stage forces the default action). The mechanism is SW-CLI-10 and -11 unchanged; what is new is the order: cleanup, then `fflush(stdout)` (via `Stdio.flushFailure()`, result ignored because a signal ending is already a non-success), then re-raise. The signal stream is built as SW-CLI-11 says (`SIG_IGN` plus `DispatchSource` plus `AsyncStream`); `DispatchSourceSignal` is not `Sendable` on Linux, so the fixture wraps the sources in one `struct SourceBox: @unchecked Sendable` (the same hatch `containerization@3e7bc39e66b3:Sources/ContainerizationOS/AsyncSignalHandler.swift:65` takes with `nonisolated(unsafe)`).

**A service that shut down gracefully** is a completed contract, not an interrupted one. `ServiceGroup.run()` returns normally, `main` returns, and the process exits 0 (`fx serve --signals sigterm`: exit 0 with `cleanup-done`; `--signals none`: 143). This is what Hummingbird, Vapor and the Lambda example do. It deliberately differs from the command case; the fleet's EXIT-11 (`rules/rust-quality/cli-contract.md:68`) speaks about handlers that "exist for cleanup" of a command. A CLI that hosts a `ServiceGroup` for a finite job and wants 143 can set a flag in its own handler and re-raise after `run()` returns. Argued, not normative (see Contested).

`ServiceGroup.run()` throwing is a failure and goes through the SW-CLI-01 classifier; `ServiceGroupError` has three codes (`alreadyRunning`, `alreadyFinished`, `serviceFinishedUnexpectedly`; `ServiceRunnerError.swift:19-23`), and none of them is `.usage` or `.config`.

### 4. The root main() hook (plant c)

ArgumentParser offers `static func main() async` as the root override point (the protocol extension supplies `main()` that calls `main(nil)`, `AsyncParsableCommand.swift:88-90`). Three variants of one fixture (`FX/c-fx`, same sources, `-D` flags):

- `NOHOOK`: no override (baseline).
- default: `signal(SIGPIPE, SIG_IGN)`, `await Self.main(nil)`, then the SW-CLI-09 check.
- `FULLHOOK`: `signal(SIGPIPE, SIG_IGN)`, then `asyncParseAsRoot(nil)`, `run()`, `catch` rendering through `Self.fullMessage(for:)` and `Self.exitCode(for:)`, mapping through `Status.checked`, then the flush check, then one `Stdio.terminate(status)`.

Matrix (`hook-matrix.sh`, 6.4.0; 6.3.3 identical):

| Probe | NOHOOK | simple hook | FULLHOOK |
|---|---|---|---|
| `fx ok` | 0 | 0 | 0 |
| `fx fail` | 65 | 65 | 65 |
| `fx --bogus` | 64 | 64 | 64 |
| `fx --help`, `--version` | 0 | 0 | 0 |
| `fx ok >/dev/full` | **0** | 74 | 74 |
| `fx big --small >/dev/full` | 0 | 74 | 74 |
| `fx --help >/dev/full` | 0 | **0** | **74** |
| `fx fail >/dev/full` | 65 | 65 | 65 |
| `fx ok >&-` | **0** | 74 (`Invalid argument`) | 74 |
| `fx --help >&-` | 0 | **0** | **74** |
| `fx big \| head -1` | **141** | 0 | 0 |

Findings from the matrix:

1. **The simple hook loses exactly the CleanExit family.** `--help`, `--version` and `--generate-completion-script` print through `print(fullText)` and `Platform.exit(0)` inside `exit(withError:)` (`ParsableArguments.swift:233-240`); the code after `await Self.main(nil)` never runs. Completions are the practical case: `fx --generate-completion-script bash >/dev/full` exits 0 under the simple hook and 74 under FULLHOOK.
2. **`error is CleanExit` is the wrong test.** The first FULLHOOK draft used it; `--help` then landed on stderr with exit 0. The error `asyncParseAsRoot` throws for help is an internal type. `Self.exitCode(for: error) == .success` is the public, correct test (`ParsableArguments.swift:193-197`).
3. **The flush check needs the errno of the first failed write, and EPIPE is success.** `Stdio.out` returns `false` after a failed `fputs` or a set `ferror`, records the first errno in a `Mutex<Int32>`, and `flushFailure()` returns nil for `EPIPE`. The deliberately strict build (`-DSTRICTEPIPE`) turns `fx big | head -1` into `fx: error: write to stdout failed: Broken pipe`, exit 74. FULLHOOK gives 0. The output loop stops when `Stdio.out` returns `false`, so `big` does not burn the rest of its 1 MiB.
4. **`>&-` shows an fd reuse hazard.** With stdout closed, `fx leak leak.txt >&-` reports `leak: opened fd 5` and `leak: fd1 -> anon_inode:[eventpoll]`: the Swift runtime took fd 1 for its epoll before `main` ran. Writes to it fail with EINVAL, so `errno` is EINVAL, not EBADF, and the hook's 74 is right. Without any hook the same command exits 0 with output silently dropped. Rust's std treats EBADF on stdout as success; here a closed stdout is an I/O fault (SHOULD, contested below).
5. **`exit` inside a `ParsableCommand` is the instance method.** `exit(...)` in the root type failed to compile (`use of 'exit' refers to instance method rather than global function 'exit' in module 'SwiftGlibc'`). The one terminator lives in `Stdio.swift` (SW-CLI-03, SW-CLI-07 already confine the C globals to that file).
6. **`DispatchSource` and `SIGPIPE` coexist.** `SIG_IGN` is set before the first `await`, so every later `ferror` poll sees EPIPE rather than a signal death.

The error text path is also where CWE-150 matters (finding 9, CLI-03).

### 5. Log bootstrap (M-F-09)

**Pinned semantics of `LoggingSystem.bootstrap`** (swift-log 1.16.1, `swift-log@4038b6a4f74a:Sources/Logging/LoggingSystem.swift`, identical to `main` at the time of reading):
- Once per process: `precondition(!validate || !self.initialized, self.violationErrorMessage)` at `:165`, message `logging system can only be initialized once per process.` (`:31`). Measured: a second call exits 132 with that message and an 88-line backtrace.
- Default handler: `StreamLogHandler.standardError(label:)` (`:30`). The type's doc comment at `:18` still says "a `StreamLogHandler` that presents its output to `STDOUT`". Run: with no bootstrap, `fx logdemo --skip-bootstrap` writes its log lines to stderr and only `result-line` to stdout. Trust the code; name the stream anyway.
- `bootstrap(_:)` takes `@escaping @Sendable (String) -> any LogHandler`; the factory runs per `Logger(label:)`.
- A `Logger` captures its handler at initialisation (`Logger.swift:1222-1223`: `self.init(label: label, LoggingSystem.factory(label, LoggingSystem.metadataProvider))`).
- `Logger.current` (task-local, 1.16) falls back to a process-wide `Logger(label: "")` built on first touch, so "bootstrap must be called before any task-local logger API is exercised"; task-locals are not inherited by `Task.detached` (`Logger.swift:1519-1529`). `ServiceGroup.init(... logger: Logger = .current)` evaluates that default when the group is built.
- Best practice 003: libraries accept a `Logger` parameter or read `Logger.current` and never construct their own; the application binds the logger at the entry point ([BP-003](https://github.com/apple/swift-log/blob/1.16.1/Sources/Logging/Docs.docc/BestPractices/003-AcceptingLoggers.md)).

**Plant, run** (`log-check.sh`, `fx logdemo`): one logger is created before the bootstrap, one after.

| Run | Result |
|---|---|
| bootstrap with level from flag/env/default `.info` | `info` lines from both loggers; no debug |
| `--log-level debug` | `debug created-after-bootstrap` appears; **`debug created-before-bootstrap` does not**: that logger kept the default handler at `.info` |
| `FX_LOG_LEVEL=debug` | same as the flag |
| `FX_LOG_LEVEL=debug --log-level info` | flag wins: no debug |
| `--skip-bootstrap --log-level debug` | flag ignored entirely; only info lines; stdout still clean |
| `--twice` or a "library" calling bootstrap after the app | exit 132, `Precondition failed: logging system can only be initialized once per process.` |

**Exemplars** disagree with themselves. `container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:30-35` bootstraps inside a lazily initialised file-scope global (`private nonisolated(unsafe) var bootstrapLogger = { LoggingSystem.bootstrap(...) ... }()`), the level is set later by mutating that one logger (`:149-151`), and five more commands bootstrap again (`ContainerK8s/Commands/K8sList.swift:33`, `K8sCreate.swift:61`, `K8sLoadImage.swift:53`, `K8sWriteConfig.swift:39`, `K8sDelete.swift:37`; whether any process reaches two is unchecked). `containerization@3e7bc39e66b3:Sources/cctl/cctl.swift:24` bootstraps once, explicitly with `StreamLogHandler.standardError`, in an executable. `tuist@2f6ac74754bf` has five bootstrap sites in four files (`cli/Sources/TuistKit/Utils/Dependencies.swift:120`, `cli/Sources/tuist/Dependencies.swift:81,188`, `cli/Sources/TuistLogging/ApplicationLogStore.swift:44,51`).

The design that follows: resolve level (flag > env > `.info`), call `bootstrap` once with a factory that sets `logLevel` on every handler, then create loggers. Setting `logLevel` on one `Logger` instance (container's way) covers only that instance.

### 6. Configuration precedence (M-F-10, plant b)

The order: **flags > process env > project file > user file > system file(s) > default** (clig.dev "Apply configuration parameters in order of precedence"; fleet Rust CLI-15 puts the same five tiers above the default; [clig.dev](https://clig.dev/)). ArgumentParser reads no environment variables, so the tiers below the flag are code.

Fixture `FX/b-config` (library `Cfg`, executable `cfgcli`, Swift Testing target; tools 6.2): `resolveHandRolled(flag:env:cwd:)` is about 25 lines on `FoundationEssentials` (`JSONDecoder`, `FileManager`); `resolveSwiftConfiguration` builds `ConfigReader(providers:)` in the same order. A planted `naiveResolve` is env-over-flag with no files, and `cfgcli-bad` declares `@Option var timeout: Int = 30`.

**The precedence test.** `@Test(arguments: 0..<32)` lays out the files for exactly the layers in a 5-bit mask (flag=2, env=3, project=4, user=5, system=6, all distinct) and expects the highest present layer, else `default 30`. Plus: an empty env var counts as unset; empty and relative `XDG_*` values are ignored; an invalid env value throws.

| `swift test` with `IMPL=` | Result |
|---|---|
| `hand` (hand-rolled) | `Test run with 5 tests in 2 suites passed`, exit 0 |
| `config` (swift-configuration) | failed with 1 issue, exit 1: `an empty env var counts as unset` |
| `config-filtered` (`env.filter { !$0.value.isEmpty }`) | passed, exit 0 |
| `naive` | failed with 31 issues (30 of 32 subsets plus one), exit 1 |

End to end (`e2e.sh`, scratch dir with `HOME` and `XDG_CONFIG_HOME` set): user file only gives `timeout=5 layer=user`; project plus user gives 4; `CFGCLI_TIMEOUT=3` gives 3; `--timeout 2` beats the env var; `CFGCLI_TIMEOUT=` falls through to the project file (hand-rolled) but gives `timeout=30` through swift-configuration; `cfgcli-bad` with `CFGCLI_TIMEOUT=3` and no flag prints `timeout=30` (RED) and only honours the flag when given.

Decisions drawn from the run:
1. The participating `@Option` is `Int?` with no default; the default is applied by the resolver once, and `--help` text states it.
2. Empty env var means unset (for tool variables; `NO_COLOR` already uses "non-empty", SW-CLI-06). A set but unparsable value is a configuration error (`Status.config`, 78) naming the variable, never a silent fall-through to a lower layer. In the fixture the throw reaches ArgumentParser unclassified (exit 1, `Error: invalid(layer: ...)`); a compliant program classifies it.
3. swift-configuration's merge order is the provider array order, first wins ([README](https://github.com/apple/swift-configuration)); `CommandLineArgumentsProvider` needs the `CommandLineArguments` trait and parses its own `--key value` dialect, so an ArgumentParser CLI feeds the parsed flag in through `InMemoryProvider` instead (what the fixture does). `EnvironmentVariablesProvider().prefixKeys(with: ["cfgcli"])` maps `timeout` to `CFGCLI_TIMEOUT`. It does not report which layer won, so the fixture probes providers one by one for the `layer=` label.
4. Hand-roll for three layers and a handful of keys; adopt swift-configuration for servers with many keys, reloading (`ReloadingFileProvider`, trait `Reloading`) or secret redaction (`AccessLogger`). AsyncHTTPClient already depends on it ([map] domain note). CONSIDER.

### 7. XDG paths

The spec ([XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/), version 0.8, 2021): all paths must be absolute and a relative value is invalid and ignored; an unset or empty `XDG_CONFIG_HOME` means `$HOME/.config`; `XDG_CONFIG_DIRS` is a colon-separated, preference-ordered list defaulting to `/etc/xdg`; `XDG_DATA_HOME` defaults to `$HOME/.local/share`, `XDG_CACHE_HOME` to `$HOME/.cache`, `XDG_STATE_HOME` to `$HOME/.local/state` (logs, history and recent state belong there). The `XDG` enum in the fixture implements exactly that (`Paths.swift`), and unit tests pin the empty, relative and ordered cases.

What Foundation gives (run, `FX/f-xdg-foundation`, `FileManager.default.urls(for:in: .userDomainMask)` on 6.4.0 and 6.3.3): `.cachesDirectory` follows `XDG_CACHE_HOME` (unset: `$HOME/.cache`; empty or relative: ignored) and `.applicationSupportDirectory` follows `XDG_DATA_HOME`; `.libraryDirectory` returns `[]`. The source confirms the closed set: `swift-foundation@aadd9259be07:Sources/FoundationEssentials/FileManager/SearchPaths/FileManager+XDGSearchPaths.swift:165-205` maps only autosave, desktop, document, caches, application support, downloads, user, movies, music, pictures, shared public and trash. `_xdgConfigHomeURL()` (`:55-61`) is private and used only to find `user-dirs.dirs`. So **config and state need a helper**; cache and data can use Foundation. Foundation also keeps relative entries of `XDG_CONFIG_DIRS` (`:67-71`), which the spec says to drop.

Exemplars deviate in different ways: SwiftPM uses `$XDG_CONFIG_HOME/swiftpm` when the variable is merely defined (empty or relative included, via `AbsolutePath(validating:)`) and otherwise `~/.swiftpm`, not `~/.config/swiftpm` (`swift-package-manager@5546f44a3b52:Sources/Basics/FileSystem/FileSystem+Extensions.swift:219-227`); sourcekit-lsp builds `URL(fileURLWithPath: xdgConfigHome)`, which resolves a relative value against the cwd, and has no `$HOME/.config` fallback (`sourcekit-lsp@c6ce93d5f8aa:Sources/sourcekit-lsp/SourceKitLSP.swift:198-207`). Windows (`%APPDATA%`) and macOS (`~/Library/Application Support`) conventions: unverified: read only; a cross-platform tool needs its own mapping behind the same helper.

Environment variables of the tool itself are prefixed (`TOOL_`) and documented next to their flag (Rust CLI-13); the prefix is spelled once (`Names.envKey`).

### 8. Aggregate errors (ERR-21, plant d)

Fixture command `fx batch` runs five targets `a b c d e` concurrently (`process` sleeps 40 ms times index+1, so completion order is deterministic); `b` fails with `FxError.badData` (65), `d` with `.unreachable` (69). Results on 6.4.0 and 6.3.3 (`batch-check.sh`, stdout discarded, stderr shown):

| `--mode` | Implementation | Output and exit |
|---|---|---|
| `first` | `withThrowingTaskGroup` + `try await group.waitForAll()` | waits for all children (`finished a, c, e`), then one `Error: manifest malformed`, **exit 1**; d's failure is lost |
| `next` | `withThrowingTaskGroup` + `for try await _ in group {}` | `finished a`, one error, **exit 1**; c, d, e were cancelled before finishing |
| `discarding` | `withThrowingDiscardingTaskGroup` | `finished a`, one error, **exit 1** |
| `collect` | `withTaskGroup` of `(Target, Result<Void, FxError>)`, sorted by input index | `finished a, c, e`; `error: b: manifest malformed (exit 65)`; `error: d: registry unreachable (exit 69)`; `2 of 5 failed`; **exit 1** (mixed statuses) |
| `collect --same-kind` | same, both failures 65 | `2 of 5 failed`, **exit 65** |

The language rule behind the red rows: a task group's children "will be implicitly cancelled first if the scope exits with a thrown error" ([SE-0304](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md), line 212), and a thrown child error surfaces only at the point the parent awaits it. `waitForAll()` rethrows the first error after all children finished (the variant in the table); `next()` and `for try await` rethrow at the first and cancel the rest.

Decision: children never throw. Each returns its `Result` (or `(any Error)?` as container does), the parent collects, sorts by input order, prints one stderr line per failure and then `K of N failed`, and exits with the shared `Status` when every failure agrees, else `.failure`. Why the mixed case is `.failure`: a retry wrapper keyed on 75 (`tempFail`) must not re-run a batch that also contains a 65 (`data`). Argued; there is no source for either choice. Under `--format json` the per-item list belongs in the envelope's context (finding 9).

`container` is the closest exemplar: `container@f70ecbb926d9:Sources/ContainerCommands/Container/ContainerDelete.swift:74-97` has children return `(any Error)?`, appends them and throws `AggregateError(errors)` (`AggregateError.swift:20-31`, one error per line, no count); `Image/ImageDelete.swift:59-89` collects sequentially and throws one message "failed to delete one or more images: [...]". Neither prints `K of N`, and both throw an error whose status is whatever the classifier makes of `ContainerizationError`.

### 9. The remaining Rust CLI rows (CLI-03, 04, 08, 09, 10, M-F-12, M-F-15)

All run in `FX/c-fx` (`misc-check.sh`, `ansi-check.sh`, FULLHOOK build unless noted; 6.4.0 and 6.3.3 identical).

**CLI-10 / `@OptionGroup` global flags.** `struct GlobalOptions: ParsableArguments` holds `--format text|json`, `--color auto|always|never`, `-q/--quiet`; each leaf command declares `@OptionGroup var global: GlobalOptions`. `fx ok|fail|pull|rm --help` each list the three flags (`flag-lines=4`: three flags plus the group heading). Exemplars use the mechanism: `container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:38-39` (`@OptionGroup public var logOptions: Flags.Logging`), `Image/ImageDelete.swift:94`. ArgumentParser documents `@OptionGroup(title:visibility:)` ([DeclaringArguments / CustomizingHelp](https://github.com/apple/swift-argument-parser/blob/1.8.2/Sources/ArgumentParser/Documentation.docc/Articles/CustomizingHelp.md), lines 231-291). The check is "one definition site": the global flags are declared only in `GlobalOptions.swift` (V21a).

**CLI-04 / error envelope.** Under `--format json`, `fx fail` prints one JSON line on stdout and one human line on stderr, exit 65: `{"command":"fail","error":{"kind":"data_error","message":"manifest is malformed"},"exit_code":65,"schema_version":1}`. Without the flag stdout is empty. The shape follows the live `ocx` (`ocx@5de9d777eb7d:crates/ocx_cli/src/error_envelope.rs:1-25,38-65`): `schema_version`, `command`, `exit_code`, `error.kind/detail/message/context`, printed to stdout through the one printer path (`crates/ocx_cli/src/app.rs:203-209`) while the error still flows on. **Drift to report:** the lore Rust file's CLI-04 describes `{"error": {"code": <slug>, "exit": <int>, "message": …, "reason"?, "retryable"?, "forceable"?}}` (`rules/rust-quality/cli-contract.md:112`), which is not the shape `ocx` ships. This file follows `ocx`. The reader contract: stdout is one document, stderr is the human channel, each channel reported once. A snapshot test per `Status` case pins `kind` and `exit_code`.

**CLI-08 / progress.** `Progress.enabled` is `isatty(2) && !quiet && format == .text && CI unset-or-falsy`. Matrix (`fx pull`, count of `pulling` in the stderr capture): non-TTY stderr 0; `--naive` (unconditional draw) on a non-TTY 1 (RED); pty (`script -qec`) 1; pty with `CI=1` 0; pty with `--format json` 0; pty with `--quiet` 0. Exemplars gate on the stream only: `container@f70ecbb926d9:Sources/ContainerCommands/Flags+ProgressConfig.swift:26` (`isatty(stderr) == 1 ? .ansi : .plain`), `swift-package-manager@5546f44a3b52:Sources/Basics/ProgressAnimation/ProgressAnimationProtocol.swift:44-48` (TTY or `verbose`), neither reads `CI`. clig.dev: "If stdout is not an interactive terminal, don't display any animations" (stdout there; the fleet draws on stderr, so the stream tested is stderr).

**CLI-09 / M-F-15 prompts.** `fx rm thing`: piped stdin (`echo y | fx rm thing`) exits 64 with `refusing to prompt without a terminal; pass --yes` and does not read the pipe; `--naive` on the same input prints `deleted thing`, exit 0 (RED: it acted on piped data); `--yes` with `</dev/null` exits 0; a pty with `y` input deletes (prompt text on stderr); a pty with `CI=1` refuses (64). clig.dev: "Only use prompts or interactive elements if stdin is an interactive terminal (a TTY)... you should throw an error telling the user what flag to pass." Exemplars: `swift-package-manager@5546f44a3b52:Sources/CoreCommands/SwiftCommandObservabilityHandler.swift:144-153` gates the prompt on the *output* stream being a TTY and then reads stdin; `Sources/SwiftSDKCommand/RemoveSwiftSDK.swift:102-106` prompts on stdout with no gate; `container@f70ecbb926d9:Sources/ContainerCommands/System/SystemStart.swift:181-188` prompts on stdout with no TTY gate (it has a bypass flag, and EOF becomes a generic failure).

**M-F-12 / completions.** Built in. `fx --generate-completion-script bash|zsh|fish` exits 0 and emits 10582, 6670 and 11142 bytes (`bash -n` parses the bash script); an unknown shell exits 64 (`Can't generate completion scripts for 'nope'`). `ParsableArguments.completionScript(for:)` is public (`ParsableArguments.swift:203`) and `fatalError`s if generation fails, so call it only from a build step. Install paths are documented ([InstallingCompletionScripts](https://github.com/apple/swift-argument-parser/blob/1.8.2/Sources/ArgumentParser/Documentation.docc/Articles/InstallingCompletionScripts.md)). The interaction with the root hook is the real finding (finding 4, item 1). Exemplar: `swiftpm`'s `CompletionCommand.swift` is a separate command; `swiftly@c8cf2e35bfca:Sources/Swiftly/Proxy.swift` mentions the flag in proxying.

**CLI-03 / terminal injection (found on the way).** `fx $'--\e]0;pwned\a'` makes ArgumentParser print `Error: Unknown option '--<ESC>]0;pwned<BEL>'`: 1 ESC byte on stderr under the simple hook (exit 64). FULLHOOK renders through `Stdio.sanitized` (drops C0 and C1 controls except `\n` and `\t`, and the bidi overrides U+202A..202E, U+2066..2069, U+200E/F): 0 ESC bytes, same exit 64. The Swift stdlib offers no equivalent; the root hook is the single place that can apply it to ArgumentParser's own messages.

### 10. FoundationEssentials in place of Foundation (plant e)

`swiftc -swift-version 6 -typecheck`, 6.4.0 and 6.3.3 identical (`FX/e-foundation-essentials`):

| File | Imports | Exit |
|---|---|---|
| `t3.swift` (original) | `@preconcurrency import Glibc`, `import Foundation` | 0 |
| `t4.swift` (original) | `import Foundation`, `@preconcurrency import Glibc` | 1: `reference to var 'stdout' is not concurrency-safe because it involves shared mutable state` |
| `t5.swift` (original) | `import Foundation` | 1: same error |
| `t3e.swift` | `@preconcurrency import Glibc`, `import FoundationEssentials` | 0 |
| `t4e.swift` | `import FoundationEssentials`, `@preconcurrency import Glibc` | **0** |
| `t5e.swift` | `import FoundationEssentials` | 1: `cannot find 'ferror' in scope` |
| `t6e.swift` | Glibc + `ProcessInfo.processInfo.environment`, `JSONEncoder`, `FileManager.default.fileExists` | 0 |

Reading: Foundation re-exports Glibc, so a later plain import re-breaks `stdout`; FoundationEssentials does not re-export it, so the import order stops mattering, and the C globals stay invisible without the explicit `@preconcurrency import Glibc` (SW-CLI-07 is unchanged for that import and its failure mode). `JSONSerialization` is not in FoundationEssentials (`cannot find 'JSONSerialization' in scope` while building the config fixture); `JSONDecoder`, `JSONEncoder`, `FileManager`, `ProcessInfo` and `URL` are. For a CLI or the SDK that avoids full Foundation, that is enough for config files and the envelope.

### 11. Decision table

| Item | Decision | Tier | Why |
|---|---|---|---|
| Log bootstrap | once, executable only, `standardError` named, level first | MUST | trap 132 on repeat; early loggers ignore the level |
| Log level | flag > `TOOL_LOG_LEVEL` > `.info`, in the factory | SHOULD | measured |
| Config precedence | five tiers + default, `Int?` options, 2^n table test | MUST | measured red on the defaulted `@Option` |
| XDG | one helper, spec-exact; Foundation only for cache/data | SHOULD | measured, spec |
| swift-configuration | optional; filter empty env if used | CONSIDER | measured trap |
| ServiceGroup signals | list `[.sigterm, .sigint]`, no overlap | MUST | measured 143/130 |
| Escalation bound | `maximumGracefulShutdownDuration` | SHOULD | measured 137 vs 0 |
| Signal-ended status | service 0; command re-raise | MUST | measured |
| Root hook | own parse/run/catch + flush + sanitize + one terminator | MUST | measured |
| Aggregate errors | collect, `K of N failed`, shared status else 1 | SHOULD | measured |
| `@OptionGroup` globals | one `GlobalOptions` | MUST (fleet family), SHOULD otherwise | grep + run |
| Envelope | `schema_version/command/exit_code/error{kind,message}` on stdout | SHOULD | follows `ocx` |
| Progress | stderr, TTY and no CI and text and not quiet | SHOULD | measured matrix |
| Prompts | stdin TTY, no CI, `--yes`, else 64 | MUST | measured red |
| Completions | built-in generator only, via the full hook | CONSIDER | P3 row |

## Normative guidance candidates

Tiers follow the house convention (MUST = Block, SHOULD = Warn, CONSIDER = Suggest). **Check** commands are run from the package root; **empty output is a pass** for every grep and pipeline (the output is the violation). A pipeline's exit status is meaningless (`xargs -r` and `grep -L` return 0 or 123 regardless), so judge by output. "Run: yes" means the check was run against a planted violation (red) and a compliant twin (green); fixtures are in Verification runs. Rules append to `swift-cli.md` as SW-CLI-15..32. `fx` below is the built executable name.

**SW-CLI-15. Bootstrap swift-log exactly once, in the executable target, naming stderr.** MUST. Floor: swift-log 1.16 (tools 6.2).
- Rule: one `LoggingSystem.bootstrap` call, in the executable target's entry path, after flags and environment are resolved and before any `Logger(label:)`, `Logger.current` or `ServiceGroup(...)` is evaluated; the handler is `StreamLogHandler.standardError` (or a handler that writes stderr). Libraries and test helpers never bootstrap (take a `Logger` parameter or read `Logger.current`).
- Why: a second call traps (exit 132); loggers capture the handler at creation; the default handler's doc comment says STDOUT while the code uses stderr, and stdout is the result stream (SW-CLI-05).
- Check: `grep -rn -e 'LoggingSystem\.bootstrap' --include='*.swift' --exclude-dir=App Sources` (replace `App` with the executable target's directory name; output = bootstrap outside the entry target); `grep -rn -e 'StreamLogHandler\.standardOutput' --include='*.swift' Sources`; `grep -rnE -e '^let +[a-zA-Z_]+ *(: *Logger)? *= *Logger\(label' -e '^var +[a-zA-Z_]+ *(: *Logger)? *= *Logger\(label' --include='*.swift' Sources` (eager global loggers; a tell, not proof).
- Run: yes. `FX/v-checks/checks.sh bad` reports V15a, V15b, V15c; `good` reports none. Behaviour: `fx logdemo --twice` exit 132 (red) against the single-bootstrap run exit 0.
- Limits: V15c misses `private static let log = Logger(label:)` inside types, which is lazy and fine if first touched after the bootstrap.

**SW-CLI-16. Resolve the log level before the bootstrap: flag, then `TOOL_LOG_LEVEL`, then `.info`, applied inside the factory.** SHOULD. Floor: swift-log 1.16.
- Rule: `--log-level` comes from `GlobalOptions` (SW-CLI-28); the factory closure sets `h.logLevel = level`. Do not set `logLevel` on one `Logger` instance to emulate verbosity.
- Why: measured: with `--log-level debug`, a logger created before the bootstrap printed no debug line; a flag given after a `bootstrapLogger.logLevel = ...` mutation covers one instance only (`container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:149-151`).
- Check: `grep -rn -e 'logLevel = ' --include='*.swift' Sources` — each hit must sit inside the bootstrap factory; behaviour: run the CLI with `--log-level debug` and confirm a debug line from every component (`fx logdemo --log-level debug 2>&1 >/dev/null` must show `debug` for each logger).
- Run: behaviour yes (`FX/c-fx/log-check.sh`: the before-bootstrap logger is the red); the grep was not planted (reading heuristic).

**SW-CLI-17. Resolve configuration in one function with this precedence: flag > env > project file > user file > system file(s) > default; the participating `@Option` is optional with no default.** MUST. Floor: any Swift (ArgumentParser 1.8).
- Rule: `@Option var timeout: Int?`; the resolver applies the default once and returns the winning layer for `--debug` output. An empty env var is unset; an unparsable value in a layer throws a classified `Status.config` error naming the variable or file; it never falls through. One table test enumerates all subsets of the layers (2^5 = 32 cases for five layers).
- Why: a defaulted `@Option` makes the flag always present and the env var never wins; ArgumentParser reads no environment; the Rust CLI-15 notes `#[arg(env)]` alone drops two tiers.
- Check: `grep -rnE -e '@Option.* var [a-zA-Z_]+: *[A-Za-z]+ *= *[^ ]' --include='*.swift' --exclude='GlobalOptions.swift' Sources` (output = a defaulted option; review each for whether it feeds the resolver); `swift test` must contain the subset test.
- Run: yes. `swift test` with `IMPL=naive` exit 1 (31 issues), `IMPL=hand` exit 0; grep red on `cfgcli-bad` style (`Main.swift:9`), green on the twin; end to end `cfgcli-bad` with env 3 and no flag prints 30 (red).

**SW-CLI-18. Locate files through one XDG helper that follows the spec.** SHOULD. Floor: any Swift (Foundation for cache and data on Linux).
- Rule: `XDG_CONFIG_HOME` (absolute, else `$HOME/.config`), `XDG_CONFIG_DIRS` (absolute entries, default `/etc/xdg`), `XDG_STATE_HOME` for logs and history (`$HOME/.local/state`), `XDG_CACHE_HOME`, `XDG_DATA_HOME`; empty and relative values are ignored; config file path `<dir>/<tool>/config.json`; use `FileManager.urls(for: .cachesDirectory | .applicationSupportDirectory)` only for cache and data (Foundation has no config or state mapping). Windows and macOS locations: unverified: read only, add them behind the same helper.
- Why: the spec; Foundation's coverage (measured); SwiftPM and sourcekit-lsp each deviate.
- Check: `grep -rn -e '\.config' -e 'XDG_' --include='*.swift' Sources` — every hit must be in the one helper file; unit tests for empty, relative and ordered cases.
- Run: unit tests yes (`XDGPaths` suite in `FX/b-config`, three tests green; no red variant of the helper was planted, so the helper's tests are green-only); the Foundation mapping yes (`FX/f-xdg-foundation/run.sh`); the grep is a reading heuristic.

**SW-CLI-19. If swift-configuration is used, drop empty environment values before the provider; prefer the hand-rolled resolver for three layers.** CONSIDER. Floor: swift-configuration 1.2.2 (tools 6.2).
- Rule: `ConfigReader(providers:)` in precedence order; the flag enters as an `InMemoryProvider`; `EnvironmentVariablesProvider(environmentVariables: env.filter { !$0.value.isEmpty })`.
- Why: measured: with `CFGCLI_TIMEOUT=` and a project file present, the reader returned the default 30, not the file's 4.
- Check: the SW-CLI-17 subset test run with the swift-configuration resolver.
- Run: yes. `IMPL=config` exit 1 (1 issue), `IMPL=config-filtered` exit 0.

**SW-CLI-20. Every `ServiceGroup` in a process that can be stopped lists `gracefulShutdownSignals: [.sigterm, .sigint]`; never rely on the default.** MUST. Floor: swift-service-lifecycle 2.x (current 2.12.1, tools 6.1).
- Rule: pass the signals at construction. `cancellationSignals` is a separate, harder stage and must be disjoint (an overlap traps at `init`). On Windows and WASI the signals are a silent no-op: call `triggerGracefulShutdown()` from the platform's own hook (unverified: read only).
- Why: the defaults are `[]` (`ServiceGroupConfiguration.swift:140,143`); measured 143 and 130 with no cleanup.
- Check: `grep -rl -e 'ServiceGroup(' --include='*.swift' Sources | xargs -r grep -L -e 'gracefulShutdownSignals'` (output = a file that builds a group and never mentions the signals); behaviour: `kill -TERM` the running binary must print the cleanup line and exit 0.
- Run: yes. V17a red on the planted `Main.swift`, green on the twin; `FX/a-servicegroup/signal-check.sh` default TERM exit 143 (red), `sigterm` TERM exit 0 (green).
- Limits: file-level. `hummingbird@1bd3b407fb47:Sources/Hummingbird/Application.swift` builds one group with signals and one without in the same file, so it passes the grep.

**SW-CLI-21. Set `maximumGracefulShutdownDuration` below the orchestrator's kill grace, and make services honour graceful shutdown.** SHOULD. Floor: swift-service-lifecycle 2.x.
- Rule: `var config = ServiceGroupConfiguration(...)`; `config.maximumGracefulShutdownDuration = .seconds(n)` with n below the SIGKILL delay (Kubernetes default 30 s, Docker 10 s: stated by the DocC article, not re-measured); services wrap long waits in `cancelWhenGracefulShutdown` or `withGracefulShutdownHandler`.
- Why: measured: a service that ignores graceful shutdown stays alive until SIGKILL (137); with the limit it is cancelled and the group exits 0.
- Check: `grep -rl -e 'ServiceGroup' --include='*.swift' Sources | xargs -r grep -L -e 'maximumGracefulShutdownDuration'` (output = a file with a group and no bound); behaviour: a stubborn-service fixture must exit within the bound.
- Run: behaviour yes (`stubborn-nolimit` 137, `stubborn-limit` 0); the grep was not planted.

**SW-CLI-22. A service that shut down gracefully exits 0; a finite command ended by a signal runs its cleanup, flushes, restores `SIG_DFL` and re-raises.** MUST. Floor: any Swift; Linux measured.
- Rule: `try await group.run()` returning is success. For a command: signal stream (SW-CLI-11), cleanup, `fflush`, `signal(sig, SIG_DFL)`, `kill(getpid(), sig)`; never `return` after cleanup, never `exit(128 + sig)` (SW-CLI-10).
- Why: measured `return` after cleanup exits 0 (an interrupted run reports success); unhandled exits 143 with no cleanup; re-raise exits 143 with cleanup. Rust EXIT-11 is the same rule.
- Check: `fx long --mode reraise` with `kill -TERM` after 1.5 s (job control on): output = `cleanup-done` then exit 143; `grep -rnE -e '\braise\(SIG' -e 'exit\(128' --include='*.swift' Sources` (SW-CLI-10's check) stays empty.
- Run: yes. `exit0` exit 0 (red), `unhandled` 143 without `cleanup-done` (red), `reraise` 143 with it (green); `serve --signals none` 143 (red), `sigterm` 0 (green).

**SW-CLI-23. Replace `await Self.main(nil)` with a root hook that owns parse, run, render, classify, flush and one terminator.** MUST. Floor: ArgumentParser 1.8 (`Self.fullMessage(for:)`, `Self.exitCode(for:)`).
- Rule: the root `@main` type declares `static func main() async`. First statement `signal(SIGPIPE, SIG_IGN)`. Then `asyncParseAsRoot(nil)` and `run()` in `do/catch`. In `catch`: `message = Self.fullMessage(for: error)`, `code = Self.exitCode(for: error)`; if `code == .success` write the message to stdout, else sanitized to stderr; `status = Status.checked(code.rawValue)`. Then the flush check (SW-CLI-09) with errno recorded at write time and EPIPE treated as success; on failure `fx: error: write to stdout failed: <reason>` and `.io` (74). Finally `Stdio.terminate(status)`, the only `exit` call. Do not test `error is CleanExit`.
- Why: `exit(withError:)` terminates inside `main(_:)` for help, version and completions; measured `--help >/dev/full` exits 0 under the simple hook and 74 under the full hook; `fx big | head -1` exits 74 if EPIPE is not exempt.
- Check: `grep -rl -e 'Self.main(nil)' --include='*.swift' Sources | xargs -r grep -L -e 'fullMessage(for'` (output = a root that delegates to ArgumentParser's `main` without owning rendering); behaviour: `fx --help >/dev/full; echo $?` must not print 0, `fx big | head -1; echo ${PIPESTATUS[0]}` must print 0, `fx ok >&-; echo $?` must print 74.
- Run: yes. V19a red on `bad/Sources/App/Main.swift`, green on the twin; the matrix: simple hook `help-devfull` 0 (red), FULLHOOK 74 (green); `cstrict` pipe-head 74 (red), `cfull` 0 (green).

**SW-CLI-24. Route every stdout write through one funnel that reports failure, and stop unbounded loops when it does.** SHOULD. Floor: any Swift; glibc.
- Rule: `Stdio.out(_:) -> Bool` wraps `fputs` and `ferror`, records the first failing errno under a `Mutex`, and returns `false`; loops `break` on `false`. No bare `print` in output paths (`print` has no failure signal).
- Why: the flush check needs the original errno (EPIPE vs ENOSPC); a bare `print` loop to a closed pipe runs to completion.
- Check: `grep -rn -e 'print(' --include='*.swift' Sources` outside the funnel and tests (every hit is a finding in command code); behaviour as SW-CLI-08.
- Run: behaviour yes (`pipe-check.sh`, `cstrict` 74, `cfull` 0); the print grep is a reading heuristic and was not planted.

**SW-CLI-25. Sanitize terminal control and bidi characters in error text that quotes input.** SHOULD. Floor: any Swift (CWE-150).
- Rule: the root hook passes ArgumentParser's `fullMessage(for:)` and any error string through a filter that drops C0 and C1 controls except `\n` and `\t`, and U+202A..202E, U+2066..2069, U+200E, U+200F, before writing to stderr.
- Why: measured: `fx $'--\e]0;pwned\a'` echoes ESC and BEL into the terminal; the Rust CLI-03 covers the same hole.
- Check: `fx $'--\e]0;x\a' 2>&1 >/dev/null | tr -cd '\033' | wc -c` must print 0.
- Run: yes. Simple hook 1, FULLHOOK 0 (`ansi-check.sh`).

**SW-CLI-26. A batch collects results and reports `K of N failed`; it never lets the first throw decide.** SHOULD. Floor: Swift 5.9 (`withTaskGroup`).
- Rule: children return `Result` or `(any Error)?` and never throw; the parent sorts by input index, prints one stderr line per failure, then `K of N failed`; status is the shared `Status` if all failures agree, else `.failure`. Under `--format json` the per-item errors go into the envelope.
- Why: `waitForAll()`, `for try await` and `withThrowingDiscardingTaskGroup` are all first-error-wins (measured, one error, exit 1, d's failure lost or siblings cancelled).
- Check: `grep -rn -e 'withThrowingTaskGroup' -e 'withThrowingDiscardingTaskGroup' --include='*.swift' Sources` — each hit must either catch inside every child or be a fail-fast-by-design site with a comment; behaviour: `fx batch; echo $?` prints a `K of N failed` last line and a non-zero status.
- Run: yes. V20a red on `bad/Sources/App/Cmds.swift:14`, green on the twin; modes `first`, `next`, `discarding` exit 1 with one error (red), `collect` prints `2 of 5 failed` (green; exit 1 mixed, 65 with `--same-kind`).

**SW-CLI-28. Global flags live in one `GlobalOptions: ParsableArguments` taken by every leaf command through `@OptionGroup`.** MUST for fleet-family CLIs (those a script or the SDK drives), SHOULD otherwise. Floor: ArgumentParser 1.8.
- Rule: `--format text|json`, `--color auto|always|never`, `-q/--quiet`, `--log-level` are declared once; no leaf declares its own `format`, `color`, `quiet` or `logLevel`.
- Why: identical flags across the family; the SDK passes `--format json --color never`.
- Check: `grep -rnE -e '@[OF][a-z]*.* var format\b' -e '@[OF][a-z]*.* var color\b' -e '@[OF][a-z]*.* var quiet\b' -e '@[OF][a-z]*.* var logLevel\b' --include='*.swift' --exclude='GlobalOptions.swift' Sources` (output = a second definition site); `grep -rlE -e ': *(Async)?ParsableCommand' --include='*.swift' Sources | xargs -r grep -L -e '@OptionGroup'` (output = a command file without the group; parents are legitimate).
- Run: yes. V21a, V21b red on `bad`, green on `good`; `fx ok|fail|pull|rm --help` all list the flags.
- Limits: V21b on `container@f70ecbb926d9` lists 15 of 23 command files because group commands have no leaf flags; read the list.

**SW-CLI-29. Under `--format json`, a failure prints one envelope on stdout and one human line on stderr.** SHOULD. Floor: any Swift (Foundation Essentials `JSONEncoder`).
- Rule: `{"schema_version":1,"command":"fail","exit_code":65,"error":{"kind":"data_error","message":"..."}}` with sorted keys; `kind` slugs are stable and a rename bumps `schema_version`; one snapshot test per `Status` case. Follow the live `ocx` envelope, not the lore Rust file's `code/exit/retryable` shape.
- Why: machine consumers parse stdout alone; the stderr line is the human channel (each channel reported once, SW-CLI-05).
- Check: `fx fail --format json 2>/dev/null` must parse completely as one JSON document; `fx fail 2>/dev/null` must print nothing.
- Run: yes for the run (both lines in Verification runs); the red is the absent-envelope baseline (text mode: empty stdout), not a planted regression.

**SW-CLI-30. Draw progress on stderr only when stderr is a TTY, `CI` is unset or falsy, the format is text and `--quiet` is off.** SHOULD. Floor: any Swift.
- Rule: one `Progress.enabled(_:env:)`; `isatty(2) == 1`; `CI` unset, empty, `0` or `false`.
- Why: measured matrix; SwiftPM and `container` gate on the stream only and ignore `CI`.
- Check: `grep -rnE -e 'print\("\\r' -e 'print\("\\u\{1B\}' --include='*.swift' Sources` (progress or ANSI on stdout); the matrix in Verification runs.
- Run: yes. V23a red on `bad/Sources/App/Cmds.swift:6`, green on the twin; matrix `non-tty NAIVE` 1 (red) against 0 on the compliant path.

**SW-CLI-31. Prompt only when stdin is a TTY and `CI` is not truthy; ship `--yes`; otherwise exit 64 naming the flag.** MUST. Floor: any Swift.
- Rule: `isatty(0) == 1` gate before every `readLine`; the prompt text goes to stderr; `--yes` (and `--no-input` where a command also takes input) skips it; non-interactive without the flag throws `Status.usage` with `pass --yes`.
- Why: measured: a naive prompt consumed piped data and acted on it; clig.dev says to throw an error telling the user what flag to pass.
- Check: `grep -rl -e 'readLine(' --include='*.swift' Sources | xargs -r grep -L -e 'isatty('` (output = a prompting file with no TTY test; SwiftPM-style `isTTY` helpers need a manual look); behaviour: `echo y | fx rm thing; echo $?` must print 64.
- Run: yes. V24a red on `bad/Sources/App/Cmds.swift`, green on the twin; `--naive` exit 0 (red), default exit 64 (green).

**SW-CLI-32. Ship completions from `--generate-completion-script`; never hand-write them.** CONSIDER. Floor: ArgumentParser 1.8.
- Rule: generate `bash`, `zsh` and `fish` scripts from the built binary at release time; the root hook (SW-CLI-23) must carry the generator's output through the flush check.
- Why: the generator is built in and stays in sync with the commands; a hand-written script drifts.
- Check: `grep -rlE -e '^#compdef' -e '^complete -[cF]' -e '^_arguments' .` (output = a checked-in completion script; a generator step in the release pipeline justifies one).
- Run: yes. V25a red on `bad/completions/_app`, green on the twin; `fx --generate-completion-script bash >/dev/full` exits 0 under the simple hook and 74 under the full one.

> Note on numbering: SW-CLI-27 is intentionally unused so the table keeps the order of the fixture's V-ids; the consolidator may renumber. The actionable rules are 15-26 and 28-32.

## Verification runs

Each entry: fixture, exact command (run from the fixture directory shown; `R` is `/home/mherwig/.cache/research-lang/swift-tools/run.sh`; versions via `SWIFT_VERSION=6.3` where noted), exit code on the violation, exit code on the twin, relevant output. Every row ran on 6.4.0 and 6.3.3 with identical results unless a note says otherwise (`results-6.4.txt`, `results-6.3.txt`). Builds use `--scratch-path "$B/services-and-config-<slug>"`.

**VR-1 ServiceGroup default signals.** `FX/a-servicegroup`. `R ./signal-check.sh $B/services-and-config-a/debug/svc default TERM` -> `exit=143`, `worker: started` only (violation). `... sigterm TERM` -> `exit=0`, `worker: cleanup-begin`, `worker: cleanup-done`, `svc: run() returned normally` (twin). `default INT` -> 130; `sigterm INT` -> 130; `both INT` -> 0 with cleanup. `stubborn-nolimit TERM` -> `still-alive-after-3s`, `exit=137`; `stubborn-limit TERM` -> `exit=0`, `stubborn: cancelled`.
- Overlap: `R bash -c "$B/services-and-config-a/debug/svc overlap; echo exit=\$?"` -> `ServiceLifecycle/ServiceGroup.swift:62: Precondition failed: Overlapping graceful shutdown and cancellation signals`, `exit=132` (run by hand on 6.4.0 during development; the 6.3 run is `results-6.3.txt` only for the rows listed above).
- Early return: `early` -> `svc: run() threw: ServiceGroupError ... A service has finished unexpectedly`, `exit=1`.
- DocC API: `R ./docbug.sh` -> `flag=[] swift-build-exit=0`; `flag=[-DDOCBUG] swift-build-exit=1` with `type '...TerminationBehavior' has no member 'shutdownGracefully'`.

**VR-2 Precedence.** `FX/b-config`. `R ./t.sh naive` -> `✘ Test run with 5 tests in 2 suites failed ... with 31 issues`, `swift-test-exit=1` (violation); `R ./t.sh hand` -> `✔ Test run with 5 tests in 2 suites passed`, `swift-test-exit=0` (twin); `R ./t.sh config` -> 1 issue, exit 1; `R ./t.sh config-filtered` -> pass, exit 0. 6.3 runs use `env SCRATCH_B=services-and-config-b63 ./t.sh <impl>`: `hand` 0, `naive` 1 (the 6.3 failure text prints the actual and expected values, e.g. `(r.timeout → 30) == (expected.1 → 5)`). End to end: `R ./e2e.sh $B/services-and-config-b/debug` -> `bad: env=3 no flag      : timeout=30   <-- RED expected 3` against `env=3 + files           : timeout=3 layer=env`.

**VR-3 Root hook matrix.** `FX/c-fx`. `./build.sh` builds `services-and-config-c` (simple), `-cfull` (`-Xswiftc -DFULLHOOK`) and `-cnohook` (`-Xswiftc -DNOHOOK`). `R ./hook-matrix.sh $B/services-and-config-<variant>/debug/fx` prints the table of finding 4. Key lines: `help-devfull exit=0` (simple, violation) against `help-devfull exit=74 err=fx: error: write to stdout failed: No space left on device` (full, twin); `ok-devfull exit=0` (nohook) against 74; `pipe-head: exit=141` (nohook); `ok-closed exit=74 err=fx: error: write to stdout failed: Invalid argument`; `leak-closed: exit=74`.
- fd reuse: `R ./fdprobe.sh $B/services-and-config-c/debug/fx` -> `leak: opened fd 5`, `leak: fd1 -> anon_inode:[eventpoll]`, `exit=74`, `leak.txt=[]`.
- EPIPE exemption: `./strict-build.sh` then `R ./pipe-check.sh $B/services-and-config-cstrict/debug/fx` -> `fx: error: write to stdout failed: Broken pipe`, `pipe-head: exit=74` (violation); `... cfull/debug/fx` -> `pipe-head: exit=0` (twin).

**VR-4 Signals in a command.** `R ./sig-check.sh TERM -- $B/services-and-config-cfull/debug/fx long --mode <mode>` -> `unhandled`: `exit=143`, `long: started`; `exit0`: `exit=0` with `cleanup-done`; `reraise`: `exit=143` with `cleanup-done`. `sig-check.sh INT -- ... long --mode reraise` -> `exit=130`. `sig-check.sh TERM -n 2 0.1 -- ... long --mode reraise` -> `exit=143`, last line `long: cleanup-begin` (no `cleanup-done`). `serve --signals none` TERM -> 143; `--signals sigterm` TERM -> 0 with cleanup; INT -> 130.

**VR-5 Aggregate.** `R ./batch-check.sh $B/services-and-config-cfull/debug/fx <mode>`: `first`, `next`, `discarding` each `exit=1` with a single `Error: manifest malformed`; `collect` prints `error: b: manifest malformed (exit 65)`, `error: d: registry unreachable (exit 69)`, `2 of 5 failed`, `exit=1`; `R ./batch2-check.sh ...` (`--same-kind`) -> `2 of 5 failed`, `exit=65`.

**VR-6 Remaining rows.** `R ./misc-check.sh $B/services-and-config-cfull/debug/fx` -> envelope line and empty text-mode stdout; progress matrix `non-tty stderr: 0 lines`, `non-tty NAIVE : 1 lines (RED if >0)`, `pty : 1`, `pty + CI=1 : 0`, `pty + json : 0`, `pty + quiet : 0`; prompts `piped stdin : exit=64`, `piped NAIVE : exit=0 out=[deleted thing] (RED...)`, `--yes : exit=0`, `pty + CI=1` refused; completions `bash: exit=0 ... syntax=ok`, `bash >/dev/full: exit=74` (the simple hook build gives `exit=0`), `bad shell: exit=64`; flags `ok|fail|pull|rm: flag-lines=4`.

**VR-7 Log bootstrap.** `R ./log-check.sh $B/services-and-config-cfull/debug/fx` -> rows of finding 5; `--twice` and `--library-bootstrap` `exit=132` with `LoggingSystem.swift:165: Precondition failed: logging system can only be initialized once per process.`

**VR-8 Terminal injection.** `R ./ansi-check.sh $B/services-and-config-c/debug/fx` -> `exit=64`, `ESC bytes on stderr: 1`; `... cfull/debug/fx` -> `exit=64`, `ESC bytes on stderr: 0`.

**VR-9 FoundationEssentials.** `FX/e-foundation-essentials`: `R ./run-orig.sh` -> `t3 exit=0`, `t4 exit=1`, `t5 exit=1`; `R ./run-e.sh` -> `t3e 0`, `t4e 0`, `t5e 1 (cannot find 'ferror' in scope)`, `t6e 0`; with `SWIFT_VERSION=6.3` the same.

**VR-10 XDG via Foundation.** `FX/f-xdg-foundation`: `R ./run.sh` -> unset: `["/home/u/.cache"]`, `["/home/u/.local/share"]`; absolute: `/x/cache`, `/x/data`; empty: defaults; relative: defaults; `libraryDirectory` always `[]`.

**VR-11 Greps.** `FX/v-checks`: `./checks.sh bad` prints `VIOLATION` for V15a, V15b, V15c, V16a, V17a, V19a, V20a, V21a, V21b, V23a, V24a, V25a with the offending lines (e.g. `V15a: Sources/Lib/Net.swift:5: LoggingSystem.bootstrap(StreamLogHandler.standardOutput)`, `V20a: Sources/App/Cmds.swift:14: try await withThrowingTaskGroup(...)`); `./checks.sh good` prints `PASS-empty` for all twelve. Plain greps exit 0 on the violation and 1 on the twin; the `xargs -r` pipelines exit 0 on both, so judge by output.

Not run: any Windows, WASI, macOS or arm64 behaviour; a swift-service-lifecycle run under a real container runtime (the 3 s kill window is the harness's); SwiftLint `custom_rules` delivery of any grep (SW-CLI notes it silently skips without SourceKit).

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| 15 bootstrap once, executable, stderr | `containerization@3e7bc39e66b3:Sources/cctl/cctl.swift:24` (explicit `standardError`, executable) | `container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:30-35` (bootstrap inside a lazy global) and five more sites (`ContainerK8s/Commands/K8sList.swift:33` and four siblings); `tuist@2f6ac74754bf` five sites in four files (`cli/Sources/TuistKit/Utils/Dependencies.swift:120`, `cli/Sources/tuist/Dependencies.swift:81,188`, `cli/Sources/TuistLogging/ApplicationLogStore.swift:44,51`); `swift-log` itself documents the default handler as STDOUT (`LoggingSystem.swift:18`) while the code uses stderr (`:30`) |
| 16 level first | none found that resolve before bootstrap | `container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:149-151` mutates one logger's level after the bootstrap |
| 17 precedence | none implements all five tiers (SwiftPM and sourcekit-lsp read env/config for their own files only) | no exemplar uses `Int?` options plus a layered resolver; swift-configuration's own example is env then file then in-memory (`Configuring-applications.md`) |
| 18 XDG | `swift-foundation@aadd9259be07:Sources/FoundationEssentials/FileManager/SearchPaths/FileManager+XDGSearchPaths.swift:39,48,57` (absolute-only for data, cache) | `swift-package-manager@5546f44a3b52:Sources/Basics/FileSystem/FileSystem+Extensions.swift:219-227` (defined-not-valid, default `~/.swiftpm`); `sourcekit-lsp@c6ce93d5f8aa:Sources/sourcekit-lsp/SourceKitLSP.swift:198-207` (relative accepted, no `$HOME/.config` fallback); Foundation `:67-71` keeps relative `XDG_CONFIG_DIRS` entries |
| 20 signals listed | `hummingbird@1bd3b407fb47:Sources/Hummingbird/Application.swift:161-170` (`[.sigterm, .sigint]`), `vapor@bf77fc69b142:Sources/Vapor/Application.swift:224-231`, `swift-aws-lambda-runtime@8abd464310c7:Examples/ServiceLifecycle+Postgres/Sources/Lambda.swift:72-75` (graceful `[.sigterm]`, cancellation `[.sigint]`) | `hummingbird ... Application.swift:153-156` (`run()` has none by design; `runService` wraps it); `grpc-swift-2@ac33066eb6ed:Examples/service-lifecycle/Sources/LifecycleExample.swift:42-49` (in-process example, no signals); the library's own DocC `Adopting ServiceLifecycle in applications.md:269-270` (nonexistent member) |
| 21 bound | none found setting `maximumGracefulShutdownDuration` in the corpus (the library defines it at `ServiceGroupConfiguration.swift:166-188`) | the default is unbounded |
| 22 signal status | `containerization@3e7bc39e66b3:Sources/ContainerizationOS/AsyncSignalHandler.swift:95-111` (SIG_IGN plus `DispatchSource` plus stream, mechanism) | `container@f70ecbb926d9:Sources/TerminalProgress/ProgressBar+RestoreCursor.swift:29` (`exit(signal + 128)` in a C handler, per [cli]) |
| 23 root hook | `container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:101-143` (owns parse/run/catch, special-cases `--help`; no flush check, no SIGPIPE) | `swift-package-manager@5546f44a3b52:Sources/swift-package-manager/SwiftPM.swift:27-36` (`main() async` only dispatches); no exemplar runs a flush check at the root |
| 26 aggregate | `container@f70ecbb926d9:Sources/ContainerCommands/Container/ContainerDelete.swift:74-97` (children return `(any Error)?`), `Image/ImageDelete.swift:59-89` | no `K of N` line in any; `AggregateError.swift:20-31` prints errors one per line without a count; message-only throw loses per-item status |
| 28 `@OptionGroup` | `container ... Application.swift:38-39`, `Image/ImageDelete.swift:94` | none measured as duplicating `--format` |
| 29 envelope | `ocx@5de9d777eb7d:crates/ocx_cli/src/error_envelope.rs:1-65` (Rust, the fleet source of truth) | lore `rules/rust-quality/cli-contract.md:112` describes a different shape; no Swift exemplar emits an error envelope |
| 30 progress | `container@f70ecbb926d9:Sources/ContainerCommands/Flags+ProgressConfig.swift:26`; `swift-package-manager ... Basics/ProgressAnimation/ProgressAnimationProtocol.swift:44-48` (TTY gate) | neither reads `CI` |
| 31 prompts | `swift-package-manager ... CoreCommands/SwiftCommandObservabilityHandler.swift:144-153` (TTY gate, on the output stream) | `.../SwiftSDKCommand/RemoveSwiftSDK.swift:102-106`, `container ... System/SystemStart.swift:181-188` (stdout prompt, no gate); `containerization@3e7bc39e66b3:examples/sandboxy/Sources/sandboxy/CacheCommand.swift:196` and `ConfigCommand.swift:121,156` (`readLine()` prompts, no `isatty`) |
| 32 completions | `swift-argument-parser` built-in; `swiftly` and SwiftPM reference it | none found checking in generated scripts |

Corpus counts used above (re-measured, excluding Tests): `ServiceGroup(` construction sites with signals: hummingbird 3 test/runtime sites plus 1 in `runService`, vapor 1, lambda example 1; `LoggingSystem.bootstrap` in 18 non-test sites across 6 repos (container 7, tuist 5, containerization 3 plus one in `Integration/Suite.swift:94`, swift-distributed-tracing sample 1, SwiftPM example 1); `readLine(` prompt sites without an `isatty`/`isTTY` test: SwiftPM 3 of 5 files, container 1 of 1, containerization 2 of 2.

## AI-agent angle

What an agent gets wrong here, and the smallest mechanical check:

| Mistake | Why it compiles or passes | Check |
|---|---|---|
| `ServiceGroup(services: [...], logger: logger)` with no signals, trusting the 2020 blog ("handlers for INT and TERM by default") | 1.x behaviour; 2.x defaults are `[]` | SW-CLI-20's grep; send SIGTERM and read the exit code (143 means no handler) |
| `successTerminationBehavior: .shutdownGracefully` copied from the DocC article | the article is wrong; `.gracefullyShutdownGroup` is real | compiler: `has no member 'shutdownGracefully'` |
| `gracefulShutdownSignals: [.sigterm]` only, then Ctrl-C kills at 130 | SIGINT unlisted | send SIGINT in the check |
| `LoggingSystem.bootstrap` in a library, a test helper, or every subcommand's `run()` | works once; the second trap is at runtime | SW-CLI-15 greps; `fx ... --twice` shape test |
| `static let logger = Logger(label:)` read before the bootstrap, then `logger.logLevel = .debug` on one instance | looks like verbosity | SW-CLI-16 behaviour run |
| `StreamLogHandler.standardOutput` or trusting the doc comment (default = STDOUT) | the comment says so | SW-CLI-15 grep |
| `@Option var timeout: Int = 30` then `flag ?? env ?? file` | the default makes the flag non-nil | SW-CLI-17 grep and the subset test |
| `ProcessInfo.processInfo.environment["X"]` scattered, `NSHomeDirectory() + "/.config"`, `~/.config` literals | no resolver | SW-CLI-18 grep |
| `import FoundationEssentials` and `JSONSerialization` | not in the module | compiler: `cannot find 'JSONSerialization' in scope` |
| `await Self.main(nil)` as the whole hook, then `exit(...)` inside the type | compiles; `exit` resolves to the instance method in some contexts | SW-CLI-23 grep; `--help >/dev/full` |
| `if error is CleanExit` to detect help | false for `--help` | the matrix run |
| `withThrowingTaskGroup` plus `try await group.waitForAll()` believed to cancel siblings | `waitForAll()` waits for all and rethrows the first | SW-CLI-26 grep and run |
| `readLine()` prompt with no TTY gate; prompt text on stdout | works at a terminal | SW-CLI-31 grep |
| `print("\r...")` progress on stdout | fine in a terminal | SW-CLI-30 grep |
| a hand-written completion script | looks complete | SW-CLI-32 grep |
| `signal(SIGTERM) { _ in exit(0) }` | `@convention(c)` handler, not async-signal-safe, loses cleanup | SW-CLI-10 grep (`raise(`/`exit(128`) plus the signal run |
| `Task.detached` for the signal loop expecting `Logger.current` to follow | task-locals are not inherited by detached tasks (`Logger.swift:1529`) | reading heuristic |

## Contested / evolving

- **Exit status after a graceful SIGTERM (as of 2026-10-10).** This file picks 0 for a service (what every exemplar does, because `run()` returns) and 143 by re-raise for an interrupted finite command. A fleet CLI that hosts a `ServiceGroup` for a bounded job may prefer 143 everywhere (Rust EXIT-11 reads that way). Argued, no source decides it. Orchestrators treat both as a stop; 143 shows as an error in some UIs.
- **Closed stdout (`>&-`).** Rust's std treats EBADF as success; Swift cannot even see EBADF because the runtime takes fd 1. This file reports 74. If the fleet wants parity with Rust, the exemption would be for EINVAL on fd 1 only, which is fragile. Left as SHOULD.
- **Where the logger comes from.** swift-log 1.16 (2026-10) moves libraries to `Logger.current` and `withLogger` (BP-003), away from global bootstrap plus per-type `Logger(label:)`. `Logger.current` captures its unbound default on first touch, so the bootstrap-first rule gets stricter, not looser. Trend: task-local loggers in libraries, one bootstrap in the executable.
- **swift-configuration vs hand-rolled.** The library is young (1.2.2, tools 6.2) and already used by AsyncHTTPClient; the measured empty-env behaviour is a sharp edge. Trend: adoption in servers; ArgumentParser CLIs mostly hand-roll. Revisit when it ships a documented "empty means unset" option.
- **Error-envelope shape.** The lore Rust file and the live `ocx` disagree (`code/exit/retryable/forceable` vs `schema_version/command/exit_code/error{kind,detail,message,context}`); this file follows `ocx`. Report the drift to the Rust set; do not patch it from this program.
- **Progress detection.** clig.dev says "stdout not a TTY"; the fleet draws on stderr and tests stderr; SwiftPM tests the chosen stream only; none reads `CI`. The rule here adds `CI` because log collectors capture stderr.
- **ServiceLifecycle defaults.** 1.x installed INT and TERM by default (2020 blog); 2.x installs none. Pre-2.0 knowledge is a standing trap; 2.12.0 dropped Swift 6.0 and 2.12.1 requires tools 6.1.
- **Windows and WASI signal handling.** `UnixSignals` compiles to nothing; whether Windows needs a `SetConsoleCtrlHandler` bridge feeding `triggerGracefulShutdown()` is open. Unverified: read only.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/swift-server/swift-service-lifecycle | README of the library (read raw from `main`, 2.12.1 content) | 2.12.1, 2026-10-05 | primary; `ServiceGroup` with `gracefulShutdownSignals: [.sigterm]` |
| https://github.com/swift-server/swift-service-lifecycle/blob/2.12.1/Sources/ServiceLifecycle/ServiceGroupConfiguration.swift | defaults `[]` at `:140,143`, init defaults, `maximum*Duration`, termination behaviours | 2.12.1 | primary; the pin the map asked for |
| https://github.com/swift-server/swift-service-lifecycle/blob/2.12.1/Sources/UnixSignals/UnixSignalsSequence.swift | Dispatch-source stream, Windows and WASI guards | 2.12.1 | primary; why signals work on Linux and not on Windows |
| https://github.com/swift-server/swift-service-lifecycle/blob/2.12.1/Sources/ServiceLifecycle/ServiceGroup.swift | `init` defaults, overlap precondition (`:62`), `triggerGracefulShutdown`, graceful loop | 2.12.1 | primary; the 132 trap and escalation |
| https://github.com/swift-server/swift-service-lifecycle/blob/2.12.1/Sources/ServiceLifecycle/Docs.docc/Adopting%20ServiceLifecycle%20in%20applications.md | DocC article with the `.shutdownGracefully` error | 2.12.1 | primary; a documentation hallucination source |
| https://github.com/apple/swift-log/blob/1.16.1/Sources/Logging/LoggingSystem.swift | bootstrap, precondition, default handler, stale STDOUT comment | 1.16.1, 2026-10-07 | primary; the bootstrap semantics |
| https://github.com/apple/swift-log/blob/1.16.1/Sources/Logging/Logger.swift | `init(label:)` captures the factory, `Logger.current` semantics | 1.16.1 | primary; why early loggers ignore the level |
| https://github.com/apple/swift-log/blob/1.16.1/Sources/Logging/Docs.docc/BestPractices/003-AcceptingLoggers.md | libraries accept a `Logger` or read `Logger.current` | 1.16.x | primary; the library half of SW-CLI-15 |
| https://github.com/apple/swift-configuration | README: providers, traits, hierarchy | 1.2.2, 2026-10-05 | primary; layering API |
| https://github.com/apple/swift-configuration/blob/1.2.2/Sources/Configuration/Documentation.docc/Guides/Configuring-applications.md | env then file then in-memory hierarchy | 1.2.2 | primary; the intended composition |
| https://github.com/apple/swift-configuration/blob/1.2.2/Sources/Configuration/Providers/CLI/CommandLineArgumentsProvider.swift | CLI provider (trait-guarded, own dialect); with `EnvironmentVariablesProvider.swift` and `KeyMappingProvider.swift` | 1.2.2 | primary; why ArgumentParser flags enter via `InMemoryProvider` |
| https://specifications.freedesktop.org/basedir/latest/ | XDG Base Directory Specification 0.8 | 2021-05-08 | primary spec; absolute-only, empty means default |
| https://github.com/apple/swift-argument-parser/blob/1.8.2/Sources/ArgumentParser/Parsable%20Types/AsyncParsableCommand.swift | `main(_:)`, `main()`, catch to `exit(withError:)` | 1.8.2 | primary; the hook's anchor |
| https://github.com/apple/swift-argument-parser/blob/1.8.2/Sources/ArgumentParser/Parsable%20Types/ParsableArguments.swift | `exit(withError:)`, `exitCode(for:)`, `completionScript(for:)` | 1.8.2 | primary; why help exits inside `main` |
| https://github.com/apple/swift-argument-parser/blob/1.8.2/Sources/ArgumentParser/Documentation.docc/Articles/InstallingCompletionScripts.md | built-in `--generate-completion-script` and install paths | 1.8.2 | primary; M-F-12 |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0281-main-attribute.md | `@main`: errors thrown from `main()` behave like top-level code | Swift 5.3 | primary; why the hook catches |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md | task groups: implicit cancellation on a thrown error (line 212) | Swift 5.5 | primary; the first-error-wins semantics |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md | `await` in `defer` | Implemented Swift 6.4 | primary; cleanup after cancellation (SW-CONC owns it) |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md | `withTaskCancellationShield` | Implemented Swift 6.4 | primary; cleanup that survives cancellation |
| https://www.swift.org/blog/swift-service-lifecycle/ | "Introducing Swift Service Lifecycle" (Tom Doron) | 2020-07-15 (1.x API) | primary; the stale "INT and TERM by default" claim |
| https://forums.swift.org/t/new-servicelifecycle-apis/65521 | announcement of the 2.0 APIs (Franz Busch) | 2023-06-12 | primary; graceful shutdown is opt-in, unlike cancellation |
| https://github.com/swiftlang/swift-foundation/blob/main/Sources/FoundationEssentials/FileManager/SearchPaths/FileManager%2BXDGSearchPaths.swift | Linux XDG mapping of `SearchPathDirectory` | main, read 2026-10-10 (`aadd9259be07`) | primary; Foundation covers cache and data only |
| https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/ | The Swift Programming Language, Concurrency: task groups and cancellation | current | primary; cancellation is cooperative |
| https://clig.dev/ | Command Line Interface Guidelines | 2017-, read 2026-10-10 | prompts, animations, colour, configuration precedence |
| https://no-color.org/ | NO_COLOR standard | updated 2026-09-29 | non-empty means disable (context for the empty-env rule) |
| /home/mherwig/dev/ocx/crates/ocx_cli/src/error_envelope.rs (`5de9d777eb7d`) | live JSON error envelope of the fleet's Rust CLI | 2026 | the envelope shape to follow |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/rules/rust-quality/cli-contract.md | the fleet Rust CLI contract (CLI-03..CLI-15, EXIT-11) | 2026 | the rows this dive ports |
| https://github.com/swift-server/swift-service-lifecycle/releases/tag/2.12.1 (with `apple/swift-log` `1.16.1`, `apple/swift-configuration` `1.2.2`, `apple/swift-argument-parser` `1.8.2` release pages) | release metadata read through the GitHub API | 2026-10 | version and date pins |
| https://github.com/swiftlang/swift-package-manager (`5546f44a3b52`: `ProgressAnimationProtocol.swift`, `SwiftCommandObservabilityHandler.swift`, `FileSystem+Extensions.swift`) | how the toolchain's own CLI gates progress, prompts and config dirs | 2026-10 | exemplar evidence for rules 18, 30, 31 |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/.agents/research/swift-cli.md | SW-CLI-01..14 | 2026-10-10 | the rules this file aligns with and corrects |

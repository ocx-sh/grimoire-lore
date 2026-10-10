---
title: "Swift CLI contract: entry point, exit codes, SIGPIPE, buffering, streams, TTY/NO_COLOR, signals"
topic: "cli/exit-codes-and-streams (SW-CLI; rows M-F-01..M-F-08, M-F-11, M-F-13)"
agent: "W2-10 cli/exit-codes-and-streams"
model: sonnet
date_researched: 2026-10-10
sources_count: 27
fixtures: /home/mherwig/.cache/research-lang/swift-tools/fixtures/exit-codes-and-streams/
scope: |
  Covers what a Swift 6.3/6.4 command-line executable must do to honour the fleet CLI contract (exit-code table, stream split, closed-pipe behaviour, flush-and-ferror, colour, two-stage Ctrl-C), measured on Linux x86_64 with the swift:6.4 and swift:6.3 images and a swift-argument-parser 1.8.x exemplar.
  Does NOT cover: config precedence and XDG (M-F-10), log bootstrap (M-F-09), completions (M-F-12), prompts (M-F-15), ServiceGroup (M-F-14), child-process status mapping (SW-IO), atomic writes.
  Windows and WASI claims are "unverified: read only" (owner Q7 default); there is no macOS, so Darwin behaviour is cited from source and docs only. arm64 crash codes are not measured.
---

# Swift CLI contract: entry point, exit codes, SIGPIPE, buffering, streams

All dates 2026-10-10. Toolchains: Swift 6.4 (`swift-6.4-RELEASE`) and 6.3.3, both x86_64 glibc 2.43 in Docker via `swift-tools/run.sh`. Every behavioural claim below was run on both toolchains unless it says otherwise; outputs were identical apart from the build-system layout (6.4 defaults to Swift Build, 6.3 to the native build system).

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [1. Exit path and width](#1-exit-path-and-width-m-f-02)
   - [2. Entry point: @main vs top-level code](#2-entry-point-main-vs-top-level-code-m-f-01)
   - [3. exit, _exit, fatalError and defer](#3-exit-_exit-fatalerror-and-defer-m-f-03)
   - [4. SIGPIPE](#4-sigpipe-m-f-04)
   - [5. Buffering, flush and ferror](#5-buffering-flush-and-ferror-m-f-05)
   - [6. Stream contract](#6-stream-contract-m-f-06)
   - [7. Signals and the two-stage Ctrl-C](#7-signals-and-the-two-stage-ctrl-c-m-f-07-m-f-13)
   - [8. TTY and NO_COLOR](#8-tty-and-no_color-m-f-08)
   - [9. Reserved crash codes](#9-reserved-crash-codes-m-f-11)
   - [10. The Swift exit-code table](#10-the-swift-exit-code-table-decision)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A Swift CLI that goes through swift-argument-parser exits through C `exit()` (Glibc/Musl/Darwin), not through a return from `main`: `Platform.exit` at [`swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Utilities/Platform.swift:170-180`](#s1). Code after `await Cli.main()` never runs; `defer` blocks in `run()` run only because the error is thrown before `exit` is reached.
- `ExitCode` is `Int32`-wide but the OS keeps 8 bits: `throw ExitCode(256)` exits 0, `ExitCode(300)` exits 44 (ran: `a-red`, `base-exit-300`). A bare integer must never reach `ExitCode(`; route every status through a `UInt8`-backed `Status` enum whose `checked(_:)` maps anything outside 0...255 to 1.
- ArgumentParser's validation and parse failures exit 64 on Linux (`EX_USAGE`), 160 on Windows (`ERROR_BAD_ARGUMENTS`) and 1 on WASI (`Platform.swift:155-163`). Pin the fleet's 64 on every platform with `Status.classify(_:root:)`, which compiles and is a no-op on Linux; the Windows and WASI branches are unverified: read only.
- A top-level `try await` that throws and an `@main` type whose `static func main() async throws` throws both crash with `Fatal error: Error raised at top level` and exit 132 (SIGILL), plus an 88-line backtrace on stderr (ran: `d-toplevel`, `d-maintwin`). The same error thrown from an `AsyncParsableCommand.run()` exits 1 with `Error: boom happened` (ran: `d-argparser-sub`).
- Use `@main` on the root `AsyncParsableCommand`. Never put `await` or `try` in a published CLI's `main.swift` outside a `do/catch` that maps to a `Status`.
- The Swift runtime does not touch SIGPIPE on Linux: `SigIgn` is all zero in a process with Foundation, Dispatch and ArgumentParser loaded (ran: `sig-state-default`). `cli big-red | head -1` dies with 141 and no message.
- Executables (never libraries) that can be piped call `signal(SIGPIPE, SIG_IGN)` first and treat a failed write with `errno == EPIPE` as a clean exit 0; the SIG_IGN twin exits 0 against `head -1` (ran: `b-green`). Under SIG_IGN `print` and `fputs` silently drop output, so the write loop must poll `ferror(stdout)`.
- The legacy `FileHandle.standardOutput.write(_:)` traps with exit 132 on EPIPE once SIGPIPE is ignored (`Foundation/FileHandle.swift:709` `try!`), and dies 141 when it is not (ran: `b-legacy-fh-*`). The corpus has 35 uses of the legacy form against 2 `standardError.write(contentsOf:)` uses.
- `print` to a full device is silent success: `cli dev-full-red >/dev/full` exits 0 with nothing on stderr. `fflush(stdout)` returns -1 (`ENOSPC`) once, then 0, while `ferror(stdout)` stays 1 (ran: probe `p1`). End successful commands with `fflush(stdout) == 0 && ferror(stdout) == 0`, else a stderr line and exit 74 (ran: `c-green` = 74).
- In Swift 6 language mode the identifiers `stdout` and `stderr` are rejected ("reference to var 'stdout' is not concurrency-safe", 6.3 and 6.4). The working fix is `@preconcurrency import Glibc` (and `Musl`) as the first import of one dedicated file; a later plain `import Foundation` in the same file re-breaks it (ran: probes `t3` ok, `t4` fails).
- stdout is block-buffered off a TTY: 0 bytes visible after 1.5 s into a file or a pipe, 7 bytes on a pty. `print` then `fatalError` into a file or pipe loses the line; `_exit(3)` loses it too; `exit(3)` and normal return flush it (ran: `e-red-*`, `underscore-exit-file`, `exit-flush-file`).
- `exit()` skips `defer`; throwing `ExitCode` runs it (ran: `defer-exit` marker absent, `defer-throw` marker present). Inside an `AsyncParsableCommand`, a bare `exit(3)` does not compile (`static member 'exit' cannot be used on instance of type`), it needs `Glibc.exit`.
- Two-stage Ctrl-C works with `signal(SIGINT, SIG_IGN)` plus a `DispatchSource` signal source feeding an `AsyncStream`; the forced stage must `signal(SIGINT, SIG_DFL)` then `kill(getpid(), SIGINT)`. `raise(SIGINT)` from a cooperative-pool thread is silently ignored because `DispatchWorker` threads block SIGINT (`SigBlk` bit 1 set): the process stayed alive and needed SIGKILL (137).
- `NO_COLOR` means present and non-empty (no-color.org, updated 2026-09-29). The corpus reads it at six sites in four repos and only swift-testing implements the non-empty test; SwiftPM and JavaScriptKit use `== nil`. A single `Terminal.useColor(fd:env:)` helper with `CLICOLOR_FORCE`, `NO_COLOR`, `TERM=dumb`, `isatty(fd)` per stream passed the six-row matrix (ran: `color-*`).
- Reserved codes: 128+n is "killed by or crashed with signal n" (130 SIGINT, 132 SIGILL, 134 SIGABRT, 137 SIGKILL, 139 SIGSEGV, 141 SIGPIPE, 143 SIGTERM measured or standard; 133 SIGTRAP on arm64 is unmeasured). The table stays within 0, 1 and 64-99.
- Foundation `Process` children inherit an ignored SIGPIPE (`SigIgn` 0x...1000 measured); swift-subprocess 1.0.0 resets every signal to `SIG_DFL` in the child (`process_shims.c:686-701`, measured `SigIgn 0`). Spawn with swift-subprocess after ignoring SIGPIPE.
- Swift Testing exit tests (`#expect(processExitsWith: .exitCode(1))`, Swift 6.2+) turn the contract into tests: red against `exit(256)`, green against the table, `swift test` exit 1 and 0 on 6.3 and 6.4.
- Nine of ten grep checks in this document went red on a planted violation and green on the compliant twin. The SwiftLint `custom_rules` variant did not: the research SwiftLint 0.65.1 is a static binary and skips `custom_rules` ("SourceKit access is prohibited").

## Findings

### 1. Exit path and width (M-F-02)

**Width.** `ExitCode` is a `RawRepresentable`, `Hashable` `Error` over **`Int32`**: `public var rawValue: Int32`, `init(_ code: Int32)` ([`swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Parsable Properties/Errors.swift:35-44`](https://github.com/apple/swift-argument-parser/blob/main/Sources/ArgumentParser/Parsable%20Properties/Errors.swift)). POSIX keeps only `status & 0377` for the waiting parent ([POSIX `exit()`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/exit.html)). So the type admits values the shell can never see:

```swift
// WRONG: exits 0, the shell sees 256 & 0xFF
func run() async throws { throw ExitCode(256) }

// RIGHT: one table, nothing else constructs ExitCode
enum Status: UInt8, Sendable {
    case success = 0, failure = 1, usage = 64, data = 65, unavailable = 69, io = 74
    var exitCode: ExitCode { ExitCode(Int32(rawValue)) }
    static func checked(_ raw: Int) -> Status {
        guard let u = UInt8(exactly: raw), let s = Status(rawValue: u) else { return .failure }
        return s
    }
}
func run() async throws { throw Status.checked(256).exitCode }   // exits 1
```

Ran (6.4 and 6.3): `exit-n 0/3/255/300` give 0/3/255/**44**; `a-red` (`ExitCode(256)`) gives **0**; `a-green` (`Status.checked(256)`) gives **1**; a stray `exit-n -1` gives 64 because `-1` parses as an option, not a value.

**Path.** Every ArgumentParser exit funnels into `Platform.exit(_:) -> Never`, which calls `Glibc.exit`, `Musl.exit`, `Darwin.exit`, `WASILibc.exit`, `Android.exit` and, on Windows, **`ucrt._exit`** ([`Platform.swift:170-180`](https://github.com/apple/swift-argument-parser/blob/main/Sources/ArgumentParser/Utilities/Platform.swift)). `ParsableArguments.exit(withError:)` prints help/`CleanExit` to stdout, errors to stderr via `putc(…, stderr)`, then calls it (`Parsable Types/ParsableArguments.swift:223-240`); `AsyncParsableCommand.main(_:)` wraps `try await asyncParseAsRoot` and `run()` in one `do/catch` that ends in `exit(withError:)` (`Parsable Types/AsyncParsableCommand.swift:65-76`). Consequences:

- On Linux and Darwin `exit()` runs `atexit` handlers and flushes C stdio, so buffered `print` output survives (ran: `exit-flush-file` shows the line present).
- On Windows `ucrt._exit` "terminate[s] the process without ... processing atexit or _onexit functions, and without flushing stream buffers" ([Microsoft Learn: exit, _Exit, _exit](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/exit-exit-exit)), and no `fflush` or `setvbuf` appears anywhere under `Sources/` of ArgumentParser (grep, 0 hits). Whether piped, buffered `print` output is lost on the Windows path is therefore plausible and **unverified: read only**. The defence (an explicit `fflush(stdout)` before returning from `run()`, rule SW-CLI-06) costs nothing and is portable.

**Platform values.** `Platform.exitCodeValidationFailure` is `EX_USAGE` (64) on Unix, `Int32(ERROR_BAD_ARGUMENTS)` on Windows, `EXIT_FAILURE` on WASI (`Platform.swift:155-163`). Microsoft lists `ERROR_BAD_ARGUMENTS` as 160 (0xA0) ([system error codes](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499-)). Ran on Linux: `validate --n=-1` gives 64 with `Error: n must be >= 0`, `--bogus` gives 64 with `Error: Unknown option '--bogus'`, `throw Boom()` gives 1 with `Error: boom happened`, `--help` gives 0 with all 446 bytes on stdout and 0 on stderr. `ParsableArguments.exitCode(for:)` is public, so the fleet value can be pinned:

```swift
static func classify(_ error: any Error, root: any ParsableArguments.Type) -> ExitCode {
    let code = root.exitCode(for: error)
    return code == .validationFailure ? Status.usage.exitCode : code   // 160/1 -> 64 off Linux
}
```

This compiles on 6.4 (fixture `Sources/cli/Contract.swift`); the Windows and WASI results are unverified: read only.

**Documentation.** `ExitCode.success/failure/validationFailure` exist for the case where the command prints its own message and only wants a status (`Documentation.docc/Articles/Validation.md:86`). The Swift Package Index pages for `ExitCode` and `AsyncParsableCommand` are client-rendered; a fetch returned only navigation, so the repo's DocC sources are cited instead.

### 2. Entry point: @main vs top-level code (M-F-01)

SE-0281: `@main` designates one type as the entry point; "errors thrown from a `main()` method will have the same behavior as errors thrown from top-level code"; a `main.swift` is always an entry point and `@main` in it is an error ([SE-0281](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0281-main-attribute.md)). SE-0343: top-level code becomes asynchronous when it contains an `await`, and top-level variables are `@MainActor` ([SE-0343](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0343-top-level-concurrency.md)). The stdlib turns an uncaught top-level error into `fatalError("Error raised at top level: \(String(reflecting: error))")` ([`swiftlang/swift:stdlib/public/core/ErrorType.swift:254`](https://github.com/swiftlang/swift/blob/main/stdlib/public/core/ErrorType.swift)).

Planted (fixture targets `toplevel`, `maintwin`, and `cli d-sub-throws`):

```swift
// toplevel/main.swift                 -> exit 132, "Fatal error: Error raised at top level: toplevel.Boom()"
struct Boom: Error {}
func work() async throws { throw Boom() }
try await work()

// maintwin/App.swift                  -> exit 132, same message, "Thread 0 crashed"
@main struct App { static func main() async throws { throw Boom() } }

// cli d-sub-throws (AsyncParsableCommand) -> exit 1, "Error: boom happened", no backtrace
struct DSubThrows: AsyncParsableCommand { func run() async throws { throw Boom() } }
```

So the `@main` twin of a raw `main() async throws` is no safer than top-level code; only a type that catches (ArgumentParser, or a hand-written `do/catch`) yields a controlled status. `container` writes exactly that hand-written form: `public static func main() async throws` whose body is a `do { … } catch { … Application.exit(withError: error) }` (`container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:104-136`). In Swift 6 language mode a variable declared in a file with top-level code becomes MainActor-isolated and "can not be mutated from a nonisolated context" (measured by the failure wave, `swift-topic-map/failure.md` §2.8), a further reason to keep `main.swift` empty or absent. Crash catching prints a backtrace by default on Linux ([Backtracing.rst](https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst): "Crash catching is enabled by default"); measured 88 stderr lines and 186 ms for `e-red`, 15 lines and 45 ms with `SWIFT_BACKTRACE=enable=no`, and **the exit code is 132 either way**.

### 3. exit, _exit, fatalError and defer (M-F-03)

Ran `cli defer-exit M` (`defer` writes marker M, then `Glibc.exit(3)`) against `cli defer-throw M` (`defer` then `throw ExitCode(3)`): both exit 3; the marker is **absent** after `exit` and **present** after the throw. `underscore-exit` (`print` then `_exit(3)`) into a file: exit 3, stdout empty. `fatalError` after `print`: see section 5. The audit measured the same for `deinit` ([`swift-audit/config-inventory.md`](../swift-audit/config-inventory.md) §5.2). Where `exit` is legitimate: ArgumentParser's own funnel, an optional `main` boundary after a flush, and the signal re-raise in section 7.

Compiler guard: inside an `AsyncParsableCommand` method a bare `exit(3)` resolves to the type's static `exit(withError:)` and fails: `error: static member 'exit' cannot be used on instance of type 'DeferExit'` (6.3 build log; the same text appears for 6.4 on a minimal type). The escape is `Glibc.exit(3)`, which is exactly what the rule forbids, so the guard is a speed bump, not a policy.

### 4. SIGPIPE (M-F-04)

**Disposition.** Ran `cli sig-state` (Foundation, Dispatch, ArgumentParser linked): `SigBlk 0000000000000000`, `SigIgn 0000000000000000`, `SigCgt 00000001000004fc`. The caught set (bits for signals 3-8 and 11) is the Swift backtracer's handlers; **SIGPIPE is neither ignored nor caught**, so the kernel default (Term) applies. Contrast Rust, which sets `SIG_IGN` before `main` ([rust-lang/rust#97889](https://github.com/rust-lang/rust/issues/97889), cited by the Rust cli-contract depth file). Apple's DTS guidance: "The default disposition of that signal is to terminate your process", `signal(SIGPIPE, SIG_IGN)` is process-wide and "You can't, for example, use this technique in library code" ([Apple Developer Forums 773307](https://developer.apple.com/forums/thread/773307)).

**Red and green.** `cli big-red | head -1; echo ${PIPESTATUS[0]}` prints **141**. The twin sets `signal(SIGPIPE, SIG_IGN)` and polls `ferror(stdout)`:

```swift
// RIGHT (fixture BigGreen)
signal(SIGPIPE, SIG_IGN)
for i in 0..<200_000 {
    print("line \(i)")
    if Stdio.stdoutFailed() {                       // ferror(stdout) != 0
        throw (Stdio.lastErrno == EPIPE ? Status.success : Status.io).exitCode
    }
}
```

`big-green | head -1` exits **0**; `big-red > file` writes all 200000 lines (the sanity row). Two traps hide inside the green path:

1. With SIGPIPE ignored, `print` and `fputs` just set the stream error flag and the loop keeps going; without the `ferror` poll the process burns CPU to the end and still exits 0 by accident.
2. The legacy `FileHandle.standardOutput.write(_ data: Data)` is wrapped in `try!` inside Foundation: with SIG_IGN it dies `Foundation/FileHandle.swift:709: Fatal error: 'try!' expression unexpectedly raised an error: ... NSPOSIXErrorDomain Code=32 "Broken pipe"`, exit **132**; without SIG_IGN it dies 141 (ran: `b-legacy-fh-ign`, `b-legacy-fh-default`). The throwing `write(contentsOf:)` surfaces an `NSCocoaErrorDomain` 512 wrapping errno 32 that a `catch` can turn into exit 0 (ran: `b-filehandle` = 0).

**Child inheritance.** `exec` keeps ignored dispositions ([execve(2) via Debian manpages](https://manpages.debian.org/unstable/manpages-dev/execve.2.en.html): "the dispositions of any signals that are ignored or set to the default are left unchanged"). Ran `child-sigign`: the `Foundation.Process` child shows `SigIgn: 0000000180000000` normally and `0000000180001000` (bit 12 = SIGPIPE) after the parent ignored it. swift-subprocess 1.0.0 (`b3937ab85dd3`) resets every signal in the forked child (`Sources/_SubprocessCShims/process_shims.c:686-701`, `signal(signo, SIG_DFL)`); ran against `/bin/sh -c 'grep SigIgn /proc/self/status'`: `SigIgn: 0000000000000000` with and without the parent's `SIG_IGN`. The Darwin spawn path also sets `POSIX_SPAWN_SETSIGDEF` (`Subprocess+Darwin.swift:370-375`).

**Prior art in the corpus.** Five exemplars ignore SIGPIPE, all daemons or protocol hosts: `container@f70ecbb926d9:Sources/Plugins/RuntimeLinux/RuntimeLinuxHelper+Start.swift:65`, `containerization@3e7bc39e66b3:vminitd/Sources/VminitdCore/AgentCommand.swift:79`, `swift-package-manager@5546f44a3b52:Sources/SwiftPMBuildServer/DisableSigpipe.swift:25`, `sourcekit-lsp@c6ce93d5f8aa:Sources/SwiftExtensions/DisableSigpipe.swift:25`, `swift-nio`. None is a pipe-friendly CLI; none converts EPIPE to a clean exit ([`swift-audit/config-inventory.md`](../swift-audit/config-inventory.md) §5.1). `DisableSigpipe.swift:21-28` is the lazily-initialised-global idiom (`private let globallyIgnoredSIGPIPE: Bool = { _ = signal(SIGPIPE, SIG_IGN); return true }()`) with the comment "no F_SETNOSIGPIPE on Linux".

**Stance (decision).** Fleet CLIs ignore SIGPIPE in the executable's first statement and exit 0 on EPIPE, matching the Rust `CLI-05` rule (`rules/rust-quality/cli-contract.md`); 141 is a crash-range code that the table can never contain. Libraries never call `signal`.

### 5. Buffering, flush and ferror (M-F-05)

**Buffering.** `print` writes to C `stdout` under `flockfile` (`_Stdout` in [`stdlib/public/core/OutputStream.swift:559-581`](https://github.com/swiftlang/swift/blob/main/stdlib/public/core/OutputStream.swift) calling `_swift_stdlib_fwrite_stdout`; `_swift_stdlib_flockfile_stdout` in `Stubs.cpp:137`), so glibc's rule applies: "Normally, all files are block buffered. If a stream refers to a terminal ... it is line buffered. The standard error stream stderr is always unbuffered" ([setbuf(3) via Debian manpages](https://manpages.debian.org/unstable/manpages-dev/setbuf.3.en.html)). Ran `cli buffer` (prints `first`, sleeps 3 s, prints `second`): 0 bytes in the file at 1.5 s and 13 bytes at 4.5 s; a pipe reader sees nothing at 1.5 s; a pty (`script -qec`) shows 7 bytes at 1.5 s. Progress that must appear live therefore goes to stderr or is followed by `fflush`.

**Loss on a trap.** `print("printed-before-crash")` then `fatalError` into a file: exit 132, stdout `[]` (lost), stderr line `stderr-before-crash` present because stderr is unbuffered. Piped into `cat`: same loss. The `fflush(stdout)` twin keeps the line (`stdout=[printed-before-crash]`, exit still 132).

**Silent write failure.** `cli dev-full-red >/dev/full; echo $?` prints **0** with an empty stderr. POSIX warns of exactly this: "there is no way for the calling process to discover whether or not exit() successfully wrote the data" and gives the remedy `fflush(stdout)`, then `ferror(stdout)`, then `exit(status)` ([POSIX `exit()`, APPLICATION USAGE](https://pubs.opengroup.org/onlinepubs/9799919799/functions/exit.html)). Probe (`fixtures/.../exit-codes-and-streams-probe/p1`): `print("result")`; `fflush(stdout)` returns **-1** with `errno 28`; `ferror(stdout)` is **1**; a *second* `fflush` returns **0** while `ferror` stays 1. So `ferror` is the sticky witness and an `fflush` whose result is read twice or discarded lies. The twin:

```swift
// Stdio.swift: the only file that names the C globals
@preconcurrency import Glibc          // must be the FIRST import in this file
enum Stdio {
    static func flushStdout() -> Bool { fflush(stdout) == 0 && ferror(stdout) == 0 }
    static func stderrLine(_ s: String) { fputs(s + "\n", stderr) }
    static var lastErrno: Int32 { errno }
}
// end of run():
if !Stdio.flushStdout() {
    Stdio.stderrLine("error: write to stdout failed: \(String(cString: strerror(Stdio.lastErrno)))")
    throw Status.io.exitCode            // 74
}
```

Ran: `dev-full-green >/dev/full` exits **74** with `error: write to stdout failed: No space left on device`; to a file it exits 0 and prints `result`.

**Why a separate file.** Swift 6 language mode rejects the C globals: `error: reference to var 'stdout' is not concurrency-safe because it involves shared mutable state` (6.3 and 6.4, glibc; the Darwin declaration is also a `var`). Probes: plain `import Glibc` fails; `nonisolated(unsafe) let o = stdout` fails at the `stdout` reference; `fflush(nil)` compiles but cannot give `ferror`; `@preconcurrency import Glibc` compiles; `@preconcurrency import Glibc` placed before `import Foundation` compiles, **after it fails** (probe `t3` exit 0, `t4` exit 1, `t5` plain Foundation exit 1). swift-argument-parser uses `@preconcurrency import Glibc` for its `putc(…, stderr)` (`Platform.swift:20`); swift-testing sidesteps the globals with C shims, `swt_stdout()` ([`swift-testing@c7d68ca20cd7:Sources/Testing/Support/FileHandle.swift:42-44`](https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Support/FileHandle.swift)). No exemplar checks the result of `fflush(stdout)` (container and SwiftLint call it bare); only swift-testing reads `ferror` (`FileHandle.swift:467,514`).

### 6. Stream contract (M-F-06)

clig.dev: "Send messaging to stderr. Log messages, errors, and so on should all be sent to stderr", output a human reads vs a machine reads is detected per stream ([clig.dev](https://clig.dev/)). The fleet rules `CLI-01`, `CLI-02`, `CLI-03` and `CLI-04` (`rules/rust-quality/cli-contract.md`) carry over unchanged except the mechanism:

- ArgumentParser already writes errors and usage to stderr once and prints help and `CleanExit` messages to stdout (`ParsableArguments.swift:230-238`); ran: `--help` is 446 bytes stdout, 0 stderr; `validate --n=-1` writes `Error: n must be >= 0` plus usage to stderr and nothing to stdout. Do not print the message and also throw it. To print your own text and set a status, throw a bare `ExitCode` (`Validation.md:86`).
- Corpus: `print(` 741 against 48 explicit stderr writes in 18 CLI repos; 4 of 18 repos have no stderr write ([`swift-audit/exemplar-packaging-and-release.md`](../swift-audit/exemplar-packaging-and-release.md) CLI T5A). Re-measured: diagnostics printed to stdout with `print("Error|Warning…")` appear in `containerization@3e7bc39e66b3:Sources/cctl/RunCommand.swift:269`, `…/ImageCommand.swift:263`, `swift-package-manager@5546f44a3b52:Sources/SPMBuildCore/Plugins/DefaultPluginScriptRunner.swift:530`.
- Stream wiring for child programs belongs to this contract too: swiftly runs `Subprocess.run(config, output: .string(limit: limit), error: .currentStandardError)` so the child's diagnostics reach the parent's stderr while stdout is captured (`swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71`).
- JSON mode: stdout carries only the payload; no exemplar documents or tests this, so the rule is carried over from Rust `CLI-02` with a contract test (parse the entire captured stdout) and **no measurement here**.

Writers: `print(_, to: &stderrStream)` is not thread-safe across tasks unless the stream locks; the stdlib `_Stdout` locks per `print` call, a hand-rolled `TextOutputStream` does not. ArgumentParser's `StandardError` writes byte-by-byte with `putc` (`Platform.swift:190-195`). Prefer one `Stdio.stderrLine` that does a single `fputs`.

### 7. Signals and the two-stage Ctrl-C (M-F-07, M-F-13)

clig.dev: on Ctrl-C "exit as soon as possible", skip long cleanup, "Tell the user what will happen when they hit Ctrl-C again" (Docker Compose second-Ctrl-C example), "Make it crash-only" ([clig.dev](https://clig.dev/)).

**Mechanisms in the corpus.** (1) `DispatchSource` behind an `AsyncStream`: `AsyncSignalHandler.create(notify:)` does `signal(sig, SIG_IGN)` then `DispatchSource.makeSignalSource` per signal (`containerization@3e7bc39e66b3:Sources/ContainerizationOS/AsyncSignalHandler.swift`, lines 98-110). (2) `signal(SIGINT, cHandler)` with `exit(signal + 128)` inside the C handler (`container@f70ecbb926d9:Sources/TerminalProgress/ProgressBar+RestoreCursor.swift:28-34`); `exit` is not async-signal-safe (reading, unverified: read only). (3) swift-service-lifecycle's `UnixSignalsSequence`, compiled out on Windows and WASI (`#if !os(Windows) && !os(WASI)`, per the domain wave). (4) A press-count threshold, `SignalThreshold(threshold: 3, signals: [SIGINT, SIGTERM])` ending in `Darwin.exit(1)` (`container@f70ecbb926d9:Sources/ContainerCommands/Container/ContainerRun.swift:164-168`); `Darwin.exit` does not compile on Linux.

**Planted (f)** (`sigint-red`, `sigint-green`, `sigint-green --use-raise`; bash `set -m` so background jobs do not inherit an ignored SIGINT: "When job control is not in effect, asynchronous commands ignore SIGINT" ([Bash manual: Signals](https://www.gnu.org/software/bash/manual/html_node/Signals.html))):

| Variant | After 1st `kill -INT` | After 2nd | Final status |
|---|---|---|---|
| `sigint-red` (no handler) | dead | n/a | **130** (killed by signal 2) |
| `sigint-green` (SIG_IGN + DispatchSource; 2nd stage `signal(SIGINT, SIG_DFL); kill(getpid(), SIGINT)`) | alive: `first SIGINT: cancelling, press Ctrl-C again to force`, then `graceful: cleanup started (takes 30s)` | dead after `second SIGINT: forcing` | **130** |
| `sigint-green --use-raise` (2nd stage uses `raise(SIGINT)`) | alive | **still alive** (`second SIGINT: forcing` printed) | needed SIGKILL, **137** |
| `sigint-green` + one `kill -TERM` (TERM not handled) | n/a | n/a | **143** |

Cause of the `raise` failure, measured: the process's Dispatch worker threads carry `SigBlk: fffffffe3bfbea27` (SIGINT bit 1 set) while the main thread has `SigBlk: 0`; libdispatch calls `_dispatch_sigmask()` when it configures worker threads (`swift-corelibs-libdispatch:src/queue.c:6250,7189`). `raise` is thread-directed, a process-directed `kill(getpid(), sig)` "may be delivered to any one of the threads that does not currently have the signal blocked" ([signal(7)](https://manpages.debian.org/unstable/manpages/signal.7.en.html)). The Rust rule `EXIT-11` ("restore SIG_DFL and re-raise ... derive the status from the signal") holds, with `kill(getpid(), sig)` as the Swift spelling.

Windows has no `kill`/`SIGINT` re-raise equivalent here; **unverified: read only**. The cooperative-pool/`DispatchSource` mechanics were measured on Linux only.

### 8. TTY and NO_COLOR (M-F-08)

no-color.org (last updated 2026-09-29): software that adds ANSI colour by default "should check for a `NO_COLOR` environment variable that, when present and not an empty string (regardless of its value), prevents the addition of ANSI color" ([no-color.org](https://no-color.org/)); its sample is `no_color != NULL && no_color[0] != '\0'`. clig.dev adds `TERM=dumb`, a not-a-TTY test **per stream** and a `--no-color` flag ([clig.dev](https://clig.dev/)). Helper (fixture `Sources/cli/Terminal.swift`):

```swift
enum Terminal {
    static func useColor(fd: Int32, env: [String: String]) -> Bool {
        if let force = env["CLICOLOR_FORCE"], !force.isEmpty, force != "0" { return true }
        if let nc = env["NO_COLOR"], !nc.isEmpty { return false }
        if env["TERM"] == "dumb" { return false }
        return isatty(fd) == 1
    }
}
```

Ran (`cli color`; ttys through `script -qec`): no TTY -> false/false; TTY -> true/true; `NO_COLOR=1` on a TTY -> false; `NO_COLOR=` (empty) on a TTY -> **true**; `TERM=dumb` on a TTY -> false; `CLICOLOR_FORCE=1` with no TTY -> true. Precedence between an explicit `--color` flag and the environment belongs above this helper (flag wins), as in Rust `CLI-07`.

**Correction to the domain wave.** `swift-topic-map/domain.md` §16 states no exemplar reads `NO_COLOR`; re-measured there are six sites in four repos: `swift-testing@c7d68ca20cd7:Sources/Testing/ABI/EntryPoints/EntryPoint.swift:852` (spec-correct: `!noColor.isEmpty`), `swift-package-manager@5546f44a3b52:Sources/CoreCommands/Options.swift:325` and `…/SwiftSDKCommand/InstallSwiftSDK.swift:49` (`== nil`, so `NO_COLOR=` still counts as set), `JavaScriptKit@c68ee9bdebfa:Plugins/BridgeJS/Sources/BridgeJSCore/Misc.swift:288` (`== nil`), `tuist@2f6ac74754bf:swifterpm/Sources/swifterpm/ResolutionProgress.swift:243` (presence only) and `cli/Sources/TuistEnvironment/Environment.swift:219` (accepts only "truthy" values). Five of the six sites deviate from the spec. `isatty` appears in 17+ sites (`container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:104-111` tests stderr, which is the stream the warning goes to; `swift-format@b15dd59fad21:Sources/swift-format/Utilities/TTY.swift:31` also honours `TERM=dumb`).

### 9. Reserved crash codes (M-F-11)

A shell reports a signal death as 128+n. Measured on x86_64 glibc: `fatalError` and the uncaught top-level error give **132** (SIGILL), `kill -INT` default gives **130**, `kill -TERM` gives **143**, SIGKILL gives **137**, SIGPIPE gives **141**. The failure wave measured 134 (SIGABRT, exclusivity violation) and 139 (SIGSEGV, stack overflow) (`swift-topic-map/failure.md` §2.7); arm64 traps as SIGTRAP (133) per DTS/forum reports and is **unmeasured here**. The documented contract can never contain 128-255, and the table below avoids 2-63 and 100-127 as well, so a script that sees "a number we did not document" treats it as a crash and a number in the table as an answer. A crash prints a backtrace to stderr by default on Linux (Backtracing.rst); the stderr contract does not hold on the crash path.

### 10. The Swift exit-code table (decision)

Mirror the OCX-family table; Swift adds no codes of its own. Values come from `sysexits.h` ([FreeBSD sysexits(3)](https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3), 64-78) plus the private range above `EX__MAX`.

| Code | `Status` case | Meaning |
|---|---|---|
| 0 | `.success` | Success; also a closed downstream pipe (EPIPE) |
| 1 | `.failure` | Unclassified failure; also `checked(_:)` out-of-range fall-through |
| 64 | `.usage` | Bad invocation, every ArgumentParser parse/validation failure (Windows 160 and WASI 1 remapped by `classify`, unverified) |
| 65 | `.data` | Malformed input data, manifest or lockfile |
| 69 | `.unavailable` | Registry or resource unreachable, not retryable |
| 74 | `.io` | Filesystem or stdout I/O fault (includes the failed `fflush`/`ferror`) |
| 75 | `.tempFail` | Retryable transient failure |
| 77 | `.permissionDenied` | Insufficient permission |
| 78 | `.config` | Bad configuration |
| 79-82 | `.notFound` `.auth` `.policyBlocked` `.dirtyRcBlock` | As in the Rust file |
| 83-86 | assigned in the Python SDK | `TRANSPARENCY_LOG_UNAVAILABLE`, `REFERRERS_UNSUPPORTED`, `UNSUPPORTED_KEY_BACKEND`, `FORGE_CAPABILITY_UNAVAILABLE` (`ocx-sdk-python@80136dde4162:src/ocx_sdk/_errors.py:28-51`) |
| 87-99 | unassigned | allocate upward |
| 128-255 | not ours | killed by or crashed with signal n |

Drift to flag: `rules/rust-quality/cli-contract.md` says 83-99 are unassigned while the Python SDK, which mirrors `ocx`, already defines 83-86; the Swift table must copy `ocx`, not the lore file. SwiftFormat is a small in-corpus precedent for the mechanism: `enum ExitCode: Int32 { case ok = 0; case lintFailure = 1; case error = 70 }`, `exit(CLI.run(…).rawValue)` ([`SwiftFormat@fbc07aca5373:Sources/CommandLine.swift:104-109`, `CommandLineTool/main.swift:101`](https://github.com/nicklockwood/SwiftFormat)).

## Normative guidance candidates

Verification columns say how a reviewer checks and whether it was RUN against a planted violation in `fixtures/exit-codes-and-streams/`. Greps list the violation: **empty output means pass** (judge the pipelines `… | xargs -r grep -L …` by output, not exit status: xargs returns 123 when the inner grep reports a hit). Version tags apply to Swift 6.3 and 6.4, ArgumentParser 1.8.x.

1. **SW-CLI-01. Every process status comes from one `UInt8`-backed `Status` enum; `ExitCode(` is constructed only in `Status.swift`.**
   Rationale: `ExitCode` is `Int32` but the OS keeps 8 bits; an arbitrary integer silently wraps.
   Verify: `grep -rn -e 'ExitCode(' --include='*.swift' --exclude='Status.swift' Sources` (output is the violation). RUN yes: bad -> `rules/bad/Commands.swift:7: throw ExitCode(256)`, exit 0; good -> empty, exit 1.

2. **SW-CLI-02. Conversion from any computed integer goes through `Status.checked(_:)`; out-of-range maps to `.failure` (1), never to a modulo.**
   Rationale: `throw ExitCode(256)` exits 0 (success on failure).
   Verify: Swift Testing exit test `await #expect(processExitsWith: .exitCode(1)) { terminate(rawStatus: 256, checked: true) }`; `swift test` on 6.4 and 6.3. RUN yes (`exit-test-probe`): the bare-integer test goes red (`expected exit status ".exitCode(EXIT_FAILURE)", but ".exitCode(EXIT_SUCCESS)" was reported`, exit 1), the table tests go green (exit 0).

3. **SW-CLI-03. Usage and validation failures exit 64 on every platform: let ArgumentParser parse, then map `root.exitCode(for:) == .validationFailure` to `Status.usage`; assert 64 only in Linux/macOS contract tests.**
   Rationale: ArgumentParser returns 160 on Windows and 1 on WASI (`Platform.swift:155-163`).
   Verify: `cli --bogus; echo $?` is 64 (RUN yes, Linux: `base-unknown-option`, `base-validate`); `Status.classify` compiles (RUN yes). The Windows 160 and WASI 1 claims are unverified: read only. Reading heuristic for the remap: `grep -rn -e 'exitCode(for:' --include='*.swift' Sources` should hit the single entry-point file.

4. **SW-CLI-04. The root of a CLI is `@main` on an `AsyncParsableCommand`. No `main.swift` with top-level `await`/`try`; a hand-written `static func main() async throws` needs a `do/catch` that ends in `exit(withError:)` or a `Status`.**
   Rationale: an uncaught error at top level or in `main() async throws` is `Fatal error: Error raised at top level`, exit 132 plus a backtrace, not 1.
   Verify: `grep -rn -e 'await ' --include='main.swift' Sources` (empty = pass) and `grep -rn -e 'func main() async throws' --include='*.swift' Sources` (each hit must contain `catch`: reading heuristic). RUN yes for the first (bad `rules/bad/main.swift:2: try await work()`, good empty) and for the behaviour (`d-toplevel` 132, `d-maintwin` 132, `d-argparser-sub` 1).

5. **SW-CLI-05. Command code ends a run by throwing; `exit`, `_exit`, `Glibc.exit` and `fatalError` are forbidden outside the entry-point file and the signal re-raise.**
   Rationale: `exit` skips `defer` (marker absent) and `_exit` and `fatalError` lose block-buffered stdout.
   Verify: `grep -rnE -e '\bGlibc\.exit\(' -e '\b_exit\(' -e '\bfatalError\(' --include='*.swift' Sources`. RUN yes: bad 3 hits (`Commands.swift:8-10`), good empty. Behaviour RUN yes (`defer-exit` marker ABSENT/`defer-throw` PRESENT; `underscore-exit-file` stdout empty).

6. **SW-CLI-06. A successful command ends with `fflush(stdout) == 0 && ferror(stdout) == 0`; on failure write one stderr line and return `Status.io` (74).**
   Rationale: `print` to `/dev/full` exits 0; POSIX prescribes `fflush` then `ferror` before `exit`.
   Verify: `cli dev-full-red >/dev/full; echo $?` must not be 0 (use `cli <command> >/dev/full` against each command in the contract test). RUN yes: red 0, green 74 with `error: write to stdout failed: No space left on device`, green to a file 0 with `result`.

7. **SW-CLI-07. Name the C globals `stdout`/`stderr` in exactly one file, `Stdio.swift`, whose first import is `@preconcurrency import Glibc` (`Musl` under `canImport(Musl)`); never `nonisolated(unsafe)` aliases.**
   Rationale: Swift 6 mode errors `reference to var 'stdout' is not concurrency-safe`; a later non-preconcurrency import re-breaks it.
   Verify: compiler (`swift build`, language mode 6) and `grep -rlE -e '\b(fflush|ferror|fputs)\(' --include='*.swift' Sources | xargs -r grep -L -e '@preconcurrency import'` (lists files that use stdio without the import). RUN yes: compiler red/green (`t.swift` exit 1 vs `t2.swift` exit 0, 6.3 and 6.4) and grep (bad `rules/bad/Out.swift`, good empty).

8. **SW-CLI-08. An executable that can be piped starts with `signal(SIGPIPE, SIG_IGN)`, polls `ferror(stdout)` in unbounded output loops, and maps `errno == EPIPE` to exit 0. A library never calls `signal`.**
   Rationale: the default is exit 141 with no message; 141 is outside the contract.
   Verify: `cli <big-output-command> | head -1; echo ${PIPESTATUS[0]}` must print 0. RUN yes: red 141 (`b-red`), green 0 (`b-green`). Static heuristic: `grep -rl -e '@main' --include='*.swift' Sources | xargs -r grep -L -e 'SIGPIPE'` lists @main files that never mention SIGPIPE (the call may live in a sibling file: reading heuristic). RUN yes (bad `App.swift`, good empty).

9. **SW-CLI-09. Never use the legacy `FileHandle.standardOutput.write(_:)`/`standardError.write(_:)`; use `write(contentsOf:)` (throws) or stdio.**
   Rationale: it wraps `try!`; EPIPE becomes a 132 trap under SIG_IGN and 141 otherwise.
   Verify: `grep -rnE -e 'standard(Output|Error)\.write\([^c]' --include='*.swift' Sources`. RUN yes: bad `Commands.swift:15`, good empty; behaviour `b-legacy-fh-ign` 132, `b-legacy-fh-default` 141, `b-filehandle` 0. Corpus: 35 legacy uses vs 2 `standardError.write(contentsOf:)`.

10. **SW-CLI-10. After ignoring SIGPIPE, spawn children with swift-subprocess, not Foundation `Process`; with `Process` reset the disposition in the child or do not ignore globally.**
    Rationale: Foundation children inherit `SIG_IGN` (`SigIgn ...1000`); swift-subprocess 1.0.0 resets all signals (`process_shims.c:686-701`).
    Verify: `grep -rn -e 'Process()' --include='*.swift' Sources` in any target that also contains `SIGPIPE` (reading heuristic); measurement `grep SigIgn /proc/self/status` in a child. RUN yes (`child-after-sig-ign` shows the bit; subprocess probe shows `SigIgn: 0000000000000000`); the grep itself not run (heuristic).

11. **SW-CLI-11. Results go to stdout; logs, progress, warnings, prompts and errors go to stderr; under a JSON flag stdout holds only the payload; each error is reported once, either by throwing it (ArgumentParser prints) or by printing it yourself and throwing a bare `ExitCode`/`Status.exitCode`.**
    Rationale: clig.dev; the corpus prints diagnostics to stdout at a 15:1 `print`:stderr ratio.
    Verify: `grep -rnE -e 'print\("(Error|error|Warning|warning)' --include='*.swift' Sources`; JSON mode: a contract test parses the whole captured stdout (no exemplar does). RUN yes for the grep (bad `Commands.swift:6`, good empty); JSON test: no (reading heuristic only).

12. **SW-CLI-12. Do not rely on stdout ordering or liveness off a TTY: output that must appear live goes to stderr or is followed by `fflush`.**
    Rationale: block buffering (0 bytes after 1.5 s into a file or pipe, 7 bytes on a pty).
    Verify: `cli buffer > file &` and `wc -c file` after a pause. RUN yes (`buffer-file-at-1.5s` 0, `buffer-pty-at-1.5s` 7).

13. **SW-CLI-13. Colour is decided per stream by one `useColor(fd:env:)`: `CLICOLOR_FORCE` (non-empty, not "0") forces on; a non-empty `NO_COLOR` forces off; `TERM=dumb` off; otherwise `isatty(fd) == 1`; an explicit `--color auto|always|never` outranks all of them.**
    Rationale: no-color.org says present and non-empty; five of the six corpus read sites deviate.
    Verify: `grep -rnE -e 'NO_COLOR"\] (==|!=) nil' --include='*.swift' Sources` (presence-only test). RUN yes: bad `Color.swift:2`, good empty. Behaviour matrix RUN yes (`color-*`: six rows).

14. **SW-CLI-14. Two-stage Ctrl-C: `signal(SIGINT, SIG_IGN)` plus a `DispatchSource` signal source feeding an `AsyncStream`; first signal cancels the work and prints what a second press does; second signal runs `signal(sig, SIG_DFL)` then `kill(getpid(), sig)`; the shell then sees 128+n (130).**
    Rationale: clig.dev; `raise` is thread-directed and the Dispatch worker threads block SIGINT.
    Verify: bash `set -m`; `cli <cmd> & kill -INT $!; sleep 1; kill -0 $!; kill -INT $!; wait $!; echo $?` expects alive after the first, 130 after the second. RUN yes: green 130, `--use-raise` variant stayed alive and needed SIGKILL (137). Grep: `grep -rnE -e '\braise\(SIG' --include='*.swift' Sources` RUN yes (bad `Commands.swift:11`, good empty).

15. **SW-CLI-15. Register SIGTERM in the same handler as SIGINT; an unhandled SIGTERM ends the process with 143 without cleanup.**
    Rationale: measured 143; services get SIGTERM from supervisors.
    Verify: `cli <cmd> & kill -TERM $!; wait $!; echo $?` is 143 without the handler. RUN yes for the unhandled baseline (`f-sigterm-green-unhandled` 143); handled-TERM variant not planted (no).

16. **SW-CLI-16. The table contains only 0, 1 and 64-99; 2-63, 100-127 and 128-255 are never assigned; 128+n is documented as "killed by or crashed with signal n".**
    Rationale: crash statuses (130, 132, 134, 137, 139, 141, 143; 133 on arm64 unmeasured) must stay distinguishable from answers.
    Verify: `grep -rnE -e 'case [a-zA-Z]+ = ([2-9]|[1-5][0-9]|6[0-3]|[1-9][0-9]{2,})$' --include='Status.swift' Sources`. RUN yes: bad `Status.swift:4-6` (2, 132, 200), good empty.

17. **SW-CLI-17. Every `Status` case has a contract test that runs a real invocation or an exit test (`#expect(processExitsWith: .exitCode(n))`, Swift Testing, Swift 6.2+, ST-0008) and one test locks the `.failure` fall-through.**
    Rationale: otherwise 256-style wraps and platform divergences ship unseen.
    Verify: `swift test` exits non-zero on a planted wrong code. RUN yes (`exit-test-probe`, 6.3 and 6.4).

18. **SW-CLI-18. Treat the crash path as outside the stderr and stdout contract: a trap prints an 88-line backtrace by default on Linux and exits 132; `SWIFT_BACKTRACE=enable=no` shortens it but does not change the status.**
    Rationale: consumers must not parse stderr on a signal-range status.
    Verify: `cli <trap> 2>&1 >/dev/null | wc -l`. RUN yes (88 lines vs 15, exit 132 both).

19. **SW-CLI-19. Classify errors with an exhaustive `switch` into `Status` (no `default:`), so a new error case fails compilation until mapped.**
    Rationale: Rust `EXIT-07` has the same intent; Swift's exhaustive `switch` enforces it.
    Verify: reading heuristic: `grep -rn -e 'default:' --include='Classify*.swift' Sources`. RUN no.

20. **SW-CLI-20. Windows and WASI: assert nothing about statuses or stdout flushing in the Linux contract suite; run the same contract tests on a Windows runner before claiming 64 or flush-on-exit there.**
    Rationale: `Platform.swift` uses `ucrt._exit` (no stdio flush) and 160/1 for usage errors.
    Verify: CI matrix leg. RUN no: unverified: read only.

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/swift-tools/fixtures/exit-codes-and-streams/` (`Package.swift` with targets `cli`, `toplevel`, `maintwin`; path dependency on the read-only exemplar clone `apple__swift-argument-parser@efd239f0055b`). Builds: `swift build --scratch-path /home/mherwig/.cache/research-lang/swift-tools/build/exit-codes-and-streams` (6.4) and `…/exit-codes-and-streams-6.3` (6.3, suffix to keep module caches apart). Driver: `SWIFT_VERSION=6.4 ./runall.sh` and `SWIFT_VERSION=6.3 ./runall.sh`, which build and execute `checks.sh`; raw output in `out-6.4.txt` and `out-6.3.txt`. Results below were identical on 6.4.0 and 6.3.3 unless noted. Each command is quoted as it appears in `checks.sh`; `$cli` is the built `cli` binary.

| ID | Command (verbatim) | RED | GREEN twin | Relevant output |
|---|---|---|---|---|
| a | `"$cli" a-red; echo $?` / `"$cli" a-green; echo $?` | 0 | 1 | `throw ExitCode(256)` vs `throw Status.checked(256).exitCode` |
| base | `"$cli" exit-n 300` | 44 | n/a | 300 mod 256; `exit-n 255` gives 255 |
| b | `"$cli" big-red \| head -1 >/dev/null; echo ${PIPESTATUS[0]}` / `big-green` | 141 | 0 | `signal(SIGPIPE, SIG_IGN)` + `ferror(stdout)` + `errno == EPIPE` |
| b2 | `"$cli" big-red > "$W/big"` | 0 | n/a | `lines=200000` (sanity: full read is fine) |
| b3 | `"$cli" big-file-handle \| head -1` | n/a | 0 | `write(contentsOf:)` under SIG_IGN, catch -> success |
| b4 | `"$cli" big-file-handle-legacy \| head -1` / `… --ignore-sigpipe` | 141 / 132 | n/a | `Foundation/FileHandle.swift:709: Fatal error: 'try!' expression unexpectedly raised an error ... NSPOSIXErrorDomain Code=32 "Broken pipe"` |
| c | `"$cli" dev-full-red >/dev/full; echo $?` / `dev-full-green >/dev/full` | 0 (stderr empty) | 74 | `error: write to stdout failed: No space left on device`; `dev-full-green >file` exits 0 with `result` |
| c2 | probe `p1`: `./p1 >/dev/full` | exit 0 | n/a | `fflush=-1 errno=28 ferror=1`, then `second fflush=0 ferror=1` |
| d | `"$B/toplevel"`, `"$B/maintwin"`, `"$cli" d-sub-throws` | 132, 132 | 1 | `Swift/ErrorType.swift:254: Fatal error: Error raised at top level: toplevel.Boom()`; ArgumentParser: `Error: boom happened` |
| e | `"$cli" e-red >"$W/o" 2>"$W/e"` / `e-green` | 132, stdout `[]` (lost) | 132, stdout `[printed-before-crash]` | stderr line `stderr-before-crash` always present; piping through `cat` also loses it |
| e2 | `"$cli" underscore-exit >"$W/o"` | 3, stdout `[]` | exit-n 3 -> 3, flushed | `_exit` skips the flush; `exit` keeps it |
| f1 | `defer-exit "$W/m1"` / `defer-throw "$W/m2"` | 3, marker ABSENT | 3, marker present | `Glibc.exit(3)` vs `throw ExitCode(3)` |
| f | `f f-sigint-green-raise sigint-green --use-raise` / `f f-sigint-green sigint-green` | 137 (alive after both INTs) | 130 | `second SIGINT: forcing` printed in both; `kill(getpid(), SIGINT)` dies, `raise(SIGINT)` does not |
| f0 | `f f-sigint-red sigint-red` | 130 after first INT | n/a | default disposition |
| f9 | `"$cli" sigint-green & kill -TERM $pid; wait $pid` | 143 | n/a | TERM unhandled |
| g | `"$cli" sig-state` | n/a | n/a | `SigBlk 0000000000000000 SigIgn 0000000000000000 SigCgt 00000001000004fc` |
| h | `"$cli" buffer >"$W/buf" &` then `wc -c` at 1.5 s and 4.5 s | 0 then 13 | pty: 7 at 1.5 s | pipe reader: nothing at 1.5 s |
| i | `"$cli" child-sigign` / `… --ignore-sigpipe` | n/a | n/a | child `SigIgn: 0000000180000000` / `0000000180001000` (Foundation.Process). Subprocess probe: `SigIgn: 0000000000000000` both |
| j | `NO_COLOR=1 script -qec "$cli color" /dev/null` etc. | n/a | n/a | six-row matrix in Finding 8 |
| k | `swiftc -swift-version 6 -typecheck t.swift` (plain `import Glibc`, `fflush(stdout)`) / `t2.swift` (`@preconcurrency import Glibc`) | 1 | 0 | `error: reference to var 'stdout' is not concurrency-safe because it involves shared mutable state` (6.3 and 6.4) |
| k2 | `t3.swift` (preconcurrency then Foundation) / `t4.swift` (Foundation then preconcurrency) | t4: 1 | t3: 0 | import order matters |
| l | `swift test --scratch-path …/exit-codes-and-streams-exittest-6.4` in `exit-test-probe` | 1 | `--filter 'tableMapsOutOfRangeToFailure\|tableKeepsUsage'`: 0 | 6.4: `Expectation failed: expected exit status ".exitCode(EXIT_FAILURE)", but ".exitCode(EXIT_SUCCESS)" was reported instead`; 6.3: `.exitCode(1) → .exitCode(0)` |
| m | `bash ./verify-rules.sh v` (grep checks C1-C10) | see below | see below | `verify-rules.out` |
| n | `swiftlint lint --strict --quiet --no-cache --config rules/.swiftlint.yml rules/bad` | **did not go red** (exit 0) | exit 2 (unrelated `identifier_name` on `io`) | `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` The research `swiftlint` 0.65.1 is a static binary (`ldd`: not a dynamic executable), so `custom_rules` cannot run here. No SwiftLint verification is claimed. |

`verify-rules.sh` output (bad = `rules/bad`, good = `rules/good`; `bad_exit` is grep's/xargs's status, the lines are the evidence):

```
C1-exitcode-outside-status      bad_exit=0   bad_lines=1  good_exit=1 good_lines=0   rules/bad/Commands.swift:7: throw ExitCode(256)
C2-process-exit                 bad_exit=0   bad_lines=3  good_exit=1 good_lines=0   Commands.swift:8-10 Glibc.exit(2), _exit(3), fatalError(…)
C3-diag-on-stdout               bad_exit=0   bad_lines=1  good_exit=1 good_lines=0   Commands.swift:6 print("Error: registry unreachable")
C4-no-color-presence-only       bad_exit=0   bad_lines=1  good_exit=1 good_lines=0   Color.swift:2 environment["NO_COLOR"] == nil
C5-raise                        bad_exit=0   bad_lines=1  good_exit=1 good_lines=0   Commands.swift:11 raise(SIGINT)
C6-toplevel-await               bad_exit=0   bad_lines=1  good_exit=1 good_lines=0   main.swift:2 try await work()
C7-stdio-without-preconcurrency bad_exit=123 bad_lines=1  good_exit=0 good_lines=0   rules/bad/Out.swift
C8-reserved-or-gap-codes        bad_exit=0   bad_lines=3  good_exit=1 good_lines=0   Status.swift:4-6 (2, 132, 200)
C9-main-without-sigpipe         bad_exit=123 bad_lines=1  good_exit=0 good_lines=0   rules/bad/App.swift
C10-legacy-filehandle-write     bad_exit=0   bad_lines=1  good_exit=1 good_lines=0   Commands.swift:15 FileHandle.standardOutput.write(Data(…))
```

Watched red on a planted violation and green on the compliant twin: a, b, c, d, e (with `fflush`), f1 (defer), f (raise vs kill), k, l, and C1-C10 (ten greps), plus the Foundation-vs-swift-subprocess child-inheritance pair: 21 in total. Not red: n (SwiftLint `custom_rules`, tool limitation above). Not run: Windows, WASI, arm64, macOS; JSON-payload-only test; handled-SIGTERM variant.

Caveats: builds are debug (`swift build` default); release was not compared. The audit measured `fflush(stdout)` after `print` as returning 0 on `/dev/full` (`config-inventory.md` §5.2); here the first `fflush` returns -1 and only a repeated call returns 0, which probably explains the difference.

## Exemplar evidence

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| SW-CLI-01/02 typed status table | `SwiftFormat@fbc07aca5373:Sources/CommandLine.swift:104-109` (`enum ExitCode: Int32`), `main.swift:101` (`exit(CLI.run(…).rawValue)`); `swift-argument-parser@efd239f0055b:Platform.swift:136-166` | The corpus has no `ExitCode(` literal above 255 (only `sourcekit-lsp@c6ce93d5f8aa:Sources/Diagnose/RunSourcekitdRequestCommand.swift:150` uses 255, the maximum). No Swift CLI has a sysexits-style table ([`swift-audit/config-inventory.md`](../swift-audit/config-inventory.md) §5.1) |
| SW-CLI-03 usage 64 | ArgumentParser `EX_USAGE` on Unix | Windows 160 / WASI 1 (`Platform.swift:155-163`); no exemplar remaps |
| SW-CLI-04 entry point | `container@f70ecbb926d9:Sources/ContainerCommands/Application.swift:104-136` (catch-all `main() async throws` -> `exit(withError:)`) | `containerization@3e7bc39e66b3:vminitd/Sources/vminitd/Application.swift:38` and `…/examples/ctr-example/Sources/ctr-example/main.swift:23` declare `static func main() async throws` (catch handling not checked); 30 `main.swift` files exist, almost all Examples/tools |
| SW-CLI-05 no exit/fatalError | ArgumentParser funnels through one `Platform.exit` | `exit(` 50 and `fatalError(` 596 in CLI-shaped repos (audit); `container@f70ecbb926d9:Sources/TerminalProgress/ProgressBar+RestoreCursor.swift:28-34` calls `exit(signal + 128)` inside a C handler |
| SW-CLI-06 flush+ferror | `swift-testing@c7d68ca20cd7:Sources/Testing/Support/FileHandle.swift:467,514` (reads `ferror`) | `fflush(stdout)` result ignored: `container@f70ecbb926d9:Sources/ContainerCommands/Container/ContainerLogs.swift:105`, `ContainerStats.swift:53,58,281`, `SwiftLint@ec4691d9e813:Source/SwiftLintBase/QueuedPrint.swift:45,56` |
| SW-CLI-07 `@preconcurrency import` | `swift-argument-parser@efd239f0055b:Platform.swift:20`; swift-testing C shim `swt_stdout()` (`FileHandle.swift:42-44`) | n/a |
| SW-CLI-08 SIGPIPE | `swift-package-manager@5546f44a3b52:Sources/SwiftPMBuildServer/DisableSigpipe.swift:21-28`, `sourcekit-lsp@c6ce93d5f8aa:Sources/SwiftExtensions/DisableSigpipe.swift:21-28`, `container@f70ecbb926d9:…/RuntimeLinuxHelper+Start.swift:65`, `containerization@3e7bc39e66b3:vminitd/…/AgentCommand.swift:79` (all daemons/hosts) | No pipe-friendly CLI sets it or maps EPIPE to 0; `swiftly`, `swift-format`, `swift-container-plugin` do not |
| SW-CLI-09 legacy FileHandle | 2 `standardError.write(contentsOf:)` uses | 35 legacy `standardOutput/standardError.write(_:)` uses in Sources outside Tests/Examples/Fixtures, e.g. `swift-protobuf/Sources/protoc-gen-swift/FileIo.swift:21`, `swift-syntax/SwiftParserCLI/Sources/swift-parser-cli/Utils.swift:28`, `containerization/examples/sandboxy/…/ProgressUI.swift:41` |
| SW-CLI-10 child signals | swift-subprocess 1.0.0 `process_shims.c:686-701`; swiftly pins it `exact: "1.0.0"` (`swiftly@c8cf2e35bfca:Package.swift:34,71`) | `Process()` 50 uses in 16 repos inherit ignored dispositions |
| SW-CLI-11 streams | `swiftly@c8cf2e35bfca:Sources/SwiftlyCore/ModeledCommandLine.swift:64-71` (child stderr passed through, stdout captured) | `print("Warning|Error…")` to stdout: `containerization@3e7bc39e66b3:Sources/cctl/RunCommand.swift:269`, `…/ImageCommand.swift:263`; `print(` 741 vs 48 stderr writes |
| SW-CLI-13 NO_COLOR | `swift-testing@c7d68ca20cd7:…/EntryPoint.swift:852` (non-empty test), `swift-format@b15dd59fad21:…/TTY.swift:31` (TERM=dumb) | `swift-package-manager@5546f44a3b52:Sources/CoreCommands/Options.swift:325`, `JavaScriptKit@c68ee9bdebfa:…/Misc.swift:288`, `tuist@2f6ac74754bf:…/ResolutionProgress.swift:243` (presence only), `tuist …/Environment.swift:219` (truthy only); contradicts domain §16 "no exemplar reads NO_COLOR" |
| SW-CLI-14 two-stage Ctrl-C | `containerization@3e7bc39e66b3:…/AsyncSignalHandler.swift:98-110` (SIG_IGN + DispatchSource + AsyncStream); `container@f70ecbb926d9:…/ContainerRun.swift:164-168` (press-count threshold) | the threshold ends in `Darwin.exit(1)` (no Linux build, not the signal's own status); no exemplar re-raises |
| SW-CLI-17 exit tests | swift-testing exit tests exist ([ST-0008](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0008-exit-tests.md)); argument-parser `AssertExecuteCommand` runs real binaries (`TestHelpers.swift:401-428`, per the domain wave) | no exemplar CLI asserts 64 or any non-zero status with `processExitsWith` (not exhaustively searched) |

## AI-agent angle

What an LLM characteristically gets wrong in this subarea, and the cheapest mechanical check:

| Mistake | Why it is wrong | Smallest check |
|---|---|---|
| `throw ExitCode(code)` with a computed or arbitrary integer; custom codes 2, 3, 4 or 200 | wraps modulo 256 (256 -> 0); collides with shell/crash conventions | C1 and C8 greps; `swift test` exit test (SW-CLI-02) |
| `exit(1)` / `Foundation.exit` / `fatalError` after printing an error | skips `defer`; drops block-buffered stdout; trap is 132 | C2 grep |
| Top-level `try await main()` in `main.swift`, or `@main` + `static func main() async throws` without catch | uncaught error is a 132 crash with a backtrace, not 1 | C6 grep; run the binary with a forced throw and check `$?` |
| `fflush(stdout)` or `ferror(stdout)` in a Swift 6 target, then "fixing" the error with `nonisolated(unsafe) let out = stdout` | the alias still references the C global and fails; only `@preconcurrency import` (first import in the file) or a C shim works | build in language mode 6; C7 grep |
| `print` as the only output path and no flush check | `>/dev/full` and closed pipes exit 0 | `cli <cmd> >/dev/full; echo $?` |
| Using `FileHandle.standardError.write(Data(...))` (training-data default) | traps 132 on EPIPE under SIG_IGN, 141 otherwise | C10 grep |
| Adding `signal(SIGPIPE, SIG_IGN)` and then spawning `Process()` children, or placing it in a library | children inherit the ignored signal; libraries must not decide for the host | grep `SIGPIPE` and `Process()` in the same target (heuristic) |
| Two-stage Ctrl-C written with `raise(SIGINT)` or `exit(128 + sig)` in a closure-based handler | `raise` from a pool thread does nothing; `exit` inside a C handler is not async-signal-safe; `Darwin.exit` does not build on Linux | C5 grep; the `kill -INT` twice test (SW-CLI-14) |
| `signal(SIGINT) { _ in ... }` capturing state in a Swift closure | a `@convention(c)` handler cannot capture; agents reach for globals with `nonisolated(unsafe)` | prefer DispatchSource; grep `signal(SIG` in Sources |
| `environment["NO_COLOR"] != nil` or `== "1"` | spec is non-empty; empty must not disable | C4 grep |
| Assuming 64 on Windows or in a cross-platform CI test | ArgumentParser gives 160 (Windows) and 1 (WASI) | contract test per platform; unverified off Linux |
| Writing `exit(3)` inside an `AsyncParsableCommand` method | compile error `static member 'exit' cannot be used on instance of type`; the agent then writes `Glibc.exit` or `Darwin.exit` (the latter does not build on Linux) | C2 grep catches `Glibc.exit(`; build on Linux |
| Using `DispatchSemaphore`/completion handlers for signal waits | pre-Swift-6 idiom; `AsyncStream` + `DispatchSource` is the pattern in `AsyncSignalHandler.swift` | review |

## Contested / evolving

- **SIGPIPE: 141 or 0.** Unix filters die quietly with 141 and shells rely on it; the fleet contract (Rust `CLI-05`) wants 0 and a table without crash-range codes. The Swift ecosystem has no consensus: the five SIGPIPE-ignoring exemplars are daemons, and no CLI exemplar converts EPIPE. The stance here follows the fleet, not the platform. As of 2026-10-10 nothing in Swift 6.4 changes the default (SigIgn is zero).
- **`exit()` vs returning a status.** SE-0281 deliberately left `main()` returning `Void` (a design that returns `Never` was rejected, "Return `Never` instead of `Void`") and told programs to "use `exit` to provide a status code". ArgumentParser accordingly always calls `exit`. No proposal for a status-returning `main` is in the corpus. Trend: unchanged since Swift 5.3.
- **Windows exit path.** ArgumentParser uses `ucrt._exit`, which does not flush; whether that loses piped output is unverified. 1.8.2 (2026-06-04) fixed a Windows implicit-`Int32` warning but not the flush question. Needs a Windows leg (owner Q7).
- **Exit tests are new.** `processExitsWith` ships in Swift 6.2 and is "available on macOS, Linux, FreeBSD, OpenBSD, and Windows" (exit-testing doc via the domain wave); in the corpus only swift-testing and its dependents use it. The rule SW-CLI-17 therefore asks for it on Swift 6.2+ and a shell-invocation test otherwise.
- **Backtracer on by default.** Linux prints a backtrace on crash by default ([Backtracing.rst](https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst): "Crash catching is enabled by default"); on macOS 26 it defaults to `tty`, earlier macOS `no`. A CLI's crash-path stderr therefore differs by platform and OS version.
- **NO_COLOR semantics.** The site was updated 2026-09-29 and still says non-empty. Tuist's "truthy only" reading and SwiftPM's presence-only reading are both live in the corpus; expect the non-empty rule to win in the fleet.
- **`raise()` vs `kill(getpid())` in async code.** The measured failure is a consequence of libdispatch masking signals on worker threads; if Swift concurrency or libdispatch changes its thread signal masks the `raise` variant may start to work. The `kill(getpid(), sig)` form works in both cases.
- **Table drift.** The lore Rust file says 83-99 unassigned, the Python SDK already uses 83-86. The fleet needs one canonical list; this document follows `ocx`.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| <a id="s1"></a>https://github.com/apple/swift-argument-parser/blob/main/Sources/ArgumentParser/Utilities/Platform.swift (exemplar `efd239f0055b`, lines 20, 136-180, 190-195) | Exit-code constants, `Platform.exit`, stderr stream | 1.8.x, repo tip 2026-10-05 | The exit path and the per-platform usage code |
| https://github.com/apple/swift-argument-parser/blob/main/Sources/ArgumentParser/Parsable%20Properties/Errors.swift | `ExitCode` type (`Int32`), static `success/failure/validationFailure` | 1.8.x | Width of the type |
| https://github.com/apple/swift-argument-parser/blob/main/Sources/ArgumentParser/Parsable%20Types/AsyncParsableCommand.swift (and `ParsableArguments.swift:223-240`) | `main(_:)` catch -> `exit(withError:)` | 1.8.x | Proves `exit()` not return |
| https://github.com/apple/swift-argument-parser/blob/main/Sources/ArgumentParser/Documentation.docc/Articles/Validation.md | Throwing `ExitCode` to avoid double messages | 1.8.x | Printing yourself without a duplicate error |
| https://swiftpackageindex.com/apple/swift-argument-parser/documentation/argumentparser | Package Index DocC front end | 2026 | Fetched, but client-rendered (no readable content); the repo DocC sources above are the substitute |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0281-main-attribute.md | SE-0281 `@main` | Swift 5.3 | Entry-point semantics, "errors thrown from `main()` behave like top-level code" |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/0343-top-level-concurrency.md | SE-0343 concurrency in top-level code | Swift 5.7 | Async top level, MainActor top-level variables |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/core/ErrorType.swift | `_errorInMain` -> `fatalError("Error raised at top level")` | main, 2026 | Source of the 132 crash |
| https://github.com/swiftlang/swift/blob/main/stdlib/public/core/OutputStream.swift (and `stubs/Stubs.cpp:137`) | `_Stdout`, `flockfile` | main, 2026 | `print` is C stdio, hence buffering rules |
| https://github.com/swiftlang/swift/blob/main/docs/Backtracing.rst | Swift backtracer design and defaults | main, 2026 | Crash backtrace on by default on Linux |
| https://github.com/swiftlang/swift-corelibs-libdispatch/blob/main/src/queue.c | libdispatch worker-thread configuration (`_dispatch_sigmask`) | main, 2026 | Why `raise()` from a pool thread fails |
| https://github.com/swiftlang/swift-subprocess/blob/1.0.0/Sources/_SubprocessCShims/process_shims.c (`b3937ab85dd3`) | Child signal reset on Linux | 1.0.0 | Child-inheritance fix |
| https://github.com/swiftlang/swift-testing/blob/main/Sources/Testing/Support/FileHandle.swift (`c7d68ca20cd7`) | `swt_stdout()` shim, `ferror` use | main, 2026 | How swift-testing avoids the Swift 6 `stdout` error |
| https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0008-exit-tests.md | ST-0008 exit tests | Swift 6.2 | `processExitsWith` for status contracts |
| https://pubs.opengroup.org/onlinepubs/9799919799/functions/exit.html | POSIX `exit()` | POSIX 2024 | 8-bit status, flush semantics, the `fflush`/`ferror` recipe |
| https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3 | sysexits(3), codes 64-78 | FreeBSD 15.1, 2024-05 | Source of the table values |
| https://no-color.org/ | NO_COLOR convention | updated 2026-09-29 | Non-empty rule and sample C code |
| https://clig.dev/ | Command Line Interface Guidelines | 2020-, current | Streams, TTY, colour, Ctrl-C guidance |
| https://manpages.debian.org/unstable/manpages-dev/setbuf.3.en.html | setbuf(3) buffering modes | glibc 2.4x | Block vs line vs unbuffered |
| https://manpages.debian.org/unstable/manpages-dev/execve.2.en.html | execve(2): ignored signals stay ignored | Linux 6.x | Child inheritance |
| https://manpages.debian.org/unstable/manpages/signal.7.en.html | signal(7) | Linux 6.x | Process- vs thread-directed delivery, default SIGPIPE action |
| https://www.gnu.org/software/bash/manual/html_node/Signals.html | Bash signals | bash 5.x | Background jobs ignore SIGINT without job control (test harness pitfall) |
| https://developer.apple.com/forums/thread/773307 | Apple DTS "Debugging Broken Pipes" | 2025 | Default SIGPIPE disposition and the library caveat |
| https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499- | Win32 error codes | current | `ERROR_BAD_ARGUMENTS` = 160 |
| https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/exit-exit-exit | UCRT `exit`, `_exit` | current | `_exit` does not flush stream buffers |
| /home/mherwig/dev/grimoire-lore/.agents/worktrees/swift/rules/rust-quality/cli-contract.md and /home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_errors.py (`80136dde4162`) | Fleet CLI contract and the SDK's exit-code enum | 2026 | The table and rules being ported; the 83-86 drift |
| https://github.com/swiftlang/swift-package-manager/blob/main/Sources/SwiftPMBuildServer/DisableSigpipe.swift (`5546f44a3b52`) | Lazily-global `SIG_IGN` idiom | main, 2026 | In-tree Swift precedent |

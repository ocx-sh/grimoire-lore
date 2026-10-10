# Crash signatures

Measured on Swift 6.4.0 and 6.3.3, Linux x86_64 (measured 2026-10-10). Every row
is a debug build with the backtracer at its Linux default (`SWIFT_BACKTRACE`
unset) unless the row says `enable=no`. arm64 and macOS rows are
`unverified: read only`.

Contents: [Exit code to signal](#exit-code-to-signal) · [Debug builds](#debug-builds) ·
[Release builds](#release-builds) · [Exit 0 with a crash report](#exit-0-with-a-crash-report) ·
[Crash inside swift test](#crash-inside-swift-test) · [Exits with no backtrace](#exits-with-no-backtrace) ·
[Why the code alone misroutes](#why-the-code-alone-misroutes)

## Exit code to signal

A process killed by signal `n` exits `128 + n` under a shell. The backtracer
handles signals 3, 4, 5, 6, 8, 10 and 11 (Backtracing.rst, read 2026-10-10).

| Exit | Signal | Usual source |
|---|---|---|
| 132 | 4 SIGILL | Swift trap on x86_64 (`ud2`): `precondition`, `fatalError`, force unwrap, overflow, double resume |
| 133 | 5 SIGTRAP | The arm64 trap instruction (reported in cited threads, `unverified: read only`) |
| 134 | 6 SIGABRT | `abort()`, an uncaught C++ exception, a C allocator abort |
| 139 | 11 SIGSEGV | Bad pointer dereference, stack overflow |
| 137 | 9 SIGKILL | OOM killer, `timeout -k`, `kill -9` |
| 141 | 13 SIGPIPE | The reader of stdout closed |
| 143 | 15 SIGTERM | An unhandled terminate request |
| 130 | 2 SIGINT | Ctrl-C with no handler |
| 131 | 3 SIGQUIT | `kill -QUIT` while `SWIFT_BACKTRACE=enable=no`, so the default action ran |
| 124 | none | `timeout`'s own code, whichever signal it sent |

## Debug builds

Rows 132 to 139 were measured under the default backtracer.

| Fault | Exit | First lines of stderr |
|---|---|---|
| `precondition(_:_:)` | 132 | `main.swift:16: Precondition failed: zero must be positive` |
| Force unwrap of `nil` | 132 | `main.swift:17: Fatal error: Unexpectedly found nil while unwrapping an Optional value` |
| Arithmetic overflow | 132 | `*** Signal 4: Backtracing ... ***` then `*** Swift runtime failure: arithmetic overflow ***` |
| Continuation resumed twice | 132 | `CheckedContinuation.swift:169: Fatal error: SWIFT TASK CONTINUATION MISUSE: doubleResume_() tried to resume its continuation more than once` |
| `throw` out of top-level code | 132 | `ErrorType.swift:254: Fatal error: Error raised at top level: faults.Boom()` |
| Null pointer in a C call | 139 | `*** Program crashed: Bad pointer dereference at 0x0000000000000000 ***`, frame 0 in the C file |
| Pointer from `UnsafeMutablePointer<Int>(bitPattern: 2)` written from Swift | 139 | `*** Program crashed: Bad pointer dereference at 0x0000000000000002 ***`, frame 0 in Swift code, no repeated frame |
| Unbounded recursion | 139 | the same header with a fault address near the stack pointer, frames 0 to 12 and beyond all the same function |
| `abort()` | 134 | `*** Program crashed: Aborted ***` |
| C double free | 134 | `free(): double free detected in tcache 2` before the backtrace |
| Closed stdout reader | 141 | no output |
| `raise(SIGKILL)` | 137 | no output |
| Leaked continuation, under `timeout 5` | 124 | `SWIFT TASK CONTINUATION MISUSE: leak_() leaked its continuation without resuming it.` |

Branch tests, first match wins, for each shared exit code:

| Exit | Test on the first lines | Cause |
|---|---|---|
| 132 | `Precondition failed` or `precondition failure` | `precondition` |
| 132 | `Unexpectedly found nil` | force unwrap |
| 132 | `Error raised at top level` | a throw out of an entry point |
| 132 | `tried to resume its continuation more than once` | double resume |
| 132 | `Swift runtime failure` and no `Fatal error` line | runtime trap such as overflow |
| 132 | any other `Fatal error` | `fatalError` or an assertion |
| 132 | `Program crashed: Illegal instruction` and neither `Fatal error` nor `Swift runtime failure` (release stdlib trap such as an Array index) | a stdlib precondition, read the first user frame's `file:line` |
| 132 | no message line (stderr empty under `enable=no`), frame 0 of the original dump is `_dispatch_assert_queue_fail` | a closure inferred `@MainActor` run off main (SW-CONC-34, SW-CONC-26) |
| 134 | `double free`, `corrupted`, `invalid pointer` or `malloc(): ` | heap corruption in C code |
| 134 | none of those | `abort()` or an uncaught C++ exception |
| 139 | one frame repeated 20 or more times | stack overflow |
| 139 | `Bad pointer dereference at 0x0000000000000000`, frame 0 in C | null pointer in a C call |
| 139 | frame 0 in Swift code, no repeated frame, any address | an unsafe pointer, a dangling pointer or a use after free: `swift build --sanitize=address` and read the `AddressSanitizer:` line (SW-SEC-06, SW-SEC-11) |

## Release builds

`swift build -c release` moves the message text (measured 2026-10-10, 6.4.0):

- A force unwrap prints `*** Swift runtime failure: Unexpectedly found nil while unwrapping an Optional value ***` and no `Fatal error:` line.
- `precondition` prints `*** Program crashed: Illegal instruction ***`. Frame 0 reads `Swift runtime failure: precondition failure`, and the message string you wrote is gone.
- Frames still carry `main.swift:16:24` because SwiftPM builds with debug info.

A stdlib trap such as an Array index out of range (`swift build -c release`, 6.4.0)
prints only `*** Program crashed: Illegal instruction at 0x... ***`, frame 0
`specialized Array.subscript.getter in faults at //<compiler-generated>`, and
neither `Fatal error` nor `Swift runtime failure`.

So in a release build match `Swift runtime failure` and read the first user frame's
`file:line`; when neither text is there, `Illegal instruction` alone is the stdlib
precondition row (SW-ERR-14). A search for the `Fatal error:` text finds nothing. Exit codes are the
same as in debug. Never use `-Ounchecked` to chase a crash: it removes the
traps (SW-ERR-16).

## Exit 0 with a crash report

Measured on 6.4.0 and 6.3.3 under the default backtracer: a trap on a
libdispatch worker thread, while main waited in a libc `usleep(4_000_000)`,
exited 0 in every run (3 of 3 on 6.4.0, 2 of 2 on 6.3.3). The plant installed a
`DispatchSource` signal handler as a plain closure inside a `@MainActor`
function (SW-CONC-34), and raised the signal once. stderr held
`*** Program crashed: Illegal instruction at 0x... ***` and `Thread 2 "DispatchWorker" crashed:`,
the handler's side effect never ran, and the program printed its normal last line.

| Run | Exit | stdout | stderr |
|---|---|---|---|
| default backtracer | 0 | `survived hits=0 ...` | 80 lines, `Program crashed: Illegal instruction` |
| `SWIFT_BACKTRACE=enable=no` as a per-command prefix | 132 | empty | none |

The cause is a trap on a non-main thread while main exits normally before the
crash is fatal. The backtracer's suspend signal interrupts main's libc
`sleep`, `usleep` or `nanosleep`, main returns early and exits 0 before the
crashed thread re-faults: the `usleep(4 s)` run finished in 40 ms (`survived`
printed) while 74 stderr lines were still being written. The same traps with main
in Foundation `Thread.sleep(4)` or parked in `dispatchMain()` gave 132 under the
default backtracer (3 of 3 on 6.4.0, and 10 warm reruns; one cold first run gave
exit 0, so the trigger is timing dependent; plain worker traps on `DispatchQueue.global`,
`Task.detached` and `Thread` also gave 132). The route: exit 0 plus `Program
crashed:` means a trap on a non-main thread. Rerun the same input with the per-command prefix,
expect 132, then route the failure by its first line, or by frame 0 of the original
dump when the rerun's stderr is empty. The prefix is the SW-CORE-18
carve-out for a test that asserts a trap's exit code (SW-CONC-34, SW-CONC-26).
It is never persisted in a Dockerfile, unit or CI file.

## Crash inside swift test

`swift test` exits 1 when the test process dies. The signal is named in the log,
as in `exited with unexpected signal code 4` for the runner process
(`<Target>-test-runner` on 6.4.0, `<pkg>PackageTests.xctest` on 6.3.3), preceded
by the trap's own `Fatal error:` line (measured 2026-10-10). Map the signal
number `n` to `128 + n` (4 is 132) and route as above. `swift test --filter`
on the one test reproduces it without the others.

## Exits with no backtrace

137, 141 and 143 leave no crash report because the program did not trap. The
cause is outside the program, so look at the sender.

| Exit | Confirm | Open |
|---|---|---|
| 137 | stderr empty, `dmesg` or the orchestrator reports an OOM kill, or a `timeout -k` ran | memory limit, the wrapper |
| 141 | stderr empty, the reader of the pipe exited first (`head -n 1`) | SW-CLI-08 |
| 143 | `kill -TERM` against the same binary reproduces it | SW-CLI-10, SW-CLI-11 |
| 130 | `kill -INT` against the same binary reproduces it | SW-CLI-10, SW-CLI-11 |

Measured: `kill -TERM` gave 143 and `kill -INT` gave 130 against a spinning
plant launched under `set -m`. A closed reader gave 141 and `raise(SIGKILL)` gave 137.

## Why the code alone misroutes

The two-signal route (exit code plus first message line) took the right branch
17 of 17 on 6.4.0 and on 6.3.3, and 7 of 7 on a release build, over 17 planted
failures (measured 2026-10-10, watched red). A route on the exit code alone took
the wrong branch 11 of 17 on debug and 5 of 7 on release: 132 covers six causes,
134 two, 139 two, and 124 four. Read the first line.

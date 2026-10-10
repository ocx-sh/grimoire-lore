# Hang capture

Measured on Swift 6.4.0 and 6.3.3, Linux x86_64 (measured 2026-10-10). The
dump needs the backtracer on. macOS, Windows and the static Linux SDK are
`unverified: read only`.

Contents: [Does SIGQUIT print a backtrace](#does-sigquit-print-a-backtrace) ·
[Launch under job control](#launch-under-job-control) · [The capture script](#the-capture-script) ·
[Reading the dump](#reading-the-dump) · [Under swift test](#under-swift-test) ·
[Order of signals](#order-of-signals)

## Does SIGQUIT print a backtrace

Two answers, both measured.

1. **Yes, and the process survives.** With `SWIFT_BACKTRACE` unset or
   `enable=yes`, `kill -QUIT` prints `*** Signal 3: Backtracing from 0x... done ***`,
   then `*** Program crashed: Terminated ***` and every thread. The line
   `Thread 0 "app" crashed:` is the dump's label, not a crash. The process was
   still alive 8 seconds later and the harness had to send SIGKILL (exit 137).
   This is measured behaviour, not a documented guarantee, so re-run it at each
   toolchain bump. With `enable=no`, SIGQUIT keeps its default action and the
   process exits 131.
2. **Not if the process was started with a bare `&`.** A background child of a
   non-interactive shell inherits SIGINT and SIGQUIT as ignored. The runtime
   installs no handler for a signal that already has one or is ignored
   (Backtracing.rst, read 2026-10-10), so `kill -QUIT` and `kill -INT` do
   nothing and no dump appears.

## Launch under job control

`SigIgn` in `/proc/<pid>/status` is a bit mask. Bits for signals 2 and 3 make
the mask `0x6`. A dump is possible only when both bits are clear.

| Launch style | `SigIgn` of the child | Dump |
|---|---|---|
| `cmd &` | `0000000000000006` | none |
| `setsid cmd &` | `0000000000000006` | none |
| `nohup cmd &` | `0000000000000007` | none |
| `set -m` then `cmd &` | `0000000000000000` | yes |

Start the process under `set -m` in the same shell that launches it, and read
the mask before relying on the signal. If the operator's process is already
running with `0x6` set, the dump is unrecoverable for this run. Say so and
relaunch.

## The capture script

The script is step B3 of the skill (`set -m`, read `SigIgn`, `ps`, `kill -QUIT`,
`alive after QUIT`, the `Signal 3` grep). Add these two lines after it, before
the `kill -KILL`, to read the cause (rename the module):

```bash
grep -m1 -e '_dispatch_sema4_wait' -e 'pthread_cond_wait' -e 'futex_wait' hang.err
grep -m3 -e ' in app at ' hang.err
```

What each line prints on a blocked main actor, measured (watched red against the
same script launched with a bare `&`):

- `SigIgn:` shows `0000000000000000` under `set -m` and `0000000000000006` bare.
- `pcpu` of `0.0` and state `S` or `Sl`: no CPU, the process is waiting.
- `alive after QUIT` followed by the `Signal 3: Backtracing` line: the dump
  was written and the process survived. Bare `&` printed `alive after QUIT` and
  no `Signal 3` line, so alive alone proves nothing.
- A wait frame together with a frame `in app`: a thread of the program is
  parked. The wait frame alone is not enough, because the runtime's own idle
  threads can wait too. Leaked continuation printed no `in app` frame (watched
  red against the semaphore plant and green against the leak plant).

## Reading the dump

Read every thread, not only thread 0. All hangs below exited 124 under `timeout 5`.

| Hang | stderr during the hang | CPU at 2 s | In the dump |
|---|---|---|---|
| Leaked continuation | `SWIFT TASK CONTINUATION MISUSE: leak_() leaked its continuation without resuming it` | 0.0 | `sigsuspend` in the runtime, idle `DispatchWorker` threads, no frame of the program |
| Main actor blocked on a semaphore only a main-actor task can signal, called directly from `main` | none | 0.0 (`futex_do_wait`) | thread 0: `_dispatch_sema4_wait`, then `_dispatch_semaphore_wait_slow`, then `semaphore_() + 241 in app at main.swift` |
| The same block inside `Task { @MainActor in ... }` or from an async `main` | none | 0.0 | thread 0 is `_dispatch_sigsuspend` / `_dispatch_sig_thread` (the same as the leak). The blocked frames are in `Thread 1 "DispatchWorker"`: `_dispatch_sema4_wait`, then `semDead() + 249 in app2 at App.swift:5:9` |
| Spin | none | 98 | thread 0: `spin_() + 57 in app at main.swift` |

The route for exit 124, in order: the `leaked its continuation` line, then CPU at
or above 50 percent, then a `_dispatch_sema4_wait`, `pthread_cond_wait` or
`futex_wait` frame in any thread that also has a frame `in <your module>` below
it (the blocked main actor can run on a `DispatchWorker`, and thread 0 is then
the dispatch signal thread), else idle with no frame of your module in any
thread. Name the cause
as a mechanism, such as "the main actor waits on a `DispatchSemaphore` that only
a main-actor task can signal", never as "a deadlock".

## Under swift test

A hung test shows as `◇ Test hangsForever() started.` with no `passed` or
`failed` line in the live log, often beside the leak line (measured 6.4.0).
`timeout 60 swift test` killed the driver and left an empty log, so exit 124 is
the signal and the dump is the evidence.

Signal the test runner child, not the driver: `<Target>-test-runner` on 6.4.0
(the default `swiftbuild` build system) and `<pkg>PackageTests.xctest` on 6.3.3.
Find it with:

```sh
ps -eo pid,ppid,stat,pcpu,args
```

The runner is the child of `swift-test`. Launch the driver under `set -m` as a
background job with no `timeout`, send `kill -QUIT <runner pid>`, wait, then
`kill -KILL <runner pid>`. The runner survives the QUIT and the `swift test`
log stays empty (0 lines) until the runner exits; after the KILL it held the
`Signal 3: Backtracing` banner, `Thread 0 "LibTests-test-r" crashed:` and the
leak line, and the driver exited 1 (measured on 6.4.0).
A SIGQUIT sent to `swift-test` itself would dump the driver, which is the wrong
process (not measured, the run signalled the child). `timeout` kills the driver
only and the runner is not reaped: it kept running with ppid 1 (6.4.0) and
`pkPackageTests.xctest` was still alive 60 s later (6.3.3), with its output
pipe dead. A SIGQUIT sent to that orphan killed it 3 s later with no dump and an
empty log, so kill it (`pkill -f test-runner` or `pkill -f PackageTests.xctest`)
and relaunch without `timeout`. `swift test` has no
`--timeout` and no `--deadlock-detect` flag on 6.4.0 or 6.3.3 (`swift test --help`,
measured). Bound a test with `.timeLimit` (SW-TEST-13).

## Order of signals

1. `kill -QUIT` on the real process. Read every thread.
2. Reading heuristic, not measured: a second `kill -QUIT` after a few seconds
   shows whether the frames moved, which separates a spin from a stall.
3. `kill -KILL` last. A SIGKILL ends the process with no report and exit 137.

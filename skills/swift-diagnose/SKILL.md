---
name: swift-diagnose
description: 'Symptom-routed diagnosis of a Swift program or test that is already wrong, covering crashes routed by exit code plus first stderr line, hangs and deadlocks, a swift test that never finishes, data races, nondeterministic output, and expressions the type checker cannot solve. Use when someone reports "Illegal instruction", "exit code 132", exit 134, 137, 139, 141, 143 or 124, "Fatal error: Unexpectedly found nil", "Error raised at top level", "SWIFT TASK CONTINUATION MISUSE", "Program crashed:" with exit 0, "Segmentation fault", a crash with no backtrace, "ThreadSanitizer: data race", "Swift access race", a process that hangs, freezes, is stuck or deadlocks, a test that never finishes or times out in CI, a build that takes minutes, or "unable to type-check this expression in reasonable time". Not for Swift 6 concurrency migration (including its compile-time Sendable errors) or a toolchain bump (swift-upgrade), not for the coding standards (swift-quality), and not for cutting a release (swift-release).'
license: Apache-2.0
metadata:
  summary: Routes a failing Swift process by exit code plus first stderr line to the one measurement that names its cause, consent-gated, measured on Swift 6.4.0 and 6.3.3
  keywords: swift,diagnose,debugging,crash,exit-code,backtrace,swift-backtrace,sigquit,hang,deadlock,continuation,tsan,thread-sanitizer,data-race,swift-test,type-check
---

# swift-diagnose

A Swift process or test is already wrong: crashed, hung, racy or too slow to
compile. This skill routes the symptom to the one measurement that names the
cause. It carries the procedure only. The standards live in the `swift-quality`
rule, and this skill cites them by ID (SW-CORE-16 to SW-CORE-21 are its own
checks, and it routes to SW-CONC, SW-ERR, SW-CLI, SW-TEST, SW-LANG and
SW-GATE).

Every command was run on **Swift 6.4.0 and 6.3.3, Linux x86_64, on 2026-10-10**
(measured 2026-10-10). macOS, Xcode, Windows, the static Linux SDK and arm64 are
`unverified: read only`, and the steps that touch them say so. Commands that
read `/proc` are Linux only. Depth is in `references/` and each file is read
only when a step points to it.

Contents: [Consent first](#consent-first) · [Stop condition](#stop-condition) ·
[Never edit the check](#never-edit-the-check) · [Step 0: build identity](#step-0-build-identity) ·
[Route by exit code and first line](#route-by-exit-code-and-first-line) ·
[A. Crash](#a-crash) · [B. Hang](#b-hang) · [C. Race and flaky output](#c-race-and-flaky-output) ·
[D. Type-check failure or slow build](#d-type-check-failure-or-slow-build) ·
[The receipt](#the-receipt) · [MUST rows](#must-rows-this-procedure-surfaces) ·
[What agents get wrong](#what-agents-get-wrong)

| Read | When |
|---|---|
| [references/crash-signatures.md](references/crash-signatures.md) | A crash: exact first lines per exit code, release-build text, the exit-0 crash report |
| [references/hang-capture.md](references/hang-capture.md) | A hang: the `set -m` launch, `SigIgn`, reading the dump, the `swift test` runner |
| [references/backtrace-settings.md](references/backtrace-settings.md) | Empty stderr on a crash, or any `SWIFT_BACKTRACE` question |
| [references/typecheck.md](references/typecheck.md) | "unable to type-check", or a build that is slow with no error |

## Consent first

Touch only a process the operator has named as theirs to touch. For a
production process, get explicit consent in the moment, for that action. Absent
consent, print the command and its cost from this table and stop (SW-CORE-21).

| Action | Cost to the target | Measured |
|---|---|---|
| `kill -QUIT` with the backtracer on | The process prints every thread and **keeps running** | alive 8 s after the dump on 6.4.0 and 6.3.3 |
| `kill -QUIT` with `SWIFT_BACKTRACE=enable=no` | The default action runs and the process **dies** | exit 131 |
| `kill -KILL` | Destroys the process and its evidence | exit 137 |
| `kill -TERM` or `kill -INT` | Ends the process if it has no handler | exit 143 and 130 |
| Changing `SWIFT_BACKTRACE` | Needs a restart of the target | not applicable |
| A `--sanitize=thread` or `-c release` rebuild | A different binary, so a bug can move or vanish | see C |

Anything run on a test binary, a local build or a fixture needs no consent.
Prefer those. Sections A, C and D start there.

## Stop condition

Stop when all four hold, and do not keep measuring after.

1. The **root cause is named as a mechanism**. "The main actor waits on a
   `DispatchSemaphore` that only a main-actor task can signal" is a cause. "A
   deadlock" is a category.
2. The **measurement that proved it is pasted**: the command, the exit code and
   the verbatim first message line, or the dump frames.
3. Either the **fix was watched to clear the symptom** (the same measurement,
   before and after, both pasted), or the cause is a **named gap** with the
   toolchain version and the surface that would settle it.
4. Nothing outside the cause was changed to reach step 3.

## Never edit the check

Making the symptom disappear by changing the measurement is the failure this
skill exists to prevent (SW-CORE-17). Each of these is a violation, not a fix.

| Edit | Why it is a violation | Rule |
|---|---|---|
| `SWIFT_BACKTRACE=enable=no` in a Dockerfile, unit or CI file to quiet a crash | The exit code is unchanged. A segfault's 52-line report becomes 0 lines | SW-CORE-18, SW-CORE-01 |
| Raising `timeout`, `timeout-minutes` or a test limit so a hang finishes | The hang is still there. The timeout's kill is the evidence | SW-CORE-17, SW-TEST-13 |
| Adding `Task.sleep`, `Thread.sleep` or `usleep` so a race or hang stops reproducing | Changes the interleaving, not the defect | SW-CORE-17, SW-TEST-03 |
| Wrapping the failing call in `try?` | Swallows the error and its cause | SW-CORE-17, SW-ERR-11 |
| `nonisolated(unsafe)` or `@unchecked Sendable` to quiet TSan | The race stays. Only the report is gone | SW-CORE-17, SW-GATE-10 |
| Dropping the sanitizer leg, adding a TSan suppression, or removing `-warnings-as-errors` or `-warn-long-expression-type-checking` | The next run is green because the detector is gone | SW-CORE-17, SW-CORE-01, SW-GATE-12, SW-GATE-27 |
| `.disabled()` or `XCTSkip` on the hanging or crashing test | The test no longer runs | SW-CORE-01 |
| Casting a type-check failure into submission, or raising a solver limit | Buries the real error and the cost | SW-CORE-20, SW-LANG-07 |

If the only fix available is one of these, record it as a gap under stop
condition 3. Never apply it silently. Before reporting a fix, run
`BASE=<base ref> bash weaken-check.sh` and `silence-check.sh` from the
`swift-quality` rule's `checks/` directory (`.claude/rules/swift-quality/checks/`
in Claude Code) at the repository root. Stdout from either is a violation to
justify, and empty stdout with a passing canary (SW-CORE-03) is the pass. Judge by stdout
and exit status and keep stderr visible: a git `warning: unable to access
'.gitignore'` line (a symlinked ignore file) is noise, not a violation. The
two scripts catch sleeps, `try?`, `nonisolated(unsafe)`, `@unchecked Sendable`,
`as!`, a solver threshold, a bare `timeout N`, `enable=no`, `.disabled`,
`XCTSkip`, v5 language modes, suppression comments, `TSAN_OPTIONS` and `race:`
lines in a `.supp` file, a changed `timeout-minutes` and a removed
`-warnings-as-errors`, sanitizer or `-warn-long-expression-type-checking` line.
They do not catch a raised `.timeLimit`, a suppression file not named `*.supp`
or a cast other than `as!`, so read the fix diff for those. Also rerun Step 0's persisted `enable=no` grep on the
fixed tree: its carrier and value list (every `enable=` off spelling, `*Dockerfile*`,
`*Containerfile*`, `*.service`, `*.env`, `justfile`, `*.toml`, `*.json`, `Makefile`, `*.yml`, `*.sh`) is the one that decides
(SW-CORE-18), and output is a violation. Both mark untracked files
intent-to-add (`git add -N`), so run `git reset -q` afterwards.

## Step 0: build identity

Run before the first hypothesis. A debug build, a release build and a
sanitizer build are different programs, and every comparison below assumes like
with like.

```sh
swift --version
echo "SWIFT_BACKTRACE=${SWIFT_BACKTRACE:-unset}"
```

Record the build configuration (`debug` or `release`) beside them. In a
release build the trap message text moves (A step 1).

Then read what the live process was started with (Linux only). The read is
harmless to the process, but an environment can hold secrets, so print only the
line the grep selects:

```sh
PID=12345   # rename to the operator-named process
tr '\0' '\n' < "/proc/$PID/environ" | grep -e '^SWIFT_BACKTRACE='
```

Any output is the setting in force. Empty output means the variable is unset
and the Linux default applies (backtracer on). Measured: the line printed for a
process started with `enable=no` and nothing for one without. Then look for a
persisted `enable=no` (SW-CORE-18). Output is a violation and empty output is the
pass:

```sh
grep -rIn -E -e 'SWIFT_BACKTRACE[^#]*enable[=: "]*(no|false|off|0)\b' --include='*Dockerfile*' --include='*Containerfile*' --include='*.service' --include='*.yml' --include='*.yaml' --include='*.sh' --include='*akefile*' --include='*[Jj]ustfile' --include='*.mk' --include='*.rake' --include='*.toml' --include='*.json' --include='*.env' --include='.env*' --exclude-dir=.build --exclude-dir='.build-*' --exclude-dir=.git --exclude-dir=.claude --exclude-dir=.agents . | grep -v -E '^[^:]+:[0-9]+:[[:space:]]*#'
```

Measured 2026-10-10 on 6.4.0: `enable=false`, `off`, `0` and `no` each switch the
backtracer off (54 stderr lines became 13). The grep printed all 12 planted carriers
(`Dockerfile.ci`, `app.Dockerfile`, a Containerfile, a systemd line, `color=no,enable=no`
in CI, `justfile`, `mise.toml`, `prod.env`, `devcontainer.json`, a Makefile, `.env`) and
nothing for a `enable=yes,color=no` twin, a comment-only line or the installed
`.claude/` rule set (the old grep printed that set's own `weaken-check.sh` line, so it
could never pass), and exited 1 on a clean tree.

A per-command prefix inside a test that asserts a trap's exit code is the one
allowed use (SW-CONC-34, SW-CONC-26).

## Route by exit code and first line

Never route on the exit code alone (SW-CORE-16). 132 covers six causes, 134 two,
139 three and 124 four. Collect three facts first: the exit code, the first
non-empty stderr line, and for a hang the CPU and the SIGQUIT dump.

```sh
timeout 30 ./.build/debug/app args > stdout.txt 2> stderr.txt; echo "rc=$?"; grep -n -m4 -E 'Fatal error|Precondition failed|Program crashed|Swift runtime failure|Error raised|CONTINUATION|double free|corrupted|invalid pointer|malloc\(\)' stderr.txt
```

Rename the binary and arguments. Do not count lines: the message position varies
(measured 2026-10-10, 6.4.0, stderr redirected to a file). `Fatal error:`,
`Unexpectedly found nil` and `Precondition failed:` are line 1, before the
backtracer banner. `Swift runtime failure` is never a line of its own: it sits
inside frame 0 (line 10 for an arithmetic overflow, after a leading blank line,
the banner and the `Program crashed` line). The grep reaches all of them, and
prints nothing for a run with no message
(exit 130, 137, 141, 143, a hang). `timeout` returns 124 for any signal it sent,
so 124 means "timed out" and never "SIGTERM". To detect nondeterminism, run the
binary twice and diff the two `stdout.txt` files.

| Exit | Message (grep it, its line varies: line 1 for `Fatal error` and `Precondition failed`, frame 0 for `Swift runtime failure`), or state, contains | Cause | Go to |
|---|---|---|---|
| build | `unable to type-check this expression in reasonable time`, or a slow build | type-check | [D](#d-type-check-failure-or-slow-build) |
| 0 | `Program crashed:` | A trap on a non-main thread, and main exited normally before the crash turned fatal (seen when main waits in a libc `sleep` or `usleep` that the backtracer interrupts). Rerun the same input with `SWIFT_BACKTRACE=enable=no` as a per-command prefix and expect 132 | [A step 2](#a-crash), SW-CORE-16, SW-CONC-34 |
| 0 | nothing, and stdout differs between two runs | race suspect | [C](#c-race-and-flaky-output) |
| 1 | `exited with unexpected signal code 4` from `swift test` | the test runner crashed, so map the signal to 128 + n and route that code | [A step 5](#a-crash) |
| 1 | an ordinary reported error | not a crash | SW-CLI-01 |
| 66 | `ThreadSanitizer` | a TSan report, the default `exitcode` | [C](#c-race-and-flaky-output), SW-GATE-27 |
| 124 | `leaked its continuation` | continuation leak | [B](#b-hang), SW-CONC-22 |
| 124 | CPU at or above 50 percent | spin | [B](#b-hang) |
| 124 | a `_dispatch_sema4_wait`, `pthread_cond_wait` or `futex_wait` frame in any thread, with a frame `in <your module>` below it in the same thread | a blocked thread, semaphore or lock | [B](#b-hang), SW-CONC-15 |
| 124 | none of the above, idle, no frame of your module in any thread | lost wakeup or an unresumed continuation | [B](#b-hang), SW-CONC-22 |
| 130 | no message | SIGINT with no handler | SW-CLI-10, SW-CLI-11 |
| 131 | no dump | SIGQUIT while `enable=no` | [B](#b-hang) |
| 132 | `Precondition failed` or `precondition failure` | `precondition` | SW-ERR-14, SW-ERR-15 |
| 132 | `Unexpectedly found nil` | force unwrap | SW-ERR-05 |
| 132 | `Error raised at top level` | a throw out of an entry point | SW-CLI-02 |
| 132 | `tried to resume its continuation more than once` | double resume | SW-CONC-22 |
| 132 | `Swift runtime failure`, no `Fatal error` line | a runtime trap such as overflow | SW-ERR-14 |
| 132 | any other `Fatal error` | `fatalError` or an assertion | SW-ERR-15 |
| 132 | `Program crashed: Illegal instruction`, and neither `Fatal error` nor `Swift runtime failure` (a release stdlib trap such as an Array index) | a stdlib precondition | read the first user frame's `file:line`, SW-ERR-14 |
| 132 | no message line at all (stderr empty under `enable=no`); frame 0 of the original dump is `_dispatch_assert_queue_fail` | a closure inferred `@MainActor` run off the main thread (signal source, callback) | SW-CONC-34, SW-CONC-26 |
| 133 | no message | arm64 trap (`unverified: read only`) | SW-CORE-16 |
| 134 | `double free`, `corrupted`, `invalid pointer` or `malloc(): ` | heap corruption in C code or an unsafe continuation | SW-CONC-22 |
| 134 | none of those | `abort()` or an uncaught C++ exception | [A](#a-crash) |
| 137, 141, 143 | no message, no backtrace exists | SIGKILL, a closed reader, an unhandled SIGTERM | cause is outside the program, SW-CLI-08 |
| 139 | one frame repeated 20 or more times | stack overflow | SW-SEC-01 |
| 139 | `Bad pointer dereference at 0x0000000000000000`, frame 0 in C | null pointer in a C call | [A](#a-crash) |
| 139 | frame 0 is Swift code, no repeated frame, any address (`Bad pointer dereference at 0x0000000000000002`) | an unsafe pointer, a dangling pointer or a use after free | [A step 3](#a-crash), SW-SEC-06, SW-SEC-11 |

The 132, 134 and 139 rows were measured with `SWIFT_BACKTRACE` unset (the Linux
default). The exit code is the same under `enable=no` for a single-threaded
trap, and the exit-0 row is the exception. The route took the right branch 17
of 17 on both toolchains over planted failures, and 7 of 7 on a release build
(watched red, measured 2026-10-10). Exact first lines for each row are in
[references/crash-signatures.md](references/crash-signatures.md).

## A. Crash

1. **Read the first message line, not the code.** A debug trap prints
   `file:line: Fatal error: ...` or `Precondition failed: ...` first, before the
   `*** Signal n: Backtracing` banner, and names the trap site. **In a release build** the text moves: match
   `Swift runtime failure` and read frame 0's `file:line`, because the
   `precondition` message you wrote is gone and a search for `Fatal error:`
   finds nothing (measured 6.4.0). A release stdlib trap such as an Array index
   prints only `Program crashed: Illegal instruction` with neither text, so read
   frame 0's `file:line` (SW-ERR-14).
2. **Exit 0 with `Program crashed:` on stderr.** The trap was on a worker
   thread, and main exited normally before the crash turned fatal. Rerun with
   the per-command prefix and expect 132 (SW-CORE-16):
   ```sh
   SWIFT_BACKTRACE=enable=no ./.build/debug/app args; echo "rc=$?"
   ```
   Measured on 6.4.0 and 6.3.3: exit 0 with `Thread 2 "DispatchWorker" crashed:`
   under the default backtracer, exit 132 with the prefix. The 132 rerun can have
   empty stderr, so read the crashed thread's frames in the original stderr and
   route by the first line, or by frame 0 of the original dump when the rerun
   printed nothing (`_dispatch_assert_queue_fail` is the main-actor closure row).
   Main waiting in a libc `sleep` or `usleep` gives exit 0, because the
   backtracer's suspend signal interrupts the sleep and main returns early (the
   `survived` line prints far sooner than the sleep would take). Foundation
   `Thread.sleep` and `dispatchMain()` give 132 with no prefix in 10 of 11 runs,
   and one cold first run gave 0, so the exit-0 trigger is timing dependent: a
   run that exits 0 with `Program crashed:` takes this route whatever main was
   doing. Never persist the prefix (SW-CORE-18).
3. **Read the crashed thread.** Frame 0 gives `file:line`. A segfault with empty
   stderr means the backtracer was off, so check Step 0 and
   [references/backtrace-settings.md](references/backtrace-settings.md) before
   concluding there is nothing to read. A 139 whose frame 0 is Swift code with no
   repeated frame is an unsafe pointer, not a stack overflow and not a C null: rebuild
   with `swift build --sanitize=address`, rerun the same input and read the
   `AddressSanitizer:` line (measured 2026-10-10 on 6.4.0: a pointer from
   `bitPattern: 2` gave 139 and `SEGV on unknown address 0x000000000002`, and a
   dangling pointer after `deallocate()` gave exit 0 with garbage and
   `heap-use-after-free` under ASan).
4. **137, 141, 143 and 130 have no backtrace.** The program did not trap.
   Confirm the sender, such as an OOM kill, a closed pipe reader (SW-CLI-08) or
   an unhandled SIGTERM (SW-CLI-11), with
   [references/crash-signatures.md](references/crash-signatures.md).
5. **A crash under `swift test`** exits 1 and names the runner and the signal.
   Map the signal `n` to `128 + n` (4 is 132). Reproduce with
   `swift test --filter` on the one test, then route as above.
6. **Fix by the row's rule.** Input from outside the process is validated by
   throwing, never by a trap (SW-ERR-14). Re-run the same input, and paste the
   exit code and first line before and after. A documented trap keeps a test
   (SW-ERR-19).

## B. Hang

Order: the free reports first, then the dump, and only then anything that
needs a rebuild.

1. **The runtime already reported it.** `SWIFT TASK CONTINUATION MISUSE: f()
   leaked its continuation without resuming it` on stderr during a hang names a
   continuation that was dropped (SW-CONC-22).
2. **A test that never finishes.** Bound it and note the exit:
   ```sh
   timeout 60 swift test --filter MyTests.hangsForever; echo "rc=$?"
   ```
   Exit 124 is the hang signal (SW-CONC-22, SW-TEST-13), and the twin test that
   finishes exited 0. A `timeout`-killed driver left an empty log and **orphans
   the runner**, which keeps running with its output pipe dead (measured on
   6.4.0 and 6.3.3). Kill it (`pkill -f test-runner` on 6.4.0, `pkill -f
   PackageTests.xctest` on 6.3.3) and capture with step 4. Never send SIGQUIT to
   the orphan: it dies with no dump. The evidence comes from step 4. `swift test`
   has no `--timeout` or `--deadlock-detect` flag (`swift test --help`, measured
   on 6.4.0 and 6.3.3).
3. **A live process (consent first).** Launch it under job control and confirm
   the signal mask before sending anything (SW-CORE-18). A bare `&` leaves
   SIGINT and SIGQUIT ignored, and the dump never comes:
   ```bash
   set -m   # job control: a bare & leaves SIGINT and SIGQUIT ignored
   ./.build/debug/app hang-case 2> hang.err > /dev/null &
   PID=$!
   sleep 2
   grep -e SigIgn "/proc/$PID/status"
   ps -o pcpu=,stat= -p "$PID"
   kill -QUIT "$PID"
   sleep 1
   kill -0 "$PID" && echo "alive after QUIT"
   grep -m1 -e 'Signal 3: Backtracing' hang.err
   ```
   `SigIgn` must read `0000000000000000`. `0000000000000006` (bare `&` and
   `setsid`) or `0000000000000007` (`nohup`) means no dump is possible.
   Measured: `set -m` printed the dump, `alive after QUIT` and a
   `_dispatch_sema4_wait` frame, and the bare launch printed `alive after QUIT`
   with no `Signal 3` line. Alive alone proves nothing.
4. **Under `swift test`, signal the runner, not the driver.** Launch
   `swift test --filter X > t.log 2>&1 &` under `set -m` with no `timeout`.
   Find the runner with `ps -eo pid,ppid,stat,pcpu,args`: `<Target>-test-runner`
   on 6.4.0 and `<pkg>PackageTests.xctest` on 6.3.3, a child of `swift-test`.
   Confirm `SigIgn`, `kill -QUIT` the runner, wait, then `kill -KILL` the runner.
   The runner survives the QUIT and the dump reaches `t.log` only after the
   runner exits (measured: 0 lines before the KILL, 67 after, with `Signal 3:
   Backtracing` and `Thread 0 "LibTests-test-r" crashed:`).
5. **Read every thread and the CPU.** Branch in the order of the route table:
   the leak line, then CPU at or above 50 percent (spin), then a
   `_dispatch_sema4_wait`, `pthread_cond_wait` or `futex_wait` frame in any
   thread that also has a frame `in <your module>` below it (a blocked thread,
   SW-CONC-15), else no frame of your module in any thread (a lost wakeup,
   SW-CONC-22). A blocked main actor can run on a `DispatchWorker`, and thread 0
   is then the dispatch signal thread. The dumps are in
   [references/hang-capture.md](references/hang-capture.md).
6. **`kill -KILL` last**, after the dump is saved (for a live process). Exit 131
   on a QUIT means the backtracer is off, so go back to Step 0.
7. **Fix the mechanism and re-run.** A blocked main actor waits with `await`,
   never a semaphore (SW-CONC-15). Every continuation resumes exactly once on
   every path (SW-CONC-22). Paste the same `timeout` run, red then green.

## C. Race and flaky output

1. **Suspect a race on exit 0 with output that differs between runs.** Run the
   binary five times and compare:
   ```bash
   for i in 1 2 3 4 5; do ./.build/debug/app race-case; done
   ```
   Measured: an unguarded counter printed five different totals, and a correct
   `Mutex` counter printed `count=200000` five times.
2. **Build with the thread sanitizer** (a different binary, so no consent is
   needed for a local build). In Docker the default seccomp profile breaks
   TSan, so add `--security-opt seccomp=unconfined` (SW-TEST-17), run as your user
   (`-u "$(id -u):$(id -g)"`) and pass `--scratch-path /tmp/tsan` to the build (the binary is then `/tmp/tsan/debug/app`): a root
   build in the mounted tree leaves a root-owned `.build` the host build then refuses:
   ```bash
   swift build --sanitize=thread --scratch-path /tmp/tsan
   /tmp/tsan/debug/app race-case 2> tsan.err; echo "rc=$?"
   grep -c -e 'ThreadSanitizer: data race' tsan.err
   grep -c -e 'ThreadSanitizer: Swift access race' tsan.err
   ```
   TSan exits 66 by default on a report, and `swift test --sanitize=thread`
   exits 1 instead (SW-TEST-17).
3. **Read the report kind first** (SW-CORE-19):

   | Seen | Meaning |
   |---|---|
   | `ThreadSanitizer: data race` at least once | a race. Read both stacks |
   | only `Swift access race`, on a `Mutex`-guarded type | the known false positive. Confirm with the five-run totals |
   | five plain runs with one exact total | consistent with the false positive |
   | five plain runs with varying totals | a race, whatever TSan printed |

   Measured on 6.4.0 and 6.3.3: the racy counter gave `data race` 2, `Swift
   access race` 4 and exit 66, with five different totals. The correct `Mutex`
   counter gave `data race` 0, `Swift access race` 2, exit 66, and
   `count=200000` five times. The CI job gates on the `data race` kind only and
   writes no suppressions (SW-GATE-27). A deterministic count assertion backs
   every hatch-guarded type (SW-CONC-27).
4. **A flaky test** follows SW-TEST-14 in order: `swift test --no-parallel`,
   then `swift test --filter MyTests --repeat-until fail --maximum-repetitions 100`
   on 6.4. `--repeat-until` is absent from `swift test --help` on 6.3.3
   (measured), so use a parameterized repeat there. Fix the isolation and never
   commit the flag. `--repeat-until` and `--disable-xctest` act on Swift Testing
   only (SW-TEST-14, SW-TEST-17). On an XCTest suite the first exits 0 after one
   execution (a test that fails every third run, repeated 20 times, exit 0 and a
   counter of 1) and the second exits 0 with `Test run with 0 tests`, so loop in the
   shell, `for i in $(seq 1 100); do swift test --filter MyTests >/dev/null 2>&1 || { echo "failed on run $i"; break; }; done`
   (it stopped on run 3 on that test), read the executed count, and for ASan use
   `ASAN_OPTIONS=detect_leaks=0 swift test --sanitize=address`, which also skips a
   leak inside a dependency. 0 tests run is not a pass.
5. **Fix by ownership**, not by timing (SW-CONC-02, SW-TEST-03), then re-run the
   same build with the same counts and paste both readings.

## D. Type-check failure or slow build

Depth and the measured numbers are in
[references/typecheck.md](references/typecheck.md).

1. **On `unable to type-check this expression in reasonable time`, split the
   expression** into typed `let` bindings and read the first real error before
   changing anything else (SW-CORE-20). Measured: the message hid a `Double`
   plus `Float` mismatch that the split named in 74 ms (`swiftc -typecheck`, one file).
2. **A slow build with no error.** Name the expressions over budget. The first
   command warns and exits 0, and the second exits 1 on a violation:
   ```sh
   swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200
   swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200 -Xswiftc -warnings-as-errors
   ```
   The gate and its limit of 200 are SW-LANG-07. Measured: a five-row
   dictionary-literal array whose rows hold a value expression such as
   `0.5 * 2` reported `expression took 429ms to type-check (limit: 200ms)`,
   and the annotated twin built clean (plant in the reference).
3. **Fix by structure.** Annotate a type, bind sub-expressions, or use a struct.
   Never raise a solver limit. In a manifest these flags are `unsafeFlags`,
   which only a root package may use (SW-PKG-04).

## The receipt

Every run ends with this, success or not (SW-CORE-21). Write six blocks in
order.

1. **Symptom**, one line, in the reporter's words.
2. **Build identity**, Step 0's output pasted, with the configuration.
3. **Root cause**, the mechanism, with the toolchain version it holds on.
4. **Evidence**, the command and its verbatim output: the exit code, the first
   message line, the dump frames. Two readings when a fix was applied.
5. **Fix, or gap**: the change and the rule ID it satisfies, or the named gap
   with the surface that would settle it.
6. **Rule IDs relied on**, every one. A diagnosis citing none either found
   something new, and says so, or skipped the standard that already covered it.

## MUST rows this procedure surfaces

Restated as findings so a diagnosis run without the rule loaded still reports
them with the right ID. The rule text and full verification live in the
`swift-quality` rule.

| # | Finding | Rule |
|---|---|---|
| 1 | A failure was routed on its exit code alone | SW-CORE-16 |
| 2 | A fix stopped the symptom by changing the measurement | SW-CORE-17 |
| 3 | A gate was turned green by weakening it, with no written justification | SW-CORE-01 |
| 4 | A new check was relied on before a plant and a twin were run | SW-CORE-02 |
| 5 | An empty grep result was trusted with no canary | SW-CORE-03 |
| 6 | Input from outside the process is guarded by `precondition`, `assert` or `fatalError` | SW-ERR-14 |
| 7 | Non-test code contains a force unwrap, `try!` or `as!` | SW-ERR-05 |
| 8 | Code blocks a cooperative-pool thread or the main actor | SW-CONC-15 |
| 9 | A continuation can be resumed twice, or never | SW-CONC-22 |
| 10 | A signal source handler is written in `main.swift` or inside a `@MainActor` scope | SW-CONC-34 |
| 11 | An entry point lets an error escape uncaught | SW-CLI-02 |

## What agents get wrong

1. **Routing a crash on the exit code.** 132 is not "precondition".
2. **Looking for `Fatal error:` in a release binary.** Match
   `Swift runtime failure` and read frame 0.
3. **Reading exit 0 as "no crash".** A worker-thread trap can exit 0 with
   `Program crashed:` on stderr.
4. **Calling a race from a `Swift access race` report on `Mutex` code**, or
   calling none because a plain run exited 0.
5. **Waiting for a deadlock report.** The runtime prints none for a blocked
   main actor. Send SIGQUIT to a process launched under `set -m`.

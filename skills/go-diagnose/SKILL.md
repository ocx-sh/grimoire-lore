---
name: go-diagnose
description: Symptom-routed diagnosis procedure for a Go process or test that is already wrong, covering hangs and deadlocks, a test that never finishes, a Wait that blocks after the child exited, rising goroutine counts, leaked child processes, data races, CPU hotspots, stalls with no CPU, lock contention, memory growth, GC pressure, wrong GOMAXPROCS in a container, and any claim that code got faster. Use when someone says the Go program hangs, is stuck, deadlocked, leaks goroutines, goleak failed, goroutine count keeps growing, zombie processes pile up, DATA RACE, flaky under -race, it is slow, CPU is pegged, latency spikes while idle, memory keeps rising, OOM, too many allocations, GC is thrashing, it only uses one core in the container, or this change is X% faster. Not for writing the code standards, which the go-quality rule carries, and not for bumping the toolchain, which is go-upgrade.
license: Apache-2.0
metadata:
  summary: Routes a wrong Go process by symptom to the one measurement that names its cause, consent-gated, measured on Go 1.27.1
  keywords: go,golang,diagnose,debugging,hang,deadlock,sigquit,gotraceback,goroutine-leak,goleak,goroutineleak,pprof,cpu-profile,heap-profile,block-profile,mutex-profile,trace,flight-recorder,race,gorace,godebug,execwait,gctrace,schedtrace,gomaxprocs,benchstat,pgo,zombie
---

# go-diagnose

A Go process or test is already wrong: hung, leaking, racy, slow or growing.
This skill routes the symptom to the one measurement that names the cause.

Every command below was run on **Go 1.27.1, linux/amd64, on 2026-09-26**, with
goleak v1.3.0 and benchstat from `golang.org/x/perf` (2026-09-08 pseudo-version).
Where a feature has a floor, the step names it. Commands that read `/proc` or
call `ps` are Linux-only and say so. This skill carries the procedure only. It
never restates a standard. It cites the `go-quality` rule by ID (GO-OBS,
GO-CONC, GO-IO, GO-TEST, GO-GATE, GO-MOD), and the index's routing table says
which depth file owns each family.

Contents: [Consent first](#consent-first) · [Stop condition](#stop-condition) ·
[Never edit the check](#never-edit-the-check) ·
[Step 0: build identity](#step-0-build-identity) ·
[Route by symptom](#route-by-symptom) · [A. Hang](#a-hang) ·
[B. Goroutine leak](#b-goroutine-leak) ·
[C. Leaked child process](#c-leaked-child-process) ·
[D. Data race](#d-data-race) · [E. Slow and burning CPU](#e-slow-and-burning-cpu) ·
[F. Slow but idle](#f-slow-but-idle) · [G. Memory and GC](#g-memory-and-gc) ·
[H. A performance claim](#h-a-performance-claim) ·
[I. Wrong CPU count](#i-wrong-cpu-count) · [Last resort](#last-resort) ·
[The receipt](#the-receipt) · [MUST rows](#must-rows-this-procedure-surfaces) ·
[What agents get wrong](#what-agents-get-wrong)

## Consent first

Touch only a process the operator has named as theirs to touch. For a
production process, get explicit consent in the moment, for that action. Absent
consent, print the command and its cost from this table and stop (GO-OBS-14).

| Action | Cost to the target | Measured |
|---|---|---|
| `kill -QUIT` | The process prints its stacks and **exits** | exit 2 after the dump |
| CPU profile over HTTP (`/debug/pprof/profile`) | Samples the live process for the whole window | 1 s window returned a `Type: cpu` profile |
| Heap snapshot with `?gc=1` | Forces a full GC on the live process | ran on a loopback fixture |
| A `-race`, `-cover` or `-gcflags=all=-N -l` rebuild | A different binary. `-N -l` also raises allocation counts (GO-OBS-19) | see D and G |
| `GOTRACEBACK=crash` | Aborts with SIGABRT and writes a core that may hold secrets | exit 134 |
| Delve attach | Stops the scheduler while attached | not run here |

Anything you run on a test binary, a local build or a fixture needs no consent.
Prefer those. Most sections below start there for that reason.

## Stop condition

Stop when all four hold, and do not keep measuring after.

1. The **root cause is named as a mechanism**. "Two goroutines take `a` and `b`
   in opposite order" is a cause. "A concurrency problem" is a category.
2. The **measurement that proved it is pasted** into the report, command and
   verbatim output. Narrating a measurement is not making one.
3. Either the **fix was watched to clear the symptom** (the same measurement,
   before and after, both pasted), or the cause is a **named gap** with the Go
   version and the surface that would settle it.
4. Nothing outside the cause was changed to reach step 3.

## Never edit the check

Making the symptom disappear by weakening what detected it is the failure this
skill exists to prevent. Each of these is a violation, not a fix.

| Edit | Why it is a violation | Rule |
|---|---|---|
| Deleting `goleak.VerifyTestMain`, or adding a broad `goleak.IgnoreTopFunction`, to turn a leak report green | The goroutine still runs forever. Only the report is gone | GO-CONC-11, GO-CONC-10 |
| Swapping goleak for `synctest`, the `goroutineleak` profile or a hand-rolled `runtime.Stack` diff | Each caught 1 of 3 planted leak shapes, or false-reds on compliant `signal.NotifyContext` code | GO-CONC-11 |
| Dropping `-race`, lowering `-count`, or running the race job with `CGO_ENABLED=0` | Under `CGO_ENABLED=0` the job exits 2 before any test runs, and one green run proves nothing | GO-OBS-11, GO-GATE-04 |
| Adding a `time.Sleep` so a race or leak stops reproducing | Changes the interleaving, not the defect | GO-CONC-09, GO-TEST-11 |
| Raising `go test -timeout` so a hanging test finishes | The test still hangs. The timeout's dump is the evidence | GO-CONC-10 |
| Wrapping goroutines in a blanket `recover` so the crash stops | Swallows an invariant bug and its stack | GO-CONC-16 |
| Setting `GOMEMLIMIT` or `GOGC` in a CLI or a library to stop an OOM | Turns a fast OOM into a slow GC-thrash hang | GO-OBS-09 |
| Baking `GODEBUG=execwait=2` into a Dockerfile, unit or launcher | It panics the process in production | GO-OBS-07 |
| `signal.Notify(c)` with no signal list so SIGQUIT stops killing the process | The goroutine dump is gone, and the process exits 0 | GO-OBS-08 |

If the only fix available is one of these, record it as a gap under stop
condition 3. Never apply it silently.

## Step 0: build identity

Run before the first hypothesis (GO-OBS-22). A binary built with a different
experiment, PGO profile or `go` line is a different program, and every
comparison below assumes like with like.

```sh
BIN=./bin/app   # rename to the binary under diagnosis
go version "$BIN"
go version -m "$BIN" | grep -e 'GOEXPERIMENT=' -e 'DefaultGODEBUG=' -e '-pgo='
```

Reading, measured on go1.27.1:
- A `-X:` suffix on the first line (`go1.27.1-X:nogreenteagc`) means a
  non-default experiment. It pairs with a `build GOEXPERIMENT=` line.
- A `DefaultGODEBUG=` line means the main module's `go` line is older than the
  toolchain, so older runtime defaults apply. `containermaxprocs=0` in it is
  section I.
- A `build -pgo=` line means a PGO build (GO-OBS-20).
- **Empty output from the second command is the clean case**: default
  experiments, no older defaults, no PGO.

Then read what the live process was started with (Linux only). The read is
harmless to the process, but an environment can hold secrets, so print only
the lines the grep selects:

```sh
PID=12345   # rename to the operator-named process
tr '\0' '\n' < "/proc/$PID/environ" | grep -e '^GODEBUG=' -e '^GOMAXPROCS=' -e '^GOGC=' -e '^GOMEMLIMIT=' -e '^GOTRACEBACK=' -e '^GOEXPERIMENT='
```

Any output names a runtime knob that changes what the measurements mean. Empty
output means the process runs on defaults.

## Route by symptom

| The symptom, in the reporter's words | Go to |
|---|---|
| "it hangs", "it's stuck", "the test never finishes", "all goroutines are asleep", "stuck after the child exited" | [A](#a-hang) |
| "goroutine count keeps growing", "goleak failed", "found unexpected goroutines" | [B](#b-goroutine-leak) |
| "zombie processes", "leaked without a call to Wait", "children pile up" | [C](#c-leaked-child-process) |
| "DATA RACE", "flaky under -race", "fails only with `-count`", "wrong value sometimes" | [D](#d-data-race) |
| "it's slow and CPU is pegged" | [E](#e-slow-and-burning-cpu) |
| "latency spikes while idle", "slow but not busy", "lock contention" | [F](#f-slow-but-idle) |
| "memory keeps rising", "OOM", "too many allocations", "GC is thrashing" | [G](#g-memory-and-gc) |
| "this is X% faster", "this regressed", "should we turn on PGO" | [H](#h-a-performance-claim) |
| "it only uses one core in the container", "GOMAXPROCS looks wrong" | [I](#i-wrong-cpu-count) |

A rising goroutine count also grows memory. Run B before G when both appear.

## A. Hang

Order: the free reports first, then the dump, then anything that needs a
rebuild (GO-OBS-10).

1. **The runtime already reported it.** `fatal error: all goroutines are asleep - deadlock!`
   with exit 2 and a dump is self-diagnosed. Read the dump in step 4. This
   report fires only when **every** goroutine is blocked, so a process with a
   ticker or an accept loop never produces it. Do not wait for it.
2. **A test that never finishes.** Re-run it with a short timeout. The default
   is 10 minutes.
   ```sh
   go test -count=1 -timeout=30s -run 'TestHangs' ./pkg/   # rename test and package
   ```
   Measured: `panic: test timed out after 30s`, then `running tests:` naming the
   test, then every goroutine's stack, exit 1. The compliant twin printed `ok`.
   Save the output as `quit.txt` and go to step 4.
3. **A live process (consent first).** Send SIGQUIT. The dump goes to the
   **target's** stderr (its terminal, log file or journal), not to `kill`.
   ```sh
   PID=12345   # rename
   kill -QUIT "$PID"
   ```
   On go1.27.1 the SIGQUIT dump holds every goroutine, runtime ones included,
   and the process exits 2. **No dump and exit 0** means the program subscribes
   to every signal with `signal.Notify(c)` and no list. That is itself the
   finding (GO-OBS-08, GO-CLI-08), and the dump is unrecoverable for this run.
4. **Tally the dump.**
   ```sh
   sed -n -e 's/^goroutine .*\[\([^],]*\).*/\1/p' quit.txt | sort | uniq -c | sort -rn
   grep -e '^created by ' quit.txt | sort | uniq -c | sort -rn
   ```
   A blocked state (`sync.Mutex.Lock`, `sync.RWMutex.Lock`, `chan receive`,
   `chan send`, `select`) with a count of 2 or more, whose goroutines share a
   `created by` line, is the cycle signature: read those stacks for the
   opposite acquisition order. Measured: the lock-order inversion tallied
   `2 sync.Mutex.Lock` and `2 created by main.main`, and the one-order twin had
   no `sync.Mutex.Lock` line. Ignore `created by runtime.` lines, which are the
   runtime's own workers. Many goroutines in one `chan receive` inside a loop's
   closure are a fan-out question (GO-CONC-13, GO-CONC-15).
5. **Stuck in `Wait` after the child exited.**
   ```sh
   grep -n -F -e 'os/exec.(*Cmd).awaitGoroutines' quit.txt
   ```
   A hit is the finding: `Wait` is blocked because a grandchild inherited the
   child's output pipe. Empty output means this is not the cause. Measured: with
   no `WaitDelay` the process stayed blocked, and the dump showed
   `awaitGoroutines` under `(*Cmd).Wait` plus an `[IO wait]` goroutine in
   `writerDescriptor`. With `WaitDelay = 200ms` it returned after 200 ms with
   `exec: WaitDelay expired before I/O complete`. The fix is GO-IO-07, and the
   grandchild itself is GO-IO-14's group sweep.

## B. Goroutine leak

1. **In a test, the gate is goleak** (GO-CONC-11).
   ```sh
   go test -count=1 ./pkg/   # rename. Its TestMain calls goleak.VerifyTestMain(m)
   ```
   Measured: `goleak: Errors on successful test run: found unexpected goroutines:`
   naming the leaked goroutine's top function, exit 1. The joined twin printed
   `ok`, exit 0. A package that starts goroutines and has no such `TestMain` is
   the gap to close first (GO-CONC-11's coverage check).
2. **In a live process**, read two profiles from its operator-only pprof
   listener. That listener exists only if the binary registered the handlers
   explicitly (GO-OBS-05). Never blank-import `net/http/pprof` to get one.
   ```sh
   ADDR=127.0.0.1:6060   # rename to the operator-only pprof listener
   curl -s "http://$ADDR/debug/pprof/goroutine?debug=1" | head -1
   curl -s "http://$ADDR/debug/pprof/goroutineleak?debug=1" | head -3
   ```
   Sample both twice, minutes apart, under the same load. A rising
   `goroutine profile: total N` is growth. `goroutineleak profile: total N`
   above 0 names the leaked stacks. **A total of 0 means "none found", never
   "no leak"** (GO-OBS-12). Measured: five goroutines parked on unreachable
   channels read `goroutineleak profile: total 5`, while five parked on a
   package-level channel read `total 0` with `goroutine profile: total 8`.
   The `goroutineleak` profile needs a Go 1.27 toolchain. The binary's `go`
   line does not gate it.
3. **Without a listener**, the SIGQUIT tally of section A step 4 is the only
   view, and it ends the process.
4. **Confirm in a test with goleak**, then fix the owner and join
   (GO-CONC-10). Re-run step 1 and paste both readings.

## C. Leaked child process

1. **Live (Linux, procps).**
   ```sh
   PID=12345   # rename to the parent process
   ps -o pid=,stat=,comm= --ppid "$PID"
   ```
   A `STAT` starting with `Z` is a child that exited and was never `Wait`ed:
   the finding. Measured: the un-waited twin showed `ZN true`, and the waited
   twin printed nothing, exit 1. Empty output means no children at all.
2. **In a test**, `GODEBUG=execwait=2` panics on a leaked `exec.Cmd` built with
   `exec.Command` (GO-TEST-12). It is diagnosis or CI only, never a baked-in
   setting (GO-OBS-07).
   ```sh
   GODEBUG=execwait=2 go test -count=1 ./...
   ```
   The finding is `GODEBUG=execwait=2 detected a leaked exec.Cmd created by:`
   plus the creating stack, then
   `panic: exec: Cmd started a Process but leaked without a call to Wait`.
   **Silence is not a pass.** Measured on go1.27.1, it has two blind spots:
   - It fires from a finalizer, so only if a GC collects the `Cmd` before the
     test binary exits. A short test exits green.
   - It never fires for a `Cmd` from `exec.CommandContext`, the shape GO-IO-01
     requires: that constructor's default `Cancel` closure refers back to the
     `Cmd`, so the finalizer never runs. A custom `Cancel` that refers to the
     `Cmd` stayed silent too. The same leak with a `Cancel` that does not refer
     to the `Cmd` panicked.
   For the `CommandContext` shape, read every `Start` for its `Wait`. GO-IO-13's
   single spawn point makes that one site.

## D. Data race

1. **Reproduce with repetition, stop at the first report** (GO-OBS-11).
   `-race` needs cgo (GO-GATE-04).
   ```sh
   CGO_ENABLED=1 GORACE=halt_on_error=1 go test -race -count=20 -run 'TestCounter' ./pkg/   # rename
   ```
   A `WARNING: DATA RACE` block and exit 1 is the finding. Measured: the
   unguarded counter passed plain `go test` (exit 0) and failed here with one
   report (exit 1). The mutex twin passed, exit 0. All 20 green means "no race
   in the interleavings seen", not race-free.
2. **Run `go vet ./...` as its own step** (GO-GATE-02). `-race` misses shapes
   vet catches: `wg.Add` inside the goroutine (GO-CONC-07), a copied lock
   (GO-CONC-08), and `t.Fatal` from a spawned goroutine (GO-TEST-01). Any vet
   output is a finding. Empty output is the pass for these three only.
3. **Read what no tool sees**: `t.FailNow` inside a `wg.Go` or `errgroup.Go`
   closure (GO-TEST-01), and each `close(` against its sender barrier
   (GO-CONC-15).
4. **Fix by ownership** (GO-CONC-09, GO-TEST-09), then re-run step 1 with the
   same `-count` and paste both readings.

## E. Slow and burning CPU

Profile before touching code. The order of work is do less, do it less often,
then do it faster (GO-OBS-15).

1. **From a benchmark or test** (no consent needed):
   ```sh
   go test -run='^$' -bench='BenchmarkFib' -cpuprofile=cpu.pprof ./pkg/   # rename
   go tool pprof -top -nodecount=10 cpu.pprof
   go tool pprof -list='slowFib' cpu.pprof   # rename to the top flat function
   ```
   `-top` ranks by `flat`: the first row is where the time is spent. `-list`
   annotates its source lines. Measured: `slowFib` at 99.18% flat, and `-list`
   named the recursive line. On go1.27.1 the profile is self-contained, so no
   binary argument is needed.
2. **From a live process (consent first)**, with `pprof.Profile` registered on
   the operator-only mux (GO-OBS-05):
   ```sh
   curl -s -o cpu.pprof "http://$ADDR/debug/pprof/profile?seconds=30"
   ```
   Then read it as in step 1. `Total samples = 0` means the process was idle in
   the window, which is section F, not E.
3. **Carry the result to H** before claiming anything got faster.

## F. Slow but idle

A parked goroutine leaves no CPU sample. Measure the waiting instead.

1. **Contention, from a test:**
   ```sh
   go test -count=1 -blockprofile=block.pprof -mutexprofile=mutex.pprof ./pkg/   # rename
   go tool pprof -top -cum block.pprof
   go tool pprof -top -cum mutex.pprof
   ```
   The block profile charges the time to the **waiter** (`sync.(*Mutex).Lock`,
   `runtime.chanrecv1`). The mutex profile charges it to the **holder's**
   `Unlock`, and `-cum` shows the user function that held the lock. Measured:
   8 goroutines contending one lock read 1490 ms (block) and 1.14 s (mutex).
   The same test without the sleep under the lock read 37.58 µs and 0.
   `go test` turns both profiles on when the flags are given.
2. **Contention, live:** the `/debug/pprof/block` and `/debug/pprof/mutex`
   endpoints record nothing unless the binary called
   `runtime.SetBlockProfileRate` and `runtime.SetMutexProfileFraction`.
   Measured: a header with no sample lines, and `sampling period=0` on the mutex
   profile. **Read that as "not recording", never as "no contention".**
3. **A stall with no CPU and no contention:** a trace (GO-OBS-13). In a test,
   `go test -trace=trace.out`. In a live process, only a binary that already
   runs `runtime/trace.FlightRecorder` (Go 1.25) can snapshot the stall when it
   is detected.
   ```sh
   go tool trace -d=parsed stall.trace | grep -e 'Running->Waiting'
   ```
   Each row's `Reason=` (`"chan receive"`, `"sleep"`, `"sync"`) names why a
   goroutine stopped running. `go tool trace stall.trace` opens the same data in
   a browser. Measured: the 300 ms injected stall appeared as
   `Running->Waiting Reason="chan receive"`.
4. **CPU starvation:** `GODEBUG=schedtrace=1000` prints one `SCHED` line per
   second to stderr with `gomaxprocs=`, `idleprocs=` and `runqueue=`. Reading
   heuristic, not a measured threshold: a `runqueue` that stays above zero
   while `idleprocs=0` is a process short of CPU. Check section I next.

## G. Memory and GC

1. **Live growth (consent first):** diff two heap snapshots, each taken after a
   forced GC.
   ```sh
   curl -s -o heap1.pprof "http://$ADDR/debug/pprof/heap?gc=1"
   sleep 60
   curl -s -o heap2.pprof "http://$ADDR/debug/pprof/heap?gc=1"
   go tool pprof -sample_index=inuse_space -top -diff_base=heap1.pprof heap2.pprof
   ```
   The top `flat` row is what grew. Measured: a cache appended to every 10 ms
   topped the diff at 11438 kB. Without `?gc=1` the same function was 20% of
   the diff behind `runtime.mallocgc`, because each snapshot reflects the last
   completed GC.
2. **Allocation rate, from a benchmark:**
   ```sh
   go test -run='^$' -bench='BenchmarkJoin' -benchmem -memprofile=mem.pprof ./pkg/   # rename
   go tool pprof -sample_index=alloc_space -top mem.pprof
   ```
   `allocs/op` is the fact. `-gcflags=-m` saying `does not escape` is a hint
   about where to look, never proof of zero allocations (GO-OBS-16). Measured:
   the `+=` join read `199 allocs/op`, and the profile named `joinPlus`. A
   function whose allocation count is a contract gets an `AllocsPerRun` guard
   (GO-OBS-19).
3. **GC pressure:** run with `GODEBUG=gctrace=1`. Each collection prints
   `gc N @Ts P%: … A->B->C MB, D MB goal` to stderr. `P%` is the GC's share of
   CPU since start, and `C` is the live heap after the collection. A `C` that
   rises across lines is retention: go to step 1. Tune `GOGC` or `GOMEMLIMIT`
   only in a long-lived service's `main`, never in a CLI or a library
   (GO-OBS-09).

## H. A performance claim

No claim without a `benchstat` table (GO-TEST-20).

1. **Same build identity on both sides** (Step 0, GO-OBS-22).
2. **Same package path, before and after.** Run the baseline from a clean
   checkout of the base commit, then the change, at the same import path:
   ```sh
   go test -run='^$' -bench='BenchmarkJoin' -benchmem -count=10 ./pkg/ > before.txt   # rename
   go test -run='^$' -bench='BenchmarkJoin' -benchmem -count=10 ./pkg/ > after.txt
   benchstat before.txt after.txt
   ```
   Quote the delta and its p-value. `~` means no detectable difference.
   Measured: `-94.66% (p=0.000 n=10)` for the `strings.Builder` rewrite, and
   `~ (p=1.000 n=10)` for a file against itself. **Two different package paths
   produce two separate tables with no `vs base` column**, which is not a
   comparison.
3. New benchmarks use `for b.Loop()` (Go 1.24). Never rewrite an existing
   `b.N` benchmark mechanically (GO-TEST-19).
4. **PGO:** `go version -m "$BIN" | grep -e '-pgo='`. A line means the profile
   was applied, and empty output means it was not. A PGO win needs the same
   benchstat on the target binary's workload, `-pgo=off` against the profile
   (GO-OBS-20, GO-OBS-21).

## I. Wrong CPU count

1. **The `go` line.** `go version -m "$BIN" | grep -e 'DefaultGODEBUG='`.
   `containermaxprocs=0` in the output means the main module's `go` line is
   below 1.25, so the runtime ignores the cgroup CPU quota (GO-MOD-09).
   Measured: a `go 1.24` module built by go1.27.1 carried it, and a `go 1.27`
   module printed no line.
2. **A superseded dependency.** `go version -m "$BIN" | grep -e 'go.uber.org/automaxprocs'`.
   A `dep` line in a module at `go 1.25` or later is GO-OBS-06: under a
   fractional quota it pins fewer threads than the runtime would. Empty output
   is the pass.
3. **A frozen value.** A `GOMAXPROCS=` line from Step 0's environment read, or a
   `runtime.GOMAXPROCS(n)` call with `n > 0`, turns off the runtime's re-check
   (GO-OBS-06). `GODEBUG=schedtrace=1000` shows the value in effect as
   `gomaxprocs=`.

## Last resort

Only after the steps above, and only with consent (GO-OBS-14).

- **`GOTRACEBACK=crash`.** Measured on a nil-map panic: the default printed one
  goroutine and exited 2, and `GOTRACEBACK=crash` printed all six goroutines and
  aborted with exit 134. The kernel writes a core only where `ulimit -c` or
  systemd-coredump allows. Linux 6.12 and 6.13 wrote cores that elfutils cannot
  symbolize: the tracker is [sourceware bug 32713](https://sourceware.org/bugzilla/show_bug.cgi?id=32713),
  not a `golang/go` issue. Use kernel 6.14 or later.
- **Delve attach.** A named procedure, not measured here. It stops the
  scheduler while attached, and a readable session needs a
  `-gcflags=all=-N -l` rebuild, which is a different binary.

## The receipt

Write five blocks, in this order.

1. **Symptom**, one line, in the reporter's words.
2. **Build identity**, Step 0's output pasted.
3. **Root cause**, the mechanism, with the Go version it holds on.
4. **Evidence**, the command and its verbatim output. Two readings when a fix
   was applied, before and after.
5. **Fix, or gap**: the change and the rule ID it satisfies, or the named gap
   with the surface that would settle it.

Name every rule ID relied on. A diagnosis citing none either found something
new, and says so, or skipped the standard that already covered it.

## MUST rows this procedure surfaces

Restated as findings so a diagnosis run without the rule loaded still reports
them with the right ID. The rule text and full verification live in the
`go-quality` rule.

| # | Finding | Rule |
|---|---|---|
| 1 | A process was signalled, profiled or attached without the operator naming it theirs | GO-OBS-14 |
| 2 | `net/http/pprof` is blank-imported to get an endpoint | GO-OBS-05 |
| 3 | `GODEBUG=execwait=2` is set outside a CI job or a one-off repro | GO-OBS-07 |
| 4 | A module at `go 1.25` or later imports `go.uber.org/automaxprocs` | GO-OBS-06 |
| 5 | A goroutine has no join its caller can reach | GO-CONC-10 |
| 6 | A library or SDK package that starts goroutines has no `goleak.VerifyTestMain` | GO-CONC-11 |
| 7 | A fan-out over input-sized data has no bound | GO-CONC-13 |
| 8 | A variable is written by more than one goroutine without a guard | GO-CONC-09 |
| 9 | `wg.Add` runs inside the goroutine, or a lock is copied | GO-CONC-07, GO-CONC-08 |
| 10 | An `exec.Cmd` has no `WaitDelay` | GO-IO-07 |
| 11 | `t.Fatal` or `require` is called from a spawned goroutine | GO-TEST-01 |
| 12 | Parallel tests share a fixture without synchronization | GO-TEST-09 |
| 13 | The race job runs with `CGO_ENABLED=0` | GO-GATE-04 |
| 14 | A performance claim has no `benchstat` table | GO-TEST-20 |
| 15 | A race diagnosis skips `go vet ./...` because `-race` or `go test` passed | GO-GATE-02 |

## What agents get wrong

1. **Profiling or signalling a process nobody named.** SIGQUIT ends it.
2. **Waiting for `all goroutines are asleep`.** A process with a ticker never
   prints it. Send SIGQUIT, or re-run the test with `-timeout`.
3. **Reading a zero `goroutineleak` count as "no leak".** A goroutine parked on
   a package-level channel reads 0.
4. **Reading a silent `GODEBUG=execwait=2` run as "no leaked `Cmd`".** It never
   fires for `exec.CommandContext`, and only fires after a GC.
5. **Calling code race-free after one green `-race` run**, or skipping `go vet`
   because `-race` passed.
6. **Reading empty live block or mutex profiles as "no contention"** when the
   rates were never set.
7. **Diffing heap snapshots taken without `?gc=1`**, which blames the allocator
   instead of the retaining function.
8. **Taking `-gcflags=-m`'s `does not escape` as zero allocations.** Measure
   `allocs/op`.
9. **Comparing benchmarks from two package paths**, or quoting one `ns/op`
   instead of a benchstat delta with its p-value.
10. **Comparing profiles from binaries with different experiments or PGO.** Run
    Step 0 on both.
11. **Blank-importing `net/http/pprof` to get an endpoint**, or setting
    `GOMEMLIMIT` in a CLI to stop an OOM.
12. **Citing a `golang/go` issue for the kernel 6.12/6.13 core-dump break.**
    It is sourceware bug 32713.
13. **Fixing the check.** See [Never edit the check](#never-edit-the-check).

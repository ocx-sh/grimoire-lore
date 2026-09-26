---
title: "Goroutine ownership, bounded fan-out, and the race shapes -race misses"
topic: go-concurrency/goroutine-ownership
agent: goroutine-ownership-dive
model: sonnet
date_researched: 2026-09-26
sources_count: 15
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/goroutine-ownership/
scope: |
  Covers M-C-01, M-C-02, M-C-03, M-C-04 (partial), M-C-05, M-C-06, M-C-07,
  M-C-08, M-C-11, M-C-12, M-C-13 from go-topic-map.md §C: who owns a
  goroutine and how the caller joins it; bounding fan-out (errgroup.SetLimit,
  WaitGroup.Go, semaphore); the race shapes beyond "missing mutex" (slice
  append, closure/err capture, concurrent map write, close/send-after-close,
  wg.Add-inside-goroutine); which leak detector fits tests vs long-running
  processes and what each misses; whether library goroutines must recover.
  Does NOT cover context propagation/cancellation (M-C-15..19, a separate
  dive), typed atomics (M-C-09), sync.Map (M-C-14), embedded-mutex API leaks
  (M-C-20), or time.After/timer leaks (M-C-10, resolved obsolete elsewhere).
  All Go/tool versions below are as of Go 1.27.1, golangci-lint 2.14.0,
  staticcheck 2026.2.1, dated 2026-09-26.
---

## Table of contents

1. [Findings](#findings)
   1. [The ownership contract: every goroutine needs a reachable join point](#1-the-ownership-contract-every-goroutine-needs-a-reachable-join-point)
   2. [Bounding fan-out: errgroup.SetLimit, WaitGroup.Go, and the semaphore idiom](#2-bounding-fan-out-errgroupsetlimit-waitgroupgo-and-the-semaphore-idiom)
   3. [wg.Add inside the goroutine: the vet analyzer vs -race](#3-wgadd-inside-the-goroutine-the-vet-analyzer-vs--race)
   4. [Race shapes beyond "missing mutex"](#4-race-shapes-beyond-missing-mutex)
   5. [Channel discipline: buffer size, close-once, send-after-close](#5-channel-discipline-buffer-size-close-once-send-after-close)
   6. [Three leak detectors, three different blind spots](#6-three-leak-detectors-three-different-blind-spots)
   7. [Panics in library goroutines: nobody catches them for you](#7-panics-in-library-goroutines-nobody-catches-them-for-you)
   8. [sync.OnceValue/OnceValues for fallible lazy init](#8-synconcevalueoncevalues-for-fallible-lazy-init)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- Every goroutine a library, SDK, or CLI starts must have a reachable join point (`Wait`, `<-done`, `Close`/`Shutdown`) — Uber's own style guide states this as a hard "every goroutine must have a predictable stop time or a stop signal, and code must be able to block on it" ([uber-go/guide § Don't fire-and-forget goroutines](https://github.com/uber-go/guide/blob/master/style.md#dont-fire-and-forget-goroutines)).
- `go.dev/wiki/CodeReviewComments#goroutine-lifetimes` gives the fallback when a join point genuinely cannot be made simple: **document when and why the goroutine exits** — this is the honest "reading heuristic" a reviewer without a detector falls back to.
- Only 54/248 (22%) `errgroup.Go` call sites in the exemplar corpus pair with `SetLimit` in the same repo; 94 `for`-then-`go` sites have no visible bound at all ([exemplar-runtime-posture.md §3](../go-audit/exemplar-runtime-posture.md)). Measured on a planted fixture: an unbounded 10,000-item `errgroup.Go` fan-out peaks at **4,934 live goroutines**; the same fan-out with `SetLimit(8)` peaks at **10** (8 workers + main + monitor) — see [Verification runs](#verification-runs).
- `sync.WaitGroup.Go` (Go 1.25, [go.dev/doc/go1.25](https://go.dev/doc/go1.25#minor_library_changes)) is the idiom for "wait for N goroutines, none of which can fail" — it is a thin wrapper that still panics the whole process if `f` panics (confirmed by reading `sync/waitgroup.go:236-260` in the Go 1.27.1 source: it recovers only to re-`panic`, explicitly to avoid a race between `Done()` and the fatal crash). `errgroup.Group` is the idiom once any task can return an error or the group needs first-error cancellation.
- `wg.Add` called from *inside* the spawned goroutine, instead of before the `go` statement, is a real, named misuse — Go 1.27's new `vet` analyzer `waitgroup` catches it by name (`WaitGroup.Add called from inside new goroutine`) and it is **exactly** the shape Uber's PLDI'22 paper attributes 24 real production races to. **`go test -race -count=10` does not catch it** — confirmed on a planted fixture; this is a logical/ordering bug, not a memory race the detector's model covers.
- `go vet`'s `waitgroup` analyzer and `x/tools`' `waitgroupgo` modernizer fixer are two different tools with overlapping names: `waitgroup` (vet) flags the misplaced-`Add` bug above; `waitgroupgo` (the `go fix`/`modernize` suite) rewrites an `Add`+`go`+`defer Done` triple into `wg.Go(...)`. Neither one runs the other.
- Four Go-specific race shapes beyond "missing mutex", each planted and confirmed under `go test -race -count=3`: concurrent `append` to a shared slice, a closure writing a shared outer `err`, a concurrent map write, and a send on a closed channel. All four went red under `-race`; the append and closure-err and map-write cases were deterministic across 3 runs, the send-after-close case was caught by `-race` in only 1 of 5 runs (see [Verification runs](#verification-runs)) — a genuine, measured flake, not a documentation error.
- A concurrent map write also crashes the process on its own, without `-race`, via the Go runtime's own built-in detector (`fatal error: concurrent map writes`) — but only nondeterministically: 2 of 5 unraced runs crashed, 3 passed silently. `-race` is what turns this from "sometimes crashes in prod" into "reliably fails in CI."
- Channel buffer size: Uber's rule, unchanged since first published, is "one or none" — any larger buffer needs to justify what happens when it fills ([uber-go/guide § Channel Size is One or None](https://github.com/uber-go/guide/blob/master/style.md#channel-size-is-one-or-none)). The exemplar corpus's 111 `make(chan struct{}, N)` "semaphore" hits are roughly 2/5 false positives (plain `N==1` signal channels), so this pattern needs a spot-read, not a blind count ([exemplar-runtime-posture.md §3](../go-audit/exemplar-runtime-posture.md)).
- A channel must be closed exactly once, by its sender, never by a receiver — closing twice panics (`close of closed channel`) and sending after close panics (`send on closed channel`); both confirmed on planted fixtures, both true independent of `-race`.
- Three leak detectors, three genuinely different blind spots, all measured on the same three planted leak shapes (unjoined-but-bubble/process-local, blocked on real I/O, held via a package-level global): **`goleak.VerifyTestMain`** caught all three; **`testing/synctest.Test`**'s deadlock detector caught only the first (its own doc: I/O blocking and any channel *not created inside the bubble* are not "durably blocked", so the test hangs to `-timeout` instead of failing cleanly); **the `runtime/pprof` `goroutineleak` profile (GA since Go 1.27, experimental in 1.26)** also caught only the first, and — confirmed by both the official Go 1.27 release notes and this dive's own measurement — it misses a goroutine blocked on a *reachable* global exactly as much as it misses one blocked on I/O, because its detector is a reachability analysis, not a "blocked too long" heuristic.
- goleak's own stated blind spot is different in kind from the other two: it cannot tell a genuine leak from a `t.Parallel` sibling that simply hasn't finished — which is why its own README recommends `VerifyTestMain` over per-test `VerifyNone` for parallel suites ([uber-go/goleak README](https://github.com/uber-go/goleak/blob/master/README.md)).
- Neither `sync.WaitGroup.Go` nor `golang.org/x/sync/errgroup.Group.Go` recovers a panic in the task function — both let it crash the whole process, and `errgroup`'s own source says this is deliberate, not an oversight, citing four golang/go issues on why "helpfully" propagating the panic to `Wait()` would be worse (delayed panics, hidden crash-monitoring signal, deadlock risk) — [golang.org/x/sync errgroup.go:83-94, v0.23.0](https://github.com/golang/go/blob/master/src/vendor/golang.org/x/sync/errgroup/errgroup.go). Confirmed on a planted fixture: an unrecovered panic in a library-started goroutine takes down the whole `go test` binary, not just that one test.
- The fix is the library's own job: a background goroutine that must not crash its caller wraps its body in `defer func(){ recover() ... }()` and reports the failure through an error channel or field — confirmed working on a planted fixture.
- `sync.OnceValue`/`OnceValues` (Go 1.21) is the correct primitive for fallible lazy initialization; both remember and re-panic with the *same* panic value on every subsequent call if `f` panics — a plain `sync.Once` plus a captured error variable requires the caller to write that memoization by hand and is easy to get wrong.
- `sync.Mutex`/`RWMutex`/`WaitGroup`/`Once` are safe by *value* zero-value but unsafe to *copy* after use; `go vet`'s `copylocks` analyzer catches this, but only under `go vet` — it is one of the 25 of 36 analyzers `go test`'s built-in high-confidence subset does **not** run (confirmed against [go1.27.1 codified.md §1](../go-topic-map/codified.md)).

## Findings

### 1. The ownership contract: every goroutine needs a reachable join point

The normative source is short and specific. [Go Code Review Comments § Goroutine Lifetimes](https://go.dev/wiki/CodeReviewComments#goroutine-lifetimes) says goroutines that block on channel operations are not cleaned up by the garbage collector even when nothing else references the channel — "make sure it's obvious when — or whether — goroutines finish", and when that clarity is not achievable in the code itself, "document when and why the goroutines exit."

Uber's Go Style Guide states the same contract more operationally, in its own section titled ["Don't fire-and-forget goroutines"](https://github.com/uber-go/guide/blob/master/style.md#dont-fire-and-forget-goroutines) (fetched 2026-09-26, `master`):

> In general, every goroutine:
> - must have a predictable time at which it will stop running; or
> - there must be a way to signal to the goroutine that it should stop
>
> In both cases, there must be a way for code to block and wait for the goroutine to finish.

The guide's own "Wait for goroutines to exit" subsection gives `wg.Go(...)` (Go 1.25's `sync.WaitGroup.Go`) as the current example for "multiple goroutines you want to wait for", and a `done := make(chan struct{})` + `<-done` as the one-goroutine case — both idioms measured live in the corpus (see [Exemplar evidence](#exemplar-evidence)).

**Reading heuristic** (no static analyzer covers this generally): for every `go` statement or `.Go(` call, there is a `Wait`, a receive on a `done`/`closed` channel, or a documented reason the goroutine is meant to outlive the function — in the same function, or reachable through an exported `Close`/`Shutdown`/`Stop` method the caller can call. `golang/go` accepted this as review guidance, not a lint rule, because "has a join point" is not mechanically decidable in general (a goroutine can be joined through arbitrarily indirect plumbing) — this is the one MUST in this dive whose check is reading discipline, not a tool, though `goleak.VerifyTestMain` in a package's tests is the closest mechanical proxy (§6).

Fixture confirming the shape: `leak/leak.go:StartUnjoined` (no join point at all) vs `leakfixed/leakfixed.go:StartJoined` (returns a `wait func()` the caller must call) — see [Verification runs](#verification-runs).

### 2. Bounding fan-out: errgroup.SetLimit, WaitGroup.Go, and the semaphore idiom

[`pkg.go.dev/golang.org/x/sync/errgroup`](https://pkg.go.dev/golang.org/x/sync/errgroup) (fetched 2026-09-26): `Group.Go` "blocks until the new goroutine can be added without the number of goroutines in the group exceeding the configured limit" — i.e. `SetLimit` turns `Go` itself into the backpressure point; no separate semaphore is needed once a limit is set. `SetLimit(n)`: negative means unlimited (the zero-value default), zero means no new goroutines are ever allowed, and "the limit must not be modified while any goroutines in the group are active." `TryGo` is the non-blocking variant, returning `false` instead of blocking when the limit is already reached — the shape for "spawn at most N and drop or requeue the rest" rather than "spawn N and wait for room."

Measured cost of skipping this: the exemplar corpus has only 54 of 248 `errgroup.Go` call sites (22%) paired with a `SetLimit` in the same repo, and 94 `for`-then-`go` sites with no visible bound in a 3-line window ([exemplar-runtime-posture.md §3](../go-audit/exemplar-runtime-posture.md)). This dive planted the concrete cost: fanning 10,000 items through an unbounded `errgroup.Group.Go` peaked at **4,934 live goroutines** (`runtime.NumGoroutine()` sampled every 50µs while each task sleeps 2ms); the identical fan-out under `g.SetLimit(8)` peaked at **10** — see [Verification runs](#verification-runs), fixtures `fanout/unbounded/main.go` and `fanout/limited/main.go`.

`sync.WaitGroup.Go` (Go 1.25) has no `SetLimit` equivalent at all — it is the tool for "start N tasks, none of which returns an error, and wait for all of them", not for bounding a fan-out whose size is data- or wire-controlled. When the fan-out size comes from user input, a wire response, or a directory listing (not a fixed, small, code-controlled N), a limit is required — via `errgroup.SetLimit`, `golang.org/x/sync/semaphore`, or a `make(chan struct{}, n)` counting semaphore (24, 111, and 111 hits respectively in the corpus, though the channel-based count over-reports — see §5). `M-C-04`'s question (whether errgroup's first-error-cancels semantics is wrong for a command that must report every failure, e.g. batch validate) is out of this dive's fixture budget; the direction is: `errgroup.Wait()` returns only the *first* error, so a command that must report every failure collects with `errors.Join` over a mutex-guarded slice or uses a `sync.WaitGroup` directly instead of `errgroup` — flagged here as a P2 candidate for a follow-up dive, not fixture-verified in this pass.

### 3. wg.Add inside the goroutine: the vet analyzer vs -race

The exact violation shape, read directly from Go 1.27.1's own vet test fixture (`cmd/vet/testdata/waitgroup/waitgroup.go`, `go1.27.1`):

```go
// WRONG
var wg sync.WaitGroup
go func() {
    wg.Add(1) // "WaitGroup.Add called from inside new goroutine"
    defer wg.Done()
    ...
}()
wg.Wait() // may return prematurely before new goroutine starts
```

The analyzer's own doc (`cmd/vendor/golang.org/x/tools/go/analysis/passes/waitgroup/doc.go`) names the exact bug: `wg.Wait()` "may return prematurely before new goroutine starts", i.e. `Wait` observes zero net `Add`s and returns immediately, then the goroutine calls `Add(1)` on a `WaitGroup` nobody is waiting on any more. Uber's PLDI'22 paper independently attributes **24 real production races** to exactly this pattern — "`Add()` called from inside the spawned goroutine races with `Wait()` returning early" ([arxiv.org/html/2204.00764v2](https://arxiv.org/html/2204.00764v2), Observation 8, fetched 2026-09-26).

Planted and run (`waitgroupvet/violation/violation.go` vs `waitgroupvet/fixed/fixed.go`):

- `go vet ./waitgroupvet/violation/...` → exit 1, `WaitGroup.Add called from inside new goroutine`.
- `go vet ./waitgroupvet/fixed/...` → exit 0.
- `go test -race -count=10 -run TestBadAddInsideGoroutine_UnderRace ./waitgroupvet/violation/...` → **exit 0, no race reported**, ten times in a row.

This is the dive's clearest "what `-race` misses" finding: the bug is a race in the *logical* sense (an ordering assumption that can be violated) but not in the memory-model sense the race detector models (every individual field access inside `sync.WaitGroup` is itself properly synchronized with atomics — the detector has nothing to flag). `go vet`'s dedicated `waitgroup` analyzer is the only mechanical check; there is no lint or `-race` substitute for it.

**Do not confuse this with `waitgroupgo`.** Go 1.27.1's `modernize`/`go fix` suite includes a *different*, same-family-named analyzer, `WaitGroupGoAnalyzer` (`go1.27.1:src/cmd/vendor/golang.org/x/tools/go/analysis/passes/modernize/waitgroupgo.go`), which rewrites the older three-statement idiom (`wg.Add(1); go func(){ defer wg.Done(); f() }()`) into `wg.Go(f)`. It fixes a style/verbosity gap, not the misuse above, and running it does not imply the misplaced-`Add` bug was checked.

### 4. Race shapes beyond "missing mutex"

Uber's PLDI'22 study, run across ~46M lines / ~2,100 microservices, ranks the Go-specific root causes of >2,000 found races (fetched 2026-09-26, [arxiv.org/html/2204.00764v2](https://arxiv.org/html/2204.00764v2)):

| shape | races | why |
|---|---|---|
| concurrent slice access | 391 | a lock on the slice *variable* does not lock the backing array; `append` can silently reallocate or alias |
| closure capture-by-reference | 223 (121 general capture + 50 captured `err` + 48 loop-var + 4 named-return) | "transparent capture-by-reference of free variables in goroutines is a recipe for data races" |
| concurrent map access | 38 | Go's built-in map gives no thread safety; `map[key]` syntax "creates false confidence about disjoint element access" |
| `sync.WaitGroup` misuse | 24 | `Add()` called inside the spawned goroutine (§3) |

Three of these four shapes were planted and confirmed independently under `go test -race -count=3` in this dive (`races/appendslice`, `races/closureerr`, `races/concmap` — full commands and output in [Verification runs](#verification-runs)); the fourth (`WaitGroup` misuse) is §3, confirmed to be a *miss* for `-race`, not a hit.

Tu et al.'s ASPLOS'19 study (171 bugs across Docker, Kubernetes, etcd, gRPC and others; [cseweb.ucsd.edu/~yiying/GoStudy-ASPLOS19.pdf](https://cseweb.ucsd.edu/~yiying/GoStudy-ASPLOS19.pdf), read via [the summary](https://blog.acolyer.org/2019/05/17/understanding-real-world-concurrency-bugs-in-go/), fetched 2026-09-26) is the source for the counter-intuitive claim in `-race`'s own limits: of 171 bugs, 85 were blocking and 86 non-blocking; **message-passing-caused blocking bugs outnumbered shared-memory-caused ones** among the reproduced set, contradicting the intuition that channels are inherently safer than mutexes. Detection-tool efficacy was measured, not asserted: **the race detector caught only about half of reproduced non-blocking bugs**, and an informal deadlock detector caught only 2 of 21 reproduced blocking bugs. Neither `-race` nor a deadlock watchdog substitutes for the reading discipline in §1 and §5.

The official [race detector article](https://go.dev/doc/articles/race_detector) (fetched 2026-09-26) states the detector's own scope limit plainly: "The race detector only finds races that happen at runtime, so it can't find races in code paths that are not executed" — coverage of the *test suite*, not just of `-race`'s enablement, gates what it can ever report. Its overhead is stated as 5-10x memory and 2-20x CPU, and (a separate, documented cost) an extra 8 bytes per `defer`/`recover` that a long-running goroutine leaks until it exits ([golang/go#26813](https://github.com/golang/go/issues/26813)) — relevant to §7's recover-and-report pattern if it runs in a genuinely long-lived background goroutine rather than a short-lived test.

### 5. Channel discipline: buffer size, close-once, send-after-close

Uber's Style Guide's rule on buffer size has not changed in substance since it was first published: ["Channel Size is One or None"](https://github.com/uber-go/guide/blob/master/style.md#channel-size-is-one-or-none) — "Any other size must be subject to a high level of scrutiny. Consider how the size is determined, what prevents the channel from filling up under load and blocking writers, and what happens when this occurs." The corpus's own `make(chan struct{}, N)`-as-semaphore heuristic (111 hits) over-reports: a spot sample found roughly 2/5 were ordinary `N==1` signal/done channels, not worker-pool semaphores ([exemplar-runtime-posture.md §3](../go-audit/exemplar-runtime-posture.md)) — treat any such count as an upper bound requiring a spot-read, never a MUST-backing number on its own.

Close discipline, confirmed on planted fixtures (`closesend/doubleclose`, `closesend/sendafterclose`, `closesend/fixed`):

- Two goroutines racing to `close(ch)` on the same channel: one wins, the other panics `close of closed channel`. `go test -race -count=3` → exit 1, `panic: close of closed channel`, deterministically (the runtime's own channel implementation raises this, independent of `-race`).
- A goroutine sending on a channel after another goroutine closed it: panics `send on closed channel`. **`-race` reported this as a genuine data race in only 1 of 5 runs** — a `read at ... by runtime.chansend()` racing a `previous write ... by runtime.closechan()`, because nothing in the fixture establishes a happens-before edge between the close and the send other than wall-clock sleep durations, which the race detector does not treat as synchronization. The other 4/5 runs simply hit the deterministic runtime panic without a race report. This is the second concrete "what `-race` misses (some of the time)" finding in this dive: a single green `-race` run is not proof of absence for a close/send ordering bug; `-count=3` or higher is the minimum defense, and even that is probabilistic, not a guarantee.
- The compliant twin (`closesend/fixed`): exactly one designated closer, closing only after every sender has finished sending (`sync.WaitGroup.Wait()` inside the closer goroutine, guarding the `close`) — `go test -race -count=5` → exit 0, every run.

### 6. Three leak detectors, three genuinely different blind spots

Three leak shapes were planted once in `leak/leak.go` and run under all three detectors named in the brief:

1. `StartUnjoined` — blocks forever on an unbuffered channel created and referenced only inside the function; once the function returns, nothing else can ever reach or unblock it.
2. `StartBlockedOnSyscall` — blocks forever on a real `os.Pipe()` read (blocking file I/O).
3. `StartHeldByGlobal` — blocks forever on a package-level (`var globalHeld = make(chan struct{}, 1)`) channel that is never sent to; the channel is reachable from the package's global scope, even though nothing in the program actually sends to it.

**goleak** (`go.uber.org/goleak` v1.3.0, `goleak.VerifyTestMain`): caught all three, individually confirmed — each run reports `goleak: Errors on successful test run: found unexpected goroutines: [...]` naming the exact blocked function and its creation site. goleak enumerates *every* still-running goroutine via a stack dump and diffs it against a baseline; it does not care what the goroutine is blocked on, so I/O and global-reachability are invisible to its blind-spot list. Its own, different, blind spot: it "does not know how to distinguish a leaky goroutine from tests that have not finished running" under `t.Parallel` ([uber-go/goleak README](https://github.com/uber-go/goleak/blob/master/README.md), fetched 2026-09-26) — which is why the README itself recommends `VerifyTestMain` (once, after every test in the package/binary has finished) over per-test `VerifyNone`.

**`testing/synctest.Test`** (GA since Go 1.25, [go.dev/doc/go1.25](https://go.dev/doc/go1.25)): caught only `StartUnjoined`. Its own doc comment (`go1.27.1:src/testing/synctest/synctest.go`) defines "durably blocked" narrowly: "a blocking send or receive on a channel **created within the bubble**" — and explicitly excludes "locking a `sync.Mutex`... blocking on I/O... system calls" from durable blocking, because those *could* in principle be unblocked by something outside the bubble. `StartUnjoined`'s channel is created inside the bubble (the call itself runs inside `synctest.Test`'s function argument), so once the root goroutine returns, the runtime concludes every remaining goroutine is durably blocked with no time-based way forward, and `Test` panics: `panic: deadlock: main bubble goroutine has exited but blocked goroutines remain` — a real panic, confirmed on the fixture, not merely `t.Fail()`. `StartBlockedOnSyscall` (real I/O) and `StartHeldByGlobal` (a channel created *outside* the bubble, at package-init time, before any bubble exists) are both, by the same rule, not durably blocked — the test **hangs** instead of failing, only terminating via `go test`'s own `-timeout`, producing `panic: test timed out after 3s` with the leaked goroutine's true state visible in the dump (`internal/poll.(*pollDesc).waitRead` for the syscall case; a plain `[chan receive, synctest bubble 1]` with no `(durable)` annotation for the global case). This is the concrete, measured shape of the miss the brief asked to record: not silence, but a hang that only resolves via the test harness's timeout.

**`runtime/pprof`'s `goroutineleak` profile** (GA since Go 1.27, experimental in Go 1.26 — [go.dev/doc/go1.27](https://go.dev/doc/go1.27)): caught only `StartUnjoined` (`pprof.Lookup("goroutineleak").WriteTo(w, 1)` reports exactly one entry, at `leak.StartUnjoined.func1`). The official Go 1.27 release notes state the mechanism and its limitation directly:

> A leaked goroutine is [one] blocked on some concurrency primitive... that cannot possibly become unblocked. The runtime detects these using garbage collection: if a goroutine G is blocked on concurrency primitive P, and P is unreachable from any runnable goroutine..., then P cannot be unblocked. ... it may fail to identify leaks caused by blocking on concurrency primitives reachable through global variables or local variables of runnable goroutines.

This dive's own measurement lines up exactly: `StartBlockedOnSyscall` is the documented I/O miss, and `StartHeldByGlobal` is the documented *global-variable* miss — confirmed, not merely quoted. The profile's `Count()` method also read `0` in every run even while `WriteTo` printed one real entry — the two are evidently gated differently internally (`Count()` looks GC-cycle-gated in a way `WriteTo`'s own detection pass is not); treat `WriteTo`'s text output as the source of truth, not `Count()`.

**Reading this together**: goleak is the SHOULD for package tests (it enumerates goroutines, not a reachability graph, so it has no global/I-O blind spot — its cost is a `t.Parallel` false-positive risk, mitigated by `VerifyTestMain`); `synctest.Test` is a correctness tool for time-dependent concurrency logic, not a leak detector in the goleak sense (its "catch" is a side effect of testing something else, and it is the wrong tool to reach for specifically to hunt leaks); the `goroutineleak` profile is the SHOULD for a long-running process precisely because it is designed for "little to no false positives" in production sampling — but it is a floor, not a ceiling, on what it will find, and a goroutine leaked via a global (a genuinely common shape — see `leak.globalHeld` and its exemplar analogue, a package-level `sync.Once`-guarded client or cache) is invisible to it by design.

### 7. Panics in library goroutines: nobody catches them for you

Read directly from source, not inferred: **`sync.WaitGroup.Go`** (`go1.27.1:src/sync/waitgroup.go:236-260`):

```go
func (wg *WaitGroup) Go(f func()) {
    wg.Add(1)
    go func() {
        defer func() {
            if x := recover(); x != nil {
                // f panicked, which will be fatal because
                // this is a new goroutine.
                //
                // Calling Done will unblock Wait in the main goroutine,
                // allowing it to race with the fatal panic and
                // possibly even exit the process (os.Exit(0))
                // before the panic completes.
                //
                // This is almost certainly undesirable,
                // so instead avoid calling Done and simply panic.
                panic(x)
            }
            wg.Done()
        }()
        f()
    }()
}
```

The recover-then-repanic exists *only* to stop `Done()` racing the crash — it is not a containment mechanism, and the doc comment for `Go` states outright: "The function f must not panic." **`golang.org/x/sync/errgroup.Group.Go`** takes the same position for a documented reason, not by omission (`errgroup.go:83-94`, `v0.23.0`):

> It is tempting to propagate panics from f() up to the goroutine that calls Wait, but it creates more problems than it solves: it delays panics arbitrarily, making bugs harder to detect; it turns f's panic stack into a mere value, hiding it from crash-monitoring tools; it risks deadlocks that hide the panic entirely, if f's panic leaves the program in a state that prevents the Wait call from being reached. See [golang/go#53757](https://github.com/golang/go/issues/53757), [#74275](https://github.com/golang/go/issues/74275), [#74304](https://github.com/golang/go/issues/74304), [#74306](https://github.com/golang/go/issues/74306).

Confirmed on planted fixtures: `panicgoroutine/violation.StartAndPanic` — `go test -run TestStartAndPanic_KillsTestBinary` → exit 1, `panic: boom: unrecovered panic in a library-started goroutine`, and the entire test *binary* crashes, not just that one subtest. The compliant twin, `panicgoroutine/fixed.StartAndRecover`, wraps the same panicking body in its own `defer func(){ if r := recover(); ... }()` and reports the failure on a returned `<-chan error` instead — `go test -run TestStartAndRecover_ReportsInsteadOfCrashing` → exit 0. This settles M-C-12 directly against both stdlib abstractions: **the answer is yes, unconditionally, for a bare goroutine, `WaitGroup.Go`, and `errgroup.Go` alike** — none of the three contain a panic, all three crash the calling process, and the containment (`recover` + report) is the library author's job every time a background task's failure must not be fatal to the caller.

### 8. sync.OnceValue/OnceValues for fallible lazy init

[`pkg.go.dev/sync`](https://pkg.go.dev/sync) (fetched 2026-09-26), `OnceValue` (Go 1.21): "returns a function that invokes f only once and returns the value returned by f. The returned function may be called concurrently... If f panics, the returned function will panic with the same value on every call." `OnceValues` is the two-return-value form, documented identically. This is the direct fix for the failure mode Mat Ryer's practitioner writing names (cited via [practitioner.md §5](../go-topic-map/practitioner.md)): a hand-rolled `sync.Once` guarding a fallible initializer that stores its error in a captured variable either (a) forgets to re-check the error on every call after the first, or (b) leaks the sentinel-error-vs-real-error distinction across calls. `OnceValue`/`OnceValues` memoize the *panic* too — every caller after the first gets the identical panic value, which is the correct behavior for "this failed once and will fail identically forever" (a bad config value, a malformed embedded resource) and the wrong behavior for "this failed once because of a transient condition" (a network call) — for the latter, do not use `Once`-family primitives at all; retry logic belongs above the memoization layer, not inside it.

## Normative guidance candidates

1. **Every `go` statement or `.Go(`-family call in library, SDK, or CLI code must have a join point the caller can reach in the same function, or a documented exported `Close`/`Shutdown`/`Stop`.**
   Rationale: an unjoined goroutine is invisible to the garbage collector and to every caller; it is Go's canonical resource leak.
   Verify: `goleak.VerifyTestMain(m)` in the package's `TestMain`, run under `go test ./...` — catches every still-running goroutine at test-binary teardown, independent of what it's blocked on. Reading heuristic where no test harness exists: "every `go func` or `.Go(` has a `Wait`/`<-done`/`Close` visible in the same function, or a comment naming the owner."
   RUN: **yes** — `leak/leak.go:StartUnjoined` (violation, `TestStartUnjoined_LeaksUnderGoleak`) vs `leakfixed/leakfixed.go:StartJoined` (`TestStartJoined`), both under `goleak.VerifyTestMain`. Violation: exit 1, `goleak: Errors on successful test run: found unexpected goroutines: [...]`. Fixed: exit 0.

2. **A fan-out whose length is data- or wire-controlled (not a small, fixed, code-controlled N) must be bounded — `errgroup.Group.SetLimit(n)`, `golang.org/x/sync/semaphore`, or an explicit counting channel — never a bare loop over `errgroup.Go` or `go func`.**
   Rationale: an unbounded fan-out over untrusted-sized input is an OOM/goroutine-exhaustion vector; measured cost on this dive's fixture is ~500x more live goroutines at 10,000 items (4,934 vs 10 at `SetLimit(8)`).
   Verify: reading heuristic — a `for`/`range` over input directly containing a `go`/`.Go(` call with no `SetLimit` call, semaphore acquire, or worker-pool bound anywhere in the enclosing function or its documented contract. No static analyzer in the golangci-lint v2.14.0 roster or staticcheck 2026.2.1 catches this generally (confirmed absent from [codified.md §4-5](../go-topic-map/codified.md)'s full check indices).
   RUN: **yes**, as a measurement, not a pass/fail gate — `fanout/unbounded/main.go` (peak 4,934 goroutines) vs `fanout/limited/main.go` (`SetLimit(8)`, peak 10), both `go run` against 10,000 items with a `runtime.NumGoroutine()` sampler.

3. **`wg.Add` must be called before the `go` statement that spawns the goroutine that will call `wg.Done()`, never from inside that goroutine.**
   Rationale: `Wait()` can return before the goroutine has registered, silently under-waiting — Uber's PLDI'22 study attributes 24 real production races to exactly this.
   Verify: `go vet ./...` (the `waitgroup` analyzer, on by default, Go 1.27.1+) — message `WaitGroup.Add called from inside new goroutine`. `-race` does **not** substitute for this.
   RUN: **yes** — `waitgroupvet/violation/violation.go` → `go vet` exit 1 with the exact message; `waitgroupvet/fixed/fixed.go` → exit 0; additionally `go test -race -count=10` on the violation → exit 0 (confirmed miss).

4. **`sync.WaitGroup.Go` (go ≥1.25) is the idiom for "wait for N goroutines that cannot fail"; `errgroup.Group` is the idiom once any task can return an error or the group needs first-error cancellation via a derived `context.Context`.**
   Rationale: `WaitGroup.Go` has no error channel and no `SetLimit`; reaching for it when a task can fail forces hand-rolled error plumbing that `errgroup` already provides.
   Verify: reading heuristic — a `WaitGroup.Go`/`Add`+`go`+`Done` group whose spawned functions all return nothing and never assign to a shared error variable is correctly shaped; one that does assign to a shared `err` (see rule 6) should be an `errgroup` instead.
   RUN: no — reading heuristic only in this pass; the modernizer below is the closest mechanical proxy for the *replaces-old-code* direction.

5. **A background/library goroutine whose failure must not be fatal to its caller must `recover()` inside itself and report the failure through a return value, channel, or error field — `sync.WaitGroup.Go` and `errgroup.Group.Go` do not do this for you.**
   Rationale: both stdlib/x abstractions deliberately let a panic in the task crash the whole process (confirmed by reading their source, not by inference); an AI agent that assumes either one is a supervision boundary is wrong every time.
   Verify: reading heuristic — a `go func(){ ... }()`, `wg.Go(f)`, or `g.Go(f)` in package (non-`main`, non-`_test.go`) code with no `recover()` anywhere in `f`'s call graph is a finding, unless the panic is genuinely meant to be fatal (a documented invariant violation).
   RUN: **yes** — `panicgoroutine/violation/violation.go` (`StartAndPanic`, unrecovered) → `go test` exit 1, whole binary panics, `panic: boom: ...`; `panicgoroutine/fixed/fixed.go` (`StartAndRecover`, recovers and reports via `<-chan error`) → exit 0.

6. **Every closure spawned as a goroutine that writes to a variable declared outside it (a shared `err`, an accumulator slice, a result map) must synchronize that write — a mutex, a channel send, or routing the write through `errgroup`/`WaitGroup.Go`'s own happens-before guarantee — never a bare shared variable.**
   Rationale: closure capture-by-reference is Uber's #2 Go-specific race cause by volume (223 of 879), and the `err`-specific sub-case (50) is the single most common named variable involved.
   Verify: `go test -race ./...` — reliably catches this shape (confirmed 3/3 runs on the planted fixture); no static lint substitutes.
   RUN: **yes** — `races/closureerr/closureerr_test.go`: violation (`TestClosureWritesOuterErr_Races`) → exit 1, `WARNING: DATA RACE`, 3/3 `-count=3` runs; fixed (mutex-guarded `err`) → exit 0.

7. **A slice or map that multiple goroutines append to or write into must be guarded by a mutex (or replaced by a per-goroutine slice merged after `Wait`) — never shared and mutated directly across goroutines.**
   Rationale: concurrent slice access is Uber's #1 Go-specific race cause by volume (391 of 879); `append` can silently reallocate the backing array mid-race. Concurrent map writes additionally crash the process outright via the runtime's own detector, independent of `-race`.
   Verify: `go test -race ./...` for the slice case (reliable, 3/3 in this dive); for the map case, both `-race` (reliable, 3/3) and the unraced runtime crash (`fatal error: concurrent map writes`, but only 2/5 unraced runs in this dive — nondeterministic, so absence of the crash on an unraced run proves nothing).
   RUN: **yes** — `races/appendslice/appendslice_test.go` and `races/concmap/concmap_test.go`; violations exit 1 under `-race -count=3`, fixed (mutex-guarded) twins exit 0.

8. **A channel is closed exactly once, by the goroutine that owns sending on it, only after every send on it has completed; a receiver never closes a channel it reads from.**
   Rationale: closing an already-closed channel panics deterministically (`close of closed channel`); sending on a closed channel panics deterministically (`send on closed channel`); both crash the process regardless of `-race`, and `-race` itself only sometimes also flags the send-after-close case as a data race (1/5 runs in this dive) — so passing `-race` once is not proof the ordering is safe.
   Verify: reading heuristic — grep for `close(` sites and confirm each one is in the single designated sender/owner goroutine, gated by a `WaitGroup.Wait()` or equivalent barrier over every sender. No lint in the golangci-lint v2.14.0/staticcheck 2026.2.1 rosters catches this generally (`SA2000`-family checks cover a narrower `WaitGroup.Add` shape, not close discipline).
   RUN: **yes** — `closesend/doubleclose`, `closesend/sendafterclose` (both violations, exit 1, deterministic panics); `closesend/fixed` (single owner, closes only after `Wait()`, exit 0, 5/5 `-race -count=5` runs).

9. **A package's tests gate on `goleak.VerifyTestMain(m)`; a long-running process additionally exposes and periodically samples `runtime/pprof`'s `goroutineleak` profile (or its `net/http/pprof` endpoint). Neither replaces the other, and neither catches every leak shape.**
   Rationale: measured on identical planted leak shapes, goleak caught all three (unjoined, syscall-blocked, global-held); the `goroutineleak` profile caught only the unjoined one, missing the syscall-blocked case (documented) and the global-held case (documented and independently confirmed by measurement).
   Verify: `go test ./...` with `TestMain` calling `goleak.VerifyTestMain(m)` for the test-time SHOULD; `pprof.Lookup("goroutineleak").WriteTo(w, 1)` (or `curl localhost:PORT/debug/pprof/goroutineleak?debug=1`) sampled periodically for the production SHOULD.
   RUN: **yes** — `leak/leak_goleak_test.go` + `leak/leak_goleak_all_test.go` (goleak catches all 3, individually run); `leakprofile/main.go` (profile catches only 1 of 3, `WriteTo` output: `total 1`, naming only `StartUnjoined`).

10. **`testing/synctest.Test` is for testing time-dependent concurrency *logic* correctly and quickly (fake clock, deterministic ordering) — it is not a general-purpose leak detector, and a goroutine it cannot prove deadlocked will hang the test to `-timeout` rather than fail cleanly.**
    Rationale: measured directly — `synctest.Test` caught the bubble-local unjoined goroutine via its own deadlock detector (a real `panic: deadlock: ...`), but the syscall-blocked and global-channel-held goroutines both hung to a 3s `-timeout` instead, because synctest's "durably blocked" definition explicitly excludes I/O and any primitive not created inside the bubble.
    Verify: reading heuristic — do not reach for `synctest.Test` as a leak-hunting tool; use it for its documented purpose (fake-clock-driven determinism) and pair it with `goleak` if leak detection is also wanted in the same test.
    RUN: **yes** — `leaksynctest/leaksynctest_test.go`, four cases: bubble-local (catches, panics with `deadlock: main bubble goroutine has exited but blocked goroutines remain`), syscall-blocked and global-held (both hang to `-timeout 3s`, `panic: test timed out after 3s`), joined twin (clean exit 0).

11. **Fallible lazy initialization uses `sync.OnceValue`/`OnceValues` (go ≥1.21), not a hand-rolled `sync.Once` plus a captured error variable.**
    Rationale: `OnceValue`/`OnceValues` correctly memoize and re-deliver the identical panic on every call after the first; a hand-rolled version must reimplement that and is easy to get subtly wrong (forgetting to re-check the error, or conflating "not yet run" with "ran and failed").
    Verify: reading heuristic — a package-level `sync.Once` whose `Do`/`f` can return or set an error is a candidate for `OnceValue`; `staticcheck`/`golangci-lint` have no dedicated check for this migration as of 2026.2.1/2.14.0.
    RUN: no — not fixture-verified in this pass (no failure mode to plant that a tool would catch; this is a "prefer the newer stdlib primitive" style rule, confirmed only by reading `pkg.go.dev/sync`'s doc text).

12. **A `sync.Mutex`, `RWMutex`, `WaitGroup`, or `Once` must never be copied after first use — not via a value receiver, a struct copy, or a `for _, x := range structs` copy.**
    Rationale: copying resets internal state (in the case of `Mutex`, silently — the copy starts "unlocked" even if the original was locked) and is a documented, named class of bug `go vet`'s `copylocks` analyzer exists specifically to catch.
    Verify: `go vet ./...` (`copylocks`, on by default). Caveat, confirmed against the tool's own registry: this analyzer is **not** part of `go test`'s built-in "high-confidence subset" of 11 analyzers — a repository that runs only `go test` (no separate `go vet` step) never sees this check ([codified.md §1](../go-topic-map/codified.md), `go1.27.1` `go help test`'s documented vet subset).
    RUN: no — not independently re-fixtured in this pass (the mechanism and the `go test`-vs-`go vet` scope gap are confirmed from the tool's own registry and help text, not re-derived from a planted case, since `M-C-08` is a different dive's primary row per the topic map).

## Verification runs

All commands run via `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, `GOTOOLCHAIN=local`) from `/home/mherwig/.cache/research-lang/go-tools/fixtures/goroutine-ownership/` (module `goroutine-ownership-fixture`, `go 1.27`, deps `go.uber.org/goleak v1.3.0`, `golang.org/x/sync v0.23.0`).

| # | fixture path | command | exit (violation) | exit (twin) | key output |
|---|---|---|---|---|---|
| 1 | `waitgroupvet/{violation,fixed}` | `go vet ./waitgroupvet/violation/...` / `.../fixed/...` | 1 | 0 | `violation.go:17:10: WaitGroup.Add called from inside new goroutine` |
| 1b | `waitgroupvet/violation` | `go test -race -count=10 -run TestBadAddInsideGoroutine_UnderRace ./waitgroupvet/violation/...` | **0 (miss)** | — | `ok ... 1.008s` — `-race` never fires in 10 runs |
| 2 | `races/appendslice` | `go test -race -count=3 -run TestAppend_RacesAcrossGoroutines` / `-run TestAppend_FixedWithMutex` | 1 | 0 | `WARNING: DATA RACE`, `got 5 results, want 8` |
| 3 | `races/closureerr` | `go test -race -count=3 -run TestClosureWritesOuterErr_Races` / `_FixedWithErrgroup` | 1 | 0 | `WARNING: DATA RACE` |
| 4 | `races/concmap` | `go test -race -count=3 -run TestConcurrentMapWrite_Races` / `_FixedWithMutex` | 1 | 0 | `WARNING: DATA RACE` |
| 4b | `races/concmap` | `go test -count=1 -run TestConcurrentMapWrite_Races` (no `-race`), ×5 | 1, 0, 1, 0, 0 | — | `fatal error: concurrent map writes` on 2/5 |
| 5 | `closesend/doubleclose` | `go test -race -count=3 -run TestDoubleClose_Panics` | 1 | — | `panic: close of closed channel` |
| 6 | `closesend/sendafterclose` | `go test -race -count=3 -run TestSendAfterClose_Panics`, ×5 total | 1 (1 via DATA RACE, 4 via bare panic) | — | `WARNING: DATA RACE` (1/5), `panic: send on closed channel` (others) |
| 6b | `closesend/fixed` | `go test -race -count=5 -run TestSingleSenderClosesOnce` | — | 0 | `ok ... 1.009s` (5/5) |
| 7 | `leak/leak.go` + `leak_goleak_test.go` | `go test -count=1 -run TestStartUnjoined_LeaksUnderGoleak ./leak/...` | 1 | — | `goleak: ... found unexpected goroutines: [Goroutine ... leak.StartUnjoined.func1 ...]` |
| 7b | `leak/leak_goleak_all_test.go` | `-run TestStartBlockedOnSyscall_LeaksUnderGoleak` / `-run TestStartHeldByGlobal_LeaksUnderGoleak` | 1 / 1 | — | goleak reports both too |
| 7c | `leakfixed/` | `go test -count=1 -run TestStartJoined ./leakfixed/...` | — | 0 | `ok ... 1.008s` |
| 8 | `leaksynctest/` | `go test -count=1 -run TestSynctestCatchesBubbleLocalLeak -timeout 10s` | 1 | — | `panic: deadlock: main bubble goroutine has exited but blocked goroutines remain` |
| 8b | `leaksynctest/` | `RUN_HANGING_SYNCTEST_CASES=1 go test -run TestSynctestMissesSyscallBlock -timeout 3s` | 1 (via timeout, not detection) | — | `panic: test timed out after 3s`; dumped goroutine at `internal/poll.(*pollDesc).waitRead` |
| 8c | `leaksynctest/` | `RUN_HANGING_SYNCTEST_CASES=1 go test -run TestSynctestMissesGlobalHeldChannel -timeout 3s` | 1 (via timeout) | — | `panic: test timed out after 3s`; dumped goroutine `[chan receive, synctest bubble 1]` (no `(durable)` tag) |
| 8d | `leaksynctest/` | `go test -run TestSynctestJoined` | — | 0 | `ok` |
| 9 | `leakprofile/` | `go run ./leakprofile` (starts all 3 leaks, sleeps 1.2s, dumps profile) | n/a (measurement, not pass/fail) | — | `goroutineleak count() = 0`; `WriteTo` prints `total 1`, naming only `StartUnjoined.func1` — the other two are absent from the profile |
| 10 | `panicgoroutine/{violation,fixed}` | `go test -run TestStartAndPanic_KillsTestBinary` / `-run TestStartAndRecover_ReportsInsteadOfCrashing` | 1 | 0 | `panic: boom: unrecovered panic in a library-started goroutine` (whole binary) vs clean pass |
| 11 | `fanout/{unbounded,limited}` | `go run ./fanout/unbounded` / `./fanout/limited` (10,000 items) | n/a (measurement) | — | `peak goroutines = 4934` (unbounded) vs `peak goroutines = 10` (`SetLimit(8)`) |

Empty output convention: `go vet` and `go test` print nothing extra on success beyond `ok`/no findings — for every fixture above, a clean run's *absence* of a `panic:`, `WARNING: DATA RACE`, `fatal error:`, or a vet diagnostic line is the pass signal, matching the "empty output = pass" convention this dive's grep-based checks (§ Normative guidance candidates, rules 2 and 8) also use.

## Exemplar evidence

- **`sync.WaitGroup.Go` used correctly** (satisfies rule 1/4): `aquasecurity/trivy@ae561f8cca36:pkg/rpc/client/client.go:62-64` — `var wg sync.WaitGroup; wg.Go(func() { info, err := s.serverVersion(ctx); ...; serverInfo = info })`, followed by `wg.Wait()`. The write to the outer `serverInfo` inside the closure is safe *despite* looking like rule 6's violation shape, because `WaitGroup.Go`'s documented happens-before guarantee ("the return from f 'synchronizes before' the return of any Wait call that it unblocks") makes the write visible to the code after `Wait()` — this is the one case where a bare closure-writes-outer-variable pattern is correct, and only because of that specific primitive's guarantee.
- **A variable named `wg` that is not a `sync.WaitGroup`** — a naming trap for any grep-based heuristic (see [AI-agent angle](#ai-agent-angle)): `cli/cli@9b031151a825:internal/featuredetection/feature_detection.go:258-265` declares `var wg errgroup.Group` and calls `wg.Go(func() error { ... })` twice, then `wg.Wait()`. Read alone, `wg.Go(func() error {...})` cannot be `sync.WaitGroup.Go` at all — that method's signature is `func(f func())`, no return value — so any tool or reviewer must check the declared type, not the identifier.
- **`errgroup.SetLimit` in real bounded fan-outs** (satisfies rule 2): `cli/cli@9b031151a825:pkg/cmd/release/shared/upload.go:118` (`g.SetLimit(numWorkers)`), `restic/restic@5127c4abf921:internal/backend/sftp/sftp.go:179` (`g.SetLimit(int(nconn))`), `restic/restic@5127c4abf921:internal/repository/repository.go:576` (`wg.SetLimit(2 + runtime.GOMAXPROCS(0))`) — the last one is itself another `wg`-named `errgroup.Group`, the same naming trap.
- **Unbounded fan-out** (violates rule 2, the corpus-wide pattern this dive's `fanout/unbounded` fixture measures the cost of): `grpc/grpc-go@acccf8cd101a:benchmark/client/main.go:150` and `containerd/containerd@934434dde54b:internal/cri/server/service.go:324`, both `for`-loops directly spawning `go func(...)` with no visible `SetLimit` or semaphore in the enclosing function ([exemplar-runtime-posture.md §3](../go-audit/exemplar-runtime-posture.md)).
- **The safe embedded-mutex idiom** (adjacent to rule 12, cited for completeness): `cockroachdb/pebble@13596f1e1cea:wal/failover_writer.go:355-358` embeds `sync.Mutex` inside an *unexported nested field* (`mu struct { sync.Mutex; ... }`) on an unexported type — mutex ergonomics without leaking `Lock`/`Unlock` into any exported method set.
- **goleak adoption is real but thin**: only `go.uber.org/goleak` imports across the corpus, concentrated in 3 of 34 repos, 19 importing files total ([exemplar-quality-gates.md §4](../go-audit/exemplar-quality-gates.md)) — the SHOULD in rule 9 is far from universal practice today, consistent with it being a SHOULD, not a MUST.
- **`testing/synctest` adoption**: 10 of 34 repos, 60 importing files ([exemplar-quality-gates.md §4](../go-audit/exemplar-quality-gates.md)) — newer and thinner still than goleak, consistent with its Go 1.25 GA date.

## AI-agent angle

- **Assuming `WaitGroup.Go` or `errgroup.Go` "handles" a panic in the task.** An LLM that has absorbed "errgroup is the safe way to run goroutines" often over-generalizes "safe" to include panic containment. Both explicitly do not (§7, source-confirmed). Smallest mechanical check: grep the function body spawned via `.Go(` for the presence of a `recover()` anywhere in its own body (not a caller's); its absence is not automatically wrong, but its presence should be expected wherever the generated code comment claims resilience to a failing task.
- **Treating a variable named `wg` as proof it is a `sync.WaitGroup`.** Both this dive's own fixture-writing and the exemplar corpus (`cli/cli`'s `var wg errgroup.Group`) show this is a real, not hypothetical, trap — an LLM generating a code review comment or a lint rule from a textual pattern match (`wg\.Go\(`) will misclassify. Smallest mechanical check: never grep for `wg.Go(` alone to identify `WaitGroup.Go` usage — grep for the declaration (`var\s+\w+\s+sync\.WaitGroup\b` or `:=\s*sync\.WaitGroup{}`) in the same file/function first, exactly the correction this dive's own audit sources record having had to make ([exemplar-runtime-posture.md §3](../go-audit/exemplar-runtime-posture.md), "these two needed splitting").
- **Reaching for `testing/synctest.Test` as a leak detector.** A model trained toward "newer stdlib package = the modern answer" may suggest `synctest.Test` where `goleak` is the tool that actually fits the job (§6, rule 10). The mechanical tell: if the test under discussion is not about *time-dependent* logic (fake clocks, `time.Sleep`/`Ticker` interaction), `synctest` is very likely the wrong recommendation regardless of Go version.
- **Suggesting an unbounded `errgroup.Go` loop as "idiomatic Go concurrency" for a size the caller controls (a file list, a page of API results, a CLI's positional args).** This is the single most common shape in the exemplar corpus itself (194 of 248 `errgroup.Go` sites lack `SetLimit`), so an LLM trained on that corpus will reproduce the majority-unsafe pattern by default, not the minority-safe one. Mechanical check: `grep -rn --include='*.go' -e '\.Go(func() error' -e 'go func(' . | xargs -r -I{} echo {}` (empty output means no candidate sites in that tree) and manually confirm a `SetLimit`/semaphore is reachable for each hit — no fully-mechanical check exists (rule 2's own verify column is a reading heuristic, not a lint) precisely because this pattern's safety is size-dependent, not syntax-dependent.
- **Suggesting `sync.Once` plus a captured error variable for fallible lazy init**, unaware that `OnceValue`/`OnceValues` (Go 1.21) already solve it correctly. This is squarely a "predates the training-data-common idiom" gap; the mechanical check is simply grepping for the older hand-rolled pattern (`sync.Once` immediately followed by an `if err != nil { return }` guard reading a package-level `var initErr error`) and suggesting the newer primitive.
- **Using `golang/mock` (archived 2024-01-08) in a generated concurrency test that mocks a channel-consuming interface.** Not concurrency-specific but frequently appears alongside goroutine/channel test scaffolding; the mechanical check is the same import-path grep any other dive would run (`go.uber.org/mock` is the live successor).
- **Assuming `-race` is a complete substitute for the reading heuristics in rules 1, 2, 3, 8.** This dive's own measurements (rule 3's 10/10 miss on `wg.Add`-inside-goroutine; rule 8's 1/5 catch on send-after-close) are the concrete evidence an agent can be pointed at when it defers a review finding with "but `-race` didn't flag it" — that is evidence of nothing for at least two of the eight shapes measured here.

## Contested / evolving

- **Whether `sync.WaitGroup.Go`'s lack of panic containment is a documentation gap or a deliberate design stance.** The doc comment ("The function f must not panic") reads, in isolation, like an unenforced precondition an agent might assume is aspirational. `errgroup`'s source comment, citing four separate golang/go issues, makes the *design intent* explicit for that package; no equivalent design-rationale comment exists in `sync/waitgroup.go` itself, only the shorter recover-then-repanic comment explaining why `Done` isn't called on panic. Treat both as settled the same way (§7) until or unless the Go team documents otherwise — the source-level evidence points the same direction for both, even though only one explains its own reasoning at length.
- **Whether the `goroutineleak` profile's global-variable blind spot should be read as a documented limitation or as motivation to avoid package-level state that anything blocks on.** The Go 1.27 release notes state the limitation plainly but do not recommend a workaround; this dive's own measurement confirms it, but the "so what" — whether library authors should now specifically avoid exposing a package-level channel/mutex a goroutine can block on, purely to stay legible to this specific detector — is not something either source argues for, and this dive does not either. Flagged as an open question for the `go-quality/api-design.md` dive (M-D-08, package-level mutable state), not resolved here.
- **The direction on `errgroup`'s first-error-cancels semantics for a "report every failure" command (M-C-04)** is stated in the summary and findings as a direction (`errors.Join` over a mutex-guarded collector, or a plain `WaitGroup`) but was not planted as a fixture in this pass — it is one dive's worth of work short of the same evidentiary standard as the rest of this file, and is named here rather than silently promoted to a numbered rule.
- **How much weight `-race`'s stated "catches about half of reproduced non-blocking bugs" (ASPLOS'19) should carry against this dive's own much smaller, much more favorable sample (3/4 planted shapes caught reliably, one caught 20% of the time).** The two are not in tension — this dive planted the *easy*, textbook cases the tool is best at; the academic number is over a much larger and more adversarial real-bug corpus. Both numbers are true; an agent citing either alone without the other's scope caveat overstates its confidence in `-race`.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [go.dev/wiki/CodeReviewComments#goroutine-lifetimes](https://go.dev/wiki/CodeReviewComments#goroutine-lifetimes) | Go team's own code-review wiki | living document, fetched 2026-09-26 | the shortest, most-cited normative statement of the ownership contract in §1 |
| [pkg.go.dev/sync](https://pkg.go.dev/sync) | stdlib package reference | current for go1.27.1, fetched 2026-09-26 | exact doc text for `WaitGroup.Go` (1.25), `OnceValue`/`OnceValues` (1.21) |
| [pkg.go.dev/golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup) | x/sync package reference | current, fetched 2026-09-26 | exact doc text for `Go`, `TryGo`, `SetLimit`, `WithContext`, `Wait` |
| [github.com/golang/go — src/vendor/golang.org/x/sync/errgroup/errgroup.go](https://github.com/golang/go/blob/master/src/vendor/golang.org/x/sync/errgroup/errgroup.go) (read locally at `v0.23.0` via the fixture module and `go1.27.1`'s own vendored copy) | the tool's own source | v0.23.0 / go1.27.1, read 2026-09-26 | the panic-non-propagation rationale in §7 is only in the source comment, not the rendered doc |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | official release notes | 2026-09-26 fetch, Go 1.25 (released ~mid-2026) | primary source for `WaitGroup.Go`'s introduction and `testing/synctest` GA |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | official release notes | 2026-09-26 fetch, Go 1.27 (Aug 2026) | primary source for the `goroutineleak` profile's GA status and its own stated reachability-analysis limitation, quoted verbatim in §6 |
| [go.dev/doc/articles/race_detector](https://go.dev/doc/articles/race_detector) | official race detector doc | 2026-09-26 fetch | primary source for `-race`'s scope statement ("can't find races in code paths that are not executed") and overhead numbers (5-10x memory, 2-20x CPU) |
| [github.com/uber-go/goleak — README.md](https://github.com/uber-go/goleak/blob/master/README.md) | the tool's own repository, raw README | `master`, fetched 2026-09-26 | primary source for `VerifyNone` vs `VerifyTestMain` and the documented `t.Parallel` blind spot |
| [github.com/uber-go/guide — style.md](https://github.com/uber-go/guide/blob/master/style.md) | Uber Go Style Guide, raw | `master`, fetched 2026-09-26 | §"Don't fire-and-forget goroutines" is the closest thing to a written spec for the ownership contract in §1; also source for "Channel Size is One or None" (§5) and "Don't Panic" |
| [100go.co](https://100go.co/) | "100 Go Mistakes" companion site | fetched 2026-09-26 | #62-#74 name the concurrency mistake catalogue this dive's fixtures are drawn from (goroutine lifetime, loop-var capture, channel size, append races, WaitGroup misuse, errgroup, copying sync types) |
| [arxiv.org/html/2204.00764v2](https://arxiv.org/html/2204.00764v2) — "A Study of Real-World Data Races in Golang" (Uber, PLDI 2022) | peer-reviewed industrial study | published 2022, fetched 2026-09-26 | the quantified root-cause counts (391 slice, 223 closure, 38 map, 24 WaitGroup) this dive's fixtures are directly modeled on |
| [blog.acolyer.org — "Understanding Real-World Concurrency Bugs in Go" (ASPLOS 2019 summary)](https://blog.acolyer.org/2019/05/17/understanding-real-world-concurrency-bugs-in-go/) | summary of Tu et al., ASPLOS 2019 | published 2019, fetched 2026-09-26 | primary source for the measured, counter-intuitive detection-tool efficacy numbers (`-race` catches ~half of non-blocking bugs; deadlock detection catches 2/21) |
| `go1.27.1` toolchain source, read locally via `run.sh go env GOROOT` | the Go distribution's own source | go1.27.1, read 2026-09-26 | `src/sync/waitgroup.go:236-260` (WaitGroup.Go panic handling), `src/testing/synctest/synctest.go` (durably-blocked definition, `Test`'s doc), `src/runtime/pprof/pprof.go` (`goroutineleak` profile registration), `src/cmd/vet/testdata/waitgroup/waitgroup.go` and `src/cmd/vendor/.../waitgroup/doc.go` (exact vet analyzer message and rationale) |
| [go-audit/exemplar-runtime-posture.md §3](../go-audit/exemplar-runtime-posture.md) | this program's own wave-1 audit | 2026-09-26 | the corpus-wide `errgroup`/`SetLimit`/`WaitGroup.Go` counts this dive's Findings §2 and §4 build on, plus the `wg`-naming-trap correction this dive independently reproduced |
| [go-topic-map/failure.md §3-9](../go-topic-map/failure.md) | this program's own wave-1 consolidation | 2026-09-26 | first pass over the PLDI'22/ASPLOS'19/goleak/LeakProf material this dive re-fetched and re-verified directly |

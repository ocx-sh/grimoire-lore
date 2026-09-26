---
title: Goroutines, Context and Cancellation
summary: The GO-CONC family. The context.Context contract, goroutine ownership and leak detection, bounded fan-out, choosing a group primitive, the races vet and -race miss, typed atomics, and cancellation causes
---

# Goroutines, Context and Cancellation

Owns who starts a goroutine and who joins it, how many run at once, which group primitive reports
failures, channel close discipline, shared-state races, lock copies, typed atomics, and the whole
`context.Context` contract: position, flow, storage, values, `cancel`, causes and detaching. Not owned
here: the subprocess (`exec.Command`, `WaitDelay`, process groups) is `GO-IO`, and the `os/exec` half
of `noctx` is `GO-IO-01`. A CLI's signal wiring and exit status are `GO-CLI-08`, and batch exit-code
selection is `GO-CLI-18`, both `GO-CLI`. The SDK timeout's type is `GO-API-20` (`GO-API`) and
`GO-ERR-20` (`GO-ERR`, which also owns panic policy). HTTP deadlines and the stream-stall watchdog are
`GO-NET-06` (`GO-NET`). The `-race` lane is `GO-TEST-09` and `synctest` is `GO-TEST-11` (`GO-TEST`).
The `goroutineleak` profile in a long-running process is `GO-OBS`. Linter config text is `GO-GATE`
(`GO-GATE-09`, `GO-GATE-15`, `GO-GATE-22`), so this file names linters and never pastes YAML. **SDK**
means the pinned default shape, a stdlib-only library that wraps a CLI. Without one, read "library".

Contents: [Dates and Floors](#dates-and-floors) · [The Context Linters](#the-context-linters) ·
[The Vet Step](#the-vet-step) · [The Race Lane](#the-race-lane) · [Leak Detection](#leak-detection) ·
[The Fixer](#the-fixer) · [Reading Heuristics](#reading-heuristics) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0, staticcheck 2026.2.1, goleak v1.3.0 and
`golang.org/x/sync` v0.23.0, unless a row says read.

- **Pinned default (Q1), the adopter may override:** libraries and the SDK declare `go 1.26.0`, CLIs
  `go 1.27.0` plus a `toolchain` line. Both meet every go-line floor below.
- Go-line gated: `WithCancelCause`, `WithTimeoutCause`, `AfterFunc`, `WithoutCancel` and
  `sync.OnceValue(s)` (go 1.21), `t.Context()` (go 1.24), `sync.WaitGroup.Go` (go 1.25).
- Toolchain gated: the vet `waitgroup` analyzer (1.25), `NotifyContext`'s cause (1.26), the
  `atomictypes` fixer and the GA `goroutineleak` profile (1.27).
- `NotifyContext`'s cause is an unexported string with no signal accessor (Go 1.27.1
  `os/signal/signal.go`, read 2026-09-26).
- `time.After` in a `select` loop stopped leaking at go 1.23 and the `asynctimerchan` opt-out is gone
  at toolchain 1.27. No row here flags it.

## The Context Linters

```bash
golangci-lint run ./...
golangci-lint run --enable-only=contextcheck,containedctx,noctx,fatcontext ./...
```

The first is the gate: `contextcheck`, `containedctx`, `noctx`, `fatcontext`, `staticcheck` and revive
`context-as-argument` are all in the `GO-GATE-09` baseline, tests included (the test fix is `t.Context()`).
The second serves a Go-team-shape repo (bare `go vet` plus standalone `staticcheck`). `0 issues.` is the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CONC-01 | Take `ctx context.Context` as the first parameter of every function that can block, be cancelled or time out, and pass it (or a `With*`-derived child) to every callee. Call `context.Background()` only in `main`, `init` and top-level test or benchmark setup (tests use `t.Context()`). Never pass `nil`, and never ship `context.TODO()` in library or SDK code. | A callee that restarts from `Background()` disconnects the caller's cancellation from everything below it. The corpus had 964 `Background()` and 275 `TODO()` calls outside `package main`, and one `TODO()` in a popular CLI library amplified into 152 `contextcheck` reports along its call chain. | golangci-lint `contextcheck` for the broken chain (fix the tail of the reported chain, not each caller). revive `context-as-argument` for the position. staticcheck `SA1012` for a literal `nil`, which misses `nil` passed through a function value. Watched red on a planted restart, a second-position `ctx` and a `nil` literal, each exit 1 against a clean twin at exit 0. `0 issues.` is the pass. | MUST |
| GO-CONC-02 | Never store a `context.Context` in a struct field, and never accept one through a functional option (no `WithContext` option). A type that owns background work stores `cancel context.CancelFunc` plus a done channel or `WaitGroup`. The one exception is a type that predates `context` and cannot change its signatures (cobra's `Command`), marked `//nolint:containedctx // Command predates context, see Context()` (rename to your type and accessor). | A stored context outlives the call it scoped and gets reused across unrelated calls (go.dev/blog/context-and-structs). The corpus had 219 to 249 such fields in 15 of 34 repos, and the `WithContext` option idiom produced a real stored-context field in a major Go client. | golangci-lint `containedctx`. It has no built-in exceptions, so every hit is fixed or carries the reasoned `nolint`. Watched red: 8 hits across 4 exemplar repos, the cobra hit being the retrofit exception. `0 issues.` is the pass. | MUST |
| GO-CONC-03 | Call the context-taking form of every blocking `net/http` and `net` call, in tests too: `http.NewRequestWithContext`, `(*net.Dialer).DialContext`, `(*net.ListenConfig).Listen`, `(*net.Resolver).LookupIPAddr`. Never `http.Get`, `http.Post`, `http.Head`, `http.NewRequest`, `net.Dial`, `net.Listen` or `net.LookupIP`. The `os/exec` form is `GO-IO-01`. | The non-context forms cannot be cancelled or given a deadline. Across 8 gate repos `noctx` found 91 hits, 71 of them in `_test.go`, and none was a wrong detection. | golangci-lint `noctx`, which also reports `exec.Command` for `GO-IO-01`. Grep fallback for a repo without golangci: `grep -rn --include='*.go' -e 'http\.NewRequest(' -e 'http\.Get(' -e 'http\.Post(' -e 'http\.Head(' -e 'net\.Dial(' -e 'net\.Listen(' -e 'net\.LookupIP(' .` Empty output (grep) or `0 issues.` (noctx) is the pass. Both watched: 3 hits on the planted file, empty on the twin. | MUST |
| GO-CONC-04 | Key `context.WithValue` with an unexported type the package defines (`type ctxKey struct{}`), never a `string` or other built-in type. Use values only for request-scoped data crossing an API you do not own (trace IDs), never as a hidden optional parameter. | A built-in key collides across packages, and a value-smuggled dependency is invisible to the compiler. | staticcheck `SA1029` for the key type, watched red (exit 1 against twin exit 0). Empty output (staticcheck) or `0 issues.` is the pass. Scope is a reading heuristic: "would an explicit parameter change every caller's signature in an obviously correct way? Then it is a parameter." | MUST (key type) · SHOULD (scope) |
| GO-CONC-05 | Never reassign `ctx = context.WithValue(ctx, …)` (or any `With*`) inside a loop or a repeatedly invoked closure. Derive a loop-scoped `child := …` from the unchanged parent. | Each pass chains a node, so lookups become O(n) and the cancellation tree grows for the life of the loop. | golangci-lint `fatcontext` (`nested context in loop`), watched red on a planted loop and clean on the twin. `0 issues.` is the pass. | SHOULD |

## The Vet Step

```bash
go vet ./...
```

Its own gate step (`GO-GATE-02`): `go test` runs 12 of vet's 35 analyzers on Go 1.27.1 and none of the three
below. golangci `govet` at its defaults runs all three. Empty output and exit 0 are the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CONC-06 | Call every `cancel` from `WithCancel`, `WithTimeout`, `WithDeadline` and their `*Cause` variants on every path, by `defer cancel()` on the next line. A `cancel` stored for later carries a one-line comment naming who calls it and when. | An uncalled cancel keeps the child and its timer alive until the parent is cancelled, which for a `Background()` root is never. | `go vet ./...` `lostcancel` (control-flow sensitive). Watched: `go test` exit 0, `go vet` exit 1 on the same planted skip. Empty output is the pass. | MUST |
| GO-CONC-07 | In a go 1.25 or later module, start counted goroutines with `wg.Go(f)`. Below 1.25, call `wg.Add` before the `go` statement, never inside the spawned goroutine. | `Wait` can return before the goroutine registers. Uber's PLDI'22 study attributes 24 production races to this shape, and `-race` missed it 10 runs in 10. | `go vet ./...` `waitgroup` (`WaitGroup.Add called from inside new goroutine`), watched exit 1 against twin exit 0. The `waitgroupgo` fixer under `go fix -diff ./...` (`GO-GATE-03`) rewrites the `Add`/`go`/`Done` triad and is a different tool. Empty output is the pass. | MUST |
| GO-CONC-08 | Never copy a `sync.Mutex`, `RWMutex`, `WaitGroup`, `Once` or `Cond` after first use: not through a value receiver, a struct assignment, a `range` value copy or a by-value parameter. Pass pointers, or put the lock in an unexported field of a type used only by pointer. | A copied mutex starts unlocked and silently stops excluding. | `go vet ./...` `copylocks` (`passes lock by value`). Watched: `go test` exit 0, `go vet` exit 1. Empty output is the pass. | MUST |

## The Race Lane

```bash
go test -race -count=3 ./...
```

The lane is `GO-GATE-04`, on the Linux leg only (**pinned default**, the adopter may override). `WARNING: DATA RACE`
is the finding and exit 0 the pass. It is necessary, not sufficient: see `GO-CONC-07` and `GO-CONC-15`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CONC-09 | A variable a goroutine writes is written by exactly that goroutine and read only after the join. Give each goroutine its own slot (a pre-sized slice index or its own variable). Guard anything written by more than one goroutine with a mutex, or replace it with a channel send or `errgroup`'s returned error. Never `append` to a shared slice, write a shared map, or assign a shared `err` from several goroutines. | These are the top Go-specific race causes in Uber's PLDI'22 data: slices 391, closure capture 223 (50 of them a captured `err`), maps 38. A concurrent map write also crashes unraced, but only 2 runs in 5. Single-writer plus a read after `Wait` is race-free by `WaitGroup.Go`'s happens-before guarantee. | `go test -race -count=3 ./...`. Watched: the append, closure-`err` and map plants each exit 1 in 3 of 3 runs, and the twins exit 0. Exit 0 is the pass. | MUST |

```go
// wrong: every goroutine appends to one slice, a race -race reports
for _, u := range urls {
	g.Go(func() error {
		b, err := fetch(ctx, u)
		out = append(out, b)
		return err
	})
}

// right: bounded, and each goroutine owns one slot, read only after Wait
out := make([][]byte, len(urls))
g.SetLimit(8)
for i, u := range urls {
	g.Go(func() error {
		b, err := fetch(ctx, u)
		out[i] = b
		return err
	})
}
err := g.Wait()
```

## Leak Detection

With `func TestMain(m *testing.M) { goleak.VerifyTestMain(m) }` in place, `go test ./...` is the gate and
`goleak: … found unexpected goroutines` the finding. `goleak-coverage` prints each directory that starts a
goroutine (a `go` statement, `.Go(`, `.TryGo(` or `iter.Pull`) with no `VerifyTestMain`. Empty output is the pass.

```bash
# goleak-coverage (bash or zsh): each printed directory is a finding
comm -23 \
  <(grep -rl --include='*.go' --exclude='*_test.go' -e '[[:space:]]go [[:alnum:]_.]*(' \
      -e '\.Go(' -e '\.TryGo(' -e 'iter\.Pull' . | xargs -r -n1 dirname | sort -u) \
  <(grep -rl --include='*_test.go' -e 'goleak\.VerifyTestMain' . | xargs -r -n1 dirname | sort -u)
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CONC-10 | Give every goroutine an owner. A `go` statement or `.Go(` call has its join (`Wait`, a `<-done` receive, `errgroup.Wait`) in the same function, or behind an exported `Close`, `Shutdown` or `Stop` that calls the stored `cancel` and waits. A goroutine meant to outlive its starter says so in a comment naming its owner and exit condition. **Pinned default for the SDK:** it starts no background goroutine, and every stream pump is joined before the method returns. | A blocked goroutine is never collected. Uber found 857 leaks in about 75M lines (Go Code Review Comments, Goroutine Lifetimes). | Reading heuristic "every `go` or `.Go(` has a reachable join or a named owner". No analyzer in golangci-lint v2.14.0 or staticcheck 2026.2.1 attempts it, because a join point is undecidable through arbitrary plumbing. `GO-CONC-11` catches the consequence: a planted unjoined start exits 1, the joined twin 0. | MUST |
| GO-CONC-11 | Call `goleak.VerifyTestMain(m)` in the `TestMain` of every package that contains a `go` statement, a `.Go(` or `.TryGo(` call, or `iter.Pull`. Use `VerifyTestMain`, not per-test `VerifyNone`, whenever tests use `t.Parallel`. Never use `synctest.Test` as a leak detector. **Pinned default, the adopter may override:** goleak is a test-only SDK dependency beside go-cmp. | On the same three planted leaks goleak caught 3 of 3, while `synctest` and the `goroutineleak` profile each caught 1 of 3. `synctest` hangs to `-timeout` on I/O-blocked or global-held goroutines, and the profile misses those by design. A stdlib `runtime.Stack` diff was rejected because it fails on compliant `signal.NotifyContext` code. | `go test ./...` with the `TestMain` (watched exit 1 on all three shapes, twin exit 0). Coverage: `goleak-coverage` above, watched on a named-function `go` statement and an `iter.Pull` package (both printed, twin empty). Empty output is the pass. | MUST (SDK, libraries) · SHOULD (CLIs) |

## The Fixer

```bash
go fix -diff ./...
```

Runs once, on the stable leg (`GO-GATE-01`), because the fixer set depends on the toolchain. A non-empty diff
and exit 1 are the finding, and empty output is the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CONC-12 | Use typed atomics (`atomic.Int64`, `atomic.Bool`, `atomic.Pointer[T]`) for fields accessed atomically. Never the `atomic.AddInt64(&x, …)` function family on a plain field, and never `go.uber.org/atomic`. | A plain `int64` field invites a non-atomic access elsewhere, and the typed field makes that impossible. Typed atomics are already 69% of corpus use, and the wrapper-library advice is stale. | `go fix -diff ./...` (`atomictypes`, toolchain 1.27). Watched: exit 1 with the `n int64` to `n atomic.Int64` hunk, twin exit 0. Empty output is the pass. Types: go 1.19. | SHOULD |

## Reading Heuristics

No analyzer exists for these. Each row names its heuristic and a work-list grep whose hits are read, not counted.
Empty output means the row does not apply. Run the fan-out triage on every diff:

```bash
grep -rn --include='*.go' -B3 -e 'go func(' -e '\.Go(func' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CONC-13 | Bound every fan-out whose size comes from input, the wire, a directory listing or CLI arguments: `errgroup.SetLimit(n)`, `TryGo` for drop-or-requeue, `x/sync/semaphore`, or a counting channel. A bare `for` feeding `go` or `g.Go` is allowed only over a small, code-fixed N. **Pinned default for CLIs:** size the limit from a flag or `GOMAXPROCS`. | 194 of 248 corpus `errgroup.Go` sites (78%) have no `SetLimit`, and agents copy the majority shape. Planted at 10,000 items, the unbounded form peaked at 4,934 live goroutines against 10 with `SetLimit(8)`. | Reading heuristic "a `for` or `range` over caller-sized data containing `go` or `.Go(` with no `SetLimit`, semaphore acquire or worker-pool bound in the function". Work list: the triage grep above. Safety depends on size, not syntax, so no mechanical check exists. | MUST |
| GO-CONC-14 | Choose the group primitive by how failures are reported: `sync.WaitGroup.Go` (go 1.25) when no task can fail, `errgroup.WithContext` plus `SetLimit` when the first failure should cancel the rest, and a `WaitGroup` plus a mutex-guarded `[]error` returned through `errors.Join` when the command must report every failure (batch validate, multi-push). Check the declared type, not the name: `var wg errgroup.Group` exists. | `errgroup.Wait` returns only the first non-nil error. Planted on a 3-failure batch, `errgroup` delivered 1 of 3 errors and the join delivered 3 of 3. | Reading heuristic "a report-every-failure command whose group is an `errgroup`". Work list: `grep -rn --include='*.go' -e 'errgroup\.Group' -e 'errgroup\.WithContext' .` Empty output means the row does not apply. | SHOULD |
| GO-CONC-15 | Close a channel exactly once, from the single goroutine that owns sending, after a barrier (`wg.Wait()`) over every sender. A receiver never closes. Buffers are 0 or 1 unless a comment states what bounds the size and what happens when it fills. | Double close and send-after-close panic the process, and `-race` flagged send-after-close in only 1 run in 5. Message-passing blocking bugs are at least as common as shared-memory ones (ASPLOS'19). | Reading heuristic "each `close(` sits in the designated sender after its barrier". Work list: `grep -rn --include='*.go' -e 'close(' .` Empty output means the row does not apply. A single green `-race` run is not evidence. | SHOULD |
| GO-CONC-16 | Do not blanket-`recover` in library or SDK goroutines. Recover only where a goroutine runs code the package does not own (a caller-supplied callback, such as the SDK's progress callback) or at the top of a long-running daemon loop. There, capture `debug.Stack()` and report through the owner's error channel or logger. Never swallow the value. | `WaitGroup.Go` and `errgroup.Go` both let a task panic kill the process, and errgroup documents why propagating would be worse. A library panic is an invariant bug under `GO-ERR`'s policy, and crashing keeps its stack. | Reading heuristic "every `go` or `.Go(` that invokes a caller-supplied func has a deferred recover-and-report, and no other one does". Work list: `grep -rn --include='*.go' -e 'recover()' .` Empty output means no recover exists to audit. `errcheck` flags a bare discarded `recover()`. | SHOULD |
| GO-CONC-17 | Attach a cause wherever a cancellation's reason must reach a caller. **Pinned default for the SDK:** wrap its own timeout as `context.WithTimeoutCause(ctx, d, &TimeoutError{…})`, the typed cause `GO-API-20` owns and `GO-ERR-20` defines (its `Is` target is the exported sentinel, pinned default `ErrOcxTimeout`, which the adopter renames once), and report `context.Cause(ctx)`. `cancel` on a `CancelCauseFunc` takes an error, and a plain `CancelFunc` takes none. A CLI's exit status after a signal is `GO-CLI-08`'s, never parsed from `NotifyContext`'s cause. | Plain `WithTimeout` collapses every deadline to `DeadlineExceeded`, so a caller cannot tell the SDK budget from its own deadline. `NotifyContext`'s cause is an unexported string (see Dates and Floors). | Reading heuristic "a `WithTimeout` or `WithDeadline` whose expiry a caller must tell apart is a `*Cause` variant". Work list: `grep -rn --include='*.go' -e 'context\.WithTimeout(' -e 'context\.WithDeadline(' .` Empty output means the row does not apply. Proven unlintable: the full linter set reported `0 issues` on a cause-losing plant. | SHOULD |
| GO-CONC-18 | Build fallible or expensive lazy initialization with `sync.OnceValue` or `OnceValues`, not `sync.Once` plus a captured error variable. Never memoize a transient failure (network, subprocess): retry sits above the memoization. | `OnceValue(s)` re-delivers the same value, error or panic on every call. Hand-rolled versions forget the error path. | Reading heuristic "a `sync.Once` whose `Do` body assigns an `error`". Work list: `grep -rn --include='*.go' -e 'sync\.Once' .` Empty output means the row does not apply. | SHOULD |
| GO-CONC-19 | Detach work that must outlive its request with `context.WithoutCancel(ctx)`, which keeps values and drops cancellation and deadline, and never use it to silence a cancellation error. Replace a goroutine that only waits on `<-ctx.Done()` with `stop := context.AfterFunc(ctx, f)`, and call `stop()` once the callback is no longer wanted. | Both are go 1.21 APIs with near-zero adoption (48 and 16 corpus hits) that replace hand-rolled goroutines, and each hand-rolled one is a `GO-CONC-10` owner to track. | Reading heuristic "a goroutine whose body is a `<-ctx.Done()` receive followed by cleanup is an `AfterFunc`". | CONSIDER |

```go
// wrong for "report every failure": Wait returns the first error only
return g.Wait()

// right: bounded, every error collected, joined after the barrier
sem := make(chan struct{}, 8)
for _, p := range pkgs {
	sem <- struct{}{}
	wg.Go(func() {
		defer func() { <-sem }()
		if err := verify(ctx, p); err != nil {
			mu.Lock()
			errs = append(errs, err)
			mu.Unlock()
		}
	})
}
wg.Wait()
return errors.Join(errs...)
```

## What Agents Get Wrong Here

1. **An unbounded `errgroup.Go` or `go func` loop over caller-sized input.** 78% of corpus sites lack a limit, so training data teaches it. `GO-CONC-13`.
2. **A `context.Background()` or `TODO()` inside a helper "to be safe"**, or `TODO()` shipped in a library. `contextcheck` names the root. `GO-CONC-01`.
3. **`http.NewRequest`, `http.Get` or `net.Dial`**, because training data is dominated by them. `noctx`. `GO-CONC-03`.
4. **Adding `ctx` to a client struct, or a `WithContext` option, to avoid threading it.** `containedctx`. `GO-CONC-02`.
5. **Treating a green `-race` as proof of ordering.** It missed `wg.Add` inside the goroutine 10 times in 10 and caught send-after-close 1 time in 5. `GO-CONC-07`, `GO-CONC-15`.
6. **Assuming `errgroup.Go` or `wg.Go` contain panics**, or the reverse, wrapping every goroutine in a blanket `recover`. `GO-CONC-16`.
7. **Classifying a group by the name `wg`.** `var wg errgroup.Group` exists. Read the declaration before choosing between `GO-CONC-07` and `GO-CONC-14`.
8. **Recommending `synctest.Test` as a leak detector.** It hangs on I/O-blocked goroutines, and a test not about fake time does not need it. `GO-CONC-11`.
9. **Inventing a typed signal accessor on `context.Cause` after `NotifyContext`, or calling `cancel(err)` on a plain `CancelFunc`.** `go build ./...` fails on both. `GO-CONC-17`.
10. **Flagging `time.After` in a `select` loop as a goroutine leak, or writing `Timer.Stop`-and-drain code.** Both are obsolete at go 1.23 and later (opt-out gone at toolchain 1.27). The only remaining objection is a per-iteration allocation.
11. **`sync.Once` plus a package-level `initErr`.** `GO-CONC-18`.

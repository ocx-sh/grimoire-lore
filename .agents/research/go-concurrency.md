---
title: "Goroutines and context — consolidated (GO-CONC)"
topic: go-concurrency
model: opus
id_family: GO-CONC
consolidates:
  - go-concurrency/goroutine-ownership.md
  - go-concurrency/context-contract.md
date: 2026-09-26
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/go-concurrency/ (this consolidation), plus the dives' goroutine-ownership/ and context-contract/
versions: Go 1.27.1 (GOTOOLCHAIN=local), golangci-lint 2.14.0, staticcheck 2026.2.1 (bundled 0.8.1), goleak v1.3.0, x/sync v0.23.0
---

# Goroutines and context — consolidated (GO-CONC)

Source keys: [own](go-concurrency/goroutine-ownership.md) ·
[ctx](go-concurrency/context-contract.md) ·
[run](go-audit/exemplar-runtime-posture.md) ·
[shape](go-audit/exemplar-code-shape.md) ·
[gates](go-audit/exemplar-quality-gates.md) ·
[cfg](go-audit/config-inventory.md) ·
[gatecmd](go-gates/gate-commands.md) ·
[sig](go-cli/exit-codes-and-signals.md) ·
[pec](go-errors/panics-exits-cleanup.md) ·
[sub](go-io/subprocess-contract.md) ·
[test](go-testing.md) ·
[map](go-topic-map.md) ·
**[C-n]** = a run made for this consolidation (table after the ruleset).

## Verdict

1. **Context is a parameter.** It is always a parameter, never state. `ctx` comes first. It flows unbroken from the entrypoint (`main`, a handler's `r.Context()`, a test's `t.Context()`) to every blocking call.
   - `context.Background()` and `context.TODO()` appear only at entrypoints.
   - `TODO()` never ships in library code: one `TODO()` in urfave/cli produced 152 `contextcheck` reports **[C-3]**.
   - This binds every code kind. `contextcheck`, `containedctx` and `noctx` are gate linters, not advice. They cleared the ≤ 1 FP/10k LOC bar on 6 of the 8 gate-measurement repos **[C-3]**.
2. **A type that owns background work stores its `cancel` func and a done signal, never the `ctx`.**
   - The SDK never offers a `WithContext` functional option. That idiom caused the one `contextcheck` false positive in [ctx] and the `sessionOptions.ctx` field in etcd.
   - The only exception is a type that predates `context` and cannot change its signatures (cobra's `Command`). It is marked `//nolint:containedctx`.
3. **Every goroutine has an owner and a join point the caller can reach.** Library, SDK and CLI code all follow this. For the SDK and library packages, `goleak.VerifyTestMain` is the mechanical proxy and is required. For CLIs it is recommended.
   - goleak is the test-time detector because it caught all three planted leak shapes.
   - `testing/synctest` is not a leak detector. The `goroutineleak` profile belongs to long-running processes and the `go-diagnose` skill, not to tests. Each of the two caught 1 of 3 [own].
4. **A fan-out whose size comes from data or the wire is bounded, always.** Unbounded fan-out over 10,000 items peaked at 4,934 goroutines against 10 with `SetLimit(8)` [own]. No analyzer catches this, so it is a MUST enforced by reading.
5. **Choose the primitive by how failures are reported:**
   - `sync.WaitGroup.Go` (go ≥ 1.25) for tasks that cannot fail;
   - `errgroup` + `SetLimit` for fail-fast;
   - a collector plus `errors.Join` for commands that must report every failure (batch validate, multi-push).
6. **`-race` is necessary and not sufficient.** It missed `wg.Add` inside the goroutine 10 times out of 10, and caught send-after-close only 1 time in 5 [own]. So `go vet` (`waitgroup`, `copylocks`, `lostcancel`) is a separate, mandatory step (GO-GATE-COMMANDS-02).
7. **Panics.** `WaitGroup.Go` and `errgroup.Go` do not contain panics, and the program does not make library goroutines blanket-recover either.
   - A panic in library or SDK code is an invariant bug (GO-ERR), and crashing preserves its stack.
   - `recover` belongs only where a goroutine runs code the package does not own (caller callbacks), or at the top of a long-running daemon loop.
   - This decision overrides [own] rule 5 (conflict 3).
8. **Cancellation causes.** The SDK wraps its own timeout in `WithTimeoutCause` so callers can tell "the SDK budget expired" apart from their own deadline. A CLI takes its exit status from a typed `signal.Notify` channel, not from parsing `NotifyContext`'s cause (conflict 2).

## The ruleset

Gate config assumed by the verification cells, as a fragment of the GO-GATE-owned `.golangci.yml`:

```yaml
version: "2"
linters:
  enable: [govet, staticcheck, contextcheck, containedctx, noctx, fatcontext, revive]
  settings:
    revive:
      rules:
        - name: context-as-argument
```

A repo on the Go-team shape (bare `go vet` + standalone `staticcheck`, [map] conflict 2) gets the vet and SA rows. It must still run the four context linters through `golangci-lint run --enable-only=contextcheck,containedctx,noctx,fatcontext`.

### GO-CONC — checked by the context linters and staticcheck (golangci-lint)

**GO-CONC-01 — Take `ctx context.Context` as the first parameter of every function that can block, be cancelled or time out, and pass it (or a `With*`-derived child) to every callee.**
- Call `context.Background()` only in `main`, `init` and top-level test or benchmark setup (tests use `t.Context()`, GO-TEST).
- Never pass `nil`.
- Never ship `context.TODO()` in library or SDK code.
- **Rationale:** a callee that restarts from `Background()` disconnects the caller's cancellation from everything below it. The corpus has 964 `Background()` and 275 `TODO()` calls outside `package main` [run §2] and 144 functions where `ctx` is not first [run §2].
- **Verification:**
  - golangci-lint `contextcheck` for the broken chain;
  - `revive` `context-as-argument` for the position;
  - staticcheck `SA1012` (default-on) for a literal `nil`. It misses `nil` passed through a function value [ctx fixture h v1].
- **Watched red:**
  - [ctx] a-restart: exit 1 → 0, `Non-inherited new context`.
  - **[C-1]** `context-as-argument`: exit 1 → 0.
  - [ctx] h-nilctx v2: `SA1012`, exit 1 → 0.
- **Severity:** MUST. Floor: none.

**GO-CONC-02 — Never store a `context.Context` in a struct field, and never accept one through a functional option. A type that owns background work stores `cancel context.CancelFunc` plus a done channel or `WaitGroup`.**
- The one exception is retrofitting a type that predates `context` and whose method signatures cannot change. Mark the field `//nolint:containedctx // <type> predates context; see <accessor>`.
- **Rationale:** a stored context outlives the call it scoped and gets reused across unrelated calls ([go.dev/blog/context-and-structs](https://go.dev/blog/context-and-structs), [Style Decisions §Contexts](https://google.github.io/styleguide/go/decisions#contexts)). The corpus has 219–249 such fields in 15/34 repos [shape §6, run §2].
- **Verification:** golangci-lint `containedctx`. It has no built-in exceptions, so every hit is either fixed or carries the reasoned `nolint`.
- **Watched red:** [ctx] b-structfield, exit 1 → 0. **[C-3]** 8 hits across ko, oras-go, regclient and cobra; the cobra hit is the retrofit exception.
- **Severity:** MUST. Floor: none.

**GO-CONC-03 — Call the context-taking form of every blocking stdlib call, in tests too (`t.Context()`):**
- `exec.CommandContext`;
- `http.NewRequestWithContext`;
- `(*net.Dialer).DialContext`;
- `(*net.ListenConfig).Listen`;
- `(*net.Resolver).LookupIPAddr`.

Never call `exec.Command`, `http.Get`/`Post`/`Head`, `http.NewRequest`, `net.Dial`, `net.Listen` or `net.LookupIP`.
- **Rationale:** the non-context forms cannot be cancelled or given a deadline. `exec.Command` is still 76% of subprocess starts (443 vs 141) nine years after `CommandContext` shipped [run headline]. `CommandContext` alone does not bound pipe-holding descendants; `WaitDelay` is GO-IO's rule [sub].
- **Verification:** golangci-lint `noctx`. It covers `os/exec` and the `net` family at 2.14.0 (map row M-G-08 resolved: yes). The grep fallback for a repo without golangci:

  ```sh
  grep -rn --include='*.go' -e 'exec\.Command(' -e 'http\.NewRequest(' -e 'http\.Get(' -e 'http\.Post(' -e 'http\.Head(' -e 'net\.Dial(' -e 'net\.Listen(' .
  ```

  Empty output means pass.
- **Watched red:**
  - [ctx] g-exectx: 2 issues, exit 1 → 0.
  - [sub] gosec-noctx twin: exit 1 → 0.
  - **[C-3]** 91 hits on 7/8 repos, 71 of them in `_test.go`. All were the non-context API, so none were false detections.
- **Severity:** MUST. Floor: none.

**GO-CONC-04 — Key `context.WithValue` with an unexported type the package defines (`type ctxKey struct{}`), never a `string` or other built-in type. Use values only for request-scoped data that crosses an API you do not own (trace IDs), never as a hidden optional parameter.**
- **Rationale:**
  - A built-in key collides across packages ([pkg.go.dev/context](https://pkg.go.dev/context)).
  - A value-smuggled dependency is invisible to the compiler ([ctx] §5, Merovius).
- **Verification:**
  - staticcheck `SA1029` (default-on once staticcheck runs) for the key type.
  - Reading heuristic for scope: "would an explicit parameter change every caller's signature in an obviously correct way? Then it is a parameter."
- **Watched red:** [ctx] e-stringkey, `SA1029`, exit 1 → 0.
- **Severity:** MUST (key type); the scope clause is SHOULD. Floor: none.

**GO-CONC-05 — Never reassign `ctx = context.WithValue(ctx, …)` (or any `With*`) inside a loop or a repeatedly invoked closure. Derive a loop-scoped `ctx := …` from the unchanged parent.**
- **Rationale:** each pass chains a node, so lookups become O(n) and cancellation trees grow for the life of the loop.
- **Verification:** golangci-lint `fatcontext`, a signal linter: 0/2/0 in the strict run [gates §5], 2 plausible hits in oras-go tests **[C-3]**.
- **Watched red:** [ctx] f-valueloop, exit 1 → 0.
- **Severity:** SHOULD. Floor: none.

### GO-CONC — checked by `go vet` (its own gate step, GO-GATE-COMMANDS-02; `go test` runs none of these)

**GO-CONC-06 — Call every `cancel` from `WithCancel`/`WithTimeout`/`WithDeadline` and their `*Cause` variants on every path, by `defer cancel()` on the next line.**
- A `cancel` stored for later carries a one-line comment naming who calls it and when.
- **Rationale:** an uncalled cancel keeps the child and its timer alive until the parent is cancelled, which for a `Background()` root is never. There are 268 not-immediately-deferred sites; `etcd …/watch_broadcast.go:46` is a legitimate stored one [run §2].
- **Verification:** `go vet ./...` `lostcancel`, control-flow sensitive, or golangci `govet` at defaults.
- **Watched red:** [ctx] c-cancelskip: 2 findings, exit 1 → 0. [gatecmd] `lostcancel`: `go test` exit 0, `go vet` exit 1.
- **Severity:** MUST. Floor: none.

**GO-CONC-07 — In a go ≥ 1.25 module, start counted goroutines with `wg.Go(f)`. Below 1.25, call `wg.Add` before the `go` statement, never inside the spawned goroutine.**
- **Rationale:** `Wait` can return before the goroutine registers. PLDI'22 attributes 24 production races to this shape. `-race` missed it 10/10 [own §3].
- **Verification:**
  - `go vet ./...` `waitgroup` analyzer (**Go 1.25**, conflict 1): `WaitGroup.Add called from inside new goroutine`.
  - The `waitgroupgo` fixer under `go fix -diff ./...` (GO-GATE-COMMANDS-04) rewrites the `Add`/`go`/`Done` triad. It is a different tool.
- **Watched red:** [own] run 1: `go vet` exit 1 → 0; run 1b: `-race -count=10` exit 0, the miss. [gatecmd] `waitgroup`.
- **Severity:** MUST. Floor: go 1.25 for `wg.Go`.

**GO-CONC-08 — Never copy a `sync.Mutex`, `RWMutex`, `WaitGroup`, `Once` or `Cond` after first use.** Copies happen through value receivers, struct assignment, `range` value copies and by-value parameters. Pass pointers, or put the lock in an unexported field of a type only used by pointer.
- **Rationale:** a copied mutex starts unlocked and silently stops excluding.
- **Verification:** `go vet ./...` `copylocks`. It is not in `go test`'s 11-analyzer subset.
- **Watched red:** [gatecmd] `copylocks`: `go test` exit 0, `go vet` exit 1 (`BadCopy passes lock by value`). [own] rule 12 did not re-plant it.
- **Severity:** MUST. Floor: none.

### GO-CONC — checked by the race lane (`go test -race`, GO-GATE-COMMANDS-08)

**GO-CONC-09 — A variable a goroutine writes is written by exactly that goroutine and read only after the join; anything else is guarded.**
- Give each goroutine its own slot (a pre-sized slice index or its own variable) and read after `Wait`.
- A variable, slice or map written by more than one goroutine is guarded by a mutex or replaced by a channel send or `errgroup`'s returned error.
- Never `append` to a shared slice, write a shared map, or assign a shared `err` from several goroutines.
- **Rationale:** these are Uber's top Go-specific race causes: slices 391, closure capture 223 (50 of them a captured `err`), maps 38 (PLDI'22 via [own §4]). A concurrent map write also crashes unraced, but only 2 runs in 5.
- **Verification:** `go test -race -count=3 ./...`; `WARNING: DATA RACE` is the finding. Single-writer-plus-`Wait` is race-free by `WaitGroup.Go`'s happens-before guarantee (`trivy …/client.go:62-64`).
- **Watched red:** [own] runs 2, 3, 4 (append, closure-`err`, map): exit 1 3/3 → twins exit 0.
- **Severity:** MUST. Floor: none.

### GO-CONC — checked by the package's test harness (goleak)

**GO-CONC-10 — Give every goroutine an owner.**
- A `go` statement or `.Go(` call has its join (`Wait`, a `<-done` receive, `errgroup.Wait`) in the same function, or behind an exported `Close`/`Shutdown`/`Stop` that cancels the stored `cancel` and waits.
- A goroutine meant to outlive its starter says so in a comment naming its owner and exit condition.
- **Rationale:** a blocked goroutine is never collected. Uber found 857 leaks in about 75M LOC ([failure §9](go-topic-map/failure.md); [Code Review Comments §Goroutine Lifetimes](https://go.dev/wiki/CodeReviewComments#goroutine-lifetimes); [Uber §Don't fire-and-forget goroutines](https://github.com/uber-go/guide/blob/master/style.md#dont-fire-and-forget-goroutines)).
- **Verification:** reading heuristic "every `go`/`.Go(` has a reachable join or a named owner", backed mechanically by GO-CONC-11.
  - It stays a reading heuristic because "has a join point" is not decidable through arbitrary plumbing, and no analyzer in golangci-lint 2.14.0 or staticcheck 2026.2.1 attempts it [own §1].
  - goleak catches the consequence, not the shape.
- **Watched red:** via GO-CONC-11: [own] run 7 `StartUnjoined` exit 1 vs 7c `StartJoined` exit 0.
- **Severity:** MUST. Floor: none.

**GO-CONC-11 — Call `goleak.VerifyTestMain(m)` in the `TestMain` of every package that contains a `go` statement or `.Go(` call.** Use `VerifyTestMain`, not per-test `VerifyNone`, whenever tests use `t.Parallel`.
- Do not use `synctest.Test` as a leak detector. It hangs to `-timeout` on I/O-blocked or global-held goroutines.
- Long-running processes additionally expose the `goroutineleak` profile (GA 1.27). That is a GO-OBS / `go-diagnose` concern.
- **Rationale:** on the same three planted leaks, goleak caught 3/3, while `synctest` and the `goroutineleak` profile each caught 1/3. The profile misses I/O-blocked and global-reachable goroutines by design, per the go1.27 notes [own §6].
- **Verification:** `go test ./...` with the `TestMain`; `goleak: … found unexpected goroutines` is the finding. Coverage check: compare the directories of `grep -rlE --include='*.go' --exclude='*_test.go' -e 'go func\(' -e '\.Go\(' .` with those of `grep -rl --include='*_test.go' 'goleak.VerifyTestMain' .`. A directory present only in the first list is the finding.
- **Watched red:** [own] runs 7, 7b (exit 1 on all three shapes) and 7c (exit 0). Runs 8–8c and 9 show the other two detectors' misses.
- **Severity:** MUST for the SDK and library packages; SHOULD for CLIs. Floor: go ≥ 1.20 via goleak v1.3.0; `goroutineleak` profile at 1.27.

### GO-CONC — checked by `go fix -diff` (GO-GATE-COMMANDS-04)

**GO-CONC-12 — Use typed atomics (`atomic.Int64`, `atomic.Bool`, `atomic.Pointer[T]`) for fields accessed atomically, never the `atomic.AddInt64(&x, …)` function family on a plain field, and never `go.uber.org/atomic`.**
- **Rationale:** a plain `int64` field invites a non-atomic access elsewhere; the typed field makes that impossible. Typed atomics are already 69% of use [run §3]. Uber's wrapper recommendation is stale ([map] conflict 24).
- **Verification:** `go fix -diff ./...` (`atomictypes` fixer, Go 1.27 toolchain); a non-empty diff and exit 1 are the finding.
- **Watched red:** **[C-2]** exit 1 with the rewrite hunk → twin exit 0.
- **Severity:** SHOULD. Floor: go 1.19 for the types; the fixer needs toolchain 1.27.

### GO-CONC — reading heuristics (no analyzer exists; each says why)

**GO-CONC-13 — Bound every fan-out whose size comes from input, the wire, a directory listing or CLI arguments.** Use `errgroup.SetLimit(n)`, `TryGo` for drop-or-requeue, `x/sync/semaphore`, or a counting channel. A bare `for` feeding `go`/`g.Go` is allowed only over a small, code-fixed N.
- **Rationale:** 194/248 `errgroup.Go` sites (78%) have no `SetLimit` and 94 `for`-then-`go` sites have no visible bound [run §3]. The planted cost at 10,000 items was 4,934 live goroutines vs 10 [own run 11]. Agents copy the majority shape.
- **Verification:** reading heuristic "a `for`/`range` over caller-sized data containing `go`/`.Go(` with no `SetLimit`, semaphore acquire or worker-pool bound in the function". A triage grep:

  ```sh
  grep -rn --include='*.go' -B3 -e 'go func(' -e '\.Go(func' .
  ```

  Each hit is then read. There is no mechanical check because safety depends on size, not syntax; none exists in golangci-lint 2.14.0 or staticcheck 2026.2.1 ([codified §4-5](go-topic-map/codified.md)).
- **Watched red:** as a measurement only (run 11).
- **Severity:** MUST (reading heuristic, justified above). Floor: none.

**GO-CONC-14 — Choose the group primitive by how failures are reported:**
- `sync.WaitGroup.Go` (go ≥ 1.25) when no task can fail;
- `errgroup.WithContext` + `SetLimit` when the first failure should cancel the rest;
- a `WaitGroup` plus a mutex-guarded `[]error` returned through `errors.Join` when the command must report every failure (batch validate, multi-push, `ocx` operations over many packages).

Check the declared type, not the name: `var wg errgroup.Group` exists (`cli/cli@9b031151a825:internal/featuredetection/feature_detection.go:258-265`).
- **Rationale:** `errgroup.Wait` returns only the first non-nil error ([pkg.go.dev/golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup)). Choosing it for report-all silently drops failures.
- **Verification:** reading heuristic.
- **Watched red:** not watched. The report-all shape (M-C-04) was not planted [own Contested].
- **Severity:** SHOULD. Floor: go 1.25 for `wg.Go`.

**GO-CONC-15 — Close a channel exactly once, from the single goroutine that owns sending, after a barrier (`wg.Wait()`) over every sender.** A receiver never closes. Buffers are 0 or 1 unless a comment states what bounds the size and what happens when it fills.
- **Rationale:**
  - Double close and send-after-close panic the process.
  - `-race` flagged send-after-close in only 1 run in 5 [own §5].
  - Message-passing blocking bugs are at least as common as shared-memory ones (ASPLOS'19).
  - The buffer rule is [Uber §Channel Size is One or None](https://github.com/uber-go/guide/blob/master/style.md#channel-size-is-one-or-none).
- **Verification:** reading heuristic "each `close(` sits in the designated sender after its barrier". No linter covers close discipline. A single green `-race` run is not evidence.
- **Watched red:** [own] runs 5, 6 (panics) and 6b (twin exit 0 5/5).
- **Severity:** SHOULD. Floor: none.

**GO-CONC-16 — Do not blanket-`recover` in library or SDK goroutines.**
- Recover only where a goroutine runs code the package does not own (a caller-supplied callback or handler), or at the top of a long-running daemon loop.
- There, capture `debug.Stack()` and report through the owner's error channel or logger.
- Never swallow the value ([pec] rule 9).
- **Rationale:**
  - `WaitGroup.Go` and `errgroup.Go` both let a task panic kill the process. errgroup documents why propagating would be worse (`errgroup.go:83-94`, golang/go#53757).
  - A library panic is an invariant bug by GO-ERR's policy ([map] conflict 8), and crashing keeps its stack.
- **Verification:** reading heuristic "every `go`/`.Go(` that invokes a caller-supplied func has a deferred recover-and-report; no other one does". [pec] rule 9's `errcheck` catches a bare discarded `recover()`.
- **Watched red:** [own] run 10: an unrecovered goroutine panic kills the whole test binary (exit 1); the recover-and-report twin exits 0.
- **Severity:** SHOULD. Floor: none.

**GO-CONC-17 — Attach a cause wherever a cancellation's reason must reach a caller.**
- The SDK wraps its own timeout in `context.WithTimeoutCause(ctx, d, ErrOcxTimeout)` and reports `context.Cause(ctx)`.
- A CLI derives its exit status (130/143) from a typed `signal.Notify` channel. It keeps `signal.NotifyContext` only to propagate `ctx.Done()`, and uses its go ≥ 1.26 cause only as message text.
- `cancel` on a `CancelCauseFunc` takes an error; a plain `CancelFunc` takes none.
- **Rationale:** plain `WithTimeout` collapses every deadline to `DeadlineExceeded`. `NotifyContext`'s cause is an unexported `signalError` string with no signal accessor ([sig] §7, `go1.27.1:src/os/signal/signal.go:352-361`). The cause APIs are 82 hits in 2.66M LOC [run §2].
- **Verification:** reading heuristic "a `WithTimeout`/`WithDeadline` whose expiry a caller must tell apart is a `*Cause` variant". It is proven unlintable: the full linter set gave `0 issues` on the cause-losing fixture ([ctx] d-timeoutcause).
- **Watched red:** the NotifyContext half is [sig] `ctrlc/typed` (exit 130/143).
- **Severity:** SHOULD. Floor: go 1.21 (`WithTimeoutCause`); go 1.26 (`NotifyContext` cause).

**GO-CONC-18 — Build fallible or expensive lazy initialization with `sync.OnceValue`/`OnceValues`, not `sync.Once` plus a captured error variable.** Never memoize a transient failure (network, subprocess); retry sits above the memoization.
- **Rationale:** `OnceValue(s)` re-delivers the same value, error or panic on every call ([pkg.go.dev/sync](https://pkg.go.dev/sync)). Hand-rolled versions forget the error path ([own §8]).
- **Verification:** reading heuristic "a `sync.Once` whose `Do` body assigns an `error`".
- **Watched red:** not watched.
- **Severity:** SHOULD. Floor: go 1.21.

**GO-CONC-19 — Detach work that must outlive its request with `context.WithoutCancel(ctx)`.** It keeps values and drops both cancellation and deadline, so it is never a way to silence a cancellation error.
- Replace a goroutine that only waits on `<-ctx.Done()` with `stop := context.AfterFunc(ctx, f)`, and call `stop()` once the callback is no longer wanted.
- **Rationale:** both are 1.21 APIs with near-zero adoption (48 and 16 hits [run §2]) that replace hand-rolled goroutines. See `tailscale@6b3a45f14ef6:control/controlhttp/controlhttpserver/controlhttpserver.go:164` and `tstest/natlab/vnet/vnet.go:443`.
- **Verification:** reading heuristic.
- **Watched red:** not watched.
- **Severity:** CONSIDER. Floor: go 1.21.

**Dropped, with reason:**
- M-C-10 `time.After`: the leak was fixed in 1.23 and `asynctimerchan` was removed in 1.27, so the concern is allocation only. It survives as failure mode 10.
- M-C-14 `sync.Map`: P3, not researched.
- M-C-20 embedded mutex: P3, and spot-read safe (`pebble@13596f1e1cea:wal/failover_writer.go:355-358`).
- The `-race` lane itself: GO-GATE-COMMANDS-08 and GO-TEST-09.
- `synctest` usage: GO-TEST-11.
- `exec` `WaitDelay`: GO-IO.
- Signal exit codes: GO-CLI.
- `recover` placement in general: GO-ERR.

### Verification runs made for this consolidation

All runs go through `/home/mherwig/.cache/research-lang/go-tools/run.sh` from `/home/mherwig/.cache/research-lang/go-tools/fixtures/go-concurrency/` (module `goconc`, `go 1.27`), unless a clone directory is named.

| # | Command | Violation | Twin | Output |
|---|---|---|---|---|
| C-1 | `golangci-lint run ./ctxfirst/bad/...` vs `./ctxfirst/good/...` (`.golangci.yml`: revive `context-as-argument` only) | exit 1 | exit 0 | `bad.go:9:25: context-as-argument: context.Context should be the first parameter of a function (revive)` / `0 issues.` |
| C-2 | `go fix -diff ./atomictypes/bad/` vs `./atomictypes/good/` | exit 1 | exit 0 | hunk `-type Counter struct{ n int64 }` → `+type Counter struct{ n atomic.Int64 }`, `atomic.AddInt64(&c.n, 1)` → `c.n.Add(1)` / no output |
| C-3 | in each clone: `golangci-lint run --config …/go-concurrency/lintcfg/ctx-linters.yml --max-issues-per-linter=0 --max-same-issues=0 ./...` (`enable: [contextcheck, containedctx, noctx, fatcontext]`); logs in `sweep/` | — | — | see below |

C-3 results, as counts per repo with a false-positive (FP) verdict:

| Repo @sha | contextcheck | containedctx | noctx | fatcontext | FP verdict |
|---|---|---|---|---|---|
| google/go-cmp@b133f1f1932e | 0 | 0 | 0 | 0 | none |
| junegunn/fzf@b1be3a8be1b8 | 0 | 0 | 12 | 0 | none |
| spf13/cobra@adbc8813901b | 0 | 1 | 4 | 0 | none; the containedctx hit is the retrofit exception, `command.go:218` |
| uber-go/zap@4892335e05f1 | 0 | 0 | 7 | 0 | none |
| regclient/regclient@43d2acb9fafd | 1 | 2 | 7 | 0 | none; the contextcheck hit is a plausible TP in a test |
| oras-project/oras-go@cb6d6dc79f83 | 2 | 3 | 59 | 2 | none; all four in tests are plausible |
| ko-build/ko@fcaeb337b6bd | 1 | 2 | 1 | 0 | contextcheck FP: `pkg/build/gobuild.go:1419` deliberately uses the stored `g.ctx`, with a comment; that is a GO-CONC-02 violation, not a chain bug; 1.1/10k LOC |
| urfave/cli@d1d810845dbc | 152 | 0 | 1 | 0 | one root, amplified; see note |

- **urfave/cli:** all 152 hits trace to the single `cmd.onInvalidFlag(context.TODO(), name)` at `command.go:420`. The reports sit on the call chain (`String->Value->lookupFlag`): 133 in tests and 19 in `scripts/build.go`.
- **contextcheck** is ≤ 1 FP/10k LOC on 6/8 repos, which meets [gates]' MUST bar of ≥ 5/8. Fix the tail of the reported chain, not each caller.
- **noctx** hits split 71 test and 20 non-test. None was a wrong detection.

## Applied to the exemplars and the future consumers

**Already satisfied by the strict exemplars.**
- **GO-CONC-01 to GO-CONC-05:** `google/go-cmp@b133f1f1932e` is clean on all four context linters **[C-3]**. `uber-go/zap@4892335e05f1` has no contextcheck or containedctx hits.
- **GO-CONC-02:** `spf13/cobra@adbc8813901b:command.go:218` is the textbook retrofit exception (`SetContext`/`ExecuteContext`).
- **GO-CONC-07:** `aquasecurity/trivy@ae561f8cca36:pkg/rpc/client/client.go:62-64` uses `wg.Go` with a single-writer read after `Wait` (also GO-CONC-09). There are 108 `wg.Go` sites in 12 repos [run §3].
- **GO-CONC-13:** bounded fan-out at `cli/cli@9b031151a825:pkg/cmd/release/shared/upload.go:118` and `restic/restic@5127c4abf921:internal/repository/repository.go:576`.
- **GO-CONC-16:** caddy's daemon-loop recover with a stack, at `caddyserver/caddy@54937914234b:modules/caddypki/maintain.go:27-32` [pec §7].
- **GO-CONC-17:** `caddyserver/caddy@54937914234b:listeners.go:567` uses `WithCancelCause`.
- **GO-CONC-19:** the tailscale `WithoutCancel` and `AfterFunc` sites cited in the rule.

**Violated by prominent exemplars.**

| Rule | Site | What |
|---|---|---|
| GO-CONC-01 | `cli/cli@9b031151a825:internal/codespaces/rpc/invoker.go:91` | `context.WithCancel(context.Background())` inside a function that has `ctx`; confirmed TP [ctx] |
| GO-CONC-01 | `urfave/cli@d1d810845dbc:command.go:420` | `context.TODO()` in library code, which amplifies to 152 reports **[C-3]** |
| GO-CONC-02 | `etcd-io/etcd@7583cc6e7e27:client/v3/concurrency/session.go:35` (`Session.ctx`) and `:120` (`sessionOptions.ctx`, a `WithContext` option) | stored context; [ctx] cited `:120` as the `Session` struct, corrected here |
| GO-CONC-02 | `ko-build/ko@fcaeb337b6bd:pkg/build/gobuild.go:89,118` | ctx fields, consumed at `:1419` |
| GO-CONC-02 | `aquasecurity/trivy@ae561f8cca36:pkg/cache/remote.go:28` | `ctx context.Context // for custom header` [run §2] |
| GO-CONC-03 | `junegunn/fzf@b1be3a8be1b8:src/tmux.go:33`, `regclient/regclient@43d2acb9fafd:config/credhelper.go:39`, `regclient/regclient@43d2acb9fafd:internal/auth/auth.go:700` | `exec.Command` / `http.NewRequest` **[C-3]** |
| GO-CONC-13 | `grpc/grpc-go@acccf8cd101a:benchmark/client/main.go:150`, `containerd/containerd@934434dde54b:internal/cri/server/service.go:324`, `restic/restic@5127c4abf921:helpers/build-release-binaries/main.go:219` | `for` → `go` with no bound [run §3] |
| GO-CONC-17 | `etcd-io/etcd@7583cc6e7e27` and `restic/restic@5127c4abf921` | plain `signal.Notify` with manual plumbing; `NotifyContext` is 17 vs `Notify` 71 [run §2] |

**New commitments.**
- **Go SDK** (stdlib runtime, per owner Q2):
  - every exported blocking method is `Method(ctx context.Context, …)`, with no `WithContext` option and no ctx field (GO-CONC-01, 02);
  - subprocesses start through `exec.CommandContext` (GO-CONC-03, plus GO-IO's `WaitDelay`);
  - the SDK's own timeout is a `WithTimeoutCause` whose cause is an exported sentinel that callers `errors.Is` (GO-CONC-17);
  - any goroutine (stream pumps) is joined before the method returns (GO-CONC-10), and the SDK starts no background goroutine;
  - every package that starts one has `goleak.VerifyTestMain` (GO-CONC-11, goleak as a test-only dependency beside go-cmp; Open question 1);
  - progress callbacks run under GO-CONC-16's recover-and-report.
- **Go CLIs:**
  - `main` roots one context in `signal.NotifyContext` for propagation, with a typed `signal.Notify` channel for the exit status (GO-CONC-17, GO-CLI);
  - multi-item commands (push, verify) bound fan-out with `SetLimit` sized by a flag or `GOMAXPROCS` (GO-CONC-13);
  - multi-item commands that report every failure use `errors.Join` (GO-CONC-14).
- **Both:** the gate config fragment above, `go vet` as its own step (GO-GATE-COMMANDS-02), and `-race` in the PR lane (GO-GATE-COMMANDS-08).

## AI-agent failure modes

Ranked by expected frequency, which is corpus prevalence times how often generated code hits the shape.

1. **An unbounded `errgroup.Go`/`go func` loop over caller-sized input** (78% of corpus `errgroup.Go` sites lack a limit). Check: GO-CONC-13's triage grep, then read.
2. **A `context.Background()`/`TODO()` inside a helper "to be safe"**, or `TODO()` shipped in a library. Check: `contextcheck`. Its chain output names the root.
3. **`exec.Command`/`http.NewRequest`/`http.Get` because training data is dominated by them** (76% of corpus exec calls). Check: `noctx`.
4. **Adding `ctx` to a client struct or a `WithContext` option to avoid threading it.** Check: `containedctx`.
5. **Treating a green `-race` as proof of ordering correctness.** The `wg.Add`-inside-goroutine miss rate was 10/10 and the send-after-close catch rate was only 1/5. Check: `go vet` `waitgroup`, and GO-CONC-15 reading.
6. **Assuming `errgroup.Go`/`wg.Go` contain panics, or blanket-recovering every goroutine the other way.** Check: GO-CONC-16 reading. `errcheck` flags a bare `recover()`.
7. **Identifying `WaitGroup.Go` by the name `wg`.** Check: grep the declaration (`sync\.WaitGroup`) before classifying [own AI-agent angle, run §3].
8. **Recommending `synctest.Test` as a leak detector.** Check: GO-CONC-11. A test that is not about fake time does not need `synctest`.
9. **Inventing a typed signal accessor on `context.Cause` after `NotifyContext`, or `cancel(err)` on a plain `CancelFunc`.** Check: `go build ./...` fails on the invented API. `go doc os/signal.NotifyContext` shows the cause is a string [sig].
10. **Flagging `time.After` in a `select` loop as a goroutine leak, or writing `Timer.Stop`-and-drain code**, both obsolete at go ≥ 1.23 main modules with the opt-out removed in 1.27 ([map] conflict 15d). Check: reading. The only remaining objection is per-iteration allocation.
11. **`sync.Once` plus a package-level `initErr`.** Check: GO-CONC-18 reading.

## Open questions

**Owner decisions (the program applies the default).**
1. **goleak as a second test-only dependency of the SDK.** Q2 named only go-cmp. **Default: yes.**
   - goleak v1.3.0 has no transitive dependencies.
   - It is the only detector that caught all three leak shapes.
   - A stdlib-only alternative (a `runtime.Stack` diff in `TestMain`) is round-2 work, below.
2. **`contextcheck`/`containedctx`/`noctx`/`fatcontext` in the fleet golangci config with tests included.** **Default: yes, tests included** (the fix is `t.Context()`).
   - This is recorded for the in-flight `gates/golangci-config` dive to adopt. **[C-3]** is its measurement on its own 8 repos.

**Subareas for another round.**
- `concurrency/leak-detection-stdlib`: can a `TestMain` that diffs `runtime.Stack(buf, true)` against a baseline match goleak's 3/3 on [own]'s leak fixture? And is `pprof.Lookup("goroutineleak")` usable in tests at the SDK's go 1.26.0 floor, where it is experimental?
- `concurrency/report-all-fanout` (M-C-04): plant `errgroup` vs `WaitGroup` + `errors.Join` on a 3-failure batch and record which errors reach the caller. That promotes GO-CONC-14 from not watched to watched.
- `concurrency/fanout-analyzer`: is a small `go/analysis` pass (for `range` + `.Go(`/`go` with no `SetLimit` or semaphore in scope) worth shipping as a nogo or golangci plugin to mechanize GO-CONC-13? Measure its hits on the 94 triage sites [run §3].
- `testing × concurrency` (carried from [test] Open question 4): does any analyzer catch `t.FailNow` inside `wg.Go`/`errgroup.Go` closures? vet `testinggoroutine` covers only bare `go` statements, and this is unverified.

## Sub-artifacts

- [go-concurrency/goroutine-ownership.md](go-concurrency/goroutine-ownership.md) covers goroutine ownership and bounded fan-out; `wg.Add` vet vs `-race`; the race shapes `-race` catches and misses; the three leak detectors measured against one fixture; panic behaviour of `WaitGroup.Go` and `errgroup`; `OnceValue`. 17 planted runs.
- [go-concurrency/context-contract.md](go-concurrency/context-contract.md) covers the `context.Context` contract: origin and flow, struct fields, `lostcancel`, cause APIs and `NotifyContext`, `WithoutCancel`/`AfterFunc`, the `Value` key policy. It includes 8 linter fixture pairs and the `noctx`-covers-`os/exec` answer.

## Key sources

- [pkg.go.dev/context](https://pkg.go.dev/context): signatures, version tags, the "first parameter" and "Value only for request-scoped data" wording.
- [go.dev/blog/context-and-structs](https://go.dev/blog/context-and-structs): the struct-field rule and its retrofit exception.
- [google.github.io/styleguide/go/decisions#contexts](https://google.github.io/styleguide/go/decisions#contexts): the narrowest wording of the exceptions.
- [go.dev/wiki/CodeReviewComments#goroutine-lifetimes](https://go.dev/wiki/CodeReviewComments#goroutine-lifetimes): the ownership contract.
- [github.com/uber-go/guide/blob/master/style.md](https://github.com/uber-go/guide/blob/master/style.md): Don't fire-and-forget goroutines; Channel Size is One or None.
- [pkg.go.dev/sync](https://pkg.go.dev/sync): `WaitGroup.Go` (1.25), and `OnceValue`/`OnceValues` (1.21).
- [pkg.go.dev/golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup): `SetLimit`, `TryGo`, and first-error `Wait`.
- [go.dev/doc/go1.25](https://go.dev/doc/go1.25): `WaitGroup.Go`, the vet `waitgroup` analyzer, `synctest` GA.
- [go.dev/doc/go1.26](https://go.dev/doc/go1.26): `NotifyContext` cancellation cause.
- [go.dev/doc/go1.27](https://go.dev/doc/go1.27): the `goroutineleak` profile GA and its reachability blind spot.
- [go.dev/doc/articles/race_detector](https://go.dev/doc/articles/race_detector): what `-race` can and cannot see.
- [github.com/uber-go/goleak](https://github.com/uber-go/goleak/blob/master/README.md): `VerifyTestMain` vs `VerifyNone` under `t.Parallel`.
- [arxiv.org/html/2204.00764v2](https://arxiv.org/html/2204.00764v2): Uber PLDI'22 race root causes (391/223/38/24).
- [blog.acolyer.org, ASPLOS'19 Go concurrency bugs](https://blog.acolyer.org/2019/05/17/understanding-real-world-concurrency-bugs-in-go/): `-race` catches about half of reproduced non-blocking bugs.
- [github.com/kkHAIKE/contextcheck](https://github.com/kkHAIKE/contextcheck), [github.com/sivchari/containedctx](https://github.com/sivchari/containedctx), [github.com/sonatard/noctx](https://github.com/sonatard/noctx): the three context gate linters.

## Conflicts resolved

1. **Version of the vet `waitgroup` analyzer.**
   - [own] says "Go 1.27's new vet analyzer" and "Go 1.27.1+".
   - [gatecmd] says it is a Go 1.25 analyzer, beside `hostport`.
   - **Resolved: 1.25**, per the go1.25 release notes' vet section, which [gatecmd] cites. [own]'s date was taken from the toolchain it happened to run.
2. **`NotifyContext`'s cause as the CLI exit path.**
   - [ctx] rule 6 says a go ≥ 1.26 CLI "relies on `NotifyContext`'s built-in cause".
   - [sig] §7 read `signal.go:352-361`: the cause is an unexported string type with no signal accessor, so deriving 130/143 from it needs string matching.
   - **Resolved:** [sig] wins because it read the source and ran both shapes. The exit status comes from a typed `signal.Notify` channel. `NotifyContext` propagates `Done()`, and its cause is message text only (GO-CONC-17).
3. **Must library goroutines recover?**
   - [own] rule 5 says they must recover and report, "unconditionally" when failure must not be fatal.
   - errgroup's source rationale says propagating panics hides stacks and delays crashes.
   - GO-ERR's resolved policy is that library panics are invariant bugs ([map] conflict 8).
   - [pec] rule 9 says recover only at a goroutine or API boundary, never swallowed.
   - **Resolved:** no blanket recover. Recover only where foreign code runs (callbacks) or at daemon-loop tops (caddy), with the stack reported (GO-CONC-16). Crashing on an invariant is correct and keeps the evidence.
4. **What backs "ctx first".**
   - [ctx] rule 1 cites `contextcheck` as its check.
   - `contextcheck` detects broken chains, not parameter position.
   - **Resolved:** position is `revive` `context-as-argument`, watched red here (**[C-1]**). The chain is `contextcheck`.
5. **Closure writes to an outer variable.**
   - [own] rule 6 says "never a bare shared variable".
   - [own]'s own exemplar (trivy `wg.Go` writing `serverInfo`) is correct.
   - **Resolved:** single writer per variable plus a read after the join is race-free by the documented happens-before. Multi-writer needs guarding (GO-CONC-09).
6. **MUST-eligibility of `contextcheck`.**
   - [ctx] measured 3 repos (etcd, cli, go-containerregistry) and found 1 FP.
   - [gates]' bar is ≤ 1 FP/10k LOC on ≥ 5 of its 8 repos, which nobody had measured.
   - **Resolved by [C-3]:** 6/8 pass. urfave/cli's 152 hits are one root amplified along the call chain. The linter backs GO-CONC-01, with "fix the chain's tail" guidance.
7. **`noctx` scope and tests.**
   - [ctx] framed `noctx` as `exec` + `http`.
   - [C-3] shows it also flags `net.Dial`/`Listen`/`LookupIP`, and that 71/91 hits are in tests.
   - **Resolved:** GO-CONC-03 lists the `net` family, and tests are included because `t.Context()` makes the fix one token.
8. **The etcd citation.**
   - [ctx] cites `session.go:120` as the `Session` struct.
   - The file shows `:120` is `sessionOptions.ctx` (a `WithContext` option) and `Session.ctx` is `:35`.
   - **Resolved:** both are cited correctly above, and the options idiom is banned for the SDK (GO-CONC-02).
9. **Test-dependency set (goleak vs owner Q2's go-cmp-only).** Resolved as default "admit goleak" (Open question 1).

---
title: "t.Context, synctest, fuzzing, coverage gates and benchmarks"
topic: go-testing/time-fuzz-coverage
agent: time-fuzz-coverage-dive
model: sonnet
date_researched: 2026-09-26
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/time-fuzz-coverage/
scope: |
  Covers the go-line-gated testing primitives (T.Context/TempDir/Setenv/Chdir/
  Cleanup, B.Loop), testing/synctest for time-dependent concurrency tests,
  FuzzXxx fuzz testing for untrusted-input parsers, build/integration coverage
  via GOCOVERDIR and go tool covdata, coverage threshold gating, and
  benchmark comparison via benchstat. Does not cover table-test shape,
  t.Parallel races, golden files, or CLI end-to-end test harnesses (M-E-01..05,
  M-E-08, M-E-11, M-E-14..18 — other GO-TEST rows, other dives).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [T.Context, T.TempDir, T.Setenv, T.Chdir, T.Cleanup — the 1.24 floor](#1-tcontext-ttempdir-tsetenv-tchdir-tcleanup--the-124-floor)
   2. [testing/synctest — GA 1.25, Run removed 1.26, Sleep 1.27](#2-testingsynctest--ga-125-run-removed-126-sleep-127)
   3. [Fuzzing — FuzzXxx, seed corpus, CI](#3-fuzzing--fuzzxxx-seed-corpus-ci)
   4. [Coverage — build -cover, GOCOVERDIR, go tool covdata](#4-coverage--build--cover-gocoverdir-go-tool-covdata)
   5. [A 100% coverage gate script](#5-a-100-coverage-gate-script)
   6. [Benchmarks — B.Loop, the bloop modernizer exclusion, benchstat](#6-benchmarks--bloop-the-bloop-modernizer-exclusion-benchstat)
   7. [usetesting — the linter that catches the old idioms](#7-usetesting--the-linter-that-catches-the-old-idioms)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `t.Context()`, `t.TempDir()`, `t.Setenv()`, `t.Chdir()`, `t.Cleanup()` are the MUST default in any module whose `go` line is `>= 1.24` — `t.Context()`/`t.Chdir()` need 1.24, `t.TempDir()` needs only 1.15, `t.Setenv()` only 1.17, so a floor gate at 1.24 covers all five.
- `t.Setenv()` and `t.Chdir()` cannot be called from a parallel test or a test with a parallel ancestor — they mutate process-wide state; `os.Setenv`/`os.Chdir` in a parallel test is not fixable by this rule and is a design smell, not a lint target.
- `testing/synctest.Test(t, f)` is the SHOULD default for time-dependent concurrency tests in modules with `go >= 1.25`; the old `synctest.Run(f)` API from 1.24 was renamed in 1.25 and the compatibility shim removed entirely in 1.26 — verified: on the 1.27.1 toolchain used here, `synctest.Run` fails to compile with `undefined: synctest.Run`.
- Measured on a planted retry-with-backoff fixture: the real-sleep test reports `0.072s`; the identical logic inside `synctest.Test` reports `0.001s` — the exact "fast and reliable, not one or the other" trade the synctest blog post promises.
- `synctest.Sleep(d)` (new in 1.27) is `time.Sleep(d)` + `synctest.Wait()` in one call — use it only when the test and the system under test sleep for the same duration and the test wants to block until the system settles.
- Only channel send/receive, `sync.Cond.Wait`, `sync.WaitGroup.Wait`, and `time.Sleep` are "durably blocking" inside a bubble; `sync.Mutex` is deliberately excluded (global mutexes are common across bubble boundaries), and real network/file I/O is invisible to the bubble's fake clock — a synctest test of a network client needs `net.Pipe`, not a real listener.
- Every parser of untrusted input (an OCI manifest, a config file, a digest string, the SDK's JSON envelope) should carry a `FuzzXxx` test seeded under `testdata/fuzz/<FuzzName>/`; measured on a planted digest parser, the seed corpus alone (before any generative fuzzing) already reproduced a slice-bounds panic.
- `go test -fuzz=FuzzXxx -fuzztime=<duration>` is the CI-safe invocation; unbounded fuzzing (`go test -fuzz=FuzzXxx` with no `-fuzztime`) must never run in a CI job because it runs until interrupted.
- Coverage for a CLI's integration tests needs `go build -cover` (not `go test -cover`) plus `GOCOVERDIR` set at run time; if `GOCOVERDIR` is unset, the instrumented binary runs normally but only prints `warning: GOCOVERDIR not set, no coverage data emitted` to stderr and silently drops all coverage data — verified against a planted CLI fixture.
- `go tool covdata textfmt -i=<dir> -o profile.txt` converts the raw counter/meta files into the legacy text profile that `go tool cover -func`/`-html` understand; `go tool covdata merge` combines unit-test and integration-test coverage directories into one.
- A coverage threshold gate belongs in a small script around `go tool cover -func`'s `total:` line, never a bespoke coverage-percentage parser of `-json` output that doesn't exist for this purpose; the stdlib has no built-in `-fail-under` flag as of 1.27.
- `testing.B.Loop()` (1.24+) is the SHOULD default for new/rewritten benchmarks, replacing `for i := 0; i < b.N; i++`; it resets the timer on first call, keeps loop-body values alive against dead-code elimination, and a benchmark must use one style or the other, never both.
- `b.Loop()` is NOT a free correctness-preserving rewrite for every benchmark: it breaks any benchmark that calls `b.StopTimer()`/`b.StartTimer()`/`b.ResetTimer()` inside the old loop body ([golang/go#74967](https://github.com/golang/go/issues/74967)), and on nanosecond-scale workloads its own overhead can inflate the reported time — measured on a planted 100-int-sum benchmark: `b.Loop()` reported `57.6ns/op` against `b.N`'s `20.4ns/op` for the *identical* body, a `+182.86%` regression per `benchstat` (p=0.002, n=6) purely from `b.Loop()`'s bookkeeping overhead.
- Because of that measured skew, `gopls`'s `bloop` modernizer is excluded from the safe/automatic modernizer suite ([golang/go#74967](https://github.com/golang/go/issues/74967), CLs `go.dev/cl/731962`/`732260`) — `go fix`'s registered fixer list does not include `bloop` as of 1.27.1; a benchmark rewrite from `b.N` to `b.Loop()` is a manual, benchstat-verified decision, not an automated `go fix` pass.
- `benchstat` (part of `golang.org/x/perf`, installed via `go install golang.org/x/perf/cmd/benchstat@latest`) is the tool for any performance claim: run each variant with `go test -bench=X -count=10` (or more; 6 was enough here to get p=0.002), feed both files to `benchstat old.txt new.txt`, and never accept a single-run benchmark number as evidence of a regression or an improvement.
- `usetesting` (golangci-lint, bundled as of v2.14.0) flags `os.MkdirTemp`/`os.CreateTemp`/`os.TempDir` → `t.TempDir()`, `os.Setenv` → `t.Setenv()`, `os.Chdir` → `t.Chdir()`, `context.Background()`/`context.TODO()` → `t.Context()` inside test files — but three of those four checks (`os-setenv`, `os-temp-dir`, `context-background`, `context-todo`) are **disabled by default** and must be turned on explicitly in the golangci-lint config for the MUST rule to actually fire.

## Findings

### 1. T.Context, T.TempDir, T.Setenv, T.Chdir, T.Cleanup — the 1.24 floor

`(*testing.T).Context()` returns a `context.Context` that is canceled just before the test's `Cleanup`-registered functions run, letting cleanup code wait on `ctx.Done()` for resources that shut down asynchronously
([pkg.go.dev/testing](https://pkg.go.dev/testing#T.Context), added 1.24). `T.Chdir(dir)` calls `os.Chdir` and registers a `Cleanup` that restores the original directory, and — critically — **cannot be called from a parallel test or a test with a parallel ancestor**, because it mutates the whole process's working directory
([pkg.go.dev/testing](https://pkg.go.dev/testing#T.Chdir), 1.24). `T.Setenv(key, value)` has the identical parallel restriction and the identical reason (process-wide `os.Setenv` state), and has existed since 1.17 — only `Context`/`Chdir` are new in 1.24. `T.TempDir()` (1.15) and `T.Cleanup(f)` (1.14, LIFO order) are older still.

Because `T.Context`/`T.Chdir` need 1.24 but `T.TempDir`/`T.Setenv`/`T.Cleanup` need less, **the single gating condition for "use all five" is `go >= 1.24`** — a module with a lower floor gets `t.TempDir`/`t.Setenv`/`t.Cleanup` today and `t.Context`/`t.Chdir` only after a floor bump.

Measured adoption is already near-total corpus-wide: `t.Context()` is 6,629–7,448 call sites across the 34 full-source exemplars depending on which false-positive correction is applied (`.Context()` naive grep also catches `http.Request.Context()`, `cobra.Command.Context()`, and caddy's own `Context()` method — always grep the specific `t.Context()`/`b.Context()` spelling, never bare `.Context()`) ([go-audit/exemplar-quality-gates.md §4](../go-audit/exemplar-quality-gates.md), [go-audit/exemplar-code-shape.md §3](../go-audit/exemplar-code-shape.md)). `google/go-github@48d0a668cde8` is 99.7% adopted (3,028/3,036 `t.Context()` vs `.Context()` hits); `t.TempDir()` 3,518, `t.Cleanup()` 1,394, `t.Setenv()` 1,129 corpus totals ([exemplar-quality-gates.md §4](../go-audit/exemplar-quality-gates.md)).

```go
// WRONG (pre-1.24 idiom, works but is what the rule replaces)
func TestThing(t *testing.T) {
    ctx := context.Background()
    dir, err := os.MkdirTemp("", "x")
    if err != nil { t.Fatal(err) }
    defer os.RemoveAll(dir)
    os.Setenv("X", "1")
    defer os.Unsetenv("X")
    // ...
}

// RIGHT (go >= 1.24)
func TestThing(t *testing.T) {
    ctx := t.Context()
    dir := t.TempDir()
    t.Setenv("X", "1")
    // cleanup is automatic; no defer, no unchecked error path
}
```

### 2. testing/synctest — GA 1.25, Run removed 1.26, Sleep 1.27

`testing/synctest.Test(t *testing.T, f func(*testing.T))` runs `f` inside a new isolated "bubble": a virtualized execution context where goroutines, blocking, and time are all fake. `Test` waits for every goroutine started inside the bubble to exit before returning; the `*testing.T` handed to `f` has special properties — its `Cleanup` functions run inside the bubble, its `Context()` is tied to the bubble's lifetime, and `t.Run`/`t.Parallel`/`t.Deadline` cannot be called on it ([pkg.go.dev/testing/synctest](https://pkg.go.dev/testing/synctest)).

Inside a bubble, `time` uses a fake clock that starts at midnight UTC on 2000-01-01 and only advances once every goroutine in the bubble is "durably blocked" — meaning every goroutine is blocked on an operation that can only be unblocked by another goroutine in the same bubble. The exact set of durably-blocking operations is small and deliberate: channel send/receive, `sync.Cond.Wait`, `sync.WaitGroup.Wait`, and `time.Sleep`. `sync.Mutex` locking is explicitly **not** durably blocking — the synctest blog explains this is because code commonly holds mutexes shared across bubble boundaries, so treating mutex contention as a clock-advance trigger would be unsound ([go.dev/blog/synctest](https://go.dev/blog/synctest)). Real network I/O, file I/O, and other syscalls are likewise invisible to the bubble; testing a network client or server with synctest needs a fake transport (`net.Pipe`), not a real listener.

`synctest.Wait()` blocks the calling goroutine until every other goroutine in the bubble is durably blocked; it panics if called outside a bubble or concurrently by two goroutines in the same bubble. `synctest.Sleep(d)`, added in **1.27**, is defined as `time.Sleep(d)` followed by `synctest.Wait()` — a convenience for the common "sleep exactly as long as the thing under test, then wait for it to settle" pattern.

**Version history, since a naive read of an older blog post or tutorial gets this wrong**: `synctest.Run(f func())` was the *experimental* 1.24 API, gated behind `GOEXPERIMENT=synctest` and explicitly "not subject to the Go compatibility promise." It was renamed to `Test(t, f)` and promoted to general availability in 1.25 (no more `GOEXPERIMENT` flag). The old `Run`-based API was **removed entirely in 1.26** ([golang/go#73567](https://github.com/golang/go/issues/73567), [go.dev/doc/go1.25](https://go.dev/doc/go1.25)). Verified directly against the 1.27.1 toolchain in this dive's fixture: a file calling `synctest.Run(func() {})` fails `go build` with `undefined: synctest.Run` (see Verification runs §1).

Adoption is still a minority but non-trivial: `testing/synctest` is imported in 10/34 full-source exemplars ([exemplar-quality-gates.md §4](../go-audit/exemplar-quality-gates.md); the topic map's conflict-13 count). Dependency-injected fake-clock libraries (`jonboulle/clockwork`, `benbjohnson/clock`, `k8s.io/utils/clock`) are a much older, still-present alternative pattern to the same problem: real `time.Now()` calls outnumber injected-clock imports by roughly 225:1 corpus-wide (1,576 vs 7), and the 7 real clockwork imports are concentrated entirely in `etcd-io/etcd` ([go-audit/exemplar-runtime-posture.md §8](../go-audit/exemplar-runtime-posture.md)). synctest and an injected clock are not mutually exclusive — synctest virtualizes `time` itself for code that already calls `time.Sleep`/`time.After`/`time.NewTimer` directly, while an injected clock is for code that was already designed around a `Clock` interface; a module adopting synctest does not need to also introduce a clock abstraction.

```go
// WRONG twin (real sleep, flaky-or-slow trade-off): 0.072s test time
func TestRetry_RealSleep(t *testing.T) {
    calls := 0
    err := Retry(4, 10*time.Millisecond, func() error {
        calls++
        if calls < 4 { return errors.New("not yet") }
        return nil
    })
    // ... asserts
}

// RIGHT twin (go >= 1.25): 0.001s test time, same assertions
func TestRetry_Synctest(t *testing.T) {
    synctest.Test(t, func(t *testing.T) {
        calls := 0
        err := Retry(4, 10*time.Millisecond, func() error {
            calls++
            if calls < 4 { return errors.New("not yet") }
            return nil
        })
        // ... identical asserts
    })
}
```

### 3. Fuzzing — FuzzXxx, seed corpus, CI

A fuzz test is a function `FuzzXxx(f *testing.F)` in a `_test.go` file that calls `(*testing.F).Add(...)` zero or more times to seed the corpus, then exactly one `f.Fuzz(func(t *testing.T, args...))` — the fuzz target — whose argument types (after the leading `*testing.T`) must exactly match, in order, the types passed to every `f.Add` call. Allowed argument types are `string`, `[]byte`, all fixed-width int/uint variants, `float32`/`float64`, and `bool` ([go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz#requirements)). Running plain `go test` executes only the seed corpus (a unit-test mode); `go test -fuzz=FuzzXxx -fuzztime=<duration>` runs the fuzzing engine for that duration (`30s`, `1000x` for iteration count, or unset for "until failure or interruption" — the last of which must never be the CI invocation). A failing input is automatically minimized and written to `testdata/fuzz/FuzzXxx/`, becoming a permanent regression seed on every future `go test` run — the on-disk format is a first line `go test fuzz v1` followed by one typed Go literal per fuzz argument.

Measured: 122 `FuzzXxx` functions across the corpus, concentrated exactly where the doc's advice points — security-sensitive parsers in `tailscale/tailscale@6b3a45f14ef6` (49 fuzz functions) and `containerd/containerd@934434dde54b` (28) ([go-audit/exemplar-code-shape.md §2](../go-audit/exemplar-code-shape.md)). CI actually *running* fuzzing (`-fuzz`/`-fuzztime` in a workflow file) is far rarer: only 3 of 32 repos with any GitHub Actions workflow show the flag, and none of them were the specific repos the research brief expected to name — flagged as a gap, not drilled further ([go-audit/exemplar-quality-gates.md §3](../go-audit/exemplar-quality-gates.md)).

On the planted digest-parser fixture, the seed corpus alone reproduced a slice-bounds-out-of-range panic (see Verification runs §3) — the parser sliced `s[i+1 : i+1+n]` using an algorithm-derived expected hex length without checking the string was actually that long. This is exactly the class of bug `FuzzXxx` exists to catch before it reaches production input.

### 4. Coverage — build -cover, GOCOVERDIR, go tool covdata

Package-level `go test -cover`/`-coverprofile` has existed since Go 1.2 and only measures what a `_test.go` file directly exercises. **Integration coverage** — coverage from a real, built binary driven by an external harness (a CLI invoked by a test script, an end-to-end test suite) — needs `go build -cover` instead: this produces an instrumented binary that, when run with the `GOCOVERDIR` environment variable set to a directory, writes a metadata file (`covmeta.*`, function/source names, written once) and one counter file per execution (`covcounters.*`) to that directory ([go.dev/doc/build-cover](https://go.dev/doc/build-cover), [go.dev/blog/integration-test-coverage](https://go.dev/blog/integration-test-coverage)). By default only main-module packages are instrumented; `-coverpkg=<comma-list>` widens or narrows the instrumented set (an import path, never `-coverpkg=main`, which the doc explicitly calls out as not working).

**If `GOCOVERDIR` is unset**, the binary runs completely normally and prints exactly one line to stderr — `warning: GOCOVERDIR not set, no coverage data emitted` — and silently drops all coverage data; the exit code is unaffected. Verified directly against a planted `-cover`-built CLI (Verification runs §4): running it with `GOCOVERDIR` set produced two files under the target directory; running it again with `GOCOVERDIR` unset printed the warning, produced zero new files, and still exited 0. A caller that doesn't watch stderr will never notice coverage silently stopped.

`go tool covdata percent -i=<dir1,dir2,...>` prints a per-package coverage percentage straight from the raw counter/meta files. `go tool covdata textfmt -i=<dir> -o profile.txt` converts them to the legacy text format (`mode: set` header, one line per code block) that `go tool cover -func=profile.txt` and `go tool cover -html=profile.txt` already understand — this is the bridge between the new integration-coverage format and every existing coverage-viewing tool. `go tool covdata merge -i=dir1,dir2 -o merged` combines multiple raw data directories into one, which is the documented mechanism for combining coverage collected from unit tests (`go test -cover`) and integration tests (`go build -cover` + `GOCOVERDIR`) into a single number, and also for combining runs collected on different platforms.

**Coverage data is lost on abnormal exit.** The Go doc doesn't say this in `build-cover`/`integration-test-coverage` in as many words, but the mechanism (coverage counters are flushed at normal-exit time) implies it and it matches every practitioner account: a program that panics or crashes without calling the normal-exit path never writes its counter file. A CLI whose tests intentionally exercise a crashing path therefore needs `recover()` at the top of `main` (or a `defer`d flush) if that path's coverage is expected to count.

### 5. A 100% coverage gate script

The stdlib toolchain has **no built-in fail-under-threshold flag** as of 1.27 — `go test -cover`, `go tool cover -func`, and `go tool covdata percent` all *report* a percentage; none of them exit non-zero below a threshold. A coverage gate is therefore always a small wrapper script around one of those commands' text output — see `fixtures/time-fuzz-coverage/coverage_gate.sh`, verified in Verification runs §5: it greps the `total:` line out of `go tool cover -func`'s output, extracts the percentage with a plain regex, and compares numerically with `awk`. An empty or unparsable `total:` line — an empty profile, a malformed one, or `go tool cover` itself failing — is a hard `exit 2`, never a silent pass; this matters because a coverage profile that failed to generate (for example, because a test crashed) must never read as "0 files below threshold, so pass."

This is the shape the SDK's Q5-mandated 100% gate takes: `go test -coverprofile=cover.out ./...` (or the `covdata` pipeline above for a binary that gets its coverage from an integration run), then `coverage_gate.sh cover.out 100`.

### 6. Benchmarks — B.Loop, the bloop modernizer exclusion, benchstat

`(*testing.B).Loop()`, added in 1.24, returns `true` while the benchmark should keep iterating. It resets the benchmark timer on its first call (so setup code before the loop is never measured), stops the timer automatically once it returns `false` (so cleanup after the loop is never measured either), and the runtime keeps arguments/results/assigned variables inside the loop body alive via an implicit `runtime.KeepAlive` — preventing the compiler from proving the loop body's result is unused and eliding it, a real correctness bug the old `for i := 0; i < b.N; i++` idiom was vulnerable to ([go.dev/blog/testing-b-loop](https://go.dev/blog/testing-b-loop), [pkg.go.dev/testing](https://pkg.go.dev/testing#B.Loop)). A single benchmark function must use one style or the other, never both — mixing `b.Loop()` with a `for _, n := range b.N`-shaped loop in the same function is undefined/nonsensical.

Measured adoption: 340 `b.Loop()` sites vs 358 `for i := 0; i < b.N; i++` sites corpus-wide — almost even, but the split is per-repo rather than blended: `prometheus/prometheus@270db2915054` has switched almost entirely (158 vs 0), `cockroachdb/pebble@13596f1e1cea` is the mirror image (8 vs 136) — the split tracks when a repo last touched its benchmarks, not repo age ([go-audit/exemplar-code-shape.md §2](../go-audit/exemplar-code-shape.md)).

**`b.Loop()` is not a universally safe automated rewrite of `b.N`.** [golang/go#74967](https://github.com/golang/go/issues/74967) documents two distinct failure modes discovered after `gopls`'s `bloop` modernizer started rewriting real code: (1) a benchmark that calls `b.StopTimer()`/`b.StartTimer()` inside the old loop body breaks outright — `B.Loop called with timer stopped` — because `b.Loop()`'s internal bookkeeping assumes the timer is always running between iterations; (2) even where the rewrite compiles and runs correctly, its own overhead can measurably skew nanosecond-scale benchmarks — a commenter on the issue measured up to **+65%** on a protobuf field-accessor benchmark, and the issue concludes "we have no hope of identifying such tiny workloads statically." The resolution, landed as `go.dev/cl/731962`/`732260`, was to disable the `bloop` analyzer in the modernizer suite entirely — as of 1.27.1, `go tool fix help`'s registered fixer list does not include `bloop` ([go-topic-map/shifts.md §gopls analyzers](../go-topic-map/shifts.md), confirmed live via [map] M3 in the topic map).

This dive re-measured the overhead directly on a trivial 100-int-sum benchmark (Verification runs §6): the identical loop body reports `20.36ns/op` under `b.N` and `57.59ns/op` under `b.Loop()` — a **+182.86%** regression per `benchstat` (`p=0.002`, `n=6`), far worse than the issue's own +65% example. **A `b.N`-to-`b.Loop()` rewrite on a nanosecond-scale benchmark is not a style-only change; it can change what the benchmark's number means**, and every such rewrite should be benchstat-verified, not applied blind.

`benchstat` (`golang.org/x/perf/cmd/benchstat`, `go install golang.org/x/perf/cmd/benchstat@latest`) takes two-or-more Go-benchmark-format text files (the output of `go test -bench=X -count=N`, `N >= 10` recommended for a statistically meaningful sample — this dive used `N=6` and still got `p=0.002`) and reports the median, a confidence interval, and a p-value per comparison; `p <= 0.05` is the accepted significance bar ([pkg.go.dev/golang.org/x/perf/cmd/benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat)). `benchstat` usage in CI is measured at 0/32 repos in this corpus ([go-audit/exemplar-quality-gates.md headline](../go-audit/exemplar-quality-gates.md)) — not a single exemplar gates a PR on it, though several use it manually per the commit history convention (not measured directly here).

```go
// WRONG twin: for i := 0; i < b.N; i++  (pre-1.24 idiom; still fine, not deprecated)
func BenchmarkSumBN(b *testing.B) {
    nums := setupNums()
    for i := 0; i < b.N; i++ {
        sum := 0
        for _, n := range nums { sum += n }
        _ = sum
    }
}

// "RIGHT" twin per the 1.24+ default — BUT benchmark it before trusting the number:
// this exact rewrite measured +182.86% slower for this exact body (§6 below).
func BenchmarkSumBLoop(b *testing.B) {
    nums := setupNums()
    for b.Loop() {
        sum := 0
        for _, n := range nums { sum += n }
        _ = sum
    }
}
```

### 7. usetesting — the linter that catches the old idioms

`usetesting` (by ldez, bundled into golangci-lint) statically detects exactly the pre-1.24-idiom pairs a reviewer would otherwise hand-check: `os.MkdirTemp`/`os.CreateTemp`/`os.TempDir` → `t.TempDir()`, `os.Setenv` → `t.Setenv()`, `os.Chdir` → `t.Chdir()` (Go >= 1.24 only), and `context.Background()`/`context.TODO()` → `t.Context()` (Go >= 1.24 only) inside test files ([github.com/ldez/usetesting](https://github.com/ldez/usetesting)). The linter's Go-version-detection automatically disables the 1.24-gated checks (`os-chdir`, `context-background`, `context-todo`) when the module's `go` line is below 1.24 — so this check is safe to enable unconditionally; it self-gates.

**Critical config detail: three of the four most valuable checks default to off.** The linter's own defaults are `os-create-temp: true`, `os-mkdir-temp: true`, but `os-setenv: false`, `os-temp-dir: false`, `context-background: false`, `context-todo: false`. A `golangci-lint enable: [usetesting]` with no `settings:` block therefore misses `os.Setenv`/`context.Background()`/`context.TODO()` entirely — the exact primitives conflict 13 and M-E-06 care most about. Any adopted config must set `os-setenv: true`, `context-background: true`, `context-todo: true` explicitly.

Verified against a planted violation/twin pair (Verification runs §7): with `usetesting.os-setenv: true`, `golangci-lint run` reports 2 issues (`os.MkdirTemp` and `os.Setenv`) on the violation file and 0 issues on the compliant twin using `t.TempDir()`/`t.Setenv()`.

## Normative guidance candidates

1. **MUST: a module with `go >= 1.24` uses `t.Context()`, `t.TempDir()`, `t.Setenv()`, `t.Chdir()`, `t.Cleanup()` in place of `context.Background()`/`context.TODO()`, `os.MkdirTemp`, `os.Setenv`, `os.Chdir`, and `defer`-based cleanup inside test files.** Rationale: automatic, correctly-ordered cleanup and less boilerplate error handling; a bare `context.Background()` in a test also can't be canceled by the test framework on timeout. VERIFIED: `golangci-lint` with `usetesting` enabled and `os-setenv`/`context-background`/`context-todo` set `true` — config at `fixtures/time-fuzz-coverage/.golangci.yml`; `go help testflag`/the module's own `go` line gates it. RUN: yes, fixture path `fixtures/time-fuzz-coverage/usetesting_violation_test.go` (2 issues, exit 1) vs `usetesting_compliant_test.go` (0 issues, exit 0).

2. **MUST: `usetesting`'s `os-setenv`, `context-background`, and `context-todo` settings are explicitly enabled in any adopted golangci-lint config — never left at the linter's own defaults.** Rationale: the linter's shipped defaults silently skip the three checks a fleet rule cares about most (Setenv, Background, TODO); "usetesting is enabled" is not the same claim as "usetesting catches os.Setenv." VERIFIED: reading `github.com/ldez/usetesting`'s documented default values (`os-setenv: false`, `context-background: false`, `context-todo: false`) — no fixture needed beyond confirming the linter is silent without the override, which Verification runs §7 also demonstrates implicitly (the same violation file was written expecting both checks; both fired only because the config set them `true`).

3. **SHOULD: a module with `go >= 1.25` whose test exercises time-dependent concurrent code (a retry/backoff, a debounce, a timeout, anything that calls `time.Sleep`/`time.After`/`time.NewTimer` and needs deterministic timing in its test) wraps the test body in `synctest.Test(t, func(t *testing.T) { ... })` rather than sleeping for real or hand-rolling a fake clock.** Rationale: removes both the flakiness and the slowness of a real-sleep test at once. VERIFIED: yes — fixture path `fixtures/time-fuzz-coverage/retry_realsleep_test.go` (reported test time `0.072s`) vs `retry_synctest_test.go` (reported test time `0.001s`), same assertions, same production code.

4. **MUST-FIX: `synctest.Run(...)` anywhere in a codebase, on a toolchain `>= 1.26`, is a compile break, not a style nit.** Rationale: the old experimental API was removed, not deprecated-and-kept. VERIFIER: `go build ./...` (or `go vet ./...`) on the module — the compiler itself is the check, no lint needed; grep as a pre-flight: `grep -rn -e 'synctest\.Run(' . --include='*.go'` (empty output means clean; any hit on a `go >= 1.26` module is the finding). VERIFIED: yes — fixture path `fixtures/time-fuzz-coverage/synctest_run_stale.go.txt` (renamed to `.go` to trigger), `go build` fails with `undefined: synctest.Run`, exit 1.

5. **P1 SHOULD: every exported parser of untrusted, externally-sourced input (an OCI manifest, a digest string, a config file, an archive header, the SDK's JSON envelope) has a `FuzzXxx` test seeded under `testdata/fuzz/FuzzXxx/` with at least the known edge cases (empty input, truncated input, the shortest valid input) as explicit `f.Add` seeds.** Rationale: a hand-written table test only covers inputs a human thought of; a parser is exactly the surface where an adversary controls the input. VERIFIER: a named reading heuristic — grep every function whose signature takes a `string`/`[]byte` and returns `(T, error)` or panics on malformed input, cross-reference against `grep -rl -e '^func Fuzz' . --include='*_test.go'` for a sibling fuzz test; no fully-mechanical check exists (a function can be a "parser of untrusted input" without any syntactic marker). VERIFIED: yes on the planted case — fixture path `fixtures/time-fuzz-coverage/digest_fuzz_test.go` / `digest.go`; the seed corpus alone reproduced a slice-bounds panic (exit 1, `go test -run FuzzParseDigest`), fixed version passes 18.7M generated executions in 15s of `-fuzztime` with zero failures (exit 0).

6. **MUST: CI fuzzing, where it runs at all, is bounded with `-fuzztime=<duration>`; `go test -fuzz=FuzzXxx` with no `-fuzztime` never appears in a CI job definition.** Rationale: unbounded fuzzing runs until interrupted or a failure is found — a CI job with no time bound either hangs the pipeline or (if externally time-limited) produces a non-deterministic "did it finish" signal. VERIFIER: `grep -rn -e '\-fuzz=' .github/workflows/ --include='*.yml' --include='*.yaml' -r` then confirm every matched line also matches `-fuzztime=`; empty output from the first grep means no CI fuzzing configured at all, which is a gap to flag, not a pass. VERIFIED: no — reading heuristic only; the corpus shows 3/32 repos flag `-fuzz` in CI at all ([exemplar-quality-gates.md §3](../go-audit/exemplar-quality-gates.md)), too few to spot-check the `-fuzztime` pairing without opening each workflow file by hand, which was out of this dive's budget.

7. **P1 MUST for a CLI or binary that needs integration-level coverage: build with `go build -cover [-coverpkg=<paths>]`, always run with `GOCOVERDIR` set to a directory that exists, and never trust a run's silence about coverage — check stderr for the `GOCOVERDIR not set` warning in the test harness itself.** Rationale: an unset `GOCOVERDIR` fails silently (warning to stderr, exit code unaffected) — a CI harness that only checks the exit code will report 100% green while collecting 0% coverage. VERIFIER: `go tool covdata percent -i=<dir>` after the run — if it errors "no such directory" or the directory is empty, the run collected nothing; a smoke-test in CI that asserts the covdata directory is non-empty after the integration suite runs is the mechanical version of this check. VERIFIED: yes — fixture path `fixtures/time-fuzz-coverage/cmd/covcli/`, `covdata_set/` (populated) vs the unset-`GOCOVERDIR` run (prints the warning, `covdata_set/` unchanged).

8. **MUST: a coverage-percentage gate reads the `total:` line of `go tool cover -func`'s (or `go tool covdata percent`'s) output through a script, never a hand-maintained percentage comment or a CI step that just eyeballs the printed number.** Rationale: no stdlib flag fails the build below a threshold; skipping the gate script means coverage regressions are silent until someone reads the log. VERIFIER: run the gate script against a real profile; an empty/unparsable `total:` line must exit non-zero (2 here), never silently "pass" — the check's own failure mode is part of what a reviewer verifies. VERIFIED: yes — script at `fixtures/time-fuzz-coverage/coverage_gate.sh`; `cov_99_9.profile` (fabricated 999/1000 statements) → `exit 1`; `cov_100.profile` (1000/1000) → `exit 0`.

9. **SHOULD: a new or rewritten benchmark uses `for b.Loop() { ... }` instead of `for i := 0; i < b.N; i++ { ... }`, UNLESS the benchmark body calls `b.StopTimer`/`b.StartTimer`/`b.ResetTimer`, in which case it keeps the `b.N` form.** Rationale: `b.Loop()` fixes a real dead-code-elimination correctness pitfall in the old form, but is a hard compile-time-safe/runtime-unsafe mix with the timer-control methods (`B.Loop called with timer stopped`) — not a mechanical, always-safe rewrite. VERIFIER: `grep -rn -e 'StopTimer\|StartTimer\|ResetTimer' <path-to-benchmark-file>` before rewriting; if it hits, do not rewrite (or rewrite the timer-control usage first, by hand). This is why `go fix`'s modernizer suite as of 1.27.1 does **not** include a `bloop` fixer — it was deliberately excluded ([golang/go#74967](https://github.com/golang/go/issues/74967)). VERIFIED: partial — the timer-control incompatibility is confirmed from the issue's own reproduction, not re-run here (out of fixture budget for this dive); the *performance-skew* half of the claim is independently re-verified in candidate 10.

10. **MUST: any benchmark-based performance claim (a PR description, a changelog line, a "faster" comment) is backed by `benchstat` over `go test -bench=X -count>=10` output for both variants, and states the p-value — never a single `ns/op` number from one run.** Rationale: measured directly in this dive — `b.Loop()` reported `+182.86%` (p=0.002, n=6) versus `b.N` for an *identical* loop body on a nanosecond-scale workload; a single-run comparison of two `ns/op` numbers without `benchstat` cannot distinguish this real, tool-caused effect from ordinary noise. VERIFIER: `go install golang.org/x/perf/cmd/benchstat@latest`; `benchstat old.txt new.txt`; reject any perf claim in review that shows raw `go test -bench` output with `count=1` and no `benchstat` table. VERIFIED: yes — fixture path `fixtures/time-fuzz-coverage/bench_bn_test.go` / `bench_bloop_test.go`; `benchstat` output `Sum-32  20.36n ± 2%  57.59n ± 2%  +182.86% (p=0.002 n=6)`.

## Verification runs

**§1 — synctest.Test vs real sleep, wall time.**
Fixture: `retry.go`, `retry_realsleep_test.go`, `retry_synctest_test.go`.
```
run.sh go test -run TestRetry_RealSleep -v -count=1 .
```
Output: `--- PASS: TestRetry_RealSleep (0.07s)` — `ok  timefuzzcoverage  0.072s`. Exit 0 (test passes; this is a timing measurement, not a pass/fail gate).
```
run.sh go test -run TestRetry_Synctest -v -count=1 .
```
Output: `--- PASS: TestRetry_Synctest (0.00s)` — `ok  timefuzzcoverage  0.001s`. Exit 0.
Relevant lines: internal reported test duration `0.072s` (real sleep) vs `0.001s` (synctest) for identical assertions and identical `Retry` logic (4 attempts, 10/20/40ms nominal backoff).

**§2 — synctest.Run fails to compile on 1.27.1.**
Fixture: `synctest_run_stale.go.txt` (renamed to `.go` to trigger; kept as `.go.txt` at rest so it never participates in the normal module build).
```
cp synctest_run_stale.go.txt synctest_run_stale.go && run.sh go build ./...
```
Violation output: `./synctest_run_stale.go:11:11: undefined: synctest.Run` — exit 1.
Compliant twin: the file removed (`rm synctest_run_stale.go`) — module builds clean, exit 0 (see §everything-else below, `go build ./...` succeeds throughout this dive once the file is absent).

**§3 — FuzzParseDigest finds and then survives a planted panic.**
Fixture: `digest.go` (bug then fix), `digest_fuzz_test.go`, seed corpus `testdata/fuzz/FuzzParseDigest/seed1`.
Violation (bug present — `hex = s[i+1:i+1+n]` unchecked):
```
run.sh go test -run FuzzParseDigest -v .
```
Output: `panic: runtime error: ... timefuzzcoverage.ParseDigest ... digest.go:25` — `FAIL  timefuzzcoverage  0.004s`. Exit 1 — the seed corpus entry `sha256:short` alone reproduces the panic, before any generative fuzzing.
```
run.sh go test -fuzz=FuzzParseDigest -fuzztime=60s .
```
Output: `failure while testing seed corpus entry: FuzzParseDigest/seed#2` — `FAIL`. Exit 1 (fails immediately during the baseline-coverage/seed-corpus phase).
Compliant twin (bug fixed — bounds check added):
```
run.sh go test -fuzz=FuzzParseDigest -fuzztime=15s .
```
Output: `fuzz: elapsed: 15s, execs: 18725633 ... new interesting: 1 (total: 5)` — `PASS` — `ok  timefuzzcoverage  15.190s`. Exit 0.

**§4 — GOCOVERDIR unset loses coverage data silently.**
Fixture: `cmd/covcli/main.go`, built with `run.sh go build -cover -o covcli.bin ./cmd/covcli`.
Set:
```
GOCOVERDIR=./covdata_set ./covcli.bin add
```
Output: program's own stdout (`3`), exit 0; `ls covdata_set/` shows `covmeta.*` and `covcounters.*` files written.
Unset:
```
unset GOCOVERDIR; ./covcli.bin add
```
Output: `warning: GOCOVERDIR not set, no coverage data emitted` on stderr, then the program's own stdout (`3`); exit 0; `covdata_set/` unchanged (no new files) — this is the "loses data with only a warning" case the brief asked to confirm.
Merge/convert:
```
run.sh go tool covdata percent -i=covdata_set        # -> "60.0% of statements"
run.sh go tool covdata textfmt -i=covdata_set -o cov.profile
run.sh go tool cover -func=cov.profile               # per-func breakdown, add=100%, sub=100%, main=50%, total=60.0%
```

**§5 — 100% coverage gate script.**
Fixture: `coverage_gate.sh`, `cov_99_9.profile` (999/1000 covered statements against a real 1000-statement function, `fakecov.go`), `cov_100.profile` (1000/1000).
Violation:
```
./coverage_gate.sh cov_99_9.profile 100
```
Output: `coverage 99.9% < threshold 100.0%` — exit 1.
Compliant twin:
```
./coverage_gate.sh cov_100.profile 100
```
Output: `coverage 100.0% >= threshold 100.0%` — exit 0.
(Underlying `go tool cover -func` confirmed the exact percentages independently: `Sink  99.9% ... total: 99.9%` and `Sink  100.0% ... total: 100.0%`.)

**§6 — b.N vs b.Loop, benchstat.**
Fixture: `bench_bn_test.go` (`BenchmarkSumBN`), `bench_bloop_test.go` (`BenchmarkSumBLoop`), identical 100-int-sum body.
```
run.sh go test -run '^$' -bench BenchmarkSumBN -count=6 .     # -> ~20.3-20.8 ns/op across 6 runs
run.sh go test -run '^$' -bench BenchmarkSumBLoop -count=6 .  # -> ~56.2-58.9 ns/op across 6 runs
run.sh go install golang.org/x/perf/cmd/benchstat@latest
run.sh benchstat bn_renamed.txt bloop_renamed.txt   # benchmark names normalized to "Sum" so benchstat compares them
```
Output: `Sum-32   20.36n ± 2%   57.59n ± 2%  +182.86% (p=0.002 n=6)`. This is not a pass/fail gate but a magnitude measurement — the "red" case here is "the two variants are not equivalent," which benchstat's own p-value confirms (p=0.002, well under the 0.05 significance bar), and the "green" case is the negative control implicit in candidate 10's rule (a `benchstat` run is required before any such claim ships).

**§7 — usetesting flags os.MkdirTemp / os.Setenv.**
Fixture: `usetesting_violation_test.go`, `usetesting_compliant_test.go`, `.golangci.yml` (`usetesting` enabled, `os-setenv`/`context-background`/`context-todo` set `true`).
Violation:
```
run.sh golangci-lint run --config .golangci.yml ./...
```
Output:
```
usetesting_violation_test.go:12:14: os.MkdirTemp() could be replaced by t.TempDir() in TestUseTestingViolation (usetesting)
usetesting_violation_test.go:18:12: os.Setenv() could be replaced by t.Setenv() in TestUseTestingViolation (usetesting)
2 issues:
* usetesting: 2
```
Exit 1.
Compliant twin:
```
run.sh golangci-lint run --config .golangci.yml usetesting_compliant_test.go
```
Output: `0 issues.` — Exit 0.

All fixtures also pass `run.sh go vet ./...` (exit 0) and `run.sh go test ./...` (exit 0, excluding the deliberately-panicking §3 violation state, which is not the resting state of the fixture tree) as a sanity check that nothing else in the fixture module regressed.

## Exemplar evidence

- **`t.Context()` adoption is corpus-wide and near-universal in some repos.** `google/go-github@48d0a668cde8:github/actions_cache_test.go:32` — `ctx := t.Context()`; `etcd-io/etcd@7583cc6e7e27` — 73 bare `t.Context()` plus 64 `context.WithCancel(t.Context())`; `goreleaser/goreleaser@ff8de3d6c389` — 825 sites via its own `testctx.WrapWithCfg(t.Context(), ...)` helper built *on top of* `t.Context()`, not around it ([exemplar-quality-gates.md §4](../go-audit/exemplar-quality-gates.md)).
- **synctest adoption, 10/34 repos** ([exemplar-quality-gates.md §4](../go-audit/exemplar-quality-gates.md)); the one systematic dependency-injected-clock user is `etcd-io/etcd@7583cc6e7e27:server/etcdserver/api/v3compactor/compactor.go:22` (`clockwork`) — an alternative to synctest for pre-existing clock-interface code, not evidence against synctest ([exemplar-runtime-posture.md §8](../go-audit/exemplar-runtime-posture.md)).
- **Fuzzing concentrates in security-sensitive parsers exactly as the doc predicts**: `tailscale/tailscale@6b3a45f14ef6` (49 Fuzz funcs), `containerd/containerd@934434dde54b` (28) ([exemplar-code-shape.md §2](../go-audit/exemplar-code-shape.md)). CI actually running `-fuzz` is rare: 3/32 workflow-bearing repos ([exemplar-quality-gates.md §3](../go-audit/exemplar-quality-gates.md)).
- **`b.Loop()` vs `b.N` is a near-even corpus split that tracks recency, not repo age**: `prometheus/prometheus@270db2915054` 158 `b.Loop()` vs 0 `b.N`; `cockroachdb/pebble@13596f1e1cea` 8 vs 136 (the mirror image); `golang/tools@d2d3de9f066e` 76 vs 0 — corpus totals 340 vs 358 ([exemplar-code-shape.md §2](../go-audit/exemplar-code-shape.md)). No exemplar in this corpus runs `benchstat` in CI (0/32) — the benchmark-comparison discipline candidate 10 asks for is currently unenforced anywhere in the corpus, matching the map's own headline number.
- **CI coverage-flag counts, corrected for a false-positive-prone substring grep**: `-race` 17/32, `-coverprofile`/`-cover` 10/32, `-covermode=atomic` 3/32 ([exemplar-quality-gates.md §3](../go-audit/exemplar-quality-gates.md)) — a reminder that even "coverage measured" is a minority practice in CI, before any threshold-gating question is asked.
- **`go.uber.org/mock` has fully displaced the archived `github.com/golang/mock`**: 1 repo (`hashicorp/terraform`) imports the former, 0 import the latter, corpus-wide ([exemplar-quality-gates.md §4](../go-audit/exemplar-quality-gates.md)) — not this dive's rule family, but load-bearing context for anyone reading the test-library census table this section's numbers came from.

## AI-agent angle

- **Writing `context.Background()` or `context.TODO()` inside a test body instead of `t.Context()`.** This is a training-data artifact — nearly every pre-2025 Go tutorial and Stack Overflow answer uses `context.Background()` in tests, and the model has seen it far more often than the 1.24 replacement. Smallest check: `usetesting` with `context-background: true`/`context-todo: true` (both off by default — candidate 2 above exists specifically because an agent that "enables usetesting" without also setting these flags true has not actually fixed anything).
- **Reproducing a `synctest.Run(func() { ... })` sample from pre-2025 training data.** The renamed-to-`Test`, then removed, API is exactly the kind of "confidently generates plausible-looking, version-stale code" failure this program's Corrections section flags repeatedly for synctest specifically. Smallest check: `go build ./...` on any module claiming `go >= 1.26` — the compiler itself is the checker, no lint required; a pre-flight grep is `grep -rn -e 'synctest\.Run(' . --include='*.go'` (empty output means clean).
- **Applying the `bloop` (b.N → b.Loop) rewrite mechanically to every benchmark, including ones that call `b.StopTimer`/`b.StartTimer`.** An agent asked to "modernize this benchmark" and told "b.Loop is the new default" has every incentive to apply it uniformly; the failure is silent until the benchmark is actually run (`B.Loop called with timer stopped`), which an agent that only compiles code (not runs benchmarks) will never see. Smallest check: `grep -n -e 'StopTimer\|StartTimer\|ResetTimer' <file>` before rewriting a `b.N` loop in that file; a hit means don't rewrite mechanically.
- **Claiming a benchmark "got faster" or "got slower" from a single `go test -bench` run.** LLMs routinely present one number as evidence because that's the shape of the tool output they see; they do not spontaneously reach for `benchstat` unless told to. Smallest check: does the PR/commit message cite a p-value or a `±` confidence range? If not, the claim is unverified — reject it in review, per candidate 10.
- **Using `os.MkdirTemp`/`ioutil.TempDir`/`defer os.RemoveAll` in a newly-written test, on the assumption that this is still "the" idiom.** `ioutil.TempDir` in particular is a double anachronism — `io/ioutil` was deprecated in 1.16 for `os`, and `os.MkdirTemp` itself was superseded by `t.TempDir()` in 1.15 (older than the `io/ioutil` deprecation). Smallest check: `usetesting` with default settings already catches `os.MkdirTemp`/`os.CreateTemp`/`os.TempDir` (these three default to `true` in the linter, unlike `os-setenv`); a `golangci-lint` run with any non-empty `linters.enable` list should include `usetesting`.
- **Writing a hand-rolled table-driven "wait for the goroutine to finish" test with a `time.Sleep(100 * time.Millisecond)` polling loop, instead of `synctest.Test` + `synctest.Wait()`.** This is the single most common concurrency-test anti-pattern an LLM reproduces, because it's what most concurrency-test code on the training-data internet still looks like (synctest is barely a year old at the time of Go 1.27). Smallest check: `grep -rn -e 'time\.Sleep(' <test-file>` inside a `_test.go` file whose subject under test spawns a goroutine — a `time.Sleep` in a concurrency test, outside a `synctest.Test` bubble, is the finding (a reading heuristic, not a mechanical lint, since `time.Sleep` in a test is sometimes legitimate — e.g. rate-limiting an external call in an integration test).
- **Fabricating a coverage-threshold flag that doesn't exist** (`go test -cover -fail-under=100` or similar). There is no such flag in `go test`, `go tool cover`, or `go tool covdata` as of 1.27 — an LLM asked to "add a 100% coverage gate" may hallucinate one because the *concept* is common in other ecosystems (pytest-cov's `--cov-fail-under`, Jest's coverage thresholds) even though Go's toolchain has never shipped the equivalent. Smallest check: `go help test 2>&1 | grep -i fail-under` / `go tool cover -h 2>&1 | grep -i fail` (empty output confirms the flag does not exist); the correct answer is always a wrapper script (candidate 8).

## Contested / evolving

- **How aggressively to adopt `b.Loop()` for already-existing benchmarks.** The stdlib blog frames it as a straightforward correctness improvement; [golang/go#74967](https://github.com/golang/go/issues/74967) (closed 2026, resolved by disabling the automated `bloop` modernizer) shows the Go team itself concluded a blanket automated rewrite is unsafe. As of 2026-09-26 the practical consensus is: adopt `b.Loop()` for *new* benchmarks by default, but treat rewriting an *existing* benchmark as a manual, benchstat-verified decision — not automated, and not risk-free even done by hand on nanosecond-scale code. Direction: the modernizer stays disabled; no proposal to re-enable it was found in this dive's search window.
- **Whether CI should run fuzzing at all, and for how long.** The corpus shows almost no repos doing it (3/32 by CI-flag count), and the doc itself only gestures at "OSS-Fuzz" for genuinely continuous fuzzing rather than a bounded-`-fuzztime` CI step; there is no normative "N seconds in every PR" guidance from go.dev. This dive's candidate 6 states the shape of a bounded run without asserting a specific duration — that remains a per-project judgment call the brief did not resolve and this dive did not find grounds to resolve either.
- **synctest and real network/file I/O.** The blog is explicit that synctest cannot make network or file I/O durably-blocking, and recommends `net.Pipe` as the workaround for network code — but there's no equivalent documented workaround pattern for file-I/O-bound concurrent code (e.g. concurrent writers to the same directory) as of this dive's sources; this is a live gap in the tool's applicability that the ecosystem has not yet converged on a standard mitigation for.
- **Whether `usetesting`'s off-by-default checks (`os-setenv`, `context-background`, `context-todo`) should ship "on" in a fleet default config, or whether the upstream defaults reflect a deliberate false-positive-avoidance choice worth respecting.** This dive's candidate 2 takes the position that they should be turned on (the checks are correct and low-noise on the planted fixture), but this is an argued position, not a re-derivation of why upstream chose `false` — that reason was not found in the README and would need the linter's own issue tracker to confirm.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [pkg.go.dev/testing](https://pkg.go.dev/testing) | stdlib `testing` package reference | current, T.Context/T.Chdir/B.Loop since 1.24 | Primary — exact signatures and version-added notes for every T./B. method this dive covers |
| [pkg.go.dev/testing/synctest](https://pkg.go.dev/testing/synctest) | stdlib `testing/synctest` package reference | current, Test since 1.25, Sleep since 1.27 | Primary — the bubble/durable-blocking mechanics, restrictions, exact API |
| [go.dev/blog/synctest](https://go.dev/blog/synctest) | Go team blog post introducing synctest | 19 Feb 2025 | Primary — motivating problem (fast vs reliable), worked example, explicit "what it cannot do" section (mutexes, real I/O) |
| [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz) | Go Fuzzing reference doc | actively maintained | Primary — FuzzXxx requirements, corpus file format, `-fuzztime`, minimization behavior |
| [go.dev/doc/tutorial/fuzz](https://go.dev/doc/tutorial/fuzz) | Go Fuzzing tutorial | actively maintained | Primary — worked example of writing and running a fuzz test end to end |
| [go.dev/doc/build-cover](https://go.dev/doc/build-cover) | Coverage profiling for Go programs | Go 1.20+ feature | Primary — `go build -cover`, `-coverpkg`, `GOCOVERDIR`, `go tool covdata` subcommands |
| [go.dev/blog/integration-test-coverage](https://go.dev/blog/integration-test-coverage) | Go team blog post on integration coverage | Go 1.20 era | Primary — the build/run/report workflow narrative, `covdata merge` for combining unit + integration coverage |
| [pkg.go.dev/golang.org/x/perf/cmd/benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat) | `benchstat` tool reference | current | Primary (tool's own docs) — install command, input format, `-count=10` recommendation, p-value significance bar |
| [golang/go#74967](https://github.com/golang/go/issues/74967) | Accepted, closed GitHub issue: "modernize bloop: Can't use b.Loop() if loop contains b.StopTimer/b.StartTimer" | filed and resolved 2026 | Primary (project issue tracker) — the exact reasoning for excluding `bloop` from the safe modernizer suite, including the independently-cited +65% nanosecond-benchmark-skew data point |
| [golang/go#73567](https://github.com/golang/go/issues/73567) | Accepted proposal: "testing/synctest: replace Run with Test" | 2025-05-01 | Primary — the proposal that renamed Run to Test and scheduled removal of the old API |
| [github.com/ldez/usetesting](https://github.com/ldez/usetesting) | usetesting linter's own repository/README | current, bundled in golangci-lint | Primary (tool's own docs) — exact function-pair mappings and, critically, which checks default to `false` |
| [go.dev/blog/testing-b-loop](https://go.dev/blog/testing-b-loop) | Go team blog post introducing B.Loop | 2 Apr 2025 | Primary — the compiler-optimization pitfall B.Loop fixes in the old `b.N` idiom |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | Official Go 1.25 release notes | Aug 2025 | Primary — synctest GA, sync.WaitGroup.Go, exact version attribution used throughout this dive |
| [go-audit/exemplar-code-shape.md](../go-audit/exemplar-code-shape.md), [go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md), [go-audit/exemplar-runtime-posture.md](../go-audit/exemplar-runtime-posture.md) | This program's own exemplar-corpus audits | measured 2026-09-26 | Measured evidence for every corpus-adoption number cited in Findings/Exemplar evidence — cited per-section above, not re-derived here |

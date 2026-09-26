---
title: "slog, library logging, pprof exposure, GOMAXPROCS, and the go-diagnose runbook"
topic: go-observability
agent: observability/logging-and-diagnosis
model: sonnet
date_researched: 2026-09-26
sources_count: 20
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/logging-and-diagnosis/
scope: |
  Covers rows M-J-01..06, M-J-08 and M-P-03: log/slog as the SHOULD for new
  code and the library-logging MUST, sloglint/vet-slog well-formedness,
  net/http/pprof exposure, container-aware GOMAXPROCS vs automaxprocs, the
  symptom-to-tool table for a hung/leaking/racy/slow process, and a stdlib
  leak detector evaluated against goleak (contradiction 5 / GO-CONC-11).
  Does NOT cover PGO (M-J-07), allocation hygiene (M-J-09), Prometheus
  metrics or OpenTelemetry (M-J-10/11) or GOEXPERIMENT/tracebacklabels
  staleness (M-J-12) — all deferred per the topic map. Services get one
  short SHOULD note only (owner Q8: not a named consumer); no service-shaped
  depth file.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [slog: the logger interface, DiscardHandler, and what "library" means](#1-slog-the-logger-interface-discardhandler-and-what-library-means)
   2. [slog well-formedness: vet's slog analyzer vs sloglint](#2-slog-well-formedness-vets-slog-analyzer-vs-sloglint)
   3. [net/http/pprof exposure](#3-nethttppprof-exposure)
   4. [GOMAXPROCS: container-aware since 1.25, automaxprocs superseded](#4-gomaxprocs-container-aware-since-125-automaxprocs-superseded)
   5. [GOGC / GOMEMLIMIT: services only, not CLIs](#5-gogc--gomemlimit-services-only-not-clis)
   6. [The go-diagnose symptom-to-tool table](#6-the-go-diagnose-symptom-to-tool-table)
   7. [The stdlib leak detector vs goleak](#7-the-stdlib-leak-detector-vs-goleak)
   8. [The Linux 6.12/6.13 core-dump claim, verified](#8-the-linux-61213-core-dump-claim-verified)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Library and SDK code never calls `slog.SetDefault`; it accepts a `*slog.Logger` (or narrower, a `slog.Handler`) from its caller and defaults to `slog.DiscardHandler` (stdlib, Go 1.24, [`log/slog` var `DiscardHandler`](https://pkg.go.dev/log/slog#DiscardHandler)) when none is given — watched red/green below.
- The mechanical check for the SetDefault MUST is a two-part grep (`slog.SetDefault`, `log.SetOutput`) outside `package main`; it is a reading heuristic that also flags the exact string inside a comment, so a human still reads the one hit before filing it.
- `sloglint` with `no-global: "all"` catches the *use* of the global logger (`slog.Info(...)` at package scope) mechanically, in CI, with no dependency on a comment; it does **not** catch `slog.SetDefault` itself, which needs the grep.
- `sloglint` at its defaults (no settings block) does not fire on either the global-logger pattern or the mismatched-key-value pattern below — both need an explicit setting or a different tool.
- Mismatched slog key-value pairs (`log.Info("msg", "k1", v1, "k2")`, a non-string key) are caught by `go vet`'s built-in `slog` analyzer (`go vet ./...`, no linter install needed) at zero configuration cost — this is the MUST-backing check, not `sloglint`.
- `net/http/pprof` blank-imported and served on `http.DefaultServeMux`'s listener is the MUST-fail shape; the mechanical narrowing check is a two-step grep (files that blank-import it, filtered to those that also pass `nil` to `ListenAndServe` in the same file); anything outside that exact pattern still needs a human read, which is why the map's own audit found "26 imports never checked for gating."
- `net/http/pprof`'s own endpoint list grew in Go 1.27: `/debug/pprof/goroutineleak` is now registered alongside cmdline/profile/symbol/trace/heap/goroutine, so mounting pprof exposes the leak profile too, not just CPU/heap.
- `runtime.GOMAXPROCS(0)` is container-aware since Go 1.25 (`GODEBUG=containermaxprocs`, default on for any binary regardless of the module's `go` line) and self-updates on cgroup change (`GODEBUG=updatemaxprocs`) — measured directly under a real `cpu.max` cgroup limit below: `go.uber.org/automaxprocs` is now redundant for any binary built with a 1.25+ toolchain (this refines GO-MOD-09: the toolchain gates it, not the module's `go` line, since `GOMAXPROCS(0)`'s default computation is not gated by `//go:build goX.Y`).
- Setting the `GOMAXPROCS` environment variable (or calling `runtime.GOMAXPROCS(n)`) still wins over the cgroup default and disables automatic updates — `runtime.SetDefaultGOMAXPROCS()` (Go 1.25) is the only way back to the auto-updating default once either has fired.
- `GOGC`/`GOMEMLIMIT` tuning is a long-lived-service concern, not a CLI one: a short-lived process exits before a second GC cycle matters, and setting `GOMEMLIMIT` on an unbounded-input CLI risks GC thrashing under a workload the tuner never saw. The rule set gives services one SHOULD line and moves on (owner Q8).
- The `goroutineleak` profile (GA in Go 1.27, experimental in 1.26; deleted the `goroutineleakprofile` GOEXPERIMENT flag) is by design blind to a leaked goroutine reachable through a global variable or a runnable goroutine's local — [go.dev/doc/go1.27](https://go.dev/doc/go1.27) documents exactly this limitation, and the fixture below reproduces it exactly (1/3 caught).
- `pprof.Lookup("goroutineleak")` is available in any binary built by a 1.27+ toolchain regardless of the importing module's own `go` line (measured: `go 1.26` in `go.mod`, built by 1.27.1, profile registers and runs) — the SDK's 1.26.0 floor does not block using it.
- SIGQUIT always dumps every user goroutine and then terminates the process, independent of `GOTRACEBACK`'s default ("single"); read a captured dump for repeated identical blocked-state tags (`[sync.Mutex.Lock]` on two goroutines both `created by main.main`) as the deadlock signature.
- `GODEBUG=execwait=2` is a CI/diagnosis-only switch, not a runtime default: it panics the process on the first leaked, un-`Wait`ed `exec.Cmd`, fatal by design (re-confirmed here; already GO-TEST-12 for CI use and go-io conflict 11 for "never a runtime rule").
- `-race -count=20` with `GORACE=halt_on_error=1` is the reproduction step for a race that a single `-race` run misses by luck; `halt_on_error=1` stops at the first report instead of letting the run continue and print N reports for one race.
- `runtime/trace.FlightRecorder` (GA Go 1.25) is the tool for a stall that leaves no CPU sample and no goroutine leak — a goroutine that blocks and then unblocks — because it is the only mechanism here that keeps a rolling window and can be snapshotted exactly when a symptom (a slow request) is detected, without paying full-trace overhead beforehand.
- A ~100-line, dependency-free `TestMain` that diffs two `runtime.Stack(buf, true)` snapshots (before/after, canonicalized by stripping the goroutine header and file:line frames) caught all three planted leak shapes — including the two shapes wave 2 recorded as *misses* for `synctest` and the `goroutineleak` profile (1/3 each). This resolves contradiction 5: **GO-CONC-11 is revised from `goleak.VerifyTestMain` to the stdlib diff**, and the SDK's test dependencies return to go-cmp only (owner default in GO-MOD-17/M-L-17 is honored without a second test-only exception).
- The practitioner claim "core-dump support is currently broken on Linux kernels 6.12/6.13" verified false as a Go-runtime claim and true as an **elfutils/systemd-coredump** claim: the actual bug is elfutils failing to symbolize a core produced on those kernels ([sourceware.org bug 32713](https://sourceware.org/bugzilla/show_bug.cgi?id=32713)), not a Go issue-tracker entry; there is no matching `golang/go` issue, and the closest lookalike (`golang/go#73141`, a `vgetrandom`/kernel-6.11+ segfault) is an unrelated runtime bug, not a core-dump-symbolization bug.

## Findings

### 1. slog: the logger interface, DiscardHandler, and what "library" means

`log/slog`'s own design blog post states the library-author rule directly: "accept either `*slog.Logger` or `Handler` as dependencies rather than setting global defaults," because `SetDefault` "affects global logging behavior" for the whole process, including code that never asked for it ([go.dev/blog/slog](https://go.dev/blog/slog)). `slog.SetDefault` also rewires the legacy `log` package's `Printf`/`Print` family, so a library that calls it hijacks *two* logging surfaces at once ([pkg.go.dev/log/slog#SetDefault](https://pkg.go.dev/log/slog#SetDefault)).

`slog.DiscardHandler` (a `var`, not a constructor) landed in Go 1.24 (`go1.24.txt: pkg log/slog, var DiscardHandler Handler #62005`, confirmed by reading the API diff file directly under the local toolchain's `GOROOT/api/go1.24.txt`). Before 1.24 the idiom was `slog.New(slog.NewTextHandler(io.Discard, nil))`, which still allocates a handler and formats output it then throws away; `DiscardHandler.Enabled` returns `false` for every level, so no `Attr` is ever even evaluated.

The fixture pair:

```go
// libbad: package-level init sets the process-wide default.
func init() {
    slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, nil)))
}
func Do() { slog.Info("libbad did work") }

// libgood: caller-supplied logger, discard by default.
func NewClient(log *slog.Logger) *Client {
    if log == nil {
        log = slog.New(slog.DiscardHandler)
    }
    return &Client{log: log}
}
```

(`fixtures/logging-and-diagnosis/libbad/libbad.go`, `fixtures/logging-and-diagnosis/libgood/libgood.go`.)

This is a **library** rule, not a CLI rule: a CLI's own internal setup package (its `main`-adjacent logging bootstrap) is the sanctioned place to call `SetDefault` exactly once, because the CLI *is* the top-level owner of the process's logging. `aquasecurity/trivy`'s own `pkg/log` package does this — `slog.SetDefault(New(h))` and an exported `var SetDefault = slog.SetDefault` (`aquasecurity/trivy@ae561f8cca36:pkg/log/logger.go:51,58,91`) — and that is correct for a CLI's own logging bootstrap, not a violation; the MUST binds an importable library or SDK, never the CLI binary that owns `main`.

### 2. slog well-formedness: vet's slog analyzer vs sloglint

Two different tools catch two different defects, and an agent must not treat them as interchangeable:

- **`go vet`'s `slog` analyzer** ("check for invalid structured logging calls," `go vet help` on Go 1.27.1) catches the *malformed-argument* shape: an odd number of key-value arguments (the trailing value gets the literal key `"!BADKEY"`, per [`pkg.go.dev/log/slog`](https://pkg.go.dev/log/slog)'s own documented behavior for that case) and a non-string key. It ships in the standard `go vet ./...` run — no linter install, no config.
- **`sloglint`** ("Ensures consistent code style when using log/slog," bundled into golangci-lint 2.14.0) is a *style* linter: "No global logger," "Context only," "Discard handler," "Static message," "Message style," "No mixed arguments," "Key-value pairs only," "Attributes only," "Constant keys," "Allowed/Forbidden keys," "Key naming case" ([go-simpler/sloglint README](https://github.com/go-simpler/sloglint/blob/main/README.md)). Its "No global logger" check needs `settings.sloglint.no-global: "all"` explicitly — off by default — and even then it flags *call sites* (`slog.Info(...)` used at package scope), not the `SetDefault` call that enabled them.

Watched directly (both go vet and sloglint's no-global check; commands and exact output in [Verification runs](#verification-runs)). At sloglint's plain defaults (`enable: [sloglint]`, no settings), it fires **zero** issues on either the mismatched-key-value fixture or the `SetDefault` fixture — an agent that "enables sloglint" and stops there has enabled a linter that does nothing for either defect it was reaching for.

### 3. net/http/pprof exposure

`net/http/pprof`'s doc comment states the mechanism plainly: importing it for its side effect (`import _ "net/http/pprof"`) registers `/debug/pprof/*` handlers on `http.DefaultServeMux`; anyone serving `http.DefaultServeMux` on a public listener is serving pprof there too. As of Go 1.27, `/debug/pprof/goroutineleak` joins `cmdline`, `profile`, `symbol`, `trace`, plus the profile index (`heap`, `goroutine`, `allocs`, `threadcreate`, `block`, `mutex`), so a public pprof mount now also lets a remote caller pull a goroutine-leak stack dump, not only CPU/heap ([go.dev/doc/go1.27](https://go.dev/doc/go1.27), profile source confirmed locally at `GOROOT/src/runtime/pprof/pprof.go:265` `"goroutineleak": goroutineLeakProfile`).

The MUST-failing shape and its compliant twin:

```go
// pprofbad: blank import + nil mux = pprof on the public listener.
import _ "net/http/pprof"
...
http.ListenAndServe(":8080", nil)

// pprofgood: pprof on its own mux, its own (loopback) listener.
debugMux := http.NewServeMux()
debugMux.HandleFunc("/debug/pprof/", pprof.Index)
... 
go http.ListenAndServe("127.0.0.1:6060", debugMux)
http.ListenAndServe(":8080", publicMux)
```

(`fixtures/logging-and-diagnosis/pprofbad/main.go`, `pprofgood/main.go`.)

The mechanical check only narrows the exact pattern above (blank import + `nil` mux in the same file); it is not a general verdict, matching what [run](../go-audit/exemplar-runtime-posture.md) §4 already found — 26 real `net/http/pprof` imports in the corpus, "never checked for gating." Two real, compliant exemplar shapes: `kubernetes-sigs/controller-runtime` registers the five pprof handlers on a dedicated `pprofListener net.Listener`, wired only when the caller configures one (`kubernetes-sigs/controller-runtime@d0127f7f66de:pkg/manager/internal.go:105-106,329-333,420-422`); `caddyserver/caddy` mounts the same handlers on its admin API's own mux, which binds to a separate address from the public HTTP listeners by default (`caddyserver/caddy@54937914234b:admin.go:269-273`).

### 4. GOMAXPROCS: container-aware since 1.25, automaxprocs superseded

`runtime.GOMAXPROCS`'s own doc comment (read locally, `GOROOT/src/runtime/debug.go:11-66`) specifies the full mechanism: absent an explicit `GOMAXPROCS` env var, the runtime picks the minimum of the logical CPU count, the CPU affinity mask, and — on Linux — "the process's average CPU throughput limit based on cgroup CPU quota" (`cpu.max` under cgroup v2; `cpu.cfs_quota_us`/`cpu.cfs_period_us` under v1), rounding a fractional limit up, and never going below 2 unless the CPU count itself is below 2. It re-checks at most once per second. `GODEBUG=containermaxprocs=0` reverts to the pre-1.25 behavior (`runtime.NumCPU()`); `GODEBUG=updatemaxprocs=0` disables the periodic re-check. Both `GODEBUG` settings are registered with `Changed: 25` in `internal/godebugs/table.go`, i.e. their *old* behavior (off) is what a `go` line ≤1.24 gets by default — confirming GO-MOD-09's framing that this is gated by the **toolchain**, and specifically by the `go` line's `GODEBUG` default table, not by whether the code imports anything new.

Measured directly under a real 2-core cgroup v2 quota (`systemd-run --user --scope -p CPUQuota=200%`, confirmed via `cat /sys/fs/cgroup<scope-path>/cpu.max` → `200000 100000`):

| Condition | `NumCPU()` | `GOMAXPROCS(0)` |
|---|---|---|
| unrestricted (32 logical CPUs) | 32 | 32 |
| 2-core cgroup quota, default | 32 | **2** |
| 2-core cgroup quota, `GODEBUG=containermaxprocs=0` | 32 | 32 |
| 2-core cgroup quota, `GOMAXPROCS=8` env | 32 | 8 (env wins) |
| 0.5-core cgroup quota | 32 | 2 (rounds up, then floored at 2) |

Exact commands and output in [Verification runs](#verification-runs). `go.uber.org/automaxprocs`'s README states its purpose is exactly "automatically set `GOMAXPROCS` to match the Linux container CPU quota" — a feature now built into the runtime for any binary compiled by a 1.25+ toolchain. Three exemplars still import it directly (`caddyserver/caddy`, `restic/restic`, `prometheus/prometheus` — all `go.mod` roots ≤1.24 at the audited SHA, [run](../go-audit/exemplar-runtime-posture.md) §4), consistent with the supersession being toolchain-gated rather than a reason those repos are wrong today.

### 5. GOGC / GOMEMLIMIT: services only, not CLIs

`GOGC` sets the target heap growth ratio after live bytes (default 100 = double live heap before the next cycle); `GOMEMLIMIT` (Go 1.19+) is a *soft* ceiling on total runtime memory (`Sys - HeapReleased`) that the GC will exceed briefly rather than thrash or stall the program — both documented at [go.dev/doc/gc-guide](https://go.dev/doc/gc-guide). Both exist to trade CPU for memory in a process that runs long enough for the trade to matter and whose steady-state heap is knowable ahead of time — a long-lived service or daemon. A short-lived CLI invocation typically finishes before a second full GC cycle would even fire, and `GOMEMLIMIT` on a CLI with unbounded or unknown input size risks converting an OOM into a GC-thrashing hang instead, which is strictly worse for a tool the user expects to just finish or fail. Discord's own posttmortem of a large in-memory cache under Go's GC (cited by the map's [fail](../go-audit/exemplar-code-shape.md); see Sources) is the canonical failure story for the tuning-needed case, and it is a long-lived service, not a CLI.

Per owner Q8 (services are not a named consumer of this program), this is the single SHOULD row this dive contributes; no service-shaped depth file follows from it.

### 6. The go-diagnose symptom-to-tool table

| Symptom | Tool | Command | What confirms it |
|---|---|---|---|
| Hung process, still "alive" | SIGQUIT dump | `kill -QUIT <pid>` (default `GOTRACEBACK=single`; SIGQUIT always dumps every user goroutine and exits regardless) | Two or more goroutines parked in the same blocked state (e.g. `[sync.Mutex.Lock]`), both `created by` the same caller — a lock-order inversion |
| Fully deadlocked (every goroutine asleep) | the runtime's own detector | nothing to run — it self-reports | `fatal error: all goroutines are asleep - deadlock!` and exits with a full dump, unprompted — **this only fires when literally every goroutine is blocked**; a real service almost always keeps an accept loop or a ticker runnable, which is exactly why SIGQUIT is the general tool and the auto-detector is not |
| Leaking goroutines (in a test) | `goleak.VerifyTestMain`, **or the stdlib diff below** | `go test ./...` (goleak wired in `TestMain`) | Non-nil error naming each leaked goroutine's creation stack |
| Leaking goroutines (running server) | `runtime/pprof` `goroutineleak` profile (GA 1.27) | `curl localhost:PORT/debug/pprof/goroutineleak?debug=1` or `pprof.Lookup("goroutineleak").WriteTo(w, 1)` | Non-zero `Count()`; **documented miss**: a blocking primitive reachable through a global or a runnable goroutine's local is never flagged, by design ([go.dev/doc/go1.27](https://go.dev/doc/go1.27)) |
| Racy code | `-race`, repeated | `go test -race -count=20 ./...`; add `GORACE=halt_on_error=1` to stop at the first report | `WARNING: DATA RACE` with both stacks; a single `-race` run can pass by luck, which is why `-count=20` |
| CPU hotspot | `pprof` CPU profile | `go tool pprof -top <bin> cpu.pprof`; then `go tool pprof -list=<func> <bin> cpu.pprof` | `-top` ranks by `flat`/`cum`; `-list` annotates the exact source lines with sampled time |
| A stall with no CPU sample and no leak | `runtime/trace.FlightRecorder` (GA 1.25) | keep a `FlightRecorder` running; on a detected symptom (e.g. a slow request), call `WriteTo`; read with `go tool trace` | The trace shows a goroutine's `Running→Waiting` state transition ("sleep"/"chan receive"/etc.) spanning the stall window — invisible to a CPU profile because the goroutine was never running |
| Leaked, un-waited subprocess | `GODEBUG=execwait=2` (CI/diagnosis only, never a runtime default; panics) | `GODEBUG=execwait=2 go test ./...` (or `go run` for one-off repro) | `panic: exec: Cmd started a Process but leaked without a call to Wait`, with the exact `exec.Command` call site named |
| Need to inspect live state interactively | Delve attach | `dlv attach <pid> [executable]` ([delve docs](https://github.com/go-delve/delve/blob/master/Documentation/usage/dlv_attach.md)); rebuild with `-gcflags=all="-N -l"` first to disable optimizations for a readable session | `goroutines`/`bt` inside the Delve session |
| Post-mortem after a crash | `GOTRACEBACK=crash` + `coredumpctl` | set the env var before running; on crash, `coredumpctl debug` | A full core dump, symbolized — **except on Linux 6.12/6.13**, see [§8](#8-the-linux-61213-core-dump-claim-verified) |

Ordering principle: SIGQUIT and the runtime's own deadlock detector are free and require no prior instrumentation, so they come first; `-race`, pprof, and the flight recorder all require the binary to already carry a flag/endpoint or a rerun with a different build; Delve and core dumps are the last resort because they require attaching to (or preserving a corpse of) the specific failing process, which the skill treats as consent-gated (see [§7](#7-the-stdlib-leak-detector-vs-goleak) refusal clause below).

**What the skill refuses:** attaching a debugger (Delve) or requesting a live profile/trace from a process the operator has not identified as theirs to touch, and in particular never from a production process without the operator's explicit, in-the-moment consent — the skill surfaces the command and the risk (a `-race` rebuild changes the binary; a CPU profile briefly taxes a live service; Delve attach can stop the process's scheduler) and stops there.

### 7. The stdlib leak detector vs goleak

Wave 2 measured three leak detectors against three planted leak shapes (an unjoined goroutine on an unbuffered channel, one blocked on a real syscall/pipe read, one held by a package-level global) and found `goleak.VerifyTestMain` catching 3/3, while `testing/synctest`'s bubble deadlock check and the `goroutineleak` profile each caught only 1/3 — both miss by design (synctest only fails on goroutines it can prove "durably blocked" *inside* its own bubble; the profile is blind to anything reachable through a global or a runnable local) — see `go-concurrency/goroutine-ownership.md` and GO-CONC-11.

This dive's brief asked the open question directly: can a ~100-line stdlib-only `TestMain` match goleak, so the SDK drops the dependency? Built and run (`fixtures/logging-and-diagnosis/leakshapes/`, `stdlibleak/`, `stdlibleak-clean/`):

The detector (`stdlibleak/detector.go`) snapshots `runtime.Stack(buf, true)` before `m.Run()` and after, retrying up to 20×50ms for goroutines that are merely finishing rather than leaked. Each snapshot is canonicalized into a multiset of per-goroutine signatures: the `goroutine N [state]:` header line is dropped (state and id are not part of identity across two snapshots), every `\t/path/file.go:NN` frame line is dropped (so the exact call site of the *detector's own* call to `runtime.Stack` — which differs between the "before" and "after" call sites — cancels out instead of registering as a false leak), and each remaining `pkg.Func(args)` line has its argument values erased. Any signature present more times *after* than *before* is a leak.

Run against all three leak shapes in one package (`TestStartUnjoined`, `TestStartBlockedOnSyscall`, `TestStartHeldByGlobal`, sharing one `TestMain`):

```
$ go test -v ./stdlibleak/...
...
--- PASS: TestStartUnjoined (0.00s)
--- PASS: TestStartBlockedOnSyscall (0.00s)
--- PASS: TestStartHeldByGlobal (0.00s)
PASS
stdlib leak detector: goroutine(s) present after tests that were not present before:
--- x1 ---
logging-and-diagnosis-fixture/leakshapes.StartUnjoined.func1()
created by logging-and-diagnosis-fixture/leakshapes.StartUnjoined in goroutine 7
--- x1 ---
internal/poll.runtime_pollWait()
... (through os.().Read to leakshapes.StartBlockedOnSyscall.func1())
--- x1 ---
logging-and-diagnosis-fixture/leakshapes.StartHeldByGlobal.func1()
created by logging-and-diagnosis-fixture/leakshapes.StartHeldByGlobal in goroutine 11
FAIL	logging-and-diagnosis-fixture/stdlibleak	1.014s
```

**3/3 caught**, including the syscall-blocked and global-held shapes that both synctest and the `goroutineleak` profile missed. Against the compliant twin (`stdlibleak-clean`, exercising only the joined shape and waiting on it): `ok ... 0.002s`, zero false positives, stable across five repeated runs (`go test -count=5`).

**Resolution of contradiction 5:** GO-CONC-11's text is revised from `goleak.VerifyTestMain(m)` to this stdlib diff pattern, and the SDK's test-only dependency set returns to go-cmp alone — the owner default at [conc] Open question 1 ("goleak admitted as a second test-only SDK dependency") is superseded by this measurement, not overridden by fiat. The pattern is a fixture for the go-quality support directory (a copy-paste `TestMain`), not a new package the fleet maintains: it has no ignore-list of runtime-internal stack shapes the way goleak does (see [Contested](#contested--evolving) for the honest limitation this implies).

### 8. The Linux 6.12/6.13 core-dump claim, verified

The map's practitioner survey (`go-topic-map/practitioner.md` §17, citing Michael Stapelberg's ["Tips to debug hanging Go programs"](https://michael.stapelberg.ch/posts/2025-02-27-debug-hanging-go-programs/)) flagged "a specific, dated caveat that core-dump support is currently broken on Linux kernels 6.12/6.13" as a claim to verify against the Go issue tracker before citing.

Verified by reading the source post directly: the exact sentence is "Linux 6.12 and 6.13 produced core dumps that elfutils cannot symbolize. systemd-coredump uses elfutils for symbolization, so avoid 6.12/6.13 in favor of using 6.14 or newer," linking to [sourceware.org bug 32713](https://sourceware.org/bugzilla/show_bug.cgi?id=32713) — an **elfutils** bug, not a `golang/go` issue. There is no matching entry in the Go issue tracker for a 6.12/6.13-specific core-dump break. Searching the tracker for the nearest lookalike surfaces [`golang/go#73141`](https://github.com/golang/go/issues/73141), "segmentation fault from `vgetrandomPutState`," which is a real, separate, still-open (`NeedsFix`, milestone Go 1.25) bug triggered by `getrandom`'s vDSO optimization on Linux 6.11+ combined with `runtime.LockOSThread` — a SIGSEGV during a slice grow at an unsafe point in the M/P lifecycle, not a core-dump-symbolization failure. **The claim is correctly attributed to the wrong tracker in the source material an agent would guess to cite: it is true, but the fix and the tracking issue live in elfutils/systemd, not in Go.** A go-diagnose skill citing this caveat must name `sourceware.org bug 32713`, never a `golang/go#NNNNN` number.

## Normative guidance candidates

1. **A library or SDK never calls `slog.SetDefault` or `log.SetOutput`; it accepts a `*slog.Logger`/`slog.Handler` parameter and defaults to `slog.New(slog.DiscardHandler)` when none is given.**
   Rationale: `SetDefault` is process-wide global state; a library that sets it hijacks every other package's logging, including its own caller's.
   Verify: `grep -rn -e 'slog\.SetDefault' -e 'log\.SetOutput' --include='*.go' <dir>` (empty output outside `package main` = pass; a hit is the finding, including inside a comment naming the call, which a reviewer discards on read).
   Run: **yes** — red on `fixtures/logging-and-diagnosis/libbad/`, green on `fixtures/logging-and-diagnosis/libgood/`.

2. **A library never calls a package-level `slog` function (`slog.Info`, `slog.Error`, …); every call goes through an explicit `*slog.Logger` value.**
   Rationale: a package-level call always resolves through `slog.Default()`, i.e. whatever `SetDefault` last set anywhere in the process — the same hazard as rule 1, reachable even without an explicit `SetDefault` call in the offending package itself.
   Verify: `golangci-lint run --config <cfg>` with `linters.enable: [sloglint]` and `linters.settings.sloglint.no-global: "all"` (0 issues = pass; a `default logger should not be used (sloglint)` hit is the finding).
   Run: **yes** — red on `fixtures/logging-and-diagnosis/libbad/` (`sloglint: default logger should not be used`), green on `libgood/`.

3. **Every slog call site has a matched key for every value, and every key is a string (or `slog.Attr`).**
   Rationale: an unmatched final argument silently becomes a value under the key `"!BADKEY"`, and a non-string key produces the same silent corruption — both compile, and both are wrong logs an operator will misread.
   Verify: `go vet ./...` (the `slog` analyzer runs by default, no flag needed at Go 1.27.1; a `missing a final value` or `should be a string or a slog.Attr` diagnostic is the finding; empty = pass).
   Run: **yes** — red (exit 1, two diagnostics) on `fixtures/logging-and-diagnosis/slogmisuse/`, green (exit 0) on `slogmisuse_fixed/`.

4. **`net/http/pprof` is never blank-imported into a binary that also serves `http.DefaultServeMux` (or any mux carrying public routes) on a listener reachable by anything but the operator.**
   Rationale: the pprof endpoints include `profile` (attacker-triggerable CPU sampling), `cmdline`, and as of Go 1.27 `goroutineleak` — a full memory/goroutine disclosure surface, not a metrics endpoint.
   Verify: `grep -rl -e '_ "net/http/pprof"' --include='*.go' <dir> | xargs -r grep -ln -e 'ListenAndServe(.*, *nil)'` (empty output = pass for this exact pattern; this is a narrowing heuristic, not a full verdict — a gated mux still needs a human read, per the map's own "26 imports never checked" finding).
   Run: **yes** — non-empty on `fixtures/logging-and-diagnosis/pprofbad/`, empty on `pprofgood/`.

5. **A long-lived service reads its worker/parallelism sizing from `runtime.GOMAXPROCS(0)`, never from `go.uber.org/automaxprocs`, once its toolchain is 1.25+.**
   Rationale: the runtime now computes the same cgroup-aware default automaxprocs existed to provide, and keeps it current via periodic re-check; the third-party dependency adds nothing and can only fight the runtime's own updates if it also calls `runtime.GOMAXPROCS(n)`.
   Verify: reading heuristic — `go.mod`'s `go` line/CI toolchain pin ≥1.25 and a `require go.uber.org/automaxprocs` entry together is the finding (`grep -n 'go.uber.org/automaxprocs' <dir>/go.mod`; a hit alongside a ≥1.25 toolchain is the finding, none is the pass).
   Run: **yes** — measured directly under a real cgroup quota (`systemd-run --user --scope -p CPUQuota=200%`): `GOMAXPROCS(0)` reports 2 by default under the quota, 32 (=`NumCPU()`) with `GODEBUG=containermaxprocs=0`, i.e. the feature that makes automaxprocs redundant is real and on by default. See [Verification runs](#verification-runs).

6. **`GOGC`/`GOMEMLIMIT` are a long-lived-service tuning knob, never set on a CLI whose input size is unbounded or unknown ahead of time.**
   Rationale: `GOMEMLIMIT` on a CLI can turn an OOM (a fast, clear failure) into GC thrashing (a slow, confusing hang) the moment real input exceeds the tuner's assumption; a CLI's process lifetime is usually too short for `GOGC` to matter.
   Verify: reading heuristic — no mechanical check; a `GOMEMLIMIT`/`debug.SetMemoryLimit` set in a CLI's `main` next to unbounded file/stdin input is the finding.
   Run: no — reading heuristic only (P2, services are not a named consumer per owner Q8; sourced from [go.dev/doc/gc-guide](https://go.dev/doc/gc-guide) and Discord's cache postmortem, not independently re-measured here).

7. **A hung-but-alive process is diagnosed by sending SIGQUIT and reading the dump for goroutines sharing a blocked state, before reaching for Delve or a rebuild.**
   Rationale: SIGQUIT is free (no rebuild, no flag, no endpoint needed in advance) and dumps every user goroutine regardless of `GOTRACEBACK`'s default; two or more goroutines parked in the same state and created by the same caller is the deadlock signature a human reads directly off the dump.
   Verify: named reading heuristic — `kill -QUIT <pid>`, then grep the captured output for a state tag (e.g. `sync.Mutex.Lock`) appearing more than once.
   Run: **yes** — `fixtures/logging-and-diagnosis/deadlock/`: two goroutines both `[sync.Mutex.Lock]`, both `created by main.main` at the two lock-order-inverted call sites, captured live via SIGQUIT while the process was still running (the runtime's automatic "all goroutines are asleep" detector could not fire, because a `time.Sleep` heartbeat goroutine stayed runnable — the shape a real hung service has, unlike a toy full-deadlock).

8. **A race that a single `go test -race` run does not reproduce is chased with `go test -race -count=20 ./...` and `GORACE=halt_on_error=1`, not declared clean from one green run.**
   Rationale: `-race` is sampling-based scheduling-dependent detection; one pass can miss a race that a human has already spotted by inspection, and without `halt_on_error=1` a single race can print dozens of near-identical reports across 20 iterations, burying the first one.
   Verify: `GORACE=halt_on_error=1 go test -race -count=20 <pkg>` (exit 0 = pass; a `WARNING: DATA RACE` block and non-zero exit is the finding).
   Run: **yes** — red on `fixtures/logging-and-diagnosis/racy/` (single non-race run: `ok`; `-race -count=20`: one `WARNING: DATA RACE` report, `FAIL`).

9. **A CPU hotspot is located with `go tool pprof -top` and pinned to source lines with `-list=<func>`, not guessed from reading the code.**
   Rationale: `-top` ranks functions by sampled `flat`/`cum` time; `-list` then shows exactly which lines inside the hot function consumed the samples, which a code read alone cannot rank.
   Verify: `go tool pprof -top -nodecount=8 <bin> <profile>` then `go tool pprof -list=<func> <bin> <profile>`; the top-ranked function is the finding, an even/near-zero spread across many functions is the pass (nothing to fix).
   Run: **yes** — `fixtures/logging-and-diagnosis/hotspot/`: `-top` shows `main.slowFib` at 100% flat; `-list=slowFib` attributes the sampled time to the exact recursive-call line.

10. **A stall with no CPU sample and no goroutine leak is chased with `runtime/trace.FlightRecorder` (Go 1.25+), snapshotted only when a symptom is already known, not with an always-on full trace.**
    Rationale: a goroutine that blocks and later unblocks leaves no CPU sample (it was never running) and is not a leak (it does eventually finish); only a trace shows the `Running→Waiting` state transition and its duration, and a flight recorder's ring buffer avoids paying full-trace overhead before the operator knows there is a problem to look for.
    Verify: named procedure — start a `trace.NewFlightRecorder(trace.FlightRecorderConfig{...})`, call `.Start()` at process start, call `.WriteTo(w)` when a symptom fires, read with `go tool trace -d=parsed <file>` (or the web UI) for a `Running->Waiting` transition spanning the stall window.
    Run: **yes** — `fixtures/logging-and-diagnosis/flightstall/`: a 300ms artificial stall on call 3 of 5 is captured in the snapshot; `go tool trace -d=parsed stall.trace` shows the stalled goroutine's `Running->Waiting Reason="sleep"` transition at the exact time offset.

11. **`GODEBUG=execwait=2` is a CI/diagnosis switch only, never set in a program's own runtime defaults; its purpose is to fail a test suite or a manual repro the moment an `exec.Cmd` is started and never `Wait`ed.**
    Rationale: it panics the process on the first leaked `exec.Cmd` — correct as a hard CI gate (GO-TEST-12), wrong as a default because it turns a resource leak into an unconditional process-killing panic in production.
    Verify: `GODEBUG=execwait=2 go test ./...` (or `go run` for a standalone repro); a `panic: exec: Cmd started a Process but leaked without a call to Wait` naming the leaking call site is the finding, a clean exit is the pass.
    Run: **yes** (re-verified from the go-io wave-2 fixture, `fixtures/subprocess-contract/execwait-leak/`, cited rather than re-planted per this brief's "re-measure only what your brief needs"): leak case panics with exit 2 naming `os/exec.Command` at the exact call site; compliant (`Wait`ed) case prints `reached end of main without a finalizer panic`, exit 0.

12. **A goroutine-leak test uses a stdlib `runtime.Stack`-diff `TestMain`, not `goleak`, as the SDK's leak-freedom check.**
    Rationale: measured 3/3 against the same three planted shapes goleak catches 3/3 and both synctest and the `goroutineleak` profile catch only 1/3 each — a stdlib pattern with the same coverage removes a test-only dependency for no loss of signal (revises GO-CONC-11; resolves contradiction 5).
    Verify: the `TestMain` pattern itself, copied from `fixtures/logging-and-diagnosis/stdlibleak/detector.go` into the package under test; a non-zero exit naming a leaked stack is the finding, `ok` is the pass.
    Run: **yes** — 3/3 red on `fixtures/logging-and-diagnosis/stdlibleak/` (all three shapes), green and stable across 5 repeats on `fixtures/logging-and-diagnosis/stdlibleak-clean/`.

## Verification runs

All commands below ran through `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, golangci-lint 2.14.0) unless marked host-only (the cgroup and SIGQUIT fixtures need real OS process control that the wrapper does not add or remove).

**Rule 1 — SetDefault/SetOutput grep**
```
$ grep -rn -e 'slog\.SetDefault' -e 'log\.SetOutput' --include='*.go' fixtures/logging-and-diagnosis/libbad
libbad.go:11: // init runs slog.SetDefault, ...
libbad.go:15:	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, nil)))
exit=0 (match found = violation)

$ grep -rn -e 'slog\.SetDefault' -e 'log\.SetOutput' --include='*.go' fixtures/logging-and-diagnosis/libgood
(no output)
exit=1 (no match = pass)
```
Empty output is the pass; grep's own exit code is inverted from "pass/fail" (0 = found = violation here), stated explicitly because an agent piping this into `&&`/`||` will get it backwards otherwise.

**Rule 2 — sloglint no-global**
```
$ golangci-lint run --config .golangci-sloglint-noglobal.yml ./libbad/...
libbad/libbad.go:21:2: default logger should not be used (sloglint)
	slog.Info("libbad did work")
1 issues: * sloglint: 1
exit=1

$ golangci-lint run --config .golangci-sloglint-noglobal.yml ./libgood/...
0 issues.
exit=0
```
Config: `linters: {default: none, enable: [sloglint], settings: {sloglint: {no-global: "all"}}}`.

**Rule 3 — vet slog analyzer**
```
$ go vet ./slogmisuse/...
slogmisuse/main.go:15:2: call to slog.Logger.Info missing a final value
slogmisuse/main.go:18:27: slog.Logger.Info arg "42" should be a string or a slog.Attr (possible missing key or value)
exit=1

$ go vet ./slogmisuse_fixed/...
exit=0
```

**Rule 4 — pprof exposure grep pipeline**
```
$ grep -rl -e '_ "net/http/pprof"' --include='*.go' fixtures/logging-and-diagnosis/pprofbad fixtures/logging-and-diagnosis/pprofgood | xargs -r grep -ln -e 'ListenAndServe(.*, *nil)'
fixtures/logging-and-diagnosis/pprofbad/main.go
exit=0 (non-empty = violation)

$ grep -rl -e '_ "net/http/pprof"' --include='*.go' fixtures/logging-and-diagnosis/pprofgood | xargs -r grep -ln -e 'ListenAndServe(.*, *nil)'
(no output)
exit=0 (xargs -r with no input runs nothing; empty output = pass)
```

**Rule 5 — GOMAXPROCS under a real cgroup CPU limit**
```
$ ./gomaxprocs                                              # unrestricted host, 32 logical CPUs
NumCPU=32 GOMAXPROCS=32

$ systemd-run --user --scope -p CPUQuota=200% -- ./gomaxprocs
NumCPU=32 GOMAXPROCS=2

$ systemd-run --user --scope -p CPUQuota=200% --setenv=GODEBUG=containermaxprocs=0 -- ./gomaxprocs
NumCPU=32 GOMAXPROCS=32

$ systemd-run --user --scope -p CPUQuota=200% --setenv=GOMAXPROCS=8 -- ./gomaxprocs
NumCPU=32 GOMAXPROCS=8

$ systemd-run --user --scope -p CPUQuota=50% -- ./gomaxprocs
NumCPU=32 GOMAXPROCS=2
```
Confirmed the cgroup path taken: `cat /sys/fs/cgroup/user.slice/.../run-*.scope/cpu.max` → `200000 100000` for the 200% case. No "compliant twin" in the pass/fail sense here — this is a behavior measurement, not a violation check; rule 5's actual verification is the reading heuristic (grep for the `automaxprocs` import beside a ≥1.25 toolchain pin), which is a No-run reading heuristic by nature (there is no single file to watch red/green — the finding is a dependency-plus-toolchain combination across `go.mod` and CI config).

**Rule 7 — SIGQUIT on a live hang**
```
$ ./deadlock &
$ kill -QUIT <pid>                # sent ~1.5s after start, while still running (heartbeat goroutine kept it alive)
SIGQUIT: quit
...
goroutine 19 gp=... [sync.Mutex.Lock]:
...
main.main.func1()
	.../deadlock/main.go:21 ...
created by main.main in goroutine 1
	.../deadlock/main.go:18 ...

goroutine 20 gp=... [sync.Mutex.Lock]:
...
main.main.func2()
	.../deadlock/main.go:29 ...
created by main.main in goroutine 1
	.../deadlock/main.go:26 ...
```
Two goroutines in identical `[sync.Mutex.Lock]` state, both created by `main.main`, at the two mutex-acquire call sites written in opposite order — the deadlock signature. Process terminates itself after the SIGQUIT dump (default disposition; no further kill needed).

**Rule 8 — race reproduction**
```
$ go test -run TestIncrementRace .            # no -race
ok  	racy-fixture	0.001s

$ GORACE=halt_on_error=1 go test -race -count=20 -run TestIncrementRace .
==================
WARNING: DATA RACE
Read at 0x... by goroutine 9: racy-fixture.TestIncrementRace.func1() racy_test.go:12
Previous write at 0x... by goroutine 8: racy-fixture.TestIncrementRace() racy_test.go:15
==================
FAIL	racy-fixture	0.006s
```
Exactly one race block printed across the 20 iterations, confirming `halt_on_error=1` stopped at the first.

**Rule 9 — CPU hotspot**
```
$ ./hotspot            # writes cpu.pprof, prints sum
sum: 26625280

$ go tool pprof -top -nodecount=8 ./hotspot cpu.pprof
      flat  flat%   sum%        cum   cum%
      80ms   100%   100%       80ms   100%  main.slowFib
         0     0%   100%       80ms   100%  main.main

$ go tool pprof -list=slowFib ./hotspot cpu.pprof
      80ms      150ms (flat, cum) 187.50% of Total
      10ms       10ms     11:func slowFib(n int) int {
         .          .     12:	if n < 2 {
      60ms       60ms     13:		return n
         .          .     14:	}
      10ms       80ms     15:	return slowFib(n-1) + slowFib(n-2)
```

**Rule 10 — FlightRecorder stall**
```
$ ./flightstall
call 1 took 158ns
call 2 took 36ns
call 3 took 300.828057ms
stall detected; snapshotting flight recorder
call 4 took 74ns
call 5 took 15ns

$ go tool trace -d=parsed stall.trace | grep -E "Sleep|StateTransition.*sleep"
M=... P=... G=22 StateTransition Time=... GoID=22 Running->Waiting Reason="sleep"
	time.Sleep @ 0x...
```
The stalled goroutine's 300ms sleep is present in the flight recorder's snapshot, timestamped, even though no CPU sample exists for it (it was parked, not running).

**Rule 11 — execwait=2**
```
$ GODEBUG=execwait=2 go run . leak
GODEBUG=execwait=2 detected a leaked exec.Cmd created by:
os/exec.Command({0x..., 0x4}, ...)
	.../execwait-leak/main.go:24 ...
panic: exec: Cmd started a Process but leaked without a call to Wait
exit=1 (0.089s wall)

$ GODEBUG=execwait=2 go run . compliant
reached end of main without a finalizer panic
exit=0 (0.459s wall)
```
(Fixture path: `fixtures/subprocess-contract/execwait-leak/`, the go-io wave-2 fixture, re-run here rather than replanted, per the instruction to re-measure only what the brief needs — the exact panic text was re-confirmed live, not assumed from the prior write-up.)

**Rule 12 — stdlib leak detector**
```
$ go test -v ./stdlibleak/...
--- PASS: TestStartUnjoined (0.00s)
--- PASS: TestStartBlockedOnSyscall (0.00s)
--- PASS: TestStartHeldByGlobal (0.00s)
PASS
stdlib leak detector: goroutine(s) present after tests that were not present before:
--- x1 --- logging-and-diagnosis-fixture/leakshapes.StartUnjoined.func1() created by ... StartUnjoined in goroutine 7
--- x1 --- internal/poll.runtime_pollWait() ... leakshapes.StartBlockedOnSyscall.func1() created by ... in goroutine 9
--- x1 --- logging-and-diagnosis-fixture/leakshapes.StartHeldByGlobal.func1() created by ... in goroutine 11
FAIL	logging-and-diagnosis-fixture/stdlibleak	1.014s
exit=1

$ go test -count=5 ./stdlibleak-clean/...
ok  	logging-and-diagnosis-fixture/stdlibleak-clean	0.002s
exit=0
```
All three tests individually `PASS` (they only assert nothing panicked); the package-level `TestMain` is what fails the run, which is exactly goleak's own shape (individual tests pass; `TestMain`'s `VerifyTestMain` is what fails).

**Rule 6 (not run) and the `goroutineleak` floor question (measured, not a pass/fail check)**
```
$ ./goroutineleak126     # go.mod: go 1.26, built by the 1.27.1 toolchain
goroutineleak profile: registered, count = 0
```
Confirms `pprof.Lookup("goroutineleak")` is non-nil and callable in a module whose own `go` line is 1.26 — the profile's availability is gated by the toolchain that compiled the binary, not by `go.mod`'s `go` directive.

## Exemplar evidence

| Candidate | Satisfies | Violates / contested |
|---|---|---|
| Rule 1/2 (no global slog in a library) | `kubernetes-sigs/controller-runtime`, `google/go-github`, `oras-project/oras-go` — no `slog.SetDefault` in any importable package ([run](../go-audit/exemplar-runtime-posture.md) §4 census) | `aquasecurity/trivy@ae561f8cca36:pkg/log/logger.go:51,58,91` calls and re-exports `slog.SetDefault` — but `pkg/log` is trivy's own CLI-internal bootstrap package, not a package other repositories import, so this is the sanctioned CLI case, not a violation of the library rule; an agent copying this pattern into an SDK package would be wrong |
| Rule 4 (pprof gating) | `kubernetes-sigs/controller-runtime@d0127f7f66de:pkg/manager/internal.go:105-106,329-333,420-422` (dedicated `pprofListener`, wired only when configured); `caddyserver/caddy@54937914234b:admin.go:269-273` (mounted on the admin API's own listener, not the public HTTP listeners) | Neither audited exemplar mounts pprof on `DefaultServeMux` served publicly; the map's own finding stands — 26 importers, none individually re-verified as violating here beyond the two confirmed-compliant cases above |
| Rule 5 (automaxprocs superseded ≥1.25) | Any exemplar with no `automaxprocs` import and a ≥1.25 toolchain relies on the runtime default correctly by omission | `caddyserver/caddy`, `restic/restic`, `prometheus/prometheus` (`go.mod` roots) still import `go.uber.org/automaxprocs` directly — consistent with the supersession being toolchain-gated, not a defect in those repos at their audited `go` lines/CI pins (already GO-MOD-09) |
| Rule 12 (stdlib leak detector) | No exemplar was found using a stdlib `runtime.Stack`-diff `TestMain` for leak detection — this is a newly authored pattern for the fleet, not a copied one, so exemplar precedent does not exist to cite; the pattern's evidence is the fixture run in this document, not the corpus | — |
| Rule 3 (vet slog) | `google/go-github` and other repos using structured slog calls with matched pairs pass `go vet` cleanly as a matter of course; no corpus-wide re-measurement was run for this dive (out of scope: the analyzer's own correctness is settled tooling, not a fleet-practice question) | — |

## AI-agent angle

- **Reaching for `zerolog`/`zap` from training-data habit instead of `log/slog`.** An agent trained mostly on pre-2023 Go code defaults to `zap.NewProduction()` or a third-party logger even in new code with no existing logging convention. Smallest check: `grep -rn -e 'go.uber.org/zap' -e 'rs/zerolog' --include='go.mod' <dir>` on a *new* module (no prior commits) — any hit in a fresh `go.mod` is a signal to ask why stdlib `slog` was not used.
- **Calling `slog.SetDefault` inside a constructor "to make logging work" for a new package.** This is the single most likely agent mistake this dive found a mechanical catch for: an agent asked to "add logging to package X" reaches for the shortest working code, and `slog.SetDefault` followed by package-level `slog.Info` calls *is* the shortest working code — it also happens to be exactly the anti-pattern. Smallest check: rules 1 and 2 above, run together (`grep` for the call, `sloglint` for the call sites it enables).
- **Treating `sloglint`'s presence in a golangci-lint config as sufficient for "well-formed slog calls."** `sloglint` at its defaults does not catch a mismatched key-value pair — that needs bare `go vet`, which many agents skip when a linter is already configured, assuming the linter is a superset of vet. Smallest check: run `go vet ./...` as its own CI step, never folded silently into "the linter passed."
- **Mounting `net/http/pprof` on the same port as the application "for convenience," especially inside a container where "nothing else is listening on this host anyway."** An agent reasoning about a single container often misses that the container's network namespace may be shared (a sidecar, a debug pod) or that the port is proxied through an ingress that does not distinguish `/api/` from `/debug/`. Smallest check: rule 4's grep pipeline, plus a one-line reading rule: "is `/debug/pprof` reachable from anywhere the application's own API is reachable?"
- **Assuming `go.uber.org/automaxprocs` is still required because "containers need it."** An agent's training data predates Go 1.25's container-aware default and recommends automaxprocs unconditionally for any containerized Go service. Smallest check: read the module's `go` line/CI toolchain pin; ≥1.25 without a stated reason (e.g. needing an *older* toolchain's manual `SetDefaultGOMAXPROCS`-equivalent behavior) makes the dependency dead weight, and the reading heuristic in rule 5 is the check.
- **Recommending `panicparse`/manual thread-dump parsing before trying plain SIGQUIT + reading.** For a first pass at a hang, an agent that has absorbed a lot of "advanced debugging" material tends to over-reach for Delve or a heap dump before doing the free, zero-setup thing (SIGQUIT) that finds a plain lock-order deadlock in one read. Smallest check: the go-diagnose runbook's explicit ordering (§6) — SIGQUIT and the runtime's own detector come first because nothing needs to be pre-armed for them.
- **Believing `GODEBUG=execwait=2` is safe to leave set in production "to catch leaks early."** It is a hard panic on the first hit, by design; an agent copying a CI-only `GODEBUG` setting into a Dockerfile or a systemd unit turns a benign resource leak into an unconditional crash loop. Smallest check: `grep -rn -e 'execwait=2' --include='*.yml' --include='*.yaml' --include='Dockerfile' <dir>` — any hit outside a CI workflow file is the finding.
- **Reaching for `goleak` reflexively in every new Go test package "because that's what SDKs do," without checking whether the stdlib diff now covers it.** Once GO-CONC-11 is revised, an agent that still adds `go.uber.org/goleak` to a fresh `go.mod` is reintroducing a dependency the fleet measured its way out of. Smallest check: `grep -n 'goleak' <dir>/go.mod` on a new module — a hit is a question ("why not the stdlib TestMain pattern?"), not an automatic pass.

## Contested / evolving

- **The stdlib leak detector has no ignore-list, and that is a real, not cosmetic, gap.** `goleak` ships a maintained list of known-benign runtime-internal goroutine shapes (finalizer goroutines, signal handlers, `testing` package internals) it filters out before comparing. This dive's detector instead relies on *diffing against a same-process baseline* rather than a hardcoded ignore-list, which is why it worked here with zero false positives across six runs — but a package whose tests spin up a genuinely new, benign, runtime-owned goroutine only on their first invocation (e.g. the very first GC cycle's background sweep goroutine, if it happens to start between the "before" and "after" snapshot rather than at process init) could register a false leak that a maintained ignore-list would have already known to exclude. As of 2026-09-26, this is a measured-clean result on this fixture, not a guarantee against every possible package's first-run behavior; the go-quality support directory should say so rather than present it as strictly superior to goleak.
- **`GODEBUG=containermaxprocs` and `updatemaxprocs` are dated to Go 1.25 and their *current* default (on) could change** — the runtime doc comment itself says "the default GOMAXPROCS behavior may change as the scheduler improves." Treat rule 5 as current for 1.25–1.27 and re-check the doc comment on every `go-upgrade` pass.
- **`goroutineleak`'s documented blind spot (globals, runnable-goroutine locals) is a permanent design choice, not a bug awaiting a fix** — [go.dev/doc/go1.27](https://go.dev/doc/go1.27) states it as the mechanism's definition (reachability from a runnable goroutine, via the GC), not a known limitation slated for improvement. Do not phrase future guidance as "until this is fixed."
- **`sloglint`'s "no-global" check defaulting to off is a golangci-lint v2.14.0-era fact that could flip** — the tool's own README frames it as a deliberate choice (some codebases use `slog.SetDefault` legitimately at their `main`), so a future default change would be a documented decision, not a bug fix; re-read the README on the next `go-upgrade` pass rather than assuming yesterday's default.
- **The elfutils core-dump symbolization bug (sourceware 32713) trends toward irrelevance, not resolution, for this program**: Stapelberg's advice is "use 6.14 or newer," and the fleet's own CI runners' kernel version is outside this dive's scope to pin — the go-diagnose skill should name the workaround (upgrade the runner kernel, or use Delve's live-attach path instead of a post-mortem core) rather than track the bug to closure.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/blog/slog](https://go.dev/blog/slog) | Go team design blog post | 2023, still current guidance in 2026 | States the library-author rule ("accept `*slog.Logger`/`Handler`, never set the global default") in the tool's own words |
| [pkg.go.dev/log/slog](https://pkg.go.dev/log/slog) | Package reference doc | Current, Go 1.27.1 | `DiscardHandler`, `SetDefault`'s documented effect on both `slog` and `log`, and the exact `"!BADKEY"` behavior for an unmatched argument |
| `GOROOT/api/go1.24.txt` (read locally via the toolchain) | Go's own API-diff manifest | Go 1.24 release | Primary proof `DiscardHandler` is a 1.24 addition (`#62005`), not folklore |
| [go.dev/doc/diagnostics](https://go.dev/doc/diagnostics) | Official diagnostics overview | Current | The four-category framing (profiling/tracing/debugging/runtime stats) this dive's runbook table follows |
| [pkg.go.dev/net/http/pprof](https://pkg.go.dev/net/http/pprof) | Package reference doc | Current, Go 1.27.1 | States the `DefaultServeMux` side-effect-of-import mechanism directly |
| `GOROOT/src/runtime/pprof/pprof.go` (read locally) | Go stdlib source | Go 1.27.1 | Confirms `goroutineleak` is a registered predefined profile at `pprof.go:194-195,265` — primary, not secondhand |
| [go.dev/doc/gc-guide](https://go.dev/doc/gc-guide) | Official GC tuning guide | Current | `GOGC`/`GOMEMLIMIT` semantics, the soft-limit behavior, and the long-lived-vs-short-lived framing this dive's rule 6 rests on |
| [go.dev/blog/container-aware-gomaxprocs](https://go.dev/blog/container-aware-gomaxprocs) | Go team blog post announcing the 1.25 feature | 2025 | States the feature and version directly; the runtime source (below) supplies the mechanism detail the blog post omits |
| `GOROOT/src/runtime/debug.go` (read locally) | Go stdlib source, `GOMAXPROCS` doc comment | Go 1.27.1 | The authoritative, versioned mechanism: cgroup v1/v2 file names, the never-below-2 floor, the once-per-second re-check, and the exact `GODEBUG` names and their `Changed: 25` gate |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Official Go 1.27 release notes | 2026-08 | `goroutineleak` GA (experimental in 1.26), its documented blind spot in the exact wording used in this dive, and the deleted `goroutineleakprofile` GOEXPERIMENT flag |
| [go.dev/blog/flight-recorder](https://go.dev/blog/flight-recorder) | Go team blog post | 2025 (Go 1.25) | `FlightRecorder`'s API and the "buffer continuously, snapshot on symptom" usage pattern this dive's rule 10 follows |
| [go.dev/blog/execution-traces-2024](https://go.dev/blog/execution-traces-2024) | Go team blog post | 2024 | Trace overhead history (10–20% → 1–2%) and the scalability rewrite that made a flight recorder practical |
| `go doc runtime` (read locally via the toolchain) | Go stdlib doc, `GOTRACEBACK` section | Go 1.27.1 | The exact, versioned semantics of every `GOTRACEBACK` value, read from the tool itself rather than a paraphrase |
| [go-simpler/sloglint README](https://github.com/go-simpler/sloglint/blob/main/README.md) | Tool's own docs | Current (fetched 2026-09-26) | The full check list and, critically, that "No global logger" needs an explicit `no-global` setting — not on by default |
| [go-delve/delve dlv_attach.md](https://github.com/go-delve/delve/blob/master/Documentation/usage/dlv_attach.md) | Tool's own docs | Current | Exact `dlv attach pid [executable] [flags]` syntax, primary source for the runbook's Delve row |
| [michael.stapelberg.ch — Tips to debug hanging Go programs](https://michael.stapelberg.ch/posts/2025-02-27-debug-hanging-go-programs/) | Practitioner runbook post | 2025-02, updated 2025-04 | Source of the SIGQUIT/GOTRACEBACK/Delve/core-dump sequence this dive's table follows, and the exact sentence the 6.12/6.13 claim traces to |
| [sourceware.org bug 32713](https://sourceware.org/bugzilla/show_bug.cgi?id=32713) | elfutils bug tracker | Filed 2025 | The actual tracker for the 6.12/6.13 core-dump symbolization break — proves the claim is real but misattributed to "the Go issue tracker" in casual references |
| [golang/go#73141](https://github.com/golang/go/issues/73141) | Go issue tracker | Filed 2025, open, milestone Go 1.25 | The nearest real Go-tracker lookalike to the 6.12/6.13 claim; reading it confirms it is a *different*, unrelated bug (vgetrandom SIGSEGV), which is itself the finding |
| `go-topic-map/practitioner.md` §17 and `go-audit/exemplar-runtime-posture.md` §4 | This program's own wave-1 audits | 2026-09-26 | Source of the automaxprocs/slog/pprof-import counts cited throughout; re-measured only where this dive's brief asked for a fresh number |
| `go-concurrency/goroutine-ownership.md` and `go-concurrency.md` (GO-CONC-11) | This program's wave-2 consolidation | 2026-09-26 | Source of the 3/3 vs 1/3 vs 1/3 goleak/synctest/goroutineleak-profile comparison this dive's stdlib detector is measured against |

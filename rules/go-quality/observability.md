---
title: Logging, Runtime Knobs and Performance Claims
summary: The GO-OBS family. slog and library logging, pprof exposure, container-aware GOMAXPROCS and GC tuning scope, the diagnosis order for a hang, race or leak, and the measurement every performance change and PGO profile must carry
---

# Logging, Runtime Knobs and Performance Claims

Owns how Go code logs and who may touch process-global logging, how a debug
endpoint is exposed, which runtime knobs (`GOMAXPROCS`, `GOGC`, `GOMEMLIMIT`,
`GODEBUG`) code and images may set, the order of tools for diagnosing a running
process, and what evidence an optimization or a `default.pgo` needs. Does not
own the goroutine-leak test gate, which is `GO-CONC-11` in `GO-CONC`
(concurrency), the `benchstat` form of a performance claim (`GO-TEST-20`) or
`execwait=2` and its blind spots (`GO-TEST-12`), both in `GO-TEST` (testing),
stale `GOEXPERIMENT` pins in source trees (`GO-LANG-16`, `GO-LANG`), the
depguard `superseded` list (`GO-MOD-08`, `GO-MOD`), which linters a config file
enables (`GO-GATE`), naming the signals a CLI handles (`GO-CLI-08`, `GO-CLI`),
handling an error once instead of logging and returning it (`GO-ERR-19`,
`GO-ERR`), or HTTP server timeouts (`GO-NET`). "The SDK" below means a library
you publish as your product's client, held to a stdlib-only runtime by
`GO-MOD-10`. Without one, read it as "library".

Contents: [Dates and Floors](#dates-and-floors) ·
[Logging, Debug Endpoints and Container Sizing](#logging-debug-endpoints-and-container-sizing) ·
[Settings That Must Not Ship](#settings-that-must-not-ship) ·
[Diagnosing a Hang, Race or Leak](#diagnosing-a-hang-race-or-leak) ·
[Performance Claims](#performance-claims) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 on Go 1.27.1 (`GOTOOLCHAIN=local`) and golangci-lint
v2.14.0 (sloglint, gosec, depguard, perfsprint, prealloc), unless a row says otherwise.

- **`log/slog`** is go 1.21 and **`slog.DiscardHandler`** go 1.24, both go-line
  gated. Below 1.24 the discard default is `slog.NewTextHandler(io.Discard, nil)`.
- **Container-aware `GOMAXPROCS`** is go 1.25 and go-line gated through the
  `GODEBUG` default table (`containermaxprocs`, `updatemaxprocs`). A `go 1.24`
  module built by 1.27.1 still reported the host's 32 CPUs under a 2-CPU quota.
- **`runtime/trace.FlightRecorder`** is go 1.25 (go-line gated). The
  **`goroutineleak`** profile is toolchain-gated: GA in go 1.27, and served
  under a `go 1.26` line built by a 1.27 toolchain. `GOMEMLIMIT` is go 1.19.
  `-pgo=auto` has been the build default since go 1.21.
- **Pinned defaults, which an adopter overrides once:** libraries and the SDK
  declare `go 1.26.0` and CLIs `go 1.27.0`, so every module sits above the
  container-aware floor. The project runs no long-lived services, so `GO-OBS-09`
  has no current consumer and binds the first service that appears.
- **Documented gaps.** PGO's payoff for a small binary is unmeasured beyond one
  fixture that got 6.83% slower. The `nogreenteagc` opt-out, forecast for removal
  in 1.27, is still accepted by 1.27.1, and no tracked issue gives a new date
  (read 2026-09-26). Metric naming, OpenTelemetry and `tracebacklabels` have no
  rule yet: they wait for a Go service to measure against.

## Logging, Debug Endpoints and Container Sizing

```bash
golangci-lint run ./...   # depguard logging + superseded, gosec G108, sloglint no-global (library/SDK overlay)
go vet ./...              # the slog analyzer: matched key/value pairs, string keys
# the global-logging grep: empty output is the pass
grep -rl -e 'slog\.SetDefault(' -e 'log\.SetOutput(' -e 'log\.SetFlags(' -e 'log\.SetPrefix(' --include='*.go' . | xargs -r grep -L -e '^package main$'
```

golangci-lint and vet exit 1 with the finding named below, and 0 with `0 issues.` on the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-OBS-01 | Log through `log/slog` in new code. Deny `go.uber.org/zap`, `github.com/rs/zerolog` and `github.com/sirupsen/logrus` with a depguard rule named `logging` on `files: ["$all"]`, carried in the shared baseline beside `no-testify`. Leave an incumbent zap codebase on zap and delete the rule only there. **pinned** | Agents reach for `zap.NewProduction()` from habit. slog leads zap 11 to 6 across 34 surveyed repositories and zerolog has no real user. The SDK's stdlib-only runtime (`GO-MOD-10`) already forbids all three. The list text lives in the `GO-GATE` config files. | `golangci-lint run ./...`. The finding is `import 'go.uber.org/zap' is not allowed from list 'logging'`. | SHOULD (MUST for the SDK through `GO-MOD-10`) |
| GO-OBS-02 | In library and SDK code, never call `slog.SetDefault`, `log.SetOutput`, `log.SetFlags` or `log.SetPrefix`. Accept a `*slog.Logger` (or a `slog.Handler`) from the caller, and when none is given default to `slog.New(slog.DiscardHandler)`. A CLI calls `slog.SetDefault` once, in `main`. | `SetDefault` rewires both `slog` and the legacy `log` package for the whole process, including code that never asked ([pkg.go.dev/log/slog](https://pkg.go.dev/log/slog#SetDefault)). | The global-logging grep above. Empty output is the pass. Read each listed file: an exported helper that exists only so the caller can opt in (zap's `RedirectStdLog`) is acceptable in a general library and never in the SDK. | MUST (library, SDK) |
| GO-OBS-03 | In library and SDK code, route every log call through an injected `*slog.Logger` held on a struct. Never call package-level `slog.Info` and friends, and never keep a package-level logger variable. Set `linters.settings.sloglint.no-global: "all"` in the library/SDK overlay. The shared baseline enables sloglint without it, so a CLI's `main` may use the default logger. **pinned** placement | A package-level call resolves through whatever `SetDefault` last installed, the hazard `GO-OBS-02` removes. The value `"default"` misses a package-level `var logger`, and only `"all"` catches it. | `golangci-lint run ./...` under the overlay. The finding is `default logger should not be used` or `global logger should not be used (sloglint)`. | MUST (library, SDK) |
| GO-OBS-04 | Never count sloglint's bare enablement as slog coverage, and never label it "self-gating". Its settings are explicit (`GO-OBS-03`), and matched key/value pairs and string keys belong to vet's `slog` analyzer, which runs under `go vet ./...` (`GO-GATE-02`) and inside `go test`'s default vet subset. | Bare sloglint reported `0 issues.` on both a global-logger fixture and a mismatched-pair fixture. An unmatched final argument is logged silently under the key `!BADKEY`. | `go vet ./...`. The finding is `missing a final value` or `should be a string or a slog.Attr`. | SHOULD |
| GO-OBS-05 | Never blank-import `net/http/pprof`. A binary that serves HTTP registers `pprof.Index`, `Cmdline`, `Profile`, `Symbol` and `Trace` explicitly on its own `http.ServeMux`, served on a separate operator-only listener (loopback or an admin address) behind a flag that defaults to off. | The blank import mounts `/debug/pprof/*` on `http.DefaultServeMux`, so any later `ListenAndServe(addr, nil)` publishes it: CPU profiling a remote caller can trigger, `cmdline`, and since 1.27 `goroutineleak`. A flag-gated blank import is safe today and one refactor from public. | `golangci-lint run ./...` with gosec on, as in the baseline (`GO-GATE-14` excludes only G104, G115 and G304). The finding is `G108: Profiling endpoint is automatically exposed on /debug/pprof`. Reading heuristic for what remains: explicit pprof handlers registered on `DefaultServeMux` or on the public mux. | MUST (any binary that serves HTTP) |
| GO-OBS-06 | In a module whose `go` line is 1.25 or later (every module under the pinned floors), never import `go.uber.org/automaxprocs`. Size worker pools from `runtime.GOMAXPROCS(0)`. Never call `runtime.GOMAXPROCS(n)` with n > 0 and never set a `GOMAXPROCS` env default in an image: either freezes the value and turns off the runtime's re-check. Under a `go 1.24` line the runtime is not container-aware, so keep automaxprocs there (`GO-MOD-09`). | automaxprocs v1.6.0 floors the quota (1.5 CPUs gives 1) where the runtime rounds up to at least 2, prints `maxprocs: Updating GOMAXPROCS=…` to stderr, and disables the periodic update. Only `runtime.SetDefaultGOMAXPROCS()` restores it. | `golangci-lint run ./...` with `GO-MOD-08`'s `superseded` list. The finding is `import 'go.uber.org/automaxprocs' is not allowed from list 'superseded'`. Then `grep -rn --include='*.go' -e 'runtime\.GOMAXPROCS([^0)]' .`: empty output is the pass. The image half is a reading check of each `Dockerfile` `ENV`. | MUST |

```go
// wrong: rewires logging for every package in the host process
func init() { slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stderr, nil))) }

func (c *Client) Pull(ref string) { slog.Info("pull", "ref", ref) }

// right: the caller decides, and silence is the default
type Client struct{ log *slog.Logger }

func New(log *slog.Logger) *Client {
	if log == nil {
		log = slog.New(slog.DiscardHandler)
	}
	return &Client{log: log}
}

func (c *Client) Pull(ref string) { c.log.Info("pull", "ref", ref) }
```

## Settings That Must Not Ship

```bash
grep -rn --exclude-dir=.git --exclude-dir=.github --exclude='*_test.go' --exclude='*.md' -e 'execwait=' .
grep -rn -E -e 'signal\.Notify\([^,]*\)' --include='*.go' .
# the GC-tuning grep: a work list of non-main files to read
grep -rl -e 'debug\.SetMemoryLimit(' -e 'debug\.SetGCPercent(' --include='*.go' . | xargs -r grep -L -e '^package main$'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-OBS-07 | Set `GODEBUG=execwait=2` only in a CI job's env or a manual repro. Never bake it into a Dockerfile, a systemd unit, a launcher script or a `.env` file. | It panics the process on the first collected `exec.Cmd` that was never `Wait`ed: a diagnosis aid with blind spots (`GO-TEST-12`) and a crash loop in production. It is an undocumented setting, so `//go:debug` cannot carry it and only the environment can. | `grep -rn --exclude-dir=.git --exclude-dir=.github --exclude='*_test.go' --exclude='*.md' -e 'execwait=' .`. Empty output is the pass. Markdown is excluded because installed rule files and docs name the setting. A CI directory other than `.github` needs its own `--exclude-dir`. | MUST |
| GO-OBS-08 | Name the signals: `signal.Notify(c, os.Interrupt, syscall.SIGTERM)` (`GO-CLI-08`). Never write `signal.Notify(c)` with no signal list, unless the program forwards every signal to a child and says so in a comment. | A catch-all subscription swallows SIGQUIT: the process exits 0 and the goroutine dump `GO-OBS-10` depends on never prints. | `grep -rn -E -e 'signal\.Notify\([^,]*\)' --include='*.go' .`. Empty output is the pass. | SHOULD |
| GO-OBS-09 | Tune `GOGC`, `GOMEMLIMIT`, `debug.SetGCPercent` or `debug.SetMemoryLimit` only in a long-lived service's `main`, and only against a measured steady-state heap. Libraries never call them and CLIs never set them. | A soft memory limit on a CLI that reads input of unbounded size turns a fast OOM into a slow GC-thrash hang. A library that sets one overrides its host process ([go.dev/doc/gc-guide](https://go.dev/doc/gc-guide)). | Reading heuristic: the GC-tuning grep above lists the non-`main` files to read. Empty output is the pass for libraries. The grep drops `package main` files, so check a CLI by reading its `main` for `debug.SetMemoryLimit(`, `debug.SetGCPercent(` or a `GOGC` or `GOMEMLIMIT` env default. | SHOULD |

## Diagnosing a Hang, Race or Leak

These rows govern what an agent does to a process, not code, so each
verification is a named procedure. Run them in row order. Free steps come
first, steps that need a rebuild or a pre-armed binary next, and Delve or a core
dump last. Rename `BIN`, `PID` and the test and package names.

```bash
BIN=./dist/app PID=12345
go version "$BIN" && go version -m "$BIN"                     # step zero
kill -QUIT "$PID"                                             # only under GO-OBS-14
GORACE=halt_on_error=1 go test -race -count=20 -run TestName ./pkg/...
go tool pprof -top "$BIN" cpu.pprof && go tool pprof -list=FuncName "$BIN" cpu.pprof
go tool trace -d=parsed flight.trace
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-OBS-22 | Before comparing profiles, traces or benchmarks across builds, and as the first diagnosis step, record `go version` and `go version -m` for the binary. A `-X:name` suffix (`go1.27.1-X:nogreenteagc`) means a non-default experiment, a `build -pgo=` line a PGO build, and a `GOEXPERIMENT=` line names the experiments. Compare like with like. | Green Tea GC, json/v2 and size-specialized malloc are default-on in 1.27.1. A pin that opts out changes GC and allocation behaviour with no source change, and the version stamp is the only place a shipped binary records it. | `go version ./dist/app` (rename): a `-X:` suffix in the output names a non-default experiment, and its absence means none. | SHOULD |
| GO-OBS-10 | Diagnose a hung, still-running process with SIGQUIT before anything that needs a rebuild or an attach. In the dump, look for two or more goroutines parked in the same state (`[sync.Mutex.Lock]`) that share a `created by` caller. Never wait for `fatal error: all goroutines are asleep`. | SIGQUIT is free and dumps every user goroutine under the default `GOTRACEBACK=single`. The runtime's own detector fires only when every goroutine is blocked, which a process with a ticker or an accept loop never is. | Named procedure: `kill -QUIT` on the PID, capture stderr, and search it for a blocked-state tag that repeats. | SHOULD |
| GO-OBS-11 | Chase a race one `-race` run did not show with `GORACE=halt_on_error=1 go test -race -count=20` on the one test. Never call code race-free because a single green run passed. | `-race` sees only the interleavings that happen to run. `halt_on_error=1` stops at the first report so twenty iterations do not bury it. Needs the cgo toolchain (`GO-GATE-04`). | The command in the block above. A `WARNING: DATA RACE` block with a non-zero exit is the finding. | SHOULD |
| GO-OBS-12 | Read a zero from the `goroutineleak` profile (`/debug/pprof/goroutineleak`, `pprof.Lookup("goroutineleak")`) as "none found", never as "no leak". The test-time gate is goleak (`GO-CONC-11`). | The profile cannot flag a goroutine reachable from a global or from a runnable goroutine's locals. That is how it works, not a bug awaiting a fix. It caught 1 of 3 planted leak shapes where goleak caught 3. | Named procedure: sample the profile twice under load and compare `Count()`, then confirm in a test with goleak. | SHOULD |
| GO-OBS-13 | Find a CPU hotspot with `go tool pprof -top`, then `-list` on the hot function. Chase a stall that leaves no CPU sample and no leak with `runtime/trace.FlightRecorder`: start it at process start, `WriteTo` a file when the symptom is detected, and read it with `go tool trace`. The recorder must be in the binary before the incident. | `-list` ranks the source lines inside the hot function. A parked goroutine leaves no CPU sample, and only a trace's `Running->Waiting` transition shows it. The recorder's ring buffer avoids an always-on trace. | Named procedure: the pprof and trace commands in the block above. `-d=parsed` output showing the `Running->Waiting` transition at the stall is the finding. | SHOULD |
| GO-OBS-14 | Never attach Delve, pull a live profile or trace, or send SIGQUIT to a process the operator has not named as theirs to touch. For a production process get explicit consent in the moment: print the command and its cost, then stop. For a core dump on Linux 6.12 or 6.13, cite the elfutils bug [sourceware 32713](https://sourceware.org/bugzilla/show_bug.cgi?id=32713), never a `golang/go` issue. | SIGQUIT kills the process after the dump (exit 2). A CPU profile loads a live service. A `-race` or `-N -l` rebuild changes the binary. A Delve attach stops the scheduler. | Reading heuristic, necessarily: no analyzer sees what an agent does. Review the diagnosis skill's text and the transcript against this row. | MUST |

## Performance Claims

Optimize only what a measurement named, and prove the result with the
`GO-TEST-20` `benchstat` form. Rename the benchmark, package and binary.

```bash
go test -run='^$' -bench=BenchmarkPlain -benchmem -count=10 ./pkg/... > plain.txt
benchstat plain.txt candidate.txt
go test -run 'Allocs$' ./...
golangci-lint run --enable-only perfsprint ./...   # one-off, never in a config file
golangci-lint run --enable-only prealloc ./...     # one-off, never in a config file
grep -rn -E -e 'fmt\.Sprintf\("[^"]*%[a-zA-Z][^"]*%[a-zA-Z]' --include='*.go' .
find . -name default.pgo
# the PGO pickup check: a build -pgo= line means the profile was applied
go version -m ./dist/app | grep -e '-pgo='
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-OBS-15 | Optimize only a function a CPU or allocation profile (`GO-OBS-13`, `go test -memprofile`) or a benchmark has named. Work in this order: do less, do it less often, then do it faster. `sync.Pool`, preallocation, `strconv`-for-`fmt` swaps and PGO come last. | Agents skip to the third step because it looks like expertise. Every fixture that "optimized" without a measurement either regressed or did nothing. | Reading heuristic: the change names the profile or benchmark that picked the function and quotes a `benchstat` table (`GO-TEST-20`). | SHOULD |
| GO-OBS-16 | Add a `sync.Pool` only when the un-pooled path measures at least 1 `allocs/op` under `-benchmem` or `testing.AllocsPerRun`, and `benchstat` shows the pooled version winning. Treat `-gcflags=-m`'s `does not escape` as a hint about where to look, never as proof of no heap allocation. | Pooling a value that never reaches the heap only adds bookkeeping: a small struct went from 0.39 to 6.81 ns/op. A 64 KiB buffer escaping through an `io.Writer` went from 1 allocation to 0 and ran 56.55% faster. On 1.27.1 a runtime-sized `make([]byte, n)` prints `does not escape` and still heap-allocates for every n above 32 bytes. | The benchmark command in the block above, on the **un-pooled** code. `0 allocs/op` means a pool can only cost. At least 1 means it may pay, and `benchstat plain.txt pooled.txt` decides. | SHOULD |
| GO-OBS-17 | Never read a clean perfsprint run as "`Sprintf` is fine". perfsprint rewrites single-verb calls (`%d` to `strconv.Itoa`, `"id-%s"` to concatenation) and is silent on two or more verbs. In a function a profile named hot, list the multi-verb calls and read each. perfsprint joins no config file (`GO-GATE-16`). | The missed `Sprintf("%s%s", a, b)` shape measured 67.80% faster as `a+b`. An agent that reads `0 issues.` as "no Sprintf left" leaves it. | `golangci-lint run --enable-only perfsprint ./...` reports `integer-format:` or `string-format:` (exit 1). Then the multi-verb grep: `grep -rn -E -e 'fmt\.Sprintf\("[^"]*%[a-zA-Z][^"]*%[a-zA-Z]' --include='*.go' .`, whose hits inside a hot function are read. Empty output is the pass. | SHOULD (hot paths only) |
| GO-OBS-18 | Treat each prealloc finding as a question. Read the loop, and rewrite only one that runs per request or per item. Never mass-apply its suggestions, and never let it block a merge. prealloc joins no config file (`GO-GATE-16`). | Across 8 exemplar repositories it fired 31 times in 123,632 lines, and every hit was a test table or a once-per-process flag slice. Mass-applied `make([]T, 0, n)` is churn with no measured gain. | `golangci-lint run --enable-only prealloc ./...` lists `Consider preallocating` sites (exit 1 with findings). Reading heuristic: each site's loop is read for how often it runs. | CONSIDER |
| GO-OBS-19 | Give a function whose allocation count is part of its contract (documented, or on a path `GO-OBS-15`'s profile named) a `testing.AllocsPerRun` test with an explicit numeric budget, `if got > want { t.Fatalf(…) }`. Run it in the normal and `-race` jobs, never under `-gcflags=all=-N -l`. A CLI-wrapping SDK's cost is the spawn, so it carries a guard only where it documents an allocation contract. | The guard went red at 10 allocs/op against a budget of 1 the moment a `strings.Builder` join became `+=`. It stays green under `-race` and `-cover`. With optimizations off counts rise (0 to 1 for a stack slice), so a debug job reports a false regression. `b.Loop` shape: `GO-TEST-19`. | `go test -run 'Allocs$' ./...`. The finding is a `t.Fatalf` naming `allocs/op`. | SHOULD |
| GO-OBS-20 | Never add or keep a `default.pgo`, or claim a PGO win, without a `benchstat` comparison on the target binary's own workload built with `-pgo=off` and with the profile. Confirm the shipped binary used the profile. | `-pgo=auto` means a file in the right directory silently changes the binary. The payoff belongs to the program: one small dispatcher got 6.83% slower, against the Go team's 2-14% for large services ([go.dev/blog/pgo](https://go.dev/blog/pgo)). | The PGO pickup check in the block above. A `build -pgo=` line means the profile was applied, and empty output means it was not. Pair it with `benchstat off.txt pgo.txt`. | SHOULD |
| GO-OBS-21 | Put a `default.pgo` only in a `main` package's directory, one profile per binary. Never pass one `-pgo=` file to a build of several unrelated `cmd/` binaries. Libraries and the SDK never ship a `default.pgo`. | A library-directory profile is inert for every consumer's binary, yet reshapes the library's own benchmarks so they stop matching what consumers get. PGO rebuilds the whole program for one binary's profile ([go.dev/doc/pgo](https://go.dev/doc/pgo)). | `find . -name default.pgo` lists the work. Empty output passes. Each hit's directory must hold `package main`, and the PGO pickup check on that binary must print its `-pgo=` line. | SHOULD (MUST NOT in the SDK) |

```go
// wrong: the contract lives in a comment, so a += refactor ships green
// Join allocates exactly once per call.

// right: the contract fails the test run the moment it regresses
func TestJoinAllocs(t *testing.T) {
	got := testing.AllocsPerRun(100, func() { _ = Join(parts, ", ") })
	if got > 1 {
		t.Fatalf("Join allocs/op = %v, want <= 1", got)
	}
}
```

## What Agents Get Wrong Here

1. **`slog.SetDefault` plus package-level `slog.Info` in a library "to make
   logging work."** It is the shortest code that runs. `GO-OBS-02`, `GO-OBS-03`.
2. **Adding zap, zerolog or logrus to a new module from training-data habit.** `GO-OBS-01`.
3. **Enabling sloglint with no settings and calling slog covered.** Bare
   sloglint passed both defects that vet and `no-global: "all"` catch. `GO-OBS-04`.
4. **Adding automaxprocs "because containers need it", or removing it under a
   `go 1.24` line.** Read the `go` line first. `GO-OBS-06`.
5. **`import _ "net/http/pprof"` "for convenience" on the app port.** `GO-OBS-05`.
6. **Wrapping a small struct in `sync.Pool` "because pooling is faster".** It
   measured 17 times slower with no allocation saved. `GO-OBS-16`.
7. **Reading `does not escape` as "no allocation"**, then pulling out a pool
   that pays or skipping one that would. `GO-OBS-16`.
8. **Optimizing before measuring:** preallocating every slice, swapping every
   `Sprintf`, pooling on sight. `GO-OBS-15`, `GO-OBS-18`.
9. **Calling `Sprintf` clean because perfsprint printed `0 issues.`** `GO-OBS-17`.
10. **Dropping a `default.pgo` into a library or module root "because PGO is best
    practice", or quoting the 2-14% blog figure as this binary's gain.** `GO-OBS-20`, `GO-OBS-21`.
11. **An allocation guard that is only a comment, or runs in a `-N -l` debug job.** `GO-OBS-19`.
12. **Comparing profiles from two binaries built with different `GOEXPERIMENT`
    or PGO settings.** `GO-OBS-22`.
13. **Replacing goleak with a hand-rolled `runtime.Stack` diff or the
    `goroutineleak` profile.** The hand-rolled diff fails on compliant
    `signal.NotifyContext` code. `GO-OBS-12`, `GO-CONC-11`.
14. **Treating one green `-race` run, or a zero `goroutineleak` count, as proof.** `GO-OBS-11`, `GO-OBS-12`.
15. **Copying `GODEBUG=execwait=2` from CI into a Dockerfile or unit file.** `GO-OBS-07`.
16. **`signal.Notify(c)` with no signal list**, which silently removes the SIGQUIT dump. `GO-OBS-08`.
17. **Reaching for Delve or a core dump before a free SIGQUIT, or profiling a
    production process without consent.** `GO-OBS-10`, `GO-OBS-14`.
18. **Setting `GOMEMLIMIT` in a CLI or a library.** `GO-OBS-09`.

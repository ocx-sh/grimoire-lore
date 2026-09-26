---
title: "Go observability — logging, runtime tuning and diagnosis (consolidation)"
topic: go-observability
model: opus
id_family: GO-OBS
consolidates:
  - go-observability/logging-and-diagnosis.md
  - go-observability/performance-hygiene.md (wave-4 revision dive; M-J-07, M-J-09)
  - go-audit/exemplar-runtime-posture.md (§4, Gaps)
  - go-topic-map.md (conflict 9; section J rows M-J-01..09, M-J-12 in part; M-P-03; wave-2 contradiction 5 and 17; wave-4 orchestrator additions)
date: 2026-09-26
revised: 2026-09-26
versions: Go 1.27.1 (GOTOOLCHAIN=local), golangci-lint 2.14.0 (sloglint, gosec, depguard, perfsprint, prealloc), goleak v1.3.0, automaxprocs v1.6.0, benchstat (golang.org/x/perf)
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/logging-and-diagnosis/ (dive 1), /home/mherwig/.cache/research-lang/go-tools/fixtures/performance-hygiene/ (dive 2), /home/mherwig/.cache/research-lang/go-tools/fixtures/go-observability-consolidation/ (this file; the revision's runs are the rev-* directories)
---

# Go observability — the consolidation (GO-OBS)

The map planned two dives, `logging-and-metrics` and `diagnosis-runbook`. They were merged into one,
[logging-and-diagnosis](go-observability/logging-and-diagnosis.md) ([map](go-topic-map.md) line 2144). This file
consolidates that dive against the audits and the sibling consolidations. It re-ran four of the dive's checks and planted
seven new fixture pairs to settle three conflicts. The runs are listed as **[C-n]** in
[Verification runs (this consolidation)](#verification-runs-this-consolidation).

**Revision (2026-09-26).** Wave 4 added a second dive,
[performance-hygiene](go-observability/performance-hygiene.md) ("[perf]"), which promotes the deferred rows M-J-07 (PGO)
and M-J-09 (allocation hygiene). This revision folds it in as GO-OBS-15..22. GO-OBS-01..14 keep their numbers and their
meaning. The revision re-ran [perf]'s load-bearing claims and recorded six more runs on planted fixtures ([C-11]..[C-16]). One
[perf] claim failed outright, and two [perf] verifications were replaced (conflicts C7-C9). See the
[Revision log](#revision-log).

## Verdict

1. **New fleet code logs through `log/slog`.** This binds all code kinds. Fleet modules deny zap, zerolog and logrus with a
   depguard `logging` rule ([C-6]). zap stays only where a repository already uses it ([map] conflict 9).
2. **Library and SDK code never touches process-global logging.** It takes a `*slog.Logger` from the caller and discards
   by default with `slog.DiscardHandler` (Go 1.24). There are two checks. A grep finds a mutation outside `package main`,
   and sloglint `no-global: "all"` finds calls through a global logger. CLIs own their process: they may call
   `slog.SetDefault` once from `main`, and their config leaves `no-global` unset.
3. **Bare `sloglint` is not coverage.** At its defaults it fired 0 issues on both the global-logger fixture and the
   mismatched-pair fixture ([C-3]). GO-GATE-09's "self-gating" entry therefore gains `no-global: "all"` for libraries and
   the SDK. Key/value well-formedness stays with vet's `slog` analyzer (GO-GATE-02).
4. **`net/http/pprof` is never blank-imported.** Binaries that serve HTTP register pprof explicitly on a dedicated mux,
   on an operator-only listener, behind a flag that defaults to off. gosec G108 is already on in the fleet baseline
   (GO-GATE-14) and catches the blank import ([C-5]). The dive's grep pipeline is demoted to a reading aid.
5. **No fleet module imports `go.uber.org/automaxprocs`.** Q1 puts every fleet `go` line at 1.26 or later, so the go-line
   gate of GO-MOD-09 always holds. The package moves into GO-MOD-08's depguard list. It does more than duplicate the
   runtime: under a 1.5-CPU quota it pins `GOMAXPROCS=1` where the runtime chooses 2, prints a log line to stderr, and
   turns off the runtime's periodic re-check ([C-7]).
6. **Goroutine-leak tests keep goleak (GO-CONC-11 unchanged).** The dive proposed a stdlib `runtime.Stack` diff instead.
   That proposal is rejected: it fails on compliant code that calls `signal.NotifyContext`, while goleak passes the same
   code ([C-1]). The SDK's test-only dependencies are go-cmp and goleak, as the map's contradiction-5 default already said.
7. **`GOGC` and `GOMEMLIMIT` are for long-lived services only.** Libraries and CLIs never set them. This is the one
   services section, per Q8.
8. **The go-diagnose skill runs a fixed order.** Step zero reads the binary's build identity with `go version` and
   `go version -m` (GO-OBS-22), because a non-default `GOEXPERIMENT` or a PGO build changes what a profile means. Then
   come the free steps: a SIGQUIT dump, then the runtime's own deadlock report. Next come steps that need a rebuild or a
   pre-armed binary: `-race -count=20`, pprof, the flight recorder, the `goroutineleak` profile. Delve and core dumps come
   last. The skill refuses to attach to or profile a process that the operator has not named as theirs.
9. **No optimization lands without a measurement that names its target (GO-OBS-15).** `sync.Pool`, preallocation
   rewrites and PGO all need a profile (GO-OBS-13) or a benchmark first. Any claim they make follows GO-TEST-20's
   `benchstat` form. Allocation facts come from `allocs/op`, never from reading `-gcflags=-m`: on 1.27.1 a runtime-sized
   `make([]byte, n)` reports `does not escape` and still heap-allocates for every n above 32 bytes ([C-11]).
10. **Linters are hints here, not gates.** perfsprint is silent on two-verb `Sprintf` (GO-OBS-17). prealloc fires mostly on
    test tables and startup slices (GO-OBS-18). Neither decides a merge. Whether either joins a fleet config is
    GO-GATE's call in `gates/config-assembly`; this file's numbers are that dive's input.
11. **PGO is per binary, opt-in, and unproven for the fleet.** A `default.pgo` counts only in a `main` package's directory
    (GO-OBS-21). A library's copy is inert for its consumers ([C-14]). It is adopted only on a `benchstat` win on the
    target binary (GO-OBS-20). The corpus shows 0/35 production adoption, and [perf]'s one measurement was 6.83% slower.

**Documented gaps (researched; no answer exists yet).**
- **PGO payoff for a fleet binary.** No fleet Go binary exists to profile. The Go team's 2-14% figure is a population
  average over larger services, and no guidance narrows it by program size ([perf] Contested). GO-OBS-20 is the whole
  answer until a binary exists.
- **The `nogreenteagc` removal date.** The 1.26 notes forecast removal in 1.27. On 1.27.1 the flag is still accepted and
  still a real opt-out ([C-16] stamps `go1.27.1-X:nogreenteagc`). No 1.27 note or tracked issue gives a new date.
  go-upgrade re-checks it on each bump (GO-LANG-16).

## The ruleset

Every family ID used here belongs to GO-OBS. Rules are grouped by the check that catches them. "[dive n]" means
[logging-and-diagnosis](go-observability/logging-and-diagnosis.md) normative candidate n and its Verification runs
entry. "[C-n]" is a run recorded below.

### GO-OBS — caught by the golangci-lint baseline (GO-GATE-09, GO-MOD-08)

| ID | Rule | Rationale | Verification | Watched red | Severity | Floor |
|---|---|---|---|---|---|---|
| GO-OBS-01 | Log through `log/slog` in new code. Deny `go.uber.org/zap`, `github.com/rs/zerolog` and `github.com/sirupsen/logrus` in every fleet module with a depguard rule `logging` on `files: ["$all"]`, each entry with `desc: "new fleet code logs through log/slog"`. Leave an existing zap codebase on zap. | Agents reach for `zap.NewProduction()` out of habit. slog leads zap by repo breadth, 11/34 against 6, and zerolog has 0 real users ([run](go-audit/exemplar-runtime-posture.md) §4, [map] conflict 9). The SDK's stdlib-only runtime rule (GO-MOD-10) already forbids all three. | `golangci-lint run ./...` with the depguard `logging` rule. The finding is `import 'go.uber.org/zap' is not allowed from list 'logging'`. | yes: [C-6] `withzap` exit 1 / `maxprocs125` exit 0 | SHOULD (MUST for the SDK through GO-MOD-10) | go 1.21 (`log/slog`) |
| GO-OBS-02 | In library and SDK code, never call `slog.SetDefault`, `log.SetOutput`, `log.SetFlags` or `log.SetPrefix`. Accept a `*slog.Logger` (or a `slog.Handler`) from the caller. When none is given, default to `slog.New(slog.DiscardHandler)`. | `SetDefault` rewires both `slog` and the legacy `log` package for the whole process, including code that never asked for it ([go.dev/blog/slog](https://go.dev/blog/slog), [pkg.go.dev/log/slog#SetDefault](https://pkg.go.dev/log/slog#SetDefault)). | `grep -rl -e 'slog\.SetDefault(' -e 'log\.SetOutput(' --include='*.go' <dir> \| xargs -r grep -L -e '^package main$'`. Empty output passes. Each listed file is read: an exported helper that exists only so the caller can opt in (`uber-go/zap@4892335e05f1:global.go:133` `RedirectStdLog`) is acceptable in a general library and never in the SDK. | yes: [C-2] `libbad` listed / `libgood`, `clibootstrap` (package main) empty; [dive 1] | MUST (library, SDK) | go 1.24 (`DiscardHandler`); before 1.24 use `slog.NewTextHandler(io.Discard, nil)` |
| GO-OBS-03 | In library and SDK code, route every log call through an injected `*slog.Logger` held on a struct. Never call package-level `slog.Info` and friends, and never use a package-level logger variable. Enforce it with `linters.settings.sloglint.no-global: "all"` in the library and SDK config. The CLI config leaves `no-global` unset. | A package-level call resolves through whatever `SetDefault` last installed, which is the hazard GO-OBS-02 removes. `"default"` misses a package-level `var logger`, and `"all"` catches it ([C-4]). | `golangci-lint run ./...`. The finding is `default logger should not be used` or `global logger should not be used (sloglint)`. | yes: [C-3] `libbad` exit 1 / `libgood` exit 0; [C-4] `pkgvar` exit 1 under `all`, exit 0 under `default` | MUST (library, SDK) | golangci-lint v2 (sloglint) |
| GO-OBS-04 | Never count sloglint's bare enablement as slog coverage. Configure its settings explicitly (GO-OBS-03). Rely on vet's `slog` analyzer for matched key/value pairs and string keys: it runs under `go vet ./...` (GO-GATE-02) and inside `go test`'s default vet subset. | Bare sloglint caught neither the global-logger defect nor the mismatched-pair defect. An unmatched final argument is logged silently under the key `!BADKEY` ([pkg.go.dev/log/slog](https://pkg.go.dev/log/slog)). | `go vet ./...`. The finding is `missing a final value` or `should be a string or a slog.Attr`. vet is in `go test`'s subset at `go1.27.1:src/cmd/go/internal/test/test.go:679` (`"-slog"`). | yes: [C-3] vet `slogmisuse` exit 1 / `slogmisuse_fixed` exit 0; bare sloglint on `libbad`+`slogmisuse` reports `0 issues.` | SHOULD | go 1.21 |
| GO-OBS-05 | Never blank-import `net/http/pprof`. A binary that serves HTTP registers `pprof.Index`, `Cmdline`, `Profile`, `Symbol` and `Trace` explicitly on its own `http.ServeMux`. That mux is served on a separate operator-only listener (loopback or an admin address) that a flag enables and that defaults to off. | The blank import puts `/debug/pprof/*` on `http.DefaultServeMux`, so any later `ListenAndServe(addr, nil)` publishes it. Since 1.27 the exposed set includes `goroutineleak`, alongside `profile` (CPU sampling a remote caller can trigger) and `cmdline` ([go.dev/doc/go1.27](https://go.dev/doc/go1.27), `GOROOT/src/runtime/pprof/pprof.go:265`). | `golangci-lint run ./...` with gosec on, which is the fleet baseline (GO-GATE-14 excludes only G104 and G115). The finding is `G108: Profiling endpoint is automatically exposed on /debug/pprof`. Reading heuristic for what remains: explicit pprof handlers registered on `DefaultServeMux` or on the public mux. | yes: [C-5] `pprofbad` exit 1 / `pprofgood` exit 0 | MUST (any binary that serves HTTP) | — |
| GO-OBS-06 | Never import `go.uber.org/automaxprocs` in a fleet module. Add it to GO-MOD-08's `superseded` depguard list. Size worker pools from `runtime.GOMAXPROCS(0)`. Code never calls `runtime.GOMAXPROCS(n)` with n > 0, and Dockerfiles never set a `GOMAXPROCS` env default: either one freezes the value and turns off the runtime's re-check (only `runtime.SetDefaultGOMAXPROCS()` restores it). For a module outside the fleet, GO-MOD-09's go-line reading applies, because at `go 1.24` the runtime is **not** container-aware ([C-8]). | At `go ≥ 1.25` the runtime already reads cgroup quotas and re-checks them. automaxprocs v1.6.0 floors the quota (1.5 CPUs → 1, 0.5 CPUs → 1) where the runtime rounds up to a minimum of 2. It also prints `maxprocs: Updating GOMAXPROCS=…` to stderr and calls `runtime.GOMAXPROCS(n)` ([C-7]; `GOROOT/src/runtime/debug.go:11-66`). | `golangci-lint run ./...` with the depguard entry. The finding is `import 'go.uber.org/automaxprocs' is not allowed from list 'superseded'`. | yes: [C-7] `withautomaxprocs` exit 1 / `maxprocs125` exit 0; the cgroup behaviour under `systemd-run --user --scope -p CPUQuota=…` | MUST (fleet modules) | go 1.25 (`containermaxprocs`, `updatemaxprocs` have `Changed: 25`) |

### GO-OBS — caught by a grep with a directory operand

| ID | Rule | Rationale | Verification | Watched red | Severity | Floor |
|---|---|---|---|---|---|---|
| GO-OBS-07 | Set `GODEBUG=execwait=2` only in a CI job's env or in a manual repro. Never bake it into a Dockerfile, a systemd unit, a launcher script or a `.env`. | It panics the process on the first `exec.Cmd` that was never `Wait`ed. That makes it the right CI gate (GO-TEST-12) and a crash loop in production. It is an undocumented `#execwait` setting (`GOROOT/src/os/exec/exec.go:390`), so `//go:debug` cannot carry it; only the environment can ([io] conflict 11). | `grep -rn --exclude-dir=.github --exclude='*_test.go' -e 'execwait=' <dir>`. Empty output passes. | yes: [C-9] `execwait-baked` (Dockerfile `ENV`) exit 0 with a hit / `execwait-ci` (workflow only) exit 1 with no output | MUST | — |
| GO-OBS-08 | Name the signals: `signal.Notify(c, os.Interrupt, syscall.SIGTERM)` (GO-CLI-08). Never write `signal.Notify(c)` with no signal list, unless the program forwards every signal to a child and says so in a comment. | A catch-all subscription swallows SIGQUIT. The process then prints `got quit`, exits 0, and the goroutine dump that GO-OBS-10 depends on is gone. | `grep -rn -E -e 'signal\.Notify\([^,]*\)' --include='*.go' <dir>`. Empty output passes. | yes: [C-10] `notifyall` hit, and its SIGQUIT produced 0 goroutine lines with exit 0 / `notifynamed` no hit, and its SIGQUIT produced 10 goroutine lines with exit 2 | SHOULD | — |
| GO-OBS-09 | Tune `GOGC`, `GOMEMLIMIT`, `debug.SetGCPercent` or `debug.SetMemoryLimit` only in a long-lived service's `main`, and only against a measured steady-state heap. Libraries never call them. CLIs never set them. | A soft memory limit on a CLI that reads input of unbounded size turns a fast OOM into a slow GC-thrash hang. A library that sets them overrides its host process ([go.dev/doc/gc-guide](https://go.dev/doc/gc-guide); Discord's cache postmortem, [dive] §5). | Reading heuristic: `grep -rl -e 'debug\.SetMemoryLimit(' -e 'debug\.SetGCPercent(' --include='*.go' <dir> \| xargs -r grep -L -e '^package main$'` lists the library files to read. | no. Reading heuristic; the corpus has only 2 `SetMemoryLimit` sites (tailscale, containerd; [run] §4) | SHOULD (services, per Q8) | go 1.19 (`GOMEMLIMIT`) |

### GO-OBS — the go-diagnose procedure (skill steps; named procedures)

| ID | Rule | Rationale | Verification | Watched red | Severity | Floor |
|---|---|---|---|---|---|---|
| GO-OBS-10 | Diagnose a hung process that is still running with `kill -QUIT <pid>` before anything that needs a rebuild or an attach. In the dump, look for two or more goroutines parked in the same state (e.g. `[sync.Mutex.Lock]`) that share a `created by` caller. Do not wait for `fatal error: all goroutines are asleep`. | SIGQUIT is free and dumps every user goroutine under the default `GOTRACEBACK=single`. The runtime's own detector fires only when every goroutine is blocked, which a process with a ticker or an accept loop never is. | Named procedure: `kill -QUIT <pid>`, capture stderr, grep for a blocked-state tag that repeats. | yes: [dive 7] `deadlock` fixture: two `[sync.Mutex.Lock]` goroutines both created by `main.main`, captured while a heartbeat goroutine kept the process runnable | SHOULD | — |
| GO-OBS-11 | Chase a race that one `-race` run did not show with `GORACE=halt_on_error=1 go test -race -count=20 -run <Test> <pkg>`. Never call code race-free because a single green run passed. | `-race` detects races only in the interleavings it happens to see. `halt_on_error=1` stops at the first report, so 20 iterations do not bury it. | That command. A `WARNING: DATA RACE` block with a non-zero exit is the finding. | yes: [dive 8] `racy`: plain run `ok`; `-race -count=20` exactly one report, `FAIL` | SHOULD | cgo toolchain (GO-GATE-04) |
| GO-OBS-12 | Read a zero from the `goroutineleak` profile (`/debug/pprof/goroutineleak`, `pprof.Lookup("goroutineleak")`) as "none found", never as "no leak". The profile does not flag a goroutine that is reachable from a global or from a runnable goroutine's locals. The test-time gate is goleak (GO-CONC-11). | The blind spot is how the profile works, not a bug awaiting a fix ([go.dev/doc/go1.27](https://go.dev/doc/go1.27)). It caught 1 of 3 planted shapes where goleak caught 3 of 3 (GO-CONC-11 rationale). | Named procedure: sample the profile twice under load and compare `Count()`; then confirm in a test with goleak. | yes: [dive] §7 and [conc] GO-CONC-11 runs (1/3 vs 3/3); availability in a `go 1.26` module built by a 1.27.1 toolchain measured in [dive] `goroutineleak126` | SHOULD | toolchain go 1.27 (GA); 1.26 experimental |
| GO-OBS-13 | Find a CPU hotspot with `go tool pprof -top <bin> <cpu.pprof>`, then `-list=<func>`. Chase a stall that leaves no CPU sample and no leak with `runtime/trace.FlightRecorder`: start it at process start, `WriteTo` it when the symptom is detected, and read the file with `go tool trace`. The binary must carry the recorder before the incident. | `-list` ranks the source lines inside the hot function. A goroutine that is parked, not running, leaves no CPU sample; only a trace's `Running->Waiting` transition shows it, and the recorder's ring buffer avoids the cost of an always-on trace. | Named procedure: the two commands; `go tool trace -d=parsed <file>` shows the transition. | yes: [dive 9] `hotspot` `main.slowFib` 100% flat, `-list` names line 15; [dive 10] `flightstall` shows `Running->Waiting Reason="sleep"` for the 300 ms stall | SHOULD | go 1.25 (`FlightRecorder`) |
| GO-OBS-14 | The go-diagnose skill never attaches Delve, pulls a live profile or trace, or sends SIGQUIT to a process that the operator has not named as theirs to touch. For a production process it needs explicit consent in the moment. It prints the command and its cost and stops. | SIGQUIT kills the process after the dump (exit 2, [C-10]). A CPU profile loads a live service. A `-race` or `-N -l` rebuild changes the binary. A Delve attach stops the scheduler ([dive] §6). | Reading heuristic, necessarily: it governs what the agent does, not code, so no analyzer can see it. Review the skill text against this row. | n/a (agent-action rule) | MUST (skill) | — |

### GO-OBS — performance hygiene (revision 2026-09-26; a test, a lint pass, or a build-info read)

"[perf n]" means [performance-hygiene](go-observability/performance-hygiene.md) normative candidate n, and "[V-n]" its
Verification runs entry.

| ID | Rule | Rationale | Verification | Watched red | Severity | Floor |
|---|---|---|---|---|---|---|
| GO-OBS-15 | Optimize only a function that a CPU or allocation profile (GO-OBS-13, `go test -memprofile`) or a benchmark has named. Work in this order: do less, do it less often, then do it faster. `sync.Pool`, preallocation rewrites, `strconv`-for-`fmt` swaps and PGO come after that. Every resulting claim follows GO-TEST-20. | Agents skip straight to micro-optimization, the third step, because it looks like expertise (Cheney's rule of three, [perf] Summary). Every [perf] fixture that "optimized" without a measurement either regressed or did nothing (GO-OBS-16, GO-OBS-20). | Reading heuristic: the PR or commit names the profile or benchmark that picked the function, and quotes a `benchstat` table (GO-TEST-20). | n/a (reading heuristic; GO-TEST-20 holds the watched `benchstat` runs) | SHOULD | — |
| GO-OBS-16 | Add a `sync.Pool` only when both hold. First, the un-pooled path measures at least 1 `allocs/op` under `-benchmem` or `testing.AllocsPerRun`. Second, `benchstat` shows the pooled version winning. Never take `-gcflags=-m` saying `does not escape` as proof that nothing is heap-allocated. Treat it as a hint about where to look. | Pooling a value that never reaches the heap adds only Pool bookkeeping. [perf]'s small struct cost 0 B/op either way, and the pool added about 6.4 ns/op (0.39 → 6.81 ns, +1634%, p=0.000, n=10). A 64 KiB buffer that escapes through an `io.Writer` call dropped from 1 alloc/65,536 B to 0 and ran 56.55% faster ([V-5]). The dividing line is a measured allocation, not a size and not a `-m` line: a runtime-sized `make([]byte, n)` prints `does not escape` and still allocates for every n above 32 bytes ([C-11]). | `go test -run='^$' -bench=<PlainVariant> -benchmem -count=10 <pkg>` on the **un-pooled** code. `0 allocs/op` means the pool can only cost. At least 1 means a pool may pay, and `benchstat plain.txt pooled.txt` decides. | yes: [V-5] plain small struct `0 allocs/op` (the pool regressed) / plain 64 KiB buffer `1 allocs/op` (the pool won); [C-11] `-m` `does not escape` alongside `allocs/op = 1` for n = 33 B .. 1 MiB (0 at n ≤ 32) | SHOULD | — (behaviour measured on 1.27.1) |
| GO-OBS-17 | A clean perfsprint run does not show that `Sprintf` is fine. Where perfsprint is enabled, it rewrites single-verb calls (`%d` → `strconv.Itoa`, `"id-%s"` → concatenation). It is silent on two or more verbs (`Sprintf("%s%s", a, b)`). In a function that a profile named hot, list the multi-verb calls and read each one. | [perf] measured the missed shape at -67.80% when rewritten as `a+b` (p=0.000, n=10), next to the caught `%d` shape at -96.51% ([V-2]). An agent that reads 0 issues as "no Sprintf left" leaves the multi-verb calls in place. | Lint: `golangci-lint run ./...` with perfsprint gives `integer-format:` or `string-format: … (perfsprint)`. Reading list: `grep -rn -E -e 'fmt\.Sprintf\("[^"]*%[a-zA-Z][^"]*%[a-zA-Z]' --include='*.go' <dir>`, where each hit inside a hot function is read. | yes: [C-12] perfsprint flags `%d` and `"id-%s"` and not `%s%s` (exit 1, 2 issues; unchanged with `strconcat: true`); the grep lists only the `%s%s` line (exit 0) and is empty on a single-verb twin (exit 1) | SHOULD (hot paths only) | golangci-lint v2 |
| GO-OBS-18 | Treat each prealloc finding as a question, not a defect. Read the loop before acting on it. Rewrite only a loop that runs per request or per item. Never let prealloc block a merge, and never mass-apply its suggestions. | Across the map's 8 named exemplars it fired 31 times in 123,632 LOC (≈2.5/10k). Hand-classified, those hits are test-table construction (all 14 in regclient) or once-per-process flag and alias slices (all 8 in urfave/cli) ([perf] §2, [V-3]). Mass-applying `make([]T, 0, n)` churns code for no measured gain. | Reading heuristic: `golangci-lint run` with prealloc enabled lists `Consider preallocating <name>` sites. Each site's loop is read for how often it runs. | census, not a pair: [V-3] 31 hits / 8 repos (0 in ko and cobra) | CONSIDER | golangci-lint v2 |
| GO-OBS-19 | Give a function whose allocation count is part of its contract (documented, or on a path that GO-OBS-15's profile named) a `testing.AllocsPerRun` test with an explicit numeric budget: `if got > want { t.Fatalf(…) }`. Run it in the normal `go test` and `-race` jobs. Never run it under `-gcflags=all=-N -l`. | The guard went red at 10 allocs/op against a budget of ≤1 the moment a `strings.Builder` join became `+=` ([V-10]). It also stays green under `-race` (GO-GATE-04) and `-cover`. With optimizations off, counts rise (0 → 1 for a stack-allocated slice, [C-13]), so a debug-build job would report a false regression. `b.Loop` shape: GO-TEST-19. | `go test -run 'Allocs$' ./...`. The finding is a `t.Fatalf` naming `allocs/op`. | yes: [V-10] `JoinBad` exit 1 / `JoinGood` exit 0; [C-13] `JoinGood` exit 0 under the default, `-race` and `-cover` | SHOULD | — (`b.Loop` go 1.24, GO-TEST-19) |
| GO-OBS-20 | Never add or keep a `default.pgo`, or claim a PGO win, without a `benchstat` comparison on the **target binary's** workload built with `-pgo=off` and with the profile. Confirm that the build really used the profile by checking the shipped binary's build info. | `-pgo=auto` has been the default since go 1.21, so a file in the right directory silently changes the binary (different SHA-256, [V-6]). The payoff belongs to the program. [perf]'s small dispatcher got 6.83% **slower** (p=0.000, n=10, [V-7]), against the Go team's 2-14% for larger services ([go.dev/blog/pgo](https://go.dev/blog/pgo)). | `go version -m <bin> \| grep -e '-pgo='`. A `build -pgo=<path>` line means the profile was applied, and no line means it was not. Pair it with `benchstat off.txt pgo.txt` (GO-TEST-20). | yes: [C-14] `bin_auto` exit 0 with `build -pgo=…/cmd/pgocli/default.pgo` / `bin_off` exit 1 | SHOULD | go 1.21 (`-pgo=auto` default) |
| GO-OBS-21 | Put a `default.pgo` only in a `main` package's directory, with one profile per binary. Never pass one `-pgo=<file>` to a build of several unrelated `cmd/` binaries. Libraries and the SDK never ship a `default.pgo`. | A library-directory profile is inert for every consumer's binary ([C-14]). It still reshapes the library's own `go test -bench` runs, so its benchmarks stop matching what consumers get. PGO rebuilds the whole program, dependencies included, for one binary's profile, and the docs call one profile across several mains "often not what you want" ([go.dev/doc/pgo](https://go.dev/doc/pgo)). | `find <dir> -name default.pgo`. Each hit's directory must hold `package main`, and `go version -m` on that binary must show the matching `-pgo=` line. | yes: [C-14] profile in the library directory only → binary has no `-pgo=` (exit 1); the same profile in `cmd/pgocli/` → the line is present (exit 0) | SHOULD (MUST NOT ship one in the SDK) | go 1.21 |
| GO-OBS-22 | Before comparing profiles, traces or benchmarks across builds, and as go-diagnose step zero, record `go version <bin>` and `go version -m <bin>`. A `-X:<name>` suffix on the version (e.g. `go1.27.1-X:nogreenteagc`) means the binary runs with a non-default experiment. A `build -pgo=` line means it is a PGO build. A `GOEXPERIMENT=` setting line names the experiments. Compare like with like. | A pin that opts out of a shipped default (Green Tea GC, json/v2 and size-specialized malloc are all default-on in `go1.27.1:src/internal/buildcfg/exp.go:82-88`) changes GC and allocation behaviour without any source change. The stamp is the only place a shipped binary records it. Pins in source trees are GO-LANG-16's (see conflict C9). | `go version <bin> \| grep -e '-X:'`. Any output names a non-default experiment. | yes: [C-16] `GOEXPERIMENT=nogreenteagc` → `go1.27.1-X:nogreenteagc` (exit 0); default build and the redundant `greenteagc` → no suffix (exit 1) | SHOULD | — |

### Rules this group deliberately did not mint

- **Leak test harness.** This is GO-CONC-11, whose text is unchanged. See conflict C3.
- **Handle each error once, never log and return.** This is GO-ERR-19.
- **`execwait=2` as the CI leak gate.** This is GO-TEST-12. GO-OBS-07 covers only where the setting must not live.
- **`log.Fatal` or `os.Exit` outside `main`.** This is [map] conflict 8 / GO-ERR.
- **HTTP server timeouts.** These belong to GO-NET.
- **"Back every performance claim with `benchstat`" ([perf 1]).** This is GO-TEST-20, with its MUST severity. GO-OBS-15
  and GO-OBS-20 cite it.
- **"Size alone does not force a heap allocation on 1.26+" ([perf 4]).** Rejected, because the evidence contradicts it.
  See conflict C7.
- **Stale `GOEXPERIMENT` pins in source trees ([perf 10]).** This is GO-LANG-16. See conflict C9 for the two corrections
  handed to it.
- **perfsprint and prealloc membership in a fleet config.** This is GO-GATE (`gates/config-assembly`). GO-OBS-17/18 state
  only how to read their output.
- **Prometheus naming, OpenTelemetry and `tracebacklabels`** (M-J-10, M-J-11, the log-parsing half of M-J-12). These
  are still deferred ([map] line 1765). See Open questions.

### Conflicts resolved

- **C1. The go line versus the toolchain as the gate for container-aware `GOMAXPROCS`.**
  - The positions:
    - The dive's summary says the feature is "default on for any binary regardless of the module's `go` line" and that
      "the toolchain gates it" ([dive] Summary, bullet 8).
    - Its own §4, and GO-MOD-09, say the main module's `go` line gates it through the `GODEBUG` default table.
  - **Resolved for the `go` line, by measurement [C-8].** Both binaries were built by go1.27.1.
    - Under `go 1.24` the binary records `DefaultGODEBUG=containermaxprocs=0,…,updatemaxprocs=0` and reports
      `GOMAXPROCS=32` under a 2-CPU quota.
    - Under `go 1.25` it reports `GOMAXPROCS=2`.
  - GO-MOD-09's text stands. An agent that deletes automaxprocs under a `go 1.24` line loses container sizing.
  - (The dive's separate claim that the *`goroutineleak` profile* is available under a `go 1.26` line built by 1.27 is not
    GODEBUG-gated and stands.)
- **C2. The dive's exemplar note says the three automaxprocs importers have `go` lines ≤ 1.24, so they are not wrong
  today. The audit names the importers as caddy, etcd and "one more".**
  - Re-measured: the importers are caddy, restic and prometheus (`grep -rl --include=go.mod`). etcd does not import it.
  - Their `go` lines are `go 1.25.1` (`caddyserver/caddy@54937914234b:go.mod:3`), `go 1.25.8`
    (`restic/restic@5127c4abf921:go.mod:3`) and `go 1.26.7` (`prometheus/prometheus@270db2915054:go.mod:3`).
  - **All three are above the gate, so all three violate GO-MOD-09/GO-OBS-06 at their audited SHAs.** Both the dive's
    note and the audit's list are corrected.
- **C3. Contradiction 5: the dive's stdlib `runtime.Stack` diff against goleak (GO-CONC-11).**
  - The dive caught 3/3 planted leaks with zero false positives on its clean twin, and proposed revising GO-CONC-11. The
    map pre-authorised that revision if 3/3 held.
  - **Rejected.** The dive's own Contested section names the gap: the diff has no ignore list for goroutines the runtime
    starts lazily.
  - [C-1] planted the obvious case in compliant code. A test that calls `signal.NotifyContext` and then `stop()` fails
    the stdlib detector (`os/signal.signal_recv()` / `os/signal.loop()`, exit 1). goleak passes the same test (exit 0).
  - An SDK that wraps a CLI and forwards signals, or a CLI's `main` package tests, would hit this on day one. Adding the
    ignore list back means re-implementing goleak, and goleak v1.3.0 has no transitive dependencies.
  - GO-CONC-11 keeps its text. The SDK's test-only dependencies are **go-cmp and goleak**, which is the map's default for
    contradiction 5. The stdlib detector does not ship in the support directory.
- **C4. GO-GATE-09 lists `sloglint` as "self-gating" at its defaults, and [GC] rated it MUST from 0 hits on 8 repos.
  The dive found that the defaults catch nothing it needs.**
  - Re-run: [C-3] bare sloglint reports `0 issues.` on both `libbad` (`SetDefault` plus `slog.Info`) and `slogmisuse`
    (mismatched pairs). Its 0-hit census proves no false positives, not coverage.
  - **Resolved:** GO-GATE-09's settings gain `sloglint: {no-global: "all"}` in the library and SDK baseline. The CLI
    overlay (GO-GATE-18) omits it. The pair check stays with vet (GO-OBS-04).
  - `"all"` is chosen over `"default"` because only `"all"` flags a package-level logger variable ([C-4]).
- **C5. pprof exposure check: the dive's two-step grep (blank import plus `ListenAndServe(…, nil)` in the same file)
  against gosec G108.**
  - The grep misses a mux that is served from a different file than the import. G108 fires on the blank import itself,
    runs in CI, and is already enabled by the baseline.
  - **Resolved for G108.** The fleet rule forbids the blank import outright rather than reasoning about which listener
    serves it. The cost is one explicit `HandleFunc` block.
  - The exemplars that gate a blank import behind a flag (syncthing, restic) are safe today but fail G108. The fleet does
    not copy them.
- **C6. The map row M-P-03 says core dumps are "broken on Linux 6.12/6.13".** The dive traced the claim to an
  **elfutils** symbolisation bug, [sourceware 32713](https://sourceware.org/bugzilla/show_bug.cgi?id=32713), not a Go
  bug. The nearest Go issue, [golang/go#73141](https://github.com/golang/go/issues/73141), is unrelated. **Resolved:** the
  skill cites sourceware 32713 and never a `golang/go` number. Its workaround is kernel 6.14 or later, or a live Delve
  attach under GO-OBS-14.
- **C7. [perf] §7 and candidate 4: "on a Go 1.26+ toolchain a non-escaping 1 MiB `make([]byte, n)` stack-allocates; size
  no longer matters."**
  - [perf] could not replay its evidence. The "intermediate variant" was overwritten when the fixture was redesigned
    ([V-5] last bullet).
  - Re-measured in [C-11] on go1.27.1. `-gcflags=-m` does print `make([]byte, n) does not escape`. But
    `testing.AllocsPerRun` gives 0 allocs/op only at n ≤ 32 and 1 alloc/op at n = 33, 64, 1 KiB, 64 KiB and 1 MiB.
    A constant `var b [1<<20]byte` is `moved to heap` as well.
  - **Resolved against [perf].** The claim is false as stated, and it overclaimed a guarantee. Candidate 4 is not minted.
    What survives is narrower: for a runtime-sized slice, `does not escape` is not "no allocation". GO-OBS-16 carries
    that as text. The exact compiler ceiling was [perf]'s open gap. It is now measured at 32 bytes for runtime-sized
    `make` (1.27.1).
- **C8. [perf] candidate 2's verification: read `-gcflags=-m` for `does not escape`, and if present the pool is pure
  overhead.**
  - This fails in the dangerous direction. On [C-11]'s shape the read says "pure overhead" while the un-pooled path
    allocates on every call, so the agent would remove a pool that pays.
  - **Replaced.** GO-OBS-16's verification is `-benchmem` or `AllocsPerRun` on the un-pooled path, and `-m` is demoted to
    a hint. [perf] candidates 2 and 3 are merged into GO-OBS-16. Its size threshold ("under ~a few hundred bytes") is
    dropped: [perf]'s own §4 says the line is escape, not size.
- **C9. [perf] candidate 10 (dated comments on `GOEXPERIMENT=no…` pins) duplicates GO-LANG-16.** Not minted here.
  Measuring it produced two corrections for GO-LANG-16's owner. This file records them and does not edit
  `go-language.md`:
  - **GO-LANG-16's example is inverted.** It says a `nogreenteagc` pin on 1.27 is "still opt-in … a no-op". The
    toolchain baseline has `GreenTeaGC: true` (`go1.27.1:src/internal/buildcfg/exp.go:86`), and a `nogreenteagc` build
    is stamped `go1.27.1-X:nogreenteagc` while a `greenteagc` build carries no suffix ([C-16]). The pin is a real
    opt-out of the default GC, the same class as `nojsonv2`.
  - **Both greps miss the YAML env-map form.** On [C-15]'s three planted pins, [perf]'s grep found 1/3 (Dockerfile
    only) and GO-LANG-16's found 2/3. Both missed `GOEXPERIMENT: nojsonv2` under a workflow's `env:`. The replacement
    below found 3/3 and was empty on the clean twin:
    `grep -rn -E --exclude-dir=.git -e 'GOEXPERIMENT[^a-zA-Z0-9_]+([a-z0-9]+,)*no[a-z0-9]+' <dir>`. It lists every
    opt-out pin in any file type. Opt-in pins that are now defaults are harmless and not listed.
  - What GO-OBS keeps is the binary-side check, GO-OBS-22.
- **C10. [perf] candidate 7: "every allocation-sensitive function ships an `AllocsPerRun` guard".** This is too broad to
  check, and [perf] did not test the guard against the fleet's other jobs.
  - **Narrowed:** GO-OBS-19 applies to a function with a stated allocation contract or a profiled hot path.
  - [C-13] showed that the guard survives `-race` (GO-GATE-04) and `-cover`, but that `-gcflags=all=-N -l` inflates the
    counts. The rule names that job as off-limits.
- **C11. [perf] candidate 8's pickup check: grep `go build -x` output for `build\t-pgo=`.** That check needs a rebuild
  and a noisy trace. **Replaced** by `go version -m <bin> | grep -e '-pgo='`, which reads the shipped artifact itself
  and was watched red and green ([C-14]).
- **C12. Census corrections.**
  - `sync.Pool` in production code covers 13/35 repos, not 14: the golang/tools hit is analyzer testdata ([perf] §8).
  - prealloc is enabled in 7/23 golangci configs, where [gates] had 6. The missed one is google/go-containerregistry,
    the depth-2 search gap of frame correction M5.
  - `default.pgo` adoption is 0/35 (one gazelle testdata hit), which answers
    `go-audit/exemplar-modules-and-release.md:889` "Not measured".
  - perfsprint's scope is also refined. [perf] said it covers "`%s` single-arg" only. [C-12] shows that it also
    rewrites `"id-%s"` (a literal plus one verb) and that it misses only two or more verbs.
  - [perf] [V-3] recorded exit 0 for a golangci run with 2 findings. The finding counts are the evidence, and GO-OBS-18
    is a reading heuristic, so nothing rests on that exit code.

### Verification runs (this consolidation)

All runs used `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, golangci-lint 2.14.0). Paths are relative
to `fixtures/go-observability-consolidation/` (F) or `fixtures/logging-and-diagnosis/` (D).

- **[C-1] Leak detectors on compliant signal code.**
  - Command: `go test ./sigprobe-stdlib/` (the dive's `detector.go`, copied verbatim).
    - Result: `stdlib leak detector: goroutine(s) present after tests … os/signal.signal_recv() os/signal.loop() created by os/signal.Notify.func2.1`, `FAIL`, exit 1.
  - Command: `go test ./sigprobe-goleak/` (`goleak.VerifyTestMain`).
    - Result: `ok obsfix/sigprobe-goleak 0.002s`, exit 0.
- **[C-2] The SetDefault grep outside `main`**
  (`grep -rl -e 'slog\.SetDefault(' -e 'log\.SetOutput(' --include='*.go' <dir> | xargs -r grep -L -e '^package main$'`).
  - D/libbad: lists `libbad.go`.
  - D/libgood: empty.
  - F/clibootstrap (`package main` calling `SetDefault`): empty.
- **[C-3] Bare sloglint, then vet.**
  - `golangci-lint run --config .golangci-sloglint.yml ./libbad/... ./slogmisuse/...` in D: `0 issues.`, exit 0.
  - With `.golangci-sloglint-noglobal.yml`:
    - libbad: `libbad/libbad.go:21:2: default logger should not be used (sloglint)`, exit 1.
    - libgood: `0 issues.`, exit 0.
  - `go vet ./slogmisuse/...`: `missing a final value` and `arg "42" should be a string or a slog.Attr`, exit 1.
  - `go vet ./slogmisuse_fixed/...`: exit 0.
- **[C-4] sloglint `no-global` modes.**
  - Under `"all"`: `pkgvar` gives `pkgvar/pkgvar.go:8:13: global logger should not be used`, exit 1. `fieldlogger` gives
    `0 issues.`, exit 0.
  - Under `"default"`: both give `0 issues.`, exit 0.
- **[C-5] gosec on pprof.** Command: `golangci-lint run --config .golangci-gosec.yml ./pprofbad/...`.
  - pprofbad: `pprofbad/main.go:9:2: G108: Profiling endpoint is automatically exposed on /debug/pprof (gosec)`, exit 1.
  - pprofgood: `0 issues.`, exit 0.
- **[C-6] depguard `logging` rule.**
  - `withzap`: `main.go:4:8: import 'go.uber.org/zap' is not allowed from list 'logging'`, exit 1.
  - `maxprocs125` with the same config: `0 issues.`, exit 0.
- **[C-7] automaxprocs v1.6.0 against the runtime, `go 1.27` module, under `systemd-run --user --scope -q -p CPUQuota=Q`.**

  | Quota | automaxprocs | Runtime alone (`GOMAXPROCS`) |
  |---|---|---|
  | 50% | `maxprocs: Updating GOMAXPROCS=1: using minimum allowed GOMAXPROCS`, then `GOMAXPROCS=1` | 2 |
  | 150% | `Updating GOMAXPROCS=1: determined from CPU quota`, then `GOMAXPROCS=1` | 2 |
  | 200% | `GOMAXPROCS=2` | 2 |

  - depguard `superseded` entry: `withautomaxprocs` gives `import 'go.uber.org/automaxprocs' is not allowed from list
    'superseded'`, exit 1. `maxprocs125` gives `0 issues.`, exit 0.
- **[C-8] The go-line gate, both binaries built by go1.27.1, 2-CPU quota.**
  - `maxprocs124` (`go 1.24`): `GOMAXPROCS=32`. `go version -m` shows
    `DefaultGODEBUG=containermaxprocs=0,…,tracebacklabels=0,updatemaxprocs=0,…`.
  - `maxprocs125` (`go 1.25`): `GOMAXPROCS=2`. `DefaultGODEBUG` contains no `containermaxprocs` entry.
- **[C-9] The execwait grep** (`grep -rn --exclude-dir=.github --exclude='*_test.go' -e 'execwait=' <dir>`).
  - `execwait-baked`: `Dockerfile:2:ENV GODEBUG=execwait=2`, exit 0.
  - `execwait-ci` (setting only in `.github/workflows/ci.yml`): no output, exit 1.
- **[C-10] Catch-all `signal.Notify`, then `kill -QUIT` after 0.5 s.**
  - `notifyall`: exit 0, 0 lines starting `goroutine `, first line `got quit`.
  - `notifynamed`: exit 2, 10 goroutine lines, first line `SIGQUIT: quit`.
  - The GO-OBS-08 grep lists only `notifyall/main.go:13`.

Revision runs (2026-09-26). F is the same consolidation directory. P is `fixtures/performance-hygiene/`, read only
(`go version -m` on existing binaries).

- **[C-11] Runtime-sized scratch slice: `-m` against measured allocations** (F/rev-stackslice, `go 1.27`).
  - `go build -gcflags=-m ./...`: `s.go:5:11: make([]byte, n) does not escape` and, for `var b [1 << 20]byte`,
    `s.go:14:6: moved to heap: b`. Exit 0.
  - `go test -run TestAllocs -v .` (`AllocsPerRun(20, …)`): `Scratch(16)` 0, `Scratch(32)` 0, `Scratch(33)` 1,
    `Scratch(64)` 1, `Scratch(1024)` 1, `Scratch(65536)` 1, `Scratch(1048576)` 1, `ScratchConst` 1. `ok`, exit 0.
- **[C-12] perfsprint scope** (F/rev-perfsprint: [perf]'s `bad.go` plus `PrefixConcat` using `"id-%s"`).
  - `golangci-lint run ./...` (perfsprint only): `bad.go:7:9: integer-format: … strconv.Itoa (perfsprint)` and
    `bad.go:15:45: string-format: fmt.Sprintf can be replaced with string concatenation (perfsprint)`. `2 issues`,
    exit 1. There is no finding for `Sprintf("%s%s", a, b)` at line 12. The result is identical with
    `settings.perfsprint: {strconcat: true, concat-loop: true}`.
  - Multi-verb grep: on rev-perfsprint `./bad.go:12:	return fmt.Sprintf("%s%s", a, b)`, exit 0. On
    rev-perfsprint-twin (`Sprintf("n=%d", n)` only): empty, exit 1.
- **[C-13] `AllocsPerRun` guard across job flags** (F/rev-allocsrace: [perf]'s `f-allocsperrun`, copied).
  - `TestJoinGoodAllocs` under the default, `-race` and `-cover`: `PASS`, exit 0 each time.
  - `TestJoinBadAllocs`: `FAIL`, exit 1.
  - F/rev-stackslice under `-gcflags=all=-N -l`: `Scratch(16)` and `Scratch(32)` rise from 0 to 1 allocs/op. Under
    `-race` they stay 0.
- **[C-14] PGO pickup from build info.**
  - `go version -m P/e-pgo/bin_auto | grep -e '-pgo='`: `build -pgo=…/e-pgo/cmd/pgocli/default.pgo`, exit 0.
  - The same on `P/e-pgo/bin_off`: empty, exit 1.
  - F/rev-pgo-libonly, with `default.pgo` only in the library (module root) directory:
    `go build -o bin_libpgo ./cmd/pgocli`, then the grep gives empty output, exit 1. With the same file copied to
    `cmd/pgocli/`: `build -pgo=…/rev-pgo-libonly/cmd/pgocli/default.pgo`, exit 0.
- **[C-15] Stale-pin greps** (F/rev-goexp-stale: Dockerfile `ENV GOEXPERIMENT=nogreenteagc`, workflow
  `env: {GOEXPERIMENT: nojsonv2}`, Makefile `GOEXPERIMENT="jsonv2,nosizespecializedmalloc"`. F/rev-goexp-clean: the
  same files with no opt-out, including `GOEXPERIMENT: jsonv2`).

  | Grep | stale | clean |
  |---|---|---|
  | [perf] candidate 10 (`--include` yml/yaml/Dockerfile*, `GOEXPERIMENT=` only) | 1/3 (Dockerfile), exit 0 | empty, exit 1 |
  | GO-LANG-16 (`-e 'GOEXPERIMENT=' -e 'GOEXPERIMENT '`) | 2/3 (Makefile, Dockerfile), exit 0 | empty, exit 1 |
  | C9 replacement (`GOEXPERIMENT[^a-zA-Z0-9_]+([a-z0-9]+,)*no[a-z0-9]+`) | 3/3, exit 0 | empty, exit 1 |
- **[C-16] Experiment stamp in the binary** (`go test -c` in F/rev-stackslice, then `go version -m`).
  - `GOEXPERIMENT` unset: no `-X:` suffix and no `GOEXPERIMENT` setting line.
  - `GOEXPERIMENT=greenteagc`: `build GOEXPERIMENT=greenteagc`, no `-X:` suffix.
  - `GOEXPERIMENT=nogreenteagc`: exit 0, and `go version` prints `go1.27.1-X:nogreenteagc`, with
    `build GOEXPERIMENT=nogreenteagc`.

## Applied to the exemplars and the future consumers

**Already satisfied.**
- **GO-OBS-02/03, library shape.** `kubernetes-sigs/controller-runtime`, `google/go-github` and `oras-project/oras-go`
  have no global-logging mutation in any importable package ([dive] Exemplar evidence).
- **GO-OBS-02/03, the sanctioned CLI shape.** `aquasecurity/trivy@ae561f8cca36:pkg/log/logger.go:51,58,91`,
  `hashicorp/terraform@db4eef44f5bb:internal/logging/logging.go` and
  `syncthing/syncthing@94c3c1cdef71:internal/slogutil/sloginit.go` are internal bootstrap packages of CLIs and daemons.
- **Explicit opt-in helpers.** `uber-go/zap@4892335e05f1:global.go:133` and
  `charmbracelet/bubbletea@d5bfd5c2ff74:logging.go:40` exist so that the caller can redirect its own global. The
  GO-OBS-02 grep lists them, and reading them clears them for a general library. The SDK may not ship such a helper.
- **GO-OBS-05, gated shape.**
  - `kubernetes-sigs/controller-runtime@d0127f7f66de:pkg/manager/internal.go:105-106,329-333,420-422` uses a dedicated
    `pprofListener` that is wired only when configured.
  - `caddyserver/caddy@54937914234b:admin.go:269-273` serves pprof on the admin mux.
  - Both register the handlers explicitly and pass G108.

**Violated.**
- **GO-OBS-06 / GO-MOD-09.** Each of these imports automaxprocs above the `go 1.25` gate, which on a 1.5-CPU quota pins 1
  instead of 2 and turns off updates ([C-7], conflict C2).
  - `caddyserver/caddy@54937914234b:cmd/main.go:40` (`go.mod:3` `go 1.25.1`)
  - `restic/restic@5127c4abf921:cmd/restic/main.go:15` (`go 1.25.8`)
  - `prometheus/prometheus@270db2915054:cmd/prometheus/main.go:57` (`go 1.26.7`)
- **GO-OBS-05.** Seven non-test, non-vendor files blank-import `net/http/pprof`. Each would fail G108.
  - `syncthing/syncthing@94c3c1cdef71:cmd/syncthing/main.go:20` is gated by the `STPROFILER` listen flag at `:182`.
  - `syncthing/syncthing@94c3c1cdef71:cmd/infra/ursrv/serve/serve.go:20` serves `DefaultServeMux`, which carries both
    pprof and `/metrics`, on an internal listener (`:170-176`).
  - `restic/restic@5127c4abf921:internal/global/global_debug.go:1,9,79` is gated behind the `debug || profile` build tag
    and a `--listen-profile` flag, and serves `ListenAndServe(profileOpts.listen, nil)`.
  - The others are the `grpc/grpc-go@acccf8cd101a` benchmark binaries, a `prometheus` documentation example and a
    `rules_go` test.
  - None of these is publicly exposed at the audited SHA. All of them depend on no one later adding a public
    `DefaultServeMux` listener, which is the fragility the fleet rule removes.
- **GO-OBS-08.** `containerd/containerd@934434dde54b:cmd/ctr/commands/signals.go:37` calls `signal.Notify(sigc)` to
  forward every signal to a container task. This is the documented forwarding exception, and it still costs `ctr` its
  SIGQUIT dump.

**Performance hygiene (revision).**
- **GO-OBS-16, satisfied by shape.** Every sampled production `sync.Pool` pools a byte buffer or a generic wrapper, never
  a small struct: `aquasecurity/trivy@ae561f8cca36:pkg/log/handler.go:301`,
  `restic/restic@5127c4abf921:internal/archiver/buffer.go:35`, `uber-go/zap@4892335e05f1:internal/pool/pool.go:42`, plus
  the containerd and pebble buffer pools ([perf] §8, 13/35 repos).
- **GO-OBS-18.** regclient's 14 prealloc hits are all in `_test.go` mock tables, e.g.
  `regclient/regclient@43d2acb9fafd:scheme/reg/manifest_test.go:85`. urfave/cli's 8 hits are startup flag slices, e.g.
  `urfave/cli@d1d810845dbc:flag_slice_base.go:85`. None of them names a hot loop.
- **GO-OBS-17.** perfsprint is enabled in 5/23 configs (trivy, containerd, go-github, goreleaser, prometheus; [perf]
  Exemplar evidence).
- **GO-OBS-20/21.** No exemplar ships a production `default.pgo`. The only hit is
  `bazelbuild/bazel-gazelle@63c9a3d2078f:language/go/testdata/bin_with_default_pgo/default.pgo`, which is testdata. There
  is no practice to copy and no violation to cite.
- **GO-TEST-20 / GO-OBS-15.** `benchstat` appears in 0/32 CI setups ([gates] §3). Measured optimization is a review
  discipline in the corpus, not a gate.

**New commitments for the fleet.**
- **Go SDK** (ocx wrapper; go 1.26.0 floor; stdlib-only runtime):
  - an optional `*slog.Logger` field that defaults to `slog.New(slog.DiscardHandler)` (GO-OBS-02);
  - `no-global: "all"` (GO-OBS-03);
  - no automaxprocs and no GC tuning (GO-OBS-06, GO-OBS-09);
  - goleak `VerifyTestMain` in every package that starts a goroutine (GO-CONC-11), plus go-cmp;
  - `execwait=2` in the CI test job only (GO-TEST-12, GO-OBS-07);
  - no `default.pgo` (GO-OBS-21). An `AllocsPerRun` guard goes only on a function the SDK documents an allocation
    contract for (GO-OBS-19); a subprocess wrapper's cost is the spawn, not its allocations.
- **Go CLIs** (ocx/grimoire mould; go 1.27.0):
  - `slog.SetDefault` exactly once in `main` with a stderr handler, keeping stdout for results (GO-CLI stream contract);
  - depguard `logging` (GO-OBS-01);
  - named signals only (GO-OBS-08, GO-CLI-08), so that SIGQUIT still dumps;
  - no pprof endpoint unless the CLI serves HTTP, and then GO-OBS-05.
- **Go CLIs, performance:** no PGO until GO-OBS-20's `benchstat` on the shipped binary shows a win. Pool and preallocate
  only under GO-OBS-15/16.
- **Services** (not a named consumer, Q8): GO-OBS-05, GO-OBS-06 and GO-OBS-09 form their one SHOULD section in
  `observability.md`.
- **go-diagnose skill:** GO-OBS-22 first, then GO-OBS-10..14 in that order. It cites sourceware 32713 for the kernel
  6.12/6.13 core-dump caveat.
- **go-quality support directory:** GO-OBS-15..21 join `observability.md` as a short performance section. The
  `AllocsPerRun` test from [V-10] is its copyable example.

## AI-agent failure modes

Ranked by how often each is expected to bite.

1. **Calling `slog.SetDefault` plus package-level `slog.Info` in a library "to make logging work."** It is the shortest
   code that works. Check: the GO-OBS-02 grep and sloglint `no-global: "all"` (GO-OBS-03).
2. **Adding zap, zerolog or logrus to a new module out of training-data habit.** Check: the depguard `logging` rule
   (GO-OBS-01).
3. **Enabling `sloglint` with no settings and calling slog covered.** Check: GO-OBS-04. Bare sloglint gave `0 issues.`
   on both defects, while `go vet` caught the pair defect.
4. **Adding automaxprocs "because containers need it."** Or the reverse: removing it under a `go 1.24` line. Check:
   depguard `superseded` (GO-OBS-06) in the fleet; `go list -m -f '{{.GoVersion}}'` before touching it elsewhere
   (GO-MOD-09, [C-8]).
5. **`import _ "net/http/pprof"` "for convenience" on the app port.** Check: gosec G108 (GO-OBS-05).
6. **Replacing goleak with a hand-rolled `runtime.Stack` diff, the `goroutineleak` profile or `synctest` as the test
   gate.** Check: GO-CONC-11's coverage grep. [C-1] shows the hand-rolled diff failing on compliant code.
7. **Treating a green single `-race` run, or a zero `goroutineleak` count, as proof.** Check: GO-OBS-11's
   `-count=20 halt_on_error=1` command and GO-OBS-12's reading rule.
8. **Copying `GODEBUG=execwait=2` from CI into a Dockerfile or unit file.** Check: the GO-OBS-07 grep.
9. **`signal.Notify(c)` with no signal list in a CLI, which silently removes the SIGQUIT dump.** Check: the GO-OBS-08
   grep.
10. **Reaching for Delve or a core dump before a free SIGQUIT; attaching to or profiling a production process without
    consent; citing a `golang/go#` number for the kernel 6.12/6.13 core-dump break.** Check: GO-OBS-10 and GO-OBS-14 in
    the skill text, and conflict C6.
11. **Setting `GOMEMLIMIT` in a CLI or a library.** Check: the GO-OBS-09 grep, then a read.

Added by the revision. These are ranked among themselves and slot in after item 5 above in expected frequency.

12. **Wrapping a small struct in `sync.Pool` "because pooling is faster."** It looks like textbook Go, and it measured
    +1634% with zero allocations saved. Check: GO-OBS-16's `-benchmem` read of the un-pooled path.
13. **Reading `-gcflags=-m`'s `does not escape` as "no allocation" and pulling out a pool that pays, or skipping one
    that would.** [C-11] shows this is false for any runtime-sized `make` above 32 bytes. Check: GO-OBS-16 measures
    `allocs/op`.
14. **Optimizing before measuring.** That means preallocating every slice, swapping every `Sprintf`, or pooling on
    sight. Check: GO-OBS-15, then GO-OBS-18's hand read of each prealloc hit.
15. **Calling `Sprintf` clean because perfsprint printed `0 issues.`** Check: GO-OBS-17's multi-verb grep.
16. **Dropping a `default.pgo` into a module root or a library "because PGO is a best practice," or quoting the 2-14%
    blog figure as this binary's gain.** Check: GO-OBS-21's `find` plus `go version -m`, and GO-OBS-20's `benchstat`.
17. **An allocation guard that is present but inert or flaky:** a comment instead of an `AllocsPerRun` test, or a guard
    run in a `-N -l` debug job. Check: GO-OBS-19.
18. **Comparing profiles from two binaries built with different `GOEXPERIMENT` or PGO settings.** Check: GO-OBS-22's
    `go version` stamp.

## Open questions

**Owner decisions** (the program applies the default if nobody answers).
- **A depguard `logging` deny list for CLIs as well as the SDK.** Default: yes. Every fleet module is new, and conflict 9
  keeps zap only where it is already in use.
- **Whether the CLI config sets any sloglint style options** (`kv-only` or `attr-only`, `static-msg`, `key-naming-case`).
  Default: none beyond the baseline, because nothing was measured.
- **Where GO-OBS-06's depguard entry lives.** Default: in GO-MOD-08's list, with GO-OBS-06 citing it, following the
  GO-GATE-13 precedent that one ID owns the list text. The GO-MOD drafter adds the entry.

**Another research round.**
- **`observability/deferred-telemetry` (M-J-10, M-J-11, and M-J-12's `tracebacklabels` half):** once a fleet CLI exists,
  does the `tracebacklabels` default change anything a log- or dump-parsing check must catch? `tracebacklabels=0` below a
  `go 1.27` line was observed in [C-8]'s `DefaultGODEBUG`. Would an OTel instrumentation hook in the SDK pay for itself,
  and what naming would Prometheus metrics follow? None of this is needed until a fleet Go service exists. (PGO,
  allocation hygiene and stale `GOEXPERIMENT` pins were answered by the revision: GO-OBS-15..22, GO-LANG-16, C9.)
- **Cross-family handoff, not a GO-OBS round:** GO-LANG-16's owner applies C9's two corrections (the inverted
  `nogreenteagc` example and the replacement grep). `gates/config-assembly` decides perfsprint and prealloc membership
  from GO-OBS-17/18's numbers.
- **`concurrency/leak-detection-stdlib`, closed as a negative:** the gap is an ignore list. Reopen only if goleak is
  archived or gains dependencies.
- **`observability/pprof-census`:** read the remaining pprof import sites in [run] §4 (26 import lines, 7 blank
  non-test files) for public exposure. This is low priority, because the fleet rule forbids the shape outright.

## Sub-artifacts

- [go-observability/logging-and-diagnosis.md](go-observability/logging-and-diagnosis.md): covers slog and library
  logging, sloglint against vet `slog`, pprof exposure, container-aware `GOMAXPROCS`, GC-tuning scope, the go-diagnose
  symptom-to-tool table, and the stdlib leak detector (rejected here by C3). It also verifies the kernel 6.12/6.13
  core-dump claim.
- [go-audit/exemplar-runtime-posture.md](go-audit/exemplar-runtime-posture.md) §4: the logger census (slog 11/34, zap 6,
  zerolog 0), 26 pprof imports, and automaxprocs and `SetMemoryLimit` counts. Its automaxprocs repository list is
  corrected by C2.
- [go-observability/performance-hygiene.md](go-observability/performance-hygiene.md) (revision dive): perfsprint and
  prealloc signal, escape analysis, `sync.Pool` on both sides of the line, PGO mechanics and the 0/35 census,
  `AllocsPerRun` guards, and the default-on `GOEXPERIMENT` set. Its §7 and candidate 4 are rejected (C7). Candidate 2's
  verification is replaced (C8). Candidate 10 is folded into GO-LANG-16 (C9).

## Key sources

- https://go.dev/blog/slog: the library-author rule, in the Go team's words.
- https://pkg.go.dev/log/slog: `DiscardHandler` (1.24), the reach of `SetDefault`, and the `!BADKEY` behaviour.
- https://github.com/go-simpler/sloglint/blob/main/README.md: `no-global` is off by default, and its `all` and
  `default` values.
- https://pkg.go.dev/net/http/pprof: the `DefaultServeMux` side effect of importing the package.
- https://github.com/securego/gosec#available-rules: G108.
- https://go.dev/blog/container-aware-gomaxprocs: the 1.25 container-aware default.
- https://github.com/uber-go/automaxprocs: its purpose, now duplicated by the runtime.
- https://go.dev/doc/gc-guide: `GOGC` and `GOMEMLIMIT` semantics.
- https://go.dev/doc/go1.27: `goroutineleak` GA, its blind spot, and the new pprof endpoint.
- https://go.dev/doc/diagnostics: the profiling, tracing and debugging taxonomy.
- https://go.dev/blog/flight-recorder: using `FlightRecorder` to snapshot on a symptom.
- https://pkg.go.dev/runtime#hdr-Environment_Variables: `GOTRACEBACK` and the SIGQUIT dump.
- https://github.com/uber-go/goleak: `VerifyTestMain` and its built-in ignore set, including `os/signal.loop`.
- https://michael.stapelberg.ch/posts/2025-02-27-debug-hanging-go-programs/: the hang runbook, and the source of the
  kernel 6.12/6.13 caveat.
- https://sourceware.org/bugzilla/show_bug.cgi?id=32713: the real tracker for that core-dump break.
- https://go.dev/doc/pgo: `default.pgo` in the main package directory, `-pgo=auto` (default since 1.21), whole-program
  scope, and the warning against one profile for several mains.
- https://go.dev/blog/pgo: the 2-14% figures and the "representative profile" premise.
- https://pkg.go.dev/sync#Pool: "amortize allocation overhead"; unsuitable for short-lived objects.
- https://pkg.go.dev/testing#AllocsPerRun: warm-up run, `GOMAXPROCS=1` pin, average count.
- https://github.com/catenacyber/perfsprint and https://github.com/alexkohler/prealloc: each linter's own scope.
- https://go.dev/blog/greenteagc and `go1.27.1:src/internal/buildcfg/exp.go:82-88`: the default-on experiment set.
- https://dave.cheney.net/high-performance-go-workshop/gopherchina-2019.html: "do less, do it less often, do it
  faster".

## Revision log

- 2026-09-26: folded in [perf] (performance-hygiene). Added GO-OBS-15..22, which is new and continues the sequence.
  GO-OBS-01..14 are unchanged in number and meaning; none was contradicted.
- 2026-09-26: Verdict item 8 now starts go-diagnose at GO-OBS-22. Items 9-11 and two documented gaps were added (PGO
  payoff for fleet binaries; the `nogreenteagc` removal date).
- 2026-09-26: rejected [perf] candidate 4 and §7 ("1 MiB non-escaping slice stack-allocates on 1.26+"), because it
  overclaimed. [C-11] measured heap allocation for every runtime-sized `make` above 32 bytes (C7).
- 2026-09-26: replaced [perf] candidate 2's `-gcflags=-m` verification with `-benchmem`/`AllocsPerRun` on the un-pooled
  path, and merged candidates 2 and 3 into GO-OBS-16, because the `-m` read inverts the verdict on runtime-sized
  buffers (C8).
- 2026-09-26: did not mint [perf] candidate 10, a duplicate of GO-LANG-16. Its grep went red on only 1/3 planted pins,
  so a watched replacement grep and the inverted `nogreenteagc` example are recorded for GO-LANG-16's owner. The
  binary-side check became GO-OBS-22 (C9).
- 2026-09-26: narrowed [perf] candidate 7 to GO-OBS-19, with the `-N -l` exclusion measured in [C-13] (C10). Replaced
  candidate 8's `go build -x` pickup check with `go version -m` (C11).
- 2026-09-26: did not mint [perf] candidate 1, which is GO-TEST-20 (cited).
- 2026-09-26: census corrections: `sync.Pool` 13/35, prealloc 7/23, `default.pgo` 0/35, and perfsprint's caught scope
  (C12).
- 2026-09-26: Open questions: removed M-J-07, M-J-09 and M-J-12's pin half, which are answered. Renamed the remainder
  `deferred-telemetry` and added the cross-family handoff.
- 2026-09-26: Applied-to-exemplars, fleet commitments, failure modes 12-18, Sub-artifacts and Key sources extended.

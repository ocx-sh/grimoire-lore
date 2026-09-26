---
title: How Go Code Proves Itself
summary: The GO-TEST family, assertion style, test lifecycle, parallel safety, synctest, the helper-process fake for a wrapped CLI, golden files, fuzz targets, coverage gates, and benchmark claims
---

# How Go Code Proves Itself

Owns what a Go test, fuzz target, benchmark or coverage gate looks like and
which check proves it. Does not own the gate itself: the ordered command block,
the three golangci-lint config files and the race job are `GO-GATE` (lint and
CI gate configuration), and this file names linters and settings, never YAML.
The `run()` entry-point shape a CLI test calls is `GO-CLI` (CLI contract). The
`os/exec` contract under test is `GO-IO` (files and processes). Goroutine-leak
checks in tests (goleak) are `GO-CONC-11` in `GO-CONC` (concurrency). What the
SDK's coverage profile counts is `GO-API-12` in `GO-API` (API design). Golden
bytes across a toolchain bump are `GO-LANG-11` in `GO-LANG` (language era).
`Example` functions belong to the `docs-instrument` skill.

Contents: [Dates and Floors](#dates-and-floors) ·
[Caught by go vet](#caught-by-go-vet) ·
[Caught by golangci-lint and go fix](#caught-by-golangci-lint-and-go-fix) ·
[Caught by Running the Tests](#caught-by-running-the-tests) ·
[Caught by Scripts Around the Coverage Tools](#caught-by-scripts-around-the-coverage-tools) ·
[Reading Heuristics](#reading-heuristics) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0 (testifylint
v1.6.4) and go-cmp v0.7.0, unless a row says otherwise.

- **go 1.18** (go-line gated): fuzzing, `FuzzXxx`, the `testdata/fuzz/` corpus.
- **go 1.20** (toolchain): `go build -cover`, `GOCOVERDIR`, `go tool covdata`.
- **go 1.22** (go-line gated): per-iteration loop variables, so `tt := tt` is dead code.
- **go 1.24** (go-line gated): `t.Context()`, `t.Chdir()`, `b.Loop()`. `t.Cleanup`
  (1.14), `t.TempDir` (1.15) and `t.Setenv` (1.17) apply below it too.
- **go 1.25** (go-line gated): `testing/synctest` GA with `synctest.Test`, and `sync.WaitGroup.Go`.
- **go 1.26** (toolchain): `synctest.Run` is gone, a compile error. The `go fix` modernizers need this toolchain (`GO-GATE-03`).
- **go 1.27** (go-line gated): `synctest.Sleep`. On the 1.27.1 toolchain `go test`
  runs 12 of vet's 35 analyzers, and `testinggoroutine` is not one of them (`GO-GATE-02`).

## Caught by go vet

```sh
go vet ./...   # a separate gate step (GO-GATE-02), exit 0 with empty output passes
```

A green `go test` is not a vet pass. The same file gave `go test` exit 0 and `go vet` exit 1.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-TEST-01 | Call `t.Fatal`, `t.FailNow`, `t.Skip*` and testify `require.*` only from the goroutine running the test. A spawned goroutine reports back through a channel, or uses `t.Error`/`t.Errorf`, which do not stop it. | `FailNow` runs `runtime.Goexit` on the calling goroutine. Called from another goroutine it orphans that goroutine and the test passes falsely. | `go vet ./...` (`testinggoroutine`) reports `call to (*testing.T).Fatal from a non-test goroutine` for a `go func(){…}()`. In testify code, `testifylint`'s `go-require` checker covers `require.*`. Reading heuristic for `wg.Go(func(){…})` and `errgroup.Go` closures: neither vet nor testifylint v1.6.4 flags `FailNow` there, so read every `Go(func` body in a `_test.go`. | MUST |

```go
// wrong: go test passes, go vet reports FailNow from a non-test goroutine
go func() {
	if err := work(); err != nil {
		t.Fatal(err)
	}
}()

// right: the goroutine reports back and the test goroutine fails
errc := make(chan error, 1)
go func() { errc <- work() }()
if err := <-errc; err != nil {
	t.Fatal(err)
}
```

## Caught by golangci-lint and go fix

```sh
golangci-lint run ./...   # the repo's one config file (GO-GATE-09 and its overlays), exit 0 with "0 issues." passes
go fix -diff ./...        # GO-GATE-03, exit 0 with an empty diff passes
```

The test-specific linters in the shared config are `depguard` (rule `no-testify`),
`thelper` (`begin` checks only), `usetesting` (with `context-background` and
`context-todo` on), `copyloopvar` and `testifylint`. `paralleltest` and
`tparallel` stay off (`GO-GATE-16`).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-TEST-02 | Write new tests with stdlib `testing` plus go-cmp. Scalars: `if got != want { t.Errorf("F(%v) = %v, want %v", in, got, want) }`. Structures: `if diff := cmp.Diff(want, got); diff != "" { t.Errorf("F() mismatch (-want +got):\n%s", diff) }`. Never add `github.com/stretchr/testify` to a module that does not already import it. **pinned**: the SDK's test dependencies are go-cmp and goleak, test-only (default, the adopter may override). | Go's TestComments, the Google style Decisions and the Go FAQ all reject assertion libraries. The flagship corpus splits by lineage (19 of 34 repos go-cmp, 17 testify), so "everyone uses testify" is false and tutorials over-represent it. | `golangci-lint run ./...`: depguard reports `is not allowed from list 'no-testify'` and exits 1. In a module with no testify yet, `grep -rln --include='*_test.go' -e 'github.com/stretchr/testify' .` must print nothing: empty output is the pass. An incumbent-testify repo deletes the `no-testify` rule and follows GO-TEST-03. | MUST |
| GO-TEST-03 | Where a repository already standardized on testify, keep it, keep `testifylint` at its defaults, and use `require` for every precondition whose failure makes later checks meaningless: errors, setup, and anything a later line dereferences. | `require-error` is testifylint's largest category (1,485 findings on one flagship CLI) yet fires 4 times on a repo with 6,563 `require.` calls to 173 `assert.` calls. It is signal, not noise. | `golangci-lint run ./...` with `testifylint` enabled. Exit 0 is the pass. | MUST (testify repos only) |
| GO-TEST-04 | Never import both testify and go-cmp into one test package. Use the repository's incumbent. | Two failure-message vocabularies for one kind of check. The corpus does mix them (14 files in one flagship repo), so this is a choice, not a mirror of practice. | The mixed-assertion command below, which works per file. Empty output is the pass. | SHOULD |
| GO-TEST-05 | Start every helper that takes `*testing.T`, `*testing.B` or `testing.TB` with `t.Helper()` as its first statement. Never use `t.Helper()` to build a private assertion library. | A missing or late `Helper()` reports the failure at the helper's line instead of the caller's. TestComments forbids helper-hidden assertion libraries. | `golangci-lint run ./...` with `thelper` (not in `standard`, so enabled explicitly). Exit 0 is the pass. The assertion-library half is a reading heuristic: a helper whose only job is to compare and call `t.Errorf` is the finding. | MUST |
| GO-TEST-06 | In a module whose `go` line is 1.24 or later, use `t.Context()` instead of `context.Background()`, `context.TODO()` or `WithCancel(Background())` plus `defer cancel()`. Use `t.TempDir()` instead of `os.MkdirTemp`/`os.CreateTemp` plus `defer os.RemoveAll`, `t.Setenv()` instead of `os.Setenv`, `t.Chdir()` instead of `os.Chdir`, and `t.Cleanup()` for teardown that must survive `t.Fatal`. A test that calls `t.Setenv` or `t.Chdir` is not parallel. | Cleanup runs on every exit path, and `t.Context()` is cancelled before Cleanup runs. `t.Setenv` and `t.Chdir` panic under a parallel ancestor. | `golangci-lint run ./...` with `usetesting` and its `context-background` and `context-todo` settings on. They ship off, so a bare `usetesting` misses `context.Background()`. `go fix -diff ./...` (`testingcontext`) prints the `t.Context()` hunk and exits 1. Exit 0 on both is the pass. Below `go 1.24`, `usetesting` skips only its 1.24-gated checks (`context-background`, `context-todo`, `os-chdir`) and still reports `os.MkdirTemp` and `os.Setenv`. | MUST |
| GO-TEST-07 | Shape table tests as a slice of structs with a `name` field and keyed field literals, one `t.Run(tt.name, func(t *testing.T){…})` per row with a name that stays readable after escaping, and separate test functions when rows need different logic. Never write `tt := tt` or `tc := tc` in a module whose `go` line is 1.22 or later. | Positional rows misassign silently when a field is added. The loop-variable copy is dead code since per-iteration loop variables and marks pre-1.22 training data (142 copies in the corpus). | `go fix -diff ./...` (`forvar`) or `copyloopvar` flags the copy with exit 1. Never grep for `tt := tt`: a line-anchored grep stayed green on a copy with a trailing comment. The shape is a reading heuristic. | SHOULD |
| GO-TEST-08 | Test HTTP-speaking code against a real transport: `httptest.NewServer` or `NewTLSServer` with `srv.Client()`, `httptest.ResponseRecorder` for a bare handler, and go-containerregistry's in-memory `registry.New()` handler under `httptest` for an OCI registry client. Mock only at a non-HTTP seam, generate mocks with `go.uber.org/mock`, and never import `github.com/golang/mock`. | `golang/mock` was archived 2024-01-08. A hand-mocked `http.Client` interface never exercises status handling, redirects or body closing. `registry.New()` returns an `http.Handler`, so a registry client needs no mock at all. | `grep -rn --include='*.go' -e 'github.com/golang/mock' .` Empty output is the pass. `GO-MOD-08`'s `superseded` depguard list also denies it. Mock-versus-transport is a reading heuristic. | SHOULD |

Mixed-assertion command (GO-TEST-04), empty output is the pass:

```sh
grep -rl --include='*_test.go' -e 'github.com/stretchr/testify' . | xargs -r grep -l -e '"github.com/google/go-cmp/cmp"'
```

## Caught by Running the Tests

```sh
CGO_ENABLED=1 go test -race -count=1 ./...   # the race job (GO-GATE-04), exit 0 passes
```

The failure text names the row: `WARNING: DATA RACE` (GO-TEST-09), `cannot handle
unexported field` (GO-TEST-10), `undefined: synctest.Run` (GO-TEST-11),
`executable file not found in $PATH` (GO-TEST-12), a missing golden file
(GO-TEST-13), a crashing seed (GO-TEST-14).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-TEST-09 | Give every `t.Parallel()` test or subtest its own fixture, never read or write a package-level or captured variable without synchronization, and prove it under `go test -race`. Never enable `paralleltest` or `tparallel` to back this. | A planted shared counter passes plain `go test` and fails only under `-race`. `paralleltest` gave 2,357 and 2,557 hits on two race-clean flagship repos, and `tparallel` fires on the call, not on the sharing. | `CGO_ENABLED=1 go test -race -count=1 ./...`. `WARNING: DATA RACE` is the finding, exit 0 is the pass. | MUST |
| GO-TEST-10 | Give `cmp.Diff`/`cmp.Equal` an explicit option wherever go-cmp cannot decide: `cmpopts.IgnoreUnexported(T{})`, an `Equal` method or `protocmp.Transform()` for unexported fields, `cmpopts.EquateEmpty()` where the code may return nil or empty unless that distinction is under test, and `cmpopts.EquateErrors()` for error fields. Never change production return values, or wrap the panic in `recover`, to satisfy a test. | go-cmp panics on an unhandled unexported field. go-cmp and testify both treat `nil` and `[]T{}` as unequal, and agents "fix" the mismatch by editing the function under test. | Run the test: the `cannot handle unexported field` panic self-reports. Nil-versus-empty is a reading heuristic: a non-test file in the same diff that swaps a `nil` return for an empty value is the tell. | SHOULD |
| GO-TEST-11 | In a module whose `go` line is 1.25 or later, test time-dependent concurrent code (retry and backoff, debounce, timeout, ticker) inside `synctest.Test(t, func(t *testing.T){…})` with `synctest.Wait` or `synctest.Sleep`. Do not sleep for real, do not add a `Clock` interface only for tests, and never write `synctest.Run`. Inside a bubble only channel operations, `sync.Cond.Wait`, `WaitGroup.Wait` and `time.Sleep` block durably, so network code uses `net.Pipe`. | Real sleeps are slow or flaky: a planted retry ran 0.072 s with real sleeps and 0.001 s in a bubble, with identical assertions. `Run` was removed in 1.26 ([golang/go#73567](https://github.com/golang/go/issues/73567)) and 1.24-era samples still show it. | The compiler rejects `synctest.Run`. For real sleeps, `grep -rn --include='*_test.go' -e 'time.Sleep(' .` is a work list: a hit outside a bubble, in a test whose subject spawns goroutines, is the finding. The hang branch of a GO-TEST-12 helper child is the named exception. Empty output is the pass. | SHOULD |
| GO-TEST-12 | Test a package that wraps a CLI through `os/exec` without the real binary. `TestMain` checks an env var such as `GO_WANT_HELPER_PROCESS`, and when it is set the test binary impersonates the CLI and exits with the requested code. Tests exec `os.Executable()` with one subtest per exit code in the contract. Unit tests never `exec.LookPath` the real tool or hard-code its bare name. A hang case calls `time.Sleep`, never `select{}`. Leak-freedom is read, not tested: every `Start` reaches a `Wait` on every path (GO-IO-01). `GODEBUG=execwait=2` cannot prove it on Go 1.27.1 (measured 2026-09-26): its finalizer never runs for an `exec.CommandContext` `Cmd`, whose `Cancel` closure refers back to the `Cmd`, and it fires only after a GC collects the `Cmd`, so a silent run proves nothing. **pinned**: the SDK's helper emits every exit code in the wrapped CLI's table, the retry code included (default, the adopter renames the tool and the table). | A test that needs the tool on `PATH` fails on every machine that lacks it and never produces a rare exit code. The pattern is the stdlib's own: `os/exec`'s tests on 1.27.1 dispatch on argv[1], and the env-var form still works and stays the example. `select{}` in the child trips the runtime deadlock detector. | `TOOL=ocx; grep -rn --include='*_test.go' -e "\"$TOOL\"" -e 'LookPath(' .` (rename `ocx` to your tool). Empty output is the pass. Mechanically: `go test -c -o pkg.test ./sdk` (rename `./sdk` to your package) then `env PATH=/nonexistent ./pkg.test`. Exit 0 is the pass, `executable file not found in $PATH` is the finding. | MUST (SDK) · SHOULD (CLIs that shell out) |
| GO-TEST-13 | Keep golden files under `testdata/`, with one `-update` bool flag per test binary (`flag.Bool("update", false, …)`) and a deterministic compare: normalize timestamps, map order and paths before comparing. A missing golden file fails the test, it is never created silently. | 561 golden files sit in 5 flagship repos, but only 6 repos carry an `-update` flag, and the rest regenerate by ad-hoc script. A non-deterministic golden test is a flake. | `go test -count=1 ./...` twice without `-update`, both exit 0. `grep -rn --include='*_test.go' -e 'flag.Bool("update"' .` finds the convention: empty output in a package whose tests compare against `testdata/` files is the finding. | SHOULD |
| GO-TEST-14 | Give every parser of untrusted input a `FuzzXxx` target: OCI manifests, digests, config files, archive headers, and any JSON envelope your SDK decodes. Seed it with `f.Add` for empty, truncated and shortest-valid inputs, and commit minimized failures under `testdata/fuzz/FuzzXxx/`. Plain `go test` then replays every seed as a regression test. **pinned**: the SDK fuzzes its JSON-envelope decoder (default, the adopter may override). | Table tests cover only inputs a human imagined. The corpus's 122 fuzz targets cluster in exactly these parsers. A planted digest parser panicked on the seed `sha256:short` alone, under plain `go test`. | `grep -rln --include='*_test.go' -e '^func Fuzz' .` lists the targets, and empty output means none exist. Reading heuristic: a `Parse*`, `Decode*` or `Unmarshal*` over `string` or `[]byte` with no sibling target is the finding. | SHOULD |
| GO-TEST-15 | Bound every CI fuzz run: `go test -run='^$' -fuzz=FuzzXxx -fuzztime=60s ./pkg`, one target per invocation. `-fuzz` without `-fuzztime` never appears in a workflow. **pinned**: seeds replay in every PR through plain `go test`, a scheduled job fuzzes each target for 60s, and no PR lane fuzzes generatively (default, the adopter may override). | Without `-fuzztime` the engine runs until it finds a failure or is killed, which hangs or randomly truncates the job. | The unbounded-fuzz command below. Empty output is the pass, and a repo with no CI fuzzing at all passes too. | MUST |

Unbounded-fuzz command (GO-TEST-15), empty output is the pass:

```sh
grep -rn --include='*.yml' --include='*.yaml' -e 'go test.*-fuzz[= ]' . | grep -v -e '-fuzztime'
```

```go
// right: TestMain turns the test binary into the wrapped CLI
func TestMain(m *testing.M) {
	if code, ok := os.LookupEnv("GO_WANT_HELPER_PROCESS"); ok {
		n, _ := strconv.Atoi(code) // a hang case calls time.Sleep, never select{}
		os.Exit(n)
	}
	os.Exit(m.Run())
}

func TestVersion(t *testing.T) {
	self, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	for _, code := range []int{0, 64, 75} { // one subtest per exit code in the contract
		t.Run(strconv.Itoa(code), func(t *testing.T) {
			t.Setenv("GO_WANT_HELPER_PROCESS", strconv.Itoa(code))
			// wrong: a bare tool name here needs the real tool on PATH
			if got, err := Version(t.Context(), self); err != nil || got != code {
				t.Errorf("Version() = %d, %v, want %d", got, err, code)
			}
		})
	}
}
```

## Caught by Scripts Around the Coverage Tools

No stdlib or `go test` flag enforces a threshold or checks that a binary wrote
coverage. Both checks are the shell below, and the gate runs from the module root.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-TEST-16 | Gate coverage with a script that reads the `total:` line of `go tool cover -func=cover.out` and fails closed: non-zero when the total is below the threshold, and also when the line is missing or the profile is unreadable. Feed it the `-coverpkg=./...` profile (`GO-API-12`). Never invent `-fail-under`. **pinned**: the SDK gates at 100% and CLIs carry no numeric gate (default, the adopter may override). | Coverage regressions stay silent without a gate. An empty profile reports `0.0%`, and a run outside the module root makes `go tool cover` fail with `is not in std`, so both must fail rather than pass. | The coverage-gate script below: a 99.9% profile exits 1, a 100% profile exits 0, and an empty profile or a run outside the module root exits 1. | MUST (SDK) |
| GO-TEST-17 | Collect integration coverage for a built binary with `go build -cover` (plus `-coverpkg` for the packages that count), run it with `GOCOVERDIR` set to an existing directory, fail the harness when that directory holds no counter files after the run, and report with `go tool covdata percent`, `merge` or `textfmt`. | With `GOCOVERDIR` unset the binary prints one stderr warning, keeps its own exit code and writes nothing, so a harness that checks only exit codes reports green at 0%. | The coverage-dir check below, after the suite. Exit 1 with `GOCOVERDIR holds no counters` is the finding, exit 0 is the pass. | MUST (where a CLI claims integration coverage) |

```sh
# coverage gate (GO-TEST-16)
go test -coverpkg=./... -coverprofile=cover.out ./...
go tool cover -func=cover.out | awk -v min=100 '
  $1 == "total:" { seen = 1; pct = $NF; sub(/%$/, "", pct); if (pct + 0 < min) print "coverage " pct "% < " min "%" }
  END { if (!seen) print "no total: line, profile empty or unreadable"; exit !(seen && pct + 0 >= min) }'

# coverage-dir check (GO-TEST-17), after the integration suite
find "$GOCOVERDIR" -type f -name 'covcounters.*' | grep -q . || { echo "GOCOVERDIR holds no counters: 0% collected" >&2; exit 1; }
```

## Reading Heuristics

No analyzer reads these. Each row names what the reviewer looks for.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-TEST-18 | Test a CLI in two layers. In-process: call `GO-CLI-02`'s `run(args, stdout, stderr)` with `bytes.Buffer`s and assert the returned `ExitCode`, stdout and stderr for every flag and error path. `testscript`: a `.txtar` suite wired through `TestMain` and `testscript.RunMain` for multi-step scenarios, real argv and exit-status propagation. | The in-process layer is fast and runs under `-race` and `-cover` but never exercises real argv or exit propagation, which only `testscript` does. | Reading heuristic. `grep -rln --include='*.go' -e 'go-internal/testscript' .` in a CLI module: empty output is the finding (no second layer). | SHOULD |
| GO-TEST-19 | Write new benchmarks as `for b.Loop() { … }`. Rewrite an existing `b.N` benchmark only by hand with a `benchstat` comparison, keep `b.N` when the body calls `b.StopTimer` or `b.StartTimer`, and never call `b.Loop()` while the timer is stopped. | `b.Loop` fixes dead-code elimination and setup timing. The `bloop` modernizer was withdrawn from `go fix` after a rewrite skewed an identical body by +182.86% ([golang/go#74967](https://github.com/golang/go/issues/74967)) and is absent from 1.27.1's fixers. `b.Loop()` with the timer stopped fails with `B.Loop called with timer stopped`. | Before any rewrite, `grep -rn --include='*_test.go' -e 'StopTimer' -e 'StartTimer' -e 'ResetTimer' .` is the work list: every hit is rewritten by hand or not at all. Empty output means no benchmark needs a hand rewrite. The benchmark run itself catches the timer-stopped call. | SHOULD |
| GO-TEST-20 | Back every performance claim in a PR, commit, changelog or code comment with `benchstat old.txt new.txt` over `go test -run='^$' -bench=X -count=10` runs of both variants, quoting the delta and the p-value. Never cite a single `ns/op`. | One run cannot separate effect from noise, and agents present single runs by default. benchstat appears in 0 of 32 flagship CI setups. | Reading heuristic: a claim with no benchstat table carrying `p=` beside it is the finding. | MUST |

## What Agents Get Wrong Here

1. **`assert.Equal` or `require.Equal` in a repository that does not use testify.** Tutorials over-represent it. Caught by `no-testify` (GO-TEST-02).
2. **`context.Background()`, `os.MkdirTemp` plus `defer os.RemoveAll`, `os.Setenv` in new tests.** A bare `usetesting` misses the context case (GO-TEST-06).
3. **`tt := tt` in a go 1.22+ table test**, then a grep that misses the commented copy (GO-TEST-07).
4. **`time.Sleep` polling in concurrency tests, or `synctest.Run` copied from 1.24-era samples** (GO-TEST-11).
5. **Believing a green `go test` means vet passed.** `t.Fatal` in a goroutine survives it, and inside `wg.Go` or `errgroup.Go` it survives every tool (GO-TEST-01).
6. **"Fixing" nil versus empty by changing production code, or wrapping a go-cmp panic in `recover`** (GO-TEST-10).
7. **Enabling `paralleltest` or `tparallel`, or sprinkling `t.Parallel()`, to "fix" test concurrency.** Racy tests pass plain `go test` (GO-TEST-09).
8. **Inventing `go test -cover -fail-under=100`.** The flag does not exist (GO-TEST-16).
9. **SDK tests that exec the real CLI.** Green on the author's machine, red in CI (GO-TEST-12).
10. **`github.com/golang/mock` imports or a hand-mocked `http.Client` interface** (GO-TEST-08).
11. **Mechanically rewriting `b.N` benchmarks to `b.Loop()`, or claiming "X% faster" from one run** (GO-TEST-19, GO-TEST-20).
12. **`-fuzz` without `-fuzztime` in a workflow** (GO-TEST-15).
13. **An integration-coverage harness with `GOCOVERDIR` unset.** It reads green at 0% (GO-TEST-17).

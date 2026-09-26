---
title: "How Go code proves itself — GO-TEST consolidation"
topic: go-testing (map section E, rows M-E-01..18)
model: opus
id_family: GO-TEST
consolidates:
  - go-testing/test-style.md
  - go-testing/time-fuzz-coverage.md
also_read:
  - go-audit/exemplar-quality-gates.md (§3 CI gates, §4 test-library census, §5 tool runs)
  - go-audit/exemplar-code-shape.md (§2 test placement, §3 adoption, Contradictions)
  - go-audit/exemplar-runtime-posture.md (§8 time)
  - go-audit/config-inventory.md (§3 SDK template, §6 docs-instrument)
  - go-gates/gate-commands.md (GO-GATE-COMMANDS-01, -02, -08 — cited, not restated)
  - go-io/subprocess-contract.md (§8 execwait, helper-process pattern — cited)
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/go-testing/
toolchain: Go 1.27.1 (GOTOOLCHAIN=local), golangci-lint 2.14.0 (testifylint v1.6.4), go-cmp v0.7.0, testify v1.12.1
date: 2026-09-26
---

# How Go code proves itself (GO-TEST)

Target file: `rules/go-quality/testing.md`, family GO-TEST, loaded by the
`go-quality` rule on `**/*.go`. The gate commands that run these checks are
owned by GO-GATE; the `run()` entry-point shape is owned by GO-CLI; the
`os/exec` contract under test is owned by GO-IO. This file cites them rather
than restating them.

## Verdict

1. **Default style for all new test code is stdlib `testing` plus go-cmp.** Scalars use `if got != want { t.Errorf("F(%v) = %v, want %v", …) }`. Structures use `cmp.Diff(want, got)`, printed as `(-want +got)`. The map already settled this (conflict 1); this consolidation only adds the mechanism, a `depguard` deny on testify scoped to `$test` files, which was watched red.
2. **testify is tolerated only where a repository already standardized on it.** Tolerance means `testifylint` at its defaults, `require` for any precondition, and no new go-cmp inside a testify package. The shifts scout's "testify-v1 as the pragmatic default" stays rejected.
3. **`go test` does not prove a test is well-formed.** The `go vet ./...` step (GO-GATE-COMMANDS-02) is what catches `t.Fatal` from a spawned goroutine, because `testinggoroutine` is commented out of `go test`'s vet subset (`go1.27.1:src/cmd/go/internal/test/test.go:684`). It has a blind spot that no tool closes: neither vet nor testifylint v1.6.4 flags `FailNow` inside a `sync.WaitGroup.Go` closure. That case stays a reading heuristic.
4. **Lifecycle helpers are gated by the `go` line.** At go ≥ 1.24, tests use `t.Context()`, `t.TempDir()`, `t.Setenv()`, `t.Chdir()` and `t.Cleanup()`. The check is `usetesting` with `context-background` and `context-todo` switched on (they ship off), plus `go fix -diff` (`testingcontext`, `forvar`).
5. **Time-dependent concurrent code is tested inside `synctest.Test`** (go ≥ 1.25), not with real sleeps and not by adding a new clock interface. `synctest.Run` is a compile error from 1.26 on.
6. **Races are proven by `-race`, never by `paralleltest`/`tparallel`.** Those two linters measured 2,357–2,557 hits on race-clean repos. The planted race passes plain `go test` and fails only under `-race`.
7. **The SDK (binds library/SDK code) makes four commitments:**
   - It never runs the real `ocx` in unit tests. It fakes the CLI with the `TestMain` re-exec helper process, one subtest per exit code in the contract.
   - It holds 100% statement coverage through a script over `go tool cover -func`. No `-fail-under` flag exists.
   - It fuzzes its JSON-envelope decoder.
   - go-cmp is a test-only dependency.
8. **CLIs (binds CLI code) test in two layers:**
   - In-process `run(args, stdin, stdout, stderr) int` tests for every flag and exit path.
   - `testscript` `.txtar` scripts for multi-step and real-argv behaviour.

   Integration coverage comes from `go build -cover` with a harness that fails when `GOCOVERDIR` is empty. There is no numeric gate (owner Q5 default).
9. **CI fuzzing is optional, but when it runs it is bounded.** Every `-fuzz=` in CI carries `-fuzztime=`. Seed corpora run on every plain `go test`.
10. **Benchmarks:**
    - `b.Loop()` is the default for new benchmarks.
    - Existing `b.N` benchmarks are rewritten by hand or not at all. The `bloop` modernizer was pulled from `go fix` ([golang/go#74967](https://github.com/golang/go/issues/74967)), and a rewrite skewed an identical body by +182.86%.
    - Every performance claim carries a `benchstat` table with a p-value.

## The ruleset

Numbering is final. Rows are grouped by the check that catches them. "Watched red" means the check was seen to fail on a planted violation and pass on its compliant twin. Each such run is cited to the dive's Verification runs or to this file's own [consolidation runs](#consolidation-verification-runs) (tagged **[C-n]**).

### GO-TEST — checked by `go vet ./...` (a separate gate step, GO-GATE-COMMANDS-02)

**GO-TEST-01 — Call `t.Fatal`, `t.FailNow`, `t.Skip*` and testify `require.*` only from the goroutine running the test. Spawned goroutines report back through a channel, or use `t.Error`/`t.Errorf`, which do not stop the goroutine.**
- **Rationale:** `FailNow` runs `runtime.Goexit` on the calling goroutine. Called from another goroutine, it orphans that goroutine and the test passes falsely. The rule is normative in [Best Practices §Tests](https://google.github.io/styleguide/go/best-practices#tests).
- **Verification:**
  - `go vet ./...` (`testinggoroutine`) for `go func(){…}()`.
  - For testify code, `golangci-lint run` with `testifylint` at defaults (`go-require`).
  - Reading heuristic for `wg.Go(func(){…})` and `errgroup.Go` closures, which neither tool sees.
  - `go test` alone never runs `testinggoroutine`.
- **Watched red:** yes.
  - [test-style §3 run](go-testing/test-style.md#verification-runs): vet exit 1 on the violation, 0 on the twin.
  - **[C-1]**: `go test` exit 0 and `go vet` exit 1 on the same file.
  - **[C-2]**: vet and testifylint both stay silent on `t.Fatal`/`require.NoError` inside `wg.Go`, so that case is a heuristic.
- **Severity:** MUST.
- **Floor:** none; the `wg.Go` blind spot exists from go ≥ 1.25.

### GO-TEST — checked by the fleet golangci-lint v2 config (GO-GATE owns the file; these are the test-specific entries)

**GO-TEST-02 — Write new tests with stdlib `testing` and go-cmp.**
- Scalars: `if got != want { t.Errorf("Func(%v) = %v, want %v", in, got, want) }`.
- Structures: `if diff := cmp.Diff(want, got); diff != "" { t.Errorf("Func() mismatch (-want +got):\n%s", diff) }`.
- Never add `github.com/stretchr/testify` to a module that does not already import it.

- **Rationale:** three normative sources reject assertion libraries: [TestComments](https://go.dev/wiki/TestComments#assert-libraries), [Decisions](https://google.github.io/styleguide/go/decisions#assertion-libraries) and the [FAQ](https://go.dev/doc/faq#testing_framework). The corpus is split by lineage (19/34 go-cmp vs 17/34 testify, [gates §4](go-audit/exemplar-quality-gates.md)), so "everyone uses testify" is false.
- **Verification:** `depguard` with this rule:
  ```yaml
  rules:
    no-testify:
      files: ["$test"]
      deny:
        - pkg: github.com/stretchr/testify
  ```
  - The config is `fixtures/go-testing/depguard.golangci.yml`.
  - The linter is omitted in incumbent-testify repos.
- **Watched red:** yes, **[C-3]**. The testify import is flagged with exit 1; the go-cmp twin gives `0 issues.` and exit 0.
- **Severity:** MUST.
- **Binds:** library, SDK, CLI.
- **Floor:** none.

**GO-TEST-03 — Where a repository already standardized on testify, keep it and enable `testifylint` at its defaults.** Use `require` for every precondition whose failure makes later checks meaningless: errors, setup, and anything a later line dereferences.
- **Rationale:** `require-error` is testifylint's largest category, with 1,485 findings on `cli/cli@9b031151a825`. It fires 4 times on the `require`-disciplined `goreleaser@ff8de3d6c389`, which has 6,563 `require.` calls to 173 `assert.` calls. That makes it signal, not noise ([test-style §3](go-testing/test-style.md#3-the-testify-tolerance-clause)).
- **Verification:** `golangci-lint run` with `testifylint` enabled (`fixtures/go-testing/testifylint.golangci.yml`).
- **Watched red:** yes.
  - **[C-2]**: `go-require` flags `require.NoError` inside a `go func(){}` (exit 1).
  - `require-error` volume was measured on exemplars, not planted.
- **Severity:** MUST, in testify repos only.
- **Floor:** none.

**GO-TEST-04 — Do not import both testify and go-cmp into one test package. Pick the repository's incumbent.**
- **Rationale:** two failure-message vocabularies for one kind of check. The corpus does mix them (see conflict C5), so this is a fleet choice, not a mirror of practice.
- **Verification:**
  ```sh
  grep -rl --include='*_test.go' -e 'github.com/stretchr/testify' DIR | xargs -r grep -l -e '"github.com/google/go-cmp/cmp"'
  ```
  Empty output means clean.
- **Watched red:** yes, on real code, **[C-4]**. `etcd-io/etcd` gives 14 files and `containerd` 6, both red; `cli/cli` and `trivy` give 0, both green.
- **Severity:** SHOULD.
- **Floor:** none.

**GO-TEST-05 — Start every test helper that takes `*testing.T`, `*testing.B` or `testing.TB` with `t.Helper()` as its first statement. Never use `t.Helper()` to build a private assertion library.**
- **Rationale:** a missing or late `Helper()` attributes the failure to the helper's line instead of the caller's. [TestComments](https://go.dev/wiki/TestComments) forbids helper-hidden assertion libraries.
- **Verification:** `golangci-lint run` with `thelper` enabled. It is not in `standard`, so enable it explicitly. It is precise: 3 hits on `go-github`, 755 on helper-dense `cli/cli`.
- **Watched red:** yes, [test-style §4 run](go-testing/test-style.md#verification-runs). thelper exits 1 on the violation and 0 on the twin; `go test -v` shows the line moving from the helper to the call site.
- **Severity:** MUST.
- **Floor:** none.

**GO-TEST-06 — In a module whose `go` line is ≥ 1.24, use the `testing` lifecycle methods inside tests:**

| Use | Instead of |
|---|---|
| `t.Context()` | `context.Background()`, `context.TODO()`, `context.WithCancel(context.Background())` + `defer cancel()` |
| `t.TempDir()` | `os.MkdirTemp`, `os.CreateTemp` + `defer os.RemoveAll` |
| `t.Setenv()` | `os.Setenv` + `defer os.Unsetenv` |
| `t.Chdir()` | `os.Chdir` |
| `t.Cleanup()` | `defer` for teardown that must survive `t.Fatal` |

`t.Setenv` and `t.Chdir` panic in a test with a parallel ancestor, so a test that needs them is not parallel.

- **Rationale:** cleanup runs on every exit path, and `t.Context()` is cancelled before Cleanup runs ([pkg.go.dev/testing](https://pkg.go.dev/testing#T.Context)). Adoption is 6,629–7,448 corpus call sites, 99.7% in go-github ([gates §4](go-audit/exemplar-quality-gates.md), map conflict 13).
- **Verification:**
  - `golangci-lint run` with `usetesting` and `settings.usetesting: {context-background: true, context-todo: true}`. Those two ship `false`; `os-setenv`, `os-mkdir-temp`, `os-create-temp` and `os-chdir` ship `true` (`golangci/golangci-lint@032d962e0399:.golangci.reference.yml:4222-4246`). The linter disables the 1.24-gated checks below go 1.24.
  - `go fix -diff ./...` (`testingcontext` fixer) rewrites the `WithCancel(Background())` + `defer cancel()` shape to `t.Context()`.
- **Watched red:** yes.
  - **[C-5]**: the default config gives 2 issues (MkdirTemp, Setenv) and misses `context.Background()`; the fleet config gives 3 issues; the twin gives 0.
  - **[C-6]**: `go fix -diff` exits 1 with the `t.Context()` rewrite.
  - [time-fuzz-coverage §7](go-testing/time-fuzz-coverage.md#verification-runs).
- **Severity:** MUST.
- **Floor:** go 1.24. `TempDir` needs 1.15, `Setenv` 1.17 and `Cleanup` 1.14, so those three apply below 1.24 too.

**GO-TEST-07 — Shape table tests as follows:**
- a slice of structs with a `name` field;
- keyed field literals;
- one `t.Run(tt.name, func(t *testing.T){…})` per row, with a name that stays readable after escaping;
- separate test functions when rows need different logic;
- no `tt := tt` or `tc := tc` copy in a go ≥ 1.22 module.

- **Rationale:** positional rows misassign silently when a field is added. The loop-variable copy is dead code since per-iteration loop variables (1.22) and a pre-1.22 training-data tell ([TestComments](https://go.dev/wiki/TestComments); [loopvar blog](https://go.dev/blog/loopvar-preview)). There are 142 corpus copies ([shape](go-audit/exemplar-code-shape.md)).
- **Verification:**
  - `go fix -diff ./...` (the `forvar` fixer, already in the GO-GATE block) or `golangci-lint` with `copyloopvar` catches the copy.
  - Shape is a reading heuristic.
- **Watched red:** yes, **[C-7]**: `go fix -diff` exit 1 with the deletion hunk; `copyloopvar` exit 1; both twins exit 0.
- **Do not use** the dive's grep `^\s*tt := tt\s*$`. It stayed green on a planted copy that carried a trailing comment.
- **Severity:** SHOULD for the shape. The copy is caught mechanically by the gate.
- **Floor:** go 1.22 for the copy.

**GO-TEST-08 — Test HTTP-speaking code against a real transport:**
- `httptest.NewServer` / `NewTLSServer` with `srv.Client()`;
- `httptest.ResponseRecorder` for a bare handler;
- for OCI registry clients, `go-containerregistry`'s in-memory `registry.New()` handler under `httptest`.

Mock only at a non-HTTP seam, generate mocks with `go.uber.org/mock`, and never import `github.com/golang/mock`.

- **Rationale:**
  - `httptest` is the most widely adopted test-only import, in 23/34 repos ([gates §4](go-audit/exemplar-quality-gates.md)).
  - `golang/mock` was archived on 2024-01-08 and has 0 corpus importers ([uber-go/mock](https://github.com/uber-go/mock)).
  - `registry.New()` returns an `http.Handler` (`google/go-containerregistry@0c8bedb78437:pkg/registry/registry.go:92`) and is used in tests by trivy, ko, cosign and ggcr itself **[C-8]**.
- **Verification:**
  - `grep -rn -e 'github.com/golang/mock' --include='*.go' DIR`. Empty output means clean.
  - Or add a `depguard` deny entry beside GO-TEST-02's.
  - Mock-vs-transport choice is a reading heuristic.
- **Watched red:** yes for the grep, **[C-9]**: exit 0 with a hit on the planted import, exit 1 with no output on the `go.uber.org/mock` twin.
- **Severity:** SHOULD.
- **Floor:** none.

### GO-TEST — checked by running the tests (`go test`, `go test -race`, the compiler)

**GO-TEST-09 — Give every `t.Parallel()` test or subtest its own fixture. Never read or write a package-level or captured variable without synchronization. Prove it under `go test -race` (the race lane, GO-GATE-COMMANDS-08). Never enable `paralleltest` or `tparallel` to back this.**
- **Rationale:** a parallel-fixture race is nondeterministic without `-race`. [failure §3](go-topic-map/failure.md) found 139 such races in the literature. `paralleltest` gave 2,357 hits on goreleaser and 2,557 on cli/cli, and `tparallel` fires on the call, not on the sharing.
- **Verification:** `go test -race -count=1 ./...`. `WARNING: DATA RACE` is the finding.
- **Watched red:** yes.
  - **[C-10]**: the shared-counter violation passes plain `go test` (exit 0) and fails `-race` (exit 1, 2× `DATA RACE`); the own-fixture twin passes `-race` (exit 0).
  - [test-style §5](go-testing/test-style.md#verification-runs), 3/3 runs.
- **Severity:** MUST.
- **Floor:** none.

**GO-TEST-10 — Give `cmp.Diff`/`cmp.Equal` an explicit option wherever go-cmp cannot decide:**
- `cmpopts.IgnoreUnexported(T{})`, an `Equal` method, or `protocmp.Transform()` for types with unexported fields;
- `cmpopts.EquateEmpty()` where the code may return nil or empty, unless that distinction is under test;
- `cmpopts.EquateErrors()` for error fields.

Never change production return values to satisfy a test.

- **Rationale:** go-cmp **panics** on an unhandled unexported field. Both go-cmp and testify treat `nil` ≠ `[]T{}` ([testify#1141](https://github.com/stretchr/testify/issues/1141) was closed as not planned), and agents "fix" this by changing the function under test.
- **Verification:**
  - Running the test: the panic text `cannot handle unexported field` is self-reporting.
  - The nil/empty case is a reading heuristic.
- **Watched red:** yes, test-style runs 1–2: panic exit 1 vs `IgnoreUnexported` exit 0; bare `cmp.Diff` fails on nil-vs-empty while the `EquateEmpty` twin passes.
- **Severity:** SHOULD. The dive proposed MUST; demoted because the panic is self-detecting and the rest is a heuristic.
- **Floor:** none.

**GO-TEST-11 — In a go ≥ 1.25 module, test time-dependent concurrent code (retry and backoff, debounce, timeout, ticker) inside `synctest.Test(t, func(t *testing.T){…})` with `synctest.Wait` / `synctest.Sleep`.**
- Do not sleep for real, and do not add a `Clock` interface only for tests.
- Never write `synctest.Run`.
- Inside a bubble, only channel operations, `sync.Cond.Wait`, `WaitGroup.Wait` and `time.Sleep` block durably. Mutexes and real I/O do not, so network code uses `net.Pipe`.

- **Rationale:**
  - Real sleeps are slow or flaky. The planted retry runs 0.072 s with real sleeps and 0.001 s under synctest, with identical assertions.
  - synctest went GA in 1.25. `Run` was removed in 1.26 and `Sleep` added in 1.27 ([golang/go#73567](https://github.com/golang/go/issues/73567), [pkg.go.dev/testing/synctest](https://pkg.go.dev/testing/synctest)).
  - Injected clocks are 7 imports corpus-wide, all etcd ([run §8](go-audit/exemplar-runtime-posture.md)).
- **Verification:**
  - The compiler, for `Run`: `go test ./...` fails with `undefined: synctest.Run`.
  - A reading heuristic for real sleeps: `time.Sleep(` in a `_test.go` whose subject spawns goroutines, outside a bubble.
- **Watched red:** yes.
  - **[C-11]**: `synctest.Run` gives build-failed exit 1; the `synctest.Test` twin exits 0, with the fake clock advancing exactly 1 h in 0.001 s.
  - [time-fuzz-coverage §1–2](go-testing/time-fuzz-coverage.md#verification-runs).
- **Severity:** SHOULD. A `synctest.Run` call is a build break under any supported toolchain.
- **Floor:** go 1.25 (`Sleep`: 1.27).

**GO-TEST-12 — Test a CLI wrapper without the real binary. A package that wraps a CLI through `os/exec` does it this way:**
1. `TestMain` checks an env var such as `FAKE_OCX_EXIT` or `GO_WANT_HELPER_PROCESS`.
2. When the var is set, the test binary impersonates the CLI and exits with the requested code.
3. Tests exec `os.Executable()` with one subtest per exit code in the contract.

Unit tests never `exec.LookPath` the real tool or hard-code its bare name. Leak-freedom is checked under `GODEBUG=execwait=2` (GO-IO, [subprocess-contract §8](go-io/subprocess-contract.md)).

- **Rationale:** a test that needs `ocx` on `PATH` fails on every machine that lacks it, and can never produce the rare exit codes. The pattern is the stdlib's own (`go1.27.1:src/os/exec/exec_test.go:151,158`, `GO_EXEC_TEST_PID`).
- **Verification:**
  - `grep -rn -e '"ocx"' -e 'LookPath(' --include='*_test.go' DIR`. Empty output means clean.
  - Mechanically: build the test binary and run it with a `PATH` that lacks the tool.
- **Watched red:** yes, **[C-12]**.
  - The violation's test binary under `PATH=/usr/bin:/bin` fails with `exec: "ocx": executable file not found in $PATH` (exit 1); the helper-process twin passes 0/64/79 subtests (exit 0).
  - The grep hits the violation (exit 0) and is empty on the twin (exit 1).
- **Severity:** MUST for the SDK; SHOULD for CLIs that shell out.
- **Floor:** none.

**GO-TEST-13 — Keep golden files under `testdata/`, one `-update` bool flag per test binary (`flag.Bool("update", false, …)`), and a deterministic compare.** Normalize timestamps, map order and paths before comparing. A missing golden file fails the test; it is never created silently.
- **Rationale:** 561 golden files exist in 5 repos, but only 6 repos carry an `-update` flag; the rest are regenerated by ad-hoc scripts ([gates §4](go-audit/exemplar-quality-gates.md)). A non-deterministic golden test is a flake.
- **Verification:**
  - `go test -run TestX -count=1 ./...` twice without `-update`; both runs must pass.
  - `grep -rn -e 'flag.Bool("update"' --include='*_test.go' DIR` to find the convention.
- **Watched red:** yes, [test-style §6](go-testing/test-style.md#verification-runs): the missing file gives exit 1, `-update` gives exit 0, and two unflagged reruns give exit 0 identically.
- **Severity:** SHOULD.
- **Floor:** none.
- **Caution:** json/v2 is default-on in 1.27 ([map] M1). Any golden file holding `encoding/json` output must be regenerated and reviewed on a toolchain bump (open question 3).

**GO-TEST-14 — Give every parser of untrusted input a `FuzzXxx` target.** That covers OCI manifests, digests, config files, archive headers and the SDK's JSON envelope.
- Seed it with `f.Add` for empty, truncated and shortest-valid inputs.
- Commit minimized failures under `testdata/fuzz/FuzzXxx/`.
- Plain `go test` then replays every seed as a regression test.

- **Rationale:** table tests cover only inputs a human imagined. The corpus's 122 fuzz targets cluster in exactly these parsers: tailscale 49, containerd 28 ([shape §2](go-audit/exemplar-code-shape.md)).
- **Verification:**
  - Reading heuristic: `func Parse*/Decode*/Unmarshal*` taking `string`/`[]byte` without a sibling fuzz target.
  - `grep -rln -e '^func Fuzz' --include='*_test.go' DIR` lists the targets.
- **Watched red:** yes, on the planted digest parser ([time-fuzz-coverage §3](go-testing/time-fuzz-coverage.md#verification-runs)). The seed `sha256:short` alone panics under plain `go test` (exit 1); the fixed twin survives 18.7 M executions in 15 s (exit 0).
- **Severity:** SHOULD. The SDK's envelope decoder is a commitment (see [Applied](#applied-to-the-exemplars-and-the-future-consumers)).
- **Floor:** go 1.18.

**GO-TEST-15 — Bound every CI fuzz invocation:** `go test -run='^$' -fuzz=FuzzXxx -fuzztime=<duration> ./pkg`, one target per invocation. `-fuzz` without `-fuzztime` never appears in a workflow.
- **Rationale:** without `-fuzztime` the engine runs until it finds a failure or is interrupted ([go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz)), which hangs or randomly truncates the job.
- **Verification:**
  ```sh
  grep -rnE -e 'go test.*-fuzz=' .github/workflows | grep -v -e '-fuzztime='
  ```
  Empty output means compliant, or that there is no CI fuzzing, which is allowed.
- **Watched red:** yes, **[C-13]**: the planted unbounded workflow line is printed (exit 0); the bounded twin prints nothing (exit 1).
- **Severity:** MUST.
- **Floor:** go 1.18.

### GO-TEST — checked by scripts around the coverage tools

**GO-TEST-16 — Gate coverage with a script that reads the `total:` line of `go tool cover -func=cover.out`, run from the module root.** The script fails closed: exit non-zero when the total is below the threshold, and also when the line is missing or the profile is unreadable. No stdlib or `go test` flag enforces a threshold, so never invent `-fail-under`.
- **Rationale:** coverage regressions stay silent without a gate. The SDK's 100% promise is modelled on `ocx-sdk-python`, whose `pyproject.toml` sets `fail_under = 100` ([cfg §3](go-audit/config-inventory.md)).
- **Verification:** `fixtures/time-fuzz-coverage/coverage_gate.sh cover.out 100`.
- **Watched red:** yes.
  - Re-run in **[C-14]**: the 99.9% profile gives exit 1 and the 100% profile gives exit 0.
  - An empty profile reports `0.0%` and exits 1.
  - The same valid profile run outside its module gives exit 2 ("package … is not in std"), which is why the script must run from the module root.
- **Severity:** MUST for the SDK at 100%. CLIs get no numeric gate (owner Q5 default).
- **Floor:** none.

**GO-TEST-17 — Collect integration coverage for a built binary as follows:**
1. Build it with `go build -cover [-coverpkg=<import paths>]`.
2. Run it with `GOCOVERDIR` set to an existing directory.
3. Have the harness fail when that directory is empty after the run.
4. Merge and report with `go tool covdata merge` / `textfmt` / `percent`.

- **Rationale:** with `GOCOVERDIR` unset, the binary prints one warning to stderr, exits 0 and writes nothing ([go.dev/doc/build-cover](https://go.dev/doc/build-cover)). A harness that checks only exit codes reports green while collecting 0%.
- **Verification:**
  ```sh
  [ -n "$(ls -A "$GOCOVERDIR")" ]
  ```
  Run after the suite.
- **Watched red:** yes.
  - **[C-15]**: unset gives `warning: GOCOVERDIR not set, no coverage data emitted`, run exit 0, harness check exit 1; set gives `covmeta.*` + `covcounters.*` and check exit 0.
  - [time-fuzz-coverage §4](go-testing/time-fuzz-coverage.md#verification-runs).
- **Severity:** MUST wherever a CLI claims integration coverage.
- **Floor:** go 1.20.

### GO-TEST — reading heuristics (no mechanical check exists)

**GO-TEST-18 — Test CLIs in two layers:**
1. **In-process:** call GO-CLI's `run(args, stdin, stdout, stderr) int` with `bytes.Buffer`s. Assert the exit code, stdout and stderr for every flag and error path.
2. **testscript:** multi-step scenarios — files, env, chained commands, real argv and exit-status propagation — get a `testscript` `.txtar` suite wired through `TestMain` + `testscript.RunMain`.

- **Rationale:**
  - The in-process layer is fast and works with `-race` and `-cover`, but never exercises real argv or exit propagation.
  - `testscript` does, and is the Go form of the fleet's "real-invocation test" (`rules/rust-quality/cli-contract.md` EXIT-10).
  - `cli/cli` ships both layers (`cli/cli@9b031151a825:acceptance/acceptance_test.go:226-227`).
- **Verification:** reading heuristic. Presence can be checked with `grep -rln -e 'go-internal/testscript' DIR`.
- **Watched red:** no. [test-style §7](go-testing/test-style.md#verification-runs) is a both-green shape demonstration; there is no violating twin.
- **Severity:** SHOULD.
- **Floor:** none.

**GO-TEST-19 — Write new benchmarks as `for b.Loop() { … }`, but only rewrite an existing `b.N` benchmark by hand, with a `benchstat` comparison.**
- Keep `b.N` when the body calls `b.StopTimer`/`b.StartTimer`.
- A benchmark must not call `b.Loop()` while the timer is stopped.

- **Rationale:**
  - `b.Loop` fixes dead-code elimination and setup timing ([go.dev/blog/testing-b-loop](https://go.dev/blog/testing-b-loop)).
  - The `bloop` modernizer was pulled from `go fix` after measured skew ([golang/go#74967](https://github.com/golang/go/issues/74967)); it is absent from 1.27.1's 26 fixers ([map] M3). The dive measured +182.86% on an identical body (p=0.002).
  - `b.Loop` fails with `B.Loop called with timer stopped` (`go1.27.1:src/testing/benchmark.go:417`).
- **Verification:**
  - Reading heuristic: `grep -n -e 'StopTimer' -e 'StartTimer' -e 'ResetTimer' FILE` before a rewrite. A hit means review by hand.
  - The benchmark run itself catches the timer-stopped case.
- **Watched red:** yes, **[C-16]**. A body ending in `b.StopTimer()` fails (exit 1); a `Stop…Start` pair inside the body passes (exit 0), which refines the dive's broader claim.
- **Severity:** SHOULD.
- **Floor:** go 1.24.

**GO-TEST-20 — Back every performance claim in a PR, commit, changelog or code comment with `benchstat old.txt new.txt`.** Both variants are run with `go test -run='^$' -bench=X -count=10`, and the claim quotes the delta and p-value. Never cite a single `ns/op`.
- **Rationale:** one-run numbers cannot separate effect from noise, and agents present single runs by default. benchstat appears in 0/32 CI setups ([gates §3](go-audit/exemplar-quality-gates.md)).
- **Verification:** reading heuristic only. The claim lives in prose that no analyzer reads; the reviewer checks that a benchstat table with `p=` accompanies it. benchstat itself was run: `Sum-32 20.36n ± 2% 57.59n ± 2% +182.86% (p=0.002 n=6)` ([time-fuzz-coverage §6](go-testing/time-fuzz-coverage.md#verification-runs)).
- **Severity:** MUST, kept despite the heuristic check because an unbacked claim is the failure agents produce most.
- **Floor:** none.

**MUST count: 11** — GO-TEST-01, 02, 03 (testify repos), 05, 06, 09, 12 (SDK), 15, 16 (SDK), 17 (where claimed), 20.

### Map rows dropped or routed

| Row | Disposition |
|---|---|
| M-E-17 (malformed test names) | Dropped. `go test` already fails: `vet tests` is in the default subset (`test.go:685`). **[C-17]** shows `Testparse` failing the build with exit 1, so a rule changes nothing. |
| M-E-14 (white-box vs `_test` package) | Dropped. 83% white-box ([shape §2](go-audit/exemplar-code-shape.md)), with no failure attached. |
| M-E-12 (Example functions) | Routed to `docs-instrument` (`tested-examples-by-language.md:42-43`). |
| M-E-11 (the `-race` lane) | Owned by GO-GATE-COMMANDS-08. GO-TEST-09 cites it. |

### Consolidation verification runs

All runs use `~/.cache/research-lang/go-tools/run.sh`, cwd `fixtures/go-testing/` (module `gotesting`, `go 1.27`), on 2026-09-26.

| Run | Command | Violation → exit | Twin → exit |
|---|---|---|---|
| C-1 | `go test ./vetsubset/red` / `go vet ./vetsubset/red` | test `ok` exit 0; vet `r_test.go:13:4: call to (*testing.T).Fatal from a non-test goroutine` exit 1 | `vetsubset/green`: vet exit 0 |
| C-2 | `go vet ./vetsubset/testify`; `golangci-lint run --config testifylint.golangci.yml ./vetsubset/...` | `go func` + `require.NoError`: `go-require: require must only be used in the goroutine running the test function` exit 1 | `t.Fatal` and `require.NoError` inside `wg.Go`: vet exit 0, testifylint `0 issues.` exit 0 (**blind spot, not a twin**) |
| C-3 | `golangci-lint run --config depguard.golangci.yml ./depguard/{red,green}` | `import 'github.com/stretchr/testify/assert' is not allowed from list 'no-testify'` exit 1 | `0 issues.` exit 0 |
| C-4 | GO-TEST-04 grep over exemplars (read-only) | etcd 14 files (e.g. `etcd-io/etcd@7583cc6e7e27:cache/demux_test.go:21-22`), containerd 6 (`containerd/containerd@934434dde54b:integration/release_upgrade_exit_status_linux_test.go:30-31`), cosign 1 | cli/cli 0, trivy 0 |
| C-5 | `golangci-lint run --config usetesting-{default,fleet}.golangci.yml ./usetesting/{red,green}` | default: 2 issues (MkdirTemp, Setenv), `context.Background()` missed; fleet: 3 issues, exit 1 | 0 issues, exit 0 (both configs) |
| C-6 | `go fix -diff ./testingctx/red` | hunk `-ctx, cancel := context.WithCancel(context.Background())` / `+ctx := t.Context()`, exit 1 | — |
| C-7 | `go fix -diff ./loopcopy/{red,green}`; `golangci-lint … copyloopvar` | `-		tt := tt` hunk exit 1; copyloopvar 1 issue exit 1 | exit 0; `0 issues.` exit 0 |
| C-8 | `grep -rln 'go-containerregistry/pkg/registry"' --include='*_test.go'` over exemplars | ggcr 21, cosign 4, ko 2, trivy 1 files | — (census) |
| C-9 | `grep -rn -e 'github.com/golang/mock' --include='*.go' mock/{red,green}` | hit, exit 0 | no output, exit 1 |
| C-10 | `go test [-race] -count=1 -run TestParallel_SharedMutation ./parallelrace` | without `-race`: `ok` exit 0; with: 2× `WARNING: DATA RACE`, exit 1 | `TestParallel_OwnFixture -race`: `ok` exit 0 |
| C-11 | `go test -v ./synctestrun/{red,green}` | `undefined: synctest.Run` build failed, exit 1 | `PASS` 0.001 s, exit 0 |
| C-12 | `go test -c`, then `env PATH=/usr/bin:/bin ./helperproc/{red,green}.test -test.v` | `exec: "ocx": executable file not found in $PATH`, exit 1 | 3/3 subtests PASS (exit codes 0, 64, 79), exit 0 |
| C-13 | GO-TEST-15 grep over `ci/{red,green}/.github/workflows` | line printed, exit 0 | no output, exit 1 |
| C-14 | `coverage_gate.sh` in `fixtures/time-fuzz-coverage/` | `cov_99_9.profile` → `coverage 99.9% < threshold 100.0%` exit 1; empty profile → `0.0%` exit 1; outside the module → exit 2 | `cov_100.profile` → exit 0 |
| C-15 | `go build -cover -o covcli.bin ./cmd/covcli`; run ± `GOCOVERDIR`; `[ -n "$(ls -A dir)" ]` | unset: warning on stderr, run exit 0, check exit 1 | set: `covmeta.*` + `covcounters.*`, check exit 0 |
| C-16 | `go test -run '^$' -bench . -benchtime=100x ./bloop/{red2,red,green}` | `red2` (StopTimer last): `B.Loop called with timer stopped` exit 1 | `red` (Stop…Start inside `b.Loop`) exit 0; `green` (`b.N`) exit 0 |
| C-17 | `go test ./badname/{red,green}` | `Testparse has malformed name` build failed, exit 1 | `ok` exit 0 |

## Applied to the exemplars and the future consumers

**Already satisfied by strict exemplars**

| Exemplar | Rules satisfied |
|---|---|
| `google/go-github@48d0a668cde8` | Is the reference for GO-TEST-02, 06, 08, 11. Evidence: 0 testify and 194 go-cmp files; the `httptest.NewServer` `setup()` at `github/github_test.go:19-33`; `synctest.Test` at `github/github_test.go:3236,3288`; 99.7% `t.Context()`; 3 thelper hits. |
| `goreleaser/goreleaser@ff8de3d6c389` | Is the reference for incumbent testify done right (GO-TEST-03): 4 testifylint findings, `require`-dominant. Also golden files per test under `testdata/TestVersion/` (GO-TEST-13). |
| `cli/cli@9b031151a825` | Has the two-layer CLI testing of GO-TEST-18: `internal/ghcmd` in-process, plus testscript at `acceptance/acceptance_test.go:226-227`. |
| `prometheus/prometheus@270db2915054` (158/0) and `golang/tools@d2d3de9f066e` (76/0) | Satisfy GO-TEST-19 for `b.Loop`. |
| `tailscale/tailscale@6b3a45f14ef6` (49) and `containerd/containerd@934434dde54b` (28) | Satisfy GO-TEST-14 for fuzzing parsers. |

**Violated by prominent exemplars**

| Rule | Exemplar and evidence |
|---|---|
| GO-TEST-07 | `etcd-io/etcd@7583cc6e7e27:cache/demux_test.go:89,200,256,305` has `tt := tt` in a `go 1.27` module (`cache/go.mod:3`); 32 copies repo-wide per [shape](go-audit/exemplar-code-shape.md), 27 by a line-anchored grep that misses commented copies. |
| GO-TEST-04 | `etcd-io/etcd@7583cc6e7e27:cache/demux_test.go:21-22` and `containerd/containerd@934434dde54b:integration/release_upgrade_exit_status_linux_test.go:30-31` import both `go-cmp/cmp` and `testify/require` (**[C-4]**). |
| GO-TEST-03 and GO-TEST-05 | `cli/cli@9b031151a825` carries 1,485 testifylint findings, mostly `require-error`, and 755 thelper findings ([test-style §3](go-testing/test-style.md#3-the-testify-tolerance-clause)). |
| GO-TEST-06 | `caddyserver/caddy@54937914234b` is at 4% `t.Context()` adoption; the rest of its `.Context()` hits are its own method ([shape Patterns](go-audit/exemplar-code-shape.md)). |
| GO-TEST-15 and GO-TEST-20 | Fuzzing runs in CI in 3/32 workflow repos, and benchstat in 0/32 ([gates §3](go-audit/exemplar-quality-gates.md)). The corpus neither fuzzes in CI nor states perf claims with statistics. |

**Compliant by policy, not violations**
- The 136 `b.N` loops in `cockroachdb/pebble@13596f1e1cea`: GO-TEST-19 forbids only mechanical rewrites.
- The 7 `go vet` composites hits in `google/go-cmp@b133f1f1932e:cmp/compare_test.go:553`: deliberate fixtures.

**New commitments for the Go SDK (stdlib-only at runtime)**

| Rule | Commitment |
|---|---|
| GO-TEST-02 | `depguard` `no-testify`. go-cmp is the only test dependency; no testify, no mocks. |
| GO-TEST-12 | The `TestMain` helper process plays `ocx` and emits every `ExitCode` in the contract, including the `TEMP_FAIL` retry path (`ocx-sdk-python` `_types.py:289`). One subtest per code; leak check under `GODEBUG=execwait=2`. |
| GO-TEST-11 | Tests the retry and backoff path inside `synctest.Test`. |
| GO-TEST-14 | `FuzzDecodeEnvelope`, seeded with the envelope samples from the Python SDK's `_results.py` shape. |
| GO-TEST-16 | 100% statement coverage through `coverage_gate.sh cover.out 100`, run from the module root, in the three-OS matrix. |

**New commitments for Go CLIs**

| Rule | Commitment |
|---|---|
| GO-TEST-18 | Two-layer tests: `run()` in-process plus `testscript`. |
| GO-TEST-17 | Integration coverage through `GOCOVERDIR` with the non-empty check, no numeric gate. |
| GO-TEST-08 | Registry clients tested against `registry.New()` under `httptest` (test-only dependency). |
| GO-TEST-13 | Golden files for `--help`, JSON output and error envelopes. |
| GO-TEST-09 | Parallel tests proven under `-race` in the PR lane. |
| GO-TEST-15 | CI fuzzing, where present, bounded. |

## AI-agent failure modes

Ranked by how often they bite (training-data frequency × corpus evidence):

1. **Reaching for `assert.Equal` / `require.Equal` in a repository that does not use testify.**
   - Why: tutorials over-represent testify.
   - Check: the `depguard` `no-testify` rule (GO-TEST-02, **[C-3]**).
2. **`context.Background()`, `os.MkdirTemp` + `defer os.RemoveAll`, `os.Setenv` + `defer` in new tests.**
   - Check: `usetesting` with `context-background`/`context-todo: true`, plus `go fix -diff` (GO-TEST-06, **[C-5]**, **[C-6]**).
   - "Enabled usetesting" alone misses `context.Background()`.
3. **`tt := tt` in go ≥ 1.22 table tests.**
   - Check: `go fix -diff ./...` (`forvar`) or `copyloopvar` (GO-TEST-07, **[C-7]**).
   - Not a line-anchored grep, which misses a copy with a trailing comment.
4. **`time.Sleep` polling in concurrency tests, or `synctest.Run` copied from 1.24-era samples.**
   - Check: the compiler for `Run` (**[C-11]**); a reading heuristic for sleeps (GO-TEST-11).
5. **Believing `go test` passing means vet passes.** `t.Fatal` in goroutines survives `go test`.
   - Check: an explicit `go vet ./...` (GO-TEST-01, **[C-1]**).
   - `FailNow` in `wg.Go`/`errgroup.Go` closures passes every tool. Reviewers read every `Go(func` body in `_test.go` (**[C-2]**).
6. **"Fixing" a nil-vs-empty mismatch by changing production code, or wrapping a go-cmp panic in `recover`.**
   - Check: run the test; add `cmpopts.EquateEmpty` / `IgnoreUnexported` (GO-TEST-10).
7. **Enabling `paralleltest` / `tparallel`, or sprinkling `t.Parallel()`, to "fix" test concurrency.**
   - Check: `go test -race` (GO-TEST-09, **[C-10]**). Racy tests pass plain `go test`.
8. **Inventing `go test -cover -fail-under=100`.**
   - Check: `go help testflag | grep -i fail-under` is empty; use the gate script (GO-TEST-16, **[C-14]**).
9. **SDK tests that exec the real `ocx`.** Green on the author's machine, red in CI.
   - Check: the GO-TEST-12 grep, or running the test binary with a stripped `PATH` (**[C-12]**).
10. **`github.com/golang/mock` imports or hand-mocked `http.Client` interfaces.**
    - Check: grep / `depguard` (GO-TEST-08, **[C-9]**).
11. **Mechanically rewriting `b.N` benchmarks to `b.Loop()`, or claiming "X% faster" from one run.**
    - Check: the timer-control grep plus benchstat (GO-TEST-19/20, **[C-16]**).
12. **`-fuzz` without `-fuzztime` in a workflow.**
    - Check: the GO-TEST-15 grep (**[C-13]**).
13. **Integration-coverage harness without `GOCOVERDIR`.** It reads green at 0%.
    - Check: the non-empty-directory check (GO-TEST-17, **[C-15]**).

## Open questions

**Owner decisions (the program applies the default)**
1. **CI fuzz budget.** Default:
   - Seeds replay on every PR through plain `go test`.
   - A scheduled job runs each `FuzzXxx` with `-fuzztime=60s`.
   - No PR-lane generative fuzzing.
   - No go.dev guidance names a duration ([time-fuzz-coverage Contested](go-testing/time-fuzz-coverage.md#contested--evolving)).
2. **`usetesting` on in the fleet config** with `context-background` and `context-todo` set to `true`. Default: yes. Upstream's reason for shipping them off was not found. The planted run shows no false positive, but the gates dive's ≤ 1 FP/10k LOC bar was not measured on 5 exemplars for these two settings.

**Subareas that deserve another research round**
3. **`language/stdlib-semantics` × golden files.** Does default-on json/v2 in 1.27 change `encoding/json` bytes (spacing, escaping, `omitzero`) enough to churn golden files and the SDK envelope fixtures on a 1.26 → 1.27 bump? Plant one golden test under `GOEXPERIMENT=nojsonv2` and the default.
4. **`concurrency/goroutine-ownership` × tests.**
   - Is there any analyzer (gopls, staticcheck 2026.2, a nogo pass) that catches `FailNow` inside `WaitGroup.Go`/`errgroup.Go` closures? If none, is a tiny custom analyzer worth shipping?
   - Separately: `go.uber.org/goleak` (3/34 repos) vs the 1.27 `goroutineleak` profile as the in-test leak check. Neither dive covered leak detection in tests.
5. **`testing/coverage-scope`.** For the SDK's 100% gate, what does `go test -coverprofile ./...` count on 1.27? Open points:
   - packages without test files, which are reported since 1.22;
   - `-coverpkg=./...` vs the default;
   - whether `TestMain`'s helper-process branch or `internal/` packages need exclusions.

   Plant a two-package SDK skeleton and record the `total:` line under each flag set before the gate script is authored.
6. **`testing/windows`.** Under owner Q6 (first-class Windows):
   - `t.TempDir` cleanup failures from open handles;
   - the helper-process pattern's `os.Executable()` on Windows;
   - `testscript` path quoting.

   None was run on a Windows leg.

## Sub-artifacts

- [go-testing/test-style.md](go-testing/test-style.md) — assertion style, the testify tolerance clause, go-cmp options, table tests, `t.Helper`, goroutine safety, `t.Parallel` races, golden files, CLI end-to-end (`run()` vs testscript), real transports vs mocks; 7 planted runs and the testifylint/thelper/paralleltest noise table.
- [go-testing/time-fuzz-coverage.md](go-testing/time-fuzz-coverage.md) — `t.Context`/`TempDir`/`Setenv`/`Chdir`, `testing/synctest`, fuzzing and seed corpora, `go build -cover` + `GOCOVERDIR` + `covdata`, the 100% gate script, `b.Loop` vs `b.N` with benchstat, `usetesting` settings; 7 planted runs.

## Conflicts resolved

| # | Conflict | Resolution and reason |
|---|---|---|
| C1 | test-style (AI-agent angle) says `go vet ./...` is "free, already part of `go test`" for `testinggoroutine`. | **False.** `testinggoroutine` is commented out of `defaultVetFlags` (`go1.27.1:src/cmd/go/internal/test/test.go:684`); **[C-1]** shows `go test` exit 0 and `go vet` exit 1 on one file. GO-TEST-01 depends on the explicit vet step. |
| C2 | test-style §6 (quoting the testifylint README) says `go-require` catches `require` inside `wg.Go` closures that vet misses. | **Not in testifylint v1.6.4 / golangci-lint 2.14.0.** **[C-2]** shows `go-require` flags a `go func` statement but not `wg.Go`, and vet flags neither. That case is a reading heuristic. |
| C3 | test-style §5 says `go fix`/modernize has no fixer for `tt := tt`; the shape audit and [map] M3 (`forvar`) say otherwise. | **Tool run wins.** `go fix -diff` (`forvar`) and `copyloopvar` both flag it (**[C-7]**), and the dive's line-anchored grep misses a commented copy. GO-TEST-07 cites the tools. |
| C4 | time-fuzz-coverage §7 says `usetesting`'s `os-setenv` defaults to `false`. | **Defaults to `true` in golangci-lint 2.14.0** (`golangci/golangci-lint@032d962e0399:.golangci.reference.yml:4230-4232`; **[C-5]** flags `os.Setenv` under the default config). Only `context-background`, `context-todo` and `os-temp-dir` ship `false`. The fleet config switches on the two context settings. |
| C5 | test-style §3 says no exemplar package mixes testify and go-cmp, and the split is purely by repository. The shape audit counts both in etcd (276/35) and containerd (247/10). | **Measured per file (**[C-4]**):** 14 etcd files, 6 containerd, 1 cosign import both. GO-TEST-04 stands as a fleet choice at SHOULD, with the corpus listed as violating, not as support. |
| C6 | time-fuzz-coverage says any `StopTimer`/`StartTimer` in the body breaks `b.Loop`. | **Narrower on 1.27.1:** only calling `b.Loop()` with the timer stopped fails (`benchmark.go:417`); a `Stop…Start` pair inside the body passes (**[C-16]**). The grep stays as a trigger for manual review, not a ban. |
| C7 | time-fuzz-coverage says an empty profile makes the gate exit 2. | **Empty profile → `total: 0.0%` → exit 1**; exit 2 comes from running outside the module root (**[C-14]**). Both fail closed, and GO-TEST-16 adds "run from the module root". |
| C8 | test-style proposed MUST for `EquateEmpty`/`IgnoreUnexported`. | **Demoted to SHOULD** (GO-TEST-10). The panic self-reports on the first run, and nil-vs-empty intent can only be read, not checked. |
| C9 | The shifts scout's "testify-v1 pragmatic default" vs the normative sources. | **Map conflict 1 binds.** This consolidation adds only the enforcement (`depguard`) and the tolerance mechanism (`testifylint`). |
| C10 | M-E-05 asked whether `paralleltest`/`tparallel` are signal. | **Noise** (2,357–2,557 hits on clean repos, test-style §3; 265/1,012/108 in the strict run, [gates §5](go-audit/exemplar-quality-gates.md)). Races are proven by `-race` (**[C-10]**). |

## Key sources

- [go.dev/wiki/TestComments](https://go.dev/wiki/TestComments) — no assert libraries, `(-want +got)`, `t.Helper`, table tests, subtest names.
- [Google Go Style — Decisions §Assertion libraries](https://google.github.io/styleguide/go/decisions#assertion-libraries).
- [Google Go Style — Best Practices §Tests](https://google.github.io/styleguide/go/best-practices#tests) — test vs assertion helpers, `Fatal` only on the test goroutine, real transports.
- [pkg.go.dev/github.com/google/go-cmp/cmp/cmpopts](https://pkg.go.dev/github.com/google/go-cmp/cmp/cmpopts) — `EquateEmpty`, `IgnoreUnexported`, `EquateErrors`.
- [pkg.go.dev/testing](https://pkg.go.dev/testing) — `T.Context`/`T.Chdir`/`B.Loop` (1.24), `Setenv`/`Chdir` parallel restriction.
- [pkg.go.dev/testing/synctest](https://pkg.go.dev/testing/synctest) and [go.dev/blog/synctest](https://go.dev/blog/synctest) — bubbles, durable blocking, `Sleep` (1.27).
- [golang/go#73567](https://github.com/golang/go/issues/73567) — `synctest.Run` → `Test`; `Run` removed in 1.26.
- [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz) — `FuzzXxx` requirements, corpus format, `-fuzztime`.
- [go.dev/doc/build-cover](https://go.dev/doc/build-cover) — `go build -cover`, `GOCOVERDIR`, `go tool covdata`.
- [golang/go#74967](https://github.com/golang/go/issues/74967) — `bloop` modernizer withdrawn; `b.Loop` timer and skew failure modes.
- [pkg.go.dev/golang.org/x/perf/cmd/benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat) — `-count`, confidence intervals, p-values.
- [github.com/Antonboom/testifylint](https://github.com/Antonboom/testifylint) — `require-error`, `go-require`, suite checkers.
- [github.com/ldez/usetesting](https://github.com/ldez/usetesting) — the old-idiom → `testing` method mappings and settings.
- [pkg.go.dev/github.com/rogpeppe/go-internal/testscript](https://pkg.go.dev/github.com/rogpeppe/go-internal/testscript) — `.txtar` CLI scripts, `RunMain`.
- [github.com/uber-go/mock](https://github.com/uber-go/mock) — the maintained `gomock` fork; `golang/mock` archived 2024-01-08.

## Revision log

- 2026-09-26 (authoring): GO-TEST-12 no longer claims `GODEBUG=execwait=2` checks leak-freedom; it is blind to `exec.CommandContext` (N-17).

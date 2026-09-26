---
title: "Go test style: assertions, table tests, helpers, golden files, real transports"
topic: GO-TEST (M-E-01..05, M-E-08, M-E-15, M-E-16)
agent: dive-test-style
model: sonnet
date_researched: 2026-09-26
sources_count: 19
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/test-style/
scope: |
  Covers the default assertion style for new Go tests, the conditions under
  which an incumbent testify suite is tolerated, table-test shape, helper
  discipline (t.Helper, goroutine safety), golden-file convention, and how a
  CLI is tested end to end (in-process run() vs testscript vs built binary).
  Does not cover fuzzing (M-E-09), coverage gating (M-E-10), -race CI lanes
  (M-E-11), Example functions (M-E-12, owned by docs-instrument), benchmarks
  (M-E-13), package-naming (M-E-14), or subprocess-wrapper testing (M-E-18) —
  those are separate rows/dives.
---

## Table of contents

1. [Findings](#findings)
   1. [Assertion style: the map's resolution, sharpened](#1-assertion-style-the-maps-resolution-sharpened)
   2. [testify's own footguns, evidenced](#2-testifys-own-footguns-evidenced)
   3. [The testify-tolerance clause](#3-the-testify-tolerance-clause)
   4. [cmp.Diff correctness: EquateEmpty and IgnoreUnexported](#4-cmpdiff-correctness-equateempty-and-ignoreunexported)
   5. [Table-test shape](#5-table-test-shape)
   6. [Helpers: t.Helper() and goroutine safety](#6-helpers-thelper-and-goroutine-safety)
   7. [t.Parallel and shared fixtures](#7-tparallel-and-shared-fixtures)
   8. [Golden files](#8-golden-files)
   9. [CLI end-to-end testing](#9-cli-end-to-end-testing)
   10. [Real transports vs mocks](#10-real-transports-vs-mocks)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- New fleet Go tests default to `if got != want { t.Errorf(...) }` for scalars and `cmp.Diff` (`(-want +got)` convention) for structured values — never a `stretchr/testify` assertion in new code ([go.dev/wiki/TestComments §Assert Libraries](https://go.dev/wiki/TestComments#assert-libraries), [decisions#assertion-libraries](https://google.github.io/styleguide/go/decisions#assertion-libraries)).
- testify is tolerated only in a repository that already standardized on it; the tolerance clause is: `require` for anything that must stop the test, `testifylint` enabled in CI, and never `testify` mixed with `go-cmp` inside one package (map conflict 1).
- `assert.Equal(t, []string{}, got)` fails when `got` is `nil` because testify's `ObjectsAreEqual` runs `reflect.DeepEqual`, which treats a nil slice and an empty slice as unequal — confirmed on a planted fixture; `cmp.Diff` has the identical defect until `cmpopts.EquateEmpty()` is added.
- `cmp.Diff` **panics** — it does not fail — on a struct with an unexported field, with the message `cannot handle unexported field at {pkg.Type}.field: consider using cmpopts.EquateComparable...`; the fix is `cmpopts.IgnoreUnexported(Type{})` or an `Equal` method, never a struct copy that zeroes the field.
- `t.Helper()` must be the first statement of a helper: called anywhere else, lines before it still attribute to the helper, not the caller — this is a `thelper` (`t_begin`) violation, not just style.
- `t.FailNow`/`t.Fatal`/`t.Skip{,f,Now}` from any goroutine but the one running the test is a real bug (`runtime.GoExit` in the wrong goroutine), caught by `go vet`'s `testinggoroutine` analyzer and, more thoroughly for testify code, by `testifylint`'s `go-require` checker.
- Table tests use `t.Run(tt.name, func(t *testing.T) { ... })` with human-readable subtest names; the `tc := tc` / `tt := tt` loop-variable-copy idiom is dead code in a `go >= 1.22` module and a signal the author is copying pre-1.22 muscle memory, not fixing a real bug (142 corpus-wide hits, still present in etcd, containerd in 2026).
- `t.Parallel()` subtests that mutate a package-level or closed-over variable without synchronization race under `go test -race`; the fix is per-subtest fixture state, not a mutex around shared state that only exists because two subtests happen to share a package variable.
- `paralleltest` and `tparallel` are noise linters for a small suite — measured 2,357–2,557 hits on two real, well-maintained repos (goreleaser, cli/cli) and were never adopted in any of the 23 golangci-lint configs surveyed; do not enable them by default.
- `testifylint` is a precise linter, not a noise linter, on a testify-heavy repo: 1,485 real findings on `cli/cli` (dominated by `require-error` — using `assert` where a failed check should stop the test) versus 4 on `goreleaser` (already require-disciplined); enable it wherever testify is tolerated.
- `thelper` is precise everywhere measured: 755 findings on `cli/cli`'s helper-dense test suite, 3 on `google/go-github`'s already-disciplined one — always safe to enable.
- Golden files follow a repo-owned `-update` flag (`flag.Bool("update", false, ...)`) reading/writing under `testdata/`; only 6 of 34 full-source exemplars use this convention even though 561 golden files exist across 5 repos — most golden files are regenerated by ad-hoc scripts, which the fleet should not imitate.
- A golden test must be deterministic: running it twice without `-update` must produce byte-identical results — confirmed by running the planted golden fixture twice.
- A Go CLI's core logic lives in a testable `run(args []string, stdout, stderr io.Writer) int` called from a two-line `main`; this in-process shape is fast, works under `-race`/`-cover`, and needs no exec.
- `github.com/rogpeppe/go-internal/testscript` (or a fork, e.g. `cli/go-internal`) drives the same command through real argv/stdout/stderr/exit-status via `.txtar` scripts and `testscript.RunMain` in `TestMain`, for multi-step CLI scenarios (env vars, files, chained invocations) an in-process call struggles to express; the two are complementary, not competing, styles — `cli/cli` ships both.
- Real transports (`net/http/httptest.NewServer`) are the default for anything that talks HTTP; `httptest` appears in 23/34 full-source exemplars, more than testify (17) or go-cmp (19) — it is the single most broadly adopted test-only import in the corpus.
- Mock only at a seam a real transport cannot reach (a non-HTTP interface boundary); if a generated mock is unavoidable, `go.uber.org/mock` (the Uber fork) is the only acceptable import — `github.com/golang/mock` is archived (2024-01-08) and has zero users left in the 34-repo corpus.
- `t.Context()` (Go 1.24) is the base context in test setup for any module whose `go` line is ≥1.24; adoption is corpus-wide and clean (7,448 real call sites, 99.7% in `google/go-github`), including as a wrapped base (`goreleaser`'s own `testctx.WrapWithCfg(t.Context(), ...)`).
- `testing/synctest.Test(t, f)` (GA in Go 1.25; the old `synctest.Run` form was removed in 1.26) is confirmed live in an exemplar outside the shifts scout's own survey: `google/go-github@48d0a668cde8:github/github_test.go:3236,3288`.

## Findings

### 1. Assertion style: the map's resolution, sharpened

The topic map already resolved the direction (conflict 1): **stdlib `testing` + `go-cmp` is the default for new fleet tests; testify is a tolerated incumbent, never introduced.** This dive does not re-argue that; it pins the exact idiom and shows the failure-message evidence the map's resolution rested on.

The two normative sources both give the same worked example. Go Test Comments' "Assert Libraries" section:

> "Avoid the use of 'assert' libraries to help your tests." … "Go has good support for printing structures, so a better way to write this code is" a direct `if`-based check. "Assert libraries make it too easy to write imprecise tests and inevitably end up duplicating features already in the language."
([go.dev/wiki/TestComments](https://go.dev/wiki/TestComments))

Google's Style Decisions, "Assertion libraries":

> "Do not create 'assertion libraries' as helpers for testing." … the good-example rewrite uses `cmp.Equal`.
([google.github.io/styleguide/go/decisions](https://google.github.io/styleguide/go/decisions))

Best Practices draws the sharper distinction between two kinds of helper:

> "Go distinguishes between 'test helpers' and 'assertion helpers': Test helpers are functions that do setup or cleanup tasks... Assertion helpers are functions that check the correctness of a system and fail the test if an expectation is not met. Assertion helpers are not considered idiomatic in Go."
([google.github.io/styleguide/go/best-practices](https://google.github.io/styleguide/go/best-practices))

Idiomatic shape for new code:

```go
// Correct — scalar comparison, standard failure format.
if got, want := Sum(2, 3), 5; got != want {
    t.Errorf("Sum(2, 3) = %v, want %v", got, want)
}

// Correct — structured comparison.
if diff := cmp.Diff(want, got); diff != "" {
    t.Errorf("Decode() mismatch (-want +got):\n%s", diff)
}
```

```go
// Wrong for new code — an assertion library.
assert.Equal(t, 5, Sum(2, 3))
```

The failure-message-quality argument the map's conflict-1 resolution rests on: Test Comments' own "Print Diffs" section says to use `cmp.Diff` and the `-want +got` convention specifically *because* it matches `cmp`'s own diff markers — an argument from message quality, not taste.

### 2. testify's own footguns, evidenced

The nil-vs-empty-slice defect is real and testify's maintainers have declined to fix it. [stretchr/testify#1141](https://github.com/stretchr/testify/issues/1141) ("Nil slice and empty slices fail in `.Equal()`") was closed as not planned: `assert.Equal` compares via `ObjectsAreEqual` → `reflect.DeepEqual`, which treats `[]string(nil)` and `[]string{}` as unequal, contrary to what every `range`-based caller of the code under test actually observes. This is the same distinction [boldlygo.tech, April 2026](https://boldlygo.tech/posts/2026-04-20-testify-is-making-your-go-tests-worse/) names as its lead complaint, alongside 30+ overlapping equality assertions (`Equal`, `EqualValues`, `Exactly`, `Same`, …) with inconsistent argument order (`EqualError(actual, expected)` vs `Equal(expected, actual)`).

Confirmed on the planted fixture (`fixtures/test-style/nilempty`): `assert.Equal(t, []string{}, got)` against a `nil` result fails with

```
Not equal:
 expected: []string{}
 actual  : []string(nil)
```

— and the identical comparison via bare `cmp.Diff(want, got)` **fails the same way** (nil is not equal to empty by default in either library); only `cmp.Diff(want, got, cmpopts.EquateEmpty())` treats them as equal. This is the corrected version of the boldlygo claim: the defect is not testify-specific, it is "neither library treats nil and empty as equal without being told to" — `go-cmp` just makes the "told to" step a documented, one-line option (see [§4](#4-cmpdiff-correctness-equateempty-and-ignoreunexported)).

testify's own README documents the split its style forces on a caller: `assert` returns a `bool` and lets the test continue; `require` "terminate[s] current test" and warns "these functions must be called from the goroutine running the test or benchmark function, not from other goroutines created during the test. Otherwise race conditions may occur." ([stretchr/testify README](https://github.com/stretchr/testify)) — the same constraint `go vet`'s `testinggoroutine` analyzer enforces mechanically (see [§6](#6-helpers-thelper-and-goroutine-safety)).

testify is "being maintained at v1, no breaking changes will be accepted" (README banner, [discussion #1560](https://github.com/stretchr/testify/discussions/1560)) — the API warts (argument order, 30+ overlapping assertions) are permanent, not pending a v2 fix. `testifylint`'s own README frames the ambiguity plainly: "it has a terrible ambiguous API in places, and the purpose of this linter is to protect you from annoying mistakes" ([Antonboom/testifylint README](https://github.com/Antonboom/testifylint)).

### 3. The testify-tolerance clause

The map already fixed the *direction*; this section fixes the *mechanism* an authored rule can check.

**Require over assert, mechanically.** `testifylint`'s `require-error` checker fires on exactly the pattern the map's tolerance clause names: `assert.Error`, `assert.NoError`, `assert.ErrorIs`, `assert.ErrorAs`, `assert.EqualError`, `assert.ErrorContains` all get rewritten to their `require.*` form, "because such 'ignoring' of errors leads to further panics, making the test harder to debug" ([testifylint README §require-error](https://github.com/Antonboom/testifylint#require-error)). Measured on `cli/cli@9b031151a825` ([§3 verification runs](#verification-runs)): `require-error` is the single largest testifylint category, out of 1,485 total findings.

**testifylint enabled, measured as signal not noise.** Ran `golangci-lint` with only `testifylint`, `thelper`, `paralleltest`, `tparallel` enabled against the three named repos:

| repo | testifylint | thelper | paralleltest | tparallel |
|---|---|---|---|---|
| `goreleaser/goreleaser@ff8de3d6c389` | 4 | 0 | 2,357 | 0 |
| `cli/cli@9b031151a825` | 1,485 | 755 | 2,557 | 5 |
| `google/go-github@48d0a668cde8` | 0 (no testify import) | 3 | 0 | 0 |

`testifylint` and `thelper` behave exactly like a "MUST-rule linter should" per [gates §5](../go-audit/exemplar-quality-gates.md#5-real-toolchain-runs): they fire heavily where the underlying pattern is genuinely present (`cli/cli`, which mixes `assert`/`require` at a near-1:1 ratio — see [§10 exemplar evidence](#exemplar-evidence)) and near-zero where the codebase is already disciplined (`goreleaser`, which is 97% `require` already: 6,563 `require.` calls vs 173 `assert.` calls in its test files). `paralleltest`/`tparallel` fire in the thousands regardless of code quality — confirming [gates](../go-audit/exemplar-quality-gates.md)'s classification of `paralleltest` as noise, extended here with a second data point (`tparallel`).

**Never mixed with go-cmp in one package.** No exemplar package was found mixing `testify/assert` and `cmp.Diff` assertions on the same value in the same `_test.go` file; the split in the corpus is by *repository* (`cli/cli` is assert/require, `google/go-github` is 100% cmp — see [§10](#exemplar-evidence)), never by file. This is a reading heuristic, not a run linter finds directly; a `depguard` rule scoped per-package can enforce it (see [Normative guidance](#normative-guidance-candidates) N7).

**suite discipline, if a suite is inherited.** `testify/suite` does not support parallel tests (`v1` "doesn't support suite's parallel tests and subtests" — [testifylint README §suite-broken-parallel](https://github.com/Antonboom/testifylint#suite-broken-parallel), corroborated by the testify README's own warning banner on the `suite` package, [#934](https://github.com/stretchr/testify/issues/934)); `s.T().Parallel()` inside a suite method causes a data race, panic, silently-ignored hook, or non-working setup depending on where it's called. testifylint's `suite-broken-parallel`, `suite-dont-use-pkg`, and `suite-subtest-run` checkers are all default-enabled and autofixable for the first two — if the fleet ever inherits a `testify/suite`-based repo, enabling `testifylint` with its defaults is the whole tolerance mechanism, not a bespoke review checklist.

### 4. cmp.Diff correctness: EquateEmpty and IgnoreUnexported

`cmp.Diff`/`cmp.Equal` panic, rather than silently comparing wrong, when they hit a struct with an unexported field and no option tells them how to handle it. Confirmed on the planted fixture (`fixtures/test-style/cmpunexported`):

```
panic: cannot handle unexported field at {cmpunexported.Point}.tag:
        "cmpunexported".Point
    consider using cmpopts.EquateComparable to compare comparable Go types
```

The fix is `cmpopts.IgnoreUnexported(Point{})` (ignore the field) or an `Equal` method on the type (compare it your way) — never reflection tricks or copying the struct with the field zeroed out, both of which defeat the panic's purpose (catching an accidental omission).

`cmpopts` (module `github.com/google/go-cmp`, `v0.7.0` current) exports, among others ([pkg.go.dev/github.com/google/go-cmp/cmp/cmpopts](https://pkg.go.dev/github.com/google/go-cmp/cmp/cmpopts)):

| function | what it does |
|---|---|
| `EquateEmpty() cmp.Option` | "Determines all maps and slices with a length of zero to be equal, regardless of whether they are nil." |
| `IgnoreUnexported(typs ...interface{}) cmp.Option` | "Only ignores the immediate unexported fields of a struct" |
| `IgnoreFields(typ interface{}, names ...string) cmp.Option` | ignore named fields on one struct type |
| `EquateErrors() cmp.Option` | "Determines errors to be equal if `errors.Is` reports them to match" |
| `EquateApprox(fraction, margin float64) cmp.Option` | float tolerance comparison |
| `SortSlices(lessOrCompareFunc interface{}) cmp.Option` | order-independent slice comparison |

`13/34` full-source exemplars import `cmp/cmpopts` ([gates §4](../go-audit/exemplar-quality-gates.md#4-test-library-census)) — its use is not universal even among `go-cmp` adopters, which means "bare `cmp.Diff` on a struct" is common enough in the wild that the panic message above is a realistic first encounter, not a hypothetical.

### 5. Table-test shape

Test Comments distinguishes when to use one:

> "Table-driven tests should be used whenever many different test cases can be tested using similar testing logic." … "When some test cases need to be checked using different logic from other test cases, it is more appropriate to write multiple test functions."
([go.dev/wiki/TestComments](https://go.dev/wiki/TestComments))

and on naming subtests:

> "choose subtest names that will remain useful and readable after escaping. (The test runner replaces spaces with underscores, and it escapes non-printing characters.)"

Idiomatic shape, `go >= 1.22`:

```go
func TestParse(t *testing.T) {
    tests := []struct {
        name string
        in   string
        want int
        errs bool
    }{
        {name: "valid", in: "42", want: 42},
        {name: "empty", in: "", errs: true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Parse(tt.in)
            if tt.errs {
                if err == nil {
                    t.Fatalf("Parse(%q) = _, <nil>, want error", tt.in)
                }
                return
            }
            if err != nil {
                t.Fatalf("Parse(%q) = _, %v, want no error", tt.in, err)
            }
            if got != tt.want {
                t.Errorf("Parse(%q) = %v, want %v", tt.in, got, tt.want)
            }
        })
    }
}
```

The `tc := tc` / `tt := tt` loop-variable-copy idiom, needed pre-1.22 to avoid every closure capturing the same loop variable, is dead in a `go >= 1.22` module ([Fixing For Loops in Go 1.22](https://go.dev/blog/loopvar-preview)) — yet [shape](../go-audit/exemplar-code-shape.md) §0/§1 measured **142 corpus-wide hits, 100% true-positive on a 6-hit spot check**, with `etcd-io/etcd` alone at 32 (e.g. `etcd-io__etcd@7583cc6e7e27:cache/demux_test.go:89,200,256`). Its presence in a `go >= 1.22` module is a training-data tell, not a defensive habit worth keeping — Go's `go fix`/`modernize` tooling has no dedicated fixer for it (the loop-var-copy itself is harmless dead code, unlike the bugs it used to guard against), so it survives CI indefinitely unless a reviewer or a `go vet`-adjacent grep catches it.

Best Practices adds one more shape rule the map did not need to resolve because it is uncontested: "prefer to specify field names when initializing test case" structs — i.e. `{name: "valid", in: "42", want: 42}`, never positional table-row literals, so a reordered or added field doesn't silently misassign values.

### 6. Helpers: t.Helper() and goroutine safety

**t.Helper() placement.** `thelper`'s own README states the mechanism plainly:

> "Because `t.Helper()` only affects asserts that are called *after* the `t.Helper()` call, so requiring it to be the first statement helps ensure all assertions in the helper function are affected."
([kulti/thelper README](https://github.com/kulti/thelper))

Confirmed on the planted fixture (`fixtures/test-style/helper`): a helper missing `t.Helper()` reports the failing line as *inside the helper* (`violation_test.go:11`); the fixed twin, identical except for one added `t.Helper()` line, reports the failing line as the *call site* (`fix_test.go:14`) — the caller's own `TestDouble_WithHelper` line. `golangci-lint` with only `thelper` enabled flags the first file and is silent on the second.

Test Comments' caveat matters for review, not just authoring: "`t.Helper` should not be used to implement assert libraries" and "should not be used when it obscures the connection between a test failure and the conditions that led to it" — `t.Helper()` is for setup/teardown helpers, not a license to build a private assertion library and hide it behind a clean stack trace.

**Goroutine safety.** `go vet`'s `testinggoroutine` analyzer:

> "report calls to `(*testing.T).Fatal` from goroutines started by a test … Functions that abruptly terminate a test, such as the `Fatal`, `Fatalf`, `FailNow`, and `Skip{,f,Now}` methods of `*testing.T`, must be called from the test goroutine itself."
([golang/tools testinggoroutine doc.go](https://github.com/golang/tools/blob/master/go/analysis/passes/testinggoroutine/doc.go))

Confirmed on the planted fixture (`fixtures/test-style/testinggoroutine`): `go vet ./...` reports `violation_test.go:15:4: call to (*testing.T).Fatal from a non-test goroutine` (exit 1) on a `go func() { ... t.Fatal(...) }()`; the fixed twin, which reports failure over a channel back to the test goroutine, is vet-clean (exit 0). Best Practices states the same rule normatively: "It is incorrect to call `t.FailNow`, `t.Fatal`, etc. from any goroutine but the one running the Test function."

For testify code specifically, `testifylint`'s `go-require` checker is described as "a radically improved analogue of `go vet`'s `testinggoroutine` check" — it additionally catches `require.NoError` inside a `wg.Go(func(){...})` closure (Go 1.25's `sync.WaitGroup.Go`) and inside an HTTP handler goroutine, neither of which `go vet` sees, and explicitly rejects the tempting "just swap require for assert inside the goroutine" non-fix: "this will only mask the problem" ([testifylint README §go-require](https://github.com/Antonboom/testifylint#go-require)).

### 7. t.Parallel and shared fixtures

Confirmed on the planted fixture (`fixtures/test-style/parallelrace`): two `t.Parallel()` subtests, each spawning internal work that mutates a shared package-level counter with no synchronization, produce a genuine `go test -race` failure (`WARNING: DATA RACE`, exit 1) reliably across repeated `-count=1` runs once the race window is wide enough (a single unsynchronized `x++` can pass by luck on a fast scheduler — 200,000-iteration loops per subtest made the race detector's report deterministic across 3/3 runs in this environment). The fixed twin — identical `t.Run`/`t.Parallel()` shape, but each subtest owns its own local counter instead of touching shared state — passes `-race` cleanly across 3/3 runs.

[failure §3](../go-topic-map/failure.md) independently found 139 parallel-test-shaped races in the corpus's own failure literature survey — this fixture reproduces the mechanism directly rather than citing the count.

`paralleltest`/`tparallel` do not distinguish "a subtest that should be parallel and mutates nothing" from "a subtest that mutates shared state" — they only check whether `t.Parallel()` was *called*, which is why they are noise (see [§3](#3-the-testify-tolerance-clause) table: 2,357–2,557 hits on two clean, mature repos). The actionable check for this row is not a linter but a reading heuristic: any `t.Parallel()` subtest that reads or writes a variable declared outside its own closure — package-level, or captured from the enclosing table-test loop before the fix in [§5](#5-table-test-shape) — is a candidate; `go test -race` is the mechanical confirmation.

### 8. Golden files

Confirmed on the planted fixture (`fixtures/test-style/golden`): a golden test reading `testdata/hello.golden` fails with a clear "file not found" message when the golden file doesn't exist; running with `-update` (a repo-defined `flag.Bool("update", false, "update .golden files")`) creates it and passes; running twice more without `-update` passes identically both times, confirming determinism (`Render()` produces the exact same bytes on every call, so the golden comparison is stable, not flaky).

[gates §4](../go-audit/exemplar-quality-gates.md#4-test-library-census) measured **561 `.golden` files across 5 repos** (`goreleaser/goreleaser` 241, `dominikh/go-tools` 78, `aquasecurity/trivy` 122), but **only 6 repos carry a `-update`-style flag pattern** — meaning most golden files in the wild are regenerated by ad-hoc scripts, not the `go test -update` convention this dive's fixture demonstrates and recommends. `goreleaser/goreleaser@ff8de3d6c389:testdata/TestVersion/*.golden` is a real example of the file-per-testcase-under-`testdata/` layout.

The convention this dive pins for new fleet code: one `-update` bool flag per test binary (not per test), golden files under `testdata/<TestName>/` or `testdata/` flat with a name derived from the subtest, and — because the fixture confirmed it — no non-determinism tolerated in what's compared (timestamps, map-iteration order, or anything else that isn't stable must be normalized or excluded from the golden comparison, not "mostly matches").

### 9. CLI end-to-end testing

Two complementary shapes, both real in the corpus, confirmed on planted twins (`fixtures/test-style/clitest`):

**In-process `run(args, stdout, stderr) int`.** `main` is reduced to `os.Exit(run(os.Args, os.Stdout, os.Stderr))`; every test calls `run` directly with `bytes.Buffer`s and asserts on the returned exit code and buffer contents. No `exec`, no `PATH` lookup, runs inside the same test binary — fast, and works under `-race`/`-cover` for free. This is Mat Ryer's long-standing pattern ("How I write HTTP services in Go", generalized here to CLIs — [prac §5](../go-topic-map/practitioner.md)) and is exactly the shape `cli/cli`'s own `internal/ghcmd` package uses: `ghcmd.Main() int` is called from a two-line `cmd/gh/main.go`, and the package's own tests exercise it the same way (`cli__cli@9b031151a825:internal/ghcmd/cmd.go`).

**`testscript` for the same command.** `github.com/rogpeppe/go-internal/testscript` (imported directly, or through a fork — `cli/cli` uses its own fork, `github.com/cli/go-internal/testscript`) drives `.txtar` scripts through `testscript.Run(t, testscript.Params{Dir: "testdata/script"})`, with `TestMain` registering the command's entry point via `testscript.RunMain(m, map[string]func() int{"greet": func() int { return run(os.Args, os.Stdout, os.Stderr) }})` — the script then does `exec greet Gophers` / `stdout 'Hello, Gophers!'` against the *same test binary*, exercising real argv parsing, real exit-status propagation, and real stdout/stderr separation, none of which the in-process call alone proves. `cli/cli@9b031151a825:acceptance/acceptance_test.go:226-227` uses exactly this `TestMain`+`RunMain` wiring for its full acceptance suite (build-tagged `acceptance`, driven by real fixture repositories).

Confirmed on the planted twin: the `.txtar` script

```
exec greet Gophers
stdout 'Hello, Gophers!'

! exec greet
stderr 'usage: greet NAME'
```

passes against the same `run()` function the in-process test calls directly — both `TestRun_Greet`/`TestRun_MissingArg` (in-process) and `TestScript_Greet` (testscript) pass, exit 0, proving the two styles are testing the same contract from two angles rather than duplicating one another's coverage.

**Which one when:** in-process `run()` is the default for a single command's argument parsing, flag validation, and exit-code logic — it's what most of the table-test shape in [§5](#5-table-test-shape) should target. `testscript` earns its keep for multi-step scenarios a single `run()` call can't express: piped commands, files that must exist between invocations, environment-variable interaction, or verifying the *actual compiled binary's* stdout framing (color codes, TTY detection) that an in-process buffer swap papers over. Both belong beside each other in a CLI's test suite, not as alternatives to choose once.

### 10. Real transports vs mocks

Best Practices' guidance (as read into the map's H-series and confirmed here against the census) is to prefer a real `httptest.Server` over a mocked HTTP client wherever the code under test talks HTTP. `net/http/httptest` exports ([pkg.go.dev/net/http/httptest](https://pkg.go.dev/net/http/httptest)):

- `NewServer(handler http.Handler) *Server` — "Starts and returns a new Server listening on a local network loopback interface." Caller must call `Close()`.
- `NewTLSServer(handler http.Handler) *Server` — same, over TLS.
- `NewUnstartedServer(handler http.Handler) *Server` — configure before `Start()`/`StartTLS()`.
- `Server.Client() *http.Client` — "Returns an HTTP client configured for making requests to the server," pre-trusting the test TLS cert.
- `ResponseRecorder` — "An implementation of `http.ResponseWriter` that records its mutations for later inspection," for testing an `http.Handler` directly without a network round-trip at all.

[gates §4](../go-audit/exemplar-quality-gates.md#4-test-library-census) measured `httptest` in **23/34** full-source repos (379 importing files) — more repos than either `testify` (17) or `go-cmp` (19). `google/go-github`'s own test helper pattern is the textbook version:

```go
// google__go-github@48d0a668cde8:github/github_test.go
func setup() (client *Client, mux *http.ServeMux, serverURL string) {
    mux = http.NewServeMux()
    apiHandler := http.NewServeMux()
    apiHandler.Handle(baseURLPath+"/", http.StripPrefix(baseURLPath, mux))
    server := httptest.NewServer(apiHandler)
    client = NewClient(nil)
    url, _ := url.Parse(server.URL + baseURLPath + "/")
    client.BaseURL = url
    return client, mux, server.URL
}
```

— a real listening server, a real `http.Client`, no interface seam and no generated mock at all, for an SDK whose entire job is to talk HTTP.

**Mock only at an unavoidable seam**, and when a generated mock is needed, use `go.uber.org/mock`, never `github.com/golang/mock`: the original is archived (2024-01-08, "Google no longer maintains this project… we've decided to fork and maintain this going forward at Uber" — [uber-go/mock README](https://github.com/uber-go/mock)); the fork is a drop-in (`mockgen`, `gomock.NewController(t)`, `.EXPECT()`) with the same API. [gates §4](../go-audit/exemplar-quality-gates.md#4-test-library-census) found **zero** corpus imports of `github.com/golang/mock` and exactly one repo (`hashicorp/terraform`, 9 files) importing `go.uber.org/mock` — mocking libraries are rare in this corpus overall (real transports and real subsystem fakes dominate), and where mocking exists at all, the fork has fully displaced the original.

## Normative guidance candidates

1. **New fleet Go tests use `if got != want { t.Errorf(...) }` for scalars and `cmp.Diff` with the `(-want +got)` convention for structured values; never introduce `github.com/stretchr/testify` in a package that doesn't already import it.**
   Rationale: three independent normative sources reject assertion libraries for new Go code ([TestComments](https://go.dev/wiki/TestComments#assert-libraries), [decisions](https://google.github.io/styleguide/go/decisions#assertion-libraries), [best-practices](https://google.github.io/styleguide/go/best-practices)); measurement shows the ecosystem is genuinely split (17/34 testify vs 19/34 go-cmp), so "testify is the ecosystem default" is not a valid counter-argument.
   Verify: `grep -rl -e 'stretchr/testify' --include='*_test.go' .` in a package that has no pre-existing testify import is the finding; `depguard` with a `deny` rule on `github.com/stretchr/testify` scoped to new/unlisted packages backs it mechanically.
   RUN: yes — `fixtures/test-style/nilempty` shows the message-quality argument concretely (testify's `Not equal:`/`expected:`/`actual:` block vs cmp's `(-want +got)` diff for the identical failure).

2. **A package already importing `stretchr/testify` may keep it, but MUST enable `testifylint` and prefer `require` over `assert` for anything that would leave later assertions meaningless if it failed.**
   Rationale: `testifylint`'s `require-error` checker encodes exactly this rule and fired 1,485 times on a real, actively-maintained testify-heavy codebase (`cli/cli`) — it is signal, not noise, wherever testify exists.
   Verify: `golangci-lint run --config <cfg-with-testifylint-enabled> ./...` — zero `require-error` findings is the pass state.
   RUN: yes — measured 1,485 findings on `cli/cli@9b031151a825` and 4 on `goreleaser@ff8de3d6c389` with `testifylint` enabled ([§3](#verification-runs)).

3. **Never mix `testify` and `go-cmp` assertions on the same value inside one package.**
   Rationale: no exemplar package does this; the corpus's testify/cmp split is by repository lineage, and a mixed package would mean two failure-message vocabularies for the same kind of check.
   Verify: reading heuristic — a package `_test.go` file importing both `github.com/stretchr/testify/assert` (or `require`) and `github.com/google/go-cmp/cmp` is the finding; `grep -rl -e 'stretchr/testify' -e 'google/go-cmp' --include='*_test.go' . | xargs -r grep -lZ 'google/go-cmp' 2>/dev/null` narrowed to files matching both patterns.
   RUN: no — reading heuristic only; not run as an automated check in this pass.

4. **Every `cmp.Diff`/`cmp.Equal` call on a struct with an unexported field must carry `cmpopts.IgnoreUnexported(...)`, an `Equal` method, or an equivalent option — never rely on it "just working."**
   Rationale: `cmp` panics, not fails, on an unhandled unexported field; a panic aborts the whole test binary's run for that package, which is worse than a clear test failure.
   Verify: reading heuristic (no linter enforces this specifically) — grep for `cmp\.Diff(` / `cmp\.Equal(` calls whose compared type has unexported fields and no nearby `cmpopts.IgnoreUnexported`/`Equal` method; in review, run the test once to see whether it panics.
   RUN: yes — `fixtures/test-style/cmpunexported` reproduces the exact panic text and confirms the fix.

5. **`cmp.Diff` calls comparing slices/maps that may legitimately be nil-or-empty MUST include `cmpopts.EquateEmpty()` unless the nil/empty distinction is itself the thing under test.**
   Rationale: without it, `cmp.Diff` has testify's exact nil-vs-empty defect ([stretchr/testify#1141](https://github.com/stretchr/testify/issues/1141)); most business logic does not care about the distinction, and a test that does should say so with a comment, not by omission.
   Verify: reading heuristic — a `cmp.Diff` on a slice/map-typed value with no `cmpopts.EquateEmpty()` nearby, where the function under test can plausibly return nil.
   RUN: yes — `fixtures/test-style/nilempty` shows the identical failure without `EquateEmpty()` and the pass with it.

6. **Every exported test helper function that takes `*testing.T` calls `t.Helper()` as its first statement.**
   Rationale: without it, a failure inside the helper is misattributed to the helper's own line, not the caller's — actively harmful during debugging, and the more helpers a suite has the worse the effect compounds.
   Verify: `golangci-lint run --config <cfg-with-thelper-enabled> ./...`; `thelper` is precise (3 hits on a clean SDK, 755 on a helper-dense CLI — proportional to real helper count, not noise).
   RUN: yes — `fixtures/test-style/helper`: `golangci-lint` (thelper only) flags the missing-helper file (exit 1) and is silent on the fixed twin (exit 0); `go test -v` on both shows the line-attribution difference directly.

7. **`t.FailNow`/`t.Fatal`/`t.Fatalf`/`t.Skip{,f,Now}` (and testify's `require.*`) are called only from the goroutine running the test function — never from a `go func(){...}()`, an HTTP handler goroutine, or a `wg.Go(...)` closure spawned inside the test.**
   Rationale: these call `runtime.GoExit`, which only terminates the *calling* goroutine — from any other goroutine it silently orphans the test instead of failing it, an easy-to-miss false-pass.
   Verify: `go vet ./...` (default-on `testinggoroutine` analyzer) for stdlib-only code; `golangci-lint run --config <cfg-with-testifylint-enabled>` (checker `go-require`) for testify code, which additionally catches `wg.Go` and HTTP-handler cases vet misses.
   RUN: yes — `fixtures/test-style/testinggoroutine`: `go vet ./...` reports `call to (*testing.T).Fatal from a non-test goroutine` (exit 1) on the violation, exit 0 on the channel-reporting fix.

8. **`t.Parallel()` subtests never read or write a variable declared outside their own closure without synchronization — each parallel subtest gets its own fixture instance.**
   Rationale: shared mutable state across parallel subtests is exactly the shape `go test -race` is built to catch, and the failure is nondeterministic without `-race`, so it survives review until it doesn't.
   Verify: `go test ./... -race -count=1` — a `WARNING: DATA RACE` naming both subtest goroutines is the finding. Do NOT use `paralleltest`/`tparallel` to back this MUST — both are measured noise (2,357+ hits on mature, race-clean repos) because they only check that `t.Parallel()` was called, not what it touches.
   RUN: yes — `fixtures/test-style/parallelrace`: `go test -race -count=1` fails reliably (3/3 runs) on the shared-counter version, passes reliably (3/3 runs) on the per-subtest-fixture twin.

9. **A golden-file test reads a repo-owned `-update` bool flag, stores files under `testdata/`, and is deterministic — running it twice without `-update` must produce identical results.**
   Rationale: only 6/34 exemplars follow this convention despite 561 golden files existing across 5 repos; most golden files elsewhere are maintained by ad-hoc scripts the fleet should not imitate, and a non-deterministic golden comparison (unnormalized timestamps, map order) is a flaky test waiting to happen.
   Verify: `grep -rn -e 'flag\.Bool("update"' --include='*_test.go' .` for the convention's presence; `go test ./... -run <GoldenTest> -count=1` run twice without `-update`, diffed, is the determinism check (identical output both times = pass).
   RUN: yes — `fixtures/test-style/golden`: missing golden file fails clearly; `-update` regenerates; two subsequent unflagged runs pass identically.

10. **A CLI's core logic is a testable `run(args []string, stdout, stderr io.Writer) int` called from a two-line `main`; multi-step CLI scenarios (env vars, files, chained commands, real exit-status/stdout framing) additionally get a `testscript` `.txtar` suite via `TestMain`+`testscript.RunMain`.**
    Rationale: in-process `run()` tests are fast and `-race`/`-cover`-friendly but never exercise real argv parsing or exit-status propagation; `testscript` exercises the real thing at the cost of a slower, harder-to-debug test. Both belong in a CLI's suite; neither alone is sufficient once the CLI does more than one thing.
    Verify: `grep -rn -e 'func run(' --include='*.go' .` for the shape's presence; `grep -rln -e 'go-internal/testscript' .` for the testscript twin's presence, non-empty is expected on any multi-command CLI.
    RUN: yes — `fixtures/test-style/clitest`: both `TestRun_Greet`/`TestRun_MissingArg` (in-process) and `TestScript_Greet` (testscript, same `run()` wired through `TestMain`) pass against the identical command.

11. **Prefer `net/http/httptest.NewServer`/`NewUnstartedServer` (or `ResponseRecorder` for a bare `http.Handler`) over a mocked HTTP client for anything that talks HTTP; reach for `go.uber.org/mock` only at a non-HTTP seam a real transport cannot reach, and never import `github.com/golang/mock`.**
    Rationale: `httptest` is the most broadly adopted test-only import in the corpus (23/34, ahead of both testify and go-cmp); `golang/mock` is archived with zero remaining users measured, and its fork is a drop-in replacement.
    Verify: `grep -rn -e 'golang/mock' --include='*.go' .` — any hit is the finding (must be `go.uber.org/mock` instead); presence of `httptest.NewServer`/`NewUnstartedServer` in a package that also constructs an `http.Client` mock is a smell worth a second look, though not itself a hard finding.
    RUN: no — the archived-import check is a straightforward grep, not something that needs a red/green fixture; the `google/go-github` citation ([§10](#exemplar-evidence)) demonstrates the real-transport pattern directly.

## Verification runs

All commands via `~/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, golangci-lint 2.14.0). Fixture root: `/home/mherwig/.cache/research-lang/go-tools/fixtures/test-style/`.

**1. nil vs empty slice — testify vs bare cmp vs cmp+EquateEmpty** (`fixtures/test-style/nilempty/`)
```
go test ./... -run TestFilter_TestifyNilVsEmpty -v   # exit 1
go test ./... -run TestFilter_CmpNoEquateEmpty -v    # exit 1
go test ./... -run TestFilter_CmpEquateEmpty -v      # exit 0
```
- Violation (testify): `Not equal:\n expected: []string{}\n actual  : []string(nil)`.
- Twin without EquateEmpty (cmp): `Filter() mismatch (-want +got):\n  []string(\n- \t{},\n+ \tnil,\n  )` — same defect, better-formatted.
- Fix (cmp + EquateEmpty): `PASS`.
Empty output on the fix means the comparison found no difference; that is the pass state.

**2. cmp.Diff panic on unexported field** (`fixtures/test-style/cmpunexported/`)
```
go test ./... -run TestPoint_RawPanic -v    # exit 1, panic
go test ./... -run TestPoint_CmpIgnoreUnexported -v   # exit 0
```
- Violation: `panic: cannot handle unexported field at {cmpunexported.Point}.tag: … consider using cmpopts.EquateComparable to compare comparable Go types`.
- Fix (`cmpopts.IgnoreUnexported(Point{})`): `PASS`.

**3. t.Fatal from a spawned goroutine** (`fixtures/test-style/testinggoroutine/`)
```
go vet ./...   # exit 1 on violation file present
go vet ./...   # exit 0 with violation file removed (fix file only)
```
- Violation: `violation_test.go:15:4: call to (*testing.T).Fatal from a non-test goroutine`.
- Fix: no output, exit 0.

**4. Helper missing t.Helper()** (`fixtures/test-style/helper/`)
```
go test ./... -run TestDouble_MissingHelper -v   # line attributed to violation_test.go:11 (inside helper)
go test ./... -run TestDouble_WithHelper -v      # line attributed to fix_test.go:14 (the call site)
golangci-lint run ./...   # (config: only `thelper` enabled)
```
- `golangci-lint` on the violation file: `violation_test.go:8:6: test helper function should start from t.Helper() (thelper)`, exit 1.
- Same config with the violation file removed: `0 issues.`, exit 0.

**5. Two `t.Parallel` subtests mutating a shared fixture under `-race`** (`fixtures/test-style/parallelrace/`)
```
go test ./... -race -count=1 -run TestParallel_SharedMutation   # exit 1, 3/3 runs
go test ./... -race -count=1 -run TestParallel_OwnFixture       # exit 0, 3/3 runs
```
- Violation: `WARNING: DATA RACE` (×2, read+write on `sharedCounter`), `FAIL`.
- Fix: `ok`.
- Note: a single unsynchronized `x++` per subtest can pass `-race` by luck; the fixture loops 200,000 increments per subtest behind a shared start signal to make the interleaving — and therefore the detection — reliable rather than probabilistic.

**6. Golden file with `-update`, determinism** (`fixtures/test-style/golden/`)
```
go test ./... -run TestRender_Golden -v            # exit 1, "no such file or directory"
go test ./... -run TestRender_Golden -update -v    # exit 0, regenerates testdata/hello.golden
go test ./... -run TestRender_Golden -count=1 -v   # exit 0 (run 1)
go test ./... -run TestRender_Golden -count=1 -v   # exit 0 (run 2, identical)
```
- Missing golden file is the violation state (exit 1); `-update` is the fix; two subsequent unflagged runs pass identically, confirming determinism.

**7. In-process `run()` CLI test beside a `testscript` `.txtar`** (`fixtures/test-style/clitest/`)
```
go test ./... -v                                  # in-process: TestRun_Greet, TestRun_MissingArg — both PASS
go test -tags testscript ./... -run TestScript_Greet -v   # testscript: exec greet Gophers / stdout 'Hello, Gophers!' — PASS
```
- Both styles pass against the identical `run()` function; this row is a shape comparison, not a violation/fix pair — there is no "wrong" twin, only the demonstration that both approaches exercise the same command correctly from different angles.

**testifylint / thelper / paralleltest / tparallel noise measurement** (read-only, exemplar repos, config `linters: {default: none, enable: [testifylint, thelper, paralleltest, tparallel]}`, `--max-issues-per-linter=0 --max-same-issues=0`):
```
cd <clone> && golangci-lint run --config <cfg> --max-issues-per-linter=0 --max-same-issues=0 ./...
```
| repo | testifylint | thelper | paralleltest | tparallel |
|---|---|---|---|---|
| goreleaser/goreleaser@ff8de3d6c389 | 4 | 0 | 2,357 | 0 |
| cli/cli@9b031151a825 | 1,485 | 755 | 2,557 | 5 |
| google/go-github@48d0a668cde8 | 0 | 3 | 0 | 0 |

## Exemplar evidence

- **`goreleaser/goreleaser@ff8de3d6c389`** — testify-only, `require`-disciplined: 179 files import `testify/require` vs 16 for `testify/assert`; 6,563 `require.` calls vs 173 `assert.` calls in test files (re-measured this pass); 0 `go-cmp` imports; only 4 `testifylint` findings, confirming its own discipline predates the linter. Golden-file convention: `testdata/TestVersion/*.golden` (241 golden files corpus-wide from this repo, [gates §4](../go-audit/exemplar-quality-gates.md)).
- **`cli/cli@9b031151a825`** — mixed testify lineage: 287 files import `assert`, 257 import `require`, roughly even (5,007 vs 3,734 calls); `internal/agents/detect_test.go:41-44,241` shows both in one file (`require.Error`/`require.NoError` for setup, `assert.Equal` for the actual comparison — the map's tolerated shape). 1,485 `testifylint` findings, dominated by `require-error`. Ships both CLI-testing styles: `internal/ghcmd/cmd.go` for the in-process `Main() int` shape, `acceptance/acceptance_test.go:226-227` for `testscript.RunMain`-driven `.txtar` acceptance tests (build-tagged `acceptance`).
- **`google/go-github@48d0a668cde8`** — go-cmp-only, zero testify: 0 files import any testify package; 194 files import `go-cmp`, 79 direct `cmp.Diff(` calls; `github/github_test.go:28` imports `cmp`, never `reflect.DeepEqual` (0 hits in the package's own non-generated files, re-measured this pass). Uses `testing/synctest.Test(t, func(t *testing.T){...})` at `github/github_test.go:3236,3288` — GA-1.25 concurrency testing live in an SDK exemplar, independent confirmation of the shifts scout's own [synctest finding](../go-topic-map/shifts.md#recent-shifts-seen-in-this-corpus). `github/github_test.go:19-33` (`setup()` helper: `httptest.NewServer`, real `http.Client`) is the textbook real-transport pattern this dive's [§10](#10-real-transports-vs-mocks) quotes directly.
- **`etcd-io/etcd`** — `tc := tc`/`tt := tt` loop-variable-copy dead code, 32 corpus-internal hits, e.g. `cache/demux_test.go:89,200,256` — a `go >= 1.22` module still carrying the pre-1.22 defensive idiom ([shape §0](../go-audit/exemplar-code-shape.md)).
- **`hashicorp/terraform`** — the corpus's only `go.uber.org/mock` adopter (9 files); zero `github.com/golang/mock` importers anywhere in the 34-repo corpus, confirming the archived library has no remaining users to migrate ([gates §4](../go-audit/exemplar-quality-gates.md)).
- **Contradicts nothing in the map** — this dive's own measurements (require/assert ratios, testifylint counts) sharpen conflict 1's resolution rather than reopening it.

## AI-agent angle

- **Reaching for `assert.Equal`/`require.Equal` by default.** Training data over-represents testify because it dominated search results and tutorials for years; a model asked to "write a Go test" defaults to it even in a `go-cmp`-only codebase. Smallest check: `grep -rn -e 'stretchr/testify' --include='*_test.go' .` in the touched package — a hit where the rest of the package has none is the tell; `depguard` denying the import outside an allowlist of already-testify packages backs it in CI.
- **Assuming `assert.Equal`/`cmp.Diff` treat nil and empty slices/maps as equal.** Both do not, by default; a model will write `assert.Equal(t, []string{}, got)` or bare `cmp.Diff(want, got)` against a function that legitimately returns `nil` for "no results" and get a spurious failure it then "fixes" by changing the *function* to always return `[]string{}` — solving a test artifact by changing production code. Smallest check: run the test once; if it fails only on nil-vs-empty, add `cmpopts.EquateEmpty()` (or fix the actual defect if the distinction matters), never change the function's return shape to appease the test.
- **Writing `cmp.Diff` on a struct with unexported fields and not expecting a panic.** A model that has seen mostly `reflect.DeepEqual` examples (which silently compares unexported fields via reflection) expects `cmp.Diff` to behave the same way; it panics instead. Smallest check: if a `cmp.Diff`/`cmp.Equal` test panics rather than fails, the type has an unexported field — add `cmpopts.IgnoreUnexported(T{})`, don't wrap the call in a `recover()` to "handle" it.
- **`tc := tc` / `tt := tt` cargo-culted into new `go >= 1.22` table tests.** Pre-1.22 training data is full of this pattern; a model reproduces it reflexively even though the loop-variable-per-iteration semantics (Go 1.22) make it dead code. Smallest check: `grep -rn -e '^\s*tt := tt\s*$' -e '^\s*tc := tc\s*$' --include='*_test.go' .` in a module whose `go.mod` `go` line is `>= 1.22` — any hit is removable; empty output means the module is clean of this specific idiom (it does not mean the module has no other pre-1.22 leftovers).
- **Golden `golang/mock` or `github.com/golang/mock/gomock` imports.** Training data predates the 2024-01-08 archival; a model asked to generate a mock reaches for the familiar import path. Smallest check: `grep -rn -e 'golang/mock' --include='*.go' .` — any hit should be `go.uber.org/mock` instead; the API is close enough (`mockgen`, `gomock.NewController`, `.EXPECT()`) that the fix is usually a mechanical import-path swap plus regenerating mocks, not a rewrite.
- **`t.Fatal`/`require.*` inside a `go func(){...}()` spawned by the test, especially in "test an HTTP server" scaffolding.** A model writing an HTTP server test commonly spawns a goroutine to run the server and calls assertion helpers inside the handler or the goroutine body; both are `testinggoroutine`/`go-require` violations. Smallest check: `go vet ./...` (free, already part of `go test`) catches the plain-stdlib case; `testifylint`'s `go-require` checker catches the testify case including `wg.Go(...)` closures vet misses.
- **Writing a helper function that takes `*testing.T` and forgetting `t.Helper()`, or putting it after some setup code instead of first.** A model reproduces the *shape* of a helper (early return on error, `t.Fatalf` at the end) without the framing call, because `t.Helper()` has no visible effect on a passing test — the bug is latent until the helper's first real failure, at which point every line number reported is wrong. Smallest check: `golangci-lint run` with `thelper` enabled (default-off in golangci-lint's `standard` set — must be explicitly enabled), or the reading heuristic "first statement of any `func(t *testing.T, ...)` or `func(tb testing.TB, ...)` helper is `t.Helper()`/`tb.Helper()`".
- **Reaching for `io/ioutil.TempFile`/`os.MkdirTemp` + manual cleanup, or a hand-rolled `defer os.RemoveAll(...)`, instead of `t.TempDir()`.** Pre-1.15 training data predates `t.TempDir()`; a model reproduces the manual pattern, including the failure mode where a `t.Fatal` before the `defer` runs leaks the directory. Smallest check: `grep -rn -e 'ioutil\.TempFile' -e 'os\.MkdirTemp' --include='*_test.go' .` — any hit in a `go >= 1.15` module is replaceable with `t.TempDir()`, which self-cleans even on failure. (Out of this row's direct scope — M-E-06 — but the same training-data-lag mechanism applies and is worth the same one-line check here.)

## Contested / evolving

- **testify v1 vs stdlib+cmp, as of 2026-09-26.** The map has resolved the fleet's own direction (stdlib+cmp default, testify tolerated under conditions); the wider ecosystem question remains genuinely split and shows no sign of converging. testify is "being maintained at v1, no breaking changes" with an open, years-old issue ([#1089](https://github.com/stretchr/testify/issues/1089)) admitting the argument-order and API-duplication warts can't be fixed without a v2 the maintainers now describe as, per testifylint's own README, "extremely far" off. Trend: no resolution in sight industry-wide; the fleet's own position does not depend on one.
- **`testify v2`'s argument-order fix.** `testifylint`'s `expected-actual` checker exists specifically because current testify has `Equal(t, expected, actual)` while a hypothetical v2 would flip to the more Go-idiomatic `(actual, expected)` — "It is planned to change the order of assertion arguments to more natural (actual, expected) in v2 of testify" ([testifylint README](https://github.com/Antonboom/testifylint#expected-actual)). Not scheduled; a fleet rule that tolerates testify should not assume this changes.
- **`mockery`'s Expecter Structs vs testify/mock's string-based `.On(...)`.** `testifylint`'s `mock-expect` checker (default-enabled) actively steers testify-mock users toward the compile-time-checked `mockery` expecter API over string method names — a shift happening *within* the testify ecosystem, separate from the testify-vs-cmp question, and one this dive did not need to adjudicate because the map's SDK-first priority order (real transports, then `go.uber.org/mock`) makes `testify/mock` itself out of scope for new fleet code regardless.
- **How much golden-file tooling the fleet should standardize.** Only 6/34 exemplars use a `-update`-flag convention despite 561 golden files existing; this dive pins the convention for *new* fleet golden tests but found no ecosystem consensus strong enough to justify a shared helper package (`golden.Compare(t, path, got)`) over each package writing its own ~10-line `-update` flag and `os.ReadFile`/`os.WriteFile` pair — worth revisiting if the fleet accumulates enough golden-file-using packages that the duplication starts to hurt.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/wiki/TestComments](https://go.dev/wiki/TestComments) | Go wiki, official reviewer guidance for tests | living doc, read 2026-09-26 | The exact "no assert libraries" argument-from-message-quality this rule set rests on; also t.Helper, Print Diffs, subtest naming |
| [google.github.io/styleguide/go/decisions](https://google.github.io/styleguide/go/decisions) | Google Go Style Guide — Decisions | living doc, read 2026-09-26 | "Assertion libraries" and "Useful Test Failures" sections; normative-but-not-canonical, explains rationale |
| [google.github.io/styleguide/go/best-practices](https://google.github.io/styleguide/go/best-practices) | Google Go Style Guide — Best Practices | living doc, read 2026-09-26 | The test-helper vs assertion-helper distinction; the goroutine-safety rule for Fatal-family calls |
| [pkg.go.dev/github.com/google/go-cmp/cmp/cmpopts](https://pkg.go.dev/github.com/google/go-cmp/cmp/cmpopts) | Go package docs, `go-cmp` v0.7.0 | current, read 2026-09-26 | Exact signatures/doc comments for `EquateEmpty`, `IgnoreUnexported`, `EquateErrors`, etc. |
| [pkg.go.dev/net/http/httptest](https://pkg.go.dev/net/http/httptest) | Go stdlib package docs | Go 1.27.1 | Exact API for `NewServer`/`NewUnstartedServer`/`ResponseRecorder`, the real-transport default |
| [github.com/stretchr/testify README](https://github.com/stretchr/testify) | The tool's own repository | read 2026-09-26, "maintained at v1" banner | assert/require/mock/suite usage as the maintainers themselves present it; the v1-forever framing |
| [github.com/Antonboom/testifylint README](https://github.com/Antonboom/testifylint) | The tool's own repository | read 2026-09-26 | Every checker's before/after code, autofix status, and rationale — the mechanism behind the tolerance clause |
| [github.com/kulti/thelper README](https://github.com/kulti/thelper) | The tool's own repository | read 2026-09-26 | Exact mechanism for why `t.Helper()` must be first, with a runnable before/after example |
| [github.com/uber-go/mock README](https://github.com/uber-go/mock) | The tool's own repository (fork of archived golang/mock) | read 2026-09-26 | States the archival directly ("Google no longer maintains…we've decided to fork"), full `mockgen`/`gomock` API |
| [pkg.go.dev/github.com/rogpeppe/go-internal/testscript](https://pkg.go.dev/github.com/rogpeppe/go-internal/testscript) | Go package docs | v1.16.0, read 2026-09-26 | `Run`, `Params`, `RunMain`, `.txtar` command reference for the CLI end-to-end shape |
| [github.com/stretchr/testify/issues/1141](https://github.com/stretchr/testify/issues/1141) | Issue tracker, closed not-planned | reported and closed, read 2026-09-26 | Primary evidence the nil-vs-empty defect is known, real, and permanent by maintainer decision |
| [go.dev/blog/loopvar-preview](https://go.dev/blog/loopvar-preview) | Official Go blog | Go 1.22, Mar 2024 | Why `tc := tc` is dead code in a `go >= 1.22` module |
| [golang/tools testinggoroutine/doc.go](https://github.com/golang/tools/blob/master/go/analysis/passes/testinggoroutine/doc.go) | The analyzer's own source doc comment | current, read 2026-09-26 | Exact wording of what `go vet`'s `testinggoroutine` check catches |
| [boldlygo.tech — "Testify is making your Go tests worse"](https://boldlygo.tech/posts/2026-04-20-testify-is-making-your-go-tests-worse/) | Practitioner blog, April 2026 | inside this program's era | Concrete, checkable complaints (nil/empty, argument order, 30+ overlapping assertions) with an honest "keep testify if already standardized" exception |
| [go-audit/exemplar-quality-gates.md §4](../go-audit/exemplar-quality-gates.md#4-test-library-census) | This program's own wave-1 audit | 2026-09-26 | Corpus-wide import census (testify/cmp/httptest/golden files/-update flags) this dive's own measurements sharpen |
| `goreleaser/goreleaser@ff8de3d6c389` | Exemplar repo, real code | fetched 2026-09-26 | `require`-disciplined testify usage at scale; golden-file convention |
| `cli/cli@9b031151a825` | Exemplar repo, real code | fetched 2026-09-26 | Mixed assert/require in one file; both in-process and testscript CLI-testing shapes in one repo |
| `google/go-github@48d0a668cde8` | Exemplar repo, real code | fetched 2026-09-26 | 100% go-cmp, real-transport `setup()` helper, live `testing/synctest.Test` usage |
| `etcd-io/etcd@7583cc6e7e27` | Exemplar repo, real code | fetched 2026-09-26 | `tc := tc` dead-code idiom still present post-1.22, 32 internal hits |

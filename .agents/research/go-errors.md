---
title: "The error contract (GO-ERR): consolidated"
topic: go-errors
model: opus
id_family: GO-ERR
consolidates:
  - go-errors/wrapping-and-classification.md
  - go-errors/panics-exits-cleanup.md
date: 2026-09-26
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/go-errors-consolidation/
toolchain: "Go 1.27.1 (GOTOOLCHAIN=local), golangci-lint 2.14.0 (bundled staticcheck 0.8.1), staticcheck 2026.2.1"
---

# The error contract (GO-ERR)

Owner file: `rules/go-quality/errors.md` (topic map, section B, M-B-01..19).
Sources: two wave-2 dives, [wrap](go-errors/wrapping-and-classification.md) and
[pec](go-errors/panics-exits-cleanup.md), plus the audits. I re-ran eight
checks to settle conflicts, on the fixture module
`fixtures/go-errors-consolidation/` (module `goerrcons`, `go 1.27`). The
consolidation's own runs are tagged **[C]**.

## Verdict

1. **Callers above you must be able to test the chain, so wrapping is `%w`.** Any code kind that returns an error with added context uses `%w`. No code flattens an error with `%v`/`%s`.
   - A boundary that must hide a cause flattens explicitly with `fmt.Errorf("%w: %s", ErrOwn, err.Error())`: its own sentinel is wrapped, the dependency's text is a string.
   - This settles the dive's open tension ([wrap](go-errors/wrapping-and-classification.md) Contested) and topic-map conflict 22. `errorlint`'s `errorf` check stays on fleet-wide, and the Google-sanctioned hiding idiom passes it with no `//nolint` (**[C]** run 1).
2. **Matching is `errors.Is`/`errors.As`/`errors.AsType`, never `==`, type assertions or type switches.** `errors.AsType` is the default form in every fleet module, since the fleet's floors (1.26.0 for libraries, 1.27.0 for CLIs, frame Q1) admit it.
3. **Library and SDK code (not `main`) makes no process decisions.**
   - It never calls `os.Exit` or `log.Fatal*`.
   - It panics only on a violated invariant or programmer misuse.
   - It never panics on a value that arrived through an exported parameter.
4. **CLI code exits from `func main` only, and never after a `defer`.** This is stricter than the map's "outside `package main`": a `fail()` helper inside `package main` is a finding. It matches the fleet's EXIT-02 (`rules/rust-quality/cli-contract.md`).
5. **Writable resources close through a named-return `defer` with `errors.Join`.** This binds all code.
   - The gate never enables golangci-lint's `std-error-handling` preset, because the preset blinds errcheck to exactly this defect.
   - Interface-typed read bodies are exempted by `(io.ReadCloser).Close` only.
6. **The OCX SDK exposes one `*ExitError{Code ExitCode}`, not one type per code.**
   - A timeout is a separate `*TimeoutError` that never matches `*ExitError`.
   - The SDK retries only exit 75 (`TempFail`), never 69.
   - It is a Go port of ocx-sdk-python's behaviour, not of its twelve classes: Go has no exhaustive match to pay for twelve types.
7. **`wrapcheck` is not adopted.** Its untuned noise on grpc-go was roughly 65-75% on a 13-hit sample ([wrap](go-errors/wrapping-and-classification.md) FP spot-reads). No GO-ERR rule rests on it.
8. **`(nil, nil)`, handle-once and error-string style are SHOULD, not MUST.** No Go-team normative source backs a MUST, and handle-once has no linter.

## The ruleset

Every golangci-lint verification assumes a v2 config (`version: "2"`) with golangci-lint pinned to 2.14.0.

**Running staticcheck directly.** A repo that runs `staticcheck` directly
complies wherever the analyzer name is given (map conflict 2).

**Grep checks run the other way round.** Output means a finding: grep exits 0
when it finds something and 1 when the tree is clean.

### Caught by `errorlint`

Enable it with `linters.enable: [errorlint]` and leave the settings at their
defaults: under golangci-lint 2.14.0, `errorf`, `comparison` and `asserts` are
all on. Standalone `go-errorlint` needs `-errorf`. **[C]** run 1 used a config
with no `settings` block and saw `errorf` fire.

**GO-ERR-01 — MUST. Wrap with `%w`; never format an error value with `%v`/`%s`, and at a hiding boundary flatten explicitly with `err.Error()` under your own `%w` sentinel.**
- **Rationale:** a `%v` wrap silently breaks `errors.Is`/`errors.As` for every caller above it. Kubernetes is paying for exactly this in [kubernetes#123234](https://github.com/kubernetes/kubernetes/issues/123234).
- **Verification:** `run.sh golangci-lint run --config=.golangci-errorlint.yml ./...`
- **Watched red:**
  - [wrap](go-errors/wrapping-and-classification.md) §a: `a_violation/a.go:21:31: non-wrapping format verb for fmt.Errorf`, exit 1.
  - **[C]** `boundary_violation/b.go:14:47` (`"%w: %v", ErrInvalidData, err`), exit 1.
- **Watched green:**
  - `a_twin`, exit 0.
  - **[C]** `boundary_twin` (`"%w: %s", ErrInvalidData, err.Error()`): `0 issues.`, exit 0. Its `go test` passes, asserting `errors.Is(err, ErrInvalidData)` and `!errors.AsType[*json.SyntaxError](err)`.
- **Floor:** go1.13 (`%w`), go1.20 (several `%w` in one call).

**GO-ERR-02 — MUST. Test errors with `errors.Is`/`errors.As`/`errors.AsType`; never `==`, a type assertion or a type switch on an error value.**
- **Rationale:** `==` and assertions do not traverse the wrap chain. The corpus has 222 `err == io.EOF` sites ([run](go-audit/exemplar-runtime-posture.md) §1).
- **Verification:** `errorlint` `comparison` and `asserts`. `go vet` `errorsas` is a separate check with a different job: it validates an `errors.As` target, but it does not find a missing `errors.As`. Run both.
- **Watched red:**
  - **[C]** `cmp_violation/c.go`, three issues: line 11 "comparing with == will fail on wrapped errors", line 14 "type assertion on error", line 17 "type switch on error". Exit 1.
  - `errorsas-probe/p.go:11:9: second argument to errors.As must be a non-nil pointer`, exit 1 ([wrap](go-errors/wrapping-and-classification.md)).
- **Watched green:** **[C]** `cmp_twin`, exit 0.
- **Floor:** go1.13.

**GO-ERR-03 — MUST. An `io.Reader` implementation returns `io.EOF` itself, never wrapped.**
- **Rationale:** `$GOROOT/src/io/io.go:37-38` (go1.27.1) says: "Read must return EOF itself, not an error wrapping EOF, because callers will test for EOF using ==."
  - `errorlint` exempts `== io.EOF` on `io.Reader`-typed calls on purpose.
  - The defect is therefore the wrapping reader, not the caller.
- **Verification:** reading heuristic. A `Read` method whose error path wraps without an `if err == io.EOF { return n, err }` passthrough is a finding.
- **Why no linter:** no analyzer checks this. `errorlint` reports 0 issues on `b_violation` ([wrap](go-errors/wrapping-and-classification.md) §b), which is correct behaviour for the caller side.
- **Floor:** none.

### Caught by `go fix` and `go vet`

**GO-ERR-04 — SHOULD. In a module whose `go` line is ≥1.26, write `if t, ok := errors.AsType[*T](err); ok` rather than the `var t *T; errors.As(err, &t)` two-step.**
- **Rationale:** the generic form cannot carry a malformed target, and `errors` doc says "For most uses, prefer AsType" (`$GOROOT/src/errors/wrap.go:84`).
  - A call below the floor compiles on a newer toolchain. It breaks on an older one.
- **Verification:**
  - `run.sh go fix -diff ./...` (the `errorsastype` fixer, go1.26+).
  - `run.sh go vet ./...` (`stdversion`) catches `AsType` under a `go 1.25` line.
  - `staticcheck` 2026.2.1 does not catch the floor mismatch (exit 0).
- **Watched red:**
  - **[C]** `astype_violation`: diff printed, exit 1.
  - `f_violation`: `f.go:10:18: errors.AsType requires go1.26 or later (module is go1.25)`, exit 1 ([wrap](go-errors/wrapping-and-classification.md) §f).
- **Watched green:**
  - **[C]** `astype_twin`, exit 0.
  - `f_twin`, exit 0.
- **Floor:** go1.26.

### Caught by staticcheck (default checks; golangci-lint `staticcheck` or standalone)

**GO-ERR-05 — MUST. Never return a variable of a concrete pointer error type through an `error` result; internal helpers return `error`, not `*MyErr`.**
- **Rationale:** a nil `*MyErr` inside an `error` is non-nil ([FAQ](https://go.dev/doc/faq#nil_error)). It is permanent by design.
- **Verification:** two layers.
  - (a) `staticcheck` SA4023.
  - (b) A reading heuristic: a function with result type `*XxxError` whose value reaches a `return` in a function that returns `error`.
  - Layer (b) is mandatory because SA4023 is blind when the only nil comparison sits in a `_test.go` file. The dive found this, and **[C]** re-ran it:
    - `run.sh staticcheck -tests=true -checks SA4023 ./c_violation/...` exits 0 even though `Do(false) == nil` appears in the test.
- **Watched red:** `sa4023-probe2/p.go:20:5: this comparison is never true (SA4023)`, exit 1.
- **Watched green:** none clean; the only green on the violation is the blind spot. The rule is MUST on the FAQ's normative text, with the heuristic carrying it.
- **Floor:** none.

**GO-ERR-06 — MUST. When a function returns its cleanup, defer the call to the returned function: `defer start()()`, never `defer start()`.**
- **Rationale:** the short form runs `start` now and throws the cleanup away. SA9010 is new in staticcheck 2026.2 and postdates model training ([cod](go-topic-map/codified.md) §5).
- **Verification:** SA9010 (default-on). It needs staticcheck ≥2026.2, which golangci-lint 2.14.0 bundles as 0.8.1. An older pin misses it.
- **Watched red:** `bad_sa9010.go:16:2: SA9010: deferred return function not called`, exit 1 ([pec](go-errors/panics-exits-cleanup.md) row 7).
- **Watched green:** `good_sa9010.go`, exit 0.
- **Floor:** staticcheck 2026.2.

**GO-ERR-07 — SHOULD. Error strings start lower-case, carry no trailing punctuation and no "failed to" prefix; `%w` goes at the end, except a sentinel category, which goes first (`"%w: bad header", ErrParse`).**
- **Rationale:** strings are concatenated into chains.
  - [CodeReviewComments §Error Strings](https://go.dev/wiki/CodeReviewComments#error-strings).
  - [Google Best Practices §Placement of %w](https://google.github.io/styleguide/go/best-practices#error-percent-w).
  - Uber's "avoid 'failed to'".
- **Verification:** `staticcheck` ST1005 for the string shape. `%w` placement is a reading heuristic.
- **Watched red:** `st1005-probe`, both diagnostics, exit 1.
  - The dive saw only one diagnostic under golangci-lint and reported it as a gap. **[C]** traced it to `uniq-by-line` dedup: with `--uniq-by-line=false` both appear, and the run is red either way.
- **Floor:** none.

### Caught by `errcheck` (golangci-lint v2 defaults: no exclusion preset)

**GO-ERR-08 — MUST. A writable file's or buffered writer's `Close`/`Flush`/`Sync` error is never dropped.**
- **The shape:** declare `(err error)` and write `defer func() { err = errors.Join(err, f.Close()) }()`. `Flush` a `bufio.Writer` explicitly before returning.
- **Rationale:** a failed close on a write path can mean the data never landed. golangci-lint v1 hid bare `defer f.Close()` behind `EXC0001`; v2 has no default exclusions ([ldez](https://ldez.github.io/blog/2025/03/23/golangci-lint-v2/)).
- **Verification:** `errcheck`.
- **Watched red:** `bad_write_close.go:15:15: Error return value of f.Close is not checked`, exit 1 ([pec](go-errors/panics-exits-cleanup.md) row 3).
- **Watched green:** `good_write_close.go`, exit 0.
- **Floor:** go1.20 (`errors.Join`).

**GO-ERR-09 — MUST. Exempt read-only closes only with `errcheck.settings.exclude-functions: ["(io.ReadCloser).Close"]`; never enable `linters.exclusions.presets: [std-error-handling]`.**
- **Rationale:** the preset's regex `.*Close|.*Flush` is blind to read versus write. It silences GO-ERR-08's target (`golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:53-59`).
- **Verification:** `grep -rn --include='*golangci*' -e 'std-error-handling' .` (output means a finding).
- **Watched red:**
  - Grep: **[C]** `preset_violation`, exit 0 with a hit.
  - Behaviour: [pec](go-errors/panics-exits-cleanup.md) row 4, where the preset turned both closes into `0 issues.`
  - Behaviour: row 5, where the targeted exclude kept `f.Close` red and cleared `resp.Body.Close`.
- **Watched green:** **[C]** grep on `preset_twin`, exit 1.
- **Ownership:** GO-GATE should cite this row rather than restate it.

**GO-ERR-10 — SHOULD. `recover` appears only in a deferred function at a goroutine or exported-API boundary, and its value is always used: logged with `debug.Stack()`, converted to a returned error, or re-panicked.**
- **Rationale:** a swallowed panic hides a violated invariant. [Effective Go §Recover](https://go.dev/doc/effective_go#recover).
- **Verification:** `errcheck` catches a bare uncaptured `recover()`. A captured-but-unused value is a reading heuristic.
- **Watched red:** `bad_recover_swallow.go:10:10`, exit 1.
- **Watched green:** `good_recover_log.go`, exit 0 ([pec](go-errors/panics-exits-cleanup.md) row 10).
- **Floor:** none.

### Caught by `nilerr` / `nilnil` (enable both explicitly; neither is in the 5-linter `standard` set)

**GO-ERR-11 — MUST. After `if err != nil`, never `return nil`.**
- **Rationale:** it reports a failure as success.
  - `nilerr` is a measured signal linter: it fired 0/2/2 on cobra, oras-go and ko ([gates](go-audit/exemplar-quality-gates.md) §5).
  - Legitimate exceptions carry `//nolint:nilerr // <reason>`.
- **Verification:** `nilerr`.
- **Watched red:** `bad_nilerr.go:11:3: error is not nil (line 9) but it returns nil`, exit 1.
- **Watched green:** `good_nilerr.go`, exit 0 ([pec](go-errors/panics-exits-cleanup.md) row 8).
- **Floor:** none.

**GO-ERR-12 — SHOULD. Signal "not found" or "no result" with a sentinel or typed error, or with `(v, ok)`; never `(nil, nil)` for a pointer, interface or func result, and never an in-band `-1`/`""`.**
- **Rationale:** a caller that checks only `err` dereferences nil. See [CodeReviewComments §In-Band Errors](https://go.dev/wiki/CodeReviewComments#in-band-errors) and the [nilnil README](https://github.com/Antonboom/nilnil).
- **Verification:** `nilnil` with `settings.nilnil.checked-types: [chan, func, iface, ptr, uintptr, unsafeptr]`.
  - The list drops `map` from the default: a nil map is a valid empty read-only value, as a nil slice already is.
  - In-band values are a reading heuristic.
- **Watched red:**
  - **[C]** `nilnilmap`: the default config flags both `Labels` (map) and `Find` (pointer); the tuned config flags only `Find` (`n.go:25:3`). Exit 1 both times.
  - `bad_nilnil.go`, exit 1.
- **Watched green:** `good_nilnil.go`, exit 0.
- **Floor:** none.

### Caught by `revive` `deep-exit` + `gocritic` `exitAfterDefer`

**GO-ERR-13 — MUST. `os.Exit` and `log.Fatal*` are called only from `func main` (and `TestMain`), and never after a `defer` in `main`.**
- **Rationale:** both skip every pending `defer` in every goroutine. The corpus has 285 `os.Exit` and 359 `log.Fatal*` calls outside `main` ([shape](go-audit/exemplar-code-shape.md) §4).
- **Verification:** golangci-lint with both linters configured.
  - revive: `revive.settings.rules: [{name: deep-exit}]`, set explicitly. The rule is not in revive's default set under golangci-lint 2.14.0 ([pec](go-errors/panics-exits-cleanup.md) §2).
  - gocritic: at its defaults, which include `exitAfterDefer`.
  - Leave `issues.uniq-by-line` at its default.
- **Watched red:**
  - **[C]** `exitlib`: `l.go:10:3` (`log.Fatal`) and `l.go:14:15` (`os.Exit`), both `deep-exit`. Exit 1.
  - **[C]** `exitmain`: a `fail()` helper hits `deep-exit` at `main.go:10:2`, and `main` itself hits `exitAfterDefer` at `main.go:22:3`. Exit 1.
- **Watched green:**
  - `good_exit_in_lib.go`, exit 0.
  - `TestMain`'s `os.Exit(m.Run())` in `l_test.go` was not flagged.
- **Floor:** none.

### Caught by grep, then read

**GO-ERR-14 — MUST. Never classify an error by its text: no `strings.Contains`/`HasPrefix`/`HasSuffix`/`EqualFold`/`Index` or `regexp.MatchString` over `err.Error()`.**
- **Rationale:** a dependency rewording its message silently flips the branch. Google Best Practices uses exactly this as its "Bad" example ([§Error structure](https://google.github.io/styleguide/go/best-practices#error-structure)).
- **Verification:** `grep -rnE --include='*.go' '(strings\.(Contains|HasPrefix|HasSuffix|EqualFold|Index)|regexp\.MatchString)\(.*\.Error\(\)' .` (output means a finding).
- **Watched red:**
  - **[C]** `msg_violation/m.go:5`, grep exit 0.
  - Corpus, non-test files outside vendor/testdata: 108 hits, e.g. `cli/cli@9b031151a825:api/queries_repo.go:1029,1535,1589`.
- **Watched green:** **[C]** `msg_twin`, grep exit 1.
- **Floor:** none.

**GO-ERR-15 — MUST. Library and SDK code panics only for a violated internal invariant or programmer misuse, and never on a value that arrived through an exported parameter.**
- **What counts as misuse:** use after `Close`, a registration error at `init`, or `Must*` applied to a compile-time constant.
- **No home-made control-flow helpers:** no project-local `must()`/`try()` over runtime values. The Go team stopped pursuing error syntax in June 2025 ([error-syntax](https://go.dev/blog/error-syntax)).
- **Rationale:** a panic on input takes down the caller's process for a condition an `error` would let it handle. Sources: [Effective Go §Panic](https://go.dev/doc/effective_go#panic), [Google §Don't panic](https://google.github.io/styleguide/go/decisions#dont-panic).
- **Verification:** `grep -rn --include='*.go' --exclude='*_test.go' -e 'panic(' -e 'func must(' -e 'func try(' .`, then read each hit outside `package main`.
  - Pass if the argument traces to an invariant constructor or sentinel (`AssertionFailedf`, `ErrClosed`, `illegalOpf`) or to a constant.
  - Fail if it traces to a parameter.
- **Why only a reading heuristic:** no linter in the roster separates these. `go vet`, staticcheck, errcheck, revive, gocritic, gosec, nilerr and nilnil all reported 0 on `bad_panic_input.go` and `bad_must_runtime.go` ([pec](go-errors/panics-exits-cleanup.md) rows 14-15). The measured basis is pebble's 30-site classification ([pec](go-errors/panics-exits-cleanup.md) §1).
- **Floor:** none.

### Reading heuristics and contract tests

**GO-ERR-16 — MUST. An exported function never `%w`-wraps an error that came from another module unless its doc comment names that error as part of the contract; otherwise translate to your own sentinel (GO-ERR-01's flattening).**
- **Rationale:** `%w` makes the dependency's type reachable through `errors.As`, so it becomes your API (Hyrum's Law). See the [go1.13 blog](https://go.dev/blog/go1.13-errors) ("do not wrap an error when doing so would expose implementation details") and [Google §Adding information](https://google.github.io/styleguide/go/best-practices#adding-information-to-errors).
- **Verification:** a reading heuristic. Look for an exported func body that applies `%w` to a value returned by a call into another module, where the doc comment does not name it.
- **Behavioural proof:** `e_violation`, where `errors.As` reaches `*json.SyntaxError`, against `e_twin`, where it does not ([wrap](go-errors/wrapping-and-classification.md) §e).
- **Why no static check:** no tool can tell intent. `errorlint` passes `e_violation` (0 issues), and `wrapcheck` checks the opposite failure mode.
- **Floor:** none.

**GO-ERR-17 — SHOULD. Export sentinels for data-less conditions and typed errors for conditions that carry data, and match each type with one receiver kind everywhere.**
- **Typed errors** use a pointer receiver, plus `Unwrap` when they carry a cause.
- **A value receiver** is allowed only for an immutable, data-less marker matched by value.
- **Rationale:** mixing `*T` and `T` matching silently misses. `cli/cli@9b031151a825:pkg/cmdutil/errors.go:21,60` does both correctly.
- **Verification:** reading heuristic. Every `errors.AsType[...]` call for a type uses the same pointer or value form.
- **Floor:** none.

**GO-ERR-18 — SHOULD. Where a value may be an `errors.Join` result and every match matters, walk `Unwrap() []error`; `errors.As`/`AsType` returns only the first match.**
- **Rationale:** a batch validator built this way silently reports one failure out of N.
- **Verification:** a table test that joins two errors of the same type and asserts the count.
- **Behavioural evidence:** `d_violation` finds 1 of 2 and `d_twin` finds 2 of 2 ([wrap](go-errors/wrapping-and-classification.md) §d). Both tests pass because they assert the planted behaviour.
- **Floor:** go1.20.

**GO-ERR-19 — SHOULD. Handle each error once: return it (wrapped) or log it and continue, never both. A deliberate discard is an explicit `_ =` with a reason comment unless the call can fail only on programmer error.**
- **Rationale:** logging and returning prints every failure N times. Silent `_ =` on a user-visible path hides real failures, as at `charmbracelet/bubbletea@d5bfd5c2ff74:tea.go:1288`, where a failed terminal restore is dropped.
- **Verification:** reading heuristic. No linter enforces handle-once ([cod](go-topic-map/codified.md) §9).
- **`check-blank` stays off:**
  - About a third of a 40-site `_ =` sample are not error discards at all ([pec](go-errors/panics-exits-cleanup.md) §3).
  - Cobra flag-registration discards are justified.
- **Floor:** none.

**GO-ERR-20 — MUST (SDK). The OCX Go SDK surfaces a non-zero `ocx` exit as one exported `*ExitError` carrying `Code ExitCode`; a timeout or kill-before-reap is a separate `*TimeoutError` that never matches `*ExitError`; the retry predicate returns true for code 75 (`TempFail`) only.**
- **What it mirrors:**
  - `ocx-sdk-python` `_process.py:825,831` and `_types.py:289`.
  - The ocx doc comments at `ocx@2691d3c1638e:crates/ocx_exit/src/exit_code.rs:32-46`: 69 "Rerunning the same command will not change the outcome", and 75 "makes automated retry safe on 75 and unsafe on Unavailable".
- **Verification:** a contract test that ships with the SDK. Every code must be reachable through `errors.AsType[*ExitError]` after a `%w` wrap, `Retryable` must equal `code == 75`, and a wrapped `*TimeoutError` must not match.
- **Watched red:** **[C]** `sdkexit_violation`, where a timeout embeds `ExitError` and the predicate retries 69. Result: `Retryable(code 69) = true, want false` and `*TimeoutError matched *ExitError`, `FAIL`, exit 1.
- **Watched green:** **[C]** `sdkexit_twin`, `ok`, exit 0.
- **Floor:** go1.26 (`AsType`).

**MUST count: 13** (01, 02, 03, 05, 06, 08, 09, 11, 13, 14, 15, 16, 20).

- **Reading heuristics carry four MUSTs, each with a normative reason given in its row.**
  - GO-ERR-03 and GO-ERR-16 rest on reading alone.
  - GO-ERR-05 rests on SA4023 plus reading.
  - GO-ERR-15 rests on grep plus reading.
- **Dropped as model common knowledge:** SA5001 (`defer Close` before the error check) is default-on staticcheck and agents rarely write it.
- **Dropped because it is not a rule:** "errors.Join over hashicorp/go-multierror", which is an adoption fact (2/35).
- **Dropped as a verified non-check:** gosec G104 ([pec](go-errors/panics-exits-cleanup.md) rule 8).

## Applied to the exemplars and the future consumers

**Already satisfied (strict exemplars).**
- **GO-ERR-01:**
  - `sigstore/cosign@907c3d899c0e` has 494 `%w` and 0 `%v`-of-err.
  - `oras-project/oras-go@cb6d6dc79f83` has 276 and 0.
  - goreleaser, controller-runtime and go-containerregistry each have 0 `%v`-of-err ([run](go-audit/exemplar-runtime-posture.md) §1).
- **GO-ERR-04:** `cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212` dispatches exit codes with `errors.AsType`.
- **GO-ERR-17, GO-ERR-20 shape:** `aquasecurity/trivy@ae561f8cca36:pkg/types/error.go:7-22` defines `*ExitError{Code int}` beside `*UserError`.
- **GO-ERR-10:** `caddyserver/caddy@54937914234b:modules/caddypki/maintain.go:27-32` and six sibling sites recover at the top of each goroutine and log with `debug.Stack()`.
- **GO-ERR-15:** `cockroachdb/pebble@13596f1e1cea:get.go:26-28` and `snapshot.go:46-47` panic on use after close with a sentinel.

**Violated (prominent exemplars).**

| Rule | Where |
|---|---|
| GO-ERR-01 | `grpc/grpc-go@acccf8cd101a:clientconn.go:326` (`"%v: %v", ctx.Err(), err`; 21 `%w` vs 332 `%v`); `caddyserver/caddy@54937914234b:listeners.go:355` (55 vs 422) |
| GO-ERR-02 | `aquasecurity/trivy@ae561f8cca36:magefiles/vex.go:304` (`err == io.EOF` on a JSON decoder); `grpc/grpc-go@acccf8cd101a:authz/grpc_authz_end2end_test.go:304` |
| GO-ERR-09 | `std-error-handling` preset enabled at `aquasecurity/trivy@ae561f8cca36:.golangci.yaml:201`, `ko-build/ko@fcaeb337b6bd:.golangci.yaml:29`, `sigstore/cosign@907c3d899c0e:.golangci.yml:62`, `caddyserver/caddy@54937914234b:.golangci.yml:73`, `goreleaser/goreleaser@ff8de3d6c389:.golangci.yaml:113`, and in 13 of the 23 configs in total ([gates](go-audit/exemplar-quality-gates.md) §1). `cli/cli@9b031151a825:.golangci.yml:30` comments `errcheck` out entirely. |
| GO-ERR-11/12 | `nilerr`/`nilnil` are enabled by 0 of 23 configs ([pec](go-errors/panics-exits-cleanup.md) exemplar table) |
| GO-ERR-13 | 285 `os.Exit` + 359 `log.Fatal*` outside `main`, led by `golang/tools@d2d3de9f066e` (48+122), `tailscale/tailscale@6b3a45f14ef6` (35+94) and `etcd-io/etcd@7583cc6e7e27` (88+13) |
| GO-ERR-14 | `cli/cli@9b031151a825:api/queries_repo.go:1535` and 107 more non-test sites |
| GO-ERR-19 | `charmbracelet/bubbletea@d5bfd5c2ff74:tea.go:1288` |

Not a counterexample: pebble's 1,148 panics are a documented storage-engine
style (map conflict 8), and it wraps through `github.com/cockroachdb/errors`,
which a stdlib-only audit cannot see.

**New commitments.**
- **OCX Go SDK (library):**
  - GO-ERR-20 fixes the exit-error type, the timeout type and the retry-on-75 contract, with the test from the fixture.
  - Under GO-ERR-16, `*ExitError` does not `Unwrap` to `*exec.ExitError`, and JSON-envelope decode failures are translated to an SDK sentinel. This keeps the "wrapper, not a reimplementation" mechanism swappable ([cfg](go-audit/config-inventory.md) §3).
  - GO-ERR-15: no panics reachable from the 32-name surface.
  - GO-ERR-04: `AsType` throughout, because the floor is go 1.26.0.
- **Go CLIs:**
  - GO-ERR-13 plus EXIT-02: `func main() { os.Exit(run()) }` with no `defer` in `main`, so `run` owns every cleanup.
  - GO-ERR-08 on every write path. Atomic replace itself belongs to GO-IO.
  - GO-ERR-01/02 so that the single rendering boundary (CLI-03, GO-CLI) can classify with `errors.AsType`.
- **Mirrored release artifacts:** no GO-ERR rule applies. The mirror consumes binaries, not source.

## AI-agent failure modes

Ranked by how often each would bite, judged from corpus frequency and how
likely a model is to reproduce the shape.

1. **Bare `defer f.Close()` on a write path.** The v1-era training corpus hid it behind `EXC0001`. Check: `errcheck` under a v2 config without the preset (GO-ERR-08).
2. **`%v` of an error, or `%w` of a dependency's error across an exported boundary.** Checks: `errorlint` (GO-ERR-01) and the reading heuristic (GO-ERR-16).
3. **Reaching for the `std-error-handling` preset because its name sounds right.** Check: `grep -rn --include='*golangci*' -e 'std-error-handling' .` (GO-ERR-09).
4. **`if err == ErrX` or a type switch on `err`.** It compiles, and pre-2019 samples teach it. Check: `errorlint` comparison and asserts (GO-ERR-02).
5. **`log.Fatal`/`os.Exit` in a helper "for convenience", including helpers in `package main`.** Check: revive `deep-exit` explicitly configured, since enabling revive alone gives no coverage (GO-ERR-13).
6. **`strings.Contains(err.Error(), …)`.** Check: the GO-ERR-14 grep.
7. **Panicking to "validate" an argument, or inventing `must()`/`try()`.** Check: the GO-ERR-15 grep plus reading.
8. **Helper returning `*MyErr` whose result flows into an `error` return, exercised only from a table test.** SA4023 then stays silent. Check: SA4023 plus the GO-ERR-05 reading heuristic.
9. **`(nil, nil)` for "not found".** Check: `nilnil` with the tuned `checked-types` (GO-ERR-12).
10. **Assuming `errors.As` on a join finds every match.** Check: the count-asserting test (GO-ERR-18).
11. **`defer startTimer()` without the second `()`.** SA9010 postdates training. Check: staticcheck ≥2026.2 (GO-ERR-06).
12. **Assuming "it compiled" means the `go` line admits `errors.AsType`.** Check: `go vet` `stdversion`, not staticcheck (GO-ERR-04).

## Conflicts resolved

1. **Does `errorf` break the `%v` hiding idiom?** The wrap dive (Contested, `e_twin` flagged) says `errorf` flags the Google-sanctioned idiom. Map conflict 22 says enable `errorf` and `//nolint` the deliberate `%v`.
   - **Decided:** enable `errorf` and flatten with `err.Error()` under `%s`. No nolint is needed.
   - **Evidence:** **[C]** run 1 showed `boundary_twin` at 0 issues, and its test proved the dependency type is hidden.
2. **Is `errorf` on or off by default?** The map and codified §12 say off; the wrap dive observed it on.
   - **Decided:** both are right for different tools. Standalone `go-errorlint` defaults it off. golangci-lint 2.14.0 defaults it on once `errorlint` is enabled.
   - **Evidence:** **[C]** run 1 used a config with no `settings` block.
3. **Is `errorlint`'s `io.EOF` exemption a blind spot?** The wrap dive says so.
   - **Decided:** it is not a linter gap. `io.EOF`'s own doc obliges `Read` to return EOF unwrapped (`io.go:37-38`), so the fix belongs in the reader. This became GO-ERR-03.
4. **Is `errorsas` part of the `errorlint` check?** The map's M-B-04 cell lists "errorlint comparison + asserts, vet errorsas" as one check.
   - **Decided:** they are two axes and both run (GO-ERR-02).
5. **Is golangci-lint dropping ST1005's capitalization check?** The wrap dive reported a divergence.
   - **Decided:** it is `uniq-by-line` dedup of two diagnostics at one position, not a gap.
   - **Evidence:** **[C]** re-ran with `--uniq-by-line=false`.
6. **Does SA4023 miss test-only comparisons?** The wrap dive says so.
   - **Decided:** confirmed. **[C]** ran `-tests=true -checks SA4023` and got exit 0 on `c_violation`.
   - **Consequence:** GO-ERR-05 is backed by SA4023 plus a reading heuristic, never SA4023 alone.
7. **Should `uniq-by-line` be turned off?** The pec dive's candidate rule 3 says set `issues.uniq-by-line: false` when enabling both exit linters.
   - **Decided:** rejected. The two linters overlap only in non-`main` code, where either one suffices. Inside `main` only `exitAfterDefer` fires, and there is no overlap.
   - **Evidence:** **[C]** `exitmain`.
8. **Exits "outside `package main`" or "outside `func main`"?** The map says the former; revive's `deep-exit` enforces the latter.
   - **Decided:** the stricter one, which matches EXIT-02.
   - **Evidence:** **[C]** showed a `fail()` helper flagged and `TestMain` exempt.
9. **Is `defer resp.Body.Close()` an accepted idiom?** The runtime audit §1 calls it accepted. `errcheck` has no such exclusion, and golangci-lint v2 dropped v1's `EXC0001`.
   - **Decided:** exempt it only through the typed `(io.ReadCloser).Close` exclude, and forbid the preset.
   - **Evidence:** [pec](go-errors/panics-exits-cleanup.md) rows 4-5.
10. **Does `nilnil` over-reach?** The pec dive says returning `nil, nil` for a map is fine, but `nilnil`'s defaults flag maps.
    - **Decided:** tune `checked-types` to drop `map`.
    - **Evidence:** **[C]** `nilnilmap`, 2 issues by default and 1 tuned.
11. **Is `(nil, nil)` a MUST?** The map lists `nilnil` as contested; the pec dive says nothing sanctions `(nil, nil)`.
    - **Decided:** SHOULD. No Go-team normative text backs a MUST.
12. **Which receiver kind do typed errors use?** Map conflict 7 says pointer receivers; the wrap dive shows `cli/cli` using a value receiver for a marker.
    - **Decided:** pointer is the default. A value receiver is allowed only for data-less markers matched consistently (GO-ERR-17).
13. **One SDK error type, or one per code?** ocx-sdk-python ships 12 error classes; trivy and the wrap dive use one typed error with a `Code` field.
    - **Decided:** one type. Go has no exhaustive match, so twelve types would mean twelve `AsType` calls (GO-ERR-20).
14. **`wrapcheck`.** The map was silent; the wrap dive measured about 65-75% false positives on a grpc-go sample.
    - **Decided:** not adopted, and no rule rests on it.
15. **Does trivy carry the preset?** The pec dive says trivy carries no `std-error-handling` preset.
    - **Decided:** it does, at `aquasecurity/trivy@ae561f8cca36:.golangci.yaml:201`. The dive's "latent debt or out of scope" puzzle dissolves: the preset hides it.
16. **Which panic count is right, 4,236 or 4,355?** [shape](go-audit/exemplar-code-shape.md) §4 excludes `main` and `_test.go`; [run](go-audit/exemplar-runtime-posture.md) §1 scans every line.
    - **Decided:** both are right for their denominators. Rules cite 4,236.
17. **Citation drift.** The wrap dive cites `exit_code.rs:27-38`. At `ocx@2691d3c1638e` the `Unavailable`/`TempFail` doc comments are lines 32-46.
18. **Is `errorlint` quiet enough to back a MUST?** Map conflict 2 requires ≤1 false positive per 10k LOC. grpc-go shows 801 hits over 143k LOC, but a 0/15 false-positive spot-read.
    - **Decided:** admitted as a MUST, on the finding that the hits are real debt, not noise.
    - The sample size is flagged in Open questions.

## Open questions

**Owner decisions (the program applies the default).**
- **Read-only `*os.File` closes.** `errcheck` still flags `defer f.Close()` on an `os.Open` handle under the `(io.ReadCloser).Close` exclude (**[C]** `roclose/r.go:13:15`, exit 1).
  - **Default:** use GO-ERR-08's `errors.Join` shape for every `*os.File`. That is one shape to teach, with no per-site nolint.
  - **Alternative:** `//nolint:errcheck // read-only`.
- **`nilnil` `--detect-opposite`** (a non-nil value returned together with an error).
  - **Default:** off. Partial-result APIs are legitimate.

**Another research round.**
- **gates/golangci-config: is `errorlint` quiet enough, and does the `err.Error()` idiom change the answer?** The question is `errorlint`'s false-positive rate per 10k LOC on ≥5 exemplars, per map conflict 2.
  - caddy's 462 hits were never spot-read.
  - The rate should be re-measured after rewriting known hiding boundaries to the `err.Error()` idiom, to confirm GO-ERR-01 stays under the threshold.
- **sdk/sdk-surface: what does `*ExitError` carry beyond `Code`?** Candidates are raw `Stderr` or the decoded CLI-04 JSON error envelope, and whether the envelope's stable slug becomes a field.
- **errors/sa4023-upstream: is the test-file blind spot intentional?** If it is fixed upstream, GO-ERR-05's verification collapses to SA4023 alone. The question is the upstream status in `dominikh/go-tools`.

## Sub-artifacts

- [go-errors/wrapping-and-classification.md](go-errors/wrapping-and-classification.md) covers `%w` versus `%v`, dependency leaks, the sentinel, typed and opaque shapes, the SDK exit error, `Is`/`As`/`AsType`, the `errors.Join` first-match limit, typed nil, error strings and in-band errors (M-B-01..08, 11, 17, 18).
- [go-errors/panics-exits-cleanup.md](go-errors/panics-exits-cleanup.md) covers panic policy measured on pebble, exits outside `main`, `_ =` discards, the write-close shape, the golangci-lint v2 exclusion presets, SA9010, `nilerr`/`nilnil`, `recover` placement and the end of `try`/`?` (M-B-09, 10, 12-16, 19).

## Key sources

- https://go.dev/blog/go1.13-errors
- https://pkg.go.dev/errors
- https://go.dev/doc/faq#nil_error
- https://go.dev/wiki/CodeReviewComments#error-strings
- https://google.github.io/styleguide/go/best-practices#error-handling
- https://google.github.io/styleguide/go/decisions#dont-panic
- https://go.dev/doc/effective_go#panic
- https://go.dev/blog/error-syntax
- https://github.com/kubernetes/kubernetes/issues/123234
- https://staticcheck.dev/docs/checks/#SA4023 (and #SA9010)
- https://ldez.github.io/blog/2025/03/23/golangci-lint-v2/
- https://github.com/polyfloyd/go-errorlint
- https://github.com/kisielk/errcheck
- https://github.com/Antonboom/nilnil
- https://github.com/mgechev/revive/blob/master/RULES_DESCRIPTIONS.md#deep-exit

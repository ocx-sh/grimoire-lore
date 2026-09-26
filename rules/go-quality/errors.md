---
title: Errors, Panics, Exits and Closing
summary: The GO-ERR family, owning how Go code wraps, matches, shapes and exposes errors, where it may panic or exit, and how it closes a writable resource
---

# Errors, Panics, Exits and Closing

Owns the error contract: wrapping and matching, the error shapes a package
exports, when a wrapped cause becomes API, where a panic or an exit is allowed,
closing a writable resource, and the typed exit error of an SDK that wraps a
CLI. The exit-code table, the shape of `func main` and the rendering boundary
are `GO-CLI`. Atomic replace and spawning a child are `GO-IO`. Every
golangci-lint config line is `GO-GATE`, so this file names linters and settings
and pastes no YAML. The SDK surface, including its `(nil, nil)` ban and the
timeout check order, is `GO-API`. The context cause mechanism is `GO-CONC`.

Contents: [Dates and Floors](#dates-and-floors) · [Wrapping and Matching](#wrapping-and-matching) ·
[The Declared Floor and AsType](#the-declared-floor-and-astype) ·
[Typed Nil, Deferred Cleanup and Error Strings](#typed-nil-deferred-cleanup-and-error-strings) · [Closing What You Wrote](#closing-what-you-wrote) ·
[Failure Reported as Success](#failure-reported-as-success) · [Where a Process May Exit](#where-a-process-may-exit) ·
[Classifying by Text and Panicking on Input](#classifying-by-text-and-panicking-on-input) ·
[Reading Heuristics and Contract Tests](#reading-heuristics-and-contract-tests) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0 (bundling staticcheck 0.8.1, the 2026.2 line)
and staticcheck 2026.2.1. Every golangci-lint command assumes the repository's v2 config, whose text `GO-GATE` owns.

- **`%w`** is go1.13 and several `%w` in one call is go1.20, both toolchain-gated `fmt` behaviour.
- **`errors.Join`** (go1.20) and **`errors.AsType`** (go1.26) are go-line gated but never compiler-enforced: a `go 1.25` module compiles `AsType` on 1.27, and only `go vet` `stdversion` sees the mismatch, not staticcheck.
- **SA9010** needs staticcheck 2026.2 or later, and an older pin silently
  misses GO-ERR-06.
- **Pinned default:** libraries and SDKs declare `go 1.26.0`, CLIs `go 1.27.0`
  plus a `toolchain` line, so `errors.AsType` is the default form everywhere.
  An adopter with a lower floor overrides this once.

Every grep is a violation locator (empty output, exit 1, is the pass), and every gate was watched red and green except GO-ERR-05's SA4023 layer, whose only green is its `_test.go` blind spot.

## Wrapping and Matching

```bash
golangci-lint run --enable-only=errorlint ./...
go vet ./...
```

Exit 0 with `0 issues.` is the pass. Under golangci-lint v2.14.0 `errorf`,
`comparison` and `asserts` are on by default (standalone `go-errorlint` needs
`-errorf`). Fix findings by hand, never by unattended `--fix` (GO-GATE-21).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-ERR-01 | Wrap with `%w`, and never format an error value with `%v` or `%s`. At a boundary that must hide the cause, flatten explicitly: wrap your own sentinel with `%w` and carry the dependency's text as a string, `fmt.Errorf("%w: %s", ErrOwn, err.Error())`. | A `%v` wrap silently breaks `errors.Is` and `errors.As` for every caller above it, and [kubernetes#123234](https://github.com/kubernetes/kubernetes/issues/123234) is that cost at scale. The flattening idiom passes `errorf` with no `//nolint`, and a test proved it hides the dependency's type. `errorlint` read 0 false positives in 51 hand-checked hits (measured 2026-09-26). | `errorlint` `errorf` (the gate above). Watched red: `non-wrapping format verb for fmt.Errorf`, exit 1. Watched green: the `%w: %s` + `err.Error()` twin, `0 issues.` | MUST |
| GO-ERR-02 | Test errors with `errors.Is`, `errors.As` or `errors.AsType`. Never `==`, a type assertion or a type switch on an error value. | `==` and assertions do not traverse the wrap chain. 222 `err == io.EOF` sites sit in the 35-repository corpus, including one on a JSON decoder. | `errorlint` `comparison` and `asserts`, and separately `go vet` `errorsas`, which validates an `errors.As` target but never finds a missing `errors.As`. Run both. Watched red: `comparing with == will fail on wrapped errors` and `type assertion on error`, exit 1. | MUST |

```go
// wrong: errors.Is(err, ErrParse) is false above this line, and %v drops the chain
return fmt.Errorf("parse: %v", err)

// right: own sentinel reachable, dependency type hidden, no nolint needed
return fmt.Errorf("%w: %s", ErrParse, err.Error())
```

## The Declared Floor and AsType

```bash
go fix -diff ./...
go vet ./...
```

Empty output with exit 0 is the pass for both, and a printed diff is the finding.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-ERR-04 | In a module whose `go` line is 1.26 or higher, call `errors.AsType[*T]` and test its `ok` result, never the `var t *T` plus `errors.As(err, &t)` two-step. Never write `AsType` under a lower `go` line. | The generic form cannot carry a malformed target, and the `errors` package doc says "For most uses, prefer AsType" (go1.27.1). A call below the floor compiles on a newer toolchain and breaks on the older one the `go` line promised. | `go fix -diff ./...` (the `errorsastype` fixer, go1.26+). Watched red: the two-step rewritten in the diff, exit 1. Watched green: the `AsType` twin, empty, exit 0. `go vet ./...` `stdversion` catches `AsType` under a `go 1.25` line (`errors.AsType requires go1.26 or later`, exit 1). | SHOULD |

## Typed Nil, Deferred Cleanup and Error Strings

```bash
golangci-lint run --enable-only=staticcheck ./...
```

Exit 0 with `0 issues.` is the pass. Standalone `staticcheck ./...` also complies.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-ERR-05 | Never return a variable of a concrete pointer error type through an `error` result. Internal helpers return `error`, never `*MyErr`. | A nil `*MyErr` inside an `error` is non-nil ([Go FAQ](https://go.dev/doc/faq#nil_error)), permanently and by design. | Two layers, both mandatory. (a) staticcheck SA4023 (`this comparison is never true`). (b) Reading heuristic: a function whose result type is `*XxxError` and whose value reaches a `return` in a function returning `error` is the finding. SA4023 is blind when the only nil comparison sits in a `_test.go` file: `staticcheck -tests=true -checks SA4023 ./...` exits 0 on that shape (staticcheck 2026.2.1, measured 2026-09-26), so the reading carries the rule there. | MUST |
| GO-ERR-06 | When a function returns its cleanup, defer the call to the returned function: `defer start()()`, never `defer start()`. | The short form runs `start` immediately and throws the cleanup away. SA9010 is new in staticcheck 2026.2 and postdates model training. | staticcheck SA9010, default-on. Watched red: `SA9010: deferred return function not called`, exit 1. Needs staticcheck 2026.2 or later (golangci-lint v2.14.0). | MUST |
| GO-ERR-07 | Error strings start lower-case, carry no trailing punctuation and no "failed to" prefix. `%w` goes at the end, except a sentinel category, which goes first: `fmt.Errorf("%w: bad header", ErrParse)`. | Error strings are concatenated into chains, so a capital, a full stop or a "failed to" repeats at every level. Sources: [CodeReviewComments, Error Strings](https://go.dev/wiki/CodeReviewComments#error-strings), [Google, placement of %w](https://google.github.io/styleguide/go/best-practices#error-percent-w). | staticcheck ST1005 for the string shape. Watched red: both ST1005 diagnostics on one string, exit 1, visible only because `uniq-by-line` is off (GO-GATE-10 in `GO-GATE`). `%w` placement and "failed to" are a reading heuristic. | SHOULD |

```go
// wrong: a nil *ParseError returned through error is non-nil, so err != nil always holds
func check(b []byte) *ParseError { return nil }

// right: the helper speaks error, and nil stays nil
func check(b []byte) error { return nil }
```

## Closing What You Wrote

```bash
golangci-lint run --enable-only=errcheck ./...
grep -rn --include='*golangci*' -E -e '^[^#]*std-error-handling' .
```

The lint passes with `0 issues.`, and the grep passes with empty output.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-ERR-08 | Never drop the `Close`, `Flush` or `Sync` error of a writable file or buffered writer. Declare a named `(err error)` result and write `defer func() { err = errors.Join(err, f.Close()) }()`, and `Flush` a `bufio.Writer` explicitly before returning. Use the same shape for every `*os.File`, read-only ones included. | A failed close on a write path can mean the data never landed. golangci-lint v1 hid bare `defer f.Close()` behind `EXC0001`, and v2 has no default exclusions, so training data teaches the silenced form. One shape for every `*os.File` is one shape to teach. The `//nolint:errcheck // read-only close` fallback applies only where the function has no error result to join into (GO-GATE-20 in `GO-GATE`). | `errcheck`. Watched red: `Error return value of f.Close is not checked`, exit 1, on a write path and on an `os.Open` handle alike. Watched green: the named-return `errors.Join` twin, exit 0. | MUST |
| GO-ERR-09 | Exempt read-only closes only through errcheck's `exclude-functions` entry `(io.ReadCloser).Close`. Never enable the `std-error-handling` exclusion preset, and never add a concrete type such as `(*os.File).Close`. | The preset's `.*Close` and `.*Flush` patterns cannot tell read from write, so it silences exactly GO-ERR-08's defect. 13 of 23 real-world configs carry it, and popularity is not evidence. The interface-typed exclude keeps a written `*os.File` red and clears `resp.Body.Close`. The config text is `GO-GATE`'s (GO-GATE-09, GO-GATE-20). | The grep above, anchored so a comment naming the preset does not false-red. Empty output is the pass. Watched red: a config with `presets: [comments, std-error-handling]`, exit 0 with the hit. Watched green: a compliant config whose comment names the preset, exit 1. | MUST |
| GO-ERR-10 | Call `recover` only in a deferred function at a goroutine or exported-API boundary, and always use its value: log it with `debug.Stack()`, convert it to a returned error, or re-panic. | A swallowed panic hides a violated invariant and leaves the program running in a state its own code declared impossible ([Effective Go, Recover](https://go.dev/doc/effective_go#recover)). | `errcheck` catches a bare uncaptured `recover()` (watched red, exit 1). A captured value that is never used is a reading heuristic. | SHOULD |

```go
// wrong: a failed close on the write path is lost, and the caller sees success
func save(f *os.File, b []byte) error {
	defer f.Close()
	_, err := f.Write(b)
	return err
}

// right: the named result joins the close error
func save(f *os.File, b []byte) (err error) {
	defer func() { err = errors.Join(err, f.Close()) }()
	_, err = f.Write(b)
	return err
}
```

## Failure Reported as Success

```bash
golangci-lint run --enable-only=nilerr,nilnil ./...
```

Neither is in the `standard` set, so the baseline enables both, with `nilnil`'s
`checked-types` minus `map` (`GO-GATE` text). `0 issues.` is the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-ERR-11 | After `if err != nil`, never `return nil`. A deliberate exception carries `//nolint:nilerr // <reason>`. | It reports a failure as success. `nilerr` is a measured signal linter, with zero false positives on the exemplars it fired on. | `nilerr`. Watched red: `error is not nil (line N) but it returns nil`, exit 1. Watched green: the wrapped-return twin, exit 0. | MUST |
| GO-ERR-12 | Signal "not found" or "no result" with a sentinel or typed error, or with `(v, ok)`. Never return `(nil, nil)` for a pointer, interface or func result, and never an in-band `-1` or `""`. A deliberate nil-means-absent API carries `//nolint:nilnil // <reason>`, which is the stated reason a SHOULD accepts. | A caller that checks only `err` dereferences nil ([CodeReviewComments, In-Band Errors](https://go.dev/wiki/CodeReviewComments#in-band-errors)). A nil map is a valid empty read-only value, like a nil slice, so `map` is not a checked type. An SDK's exported surface is stricter and never returns `(nil, nil)` at all (GO-API-09 in `GO-API`). | `nilnil` with the tuned `checked-types`. Watched red: `return both a nil error and an invalid value`, exit 1. Watched green: the sentinel twin, exit 0. In-band values are a reading heuristic. | SHOULD |

## Where a Process May Exit

```bash
golangci-lint run --enable-only=revive,gocritic ./...
```

`--enable-only` keeps the config's settings: revive needs an explicit rules list with
`deep-exit` (its defaults lack it), and gocritic `exitAfterDefer` sits in the CLI
overlay, where `func main` lives (GO-GATE-15, GO-GATE-18). `0 issues.` is the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-ERR-13 | Call `os.Exit` and `log.Fatal*` only from `func main` (and `TestMain`), never after a `defer` in `main`, and never from a helper, including a `fail()` helper inside `package main`. Library and SDK code makes no process decision at all. The CLI's `main` shape itself is GO-CLI-02 (`GO-CLI`). | Both calls skip every pending `defer` in every goroutine, so cleanup and flushes silently vanish. The corpus has 285 `os.Exit` and 359 `log.Fatal*` calls outside `main`. | revive `deep-exit` in every module (baseline) and gocritic `exitAfterDefer` in CLI modules (overlay). Watched red: `deep-exit: calls to log.Fatal only in main() or init() functions` in a library, `deep-exit` on a `fail()` helper in `package main`, and `exitAfterDefer: os.Exit will exit, and ... will not run` in `main`, exit 1. Watched green: `main` returning `run()`'s code with no exit in a helper, exit 0. `TestMain`'s `os.Exit(m.Run())` is not flagged. | MUST |

## Classifying by Text and Panicking on Input

Both greps locate sites to read, and empty output is the pass.

```bash
grep -rn --include='*.go' -e 'strings\.Contains(.*\.Error()' -e 'strings\.HasPrefix(.*\.Error()' \
  -e 'strings\.HasSuffix(.*\.Error()' -e 'strings\.EqualFold(.*\.Error()' \
  -e 'strings\.Index(.*\.Error()' -e 'MatchString(.*\.Error()' .
grep -rn --include='*.go' --exclude='*_test.go' -e 'panic(' -e 'func must(' -e 'func try(' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-ERR-14 | Never classify an error by its text: no `strings.Contains`, `HasPrefix`, `HasSuffix`, `EqualFold` or `Index`, and no `MatchString`, over `err.Error()`. Match a sentinel or type (GO-ERR-02). | A dependency rewording its message silently flips the branch. Google's style guide uses exactly this as its "Bad" example ([Error structure](https://google.github.io/styleguide/go/best-practices#error-structure)), and the corpus holds 108 non-test sites. | The first grep above. Any hit is the finding. Watched red: `strings.Contains(err.Error(), ...)` and a compiled regexp's `MatchString(err.Error())`, exit 0 with hits. Watched green: the `errors.Is` twin, empty, exit 1. | MUST |
| GO-ERR-15 | Library and SDK code panics only for a violated internal invariant or programmer misuse (use after `Close`, a registration error at `init`, `Must*` over a compile-time constant), never on a value that arrived through an exported parameter. Never add a project-local `must()` or `try()` over runtime values. | A panic on input takes down the caller's process for a condition an `error` would let it handle ([Google, Don't panic](https://google.github.io/styleguide/go/decisions#dont-panic)). The Go team stopped pursuing new error syntax in June 2025 ([error-syntax](https://go.dev/blog/error-syntax)), so a home-made `try` is permanent private dialect. No linter separates the cases: vet, staticcheck, errcheck, revive, gocritic, gosec, nilerr and nilnil all reported 0 on the planted violations. | The second grep above, then read each hit outside `package main`. Pass if the argument traces to an invariant constructor, a sentinel or a constant. The finding is an argument that traces to a parameter, or any `must`/`try` helper. Watched red: `panic("negative")` on a parameter and a `func must(`, exit 0 with hits. Watched green: the error-returning twin, empty, exit 1. | MUST |

## Reading Heuristics and Contract Tests

No linter carries these rows. GO-ERR-03 and GO-ERR-16 are MUST on normative text alone.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-ERR-03 | An `io.Reader` implementation returns `io.EOF` itself, never wrapped. | The `io` package doc (go1.27.1): "Read must return EOF itself, not an error wrapping EOF, because callers will test for EOF using ==". `errorlint` exempts `== io.EOF` on `io.Reader` calls on purpose, so the defect is the wrapping reader, not the caller, and `errorlint` reports 0 on it. | Reading heuristic: a `Read` method whose error path wraps without an `if err == io.EOF { return n, err }` passthrough is the finding. | MUST |
| GO-ERR-16 | An exported function never `%w`-wraps an error that came from another module unless its doc comment names that error as part of the contract. Otherwise translate to your own sentinel with GO-ERR-01's flattening. | `%w` makes the dependency's type reachable through `errors.As`, so it becomes your API ([Working with Errors in Go 1.13](https://go.dev/blog/go1.13-errors): "do not wrap an error when doing so would expose implementation details"). For an SDK wrapping a CLI, its `*ExitError` never unwraps to `*exec.ExitError` and an output-decode failure becomes an SDK sentinel, which keeps the wrapped mechanism swappable. | Reading heuristic: an exported function body that applies `%w` to a value returned by a call into another module, with no doc comment naming it, is the finding. No tool can tell intent: `errorlint` passes it and `wrapcheck` checks the opposite failure. Behavioural proof: `errors.AsType[*json.SyntaxError]` succeeds through the violation and fails through the twin. | MUST |
| GO-ERR-17 | Export sentinels for data-less conditions and typed errors for conditions that carry data. A typed error uses a pointer receiver, plus `Unwrap` when it carries a cause. A value receiver is allowed only for an immutable, data-less marker, and each type is matched with one receiver kind everywhere. | Matching `*T` in one place and `T` in another silently misses. | Reading heuristic: every `errors.AsType[...]` call for one type uses the same pointer or value form. | SHOULD |
| GO-ERR-18 | Where a value may be an `errors.Join` result and every match matters, walk `Unwrap() []error`. `errors.As` and `errors.AsType` return only the first match. | A batch validator built on `errors.As` silently reports one failure out of N. | A table test that joins two errors of the same type and asserts the count is 2. The planted violation found 1 of 2 and the twin 2 of 2. | SHOULD |
| GO-ERR-19 | Handle each error once: return it wrapped, or log it and continue, never both. A deliberate discard is an explicit `_ =` with a reason comment, unless the call can fail only on programmer error. | Logging and returning prints every failure N times. A silent discard on a user-visible path, such as a failed terminal restore, hides a real failure. errcheck flags `defer os.Remove(p)`, and its compliant form is `defer func() { _ = os.Remove(p) }() // best-effort temp cleanup` (golangci-lint v2.14.0, measured 2026-09-26), never in a function that renames the file (GO-IO-12). | Reading heuristic, since no linter enforces handle-once. errcheck's `check-blank` stays off: about a third of sampled `_ =` sites are not error discards at all. | SHOULD |
| GO-ERR-20 | **pinned** An SDK that wraps a CLI surfaces every non-zero exit as one exported `*ExitError` carrying `Code ExitCode`, never one type per code. A timeout or kill-before-reap is a separate `*TimeoutError` that never matches `*ExitError`, and it is also the cause passed to `context.WithTimeoutCause`, with the SDK's exported timeout sentinel as its `Is` target. The retry predicate returns true for 75 (`EX_TEMPFAIL`) only, never 69 (`EX_UNAVAILABLE`). Pinned default: the wrapped CLI is `ocx`, its sentinel is `ErrOcxTimeout`, and its codes follow sysexits. The adopter renames the CLI, the sentinel and the table once, and keeps the shape. | Go has no exhaustive match, so one type per code would mean one `AsType` call per code at every site. The wrapped CLI documents 69 as "rerunning the same command will not change the outcome" and 75 as the one code where automated retry is safe. A bare sentinel as the timeout cause passes `errors.Is` and fails `errors.AsType[*TimeoutError]`, so a suite using only `Is` never notices. The order of checks (context cause before exit classification) is GO-API-20 (`GO-API`). | A contract test shipped with the SDK: every code is reachable through `errors.AsType[*ExitError]` after a `%w` wrap, `Retryable` equals `code == 75`, and a wrapped `*TimeoutError` does not match `*ExitError`. Watched red: a timeout embedding `ExitError` plus a predicate retrying 69 gave `Retryable(code 69) = true, want false` and `*TimeoutError matched *ExitError`, exit 1. Watched green: the twin, `ok`. | MUST (SDK) |

## What Agents Get Wrong Here

Ranked by how often each would bite, from corpus frequency and how readily a model reproduces it.

1. **Bare `defer f.Close()` on a write path.** The v1-era corpus hid it behind `EXC0001` (GO-ERR-08).
2. **`%v` of an error, or `%w` of a dependency's error across an exported boundary** (GO-ERR-01, GO-ERR-16).
3. **Enabling `std-error-handling`, or adding `(*os.File).Close` to `exclude-functions`** (GO-ERR-09).
4. **`if err == ErrX`, or a type switch on `err`.** Pre-2019 samples teach it (GO-ERR-02).
5. **`log.Fatal` or `os.Exit` in a helper, even in `package main`**, or revive without a rules list (GO-ERR-13).
6. **`strings.Contains(err.Error(), ...)`** to branch on a condition (GO-ERR-14).
7. **Panicking to "validate" an argument, or inventing `must()` or `try()`** (GO-ERR-15).
8. **A `*MyErr` helper flowing into an `error` return, tested only from `_test.go`**, where SA4023 is silent (GO-ERR-05).
9. **`(nil, nil)` for "not found"** (GO-ERR-12).
10. **Assuming `errors.As` on a join finds every match** (GO-ERR-18).
11. **`defer startTimer()` without the second `()`.** SA9010 postdates training (GO-ERR-06).
12. **Taking "it compiled" to mean the `go` line admits `errors.AsType`** (GO-ERR-04).

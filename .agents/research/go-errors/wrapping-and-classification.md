---
title: "The error contract: wrapping, matching, exported error shapes, and the SDK's typed exit error"
topic: go-errors/wrapping-and-classification
agent: go-errors/wrapping-and-classification
model: sonnet
date_researched: 2026-09-26
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/wrapping-and-classification/
scope: >
  Covers topic-map rows M-B-01..08, M-B-11, M-B-17, M-B-18: %w-vs-%v placement,
  wrapping a dependency's error into an exported API, sentinel/typed/opaque
  error shapes and the OCX SDK's typed exit error, ==/type-assert vs
  errors.Is/As/AsType, errors.Join composition and matching, the typed-nil
  interface bug, error-string convention, in-band failure signals, and
  correct custom-error-type implementation. Does NOT cover errors.Join vs
  hashicorp/go-multierror adoption details beyond M-B-07, panic/os.Exit
  discipline (M-B-13/14), nilerr/nilnil (M-B-10), defer-return-value bugs
  (M-B-15), or recover placement (M-B-19) — those are other GO-ERR rows.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [%w vs %v: the wrapping-scheme boundary](#1-w-vs-v-the-wrapping-scheme-boundary) (M-B-01)
   2. [When %w leaks a dependency into your API](#2-when-w-leaks-a-dependency-into-your-api) (M-B-02)
   3. [Sentinel, typed, opaque — and the SDK's typed exit error](#3-sentinel-typed-opaque--and-the-sdks-typed-exit-error) (M-B-03)
   4. [== and type assertions vs Is/As](#4--and-type-assertions-vs-isas) (M-B-04)
   5. [Message-string matching](#5-message-string-matching) (M-B-05)
   6. [errors.AsType and the go-line trap](#6-errorsastype-and-the-go-line-trap) (M-B-06)
   7. [errors.Join and the first-match limit of As](#7-errorsjoin-and-the-first-match-limit-of-as) (M-B-07)
   8. [The typed-nil interface bug](#8-the-typed-nil-interface-bug) (M-B-08)
   9. [Error-string convention and %w placement](#9-error-string-convention-and-w-placement) (M-B-11)
   10. [In-band failure signals](#10-in-band-failure-signals) (M-B-17)
   11. [Implementing a custom error type correctly](#11-implementing-a-custom-error-type-correctly) (M-B-18)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `%w` is the default verb in `fmt.Errorf`; `%v` is a deliberate, documented choice, never a default — [go.dev/blog/go1.13-errors](https://go.dev/blog/go1.13-errors), confirmed by measurement: 9,310 `%w` vs 2,300 `%v`-of-err corpus-wide, `grpc/grpc-go` inverted 16:1.
- Wrapping a dependency's error with `%w` from an **exported** function makes that dependency's concrete error type part of your API (Hyrum's Law) whether you intended it or not — verified on a planted fixture: `errors.As` reaches `*json.SyntaxError` straight through an unrelated package's `%w` wrap.
- Google's own style guide explicitly sanctions `%v` at RPC/IPC/storage boundaries specifically to avoid this leak — this directly contradicts naively enabling errorlint's `errorf` check as an unconditional MUST (see Contested).
- `errorlint`'s `errorf` check (opt-in, `errorf: true`) is too blunt to allow the "wrap your own sentinel with `%w`, translate the dependency detail with `%v`" idiom Google itself recommends: it flags the `%v` half of exactly that pattern — verified on a planted fixture (`e_twin`).
- `errorlint`'s `err == io.EOF` exemption is keyed to the **static type** of the call (`io.Reader`), not the concrete implementation — it misses a custom reader that silently wraps `io.EOF`, verified by a planted fixture that errorlint reported 0 issues on, while an identical comparison against a non-`io.Reader`-typed stream method (`grpc-go`'s `stream.Recv()`) *is* flagged in the wild.
- `errors.AsType[E](err) (E, bool)` (Go 1.26) replaces the `var t *T; errors.As(err, &t)` two-step; it is already in production at `cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212`.
- A module can call `errors.AsType` while declaring `go 1.25` and it will **compile fine on a 1.27 toolchain** — API availability is not gated by the module's `go` line the way language builtins are — but `go vet`'s `stdversion` analyzer catches the real hazard: `errors.AsType requires go1.26 or later (module is go1.25)`, exit 1. `staticcheck` 2026.2.1 does **not** catch it (exit 0). Verified on a planted fixture, both tools, both directions.
- `errors.As` on an `errors.Join` result returns only the **first** matching member in the tree, silently dropping every subsequent match — no analyzer catches this; it is a behavior contract, not a static-analysis target. Verified on a planted fixture: a 2-member join surfaces 1 of 2.
- A typed-nil concrete error (`*MyErr` nil, assigned through an intermediate variable, returned as `error`) always produces a non-nil `error` interface — [go.dev/doc/faq#nil_error](https://go.dev/doc/faq). `staticcheck` SA4023 catches this **only when the nil-comparison itself is a direct call expression in a non-test `.go` file**; the identical comparison inside a `_test.go` file is silently missed. Verified three ways on planted fixtures (direct call in prod code: caught; via a variable in prod code: caught; either form in `_test.go`: missed).
- `strings.Contains(err.Error(), …)` for error classification is explicitly the "Bad" example in Google's own style guide (`regexp.MatchString` on `err.Error()`); it is brittle across dependency message rewordings — 91 corpus hits, concentrated in `etcd`, `tailscale`, `containerd`.
- Error strings must not be capitalized and must not end in punctuation — `staticcheck` ST1005, verified: fires on both violations in one call, exit 1.
- `%w` goes at the **end** of the format string by default (so the printed chain reads newest-to-oldest, matching traversal order); the one exception is a sentinel category, where `%w` goes at the **front** so the category reads first — [Google Best Practices §Placement of %w](https://google.github.io/styleguide/go/best-practices#error-percent-w).
- In-band failure signals (`-1`, `""`, a nil map) belong to C-style APIs, not Go; return `(value, ok)` or `(value, error)` instead — [Code Review Comments §In-Band Errors](https://go.dev/wiki/CodeReviewComments#in-band-errors).
- A custom error type does not always need a pointer receiver: `cli/cli` uses a pointer receiver with `Unwrap() error` for `*FlagError` (carries a wrapped cause) and a plain value receiver with no `Unwrap` for `NoResultsError` (an immutable, data-light marker) in the same file — both are correct, for different reasons.
- The OCX Go SDK's typed exit error should be **one exported `*ExitError` struct carrying a `Code ExitCode` field**, not one Go type per exit code — this mirrors `aquasecurity/trivy@ae561f8cca36:pkg/types/error.go:7-13` exactly and avoids needing 12+ `errors.AsType` calls to distinguish codes Rust's exhaustive-enum match gets for free.
- A **separate, non-`*ExitError` type** is required for "the child process never got a chance to exit" (timeout, kill-before-reap) — mirrored from `ocx-sdk-python`'s `OcxTimeoutError`, which is deliberately *not* an `OcxProcessError` subtype so it is never retried by the exit-code-keyed retry classifier (`_process.py`'s `_retryable`).
- The `TempFail` (75)-only retry policy belongs in the SDK, keyed on `ExitError.Code`, mirroring `ocx_exit::ExitCode::TempFail`'s own doc comment ("the same command may succeed if it is run again") against `Unavailable` (69)'s ("rerunning… will not change the outcome") — never retry on `Unavailable`.
- `go vet`'s `errorsas` analyzer and `errorlint`'s `asserts`/`comparison` checks solve **different** problems and are frequently conflated: `errorsas` only catches a malformed call to `errors.As` itself (wrong target type); it does not detect "you should have used `errors.As` here at all" — that is errorlint's job. Verified on a planted fixture.
- `wrapcheck`'s default behavior flags every bare `return err` from an external-package or interface-method call, including the Go-team-sanctioned "return as-is when there is no context to add" idiom and pure decorator/delegation methods that implement the very interface they call through — spot-read of 13 `grpc-go` hits found roughly 8–10 judged false positives by that standard (methodology and caveats in Findings §2 and Verification runs).

## Findings

### 1. %w vs %v: the wrapping-scheme boundary

Since Go 1.13, `fmt.Errorf`'s `%w` verb makes the wrapped error satisfy an
`Unwrap() error` method, so `errors.Is`/`errors.As` can see through it; `%v`
formats the error's string and discards the value — [go.dev/blog/go1.13-errors](https://go.dev/blog/go1.13-errors):
"Wrap an error to expose it to callers. Do not wrap an error when doing so
would expose implementation details." A `%v`-wrapped sentinel is invisible to
every caller above it, no matter how many layers up they check:

```go
// BAD — do.go: the sentinel is swallowed
var ErrNotFound = errors.New("not found")
func Do(ok bool) error {
    if err := lookup(ok); err != nil {
        return fmt.Errorf("do: %v", err) // errors.Is(Do(ok), ErrNotFound) is now always false
    }
    return nil
}

// GOOD — same shape, %w
func Do(ok bool) error {
    if err := lookup(ok); err != nil {
        return fmt.Errorf("do: %w", err)
    }
    return nil
}
```
(fixture: `a_violation` / `a_twin`, verified — see Verification runs §a)

Measured: 9,310 `%w` vs 2,300 `%v`-of-err corpus-wide (35 repos, after fixing
a classifier bug that conflated `%s`+`%w` calls — [go-audit/exemplar-runtime-posture.md §1](../go-audit/exemplar-runtime-posture.md#1-errors)).
`grpc/grpc-go` is the worst-ratio offender (21 `%w` vs 332 `%v`-of-err),
e.g. `grpc/grpc-go@acccf8cd101a:clientconn.go:326`
(`fmt.Errorf("%v: %v", ctx.Err(), err)`) — both operands are errors, neither
wrapped, so a caller cannot `errors.Is` against either `ctx.Err()`'s sentinel
or the underlying cause. `caddyserver/caddy@54937914234b:listeners.go:355`
has the same shape. [kubernetes/kubernetes#123234](https://github.com/kubernetes/kubernetes/issues/123234)
is an open tracking issue asking Kubernetes to migrate its own `%v`-majority
codebase to `%w` for exactly this reason.

`errorlint`'s `errorf` check (`-errorf`, disabled by default in the
standalone tool per its own README, but observed enabled by default under
`golangci-lint 2.14.0`'s wrapper with a bare `--no-config` run — see
Verification runs) flags every `%v`/`%s` of an `err`-shaped argument. It is
**not selective**: it also flags the deliberate-opacity idiom (Finding 2),
which is a real false-positive surface, not a hypothetical one (verified,
`e_twin`).

### 2. When %w leaks a dependency into your API

[Google Best Practices §Adding information to errors](https://google.github.io/styleguide/go/best-practices#adding-information-to-errors)
gives the canonical framing: `%w` is for "adding context while preserving the
original error for programmatic inspection… the primary use case within
helpers of your application," while `%v` is for "creating fresh, independent
errors… particularly beneficial at system boundaries, including but not
limited to RPC, IPC, and storage, where we translate domain-specific errors
into a canonical error space." A boundary that wraps with `%w` anyway makes
the dependency's concrete error type reachable through your exported
function, even though your doc comment never promised that:

```go
// BAD — e_violation: exported Load leaks encoding/json's error type
func Load(data []byte, v any) error {
    if err := json.Unmarshal(data, v); err != nil {
        return fmt.Errorf("load: %w", err) // *json.SyntaxError now reachable via errors.As(Load(...), &syntaxErr)
    }
    return nil
}

// GOOD — e_twin: translate to an own sentinel; %v still gives detail
var ErrInvalidData = errors.New("invalid data")
func Load(data []byte, v any) error {
    if err := json.Unmarshal(data, v); err != nil {
        return fmt.Errorf("%w: %v", ErrInvalidData, err)
    }
    return nil
}
```
Verified: `errors.As(Load(bad), &syntaxErr)` succeeds against `e_violation`
and fails (correctly) against `e_twin` (see Verification runs §e).

No analyzer in the roster catches this — `wrapcheck` fires on the *absence*
of any wrap, the opposite failure mode, and does not fire on either `e_violation`
or `e_twin` in this test (both already wrap something). This row is a reading
heuristic only: an exported function's `%w` of a value coming from an import
outside the package's own module, whose doc comment does not name the
dependency's error type as part of the contract.

`cli/cli@9b031151a825:pkg/cmdutil/errors.go` shows the disciplined version at
scale: `FlagError.Unwrap()` re-exposes an internal cause deliberately (it is
part of the documented contract — "causes the application to display the
usage message"), while `SilentError`/`CancelError`/`PendingError` are
unparameterized sentinels with no wrapped payload at all, so there is nothing
to leak.

### 3. Sentinel, typed, opaque — and the SDK's typed exit error

[Google Best Practices §Error structure](https://google.github.io/styleguide/go/best-practices#error-structure):
give an error structure "if callers need to interrogate the error… rather
than having the caller perform string matching." Three shapes, in order of
increasing caller coupling:

- **Sentinel** (`var ErrX = errors.New(...)`) — a condition with no data,
  matched with `errors.Is`.
- **Typed** (`type XError struct{...}`) — a condition with data (an exit
  code, a path, a field name), matched with `errors.As`/`errors.AsType`.
- **Opaque** ([dave.cheney.net/2016/04/27](https://dave.cheney.net/2016/04/27/dont-just-check-errors-handle-them-gracefully)) —
  assert a *behavior* interface (`type temporary interface{ Temporary() bool }`)
  without importing the defining package at all. Cheney's stricter position
  — no error *types* in a public API — is rejected here whenever the caller
  genuinely needs data the behavior interface cannot carry (an exit code is
  data, not a behavior).

**The SDK's typed exit error — decision.** One exported struct, not one type
per code:

```go
type ExitCode int

const (
    ExitSuccess         ExitCode = 0
    ExitFailure         ExitCode = 1
    ExitUsageError      ExitCode = 64
    // ... mirrors ocx_exit::ExitCode exactly, including the numeric gaps
)

type ExitError struct {
    Code   ExitCode
    Stderr string
    Stdout string // present when the sweep produced output before failing
}

func (e *ExitError) Error() string { return fmt.Sprintf("ocx exited %d", e.Code) }
```

Rationale: `aquasecurity/trivy@ae561f8cca36:pkg/types/error.go:7-13` ships
exactly this shape (`ExitError{ Code int }`), proven at scale in a real CLI.
One-type-per-code (`ocx-sdk-python`'s 12 typed classes, `_process.py:825`:
`_EXIT_CODE_ERRORS.get(code, OcxProcessError)`) is the right call in Python,
where `except OcxNotFoundError:` reads naturally — but Go has no exhaustive
`match` on a closed sum type (the same gap the config-inventory audit flagged
for `EXIT-07`, [config-inventory.md §4](../go-audit/config-inventory.md#4-the-cli-contract-to-mirror)),
so 12+ Go types would need 12+ separate `errors.AsType` calls where a single
`switch err.Code { ... }` on one type does the same job with less ceremony
and matches `cli/cli`'s own numeric-taxonomy dispatch style
(`internal/ghcmd/cmd.go:41-49`).

A **second, distinct type** is required for the case that is not a process
exit at all:

```go
type TimeoutError struct {
    Elapsed time.Duration
}
func (e *TimeoutError) Error() string { return fmt.Sprintf("ocx timed out after %s", e.Elapsed) }
```

`ocx-sdk-python`'s `_process.py`'s `_retryable` function's own comment is
explicit about why: *"`OcxTimeoutError` is not an `OcxProcessError`, which is
how a timeout stays unretried by default however `retry_on` is configured."*
A `*TimeoutError` must never satisfy `errors.As(err, &exitErr)`.

**Retry policy.** Key the retry classifier on `ExitError.Code`, matching
`ocx-sdk-python`'s `_types.py:289` (`retry_on: frozenset[ExitCode] =
frozenset({ExitCode.TEMP_FAIL})`) and the Rust doc comments at
`ocx/crates/ocx_exit/src/exit_code.rs:34-38` (`TempFail`, 75: "the same
command may succeed if it is run again") versus lines 27-32 (`Unavailable`,
69: "Rerunning the same command will not change the outcome — that is what
separates this from `TempFail`"). **Only `TempFail` (75) is retryable**;
`Unavailable` (69) must never be, even though both sound like "the network is
down" at a glance — the distinction is deliberate policy in the exit-code
design, and a Go retry helper that groups them would silently violate the
contract the codes were designed to express.

Callers match with `errors.AsType[*ExitError](err)` (go ≥1.26 — see Finding 6)
or the two-step `var exitErr *ExitError; errors.As(err, &exitErr)` on go
1.25 modules.

### 4. == and type assertions vs Is/As

[go.dev/blog/go1.13-errors](https://go.dev/blog/go1.13-errors): "Instead of
type assertion… use `errors.As`… Similarly, use `errors.Is`" in place of `==`.
`errorlint`'s `comparison` and `asserts` checks (**enabled by default** —
unlike `errorf`) rewrite exactly this:

```go
// bad (errorlint: comparison)
if err == ErrFoo { ... }
// good
if errors.Is(err, ErrFoo) { ... }

// bad (errorlint: asserts)
if myErr, ok := err.(*MyError); ok { ... }
// good
var me *MyError
if errors.As(err, &me) { ... }
```

**A verified blind spot**: `errorlint`'s built-in `io.EOF`/`sql.ErrNoRows`
exemption is keyed to the **static type** of the call expression (an
`io.Reader`), not to whether the concrete value actually returns an unwrapped
`io.EOF`. A custom reader that wraps every error including `EOF` and is
called through a parameter typed `io.Reader` is *not* flagged, even though
the comparison genuinely breaks:

```go
type wrappingReader struct{ r io.Reader }
func (w *wrappingReader) Read(p []byte) (int, error) {
    n, err := w.r.Read(p)
    if err != nil {
        return n, fmt.Errorf("wrappingReader: %w", err) // wraps EOF too
    }
    return n, nil
}
func ReadAll(r io.Reader) error { // r is statically io.Reader
    for {
        _, err := r.Read(buf)
        if err == io.EOF { return nil } // errorlint: 0 issues — exempted by r's static type
        ...
    }
}
```
`golangci-lint run --enable-only=errorlint` on this fixture: **0 issues**.
Contrast with production code where the comparison is against a
non-`io.Reader`-shaped method: `grpc/grpc-go@acccf8cd101a:authz/grpc_authz_end2end_test.go:304`
(`if err == io.EOF` on a gRPC `stream.Recv()`, which is *not* statically
`io.Reader`) **is** flagged by the identical linter run. This is a real gap
for any hand-rolled `io.Reader`/`io.Writer`-shaped wrapper — the analyzer
trusts the interface, not the implementation. (fixture: `b_violation`/`b_twin`,
verified — see Verification runs §b)

`go vet`'s `errorsas` analyzer is a **different check** from either of the
above: it only validates the *call itself* to `errors.As` — "second argument
to errors.As must be a non-nil pointer to either a type that implements
error, or to any interface type." It fires on `errors.As(err, target)` where
`target` is a value, not a pointer; it does **not** fire on `err ==
ErrFoo` or `err.(*MyError)` — those are errorlint's job, not vet's. This
distinction is easy to conflate (the topic map's own citation cell for this
row reads "check errorlint comparison + asserts, vet errorsas" as if they
were one check on one axis; they are two checks on two different axes).
Verified: `go vet` on `var target MyErr; errors.As(err, target)` (missing
`&`) → `errorsas-probe/p.go:11:9: second argument to errors.As must be a
non-nil pointer…`, exit 1.

### 5. Message-string matching

`if strings.Contains(err.Error(), "...")` classifies an error by its
rendered text, which breaks the moment a dependency reworks its message.
[Google Best Practices §Error structure](https://google.github.io/styleguide/go/best-practices#error-structure)
gives this as its own "Bad" example verbatim:

```go
// Bad:
func handlePet(...) {
    err := process(an)
    if regexp.MatchString(`duplicate`, err.Error()) {...}
    if regexp.MatchString(`marsupial`, err.Error()) {...}
}
```

91 hits corpus-wide, concentrated in `etcd-io/etcd` (21), `tailscale/tailscale`
(18), `containerd/containerd` (14) — e.g.
`cli/cli@9b031151a825:api/queries_repo.go:1535`
(`!strings.Contains(err.Error(), errorResolvingOrganization)`). No analyzer
in the standard roster catches this directly (it is a normal string
operation, indistinguishable at the AST level from any other `Contains`
call); the reading heuristic is `\.Error\(\)` appearing as an argument inside
a `strings.` or `regexp.` call.

### 6. errors.AsType and the go-line trap

[pkg.go.dev/errors](https://pkg.go.dev/errors) (Go 1.26): `func AsType[E
error](err error) (E, bool)` — "Finds the first error in err's tree that
matches the type E… Recommended over `As` for most uses," replacing:

```go
// old (go <1.26, or a module whose go line is <1.26)
var t *MyErr
if errors.As(err, &t) { ... }

// new (go >=1.26 module)
if t, ok := errors.AsType[*MyErr](err); ok { ... }
```
Already in production at `cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212`
— four separate `errors.AsType[...]` dispatches in the CLI's exit-code
router, exact lines confirmed by reading the file.

**Verified, non-obvious**: a module declaring `go 1.25` that calls
`errors.AsType` **compiles successfully** on the 1.27.1 toolchain used here —
stdlib API availability is not gated by the module's `go` line the way
language builtins (`min`, `max`, generic type aliases) are. The real,
catchable hazard is different: `go vet`'s `stdversion` analyzer flags it
directly —

```
$ go vet ./...
f.go:10:18: errors.AsType requires go1.26 or later (module is go1.25)
```
exit 1 on the `go 1.25` fixture, exit 0 on the identical code with `go 1.26`.
**`staticcheck` 2026.2.1 does not catch this at all** (exit 0 on the same
violation) — a real gap between the two tools on this exact check. (fixture:
`f_violation`/`f_twin`, verified — see Verification runs §f)

### 7. errors.Join and the first-match limit of As

[pkg.go.dev/errors](https://pkg.go.dev/errors): `errors.Join(errs...)`
"discards nil errors" and returns a value implementing `Unwrap() []error`.
`errors.As` walks this tree but **returns only the first match**:

```go
joined := errors.Join(&ValidationErr{Field: "name"}, &ValidationErr{Field: "email"})
var target *ValidationErr
errors.As(joined, &target) // target.Field == "name" — "email" is silently gone
```
Verified: a naive `CollectFieldErrors` built on a single `errors.As` call
surfaces 1 of 2 members; the fix walks the tree's `Unwrap() []error`
explicitly and finds both (fixture: `d_violation`/`d_twin`, both `go test`
green — see Verification runs §d). No analyzer flags the naive version; this
is a pure behavior-contract row, worth a code-comment at every call site that
only checks one `errors.As` against a value that might be a join.

`cockroachdb/pebble@13596f1e1cea:open.go:867` (`return errors.Join(errs...)`)
composes multiple independent replay/verify failures — but note pebble
imports `github.com/cockroachdb/errors`, not the stdlib `errors` package
(`open.go:18`), so this specific call is the third-party library's
API-compatible `Join`, not stdlib's; treat it as a pattern citation, not a
stdlib-`errors.Join` citation. 443 corpus-wide `errors.Join` sites overall.
`hashicorp/go-multierror` is still a direct dependency in 2/35 repos — a
pre-`errors.Join` (pre-1.20) holdover, not a new adoption.

### 8. The typed-nil interface bug

[go.dev/doc/faq#nil_error](https://go.dev/doc/faq): "If we store a `nil`
pointer of type `*int` inside an interface value, the inner type will be
`*int` regardless of the value of the pointer… Such an interface value will
therefore be non-`nil` *even when the pointer value V inside is* `nil`." The
FAQ's own remediation: "It's a good idea for functions that return errors
always to use the `error` type in their signature… rather than a concrete
type such as `*MyError`." That advice covers the *exported* function's own
signature; the bug still reaches it through an *internal* helper with a
concrete return type:

```go
// BAD — c_violation
func doWork(fail bool) *MyErr { if fail { return &MyErr{...} }; return nil }
func Do(fail bool) error {
    err := doWork(fail) // err's static type is *MyErr
    return err          // always non-nil as an `error` interface
}

// GOOD — c_twin
func Do(fail bool) error {
    err := doWork(fail)
    if err == nil { return nil } // explicit at the interface boundary
    return err
}
```

**`staticcheck` SA4023 has a verified, precise blind spot**: it fires only
when the nil-comparison of the call itself appears in a **non-test** `.go`
file:

| comparison site | form | SA4023 fires? |
|---|---|---|
| `if returnsError() == nil` in `p.go` | direct call | **yes** |
| `err := Do(false); return err == nil` in `p.go` | via variable | **yes** |
| `if Do(false) == nil` in `_test.go` | direct call | **no** |
| `err := Do(false); if err == nil` in `_test.go` | via variable | **no** |

All four verified on planted fixtures with identical production code and
only the comparison's location/form changed (see Verification runs §c). This
means a bug that is only ever exercised through a table-driven test's own
`if err == nil` assertion — a common shape — will not be caught by
`staticcheck` at all, in either standalone or `golangci-lint`-wrapped form.

### 9. Error-string convention and %w placement

[Code Review Comments §Error Strings](https://go.dev/wiki/CodeReviewComments#error-strings):
"Error strings should not be capitalized… or end with punctuation, since they
are usually printed following other context." `staticcheck` ST1005 enforces
both halves; verified: `errors.New("Something bad happened.")` →

```
p.go:6:9: error strings should not be capitalized (ST1005)
p.go:6:9: error strings should not end with punctuation or newlines (ST1005)
```
exit 1, standalone `staticcheck`. Note: `golangci-lint`'s bundled
`staticcheck` linter reported **only the punctuation half** of the identical
diagnostic pair in the same run — a real, minor divergence between the two
invocations of nominally the same check, worth knowing if a CI gate switches
tooling.

[Google Best Practices §Placement of %w in errors](https://google.github.io/styleguide/go/best-practices#error-percent-w):
`%w` at the end of the format string keeps the printed chain newest-to-oldest
(matching traversal order):

```go
// Good — reads err3: err2: err1, matches chain order
fmt.Errorf("err3: %w", err2)

// Bad — reads err1: err2: err3, chain order and print order diverge
fmt.Errorf("%w: err3", err2)
```
The one exception is a **sentinel category**, placed at the front so the
category reads first: `fmt.Errorf("%w: invalid header", ErrParse)` — [§Sentinel error placement](https://google.github.io/styleguide/go/best-practices#error-percent-w-sentinel-placement).
No linter distinguishes "this %w is a sentinel-category prefix" from "this
%w is a mid-message chain break" — both conventions are reading heuristics.

### 10. In-band failure signals

[Code Review Comments §In-Band Errors](https://go.dev/wiki/CodeReviewComments#in-band-errors):
"a function should return an additional value to indicate whether its other
return values are valid… This prevents the caller from using the result
incorrectly." The canonical rewrite:

```go
// bad
func Lookup(key string) string // "" means both "empty value" and "missing"

// good
func Lookup(key string) (value string, ok bool)
```
The wiki is explicit that `nil`, `""`, `0`, `-1` are fine when they are
*valid results*, not error signals — the finding is specifically an in-band
sentinel value doing double duty as both a real value and a failure flag. No
analyzer catches this generally; it is a signature-shape reading heuristic
(a function whose "not found" case returns a value indistinguishable from a
legitimate result, with no second return value).

### 11. Implementing a custom error type correctly

Convention: pointer receiver, `Unwrap() error` (or `Unwrap() []error` for a
multi-cause type) when the caller needs to see through it, `Is`/`As` methods
only when custom matching semantics are needed beyond field equality. But
**not every custom error type needs all of this**, and the same file in
`cli/cli` shows both legitimate shapes side by side:

```go
// pkg/cmdutil/errors.go:21 — pointer receiver, wraps a cause, has Unwrap
type FlagError struct{ err error }
func (fe *FlagError) Error() string  { return fe.err.Error() }
func (fe *FlagError) Unwrap() error  { return fe.err }

// pkg/cmdutil/errors.go:60 — value receiver, no wrapped cause, no Unwrap
type NoResultsError struct{ message string }
func (e NoResultsError) Error() string { return e.message }
```
`FlagError` needs the pointer receiver and `Unwrap` because it carries and
re-exposes another error. `NoResultsError` is an immutable, data-light marker
with nothing to unwrap — a value receiver is simpler and the type stays
comparable. `aquasecurity/trivy@ae561f8cca36:pkg/types/error.go:7-22` shows
the same split: `*ExitError` (pointer, carries `Code int`) and `*UserError`
(pointer, carries `Message string`) — both pointer here because both are
matched with `errors.As`/`errors.AsType` against a *pointer* type
consistently, which is the more common and recommended default; `NoResultsError`
is the documented exception, not a counter-rule. The one hard constraint: **pick
one receiver kind per type and match against that same kind everywhere** —
`cli/cli` matches `*AuthError`/`*ExternalCommandExitError` with `errors.AsType[*T]`
and `NoResultsError` (no star) with `errors.AsType[T]`, consistently.

## Normative guidance candidates

1. **Wrap with `%w`, not `%v`, unless the boundary is deliberate.** An
   internal helper adding context to an error it will return up its own
   call stack uses `%w`. Rationale: a `%v` wrap is invisible to every
   `errors.Is`/`errors.As` above it, permanently. VERIFY: `golangci-lint`
   with `errorlint` `settings.errorlint.errorf: true` (opt-in — off by
   default in the standalone tool). RUN: **yes**, fixture `a_violation`
   (red) / `a_twin` (green) — see Verification runs §a. CAVEAT: do not
   enable this as an unconditional repo-wide MUST without a per-boundary
   exception path (see rule 2) — it will also flag the intended opacity
   idiom.

2. **At an RPC/IPC/storage/dependency boundary, translate to an own
   sentinel with `%w` and demote the dependency's detail to `%v`; never
   `%w` a dependency's error straight through an exported function unless
   the doc comment names it.** Rationale: `%w` makes the wrapped type part
   of your API by Hyrum's Law; Google's own style guide sanctions `%v`
   specifically here. VERIFY: reading heuristic — grep the exported
   function's body for `%w` applied to a variable populated by a call into
   an import outside the current module, then check the function's doc
   comment for that dependency's error type. RUN: **no** (no analyzer
   distinguishes intent; fixture `e_violation`/`e_twin` demonstrates the
   leak behaviorally via `errors.As` reaching `*json.SyntaxError`, but no
   static tool flags either side of the rule).

3. **Never `err == sentinel` or a bare type assertion/type switch on an
   error; always `errors.Is`/`errors.As`/`errors.AsType`** — except the
   stdlib's own explicitly-documented unwrapped returns (`io.EOF` from an
   `io.Reader`, `sql.ErrNoRows`), and even then only when the value is
   *statically* typed as that stdlib interface. Rationale: `==` and type
   assertions do not traverse the wrap chain. VERIFY: `errorlint`
   `comparison` and `asserts` checks (both enabled by default in
   `golangci-lint`). RUN: **yes** — fired on the `a_violation`-style `%v`
   case is separate (rule 1); the direct comparison/assertion checks were
   confirmed enabled-by-default and firing correctly on real corpus hits
   (`grpc-go`'s non-`io.Reader` `stream.Recv()` `== io.EOF`, `authz/grpc_authz_end2end_test.go:304`).
   KNOWN GAP, verified: a hand-rolled type that implements `io.Reader` and
   wraps `EOF` itself is exempted by the linter's static-type check and
   will not be flagged — fixture `b_violation`, 0 issues from
   `golangci-lint --enable-only=errorlint`.

4. **`go vet`'s `errorsas` analyzer and `errorlint`'s comparison/asserts
   checks are not substitutes for each other; run both.** Rationale:
   `errorsas` only validates the *shape* of an `errors.As` call already
   present (non-pointer target); it says nothing about code that never
   calls `errors.As` at all. VERIFY: `go vet ./...` (errorsas is in the
   default analyzer set run by both `go vet` and `go test`) plus
   `errorlint`. RUN: **yes** — `errorsas-probe` fixture: `errors.As(err,
   target)` (missing `&`) → exit 1, exact message captured in Finding 4.

5. **A published library or SDK exports a typed error carrying the data a
   caller needs (an exit code, a path); it never makes callers match on
   `err.Error()` substrings.** Rationale: Google's own "Bad" example is
   this exact pattern; message text is not a stable contract. VERIFY:
   `grep -rn -e '\.Error()' -e 'err\.Error' . --include='*.go' | grep -e 'strings.Contains' -e 'regexp.MatchString'`
   run with a directory operand, piped into `xargs -r`; empty output is a
   pass. RUN: **no** — reading heuristic / grep only, not run against a
   planted fixture in this pass (the shape is a plain string operation
   indistinguishable at the type-check level; a positive hit still needs a
   human to confirm the string came from `err.Error()` on an error, not an
   unrelated string).

6. **The SDK's typed exit error is one exported `*ExitError{ Code
   ExitCode, ... }`, matched with `errors.AsType[*ExitError]`
   (go ≥1.26) or `errors.As` (go 1.25) — never one Go type per exit
   code.** Rationale: Go has no exhaustive enum match to make
   one-type-per-code pay for itself the way Rust's `match` does; trivy's
   shipped `ExitError{Code int}` is the proof this scales to a real CLI.
   VERIFY: `errors.AsType[*ExitError](err)` (or `errors.As`) in a table
   test with one row per exit code, asserting `.Code` equals the expected
   value. RUN: **yes**, in the sense that the mechanism (`errors.AsType`
   on a pointer type carrying a field) is exactly what fixtures `f_twin`
   and `sa4023-probe2`'s `Do`-pattern exercise; the SDK-specific type
   itself is a design decision, not a corpus artifact — no exemplar ships
   this exact SDK.

7. **A timeout/kill-before-reap failure gets its own type, deliberately
   NOT matched by whatever predicate selects `*ExitError` for retry.**
   Rationale: `ocx-sdk-python`'s `_retryable` docstring states this
   explicitly as the reason a timeout stays unretried by default. VERIFY:
   a unit test asserting `errors.As(timeoutErr, &exitErr)` is `false` for
   every `*TimeoutError` value. RUN: **no** — design decision transplanted
   from the Python SDK's documented behavior, not corpus-measured (no Go
   exemplar has this exact SDK shape); the underlying `errors.As`
   type-discrimination mechanism itself is verified generically by
   fixtures `d_twin`/`sa4023-probe2`.

8. **Retry only on `TempFail` (75), never on `Unavailable` (69), even
   though both read as "network problem."** Rationale: the ocx exit-code
   design's own doc comments define the codes by exactly this distinction
   ("may succeed on retry" vs "will not change the outcome"); conflating
   them breaks the contract the codes exist to express. VERIFY: a table
   test asserting the retry predicate returns `true` only for
   `ExitCode(75)` among the full `ExitCode` value set. RUN: **no** — design
   decision, not corpus-measured.

9. **`errors.AsType` (or any go ≥1.26-only stdlib API) requires the
   module's `go` line to actually be ≥1.26 — check with `go vet`, not
   `staticcheck`.** Rationale: verified `staticcheck` 2026.2.1 does not
   catch the mismatch at all; `go vet`'s `stdversion` analyzer does, with
   an exact, actionable message. VERIFY: `go vet ./...` (default analyzer
   set, no flag needed). RUN: **yes** — fixture `f_violation` (go 1.25,
   uses `errors.AsType`): `go vet` exit 1 with message `errors.AsType
   requires go1.26 or later (module is go1.25)`; `f_twin` (go 1.26): exit 0.
   `staticcheck ./...` on `f_violation`: exit 0 (does not catch it) —
   recorded as a negative result, not omitted.

10. **A single `errors.As`/`errors.AsType` call against a value that might
    be an `errors.Join` result finds only the first matching member —
    walk `Unwrap() []error` explicitly if every match matters (batch
    validation, multi-cause reporting).** Rationale: verified behaviorally;
    no analyzer flags the naive, incomplete version. VERIFY: a table test
    joining ≥2 same-type errors and asserting the collector returns all of
    them, not just the first. RUN: **yes** — fixture `d_violation` (naive
    `errors.As`): finds 1 of 2, test passes proving the bug is present;
    `d_twin` (tree walk): finds 2 of 2, test passes proving the fix.

11. **Every function that returns `error` uses `error` as its literal
    static return type in every intermediate assignment on the success
    path that can be `nil`, or compares explicitly before returning — never
    let a concrete pointer type sit in a variable that then gets returned
    as `error` without an explicit nil check.** Rationale: the FAQ's
    documented interface-nil trap; `staticcheck` SA4023 catches the direct
    form but has a verified blind spot. VERIFY (two layers, since one has a
    known gap): (a) `staticcheck ./...` for SA4023, knowing it only fires
    when the nil-comparison is a direct call expression in a non-test
    `.go` file; (b) reading heuristic for the same shape when the only
    comparison is inside a `_test.go` file — grep for a helper with a
    concrete pointer return type feeding a variable that is returned as
    the bare `error` interface type with no intervening `if x == nil`.
    RUN: **yes, both directions, plus the gap** — fixture `c_violation` /
    `sa4023-probe2` (caught in prod code) vs `c_violation`'s own
    `_test.go`-only comparisons (missed) — see Finding 8's table and
    Verification runs §c.

12. **Error strings: lower-case start (unless a proper noun/acronym), no
    trailing punctuation, `%w` at the end except for a sentinel-category
    prefix.** Rationale: Code Review Comments + Best Practices, verbatim.
    VERIFY: `staticcheck` ST1005 for the string-shape half (no config
    needed — verified default-on in the standalone binary); the `%w`
    placement half has no linter and is a reading heuristic (mermaid-chain
    reasoning in Finding 9). RUN: **yes, string-shape half only** — planted
    `errors.New("Something bad happened.")` → both ST1005 sub-diagnostics
    fire standalone, exit 1; `%w`-placement half not run (no tool exists
    to check it).

13. **No in-band failure sentinel (`-1`, `""`, nil map) doing double duty
    as a valid result; add a second return value.** Rationale: Code Review
    Comments, verbatim, with the compiler-enforced benefit spelled out
    (`Parse(Lookup(key))` becomes a compile error instead of a silent
    misread). VERIFY: reading heuristic — a function whose failure case
    returns a value type-identical to and indistinguishable from a valid
    result, with only one return value. RUN: **no** — no analyzer; this is
    a signature-shape judgment call, same as the topic map's own citation
    for this row.

14. **Pick pointer-receiver-with-`Unwrap` for any custom error type that
    wraps another error or is matched by pointer elsewhere in the same
    program; value-receiver-no-`Unwrap` is legitimate only for an
    immutable, data-light marker matched consistently by value.**
    Rationale: `cli/cli`'s own file has both, correctly, for different
    reasons; the failure mode is *inconsistency* (matching the same type
    sometimes by pointer, sometimes by value) more than the choice itself.
    VERIFY: reading heuristic — for each exported error type, confirm every
    `errors.As`/`errors.AsType` call site in the codebase uses the same
    pointer-or-value form the type's own receiver kind implies. RUN:
    **no** — cross-repository consistency check, not something a single
    planted fixture demonstrates meaningfully.

## Verification runs

All commands via `/home/mherwig/.cache/research-lang/go-tools/run.sh`
(Go 1.27.1, `GOTOOLCHAIN=local`, `golangci-lint` 2.14.0), executed from
`/home/mherwig/.cache/research-lang/go-tools/fixtures/wrapping-and-classification/`.
Config for the golangci-lint runs: a local `.golangci.yml` with
`linters.default: none`, `enable: [errorlint, wrapcheck, nilerr, nilnil,
govet, staticcheck]`, `settings.errorlint: {errorf: true, comparison: true,
asserts: true}` — used where noted; the plain `--no-config
--enable-only=...` invocations (used for the exemplar FP runs) fall back to
golangci-lint's own built-in per-linter defaults, which enable `errorf`
without any explicit setting (see below).

**§a — %v vs %w sentinel miss**
- `go test ./a_violation/...` → `ok` (behavioral proof: `IsNotFound(false)`
  is `false`, i.e. the miss is present).
- `go test ./a_twin/...` → `ok` (fix: `IsNotFound(false)` is `true`).
- `golangci-lint run ./a_violation/...` (errorlint errorf:true) →
  `a_violation/a.go:21:31: non-wrapping format verb for fmt.Errorf. Use
  %w to format errors (errorlint)`, 1 issue, exit 1.
- `golangci-lint run ./a_twin/...` → `0 issues.`, exit 0.

**§b — wrapped EOF through a custom io.Reader**
- `go test ./b_violation/...` → `ok` (behavioral proof: `ReadAll` on the
  wrapping reader returns a non-nil error that is still `io.EOF` in its
  chain via `errors.Is`, i.e. the `==` comparison inside `ReadAll` did not
  catch it).
- `go test ./b_twin/...` → `ok` (fix: `errors.Is` inside `ReadAll` catches
  it, returns nil).
- `golangci-lint run ./b_violation/...` (errorlint) → `0 issues.` — the
  `err == io.EOF` comparison is **not flagged** (verified gap, Finding 4).
- `golangci-lint run ./b_twin/...` → `0 issues.` (nothing to flag; the fix
  uses `errors.Is`).
- Both `b_violation` and `b_twin` independently trip `wrapcheck` at the
  *same* line (`return err` inside `ReadAll`'s generic-error fallthrough) —
  orthogonal to the planted bug, a separate (arguable false-positive) axis;
  see Finding 4 and the FP discussion below.

**§c — typed-nil interface**
- `go vet ./c_violation/...` → exit 0 (vet's own analyzer set does not
  include SA4023; SA4023 is staticcheck-only).
- `staticcheck ./c_violation/...` (comparison only in `_test.go`) → exit 0
  — **does not fire**.
- `staticcheck ./sa4023-probe2/...` (identical `Do` shape, comparison
  `if Do(false) == nil` in a plain `.go` file) →
  `sa4023-probe2/p.go:20:5: this comparison is never true (SA4023)` plus
  two supporting lines, exit 1 — **fires**.
- `staticcheck ./sa4023-probe3/...` (comparison via an intermediate
  variable, `err := Do(false); return err == nil`, still in a plain `.go`
  file) → fires identically, exit 1 — confirms the deciding factor is
  test-file-vs-not, not direct-call-vs-variable.
- Adding the same `Do(false) == nil` comparison directly into
  `c_violation/c.go` (non-test) → fires identically, exit 1, then reverted
  to keep `c_violation` as a pure behavioral (non-static-analysis) fixture.
- `staticcheck ./sa4023-probe/...` (the FAQ's own `bad()`/`ErrBad` example,
  verbatim) → fires, confirming the check itself works as documented; the
  gap is specifically about `_test.go` files.

**§d — errors.Join + As first-match**
- `go test ./d_violation/...` → `ok` (behavioral proof: naive
  `CollectFieldErrors` via a single `errors.As` returns exactly 1 of 2
  joined members — the "name" one, discarding "email").
- `go test ./d_twin/...` → `ok` (fix: walking `Unwrap() []error` finds
  both).
- No lint fires on either package (not a static-analysis-shaped rule).

**§e — dependency error leak through %w**
- `go test ./e_violation/...` → `ok` (behavioral proof:
  `errors.As(Load(badJSON), &syntaxErr)` succeeds — `*json.SyntaxError` is
  reachable through the exported `Load`).
- `go test ./e_twin/...` → `ok` (fix: `errors.Is(err, ErrInvalidData)` is
  true and `errors.As(err, &syntaxErr)` is false — the dependency's type is
  no longer reachable).
- `golangci-lint run ./e_violation/...` (errorlint errorf:true) →
  `0 issues.` (single `%w`, nothing to flag).
- `golangci-lint run ./e_twin/...` → `e_twin/e.go:17:47: non-wrapping
  format verb for fmt.Errorf. Use %w to format errors (errorlint)`, 1
  issue, exit 1 — **the correct, Google-sanctioned boundary pattern is
  flagged as a violation** by errorlint's `errorf` check (see Contested).

**§f — errors.AsType and the go-line trap**
- `go build ./f_violation/...` (go.mod: `go 1.25`) → exit 0 (compiles
  fine; API availability is not gated by the `go` line on a 1.27.1
  toolchain).
- `go vet ./f_violation/...` → `f.go:10:18: errors.AsType requires go1.26
  or later (module is go1.25)`, exit 1.
- `staticcheck ./f_violation/...` → exit 0 — **does not catch it**.
- `go vet ./f_twin/...` (go.mod: `go 1.26`, identical code) → exit 0.

**errorsas — API-shape check, distinct from comparison/asserts**
- `go vet ./errorsas-probe/...` (`errors.As(err, target)` with `target` a
  non-pointer value) → `errorsas-probe/p.go:11:9: second argument to
  errors.As must be a non-nil pointer to either a type that implements
  error, or to any interface type`, exit 1.

**ST1005 — error-string convention**
- `staticcheck ./st1005-probe/...` (`errors.New("Something bad happened.")`)
  → both `error strings should not be capitalized` and `error strings
  should not end with punctuation or newlines`, exit 1.
- `golangci-lint run --no-config --enable-only=staticcheck
  ./st1005-probe/...` → only the punctuation diagnostic surfaces, exit 1 —
  the capitalization half is silently dropped by golangci-lint's wrapper on
  this run (minor tooling divergence, not chased further).

**Exemplar false-positive spot-reads (errorlint, wrapcheck)** — command:
`golangci-lint run --no-config --enable-only=errorlint,wrapcheck --timeout=5m
--max-issues-per-linter=0 --max-same-issues=0 ./...` run from each exemplar's
own root (network-fetched module dependencies; no writes made inside any
exemplar clone).

| repo@sha12 | errorlint hits | wrapcheck hits | rough LOC (excl. vendor/testdata/_test.go) |
|---|---|---|---|
| `grpc/grpc-go@acccf8cd101a` | 801 | 1063 | 143,516 |
| `caddyserver/caddy@54937914234b` | 462 | 1377 | 71,176 |
| `ko-build/ko@fcaeb337b6bd` | 0 | 178 | 9,088 |

Note: `--no-config` uses golangci-lint's own built-in default settings for
each linter, which include `errorf: true` for `errorlint` — this contradicts
the standalone `go-errorlint` tool's own documented default (`errorf`
disabled). Treat "errorlint hits" above as "errorf + comparison + asserts,
golangci-lint's bundled defaults," not the bare upstream tool's defaults.

Spot-read methodology (matches the audit's own precedent of small,
explicitly-sized samples, not exhaustive classification):

- `grpc-go`, `errorlint`, n≈15 (first ~15 `%v`/`%s`-of-err and
  comparison hits read in full context): all judged genuine — none read as
  a deliberate boundary-opacity choice; grpc-go is independently the
  audit's worst-ratio offender, consistent with this being real debt, not
  noise. **Approx. errorlint false-positive rate on this sample: 0/15.**
- `grpc-go`, `wrapcheck`, n=13 (first 13 hits in `admin.go`/`caddy.go`-
  adjacent files and `balancer/*`, read in full context, judged against
  Uber/Google's "return as-is when there is no context to add" sanctioned
  idiom and the decorator/delegation pattern where a wrapper method
  delegates to the identical interface method it implements): **8–10 of 13
  judged likely false positives** — bare passthroughs inside decorator
  types implementing the same interface they call through
  (`endpointsharding.go:317`, `grpclb.go:94`), one outright misclassification
  of a fresh error *construction* as an unwrapped propagation
  (`status.Error(...)`, `grpclb_test.go:238`), and several bare returns
  inside test helper code. **Approx. wrapcheck false-positive rate on this
  sample: ~65–75%**, by this standard — a materially higher rate than
  errorlint's on the same repo.
- `ko-build/ko`, `wrapcheck`, n=13 (all from `internal/sbom/spdx.go`): all
  13 judged genuine true positives — every hit is a bare `return nil, err`
  from an OCI-image-introspection call (`.Digest()`, `.Manifest()`,
  `.ConfigFile()`, `.IndexManifest()`, `.SignedImage()`) inside SBOM-building
  code where the caller genuinely cannot tell *which* layer or step failed
  without added context. **Approx. wrapcheck false-positive rate on this
  sample: ~0/13** — concentrated, real debt in one file, not noise.
- `caddyserver/caddy`, `wrapcheck`, n=13 (`admin.go`/`caddy.go`): mixed —
  roughly half read as genuine (opaque third-party libs like
  `google/uuid`, `certmagic`), roughly half read as arguable false
  positives under Google's own "don't add redundant `os`-package path
  info" guidance (`os.WriteFile`/`os.MkdirAll` errors already embed the
  path) or the "trivial full-delegation" pattern
  (`return x509.ParseCertificate(derBytes)` as a function's entire body).

These are small, single-reviewer spot samples (n=13–15 per cell), not an
exhaustive per-repo classification; the qualitative conclusion — **wrapcheck
runs meaningfully noisier than errorlint against the sanctioned Go idioms
this program adopts, and its noise is unevenly distributed (near-zero in
`ko`, high in `grpc-go`)** — is the load-bearing finding, not the exact
percentages.

## Exemplar evidence

| Row | Satisfies | Violates / contradicts |
|---|---|---|
| M-B-01 (%w mandatory) | `sigstore/cosign@907c3d899c0e` (494 `%w`, 0 `%v`-of-err, `LOC` 32,704) | `grpc/grpc-go@acccf8cd101a:clientconn.go:326` (16:1 inverted); `caddyserver/caddy@54937914234b:listeners.go:355` |
| M-B-02 (dependency leak) | `cli/cli@9b031151a825:pkg/cmdutil/errors.go:21-33` (`FlagError.Unwrap` is a documented, deliberate contract) | no exemplar audited specifically for *unintentional* leaks — this row's evidence is the planted fixture, not a corpus count |
| M-B-03 (sentinel/typed/opaque) | `aquasecurity/trivy@ae561f8cca36:pkg/types/error.go:7-22` (`ExitError`, `UserError`); `caddyserver/caddy@54937914234b:modules/caddytls/ech.go:482` (`errors.As` on a typed sentinel) | — |
| M-B-04 (==/assert vs Is/As) | `bazelbuild/bazel-gazelle@63c9a3d2078f:v2/cmd/gazelle/update/update.go:1190` (`errors.As`) | `aquasecurity/trivy@ae561f8cca36:magefiles/vex.go:304` (`err == io.EOF`, genuine per audit spot-read 3/3); `grpc/grpc-go@acccf8cd101a:authz/grpc_authz_end2end_test.go:304` (`err == io.EOF` on a non-`io.Reader` stream method — flagged) |
| M-B-05 (message matching) | — | `cli/cli@9b031151a825:api/queries_repo.go:1535`; concentrated in `etcd-io/etcd` (21), `tailscale/tailscale` (18), `containerd/containerd` (14) |
| M-B-06 (AsType) | `cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212` (four `errors.AsType[...]` dispatches, in production, go line permitting) | — |
| M-B-07 (Join + As) | `cockroachdb/pebble@13596f1e1cea:open.go:867` (pattern citation only — via `github.com/cockroachdb/errors`, not stdlib) | `hashicorp/go-multierror` still direct in 2/35 (pre-`errors.Join` holdover) |
| M-B-08 (typed-nil) | `aquasecurity/trivy@ae561f8cca36:pkg/types/error.go` (returns `error`-typed throughout, no concrete-pointer leak visible in the file read) | no exemplar hit specifically catalogued for this bug by the audits — corpus-wide detection would need the same SA4023 blind-spot-aware re-scan this dive just verified |
| M-B-11 (string convention) | — (ST1005 is widely clean across the corpus per the gates audit's low per-check noise) | — |
| M-B-17 (in-band errors) | `cli/cli@9b031151a825:pkg/cmdutil/errors.go` (`NoResultsError`, a distinguishable typed "no results" signal, not an in-band sentinel value) | not separately corpus-measured this pass |
| M-B-18 (custom type correctness) | `cli/cli@9b031151a825:pkg/cmdutil/errors.go:21,60` (`*FlagError` vs `NoResultsError`, both correct); `aquasecurity/trivy@ae561f8cca36:pkg/types/error.go:7-22` | — |

## AI-agent angle

- **Reaches for `github.com/pkg/errors`.** Down to 12 hits corpus-wide
  ([exemplar-runtime-posture.md §1](../go-audit/exemplar-runtime-posture.md#1-errors)),
  and stdlib `errors`/`fmt.Errorf` with `%w` has covered its use cases since
  1.13. Mechanical check: `grep -rn -e 'github.com/pkg/errors' . --include='go.mod'`
  with a directory operand; empty output is a pass.
- **Writes `if err == someSentinel`** because it looks like idiomatic
  Go from pre-2019 training data and compiles without complaint. Mechanical
  check: `golangci-lint` with `errorlint`'s `comparison` check (enabled by
  default) — verified to fire on this exact shape.
- **Assumes `errors.As` on a joined error finds every match** (a plausible,
  wrong generalization from "it walks the tree"). No lint catches it; the
  smallest check is the exact pattern in fixture `d_violation` — a table
  test with ≥2 matching joined members and an assertion on the count found,
  not just whether any was found.
- **Assumes a module's stated `go` line gates which stdlib APIs it may
  call**, and either avoids a genuinely-safe-to-use-here API (over-caution)
  or assumes a used API is fine because "it compiled" (under-caution — it
  compiles on *this* toolchain, and will not on an older one). Mechanical
  check: `go vet ./...` — the `stdversion` analyzer is in the default set
  and gives the exact required version in its message; do not rely on
  `staticcheck` for this (verified: does not fire).
- **Writes `func helper() *ConcreteErrorType` and assigns its result to a
  variable that is later returned as the bare `error` interface**, because
  a concrete return type looks more precise/idiomatic. This compiles and
  looks correct; it is the single most-cited Go footgun
  ([go.dev/doc/faq#nil_error](https://go.dev/doc/faq)). Mechanical check:
  `staticcheck` SA4023 — but only catches it when the failing comparison
  is a direct call expression or a traced variable **in a non-test file**;
  an agent that only wrote a `_test.go` exercising the bug via `if err ==
  nil` gets a false "clean" `staticcheck` run. The durable check is the
  reading heuristic in Normative rule 11(b), not the tool alone.
  ("pre-generics/pre-1.22" framing does not apply here — this bug predates
  and postdates every Go generation equally; it is interface mechanics,
  not an idiom that aged out.)
- **Generates `_ = someWriteOrCloseCall()` uniformly**, copying the
  accepted `defer resp.Body.Close()` idiom onto a *write* path where the
  discarded error is the only signal a flush actually failed. 3,294 bare
  `Close`/`Flush` corpus-wide, but the audit's own sharper signal is the 440
  bare `Write` sites specifically
  ([exemplar-runtime-posture.md §1](../go-audit/exemplar-runtime-posture.md#1-errors)) —
  not this dive's row (M-B-12), but adjacent enough that an agent fixing
  M-B-01..08 in the same file commonly "fixes" the wrong ignored-error line.
- **Uses `errors.New(fmt.Sprintf(...))` or hand-formats a capitalized,
  punctuated error string** by habit from other languages' exception
  messages. Mechanical check: `staticcheck` ST1005, verified default-on,
  catches both the capitalization and the trailing-punctuation shape in one
  pass (standalone; the `golangci-lint`-wrapped run showed only one of the
  two sub-diagnostics on the same input, so prefer standalone `staticcheck`
  for this specific check if a CI gate needs both signals).
- **Hallucinates `errors.AsType` availability** in the other direction too:
  assumes it needs a `//go:build go1.26` tag or a runtime version check to
  call it safely, when in fact the only thing that needs to change is the
  module's own `go` line — verified, it is a normal generic stdlib function
  call, not a build-tag-gated language feature.

## Contested / evolving

- **`errorlint`'s `errorf` check vs the Google-sanctioned boundary idiom.**
  Verified in this pass: enabling `errorf: true` (which the observed
  `golangci-lint 2.14.0` default already does under a bare `--no-config`
  run) flags the *correct* pattern of wrapping an own sentinel with `%w`
  while carrying dependency detail with `%v` in the same `fmt.Errorf` call
  (fixture `e_twin`). As of 2026-09-26 this is an open tension between two
  widely-cited authorities (the linter's blanket rule vs Google's own
  documented exception) with no resolution upstream in either project;
  treat `errorf: true` as a signal to review, not an auto-fixable MUST, at
  any call site that also carries a `%w` of an own sentinel in the same
  format string.
- **`wrapcheck`'s default noise level.** The topic map's conflict 2
  resolution lists `wsl`/`exhaustruct`/`paralleltest`/`nlreturn`/`varnamelen`/
  `noinlineerr`/`goconst` as measured-noisy linters that never back a MUST;
  `wrapcheck` was not on that list, but this dive's spot-read (n=13,
  `grpc-go`, ~65–75% apparent false positives against sanctioned idioms)
  suggests it may belong there too. Its `ignoreInterfaceRegexps`/
  `ignorePackageGlobs`/`reportInternalErrors: false` settings exist
  specifically to tame this; an un-tuned `wrapcheck` is not the same
  instrument as a tuned one, and this dive did not tune it before
  measuring. Direction: likely headed toward "configure narrowly or don't
  gate on it," not "enable by default" — but not yet settled as of this
  writing.
- **`SA4023`'s test-file blind spot** is, as far as this dive's own
  (bounded) research found, unremarked in `dominikh/go-tools`' own release
  notes or issue tracker; it reads as an implementation gap rather than a
  documented design choice. If it is fixed upstream after 2026-09-26, the
  Normative rule 11 verification split (staticcheck for prod code, reading
  heuristic for test-only exercises) should collapse back to "staticcheck
  alone."
- **`golangci-lint`'s bundled `staticcheck` dropping one of ST1005's two
  sub-diagnostics** in this run is a minor, single-observation divergence
  from the standalone binary; not chased to a root cause in this pass (could
  be a one-issue-per-line dedup default, not a real gap). Flagged, not
  resolved.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/blog/go1.13-errors](https://go.dev/blog/go1.13-errors) | Go blog, the errors-wrapping design post | 2019 (Go 1.13), still the canonical statement as of 2026 | Origin of `%w`/`Is`/`As`, "wrap to expose, not to hide" — primary |
| [pkg.go.dev/errors](https://pkg.go.dev/errors) | stdlib package docs | current, includes `AsType` (Go 1.26) | Exact signatures for `Is`, `As`, `AsType`, `Join`, `Unwrap` — primary |
| [go.dev/doc/faq](https://go.dev/doc/faq) — "Why is my nil error value not equal to nil?" | Go FAQ | perennial, unchanged mechanism | Canonical statement of the typed-nil interface bug, with the exact remediation advice — primary |
| [go.dev/wiki/CodeReviewComments](https://go.dev/wiki/CodeReviewComments) | Go reviewer checklist wiki | perennial, actively maintained | Error Strings and In-Band Errors sections, verbatim, cited by section anchor across the ecosystem — primary |
| [google.github.io/styleguide/go/best-practices](https://google.github.io/styleguide/go/best-practices) (fetched from `raw.githubusercontent.com/google/styleguide/gh-pages/go/best-practices.md`) | Google's internal Go style guide, public mirror | actively maintained, read in full for §Error handling | Most concrete, most worked-example-dense source on %w/%v choice and placement — primary |
| [dave.cheney.net/2016/04/27/dont-just-check-errors-handle-them-gracefully](https://dave.cheney.net/2016/04/27/dont-just-check-errors-handle-them-gracefully) | Practitioner essay, opaque errors | 2016, still widely cited as of 2026 | Origin of "assert behavior, not type" for opaque error handling |
| `github.com/polyfloyd/go-errorlint` README | Tool's own documentation | current (fetched 2026-09-26) | Exact flag names (`-errorf`, `-comparison`, `-asserts`), the documented `io.EOF`/`sql.ErrNoRows` exemption, and the caveat that `%w` wrapping is itself an API commitment |
| `github.com/tomarrell/wrapcheck` README | Tool's own documentation | current (fetched 2026-09-26) | Documents wrapcheck's own worked example recommending `%v` "to prevent error becoming part of external API" — directly informs the M-B-02/Contested tension |
| `github.com/uber-go/guide` `style.md` §Errors | Uber's Go style guide | actively maintained | Error Types decision table, error-wrapping guidance (`%w` vs `%v`), "avoid 'failed to'" phrasing rule |
| [kubernetes/kubernetes#123234](https://github.com/kubernetes/kubernetes/issues/123234) | Open GitHub issue, a real large codebase's own %v→%w migration ask | opened, still open as of this research | Evidence the %v-majority problem is live and unresolved even in a flagship Go codebase |
| [staticcheck.dev/docs/checks](https://staticcheck.dev/docs/checks/#SA4023) | staticcheck's own check catalogue | 2026.2.1-current | Exact SA4023 description and worked example, matched against this dive's own fixture behavior |
| `dominikh/go-tools` (local `staticcheck -explain SA4023`) | Tool's own bundled explanation, run locally | installed 2026-09-26, v2026.2.1 (bundled 0.8.1) | Ground truth for what the installed binary actually says, not just the website |
| `google.golang.org/grpc` (`grpc/grpc-go@acccf8cd101a`), `caddyserver/caddy@54937914234b`, `ko-build/ko@fcaeb337b6bd`, `aquasecurity/trivy@ae561f8cca36`, `cli/cli@9b031151a825`, `cockroachdb/pebble@13596f1e1cea` | Exemplar corpus source, read directly and lint-scanned live in this pass | cloned 2026-09-26 at the pinned SHAs | Primary evidence for every exemplar citation above; several corrections to the audits' own summaries came from re-reading the exact lines |
| [go-audit/exemplar-runtime-posture.md §1](../go-audit/exemplar-runtime-posture.md#1-errors) | Wave-1 audit, this program | 2026-09-26 | Corpus-wide %w/%v/io.EOF/message-matching counts this dive builds on |
| [go-audit/config-inventory.md §3-4](../go-audit/config-inventory.md#3-the-sdk-template--ocx-sdk-python) | Wave-1 audit, this program | 2026-09-26 | The SDK template and CLI-contract cross-reference this dive's exit-error design decision rests on |
| `ocx-sdk-python` `src/ocx_sdk/_process.py`, `_types.py` | The fleet's existing Python SDK, read directly | current (this program's reference) | Ground truth for the exit-code-to-error mapping and retry-classification mechanism this dive transplants to Go |
| `ocx` `crates/ocx_exit/src/exit_code.rs` | The fleet's existing Rust exit-code enum, read directly | current (this program's reference) | Ground truth for the exact numeric codes and the `TempFail`-vs-`Unavailable` retry distinction |

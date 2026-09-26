---
title: The Go SDK that wraps the ocx CLI
topic: GO-API — SDK surface (package shape and the exported contract)
agent: go-api/sdk-surface
model: sonnet
date_researched: 2026-09-26
sources_count: 18
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/sdk-surface/sdk/
scope: >
  Decides the shape of a Go SDK wrapping the `ocx` CLI (rows M-D-02, M-D-17,
  M-D-18, M-D-20): client construction, typed vs raw results, the *ExitError
  and *TimeoutError shapes, where retry lives, package layout, and the 100%
  coverage gate's scope. Composes GO-IO-01/07/13/14/15/20, GO-ERR-20,
  GO-CLI-01/12, GO-CONC-01/02/11/17, GO-TEST-12/14/16 and GO-MOD-01/02/10/11/16
  as fixed inputs — none of those are re-decided here. Out of scope: an OCI
  client library evaluation beyond the wrap-only default (M-D-18 stays a
  documented default, not a bake-off), and the CLI-side (non-SDK) exit-code
  wiring, which is GO-CLI's own file.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Package layout and the exported surface](#1-package-layout-and-the-exported-surface)
   2. [Client construction: options, not a config struct](#2-client-construction-options-not-a-config-struct)
   3. [Typed results, not raw JSON](#3-typed-results-not-raw-json)
   4. [The `*ExitError` shape (decision 1)](#4-the-exiterror-shape-decision-1)
   5. [The timeout shape (decision 2, contradiction 12)](#5-the-timeout-shape-decision-2-contradiction-12)
   6. [`exhaustive` on the SDK's `ExitCode` switch (decision 3, contradiction 13)](#6-exhaustive-on-the-sdks-exitcode-switch-decision-3-contradiction-13)
   7. [No surface method returns `(nil, nil)` (decision 4)](#7-no-surface-method-returns-nil-nil-decision-4)
   8. [Where retry lives](#8-where-retry-lives)
   9. [Coverage scope for the 100% gate (decision 5)](#9-coverage-scope-for-the-100-gate-decision-5)
   10. [Wrap-only vs an OCI library (M-D-18)](#10-wrap-only-vs-an-oci-library-m-d-18)
   11. [Versioning against ocx releases](#11-versioning-against-ocx-releases)
   12. [The SDK CI MUST list](#12-the-sdk-ci-must-list)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- The SDK is one exported package (`ocxsdk` or the fleet's chosen import path) plus an `internal/` tree; `go list ./...` must print exactly one path outside `/internal/` ([verified](#verification-runs), exit 0, count 1).
- `NewClient(opts ...Option) (*Client, error)` with func-typed options is the constructor shape — map conflict 4 applied to a published SDK whose options grow across minor versions, confirmed against `google/go-github@48d0a668cde8:github/github.go:383,569-577`.
- Every SDK method takes `ctx context.Context` first and the `Client` stores no context field (GO-CONC-01/02, composed, not re-decided).
- Results are typed structs decoded with `encoding/json`, one struct per command, mirroring `ocx-sdk-python`'s `_results.py` one-parser-per-shape rule — never raw `[]byte`/`map[string]any` on the public surface.
- `*ExitError` carries `Code ExitCode`, raw `Stderr string`, and `Envelope *ErrorEnvelope` (nil when stdout held no C-S1-1 envelope) — decision (1), watched on a planted contract test.
- `*ExitError` never carries or `Unwrap`s to `*exec.ExitError`; the translation happens once, inside `internal/process`, which is the SDK's one spawn point (GO-IO-13, composed).
- The timeout shape is `context.WithTimeoutCause(ctx, d, cause)` plus a distinct `*TimeoutError` whose `Is(target)` matches the exported sentinel `ErrOcxTimeout`, and which never matches `*ExitError` through `errors.As` — decision (2), resolving contradiction 12 in the SDK's favour of GO-ERR-20's type over a bare sentinel.
- `Retryable()` (equivalently, a free `_retryable` predicate) is `true` for exit 75 (TempFail) only, and for nothing else, including timeouts (GO-ERR-20, composed).
- `exhaustive` with `default-signifies-exhaustive: false` **does** fire on the SDK's `ExitCode` switch and must be enabled for the SDK's package, not only the CLI overlay — decision (3), resolving contradiction 13: watched red on a switch missing one case, green on the full switch.
- `nilnil` (checked-types `ptr`, `iface`) is enabled on the SDK package; no surface method may return `(nil, nil)` — decision (4), watched red on a planted `(nil, nil)` method.
- Retry lives in `internal/process.Run`, the one spawn point, driven by an `Attempts int` carried from the `Client`'s options — not in the public `Client` methods and not duplicated per command.
- The default `go test ./...` per-package coverage total **understates** the SDK when a spawn-point package (`internal/process`) is exercised only through the public package's tests: on the fixture, default coverage reads 25.7% (`internal/process` at 0.0%) while `-coverpkg=./...` reads 65.7% (`internal/process` at 85.7–92.3%) for the *same* test run — decision (5); the 100% gate must run with `-coverpkg=./...`, or `internal/process` will silently sit outside the number the gate reads.
- The `TestMain` helper-process branch itself (the `if code := os.Getenv(...)` arm) is invisible to any `go test -cover` profile in the parent process — it only executes in the re-exec'd child — so it needs either a `//go:build` exclusion from the profile's accounting or acceptance that the branch is structurally uncovered and excluded by name, never silently patched over.
- M-D-18 (OCI library vs wrap-only) stays the frame's default: wrap-only. No dive measured a load-bearing argument either way; the SDK's contract is "run `ocx`, decode its JSON," which needs no OCI client.
- Client construction requires no dependency: `oras-go`'s coexistence of config-struct options (`CopyOptions`, `FetchOptions`) and one functional-option type (`registry/remote/policy.EvaluatorOption`) in the same module is exemplar-corpus confirmation that the map's decision procedure, not a single winner, is the right frame (`oras-project/oras-go@cb6d6dc79f83:copy.go:51`, `content.go:269`, `registry/remote/policy/evaluator.go:80`).
- `cli/cli@9b031151a825:api/client.go:30` (`NewClientFromHTTP(httpClient) *Client`) confirms the map's "required inputs are positional" half of conflict 4 for the one thing every call needs (there, the transport; here, the `ocx` executable path is optional via `WithExe`, so this constructor has no required positional at all).
- SDK CI MUST list (this dive's contribution, composing GO-MOD-16 and GO-GATE-01): build+vet+test on `go-version: [oldstable, stable]`, `golangci-lint run` with `exhaustive` and `nilnil` enabled for this package, the coverage gate at `-coverpkg=./...` with the module-root `total:` line, `go list -deps` empty-of-non-stdlib on `./...` (excluding `-test`), and `go doc -all .` grepped clean for `\bany\b`/`interface{}` on declaration lines.

## Findings

### 1. Package layout and the exported surface

The SDK is one exported package with an `internal/` tree underneath it — the
compiler-enforced analogue of `ocx-sdk-python`'s `__all__` plus underscore
modules, which `go-audit/config-inventory.md` §3 already names as the
target shape (**stronger** than Python's convention, since Go's `internal/`
is enforced by `cmd/go`, not by reader discipline)
([go.dev/doc/modules/layout](https://go.dev/doc/modules/layout): "it's
recommended placing such packages into a directory named `internal`; this
prevents other modules from depending on packages we don't necessarily want
to expose"). This is the map's conflict 6 resolution
([go-topic-map.md](../go-topic-map.md) §Conflicts resolved 6), composed here
unchanged: no `pkg/`, `internal/` mandatory for the SDK.

The fixture's one spawn point (`internal/process`, GO-IO-13) and one public
package (`ocxsdk` in the fixture; the fleet's chosen import path in
production) is exactly the shape ocx-sdk-python names in its own module
docstring: "**This module is the API.** Everything listed in `__all__` is
the stable surface; every other module is underscored and package-private"
(`ocx-sdk-python/src/ocx_sdk/__init__.py:19-21`).

```
// correct — one exported package, one internal spawn point
sdkfixture.example/ocxsdk            (exported: Client, ExitError, ...)
sdkfixture.example/ocxsdk/internal/process   (unexported: Run, Spec, ...)
```

```
// wrong — a second exported package the SDK never needed
sdkfixture.example/ocxsdk
sdkfixture.example/ocxsdk/process    // no internal/ prefix: any importer can reach it
```

**Watched:** `go list ./...` on the fixture prints exactly two lines, one of
which contains `/internal/`; `go list ./... | grep -v -c '/internal/'`
returns `1` ([verification runs](#verification-runs)).

### 2. Client construction: options, not a config struct

Map conflict 4 gives the decision procedure, not a single winner
([go-topic-map.md](../go-topic-map.md) §Conflicts resolved 4): required
inputs are positional; a small or closed optional set is a config struct;
**an exported constructor of a published SDK whose options will grow across
minor versions uses functional options, func-typed and returning `error`
when options can conflict**. The OCX SDK is exactly that case — it is a
published, versioned library (see [§11](#11-versioning-against-ocx-releases))
whose option set (exe path, retry policy, env allowlist, auth, timeout
defaults) will grow every time `ocx` grows a new global flag worth exposing.

`google/go-github@48d0a668cde8:github/github.go:383,569-577` is the exemplar
confirmation for exactly this shape on a comparable published Go SDK:

```go
// google/go-github@48d0a668cde8:github/github.go:383
type ClientOptionsFunc func(*clientOptions) error

// github.go:569
func NewClient(opts ...ClientOptionsFunc) (*Client, error) {
	o := clientOptions{}
	for _, opt := range opts {
		if err := opt(&o); err != nil {
			return nil, err
		}
	}
	return newClient(o)
}
```

The fixture's `NewClient(opts ...Option) (*Client, error)` mirrors this
(`internal.../sdk/client.go`), with `Option func(*Client)` narrower than
go-github's `func(*clientOptions) error` because this fixture's options
cannot conflict; a future option that can (e.g. two mutually exclusive auth
schemes) upgrades to `func(*Client) error` without breaking the constructor's
own signature, the same escape hatch go-github took.

`oras-project/oras-go@cb6d6dc79f83` is exemplar evidence for the *other* half
of the procedure inside the same module: its many per-call option sets
(`CopyOptions` at `copy.go:51`, `FetchOptions` at `content.go:269`) are config
structs, because each is a small, closed, per-call optional set, not a
constructor whose surface grows over time; the one functional-option type in
that module, `EvaluatorOption func(*Evaluator)` at
`registry/remote/policy/evaluator.go:80`, sits on a constructor
(`NewEvaluator`), the constructor case the procedure calls out.

`cli/cli@9b031151a825:api/client.go:30` (`NewClientFromHTTP(httpClient
*http.Client) *Client`) shows the positional-required half: the one thing
every call needs (a transport) is a plain parameter, not an option — the
Client fixture's `WithExe` stays optional only because a sane default
(`"ocx"` on `PATH`) exists; if the SDK ever required, say, a mandatory
project root, that becomes `NewClient(root string, opts ...Option)`.

### 3. Typed results, not raw JSON

Every command gets its own result struct decoded by `encoding/json`, never a
`map[string]any` or `json.RawMessage` on the public surface — this is
`ocx-sdk-python`'s own commitment, restated for a statically typed language:
"one command, one result struct, one hand-written parser... unknown keys are
ignored so a newer ocx that adds a field keeps working against an older SDK"
(`ocx-sdk-python/src/ocx_sdk/_results.py:8-10`). Go's `encoding/json` already
ignores unknown JSON keys on `Unmarshal` into a struct by default, so this
transfers with no extra code — a stronger position than Python's, which
needed no defensive code either but states the property explicitly in
`_results.py`'s module docstring.

The fixture's `decodeStatus`/`decodePull` in `client.go`/`results.go` are the
minimal instance: one `Unmarshal` per command, into `StatusResult`/
`PullResult`, both plain exported structs with JSON tags.

```go
// correct — typed, one parser per shape
func decodePull(raw []byte) (*PullResult, error) {
	var r PullResult
	if err := json.Unmarshal(raw, &r); err != nil {
		return nil, fmt.Errorf("decode pull: %w", err)
	}
	return &r, nil
}
```

```go
// wrong — raw JSON escapes the surface, any/interface{} everywhere
func (c *Client) Pull(ctx context.Context, ref string) (map[string]any, error) { ... }
```

### 4. The `*ExitError` shape (decision 1)

`*ExitError` carries three things: `Code ExitCode` (GO-ERR-20's settled
type), the raw `Stderr string`, and `Envelope *ErrorEnvelope` — the decoded
C-S1-1 envelope with its stable slug (`Kind`, `Detail`, `Message`), nil when
stdout carried no envelope. This mirrors `ocx-sdk-python`'s split between
`OcxProcessError.stderr`/`.stdout` (raw, on the exception itself,
`_errors.py:114-141`) and the free function `error_envelope(err)` that
decodes stdout into an `ErrorEnvelope` on demand (`_results.py:380-410`).

The Go SDK collapses the Python SDK's two-step recovery (raise, then call
`error_envelope(exc)`) into one field, because Go has no equivalent of a
bare `except OcxProcessError as exc:` that a caller then has to remember to
re-query — decoding eagerly at the one classification point
(`internal/process` → the public `classify` function) costs nothing extra
and removes a step a caller can forget. The trade a reviewer should notice:
this makes every `*ExitError` construction do a `json.Unmarshal` attempt,
which is why `decodeEnvelope` must return fast and safe on non-JSON stdout
(`errors.go`'s `decodeEnvelope`: empty string or a decode error both give
`nil`, never a panic).

`*ExitError` never carries or `Unwrap`s to `*exec.ExitError`: the fixture's
`internal/process.ExitError` (the internal, stdlib-adjacent type) is where
`*exec.ExitError` is observed and translated, and the public `ocxsdk.ExitError`
never touches it. This is GO-ERR-16's flattening rule, composed: "an exported
function never `%w`-wraps an error that came from another module unless its
doc comment names that error as part of the contract... otherwise translate
to your own sentinel" ([go-errors.md](../go-errors.md):224). `*exec.ExitError`
is a stdlib type from a different package than either process layer, and
letting it leak would make the SDK's public error type carry the stdlib's own
promises (Hyrum's Law), which the SDK does not want to make.

```go
// correct — internal/process observes *exec.ExitError, translates once
var exitErr *exec.ExitError
if errors.As(err, &exitErr) {
	code := exitErr.ExitCode()
	if ws, ok := exitErr.Sys().(syscall.WaitStatus); ok && ws.Signaled() {
		code = 128 + int(ws.Signal())
	}
	return nil, &ExitError{Code: code, Stderr: stderr.String(), Stdout: stdout.String()}
}
```

```go
// wrong — the public ExitError now promises *exec.ExitError forever
type ExitError struct {
	Code int
	*exec.ExitError // any caller can now errors.As past ExitError straight to exec's type
}
```

### 5. The timeout shape (decision 2, contradiction 12)

Contradiction 12 in [go-topic-map.md](../go-topic-map.md) §(e).12 named two
timeout representations for one event: GO-ERR-20's `*TimeoutError` (never
matching `*ExitError`) against GO-CONC-17's exported sentinel `ErrOcxTimeout`
for `errors.Is`. The map's provisional resolution — "GO-ERR-20 keeps the
type. GO-CONC-17's sentinel becomes the `Is` target of `*TimeoutError`, and
the cause passed to `WithTimeoutCause` is the `*TimeoutError` value" — is
pinned here by a contract test, and it is the shape the fixture implements
and the shape this dive keeps.

```go
// errors.go
var ErrOcxTimeout = errors.New("ocx: command timed out")

type TimeoutError struct{ Stderr string }

func (e *TimeoutError) Error() string { return "ocx: command timed out" }
func (e *TimeoutError) Is(target error) bool { return target == ErrOcxTimeout }
```

A caller writes `errors.Is(err, ocxsdk.ErrOcxTimeout)` (works whether the SDK
wraps the value or returns it bare) and never needs to know the concrete
`*TimeoutError` type; a caller that does `errors.As(err, &ocxsdk.ExitError{})`
must never get `true` for a timeout — the two failure kinds (deadline vs
non-zero exit) are structurally distinct and a classifier that conflates
them retries a timeout as if it were TempFail, or vice versa.

[pkg.go.dev/context#WithTimeoutCause](https://pkg.go.dev/context#WithTimeoutCause)
(go 1.21.0): "WithTimeoutCause behaves like WithTimeout but also sets the
cause of the returned Context when the timeout expires." Composed
unchanged from GO-CONC-17/18 ([go-concurrency.md](../go-concurrency.md):240-247).

**Watched red/green** on the fixture (this dive's own contract, not
re-running GO-ERR-20's fixture): `TestTimeoutErrorIsAndNeverExitError` wraps
a `*TimeoutError` with `fmt.Errorf("%w", ...)` and asserts both
`errors.Is(err, ErrOcxTimeout) == true` and
`errors.As(err, &ExitError{}) == false`. See
[verification runs](#verification-runs).

### 6. `exhaustive` on the SDK's `ExitCode` switch (decision 3, contradiction 13)

Contradiction 13 asked whether GO-CLI-01's `exhaustive` clause — written for
the CLI's classification switch — also binds an SDK that mirrors the same
0–86 table in its own `slugFor`/classification code. The map left it open:
"until `api/sdk-surface` measures it, the `exhaustive` clause binds CLIs
only" ([go-topic-map.md](../go-topic-map.md) §(e).13).

**Measured, this dive: yes, it fires, and the SDK needs it enabled.** The
fixture's `slugFor(code ExitCode) string` switch, with
`golangci-lint`'s `exhaustive` at `default-signifies-exhaustive: false`
(GO-CLI-01's config), gave `0 issues` on the full 12-case switch and one
finding (`missing cases in switch of type ocxsdk.ExitCode:
ocxsdk.ExitPolicyBlocked`) the moment one case was removed — see
[verification runs](#verification-runs). This settles contradiction 13 for
the SDK: **the `exhaustive` clause is not CLI-only; any code kind that
switches over `ExitCode` needs it**, so GO-GATE-18's CLI-only overlay
framing understates its own reach — the SDK's `golangci-lint` config must
enable `exhaustive` too, not only inherit it through the CLI overlay it
never runs.

[github.com/nishanths/exhaustive](https://github.com/nishanths/exhaustive)
(README, fetched 2026-09-26): a switch with a `default:` clause is *still*
flagged for missing enum members when `default-signifies-exhaustive` is
false — the setting the fleet config already pins
([go-cli.md](../go-cli.md):58). This is why the fixture's `slugFor` uses a
case-only switch with a post-switch `return "unknown"` rather than a
`default:` label: with the pinned setting, a `default:` would not have
exempted anything anyway, and a bare fall-through return reads as
"unclassified," not "handled."

### 7. No surface method returns `(nil, nil)` (decision 4)

**Decided: no.** GO-ERR-12 is SHOULD at the fleet level ("signal 'not found'
... never `(nil, nil)` for a pointer, interface or func result,"
[go-errors.md](../go-errors.md):174), and [go-topic-map.md](../go-topic-map.md)
§(e).11 left "whether the SDK surface may return `(nil, nil)` at all" as
this dive's question. The SDK's answer is a MUST, stricter than the fleet
default: every `Client` method that returns a pointer result has exactly two
outcomes — a non-nil result and a nil error, or a nil result and a non-nil
typed error (`*ExitError`, `*TimeoutError`, or a decode `error`). There is no
"not found, but not an error either" state on the SDK's surface: ocx itself
reports "not found" as exit 79 (`NotFoundError`/`*ExitError{Code:
ExitNotFound}`), so the SDK has a typed error for that state already and
gains nothing from a silent `(nil, nil)`.

```go
// wrong — planted in the fixture as a contract violation, never call it
func (c *Client) findLocal(id string) (*PullResult, error) {
	return nil, nil
}
```

`golangci-lint`'s `nilnil` with `checked-types: [ptr, iface]` flagged this
exact function (`return both a nil error and an invalid value: use a
sentinel error instead (nilnil)`) and gave `0 issues` once it was removed —
see [verification runs](#verification-runs). The fleet's own `checked-types`
list drops `map` from the default ([go-errors.md](../go-errors.md):177), which
matters less for the SDK than for general code: none of the SDK's typed
results are maps.

### 8. Where retry lives

Retry lives in exactly one place: `internal/process.Run`, the loop around
the single spawn point, driven by an `Attempts int` the `Client` carries
from its own `RetryPolicy` (set via `WithRetry`). It does **not** live in
each public method (`Status`, `Pull`, ...) — those call `process.Run` once
and translate whatever comes back.

```go
// internal/process/process.go — the only retry loop in the SDK
func Run(ctx context.Context, spec Spec) ([]byte, error) {
	attempts := spec.Attempts
	if attempts < 1 {
		attempts = 1
	}
	var lastErr error
	for i := 0; i < attempts; i++ {
		out, err := runOnce(ctx, spec)
		if err == nil {
			return out, nil
		}
		lastErr = err
		var ee *ExitError
		if !errors.As(err, &ee) || ee.Code != tempFail {
			return nil, err // not TempFail: stop immediately, never retried
		}
	}
	return nil, lastErr
}
```

This mirrors `ocx-sdk-python`'s split: `_process.run_command`'s `retry`
parameter drives `run_with_retry` around one attempt closure
(`_process.py:264-293`), and the predicate that decides retryability
(`_retryable`) lives beside the loop, not inside each SDK-facing method
(`_process.py:834-844`). Centralizing it in Go buys the same thing Python's
version buys: a caller cannot accidentally retry a command Python/Go itself
knows is unsafe to retry (a timeout, a usage error, a permission error), and
a reviewer checking "is retry correct" reads one function, not N.

The retry predicate itself is fixed, matching GO-ERR-20 exactly: `ee.Code !=
tempFail` (75) is a hard stop for every other code, timeouts included (a
`*TimeoutError` fails the `errors.As(err, &ee)` type assertion outright, so
it is never retried — no separate check needed).

### 9. Coverage scope for the 100% gate (decision 5)

**Default `go test ./...` per-package coverage understates the SDK.**
Measured on the fixture, same test run, two invocations:

| Invocation | `total:` line | `internal/process` |
|---|---|---|
| `go test -coverprofile=cover.out ./...` | **25.7%** | 0.0% |
| `go test -coverprofile=cover.out -coverpkg=./... ./...` | **65.7%** | 85.7–92.3% (per function) |

This is not a fixture artifact of thin tests — it is how Go's coverage
instrumentation works: without `-coverpkg`, a package's coverage is measured
only against *that package's own* `_test.go` files, so a package like
`internal/process` that has zero test files of its own (all its exercise
comes from the public package's tests calling into it) reports flat 0%
regardless of how thoroughly it is actually exercised. `-coverpkg=./...`
attributes every statement execution to the package that defines it,
regardless of which package's test drove it — the only mode in which a
single-spawn-point SDK's `internal/` layer shows real numbers.

**Decision: the SDK's 100% gate runs `go test -coverpkg=./... -coverprofile=cover.out ./...`, not the bare default**, then reads the `total:` line of `go tool cover -func=cover.out` (GO-TEST-16, composed, unchanged: `fixtures/time-fuzz-coverage/coverage_gate.sh cover.out 100`). Running the *same* gate script against both profiles on the fixture: `65.7% < 100.0%` (exit 1) on either profile at the 100 threshold — the gate script itself is inherited and unmodified; only the profile it is fed changes.

**Packages without tests:** `internal/process` on the fixture has no
`_test.go` of its own — `go list ./...` marks it `[no test files]` in `go
test`'s own summary line. A package can carry 0% under the bare default and
still be fully exercised; a package with genuinely no exercise at all
(`[no test files]` *and* absent from the `-coverpkg=./...` function list at
non-zero%) is the actual gap the gate must catch, which is why `-coverpkg`
has to be the gate's mode: it is the only one where "no coverage" and "not
tested by this package's own file" are distinguishable.

**The helper-process branch needs an exclusion, not a fix.** The `if code :=
os.Getenv(helperEnvVar); code != ""` arm in `TestMain` only ever executes
inside the re-exec'd child process — a *different* OS process from the one
`go test -cover` is instrumenting, so that arm's own statements can never
appear covered in the parent's profile no matter how many exit codes the
test table drives through it. This is structural, not a testing gap: the
options are (a) accept it as a named, documented exclusion from the 100%
target (a one-line comment on the `if`, not a silent gap), or (b) move the
helper-process shim into a `_test.go` file guarded by a build tag that the
coverage run itself never compiles, which removes it from the profile
entirely rather than leaving it at 0%. Either is defensible; leaving it
unexcluded and demanding 100% anyway is not, because it cannot be reached.

**`internal/` in general does not need a blanket exclusion.** On the
fixture, `-coverpkg=./...` gave `internal/process.Run` 92.3% and `runOnce`
85.7% — high, driven entirely by the public package's own tests, with no
special wiring. The remaining gap there is the OS-signal branch
(`ws.Signaled()`), which needs a real signal delivered to a real child to
exercise — a fixture limitation this dive did not close (see
[Contested / evolving](#contested--evolving)), not evidence that
`internal/` as a category should be excluded from the gate.

### 10. Wrap-only vs an OCI library (M-D-18)

No dive measured a load-bearing argument for adding `go-containerregistry`,
`oras-go` v2, or `regclient` as a dependency of the SDK
([go-topic-map.md](../go-topic-map.md) row M-D-18: "contested, no documented
argument either way"). The SDK's contract is narrower than an OCI client's:
it runs `ocx <command> --format json` and decodes the result — it never
constructs a manifest, pushes a blob, or talks to a registry directly. Every
one of those operations already has an `ocx` subcommand, and the SDK's job
is to make that subcommand callable and typed from Go, not to reimplement
what `ocx` already does. Owner default stands: **wrap-only**, and this also
keeps the stdlib-only runtime promise (GO-MOD-10) trivially true — an OCI
library dependency would violate it on its own.

### 11. Versioning against ocx releases

`ocx-sdk-python` pins a tested floor and ceiling explicitly:
`TESTED_OCX_VERSION`/`MIN_SUPPORTED` constants and a `VersionCompatError`
raised when the discovered binary is older than `MIN_SUPPORTED`
(`_types.py:30-34`, `_errors.py:344-356`). The Go SDK mirrors this
unchanged — it is a project decision, not a language-specific one:

```go
const (
	TestedOcxVersion = "0.6.2" // the ocx version this SDK's contract tests run against
	MinSupportedOcx  = "0.6.2" // oldest ocx accepted; below it, VersionCompatError
)
```

The SDK's own module version tracks semver independently of ocx's version
(pre-1.0, no deprecation shims, exact-version pinning recommended — the
same "Stability" policy `ocx-sdk-python`'s README states, composed as a
language-neutral policy per `go-audit/config-inventory.md` §3's own
classification of that row). A `VersionCompatError`-equivalent Go type
belongs beside `ExitError`/`TimeoutError` in the error hierarchy; this dive
does not plant it in the fixture because no map row asked for a distinct
contract test on it — flagged as a gap in
[Contested / evolving](#contested--evolving).

### 12. The SDK CI MUST list

Composing GO-MOD-16 (CI Go selection), GO-GATE-01 (the gate block), and this
dive's own decisions (3), (4) and (5):

1. `go build ./...` and `go vet ./...` on `go-version: [oldstable, stable]` (GO-MOD-16, library/SDK matrix).
2. `golangci-lint run ./...` with `exhaustive` (`default-signifies-exhaustive: false`) and `nilnil` (`checked-types: [ptr, iface]`, or the fleet's `checked-types` list) both enabled for this package — not inherited from a CLI-only overlay (decision 3).
3. `go test -coverpkg=./... -coverprofile=cover.out ./...`, then the coverage gate script at threshold 100 on that profile, never the bare-default profile (decision 5).
4. `go list -deps -f '{{with .Module}}{{if not .Main}}{{.Path}}{{end}}{{end}}' ./... | sort -u` must print nothing (GO-MOD-10, composed).
5. `go doc -all .` grepped on declaration lines only for `\bany\b`/`interface{}` must print nothing (this dive's refinement of M-D-20's check — see [Findings §1](#1-package-layout-and-the-exported-surface) note on the naive grep's false positive).
6. `gofmt -l .` must print nothing (composed, GO-GATE baseline).
7. `govulncheck ./...` (GO-MOD-12, composed, blocking).

## Normative guidance candidates

1. **A published SDK's constructor uses `NewClient(opts ...Option) (*Client, error)`, func-typed options, when its option set will grow across minor versions; a per-call optional set that is small and closed is a config struct instead.**
   - Rationale: matches the growth pattern of a versioned, imported library, not a one-shot CLI invocation; avoids a constructor signature break every time a new global flag needs exposing.
   - Verify: reading heuristic — a constructor with more than ~3 parameters, or one expected to grow, uses `opts ...Option`; a same-call, closed-set parameter (e.g. `PullOptions`) is a struct.
   - Run: no (reading heuristic; confirmed by exemplar reading, not a lint — `google/go-github@48d0a668cde8:github/github.go:569`, `oras-project/oras-go@cb6d6dc79f83:copy.go:51`).

2. **Every SDK method takes `ctx context.Context` first; the `Client` struct stores no `context.Context` field.**
   - Rationale: composed from GO-CONC-01/02, unchanged; a stored context outlives the call that scoped it.
   - Verify: `golangci-lint` `containedctx` (no built-in exceptions) plus `revive` `context-as-argument`.
   - Run: no, this dive (inherited watched-red from [go-concurrency.md](../go-concurrency.md) `[ctx] b-structfield`, exit 1 → 0).

3. **`*ExitError` carries `Code ExitCode`, `Stderr string`, and `Envelope *ErrorEnvelope` (nil when absent); it never carries or `Unwrap`s to `*exec.ExitError`.**
   - Rationale: gives a caller the raw diagnostic and the structured slug in one type, without exposing the stdlib's own exit-status type as part of the SDK's contract (GO-ERR-16's flattening).
   - Verify: a contract test — `errors.As(err, &exec.ExitError{})` must be `false` for every `*ExitError` the SDK raises; a stdout that is a valid C-S1-1 envelope decodes into a non-nil `Envelope` with the right `Detail`.
   - Run: **yes**, `fixtures/sdk-surface/sdk` `TestClassifyDecodesEnvelope` / `TestClassifyNoEnvelopeOnPlainStderr`, exit 0 both (see [Verification runs](#verification-runs)).

4. **The SDK's timeout is `context.WithTimeoutCause(ctx, d, cause)` reported as a distinct `*TimeoutError` whose `Is(target)` matches the exported sentinel `ErrOcxTimeout`; `*TimeoutError` must never match `*ExitError` through `errors.As`.**
   - Rationale: resolves contradiction 12 in GO-ERR-20's favour of the typed error, with GO-CONC-17's sentinel folded in as the `Is` target rather than a second, competing representation.
   - Verify: a contract test — `errors.Is(err, ErrOcxTimeout)` true, `errors.As(err, &ExitError{})` false, for a wrapped `*TimeoutError`.
   - Run: **yes**, `TestTimeoutErrorIsAndNeverExitError`, exit 0 (see [Verification runs](#verification-runs)).

5. **`golangci-lint`'s `exhaustive` (`default-signifies-exhaustive: false`) is enabled for the SDK package itself, not inherited only through a CLI-only overlay, on every switch over `ExitCode`.**
   - Rationale: resolves contradiction 13 — measured to fire on the SDK's own classification code exactly as it does on a CLI's, so restricting the linter to the CLI overlay leaves the SDK's switches unchecked.
   - Verify: `golangci-lint run -c <config with exhaustive enabled> ./...`; `0 issues` is the pass.
   - Run: **yes**, `fixtures/sdk-surface/sdk` — missing-case switch: exit 1 with `missing cases in switch of type ocxsdk.ExitCode: ocxsdk.ExitPolicyBlocked`; full switch: exit 0, `0 issues` (see [Verification runs](#verification-runs)).

6. **No SDK surface method returns `(nil, nil)` for a pointer, interface, or func result.**
   - Rationale: ocx already has a typed "not found" exit (79); a silent `(nil, nil)` on top of that gives a caller two ways to represent the same absence, one of which crashes on first dereference.
   - Verify: `golangci-lint` `nilnil` with `settings.nilnil.checked-types: [ptr, iface]` (or the fleet's fuller list, minus `map`).
   - Run: **yes**, planted `findLocal` returning `(nil, nil)`: exit 1 with `return both a nil error and an invalid value: use a sentinel error instead (nilnil)`; removed: exit 0, `0 issues` (see [Verification runs](#verification-runs)).

7. **Retry lives in exactly one function, the SDK's single spawn point, and retries only exit 75 (TempFail); it is never re-implemented per public method.**
   - Rationale: centralizes the one place a reviewer needs to check "is retry correct," and makes it structurally impossible for one command's wrapper to retry something GO-ERR-20 forbids.
   - Verify: reading heuristic — `grep -rn --include='*.go' -e 'for .* retry' -e 'Attempts' .` should surface exactly one loop; a second loop anywhere else in the package is the finding.
   - Run: no (reading heuristic; the one-loop shape is demonstrated, not independently red/green tested, since a second-loop violation would just be more code doing the same thing correctly, not a distinguishable failure mode without duplicating the whole retry contract test).

8. **The SDK's coverage gate runs on a `-coverpkg=./...` profile, never the bare per-package default; the `TestMain` helper-process branch is a named, documented exclusion from the 100% target, not silently absorbed into it.**
   - Rationale: the bare default under-attributes coverage the moment a spawn-point package has no test files of its own (measured: 25.7% vs 65.7% on the identical test run); the helper branch is structurally unreachable from the profiling process.
   - Verify: `go test -coverpkg=./... -coverprofile=cover.out ./... && fixtures/time-fuzz-coverage/coverage_gate.sh cover.out 100`; the script's exit code is the gate.
   - Run: **yes**, both profiles measured on the fixture and fed through the (already-watched, inherited) gate script; both give `65.7% < 100.0%` → exit 1 at threshold 100, and `65.7% >= 60.0%` → exit 0 at threshold 60, proving the script reacts to the number it is given (see [Verification runs](#verification-runs)). The 100%-vs-default distinction itself is a measurement, not a red/green lint — there is no failure mode for "used the wrong coverage flag" other than reading the CI job.

9. **The SDK depends on nothing beyond the stdlib at runtime (GO-MOD-10, composed): wrap-only, no OCI client library (M-D-18's default).**
   - Rationale: no dive found a load-bearing argument for an OCI dependency, and adding one would itself violate GO-MOD-10.
   - Verify: `out=$(go list -deps -f '{{with .Module}}{{if not .Main}}{{.Path}}{{end}}{{end}}' ./... | sort -u); test -z "$out"`.
   - Run: **yes** (inherited from GO-MOD-10's own contract test, [go-modules.md](../go-modules.md):65; re-run on this fixture, empty output, see [Verification runs](#verification-runs)).

10. **`go doc -all .` is checked for `any`/`interface{}` only on declaration lines (`func `, `type `, `var `, `const `, and tab-indented struct-field lines), never on the full text, because doc-comment prose legitimately contains the English word "any."**
    - Rationale: the naive grep `grep -n -E '\bany\b|interface\{\}' doc.txt` false-positives on ordinary prose the moment a doc comment uses the word "any" in its normal English sense (measured on the fixture: hit a sentence "true for any TimeoutError").
    - Verify: `grep -n -E '^(func|type|var|const) .*(\bany\b|interface\{\})' doc.txt` (declarations only); empty output is the pass.
    - Run: **yes** — full-text grep false-positived on the fixture's own doc comment; the refined declaration-only grep gave empty output on the clean surface and matched `func WithExe(exe any) Option` the moment `any` was planted in a real signature (see [Verification runs](#verification-runs)).

## Verification runs

All commands below ran through
`/home/mherwig/.cache/research-lang/go-tools/run.sh <cmd>` (Go 1.27.1,
`GOTOOLCHAIN=local`, golangci-lint 2.14.0) from
`/home/mherwig/.cache/research-lang/go-tools/fixtures/sdk-surface/sdk/`
unless noted. Go version: 1.27.1. golangci-lint version: 2.14.0.

1. **One exported package.**
   `go list ./...` → `sdkfixture.example/ocxsdk` and
   `sdkfixture.example/ocxsdk/internal/process` (2 lines). `go list ./... |
   grep -v -c '/internal/'` → `1`. Exit 0.

2. **`go list -deps` is stdlib-only (GO-MOD-10, re-run).**
   `out=$(go list -deps -f '{{with .Module}}{{if not .Main}}{{.Path}}{{end}}{{end}}' ./... | sort -u); test -z "$out"` → `$out` empty, `test` exit 0.

3. **`go doc -all .` — naive grep false-positives, refined grep does not.**
   `go doc -all . > doc.txt` (exit 0). `grep -n -E '\bany\b|interface\{\}'
   doc.txt` → matched line 117, "Is makes errors.Is(err, ErrOcxTimeout) true
   for **any** TimeoutError." (prose, not a type). Refined:
   `grep -n -E '^(func|type|var|const) .*(\bany\b|interface\{\})' doc.txt` →
   empty, exit 1 (no match = pass). **Watched red:** planted `func
   WithExe(exe any) Option` in `client.go`; refined grep then matched line
   `func WithExe(exe any) Option`, exit 0 (violation found). Reverted;
   `go build ./...` exit 0, `go test ./...` exit 0, refined grep exit 1
   again (clean).

4. **`exhaustive` fires on the SDK's `ExitCode` switch (decision 3).**
   Config: `linters: {default: none, enable: [exhaustive]}, settings:
   {exhaustive: {default-signifies-exhaustive: false}}`.
   Compliant: `golangci-lint run -c <cfg> ./...` → `0 issues.`, exit 0.
   **Watched red:** removed the `case ExitPolicyBlocked:` arm from
   `slugFor`'s switch in `errors.go` → `errors.go:32:2: missing cases in
   switch of type ocxsdk.ExitCode: ocxsdk.ExitPolicyBlocked (exhaustive)`,
   `1 issues: * exhaustive: 1`, exit 1. Restored the case; `go build ./...`
   exit 0, re-run exit 0, `0 issues.`.

5. **`nilnil` fires on a planted `(nil, nil)` surface method (decision 4).**
   Config: `linters: {default: none, enable: [nilnil]}, settings: {nilnil:
   {checked-types: [ptr, iface]}}`.
   Baseline: `golangci-lint run -c <cfg> ./...` → `0 issues.`, exit 0.
   **Watched red:** appended `func (c *Client) findLocal(id string)
   (*PullResult, error) { return nil, nil }` to `client.go` →
   `client.go:93:2: return both a nil error and an invalid value: use a
   sentinel error instead (nilnil)`, `1 issues: * nilnil: 1`, exit 1.
   Removed the function; `go build ./...` exit 0, re-run exit 0, `0 issues.`.

6. **`*ExitError` carries the decoded envelope; never matches
   `*exec.ExitError` (decision 1).**
   `go test -run TestClassifyDecodesEnvelope -v ./...` → PASS, exit 0 (a
   `process.ExitError{Stdout: "<C-S1-1 JSON with an error key>"}` classifies
   into `*ExitError{Envelope.Detail: "ref_missing"}`).
   `go test -run TestClassifyNoEnvelopeOnPlainStderr -v ./...` → PASS, exit
   0 (plain stderr, no JSON stdout, classifies with `Envelope == nil`).

7. **The timeout shape never matches `*ExitError` (decision 2).**
   `go test -run TestTimeoutErrorIsAndNeverExitError -v ./...` → PASS,
   exit 0. `errors.Is(err, ErrOcxTimeout)` true; `errors.As(err,
   &ExitError{})` false, for a `%w`-wrapped `*TimeoutError`.

8. **The fleet exit-code table is reachable without a real `ocx` binary
   (GO-TEST-12, composed) and only 75 is ever the retry code (GO-ERR-20,
   composed).**
   `go test -run TestExitCodeCoverage -v ./...` → PASS for all 12 codes
   (`0 1 64 65 69 74 75 77 78 79 80 81`), exit 0. `go test -run
   TestExitErrorRetryable -v ./...` → PASS, exit 0 (`ExitTempFail`
   retryable, `ExitUnavailable` not).

9. **Coverage: default vs `-coverpkg=./...` on the identical test run
   (decision 5).**
   `go test -coverprofile=cover_default.out ./...` → `sdkfixture.example/ocxsdk
   coverage: 49.1%`, `internal/process coverage: 0.0%`; `go tool cover
   -func=cover_default.out` → `total: 25.7%`.
   `go test -coverprofile=cover_all.out -coverpkg=./... ./...` →
   `sdkfixture.example/ocxsdk coverage: 65.7% of statements in ./...`; `go
   tool cover -func=cover_all.out` → `total: 65.7%`, with `internal/process`
   functions at 85.7–92.3%.
   Gate script (inherited, GO-TEST-16, unmodified) on the `-coverpkg` profile:
   `fixtures/time-fuzz-coverage/coverage_gate.sh cover_all.out 100` →
   `coverage 65.7% < threshold 100.0%`, exit 1. Same script, threshold 60 →
   `coverage 65.7% >= threshold 60.0%`, exit 0. This is not a red/green pair
   on this dive's own logic — GO-TEST-16's script was already watched red/
   green in [go-testing.md](../go-testing.md) `[C-14]` — it is evidence that
   the script correctly reads whichever profile it is given, which is the
   fact decision 5 turns on.

10. **`gofmt`, `go vet`, and the default `golangci-lint` config are clean on
    the whole fixture.**
    `gofmt -l .` → empty (after one `gofmt -w` pass on two files during
    authoring), exit 0. `go vet ./...` → exit 0, no output. `golangci-lint
    run ./...` (no `-c`, the tool's built-in default config) → `0 issues.`,
    exit 0.

## Exemplar evidence

| Candidate | Satisfies | Violates / contests |
|---|---|---|
| 1 (options for a growing constructor) | `google/go-github@48d0a668cde8:github/github.go:569,383` (`NewClient(opts ...ClientOptionsFunc) (*Client, error)`, options return `error`); `oras-project/oras-go@cb6d6dc79f83:registry/remote/policy/evaluator.go:80` (`EvaluatorOption func(*Evaluator)` on its one constructor) | — |
| 1 (config struct for a closed per-call set) | `oras-project/oras-go@cb6d6dc79f83:copy.go:51` (`CopyOptions`), `content.go:269` (`FetchOptions`), `pack.go:87,155` (`PackManifestOptions`, `PackOptions`) | — |
| 1 (positional required input) | `cli/cli@9b031151a825:api/client.go:30` (`NewClientFromHTTP(httpClient *http.Client) *Client` — the one thing every call needs is a plain parameter, not an option) | — |
| 2 (ctx first, never stored) | Composed from GO-CONC-01/02's own exemplar evidence ([go-concurrency.md](../go-concurrency.md), `[shape] §6`: 219–249 stored-context fields in 15/34 repos, none in the three named test repos' client constructors) | not independently re-measured this dive |
| 3 (typed `*ExitError` + envelope) | `ocx-sdk-python/src/ocx_sdk/_errors.py:114-141` (`OcxProcessError.stdout/.stderr`, raw); `_results.py:380-410` (`error_envelope`, decoded on demand) — the Go SDK's `Envelope` field collapses the Python SDK's two-step pattern into one, a deliberate divergence, not a defect | no Go exemplar in the named test set ships an equivalent CLI-wrapper error type (go-github, oras-go and cli/cli's `api` package all wrap HTTP, not a subprocess) — this candidate's positive evidence is the Python template, not the Go corpus |
| 4/5 (timeout shape) | `pkg.go.dev/context#WithTimeoutCause` (go 1.21.0, fetched 2026-09-26) | contradiction 12 itself, resolved provisionally by the map, pinned here |
| 6 (`exhaustive` on SDK switches) | Fixture-only measurement (no map row or prior dive tested this on an SDK-shaped switch) | GO-GATE-18's CLI-only overlay framing is corrected by this measurement, not merely restated |
| 7 (no `(nil, nil)`) | `ocx` itself has typed exits for absence (79); no named test-repo counter-example found in the `api`/`github`/`oras-go` client-construction code read for this dive | `Antonboom/nilnil` README (fetched 2026-09-26) notes `(nil, nil)` "is not idiomatic," a general claim, not exemplar-specific |
| 8 (one retry loop) | `ocx-sdk-python/src/ocx_sdk/_process.py:264-293,834-844` (one `run_with_retry` call site, one `_retryable` predicate) | not independently measured across the three named Go test repos — none of them retries a subprocess exit code, so there is no Go exemplar analogue to check against |
| 9 (coverage scope) | Fixture-only measurement; no map row or prior dive measured default-vs-`-coverpkg` on a spawn-point-shaped package | GO-TEST-16's own consolidation ([go-testing.md](../go-testing.md):492-502) measured the gate script's red/green on a flat package, not this default-vs-coverpkg gap — this dive adds that half |

## AI-agent angle

- **Reaching for `map[string]any`/`json.RawMessage` on the public surface
  "to be safe" against ocx adding fields.** `encoding/json.Unmarshal` into a
  struct already ignores unknown keys — the safety a model is trying to buy
  is free with a typed struct. Smallest check: `go doc -all .`, declaration
  lines only, grepped for `\bany\b`/`interface{}` (candidate 10); a hit on a
  method signature is the tell.
- **Writing `*ExitError` as `type ExitError struct { *exec.ExitError; Code
  int }`** — embedding the stdlib type because it is the shortest path to
  "carry the exit code." This makes `errors.As(err, &exec.ExitError{})` true
  for every SDK failure, which is exactly the leak GO-ERR-16 forbids.
  Smallest check: a contract test asserting `errors.As(sdkErr,
  &exec.ExitError{})` is `false`.
- **Retrying every non-zero exit "to be robust," or retrying inside each
  public method separately.** A model asked to "add retries" to an SDK
  wrapper commonly adds a loop per call site rather than finding the one
  spawn point, and commonly retries on any error rather than only the
  code ocx marked transient. Smallest check: `grep -rn --include='*.go' -e
  'for .* attempt' -e 'Attempts' .` should surface exactly one loop; a
  second hit is the finding, and a contract test pinning "`Retryable()` is
  true only for 75" catches the retry-everything mistake directly.
  (candidates 4, 7)
- **A `default:` case inside an `ExitCode` switch, assumed to make it
  "exhaustive enough."** Under the fleet's own pinned
  `default-signifies-exhaustive: false`, a `default:` does **not** exempt
  missing cases — a model that adds one and stops checking has not actually
  covered the table. Smallest check: `exhaustive` itself, run with the
  pinned setting; candidate 5's watched-red fixture reproduces exactly this
  mistake shape.
- **`(nil, nil)` for "found nothing," carried over from Python or JS
  instincts** ("return null" reads naturally as "not an error"). Smallest
  check: `nilnil` with `checked-types: [ptr, iface]`; candidate 6's fixture
  is the minimal reproduction.
- **Believing `go test ./...`'s printed coverage percentage is the SDK's
  real number**, and setting a CI gate against it directly. A model that
  reads `go test -cover`'s own summary line and wires a threshold against it
  will silently under-count any package whose tests live elsewhere in the
  module — exactly `internal/process` here. Smallest check: run the same
  test invocation once with and once without `-coverpkg=./...` and diff the
  `total:` lines; a gap larger than a rounding error means the default was
  about to gate on the wrong number (candidate 8/decision 5).
- **`golang/mock`, `github.com/pkg/errors`, or `io/ioutil` showing up in the
  SDK's own code or its test helpers** (training-data recency skew, named
  explicitly in GO-MOD-08, composed and not re-decided here but load-bearing
  for this SDK specifically because it is the fleet's flagship
  zero-dependency example). Smallest check: the fleet's `depguard`
  `superseded` rule (GO-MOD-08), run on this package.

## Contested / evolving

- **Whether `*ExitError.Envelope` should decode eagerly (this dive's choice)
  or lazily, mirroring `ocx-sdk-python`'s `error_envelope(exc)` free
  function exactly.** The eager version costs one `json.Unmarshal` attempt
  on every non-zero exit, even when a caller never inspects `.Envelope`; the
  lazy version matches the Python SDK's own API one-for-one but reintroduces
  the "forgot to call it" failure mode the eager version removes. No dive
  measured the actual cost of the eager unmarshal at scale; if the SDK's hot
  path turns out to be dominated by non-zero exits under normal operation
  (unlikely, but untested), this should be revisited toward lazy decoding.
- **A `VersionCompatError` Go type was named as a mirror of
  `ocx-sdk-python`'s (§11) but was not planted in the fixture or given a
  contract test**, because no map row asked for one specifically. It belongs
  in the eventual `go-quality`/GO-API rule text but is a gap this dive
  leaves open rather than papers over.
- **The OS-signal branch of `internal/process.runOnce`
  (`ws.Signaled()`) is untested on this fixture** — it needs a real signal
  delivered to a real child mid-`Wait`, which this dive's helper-process
  pattern (an exiting-immediately fake `ocx`) cannot produce without
  additional machinery (a child that blocks until signaled). GO-IO-14's own
  consolidation may already cover this pattern; this dive did not re-verify
  it against the SDK's own composed spawn point specifically.
- **Whether the eventual `go-quality`/GO-API rule text states decision 5's
  `-coverpkg=./...` requirement as its own MUST row or folds it into
  GO-TEST-16's text as a clarifying clause.** Both are defensible; this dive
  takes no position beyond recording the measurement, since rule-ID
  ownership is an authoring-time call the map already routes through
  GO-TEST for the gate mechanism itself.
- **`exhaustive` binding the SDK, not only CLIs (decision 3), is a
  correction to GO-GATE-18's framing** that has not yet been reconciled
  against GO-GATE-18's own text; this dive states the measurement and leaves
  the reconciliation to whichever consolidation drafters touch GO-GATE-18
  next, per the map's contradiction-tracking convention.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/doc/modules/layout](https://go.dev/doc/modules/layout) | go.dev official module-layout guidance | current, fetched 2026-09-26 | Primary source for `internal/`'s purpose and the "one exported root package, internal/ underneath" shape this dive's package layout decision rests on |
| [pkg.go.dev/context#WithTimeoutCause](https://pkg.go.dev/context#WithTimeoutCause) | stdlib API reference | go 1.21.0, fetched 2026-09-26 | Exact signature and doc text for the timeout-shape decision (§5); confirms the go 1.21 floor GO-CONC-17 already states |
| [pkg.go.dev/os/exec#Cmd.WaitDelay](https://pkg.go.dev/os/exec#Cmd.WaitDelay) | stdlib API reference | fetched 2026-09-26 | Confirms the WaitDelay shutdown semantics `internal/process` composes from GO-IO-07, read directly rather than assumed |
| [github.com/nishanths/exhaustive](https://github.com/nishanths/exhaustive) (README) | the exhaustive linter's own documentation | fetched 2026-09-26 | Confirms `default-signifies-exhaustive: false` does not exempt a `default:` clause — the exact behaviour decision 3 measures |
| [github.com/Antonboom/nilnil](https://github.com/Antonboom/nilnil) (README) | the nilnil linter's own documentation | fetched 2026-09-26 | Confirms the `(nil, nil)` anti-pattern's rationale and the `checked-types` mechanism decision 4 relies on |
| `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/__init__.py` | the SDK template, public surface | read in full 2026-09-26 | The `__all__`/underscore-module convention this dive's package-layout decision translates to Go's `internal/` |
| `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_errors.py` | the SDK template, exception hierarchy | read in full 2026-09-26 | `ExitCode`, `OcxProcessError`, `_EXIT_CODE_ERRORS`, and the `.stdout`/`.stderr` split this dive's `*ExitError` mirrors and diverges from (§4, §11) |
| `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py` | the SDK template, subprocess lifecycle | read in full 2026-09-26 | `run_command`'s retry-loop shape (§8), `KILL_GRACE`, and the redaction/capture discipline `internal/process` composes from GO-IO |
| `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_results.py` (partial: header, `_envelope`/`error_envelope`/`partial_report`/`tolerated_report`, `CommandResult`) | the SDK template, typed-result parsing | read 2026-09-26 | The one-command-one-parser rule (§3) and the envelope-vs-report discriminator this dive's `decodeEnvelope`/`ErrorEnvelope` mirror |
| `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_types.py` | the SDK template, shared vocabulary | read in full 2026-09-26 | `RetryPolicy.retry_on: frozenset[ExitCode]` — the retry-predicate shape §8 composes into Go's `tempFail` constant check |
| `google/go-github@48d0a668cde8:github/github.go` (local clone, exemplar corpus) | a published Go SDK wrapping a REST API | read 2026-09-26 | `NewClient(opts ...ClientOptionsFunc) (*Client, error)` — the exact constructor shape candidate 1 is built on, read from source, not a snippet |
| `oras-project/oras-go@cb6d6dc79f83:copy.go`, `content.go`, `pack.go`, `registry/remote/policy/evaluator.go` (local clone, exemplar corpus) | an OCI client library, one option shape per call site | read 2026-09-26 | Confirms both flavours of map conflict 4's decision procedure coexist in one real module |
| `cli/cli@9b031151a825:api/client.go` (local clone, exemplar corpus) | the GitHub CLI's own internal API client package | read 2026-09-26 | `NewClientFromHTTP` — the positional-required-input half of conflict 4, and the "test against" repo the brief named |
| [go-audit/config-inventory.md](../go-audit/config-inventory.md) §3 | fleet audit of the SDK template's commitments | wave 1, 2026-09-26 | The 32-name surface count, the commitments table this dive's decisions were checked against, composed as an input |
| [go-topic-map.md](../go-topic-map.md) §Conflicts resolved (4, 6), §(e) contradictions 12–13, §M-D rows | the program's binding map | wave 1, 2026-09-26 | The map rows this dive answers and the contradictions it resolves; binding, not re-decided |
| [go-errors.md](../go-errors.md) GO-ERR-12/16/20 | wave-2 consolidation | 2026-09-26 | Composed inputs: the exit-error type, the wrap-flattening rule, and the `(nil, nil)` SHOULD this dive tightens to a MUST for the SDK |
| [go-io.md](../go-io.md) GO-IO-01/07/13/14/15/20 | wave-2 consolidation | 2026-09-26 | Composed inputs: the spawn-point, WaitDelay, tree-kill, capture and env-allowlist rules `internal/process` implements without re-deciding |
| [go-cli.md](../go-cli.md) GO-CLI-01/12 | wave-2 consolidation | 2026-09-26 | The 0–86 table and the `exhaustive`/`WaitStatus` clauses this dive extends to the SDK (decision 3) |
| [go-concurrency.md](../go-concurrency.md) GO-CONC-01/02/11/17 | wave-2 consolidation | 2026-09-26 | The ctx-first, no-stored-ctx, goleak, and `WithTimeoutCause` rules composed into §2 and §5 |
| [go-testing.md](../go-testing.md) GO-TEST-12/14/16 | wave-2 consolidation | 2026-09-26 | The helper-process test pattern (§ TestMain), the fuzz-target SHOULD, and the coverage-gate script this dive re-runs with a different profile (decision 5) |
| [go-modules.md](../go-modules.md) GO-MOD-01/02/10/11/16 | wave-2 consolidation | 2026-09-26 | The `go` line, no-`toolchain`, stdlib-only-runtime, no-`tool`, and CI-matrix rules composed unchanged into the fixture's `go.mod` and CI MUST list |

---
title: Package Shape and the SDK Surface
summary: The GO-API family. Exported surface, package layout, options versus config structs, doc comments and deprecation, API evolution at release, and the contract of an SDK that wraps a CLI binary (version gate, signal exits, timeout cause)
---

# Package Shape and the SDK Surface

Owns what a package exports and how that surface evolves: layout, naming, doc
comments, parameter shape, enums, aliasing, the release-time compatibility gate,
and the typed SDK that wraps a CLI binary. Does not own the error types
themselves. `*ExitError` and its code are `GO-ERR-20`, general `(nil, nil)` is
`GO-ERR-12`, and embedding stdlib errors is `GO-ERR-16`, all in `GO-ERR`. A stored
`context.Context` is `GO-CONC-02` in `GO-CONC`. The single spawn point is
`GO-IO-13` in `GO-IO`. A CLI forwarding its own child's exit is `GO-CLI-12` in
`GO-CLI`. The text of every golangci-lint file is `GO-GATE`, owned by the
go-modules rule: this file names linters and settings, never YAML. The helper
process and the 100% gate are `GO-TEST-12` and `GO-TEST-16` in `GO-TEST`, and the
SDK's stdlib-only dependency graph is `GO-MOD-10`.

Contents: [Dates and Floors](#dates-and-floors) ·
[The SDK Surface Script](#the-sdk-surface-script) ·
[The Library and SDK Lint Overlay](#the-library-and-sdk-lint-overlay) ·
[API Evolution at Release](#api-evolution-at-release) ·
[The Coverage Profile](#the-coverage-profile) ·
[SDK Contract Tests](#sdk-contract-tests) ·
[Parameters, Aliasing and Layout](#parameters-aliasing-and-layout) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0 (bundled
staticcheck 0.8.1), staticcheck 2026.2.1, and `gorelease`/`apidiff` from
`golang.org/x/exp` v0.0.0-20260908205506-85c1c2202aba.

- **Floors.** `any` (go 1.18), doc-comment syntax (go 1.19), `slices.Clone`,
  `maps.Clone` and `context.WithTimeoutCause` (go 1.21), and `errors.AsType`
  (go 1.26) are gated by the `go` line. `//go:fix inline` (go 1.26) and a
  `-coverpkg` profile listing untested packages (go 1.22) are gated by the
  toolchain.
- **Pinned default:** libraries and the SDK declare `go 1.26.0`, so every floor
  here is met. The adopter may override it, and a lower line loses the
  `errors.AsType` test form.
- **Pinned default:** the reference SDK wraps one binary, `ocx`, as package
  `ocxsdk`. The names `TestedOcxVersion`, `MinSupportedOcx`, `ErrOcxTimeout` and
  the not-found exit 79 come from that CLI. An adopter wrapping another binary
  renames them once and keeps every mechanism.
- **Gap:** GO-API-19's runtime behaviour was watched on Linux only. Windows has
  no POSIX signal delivery, so its kill path is unwatched.

## The SDK Surface Script

Three CI script steps, run from the SDK module root under bash or zsh:

```bash
# GO-API-01: prints the number of non-internal packages. 1 is the pass.
go list ./... | grep -c -v -e '/internal/'
# GO-API-02: prints any/interface{} on the exported surface. Empty output is the pass.
go doc -all . | grep -e '^func ' -e '^type ' -e '^var ' -e '^const ' -e $'^\t' | grep -v -e $'^\t\t*//' | grep -e '\bany\b' -e 'interface{}'
# GO-API-03: presence check. Empty output is the finding.
go doc -short . | grep -E '^type Option func\(\*options\) error'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-API-01 | Export exactly one package from the SDK module and put every other package under `internal/`. | A non-`internal` helper package is importable forever, and the compiler enforces `internal/`. **Pinned default:** one exported package over an `internal/` tree that wraps the CLI binary and nothing else (default, the adopter may override). | The script's GO-API-01 line prints `1`. Any other count is the finding. Use `go list`, never `find`: a directory count over-reports 1-66x on repos with nested modules. | MUST (SDK) |
| GO-API-02 | Keep `any` and `interface{}` off the exported surface: signatures, exported struct fields and interface methods. Decode each command into its own exported result struct with `encoding/json`, never into `map[string]any` or `json.RawMessage`. | `json.Unmarshal` already ignores unknown keys, so an untyped map buys no forward compatibility and gives the caller nothing to compile against. | The script's GO-API-02 line reads declaration lines and tab-indented field and method lines, and skips comment lines and indented prose. Empty output is the pass. A declaration-only regex misses fields and interface methods. | MUST (SDK) |
| GO-API-03 | Construct with `NewClient(opts ...Option) (*Client, error)`, where `type Option func(*options) error` closes over an unexported `options` struct, from the first tag. Required inputs are positional. Never carry a `context.Context` in an option (GO-CONC-02). | The option set grows with every global flag of the wrapped CLI. `apidiff` lists `func(*Client)` becoming `func(*Client) error` under "Incompatible changes", so the error return cannot be added later. | The script's GO-API-03 line. Empty output is the finding. | MUST (SDK) |

```go
// wrong: adding "error" to the return later is an incompatible change
type Option func(*Client)

// right: fixed from the first tag, over an unexported struct
type Option func(*options) error
```

## The Library and SDK Lint Overlay

```bash
golangci-lint run --config lib-sdk.golangci.yml ./...
```

`lib-sdk.golangci.yml` is GO-GATE's complete file. The rows below rely on these
settings by name: `gochecknoglobals`, `gochecknoinits`, `ireturn` and `exhaustive`
enabled, staticcheck `checks: [all]` (turns on ST1000, ST1003, ST1016 and
ST1020-22), `exhaustive.default-signifies-exhaustive: false`, revive `rules` with
exactly `context-as-argument`, `deep-exit`, `time-equal` and `exported`, and
`linters.exclusions.presets: []`. A CLI copies `cli.golangci.yml` whole and never
this file (GO-GATE-18). Exit 0 with `0 issues.` is the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-API-04 | Give every package a `// Package x` comment and every exported identifier a doc comment whose first word is its name. The overlay carries no exclusion preset, and never `comments`. | pkg.go.dev is a library's only reference. The `comments` preset drops exactly ST1000, ST1020-22 and revive `exported ... should have comment`, so under the baseline an undocumented package reports `0 issues.` | The overlay run. Any entry in the overlay's `presets:` list is itself the finding. For non-main packages of a CLI, which run `cli.golangci.yml`, this is a reading check. | MUST (library, SDK) · SHOULD (CLI non-main packages) |
| GO-API-05 | Initialisms are all-caps (`URL`, `ID`). Every method on a type uses the same short receiver, never `self` or `this`. Accessors take no `Get` prefix. No package is named `util`, `common` or `base`, and no name stutters with its package (`ocxsdk.Client`, not `ocxsdk.OcxClient`). | Callers read every exported name qualified by its package, so a mis-cased or stuttering name is permanent API. | The overlay run: ST1003 (initialisms), ST1016 (receiver consistency), ST1006 (`self`). Do not add revive `var-naming` or `receiver-naming`, which duplicate them hit for hit. The `Get` prefix and package names are a reading check. | SHOULD |
| GO-API-06 | No mutable package-level variables and no `init()`. Put state in the `Client` or pass it as a parameter. | A global that every caller's test setup must reset is hidden coupling. Measured 6.4 and 0.4 hits per 10k LOC on five library exemplars with zero false positives. | `gochecknoglobals` and `gochecknoinits` in the overlay. `Err*` sentinels and `regexp.MustCompile` vars are already exempt, so no allowlist is needed. | MUST (SDK) · SHOULD (library) |
| GO-API-07 | Declare interfaces in the package that consumes them and return concrete types from constructors. An exported interface needs two or more real implementations or a doc sentence saying why it exists. | A single-implementation interface blocks adding methods (every addition breaks implementers) and hides the concrete API. | `ireturn` at its default allow list. A legitimate subsystem constructor carries `//nolint:ireturn // reason`. The implementation count is a reading check. | SHOULD |
| GO-API-08 | Check every `switch` over a typed enum with `exhaustive`, where a `default:` arm does not count. Enums whose values the package defines start at `iota + 1`, so zero means unset. Externally defined values such as `ExitCode` keep their real numbers. | Go has no closed sum types, so a new `ExitCode` constant is silently unhandled everywhere it is switched on. | `exhaustive` at `default-signifies-exhaustive: false`, in both the overlay and the CLI file. | MUST (SDK, CLI) · SHOULD (other code) |
| GO-API-09 | No exported SDK method returns `(nil, nil)`, and the SDK never suppresses `nilnil`. | The wrapped CLI already types absence as an exit code (**pinned:** 79, `*ExitError`). A second, nil-shaped absence panics on the caller's first dereference. | `nilnil` from the baseline, plus `grep -rnE --include='*.go' 'nolint:[a-z,]*nilnil' .` from the SDK root: output is the finding, empty output is the pass. | MUST (SDK) |

## API Evolution at Release

```bash
BASE=v0.3.0
NEXT=v0.4.0
# GO-API-10: bind the tags first (example values). A non-zero exit blocks a v1+ release.
go run golang.org/x/exp/cmd/gorelease@v0.0.0-20260908205506-85c1c2202aba -base="$BASE" -version="$NEXT"
# GO-API-10, v0 modules: output forces a minor bump and a changelog line.
go run golang.org/x/exp/cmd/gorelease@v0.0.0-20260908205506-85c1c2202aba -base="$BASE" -version="$NEXT" | grep -e '^## incompatible changes'
# GO-API-11: a misspelled deprecation prefix. Empty output is the pass.
grep -rn -i --include='*.go' -e '^\s*//\s*deprecated\b' . | grep -v -e '// Deprecated: '
# GO-API-11: exits 1 while a call through a //go:fix inline function remains.
go fix -diff ./...
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-API-10 | Run the pinned `gorelease` against the previous tag before every tag. Never gate on `apidiff`'s exit code. State the major-version strategy once in the README: unsuffixed forever, or accepted `/vN` bumps. **Pinned default:** the SDK stays v0 while the wrapped CLI is pre-1.0 and tells users to pin an exact version (default, the adopter may override). | Models size a bump by diff length, not API effect. `apidiff` exits 0 on an incompatible change. `gorelease` exits 1 on one only at v1+, and at v0 it reports and exits 0. | The first two block lines. v1+: a non-zero exit is the finding. v0: output from the grep is the finding. Watched: a removed method exits 1 at v1, exits 0 with `## incompatible changes` at v0. | MUST (library, SDK) |
| GO-API-11 | Deprecate with a paragraph beginning exactly `Deprecated: ` that names the replacement as a doc link (`[New]`). Where the replacement is a call, alias or constant, add `//go:fix inline` so GO-GATE-03's `go fix -diff ./...` migrates callers. | Tooling and pkg.go.dev recognise only the exact prefix, and the inliner moves every caller mechanically. | The block's GO-API-11 grep catches `deprecated:`, `DEPRECATED:` and `Deprecated -`, and empty output is the pass. `go fix -diff ./...` exits 1 while an inlinable call remains. | SHOULD |

## The Coverage Profile

```bash
go test -coverpkg=./... -coverprofile=cover.out ./...
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-API-12 | Feed GO-TEST-16's 100% gate the `-coverpkg=./...` profile above, never the per-package default. Exclude no `internal/` package and no `TestMain` branch. | Without `-coverpkg` a package tested only through the public package reads 0%. Measured on one SDK: 25.7% default against 65.7% with `-coverpkg`, same tests. `_test.go` lines never enter a profile, so a `TestMain` exclusion excludes nothing. | The command above, then GO-TEST-16's gate on `cover.out` at 100. The gate's non-zero exit is the finding. **Pinned default:** 100% for the SDK (default, the adopter may override). | MUST (SDK) |

## SDK Contract Tests

No analyzer sees these. Each row is a contract test shipped with the SDK, using
GO-TEST-12's helper process (the test binary re-execs itself as a fake CLI). No
public exemplar gates a wrapped binary's version, reads `WaitStatus.Signaled()`
or calls `WithTimeoutCause`, so these are commitments, not codified convention.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-API-18 | Gate every typed call on the wrapped binary's version. `NewClient` never probes. Each typed method first calls one unexported gate that runs the plain version command (**pinned:** `ocx version`, one bare semver token) through the single spawn point with the caller's `ctx`. Cache under a mutex, set only on success. Compare the numeric `MAJOR.MINOR.PATCH` core, dropping any `-pre` or `+build` tail. Reject an unparsable version, accept one newer than `TestedOcxVersion`, fail only below `MinSupportedOcx` with `*VersionCompatError{Found, Minimum}`. No semver dependency (GO-MOD-10). `*ExitError` also carries `Stderr string` and an eagerly decoded `Envelope *ErrorEnvelope` that is `nil` on non-JSON stdout. | A caller that makes no typed call pays no spawn, and a failed probe or timeout must retry on the next call. A per-field `strconv.Atoi` split reads `2-rc1` as 0 and rejects every release candidate at the floor. | Contract test: below the floor gives `*VersionCompatError` with both fields set, above gives `nil`, and a second call after a cached success does not re-exec even when the fake now reports a failing version. Comparator table: `0.6.2-rc1` vs `0.6.2` not less, `0.6.10` vs `0.6.2` not less, `garbage` less. The error fields are a reading check. | MUST (SDK, version gate) · SHOULD (SDK, error fields) |
| GO-API-19 | In the spawn point, map a signal-killed child to `*ExitError{Code: 128 + int(ws.Signal())}` whenever `ee.Sys().(syscall.WaitStatus)` reports `Signaled()`. Never pass on the raw `ExitCode()` and never report success. The classifier file carries no `//go:build` constraint. | `ExitCode()` is -1 on a signal death, and 255 once a CLI forwards it through `os.Exit`. `syscall.WaitStatus` exists on every GOOS, so a `unix` tag only deletes the classifier from the Windows build. | Contract test: signal a blocking helper child and assert `Code == 143` for SIGTERM and `137` for SIGKILL, skipped on Windows. `GOOS=windows go vet ./internal/process/...` must exit 0. `grep -rn --include='*.go' -F '.ExitCode()' internal/process` is a review locator only: the compliant classifier reads `ExitCode()` before its `Signaled()` branch. | MUST (SDK) |
| GO-API-20 | The SDK's own timeout is `context.WithTimeoutCause(ctx, d, cause)` where `cause` is a `*TimeoutError` whose `Is` targets the exported `ErrOcxTimeout`, never the bare sentinel. After `Wait`, check `context.Cause(ctx)` before classifying the exit. If it is the SDK's own `*TimeoutError`, fill in `Stderr` and return it, otherwise classify (GO-API-19). A caller's earlier deadline surfaces as the caller's cause, never as `ErrOcxTimeout`. This supersedes GO-CONC-17's sentinel example. | `Cmd.Wait` returns the kill's `*exec.ExitError` in preference to the context error, so classify-first reports the SDK's own timeout as exit 137. A bare-sentinel cause passes `errors.Is` and fails only `errors.AsType[*TimeoutError]`, so an `errors.Is`-only suite stays green. | Contract test, own deadline: `errors.Is(err, ErrOcxTimeout)`, `errors.AsType[*TimeoutError]` with `Stderr` intact, and `errors.AsType[*ExitError]` false. A shorter caller deadline gives `context.DeadlineExceeded` and never `ErrOcxTimeout`. A real helper child that writes stderr and stalls past the deadline yields `*TimeoutError` with that stderr. GO-IO-10's grep is silent on classify-first. | MUST (SDK) |

```go
// wrong: Wait returns the kill's *exec.ExitError, so the SDK's own
// timeout reaches the caller as *ExitError{Code: 137}
err := cmd.Wait()
return classify(err)

// right: read the cause first, then classify
err := cmd.Wait()
if te, ok := errors.AsType[*TimeoutError](context.Cause(ctx)); ok {
	te.Stderr = stderr.String()
	return te
}
return classify(err)
```

## Parameters, Aliasing and Layout

No linter covers these. Each is a reading check unless the cell names a test.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-API-13 | Choose the parameter shape in this order. Required inputs are positional. A small, closed, per-call optional set is a config struct whose zero value is the default. A published constructor whose options will grow takes functional options, `func(*options) error` whenever an option can fail or conflict with another. Interface-typed options only when options must be opaque or comparable. | Of 112 func-typed option types measured in public Go code, 7 return `error`. A model that knows only `func(*T)` reproduces the majority even where two options conflict, and cannot report the conflict. | Reading check. GO-API-03 is the checkable SDK instance. | SHOULD (library) |
| GO-API-14 | Return `slices.Clone` or `maps.Clone` of internal slice and map fields, and clone caller-supplied ones before storing them, unless the doc comment says the value is shared and read-only. | Aliasing lets a caller corrupt internal state or race with it. | A behavioural test that mutates the returned value and asserts the source is unchanged. No analyzer exists. | SHOULD |
| GO-API-15 | Do not embed a type in an exported struct unless its promoted method set is documented as your API. Never embed `*exec.ExitError` or any other stdlib error in the SDK's `*ExitError` (GO-ERR-16). | A method added to an embedded interface, or removed from an embedded struct, breaks your API. An embedded `*exec.ExitError` makes `errors.As(sdkErr, &execErr)` true forever. | SDK: a contract test asserts `errors.As(err, new(*exec.ExitError))` is false. Elsewhere a reading check. | SHOULD |
| GO-API-16 | State concurrency safety in the doc comment of every exported type with mutable state. The SDK's `Client` doc says it is safe for concurrent use. | Callers cannot infer it, and silence is not a safe default. | Reading check. | SHOULD |
| GO-API-17 | Never add a top-level `pkg/` to a new repository, and do not churn an existing one. A single-binary module keeps `main` at the root. `cmd/name/` holds binaries only when there are two or more, or when the repository is also a library. | `pkg/` is absent from go.dev's module layout guide, and 10 of 11 public repos using it state no reason. | `test ! -d pkg` at a new repository's root. Exit 1 is the finding. | SHOULD |

## What Agents Get Wrong Here

1. **Assuming "staticcheck is on" means doc comments are checked.** The ST10xx
   family is off by default, and the `comments` preset silences it when enabled.
2. **`map[string]any` or `json.RawMessage` results "to stay forward-compatible".**
   `json.Unmarshal` already skips unknown keys.
3. **`type Option func(*Client)` from the canonical posts, planning to add `error`
   later.** That later change is incompatible.
4. **An interface "for testability" in front of every dependency, returned from
   the constructor.**
5. **A package-level `var defaultX` or `init()` to avoid threading a dependency.**
6. **Trusting `go test -cover`'s printed percentage as the SDK number,** or
   excluding a `TestMain` branch that is never counted anyway.
7. **Sizing a version bump by diff length, and reading `apidiff`'s exit 0 as
   "compatible".**
8. **A `default:` arm treated as exhaustive, or `(nil, nil)` for "not found"**,
   carried over from `None`/`null` habits.
9. **Returning an internal slice from a getter, or embedding `*exec.ExitError` to
   "get the methods".**
10. **Adding `pkg/` or `cmd/only-binary/` as "the standard layout", and
    `// deprecated:` in lower case with no `//go:fix inline`.**
11. **`libpkg.Point{1, 2}` copied from a README.** `go vet`'s `composites` check,
    already a separate gate step (GO-GATE-02), catches it.
12. **`return &ExitError{Code: ee.ExitCode()}` with no `Signaled()` branch.** It
    compiles, vets clean and passes every test that sends no signal.
13. **Classifying the exit before checking the context,** so the SDK's own timeout
    comes back as exit 137.
14. **Copying `WithTimeoutCause(ctx, d, ErrOcxTimeout)` literally.** `errors.Is`
    still passes, so an `errors.Is`-only suite stays green.
15. **A hand-rolled `strconv.Atoi` version split that rejects every `-rc` build,
    or a semver dependency for a three-field compare.**
16. **`//go:build unix` on the spawn-point file "to be safe on Windows".** It
    breaks the Windows build instead.

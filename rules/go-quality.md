---
paths:
  - "**/*.go"
summary: The Go quality index, holding the gate, the non-negotiables, and where the depth lives
keywords: go,golang,quality,errors,concurrency,testing,cli,iterators,generics,slog,net/http
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---

# Go Quality

Traps, not tutorials. Every line names a mistake generated Go makes by default.
The spec and the standard library are already in the model, and a codebase's
architecture is discoverable by reading it, so neither is in this file.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Rules This File Owns](#rules-this-file-owns) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) ·
[Siblings](#siblings)

**Before trusting any rule below, read the module's `go` line (GO-CORE-04) and
confirm the module copied one of the three golangci-lint files whole
(GO-GATE-22).** Rows in every family are gated by the `go` line: a fixer that
declines below its floor, a stdlib symbol that compiles on a newer toolchain,
`usetesting` staying silent below go 1.24. Most other rows depend on a linter
that golangci-lint's five-linter `standard` set leaves off (`noctx`, `containedctx`, `errorlint`,
`nilerr`, `thelper`, `usetesting`), so a module on the default config reads
exactly like a gated one. This rule installs with `paths: ["**/*.go"]` and loads
on every Go source edit and on nothing else.

## The Gate

Run it after every change, from every `go.mod` root, cheapest step first.
`find . -name go.mod -not -path '*/vendor/*'` lists the roots (GO-MOD-06), and
a module no job runs in is never checked.

```sh
golangci-lint fmt --diff                  # 1 format (Go-team shape: test -z "$(gofmt -l .)")
go vet ./...                              # 2 all 35 vet analyzers (go test runs 12)
golangci-lint run ./...                   # 3 the module's GO-GATE-22 file
go fix -diff ./...                        # 4 modernizers + //go:fix inline
go build ./... && go test ./...           # 5
CGO_ENABLED=1 go test -race ./...         # 6 every PR, linux leg
go mod tidy -diff                         # 7 GO-MOD-03
govulncheck ./...                         # 8 text mode, exits 3 on findings (GO-MOD-12)
# 9 only if any //go:generate exists:
go generate ./... && test -z "$(git status --porcelain)"
# 10 only if an iterator producer exists (GO-LANG-08), gopls v0.23.0 on PATH:
test -z "$(grep -rlZ --include='*.go' --exclude-dir=vendor -e 'func(yield func(' . | xargs -0 -r gopls check | grep -e 'yield may be called again')"
```

**Pinned** tool versions, measured 2026-09-26: Go 1.27.1, golangci-lint
v2.14.0, govulncheck v1.8.0 and gopls v0.23.0, each installed at that exact
version, never `latest`, and moved only through the `go-upgrade` skill
(GO-GATE-08). Gate on each step's exit status, never on its stdout:
golangci-lint prints `0 issues.` and exits 7 on a typecheck or wrong-root error.

Chain the ten steps into one named target, `check` (**pinned** name: a Makefile
target, a task-runner entry or a `set -e` script), and have CI and every agent
loop call that target, never a hand-copied subset. On a Go-version matrix, steps
1 to 4 and 7 to 10 run once on the `stable` leg and steps 5 and 6 on every leg
(GO-GATE-01). The SDK and CLIs add Windows and macOS legs (GO-GATE-07). The block,
the three golangci-lint files and every linter setting belong to the `go-modules`
rule, so the depth files below name linters and never paste YAML.

A task is done when a command, its exit code and the tree it ran against are all
named. Narration is not evidence.

## Non-Negotiables

Every line below blocks a merge within the scope it names. IDs resolve through
[Where the Depth Is](#where-the-depth-is), where each rule carries its rationale
and verification. GO-GATE, GO-MOD and GO-REL live in the `go-modules` rule.

| # | Rule | ID |
|---|---|---|
| 1 | Read the `go` line and any `//go:build go1.N` tag before choosing an idiom or trusting an empty `go fix -diff`. Below `go 1.27`, which includes the pinned library and SDK floor, never import `encoding/json/v2` or `jsontext`: it builds green on a 1.27 toolchain, golangci-lint's govet and nogo are blind to it, and only bare `go vet` and the `oldstable` build leg catch it. | GO-CORE-04, GO-LANG-02, GO-LANG-04 |
| 2 | Wrap with `%w`, never format an error with `%v` or `%s`, and match with `errors.Is`, `errors.As` or `errors.AsType`, never `==`, a type switch or a string test on `err.Error()`. | GO-ERR-01, GO-ERR-02, GO-ERR-14 |
| 3 | Never drop the `Close`, `Flush` or `Sync` error of a writable file or buffered writer: a named `(err error)` result joins it with `errors.Join`. Never enable the `std-error-handling` preset or exempt `(*os.File).Close`. | GO-ERR-08, GO-ERR-09 |
| 4 | `os.Exit` and `log.Fatal*` appear only in `func main` and `TestMain`. A CLI's `main` is exactly `code := run(os.Args[1:], os.Stdout, os.Stderr)`, `reraise(code)`, `os.Exit(int(code))`. Library code never exits and never panics on a caller's input. | GO-ERR-13, GO-ERR-15, GO-CLI-02 |
| 5 | `ctx context.Context` is the first parameter of anything that blocks and is passed down, never restarted from `context.Background()` outside `main`. Never store it in a struct field or accept it through a `WithContext` option. Every blocking `net/http` and `net` call uses its context form. | GO-CONC-01, GO-CONC-02, GO-CONC-03 |
| 6 | Every goroutine has an owner that joins it. Every fan-out sized by input, the wire or CLI arguments is bounded (`errgroup.SetLimit`, a semaphore). A package that starts one (`go`, `.Go(`, `.TryGo(`, `iter.Pull`) calls `goleak.VerifyTestMain` in the SDK and libraries. | GO-CONC-10, GO-CONC-11, GO-CONC-13 |
| 7 | An `iter.Seq` producer never calls `yield` again after it may have returned false. Map iteration order never reaches output, a hash or a golden file: range over `slices.Sorted(maps.Keys(m))`. | GO-LANG-08, GO-LANG-09 |
| 8 | New tests use stdlib `testing` plus go-cmp, and testify is never added to a module that does not already import it. `t.Fatal`, `t.FailNow` and `require.*` run only on the test goroutine, never inside a `go` statement or a `wg.Go` or `errgroup.Go` closure, and no tool checks the closure case. | GO-TEST-02, GO-TEST-01 |
| 9 | A cobra CLI sets `SilenceErrors` and `SilenceUsage`, wraps every `RunE` once so an untyped pre-`RunE` error exits 64, and seals every nested command group so a bare or mistyped group exits 64, never 0 with help. stdout carries only the result, through an injected writer. | GO-CLI-06, GO-CLI-21, GO-CLI-03 |
| 10 | Write crash-surviving state only through one atomic-write helper (`os.CreateTemp` in the target's directory, `Sync`, a checked `Close`, `Rename`, directory `Sync` on Unix). Never `os.WriteFile` or `os.Create` on the final path, and never `defer os.Remove(tmp)` in a function that renames. | GO-IO-11, GO-IO-12 |
| 11 | Open every file name the program did not choose (an archive entry, a tag, a digest, a ref) through `os.Root`, never `filepath.Join(dest, name)`, and cap every decompression with a size check and `io.LimitReader`. | GO-IO-02, GO-IO-03 |
| 12 | Start every child with `exec.CommandContext` and a nonzero `Cmd.WaitDelay`, pass argv directly, never through `sh -c`, and never put a secret in argv. | GO-IO-01, GO-IO-07, GO-IO-08, GO-IO-09 |
| 13 | Build each package's `*http.Client` in one constructor over a cloned `http.DefaultTransport`. An API client sets `Timeout > 0`. A blob-streaming client sets `Timeout: 0`, `ResponseHeaderTimeout` and an idle-read watchdog. Bound every body before reading it whole, and never truncate silently. | GO-NET-03, GO-NET-06, GO-NET-07 |
| 14 | Tokens, keys, nonces and resource IDs come from `crypto/rand`, never `math/rand` or `math/rand/v2`. `InsecureSkipVerify` never appears in non-test code. In the SDK and CLIs a credential lives in a redacting `Secret` type, never a raw `string` or `[]byte` field. | GO-SEC-02, GO-SEC-03, GO-SEC-07 |
| 15 | No golangci-lint file lists the `common-false-positives` preset, which deletes every G103 and G204 finding. G304 is excluded by name, and every G103 or G204 suppression carries its reason. | GO-SEC-01 |
| 16 | Library and SDK code never calls `slog.SetDefault` or `log.SetOutput` and never logs through package-level `slog`. It takes an injected `*slog.Logger` that defaults to `slog.New(slog.DiscardHandler)`. | GO-OBS-02, GO-OBS-03 |
| 17 | **pinned** An SDK that wraps a CLI gates typed calls on the binary's version lazily, once per `*Client`, cached only on success. It maps a signal-killed child to `*ExitError{Code: 128+n}` in a classifier file with no `//go:build` tag, and checks `context.Cause` for its own `*TimeoutError` before classifying the exit. | GO-API-18, GO-API-19, GO-API-20 |
| 18 | Never reach green by weakening the check, and never ship a verification nobody has watched go red. | GO-CORE-01, GO-CORE-02 |

## Rules This File Owns

Five cross-cutting rules that belong to no single depth file. Everything else is
defined in a depth file and only cited here. The commands they name are in the
block under the table, run from the repository root.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CORE-01 | Never reach green by weakening the check. A change that touches functional code adds no bare or reasonless `//nolint`, no `//lint:ignore`, no `t.Skip`, no build tag that moves existing code out of the gated build, no `-vet=off`, no lowered coverage threshold, and no exclusion rule, disabled linter or preset in the module's golangci-lint file or `staticcheck.conf`. The only suppressions it may add are the reasoned shapes a depth rule prescribes, such as GO-SEC-01's G103 and G204, GO-SEC-02's G404 jitter and GO-ERR-12's `nilnil`. | The gate's whole value is that it can go red. A change that edits both the code and the check that judges it reports green and looks identical to a passing one. Go spells the move seven ways (a directive, a test skip, a build tag, a vet flag, an exclusion, a disabled linter, a preset), so it rarely shows as one hunk, and agents reach for `//nolint` on a `copylocks` or `lostcancel` finding that needs a signature change. | `weaken-check`: every printed line is read, a suppression that is not a depth rule's reasoned shape is the finding, and empty output is the pass. `gate-files-touched`: any output in a change that is not itself a gate change is the finding. Watched 2026-09-26 (git 2.54, GNU grep 3.12): a planted `//nolint:errcheck`, a `t.Skip` and a golangci exclusion printed both lines and the config file, and the fixed twin printed nothing. | MUST |
| GO-CORE-02 | A verification enters a rule, a CI job or a review only after it has been watched go red on a planted violation and green on a compliant twin, on the Go and tool version it names. A check that cannot be watched is written as a named reading heuristic, never as a command. | A check that cannot fail launders an unchecked change as a checked one. This rule set hit Go instances of each kind: golangci-lint printing `0 issues.` with exit 7 from a wrong module root, a revive `rules:` list that silently replaced the defaults, the `comments` preset hiding every doc-comment finding, and an unanchored preset grep that went red on a compliant config's comment. | Copy the subject, break the thing the rule forbids, and run the verification: a pass on the broken copy is the violation. Then run it on the compliant twin: a red there is a false positive. | MUST |
| GO-CORE-03 | State in every verification whether empty output is the pass or the finding, and name the Go or tool version it was watched on. | Go checks invert both ways. grep exits 1 on the pass, a pipeline exits with its last stage, `gopls check` exits 0 with findings, govulncheck exits 3 on findings in text mode and 0 in json or sarif, and a presence check (GO-GATE-07's Windows leg, GO-NET-18's `User-Agent`, GO-API-03's `Option` type) fails on empty output. The tools move too: `go test` ran 11 vet analyzers before Go 1.27 and runs 12 on 1.27.1. | Read each verification cell: one whose empty output is ambiguous, or that names no version, is the violation. | SHOULD |
| GO-CORE-04 | Before writing or judging version-gated code, read the module's `go` and `toolchain` lines and any `//go:build go1.N` tag on the file, and use only the idioms, stdlib symbols and fixers that version admits. **pinned** floors: libraries and the SDK declare `go 1.26.0`, CLIs `go 1.27.0` plus a `toolchain` line (GO-MOD-01, GO-MOD-02). | Semantics change per `go` line with no compile error: per-iteration loop variables (1.22), `rand.Seed` as a no-op (1.24), container-aware `GOMAXPROCS` (1.25). The compiler enforces language features, never stdlib symbols, so `errors.AsType` or `encoding/json/v2` compile on a newer toolchain in an older module, and a fixer or `usetesting` below its floor reports nothing, which proves nothing. | `go list -m -f '{{.GoVersion}}'`, `grep -n -e '^go ' -e '^toolchain ' go.mod` and `grep -rn --include='*.go' -e '^//go:build.*go1\.' .` print the inputs, which are read, not counted. The finding is a version-gated edit or suggestion made without them. `go vet ./...` (`stdversion`) and the `oldstable` build leg (GO-MOD-16) catch the stdlib half. Measured 2026-09-26 on Go 1.27.1. | MUST |
| GO-CORE-05 | Never hand-edit a generated file, recognised by a `// Code generated ... DO NOT EDIT.` line anywhere above the package clause, not only on line 1. Change the generator or its input and regenerate, and where any `//go:generate` exists, gate step 9 fails on drift (GO-GATE-05). | The next `go generate` silently reverts a hand edit. `go help generate` requires the marker only before the first non-comment text, and a license header above it made a line-1 check undercount 15 times in one large repository. golangci-lint skips generated files (`exclusions.generated: lax`), so no linter judges the edit. | `generated-touch` lists the generated files this change edits. Each needs a regenerated output that step 9 accepts, a hand edit is the finding, and empty output is the pass. Watched 2026-09-26 (git 2.54, GNU grep 3.12): a hand edit to a file whose marker sits on line 6 was printed while a line-1 check missed it, and an edit to the generator input printed nothing. | MUST |

```sh
BASE=origin/main   # the branch this change merges into, rename it
# weaken-check (GO-CORE-01): suppressions this change adds. Every line is read. Empty output is the pass.
git diff -U0 --merge-base "$BASE" -- '*.go' '*.yml' '*.yaml' '*Makefile' | grep -v -e '^+++' \
  | grep -e '^+.*//nolint' -e '^+.*//lint:ignore' -e '^+.*\.Skip(' -e '^+.*\.Skipf(' -e '^+.*\.SkipNow(' -e '^+.*-vet=off' -e '^+//go:build'
# gate-files-touched (GO-CORE-01): any output in a change that is not itself a gate change is the finding.
git diff --name-only --merge-base "$BASE" -- '*golangci*' 'staticcheck.conf' '.github/workflows'
# generated-touch (GO-CORE-05): generated files this change edits. Empty output is the pass.
git diff --name-only --diff-filter=d --merge-base "$BASE" -- '*.go' | xargs -r grep -l -e '^// Code generated .* DO NOT EDIT\.$'
```

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed
under. One level deep: these files do not point at each other.

| Doing… | Read |
|---|---|
| Writing Go against the module's `go` line, choosing an idiom that changed between releases, designing a generic function or an iterator, touching JSON, maps, `time.Time`, runes or randomness, or moving a module to a new Go release | [go-quality/language.md](go-quality/language.md) |
| Returning, wrapping, matching or exposing an error, panicking, exiting, or closing a writable file or buffered writer | [go-quality/errors.md](go-quality/errors.md) |
| Starting a goroutine, fanning out work, passing, storing or cancelling a context, or sharing state across goroutines | [go-quality/concurrency.md](go-quality/concurrency.md) |
| Adding or changing an exported identifier, laying out packages, choosing functional options or a config struct, writing a doc comment or deprecation, tagging a library release, or building an SDK that wraps a CLI binary | [go-quality/api-design.md](go-quality/api-design.md) |
| Writing or reviewing a test, a fuzz target or a CI workflow that runs `go test -fuzz`, a benchmark, a golden file, a helper process that fakes a CLI, or a coverage gate | [go-quality/testing.md](go-quality/testing.md) |
| Writing a `main` package, choosing an exit code, wiring cobra commands or groups, handling a signal or a broken pipe, prompting, or writing to stdout, stderr or a terminal | [go-quality/cli-contract.md](go-quality/cli-contract.md) |
| Writing or replacing a file on disk, opening a path built from external input, extracting or decompressing an archive, or starting, cancelling and reaping a subprocess | [go-quality/io.md](go-quality/io.md) |
| Making an HTTP request, building a client, transport or server, bounding a timeout or a body, retrying, streaming or staging a downloaded blob, parsing a digest, or talking to an OCI registry | [go-quality/network.md](go-quality/network.md) |
| Generating a token or ID, configuring TLS or an `--insecure` or `--ca-file` flag, holding or logging a credential, rendering an HTML template, touching `unsafe`, `//go:linkname` or cgo, or decoding an untrusted body | [go-quality/security.md](go-quality/security.md) |
| Logging or accepting a logger, exposing pprof or a metrics endpoint, setting `GOMAXPROCS`, `GOGC`, `GOMEMLIMIT` or a `GODEBUG` value, diagnosing a hung, racy or leaking process, or making or judging a performance claim | [go-quality/observability.md](go-quality/observability.md) |
| Editing `go.mod`, `go.sum`, `go.work` or a `.go-version` file, a golangci-lint, `revive.toml` or `staticcheck.conf` file, or a Makefile or CI workflow that runs the gate | `go-modules` (sibling rule: GO-MOD, and GO-GATE in its gates depth) |
| Building, signing or publishing a release binary, or editing a goreleaser or `.ko.yaml` file | `go-modules` (GO-REL in its release depth) |
| Writing a `Dockerfile` for a Go binary | its `ENV` lines are GO-OBS-06 and GO-OBS-07 (observability.md) and GO-LANG-16 (language.md), its build is GO-REL in `go-modules` |
| Writing a `go_*` Bazel target, running Gazelle for Go, repinning `go_deps`, wiring `nogo`, or editing `MODULE.bazel` | `bazel-quality` (sibling set: its `go.md`, BZL-GO) |
| Cutting a release, upgrading Go or triaging a dependency, or diagnosing a live process step by step | the `go-release`, `go-upgrade` and `go-diagnose` skills |
| Writing an `Example` function, a README or a CHANGELOG | `docs-instrument` and `docs-quality` (sibling sets) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the
commit body. CONSIDER = Suggest: never blocks, never re-raised after a decline.

Rules marked **pinned** encode an agreed decision rather than a derivable fact:
the `go` and `toolchain` floors, the stdlib-only SDK with go-cmp and goleak as
its only test dependencies, cobra for multi-command CLIs, the sysexits-aligned
exit-code table, 100% coverage for the SDK, Windows as a first-class CI leg,
golangci-lint v2.14.0 with its three files, and the `check` target. "The SDK"
means a stdlib-only library that wraps the project's CLI binary (the reference
wraps `ocx` as package `ocxsdk`), a shape an adopter renames once or drops. Each
is a default an adopter may override, once, in `go.mod` or the copied config,
never per package and never per call site. Overriding one is a decision recorded
with its reason, ignoring one is a violation, and re-arguing one in a pull
request is not a review comment.

Keep the Block list short enough that a blocked change is unusual. A rule set
where everything blocks teaches the reader to negotiate with all of it.

## Siblings

- **`go-modules`**: what a module declares and what fails its build. It owns
  GO-MOD (the `go` and `toolchain` lines, dependencies, the depguard
  `superseded` list, govulncheck), GO-GATE (the gate block and the three
  golangci-lint files) and GO-REL (release builds, goreleaser, signing). It
  loads on `go.mod`, `go.sum`, `go.work`, `go.work.sum`, golangci-lint,
  goreleaser, `.ko.yaml` and `staticcheck.conf` files, globs this rule does not
  cover, so a source edit never pays for them and a config edit always does.
- **`bazel-quality`**: its `go.md` depth file (BZL-GO) covers `rules_go`,
  Gazelle, `go_deps` and `nogo`, if you adopt Bazel for Go. It has no glob of
  its own, and `nogo` is not a substitute for GO-LANG-04's checks.
- **`go-release`, `go-upgrade` and `go-diagnose`**: procedures that cite these
  IDs by number and never restate them. The `go-essentials` bundle ships all
  five artifacts together.
- **`code-docs`**: comments, doc comments, decision-record pointers and test
  names as documentation, in every language: what a comment keeps, where each
  clause goes and how long a block runs. Loads on every source file.

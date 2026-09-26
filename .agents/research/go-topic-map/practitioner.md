---
title: Go practitioner-writing topic map — argued positions, 2024-2026
corpus: practitioner writing (blogs, newsletters, talks, community style guides)
agent: go-topic-map/practitioner scout
model: claude-sonnet-5
date_researched: 2026-09-26
sources_count: 25
scope: >
  Covers argued positions from named Go practitioners and outlets (Cox, Cheney,
  Ryer, Harsanyi, Kennedy/Ardan, Bendersky, Edwards, Zhiyanov, Amsterdam,
  Valsorda, Stapelberg, Wagner/Merovius, Arundel/Bitfield, Delowar/rednafi,
  golangci-lint's own docs, Google's and Uber's style guides) on language
  idiom, API design, error handling, concurrency, testing, project layout,
  toolchain/module mechanics, and release hygiene, grounded against the Go
  1.25-1.27 era. Does NOT cover: Bazel-for-Go mechanics (rules_go/gazelle —
  a separate scout's brief), generic CI/docs practice (owned by docs-quality
  and bazel-quality/ci.md), or exemplar-corpus code measurement (a grounding
  wave's job, not this scout's).
---

# Go practitioner-writing topic map

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- The Go team formally **stopped pursuing error-handling syntax changes** in
  June 2025 after three failed proposals (`check`/`handle`, `try()`, a `?`
  operator) — a rule set must stop suggesting language-level boilerplate
  fixes and instead lean on library/tooling remedies (`cmp.Or`, better
  wrapping conventions).
- **Goroutine-leak detection graduated from experimental to general
  availability in Go 1.27** (`runtime/pprof` profile `goroutineleak`,
  `/debug/pprof/goroutineleak`) — concurrency-lifetime discipline (H3) is no
  longer just a style opinion; there is now a runtime tool that measures it,
  with a documented blind spot (leaks reachable only through a global
  variable).
- Container-aware `GOMAXPROCS` (cgroup-quota-based, Go 1.25, `GODEBUG`
  overrides `containermaxprocs=0`/`updatemaxprocs=0`) changes default
  scheduler behavior for every containerized Go service without a code
  change — directly relevant to future fleet Go services running in CI/OCI.
- `sync.WaitGroup.Go()` (Go 1.25) collapses the `Add(1)`/`go`/`Done()` triad
  into one call — any rule teaching the old triad as canonical is now
  teaching the harder-to-get-wrong pattern's predecessor, not the idiom.
- `encoding/json/v2` now backs the original `encoding/json` (Go 1.27) with
  stricter defaults (rejects invalid UTF-8, rejects duplicate object member
  names) — a behavior change fleet code inherits silently on toolchain
  upgrade, not just an opt-in new package.
- `os.Root` gained a full filesystem-operation surface through Go
  1.24-1.25 (`Chmod`, `Chown`, `Rename`, `Symlink`, `MkdirAll`, `WriteFile`,
  etc.) — this is the idiomatic, symlink-escape-safe way to do scoped
  filesystem work, directly applicable to an OCX-style content-addressed
  store, and most exemplar code predates it.
- `golangci-lint` v2's actual default-enabled linter set is narrow:
  `errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused` — everything
  else (revive, gosec, exhaustive, wrapcheck…) is an explicit opt-in a rule
  must name, not something "golangci-lint" implies on its own.
- The community's own reference repo for project layout,
  `golang-standards/project-layout`, is **not official** — Russ Cox has said
  so directly (per [issue #117](https://github.com/golang-standards/project-layout/issues/117)) —
  and the converging practitioner advice (Cheney, Edwards, Demailly) is
  "start flat, one package at module root, add `internal/` only when you
  actually have code you must not let external importers use."
- `testify` is under sustained, specific attack in 2024-2026 practitioner
  writing (inconsistent nil-vs-empty-slice semantics, 30+ overlapping
  assertion functions, inconsistent parameter order) with `cmp.Diff` from
  `google/go-cmp` as the converging stdlib-adjacent replacement — this
  matches the frame's H5 but the corpus shows the debate is not settled
  inside teams that already standardized on testify.
- Functional options (Dave Cheney's own pattern) has a documented,
  measured performance critique (interface-slice allocation) and at least
  one practitioner (rednafi) argues a builder/chaining alternative is both
  faster and simpler for the common case — this is a real, cited
  disagreement, not manufactured controversy.
- `go fix`'s 1.26 rewrite added a **modernizer framework** built on the
  `go vet` analysis framework (fixers: `atomictypes`, `embedlit`,
  `slicesbackward`, `unsafefuncs`, `waitgroupgo` as of 1.26/1.27) — this is
  the concrete mechanism behind the frame's "toolchain upgrade and
  modernization" skill candidate, not a vague aspiration.
- Go's `toolchain` directive and `go.mod`'s `go` line are the actual lever
  behind `GODEBUG` compatibility: a program's `GODEBUG` defaults track the
  Go version *declared in go.mod*, not the installed toolchain — a stale
  `go.mod` `go` line silently freezes old, sometimes-insecure defaults even
  after `go install`-ing a newer toolchain.
- FIPS 140-3 mode (`GOFIPS140=v1.0.0` or `inprocess`, `GODEBUG fips140=on`,
  shipped in the crypto module since Go 1.24) changes observable TLS and
  crypto behavior (only-approved algorithms, mandatory self-tests) — a
  security rule must name this as a build-time mode, not just a library.
- `context.Value` remains explicitly contested even among its defenders:
  Axel Wagner (Merovius) — "too useful to ignore" — proposes a
  generics-based type-safe wrapper but is himself "on the fence," worried
  about "infectious" generic machinery spreading through a codebase.
- Mat Ryer's `run(ctx, args, getenv, stdin, stdout, stderr) int` pattern
  (dependencies as explicit arguments to a testable `run` function, `main`
  reduced to calling it and returning its exit code) is the converging
  shape for CLI/HTTP-service entry points and maps almost directly onto the
  fleet's existing Rust CLI-contract convention (`run` returning a typed
  exit code, `main` translating it).
- Self-referential generic type constraints (Go 1.26:
  `type Adder[A Adder[A]] interface { Add(A) A }`) and generic methods
  (Go 1.27: a method may declare its own type parameters, but an interface
  method still cannot) are new enough that no practitioner corpus yet
  argues a settled idiom for them — this is a genuine open question for
  the rule set to flag rather than assert.
- `Table-driven tests` remain universally endorsed, but the classic
  `tc := tc` loop-variable-shadow guard is dead weight since Go 1.22 made
  loop variables per-iteration — a rule that still teaches the shadow copy
  is teaching removed cruft, and `go fix`'s modernizers are now positioned
  to catch it mechanically.
- Debugging a hung/deadlocked Go process has a documented, reproducible
  toolchain (SIGQUIT/`GOTRACEBACK`, Delve `attach`, `GOTRACEBACK=crash` +
  `coredumpctl`) with a named current gotcha (broken core-dump support on
  Linux kernels 6.12/6.13) — this belongs in an operational-diagnosis skill,
  not just a lint rule.

## Survey

### 1. Go team: the 2025 decision to stop pursuing error-handling syntax
[go.dev/blog/error-syntax](https://go.dev/blog/error-syntax)

The Go team's own retrospective on three attempts: the 2018 `check`/`handle`
keyword design (Russ Cox), the 2019 `try()` builtin (nearly 900 comments on
[golang/go#32437](https://github.com/golang/go/issues/32437), abandoned over
hidden control flow), and a 2024 postfix `?`-operator proposal
([golang/go#71203](https://github.com/golang/go/issues/71203)) that user-tested
well but was redirected to a discussion
([golang/go#71460](https://github.com/golang/go/discussions/71460)) rather than
advanced. The stated reason to stop: "we can only admit that we neither have a
shared understanding of the problem, nor do we all agree that there is a
problem in the first place." Declared alternative focus: standard-library
utilities (`cmp.Or`), tooling/IDE support, not syntax. This is a hard boundary
for any Go rule set: never recommend or imply a forthcoming `try`/`?` construct,
and treat "error handling boilerplate" as a library/pattern problem only.

### 2. Russ Cox: toolchain management and GODEBUG compatibility
[go.dev/blog/toolchain](https://go.dev/blog/toolchain) (Aug 2023) and
[go.dev/doc/godebug](https://go.dev/doc/godebug)

The `go` line in `go.mod` is now an enforced minimum toolchain version
(previously advisory only), and `GOTOOLCHAIN` lets different modules build
with different Go toolchains. The load-bearing mechanism: a program's
`GODEBUG`-controlled behaviors default to what the `go` line in the *main
package's* `go.mod` declares, not what toolchain happens to be installed —
so upgrading the installed `go` binary does not silently flip a
compatibility-sensitive default; only bumping the `go.mod` line does. This is
the mechanism behind "extended backward/forward compatibility," and it means
a Go modules rule must explain the `go` line as a compatibility dial, not
just a minimum-version gate.

### 3. Russ Cox: The Design of Transparent Telemetry
[research.swtch.com/telemetry-design](https://research.swtch.com/telemetry-design)
(Part 2 of a 4-part 2023 series; Part 1: [telemetry-intro](https://research.swtch.com/telemetry-intro), Part 3: [telemetry-uses](https://research.swtch.com/telemetry-uses), Part 4: [telemetry-opt-in](https://research.swtch.com/telemetry-opt-in))

Design rationale for `cmd/go`, `gopls`, and `govulncheck` reporting
kilobytes-per-year of counter data, fully public, opt-in (the design changed
from an initial opt-out proposal after community pushback — a case study in
how a Go-team proposal actually moved under public pressure). Relevant to a
toolchain-behavior rule mainly as background for why `GOTELEMETRY` exists and
why an agent should never disable it silently to "clean up" a CI environment
without the human being told.

### 4. Dave Cheney: Practical Go
[dave.cheney.net/practical-go](https://dave.cheney.net/practical-go)

A standing, load-bearing reference the corpus repeatedly cites. Concrete,
quotable positions: avoid package names like `base`, `util`, `common`; "use
internal packages to reduce your public API surface"; "don't force
allocations on the callers of your API"; "don't just check errors, handle
them gracefully"; prefer sentinel/constant errors and avoid making error
*types* part of a public API (a stronger, more specific claim than "use
`errors.Is`/`As`" — it is an argument against type-based error APIs at
package boundaries specifically); "never start a goroutine without knowing
how it will stop"; "prefer table driven tests." Also the source of the
functional-options pattern's canonical Go-idiom framing that later posts
(rednafi, evanjones.ca) push back against.

### 5. Mat Ryer: How I write HTTP services in Go after 13 years
[grafana.com/blog/how-i-write-http-services-in-go-after-13-years](https://grafana.com/blog/how-i-write-http-services-in-go-after-13-years/)
(Feb 2024, Grafana Labs; a refresh of a 2018 post)

Concrete, named pattern: a `NewServer(...)` constructor that takes every
dependency as an explicit argument and returns `http.Handler` ("If a handler
function wants a dependency, it can bloody well ask for it as an argument");
handlers as maker-functions (`func handleSomething(logger *Logger)
http.Handler`) rather than methods on a server struct; a centralizing
`routes.go`; a testable `run(ctx, args, getenv, stdin, stdout, stderr) int`
function that `main` merely calls, enabling black-box, end-to-end tests
against the whole wired system (including middleware) instead of per-handler
unit tests; `/healthz` polled by tests before issuing requests; `sync.Once`
for deferred expensive init (template parsing); a `Validator` interface
(`Valid(ctx) map[string]string`) for request validation; generic `encode`/
`decode` helpers centralized in one file. This is the single most directly
transferable pattern to the fleet's future Go CLIs/SDKs — it is close to
identical in shape to the Rust `cli-contract` convention already in
`rules/rust-quality/cli-contract.md`.

### 6. Teiva Harsanyi: 100 Go Mistakes and How to Avoid Them / 100go.co
[100go.co](https://100go.co/)

11 categories, 100 numbered mistakes: Code and Project Organization (16),
Data Types (13), Control Structures (6), Strings (6), Functions and Methods
(6), Error Management (7), Concurrency Foundations (6), Concurrency Practice
(8), Standard Library (7), Testing (10), Optimizations (10). Named framing:
"concurrency is about structure," "parallelism is about execution" (a
Rob-Pike-derived distinction the book operationalizes into mistakes);
"an error should be handled only once." The taxonomy itself is a useful
checklist shape for a rule set's own table of contents, independent of
whether every individual mistake is still live in the 1.27 era (some,
e.g. `context.Value` overuse and `interface{}` vs `any`, predate generics
and iterators and need re-verification against the exemplar corpus).

### 7. Anton Zhiyanov: interactive Go release-note tours
[antonz.org/go-1-25](https://antonz.org/go-1-25/) (one tour per release, 1.22
through 1.26; Zhiyanov has since stopped, and VictoriaMetrics picked up the
1.27 tour)

Fetched for 1.25 directly: `testing/synctest.Test()` (replacing the
deprecated `synctest.Run`) for fake-time, deterministic concurrency tests;
`encoding/json/v2` experimental API surface (`MarshalToFunc`,
`UnmarshalFromFunc`, `JoinMarshalers`, `WithMarshalers`, `SkipFunc`);
`runtime.SetDefaultGOMAXPROCS()`; `net/http.CrossOriginProtection` (built-in
CSRF defense via origin checking); `sync.WaitGroup.Go()`;
`runtime/trace.FlightRecorder` (sliding-window post-hoc trace capture);
the full `os.Root` filesystem-operation expansion (`Chmod`, `Chown`,
`Chtimes`, `Link`, `MkdirAll`, `RemoveAll`, `Rename`, `Symlink`, `Readlink`,
`WriteFile`/`ReadFile`) plus `fs.ReadLinkFS`; `reflect.TypeAssert[T]()`;
container-aware default `GOMAXPROCS` with `GODEBUG=containermaxprocs=0` /
`updatemaxprocs=0` escape hatches; `slog.GroupAttrs()`. This tour format —
runnable example per change — is itself a pattern worth naming: it is a
higher-signal way to teach a release than the prose release notes, and a
rule-authoring skill could adopt the same per-change-runnable-example shape.

### 8. Google Go Style Guide — Best Practices
[google.github.io/styleguide/go/best-practices](https://google.github.io/styleguide/go/best-practices)
(explicitly "neither normative nor canonical," a living best-practices
companion to the normative [Style Guide](https://google.github.io/styleguide/go/guide) and [Style Decisions](https://google.github.io/styleguide/go/decisions))

Specific, quotable positions that diverge from casual practitioner advice:
"the ideal place to fail a test is within the Test function itself" —
i.e. an explicit argument *against* extracting assertion helpers that take
`testing.T`, which is a stronger and more specific claim than "avoid
testify" (Google is also skeptical of home-grown assertion helpers, not just
third-party ones); test helpers should call `t.Fatal` on setup failure but
`t.Error` (never `t.Fatal`/`FailNow`) from a separate goroutine; `%w` belongs
at the end of an error string to mirror chronological chain order; avoid
"redundant information that the underlying error already provides" when
wrapping; naming guidance to skip `Get` prefixes (`JobName()` not
`GetJobName()`) and avoid repeating the package name in exported identifiers;
package names should never be `util`/`helper`/`common`; concurrency-safety
of an API must be documented explicitly whenever it is not obviously safe
(read-only assumed safe, mutation requires a note) — a materially different
bar than "the caller should assume nothing," it is "the author must say."

### 9. Uber Go Style Guide
[github.com/uber-go/guide, style.md](https://raw.githubusercontent.com/uber-go/guide/master/style.md)
(fetched via raw GitHub; a corporate, load-bearing, widely-imitated guide)

Distinct, specific rules beyond Google's: "Zero-value Mutexes are Valid" (no
explicit init needed, a common source of over-engineered constructors);
"Copy Slices and Maps at Boundaries" (an aliasing/mutation-leak rule for
public APIs); "Channel Size is One or None" (a specific numeric constraint —
buffered channels beyond size 1 are flagged as a design smell needing
justification); "Start Enums at One" (zero-value collision avoidance);
"Handle Errors Once"; "Avoid Embedding Types in Public Structs" (method-set
leakage); a documented preference for `go.uber.org/atomic` over raw
`sync/atomic` for type safety (an Uber-specific, not universal, position —
worth flagging as contested against stdlib-only preferences elsewhere in the
corpus). The guide format itself (a single flat `style.md`, TOC-linked
sections, before/after code blocks) is a useful structural precedent for this
program's own `go-quality` rule file.

### 10. golangci-lint v2 — its own changelog and default linter set
[golangci-lint.run/docs/linters](https://golangci-lint.run/docs/linters/) and
[github.com/golangci/golangci-lint CHANGELOG.md](https://raw.githubusercontent.com/golangci/golangci-lint/master/CHANGELOG.md)

Confirms the frame's version hypothesis: **v2.14.0** (released 2026-09-23,
three days before this research date) with a "cache of facts reloading" bug
fix and bundled-linter version bumps — `gosec` 2.28.0→2.29.0 (re-enabling
check `G407`), `revive` 1.15.0→1.17.0 (new rules `marshal-receiver`,
`multiline-if-init`, `use-slices-concat`), `gofumpt` v0.11.1→0.12.0,
`govet-modernize` 0.49.0→0.50.0. Load-bearing fact for the rule set: the
**default-enabled** linter set in v2 is narrow — `errcheck`, `govet`,
`ineffassign`, `staticcheck`, `unused` — everything else is opt-in via
`.golangci.yml`'s `linters.enable` list, and `govulncheck` is not integrated
as a golangci-lint linter at all (it stays a separate command/CI step per
[golangci-lint#4623](https://github.com/golangci/golangci-lint/issues/4623)).
A rule that says "run golangci-lint" without naming which linters must be
enabled is underspecified.

### 11. Redowan Delowar (rednafi): Dysfunctional options pattern in Go
[rednafi.com/go/dysfunctional-options-pattern](https://rednafi.com/go/dysfunctional-options-pattern/)
(March 2024; the article's own subtitle claims a builder-chaining
alternative is "76x faster")

Explicitly frames itself as a response to Rob Pike's original functional-
options write-up: "the necessity of such a pattern is quite evident in a
language that lacks default arguments... more often than not, it needlessly
complicates things," worse for a public API with many independently-toggled
options. Proposes method-chaining/builder-style configuration as measurably
cheaper (fewer allocations from avoiding a `[]Option` closure slice) and
argues it is also easier to read. Explicitly concedes functional options
"solves a valid problem and definitely has its place" — this is a real,
qualified disagreement with the canonical Cheney pattern, not a rejection of
it outright; a rule needs a decision procedure (open-ended public API →
functional options; small closed set of internal config → builder or plain
struct), matching the general community split found across multiple 2024-2025
posts (dev.to, smarty.com, sagikazarmark.hu) on the same question.

### 12. Redowan Delowar (rednafi): context cancellation cause
[rednafi.com/go/context-cancellation-cause](https://rednafi.com/go/context-cancellation-cause/)

Names the exact problem: generic `"context canceled"` / `"context deadline
exceeded"` errors force log-scanning to find the real cause. Names the exact
fix APIs: `context.WithCancelCause`, `context.WithTimeoutCause`/
`WithDeadlineCause`, `context.Cause(ctx)` (added Go 1.20-1.21, still
under-adopted per the corpus). Concrete rule: "the first call to `cancel`
wins... once a cause is recorded, subsequent calls are no-ops"; recommends
`defer cancel(nil)` as the safety-net pattern; recommends stacking
`WithCancelCause` over `WithTimeoutCause` when downstream code still needs to
detect `context.DeadlineExceeded` via `errors.Is` while also carrying a
custom cause.

### 13. Axel Wagner (Merovius): Scrapping contracts / Parametric context
[blog.merovius.de/posts/2018-09-05-scrapping_contracts](https://blog.merovius.de/posts/2018-09-05-scrapping_contracts/)
(2018, historical but load-bearing for *why* today's generics use interface
constraints, not a bespoke contracts syntax) and
[blog.merovius.de/posts/2020-07-20-parametric-context](https://blog.merovius.de/posts/2020-07-20-parametric-context/) (2020)

Scrapping contracts: argues the abandoned "contracts" generics design
optimized for familiar grammar over legible vocabulary, and that
interface-based constraints (what Go 1.18 ultimately shipped) are simpler to
specify, implement, and error-message on. Parametric context: acknowledges
`context.Value` is "controversial because of a lack of type safety" and
"often criticized for not being explicit enough about the dependencies a
function has," but argues it is "too useful to ignore"; proposes a
generics-based type-safe context wrapper (embed a type parameter, declare
per-dependency context interfaces like `FooContext` requiring both logging
and tracing) that composes without libraries knowing about each other — then
explicitly hedges: "on the fence... worrying that the machinery becomes
infectious." This is a genuinely unresolved tension the rule set should
represent as a judgment call, not a settled MUST/MUST NOT.

### 14. Laurent Demailly: No-nonsense guide to Go package layout
[laurentsv.com/blog/2024/10/19/no-nonsense-go-package-layout.html](https://laurentsv.com/blog/2024/10/19/no-nonsense-go-package-layout.html)

Direct, specific position: `cmd/` is unneeded for a single binary; "99% of
people do not need `internal/`"; `pkg/` is "a very outdated convention from
before `internal/`" with no advantage over root-level packages; `util`/
`common`/`shared` packages "simply don't [belong]" as separate directories.
Recommends the module root hold the main package directly (clean
`go install github.com/you/project@latest`), with new packages created only
when a genuinely separable concern exists, and pointed at
`golang-standards/project-layout` as the anti-pattern to avoid copying.

### 15. Alex Edwards: Eleven Tips for Structuring Your Go Projects
[alexedwards.net/blog/11-tips-for-structuring-your-go-projects](https://www.alexedwards.net/blog/11-tips-for-structuring-your-go-projects)

Softer, more incremental framing than Demailly's: "there's no single
'right' way"; "don't use directories just to organize files" (a directory
implies a new package, not just a folder); "if you're unsure, begin with two
files" (`go.mod` + `main.go`); "big files aren't necessarily bad"; explicit
warning signs of a structure problem — import cycles, navigation difficulty,
too many cross-package ripple effects from a single change. Also (from a
separate, directly relevant Feb 2025 post,
[how-to-manage-tool-dependencies-in-go-1.24-plus](https://www.alexedwards.net/blog/how-to-manage-tool-dependencies-in-go-1.24-plus)):
Go 1.24's `tool` directive in `go.mod` as the now-idiomatic way to pin
developer tool versions (`staticcheck`, `govulncheck`, `air`) without a
separate `tools.go` `_ "import"` hack.

### 16. Boldly Go: Testify is making your Go tests worse
[boldlygo.tech/posts/2026-04-20-testify-is-making-your-go-tests-worse](https://boldlygo.tech/posts/2026-04-20-testify-is-making-your-go-tests-worse/)
(April 2026 — inside this program's stated era)

Concrete, checkable complaints, not vibes: `assert.Equal(nilSlice,
emptySlice)` fails while stdlib `slices.Equal()` treats them as equal —
"I have to learn a second set of rules just for my tests"; 30+ overlapping
equality assertions (`Equal`, `EqualValues`, `Exactly`, `Same`...) with
inconsistent argument order (`EqualError(actual, expected)` vs.
`Equal(expected, actual)`); frames the anti-idiom claim precisely —
"assertion libraries are to Go's testing philosophy what exceptions are to
Go's error handling." Recommends `cmp.Diff` from `google/go-cmp` (present in
the exemplar corpus as `google/go-cmp@b133f1f1932e`) as the replacement, with
an explicit, honest exception: keep using testify when a team has already
standardized on it, for consistency's sake over individual test purity.

### 17. Michael Stapelberg: Tips to debug hanging Go programs
[michael.stapelberg.ch/posts/2025-02-27-debug-hanging-go-programs](https://michael.stapelberg.ch/posts/2025-02-27-debug-hanging-go-programs/)

A concrete operational runbook, not a style opinion: Ctrl+`\` sends SIGQUIT,
triggering the Go runtime's default all-goroutine stack-trace dump, tunable
via `GOTRACEBACK`; `panicparse` reformats the dump readably; Delve attach
workflow (`go install github.com/go-delve/delve/cmd/dlv@latest`, rebuild with
`-gcflags=all="-N -l"` to disable optimizations, `dlv attach $(pidof ...)`,
then `gr`/`bt`); `GOTRACEBACK=crash` plus `coredumpctl` for post-mortem core
dumps, with a specific, dated caveat that core-dump support is currently
broken on Linux kernels 6.12/6.13. This is exactly the shape of content the
frame's "diagnosing leaks/races/perf" skill candidate needs: a sequence of
commands, not a principle.

### 18. Bitfield Consulting (John Arundel): The Tao of Go
[bitfieldconsulting.com/posts/tao-of-go](https://bitfieldconsulting.com/posts/tao-of-go)

Restates and sharpens several proverbs into checkable rules: "accept
interface values" but "return concrete values (structs)"; "don't make users
implement our interfaces; we aim to implement theirs" (a consumer-side
framing distinct from, and slightly sharper than, the generic "accept
interfaces" proverb); "the smallest API is the best"; explicit anti-panic
stance — "avoid terminating users' programs unexpectedly by panicking or
calling `os.Exit`," return an error with contextual information instead, and
let the *caller* decide the exit behavior (directly relevant to a CLI-
contract rule: library code must never call `os.Exit`, only `main`/`run`
may). Testing guidance: write tests that "elicit unexpected behaviour," and
keep runnable examples (`Example` functions) verified as documentation.

### 19. Eli Bendersky / Bill Kennedy (Ardan Labs): range-over-func mechanics
[eli.thegreenplace.net/2024/ranging-over-functions-in-go-123](https://eli.thegreenplace.net/2024/ranging-over-functions-in-go-123/)
and [ardanlabs.com/blog/2024/04/range-over-functions-in-go](https://www.ardanlabs.com/blog/2024/04/range-over-functions-in-go.html)

Bendersky gives the precise compiler-transformation mental model: an
eligible iterator function has signature `func(yield func() bool)`,
`func(yield func(V) bool)`, or `func(yield func(K, V) bool)`; the compiler
"synthesizes" a yield function invoking the loop body; returning `false`
from yield (triggered by `break`) must be checked and obeyed by the
iterator's own code, or iteration never stops correctly; infinite iterators
are legal and common (a Fibonacci generator example); the compiler's
handling of `goto`, `panic`, and `defer` inside a ranged-over function body
is "rather involved" even though the surface API is simple — a caveat worth
keeping when a rule explains *why* range-over-func sometimes behaves
surprisingly under panic/recover. Ardan Labs' companion post is purely
educational (no prescriptive "when to use this" guidance), which is itself a
useful negative data point: even a name-brand source doesn't always argue a
position — some corpus entries are reference material, not advocacy, and a
topic map should not force a position where the source states none.

## Candidate topics

| Topic (question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|
| When must a goroutine a library launches be owned by an `errgroup`/`WaitGroup` the caller can wait on, and how does a reviewer spot one that isn't? | Direct line to a now-GA runtime detector (Go 1.27 goroutine-leak profile); H3's core claim | [go1.27 notes](https://go.dev/doc/go1.27); [goroutine-ownership posts](https://dev.to/neeraj_singhi_golang/goroutine-ownership-and-cancellation-contracts-preventing-leaks-in-long-running-go-services-31ld) | no | concurrency | P0 — measurable via a shipped runtime profile, not opinion |
| What exactly does the Go 1.27 `goroutineleak` pprof profile detect, and what leak class does it miss (blocked via a reachable global)? | Turns "avoid leaks" into a runnable verification command | [go1.26](https://go.dev/doc/go1.26), [go1.27](https://go.dev/doc/go1.27) release notes | no | concurrency/perf | P0 — a rule can cite a literal `go tool pprof` invocation |
| Should new cancellation code use `context.WithCancelCause`/`context.Cause` instead of bare `context.WithCancel`? | Converts undiagnosable "context canceled" into an inspectable cause | [rednafi](https://rednafi.com/go/context-cancellation-cause/) | no | concurrency/errors | P1 |
| Is `context.Value` acceptable as shipped, or does it need a type-safe generic wrapper — and where's the line? | Even its own defenders are unresolved; a rule needs a judgment call, not a ban | [Merovius](https://blog.merovius.de/posts/2020-07-20-parametric-context/) | no | concurrency | P2 — contested, low verification-command potential |
| Is `testify` banned, discouraged, or "existing-team-convention only," and what stdlib+`go-cmp` pattern replaces `assert.Equal`? | H5's core claim; corpus shows real, dated (2026) practitioner attack plus a converging alternative | [Boldly Go](https://boldlygo.tech/posts/2026-04-20-testify-is-making-your-go-tests-worse/); [Google style guide](https://google.github.io/styleguide/go/best-practices) | no | testing | P0 |
| Should assertion helpers ever take `testing.T`, or must the `Test` function itself call `t.Errorf`/`t.Fatalf`? | Google's specific, stronger claim than "avoid testify" — targets home-grown helpers too | [Google style guide](https://google.github.io/styleguide/go/best-practices) | no | testing | P1 |
| Can a test helper call `t.Fatal` from a spawned goroutine, and what breaks if it does? | Concrete, checkable footgun (`t.FailNow` from a non-test goroutine corrupts test state) | [Google style guide](https://google.github.io/styleguide/go/best-practices) | no | testing/concurrency | P1 |
| Is `testing/synctest.Run` still valid, or must new code use `synctest.Test` (deprecation in 1.25)? | Direct API deprecation inside the program's own era window | [go1.25 notes](https://antonz.org/go-1-25/) | no | testing | P1 — version-specific, Go 1.25+ |
| What is the exact decision rule between `%w` (chain-preserving) and `%v` (plain annotation) when wrapping an error, and where in the message string does `%w` belong? | A specific, checkable convention beyond "wrap your errors" | [Google style guide](https://google.github.io/styleguide/go/best-practices) | no | errors | P0 |
| Should an error *type* (not just a sentinel value) ever be part of a package's public API? | Cheney's specific, stronger-than-usual claim; disagreeing sources exist (typed errors carrying context) | [dave.cheney.net](https://dave.cheney.net/practical-go) | no | errors | P1 |
| Given the Go team's 2025 decision to stop pursuing error-syntax proposals, what boilerplate-reduction is still sanctioned (`cmp.Or`) vs. what a rule must never suggest (a home-grown panic-based `must()` used as flow control)? | Prevents the rule set from recommending a dead-end pattern the Go team explicitly rejected | [go.dev/blog/error-syntax](https://go.dev/blog/error-syntax) | no | errors/lang | P0 |
| Functional options vs. a plain config struct vs. a builder — what's the decision rule, and is there a real measured perf cost to functional options? | A real, cited (not manufactured) disagreement with Cheney's own canonical pattern | [rednafi](https://rednafi.com/go/dysfunctional-options-pattern/); [evanjones.ca](https://www.evanjones.ca/go-functional-options-slow.html) | no | API design | P1 |
| Is `pkg/` a real Go convention a reviewer should ever request, and what's the correct response to a PR that adds one out of habit? | `golang-standards/project-layout` is explicitly non-official per its own issue tracker | [project-layout#117](https://github.com/golang-standards/project-layout/issues/117); [Demailly](https://laurentsv.com/blog/2024/10/19/no-nonsense-go-package-layout.html) | no | project layout | P0 — high false-positive-review risk if wrong |
| When does `internal/` earn its place vs. add needless indirection in a small, single-consumer module? | "99% of people do not need internal/" is a specific, falsifiable-against-the-exemplar-corpus claim | [Demailly](https://laurentsv.com/blog/2024/10/19/no-nonsense-go-package-layout.html) | no | project layout | P1 |
| What are the documented exception cases where "accept interfaces, return structs" is the wrong call? | Prevents the rule from encoding a proverb as an absolute | [Tao of Go](https://bitfieldconsulting.com/posts/tao-of-go) | partial (rust-quality API idiom files argue similar consumer-side-interface principle generically) | API design | P1 |
| Should a consuming package define its own narrow interface rather than import the producer's broader one — and what's the litmus test against over-abstraction? | Distinguishes correct decoupling from a speculative interface with one implementation | [Tao of Go](https://bitfieldconsulting.com/posts/tao-of-go) | partial | API design | P1 |
| Why did Go abandon the "contracts" generics design for interface-based constraints, and does that history explain today's restraint around generic-heavy APIs? | Explains *why* the current idiom is conservative, not just that it is | [Merovius, 2018](https://blog.merovius.de/posts/2018-09-05-scrapping_contracts/) | no | generics | P2 — historical, load-bearing but not itself a verification command |
| When is a self-referential generic constraint (Go 1.26: `type Adder[A Adder[A]] interface`) idiomatic vs. a sign of over-genericized code? | New enough (1.26) that no corpus source yet argues a settled position — must be flagged open, not asserted | [go1.26 notes](https://go.dev/doc/go1.26) | no | generics/lang | P2 — version-specific, Go 1.26+ |
| What does a generic method (Go 1.27: a method may declare its own type parameters) let an SDK do that free generic functions couldn't, and where does the "interface methods can't have type params" restriction bite? | Directly relevant to a future OCX Go SDK's API shape | [go1.27 notes](https://go.dev/doc/go1.27) | no | generics/lang | P1 — version-specific, Go 1.27+ |
| What changed in container-aware default `GOMAXPROCS` (Go 1.25), and what must a containerized Go service/CI job know or override (`containermaxprocs=0`, `updatemaxprocs=0`)? | Changes default scheduler behavior with zero code change; directly relevant to future fleet Go services in OCI images | [go1.25 notes](https://antonz.org/go-1-25/) | no | toolchain/perf | P0 — version-specific, Go 1.25+ |
| When must `sync.WaitGroup.Go()` (1.25) replace the `Add(1)`/`go`/`Done()` triad, and does it change panic/recover semantics for the launched goroutine? | Collapses a well-known footgun triad into one call; teaching the old triad as canonical is now teaching the harder path | [go1.25 notes](https://antonz.org/go-1-25/) | no | concurrency | P1 — version-specific, Go 1.25+ |
| Does `encoding/json/v2` backing `encoding/json` (Go 1.27) change observable `Marshal`/`Unmarshal` behavior fleet code must account for (duplicate-name rejection, invalid-UTF-8 rejection)? | A silent behavior change inherited on toolchain upgrade, not an opt-in new package | [go1.27 notes](https://go.dev/doc/go1.27) | no | stdlib/compat | P0 — version-specific, Go 1.27+; breaking-on-upgrade risk |
| What exactly does `go fix`'s 1.26 modernizer framework do, and which specific modernizers exist (`atomictypes`, `embedlit`, `slicesbackward`, `unsafefuncs`, `waitgroupgo`)? | The concrete mechanism behind a "toolchain upgrade and modernization" skill | [go1.26 notes](https://go.dev/doc/go1.26); [go1.27 notes](https://go.dev/doc/go1.27) | no | toolchain | P0 — a rule/skill can literally shell out to `go fix` |
| Is the classic `tc := tc` loop-variable-shadow guard in table tests now dead code (per-iteration loop vars since Go 1.22), and can a modernizer flag it mechanically? | Prevents a rule from teaching removed cruft as required style | [go1.22 change](https://go.dev/doc/go1.22) (era baseline) + `go fix` modernizers above | no | testing/lang | P1 — version-specific, Go 1.22+ |
| What is the actual mechanism (the `go.mod` `go` line + `GOTOOLCHAIN`) that makes a `GODEBUG` default track the declared module version, not the installed toolchain — and where does a CI matrix get this wrong? | Load-bearing for any modules/toolchain rule; a stale `go` line silently freezes old defaults | [go.dev/blog/toolchain](https://go.dev/blog/toolchain) | no | modules/toolchain | P0 |
| When does a `GODEBUG` setting move from "opt-out available" to "permanently removed," and how should a rule warn against relying on an old default across a toolchain bump? | Concrete removal list exists for 1.26→1.27 (`tlsunsafeekm`, `tlsrsakex`, `tls10server`, `tls3des`, `x509keypairleaf`, `gotypesalias`, `asynctimerchan`) | [go1.26](https://go.dev/doc/go1.26)/[go1.27](https://go.dev/doc/go1.27) notes | no | toolchain/compat | P0 |
| Is the `toolchain` directive actually committed in real repos, and does a stale one mask a security-patch bump (H6)? | Frame flags H6 explicitly as untested; needs corpus/exemplar grounding, not just practitioner opinion | [go.dev/blog/toolchain](https://go.dev/blog/toolchain) | no | modules | P1 — needs grounding-wave confirmation |
| Go 1.24's `tool` directive in `go.mod`: does it fully replace the `tools.go` blank-import hack for pinning dev-tool versions? | A concrete, dated (Feb 2025) migration a rule should push | [Alex Edwards](https://www.alexedwards.net/blog/how-to-manage-tool-dependencies-in-go-1.24-plus) | no | toolchain/modules | P1 — version-specific, Go 1.24+ |
| Under FIPS 140-3 mode (`GOFIPS140=v1.0.0`/`inprocess`, `GODEBUG fips140=on`), which crypto/TLS behaviors silently change, and what breaks a test suite assuming non-FIPS randomness? | Security rule must name this as a build-time *mode*, not a library import | [go.dev/blog/fips140](https://go.dev/blog/fips140) | no | security/crypto | P1 |
| Is ML-DSA post-quantum signing (Go 1.27's `crypto/mldsa`, TLS 1.3 `MLDSA44/65/87`) something a fleet CLI/SDK needs to plan for now, or premature? | Brand-new (1.27); needs an explicit "not yet" verdict rather than silence | [go1.27 notes](https://go.dev/doc/go1.27) | no | security | P2 — version-specific, Go 1.27+; too new for a firm position |
| What's the correct `os.Root`-scoped pattern (the `Chmod`/`Chown`/`Rename`/`Symlink`/`MkdirAll`/`WriteFile` family added through 1.24-1.25) for symlink-escape-safe filesystem work in a content-addressed store? | Directly matches the fleet's own OCX-style store use case; most exemplar code predates the full API | [go1.25 notes](https://antonz.org/go-1-25/) | no | security/fs | P0 — version-specific, Go 1.24+; needs exemplar-corpus grounding for adoption rate |
| Does `filepath` vs. `path` confusion (OS-separator vs. URL-style slash) still show up in real CLIs, and what's the Windows-specific failure mode a reviewer should check for? | Classic, boring-but-biting mistake explicitly called out by the brief | [100go.co](https://100go.co/) (category: Standard Library) | no | fs/portability | P1 — needs exemplar-corpus grounding |
| Is map iteration order still unspecified-and-randomized, and what's the accepted deterministic-output pattern (`maps.Keys()` + `slices.Sort`) for CLI/JSON output? | Ties directly to the fleet's atomic-file-write/determinism concerns for CLIs and SDKs | [100go.co](https://100go.co/) (category: Data Types) | no | determinism | P1 |
| What's the idiomatic deferred-`Close()`-error-handling pattern, and does any linter reliably catch a swallowed `Close` error that should fail the operation? | Named mistake category (100go.co); unclear whether `errcheck`/`wrapcheck` actually catch it — needs a run against fixtures | [100go.co](https://100go.co/) (category: Error Management) | no | errors/resource cleanup | P0 — verification-command potential is high; worth actually testing with the toolchain |
| What is Mat Ryer's `run(ctx, args, getenv, stdin, stdout, stderr) int` pattern, and how directly does it map onto the fleet's existing Rust `cli-contract` convention? | Highest-transfer practitioner pattern found in this corpus for the fleet's stated future Go CLIs | [Mat Ryer / Grafana](https://grafana.com/blog/how-i-write-http-services-in-go-after-13-years/) | partial (mechanism argued generically in `rust-quality/cli-contract.md`; Go's idiomatic shape — a `run` func, not a typed exit-code enum — differs and needs its own statement) | cli | P0 |
| Must library code (as opposed to `main`) ever call `os.Exit` or panic to signal failure? | Direct, checkable MUST NOT with a named source | [Tao of Go](https://bitfieldconsulting.com/posts/tao-of-go) | partial (rust-quality cli-contract argues the equivalent for Rust; Go's `panic`-vs-`os.Exit` split is distinct) | cli/errors | P0 |
| Is golangci-lint v2's default-enabled linter set (`errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`) sufficient for a fleet gate, or must `revive`/`gosec`/`exhaustive`/`wrapcheck` be explicitly enabled? | A rule that says "run golangci-lint" without naming linters is underspecified | [golangci-lint docs](https://golangci-lint.run/docs/linters/); [changelog](https://raw.githubusercontent.com/golangci/golangci-lint/master/CHANGELOG.md) | no | lint | P0 |
| Should a rule prefer golangci-lint's bundled `staticcheck` or a standalone `staticcheck` invocation, given the two can drift in version? | Verifiable directly with the installed toolchain (`golangci-lint` 2.14.0 vs. standalone staticcheck 2026.2.1) | [golangci-lint changelog](https://raw.githubusercontent.com/golangci/golangci-lint/master/CHANGELOG.md) | no | lint/toolchain | P2 — needs a toolchain run to confirm drift, not just docs |
| Is `govulncheck` a golangci-lint linter, or must it always be a separate CI step? | Concrete, checkable fact (it is explicitly not bundled per golangci-lint's own issue tracker) | [golangci-lint#4623](https://github.com/golangci/golangci-lint/issues/4623) | no | lint/security | P1 |
| What is the argued case for `log/slog` over `zap`/`zerolog` for new code (H7), and does `slog.GroupAttrs` (1.25) close the ergonomic gap that used to push teams to zap? | Directly tests H7 against a dated (1.25) stdlib improvement | [go1.25 notes](https://antonz.org/go-1-25/); Jonathan Amsterdam's original slog design rationale | no | logging | P1 — needs exemplar-corpus grounding (`uber-go/zap` is in the corpus) to see real adoption |
| What specific goreleaser + `-trimpath` + `CGO_ENABLED=0` + `mod_timestamp` combination produces a reproducible Go release binary, and does the fleet's `ocx-mirror` verification need to check for it? | Directly ties to the fleet's stated `ocx-mirror` consumer of upstream Go releases (H8) | frame H8; corpus exemplar `goreleaser/goreleaser` | no | release | P0 — needs exemplar-corpus grounding, high fleet relevance |
| `-ldflags -X` version stamping vs. `debug.ReadBuildInfo()` VCS stamping (since Go 1.18) — which is current best practice, and does one silently break under `-trimpath`? | Common, checkable practitioner gotcha with a real interaction effect | needs a dedicated release-focused source pass (flagged as a gap, not fully sourced this wave) | no | release | P1 |
| What's the reason `golang-standards/project-layout` keeps getting cited as a standard despite the maintainers' own denial, and how should a rule phrase "start flat" without sounding like it's dismissing a real pain point (large multi-binary monorepos)? | The corpus shows converging advice but also shows *why* the confusion persists (people keep linking the repo) | [project-layout#117](https://github.com/golang-standards/project-layout/issues/117); [Alex Edwards](https://www.alexedwards.net/blog/11-tips-for-structuring-your-go-projects) | no | project layout | P1 |
| How long does a `GOEXPERIMENT` flag typically live before becoming default or being removed (`greenteagc` default-on in 1.26, `nojsonv2`/`nosizespecializedmalloc` opt-outs flagged for removal in 1.27/1.28), and what's the right posture for a rule that references one? | Prevents the rule set from hard-pinning to a flag whose name or default is about to change | [go1.26](https://go.dev/doc/go1.26)/[go1.27](https://go.dev/doc/go1.27) notes | no | toolchain | P1 |
| `go mod init`'s new default (Go 1.26 pins a lower `go` line than the running toolchain) — should a freshly scaffolded fleet SDK repo trust that default, or pin an explicit `go` line? | Concrete, checkable, and load-bearing for whatever `go-modules` rule this program produces | [go1.26 notes](https://go.dev/doc/go1.26) | no | modules/toolchain | P1 — version-specific, Go 1.26+ |
| `go mod tidy`'s new duplicate-require-block merging (Go 1.27+) — is this a breaking format change agents must know before hand-editing `go.mod`? | An agent hand-editing `go.mod` could produce a format `go mod tidy` then rewrites unexpectedly | [go1.27 notes](https://go.dev/doc/go1.27) | no | modules | P2 — version-specific, Go 1.27+ |
| What is the documented SIGQUIT/`GOTRACEBACK`/Delve/`coredumpctl` sequence for diagnosing a hung Go process, and is `GOTRACEBACK=crash`'s core-dump path actually reliable on current kernels? | Concrete runbook content for a "diagnosing leaks/races/perf" skill; has a dated, specific known-broken-kernel caveat | [Stapelberg](https://michael.stapelberg.ch/posts/2025-02-27-debug-hanging-go-programs/) | no | perf/ops | P1 |
| What is the current, non-testify way to do deep-equality diffing in tests (`cmp.Diff` from `google/go-cmp`), and which `cmpopts` are needed to avoid a panic on unexported fields? | Directly names the converging replacement pattern from source #16, with the exact panic footgun | [Boldly Go](https://boldlygo.tech/posts/2026-04-20-testify-is-making-your-go-tests-worse/); exemplar `google/go-cmp@b133f1f1932e` | no | testing | P0 |
| What's the argued-correct HTTP-service shutdown pattern (`signal.NotifyContext` + `http.Server.Shutdown` with a timeout) vs. the common mistake of exiting before in-flight requests drain? | Directly named in Mat Ryer's post; a concrete, checkable MUST for any Go HTTP service the fleet builds | [Mat Ryer / Grafana](https://grafana.com/blog/how-i-write-http-services-in-go-after-13-years/) | no | http/cli | P0 |
| Does `sync.Once`-deferred initialization (Ryer's pattern for expensive startup work like template parsing) generalize to other startup costs a fleet CLI/SDK would have, and what's the failure mode if the deferred init itself can error? | A named pattern with an unaddressed gap (error handling inside a `sync.Once.Do`) worth resolving before codifying | [Mat Ryer / Grafana](https://grafana.com/blog/how-i-write-http-services-in-go-after-13-years/) | no | cli/errors | P2 |

## Recent shifts seen in this corpus

- **June 2025 — error-handling syntax abandoned for good.** The Go team
  closed out `check`/`handle`, `try()`, and the `?`-operator lineage and
  will not revisit syntax; only library/tooling remedies remain sanctioned.
  Invalidates: any older post (pre-2025) speculating about an incoming
  `try` or `?` construct as "coming soon."
- **Go 1.22 (2024) — per-iteration loop variables.** The classic
  `tc := tc` / `v := v` shadow-copy guard in table-driven tests and
  goroutine-launching loops is no longer required. Invalidates: pre-2024
  advice teaching the shadow copy as mandatory Go style; a modernizer now
  exists in `go fix` to catch the now-dead pattern.
- **Go 1.24-1.25 (Feb-Aug 2025) — `os.Root` becomes a full filesystem API.**
  What started as a narrow, path-traversal-safe `Open`/`OpenFile` primitive
  gained `Chmod`, `Chown`, `Rename`, `Symlink`, `MkdirAll`, `WriteFile`, and
  more. Invalidates: any advice treating `os.Root` as read-only-only or
  too narrow for a real content-addressed-store implementation.
- **Go 1.24 (Feb 2025) — FIPS 140-3 module and the `tool` directive land
  together.** Both change what a fresh `go.mod` looks like and how crypto
  behaves under `GOFIPS140`. Invalidates: pre-2025 advice describing
  `tools.go` blank-imports as the only way to pin dev-tool versions.
- **Go 1.25 (Aug 2025) — container-aware `GOMAXPROCS` and
  `sync.WaitGroup.Go()`.** Default scheduler parallelism now respects
  cgroup CPU quotas without code changes; the `Add`/`go`/`Done` triad has a
  one-call replacement. Invalidates: pre-1.25 capacity-planning advice that
  assumed `GOMAXPROCS` always equals host CPU count in a container;
  pre-1.25 concurrency examples teaching the triad as the *only* correct
  form (still correct, just no longer the shortest correct form).
- **Go 1.25 (Aug 2025) — `testing/synctest.Run` deprecated in favor of
  `Test`.** Invalidates: any 1.24-era synctest example still calling `Run`.
- **Go 1.26 (Feb 2026) — `go fix` rewritten around a modernizer framework;
  Green Tea GC on by default; goroutine-leak profiling ships experimental.**
  Invalidates: advice treating `go fix` as the old, narrow historical-fixer
  tool; pre-1.26 GC-tuning advice that assumes the previous (non-Green-Tea)
  collector's behavior by default.
- **Go 1.27 (Aug 2026, current per the frame) — goroutine-leak profiling
  reaches general availability; `encoding/json/v2` backs the original
  `encoding/json`; generic methods land; ML-DSA post-quantum signing
  ships.** Invalidates: advice that treats goroutine-leak detection as
  purely a third-party-tool (`goleak`) concern with no first-party runtime
  equivalent; advice assuming `encoding/json`'s old, laxer UTF-8/duplicate-
  key handling is still the default on a fresh 1.27 toolchain.
- **2026-04 — sustained, specific practitioner attack on testify reaches a
  named, checkable form** (nil-vs-empty-slice inconsistency, 30+ assertion
  functions, argument-order inconsistency) with `google/go-cmp`'s
  `cmp.Diff` as the converging replacement. This is newer and more specific
  than the older, general "prefer stdlib to third-party test frameworks"
  advice — it names exact functions and exact failure cases.
- **golangci-lint v2.14.0 (2026-09-23, three days before this research)** —
  current per the frame; confirms the version hypothesis directly from the
  tool's own changelog rather than a secondary source.

## Contested

- **Functional options vs. builder/config-struct.** Cheney's own canonical
  pattern is under specific, measured critique (rednafi's builder claim,
  evanjones.ca's allocation-cost analysis) for the case of a small, closed
  option set or a performance-sensitive constructor. Trend: the debate is
  converging on "functional options for an open-ended public library API;
  a struct or builder for a closed, internal, or hot-path config" rather
  than either pattern winning outright.
- **testify vs. stdlib+go-cmp.** The practitioner corpus (Boldly Go,
  Google's own style guide, rednafi's general anti-magic stance) leans
  hard toward stdlib+`cmp.Diff`, but real teams that already standardized
  on testify are explicitly granted an exception even by testify's critics
  ("prioritizing project consistency"). Trend: new code and new teams
  should default to stdlib+go-cmp; the rule set should not demand a
  rip-and-replace of an existing testify-based suite.
- **`context.Value`.** Even a source arguing *for* keeping it (Merovius)
  ends undecided about whether a type-safe generic wrapper is worth its
  complexity. Trend: no clear direction yet — this is a case where the
  rule set should state the tension rather than assert a MUST.
- **`go.uber.org/atomic` vs. raw `sync/atomic`.** Uber's own style guide
  argues for the wrapper type for type safety; this is a company-specific
  position not echoed elsewhere in the corpus (stdlib `sync/atomic` gained
  typed atomics — `atomic.Int64`, etc. — in Go 1.19, which addresses much
  of Uber's original complaint). Trend: likely stale advice inside Uber's
  own guide, superseded by stdlib's typed atomics; needs exemplar-corpus
  confirmation of which one real code actually uses now.
- **Project layout: flat-by-default vs. `golang-standards/project-layout`.**
  Every practitioner source fetched in this wave (Cheney, Demailly,
  Edwards) argues flat, and the "standard" repo's own maintainers disclaim
  official status — but the repo is still one of the most-starred Go
  repositories on GitHub and continues to shape newcomers' expectations.
  Trend: decisively toward flat/minimal among people who write about Go
  professionally; the repo's popularity is a lagging, not leading,
  indicator.
- **Range-over-func iterators: prescriptive guidance is thin.** Two
  name-brand sources (Ardan Labs, Bendersky) explain the mechanism
  thoroughly but neither argues *when* to reach for an iterator over a
  plain slice-returning function. Trend: unresolved — this may mean the
  idiom is still too new (Go 1.23, Aug 2024) for settled practitioner
  consensus, not that there is disagreement.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/blog/error-syntax](https://go.dev/blog/error-syntax) | Official Go team blog post | June 2025 | Primary; the definitive, dated decision to stop pursuing error-handling syntax changes, with proposal history |
| [go.dev/blog/toolchain](https://go.dev/blog/toolchain) | Official Go team blog post (Russ Cox) | Aug 2023 | Primary; the design rationale for `go.mod`'s `go` line as a compatibility/toolchain dial |
| [go.dev/blog/range-functions](https://go.dev/blog/range-functions) | Official Go team blog post | 2024 | Primary; canonical `iter.Seq`/`iter.Seq2` design explanation |
| [go.dev/blog/fips140](https://go.dev/blog/fips140) | Official Go team blog post | 2025 | Primary; FIPS 140-3 module mechanics (`GOFIPS140`, `GODEBUG fips140`) |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Official release notes | Feb 2026 | Primary; exhaustive, versioned list of language/tool/stdlib/GODEBUG changes |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Official release notes | Aug 2026 | Primary; confirms the frame's "1.27.1 current" hypothesis with exact feature list |
| [research.swtch.com/telemetry-design](https://research.swtch.com/telemetry-design) | Russ Cox's personal research blog, official Go-team design doc | 2023 | Primary; shows how a Go-team proposal actually changed under public pressure (opt-out → opt-in) |
| [google.github.io/styleguide/go/best-practices](https://google.github.io/styleguide/go/best-practices) | Google's official public style guide | Living document, checked 2026-09-26 | Primary; specific, sourced positions (e.g. "fail within the Test function itself") stronger than generic advice |
| [github.com/uber-go/guide (style.md)](https://raw.githubusercontent.com/uber-go/guide/master/style.md) | Uber's official corporate style guide, fetched raw from source | Living document | Primary (a widely-imitated corporate standard); concrete numeric/structural rules (channel size ≤1, enums start at 1) |
| [github.com/golangci/golangci-lint CHANGELOG.md](https://raw.githubusercontent.com/golangci/golangci-lint/master/CHANGELOG.md) | The tool's own changelog, fetched raw | v2.14.0, 2026-09-23 | Primary; confirms the frame's version hypothesis directly and lists exact per-linter version bumps |
| [golangci-lint.run/docs/linters](https://golangci-lint.run/docs/linters/) | The tool's own docs site | Current, v2 | Primary; the actual default-enabled linter list, distinct from "all linters golangci-lint can run" |
| [github.com/golang-standards/project-layout/issues/117](https://github.com/golang-standards/project-layout/issues/117) | The repo's own issue tracker | Ongoing | Primary (source disclaiming its own official status); load-bearing for the "not official" claim |
| [dave.cheney.net/practical-go](https://dave.cheney.net/practical-go) | Practitioner reference site, standing material cited across the community | Cheney's long-running Go writing | The single most cross-cited practitioner source in this survey; error handling, API design, testing |
| [grafana.com/blog/how-i-write-http-services-in-go-after-13-years](https://grafana.com/blog/how-i-write-http-services-in-go-after-13-years/) | Grafana Labs company blog, authored by Mat Ryer | Feb 2024 | A refresh of a widely-cited 2018 original; the most directly transferable pattern found for future fleet Go CLIs/HTTP services |
| [100go.co](https://100go.co/) | Companion site to Teiva Harsanyi's "100 Go Mistakes" book | Book 2022, site maintained | A ready-made, already-categorized checklist of concrete mistakes across 11 categories |
| [antonz.org/go-1-25](https://antonz.org/go-1-25/) | Anton Zhiyanov's interactive release-note tour | Aug 2025 (Go 1.25) | Explicitly named in the brief; the runnable-example format is itself a pattern worth studying |
| [rednafi.com/go/dysfunctional-options-pattern](https://rednafi.com/go/dysfunctional-options-pattern/) | Redowan Delowar's personal engineering blog | March 2024 | A specific, measured (not vibes-based) critique of Cheney's own canonical pattern |
| [rednafi.com/go/context-cancellation-cause](https://rednafi.com/go/context-cancellation-cause/) | Redowan Delowar's personal engineering blog | Recent (rednafi.com archive) | Names the exact under-adopted `context.Cause`/`WithCancelCause` APIs and their edge cases |
| [blog.merovius.de (scrapping contracts; parametric context)](https://blog.merovius.de/posts/2018-09-05-scrapping_contracts/) | Axel Wagner's (Merovius's) personal blog | 2018, 2020 | Explains *why* today's generics look the way they do, and models honest, unresolved practitioner disagreement |
| [laurentsv.com/blog/2024/10/19/no-nonsense-go-package-layout](https://laurentsv.com/blog/2024/10/19/no-nonsense-go-package-layout.html) | Laurent Demailly's personal engineering blog | Oct 2024 | The sharpest, most specific anti-`pkg/`/anti-`internal/`-by-default argument found |
| [alexedwards.net/blog/11-tips-for-structuring-your-go-projects](https://www.alexedwards.net/blog/11-tips-for-structuring-your-go-projects) | Alex Edwards' personal site, author of "Let's Go" | Standing reference | A softer, incremental counterpoint to Demailly; concrete structural warning signs |
| [boldlygo.tech/posts/2026-04-20-testify-is-making-your-go-tests-worse](https://boldlygo.tech/posts/2026-04-20-testify-is-making-your-go-tests-worse/) | Boldly Go blog | April 2026 — inside this program's stated era | The most current, most specific anti-testify argument found, with a named replacement (`cmp.Diff`) |
| [michael.stapelberg.ch/posts/2025-02-27-debug-hanging-go-programs](https://michael.stapelberg.ch/posts/2025-02-27-debug-hanging-go-programs/) | Michael Stapelberg's personal blog | Feb 2025 | A concrete, dated operational runbook (SIGQUIT/Delve/coredumpctl) with a named current kernel caveat |
| [bitfieldconsulting.com/posts/tao-of-go](https://bitfieldconsulting.com/posts/tao-of-go) | Bitfield Consulting (John Arundel) | Standing reference | Sharpens several Go proverbs into checkable MUST/MUST NOT rules, including the library-must-never-`os.Exit` rule |
| [eli.thegreenplace.net/2024/ranging-over-functions-in-go-123](https://eli.thegreenplace.net/2024/ranging-over-functions-in-go-123/) / [ardanlabs.com range-over-functions](https://www.ardanlabs.com/blog/2024/04/range-over-functions-in-go.html) | Eli Bendersky's personal blog; Ardan Labs company blog | 2024 (Go 1.23 era) | Two name-brand sources explaining the same mechanism with no prescriptive stance between them — useful as a negative data point on where consensus does *not* yet exist |

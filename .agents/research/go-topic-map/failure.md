---
title: Go failure corpus — antipatterns, concurrency bugs, CVE shapes, postmortems
corpus: failure
agent: go-topic-map/failure scout
model: claude-sonnet-5 (rationale: corpus survey and web reading — discovery, not decisions)
date_researched: 2026-09-26
sources_count: 25
scope: |
  Covers: 100 Go Mistakes (all 100/101 entries, era-checked against 1.22/1.23),
  the Uber PLDI'22 data-race study, the ASPLOS'19 concurrency-bug study, goroutine-leak
  literature (goleak, Uber LeakProf, the Go 1.27 goroutine leak profiler), the Go
  vulnerability database's recurring CWE shapes (2023-2025 CVEs), company postmortems
  (Discord, Tailscale, Uber), recurring review objections (Go CodeReviewComments,
  kubernetes/kubernetes error-wrap migration), and toolchain-version-specific fixes
  (1.22 loop vars, 1.23 timer GC, 1.24 os.Root, 1.25 WaitGroup.Go/synctest GA, 1.27
  goroutineleak profiler, staticcheck 2026.2, golangci-lint v2.14.0).
  Does not cover: module/toolchain mechanics, release/signing pipelines, Bazel-for-Go,
  or day-to-day style rules not tied to a failure mode — those are other scouts' waves.
  LLM-specific Go hallucination literature was searched and came back empty (noted as
  a gap, not a finding).
---

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- 100 Go Mistakes is still ~90% current in 2026; only two entries have a hard
  version-gated fix — #63 "loop variables" (Go 1.22 per-iteration scoping) and
  #76 "`time.After` and memory leaks" (Go 1.23 makes unreferenced timers GC-eligible
  even without `Stop`) — and both still carry a residual warning even after the fix.
- Uber's 46M-line, 2,100-microservice race study found **Go-specific** language
  features (slices: 391 races, closure/loop/err capture-by-reference: 223, concurrent
  map access: 38, parallel-test interaction: 139) roughly matched **language-agnostic**
  causes (missing locking: 470, thread-safety contract violations: 369) — concurrency
  bugs in Go are not just "forgot a mutex," they are Go's own primitives (append,
  closures, `t.Parallel`) creating races that look safe.
- The ASPLOS'19 study of Docker/Kubernetes/etcd/gRPC found blocking bugs
  (deadlock-shaped, 85) and non-blocking bugs (race-shaped, 86) in near-equal numbers,
  and — counter to intuition — **message-passing (channel) bugs were as common or
  more common than shared-memory bugs** for the blocking category; Go's race
  detector caught only half of reproduced non-blocking bugs and the deadlock
  detector only 2 of 21 blocking bugs.
- Goroutine leaks are a production-scale problem, not a toy example: Uber found
  857 pre-existing leaks across ~75M lines with `goleak`-style static testing and
  prevented ~260 new ones over a year; a separate in-production tool (LeakProf)
  found 10 leaks in one pass, with two fixes yielding 2.5x and 5x peak-memory drops.
- Go 1.27 shipped a **generally-available goroutine leak profiler**
  (`runtime/pprof` `goroutineleak` type, `/debug/pprof/goroutineleak`) — this is a
  new, real capability the fleet's Go SDK/CLI guidance should know about, but it is
  a *production-server* tool (it profiles a running process), not obviously useful
  for a short-lived CLI invocation.
- `sync.WaitGroup.Go()` and GA `testing/synctest` are **Go 1.25**, not 1.24 as the
  frame's era table implied by grouping them under "generics era" features —
  correction: `testing/synctest` was experimental in 1.24 (`GOEXPERIMENT=synctest`)
  and reached GA in 1.25 alongside `WaitGroup.Go`.
- Typed-nil-in-an-interface is still the single most-cited "gotcha" across every
  secondary source surveyed, and it is a *language design* fact (an interface is a
  `(type, value)` pair), not a bug fixed by any Go version — no future release will
  remove this.
- `go vet`'s `copylock` analyzer catches direct struct-copy-of-a-lock but has known
  historical gaps (e.g. golang/go#20261: doesn't always catch immediate reassignment
  patterns) — "vet passes" is not the same claim as "no copied lock exists."
- staticcheck 2026.2 (v0.8.0) added **SA9010**: flags `defer foo()` where `foo`
  itself returns a function — i.e. the caller forgot to call the *returned*
  cleanup closure. This is a brand-new check (2026) for a failure shape the
  100-mistakes book calls out narratively (#47, defer/receiver evaluation) but no
  linter caught mechanically until this release.
- golangci-lint v2.14.0 (released 2026-09-24, two days before this research) rolled
  forward `staticcheck` to 0.8.1, `gosec` to 2.29.0, `revive` to 1.17.0, and
  `gocritic` to 0.15.0 — the toolchain era hypothesis (2.14.0 current) is confirmed
  by the tool's own changelog, read from the cloned repo.
- gosec's G115 (integer-overflow-on-conversion) is contested in the ecosystem: it
  is real (CWE-190) but ships with well-documented false positives (e.g.
  `uint32(len(x))`, which cannot overflow on any real platform) — multiple large
  projects (docker/cli, moby/moby, telegraf) have open issues debating whether to
  enable it at all.
- Go's `regexp` package (RE2-based) is **not** vulnerable to catastrophic-backtracking
  ReDoS by construction — it guarantees linear-time matching by giving up
  backreferences/lookaround. Any Go ReDoS finding in a codebase almost always means
  a *third-party* backtracking engine was used instead of stdlib `regexp`.
- Recent net/http CVEs recur in one shape: **protocol-boundary parsing laxness**.
  CVE-2025-22871 (bare-LF accepted in chunked chunk-size lines, enabling smuggling
  when paired with a stricter front-end) and CVE-2023-29406 (Host-header content not
  validated by the HTTP/1 client) are both "the stdlib parser is more permissive than
  the spec, and a second server disagrees" — this is a stay-current-on-patch-releases
  story more than an application-code story.
- Zip-slip / path-traversal-on-extract (CVE-2025-3445, mholt/archiver) is a live,
  recurring CWE-22 shape; Go 1.24's `os.Root`/`OpenRoot` closes the local-filesystem
  half of this (paths can't escape the root, including through symlinks, at the
  kernel level on platforms with `openat`) but does **not** by itself validate
  archive entry names before extraction — the two defenses are complementary, not
  substitutes.
- Kubernetes' own codebase ran (and is still running, per open issue
  [kubernetes/kubernetes#123234](https://github.com/kubernetes/kubernetes/issues/123234))
  a project-wide migration from `%v` to `%w` in `fmt.Errorf`, because `%v`-wrapped
  errors silently break `errors.As`/`errors.Is` chains — this is the single most
  concrete "recurring review objection" found with a primary-source paper trail.
- Discord's 2023 postmortem ("switching from Go to Rust") is a real production
  data point on GC-induced tail latency (~500ms spikes every 2 minutes) from having
  to scan a large live LRU-cache-shaped heap — it is evidence *for* the "GC pause
  matters for large long-lived caches" pattern the corpus was asked to find, not
  evidence that Go itself is broken; the fix pattern (shrink live-object graph,
  or move the hot cache out of GC'd memory) generalizes beyond the rewrite.
- Tailscale's `netaddr`/`netip` rationale (fixed-size, comparable-with-`==`,
  allocation-free IP value types replacing slice-backed `net.IP`) is a concrete,
  well-documented case of "stdlib's original type has a structural performance/safety
  problem that a newer stdlib type (`net/netip`, now stable) fixes" — relevant
  directly to any Go networking code the fleet's SDK/CLI would write.
- No Go-specific study of LLM stdlib-API hallucination or pre-generics-idiom
  suggestion was found; general (Python/JS/Rust-focused) package-hallucination papers
  exist (arXiv 2406.10279, 2501.19012) but do not break out Go. This is a genuine
  corpus gap, not a "nothing to report" — worth flagging to the map as unresearched.

## Survey

### 1. [100go.co — 100 Go Mistakes: How to Avoid Them](https://100go.co/)

The companion site to Teiva Harsanyi's book lists 101 numbered mistakes across ten
chapters (Code/Project Organization, Data Types, Control Structures, Strings,
Functions/Methods, Error Management, Concurrency Foundations, Concurrency Practice,
Standard Library, Testing, Optimizations). Full numbered list extracted verbatim (see
list below and cross-referenced into the candidate table). Two entries are explicitly
version-gated and re-checked in this survey:
- **#63 "Not being careful with goroutines and loop variables"** — obsoleted for
  code in a `go 1.22`+ module by the per-iteration loop-variable scoping change (see
  §5 below), but the mistake is still live for any repo mixing `go.mod` versions
  below 1.22, or when the loop variable is explicitly reused across iterations by
  intent (rare).
- **#76 "`time.After` and memory leaks"** — softened, not eliminated, by Go 1.23's
  timer-GC change (see §6): the unreferenced-timer-survives-until-fire leak is fixed,
  but `time.After` in a hot `select` loop still allocates a `*Timer` and a channel
  per call, so the performance objection (not the leak objection) still holds.
No other entry in the list has a version-gated fix; the rest (interface pollution,
slice/map memory leaks, defer-in-loop, error comparison, context propagation, nil
vs. empty slice, etc.) describe language-level facts or idiom mistakes that no Go
release changes.

### 2. [Go Code Review Comments (go.dev/wiki/CodeReviewComments)](https://go.dev/wiki/CodeReviewComments)

The Go team's own accumulated code-review objections, one heading per recurring
comment. Directly load-bearing entries for a failure-corpus: **Contexts** (pass
`context.Context` as the first parameter, never as a struct field, never a custom
Context type); **Copying** (never copy a value of type `T` if `T`'s methods are on
`*T` — the general form of the copylocks bug); **Handle Errors** (never discard an
error with `_` outside narrow, explicit cases); **Goroutine Lifetimes** ("make it
clear when goroutines exit," i.e. document/own the lifetime — this is the wiki's own
statement of the leak-avoidance discipline); **In-Band Errors** (don't signal
failure with a sentinel value like `-1` or `""` — return an explicit second value);
**Interfaces** (define interfaces in the *consumer* package, not the producer —
directly informs H1/H2-adjacent "interface pollution" guidance).

### 3. [A Study of Real-World Data Races in Golang (PLDI 2022)](https://arxiv.org/html/2204.00764v2)

Uber (Chabbi et al.). Deployed a race detector across ~46M lines of Go / ~2,100
microservices; found >2,000 races, fixed >1,000 across 790 patches by 210 developers
over six months. Nine numbered observations; the ones with quantified root-cause
tables (Table 2, Go-specific causes, 879 races total; Table 3, language-agnostic
causes, 595 races total):
- Slice concurrent access: **391** races — "Slices are highly confusing types that
  create subtle and hard to diagnose data races," because a lock on the slice
  variable does not lock the backing array, and `append` can silently reallocate
  or silently alias.
- Capture-by-reference in closures: **223** races total, split as loop-variable
  capture (48), general free-variable capture (121), captured named-error variable
  (50), and named-return capture (4). "Transparent capture-by-reference of free
  variables in goroutines is a recipe for data races."
- Concurrent map access: **38** races (Go's built-in maps give no thread-safety, and
  `map[key]` syntax "creates false confidence about disjoint element access").
- Parallel-test interaction (`t.Parallel()` + table-driven tests): **139** races —
  races exposed only when tests actually run in parallel, in both test and product
  code.
- `sync.WaitGroup` misuse: participant count is set dynamically via `Add()`, and
  calling `Add()` from inside the spawned goroutine (instead of before `go f()`)
  races with `Wait()` returning early.
- Language-agnostic: missing/partial locking dominates at **470** races; violation
  of a documented thread-safety contract at **369**; atomic-op misuse at **40**.

### 4. [Understanding Real-World Concurrency Bugs in Go (ASPLOS 2019)](https://cseweb.ucsd.edu/~yiying/GoStudy-ASPLOS19.pdf) — read via [the morning paper summary](https://blog.acolyer.org/2019/05/17/understanding-real-world-concurrency-bugs-in-go/)

Tu et al. studied 171 concurrency bugs across six popular Go projects (Docker,
Kubernetes, etcd, gRPC and others). Split roughly evenly into **blocking** (85) and
**non-blocking** (86) bugs, and by mechanism into shared-memory (105) and
message-passing (66). Counter to the intuition that channels are "safer than
mutexes," **message-passing-caused blocking bugs outnumbered shared-memory-caused
blocking bugs** among the reproduced set. Detection-tool efficacy was weak: Go's
race detector caught only half of reproduced non-blocking bugs, and the (informal)
deadlock detection only caught 2 of 21 reproduced blocking bugs — meaning neither
`-race` nor a deadlock watchdog is a complete substitute for review attention to
goroutine lifetime and channel-close discipline.

### 5. [Fixing For Loops in Go 1.22 (go.dev/blog/loopvar-preview)](https://go.dev/blog/loopvar-preview) / [Go 1.22 release notes](https://go.dev/doc/go1.22)

Confirms the mechanism precisely: prior to 1.22, a `for` loop's declared variables
were created once and mutated per iteration, so a closure or `&x` capturing the loop
variable observed the *final* value (or a stale shared address) once the loop
finished or across concurrent goroutines. Go 1.22 gives each iteration a fresh
variable. Gated per-module: the new semantics apply only when the enclosing module's
`go.mod` declares `go 1.22` or later — a repo with an older `go` directive (or a
vendored/mixed-version dependency tree) still has the old, bug-prone semantics, and
`go vet`'s loop-closure check was updated in lockstep to stop flagging the
now-safe pattern only for 1.22+-declared files.

### 6. Go 1.23 timer GC change — [Go 1.23 release notes](https://go.dev/doc/go1.23) (via search synthesis of secondary sources; primary URL not independently re-fetched this pass)

Before 1.23, an abandoned `*time.Timer`/`*time.Ticker` (one created by `time.After`
inside a loop and never `Stop`'d) stayed reachable by the runtime's timer heap until
it actually fired, so a hot `select`-with-`time.After` loop accumulated live timers
as a real memory leak. Go 1.23 makes an unreferenced timer immediately GC-eligible.
The gate is the same per-module `go` directive mechanism as loop vars. Secondary
sources agree this "softens but does not erase" the objection to `time.After` in
hot paths — allocation and GC churn cost remain even once the leak risk is gone.

### 7. [Go 1.27 is released](https://go.dev/blog/go1.27) / [Go 1.27 release notes](https://go.dev/doc/go1.27) — goroutine leak profiler

Go 1.27 makes the **goroutine leak profile generally available**: `runtime/pprof`'s
`goroutineleak` profile type, also exposed automatically at
`/debug/pprof/goroutineleak` via `net/http/pprof`. It identifies goroutines
*permanently* blocked — on channel send/receive (including on a `nil` channel),
on a `select` with no `default`, or on `sync.Mutex`/`RWMutex`/`WaitGroup`/`Cond` —
and is explicitly designed to generate "little to no false positives," at the cost of
missing leaks blocked on file/network I/O or on non-stdlib concurrency primitives.
Same release: generic methods (a method can declare its own type parameters
independent of the receiver's), `go doc pkg@version`, size-specialized small-object
allocation (up to 30% cheaper allocation for objects <80B), and `encoding/json/v2`
backing the existing `encoding/json` package for faster unmarshal while keeping the
old API. This confirms the frame's H (era) assumption that 1.27.1 is current and
resolves the frame's open question ("the Go 1.26/1.27 goroutine leak profile if it
exists") — it exists, and is GA, not experimental, as of 1.27.

### 8. [uber-go/goleak README](https://github.com/uber-go/goleak)

`goleak.VerifyNone(t)` (deferred inside a test) or `goleak.VerifyTestMain(m)` (once
per package, in `TestMain`) checks that no unexpected goroutines remain running.
Documented, load-bearing caveat: **goleak cannot distinguish a genuinely leaked
goroutine from a `t.Parallel()` test that simply hasn't finished yet** — the README's
own recommendation for parallel test suites is to rely on `VerifyTestMain` rather
than per-test `VerifyNone`, because per-test checks produce false leak reports against
still-running siblings.

### 9. [LeakProf: Featherlight In-Production Goroutine Leak Detection (Uber Engineering Blog)](https://www.uber.com/blog/leakprof-featherlight-in-production-goroutine-leak-detection/)

Companion, production-facing tool to `goleak` (which only runs in tests). Uses
periodic `pprof` goroutine-stack sampling, aggregated by the source location of the
blocking channel/select operation, flagging a location once the count of goroutines
stuck there exceeds a threshold; supplements with AST-level static heuristics (e.g.
recognizing a `select` branch on a timer as non-blocking-by-design) to cut false
positives. Explicitly **not sound or complete** — a deliberate, stated tradeoff for
low production overhead. Concrete numbers: found 10 leaking goroutines in one pass
(1 false positive); two of the fixed leaks produced 2.5x and 5x peak-memory
reductions, letting service owners cut container memory requests by 25%. Companion
static-test-time finding (same Uber Go monorepo, per Uber's academic collaboration
paper on the same corpus): 857 pre-existing leaks found across ~75M lines / ~2,500
microservices, and ~260 new leaks prevented over a year of `goleak` gating in CI.

### 10. [Why Discord is switching from Go to Rust](https://discord.com/blog/why-discord-is-switching-from-go-to-rust)

Company postmortem/retrospective (2023) on a specific service (Read States, an
LRU-cache-shaped hot path). Root cause: the Go garbage collector had to scan the
entire live cache to determine reachability, producing ~500ms latency spikes roughly
every 2 minutes as the cache grew. This is presented in-source as a GC/heap-shape
problem specific to a large, long-lived, pointer-heavy in-memory cache — not a claim
that Go's GC is broadly unfit. Directly relevant pattern for the fleet: a Go
service/SDK holding a large long-lived cache of pointer-rich objects should expect
GC-scan cost to scale with live heap size, and should consider flattening the cache's
object graph (fewer pointers, more value types / byte slices) or moving it off-heap
before reaching for a language change.

### 11. [netaddr.IP: a new IP address type for Go (Tailscale blog, 2021)](https://tailscale.com/blog/netaddr-new-ip-type-for-go)

Rationale for what became the stable `net/netip` package. `net.IP` is a `[]byte`
under the hood: not comparable with `==`, unusable as a map key, mutable by anything
it's passed to (forcing defensive copies), and its 3-word slice header plus backing
array (28-56 bytes observed) costs more than a fixed-size value type needs; it also
cannot distinguish an IPv4-mapped IPv6 address from a plain IPv4 address after
parsing (cited as [golang/go#37921](https://github.com/golang/go/issues/37921)).
`netip.Addr` fixes all four properties as a small, comparable, immutable value type.
Directly relevant to any Go networking code the fleet's SDK/CLI writes: prefer
`net/netip` types in new APIs over `net.IP`.

### 12. [gosec G115 discussion](https://github.com/securego/gosec/issues/1185) and related project issues (docker/cli#5584, moby/moby#48358, telegraf#15798, elastic/cloud-on-k8s#8076)

G115 flags integer-type conversions that could lose data or wrap (CWE-190),
covering shapes like `uintptr→int`, `int→int32`, `uint→int64`, `uint64→int64`,
`uint64→uint16/uint32`. Multiple large, security-conscious projects have open
issues explicitly debating whether to enable it, because it also flags provably-safe
conversions such as `uint32(len(x))` (length of a Go slice/string can never make this
conversion lose data on any real platform). The `go-safecast` library
(`github.com/ccoVeille/go-safecast`) exists specifically to give an explicit,
checked-conversion alternative that satisfies the linter without a blanket
`//nolint`.

### 13. [Go's regexp package and RE2 / ReDoS immunity](https://checkmarx.com/blog/redos-go/) (secondary synthesis; Go's own `regexp` package doc is the primary claim source)

Go's stdlib `regexp` is implemented on RE2 principles: it compiles the pattern once
into an automaton and simulates it over the input one character at a time, which
guarantees linear-time matching *regardless of pattern shape*, at the cost of
dropping backreferences and lookaround (constructs that inherently require
backtracking). Concretely cited comparison: matching `(a+)+$` against a
non-matching 28-character string takes ~2.76s with a classic backtracking engine
versus ~39μs with RE2. Practical implication for a Go corpus: a ReDoS finding in Go
code almost always traces to a *third-party* backtracking regex library (or to
building a regex dynamically from untrusted input and feeding it to something other
than stdlib `regexp`), not to `regexp` itself.

### 14. [CVE-2025-22871 — net/http request smuggling via bare-LF chunk terminators](https://www.sentinelone.com/vulnerability-database/cve-2025-22871/) and [CVE-2023-29406 — net/http Host-header injection](https://vulert.com/vuln-db/CVE-2025-22871) via search synthesis

CVE-2025-22871: `net/http`'s chunked-transfer-encoding parser accepted a bare LF
(not the spec-required CRLF) as a chunk-size line terminator; a front-end that is
*stricter* about this than Go's server can be tricked into disagreeing about where
one request ends and the next begins — the canonical request-smuggling shape.
Affected 1.23.0-1.24.1; fixed in 1.23.8/1.24.2. CVE-2023-29406: the HTTP/1 client
did not validate the contents of a `Host` header before sending it, permitting
header/request injection. Both are "the stdlib parser was more permissive than the
spec" bugs, fixed upstream — the actionable guidance for the fleet's Go code is
version-currency (track the two supported releases) rather than an application-level
workaround.

### 15. [GO-2025-3563 / CVE-2025-3445 — mholt/archiver Zip Slip](https://pkg.go.dev/vuln/GO-2025-3563) and [Go Vulnerability Database](https://vuln.go.dev/)

A crafted ZIP file with path-traversal entry names (`../../etc/passwd`-shaped, or
via symlink entries) written through `archiver.Unarchive` escapes the intended
extraction directory. Classified CWE-22 (path traversal). The upstream project's
fix was never released before the library was deprecated in favor of a successor
(`mholt/archives`) that removed the vulnerable `Unarchive()` API entirely rather than
patch it — an example of "the ecosystem's fix was deletion, not a patch," worth
noting for any rule that recommends a specific archive-extraction library.

### 16. [os.Root / traversal-resistant file APIs — Go 1.24](https://go.dev/blog/osroot) and [Go 1.24 release notes](https://go.dev/doc/go1.24)

`os.OpenRoot` opens a directory and returns an `os.Root`; every filesystem
operation performed through that `Root` (open, create, mkdir, etc.) is confined to
that directory tree, including refusing paths that would escape it via a symlink —
enforced at the kernel level via the `openat`-family syscalls on platforms that
support them. This closes the *local-filesystem* half of the zip-slip problem (an
extractor that writes through an `os.Root` rooted at the destination directory
cannot be tricked into writing outside it, no matter what the archive entry name
says) but does not itself validate archive entry names — an extractor still needs to
reject or sanitize `..`-containing entries as defense in depth, since `os.Root`
protects the destination, not the parsing of untrusted entry metadata.

### 17. [kubernetes/kubernetes#123234 — migrate fmt.Errorf %v to %w](https://github.com/kubernetes/kubernetes/issues/123234)

Live, still-open issue: the majority of the Kubernetes codebase's `fmt.Errorf` calls
use `%v` (string-format the wrapped error) rather than `%w` (preserve it in the
error chain), "which may lead to false assumption in using `errors.As()`" — callers
higher up the stack that expect `errors.As`/`errors.Is` to traverse the chain
silently fail when an intermediate frame used `%v`. Proposed remedy: establish `%w`
as the canonical verb project-wide and add a lint check to hold the line once
migrated. This is a primary-source, concrete instance of the "when to wrap with %w
vs %v" review objection the frame's H2 hypothesized, in one of the largest Go
codebases that exists.

### 18. [go vet's copylock analyzer](https://github.com/golang/tools/blob/master/go/analysis/passes/copylock/copylock.go), context via [golang/go#20261](https://github.com/golang/go/issues/20261) and [golang/go#13675](https://github.com/golang/go/issues/13675)

`copylock` flags any value of a type with a pointer-receiver `Lock` method (`sync.
Mutex`, `sync.WaitGroup`, etc.) being copied by value — via assignment, return,
range, or being embedded in a struct that is itself copied. Historical, still-open
gap: certain reassignment-adjacent patterns (a lock value immediately reassigned on
the following line) have been reported as inconsistently flagged. Practical
takeaway for a Go quality rule: `go vet`'s copylock pass is necessary but its
edge-case coverage has known, long-standing gaps — a rule shouldn't claim "vet
passing" as a complete guarantee against copied-lock bugs, especially through
generics or interface-boxing (not fully explored in this pass — flagged as a
follow-up question in the candidate table).

### 19. [dominikh/go-tools — Staticcheck 2026.2 (v0.8.0) release notes](https://staticcheck.dev/changes/2026.2/) — read from the cloned exemplar `dominikh__go-tools@6cb65e58a558:website/content/changes/2026.2.md`

Confirms the frame's era hypothesis (staticcheck 2026.2.1 current) at the v0.8.0
baseline. Notable new check: **SA9010** — flags `defer foo()` where `foo()` itself
*returns a function*, the classic "forgot to defer the returned cleanup closure"
shape (e.g. `defer Start()` instead of `f := Start(); defer f()`), a pattern
100 Go Mistakes gestures at narratively (#47) but which had no static check until
this release. Also: Go 1.27 language support (generic methods, embedded-field
struct-literal initializers), `GOCACHEPROG` support matching the `go` tool's own
protocol, and case-insensitive check names (`SA1000`/`sa1000`/`sA1000` now
equivalent) in `-checks`, `-explain`, and `//lint:ignore` directives.

### 20. [golangci-lint CHANGELOG](https://github.com/golangci/golangci-lint/blob/master/CHANGELOG.md) — read from the cloned exemplar `golangci__golangci-lint@032d962e0399:CHANGELOG.md`

Confirms v2.14.0, released 2026-09-24 (two days before this research), as current —
matching the frame's era hypothesis exactly. That release rolled forward
`staticcheck` (embedded) to 0.8.1, `gosec` to 2.29.0 (re-enabling `G407`),
`revive` to 1.17.0 (new rules `marshal-receiver`, `multiline-if-init`,
`use-slices-concat`), `gocritic` to 0.15.0, `gofumpt` to 0.12.0, and
`govet-modernize` to 0.50.0. The presence of a dedicated `govet-modernize` linter
confirms `go fix`'s 1.26 modernizer analyzers are already wired into the v2 default
tooling chain, not just available as a standalone `go fix -w`.

### 21. [Go FAQ — "Why is my nil error value not equal to nil?"](https://go.dev/doc/faq#nil_error) (via search synthesis of multiple secondary explainers, consistent with each other and with the language spec's interface-representation semantics)

The canonical explanation, restated consistently everywhere surveyed: a Go interface
value is a `(type, value)` pair; assigning a `nil`-valued pointer of a concrete type
to an interface variable produces an interface whose `value` is `nil` but whose
`type` is not, so the interface itself is not `== nil`. This is not a bug and has no
version-gated fix — it is a permanent property of the language's interface
representation, and the only mitigation is discipline: a function returning an
interface type must explicitly return the untyped literal `nil`, never a
nil-valued concrete pointer coerced into the interface return type.

### 22. LLM package/API hallucination literature — gap

Searched specifically for a Go-focused study of LLM stdlib API hallucination,
pre-generics idiom suggestion, or outdated module-layout suggestion. Found only
general, multi-language package-hallucination papers
([arXiv:2406.10279](https://arxiv.org/html/2406.10279v2) "We Have a Package for
You!", [arXiv:2501.19012](https://arxiv.org/html/2501.19012v1) "Importing
Phantoms") that break results out by Python/JavaScript/Rust but not Go. This is a
genuine gap: no primary or secondary source quantifying Go-specific LLM failure
modes (e.g. suggesting `io/ioutil`, `sort.Slice`, or `github.com/pkg/errors` as if
current) was found in this pass. The frame's H1 hypothesis about where agent
mistakes cluster remains untested by literature — it would need to be tested
empirically (e.g. against this fleet's own past Go suggestions, if any exist) rather
than cited.

## Candidate topics

| Topic (question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|
| When does a function returning an interface with a nil concrete pointer break a caller's `== nil` check, and how does a reviewer spot the return site? | The single most-cited Go gotcha; permanent language property, no version fixes it | [Go FAQ](https://go.dev/doc/faq#nil_error) | no | errors/lang | P0 — universal, permanent, silent |
| Is the loop-variable-capture bug still live in a repo whose `go.mod` declares `go 1.22`+, and what's the residual risk in a mixed-version dependency tree? | Uber study: 48 of 879 Go-specific races were loop-var capture; fixed per-module, not per-repo | [go.dev/blog/loopvar-preview](https://go.dev/blog/loopvar-preview); [Uber PLDI'22](https://arxiv.org/html/2204.00764v2) | no | concurrency/lang | P1 — mostly fixed but version-conditional |
| When does `append` silently alias or silently reallocate a slice's backing array, and how does a reviewer tell which happened from the call site alone? | 391 of 879 Go-specific races traced to slice semantics — the single largest category | [Uber PLDI'22](https://arxiv.org/html/2204.00764v2); 100 Go Mistakes #69 | no | lang/concurrency | P0 — largest quantified race category |
| Does `go vet`'s copylock analyzer reliably catch a lock copied through an embedded struct, a generic type parameter, or an interface-boxing conversion, or only the direct assignment case? | Known historical gaps (golang/go#20261); "vet passed" is not "no copied lock" | [golang/tools copylock.go](https://github.com/golang/tools/blob/master/go/analysis/passes/copylock/copylock.go) | no | lint/concurrency | P1 — false confidence risk |
| When must a goroutine launched inside a library be owned by an errgroup/WaitGroup the caller can wait on, and how does a reviewer spot one that escapes ownership? | Direct instance of the exact topic shape requested; root cause behind both goroutine-leak studies | [CodeReviewComments — Goroutine Lifetimes](https://go.dev/wiki/CodeReviewComments); Uber LeakProf | no | concurrency/cli/sdk | P0 — the SDK's core discipline |
| Does `sync.WaitGroup.Go()` (1.25) fully replace the `Add()`-inside-goroutine anti-pattern, or does the old pattern still appear (and still race) in code targeting an older `go` directive? | Uber Observation 8: dynamic `Add()` placement races with `Wait()` | [go.dev/doc/go1.25](https://go.dev/doc/go1.25); [Uber PLDI'22](https://arxiv.org/html/2204.00764v2) | no | concurrency | P1 — version-conditional fix |
| Is `time.After` in a hot `select` loop still worth flagging post-1.23, given the leak is gone but the per-call allocation isn't? | 100 Go Mistakes #76; Go 1.23 changed the failure mode from "leak" to "cost" | [Go 1.23 release notes](https://go.dev/doc/go1.23) | no | perf/concurrency | P2 — real but downgraded severity |
| Does `testing/synctest`'s fake clock change what "goroutine leaked in a test" means for `goleak`, and does the corpus show any false-positive/negative interaction between the two? | Both are GA only since 1.25; interaction not covered in existing docs surveyed | [uber-go/goleak README](https://github.com/uber-go/goleak); [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | no | testing/concurrency | P2 — needs a dive, not just a citation |
| For a short-lived CLI process, does the Go 1.27 goroutine-leak profiler (`/debug/pprof/goroutineleak`) apply at all, or is it purely a long-running-server tool? | Fleet's Go CLIs are short-lived; fleet's Go SDK/daemons are not — the answer differs by artifact | [go.dev/blog/goroutine-leak-profiles](https://go.dev/blog/goroutine-leak-profiles) | no | toolchain/perf/cli | P1 — decides whether a skill needs this at all |
| When should a library deliberately wrap with `%v` (hiding an implementation-detail error type) instead of `%w` (preserving it for `errors.As`), and how does a rule state the default? | Kubernetes' own codebase is mid-migration on exactly this question, at project scale | [k8s/kubernetes#123234](https://github.com/kubernetes/kubernetes/issues/123234) | no | errors | P0 — biggest error-handling review objection with a paper trail |
| Does `errors.Join` (batch-operation error aggregation) preserve `errors.Is`/`errors.As` traversal through every joined error, and does a caller's naive `errors.As` silently only match the first? | Newer stdlib feature (1.20+), no failure-corpus source surveyed tests it under this lens | frame H2; needs a dive | partial | errors | P1 — needs a runnable check, not just a citation |
| Is `panic` ever legitimate in fleet library/SDK code, or only in `main`/CLI-boundary code, and what does 100 Go Mistakes' framing actually license vs. forbid? | #48 "Panicking"; directly informs the SDK's public-API contract | 100 Go Mistakes #48 | partial (rust-cargo/cli-contract sets the pattern in Rust) | errors/sdk | P1 |
| What's the correct pattern for checking a `Close()` error on a writable `os.File` without either discarding it or double-reporting an earlier write error? | #54 "Not handling defer errors"; #79 "not closing transient resources" | 100 Go Mistakes #54, #79 | no | errors/fs | P0 — direct data-loss risk, explicitly excluded from lazy simplification |
| Is an `http.Response.Body` that is `Close()`d but never drained (`io.Copy(io.Discard, ...)` first) actually a connection-reuse bug, and does the corpus show it recurring? | #79/#81; keep-alive pooling depends on draining, not just closing | 100 Go Mistakes #79, #81 | no | http/sdk | P0 — silent perf/connection-pool degradation |
| When does `json.Unmarshal` into `interface{}` silently turn a large integer into an imprecise `float64`, and what's the fix (`json.Number`, or typed structs)? | #77 "JSON handling common mistakes"; explicitly named in the corpus brief | 100 Go Mistakes #77 | no | stdlib | P0 — silent precision loss, common in CLI/SDK JSON handling |
| Does comparing two `time.Time` values with `==` break after a round-trip through serialization or a monotonic-reading-stripping operation, and what's the correct comparison (`.Equal`)? | #75 "wrong time duration" cluster; explicitly named in the corpus brief | 100 Go Mistakes #75 | no | stdlib | P0 — silent correctness bug, deterministic-output relevant |
| When is `gosec` G115 (integer-overflow-on-conversion) a real CWE-190 risk vs. a provably-safe false positive (e.g. `uint32(len(x))`), and how should a rule tell a reviewer which is which? | Multiple large projects (docker/cli, moby/moby) have open, unresolved issues on exactly this | [securego/gosec#1185](https://github.com/securego/gosec/issues/1185) | no | security/lint | P1 — contested enough to need explicit guidance |
| Do unkeyed struct literals across a module boundary silently break when the dependency adds/reorders a field, and does `go vet`'s composite-literal check catch every such case? | Named in corpus brief; classic "upgrade broke us silently" shape for a Go SDK's own consumers | frame brief; needs primary-source dive | no | lang/sdk | P1 — directly relevant to the OCX SDK's own public structs |
| Does init-order across multiple files/packages still produce real, reported bugs in 2026, or is this now mostly theoretical given `go vet`'s and linters' coverage? | #3 "Misusing init functions"; explicitly named | 100 Go Mistakes #3 | no | lang | P2 — real but lower incidence than concurrency/errors |
| Does calling `os.Exit` or `log.Fatal` from non-`main` library code skip caller-registered `defer`s in a way that has caused real incidents, and how should a rule detect it (which linter, which check ID)? | Named in the brief; directly relevant to CLI exit-code contract that mirrors ocx/grimoire | 100 Go Mistakes brief; CodeReviewComments (implicit) | partial (Rust cli-contract covers the exit-code side) | errors/cli | P0 — breaks the exact exit-code contract the fleet already commits to in Rust |
| Does building a SQL statement with `fmt.Sprintf` recur as a real finding in the exemplar corpus, or is it already fully displaced by parameterized queries and linters (`sqlclosecheck`, `execinquery`)? | Named in brief; needs grounding-wave measurement, not just citation | 100 Go Mistakes #78; golangci-lint linter roster | no | security | P1 — needs a grounding count against the 35-repo corpus |
| Does `staticcheck`'s new SA9010 (defer-of-a-function-that-returns-a-function) catch a real, previously-invisible bug shape, or is it mostly triggered by intentional patterns that need a `//lint:ignore`? | Brand-new (2026.2) check; no real-world incidence data surveyed yet | [dominikh/go-tools 2026.2 changelog](https://staticcheck.dev/changes/2026.2/) | no | lint | P1 — new enough to need a grounding-wave count |
| What is the minimum defensible default-enabled linter set for a from-scratch Go CLI/SDK repo, given golangci-lint v2's much larger opt-in roster (bodyclose, sqlclosecheck, gosec, etc. are not all on by default)? | Directly decides the `go-quality` rule's own default config | [golangci-lint CHANGELOG](https://github.com/golangci/golangci-lint/blob/master/CHANGELOG.md); `.golangci.reference.yml` | no | lint/toolchain | P0 — the rule set's central config decision |
| Where does `go vet`'s free, always-on analyzer set (`copylock`, `printf`, `shadow` is opt-in, `loopclosure`) stop, and what does staticcheck's paid-in-CI-time SA-series catch that vet doesn't? | Decides whether a Go rule can rely on `go vet` alone or must mandate staticcheck/golangci-lint | golang/tools passes source; staticcheck docs | no | lint/toolchain | P1 |
| Which idiom rewrites does `go fix`'s 1.26 modernizer set actually apply (e.g. `interface{}`→`any`, hand-rolled min/max→builtin), and can any of them silently change runtime behavior rather than just syntax? | H1 hypothesis (agent mistakes cluster on pre-1.21 idioms) needs a mechanized fix, not just a lint warning | frame H1; golangci-lint's `govet-modernize` linter | no | toolchain/lang | P1 — turns H1 into an automatable fix |
| Does `govulncheck`'s call-graph analysis produce meaningful false negatives for reflection-heavy code (plugin loading, dependency injection) of the kind a CLI framework (cobra, viper-style) uses? | Decides whether govulncheck alone is a sufficient security gate for the fleet's Go CLIs | frame brief; needs a dive against the exemplar corpus (cli/cli, spf13/cobra) | no | security/toolchain | P1 |
| Does Go 1.24's `os.Root`/`OpenRoot` fully close the zip-slip / path-traversal-on-extract class, or does an extractor still need to validate archive entry names as defense in depth? | Both halves (destination confinement vs. entry-name validation) are load-bearing and often conflated | [go.dev/blog/osroot](https://go.dev/blog/osroot); [GO-2025-3563](https://pkg.go.dev/vuln/GO-2025-3563) | no | security/fs | P0 — the fleet's own `ocx-mirror`/CLI tooling extracts archives |
| What's the idiomatic bound on `io.Copy` from a decompressing reader (gzip/zip) to prevent a decompression-bomb DoS, and does the exemplar corpus show it applied consistently? | Named in brief; needs a grounding count | frame brief | no | security/fs | P1 |
| Does Go's stdlib `regexp` (RE2-based) actually eliminate ReDoS risk for a rule that just says "use stdlib regexp," or are there still input-size/memory-limit caveats worth stating? | Corrects a common overclaim ("RE2 is just always fine") with the actual limits (memory bound on the compiled program, not just time) | [checkmarx ReDoS-in-Go](https://checkmarx.com/blog/redos-go/) | no | security/stdlib | P2 |
| Does the recent net/http CVE pattern (CVE-2025-22871 bare-LF smuggling, CVE-2023-29406 Host-header injection) mean a Go rule needs application-level defenses, or is "stay on a supported patch release" the complete mitigation? | Decides whether `go-modules`/`go-quality` needs security-specific HTTP guidance beyond version pinning | [CVE-2025-22871](https://www.sentinelone.com/vulnerability-database/cve-2025-22871/) | no | security/http | P1 |
| Is `GOMEMLIMIT`+`GOGC` tuning relevant to a short-lived CLI process at all, or does that advice apply only to the fleet's future long-running Go SDK/daemon consumers? | Corrects a blanket "always set GOMEMLIMIT" instinct against the fleet's actual CLI-shaped consumers | [go.dev/doc/gc-guide](https://go.dev/doc/gc-guide); Discord postmortem | no | perf/release | P1 — scope-limits a common piece of advice |
| Does the Discord GC-pause pattern (large live cache scanned every cycle) generalize to a concrete "smell" a reviewer can spot in a diff (e.g. an unbounded in-memory `map[string]*BigStruct` cache with no eviction), and is that smell already caught by any linter? | Turns a postmortem into an actionable review heuristic | [Discord: switching from Go to Rust](https://discord.com/blog/why-discord-is-switching-from-go-to-rust) | no | perf/concurrency | P2 |
| For a Go SDK doing IP/network work, does `net/netip`'s comparability and zero-allocation profile matter enough to mandate it over `net.IP` in the rule, or is it situational? | Directly informs the OCX-SDK-for-Go's networking surface | [Tailscale netaddr blog](https://tailscale.com/blog/netaddr-new-ip-type-for-go) | no | stdlib/sdk | P1 |
| Does the corpus show real bugs from relying on Go map iteration order in CLI output or JSON serialization, and which stdlib/lint mechanism (sorted-keys marshaling, `maps.Keys`+`sort`) is the idiomatic fix? | Named in brief; determinism directly matters to a CLI's output-stability contract | frame brief | partial (Rust cli-contract likely already states determinism) | cli/stdlib | P1 |
| Does the exemplar corpus's CLI tools (`ocx`/`grimoire`-analog repos: cli/cli, cobra, urfave/cli) show a consistent atomic-file-write pattern (temp file + rename), and does it match or diverge from the Rust `cli-contract` depth file's pattern? | Directly decides whether Go needs its own depth file section or can defer to the Rust contract by reference | frame brief; needs a grounding-wave dive | partial | cli/fs | P1 |
| What's the idiomatic multi-byte-safe way to index/slice a Go string (rune vs. byte boundary), and how does a reviewer spot an accidental byte-boundary slice that corrupts UTF-8 text? | Named in brief ("encoding and byte/rune handling"); 100 Go Mistakes #36/#37 | 100 Go Mistakes #36, #37 | no | lang/stdlib | P1 |
| Does the exemplar corpus show real Windows-path bugs (hardcoded `/`-separated literals, `path` vs. `path/filepath` confusion) in CLI tools meant to be cross-platform? | Named in brief; the fleet's Go CLIs are meant to mirror ocx/grimoire's cross-platform posture | frame brief; needs a grounding-wave count | no | fs/cli | P1 |
| Does a `GODEBUG` default-value flip between the two currently-supported releases (1.26, 1.27) change any observable behavior the fleet's Go code depends on, and should the rule pin/document a `GODEBUG` setting for stability? | Named in brief; directly affects reproducible CI behavior across the two-release support window | Go release notes (per-release GODEBUG changes); needs a dedicated dive | no | toolchain/release | P2 |
| What does staticcheck's `SA1019` (deprecated-API) currently flag as of the 2026.2 database update for Go 1.27, and does that list match or update the frame's H1 pre-1.21-idiom hypothesis? | Directly tests H1 with a mechanized, current source instead of assumption | [dominikh/go-tools 2026.2 changelog](https://staticcheck.dev/changes/2026.2/) | no | lint/toolchain | P1 — turns H1 into a checkable list |
| Does the ASPLOS'19 finding that channel/message-passing bugs are as common as shared-memory bugs change how a Go concurrency rule should weight "prefer channels" advice against "prefer mutexes for simple state" advice? | Directly contradicts a common simplification ("channels are always safer") with primary-source data | [ASPLOS'19 / Tu et al.](https://cseweb.ucsd.edu/~yiying/GoStudy-ASPLOS19.pdf) | no | concurrency | P0 — corrects a widely-assumed simplification |
| Does mixing a `select`-based cancellation path with a shared-memory write to the same struct (Uber's Observation 7) show up as a distinct, nameable review smell in the exemplar corpus, separate from plain missing-mutex bugs? | Needs a grounding-wave dive to confirm incidence, not just cite the paper | [Uber PLDI'22](https://arxiv.org/html/2204.00764v2) | no | concurrency | P2 |
| Is `errgroup.Group`'s first-error-cancels-context semantics ever the *wrong* choice for a fan-out operation that must collect every error rather than abort on the first (e.g. a batch validate/lint command)? | Directly relevant to CLI commands that process many files and must report every failure | frame brief (#73 "not using errgroup") | no | concurrency/cli | P1 |
| Does `context.Context` ever legitimately belong on a struct field in the exemplar corpus (an explicit CodeReviewComments violation), and if so under what documented exception? | Tests whether the "never on a struct" rule has real, accepted exceptions worth naming | [CodeReviewComments — Contexts](https://go.dev/wiki/CodeReviewComments) | no | concurrency/lang | P2 |
| No Go-specific study of LLM stdlib-API hallucination exists in the literature surveyed — should the map instead ground H1 empirically against this fleet's own agent output, or against a fresh, Go-specific probe? | Explicit corpus gap; H1 remains untested by any external source | search (negative result) | no | meta/H1 | P1 — decides whether H1 needs its own dedicated dive rather than a literature citation |

## Recent shifts seen in this corpus

- **Go 1.22 (Feb 2024)**: per-iteration loop-variable scoping, gated by the
  module's `go` directive. Invalidates "always capture the loop variable in a local
  before using it in a goroutine" as *mandatory* advice for 1.22+-declared modules
  (it becomes merely harmless-but-unnecessary), while the advice remains mandatory
  for anything on an older directive.
- **Go 1.23 (Aug 2024)**: unreferenced `Timer`/`Ticker` becomes GC-eligible without
  `Stop`. Downgrades "`time.After` in a loop leaks memory forever" to "`time.After`
  in a hot loop still costs an allocation per call" — the mistake survives, its
  severity does not.
- **Go 1.24 (Feb 2025)**: `os.Root`/`OpenRoot` (traversal-resistant file APIs) and
  the `tool` directive in `go.mod`. Gives a first-class stdlib answer to path
  traversal/symlink-escape that previously required hand-rolled `filepath.Clean`
  + prefix-check idioms (which are easy to get subtly wrong).
- **Go 1.25 (Aug 2025)**: `sync.WaitGroup.Go()` and GA `testing/synctest` (fake
  clock, deterministic concurrent-code testing). Corrects the frame's grouping of
  these under a single undated "generics era" bucket — they are specifically 1.25,
  one release after `os.Root`, and `testing/synctest` spent all of 1.24 as an
  experiment gated behind `GOEXPERIMENT=synctest`.
- **Go 1.26**: `go fix` modernizers (mechanized idiom rewrites), now wired into
  golangci-lint v2's `govet-modernize` linter rather than only available as a
  standalone `go fix -w` invocation.
- **Go 1.27 (Aug 2026, current)**: GA goroutine leak profiler
  (`runtime/pprof` `goroutineleak`), generic methods, `encoding/json/v2`-backed
  `encoding/json`, size-specialized small-object allocation. This is the newest
  production-facing concurrency-debugging capability in the corpus and post-dates
  every academic paper surveyed (both concurrency-bug studies predate it by 4-7
  years) — none of the literature could have accounted for it.
- **Toolchain, last ~2 months**: staticcheck 2026.2/v0.8.0 added SA9010 (deferred
  function that itself returns a function); golangci-lint v2.14.0 (2026-09-24)
  rolled forward gosec, revive, gocritic, staticcheck. Both are within the last two
  months of this research date, confirming the frame's era table without needing to
  assume it.

## Contested

- **Channels vs. mutexes for safety.** Common secondary-source framing ("use
  channels, they're safer") is directly contradicted by the ASPLOS'19 primary data:
  message-passing-caused blocking bugs were as common as or more common than
  shared-memory-caused ones in the studied corpus. Trend: newer treatments (Uber's
  2022 study, `errgroup`-based patterns) are moving toward "match the tool to the
  problem shape (ownership vs. broadcast vs. rendezvous), not a blanket preference,"
  and away from "channels first."
- **gosec G115.** Actively contested in the ecosystem right now (open issues in
  docker/cli, moby/moby, telegraf, elastic/cloud-on-k8s as of this research date) —
  some maintainers disable it wholesale for its false-positive rate on
  provably-safe length conversions; others keep it and eat the `//nolint` cost.
  No consensus yet; trend favors keeping it enabled but paired with an explicit
  `go-safecast`-style helper for the safe cases, rather than a blanket disable.
- **`time.After`'s severity.** Pre-1.23 material treats it as a hard memory-leak
  rule ("never use `time.After` in a loop"). Post-1.23 material downgrades it to a
  performance/allocation concern. Trend: the *leak* framing is now outdated for
  1.23+-targeted code; the *allocation-cost* framing is current and should replace
  it in any rule written or refreshed in 2026.
- **Whether Discord's postmortem is evidence against Go.** Secondary blog
  commentary sometimes over-generalizes it ("Go's GC makes it unsuitable for
  high-performance services"). The primary post itself scopes the finding to one
  cache-shaped hot path and a specific GC-scan cost; it does not generalize to "Go
  is unsuitable," and other large low-latency Go services (this corpus did not find
  a matching Cloudflare-attributed Go-specific postmortem despite searching) exist
  without the same failure mode.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [100go.co](https://100go.co/) | Companion site to "100 Go Mistakes" (Teiva Harsanyi) | Book 2022, site current | Only broad, numbered antipattern catalogue in the ecosystem; used to check era-currency of every entry |
| [go.dev/wiki/CodeReviewComments](https://go.dev/wiki/CodeReviewComments) | Go team's own accumulated review-comment wiki | Living document, Go team primary | The canonical source for "recurring review objections" |
| [arXiv:2204.00764 — A Study of Real-World Data Races in Golang](https://arxiv.org/html/2204.00764v2) | Uber PLDI 2022 paper (primary, full text) | 2022, PLDI | Only large-scale (46M LOC) quantified study of Go-specific race root causes |
| [Understanding Real-World Concurrency Bugs in Go (PDF)](https://cseweb.ucsd.edu/~yiying/GoStudy-ASPLOS19.pdf) | Tu et al., ASPLOS 2019 paper (primary) | 2019, ASPLOS | Only academic study contrasting blocking vs. non-blocking bug shapes with detector efficacy numbers |
| [the morning paper summary of the ASPLOS'19 study](https://blog.acolyer.org/2019/05/17/understanding-real-world-concurrency-bugs-in-go/) | Respected academic-paper-summary blog | 2019 | Used to extract structured numbers efficiently from the primary paper |
| [github.com/uber-go/goleak](https://github.com/uber-go/goleak) | Tool's own README (primary) | Living, Uber OSS | States goleak's actual API and its documented parallel-test limitation |
| [Uber Blog — LeakProf](https://www.uber.com/blog/leakprof-featherlight-in-production-goroutine-leak-detection/) | Company engineering blog (primary) | 2024-2025 | Production-scale goroutine-leak numbers and technique, complementary to goleak |
| [go.dev/blog/loopvar-preview](https://go.dev/blog/loopvar-preview) | Go team blog (primary) | Nov 2023, pre-1.22 | Authoritative mechanism description for the 1.22 loop-var fix |
| [go.dev/doc/go1.22](https://go.dev/doc/go1.22) | Official release notes (primary) | Feb 2024 | Confirms per-module gating of the loop-var semantics |
| [go.dev/doc/go1.24](https://go.dev/doc/go1.24) / [go.dev/blog/osroot](https://go.dev/blog/osroot) | Official release notes + Go team blog (primary) | Feb 2025 | `os.Root` mechanism and its kernel-level symlink-escape guarantee |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | Official release notes (primary) | Aug 2025 | Corrects the frame's version grouping for `WaitGroup.Go`/`synctest` GA |
| [go.dev/blog/go1.27](https://go.dev/blog/go1.27) / [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Go team blog + official release notes (primary) | Aug 2026, current | Confirms era hypothesis and the goroutine leak profiler's GA status |
| [go.dev/blog/goroutine-leak-profiles](https://go.dev/blog/goroutine-leak-profiles) | Go team blog (primary) | 2026 | Direct description of the new profiler's detection scope and false-positive claim |
| [kubernetes/kubernetes#123234](https://github.com/kubernetes/kubernetes/issues/123234) | Live GitHub issue in a major exemplar-corpus repo (primary) | Open, ongoing | Concrete, in-progress, project-scale instance of the %v-vs-%w review objection |
| [github.com/golang/tools — copylock.go](https://github.com/golang/tools/blob/master/go/analysis/passes/copylock/copylock.go) | Analyzer source (primary) | Living | Ground truth for exactly what `go vet`'s copylock check does and doesn't catch |
| [golang/go#20261](https://github.com/golang/go/issues/20261) | Go project issue tracker (primary) | 2017, still referenced | Documents a specific historical gap in copylock detection |
| [staticcheck.dev/changes/2026.2](https://staticcheck.dev/changes/2026.2/) — also read locally at `dominikh__go-tools@6cb65e58a558:website/content/changes/2026.2.md` | Tool's own release notes (primary) | Sep 2026, current | Confirms era hypothesis and the new SA9010 check |
| [golangci-lint CHANGELOG](https://github.com/golangci/golangci-lint/blob/master/CHANGELOG.md) — also read locally at `golangci__golangci-lint@032d962e0399:CHANGELOG.md` | Tool's own changelog (primary) | 2026-09-24, current | Confirms v2.14.0 era hypothesis and embedded linter versions |
| [securego/gosec#1185](https://github.com/securego/gosec/issues/1185) | Tool's own issue tracker (primary) | Open | Direct evidence of G115's contested false-positive status |
| [discord.com/blog — Why Discord is switching from Go to Rust](https://discord.com/blog/why-discord-is-switching-from-go-to-rust) | Company engineering blog (primary) | 2023 | The corpus's clearest quantified GC-pause production postmortem |
| [tailscale.com/blog/netaddr-new-ip-type-for-go](https://tailscale.com/blog/netaddr-new-ip-type-for-go) | Company engineering blog (primary) | 2021 | Rationale for `net/netip`, directly relevant to the future Go SDK's networking surface |
| [pkg.go.dev/vuln/GO-2025-3563](https://pkg.go.dev/vuln/GO-2025-3563) and [vuln.go.dev](https://vuln.go.dev/) | Official Go vulnerability database (primary) | 2025 | The zip-slip CWE-22 shape, sourced from the project's own DB |
| [CVE-2025-22871 detail (SentinelOne DB)](https://www.sentinelone.com/vulnerability-database/cve-2025-22871/) | Vulnerability database aggregator (secondary, cites primary Go security advisory) | 2025 | net/http request-smuggling CVE with version-range and fix precision |
| [checkmarx.com/blog/redos-go](https://checkmarx.com/blog/redos-go/) | Security vendor technical blog (secondary) | current | Clear, benchmarked explanation of why stdlib `regexp`/RE2 is ReDoS-immune |
| [arXiv:2406.10279 — We Have a Package for You!](https://arxiv.org/html/2406.10279v2) | USENIX Security 2025 paper (primary) | 2024-2025 | Checked for Go-specific LLM hallucination data; confirmed the gap (Go not broken out) |

---
title: Go canonical-guides topic map — spec, style, and design-doc corpus
corpus: canonical guides (go.dev/ref, go.dev/doc, go.dev/wiki, go.dev/blog since 2022, google.github.io/styleguide/go, go-proverbs.github.io)
agent: canonical-scout
model: sonnet
date_researched: 2026-09-26
sources_count: 34
scope: >
  Covers what the Go team's own normative and near-normative documents, the
  Google Go style guide's three parts, and the Go blog's practice-setting
  posts since 2022 say a Go program and its author should do. Does not cover
  linter/analyzer rosters (golangci-lint, staticcheck — a separate corpus),
  the exemplar corpus's actual practice (a separate grounding wave), or
  generic docs/CI/Bazel topics owned by the sibling lore rule sets.
---

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
   1. [The Go Language Specification](#1-the-go-language-specification)
   2. [Effective Go](#2-effective-go)
   3. [Go Code Review Comments (wiki)](#3-go-code-review-comments-wiki)
   4. [Go Test Comments (wiki)](#4-go-test-comments-wiki)
   5. [Google Go Style Guide — Guide](#5-google-go-style-guide--guide)
   6. [Google Go Style Guide — Decisions](#6-google-go-style-guide--decisions)
   7. [Google Go Style Guide — Best Practices](#7-google-go-style-guide--best-practices)
   8. [Go FAQ](#8-go-faq)
   9. [The Go Memory Model](#9-the-go-memory-model)
   10. [Go Doc Comments](#10-go-doc-comments)
   11. [Modules: layout, reference, release workflow, version numbering](#11-modules-layout-reference-release-workflow-version-numbering)
   12. [Go security best practices](#12-go-security-best-practices)
   13. [Go Fuzzing](#13-go-fuzzing)
   14. [Profile-guided optimization](#14-profile-guided-optimization)
   15. [Diagnostics](#15-diagnostics)
   16. [A Guide to the Go Garbage Collector](#16-a-guide-to-the-go-garbage-collector)
   17. [Data Race Detector](#17-data-race-detector)
   18. [Go Toolchains](#18-go-toolchains)
   19. [Go, backwards compatibility, and GODEBUG](#19-go-backwards-compatibility-and-godebug)
   20. [The Go blog, 2022 → 2026](#20-the-go-blog-2022--2026)
   21. [Go Proverbs](#21-go-proverbs)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- The Go team has made a **permanent, explicit decision (June 2025) not to add syntactic sugar for error handling** (`try`/`check`/`?`); `if err != nil` plus `%w` wrapping is the idiom for the foreseeable future — treat any rule expecting a future language change here as wrong.
- **Assertion libraries (testify-style `assert`/`require`) are rejected by every canonical source that discusses testing**: the Test Comments wiki, the Google style guide's Decisions doc, and the Go FAQ all give the same argument (stops the test early, hides what passed) and prefer stdlib `if`/`t.Errorf` plus `cmp.Diff`/`cmp.Equal`. This directly contradicts an ecosystem-popularity argument for testify.
- **Per-iteration loop variables (Go 1.22)** retire the classic `v := v` capture workaround for code whose `go.mod` declares `go 1.22` or later — but the workaround is still *required* for any file built under an older `go` directive, so this is a version-gated check, not a blanket one.
- **Go 1.24–1.27 added a cluster of concurrency/testing primitives that change idiomatic advice written before mid-2025**: `sync.WaitGroup.Go` (1.25, with a `go fix` modernizer `waitgroupgo`), `testing/synctest` (experimental in 1.24, GA in 1.25), an experimental goroutine-leak profiler (1.26), and the removal of the `asynctimerchan` GODEBUG opt-out in 1.27 (meaning the pre-1.23 `time.After`-in-a-loop leak is now permanently fixed, not just toggleable).
- **`context.Context` may never live on a struct field**, per the Google style guide, with exactly one documented exception (an interface signature outside your control that requires it). This is a strict rule with a narrow, named escape hatch.
- **Go 1.27 added generic methods** (a method may declare its own type parameters) — previously such logic had to be a package-level generic function. This is brand-new (August 2026) and will not appear in any code written before it.
- **`os.Root` (1.24)** is the canonical, spec-level defense against path-traversal attacks; code that still does `filepath.Join(trusted, userInput)` and opens the result is using the pre-1.24 idiom.
- **GOMAXPROCS became container-aware by default in Go 1.25** (cgroup CPU-bandwidth-based, periodically re-evaluated); a Go service that hand-tunes a worker pool off `runtime.NumCPU()` may now be double-counting or under-counting relative to the runtime's own default.
- **Reproducible-build stamping changed silently in Go 1.25**: `go build`'s VCS-metadata stamping (used by `debug.ReadBuildInfo`) is disabled by default when multiple VCS systems are detected in the tree, as a supply-chain-injection defense (`GODEBUG=allowmultiplevcs=1` reverts it) — this can silently blank out version info in `go version -m` for a build that used to have it.
- **The `go` directive became a mandatory minimum-version gate in Go 1.21** (previously advisory only); the `toolchain` directive is a separate, optional suggestion consumed by `GOTOOLCHAIN=auto`. Confusing the two is a common modules mistake.
- **The `tool` directive (1.24)** replaces the blank-import-in-a-`tools.go`-file convention for pinning dev-tool versions in `go.mod`; it is the mechanism the fleet's future Go repos should use to pin `staticcheck`/`golangci-lint`/etc.
- **`errors.AsType` (1.26)** is a generic, type-safe replacement for the classic `var target *MyErr; errors.As(err, &target)` two-step; the older form is not deprecated but is now the verbose path.
- **`%w` placement in an error string is directional**: place it at the end for a general wrapped error (so the printed chain reads newest-to-oldest, matching `Unwrap()`'s traversal order), but place it at the *front* for a sentinel error, so the category is the first thing a reader sees. Both are Google-style-guide positions, not language rules — a linter cannot enforce either, only a reviewer or a documented convention can.
- **Effective Go explicitly disclaims covering generics or modules** — it is a 2009-era style document that Go's own site says is not actively maintained past core-language style; nothing in it should be cited as covering post-2009 features without cross-checking the spec or a newer doc.
- **The Go memory model is dated "June 6, 2022" and has not been revised since** despite three-plus years of stdlib and runtime changes; it remains the sole normative source for what synchronization guarantees what.
- **`go test` runs the `stdversion` vet check by default as of Go 1.27**, flagging stdlib symbols too new for the file's effective `go` version — this is a free, already-shipping guard against "used a 1.24 API in a `go 1.21` module" mistakes.
- **`go fix` was completely rewritten in Go 1.26** into a modernizer + source-level-inliner framework, explicitly pitched as infrastructure for "self-service" organization-specific modernizers — a strong candidate mechanism for the fleet's own future Go rule enforcement.
- **Map iteration order is unspecified by the language**, and no canonical source in this corpus asserts otherwise; any Go program that produces deterministic output (golden files, CLI text, hashes) must sort map keys explicitly before iterating.
- **The race detector's own documentation states a 5–10x memory and 2–20x execution-time overhead** — a concrete, citable number for deciding when `-race` runs in CI versus only on a nightly/soak job.
- **Swiss-table maps became the default map implementation in Go 1.24** (opt-out `GOEXPERIMENT=noswissmap`), and the Green Tea garbage collector became the default in Go 1.26 (opt-out `GOEXPERIMENT=nogreenteagc`) — both are runtime-internal changes with no source-code migration required, but a project's `GOEXPERIMENT` pins in CI/Docker need to be revisited so they don't accidentally re-enable a superseded opt-in or hold onto a stale opt-out.

## Survey

### 1. The Go Language Specification

<https://go.dev/ref/spec> (Language version go1.27, dated May 26, 2026 in the fetched copy).

The spec is organized as one continuous document (Introduction → Lexical elements → Constants/Variables/Types → Properties of types and values → Blocks/Declarations/Expressions/Statements → Built-in functions → Packages → Program initialization → Errors → Run-time panics → System considerations → **Appendix: Language versions**). The appendix is the authoritative, versioned list of every spec-level change since Go 1.9, and it is the fastest way to check "is this a language feature or a library feature." Its most recent entries:

- **Go 1.21**: predeclared `min`, `max`, `clear`; type inference improvements (interface-method-based inference, inference through variable assignment).
- **Go 1.22**: per-iteration `for` loop variables; `for range` over an integer.
- **Go 1.23**: `for range` accepts an iterator function (`iter.Seq`/`iter.Seq2`) as the range expression.
- **Go 1.24**: an alias declaration may declare type parameters (generic type aliases).
- **Go 1.27**: function type inference applies in *all* assignment contexts involving functions; **a method declaration may declare type parameters** (generic methods); a struct composite literal's key may be any valid field selector, not only a top-level field name.

Note the gap: **no spec-level language changes are recorded for Go 1.25 or Go 1.26** — those releases were runtime/stdlib/tooling releases only, which matters when scoping "language" versus "ecosystem" rule content.

### 2. Effective Go

<https://go.dev/doc/effective_go>

Carries an explicit, prominent disclaimer: *"This document was written for Go's release in 2009 and is not actively updated. […] it does not cover significant changes to the language (generics), ecosystem (modules), or libraries added since."* Sections: Formatting, Commentary, Names (package names, getters, interface names, MixedCaps), Control structures (if/for/switch/type switch), Functions (multiple returns, named results, defer), Data (new/make, arrays/slices/maps, printing, append), Initialization, Methods, Interfaces and other types, the blank identifier, Embedding, Concurrency (share-by-communicating, goroutines, channels, a leaky-buffer example), Errors (panic/recover), and a worked web-server example. The pre-generics, pre-modules content (naming, formatting, defer, interfaces, concurrency-by-communicating) is still the working idiom; anything about project layout or dependency management must come from newer docs instead.

### 3. Go Code Review Comments (wiki)

<https://go.dev/wiki/CodeReviewComments>

An alphabetized checklist Go reviewers cite by section anchor. Notable entries beyond the obvious (Gofmt, Mixed Caps, Naked Returns): **Goroutine Lifetimes** ("make it clear when — or whether - [goroutines] exit… try to keep concurrent code simple enough that goroutine lifetimes are obvious"); **In-Band Errors** (prefer an extra `(value, ok)`/`(value, error)` return over a sentinel in-band value like `-1` or `""`, because the compiler can then catch a caller who forgot to check); **Interfaces** ("Go interfaces generally belong in the package that uses values of the interface type, not the package that implements those values… Do not define interfaces before they are used"); **Indent Error Flow** (keep the happy path at minimal indentation).

### 4. Go Test Comments (wiki)

<https://go.dev/wiki/TestComments>

**Assert Libraries**: explicitly tells authors to avoid `assert.*`-style helpers, with a worked "bad" example (`assert.IsNotNil`, `assert.StringEq`, …) rewritten as a single `if`+`t.Errorf`. Also: **Mark Test Helpers** (`t.Helper()`, with the caveat "should not be used to implement assert libraries"); **Print Diffs** (use `cmp` and print "diff -want +got" so the `-`/`+` in the format string matches `cmp`'s own diff markers); **Choose Human-Readable Subtest Names** (the test runner replaces spaces with underscores and escapes non-printing characters); **Table-Driven Tests vs Multiple Test Functions**; **Test Error Semantics**.

### 5. Google Go Style Guide — Guide

<https://raw.githubusercontent.com/google/styleguide/gh-pages/go/guide.md> (rendered at google.github.io/styleguide/go/guide)

The **normative and canonical** core document. Style principles in priority order: **Clarity > Simplicity > Concision > Maintainability > Consistency**, each with sub-sections ("What is the code actually doing?", "Why is the code doing what it does?", **Least mechanism** under Simplicity). Core guidelines: Formatting (defer to gofmt), MixedCaps, Line length ("Go has no strict line length limit… If a line feels too long, [restructure] rather than reflow"), Naming, Local consistency.

### 6. Google Go Style Guide — Decisions

<https://raw.githubusercontent.com/google/styleguide/gh-pages/go/decisions.md>

**Normative but not canonical** — unifies and explains style decisions. Exhaustive; sections most load-bearing for a rule set: **Contexts** (`context.Context` always first parameter; never a struct field except when an external interface forces it; use `(testing.TB).Context()` in tests, not `context.Background()`, since Go 1.24); **Errors → Returning errors / Error strings / Handle errors / In-band errors / Indent error flow**; **Generics** ("Do not use generics just because you are implementing an algorithm… that does not care about the type of its member elements… Do not use generics to invent domain-specific languages… refrain from introducing error-handling frameworks"); **Use any** ("Go 1.18 introduces an `any` type as an alias to `interface{}`… Prefer to use `any` in new code."); **Type aliases** ("rare; their primary use is to aid migrating packages… Don't use type aliasing when it is not needed."); **Assertion libraries** ("Do not create 'assertion libraries' as helpers for testing," with the same worked bad-example as the wiki, plus the good-example rewrite using `cmp.Equal`); **Goroutine lifetimes**, **Pass values**, **Receiver type**, **Logging** (Google's internal `log`/`glog` variant — explicitly *not* `log/slog`, a Google-internal bias to flag when translating this guidance for open-source Go).

### 7. Google Go Style Guide — Best Practices

<https://raw.githubusercontent.com/google/styleguide/gh-pages/go/best-practices.md>

**Neither normative nor canonical** — "how to best apply the style guide." Longest and most concrete of the three documents. Sections of note: **Error handling → Error structure, Adding information to errors, Placement of `%w` in errors** (with a worked mermaid diagram of error-chain direction and three explicit good/bad examples proving that `%w` placement changes whether the printed chain reads newest-to-oldest, oldest-to-newest, or neither) **→ Sentinel error placement** (the one exception: put `%w` at the *front* for a sentinel, so the category is legible first); **Global state** (litmus test: does removing a piece of package-level state ever require changing every caller's test setup? then it shouldn't be global); **Function argument lists → Option structure, Variadic options**; **Tests → Leave testing to the `Test` function, Use real transports, `t.Error` vs `t.Fatal`, Error handling in test helpers, Don't call `t.Fatal` from separate goroutines** (a `t.Fatal` in a non-test goroutine doesn't fail the test the way it looks like it should — it calls `runtime.Goexit` in that goroutine only); **Interfaces → Avoid unnecessary interfaces, Interface ownership and visibility**.

### 8. Go FAQ

<https://go.dev/doc/faq>

Sections: Origins, Usage, Design, (Types/Generics, Values, Concurrency, Functions and Methods, Control flow, Pointers and Allocation, more). Direct, quotable rationale entries: **"Why does Go not have assertions?"** ("programmers use them as a crutch to avoid thinking about proper error handling… Proper error reporting means that errors are direct and to the point"); **"Where is my favorite helper function for testing?"** (explicitly extends the no-assertions argument to test `assert` helpers, with the "isPrime gives the wrong answer for 2, 3, 5, and 7" keep-going argument); **"When did Go get generic types?"** (1.18) and **"Why was Go initially released without generic types?"** (deliberate simplicity trade-off, not an oversight).

### 9. The Go Memory Model

<https://go.dev/ref/mem> — **"Version of June 6, 2022"**, unrevised since.

Sections: Introduction/Advice/Informal Overview, Memory Model, Implementation Restrictions for Programs Containing Data Races, Synchronization (Initialization, Goroutine creation, Goroutine destruction, Channel communication, Locks, Once, Atomic Values, Finalizers, Additional Mechanisms), Incorrect synchronization, Incorrect compilation, Conclusion. The **Advice** section is the single line most worth quoting in a rule: programs that "explicitly signal synchronization" using channels or `sync`/`sync/atomic` are correct; the rest of the document is for people implementing synchronization primitives or debugging genuinely subtle code. Every escape hatch listed (goroutine creation happens-before, channel send/receive pairs, `sync.Once.Do`, mutex unlock-before-next-lock) is exhaustive — there is no "usually fine" middle ground for data races, only defined synchronization edges.

### 10. Go Doc Comments

<https://go.dev/doc/comment>

Sections: Packages, Commands, Types, Funcs, Consts, Vars, then a **Syntax** reference (Paragraphs, Notes, Deprecations, Headings, Links, Doc links, Lists, Code blocks, Directives), and **Common mistakes and pitfalls**. Concrete, checkable conventions: a package doc comment begins `Package foo …` immediately before the `package` clause; a **Deprecation notice** is a paragraph beginning exactly `Deprecated: ` (capital D, colon, space) — tooling (`go vet`, IDEs, pkg.go.dev) keys off that exact prefix; **Doc links** use the `[Name]` / `[pkg.Name]` bracket syntax rendered as a hyperlink on pkg.go.dev, distinct from a Markdown link.

### 11. Modules: layout, reference, release workflow, version numbering

<https://go.dev/doc/modules/layout>, <https://go.dev/ref/mod>, <https://go.dev/doc/modules/release-workflow>, <https://go.dev/doc/modules/version-numbers>

Layout doc walks seven shapes (basic package, basic command, package-or-command-with-supporting-packages, multiple packages, multiple commands, packages-and-commands-in-the-same-repo, server project) — this is the canonical answer to "where do `internal/`, `cmd/`, and package code go in a Go repo," directly relevant to the fleet's future Go SDK and CLI layout. The **Modules Reference** is exhaustive on `go.mod`/`go.work` grammar; load-bearing directives: **`go` directive** (mandatory minimum version since 1.21; before that, advisory only — a compiler now *refuses* to build a module declaring a newer Go than the running toolchain); **`toolchain` directive** (a suggested toolchain, consumed by `GOTOOLCHAIN=auto`/`+auto`, cannot be older than the `go` directive's version); **`tool` directive** (since 1.24 — adds a package as both a dependency and a `go tool`-runnable command, replacing the blank-import-in-`tools.go`convention); **`retract` directive** (marks a published version as one nobody should select via MVS); Minimal Version Selection (MVS) and Module graph pruning/Lazy module loading (both gated by the `go 1.17`+ directive). The release-workflow doc gives the exact, ordered steps for publishing a breaking (major-version, `/v2`-suffix) change versus a bug fix versus a first unstable/stable release; version-numbers doc defines pseudo-versions' exact syntax (`vX.0.0-yyyymmddhhmmss-abcdefabcdef`).

### 12. Go security best practices

<https://go.dev/doc/security/best-practices>

Six short, imperative sections: scan with `govulncheck` (integrable via `-json` and an official GitHub Action); keep Go and dependencies current (the Go team ships point releases specifically for security fixes; review each dependency update rather than blindly bumping, citing the npm "colors" supply-chain incident as the cautionary case); fuzz to find edge-case exploits; use `-race`; use `go vet ./...`; subscribe to golang-announce.

### 13. Go Fuzzing

<https://go.dev/doc/security/fuzz>

Sections: Overview, Writing fuzz tests (Requirements: a `func FuzzXxx(f *testing.F)` in a `_test.go` file; Suggestions), Running fuzz tests (`go test -fuzz=FuzzXxx`, command-line output, failing-input reproduction, custom settings like `-fuzztime`), **Corpus file format** (seed corpus lives under `testdata/fuzz/FuzzXxx/`, one file per interesting input, each with a `go test fuzz v1` header line followed by typed Go literal encodings of each fuzz argument), Resources, Glossary.

### 14. Profile-guided optimization

<https://go.dev/doc/pgo>

Overview → Collecting profiles → Building with PGO (`go build` auto-detects a `default.pgo` file in the main package's directory and uses it without flags, since Go 1.21) → Notes (Collecting representative profiles from production, Merging profiles, AutoFDO, **Source stability and refactoring** — a profile drifts out of representativeness as the source changes, so PGO needs periodic profile refresh, not a one-time capture — Performance of new code, i.e. code added after profile capture gets no PGO benefit until re-profiled) → FAQ (stdlib packages are not currently optimizable via a caller's PGO profile; dependent-module code is; using an unrepresentative profile will not make a program *slower* than no PGO, only fail to help; build-time and binary-size cost of enabling PGO).

### 15. Diagnostics

<https://go.dev/doc/diagnostics>

Sections: Introduction, Profiling, Tracing, Debugging, **Runtime statistics and events** (`runtime.ReadMemStats`, `debug.ReadGCStats`, `debug.Stack`, `debug.WriteHeapDump`, `runtime.NumGoroutine` — each with a one-line "useful for" note) → **Execution tracer** (captures scheduling/syscall/GC/heap events; good for latency and parallelism problems, explicitly *not* good for hotspot/CPU-usage analysis — use profiling for that) → **GODEBUG** event knobs (`gctrace=1`, `inittrace=1`, `schedtrace=X`, and more, each toggling a specific line of runtime-emitted diagnostic text).

### 16. A Guide to the Go Garbage Collector

<https://go.dev/doc/gc-guide>

The deepest single document in the corpus. Introduction → Where Go values live / Tracing GC → **The GC cycle** (Understanding costs, **GOGC**, **Memory limit** with Suggested uses, **Latency** — "reducing GC frequency may also lead to latency improvements," five enumerated latency sources: stop-the-world mark/sweep transition pauses, GC's 25%-of-CPU mark-phase share, GC-assist stalls under high allocation rate, pointer-write barrier cost during marking, goroutine-stop-the-world for root scanning) → **Finalizers, cleanups, and weak pointers** (General advice: write unit tests for cleanup/finalizer-dependent code; Common cleanup issues / Common weak pointer issues / Common finalizer issues as three separate, named pitfall lists; **`runtime.AddCleanup`** is the modern replacement for **`runtime.SetFinalizer`**, and `weak.Pointer` is the modern replacement for a hand-rolled interning map) → A note about virtual memory → **Optimization guide** (Identifying costs, Eliminating heap allocations via heap profiling and escape analysis, implementation-specific optimizations, Linux transparent huge pages).

### 17. Data Race Detector

<https://go.dev/doc/articles/race_detector>

Introduction/Usage/Report Format/Options/Excluding Tests/How To Use, then four **Typical Data Races** worked examples (race on loop counter, accidentally shared variable, unprotected global variable, primitive unprotected variable, unsynchronized send-and-close), then **Requirements** (needs cgo and a C compiler; on Windows specifically needs mingw-w64 ≥ v8) and **Runtime Overhead** — the exact, citable numbers: **memory usage may increase 5–10×, execution time 2–20×**, plus a specific known issue (an extra 8 bytes leaked per `defer`/`recover` under `-race`, not reclaimed until goroutine exit, invisible to `runtime.ReadMemStats`).

### 18. Go Toolchains

<https://go.dev/doc/toolchain>

Introduction → Go versions → Go toolchain names → Module and workspace configuration → **The `GOTOOLCHAIN` setting** (resolution order: process env → `go env -w` user default → bundled `$GOROOT/go.env` default, which ships `GOTOOLCHAIN=auto`) → **Go toolchain selection** (`<name>`, `<name>+auto`, `<name>+path`; `auto` is shorthand for `local+auto`) → Go toolchain switches → Downloading toolchains → Managing Go version module/workspace requirements with `go get`/`go work`. `GODEBUG=toolchaintrace=1` (since Go 1.24) traces the selection decision.

### 19. Go, backwards compatibility, and GODEBUG

<https://go.dev/doc/godebug>

Introduction (the Go 1 compatibility promise, and `GODEBUG` as its escape valve for a *behavior* change, as opposed to an API change) → Default GODEBUG Values → **GODEBUG History**, itemized per release back to Go 1.5. The most recent three releases are the densest and most load-bearing for a "what changed under me" rule:
- **Go 1.27**: removed `gotypesalias`, `tlsunsafeekm`, `tlsrsakex`, `tls3des`, `tls10server`, `x509keypairleaf`, and **`asynctimerchan`** (all now permanently the new behavior, no opt-out); added `htmlmetacontenturlescape` (backported to 1.25.8/1.26.1, content-injection defense) and `fips140ems`; changed `tracebacklabels` default to `1`.
- **Go 1.26**: added `httpcookiemaxnum` (default 3000, DoS defense, backported to 1.25.2/1.24.8), `urlmaxqueryparams` (default 10000, backported to 1.25.6/1.24.12), `urlstrictcolons` (rejects malformed hosts like `http://localhost:1:2`), `tracebacklabels`, `cryptocustomrand`.
- **Go 1.25**: added `decoratemappings`, `embedfollowsymlinks`, **`containermaxprocs`** (default 1 — cgroup-aware GOMAXPROCS) and `updatemaxprocs` (default 1 — periodic re-evaluation), disabled TLS 1.2 SHA-1 by default, and **disabled VCS build-stamping by default when multiple VCS systems are detected** (`allowmultiplevcs=1` reverts; backported to 1.24.5/1.23.11).

### 20. The Go blog, 2022 → 2026

<https://go.dev/blog/all> — 88 posts from 2022-04-14 (survey2022) through 2026-09-24 (simd-experiment) were enumerated. The posts that set current practice, each fetched and read in full:

- **[Error handling: `[ On | No ] syntactic support for error handling`](https://go.dev/blog/error-syntax)** (3 June 2025) — the Go team's own retrospective on `check`/`handle` (2018) and `try` (2019), closing with a pragmatic decision to **stop pursuing a language change for error handling for the foreseeable future**, while pointing at `cmp.Or` for combining several independent errors into one check.
- **[Range Over Function Types](https://go.dev/blog/range-functions)** (20 August 2024) — the design and use of `iter.Seq`/`iter.Seq2` iterators, stabilized in Go 1.23.
- **[What's in an (Alias) Name?](https://go.dev/blog/alias-names)** (17 September 2024) — generic type aliases (1.24) as the mechanism for incremental cross-package refactors (move a declaration, leave a forwarding alias, delete the old one once callers migrate).
- **[Structured Logging with slog](https://go.dev/blog/slog)** (22 August 2023) — introduces `log/slog`, its `Handler` interface, and structured key-value logging as the stdlib answer to zap/zerolog.
- **[Fixing For Loops in Go 1.22](https://go.dev/blog/loopvar-preview)** (19 September 2023) — the per-iteration loop-variable change and its migration story.
- **[Telemetry in Go 1.23 and beyond](https://go.dev/blog/gotelemetry)** (3 September 2024) — opt-in telemetry (`go telemetry on`/`off`/`local`), local-only by default.
- **[Traversal-resistant file APIs](https://go.dev/blog/osroot)** (12 March 2025) — `os.Root` (1.24) as the structural defense against path-traversal.
- **[Testing concurrent code with testing/synctest](https://go.dev/blog/synctest)** (19 February 2025) — virtualized-time "bubbles" for deterministic concurrency tests; experimental in 1.24 (`GOEXPERIMENT=synctest`), graduated to general availability with a slightly changed API in 1.25 (old API removed in 1.26).
- **[A new experimental Go API for JSON](https://go.dev/blog/jsonv2-exp)** (9 September 2025) — `encoding/json/v2` and `encoding/json/jsontext`, still experimental as of this reading.
- **[The Green Tea Garbage Collector](https://go.dev/blog/greenteagc)** (29 October 2025) — experimental in 1.25 (10–40% GC-time reduction on some workloads), **became the default in 1.26** (`GOEXPERIMENT=nogreenteagc` to opt out).
- **[Using go fix to modernize Go code](https://go.dev/blog/gofix)** and **[//go:fix inline and the source-level inliner](https://go.dev/blog/inliner)** (17 February 2026 / 10 March 2026) — the Go 1.26 rewrite of `go fix` into a modernizer suite plus a "self-service" source-level inliner any package author can drive with a `//go:fix inline` directive.
- **[Container-aware GOMAXPROCS](https://go.dev/blog/container-aware-gomaxprocs)** (20 August 2025) — the mechanics behind the 1.25 GOMAXPROCS default change.
- **[Faster Go maps with Swiss Tables](https://go.dev/blog/swisstable)** (26 February 2025, describing a Go 1.24 change) — the new default map implementation.
- **[Goroutine Leak Profiles](https://go.dev/blog/goroutine-leak-profiles)** (2 September 2026) — an experimental (1.26) leak profiler distinct from `goleak` and `synctest`, aimed at production leak detection rather than test-time assertion.
- **[More predictable benchmarking with testing.B.Loop](https://go.dev/blog/testing-b-loop)** (2 April 2025) — `b.Loop()` (1.24) replacing the `for i := 0; i < b.N; i++` idiom, fixing compiler-optimization and setup-cost pitfalls in the old form.

Other posts enumerated but not load-bearing for this program (surveys, anniversary posts, `generic-methods`/`generic-interfaces`/`type-inference`/`comparable`/`when-generics` deep-dives already summarized via the spec and FAQ, `deadcode`, `govulncheck`, `vuln`, `supply-chain`, `rebuild` — folded into the security/toolchain candidates below without a separate subsection here).

### 21. Go Proverbs

<https://go-proverbs.github.io/>

19 one-line proverbs from Rob Pike's 2015 Gopherfest talk (last updated when he next gives the talk — no revision date). Full list captured: *Don't communicate by sharing memory, share memory by communicating. Concurrency is not parallelism. Channels orchestrate; mutexes serialize. The bigger the interface, the weaker the abstraction. Make the zero value useful. interface{} says nothing. Gofmt's style is no one's favorite, yet gofmt is everyone's favorite. A little copying is better than a little dependency. Syscall must always be guarded with build tags. Cgo must always be guarded with build tags. Cgo is not Go. With the unsafe package there are no guarantees. Clear is better than clever. Reflection is never clear. Errors are values. Don't just check errors, handle them gracefully. Design the architecture, name the components, document the details. Documentation is for users. Don't panic.*

## Candidate topics

| Topic (question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|
| Does a `go.mod` declaring `go 1.22`+ still need the `v := v` loop-variable-capture workaround before spawning a goroutine inside a `for` loop? | Directly tests H1's premise; version-gated, grep-checkable against the `go` directive | [spec appendix](https://go.dev/ref/spec#Language_versions) / [loopvar-preview](https://go.dev/blog/loopvar-preview) | no | lang/concurrency | P0 — wrong-version advice actively misleads |
| Should new/reviewed Go code use `any` or `interface{}`? | Explicit "prefer `any` in new code" from the style guide since 1.18; trivially greppable | [Style Decisions §Use any](https://google.github.io/styleguide/go/decisions#use-any) | no | lang | P1 — mechanical, high volume |
| When must a Go CLI/library reject testify-style `assert`/`require` in favor of stdlib `if`+`t.Errorf`+`cmp`? | Three independent canonical sources reject assertion libraries; directly falsifies the ecosystem-popularity argument for testify (H5) | [Test Comments](https://go.dev/wiki/TestComments#assert-libraries), [Style Decisions](https://google.github.io/styleguide/go/decisions#assertion-libraries), [FAQ](https://go.dev/doc/faq#testing_framework) | no | testing | P0 — resolves H5's stated tension |
| Where does `errors.Is`/`errors.As` need to replace `==` comparison or a type assertion on an error? | Core error-handling correctness surface (H2); `errors.AsType` (1.26) is now the terser form | [spec §Errors](https://go.dev/ref/spec#Errors), [go1.26 stdlib §errors](https://go.dev/doc/go1.26#minor_library_changes) | no | errors | P0 |
| Should `%w` go at the end of an error string, or at the front for a sentinel error? | Concrete, cited, and non-obvious: placement changes whether the printed chain reads newest→oldest, oldest→newest, or neither | [Best Practices §Placement of %w](https://google.github.io/styleguide/go/best-practices#error-percent-w) | no | errors | P1 — not lint-checkable, reviewer-only |
| When is `errors.Join` the right way to report several independent failures (e.g. primary error + Close error) instead of dropping one? | Ties directly into "resource cleanup and Close errors" boring-but-bites category | [spec §Errors](https://go.dev/ref/spec#Errors), [error-syntax](https://go.dev/blog/error-syntax) (`cmp.Or` alternative) | no | errors | P0 |
| Must a goroutine spawned inside a library function be owned by an `errgroup.Group`/`sync.WaitGroup` the caller can wait on — and does `sync.WaitGroup.Go` (1.25) change the idiom? | The core of H3; new stdlib method plus a `go fix` modernizer (`waitgroupgo`) that rewrites the old pattern | [Code Review Comments §Goroutine Lifetimes](https://go.dev/wiki/CodeReviewComments#goroutine-lifetimes), [go1.25 stdlib](https://go.dev/doc/go1.25#minor_library_changes), [go1.27 §go fix](https://go.dev/doc/go1.27#go-command) | no | concurrency | P0 |
| Does `testing/synctest` (GA since 1.25) need to replace real-`time.Sleep` based tests of concurrent code? | New primitive purpose-built to remove flakiness from timing-dependent tests | [synctest blog](https://go.dev/blog/synctest), [go1.25 stdlib](https://go.dev/doc/go1.25#minor_library_changes) | no | testing/concurrency | P0 |
| Is the classic "store the `*time.Timer`, `Stop()` and drain it" workaround for `time.After`-in-a-loop leaks still needed once a module's `go` directive is 1.23+? | Directly refines H3: the leak was closed by default via `asynctimerchan`, made permanent (opt-out removed) in 1.27 | [GODEBUG history §1.27](https://go.dev/doc/godebug#go-1-27) | no | concurrency/perf | P1 — version-gated correction to received wisdom |
| When is the new (1.26, experimental) goroutine-leak profiler the right tool versus `goleak` versus `synctest`? | Distinct detection tools for distinct lifecycles (production vs. test-time) | [goroutine-leak-profiles](https://go.dev/blog/goroutine-leak-profiles) | no | concurrency/perf | P2 — experimental, worth flagging not yet mandating |
| May `context.Context` ever be stored as a struct field? | Strict rule with one narrow, named exception (an external interface signature) | [Style Decisions §Contexts](https://google.github.io/styleguide/go/decisions#contexts) | no | concurrency/api-design | P0 — exact rule, common violation |
| In a test, should `(testing.TB).Context()` (1.24) or `context.Background()` supply the base context? | Small, mechanical, version-gated | [Style Decisions §Contexts](https://google.github.io/styleguide/go/decisions#contexts) | no | testing | P2 |
| Does a method now need generic type parameters of its own, and where does an older package-level generic function stand in for what a 1.27 generic method could now express directly? | Go 1.27 generic methods are brand-new; nothing written before August 2026 uses them | [spec §Method declarations / Go 1.27](https://go.dev/ref/spec#Method_declarations), [go1.27 §language](https://go.dev/doc/go1.27#language) | no | lang | P1 — new-feature awareness, low urgency until adopted |
| When does a generic (parameterized) type alias (1.24) replace a pre-1.24 workaround for a generic re-export? | Version-gated correctness of "how do I alias a generic type" advice | [go1.24 §language](https://go.dev/doc/go1.24#language), [alias-names](https://go.dev/blog/alias-names) | no | lang | P2 |
| Is a plain type alias (`type T1 = T2`) being used for something other than a migration shim? | "Rare; primary use is migration… don't use type aliasing when it is not needed" | [Style Decisions §Type aliases](https://google.github.io/styleguide/go/decisions#type-aliases) | no | lang | P2 |
| Does `new(expr)` (1.26) replace a helper function or a local-variable-then-address-of idiom for populating an optional pointer field? | New, mechanical simplification opportunity | [go1.26 §language](https://go.dev/doc/go1.26#language) | no | lang | P2 |
| Does the code use generics to build a testing/assertion DSL, or a domain-specific "framework" instead of ordinary control flow? | Explicit anti-pattern named by the style guide, tying generics misuse to the assertion-library anti-pattern | [Style Decisions §Generics](https://google.github.io/styleguide/go/decisions#generics) | no | lang/testing | P1 |
| Should Go interfaces be declared in the consumer package or the producer package, and are they declared before a second real implementation exists? | Two independent, explicit rules (ownership + "don't define before used") that both directly contradict a Java/C#-style "define the interface first" habit | [Code Review Comments §Interfaces](https://go.dev/wiki/CodeReviewComments#interfaces) | no | api-design | P0 — common pre-Go-idiom mistake (H1) |
| Is a package-level (global) mutable variable used to hold state a library's clients all share, instead of an explicit instance the client constructs? | Named litmus test ("would removing this global break every caller's test setup?") | [Best Practices §Global state](https://google.github.io/styleguide/go/best-practices#global-state) | no | api-design | P1 |
| Does an exported function's argument list use a functional-options pattern where a plain struct (or vice versa) would be simpler? | Two named, contrasted patterns with explicit tradeoffs | [Best Practices §Function argument lists](https://google.github.io/styleguide/go/best-practices#san-function-argument-lists) | no | api-design | P2 |
| Does a deferred `Close()` (or other cleanup) silently discard its returned error? | Explicit "boring but bites" ask; no canonical doc gives one mechanical fix, but Effective Go's `defer` section plus the Code Review wiki's "Handle Errors" combine into the rule | [Effective Go §Defer](https://go.dev/doc/effective_go#defer), [Code Review Comments §Handle Errors](https://go.dev/wiki/CodeReviewComments#handle-errors) | no | errors/resource-cleanup | P0 |
| Does a CLI rely on deferred cleanup running after a fatal condition, when it actually calls `os.Exit` (which skips all deferred calls)? | Exact, well-known but easy-to-miss stdlib gotcha; directly relevant to the fleet's own future Go CLIs | [Effective Go §Defer](https://go.dev/doc/effective_go#defer) (defer semantics) + [os package](https://pkg.go.dev/os#Exit) (not in this corpus's docs but spec-adjacent) | partial — general "exit codes" contract may live in the Rust cli-contract depth file conceptually, but the Go-specific defer/os.Exit interaction is new | cli/os | P0 |
| What exit-code contract should a Go CLI publish, mirroring the fleet's Rust CLI contract? | Direct alignment ask from the frame (ocx/grimoire mould) | none in this corpus — Go itself is silent beyond `os.Exit(code)` | partial — concept covered by the Rust cli-contract depth file; Go mechanism needs its own note | cli | P1 |
| Does code index a Go string by byte offset when it means a Unicode code point (rune), or use `len(s)` where `utf8.RuneCountInString` is meant? | Explicit "boring but bites" ask; grounded in spec's string/rune semantics | [spec §String types](https://go.dev/ref/spec#String_types), [spec §For statements](https://go.dev/ref/spec#For_statements) (range over string yields runes) | no | lang/encoding | P0 |
| Does code rely on Go map iteration order for anything observable (log output order, golden-file diffs, hash of a serialized map)? | No canonical source promises any order; explicit "map iteration order and output determinism" ask | [spec §For statements, range clause](https://go.dev/ref/spec#For_statements) | no | lang/determinism | P0 |
| Does code assume `time.Time` subtraction/comparison behaves like a monotonic clock even after the value crosses a `Marshal`/unmarshal or equality-by-`==` boundary (which strips the monotonic reading)? | Explicit "time and monotonic clocks" ask; classic subtle bug class | not directly in this fetch — flag for the stdlib/time dive to ground against `time` package docs | no | stdlib/time | P0 |
| Does an on-disk format (cache, lock, index) a Go tool writes lack an explicit version field or magic number to detect a future incompatible reader? | Explicit "on-disk format versioning" ask; central to the fleet's content-addressed-store CLIs | not directly in this fetch — a design convention, not a language feature | no | fs/release | P1 |
| Does a Go tool write a file by writing directly to its final path instead of write-temp-then-`os.Rename`-in-the-same-directory? | Explicit "atomic file writes" ask; directly ties to the fleet's own CLI domain | not directly in this fetch — grounded in POSIX rename semantics, not a Go-specific doc; needs the fs/stdlib dive to cite `os.Rename`'s docs | no | fs/release | P0 |
| Does a long-running Go service trap SIGINT/SIGTERM (`os/signal.Notify`) to drain in-flight work before exit, or does it die uncleanly on the first signal? | Explicit "signal handling" ask | not directly in this fetch — needs the stdlib/os dive | no | cli/os | P1 |
| Does a mutating CLI subcommand behave safely if re-run after a crash mid-operation (idempotency)? | Explicit "idempotency" ask; central to a mirror/publish tool | not in this corpus — an app-level design contract, partially covered conceptually by the Rust CLI-contract material | partial | cli | P2 |
| Does a Go binary or library still assume `GOMAXPROCS` equals `runtime.NumCPU()`, ignoring the container-aware default (1.25)? | Directly changes any hand-tuned worker-pool sizing logic | [container-aware-gomaxprocs](https://go.dev/blog/container-aware-gomaxprocs), [GODEBUG §1.25 `containermaxprocs`/`updatemaxprocs`](https://go.dev/doc/godebug#go-1-25) | no | perf/runtime | P0 |
| Does a release pipeline's reproducible-build check assume VCS stamping (`debug.ReadBuildInfo`) is always populated, when Go 1.25 disables it by default under multiple detected VCS systems? | Directly tests H8; silent breakage risk for release tooling | [GODEBUG §1.25 `allowmultiplevcs`](https://go.dev/doc/godebug#go-1-25) | no | release/security | P0 |
| Is the module's minimum-Go-version gate expressed with the `go` directive (mandatory since 1.21), and is a separate `toolchain` directive used only for the suggested-toolchain-to-auto-fetch role? | Tests H6; the two directives are commonly confused | [Modules Reference §go directive](https://go.dev/ref/mod#go-mod-file-go) / [§toolchain directive](https://go.dev/ref/mod#go-mod-file-toolchain) | no | modules/toolchain | P0 |
| Should the fleet's future Go SDK/CLI pin its dev tools (`staticcheck`, `golangci-lint`, code generators) with a `tool` directive (1.24) instead of a `tools.go` blank-import file? | Directly actionable design decision for the fleet's own future repos | [Modules Reference §tool directive](https://go.dev/ref/mod#tool-dep) | no | modules/toolchain | P0 |
| Is a `go.work` file committed to the repo, and if so, is that intentional (usually it should not be, per H6)? | Tests H6 directly; also a common accidental-commit mistake | [Modules Reference §Workspaces](https://go.dev/ref/mod#workspaces) | no | modules | P1 |
| When publishing a breaking change to a module the fleet owns, are all seven release-workflow steps for a `/v2`-suffix major version followed (new branch, path-suffix rewrite, internal import rewrite, pre-release feedback, then the tag)? | Directly relevant the first time the fleet publishes a Go SDK v2 | [Release workflow §Publishing breaking API changes](https://go.dev/doc/modules/release-workflow#publishing-breaking-api-changes) | no | modules/release | P1 |
| Does a Go module ever need `retract` in `go.mod` to un-recommend a bad published tag? | Directly relevant to the fleet's "bundles never pin" / release-hygiene posture | [Modules Reference §retract directive](https://go.dev/ref/mod#go-mod-file-retract) | no | modules/release | P2 |
| Does `govulncheck` run in CI, and does the team understand it reports call-graph-*reachable* vulnerabilities rather than every vulnerable module in `go.sum`? | Directly testable with a real command (`govulncheck ./...`), high false-positive-avoidance value | [Security best practices §Scan](https://go.dev/doc/security/best-practices#vulnerability-management), [govulncheck blog](https://go.dev/blog/govulncheck) | no | security/CI | P0 |
| Does a parser/decoder in the codebase have a corresponding `FuzzXxx` fuzz test and a checked-in seed corpus under `testdata/fuzz/`? | Concrete, runnable check; directly relevant to any Go CLI/SDK parsing external input (OCI manifests, config files) | [Fuzzing §Writing fuzz tests](https://go.dev/doc/security/fuzz#writing-and-running-fuzz-tests) | no | security/testing | P1 |
| Does CI run `go test -race` at all, and if not, is that an explicit, reasoned decision given the documented 5–10x memory / 2–20x time overhead? | Concrete numeric threshold to base a CI-tiering decision on | [Race Detector §Runtime Overhead](https://go.dev/doc/articles/race_detector#runtime-overhead) | no | testing/CI | P1 |
| Does `go test` (1.27+) fail on the new default `stdversion` vet check because a file uses a stdlib symbol newer than the module's declared `go` line? | New, already-shipping-by-default guard; directly catches a whole class of "used a 1.25 API in a `go 1.21` module" mistakes for free | [go1.27 §go test](https://go.dev/doc/go1.27#go-test) | no | toolchain/lint | P1 |
| Would running `go fix ./...` on a Go 1.26+ toolchain modernize idioms the codebase still carries (old `sort.Slice`, `interface{}`, manual `WaitGroup.Add`/`Done`, etc.), and is that run gated to skip generated files? | `go fix` is now a maintained, ongoing modernization gate, not a one-off migration tool | [gofix blog](https://go.dev/blog/gofix) | no | toolchain | P0 — directly actionable, runnable command |
| Should the fleet consider building an organization-specific modernizer/analyzer on the new `go fix`/inliner "self-service" infrastructure (1.26)? | Forward-looking design option raised by the source itself | [inliner blog](https://go.dev/blog/inliner) | no | toolchain | P2 |
| Is a data structure being made generic ("this container doesn't care about its element type") when only one concrete type is ever instantiated in practice? | Explicit anti-pattern, distinct from the assertion/DSL misuse above | [Style Decisions §Generics](https://google.github.io/styleguide/go/decisions#generics) | no | lang/api-design | P1 |
| Does `log/slog` replace an existing zap/zerolog dependency for new code, or does the codebase still default to a third-party structured logger (testing H7)? | Directly tests H7; the Google style guide's own Logging section is Google-internal (`glog`), not `slog`, so this needs empirical grounding from the exemplar corpus, not the canonical corpus alone | [slog blog](https://go.dev/blog/slog), [Style Decisions §Logging](https://google.github.io/styleguide/go/decisions#logging) (flag: Google-internal bias) | partial | stdlib/observability | P1 |
| Does a Go binary that interns strings or caches derived values use `unique.Handle`/`weak.Pointer` (1.24) where a hand-rolled map-based cache would leak? | New stdlib primitive, direct simplification opportunity | [gc-guide §Finalizers, cleanups, and weak pointers](https://go.dev/doc/gc-guide#weak) | no | perf/stdlib | P2 |
| Does code use `runtime.SetFinalizer` where `runtime.AddCleanup` (1.24) is now the documented, safer replacement? | Explicit "modern replacement" language in the GC guide itself, with named pitfall categories for each | [gc-guide §Finalizers, cleanups, and weak pointers](https://go.dev/doc/gc-guide#weak) | no | perf/stdlib | P2 |
| Is a Dockerfile/CI pin of `GOEXPERIMENT` stale — e.g. re-enabling `noswissmap`/`swissmap` (1.24, now default) or holding `nogreenteagc` without a documented reason (1.26, now default)? | Concrete, checkable staleness class introduced by two consecutive releases flipping experiment defaults | [go1.24 §Runtime](https://go.dev/doc/go1.24#runtime), [go1.26 §Runtime](https://go.dev/doc/go1.26#runtime) | no | toolchain/perf | P2 |
| Is `encoding/json/v2` adopted (or referenced) while it is still an experimental, non-`GOEXPERIMENT`-default package as of this reading? | Prevents shipping on an unstable, opt-in API without an explicit flag | [jsonv2-exp blog](https://go.dev/blog/jsonv2-exp) | no | stdlib | P2 |
| Does a doc comment's deprecation notice use the exact `Deprecated: ` prefix (capital D, colon, space) that tooling keys off of? | Small, mechanical, and easy to get wrong (e.g. `// deprecated:` or missing the colon silently fails to register) | [Go Doc Comments §Syntax, Deprecations](https://go.dev/doc/comment#deprecated) | no | docs/api-design | P1 — Go-specific, outside the generic docs-quality glob |
| Does a package doc comment begin with the exact `Package foo ` convention, and is it placed immediately before the `package` clause with no blank line? | Mechanical, pkg.go.dev-rendering-relevant convention outside the generic prose-linting sibling set's file-type glob | [Go Doc Comments §Packages](https://go.dev/doc/comment#package) | no | docs | P2 |
| Does a project's `go.mod` express the actual minimum-language-feature version it needs, or is `go 1.16` silently assumed because no `go` line is present? | Explicit spec-level default behavior that surprises reviewers | [Modules Reference §go directive](https://go.dev/ref/mod#go-mod-file-go) | no | modules | P1 |
| Would PGO (a `default.pgo` file, auto-picked-up since 1.21) meaningfully help a hot-path-heavy Go service, and is an existing profile still representative after a refactor? | Explicit "source stability" caveat; also a low-effort, high-payoff perf lever many teams skip entirely | [PGO doc §Notes](https://go.dev/doc/pgo#notes) | no | perf | P2 |
| Is `testing.B.Loop` (1.24) used for new/updated benchmarks instead of the classic `for i := 0; i < b.N; i++` pattern? | Fixes real correctness pitfalls (compiler over-optimizing away unused loop work; per-iteration setup cost) in the old idiom, not just style | [testing-b-loop blog](https://go.dev/blog/testing-b-loop) | no | testing/perf | P1 |
| Does the codebase treat `interface{}`/type-switch-heavy code as a substitute for a generic function where the style guide would instead recommend a shared interface or generics? | Directly named decision tree in the style guide's Generics section | [Style Decisions §Generics](https://google.github.io/styleguide/go/decisions#generics) | no | lang/api-design | P2 |

## Recent shifts seen in this corpus

- **Go 1.22 (Feb 2024)** — per-iteration `for` loop variables; retires `v := v` capture for code declaring `go 1.22`+.
- **Go 1.23 (Aug 2024)** — `for range` over an iterator function stabilized; `unique` package; opt-in telemetry infrastructure (`go telemetry on`).
- **Go 1.24 (Feb 2025)** — generic type aliases; `tool` directive; `os.Root`; `weak` package; `runtime.AddCleanup`; `testing/synctest` (experimental); `testing.B.Loop`; `(testing.TB).Context()`; Swiss-table maps become the default (`GOEXPERIMENT=noswissmap` to opt out).
- **Go 1.25 (Aug 2025)** — container-aware `GOMAXPROCS` by default (`containermaxprocs`/`updatemaxprocs`); Green Tea GC experimental; `testing/synctest` reaches GA (old 1.24 API removed in 1.26); `encoding/json/v2` experimental; `sync.WaitGroup.Go`; VCS build-info stamping disabled by default under multi-VCS detection (`allowmultiplevcs`).
- **Go 1.26 (Feb 2026)** — Green Tea GC becomes the default (`GOEXPERIMENT=nogreenteagc` to opt out); `errors.AsType`; `go fix` completely rewritten into a modernizer + source-level-inliner framework; self-referencing generic type constraints allowed; `new(expr)` (operand may be an expression).
- **Go 1.27 (Aug 2026)** — generic methods; `go test` runs `stdversion` vet check by default; `asynctimerchan` GODEBUG opt-out removed (the pre-1.23 `time.After` leak fix is now permanent); struct-literal keys may be any field selector; function type inference generalized to all assignment contexts.
- **Error handling (June 2025)** — the Go team formally and publicly closed the door on syntactic error-handling sugar; this invalidates any rule-authoring plan premised on a future language change and should anchor error-handling guidance on `%w`/`errors.Join`/`cmp.Or` as the permanent idiom.

## Contested

- **Logging**: the Google style guide's own "Logging" section describes Google's internal `log`/`glog` variant, explicitly not `log/slog` — while the Go blog and stdlib evolution clearly push `log/slog` as the open-source-facing answer. A rule set must pick `log/slog` deliberately and note that the Google guide's own logging section does not apply outside Google, rather than importing it uncritically.
- **Error-handling syntax**: user surveys (per the Go team's own retrospective) keep ranking error-handling verbosity as the top complaint, and the blog post explicitly records unresolved internal disagreement ("we neither have a shared understanding of the problem, nor do we all agree there is a problem") — the trend is toward *no* change, but this is a live, not fully closed, debate, and a future language version could still revisit it.
- **`log/slog` vs. testify's popularity** are the same shape of tension as above generalized: canonical guidance and Google's own internal practice sometimes diverge from what the wider open-source ecosystem actually does (per H5/H7) — the canonical corpus is unambiguous, but whether the exemplar corpus agrees is an open, empirical question for the grounding wave, not something this canonical-only survey can settle.
- **Generics adoption pace**: the FAQ and style guide both frame generics as a deliberately narrow, "use only when it earns its complexity" feature, while the blog's steady cadence of generics-adjacent posts (generic methods, generic interfaces, self-referencing constraints, type inference improvements) shows the language's generics surface still actively growing three releases after 1.27 first shipped them — the "don't overuse generics" guidance and "generics keep getting more capable" reality are in tension, not contradiction, but a rule should not read the caution as "generics are frozen."

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/ref/spec](https://go.dev/ref/spec) | The Go Language Specification | Go 1.27, dated in-page May 2026 | The only normative definition of the language; its version-appendix is the fastest way to date any language feature |
| [go.dev/doc/effective_go](https://go.dev/doc/effective_go) | Effective Go | Written 2009, explicitly not actively updated | Still the working idiom for naming/formatting/defer/interfaces; explicit disclaimer on generics/modules |
| [go.dev/wiki/CodeReviewComments](https://go.dev/wiki/CodeReviewComments) | Go Code Review Comments wiki | Community/Go-team-maintained, current | The checklist actual Go reviewers cite by section anchor |
| [go.dev/wiki/TestComments](https://go.dev/wiki/TestComments) | Go Test Comments wiki | Community/Go-team-maintained, current | Canonical rejection of assertion libraries; test-structure conventions |
| [google.github.io/styleguide/go/guide](https://google.github.io/styleguide/go/guide) (raw: [guide.md](https://raw.githubusercontent.com/google/styleguide/gh-pages/go/guide.md)) | Google Go Style Guide — Guide | Actively maintained | Normative and canonical; the priority-ordered style principles |
| [google.github.io/styleguide/go/decisions](https://google.github.io/styleguide/go/decisions) (raw: [decisions.md](https://raw.githubusercontent.com/google/styleguide/gh-pages/go/decisions.md)) | Google Go Style Guide — Decisions | Actively maintained | Normative-but-not-canonical; the single densest source of concrete, citable rules in this survey |
| [google.github.io/styleguide/go/best-practices](https://google.github.io/styleguide/go/best-practices) (raw: [best-practices.md](https://raw.githubusercontent.com/google/styleguide/gh-pages/go/best-practices.md)) | Google Go Style Guide — Best Practices | Actively maintained | Worked examples for error wrapping, global state, options patterns, test structure |
| [go.dev/doc/faq](https://go.dev/doc/faq) | Go FAQ | Actively maintained | Direct rationale in the Go team's own words for generics timing, no-assertions, no-exceptions |
| [go.dev/ref/mem](https://go.dev/ref/mem) | The Go Memory Model | "Version of June 6, 2022," unrevised since | Sole normative source for synchronization guarantees |
| [go.dev/doc/comment](https://go.dev/doc/comment) | Go Doc Comments | Actively maintained | Exact syntax for doc comments, deprecation notices, doc links |
| [go.dev/ref/mod](https://go.dev/ref/mod) | Go Modules Reference | Actively maintained, tracks current `go` command | Exhaustive `go.mod`/`go.work` directive grammar and MVS mechanics |
| [go.dev/doc/modules/layout](https://go.dev/doc/modules/layout) | Organizing a Go module | Actively maintained | Canonical repo-shape answer for the fleet's future Go SDK/CLI layout |
| [go.dev/doc/modules/release-workflow](https://go.dev/doc/modules/release-workflow) | Module release and versioning workflow | Actively maintained | Ordered steps for pre-release, first-stable, bug-fix, and major-version publishing |
| [go.dev/doc/modules/version-numbers](https://go.dev/doc/modules/version-numbers) | Module version numbering | Actively maintained | Exact pseudo-version syntax and MVS-relevant version ordering |
| [go.dev/doc/security/best-practices](https://go.dev/doc/security/best-practices) | Security Best Practices for Go Developers | Actively maintained | The Go team's own security checklist: govulncheck, updates, fuzzing, race, vet |
| [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz) | Go Fuzzing | Actively maintained | `FuzzXxx` requirements and the on-disk seed-corpus format |
| [go.dev/doc/pgo](https://go.dev/doc/pgo) | Profile-guided optimization | Actively maintained | `default.pgo` auto-pickup mechanics and the source-stability caveat |
| [go.dev/doc/diagnostics](https://go.dev/doc/diagnostics) | Diagnostics | Actively maintained | Maps each stdlib diagnostic API/GODEBUG knob to the problem it diagnoses |
| [go.dev/doc/gc-guide](https://go.dev/doc/gc-guide) | A Guide to the Go Garbage Collector | Actively maintained | GOGC/memory-limit tuning, latency sources, and the AddCleanup/weak/SetFinalizer decision tree |
| [go.dev/doc/articles/race_detector](https://go.dev/doc/articles/race_detector) | Data Race Detector | Actively maintained | The exact 5–10x/2–20x overhead numbers and platform requirements |
| [go.dev/doc/toolchain](https://go.dev/doc/toolchain) | Go Toolchains | Actively maintained | `GOTOOLCHAIN` resolution order and toolchain-switch mechanics |
| [go.dev/doc/godebug](https://go.dev/doc/godebug) | Go, Backwards Compatibility, and GODEBUG | Actively maintained, per-release history | The single richest source of exact, dated, version-attributed behavior changes in this survey |
| [go.dev/blog/all](https://go.dev/blog/all) | The Go Blog index | Continuously updated | Enumerated 88 posts since 2022 to find the practice-setting ones |
| [go-proverbs.github.io](https://go-proverbs.github.io/) | Go Proverbs | From a 2015 talk, page not otherwise dated | The condensed idiom list every other source expands on |
| [go.dev/doc/go1.24](https://go.dev/doc/go1.24) · [go1.25](https://go.dev/doc/go1.25) · [go1.26](https://go.dev/doc/go1.26) · [go1.27](https://go.dev/doc/go1.27) | Go release notes, 1.24–1.27 | Feb 2025 / Aug 2025 / Feb 2026 / Aug 2026 | The exact per-release feature and default-behavior changes cited throughout |
| [go.dev/blog/error-syntax](https://go.dev/blog/error-syntax) | `[ On | No ] syntactic support for error handling` | 3 June 2025 | The Go team's own closure of the error-handling-syntax debate |
| [go.dev/blog/synctest](https://go.dev/blog/synctest) | Testing concurrent code with testing/synctest | 19 Feb 2025 | Introduces the primitive that most directly changes concurrency-test idiom |
| [go.dev/blog/container-aware-gomaxprocs](https://go.dev/blog/container-aware-gomaxprocs) | Container-aware GOMAXPROCS | 20 Aug 2025 | Explains the mechanism behind a default-behavior change relevant to every containerized Go service |
| [go.dev/blog/gofix](https://go.dev/blog/gofix) | Using go fix to modernize Go code | 17 Feb 2026 | The newest, most directly actionable tool in this entire corpus for an AI-agent-fleet workflow |

---
title: "Panics, exits, discarded errors and closing writable resources"
topic: go-errors
agent: panics-exits-cleanup
model: sonnet
date_researched: 2026-09-26
sources_count: 16
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/panics-exits-cleanup/
scope: |
  Covers M-B-09, M-B-10, M-B-12..16, M-B-19 of the go-topic-map: when Go code
  may panic, call os.Exit/log.Fatal*, or discard an error; the canonical shape
  for closing a writable resource; where recover belongs. Does NOT cover
  general %w-vs-%v wrapping (M-B-01..08, M-B-11), goroutine-panic propagation
  mechanics beyond the single-goroutine recover shape (M-C-12), or the
  fleet's SIGPIPE/exit-code contract (owned by cli-contract.md / GO-REL).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Panic policy: what "invariant" means, measured on pebble](#1-panic-policy-what-invariant-means-measured-on-pebble)
   2. [os.Exit and log.Fatal\* outside package main](#2-osexit-and-logfatal-outside-package-main)
   3. [Discarded errors: `_ =` is mostly not what it looks like](#3-discarded-errors-_--is-mostly-not-what-it-looks-like)
   4. [The canonical write-close shape](#4-the-canonical-write-close-shape)
   5. [SA9010: `defer f()` vs `defer f()()`](#5-sa9010-defer-f-vs-defer-ff)
   6. [nilerr and nilnil](#6-nilerr-and-nilnil)
   7. [Where recover belongs](#7-where-recover-belongs)
   8. [No try/? , no panic-based must() in generated code](#8-no-try--no-panic-based-must-in-generated-code)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A library or SDK function panics only for a violated internal invariant, an
  API-misuse-after-Close condition, or a `Must*`/package-level constant it
  controls — never for malformed external input arriving through a public
  parameter ([Effective Go §Panic](https://go.dev/doc/effective_go#panic), [Google Style Decisions §Don't panic](https://google.github.io/styleguide/go/decisions#dont-panic)).
- `os.Exit` and `log.Fatal*` belong only in `package main` (or `init()`):
  both skip every pending `defer` in every goroutine, so a library that calls
  either takes an irreversible decision away from its caller and silently
  drops cleanup. Measured: 285 `os.Exit` + 359 `log.Fatal*` outside `main` in
  the exemplar corpus ([shape](../go-audit/exemplar-code-shape.md) §4).
- **golangci-lint v2 ships with zero default exclusions** — v1's automatic
  suppression of unchecked `.*Close`/`.*Flush`/`os.Remove` errcheck findings
  is gone; a fleet config must opt in to `linters.exclusions.presets` or it
  gets full-strength errcheck noise on every bare deferred `Close()`
  ([ldez, golangci-lint v2 announcement, 2025-03-23](https://ldez.github.io/blog/2025/03/23/golangci-lint-v2/); verified below).
- The `std-error-handling` exclusion preset that restores the old "accepted
  `defer resp.Body.Close()`" behaviour is **read/write-blind**: its regex
  (`.*Close`) suppresses the exact write-close defect this rule exists to
  catch. Verified on a planted fixture: enabling the preset silences
  `bad_write_close.go`'s unchecked `f.Close()` on an `os.Create` handle just
  as completely as it silences a read-only `resp.Body.Close()`.
- The fix that keeps both: `errcheck.exclude-functions: ["(io.ReadCloser).Close"]`
  exempts the read-only interface method by its static type without
  touching `(*os.File).Close` calls made on the concrete type. Verified.
- `revive`'s `deep-exit` rule is **not** in golangci-lint v2.14.0's default
  recommended revive rule set — it fires only when explicitly configured
  with `revive.settings.rules: [{name: deep-exit}]`. Verified.
- `go-critic`'s `exitAfterDefer` and `revive`'s `deep-exit` both fire on the
  same `os.Exit`/`log.Fatal*` line, and golangci-lint's default
  `issues.uniq-by-line: true` **silently drops the second one** — enabling
  both linters gives no more signal than enabling either alone unless
  `uniq-by-line: false` is set. Verified.
- `staticcheck` **SA5001** ("deferring Close before checking for a possible
  error", default-on since 2017.1) and **SA9010** ("returned function should
  be called in defer", default-on, new in 2026.2) are two distinct,
  non-overlapping checks — plant both shapes, both fire, neither substitutes
  for the other.
- The canonical shape for closing a *writable* file or buffered writer is a
  named-return defer: `defer func() { err = errors.Join(err, f.Close()) }()`.
  It is the only shape in this corpus that (a) never masks the function's
  earlier error, (b) never lets a failed `Close` go unreported, and (c)
  passes errcheck without needing any exclusion.
- A bare `defer resp.Body.Close()` (or any other `io.ReadCloser`-typed
  read-only handle) stays exempt from the write-close rule by design, not by
  accident: nothing in the read path is lost if the close fails, because
  nothing was buffered waiting to be flushed.
- `gosec`'s **G104** ("Audit errors not checked") is explicitly documented in
  golangci-lint's own source as "Duplicated errcheck checks" and never fired
  in this project's runs — it is not a second line of defense for ignored
  errors; errcheck is the only one that matters here.
- A 40-site sample of a raw `_ = <expr>` grep across the corpus found roughly
  a third (13/40) are not error discards at all: the `stringer`-generated
  `_ = x[Const-N]` bounds-check idiom and protobuf's `_ = protoimpl.EnforceVersion(...)`
  marker. Naive `_ =` counts overstate the "discarded error" surface.
  See [§3](#3-discarded-errors-_--is-mostly-not-what-it-looks-like).
- Of the genuine discards sampled, most carry an implicit or explicit
  justification (flag-registration functions that fail only on programmer
  error, best-effort telemetry, an inline comment naming the reason); the
  antipattern is an **undocumented** discard on a path with real user-facing
  consequences (a terminal-restore-on-exit call, a write-path Close), not the
  blank identifier itself.
- `nilerr` (checked non-nil error, returned `nil` anyway) and `nilnil`
  (returned `nil, nil`) are distinct, orthogonal, both-default-available
  golangci-lint linters (not in the 5-linter `standard` set, must be
  explicitly enabled); both fired cleanly on planted fixtures and produced
  zero output on the fixed twins.
- `(nil, nil)` for "not found" is sanctioned nowhere in the primary sources
  surveyed: it is ambiguous to every caller that checks only `err != nil`,
  and the fix is always a sentinel or a typed not-found error, never a
  convention the caller must remember.
- `recover` belongs only in a deferred function at a goroutine or public-API
  boundary that converts the panic into a reported outcome (a log line, a
  returned error); it must never be ordinary control flow. The Effective Go
  `safelyDo` pattern and caddy's per-goroutine `recover`-then-`log.Printf`
  shape are the same idiom, one blog example and one measured 2026 exemplar
  apart.
- A bare `recover()` whose return value is discarded (not captured into a
  variable) is itself caught by errcheck's ordinary unchecked-return-value
  rule — a small, free, mechanical signal for the worst case of "a recover
  that swallows," verified on a planted fixture.
- The Go team formally stopped pursuing `try`/`?`/`check`-`handle` syntax in
  June 2025; an agent must not invent or "helpfully" suggest such syntax.
  The one sanctioned stdlib helper for boilerplate reduction is `cmp.Or`.
- Neither `panic` on malformed external input nor `Must*` applied to a
  runtime (non-constant) value is caught by any linter in the measured
  roster (errcheck, staticcheck, revive, gocritic, gosec, nilerr, nilnil) —
  both are reading-heuristic-only findings; say so plainly rather than
  implying a lint exists.

## Findings

### 1. Panic policy: what "invariant" means, measured on pebble

Go's own guidance is unambiguous about *whether* to panic and thin on *when a
panic is actually an invariant*. Effective Go: "real library functions should
avoid `panic`. If the problem can be masked or worked around, it's always
better to let things continue to run" — the one named exception is
initialization ("if the library truly cannot set itself up, it might be
reasonable to panic") ([Effective Go §Panic](https://go.dev/doc/effective_go#panic)).
Google's Style Decisions: "Do not use `panic` for normal error handling.
Instead, use `error` and multiple return values," with two named exceptions —
`package main`/init code (prefer `log.Exit`, "a stack trace will not help the
reader"), and "impossible conditions" that "should always be caught during
code review and/or testing" ([Style Decisions §Don't panic](https://google.github.io/styleguide/go/decisions#dont-panic)).
Google's Best Practices sharpens the impossible-conditions case: prefer
`log.Fatal` over `panic` even there, because "it is possible for deferred
functions to deadlock or further corrupt internal or external state" during
panic unwinding, and calls `net/http`'s handler-panic recovery "a design
error" that produces unhandled stack traces in production logs. It names
three panic-acceptable cases beyond init: standard-library-style API misuse
detection (`reflect`-style), *internal* control flow between tightly coupled
functions that never crosses a package boundary and is always recovered at
the public API edge, and code the compiler cannot prove unreachable (a
`Must*`/`panic` after a `log.Fatal` call) ([Best Practices §Program checks and panics](https://google.github.io/styleguide/go/best-practices#program-checks-and-panics)).

None of that tells an agent how to *classify* a panic call it is looking at.
The exemplar corpus does, because one repository panics an order of magnitude
more than any other and documents why: `cockroachdb/pebble@13596f1e1cea` has
1,148 of the corpus's 4,236 non-`main` panics — 27% from one repo
([shape](../go-audit/exemplar-code-shape.md) §4). Classifying 30 of them by
argument shape:

| argument shape | sample count (out of ~980 checked non-test, non-main sites) | classification |
|---|---|---|
| `panic(errors.AssertionFailedf(...))` / `panic(base.AssertionFailedf(...))` | 908 | invariant — an explicit "this should be impossible" constructor |
| `panic(illegalOpf(...))` | 21 | API misuse — caller violated a documented call-ordering contract |
| `panic(base.CorruptionErrorf(...))` | 4 | invariant — on-disk data violates a format guarantee |
| `panic(err)` where `err` came from `d.closed.Load()` | (spot-read, `get.go:27`) | API misuse — "used after Close" |
| `panic(ErrClosed)` | 6 | API misuse — same shape, named sentinel instead of a wrapped error |
| `panic(p.errorf(...))` | 29 | parser/tool code (`metamorphic/parser.go`), not the storage engine's public API |

`d.getInternal` panics when `d.closed.Load()` is non-nil
(`cockroachdb/pebble@13596f1e1cea:get.go:26-28`); `Snapshot.Get` and
`Snapshot.NewIterWithContext` panic with the sentinel `ErrClosed` under the
identical "already closed" condition
(`cockroachdb/pebble@13596f1e1cea:snapshot.go:46-47,62-63`). In every sampled
case the panic input is either a package-internal invariant constructor or a
call made after the caller ignored a documented lifecycle contract — never a
value that arrived unvalidated through a public parameter. Pebble's own style
guide documents this as deliberate: panic on invariant violation, recover at
the API boundary — a storage-engine choice, not a model to imitate wholesale,
but the *shape* of what counts as "invariant" transfers directly: **a
constructor or sentinel whose name says the state is impossible, applied to
internal state the caller does not control** — not a bare `panic(fmt.Sprintf(...))`
built from a function parameter.

Contrast with `caddyserver/caddy@54937914234b:modules.go:140-158`, a
different but equally legitimate panic shape: `RegisterModule` panics on a
missing/duplicate module ID or a nil `ModuleInfo.New`. This is *also*
API misuse (a package author registering a module wrong at package-init
time, always caught in the first `go test`/`go run`), not a runtime input
from an untrusted caller — it happens once, at program startup, before any
external input has been read.

### 2. os.Exit and log.Fatal* outside package main

`os.Exit(code)` calls the `exit` syscall with no unwind: every `defer` in
every goroutine is skipped, not just the calling function's. `log.Fatal*`
is `Print` followed by `os.Exit(1)` — same effect
([Google Style Decisions §Don't panic](https://google.github.io/styleguide/go/decisions#dont-panic) names `log.Fatalf` explicitly as
distinct from a hypothetical `log.Exit`; the stdlib `log` package's
`Fatal`/`Fatalf`/`Fatalln` are the ones that call `os.Exit(1)`).

Measured: 285 `os.Exit` + 359 `log.Fatal*` call sites outside `package main`
across the corpus, concentrated in `golang/tools` (48+122),
`tailscale/tailscale` (35+94), `etcd-io/etcd` (88+13) and
`google/go-containerregistry` (1+13) ([shape](../go-audit/exemplar-code-shape.md)
§4, per-repo table). Two linters name this shape directly and measurably
differ in scope:

- `revive`'s **`deep-exit`** rule: "Packages exposing functions that can stop
  program execution by exiting are hard to reuse. This rule looks for
  program exits in functions other than `main()` or `init()`"
  ([revive RULES_DESCRIPTIONS.md](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md)).
  It fires on `os.Exit`, `log.Fatal*`, and `panic` alike (verified: it
  reported both `os.Exit(1)` and two separate `log.Fatalf` calls in the
  planted fixture).
- `go-critic`'s **`exitAfterDefer`** (enabled by default, `#diagnostic` tag):
  fires specifically when an exit/fatal call follows a `defer` registration
  *in the same function*, because that is the concrete failure mode — the
  registered cleanup never runs
  ([go-critic.com/overview](https://go-critic.com/overview.html)).

**Verified interaction, not documented anywhere upstream**: both linters fire
on the exact same file:line:column when a fixture has both shapes. With
golangci-lint v2.14.0's default `issues.uniq-by-line: true`, only *one* of
the two findings survives to the report — the other is silently dropped.
Running with `--enable-only=gocritic` in isolation surfaces `exitAfterDefer`
at `bad_exit_in_lib.go:12:3`, the *identical* position `deep-exit` reports
when both linters are enabled together and `uniq-by-line` defaults on. An
agent enabling "both, for redundancy" gets exactly the coverage of one.

Also verified: `revive`'s `deep-exit` is **not** part of golangci-lint
v2.14.0's default revive rule set. Enabling `revive` alone (no
`settings.revive.rules` block) produced `package-comments` and
`unexported-return` findings on the fixture, but zero `deep-exit` findings on
the same `os.Exit`/`log.Fatalf` lines that fired once the rule was
explicitly listed. A `.golangci.yml` that enables `revive` expecting
`deep-exit` coverage "for free" is silently getting none.

### 3. Discarded errors: `_ =` is mostly not what it looks like

A stratified sample of 40 sites (every 68th line of 2,742 corpus-wide
`^\s*_\s*=\s*[A-Za-z]` matches, `_test.go`/`vendor`/`testdata` excluded)
breaks down as follows (own re-measurement; the runtime-posture audit's
narrower regex found 1,462 — the gap is exactly the false-positive class
below, which its regex mostly avoided by requiring a trailing `(`):

| class | count in sample | example |
|---|---|---|
| **not an error discard — generated bounds-check idiom** | 11 | `_ = x[InvalidLitIndex-62]` (`stringer`-generated `_string.go` files: `dominikh__go-tools`, `golang__tools`, `hashicorp__terraform`, `junegunn__fzf`) |
| **not an error discard — protobuf marker** | 2 | `_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)` (generated `.pb.go`) |
| **not a discard at all — dead TODO marker on a field** | 1 | `_ = ps.LastHandshake` preceded by a 4-line `TODO(bradfitz)` comment (`tailscale/tailscale@6b3a45f14ef6:wgengine/pendopen.go:264-268`) — a field *read*, not a call; has zero effect on either behaviour or the "declared and not used" error (fields never trigger it), so this line does nothing at all and could be deleted |
| **justified discard, function fails only on programmer error** | 8 | `_ = cmd.Flags().MarkDeprecated(...)` ×3, `_ = cmd.MarkFlagFilename(...)`, `_ = c.Flags().SetAnnotation(...)`, `_ = cmdutil.RegisterBranchCompletionFlags(...)`, `_ = cmd.RegisterFlagCompletionFunc(...)` — cobra/CLI flag-registration calls that only return non-nil for a flag name that does not exist, caught by any test that runs the command once |
| **justified discard, explicit inline comment** | 1 | `_ = w.Close()` at `cockroachdb/pebble@13596f1e1cea:wal/failover_writer.go:722`, directly preceded by `// Never wrote anything to this writer so don't care about the returned error.` |
| **justified discard, best-effort/telemetry/non-critical** | 6 | `_ = i.notifyCodespaceOfClientActivity(...)` (cli/cli telemetry), `_ = tml.Fprintf(...)` (best-effort colored output), `_ = sr.WasSeen()`, `_ = fn(s)`, `_ = st.expr(...)` (visited for a side effect, result intentionally unused) |
| **undocumented, debug/diagnostic path — low stakes but unexplained** | 1 | `_ = r.blockReader.Readable().ReadAt(ctx, trailer, int64(b.Offset))` inside a `verbose`-only dump branch (`cockroachdb/pebble@13596f1e1cea:sstable/layout.go:144`) — no comment; acceptable because the branch only runs under `-v` inspection tooling, but nothing says so |
| **undocumented, user-visible failure mode** | 1 | `_ = p.restoreTerminalState()` in a program-exit cleanup goroutine (`charmbracelet/bubbletea@d5bfd5c2ff74:tea.go:1288`) — a failed terminal restore leaves the user's shell in raw mode after the program exits; discarding it silently is the one case in the sample worth a second look |
| other Close()/best-effort cleanup, needs per-site read | 9 | `_ = sql.EarlyListener.Close()`, `_ = f.Close()` (restic cache), `_ = b.Close()` (pebble bench harness), `_ = fh.Close()` (regclient), `_ = origBody.Close()` (go-github, read body), `_ = iVssBackupComponents.AbortBackup()` (restic Windows VSS, best-effort cleanup after an earlier failure) |

**Net reading**: the naive "discarded error" count is inflated by generated
code roughly a third of the time; among genuine discards, the dominant
pattern (100 Go Mistakes #53's own recommendation) is exactly what the
corpus does — mark it with `_ =` deliberately rather than leave a bare
unused return, and let a comment carry the "why" when the reason is not
obvious from the call itself. No linter in the measured roster enforces
Uber's "Handle Errors Once" — that both-logged-and-returned antipattern is a
reading heuristic only (`grep`-detectable only by proximity, not
syntactically), a fact the Uber guide's own text volunteers:
"a pattern no linter in this corpus mechanically catches"
([codified](../go-topic-map/codified.md) §9).

### 4. The canonical write-close shape

The plain idiom —

```go
f, err := os.Create(path)
if err != nil {
    return err
}
defer f.Close()          // BAD: Close's error return is discarded
```

silently drops a failed `Close`. On a writable `*os.File`, `Close` can fail
for reasons a caller cares about: buffered data was never actually written
back (a short write, `ENOSPC`, a delayed write-back error that the
filesystem only surfaces at `Close` or `Sync` time). `os.File.Close`'s own
doc only promises "closes the File, rendering it unusable for I/O... Close
will return an error if it has already been called" — it does not promise
success, and `os.File.Sync` exists specifically to force "the file system's
in-memory copy of recently written data" to disk, which `Close` alone does
not guarantee on every platform ([pkg.go.dev/os#File.Close](https://pkg.go.dev/os#File.Close),
[pkg.go.dev/os#File.Sync](https://pkg.go.dev/os#File.Sync)).

staticcheck's **SA5001** ("deferring Close before checking for a possible
error", default-on since 2017.1) catches a *different* mistake in the same
neighbourhood — deferring `Close` **before** the error from the call that
produced the handle is checked, so `Close` may run on a nil/zero value:

```go
f, err := os.Open(path)
defer f.Close()   // SA5001: f may be invalid if err != nil
if err != nil {
    return err
}
```

Verified: `staticcheck` flags exactly this shape
(`bad_sa5001.go:11:2: SA5001: should check error returned from os.Open()
before deferring f.Close()`) and is silent once the check is reordered
before the `defer` (`good_sa5001.go`, 0 issues). **SA5001 does not replace
errcheck**: `good_sa5001.go` still has an unchecked-return-value errcheck
finding on the same `defer f.Close()` line, because SA5001 only cares about
*order*, not about whether the returned error is ever read.

**The canonical shape** for a writable file, buffered writer, or anything
else whose `Close`/`Flush`/`Sync` can mask real data loss:

```go
func WriteFile(path string, data []byte) (err error) {
    f, err := os.Create(path)
    if err != nil {
        return err
    }
    defer func() {
        err = errors.Join(err, f.Close())
    }()

    if _, werr := f.Write(data); werr != nil {
        return werr
    }
    return nil
}
```

Verified clean under golangci-lint's default configuration (errcheck,
staticcheck, gosec, revive, gocritic, nilerr, nilnil all enabled, no
exclusions): 0 issues on `good_write_close.go`. The bare `defer f.Close()`
twin (`bad_write_close.go`) reports `Error return value of \`f.Close\` is not
checked (errcheck)` at the exact `defer` line.

**`errors.Join(err, f.Close())` vs explicit Close-before-return**: both
compose correctly (`errors.Join`'s own semantics: nil arguments are dropped,
so `err = errors.Join(nil, nil)` yields `nil`), but the named-return-defer
shape is the one that cannot be skipped by an early `return` added later
without the author noticing — every return path funnels through the single
deferred close. An explicit non-deferred `if cerr := f.Close(); cerr != nil { return errors.Join(err, cerr) }`
placed once at the end of the function is equivalent but breaks the moment a
second return path is added above it and nobody remembers to duplicate the
Close call. **The deferred, named-return form is the one to teach as the
default; the explicit form is acceptable only in a function with exactly one
return path already committed to inline Close handling.**

**Is `defer resp.Body.Close()` on a read-only handle still exempt? Yes — by
explicit config, not by errcheck default.** This corpus's shared assumption
("the accepted Go idiom for read-only handles" — [run](../go-audit/exemplar-runtime-posture.md)
§1) is directionally right but the mechanism claim needs correcting:

- **errcheck's shipped default-exclude list does not contain it.** Read
  directly from `kisielk/errcheck@v1.20.0:errcheck/excludes.go`'s
  `DefaultExcludedSymbols`: 21 entries, all `bytes.Buffer`/`strings.Builder`/
  `hash.Hash`/`crypto/rand`/`math/rand`/`fmt.Print*` writers documented to
  never return a non-nil error. No `net/http`, no `io.ReadCloser`, no
  `os.File`. Verified: a bare `defer resp.Body.Close()` fixture reports
  `Error return value of \`resp.Body.Close\` is not checked (errcheck)` with
  no other configuration.
- **golangci-lint v1 masked this** through an always-on default exclusion
  regex, `EXC0001`: `` Error return value of .((os\.)?std(out|err)\..*|.*Close|.*Flush|os\.Remove(All)?|.*print(f|ln)?|os\.(Un)?Setenv). is not checked `` on the `errcheck` linter — read directly from
  `golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:53-59`.
- **golangci-lint v2 removed all default exclusions.** "In v2, there are no
  exclusions by default"
  ([ldez, golangci-lint v2 announcement, 2025-03-23](https://ldez.github.io/blog/2025/03/23/golangci-lint-v2/)).
  The old numbered excludes now live behind named, opt-in
  `linters.exclusions.presets` — `comments`, `std-error-handling`,
  `common-false-positives`, `legacy` (same source file, `config.ExclusionPresetStdErrorHandling`
  is exactly the old `EXC0001` regex, byte for byte).
- **The `std-error-handling` preset is read/write-blind.** Its regex matches
  any call ending in `Close` or `Flush`, no matter what it is called on.
  Verified: enabling `exclusions.presets: [std-error-handling]` silences
  **both** `bad_readonly_close.go`'s `resp.Body.Close()` **and**
  `bad_write_close.go`'s `f.Close()` on the `os.Create` handle — the exact
  defect this rule exists to catch. A `go-quality` config that enables this
  preset to quiet read-only noise has also switched off write-close
  checking corpus-wide, silently.
- **The targeted fix**: `errcheck.settings.exclude-functions: ["(io.ReadCloser).Close"]`.
  Verified: with only this exclude-functions entry (no preset), the
  read-only `resp.Body.Close()` finding disappears while the write-path
  `f.Close()` on the concrete `*os.File` type stays red — because the
  exclusion matches by the *static* interface type of the receiver
  (`resp.Body` is declared `io.ReadCloser`), and `*os.File` is never that
  static type at the call site. This is the config a fleet `go-quality`
  rule should ship, not the preset.

### 5. SA9010: `defer f()` vs `defer f()()`

```go
func startTimer(name string) func() {
    fmt.Println("start:", name)
    return func() { fmt.Println("stop:", name) }
}

defer startTimer(name)     // BUG: calls startTimer now, discards the stop closure
defer startTimer(name)()   // FIX: calls startTimer now, defers the returned closure
```

`staticcheck`'s **SA9010**, `Since: "2026.2"`: "If you have a function [that
returns a closure]... Then calling that in defer... is almost always a
mistake, since you typically want to call the returned function"
([staticcheck.dev/docs/checks/#SA9010](https://staticcheck.dev/docs/checks/#SA9010)).
It is on by default and, being brand new as of the 2026.2 release, postdates
essentially every LLM's training corpus
([codified](../go-topic-map/codified.md) §5). Verified: fires on
`bad_sa9010.go:16:2` (`defer startTimer(name)`) and is silent on
`good_sa9010.go` (`defer startTimer(name)()`).

Note the exact staticcheck version binding: golangci-lint 2.14.0 bundles
staticcheck **0.8.1** (the module version corresponding to the 2026.2.1 CLI
release used here); a standalone, older `staticcheck` binary predates
SA9010 entirely and will not catch this shape — pin one staticcheck entry
point per repository and check its version, per conflict 20 of the topic map
([map](../go-topic-map.md) conflict 20).

### 6. nilerr and nilnil

```go
// nilerr: checked err != nil, then returned nil anyway
_, err := os.Stat(path)
if err != nil {
    return nil       // the caller is told "success"
}

// nilnil: returns (nil, nil) for "not found"
u, ok := users[name]
if !ok {
    return nil, nil   // ambiguous: caller sees no error, dereferences nil
}
```

Both are separate, bundled-but-not-default golangci-lint v2.14.0 linters
(neither is in the 5-linter `standard` default set — `errcheck`, `govet`,
`ineffassign`, `staticcheck`, `unused` — nor in the 17-linter measured
consensus; both must be explicitly listed under `linters.enable`).
`nilerr`'s own description: it flags a checked-non-nil-then-`return nil`
(and, symmetrically, a checked-nil-then-`return err`) — a
`//lint:ignore nilerr <reason>` comment is the escape hatch
([gostaticanalysis/nilerr README](https://raw.githubusercontent.com/gostaticanalysis/nilerr/master/README.md)).
`nilnil`'s own motivation: "`return nil, nil` is not idiomatic for Go... if
there is no error, then the return value is valid and can be used without
additional checks" — its README's own example is a stdlib doc comment
apologizing for exactly this ambiguity
(`debug/dwarf/line.go`: "If this compilation unit has no line table, it
returns nil, nil") — and its recommended fix is always a sentinel error
tested with `errors.Is`
([Antonboom/nilnil README](https://raw.githubusercontent.com/Antonboom/nilnil/master/README.md)).
`nilnil` also has a `--detect-opposite` mode for the rarer inverse shape
(non-nil error *and* a non-nil, possibly-invalid value returned together) —
off by default, and no exemplar in this corpus enables it.

Verified: `bad_nilerr.go` → `error is not nil (line 9) but it returns nil
(nilerr)`; `good_nilerr.go` (propagates via `%w`) → 0 issues. `bad_nilnil.go`
→ `` return both a `nil` error and an invalid value: use a sentinel error
instead (nilnil) ``; `good_nilnil.go` (sentinel + `errors.Is`-testable) → 0
issues. Signal quality corroborated independently: in the strict 3-repo
`default: all` golangci-lint run over `cobra`/`oras-go`/`ko`, `nilerr` fired
0/2/2 times total — a linter this quiet on real code is exactly the
"MUST-rule" shape, not noise ([gates](../go-audit/exemplar-quality-gates.md)
§5, "signal linters" list).

**Is `(nil, nil)` ever sanctioned?** No primary source surveyed sanctions it
as an API contract. The one place it is functionally unavoidable is a
function whose result type is a slice or map and whose "empty" state is
naturally `nil` (`func Find(...) ([]Match, error)` returning `nil, nil` for
"zero matches" is fine, because a `nil` slice is a *valid*, safely rangeable
zero value — the antipattern is specifically returning a `nil` *pointer* or
*interface* result alongside a `nil` error, where the caller cannot safely
use the value without an additional, undocumented nil check).

### 7. Where recover belongs

Effective Go's own worked example is the template: `recover` inside a
deferred function, at the boundary of one goroutine, converting a panic into
a logged outcome without disturbing any other goroutine:

```go
func safelyDo(work *Work) {
    defer func() {
        if err := recover(); err != nil {
            log.Println("work failed:", err)
        }
    }()
    do(work)
}
```

"recover is only useful inside deferred functions"; a `recover` call
anywhere else always returns `nil` and has no effect
([Effective Go §Recover](https://go.dev/doc/effective_go#panic)). The
measured exemplar shape is the same idiom at production scale — `caddy`
recovers at the top of every long-running background goroutine it spawns
(PKI maintenance, TLS session-ticket rotation, health checks, metrics
updaters), always logging the recovered value and a stack trace, never
silently discarding it:

```go
func (p *PKI) maintenanceForCA(ca *CA) {
    defer func() {
        if err := recover(); err != nil {
            log.Printf("[PANIC] PKI maintenance for CA %s: %v\n%s", ca.ID, err, debug.Stack())
        }
    }()
    ...
```
(`caddyserver/caddy@54937914234b:modules/caddypki/maintain.go:27-32`; the
identical shape repeats at `modules/caddytls/tls.go:445,968`,
`modules/caddytls/sessiontickets.go:124`,
`modules/caddytls/distributedstek/distributedstek.go:209`,
`modules/caddytls/standardstek/stek.go:86`, and, with a structured logger
instead of `log.Printf`, `modules/caddyhttp/reverseproxy/healthchecks.go:273`
and `metrics.go:63`). This is exactly the "goroutine-boundary" case named
by M-C-12: a library-started goroutine that can panic must recover and
report at its own top, because nothing else will.

Measured breadth: 138 `recover` sites against 4,355 `panic` sites corpus-wide
([run](../go-audit/exemplar-runtime-posture.md) §1) — note this total uses a
different, line-scan methodology than the file-scoped, main-excluded 4,236
count in [§1](#1-panic-policy-what-invariant-means-measured-on-pebble); the
two audits measured different populations (one excludes `package main` and
`_test.go` files entirely, the other line-scans everything), and both
numbers are correct for what each counted — cite the one matching your
denominator.

**Verified mechanical signal for the worst case ("a recover that
swallows")**: a bare `recover()` statement whose return value is not
captured is itself an unchecked-return-value errcheck finding —
`bad_recover_swallow.go:10:10: Error return value is not checked (errcheck)`
— with no extra configuration. This does **not** catch the more common
swallow shape (`if r := recover(); r != nil {}` with an empty body — the
value *is* captured, so errcheck is satisfied even though nothing is done
with it); that shape has no linter in the measured roster and is a reading
heuristic only: *every* deferred `recover()` whose captured value is not
logged, wrapped into a returned error, or deliberately re-panicked is a
finding.

### 8. No try/? , no panic-based must() in generated code

After fifteen years and three serious proposals (`check`/`handle`, `try`,
and the `?` operator), Robert Griesemer's June 2025 post states the Go
team's position plainly: "For the foreseeable future, the Go team will stop
pursuing syntactic language changes for error handling"
([go.dev/blog/error-syntax](https://go.dev/blog/error-syntax), published
2025-06-03). The post's own recommended alternatives are not new control
flow: add meaningful context to errors, lean on library helpers like
`cmp.Or` for combining independent failures, and let editors/IDEs fold
error-handling blocks visually rather than hiding them in the language.
An agent generating Go must not emit `try(...)`, a `?` postfix, or invent a
project-local `must()` panic-wrapper as if it were an established Go
idiom — the only sanctioned std helper for this exact shape is
[`cmp.Or`](https://pkg.go.dev/cmp#Or), and even that is for picking the first
non-zero value among alternatives, not for propagating errors invisibly.

## Normative guidance candidates

1. **Library and SDK code panics only for a violated internal invariant, an
   API-misuse-after-Close condition, or a `Must*` applied to a package-level
   constant — never for a value that arrived through an exported function
   parameter.**
   Rationale: a panic on untrusted input takes down the caller's whole
   process for a condition an `error` return would let it handle.
   Verify: `rg -n -e 'panic\(' . --include='*.go'` (grep works equally;
   any recursive matcher with a directory operand), then for each hit
   outside `_test.go` and `package main`, read whether the argument traces
   to a package-level constant/constructor with an "invariant"-shaped name
   (`AssertionFailed`, `illegalOp`, `Corruption`, a locally defined sentinel)
   or to a function parameter. No linter distinguishes these; this is a
   reading heuristic. RUN: no (reading heuristic only; the corpus
   classification in [§1](#1-panic-policy-what-invariant-means-measured-on-pebble)
   is the evidence base, not a tool run).

2. **`os.Exit` and `log.Fatal*` (and `log.Panic*`) never appear outside
   `package main` or `init()`.**
   Rationale: both skip every pending deferred cleanup in every goroutine,
   taking an unrecoverable decision away from the caller.
   Verify: `revive` with `settings.rules: [{name: deep-exit}]` explicitly
   enabled (it is **not** in revive's default rule set under golangci-lint
   v2.14.0). RUN: **yes** — red on `bad_exit_in_lib.go`/`bad_fatal_after_defer.go`
   (`deep-exit: calls to os.Exit/log.Fatalf only in main() or init()
   functions`), clean on the twins.

3. **When both `revive`'s `deep-exit` and `go-critic`'s `exitAfterDefer` are
   enabled, set `issues.uniq-by-line: false`** (or accept that only one of
   the two findings survives per line).
   Rationale: golangci-lint's default `uniq-by-line: true` keeps a single
   issue per line/position, so the second linter's finding on the identical
   location is silently dropped — a config that "defends in depth" with both
   linters is, by default, defending with exactly one.
   Verify: run golangci-lint with both linters enabled at the tool's
   defaults on a fixture that trips both, confirm only one issue appears at
   that line; add `issues.uniq-by-line: false`, confirm both appear. RUN:
   **yes** — confirmed both ways on `bad_exit_in_lib.go`/`bad_fatal_after_defer.go`.

4. **A writable file or buffered writer's `Close`/`Flush`/`Sync` error is
   never discarded: use `defer func() { err = errors.Join(err, f.Close()) }()`
   on a named error return.**
   Rationale: a failed `Close` on a write path can mean data never reached
   disk; masking it (or ignoring it entirely) turns a write failure into a
   silent success.
   Verify: `errcheck` (golangci-lint v2.14.0 default settings, **no**
   `exclusions.presets: [std-error-handling]` and **no** blanket
   `exclude-functions` entry for `Close`) — the unchecked-return-value check
   fires on any bare `defer f.Close()`/`.Flush()`/`.Sync()` call by default
   in v2 (v1's automatic exclusion is gone). RUN: **yes** — red on
   `bad_write_close.go` (`Error return value of \`f.Close\` is not checked`),
   clean on `good_write_close.go`.

5. **A read-only handle's `Close` (`resp.Body.Close()`, any value statically
   typed `io.ReadCloser`) stays exempt from rule 4 via a targeted
   `errcheck.settings.exclude-functions: ["(io.ReadCloser).Close"]` entry —
   never via the `std-error-handling` exclusion preset.**
   Rationale: the preset's regex matches any `.*Close`/`.*Flush` call
   regardless of read/write, so enabling it to quiet legitimate read-path
   noise also blinds errcheck to rule 4's exact target.
   Verify: enable `exclusions.presets: [std-error-handling]` on a fixture
   with both a read-only and a write-path unchecked Close; confirm both
   disappear (proving the preset is unsafe here). Then replace it with
   `errcheck.exclude-functions: ["(io.ReadCloser).Close"]`; confirm only the
   read-only finding disappears. RUN: **yes** — both steps verified
   independently on `bad_readonly_close.go` + `bad_write_close.go`.

6. **`defer startTimer(x)` where `startTimer` returns a `func()` is a MUST-fix
   to `defer startTimer(x)()`.**
   Rationale: the former calls `startTimer` immediately and discards the
   returned cleanup closure entirely — it neither defers the intended call
   nor documents that it doesn't.
   Verify: `staticcheck` SA9010 (default-on, staticcheck 2026.2+ /
   golangci-lint ≥ v2.x bundling staticcheck ≥ 0.8.1 — an older bundled or
   standalone staticcheck will not have this check). RUN: **yes** — red on
   `bad_sa9010.go` (`SA9010: deferred return function not called`), clean on
   `good_sa9010.go`.

7. **A function that checks `err != nil` must not then `return nil`
   (`nilerr`), and a function must not return `(nil, nil)` as its "not
   found"/"no result" signal for a pointer or interface result type
   (`nilnil`) — use a sentinel or typed not-found error instead.**
   Rationale: the first silently converts a real failure into a reported
   success; the second is ambiguous to any caller that checks only
   `err != nil` before dereferencing.
   Verify: golangci-lint linters `nilerr` and `nilnil`, both explicitly
   enabled (neither is in the 5-linter default set). RUN: **yes** for both —
   red on `bad_nilerr.go`/`bad_nilnil.go`, clean on `good_nilerr.go`/`good_nilnil.go`.

8. **`gosec` G104 is not a substitute for errcheck and does not need separate
   configuration attention; do not budget review time expecting it to catch
   ignored errors errcheck missed.**
   Rationale: golangci-lint's own source documents G104 as "Duplicated
   errcheck checks. Errors unhandled." (its `legacy` exclusion preset entry,
   `EXC0008`), and it produced zero findings in this project's runs against
   several unchecked-error fixtures with `gosec` enabled and no G104
   exclusion configured.
   Verify: enable `gosec` alone against a fixture with several unchecked
   non-Close errors; confirm no G104 output. RUN: **yes** — `bad_recover_swallow.go`,
   `bad_exit_in_lib.go` (both with unchecked `os.Remove`) produced only
   `G107`/`G304` findings from gosec, never G104, in every run in this
   project.

9. **`recover` appears only inside a deferred function at a goroutine or
   public-API boundary, and it always does something with its result** (log
   it, convert it to a returned error, or deliberately re-panic) — never as
   ordinary control flow, and never a bare `recover()` whose value is
   thrown away.
   Rationale: Effective Go's own framing — recover exists to "shut down a
   failing goroutine... without killing the other executing goroutines," not
   to implement conditional logic.
   Verify (partial): a bare, uncaptured `recover()` statement is caught by
   `errcheck`'s ordinary unchecked-return-value rule with zero extra
   configuration. The stronger case — a *captured* recover whose value is
   never used — has no mechanical check; use the reading heuristic "every
   `recover()` call site's result is referenced in the same block."
   RUN: **yes**, for the bare-uncaptured case — red on
   `bad_recover_swallow.go` (`Error return value is not checked`), clean on
   `good_recover_log.go`. The captured-but-unused case was not planted as a
   separate fixture because no tool distinguishes it from the compliant
   shape; it is reading-only.

10. **Generated code (LLM output or otherwise) must never introduce
    `try(...)`/`?`-postfix error syntax or a project-local panic-based
    `must()` wrapper as though it were an established Go idiom.**
    Rationale: the Go team formally ended syntactic error-handling proposals
    in June 2025; no such syntax exists or is planned, and a `must()` helper
    reintroduces exactly the "panic on a runtime value" antipattern rule 1
    forbids unless its argument is provably a compile-time constant.
    Verify: `rg -n -e '\bfunc try\(' -e '\bfunc must\(' . --include='*.go'`
    (directory operand `.`, one `-e` per alternative) to find a
    hand-rolled helper, then read whether `must`'s argument is a literal or
    a runtime value. RUN: no (reading heuristic; there is no linter for a
    project inventing its own control-flow helper name).

## Verification runs

All commands run via `/home/mherwig/.cache/research-lang/go-tools/run.sh`
(Go 1.27.1, `GOTOOLCHAIN=local`, golangci-lint 2.14.0, staticcheck 2026.2.1 /
module 0.8.1) against
`/home/mherwig/.cache/research-lang/go-tools/fixtures/panics-exits-cleanup/`
(module `panicsexits`, `go 1.27`). `go build ./...` and `go vet ./...` both
exit 0 on the full fixture set (all files compile; nothing here is a vet
default finding).

Base `.golangci.yml` used for the multi-linter runs:

```yaml
version: "2"
linters:
  default: none
  enable:
    - errcheck
    - staticcheck
    - govet
    - gosec
    - revive
    - gocritic
    - nilerr
    - nilnil
  settings:
    errcheck:
      check-type-assertions: true
      check-blank: true
    revive:
      rules:
        - name: deep-exit
    gosec:
      excludes:
        - G115
issues:
  uniq-by-line: false
```

| # | fixture (violation) | command | exit (violation) | exit (twin) | relevant output |
|---|---|---|---|---|---|
| 1 | `bad_exit_in_lib.go` / `good_exit_in_lib.go` | `run.sh golangci-lint run --enable-only=revive ./...` with `revive.rules:[{name: deep-exit}]` | 1 | 0 | `bad_exit_in_lib.go:12:3: deep-exit: calls to os.Exit only in main() or init() functions (revive)` |
| 2 | `bad_fatal_after_defer.go` / `good_fatal_after_defer.go` | `run.sh golangci-lint run --enable-only=gocritic ./...` | 1 | 0 | `bad_fatal_after_defer.go:19:3: exitAfterDefer: log.Fatalf will exit, and \`defer os.Remove(f.Name())\` will not run (gocritic)` |
| 3 | `bad_write_close.go` / `good_write_close.go` | `run.sh golangci-lint run --enable-only=errcheck ./...` (no exclusions) | 1 | 0 | `bad_write_close.go:15:15: Error return value of \`f.Close\` is not checked (errcheck)`; 0 issues on `good_write_close.go` |
| 4 | `bad_readonly_close.go` under `exclusions.presets:[std-error-handling]` **and** `bad_write_close.go` under the same preset | `run.sh golangci-lint run --config=<preset-cfg> ./bad_readonly_close.go ./bad_write_close.go` | 0 (both silenced) | n/a | `0 issues.` — proves the preset also blinds rule 4; this run is a documented **non**-verification of the preset as a safe fix |
| 5 | same two files, `errcheck.exclude-functions:["(io.ReadCloser).Close"]` | `run.sh golangci-lint run --config=<exclude-cfg> ./bad_readonly_close.go ./bad_write_close.go` | 1 | n/a | only `bad_write_close.go:15:15: ... f.Close ...` remains; `resp.Body.Close` finding gone — proves the targeted exclude is the safe fix |
| 6 | `bad_sa5001.go` / `good_sa5001.go` | `run.sh golangci-lint run --enable-only=staticcheck ./...` | 1 | 0 | `bad_sa5001.go:11:2: SA5001: should check error returned from os.Open() before deferring f.Close() (staticcheck)` |
| 7 | `bad_sa9010.go` / `good_sa9010.go` | `run.sh golangci-lint run --enable-only=staticcheck ./...` | 1 | 0 | `bad_sa9010.go:16:2: SA9010: deferred return function not called (staticcheck)` |
| 8 | `bad_nilerr.go` / `good_nilerr.go` | `run.sh golangci-lint run --enable-only=nilerr ./...` | 1 | 0 | `bad_nilerr.go:11:3: error is not nil (line 9) but it returns nil (nilerr)` |
| 9 | `bad_nilnil.go` / `good_nilnil.go` | `run.sh golangci-lint run --enable-only=nilnil ./...` | 1 | 0 | `` bad_nilnil.go:14:3: return both a `nil` error and an invalid value: use a sentinel error instead (nilnil) `` |
| 10 | `bad_recover_swallow.go` / `good_recover_log.go` | `run.sh golangci-lint run --enable-only=errcheck ./...` | 1 | 0 | `bad_recover_swallow.go:10:10: Error return value is not checked (errcheck)` |
| 11 | `bad_exit_in_lib.go` + `bad_fatal_after_defer.go`, revive+gocritic together, default `uniq-by-line` | `run.sh golangci-lint run ./...` (base config above, `uniq-by-line` at its **true** default) | 1 | n/a | `deep-exit` reported at `bad_exit_in_lib.go:12:3`; `gocritic`'s `exitAfterDefer` at the **same line is absent** from the combined report despite being present when gocritic runs alone — demonstrates the dedup |
| 12 | same two files, `issues.uniq-by-line: false` added | `run.sh golangci-lint run ./...` (base config, as written above) | 1 | n/a | both `revive: deep-exit` and `gocritic: exitAfterDefer` now appear for `bad_exit_in_lib.go:12:3` and (for the fatal case) `bad_fatal_after_defer.go:19:3` |
| 13 | `bad_exit_in_lib.go`, `os.Remove` unchecked | `run.sh golangci-lint run --enable-only=gosec ./...` | 0 (no gosec finding on this line) | n/a | gosec produced 0 findings tied to the unchecked `os.Remove`/`f.Close`/`recover()` sites anywhere in the fixture set in any run — **not a red case**: this row documents that gosec G104 never fires here, reported as such per the brief's instruction to report a non-red verification honestly. Cause: golangci-lint's bundled gosec never surfaces G104 (documented "duplicated errcheck check", `legacy` preset `EXC0008`) |
| 14 | `bad_panic_input.go` / `good_panic_input.go` | (no command — no linter in the roster targets this shape) | n/a | n/a | **not red**: `go vet`, `staticcheck`, `errcheck`, `revive`, `gocritic`, `gosec`, `nilerr`, `nilnil` all report 0 issues on `bad_panic_input.go`. Reading heuristic only, reported as such |
| 15 | `bad_must_runtime.go` / `good_must_constant.go` | (no command — same reason) | n/a | n/a | **not red**, same reason as row 14 |

Row 4 is deliberately reported as a **negative result presented as a
positive-looking exit code**: `golangci-lint` exits 0 ("clean") on both
files under the `std-error-handling` preset, but that 0 is the *problem* —
it proves the preset over-suppresses, not that the code is correct. Rows
14–15 are the brief's explicitly-requested "record which case nothing
catches" outcomes.

## Exemplar evidence

| candidate | satisfies | violates / contradicts |
|---|---|---|
| Rule 1 (panic policy) | `cockroachdb/pebble@13596f1e1cea:get.go:26-28`, `:snapshot.go:46-47` (API-misuse-after-Close, sentinel/AssertionFailedf shapes); `caddyserver/caddy@54937914234b:modules.go:140-158` (registration-time misuse panic) | none found in spot-reads; `p.errorf` sites in `metamorphic/parser.go` are tool/test-harness code, outside the library's public API surface, so not a counterexample |
| Rule 2 (no exit outside main) | n/a by construction in a correct codebase | 285 `os.Exit` + 359 `log.Fatal*` outside `main`, heaviest in `golang/tools` (48+122), `tailscale/tailscale` (35+94), `etcd-io/etcd` (88+13) ([shape](../go-audit/exemplar-code-shape.md) §4) — a real, wide surface, not a fixture-only concern |
| Rule 4/5 (write-close shape, read-only exemption) | `aquasecurity/trivy@ae561f8cca36:pkg/rpc/client/client.go:149` and `sonatype.go:100` (`defer resp.Body.Close()`, read path, trivy's own `.golangci.yaml:21-23` enables `errcheck` with `check-blank: true` and carries **no** `std-error-handling` preset or `exclude-functions` entry — meaning, per rule 5's finding, trivy's own CI is either accepting this as latent errcheck debt or the file is outside its lint scope; not independently confirmed which) | `cli__cli/.golangci.yml:30` has `errcheck` **commented out entirely** (`# - errcheck`), sidestepping the read/write-close question altogether rather than resolving it — the corpus does not show a repo that both enables errcheck strictly and explicitly, correctly exempts only read-only closes the way rule 5 recommends |
| Rule 6 (SA9010) | none — the check is new in staticcheck 2026.2, postdating this corpus's SHAs; no exemplar was scanned with a version new enough for this to be measurable pre-fixture | — |
| Rule 7 (nilerr/nilnil) | `nilerr` fired 0/2/2 in the strict 3-repo `default: all` run — signal-clean on real code ([gates](../go-audit/exemplar-quality-gates.md) §5) | none of the 23 configured repos enables either `nilerr` or `nilnil` explicitly (absent from the consensus-linter table, [gates](../go-audit/exemplar-quality-gates.md) §1) — both are correct, quiet, and universally under-adopted |
| Rule 9 (recover boundary) | `caddyserver/caddy@54937914234b:modules/caddypki/maintain.go:27-32` and 5 further sites in the same repo (`caddytls/tls.go:445,968`, `sessiontickets.go:124`, `distributedstek/distributedstek.go:209`, `standardstek/stek.go:86`, `caddyhttp/reverseproxy/{healthchecks.go:273,metrics.go:63}`) — every one logs the recovered value with a stack trace, none discards it | 138 total `recover` sites vs 4,355 `panic` sites ([run](../go-audit/exemplar-runtime-posture.md) §1) means most panics in this corpus are never recovered anywhere — consistent with rule 1 (most are deliberate, uncaught invariant violations meant to crash the process) but worth remembering when reading a raw panic count as a defect list |

## AI-agent angle

- **Suggesting `panic` for input validation.** An LLM asked to "validate this
  argument" reaches for `panic(fmt.Sprintf(...))` because it reads as
  assertive and Python/Java-`raise`-shaped. Smallest check: the reading
  heuristic in rule 1 — does the panic argument trace to a function
  parameter? If yes, it is almost always wrong; rewrite to `(T, error)`.
- **Wrapping `os.Exit`/`log.Fatal` inside a helper function "for
  convenience."** Models trained on tutorial-style single-file programs
  default to `log.Fatal` anywhere an error is unrecoverable, including
  inside a package meant to be imported. Smallest check: `revive` with
  `deep-exit` explicitly enabled (it is not on by default) — catches this
  mechanically, no reading required.
- **`defer f.Close()` with no error handling at all**, because pre-2026
  training data is full of golangci-lint v1-era codebases where this was
  invisible (v1's default `EXC0001` exclusion silently absorbed it). A model
  trained on that corpus reproduces the bare form confidently, and it will
  *look* clean against an old-style config. Smallest check: run errcheck
  under golangci-lint v2 defaults (**no** `std-error-handling` preset) — it
  fires on every such call now; this is the single highest-value mechanical
  check in this whole subarea because it silently regressed for every repo
  that upgraded golangci-lint major versions without updating its config.
- **Reaching for `try`/`?`-style syntax or a hand-rolled `must()` panic
  wrapper**, because both were live, actively-discussed Go proposals for
  years and appear in pre-2025 blog posts, forum threads and — critically —
  in training-data code samples written *as if* the proposal had landed.
  Smallest check: `rg -n -e '\bfunc try\(' -e '\bfunc must\(' . --include='*.go'`
  finds a hand-rolled helper; then check whether `error-syntax`'s June 2025
  closure is reflected in the surrounding advice a model gives — if it
  presents `try`/`?` as upcoming or planned, that claim is now over a year
  stale.
- **Treating `errcheck`'s default exclude list as covering `net/http`
  response bodies**, because plenty of pre-v2 example code and blog posts
  say "Close on a response body is exempt" without naming the mechanism.
  A model asked to write a lint config may omit any exclusion at all
  (assuming errcheck "just knows"), or — worse — reach for the blanket
  `std-error-handling` preset because its name sounds exactly right, not
  realizing it also exempts writable-path closes. Smallest check: the
  targeted `errcheck.exclude-functions: ["(io.ReadCloser).Close"]` entry
  from rule 5, verified to preserve the write-close signal.
- **Recovering a panic and doing nothing with it** ("just so the program
  doesn't crash"), a defensive-programming reflex from other languages'
  bare `except: pass`. Smallest check: the bare-uncaptured-`recover()`
  errcheck signal from rule 9 catches the crudest version mechanically;
  everything else needs the reading heuristic (does the captured value get
  used?).
- **`nilnil` as a deliberate "no result, no error" convenience return**,
  because it *compiles* and *looks* like Python/Go's `(None, None)` idiom
  transplanted. Smallest check: `nilnil` itself, enabled explicitly (it is
  not a default-on linter, so a model that "already ran the linters" may
  not actually have run this one).

## Contested / evolving

- **Whether `net/http`'s own panic-recovery-per-request-handler is a good
  pattern to imitate.** Google's Best Practices calls it "a design error"
  that produces unhandled stack traces in production
  ([Best Practices §Program checks and panics](https://google.github.io/styleguide/go/best-practices#program-checks-and-panics)),
  while the measured exemplar behaviour (caddy, and by extension most
  HTTP frameworks built on `net/http`) still relies on exactly this
  server-level recovery as a safety net *underneath* the handler-level
  `recover` sites in [§7](#7-where-recover-belongs). As of 2026-09-26 this
  is unresolved in practice: treat handler-level panic recovery as
  defense-in-depth, never as the primary error-handling mechanism, and keep
  writing explicit `recover` at any goroutine your own code spawns off the
  request path (the server's blanket recovery does not reach those).
- **The `std-error-handling`/`common-false-positives`/`legacy` presets vs.
  targeted `exclude-functions` entries, as a general config philosophy** —
  this rule set resolves it narrowly (targeted exclude wins for Close/Flush,
  because a preset is unsafe here), but the broader "prefer presets for
  velocity vs. targeted excludes for precision" question is unsettled
  upstream; golangci-lint's own open issues
  ([golangci/golangci-lint#5298](https://github.com/golangci/golangci-lint/issues/5298),
  [#5297](https://github.com/golangci/golangci-lint/issues/5297)) show the
  maintainers actively redesigning the exclusions section as of the v2 line
  and have not converged on a final shape.
- **`nilnil`'s `--detect-opposite` mode** (flagging a *non-nil* error
  returned alongside a non-nil value) is off by default and not adopted in
  any exemplar found; whether the fleet should turn it on is genuinely
  undecided — it catches real bugs (the linter's own kubernetes example) but
  at a cost of flagging some legitimate "partial result plus error" APIs
  that intentionally return both.
- **SA9010 is too new to have exemplar-corpus ground truth.** Every SHA in
  this corpus was fetched 2026-09-26 against repositories that may not yet
  be linted with a staticcheck new enough to catch this shape in their own
  CI; absence of SA9010 findings in the corpus's own lint output is not
  evidence the pattern doesn't occur there, only that it has not yet been
  checked for.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [go.dev/doc/effective_go#panic](https://go.dev/doc/effective_go#panic) | Go team, official language guide, Panic and Recover sections | evergreen, current 2026-09-26 | primary source for panic policy and the canonical `safelyDo` recover pattern |
| [go.dev/blog/defer-panic-and-recover](https://go.dev/blog/defer-panic-and-recover) | Go blog, original defer/panic/recover explainer | 2010, still linked from current docs | the three defer-evaluation-order rules, and the standard-library-internal-panic-external-error framing |
| [google.github.io/styleguide/go/decisions#dont-panic](https://google.github.io/styleguide/go/decisions#dont-panic) | Google Go Style Guide, Style Decisions | current, actively maintained | names `log.Exit`/`log.Fatalf` explicitly as the `main`-only alternative to panic |
| [google.github.io/styleguide/go/best-practices#program-checks-and-panics](https://google.github.io/styleguide/go/best-practices#program-checks-and-panics) | Google Go Style Guide, Best Practices | current | the sharpest normative statement on why `log.Fatal` beats `panic` even for "impossible" conditions, and calls out `net/http`'s handler recovery as a design mistake |
| [go.dev/blog/error-syntax](https://go.dev/blog/error-syntax) | Go blog, Robert Griesemer, "Go's Error Handling Syntax" | 2025-06-03 | primary, dated source that the try/?/check-handle line of proposals is formally over |
| [kisielk/errcheck README.md](https://raw.githubusercontent.com/kisielk/errcheck/master/README.md) | errcheck's own repository docs | current (`master`), requires Go ≥1.25 | `-blank`/`check-blank`, `-exclude`/`exclude-functions` semantics, default exclude-list scope |
| `kisielk/errcheck@v1.20.0:errcheck/excludes.go` | errcheck's own source, the actual `DefaultExcludedSymbols` list | pinned module version bundled in golangci-lint 2.14.0 | ground truth that `net/http`/`os.File`/`os.Remove` are **not** in the shipped default excludes — read the code, not a summary |
| [staticcheck.dev/docs/checks/#SA5001](https://staticcheck.dev/docs/checks/#SA5001) and [#SA9010](https://staticcheck.dev/docs/checks/#SA9010) | staticcheck's own check documentation | SA5001 since 2017.1, SA9010 since 2026.2 | exact wording and code examples for both checks, and SA9010's version floor |
| [mgechev/revive RULES_DESCRIPTIONS.md](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md) | revive's own rule catalogue | current (`master`) | `deep-exit`'s exact wording; confirms it is a named, opt-in rule, not a default |
| [go-critic.com/overview.html](https://go-critic.com/overview.html) | go-critic's own checker catalogue | current | `exitAfterDefer`'s exact before/after example, confirms `#diagnostic`-tag default-on status |
| [Antonboom/nilnil README.md](https://raw.githubusercontent.com/Antonboom/nilnil/master/README.md) | nilnil's own repository docs | current (`master`) | the exact motivation, the stdlib's own apologetic doc-comment example, `--detect-opposite` |
| [gostaticanalysis/nilerr README.md](https://raw.githubusercontent.com/gostaticanalysis/nilerr/master/README.md) | nilerr's own repository docs | current (`master`) | both directions of the check, the `//lint:ignore` escape hatch |
| [pkg.go.dev/os#File.Close](https://pkg.go.dev/os#File.Close) / [#File.Sync](https://pkg.go.dev/os#File.Sync) | Go standard library reference | current, Go 1.27.1 | exact doc wording for why a deferred, unchecked Close on a writable file is unsafe |
| [ldez, "Welcome to golangci-lint v2", 2025-03-23](https://ldez.github.io/blog/2025/03/23/golangci-lint-v2/) | official golangci-lint v2 announcement, by the tool's lead maintainer | 2025-03-23 | primary, dated source for "there are no exclusions by default" in v2 |
| `golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go` | golangci-lint's own source, exact preset regexes and their `EXC00xx` history, plus the explicit "Duplicated errcheck checks" comment on gosec G104 | pinned exemplar SHA, tool version 2.14.0-era | ground truth for the `std-error-handling`/`common-false-positives`/`legacy` preset contents used to derive rules 4, 5 and 8 |
| [100go.co](https://100go.co/) | "100 Go Mistakes and How to Avoid Them", companion site | book/site, actively referenced 2026 | mistakes #48 (panicking sparingly), #53 (explicit blank identifier for deliberate discards), #54 (defer-error handling) in the exact wording used for rules 1 and the discard classification in §3 |

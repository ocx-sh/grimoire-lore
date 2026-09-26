---
title: "Era idioms, what go fix owns, and the go-upgrade procedure"
topic: go-language/era-and-modernizers
agent: language/era-and-modernizers (wave 3)
model: sonnet
date_researched: 2026-09-26
sources_count: 21
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/era-and-modernizers/
scope: >
  Covers which pre-1.22-era idioms `go fix`'s 26 registered analyzers rewrite
  unattended and which the GO-LANG rule set must still state itself; the
  go-line/toolchain gating that makes several fixers and stdlib APIs silently
  no-op below their floor; GOEXPERIMENT pin staleness; and the ordered
  go-upgrade procedure. Does not cover the golangci-lint config or the
  go-fix-as-gate verdict (settled in go-gates.md, GO-GATE-01/03, cited not
  re-decided), stdlib behavioral semantics of json/v2, map order, time, runes,
  rand or uuid (owned by the sibling `language/stdlib-semantics` dive), or the
  govulncheck/dependency-triage half of go-upgrade (GO-MOD, folded from M-P-04).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The 26 fixers, what each rewrites, and which ones self-limit](#1-the-26-fixers-what-each-rewrites-and-which-ones-self-limit)
   2. [Fresh census: `go fix -diff` on the 12 CI-green repos, bucketed by fixer](#2-fresh-census-go-fix--diff-on-the-12-ci-green-repos-bucketed-by-fixer)
   3. [Go-line and file-line gating: the load-bearing mechanism](#3-go-line-and-file-line-gating-the-load-bearing-mechanism)
   4. [GODEBUG history and the go.work vs go.mod godebug precedence trap](#4-godebug-history-and-the-gowork-vs-gomod-godebug-precedence-trap)
   5. [SA1019 and the deprecated-API residue go fix does not touch](#5-sa1019-and-the-deprecated-api-residue-go-fix-does-not-touch)
   6. [GOEXPERIMENT pins and the defaults that overtook them](#6-goexperiment-pins-and-the-defaults-that-overtook-them)
   7. [dependabot-core and the `go`/`toolchain` line](#7-dependabot-core-and-the-gotoolchain-line)
   8. [Recent language additions: SHOULD vs CONSIDER, dated](#8-recent-language-additions-should-vs-consider-dated)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `go fix -diff ./...` is the modernization gate (settled, GO-GATE-03); this dive's job is which of its 26 fixers' rewrites the GO-LANG rule set must still explain, and which need zero prose because the tool is self-explanatory and self-limiting.
- All 26 registered `go fix` analyzers, fetched live from `go tool fix help`: `any`, `atomictypes`, `buildtag`, `embedlit`, `errorsastype`, `forvar`, `hostport`, `inline`, `mapsloop`, `minmax`, `newexpr`, `omitzero`, `plusbuild`, `rangeint`, `reflecttypefor`, `slicesbackward`, `slicescontains`, `slicessort`, `stditerators`, `stringsbuilder`, `stringscut`, `stringscutprefix`, `stringsseq`, `testingcontext`, `unsafefuncs`, `waitgroupgo`.
- Every fixer that can change observable behavior declines the risky case by construction, verified live on planted fixtures: `minmax` never fires on floating types (NaN); `rangeint` never fires when the loop body mutates the index or the limit; `stringsseq` never fires when the split result is stored and ranged more than once; `mapsloop`→`maps.Clone` preserves nilness; `omitzero` applies only the behavior-preserving half (deleting the no-op tag) by default and logs the declined risky half to stderr.
- `forvar` (loop-variable copy removal) and `errorsastype` are gated per module `go` line, not just "available since": a fixture with an identical source tree fires under `go 1.22`/`go 1.26` and silently produces an empty diff one line below (`go 1.21`/`go 1.25`) — confirming GO-ERR-04's floor claim from the fixer side, not just the API side.
- `io/ioutil`'s deprecated wrappers (`TempFile`, `TempDir`, `ReadFile`, `ReadAll`, `WriteFile`, `Discard`, `NopCloser`) themselves carry `//go:fix inline` directives in the stdlib source (`io/ioutil/tempfile.go:25,42`, `io/ioutil/ioutil.go:28,40,51,97`); the generic `inline` fixer, not a dedicated `ioutil` fixer, is what migrates these calls — and it too is file-go-line-gated, confirmed live: it declined on `stretchr/testify@87a7b9d57689:internal/spew/spew_test.go:110,123` ("into a file using go1.17") and on `google/go-cmp@b133f1f1932e:cmp/cmpopts/ignore.go:103` ("into a file using go1.21").
- **Surprise, corrects the map's framing:** `asynctimerchan` (Go 1.23's opt-in timer-channel change) is a *removed* GODEBUG setting as of Go 1.27 (go1.26, go1.27 release notes). On the 1.27.1 toolchain used here, a module whose `go` line is `1.22` and one whose `go` line is `1.23` both measure `cap(t.C) == 0` for a fresh `time.Timer` — the release-note gate ("new behavior only when go.mod specifies go 1.23.0 or later") only held on toolchains 1.23–1.26; Go 1.27 hard-codes the new behavior unconditionally, and setting `GODEBUG=asynctimerchan=1` in the environment is now a fatal-error trap, not a revert.
- **Surprise:** in workspace mode, a member module's own `godebug default=…` line in its `go.mod` is silently and completely ignored — only `go.work`'s `godebug` block is consulted. `GOWORK=off` flips this: the member's own line is then honored and the workspace's is invisible. Verified live with `go list -f '{{.DefaultGODEBUG}}'`: in-workspace shows only the two settings `go.work`'s `default=go1.26` changes from the 1.27.1 baseline; `GOWORK=off` shows the full set of settings the member's `default=go1.21` changes.
- dependabot-core does **not** open a PR whose sole purpose is bumping the `go` or `toolchain` line ([dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520), open feature request as of 2026-09-26). It *does* let the underlying `go get`/`go mod tidy` step rewrite the `go` line as a side effect of a dependency bump that requires it, since [dependabot-core#12228](https://github.com/dependabot/dependabot-core/issues/9527) (linked, merged) removed the code that used to revert that edit; before that fix, dependabot silently reverted the Go tool's own line update and produced an unbuildable diff.
- Dependabot's grouping applies to *dependencies* by name pattern; the `go`/`toolchain` line is not a dependency and cannot be targeted by a group — it rides along, unlabeled, inside whichever dependency's PR happened to trigger the bump. The go-upgrade procedure must not assume a labeled "go version" PR will ever appear on its own.
- The rule set states itself, rather than delegating to `go fix`: generics-adoption restraint (no fixer decides *whether* to add a type parameter), the iterator-authoring stop contract (no fixer writes new `iter.Seq` producers), the class of stdlib behavior changes that arrive with zero compile error on a version bump (`M-A-13`; nothing mechanically enforces reading the release notes), and the ordered go-upgrade procedure itself.
- The rule set delegates wholly to `go fix -diff` as CI gate: every mechanical rewrite the 26 fixers cover, including `any`, `rangeint`, `minmax`, `mapsloop`, `slicessort/backward/contains`, `stringsbuilder/cut/cutprefix/stringsseq`, `atomictypes`, `reflecttypefor`, `waitgroupgo`, `errorsastype`, `newexpr`, `embedlit`, `testingcontext`, `unsafefuncs`, `hostport`, `plusbuild`, `forvar`, and the safe half of `omitzero`.
- Generic methods (1.27), struct-literal field selectors / `embedlit` (1.27) and self-referential constraints (1.26) are CONSIDER, dated 2026, and gated behind a `go` line most fleet libraries do not carry yet (owner Q1's default floor is `go 1.26.0`, one release behind generic methods). `new(expr)` (1.26) is SHOULD once the floor allows it — it removes a whole class of `func varOf(x T) *T { return &x }` wrapper functions the SDK's JSON envelope needs for optional fields, and `go fix`'s `newexpr` fixer finds and inlines them automatically.
- The ordered go-upgrade procedure (release notes → GODEBUG diff → go/toolchain bump → `go fix` → `stdversion` → golangci pin/config bump → GOEXPERIMENT audit → gate) is stated in full in Findings §8 and Normative Guidance §10, each step with its own check.

## Findings

### 1. The 26 fixers, what each rewrites, and which ones self-limit

Fetched live, 2026-09-26, `go1.27.1`: `run.sh go tool fix help` lists the registered analyzers; `run.sh go tool fix help <name>` gives each one's own documentation. All 26, with the Go version each rewrite targets and whether the fixer's own text names a self-limiting condition:

| Fixer | Rewrites | Targets | Self-limits (own text) |
|---|---|---|---|
| `any` | `interface{}` → `any` | 1.18 | none named |
| `atomictypes` | `sync/atomic` primitive funcs → `atomic.Int32` etc. types | 1.19 | none named |
| `buildtag` | checks `//go:build`/`// +build` consistency (diagnostic only, vet-shared) | — | n/a (no fix; see GO-GATE) |
| `embedlit` | drops redundant embedded-field literal nesting | 1.27 | none named |
| `errorsastype` | `errors.As(err,&t)` two-step → `errors.AsType[T](err)` | 1.26 | only when the `var` form matches exactly and `t` is unused outside the `if` |
| `forvar` | removes `x := x` loop-variable copies | 1.22 | only inside `range` loops (not 3-clause `for`) |
| `hostport` | `fmt.Sprintf("%s:%d",…)` → `net.JoinHostPort` | pre-1.0 API, fixer is new | none named beyond pattern match |
| `inline` | applies `//go:fix inline` directives everywhere | — | never inlines a call inside that function's own dedicated test; skips `defer`-bearing calls in batch mode; **gated by the target file's own Go version**, confirmed live (§3) |
| `mapsloop` | explicit `for k,v := range src { dst[k]=v }` → `maps.Copy`/`Insert`/`Clone`/`Collect` | 1.23 | `maps.Clone` applied "conservatively" — **preserves source nilness**, own text flags this as a possible subtle behavior change if the caller relied on non-nil |
| `minmax` | `if a<b {x=a} else {x=b}` → `x=min(a,b)` | 1.21 | **excludes floating-point types**, own text: "the behavior of min/max with NaN values can differ from the original if/else statement" |
| `newexpr` | wrapper funcs `func f(x T) *T { return &x }` → `new(x)` calls, marks the wrapper `//go:fix inline` | 1.26 | none named |
| `omitzero` | `omitempty` on a struct-typed field → delete the no-op tag, or (declined by default) `omitzero` | 1.24 (tag) | **the risky alternative is never applied unattended**; only reachable if the field's type already has a working `IsZero() bool` (verified live, §2) |
| `plusbuild` | removes obsolete `//+build` lines beside a `//go:build` line | 1.17+ | does not check tag consistency (that's `buildtag`) |
| `rangeint` | 3-clause counting `for` → `for i := range n` | 1.22 | **only if the index is not mutated in the body and the limit expression is not mutated** (verified live, §2) |
| `reflecttypefor` | `reflect.TypeOf(x)`/`.Elem()` forms → `reflect.TypeFor[T]()` | 1.22 | skips when the runtime type is dynamic (a variable of interface type) or the operand has side effects |
| `slicesbackward` | manual backward index loop → `slices.Backward` | 1.23 | none named |
| `slicescontains` | manual membership loop → `slices.Contains`/`ContainsFunc` | 1.21 | flags (does not block) a side-effecting target expression |
| `slicessort` | `sort.Slice` on a basic ordered type → `slices.Sort` | 1.21 | applies only to "basic ordered types" |
| `stditerators` | `for i:=0;i<x.Len();i++ { x.At(i) }` → range over the type's own iterator | 1.23 (`iter`) | limited to "various well-known types in the standard library" |
| `stringsbuilder` | repeated `s += x` → `strings.Builder` | 1.10 (API), fixer is new | skipped inside tests; requires all uses of `s` before final use to be `+=`; requires `s` to be a local variable |
| `stringscut` | `strings.Index`+slice, `SplitN(...)[0]` → `strings.Cut` | 1.18 | only when `idx`/`s`/`substr` are not modified between definition and use; not offered when `sep` is a variable or empty string |
| `stringscutprefix` | `HasPrefix`+`TrimPrefix` (or Suffix) → `CutPrefix`/`CutSuffix` | 1.20 | none named |
| `stringsseq` | `for range strings.Split(...)` → `for range strings.SplitSeq(...)` | 1.24 | **only fires on the single-pass `for range Split(...)` form**, not on a stored slice ranged more than once (verified live, §2) |
| `testingcontext` | `context.WithCancel(context.Background())` in tests → `t.Context()` | 1.24 | only when `cancel` is unused elsewhere |
| `unsafefuncs` | pointer-arithmetic idioms → `unsafe.Add` etc. | 1.17 | none named |
| `waitgroupgo` | `wg.Add(1); go func(){defer wg.Done(); …}()` → `wg.Go(func(){…})` | 1.25 | none named |

**The rule set's job is small on purpose.** Every row above whose "self-limits" cell names a real constraint is a case an agent must not "fix by hand" more aggressively than the tool does — e.g. an agent must not manually rewrite an `if a<b{x=a}else{x=b}` on `float64` operands to `min(a,b)`, because the tool's own authors excluded exactly that case for a documented reason (NaN). This is stated as GO-LANG-04 below rather than left implicit.

### 2. Fresh census: `go fix -diff` on the 12 CI-green repos, bucketed by fixer

[exemplar-code-shape.md §7](../go-audit/exemplar-code-shape.md) ran `golang.org/x/tools/cmd/modernize` (the analysis library `go fix` is also built on) over the same 12 CI-green repos and found 491 diagnostics / 183,100 production LOC (26.8/10k), 62% `interface{}`→`any`. This dive re-ran the equivalent census with `go fix`'s own driver directly — `go vet -vettool=$(go tool -n fix) ./...`, which reports every fixer's diagnostics without writing anything, so it is safe to run read-only inside the exemplar clones — on the same 12 repos (`uber-go/zap`, `google/go-containerregistry`, `golang/vuln`, `oras-project/oras-go`, `junegunn/fzf`, `charmbracelet/bubbletea`, `urfave/cli`, `stretchr/testify`, `google/go-cmp`, `ko-build/ko`, `spf13/cobra`, `regclient/regclient`), 2026-09-26, go1.27.1:

| category (message text) | count |
|---|---|
| `interface{}` can be replaced by `any` | 250 |
| `Omitempty` has no effect on nested struct fields | 24 |
| Constant `reflect.Ptr` should be inlined | 24 |
| for loop can be modernized using range over int | 23 |
| Replace `m[k]=v` loop with `maps.Copy` | 18 |
| copying variable is unneeded (`forvar`) | 14 |
| backward loop over slice → `slices.Backward` | 12 |
| Loop can be simplified using `slices.Contains` | 11 |
| if statement can be modernized using `min`/`max` | 13 |
| Goroutine creation can be simplified using `WaitGroup.Go` | 8 |
| `string += string` in a loop is inefficient | 7 |
| `errors.As` can be simplified using `AsType[T]` | 15 |
| `+build` line is no longer needed | 7 |
| `strings.Cut`-family simplifications | 9 |
| atomic int → `atomic.IntN` type | 5 |
| `reflect.TypeOf` → `TypeFor` | 2 |
| `Ranging over {Fields,Split}Seq` is more efficient | 3 |
| `HasPrefix`+`TrimPrefix` → `CutPrefix` | 2 |
| `pointer + integer` → `unsafe.Add` | 2 |
| `context.WithCancel` → `t.Context` (test) | 1 |
| **cannot inline (declined, file below floor)** | 2 |
| **Total** | 459 |

Counts differ from `modernize`'s 491 because `go fix`'s driver ships four fixers `modernize` predates (`atomictypes`, `embedlit`, `slicesbackward`, `unsafefuncs`, per the [go1.27 release notes](https://go.dev/doc/go1.27)) and one it dropped (`fmtappendf`, removed in 1.27 "due to stylistic concerns") — the two tools are not identical censuses, only overlapping ones, which the rule set should not conflate.

**The two "cannot inline" lines are the finding this re-measurement adds.** `go vet -vettool=$(go tool -n fix)` reported, verbatim:
```
google__go-cmp/cmp/cmpopts/ignore.go:103:46: cannot inline call to reflect.PtrTo (declared using go1.27.1) into a file using go1.21
stretchr__testify/internal/spew/spew_test.go:110:34: cannot inline call to ioutil.TempFile (declared using go1.27.1) into a file using go1.17
stretchr__testify/internal/spew/spew_test.go:123:24: cannot inline call to ioutil.ReadFile (declared using go1.27.1) into a file using go1.17
```
`google/go-cmp`'s `go.mod` declares `go 1.21`; `stretchr/testify`'s declares `go 1.17` ([google/go-cmp@b133f1f1932e:go.mod:3](https://github.com/google/go-cmp), [stretchr/testify@87a7b9d57689:go.mod:3](https://github.com/stretchr/testify)). `go fix`'s `inline` analyzer refuses to rewrite a call whose replacement body needs a newer language version than the calling file's own floor — it is not merely "available since 1.22/1.26", it actively declines below that line, on real exemplar code, in the same run that applies every other fixer's finding. This is the mechanism behind GO-CORE-04 ("read the `go` line first") for the modernization step specifically, not just a general caution.

### 3. Go-line and file-line gating: the load-bearing mechanism

Four planted fixtures under `fixtures/era-and-modernizers/`, each a minimal module rebuilt at two `go` lines, confirm the gating is real and mechanical, not advisory:

- **`loopvar-1.21-to-1.22/`** — identical source (a `v := v` copy load-bearing for a goroutine closure) at `go 1.21` vs `go 1.22`. `go fix -diff` exits `0` (no finding) at `1.21` and exits `1` (flags the copy as dead code) at `1.22`. Applying the fix and running `go test -count=10 ./...` at `1.22` confirms per-iteration capture holds without the copy — this is the mechanical form of GO-LANG's "is a loop-variable copy dead code" question (`M-A-02`), answered by the fixer itself, module-line-scoped.
- **`generic-methods-and-newexpr/`** — a method declaring its own type parameter (`func (b Box[T]) MapTo[U any](f func(T) U) Box[U]`) builds at `go 1.27`, fails at `go 1.26` with `generic method requires go1.27 or later (-lang was set to go1.26; check go.mod)`. A separate `new(yearsSince(n))` call builds at `go 1.26`, fails at `go 1.25` with `new(yearsSince(n)) requires go1.26 or later (-lang was set to go1.25; check go.mod)`. Both are compiler-level `-lang` checks, independent of any linter.
- **`misc-fixers/`** — `errors.As(err,&myerr)` at `go 1.25` produces an empty `go fix -diff` (the fixer's own target API, `errors.AsType`, requires 1.26 and the fixer will not write a call the module cannot compile); bumping the same source to `go 1.26` makes `errorsastype` fire and apply cleanly. This directly demonstrates GO-ERR-04's floor claim from the *fixer* side: it is not just that hand-written `AsType` fails to compile below 1.26 ([go-errors.md GO-ERR-04](../go-errors.md)), it is that `go fix` itself will not introduce that failure.
- **`timer-channel-1.22-vs-1.23/`** — see §4 for why this one produced a different answer than expected.

**Consequence for the rule set:** "go fix is safe to run unattended" (GO-GATE-03) is true precisely *because* of this gating, not despite it — every fixer that could introduce a compile failure or a real behavior change either declines by pattern (§1) or declines by floor (this section). The go-upgrade procedure's "run `go fix`" step (§8) must run *after* the `go`/`toolchain` bump, not before, or these declines silently under-modernize a codebase that could already support the newer rewrite.

### 4. GODEBUG history and the go.work vs go.mod godebug precedence trap

Fetched from [go.dev/doc/godebug](https://go.dev/doc/godebug) and the [go1.22](https://go.dev/doc/go1.22) through [go1.27](https://go.dev/doc/go1.27) release notes, cross-checked against the running toolchain:

- **Removed in Go 1.27** (the setting no longer has any effect, and naming it at its old value in `GODEBUG` or a `godebug` line is a hard build error): `asynctimerchan`, `tlsunsafeekm`, `tlsrsakex`, `tls10server`, `tls3des`, `x509keypairleaf`, `gotypesalias` ([go1.26](https://go.dev/doc/go1.26) names these "to be removed in Go 1.27"; [go1.27](https://go.dev/doc/go1.27) confirms the removal). Already settled as GO-MOD-04; this dive's fixtures exercise the modernization-adjacent one, `asynctimerchan`, specifically.
- **Surprise, corrects the map's framing of `M-A-13`'s "timer channels unbuffered since 1.23" example.** Planted `timer-channel-1.22-vs-1.23/go122` and `.../go123`, identical `time.NewTimer` probe, `go` lines `1.22` and `1.23` respectively, both built with the 1.27.1 toolchain: **both** report `cap(t.C) == 0`. The release note's gate ("new behavior only enabled when go.mod specifies go 1.23.0 or later") described toolchains **1.23 through 1.26**; on **1.27**, "the new behavior applies regardless of GODEBUG setting or go.mod language version" ([go1.26](https://go.dev/doc/go1.26)), so there is no `go` line on a 1.27.1 toolchain that still exhibits the old buffered-channel behavior — confirmed by the fact that setting the environment variable is now a fatal error: `fatal error: removed GODEBUG "asynctimerchan" set to old value "1" in environment (https://go.dev/doc/godebug#go-127)`. **For the go-upgrade procedure this means: a repo upgrading straight from a pre-1.23 toolchain to 1.27 skips the whole "watch it under the new default" observation window** — there is no toolchain left on which the old behavior can even be requested for a side-by-side comparison; the only way to see the pre-1.23 behavior at all is to keep an older toolchain pinned.
- **Surprise, workspace `godebug` precedence.** Planted `gowork-godebug-precedence/`: `go.work` declares `godebug default=go1.26`; its one member's `go.mod` declares `godebug default=go1.21`; both otherwise vanilla. `go list -f '{{.DefaultGODEBUG}}' ./member/...` **in workspace mode** reports only `tracebacklabels=0,x509sslcertoverrideplatform=0` — exactly the two settings that differ between the 1.27.1 baseline and a `go1.26` baseline, meaning **the member's own `godebug default=go1.21` line was silently and completely ignored**. The identical command run with `GOWORK=off` (`go -C member list -f '{{.DefaultGODEBUG}}' .`) reports 24 differing settings — the full set a `go1.21` baseline differs on from 1.27.1's default — meaning the member's own line now applies in full. **Which wins: `go.work`, whenever one is in play; the member's own `godebug` line is dead text the moment a workspace exists, with no warning.** This matches [go.dev/doc/godebug](https://go.dev/doc/godebug)'s own statement that dependency and (in workspace mode) member `godebug` directives outside the main module/workspace are not consulted, but it is easy to read that as "only *dependencies*' directives are ignored" — the fixture shows the *main module's own* directive is also ignored the instant it is folded into a workspace.
- `go list -f '{{.DefaultGODEBUG}}'` (or `-json` for `DefaultGODEBUG`) is the check: it prints only the settings that differ from the toolchain's compiled-in baseline, so an unexpected non-empty result is itself informative, and an accidentally-ignored member line produces the *toolchain's plain default* for that member — a silent gap rather than an error.

### 5. SA1019 and the deprecated-API residue go fix does not touch

[staticcheck.dev/docs/checks/#SA1019](https://staticcheck.dev/docs/checks/) fires on any reference to an identifier documented with a `// Deprecated:` comment, regardless of whether that identifier's replacement has a `//go:fix inline` directive. `go-gates.md`/`golangci-config.md` own *which linter config enables SA1019 and how noisy it is measured to be*; this dive's job is narrower: **which deprecated APIs `go fix`'s `inline` analyzer can mechanically retire, and which SA1019 can only flag for a human**.

Confirmed by reading the stdlib source directly (`$GOROOT/src`, go1.27.1): `io/ioutil`'s deprecated wrappers carry `//go:fix inline` themselves —
```go
// io/ioutil/tempfile.go:25
// Deprecated: As of Go 1.17, this function simply calls [os.CreateTemp].
//go:fix inline
func TempFile(dir, pattern string) (f *os.File, err error) {
	return os.CreateTemp(dir, pattern)
}
```
— and so do `reflect.Ptr` (constant) and `reflect.PtrTo` (function) at `$GOROOT/src/reflect/type.go:332,1393`. This is why the census in §2 shows 24 "Constant reflect.Ptr should be inlined" hits and why `stretchr/testify`'s two `io/ioutil` calls appear as declined-inline findings rather than as plain SA1019 hits in a `go fix` run — **`go fix`'s generic `inline` fixer, not a per-package `ioutil` fixer, is the mechanism**, and it inherits that fixer's own file-go-line gate (§3).

**What SA1019 catches that `go fix` cannot touch:** any deprecated identifier whose replacement is not a drop-in call — `httputil.ReverseProxy.Director` (replacement is `Rewrite`, a different function shape entirely, no `//go:fix inline` exists for it), `reflect.SliceHeader`/`StringHeader` (replacement requires `unsafe.Slice`/`unsafe.String`, a genuine rewrite of surrounding code, not an inline substitution). For these, SA1019 firing is the whole signal; there is no companion `go fix` finding, and the rule set must say so explicitly rather than let an agent assume "no `go fix -diff` finding" means "nothing to modernize here."

### 6. GOEXPERIMENT pins and the defaults that overtook them

Planted `fixtures/era-and-modernizers/goexperiment-pin/`: a `Makefile` with `export GOEXPERIMENT=nojsonv2,nogreenteagc` — plausible as written during the Go 1.25/1.26 window when `jsonv2` was still opt-in (`GOEXPERIMENT=jsonv2`) and Green Tea GC was newly introduced as opt-in (`GOEXPERIMENT=greenteagc`, [go1.25](https://go.dev/doc/go1.25)). By go1.27.1, `jsonv2` is the *default* implementation behind `encoding/json`, opt-out only via `nojsonv2` ([go1.27](https://go.dev/doc/go1.27), and the earlier map measurement [M1], `internal/buildcfg/exp.go:87`), while `greenteagc` remains opt-in-only (not yet default) as of 1.27.1. So this one pin is simultaneously: a *real, live opt-out* for `jsonv2` (keeps the module on the v1-only decoder — a decision that needs its own sign-off, since it foregoes the faster decoder and the SDK's envelope-decoding needs are exactly the kind of consumer that dive is chasing), and a *no-op restating the current default* for `nogreenteagc` (harmless, but stale intent: the author may not know it now agrees with the default rather than overriding it).

The check is a plain grep, not a linter — no analyzer inspects `Makefile`/CI-YAML text:
```sh
grep -rn -e 'GOEXPERIMENT=' -e 'GOEXPERIMENT ' . --include='Makefile' --include='*.yml' --include='*.yaml'
```
Directory operand is `.` (repo root or narrower); empty output is the pass (nothing pinned, nothing to re-check); non-empty output is not itself a failure — it is a name the go-upgrade procedure must re-justify against the *current* release's default table on every bump, because a pin's meaning (override vs. no-op vs. now-stale) changes silently underneath it.

### 7. dependabot-core and the `go`/`toolchain` line

Read directly from [dependabot-core](https://github.com/dependabot/dependabot-core)'s `go_modules` updater and its own issue tracker, 2026-09-26:

- **No dedicated PR for a `go`/`toolchain`-only bump.** [dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520), "Bump Go toolchain directive in go.mod files", open since submission, explicitly asks for the missing behavior: "When a new (security) Go release is available and the `toolchain` directive … is defined … it should be bumped." As of 2026-09-26 this is unimplemented — a repo whose `toolchain` line names a version with a fixed CVE will not get a dependabot PR for that fact alone.
- **It used to actively fight the Go tool's own edit, and that was a bug, now fixed.** [dependabot-core#9527](https://github.com/dependabot/dependabot-core/issues/9527), "Go directive in go.mod not updated when a new dependency requires it": the reporter traced the mechanism precisely — `go get`/`go mod tidy` (run by dependabot with `GOTOOLCHAIN=local+auto`) writes a bumped `go` line and a `toolchain` line itself, per [go.dev/ref/mod](https://go.dev/ref/mod)'s documented behavior ("the go command writes its own toolchain name in a toolchain line any time it is updating the go version"), and dependabot's own `go_mod_updater.rb` used to *revert* that edit back to the prior `go` line, producing a diff that failed `go build` with `go: updates to go.mod needed`. A commenter confirms: "I think this was fixed by #12228. I removed the Dependabot code which tried to maintain the previous go directive. Now it just lets the native behavior happen." The issue is closed.
- **Net effect for the go-upgrade procedure:** dependabot will now let a dependency bump carry the `go`/`toolchain` line up with it *incidentally*, but will never open a PR whose point is the line itself. A fleet repo that wants a deliberate, reviewable `go`/`toolchain` bump (as opposed to an accidental one riding a dependency PR) needs its own step — this is why the ordered procedure in §8 puts the bump before, not instead of, re-running `go mod tidy -diff`/dependabot's own next scheduled run.
- **Groups do not (and cannot) target the line.** Dependabot's [groups](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference#groups--) match dependencies by name pattern and update type; the `go`/`toolchain` directive is not a dependency dependabot tracks, so it cannot appear in a `patterns:` list and cannot be grouped deliberately — it travels, unlabeled, inside whichever dependency's group PR happened to force it.

### 8. Recent language additions: SHOULD vs CONSIDER, dated

See Normative Guidance §9 for the ordinal SHOULD/CONSIDER rules; the version and date anchors, fetched from the go1.24–go1.27 release notes (Go's twice-yearly cadence: 1.24 ≈Feb 2025, 1.25 ≈Aug 2025, 1.26 ≈Feb 2026, 1.27 ≈Aug 2026 per [frame](../go-frame.md)):

- **Generic type aliases** (1.24): migration-shim use only — already the map's direction (`M-A-07`); this dive does not reopen it.
- **`new(expr)`** (1.26): SHOULD once the module's `go` line allows it. Confirmed live (§3) it is a hard compile floor, not advisory; `go fix`'s `newexpr` fixer finds `func f(x T) *T { return &x }` wrappers, rewrites call sites to `new(x)`, and marks the (now-redundant) wrapper `//go:fix inline` for a second pass to remove entirely.
- **Self-referential type constraints** (1.26): CONSIDER — lifts a restriction on generic constraint declarations (`type Adder[A Adder[A]] interface{...}`); relevant only to a package designing its own generic constraint hierarchy, which is not a shape any current fleet consumer needs (no exemplar or planned SDK surface uses self-referential constraints).
- **Generic methods** (1.27): CONSIDER, and gated one release ahead of the SDK's own default floor (`go 1.26.0`, owner Q1) — cannot be used at all in a library that keeps that floor. Revisit when the floor moves to 1.27.
- **Struct-literal field selectors / `embedlit`** (1.27): CONSIDER, same floor gap as generic methods; purely stylistic (removes a level of nested literal), `go fix`'s `embedlit` fixer applies it mechanically once the floor allows.
- **Generalized function-type inference** (1.27): not a SHOULD/CONSIDER candidate at all — there is no new syntax to write; it only widens where the compiler *already* infers a function's type parameters. The go-upgrade procedure's release-notes step (§9, step 1) should note it as "read only," not "adopt."

## Normative guidance candidates

1. **Rule (GO-LANG-01).** Gate every mechanical pre-1.22-and-later idiom rewrite listed in Findings §1 through `go fix -diff ./...` (GO-GATE-03); the GO-LANG rule set states no style guidance for any of them and an agent must not hand-write an equivalent rewrite the tool already owns.
   - *Rationale:* the tool is more conservative than a naive rewrite would be (§1's self-limits column) and ships with, and is versioned by, the toolchain the `go` line already selects.
   - *Verifies:* `go fix -diff ./...`, exit 0 with empty output = nothing to modernize.
   - *Run:* yes — every fixer family in Findings §1/§3 exercised on a planted violation/twin pair; see Verification runs.

2. **Rule (GO-LANG-02).** Never hand-write the risky half of a fixer's decline. Specifically: never replace an `if/else` on floating-point operands with `min`/`max` (NaN divergence), never convert a stored-and-reused `[]string` from `strings.Split` into `strings.SplitSeq` (single-pass iterator, second range sees nothing), never accept `omitzero`'s alternative fix (behavior change) without adding or already having a matching `IsZero() bool` method and a test asserting the *new* zero-omission behavior is wanted.
   - *Rationale:* these are exactly the cases the tool's own authors excluded by design; a reviewer approving a manual diff that does what the tool declined to do unattended must see a reason, not assume the change is "the same modernization, just done by hand."
   - *Verifies:* reading heuristic (no linter distinguishes "did a human reimplement a declined fixer" from "unrelated code"); a reviewer diffing against `go fix -diff`'s own (empty) output on the same lines is the closest mechanical check — a non-empty diff *and* a change matching one of these three shapes is the finding.
   - *Run:* yes — `minmax-nan/`, `stringsseq-alloc/`, `omitzero-behavior/` fixtures show the tool declining each case and the twin proving semantics hold when the safe rewrite is (or is not) applied.

3. **Rule (GO-LANG-03).** Before trusting any `go fix` finding (or its absence) as final, check the module's `go` line and, for a per-file build-tagged file, that file's own effective version, with `go list -m -f '{{.GoVersion}}'` and by reading the file's `//go:build go1.N` tag if present. A fixer that declined is not evidence the idiom is fine; it may be evidence the floor is stale.
   - *Rationale:* `forvar`, `errorsastype`, and `inline` (for `io/ioutil`, `reflect.Ptr`/`PtrTo`) all measurably decline below their floor (Findings §2, §3) with no warning beyond an easily-missed stderr line during a batch run, or, for `-diff`, no output difference from "fully modernized" at all.
   - *Verifies:* `go list -m -f '{{.GoVersion}}'`; re-run `go fix -diff ./...` after a hypothetical floor bump in a scratch copy to see what newly fires.
   - *Run:* yes — `loopvar-1.21-to-1.22/`, `generic-methods-and-newexpr/`, `misc-fixers/` (errorsastype at 1.25 vs 1.26).

4. **Rule (GO-LANG-04).** State explicitly, because no fixer or linter enforces it: whether to add a type parameter to a function or type is a design decision the rule set makes on `M-A-06`'s criteria (one instantiation in the module, algorithm indifferent to type, DSL/error-framework shape), never something `go fix` decides for you — there is no "genericize this" fixer among the 26.
   - *Rationale:* confirms Findings §1's fixer table has no generics-authoring entry; conflates easily with the mechanical `errorsastype`/`newexpr` fixers, which *use* generics but never *introduce* a new generic declaration.
   - *Verifies:* reading heuristic — `grep -rn -e '\[.*any\]' -e '\[T ' . --include='*.go'` surfaces every existing type-parameter declaration for a reviewer to check against the one-instantiation criterion; empty output means no generics to review.
   - *Run:* no (reading heuristic only; matches the map's own framing for `M-A-06`, not re-verified here).

5. **Rule (GO-LANG-05).** State explicitly, for the same reason: a new `iter.Seq`/`iter.Seq2`-returning helper must honor the yield-stop contract ("if `yield` returns false, stop calling it and return") — [go.dev/blog/range-functions](https://go.dev/blog/range-functions) — and no fixer authors a new iterator; `stditerators` only *consumes* an existing `Len`/`At`-style API already offered by a "well-known" stdlib type.
   - *Rationale:* an agent implementing a custom iterator from scratch gets no mechanical safety net; a hand-rolled iterator that ignores a false return from `yield` keeps iterating past a `break`, which is silent unless the loop body itself has a visible side effect.
   - *Verifies:* reading heuristic — every function whose signature is `func(yield func(...) bool)` (or that returns one) must have a code path that returns immediately when `yield(...)` returns false; `go vet`'s `loopclosure`/`the yield analyzer` (gopls-side, not `go vet`'s CLI set) catches some but not all shapes.
   - *Run:* no (reading heuristic; no fixture planted — this dive's rows do not include `M-A-05`'s "when" half, only that no fixer covers authoring).

6. **Rule (GO-LANG-06, M-A-13).** Maintain, and have the go-upgrade skill read, a version-anchored table of stdlib behavior changes that arrive with **no compile error** on a `go`-line bump. Minimum entries as of 2026-09-26, each independently confirmed above or in sibling consolidations: `slices.Insert` panics on an out-of-range index since 1.22 ([canon]); timer/ticker channels unbuffered — except on a 1.27+ toolchain, where this is unconditional regardless of the module's line (Findings §4, correcting the naive "since 1.23" framing); `math/rand.Seed` is a silent no-op since 1.24 (`GODEBUG=randseednop`); `errors.AsType` compiles only at `go 1.26`+ and `go fix` will not introduce a call to it below that floor (Findings §3).
   - *Rationale:* none of these trip a build failure, so nothing forces a reader to notice; they are exactly the class a diff-based gate (`go fix -diff`, `go vet`) cannot catch because the *old* code still compiles and still "does something," just not the same thing.
   - *Verifies:* no mechanical check exists for "did this PR's behavior silently change"; the check is procedural — the go-upgrade skill's step 1 (§9) requires reading the target release's notes end to end before merging the bump, and this table is what that reading step is checked against.
   - *Run:* no (a documentation table by construction; the timer-channel entry was independently re-verified live in Findings §4).

7. **Rule (GO-LANG-07).** Treat a `GOEXPERIMENT=` pin in any `Makefile`, `Dockerfile`, or CI workflow as a finding to re-justify on every `go`-line bump, not a set-and-forget flag: check whether each named experiment (a) is now the default (pin is a real opt-out and needs a comment saying why), (b) is still opt-in (pin is a no-op today but was a deliberate enable/disable and should stay), or (c) has been removed entirely (pin is now a hard build error, per GO-MOD-04's `removed GODEBUG` mechanism, which also applies to `GOEXPERIMENT` names that graduate out of existence).
   - *Rationale:* `jsonv2` moved from opt-in (1.25) to default-with-opt-out (1.27) across exactly the release window a stale pin would span (Findings §6); a pin nobody revisits silently keeps a module on the slower v1-only decoder while everyone assumes the default improved automatically.
   - *Verifies:* `grep -rn -e 'GOEXPERIMENT=' -e 'GOEXPERIMENT ' . --include='Makefile' --include='*.yml' --include='*.yaml'` — directory operand `.`, `-e` per alternative, quoted `--include` globs, piped into `xargs -r` when acting on matches; empty output means nothing pinned (pass); non-empty output is not itself a failure, it names what to re-justify.
   - *Run:* yes — `goexperiment-pin/violation` (pin present, grep exits 0 with the finding) vs `.../compliant` (no pin, grep exits 1, empty).

8. **Rule (GO-LANG-08).** Do not treat "no `go fix -diff` finding" as "nothing deprecated here." Cross-check `staticcheck`'s SA1019 (owned by GO-GATE for config, cited not re-decided) against Findings §5's list of stdlib deprecations that *do* carry a `//go:fix inline` shim (`io/ioutil`'s wrappers, `reflect.Ptr`/`PtrTo`) versus those that do not (`httputil.ReverseProxy.Director`, `reflect.SliceHeader`/`StringHeader`) — only the first group is `go fix`'s job; the second group is SA1019-only and needs a manual rewrite plan.
   - *Rationale:* an agent that sees a clean `go fix -diff` and a red SA1019 finding on, say, `ReverseProxy.Director` may reasonably but wrongly expect a fixer to exist for it; none does, by design (the replacement is not a drop-in call).
   - *Verifies:* `staticcheck ./... 2>&1 | grep -e 'SA1019'` (directory operand `./...`, one `-e`); for each hit, check whether the deprecated symbol's own doc comment/source carries `//go:fix inline` (a one-time reading check per API, not a repeatable grep across the fleet's own code, since the directive lives in the *dependency's* source).
   - *Run:* no for the general check (staticcheck's own noise/config is GO-GATE's territory); yes for the two example cases, read directly from `$GOROOT/src` (Findings §5).

9. **Rule (GO-LANG-09, generic methods / embedlit / self-referential constraints / new(expr)).** Pin SHOULD/CONSIDER per Findings §8's table, each dated to its release. Do not backport a 1.27-only idiom into code whose `go` line is 1.26 hoping "the toolchain is 1.27.1 anyway" — the compiler enforces the *module's declared* line, not the installed toolchain's ceiling, confirmed live in Findings §3 (`generic method requires go1.27 or later … check go.mod`).
   - *Rationale:* the SDK's own default floor (`go 1.26.0`, owner Q1) sits one release behind generic methods and `embedlit`; an agent proposing either idiom in SDK code is proposing a floor bump it must call out separately, not slip in as "just modernization."
   - *Verifies:* `go build ./...` on the module as declared is sufficient — the compiler itself is the check, with the exact error text above naming the missing floor.
   - *Run:* yes — `generic-methods-and-newexpr/go126` and `go127` (Findings §3).

10. **Rule (GO-LANG-10, M-P-02, the go-upgrade procedure).** Run, in this order, every time a module's `go` line or toolchain moves:
    1. **Read the release notes for every version between the old and new line**, not just the destination — a skipped intermediate release's behavior change (e.g., a GODEBUG default flip) still applies. Check: no mechanical substitute; this is why GO-LANG-06's table exists, to catch what a skim misses.
    2. **Diff the GODEBUG defaults** the move crosses, including which settings are *removed* at the destination (GO-MOD-04) and, in a workspace repo, which `godebug` line will start being read (`go.work`'s) and which will start being ignored (a member's own, if one exists) — Findings §4. Check: `go list -f '{{.DefaultGODEBUG}}'` before and after the bump, run once in-workspace and once with `GOWORK=off` if `go.work` exists.
    3. **Bump the `go` line, then the `toolchain` line if the repo pins one** (GO-MOD-01/02) — never rely on dependabot to do this deliberately (Findings §7); it only rides along on an unrelated dependency PR.
    4. **Run `go fix -diff ./...` and apply it**, reading stderr for any `ignoring alternative fix "…(behavior change)"` line (GO-GATE-03) — after the bump, not before, so newly-unlocked fixers (`errorsastype`, generic-method-adjacent rewrites) actually fire (Findings §3).
    5. **Run `go vet ./...`** and read every `stdversion` finding — it names symbols too new for the (old) line that a stale reference to the previous floor would have hidden, and, from Go 1.27, `go test` also runs it by default (already settled, [go-gates.md GO-GATE-02]).
    6. **Bump the golangci-lint pin and its config** (GO-GATE, cited not re-decided here) — a new Go line can unlock new analyzer behavior inside `govet`/`staticcheck` that an unpinned or stale binary will not run.
    7. **Audit every `GOEXPERIMENT=` pin** against the destination release's default table (GO-LANG-07); an unreviewed pin is either a stale no-op or a silent opt-out no one remembers choosing.
    8. **Re-run the full gate block** (GO-GATE-01) and only then hand off to GO-MOD's dependency-triage half (`govulncheck` reachability, folded from `M-P-04`) — a version bump and a dependency bump are two different failure classes and must not be reviewed as one diff.
    - *Rationale:* every step above corresponds to a concrete finding in this dive or a sibling consolidation that silently misfires if the steps run out of order or are skipped (fixers that under-fire before the bump, GODEBUG lines that go inert in a workspace, a `toolchain` line dependabot never bumps on its own).
    - *Verifies:* each step names its own check above; the procedure as a whole is verified by having watched every individual step red/green on a fixture in this file.
    - *Run:* yes, per-step (Verification runs table); the procedure's ordering itself (step N depends on step N-1's fixer/vet output being current) is argued from the fixture evidence, not independently fuzzed.

## Verification runs

All commands run via `/home/mherwig/.cache/research-lang/go-tools/run.sh`, Go 1.27.1, `GOTOOLCHAIN=local`, 2026-09-26. Fixtures under `/home/mherwig/.cache/research-lang/go-tools/fixtures/era-and-modernizers/`.

| Fixture | Command | Violation exit | Twin exit | Relevant output |
|---|---|---|---|---|
| `rangeint-mutation/violation` → `/compliant` | `go fix -diff ./...` | 1 | 0 | violation diff rewrites only `sumSafe`'s `for i:=0;i<n;i++`; `sumSkippingOdd` (mutates `i`) untouched in both; `go test` green both sides |
| `stringsseq-alloc/violation` → `/compliant` | `go fix -diff ./...` | 1 | 0 | rewrites `countNonEmpty` only; `countAndJoin` (parts reused) untouched; `go test` green both sides |
| `minmax-nan/violation` → `/compliant` | `go fix -diff ./...` | 1 | 0 | rewrites `lowerInt` (`x = min(a,b)`) only; `lowerFloat` if/else untouched; NaN-divergence documented in test |
| `omitzero-behavior/violation` → `/compliant` | `go fix -diff ./...` then `go fix ./...` | 1 | 0 (after apply) | stderr: `fix: omitzero: ignoring alternative fix "Replace omitempty with omitzero (behavior change)"`; applied diff only deletes the no-op tag; `json.Marshal` output byte-identical before/after (test asserts `{"name":"a","inner":{"x":0}}` both sides) |
| `loopvar-1.21-to-1.22/pre122` (go 1.21) → `post122` (go 1.22) | `go fix -diff ./...` | 0 (no finding at 1.21) | 1 (finding at 1.22) | at 1.22, diff removes `v := v`; `go test -count=10` green after apply — per-iteration capture holds without the copy |
| `generic-methods-and-newexpr/go127` → `go126` | `go build ./...` | 0 (1.27) | 1 (1.26) | `./main.go:10:23: generic method requires go1.27 or later (-lang was set to go1.26; check go.mod)` |
| `generic-methods-and-newexpr/go125-newexpr-only` (go 1.25 → bumped to 1.26) | `go build ./...` | 1 (1.25) | 0 (1.26) | `./main.go:8:9: new(yearsSince(n)) requires go1.26 or later (-lang was set to go1.25; check go.mod)` |
| `misc-fixers/violation` (go 1.25 → bumped to 1.26) | `go fix -diff ./...` | 0 (no `errorsastype` finding at 1.25) | 1 (fires at 1.26) | at 1.26: `errors.As` two-step → `errors.AsType[*NotFoundError]`; `waitgroupgo` and `mapsloop` fire at both floors (no version gate of their own in this range) |
| `misc-fixers/violation` → `/compliant` | `go fix -diff ./...` (at go 1.26) | 1 (44 lines) | 0 | applied diff builds, runs, prints identical output (`x`, `map[a:1]`) before/after |
| `timer-channel-1.22-vs-1.23/go122` vs `/go123` | `go test -v ./...` (probe `cap(t.C)`) | n/a — **both report `cap==0`** on this toolchain | n/a | this is the §4 surprise: not a violation/twin pair in the expected sense — both are "compliant" on 1.27.1; the intended violation (buffered channel, `cap==1`) is **unreachable on this toolchain**, confirmed by `GODEBUG=asynctimerchan=1` producing `fatal error: removed GODEBUG "asynctimerchan" set to old value "1" in environment` on both |
| `gowork-godebug-precedence/` | `go list -f '{{.DefaultGODEBUG}}' ./member/...` (in-workspace) vs `GOWORK=off go -C member list -f '{{.DefaultGODEBUG}}' .` | n/a | n/a | in-workspace: `tracebacklabels=0,x509sslcertoverrideplatform=0` (only `go.work`'s `default=go1.26` diff from baseline); `GOWORK=off`: 24-setting list matching a `go1.21` baseline diff — the member's own `godebug default=go1.21` line, invisible in-workspace, applies in full once workspace mode is off |
| `goexperiment-pin/violation` → `/compliant` | `grep -rn -e 'GOEXPERIMENT=' -e 'GOEXPERIMENT ' . --include='Makefile' --include='*.yml' --include='*.yaml'` | 0 (finds the pin) | 1 (empty, nothing to find) | violation: `Makefile:6:export GOEXPERIMENT=nojsonv2,nogreenteagc` |
| (read-only census) 12 CI-green repos | `go vet -vettool=$(go tool -n fix) ./...` | n/a (census, not a pass/fail check) | n/a | 459 diagnostics total incl. 2 declined-inline findings (Findings §2); never writes to the exemplar clone |

No proposed check failed to go red where a violation was planted; the one row that did not behave as originally expected (`timer-channel-1.22-vs-1.23`) is reported as such in Findings §4 rather than silently reframed.

## Exemplar evidence

- `google/go-cmp@b133f1f1932e:go.mod:3` declares `go 1.21`; `go fix`'s `inline` analyzer declines at `cmp/cmpopts/ignore.go:103:46` with `cannot inline call to reflect.PtrTo (declared using go1.27.1) into a file using go1.21` — confirms Findings §2/§3's floor-gating claim on real, CI-passing, currently-shipping code, not just a fixture.
- `stretchr/testify@87a7b9d57689:go.mod:3` declares `go 1.17`; declines twice at `internal/spew/spew_test.go:110:34` and `:123:24` for `ioutil.TempFile`/`ioutil.ReadFile` with the same "into a file using go1.17" message — a second independent confirmation of the same mechanism on a different repo and a different pair of APIs.
- `uber-go/zap@4892335e05f1` carries 250 of the 459 fresh census diagnostics (Findings §2), all but a handful `interface{}`→`any`; this is the exemplar the wave-1/2 audits already flagged as a "stable public API decision, not neglect" ([exemplar-code-shape.md §7](../go-audit/exemplar-code-shape.md)) — this dive's fresh census does not change that reading, only refreshes the number against `go fix`'s own driver instead of `modernize`.
- `spf13/cobra@adbc8813901b` and `regclient/regclient@43d2acb9fafd` both produce a clean (empty, exit 0) `go fix -diff ./...` in this dive's re-run, matching the original `modernize` census's zero-diagnostic finding for both — consistent evidence across two different tools built on the same analysis framework.
- `etcd-io/etcd`, `containerd/containerd`, `tailscale/tailscale`, `terraform` collectively carry the 142 `x := x`/`tc := tc` loop-variable copies [exemplar-code-shape.md §3](../go-audit/exemplar-code-shape.md) already measured; this dive did not re-run `forvar` against all 35 repos (out of scope for the 12-repo re-census), but the `loopvar-1.21-to-1.22` fixture (Findings §3) demonstrates the exact mechanism that makes each of those 142 either genuinely dead (module at ≥1.22) or still load-bearing (module at <1.22, or a per-file build-tagged floor) — a distinction the raw count alone cannot make, which is `M-A-02`'s question answered mechanically rather than by inspection.
- No exemplar in the 12-repo re-census contradicts the "fixer self-limits by pattern" claims in Findings §1 — none of the 459 diagnostics is a `minmax` hit on a floating-point comparison, a `stringsseq` hit on a reused split result, or an `omitzero` hit applying the risky alternative; the absence itself is the evidence the self-limits hold in the wild, not only on a minimal fixture.

## AI-agent angle

- **Hand-rewriting what a fixer already declines to rewrite, believing it is "the same modernization done manually."** An agent asked to "modernize this file" that sees a `float64` if/else and reaches for `min`/`max` anyway reintroduces exactly the NaN divergence `minmax` was built to avoid. Smallest check: after any manual `min`/`max` introduction, `go fix -diff ./...` on the same file must report *no new finding at that line* — if the manual change matches what the fixer would have proposed had it fired, the fixer proposes nothing (already applied); if the fixer would still decline (floating type), a manual application there is the finding itself, catchable by grepping the diff for `min(` / `max(` calls on operands the type-checker resolves to `float32`/`float64`.
- **Treating "`go fix -diff` is clean" as "this module has no deprecated APIs."** Below its floor, `go fix` silently produces no findings for `errorsastype`, `newexpr`, and any `inline` target whose replacement needs a newer line (Findings §2, §3) — an agent that reads a clean diff as "already modern" without first checking `go list -m -f '{{.GoVersion}}'` will miss exactly the repos most in need of a floor bump. Smallest check: GO-LANG-03's rule — read the `go` line before trusting an empty diff.
- **Assuming a `GODEBUG`/`GOEXPERIMENT` setting still means what its name implied when the agent's training data was current.** `asynctimerchan` looks, by name, like a live toggle; on a 1.27 toolchain it is a build-time fatal error to even mention with its old value (Findings §4). An agent "helpfully" adding `GODEBUG=asynctimerchan=1` to unstick a test that assumed buffered timer channels will break the build outright, not silently misbehave — the smallest check is exactly the `removed GODEBUG` error text itself, which is unambiguous, but only if the agent runs the build rather than pattern-matching the flag name against stale documentation in its own training.
- **Assuming a workspace's member modules keep their own `godebug` line's effect.** An agent auditing a multi-module repo's compatibility posture per-module, reading each `go.mod`'s own `godebug` directive in isolation, will report a floor that is not actually in effect the moment `go.work` exists (Findings §4). Smallest check: `go list -f '{{.DefaultGODEBUG}}'` run once in-workspace and once with `GOWORK=off`; a difference between the two outputs for the same module is the finding, and it is a difference an agent will not notice by reading `go.mod` files alone.
- **Assuming dependabot will eventually open a "bump go version" PR on its own.** An agent designing a go-upgrade cadence around "wait for the automated PR" for the `go`/`toolchain` line specifically is designing around a feature that does not exist ([dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520), open). Smallest check: none mechanical — this is a process design mistake, not a code defect; the fix is stating GO-LANG-10 step 3 as a standing, scheduled human/agent action, not an automation dependency.
- **Reaching for a fixer that does not exist.** An agent that recalls "Go has a fixer for `io/ioutil`" and expects `go tool fix help` to list one will not find `ioutil` anywhere in the 26 names (Findings §1); the mechanism is the generic `inline` fixer riding stdlib's own `//go:fix inline` directives (Findings §5). Smallest check: `run.sh go tool fix help` lists all 26 real names; grepping training-data intuition against that literal list catches an invented fixer name before it is cited in a comment or a rule.

## Contested / evolving

- **Whether `modernize` (the standalone `golang.org/x/tools/cmd/modernize` binary/analysis library) or `go fix`'s own driver is "the" census tool.** Both are built on the same analysis framework and mostly agree, but as of Go 1.27 they have diverged: `go fix` gained `atomictypes`, `embedlit`, `slicesbackward`, `unsafefuncs` and dropped `fmtappendf` ([go1.27 release notes](https://go.dev/doc/go1.27)); `modernize` as a separate `x/tools` command may lag or lead depending on when its module was last bumped. This dive used `go fix`'s own driver for the fresh census (Findings §2) precisely because it is the one shipped with, and versioned by, the toolchain the `go` line selects — the same reasoning GO-GATE-03 already used to prefer `go fix -diff` over golangci's `modernize` linter. Trending: converge on `go fix` as the tool of record; `modernize`-the-library still matters as the thing gopls and `go vet -vettool=` share underneath, not as a second census source.
- **Whether a `toolchain` line is dependabot's job at all.** [dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520) is open with no assignee as of 2026-09-26; the underlying design tension (a `toolchain` bump might depend on a project's CI matrix, a security patch calendar, or neither) is unresolved upstream, not merely unimplemented. Trending: unclear — the closed sibling issue (#9527/#12228) resolved the narrower "stop reverting the Go tool's own edit" bug but did not resolve the broader "should dependabot ever open a toolchain-only PR" design question.
- **How long the `asynctimerchan`-style "removed GODEBUG" pattern will keep surprising upgraders.** Every removed setting in Go's history has followed the same two-release arc (introduced as an opt-out → the opt-out itself removed, typically 4 releases later per the `godebug` history table), but each one is a new name an upgrade procedure must specifically know about; there is no general-purpose check for "is any GODEBUG name I rely on scheduled for removal in the next release" beyond reading each release's notes (GO-LANG-06). Trending: the pattern is stable and well-documented by the Go team; the gap is procedural (someone has to read the table), not tooling.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/doc/go1.22](https://go.dev/doc/go1.22) | Official release notes | Feb 2024 | Loop-variable per-iteration semantics, range-over-int, `vet` changes |
| [go.dev/doc/go1.23](https://go.dev/doc/go1.23) | Official release notes | Aug 2024 | Range-over-func, timer-channel change + `asynctimerchan`, `godebug` directive introduced |
| [go.dev/doc/go1.24](https://go.dev/doc/go1.24) | Official release notes | Feb 2025 | Generic type aliases, `tool` directive, `weak`, Swiss-table maps, `randseednop` |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | Official release notes | Aug 2025 | `sync.WaitGroup.Go`, `synctest` GA, container-aware `GOMAXPROCS`, `jsonv2`/`greenteagc` as opt-in experiments |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Official release notes | Feb 2026 | `go fix` revamped into the modernizer home, `new(expr)`, self-referential constraints, GODEBUG removals announced for 1.27, `NotifyContext` cause |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Official release notes | Aug 2026 | Generic methods, `embedlit`, `jsonv2` default-on, GODEBUG removals take effect, `stdversion` in `go test`, fixer list churn (`atomictypes`/`embedlit`/`slicesbackward`/`unsafefuncs` added, `fmtappendf` removed, `waitgroup`→`waitgroupgo` rename) |
| [go.dev/doc/godebug](https://go.dev/doc/godebug) | Official GODEBUG history and mechanism doc | living doc, read 2026-09-26 | Full settings table, `godebug` directive precedence order, workspace-vs-module consultation rule |
| [go.dev/blog/inliner](https://go.dev/blog/inliner) | Official blog, the source-level inliner | 2025 | `//go:fix inline` mechanism, evaluation-order hazard analysis, `defer` refusal in batch mode |
| [go.dev/blog/range-functions](https://go.dev/blog/range-functions) | Official blog, range-over-func | 2024 | `iter.Seq`/`iter.Seq2`, the yield-returns-false-must-stop contract |
| [go.dev/ref/mod](https://go.dev/ref/mod) | Official module reference | living doc | `go`/`toolchain` line semantics, exactly the text dependabot's own contributors quoted while diagnosing #9527 |
| [staticcheck.dev/docs/checks/#SA1019](https://staticcheck.dev/docs/checks/) | staticcheck's own check catalogue | current, read 2026-09-26 | SA1019's description and scope, the deprecated-identifier detector this dive contrasts against `go fix`'s narrower `inline`-shim coverage |
| `go tool fix help` / `go tool fix help <name>` (all 26) | The tool's own help text, go1.27.1 | primary, run live 2026-09-26 | Ground truth for every fixer's rewrite and self-limit in Findings §1 — not a secondary description |
| [dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520) | Open GitHub issue, dependabot/dependabot-core | opened, still open 2026-09-26 | Primary evidence there is no dedicated toolchain-bump PR feature |
| [dependabot-core#9527](https://github.com/dependabot/dependabot-core/issues/9527) | Closed GitHub issue + linked PR #12228 | closed | Primary evidence of the fixed "reverts the go line" bug and dependabot's actual current behavior, from the maintainers themselves in the thread |
| `$GOROOT/src/io/ioutil/{ioutil,tempfile}.go`, `$GOROOT/src/reflect/type.go` | stdlib source, go1.27.1 | primary, read live 2026-09-26 | Ground truth for which deprecated APIs carry `//go:fix inline` and which do not |
| [go-audit/exemplar-code-shape.md §7](../go-audit/exemplar-code-shape.md) | Wave-1 audit, prior modernize census | 2026-09-26 | Baseline census this dive's fresh `go fix`-driver census (Findings §2) is checked against and reconciled with |
| [go-gates.md](../go-gates.md) / [go-gates/gate-commands.md](../go-gates/gate-commands.md) | Wave-2 consolidation | 2026-09-26 | Settled GO-GATE-01/03 (the gate block, `go fix -diff` as gate) cited, not re-decided, per the brief's instruction |
| [go-errors.md](../go-errors.md) (GO-ERR-04) | Wave-2 consolidation | 2026-09-26 | Settled `errors.AsType` floor claim, independently re-confirmed from the fixer side in Findings §3 |
| [go-modules.md](../go-modules.md) (GO-MOD-01..05) | Wave-2 consolidation | 2026-09-26 | Settled `go`/`toolchain`-line and `godebug`-removal rules cited as the frame for Findings §4/§7 |
| [go-topic-map.md](../go-topic-map.md) | Phase-3 topic map, this dive's brief | 2026-09-26 | The row list (`M-A-01,02,04-07,13,16,18`, `M-J-12`, `M-P-02`), the settled wave-2 facts to cite, and the fixture/decide instructions this file follows |

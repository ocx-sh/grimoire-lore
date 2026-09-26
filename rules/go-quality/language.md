---
title: Language Era, Stdlib Semantics, Generics and Iterators
summary: The GO-LANG family. The effective language version and what go fix declines, stdlib API floors and json/v2, deprecations and randomness, time equality, map order and omitzero on contract output, generic and iterator design, and moving a module to a new Go release
---

# Language Era, Stdlib Semantics, Generics and Iterators

Owns which Go a file is actually written in, the idioms that changed between releases, the stdlib semantics
that break output silently (JSON, maps, `time.Time`, runes, randomness), how a generic function or an iterator
is shaped, and the order in which a module moves to a new release. Does not own running `go fix` or the linter
roster in the gate, which is `GO-GATE`. The `go` and `toolchain` lines and the depguard list are `GO-MOD`.
Matching error text is `GO-ERR`, goroutine-leak tests are `GO-CONC`, fuzz targets are `GO-TEST`, and crypto
randomness and the gosec G404 suppression are `GO-SEC`. Every mechanical era rewrite belongs to `go fix`, so
this file carries only what a fixer declines or cannot see.

Contents: [Dates and Floors](#dates-and-floors) · [The `go` Line Decides](#the-go-line-decides) ·
[golangci-lint: Deprecations, Superseded Imports, Time](#golangci-lint-deprecations-superseded-imports-time) ·
[Iterators: gopls `yield` and goleak](#iterators-gopls-yield-and-goleak) ·
[Golden Output: Map Order, `omitzero`, json/v2](#golden-output-map-order-omitzero-jsonv2) ·
[Reading Heuristics: Numbers, Runes, Generics](#reading-heuristics-numbers-runes-generics) ·
[Moving to a New Go Release](#moving-to-a-new-go-release) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0, staticcheck
2026.2.1, gopls v0.23.0, goleak v1.3.0 and x/tools v0.50.0, unless a row says
otherwise.

- **Pinned default floors (GO-MOD-01).** Libraries and a CLI-wrapping SDK declare `go 1.26.0`, and CLIs
  declare `go 1.27.0` plus a `toolchain` line. This is a default, and the adopter may override it once.
- **Compile-gated by the `go` line:** generic type aliases and range-over-func (go 1.23), self-referential
  constraints and `new(expr)` (go 1.26), generic methods (go 1.27). The compiler names the required version.
- **Behaviour-gated by the `go` line, no compile error:** per-iteration loop variables (the file's effective
  version, go 1.22), `rand.Seed` as a no-op (main module go 1.24). See the silent-change table.
- **Never compiler-enforced:** a stdlib symbol newer than the `go` line (`encoding/json/v2`, `errors.AsType`)
  compiles on a newer toolchain. Only `go vet`'s `stdversion` and a build on the floor toolchain catch it.

## The `go` Line Decides

```sh
go list -m -f '{{.GoVersion}}'                       # the module line
grep -rn --include='*.go' -e '^//go:build.*go1\.' .  # files that override it
go fix -diff ./...                                   # GO-GATE-03 owns the gate half
go vet ./...                                         # stdversion, fast, on go1.27.1
go build ./...                                       # also on the oldstable leg (GO-MOD-16)
```

The build-tag grep is a work list: empty output means every file follows the module line. An empty
`go fix -diff` means clean only at or above each fixer's floor.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-LANG-02 | Read the effective language version before judging an idiom or trusting an empty `go fix -diff`: the module's `go` line, overridden for one file by any `//go:build go1.N` term. A `v := v` or `tc := tc` copy is dead only at an effective version of 1.22 or later, and an empty diff below a fixer's floor means "floor-limited", not "modern". This extends GO-CORE-04. | `forvar`, `errorsastype` and `inline` decline silently below their floor. A file tagged `//go:build go1.21` keeps per-loop variables inside a `go 1.22` module, so deleting its copy changes behaviour. | The gate block. `go fix -diff ./...` removes the copy in an untagged file and leaves the tagged file's copy alone (measured 2026-09-26). Read every build-tag hit before deleting a copy in it. | MUST |
| GO-LANG-01 | Never hand-apply a modernization a `go fix` fixer declines: no `min`/`max` replacing an if/else over float operands, no `strings.SplitSeq`/`FieldsSeq` where the result is indexed or ranged twice, no `for i := range n` where the body mutates `i` or the bound, and no `omitempty` to `omitzero` swap outside GO-LANG-10. Every other era rewrite goes through `go fix ./...`, never by hand. | Each decline hides a semantic change. `min` differs from if/else on NaN, a `SplitSeq` iterator is single-pass so a second range sees nothing, and a mutated index breaks `range n`. Agents asked to "modernize this file" apply all four anyway. | Reading heuristic, since no analyzer tells a hand rewrite from ordinary code. Run `go fix -diff ./...` over the same lines: where the fixer proposes nothing and the hand edit matches one of the four shapes, that is the finding. | MUST |
| GO-LANG-04 | A module whose `go` line is below 1.27, which includes the pinned library and SDK floor, never imports `encoding/json/v2` or `encoding/json/jsontext`. Code at go 1.27 or later may import them, and then owns v2's stricter defaults (duplicate names and invalid UTF-8 rejected) with a golden test for them. | The import builds with exit 0 on go1.27.1 in a `go 1.26.0` module, so a green local build proves nothing. golangci-lint v2.14.0's govet and nogo are blind to this case, because x/tools v0.50.0 exempts `encoding/json/v2` and `jsontext` from `stdversion` (`internal/typesinternal/toonew.go:28-29`, read 2026-09-26). | Durable: the GO-MOD-16 `oldstable` leg, `go build ./...` on Go 1.26, fails with `imports encoding/json/v2: build constraints exclude all Go files`. Fast: bare `go vet ./...` on go1.27.1 prints `json.Marshal requires go1.27 or later`. Both measured 2026-09-26, and empty output from both is the pass. golangci-lint's govet, nogo and a grep (which matches string literals) are not substitutes. | MUST |
| GO-LANG-03 | Never raise a library's or the SDK's `go` line to adopt a language feature. Generic methods and struct-literal field selectors (1.27) and self-referential constraints (1.26) are CONSIDER until the GO-MOD-01 floor reaches them. `new(expr)` (1.26) arrives through the `newexpr` fixer, never by hand. **pinned:** generic type aliases, which compile at go 1.23 across packages, are for migration shims only. A CLI at `go 1.27.0` may use all of them. | The compiler enforces the declared line, not the installed toolchain, so one generic method in a `go 1.26.0` SDK forces a floor bump on every consumer. | `go build ./...` under the declared line prints `generic method requires go1.27 or later` or `generic type alias requires go1.23 or later`. Exit 0 is the pass. | SHOULD |
| GO-LANG-23 | Below `go 1.27`, and inside an interface at any version, never give a method its own type parameter. Write a package-level generic function that takes the receiver first. At go 1.27 or later a concrete type may declare a generic method (permitted, not preferred), but it never satisfies an interface method, so a type that must implement an interface keeps a non-generic method of that name. | Interface methods reject type parameters at every version, so bumping the `go` line fixes only the concrete case. A generic method named like an interface method breaks every assignment of that type to the interface. | `go build ./...` prints `generic method requires go1.27 or later`, `interface method must have no type parameters`, or `does not implement` with `wrong type for method`. Exit 0 is the pass. | MUST |

```go
// wrong: rejected below go 1.27, and never satisfies an interface method
func (b Box[T]) Map[U any](f func(T) U) Box[U] { return Box[U]{f(b.v)} }

// right: a package-level function that takes the receiver first
func BoxMap[T, U any](b Box[T], f func(T) U) Box[U] { return Box[U]{f(b.v)} }
```

## golangci-lint: Deprecations, Superseded Imports, Time

One gate, `golangci-lint run ./...` with the fleet configuration (GO-GATE-09), reports all four rows. Exit 0 with `0 issues.` is the pass, and GO-LANG-05's grep passes on empty output.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-LANG-05 | Never disable SA1019 repo-wide: no `-SA1019` in golangci-lint's staticcheck `checks` or in `staticcheck.conf`. Suppress one site with `//nolint:staticcheck // SA1019: reason`, or with an exclusion scoped to the deprecation message. Treat an SA1019 hit on a symbol with no `//go:fix inline` shim as a manual rewrite `go fix` never does: `httputil.ReverseProxy.Director` to `Rewrite`, `reflect.SliceHeader`/`StringHeader` to `unsafe.Slice`/`unsafe.String`. | An empty `go fix -diff` is not "nothing deprecated", because only shimmed APIs are inlined. A global `-SA1019`, copied from widely read repositories including kubernetes and terraform, hides `rand.Seed` and every future deprecation. | `grep -rn -e '-SA1019' --include='*golangci*' --include='staticcheck.conf' .`: any output is the finding, and empty output is the pass. | MUST |
| GO-LANG-06 | Never call `math/rand.Seed`. For a reproducible sequence, build a local generator, `rand.New(rand.NewPCG(s1, s2))` from `math/rand/v2`, and pass it explicitly. New code imports `math/rand/v2`, never v1. Secrets come from `crypto/rand`, and the G404 suppression for non-security jitter is GO-SEC-02's. | Since go 1.24 `Seed` is a no-op keyed on the main module's `go` line (`randseednop`), while at go 1.23 it still seeds. Bumping the line silently breaks "seeded" test data. | staticcheck in the gate reports `SA1019: math/rand.Seed has been deprecated`. | MUST |
| GO-LANG-22 | Never import `golang.org/x/exp/constraints`. Use `cmp.Ordered` and the stdlib `slices` and `maps`. **pinned:** the package-scoped depguard entry is part of GO-MOD-08's `superseded` list, never a deny on all of `golang.org/x/exp`. | Superseded since Go 1.21, with zero importers in 35 surveyed repositories. The Go blog's still-live 2022 generics introduction shows it as the canonical constraint, so models reproduce the import. | The gate reports `import 'golang.org/x/exp/constraints' is not allowed from list 'superseded'` (measured 2026-09-26). | MUST |
| GO-LANG-07 | Compare `time.Time` with `Equal`, never `==` or `!=`. Never key a map or a dedup set by a raw `time.Time`: key by `t.UnixNano()`, or apply one normalization (`t.UTC().Round(0)`) to every key on every path. | `==` also compares the monotonic reading and the Location, so a JSON round-trip of the same instant is unequal and a map lookup misses silently. | revive `time-equal`, in GO-GATE-15's rule list, with zero false positives on 435k lines of exemplar code (measured 2026-09-26). gocritic misses it. Map keys: `grep -rn --include='*.go' -e 'map\[time\.Time\]' .`, then read each hit. Empty output is the pass. | MUST |

```go
// wrong: a no-op once the main module says go 1.24, so the data changes every run
rand.Seed(42)
return rand.Intn(10)

// right: a local math/rand/v2 generator, passed to whatever needs it
r := rand.New(rand.NewPCG(42, 0))
return r.IntN(10)
```

## Iterators: gopls `yield` and goleak

```sh
# gopls-yield: pinned gopls v0.23.0, run where grep -rln --include='*.go' -e 'func(yield func(' . prints a file
find . -name '*.go' -not -path '*/vendor/*' -print0 | xargs -0 -r gopls check | grep -e 'yield may be called again'
go test ./...
```

For `gopls-yield`, any output is the finding and empty output is the pass. `gopls check` exits 0 even with
findings, so the trailing grep is the verdict. `go vet`, golangci-lint's govet at `enable-all` and
`staticcheck -checks all` carry no `yield` check (measured 2026-09-26). GO-GATE-01 runs this as its
conditional step.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-LANG-08 | Never let an `iter.Seq`/`iter.Seq2` producer call `yield` again after it may have returned false. Check the result (`if !yield(v) { return }`) wherever another `yield` or loop iteration can follow on some path. A `yield` that is the last action on its path may go unchecked, but name that shape in review. Each exported producer gets one test that `break`s out of a `range` over it early. | The runtime panics only when some consumer exits early, so the defect ships green. No fixer writes iterators. | `gopls-yield` above, watched red on the loop and sequential shapes and green on the terminal and checked ones. Runtime: the early-break test under `go test ./...` panics with `range function continued iteration after function for loop body returned false`. | MUST |
| GO-LANG-18 | Every `iter.Pull`/`iter.Pull2` call keeps `stop`: `defer stop()` on the next line, or store it on a value whose `Close` every path reaches. Never discard it with `_`. A package that calls `iter.Pull` counts as spawning a goroutine for GO-CONC-11, so it gets `goleak.VerifyTestMain(m)` and one test that stops consuming before the sequence ends. | A discarded or unreached `stop` leaks the iterator's goroutine permanently, and vet, staticcheck and golangci-lint are silent. | `go test ./...` with `goleak.VerifyTestMain` reports `found unexpected goroutines` naming `iter.Pull`. `synctest.Test` is the stdlib-only alternative for this one shape. Locate sites with `grep -rn --include='*.go' -e 'iter\.Pull(' -e 'iter\.Pull2(' .` and read each for `stop`. Empty output means the row does not apply. | MUST |

```go
// wrong: keeps yielding after the consumer's break, which panics at run time
for _, x := range xs {
	yield(x)
}

// right: return as soon as yield reports false
for _, x := range xs {
	if !yield(x) {
		return
	}
}
```

## Golden Output: Map Order, `omitzero`, json/v2

`go test -run 'Golden' -count=5 ./...` is the gate. Any FAIL among the runs is the finding. Contract output
means an SDK envelope, any CLI `--json` output, and every golden file.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-LANG-09 | Never let map iteration order reach observable output. A hand-written `range` over a map that feeds a writer, a hash, a golden file, a manifest or an emitted slice ranges over `slices.Sorted(maps.Keys(m))`. Add no sort before `json.Marshal` or `fmt` of a map, because both already sort keys. Fix a flaky golden by sorting, never by re-recording it, and give every map on a golden's output path at least 8 entries. | The spec leaves the order unspecified and no linter covers it. Small maps repeat by luck: across 5 runs a 2-key map comes out identical 51% of the time, a 4-key map 10%, an 8-key map at most 0.1% (measured 2026-09-26). | The gate command. The 8-entry clause is a reading check of the test data. | MUST |
| GO-LANG-10 | On contract output, never swap `omitempty` for `omitzero` on a slice or map field, and never accept the `omitzero` fixer's declined alternative, without a byte-golden test that builds the field both `nil` and empty-non-nil. | `omitempty` drops both `nil` and `[]T{}`, while `omitzero` drops only `nil` and emits `"tags":[]`. The fixer only removes the no-op `omitempty` on struct-typed fields, so the slice swap is always a hand edit. | The golden over both constructions, run before and after the tag change: `{}` turning into `{"tags":[]}` is the finding. | MUST (contract output) · SHOULD elsewhere |
| GO-LANG-11 | Import plain `encoding/json` and add nothing for Go 1.27: no compatibility shim, no build-tag split, no `GOEXPERIMENT=nojsonv2` pin, and one golden per test, not one per toolchain leg. | v1 output is byte-identical under the 1.27.1 default and `nojsonv2` for duplicate names, invalid UTF-8, case mismatch, large integers, `omitempty`, `MarshalIndent` and HTML escaping. Only error text may differ, which GO-ERR-14 forbids matching. `nojsonv2` is slated for removal. | Run the golden test once by default and once under `GOEXPERIMENT=nojsonv2`, then `diff` the outputs. Empty output is the pass. It is a regression tripwire, since no violation exists by construction. | SHOULD |

## Reading Heuristics: Numbers, Runes, Generics

No analyzer in golangci-lint v2.14.0, staticcheck 2026.2.1 or gopls v0.23.0 catches these rows. Each failure
was watched at run time or compile time except GO-LANG-14's, GO-LANG-24's, GO-LANG-25's and GO-LANG-26's, which are design judgments. A
grep here is a work list: empty output means the row does not apply, and each hit is read, not counted.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-LANG-12 | Decode JSON whose integers can exceed 2^53 into typed fields (`int64`, `uint64`, `json.Number`) or through `Decoder.UseNumber()`, never into `any` or `map[string]any`. **pinned:** an SDK that wraps a CLI decodes the CLI's JSON envelope into typed structs only. | `9007199254740993` decodes to `9.007199254740992e+15` with `err == nil`, and the 1.27 v2 backing does not change that. | `grep -rn --include='*.go' -e 'map\[string\]any' -e 'map\[string\]interface{}' .`, then read each unmarshal target. | SHOULD |
| GO-LANG-13 | Index, slice or truncate a string that is not guaranteed ASCII (registry and OCI names, user input, paths, error text) by rune, never by byte offset. Fuzz such helpers with multibyte seeds and assert `utf8.ValidString` (GO-TEST-14). | `"café-ñandú"[:4]` is `"caf\xc3"`, invalid UTF-8 and no panic. SA6003 is a performance check on a different pattern and does not fire. | `grep -rn --include='*.go' -E -e '\[:[0-9]+\]' .` is a broad aid that also matches byte slices. The fuzz target makes it mechanical. | SHOULD |
| GO-LANG-20 | When the element type can be a float, route every comparator given to `slices.SortFunc`, `SortStableFunc`, `BinarySearchFunc`, `CompareFunc`, `MinFunc`, `MaxFunc` or `sort.Slice` through `cmp.Compare` or `cmp.Less`, or call the `cmp.Ordered` functions directly. Never hand-roll `<` for these, and never write a `Number` constraint with `if a < b` for a min or max helper. | With NaN present `<` is not a strict weak ordering. The measured output is `[3 NaN 1 NaN 2]`, and `naiveMax(1, NaN) != naiveMax(NaN, 1)`. `cmp.Compare` orders NaN first, deterministically. | `grep -rn --include='*.go' -e 'SortFunc(' -e 'SortStableFunc(' -e 'BinarySearchFunc(' -e 'CompareFunc(' -e 'MinFunc(' -e 'MaxFunc(' -e 'sort\.Slice(' .`, then read each comparator for a bare `<` or `>` on a float operand. | MUST (float-capable) · SHOULD elsewhere |
| GO-LANG-21 | When a `comparable` type parameter can be instantiated with `any` or another interface type, document that an uncomparable dynamic value (slice, map, func) panics on `==` or as a map key, and test that path if external input reaches it. | Since Go 1.20 interface types satisfy `comparable` statically, so `hash of unhashable type []int` appears only at run time. | Read every `[K comparable]` parameter instantiated with, or exported for, `any` or an interface type. | SHOULD |
| GO-LANG-24 | Constrain a generic interface's own type parameter with `any`. Put a stronger constraint (`comparable`, `cmp.Ordered`, a self-referential method constraint) on the concrete implementations, unless every implementation needs it. | An over-constrained interface forecloses implementations that do not need the extra power. The Go blog's generic-interfaces post says to leave stronger constraints to implementations. | For each generic interface, compare its constraint with what every in-module implementation uses. | SHOULD |
| GO-LANG-25 | Name iterator-returning functions by the `iter` convention: `All` for the single natural full sequence, `Backward` for reverse order, `Keys` or `Values` for map-like projections, and a domain name (`Preorder`) when several sequences exist and none is the default. Put configuration on the arguments (`Scan(min, max)`), never on a family of name variants. | The stdlib (`slices.All`, `maps.Keys`, go 1.23) sets the reader's expectation, and an off-convention name hides which sequence is the default. | `go doc` review of each exported iterator-returning name against the convention. | SHOULD |
| GO-LANG-19 | Write a constraint's basic-kind elements as approximations (`~string`, `~int`) unless the constraint deliberately excludes named types. When a caller hits `possibly missing ~`, fix the constraint once, never by converting at the call site. | Without `~` every `type ID string` is rejected, and the error surfaces at some later caller, not at the constraint's author. | Read at authoring time. Once triggered, `go build` prints `does not satisfy` followed by `possibly missing ~`. | SHOULD |
| GO-LANG-14 | Add a type parameter only when the module instantiates it with two or more types, or the algorithm is type-indifferent (a container, a `slices`- or `maps`-style helper). Otherwise write concrete code or an interface. Apply the single-instantiation finding only to unexported or internal functions, because a repo-local count cannot see an exported function's callers. | No fixer ever introduces a type parameter, and "write code, not types" is the Go team's guidance. Counting `Name[` misses nearly every inferred call. | From the declaring package's directory (rename `contains`): `NAME=contains; grep -rn --include='*.go' -e "\b$NAME(" .`. The declaration does not match, so one line of output is one call site, the finding. `Name[` counts only zero-argument constructors such as `New[T]()`. | SHOULD |
| GO-LANG-26 | Export `[]T` for a collection that is fully materialized before the call returns (one response body, one JSON document, one completed scan). Export `iter.Seq[T]` or `iter.Seq2[K, V]` only for an unbounded, lazy or single-pass source. **pinned:** an SDK's envelope collections (installed packages, tags) export `[]T`. | `iter.Seq` costs every caller that is not a plain `for` a `slices.Collect`, and buys nothing when no laziness exists. | One question per exported collection: does the producer hold the whole collection before returning? If yes, `[]T`, and an `iter.Seq` is the finding. | MUST (SDK) · SHOULD elsewhere |

## Moving to a New Go Release

The `go-upgrade` skill runs these rows as numbered steps and cites their IDs.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-LANG-15 | Move a module to a new release in this order. (1) Read the notes of every release crossed against the silent-change table below. (2) Save `go list -f '{{.DefaultGODEBUG}}' ./...` before and after, and account for each difference. (3) Bump `go`, then the CLI's `toolchain` line (GO-MOD-01, GO-MOD-02), as a deliberate change. (4) Run `go fix ./...` after the bump and read stderr for `ignoring alternative fix`. (5) Run `go vet ./...` and clear `stdversion`. (6) Bump the golangci-lint pin and config (GO-GATE-08). (7) Run GO-LANG-16's audit. (8) Run the full gate (GO-GATE-01). Only then triage govulncheck (GO-MOD-12), as a separate diff. | Fixers decline below the new floor, so `go fix` before the bump under-modernizes. Dependabot never opens a toolchain-only PR ([dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520), open on 2026-09-26), so the bump is scheduled work. | Each step's own check. Step 4's order was watched: `errorsastype` is silent at go 1.25 and fires at go 1.26. | SHOULD |
| GO-LANG-16 | On every `go`-line bump, re-justify each opt-out `GOEXPERIMENT` pin (`nojsonv2`, `nogreenteagc`, any `no`-prefixed name) in a Makefile, Dockerfile, workflow or script, and give each a comment saying why. An opt-out of a now-default experiment is a real opt-out: `nojsonv2` and `nogreenteagc` on 1.27.1 both change behaviour. An opt-in pin of a now-default experiment is a harmless no-op. A pin naming a removed experiment breaks the build. | A pin written for an earlier release silently keeps a module on the old JSON implementation or the old GC after the bump. Both opt-outs are announced for removal, so each minor needs a re-check. | `grep -rn -E --exclude-dir=.git -e 'GOEXPERIMENT[^a-zA-Z0-9_]+([a-z0-9]+,)*no[a-z0-9]+' .` lists every opt-out pin in any file type, YAML env maps included (measured 2026-09-26). Output is the work list: a hit with no reason comment beside it is the finding, and empty output means no opt-out pin exists. A binary's own stamp is GO-OBS-22's check. | SHOULD |
| GO-LANG-17 | In a repository that commits `go.work`, keep its `godebug` block identical to every member module's own `godebug` lines, or have neither. | In workspace mode a member's `godebug` is ignored without warning, while under `GOWORK=off` (GO-MOD-05's per-member CI leg) it applies, so the two builds run with different runtime defaults. | `godebug-parity` below, run from the workspace root. Any output is the finding, and empty output is the pass. It compares every main and test-main package under each member, so a library member is covered through its tests (watched 2026-09-26 on Go 1.27.1: red on a library member with a test and on a main member, empty on the twin). | SHOULD |

```sh
# godebug-parity
go list -m -f '{{.Dir}}' | while read -r d; do
  ws=$(go -C "$d" list -test -f '{{if eq .Name "main"}}{{.ImportPath}} {{.DefaultGODEBUG}}{{end}}' ./...)
  off=$(GOWORK=off go -C "$d" list -test -f '{{if eq .Name "main"}}{{.ImportPath}} {{.DefaultGODEBUG}}{{end}}' ./...)
  [ "$ws" = "$off" ] || echo "godebug differs: $d"
done
```

**Silent-change table.** GO-LANG-15 step 1 reads it. Each change arrives with no compile error.

| Change | Keyed on | Caught by |
|---|---|---|
| Per-iteration loop variables | the file's effective version, 1.22 | `go fix` `forvar` removes the dead copy (GO-LANG-02) |
| `slices.Insert` panics on an out-of-range index | 1.22 | tests only |
| Unbuffered timer channels | the `go` line at 1.23 on toolchains 1.23 to 1.26, unconditional on 1.27, where `asynctimerchan=1` is a fatal error | `go build` (GO-MOD-04) |
| `math/rand.Seed` is a no-op | the main module's `go` line, 1.24 (`randseednop`) | SA1019 (GO-LANG-06) |
| Container-aware `GOMAXPROCS` | the main module's `go` line, 1.25 | GO-MOD-09 |
| "Core type" leaves the spec, so compiler error text changes and behaviour does not | 1.25 | nothing needed |
| `encoding/json` v1 backed by v2: bytes unchanged, error text may differ | the 1.27 toolchain, a `GOEXPERIMENT` rather than the `go` line | GO-LANG-11, GO-ERR-14 |
| A stdlib symbol newer than the `go` line compiles | never compiler-enforced | `stdversion`, the oldstable leg (GO-LANG-04) |

## What Agents Get Wrong Here

1. **Writes pre-1.21 idioms, or hand-"modernizes" past what a fixer allows.** `go fix -diff ./...` catches the first, and GO-LANG-01's four declined shapes are read.
2. **Ranges a map straight into output, then "fixes" the flaky golden by re-recording it.** A 2-key fixture hides the defect half the time (GO-LANG-09).
3. **Decodes "flexible" JSON into `map[string]any` and reads numbers back out** (GO-LANG-12).
4. **Trusts a green build or an empty `go fix -diff` as "modern and compatible"** without reading the `go` line and the file's build tag (GO-LANG-02, GO-LANG-04).
5. **Calls `rand.Seed(n)` for reproducibility**, and copies a repo-wide `-SA1019` that hides it (GO-LANG-06, GO-LANG-05).
6. **Writes a `for`-loop iterator that ignores `yield`'s result.** It compiles, passes vet, staticcheck and golangci-lint, and panics only when a consumer breaks early (GO-LANG-08).
7. **Adds a type parameter "for later reuse"** to a function used with one type, then counts callers with `Name[` (GO-LANG-14).
8. **Compares `time.Time` with `==`, or keys a cache by it** (GO-LANG-07).
9. **Reaches for `x/exp/constraints.Ordered`, or a hand-rolled `Number` constraint with `<`** (GO-LANG-22, GO-LANG-20).
10. **Bulk-renames `omitempty` to `omitzero`** on contract output (GO-LANG-10).
11. **Puts a type parameter on a method below 1.27 or on an interface method, then bumps the `go` line**, which never helps the interface case (GO-LANG-23, GO-LANG-03).
12. **Exports `iter.Seq[T]` "because iterators are modern"** for a slice it already holds (GO-LANG-26).
13. **Calls `iter.Pull` and drops `stop`** (GO-LANG-18).
14. **Truncates with `s[:n]` for display** (GO-LANG-13).
15. **Forgets `~` in a constraint, then converts at every call site** (GO-LANG-19).
16. **Adds json/v2 shims or a `nojsonv2` pin "for 1.27 safety", or imports `encoding/json/v2` into a 1.26 library** (GO-LANG-11, GO-LANG-04).
17. **Resurrects stale knobs and vocabulary:** `GODEBUG=asynctimerchan=1` (fatal on 1.27), an invented `ioutil` fixer, "`waitgroup` was renamed" (the vet analyzer `waitgroup` and the fixer `waitgroupgo` are two tools), and "core type" as current spec wording. `go tool fix help` lists the real fixer names.
18. **Waits for Dependabot to bump `toolchain`** (GO-LANG-15).


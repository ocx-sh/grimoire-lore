---
title: "Generics and iterator design"
topic: "When a type parameter earns its place, constraint choice (any/comparable/~T/cmp.Ordered), why methods could not have type parameters before Go 1.27, generic type aliases, generic interfaces, and writing iter.Seq/iter.Pull correctly"
agent: "language/generics-and-iterators (wave 4 dive)"
model: sonnet
date_researched: 2026-09-26
sources_count: 15
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/generics-and-iterators/
scope: |
  Design judgment for type parameters and constraints (when to add one, any
  vs comparable vs cmp.Ordered vs a hand-rolled constraint, ~T approximation,
  generic interfaces, self-referential constraints, generic type aliases),
  and correctness/lifecycle rules for iter.Seq/Seq2/Pull/Pull2. Does not
  re-cover era idioms already in go-language.md (go fix, json/v2, rand.Seed,
  time.Time equality, map order, SA1019) or API-surface questions owned by
  GO-API. Revises go-language.md (GO-LANG): holds GO-LANG-01..17 stable,
  amends GO-LANG-03/08/14 with new evidence, and adds GO-LANG-18..26.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Type parameters: when they earn their place](#1-type-parameters-when-they-earn-their-place)
   2. [Constraints: any, comparable, and the 1.20 runtime-panic trap](#2-constraints-any-comparable-and-the-120-runtime-panic-trap)
   3. [~T approximation elements](#3-t-approximation-elements)
   4. [cmp.Ordered vs a hand-rolled Number constraint, and NaN](#4-cmpordered-vs-a-hand-rolled-number-constraint-and-nan)
   5. [constraints.Ordered from golang.org/x/exp: superseded, not deprecated](#5-constraintsordered-from-golangorgxexp-superseded-not-deprecated)
   6. [Methods cannot have type parameters — until Go 1.27, and interface methods never can](#6-methods-cannot-have-type-parameters--until-go-127-and-interface-methods-never-can)
   7. [Generic interfaces and self-referential constraints](#7-generic-interfaces-and-self-referential-constraints)
   8. [Generic type aliases](#8-generic-type-aliases)
   9. [Core types are gone from the spec (Go 1.25)](#9-core-types-are-gone-from-the-spec-go-125)
   10. [Writing iter.Seq/Seq2 correctly: the yield contract](#10-writing-iterseqseq2-correctly-the-yield-contract)
   11. [iter.Pull/Pull2: the stop discipline](#11-iterpullpull2-the-stop-discipline)
   12. [Iterator naming conventions](#12-iterator-naming-conventions)
   13. [Should the SDK export iter.Seq or []T?](#13-should-the-sdk-export-iterseq-or-t)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- An ignored `yield` return value inside a **loop** panics at runtime the moment a consumer breaks early (`range function continued iteration after function for loop body returned false`); `go vet`, `staticcheck -checks all`, and `golangci-lint` with every linter enabled (v2.14.0) all stay silent — this is GO-LANG-08, reconfirmed with a broader linter run.
- The same ignored `yield` return, when it is provably the **last statement on every path** (nothing follows it, no further `yield` call in that invocation), never panics — this is the exact shape used 6+ times in `prometheus/promql/parser` and `bazelbuild/bazel-gazelle`, and it sharpens GO-LANG-08's blanket MUST into a narrower one.
- `iter.Pull`/`iter.Pull2` without a called `stop` leaks the iterator's driving goroutine permanently (measured with `runtime.NumGoroutine`); no analyzer catches it either. All 6 real `iter.Pull` sites across 4 exemplar repos call `stop` (3 `defer`, 2 stored-and-closed, 1 unconditional call before return) — the discipline is universal where the API is used at all, but the API itself is rare (6 sites / 35 repos).
- The Go 1.20 `comparable` relaxation lets `any`/interface-typed type parameters satisfy `comparable`, but a dynamic value that is itself uncomparable (a slice, map, or func) still panics at runtime on `==`/map-key use — the spec says this explicitly, and no vet/staticcheck/golangci check flags it.
- Forgetting `~` on a constraint's type element rejects every named/defined type with that underlying type; the compiler's own error message names the fix (`possibly missing ~ for string in StringLike`) — but only once a caller tries to instantiate it, so the mistake surfaces as someone else's compile error, not the author's.
- `cmp.Ordered`/`cmp.Compare` give floats a genuine total order (NaN sorts before everything, deterministically); a hand-rolled `<`/`>` comparator is not a strict weak ordering when NaN is possible, and `slices.SortFunc` with such a comparator produces **provably unsorted output** — measured directly, not theoretical.
- `slices.Sort` is declared `[S ~[]E, E cmp.Ordered]`, not `[E cmp.Ordered](s []E)`, specifically so a named slice type (`type IDs []string`) can be sorted without a conversion; the same `~[]E` pattern recurs across every `slices` function.
- `golang.org/x/exp/constraints` is fully superseded by stdlib `cmp.Ordered` since Go 1.21 and is watchably deniable with `depguard`; it is absent from the exemplar corpus's own generic-function census entirely, but the Go team's 2022 "Introduction to Generics" post still shows it as the canonical example — a stale-canonical-source trap for anything trained on it.
- Go 1.27 lets a **method** declare its own type parameters (`generic method requires go1.27 or later` is the exact gate error below that line); **interface methods can never declare type parameters, at any version** (`interface method must have no type parameters`), and the pre-1.27 workaround — a package-level generic function taking the receiver as a parameter — is still the only option for interfaces.
- Generic type aliases (`type S[T any] = []T`) are fully supported, including across package boundaries, on any module whose declared `go` line is ≥ 1.23 when built with a Go 1.27.1 toolchain; the exact floor error is `generic type alias requires go1.23 or later`. The 1.23 release notes' "not yet supported across package boundaries" caveat describes that release's preview window only and no longer holds once compiled by a newer toolchain — go-language.md's GO-LANG-03 statement that they are "for migration shims only" is a scope choice (the fleet's SDK floor is 1.26.0, comfortably above the gate), not a technical limit.
- A generic interface should constrain its own type parameter with `any` unless every conceivable implementation genuinely needs more — pushing a stronger constraint (`comparable`, `cmp.Ordered`) onto the interface itself forecloses implementations that don't need it; self-referential constraints (`type Adder[A Adder[A]] interface { Add(A) A }`, Go ≥ 1.26) are the idiomatic way to say "a type that can act on its own kind."
- Core types no longer exist in the language spec as of Go 1.25 (`go.dev/blog/coretypes`); the underlying-type and element-type rules for generic operands were rewritten as explicit prose instead. No current-day behavior changed, but any explanation that invokes "core type" for spec reasoning is describing pre-1.25 spec structure, not current rules.
- 894 func-level and 560 type-level type-parameter declarations were counted across the 35-repo corpus (non-vendor, non-testdata); `golang/tools` (350) and `tailscale/tailscale` (371) are the largest single-repo counts and, together with `dominikh/go-tools`, the best-curated iterator and generics examples in the corpus.
- Counting call sites by grepping explicit `Name[T](...)` syntax under-counts almost to zero, because Go's type inference means most calls never write the brackets; the corpus's own audits used this measure and produced numbers close to zero for several genuinely multi-use functions. The correct heuristic is `\bName\(` scoped to the declaring package (plus qualified cross-package calls for exported names), and even that heuristic has real false positives from name collisions across packages — state the method whenever this heuristic is used.
- The owner default stands and is now evidenced: the SDK exports `[]T`, never `iter.Seq[T]`, because every collection the SDK's envelope produces (installed packages, tags) is already fully materialized before the call returns; `iter.Seq` earns its place only for a genuinely unbounded, lazy, or single-pass sequence, which the SDK does not have.

## Findings

### 1. Type parameters: when they earn their place

GO-LANG-14 already states the rule ("add a type parameter only when the
module instantiates it with two or more types, or when the algorithm is
type-indifferent") and cites 1,420 corpus-wide declarations from
[shape](../go-audit/exemplar-code-shape.md) §3. This dive re-measures with a
declaration-kind split and corrects the instantiation-counting method.

**Declaration kind, re-measured** (non-vendor, non-testdata,
`grep -rIn --include='*.go' -e '^func [A-Za-z_][A-Za-z0-9_]*\[' .` and the
`type` equivalent, run 2026-09-26): **894 func-level, 560 type-level** across
the 35 repos, a 1.6:1 ratio favoring function type parameters. `golang/tools`
(221 func / 98 type) and `tailscale/tailscale` (235 func / 136 type) dominate
by volume; `dominikh/go-tools` (59/46), `hashicorp/terraform` (84/67) and
`kubernetes-sigs/controller-runtime` (38/60, type-heavy) follow. 13 of the 35
repos have zero or near-zero generic declarations (`stretchr/testify`,
`google/go-cmp`, `spf13/cobra`, `ko-build/ko`, `sigstore/cosign`,
`kubernetes/kubernetes` — consistent with the corpus's own convention of
depth-1, mostly-generated-away shapes).

**The instantiation-counting method matters and the existing dive likely
undercounted.** Grepping for `Name[` (explicit type-argument syntax) finds
almost no call sites for exported constructors like
`grpc-go@acccf8cd101a:internal/optional/optional.go:30` (`New[T any]`) or
`google/go-containerregistry@0c8bedb78437:pkg/v1/remote/options.go:370`
(`Reuse[I *Puller | *Pusher]`) — because Go's type inference means calls are
written `optional.New(5)`, not `optional.New[int](5)`. Re-running with
`\bName\(` instead: `grpc-go`'s `NewRefCounted` has 15 call sites,
`NewEndpointMap` 20, `NewAddressMapV2` 16; `junegunn/fzf@b1be3a8be1b8`'s
`Constrain` has 28. Zero-argument generic constructors are the one case where
explicit brackets are required (nothing to infer from), so
`NewConcurrentSet[T]()` in `junegunn/fzf@b1be3a8be1b8:src/util/concurrent_set.go:12`
is correctly found by the bracket grep (1 call site) and *not* found by the
paren grep — the two greps measure different things and neither alone is
sound. **False-positive/false-negative risk:** the paren grep matches any
call whose base name collides with an unrelated function in another package
unless scoped to the same directory or package-qualified; the bracket grep
misses every inferred call. State which method was used whenever this count
is cited.

**Confirmed single-instantiation-in-repo candidates** (both greps agree, ≤1
call site found): `bazel-contrib/rules_go@970e99d77c8b:go/tools/gopackagesdriver/utils.go:100,112,122`
(`contains`, `containsAll`, `equalSets` — 1 call site each) and
`google/go-containerregistry@0c8bedb78437:pkg/v1/remote/options.go:370`
(`Reuse` — 1 call site). None of these are exported SDK-style APIs; all are
internal helpers, which is the shape [Ian Taylor's guidance](https://go.dev/blog/when-generics)
calls out as the wrong path ("write Go programs by writing code, not by
defining types... it's easy to add type parameters later"). A single
internal instantiation with no external consumer is the strongest signal;
a single instantiation of an *exported* function is not evidence of misuse,
because external callers are invisible to a repo-local grep.

### 2. Constraints: any, comparable, and the 1.20 runtime-panic trap

The spec is explicit and normative here, and states the hazard directly:

> "Because of the exception in the constraint satisfaction rule, comparing
> operands of type parameter type may panic at run-time (even though
> comparable type parameters are always strictly comparable)."
> — [go.dev/ref/spec §Satisfying a type constraint](https://go.dev/ref/spec#Satisfying_a_type_constraint)

The exception referenced is the Go 1.20 relaxation: a **strictly
comparable** constraint (such as the predeclared `comparable`) may also be
satisfied by a type argument that is merely **comparable** — which includes
`any` and other interface types, whose comparability depends on their
*dynamic* value at runtime, not their static type. Fixture `constraints/comparablepanic`:

```go
type Set[K comparable] struct{ m map[K]struct{} }
func (s *Set[K]) Add(k K) { s.m[k] = struct{}{} }
...
s := NewSet[any]()
s.Add(1)
s.Add("ok")
s.Add([]int{1, 2, 3}) // dynamic type []int is not comparable
```

`go run` panics: `runtime error: hash of unhashable type []int` (exit 1).
`go vet`, `staticcheck -checks all`, and `golangci-lint run` with every
linter enabled all report clean (0 relevant findings; see [Verification
runs](#verification-runs), G1). This is a real gap: `comparable` reads as a
static safety guarantee, and for every concrete type argument it is one —
the hazard exists exactly at the boundary the 1.20 relaxation opened, and
only when the type argument is (or contains) an interface type.

### 3. ~T approximation elements

An interface used as a constraint may list types as **elements** of a union
(`int|string`) or **approximation elements** (`~int|~string`). Without `~`,
only the exact listed type satisfies the element; with it, any type whose
*underlying* type matches also satisfies it — including named types the
constraint's author never anticipated. Fixture `approxelem/`:

```go
// missing ~
type StringLike interface{ string }
func Upper[T StringLike](v T) string { return string(v) }
type MyID string
Upper(MyID("abc")) // compile error
```

```
./main.go:18:19: MyID does not satisfy StringLike (possibly missing ~ for string in StringLike)
```

Adding `~string` to the constraint fixes it with no other change (exit 0).
The compiler's own message names the fix, which is a good sign for an
agent *reading* a build failure — but the mistake is made once, at
constraint-authoring time, and only surfaces later, at some other caller's
site, as a compile error that looks like the caller's fault. There is no
static analyzer that flags a missing `~` proactively (nothing to flag — the
interface is not wrong until someone tries to use it with a named type), so
the mechanical check is at authoring time: **any constraint element for a
basic kind (`string`, numeric kinds, slice/map/chan literals) that isn't
already restricted for a specific reason should default to `~`.**

### 4. cmp.Ordered vs a hand-rolled Number constraint, and NaN

`cmp.Ordered` is defined ([pkg.go.dev/cmp#Ordered](https://pkg.go.dev/cmp#Ordered))
as integer, float, and string kinds, and both `cmp.Compare` and `cmp.Less`
document a **total order** for floats: "a NaN is considered less than any
non-NaN, a NaN is considered equal to a NaN". `slices.Sort`
([pkg.go.dev/slices#Sort](https://pkg.go.dev/slices#Sort)) uses exactly this
order and documents it: "When sorting floating-point numbers, NaNs are
ordered before other values." A hand-rolled constraint using `<`/`>`
directly does not get this for free. Fixture `constraints/naive-vs-cmp`:

```go
func naiveMax[T Number](a, b T) T { if a < b { return b }; return a }
naiveMax(1.0, NaN)  // = 1     (NaN < 1.0 is false)
naiveMax(NaN, 1.0)  // = NaN   (1.0 < NaN is also false: returns a again)
```

The same value pair gives a **different answer depending on argument
order** — a real correctness bug, not a style nit. And:

```go
slices.Sort(xs)                    // cmp.Ordered path: [NaN NaN 1 2 3]
slices.SortFunc(ys, naiveCompare)   // hand-rolled <: [3 NaN 1 NaN 2]
```

`slices.SortFunc`'s own doc says the comparator "should return a negative
number when a < b... SortFunc requires that cmp is a strict weak ordering."
A `<`/`>`-based comparator is not one once NaN is possible (NaN compares
false to everything), and the measured output above is **literally not
sorted** — this is not a theoretical concern. Route any hand-written
comparator through `cmp.Compare`/`cmp.Less`, or use `cmp.Ordered` directly,
whenever the element type can be a float.

### 5. constraints.Ordered from golang.org/x/exp: superseded, not deprecated

`golang.org/x/exp/constraints` predates `cmp.Ordered` (introduced Go 1.21)
and is not marked deprecated by its own module (no build tag, no doc
comment says so) — it is simply superseded. It is absent from the 35-repo
corpus's generic-constraint census entirely (0 hits for `constraints\.Ordered`
across all non-vendor, non-testdata `.go` files, re-measured 2026-09-26,
consistent with [shift](../go-topic-map/shifts.md)'s broader `x/exp`
findings). It compiles and runs today (fixture
`constraints/xexp-depguard`, `go run .` → `5`, exit 0) and is watchably
denied with `depguard`:

```yaml
linters:
  settings:
    depguard:
      rules:
        main:
          deny:
            - pkg: "golang.org/x/exp"
              desc: "superseded by stdlib cmp.Ordered / slices / maps since Go 1.21"
```

`golangci-lint run` reports 1 issue on the violation fixture, 0 on the
`cmp.Ordered` twin ([Verification runs](#verification-runs), G6/G6b). The
trap for an agent: the Go team's own 2022 "[An Introduction To
Generics](https://go.dev/blog/intro-generics)" post — still live, still
indexed, still a natural search result for "Go generics tutorial" — shows
`constraints.Ordered` from `x/exp` as *the* canonical constraint example,
because `cmp` did not exist yet when it was written. A model trained on that
page has no signal that the import went stale five years later.

### 6. Methods cannot have type parameters — until Go 1.27, and interface methods never can

Before Go 1.27, only the *receiver* of a method on a generic type could
carry type parameters (declared in the receiver specification, e.g.
`func (t *Tree[T]) Insert(...)`); the method itself could not introduce a
*new* one. Go 1.27 lifted this for methods on **concrete (non-interface)
types**: "[Go 1.27 now supports generic
methods](https://go.dev/doc/go1.27#language): a method declaration may
declare its own type parameters... Note that methods of interfaces may not
declare type parameters nor can interface methods be implemented by generic
methods." The spec's method-declaration grammar carries the
`[Go 1.27]` version tag exactly at the type-parameter-list production
([go.dev/ref/spec §Method declarations](https://go.dev/ref/spec#Method_declarations)).

Fixtures `methodtypeparam/{go126,go127}` (identical source, differing only
in `go.mod`'s `go` line):

```go
func (b Box[T]) Map[U any](f func(T) U) Box[U] { return Box[U]{v: f(b.v)} }
```

- `go 1.26` module, `go build`: `generic method requires go1.27 or later
  (-lang was set to go1.26; check go.mod)`, exit 1.
- `go 1.27` module, identical source: exit 0.

`methodtypeparam/interface-always-fails` (module at `go 1.27`, the highest
possible floor):

```go
type Mapper interface {
	Map[U any](f func(int) U) U
}
```

```
./main.go:4:5: interface method must have no type parameters
./main.go:4:25: undefined: U
```

This is version-independent: raising the floor never fixes it, because it
is not a floor gate but a permanent restriction stated in the 1.27 notes
themselves. `methodtypeparam/workaround` is the idiomatic fix at any floor
— a package-level generic function taking the receiver as its first
parameter, exactly [Ian Taylor's "for type parameters, prefer functions to
methods"](https://go.dev/blog/when-generics#prefer-functions) guidance:

```go
func BoxMap[T, U any](b Box[T], f func(T) U) Box[U] { return Box[U]{v: f(b.v)} }
```

This amends **GO-LANG-03**, whose existing text ("Generic methods... (1.27)
are CONSIDER until the GO-MOD-01 floor reaches them") is correct as stated;
this dive adds the exact compile-error text at both sides of the gate and
the permanent interface restriction, and the package-level-function
workaround as the mechanical fallback for any code below the floor or
inside an interface.

### 7. Generic interfaces and self-referential constraints

Interfaces are types, and — since Go 1.18 — types can have type parameters,
so interfaces can too. [go.dev/blog/generic-interfaces](https://go.dev/blog/generic-interfaces)
(2025) works through the resulting design space with a binary-tree example
and states the governing guidance directly:

> "If possible, type parameters on generic interfaces should use `any` as a
> constraint, allowing arbitrary types... try to leave any constraints
> (stronger than `any`) to concrete implementations, not the interfaces."

The motivating reason: different concrete implementations legitimately want
different constraints (a `cmp.Ordered`-based tree, a function-based tree, a
method-based tree), and an interface that over-constrains its own type
parameter forecloses implementations that don't need the extra power.

**Self-referential constraints** (Go ≥ 1.26,
[go.dev/doc/go1.26#language](https://go.dev/doc/go1.26)) let a generic
interface express "a type that can compare or combine with its own kind"
without a wrapper method:

```go
type Comparer[T any] interface { Compare(T) int }
type MethodTree[E Comparer[E]] struct { root *methodNode[E] }
```

`time.Time` already implements `Comparer[time.Time]` via its existing
`Compare(u Time) int` method, so `MethodTree[time.Time]` works with no
adapter. Before 1.26, `type Adder[A Adder[A]] interface{ Add(A) A }` was a
compile error (a generic type could not refer to itself in its own type
parameter list); it now compiles. This is design vocabulary the corpus does
not yet use (0 hits for a self-referential interface pattern in the 35-repo
census, unsurprising since 1.26 shipped February 2026 and the exemplars were
cloned mid-2026) — flag it as leading-edge, not yet a corpus-measurable
idiom.

The same post's closing sections cover the pointer-receiver trap directly
relevant to iterator-returning types: if `S`'s methods use pointer
receivers, a generic function that only has `S` (not `*S`) as a type
argument cannot get a valid zero value to call them on, forcing an extra
type parameter (`PS PtrToSet[S, E]` with `*S` in its type set) — the post's
own conclusion is to avoid this by taking the interface **value** as a
parameter instead of a type argument wherever the caller can supply one
directly (`func InsertAll[E any](set Set[E], seq iter.Seq[E])`).

### 8. Generic type aliases

A type alias may now be parameterized like a defined type:
`type S[T any] = []T`. Timeline, each confirmed against the toolchain:

| Go version | Status | Fixture / source |
|---|---|---|
| 1.23 | Preview, `GOEXPERIMENT=aliastypeparams`, "not yet supported across package boundaries" per that release's own notes | [go.dev/doc/go1.23#language](https://go.dev/doc/go1.23) |
| 1.24 | "Now fully supports generic type aliases"; `GOEXPERIMENT=noaliastypeparams` opt-out, slated for removal at 1.25 | [go.dev/doc/go1.24#language](https://go.dev/doc/go1.24) |
| 1.27.1 toolchain, any module ≥ go1.23 | Compiles and vets clean, **including across package boundaries**, with no experiment flag needed | fixtures `typealias/go124`, `typealias/go123` |
| module `go1.22` | Rejected: `generic type alias requires go1.23 or later (-lang was set to go1.22; check go.mod)` | fixture `typealias/go122` |

The last two rows are the load-bearing correction: this dive built the exact
package-boundary case the 1.23 notes warn about (`main` importing
`pkga.StringSlice[string]` where `pkga` declares the alias) at a `go 1.23`
module line, and it compiled and vetted clean under the go1.27.1 toolchain
(exit 0 both times). The 1.23-era restriction described a preview window
tied to that release's own compiler; it does not re-appear once a newer
toolchain builds an older-lined module. **go-language.md's GO-LANG-03**
framing ("generic type aliases (1.24) are for migration shims only") is
correct as a *scope* decision for the fleet — the SDK's floor is `go
1.26.0`, so the gate never binds — not a statement that cross-package use is
still restricted; this dive's evidence should replace any future reading of
GO-LANG-03 that assumes the 1.23 caveat still applies. `go vet` on the same
fixtures reports nothing beyond the build result (no alias-specific
diagnostic exists to name). `gopls` was not independently testable in this
sandbox (no `gopls` binary on the toolchain's `PATH`); nothing in the
fetched release notes or spec claims a gopls-specific limitation, so this is
reported as unverified rather than assumed clean.

### 9. Core types are gone from the spec (Go 1.25)

Go 1.18 introduced **core type** as an implementation-driven spec construct:
roughly, "the single underlying type shared by every type in a type
parameter's type set, if one exists." [go.dev/blog/coretypes](https://go.dev/blog/coretypes)
(Robert Griesemer, March 2025) explains why it was removed for Go 1.25
(proposal [#70128](https://go.dev/issue/70128), approved and implemented):
core types made specific operations (`close`, index expressions, `len`,
send statements) read as *exceptions*, forced non-generic-code readers to
learn a generics concept to understand ordinary rules, and were "overly
restrictive for specific operations" — the post names Go 1.24's slice
expression rules, which relied on core types and as a result forbade
slicing an operand of a type with no *single* underlying type even where it
would have been sound. The change is explicitly behavior-preserving
("no behavior was changed... a lot of prose in the language spec was
reverted to its original, pre-generics form") — it only changes how the
*specification itself* is written and what the compiler's error messages
say (they no longer mention "core type"). Anything written or trained
against a pre-2025 explanation of generic-operand rules that invokes "core
type" is describing spec *structure* that stopped existing at 1.25, even
though the underlying rules did not change.

### 10. Writing iter.Seq/Seq2 correctly: the yield contract

Restated from GO-LANG-08 with a sharper boundary. The contract from the
[iter package doc](https://pkg.go.dev/iter) and
[go.dev/blog/range-functions](https://go.dev/blog/range-functions): `yield`
returns `true` to continue, `false` to stop; "Yield panics if called after
it returns false" — but that panic is a *range-loop* runtime check
(`range function continued iteration after function for loop body returned
false`), and it only fires if the closure actually calls `yield` **again**
after a `false` return, in the same invocation. Two fixtures make the
boundary precise:

```go
// yieldignore/violation: LOOP that keeps calling yield after a false return
for i := 0; i < n; i++ {
	yield(i) // ignored; the loop calls yield again next iteration
}
```
`go run` panics on early `break` (exit 1); `go vet`, `staticcheck -checks
all`, and `golangci-lint run --config <default:all>` all report nothing
relevant (see G2 below).

```go
// yieldlast/safe-lastcall: a SINGLE yield call, nothing follows it
func single(v int) func(yield func(int) bool) {
	return func(yield func(int) bool) {
		yield(v) // ignored, but this is the only call — nothing to continue into
	}
}
```
`go run` with an immediate `break` in the consumer: **no panic**, exit 0
(fixture `yieldlast/safe-lastcall`; contrast `yieldlast/unsafe-loop`, which
puts the same single ignored call inside a `for` loop and panics exit 1).

This exact "last call in a branch, nothing follows" shape is a real,
common, and *correct* idiom in the corpus — not a latent bug:
`prometheus/prometheus@270db2915054:promql/parser/ast.go:407-441` (a type
switch over AST node kinds, most cases ending in a bare `yield(n.Expr)` with
no following statement) and
`bazelbuild/bazel-gazelle@63c9a3d2078f:pathtools/path.go:189` (a trailing
`yield(p)` after a loop that already checks `yield`'s result on every other
call). **The refinement to GO-LANG-08**: the MUST binds whenever a `yield`
call is followed, in the same closure invocation and on the same execution
path, by anything else — another `yield` call (in a loop or a later
statement), or any side-effecting code. It does not bind a `yield` call that
is provably the terminal action of that invocation. This is a correctness
distinction, not a style license: **the pattern is fragile** — a later edit
that adds code after a "safe" trailing `yield`, or wraps it back into a
loop, silently reintroduces the exact panic, with no compiler or linter
warning either way. The go-review heuristic is therefore still "check
`yield`'s result," with the terminal-call exception named explicitly as a
reviewed, deliberate choice rather than a default to reach for.

### 11. iter.Pull/Pull2: the stop discipline

[pkg.go.dev/iter](https://pkg.go.dev/iter#Pull): "If clients do not consume
the sequence to completion, they must call stop, which allows the iterator
function to finish and return... the conventional way to ensure this is to
use `defer`." Fixture `pullstop/{violation,compliant}` measures the leak
directly with `runtime.NumGoroutine`:

- Violation (`next, _ := iter.Pull(infinite())`, `stop` discarded): after
  one `next()` call and a 50 ms settle, goroutine count is permanently
  higher than baseline (`before=1 after=2 leaked=true`).
- Compliant (`defer stop()` inside a helper that returns before the
  measurement): goroutine count returns to baseline
  (`before=1 after=1 leaked=false`).

No `go vet`, `staticcheck -checks all`, or `golangci-lint run` (default:all)
finding names this in either fixture. **Real-world usage is rare but
disciplined**: 6 `iter.Pull`/`Pull2` call sites total across the 35-repo
corpus, in 4 repos —
`dominikh/go-tools@6cb65e58a558:pattern/parser.go:370` (`defer stop()`
immediately), `restic/restic@5127c4abf921:internal/data/tree.go:164,335`
(both store `stop` on a struct and call it from an explicit `Close`/cleanup
method, lines 201 and 360), `restic/restic@5127c4abf921:cmd/restic/cmd_copy.go:218`
(`defer stop()`), and `hashicorp/terraform@db4eef44f5bb:internal/command/format/diagnostic.go:436-437,499-500`
(two `iter.Pull` calls, both `stop`s called unconditionally before the
function's single return path, not deferred, but unconditionally reached).
**0 of 6 leak**; the API's rarity (6 sites / 35 repos, versus 656 `iter.Seq`
occurrences) rather than a corpus-wide problem is the headline —
`iter.Pull` is reached for deliberately and, when it is, correctly.

### 12. Iterator naming conventions

[pkg.go.dev/iter §Naming Conventions](https://pkg.go.dev/iter#hdr-Naming_Conventions)
states the convention directly, with worked examples:

- `All` — the iterator method on a collection type that walks every element,
  when there's exactly one natural full sequence: `func (s *Set[V]) All() iter.Seq[V]`.
- `Backward` — the reverse-order counterpart, e.g. `func (l *List[V])
  Backward() iter.Seq[V]` (see also `slices.Backward`, Go 1.23).
- `Keys`/`Values` — a map- or set-like type's key/value projections (see
  `maps.Keys`, `maps.Values`, both Go 1.23).
- A domain-specific name (`Cities`, `Languages`, `Preorder`) when the type
  has more than one natural sequence and no single one is "the" default.
- Additional configuration goes on the **constructor**, not a family of
  iterator variants: `func (m *Map[K, V]) Scan(min, max K) iter.Seq2[K, V]`.

The 1.23 release notes name the stdlib packages that already follow this:
`slices.All`, `slices.Values`, `slices.Backward`, `maps.All`, `maps.Keys`,
`maps.Values` ([go.dev/doc/go1.23#library](https://go.dev/doc/go1.23)).
This is a reading heuristic, not a mechanical check — no linter validates
method names against the stdlib convention — but it is cheap to review and
the stdlib's own naming is the reference to hold code to.

### 13. Should the SDK export iter.Seq or []T?

go-language.md's own open-questions section left this unresolved
("`api/sdk-surface`: should the SDK export `iter.Seq`... This is M-A-05's
'when' half, which neither dive answered"), while the topic map's harvest
already recorded an owner default ("SDK exports `[]T`, not `iter.Seq`; keep
it"). This dive supplies the rationale that default was missing.

The deciding question, per [Ian Taylor's guidance](https://go.dev/blog/when-generics)
and the `iter` doc's own framing (push-style sequences exist "sometimes a
range loop is not the most natural way to consume values… report values
from a data stream that cannot be rewound"), is whether the producer is
already holding the full collection in memory before it returns anything.
The SDK's own candidates — installed packages, tags on an envelope — are
decoded from one HTTP response body or one JSON document before the call
returns at all; there is no streaming, no unbounded source, and no
single-use constraint. Returning `iter.Seq[T]` here would add the `range`
compatibility surface (works with `for range`, `slices.Collect`, etc.) at
the cost of every caller needing `slices.Collect` to get a `[]T` back for
anything that isn't a simple `for` loop — a real ergonomic cost for zero
laziness benefit. `iter.Seq` earns its place when the source is genuinely
unbounded (a paginated API the SDK streams through, a log tail, a
filesystem walk) — none of which describe the SDK's current surface.

## Normative guidance candidates

Continuing go-language.md's `GO-LANG` sequence from GO-LANG-17. IDs
GO-LANG-01..17 are unchanged; three (marked "amends") add evidence to an
existing row without changing its text's meaning.

| ID | Rule | Rationale | Verification | Watched | Sev |
|---|---|---|---|---|---|
| GO-LANG-18 | Every `iter.Pull`/`iter.Pull2` call captures `stop` and either `defer`s it immediately, or stores it on a value with a documented `Close`/cleanup method that every code path reaches. Never discard `stop` with `_`. | A discarded or unreached `stop` leaks the iterator's driving goroutine permanently — measured directly, not asymptotically. | No analyzer exists. Reading heuristic: `grep -rn --include='*.go' -e 'iter\.Pull(' -e 'iter\.Pull2(' .`, then read each hit for `defer stop` on the next line or a traced `Close`/cleanup call. | yes — fixture `pullstop/{violation,compliant}`, `runtime.NumGoroutine` before/after (leaked=true / leaked=false); go vet, staticcheck -checks all, golangci-lint default:all all silent on both | MUST |
| GO-LANG-19 | Default every constraint's basic-kind type elements (`string`, numeric kinds, slice/map/chan literals) to an approximation element (`~string`, `~int`) unless the constraint deliberately excludes named/defined types with that underlying type. | Omitting `~` rejects every `type X string`-style named type as a type argument; the mistake surfaces at some caller's site, not the constraint author's. | No proactive analyzer (nothing to flag until a caller fails). Reading heuristic at constraint-authoring time; the compiler's own message names the fix once triggered (`possibly missing ~ for <type> in <Constraint>`). | yes — fixture `approxelem/{missing-tilde,with-tilde}` (exit 1 with the exact message / exit 0) | SHOULD |
| GO-LANG-20 | Route any hand-written comparator over a type that may be a float through `cmp.Compare`/`cmp.Less`, or use `cmp.Ordered` directly; never a raw `<`/`>`-based comparator passed to `slices.SortFunc`/`slices.CompareFunc`/`slices.MinFunc`/`slices.MaxFunc` for a float-capable element type. | `<`/`>` is not a strict weak ordering once NaN is possible (NaN compares false to everything); `slices.SortFunc` explicitly requires a strict weak ordering, and violating it measurably produces unsorted output, not merely "undefined tie-breaking." | Reading heuristic (no linter checks comparator NaN-soundness): `grep -rn --include='*.go' -e 'SortFunc\|CompareFunc\|MinFunc\|MaxFunc' .`, then read each comparator for a bare `<`/`>` on a float-typed parameter. | yes — fixture `constraints/naive-vs-cmp`: `slices.Sort` (cmp.Ordered) → `[NaN NaN 1 2 3]`; `slices.SortFunc` (naive `<`) → `[3 NaN 1 NaN 2]` (not sorted); `naiveMax(1.0,NaN)`≠`naiveMax(NaN,1.0)` | MUST (float-capable), SHOULD elsewhere |
| GO-LANG-21 | When a `comparable`-constrained type parameter may be instantiated with `any` or another interface type, document that a dynamic value which is itself uncomparable (slice, map, func) panics on `==` or map-key use, and add a test that exercises exactly that path if the type is reachable from external input. | The Go 1.20 relaxation lets `any` satisfy `comparable` statically; the spec states the runtime hazard directly ([§Satisfying a type constraint](https://go.dev/ref/spec#Satisfying_a_type_constraint)). | No analyzer. Reading heuristic: any `[K comparable]` type parameter instantiated with, or exposed for instantiation with, `any`/an interface type. | yes — fixture `constraints/comparablepanic`: `go run` → `runtime error: hash of unhashable type []int` (exit 1); go vet / staticcheck -checks all / golangci-lint default:all all silent | SHOULD |
| GO-LANG-22 | Never import `golang.org/x/exp/constraints` (or its `slices`/`maps` siblings, already covered by GO-MOD-08's `x/exp` denial); use stdlib `cmp.Ordered`, `slices`, and `maps` instead. Add `golang.org/x/exp/constraints` to the fleet's `depguard` deny list explicitly, not by relying on the broader `golang.org/x/exp` pattern alone if that pattern is ever narrowed. | Superseded since Go 1.21; absent from the 35-repo corpus's own generic code (0 hits); the Go team's own 2022 tutorial still shows it as canonical, which is exactly the kind of stale-source an agent trained on it would reproduce. | `depguard` with a `deny: golang.org/x/exp` (or `.../constraints`) rule. | yes — fixture `constraints/xexp-depguard` (import present: `golangci-lint run` exit 1, names the import; `xexp-depguard-compliant` (cmp.Ordered): exit 0) | SHOULD |
| GO-LANG-23 | Below `go 1.27`, and inside any interface at any version, do not attempt to give a method its own type parameter; write a package-level generic function that takes the receiver as an explicit first parameter instead. At `go ≥ 1.27` on a concrete (non-interface) receiver type, a generic method is permitted and preferred over the function-taking-receiver workaround for new code. | Below 1.27 the compiler rejects it outright (`generic method requires go1.27 or later`); interface methods reject it unconditionally, at every version (`interface method must have no type parameters`), because interface methods can never be implemented by generic methods. | `go build`, whose error text is exact and version-specific. | yes — fixtures `methodtypeparam/{go126,go127,interface-always-fails,workaround}`: go1.26 exit 1 (exact message), go1.27 exit 0; interface case exit 1 at go1.27 too; workaround exit 0 at go1.26 | MUST (below floor / interfaces), SHOULD (style, at/above floor) |
| GO-LANG-24 | Constrain a generic interface's own type parameter with `any` by default; push a stronger constraint (`comparable`, `cmp.Ordered`, a method-based self-referential constraint) onto a concrete implementation, not the interface, unless every conceivable implementation genuinely requires it. | An over-constrained interface forecloses implementations that don't need the extra power — the interface's job is to leave the implementation choice to the user. Directly stated in [go.dev/blog/generic-interfaces](https://go.dev/blog/generic-interfaces). | Reading heuristic: for each generic interface declaration, check whether its own type parameter's constraint is stronger than `any`, and whether that strength is used by every named implementation in the same module. | no (design-judgment heuristic; no fixture — this is a code-shape choice with no runtime-observable divergence) | SHOULD |
| GO-LANG-25 | Name an iterator-returning method/function per the `iter` package's convention: `All` for the single natural full sequence, `Backward` for the reverse order, `Keys`/`Values` for a map/set-like type's projections, a domain name (`Cities`, `Preorder`) when there are several natural sequences and none is default, and put extra configuration on the constructor (`Scan(min, max)`), not on iterator-name variants. | Matches stdlib convention (`slices.All/Values/Backward`, `maps.All/Keys/Values`, all Go 1.23) that reviewers and tools (godoc rendering, `go doc`) already expect. | Reading heuristic; `go doc` output review against [pkg.go.dev/iter §Naming Conventions](https://pkg.go.dev/iter#hdr-Naming_Conventions). No linter checks method-name semantics. | no (reading heuristic only) | SHOULD |
| GO-LANG-26 | A library or SDK exports `[]T` for a collection that is already fully materialized before the call returns (decoded from one response body, one JSON document, one completed scan); it exports `iter.Seq[T]`/`iter.Seq2[K,V]` only for a genuinely unbounded, lazy, or single-use sequence where materializing the whole thing first would defeat the purpose. The SDK's envelope-derived collections (installed packages, tags) are the first case: they export `[]T`. | `iter.Seq` adds `range`-loop ergonomics at the cost of a `slices.Collect` tax on every caller that isn't a simple `for` loop; that cost buys nothing when there is no laziness to preserve. | Reading heuristic: does the producer hold the entire collection in memory before returning the iterator? If yes, prefer `[]T`. | no (design-judgment heuristic; the choice has no divergent runtime behavior to fixture — both compile and both work) | MUST (SDK, owner default); SHOULD (general) |
| — (amends GO-LANG-03) | Generic type aliases are supported, **including across package boundaries**, on any module at `go ≥ 1.23` when built with the Go 1.27.1 toolchain; the 1.23-era "not supported across package boundaries" caveat describes that release's own preview window, not a restriction that persists under a newer toolchain. | Directly re-measured; contradicts a plausible mis-reading of the 1.23 notes as still-current. | `go build ./...` on a cross-package generic-alias fixture. | yes — fixtures `typealias/{go124,go123,go122}`: go1.24 exit 0, go1.23 exit 0 (cross-package), go1.22 exit 1 (`generic type alias requires go1.23 or later`) | — |
| — (amends GO-LANG-08) | The MUST to check `yield`'s return value does not bind a `yield` call that is provably the terminal action of its closure invocation on every path (nothing follows it, no further `yield` call reachable afterward in that invocation) — this exact shape is real, common, and correct in `prometheus/promql/parser` and `bazelbuild/bazel-gazelle`. It remains fragile: a later edit that adds code after it, or wraps it in a loop, silently reintroduces the panic with no warning either way. | Narrows an otherwise-overbroad MUST to match measured, correct exemplar practice, without weakening the actual runtime hazard. | `go test` with an early `break` over both shapes. | yes — fixtures `yieldlast/{safe-lastcall,unsafe-loop}` (safe: exit 0 both; unsafe: exit 1 panic) | — |
| — (amends GO-LANG-14) | Counting call sites via explicit `Name[T](...)` syntax under-counts to near-zero for any function whose type argument is inferable (almost all of them); use `\bName\(` scoped to the declaring package for the real count, and note the zero-argument-constructor exception (`New[T]()` requires explicit brackets, so the bracket grep is correct only for that shape). State which method was used whenever a single-instantiation count is cited. | The original bracket-only heuristic would flag genuinely multi-use exported constructors (`grpc-go`'s `NewRefCounted`: 15 real callers) as single-instantiation. | Both grep forms, cross-checked against manual reads. | yes — re-measured on 6 repos, 19 generic functions ([Findings §1](#1-type-parameters-when-they-earn-their-place)) | — |

## Verification runs

All commands run through `/home/mherwig/.cache/research-lang/go-tools/run.sh`
(Go 1.27.1, `GOTOOLCHAIN=local`, golangci-lint 2.14.0, staticcheck 2026.2.1)
on 2026-09-26, under
`/home/mherwig/.cache/research-lang/go-tools/fixtures/generics-and-iterators/`.
"golangci default:all" means `golangci-lint run --config all.yml ./...` with
`all.yml` containing `linters: { default: all }` (every linter enabled, no
exclusions) — the broadest static-analysis surface the installed toolchain
offers.

| # | Fixture | Command | Violation | Twin | Relevant output |
|---|---|---|---|---|---|
| G1 | `yieldignore/{violation,compliant}` | `go run ./cmd`; `go vet ./...`; `staticcheck -checks all ./...`; golangci default:all | run exit 1; vet/staticcheck/golangci-lint all silent on the bug (golangci-lint's own exit is 1, but only for `intrange`/`package-comments`, both unrelated) | run exit 0 | `panic: runtime error: range function continued iteration after function for loop body returned false` |
| G2 | `yieldlast/{safe-lastcall,unsafe-loop}` | `go run .` | unsafe-loop: exit 1 (panic) | safe-lastcall: exit 0 | same panic text as G1, only in the loop variant |
| G3 | `pullstop/{violation,compliant}` | `go run .` | exit 1 (`leaked=true`, then a deliberate `panic("leaked goroutine...")`) | exit 0 (`leaked=false`) | `before=1 after=2 leaked=true` / `before=1 after=1 leaked=false` |
| G4 | `constraints/comparablepanic` | `go run .`; `go vet ./...`; `staticcheck -checks all ./...`; golangci default:all | run exit 1; vet/staticcheck exit 0 (no relevant finding); golangci-lint exit 1 but only for `forbidigo`/`package-comments`, unrelated | — (no separate twin; the panic is the point) | `panic: runtime error: hash of unhashable type []int` |
| G5 | `constraints/naive-vs-cmp` | `go run .` | — (comparative demo, not pass/fail) | — | `naiveMax(1.0,NaN)=1`, `naiveMax(NaN,1.0)=NaN`; `slices.Sort→[NaN NaN 1 2 3]`; `slices.SortFunc(naive)→[3 NaN 1 NaN 2]` |
| G6 | `constraints/xexp-depguard` / `xexp-depguard-compliant` | `golangci-lint run --config depguard.yml ./...` | exit 1 | exit 0 (`0 issues.`) | `import 'golang.org/x/exp/constraints' is not allowed from list 'main': superseded by stdlib slices/maps/cmp since Go 1.21…` |
| G7 | `methodtypeparam/go126` / `go127` | `go build ./...` | go1.26: exit 1 | go1.27: exit 0 | `./main.go:8:21: generic method requires go1.27 or later (-lang was set to go1.26; check go.mod)` |
| G8 | `methodtypeparam/interface-always-fails` | `go build ./...` | exit 1 (at go1.27, the highest floor) | — (no floor fixes this) | `interface method must have no type parameters`, `undefined: U` |
| G9 | `methodtypeparam/workaround` | `go run .` (go1.26 module) | — (demonstrates the fix, not a violation) | exit 0 | `42` |
| G10 | `typealias/go122` / `go123` / `go124` | `go build ./...` | go1.22: exit 1 | go1.23 (cross-package): exit 0; go1.24: exit 0 | `pkga/alias.go:3:18: generic type alias requires go1.23 or later (-lang was set to go1.22; check go.mod)` |
| G11 | `approxelem/{missing-tilde,with-tilde}` | `go build ./...` | exit 1 | exit 0 | `MyID does not satisfy StringLike (possibly missing ~ for string in StringLike)` |

**What "empty output" means for each reading heuristic used above:** for the
`iter.Pull` and `depguard` greps, no output means no call site / no
forbidden import to review — a real pass. For the `SortFunc`/`CompareFunc`
grep (GO-LANG-20) and the "single instantiation" call-site count, empty
output or a low count is a *candidate*, not a finding on its own — every
hit still needs a human/agent read, stated explicitly in each row above.

## Exemplar evidence

**Satisfies GO-LANG-18 (iter.Pull stop discipline), all 6 known sites:**
- `dominikh/go-tools@6cb65e58a558:pattern/parser.go:370-371` — `defer stop()` on the next line.
- `restic/restic@5127c4abf921:internal/data/tree.go:164,201` — `stop` stored on `TreeFinder`, called from its own cleanup at line 201.
- `restic/restic@5127c4abf921:internal/data/tree.go:335,360` — `stop` stored on `peekableNodeIterator`, called from `Close()` at line 360.
- `restic/restic@5127c4abf921:cmd/restic/cmd_copy.go:218-219` — `defer stop()`.
- `hashicorp/terraform@db4eef44f5bb:internal/command/format/diagnostic.go:436-437,499-500` — two `iter.Pull` calls, both `stop`s called unconditionally before the function's single return.

**Best exemplar iterators (naming and correctness both hold up):**
- `golang/tools@d2d3de9f066e` — 52 files use `iter.Seq`/`Seq2` (largest single-repo count in the corpus); its own `gopls/internal/cache/constraints.go:98` shows the safe-terminal-`yield` idiom cited in Finding 10.
- `tailscale/tailscale@6b3a45f14ef6` — 38 files, 371 type-parameter declarations, the largest generics user in the corpus.
- `prometheus/prometheus@270db2915054:promql/parser/ast.go` (`ChildrenIter`) and `bazelbuild/bazel-gazelle@63c9a3d2078f:pathtools/path.go` — the cleanest examples of the terminal-`yield` pattern.

**Contradicts (or complicates) GO-LANG-08's blanket reading, without violating the panic-avoidance intent:**
- `prometheus/prometheus@270db2915054:promql/parser/ast.go:407,421,427,435,437,439,441` — 7 unguarded `yield` calls in one function, every one the last statement of its `case`, none inside a loop that continues past it. Not a bug (verified, Finding 10); a mechanical "any unguarded yield is wrong" reading would misflag it.

**Confirms GO-LANG-22 (x/exp/constraints denial) by absence:** 0 of 35
repos import `golang.org/x/exp/constraints` (re-measured 2026-09-26,
`grep -rIn --include='*.go' -e 'x/exp/constraints' .` empty across the
corpus), consistent with [shift](../go-topic-map/shifts.md)'s broader `x/exp`
decline finding.

**Single-instantiation candidates for GO-LANG-14's amendment (both grep methods agree):**
- `bazel-contrib/rules_go@970e99d77c8b:go/tools/gopackagesdriver/utils.go:100,112,122` (`contains`, `containsAll`, `equalSets`) — internal helpers, 1 call site each.
- `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/options.go:370` (`Reuse[I *Puller | *Pusher]`) — 1 call site, and itself a union-constraint (not `~`-approximated) example worth reading for Finding 3's contrast.

## AI-agent angle

1. **Writes a `for`-loop iterator that ignores `yield`'s return value.**
   Compiles clean, passes `go vet`/staticcheck/golangci-lint with every
   linter on, and panics only when some future caller breaks early —
   exactly the shape a quick manual test would miss. Check: an early-`break`
   test (GO-LANG-08); do not accept "it compiled and I ran it once without
   breaking" as verification for an iterator.
2. **Adds a type parameter to a function used with one concrete type
   "because it might be reused later."** The corpus's confirmed
   single-instantiation cases (Finding 1) are all internal helpers nobody
   reused; Ian Taylor's guidance is explicit that this is backwards ("write
   Go programs by writing code, not by defining types"). Check: count real
   call sites with `\bName\(`, not `Name[`, scoped to the package
   (GO-LANG-14 amendment); if there is exactly one and it's not an exported
   API, write concrete code.
3. **Reaches for `golang.org/x/exp/constraints.Ordered`** because a
   plausible-looking, still-live Go blog post ([intro-generics,
   2022](https://go.dev/blog/intro-generics)) uses it as the canonical
   example, predating `cmp.Ordered` (2021→1.21, blog post March 2022, so the
   post is *older* than the stdlib replacement by only months but was never
   updated). Check: `depguard` deny on `golang.org/x/exp` (GO-LANG-22); the
   fix is always `cmp.Ordered`, never a version-pinned `x/exp` import.
4. **Forgets `~` on a constraint's basic-kind element**, then "fixes" the
   resulting compile error at the *caller* by converting the argument to
   the exact listed type instead of adding `~` to the constraint — patching
   the symptom at every call site instead of the constraint once. Check:
   read the compiler's own suggestion (`possibly missing ~ for <T> in
   <Constraint>`) and fix the constraint (GO-LANG-19).
5. **Writes a hand-rolled numeric constraint with `<`/`>` for a "Max"/"Min"/
   "Sort" helper that will see floats,** reproducing the pre-`cmp` idiom
   (`type Number interface{ ~int | ... | ~float64 }` plus a hand-rolled
   `if a < b`). Compiles, runs, looks correct on integer inputs used while
   testing, and silently returns a different answer or a wrong sort order
   the first time a NaN reaches it. Check: `cmp.Ordered`/`cmp.Compare`
   instead, or route any custom comparator through `cmp.Compare`
   (GO-LANG-20); a reading heuristic on every `SortFunc`/`CompareFunc`
   comparator for a bare `<`/`>` on a float-typed operand.
6. **Assumes `comparable` is a complete runtime safety net** because it is a
   compile-time constraint, and stores `any`-typed keys in a generic map
   without considering that a caller might pass an uncomparable dynamic
   value. Check: GO-LANG-21's reading heuristic on any `comparable`
   parameter reachable with `any`/interface type arguments; a fuzz or
   property test that feeds slice/map/func values through the path if it's
   externally reachable.
7. **Tries to add a type parameter directly to a method** on a concrete
   type below the Go 1.27 floor, or on an interface at any floor, because
   training data from post-1.27 code makes it look ordinary. Check: read
   the compiler's exact, version-specific error (GO-LANG-23) before
   "fixing" it by bumping the module's `go` line — bumping the floor only
   works for the concrete-type case, never the interface case.
8. **Writes an `iter.Pull` caller without `defer stop()`,** especially when
   `next` is called from inside another closure or returned early, because
   nothing in the code *looks* wrong and there's no compiler feedback at
   all. Check: GO-LANG-18's grep-and-read; a `goleak`-style goroutine-count
   assertion in the test for anything that pulls from an iterator instead
   of ranging over it.
9. **Exports `iter.Seq[T]` from a new SDK method "because iterators are the
   modern idiom,"** for a value that is already a fully materialized slice
   before the method returns, forcing every caller who wants a `[]T` back
   to add `slices.Collect`. Check: GO-LANG-26's one-question heuristic — is
   the whole collection already in memory before this function returns? If
   yes, return `[]T`.
10. **Explains generic-operand rules using "core type"** as if it were
    still spec vocabulary, because it dominates pre-2025 blog posts,
    Stack Overflow answers, and course material. Check: for anything
    written or reviewed against Go ≥ 1.25, read the current spec text
    directly (Finding 9) — "core type" is gone, replaced by explicit
    per-operation prose with the same behavior.

## Contested / evolving

- **Whether the terminal-`yield` exception (Finding 10 / GO-LANG-08
  amendment) should be a named, reviewable pattern or discouraged outright**
  is unsettled in practice: the corpus shows it used confidently by
  `prometheus` and `bazel-gazelle`, but nothing in the `iter` doc or the
  range-functions blog names it as sanctioned — it is a consequence of the
  panic mechanism, not a documented idiom. Trending toward "allowed, but
  named explicitly in review" rather than "forbidden" or "silently fine,"
  because both extremes are wrong given the measured fragility.
- **Self-referential constraints (Go 1.26) and generic methods (Go 1.27)**
  are both too new for the corpus to show adoption (0 hits for either
  pattern as of the 2026-09-26 clones) — this section describes what the
  release notes and spec promise, not yet what production Go looks like.
  Re-check at the next corpus refresh.
- **Whether `iter.Seq` will grow beyond its current 656-occurrence,
  18-repo footprint** as more stdlib and popular-library APIs adopt
  range-over-func is an open trend, not a settled one; the SDK's own
  `[]T`-over-`iter.Seq` default (Finding 13, GO-LANG-26) is scoped to the
  SDK's *current* surface (fully materialized collections) and should be
  revisited if a future SDK method genuinely streams.
- **Whether golangci-lint or staticcheck will ever gain a `yield`-return
  check.** Both are silent today (G1, G4) across every enabled linter in
  the installed versions (golangci-lint 2.14.0, staticcheck 2026.2.1); this
  is a real gap in the toolchain, not a design choice, and is worth
  re-checking on every golangci-lint/staticcheck version bump (a go-upgrade
  step, per GO-LANG-15's existing procedure).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [go.dev/ref/spec](https://go.dev/ref/spec) | The language specification | Living document, Go 1.27 tags present | Normative text for type parameter declarations, type constraints, `comparable`'s 1.20 relaxation and its runtime-panic caveat, and the Go 1.27 method-declaration grammar change — read directly, not paraphrased |
| [go.dev/blog/coretypes](https://go.dev/blog/coretypes) | Go blog, Robert Griesemer | 26 March 2025 | The exact reason and mechanism for the Go 1.25 removal of core types from the spec; explains why pre-2025 explanations of generic-operand rules are structurally outdated even though behavior didn't change |
| [go.dev/blog/when-generics](https://go.dev/blog/when-generics) | Go blog, Ian Lance Taylor | 12 April 2022 | The canonical "when to add a type parameter" guidance ("write code, not types"; prefer functions to methods; don't replace interfaces with type parameters) — still current, cited throughout Finding 1 and the AI-agent angle |
| [go.dev/blog/intro-generics](https://go.dev/blog/intro-generics) | Go blog, Griesemer & Taylor | 22 March 2022 | The original generics overview — and, dangerously, still shows `constraints.Ordered` from the now-superseded `golang.org/x/exp/constraints` as its canonical example (Finding 5, AI-agent angle #3) |
| [go.dev/blog/generic-interfaces](https://go.dev/blog/generic-interfaces) | Go blog, Axel Wagner | 7 July 2025 | The only primary source on generic interfaces, self-referential constraints, the pointer-receiver trap, and the "constrain implementations, not interfaces" rule (Finding 7) |
| [go.dev/blog/range-functions](https://go.dev/blog/range-functions) | Go blog | 2024 (Go 1.23 companion) | The `yield`-contract explanation this dive's Finding 10 sharpens |
| [go.dev/doc/tutorial/generics](https://go.dev/doc/tutorial/generics) | Official tutorial | Living, Go 1.18+ | Baseline walkthrough of declaring a constraint and a generic function; used to cross-check the constraint syntax examples in Findings 2-3 |
| [pkg.go.dev/iter](https://pkg.go.dev/iter) | Package doc (`iter`) | Go 1.23+, current at 1.27.1 | Primary source for `Seq`/`Seq2`/`Pull`/`Pull2` semantics, the naming-conventions section (Finding 12), and the single-use-iterator and mutation-via-position patterns |
| [pkg.go.dev/cmp](https://pkg.go.dev/cmp) | Package doc (`cmp`) | Go 1.21+, current at 1.27.1 | `Ordered`'s exact definition and `Compare`/`Less`'s documented NaN total order, load-bearing for Finding 4 |
| [pkg.go.dev/slices](https://pkg.go.dev/slices) | Package doc (`slices`) | Go 1.21+, current at 1.27.1 | `Sort`'s `S ~[]E` signature and its NaN-ordering doc line; `SortFunc`'s strict-weak-ordering requirement, both load-bearing for Finding 4 |
| [go.dev/doc/go1.23](https://go.dev/doc/go1.23) | Release notes | August 2024 | Range-over-func's exact accepted function shapes, the generic-type-alias preview caveat this dive corrects (Finding 8), and the `slices`/`maps` iterator additions (Finding 12) |
| [go.dev/doc/go1.24](https://go.dev/doc/go1.24) | Release notes | February 2025 | "Now fully supports generic type aliases" — the exact wording this dive verifies against the toolchain (Finding 8) |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Release notes | February 2026 | Self-referential generic constraints, with the `Adder[A Adder[A]]` example quoted in Finding 7 |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Release notes | August 2026 | Generic methods, and the explicit statement that interface methods may never declare type parameters — the primary source for Finding 6 and GO-LANG-23 |
| go-language.md (this program's own consolidation) | Internal | 2026-09-26 | GO-LANG-01..17, the rules this dive holds stable, amends (03, 08, 14), and continues (18-26) |

**Toolchain used for every fixture:** Go 1.27.1, golangci-lint 2.14.0,
staticcheck 2026.2.1, via
`/home/mherwig/.cache/research-lang/go-tools/run.sh` (`GOTOOLCHAIN=local`).
Fixtures live under
`/home/mherwig/.cache/research-lang/go-tools/fixtures/generics-and-iterators/`.
Exemplar corpus: `/home/mherwig/.cache/research-lang/exemplars/go/`, all 35
repos, greps scoped to exclude `/vendor/` and `/testdata/`.

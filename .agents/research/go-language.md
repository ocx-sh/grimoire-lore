---
title: "Go language era idioms and stdlib semantics (consolidation)"
topic: "What go fix owns and what it declines, the effective language version, json/v2 on 1.27, SA1019, rand, time equality, iterators, map order, omitzero, generics and iterator design, the go-upgrade procedure"
model: opus
id_family: GO-LANG
consolidates:
  - go-language/era-and-modernizers.md
  - go-language/stdlib-semantics.md
  - go-language/generics-and-iterators.md
  - go-audit/exemplar-code-shape.md (sections 3, 5, 7)
  - go-audit/exemplar-quality-gates.md (sections 1, 5)
  - go-audit/exemplar-runtime-posture.md (sections 6, 8)
  - go-audit/config-inventory.md (section 3)
  - go-topic-map.md (section A rows M-A-01..20, row M-P-02; conflicts 12, 14, 15; frame corrections (d))
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/go-language/
date: 2026-09-26
revised: 2026-09-26
---

# Go language: era idioms and stdlib semantics

All version claims hold for Go 1.27.1, golangci-lint 2.14.0, staticcheck
2026.2.1 and gopls v0.23.0 as installed on 2026-09-26. "Watched" means the
check was run red on a planted violation and green on a compliant twin. Dive
runs are cited as **[EM]** (era-and-modernizers, its Verification runs table),
**[SS n]** (stdlib-semantics, Verification runs row n) and **[GI Gn]**
(generics-and-iterators, Verification runs row Gn). This consolidation's own
runs are **L1–L14** in [Consolidation verification runs](#consolidation-verification-runs).
Audit and scout keys: [shape](go-audit/exemplar-code-shape.md),
[gates](go-audit/exemplar-quality-gates.md), [cfg](go-audit/config-inventory.md),
[canon](go-topic-map/canonical.md).

## Verdict

1. **`go fix` owns every mechanical era rewrite; the rule set owns only what `go fix` declines or cannot see.** The 26 fixers (`any`, `rangeint`, `minmax`, `mapsloop`, `slicessort`, `stringscut`, `waitgroupgo`, `errorsastype`, `newexpr` and the rest) are gated by GO-GATE-03 and get no style prose here. What the rules add: never hand-apply a rewrite a fixer declined (GO-LANG-01), and never read a clean diff without the effective language version (GO-LANG-02). Binds all code kinds.
2. **The effective language version is per file, not per module.** A `//go:build go1.21` line in a `go 1.22` module keeps the old loop semantics, and `forvar` leaves that file's `v := v` copy alone while rewriting its sibling (L8). Stdlib API floors are *not* compile-enforced: only `go vet`'s `stdversion` catches them (frame correction (d), L4). Language-feature floors *are* compile-enforced (`generic method requires go1.27`, `generic type alias requires go1.23`; [GI G7], [GI G10]).
3. **Go 1.27's json/v2 backing changes zero bytes of v1 `encoding/json` output** ([SS 1], [SS 2]). No shim, no build-tag split, no `GOEXPERIMENT=nojsonv2` pin, one golden per test. The only error-message text may differ, which GO-ERR-14 already forbids matching. Importing `encoding/json/v2` directly is MUST-forbidden below `go 1.27`. That binds the SDK and libraries at the Q1 floor `go 1.26.0`, and `go vet` catches it (L4).
4. **`rand.Seed` is a no-op only where the main module says `go 1.24` or later.** At `go 1.23` it still seeds (`randseednop=0`, L3). Raising a CLI's `go` line therefore silently changes any "reproducible" sequence. New code uses `math/rand/v2` local generators. This resolves the dive disagreement over 1.20 versus 1.24.
5. **Four stdlib semantics get a mechanical check the dives said did not exist.**
   - `time.Time ==` is caught by revive `time-equal`, with 0 false positives on 435k LOC (L2). This amends GO-GATE-15.
   - A broken iterator stop contract is caught **statically** by gopls v0.23.0's `yield` analyzer (L10), with 0 hits on 90 iterator files in 6 exemplars, including the correct terminal-`yield` shape (L11). It also panics at runtime under a one-line early-break test (L1). `go vet`, `golangci-lint` (govet `enable-all`) and `staticcheck -checks all` are silent ([GI G1], L10), so the gate invokes gopls separately.
   - The json/v2 import floor is caught by `stdversion` (L4).
   - Map-order leaks are caught by `-count=5` only when every map on the output path holds 8 or more entries: a 2-key map repeats its order across 5 runs 51% of the time (L6).
6. **Map order, `omitzero`, and a `time.Time` map key are wire-contract hazards for the SDK envelope and every CLI `--json`/golden output.** They are MUST where output is a contract. `json.Marshal` and `fmt` already sort map keys, so a sort is required only on a hand-written `range` (L5).
7. **SA1019 is never disabled globally.** Deprecations without a `//go:fix inline` shim (`ReverseProxy.Director`, `reflect.SliceHeader`) are SA1019-only. Five prominent exemplars blind themselves with `-SA1019` (L7).
8. **Moving a Go release is the go-upgrade skill's ordered procedure.** The order is: notes, GODEBUG diff, bump, `go fix`, vet, golangci pin, GOEXPERIMENT audit, gate. `go fix` runs after the bump, because fixers decline below their floor ([EM] misc-fixers). Dependabot never opens a toolchain-only PR (dependabot-core#13520), so the bump is a scheduled action.
9. **Iterators: the SDK exports `[]T`; every `iter.Pull` caller releases `stop`.** Every collection the SDK surface returns (installed packages, tags) is fully decoded before the call returns, so `iter.Seq` buys no laziness and costs every caller a `slices.Collect` (GO-LANG-26). This settles M-A-05's "when" half. A discarded `iter.Pull` `stop` leaks a goroutine permanently. goleak and `synctest.Test` each catch it (L12), but GO-CONC-11's trigger (a `go` statement or `.Go(` call) does not fire on an `iter.Pull`-only package, so GO-LANG-18 extends that trigger.
10. **Generics: most design rules stay reading heuristics, and that is a documented gap.** Compile-gated facts are mechanical:
    - Generic methods need `go 1.27`.
    - Interface methods can never take type parameters, at any version.
    - A generic method never satisfies an interface method (L14).
    - Generic type aliases compile at `go ≥ 1.23` on the 1.27 toolchain, including across packages.
    - `x/exp/constraints` is deniable by depguard (L13).

    No analyzer in golangci-lint 2.14.0, staticcheck 2026.2.1 or gopls v0.23.0 catches the other four hazards, although each was watched failing at runtime or at compile time:
    - a `comparable` type parameter instantiated with `any` panics on an unhashable dynamic value ([GI G4]);
    - a `<`-based comparator produces unsorted output once NaN is present ([GI G5]);
    - a constraint missing `~` rejects named types, and the error appears at some other caller ([GI G11]);
    - a generic interface is over-constrained.

## The ruleset

### GO-LANG

Rows are grouped by the check that catches them. Floors are the Go version
the rule assumes; "—" means none.

#### Caught by `go fix -diff ./...`, `go build` and the effective language version

| ID | Rule | Rationale (failure prevented) | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-LANG-01 | Never hand-apply a modernization that a `go fix` fixer declines. That means: no `min`/`max` replacing an if/else over `float32`/`float64` operands; no `strings.SplitSeq`/`FieldsSeq` where the result is indexed or ranged twice; no `for i := range n` where the body mutates `i` or the bound; and no `omitempty`→`omitzero` swap except under GO-LANG-10. Everything else the 26 fixers cover goes through `go fix ./...` (GO-GATE-03), never by hand. | Each decline hides a real semantic change. `min` with NaN differs from if/else. A `SplitSeq` iterator is single-pass, so a second range sees nothing. A mutated index breaks `range n`. Agents asked to "modernize this file" apply all of them anyway ([EM] §1 self-limits column). | Reading heuristic, because no analyzer tells a hand rewrite from ordinary code. Diff the change against `go fix -diff ./...` on the same lines: if the fixer proposes nothing there and the hand edit matches one of the four shapes, that is the finding. The gate half is GO-GATE-03. | yes, as semantic divergence: [EM] `minmax-nan`, `stringsseq-alloc`, `rangeint-mutation` (violation exit 1, rewrites only the safe function; twin exit 0; `go test` green both) | MUST | fixer targets 1.21–1.24 |
| GO-LANG-02 | Before judging an idiom, or trusting an empty `go fix -diff`, read the effective language version. That is the module line (`go list -m -f '{{.GoVersion}}'`) and, per file, any `//go:build go1.N` term, which overrides it for that file. A `v := v` / `tc := tc` copy is dead only at an effective version ≥ 1.22. An empty diff below a fixer's floor means "floor-limited", not "modern". This extends GO-CORE-04. | `forvar`, `errorsastype` and `inline` decline silently below their floor. go-cmp (`go 1.21`) and testify (`go 1.17`) get "cannot inline … into a file using go1.N" ([EM] §2). A file-level `//go:build go1.21` keeps per-loop semantics inside a `go 1.22` module (L8). | `go fix -diff ./...`, where the file with the lower build-tag version keeps its copy and its sibling loses it. `go list -m -f '{{.GoVersion}}'` gives the module line. | yes: L8 (a.go rewritten, b.go with `//go:build go1.21` untouched, exit 1); [EM] `loopvar-1.21-to-1.22` (exit 0 at 1.21, exit 1 at 1.22); [EM] `misc-fixers` (`errorsastype` silent at 1.25, fires at 1.26) | MUST | go 1.21 (file versions), 1.22 (loopvar) |
| GO-LANG-03 | Never raise a library's or the SDK's `go` line to adopt a language feature. Generic methods and struct-literal field selectors (`embedlit`) (1.27) and self-referential constraints (1.26) are CONSIDER until the GO-MOD-01 floor reaches them. `new(expr)` (1.26) is adopted through the `newexpr` fixer, never hand-written. Generic type aliases are for migration shims only. That is a fleet scope choice, not a technical limit: on the 1.27 toolchain they compile at `go ≥ 1.23`, including across package boundaries, and the 1.23 notes' "not yet supported across package boundaries" caveat is obsolete. A CLI at `go 1.27.0` may use all of them. Interface methods never take type parameters at any version (GO-LANG-23). | The compiler enforces the declared line, not the installed toolchain. An agent that "just modernizes" a `go 1.26.0` SDK with a generic method forces a floor bump on every consumer ([EM] §8). | `go build ./...` under the declared line: `generic method requires go1.27 or later (-lang was set to go1.26; check go.mod)`; `generic type alias requires go1.23 or later (-lang was set to go1.22; check go.mod)` | yes: [EM] `generic-methods-and-newexpr` (go127 exit 0 / go126 exit 1; newexpr go125 exit 1 / go126 exit 0); [GI G7]; [GI G10] (go1.22 exit 1; go1.23 cross-package exit 0; go1.24 exit 0) | SHOULD | go 1.23–1.27 per feature |
| GO-LANG-23 | Below `go 1.27`, and inside an interface at any version, never give a method its own type parameter. Write a package-level generic function that takes the receiver as its first parameter (`func BoxMap[T, U any](b Box[T], f func(T) U) Box[U]`). At `go ≥ 1.27` a concrete type may declare a generic method. A generic method never satisfies an interface method, so a type that must implement an interface keeps a non-generic method of that name. | Below 1.27 the compiler rejects the method outright. Interface methods reject type parameters unconditionally ([go1.27](https://go.dev/doc/go1.27#language): "methods of interfaces may not declare type parameters nor can interface methods be implemented by generic methods"). Bumping the `go` line fixes only the concrete-type case, never the interface case. | `go build ./...`: `generic method requires go1.27 or later`; `interface method must have no type parameters`; `Box[int] does not implement IntMapper (wrong type for method Map)` | yes: [GI G7] (go1.26 exit 1 / go1.27 exit 0); [GI G8] (interface exit 1 at go1.27); [GI G9] (workaround exit 0 at go1.26); L14 (generic method against interface, build fails) | MUST (below floor, interfaces) | go 1.27 |

#### Caught by `go vet ./...` (`stdversion`)

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-LANG-04 | A module whose `go` line is below 1.27, which includes the SDK and every library at the Q1 floor, never imports `encoding/json/v2` or `encoding/json/jsontext`. Code at go ≥ 1.27 may import them, but it then owns v2's stricter defaults (duplicate names and invalid UTF-8 rejected) and writes a golden test for them. | The package is v2 API, new in 1.27. It compiles in a `go 1.26` module on a 1.27 toolchain (`go build` exit 0), so only the 1.26 CI leg or vet catches it. Its defaults are genuinely different from v1 ([SS] §1). | `go vet ./...` prints `json.Marshal requires go1.27 or later (module is go1.26)`. Do not use `grep` as the check: it matches string literals in golang/tools, golangci-lint and go-tools (L4 census). | yes: L4 (go1.26 vet exit 1, build exit 0; go1.27 vet exit 0) | MUST | go 1.27 |

#### Caught by golangci-lint (staticcheck SA1019, depguard)

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-LANG-05 | Never disable SA1019 for a whole repo: no `-SA1019` in `linters.settings.staticcheck.checks` or in `staticcheck.conf`. Suppress one site with `//nolint:staticcheck // SA1019: <reason>` or with an exclusion scoped to the deprecation message. Treat each SA1019 hit whose deprecated symbol carries no `//go:fix inline` shim as a manual rewrite that `go fix` will never do: `httputil.ReverseProxy.Director`→`Rewrite`, and `reflect.SliceHeader`/`StringHeader`→`unsafe.Slice`/`unsafe.String`. | An empty `go fix -diff` is not "nothing deprecated". Only shimmed APIs such as the `io/ioutil` wrappers and `reflect.Ptr`/`PtrTo` are inlined ([EM] §5). A global `-SA1019` hides `rand.Seed` and every future deprecation (L7). SA1019 is the second most frequent staticcheck finding in the corpus, 21/88 ([gates] §5). | `grep -rn -e '-SA1019' --include='*golangci*' --include='staticcheck.conf' .`, where any output is the finding. `golangci-lint run ./...` with the fleet config reports `SA1019`. | yes: L7 (fleet config reports SA1019; the `["all","-SA1019"]` twin drops it; grep exit 0 on the silenced config, exit 1 on the fleet one) | MUST | staticcheck 2026.2 |
| GO-LANG-06 | Never call `math/rand.Seed`. For a reproducible sequence, build a local generator with `rand.New(rand.NewPCG(s1, s2))` from `math/rand/v2` and pass it explicitly. New code imports `math/rand/v2`, never v1. Secrets use `crypto/rand` (GO-SEC). A non-test `math/rand/v2` use such as retry jitter gets `//nolint:gosec // G404: jitter, not security`, because the fleet config's gosec fires on v1 and v2 alike (L7). | Since go 1.24, `Seed` is a no-op keyed on the main module's `go` line (`randseednop`). At `go 1.23` it still seeds, so bumping the line silently breaks "seeded" test data (L3; `go1.27.1:src/math/rand/rand.go:398-400`). | staticcheck `SA1019: math/rand.Seed has been deprecated since Go 1.20` | yes: [SS 7], [SS 7b], [SS 7c] (exit 1 / exit 0); L3 (`seed-reproduces=true` at go 1.23, `false` at go 1.24) | MUST | go 1.24 (no-op); v2 go 1.22 |
| GO-LANG-22 | Never import `golang.org/x/exp/constraints`; use `cmp.Ordered` (and stdlib `slices`/`maps`). Add `golang.org/x/exp/constraints` as a package-scoped entry to GO-MOD-08's `superseded` depguard list (`desc: "use stdlib cmp.Ordered (Go 1.21)"`), beside `x/exp/slices` and `x/exp/maps`. Never deny all of `golang.org/x/exp` (GO-MOD-08). | Superseded since Go 1.21, and the corpus has 0 importers ([GI] Exemplar evidence). The Go team's still-live 2022 [intro-generics](https://go.dev/blog/intro-generics) post shows it as the canonical constraint, so a model trained on it reproduces the import. | `golangci-lint run ./...` with the `superseded` rule: `import 'golang.org/x/exp/constraints' is not allowed from list 'superseded'` | yes: L13 (package-scoped entry: violation exit 1, `cmp.Ordered` twin exit 0); [GI G6] (whole-`x/exp` deny, superseded by L13's scoping) | MUST (fleet config) | go 1.21 |

#### Caught by revive `time-equal` (added to GO-GATE-15's rules list)

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-LANG-07 | Compare `time.Time` values with `Equal`, never `==`/`!=`. Never key a map or a dedup set by a raw `time.Time`: key by `t.UnixNano()`, or apply one normalization (`t.UTC().Round(0)`) to every key on every path. | `==` compares the monotonic reading and the Location too. A JSON round-trip of the same instant is `!=`, and a map lookup with it misses silently ([SS] §6; [pkg.go.dev/time#Time](https://pkg.go.dev/time#Time): "prefer t.Equal(u) to t == u"). | `golangci-lint run ./...` with `revive.rules` += `- name: time-equal`. The map-key half is a reading heuristic: `grep -rn --include='*.go' -e 'map\[time\.Time\]' .`, then read each hit. | yes: L2 (violation exit 1 with 2 `time-equal` issues; twin exit 0 `0 issues.`). Measured on 5 exemplars (435k LOC): 3 hits, all the documented pattern, 0 false positives. gocritic enable-all misses it ([SS 9]). | MUST | — |

#### Caught by gopls `yield` and `go test` (static, runtime and golden checks)

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-LANG-08 | Never let an `iter.Seq`/`iter.Seq2` producer call `yield` again after it may have returned false. Check the result (`if !yield(v) { return }`) wherever another `yield` call or loop iteration can follow on some path. A `yield` that is the last action on its path may go unchecked. That shape is correct, for example `prometheus/prometheus@270db2915054:promql/parser/ast.go:407-443`, but it is fragile, so name it in review. Each exported producer gets one test that `break`s out of a `range` over it early. | An iterator that ignores `yield`'s result keeps running past the caller's `break`, and the runtime panics only if some consumer exits early. No fixer writes iterators ([EM] §1). `go vet`, `golangci-lint` (govet `enable-all`) and `staticcheck -checks all` are silent (L1, L10, [GI G1]). | Static: `find . -name '*.go' -not -path '*/vendor/*' -print0 \| xargs -0 -r gopls check \| grep -e 'yield may be called again'` with gopls v0.23.0, where grep exit 0 (any output) is the finding. `gopls check` itself exits 0 even with findings. Runtime: `go test ./...`, where `panic: runtime error: range function continued iteration after function for loop body returned false` is the finding. | yes: L10 (loop and sequential violations grep exit 0; terminal-`yield` and checked twins grep exit 1); L11 (0 hits on 90 iterator files in 6 exemplars, both terminal-`yield` exemplars included); L1 (test exit 1 with the panic; twin exit 0); [GI G2] (terminal shape exit 0, loop shape panics) | MUST | go 1.23; gopls v0.23.0 |
| GO-LANG-09 | Never let map iteration order reach observable output. A hand-written `range` over a map that writes to a writer, a hash, a golden file, a manifest, or a slice that is later emitted ranges over `slices.Sorted(maps.Keys(m))` instead. Do not add a sort before `json.Marshal` or `fmt` of a map: both already sort keys. Fix a flaky golden by sorting, never by re-recording it. Golden fixtures put **≥ 8 entries** in every map on the output path. | The spec leaves the order unspecified ([go.dev/ref/spec §For statements](https://go.dev/ref/spec#For_statements)), and no linter in golangci 2.14.0 or staticcheck covers it ([SS 10]). Small maps flip rarely: across 5 fresh iterations, P(identical) is 0.51 at 2 keys, 0.10 at 4 and 0.006 at 6 (L6). A small fixture therefore passes `-count=5` by luck. | `go test -run 'Golden' -count=5 ./...`, where any FAIL among the runs is the finding. The fixture-size clause is a reading check on the test data. | yes: [SS 3] (5-key violation, 3 FAIL of 5, exit 1), [SS 3b] (sorted twin 5/5 PASS, exit 0); L5 (json/fmt sorted 20/20, hand `range` gave 4 distinct orders) | MUST | — |
| GO-LANG-10 | Where JSON is a contract (the SDK envelope, any CLI `--json` or golden output), never swap `omitempty`→`omitzero` on a slice or map field, and never accept the `omitzero` fixer's declined alternative, without a byte-golden test that builds the field both `nil` and empty-non-nil. | `omitempty` drops both `nil` and `[]T{}`. `omitzero` drops only `nil` and emits `"tags":[]` ([SS] §3). The `go fix` fixer only deletes the no-op `omitempty` on struct-typed fields, so the slice swap is always a hand edit (frame correction (d); [EM] `omitzero-behavior`). | A golden test over both constructions, run before and after the tag change: output `{}` versus `{"tags":[]}` is the finding. | yes: [SS 2] (outputs differ exactly on `omitzero-empty-nonnil`); [EM] `omitzero-behavior` (stderr names the declined fix; bytes identical after the safe apply) | MUST (contract output); SHOULD elsewhere | go 1.24 (`omitzero`) |
| GO-LANG-11 | Import plain `encoding/json` and add nothing for Go 1.27: no compatibility shim, no build-tag split, no `GOEXPERIMENT=nojsonv2` pin. Keep one golden per test, not one per toolchain leg. | v1 API output is byte-identical under the 1.27.1 default and `nojsonv2`: duplicate names, invalid UTF-8, case mismatch, large integer into `any`, `omitempty`, `MarshalIndent` and HTML escaping ([SS] §1, §4). `nojsonv2` is "expected to be removed" ([go1.27](https://go.dev/doc/go1.27)). | Run the golden once by default and once with `GOEXPERIMENT=nojsonv2`, then `diff` the outputs. Empty output is the pass. | yes: [SS 1] (diff empty); no violation exists by construction, so the check is a regression tripwire | SHOULD | go 1.27 toolchain |
| GO-LANG-18 | Every `iter.Pull`/`iter.Pull2` call keeps `stop`. Either `defer stop()` on the next line, or store it on a value whose `Close`/cleanup method every path reaches. Never discard it with `_`. A package that calls `iter.Pull` counts as spawning a goroutine for GO-CONC-11: it gets `goleak.VerifyTestMain(m)` and one test that stops consuming before the sequence ends. | A discarded or unreached `stop` leaks the iterator's goroutine permanently ([pkg.go.dev/iter#Pull](https://pkg.go.dev/iter#Pull): "they must call stop"). GO-CONC-11 triggers on a `go` statement or a `.Go(` call, and an `iter.Pull`-only package has neither. vet, staticcheck and golangci are silent ([GI G3]). | `go test ./...` with `goleak.VerifyTestMain`, where `found unexpected goroutines: … state coroutine, with iter.Pull[...].func1.1` is the finding. To locate candidates: `grep -rn --include='*.go' -e 'iter\.Pull(' -e 'iter\.Pull2(' .`, then read each hit for `stop`. | yes: L12 (goleak violation exit 1, twin exit 0; `synctest.Test` violation exit 1 with `deadlock: main bubble goroutine has exited but blocked goroutines remain`, twin exit 0); [GI G3] (`NumGoroutine` before=1 after=2 / after=1) | MUST | go 1.23; goleak v1.3.0 |

#### Reading heuristics (no analyzer exists; each row's failure was watched at runtime or compile time unless marked)

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-LANG-12 | Decode JSON whose integers can exceed 2^53 into typed fields (`int64`, `uint64`, `json.Number`) or through `Decoder.UseNumber()`, never into `any`/`map[string]any`. The SDK decodes the ocx envelope into typed structs only. | `9007199254740993` decodes to `9.007199254740992e+15` with `err == nil` ([SS] §7; 100 Go Mistakes #77). The v2 backing does not change this. | `grep -rn --include='*.go' -e 'map\[string\]any' -e 'map\[string\]interface{}' .`, then read each unmarshal target | failure mode watched: [SS 5] | SHOULD | — |
| GO-LANG-13 | Index, slice or truncate a string that is not guaranteed ASCII by rune (`[]rune`, `utf8.RuneCountInString`, `utf8.DecodeRuneInString`), never by byte offset. That covers registry and OCI names, user input, paths and error text. Fuzz such helpers with multibyte seeds and assert `utf8.ValidString`. | `"café-ñandú"[:4]` is `"caf\xc3"`: invalid UTF-8, no panic ([SS] §8). SA6003 is a performance check on a different pattern and does not fire ([SS 6]), which corrects the map's M-A-09 cell. | Reading heuristic. `grep -rn --include='*.go' -E -e '\[:[0-9]+\]' .` is a broad aid that also matches `[]byte` slices. A fuzz target (GO-TEST-14) makes it mechanical. | failure mode watched: [SS 6] | SHOULD | — |
| GO-LANG-14 | Add a type parameter only when the module instantiates it with two or more types, or when the algorithm is type-indifferent (container, `slices`/`maps`-style helper). Otherwise write concrete code or an interface. No fixer decides this. Apply the single-instantiation finding only to unexported or internal functions, because a repo-local count cannot see an exported function's external callers. | `errorsastype` and `newexpr` use generics but never introduce one ([EM] §1). Style Decisions §Generics ([canon] §6); [when-generics](https://go.dev/blog/when-generics): "write code, not types". The corpus has 1,454 type-parameter declarations, 894 on functions and 560 on types ([GI] §1, re-measured; [shape] §3 counted 1,420). | Reading heuristic: for each declared type parameter, count call sites with `\bName\(` scoped to the declaring package. Use `Name[` only for zero-argument constructors (`New[T]()`), where inference cannot apply. A bracket-only grep counts almost no inferred calls: grpc-go's `NewRefCounted` has 15 real callers. State which method produced the count. | no (heuristic); counting method re-measured on 6 repos, 19 functions ([GI] §1) | SHOULD | go 1.18 |
| GO-LANG-19 | Write a constraint's basic-kind type elements (`string`, numeric kinds, slice/map/chan literals) as approximation elements (`~string`, `~int`), unless the constraint deliberately excludes named types. When a caller hits `possibly missing ~`, fix the constraint once, never by converting at the call site. | Without `~`, every `type X string`-style named type is rejected. The error surfaces at some later caller, not at the constraint's author. | Reading heuristic at authoring time. Once triggered, `go build` prints `MyID does not satisfy StringLike (possibly missing ~ for string in StringLike)`. | failure mode watched: [GI G11] (missing-tilde exit 1 / with-tilde exit 0) | SHOULD | go 1.18 |
| GO-LANG-20 | When the element type can be a float, route every comparator passed to `slices.SortFunc`, `SortStableFunc`, `BinarySearchFunc`, `CompareFunc`, `MinFunc`, `MaxFunc` or `sort.Slice` through `cmp.Compare`/`cmp.Less`, or use `cmp.Ordered` functions directly. Never hand-roll `<`/`>` for these, and never write a hand-rolled `Number` constraint with `if a < b` for a min/max helper. | Once NaN is possible, `<` is not a strict weak ordering, and `SortFunc` requires one. The measured output is unsorted (`[3 NaN 1 NaN 2]`), and `naiveMax(1,NaN) != naiveMax(NaN,1)`. `cmp.Compare` orders NaN first, deterministically ([pkg.go.dev/cmp](https://pkg.go.dev/cmp)). | Reading heuristic: `grep -rn --include='*.go' -e 'SortFunc(' -e 'SortStableFunc(' -e 'BinarySearchFunc(' -e 'CompareFunc(' -e 'MinFunc(' -e 'MaxFunc(' -e 'sort\.Slice(' .`, then read each comparator for a bare `<`/`>` on a float operand. | failure mode watched: [GI G5] | MUST (float-capable); SHOULD elsewhere | go 1.21 |
| GO-LANG-21 | When a `comparable`-constrained type parameter can be instantiated with `any` or another interface type, document that an uncomparable dynamic value (slice, map, func) panics on `==` or as a map key. If external input reaches that path, add a test for it. | The Go 1.20 relaxation lets interface types satisfy `comparable` statically. The spec states the runtime hazard ([§Satisfying a type constraint](https://go.dev/ref/spec#Satisfying_a_type_constraint)). | Reading heuristic: any `[K comparable]` type parameter instantiated with, or exported for, `any` or an interface type | failure mode watched: [GI G4] (`hash of unhashable type []int`, exit 1; vet/staticcheck/golangci silent) | SHOULD | go 1.20 |
| GO-LANG-24 | Constrain a generic interface's own type parameter with `any`. Put a stronger constraint (`comparable`, `cmp.Ordered`, a self-referential method constraint) on the concrete implementations, unless every implementation needs it. | An over-constrained interface forecloses implementations that do not need the extra power ([generic-interfaces](https://go.dev/blog/generic-interfaces): "leave any constraints (stronger than `any`) to concrete implementations"). | Reading heuristic: for each generic interface, compare its constraint with what every in-module implementation uses | no (design judgment, nothing observable to fixture) | SHOULD | go 1.18 |
| GO-LANG-25 | Name iterator-returning functions and methods by the `iter` convention. Use `All` for the single natural full sequence, `Backward` for reverse order, `Keys`/`Values` for map-like projections, and a domain name (`Preorder`) when several sequences exist and none is the default. Put configuration on the method arguments (`Scan(min, max)`), not on a family of name variants. | The stdlib (`slices.All`/`Values`/`Backward`, `maps.All`/`Keys`/`Values`, 1.23) sets the reader's expectation ([pkg.go.dev/iter §Naming Conventions](https://pkg.go.dev/iter#hdr-Naming_Conventions)). | Reading heuristic: `go doc` review against the convention | no | SHOULD | go 1.23 |
| GO-LANG-26 | Export `[]T` for a collection that is fully materialized before the call returns (decoded from one response body, one JSON document or one completed scan). Export `iter.Seq[T]`/`iter.Seq2[K,V]` only for an unbounded, lazy or single-pass source. The SDK's envelope collections (installed packages, tags) export `[]T`. | `iter.Seq` taxes every caller that is not a plain `for` with a `slices.Collect`, and it buys nothing when no laziness exists. This is the owner default on M-A-05, now with its rationale ([GI] §13). | Reading heuristic: does the producer hold the whole collection before returning? If yes, `[]T`. | no (both shapes compile and behave the same) | MUST (SDK); SHOULD elsewhere | go 1.23 |

#### The go-upgrade procedure (skill `go-upgrade`, M-P-02)

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-LANG-15 | Move a module to a new Go release in this order. (1) Read the notes of every release crossed against the silent-change table below. (2) Save `go list -f '{{.DefaultGODEBUG}}' ./...` before and after, and account for each difference. (3) Bump `go`, then the CLI's `toolchain` (GO-MOD-01/02), as a deliberate PR, because Dependabot never opens one for the line alone. (4) Run `go fix ./...` after the bump and read stderr for `ignoring alternative fix`. (5) Run `go vet ./...` and clear `stdversion`. (6) Bump the golangci pin and config (GO-GATE-08). (7) Run the GOEXPERIMENT audit (GO-LANG-16). (8) Run the full gate (GO-GATE-01). Only then do govulncheck triage (GO-MOD-12), as a separate diff. | Fixers decline below the new floor, so `go fix` run before the bump under-modernizes ([EM] misc-fixers). A toolchain line with a fixed CVE never gets its own Dependabot PR ([dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520), open). Behavior changes arrive with no compile error (table below). | Each step's own check. Step 4's ordering was watched. | yes (step 4): [EM] `misc-fixers` (`errorsastype` exit 0 at 1.25, exit 1 at 1.26) | SHOULD | — |
| GO-LANG-16 | On every `go`-line bump, re-justify each `GOEXPERIMENT=` pin in a Makefile, Dockerfile or workflow against the destination's defaults, and give each pin a comment saying why. There are three outcomes. If the experiment is now the default, the pin is a real opt-out (`nojsonv2` on 1.27). If it is still opt-in, the pin is a no-op (`nogreenteagc` on 1.27). If the experiment was removed, the build breaks. | A pin written in the 1.25 window silently keeps a module on v1 JSON in 1.27 ([EM] §6). | `grep -rn -e 'GOEXPERIMENT=' -e 'GOEXPERIMENT ' . --include='Makefile' --include='Dockerfile' --include='*.yml' --include='*.yaml'`, where output names what to re-justify | yes: [EM] `goexperiment-pin` (exit 0 with the pin / exit 1 empty) | SHOULD | — |
| GO-LANG-17 | In a repository that commits `go.work`, keep its `godebug` block identical to every member module's own `godebug` lines, or have neither. | In workspace mode a member's `godebug` is ignored with no warning. Under `GOWORK=off`, which is GO-MOD-05's per-member CI leg, it applies. The two builds therefore run with different runtime defaults: 2 differing settings versus 24 ([EM] §4). | Run in the workspace root: `for d in $(go list -m -f '{{.Dir}}'); do test "$(go -C "$d" list -f '{{.DefaultGODEBUG}}' .)" = "$(GOWORK=off go -C "$d" list -f '{{.DefaultGODEBUG}}' .)" \|\| echo "godebug differs: $d"; done`, where any output is the finding. | yes: L9 (violation prints the member, exit 1; twin with equal lines exit 0) | SHOULD | go 1.23 (`godebug` directive) |

**Silent-change table** (read by GO-LANG-15 step 1; each entry arrives with no
compile error):

| Change | Keyed on | Source |
|---|---|---|
| Per-iteration loop variables | the file's effective version ≥ 1.22 | [EM] loopvar; L8 |
| `slices.Insert` panics on an out-of-range index | 1.22 | [EM] GO-LANG-06, [canon] |
| Unbuffered timer channels | main-module `go` ≥ 1.23 on toolchains 1.23–1.26; **unconditional on 1.27**, where `asynctimerchan=1` is a fatal error (GO-MOD-04) | [EM] §4 |
| `math/rand.Seed` is a no-op | main-module `go` ≥ 1.24 (`randseednop`) | L3 |
| Container-aware `GOMAXPROCS` | main-module `go` ≥ 1.25 | GO-MOD-09 |
| "Core type" removed from the spec: prose and compiler error text change, behavior does not | 1.25 | [GI] §9; [go.dev/blog/coretypes](https://go.dev/blog/coretypes) |
| `encoding/json` v1 backed by v2: bytes unchanged, **error text may differ** | 1.27 toolchain (build-wide `GOEXPERIMENT`, not the `go` line) | [SS 1]; GO-ERR-14 |
| A stdlib symbol newer than the `go` line compiles anyway (for example `errors.AsType`) | never enforced by the compiler; only `stdversion` | frame correction (d); L4 |

**Rows dropped or delegated.**
- M-A-03, 04, 16 and 17 (`any`, `slices`/`maps`/`min`/`max`, `strings.Cut` family, `// +build`) are wholly GO-GATE-03 (`go fix`) plus GO-MOD-08 (depguard on `x/exp/slices`, `x/exp/maps`, `io/ioutil`; GO-LANG-22 adds `x/exp/constraints`).
- M-A-15 is GO-MOD-09. Wire format is compatible both ways ([SS 8]), so it needs no rule.
- M-A-19 (`0o644`) is dropped. It is P3, the formatter of record (gofmt, GO-GATE-06) does not rewrite it, and no failure was measured.
- M-A-20 (`AddCleanup`, `weak`/`unique`) is dropped. No dive evidence, and `reflecttypefor` covers the reflect half.
- The dive's pointer-receiver trap for generic interfaces (take the interface *value* as a parameter rather than adding a `PS PtrToSet[S, E]` type parameter; [GI] §7) is folded into GO-LANG-24's reading, not a separate row.

## Applied to the exemplars and the future consumers

**Satisfied by strict exemplars.**
- GO-LANG-04:
  - `aquasecurity/trivy@ae561f8cca36:pkg/rpc/convert.go:4` imports `encoding/json/v2` at `go 1.27.0` (`go.mod:3`). It is the only real importer in the corpus, with 13 files.
  - `tailscale/tailscale@6b3a45f14ef6:cmd/jsonimports/jsonimports.go:7-21` goes further and rewrites stdlib v2 imports to `go-json-experiment`.
  - This corrects the dive's "no exemplar imports it" ([SS] Exemplar evidence). The other three grep hits are string literals, for example `golang/tools@d2d3de9f066e:internal/typesinternal/toonew.go:28`.
- GO-LANG-05: message-scoped exclusions only:
  - `restic/restic@5127c4abf921:.golangci.yml:81`
  - `kubernetes-sigs/controller-runtime@d0127f7f66de:.golangci.yml:137`
  - `golangci/golangci-lint@032d962e0399:.golangci.yml:227,231`
- GO-LANG-07: 0 `time-equal` hits in restic, caddy and go-containerregistry (L2).
- GO-LANG-01/02:
  - `spf13/cobra@adbc8813901b` and `regclient/regclient@43d2acb9fafd` produce an empty `go fix -diff` ([EM] Exemplar evidence).
  - None of the 459 census diagnostics is a float `minmax`, a reused-`Split` `stringsseq` or a risky `omitzero` ([EM] §2).
- GO-LANG-08: 0 gopls `yield` findings on 90 iterator files in prometheus, bazel-gazelle, tailscale, restic, terraform and go-tools (L11). The terminal-`yield` shape appears at:
  - `prometheus/prometheus@270db2915054:promql/parser/ast.go:407,421,427,435-443`
  - `bazelbuild/bazel-gazelle@63c9a3d2078f:v2/pathtools/path.go:189`, which the dive cited as `pathtools/path.go:189`. That v1 file is a 90-line `//go:fix inline` forwarder.
  - `golang/tools@d2d3de9f066e:gopls/internal/cache/constraints.go:98`
- GO-LANG-18: all 6 corpus `iter.Pull` sites release `stop`:
  - `dominikh/go-tools@6cb65e58a558:pattern/parser.go:370-371` (`defer stop()`)
  - `restic/restic@5127c4abf921:internal/data/tree.go:164,201` and `:335,360` (stored, called from cleanup)
  - `restic/restic@5127c4abf921:cmd/restic/cmd_copy.go:218-219` (`defer stop()`)
  - `hashicorp/terraform@db4eef44f5bb:internal/command/format/diagnostic.go:436-437,499-500` (called unconditionally before the only return)
- GO-LANG-22: 0 of 35 repos import `golang.org/x/exp/constraints` ([GI] Exemplar evidence).
- GO-LANG-11: `google/go-github@48d0a668cde8:github/timestamp.go:35-46` custom marshalers behave identically under both backends at `go 1.26.0` ([SS] Exemplar evidence).

**Violated by prominent exemplars.**

| Rule | Where | What |
|---|---|---|
| GO-LANG-05 | `aquasecurity/trivy@ae561f8cca36:.golangci.yaml:134`, `kubernetes/kubernetes@dfd7b93a1783:hack/golangci.yaml:707`, `hashicorp/terraform@db4eef44f5bb:staticcheck.conf:7`, `goreleaser/goreleaser@ff8de3d6c389:.golangci.yaml:89`, `tailscale/tailscale@6b3a45f14ef6:staticcheck.conf:3` | `-SA1019` repo-wide (5 repos). terraform documents it as policy (`staticcheck.conf:5`). |
| GO-LANG-06 | `syncthing/syncthing@94c3c1cdef71:test/util.go:34`, `test/sync_test.go:47`, `lib/model/model_test.go:2117` | `rand.Seed(42)` in a `go 1.26.2` module, so the "seeded" test data is not reproducible (L3). The corpus has 8 sites, 5 of them in syncthing ([shape] §3). |
| GO-LANG-07 | `syncthing/syncthing@94c3c1cdef71:cmd/dev/stwatchfile/main.go:74`, `regclient/regclient@43d2acb9fafd:types/tag/taglist_test.go:303-304` | `!=` on `ModTime()` / `Created` / `Uploaded` (L2) |
| GO-LANG-02 | etcd 32, terraform 25, zap 12 of the 142 `x := x` copies ([shape] §3) | Dead where the module and file are at ≥ 1.22. Each one needs its effective version read before deletion. |
| GO-LANG-01 (gate debt) | `uber-go/zap@4892335e05f1` | 250 of 459 fixer diagnostics, mostly `interface{}`→`any` ([EM] §2). The audits read this as a stable-API choice, not neglect. |
| GO-LANG-02 | `google/go-cmp@b133f1f1932e:cmp/cmpopts/ignore.go:103`, `stretchr/testify@87a7b9d57689:internal/spew/spew_test.go:110,123` | `inline` declines by floor (`go 1.21`, `go 1.17`), so their clean-looking diff is floor-limited |
| GO-LANG-14 | `bazel-contrib/rules_go@970e99d77c8b:go/tools/gopackagesdriver/utils.go:100,112,122` (`contains`, `containsAll`, `equalSets`); `google/go-containerregistry@0c8bedb78437:pkg/v1/remote/options.go:370` (`Reuse`) | Unexported or internal generic helpers with 1 call site each, by both counting methods ([GI] §1) |

**New commitments.**
- **Go SDK** (`go 1.26.0`, stdlib-only runtime):
  - GO-LANG-04: no `encoding/json/v2`, with `go vet` in the gate.
  - GO-LANG-03/23: no generic methods until the floor moves; package-level generic functions instead.
  - GO-LANG-12: the envelope (`schema_version`, `command`, `exit_code`, `tags`; [cfg] §3) decodes into typed structs only.
  - GO-LANG-10: a golden per envelope type that builds `tags` both `nil` and `[]string{}`.
  - GO-LANG-09: maps are never ranged into output unsorted.
  - GO-LANG-26: collection results are `[]T`, not `iter.Seq`.
  - GO-LANG-08/18: an exported `iter.Seq`, if one ever appears, gets the gopls `yield` gate and an early-break test; any `iter.Pull` use gets `goleak.VerifyTestMain`.
- **Go CLIs** (`go 1.27.0`):
  - GO-LANG-09 and GO-LANG-10 on every `--json` and golden output, with golden fixtures of ≥ 8 map entries.
  - GO-LANG-13 on registry-name truncation in TTY tables.
  - GO-LANG-06: jitter comes from `math/rand/v2` with a G404 `nolint` reason.
  - GO-LANG-07 on cache and mtime comparisons.
  - GO-LANG-20 on any sort of float-valued columns (sizes, durations, scores).
- **Fleet config:**
  - GO-GATE-15's revive list gains `- name: time-equal` (conflict 5 below).
  - GO-MOD-08's `superseded` list gains `golang.org/x/exp/constraints` (GO-LANG-22).
  - The gate gains a pinned `gopls check … | grep -e 'yield may be called again'` step (GO-LANG-08) for any module declaring `iter.Seq`/`Seq2` producers.
- **`go-upgrade` skill:** GO-LANG-15..17 and the silent-change table.

## AI-agent failure modes

Ranked by how often it bites (corpus frequency and dive agent-angle
evidence), each with its mechanical check.

1. **Writes pre-1.21 idioms, or hand-"modernizes" past what the fixer allows** (26.8 diagnostics per 10k LOC on CI-green code, [shape] §7). Check: `go fix -diff ./...` (GO-GATE-03). For the declined shapes, GO-LANG-01's diff-against-fixer reading.
2. **Ranges a map straight into output, then "fixes" the flaky golden by re-recording it.** Check: `go test -count=5` with ≥ 8-entry fixtures (GO-LANG-09). A 2-key fixture hides it half the time.
3. **Decodes "flexible" JSON into `map[string]any` and reads numbers back out.** Check: GO-LANG-12's grep plus a read of each hit.
4. **Trusts an empty `go fix -diff` or a green build as "modern and compatible" without reading the `go` line or the file's build tag.** Check: `go list -m -f '{{.GoVersion}}'`, and `go vet` `stdversion` (GO-LANG-02, GO-LANG-04).
5. **Calls `rand.Seed(n)` for reproducibility.** Check: SA1019. Silencing SA1019 repo-wide, as 5 exemplars do, blinds this, so GO-LANG-05's grep is the backstop.
6. **Writes a `for`-loop iterator that ignores `yield`'s result.** It compiles, passes vet, staticcheck and golangci, and panics only when a consumer breaks early. Check: the gopls `yield` step, plus an early-break test (GO-LANG-08).
7. **Adds a type parameter to a function used with one type "for later reuse", and counts callers with `Name[`.** Check: `\bName\(` in the declaring package (GO-LANG-14).
8. **Compares `time.Time` with `==`, or keys a cache by it.** Check: revive `time-equal` (GO-LANG-07).
9. **Reaches for `golang.org/x/exp/constraints.Ordered` or a hand-rolled `Number` constraint with `<`.** Checks: depguard (GO-LANG-22), and a comparator read for NaN (GO-LANG-20).
10. **Bulk-renames `omitempty`→`omitzero`.** Check: a golden with `nil` and empty constructions (GO-LANG-10).
11. **Puts a type parameter on a method below 1.27 or on an interface method, then "fixes" it by bumping the `go` line.** The bump never helps the interface case. Check: `go build`'s exact error (GO-LANG-23, GO-LANG-03).
12. **Exports `iter.Seq[T]` "because iterators are modern" for an already materialized slice.** Check: GO-LANG-26's one question.
13. **Calls `iter.Pull` without keeping `stop`.** Check: goleak in `TestMain` (GO-LANG-18).
14. **Truncates `s[:n]` for display.** Check: a fuzz target with multibyte seeds asserting `utf8.ValidString` (GO-LANG-13).
15. **Forgets `~` on a constraint, then converts at every call site instead.** Check: read the compiler's `possibly missing ~` hint (GO-LANG-19).
16. **Adds json/v2 shims or a `nojsonv2` pin "for 1.27 safety", or imports `encoding/json/v2` into a 1.26 library.** Check: `diff` of the default and `nojsonv2` goldens; `go vet` (GO-LANG-11, GO-LANG-04).
17. **Resurrects stale knobs or vocabulary from training data** (`GODEBUG=asynctimerchan=1`, an invented `ioutil` fixer, "`waitgroup` was renamed", "core type" as current spec vocabulary). Checks:
    - `go build` fails with `removed GODEBUG` (GO-MOD-04).
    - `go tool fix help` lists the 26 real fixer names.
    - `go tool vet help` still lists `waitgroup` (map conflict 15c).
    - The current spec text contains no "core type" ([GI] §9).
18. **Waits for Dependabot to bump `toolchain`.** Check: none mechanical. GO-LANG-15 step 3 is a scheduled action.

## Conflicts resolved

1. **`rand.Seed` a no-op "since Go 1.20" ([SS] Summary, §9) versus "since 1.24" ([EM] GO-LANG-06, map M-A-08).** Resolved for 1.24, sharpened. It was deprecated in 1.20 and became a no-op in 1.24, keyed on the main module's `go` line. At `go 1.23` it still seeds (L3, `go1.27.1:src/math/rand/rand.go:398-400`). The toolchain source and a watched run outrank a paraphrase.
2. **"`errors.AsType` compiles only at `go 1.26`+" ([EM] GO-LANG-06 table) versus frame correction (d) ("compiles in a go 1.25 module on a 1.27 toolchain").** Resolved for the correction. The fixer gating [EM] watched is real, but compilation is not gated for stdlib symbols. The table entry now reads "only `stdversion`", and L4 reproduces the same mechanism for `encoding/json/v2`.
3. **"No exemplar imports `encoding/json/v2`" ([SS] Exemplar evidence) versus the re-measurement.** trivy imports it in 13 files at `go 1.27.0`, and tailscale rewrites it away. [SS]'s grep probably excluded too much. The same census shows grep false positives on string literals, which is why GO-LANG-04's check is `go vet`, not the dive's grep.
4. **Iterator stop contract "reading heuristic only" ([EM] GO-LANG-05) versus a runtime check.** Since 1.23 the runtime panics when an iterator continues after `yield` returns false. A one-line early-break test turns that into a gate (L1), so the row is promoted to MUST.
5. **`time.Time ==` "no analyzer catches it" ([SS] §6, which tested only gocritic) versus revive `time-equal`.** revive `time-equal` catches it (L2), with 0 false positives on 5 exemplars. This contradicts GO-GATE-15's fixed two-rule revive list. **Resolution:** GO-GATE-15 gains `time-equal` as a third rule, on measurement. The list stays explicit, because a `rules:` list replaces revive's defaults.
6. **`go test -count=5` as the map-order check (map M-A-10; [SS] §5 "confirmed on 5 keys") versus L6.** L6 shows -count=5 misses a 2-key map 51% of the time and a 4-key map 10%. **Resolution:** keep `-count=5`, and require ≥ 8 map entries in golden fixtures on the output path (miss rate ≤ 0.001 measured). The dive's own "Contested" note flagged exactly this.
7. **Timer channels "unbuffered since 1.23" (map M-A-13) versus [EM] §4.** The `go`-line gate held only on toolchains 1.23–1.26. 1.27 applies it unconditionally, and the old value is a fatal error. The table carries both halves.
8. **The `omitzero` fixer framed as offering the slice swap ([SS] §3, AI angle) versus [EM] §1 and frame correction (d).** The fixer only deletes the no-op `omitempty` on struct-typed fields, and it declines the behaviour-changing alternative. The slice hazard is a hand edit, and GO-LANG-10 is worded that way.
9. **SA6003 listed as the check for byte-vs-rune slicing (map M-A-09) versus [SS 6].** SA6003 targets `range []rune(s)` performance and does not fire. GO-LANG-13 is a reading heuristic plus fuzzing.
10. **"`waitgroup`→`waitgroupgo` rename" ([EM] Sources, go1.27 row) versus map conflict 15c.** These are two tools: the vet analyzer `waitgroup` and the fixer `waitgroupgo`. The map, backed by `go tool vet help`, stands.
11. **Map conflict 14's open item, "the v1 API inherited stricter defaults".** Falsified by [SS 1]: the output is byte-identical. The only change is error-message text, which GO-ERR-14 already forbids matching.
12. **"No analyzer catches an ignored `yield`" ([GI] Summary, G1, Contested: "a real gap in the toolchain") versus the map's M-A-05 cell ("gopls `yield` analyzer", [cod] §3).** [GI] tested vet, staticcheck and golangci only; it had no gopls binary. With gopls v0.23.0 installed, the `yield` analyzer flags the loop and sequential shapes and leaves the terminal and checked shapes alone (L10). It found 0 hits on 90 exemplar iterator files (L11), and govet `enable-all` stays silent. **Resolution:** GO-LANG-08 gains the gopls step as its static check. The gap is narrowed to "golangci-lint and staticcheck carry no `yield` check".
13. **GO-LANG-08's blanket "every producer returns as soon as `yield` returns false" versus the correct terminal-`yield` shape in prometheus and bazel-gazelle ([GI] §10).** Resolved for the dive. An unchecked `yield` is a defect only when another `yield` can follow it on some path, which is exactly the gopls analyzer's criterion. GO-LANG-08's text changed in place, and its MUST keeps the same hazard.
14. **GO-LANG-18 "no analyzer exists; reading heuristic" ([GI] §11) versus L12, and versus GO-CONC's "`synctest` is not a leak detector".** goleak and `synctest.Test` both went red on a discarded `stop` and green on the twin (L12). **Resolution:** follow GO-CONC-11's choice and use goleak as the check, with its trigger extended to `iter.Pull` callers. `synctest` is recorded as the stdlib-only alternative for this one shape, and GO-CONC's general verdict stands.
15. **GO-LANG-22's depguard `deny: golang.org/x/exp` ([GI G6]) versus GO-MOD-08 ("deny these two packages, never all of `x/exp`").** GO-MOD-08 wins. A package-scoped `golang.org/x/exp/constraints` entry was watched red and green (L13), so the rule adds one list entry and no broad pattern.
16. **[GI]'s GO-LANG-23 "a generic method is preferred over the function-taking-receiver workaround at ≥ 1.27" versus [when-generics](https://go.dev/blog/when-generics) ("prefer functions to methods") and L14.** Resolved to "permitted", not "preferred". No source argues for preference, and a generic method silently fails to satisfy any interface (L14).
17. **GO-LANG-03's "generic type aliases (1.24)" versus [GI G10].** On the 1.27 toolchain the language gate is `go 1.23`, and cross-package use compiles. The "migration shims only" scope stays as a fleet choice, and the floor and caveat text were corrected in place.

## Open questions

**Owner decisions (default the program applies):**
- Add `time-equal` to the fleet revive rules (GO-GATE-15). **Default: yes**, on L2's zero-FP measurement.
- Deny v1 `math/rand` by depguard (GO-MOD-08). **Default: no.** v1 is not deprecated, and SA1019 on `Seed` plus GO-LANG-06's text suffice.
- gosec G404 on `math/rand/v2` jitter in CLIs. **Default:** a per-site `//nolint:gosec // G404: <reason>`, with no global exclude.
- Run gopls in the gate only for modules that declare iterator producers, or everywhere. **Default:** only where `grep -rln --include='*.go' -e 'func(yield func(' .` has output, because gopls is a second toolchain binary to pin.

**Another research round:**
- `language/stdlib-semantics`: does Swiss-table map iteration bias (1.24+) make `-count=N` unreliable for maps of 2–7 entries in every shape (int keys, deleted entries, growth), and should GO-LANG-09 prescribe a shuffle-insertion helper instead of the ≥ 8-entry fixture rule? L6 measured string keys only.
- `language/era-and-modernizers`, dated re-check at each Go minor: has `GOEXPERIMENT=nojsonv2` been removed, did the fixer roster change, and has the gopls `yield` analyzer reached `go vet` or golangci? This is a go-upgrade step, not a new dive.

## Consolidation verification runs

All commands were run through `/home/mherwig/.cache/research-lang/go-tools/run.sh`
(Go 1.27.1, `GOTOOLCHAIN=local`, golangci-lint 2.14.0) on 2026-09-26, in
`fixtures/go-language/<dir>`. gopls v0.23.0 was installed into
`fixtures/go-language/bin/` with `go install golang.org/x/tools/gopls@latest`.

| # | Fixture | Command | Violation | Twin | Relevant output |
|---|---|---|---|---|---|
| L1 | `yieldstop/{violation,compliant}` | `go test ./...`; `go vet ./...` | test exit 1; vet exit 0 | test exit 0; vet exit 0 | `panic: runtime error: range function continued iteration after function for loop body returned false` |
| L2 | `timeequal/{violation,compliant}` (revive rules: context-as-argument, deep-exit, time-equal) | `golangci-lint run ./...` | exit 1 | exit 0 | `t.go:5:41: time-equal: use a.Equal(b) instead of "==" operator (revive)`, `2 issues` / `0 issues.` |
| L2b | exemplars, `--config timeequal/measure.yml` (time-equal only) | `golangci-lint run --config … ./...` | — | — | restic 0, caddy 0, go-containerregistry 0, syncthing 1, regclient 2 (435k LOC): all `==`/`!=` on `time.Time`, 0 FP |
| L3 | `randseed-goline/go1.23`, `/go1.24` | `go run .`; `go list -f '{{.DefaultGODEBUG}}' .` | go1.24: `seed-reproduces=false`, no `randseednop` | go1.23: `seed-reproduces=true`, `randseednop=0` | Shows the line-keyed no-op (the go1.23 run is the *legacy* behaviour, not a compliant twin) |
| L4 | `jsonv2-floor/go1.26`, `/go1.27` | `go build ./...`; `go vet ./...` | go1.26: build exit 0, vet exit 1 | go1.27: vet exit 0 | `j.go:9:52: json.Marshal requires go1.27 or later (module is go1.26)` |
| L5 | `mapsorted/` | `go run .` | — | — | `json={"alpha":1,…}` and `fmt=map[alpha:1 …]` sorted 20/20; hand `range` gave 4 distinct orders over 20 fresh maps |
| L6 | `mapsize/` | `go run .` (2,000 trials per size) | — | — | P(5 fresh iterations identical): n=2 0.511, n=3 0.228, n=4 0.099, n=5 0.026, n=6 0.006, n=7 0.000, n=8 0.000–0.001 |
| L7 | `sa1019/fleet` (config-revision fleet `.golangci.yml`), `sa1019/silenced` (`checks: ["all","-SA1019"]`) | `golangci-lint run ./...`; `grep -rn -e '-SA1019' --include='*golangci*' --include='staticcheck.conf' .` | silenced: SA1019 absent (only gosec G404 left), grep exit 0 | fleet: `SA1019: math/rand.Seed has been deprecated since Go 1.20 …`, grep exit 1 | Also: gosec `G404` fires on `math/rand` in non-test code under the fleet config |
| L8 | `filever/` (`go 1.22`; `b.go` has `//go:build go1.21`) | `go fix -diff ./...` | exit 1 | — | diff removes `v := v` in `a.go` only; `b.go` untouched |
| L9 | `gowork-godebug/{violation,compliant}` (twin: `go.work` `godebug default=go1.21` = member's) | `bash ../check.sh` (the GO-LANG-17 loop) | exit 1, `godebug differs: …/member` | exit 0 | — |
| L10 | `yieldgopls/{loop,seq,terminal,compliant}` (`go 1.26`) | `sh -c "find . -name '*.go' -not -path '*/vendor/*' -print0 \| xargs -0 -r gopls check \| grep -e 'yield may be called again'"`; `golangci-lint run --config ../govet-all.yml ./...` (govet `enable-all`) | loop grep exit 0, seq grep exit 0; govet-all exit 0 `0 issues.` on loop | terminal grep exit 1, compliant grep exit 1 | `it.go:8:4-12: yield may be called again after returning false`; `it.go:7:3-11: yield may be called again (on L8) after returning false`. `gopls check` itself exits 0 in all four. |
| L11 | exemplars (read-only): prometheus, bazel-gazelle, tailscale, restic, terraform, go-tools | `gopls check <files containing yield(, non-vendor, ≤ 80 per repo>` | — | — | 0 `yield may be called again` hits over 3+21+25+8+19+14 = 90 files. Load confirmed: prometheus 311 packages in `-v`, tailscale emitted unrelated hints. |
| L12 | `pullstop/{violation,compliant}` (`synctest.Test`), `pullstop/goleak-{violation,compliant}` (`goleak.VerifyTestMain`, goleak v1.3.0) | `go test ./...` | synctest exit 1, goleak exit 1 | exit 0, exit 0 | `panic: deadlock: main bubble goroutine has exited but blocked goroutines remain`; `goleak: … found unexpected goroutines: [Goroutine 8 in state coroutine, with iter.Pull[...].func1.1 on top of the stack` |
| L13 | `xexpconstraints/{violation,compliant}` with `depguard.yml` (`superseded` rule: `x/exp/slices`, `x/exp/maps`, `x/exp/constraints`) | `golangci-lint run --config ../depguard.yml ./...` | exit 1 | exit 0 `0 issues.` | `main.go:6:2: import 'golang.org/x/exp/constraints' is not allowed from list 'superseded': use stdlib cmp.Ordered (Go 1.21) (depguard)` |
| L14 | `genericmethod-iface/` (`go 1.27`) | `go build ./...` | build fails | — (no twin: the point is that no generic method satisfies the interface) | `Box[int] does not implement IntMapper (wrong type for method Map)` / `have Map[U any](func(int) U) U` / `want Map(func(int) int) int` |

## Sub-artifacts

- [go-language/era-and-modernizers.md](go-language/era-and-modernizers.md): the 26 `go fix` fixers and their self-limits, a fresh 459-diagnostic census, go-line and file-line gating, GODEBUG removals and `go.work` precedence, SA1019 versus `//go:fix inline`, GOEXPERIMENT pins, Dependabot and the `toolchain` line, and the go-upgrade order.
- [go-language/stdlib-semantics.md](go-language/stdlib-semantics.md): the json/v2 default-on verdict (v1 bytes unchanged), `omitempty` versus `omitzero`, map order, `time.Time` equality, large integers in `any`, rune slicing, `rand.Seed`, and stdlib-`uuid` wire compatibility.
- [go-language/generics-and-iterators.md](go-language/generics-and-iterators.md): when a type parameter earns its place and how to count instantiations; `comparable` with `any`; `~T`; `cmp.Ordered` and NaN; `x/exp/constraints`; generic methods and the interface restriction; generic interfaces and self-referential constraints; generic type aliases; the removal of core types; the `yield` contract and the terminal-call shape; `iter.Pull` `stop`; iterator naming; and the SDK's `[]T` default.

## Key sources

- [go.dev/doc/go1.27](https://go.dev/doc/go1.27): json/v2 default-on with "behavior is preserved", `nojsonv2` slated for removal, generic methods and the interface-method restriction, GODEBUG removals, and fixer roster changes
- [go.dev/doc/go1.26](https://go.dev/doc/go1.26): `go fix` as the modernizer home, `new(expr)`, self-referential constraints, and the 1.27 removal announcements
- [go.dev/doc/go1.24](https://go.dev/doc/go1.24) and [go1.23](https://go.dev/doc/go1.23): generic type aliases (preview, then full), and the `slices`/`maps` iterators
- [go.dev/doc/go1.22](https://go.dev/doc/go1.22): per-iteration loop variables and range-over-int
- [go.dev/doc/godebug](https://go.dev/doc/godebug): the settings history, `godebug` precedence, workspace consultation, and GODEBUG versus GOEXPERIMENT
- [go.dev/ref/spec](https://go.dev/ref/spec#For_statements): map order unspecified, string indexing by byte, and the `comparable` runtime-panic caveat
- [go.dev/ref/mod](https://go.dev/ref/mod): `go` and `toolchain` line semantics
- [go.dev/blog/range-functions](https://go.dev/blog/range-functions): the `yield`-returns-false contract
- [go.dev/blog/when-generics](https://go.dev/blog/when-generics): "write code, not types" and "prefer functions to methods"
- [go.dev/blog/generic-interfaces](https://go.dev/blog/generic-interfaces): constrain implementations, not interfaces
- [go.dev/blog/coretypes](https://go.dev/blog/coretypes): why core types left the spec in 1.25
- [go.dev/blog/inliner](https://go.dev/blog/inliner): `//go:fix inline` and its refusals
- [pkg.go.dev/iter](https://pkg.go.dev/iter): `Pull`'s `stop` obligation and the naming conventions
- [pkg.go.dev/cmp](https://pkg.go.dev/cmp) and [pkg.go.dev/slices](https://pkg.go.dev/slices): the NaN total order, and `SortFunc`'s strict-weak-ordering requirement
- [pkg.go.dev/time#Time](https://pkg.go.dev/time#Time): `==` versus `Equal`, the monotonic reading, and map keys
- [pkg.go.dev/encoding/json/v2](https://pkg.go.dev/encoding/json/v2): v2's stricter defaults and v1-compatibility options
- [pkg.go.dev/math/rand/v2](https://pkg.go.dev/math/rand/v2): local generators and no global `Seed`
- [gopls analyzers: yield](https://pkg.go.dev/golang.org/x/tools/gopls/internal/analysis/yield): the ignored-`yield` analyzer (gopls v0.23.0)
- [staticcheck.dev/docs/checks/#SA1019](https://staticcheck.dev/docs/checks/#SA1019): the deprecated-identifier check
- [revive rules: time-equal](https://github.com/mgechev/revive/blob/master/RULES_DESCRIPTIONS.md#time-equal): the `time.Time` equality lint
- [dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520): no toolchain-only PRs (open)
- [100go.co](https://100go.co/): #36–37 (runes), #75 (time), #77 (JSON into `any`)

## Revision log

- 2026-09-26: folded in `go-language/generics-and-iterators.md` (wave 4). GO-LANG-01..17 keep their numbers and meanings.
- GO-LANG-08: text changed in place. The MUST now binds "`yield` called again after it may return false" instead of every producer, because the dive watched the terminal-`yield` shape run clean in prometheus and bazel-gazelle. The gopls v0.23.0 `yield` analyzer is added as the static check, watched red and green (L10), with 0 FP on 90 exemplar files (L11). This corrects the dive's "no analyzer exists".
- GO-LANG-03: text changed in place. Generic type aliases now read as compile-gated at `go 1.23` and cross-package-capable; the old "(1.24)" wording implied the 1.23 caveat still held. The floor cell moved from 1.24 to 1.23. The row points to GO-LANG-23 ([GI G10]).
- GO-LANG-14: the rule was extended to unexported or internal functions only, and the counting method was corrected from `Name[` to `\bName\(` scoped to the package. The declaration count was updated from 1,420 to 1,454 ([GI] §1).
- GO-LANG-18 (new, MUST): keep `iter.Pull`'s `stop`. The dive's reading heuristic was upgraded to a watched goleak check (L12), which extends GO-CONC-11's trigger.
- GO-LANG-19 (new, SHOULD): `~T` for basic-kind constraint elements ([GI G11]).
- GO-LANG-20 (new, MUST float-capable): comparators go through `cmp.Compare` ([GI G5]); the grep was widened to `SortStableFunc`, `BinarySearchFunc` and `sort.Slice`.
- GO-LANG-21 (new, SHOULD): `comparable` instantiated with `any` panics at runtime ([GI G4]).
- GO-LANG-22 (new, MUST fleet config): `x/exp/constraints` becomes a package-scoped GO-MOD-08 entry. The dive's whole-`x/exp` deny was replaced to honour GO-MOD-08 (L13).
- GO-LANG-23 (new, MUST): no method type parameters below 1.27 or on interfaces. The dive's "preferred at ≥ 1.27" was weakened to "permitted", and the fact that a generic method never satisfies an interface was added (L14).
- GO-LANG-24, GO-LANG-25 (new, SHOULD, heuristics): generic-interface constraints and iterator naming.
- GO-LANG-26 (new, MUST SDK): `[]T` over `iter.Seq` for materialized collections. This settles M-A-05's "when" half.
- Verdict: point 2 extended (language floors are compile-enforced); point 5's iterator bullet now has a static check; points 9 (iterators) and 10 (generics, documented gaps) are new.
- Open questions: the `api/sdk-surface` iter.Seq question was removed (answered by GO-LANG-26). The gopls `yield` promotion was added to the per-minor re-check, and a gopls-scope owner default was added.
- Citation fix: bazel-gazelle's terminal `yield` is at `v2/pathtools/path.go:189`, not `pathtools/path.go:189`.

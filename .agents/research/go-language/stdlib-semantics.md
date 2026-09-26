---
title: "Go stdlib semantics — json/v2 default-on, map order, time, runes, rand"
topic: language/stdlib-semantics
agent: language/stdlib-semantics (wave 3)
model: sonnet
date_researched: 2026-09-26
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/stdlib-semantics/
scope: |
  Covers M-A-08 (rand v1 globals/Seed), M-A-09 (byte vs rune string slicing),
  M-A-10 (map iteration order into observable output), M-A-11 (time.Time ==
  and monotonic-reading survival), M-A-12 (large integers decoded into `any`),
  M-A-14 (json/v2 default-on in 1.27.1 — the P0 verdict), and M-A-15's
  remaining slice (stdlib `uuid` format/parse compatibility with
  `github.com/google/uuid`; the adoption-surface question is already settled
  as GO-MOD-09). Does NOT cover: the uuid adoption decision itself
  (GO-MOD-09), `go fix`/modernizers (`language/era-and-modernizers`), the SDK
  timeout/error shape (`api/sdk-surface`), or `strings.Cut`/`SplitSeq`
  (M-A-16, out of this brief's row list).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [json/v2 default-on in 1.27.1 — the P0 verdict](#1-jsonv2-default-on-in-1271--the-p0-verdict)
   2. [No GODEBUG restores v1 json behaviour; GOEXPERIMENT is build-wide, not go-line-scoped](#2-no-godebug-restores-v1-json-behaviour-goexperiment-is-build-wide-not-go-line-scoped)
   3. [omitempty vs omitzero on a nil vs empty-non-nil slice](#3-omitempty-vs-omitzero-on-a-nil-vs-empty-non-nil-slice)
   4. [MarshalIndent and HTML escaping are byte-identical under both settings](#4-marshalindent-and-html-escaping-are-byte-identical-under-both-settings)
   5. [Map iteration order — no linter, only `-count=5`](#5-map-iteration-order--no-linter-only--count5)
   6. [time.Time == and the monotonic reading](#6-timetime--and-the-monotonic-reading)
   7. [Large integers decoded into `any`](#7-large-integers-decoded-into-any)
   8. [Byte slicing vs rune slicing](#8-byte-slicing-vs-rune-slicing)
   9. [`rand.Seed` is a documented no-op; `math/rand/v2` has no global seed at all](#9-randseed-is-a-documented-no-op-mathrandv2-has-no-global-seed-at-all)
   10. [stdlib `uuid` ↔ `google/uuid` format and parse compatibility](#10-stdlib-uuid--googleuuid-format-and-parse-compatibility)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **The P0 is resolved: default jsonv2-backing in Go 1.27.1 changes zero bytes of v1 `encoding/json` output or behaviour.** Watched on a planted fixture: duplicate names, invalid UTF-8, case-mismatched fields, large-integer-into-`any`, `omitempty`/`omitzero` on nil and non-nil-empty slices, `MarshalIndent`, and HTML escaping are byte-for-byte identical under the 1.27.1 default and under `GOEXPERIMENT=nojsonv2`.
- A library whose `go` line admits 1.26 may run on a 1.27 toolchain with either JSON backend and needs no compatibility test matrix for `encoding/json` v1-API behaviour — pin one golden byte sequence, not two per leg.
- **No GODEBUG setting restores v1 json behaviour.** jsonv2 is a `GOEXPERIMENT`, set at build time for the whole binary, not a `godebug` line keyed to an importing module's `go` directive — the two mechanisms are different and do not compose the way `containermaxprocs` does.
- `GOEXPERIMENT=nojsonv2` is explicitly labelled by the Go team as "expected to be removed in a future release" — treat it as a temporary escape hatch, not a supported long-term pin.
- A struct's `json.Marshaler`/`json.Unmarshaler` methods (the pattern `google/go-github@48d0a668cde8` uses throughout, itself `go 1.26.0`) dispatch identically under both backends — custom `(Un)MarshalJSON` is not a special case.
- `omitempty` and `omitzero` are NOT interchangeable on a slice: `omitempty` drops both `nil` and `[]T{}`; `omitzero` drops only `nil` (a slice's zero value) and keeps `[]T{}` as `[]`. Getting this backwards on `Tags []string` silently changes envelope shape.
- **Map iteration order into any observable output has zero linter or vet coverage in any catalogue measured for this program.** `golangci-lint linters` (v2.14.0, all presets) and `staticcheck`/`gocritic` (enable-all) show nothing map-order-related; the only mechanical check is running the golden/snapshot test with `-count=5` (or higher) and watching it flip.
- The spec's own words are unconditional: "The iteration order over maps is not specified and is not guaranteed to be the same from one iteration to the next" ([go.dev/ref/spec §For statements](https://go.dev/ref/spec#For_statements)).
- `time.Time == time.Time` after a JSON round-trip is `false` even for the same instant — verified: a `time.Now()` value marshalled and unmarshalled through stock `encoding/json` no longer `==` the original, though `.Equal()` returns `true`. `.Round(0)` alone does not restore `==` either.
- A `time.Time` carrying a monotonic reading (any value from `time.Now()`) must never be a map key or compared with `==` against a value that lost or never had that reading (a JSON round-trip, a `Round(0)`, a value built with `time.Date`) — the lookup silently misses.
- Decoding JSON into `any`/`map[string]any` turns any integer, however it prints, into `float64`; above `2^53` (9007199254740992) precision is lost with **no error** — verified: `9007199254740993` round-trips as `9.007199254740992e+15`. `Decoder.UseNumber()` is the fix and is unaffected by the jsonv2 backend.
- Byte-indexing/slicing a UTF-8 string (`s[:n]`) truncates mid-rune with no error and no panic — verified: `"café-ñandú"[:4]` yields the 4-byte, invalid-UTF-8 string `"caf\xc3"`. `staticcheck`'s `SA6003` does **not** catch this (it flags `[]rune(s)` before a `range`, a different pattern); this stays a reading heuristic.
- `math/rand`'s package-level `Seed` has been a documented no-op since Go 1.20 and is flagged by `staticcheck SA1019` (and by `golangci-lint`'s `staticcheck` in the `standard` tier) — verified red on the call, green once removed. `math/rand/v2` has no package-level `Seed` function at all; determinism requires a local `*rand.Rand` built from a seeded source (`rand.New(rand.NewPCG(...))`).
- Stdlib `uuid` (new in 1.27, `google.golang.org` not required — it lives at `uuid` in `GOROOT/src`) and `github.com/google/uuid` v1.6.0 are fully format- and parse-compatible both directions — verified: stdlib `String()` output parses in `google/uuid`, `google/uuid`'s `String()`/`URN()`/braced forms all parse in stdlib `Parse`, and `Nil` renders identically. The adoption *decision* (when to drop `google/uuid`) is already settled as GO-MOD-09; this dive only confirms the wire format never diverges.

## Findings

### 1. json/v2 default-on in 1.27.1 — the P0 verdict

The topic map's conflict 14 left one question open: does default jsonv2-backing change any v1 `encoding/json` behaviour or byte output on Go 1.27? The go1.27 release notes state it directly: "The v1 API of `encoding/json` continues to be supported, backed by the v2 implementation. **Marshaling and unmarshaling behavior is preserved**, but the exact text of error messages may differ." ([go.dev/doc/go1.27 §encoding/json/v2](https://go.dev/doc/go1.27)). That is a claim about the whole v1 API surface, not a spot case — this dive verified it on the specific mutations a practitioner scout worried about.

Fixture `v1behavior/main.go` runs six cases through plain `encoding/json` (imported exactly as `"encoding/json"`, never `/v2`): duplicate object member names, invalid UTF-8 inside a JSON string, a case-mismatched struct field, a large integer decoded into `any`, a nil slice under `omitempty`, and `MarshalIndent` + HTML escaping of a struct shaped like the ocx envelope (`schema_version`, `command`, `exit_code`, `tags` — `go-audit/config-inventory.md` §3, `_results.py:299,330-357`). Run once under the 1.27.1 default and once under `GOEXPERIMENT=nojsonv2`:

```
$ go run .                                    # default: v1 API backed by v2
dup-names: err=<nil> m=map[a:2]
invalid-utf8: err=<nil> s="a�b" (bytes=[97 239 191 189 98])
case-mismatch: err=<nil> e={SchemaVersion:7 Command:x ExitCode:0 Tags:[]}
large-int-any: err=<nil> a=9.007199254740992e+15 (float64)
nil-slice-omitempty: {"schema_version":1,"command":"x","exit_code":0}
marshal-indent-html-escape: ... "a<b>&c" ...

$ GOEXPERIMENT=nojsonv2 go run .              # v1 implementation
dup-names: err=<nil> m=map[a:2]
invalid-utf8: err=<nil> s="a�b" (bytes=[97 239 191 189 98])
case-mismatch: err=<nil> e={SchemaVersion:7 Command:x ExitCode:0 Tags:[]}
large-int-any: err=<nil> a=9.007199254740992e+15 (float64)
nil-slice-omitempty: {"schema_version":1,"command":"x","exit_code":0}
marshal-indent-html-escape: ... "a<b>&c" ...
```

Every line is identical byte for byte (`diff` on the two captured outputs is empty). This directly falsifies the practitioner-sourced worry cited in map conflict 14 ("the v1 API inherited stricter defaults"): it did not — the *new* `encoding/json/v2` package and the `jsontext` package have stricter defaults (rejecting duplicate names and invalid UTF-8 by default — [pkg.go.dev/encoding/json/v2](https://pkg.go.dev/encoding/json/v2)), but nothing imports that package unless the code says `import "encoding/json/v2"` explicitly. The v1 import path's *behaviour* is what release notes promise and what this fixture confirms: unchanged.

**Verdict for the rule text:** a library whose `go` line admits 1.26 (the SDK's own floor, GO-MOD-01) may import plain `encoding/json` and run unmodified on both the 1.26 and 1.27 toolchain legs of its test matrix (GO-MOD-16) — one golden byte sequence for `encoding/json` v1-API output, not two. The one thing such a library must NOT do is `import "encoding/json/v2"` or `"encoding/json/jsontext"` directly — those packages compile fine on a `go 1.26` module built with a 1.27 toolchain (stdlib API availability is not gated by the `go` line, per the map's frame correction (d)) but are unavailable on a 1.26 toolchain, and their *default* behaviour genuinely differs from v1 (stricter UTF-8/duplicate-name rejection) — a real, separate hazard from the one this row asked about.

### 2. No GODEBUG restores v1 json behaviour; GOEXPERIMENT is build-wide, not go-line-scoped

The brief asked whether any `GODEBUG` setting keyed on the `go` line can restore v1 behaviour, the way `containermaxprocs`'s default follows the main module's `go` line (GO-MOD-09). It cannot, because jsonv2 is not a `GODEBUG` setting at all. [go.dev/doc/godebug](https://go.dev/doc/godebug) documents the two independent mechanisms: `GODEBUG` (settable via env var, a `godebug` block in `go.mod`/`go.work`, or a `//go:debug` source line, and capable of being keyed to `default=goN.M`) governs runtime-visible compatibility toggles; `GOEXPERIMENT` is a compiler/build-time-only flag baked into the toolchain build, set once for the whole compilation, with no per-module or `go`-line-scoped variant. `internal/buildcfg/exp.go`'s baseline (`JSONv2: true` at line 87, confirmed by reading it directly — see §Verification runs) is fixed at toolchain-build time; `go build`/`go test` do not consult the importing module's `go` directive to decide it.

Practical consequence: a library cannot protect its own consumers from jsonv2 by declaring a lower `go` line — the decision belongs entirely to whoever invokes the Go 1.27 toolchain (`GOEXPERIMENT=nojsonv2 go build ./...`), and it applies to the whole build, not to one dependency. Because §1 showed the v1-API output is unaffected anyway, this is not a live hazard today — but the go1.27 release notes explicitly warn the escape hatch itself is temporary: "This opt-out is expected to be removed in a future release" ([go.dev/doc/go1.27](https://go.dev/doc/go1.27)). See [Contested / evolving](#contested--evolving).

### 3. omitempty vs omitzero on a nil vs empty-non-nil slice

Fixture `omitzero/main.go` marshals two struct shapes — one tagged `omitempty`, one `omitzero` — each with a `nil` slice and each with a `[]string{}` (empty, non-nil) slice:

```
omitempty-nil:          {}
omitempty-empty-nonnil:  {}
omitzero-nil:           {}
omitzero-empty-nonnil:  {"tags":[]}
```

Identical under `GOEXPERIMENT=nojsonv2`. `omitempty` treats a slice as empty by `len() == 0` regardless of nilness — both cases drop the field. `omitzero` treats a slice as zero only when it is the type's literal zero value (`nil`) — a non-nil empty slice is kept and serialized as `[]`. An agent that mechanically swaps `omitempty` → `omitzero` (as `go fix`'s `omitzero` modernizer offers, GO-GATE-03) on a field that is sometimes constructed as `[]string{}` rather than left `nil` silently starts emitting `"tags":[]` where it used to emit nothing — an envelope-shape change a byte-golden test catches immediately (see §Verification runs).

### 4. MarshalIndent and HTML escaping are byte-identical under both settings

Same fixture (`v1behavior/main.go`), same envelope shape, with a value containing `<`, `>`, `&` (`"a<b>&c"`): both `json.MarshalIndent` and an explicit `Encoder.SetEscapeHTML(true)` produce `"a<b>&c"` under both the default and `nojsonv2` builds — HTML-escaping-by-default (a long-standing v1 `Marshal`/`MarshalIndent` behaviour, off only via `Encoder.SetEscapeHTML(false)`) is preserved unchanged. No golden-file diff exists between the two toolchain legs for this shape.

### 5. Map iteration order — no linter, only `-count=5`

The Go spec is unconditional: "The iteration order over maps is not specified and is not guaranteed to be the same from one iteration to the next. If a map entry that has not yet been reached is removed during iteration, the corresponding iteration value will not be produced." ([go.dev/ref/spec §For statements](https://go.dev/ref/spec#For_statements)). No analyzer catalogue measured for this program contains a check for "unsorted map range feeding an observable writer" — `golangci-lint linters` at 2.14.0 lists `decorder` (declaration order in source) and `funcorder` (function/method order in source), neither of which is about *runtime* map iteration; `staticcheck`/`gocritic` with every check enabled find nothing on the fixture below.

Fixture `maporder/golden_test.go` ranges over a 5-entry map and concatenates keys with no sort, comparing against a golden string captured from one run; the compliant twin (`golden_sorted_test.go`) ranges over `slices.Sorted(maps.Keys(m))` first. Run each with `-count=5` to force repeated fresh map allocation across the same process invocation (a single run can pass by chance):

```
$ go test -run TestGoldenUnsorted -count=5 -v .
--- PASS: TestGoldenUnsorted   (run 1)
--- FAIL: TestGoldenUnsorted   (run 2, 3, 4)   golden mismatch (-want +got)
FAIL   exit status 1

$ go test -run TestGoldenSorted -count=5 -v .
--- PASS ×5
ok
```

`-count=5` is not a magic number that guarantees a catch on every map size — small maps or maps with few buckets can coincidentally repeat an order — but it is the mechanism the map's own row (M-A-10) already named, and this dive confirms it actually flips on a realistic 5-key map without needing a larger N.

### 6. time.Time == and the monotonic reading

Fixture `timeequal/main.go`: take `t1 := time.Now()` (carries a monotonic reading per the `time.Time` doc comment), round-trip it through `encoding/json` (`Marshal` → RFC 3339 text → `Unmarshal`), and compare:

```
t1==t2 (VIOLATION check): false
t1.Equal(t2) (correct check): true
t1==t3 after Round(0): false; t1.Equal(t3): true
map-key lookup with round-tripped time found: false
```

`==` is false even though both values represent the same instant, because JSON marshalling drops the monotonic reading (there is no wire representation for it) and `time.Time`'s `==` operator compares the struct fields directly, including the monotonic component when present. `Equal` is defined to compare instants and is unaffected. `Round(0)` — the documented way to strip a monotonic reading — does not restore equality with a value that already lost it via a different path (JSON), because `Round(0)` and JSON-unmarshalling do not produce bit-identical wall-clock representations. The map-key case is the sharpest failure mode: `m[t1] = "orig"` followed by a lookup with the round-tripped `t2` **misses entirely** — a silent cache/dedup bug, not a crash. No analyzer catches this: `gocritic` with `enable-all: true` finds 0 issues on the fixture; this stays [go.dev's own written guidance](https://pkg.go.dev/time#Time) plus a reading heuristic.

### 7. Large integers decoded into `any`

Fixture `usenumber/main.go` decodes `{"id": 9007199254740993}` (`2^53 + 1`) twice: once into a plain `any`, once via `json.NewDecoder(...).UseNumber()`:

```
VIOLATION plain any:   id=9.007199254740992e+15 (float64)
CORRECT UseNumber:     id=9007199254740993 (json.Number) Int64=9007199254740993
```

Identical under `GOEXPERIMENT=nojsonv2`. `float64` has 53 bits of mantissa; any JSON integer literal above `2^53` silently loses precision with **no error returned** the moment it lands in `any`/`interface{}` (this is exactly [100 Go Mistakes #77](https://100go.co/) territory — decoding into a loosely-typed value hides a real data-loss bug). `Decoder.UseNumber()` (or a typed struct field of `int64`/`json.Number`) is the fix, and the fix is unaffected by the jsonv2 backend change. This matters directly for the SDK: any envelope field that can carry a large numeric ID (exit codes are small and safe; anything ocx might add resembling a hash, timestamp-in-nanoseconds, or content-addressed numeric ID is not) must be a typed integer field, never decoded through `any`.

### 8. Byte slicing vs rune slicing

Fixture `runeslice/main.go`:

```
len(name)=13 (bytes)                       // "café-ñandú"
utf8.RuneCountInString=10 (runes)
VIOLATION name[:4]="caf\xc3" (valid=false) // truncated mid-rune, no panic, no error
CORRECT string([]rune(name)[:4])="café"
```

The spec is explicit that string indexing/slicing operates on bytes: "A string's bytes can be accessed by integer indices 0 through `len(s)-1`" ([go.dev/ref/spec §String types](https://go.dev/ref/spec)) — there is no rune-aware slice operator. `staticcheck SA6003` ("Converting a string to a slice of runes before ranging over it") does **not** fire on this fixture (checked explicitly with `-checks=SA6003`, 0 issues both as part of the default set and explicitly selected) — it is a *performance* check about a different pattern (`for i, r := range []rune(s)` when plain `range s` already yields runes), not a correctness check about byte-index slicing. Nothing in the golangci-lint 2.14.0 catalogue targets this failure mode either. This is a pure reading heuristic: any `s[:n]`/`s[n:]`/`s[a:b]` on a string whose content is not guaranteed ASCII (user input, OCI/registry names, file paths from untrusted sources) needs `utf8.RuneCountInString` + `[]rune` conversion, or `strings.Cut`/`unicode/utf8` helpers, instead of a byte index.

### 9. rand.Seed is a documented no-op; math/rand/v2 has no global seed at all

Fixture `randseed/main.go` calls package-level `rand.Seed(42)` twice with an `Intn` in between and shows the two draws differ (proving `Seed` did nothing), then shows `math/rand/v2`'s local, explicitly-seeded `*rand.Rand` (`rand.New(rand.NewPCG(1, 2))`) producing identical draws from two independently constructed generators with the same seed:

```
v1 rand.Seed(42) twice, Intn differs despite same seed: a=417327 b=428896 equal=false
v2 seeded *rand.Rand: c=769373 d=769373 equal=true
```

`staticcheck` (standalone, and as `golangci-lint`'s `staticcheck` in the `standard` linter tier) flags every `rand.Seed` call: `SA1019: math/rand.Seed has been deprecated since Go 1.20 ... use New(NewSource(seed)) to obtain a local random generator.` — this row already has full analyzer coverage; it does not need a bespoke check. `math/rand/v2` removed the top-level `Seed` function entirely — there is no equivalent call to warn about; a v2-only program that wants determinism has no global-seed footgun available at all, only the deliberate local-generator pattern.

### 10. stdlib uuid ↔ google/uuid format and parse compatibility

The stdlib `uuid` package (new in 1.27, `$GOROOT/src/uuid/uuid.go`, [go.dev's `uuid` docs](https://pkg.go.dev/uuid) once published) documents `Parse` accepting four textual forms: canonical hyphenated, braced, `urn:uuid:` prefixed, and bare 32-hex-digit ([source read, `uuid.go:33-44`]). Fixture `uuidcompat/main.go` (adding `github.com/google/uuid@v1.6.0` as a real module dependency) round-trips both directions:

```
stdlib->google: str=09974389-9ace-49bd-b676-fda55f2ce38a parseErr=<nil> roundtrip-equal-str=true
google->stdlib: str=a6d13f8b-ab00-4802-bc68-338252d3e2ee parseErr=<nil> roundtrip-equal-str=true
stdlib Nil=00000000-0000-0000-0000-000000000000 google Nil=00000000-0000-0000-0000-000000000000 equal=true
stdlib parses google URN form: err=<nil>
stdlib parses braced form: err=<nil>
google parses stdlib plain-hex form: err=<nil>
```

Both implementations produce and accept the same canonical lowercase-hyphenated form, and each accepts the other's alternate forms (braces, `urn:uuid:`, bare hex). `Nil` renders identically. This closes the M-A-15 slice this brief owns: there is no wire-format compatibility hazard in migrating `String()`/`Parse()` call sites from `google/uuid` to stdlib `uuid` at go ≥1.27 — the only hazard (already settled as GO-MOD-09) is the narrower *method surface* (`NewV6`, `NewMD5`, `NewSHA1`, DCE family absent from stdlib).

## Normative guidance candidates

1. **A library whose `go` line admits 1.26 may import plain `encoding/json` on a 1.27 toolchain with no v1-API compatibility test matrix; it must never import `encoding/json/v2` or `encoding/json/jsontext` directly while that floor stands.** Rationale: §1 proved v1-API behaviour and output are byte-identical across both JSON backends; the v2 packages' own defaults (strict UTF-8, no duplicate names) are a real, different behaviour a `go 1.26`-declaring library cannot assume its consumers' toolchains provide consistently and should not opt into by name. Verify: `grep -rln --include='*.go' -e 'encoding/json/v2' -e 'encoding/json/jsontext' .` in a `go 1.26.x`-or-lower module must be empty (empty output = pass). RUN: yes, watched red by adding the import to `v1behavior/main.go` (grep finds the line) and green after removing it — fixture `v1behavior/`.

2. **A golden or snapshot test asserting v1 `encoding/json` byte output needs exactly one fixture, not one per Go toolchain leg.** Rationale: §1's diff between the 1.27.1 default and `GOEXPERIMENT=nojsonv2` was empty on duplicate names, invalid UTF-8, case-mismatch, large-int-into-`any`, `omitempty`, `MarshalIndent`, and HTML escaping. Verify: run the golden test once under the default toolchain and once with `GOEXPERIMENT=nojsonv2` set, `diff` the two captured outputs — empty diff is the expected, passing state. RUN: yes — fixture `v1behavior/`, both commands in Verification runs, diff is empty.

3. **Never treat `omitempty`→`omitzero` as an interchangeable rename on a slice or map field; re-verify golden output whenever a field's construction sometimes produces a non-nil empty collection.** Rationale: §3 measured `omitempty` dropping both `nil` and `[]T{}`, `omitzero` dropping only `nil` and keeping `[]T{}` as `[]` — a `go fix omitzero`-style rewrite silently changes wire shape for any field ever constructed as `[]T{}`. Verify: a byte-golden test over both a `nil`- and an empty-non-nil-constructed instance of the struct, run before and after the tag change. RUN: yes — fixture `omitzero/`, both cases shown in Verification runs.

4. **Any `range` over a `map` whose loop body writes to an observable sink (a `Writer`, a hash, a golden file, a struct field later marshalled) must range over `slices.Sorted(maps.Keys(m))` (or an equivalent explicit sort), never the map directly.** Rationale: §5 and the spec quote — map iteration order is unspecified and unstable within one process across repeated fresh allocations. Verify: `go test -run <GoldenTest> -count=5 -v .` on the specific golden/snapshot test; a flip between PASS and FAIL across the 5 runs is the violation signal, a steady 5/5 PASS is compliant. No linter in the golangci-lint 2.14.0 or staticcheck catalogues covers this (checked: `golangci-lint linters` grep for map/order-related names returns only `decorder`/`funcorder`, both about source declaration order, not runtime iteration). RUN: yes — fixture `maporder/`, violation FAILs on runs 2-4 of 5, compliant twin PASSes 5/5.

5. **Never compare two `time.Time` values with `==`, and never use a `time.Time` that may carry a monotonic reading as a map key unless every value entering that map went through the same normalization (all `.Round(0)`'d, or all round-tripped through the same serialization) — use `.Equal()` for comparison and a normalized value (e.g. `.UTC().Round(0)` or a `.Unix()`/`.UnixNano()` int64) as the map key.** Rationale: §6 measured `t1 == t2` as `false` after a JSON round-trip of the same instant, and a map-key lookup with the round-tripped value missing entirely — a silent correctness bug, not a crash. Verify: no analyzer catches it (`gocritic` with every check enabled, 0 issues on the fixture) — reading heuristic: grep for `time.Time` fields used as map keys or compared with `==` (`grep -rn --include='*.go' -e '== t\.' -e 'map\[time\.Time\]' .`, read every hit). RUN: partially — the failure mode itself was watched (fixture `timeequal/`); the grep is a reading aid, not a verified-red-on-fixture linter, because `time.Time ==` is syntactically indistinguishable from any other struct `==` without type information a plain grep lacks — flag as reading heuristic only, not a MUST-backing check.

6. **Any JSON field that may carry an integer above `2^53` (≈9.007×10^15) must decode into a typed integer, `int64`, or `json.Number` (via `Decoder.UseNumber()`) — never into `any`/`interface{}`/`map[string]any`.** Rationale: §7 measured silent precision loss with no error: `9007199254740993` becomes `9.007199254740992e+15` with `err == nil`. Verify: reading heuristic — grep for `Unmarshal` targets typed as `any`/`interface{}` or `map[string]interface{}` where the source JSON is not fully under the program's own control (`grep -rn --include='*.go' -e 'var .* any' -e 'map\[string\]interface{}' -e 'map\[string\]any' .`, then read each unmarshal call site for a large-integer-bearing field). RUN: yes for the failure mode (fixture `usenumber/`, both cases shown); the grep itself is a reading aid, no analyzer distinguishes "safe" from "unsafe" `any` targets, so this stays a SHOULD/reading-heuristic row, not a MUST-backing lint.

7. **Slice or index a string by rune position, never by byte position, unless the content is provably ASCII-only.** Rationale: §8 measured `name[:4]` on a 10-rune, 13-byte string producing a 4-byte truncated, invalid-UTF-8 result with no panic or error. Verify: no catalogued analyzer fires (`staticcheck SA6003` checked explicitly and does not apply — it targets a different, performance-only pattern). Reading heuristic: `grep -rn --include='*.go' -E '\[:[0-9]+\]|\[[0-9]+:\]' .` on any string known or suspected to carry non-ASCII content (user input, registry/OCI names, file paths), then read each hit for whether the bound is a byte or rune count. RUN: yes for the failure mode (fixture `runeslice/`); the grep is a broad reading aid only (it also matches slice-of-`[]byte` and slice-of-`[]T`, which are not violations) — SHOULD/reading-heuristic, not MUST-backing.

8. **Never call package-level `math/rand.Seed`; for any new code needing determinism, use `math/rand/v2`'s `rand.New(rand.NewPCG(seed1, seed2))` (or `rand.NewChaCha8`) and pass that generator explicitly.** Rationale: §9 measured `rand.Seed` having zero effect on subsequent `Intn` draws — a silent no-op since Go 1.20 — while a locally seeded `*rand/v2.Rand` reproduces draws exactly. Verify: `staticcheck -checks=SA1019 .` (bare tool) or `golangci-lint run` with `staticcheck` enabled (in golangci-lint's `standard` tier by default at 2.14.0) — both flag every `rand.Seed` call by name. RUN: yes — fixture `randseed/`: `staticcheck` and `golangci-lint run` (with a minimal `.golangci.yml` enabling `staticcheck`) both exit 1 with an `SA1019` finding on the violation and exit 0 on the compliant `randseed_compliant/` twin.

9. **`String()`/`Parse()` wire format is interchangeable between stdlib `uuid` (go ≥1.27) and `github.com/google/uuid`; the migration decision is a method-surface question (GO-MOD-09), never a format-compatibility one.** Rationale: §10 round-tripped both directions including alternate textual forms (braced, URN, bare hex) with zero parse errors and identical `Nil` rendering. Verify: none needed as a MUST — this is informational, closing an open question, not a new checkable rule; GO-MOD-09 already carries the adoption check (`go list -m -f '{{.GoVersion}}'` before flagging a `google/uuid` import as superseded). RUN: yes — fixture `uuidcompat/`, all six round-trip/format checks passed.

## Verification runs

All commands run through `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, `GOTOOLCHAIN=local`, golangci-lint 2.14.0), from inside each fixture's own directory under `/home/mherwig/.cache/research-lang/go-tools/fixtures/stdlib-semantics/`.

| # | Fixture | Command | Exit (violation) | Exit (twin/fix) | Relevant output |
|---|---|---|---|---|---|
| 1 | `v1behavior/` | `go run .` (default) vs `GOEXPERIMENT=nojsonv2 go run .` | 0 / 0 | n/a — both are "compliant"; the check is the diff | `diff` of the two captured stdouts is **empty** — see §1 for both full outputs |
| 2 | `omitzero/` | `go run .` (default) vs `GOEXPERIMENT=nojsonv2 go run .` | 0 / 0 | n/a | `omitempty-nil: {}`, `omitempty-empty-nonnil: {}`, `omitzero-nil: {}`, `omitzero-empty-nonnil: {"tags":[]}` — identical both runs |
| 3 | `maporder/` (violation: `golden_test.go`) | `go test -run TestGoldenUnsorted -count=5 -v .` | 1 | — | 1 PASS, 3 FAIL out of 5 runs; `golden mismatch (-want +got): -alphabetagammadeltaepsilon +epsilonalphabetagammadelta` (and two other orderings) |
| 3b | `maporder/` (twin: `golden_sorted_test.go`) | `go test -run TestGoldenSorted -count=5 -v .` | — | 0 | 5/5 `PASS`, identical `alphabetadeltaepsilongamma` every run |
| 4 | `timeequal/` | `go run .` | 0 (no crash; the point is the wrong boolean) | — | `t1==t2 (VIOLATION check): false`; `t1.Equal(t2) (correct check): true`; `map-key lookup ... found: false` |
| 5 | `usenumber/` | `go run .` (default and `nojsonv2`) | 0 / 0 | 0 / 0 | `VIOLATION plain any: id=9.007199254740992e+15 (float64)`; `CORRECT UseNumber: id=9007199254740993 (json.Number)` — identical under both backends |
| 6 | `runeslice/` | `go run .`; `staticcheck ./...`; `staticcheck -checks=SA6003 ./...` | 0 (run); 0; 0 | — | `VIOLATION name[:4]="caf\xc3" (valid=false)`; staticcheck: **0 issues** both times — confirms no analyzer coverage |
| 7 | `randseed/` (violation) | `staticcheck ./...` | 1 | — | `SA1019: math/rand.Seed has been deprecated since Go 1.20 ...` ×2 |
| 7b | `randseed/` (violation, via golangci-lint) | `golangci-lint run ./...` (`.golangci.yml`: `linters.enable: [staticcheck]`) | 1 | — | same `SA1019` finding, reported as `(staticcheck)`; `2 issues: * staticcheck: 2` |
| 7c | `randseed_compliant/` (twin) | `staticcheck ./...`; `golangci-lint run ./...` | — | 0 / 0 | `0 issues.` |
| 8 | `uuidcompat/` | `go run .` | 0 | — | all six round-trip/format lines shown in §10, all successful |
| 9 | `timeequal/` (gocritic coverage check) | `golangci-lint run ./...` (`.golangci.yml`: `gocritic` with `enable-all: true`) | 0 | — | `0 issues.` — confirms `==` on `time.Time` is not caught by any gocritic check, even with every check enabled |
| 10 | `maporder/`, `runeslice/` | `golangci-lint linters` (list only) | n/a | n/a | grep for `map`/`order`/`time` in the output finds only `decorder`, `funcorder`, `godoclint` — none address runtime map order or `time.Time ==` |

**Not run as a fixture, verified by direct source/doc read instead:**
- `internal/buildcfg/exp.go:87` — `JSONv2: true` in the baseline `goexperiment.Flags` struct literal, read directly from `$(run.sh go env GOROOT)/src/internal/buildcfg/exp.go`.
- `encoding/json/decode.go:8` carries `//go:build !goexperiment.jsonv2`; `encoding/json/v2_decode.go:5` and `encoding/json/v2/doc.go:5` carry `//go:build goexperiment.jsonv2` — confirmed by `sed`-reading each file's build-tag line directly.
- `$GOROOT/src/uuid/uuid.go:33-56` — `Parse`'s doc comment listing the four accepted textual forms, read directly.
- No `GODEBUG` setting for json/jsonv2 exists — confirmed by `grep -n "jsonv2\|json" "$GOROOT/doc/godebug.md"` returning only an unrelated `go test -json` hit (`gotestjsonbuildtext`), and by reading [go.dev/doc/godebug](https://go.dev/doc/godebug) directly.

## Exemplar evidence

- **`google/go-github@48d0a668cde8:go.mod:3`** declares `go 1.26.0` — exactly the SDK's own floor scenario this dive tests. Its `github/timestamp.go:35-46` implements `UnmarshalJSON`/`MarshalJSON` (the `json.Unmarshaler`/`json.Marshaler` interfaces) with hand-written RFC 3339/Unix-epoch parsing; `github/projects.go:168,206,911,944` and `github/copilot.go:43,429` show further custom `(Un)MarshalJSON` pairs. Because §1 proved v1-API behaviour is byte-identical across both JSON backends, and interface-method dispatch (`Marshaler`/`Unmarshaler`) is part of that unchanged v1 API, every one of these custom methods behaves identically whether the consuming binary is built with the 1.27.1 default or `GOEXPERIMENT=nojsonv2` — **satisfies** candidate 1/2 without any code change needed in that exemplar.
- **No exemplar imports `encoding/json/v2` or `encoding/json/jsontext` directly** — a corpus-wide `grep -rl` for those import paths across all 35 clones (excluding `vendor`/`testdata`) returns nothing, meaning candidate 1 currently has zero real-world violations to point to; it is a forward-looking guard, not a backfill list.
- **Map-order hazards**: the map-topic-map's own M-A-10 justification already cites "a `range` over a map feeding a writer without `slices.Sorted(maps.Keys(m))`" as the reading heuristic ([go-topic-map.md:526](../go-topic-map.md)); this dive adds the runnable check (`-count=5`) behind that heuristic rather than a new exemplar count.
- **google/uuid as a direct dependency**: 9/35 exemplar roots depend on `github.com/google/uuid` per [modrel §2](../go-audit/exemplar-modules-and-release.md), all written before stdlib `uuid` existed (1.27) — none is yet a *violation* of candidate 9 (which is informational, not a MUST), consistent with GO-MOD-09's own framing that adoption is prospective, not retroactive.
- **rand.Seed**: [shape §3](../go-audit/exemplar-code-shape.md) already measured 8 corpus-wide call sites to `rand.Seed`; this dive did not re-measure the corpus (the map's own M-A-08 justification already names the count) and instead supplied the runnable staticcheck/golangci-lint proof that those 8 sites are mechanically detectable, which the map's row left as a bare count.

## AI-agent angle

- **An agent asked to "handle the JSON compatibility risk of Go 1.27" invents a compatibility shim, a build-tag split, or a defensive `GOEXPERIMENT` pin in CI — none of which is needed.** The smallest mechanical check: run the golden test twice (default, then `GOEXPERIMENT=nojsonv2`) and diff; an agent that proposes code changes without first running this comparison is solving a problem this dive shows does not exist for the v1 API.
- **An agent renames `omitempty` to `omitzero` in bulk (mirroring `go fix`'s `omitzero` modernizer) without checking whether any tagged field is ever constructed as a non-nil empty slice/map.** The check: a byte-golden diff before/after the tag change, specifically constructing the field both as `nil` and as `T{}` in the test — a plain "does it still compile" check misses this entirely, since both tags compile fine and only the *output bytes* differ.
- **An agent decodes an unknown or partially-known JSON envelope into `map[string]interface{}`/`any` "to be safe" and then reads a numeric field back out** — this is the single most common LLM pattern for "flexible" JSON handling, and it is exactly the pattern that silently truncates any integer above `2^53`. The check: grep for `any`/`map[string]interface{}` unmarshal targets, then require either a typed struct field or `Decoder.UseNumber()` wherever the source is not fully controlled by the same program.
- **An agent slices a string with `s[:n]` to truncate for display, a log line, or a fixed-width field, treating Go strings as if indexing were rune-aware (a common carry-over from Python or from not having hit non-ASCII input in testing).** The check: any fixed-index slice on a string that is or could be non-ASCII (usernames, registry names, file paths, error messages containing user data) needs a `grep` sweep and a rune-based rewrite; a fuzz or property test seeded with multi-byte UTF-8 input (e.g. `"café-ñandú"`, an emoji, CJK text) turns this from "never seen it fail" into "fails immediately."
- **An agent "fixes" nondeterministic test output by hardcoding the observed map-iteration order into the golden file once, rather than sorting the map before writing.** This is the single most likely wrong fix an agent produces after a flaky-test bug report, because it makes the *reported* symptom (one CI failure) go away while leaving the root cause (unsorted map feeding output) intact — the very next Go point release, GC change, or even a different run can flip the order again. The check: `-count=5` (or a CI matrix of `GOARCH`, since map iteration order is also seed/architecture-sensitive) run against the *fix*, not just the original failure — an agent that only re-ran the failing test once after hardcoding a new golden value will see it pass and stop, while `-count=5` on the "fixed" golden still flips.
- **An agent calls `rand.Seed(seed)` because that is the memorized pre-1.20 idiom for a reproducible test or fuzz corpus.** The check is already fully mechanical and requires no bespoke tooling: `staticcheck`/`golangci-lint`'s bundled staticcheck flags every call by name (`SA1019`) with the exact fix in the message text (`use New(NewSource(seed))`) — an agent's CI is never silently wrong here if the standard gate runs at all; the risk is only in an ungated script or a one-off `go run` outside CI.
- **An agent invents a stdlib `uuid` method by pattern-matching `google/uuid`'s API surface** (`uuid.NewSHA1`, `uuid.Validate`, `uuid.MustNewV4`) that does not exist in the narrower stdlib package — already the subject of GO-MOD-09's own check (`go build ./...` fails immediately on the invented symbol); this dive's contribution is confirming that *when the method does exist* (`New`, `NewV4`, `NewV7`, `Parse`, `MustParse`, `String`, `Compare`), the wire format an agent produces or consumes is never the problem — only the method name is.

## Contested / evolving

- **`GOEXPERIMENT=nojsonv2` is a temporary escape hatch, not a durable compatibility pin.** The go1.27 release notes state the opt-out "is expected to be removed in a future release" ([go.dev/doc/go1.27](https://go.dev/doc/go1.27)). As of 2026-09-26 this dive found no announced removal version. Trend: the v1 *API* (import path `encoding/json`) is stated to remain supported indefinitely, backed by v2 — only the *ability to force the old v1 implementation via GOEXPERIMENT* is scheduled to go away. Re-check at each `go-upgrade` cycle (owned by `language/era-and-modernizers`).
- **The v2 packages (`encoding/json/v2`, `encoding/json/jsontext`) are the actively evolving surface, not the settled one.** The go1.27 notes list several removals relative to the earlier 1.25/1.26 experimental shape (`format` tag option removed, `unknown` tag option removed, `DiscardUnknownMembers` removed, `SkipFunc` removed, `inline` renamed to `embed`, `MatchCaseInsensitiveNames` behaviour updated) — a v2-adopting codebase written against 1.25/1.26's experimental API needs a re-read at every minor release, not a one-time port. This dive did not test the v2 packages' own behaviour (out of scope — no exemplar or fleet consumer imports them; see Exemplar evidence), only whether their existence changes v1's.
- **Map iteration order stability across a single test run is a statistical, not a guaranteed, check.** `-count=5` flipped on a 5-key `map[string]int` in this dive's fixture, but a smaller map (1-2 keys) or one whose hash happens to collide with insertion order across a given `GOMAXPROCS`/architecture combination could pass 5/5 by chance and still be a genuine violation. No source read during this dive found a Go-team-stated minimum N; treat `-count=5` as the map's own named floor (M-A-10), not as a formally derived sufficient bound.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Official Go 1.27 release notes | 2026-08 (1.27.0) | Primary source for "v1 API behaviour preserved" claim and the `GOEXPERIMENT=nojsonv2` opt-out/removal warning — the single most load-bearing citation in this dive |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | Official Go 1.25 release notes | 2025 | Confirms jsonv2 started as an opt-in `GOEXPERIMENT=jsonv2` experiment in 1.25, before becoming default-on in 1.27 — dates the default-on transition |
| [go.dev/blog/jsonv2-exp](https://go.dev/blog/jsonv2-exp) | Official Go blog post announcing the json/v2 experiment | 2025 | Names the specific v1-vs-v2 behavioural differences (duplicate names, invalid UTF-8, case sensitivity, nil-slice marshalling) that this dive's fixture set targets |
| [pkg.go.dev/encoding/json/v2](https://pkg.go.dev/encoding/json/v2) | Package reference documentation | current (2026-09) | Documents the exact v1-compatibility options (`AllowDuplicateNames`, `AllowInvalidUTF8`, `MatchCaseInsensitiveNames`) that exist only in the new package, confirming they are opt-in additions, not v1-API changes |
| [go.dev/ref/spec](https://go.dev/ref/spec) | The Go Programming Language Specification | current (2026-09) | Primary, unconditional source for "the iteration order over maps is not specified" and for string indexing/slicing operating on bytes, not runes |
| [go.dev/doc/godebug](https://go.dev/doc/godebug) | Official GODEBUG history and mechanism documentation | current (2026-09) | Establishes there is no `GODEBUG` setting for json/jsonv2, and clarifies `GODEBUG` (runtime, go-line-keyable) vs `GOEXPERIMENT` (build-time, not go-line-keyed) are distinct mechanisms |
| [pkg.go.dev/time#Time](https://pkg.go.dev/time#Time) | `time.Time` package documentation | current (2026-09) | States the monotonic-reading behaviour and the `Equal`-vs-`==` distinction this dive verified empirically |
| [100go.co](https://100go.co/) | "100 Go Mistakes and How to Avoid Them" companion site (Teiva Harsanyi) | ongoing, book pub. 2022 | #36/#37 (rune vs byte confusion), #77 (JSON-into-`any` precision loss) — practitioner-level framing of the exact failure modes this dive planted and watched fail |
| `go1.27.1:src/internal/buildcfg/exp.go` | Go toolchain source, read directly via `run.sh go env GOROOT` | shipped with Go 1.27.1 (installed 2026-09-26) | Line 87, `JSONv2: true` in the baseline experiment struct — the primary-source confirmation that jsonv2 is default-on, not merely documented as such |
| `go1.27.1:src/encoding/json/decode.go`, `v2_decode.go`, `encoding/json/v2/doc.go` | Go toolchain source, read directly | shipped with Go 1.27.1 | The `//go:build (!)goexperiment.jsonv2` tags that mechanically prove the v1 import path selects an implementation file based on the experiment flag, confirming the "backed by v2" architecture |
| `go1.27.1:src/uuid/uuid.go` | Go toolchain source, read directly | shipped with Go 1.27.1 | `Parse`'s doc comment (lines 33-44) listing the four accepted textual UUID forms, used to design the format-compatibility fixture against `google/uuid` |
| [pkg.go.dev/math/rand/v2](https://pkg.go.dev/math/rand/v2) | Package reference documentation | current (2026-09) | Confirms `math/rand/v2` has no package-level `Seed` function, and documents `rand.New`/`NewPCG`/`NewChaCha8` as the deterministic-generator pattern |
| `staticcheck` tool output (`SA1019`, `SA6003`) | Direct tool run, `run.sh staticcheck ./...` and `-checks=SA6003` | staticcheck 2026.2.1 (bundled with golangci-lint 2.14.0) | Primary evidence for what IS and is NOT mechanically caught: `SA1019` catches `rand.Seed`; `SA6003` does not catch byte-vs-rune string slicing (a targeted disambiguation this dive needed to settle candidate 7's classification) |


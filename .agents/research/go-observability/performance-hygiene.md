---
title: "Go performance hygiene — benchmarks, allocation evidence, PGO (revision dive)"
topic: go-observability/performance-hygiene
agent: performance-hygiene-dive
model: sonnet
date_researched: 2026-09-26
sources_count: 19
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/performance-hygiene/
scope: |
  Revision of go-observability.md (GO-OBS), holding GO-OBS-01..14 stable and continuing the
  sequence at GO-OBS-15. Covers the map's deferred M-J-07 (PGO) and M-J-09 (allocation hygiene),
  promoted by the orchestrator's self-direction sweep. Cites GO-TEST-19/20 (b.Loop, benchstat) and
  GO-GATE (linter config) rather than restating them. Does not cover M-J-10/11/12 (Prometheus
  metrics, OpenTelemetry, GOEXPERIMENT/tracebacklabels drift) — still deferred per the map — nor
  GOGC/GOMEMLIMIT scope (GO-OBS-09, unchanged).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- No fleet performance claim ships without a `benchstat old.txt new.txt` table at `-count=10`; a
  single `ns/op` number is not evidence (GO-TEST-20, restated as the umbrella rule this file's
  fixtures back with numbers).
- `perfsprint`'s `%d`/`%s`-single-verb Sprintf check is real signal — verified `+96.51%` faster,
  zero-alloc — but it does **not** catch multi-verb `Sprintf("%s%s", a, b)` string concatenation,
  which was independently `+67.80%` faster rewritten by hand; do not treat a clean perfsprint run
  as "no Sprintf-in-a-loop problems remain."
- `prealloc` is noise-leaning in practice: re-measured at 7/23 golangci-lint configs enabled, and
  31 hits across 8 exemplar repos (≈2.5/10k LOC), of which the overwhelming majority are test
  fixture setup or one-time CLI flag/alias slices, not hot loops — hand-read every hit, do not gate
  a build on it.
- `sync.Pool` on a small, non-escaping struct measured **17x slower** (+1634%, p=0.000, n=10) than
  a bare allocation with **zero allocation difference either way** — the pool's own Get/Put
  bookkeeping is the entire cost, because escape analysis already kept the plain version off the
  heap.
- `sync.Pool` on a 64KiB scratch buffer that genuinely escapes (passed through an `io.Writer`
  interface call) measured **56.55% faster** and cut `1 alloc/65536 B` to `0 allocs/~0 B` — the
  doc's own "amortize allocation overhead," verified.
- As of Go 1.26, the compiler stack-allocates far more non-escaping slices than before (the "Go
  1.26 stack-allocated slices" optimization) — a buffer must actually escape (interface call,
  return value, stored reference) for `sync.Pool` to have anything to amortize; size alone no
  longer forces heap allocation.
- `go build -gcflags=-m` is the fixture-verified way to settle "does this allocate": a function
  returning `&localValue` escapes; the same function returning the value itself does not; an `int`
  converted `to any` escapes because the interface conversion boxes it.
- PGO (`default.pgo`) auto-applies with **no flag** (`-pgo=auto` is the default since Go 1.21) when
  the file sits in the main package's directory; `go build -x` confirms it via
  `build\t-pgo=<path>/default.pgo` in the embedded build info.
- PGO changes the compiled binary (verified: differing SHA-256) even on a trivial CLI, but is not
  guaranteed to make a small, already-simple program faster — measured **+6.83% slower**
  (p=0.000, n=10) on a tiny synthetic dispatcher, the opposite of the 2-14% Go-team figures for
  representative production workloads; PGO is not a free win, it is a bet on profile
  representativeness.
- 0 of 35 exemplar repos commit a real `default.pgo` (the one hit is Bazel gazelle *testdata*, not
  production use) — PGO adoption in the wild that this corpus can see is nil, consistent with
  `go-audit/exemplar-modules-and-release.md`'s "not measured" note, now measured.
- PGO applies to the whole program, including the standard library and every dependency rebuilt
  for that binary — it is a build-time, per-binary artifact, never a library concern; a `-pgo` path
  passed to `go build ./cmd/a ./cmd/b` applies the same profile to both, which the Go docs call out
  as usually wrong.
- 14 of 35 exemplar repos use `sync.Pool` in production (non-test, non-vendor) code, from 1 file
  (trivy, restic, zap, golang/tools — though the golang/tools hit is analyzer *testdata*, not real
  use, correcting it to 13/35) up to 28 (cockroachdb/pebble, a storage engine) and 19
  (tailscale/tailscale); every sampled site pools byte buffers or a generic reusable-object
  wrapper, never a small fixed-size struct.
- `testing.AllocsPerRun(n, f)` is a real, watched allocation-regression gate: it failed loudly
  (10 allocs/op against a `<=1` budget) the moment a `strings.Builder`-based join was replaced by
  naive `+=` concatenation, and passed clean on the compliant version.
- `go tool pprof -top`/`-list` finds a CPU hotspot; `runtime/trace.FlightRecorder` (Go 1.25) is for
  a stall that leaves no CPU sample — this is GO-OBS-13, cited not restated.
- Green Tea GC is default-on since Go 1.26 (confirmed in `go1.27.1:src/internal/buildcfg/exp.go:86`,
  `GreenTeaGC: true`), advertised 10-40% GC-CPU reduction; its `GOEXPERIMENT=nogreenteagc` opt-out
  was predicted removed by 1.27 in the 1.26 release notes but **is still accepted** by the 1.27.1
  toolchain (verified: builds exit 0), an unfulfilled deprecation to flag, not assume.
- `encoding/json/v2` (GO-LANG-11) and `SizeSpecializedMalloc` (new small-alloc fast path, ~30%
  cheaper allocations <80 bytes) are also default-on flags in the same struct literal
  (`exp.go:82-88`) — a stale `GOEXPERIMENT=nojsonv2` or `nosizespecializedmalloc` pin in CI or a
  Dockerfile silently reverts a shipped default, the M-J-12 concern this file does not otherwise
  cover.
- Dave Cheney's rule of three optimizations — "do less, do it less often, do it faster," in that
  order of expected payoff — is the reading heuristic behind "no PGO/pooling/preallocation before a
  profile names the function," because agents default to rung 3 (micro-optimize) and skip 1 and 2.
- These prealloc/perfsprint enablement numbers (7/23, 5/23) and the noise classification are a
  cross-family note for `gates/config-assembly` (GO-GATE): this file does not edit `go-gates.md`.

## Findings

### 1. `perfsprint` catches the single-verb case, misses concatenation

`perfsprint` (golangci-lint linter, [catenacyber/perfsprint](https://github.com/catenacyber/perfsprint))
checks six patterns: integer format (`%d` → `strconv.Itoa`), error format (`fmt.Errorf` → `errors.New`),
string format (`%s` single-arg → the value or `hex.EncodeToString`/`strconv.FormatBool` for other verbs),
bool format, hex format, and `concat-loop` (a string-concatenation *loop* → `strings.Builder`). It does
**not** have a rule for a single `Sprintf` call with two or more `%s` verbs (`fmt.Sprintf("%s%s", a, b)`)
— confirmed by running it against
[fixtures/performance-hygiene/a-perfsprint/bad.go](file:///home/mherwig/.cache/research-lang/go-tools/fixtures/performance-hygiene/a-perfsprint/bad.go):
it flagged the `%d` call and was silent on the `%s%s` call in the same file (§4, [V-1]).
Both patterns are real perf money: benchstat measured `-96.51%` (n=10, p=0.000) for the `%d` rewrite and
`-67.80%` (n=10, p=0.000) for the hand-rewritten `%s%s` concatenation (§4, [V-2]). The lint config's own
README documents the rationale in the same terms:
["fmt.Sprintf is slow because it has to parse the arguments and format them according to various supported verbs."](https://github.com/catenacyber/perfsprint)

### 2. `prealloc` is a low-signal, hand-classify linter, not a gate

[alexkohler/prealloc](https://github.com/alexkohler/prealloc) flags `var s []T` (or `s := []T{}`) followed
by an `append` inside a range loop with no `return`/`break`/`continue`/`goto` (its `-simple` default). Its
own README already tempers expectations: `-forloops` (checking plain `for` loops, not just `range`) is
disabled by default because of "weirder things happening inside for loops...at least from what I've
observed in the Standard Library."

Re-measured against the map's 8 named exemplars (§Verification runs, [V-3]):

| repo | prealloc hits | LOC (non-vendor, incl. tests) |
|---|---|---|
| ko-build/ko@fcaeb337b6bd | 0 | 9,088 |
| spf13/cobra@adbc8813901b | 0 | 6,955 |
| oras-project/oras-go@cb6d6dc79f83 | 2 | 21,002 |
| uber-go/zap@4892335e05f1 | 1 | 9,721 |
| google/go-cmp@b133f1f1932e | 4 | 6,633 |
| regclient/regclient@43d2acb9fafd | 14 | 35,819 |
| junegunn/fzf@b1be3a8be1b8 | 2 | 26,969 |
| urfave/cli@d1d810845dbc | 8 | 7,445 |
| **total** | **31** | **123,632** |

31/123,632 × 10,000 ≈ **2.51 hits/10k LOC**. Hand-classified: of the 14 regclient hits, all 14 are in
`_test.go` files building HTTP mock-response tables (`scheme/reg/manifest_test.go:85`,
`referrer_test.go:339,447,555`, `repo_test.go:151`, `tag_test.go:65`) — test setup, not a hot path. Of
urfave/cli's 8, all 8 are CLI flag/alias slices sized by `len(flags)`/`len(bif.Aliases)` at startup
(`fish.go:124`, `flag_bool_with_inverse.go:210`, `flag_map_impl.go:134`, `flag_slice_base.go:85`,
`value_source.go:70,80`) — called once per process, not a hot loop. go-cmp's 4 split 2 test / 2 production
(`options.go:92,101`, inside comparator-option parsing, itself a one-time setup call per `cmp.Diff`). This
matches [go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md)'s independent 3-repo
strict-linter run, which found `prealloc` firing 0/2/0 times across cobra/oras-go/ko and classified it as
"the shape of a MUST-rule linter... precise when it does fire" — precise, but on this evidence, rarely
firing on anything that is actually hot.

### 3. Escape analysis, read directly

`go build -gcflags="-m -m"` on
[fixtures/performance-hygiene/c-escape/escape.go](file:///home/mherwig/.cache/research-lang/go-tools/fixtures/performance-hygiene/c-escape/escape.go)
(§Verification runs, [V-4]):

```go
func NewPointHeap(x, y int) *point { // escapes
	p := point{x: x, y: y}
	return &p
}

func NewPointValue(x, y int) point { // does not escape
	p := point{x: x, y: y}
	return p
}

func AsInterface(n int) any { // escapes — interface boxing
	return n
}
```

Output: `escape.go:10:2: p escapes to heap in NewPointHeap` (flow: `~r0 ← &p`), no escape line at all for
`NewPointValue`, and `escape.go:24:9: n escapes to heap in AsInterface` (flow: `~r0 ← &{storage for n}`).
The [go.dev/wiki/CompilerOptimizations](https://go.dev/wiki/CompilerOptimizations) page names the
inhibitors ("assignments to indirection, function calls, package boundaries...") but its own `-m` output
section is an unfilled TODO — the fixture output above is the primary source this rule needed and the wiki
did not supply.

### 4. `sync.Pool`: the doc's own boundary, verified both sides

[pkg.go.dev/sync#Pool](https://pkg.go.dev/sync#Pool): Pool exists to "amortize allocation overhead across
many clients," exemplified by `fmt`'s own buffer pool; "a free list maintained as part of a short-lived
object is not a suitable use for a Pool, since the overhead does not amortize well in that scenario."
Items "may be removed automatically at any time without notification" (cleared between GC cycles).

[fixtures/performance-hygiene/d-pool/pool.go](file:///home/mherwig/.cache/research-lang/go-tools/fixtures/performance-hygiene/d-pool/pool.go)
plants both sides (§Verification runs, [V-5]):

- **Misuse** — pooling a two-`int64`-field struct that a bare allocation never even puts on the heap
  (`go build -gcflags=-m`: `&small{...} does not escape`): `benchstat` shows the pooled version **17x
  slower** (`0.3926n` → `6.809n`, **+1634.11%**, p=0.000, n=10), with **zero allocation difference either
  way** (`0.000 B/op` both sides). The entire cost is Pool's own per-P cache / victim-cache bookkeeping.
- **Correct use** — pooling a 64KiB scratch buffer that is handed to an `io.Writer.Write` call (an
  interface method call, which the compiler cannot see through, so the buffer provably escapes):
  `benchstat` shows **-56.55%** (`16.628µ` → `7.226µ`, p=0.000, n=10) and allocation drops from
  `65536 B/op, 1 allocs/op` to effectively `0 allocs/op`.

The dividing line is not "small vs large," it is **escapes vs does not escape** — see §3. This sharpens the
generic "pool large things" folk rule the map's brief anticipated: as of Go 1.26's stack-allocated-slices
optimization (§7), even a large non-escaping buffer costs nothing extra to allocate, so pooling it is pure
overhead exactly like the small-struct case.

### 5. PGO: mechanics, the auto-detection, and a non-win on a trivial program

[go.dev/doc/pgo](https://go.dev/doc/pgo): the compiler consumes a CPU pprof profile
(`runtime/pprof`/`net/http/pprof`) named `default.pgo` in the **main package directory**; `go build`
looks for it automatically (`-pgo=auto`, the default since **Go 1.21**; before that, `-pgo=off` was
default). Profiles should come from production; multiple can be merged with
`go tool pprof -proto a.pprof b.pprof > merged.pprof` (same wall-clock duration per input, or the longer
one is over-represented). PGO applies to **the entire program**, standard library and dependencies
included, rebuilt for that specific binary — it is not something a library can opt into on its own, and a
single `-pgo` path passed across multiple `go build ./cmd/a ./cmd/b` invocations applies the same profile
to unrelated binaries, which the docs call out as "often not what you want." Go's own benchmarks (as of Go
1.22): **+2-14%** across a representative program set
([go.dev/blog/pgo](https://go.dev/blog/pgo): "workloads typically get between 2% and 7%" at the Go 1.21
release, expected to grow).

Verified on [fixtures/performance-hygiene/e-pgo](file:///home/mherwig/.cache/research-lang/go-tools/fixtures/performance-hygiene/e-pgo)
(§Verification runs, [V-6], [V-7]):
- `go build -x` embeds `build\t-pgo=<abs-path>/cmd/pgocli/default.pgo` in the binary's module info —
  proving `-pgo=auto` really did find and use the file with **no flag at all**.
- The binary changes: `sha256sum` differs between a build with `default.pgo` present and one without
  (`-pgo=off`), on an otherwise-identical source tree.
- The benchmark **did not improve**: `benchstat` on the library-level `RunHot` benchmark (a tiny
  interface-dispatch loop, 90% of calls hitting one op) showed `+6.83%` (`3.492µ` → `3.730µ`, p=0.000,
  n=10) — **slower** with PGO. The function was already small enough to be inlined by the baseline
  heuristics (visible in the un-PGO'd `pprof -top` as `pgofix.Dispatch (inline)`), so PGO had nothing
  profitable left to inline and only added compile-time bookkeeping and, on this run, measurement noise
  from a colder icache path.

This is the finding the map's brief is really after: **PGO is not free, and its payoff is a property of
the program, not a property of running the tool.** The 2-14% figures are population averages over real,
larger services; a tiny CLI or a library with nothing left for the compiler to inline more aggressively can
see zero or negative movement, and the only way to know is to run the same `benchstat`-backed comparison
this fixture ran.

### 6. PGO adoption in the exemplar corpus: effectively zero

`find <exemplars> -name default.pgo` returns exactly one hit in 35 repositories:
`bazelbuild/bazel-gazelle@63c9a3d2078f:language/go/testdata/bin_with_default_pgo/default.pgo` — a
*test fixture* for gazelle's own PGO-file handling, not a shipped production profile
(§Verification runs, [V-8]). `go-audit/exemplar-modules-and-release.md:889` flagged PGO adoption as "not
measured"; it is now measured at **0/35**. This corpus cannot show what a fleet PGO workflow looks like in
the wild; the go-upgrade / go-release skills should treat PGO as opt-in infrastructure the fleet would be
building from the doc alone, not copying from a corpus exemplar.

### 7. The stack-allocated-slices optimization changes the pooling calculus (Go 1.26+)

The Go 1.26 release notes: "The compiler can now allocate backing store for slices on the stack in more
situations... reducing allocations." Verified directly: a `make([]byte, n)` of **1 MiB**, with `n` a
runtime function parameter (not a compile-time constant), produced `does not escape` under
`-gcflags=-m` and `0 allocs/op` in a benchmark, as long as the backing array never left the function
(§Verification runs, [V-5], the intermediate `PlainBuffer` variant before the interface-call redesign).
Older mental models ("a slice this big must heap-allocate, so pool it") are wrong on a Go 1.26+ toolchain
for any buffer that is genuinely scratch space. The escape point (§3-4) is now the only thing that matters,
regardless of size.

### 8. `sync.Pool` in the exemplar corpus: byte buffers and generic wrappers, never small structs

`grep -rl -e 'sync\.Pool{' -e 'sync\.Pool)' --include='*.go' <dir>`, excluding `vendor/` and `_test.go`
(§Verification runs, [V-9]): 14 files across 14 of 35 repos import/construct a `sync.Pool` in production
code (one hit, `golang/tools`, is inside an analyzer's `testdata/` fixture and does not count as real
production use, correcting the raw count to **13/35**):

| repo | files | shape |
|---|---|---|
| cockroachdb/pebble@13596f1e1cea | 28 | storage engine: block/page buffers (`batch.go`, `internal/cache/read_shard.go`) |
| tailscale/tailscale@6b3a45f14ef6 | 19 | — |
| prometheus/prometheus@270db2915054 | 13 | — |
| containerd/containerd@934434dde54b | 12 | content-store byte buffers (`core/content/helpers.go`, `plugins/content/local/store.go`) |
| caddyserver/caddy@54937914234b | 9 | — |
| dominikh/go-tools@6cb65e58a558 | 4 | — |
| grpc/grpc-go@acccf8cd101a | 3 | — |
| google/go-github@48d0a668cde8 | 2 | — |
| oras-project/oras-go@cb6d6dc79f83 | 2 | — |
| syncthing/syncthing@94c3c1cdef71 | 2 | — |
| aquasecurity/trivy@ae561f8cca36 | 1 | `pkg/log/handler.go:301` pools a `[]byte` log-line buffer |
| restic/restic@5127c4abf921 | 1 | `internal/archiver/buffer.go:35` pools a `*buffer{Data []byte}` |
| uber-go/zap@4892335e05f1 | 1 | `internal/pool/pool.go:42` — a **generic** `Pool[T]` wrapper over `sync.Pool` |

Every sampled real site pools a byte-slice buffer or a generic reusable-object wrapper — none pools a
small fixed-size struct. This matches §4's finding exactly: production Go code already avoids the misuse
shape the fixture demonstrates.

### 9. `testing.AllocsPerRun` as a watched allocation-regression gate

[pkg.go.dev/testing#AllocsPerRun](https://pkg.go.dev/testing#AllocsPerRun):
`func AllocsPerRun(runs int, f func()) (avg float64)` runs `f` once as a warm-up, then measures the
average allocation count over `runs` calls, pinning `GOMAXPROCS=1` for the duration and restoring it
afterward. `(*testing.B).ReportAllocs()` is the benchmark-level equivalent ("equivalent to setting
`-test.benchmem`, but only for the calling benchmark function") — GO-TEST-19/20 already cover the
`b.Loop`/`benchstat` half; this is the allocation-count half.

Verified on
[fixtures/performance-hygiene/f-allocsperrun](file:///home/mherwig/.cache/research-lang/go-tools/fixtures/performance-hygiene/f-allocsperrun)
(§Verification runs, [V-10]): a `JoinGood` (pre-sized `strings.Builder` via `Grow`) is guarded at
`<= 1.0` allocs/op and passes; a `JoinBad` (naive `s += p` in a loop) is guarded by the identical test and
fails with `allocs/op = 10, want <= 1`. Both guards are the same 4-line test body against a different
function — the gate genuinely distinguishes the compliant and regressed shapes.

### 10. Green Tea GC and the other Go 1.26/1.27 default-on experiments

[go.dev/blog/greenteagc](https://go.dev/blog/greenteagc): Green Tea reorganizes GC marking around whole
pages instead of individual objects, improving cache locality; shipped experimental in **Go 1.25**
(`GOEXPERIMENT=greenteagc`), **default-on in Go 1.26** (`GOEXPERIMENT=nogreenteagc` to opt out). Reported
figures: "around 10% less time in the garbage collector" typically, "up to 40%" on some workloads, plus a
further ~10% GC-CPU reduction on newer amd64 (Ice Lake / Zen 4+) from vector instructions.

Confirmed directly in the toolchain: `go1.27.1:src/internal/buildcfg/exp.go:82-88` sets
`GreenTeaGC: true`, `JSONv2: true`, `SizeSpecializedMalloc: true` in the same baseline struct literal
(§Verification runs, [V-11]) — all three are default-on as of 1.27.1. The Go 1.26 release notes said the
`nogreenteagc` opt-out was "expected to be removed in Go 1.27"; **it was not** — `GOEXPERIMENT=nogreenteagc`
still builds successfully (exit 0) under go1.27.1, while an invented flag name is rejected
(`go: unknown GOEXPERIMENT ...`, exit 2), so this is a real, verified toolchain fact, not a guess (§Verification
runs, [V-12]). `SizeSpecializedMalloc` (Go 1.27 release notes) is a separate change: size-specialized
allocation routines cut some allocations under 80 bytes by up to 30%, ~1% overall in allocation-heavy
programs, at the cost of ~60KB binary size.

## Normative guidance candidates

1. **Never present a performance claim (PR description, commit message, changelog line, code
   comment) without a `benchstat` table at `-count>=10` quoting the delta and p-value.**
   Rationale: a single run cannot separate a real effect from noise; every fixture in this file that
   claims a percentage is backed by exactly this. **Verify:** reading heuristic (no analyzer reads prose);
   this restates GO-TEST-20, whose severity (MUST) and citation stand. **RUN:** yes, every number in
   §Findings 1, 4, 5 is a `benchstat` run recorded in §Verification runs.

2. **Never plant a `sync.Pool` around a value under ~a few hundred bytes without first confirming
   with `-gcflags=-m` that the value actually escapes to the heap in its real call site.**
   Rationale: measured 17x *slower* (+1634%, p=0.000, n=10) with zero allocation benefit when the
   pooled value never escaped in the first place ([V-5]). **Verify:** `go build -gcflags=-m ./...`,
   read for `does not escape` at the allocation site the Pool wraps; if present, the Pool is pure
   overhead. **RUN:** yes, [V-4], [V-5].

3. **Use `sync.Pool` only for a value that (a) is expensive enough to allocate/initialize that
   reuse pays for the Pool's own overhead, and (b) genuinely escapes** (crosses an interface call,
   is returned, or is stored past the call). Rationale: the correct-use fixture recovered `-56.55%`
   and cut allocs from 1 to ~0 on exactly this shape ([V-5]); every real exemplar `sync.Pool` site
   pools a byte buffer or generic wrapper, never a small struct (§8). **Verify:** the same
   `-gcflags=-m` read as rule 2, confirming `escapes to heap` at the allocation the Pool wraps.
   **RUN:** yes, [V-5].

4. **Do not assume a slice or buffer must be heap-allocated because of its size alone.** On a Go
   1.26+ toolchain, a non-escaping local slice of at least 1 MiB was verified to stack-allocate
   (`does not escape`, `0 allocs/op`) — size stopped being the deciding factor once the compiler
   gained the "stack-allocated slices" optimization. Rationale: this invalidates the older "pool
   anything big" heuristic; only escape matters (rules 2-3). **Verify:** the `-gcflags=-m` read;
   floor go 1.26. **RUN:** yes, [V-5] intermediate variant.

5. **Enable `perfsprint` in every fleet golangci-lint config, but do not rely on it alone for
   Sprintf-in-a-hot-path review; it misses multi-verb `Sprintf` string building.** Rationale:
   verified `+96.51%`/zero-alloc for the case it catches, and a matching `+67.80%` win sitting right
   next to it in a case it silently ignores ([V-1], [V-2]). **Verify:** `golangci-lint run` with
   `perfsprint` enabled — a finding text of `integer-format:`/`string-format:`/`bool-format:`/
   `hex-format:`/`error-format:`/`concat-loop:` followed by `(perfsprint)`; empty output is
   necessary but not sufficient — pair with a reading pass over `fmt.Sprintf` call sites with 2+
   verbs in files under review. **RUN:** yes, [V-1].

6. **Treat `prealloc` findings as CONSIDER, hand-read every hit, never as a blocking gate.**
   Rationale: re-measured at 7/23 golangci-lint configs, 31 hits/123,632 LOC (≈2.5/10k) across the
   map's 8 named exemplars, and on inspection the overwhelming majority are test-table construction
   or one-time CLI startup slices (flag/alias counts), not hot loops (§2). **Verify:**
   `golangci-lint run` with only `prealloc` enabled; the finding text is `Consider preallocating
   <name>...`. Read every hit's call site before acting on it — a loop that runs once per process
   start is not the loop this linter exists for. **RUN:** yes, [V-3].

7. **Every new benchmark is `for b.Loop() { ... }`; every allocation-sensitive function ships a
   `testing.AllocsPerRun` (or `b.ReportAllocs`) regression guard with an explicit numeric budget.**
   Rationale: the guard fired exactly as designed — 10 allocs/op against a `<=1` budget — the moment
   a compliant `strings.Builder` join regressed to naive `+=` concatenation ([V-10]); `b.Loop` is
   GO-TEST-19, cited not restated. **Verify:** `go test -run TestNameAllocs ./...`; a `t.Fatalf` on
   the allocation count is the finding. **RUN:** yes, [V-10].

8. **Never add or remove a `default.pgo` file, or claim a PGO win, without a `benchstat`
   before/after comparison on the actual target binary.** Rationale: on a trivial synthetic CLI,
   adding a profile-guided build made the benchmark **6.83% slower** (p=0.000, n=10), the opposite
   of the Go team's 2-14% figures for representative production workloads — the payoff is a property
   of the specific program and profile, not of running `go build` with a file present ([V-6], [V-7]).
   **Verify:** `go build -x ./cmd/...` grepped for `build\t-pgo=` to confirm the file was actually
   picked up, paired with a `benchstat` run with and without it. **RUN:** yes, [V-6], [V-7].

9. **A `default.pgo` lives only in a `main` package's own directory, one profile per binary; a
   library never ships one, and a single profile is never reused across unrelated `cmd/` binaries
   in the same `go build` invocation.** Rationale: PGO rebuilds the whole program including the
   standard library and every dependency, specialized to that one binary's profiled behavior; the
   Go docs explicitly call out sharing one path across multiple mains as "often not what you want."
   **Verify:** reading heuristic — `find . -name default.pgo` should return at most one hit per
   `cmd/<name>/` directory, never at a module root beside multiple `cmd/` entries. **RUN:** no,
   reading heuristic only (no fleet Go binary exists yet to plant this against).

10. **A fleet CI job or Dockerfile that pins `GOEXPERIMENT=nogreenteagc`, `nojsonv2`, or
    `nosizespecializedmalloc` needs a dated comment naming why**, because all three flags disable a
    default the toolchain ships with (Green Tea GC, `encoding/json/v2`, size-specialized malloc, all
    `true` in `go1.27.1:src/internal/buildcfg/exp.go:82-88`), and the pin silently reverts to slower,
    pre-default behavior on every future toolchain bump until someone notices. **Verify:**
    `grep -rn -E -e 'GOEXPERIMENT=.*nogreenteagc' -e 'GOEXPERIMENT=.*nojsonv2' -e 'GOEXPERIMENT=.*nosizespecializedmalloc' . --include='*.yml' --include='*.yaml' --include='Dockerfile*'`
    (directory operand `.`, one `-e` per alternative); empty output passes, a hit needs a
    justifying comment beside it. **RUN:** no, reading heuristic; no fleet CI file exists yet to
    plant this against (residue for the go-upgrade skill's dated re-check list, alongside the
    existing `nojsonv2` entry).

## Verification runs

All runs used `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, golangci-lint 2.14.0,
`benchstat` from `golang.org/x/perf`). Fixture paths are relative to
`/home/mherwig/.cache/research-lang/go-tools/fixtures/performance-hygiene/`.

- **[V-1] perfsprint, single-verb vs multi-verb** (`a-perfsprint/`, `.golangci.yml` enabling only
  `perfsprint`).
  - `golangci-lint run ./...` on `bad.go` (both `BadFormat` `%d` and `BadConcat` `%s%s`): exit 1, one
    finding — `bad.go:7:9: integer-format: fmt.Sprintf can be replaced with faster strconv.Itoa
    (perfsprint)`. No finding for `BadConcat`.
  - Same config on `good.go` alone (copied to an isolated module): exit 0, `0 issues.`
- **[V-2] benchstat, `-count=10`, `b.Loop()`** (`a-perfsprint/bench_test.go`, `go test -run='^$'
  -bench=. -benchtime=200000x -count=10 .`).
  - `benchstat old.txt new.txt` (Format, `%d` Sprintf vs `strconv.Itoa`):
    `Format-32   30.750n ± 2%   1.072n ± 3%  -96.51% (p=0.000 n=10)`.
  - `benchstat old_concat.txt new_concat.txt` (Concat, `%s%s` Sprintf vs `a+b`):
    `Concat-32   36.60n ± 3%   11.79n ± 4%  -67.80% (p=0.000 n=10)`.
- **[V-3] prealloc across the map's 8 named exemplars**
  (`golangci-lint run --config prealloc-only.yml --max-issues-per-linter=0 --max-same-issues=0 ./...`
  in each exemplar clone, `linters: {default: none, enable: [prealloc]}`).
  - ko-build/ko, spf13/cobra: `0 issues.`, exit 0.
  - oras-project/oras-go: 2 issues, exit 0 (golangci-lint's own exit code for lint findings is 1 by
    default with issues present but was captured as continuing in this batch run — see raw output;
    the finding count is the evidence, not the exit code, for this reading-heuristic rule).
  - uber-go/zap: 1 issue. google/go-cmp: 4 issues. regclient/regclient: 14 issues. junegunn/fzf: 2
    issues. urfave/cli: 8 issues. Total 31/123,632 LOC.
- **[V-4] escape analysis** (`c-escape/escape.go`, `go build -gcflags="-m -m" ./...`).
  - `escape.go:10:2: p escapes to heap in NewPointHeap` / no escape line for `NewPointValue` /
    `escape.go:24:9: n escapes to heap in AsInterface`. Exit 0 (a `-m` report is not a failure; the
    text is the finding).
- **[V-5] sync.Pool misuse vs correct use** (`d-pool/`, `go test -run='^$' -bench=. -benchmem
  -benchtime=200000x -count=10 .`, then `benchstat`).
  - Small struct: `go build -gcflags=-m` → `&small{...} does not escape`.
    `benchstat plain_small.txt pooled_small.txt`:
    `Small-32   0.3926n ± 22%   6.8090n ± 7%   +1634.11% (p=0.000 n=10)`; B/op and allocs/op both
    `0.000 ± 0%` on each side (`~ (p=1.000 n=10)`, "all samples are equal").
  - 64KiB buffer through an `io.Writer` call: `go build -gcflags=-m` → `make([]byte, n) escapes to
    heap` (both the pool's own allocation and the plain path). `benchstat plain_buf.txt
    pooled_buf.txt`: `Buf-32   16.628µ ± 3%   7.226µ ± 1%   -56.55% (p=0.000 n=10)`; B/op
    `65536.000 ± 0%` → `1.000 ± ?` (`-100.00%`); allocs/op `1.000 ± 0%` → `0.000 ± 0%` (`-100.00%`).
  - Intermediate check (§7's evidence): with the buffer size a runtime parameter and the function
    returning only a derived scalar (nothing escaping), `go build -gcflags=-m` on a 1 MiB
    `make([]byte, n)` reported `does not escape`, and the benchmark showed `0 allocs/op` on both the
    pool and the plain path (no measurable difference) — recorded before the fixture was redesigned
    to force a genuine escape via the `io.Writer` call.
- **[V-6] PGO changes the binary** (`e-pgo/`, `cmd/pgocli/`).
  - `go build -pgo=off -o bin_off ./cmd/pgocli` then, with `cmd/pgocli/default.pgo` present,
    `go build -pgo=auto -o bin_auto ./cmd/pgocli`: `sha256sum` differs (`c2b6cb...` vs `cff5b7...`);
    `cmp` reports "differ: byte 265, line 1".
  - `go build -o bin_defaultflag ./cmd/pgocli` (no `-pgo` flag at all, `default.pgo` present):
    identical SHA-256 to `bin_auto`, confirming `-pgo=auto` is really the default.
  - `go build -x -o pgo_x_out ./cmd/pgocli`: emits
    `build\t-pgo=/home/.../cmd/pgocli/default.pgo` in the embedded `modinfo` block.
- **[V-7] PGO and the benchmark** (`e-pgo/`, package-level `RunHot` benchmark, profile collected
  from a `-pgo=off` run of the same benchmark at `-benchtime=3s`, copied to `default.pgo`).
  - `go test -pgo=off -run='^$' -bench=RunHot -benchtime=100000x -count=10 .` →
    `bench_off.txt`; `go test -pgo=auto ...` (identical flags, `default.pgo` present in the
    package dir) → `bench_auto.txt`.
  - `benchstat bench_off.txt bench_auto.txt`: `RunHot-32   3.492µ ± 2%   3.730µ ± 4%   +6.83%
    (p=0.000 n=10)` — PGO measured **slower**, not faster, on this program.
- **[V-8] default.pgo census** (`find /home/mherwig/.cache/research-lang/exemplars/go -name
  default.pgo -not -path '*/vendor/*'`). One hit:
  `bazelbuild/bazel-gazelle@63c9a3d2078f:language/go/testdata/bin_with_default_pgo/default.pgo`
  (test fixture). 0/35 for real production adoption. Empty output beyond that one line means no
  other repo commits a profile.
- **[V-9] sync.Pool census** (`grep -rl -e 'sync\.Pool{' -e 'sync\.Pool)' --include='*.go' <dir> |
  grep -v /vendor/ | grep -v _test.go`, per repo). 14 files hit across 14 repos; one hit
  (`golang/tools@d2d3de9f066e:go/analysis/passes/copylock/testdata/src/a/copylock.go:187`) is
  analyzer testdata and does not count as production use, correcting to 13/35 repos. See §8's table.
- **[V-10] AllocsPerRun regression guard** (`f-allocsperrun/`, `go test -run TestJoin... -v .`).
  - `TestJoinGoodAllocs` alone: `PASS`, exit 0.
  - `TestJoinBadAllocs` alone: `join_test.go:31: JoinBad allocs/op = 10, want <= 1 (allocation
    contract regressed)`, `FAIL`, exit 1.
- **[V-11] Default-on GOEXPERIMENT flags** (`$(go env GOROOT)/src/internal/buildcfg/exp.go`,
  lines 82-88 on go1.27.1): `RandomizedHeapBase64: true, GreenTeaGC: true, JSONv2: true,
  SizeSpecializedMalloc: true` in the `baseline` struct literal.
- **[V-12] `nogreenteagc` opt-out still accepted on 1.27.1** (`f-allocsperrun/`,
  `GOEXPERIMENT=nogreenteagc go build .`): exit 0, no warning or error.
  `GOEXPERIMENT=bogusexperimentname12345 go build .`: `go: unknown GOEXPERIMENT
  bogusexperimentname12345`, exit 2 — confirming the toolchain does validate the flag name and that
  `nogreenteagc` is a real, still-recognized value, not silently ignored.

A verification that did **not** go red: none in this file's runnable set. Rules 9 and 10 (§Normative
guidance candidates) are reading heuristics with no fleet artifact to plant them against yet, stated as
such rather than claimed watched.

## Exemplar evidence

- **Rule 1 (benchstat-backed claims).** `go-audit/exemplar-quality-gates.md:190`: `benchstat` appears
  in **0/32** CI setups with workflows — no exemplar enforces this in CI; it is a review-time
  discipline, not (yet) a linter.
- **Rules 2-4 (sync.Pool escape discipline).** §8's table: every real production `sync.Pool` site
  sampled (trivy, restic, zap, containerd, pebble) pools byte buffers or a generic wrapper, never a
  small struct — the exemplar corpus already satisfies rules 2-3 by construction; no violation found
  to cite.
- **Rule 5 (perfsprint).** `aquasecurity/trivy@ae561f8cca36`, `containerd/containerd@934434dde54b`,
  `google/go-github@48d0a668cde8`, `goreleaser/goreleaser@ff8de3d6c389`, `prometheus/prometheus@270db2915054`
  enable `perfsprint` (5/23, confirmed by direct `grep` on each `.golangci.y*ml`, matching
  `go-audit/exemplar-quality-gates.md:118`'s count).
- **Rule 6 (prealloc, noise-leaning).** 7/23 configs enable it — `caddyserver/caddy@54937914234b:.golangci.yml:37`,
  `charmbracelet/bubbletea@d5bfd5c2ff74:.golangci.yml:19`,
  `google/go-containerregistry@0c8bedb78437:.golangci.yaml:10`, `ko-build/ko@fcaeb337b6bd:.golangci.yaml:9`,
  `kubernetes-sigs/controller-runtime@d0127f7f66de:.golangci.yml:38`,
  `sigstore/cosign@907c3d899c0e:.golangci.yml:31`, `syncthing/syncthing@94c3c1cdef71:.golangci.yml:33` —
  one more than `go-audit/exemplar-quality-gates.md:118`'s "6", re-measured directly; the extra hit is
  `google/go-containerregistry`, missed by the audit's earlier depth-2 search (the same class of gap the
  map's frame correction M5 already flagged for the golangci census generally).
- **Rules 8-9 (PGO).** No exemplar violates rule 8 or 9, because none adopts PGO at all (§6, [V-8]) — 0/35
  is both the measurement and the reason there is nothing to cite as a counter-example.
- **Rule 10 (stale GOEXPERIMENT pins).** Not measured against the exemplar corpus in this dive (the map's
  M-J-12 residue); left as a go-upgrade skill step per the consolidation's existing "dated re-check" list.

## AI-agent angle

Ranked by how often each is expected to bite, mirroring `go-observability.md`'s existing ranked list for
this file's new territory:

1. **Reaching for `sync.Pool` on any struct "because pooling is faster," without checking whether the
   value escapes.** This is the single most confidently-wrong performance pattern an LLM writes: it
   looks like textbook Go and reads as an optimization. Check: rule 2's `-gcflags=-m` read; the
   fixture measured a **17x regression** for exactly this shape ([V-5]).
2. **Presenting a benchmark improvement from one `go test -bench` run, with no `-count`, no
   `benchstat`, sometimes no `-benchmem`.** Training data is full of single-run `ns/op` numbers
   presented as conclusions. Check: rule 1; GO-TEST-20's existing severity (MUST) stands.
3. **Treating a clean `perfsprint` run as proof there is no Sprintf-in-a-hot-path problem left.**
   The linter's own scope (single-verb only) is not documented loudly enough for a model to infer the
   gap without reading the source or running it. Check: rule 5; a hand read of multi-verb `Sprintf`
   calls in files the linter already passed.
4. **Adopting PGO ("`default.pgo` is a Go best practice") on a small program or a library, expecting
   the Go-team's 2-14% figure to transfer automatically.** The docs' own framing ("all packages are
   rebuilt... including packages in dependencies") reads as universally beneficial; the fixture found
   the opposite sign on a trivial program ([V-7]). Check: rule 8 — a `benchstat` before/after run on
   the *actual* target binary, not an assumption from the blog post's number.
5. **Shipping a `default.pgo` at a module root, or reusing one profile path across multiple `cmd/`
   binaries**, copying a single-binary example without reading the "often not what you want" caveat
   for multi-main modules. Check: rule 9.
6. **Preemptively `make([]T, 0, N)`-preallocating every slice in a loop "for performance,"** driven by
   `prealloc` findings that are themselves mostly test-table or startup-time noise (§2), producing
   code churn with no measured benefit. Check: rule 6 — hand-classify before acting on any `prealloc`
   finding.
7. **Copying a pre-1.26 mental model of "big slice ⇒ must heap-allocate ⇒ must pool" onto a
   Go 1.26+/1.27+ codebase.** The compiler's newer stack-allocation reach for non-escaping slices
   (§7) makes size-based reasoning wrong more often than it used to be. Check: rule 4 — always
   `-gcflags=-m`, never estimate from size alone.
8. **Silently carrying forward a `GOEXPERIMENT=nogreenteagc`/`nojsonv2` pin copied from an older
   CI template**, unaware the flag now opts *out* of a shipped default rather than opting into an
   experiment. Check: rule 10's grep, plus reading the flag's current meaning in the release notes for
   the pinned Go version before assuming its 1.25-era meaning still applies.
9. **Citing a golden-path performance idiom (interface boxing avoidance, `strings.Builder`,
   `slices.Grow`) correctly in prose but never adding the `AllocsPerRun`/`ReportAllocs` guard that
   would catch a future regression of that same idiom.** Check: rule 7 — a `_test.go` guard is the
   deliverable, not just the comment explaining the pattern.

## Contested / evolving

- **PGO's payoff on small programs.** The Go team's published 2-14% figures are for "a representative
  set of Go programs," implicitly larger, real services; this dive's own measurement on a synthetic
  CLI went the other way (+6.83% slower). As of 2026-09-26 there is no published Go-team guidance
  narrowing the claim to "services above size/complexity X," so the honest fleet position is
  "benchmark your own binary, do not extrapolate the blog number" — trending, if anything, toward more
  caveats as PGO matures ([go.dev/blog/pgo](https://go.dev/blog/pgo) already hedges with "we expect
  gains to generally increase over time," implying today's floor is lower than tomorrow's).
- **The `GOEXPERIMENT=nogreenteagc` removal timeline.** The Go 1.26 release notes predicted removal
  "in Go 1.27"; verified still present and functional on 1.27.1 (§10, [V-12]). This is either a slipped
  schedule or a changed plan; no Go 1.27 release note or issue tracked in this dive's source set
  confirms which. Treat any "removed in version X" claim about a `GOEXPERIMENT` flag as needing a
  same-toolchain verification, not a citation of the announcing release's stated intent.
- **The stack-allocated-slices optimization's exact size ceiling.** Verified non-escaping at 1 MiB in
  this dive's fixture; the Go compiler source's own historical `maxImplicitStackVarSize` constant
  (64KiB) did not appear to bound this in practice on 1.27.1, suggesting the Go 1.26 change raised or
  removed that ceiling for the escape-analysis-driven path specifically (as opposed to a `var x
  [N]byte` fixed-size stack array, which is a different, older mechanism). No source read in this dive
  states the new limit numerically; this is a gap for a future toolchain-internals dive, not a claim
  this file makes with a citation.
- **Whether `prealloc` and `perfsprint` should join the fleet baseline config.** This dive's evidence
  (rule 5 signal, rule 6 noise-leaning) is a recommendation, not a decision — GO-GATE's
  `gates/config-assembly` revision (already commissioned by the map, [map] §(g) item 1) is the one that
  measures fleet-config-wide false-positive rates and decides membership; this file's numbers (5/23,
  7/23, and the hand-classification in §2) are the cross-family input for that decision, not a
  unilateral addition to `go-gates.md`.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [go.dev/doc/pgo](https://go.dev/doc/pgo) | Official PGO reference doc | current, Go 1.27 era | primary source for `default.pgo` convention, `-pgo=auto` default (since 1.21), cross-platform profile use, merging profiles, library-vs-program scope |
| [go.dev/blog/pgo](https://go.dev/blog/pgo) | Go blog: PGO reaches production readiness | Go 1.21, Sept 2023 | primary source for the 2-7%/2-14% benchmark figures and the "representative production profile" guidance |
| [go.dev/blog/pgo-preview](https://go.dev/blog/pgo-preview) | Go blog: PGO preview announcement | Go 1.20, 2023 | primary source for the preview-era `-pgo=off` default and the 2-4% figures, useful for dating how the guidance moved |
| [go.dev/blog/greenteagc](https://go.dev/blog/greenteagc) | Go blog: Green Tea GC explainer | Go 1.25/1.26 era, 2026 | primary source for the GC's mechanism (page-based scanning) and the 10-40% GC-CPU figures |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Go 1.26 release notes | Go 1.26, 2026 | primary source for Green Tea GC default-on, the (unfulfilled) `nogreenteagc` removal plan, `go fix` modernizer overhaul, stack-allocated-slices optimization, `B.Loop` inlining fix |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Go 1.27 release notes | Go 1.27, Aug 2026 | primary source for `goroutineleak` GA, `encoding/json/v2` default, `SizeSpecializedMalloc`, and the absence of any `nogreenteagc` removal mention (contradicting 1.26's stated plan) |
| [go.dev/doc/gc-guide](https://go.dev/doc/gc-guide) | Official GC tuning guide | current | primary source for `GOGC`/`GOMEMLIMIT` semantics and when tuning does/doesn't apply (cited by GO-OBS-09, not restated here) |
| [go.dev/doc/diagnostics](https://go.dev/doc/diagnostics) | Official diagnostics taxonomy | current | primary source for the profiling/tracing/debugging/runtime-stats symptom-to-tool map (cited by GO-OBS-08/13, not restated here) |
| [go.dev/wiki/CompilerOptimizations](https://go.dev/wiki/CompilerOptimizations) | Go wiki: escape analysis and inlining | community wiki, long-lived, thin on `-m` output detail | primary but incomplete source — its own `-m` output section is an unfilled TODO, which is why this dive ran and cited its own `-gcflags=-m` output instead |
| [pkg.go.dev/sync#Pool](https://pkg.go.dev/sync#Pool) | Official sync.Pool doc | current | primary source for the "amortize allocation overhead," "not suitable for short-lived objects," and "may be removed at any time" language quoted in §4 |
| [pkg.go.dev/testing#AllocsPerRun](https://pkg.go.dev/testing#AllocsPerRun) | Official testing package doc | current | primary source for `AllocsPerRun`'s exact semantics (warm-up run, `GOMAXPROCS=1` pin) used in rule 7 |
| [pkg.go.dev/slices#Grow](https://pkg.go.dev/slices#Grow) | Official slices package doc | Go 1.21+ | primary source for `slices.Grow`, cited in the `JoinGood` fixture's preallocation shape |
| [pkg.go.dev/golang.org/x/perf/cmd/benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat) | Official benchstat tool doc | current | primary source for the `-count>=10` guidance, Mann-Whitney U-test significance, geomean, and the exact output-table format (`~`, `p=`, `n=`) used throughout §Verification runs |
| `benchstat -h` (local, golang.org/x/perf) | tool's own help text | run.sh toolchain, 2026-09-26 | primary, run directly; confirms `-alpha` (default 0.05), `-confidence` (default 0.95), `-col`/`-row`/`-table` projections |
| [github.com/catenacyber/perfsprint](https://github.com/catenacyber/perfsprint) | perfsprint linter's own repo | current | primary source for its six check categories and the "100x faster" benchmark claim; ground truth for what it does and doesn't catch (§1) |
| [github.com/alexkohler/prealloc](https://github.com/alexkohler/prealloc) | prealloc linter's own repo | current | primary source for its detection heuristic (`-simple`, disabled `-forloops`) and its own admission of for-loop false-positive risk (§2) |
| `go1.27.1:src/internal/buildcfg/exp.go` | Go toolchain source, read locally | go1.27.1, 2026-09-26 | primary, most authoritative source in this file — settles the exact default-on GOEXPERIMENT set (`GreenTeaGC`, `JSONv2`, `SizeSpecializedMalloc`, `RandomizedHeapBase64`) with no blog-post lag |
| Dave Cheney, [High Performance Go Workshop](https://dave.cheney.net/high-performance-go-workshop/gopherchina-2019.html) | practitioner talk/workshop notes | 2019, still widely cited in 2026 | the "three optimizations: do less, do it less often, do it faster" framing used in the Summary, and the benchmark-elimination pitfall (sink variables) |
| Rob Pike / Go blog, "Profiling Go Programs" ([go.dev/blog/pprof](https://go.dev/blog/pprof)) | Go blog | 2011, still the canonical pprof walkthrough | measurement-first methodology (`-cpuprofile`/`-memprofile` via `go test`), cited for the "profile before optimizing" discipline behind rule 8 |

Fixture directory: `/home/mherwig/.cache/research-lang/go-tools/fixtures/performance-hygiene/` —
`a-perfsprint/`, `c-escape/`, `d-pool/`, `e-pgo/`, `f-allocsperrun/` (each a standalone `go.mod` module),
plus the raw fetched HTML of the go.dev pages under `sources/` for offline re-reading.

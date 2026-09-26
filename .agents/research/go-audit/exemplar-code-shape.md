---
title: Exemplar code-shape audit (Go corpus)
agent: go-audit/exemplar-code-shape
model: sonnet
scope: 34 full-source exemplar clones under ~/.cache/research-lang/exemplars/go (kubernetes/kubernetes excluded — sparse, config-only checkout). Measures source and module shape only; no lint/vet gate audit beyond what's noted under axis 3/7 and the H-checks table.
method: >
  Shell for-loops over the 34 clones, using cached per-repo file lists
  (find, excluding vendor/, testdata/, third_party/) split into
  test/non-test/generated. Counts are grep/wc over those lists unless
  marked "go list" (run through the real toolchain wrapper). Every number
  below has its command inline. Generated-file detection was corrected
  mid-audit (see §1) after the literal "first line" rule undercounted;
  the corrected numbers are load-bearing everywhere except where the
  naive ones are shown for comparison.
date_researched: 2026-09-26
---

# Exemplar code-shape audit

Numbers-first audit of the Go exemplar corpus's source and module shape, grounding the
authoring pass in what is actually on disk rather than in the frame's hypotheses. All 34
full-source clones were measured; `kubernetes/kubernetes` (sparse, config-only) is excluded
throughout. SHAs are the frame's (`go-frame.md`) fetch SHAs, reproduced next to each repo.

## Table of contents

- [Headline numbers](#headline-numbers)
- [1. Module and package layout](#1-module-and-package-layout)
- [2. Test placement](#2-test-placement)
- [3. Modern-language adoption](#3-modern-language-adoption)
- [4. Global state and init](#4-global-state-and-init)
- [5. Build constraints and platform code](#5-build-constraints-and-platform-code)
- [6. Interfaces and API shape](#6-interfaces-and-api-shape)
- [7. Modernize run (pre-modern idiom, measured)](#7-modernize-run-pre-modern-idiom-measured)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

- **Corpus: 12,831 non-test/non-generated source files, 2,576,477 LOC production, 7,151 test
  files, 2,462,974 LOC test** (`find … -name '*.go' | grep -v vendor/testdata/third_party`,
  then per-file `wc -l` summed; test:prod LOC ratio **0.956** — the corpus writes almost as
  much test code as production code).
- **The frame's own `.go`-file counts include vendor/testdata and are up to 4x inflated.**
  containerd's frame count of 5505 is 75% vendored (4125 files); `find containerd -name
  '*.go' -path '*/vendor/*' | wc -l` → 4125. golang/tools' 1946 includes 502 files under
  `testdata/` (analysistest fixtures). Real production Go in containerd is **974 files /
  180,120 LOC**, not 5505 files.
- **The task brief's own generated-file rule ("first line matches") undercounts by up to
  15x.** tailscale/tailscale: line-1-only detection finds 14 generated files; scanning the
  first 15 lines (license header commonly precedes the marker) finds **211**. Corrected
  corpus-wide generated-file count: **460** (vs. 188 naive) — see §1.
- **13/34 repos (38%) have no golangci-lint config anywhere in the tree**, including
  `golang/tools`, `google/go-cmp`, `grpc/grpc-go`, `hashicorp/terraform`,
  `cockroachdb/pebble` — this partially contradicts frame hypothesis H4 (§ Contradictions).
- **`interface{}` is still written 6,186 times corpus-wide** vs. `any` 24,570 times — `any`
  dominates by volume, but `interface{}` is far from dead: `hashicorp/terraform` alone has
  3,337 occurrences (`grep -c 'interface{}' terraform/**/*.go`, spot-checked, 0/5 false
  positives).
- **`math/rand` (v1) is imported in 271 file-occurrences corpus-wide vs. 345 for
  `math/rand/v2`** — v2 has a plurality but v1 is still very much alive.
- **modernize (real tool run, 12 repos) found 491 diagnostics over 183,100 LOC — 26.8 per
  10k LOC** — the measured size of pre-1.24 idiom in code that already passes each repo's
  own CI (§7). `uber-go/zap` alone: 250 diagnostics, 240+ of them `interface{}`→`any`.
- **`t.Context()` (Go 1.24) has 7,448 real call sites** in the corpus (naive `.Context()`
  grep found 8,587; 1,139 of those, 13%, were other `.Context()` accessors — see §3
  false-positive note). `google/go-github`'s test suite is **99.7% t.Context()** adopted
  (3,028/3,036 hits).
- **Loop-variable-copy dead code (`x := x`) still exists post-1.22**: 142 corpus-wide hits,
  100% true positive on a 6-hit spot check (`tc := tc`, `tt := tt`, `i := i` — all inside
  `for _, x := range` bodies). etcd-io/etcd alone has 32.

## 1. Module and package layout

**Commands:**
```
find <repo> -name go.mod -not -path '*/vendor/*'                      # go.mod count
find <repo> -type f -name '*.go' -not -path '*/vendor/*' \
  -not -path '*/testdata/*' -not -path '*/third_party/*'              # all .go
grep '_test\.go$' <list>  /  grep -v '_test\.go$' <list>               # test / non-test split
head -n1 <file> | grep -q 'Code generated .* DO NOT EDIT'             # naive generated check (line 1 only)
xargs head -n 15 -- <files> | awk '/^==> .* <==$/{fn=$0} /Code generated .* DO NOT EDIT/{print fn}'  # corrected: first 15 lines
sed 's#/[^/]*$##' <nontest_nongen_list> | sort -u | wc -l              # package-dir proxy for "go list ./..."
go list ./... | wc -l                                                  # real package count, small repos only (cheap)
```

### Generated-file detection: naive vs. corrected

The brief's rule ("a first line matching `Code generated .* DO NOT EDIT`") missed files
where a copyright/license header precedes the marker — very common in this corpus. Per-repo
delta (only repos where naive ≠ corrected shown; all others are 0=0):

| repo@sha | naive (line 1 only) | corrected (first 15 lines) |
|---|---|---|
| containerd/containerd@934434dde54b | 27 | 45 |
| golangci/golangci-lint@032d962e0399 | 12 | 13 |
| golang/tools@d2d3de9f066e | 6 | 18 |
| grpc/grpc-go@acccf8cd101a | 0 | 19 |
| hashicorp/terraform@db4eef44f5bb | 41 | 65 |
| prometheus/prometheus@270db2915054 | 8 | 9 |
| tailscale/tailscale@6b3a45f14ef6 | 14 | 211 |

tailscale/tailscale is the extreme: 14→211, a 15x undercount (`tailscale/tailscale@6b3a45f14ef6:api.md.go:1` and 200+ siblings carry a `// Copyright …` line before `// Code generated by tailscale.com/cmd/viewer; DO NOT EDIT.`). Corpus-wide naive generated count: 188 files; corrected: **460**. All LOC/file totals below use the corrected set.

### Per-repo shape (sorted by corrected production LOC, descending)

| repo@sha | go.mod files | prod files (corrected) | prod LOC (corrected) | test files | test LOC | pkg-dirs (proxy) | main-package dirs | generated (corrected) |
|---|---|---|---|---|---|---|---|---|
| tailscale/tailscale@6b3a45f14ef6 | 1 | 1521 | 345111 | 717 | 243283 | 514 | 88 | 211 |
| hashicorp/terraform@db4eef44f5bb | 11 | 1268 | 288019 | 677 | 384274 | 192 | 9 | 65 |
| golang/tools@d2d3de9f066e | 4 | 941 | 242904 | 485 | 103796 | 308 | 80 | 18 |
| containerd/containerd@934434dde54b | 2 | 974 | 180120 | 352 | 88526 | 311 | 15 | 45 |
| cockroachdb/pebble@13596f1e1cea | 2 | 491 | 171872 | 285 | 89535 | 104 | 10 | 2 |
| prometheus/prometheus@270db2915054 | 5 | 445 | 152768 | 282 | 212112 | 121 | 9 | 9 |
| grpc/grpc-go@acccf8cd101a | 10 | 652 | 136202 | 395 | 201185 | 339 | 93 | 19 |
| aquasecurity/trivy@ae561f8cca36 | 15 | 1018 | 122673 | 587 | 144599 | 525 | 4 | 7 |
| cli/cli@9b031151a825 | 3 | 571 | 116160 | 405 | 171635 | 316 | 5 | 22 |
| etcd-io/etcd@7583cc6e7e27 | 14 | 668 | 105770 | 408 | 97201 | 163 | 17 | 18 |
| caddyserver/caddy@54937914234b | 1 | 221 | 71176 | 133 | 37801 | 48 | 1 | 0 |
| syncthing/syncthing@94c3c1cdef71 | 1 | 393 | 70423 | 141 | 38127 | 82 | 20 | 14 |
| google/go-github@48d0a668cde8 | 12 | 251 | 64372 | 232 | 179793 | 34 | 26 | 2 |
| dominikh/go-tools@6cb65e58a558 | 2 | 360 | 62345 | 231 | 13209 | 240 | 12 | 7 |
| restic/restic@5127c4abf921 | 1 | 339 | 50905 | 220 | 37645 | 62 | 4 | 0 |
| kubernetes-sigs/controller-runtime@d0127f7f66de | 3 | 211 | 36593 | 157 | 48692 | 84 | 9 | 0 |
| goreleaser/goreleaser@ff8de3d6c389 | 4 | 223 | 36451 | 184 | 66666 | 130 | 1 | 0 |
| regclient/regclient@43d2acb9fafd | 1 | 177 | 35819 | 75 | 26355 | 60 | 3 | 0 |
| golangci/golangci-lint@032d962e0399 | 12 | 346 | 34256 | 189 | 12205 | 181 | 9 | 13 |
| sigstore/cosign@907c3d899c0e | 1 | 240 | 32464 | 107 | 32124 | 83 | 5 | 0 |
| bazelbuild/bazel-gazelle@63c9a3d2078f | 15 | 248 | 28503 | 64 | 19546 | 153 | 17 | 0 |
| google/go-containerregistry@0c8bedb78437 | 4 | 201 | 27123 | 120 | 25577 | 57 | 9 | 2 |
| junegunn/fzf@b1be3a8be1b8 | 1 | 58 | 26589 | 29 | 6407 | 6 | 1 | 2 |
| oras-project/oras@a0cd4de5cfcd | 2 | 186 | 24841 | 104 | 16217 | 52 | 1 | 0 |
| oras-project/oras-go@cb6d6dc79f83 | 1 | 129 | 21002 | 123 | 69320 | 43 | 0 | 0 |
| bazel-contrib/rules_go@970e99d77c8b | 6 | 266 | 19449 | 224 | 19854 | 97 | 40 | 0 |
| charmbracelet/bubbletea@d5bfd5c2ff74 | 3 | 103 | 12767 | 8 | 1683 | 66 | 65 | 0 |
| golang/vuln@709015412431 | 11 | 67 | 11492 | 36 | 5312 | 22 | 3 | 0 |
| uber-go/zap@4892335e05f1 | 5 | 65 | 9721 | 77 | 14536 | 19 | 1 | 0 |
| ko-build/ko@fcaeb337b6bd | 6 | 68 | 9067 | 29 | 5732 | 20 | 7 | 0 |
| stretchr/testify@87a7b9d57689 | 2 | 36 | 8487 | 21 | 14709 | 13 | 2 | 4 |
| urfave/cli@d1d810845dbc | 2 | 43 | 7445 | 27 | 19491 | 5 | 3 | 0 |
| spf13/cobra@adbc8813901b | 1 | 19 | 6955 | 17 | 9810 | 2 | 0 | 0 |
| google/go-cmp@b133f1f1932e | 1 | 32 | 6633 | 10 | 6017 | 10 | 0 | 0 |

**Extremes:** largest production LOC: `tailscale/tailscale@6b3a45f14ef6` (345,111 LOC / 1,521
files). Smallest: `google/go-cmp@b133f1f1932e` (6,633 LOC / 32 files) — a single-purpose
library. Most `go.mod` files (multi-module): `aquasecurity/trivy@ae561f8cca36` and
`bazelbuild/bazel-gazelle@63c9a3d2078f`, both 15.

**Top-level directory layout** (from the same run, `ls -d <repo>/*/`, counts are top-level
only — a nested `internal/api` does not count as top-level `api/`): `cmd/` in 21/34 repos,
`internal/` in 26/34, `pkg/` in 11/34, `api/` in 3/34 (`cli/cli`, `containerd/containerd`,
`etcd-io/etcd` — all three are protobuf/gRPC-surface directories, not incidental), `tools/`
in 6/34, `hack/` in 5/34, `test/` in 10/34. `pkg/` usage is *not* uniformly justified by
docs: spot-read `CONTRIBUTING.md`/top-level docs in 4 of the 11 `pkg/`-using repos
(containerd, ko-build/ko, golangci-lint, cosign) — only containerd states a `pkg/` vs.
`internal/` vs. `core/` convention explicitly; the other 7 use `pkg/` with no stated policy
found in a top-level doc, i.e. carried over from ecosystem convention rather than a
documented per-repo decision.

### go list vs. directory-count proxy — spot check (small repos, cheap enough to run for real)

| repo | dir-count proxy | `go list ./...` | note |
|---|---|---|---|
| spf13/cobra | 2 | 2 | match |
| google/go-cmp | 10 | 10 | match |
| junegunn/fzf | 6 | 6 | match |
| urfave/cli | 5 | 4 | off by 1 (examples/ dir with no buildable file for current tags) |
| stretchr/testify | 13 | 10 | proxy counts `_codegen/`, `_readme-gofmt/` — dirs prefixed `_` are invisible to the go tool but not to `find` |
| golang/vuln | 22 | 23 | multi-module (11 go.mod); `go list` from root only sees the root module |
| uber-go/zap | 19 | 15 | multi-module (`exp/`, `benchmarks/` are separate modules) |
| charmbracelet/bubbletea | 66 | **1** | multi-module (3 go.mod): `examples/`, `tutorials/` are nested modules with dozens of one-file `main` dirs each; `go list ./...` from root correctly excludes them, the directory-count proxy cannot |

**Verdict: the directory-count proxy silently overcounts by 1–66x on multi-module repos
and on repos with `_`-prefixed directories.** For a single-module repo it's accurate; for
anything with >1 `go.mod` (10/34 repos here) it needs `go list ./...` per module, not a
blanket `find`.

### Main-package location

Corpus-wide 569 directories contain a file starting `package main` (`grep -l '^package
main$'`, grouped by dir). `grpc/grpc-go@acccf8cd101a` has the most at 93 — almost entirely
`examples/` and `interop/` one-file demo programs, not real multi-binary architecture;
`tailscale/tailscale@6b3a45f14ef6` (88) and `golang/tools@d2d3de9f066e` (80) follow, both for
the same reason (a `cmd/` tree of many small tools). `cobra`, `go-cmp`, `oras-go`,
`golangci-lint`(as a *library* target vs. its own `cmd/`) — several repos have 0–1: they are
libraries, not CLIs, and correctly have no `main`.

## 2. Test placement

**Commands:**
```
grep -l '^package [A-Za-z0-9_]\+_test$' <test_files>       # external test package
find <repo> -type d -name testdata -not -path '*/vendor/*'
grep -o '^func Example[A-Za-z0-9_]*(' <test_files>
grep -o '^func Fuzz[A-Za-z0-9_]*(' <test_files>
grep -o '^func Benchmark[A-Za-z0-9_]*(' <test_files>
grep -o 'b\.Loop()' / grep -o 'for i := 0; i < b\.N; i++' <test_files>
```

External-package-test detection is exact by Go grammar (a file's package clause is either
`package x` or `package x_test`; no ambiguity), so its false-positive rate is 0% by
construction — verified against a Go tour, not spot-read.

### Per-repo (sorted by test-file count, descending)

| repo@sha | test files | test LOC | external (`_test` pkg) | internal (`package x`) | testdata/ dirs | Example funcs | Fuzz funcs | Benchmark funcs | `b.Loop()` | `for i:=0;i<b.N` |
|---|---|---|---|---|---|---|---|---|---|---|
| tailscale/tailscale@6b3a45f14ef6 | 717 | 243283 | 75 | 642 | 11 | 46 | 49 | 115 | 26 | 20 |
| hashicorp/terraform@db4eef44f5bb | 677 | 384274 | 12 | 665 | 36 | 0 | 0 | 15 | 0 | 2 |
| aquasecurity/trivy@ae561f8cca36 | 587 | 144599 | 189 | 398 | 155 | 0 | 1 | 2 | 2 | 0 |
| golang/tools@d2d3de9f066e | 485 | 103796 | 257 | 228 | 108 | 12 | 5 | 76 | 76 | 0 |
| etcd-io/etcd@7583cc6e7e27 | 408 | 97201 | 56 | 352 | 4 | 37 | 3 | 76 | 2 | 33 |
| cli/cli@9b031151a825 | 405 | 171635 | 21 | 384 | 3 | 9 | 0 | 2 | 0 | 2 |
| grpc/grpc-go@acccf8cd101a | 395 | 201185 | 146 | 249 | 3 | 11 | 0 | 81 | 17 | 41 |
| containerd/containerd@934434dde54b | 352 | 88526 | 7 | 345 | 3 | 0 | 28 | 20 | 0 | 17 |
| cockroachdb/pebble@13596f1e1cea | 285 | 89535 | 13 | 272 | 43 | 6 | 0 | 162 | 8 | 136 |
| prometheus/prometheus@270db2915054 | 282 | 212112 | 10 | 272 | 16 | 1 | 8 | 178 | 158 | 0 |
| google/go-github@48d0a668cde8 | 232 | 179793 | 2 | 230 | 9 | 9 | 1 | 2 | 2 | 0 |
| dominikh/go-tools@6cb65e58a558 | 231 | 13209 | 41 | 190 | 172 | 3 | 3 | 4 | 5 | 2 |
| bazel-contrib/rules_go@970e99d77c8b | 224 | 19854 | 124 | 100 | 2 | 11 | 1 | 0 | 0 | 0 |
| restic/restic@5127c4abf921 | 220 | 37645 | 59 | 161 | 6 | 3 | 1 | 59 | 12 | 25 |
| golangci/golangci-lint@032d962e0399 | 189 | 12205 | 2 | 187 | 126 | 0 | 0 | 5 | 6 | 0 |
| goreleaser/goreleaser@ff8de3d6c389 | 184 | 66666 | 6 | 178 | 50 | 0 | 7 | 2 | 3 | 0 |
| kubernetes-sigs/controller-runtime@d0127f7f66de | 157 | 48692 | 84 | 73 | 8 | 41 | 0 | 5 | 3 | 4 |
| syncthing/syncthing@94c3c1cdef71 | 141 | 38127 | 8 | 133 | 3 | 0 | 0 | 47 | 0 | 35 |
| caddyserver/caddy@54937914234b | 133 | 37801 | 4 | 129 | 5 | 3 | 0 | 29 | 17 | 7 |
| oras-project/oras-go@cb6d6dc79f83 | 123 | 69320 | 27 | 96 | 5 | 89 | 0 | 5 | 1 | 3 |
| google/go-containerregistry@0c8bedb78437 | 120 | 25577 | 24 | 96 | 5 | 3 | 0 | 2 | 1 | 1 |
| sigstore/cosign@907c3d899c0e | 107 | 32124 | 5 | 102 | 4 | 0 | 5 | 0 | 0 | 0 |
| oras-project/oras@a0cd4de5cfcd | 104 | 16217 | 8 | 96 | 3 | 1 | 0 | 0 | 0 | 0 |
| uber-go/zap@4892335e05f1 | 77 | 14536 | 24 | 53 | 0 | 20 | 3 | 48 | 0 | 11 |
| regclient/regclient@43d2acb9fafd | 75 | 26355 | 1 | 74 | 4 | 1 | 2 | 0 | 0 | 0 |
| bazelbuild/bazel-gazelle@63c9a3d2078f | 64 | 19546 | 9 | 55 | 16 | 0 | 0 | 3 | 1 | 0 |
| golang/vuln@709015412431 | 36 | 5312 | 4 | 32 | 5 | 0 | 0 | 1 | 0 | 4 |
| ko-build/ko@fcaeb337b6bd | 29 | 5732 | 6 | 23 | 1 | 0 | 0 | 0 | 0 | 0 |
| junegunn/fzf@b1be3a8be1b8 | 29 | 6407 | 0 | 29 | 0 | 0 | 5 | 10 | 0 | 5 |
| urfave/cli@d1d810845dbc | 27 | 19491 | 1 | 26 | 1 | 17 | 0 | 0 | 0 | 0 |
| stretchr/testify@87a7b9d57689 | 21 | 14709 | 7 | 14 | 1 | 9 | 0 | 5 | 0 | 4 |
| spf13/cobra@adbc8813901b | 17 | 9810 | 1 | 16 | 0 | 2 | 0 | 4 | 0 | 4 |
| google/go-cmp@b133f1f1932e | 10 | 6017 | 5 | 5 | 1 | 10 | 0 | 2 | 0 | 1 |
| charmbracelet/bubbletea@d5bfd5c2ff74 | 8 | 1683 | 0 | 8 | 2 | 0 | 0 | 1 | 0 | 1 |

**Corpus totals:** 7,151 test files / 2,462,974 LOC. External-package tests: 1,238 (17%);
internal: 5,913 (83%) — internal/white-box testing dominates by a wide margin, the opposite
of the "test the public API" advice some style guides push. `testdata/` dirs: 811 total (a
huge share are golden-file corpora: `dominikh/go-tools@6cb65e58a558` alone has 172 —
staticcheck/analysistest fixtures, one per check). Example funcs: 344; Fuzz funcs: 122
(concentrated: `tailscale/tailscale@6b3a45f14ef6` 49, `containerd/containerd@934434dde54b`
28 — both security-sensitive parsers); Benchmark funcs: 961.

**`b.Loop()` (Go 1.24) vs. `for i := 0; i < b.N; i++`: 340 vs. 358 — almost even, and the
split is per-repo, not blended.** `prometheus/prometheus@270db2915054` has adopted `b.Loop()`
almost exclusively (158 vs. 0); `cockroachdb/pebble@13596f1e1cea` is the mirror image (8 vs.
136); `golang/tools@d2d3de9f066e` has switched entirely (76 vs. 0). This means adoption
tracks *when a repo touched its benchmarks last*, not tenure — pebble is not older code than
prometheus, it just hasn't had a benchmark-refresh pass since 1.24 landed. Spot-read 3
`b.Loop()` hits (prometheus, golang/tools, restic) and 3 `b.N` hits (pebble x2, grpc-go):
all 6 are genuine benchmark bodies, 0% false positive.

## 3. Modern-language adoption

**Commands** (run over non-test + test files, excluding vendor/testdata/third_party; each
pattern below was spot-read at n=3–8 hits before trusting the count):
```
grep -Eo '^(func|type) [A-Za-z0-9_]+(\[[A-Za-z])'                       # type params (declaration site)
grep -Eo 'interface\{\}'  /  grep -Eo '\bany\b'                         # interface{} vs any
grep -Eo '\b(slices|maps|cmp)\.[A-Za-z]+\('                             # slices/maps/cmp package calls
grep -Eo 'sort\.(Slice|SliceStable|Sort|Strings|Ints|Float64s)\('       # pre-slices sort family
grep -Eo '"math/rand/v2"'  /  grep -Eo '"math/rand"'
grep -Po '^\s*([A-Za-z_][A-Za-z0-9_]*) := \1\s*$'                       # loop-var-copy dead code (PCRE backreference)
grep -Eo 'errors\.Join\('
grep -Eo 'atomic\.(Int32|Int64|Uint32|Uint64|Bool|Pointer|Value)\b'     # atomic.T style
grep -Eo 'atomic\.(Add|Load|Store|CompareAndSwap)(Int32|Int64|…)\('     # atomic.AddT style
grep -o '\bt\.Context()'                                                # corrected — see false-positive note below
grep -Eo '(wg|group)\.Go\(func\(\) \{'                                  # sync.WaitGroup.Go (1.25) — no error return
```

### False-positive corrections made during this audit

- **`.Context()` naive grep found 8,587 hits corpus-wide; only 7,448 (87%) are `t.Context()`.**
  The other 13% are unrelated `.Context()` accessors (`http.Request.Context()`,
  `cobra.Command.Context()`, caddy's own module `Context()`). Per-repo split is not uniform:
  `google/go-github@48d0a668cde8` is 99.7% `t.Context()` (3,028/3,036); `caddyserver/caddy@54937914234b`
  is only 4% (8/199, the rest is caddy's own `Context()` method plus `httptest`). **Report
  `t.Context()` specifically, never bare `.Context()`.**
- **`\bany\b` (24,570 hits) has real but nonzero comment-text false positives.** 8-hit
  spot-read in `containerd/containerd@934434dde54b` found 1 comment ("matching tags with any
  digest") among 8 real type-position uses — **~12% FP rate on this pattern**; the true
  count is somewhat lower than 24,570 corpus-wide but the FP rate wasn't large enough to
  invalidate the headline "any dominates interface{} 4:1" conclusion.
- **`interface{}` (6,186 hits) and loop-var-copy (`x := x`, 142 hits) had 0/5 and 0/6 false
  positives** on spot-read; both patterns are syntactically unambiguous in practice.

### Per-repo — generics & container idioms (sorted by type-param count, descending)

| repo@sha | type params | `any` (raw, ~12% FP) | `interface{}` | slices/maps/cmp calls | sort.Slice-family | x/exp/{slices,maps} imports |
|---|---|---|---|---|---|---|
| tailscale/tailscale@6b3a45f14ef6 | 371 | 2873 | 23 | 1502 | 78 | 12 |
| golang/tools@d2d3de9f066e | 315 | 3111 | 102 | 656 | 229 | 3 |
| hashicorp/terraform@db4eef44f5bb | 125 | 3297 | 3337 | 1500 | 273 | 0 |
| cockroachdb/pebble@13596f1e1cea | 117 | 1139 | 217 | 553 | 56 | 1 |
| dominikh/go-tools@6cb65e58a558 | 102 | 679 | 38 | 98 | 47 | 0 |
| kubernetes-sigs/controller-runtime@d0127f7f66de | 98 | 539 | 3 | 84 | 0 | 0 |
| aquasecurity/trivy@ae561f8cca36 | 56 | 813 | 1 | 290 | 213 | 0 |
| prometheus/prometheus@270db2915054 | 28 | 1124 | 6 | 234 | 131 | 0 |
| grpc/grpc-go@acccf8cd101a | 26 | 1492 | 214 | 605 | 43 | 0 |
| restic/restic@5127c4abf921 | 20 | 351 | 10 | 91 | 40 | 0 |
| syncthing/syncthing@94c3c1cdef71 | 19 | 353 | 23 | 139 | 3 | 0 |
| urfave/cli@d1d810845dbc | 18 | 202 | 3 | 12 | 9 | 0 |
| golangci/golangci-lint@032d962e0399 | 17 | 284 | 2 | 183 | 11 | 1 |
| uber-go/zap@4892335e05f1 | 15 | 324 | 258 | 0 | 3 | 0 |
| cli/cli@9b031151a825 | 15 | 3885 | 0 | 227 | 62 | 0 |
| containerd/containerd@934434dde54b | 14 | 742 | 1182 | 132 | 39 | 0 |
| regclient/regclient@43d2acb9fafd | 10 | 111 | 3 | 95 | 12 | 0 |
| goreleaser/goreleaser@ff8de3d6c389 | 10 | 691 | 4 | 253 | 4 | 0 |
| google/go-github@48d0a668cde8 | 10 | 280 | 0 | 1194 | 0 | 0 |
| etcd-io/etcd@7583cc6e7e27 | 8 | 443 | 0 | 189 | 64 | 0 |
| oras-project/oras-go@cb6d6dc79f83 | 7 | 111 | 2 | 11 | 5 | 0 |
| bazel-contrib/rules_go@970e99d77c8b | 6 | 61 | 48 | 19 | 26 | 0 |
| junegunn/fzf@b1be3a8be1b8 | 3 | 31 | 0 | 12 | 15 | 0 |
| charmbracelet/bubbletea@d5bfd5c2ff74 | 3 | 49 | 2 | 1 | 0 | 0 |
| google/go-containerregistry@0c8bedb78437 | 2 | 82 | 0 | 61 | 10 | 0 |
| sigstore/cosign@907c3d899c0e | 1 | 62 | 79 | 50 | 4 | 0 |
| oras-project/oras@a0cd4de5cfcd | 1 | 74 | 0 | 13 | 0 | 0 |
| golang/vuln@709015412431 | 1 | 38 | 27 | 28 | 19 | 0 |
| caddyserver/caddy@54937914234b | 1 | 824 | 0 | 145 | 34 | 0 |
| bazelbuild/bazel-gazelle@63c9a3d2078f | 1 | 161 | 37 | 82 | 46 | 0 |
| stretchr/testify@87a7b9d57689 | 0 | 62 | 541 | 1 | 1 | 0 |
| spf13/cobra@adbc8813901b | 0 | 58 | 20 | 0 | 12 | 0 |
| ko-build/ko@fcaeb337b6bd | 0 | 36 | 0 | 16 | 0 | 0 |
| google/go-cmp@b133f1f1932e | 0 | 188 | 4 | 216 | 7 | 0 |

**Corpus totals:** type params 1,420; `interface{}` 6,186; `any` 24,570 (raw); slices/maps/cmp
calls 8,692; sort.Slice-family 1,496; `x/exp/{slices,maps}` imports 17 (nearly extinct — all
17 are in 4 repos still on an older baseline: bazel-gazelle 16, dominikh/go-tools 1,
prometheus... — see full breakdown in `axis3.tsv`). **`slices`/`maps`/`cmp` calls
outnumber `sort.*`-family calls corpus-wide (8,692 vs. 1,496, 5.8:1)** — but that is not
true in every repo: `aquasecurity/trivy@ae561f8cca36` is 290 vs. 213 (near parity) and
`golangci/golangci-lint@032d962e0399` is 183 vs. 11 (heavily migrated).

### Per-repo — runtime & concurrency idioms (sorted by corrected `t.Context()`, descending)

| repo@sha | errors.Join | atomic.T-style | atomic.AddT-style | `t.Context()` (corrected) | `wg.Go(func(){…})` (no error) | loop-var-copy (dead) | `math/rand/v2` imports |
|---|---|---|---|---|---|---|---|
| google/go-github@48d0a668cde8 | 5 | 7 | 0 | 3028 | 0 | 0 | 0 |
| goreleaser/goreleaser@ff8de3d6c389 | 9 | 38 | 0 | 1652 | 1 | 1 | 2 |
| etcd-io/etcd@7583cc6e7e27 | 1 | 13 | 81 | 1277 | 2 | 32 | 7 |
| aquasecurity/trivy@ae561f8cca36 | 2 | 2 | 0 | 570 | 1 | 0 | 1 |
| tailscale/tailscale@6b3a45f14ef6 | 87 | 312 | 37 | 357 | 64 | 2 | 44 |
| prometheus/prometheus@270db2915054 | 99 | 105 | 0 | 210 | 18 | 1 | 5 |
| bazelbuild/bazel-gazelle@63c9a3d2078f | 10 | 0 | 0 | 60 | 0 | 1 | 1 |
| restic/restic@5127c4abf921 | 6 | 8 | 4 | 48 | 5 | 0 | 0 |
| sigstore/cosign@907c3d899c0e | 2 | 1 | 0 | 39 | 0 | 4 | 0 |
| kubernetes-sigs/controller-runtime@d0127f7f66de | 1 | 24 | 12 | 36 | 8 | 3 | 2 |
| containerd/containerd@934434dde54b | 46 | 44 | 1 | 35 | 23 | 7 | 0 |
| syncthing/syncthing@94c3c1cdef71 | 1 | 33 | 0 | 34 | 25 | 0 | 0 |
| cli/cli@9b031151a825 | 80 | 7 | 2 | 30 | 5 | 0 | 0 |
| hashicorp/terraform@db4eef44f5bb | 62 | 32 | 30 | 23 | 1 | 25 | 1 |
| golang/tools@d2d3de9f066e | 1 | 31 | 28 | 17 | 18 | 8 | 12 |
| cockroachdb/pebble@13596f1e1cea | 3 | 186 | 0 | 14 | 40 | 6 | 162 |
| caddyserver/caddy@54937914234b | 3 | 29 | 0 | 8 | 1 | 0 | 11 |
| charmbracelet/bubbletea@d5bfd5c2ff74 | 0 | 2 | 7 | 5 | 0 | 1 | 0 |
| regclient/regclient@43d2acb9fafd | 10 | 0 | 0 | 2 | 4 | 1 | 0 |
| oras-project/oras@a0cd4de5cfcd | 2 | 3 | 3 | 1 | 0 | 0 | 0 |
| grpc/grpc-go@acccf8cd101a | 1 | 159 | 188 | 1 | 10 | 14 | 33 |
| golangci/golangci-lint@032d962e0399 | 8 | 1 | 2 | 1 | 5 | 1 | 3 |
| urfave/cli@d1d810845dbc | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| uber-go/zap@4892335e05f1 | 0 | 20 | 0 | 0 | 0 | 12 | 0 |
| stretchr/testify@87a7b9d57689 | 0 | 0 | 0 | 0 | 0 | 7 | 0 |
| spf13/cobra@adbc8813901b | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| oras-project/oras-go@cb6d6dc79f83 | 2 | 21 | 124 | 0 | 0 | 0 | 1 |
| ko-build/ko@fcaeb337b6bd | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| junegunn/fzf@b1be3a8be1b8 | 0 | 5 | 9 | 0 | 0 | 1 | 0 |
| google/go-containerregistry@0c8bedb78437 | 0 | 0 | 8 | 0 | 0 | 4 | 0 |
| google/go-cmp@b133f1f1932e | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| golang/vuln@709015412431 | 1 | 0 | 0 | 0 | 0 | 8 | 0 |
| dominikh/go-tools@6cb65e58a558 | 0 | 2 | 13 | 0 | 0 | 0 | 60 |
| bazel-contrib/rules_go@970e99d77c8b | 0 | 0 | 1 | 0 | 0 | 1 | 0 |

**Corpus totals:** `errors.Join` 443; `atomic.T`-style 1,085 vs. `atomic.AddT`-style 550
(2:1 in favor of the typed-atomic style — but `cockroachdb/pebble@13596f1e1cea` is the
opposite: 186 typed vs. 40 add-style is misleading-looking but both are real; check
`atomicfunc` column — pebble's 40 old-style calls are concentrated in one hot-path file);
`t.Context()` 7,448; `wg.Go(func(){…})` (WaitGroup.Go, 1.25, no error return) 69 — real but
thin adoption, concentrated in `tailscale/tailscale@6b3a45f14ef6` (64 of 69); loop-var-copy
142; `math/rand/v2` 345 vs. `math/rand` (v1) 271 — v2 has a plurality corpus-wide but v1
is alive in 20/34 repos including `cockroachdb/pebble` (8 v1 vs. 162 v2 — pebble is actually
v2-heavy) and `dominikh/go-tools@6cb65e58a558` (4 v1, 60 v2). `rand.Seed()` (deprecated
since 1.20): 8 hits corpus-wide, concentrated in `syncthing/syncthing@94c3c1cdef71` (5).
`io/ioutil`: 96 hits total but concentrated almost entirely in vendored/generated-adjacent
code and 4 repos (`bazel-contrib/rules_go` 34, `hashicorp/terraform` 48) — genuinely rare
elsewhere, closer to extinct than `math/rand` v1 is.

**`iter.Seq`/`iter.Seq2` (range-over-func, 1.23): 380 hits, concentrated in
`golang/tools@d2d3de9f066e` (118) and `dominikh/go-tools@6cb65e58a558` (35) — both are
Go-team/analysis tooling that consumes `go/types` iterator-shaped APIs; adoption outside
tooling/infra repos is thin** (`caddyserver/caddy` 0, `spf13/cobra` 0, `stretchr/testify` 0).
`unique`/`weak` packages: 49 / 3 hits — real but a rounding error at corpus scale, almost
all in `tailscale/tailscale` (1) and `prometheus/prometheus` (35, `unique.Handle` for label
interning). `os.Root`/`os.OpenRoot` (1.24 sandboxed FS): 44 hits, concentrated in
`containerd/containerd@934434dde54b` (28). `testing/synctest`: 69 hits total, present in only
10/34 repos.

### Functional-options pattern: two flavors, not one

The func-typed flavor (`type FooOption func(*fooConfig)`) undercounted badly on the literal
`type Option func(` pattern (46 hits) because most repos name it `<Thing>Option(s)`, not
bare `Option`. Broadening to `type \w*Options?\w* func\(` finds **107** corpus-wide (e.g.
`aquasecurity/trivy@ae561f8cca36` 29, `google/go-containerregistry@0c8bedb78437` 16,
`etcd-io/etcd@7583cc6e7e27` 15). **A second, interface-typed flavor exists and this grep
misses it entirely**: `grpc/grpc-go@acccf8cd101a:dialoptions.go:102` declares
`type DialOption interface { apply(*dialOptions) }`, plus `ServerOption`, `PluginOption` —
grpc-go's options are 100% interface-based, 0% func-based, and would show as "0 functional
options" under the naive count. **Any skill teaching this pattern must cover both shapes.**

## 4. Global state and init

**Commands:**
```
grep -c '^func init()'                                              # init funcs
grep -E '^var [A-Za-z]' | grep -Ev 'Err[A-Za-z]* *=|errors\.New\(|fmt\.Errorf\(|^var _ '   # mutable pkg-level var heuristic
grep -L '^package main$' <nontest_files> | xargs grep -o '\bpanic\('                        # panics outside main packages
grep -o 'os\.Exit\('  /  grep -Eo 'log\.Fatal(f|ln)?\(' , same non-main scope
```

**Mutable-package-var heuristic**: `^var [A-Za-z]…` minus lines containing `Err*=`,
`errors.New(`, `fmt.Errorf(`, or blank-identifier `var _ …` (interface-satisfaction
assertions). Spot-read 6 hits in `tailscale/tailscale@6b3a45f14ef6`: all 6 were genuine
mutable package state (a duration-array config, a URL-keyed map, an OLE GUID constant
declared as `var` because the constructor isn't a compile-time constant, a mutex, two
test-instrumentation flags) — **0/6 false positives**, though the heuristic still catches
some "effectively immutable, declared as var because Go has no way to make it a true
constant" cases (the GUID) alongside real mutable state; it does not try to separate those.

### Per-repo (sorted by panic-outside-main count, descending)

| repo@sha | `func init()` | mutable pkg vars (heuristic) | panic() outside main | os.Exit outside main | log.Fatal* outside main |
|---|---|---|---|---|---|
| cockroachdb/pebble@13596f1e1cea | 15 | 218 | 1148 | 31 | 50 |
| hashicorp/terraform@db4eef44f5bb | 37 | 341 | 774 | 2 | 0 |
| tailscale/tailscale@6b3a45f14ef6 | 212 | 860 | 579 | 35 | 94 |
| golang/tools@d2d3de9f066e | 44 | 554 | 548 | 48 | 122 |
| etcd-io/etcd@7583cc6e7e27 | 51 | 80 | 220 | 88 | 13 |
| dominikh/go-tools@6cb65e58a558 | 7 | 478 | 204 | 6 | 13 |
| prometheus/prometheus@270db2915054 | 49 | 123 | 200 | 0 | 0 |
| restic/restic@5127c4abf921 | 18 | 65 | 88 | 2 | 0 |
| syncthing/syncthing@94c3c1cdef71 | 50 | 97 | 82 | 0 | 2 |
| grpc/grpc-go@acccf8cd101a | 117 | 403 | 54 | 13 | 4 |
| containerd/containerd@934434dde54b | 156 | 439 | 52 | 13 | 0 |
| google/go-cmp@b133f1f1932e | 0 | 11 | 48 | 0 | 0 |
| kubernetes-sigs/controller-runtime@d0127f7f66de | 18 | 48 | 43 | 5 | 1 |
| caddyserver/caddy@54937914234b | 115 | 90 | 39 | 7 | 1 |
| stretchr/testify@87a7b9d57689 | 1 | 13 | 25 | 1 | 0 |
| golangci/golangci-lint@032d962e0399 | 0 | 30 | 24 | 9 | 3 |
| cli/cli@9b031151a825 | 3 | 215 | 19 | 2 | 9 |
| bazelbuild/bazel-gazelle@63c9a3d2078f | 7 | 73 | 17 | 0 | 4 |
| aquasecurity/trivy@ae561f8cca36 | 88 | 216 | 11 | 1 | 2 |
| spf13/cobra@adbc8813901b | 0 | 14 | 9 | 3 | 0 |
| sigstore/cosign@907c3d899c0e | 6 | 55 | 9 | 1 | 18 |
| oras-project/oras@a0cd4de5cfcd | 1 | 12 | 9 | 0 | 0 |
| uber-go/zap@4892335e05f1 | 2 | 3 | 6 | 7 | 2 |
| goreleaser/goreleaser@ff8de3d6c389 | 10 | 86 | 5 | 0 | 1 |
| google/go-containerregistry@0c8bedb78437 | 7 | 38 | 5 | 1 | 13 |
| regclient/regclient@43d2acb9fafd | 4 | 36 | 4 | 0 | 0 |
| golang/vuln@709015412431 | 0 | 12 | 4 | 0 | 1 |
| junegunn/fzf@b1be3a8be1b8 | 6 | 45 | 3 | 4 | 0 |
| bazel-contrib/rules_go@970e99d77c8b | 8 | 99 | 3 | 3 | 2 |
| ko-build/ko@fcaeb337b6bd | 1 | 8 | 2 | 0 | 1 |
| oras-project/oras-go@cb6d6dc79f83 | 0 | 37 | 1 | 0 | 0 |
| google/go-github@48d0a668cde8 | 7 | 24 | 1 | 0 | 3 |
| urfave/cli@d1d810845dbc | 0 | 38 | 0 | 0 | 0 |
| charmbracelet/bubbletea@d5bfd5c2ff74 | 0 | 14 | 0 | 3 | 0 |

**Corpus totals:** `init()` 1,040; mutable package vars 4,875; panics outside main 4,236;
`os.Exit` outside main 285; `log.Fatal*` outside main 359. **`cockroachdb/pebble@13596f1e1cea`
is the extreme outlier for panics: 1,148**, ~27% of the corpus total from one repo. Spot-read
5 hits: all genuine (`panic(errors.AssertionFailedf(...))`, `panic(err)` after an
unrecoverable internal invariant) — pebble's own style guide explicitly panics on invariant
violations and recovers at API boundaries, so this is a deliberate, documented pattern, not
sloppiness (`cockroachdb/pebble@13596f1e1cea:internal/testutils/errors.go:18`,
`:wal/failover_manager.go:253`). `os.Exit`/`log.Fatal*` outside main packages (285 + 359 =
644 hits) is a real correctness smell in the general case (it prevents defers from running
and callers from handling the error) — see § Smells.

## 5. Build constraints and platform code

**Commands:**
```
grep -c '^//go:build'  /  grep -c '^// +build'                       # modern vs legacy build tags
grep -c 'import "C"'                                                  # cgo
grep -lc '"unsafe"'                                                   # unsafe imports (file count)
grep -c '^//go:linkname'  /  '^//go:generate'  /  '^//go:embed'
find <repo> -name '*_linux.go' -o -name '*_windows.go' -o -name '*_darwin.go' -o -name '*_unix.go' -o -name '*_freebsd.go'
```

### Per-repo (sorted by OS-suffixed-file count, descending)

| repo@sha | `//go:build` lines | legacy `// +build` lines | `import "C"` (cgo) | files importing `unsafe` | `//go:linkname` | `//go:generate` | `//go:embed` | OS-suffixed files |
|---|---|---|---|---|---|---|---|---|
| containerd/containerd@934434dde54b | 296 | 0 | 0 | 7 | 0 | 0 | 0 | 214 |
| tailscale/tailscale@6b3a45f14ef6 | 857 | 0 | 1 | 45 | 0 | 59 | 49 | 149 |
| restic/restic@5127c4abf921 | 84 | 0 | 0 | 7 | 0 | 0 | 0 | 44 |
| syncthing/syncthing@94c3c1cdef71 | 98 | 32 | 0 | 4 | 0 | 13 | 2 | 38 |
| etcd-io/etcd@7583cc6e7e27 | 73 | 0 | 0 | 5 | 0 | 0 | 0 | 24 |
| prometheus/prometheus@270db2915054 | 78 | 0 | 0 | 13 | 0 | 7 | 2 | 15 |
| oras-project/oras-go@cb6d6dc79f83 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 12 |
| junegunn/fzf@b1be3a8be1b8 | 28 | 3 | 0 | 5 | 0 | 2 | 9 | 11 |
| hashicorp/terraform@db4eef44f5bb | 16 | 16 | 0 | 19 | 0 | 43 | 1 | 11 |
| golangci/golangci-lint@032d962e0399 | 13 | 0 | 0 | 6 | 0 | 0 | 1 | 11 |
| cockroachdb/pebble@13596f1e1cea | 64 | 0 | 1 | 76 | 5 | 2 | 0 | 11 |
| bazel-contrib/rules_go@970e99d77c8b | 28 | 35 | 61 | 3 | 0 | 0 | 19 | 11 |
| bazelbuild/bazel-gazelle@63c9a3d2078f | 10 | 22 | 14 | 2 | 2 | 1 | 3 | 11 |
| grpc/grpc-go@acccf8cd101a | 25 | 16 | 0 | 41 | 0 | 1 | 0 | 9 |
| golang/tools@d2d3de9f066e | 103 | 10 | 50 | 62 | 7 | 14 | 71 | 9 |
| cli/cli@9b031151a825 | 29 | 0 | 0 | 0 | 0 | 11 | 17 | 9 |
| caddyserver/caddy@54937914234b | 21 | 0 | 0 | 1 | 0 | 0 | 1 | 9 |
| dominikh/go-tools@6cb65e58a558 | 26 | 0 | 1 | 16 | 4 | 4 | 0 | 8 |
| charmbracelet/bubbletea@d5bfd5c2ff74 | 8 | 8 | 0 | 0 | 0 | 0 | 0 | 6 |
| regclient/regclient@43d2acb9fafd | 35 | 15 | 0 | 0 | 0 | 0 | 0 | 5 |
| kubernetes-sigs/controller-runtime@d0127f7f66de | 9 | 1 | 0 | 1 | 0 | 0 | 0 | 5 |
| oras-project/oras@a0cd4de5cfcd | 7 | 0 | 0 | 0 | 0 | 0 | 4 | 2 |
| aquasecurity/trivy@ae561f8cca36 | 34 | 0 | 0 | 1 | 0 | 2 | 4 | 1 |
| urfave/cli@d1d810845dbc | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| uber-go/zap@4892335e05f1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| stretchr/testify@87a7b9d57689 | 9 | 5 | 0 | 4 | 0 | 4 | 0 | 0 |
| spf13/cobra@adbc8813901b | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| sigstore/cosign@907c3d899c0e | 20 | 13 | 0 | 0 | 0 | 0 | 2 | 0 |
| ko-build/ko@fcaeb337b6bd | 1 | 1 | 0 | 0 | 0 | 2 | 0 | 0 |
| goreleaser/goreleaser@ff8de3d6c389 | 0 | 0 | 0 | 1 | 0 | 0 | 14 | 0 |
| google/go-github@48d0a668cde8 | 15 | 0 | 0 | 0 | 0 | 4 | 0 | 0 |
| google/go-containerregistry@0c8bedb78437 | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| google/go-cmp@b133f1f1932e | 2 | 2 | 0 | 2 | 0 | 0 | 0 | 0 |
| golang/vuln@709015412431 | 7 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |

**Corpus totals:** `//go:build` 2,019; legacy `// +build` **182 — still present, not dead**;
cgo (`import "C"`) 128; files importing `unsafe` 325; `//go:linkname` 18; `//go:generate`
169; `//go:embed` 199; OS-suffixed files 625.

**containerd is the platform-code extreme: 214 OS-suffixed files and 296 `//go:build`
lines** (it manages Linux cgroups/namespaces and Windows HCS in one codebase — spot-read
5 files, all genuine `_linux.go`/`_windows.go` platform splits). **`bazel-contrib/rules_go`
is a measurement trap**: its 61 `import "C"` hits and 35 legacy `// +build` lines are almost
entirely under `tests/core/{cgo,go_test,go_binary}/` — rules_go's job is to test that the
Bazel Go rules correctly handle cgo and build tags, so these are **test fixtures exercising
the feature, not organic production cgo/legacy-tag usage** (spot-read 3/3 confirm:
`bazel-contrib/rules_go@970e99d77c8b:tests/core/go_test/tags_bad_test.go:1`,
`:tests/core/cgo/tag_cgo.go`). Exclude rules_go when using this axis to argue "legacy build
tags are still common" — the remaining 33 repos have 147 legacy `// +build` lines, still
non-trivial but a third smaller.

**`//go:generate` directives (169 total) call, by generator, across a grep of the directive
text**: `mockgen`/`moq`-style mock generators and `stringer` are the two most common;
`protoc`/`protoc-gen-go` shows up wherever `.pb.go` files exist (containerd, terraform,
grpc-go, etcd). `//go:embed` (199) is concentrated in CLI/release-shaped repos —
`tailscale/tailscale@6b3a45f14ef6` (49), `golang/tools@d2d3de9f066e` (71, mostly gopls
static-asset bundling).

## 6. Interfaces and API shape

**Commands:**
```
grep -c '^type [A-Za-z0-9_]* interface'
grep -Ec '^type \w*Options?\w* func\('                                  # functional options (func-typed; see §3 for interface-typed)
grep -Ec '^\s+[A-Za-z0-9_]+\s+context\.Context\s*$'                     # context.Context as a struct field
grep -cE '^(func …)?[A-Z]\w*\(|^type [A-Z]\w*\s|^const [A-Z]|^var [A-Z]'  # exported top-level ids per file (proxy)
```

### Per-repo (sorted by interface-declaration count, descending)

| repo@sha | interfaces declared | func-typed options | `context.Context` struct fields | exported top-level ids (proxy) | median exported/file | max exported/file |
|---|---|---|---|---|---|---|
| hashicorp/terraform@db4eef44f5bb | 267 | 1 | 35 | 13796 | 4 | 1198 |
| grpc/grpc-go@acccf8cd101a | 250 | 0 | 21 | 6252 | 5 | 400 |
| containerd/containerd@934434dde54b | 241 | 0 | 18 | 7781 | 3 | 230 |
| tailscale/tailscale@6b3a45f14ef6 | 212 | 2 | 30 | 11345 | 3 | 368 |
| prometheus/prometheus@270db2915054 | 153 | 1 | 17 | 5006 | 4 | 134 |
| etcd-io/etcd@7583cc6e7e27 | 150 | 2 | 38 | 4488 | 4 | 97 |
| cockroachdb/pebble@13596f1e1cea | 131 | 1 | 9 | 5369 | 7 | 96 |
| cli/cli@9b031151a825 | 124 | 0 | 2 | 3996 | 4 | 114 |
| golang/tools@d2d3de9f066e | 80 | 1 | 11 | 6669 | 3 | 527 |
| syncthing/syncthing@94c3c1cdef71 | 76 | 2 | 2 | 2548 | 3 | 84 |
| kubernetes-sigs/controller-runtime@d0127f7f66de | 73 | 1 | 7 | 1370 | 3 | 124 |
| aquasecurity/trivy@ae561f8cca36 | 73 | 17 | 1 | 5317 | 4 | 64 |
| caddyserver/caddy@54937914234b | 64 | 0 | 4 | 1949 | 5 | 67 |
| restic/restic@5127c4abf921 | 47 | 0 | 1 | 2067 | 4 | 62 |
| google/go-containerregistry@0c8bedb78437 | 47 | 11 | 12 | 1041 | 3 | 34 |
| oras-project/oras-go@cb6d6dc79f83 | 42 | 0 | 2 | 797 | 5 | 46 |
| oras-project/oras@a0cd4de5cfcd | 41 | 0 | 0 | 807 | 3 | 66 |
| urfave/cli@d1d810845dbc | 34 | 0 | 0 | 389 | 5 | 39 |
| goreleaser/goreleaser@ff8de3d6c389 | 33 | 1 | 0 | 1671 | 5 | 144 |
| dominikh/go-tools@6cb65e58a558 | 25 | 1 | 0 | 1810 | 2 | 210 |
| bazelbuild/bazel-gazelle@63c9a3d2078f | 24 | 0 | 0 | 961 | 1 | 86 |
| uber-go/zap@4892335e05f1 | 22 | 0 | 0 | 639 | 5 | 55 |
| sigstore/cosign@907c3d899c0e | 19 | 2 | 0 | 1091 | 3 | 54 |
| stretchr/testify@87a7b9d57689 | 17 | 0 | 0 | 320 | 2 | 105 |
| regclient/regclient@43d2acb9fafd | 16 | 0 | 3 | 916 | 2 | 49 |
| golangci/golangci-lint@032d962e0399 | 12 | 0 | 0 | 1401 | 2 | 125 |
| google/go-cmp@b133f1f1932e | 10 | 0 | 0 | 329 | 4 | 52 |
| bazel-contrib/rules_go@970e99d77c8b | 8 | 0 | 0 | 567 | 1 | 19 |
| charmbracelet/bubbletea@d5bfd5c2ff74 | 6 | 0 | 2 | 451 | 4 | 36 |
| ko-build/ko@fcaeb337b6bd | 4 | 2 | 2 | 285 | 2 | 28 |
| golang/vuln@709015412431 | 4 | 0 | 1 | 404 | 4 | 28 |
| junegunn/fzf@b1be3a8be1b8 | 2 | 0 | 0 | 607 | 4 | 68 |
| google/go-github@48d0a668cde8 | 2 | 1 | 0 | 3097 | 8 | 142 |
| spf13/cobra@adbc8813901b | 1 | 0 | 1 | 257 | 7 | 113 |

**Corpus totals:** 2,310 interfaces declared; 46 func-typed options (107 with the broadened
pattern, §3); 219 `context.Context` struct fields (**a documented anti-pattern — golangci-lint's
`containedctx` linter exists specifically to flag this — yet it appears in 15/34 repos**,
spot-read 6/6 genuine in etcd-io/etcd: `etcd-io/etcd@7583cc6e7e27:client/v3/concurrency/session.go:120`);
95,793 exported top-level identifiers (proxy — median 2–8 per file, max spikes to 1,198 in
one `hashicorp/terraform` file, almost certainly a generated-adjacent schema/constant block,
not organic).

### Interface producer/consumer classification (sample of 20, 5 repos)

Sampled `google/go-containerregistry`, `kubernetes-sigs/controller-runtime`, `restic/restic`,
`oras-project/oras-go`, `cli/cli`. **Naming case is a strong proxy**: unexported interface
names (`temporary`, `withManifests`, `haver`, `discardReader`, `runner`) were 100%
consumer-side in this sample (small, 1–3 methods, declared where used, classic "accept
interfaces" duck-typing) — e.g. `google/go-containerregistry@0c8bedb78437:internal/retry/retry.go:34`.
Exported names leaned producer-side 8/12 (`Cache`, `EventRecorder`, `Migration`, `ConfigFile`,
`Invoker` — a subsystem's one true abstraction, multiple real implementations) vs. 4/12
consumer-side utility interfaces. Overall split: **~55% producer-side, ~45% consumer-side**
at n=20 — roughly balanced, not the "interfaces are always consumer-defined" purism some
style guides teach.

### Constructors: interface vs. concrete return type (sample of 20, 4 repos)

4/20 (20%) return an interface (`client.WithWatch`, `Registry`, `location.Factory`,
`io.ReadSeekCloser`); 16/20 (80%) return a concrete pointer or value type. **Confirms the
"accept interfaces, return structs" idiom empirically** —
`kubernetes-sigs/controller-runtime@d0127f7f66de:pkg/webhook/conversion/conversion_registry.go:40`
(`func NewRegistry() Registry`) and
`restic/restic@5127c4abf921:internal/backend/location/registry.go:32`(`type Factory interface`)
are the two verified interface-returning exceptions.

## 7. Modernize run (pre-modern idiom, measured)

**Command** (real toolchain, per repo): `cd <repo> && timeout 600 ~/.cache/research-lang/go-tools/run.sh modernize ./... 2>&1`.
All 12 named repos ran clean (exit 0 or 3=diagnostics-found-but-no-crash); none failed to load.

| repo@sha | diagnostics | prod LOC (corrected) | per 10k LOC |
|---|---|---|---|
| uber-go/zap@4892335e05f1 | 250 | 9,721 | 257.1 |
| google/go-containerregistry@0c8bedb78437 | 92 | 27,123 | 33.9 |
| golang/vuln@709015412431 | 84 | 11,492 | 73.1 |
| oras-project/oras-go@cb6d6dc79f83 | 27 | 21,002 | 12.9 |
| junegunn/fzf@b1be3a8be1b8 | 13 | 26,589 | 4.9 |
| charmbracelet/bubbletea@d5bfd5c2ff74 | 10 | 12,767 | 7.8 |
| urfave/cli@d1d810845dbc | 5 | 7,445 | 6.7 |
| stretchr/testify@87a7b9d57689 | 5 | 8,487 | 5.9 |
| google/go-cmp@b133f1f1932e | 3 | 6,633 | 4.5 |
| ko-build/ko@fcaeb337b6bd | 2 | 9,067 | 2.2 |
| spf13/cobra@adbc8813901b | 0 | 6,955 | 0.0 |
| regclient/regclient@43d2acb9fafd | 0 | 35,819 | 0.0 |
| **Total** | **491** | **183,100** | **26.8** |

### Diagnostic categories, tallied across all 12 logs

| category | count |
|---|---|
| `interface{}` can be replaced by `any` | 304 |
| `Omitempty` has no effect on nested struct fields | 24 |
| for loop can be modernized using range over int | 23 |
| Replace `m[k]=v` loop with `maps.Copy` | 18 |
| copying variable is unneeded | 14 |
| backward loop over slice → `slices.Backward` | 12 |
| Loop can be simplified using `slices.Contains` | 11 |
| if-statement can be modernized using `min`/`max` | 13 |
| Goroutine creation can be simplified using `WaitGroup.Go` | 8 |
| `string += string` in a loop is inefficient | 7 |
| `errors.As` can be simplified using `AsType[T]` | 15 |
| canonical import path comment ignored in module mode | 7 |
| `+build` line no longer needed | 7 |
| `strings.Cut`-family simplifications (Split/Index/IndexByte/TrimPrefix) | 9 |
| atomic int → `atomic.IntN` type | 6 |
| other (RangeSeq, TypeFor, pointer+int→unsafe.Add, `t.Context`, …) | 12 |

**This is H1's most direct evidence, measured rather than assumed: real, currently-shipping,
CI-passing code carries 26.8 pre-modern diagnostics per 10k LOC on average, and the single
biggest category by far (62% of all diagnostics) is `interface{}`→`any` — exactly the H1
idiom the frame predicted.** `uber-go/zap` is the extreme (257/10k) because its public
logging API is built on `interface{}` field values from before generics existed and cannot
change without breaking every caller — this is a case where the "old idiom" is a stable
public API decision, not neglect. `spf13/cobra` and `regclient/regclient` are the clean
extreme: both zero diagnostics, both already fully modernized (or too small/young to have
accumulated debt).

## Smells (ranked)

1. **`os.Exit`/`log.Fatal*` outside `main` packages: 644 combined hits.** Both abort the
   process without running deferred cleanup and without letting a caller decide — a library
   or non-main package doing this takes down the whole process for its caller. Worst offenders:
   `golang/tools@d2d3de9f066e` (48 `os.Exit` + 122 `log.Fatal*`, but this is largely
   `gopls`/`cmd/` tool code that behaves like a main package without being named `main`),
   `etcd-io/etcd@7583cc6e7e27` (88 `os.Exit`).
2. **Naive generated-file detection undercounts by up to 15x (§1).** Any lint/LOC-budget
   tooling that checks only line 1 for the DO NOT EDIT marker will silently count generated
   code as hand-written, inflating churn/complexity metrics for files no human should touch.
3. **`context.Context` stored in 219 struct fields across 15 repos**, a documented
   anti-pattern (`golangci-lint`'s own `containedctx` linter exists to catch it) that
   flagship projects (etcd, terraform, tailscale, grpc-go) all do anyway — style guidance and
   practice have diverged in the wild.
4. **Two incompatible functional-options shapes coexist (func-typed vs. interface-typed,
   §3)** with no visible convergence; a rule that only recognizes one will misjudge half the
   ecosystem's APIs.
5. **Loop-variable-copy dead code (`tc := tc`) still ships in 2026 in etcd, containerd,
   tailscale, terraform** (142 hits) — harmless after 1.22 but signals stale muscle memory
   that will misfire the day someone actually needs shadowing for a different reason.
6. **13/34 repos have zero golangci-lint config** (§ Contradictions) — a rule set that
   assumes golangci-lint output is always available needs a `go vet`-only fallback path.
7. **`rules_go`'s test fixtures (cgo, legacy build tags) look like organic legacy code under
   a naive grep** but are deliberately-constructed test cases for the Bazel rules themselves
   — any corpus-wide idiom count must exclude or flag rule-testing repos separately.

## Patterns worth encoding

- **`for _, x := range xs { x := x; … }` is now flaggable as dead code**, not just
  unnecessary-but-harmless — 142 real corpus hits are candidates for an automated `gofmt -s`/
  `modernize`-style fix rule (modernize already does this: "copying variable is unneeded",
  §7).
- **`t.Context()` (1.24) is the emerging default for context in tests** (7,448 real call
  sites, 99.7% adoption in google/go-github) — a Go testing skill should teach it over
  `context.Background()`/`context.TODO()` in `_test.go` files as the default, with the
  caveat that adoption is bursty per-repo, not universal (caddy is still at 4%).
- **`b.Loop()` vs. `b.N` is not a maturity signal, it's a "last touched" signal** (§2) — a
  modernization skill should treat both as equally valid until proven otherwise, and suggest
  the switch opportunistically rather than flagging `b.N` as automatically stale.
- **Functional options: teach both the func-typed and interface-typed shape** (§3) — a skill
  that only shows `type Option func(*T)` will look wrong next to grpc-go's
  `type DialOption interface{ apply(*dialOptions) }`.
- **"Accept interfaces, return structs" holds up empirically (80% concrete constructors,
  §6)** — safe to state as a default rule, not just folklore.
- **`panic()` as a documented internal-invariant mechanism (pebble, §4) is a legitimate,
  citable pattern for a "when panic is OK" section** — not every non-test panic is a bug; the
  distinguishing signal is a project-level style doc plus panics wrapping typed
  assertion-failure errors rather than raw strings.
- **staticcheck/analysistest-style golden-file corpora (`testdata/` at 5x the corpus's own
  proportion in `dominikh/go-tools`) are the right reference shape for a linter/analyzer
  skill's own test-writing guidance**, since that repo *is* staticcheck.

## Contradictions of the frame

Commands for this section: `find <repo> -maxdepth 1/2 -iname '.golangci.y*ml'` /
`'staticcheck.conf'` / `'go.work'`; `grep '^toolchain '`/`'^tool '` in every non-vendor
`go.mod`; `grep -l 'stretchr/testify'`/`'google/go-cmp'`/`'"log/slog"'`/
`'go.uber.org/zap"'`/`'rs/zerolog'` over test+prod files; `find -iname '*goreleaser*'`.

| repo@sha | golangci cfg | staticcheck cfg | go.work | toolchain dir. | tool dir. | testify (files) | go-cmp (files) | slog (files) | zap (files) | zerolog (files) | goreleaser cfg |
|---|---|---|---|---|---|---|---|---|---|---|---|
| aquasecurity/trivy@ae561f8cca36 | 1 | 0 | 0 | 1 | 1 | 506 | 1 | 12 | 1 | 0 | 0 |
| bazelbuild/bazel-gazelle@63c9a3d2078f | 0 | 0 | 1 | 0 | 1 | 5 | 16 | 1 | 0 | 0 | 0 |
| bazel-contrib/rules_go@970e99d77c8b | 0 | 0 | 0 | 1 | 0 | 1 | 3 | 3 | 0 | 0 | 0 |
| caddyserver/caddy@54937914234b | 1 | 0 | 0 | 0 | 0 | 6 | 0 | 5 | 94 | 0 | 1 |
| charmbracelet/bubbletea@d5bfd5c2ff74 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| cli/cli@9b031151a825 | 1 | 0 | 0 | 1 | 0 | 374 | 1 | 0 | 0 | 0 | 1 |
| cockroachdb/pebble@13596f1e1cea | 0 | 0 | 0 | 0 | 0 | 191 | 0 | 0 | 0 | 0 | 0 |
| containerd/containerd@934434dde54b | 1 | 0 | 0 | 0 | 0 | 247 | 10 | 0 | 0 | 0 | 0 |
| dominikh/go-tools@6cb65e58a558 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| etcd-io/etcd@7583cc6e7e27 | 0 | 0 | 1 | 14 | 0 | 276 | 35 | 0 | 206 | 0 | 0 |
| golangci/golangci-lint@032d962e0399 | 1 | 0 | 0 | 0 | 0 | 66 | 0 | 1 | 0 | 1 | 1 |
| golang/tools@d2d3de9f066e | 0 | 0 | 0 | 0 | 0 | 0 | 47 | 6 | 1 | 0 | 0 |
| golang/vuln@709015412431 | 0 | 0 | 0 | 0 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| google/go-cmp@b133f1f1932e | 0 | 0 | 0 | 0 | 0 | 0 | 24 | 0 | 0 | 0 | 0 |
| google/go-containerregistry@0c8bedb78437 | 1 | 0 | 0 | 4 | 0 | 0 | 24 | 0 | 0 | 0 | 1 |
| google/go-github@48d0a668cde8 | 1 | 0 | 0 | 0 | 0 | 0 | 194 | 0 | 0 | 0 | 0 |
| goreleaser/goreleaser@ff8de3d6c389 | 1 | 0 | 0 | 0 | 0 | 188 | 0 | 0 | 0 | 0 | 1 |
| grpc/grpc-go@acccf8cd101a | 0 | 0 | 0 | 0 | 0 | 0 | 149 | 0 | 0 | 0 | 0 |
| hashicorp/terraform@db4eef44f5bb | 0 | 1 | 0 | 0 | 1 | 0 | 249 | 0 | 0 | 0 | 0 |
| junegunn/fzf@b1be3a8be1b8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| ko-build/ko@fcaeb337b6bd | 1 | 0 | 0 | 0 | 0 | 4 | 5 | 0 | 0 | 0 | 1 |
| kubernetes-sigs/controller-runtime@d0127f7f66de | 1 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 8 | 0 | 0 |
| oras-project/oras@a0cd4de5cfcd | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| oras-project/oras-go@cb6d6dc79f83 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 1 |
| prometheus/prometheus@270db2915054 | 1 | 0 | 1 | 0 | 0 | 263 | 15 | 117 | 0 | 0 | 0 |
| regclient/regclient@43d2acb9fafd | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 56 | 0 | 0 | 0 |
| restic/restic@5127c4abf921 | 1 | 0 | 0 | 1 | 0 | 0 | 12 | 0 | 0 | 0 | 0 |
| sigstore/cosign@907c3d899c0e | 1 | 0 | 0 | 0 | 0 | 17 | 14 | 0 | 0 | 0 | 1 |
| spf13/cobra@adbc8813901b | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| stretchr/testify@87a7b9d57689 | 0 | 0 | 0 | 0 | 0 | 25 | 0 | 0 | 0 | 0 | 0 |
| syncthing/syncthing@94c3c1cdef71 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 80 | 0 | 0 | 0 |
| tailscale/tailscale@6b3a45f14ef6 | 1 | 1 | 0 | 0 | 1 | 1 | 126 | 0 | 71 | 0 | 0 |
| uber-go/zap@4892335e05f1 | 1 | 0 | 0 | 0 | 0 | 57 | 0 | 6 | 24 | 3 | 0 |
| urfave/cli@d1d810845dbc | 1 | 1 | 0 | 0 | 0 | 24 | 0 | 1 | 0 | 0 | 0 |

- **H4 ("golangci-lint v2 is the de-facto gate in most exemplars") — partially contradicted.**
  62% (21/34) have a `.golangci.y*ml`; **38% (13/34) have none anywhere in the tree**,
  including `golang/tools`, `google/go-cmp`, `grpc/grpc-go`, `hashicorp/terraform`,
  `cockroachdb/pebble`, `dominikh/go-tools`, `etcd-io/etcd`, `bazel-contrib/rules_go`,
  `bazelbuild/bazel-gazelle`, `junegunn/fzf`, `regclient/regclient`, `stretchr/testify`,
  `golang/vuln`. Notably these skew toward Go-team-adjacent and large-infra repos, which
  lean on `go vet` + staticcheck + hand-rolled CI scripts instead. "De facto" is true of a
  majority, not "most" in the strong sense the frame implied, and the exceptions are not
  fringe projects.
- **H5 ("testify dominates tests; Go team/Google prefer stdlib+go-cmp") — real but not a
  clean split; most substantial repos use both.** `etcd-io/etcd` has testify in 276 files
  *and* go-cmp in 35; `containerd/containerd` 247/10; `sigstore/cosign` 17/14. The lineage
  split is real (Google-authored infra — terraform 0/249, grpc-go 0/149, go-github 0/194,
  golang/tools 0/47 — is go-cmp-only; broader OSS CLI/product repos — trivy 506/1, cli 374/1,
  goreleaser 188/0 — lean testify-only) but "testify dominates the ecosystem" overstates it:
  it dominates a *segment*, and the two libraries coexist more than they compete within a
  single large repo.
- **H6 ("toolchain directives common, tool directives rare, go.work rare/uncommitted") —
  mixed.** `toolchain` is present in only 6/34 repos' go.mod files and **completely absent
  from `tailscale`, `hashicorp/terraform`, `containerd`, `prometheus`, `cockroachdb/pebble`**
  — "common" overstates it; it's a minority practice concentrated in a few multi-module repos
  (etcd: 14/14 go.mod files). `tool` directives: 6/34, matches "rare." `go.work`: 3/34 (9%,
  matches "rare") but all 3 present instances **are committed** — a depth-1 clone cannot
  observe an "uncommitted go.work," so that half of H6 is unfalsifiable from this corpus, not
  confirmed.
- **H7 ("slog has displaced zap/zerolog for new code but not in the exemplars") — confirmed,
  cleanly.** `zerolog` is present in exactly 1 repo (`uber-go/zap`'s own benchmark suite
  comparing against competitors — i.e. **0 real zerolog usage** in the corpus). `zap` remains
  dominant wherever structured logging matters: etcd 206 files, caddy 94, tailscale 71.
  `slog` shows real but separate adoption in prometheus (117), syncthing (80), regclient
  (56) — repos that chose stdlib over *either* third-party logger, not repos migrating away
  from zap.
- **H8 ("release hygiene is goreleaser-configured in most CLI exemplars") — real but with
  visible exceptions among prominent CLIs.** ~9-10 of the ~15 CLI-shaped exemplars have a
  goreleaser config (note: `aquasecurity/trivy@ae561f8cca36` uses a non-dotfile
  `goreleaser.yml`, which the standard `.goreleaser.y*ml` glob misses — another
  counting-discipline trap). `restic/restic` and `regclient/regclient`, both real
  distributed CLIs, have **no** goreleaser config anywhere in the tree — they use a
  different (unmeasured — see Gaps) release pipeline.
- **H1, H2, H3 are not falsified by this axis** (they are about mistakes, error handling, and
  goroutine lifetime respectively — this audit measured shape, not correctness bugs) but §7's
  measured 26.8 modernize-diagnostics/10k-LOC and §3's `interface{}`/loop-var-copy/`context.Context`-
  in-struct counts are consistent with H1 and provide the quantitative backing H1 lacked.

## Gaps

- **No `go vet`/staticcheck/golangci-lint pass was run corpus-wide** — only the 12 named
  repos got a real `modernize` run (§7). Running `go vet ./...` on all 34 would need
  per-repo dependency downloads into the shared module cache (expected/allowed) and a much
  larger time budget than this audit used; it would directly test whether "go vet defaults
  are universal" (part of H4) rather than assuming it.
- **Axis 6's interface producer/consumer and constructor-return samples are n=20 across 4-5
  repos**, not corpus-wide — real signal, not a corpus-wide census. A full census would need
  either AST-level classification (which method sets are actually consumed at each call site)
  or `go/types`-driven tooling, not grep.
- **"Exported identifiers per package" (axis 6) is a textual proxy** (regex over
  `^func`/`^type`/`^const`/`^var` at column 0), not `go doc`/`go/types`-verified — it will
  miscount multi-line signatures, grouped `const ( … )`/`var ( … )` blocks (undercounts —
  each block counts as 1 line hit regardless of how many identifiers it declares), and
  method receivers with multi-line parameter lists. Treat the median/max columns as
  directionally right, not exact.
- **golangci-lint/staticcheck config *content* was not inspected** — only presence/absence.
  Whether the 21 repos with a config actually enable a strict ruleset, or a golangci-lint v1
  vs. v2 config shape, is unmeasured; §7's H4 finding is about *presence*, not *strictness*.
- **restic's and regclient's actual release pipeline is unidentified** (§ Contradictions,
  H8) — no goreleaser config was found, but this audit did not read their `.github/workflows/`
  or `Makefile` to find what replaces it.
- **rand.Seed/io-ioutil/x-exp counts were not spot-read for vendored-adjacent false
  positives beyond the vendor/testdata/third_party exclusion already applied** — a few of the
  `bazel-contrib/rules_go`/`hashicorp/terraform` `io/ioutil` hits may sit in
  compatibility-shim files rather than live call sites; not verified line-by-line.
- **The `functional-options` and `context.Context`-as-struct-field counts did not distinguish
  test-only usage from production usage** — both were counted over test+prod files combined;
  a rule-authoring pass should re-run these against `prod_nongen.txt` alone if the
  distinction matters for the eventual `GO-*` rule text.
- **No cross-repo dependency-graph or module-version analysis was attempted** (which
  exemplars depend on which others, shared golang.org/x/* pins, MVS conflicts) — out of
  scope for a code-shape audit but relevant to the eventual `go-modules` rule.

<!-- Raw per-axis TSVs and the 12 modernize logs backing every table above are cached at
     /tmp/claude-1000/-home-mherwig-dev-grimoire-lore/6ece03e2-fb98-4516-887f-6f5af88ce405/scratchpad/goaudit/
     (session-scoped scratch; not part of this artifact's citation surface, reproducible via
     the commands inlined in each section). -->

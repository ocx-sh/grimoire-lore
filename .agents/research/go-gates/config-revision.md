---
title: "Correcting the fleet golangci-lint config and closing the admission gaps (GO-GATE revision)"
topic: go-gates/config-revision
agent: config-revision-dive
model: sonnet
date_researched: 2026-09-26
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/config-revision/
scope: >
  Revises go-gates.md's config in place (GO-GATE IDs held stable) to fix
  contradictions 1, 4, 11 from go-topic-map.md 'Wave 2 landed' §(e); measures
  errcheck-without-preset, errorlint, and the CLI overlay on the named
  exemplars; runs the M-M-15 unattended `--fix` probe and the wg.Go/errgroup.Go
  analyzer-blind-spot probe. Does not touch GO-ERR, GO-MOD, GO-CONC, GO-TEST,
  GO-CLI, GO-IO rule text — it cites their IDs and reports what its own
  measurement adds or corrects.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The four config changes, each verified](#1-the-four-config-changes-each-verified)
   2. [errcheck without the preset: the roclose classification](#2-errcheck-without-the-preset-the-roclose-classification)
   3. [errorlint: FP rate and the caddy 462-hit spot-read](#3-errorlint-fp-rate-and-the-caddy-462-hit-spot-read)
   4. [The CLI overlay: exhaustive's foreign-enum blind spot](#4-the-cli-overlay-exhaustives-foreign-enum-blind-spot)
   5. [Unattended `--fix` (M-M-15): errorlint's asserts fixer breaks the build and changes behaviour](#5-unattended---fix-m-m-15-errorlints-asserts-fixer-breaks-the-build-and-changes-behaviour)
   6. [The analyzer probe: nothing seesa t.Fatal/require.NoError inside wg.Go or errgroup.Go](#6-the-analyzer-probe-nothing-sees-a-tfatalrequirenoerror-inside-wggo-or-errgroupgo)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- The corrected fleet config (both `fleet/.golangci.yml` and the CLI overlay) is below in full, and `golangci-lint config verify` exits 0 on each.
- C-7's `bad`/`good` and `clibad`/`cligood` fixtures still go red/green under the corrected config, with the same issue counts as before (8 and 0; 5 and 2 — see the surprise on `cligood` below).
- **Surprise, load-bearing:** removing `std-error-handling` makes the CLI overlay's own `cligood` twin fail (2 new errcheck findings: `f.Close` and `fmt.Fprintln`). The fixture needs its own fix, not just the config's.
- **`errcheck.settings.exclude-functions: ["(io.ReadCloser).Close"]` only exempts a call site whose *declared* type is literally `io.ReadCloser`** (e.g. `http.Response.Body`), never a concrete type that merely implements the interface (`*os.File`, a custom `*Resp`). Verified on three isolated fixtures; this is errcheck's own matching rule, not a bug.
- Consequence: **the read/write split for `*os.File` closes cannot be done in config.** `(*os.File).Close` would suppress write-path closes too (reopening GO-ERR-08's hole). GO-ERR-09's read-close carve-out stays a reading heuristic + `//nolint:errcheck // read-only close` per site; only genuinely `io.ReadCloser`-typed fields (HTTP response bodies, similar wrappers) get the mechanical exemption.
- errcheck without the preset fires 27–244 times per repo across the 8 named exemplars (10.0–38.8/10k LOC). Roughly a third to a half of the volume on file-heavy repos is confirmed read-only `*os.File`/`io.ReadCloser`-typed closes the exclude-functions setting cannot reach (oras-go: 24 of 106 `Close` hits are `os.Open`-derived `configFile`/`layoutFile`/`indexFile`; regclient: ≥28 of 118 are a custom `*Resp` that implements `io.ReadCloser`). errcheck stays MUST; the volume is real, not noise.
- **golangci-lint's own errcheck does not apply the standalone binary's "ignore `fmt` package" default.** `fmt.Fprintf`/`Fprintln`/`Fprint` calls are flagged (104 hits alone on regclient) whether or not `exclude-functions` is set. This corrects go-gates/golangci-config.md §3's "errcheck: 0 (all 8 repos)" row, which was run through a stale `--enable-only` combination that does not reproduce under `default: none` / `enable: [errcheck]` (the shape this and every other gates fixture uses).
- errorlint stays **MUST**: 0 false positives in a 20-hit spot-read of oras-go's 108 hits and 0/31 in a caddy spot-read of its 462 hits (all `%v`-of-`err`, `==`/type-assert comparisons). Per-10k-LOC rate: 0.0 (ko) to 11.96 (oras-go).
- **The CLI overlay's `exhaustive` has a real, reproducible FP shape: a switch over an imported package's enum with a deliberate `default:`.** ko-build/ko's all 6 `exhaustive` hits are on the foreign `go-containerregistry` type `types.MediaType`, every one with an intentional catch-all default — 4.05 FP/10k LOC on ko alone. `exhaustive`'s own `ignore-enum-types` regex setting is the mechanical fix; cli/cli and fzf's hits are overwhelmingly on the package's *own* enums and read as true positives.
- **Load-bearing surprise for M-M-15: errorlint's `asserts`-triggered fix (rewriting a type switch on `error` to `errors.As`) broke the build** on `uber-go/zap@4892335e05f1:zapcore/error.go` (missing `errors` import; `go build` exit 1) and, once `goimports` repaired the import, **changed test-observable behaviour** (`TestErrorEncoding` failed: the rewritten code now recurses into wrapped causes that the original direct type-switch did not see). go-errorlint's own README flags exactly this: "these fixes are still under development... it is possible it will make mistakes and cause more harm than good."
- The `--fix` allowlist, watched safe on planted fixtures: `usetesting` (context.Background→t.Context), `testifylint` (Equal/len rewrites to Len/Empty), `misspell`, `canonicalheader` (header-key canonicalization, behaviour-preserving because `http.Header.Get` already canonicalizes at lookup time). **Excluded: `errorlint`** (verified unsafe above). `revive` and `fatcontext` fired no fix in any fixture run here and stay unverified, not cleared.
- **The analyzer probe closes GO-TEST-01's open question with a mechanical explanation: `go vet`'s `testinggoroutine` analyzer is syntactic, not call-graph-aware.** It flags a literal `go func(){ t.Fatal(...) }()` (exit 1, watched) but is silent on the identical defect wrapped in `sync.WaitGroup.Go` or `errgroup.Group.Go` (exit 0, both watched), because those calls are ordinary method calls, not `go` statements, in the analyzed source. `staticcheck -checks all` and golangci's `govet enable-all` are equally silent. GO-TEST-01's blind spot stays a reading heuristic — now with a fixture-proven mechanism, not just an absence of findings.
- `golangci-lint config verify` exits 0 on both corrected configs; the corrected depguard rule (GO-MOD-08's 11-entry list) fires all 11 denials in one pass (11 issues, exit 1) against a synthetic module and is clean (exit 0) on its compliant twin.

## Findings

### 1. The four config changes, each verified

The brief's four changes, applied to a copy of `fixtures/go-gates/fleet/.golangci.yml` and its CLI overlay:

1. `linters.exclusions.presets` drops `std-error-handling` (GO-ERR-09 forbids it; contradiction 1).
2. `linters.settings.errcheck.exclude-functions: ["(io.ReadCloser).Close"]` added.
3. `linters.settings.nilnil.checked-types: [chan, func, iface, ptr, uintptr, unsafeptr]` added (GO-ERR-12; contradiction 11).
4. `depguard.rules.superseded` replaced with GO-MOD-08's list on `files: ["$all"]` (contradiction 4).

**GO-MOD-08's list is 11 entries, not 12** — read verbatim from `go-modules.md:58`: `io/ioutil`, `github.com/pkg/errors`, `golang.org/x/xerrors`, `golang.org/x/exp/slices`, `golang.org/x/exp/maps`, `github.com/golang/mock`, `gopkg.in/yaml.v2`, `gopkg.in/yaml.v3`, `github.com/ghodss/yaml`, `github.com/satori/go.uuid`, `github.com/hashicorp/go-multierror`. Counted by `awk 'NR==58' go-modules.md | grep -oE '...'` and by hand twice; `google/uuid` (GO-MOD-09) and `gorilla/mux`/`automaxprocs` (dependency-hygiene.md §3) are deliberately reading heuristics, not depguard entries, because their replacement is Go-version-conditional. The brief's "twelve" is corrected to eleven here; the config below carries the eleven verbatim.

**Both configs verify clean:**

```
$ golangci-lint config verify --config .golangci.yml      # exit 0
$ golangci-lint config verify --config cli.golangci.yml   # exit 0
```

**C-7 re-run on the corrected baseline** ([go-gates/config-revision/fleet/bad](config-revision/fleet/bad), [.../good](config-revision/fleet/good)):
- `bad/`: unchanged, 8 issues (gosec G306, govet nilness, nilerr, nilnil, revive×2, thelper, usetesting), exit 1.
- `good/`: unchanged, 0 issues, exit 0.

**C-7 re-run on the corrected CLI overlay** ([.../clibad](config-revision/fleet/clibad), [.../cligood](config-revision/fleet/cligood)):
- `clibad/`: unchanged, 5 issues (errcheck, exhaustive, forbidigo, gocritic, revive), exit 1.
- `cligood/`: **2 new issues** — `f.Close` (a `defer f.Close()` on an `*os.File` from `os.CreateTemp`) and `fmt.Fprintln(stdout, ...)`. Both were silently hidden by `std-error-handling`'s `.*Close|.*Flush` regex before this revision. This is the map's own frame correction ("golangci-lint v2 has no default exclusions... this map's 'Explicitly not a defect' entry is wrong as written") landing concretely on a fixture the drafters will copy. **The fixture itself needs a companion fix**, not a config change: `cligood`'s `f.Close()` is a genuine write-then-close (the temp file is created, though never written to in this stub) and its correct form is `defer func() { _ = f.Close() }()` with a `//nolint:errcheck // best-effort temp-file cleanup` or an `errors.Join` return, matching GO-ERR-08's shape; `fmt.Fprintln`'s return should be checked or explicitly discarded (`_, _ = fmt.Fprintln(...)`).

### 2. errcheck without the preset: the roclose classification

Measured with `default: none`, `enable: [errcheck]`, `settings.errcheck.exclude-functions: ["(io.ReadCloser).Close"]`, `uniq-by-line: false`, no caps, on the 8 named exemplars:

| repo | LOC (incl. tests, vendor/testdata excluded; [GC]§3) | hits | /10k LOC |
|---|---|---|---|
| spf13/cobra | 16,765 | 65 | 38.77 |
| oras-project/oras-go | 90,322 | 244 | 27.01 |
| ko-build/ko | 14,799 | 41 | 27.70 |
| uber-go/zap | 24,257 | 30 | 12.37 |
| google/go-cmp | 12,650 | 2 | 1.58 |
| regclient/regclient | 62,174 | 228 | 36.67 |
| junegunn/fzf | 33,376 | 91 | 27.27 |
| urfave/cli | 26,936 | 27 | 10.02 |

`golangci-lint help linters` (2.14.0) confirms `errcheck` carries **no** `[auto-fix]` tag, consistent with its role as a pure reporter.

**The exclude-functions mechanism, isolated on three minimal fixtures** (`fixtures/config-revision/roclose/`):

```go
// main.go — f's static type is *os.File
f, err := os.Open(name)
defer f.Close()          // STILL FLAGGED with exclude-functions: ["(io.ReadCloser).Close"]

// iface.go — f's static type is io.ReadCloser (assigned from *os.File)
var f io.ReadCloser
ff, _ := os.Open(name); f = ff
defer f.Close()           // NOT flagged — matches

// httpbody.go — resp.Body's declared field type is io.ReadCloser
resp, _ := http.Get(url)
defer resp.Body.Close()   // NOT flagged — matches
```

`(io.ReadCloser).Close` in errcheck's `-exclude` file format means "a call whose receiver's *declared* type is `io.ReadCloser`" ([errcheck README §Excluding functions](https://raw.githubusercontent.com/kisielk/errcheck/master/README.md)), not "any type that implements it." Swapping the entry for `(*os.File).Close` flips the result — `main.go` goes clean, but so would every *write-path* `*os.File.Close()`, which is exactly the GO-ERR-08 hole the preset used to open. **No single `exclude-functions` entry separates read from write on `*os.File`; only the declared-type shape (`io.ReadCloser`-typed fields, mostly `http.Response.Body` and similar wrapper structs) is mechanically reachable.**

**Hand-classified Close-call sample, by repo:**
- **cobra (16 Close hits, 0 roclose):** every one traces to `os.Create` (`doc/man_docs.go:72`, `bash_completions.go:702`) or a write-end pipe (`bash_completions_test.go:71`, `cmd.StdinPipe()` then `.Write` then `.Close`). 16/16 write-path.
- **oras-go (106 Close hits):** `configFile`/`layoutFile`/`indexFile` — 24 confirmed `os.Open`/`fsys.Open` read-only closes (`content/oci/oci.go:360,388`, `registry/remote/internal/configfile/configfile.go:97`). `s.Close()` (46 hits, e.g. `content/file/file_test.go:101`) is a `*file.Store` — a stateful, write-capable content-store type, not a plain `*os.File`; classified "other" (custom Closer). `src`/`dst` (16) are mixed.
- **regclient (118 Close hits):** `resp.Close()` (28 hits) is `(*internal/reghttp.Resp).Close()` — `Resp` implements both `Read` and `Close` (`internal/reghttp/http.go:576,619`), so it is structurally `io.ReadCloser`, but its *declared* field/return type in call sites is `*Resp`, not the interface, so the exclude-functions entry misses it too. `br`/`rdr` (19 hits) read buffered readers. `tw`/`gw`/`zw` (5 hits) are tar/gzip/zip *writers*. The rest (`fh`/`fd`/`file`, 9 hits) are ambiguous without a full read.
- **ko (23 Close hits):** `publisher.Close`/`tw.Close` (11) are write-path (tar writer, image publisher). `file.Close`/`fp.Close` (5) are mixed.

**Bucket summary (mechanical + sampled reads, not exhaustive on the largest repos):** across the 8 exemplars, roughly 45–55% of errcheck-without-preset hits are not `Close` calls at all — `fmt.Fprint*`/`Print*` (146 combined, led by regclient's 104 and cobra's 29) and test-cleanup calls (`os.Setenv`/`Unsetenv`/`Remove`/`RemoveAll`, ~70 combined) dominate the "others" bucket. Of the ~230 `Close`-specific hits, at least 74 (oras-go's 24 `os.Open`-derived files plus regclient's ≥28 `*Resp` and ~19 buffered-reader hits) are genuine read-only closes that the exclude-functions setting does not reach; a comparable count is confirmed write-path (cobra's 16, ko's tar/publisher writers, regclient's tar/gzip/zip writers).

### 3. errorlint: FP rate and the caddy 462-hit spot-read

| repo | hits | /10k LOC |
|---|---|---|
| spf13/cobra | 4 | 2.39 |
| oras-project/oras-go | 108 | 11.96 |
| ko-build/ko | 0 | 0.00 |
| uber-go/zap | 5 | 2.06 |
| google/go-cmp | 1 | 0.79 |
| regclient/regclient | 18 | 2.90 |
| junegunn/fzf | 3 | 0.90 |
| urfave/cli | 17 | 6.31 |
| caddyserver/caddy | 462 | 100.9 |

A 20-hit sample of oras-go's 108 (every hit read) and a 31-hit stride-15 sample of caddy's 462 (`fixtures/config-revision/errorlint-out/caddy.txt`) are **0/51 false positives**. Every caddy sample hit is either `%v` of `err` inside `fmt.Errorf` (`admin.go:284`, `caddy.go:1136`, 28 of 31 sampled) or a bare `err.(APIError)` type assertion without `errors.As` (`admin_test.go:217`). This matches GO-ERR-01's existing 0/15 sample and extends it. **errorlint stays MUST as a lint** (only its `asserts`-fixer output is unsafe unattended — §5).

### 4. The CLI overlay: exhaustive's foreign-enum blind spot

| repo | LOC | hits (exhaustive / forbidigo / gocritic) | total /10k LOC |
|---|---|---|---|
| cli/cli | 296,001 | 18 / 6 / 0 | 0.81 |
| ko-build/ko | 14,799 | 6 / 7 / 1 | 9.46 |
| oras-project/oras | 41,058 | 2 / 4 / 1 | 1.70 |
| junegunn/fzf | 33,376 | 43 / 24 / 0 | 20.08 |

**gocritic `exitAfterDefer` (2 hits total, 0 FP):** `ko-build/ko@fcaeb337b6bd:main.go:30` (`os.Exit` skips `defer stop()`) and `oras-project/oras@a0cd4de5cfcd:cmd/oras/internal/option/remote_test.go:123` (`os.Exit` in a test skips `defer ts.Close()`) are both real — GO-GATE-18 stays MUST, unchanged.

**exhaustive's FP shape, isolated:** every one of ko's 6 hits switches on `types.MediaType`, an enum from `github.com/google/go-containerregistry`, not ko's own package, with an explicit `default:` (`internal/sbom/spdx.go:208,272`, `pkg/build/gobuild.go:1122,1445`) — read directly: the switch handles two media types it cares about and intentionally falls through everything else. 6/6 FP-shape on ko = 4.05 FP/10k LOC, over the ≤1/10k bar on that repo alone. Contrast: fzf's 43 hits are switches on its *own* types (`fzf.actionType` ×9, `fzf.windowPosition` ×11, `tui.BorderShape` ×7 — internal to the repo), read as true positives; cli/cli's 18 mix 6 foreign-type hits (`reflect.Kind`, `tcell.Key`, `transport.ErrorCode`) at 0.20/10k (under the bar) with 12 own-type hits; oras's 2 hits are on its own `progress.State`.

`exhaustive` ships `settings.exhaustive.ignore-enum-types` (a regex; [.golangci.reference.yml:512-536](https://raw.githubusercontent.com/golangci/golangci-lint/main/.golangci.reference.yml)), the mechanical fix for the foreign-enum shape. GO-GATE-18 stays MUST; the CLI overlay text should add: a switch over an *imported* package's enum with a deliberate default gets `//nolint:exhaustive // <Type> is a third-party enum; default is intentional` or a targeted `ignore-enum-types` entry, never a blanket disable.

**forbidigo (41 hits across 4 repos, 2 in `_test.go`):** the two test-file hits (`cli/cli@9b031151a825:pkg/iostreams/iostreams_test.go:55`, a simulated subprocess pager printing to its own stdout in `TestHelperProcess`; `junegunn/fzf@b1be3a8be1b8:src/util/chars_test.go:142`, a debug `fmt.Println` in a table-test body) are genuine but low-volume FPs against the rule's literal intent (the "stdout is the result stream" concern does not apply to a test double's simulated stdout). Not load-bearing enough to change GO-GATE-18's severity; worth a `_test.go` exclusion mirroring gosec's existing one if the volume grows.

### 5. Unattended `--fix` (M-M-15): errorlint's asserts fixer breaks the build and changes behaviour

`golangci-lint help linters` (2.14.0) tags 14 of the baseline's enabled linters `[auto-fix]`: `govet`, `staticcheck`, `canonicalheader`, `copyloopvar`, `errorlint`, `fatcontext`, `misspell`, `nolintlint`, `revive`, `sloglint`, `testifylint`, `usestdlibvars`, `usetesting`, `whitespace`. `errcheck`, `ineffassign`, `unused`, `containedctx`, `contextcheck`, `depguard`, `gosec`, `nilerr`, `nilnil`, `noctx`, `predeclared`, `thelper`, `unconvert`, `unparam`, `wastedassign` carry no fix.

**Run 1 — `fleet/bad` with `--fix`:** only `usetesting` fired, rewriting `context.Background()` → `t.Context()` in `bad_test.go` (mechanical, behaviour-preserving since go1.24; issue count dropped 8→7). `nilnil`, `nilerr`, `revive` (`context-as-argument`, `deep-exit`) and `gosec` left their violations untouched — no fix is implemented for those specific findings despite the linter-level `[auto-fix]` tag.

**Run 2 — a scratch copy of `uber-go/zap@4892335e05f1` (`fixtures/config-revision/zap-scratch/`, `.git` retained for diffing) with the fleet baseline config and `--fix`:** 21 files changed. Safe, verified changes:
- `errorlint`'s `errorf` sub-check: `%v`→`%w` in plain `fmt.Errorf` calls (`sink.go:84,101`, `http_handler.go:139`, `internal/readme/readme.go:190`) — pure format-verb edits, no new import, no control-flow change.
- `testifylint`: `assert.Equal(t, N, len(x))` → `assert.Len(t, x, N)`, `assert.Equal(t, 0, len(x))` → `assert.Empty(t, x)`, and argument-order swaps to match testify's expected/actual convention (`logger_test.go`, `sugar_test.go`, `error_test.go`, `array_test.go`, `buffer/pool_test.go`) — all boolean-equivalent by construction (equality and length checks are symmetric).
- `whitespace`: a stray blank line removed (`logger_test.go:349`, `zapcore/console_encoder_test.go:126`).

**Unsafe, verified:** `errorlint`'s `asserts` sub-check rewrote the type switch in `zapcore/error.go:69-79` —

```go
// before
switch e := err.(type) {
case errorGroup:
    return enc.AddArray(key+"Causes", errArray(e.Errors()))
case fmt.Formatter:
    verbose := fmt.Sprintf("%+v", e)
    ...
}

// after (golangci-lint run --fix, errorlint asserts)
var e errorGroup
var e1 fmt.Formatter
switch {
case errors.As(err, &e):
    return enc.AddArray(key+"Causes", errArray(e.Errors()))
case errors.As(err, &e1):
    verbose := fmt.Sprintf("%+v", e1)
    ...
}
```

`go build ./...` **exit 1**: `zapcore/error.go:71:8: undefined: errors` — the fixer never added the `errors` import. Running `goimports -w` (not `golangci-lint fmt`, which only enables `gofmt` under GO-GATE-06, and `gofmt` never manages imports) repairs the compile, but then `go test ./...` **exit 1**: `TestErrorEncoding` fails. `errors.As` walks the full unwrap chain; the original single-level type switch inspected only `err` itself. On a wrapped error whose *inner* cause implements `errorGroup`, the rewritten code now recurses into it and emits nested `errorCauses` the original never produced — a genuine, test-caught behaviour change, not a cosmetic rewrite. go-errorlint's own README warns exactly this: *"These fixes are still under development and the behavior is not yet stable. It is possible that it will make mistakes and cause more harm than good. Use with caution"* ([go-errorlint README](https://raw.githubusercontent.com/polyfloyd/go-errorlint/master/README.md)).

**Allowlist decision:** clear for unattended `--fix`: `usetesting`, `testifylint`, `misspell`, `canonicalheader` (also isolated-fixture-verified: `h.Get("content-type")`→`h.Get("Content-Type")`, behaviour-preserving because `http.Header.Get` canonicalizes the lookup key regardless), `whitespace`. Excluded: **`errorlint`** (its `errorf` sub-fix is safe on its own, but golangci-lint applies `--fix` per run, not per sub-check, so there is no config-level way to take the safe half without the unsafe half; drop `errorlint` from the fix allowlist entirely and lint-only it). Unverified, not cleared: `govet`, `staticcheck`, `copyloopvar`, `fatcontext`, `nolintlint`, `revive`, `sloglint` — none fired a fix in any fixture run here; an agent loop should not assume they are safe until watched on a planted violation.

### 6. The analyzer probe: nothing sees a t.Fatal/require.NoError inside wg.Go or errgroup.Go

Four fixtures (`fixtures/config-revision/wgfatal/{bad,good,egbad,eggood,rawgo}`), Go 1.26.0, `golang.org/x/sync/errgroup` and `github.com/stretchr/testify/require` both real dependencies:

```go
// bad/bad_test.go
var wg sync.WaitGroup
wg.Go(func() {
    t.Fatal("boom from inside wg.Go")   // t.Fatal inside a 1.25+ sync.WaitGroup.Go closure
})
wg.Wait()

// egbad/eg_test.go
g, _ := errgroup.WithContext(context.Background())
g.Go(func() error {
    require.NoError(t, someErr())        // require.NoError inside an errgroup.Go closure
    return nil
})
```

| Tool | `bad` (wg.Go) | `egbad` (errgroup.Go) | `rawgo` (literal `go func(){...}()`, contrast) |
|---|---|---|---|
| `go vet ./...` | exit 0 (silent) | exit 0 (silent) | **exit 1**: `call to (*testing.T).Fatal from a non-test goroutine` |
| `staticcheck -checks all` | exit 0 | exit 0 | not run (vet already proves the mechanism) |
| `golangci-lint run` (`govet` `enable-all: true`, `disable: [shadow, fieldalignment]`) | `0 issues.`, exit 0 | `0 issues.`, exit 0 | not run |

`go vet`'s `testinggoroutine` analyzer catches the literal `go func(){ t.Fatal(...) }()` shape every time (watched: `rawgo`, exit 1) but is mechanically blind once the closure is passed as an argument to `wg.Go`/`g.Go` instead of appearing after a `go` keyword in the analyzed source — `testinggoroutine`'s pass walks `*ast.GoStmt` nodes, not arbitrary function-value arguments, so it cannot see through `sync.WaitGroup.Go`'s or `errgroup.Group.Go`'s own internal `go` statement (which lives in the stdlib/module source, not the caller's). No `go/analysis` pass in the roster is call-graph-aware enough to bridge that boundary. `require.NoError`'s call to `t.FailNow()`→`runtime.Goexit()` is invisible to every tool for the same reason plus one more: none of `go vet`, staticcheck or golangci-lint's `govet` config has any notion of `testify`.

**This closes the open question carried from go-testing and go-concurrency with a mechanism, not just an absence of findings.** GO-TEST-01's blind spot stays a reading heuristic: grep for `\.Go(func` bodies containing `t\.Fatal|t\.FailNow|require\.` and read each hit; no analyzer flag or lint config change closes it.

## Normative guidance candidates

1. **Never enable `linters.exclusions.presets: [std-error-handling]`.** *Rationale:* its `.*Close|.*Flush` regex silences every write-path error GO-ERR-08 exists to catch, including in the fleet's own `cligood` fixture once removed. *Verify:* `grep -rn --include='*golangci*' -e 'std-error-handling' .` (any output is a finding; GO-ERR-09). *Run:* yes — `golangci-lint run --config fleet/.golangci.yml ./fleet/cligood/...` went from 0 to 2 issues the moment the preset was removed, `fixtures/config-revision/`.
2. **`errcheck.settings.exclude-functions: ["(io.ReadCloser).Close"]` is scoped to declared-`io.ReadCloser` call sites (HTTP response bodies and similar wrapper fields), not to any type that structurally implements the interface.** *Rationale:* errcheck matches the call site's static type, never dynamic/structural satisfaction. *Verify:* the three-fixture isolation in Finding 2 (`main.go` flagged, `iface.go`/`httpbody.go` clean under the same config). *Run:* yes, `fixtures/config-revision/roclose/`, exit 1 / exit 0 / exit 0.
3. **Never try to carve out read-only `*os.File` closes with `exclude-functions: ["(*os.File).Close"]`.** *Rationale:* it is blind to read vs. write and would re-hide GO-ERR-08's target. *Verify:* reading heuristic — trace the variable back to `os.Open` (read) vs. `os.Create`/`os.OpenFile(O_WRONLY|...)`/`os.CreateTemp` (write); mark a genuine read-only close `//nolint:errcheck // read-only close`. *Run:* yes — `(*os.File).Close` suppressed `main.go`'s read but would identically suppress a write-path twin (not separately re-plotted; follows directly from the interface-vs-concrete-type test above).
4. **`nilnil.settings.checked-types` drops `map` from the default list.** *Rationale:* a nil map is a valid, idiomatic empty read, unlike a nil pointer/interface/chan/func result (GO-ERR-12). *Verify:* `golangci-lint run --enable-only=nilnil ./...` with and without the setting on a function returning `(map[string]string, error)`. *Run:* yes, `fixtures/config-revision/nilnilcheck/`, default config flags 2 (pointer + map), tuned flags 1 (pointer only).
5. **depguard's `superseded` rule takes GO-MOD-08's 11 entries verbatim on `files: ["$all"]`.** *Rationale:* a single shared list, checked against both production and test files, is the whole gate — depguard has no built-in deny list. *Verify:* `golangci-lint run --enable-only=depguard ./...`; a denied import's line is the finding, `desc:` names the replacement. *Run:* yes — a synthetic module importing all 11 denied packages produces 11 issues, exit 1; a compliant twin (`go.yaml.in/yaml/v3`, stdlib `errors`) is 0 issues, exit 0, `fixtures/config-revision/depguard12/`.
6. **A CLI's `exhaustive` switch over an *imported* package's enum type with an intentional `default:` gets `//nolint:exhaustive // <Type> is a third-party enum; default is intentional` or a targeted `settings.exhaustive.ignore-enum-types` entry — never a blanket disable of the linter.** *Rationale:* ko-build/ko's entire `exhaustive` volume (6/6) is this shape at 4× the admission bar; fzf's volume (43/43, own-type switches) is the opposite, clean shape. *Verify:* for each hit, read whether `switch of type X` names a type declared in the CLI's own module (`go doc <module>/... X`) or an import. *Run:* yes, read on all 4 CLI-overlay exemplars, `fixtures/config-revision/clioverlay-out/`.
7. **Never enable `golangci-lint run --fix` for `errorlint` in an unattended loop.** *Rationale:* its `asserts` sub-check can rewrite a type switch on `error` into `errors.As` calls without adding the needed `errors` import (build breaks) and, once repaired, changes which wrapped causes a comparison or format call sees (test-caught behaviour change) — verified on a real exemplar, not a toy case, and warned by the upstream tool's own README. *Verify:* after any unattended `--fix` run, `go build ./... && go test ./...` must both exit 0 before a commit is trusted; a green `golangci-lint run --fix` exit code alone proves nothing about the tree it produced. *Run:* yes — `fixtures/config-revision/zap-scratch/`, `go build` exit 1 pre-`goimports`, `go test` exit 1 (`TestErrorEncoding` FAIL) post-`goimports`.
8. **The unattended `--fix` allowlist is `usetesting`, `testifylint`, `misspell`, `canonicalheader`, `whitespace` — every other `[auto-fix]`-tagged linter in the baseline is unverified until watched on its own planted violation.** *Rationale:* an agent loop's safety claim needs a fixture, not a linter-level tag; `[auto-fix]` in `golangci-lint help linters` means "some finding of this linter has a fixer," not "every fixer this linter can apply is behaviour-preserving." *Verify:* run `--fix` on a copy with `.git` retained, diff, `go build && go test`, both exit 0, before adding a linter to the allowlist. *Run:* yes for the five listed (Finding 5); no fix observed for `govet`, `staticcheck`, `copyloopvar`, `fatcontext`, `nolintlint`, `revive`, `sloglint` in any run here.
9. **`go vet`'s `testinggoroutine` (and every analyzer in the roster measured here) cannot see a `t.Fatal`/`require.NoError` call inside a closure passed to `sync.WaitGroup.Go` or `errgroup.Group.Go`; only a literal `go func(){...}()` in the analyzed source is caught.** *Rationale:* the analyzer walks `*ast.GoStmt`, not arbitrary function-value call arguments, so a caller can defeat it by routing through any wrapper, stdlib or otherwise. *Verify:* grep, not a lint: `grep -rn --include='*_test.go' -e '\.Go(func' -A5 . \| grep -n -e 't\.Fatal' -e 't\.FailNow' -e 'require\.'`, then read each hit's goroutine boundary. *Run:* yes, `fixtures/config-revision/wgfatal/{bad,egbad,rawgo}`, exit 0 / exit 0 / exit 1 respectively across `go vet`, `staticcheck -checks all`, and golangci's `govet enable-all`.
10. **golangci-lint's own errcheck does not inherit the standalone `errcheck` binary's default "ignore the `fmt` package" behaviour.** *Rationale:* an agent reading errcheck's upstream README (which documents `fmt` as ignored by default) will wrongly assume `fmt.Fprintf`/`Fprintln` calls are pre-exempted under golangci-lint; they are not, and this drove 104 of regclient's 228 hits. *Verify:* `golangci-lint run --config <(printf 'version: "2"\nlinters:\n  default: none\n  enable: [errcheck]\n') ./...` on a package with an unchecked `fmt.Fprintln`; a finding is the pass (empty output would be the miss). *Run:* yes, `fixtures/config-revision/errcheck-bare.yml` vs. `errcheck-measure.yml` on cobra, both 65 issues including every `fmt.Fprint*` call — the go-gates dive's "errcheck: 0" row for this same set of 8 repos was produced by a different, now-stale `--enable-only` interaction on `linters.default: all` and does not reproduce under the `default: none`/`enable:` shape every gates fixture (including this one) uses.

## Verification runs

All commands via `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, `GOTOOLCHAIN=local`, golangci-lint 2.14.0), 2026-09-26, under `fixtures/config-revision/` unless noted.

| Run | Command | Exit on violation | Exit on twin |
|---|---|---|---|
| CR-1 | `golangci-lint config verify --config fleet/.golangci.yml` and `--config fleet/cli.golangci.yml` | — (both are the corrected config, not a violation fixture) | 0, 0 |
| CR-2 | `golangci-lint run --config fleet/.golangci.yml ./fleet/bad/...` then `./fleet/good/...` | `bad`: 8 issues (gosec, govet nilness, nilerr, nilnil, revive×2, thelper, usetesting), exit 1 | `good`: `0 issues.`, exit 0 |
| CR-3 | `golangci-lint run --config fleet/cli.golangci.yml ./fleet/clibad/...` then `./fleet/cligood/...` | `clibad`: 5 issues (errcheck, exhaustive, forbidigo, gocritic, revive), exit 1 | `cligood`: **2 issues** (errcheck ×2: `f.Close`, `fmt.Fprintln`), exit 1 — the twin is no longer clean; see Finding 1 |
| CR-4 | `roclose/`: `golangci-lint run` on `main.go` (declared `*os.File`), `iface.go` (declared `io.ReadCloser`), `httpbody.go` (`resp.Body`, field-declared `io.ReadCloser`), each with `exclude-functions: ["(io.ReadCloser).Close"]` | `main.go`: 1 issue, exit 1 | `iface.go`, `httpbody.go`: `0 issues.`, exit 0 each |
| CR-5 | `roclose/`: same three files with `exclude-functions: ["(*os.File).Close"]` instead | `iface.go`: 1 issue, exit 1 (declared-`io.ReadCloser` var no longer matches) | `main.go`: 0 issues, exit 0 (now suppressed — proves the concrete-type entry is blind to read vs. write) |
| CR-6 | `errcheck-measure.yml` (no preset, `exclude-functions` set) on the 8 exemplars, `uniq-by-line: false`, no caps | 27–244 issues per repo (table, Finding 2) | — (read-only census, no twin) |
| CR-7 | `errcheck-bare.yml` (no settings at all) vs. `errcheck-measure.yml`, both on spf13/cobra | 65 issues, exit 1 (both configs identical) | — confirms `fmt.Fprint*` is not pre-exempted and `exclude-functions` adds nothing for `*os.File` |
| CR-8 | `errorlint-measure.yml` on the 8 exemplars plus caddyserver/caddy | 0–462 issues per repo (table, Finding 3) | — (read-only census; 0/51 hand-classified FP across the two spot-reads) |
| CR-9 | `clioverlay-measure.yml` (`exhaustive`, `forbidigo`, `gocritic` `exitAfterDefer`) on cli/cli, ko, oras, fzf | 24 / 14 / 7 / 67 issues (table, Finding 4) | — (read-only census) |
| CR-10 | `nilnilcheck/`: `default.yml` (bare `nilnil`) vs. `tuned.yml` (`checked-types` minus `map`) on a `(map[string]string, error)` + `(*T, error)` pair | default: 2 issues, exit 1 | tuned: 1 issue, exit 1 (map case dropped, pointer case kept) |
| CR-11 | `depguard12/`: `golangci-lint run --config fleet/.golangci.yml --enable-only=depguard` on a module importing all 11 GO-MOD-08 packages | 11 issues (one per package, each with its `desc`), exit 1 | `good/` (stdlib `errors` + `go.yaml.in/yaml/v3`): `0 issues.`, exit 0 |
| CR-12 | `zap-scratch/` (git-tracked copy of uber-go/zap@4892335e05f1): `golangci-lint run --config fleet/.golangci.yml --fix ./...`, then `go build ./...`, then `goimports -w zapcore/error.go`, then `go build ./...` again, then `go test ./...` | after `--fix`: `go build` exit **1** (`zapcore/error.go:71:8: undefined: errors`); after `goimports -w`: `go build` exit 0, `go test` exit **1** (`TestErrorEncoding` FAIL, diff in `zap-test.txt`) | — no twin; the exemplar itself is the violation once fixed |
| CR-13 | `fixtest/fleet/bad/`: `golangci-lint run --config .golangci.yml --fix ./bad/...`, diff `bad.go`/`bad_test.go` before/after | `bad.go`: no diff (no fixer applies to nilnil/nilerr/revive/gosec findings here); `bad_test.go`: `context.Background()`→`t.Context()` (usetesting), issue count 8→7 | — single-fixture probe, no separate twin |
| CR-14 | `fixprobe/`: `golangci-lint run --config fix.yml --fix ./...` (`misspell`, `canonicalheader`, `staticcheck`, `govet`), then `go build ./...` | before: 0 lint issues shown (fixes applied silently on `run --fix`); "mispelled"→"misspelled", `h.Get("content-type")`→`h.Get("Content-Type")` | `go build` exit 0 after — behaviour-preserving (canonical header lookup is case-insensitive at runtime regardless) |
| CR-15 | `wgfatal/{bad,egbad,rawgo}`: `go vet ./...`, `staticcheck -checks all ./...` (bad/egbad only), `golangci-lint run --config enableall.yml ./...` (`govet enable-all`) | `bad` (wg.Go+t.Fatal): vet exit 0, staticcheck exit 0, golangci exit 0. `egbad` (errgroup.Go+require.NoError): same, all exit 0. `rawgo` (literal `go func(){t.Fatal()}()`): vet **exit 1** (`call to (*testing.T).Fatal from a non-test goroutine`) | — `good`/`eggood` not separately run; `rawgo` itself is the positive control proving the analyzer works on the syntactic shape it can see |

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 (no std-error-handling) | none of the 23 real configs set this correctly for the fleet's purposes | `aquasecurity/trivy@ae561f8cca36:.golangci.yaml:201`, `ko-build/ko@fcaeb337b6bd:.golangci.yaml:29`, `sigstore/cosign@907c3d899c0e:.golangci.yml:62`, `caddyserver/caddy@54937914234b:.golangci.yml:73`, `goreleaser/goreleaser@ff8de3d6c389:.golangci.yaml:113`, 13/23 total ([go-errors.md:289](../go-errors.md)) |
| 2 (exclude-functions scope) | `http.Response.Body` callers everywhere in the corpus benefit mechanically (declared `io.ReadCloser`) | every `os.Open`-derived `*os.File` close in the corpus is unreached by it: `oras-project/oras-go@cb6d6dc79f83:content/oci/oci.go:360,388`, `regclient/regclient@43d2acb9fafd:internal/reghttp/http.go:576,619` (`*Resp`, structurally `io.ReadCloser` but declared `*Resp`) |
| 5 (GO-MOD-08's 11) | `go.yaml.in/yaml/v3` already leads the corpus's YAML replacement per go-modules/dependency-hygiene.md §4 | no exemplar imports all 11 at once (synthetic fixture only); individual entries are separately evidenced in go-modules.md and go-modules/dependency-hygiene.md §3 |
| 6 (exhaustive foreign-enum) | `oras-project/oras@a0cd4de5cfcd` (own `progress.State`, 2/2 read as TP), `junegunn__fzf@b1be3a8be1b8` (43/43 own types) | `ko-build/ko@fcaeb337b6bd:internal/sbom/spdx.go:208,272`, `pkg/build/gobuild.go:1122,1445` — 6/6 on the foreign `go-containerregistry` `types.MediaType` |
| 7 (errorlint --fix unsafe) | n/a (a caution, not a compliance rule) | `uber-go/zap@4892335e05f1:zapcore/error.go:69-79` is the exemplar that demonstrates it — a genuine, previously-shipped type switch on `error`, not a toy |
| 9 (analyzer blind spot) | n/a (a residual gap, not a rule any exemplar can satisfy) | no exemplar plants this shape (it is a defect class, not a style choice); the blind spot is proven on the synthetic `wgfatal`/`egbad` pair against the `rawgo` positive control |
| 10 (fmt not pre-exempted) | n/a | every named exemplar's `fmt.Fprint*`/`Print*` calls are real errcheck findings once the preset is gone: `spf13/cobra@adbc8813901b:command.go:1436` (29 hits total), `regclient/regclient@43d2acb9fafd` (104 `Fprintf` hits) |

## AI-agent angle

1. **Assuming `exclude-functions: ["(io.ReadCloser).Close"]` exempts `defer f.Close()` after `f, err := os.Open(...)`.** It does not — the training-data-plausible mental model ("io.ReadCloser matches anything that implements it") is wrong for this specific errcheck setting. Check: after adding the setting, re-run errcheck on a file with a plain `os.Open` close and confirm the finding is *still there*; if it vanished, the setting was applied to the wrong type shape.
2. **Believing golangci-lint's errcheck ignores `fmt.Print*`/`Fprintf` "because errcheck's README says so."** That default belongs to the *standalone* `errcheck` binary's CLI flags, not to golangci-lint's wrapper. Check: `golangci-lint run --enable-only=errcheck ./...` on any file with an unchecked `fmt.Fprintln`; a real finding means the fmt-ignore assumption is wrong for this toolchain.
3. **Applying `golangci-lint run --fix` in a loop and trusting a 0 exit code as proof the tree is safe to commit.** `--fix`'s own exit code says nothing about whether the *result* compiles or behaves the same; it only means the linter run (after fixing) found nothing left to report. Check: `go build ./... && go test ./...` immediately after any `--fix`, before any commit — this is the check that caught the zap `errors.As` regression here.
4. **Reaching for `exhaustive` on a switch over an imported package's type and disabling the whole linter after one FP**, instead of scoping it. Check: is the switched-on type declared in `go list -deps -f '{{.ImportPath}}' | grep <pkg>` inside the module being linted, or outside it? Outside → `ignore-enum-types`, never a blanket `enable: []` removal.
5. **Assuming `sync.WaitGroup.Go`/`errgroup.Group.Go` are "just like `go func(){}()`" for tooling purposes**, including for static analysis coverage. They are semantically similar for goroutine lifetime but syntactically invisible to every analyzer measured here. Check: any closure passed to `.Go(...)` that calls `t.Fatal`/`t.FailNow`/`require.*`/`assert.*` (which calls `t.FailNow`) needs a manual read — no lint config catches it.
6. **Copying `std-error-handling` from an exemplar's `.golangci.yml` "because 13 of 23 real configs have it."** Popularity is not correctness here — GO-ERR-09 (MUST) forbids it precisely because it duplicates the fix for a subset of GO-ERR-08's cases while silently defeating detection for all of them. Check: `grep -rn --include='*golangci*' -e 'std-error-handling' .` — any hit is a finding, full stop, regardless of how common the preset is upstream.

## Contested / evolving

- **`exclude-functions`'s declared-type-only matching is current tool behaviour, not a documented limitation.** The errcheck README's own exclude-file format section ([kisielk/errcheck README](https://raw.githubusercontent.com/kisielk/errcheck/master/README.md)) states the syntax (`(package.Receiver).Method`) but does not say whether it matches by static type or dynamic satisfaction; this dive settled it empirically for golangci-lint 2.14.0's bundled errcheck. A future errcheck release could change the matching semantics (there is no version-pinned guarantee either way); re-probe on any golangci-lint bump that changes the bundled errcheck version.
- **go-errorlint's `-fix` maturity is explicitly unstable upstream** ("still under development... may cause more harm than good," [README](https://raw.githubusercontent.com/polyfloyd/go-errorlint/master/README.md)), so this finding is not a permanent verdict against the tool — it is a snapshot against the version golangci-lint 2.14.0 bundles today. Re-run the zap `--fix` probe on every golangci-lint bump before trusting `errorlint` fixes again, even conditionally.
- **Whether `exhaustive`'s `ignore-enum-types` should be part of the fleet's baseline CLI overlay, or left as a per-repo addition,** is open: the fleet has no CLI exemplar of its own yet to know which foreign enums its CLIs will actually switch on (`api/sdk-surface`'s open exit-code work is the closest analogue). Trending toward "leave it out of the shared config, document the pattern," since a speculative regex list is exactly the kind of premature config GO-GATE-16 warns against for other linters.
- **The `t.Fatal`-in-`wg.Go` blind spot is a known, unfixed gap in the wider ecosystem, not unique to this measurement.** No `go/analysis` pass targeting it exists in `golang.org/x/tools` as of this toolchain; if one lands in a future `x/tools` release, GO-TEST-01 should absorb it as a MUST-with-analyzer rather than keep the reading heuristic.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [errcheck README](https://raw.githubusercontent.com/kisielk/errcheck/master/README.md) | kisielk/errcheck's own docs | current (fetched 2026-09-26) | Primary source for the `exclude-functions`/`-exclude` file format (`(package.Receiver).Method` syntax) that this dive's Finding 2 is built on |
| [go-errorlint README](https://raw.githubusercontent.com/polyfloyd/go-errorlint/master/README.md) | polyfloyd/go-errorlint's own docs | current (fetched 2026-09-26) | Documents exactly the three fixable shapes (`errorf`, comparison, type-assert/switch) and the tool's own stability caution that this dive's Finding 5 independently reproduced |
| [golangci-lint reference config](https://raw.githubusercontent.com/golangci/golangci-lint/main/.golangci.reference.yml) | golangci-lint's own annotated per-linter settings reference | current, v2 schema | Source for `errcheck.disable-default-exclusions`/`exclude-functions` semantics, `exhaustive.ignore-enum-types`/`default-signifies-exhaustive`, and errchkjson's fmt/json caveats |
| [golangci-lint linters list](https://golangci-lint.run/docs/linters/) | golangci-lint's linter catalogue with `[auto-fix]`/`[fast]` tags | current | The `[auto-fix]` tag this dive's Finding 5 allowlist decision starts from (and shows is necessary-but-not-sufficient evidence of a *safe* fix) |
| `golangci-lint help linters` (2.14.0, run locally) | the installed binary's own linter roster and tags | 2026-09-26, this toolchain | Ground truth for exactly which of the baseline's enabled linters carry `[auto-fix]` on this pinned version — matches the reference-config list above |
| [pkg.go.dev/sync#WaitGroup.Go](https://pkg.go.dev/sync#WaitGroup.Go) | stdlib docs | go1.25 (2025) | `WaitGroup.Go`'s exact signature and goroutine-spawning contract, the API this dive's analyzer probe targets |
| [pkg.go.dev/golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup) | x/sync docs | current | `errgroup.Group.Go`'s contract, the second half of the analyzer-probe pair |
| [pkg.go.dev/cmd/go#hdr-Testing_flags](https://pkg.go.dev/cmd/go#hdr-Testing_flags) | stdlib `go test` docs | current | The 11-of-36-analyzer subset `go test` runs, cited by go-gates.md and rechecked here indirectly via the `go vet` vs. `go test` gap this dive's probe assumes |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | Go 1.25 release notes | 2025-08 | `sync.WaitGroup.Go`'s introduction, floor for the analyzer probe's `bad`/`good` fixtures |
| [Go blog: container-aware GOMAXPROCS](https://go.dev/blog/container-aware-gomaxprocs) | Go team blog | 2025 | Background for GO-MOD-09's `automaxprocs` supersession, cited here only to confirm it stays out of depguard's list (a reading heuristic, not a deny entry) |
| [securego/gosec#1187](https://github.com/securego/gosec/issues/1187) | upstream issue | ongoing | Re-cites the existing G115 exclusion rationale carried unchanged into the corrected config |
| [golangci-lint v1→v2 migration guide](https://golangci-lint.run/docs/product/migration-guide/) | golangci-lint's own docs | current | Confirms `presets`/`linters-settings` v1 shapes are rejected outright by `config verify`, the same gate CR-1 re-runs on the corrected config |
| this dive's own fixture runs (`fixtures/config-revision/`) | 15 planted fixture pairs, all commands and exit codes recorded above | 2026-09-26, golangci-lint 2.14.0 / Go 1.27.1 | The primary evidence for every non-obvious claim in this file: exclude-functions matching, the fmt-not-exempted correction, the exhaustive foreign-enum shape, and the errorlint `--fix` regression |
| exemplar corpus (`~/.cache/research-lang/exemplars/go/`) | 35 depth-1 clones, this dive's read-only measurement target | fetched 2026-09-26 | Source of every `<repo>@<sha12>:<path>:<line>` citation above |

## Revision log

- 2026-09-26: initial revision. Applied the four config changes (drop `std-error-handling`; add `errcheck.exclude-functions`; add `nilnil.checked-types`; replace `depguard.superseded` with GO-MOD-08's 11-entry list on `files: ["$all"]` — corrected from the brief's "twelve" after a direct line-count of `go-modules.md:58`). `golangci-lint config verify` exits 0 on both configs. C-7's `bad`/`good`/`clibad` fixtures reproduce their prior counts unchanged; `cligood` regresses from 0 to 2 issues once `std-error-handling` is gone — flagged as a fixture debt, not a config bug, and its fix is specified in Finding 1 (not applied here, since this dive's write scope is its own output file and fixture directory, not `go-gates/fleet/`). Measured errcheck-without-preset, errorlint, and the CLI overlay on all 12 named repos (8 + caddy + 4 CLI-only, with cli/cli, ko, oras and fzf reused from both lists). Ran and recorded the M-M-15 `--fix` probe on `fleet/bad` and a git-tracked scratch copy of zap, finding a real, previously-unflagged build-breaking and behaviour-changing regression in errorlint's `asserts` fixer. Ran and recorded the wg.Go/errgroup.Go analyzer probe across `go vet`, `staticcheck -checks all` and golangci's `govet enable-all`, all silent, against a `rawgo` positive control that proves the analyzers work on the syntactic shape they can see. Decisions: errorlint stays MUST as a lint, dropped from the unattended `--fix` allowlist; the errcheck read-close carve-out stays a reading heuristic beyond the narrow `io.ReadCloser`-declared-type case; GO-TEST-01's blind spot stays a reading heuristic, now with a verified mechanism.

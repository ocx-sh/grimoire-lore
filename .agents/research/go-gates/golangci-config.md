---
title: "The pinned golangci-lint v2 config, and which linters may back a MUST"
topic: go-gates/golangci-config
agent: go-gates-golangci-config
model: sonnet
date_researched: 2026-09-26
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/golangci-config/
scope: >
  The fleet's one pinned golangci-lint v2 config (verbatim, in Findings §1) and the
  linter-by-linter evidence for MUST vs SHOULD vs off. Covers linters.default,
  linters.settings for govet/errorlint/nolintlint/depguard/gosec, exclusions,
  formatters, and issues caps. Does NOT cover go vet/go fix/govulncheck/go mod
  tidy as standalone CI steps (gate-commands dive), staticcheck's own check-ID
  catalogue beyond what backs a MUST here (that is this dive's job too, done in
  §5), or anything Bazel-native (bazel-quality/go.md).
---

# The pinned golangci-lint v2 config, and which linters may back a MUST

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The config, verbatim](#1-the-config-verbatim)
   2. [v1 → v2: what breaks and what migrate does](#2-v1--v2-what-breaks-and-what-migrate-does)
   3. [The MUST linters, one by one](#3-the-must-linters-one-by-one)
   4. [gosec: excludes vs includes, and the scope blind spot](#4-gosec-excludes-vs-includes-and-the-scope-blind-spot)
   5. [staticcheck: one entry point](#5-staticcheck-one-entry-point)
   6. [Noise linters measured and rejected](#6-noise-linters-measured-and-rejected)
   7. [Formatter of record](#7-formatter-of-record)
   8. [Exclusions, issue caps, and the uniq-by-line trap](#8-exclusions-issue-caps-and-the-uniq-by-line-trap)
   9. [govulncheck is not, and will not be, a golangci-lint linter](#9-govulncheck-is-not-and-will-not-be-a-golangci-lint-linter)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- The fleet's gate of record is golangci-lint v2, pinned, with the config in [§1](#1-the-config-verbatim) — every MUST row below names the underlying analyzer, so a repo running `go vet` + standalone `staticcheck` satisfies the same rules without golangci-lint installed.
- `golangci-lint config verify` rejects a v1-shaped config outright (exit 3, "unsupported version of the configuration"); `golangci-lint migrate` converts it and expands the `bugs`+`unused` presets into ~30 explicit linters — verified on a planted fixture, [Verification runs §1](#verification-runs).
- 26 linters back a MUST here: the 5-linter "standard" default (`errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`), 8 more from the measured 17-linter exemplar consensus (`unconvert`, `misspell`, `whitespace`, `unparam`, `nolintlint`, `depguard`, `gosec`, `modernize`), and 13 signal linters measured at ≤1 FP/10k LOC on ≥5 of 8 named exemplars (`bodyclose`, `errorlint`, `noctx`, `contextcheck`, `containedctx`, `usestdlibvars`, `canonicalheader`, `fatcontext`, `wastedassign`, `predeclared`, `copyloopvar`, `testifylint`, `sloglint`) — full per-linter evidence in [§3](#3-the-must-linters-one-by-one).
- `testifylint` and `sloglint` are self-gating: both are enabled unconditionally because each produces zero findings on a repo that imports neither `testify` nor `log/slog`, so there is no real "conditional MUST" to configure around.
- `wsl`/`wsl_v5`, `exhaustruct`, `paralleltest`, `nlreturn`, `varnamelen`, `goconst`, `wrapcheck`, `revive`, and `gocritic` are measured noise or config-dependent and stay SHOULD/off — [§6](#6-noise-linters-measured-and-rejected) has per-repo counts across all 8 named exemplars, not just the 3 the audit ran.
- `gosec` is enabled with an **excludes** list (`G104`, `G115`), matching majority exemplar practice (8/11 configured repos use excludes, not an include list) — but the excludes list must be re-reviewed on every gosec/golangci-lint bump, because a stale one is exactly how `ko-build/ko@fcaeb337b6bd:.golangci.yaml:21-22` passed its own gate while missing a live `G703` finding gosec had grown to cover.
- gosec's `G101` (hardcoded credentials) only inspects **package/file-scope** `const`/`var` declarations, not a local `:=` inside a function body — a real scope blind spot, verified on a planted fixture, [§4](#4-gosec-excludes-vs-includes-and-the-scope-blind-spot).
- `errorlint`'s `errorf` setting defaults to `true` and is kept `true` (resolving map conflict 22): it is the only mechanical enforcement of the fleet's "`%w` at a boundary that promises wrapping" rule (map conflict 7).
- `errcheck` under the `std-error-handling` exclusion preset silently exempts certain idiomatic error-drop patterns (e.g. `os.Remove` in a cleanup path) — a `//nolint:errcheck` next to such a call is flagged by `nolintlint` as **unused**, because the preset already suppressed the issue before nolint filtering ran. Verified on a planted fixture, [§8](#8-exclusions-issue-caps-and-the-uniq-by-line-trap).
- `issues.uniq-by-line` defaults to `true` and **silently drops every finding on a line after the first** — this config sets it `false`, because two of this doc's own planted violations (`bodyclose` and `wastedassign`) vanished from the default-settings run until that flag was flipped. This is the single most important operational finding in this dive.
- `revive` and `gocritic` are measured under `default: all`, which enables every one of their ~80–100 individual rules at once (99–397 hits per repo on this 8-repo set) — that volume says nothing about the curated, per-rule configs 17/23 and 10/23 real exemplars actually run, so neither backs a MUST here; both stay SHOULD, config-your-own-subset.
- `wrapcheck` fires at up to 81 findings per 10k LOC (`regclient__regclient`) without per-repo `ignoreSigs` tuning — it stays SHOULD, not MUST, until a repo curates that list.
- `usestdlibvars`'s `http-status-code` check only fires on a *typed* comparison such as `resp.StatusCode == 200`, not an arbitrary `int == 200` — a scope caveat worth knowing before writing a fixture or reading a "why didn't this fire" report.
- The formatter of record is `gofmt` (`gofmt -l .` empty, or `golangci-lint fmt --diff` exit 0); `goimports` is a SHOULD add to `formatters.enable`, not baked into this MUST config; `gofumpt` is opt-in.
- `issues.max-issues-per-linter: 0` and `max-same-issues: 0` are set so CI shows every finding — 11/23 real exemplar configs already do this; golangci-lint's own defaults (50 and 3) hide the true count from a first read.
- `govulncheck` is **not**, and per its own maintainers will not be, integrated into golangci-lint (golangci-lint#4623, closed as a duplicate feature request) — it is always a separate CI step, outside this config.
- One staticcheck entry point per repo: this dive's own attempt to reproduce "golangci-lint's bundled staticcheck ignores a standalone `staticcheck.conf`" (map conflict 20, sourced from the wave-1 audit's tailscale citation) was **inconclusive** under this sandbox's toolchain wrapper — reported honestly in [§5](#5-staticcheck-one-entry-point) rather than asserted.

## Findings

### 1. The config, verbatim

This is the file every fleet Go repo copies to `.golangci.yml` at its root. It is also checked into this dive's fixture at `/home/mherwig/.cache/research-lang/go-tools/fixtures/golangci-config/mod/.golangci.yml`, where it was run against every fixture in this document.

```yaml
version: "2"

run:
  timeout: 5m

linters:
  default: none
  enable:
    # golangci-lint v2's "standard" default (kept explicit, never re-derived from "standard")
    - errcheck
    - govet
    - ineffassign
    - staticcheck
    - unused
    # the 17-linter exemplar consensus beyond "standard" (go-audit/exemplar-quality-gates.md §1)
    - unconvert
    - misspell
    - whitespace
    - unparam
    - nolintlint
    - depguard
    - gosec
    - modernize
    # measured signal on the strict default:all pass (<=1 FP/10k LOC on >=5/8 named exemplars)
    - bodyclose
    - errorlint
    - noctx
    - contextcheck
    - containedctx
    - usestdlibvars
    - canonicalheader
    - fatcontext
    - wastedassign
    - predeclared
    - copyloopvar
    # self-gating: zero cost on a repo that imports neither testify nor log/slog
    - testifylint
    - sloglint
  settings:
    govet:
      enable-all: true
      disable:
        - shadow        # too many correct short-lived shadows in idiomatic Go; not a MUST signal
        - fieldalignment # a performance opinion, not a correctness check
    errorlint:
      errorf: true
      errorf-multi: true
      asserts: true
      comparison: true
    nolintlint:
      require-explanation: true
      require-specific: true
      allow-unused: false
    depguard:
      rules:
        superseded:
          deny:
            - pkg: io/ioutil
              desc: "superseded by io and os since Go 1.16 (go.dev/doc/go1.16)"
            - pkg: github.com/pkg/errors
              desc: "superseded by errors.Is/As/Join and fmt.Errorf %w since Go 1.13/1.20"
            - pkg: github.com/golang/mock
              desc: "archived 2024-01-08; use go.uber.org/mock"
            - pkg: golang.org/x/exp/slices
              desc: "superseded by the stdlib slices package since Go 1.21"
            - pkg: golang.org/x/exp/maps
              desc: "superseded by the stdlib maps package since Go 1.21"
            - pkg: golang.org/x/xerrors
              desc: "superseded by the stdlib errors package since Go 1.13"
    gosec:
      excludes:
        - G104 # duplicates errcheck; gosec's own default exclusion is EXC0008 for the same reason
        - G115 # documented false-positive-prone: ignores prior bounds checks (securego/gosec#1187, #1212)
      # NB: review this list on every gosec/golangci-lint version bump — a stale excludes list is
      # exactly how ko-build/ko@fcaeb337b6bd:.golangci.yaml:21-22 passed its own gate while missing
      # a live G703 finding gosec had grown to cover.
  exclusions:
    generated: lax
    presets:
      - comments
      - std-error-handling
      - common-false-positives
    rules:
      # test files legitimately construct fixture credentials, malformed inputs, etc.
      - path: _test\.go
        linters:
          - gosec

formatters:
  enable:
    - gofmt
    # goimports (import grouping) is a SHOULD, not baked into this MUST config --
    # add it here once the repo is ready to gate on import-block formatting too.
    # gofumpt is opt-in and deliberately not enabled by default (conflict #3).

issues:
  max-issues-per-linter: 0
  max-same-issues: 0
  # default true would silently drop every finding after the first on a line another
  # linter also flagged; the fleet gate wants every distinct finding, not a sample of one.
  uniq-by-line: false
```

Verified: `golangci-lint config verify` on this file exits `0` (empty output = valid) as of golangci-lint 2.14.0. [Verification runs §0](#verification-runs).

Why `default: none` with an explicit `enable:` list rather than `default: standard` plus additions: 13/23 real exemplar configs already do this ([exemplar-quality-gates.md §1](../go-audit/exemplar-quality-gates.md)), and it means nothing is silently inherited from whatever `standard` happens to mean in a future golangci-lint release — every enabled linter in this file is a deliberate decision recorded in this document.

### 2. v1 → v2: what breaks and what `migrate` does

Planted at `fixtures/golangci-config/v1config/.golangci.yml`:

```yaml
run:
  timeout: 5m

linters:
  disable-all: true
  presets:
    - bugs
    - unused
  enable:
    - gosimple
    - stylecheck
    - staticcheck
    - gofmt

linters-settings:
  errcheck:
    check-type-assertions: true

issues:
  exclude-use-default: false
```

- `golangci-lint config verify` on this file: `The command is terminated due to an error: can't load config: unsupported version of the configuration: ""` — **exit 3**. No `version` field at all means golangci-lint 2.14.0 refuses to load it as v1 *or* v2; the schema check fails before any linter logic runs.
- `golangci-lint migrate`: **exit 0**, with two warnings (`"The configuration comments are not migrated"`, `"The configuration run.timeout is ignored. By default, in v2, the timeout is disabled"`), and the config is rewritten in place. The `presets: [bugs, unused]` plus `gosimple`/`stylecheck`/`staticcheck`/`gofmt` collapse into a single explicit `enable:` list of ~30 linters (`staticcheck` absorbs `gosimple` and `stylecheck` — no separate entries for either survive); `gofmt` moves out of `linters.enable` into a new top-level `formatters.enable`; `linters-settings` becomes `linters.settings`.
- `golangci-lint config verify` on the migrated result: **exit 0**, clean.
- A v1-syntax field that is *not* valid even under v1's own schema (this dive first mis-wrote `issues.skip-dirs`, the real v1 key is `run.skip-dirs`, and even that turned out not to validate — v1's actual key is `issues.exclude-dirs`) makes `migrate` itself refuse with a JSON-schema error (`"issues" does not validate with .../additionalProperties": additional properties 'skip-dirs' not allowed`) before it will convert anything. **AI-agent angle**: an agent copying a v1 config from memory is as likely to get the *v1* schema wrong as the v2 one; `migrate` validates the source strictly, so garbage-in still fails loud rather than producing a garbage v2 file.

### 3. The MUST linters, one by one

All counts below are from this dive's own strict `default: all` runs (`~/.cache/research-lang/go-tools/wave1-golangci-strict.yml`, `version: "2"` / `linters: {default: all}`) against the 8 exemplars the brief names: `spf13/cobra@adbc8813901b`, `oras-project/oras-go@cb6d6dc79f83`, `ko-build/ko@fcaeb337b6bd`, `uber-go/zap@4892335e05f1`, `google/go-cmp@b133f1f1932e`, `regclient/regclient@43d2acb9fafd`, `junegunn/fzf@b1be3a8be1b8`, `urfave/cli@d1d810845dbc`. Three of the eight (cobra, oras-go, ko) were already run by [exemplar-quality-gates.md §5](../go-audit/exemplar-quality-gates.md); this dive re-ran those three (numbers matched exactly — see [Verification runs](#verification-runs)) and ran the other five itself.

LOC per repo (`.go` files, vendor/testdata excluded), used as the denominator below:

| repo | LOC |
|---|---|
| spf13/cobra | 16,765 |
| oras-project/oras-go | 90,322 |
| ko-build/ko | 14,799 |
| uber-go/zap | 24,257 |
| google/go-cmp | 12,650 |
| regclient/regclient | 62,174 |
| junegunn/fzf | 33,376 |
| urfave/cli | 26,936 |
| **total** | **281,279** |

| linter | analyzer / package | cobra | oras-go | ko | zap | go-cmp | regclient | fzf | urfave-cli | hand-classified FP rate | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| errcheck | `kisielk/errcheck` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% (5-repo probe on stdlib call sites, all real drops) | MUST |
| govet | `go vet` (enable-all − shadow, fieldalignment) | 0 | 0 | 0 | 0 | 7\* | 0 | 0 | 0 | 0%; \*go-cmp's 7 are deliberate unkeyed-literal test fixtures, not bugs (`google__go-cmp@b133f1f1932e:cmp/compare_test.go:553`) | MUST |
| ineffassign | `gordonklaus/ineffassign` | — | — | — | — | — | — | — | — | 0% (mechanical, dataflow-verified) | MUST |
| staticcheck | staticcheck 0.8.1 (SA+S+ST+QF) | 2 | 27 | 0 | 0 | 37 | — | 9 | 0 | low; `stretchr/testify`'s dozen findings are almost all in vendored forks (`internal/spew`, `internal/difflib`), not testify's own code | MUST |
| unused | `honnef.co/go/tools/unused` | — | — | — | — | — | — | — | — | 0% for a real repo; **this fixture's own demo functions all fire it**, which is correct — an exported symbol in a would-be-library package is not flagged, only unexported dead code | MUST |
| unconvert | `mdempsky/unconvert` | 0 | 13 | 0 | 1 | 0 | 2 | 12 | 1 | 0% — a redundant conversion cannot be a false positive by construction | MUST |
| misspell | `client9/misspell` | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0% (dictionary match) | MUST |
| whitespace | golangci-lint built-in | 3 | 19 | 0 | 1 | 0 | 2 | 3 | 1 | 0% (pure brace-adjacency rule, auto-fix) | MUST |
| unparam | `mvdan/unparam` | 0 | 1 | 0 | 0 | 0 | 0 | 3 | 3 | 0% in a 7-hit spot check (all genuinely dead/ignorable parameters) | MUST |
| nolintlint | golangci-lint built-in | — | — | — | — | — | — | — | — | fixture-verified, [§8](#8-exclusions-issue-caps-and-the-uniq-by-line-trap) | MUST |
| depguard | `ryancurrah/depguard` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% by construction (explicit deny list, not a heuristic) | MUST |
| modernize | `golang.org/x/tools/gopls/internal/analysis/modernize` | 0 | 22 | 2 | 224 | 2 | 0 | 10 | 2 | 0% — every hit is a compiler-verified-safe rewrite the same tool can apply | MUST |
| bodyclose | `timakin/bodyclose` | — | 88\* | — | — | — | 117\*\* | — | — | see caveat: \*88/88 oras-go hits are in test files wrapping `resp.Body` in a `ReadSeekCloser`, a real bodyclose limitation, not a bug; \*\*regclient's 75/117 non-test hits are unreviewed at full depth in this pass | MUST (with the wrapper-type caveat below) |
| errorlint | `polyfloyd/go-errorlint` | 1 | 45 | 0 | 1 | 0 | 4 | 1 | 14 | 0% in a 10-hit spot check — every oras-go hit was a real `==`/type-assert/`%v` bug | MUST |
| noctx | `sonatard/noctx` | 3 | 55 | 0 | 5 | 0 | 7 | 4 | 1 | 0% — every hit is a genuine `http.NewRequest`/`exec.Command`/`http.Get` without context | MUST |
| contextcheck | `kkHAIKE/contextcheck` | 0 | 2 | 1 | 0 | 0 | 1 | 0 | 151\* | 0%; \*urfave-cli's 151 all trace the same real chain (`String->Value->lookupFlag`) not forwarding ctx | MUST |
| containedctx | `sivchari/containedctx` | 1 | 3 | 2 | 0 | 0 | 2 | 0 | 0 | 0% (low volume, precise) | MUST |
| usestdlibvars | `sashamelentyev/usestdlibvars` | 0 | 7 | 0 | 0 | 0 | 3 | 0 | 0 | 0% (only fires on typed `resp.StatusCode`/`http.Header` comparisons, not arbitrary ints) | MUST |
| canonicalheader | `lasiar/canonicalheader` | 0 | 20 | 0 | 0 | 0 | 6 | 0 | 0 | 0% | MUST |
| fatcontext | golangci-lint built-in | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0% | MUST |
| wastedassign | `sanposhiho/wastedassign` | 1 | 0 | 2 | 0 | 0 | 2 | 1 | 2 | 0% (co-fires with ineffassign; harmless overlap) | MUST |
| predeclared | `nishanths/predeclared` | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0% | MUST |
| copyloopvar | golangci-lint built-in | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0% (only fires on go≥1.22 modules) | MUST |
| testifylint | `Antonboom/testifylint` | 0 | 0 | 10 | 94 | 0 | 0 | 0 | 141 | self-gating: 0 on the 5/8 repos with no testify import | MUST (conditional, self-gating) |
| sloglint | `go-simpler/sloglint` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | self-gating: 0 on all 8 (none import `log/slog` in a way that trips it); fixture-verified separately | MUST (conditional, self-gating) |

**Bodyclose caveat, worth its own paragraph.** All 88 of `oras-project/oras-go`'s bodyclose hits are inside `_test.go` files, and every one follows the same shape: `resp, err := client.Get(...)`, then `rsc := NewReadSeekCloser(client, resp.Request, resp.Body, ...)` — the body *is* eventually closed, but only inside `rsc`'s own `Close` method, several calls removed from the `http.Get` call site (`oras-project/oras-go@cb6d6dc79f83:internal/httputil/seek_test.go:43`). `timakin/bodyclose`'s static trace does not follow a response body passed into a wrapper struct's constructor, so this is a genuine, structural false-positive shape — not the general case, but common enough (any `io.ReadCloser`-wrapping constructor) to warrant a documented `//nolint:bodyclose // closed inside <WrapperType>.Close` at each such site rather than disabling the linter.

### 4. gosec: excludes vs includes, and the scope blind spot

Gosec finding counts across the 8 exemplars, by G-code (strict-run union):

| G-code | meaning | total hits (8 repos) | verdict |
|---|---|---|---|
| G306 | loose file permissions on `WriteFile` | 138 | keep |
| G304 | file path from a variable (traversal) | 103 | keep |
| G301 | loose directory permissions on `Mkdir` | 77 | keep |
| **G115** | integer overflow conversion | 77 | **excluded** — see below |
| G101 | hardcoded credentials | 29 | keep (scope caveat below) |
| G404 | weak random (`math/rand`) | 24 | keep |
| G204 | subprocess launched with a variable | 17 | keep |
| G103 | unsafe package use | 15 | keep |
| G117 | (see note) | 13 | keep |
| **G104** | unchecked error (duplicates errcheck) | 9 | **excluded** — see below |
| G401/G402 | weak crypto / TLS | 9 | keep |
| G703 | path-traversal-via-taint | 6 | keep — this is exactly the code ko-build/ko's own config missed |
| G302 | loose file permissions on `Chmod` | 6 | keep |
| G505 | blocklisted crypto import | 5 | keep |
| G710/G602/G402/G706/G501/G110 | various | ≤2 each | keep |

**Decision: excludes list, not an includes list.** 8 of 11 real exemplar configs that touch gosec use an excludes list, not an includes list ([exemplar-quality-gates.md §1](../go-audit/exemplar-quality-gates.md)). `ko-build/ko`'s own excludes list (`ko-build/ko@fcaeb337b6bd:.golangci.yaml:21-22`, only `G115`) let a live `G703` finding through when gosec's roster grew past it — that is a **process** failure (an excludes list not reviewed on version bumps), not a reason to prefer includes; an includes list has the opposite failure mode (silently missing every *new* legitimate check gosec ships, forever, unless someone remembers to add it). The excludes list is kept short and commented so the review-on-bump instruction travels with the config.

**`G104` is excluded because it duplicates `errcheck`**, which this config already enables. This is not a fleet opinion: gosec ships its own default exclusion `EXC0008` for exactly this reason.

**`G115` is excluded because it is documented false-positive-prone.** `ko-build/ko@fcaeb337b6bd:pkg/caps/caps.go:129-130` is a clean example in this corpus: `data.Data[1].Permitted = uint32(permitted >> 32)` is a deliberate, safe truncation (shifting down to exactly 32 bits before the conversion), and G115 flags it anyway — G115 does not consider prior bounds checks or shifts, a limitation documented at length in [securego/gosec#1187](https://github.com/securego/gosec/issues/1187) and [#1212](https://github.com/securego/gosec/issues/1212) (the "G115 drama" of 2024, still unresolved as of gosec's version bundled in golangci-lint 2.14.0).

**Scope blind spot on `G101` (hardcoded credentials), verified on a planted fixture:** a package-scope `const apiKey = "AKIAIOSFODNN7EXAMPLE..."` fires G101; a functionally identical local `password := "Sup3rS3cr3t!2026Password"` inside a function body does **not**. G101 only inspects package/file-scope `const`/`var` declarations. An agent hardcoding a secret as a local variable — arguably the *more* common shape in generated code — gets zero signal from this MUST linter. See [Verification runs §2](#verification-runs) and [AI-agent angle](#ai-agent-angle).

**Test files are exempted from gosec entirely** (`exclusions.rules: path: _test\.go, linters: [gosec]`) because fixture credentials, malformed inputs, and deliberately-insecure test doubles are gosec's single largest false-positive source in this corpus: `regclient/regclient`'s 17 `G101` hits are 100% inside `config/credhelper_test.go` and `config/docker_test.go` test-table literals, not production code.

### 5. staticcheck: one entry point

The wave-1 audit cites `tailscale/tailscale`'s own `staticcheck.conf` layered *underneath* golangci-lint's bundled staticcheck ([exemplar-quality-gates.md §2](../go-audit/exemplar-quality-gates.md)) as evidence that golangci-lint's bundled staticcheck (0.8.1, vendored) ignores a standalone `staticcheck.conf`, which only the **standalone** `staticcheck` binary (2026.2.1 in this toolchain) reads.

This dive attempted to reproduce that directly: a `staticcheck.conf` with `checks = ["inherit", "-S1012"]` (and separately `-SA1019`) placed at the fixture module root and inside the analyzed package directory. **Result: inconclusive.** Both the standalone `staticcheck` binary and golangci-lint's bundled staticcheck kept reporting the excluded check in every combination tried — i.e. neither honored the conf file in this sandbox, which is not what the audit's citation would predict for the standalone binary. The likely cause is this toolchain's `run.sh` wrapper (`ocx --project ... exec -- staticcheck ...`), which may change the working directory `staticcheck.conf` discovery depends on, before the check runs. **This is reported as a negative result, not a contradiction** of the map's conflict-20 resolution: the wave-1 audit's citation is a *measured* fact about a real repo's config (normative-adjacent, ranked above this dive's own inconclusive reproduction attempt per the map's evidence hierarchy), and the operational rule stands regardless — **pick one staticcheck entry point per repo** (golangci-lint's bundled copy, or the standalone binary with its own `staticcheck.conf`, never both) — because even if this dive could not reproduce the *mechanism* in its own sandbox, running both risks exactly the silent-divergence failure mode the audit observed.

### 6. Noise linters measured and rejected

Same strict `default: all` runs, same 8 repos. None of these appear in any of the 23 real exemplar configs' `enable:` lists ([exemplar-quality-gates.md §5](../go-audit/exemplar-quality-gates.md)):

| linter | cobra | oras-go | ko | zap | go-cmp | regclient | fzf | urfave-cli | why it's noise |
|---|---|---|---|---|---|---|---|---|---|
| wsl (deprecated) + wsl_v5 | 452+93 | 6,931+1,283 | 601+130 | 365+64 | 392+55 | 4,501+613 | 2,066+453 | 420+72 | blank-line style opinion; `default: all` double-counts the deprecated/successor pair |
| exhaustruct(+_v5) | 418 | 2,722 | 280 | 450 | 798 | 2,231 | 197 | 1,608 | demands every struct field set at every literal, including zero-value-is-fine cases |
| paralleltest | 265 | 1,012 | 108 | 264 | — | 264 | 95 | 539 | demands `t.Parallel()` in every subtest regardless of whether the test is safe to parallelize |
| nlreturn | 155 | 1,298 | 186 | 273 | 247 | 934 | 603 | 417 | blank-line-before-return style opinion |
| varnamelen | 39 | 782 | 154 | 128 | 162 | 811 | 242 | 147 | subjective name-length-vs-scope heuristic |
| goconst | 151 | 505 | 67 | 134 | 72 | 464 | — | 386 | fires on any repeated string past a default threshold, many legitimately distinct |
| wrapcheck | 19 | 265 | 160 | 31 | 0 | 505 | 12 | 45 | up to 81/10k LOC (regclient) without per-repo `ignoreSigs` tuning; useful only after curation |
| revive (under `default: all`, i.e. every rule) | 99 | 397 | 38 | 19 | 227 | 249 | 274 | 270 | this is revive's ~80-rule *superset*, not the curated 10-30 rule subset 17/23 real configs run — the volume says nothing about the curated case |
| gocritic (under `default: all`) | 0 | 17 | 5 | 4 | 17 | 79 | 76 | 4 | same problem: `default: all` enables every gocritic check-group, not the `enabled-tags` subset 10/23 real configs use |

`revive` and `gocritic` are the two cases where this dive explicitly declines to answer "signal or noise" from the strict run, because the strict run measures the wrong thing for them (see [Contested](#contested--evolving)).

### 7. Formatter of record

- `gofmt -l .` empty is the MUST check; `golangci-lint fmt --diff` is the equivalent single-command form, exit 0 on clean code. Both verified on a planted malformed file (`func   Bad( ) int { x:=1; return x }`) → `golangci-lint fmt --diff` printed a real unified diff and exited 1; after `gofmt -w`, both checks passed clean. [Verification runs §5](#verification-runs).
- `goimports` (import-block grouping/insertion) is a SHOULD add to `formatters.enable`, per map conflict 3 — gofmt-clean code is not necessarily goimports-clean (an unsorted or ungrouped but otherwise valid import block passes gofmt, fails goimports).
- `gofumpt` stays opt-in: 8/23 real configs use it, but it is strictly stricter than gofmt (every gofumpt-clean file is gofmt-clean, not the reverse), so requiring it fleet-wide would fail code that already passes the MUST bar for no measured defect-rate gain.

### 8. Exclusions, issue caps, and the uniq-by-line trap

**`issues.uniq-by-line: false` is the single most consequential setting in this file**, and it was discovered by this dive's own fixture failing silently. With this config's settings *except* `uniq-by-line` (i.e. relying on golangci-lint's default `true`), running the full MUST config against a fixture with one planted violation per linter produced only 45 issues; four planted MUST violations (`bodyclose`, `modernize`, `wastedassign`, `unparam`) were **silently absent** from the output. Isolating each with `--enable-only` proved all four still fire — they were being suppressed because another enabled linter (most often `unused`, since a demo fixture full of single-purpose, never-called functions trips `unused` on nearly every line) had already reported an issue on the exact same line, and golangci-lint's default `uniq-by-line: true` keeps only one issue per line, arbitrarily. Setting `uniq-by-line: false` restored all 22 planted findings. **A CI gate relying on the default would report a false "clean" on real code wherever two MUST linters' findings happen to land on the same line** — this is a materially different failure mode from the already-known `max-issues-per-linter`/`max-same-issues` caps (which cap *count*, not *distinctness*), and it is undocumented in the parts of golangci-lint's own docs this dive fetched.

**The `std-error-handling` exclusion preset silently exempts some errcheck findings, which breaks a well-formed `//nolint:errcheck` next to them.** Verified: `os.Remove("/tmp/x")` with no error check, under a config enabling `errcheck` alone, is flagged. The identical call under a config that also sets `exclusions.presets: [std-error-handling]` produces **zero** issues — the preset exempts it before errcheck's finding would even reach nolint filtering. Consequence: a `//nolint:errcheck` comment placed next to a call the preset already exempts is reported by `nolintlint` as `"... is unused for linter errcheck"` — correct behavior from nolintlint (the suppression genuinely has nothing to suppress), but confusing to a reader or an agent who does not know the preset silently changed errcheck's behavior first. This config's fixture avoids the preset-exempted shape entirely (using a project-defined function, not a well-known cleanup-style stdlib call) to demonstrate a *genuine* nolintlint pass — see [Verification runs §3](#verification-runs).

### 9. govulncheck is not, and will not be, a golangci-lint linter

[golangci-lint#4623](https://github.com/golangci/golangci-lint/issues/4623) is a feature request to add govulncheck as a golangci-lint linter; it was closed as a duplicate of an earlier, similarly-declined request. `govulncheck` remains a separate binary and a separate CI step, always outside this config — this dive confirmed it is absent from `golangci-lint help linters`' full roster (neither the 5 default-enabled nor the ~120 disabled-by-default linters include it). The gate-commands dive owns the full govulncheck CI-step contract (text-mode exit code, `-scan` mode, the `govulncheck-action` json/sarif exit-code gotcha); this dive only confirms the "it's not in golangci-lint, don't look for it there" boundary.

## Normative guidance candidates

1. **A Go repo's lint gate is the config in [§1](#1-the-config-verbatim), copied verbatim, `.golangci.yml` at repo root.** *Rationale*: one file carries `go vet` + staticcheck + the measured 17-linter exemplar consensus + 13 more signal linters in one command. *Verify*: `golangci-lint config verify` exits 0. *Run*: yes — [Verification runs §0](#verification-runs).
2. **A repo without golangci-lint (Go-team shape: `go vet` + standalone `staticcheck`) still satisfies every MUST row, because each MUST names its underlying analyzer.** *Rationale*: `golang/tools`, `google/go-cmp`, `grpc/grpc-go`, `hashicorp/terraform`, `cockroachdb/pebble`, `dominikh/go-tools`, `stretchr/testify` — 7 of the most-imitated repos in the corpus — carry no golangci-lint config at all. *Verify*: for each MUST row in [§3](#3-the-must-linters-one-by-one), run the named analyzer directly (`go vet ./...`, `staticcheck ./...`, ...). *Run*: yes, for `go vet`/`staticcheck` — [Verification runs §4](#verification-runs).
3. **Never add `default: all` (or `default: standard` and hand-add) as the *baseline* for a real repo's config — only as a one-off discovery pass, and only after reading the deprecation warnings.** *Rationale*: `default: all` in golangci-lint 2.14.0 double-counts three deprecated/successor pairs (`wsl`/`wsl_v5`, `gomodguard`/`gomodguard_v2`, `exhaustruct`/`exhaustruct_v5`), each logged as a `level=warning` line in the run's own output. *Verify*: `golangci-lint run --config <default-all-config> ./... 2>&1 | grep -c 'is deprecated'` on a `default: all` run — nonzero output means at least one deprecated linter is double-firing; empty means none are. *Run*: yes — confirmed 3 deprecation warnings on the cobra strict run (reproducing [exemplar-quality-gates.md §5](../go-audit/exemplar-quality-gates.md)).
4. **Set `issues.uniq-by-line: false`.** *Rationale*: the default `true` silently drops every same-line finding after the first, which this dive's own fixture proved hides real MUST-linter findings ([§8](#8-exclusions-issue-caps-and-the-uniq-by-line-trap)). *Verify*: run the MUST config with and without the setting against a fixture where two MUST linters fire on the same line (e.g. `unused` + `bodyclose`); the finding count must be equal or higher with `uniq-by-line: false`, never lower. *Run*: yes — [Verification runs §1b](#verification-runs).
5. **Set `issues.max-issues-per-linter: 0` and `max-same-issues: 0`.** *Rationale*: golangci-lint's defaults (50, 3) hide the true finding count on first read; 11/23 real exemplar configs already override both to 0. *Verify*: `grep -n "max-issues-per-linter\|max-same-issues" .golangci.yml` — both must be present and `0`. *Run*: reading heuristic only (a cap only manifests with >50 findings of one kind, out of scope for a small fixture).
6. **`gosec` is enabled with an `excludes: [G104, G115]` list, reviewed on every gosec/golangci-lint version bump.** *Rationale*: G104 duplicates errcheck (gosec's own `EXC0008`); G115 is documented false-positive-prone (securego/gosec#1187, #1212) and fired on ko-build/ko's deliberate, safe `uint32(permitted >> 32)` truncation. *Verify*: `run.sh golangci-lint run --enable-only=gosec <path>` against a fixture with a real `uint32(x >> 32)` truncation must show zero findings with this config, and a nonzero finding with the excludes list removed. *Run*: yes — [Verification runs §2b](#verification-runs).
7. **A package-scope `const`/`var` credential-shaped literal is a MUST-fix (gosec G101); a local `:=` with the same shape is not caught by this gate and must be caught in review instead.** *Rationale*: verified scope limitation, [§4](#4-gosec-excludes-vs-includes-and-the-scope-blind-spot). *Verify*: `run.sh golangci-lint run --enable-only=gosec <path>` on the two shapes side by side. *Run*: yes — [Verification runs §2](#verification-runs).
8. **`errorlint.errorf: true` stays on** (the default) — every `fmt.Errorf(..., "%v", err)` at a boundary that should wrap must become `%w`. *Rationale*: resolves map conflict 22 in favor of conflict 7's already-resolved `%w` rule; this is the only mechanical enforcement of that rule. *Verify*: `run.sh golangci-lint run --enable-only=errorlint <path>`. *Run*: yes — [Verification runs §4](#verification-runs), plus 45 real hits on oras-go, 10-hit spot check all genuine.
9. **`nolintlint` runs with `require-explanation: true` and `require-specific: true`.** *Rationale*: a bare `//nolint` silences every linter on a line, forever, with no record of why; only 10/23 real configs customize nolintlint at all, and only golangci-lint's own repo sets both flags true — this fleet does not wait for that to become common practice. *Verify*: a bare `//nolint` fixture must be flagged three ways (missing linter name, missing explanation, "unused" if nothing needed suppressing); a well-formed `//nolint:errcheck // <reason>` next to a genuine, non-preset-exempted violation must pass clean. *Run*: yes — [Verification runs §3](#verification-runs).
10. **`depguard` denies `io/ioutil`, `github.com/pkg/errors`, `github.com/golang/mock`, `golang.org/x/exp/slices`, `golang.org/x/exp/maps`, `golang.org/x/xerrors`, each with a `desc` naming the replacement.** *Rationale*: the two most common exemplar deny targets are exactly the pre-1.16/pre-1.13 idioms H1 named ([exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md) "Patterns worth encoding"); `golang/mock` is archived since 2024-01-08; `x/exp/{slices,maps}` and `x/xerrors` are superseded by stdlib since Go 1.21/1.13. *Verify*: `run.sh golangci-lint run --enable-only=depguard <path>` on a fixture importing `io/ioutil`. *Run*: yes — [Verification runs §4](#verification-runs).
11. **`testifylint` and `sloglint` are enabled unconditionally** (not gated behind "does this repo use testify/slog" logic in the config), because both are no-ops on a repo that imports neither. *Rationale*: self-gating means zero maintenance cost either way, and directly enforces map conflict 1 (testify permitted only with testifylint on) and the slog-preferred-for-new-code direction. *Verify*: `run.sh golangci-lint run --enable-only=testifylint,sloglint ./...` on a stdlib-only repo must report 0 issues; on a repo using testify/slog it must report real findings. *Run*: yes for sloglint (fixture-verified: a `slog.Info` call mixing a key-value pair with a `slog.String` Attr flags `no-mixed-args`, default `true`); testifylint verified only via exemplar counts (zap 94, urfave-cli 141), not a planted fixture, because adding a testify dependency in this offline-preferring sandbox was avoided.
12. **`bodyclose` findings inside a test file that wraps `resp.Body` in another `io.ReadCloser`-returning constructor get a reasoned `//nolint:bodyclose`, not a blanket path exclusion.** *Rationale*: the only false-positive shape measured in this corpus (`oras-project/oras-go`, 88/88 hits, all this shape) is narrow and real; excluding all of `_test.go` from bodyclose (as this config does for gosec) would also hide genuine test-helper leaks. *Verify*: reading heuristic — check whether the response body reaches a `.Close()` call anywhere reachable from the flagged line, including through a wrapper type's method. *Run*: no — this is inherently a manual-review heuristic, not a mechanical check.
13. **`revive` and `gocritic` are SHOULD, gated on a curated per-repo rule/tag subset — never `enable:` with no `settings:`.** *Rationale*: under `default: all` both fire 4-397 times per repo in this measurement, but that measures every one of their ~80-100 individual rules at once, not the 10-30-rule curated subsets 17/23 and 10/23 real configs actually run; this dive could not separately re-measure the curated case within its scope. *Verify*: none proposed here — a future dive that measures a *specific* curated revive/gocritic rule set against the same 8 repos could promote individual rules to MUST. *Run*: no — explicitly deferred, not a reading-heuristic substitute.
14. **`wrapcheck` is SHOULD, adopted only with a repo-specific `ignoreSigs`/`ignorePackageGlobs` list.** *Rationale*: unconfigured, it fires up to 81 findings/10k LOC (`regclient/regclient`) — every external-package error return is flagged regardless of whether wrapping it would help a caller. *Verify*: none proposed as a MUST-backing check; a repo adopting it configures the ignore list first, then the same red/green fixture pattern as any other linter applies. *Run*: no.
15. **`gofmt -l .` (or `golangci-lint fmt --diff`) is the formatter MUST; `goimports` is SHOULD; `gofumpt` is opt-in, never required.** *Rationale*: resolves map conflict 3 with exact exemplar counts (gofmt 15/23, gofumpt 8/23, gci 5/23). *Verify*: `gofmt -l .` (directory operand required) — empty output is the pass. *Run*: yes — [Verification runs §5](#verification-runs).
16. **A repo that runs `go fix`'s `modernize`-family checks itself already satisfies most of this config's `modernize` MUST**, but the two are not identical: `go fix`'s bundled modernizers (26 registered, per `go tool fix help`) include some (`bloop`, `omitzero`) golangci-lint's `modernize` linter does not surface as lint findings the same way. *Verify*: reading heuristic — compare `go tool fix help`'s roster against `golangci-lint help linters | grep -A2 modernize` output; this dive did not attempt a fixture that distinguishes the two tools' exact rule overlap (out of scope; belongs to the `gate-commands` dive, which owns `go fix`). *Run*: no.

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/go-tools/fixtures/golangci-config/`. All commands run through `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, golangci-lint 2.14.0, staticcheck 2026.2.1/0.8.1 bundled). Fixture layout:

```
fixtures/golangci-config/
  mod/.golangci.yml       # the config from §1, verbatim
  mod/bad/bad.go          # one violation per MUST linter (+ bad_test.go for usetesting-style checks)
  mod/good/good.go        # the compliant twin, calling every Fixed function so `unused` stays silent
  mod/fmtcheck/main.go    # the gofmt/fmt --diff before/after pair
  nolint/bad/bad.go       # a bare //nolint
  nolint/good/good.go     # a well-formed, explained //nolint on a genuine (non-preset-exempted) finding
  v1config/.golangci.yml  # a v1-shaped config
```

**§0 — config verify on the final config**
```
$ cd fixtures/golangci-config/mod && run.sh golangci-lint config verify
(no output)                                                    # exit 0 — empty output IS the pass
```

**§1 — the full bad/ fixture, red, then good/, green**
```
$ run.sh golangci-lint run ./bad/...
... 65 issues across 22 targeted linters + unused (28) + unparam (1) — see §1 categories below
exit 1

$ run.sh golangci-lint run ./good/...
0 issues.
exit 0
```
Categories that fired on `bad/`, confirming every MUST linter in [§1](#1-the-config-verbatim) except `testifylint` (self-gating, no testify import in this stdlib-only fixture — see rule 11's caveat):
`bodyclose canonicalheader containedctx contextcheck copyloopvar depguard errcheck errorlint fatcontext gosec govet ineffassign misspell modernize noctx predeclared sloglint staticcheck unconvert unparam unused usestdlibvars wastedassign whitespace`

**§1b — the uniq-by-line regression, isolated**

With `uniq-by-line` left at golangci-lint's default (`true`) — i.e. deleting that one line from the config — the same `./bad/...` run drops from 65 to 45 issues and **silently loses** `bodyclose`, `modernize`, `wastedassign`, and `unparam` entirely from the output (all four still fire under `--enable-only=<linter>` in isolation, proving they were suppressed, not absent). Restoring `uniq-by-line: false` brings the count back to 65 with all four present. This is the config's single most load-bearing setting.

**§2 — gosec G101 scope: package-scope const fires, local var does not**
```go
const gosecViolationAPIKey = "AKIAIOSFODNN7EXAMPLE1234567890"   // fires G101
func gosecViolation() string { return gosecViolationAPIKey }

func f2() string {
    password := "Sup3rS3cr3t!2026Password"                       // does NOT fire G101
    return password
}
```
```
$ run.sh golangci-lint run --enable-only=gosec ./bad/...
bad/bad.go:53:7: G101: Potential hardcoded credentials (gosec)
bad/bad.go:61:15: G107: Potential HTTP request made with variable url (gosec)
2 issues.   exit 1
```
(the local-`:=` variant was tested in an isolated probe module, not left in the shipped fixture, and produced 0 gosec findings)

**§2b — gosec G115 exclude, before/after**
```
$ cat pkg/caps/caps.go  (ko-build/ko@fcaeb337b6bd, lines 120-132: uint32(permitted >> 32))
$ run.sh golangci-lint run --enable-only=gosec  (excludes: [G115] in effect)     → 0 G115 findings
$ run.sh golangci-lint run --enable-only=gosec --config <config-without-excludes>  → G115 fires on the same deliberate truncation
```
(measured directly on the real ko-build/ko clone at the pinned SHA, not a separate planted fixture — reusing real, already-cited evidence per the brief's "cite the audits, re-measure only what your brief needs")

**§3 — nolintlint: bare vs well-formed**
```
$ cd fixtures/golangci-config/nolint && run.sh golangci-lint run ./bad/...
bad/bad.go:6:2: directive `//nolint` should mention specific linter such as `//nolint:my-linter` (nolintlint)
bad/bad.go:6:2: directive `//nolint` is unused (nolintlint)
bad/bad.go:6:2: directive `//nolint` should provide explanation such as `//nolint // this is why` (nolintlint)
4 issues (3 nolintlint + 1 unused).   exit 1

$ run.sh golangci-lint run ./good/...
0 issues.   exit 0
```
The `good/` twin deliberately does **not** use a well-known preset-exempted call (like `os.Remove`) for its suppressed finding — an earlier version of this fixture did, and `nolintlint` correctly (but confusingly) reported the directive itself as "unused for linter errcheck", because `exclusions.presets: [std-error-handling]` had already exempted `os.Remove` from errcheck before nolint filtering ran. Reproduced directly, isolated:
```
$ run.sh golangci-lint run   (errcheck alone, no presets)   on `os.Remove("/tmp/x")` with no check → 1 issue
$ run.sh golangci-lint run   (errcheck + exclusions.presets: [std-error-handling])   same code    → 0 issues
```

**§4 — MUST linters that also work stand-alone (Go-team shape)**
```
$ run.sh go vet ./bad/...          →  reports govet's copylocks + inline findings on the same lines golangci-lint's govet reports
$ run.sh staticcheck ./bad/...     →  reports the same S1012/SA1019/SA4006 findings (plus dead-code U1000, since it is a standalone run)
$ run.sh golangci-lint run --enable-only=depguard ./bad/...   →  1 issue (io/ioutil import), exit 1
$ run.sh golangci-lint run --enable-only=errorlint ./bad/...  →  1 issue (%v instead of %w), exit 1
```

**§5 — formatter of record, before/after**
```go
// fixtures/golangci-config/mod/fmtcheck/main.go, before gofmt -w:
func   Bad( ) int {
	x:=1
	return x
}
```
```
$ run.sh golangci-lint fmt --diff ./fmtcheck/...
diff fmtcheck/main.go.orig fmtcheck/main.go
--- fmtcheck/main.go.orig
+++ fmtcheck/main.go
@@ -1,6 +1,6 @@
 package fmtcheck
 
-func   Bad( ) int {
-	x:=1
+func Bad() int {
+	x := 1
 	return x
 }
exit 1

$ run.sh gofmt -l ./fmtcheck
fmtcheck/main.go             # non-empty = fail
exit 0 (gofmt -l itself always exits 0; non-empty STDOUT is the failure signal, not the exit code)

# after `gofmt -w fmtcheck/main.go`:
$ run.sh golangci-lint fmt --diff ./fmtcheck/...    → (no output)   exit 0
$ run.sh gofmt -l ./fmtcheck                        → (no output)  # empty = pass
```

**§6 — v1 config: reject, then migrate, then re-verify**
```
$ cd fixtures/golangci-config/v1config && run.sh golangci-lint config verify
The command is terminated due to an error: can't load config: unsupported version of the configuration: ""
exit 3

$ run.sh golangci-lint migrate
level=warning msg="The configuration comments are not migrated."
level=warning msg="The configuration `run.timeout` is ignored. By default, in v2, the timeout is disabled."
exit 0
# .golangci.yml is rewritten: version: "2", ~30 explicit linters (presets expanded, gosimple/stylecheck
# folded into staticcheck), gofmt moved into a new top-level formatters: block.

$ run.sh golangci-lint config verify
(no output)   exit 0
```

**A verification that did *not* go red, reported as such: the staticcheck-entry-point reproduction.** As detailed in [§5](#5-staticcheck-one-entry-point), attempting to plant a `staticcheck.conf` and watch standalone `staticcheck` honor it while golangci-lint's bundled copy ignores it produced identical output from both tools in every combination tried in this sandbox — neither exclusion took effect. This is reported honestly as inconclusive rather than folded into a false-confidence claim; the underlying map conflict is resolved on the wave-1 audit's independent citation instead ([exemplar-quality-gates.md §2](../go-audit/exemplar-quality-gates.md)), which this dive did not have cause to doubt, only to fail to reproduce mechanically.

## Exemplar evidence

- **Satisfies the full MUST config, own gate, zero issues**: `spf13/cobra@adbc8813901b`, `oras-project/oras-go@cb6d6dc79f83`, `uber-go/zap@4892335e05f1`, `urfave/cli@d1d810845dbc` — [exemplar-quality-gates.md §5](../go-audit/exemplar-quality-gates.md).
- **Config-drift finding, not a code bug**: `ko-build/ko@fcaeb337b6bd:pkg/build/gobuild.go:436` — gosec `G703` fires under ko's own config because its `excludes` list (`.golangci.yaml:21-22`) only names `G115`, the exact cautionary case cited throughout this dive's `gosec` decision.
- **Deliberate alternative gate, not a smell**: `google/go-cmp@b133f1f1932e`, `grpc/grpc-go@acccf8cd101a` (standalone `revive.toml`), `stretchr/testify@87a7b9d57689` (no golangci-lint; its 12 staticcheck findings are in vendored forks `internal/spew`/`internal/difflib`, not its own code), `hashicorp/terraform@db4eef44f5bb` (standalone `staticcheck.conf` with reasoned `ST*`/`SA1019`/`SA4003` excludes) — none of these carry a golangci-lint config, and this dive's `errcheck`/`govet`/`staticcheck`/`modernize`/`unconvert` MUST rows are exactly the rows that still bind them via their own tools.
- **testifylint/sloglint self-gating, confirmed live**: `uber-go/zap@4892335e05f1` (94 testifylint hits under strict mode — zap uses testify in its test suite despite being a logging library) and `urfave/cli@d1d810845dbc` (141 hits) are the only two of the 8 named exemplars where testifylint fires at all; the other 6 report exactly zero, matching "self-gating" as designed rather than as an assumption.
- **The bodyclose wrapper-type false-positive shape, both instances measured**: `oras-project/oras-go@cb6d6dc79f83:internal/httputil/seek_test.go:43,103` and `registry/remote/auth/client_test.go:66` — all 88 of oras-go's strict-mode bodyclose hits share this shape.
- **contextcheck's multi-hop trace, real chain**: `urfave/cli@d1d810845dbc:command_test.go:1123,1210,1293,1314,1453` — five call sites, all correctly tracing the same `String->Value->lookupFlag` chain not forwarding a received context.

## AI-agent angle

- **Writing a v1-shaped config from training data.** golangci-lint v1 is end-of-life; an agent recalling `linters.presets`, `linters-settings`, `gosimple`/`stylecheck` as separate linters, or `issues.exclude-use-default` will produce a config that `golangci-lint config verify` (2.14.0) rejects outright with `unsupported version of the configuration: ""`. Smallest mechanical check: `golangci-lint config verify` in CI, on every config change, before any lint run.
- **Assuming errcheck flags `f, _ := call()`.** It does not, under this config's (and the tool's) default `check-blank: false`. An agent "fixing" an unchecked error by explicitly discarding it with `_` looks plausible and silences nothing that was actually silenced, because there was nothing errcheck would have flagged either way — but it also does not fix a real problem if the error mattered. Smallest mechanical check: `golangci-lint run --enable-only=errcheck <path>` before and after the "fix" — a genuine fix removes the finding; discarding to `_` never produced one to remove.
- **Believing a bare `//nolint` documents intent.** It suppresses everything, silently, forever, and this config's `nolintlint` (`require-explanation`, `require-specific`) rejects it on three separate axes at once. Smallest mechanical check: `golangci-lint run --enable-only=nolintlint <path>` — any output is the finding.
- **Assuming a hardcoded secret assigned with `:=` inside a function is caught by "the security linter."** It is not, under gosec's real, narrow G101 scope (package/file-scope `const`/`var` only) — see [§4](#4-gosec-excludes-vs-includes-and-the-scope-blind-spot). This is exactly the shape an LLM generating example/scaffold code tends to produce (`func connect() { password := "changeme"; ... }`). Smallest mechanical check: none that closes the gap mechanically within gosec itself — pair with a manual review heuristic ("does this function assign a credential-shaped literal to a local, regardless of gosec's silence") until a project-specific analyzer (à la `cockroachdb/pebble`'s `internal/lint`-as-`go test` pattern) closes it.
- **Adding `default: all` "to see everything," then quoting the raw finding count as evidence of code quality (or lack of it).** `default: all` in golangci-lint 2.14.0 double-counts three deprecated/successor linter pairs and enables every one of revive's and gocritic's ~80-100 individual rules simultaneously, most of them pure style opinions no real exemplar config runs. Smallest mechanical check: `golangci-lint run --config <default-all> ./... 2>&1 | grep -c 'is deprecated'` — nonzero means the raw count is inflated by at least one double-counted pair; treat the resulting number as a discovery starting point, never a score.
- **Relying on golangci-lint's default `issues.uniq-by-line: true` and concluding a file is clean because a re-run shows fewer issues than expected.** This dive's own fixture reproduced exactly this: four planted MUST-linter violations vanished from the output, not because they were fixed, but because another linter had already claimed their line. Smallest mechanical check: run the same target once with `--enable-only=<suspect-linter>` — if it reports something the full run did not, `uniq-by-line` (or a `max-*` cap) is the cause, not a clean codebase.
- **Copying `wrapcheck`, `revive`, or `gocritic` into `enable:` with no `settings:` block, expecting the same low-noise experience as errcheck/staticcheck.** All three are config-dependent: unconfigured, `wrapcheck` alone produced 81 findings/10k LOC on `regclient/regclient` in this measurement, and `revive`/`gocritic` under any all-rules mode produce hundreds of purely stylistic findings per repo. Smallest mechanical check: none proposed as a MUST-backing gate; the check *is* the absence of a curated `settings:` block — if a repo enables these three linters with an empty settings section, that is itself the finding.

## Contested / evolving

- **Whether `revive` and `gocritic` should ever back a MUST.** Both are enabled in a majority of real exemplar configs (17/23 and 10/23), which argues for real value; both are measured here only under `default: all`, which cannot distinguish a well-curated 15-rule revive config from a noisy one. This dive's position: SHOULD, config-your-own-subset, pending a follow-up measurement that runs each of the 8 named exemplars' *own* curated revive/gocritic settings (where they have one) rather than the all-rules superset. Trending: golangci-lint's own docs and changelog show both linters gaining settings surface area release over release, suggesting the ecosystem expects curation, not blanket enablement, as the long-term default shape.
- **The `wsl`→`wsl_v5` and similar deprecation-pair transitions are still in flight as of 2026-09-26.** `wsl` is deprecated since golangci-lint v2.2.0 but still shipped and still selectable; a repo that adopted `wsl` before the rename and has not migrated will silently double-enable both under `default: all`, and a lone `wsl` entry under an explicit `enable:` list (this config's own shape) still works today but is a dead end. Neither `wsl` nor `wsl_v5` backs a MUST here regardless of which name is used — both are pure blank-line style opinions, orthogonal to this decision.
- **Whether `gosec`'s excludes-vs-includes choice should flip as gosec's roster keeps growing.** This dive sides with excludes (majority practice, and the ko-build/ko failure is a process gap, not an architecture gap) but the alternative view — that an includes list fails predictably (nothing new fires without a deliberate add) while an excludes list fails silently (something new fires without anyone noticing until CI turns red) — is a real, live disagreement in the wider Go security-tooling community, not settled by this measurement. As of 2026-09-26, majority *practice* (8/11) still favors excludes; this may not hold if gosec's release cadence outpaces exemplar maintainers' review cycles further.
- **staticcheck's SA5011 removal (disabled in 2026.2, replacement unclear) is unresolved upstream, not just in this dive's config.** staticcheck's own 2026.2 release notes say "it is unclear whether it will be enabled again in the future," and suggest gopls' `nilness` analyzer as a stand-in — but `nilness` is not wired into this config (it is not one of `govet`'s enable-all analyzers as of Go 1.27.1's `go vet` roster). This is a genuine, currently-open gap between "the check that used to exist" and "the check that replaces it," not this dive's decision to make.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [golangci-lint.run/docs/configuration/file/](https://golangci-lint.run/docs/configuration/file/) | official v2 config schema reference | current, golangci-lint 2.x | the authoritative field list for `linters`, `formatters`, `issues`, `run`; fetched in full |
| [golangci-lint.run/docs/product/migration-guide/](https://golangci-lint.run/docs/product/migration-guide/) | official v1→v2 migration guide | current | documents the `formatters` split, preset removal, `migrate` command, and the exact linter-rename table used in [§2](#2-v1--v2-what-breaks-and-what-migrate-does) |
| [golangci-lint.run/docs/linters/](https://golangci-lint.run/docs/linters/) | linter roster reference | current | cross-checked against this dive's own `run.sh golangci-lint help linters` output, which is the primary source actually cited throughout |
| [golangci-lint.run/docs/formatters/](https://golangci-lint.run/docs/formatters/) | formatter roster reference | current | the 6-formatter list (`gci`, `gofmt`, `gofumpt`, `goimports`, `golines`, `swaggo`) behind [§7](#7-formatter-of-record) |
| [staticcheck.dev/docs/checks/](https://staticcheck.dev/docs/checks/) | staticcheck's own check-ID catalogue (SA/S/ST/QF) | current, staticcheck 2026.2 line | the category structure behind every `SA*`/`S*`/`ST*` citation in this doc |
| [staticcheck.dev/changes/2026.2/](https://staticcheck.dev/changes/2026.2/) | staticcheck 2026.2 release notes | 2026 | primary source for SA5011's disabling and SA9010's addition, cited in [Contested](#contested--evolving) |
| [raw.githubusercontent.com/securego/gosec/master/README.md](https://raw.githubusercontent.com/securego/gosec/master/README.md) | gosec's own README, fetched in full via curl | current | the G1xx-G7xx category structure and `#nosec`/include/exclude mechanics behind [§4](#4-gosec-excludes-vs-includes-and-the-scope-blind-spot) |
| [github.com/golangci/golangci-lint/issues/4623](https://github.com/golangci/golangci-lint/issues/4623) | the govulncheck-integration feature request, closed as duplicate | open/closed issue thread | primary evidence for [§9](#9-govulncheck-is-not-and-will-not-be-a-golangci-lint-linter) |
| [github.com/securego/gosec/issues/1187](https://github.com/securego/gosec/issues/1187) | "G115 ignores bounds checks" | 2024–2026, still open | primary evidence that G115's false-positive shape is a known, unresolved upstream limitation, not this dive's opinion |
| [github.com/securego/gosec/issues/1212](https://github.com/securego/gosec/issues/1212) | "G115 is reporting false positives (a summary)" | 2024–2026 | corroborates #1187 with a broader survey of affected projects |
| [raw.githubusercontent.com/golangci/golangci-lint/main/pkg/config/linters_settings.go](https://raw.githubusercontent.com/golangci/golangci-lint/main/pkg/config/linters_settings.go) | golangci-lint's own Go source for every linter's settings struct | current (`main` branch) | ground truth for `ErrorLintSettings`, `NoLintLintSettings`, `GoSecSettings` field names and defaults, fetched directly rather than inferred |
| [raw.githubusercontent.com/golangci/golangci-lint/main/.golangci.reference.yml](https://raw.githubusercontent.com/golangci/golangci-lint/main/.golangci.reference.yml) | golangci-lint's own fully-annotated reference config | current (`main` branch) | the authoritative per-field default-value comments for `usestdlibvars` and `sloglint`, fetched with `curl` and grepped directly (not summarized) after a first WebFetch pass under-reported it |
| `run.sh golangci-lint help linters` / `help formatters` (local tool run) | this toolchain's actual golangci-lint 2.14.0 binary | 2026-09-26, pinned | the ground-truth enabled/disabled-by-default roster this whole config is built against — a primary source more authoritative than any doc page for this exact pinned version |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/.agents/research/go-audit/exemplar-quality-gates.md` | wave-1 audit of all 35 exemplars' real lint/CI configs and 3 strict-mode runs | 2026-09-26 | the empirical 17-linter consensus and signal/noise split this dive extends from 3 to 8 named exemplars |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/.agents/research/go-topic-map.md` | phase-3 topic map, conflicts resolved, wave-2 commission | 2026-09-26 | the binding decisions (conflicts 1, 2, 3, 7, 20, 22) this dive's config must be consistent with, not re-litigate |
| this dive's own fixture runs, `/home/mherwig/.cache/research-lang/go-tools/fixtures/golangci-config/` | 22+ planted violations watched red, then green, against the config in §1 | 2026-09-26, golangci-lint 2.14.0 / Go 1.27.1 | the primary evidence for every "Run: yes" cell in [Normative guidance candidates](#normative-guidance-candidates) |

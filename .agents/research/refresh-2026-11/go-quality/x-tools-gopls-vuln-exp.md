---
title: "Delta 2026-09-26 to 2026-11-27: x/tools, gopls, x/vuln, x/exp, x/sync"
pair: go-quality
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 21
---

# Delta: x/tools, gopls, x/vuln, x/exp, x/sync

This is a delta update. Baseline is 2026-09-26 (go-language, go-api, go-concurrency). Anything not listed as changed stays as written. All facts come from files and logs read at go.googlesource.com, proxy.golang.org and pkg.go.dev on 2026-11-27. Path-limited git history pages on go.googlesource.com require sign-in, so for single files the method was to fetch the file at the old and the new tag and diff the two. That proves whether the content changed, but it does not name the commit for unchanged files.

## Summary

- Every module has a newer release than the pair pins. Four pins go stale; none of the five claims at risk is invalidated.
- The gopls `yield` analyzer message is byte-identical at gopls v0.23.0 and v0.24.0. The gate grep `yield may be called again` still matches.
- `yield` is still a gopls-internal analyzer (`gopls/internal/analysis/yield`). It did not move into `go/analysis/passes`, so `go vet` and golangci-lint govet still cannot run it.
- `toonew.go` at x/tools v0.53.0 still exempts `encoding/json/v2` and `encoding/json/jsontext` from stdversion; the file is byte-identical to v0.50.0, though the exemption is now at lines 28-29 of a file whose text is unchanged. GO-LANG-04 blind-spot wording stays valid.
- govulncheck exit behaviour is unchanged: exit 3 on findings in text mode, exit 0 with `-format json`, `sarif`, or `openvex`. Latest is v1.10.0.
- gorelease is unchanged. apidiff changed behaviour (new compatibility checks, generic methods, deterministic ordering); the "never gate on apidiff's exit code" rule is not affected, but the pinned x/exp pseudo-version is now stale.
- errgroup `SetLimit` and `TryGo` are byte-identical at x/sync v0.25.0 versus v0.23.0.

## Current versions

| Module | Pair pins | Latest at 2026-11-27 | Release date |
|---|---|---|---|
| golang.org/x/tools | v0.50.0 (2026-09-08) | v0.53.0 | 2026-11-17 (v0.51.0 on 2026-10-02, v0.52.0 on 2026-10-10) |
| gopls | v0.23.0 (2026-07-07) | v0.24.0 | 2026-10-14 |
| golang.org/x/vuln (govulncheck) | v1.8.0 (2026-09-08) | v1.10.0 | 2026-11-17 (v1.9.0 on 2026-10-11) |
| golang.org/x/exp | v0.0.0-20260908205506-85c1c2202aba | v0.0.0-20261124000051-d6646c509b6d | 2026-11-24 (commit date of master head; the exp module has no tags) |
| golang.org/x/sync | v0.23.0 (2026-08-31) | v0.25.0 | 2026-10-15 (v0.24.0 on 2026-09-23) |

Sources: [x/tools @latest](https://proxy.golang.org/golang.org/x/tools/@latest), [gopls @latest](https://proxy.golang.org/golang.org/x/tools/gopls/@latest), [x/vuln @latest](https://proxy.golang.org/golang.org/x/vuln/@latest), [x/exp @latest](https://proxy.golang.org/golang.org/x/exp/@latest), [x/sync @latest](https://proxy.golang.org/golang.org/x/sync/@latest), and the per-version `.info` endpoints on the same proxy.

## Findings per claim

### 1. rules/go-quality.md gate step 10: "gopls v0.23.0 on PATH" and the `gopls check | grep -q -e 'yield may be called again'` pipeline

Status: pin stale, command and message unchanged.

- Version: gopls v0.24.0 was released 2026-10-14. The pair says v0.23.0. The pin can move to v0.24.0; the release notes ([v0.24.0](https://go.googlesource.com/tools/+/refs/tags/gopls/v0.24.0/gopls/doc/release/v0.24.0.md)) list no change to `gopls check` and no change to the `yield` analyzer. Analysis changes in v0.24.0 are additive: new `ptrtoerror` analyzer, new modernizers `slicesclip`, `importcomment`, `reflecttypeassert`, a `stringintconv` fix update for Go 1.28, and staticcheck bumped to v0.8.1.
- Message text: `gopls/internal/analysis/yield/yield.go` at gopls/v0.24.0 line 250 builds the message with `fmt.Sprintf("yield may be called again %safter returning false", where)`. `where` is empty, or `(on L<n>) ` when the later call is on another line. A diff of `yield.go` between gopls/v0.23.0 and gopls/v0.24.0 shows only an import path move (`gopls/internal/util/moremaps` to `internal/moremaps`) and a `slices.Backward` loop rewrite in unrelated code; the message line is not touched. The grep `yield may be called again` therefore still matches both forms. Source: [yield.go at gopls/v0.24.0](https://go.googlesource.com/tools/+/refs/tags/gopls/v0.24.0/gopls/internal/analysis/yield/yield.go).
- Flag for the gate author: no change to the message text. The grep needs no edit.
- `gopls check` command: `gopls/internal/cmd/check.go` differs between v0.23.0 and v0.24.0 only by `*Application` becoming `*application` and `diag.Message` becoming `diag.MessageString()` in the printing loop. Behaviour (print each diagnostic at or above the severity cutoff, then `return nil`) is unchanged. Source: [check.go at gopls/v0.24.0](https://go.googlesource.com/tools/+/refs/tags/gopls/v0.24.0/gopls/internal/cmd/check.go).

### 2. GO-CORE-03: "gopls check exits 0 with findings, govulncheck exits 3 on findings in text mode and 0 in json or sarif"; "govulncheck v1.8.0" pin

Status: both exit-code statements unchanged; govulncheck pin stale.

- gopls check exits 0 with findings: unchanged, see the check.go reading above (the function ends in `return nil` after printing; no diagnostic count affects the result).
- govulncheck exit codes: `internal/scan/errors.go` at v1.10.0 defines `errVulnerabilitiesFound` with code 3, `errUsage` with code 2, and `errHelp` with code 0. `cmd/govulncheck/main.go`, `internal/scan/flags.go`, `run.go`, `errors.go`, `template.go`, `text.go` and `sarif.go` are all byte-identical between v1.8.0 and v1.10.0. The pkg.go.dev command doc at v1.10.0 states: "Govulncheck exits successfully (exit code 0) if there are no vulnerabilities, and exits unsuccessfully if there are. It also exits successfully if the 'format -json' ('-json'), '-format sarif', or '-format openvex' is provided, regardless of the number of detected vulnerabilities." Note that openvex is a third zero-exit format; the pair names only json and sarif. Sources: [govulncheck docs](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck), [errors.go at v1.10.0](https://go.googlesource.com/vuln/+/refs/tags/v1.10.0/internal/scan/errors.go).
- Pin: v1.9.0 (2026-10-11) and v1.10.0 (2026-11-17) contain only commits titled "go.mod: update golang.org/x dependencies" ([commit log v1.8.0..v1.10.0](https://go.googlesource.com/vuln/+log/v1.8.0..v1.10.0)). v1.10.0 requires x/tools v0.53.0, x/sync v0.25.0, `go 1.26.0`. No scanner behaviour changed; the pin can move to v1.10.0 for freshness only.

### 3. language.md GO-LANG-04: golangci-lint govet/nogo blind to `encoding/json/v2` and `jsontext` because x/tools exempts them from stdversion

Status: unchanged.

- `internal/typesinternal/toonew.go` at v0.53.0, lines 28-29: `if (pkg.Path() == "encoding/json/v2" || pkg.Path() == "encoding/json/jsontext") && versions.AtLeast(version, "go1.25") { // requires go1.25 && goexperiment.jsonv2 || go1.27 ... return disallowed }`. The file is byte-identical to v0.50.0 (diff empty), so the old cite `toonew.go:28-29` is still correct and the comment text ("requires go1.25 && goexperiment.jsonv2 || go1.27") is unchanged. The same function also still exempts `testing/synctest` at go1.24 (lines 24-25).
- `go/analysis/passes/stdversion/stdversion.go` and `main.go` are byte-identical between v0.50.0 and v0.53.0.
- Consequence: non-negotiable 1 wording "golangci-lint's govet and nogo are blind to it" stays true as far as the x/tools side goes. What this delta did not check is whether a newer golangci-lint than v2.14.0 exists or bundles a different x/tools; that is outside this question's source list and is reported as could not determine. Source: [toonew.go at v0.53.0](https://go.googlesource.com/tools/+/refs/tags/v0.53.0/internal/typesinternal/toonew.go).

### 4. language.md: gopls `yield` analyzer message text and vet reachability

Status: unchanged on both counts.

- Message: see claim 1; unchanged between gopls v0.23.0 and v0.24.0.
- Vet reachability: the directory listing of `go/analysis/passes` at x/tools v0.53.0 contains `stdversion` but no `yield`. gopls registers it from its own internal package: `gopls/internal/settings/analysis.go` at v0.24.0 imports `golang.org/x/tools/gopls/internal/analysis/yield` and lists `{analyzer: yield.Analyzer}   // uses go/ssa`, with the comment that "some (nilness, yield) use go/ssa; see #59714". So `go vet` and golangci-lint govet cannot run it, and `gopls check` remains the only reachable driver. Sources: [passes listing at v0.53.0](https://go.googlesource.com/tools/+/refs/tags/v0.53.0/go/analysis/passes/), [analysis.go at gopls/v0.24.0](https://go.googlesource.com/tools/+/refs/tags/gopls/v0.24.0/gopls/internal/settings/analysis.go).

### 5. api-design.md GO-API-10: gorelease/apidiff from x/exp v0.0.0-20260908205506-85c1c2202aba; "Never gate on apidiff's exit code"

Status: pin stale; apidiff library behaviour changed; gorelease unchanged; the rule text is not contradicted.

- Pin: master head is d6646c509b6d (2026-11-24). Of the 44 commits since the baseline pin, the ones touching the pair's tools are:
  - `3d68b386` (2026-10-07) "apidiff: sort map keys for deterministic output".
  - `f45ad48f` and `c5adaed0` (2026-10-07) cmd/apidiff stops using `gcexportdata.{Read,Write}Bundle` and takes a `token.FileSet` from main.
  - `2ab7f3cb` (2026-10-13) "apidiff: refactor the first two pass for package checking".
  - `f0251eb4` (2026-10-14) "apidiff: require exported old types to match same-named type in new". New compatibility check: expect additional incompatible-change reports.
  - `8ebae6d5` and `47ce03d2` (2026-11-06) check and format `Signature.TypeParams` for generic functions, and support generic methods.
  - `a52e3aef` (2026-11-09) "apidiff: run go fix".
  - The other commits are a new `collection` package family (collection/set, hashed, sorted) and go.mod updates, irrelevant to the pair.
  Source: [exp commit log 85c1c2202aba..master](https://go.googlesource.com/exp/+log/85c1c2202aba..master).
- File diff confirms the apidiff changes (new `sigTypeParams` map in the differ, sorted iteration via `slices.Sorted(maps.Keys(...))`, `t.Methods()` and `s.Fields()` iterators). `apidiff/messageset.go` and `apidiff/README.md` are byte-identical.
- gorelease: `cmd/gorelease/gorelease.go` and `report.go` are byte-identical at the baseline pin and master. Exit behaviour in `gorelease.go` is unchanged: `os.Exit(2)` at line 150 and `os.Exit(1)` at line 156, plus the doc statement that it exits non-zero when the version is wrong for a v1+ module or when incompatible changes are found.
- "Never gate on apidiff's exit code": unchanged. The new checks make apidiff report more differences, which strengthens the reason to read its report rather than its exit status; the rule wording needs no edit. The recommended pin can move to the d6646c509b6d pseudo-version. Because the x/exp module is untagged, any newer pseudo-version would do as well; the only requirement is one at or after 2026-11-06 if the pair wants generic-method coverage.
- Note for GO-API-10 prose: if it says apidiff handles generic functions' type parameters, that was incomplete before 2026-11-06 (commits above). Could not determine whether the current prose says so; it was not read in this delta.

### 6. concurrency.md: errgroup SetLimit/TryGo at x/sync v0.23.0

Status: unchanged.

- `errgroup/errgroup.go` is byte-identical between v0.23.0 and v0.25.0 (empty diff). At v0.25.0, `SetLimit(n)` with `n < 0` sets `g.sem = nil` (no limit), panics with "errgroup: modify limit while %v goroutines in the group are still active" when goroutines are active, and otherwise sets a buffered channel of size `n`. `TryGo` is at line 108 and `Go` at line 72. The v0.24.0 commit `36f2d70e` (2026-09-23) "errgroup: modernize the usage of closures in goroutines" touched only non-code-path text, as the empty diff shows (most likely a test or doc file).
- v0.25.0 also carries `1f920df1` (2026-10-15) "syncmap: rename DeepCopyMap to CopyMap". That affects only `x/sync/syncmap`, which the pair does not use. Flag it if any rule mentions `DeepCopyMap`.
- Sources: [errgroup.go at v0.25.0](https://go.googlesource.com/sync/+/refs/tags/v0.25.0/errgroup/errgroup.go), [x/sync log v0.23.0..v0.25.0](https://go.googlesource.com/sync/+log/v0.23.0..v0.25.0).

## Normative guidance candidates

1. Bump the gate pin text "gopls v0.23.0" to "gopls v0.24.0" in rules/go-quality.md step 10. Rationale: v0.24.0 is current and keeps the `yield` message and `gopls check` behaviour. Verification: `gopls version` prints `golang.org/x/tools/gopls v0.24.0`, and `grep -n "yield may be called again" ` over `gopls/internal/analysis/yield/yield.go` at that tag matches.
2. Bump "govulncheck v1.8.0" to "govulncheck v1.10.0". Rationale: no behaviour change, only dependency updates; latest is the safer pin. Verification: `govulncheck -version` reports v1.10.0.
3. In GO-CORE-03, extend the zero-exit list to "json, sarif, or openvex". Rationale: the v1.10.0 command doc names openvex as a third format that exits 0 regardless of findings. Verification: `govulncheck -format openvex ./...; echo $?` prints 0 on a module with a known finding.
4. Keep the grep `yield may be called again` unchanged. Rationale: message identical at gopls v0.24.0. Verification: run `gopls check` on a fixture with a second `yield` call after a false return and pipe to `grep -q -e 'yield may be called again'`.
5. Keep GO-LANG-04 and non-negotiable 1 unchanged; update the versions only if the pair wants "x/tools v0.53.0" instead of "v0.50.0" (toonew.go:28-29 is identical). Verification: `git show v0.53.0:internal/typesinternal/toonew.go` in x/tools, `sed -n 28,29p`.
6. Move the x/exp pin to v0.0.0-20261124000051-d6646c509b6d or any later pseudo-version. Rationale: includes the apidiff generic-method and old-type-matching checks. Verification: `go run golang.org/x/exp/cmd/gorelease@<pin>` builds and prints a report on a test module.
7. Keep "never gate on apidiff's exit code" and add nothing else. Rationale: the new checks only add reports. Verification: unchanged reading heuristic (grep CI config for `apidiff` followed by an exit-status test).
8. Keep errgroup `SetLimit`/`TryGo` prose unchanged; optionally bump x/sync to v0.25.0. Verification: `go doc golang.org/x/sync/errgroup.Group.SetLimit`.

## AI-agent angle

- An agent trained before this window may emit `gopls v0.23.0` or `govulncheck v1.8.0` pins from the old text. A grep over the rule files for `v0.23.0` and `v1.8.0` catches stale copies.
- An agent may assume `go vet ./...` runs `yield`. It does not; the pass is in no `go/analysis/passes` directory. The smallest check is `go vet -vettool` not existing for it; use `gopls check`.
- An agent may treat `govulncheck -format openvex` as failing on findings. It exits 0. Check `$?` explicitly.
- An agent may assume `DeepCopyMap` still exists in x/sync/syncmap. Since v0.25.0 it is `CopyMap`. `go doc golang.org/x/sync/syncmap` verifies.

## Contested / evolving

- The `encoding/json/v2` exemption in stdversion carries the comment "requires go1.25 && goexperiment.jsonv2 || go1.27". When Go 1.27 ships (outside this window), the exemption is likely to be removed or narrowed, and the GO-LANG-04 blind spot may close. Watch `internal/typesinternal/toonew.go` at the first x/tools tag after the Go 1.27 release. This is an inference from the comment, not a source statement.
- Go 1.28 rejects `string(x)` for integer `x` other than byte or rune (golang/go#3939, per the gopls v0.24.0 release notes). This does not affect the pair's rules today.
- apidiff is under active change; its output may keep growing new incompatibility classes without a tag to pin to.

## Could not determine

- Whether a newer golangci-lint than v2.14.0 exists and what x/tools version it bundles (outside this question's source list).
- Exact commit that last touched `yield.go`, `toonew.go`, `errgroup.go` or `stdversion` per file: path-limited history pages on go.googlesource.com require sign-in. The tag-to-tag content diffs establish that the content is the same.
- The current wording of the pair's GO-API-10 prose about generic functions (file not read in this delta).

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://proxy.golang.org/golang.org/x/tools/@latest | module proxy latest, x/tools | 2026-11-17 | current version |
| https://proxy.golang.org/golang.org/x/tools/gopls/@latest | module proxy latest, gopls | 2026-10-14 | current version |
| https://proxy.golang.org/golang.org/x/vuln/@latest | module proxy latest, x/vuln | 2026-11-17 | current version |
| https://proxy.golang.org/golang.org/x/exp/@latest | module proxy latest, x/exp | 2026-11-24 | current pseudo-version |
| https://proxy.golang.org/golang.org/x/sync/@latest | module proxy latest, x/sync | 2026-10-15 | current version |
| https://go.googlesource.com/tools/+/refs/tags/gopls/v0.24.0/gopls/doc/release/v0.24.0.md | gopls v0.24.0 release notes | 2026-10 | analysis changes in window |
| https://go.googlesource.com/tools/+/refs/tags/gopls/v0.24.0/gopls/internal/analysis/yield/yield.go | yield analyzer source | 2026-10-14 | verbatim message |
| https://go.googlesource.com/tools/+/refs/tags/gopls/v0.24.0/gopls/internal/cmd/check.go | gopls check source | 2026-10-14 | exit behaviour |
| https://go.googlesource.com/tools/+/refs/tags/gopls/v0.24.0/gopls/internal/settings/analysis.go | gopls analyzer registry | 2026-10-14 | yield registered internally |
| https://go.googlesource.com/tools/+/refs/tags/v0.53.0/internal/typesinternal/toonew.go | stdversion exemption table | 2026-11-17 | json/v2 exemption |
| https://go.googlesource.com/tools/+/refs/tags/v0.53.0/go/analysis/passes/ | vet passes directory | 2026-11-17 | yield absent |
| https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck | govulncheck command doc | 2026-11-17 | exit codes |
| https://go.googlesource.com/vuln/+/refs/tags/v1.10.0/internal/scan/errors.go | govulncheck exit codes in code | 2026-11-17 | exit 3 |
| https://go.googlesource.com/vuln/+log/v1.8.0..v1.10.0 | x/vuln commit log | 2026-09 to 2026-11 | only dependency bumps |
| https://go.googlesource.com/exp/+log/85c1c2202aba..master | x/exp commit log | 2026-09 to 2026-11 | apidiff changes |
| https://go.googlesource.com/exp/+/master/cmd/gorelease/gorelease.go | gorelease source | 2026-11-24 | exit status |
| https://go.googlesource.com/sync/+/refs/tags/v0.25.0/errgroup/errgroup.go | errgroup source | 2026-10-15 | SetLimit/TryGo |
| https://go.googlesource.com/sync/+log/v0.23.0..v0.25.0 | x/sync commit log | 2026-09 to 2026-10 | two commits only |

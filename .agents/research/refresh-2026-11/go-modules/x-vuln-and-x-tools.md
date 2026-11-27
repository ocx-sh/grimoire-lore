---
title: "govulncheck and x/tools delta, 2026-09-26 to 2026-11-27"
pair: go-modules
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 14
---

# govulncheck and x/tools delta for the go-modules pair

Scope: only what changed upstream between 2026-09-26 and 2026-11-27 and bears on the go-modules rule and its reference skill. Everything else in the pair stays as researched.

## Summary

- Every govulncheck release after v1.8.0 is a dependency bump only. Behavior is identical to v1.8.0.
- gopls v0.24.0 (2026-10-14) is the current gopls. The yield analyzer is still in gopls and still not in cmd/vet or golangci-lint, so gate step 10 stays.
- x/tools is now v0.53.0 (2026-11-17). The nilness command path still exists.
- The version pins in the pair (govulncheck v1.8.0, gopls v0.23.0, nilness@v0.49.0) are stale but not wrong. They are bump candidates, not corrections.

## Findings

### 1. govulncheck releases after v1.8.0

v1.8.0 was tagged 2026-09-08 (before the window). Two releases follow, both in the window:

| Release | Date | Content |
|---|---|---|
| v1.9.0 | 2026-10-10 (tag listed 2026-10-11 on pkg.go.dev) | commit e672cbe "go.mod: update golang.org/x dependencies"; diff is go.mod and go.sum only |
| v1.10.0 | 2026-11-17 | commit ef4cb2f, same subject; diff is go.mod and go.sum only |

Evidence: `git log v1.8.0..v1.10.0` in a clone of go.googlesource.com/vuln lists exactly those two commits, and `git diff --stat v1.8.0 v1.10.0` touches only go.mod and go.sum (15 lines). Sources: [pkg.go.dev versions](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck?tab=versions), [golang/vuln tags](https://github.com/golang/vuln/tags), [module proxy latest](https://proxy.golang.org/golang.org/x/vuln/@latest). The GitHub releases page was unreachable (HTTP 503) and its cached copy only covered v1.0.0 to v1.1.4, so there are no release notes to cite; the commit diff is the authority.

### 2. Exit codes and output wording (GO-MOD-12)

Unchanged. Because no Go source changed between v1.8.0 and v1.10.0, the following hold at v1.10.0:

- Text format returns `errVulnerabilitiesFound` with exit code 3 (`internal/scan/errors.go:17`, returned from `internal/scan/text.go:84`).
- [cmd/govulncheck doc](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck): exit 0 "if the 'format -json' ('-json'), '-format sarif', or '-format openvex' is provided, regardless of the number of detected vulnerabilities". The flag text lists `text`, `json`, `sarif`, `openvex`, default `text` (`internal/scan/flags.go:46`).
- The marker `    Example traces found:` is still emitted at `internal/scan/text.go:372` in v1.10.0, and the v1.10.0 test goldens contain it. The rule's reachable-finding classification still works.

### 3. Binary mode on stripped builds (GO-MOD-13, GO-REL-05)

Behavior unchanged, and now partly answerable. The corpus open question asked whether over-reporting on `-s -w` binaries is documented. It is documented, in the Limitations section of the doc comment (identical in v1.10.0 `cmd/govulncheck/doc.go`):

> "For binaries where the symbol information cannot be extracted, govulncheck reports vulnerabilities for all modules on which the binary depends."

Also documented: "Because Go binaries do not contain detailed call information ... It may also report false positives for code that is in the binary but unreachable." No fix or change landed in the window. The doc does not name `-s -w` explicitly; the link from stripping to lost symbol information remains the pair's own measurement (4 findings stripped against 1 unstripped, v1.8.0). Verdict: documented as a general limitation, not fixed, not changed.

### 4. gopls and the yield analyzer (gates.md step 10)

- Current gopls release: v0.24.0, 2026-10-14 (pre-releases from 2026-09-30). v0.23.0 was 2026-07-07. Source: [pkg.go.dev gopls versions](https://pkg.go.dev/golang.org/x/tools/gopls?tab=versions), module proxy list `v0.24.0`.
- [v0.24.0 release notes](https://github.com/golang/tools/blob/master/gopls/doc/release/v0.24.0.md): adds `ptrtoerror`, `slicesclip`, `importcomment`, `reflecttypeassert`; changes `stringintconv` and bumps staticcheck to v0.8.1; no analyzers removed; no mention of yield or nilness.
- Yield location at v0.53.0 and master: still `golang.org/x/tools/gopls/internal/analysis/yield`, registered in `gopls/internal/settings/analysis.go` (line 169) next to nilness. `go/analysis/passes/yield/yield.go` returns 404 at v0.53.0 and master, so it is not a public pass.
- cmd/vet: Go master `src/cmd/vet/main.go` runs `vet.Suite` from `golang.org/x/tools/go/analysis/suite/vet`. That list at x/tools v0.53.0 (lines 61-101) contains no yield and no nilness. A v0.49.0 grep for yield also finds nothing. The Go 1.28 vet roster as of master therefore has not gained yield.
- golangci-lint: latest is v2.15.0 (2026-10-16; module proxy). Its `govet` linter imports nilness and has no yield reference. Its changelog entry for v2.15.0 has no yield item.
- Only movement: open proposal [golang/go#82742](https://github.com/golang/go/issues/82742) (opened 2026-10-31, status Open, no decision) to publish gopls-internal analyzers, naming yield as a "most compelling candidate". Related: [#65795](https://github.com/golang/go/issues/65795), the closed 2024 issue that created the gopls analyzer; [#77562](https://github.com/golang/go/issues/77562), an open proposal for a different analyzer (recursiveiter) into vet.
- Message text: [gopls analyzers doc](https://github.com/golang/tools/blob/master/gopls/doc/analyzers.md) on master still shows `yield may be called again (on L2) after returning false`. The grep `'yield may be called again'` still matches.

Answer: gate step 10 cannot be dropped as of 2026-11-27. The removal trigger ("yield reaches vet or golangci-lint") has not fired. The proposal is open and undecided, and Go 1.28 vet has no yield on master.

### 5. nilness command path (GO-GATE-11)

Current x/tools tag: v0.53.0, 2026-11-17 (module proxy @latest; earlier in window: v0.50.0 2026-09-08, v0.51.0 2026-10-02, v0.52.0 2026-10-10). The path `golang.org/x/tools/go/analysis/passes/nilness/cmd/nilness` exists: the v0.53.0 module zip is served, the package page for v0.53.0 resolves, and the master directory listing shows `cmd/nilness`. A pkg.go.dev banner "not in the latest version of its module" appeared on the v0.53.0 page, but the master tree and the proxy @latest both show v0.53.0 as latest with the directory present, so the banner is treated as a page-cache artifact. I did not run `go run ...@v0.53.0` locally, so existence rests on the listing, not an execution.

## Per-claim verdicts

| Claim | Verdict | Detail |
|---|---|---|
| "govulncheck v1.8.0" (rule header, gates.md, release.md) | unchanged as a measurement, bump available | v1.9.0 (2026-10-10) and v1.10.0 (2026-11-17) exist; both dependency-only. The 2026-09-26 measurements remain valid for them. Update to v1.10.0 only if the pair is re-measured. |
| GO-MOD-12 exit codes and sarif/json/openvex exit 0 | unchanged | source: doc.go v1.10.0, errors.go:17 |
| "Example traces found:" marker | unchanged | text.go:372 at v1.10.0 |
| GO-MOD-13 / GO-REL-05 stripped over-reporting | unchanged behavior; now documented | doc.go Limitations quote above; open question can be marked answered: documented as a general limitation, not fixed |
| gopls v0.23.0 carries yield | changed (version only) | old: v0.23.0. New: v0.24.0, 2026-10-14. Yield still gopls-only. |
| Removal trigger and grep `yield may be called again` | unchanged | not in vet suite v0.53.0, not in golangci-lint v2.15.0, message text unchanged on master; trigger not met |
| GO-GATE-11 `nilness/cmd/nilness@v0.49.0` | unchanged and valid | v0.49.0 still resolvable; current tag v0.53.0; command path exists |

## Normative guidance candidates

1. Bump the pins to govulncheck v1.10.0, gopls v0.24.0 and nilness@v0.53.0 only together with a re-measure date. Rationale: the pair's pins are measured values; a silent bump would break the "measured on" claim. Verify: `go run golang.org/x/vuln/cmd/govulncheck@v1.10.0 -version` and `go run golang.org/x/tools/go/analysis/passes/nilness/cmd/nilness@v0.53.0 -h` both run.
2. Keep gate step 10. Rationale: trigger unmet (section 4). Verify at each refresh: `curl -s https://raw.githubusercontent.com/golang/tools/master/go/analysis/suite/vet/vet.go | grep -c yield` prints 0, and `curl -s https://raw.githubusercontent.com/golangci/golangci-lint/main/pkg/golinters/govet/govet.go | grep -c yield` prints 0. A nonzero count is the signal to drop step 10.
3. In GO-MOD-13 and GO-REL-05, cite the doc.go Limitations sentence as the documented basis for stripped-binary over-reporting. Rationale: removes the "corpus open question" status. Verify: `go doc golang.org/x/vuln/cmd/govulncheck | grep -n 'symbol information cannot be extracted'`.

## AI-agent angle

- An agent may claim "go vet now catches yield misuse" from a Go 1.28 headline. The mechanical check is candidate 2's grep on the vet suite.
- An agent may treat "pkg.go.dev: not in the latest version of its module" as removal of the nilness command and drop GO-GATE-11. Check: the proxy zip or `go run ...nilness@latest -h`.

## Contested / evolving

- Whether yield is published and added to vet: open proposal #82742 (2026-10-31), undecided as of 2026-11-27. Trend: toward publishing, but no vet inclusion proposed for yield itself.
- govulncheck is in a dependency-bump cadence (about monthly); behavior has been stable since at least v1.8.0.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck?tab=versions | govulncheck versions | 2026-11 | release list |
| https://github.com/golang/vuln/tags | tags | 2026-11 | confirms v1.9.0, v1.10.0 |
| https://proxy.golang.org/golang.org/x/vuln/@latest | module proxy | 2026-11-17 | latest v1.10.0 |
| https://go.googlesource.com/vuln (clone, v1.8.0..v1.10.0) | commit log and diff | 2026-11 | proves dependency-only |
| https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck | command doc | v1.10.0 | exit codes, binary limits |
| https://raw.githubusercontent.com/golang/vuln/v1.10.0/internal/scan/text.go | source | v1.10.0 | exit 3, trace marker |
| https://pkg.go.dev/golang.org/x/tools/gopls?tab=versions | gopls versions | 2026-10-14 | v0.24.0 |
| https://github.com/golang/tools/blob/master/gopls/doc/release/v0.24.0.md | release notes | 2026-10 | no yield change |
| https://github.com/golang/tools/blob/master/gopls/doc/analyzers.md | analyzer doc | master | message text |
| https://raw.githubusercontent.com/golang/tools/v0.53.0/go/analysis/suite/vet/vet.go | vet suite | v0.53.0 | no yield, no nilness |
| https://raw.githubusercontent.com/golang/go/master/src/cmd/vet/main.go | vet main | master | uses x/tools suite |
| https://raw.githubusercontent.com/golang/tools/v0.53.0/gopls/internal/settings/analysis.go | gopls registry | v0.53.0 | yield internal |
| https://raw.githubusercontent.com/golangci/golangci-lint/v2.15.0/pkg/golinters/govet/govet.go | golangci govet | v2.15.0 | no yield |
| https://github.com/golang/go/issues/82742 | publish gopls analyzers proposal | 2026-10-31 | yield candidate |
| https://pkg.go.dev/golang.org/x/tools/go/analysis/passes/nilness/cmd/nilness | nilness command | v0.53.0 | path exists |

Not fetched: GitHub releases page for golang/vuln (503), govulncheck-action README and go.dev/security/vuln (not needed once the source diff showed no behavior change; not read, so no claim rests on them). The gopls v0.24.0 summary came through a page-summarizing fetch, not raw text.

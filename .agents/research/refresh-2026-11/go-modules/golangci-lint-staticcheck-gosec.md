---
title: golangci-lint, staticcheck and gosec delta, 2026-09-26 to 2026-11-27
pair: go-modules
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 12
---

# golangci-lint, staticcheck and gosec delta

Scope: a delta update. Baseline claims were measured on 2026-09-26 against golangci-lint v2.14.0. Everything below was read from the upstream release metadata, tagged source trees and release notes through the GitHub API and the staticcheck.dev change pages on 2026-11-27. I did not run any golangci-lint binary, so claims about `config verify` exit codes and runtime output rest on source diffs, not on executions (see "Could not determine").

## Summary

- Exactly one golangci-lint release exists after v2.14.0: v2.15.0, published 2026-10-16. v2.14.0 itself was published 2026-09-24, before the window.
- v2.15.0 bundles staticcheck 0.8.2 (staticcheck 2026.2.2, released 2026-10-12), up from 0.8.1 (2026.2.1). The bundled gosec stays at v2.29.0 in both versions.
- No linter in the three config files was renamed, deprecated or removed between v2.14.0 and v2.15.0. The `.golangci.reference.yml` diff contains no such change.
- Recommended pin as of 2026-11-27: v2.15.0, conditional on re-running `golangci-lint config verify` and the superset check. Staying on v2.14.0 is also defensible, since no gate claim is invalidated.
- One behavioural change touches an enabled linter: predeclared was rewritten (0.2.2 to 0.3.0) and golangci now passes mode `shadow` by default. Expect different predeclared findings.
- errcheck jumped from 1.20.0 to 1.30.0 and gained new reports (iterator errors, channel receive statements). Expect new errcheck findings, not config breakage.

## Findings

### 1. Release inventory after v2.14.0

| Release | Date | staticcheck (honnef.co/go/tools) | gosec | Go toolchain used to build |
|---|---|---|---|---|
| v2.14.0 | 2026-09-24 | v0.8.1 (2026.2.1) | v2.29.0 | not determined; go.mod says `go 1.26.0` |
| v2.15.0 | 2026-10-16 | v0.8.2 (2026.2.2) | v2.29.0 | not determined; go.mod says `go 1.26.0` |

Sources: [releases list](https://github.com/golangci/golangci-lint/releases), [v2.15.0 release notes](https://github.com/golangci/golangci-lint/releases/tag/v2.15.0), go.mod at tags [v2.14.0](https://github.com/golangci/golangci-lint/blob/v2.14.0/go.mod) and [v2.15.0](https://github.com/golangci/golangci-lint/blob/v2.15.0/go.mod). The v2.15.0 notes list the staticcheck bump as commit "bump honnef.co/go/tools from 0.8.1 to 0.8.2 (#6866)". Its only gosec entry is "gosec: improve concurency default value (#6859)", which changes the default `Concurrency` from `runtime.NumCPU()` to `runtime.GOMAXPROCS(0)` in `pkg/config/linters_settings.go`. It is not a gosec version bump. Other notes: gofumpt deprecation logs, a custom-version hash fix, an env-var loading fix. No breaking changes are stated.

gosec itself shipped v2.29.0 (2026-08-26) and v2.30.0 (2026-10-23). golangci-lint v2.15.0 pins v2.29.0, so v2.30.0 content is not in any golangci release as of 2026-11-27 ([gosec releases](https://github.com/securego/gosec/releases)).

### 2. Staticcheck

[staticcheck 2026.2 notes](https://staticcheck.dev/changes/2026.2/) and [go-tools releases](https://github.com/dominikh/go-tools/releases): 2026.2 (v0.8.0) 2026-08-20, 2026.2.1 (v0.8.1) 2026-08-21, 2026.2.2 (v0.8.2) 2026-10-12. No 2026.3 or 2027.1 exists in the tag list. 2026.2.1 fixes two SA4023 false positives. 2026.2.2 fixes SA4023 nilness tracking and crashes, an SA1019 crash on generic struct literals, an ordering-comparison crash on type-parameter zero values, adds export-data support for Go 1.27.2, and fixes IR bugs around `goto` and `continue` in range-over-func loops. 2026.2 notes still state SA5011 "has been disabled due to internal changes", with unclear return and gopls nilness as the alternative. The page does not mention QF1009, and ST1000 and ST1020-22 are not named in what was extracted. The page text was summarised by the fetch tool, so absence of QF1009/ST1000 is "not mentioned in the summary", not a verified absence.

### 3. gosec

[gosec v2.30.0 release notes](https://github.com/securego/gosec/releases/tag/v2.30.0): adds rule G125 (unescaped `url.JoinPath` elements) and extends G706 log/slog coverage, plus many false-positive fixes (G102, G112, G118, G121, G203, G303, G402, G403, G407, G602 and others). It is not in golangci v2.15.0. The v2.15.0 reference config adds G407 to the gosec includes and excludes lists (`.golangci.reference.yml` diff). G407 existed in gosec already; the reference file simply lists it now. The shipped files enable gosec with only three excludes, so G407 is simply active, as before.

[securego/gosec#1187](https://github.com/securego/gosec/issues/1187) "G115 ignores bounds checks" is closed as completed on 2024-08-26 by [PR #1189 "Fix conversion overflow false positives"](https://github.com/securego/gosec/pull/1189), merged the same day. The issue was therefore already closed before the baseline. The comment "G115 ignores prior bounds checks (securego/gosec#1187)" in gates.md and the baseline YAML cites a closed, fixed issue. Whether G115 still produces bounds-check false positives in v2.29.0 was not probed (no binary run).

### 4. Linter roster and settings

Diff of `.golangci.reference.yml` v2.14.0 to v2.15.0 (diff run locally, entire output reviewed): adds `allow-empty-blank-assignments` (a linter setting), adds G407 to gosec lists, adds revive rules `specify-disable-rule`, `marshal-receiver`, `multiline-if-init`, `use-slices-concat`, adds revive arguments for `identical-switch-conditions` and `line-length-limit`, and rewrites revive doc URLs. No linter was added, renamed, deprecated or removed. The banned names wsl, wsl_v5, exhaustruct, exhaustruct_v5, paralleltest, tparallel, nlreturn, varnamelen, goconst, noinlineerr, wrapcheck and modernize each still appear in v2.15.0's reference file. In `pkg/config/linters_settings.go` the exhaustive linter's settings gain new keys (`explicit-exhaustive`, `only-types`, `ignore-types`, `ignore-constants`) and four old keys are deprecated (`ignore-enum-members`, `ignore-enum-types`, `explicit-exhaustive-map`, `explicit-exhaustive-switch`). Exhaustive is not enabled in any shipped file. The predeclared settings gain `mode` (default `shadow`).

Dependency bumps in v2.15.0: errcheck 1.20.0 to 1.30.0 ([errcheck v1.30.0 notes](https://github.com/kisielk/errcheck/releases): updated for Go 1.27, new reports for errors returned by iterators and for channel receive statements, `errors.AsType` ignored like `errors.As`, type conversions to error-implementing types no longer flagged). revive 1.17.0 to 1.17.1, paralleltest 1.0.15 to 1.0.16, predeclared 0.2.2 to 0.3.0 (rewrite: "Earlier versions of the predeclared analyzer used imprecise definitions for the terms declaration, shadowing, and qualified name"), wrapcheck 2.12.0 to 2.13.0, canonicalheader pinned to a newer commit. The golangci diff for predeclared also changes its load mode from syntax to types info.

## Per-claim verdicts

| Claim | Verdict | Detail |
|---|---|---|
| "golangci-lint v2.14.0 ... bundled staticcheck 0.8.1" (gates.md line 35, rule header, Severity, three YAML header comments) | unchanged as a measurement; superseded as a pin | v2.14.0 does bundle 0.8.1 (go.mod). Newer release: v2.15.0 (2026-10-16) bundles 0.8.2. "built with go1.27.1" for v2.15.0: could not determine. |
| "staticcheck 2026.2.1" (rule header, GO-GATE-11) | changed if the pin moves | new fact: 2026.2.2 (v0.8.2), 2026-10-12, [notes](https://staticcheck.dev/changes/2026.2/). Unchanged if the pin stays at v2.14.0. |
| "staticcheck 2026.2 disabled SA5011" (GO-GATE-11) | unchanged | still disabled in 2026.2.2; no 2026.3 or 2027.1 exists. QF1009, ST1000, ST1020-22: no change found in the 2026.2.x notes as extracted; not independently verified beyond that. |
| GO-GATE-09: `config verify` exits 3 on a v1 file; preset names `comments`, `common-false-positives`, `std-error-handling`; "0 issues." printed with exit 7 | could not determine | No change in `pkg/commands` (only `internal/builder.go` touched) or the config schema between tags, so no upstream change signal. Not executed. |
| GO-GATE-16 banned names | unchanged | none renamed, deprecated or removed; all still in the v2.15.0 reference file. The `-w` grep needs no change. |
| GO-GATE-21 `--fix` allowlist (usetesting, testifylint, misspell, canonicalheader, whitespace) | could not determine | canonicalheader got a dependency bump in v2.15.0; fix capability not probed. Re-probe is already mandated on a bump. |
| GO-GATE-20 errcheck exclude-functions matching | pending | errcheck jumped 1.20.0 to 1.30.0. No release note mentions changed exclusion matching, but it was not probed. The `os.Open` close behaviour check in GO-GATE-20 must be re-run on v2.15.0. |
| GO-GATE-14 gosec excludes G104, G115, G304 | unchanged for golangci (gosec v2.29.0 both versions); #1187 changed status | gosec v2.30.0 (G125 new, G706 extended) is not bundled yet. #1187 was fixed by PR #1189 on 2024-08-26, before the baseline, so the cited rationale is stale. |
| Enabled linters (copyloopvar, usetesting, fatcontext, sloglint, nilnil checked-types, revive rule names, thelper keys) | unchanged, with one behaviour caveat | no deprecation, rename, setting rename or default change found for these. Revive rule names `context-as-argument`, `deep-exit`, `time-equal` persist in the reference file. Caveat: predeclared default mode is now `shadow` and its analysis was rewritten, so findings may differ. |
| GO-GATE-03 "never enable golangci's modernize" | unchanged | `modernize` still present in the reference file; no change found in the diff touching it. |

## Recommended pin

Recommended pin as of 2026-11-27: **v2.15.0**. Reason: it is the newest release, adds only staticcheck 0.8.2 (crash and false-positive fixes for 2026.2) and linter dependency bumps, and introduces no schema break. If the owner wants zero risk to the measured claims, holding v2.14.0 is equally supportable because no claim is invalidated. A bump to v2.15.0 requires re-running, per the baseline header comment and `go-upgrade`: `golangci-lint config verify` on all three files; the superset check (cli and lib-sdk files must stay supersets of the baseline); `golangci-lint run --default=none --enable-only=gosec` against a copy with no `excludes`; the GO-GATE-20 `os.Open` close behaviour check; the GO-GATE-21 `--fix` allowlist probe; the GO-GATE-09 exit-3 and exit-7 observations; a re-measure of the "built with Go" version; and a look at new errcheck and predeclared findings on a real module. Every "v2.14.0", "2026.2.1", "0.8.1" and "Measured 2026-09-26" string in gates.md, rules/go-modules.md and the three YAML headers would change to match.

## YAML lines that fail or change meaning on v2.15.0

Fail `config verify`: none found. The v2.15.0 reference-file diff removes or renames no key and no linter name that the three files use. This is inferred from the diff and has not been executed.

Change meaning (behaviour, not syntax):
- The `- predeclared` entry in the `enable:` list (all three files): default mode becomes `shadow` and the analyzer was rewritten; findings change.
- The `- errcheck` entry and `errcheck.exclude-functions: (io.ReadCloser).Close`: new errcheck 1.30.0 reports (iterator errors, channel receives); the exclusion matching needs the GO-GATE-20 re-check.
- The header comment `Measured 2026-09-26, golangci-lint v2.14.0 built with Go 1.27.1.` (line 7 of baseline.golangci.yml, same line in the cli and lib-sdk files): text goes stale on a bump.
- `gosec.excludes` lines G104, G115, G304: unchanged behaviour on v2.15.0 (same gosec). The G115 comment citing #1187 is stale because #1187 is closed (see Finding 3).

## Normative guidance candidates

1. Rule: in GO-GATE-14 and the baseline YAML, reword the G115 comment so it no longer cites #1187 as an open defect; state that it was fixed by gosec PR #1189 and that the exclusion is retained pending a re-probe. Rationale: the cited issue is closed since 2024-08-26. Verification: `gh api repos/securego/gosec/issues/1187 --jq .state`, plus the emptied-`excludes` gosec run.
2. Rule: any bump to v2.15.0 re-runs the predeclared and errcheck behaviour probes. Rationale: both linters changed analysis without a config change. Verification: `golangci-lint run ./...` on a module with a shadowing-builtin fixture and an iterator-returning-error fixture.
3. Rule: keep the `go-upgrade` skill's pin and measurement-date strings in a single place per file. Rationale: the version string appears in at least five locations. Verification: `grep -rn "v2.14.0\|2026.2.1\|0.8.1" rules/go-modules.md skills/go-modules-reference`.

## AI-agent angle

An agent trained before late 2026 will believe golangci-lint tops out at v2.14.0 or earlier and will write that pin. Smallest check: `gh api repos/golangci/golangci-lint/releases/latest --jq .tag_name`. An agent may also keep citing gosec#1187 as an open bug: check the issue state.

## Contested / evolving

- SA5011's return in staticcheck is undecided as of 2026-08 (2026.2 notes); no later note says otherwise as of 2026-11-27.
- gosec v2.30.0 is already tagged upstream; the next golangci release will likely carry G125 and the G706 extension, so GO-GATE-14's emptied-excludes probe will matter on the next bump.

## Could not determine

- The Go toolchain version that built the released v2.15.0 binary (go.mod floor is 1.26.0; release notes do not state it).
- Runtime behaviour: `config verify` exit codes, "0 issues." with exit 7, `--fix` capability set, errcheck exclusion matching. No binary was run.
- golangci-lint.run docs pages (configuration reference, migration guide) were not separately fetched; the tagged source reference file and release notes were used instead.
- QF1009 and ST1000/ST1020-22 beyond the summarised 2026.2 notes.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/golangci/golangci-lint/releases | release list | to 2026-10-16 | release inventory |
| https://github.com/golangci/golangci-lint/releases/tag/v2.15.0 | v2.15.0 notes | 2026-10-16 | full changelog |
| https://github.com/golangci/golangci-lint/blob/v2.14.0/go.mod | go.mod at tag | 2026-09-24 | bundled versions |
| https://github.com/golangci/golangci-lint/blob/v2.15.0/go.mod | go.mod at tag | 2026-10-16 | bundled versions |
| https://github.com/golangci/golangci-lint/compare/v2.14.0...v2.15.0 | source diff | 2026-10-16 | settings and linter changes |
| https://github.com/golangci/golangci-lint/blob/v2.15.0/.golangci.reference.yml | reference config | 2026-10-16 | roster and keys |
| https://staticcheck.dev/changes/2026.2/ | staticcheck notes | 2026-08 to 2026-10 | SA5011, patch fixes |
| https://github.com/dominikh/go-tools/releases | staticcheck releases | to 2026-10-12 | dates, no 2026.3 |
| https://github.com/securego/gosec/releases/tag/v2.30.0 | gosec notes | 2026-10-23 | G125, G706 |
| https://github.com/securego/gosec/issues/1187 | G115 issue | closed 2024-08-26 | status |
| https://github.com/securego/gosec/pull/1189 | fix PR | merged 2024-08-26 | fix |
| https://github.com/kisielk/errcheck/releases | errcheck notes | 2026-10-10 | new reports |

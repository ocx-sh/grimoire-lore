---
title: Go 1.28 cycle delta for experiments, fixers and analyzers
pair: go-quality
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 14
---

# Go 1.28 cycle delta, 2026-09-26 to 2026-11-27

This is a delta against the baseline of 2026-09-26. Everything not listed as changed stays as written. Go 1.28 ships around February 2027, so every item marked "scheduled" is a dated forecast, not a rule rewrite.

## Sources actually read

- Go 1.28 draft release notes, `golang/website` `_content/doc/go1.28.md`, last edited 2026-11-26 (read through the GitHub contents API; tip.golang.org/doc/go1.28 was also fetched and agrees).
- Go 1.27 release notes, `golang/website` `_content/doc/go1.27.md`. The `doc/next` fragments no longer exist on master.
- Proposal review minutes, golang/go issue 33502, comments from 2026-10-01, 10-08, 10-15, 10-29, 11-04, 11-12 and 11-19.
- `golang/go` master source read through the API: `src/internal/goexperiment/flags.go`, `src/internal/buildcfg/exp.go`, `src/internal/godebugs/table.go`, `src/internal/analysis/suite/{vet,fix}`, the vendored `x/tools/go/analysis/suite/{vet,fix}/*.go` and `passes/modernize/modernize.go`, `src/cmd/go/internal/test/test.go` (`defaultVetFlags`), `src/testing/synctest/synctest.go`, and the commit logs of those paths since 2026-09-26.
- Issues golang/go 73567, 74967, 76163, 79788, 82464, 82690, 3939 and 81760.
- Not available: a built `gotip` binary, so `go tool fix help` and `go tool vet help` were not run. The Suite source files stand in for them.

## Per-claim verdicts

### language.md GO-LANG-11 "nojsonv2 is slated for removal" and GO-LANG-16 opt-outs

Verdict: unchanged. No removal is scheduled for 1.28.

- The 1.27 notes say "This opt-out is expected to be removed in a future release", with no version. Nothing in the window names one.
- On tip, `src/internal/buildcfg/exp.go` still has `JSONv2: true` and `GreenTeaGC: true` in the baseline flag set, so `nojsonv2` and `nogreenteagc` both still parse. The commit log of `exp.go` and `flags.go` since 2026-09-26 shows no removal.
- [golang/go#79788](https://github.com/golang/go/issues/79788) (keep v2 packages buildable under `nojsonv2`) is closed, decided 2026-06-04 as "should not change the status quo", with a 2026-11-25 comment from a user who found 4 of 40 popular modules fail to build under `nojsonv2` on go1.27.4. This supports GO-LANG-11's "add nothing". It does not alter the schedule.
- The generic removal policy [golang/go#76163](https://github.com/golang/go/issues/76163) is open, milestone Go1.28, label Proposal-Accepted. It governs GODEBUG flags, not GOEXPERIMENT opt-outs, and names neither flag. Policy text: compatibility settings are kept at least two years, and a dated flag is marked deprecated in the release before expiry.
- Pre-window context for GO-LANG-16's pattern: `sizespecializedmalloc` was removed from `flags.go` on 2026-07-28 (commit 4a7645b7), and the 1.27 notes said "expected to be removed in Go 1.28". So a pin naming `nosizespecializedmalloc` already breaks the build on tip. GO-OBS-22's statement that size-specialized malloc is default-on in 1.27.1 stays true for 1.27.x. Forecast: Go 1.28, about February 2027, will reject that pin.
- New 1.27.x field data (all open, 2026-11-24 and 2026-11-25): golang/go#83391, #83392, #83393, #83395 report v1-vs-v2 behaviour differences in 1.27. golang/go#81315 reports 1.5x to 2x slower marshalling and #81067 a 45% larger wasm binary. These argue against removing `nojsonv2` soon but set no date.

### observability.md: nogreenteagc

Verdict: unchanged text, one correction in the baseline wording.

- The baseline says "forecast for removal in 1.27 ... no tracked issue gives a new date". The 1.27 notes (fetched) contain no statement that `nogreenteagc` is removed or scheduled. Tip still carries `GreenTeaGC: true` as a default-on experiment. Still no date.
- Open issues touching it: golang/go#74923 (slowdown, updated 2026-08-19), #82667 (segfault in `newSpanSPMC`, 2026-11-10), #80799 (2026-10-24). None schedules removal.
- Could not determine where the "forecast for removal in 1.27" came from in upstream text. I found no such sentence in the 1.27 notes. The next research pass should re-source or soften that clause.

### testing.md GO-TEST-19 (bloop) and GO-TEST-11 (synctest.Run)

Verdict: unchanged.

- bloop: [golang/go#74967](https://github.com/golang/go/issues/74967) closed 2025-12-23, milestone Go1.26, "disable BLoop analyzer". On tip, `modernize.Suite` still lists `BLoopAnalyzer` only under "Not included: may skew benchmark results, see golang/go#74967". `slicesdelete`, `appendclipped` and `fmtappendf` (golang/go#77581) are also excluded. `fix.Suite` is `buildtag`, `hostport`, `inline`, `stringintconv` plus `modernize.Suite`. No change in the window.
- Run: [golang/go#73567](https://github.com/golang/go/issues/73567) is closed, locked 2026-05-23. `synctest.go` on tip exports `Test`, `Wait`, `Sleep` and `Subtest`, no `Run`. The 1.28 draft adds `synctest.Subtest`, "combines testing.(*T).Run and testing/synctest.Test". Scheduled for 1.28 (forecast, not a rule change): a `Subtest` helper exists; GO-TEST-11 can mention it after 1.28 ships.

### Fixer names: forvar, errorsastype, inline, newexpr, omitzero, atomictypes, waitgroupgo

Verdict: unchanged. All seven are present on tip. `forvar`, `errorsastype`, `newexpr`, `omitzero`, `atomictypes` and `waitgroupgo` are in `modernize.Suite` (waitgroupgo as `WaitGroupGoAnalyzer`); `inline` is in `fix.Suite`. The 1.28 draft has no go fix section. Commit 97ba0aa7 (2026-10-30) only moved the vendored copy from cmd to std.

Open, not scheduled: golang/go#81564 (stditerators rewrite allocates), #80971 (slicesbackward slower, no opt-out), #77563 (stringscutprefix empty prefix), #79813 and #78432 (`//go:fix inline` conflicts). Each could matter to a GO-LANG rule that recommends running a fixer. None is decided.

New for 1.28, forecast: golang/go#3939 (spec: remove `string(int)`), closed, milestone Go1.28, in the draft notes under Language, with the sentence "This new restriction lifts a long-existing `vet` check to the language level." It applies only to modules whose `go` line is 1.28 or higher. golang/go#81760 tracks follow-up work in x/tools (the inliner, `stringintconv` audit, a behaviour-preserving fixer), open. Nothing for the go-quality floors.

### go-quality.md non-negotiable 8 and testing.md: closure case and testinggoroutine

Verdict: unchanged in default behaviour; new experiment on the way.

- `testinggoroutine` is in `vet.Suite` on tip but is still commented out in `defaultVetFlags` in `cmd/go/internal/test/test.go`. The default `go test` set remains atomic, bools, buildtag, directive, errorsas, ifaceassert, nilfunc, printf, slog, stdversion, stringintconv, tests. So "testinggoroutine is not one of" the analyzers go test runs stays true.
- Whether `testinggoroutine` flags `t.FailNow` inside `wg.Go` or `errgroup.Go` closures: could not determine from the sources read; I read no analyzer test data. "No tool checks the closure case" is neither confirmed nor refuted.
- Scheduled, behind an experiment: [golang/go#82464](https://github.com/golang/go/issues/82464) (proposal: `go test` runs analyzers specified by the workspace `go.vet` files; open, Go1.28, release-blocker, freeze exception) and [golang/go#82690](https://github.com/golang/go/issues/82690) (`GOEXPERIMENT=vetfiles`; accepted in the minutes of 2026-11-19). Commits dec0dfe9 (2026-11-13), 9122b765 (2026-11-19) and b6a621b0 (2026-11-06) build a `gotestchecker` driver. The experiment is off by default and no default change is announced. Forecast: if #82464 is accepted, Go 1.28 (about February 2027) could let a repo-level `go.vet` file enable `testinggoroutine` in `go test`. That would be a new opt-in route for non-negotiable 8, not a default.
- [golang/go#82465](https://github.com/golang/go/issues/82465) (accepted 2026-11-19, in the 1.28 draft notes): `go/analysis` now lives in the standard library.

### language.md: no yield check in vet

Verdict: unchanged. `vet.Suite` on tip, read in full, has no yield analyzer. The only vet additions in the 1.28 draft are `scannererr` (checks `bufio.Scanner.Scan` loops for an unhandled `Err`) and `sqlrowserr` (same for `sql.Rows.Next`). Forecast, 1.28 about February 2027: both run in `go vet`, which GO-GATE may want to mention after release. `scannererr` is not in `defaultVetFlags`, so `go test` does not run it.

### io.md GO-IO-05 tarinsecurepath and zipinsecurepath

Verdict: unchanged. `godebugs/table.go` on tip lists both with no `Changed` field, so no default flip. `archive/tar/reader.go` still gates on `tarinsecurepath.Value() == "0"`. The `reader.go` commit logs for both packages show nothing in the window, and the 1.28 draft has no archive section.

### observability.md GO-OBS-12 and concurrency.md: goroutineleak

Verdict: unchanged. `flags.go` has no goroutine-leak experiment, consistent with GA in 1.27. A commit search for "goroutineleak" in the window returned nothing, and the 1.28 draft has no change. The "zero means none found" semantics stand.

## Go-line floors (GO-CORE-04)

No change needed. Libraries stay at `go 1.26.0` and CLIs at `go 1.27.0`. The 1.28 draft's only `go.mod`-linked language changes are the `string(int)` removal and the rejection of generic type aliases for `go 1.23` modules; neither bites at 1.26 or 1.27. A go1.27.4 tag now exists (the baseline cited 1.27.1), so the "1.27.1" wording in GO-LANG-11, GO-TEST-19 and GO-OBS-22 should say "1.27.x" at the next edit.

## Normative candidates

Nothing is proposed as a rule change now. Candidates for after Go 1.28 ships (about February 2027), each to be re-checked against the final notes:

1. GO-LANG-16: add `nosizespecializedmalloc` as a worked example of a pin that breaks. Rationale: the experiment is already gone on tip. Verification: `grep -rn "nosizespecializedmalloc" Makefile Dockerfile .github scripts`.
2. GO-GATE or language: mention `scannererr` and `sqlrowserr` as new vet checks. Verification: `go vet ./...` on a repo with an unchecked `Scanner.Err`.
3. GO-TEST: opt-in `go.vet` route for `testinggoroutine`, only if golang/go#82464 is accepted. Verification: the final 1.28 notes and `go help test`.
4. GO-LANG: `string(int)` removal for modules raising to `go 1.28`. Verification: `go vet -stringintconv ./...` before the bump.

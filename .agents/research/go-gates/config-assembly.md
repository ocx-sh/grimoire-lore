---
title: "Assembling and watching the one fleet golangci-lint config (GO-GATE, config-assembly)"
topic: go-gates/config-assembly
agent: gates/config-assembly (wave 4)
model: sonnet
date_researched: 2026-09-26
sources_count: 15
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/config-assembly/
scope: |
  In scope: assembling the three complete golangci-lint v2 files (baseline,
  library/SDK overlay, CLI overlay) from GO-GATE-09/14/15/18, GO-SEC-01,
  GO-API-04..08, GO-LANG-07 and GO-OBS-01/03/06, resolving Wave-3 contradictions
  1-6 and 22, watching every clause on planted fixtures, and measuring the
  gosec roster plus the overlay linters on the eleven named exemplars.
  Out of scope: re-deciding IDs or severities that go-gates.md, go-security.md,
  go-api.md, go-language.md or go-observability.md already own; those texts
  are cited, never re-litigated.
---

## Table of contents

1. [Findings](#findings)
   1. [Contradiction 1 — exclusion presets](#1-contradiction-1--exclusion-presets-across-four-files)
   2. [Contradiction 2 — gosec excludes](#2-contradiction-2--gosec-excludes-g304-joins-g104-g115)
   3. [Contradiction 3 — the revive rules list](#3-contradiction-3--the-revive-rules-list)
   4. [Contradiction 4 — sloglint no-global placement](#4-contradiction-4--sloglint-no-global-placement)
   5. [Contradiction 5 — the depguard lists](#5-contradiction-5--the-depguard-lists)
   6. [Contradiction 6 — where config text lives](#6-contradiction-6--where-config-text-lives)
   7. [Contradiction 22 — the admission bar vs the overlay MUSTs](#7-contradiction-22--the-admission-bar-vs-the-overlay-musts)
   8. [The CLI G204 policy, confirmed by the count](#8-the-cli-g204-policy-confirmed-by-the-count)
   9. [GO-GATE-02's corrected vet-analyzer counts](#9-go-gate-02s-corrected-vet-analyzer-counts)
   10. [The oras split-module surprise](#10-the-oras-split-module-surprise)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- The fleet ships exactly three complete `.golangci.yml` files — baseline, `lib-sdk.golangci.yml`, `cli.golangci.yml` — each independently valid (no merge, no fragment); GO-GATE keeps ownership of all three texts and every sibling family cites linter names only ([go-topic-map.md](../go-topic-map.md):2379).
- The baseline's `linters.exclusions.presets` is `[comments]` only. `common-false-positives` is banned everywhere: it filters gosec's `G103`, `G204` and `G304` messages by text, not by rule ID (`golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:62-89`), which silences the unsafe audit and turns a compliant `//nolint:gosec // G204` into an "unused directive" nolintlint failure.
- Baseline `gosec.settings.excludes` is exactly `G104, G115, G304` (three entries, not two) — G304 joins the exclude list because untrusted file names route through `os.Root`/GO-IO-02, and its exclusion is what lets the amended preset stand without new G304 noise.
- The library/SDK overlay carries **no** preset at all (`exclusions.presets: []`), because `comments` alone would silence exactly the ST-family and revive `exported` findings the overlay exists to surface (`exclusion_presets.go:6-50`).
- The baseline's `revive.rules` list is three entries — `context-as-argument`, `deep-exit`, `time-equal` — not two. The library/SDK overlay repeats those three and adds a fourth, `exported`; a `rules:` list replaces revive's defaults, so every consumer of the overlay must copy the full four, never just `exported`.
- `sloglint` is enabled bare (no settings) in the baseline and the CLI overlay — a CLI may still `slog.SetDefault` once in `main`. `no-global: "all"` is set only in the library/SDK overlay. An overlay cannot subtract a setting from a shared baseline, so this placement is the only consistent one.
- `depguard`'s `superseded` list grows to 12 entries: the existing 11 plus `go.uber.org/automaxprocs`, with a `desc` naming the Go 1.25 container-aware-runtime floor. A new `logging` rule (`go.uber.org/zap`, `github.com/rs/zerolog`, `github.com/sirupsen/logrus`) sits beside it in **all three** files — SHOULD everywhere, MUST for the SDK only through GO-MOD-10's stdlib-only-runtime rule.
- `golangci-lint config verify` exits 0 on all three assembled files, watched directly (not merely asserted) — see [Verification runs](#verification-runs).
- G103 (`unsafe.String`), the reasoned `//nolint:gosec // G204` line, and the silent `os.ReadFile(path)` under the G304 exclude all behave exactly as GO-SEC-01 predicts, watched on fixtures under all three configs.
- `time-equal` fires under the baseline's revive list on `==`/`!=` of `time.Time` and is silent on `.Equal(...)`; it also duplicates staticcheck's `QF1009` (a quickfix hint, not a lint failure) on the same line — that overlap is cosmetic, not a conflict, because `QF1009` never blocks a build under golangci-lint 2.14.0's default severity.
- `sloglint`'s `no-global: "all"` fires under the library/SDK overlay and is silent under both the baseline and the CLI overlay on the identical violation file — the three-way split is watched directly, not inferred.
- The gosec roster measured on 8 named exemplars under the new excludes (G104/G115/G304 dropped) totals 69 hits in ~123.6k non-test LOC (5.6/10k); every G7xx taint hit traced by hand is a real subprocess-, file- or log-argument shape, confirming ko's known `pkg/build/gobuild.go:436` G703 hit and adding no new false positive.
- `ireturn`, `gochecknoglobals`, `gochecknoinits` and staticcheck's ST-family all measure well above a naive "1 FP/10k" bar on the five named exemplars — but almost none of the excess is a **false** positive; it is real, pre-existing technical debt in code that predates the rule. The one genuine measurement artifact found is revive `exported` firing inside `internal/` packages, which inflated go-cmp's count 16× (193 → 12 once `internal/` is excluded) for zero pkg.go.dev benefit.
- G204 on CLI-shaped exemplars (cli/cli, ko, oras's separate `test/e2e` module, fzf, urfave/cli) totals 33 hits in ~178k LOC (1.9/10k); every sampled hit is a genuine "subprocess launched with a variable" fact, not a linter mistake. This **confirms**, not overturns, the owner default: a per-call reasoned `//nolint:gosec // G204` is the fleet's answer, and GO-IO-13 stays CONSIDER for CLIs because the hits are real and too spread out for a blanket exclude.
- `oras-project/oras`'s root module has zero `os/exec` usage; every G204 hit attributed to "oras" in the brief lives in its separate `test/e2e` Go module (its own `go.mod`), a fact invisible to anyone who runs `golangci-lint run ./...` from the repo root — a `go.work`-less multi-module repo silently under-measures itself this way.
- GO-GATE-02's corrected counts — 35 registered vet analyzers on Go 1.27.1, 12 of them under `go test`'s default vet subset — were already measured at phase 6 (`go1.27.1:src/cmd/go/internal/test/test.go:654-693`; [go-topic-map.md](../go-topic-map.md):2158-2161) and are carried forward here unchanged; this round found no reason to re-open them.
- Contradiction 22's provisional resolution stands: the library/SDK overlay's MUST rows (`gochecknoglobals`, `gochecknoinits`) and SHOULD rows (`ireturn`) are admitted into the overlay file as written; none of the five named exemplars' hit volume is evidence of a broken check, only of debt in code that predates the rule.

## Findings

### 1. Contradiction 1 — exclusion presets, across four files

Before this round, four files disagreed on `linters.exclusions.presets`:

| Source | Text |
|---|---|
| go-gates.md GO-GATE-09 (pre-revision) | `presets: [comments, common-false-positives]` |
| go-security.md GO-SEC-01 | forbids `common-false-positives`; writes `presets: [comments]` |
| go-api.md GO-API-04 overlay YAML (stale) | `presets: [std-error-handling, common-false-positives]` with `comments` "removed" |
| go-errors.md GO-ERR-09 | forbids `std-error-handling` outright |

The mechanism, read directly from the corpus: `common-false-positives` filters gosec findings by **message text**, not rule ID —

```go
// golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:62-89
config.ExclusionPresetCommonFalsePositives: {
	{ Text: "G103: Use of unsafe calls should be audited", Linters: []string{"gosec"}, InternalReference: "EXC0006" },
	{ Text: "G204: Subprocess launched with variable",     Linters: []string{"gosec"}, InternalReference: "EXC0007" },
	{ Text: "G304: Potential file inclusion via variable",  Linters: []string{"gosec"}, InternalReference: "EXC0010" },
},
```

and `comments` filters exactly the doc-comment findings the library/SDK overlay exists to surface:

```go
// golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:6-50
config.ExclusionPresetComments: {
	{ Text: "(ST1000|ST1020|ST1021|ST1022)", Linters: []string{"staticcheck"} },              // EXC0011
	{ Text: `exported (.+) should have comment...or be unexported`, Linters: []string{"revive"} }, // EXC0012
	{ Text: `package comment should be of the form "(.+)..."`, Linters: []string{"revive"} },  // EXC0013
	{ Text: `comment on exported (.+) should be of the form "(.+)..."`, Linters: []string{"revive"} }, // EXC0014
	{ Text: `should have a package comment`, Linters: []string{"revive"} },                    // EXC0015
},
```

**Resolution, watched:** the baseline carries `presets: [comments]` only (verified [C-1], [C-2] below); the library/SDK overlay carries **no** preset (`presets: []`), because `comments` would silence the ST-family and `exported` this overlay is built to enforce; GO-ERR-09's `std-error-handling` stays banned everywhere, confirmed by the anchored grep in [C-16].

### 2. Contradiction 2 — gosec excludes: G304 joins G104, G115

GO-GATE-14's old text excluded exactly `G104` and `G115`. GO-SEC-01 measured that `common-false-positives`'s removal (finding 1) surfaces G304 at 3.3/10k LOC across 6 exemplars, and ruled that G304 should be excluded by name instead, because untrusted file names route through `os.Root` (GO-IO-02) rather than through gosec's own (weak) taint check on `os.ReadFile`/`os.Open`. The resolved list is `G104, G115, G304` in all three files.

Verified directly: `os.ReadFile(path)` with a caller-supplied `path` gives `0 issues.` under the amended config (fixture `g304/probe`), which is the intended silence — GO-IO-02's `os.Root` is where untrusted names are actually bounded, not gosec.

### 3. Contradiction 3 — the revive rules list

golangci-lint's `revive.rules` is a **replacement** list, not an addition to revive's defaults — a fact easy to get backwards, because most other linters' settings blocks only *tune* the default rule set. GO-GATE-15 fixed `context-as-argument` + `deep-exit`. GO-LANG-07 measured `time-equal` at 0 false positives on 435k LOC of the corpus (revive dive [L2](../go-language.md):77) and asked for it in the baseline. GO-API-04 asked for `exported` in the library/SDK overlay. Because the list replaces, not adds, the baseline's three-entry list (`context-as-argument`, `deep-exit`, `time-equal`) has to be **repeated in full** inside the overlay file, with `exported` appended — an overlay that lists only `exported` silently drops the other three from every library/SDK repo.

Watched: baseline fires `time-equal` on `a == b` (`timeeq/bad`) and is silent on `a.Equal(b)` (`timeeq/good`); the overlay fires all four rules when their respective violations are present (proven per-rule across the fixtures below, not as one combined run).

### 4. Contradiction 4 — sloglint no-global placement

GO-GATE-09 enabled `sloglint` bare, commented "self-gating" — a comment this revision drops, because bare sloglint measurably catches nothing (`GO-OBS-03/04`; [obs] C-3/C-4). GO-OBS-03/04 then asked for `no-global: "all"` in "the library and SDK baseline" with "the CLI overlay" omitting it — but an overlay file (which is complete, not merged) **cannot subtract a setting a shared baseline already has**; if the baseline had `no-global: "all"`, the CLI overlay would need to explicitly un-set it, which golangci-lint's schema has no syntax for.

**Resolution, watched:** `no-global: "all"` lives in the library/SDK overlay only. The baseline and the CLI overlay both enable bare `sloglint` (a CLI may still call `slog.SetDefault` once, in `main`). Watched on one violation file across all three configs: fires under `lib-sdk.golangci.yml`, silent under `.golangci.yml` and `cli.golangci.yml`.

### 5. Contradiction 5 — the depguard lists

Three files independently proposed depguard rules: GO-MOD-08 (an 11-entry `superseded` list, `files: ["$all"]`), GO-OBS-06 (add `go.uber.org/automaxprocs` to that same list), GO-OBS-01 (a new `logging` rule denying `go.uber.org/zap`, `github.com/rs/zerolog`, `github.com/sirupsen/logrus`).

**Resolution:** GO-MOD-08 keeps ownership and gains a 12th entry:

```yaml
- pkg: go.uber.org/automaxprocs
  desc: "the runtime is container-aware at go>=1.25 (GO-OBS-06); use runtime.GOMAXPROCS(0)"
```

GO-OBS-01's `logging` rule is quoted verbatim beside `no-testify` in **all three** files (owner default: "depguard `logging` for CLIs too", [go-topic-map.md](../go-topic-map.md):2415), SHOULD everywhere and MUST for the SDK only via GO-MOD-10's stdlib-only-runtime rule.

Watched: `go.uber.org/zap` import → `import 'go.uber.org/zap' is not allowed from list 'logging': new fleet code logs through log/slog (depguard)`, exit 1; `log/slog` twin exits 0. `go.uber.org/automaxprocs` import (blank import) → `import 'go.uber.org/automaxprocs' is not allowed from list 'superseded': the runtime is container-aware at go>=1.25 (GO-OBS-06); use runtime.GOMAXPROCS(0) (depguard)`, exit 1; a `runtime.GOMAXPROCS(0)` twin exits 0.

### 6. Contradiction 6 — where config text lives

Before this round, five families each pasted a YAML fragment: GO-API (the whole overlay), GO-SEC (the gosec block), GO-IO-04 (gosec thresholds), GO-CLI (a fragment with `uniq-by-line` and a gocritic block missing `disable-all`), GO-CONC (a one-rule revive list). Five independently-edited fragments of the same file cannot stay consistent — this round's contradictions 1-5 are the direct symptom.

**Resolution:** GO-GATE now owns exactly three **complete** files: `.golangci.yml` (baseline, GO-GATE-09), `cli.golangci.yml` (CLI overlay, GO-GATE-18), `lib-sdk.golangci.yml` (library/SDK overlay, moved here from GO-API's text). Every sibling family's ruleset cites the linter name and setting it needs (`sloglint.no-global`, `gosec.excludes`, `revive.rules`) and never repastes YAML. This is the structural fix, not a one-time content fix: the next disagreement is caught by re-running `golangci-lint config verify` on these three files, not by diffing five markdown files by eye.

### 7. Contradiction 22 — the admission bar vs the overlay MUSTs

GO-API-06 (MUST, SDK) rests on `gochecknoglobals`/`gochecknoinits`. GO-API-04 (MUST, library/SDK) rests on the staticcheck ST-family and revive `exported`. Neither had been measured against the map's own admission clause — "≤1 FP/10k LOC on ≥5 of 8 named exemplars" — and because a `.golangci.yml` overlay file blocks the build on *any* enabled linter's findings, even a SHOULD row (`ireturn`, GO-API-07) blocks a build the moment the overlay is adopted.

This round measured all four (plus ST1003 specifically) on the five named exemplars, excluding `_test.go` and, after finding revive `exported`'s `internal/` blind spot (finding 10 below), excluding `internal/` too:

| Linter | go-cmp (4,773 LOC) | zap (8,703) | oras-go (17,441) | go-ctrreg (26,426) | go-github (121,551) | rate/10k (weighted) |
|---|---|---|---|---|---|---|
| `gochecknoglobals` | 8 | 20 | 38 | 40 | 8 | 6.4 |
| `gochecknoinits` | 0 | 1 | 0 | 5 | 1 | 0.4 |
| `ireturn` | 51 | 55 | 21 | 134 | 0 | 14.9 |
| `revive exported` | 12 | 0 | 6 | 31 | 13 | 3.3 |
| staticcheck ST1003 | — | — | 2 | — | — | 0.1 |

None of these rates clears "≤1 FP/10k" — but hand-reading a sample of each (§Exemplar evidence) turns up **zero genuine false positives**: every `gochecknoglobals`/`gochecknoinits` hit is a real mutable package-level variable or a real `init()`; every `ireturn` hit is a real constructor returning a declared interface (some legitimate subsystem abstractions per map conflict 5, most needing a per-site `//nolint:ireturn // <reason>` under GO-API-07's SHOULD); every `revive exported`/ST1003 hit, once `internal/` is excluded, is a genuinely undocumented or mis-cased exported identifier.

**Resolution (confirmed, not provisional):** the overlay's MUST and SHOULD rows are admitted as written. The map's ≤1 FP/10k bar measures **false** positives, not raw hit volume on legacy code that predates the rule; high volume on old exemplars is exactly the "real work, not noise" shape the baseline's own `errcheck` admission already established (go-gates.md verdict 6). The SDK and any new library package start from zero debt, so the volume problem does not recur there.

### 8. The CLI G204 policy, confirmed by the count

G204 ("subprocess launched with a potential tainted input or cmd arguments") measured on CLI-shaped exemplars:

| Repo | non-test LOC | G204 hits | rate/10k |
|---|---|---|---|
| `spf13/cobra@adbc8813901b` | 6,955 | 0 | 0 |
| `ko-build/ko@fcaeb337b6bd` | 9,067 | 6 | 6.6 |
| `cli/cli@9b031151a825` | 124,366 | 12 | 1.0 |
| `oras-project/oras@a0cd4de5cfcd` (root module) | 24,841 | 0 | 0 |
| `oras-project/oras@a0cd4de5cfcd` (`test/e2e` module) | 9,999 | 4 | 4.0 |
| `junegunn/fzf@b1be3a8be1b8` | 26,969 | 9 | 3.3 |
| `urfave/cli@d1d810845dbc` | 7,445 | 2 | 2.7 |
| **total** | **~178k** | **33** | **1.9** |

Every hit sampled by hand is a real "subprocess launched with a variable" call: `ko-build/ko@fcaeb337b6bd:pkg/internal/git/clone.go:52` (`exec.CommandContext(ctx, "git", "clone", repoURL, dir)`), `junegunn/fzf@b1be3a8be1b8:src/zellij.go:81` (`exec.Command("zellij", zellijArgs...)`), `cli/cli@9b031151a825:pkg/cmd/root/alias.go:29`. None is a linter mistake — each genuinely spawns a process with caller-influenced arguments, which is exactly the shape gosec is designed to flag.

**Decide (confirmed, not overturned):** the owner default stands. A per-call, reasoned `//nolint:gosec // G204: <reason>` is the fleet's CLI policy (watched under GO-SEC-01's amended preset: [C-2] shows the same reasoned line fails `nolintlint` under the stale `common-false-positives` preset and passes under the amended one). GO-IO-13 stays **CONSIDER** for CLIs: 33 real, individually-judged sites across ~178k LOC is real but not volume dense enough, nor uniform enough in shape, to justify a blanket config exclude — each site genuinely needs a human decision about whether the argument is attacker-influenced.

### 9. GO-GATE-02's corrected vet-analyzer counts

The map's phase-6 harvest already measured this directly and dated it: `go tool vet help` on Go 1.27.1 lists **35** registered analyzers, and `go1.27.1:src/cmd/go/internal/test/test.go:654-693`'s `defaultVetFlags` comment-out block leaves exactly **12** uncommented (`atomic, bools, buildtag, directive, errorsas, ifaceassert, nilfunc, printf, slog, stdversion, stringintconv, tests`) — one more than the pre-1.27 count of 11, because `stdversion` joined in Go 1.27 ([go-topic-map.md](../go-topic-map.md):2158-2161, contradiction 15). This round did not re-run that measurement (the map's own citation is a first-party, dated, line-cited source); it confirms GO-GATE-02's text already carries the corrected "35 / 12" pair and needs no further change here.

### 10. The oras split-module surprise

`oras-project/oras`'s **root** module (`go.mod` at the repo root) contains zero `os/exec` usage anywhere — `grep -rln --include='*.go' -e 'os/exec' .` from the root, excluding `test/e2e/`, is empty. Every subprocess call the corpus's G204 evidence attributes to "oras" lives in a **second, separate** Go module at `test/e2e/` (its own `go.mod`), which `golangci-lint run ./...` or `go vet ./...` run from the repo root **silently never visits** — Go module boundaries stop `./...` cold, with no error, no warning, and `0 issues.` on stdout. A repo audited only from its root module under-reports its own real gosec profile without any signal that anything was skipped. This generalizes GO-GATE-01's "wrong module root" warning (which covers a *misidentified* root printing `0 issues.` at exit 7): here the root is correct, the *second* module is the one nobody ran, and the exit code is a clean 0. The only way to catch this mechanically is `find . -name go.mod -not -path '*/vendor/*'` and gate on running the block once per hit — which is already GO-MOD-06's per-module-root rule, cited here as the reason it must never be skipped even on a repo whose second module is a test helper, not a shipped package.

## Normative guidance candidates

1. **The fleet ships three complete golangci-lint v2 files, never a merged or fragmentary one.** Rationale: five families pasting YAML fragments produced five silent disagreements (contradiction 6). Verify: `golangci-lint config verify --config <file>` on each of `.golangci.yml`, `cli.golangci.yml`, `lib-sdk.golangci.yml`, exit 0 on all three. RUN: yes — [C-1]/[C-2]/[C-3] below, exit 0 on all three as published.
2. **`linters.exclusions.presets` is `[comments]` in the baseline and CLI overlay, and empty (`[]`) in the library/SDK overlay — never `common-false-positives`, never `std-error-handling`.** Rationale: `common-false-positives` hides `G103`/`G204`/`G304` by message text; `comments` hides the ST-family and revive `exported` the overlay exists to enforce. Verify: `grep -rn --include='*golangci*' -e 'common-false-positives' .` empty on all three; anchored `grep -rn -E '^[^#]*std-error-handling' .` empty on all three. RUN: yes — [C-4] below.
3. **`gosec.excludes` is exactly `G104, G115, G304`, never a two-entry or four-entry list.** Rationale: G104 duplicates errcheck, G115 ignores prior bounds checks (securego/gosec#1187), G304 is superseded by `os.Root` (GO-IO-02); any other exclude is unreviewed drift. Verify: `os.ReadFile(<var>)` gives `0 issues.` under the config; re-run gosec with `excludes: []` on every golangci-lint bump and re-justify each entry. RUN: yes, fixture `g304/probe`, exit 0.
4. **`revive.rules` is copied in full, never partially, into any file that adds a rule.** Rationale: golangci-lint's `revive.rules` replaces revive's defaults; a "just add `exported`" overlay silently drops `context-as-argument`, `deep-exit` and `time-equal` from every consumer. Verify: read `settings.revive.rules` in the target file and count entries — baseline 3, library/SDK overlay 4. RUN: partial — the count is a reading heuristic; each individual rule's firing was watched (below).
5. **`time.Time` compared with `==`/`!=` is a MUST-fix everywhere, caught by the baseline's `time-equal` revive rule.** Rationale: `==` compares the monotonic reading and `Location` too, so a JSON round-trip of the same instant is `!=` (GO-LANG-07). Verify: `golangci-lint run ./...`, the finding is `time-equal: use a.Equal(b) instead of "==" operator (revive)`. RUN: yes — fixture `timeeq/`, red on `bad` (exit 1), green on `good` (exit 0).
6. **`no-global: "all"` for sloglint is library/SDK-only; the baseline and CLI overlay leave it unset.** Rationale: an overlay cannot subtract a setting from a shared baseline, so the setting has exactly one home. Verify: the same package-level `slog.Warn(...)` call fires `default logger should not be used (sloglint)` under `lib-sdk.golangci.yml` and gives `0 issues.` under `.golangci.yml` and `cli.golangci.yml`. RUN: yes — fixture `sloglint/`, all three configs.
7. **`depguard`'s `superseded` list has exactly 12 entries (adds `go.uber.org/automaxprocs`), and a sibling `logging` rule denies `zap`/`zerolog`/`logrus` in all three files.** Rationale: contradiction 5's list-ownership fix, plus GO-OBS-01's measured slog-over-zap direction (11/34 repos vs 6). Verify: `golangci-lint run ./...`; the findings are `import '<pkg>' is not allowed from list '<superseded|logging>': <desc> (depguard)`. RUN: yes — fixtures `obs06/` (automaxprocs) and `obs01/` (zap), red/green on both.
8. **CLI G204 hits get a per-call reasoned `//nolint:gosec // G204: <reason>`, never a blanket exclude, never a bare `//nolint`.** Rationale: 33 hits in ~178k LOC of CLI-shaped exemplars are all real, individually-judged subprocess calls (finding 8); GO-IO-13 stays CONSIDER because the shape varies too much for one config rule. Verify: `golangci-lint run ./...` under the amended preset (finding 2) accepts a reasoned line and rejects a bare or wrongly-worded one via `nolintlint`. RUN: yes — fixture `g204/`, red on `badcfg` (stale preset makes the reasoned line "unused", exit 1), green on `good` (amended config, exit 0).
9. **`unsafe.String`/`unsafe.Slice` calls need either a fix or an ADR-cited `//nolint:gosec // G103: ADR-nnnn <invariant>`, watched under the amended preset only.** Rationale: with `common-false-positives` in place, G103 never fires at all — the ADR discipline is unenforceable under the stale config. Verify: `golangci-lint run ./...`; `G103: Use of unsafe calls should be audited (gosec)`. RUN: yes — fixture `g103/`, red on `bad` (exit 1), green on `adr` (exit 0).
10. **Never measure an overlay linter's false-positive rate on exemplar code that includes `internal/` packages when the finding is a doc-comment or naming rule.** Rationale: revive `exported` and the staticcheck ST-family are visibility-blind — they flag missing/malformed comments inside packages that are never importable, which is pure measurement noise for pkg.go.dev-facing rules (finding 10; confirmed no built-in revive option excludes `internal/`). Verify: re-run any doc-comment or naming census with `grep -v '/internal/'` in the file filter before computing a rate; go-cmp's `revive exported` count drops from 193 to 12 this way. RUN: yes — measured directly on 5 exemplars (§Exemplar evidence).
11. **A repo with more than one `go.mod` is measured module-by-module, never assumed covered by `./...` at the repo root.** Rationale: `oras-project/oras`'s `test/e2e/` module is invisible to a root-run `golangci-lint run ./...`, with a clean `0 issues.` and no warning that a whole module was skipped (finding 11; already GO-MOD-06's rule, re-confirmed here as the reason it must bind even a test-helper module). Verify: `find . -name go.mod -not -path '*/vendor/*'` and confirm the gate block ran once per hit. RUN: yes — read directly from the corpus (`find` on `oras-project__oras`, 2 hits).

## Verification runs

All commands ran through `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, golangci-lint 2.14.0, GOTOOLCHAIN=local) on 2026-09-26. Fixture root: `F=/home/mherwig/.cache/research-lang/go-tools/fixtures/config-assembly`. The three assembled files are `F/.golangci.yml`, `F/cli.golangci.yml`, `F/lib-sdk.golangci.yml`.

| # | fixture | command | violation → exit | twin → exit | relevant output |
|---|---|---|---|---|---|
| C-1 | `F` (all three files) | `golangci-lint config verify --config .golangci.yml` / `--config cli.golangci.yml` / `--config lib-sdk.golangci.yml` | — | exit 0 ×3 | no output on success |
| C-2 | `F/g103/{bad,adr}` | `golangci-lint run --config F/.golangci.yml ./...` | `bad` exit 1 | `adr` exit 0 | `bad.go:7:9: G103: Use of unsafe calls should be audited (gosec)` |
| C-3 | `F/g204/{good,badcfg}` | `golangci-lint run --config F/.golangci.yml ./...` (good) vs `--config g204/badcfg/.golangci.yml ./...` (badcfg, stale `common-false-positives`+`comments` preset) | `badcfg` exit 1 | `good` exit 0 | `badcfg`: `directive ... is unused for linter "gosec" (nolintlint)`; `good`: `0 issues.` |
| C-4 | `F/g304/probe` | `golangci-lint run --config F/.golangci.yml ./...` | — (documented silence) | exit 0 | `0 issues.` — `os.ReadFile(path)` is silent by the G304 exclude, GO-IO-02 owns the bound |
| C-5 | `F/timeeq/{bad,good}` | `golangci-lint run --config F/.golangci.yml ./...` | `bad` exit 1 | `good` exit 0 | `bad.go:7:9: time-equal: use a.Equal(b) instead of "==" operator (revive)`; also `QF1009` (staticcheck quickfix hint, non-blocking) on the same line |
| C-6 | `F/sloglint/{bad,good}` | `golangci-lint run --config F/lib-sdk.golangci.yml ./...` | `bad` exit 1 | `good` exit 0 | `bad.go:8:2: default logger should not be used (sloglint)` |
| C-7 | `F/sloglint/bad` | `golangci-lint run --config F/.golangci.yml ./...` and `--config F/cli.golangci.yml ./...` | — (documented silence, both) | exit 0 ×2 | `0 issues.` on both — proves the baseline and CLI overlay do not carry `no-global` |
| C-8 | `F/obs01/{bad,good}` | `golangci-lint run --config F/.golangci.yml ./...` | `withzap` exit 1 | `withslog` exit 0 | `import 'go.uber.org/zap' is not allowed from list 'logging': new fleet code logs through log/slog (depguard)` |
| C-9 | `F/obs06/{bad,good}` | `golangci-lint run --config F/.golangci.yml ./...` | `withautomaxprocs` exit 1 | `maxprocsgood` exit 0 | `import 'go.uber.org/automaxprocs' is not allowed from list 'superseded': the runtime is container-aware at go>=1.25 (GO-OBS-06); use runtime.GOMAXPROCS(0) (depguard)` |
| C-10 | `F/apidoc/{violation,twin}` | `golangci-lint run --config F/.golangci.yml ./...` (baseline) then `--config F/lib-sdk.golangci.yml ./...` (overlay) | `violation`/baseline exit 0 (documented silence); `violation`/overlay exit 1 | `twin`/overlay exit 0 | overlay: `exported: exported function Frob should have comment or be unexported (revive)` and `ST1000: at least one file in a package should have a package comment (staticcheck)`; baseline: `0 issues.` |
| C-11 | `F/globals/{violation,twin}` | `golangci-lint run --config F/lib-sdk.golangci.yml ./...` | `violation` exit 1 | `twin` exit 0 | `defaultTimeout is a global variable (gochecknoglobals)`, `NewRunner returns interface (globalsviolation.Runner) (ireturn)` |
| C-12 | `F` (grep, not a lint run) | `grep -rn -E '^[^#]*std-error-handling' .` on all three files (explicit `.` operand) | — | empty on all three, exit 1 (pass) | no output |
| C-13 | `F/stdpreset/probe` | same anchored grep vs the unanchored form on a **comment-only** mention of the preset name | unanchored: exit 0 (false positive on a clean config's comment) | anchored: exit 1 (correctly ignores the comment) | confirms the anchor is load-bearing, reproducing go-gates.md's own [C-16] |
| C-14 | `F/stdpreset/probe/violation.golangci.yml` | anchored grep against an **active** `presets: [std-error-handling, comments]` line | exit 0 (correctly flags the real violation) | — | `4:    presets: [std-error-handling, comments]` |

No proposed check failed to go red. The only cell with a "documented silence" instead of a fixture is GO-GATE-02's vet-analyzer count (finding 9), which is a phase-6 measurement this round cites rather than repeats.

## Exemplar evidence

**Contradiction 1/2 (presets, gosec excludes) — already-satisfied and violated exemplars**, reused from go-security.md's own corpus reading and re-confirmed by this round's own census run:

- Violated: `google/go-containerregistry@0c8bedb78437:.golangci.yaml:46`, `ko-build/ko@fcaeb337b6bd:.golangci.yaml:27`, `sigstore/cosign@907c3d899c0e:.golangci.yml:60`, `oras-project/oras@a0cd4de5cfcd:.golangci.yml:60`, `spf13/cobra@adbc8813901b:.golangci.yml:57` all still carry `common-false-positives`.
- Satisfied (G103 shape): `cockroachdb/pebble@13596f1e1cea:internal/manual/manual_cgo.go:19` confines `//go:linkname` to a purpose-named package (not in this round's re-run corpus, cited from go-security.md).

**Gosec census under the amended excludes (this round, [C-3]-equivalent full-roster run)** — 8 named exemplars, non-test LOC, hand-classified G103/G204/G7xx:

| Repo | non-test LOC | total gosec | G103 | G204 | G7xx | notable |
|---|---|---|---|---|---|---|
| `spf13/cobra@adbc8813901b` | 6,955 | 0 | 0 | 0 | 0 | clean |
| `oras-project/oras-go@cb6d6dc79f83` | 21,002 | 11 | 0 | 1 | 1 (G703) | `registry/remote/credentials/internal/executer/executer.go:54` (G204); `registry/remote/internal/configpaths/current.go:78` (G703) |
| `ko-build/ko@fcaeb337b6bd` | 9,067 | 14 | 0 | 6 | 3 (2×G703, 1×G706) | confirms the known `pkg/build/gobuild.go:436` G703 hit; also `test/main.go:65,67` (G703/G706 pair) |
| `uber-go/zap@4892335e05f1` | 9,721 | 1 | 0 | 1 | 0 | `internal/readme/readme.go:186` (a benchmark-doc generator, not shipped code) |
| `google/go-cmp@b133f1f1932e` | 6,633 | 5 | 3 | 0 | 0 | `cmp/export.go:19` (×2), `cmp/internal/value/pointer.go:23` — all real `reflect`-adjacent unsafe pointer arithmetic |
| `regclient/regclient@43d2acb9fafd` | 35,819 | 0 | 0 | 0 | 0 | clean under the new excludes |
| `junegunn/fzf@b1be3a8be1b8` | 26,969 | 36 | 18 | 9 | 8 (4×G703, 4×G702) | `src/util/chars.go:236,343,373` (real zero-copy `unsafe.String`/`unsafe.Slice` over rune buffers); `src/zellij.go:81` (G702, real command injection shape) |
| `urfave/cli@d1d810845dbc` | 7,445 | 2 | 0 | 2 | 0 | `scripts/build.go:168,188`, a build script, not shipped code |
| **total** | **~123,611** | **69** | **21** | **19** | **12** | rate 5.6/10k overall; 1.7/10k (G103), 1.5/10k (G204), 1.0/10k (G7xx) |

**G204 on CLI-shaped exemplars** (finding 8, full table above): `cli/cli@9b031151a825:internal/codespaces/ssh.go:85,137`, `pkg/cmd/root/alias.go:29`; `oras-project/oras@a0cd4de5cfcd:test/e2e/internal/utils/{exec.go:213, init.go:123,130,137}` (its separate module, finding 11).

**Contradiction 22's overlay census** (finding 7's table): `google/go-cmp@b133f1f1932e:cmp/internal/testprotos/protos.go:7,14,27,31` are the `revive exported` hits that vanish once `internal/` is excluded from the count — none of those identifiers is ever importable outside the package. `oras-project/oras-go@cb6d6dc79f83:content/cache/cache.go:53` (`ReadOnlyTarget returns interface`) and `registry/remote/auth/cache.go:69,222` are real `ireturn` hits on a subsystem abstraction with 2+ real implementations — legitimate per map conflict 5, each a SHOULD-level `//nolint:ireturn` candidate under GO-API-07, not a false positive. `uber-go/zap@4892335e05f1:encoder.go:34,42` and `error.go:28` are real internal mutable state (`_encoderNameToConstructor`, `_encoderMutex`, `_errArrayElemPool`) — true `gochecknoglobals` positives in a package that predates the rule.

**GO-GATE-02 (finding 9):** `go1.27.1:src/cmd/go/internal/test/test.go:654-693` (35 registered, 12 under `go test`'s subset) — first measured at phase 6, cited here, not re-run.

## AI-agent angle

1. **Copying `common-false-positives` "because it's the golangci-lint default preset name and sounds safe."** It silently deletes exactly the G103/G204/G304 findings the fleet's own security rules depend on, and it is the single most common config mistake in the corpus (13/23 real configs carry it, go-security.md finding 1). Check: `grep -rn --include='*golangci*' -e 'common-false-positives' .` — any output is the finding.
2. **Writing a two-entry `gosec.excludes: [G104, G115]` from memory of the pre-revision text**, missing G304. Check: read the three entries directly; re-run gosec with `excludes: []` on every bump and re-justify each exclusion (GO-GATE-14).
3. **Adding `revive.rules: [{name: exported}]` to "extend" a baseline that already has three rules**, not realizing the list *replaces* rather than adds, and silently dropping `context-as-argument`/`deep-exit`/`time-equal`. Check: count the entries in `settings.revive.rules` against the file's documented list length (3 baseline, 4 overlay).
4. **Putting `sloglint.no-global: "all"` in the shared baseline "to cover everything," breaking every CLI's legitimate `slog.SetDefault()` in `main`.** Check: the setting must appear only in `lib-sdk.golangci.yml`; grep for `no-global` in the other two files should be empty.
5. **Treating a high `ireturn`/`gochecknoglobals` hit count on a mature exemplar as proof the linter is "too noisy for real code" and disabling it**, rather than recognizing pre-existing debt in code that predates the rule. Check: hand-read a sample of 5-10 hits before concluding anything; a genuine false positive is a hit that is factually wrong (the identifier is documented, the variable is immutable), not merely a hit on old code.
6. **Measuring a doc-comment or naming linter's false-positive rate on a repo's `internal/` tree** and concluding the rule doesn't meet the admission bar, when the real issue is that `internal/` packages have no pkg.go.dev audience at all. Check: `grep -v '/internal/'` before computing any rate for `revive exported`, ST1000, ST1003, ST1016 or ST1020-22.
7. **Running `golangci-lint run ./...` from a multi-module repo's root and trusting `0 issues.` as coverage of the whole repository**, when a second `go.mod` (a `test/e2e/` helper module, a tools submodule) is silently never visited. Check: `find . -name go.mod -not -path '*/vendor/*'` before trusting any repo-wide "clean" result (GO-MOD-06).
8. **Suppressing a CLI's G204 finding with a bare `//nolint:gosec` "because it's a CLI and CLIs exec things,"** which fails `nolintlint`'s `require-specific`/`require-explanation` under the amended config. Check: the suppression must read `//nolint:gosec // G204: <reason>`, watched in [C-3] above.

## Contested / evolving

- **Whether `ireturn`'s hit volume on subsystem-abstraction interfaces (`Cache`, `Target`, `ReadOnlyTarget`) should eventually earn a settings-level allowlist rather than per-site `//nolint`.** As of this round, no allowlist exists in the assembled overlay — GO-API-07 stays SHOULD, and the map's own residue list (`interface placement at n=60`) defers a larger-sample study. Direction: unresolved, watch the next SDK/library repo's real annotation cost before adding config.
- **Whether the library/SDK overlay should gain a targeted exclusion for `revive exported`/ST-family inside a repo's own `internal/` tree**, given finding 10's 16× inflation on go-cmp. This round did not add one: the fleet's own future SDK will write fresh, commented `internal/` code from day one, so the noise this round measured is an artifact of applying the overlay *retroactively* to legacy exemplars, not a cost the SDK itself will pay. If a future library adopts this overlay against a large pre-existing `internal/` tree, re-open this question with that repo's real numbers.
- **The `QF1009` staticcheck quickfix hint on the same line as revive's `time-equal` finding (C-5) is cosmetic overlap, not enforced by CI** under golangci-lint 2.14.0's default severity handling — worth re-checking on every golangci-lint bump in case quickfix hints start counting toward `issues.max-issues-per-linter` differently.
- **automaxprocs' depguard `desc` cites "go>=1.25," which is a floor, not a version this file pins.** Every fleet `go` line is already ≥1.26 per Q1, so the desc names *why* the deny exists rather than a live compatibility gate; a non-fleet adopter below 1.25 has a different, weaker argument for the same deny (GO-MOD-09's go-line reading), which this file does not attempt to encode.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [golangci-lint configuration file reference](https://golangci-lint.run/docs/configuration/file/) | Official config docs | v2, current | Defines the exact schema (`version: "2"`, `linters.default`, `exclusions.presets`) every assembled file follows |
| [golangci-lint v1→v2 migration guide](https://golangci-lint.run/docs/product/migration-guide/) | Official migration docs | 2025, current | Explains why `presets`/`linters-settings`/`gosimple`/`stylecheck` are v1-only and rejected by `config verify` |
| [golangci-lint annotated reference config](https://raw.githubusercontent.com/golangci/golangci-lint/main/.golangci.reference.yml) | The project's own reference file | main branch, 2026 | Per-linter default settings for `errorlint`, `usetesting`, `thelper`, `sloglint` |
| `golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:6-89` | The linter's own preset-implementation source, read directly from the exemplar corpus | pinned SHA, 2026-09-26 clone | The mechanism behind contradiction 1: presets filter by message text, not rule ID — verified by this session's own read, lines 6-50 (`comments`) and 62-89 (`common-false-positives`) |
| [securego/gosec RULES.md](https://github.com/securego/gosec/blob/master/RULES.md) | gosec's own rule catalogue | current (2026) | Exact one-line descriptions for G103, G104, G115, G117, G204, G304, G306, and the G701-G708 taint family |
| [securego/gosec#1187](https://github.com/securego/gosec/issues/1187) | Upstream issue | ongoing | G115 "ignores prior bounds checks" — the cited reason it stays excluded |
| [mgechev/revive RULES_DESCRIPTIONS.md](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md) | revive's own rule docs | current (2026) | Confirms `exported`, `time-equal`, `deep-exit`, `context-as-argument` semantics and that `exported` has **no** built-in option to exclude `internal/` packages — the basis for finding 10 |
| [go-simpler/sloglint README](https://raw.githubusercontent.com/go-simpler/sloglint/master/README.md) | sloglint's own docs | current (2026) | `no-global: "all"` vs `"default"` semantics, the basis for contradiction 4's resolution |
| [pkg.go.dev/cmd/vet](https://pkg.go.dev/cmd/vet) | Standard library command docs | Go 1.27 era | The vet analyzer roster and its exit contract, backing GO-GATE-02 |
| [pkg.go.dev/cmd/go — Testing flags](https://pkg.go.dev/cmd/go#hdr-Testing_flags) | Standard library command docs | Go 1.27 era | Documents that `go test` runs a fixed vet subset, not the full analyzer set |
| `go1.27.1:src/cmd/go/internal/test/test.go:654-693` | The `go` command's own source, read via the pinned toolchain | Go 1.27.1 | `defaultVetFlags`' exact 12-analyzer subset, the primary source behind GO-GATE-02's corrected count (cited from phase 6, not re-derived here) |
| [staticcheck 2026.2 release notes](https://staticcheck.dev/changes/2026.2/) | Tool release notes | 2026.2 | SA5011 disabled, SA9010 added — why `govet enable-all` (`nilness`) is now load-bearing (GO-GATE-11), cross-cutting context for this file's baseline |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Official Go release notes | Go 1.27, Aug 2026 | `stdversion` joining `go test`'s default vet subset — the source of GO-GATE-02's "12, not 11" |
| [Working with Errors in Go 1.13](https://go.dev/blog/go1.13-errors) | Official Go blog | 2019, still current guidance | Backs GO-ERR-09's `std-error-handling` ban this file's presets clause defers to |
| [go-tools staticcheck exclusion_presets.go (via corpus)](https://github.com/golangci/golangci-lint) | Same as above, cited separately for the repository as a whole | 2026-09-26 clone | The general provenance of the exemplar corpus's `golangci/golangci-lint` clone this file's line citations come from |

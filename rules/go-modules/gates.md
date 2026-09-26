---
title: The Go Gate Block and the Three golangci-lint Files
summary: The GO-GATE family, what fails the build for Go. It owns the ordered CI gate block run from every go.mod root, the vet, go fix, race, generate and gopls steps, the golangci-lint pin, and the three complete golangci-lint v2 files a module copies whole
---

# The Go Gate Block and the Three golangci-lint Files

Binds to Go 1.27.1, golangci-lint v2.14.0, staticcheck 2026.2.1, govulncheck v1.8.0 and gopls v0.23.0, measured 2026-09-26.

Owns what fails the build: the ordered command block, which of the three
golangci-lint files a module copies, every setting inside those files, and
which linters are banned. Does not own the rules those files enforce. Tidy and
`-mod=readonly` are GO-MOD-03, dev-tool pinning GO-MOD-11, the govulncheck step
and its json/sarif exit-0 trap GO-MOD-12, per-root execution GO-MOD-06 and the
version matrix GO-MOD-16, all in GO-MOD (module rules). The depguard list texts
belong to GO-MOD-08, GO-OBS-01 (observability) and GO-TEST-02 (testing), and the
files only quote them. Generated-code detection is GO-CORE-05 (the `go-quality`
index). The gosec suppression shapes are GO-SEC-01 and G101's scope is GO-SEC-08
(security). The doc, globals, interface-return and enum rules behind the
library/SDK file are GO-API-04, -06, -07 and -08 (API design), and the iterator
contract behind step 10 is GO-LANG-08 (language). "The SDK" means the
stdlib-only library that wraps the project's CLI, a pinned default the adopter
renames or drops.

Contents: [Dates and Floors](#dates-and-floors) · [The Gate Block](#the-gate-block) ·
[CI Workflow Shape](#ci-workflow-shape) · [Choosing the Config File](#choosing-the-config-file) ·
[Settings That Must Not Drift](#settings-that-must-not-drift) ·
[Linters Outside the Files](#linters-outside-the-files) · [Documented Gaps](#documented-gaps) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 unless a row says otherwise.

- **golangci-lint v2.14.0**, built with go1.27.1 (bundled staticcheck 0.8.1). The v2 schema is required, and a v1 file exits 3 on `config verify`.
- **Go 1.27 toolchain:** `go test` runs 12 of vet's 35 analyzers (`stdversion` joined in 1.27, 11 before). Behaviour-gated by the toolchain, not the `go` line.
- **Go 1.26 toolchain:** `go fix` runs the modernizers. **Go 1.25 toolchain:** vet's `waitgroup` and `hostport`, which fire even under a `go 1.21` line.
- **staticcheck 2026.2** disabled SA5011, so govet's `nilness` is the only nil-dereference check left (GO-GATE-11).
- **gopls v0.23.0** carries the `yield` analyzer that neither vet nor golangci-lint runs (step 10).
- **Pinned defaults, adopter may override once:** golangci-lint stays at v2.14.0 and moves only through the `go-upgrade` skill. Windows is first-class for the SDK and CLIs. `-race` runs on the Linux leg only. A CLI never takes the library/SDK file. `no-testify` is on.

## The Gate Block

Run from each `go.mod` root (GO-MOD-06). The `go-quality` index quotes this block.

```sh
golangci-lint fmt --diff                  # 1 format (Go-team shape: test -z "$(gofmt -l .)")
go vet ./...                              # 2 all 35 vet analyzers (go test runs 12)
golangci-lint run ./...                   # 3 the module's GO-GATE-22 file
go fix -diff ./...                        # 4 modernizers + //go:fix inline
go build ./... && go test ./...           # 5
CGO_ENABLED=1 go test -race ./...         # 6 every PR, linux leg
go mod tidy -diff                         # 7 GO-MOD-03
govulncheck ./...                         # 8 text mode, exits 3 on findings (GO-MOD-12)
# 9 only if any //go:generate exists:
go generate ./... && test -z "$(git status --porcelain)"
# 10 only if an iterator producer exists (GO-LANG-08), gopls v0.23.0 on PATH:
test -z "$(grep -rlZ --include='*.go' --exclude-dir=vendor -e 'func(yield func(' . | xargs -0 -r gopls check | grep -e 'yield may be called again')"
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-GATE-01 | Run the block above, in order, from every `go.mod` root, including test-helper and tools modules. Every step fails the job on a non-zero exit, and no step is dropped because an earlier one "covers" it. On a Go-version matrix (GO-MOD-16), steps 1 to 4 and 7 to 10 run once on the `stable` leg and steps 5 and 6 run on every leg. Step 10 runs only where a file contains `func(yield func(`, and it is removed once gopls's `yield` analyzer reaches vet or golangci-lint. | Each step catches a defect class no other step sees: `go test` runs 12 of 35 vet analyzers, and golangci-lint, vet and staticcheck are all silent on a re-called `yield`. A module that is never a root is never checked: a real CLI kept every subprocess call in a second `test/e2e` module, and a root-level `./...` exited 0 over it. | Each step's exit status, never its stdout: golangci-lint prints `0 issues.` yet exits 7 on a typecheck or wrong-root error. `find . -name go.mod -not -path '*/vendor/*'` lists the roots, and a root no job runs in is the finding. Step 10 watched: a loop that ignores `yield` exits 1, the checked twin and a module with no iterator exit 0. | MUST |
| GO-GATE-02 | Run `go vet ./...` as its own step in every repo, whether or not golangci's `govet` is enabled. Never read a green `go test` as a vet pass. | `go test` is silent on `copylocks`, `lostcancel`, `loopclosure`, `unusedresult`, `waitgroup`, `hostport` and `composites` (Go 1.27.1). Vet costs seconds and tracks the toolchain, not golangci's build toolchain. | `go vet ./...`: exit 0 with empty output is the pass, and the analyzer prefix (`copylocks:`) names the defect. Watched on 7 fixtures that pass `go test` and fail `go vet`. | MUST |
| GO-GATE-03 | Gate modernization on `go fix -diff ./...` and never enable golangci's `modernize`. `go fix ./...` may run unattended, but read its stderr first: an `ignoring alternative fix "…(behavior change)"` line names what it declined. | Only `go fix` applies `//go:fix inline`: golangci printed `0 issues.` where `go fix` exited 1. Running both double-reports every other modernizer finding. | `go fix -diff ./...`: exit 1 with a diff is the finding, exit 0 the pass. | MUST |
| GO-GATE-05 | Where any `//go:generate` directive exists, gate on step 9. Never check generate drift with `git diff --exit-code`. | A generator that writes a new file leaves it untracked. `git diff --exit-code` exits 0 on that drift while the porcelain check exits 1. | Step 9's exit status: 0 is the pass. Watched on stale output and on new-file-only drift. | MUST |
| GO-GATE-06 | gofmt is the formatting MUST: `golangci-lint fmt --diff` exits 0, or `test -z "$(gofmt -l .)"` passes. `goimports` is SHOULD. `gofumpt` is opt-in and never required. | The three nest (gofumpt-clean implies goimports-clean implies gofmt-clean), so gofmt is the floor every formatter agrees on. `gofmt -l` always exits 0, so its stdout is the only failure signal. | `golangci-lint fmt --diff`: exit 1 with a unified diff is the finding. | MUST |

## CI Workflow Shape

The workflow files are read, not linted. Each grep below runs from the repo root against `.github/workflows`. On another CI system, point it at that system's config directory, because grep exits 2 on a missing operand and that is never a pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-GATE-04 | Run `go test -race ./...` on every PR in a job that sets `CGO_ENABLED=1` explicitly. The release job's `CGO_ENABLED=0` never reaches the race job. Move `-race` to a scheduled lane only after measuring that it bottlenecks CI. | `-race` needs cgo. Under `CGO_ENABLED=0` the job dies with `go: -race requires cgo`, exit 2, before a single test runs. `-race` is necessary, not sufficient, which is why GO-GATE-02 exists. | Reading heuristic: `grep -rn -e 'CGO_ENABLED: *0' -e 'CGO_ENABLED=0' .github/workflows` is a work list, and a hit at workflow level or inside the race job is the finding. Empty output is the pass. | MUST |
| GO-GATE-07 | The SDK and every CLI run the test job on `windows-latest` and `macos-latest` legs as well as Linux. The race step stays on the Linux leg. | Pinned default: Windows is first-class. Atomic replace and reserved file names are untestable elsewhere. | `grep -rn -e 'windows-' .github/workflows`: empty output (exit 1) is the finding. | MUST (SDK, CLI) · SHOULD (library) |
| GO-GATE-08 | Pin golangci-lint to an exact v2 release in CI, such as `version: v2.14.0` in `golangci-lint-action` or a versioned install. Never `latest` or `@latest`. Bump it only through the `go-upgrade` skill. | Linter rosters grow inside point releases, and a real gate went red on a new gosec rule with no config change. An unpinned gate changes verdicts without a commit. | `grep -rn -E -e 'golangci-lint[^ ]*@latest' -e 'version: *latest' .github/workflows`: any output is the finding. | MUST |
| GO-GATE-21 | An unattended `golangci-lint run --fix` (an agent loop or a bot commit) runs only `--enable-only=usetesting,testifylint,misspell,canonicalheader,whitespace`, and its result is trusted only after `go build ./... && go test ./...` both exit 0. Never let an unattended run apply `errorlint` fixes. `go fix` (GO-GATE-03) and `golangci-lint fmt` (GO-GATE-06) are cleared separately. | `[auto-fix]` means some finding has a fixer, not that every fix keeps behaviour. On zap, errorlint's `asserts` fix rewrote a type switch into `errors.As` without importing `errors`, and once the import was repaired a test failed, because `errors.As` walks the wrap chain. Fixes apply per linter, so errorlint's safe half cannot be taken alone. | `go build ./... && go test ./...` right after the fix run, where exit 0 is the pass. Reading heuristic: every `--fix` in a workflow or agent script carries the five-linter `--enable-only`. | MUST |

## Choosing the Config File

GO-GATE owns exactly three complete files. A module copies one of them, whole, to `.golangci.yml` at its root:

| Module kind | Copy | Adds to the baseline |
|---|---|---|
| Anything that is neither a CLI nor a library/SDK | [baseline.golangci.yml](golangci/baseline.golangci.yml) | nothing |
| A CLI (a module with `func main`) | [cli.golangci.yml](golangci/cli.golangci.yml) | `exhaustive`, `forbidigo`, gocritic `exitAfterDefer` |
| The SDK and every library | [lib-sdk.golangci.yml](golangci/lib-sdk.golangci.yml) | `gochecknoglobals`, `gochecknoinits`, `ireturn`, `exhaustive`, staticcheck `checks: [all]`, revive `exported`, `sloglint.no-global`, and no exclusion preset |

Two commands prove a copy, and both are needed:

```sh
golangci-lint config verify               # exit 0; exits 3 on a v1 file, and passes a fragment
# GO-GATE-22 superset check, from the module root beside the shipped baseline.golangci.yml.
# Any output names a baseline linter the module's .golangci.yml dropped.
en(){ golangci-lint linters --config "$1" | sed -n '/^Enabled/,/^$/p' | grep -oE '^[a-z0-9_]+:' | sort; }
comm -23 <(en baseline.golangci.yml) <(en .golangci.yml)
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-GATE-22 | Copy exactly one of the three files, whole, to each module's `.golangci.yml`: the baseline by default, `cli.golangci.yml` for a CLI module, `lib-sdk.golangci.yml` for the SDK and any library module. An overlay is the entire baseline plus its delta, never a fragment and never only the new lines. Sibling families cite a linter name and setting (`sloglint.no-global`, `gosec.excludes`, `revive.rules`) and never paste YAML. | `config verify` exits 0 on a 5-linter fragment that drops 28 baseline linters. Five families once pasted fragments that disagreed on presets, gosec excludes, revive, sloglint and depguard. An overlay cannot subtract a baseline setting, which is why `no-global` lives in one file. | `golangci-lint config verify` exits 0 and the superset check above prints nothing. Watched: the fragment lists 28 missing linters, both shipped overlays list 0. | MUST |
| GO-GATE-09 | Keep the baseline in the v2 schema: `version: "2"`, `linters.default: none` with an explicit `enable` list, formatters under `formatters:`, and no v1 `linters.presets`, `linters-settings`, `gosimple` or `stylecheck`. `exclusions.presets` is exactly `[comments]` in the baseline and CLI files. Never list `common-false-positives` or the error-handling preset in any file. `config verify` exits 0 on every config change. | Agents write v1 configs from pre-2025 training data, and v2.14.0 refuses them. `common-false-positives` filters gosec by message text: it deletes every G103 and G204 finding and turns a reasoned `//nolint:gosec // G204` into an unused-directive failure. The error-handling preset hides write-path close errors (GO-ERR-09). | `golangci-lint config verify`, plus `grep -rn --include='*golangci*' -E -e '^[^#]*common-false-positives' -e '^[^#]*std-error-handling' .` where any output is the finding. The `^[^#]*` anchor keeps a comment that names a preset from reading as a violation. | MUST |
| GO-GATE-18 | A CLI module uses `cli.golangci.yml` and never the library/SDK file. A switch over an imported package's enum with a deliberate `default:` gets `//nolint:exhaustive // <Type> is a third-party enum, default is intentional` or a per-repo `exhaustive.ignore-enum-types` entry, never a disabled linter. | These are the mechanical checks behind GO-CLI-01 to -03: the exit-table switch, stdout as the result stream, and no exit past a defer. On four CLIs every own-type `exhaustive` hit was real and every false positive was the foreign-enum shape. CLIs keep package-level cobra command vars, which `gochecknoglobals` would flag. | `golangci-lint run ./...` under the CLI file. For an `exhaustive` hit, read whether the switched type is declared in the module or imported. | MUST (CLI) |
| GO-GATE-23 | The SDK and every library module use `lib-sdk.golangci.yml`, with `exclusions.presets: []`. `sloglint.no-global: "all"` appears in no other file. A hit from a linter that is SHOULD for the module (`ireturn` per GO-API-07, globals and inits in a library per GO-API-06) is fixed or carries `//nolint:<linter> // <reason>`. When measuring a doc or naming linter on existing code, leave `internal/` out of the count. | The `comments` preset silences ST1000, ST1020-22 and revive `exported` even when enabled, so this file has none. A CLI may call `slog.SetDefault` once in `main`, so `no-global` stays out of the other two files. On five exemplars every hand-read hit was real debt, and `internal/` inflated one library's `exported` count from 12 to 193. | `golangci-lint run ./...`: an undocumented export goes red with `exported` and `ST1000`. Placement: `grep -n -E -e '^[^#]*no-global' .golangci.yml` in a CLI or baseline module, where any output is the finding. | MUST (SDK, library) |

## Settings That Must Not Drift

Every row is enforced by step 3, `golangci-lint run ./...`, under the copied file. The config-shape greps below run from the repo root.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-GATE-10 | Set `issues.uniq-by-line: false`, `max-issues-per-linter: 0` and `max-same-issues: 0`. | Under the default `uniq-by-line: true` one finding per line survives: it hid 20 of 65 findings on one run and 2 of 4 on another. The default caps of 50 and 3 hide the true count. | `grep -c -e '^[^#]*uniq-by-line: false' -e '^[^#]*max-issues-per-linter: 0' -e '^[^#]*max-same-issues: 0' .golangci.yml`, run from the module root, prints one count, and any count below 3 is the finding. (Watched: 3 on the shipped baseline, 0 on a planted default config.) | MUST |
| GO-GATE-11 | Enable `govet` with `enable-all: true` minus `shadow` and `fieldalignment`. A repo without golangci-lint also runs the pinned `nilness` analyzer (`go run golang.org/x/tools/go/analysis/passes/nilness/cmd/nilness@v0.49.0 ./...`). | A planted `if p == nil { return p.X }` passes `go vet`, staticcheck 2026.2.1 and golangci's default `govet`. Only `nilness` catches it. | `golangci-lint run ./...`: a `nilness:` line is the finding. | MUST |
| GO-GATE-12 | Configure `nolintlint` with `require-explanation: true`, `require-specific: true` and `allow-unused: false`. Every suppression reads `//nolint:<linter> // <reason>`. | A bare `//nolint` silences every linter on the line, forever, with no record. | `golangci-lint run ./...`: any `(nolintlint)` line is the finding. | MUST |
| GO-GATE-13 | Citation row, no list of its own. The depguard rules are quoted verbatim in all three files: `superseded` is GO-MOD-08 (13 entries on `files: ["$all"]`, including GO-OBS-06's `go.uber.org/automaxprocs` and GO-LANG-22's `golang.org/x/exp/constraints`), `logging` is GO-OBS-01 and `no-testify` is GO-TEST-02. Edit a list at its owner, then re-quote it in all three files. | Two lists on one linter drift apart, and depguard has no built-in deny list, so the quoted lists are the whole gate. | `golangci-lint run ./...`: a denied import prints `is not allowed from list 'superseded'` (or `'logging'`, `'no-testify'`) with its `desc` and exits 1. | MUST (cited) |
| GO-GATE-14 | Configure `gosec` with `excludes` of exactly `G104`, `G115` and `G304`, thresholds `G301: "0755"`, `G302: "0644"` and `G306: "0644"`, and an exclusion for `_test.go`. On every golangci-lint bump, run gosec with `excludes` emptied and re-justify the list. | G104 duplicates errcheck. G115 ignores prior bounds checks (securego/gosec#1187). Untrusted file names go through `os.Root` (GO-IO-02, GO-SEC-01). A stale exclude list let a live G703 ship in a real CLI, and with these excludes every hand-read G103, G204 and G7xx hit was real. | `golangci-lint run ./...`. On a bump, `golangci-lint run --default=none --enable-only=gosec ./...` against a copy with no `excludes`: a new rule in the output is fixed or re-justified. | MUST |
| GO-GATE-15 | Enable `revive` only with an explicit `settings.revive.rules` list: `context-as-argument`, `deep-exit` and `time-equal` in the baseline and CLI files, those three plus `exported` in the library/SDK file. A file that adds a rule repeats the whole list. Enable `gocritic` only with `disable-all: true` plus `enabled-checks`. | A `rules:` list replaces revive's defaults, and bare revive runs its whole default set. A list with only `exported` silently drops the other three. staticcheck `QF1009` reports the same `==` on `time.Time` as `time-equal` and also blocks, and one fix clears both. | `golangci-lint run ./...`. Shape, by reading: `settings.revive.rules` holds 3 entries (baseline, CLI) or 4 (library/SDK). | MUST |
| GO-GATE-16 | Never use `linters.default: all` as a baseline, only as a throwaway discovery run. Never enable `wsl`, `wsl_v5`, `exhaustruct`, `exhaustruct_v5`, `paralleltest`, `tparallel`, `nlreturn`, `varnamelen`, `goconst`, `noinlineerr` or `wrapcheck`. | `default: all` double-enables deprecated and successor pairs and turns on every revive and gocritic rule. The listed linters produced 12,000+ hits on CI-green code, `wrapcheck` ran 65 to 75% false positives, and `paralleltest` never proves a race (GO-TEST-09). | `grep -rnw --include='*golangci*' -e 'default: *all' -e 'wsl' -e 'wsl_v5' -e 'exhaustruct' -e 'exhaustruct_v5' -e 'paralleltest' -e 'tparallel' -e 'nlreturn' -e 'varnamelen' -e 'goconst' -e 'noinlineerr' -e 'wrapcheck' .`: any output is the finding. | MUST |
| GO-GATE-20 | Keep `errcheck.settings.exclude-functions` at exactly `(io.ReadCloser).Close`. Never add a concrete-type entry such as `(*os.File).Close`. A read-only close on a concrete type takes GO-ERR-08's `errors.Join` shape, and `//nolint:errcheck // read-only close` is the fallback only where the function has no error result to join into. A write-path `Close`, `Flush` or `Sync` is handled, never suppressed. An unchecked `fmt.Fprint*` to an `io.Writer` is a real finding: check it or discard it explicitly. | errcheck matches the declared receiver type. `(io.ReadCloser).Close` clears `resp.Body.Close()` but leaves a `*os.File` from `os.Open` flagged, and `(*os.File).Close` clears every file close, write paths included. | The `exclude-functions` check below: any output is the finding. Behaviour: after a settings change, an `os.Open` close must still be reported. | MUST |

```sh
# GO-GATE-20 exclude-functions check. Any output is the finding.
grep -rn --include='*golangci*' -E '^\s*-\s*\(\*?[A-Za-z0-9_./]+\)\.(Close|Flush|Sync)' . | grep -v -F '(io.ReadCloser).Close'
```

```go
// wrong: errcheck reports it under golangci-lint v2.14.0
fmt.Fprintln(w, result)

// right: check the result stream, discard a diagnostic on purpose
if _, err := fmt.Fprintln(w, result); err != nil {
	return err
}
_, _ = fmt.Fprintln(stderr, "warning:", msg)
```

## Linters Outside the Files

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-GATE-17 | Run exactly one staticcheck entry point per repo: golangci's bundled `staticcheck`, configured under `linters.settings.staticcheck.checks`, or the standalone pinned binary with `staticcheck.conf` and `staticcheck` left out of golangci. Never put a `staticcheck.conf` beside a config that enables golangci's staticcheck. | golangci's bundled copy ignores `staticcheck.conf`, so its exclusions silently do nothing. The standalone binary also ignores the file for source under `os.UserCacheDir()`. | `find . -name staticcheck.conf -not -path '*/vendor/*'` printing a path while that module's `.golangci.yml` enables `staticcheck` is the finding. | MUST |
| GO-GATE-19 | Enable `bodyclose` only in a package that calls `net/http` directly and does not hand `resp.Body` to a wrapper type, and keep it out of the three files. A remaining wrapper hit gets `//nolint:bodyclose // closed by <Type>.Close`. | 88 of 88 hits on one registry client were the wrapper false positive, and GO-NET-09 classified another client's 78 hits at about 92% false positives with 2 real leaks. | `golangci-lint run --enable-only=bodyclose ./...` in that package. SHOULD because precision on wrapper-heavy client code fails the admission bar. | SHOULD |

## Documented Gaps

No gate closes these. Each is a named reading heuristic.

- **Read-only versus write closes on one type.** No `exclude-functions` entry separates them (GO-GATE-20). Read each `defer f.Close()` on a file opened for writing: an unhandled one is the finding.
- **`t.Fatal`, `t.FailNow` or `require.*` inside a `wg.Go` or `errgroup.Group.Go` closure.** Vet's `testinggoroutine` sees only a literal `go` statement, and staticcheck and govet `enable-all` are silent too. GO-TEST-01's grep-and-read applies.
- **File inclusion.** With G304 excluded, no linter flags `os.ReadFile` on a variable. GO-IO-02's `os.Root` is checked by reading.
- **`config verify` passes a fragment.** The superset check closes it (GO-GATE-22). An agent that reaches for `config verify` alone misses it.
- **Snapshots of golangci-lint v2.14.0:** the `--fix` allowlist, errcheck's matching and the gosec roster. The `go-upgrade` skill re-probes all three on every bump (GO-GATE-21, -20, -14), and re-checks whether step 10 can be dropped.

## What Agents Get Wrong Here

1. **Reading a green `go test` as a vet pass.** It runs 12 of 35 analyzers on Go 1.27.1 (GO-GATE-02).
2. **Writing a v1 golangci config from memory**: `presets`, `linters-settings`, `gosimple`, `stylecheck`, `issues.exclude-use-default`. `config verify` exits 3 on it (GO-GATE-09).
3. **Copying `common-false-positives` or the error-handling preset from an exemplar**, because 13 of 23 real configs have each. The first deletes every G103 and G204 finding, and the second hides write-path close errors (GO-GATE-09).
4. **Trusting the default `uniq-by-line`.** A second linter's finding on the same line vanishes. A full run that shows less than `--enable-only` of one linter is the tell (GO-GATE-10).
5. **Writing an overlay as a fragment**, such as a library file with only the API linters or a revive list with only `exported`. `config verify` passes it (GO-GATE-22, GO-GATE-15).
6. **Relying on a nil check that no longer exists.** SA5011 is off in staticcheck 2026.2, and bare vet does not run `nilness` (GO-GATE-11).
7. **Adding a bare `//nolint` or `-vet=off` to reach green** (GO-GATE-12, GO-CORE-01).
8. **Setting `CGO_ENABLED=0` workflow-wide** because the release wants static binaries, which kills `-race` with exit 2 (GO-GATE-04).
9. **Pinning golangci-lint to `latest`**, so the gate changes verdict without a commit (GO-GATE-08).
10. **Checking generate drift with `git diff --exit-code`**, which misses a new untracked file (GO-GATE-05).
11. **Enabling linters bare "for more coverage"**: `default: all`, `wrapcheck`, revive or gocritic without settings (GO-GATE-16, GO-GATE-15).
12. **Reading `0 issues.` as a pass** when golangci-lint exited 7, or running from the root of a multi-module repo and reading exit 0 as coverage of every module (GO-GATE-01).
13. **Writing `(*os.File).Close` into `exclude-functions`**, or assuming `(io.ReadCloser).Close` exempts a `*os.File` from `os.Open` or that errcheck ignores `fmt.Fprint*` (GO-GATE-20).
14. **Putting `sloglint.no-global` in the baseline**, or keeping `comments` in the library/SDK file's presets, so its doc checks report nothing (GO-GATE-23).
15. **Trusting the exit 0 of `golangci-lint run --fix`** without a following `go build` and `go test` (GO-GATE-21).
16. **Dropping a `staticcheck.conf` into a golangci repo** and expecting it to apply (GO-GATE-17).
17. **Grepping for a banned preset without the `^[^#]*` anchor**, so a comment that names it reads as a violation (GO-GATE-09).
18. **Calling a doc or naming linter "too noisy"** from a count that includes `internal/`, or from raw volume on legacy code without hand-reading 5 to 10 hits (GO-GATE-23).

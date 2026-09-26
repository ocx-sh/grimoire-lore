---
title: "What fails the build — the Go gate block and the three pinned golangci-lint v2 files (GO-GATE)"
topic: go-gates
model: opus
id_family: GO-GATE
consolidates:
  - go-gates/golangci-config.md
  - go-gates/gate-commands.md
  - go-gates/config-revision.md
  - go-gates/config-assembly.md
date: 2026-09-26
revised: 2026-09-26
toolchain: "Go 1.27.1 (GOTOOLCHAIN=local), golangci-lint 2.14.0 built with go1.27.1 (bundled staticcheck 0.8.1), staticcheck 2026.2.1, govulncheck v1.8.0"
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/go-gates/
---

# What fails the build (GO-GATE)

Tags used below:
- **[GC]** = [golangci-config](go-gates/golangci-config.md).
- **[CMD]** = [gate-commands](go-gates/gate-commands.md).
- **[CR]** = [config-revision](go-gates/config-revision.md), the first follow-up round; its runs are CR-1..CR-15, fixtures under `fixtures/config-revision/`.
- **[CA]** = [config-assembly](go-gates/config-assembly.md), the second follow-up round (wave 4). Its runs are cited as CA-1..CA-14 (its own C-1..C-14), fixtures under `fixtures/config-assembly/`, where the three complete files live: `.golangci.yml`, `cli.golangci.yml`, `lib-sdk.golangci.yml`.
- **[gates]** = [go-audit/exemplar-quality-gates.md](go-audit/exemplar-quality-gates.md).
- **[map]** = [go-topic-map.md](go-topic-map.md); "map contradiction n" without a wave means the wave-3 list (§ "Wave 3 landed" (e)).
- **[C-n]** = a run made for this consolidation. The tables are in "Consolidation verification runs" at the end of the ruleset.

## Verdict

1. **One gate block, in order, once per `go.mod` root, every step blocking (GO-GATE-01).** Format, `go vet`, `golangci-lint run`, `go fix -diff`, build and test, `-race`, tidy, govulncheck, and a generate check. It binds library, SDK, CLI and test code alike, and every `go.mod` in the repo, including a test-helper module: `oras-project/oras@a0cd4de5cfcd` keeps its only `os/exec` code in a second module at `test/e2e/go.mod`, which a root-level `./...` never visits and reports as a clean exit 0 ([CA] §10; GO-MOD-06 owns the rule). The `go-quality` index quotes the block verbatim (map row M-K-01).
2. **The gate of record is golangci-lint v2, pinned to an exact version, running one of three complete files that GO-GATE owns (GO-GATE-22):** the baseline (GO-GATE-09) for every module, the CLI file (GO-GATE-18) for a CLI, the library/SDK file (GO-GATE-23) for the SDK and any library. Every sibling family cites linter names and settings; none pastes YAML (map contradiction 6). Every MUST row names its analyzer, so a Go-team-shape repo (`go vet` + standalone `staticcheck`) satisfies the same rows without a config file. "No `.golangci.yml`" is never a finding (wave-1 map conflict 2).
3. **`go vet ./...` always runs as its own step, even under golangci.** [CMD] rule 3 said it could be skipped when golangci's `govet` sits at its defaults. Overruled: vet costs seconds, and it tracks the toolchain rather than golangci's build toolchain. `go test` runs only 12 of vet's 35 analyzers on Go 1.27.1 [C-25].
4. **Modernization is gated by `go fix -diff ./...`, not by golangci's `modernize` linter.** [GC] made `modernize` a MUST linter. Overruled: both tools report the same diagnostics, but only `go fix` runs `//go:fix inline` [C-4]. Running both double-reports every finding.
5. **Six config settings are load-bearing and non-negotiable:**
   - `issues.uniq-by-line: false`. The default silently hid 2 of 4 findings on one line [C-5] and 20 of 65 in [GC] §1b.
   - Issue caps set to 0.
   - `govet enable-all`. It is the only nil-dereference check, because staticcheck 2026.2 disabled SA5011 and neither bare `go vet` nor staticcheck catches the case [C-1].
   - `nolintlint` requiring a named linter and a reason.
   - **`linters.exclusions.presets` is `[comments]` in the baseline and CLI files and `[]` in the library/SDK file. Neither `common-false-positives` nor the error-handling preset ever appears (GO-GATE-09, GO-SEC-01, GO-ERR-09).** The first version of this file shipped `common-false-positives`. That preset filters gosec by message text, so it deleted every G103 and G204 finding (`golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:62-89`; [C-21]: G103 red under the baseline, `0 issues.` under the old preset). It also turned GO-SEC-01's reasoned `//nolint:gosec // G204` into an "unused directive" nolintlint failure (CA-3). The error-handling preset had been removed in the first revision because it hid two real errcheck findings [C-14].
   - **errcheck exempts only `(io.ReadCloser).Close` (GO-GATE-20, GO-ERR-09).**
6. **Only measured linters are in the baseline.**
   - `bodyclose` leaves the baseline. It fired 88 times on oras-go, all false positives [GC] §3. It is SHOULD (GO-GATE-19), and its precision on registry clients is routed to `network/http-client-server`.
   - `errcheck` without the preset fires 10–39 times per 10k LOC on 7 of 8 exemplars (go-cmp: 1.6) [CR] §2. That volume is real work, not noise. `errorlint` has 0 false positives in 51 hand-read hits [CR] §3. Both stay in.
   - `gosec` with `excludes: [G104, G115, G304]` fires 69 times in ~124k non-test LOC across the 8 named exemplars (5.6/10k). Every hand-read G103, G204 and G7xx hit is a real finding, including ko's known G703 ([CA] Exemplar evidence). G304 is excluded by name because GO-IO-02's `os.Root` owns untrusted file names (GO-SEC-01, 3.3/10k).
   - `revive` and `gocritic` run only with explicit rule lists. A revive `rules:` list replaces the defaults [C-5]. The baseline list is three rules, `context-as-argument`, `deep-exit` and `time-equal` (map contradiction 3).
   - The noise linters are banned from every file, and so is `default: all`.
7. **Exactly one staticcheck entry point per repo.** Staticcheck is either golangci's bundled copy or the standalone binary with `staticcheck.conf`, never both. The mechanism is settled by [C-3]:
   - golangci ignores `staticcheck.conf`;
   - the standalone binary honours it, except for source under `os.UserCacheDir()`. That exception was the cause of [GC]'s "inconclusive" run.
8. **By code kind: three files, chosen by module kind (GO-GATE-22).**
   - **CLIs** take `cli.golangci.yml`: the baseline plus `exhaustive`, `forbidigo` and gocritic `exitAfterDefer` (GO-GATE-18). They never take the library/SDK file (owner default, map (f)). A switch over an imported package's enum with a deliberate `default:` is `exhaustive`'s one false-positive shape; it gets a reasoned `//nolint:exhaustive` or a per-repo `ignore-enum-types`, never a disabled linter [CR] §4. A CLI's G204 hits each get `//nolint:gosec // G204: <reason>`, never a blanket exclude: 33 hits in ~178k CLI LOC, every sampled one a real variable-argument spawn ([CA] §8; GO-SEC-01, GO-IO-13 stays CONSIDER).
   - **The SDK and libraries** take `lib-sdk.golangci.yml`: the baseline plus `gochecknoglobals`, `gochecknoinits`, `ireturn`, `exhaustive`, staticcheck `checks: [all]`, revive `exported`, and `sloglint.no-global: "all"`, with no exclusion preset (GO-GATE-23). `exhaustive` is in both overlays (map contradiction 7, GO-API-08).
   - The SDK and CLIs gate on a Windows leg (Q6). Test code is under the same config: gosec is off in `_test.go`, while `thelper`, `usetesting` and `no-testify` apply only to tests.
9. **Owned elsewhere, cited here.** Tidy and `-mod=readonly` are GO-MOD-03. Dev-tool pinning is GO-MOD-11. The govulncheck gate and its json/sarif exit-0 trap are GO-MOD-12. Per-module-root execution is GO-MOD-06. Generated-code detection is GO-CORE-05. The depguard `superseded` list is GO-MOD-08, now **12** entries with GO-OBS-06's `go.uber.org/automaxprocs`; the `logging` rule is GO-OBS-01; `no-testify` is GO-TEST-02. GO-GATE-13 is the citation row, and the three files quote those texts verbatim (map contradiction 5). The G304 exclusion and the G103/G204 suppression shapes are GO-SEC-01. G101's real scope is GO-SEC-08. The `nilnil` stance is GO-ERR-12, and the SDK's `(nil, nil)` ban is GO-API-09 (map contradiction 11). The doc-comment, globals, interface-return and enum rules behind the library/SDK file are GO-API-04, -06, -07 and -08. `time-equal` is GO-LANG-07. `no-global` is GO-OBS-03.
10. **Unattended `golangci-lint run --fix` is allowlisted (GO-GATE-21).** The allowlist is `usetesting`, `testifylint`, `misspell`, `canonicalheader` and `whitespace`. `errorlint` is excluded because its `asserts` fix broke zap's build, and once the build was repaired it broke zap's tests [CR] §5. Every fix run must be followed by `go build` and `go test`.
11. **Documented gaps. No gate closes these, and each is carried as a reading heuristic:**
    - **Read-only vs write `*os.File` closes.** errcheck's `exclude-functions` matches the receiver's declared type, so no config entry can tell a read close from a write close on one type [C-15]. The remedy is GO-ERR-08's `errors.Join` shape; `//nolint:errcheck // read-only close` is the fallback only where the function has no error result to join into (map contradiction 9). A custom read-only-close analyzer is rejected: a shipped analyzer is outside the artifact set.
    - **`t.Fatal`, `t.FailNow` or `require.*` inside a closure passed to `sync.WaitGroup.Go` or `errgroup.Group.Go`.** `go vet`'s `testinggoroutine` only sees a literal `go` statement. It is silent on both wrappers, and so are `staticcheck -checks all` and golangci's `govet enable-all` [C-17], [CR] §6. GO-TEST-01 keeps its grep-and-read heuristic.
    - **File inclusion.** With G304 excluded, no linter flags `os.ReadFile(<variable>)` [C-20]. The bound is GO-IO-02's `os.Root`, checked by reading.
    - **`golangci-lint config verify` does not detect a fragmentary overlay.** A 5-linter fragment verifies with exit 0 [C-23]. GO-GATE-22's superset check closes that gap mechanically; it is listed here because an agent will reach for `config verify` alone.
    - **The safety of a `--fix` run, errcheck's matching semantics and the gosec roster are snapshots of golangci-lint 2.14.0.** The `go-upgrade` skill re-probes all three on every bump (GO-GATE-21, GO-GATE-20, GO-GATE-14).
12. **`time-equal` and staticcheck `QF1009` double-report `==` on `time.Time`, and both block.** [CA] called `QF1009` a non-blocking hint. That is wrong under 2.14.0: with `--enable-only=staticcheck`, `QF1009` alone exits 1 [C-22], because golangci's default staticcheck `checks` include the QF family. The overlap is harmless (one fix clears both). `time-equal` stays in the list because it is the check named by GO-LANG-07, and a Go-team-shape repo without golangci has no QF gate.

## The ruleset

Severity legend: **MUST** needs a normative or measured source and a check that was watched red on a planted violation and green on its twin. **SHOULD** and **CONSIDER** say why they fall short.

"Watched" in each row cites the run. Empty output or exit 0 means pass unless the row says otherwise.

### GO-GATE — the command block (go command and shell)

The block, verbatim. Run it from each `go.mod` root (GO-MOD-06):

```sh
golangci-lint fmt --diff                  # 1 format (Go-team shape: test -z "$(gofmt -l .)")
go vet ./...                              # 2 all 35 vet analyzers (go test runs 12)
golangci-lint run ./...                   # 3 the module's GO-GATE-22 file
go fix -diff ./...                        # 4 modernizers + //go:fix inline
go build ./... && go test ./...           # 5
CGO_ENABLED=1 go test -race ./...         # 6 every PR, linux leg
go mod tidy -diff                         # 7 GO-MOD-03
govulncheck ./...                         # 8 text mode, GO-MOD-12
# 9 only if any //go:generate exists:
go generate ./... && test -z "$(git status --porcelain)"
```

| ID | Rule | Rationale (failure prevented) | Verification | Watched red/green | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-GATE-01 | Run the block above, in that order, from every `go.mod` root, including test-helper and tools modules. Every step fails the job on a non-zero exit. Never drop a step because an earlier one "covers" it. On a Go-version matrix (GO-MOD-16), run steps 1–4 and 7–9 once, on the `stable` leg, and steps 5–6 on every leg. | Each step catches a class of defect that no other step catches. For example, `go test` sees 12 of 35 vet analyzers, and govulncheck json/sarif always exit 0. A module that is never a root is never checked: oras's `test/e2e` module holds all 4 of its G204 hits, and a root-level run exits 0 without a warning ([CA] §10). | Each step's own exit status. A wrong module root also fails: golangci prints `0 issues.` yet exits 7 on a typecheck error [C-12]. So gate on the exit code, never on the stdout text. Module coverage: `find . -name go.mod -not -path '*/vendor/*'` lists the roots the block must run in (GO-MOD-06). | yes: every step red and green, [CMD] Verification runs, [GC] §0–§6, [C-1]..[C-12]; the missed-module case is read from `oras-project/oras@a0cd4de5cfcd` (2 `go.mod` files) | MUST | go 1.26 toolchain (`go fix` modernizers) |
| GO-GATE-02 | Run `go vet ./...` as a separate step in every repo, whether or not golangci's `govet` is enabled. Never treat a green `go test` as a vet pass. | On Go 1.27.1, vet registers 35 analyzers and `go test` runs 12 of them (`atomic`, `bools`, `buildtag`, `directive`, `errorsas`, `ifaceassert`, `nilfunc`, `printf`, `slog`, `stdversion`, `stringintconv`, `tests`) [C-25]; `stdversion` joined in 1.27, so it was 11 before. `go test` is silent on `copylocks`, `lostcancel`, `loopclosure`, `unusedresult`, `waitgroup`, `hostport` and `composites`. | `go vet ./...`, with exit 0 and empty output as the pass. The analyzer name in the output (`copylocks:` and so on) names the row. | yes: the 7 [CMD] fixtures pass `go test` (exit 0) and fail `go vet` (exit 1). golangci's `govet` reproduced all 7 [C-2]. `waitgroup`/`hostport` fire even under a `go 1.21` line [C-10]. | MUST | go1.25 toolchain for `waitgroup`/`hostport`; the 12-analyzer `go test` subset is go1.27 |
| GO-GATE-03 | Gate modernization on `go fix -diff ./...`. Exit 1 on a non-empty diff is the finding. Do not enable golangci's `modernize`. `go fix ./...` may be applied unattended, but read its stderr first: an `ignoring alternative fix "…(behavior change)"` line names what it declined. | Only `go fix` applies `//go:fix inline` [C-4]. It ships with the toolchain that the `go` line selects. The one behaviour-changing alternative (`omitzero` → `omitzero` tag) is never applied by default ([CMD] §3). | `go fix -diff ./...` | yes: [CMD] `modernize` exit 1 → `modernize-fixed` exit 0, and `json.Marshal` output was byte-identical. [C-4]: `inline` exit 1 under `go fix`, 0 issues under golangci. | MUST | go 1.26 toolchain |
| GO-GATE-04 | Run `go test -race ./...` on every PR, in a job that sets `CGO_ENABLED=1` explicitly. Release-build env (`CGO_ENABLED=0`) must never leak into the race job. Move `-race` to a scheduled lane only after measuring that it bottlenecks CI. | `-race` needs cgo. Under `CGO_ENABLED=0` the job dies with exit 2 before a single test runs [C-8]. 17/32 CI repos pay the 5–10× memory cost on every PR, and none splits it into a separate lane ([gates] §3). `-race` is necessary but not sufficient, which is why GO-GATE-02 exists (go-concurrency verdict 6). | `CGO_ENABLED=1 go test -race ./...`. Grep for the leak: `grep -rn -e 'CGO_ENABLED: *0' -e 'CGO_ENABLED=0' .github/workflows`, where every hit must sit in a build or release job, not in the race job (a reading heuristic for placement). | yes: [C-8] `CGO_ENABLED=0` → `go: -race requires cgo`, exit 2; the default → `ok`, exit 0 | MUST | — |
| GO-GATE-05 | When any `//go:generate` directive exists, gate on `go generate ./... && test -z "$(git status --porcelain)"`. Never use `git diff --exit-code`. | A generator that creates a new file leaves it untracked. `git diff --exit-code` exits 0 on that drift, which overrules [CMD] rule 7. Only 1/32 CI repos checks generate drift at all ([gates] §3). | the two-command pipeline, where exit 0 is the pass | yes: [C-9] stale → porcelain exit 1, and twin → 0. New-file-only drift → `git diff --exit-code` exit **0** (a miss) while porcelain exits 1. | MUST | — |
| GO-GATE-06 | gofmt output is the formatting MUST: `golangci-lint fmt --diff` exits 0, or `test -z "$(gofmt -l .)"` passes. `goimports` is a SHOULD. `gofumpt` is opt-in and never required. | gofumpt-clean ⊂ goimports-clean ⊂ gofmt-clean, so they nest (wave-1 map conflict 3). Exemplar counts: gofmt 15/23, gofumpt 8/23, gci 5/23 ([gates] headline). `gofmt -l` always exits 0, so non-empty stdout is its failure signal. | `golangci-lint fmt --diff` (exit 1 plus a unified diff means a finding) | yes: [GC] §5 malformed file → exit 1, and after `gofmt -w` → exit 0 with empty `gofmt -l` | MUST | — |
| GO-GATE-07 | The SDK and every CLI run the test job on `windows-latest` and `macos-latest` legs as well as Linux. | Q6 (Windows first-class, mirroring ocx). Windows behaviour (atomic replace, reserved names) is untestable elsewhere. The corpus has windows runners in 18/32 repos and macOS in 13/32 ([gates] §3). | `grep -rn -e 'windows-' .github/workflows`: empty output (exit 1) is the finding | yes: [C-11] planted workflow without a Windows leg → exit 1; twin → exit 0 | MUST (SDK, CLI) / SHOULD (library) | — |

### GO-GATE — the three golangci-lint files

GO-GATE owns exactly three complete files (GO-GATE-22). Each module copies one of them, in full, to `.golangci.yml` at its root. The verified copies are `fixtures/config-assembly/{.golangci.yml,cli.golangci.yml,lib-sdk.golangci.yml}`: `config verify` exits 0 on all three [C-18], and their comments differ from the blocks below.

The baseline merges [GC] §1 with the settings the sibling consolidations need:
- GO-ERR: `nilerr`, `nilnil` with GO-ERR-12's `checked-types`, and errcheck's `(io.ReadCloser).Close` exemption (GO-ERR-09);
- GO-MOD / GO-OBS / GO-TEST: GO-MOD-08's 12-entry `superseded` depguard rule, GO-OBS-01's `logging` rule and GO-TEST-02's `no-testify` rule, quoted verbatim;
- GO-SEC / GO-IO: gosec excludes `G104`, `G115`, `G304` and GO-IO's permission thresholds, with no `common-false-positives` preset (GO-SEC-01);
- GO-CONC: revive `context-as-argument`; GO-LANG: revive `time-equal`;
- GO-TEST: `thelper`, `usetesting`.

**The baseline, `.golangci.yml` (GO-GATE-09).** Every module that is neither a CLI nor a library/SDK uses it as is; the two overlays below are this file plus their deltas.

```yaml
version: "2"

linters:
  default: none
  enable:
    # golangci-lint v2 "standard", kept explicit
    - errcheck
    - govet
    - ineffassign
    - staticcheck
    - unused
    # exemplar consensus; bodyclose is GO-GATE-19, modernize is replaced by go fix (GO-GATE-03)
    - unconvert
    - misspell
    - whitespace
    - unparam
    - nolintlint
    - depguard
    - gosec
    # measured signal linters that back a family's MUST
    - errorlint       # GO-ERR
    - nilerr          # GO-ERR
    - nilnil          # GO-ERR
    - noctx           # GO-CONC / GO-IO
    - contextcheck    # GO-CONC
    - containedctx    # GO-CONC
    - fatcontext      # GO-CONC
    - usestdlibvars   # GO-NET
    - canonicalheader # GO-NET
    - wastedassign
    - predeclared
    - copyloopvar
    - revive          # curated rules only
    - thelper         # GO-TEST
    - usetesting      # GO-TEST
    - testifylint     # self-gating
    - sloglint        # bare here; no-global lives in the library/SDK file only (GO-GATE-23)
  settings:
    govet:
      enable-all: true          # adds nilness, the SA5011 replacement (GO-GATE-11)
      disable: [shadow, fieldalignment]
    errorlint:
      errorf: true
      errorf-multi: true
      asserts: true
      comparison: true
    errcheck:
      exclude-functions:
        - (io.ReadCloser).Close # GO-GATE-20 / GO-ERR-09: declared io.ReadCloser only
    nilnil:
      checked-types: [chan, func, iface, ptr, uintptr, unsafeptr] # GO-ERR-12: map dropped, a nil map is a valid empty read
    nolintlint:
      require-explanation: true
      require-specific: true
      allow-unused: false
    revive:
      rules:                    # a rules list REPLACES revive's defaults (GO-GATE-15)
        - name: context-as-argument
        - name: deep-exit
        - name: time-equal      # GO-LANG-07
    thelper:
      test: { begin: true, first: false, name: false }
      benchmark: { begin: true, first: false, name: false }
      tb: { begin: true, first: false, name: false }
      fuzz: { begin: true, first: false, name: false }
    usetesting:
      context-background: true
      context-todo: true
    depguard:
      rules:
        superseded: # GO-MOD-08, verbatim (12 entries, automaxprocs from GO-OBS-06)
          files: ["$all"]
          deny:
            - pkg: io/ioutil
              desc: "use io and os (go1.16)"
            - pkg: github.com/pkg/errors
              desc: "use errors and fmt.Errorf %w (go1.13/1.20)"
            - pkg: golang.org/x/xerrors
              desc: "use errors (go1.13)"
            - pkg: golang.org/x/exp/slices
              desc: "use slices (go1.21)"
            - pkg: golang.org/x/exp/maps
              desc: "use maps (go1.21)"
            - pkg: github.com/golang/mock
              desc: "archived 2024-01-08; use go.uber.org/mock"
            - pkg: gopkg.in/yaml.v2
              desc: "go-yaml archived 2025-04-01; use go.yaml.in/yaml/v3"
            - pkg: gopkg.in/yaml.v3
              desc: "go-yaml archived 2025-04-01; use go.yaml.in/yaml/v3"
            - pkg: github.com/ghodss/yaml
              desc: "unmaintained; use sigs.k8s.io/yaml"
            - pkg: github.com/satori/go.uuid
              desc: "abandoned; use github.com/google/uuid or stdlib uuid (go1.27)"
            - pkg: github.com/hashicorp/go-multierror
              desc: "use stdlib errors.Join (go1.20)"
            - pkg: go.uber.org/automaxprocs
              desc: "the runtime is container-aware at go>=1.25 (GO-OBS-06); use runtime.GOMAXPROCS(0)"
        logging: # GO-OBS-01, verbatim; SHOULD everywhere, MUST for the SDK through GO-MOD-10
          files: ["$all"]
          deny:
            - pkg: go.uber.org/zap
              desc: "new fleet code logs through log/slog"
            - pkg: github.com/rs/zerolog
              desc: "new fleet code logs through log/slog"
            - pkg: github.com/sirupsen/logrus
              desc: "new fleet code logs through log/slog"
        no-testify: # GO-TEST-02
          files: ["$test"]
          deny:
            - pkg: github.com/stretchr/testify
              desc: "stdlib testing + go-cmp (GO-TEST); drop this rule only in an incumbent-testify repo"
    gosec:
      excludes:
        - G104 # duplicates errcheck
        - G115 # ignores prior bounds checks (securego/gosec#1187); re-review this list on every golangci-lint bump
        - G304 # file inclusion via variable; untrusted names go through os.Root (GO-IO-02, GO-SEC-01)
      config:
        G301: "0755"
        G302: "0644"
        G306: "0644"
  exclusions:
    generated: lax
    presets: [comments] # the only preset (GO-GATE-09, GO-SEC-01, GO-ERR-09)
    rules:
      - path: _test\.go
        linters: [gosec]

formatters:
  enable: [gofmt]

issues:
  max-issues-per-linter: 0
  max-same-issues: 0
  uniq-by-line: false
```

**CLI file, `cli.golangci.yml` (GO-GATE-18).** It is the whole baseline with exactly these additions, never these lines alone. The complete verified file is `fixtures/config-assembly/cli.golangci.yml`. `ignore-enum-types` stays out of the shared file: which foreign enums a fleet CLI switches on is unknown, and a speculative regex list is the premature config GO-GATE-16 warns against ([CR] Contested).

```yaml
# added to linters.enable
    - exhaustive
    - forbidigo
    - gocritic
# added to linters.settings
    exhaustive:
      default-signifies-exhaustive: false
    forbidigo:
      forbid:
        - pattern: ^(fmt\.Print(f|ln)?|print|println)$
          msg: "stdout is the result stream; write through the injected io.Writer"
    gocritic:
      disable-all: true
      enabled-checks: [exitAfterDefer]
```

**Library/SDK file, `lib-sdk.golangci.yml` (GO-GATE-23).** It is the whole baseline with exactly these changes. The complete verified file is `fixtures/config-assembly/lib-sdk.golangci.yml`.

```yaml
# added to linters.enable
    - gochecknoglobals  # GO-API-06
    - gochecknoinits    # GO-API-06
    - ireturn           # GO-API-07
    - exhaustive        # GO-API-08
# added to linters.settings
    staticcheck:
      checks: [all]     # GO-API-04: turns on ST1000, ST1003, ST1016, ST1020-22
    sloglint:
      no-global: "all"  # GO-OBS-03: this file only
    exhaustive:
      default-signifies-exhaustive: false
# replaces linters.settings.revive.rules: the baseline three, repeated, plus exported
    revive:
      rules:
        - name: context-as-argument
        - name: deep-exit
        - name: time-equal
        - name: exported  # GO-API-04
# replaces linters.exclusions.presets
    presets: []         # no preset: comments would silence ST1000/ST1020-22 and revive exported
```

**File checks** (bash; referenced from the rows below):

```sh
# GO-GATE-22 superset check: every baseline linter is enabled in the overlay. Any output is the finding.
en(){ golangci-lint linters --config "$1" | sed -n '/^Enabled/,/^$/p' | grep -oE '^[a-z0-9_]+:' | sort; }
comm -23 <(en .golangci.yml) <(en lib-sdk.golangci.yml)     # likewise for cli.golangci.yml
# GO-GATE-09 banned presets, comment-safe. Any output is the finding.
grep -rn --include='*golangci*' -E -e '^[^#]*common-false-positives' -e '^[^#]*std-error-handling' .
# GO-GATE-23 no-global placement, run in a CLI or baseline module. Any output is the finding.
grep -n -E '^[^#]*no-global' .golangci.yml
```

| ID | Rule | Rationale (failure prevented) | Verification | Watched red/green | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-GATE-08 | Pin golangci-lint to an exact v2 release in CI, for example `version: v2.14.0` in `golangci-lint-action` or a versioned install. Never use `latest` or `@latest`. Bump it only through the `go-upgrade` skill. | Linter rosters grow inside point releases. ko's gate went red on a new gosec rule with no config change ([gates] §5). An unpinned gate changes verdicts without a commit. | `grep -rn -E -e 'golangci-lint[^ ]*@latest' -e 'version: *latest' .github/workflows`: any output is the finding | yes: [C-11] planted `version: latest` plus `@latest` → 2 hits, exit 0; pinned twin → exit 1 (empty) | MUST | golangci-lint v2 |
| GO-GATE-09 | Use the baseline above verbatim, in the v2 schema. That means `version: "2"`, `linters.default: none` with an explicit `enable` list, formatters under `formatters:`, and no v1 `linters.presets`, `linters-settings`, `gosimple` or `stylecheck`. `linters.exclusions.presets` is exactly `[comments]`. **Never list `common-false-positives`** and never the error-handling preset, in any of the three files. `golangci-lint config verify` must exit 0 on every config change. | Agents write v1 configs from pre-2025 training data. v2.14.0 refuses them outright. `default: none` means nothing is inherited silently from a future meaning of `standard`, a form 13/23 exemplars already use. `common-false-positives` filters gosec by message text: it deletes every G103 and G204 finding and makes a reasoned `//nolint:gosec // G204` an unused directive (`golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:62-89`; GO-SEC-01; map contradiction 1). The error-handling preset is banned by GO-ERR-09 (wave-2 map contradiction 1). | `golangci-lint config verify`. The anchored preset grep in "File checks": any output is the finding. The `^[^#]*` anchor is load-bearing: a comment naming a preset is not a violation [C-16], [C-24]. | yes: [GC] §6 v1 config → exit 3 `unsupported version of the configuration: ""`, then `migrate` → exit 0, then verify → 0. [C-18]: all three files verify with exit 0; `fleet/bad` gives 8 issues and exit 1, `fleet/good` gives `0 issues.` and exit 0. [C-21]: `g103/bad` → G103, exit 1, under the baseline; `0 issues.`, exit 0, under the old `common-false-positives` config. CA-3: the reasoned G204 line → nolintlint "unused" under the old preset (exit 1), `0 issues.` under the baseline (exit 0). [C-24]: the anchored grep hits the old preset line (exit 0) and is empty on the three files (exit 1); the unanchored form goes red on the baseline's own comment. [C-26]: this block matches the verified file once comments are stripped. | MUST | golangci-lint v2 |
| GO-GATE-10 | Set `issues.uniq-by-line: false`, `max-issues-per-linter: 0` and `max-same-issues: 0`. | Under the default `uniq-by-line: true`, only one finding per line survives. It hid `bodyclose`, `modernize`, `wastedassign` and `unparam` in [GC] §1b (65 → 45 issues). It hid 2 of 4 revive findings in [C-5]. The caps of 50 and 3 hide the true count. Only 2/23 real configs set `uniq-by-line: false`: `google/go-github@48d0a668cde8:.golangci.yml:503` and `sigstore/cosign@907c3d899c0e:.golangci.yml:102`. | Run the config with the three lines, and again without them, on a line hit by two linters. The finding count must not drop. | yes: [GC] §1b 65 vs 45; [C-5] 4 vs 2 | MUST | — |
| GO-GATE-11 | Enable `govet` with `enable-all: true` minus `shadow` and `fieldalignment`. A repo without golangci also runs `go run golang.org/x/tools/go/analysis/passes/nilness/cmd/nilness@<pinned> ./...`. | staticcheck 2026.2 disabled SA5011 ([staticcheck.dev/changes/2026.2](https://staticcheck.dev/changes/2026.2/)). A planted `if p == nil { return p.X }` passes `go vet`, standalone staticcheck 2026.2.1 and golangci's default `govet`. Only the `nilness` analyzer catches it, which overturns [GC] Contested's "nilness is not wired". | `golangci-lint run ./...` (the `nilness:` prefix in the output) | yes: [C-1] golangci default govet → 0 issues, exit 0; enable-all → `nilness: nil dereference in field selection`, exit 1; twin → exit 0; standalone nilness@v0.49.0 → bad exit 1, good exit 0 | MUST | staticcheck ≥2026.2 (the gap) |
| GO-GATE-12 | Configure `nolintlint` with `require-explanation: true`, `require-specific: true` and `allow-unused: false`. Every suppression reads `//nolint:<linter> // <reason>`. | A bare `//nolint` silences every linter on the line, forever, with no record. Only golangci-lint's own repo sets both flags among the 10 configs that customize nolintlint ([gates] §1). | `golangci-lint run ./...` (any `(nolintlint)` line) | yes: [GC] §3 bare `//nolint` → 3 nolintlint findings, exit 1; well-formed twin → exit 0 | MUST | — |
| GO-GATE-13 | Citation row. The depguard rules are owned elsewhere and quoted verbatim in all three files: `superseded` is GO-MOD-08 (12 entries on `files: ["$all"]`, the 12th being GO-OBS-06's `go.uber.org/automaxprocs`), `logging` is GO-OBS-01 (`zap`, `zerolog`, `logrus` on `files: ["$all"]`), and `no-testify` is GO-TEST-02. This row adds no list of its own. Edit a list at its owner, then re-quote it in all three files. | Two MUST lists on one linter drift apart. The old 6-entry list here missed GO-MOD-08's yaml, uuid and multierror entries (wave-2 map contradiction 4), and three families later proposed depguard rules independently (map contradiction 5). depguard has no built-in deny list, so the quoted lists are the whole gate. Deny only `x/exp/slices` and `x/exp/maps`, not all of `x/exp` (go-modules conflict 7). | `golangci-lint run ./...` (the `depguard` lines, each naming its list and carrying its `desc`) | yes: [CR] CR-11, a module importing the first 11 → 11 issues, exit 1; its twin → exit 0. CA-9: `go.uber.org/automaxprocs` → `not allowed from list 'superseded'`, exit 1; `runtime.GOMAXPROCS(0)` twin → exit 0. CA-8: `go.uber.org/zap` → `not allowed from list 'logging'`, exit 1; `log/slog` twin → exit 0. GO-TEST [C-3] testify → exit 1, twin → 0. | MUST (cited: GO-MOD-08, GO-OBS-01, GO-OBS-06, GO-TEST-02) | — |
| GO-GATE-14 | Configure `gosec` with `excludes` of exactly `G104`, `G115` and `G304`, permission thresholds `G301: "0755"`, `G302: "0644"` and `G306: "0644"`, and an exclusion for `_test.go`. On every golangci-lint bump, run gosec with `excludes` emptied and re-justify the list. | G104 duplicates errcheck. G115 ignores prior bounds checks (securego/gosec#1187, #1212). G304 fires 3.3/10k LOC once `common-false-positives` is gone, and GO-IO-02's `os.Root` owns untrusted file names (GO-SEC-01; map contradiction 2). The stock 0750/0600 thresholds flag conventional modes (GO-IO). A stale exclude list is how `ko-build/ko@fcaeb337b6bd:.golangci.yaml:21-22` let `G703` reach `pkg/build/gobuild.go:436` ([gates] §5). With these excludes the full roster is 5.6/10k on the 8 named exemplars, every hand-read G103/G204/G7xx hit real ([CA] Exemplar evidence). | `golangci-lint run ./...`; on a bump, `golangci-lint run --default=none --enable-only=gosec ./...` with a copy of the config that has no `excludes` | yes: [GC] §2b G115 on ko's `uint32(permitted >> 32)` fires without the exclude and not with it. [C-20]: `os.ReadFile(path)` → G304, exit 1, with G304 removed from `excludes`; `0 issues.`, exit 0, with it (CA-4). [C-7] `0o666` → G306, exit 1, and `0o644` twin → exit 0. The bump re-review is a reading heuristic because it needs a future gosec. | MUST | — |
| GO-GATE-15 | Enable `revive` only with an explicit `settings.revive.rules` list. The baseline and CLI list is exactly `context-as-argument`, `deep-exit`, `time-equal`; the library/SDK list is those three plus `exported`. Any file that adds a rule repeats the whole list. Enable `gocritic` only with `disable-all: true` plus `enabled-checks`. Never list either without settings. | A `rules:` list replaces revive's defaults. Bare revive runs its default set: `exported`, `package-comments`, `unused-parameter` and others [C-5]. A list that adds only `exported` silently drops the other three: a fragment with just `exported` gives 0 `time-equal` hits where both assembled overlays give 1 [C-23]. Under `default: all` both linters produce 4–397 style hits per repo ([GC] §6). `time-equal` is GO-LANG-07 (0 FP on 435k LOC); staticcheck `QF1009` also reports the same line and also blocks (Verdict 12). | `golangci-lint run ./...`. Config shape: count the entries in `settings.revive.rules` (3 in the baseline and CLI files, 4 in the library/SDK file). | yes: [C-5] bare → `package-comments`, `exported`, `unused-parameter`, `context-as-argument`; curated → only `context-as-argument`. [C-7]: `deep-exit`, `context-as-argument`, `exitAfterDefer` red and twins green. CA-5: `time-equal` on `a == b` → exit 1; `a.Equal(b)` → exit 0. [C-23]: `--enable-only=revive` on `timeeq/bad` → 1 `time-equal` hit under each assembled overlay, 0 under the fragment. | MUST | — |
| GO-GATE-16 | Never use `linters.default: all` as a baseline. Never enable `wsl`, `wsl_v5`, `exhaustruct`, `exhaustruct_v5`, `paralleltest`, `tparallel`, `nlreturn`, `varnamelen`, `goconst`, `noinlineerr` or `wrapcheck`. Use `default: all` only as a throwaway discovery run, after reading its deprecation warnings. | `default: all` double-enables three deprecated/successor pairs and turns on every revive and gocritic rule. The listed linters produced 12,000+ hits on CI-green code ([gates] §5, [GC] §6). `wrapcheck` was 65–75% FP on grpc-go (go-errors verdict 7) and fired up to 81 times/10k LOC on regclient. `paralleltest`/`tparallel` never prove races (GO-TEST-09). | `grep -n -E -e 'default: *all' -e '(^\|[^a-z_])(wsl\|wsl_v5\|exhaustruct\|exhaustruct_v5\|paralleltest\|tparallel\|nlreturn\|varnamelen\|goconst\|noinlineerr\|wrapcheck)([^a-z_0-9]\|$)' .golangci.yml`: any output is the finding | yes: [C-11] planted `default: all` plus `enable: [wsl_v5, exhaustruct]` → 2 hits, exit 0; the fleet baseline and CLI configs → exit 1 (empty) | MUST | golangci-lint v2 |
| GO-GATE-17 | Run exactly one staticcheck entry point per repo. Either use golangci's bundled `staticcheck` (configured under `linters.settings.staticcheck.checks`) or use the standalone pinned `staticcheck` with `staticcheck.conf` and leave `staticcheck` out of golangci. Never put a `staticcheck.conf` beside a config that enables golangci's staticcheck. | golangci's bundled copy ignores `staticcheck.conf`, so the exclusions silently do nothing. The standalone binary also ignores the file for any source under `os.UserCacheDir()`, because `Dir` treats those files as build-cache files (`dominikh/go-tools@6cb65e58a558:config/config.go:22-37`). | `find . -name staticcheck.conf -not -path '*/vendor/*'` with output, while `.golangci.yml` enables `staticcheck`: both true is the finding | yes: [C-3] with `XDG_CACHE_HOME` moved, standalone + conf → exit 0, standalone without conf → exit 1 (S1012), golangci + conf → exit 1. Under `~/.cache`, standalone also exits 1, which explains [GC] §5. | MUST | — |
| GO-GATE-18 | A CLI module uses `cli.golangci.yml`: the baseline plus `exhaustive` (`default-signifies-exhaustive: false`), `forbidigo` on `fmt.Print*`/`print`/`println`, and gocritic `exitAfterDefer`. It never takes the library/SDK file. A switch over an **imported** package's enum with a deliberate `default:` gets `//nolint:exhaustive // <Type> is a third-party enum; default is intentional`, or a targeted per-repo `settings.exhaustive.ignore-enum-types` entry. Never disable the linter for it. | These are the mechanical checks behind GO-CLI-01..03: the exit-table switch, stdout as the result stream, and no exit past a defer. Go has no closed enum. On 4 CLIs, `exitAfterDefer` had 2 hits and both were real. The `exhaustive` false positives are all the foreign-enum shape: ko's 6/6 on go-containerregistry's `types.MediaType`, 4.05/10k LOC. Own-type switches are true positives (fzf 43, oras 2) [CR] §4. CLIs keep package-level cobra command vars, which `gochecknoglobals` would flag; that is why the library/SDK file is not theirs (owner default, map (f)). | `golangci-lint run ./...` with the CLI file. For an `exhaustive` hit, check whether the switched type is declared in the module or imported. | yes: [C-7] `clibad` → `exhaustive`, `forbidigo`, `exitAfterDefer` and `deep-exit` on one line (all kept, by GO-GATE-10), exit 1; `cligood` → exit 0. [C-14]: overlay linters only, `clibad` 3 issues exit 1, `cligood` `0 issues.` exit 0. [C-18], under the assembled `cli.golangci.yml`: `clibad` exit 1 (errcheck, exhaustive, forbidigo, gocritic, revive); `cligood` 2 baseline errcheck findings, the fixture debt recorded at [C-14] (GO-GATE-20), not an overlay miss. | MUST (CLI) | — |
| GO-GATE-19 | Enable `bodyclose` only in a package that calls `net/http` directly and does not hand `resp.Body` to a wrapper type. Keep it out of the baseline. A remaining wrapper hit gets `//nolint:bodyclose // closed by <Type>.Close`. | It fails the map's admission clause: 88/88 oras-go hits were the wrapper false positive ([GC] §3). regclient has 78 non-test hits in 62k LOC [C-6] that nobody has classified. The consensus has it at 10/23. | `golangci-lint run --enable-only=bodyclose ./...` | yes: [GC] §1 planted unclosed `http.Get` → finding, and `good/` → 0. **SHOULD**, because precision on registry-client code is unmeasured. | SHOULD | — |
| GO-GATE-20 | Keep `errcheck.settings.exclude-functions` at exactly `(io.ReadCloser).Close`. Never add a concrete-type entry such as `(*os.File).Close`, and never re-add the error-handling exclusion preset (GO-ERR-09). A read-only close on a concrete type (`*os.File` from `os.Open`, or a custom response type) takes GO-ERR-08's `errors.Join` shape; only where the enclosing function has no error result to join into does it get `//nolint:errcheck // read-only close`. A write-path `Close`, `Flush` or `Sync` is handled, never suppressed (GO-ERR-08). An unchecked `fmt.Fprint*` to an `io.Writer` is a real errcheck finding under golangci-lint: check it, or discard it explicitly. | errcheck matches the call's **declared** receiver type, not interface satisfaction. `(io.ReadCloser).Close` clears `resp.Body.Close()` and a variable declared `io.ReadCloser`, but a `*os.File` from `os.Open` stays flagged. `(*os.File).Close` clears every `*os.File` close, read or write, which reopens GO-ERR-08's hole. No entry separates read from write on one type (Verdict 11). One remedy shape is easier to teach than two, so GO-ERR-08's shape wins and the nolint is the fallback (map contradiction 9). Without the preset, errcheck fires 27–244 times per exemplar. At least 74 of those are read-only closes the exemption cannot reach, such as oras-go's 24 `os.Open` files and regclient's ≥28 `*Resp`. `fmt.Fprint*` accounts for 146, and [CR] §2 supersedes [GC] §3's "errcheck 0". | `grep -rn --include='*golangci*' -E '^\s*-\s*\(\*?[A-Za-z0-9_./]+\)\.(Close\|Flush\|Sync)' . \| grep -v -F '(io.ReadCloser).Close'`: any output is the finding. Behaviour: `golangci-lint run ./...` still reports an `os.Open` close. | yes: [C-15] the `(io.ReadCloser).Close` config → `main.go`'s `*os.File` close flagged, `iface.go`/`httpbody.go` clean, exit 1. `(*os.File).Close` → `main.go` silenced. The grep hits `excl2.yml` (exit 0) and is empty on the roclose and both fleet configs (exit 1). [C-14]: `cligood`'s `defer f.Close()` on an `os.CreateTemp` file and its `fmt.Fprintln` go red once the preset is gone. | MUST | golangci-lint 2.14.0's bundled errcheck (matching re-probed on each bump) |
| GO-GATE-21 | An unattended `golangci-lint run --fix` (an agent loop or a bot commit) runs only `--enable-only=usetesting,testifylint,misspell,canonicalheader,whitespace`. Trust its result only after `go build ./... && go test ./...` both exit 0. Never let an unattended run apply `errorlint` fixes. Every other `[auto-fix]` linter (`govet`, `staticcheck`, `copyloopvar`, `fatcontext`, `nolintlint`, `revive`, `sloglint`, `usestdlibvars`) stays lint-only until its fix has been watched on a planted violation. `go fix` (GO-GATE-03) and `golangci-lint fmt` (GO-GATE-06) are cleared separately. On each golangci-lint bump, re-run the zap probe before changing the list. | `[auto-fix]` in `golangci-lint help linters` means some finding has a fixer, not that every fix preserves behaviour. On zap, errorlint's `asserts` fix rewrote the type switch at `uber-go/zap@4892335e05f1:zapcore/error.go:69-79` into `errors.As` without importing `errors`. After `goimports` repaired the build, `TestErrorEncoding` failed, because `errors.As` walks the wrap chain and the original switch did not. golangci-lint applies fixes per linter, not per sub-check, so the safe `errorf` half cannot be taken alone. go-errorlint's README calls its fixes unstable. | `go build ./... && go test ./...` right after the fix run, where exit 0 is the pass. Whether the allowlist was used is a reading check of the workflow's `--fix` command line. | yes: [CR] CR-12, zap scratch copy: errorlint fix → `go build` exit 1 (`undefined: errors`), then after `goimports` → `go test` exit 1. CR-14: misspell and canonicalheader fixes → `go build` exit 0. CR-13: usetesting fix on `fleet/bad`, 8 → 7 issues. The testifylint and whitespace fixes were observed only in the CR-12 run; both are equivalence-preserving rewrites. | MUST | golangci-lint 2.14.0 (the list is re-verified on each bump) |
| GO-GATE-22 | Ship exactly three golangci-lint v2 files and copy exactly one, whole, to each module's `.golangci.yml`: the baseline (GO-GATE-09) by default, `cli.golangci.yml` (GO-GATE-18) for a CLI module, `lib-sdk.golangci.yml` (GO-GATE-23) for the SDK and any library module. Each overlay is the entire baseline plus its delta: never a fragment, never only the new lines. Sibling families and depth files cite a linter name and setting (`sloglint.no-global`, `gosec.excludes`, `revive.rules`); they never paste YAML. Every file passes `golangci-lint config verify`, and every overlay enables every baseline linter and repeats the baseline revive rules. | Five families each pasted a fragment of the one config, and the fragments disagreed on presets, gosec excludes, the revive list, sloglint and depguard (map contradictions 1–6). A fragment is also a valid config: `config verify` exits 0 on a 5-linter overlay that drops 28 baseline linters [C-23]. An overlay cannot subtract a baseline setting, which is why `no-global` lives in one file only (map contradiction 4). | `golangci-lint config verify --config <file>` on each file, plus the superset check in "File checks" (any output is the finding) and the revive count of GO-GATE-15. | yes: [C-18] verify exit 0 on all three; `fleet/good` `0 issues.` under both the baseline and the library/SDK file. [C-23]: fragment → `config verify` exit 0 (not a completeness check), superset check lists 28 missing linters; `cli.golangci.yml` and `lib-sdk.golangci.yml` → 0 missing. | MUST | golangci-lint v2 |
| GO-GATE-23 | The SDK and every library module use `lib-sdk.golangci.yml`: the baseline plus `gochecknoglobals`, `gochecknoinits`, `ireturn` and `exhaustive` (`default-signifies-exhaustive: false`), `staticcheck.checks: [all]`, the four-rule revive list ending in `exported`, `sloglint.no-global: "all"`, and `exclusions.presets: []`. `no-global` appears in no other file. A hit from a linter whose rule is SHOULD for that module (`ireturn`, GO-API-07; `gochecknoglobals`/`gochecknoinits` in a library, GO-API-06) is fixed or carries `//nolint:<linter> // <reason>`. When measuring a doc or naming linter on existing code, leave `internal/` packages out of the count. | The file enforces GO-API-04 (doc comments, ST1000/ST1020–22 and revive `exported`, all non-default), GO-API-06/07/08 and GO-OBS-03. `comments` would silence exactly those findings even when enabled [C-19], so this file carries no preset (map contradiction 1). A package-level `slog` call resolves through whatever `SetDefault` last ran, but a CLI may call `SetDefault` once in `main`, so the setting stays out of the baseline and CLI files (map contradiction 4). On 5 named exemplars the raw rates are 6.4/10k (`gochecknoglobals`), 0.4 (`gochecknoinits`), 14.9 (`ireturn`) and 3.3 (revive `exported`, `internal/` excluded). In the hand-read sample every hit was real debt in code that predates the rule, with no false positives ([CA] §7). `internal/` inflated go-cmp's `exported` count from 12 to 193 with no pkg.go.dev reader ([CA] §7). The SDK starts at zero debt (map contradiction 22). | `golangci-lint run ./...` with the file. Placement: the `no-global` grep in "File checks", run in a CLI or baseline module, where any output is the finding. | yes: CA-10: an undocumented `Frob` → `exported` + `ST1000`, exit 1, under this file; `0 issues.` under the baseline; documented twin → exit 0. CA-11: `gochecknoglobals` + `ireturn` red, twin exit 0. CA-6/CA-7: package-level `slog.Warn` → `default logger should not be used (sloglint)`, exit 1, here; `0 issues.` under the baseline and CLI files. [C-19]: the same file with `presets: [comments]` → `0 issues.`, exit 0, on CA-10's violation (the miss). [C-24]: the `no-global` grep → empty on the baseline and CLI files (exit 1), hits `lib-sdk.golangci.yml` (exit 0). | MUST (SDK, library) | golangci-lint v2 |

#### Admission evidence for the linters this consolidation added

This is the map's bar: at most 1 false positive per 10k LOC on at least 5 of 8 named exemplars. The [C-6] runs used `uniq-by-line: false` and no caps. LOC is taken from [GC] §3, except the gosec row, which uses [CA]'s non-test LOC.

| linter (settings) | cobra | oras-go | ko | zap | go-cmp | regclient | fzf | urfave-cli | classification | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| `nilnil` | 0 | 3 | 4 | 2 | 0 | 4 | 0 | 7 (tests) | Counted as FP: deliberate nil-means-absent at `ko-build/ko@fcaeb337b6bd:pkg/caps/caps.go:206` and `oras-project/oras-go@cb6d6dc79f83:internal/manifestutil/parser.go:43`. ≤1/10k on 5/8. | in (GO-ERR) |
| `nilerr` | 0 | 2 | 2 | 0 | 0 | 1 | 0 | 0 | real ([gates] §5) | in |
| `revive` `context-as-argument` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | in (GO-CONC) |
| `revive` `deep-exit` | 2 | 0 | 1 | 3 (tests, `log.Panic`) | 0 | 0 | 2 | 2 | real library exits, e.g. `spf13/cobra@adbc8813901b:cobra.go:238` and `ko-build/ko@fcaeb337b6bd:pkg/commands/options/filestuff.go:84` | in |
| `thelper` (all checks) | 27 | 2 | 3 | 43 | 1 | 2 | 9 | 8 | 24 of the 95 are `tb` naming or parameter order (style). The sampled `begin` hits are real, for example `spf13/cobra@adbc8813901b:args_test.go:35` calls `t.Fatalf` without `t.Helper()`. | in, with `name`/`first` off |
| `usetesting` (+ctx) | 21 | 691 | 97 | 0 | 0 | 37 | 4 | 1 | These are true positives of GO-TEST-06 (modernization debt), not false positives. It is silent below `go 1.24`. | in |
| `bodyclose` | 0 | 88 (tests, FP) | 0 | 0 | 0 | 120 (78 non-test) | 0 | 0 | wrapper false-positive shape | out → GO-GATE-19 |
| `errcheck` (no preset, `(io.ReadCloser).Close` excluded), [CR] CR-6 | 65 | 244 | 41 | 30 | 2 | 228 | 91 | 27 | 45–55% are not `Close` calls: `fmt.Fprint*` (146) and test cleanup (~70). ≥74 are read-only closes the exemption cannot reach. cobra's 16 closes are all write-path. | in (a standard linter backing GO-ERR-08). The volume is real work. |
| `errorlint` (all four checks), [CR] CR-8 | 4 | 108 | 0 | 5 | 1 | 18 | 3 | 17 | 0/51 FP in a spot-read (20 oras-go, 31 of caddy's 462 at stride 15). Top rate: oras-go at 11.96/10k. | in as a lint; out of `--fix` (GO-GATE-21) |
| `gosec` (excludes G104/G115/G304, no `common-false-positives`), [CA] | 0 | 11 | 14 | 1 | 5 | 0 | 36 | 2 | 69 in ~124k non-test LOC (5.6/10k): G103 21, G204 19, G7xx 12. Every hand-read G103/G204/G7xx hit is real, e.g. fzf's zero-copy `unsafe.String` at `junegunn/fzf@b1be3a8be1b8:src/util/chars.go:236` and ko's G703 at `ko-build/ko@fcaeb337b6bd:pkg/build/gobuild.go:436`. | in (GO-GATE-14, GO-SEC-01) |

The [CR] rows supersede [GC] §3's errcheck (0 on all 8) and errorlint (45 on oras-go) counts. Those were taken from a `default: all` run and do not reproduce under this file's `default: none` shape.

CLI overlay on the four CLI exemplars ([CR] CR-9; hits for exhaustive / forbidigo / gocritic), plus [CA]'s G204 count:

| repo | LOC | hits | classification | G204 ([CA] §8, non-test LOC) |
|---|---|---|---|---|
| cli/cli | 296,001 | 18 / 6 / 0 | 6 foreign-enum `exhaustive` hits (0.20/10k); 12 own-type hits are true positives | 12 (1.0/10k) |
| ko-build/ko | 14,799 | 6 / 7 / 1 | all 6 `exhaustive` hits are the foreign `types.MediaType` with a deliberate default (4.05 FP/10k); `exitAfterDefer` at `ko-build/ko@fcaeb337b6bd:main.go:30` is real | 6 (6.6/10k) |
| oras-project/oras | 41,058 | 2 / 4 / 1 | own `progress.State`, true positives; `exitAfterDefer` in a test is real | 0 in the root module; 4 in the separate `test/e2e` module |
| junegunn/fzf | 33,376 | 43 / 24 / 0 | all own-type switches, true positives | 9 (3.3/10k) |

Across the CLI-shaped exemplars (with cobra 0 and urfave/cli 2), G204 totals 33 hits in ~178k LOC (1.9/10k), each a real variable-argument spawn. Each hit is judged per call, which is why the answer is a reasoned per-call suppression, not an exclude (GO-SEC-01; GO-IO-13 stays CONSIDER).

Library/SDK overlay on five named exemplars ([CA] §7; `_test.go` and `internal/` excluded):

| linter | go-cmp (4,773) | zap (8,703) | oras-go (17,441) | go-containerregistry (26,426) | go-github (121,551) | rate/10k | classification |
|---|---|---|---|---|---|---|---|
| `gochecknoglobals` | 8 | 20 | 38 | 40 | 8 | 6.4 | real mutable package state, e.g. `uber-go/zap@4892335e05f1:encoder.go:34` |
| `gochecknoinits` | 0 | 1 | 0 | 5 | 1 | 0.4 | real `init()` |
| `ireturn` | 51 | 55 | 21 | 134 | 0 | 14.9 | real interface returns; some are legitimate subsystem abstractions (GO-API-07 SHOULD, per-site nolint) |
| revive `exported` | 12 | 0 | 6 | 31 | 13 | 3.3 | real undocumented exports; go-cmp is 193 with `internal/` counted |
| staticcheck ST1003 | — | — | 2 | — | — | 0.1 | real mis-cased identifiers |

The raw rates exceed 1/10k, but the bar counts false positives, and the hand-read sample found none. This is the same "real work, not noise" admission the baseline's errcheck took. Every linter is in the file (map contradiction 22 closed). The sample size behind "none" is [CA]'s, and it is not re-read here.

#### Consolidation verification runs

All runs use `/home/mherwig/.cache/research-lang/go-tools/run.sh` on 2026-09-26, under `fixtures/go-gates/` unless a path says otherwise.

| Run | Command | Violation → exit | Twin → exit |
|---|---|---|---|
| C-1 | In `nilness/`: `golangci-lint run --config default.yml ./bad/...`, then `--config enableall.yml`, then `go vet ./bad/...`, then `staticcheck ./bad/...`, then `go run golang.org/x/tools/go/analysis/passes/nilness/cmd/nilness@v0.49.0 ./bad/...` | default govet `0 issues.` exit 0 (**miss**); enable-all `bad.go:8:12: nilness: nil dereference in field selection (govet)` exit 1; go vet exit 0 (miss); staticcheck 2026.2.1 exit 0 (miss); standalone nilness exit 1 | `./good/...`: enable-all `0 issues.` exit 0; nilness exit 0 |
| C-2 | `golangci-lint run --config nilness/default.yml ./...` in each of `gate-commands/{copylocks,lostcancel,loopclosure,unusedresult,waitgroup,hostport,composites}` | 7/7 exit 1 with the same analyzer text as bare `go vet` | — (twins in [CMD]) |
| C-3 | In `scconf/` with `checks = ["inherit", "-S1012"]`: `XDG_CACHE_HOME=$PWD/xdg staticcheck ./...`, then `golangci-lint run --config gl.yml ./...` | golangci + conf: S1012, exit 1 (conf ignored). Without `XDG_CACHE_HOME` moved: standalone + conf is also exit 1 (the cache-dir exclusion). | standalone + conf, cache moved: exit 0. Standalone without conf: S1012, exit 1. |
| C-4 | `golangci-lint run --config modernize-only.yml ./...` vs `go fix -diff ./...` on `gate-commands/modernize`, `modsuite/` and a read-only run on `uber-go/zap@4892335e05f1` | modernize fixture: both report `rangeint`, `stringsseq`, `omitzero`. `modsuite` `//go:fix inline`: golangci `0 issues.`, `go fix` exit 1. zap: golangci 243 (`any` 236, `importcomment` 7); `go fix` 27 files, 87 hunks, 236 `interface{}` lines. | `modernize-fixed`: `go fix` exit 0 ([CMD]) |
| C-5 | In `revive/`: `golangci-lint run --config {bare,bare-nouniq,curated}.yml ./...` | bare with the default uniq: 2 issues on lines 1 and 5; bare with `uniq-by-line: false`: 4 issues (adds `unused-parameter` and `context-as-argument` on line 5) | curated: only `context-as-argument`, 1 issue |
| C-6 | `golangci-lint run --config go-gates/measure.yml ./...` in the 8 clones (read-only; the output is in `measure/`) | the admission table | — |
| C-7 | In `fleet/`: `golangci-lint config verify` on both configs, `golangci-lint run ./bad/...`, `--config cli.golangci.yml ./clibad/...`; then in `golangci-config/mod`: `--config fleet/.golangci.yml ./bad/...` | verify exit 0 ×2. `bad`: 8 issues (gosec G306, govet nilness, nilerr, nilnil, revive ×2, thelper, usetesting), exit 1. `clibad`: 4 issues, exit 1. [GC] `bad`: 64 issues across 24 linters, exit 1. | `good` `0 issues.` exit 0. `cligood` `0 issues.` exit 0. [GC] `good` 1 `nilnil` on its `openFile` stub (that twin predates nilnil). |
| C-8 | `CGO_ENABLED=0 go test -race ./good/...` in `fleet/` | `go: -race requires cgo; enable cgo by setting CGO_ENABLED=1`, exit 2 | default env: `ok`, exit 0 |
| C-9 | In `gendrift/` (a git repo): `go generate ./...`, then `git diff --exit-code`, then `test -z "$(git status --porcelain)"` | stale: diff exit 1, porcelain exit 1. A new file only: diff exit **0** (miss), porcelain exit 1. | regenerated and committed: 0 / 0 |
| C-10 | `go vet ./...` in `wgfloor/` (`go 1.21` line) | `WaitGroup.Add called from inside new goroutine` and the `hostport` finding, exit 1. This refutes [CMD] §2's "below 1.25 does not get either analyzer". | — |
| C-11 | The GO-GATE-08, GO-GATE-16 and GO-GATE-07 greps on `pin/{bad,good}` | pin grep 2 hits, exit 0; noise grep 2 hits, exit 0; windows grep exit 1 | pin exit 1; noise exit 1 (and on both fleet configs); windows exit 0 |
| C-12 | `golangci-lint run --config fleet/.golangci.yml <other module>/bad/...` run from the wrong root | `typechecking error … does not contain main module`, then `0 issues.` on stdout, exit **7** | — |

First-revision runs. These re-ran [CR]'s recorded verifications, read-only, under `fixtures/config-revision/`.

| Run | Command | Violation → exit | Twin → exit |
|---|---|---|---|
| C-13 | In `fleet/`: `golangci-lint config verify --config .golangci.yml` and `--config cli.golangci.yml`, then `golangci-lint run` with the then-current GO-GATE-09 block on `./bad/...` and `./good/...` | `bad`: 8 issues (gosec, govet, nilerr, nilnil, revive ×2, thelper, usetesting), exit 1 | verify exit 0 ×2; `good` `0 issues.`, exit 0 |
| C-14 | In `fleet/`: `golangci-lint run --config cli.golangci.yml ./cligood/...`; then with `--enable-only=exhaustive,forbidigo,gocritic` on `./clibad/...` and `./cligood/...` | full config on `cligood`: 2 errcheck (`defer f.Close()` at `main.go:37`, `fmt.Fprintln` at `main.go:41`), exit 1. Overlay-only on `clibad`: 3 issues, exit 1 | overlay-only `cligood`: `0 issues.`, exit 0 |
| C-15 | In `roclose/`: `golangci-lint run --config .golangci.yml ./...` (`(io.ReadCloser).Close`) and `--config excl2.yml ./...` (`(*os.File).Close`); then the GO-GATE-20 grep on `excl2.yml`, `.golangci.yml` and both `fleet/` configs | `(io.ReadCloser).Close`: only `main.go:10` (`*os.File`) flagged, exit 1. `(*os.File).Close`: `httpbody.go` and `iface.go` flagged while `main.go` is silenced, exit 1. Grep on `excl2.yml`: 1 hit, exit 0 | grep on `.golangci.yml` and the fleet configs: empty, exit 1 |
| C-16 | GO-ERR-09's grep `grep -rn --include='*golangci*' -e 'std-error-handling'` vs the anchored `-E '^[^#]*std-error-handling'`, run on `fixtures/go-gates/fleet/` (old) and `fixtures/config-revision/fleet/` (corrected) | unanchored: old hit (exit 0) **and corrected hit (exit 0) on a comment** that names the preset. Anchored: old hit, exit 0 | anchored on corrected: empty, exit 1 |
| C-17 | In `wgfatal/`: `go vet ./...` in `bad/` (`wg.Go` + `t.Fatal`), `egbad/` (`errgroup.Go` + `require.NoError`) and `rawgo/` (literal `go func(){ t.Fatal() }()`) | `rawgo`: `call to (*testing.T).Fatal from a non-test goroutine`, exit 1 (positive control) | `bad` exit 0, `egbad` exit 0: the documented gap, not a pass |

Assembly-revision runs. These re-ran [CA]'s recorded verifications and added discriminating runs where [CA] had shown only one side. Assembled files and fixtures are read from `fixtures/config-assembly/` (`F`). New configs and the fragment are under `fixtures/go-gates/assembly-check/` (`G`).

| Run | Command | Violation → exit | Twin → exit |
|---|---|---|---|
| C-18 | `golangci-lint config verify --config F/{.golangci.yml,cli.golangci.yml,lib-sdk.golangci.yml}`; then in `fixtures/config-revision/fleet/`: `golangci-lint run --config F/.golangci.yml ./bad/...`, `./good/...`; `--config F/lib-sdk.golangci.yml ./good/...`; `--config F/cli.golangci.yml ./clibad/...`, `./cligood/...`. Also re-ran CA-2..CA-11 unchanged, and every result matched [CA]. | `bad`: 8 issues (gosec, govet, nilerr, nilnil, revive ×2, thelper, usetesting), exit 1. `clibad`: errcheck, exhaustive, forbidigo, gocritic, revive, exit 1. `cligood`: 2 errcheck, exit 1 (the fixture debt from [C-14]) | verify exit 0 ×3; `good` `0 issues.` exit 0 under the baseline and under the library/SDK file |
| C-19 | `G/lib-comments.yml` = `lib-sdk.golangci.yml` with `presets: [comments]`; `golangci-lint run --config G/lib-comments.yml ./...` in `F/apidoc/violation` | `0 issues.`, exit 0: **miss**. The `comments` preset silences `exported` and `ST1000` even with both enabled | the real `lib-sdk.golangci.yml` (`presets: []`): `exported` + `ST1000`, exit 1 (CA-10) |
| C-20 | `G/base-no304.yml` = the baseline without the `G304` exclude; `golangci-lint run --config G/base-no304.yml ./...` in `F/g304/probe` | `probe.go:7:9: G304: Potential file inclusion via variable (gosec)`, exit 1 | the baseline: `0 issues.`, exit 0 (the exclusion is load-bearing, and so is the gap in Verdict 11) |
| C-21 | `golangci-lint run --config F/g204/badcfg/.golangci.yml ./...` (the old `[comments, common-false-positives]` preset) in `F/g103/bad` | `0 issues.`, exit 0: **miss**. The preset deletes G103 | the baseline: `bad.go:7:9: G103: Use of unsafe calls should be audited (gosec)`, exit 1 (CA-2) |
| C-22 | `golangci-lint run --config F/.golangci.yml --enable-only=staticcheck ./...` in `F/timeeq/bad` and `F/timeeq/good` | `bad.go:7:9: QF1009: probably want to use time.Time.Equal instead (staticcheck)`, exit 1. This refutes [CA]'s "QF1009 is non-blocking" | `good`: `0 issues.`, exit 0 |
| C-23 | `G/fragment.golangci.yml` (`version: "2"`, 5 linters, revive `rules: [exported]`): `golangci-lint config verify`; the GO-GATE-22 superset check against the baseline for the fragment and both overlays; `golangci-lint run --enable-only=revive ./...` in `F/timeeq/bad` under each | fragment: verify exit 0 (the gap), superset check lists 28 missing linters (`canonicalheader` … `whitespace`), 0 `time-equal` hits | `cli.golangci.yml` and `lib-sdk.golangci.yml`: 0 missing, 1 `time-equal` hit each |
| C-24 | `grep -n -e 'common-false-positives'` vs `grep -n -E '^[^#]*common-false-positives'` on the three `F` files and `F/g204/badcfg/.golangci.yml`; `grep -n -E '^[^#]*no-global'` on the three `F` files | unanchored: hits the baseline and CLI files' **comments** (exit 0, a false red on a compliant file). Anchored on `badcfg`: `presets: [comments, common-false-positives]`, exit 0. `no-global` on `lib-sdk.golangci.yml`: 1 hit, exit 0 | anchored on the three files: empty, exit 1. `no-global` on the baseline and CLI files: empty, exit 1 |
| C-25 | `go tool vet help` (the "Registered analyzers" block); `sed -n 654,693p $(go env GOROOT)/src/cmd/go/internal/test/test.go` | — | 35 registered analyzers; 12 uncommented `defaultVetFlags` entries (`atomic` … `tests`, including `stdversion`) |
| C-26 | The baseline block in this file vs `F/.golangci.yml`, both with `#` comments and trailing blanks stripped, then `diff` | — | identical, exit 0 |

## Applied to the exemplars and the future consumers

**Already compliant (strict exemplars):**
- `tailscale/tailscale@6b3a45f14ef6` is the GO-GATE-17 model:
  - golangci enables no staticcheck (`.golangci.yml:9-15`);
  - a separate CI job runs the standalone binary (`.github/workflows/test.yml:806-812`) against `staticcheck.conf`;
  - its explicit `govet` list includes `nilness` (`.golangci.yml:40`), which is GO-GATE-11 in spirit.
  - **Correction:** [gates] §2 and its "Patterns" section said tailscale layers `staticcheck.conf` under golangci's staticcheck. The config does not do that. The rule stands on [C-3] instead.
- `google/go-github@48d0a668cde8` and `sigstore/cosign@907c3d899c0e` satisfy GO-GATE-10 in full: `uniq-by-line: false` plus zero caps.
- `golangci/golangci-lint@032d962e0399:.golangci.yml` is the only real config meeting GO-GATE-12.
- `cli/cli@9b031151a825:.github/workflows/lint.yml:41` already gates tidy with `-diff` (GO-MOD-03).
- Four of the five own-config runs (cobra, oras-go, zap, urfave/cli) pass their own gate with 0 issues ([gates] §5).

**Violations:**

| Rule | Exemplar | Evidence |
|---|---|---|
| GO-GATE-14 | `ko-build/ko@fcaeb337b6bd:.golangci.yaml:21-22` | Only G115 is excluded and the list is not re-reviewed, so a live G703 is at `pkg/build/gobuild.go:436` ([gates] §5) |
| GO-GATE-09 (GO-SEC-01) | `google/go-containerregistry@0c8bedb78437:.golangci.yaml:46`, `ko-build/ko@fcaeb337b6bd:.golangci.yaml:27`, `sigstore/cosign@907c3d899c0e:.golangci.yml:60`, `oras-project/oras@a0cd4de5cfcd:.golangci.yml:60`, `spf13/cobra@adbc8813901b:.golangci.yml:57`; 13/23 real configs in all | They carry `common-false-positives`, so G103, G204 and G304 never fire ([CA] Exemplar evidence, GO-SEC-01) |
| GO-GATE-10 | 21/23 real configs, e.g. `ko-build/ko`, `spf13/cobra`, `caddyserver/caddy`, `oras-project/oras-go` | `uniq-by-line` is left at its default (true). 12/23 also keep the default caps [C-6 parse] |
| GO-GATE-15 | `ko-build/ko@fcaeb337b6bd:.golangci.yaml:10`, `uber-go/zap@4892335e05f1:.golangci.yml:17`, `oras-project/oras@a0cd4de5cfcd:.golangci.yml:50`, plus bubbletea, restic, syncthing and cosign | revive is enabled with no `rules:` (7/23), so its whole default set runs |
| GO-GATE-15 | `spf13/cobra@adbc8813901b:.golangci.yml:37`, `sigstore/cosign`, `kubernetes-sigs/controller-runtime` | gocritic is enabled with no settings |
| GO-GATE-03 | `caddyserver/caddy@54937914234b:.golangci.yml:36` and 7 others | golangci `modernize` is used as the modernization gate. It misses `//go:fix inline` [C-4] |
| GO-GATE-04 | `spf13/cobra`, `uber-go/zap`, `urfave/cli`, `oras-project/oras-go`, `regclient/regclient`, `junegunn/fzf` | No `-race` in any workflow (15/32 CI repos lack it, [gates] §3) |
| GO-GATE-05 | 31/32 CI repos | No generate-drift check ([gates] §3) |
| GO-GATE-11 | 20/23 real configs | They lack `govet enable-all` or an explicit `nilness`, so they have no nil-dereference check after staticcheck 2026.2 |
| GO-GATE-09 / GO-GATE-20 (GO-ERR-09) | 13/23 real configs, e.g. `aquasecurity/trivy@ae561f8cca36:.golangci.yaml:201`, `ko-build/ko@fcaeb337b6bd:.golangci.yaml:29`, `sigstore/cosign@907c3d899c0e:.golangci.yml:62`, `caddyserver/caddy@54937914234b:.golangci.yml:73`, `goreleaser/goreleaser@ff8de3d6c389:.golangci.yaml:113` | They enable the `std-error-handling` preset, which silences write-path `Close`/`Flush` errors. Popularity is not evidence here ([CR] §AI-agent 6) |
| GO-GATE-01 (GO-MOD-06) | `oras-project/oras@a0cd4de5cfcd` | Two `go.mod` roots; the `test/e2e` module holds every `os/exec` call and is invisible to a root-level `./...` ([CA] §10) |
| GO-GATE-21 | `uber-go/zap@4892335e05f1:zapcore/error.go:69-79` | Not a config violation. It is the real code on which errorlint's unattended fix broke the build and then the tests (CR-12) |

**New commitments for the fleet consumers:**
- **OCX SDK for Go.** It takes `lib-sdk.golangci.yml` verbatim (GO-GATE-23), GO-GATE-01's block, and a Windows/macOS/Linux matrix (GO-GATE-07). It follows GO-MOD-11 (no `tool` lines) and the 100% coverage gate (Q5, GO-TEST). `no-testify` stays on. The depguard `logging` rule is MUST here through GO-MOD-10. `exhaustive` gates its exit-code-to-error mapping (GO-API-08). It carries no mutable package state, and it has no `init()`.
- **Go CLIs (ocx/grimoire mould).** They take `cli.golangci.yml` (GO-GATE-18), never the library/SDK file, and the full block with GO-GATE-04's cgo-on race job. The release job alone sets `CGO_ENABLED=0` (GO-REL). A CLI writes its result through an injected `io.Writer`, so every `fmt.Fprint*` return is checked or explicitly discarded (GO-GATE-20). Each subprocess spawn with a variable argument gets its own `//nolint:gosec // G204: <reason>` (GO-SEC-01).
- **Libraries.** They take `lib-sdk.golangci.yml`. `ireturn`, and `gochecknoglobals`/`gochecknoinits`, are SHOULD for them: fix the hit or give a reason (GO-API-06/07).
- **Agent loops on any fleet Go repo.** Unattended fixes are `go fix ./...`, `golangci-lint fmt` and GO-GATE-21's five-linter `--fix` allowlist, and nothing else. Each fix run is followed by `go build` and `go test`.
- **Mirrored release artifacts.** No GO-GATE row applies; the binary-mode govulncheck is GO-MOD-13.

## AI-agent failure modes

Ranked by how often each bites an agent writing Go CI or config.

1. **Treating a green `go test` as a vet pass.** `go test` runs 12 of 35 analyzers on Go 1.27.1.
   - Check: a separate `go vet ./...` step (GO-GATE-02), watched on 7 fixtures.
2. **Writing a v1 golangci config from memory:** `presets`, `linters-settings`, `gosimple`/`stylecheck`, `issues.exclude-use-default`.
   - Check: `golangci-lint config verify`, which exits 3 on v1 (GO-GATE-09).
3. **Copying `common-false-positives` from an exemplar** because it sounds safe and 13 of 23 real configs have it. It deletes every G103 and G204 finding and breaks the reasoned G204 suppression.
   - Check: the anchored preset grep (GO-GATE-09, [C-21], [C-24]).
4. **Trusting the default `uniq-by-line`.** It reads a same-line suppression as "clean".
   - Check: the three `issues:` lines. If a full run shows less than `--enable-only=<linter>` does, a cap or uniq setting is hiding findings (GO-GATE-10).
5. **Writing an overlay as a fragment**, for example a library config with only the four API linters, or a revive list with only `exported` "added". `config verify` passes, and 28 baseline linters or three revive rules silently disappear.
   - Check: GO-GATE-22's superset check and GO-GATE-15's revive count [C-23].
6. **Relying on "the nil check" that no longer exists.** SA5011 is disabled in 2026.2, and bare vet does not run nilness.
   - Check: `govet enable-all` (GO-GATE-11).
7. **Adding `//nolint` or `-vet=off` to reach green.**
   - Check: nolintlint's require-specific and require-explanation (GO-GATE-12). A `git diff -U0` grep for suppression tokens is GO-CORE-01.
8. **Setting `CGO_ENABLED=0` workflow-wide** because the release wants static binaries. That breaks `-race` with exit 2.
   - Check: GO-GATE-04's per-job placement.
9. **Using `version: latest` or `@latest` for golangci-lint**, so the gate changes verdict without a commit.
   - Check: GO-GATE-08's grep.
10. **Checking generate drift with `git diff --exit-code`**, which misses a newly generated untracked file.
    - Check: `git status --porcelain` (GO-GATE-05).
11. **Enabling linters bare "for more coverage":** `default: all`, `wrapcheck`, `revive`/`gocritic` without settings, `paralleltest`.
    - Check: GO-GATE-16's grep and GO-GATE-15's settings requirement.
12. **Dropping a `staticcheck.conf` into a golangci repo** and expecting it to apply.
    - Check: GO-GATE-17's `find` plus the config read.
13. **Reading `0 issues.` on stdout as a pass** when golangci exited 7 on a typecheck or module-root error, or running from the repo root of a multi-module repo and reading exit 0 as coverage of every module.
    - Check: gate on the exit status (GO-GATE-01), and run from each `go.mod` root found by `find . -name go.mod -not -path '*/vendor/*'` (GO-MOD-06).
14. **Treating gosec as the secrets check.** G101 fires only when a literal clears its entropy threshold or matches a vendor regex, at any scope, so low-entropy and concatenated secrets pass.
    - Check: GO-SEC-08's name-and-literal grep. (This file used to say G101 inspects only package scope. GO-SEC-08 measured otherwise, map contradiction 10.)
15. **Wiring govulncheck in json/sarif mode** and trusting its exit code, which is always 0.
    - Check: GO-MOD-12.
16. **Copying `std-error-handling` into the config because 13 of 23 real configs have it**, or writing `(*os.File).Close` into `exclude-functions` to quiet read-only closes. Either one silences write-path close errors.
    - Check: GO-GATE-09's anchored preset grep and GO-GATE-20's `exclude-functions` grep.
17. **Assuming `(io.ReadCloser).Close` exempts `defer f.Close()` after `os.Open`,** or that golangci's errcheck ignores `fmt.Fprint*` because the standalone errcheck README suggests it does. Neither holds under golangci-lint 2.14.0.
    - Check: after changing the setting, the `os.Open` close must still be reported (GO-GATE-20, [C-15]).
18. **Putting `sloglint.no-global: "all"` in the baseline "to cover everything"**, which breaks a CLI's one `slog.SetDefault` in `main`, or leaving it out of the library/SDK file.
    - Check: the `no-global` grep (GO-GATE-23, [C-24]).
19. **Keeping `comments` in the library/SDK file's presets**, so the doc-comment checks it enables report nothing.
    - Check: `exclusions.presets: []` in that file; an undocumented export must go red (GO-GATE-23, [C-19]).
20. **Trusting the exit 0 of `golangci-lint run --fix`** as proof the tree is safe to commit.
    - Check: `go build ./... && go test ./...` after every fix run, with the allowlist in place (GO-GATE-21).
21. **Treating `wg.Go(func(){ … })` or `g.Go(…)` as covered by vet's goroutine checks.** A `t.Fatal` or `require.*` in that closure is invisible to every analyzer measured.
    - Check: none mechanical. GO-TEST-01's grep-and-read heuristic (Verdict 11).
22. **Putting a comment that names a banned preset into a config**, so an unanchored grep reports a violation on a clean config. The assembled files do exactly that, and the unanchored `common-false-positives` grep [CA] proposed goes red on them.
    - Check: the anchored `'^[^#]*<preset>'` form [C-16], [C-24].
23. **Declaring a doc or naming linter "too noisy" from a count that includes `internal/`**, or from raw volume on legacy code.
    - Check: exclude `internal/`, and hand-read 5–10 hits for factual errors before calling any of them false positives (GO-GATE-23).

## Open questions

**Owner decisions.** The program applies each default without waiting.
- **Pinned golangci-lint version and bump cadence.** Default: pin v2.14.0 now. Bump only through the `go-upgrade` skill. It re-runs GO-GATE-14's empty-excludes gosec pass (including G304), `config verify` and the superset check on all three files, GO-GATE-20's roclose probe (CR-4/CR-5), GO-GATE-21's zap `--fix` probe (CR-12), and [C-22]'s QF1009 probe.
- **Race job OS scope.** Default: `-race` on the Linux leg only. The Windows and macOS legs run plain `go test`, because Windows `-race` needs a cgo C toolchain on the runner, which is not verified here.
- **`no-testify` in the shared baseline.** Default: on. A repo that already uses testify deletes that one rule, in whichever of the three files it copied, and keeps `testifylint`, per GO-TEST.
- **Applied defaults from map (f):** CLIs do not take the library/SDK file; the depguard `logging` rule is in all three files; CLIs may use per-call reasoned G204 suppressions (GO-IO-13 stays CONSIDER); no sloglint style options.

**Subareas that deserve another round:**
- **bodyclose precision on registry clients** (routed to `network/http-client-server`). Hand-classify regclient's 78 non-test hits (`regclient/regclient@43d2acb9fafd:scheme/reg/blob.go:60` looks like a real leak on the 202 path). Question: does bodyclose meet ≤1 FP/10k LOC on HTTP-client code that uses response wrappers, or should GO-NET use a reading heuristic instead?

**Residue, not load-bearing (map (f)); recorded for whoever picks it up:**
- **Widening the `--fix` allowlist (GO-GATE-21).** `govet`, `staticcheck`, `copyloopvar`, `fatcontext`, `nolintlint`, `revive`, `sloglint` and `usestdlibvars` carry `[auto-fix]`, but no fix fired in any [CR] run. The current list is safe by construction.
- **An `ireturn` settings allowlist for subsystem-abstraction interfaces** (`Cache`, `Target`) instead of per-site `//nolint`. Wait for the first SDK or library's real annotation cost ([CA] Contested).
- **An `internal/` exclusion for revive `exported`/ST-family** in a large legacy library that adopts `lib-sdk.golangci.yml`. The fleet's new code does not pay this cost. Reopen it with that repo's numbers ([CA] Contested).

## Sub-artifacts

- [go-gates/golangci-config.md](go-gates/golangci-config.md): the pinned golangci-lint v2 config. It covers per-linter FP measurements on 8 exemplars, v1→v2 migrate behaviour, gosec excludes, and the uniq-by-line discovery. Its G101 scope claim is superseded by GO-SEC-08.
- [go-gates/gate-commands.md](go-gates/gate-commands.md): the ordered command block. It covers the go test/go vet analyzer gap on 7 fixtures, `go fix -diff` safety (omitzero), tidy/readonly, the govulncheck format exit codes, generated-marker detection and tool-directive leakage. Its "11 of 36" count is superseded by [C-25].
- [go-gates/config-revision.md](go-gates/config-revision.md): the first follow-up round. It corrects the config (error-handling preset removed, errcheck exemption, nilnil `checked-types`, GO-MOD-08's depguard list). It also covers errcheck's declared-type matching, errcheck volume without the preset, errorlint precision including caddy, `exhaustive`'s foreign-enum shape, the unattended `--fix` probe and the `wg.Go`/`errgroup.Go` analyzer blind spot.
- [go-gates/config-assembly.md](go-gates/config-assembly.md): the second follow-up round. It assembles and watches the three complete files: presets `[comments]`/`[]`, gosec G304, the three- and four-rule revive lists, `no-global` placement, the 12-entry `superseded` rule plus `logging`, and the library/SDK linters. It adds the full gosec roster census, the overlay census, the CLI G204 count and the oras split-module finding. Two of its claims are corrected here: QF1009 is blocking [C-22], and its unanchored `common-false-positives` grep false-reds on the assembled files [C-24].

## Key sources

- [golangci-lint configuration file reference](https://golangci-lint.run/docs/configuration/file/) (v2 schema)
- [golangci-lint v1→v2 migration guide](https://golangci-lint.run/docs/product/migration-guide/)
- [golangci-lint annotated reference config](https://raw.githubusercontent.com/golangci/golangci-lint/main/.golangci.reference.yml) (per-linter defaults: errorlint, usetesting, thelper, sloglint)
- `golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:6-89` (the `comments` and `common-false-positives` presets filter by message text)
- [pkg.go.dev/cmd/vet](https://pkg.go.dev/cmd/vet) (the analyzer roster and exit contract)
- [pkg.go.dev/cmd/go — Testing flags](https://pkg.go.dev/cmd/go#hdr-Testing_flags) and `go1.27.1:src/cmd/go/internal/test/test.go:654-693` (the 12-analyzer `go test` subset)
- [Go 1.26 release notes](https://go.dev/doc/go1.26) (`go fix` becomes the modernizer runner)
- [Go 1.27 release notes](https://go.dev/doc/go1.27) (`stdversion` under `go test`)
- [Go 1.25 release notes](https://go.dev/doc/go1.25) (`waitgroup` and `hostport` vet analyzers)
- [staticcheck 2026.2 release notes](https://staticcheck.dev/changes/2026.2/) (SA5011 disabled, SA9010 added)
- [govulncheck command docs](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck) (json/sarif/openvex always exit 0)
- [govulncheck-action README](https://raw.githubusercontent.com/golang/govulncheck-action/master/README.md)
- [Race detector](https://go.dev/doc/articles/race_detector) (5–10× memory, 2–20× time)
- [securego/gosec RULES.md](https://github.com/securego/gosec/blob/master/RULES.md) and [securego/gosec#1187](https://github.com/securego/gosec/issues/1187) (G103, G204, G304, G7xx; G115 ignores bounds checks)
- [mgechev/revive RULES_DESCRIPTIONS.md](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md) (`exported`, `time-equal`; no built-in `internal/` exclusion)
- [go-simpler/sloglint README](https://raw.githubusercontent.com/go-simpler/sloglint/master/README.md) (`no-global: "all"` vs `"default"`)
- [golangci/golangci-lint#4623](https://github.com/golangci/golangci-lint/issues/4623) (govulncheck is not a golangci linter)
- [go.dev/blog/generate](https://go.dev/blog/generate) (the generated-code marker)
- [kisielk/errcheck README](https://raw.githubusercontent.com/kisielk/errcheck/master/README.md) (the `(pkg.Receiver).Method` exclude syntax; declared-type matching measured in [C-15])
- [polyfloyd/go-errorlint README](https://raw.githubusercontent.com/polyfloyd/go-errorlint/master/README.md) (fixes are "still under development… may cause more harm than good")
- [pkg.go.dev/sync#WaitGroup.Go](https://pkg.go.dev/sync#WaitGroup.Go) (go1.25) and [x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup): the wrappers vet's `testinggoroutine` cannot see through

## Revision log

- 2026-09-26, initial consolidation of [GC] and [CMD].
- 2026-09-26, revision folding in [CR]:
  - GO-GATE-09 config: **removed `std-error-handling`** from `exclusions.presets`, because GO-ERR-09 forbids it (wave-2 map contradiction 1). The earlier text overclaimed: the preset had hidden two real errcheck findings in this file's own CLI twin [C-14].
  - GO-GATE-09 config: added `errcheck.exclude-functions: [(io.ReadCloser).Close]` and `nilnil.checked-types` without `map` (GO-ERR-12, CR-10). Replaced `depguard.superseded` with GO-MOD-08's 11 entries on `files: ["$all"]` (CR-11).
  - GO-GATE-09 rule text: anchored preset grep added, because GO-ERR-09's unanchored grep went red on a comment [C-16].
  - GO-GATE-13 became a citation row pointing to GO-MOD-08 and GO-TEST-02. The ID and its MUST status are kept.
  - GO-GATE-18 gained the foreign-enum `exhaustive` clause ([CR] §4); `cligood`'s two baseline errcheck findings are recorded as fixture debt [C-14].
  - GO-GATE-01 states the matrix split (wave-2 map contradiction 14).
  - New GO-GATE-20 (MUST): the errcheck exemption is exactly `(io.ReadCloser).Close` [C-15].
  - New GO-GATE-21 (MUST): the unattended `--fix` allowlist (CR-12..CR-14).
  - Admission evidence gained errcheck without the preset, errorlint including caddy, and the CLI overlay on four CLIs.
  - Verdict 5, 6, 8, 9 updated; Verdict 10 and 11 new. Open questions and AI-agent failure modes 14–18 updated.
- 2026-09-26, revision folding in [CA] (wave 4, config assembly) and the wave-3 map contradictions that target this file:
  - **GO-GATE-09: overclaim fixed.** The rule allowed `presets: [comments, common-false-positives]`. That preset silently deletes every G103 and G204 finding ([C-21]) and breaks GO-SEC-01's reasoned G204 suppression (CA-3). The text now says `[comments]` only and bans `common-false-positives` in every file. The anchored grep covers both presets, and the config block was re-quoted from the assembled file ([C-26]). Map contradiction 1.
  - GO-GATE-14: `excludes` is now `G104`, `G115`, `G304` (map contradiction 2). The G304 exclusion is watched as load-bearing [C-20], and the gap it opens is added to Verdict 11.
  - GO-GATE-15: the revive list is now three rules (adds `time-equal`, GO-LANG-07), four in the library/SDK file (adds `exported`), and any file that adds a rule repeats the whole list (map contradiction 3). New watched cells: CA-5 and [C-23].
  - GO-GATE-13: the citation row now covers 12 `superseded` entries (GO-OBS-06's automaxprocs) and GO-OBS-01's `logging` rule, in all three files (map contradiction 5; CA-8, CA-9).
  - GO-GATE-18: it now names the complete `cli.golangci.yml`, says CLIs never take the library/SDK file (owner default), and re-watches under the assembled file [C-18].
  - GO-GATE-02 and GO-GATE-01: the vet count is corrected from "11 of 36" to **12 of 35** on Go 1.27.1 [C-25] (map contradiction 15). [CA] §9 claimed GO-GATE-02 already carried the corrected pair; it did not, and this revision fixes it. GO-GATE-01 now also requires test-helper and tools modules ([CA] §10).
  - GO-GATE-20: the read-only-close remedy is now GO-ERR-08's `errors.Join` shape, with the nolint as fallback only where no error result exists (map contradiction 9). The read-only-close analyzer question is rejected and removed from Open questions.
  - **New GO-GATE-22 (MUST):** three complete files, copied whole, overlay ⊇ baseline, no pasted YAML in sibling families (map contradiction 6). It adds a superset check, because `config verify` passes a fragment [C-23].
  - **New GO-GATE-23 (MUST, SDK and library):** the library/SDK file, with `presets: []` (watched: `comments` silences its doc checks [C-19]), `no-global` only there (CA-6/CA-7, [C-24]), `exhaustive` in both overlays (map contradiction 7), and the overlay census that closes map contradiction 22.
  - **[CA] corrected in two places:** QF1009 is blocking, not a hint [C-22] (new Verdict 12). The unanchored `common-false-positives` grep [CA] proposed false-reds on the assembled files' comments, so the anchored form replaces it [C-24].
  - Verdict 1, 2, 5, 6, 8, 9 and 11 updated; Verdict 12 new. The admission evidence gained the gosec roster row, the CLI G204 column and the library/SDK census.
  - AI-agent failure modes: the old 12 (G101 "package scope only") is corrected to point at GO-SEC-08 (map contradiction 10), now 14. New: 3 (`common-false-positives`), 5 (fragment overlay), 18 (`no-global` placement), 19 (`comments` in the library file), 23 (`internal/`-inflated counts). The old 11 (now 13) is extended to multi-module roots, and the old 18 (now 22) to both presets. The list was renumbered by rank; failure-mode numbers are not rule IDs.
  - Open questions: removed ST1000 vs revive `exported` (answered by GO-GATE-23), SDK `exhaustive` (answered by GO-GATE-23 and map contradiction 7), and the read-only-close analyzer (rejected). The `--fix` widening moved to residue, and [CA]'s `ireturn` allowlist and `internal/` exclusion were added there. The go-upgrade bump procedure now also runs the superset check and the QF1009 probe.

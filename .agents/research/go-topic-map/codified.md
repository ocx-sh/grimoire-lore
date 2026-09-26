---
title: Go codified practice — the enforced-rule catalogues
corpus: codified practice (analyzers, linters, checks, style guides — rules someone thought worth enforcing)
agent: scout (codified)
model: sonnet
date_researched: 2026-09-26
sources_count: 22
scope: >
  Covers the complete, fetched-not-recalled catalogues of go vet (36 analyzers),
  modernize (26 shipped + 4 excluded), gopls's own analyzer set, staticcheck
  (159 checks across SA/S/ST/QF), golangci-lint v2.14.0's full roster (5
  standard + ~90 opt-in + 3 deprecated), gosec (G1xx-G7xx, ~70 rules), revive
  (105 rules), go-critic (~100 checkers, 6 tags), the Uber Go Style Guide, a
  CodeQL Go query sample, govulncheck's modes, and Go 1.24-1.27 release notes
  read for the tool-relevant deltas. Does NOT cover: idiomatic-but-uncodified
  patterns with no enforcing tool (that is the "uncodified" scout's job), deep
  per-repository measurement of which checks actually fire in the exemplar
  corpus (that is the grounding wave), or generic CI/docs/Bazel-core material
  already owned by the sibling lore sets.
---

# Go codified practice — topic map

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- `go vet` (Go 1.27.1) registers exactly 36 analyzers by name; `go test` runs
  only an 11-analyzer high-confidence subset (`atomic, bools, buildtag,
  directive, errorsas, ifaceassert, nilfunc, printf, stdversion,
  stringintconv, tests`) — the other 25, including `composites`, `copylocks`,
  `defers`, `loopclosure`, `lostcancel`, `shift`, `unreachable`,
  `unusedresult`, `waitgroup`, only run under an explicit `go vet ./...`.
- `modernize` (golang.org/x/tools, bundled into `go fix` since Go 1.26) ships
  26 analyzers in its `Suite` and explicitly excludes 4 more
  (`AppendClippedAnalyzer`, `BLoopAnalyzer`, `FmtAppendfAnalyzer`,
  `SlicesDeleteAnalyzer`) for correctness or behavior-change reasons the
  source comments name.
- staticcheck 2026.2.1 defines 159 checks: 96 `SA` (bugs), 35 `S` (simplify),
  17 `ST` (style), 11 `QF` (quickfix). Exactly 7 are non-default:
  `SA9003`, `ST1000`, `ST1003`, `ST1016`, `ST1020`, `ST1021`, `ST1022`.
- The newest staticcheck check, `SA9010` ("Returned function should be
  called in defer"), shipped in 2026.2 — new enough that no blog post or
  training-data-era guide documents it yet.
- golangci-lint v2.14.0's "standard" default group is exactly 5 linters:
  `errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`. Everything
  else — `errorlint`, `gosec`, `revive`, `bodyclose`, `contextcheck`,
  `copyloopvar`, `wrapcheck`, ~90 more — is opt-in.
- gosec's rule set has grown well past the classic G1-G602 AST checks:
  current gosec adds SSA-based `G113`-`G124` and a full `G7xx` taint-analysis
  suite (SQL/command/path/SSRF/XSS/log/SMTP/SSTI/deserialization/redirect).
  Two IDs are retired or reassigned: `G105` (retired) and `G307` (its old
  meaning — deferred-Close-error auditing — was dropped; the ID now means
  file-creation permissions).
- revive ships 105 named rules; go-critic ships ~100 checkers grouped into 6
  tags, three of which are off by default (`#experimental`, `#opinionated`,
  and `#security`, the last documented as "disabled by default and empty" —
  go-critic defers security checking to gosec entirely.
- The error-handling linter trio — `errorlint`, `wrapcheck`, `nilerr` /
  `nilnil` — each catch a different shape of the same H2 surface: unwrapped
  `%v` vs `%w`, unwrapped external errors, and "checked non-nil error but
  returned nil anyway." None of the three subsumes another.
- `errorlint`'s own `-errorf` check (catching `fmt.Errorf("...: %v", err)`)
  ships **off by default in the tool itself** — even the linter author
  treats aggressive wrap-enforcement as opt-in.
- `contextcheck` (non-inherited context) and `containedctx` (context stored
  in a struct field) are opposite-direction checks for the same context-
  discipline surface (H2/H3); the fleet needs both, not either.
- No tool in this corpus checks atomic file writes (temp-file-then-rename),
  Windows path-separator misuse, or deterministic map-iteration output —
  these are real, checked-in-the-wild bugs with zero lint coverage in any
  catalogue surveyed; they must be authored as review-only or custom rules.
- `govulncheck` (from golang/vuln) documents three `-mode` values (`source`,
  `binary`, `extract`) and three `-scan` levels (`module`, `package`,
  `symbol`); default is `-scan=symbol` source-mode reachability analysis —
  relevant twice for this fleet: once for future first-party Go source, once
  for `-mode=binary` auditing of mirrored upstream Go release binaries.
- Go 1.24-1.27 moved real ground under lint/vet expectations: `go test` now
  runs `stdversion` by default (1.27); `go fix` was completely revamped into
  "the home of Go's modernizers" plus a `//go:fix inline` source inliner
  (1.26); `vet`'s `copylock` gained a 3-clause-for-loop `sync.Locker` check
  and `printf` gained a non-constant-format-with-no-args check (1.24).
- The Uber Go Style Guide's "Errors" section splits into four sub-rules —
  Error Types, Error Wrapping, Error Naming, **Handle Errors Once** — and
  the last of those (never both log AND return the same error) has no
  mechanical linter enforcing it in this entire corpus; it is guide-only.
- Uber's guide still recommends `go.uber.org/atomic`, while `modernize`'s
  `atomictypes` analyzer actively rewrites code *toward* `sync/atomic`'s
  typed atomics (`atomic.Int64` etc., stdlib since Go 1.19) — a live
  contradiction between a widely-cited style guide and the newest official
  tooling.
- CodeQL's Go query pack includes security queries with direct gosec
  overlaps (Zip Slip, SQL/command injection, weak crypto, disabled TLS
  verification) and several with **no** gosec equivalent in this corpus
  (missing JWT signature check, incomplete regex for hostnames, impossible
  interface-nil-check, wrapped-error-always-nil).
- Bazel-for-Go (`nogo` under `rules_go`) is a real surface this corpus did
  not fully resolve: whether `nogo`'s default analyzer set matches `go vet`'s
  or is a narrower Bazel-maintained subset is a follow-up, not answered here.

## Survey

### 1. `go vet` analyzer registry (Go 1.27.1)

Run via `/home/mherwig/.cache/research-lang/go-tools/run.sh go tool vet help`
against the installed Go 1.27.1 toolchain — this is the tool itself, not a
web summary. `go vet` registers exactly these 36 analyzers: `appends`,
`asmdecl`, `assign`, `atomic`, `bools`, `buildtag`, `cgocall`, `composites`,
`copylocks`, `defers`, `directive`, `errorsas`, `framepointer`, `hostport`,
`httpresponse`, `ifaceassert`, `loopclosure`, `lostcancel`, `nilfunc`,
`printf`, `shift`, `sigchanyzer`, `slog`, `stdmethods`, `stdversion`,
`stringintconv`, `structtag`, `testinggoroutine`, `tests`, `timeformat`,
`unmarshal`, `unreachable`, `unsafeptr`, `unusedresult`, `waitgroup`. All run
by default under a bare `go vet ./...`; individual ones can be disabled with
`-NAME=false`. Two Go-1.27-era additions stand out: `hostport` (checks
address strings passed to `net.Dial`) and `waitgroup` (misuse of
`sync.WaitGroup`) are recent enough that they postdate most existing
training-era advice. Separately, [pkg.go.dev's Testing flags
doc](https://pkg.go.dev/cmd/go#hdr-Testing_flags) states `go test` only runs
a "high-confidence subset" — `atomic, bools, buildtag, directive, errorsas,
ifaceassert, nilfunc, printf, stdversion, stringintconv, tests` (11 of the
36) — before executing tests, controllable via `-vet=off` / `-vet=all`. That
leaves `composites`, `copylocks`, `defers`, `loopclosure`, `lostcancel`,
`shift`, `unreachable`, `unusedresult`, and `waitgroup` invisible to `go
test` alone.

### 2. `modernize` — golang.org/x/tools go/analysis/passes/modernize

Read directly from the exemplar clone
`golang__tools@d2d3de9f066e:go/analysis/passes/modernize/modernize.go` and
`doc.go` (the tool's own source, not a summary). `doc.go` states the suite's
intent: "these fixes may be safely applied en masse without changing the
behavior of your program," and that "Since Go 1.26, the `go fix` command has
included the modernize suite" — `go fix ./...` now applies all of them.
`modernize.go`'s `var Suite = []*analysis.Analyzer{...}` lists exactly 26
shipped analyzers (`AnyAnalyzer`, `AtomicTypesAnalyzer`, `EmbedLitAnalyzer`,
`ErrorsAsTypeAnalyzer`, `ForVarAnalyzer`, `importCommentAnalyzer`,
`MapsLoopAnalyzer`, `MinMaxAnalyzer`, `NewExprAnalyzer`, `OmitZeroAnalyzer`,
`PlusBuildAnalyzer`, `RangeIntAnalyzer`, `reflectTypeAssertAnalyzer`,
`ReflectTypeForAnalyzer`, `slicesBackwardAnalyzer`, `slicesClipAnalyzer`,
`SlicesContainsAnalyzer`, `SlicesSortAnalyzer`, `StdIteratorsAnalyzer`,
`StringsCutAnalyzer`, `StringsCutPrefixAnalyzer`, `StringsSeqAnalyzer`,
`StringsBuilderAnalyzer`, `TestingContextAnalyzer`, `unsafeFuncsAnalyzer`,
`WaitGroupGoAnalyzer`) and names 4 more it deliberately excludes, with
reasons in the source comment: `AppendClippedAnalyzer` ("not nil-preserving"),
`BLoopAnalyzer` ("may skew benchmark results, see golang/go#74967"),
`FmtAppendfAnalyzer` ("makes code less clear, see golang/go#77581"),
`SlicesDeleteAnalyzer` ("not nil-preserving").

### 3. gopls's own analyzer additions

Enumerated from the local exemplar directory listing under
`golang__tools@d2d3de9f066e:gopls/internal/analysis/*` — analyzers that ship
with gopls but are not part of `go vet` or `modernize`: `deprecated`,
`embeddirective`, `errorsastypeshadow`, `fillreturns`, `fillstruct`,
`fillswitch`, `infertypeargs`, `maprange`, `nonewvars`, `noresultvalues`,
`ptrtoerror`, `recursiveiter`, `simplifycompositelit`, `simplifyrange`,
`simplifyslice`, `unusedfunc`, `unusedparams`, `unusedvariable`,
`writestring`, `yield`. Cross-checked against
[go.dev/gopls/analyzers](https://go.dev/gopls/analyzers), which additionally
confirms gopls carries its own copy of every staticcheck `QF`/`S`/`SA`/`ST`
check with **gopls-specific** default on/off flags that sometimes diverge
from staticcheck's own CLI defaults (e.g. gopls defaults `SA1000`,
`SA1002`, `SA1003` off while the staticcheck binary itself defaults them on
per the source read in §5) — a rule authored from one tool's defaults will
misdescribe the other.

### 4. golangci-lint v2.14.0 — installed roster and config model

`golangci-lint --version` confirms `2.14.0 built with go1.27.1`.
`golangci-lint help linters` (the installed binary, not docs) lists exactly
5 linters "Enabled by default": `errcheck`, `govet`, `ineffassign`,
`staticcheck`, `unused`. It then lists ~90 "Disabled by default" linters
including every tool named in the task brief (`bodyclose`, `contextcheck`,
`containedctx`, `copyloopvar`, `errorlint`, `exhaustive`, `forcetypeassert`,
`gocritic`, `gosec`, `intrange`, `nilerr`, `nilnil`, `noctx`, `paralleltest`,
`perfsprint`, `protogetter`, `revive`, `rowserrcheck`, `sloglint`,
`spancheck`, `sqlclosecheck`, `testifylint`, `tparallel`, `thelper`,
`unparam`, `usetesting`, `wrapcheck`), and 3 explicitly `[deprecated]`:
`exhaustruct` (→ `exhaustruct_v5`), `gomodguard` (→ `gomodguard_v2`), `wsl`
(→ `wsl_v5`). Read directly from the golangci-lint exemplar source,
`golangci__golangci-lint@032d962e0399:pkg/config/linters.go`, defines the
exact config surface: `const ( GroupStandard = "standard"; GroupAll = "all";
GroupNone = "none"; GroupFast = "fast" )`, bound to the YAML key
`linters.default`. "Standard" is precisely the 5-linter default set above,
not a larger curated list as in golangci-lint v1.

### 5. staticcheck 2026.2.1 — the full check index

Extracted from the tool's own source
(`dominikh__go-tools@6cb65e58a558`) by reading every check's
`lint.Analyzer{ Doc: &lint.RawDocumentation{ Title: ..., Since: ... } }`
declaration across `staticcheck/`, `simple/`, `stylecheck/`, `quickfix/`.
159 total checks: 96 `SA` (bug-finding, categories `SA1` stdlib misuse
through `SA9` dubious constructs), 35 `S` (`simple` simplifications), 17
`ST` (`stylecheck` style), 11 `QF` (`quickfix`). The website's category
template
(`dominikh__go-tools@6cb65e58a558:website/content/docs/checks.html`)
confirms the category scheme (`SA1`–`SA9`, `S1`, `ST1`, `QF1`) and that each
check's doc entry carries a `NonDefault` flag rendered as a "non-default"
badge. Exactly 7 checks carry that flag: `SA9003` ("Empty body in an if or
else branch"), `ST1000` ("Incorrect or missing package comment"), `ST1003`
("Poorly chosen identifier"), `ST1016` ("Use consistent method receiver
names"), `ST1020`/`ST1021`/`ST1022` (exported doc-comment-must-start-with-
name checks). The newest check found, `SA9010` — "Returned function should
be called in defer", `Since: "2026.2"` — is on by default and postdates
essentially all existing Go advice corpora.

### 6. gosec — rule catalogue and categories

Read from the tool's own repository files,
`securego/gosec` [README.md](https://raw.githubusercontent.com/securego/gosec/master/README.md)
and [RULES.md](https://raw.githubusercontent.com/securego/gosec/master/RULES.md)
(raw, current `master`). Categories: `G1xx` general secure coding, `G2xx`
injection patterns, `G3xx` filesystem/permissions, `G4xx` crypto/TLS, `G5xx`
import blocklist, `G6xx` language/runtime safety, `G7xx` taint analysis.
RULES.md enumerates ~70 individual IDs including newer SSA-backed rules not
present in older gosec surveys: `G113` (HTTP request smuggling), `G115`
(integer-overflow type conversion), `G116` (Trojan Source / bidi-Unicode
attacks), `G117` (secret exposure via JSON/YAML/XML/TOML marshaling), `G118`
(context-propagation failure → goroutine/resource leak), `G119`-`G124`
(unsafe redirect policy, unbounded `ParseMultipartForm`, CORS bypass,
filepath `Walk` TOCTOU, TLS resumption bypass, insecure cookie flags), and
the full `G701`-`G710` taint suite (SQL/command/path/SSRF/XSS/log/SMTP/SSTI/
deserialization/open-redirect injection). Two retirements are explicit:
"G105 is retired" (fixed CVE, [golang/go#15184](https://github.com/golang/go/issues/15184))
and "G307 (old meaning: deferred method error handling) is retired; the ID
now refers to file creation permissions" — meaning any pre-existing
knowledge that cites `G307` as "check deferred Close() errors" is now wrong.

### 7. revive — rule catalogue

Read from `mgechev/revive`
[RULES_DESCRIPTIONS.md](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md)
(raw, current `master`): 105 named `##`-level rules, alphabetically from
`add-constant` through the end of the file. Rules with no golangci-lint
built-in equivalent in this corpus: `banned-characters`, `bare-return`,
`confusing-naming`, `context-as-argument`, `context-keys-type`,
`deep-exit`, `defer` (revive's own defer-misuse rule, distinct from vet's
`defers` analyzer), `enforce-map-style`, `enforce-repeated-arg-type-style`,
`enforce-slice-style`, `enforce-switch-style`, `error-naming`,
`error-return`, `error-strings`, `file-header`, `filename-format`,
`flag-parameter`, `forbidden-call-in-wg-go`, `import-shadowing`,
`inefficient-map-lookup`, `marshal-receiver`, `package-directory-mismatch`,
`range-val-address`, `range-val-in-closure`, `receiver-naming`,
`redundant-test-main-exit`, `struct-tag`.

### 8. go-critic — checkers and tags

Read from `go-critic/go-critic`
[README.md](https://raw.githubusercontent.com/go-critic/go-critic/master/README.md)
(raw, current `master`): "Almost 100 diagnostics" across three enabled-by-
default tag groups — `#diagnostic` (bugs), `#style`, `#performance` — plus
three that must be explicitly opted in: `#experimental` ("under testing and
development. Disabled by default"), `#opinionated` ("can be unwanted for
some people. Disabled by default"), and `#security` ("kind of checks that
find security issues in code. Disabled by default **and empty**, so will
fail if enabled") — go-critic ships zero security checkers by design and
defers that surface entirely to gosec. Individual checker names are
documented at go-critic.com/overview (not fetched verbatim; the README
itself does not enumerate all ~100 by name, only by tag and count).

### 9. Uber Go Style Guide

Read from `uber-go/guide`
[style.md](https://raw.githubusercontent.com/uber-go/guide/master/style.md)
(raw, current `master`), 4107 lines. Top-level structure: `## Guidelines`
(with 20 named sub-rules including `### Pointers to Interfaces`, `###
Zero-value Mutexes are Valid`, `### Copy Slices and Maps at Boundaries`,
`### Channel Size is One or None`, `### Errors`, `### Don't Panic`, `###
Avoid Mutable Globals`, `### Exit in Main`, `### Don't fire-and-forget
goroutines`), `## Performance` (3 sub-rules: `Prefer strconv over fmt`,
`Avoid repeated string-to-byte conversions`, `Prefer Specifying Container
Capacity`), `## Style` (18 sub-rules on naming, grouping, nesting,
initialization), `## Patterns` (`Test Tables`, `Functional Options`), `##
Linting`. The `### Errors` section itself splits into four documented
sub-rules at `#### Error Types`, `#### Error Wrapping`, `#### Error
Naming`, `#### Handle Errors Once` — the last explicitly warns against
both logging and returning the same error up the stack, a pattern no linter
in this corpus mechanically catches. `### Use go.uber.org/atomic`
recommends a third-party atomic-value wrapper package predating Go's own
typed `sync/atomic` values (stdlib since Go 1.19).

### 10. CodeQL Go query pack

Read from [codeql.github.com/codeql-query-help/go/](https://codeql.github.com/codeql-query-help/go/),
GitHub's own query-help index. 56 distinct queries enumerated, split into
security (35, each with an informal vulnerability class — Zip Slip, SSRF
"uncontrolled data used in network request", command/SQL/XPath injection,
log injection, missing JWT signature check, disabled TLS certificate check,
weak crypto/hashing/randomness, open redirect, cross-site scripting,
information exposure via stack trace, cookie Secure/HttpOnly flags) and
correctness/maintainability (21 — duplicate branches/conditions, off-by-one
length comparisons, "wrapped error is always nil", missing error check,
redundant `recover()`, self-assignment, unreachable statement, impossible
interface-nil-check). Overlaps with gosec: Zip Slip (gosec `G305`), command
injection (`G204`/`G702`), SQL injection (`G201`/`G202`/`G701`), weak crypto
(`G401`/`G405`/`G406`), disabled TLS check (`G402`). CodeQL-only in this
sample, no gosec counterpart found: missing JWT signature check, incomplete
regular expression for hostnames, impossible interface-nil-check,
"wrapped error is always nil."

### 11. govulncheck modes and scan levels

Read from the installed binary's own `-h` output
(`/home/mherwig/.cache/research-lang/go-tools/run.sh govulncheck -h`, golang/vuln
current build) — the tool's own interface, primary source. Three `-mode`
values: `source` (default — analyzes source), `binary` (scans a compiled
binary, `-mode=binary [flags] [binary]`), `extract` (used internally). Three
`-scan` levels: `module`, `package`, `symbol` (default `symbol` — the
finest-grained reachability analysis, matching only vulnerabilities in
functions transitively called from the module's own code). Other
documented flags: `-db url` (default `https://vuln.go.dev`), `-format`
(`text`/`json`/`sarif`/`openvex`), `-show` (`traces,color,version,verbose`),
`-test` (include test files, source mode only), `-C dir`.

### 12. Individual golangci-lint sub-linters — behavior notes

Read from each linter's own repository README (raw, current `master`):
- [errcheck](https://raw.githubusercontent.com/kisielk/errcheck/master/README.md):
  checks for unchecked error return values; ships a default exclude list for
  common no-error-of-interest calls.
- [errorlint](https://raw.githubusercontent.com/polyfloyd/go-errorlint/master/README.md):
  three checkable shapes — (1) non-wrapping `%v` in `fmt.Errorf` (the
  `-errorf` check, **disabled by default**, fixable but the tool warns
  "the behavior is not yet stable"), (2) direct `err == ErrFoo` comparisons
  that should be `errors.Is`, (3) error type assertions that should be
  `errors.As`.
- [wrapcheck](https://raw.githubusercontent.com/tomarrell/wrapcheck/master/README.md):
  flags returning an error from an external package without wrapping it;
  ships a default `ignoreSigs` list — `.Errorf(`, `errors.New(`,
  `errors.Unwrap(`, `errors.Join(`, `.Wrap(`, `.Wrapf(`, `.WithMessage(`,
  `.WithMessagef(`, `.WithStack(` — configurable via `.wrapcheck.yaml`'s
  `ignoreSigs` (replaces the default) or `extraIgnoreSigs` (extends it).
- [bodyclose](https://raw.githubusercontent.com/timakin/bodyclose/master/README.md):
  static analysis (usable as a `go vet -vettool`) checking `res.Body` is
  closed; a `-check-consumption` flag additionally verifies the body is
  read, not just closed; a `//bodyclose:handled` directive marks a helper
  function as fully handling every response body it returns.

## Candidate topics

| Topic (question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|
| Which `go vet` analyzers does `go test` skip (`composites`, `copylocks`, `defers`, `loopclosure`, `lostcancel`, `shift`, `unreachable`, `unusedresult`, `waitgroup`, +16 more) that only an explicit `go vet ./...` or lint gate catches? | An agent that trusts `go test`'s green result alone misses 25 of 36 registered analyzers, including the ones that catch concurrency and composite-literal bugs. | [pkg.go.dev/cmd/go](https://pkg.go.dev/cmd/go#hdr-Testing_flags) | no | toolchain/lint | P0 |
| Which golangci-lint v2 linters are in the 5-linter `standard` default and which high-value ones must be explicitly enabled (`errorlint`, `bodyclose`, `contextcheck`, `copyloopvar`, `gosec`, `revive`, `wrapcheck`, `testifylint`)? | The default is far narrower than most agents assume; a `.golangci.yml` written from memory undershoots. | golangci-lint `help linters` (own binary) | no | lint | P0 |
| Which golangci-lint linters are marked `[auto-fix]` (govet, staticcheck, gocritic, modernize, errorlint, testifylint, copyloopvar, intrange, usestdlibvars, usetesting, sloglint, protogetter, mirror, dupword, godot, wsl_v5) and should any run unattended in CI vs review-gated? | Auto-fix changes code without a human; an autonomous fleet needs an explicit allow-list, not "auto-fix is available." | golangci-lint `help linters` | no | lint | P1 |
| Which staticcheck checks are non-default (`SA9003`, `ST1000`, `ST1003`, `ST1016`, `ST1020`-`ST1022`) and should any be turned on for an LLM-authored codebase (e.g. package-comment enforcement)? | Non-default checks are invisible unless a config explicitly enables them; the rule must decide, not inherit silence. | dominikh/go-tools source (own repo) | no | lint | P1 |
| What does the new `SA9010` ("returned function should be called in defer", staticcheck 2026.2) catch, and how often does an LLM write a cleanup-factory function and forget to defer-call it? | Brand-new check with zero training-era coverage; worth a planted-fixture test. | dominikh/go-tools source | no | lint/resource cleanup | P1 |
| Which 4 modernize analyzers are excluded from the shipped Suite (`AppendClipped`, `BLoop`, `FmtAppendf`, `SlicesDelete`) and why, per the tool's own source comments? | Distinguishes "modernize is safe to run unattended" from "modernize has known correctness carve-outs." | golang/tools source (own repo) | no | lang/lint | P1 |
| Should the rule mandate `go fix ./...` (modernize built in since Go 1.26) as a CI step, given the tool's own doc admits fixes can be "imperfect"? | Direct test of H1 (pre-1.21-idiom cleanup) against the tool's own caveats. | golang/tools `doc.go` | no | toolchain | P1 |
| Which gopls-only analyzers (`fillstruct`, `fillswitch`, `unusedparams`, `simplifyrange`, `infertypeargs`, `recursiveiter`, `yield`, `errorsastypeshadow`, …) never run under `go vet` or `golangci-lint`, and does that matter for a fleet with no editor/LSP session? | If nothing in CI ever invokes gopls, ~20 analyzers are structurally unreachable regardless of rule content. | go.dev/gopls/analyzers + golang/tools source | no | toolchain/lint | P2 |
| Which gosec rule IDs are SSA/taint-based (`G113`, `G115`-`G124`, `G701`-`G710`) vs classic AST, and does the fleet's toolchain build gosec with the analyzer capability those need? | An older/lighter gosec build silently skips the newest and most dangerous-class rules (request smuggling, TOCTOU, SSRF). | securego/gosec RULES.md (own repo) | no | security/lint | P1 |
| `G105` retired and `G307`'s meaning reassigned (was "deferred Close error," now "file creation permissions") — does any inherited advice still cite the old `G307`? | A rule authored against stale gosec knowledge actively misdirects reviewers. | securego/gosec RULES.md | no | security | P2 |
| Where does revive add coverage golangci-lint's built-ins don't (`banned-characters`, `enforce-map-style`, `forbidden-call-in-wg-go`, `redundant-test-main-exit`, `range-val-in-closure`)? | Justifies (or not) paying revive's own config-and-noise cost on top of the default 5. | mgechev/revive RULES_DESCRIPTIONS.md (own repo) | no | lint | P1 |
| Which go-critic tags should the rule enable, given `#security` is documented as "disabled by default and empty" (go-critic defers entirely to gosec)? | Prevents a rule from assuming go-critic covers security when it explicitly does not. | go-critic/go-critic README (own repo) | no | lint/security | P1 |
| Does `errcheck`'s default exclude list already cover ignored deferred-`Close()` errors, or is `bodyclose` + `sqlclosecheck` + `rowserrcheck` still required for HTTP/DB-specific leak shapes? | Resource cleanup is an explicitly named "boring but bites" surface; overlap analysis avoids redundant config. | kisielk/errcheck + timakin/bodyclose READMEs (own repos) | no | resource cleanup/lint | P0 |
| What exactly does `wrapcheck`'s default `ignoreSigs` exempt (`.Errorf(`, `errors.New(`, `.Wrap(`, …), and does the OCX SDK's own error types need an `extraIgnoreSigs` entry? | Directly shapes the rule's error-wrapping convention (H2) and its lint config. | tomarrell/wrapcheck README (own repo) | no | errors/lint | P0 |
| `errorlint`'s `-errorf` check ships off by default in the tool itself — should the fleet's rule turn on what the tool's own author treats as opt-in? | A deliberate policy decision, not a default to inherit uncritically. | polyfloyd/go-errorlint README (own repo) | no | errors/lint | P0 |
| What do `nilerr` and `nilnil` catch (checked-non-nil-err-but-returned-nil; simultaneous `nil, nil` return), and how common is the `(nil, nil)` "no error no result" idiom in Go vs other languages' `None, None`? | Named in the brief as a characteristic LLM mistake surface. | golangci-lint roster (own binary) | no | errors/lang | P0 |
| Does `contextcheck` (non-inherited context) and `containedctx` (context in a struct field) together cover the full context-discipline surface (H2/H3), or is one direction still a gap? | Two linters check opposite failure shapes of the same discipline; the rule needs both. | golangci-lint roster | no | concurrency/context | P0 |
| What does `noctx` require (HTTP calls built with `context.Context`, e.g. `http.NewRequestWithContext` not `http.Get`), and does it match the OCX SDK's stdlib-only HTTP convention already used in `ocx-sdk-python`'s analogue? | Directly informs the Go SDK's HTTP layer design, not just its lint config. | golangci-lint roster | no | http/context | P0 |
| Does `copyloopvar` or `intrange` risk mis-rewriting code in a module whose `go` directive is below 1.22 (pre-per-iteration-loop-variable semantics)? | Auto-fix linters interacting with a language-version boundary is a correctness trap, not a style nit. | golangci-lint roster + go.dev/doc/go1.22 (loop var change) | no | lang/lint | P1 |
| Are `paralleltest`/`tparallel`/`thelper` all three appropriate for a fleet writing mostly small sequential unit tests, or is enabling all three lint-noise for this project shape? | Prevents over-adopting a linter trio calibrated for large parallel test suites. | golangci-lint roster | no | testing/lint | P2 |
| Does `usetesting`'s replacement set (`os.MkdirTemp`→`t.TempDir()`, `context.Background()`→`t.Context()`) depend on the fleet's stdlib-vs-testify decision (H5)? | Testify-style tests may not have a `*testing.T` in scope at the call site the linter expects. | golangci-lint roster | no | testing/lint | P1 |
| What exactly does `perfsprint` flag (`fmt.Sprintf("%d", x)` → `strconv.Itoa(x)`), and does it matter for a CLI (the OCX CLI's list/status formatting) at realistic output volumes? | Distinguishes cosmetic churn from a perf win worth gating on. | golangci-lint roster | no | perf/cli | P2 |
| What does `sloglint` enforce for `log/slog` calls (static keys, matched key-value pairs, no duplicate keys), and does it conflict with dynamic structured-error key patterns? | H7 names `log/slog` as the likely fleet default logger; this linter is its lint-time contract. | golangci-lint roster | no | stdlib/observability | P1 |
| Is `spancheck` (OpenTelemetry span hygiene) relevant at all if fleet Go code never imports `go.opentelemetry.io`, and should the rule gate it on that import rather than enable it unconditionally? | Avoids shipping a rule for a dependency the fleet doesn't use yet. | golangci-lint roster | n/a — applicability gate | observability | P3 |
| Is `protogetter` (use generated proto getters) applicable at all absent protobuf, and same applicability-gate question as spancheck? | Same pattern — dependency-gated linter, not universal. | golangci-lint roster | n/a — applicability gate | any | P3 |
| Does `exhaustive` (enum-switch exhaustiveness) interact well with the fleet's likely typed-const-block "enum" idiom, and should new cases in a switch fail CI by default? | Determines whether adding a new typed-const value becomes a hard CI gate everywhere it's switched on. | golangci-lint roster | no | lang/lint | P1 |
| What does `forcetypeassert` flag (`x.(T)` without `, ok`), and are there call sites (post type-switch, post error-check) where the single-value form is provably safe and the default is a false positive? | Distinguishes "always require `, ok`" from "know when it's provably redundant," which matters for review-fatigue. | golangci-lint roster | no | lang/lint | P1 |
| Do `wrapcheck` and `errcheck` overlap (unwrapped-but-checked vs unchecked-entirely), or are they orthogonal enough that both are needed with no redundant noise? | Prevents double-reporting the same line under two linters in the authored rule's examples. | kisielk/errcheck + tomarrell/wrapcheck READMEs | no | errors/lint | P2 |
| Which CodeQL Go security queries have zero gosec equivalent (missing JWT signature check, impossible interface-nil-check, incomplete hostname regex, "wrapped error is always nil")? | Documents the gap the fleet's rule set should still name even without running CodeQL itself. | codeql.github.com Go query index | no | security | P1 |
| Does CodeQL's "wrapped error is always nil" query catch a distinct bug from staticcheck `SA9010`/`nilerr`, or the same shape restated? | Avoids citing three sources for one bug pattern, or missing that they're actually different. | codeql.github.com + dominikh/go-tools | no | errors | P2 |
| What do Uber's four `### Errors` sub-rules (Types, Wrapping, Naming, **Handle Errors Once**) require, and does any linter in this corpus mechanically enforce "Handle Errors Once"? | "Handle Errors Once" (never both log and return) has zero mechanical coverage found — a pure guide/review rule. | uber-go/guide style.md (own repo) | no | errors | P0 |
| Does Uber's "Copy Slices and Maps at Boundaries" rule matter for the OCX SDK's typed wrappers, and is there any mechanical check for it, or is it review-only? | Directly shapes the SDK's public API surface design (aliasing caller-owned backing arrays). | uber-go/guide style.md | no | api-design/sdk | P1 |
| Does Uber's "Channel Size is One or None" and "Don't fire-and-forget goroutines" map onto a mechanical check (`go vet`'s `waitgroup` analyzer, or none), or is it review-only for CLI fan-out (H3)? | Concurrency-lifetime discipline for goroutines a CLI spawns during fan-out work. | uber-go/guide style.md + go tool vet help | no | concurrency | P0 |
| What does the Go 1.24 `copylock` enhancement (3-clause-for-loop `sync.Locker` variable) catch, and is it still relevant now range-loop vars are per-iteration since 1.22? | Distinguishes a still-live vet enhancement from an idiom the language itself already fixed. | go.dev/doc/go1.24 | no | concurrency/lang-version | P1 |
| Does `go test`'s 1.24 `tests` analyzer (malformed Test/Benchmark/Example signatures) catch an LLM writing a test function with a wrong signature that silently never runs? | A specific, checkable LLM-diff failure mode named in the brief's spirit ("characteristic mistakes"). | go.dev/doc/go1.24 | no | testing | P1 |
| What reachability semantics does `govulncheck -scan=symbol` (default) use vs `-scan=package`/`-scan=module`, and which should a release-gate CI job use to avoid false "vulnerable" flags on unreachable code? | Directly informs the release-gate rule's exact command line, not just "run govulncheck." | golang/vuln `govulncheck -h` (own binary) | no | security/release | P0 |
| Does `govulncheck -mode=binary` matter separately for auditing mirrored upstream Go release binaries (`ocx-mirror`'s job) vs `-mode=source` for future first-party code? | Two distinct fleet use cases named directly in the frame (H8, artifact set). | golang/vuln `govulncheck -h` | no | security/release | P0 |
| Does Go 1.27's `stdversion` vet check (now run by `go test` by default) surface a `go.mod`-version/stdlib-symbol mismatch without a separate check? | A free correctness signal the fleet gets automatically once on Go 1.27 — worth documenting so no one re-implements it. | go.dev/doc/go1.27 | no | toolchain/modules | P1 |
| What exactly changed in `go mod tidy` for `go 1.27`+ modules (auto-merges duplicate require blocks, at most two: direct/indirect)? | Simplifies go.mod-hygiene advice written against older `go` directives; stale advice would now over-specify. | go.dev/doc/go1.27 | no | modules | P2 |
| Does Go 1.27's rejection of a `godebug` entry set to an old value for a removed setting (e.g. `asynctimerchan`) mean a toolchain bump must audit inherited `go.mod` godebug lines? | A concrete, mechanical migration check tied to a specific version boundary. | go.dev/doc/go1.27 | no | modules/toolchain | P1 |
| Does Go 1.26's `go fix` revamp (source-level inliner via `//go:fix inline`) give the fleet a way to auto-migrate its OWN deprecated public API for downstream callers? | Directly actionable for the future OCX SDK's own deprecation timeline. | go.dev/doc/go1.26 | no | api-design/deprecation | P1 |
| Is `SA6003` (converting a string to `[]rune` before ranging; default-off) worth turning on given CLI output must handle non-ASCII repo/package names? | Names the encoding/byte-vs-rune "boring but bites" surface with a specific, checkable default-off rule. | go.dev/gopls/analyzers (staticcheck defaults table) | no | encoding/i18n | P1 |
| Is there ANY codified check for `filepath` (OS-aware) vs `path` (always-`/`) misuse, or Windows separator/case-sensitivity bugs, across vet/staticcheck/gosec/revive/CodeQL surveyed here? | If the answer is "no coverage anywhere in this corpus," that's a real, citable gap the rule must close itself. | vet+staticcheck+gosec+revive+CodeQL surveys above | no — apparent lint gap | fs/windows | P0 |
| Is there ANY codified check for deterministic CLI output despite Go's randomized map-iteration order (`SA1029` is unrelated — context keys, not iteration order)? | Same shape: a real bug class (nondeterministic diffs/snapshots) with apparently zero lint coverage in this survey. | staticcheck check index (no matching check found) | no — apparent lint gap | determinism/cli | P0 |
| Does `SA5001` ("deferring Close before checking for a possible error", default-on) cover the same shapes `bodyclose`/`sqlclosecheck`/`rowserrcheck` catch, or do the linters find call-site shapes SA5001 misses (Close inside a conditional, never deferred)? | Determines whether staticcheck alone already covers "boring but bites" resource cleanup or three more linters are load-bearing. | dominikh/go-tools source + golangci-lint roster | no | resource cleanup | P0 |
| Is atomic file writing (temp-file-then-`os.Rename`) checked by ANY tool in this corpus, or must the Go rule import the pattern from the fleet's existing Rust `rust-state-and-resources` "Durability and atomicity" section? | Direct test of whether a "boring but bites" pattern is codified anywhere at all vs needing cross-language import. | full corpus (no matching check found) + sibling `rust-state-and-resources.md` | partial (pattern exists in Rust set, no Go-tool enforcement) | fs/atomic-writes | P1 |
| Does `nolintlint` (ill-formed/insufficient `//nolint` directives) matter enough to require every suppression carry a linter name and reason from day one? | Lint-hygiene compounding cost; cheap to mandate before the fleet accumulates unexplained suppressions. | golangci-lint roster | no | lint hygiene | P1 |
| Is the fleet's exit-code/stream contract for a future Go CLI fully covered by mirroring the existing Rust `rust-cli-contract` exit-code table, needing only Go-syntax translation (`os.Exit(int)` for `std::process::exit`)? | Names the artifact-set overlap explicitly — avoids re-deriving a contract the fleet already owns. | sibling `rust-cli-contract.md` | yes (mirror, not re-derive) | cli | P1 |
| Does Bazel's `nogo` (under `rules_go`) run the full 36-analyzer `go vet` set by default, or a Bazel-maintained subset that needs explicit widening to match staticcheck/golangci-lint coverage? | Unresolved in this scout; a genuine follow-up for the `bazel-quality/go.md` depth file. | (unresolved — flag for dive wave) | no | bazel-go | P1 |
| Does the OCX SDK's near-zero-dependency constraint conflict with Uber's `go.uber.org/atomic` recommendation, given stdlib `sync/atomic` typed values (since 1.19) and `modernize`'s `atomictypes` analyzer both push toward stdlib-only? | A live guide-vs-tooling contradiction (see Contested) with a direct SDK-design consequence. | uber-go/guide + golang/tools `modernize` source | no | sdk/contested | P2 |

## Recent shifts seen in this corpus

- **Go 1.22 (Feb 2024)** — per-iteration loop variables and range-over-int
  removed the classic "loop variable captured by closure" bug class at the
  language level. `copyloopvar` and `intrange` (golangci-lint) exist partly
  to clean up code still written in the pre-1.22 defensive style; applying
  them to a module whose `go` directive predates 1.22 risks changing
  observable behavior — see the candidate topic above.
- **Go 1.24 (Feb 2025)** — the `tool` directive replaced blank-import
  "tools.go" tracking in `go.mod`; `os.Root` shipped for directory-confined
  filesystem access; `testing/synctest` shipped experimental
  (`GOEXPERIMENT=synctest`); `vet`'s `copylock` gained a 3-clause-for-loop
  `sync.Locker` check and `printf` gained a non-constant-format-string
  check (both per [go.dev/doc/go1.24](https://go.dev/doc/go1.24)); `go
  test` gained the `tests` analyzer for malformed test/benchmark/example
  signatures.
- **Go 1.25 (Aug 2025)** — `sync.WaitGroup.Go` shipped, removing the
  historical `Add(1)`/`Done()` mismatch bug class for the common
  fire-goroutine-and-wait pattern; no language changes; `testing/synctest`
  began graduating toward general availability.
- **Go 1.26 (Feb 2026)** — `go fix` was "completely revamped" into "the
  home of Go's modernizers," gained a source-level inliner driven by
  `//go:fix inline` directives for authors to migrate their own callers
  automatically, and had its "historical fixers, all of which were
  obsolete," removed outright (per
  [go.dev/doc/go1.26](https://go.dev/doc/go1.26)). `errors.AsType` shipped.
  `cmd/doc` was deleted in favor of `go doc`. Green Tea GC went on by
  default (`GOEXPERIMENT=nogreenteagc` to opt out).
- **Go 1.27 (Aug 2026, current)** — `go test` now runs `stdversion` by
  default; `go fix`'s modernizer set changed shape again (`atomictypes`,
  `embedlit`, `slicesbackward`, `unsafefuncs` added; `fmtappendf` removed;
  `waitgroup` renamed `waitgroupgo`); the `asynctimerchan` GODEBUG setting
  was fully removed (time-package channels are now unconditionally
  unbuffered — invalidates any lingering advice about buffered-vs-unbuffered
  `time.After`/`time.Tick` channels); a new `goroutineleak` pprof profile
  type shipped, promoted out of the `goroutineleakprofile` GOEXPERIMENT;
  `go mod tidy` for 1.27+ modules auto-merges duplicate require blocks; a
  `go.mod` with a stale `godebug` value for an already-removed setting now
  fails the build instead of silently no-opping.
- **staticcheck 2026.2** — added `SA9010` ("returned function should be
  called in defer"), a check new enough that it postdates essentially all
  existing Go advice, including this project's own frame document.
- **golangci-lint v2** (major version; installed 2.14.0) — shrank the
  always-on default set to exactly 5 linters (`errcheck`, `govet`,
  `ineffassign`, `staticcheck`, `unused`), restructured configuration around
  the `linters.default: standard|all|none|fast` key, and deprecated three
  linters in favor of `_v2`/`_v5` successors (`gomodguard`→`gomodguard_v2`,
  `wsl`→`wsl_v5`, `exhaustruct`→`exhaustruct_v5`) — any `.golangci.yml`
  authored against v1's larger implicit default set will silently under-lint
  after an upgrade.
- **gosec** — the `G7xx` taint-analysis suite and the SSA-based `G113`,
  `G115`-`G124` rules are recent enough that gosec surveys written even 2-3
  years ago stop at `G602`; half the current rule surface postdates common
  reference material. `G307`'s meaning changed entirely (see Survey §6).

## Contested

- **testify vs stdlib+go-cmp (H5)** — Google/Go-team style leans
  stdlib-plus-`go-cmp`; the newest stdlib testing surface (`t.Context()`,
  `t.Chdir()`, `usetesting`'s replacement targets) is built assuming
  stdlib-first tests, nudging the trend toward stdlib even though the wider
  ecosystem (to be measured in the grounding wave) still leans testify.
  Uber's own guide takes no explicit position either way.
- **`go.uber.org/atomic` vs stdlib `sync/atomic` typed values** — Uber's
  guide (`### Use go.uber.org/atomic`) still recommends the third-party
  wrapper, written before Go 1.19's typed atomics existed; `modernize`'s
  `atomictypes` analyzer actively rewrites code *toward* stdlib
  `sync/atomic` types. The tool is newer than the guide section citing it;
  trend favors stdlib.
- **How aggressively to enforce `%w` over `%v` at error boundaries** —
  `errorlint`'s own `-errorf` check ships off by default, signaling its
  author's own caution, while Uber's guide and the general drift of
  `errors.Is`/`errors.As`-based handling treat unwrapped `%v` as
  increasingly bug-shaped. No consensus default found in this corpus; the
  fleet's rule must pick a side rather than defer to "the linter default."
- **How much to trust `go fix`/modernize's "safe to apply en masse" claim**
  — the tool's own `doc.go` admits fixes "may be imperfect" and names 4
  analyzers excluded for correctness reasons found via real GitHub issues
  (`golang/go#74967`, `golang/go#77581`). Contested how much an autonomous
  fleet should run `-fix` unreviewed vs diff-gate every modernize
  application.
- **`(nil, nil)` return idiom** — `nilnil` treats simultaneous nil-error,
  nil-value returns as a bug; some Go APIs intentionally use that shape for
  "no error, no result found" without a sentinel value. This is itself a
  live, unresolved debate in the wider Go community (not fully surfaced by
  this scout's sources; flagged for the grounding wave to quantify against
  the exemplar corpus).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/gopls/analyzers](https://go.dev/gopls/analyzers) | go.dev's own gopls analyzer index (staticcheck + standard analyzers, with per-tool default flags) | current, 2026-09 | Primary; only place that documents gopls-specific defaults distinct from the staticcheck CLI's own defaults |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Official Go 1.27 release notes | Aug 2026 | Primary; the current release this whole program is scoped to |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Official Go 1.26 release notes | Feb 2026 | Primary; `go fix` revamp, modernizer-suite history |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | Official Go 1.25 release notes | Aug 2025 | Primary; `WaitGroup.Go`, `synctest` graduation |
| [go.dev/doc/go1.24](https://go.dev/doc/go1.24) | Official Go 1.24 release notes | Feb 2025 | Primary; `tool` directive, `os.Root`, vet enhancements |
| [pkg.go.dev/cmd/go#hdr-Testing_flags](https://pkg.go.dev/cmd/go#hdr-Testing_flags) | Official `go` command reference, testing flags section | current | Primary; the only documented source for `go test`'s default vet-analyzer subset |
| [codeql.github.com/codeql-query-help/go/](https://codeql.github.com/codeql-query-help/go/) | GitHub's own CodeQL Go query-help index | current | Primary; the tool vendor's own catalogue, not a third-party summary |
| [securego/gosec README.md](https://raw.githubusercontent.com/securego/gosec/master/README.md) | gosec's own repository README | current (`master`) | Primary; tool's own categorization and retirement notes |
| [securego/gosec RULES.md](https://raw.githubusercontent.com/securego/gosec/master/RULES.md) | gosec's own full rule list | current (`master`) | Primary; the complete G1xx-G7xx enumeration used for the survey |
| [mgechev/revive RULES_DESCRIPTIONS.md](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md) | revive's own full rule-description file | current (`master`) | Primary; 105-rule enumeration |
| [go-critic/go-critic README.md](https://raw.githubusercontent.com/go-critic/go-critic/master/README.md) | go-critic's own repository README | current (`master`) | Primary; the tag/default-status source (`#security` "disabled and empty" quote) |
| [uber-go/guide style.md](https://raw.githubusercontent.com/uber-go/guide/master/style.md) | Uber's own published Go style guide | current (`master`) | Primary; a widely-cited company style guide with a documented, sectioned structure |
| [polyfloyd/go-errorlint README.md](https://raw.githubusercontent.com/polyfloyd/go-errorlint/master/README.md) | errorlint's own repository README | current (`master`) | Primary; documents the `-errorf` check's off-by-default status directly from the author |
| [tomarrell/wrapcheck README.md](https://raw.githubusercontent.com/tomarrell/wrapcheck/master/README.md) | wrapcheck's own repository README | current (`master`) | Primary; exact default `ignoreSigs` list |
| [timakin/bodyclose README.md](https://raw.githubusercontent.com/timakin/bodyclose/master/README.md) | bodyclose's own repository README | current (`master`) | Primary; `-check-consumption` flag and `//bodyclose:handled` directive |
| [kisielk/errcheck README.md](https://raw.githubusercontent.com/kisielk/errcheck/master/README.md) | errcheck's own repository README | current (`master`) | Primary; default exclude-list behavior |
| `dominikh__go-tools@6cb65e58a558` (exemplar clone) | staticcheck's own source tree (`staticcheck/`, `simple/`, `stylecheck/`, `quickfix/`, plus the website's check-listing Hugo template) | pinned SHA, fetched 2026-09-26 | Primary; ground truth for all 159 check IDs, titles, since-versions, and non-default flags, read from the analyzer registration code itself |
| `golang__tools@d2d3de9f066e` (exemplar clone) | golang.org/x/tools source tree (`go/analysis/passes/modernize/`, `gopls/internal/analysis/*`) | pinned SHA, fetched 2026-09-26 | Primary; ground truth for modernize's exact `Suite` list, its excluded analyzers with reasons, and gopls's own analyzer directory names |
| `golangci__golangci-lint@032d962e0399` (exemplar clone) | golangci-lint's own source tree (`pkg/config/linters.go`) plus its installed binary's `--version`/`help linters` output | pinned SHA + installed 2.14.0, 2026-09-26 | Primary; exact config-key semantics (`linters.default`, the 4 group constants) straight from the source, cross-checked against the running binary |
| Go 1.27.1 toolchain (`go tool vet help`) via `/home/mherwig/.cache/research-lang/go-tools/run.sh` | The installed Go toolchain itself | installed 2026-09-26 | Primary; the actual analyzer registry of the exact Go version this program targets, not a doc page that might drift from the binary |
| `golang.org/x/vuln` govulncheck binary (`govulncheck -h`) via the same wrapper | The installed govulncheck tool itself | installed 2026-09-26 | Primary; documented modes/scan-levels read from the tool's own `-h`, not a possibly-stale web page |


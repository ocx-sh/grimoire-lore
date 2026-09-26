---
title: "The Go gate command block — vet, fix, tidy, race, govulncheck, generate, tool pinning"
topic: go-gate-commands
agent: gate-commands-dive (wave 2)
model: sonnet
date_researched: 2026-09-26
sources_count: 15
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/gate-commands/
scope: >
  Decides the ordered command block a `*.go` change must pass and what each
  command's exit status and empty output mean: `go vet`, `go fix -diff`,
  `go mod tidy -diff` / `-mod=readonly`, `go test -race`, `go generate` drift,
  `govulncheck` (text/json/sarif), and how dev tools are pinned (`tool`
  directive vs `go run pkg@version` vs a pinned binary). Does NOT decide the
  golangci-lint config itself (linter roster, FP rates, exclusions — that is
  the sibling `golangci-config` dive, family GO-GATE) or CI YAML mechanics
  beyond the flags the block needs (`setup-go`, caching — generic CI is a
  sibling lore set's job). All findings below were run against Go 1.27.1,
  golangci-lint 2.14.0, govulncheck v1.8.0, on 2026-09-26.
---

# The Go gate command block

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `go vet ./...` must run as its own step. `go test ./...` silently runs only
  11 of `go vet`'s 36 analyzers (the pkg.go.dev-documented "high-confidence
  subset"); `copylocks`, `lostcancel`, `loopclosure`, `unusedresult`,
  `waitgroup`, `hostport` and `composites` are invisible to `go test` alone —
  watched red on 7 planted fixtures below.
- If the gate of record is `golangci-lint run ./...` with `govet` in its
  default `standard` set (unmodified), that single step already subsumes a
  separate `go vet ./...` — golangci-lint 2.14.0's bundled `govet` linter
  fired on `copylocks`, `hostport` and `waitgroup` identically to bare
  `go vet`, because it is built against the same Go 1.27.1 analysis passes.
  A repo on the "Go-team shape" (bare `go vet` + `staticcheck`, no
  golangci-lint) still needs the explicit `go vet ./...` step.
- `hostport` and `waitgroup` are **Go 1.25** vet analyzers, not 1.27 — confirm
  the version before citing them. `stdversion` (which checks stdlib symbols
  against the file's Go floor) only joined `go test`'s default subset in
  **Go 1.27** — [go.dev/doc/go1.27](https://go.dev/doc/go1.27): "`go test`
  now invokes the `stdversion` vet check by default." On Go 1.26 and earlier,
  `stdversion` ran under a bare `go vet` but not automatically under
  `go test`.
- `go fix -diff ./...` exits non-zero iff it would change something, and is
  safe to gate CI on unattended: the one fixer with a documented behavior
  change (`omitzero`) does NOT apply that change by default — verified live,
  it applies the non-behavior-changing alternative (drop the ineffective
  `omitempty` on a struct field) and prints
  `fix: omitzero: ignoring alternative fix "Replace omitempty with omitzero (behavior change)"`.
  Only an explicit, separate invocation would apply the risky rewrite.
- `go mod tidy -diff ./...` exits non-zero and prints a unified diff of both
  `go.mod` and `go.sum` on a stale module; `-mod=readonly` (the build default
  since Go 1.16) then fails the build outright rather than silently mutating
  `go.mod` — both watched red on a planted missing-dependency fixture.
- `govulncheck` in **text** mode (the default) exits non-zero when a
  vulnerability is reachable — watched: exit 3 on a fixture pinning a real,
  reachable CVE (`GO-2021-0113` in `golang.org/x/text@v0.3.0`). In **json**
  or **sarif** mode it exits 0 regardless of findings — watched: exit 0 with
  the same vulnerability present in the JSON/SARIF body. A CI step using
  either structured format needs its own check of the output content;
  `govulncheck-action`'s own README states this explicitly.
- `go generate ./...` has no built-in diff check; the gate is
  `go generate ./... && git diff --exit-code` (or a CI-native
  `git status --porcelain`), and only 1/32 CI-having exemplars run it.
- Generated code is recognised by a `// Code generated ... DO NOT EDIT.` line
  **anywhere in the leading comment block**, not only on line 1: a license
  header pushes the marker down in real code (measured 15× undercount in
  `tailscale/tailscale`). A line-1-only grep silently misses it — watched red
  on a planted fixture with a 5-line license header before the marker.
  `go generate`'s own convention doc names no fixed line number.
  [go.dev/blog/generate](https://go.dev/blog/generate)
- Dev-tool pinning has three live shapes: the `tool` directive (Go 1.24+,
  4/35 exemplars), a separate tools module (`hack/tools/go.mod` in
  kubernetes), or a version-pinned `go run pkg@vX.Y.Z` / CI-cached binary
  (tailscale pins golangci-lint this way). A library's `tool` directive DOES
  add its tool's runtime dependencies to the module graph a consumer sees in
  `go list -m all` (MVS propagates ordinary `require`s regardless of why they
  were added) — watched live: a consumer importing a `tool`-carrying library
  picked up `golang.org/x/text`, `golang.org/x/mod`, `golang.org/x/sync` and
  `golang.org/x/tools` as ordinary entries in its own `go list -m all`. The
  tool's own availability under `go tool` does **not** propagate — the
  consumer's `go tool` output does not list the library's `gotext`.
- `-race` costs 5–10× memory and 2–20× execution time
  ([go.dev race detector doc](https://go.dev/doc/articles/race_detector));
  17/32 CI-having exemplars run it, none of them measured splitting it into a
  separate scheduled lane rather than every PR — the corpus default is
  "every PR, accept the cost."
- Empty output is the pass signal for `gofmt -l .`, `go vet ./...`,
  `go fix -diff ./...` (also exit 0), `go mod tidy -diff` (also exit 0), and
  `git diff --exit-code` after `go generate`. `govulncheck` in text mode
  prints "No vulnerabilities found." on a pass rather than staying silent —
  watched.
- Before trusting any version-gated row above, read the module's `go` line
  (`go list -m -f '{{.GoVersion}}'`) — `stdversion` inside `go vet` (always)
  and `go test` (only on a 1.27+ toolchain) enforces that the code does not
  use stdlib symbols newer than that floor.

## Findings

### 1. `go vet`'s 36 analyzers vs. `go test`'s 11-analyzer subset

`go tool vet help` on the installed Go 1.27.1 toolchain registers exactly 36
analyzers by name (`appends`, `asmdecl`, `assign`, `atomic`, `bools`,
`buildtag`, `cgocall`, `composites`, `copylocks`, `defers`, `directive`,
`errorsas`, `framepointer`, `hostport`, `httpresponse`, `ifaceassert`,
`loopclosure`, `lostcancel`, `nilfunc`, `printf`, `shift`, `sigchanyzer`,
`slog`, `stdmethods`, `stdversion`, `stringintconv`, `structtag`,
`testinggoroutine`, `tests`, `timeformat`, `unmarshal`, `unreachable`,
`unsafeptr`, `unusedresult`, `waitgroup`) — this repository's own
`codified.md` §1 audit already read this off the tool. [pkg.go.dev/cmd/vet](https://pkg.go.dev/cmd/vet)
states the analogous framework rule directly: "By default, all checks are
performed" under a bare `go vet` invocation, and vet's own "exit code is
non-zero for erroneous invocation of the tool or if a problem was reported,
and 0 otherwise" — so empty stdout AND exit 0 both mean pass, and either one
alone is enough to script against.

`go test`, by contrast, runs only a fixed "high-confidence subset" before
executing tests — [pkg.go.dev/cmd/go#hdr-Testing_flags](https://pkg.go.dev/cmd/go#hdr-Testing_flags)
names exactly 11: `atomic, bools, buildtag, directive, errorsas, ifaceassert,
nilfunc, printf, stdversion, stringintconv, tests`. That leaves 25 analyzers
invisible to `go test` alone, including `composites`, `copylocks`, `defers`,
`loopclosure`, `lostcancel`, `shift`, `unreachable`, `unusedresult`, and the
two Go-1.25 additions `hostport` and `waitgroup` — none of the seven planted
fixtures below is in the 11-item list, which is exactly why each one is
silent under `go test` and loud under `go vet`.

**Directly measured** (`~/.cache/research-lang/go-tools/fixtures/gate-commands/`,
seven one-case-per-module fixtures, each with a passing `_test.go`):

| case | `go test ./...` | `go vet ./...` |
|---|---|---|
| `copylocks` (Mutex passed by value) | `ok` (exit 0) | `main.go:11:16: BadCopy passes lock by value…` (exit 1) |
| `lostcancel` (cancel func not called on a path) | `ok` (exit 0) | 2 findings (exit 1) |
| `loopclosure` (`go 1.21`, range var captured in `go func(){}`) | `ok` (exit 0) | `loop variable v captured by func literal` (exit 1) |
| `unusedresult` (`fmt.Sprintf` result discarded) | `ok` (exit 0) | `result of fmt.Sprintf call not used` (exit 1) |
| `waitgroup` (`wg.Add(1)` inside the spawned goroutine) | `ok` (exit 0) | `WaitGroup.Add called from inside new goroutine` (exit 1) |
| `hostport` (`fmt.Sprintf("%s:%d", host, port)` fed to `net.Dial`) | `ok` (exit 0) | `address format "%s:%d" does not work with IPv6…` (exit 1) |
| `composites` (unkeyed literal of an **imported** struct type) | `ok` (exit 0) | `…Point struct literal uses unkeyed fields` (exit 1) |

All seven: `go test ./...` is silent and exits 0; a separate `go vet ./...`
is the only thing that catches the bug. This is the concrete form of
Conflict 4/M-M-07 in [go-topic-map.md](../go-topic-map.md).

**`golangci-lint`'s `govet` linter is not a lesser copy.** Running
`golangci-lint run --config <(printf 'version: "2"\nlinters:\n  default: none\n  enable:\n    - govet\n')`
on the `copylocks`, `hostport` and `waitgroup` fixtures reproduced the exact
same findings as bare `go vet`, because golangci-lint 2.14.0 is
"built with go1.27.1" (`golangci-lint --version`) and its `govet` linter
invokes the same `go/analysis` passes from that toolchain, not a bundled
older copy. **Consequence for the gate block:** a repo whose gate is
`golangci-lint run ./...` with `govet` enabled at its default settings does
**not** need a redundant separate `go vet ./...` step — the two are the same
check. A repo that disables specific vet analyzers inside `govet`'s
`settings.govet.disable` list, or that runs no golangci-lint at all (the
"Go-team shape", Conflict 2), still needs the bare command.

### 2. `stdversion`, `hostport` and `waitgroup` version provenance

`stdversion` (flags stdlib symbols newer than the file's `go` line) joining
`go test`'s vet subset is itself a **Go 1.27** change —
[go.dev/doc/go1.27](https://go.dev/doc/go1.27) states it plainly: "`go test`
now invokes the `stdversion` vet check by default." It is inside the
11-analyzer list confirmed by direct measurement (§1 above) on the installed
Go 1.27.1 toolchain; a module still built with a 1.26 toolchain does not get
this for free from `go test` and needs `go vet ./...` (which has run
`stdversion` since the analyzer itself shipped) for the same protection.
`hostport` and `waitgroup` are **Go 1.25**
additions, confirmed by direct fetch of the Go 1.25 release notes: "Go 1.25's
`go vet` command includes two new analyzers: `waitgroup` … `hostport`"
([go.dev/doc/go1.25](https://go.dev/doc/go1.25)) — not 1.27, correcting an
imprecise "Go-1.27-era" phrasing that appears in one wave-1 scout file. A
module whose `go` line is below 1.25 does not get either analyzer even under
`go vet ./...` on a 1.27 toolchain, because vet's analyzer set for a file is
also gated by that file's declared Go version via `stdversion`-style logic;
confirm with `go list -m -f '{{.GoVersion}}'` before relying on either row.

### 3. `go fix -diff` is safe to gate CI on unattended — with one nuance

[go.dev/doc/go1.26](https://go.dev/doc/go1.26): "The venerable `go fix`
command has been completely revamped and is now the home of Go's
_modernizers_ … These fixers should not change the behavior of your
program" and it "builds atop the exact same Go analysis framework as
`go vet`." `go help fix` documents `-diff`: print the patch as a unified diff
and "exit with a non-zero status if the diff is not empty" — this is
scriptable directly, no `git diff` dance needed.

**The one shipped fixer with a documented behavior change is `omitzero`**,
and it is *not* unconditionally risky. Reading its own source
(`golang__tools@d2d3de9f066e:go/analysis/passes/modernize/omitzero.go:32-34`):
"the omitzero pass searches for instances of 'omitempty' in a json field tag
on a struct. Since 'omitempty' does not have any effect when applied to a
struct field, it suggests **either** deleting `omitempty` **or** replacing it
with `omitzero`". Planting a `Config` struct with a zero-valued nested-struct
field tagged `omitempty` and running `go fix -diff ./...` produced:

```
fix: omitzero: ignoring alternative fix "Replace omitempty with omitzero (behavior change)"
```

— `go fix` applied the **safe** alternative (delete the no-op `omitempty`)
and explicitly logged that it declined the risky one. Applying the printed
diff left `json.Marshal` output byte-identical (verified: a test asserting
the zero-valued nested struct is still present in the marshaled JSON passes
both before and after the fix). **Conclusion, correcting a blanket "omitzero
changes JSON output" claim carried in the topic map:** `go fix ./...`'s
*default* output for this pattern never changes behavior; the behavior
change is only reachable through a separate, deliberate acceptance of the
alternative fix, which `go fix` does not apply on its own. A genuine
behavior change is possible only where an `omitzero`-eligible field's type
already has a working `IsZero() bool` method and the fixer *is* applied — a
narrower and rarer case than the map's original framing suggested.

`rangeint` and `stringsseq` fired and applied cleanly in the same run
(`for i := 0; i < n; i++` → `for i := range n`; `for _, part := range
strings.Split(s, sep)` → `for part := range strings.SplitSeq(s, sep)`), and
the fixed module's tests still pass — `go fix -diff ./...` on the fixed twin
exits 0 (clean).

### 4. `go mod tidy -diff` and `-mod=readonly`

[go.dev/ref/mod](https://go.dev/ref/mod), Build commands: "`-mod=readonly`
tells the `go` command to ignore the vendor directory and to report an error
if `go.mod` needs to be updated" and this has been the default "if the `go`
version in `go.mod` is 1.16 or higher" since Go 1.16. Planting a module that
imports `golang.org/x/text/cases` and `.../language` without a `require` line:

```
$ go mod tidy -diff        # exit 1
diff current/go.mod vs tidy/go.mod: +require golang.org/x/text v0.42.0
diff current/go.sum vs tidy/go.sum: +2 checksum lines
$ go build -mod=readonly ./...    # exit 1
main.go:4:2: cannot find module providing package golang.org/x/text/cases:
  import lookup disabled by -mod=readonly
```

On the fixed twin (`go mod tidy` applied), both commands exit 0 and
`go build ./...` succeeds. `go mod tidy -diff` is the CI-native check: no
temp checkout, no `git diff` after a mutating `go mod tidy`, exit code alone
is the gate.

### 5. `govulncheck`: text vs. json/sarif exit-code trap

[pkg.go.dev/golang.org/x/vuln/cmd/govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck):
"Govulncheck exits successfully (exit code 0) if there are no vulnerabilities,
and exits unsuccessfully if there are. **It also exits successfully if the
`-format json`, `-format sarif`, or `-format openvex` is provided, regardless
of the number of detected vulnerabilities.**" Planting a module that pins
`golang.org/x/text@v0.3.0` and calls `language.Parse` reachably on caller
input (govulncheck v1.8.0, DB snapshot 2026-09-24):

```
$ govulncheck ./...                       # text, default
Vulnerability #1: GO-2021-0113
    Out-of-bounds read in golang.org/x/text/language
    Found in: golang.org/x/text@v0.3.0, Fixed in: v0.3.7
    #1: main.go:9:23: govulnvuln.ParseAcceptLanguage calls language.Parse
exit=3

$ govulncheck -format json ./...          # exit=0, finding present in the JSON body's "osv" records
$ govulncheck -format sarif ./...         # exit=0, finding present as sarif "ruleId":"GO-2021-0113"
```

On the fixed twin (bumped to `golang.org/x/text@v0.42.0`), text mode prints
"No vulnerabilities found." and exits 0. The `govulncheck-action` README
states the same rule for its own action wrapper, verbatim: "The
govulncheck-action follows the exit codes of govulncheck command. Specifying
the output format 'json' or 'sarif' will return success even if there are
some vulnerabilities detected."
([github.com/golang/govulncheck-action](https://raw.githubusercontent.com/golang/govulncheck-action/master/README.md))
— **a CI step that runs govulncheck (via the action or bare) in json/sarif
mode and trusts the job's own exit status will pass silently on a real,
reachable vulnerability.** This is not a hypothetical: it is the literal
documented behavior of the tool both wraps.

### 6. Generated-code detection: the marker is not always on line 1

`go generate`'s convention doc ([go.dev/blog/generate](https://go.dev/blog/generate))
shows the marker text (`// Code generated by stringer -type Pill pill.go; DO
NOT EDIT.`) but does not pin it to line 1. Real code frequently puts a
license/copyright header first. Measured in the exemplar corpus
(`go-audit/exemplar-code-shape.md` §1): a naive `head -n1 | grep` check finds
188 generated files corpus-wide; scanning the first 15 lines of every file
finds 460 — `tailscale/tailscale@6b3a45f14ef6:api.md.go:1` and 200+ siblings
carry a `// Copyright …` line before `// Code generated by
tailscale.com/cmd/viewer; DO NOT EDIT.`, a 15× undercount on that one repo
alone. Reproduced on a minimal fixture: a 4-line Apache license header
followed by the marker on line 6 — `head -n1 | grep -e 'Code generated .*
DO NOT EDIT'` finds nothing (exit 1, false negative); `head -n15 | grep`
finds it (exit 0). The same corrected check over an ordinary hand-written
file in the same package produces no output (exit 1 from `grep`, i.e. zero
matches — correctly quiet).

### 7. Tool pinning: `tool` directive leakage into a consumer's module graph

[go.dev/ref/mod](https://go.dev/ref/mod) on the `tool` directive (Go 1.24+):
it "adds a package as a dependency of the current module and makes it
available to run with `go tool`". What it does not say plainly is what
happens one hop away. Built live: a library `gatecmd/tooldirective/lib` with
`tool golang.org/x/text/cmd/gotext` in its `go.mod`; `go mod tidy` in that
library adds `golang.org/x/text`, `golang.org/x/mod`, `golang.org/x/sync` and
`golang.org/x/tools` as ordinary (`// indirect`) `require` lines — because a
`tool` line is implemented as a ordinary dependency requirement plus a
registration, and MVS makes no distinction between "a dependency because I
import it" and "a dependency because I `go tool` it." A second module that
`require`/`replace`s that library and runs `go list -m all` sees the same
four `golang.org/x/*` modules in its own build list, at the same resolved
versions — **the tool's transitive requirements do leak into a consumer's
module graph**, exactly like any other dependency, and count against the
consumer's own `govulncheck`/`go mod tidy` surface. What does *not* leak: the
consumer's own `go tool` command lists only the built-in toolchain tools
(`asm cgo compile cover fix link preprofile vet`) — `gotext` is absent; a
consumer that wants the same tool available under `go tool` must add its own
`tool` line. **This nuances a library-hygiene assumption that a `tool`
directive is "dev-only" and invisible to consumers — its dependency footprint
is not.**

### 8. `-race`: cost and the every-PR-vs-scheduled question

[go.dev/doc/articles/race_detector](https://go.dev/doc/articles/race_detector):
"The cost of race detection varies by program, but for a typical program,
memory usage may increase by 5-10x and execution time by 2-20x." Measured in
CI: `-race` runs in 17/32 CI-having exemplars
(`go-audit/exemplar-quality-gates.md` §3); none of the 17 was observed
splitting it into a separate scheduled/nightly lane rather than running it on
every PR — the corpus default, where `-race` is used at all, is "pay the
cost on every PR." No exemplar was found gating `-race` behind a label or a
cron-only workflow.

### 9. Empty-output and exit-code table (what "pass" looks like)

| command | pass signal | version watched |
|---|---|---|
| `gofmt -l .` | empty stdout, exit 0 | go1.27.1 |
| `go vet ./...` | empty stdout, exit 0 | go1.27.1 |
| `golangci-lint run ./...` (default `govet` enabled) | `0 issues.` on stdout, exit 0 | golangci-lint 2.14.0 / go1.27.1 |
| `go fix -diff ./...` | empty stdout, exit 0 | go1.27.1 (modernizers since 1.26) |
| `go mod tidy -diff` | empty stdout, exit 0 | go1.27.1 |
| `go build -mod=readonly ./...` | normal build output, exit 0 | go1.27.1 (default since 1.16) |
| `govulncheck ./...` (text) | `No vulnerabilities found.` on stdout, exit 0 | govulncheck v1.8.0, DB 2026-09-24 |
| `govulncheck -format json/sarif ./...` | **always exit 0** — must grep the body | govulncheck v1.8.0 |
| `go generate ./... && git diff --exit-code` | empty diff, exit 0 | go1.27.1 |
| `go test -race ./...` | `ok` lines, exit 0 | go1.27.1 |

## Normative guidance candidates

1. **Rule (GO-GATE-COMMANDS-01):** Every `*.go` change runs, in order: (a)
   format check (`gofmt -l .` empty, or `golangci-lint fmt --diff` — owned by
   the sibling `golangci-config` dive); (b) the lint gate — either
   `golangci-lint run ./...` with `govet` enabled at defaults, **or**, on the
   Go-team shape, `go vet ./...` **and** `staticcheck ./...` as two explicit
   steps; (c) `go build ./...`; (d) `go test ./...` (fast lane) and
   `go test -race ./...` (race lane, scope per GO-GATE-COMMANDS-08); (e)
   `go fix -diff ./...`; (f) `go mod tidy -diff` (and, in CI, a build under
   `-mod=readonly`, which is already the ambient default); (g)
   `govulncheck ./...` in text mode, or a content-check on json/sarif output.
   **Rationale:** each step catches a class of defect none of the others do
   — measured directly (Findings §1–5): `go test` alone misses 25 vet
   analyzers, `golangci-lint`'s bundled `govet` is not a lesser copy of bare
   `go vet` when enabled at defaults, `go fix -diff` and `go mod tidy -diff`
   are both silent otherwise, and `govulncheck`'s structured output modes
   silently pass on a real, reachable finding.
   **Verify:** run the block against the `gate-commands` fixture set: every
   fixture directory fails exactly the command that owns its analyzer/check
   and passes every other.
   **Run:** yes — all seven vet-subset fixtures, `go fix -diff`,
   `go mod tidy -diff` + `-mod=readonly`, and `govulncheck` in all three
   formats, at `~/.cache/research-lang/go-tools/fixtures/gate-commands/`.

2. **Rule (GO-GATE-COMMANDS-02):** `go vet ./...` (or an equivalent
   golangci-lint `govet` step at unmodified defaults) is a mandatory,
   separate gate step — `go test ./...` passing is never evidence that vet
   passes. **Rationale:** `go test` runs only 11 of 36 analyzers
   ([pkg.go.dev/cmd/go#hdr-Testing_flags](https://pkg.go.dev/cmd/go#hdr-Testing_flags)).
   **Verify:** `go vet ./...` — empty output and exit 0 is pass; any output
   is a finding, and the analyzer name in the output (`copylocks:`,
   `hostport:`, …) identifies the row.
   **Run:** yes — `copylocks`, `lostcancel`, `loopclosure`, `unusedresult`,
   `waitgroup`, `hostport`, `composites` fixtures; each passes
   `go test ./...` and fails `go vet ./...` (Findings §1 table).

3. **Rule (GO-GATE-COMMANDS-03):** A repository whose lint gate is
   `golangci-lint run ./...` with `govet` at its default settings does not
   also need a bare `go vet ./...` step; a repository that disables any
   `govet` sub-analyzer, or has no golangci-lint config at all, does.
   **Rationale:** avoid a redundant, easily-drifting duplicate step, without
   creating a silent gap when the config diverges. **Verify:** read
   `.golangci.*`'s `linters.settings.govet` for a `disable`/`enable` override;
   absent one, golangci-lint's `govet` already equals `go vet`.
   **Run:** yes — golangci-lint `govet`-only config reproduced the exact
   `go vet` findings on `copylocks`, `hostport`, `waitgroup`.

4. **Rule (GO-GATE-COMMANDS-04):** `go fix -diff ./...` runs as a blocking
   CI step and may run unattended (auto-apply on a bot commit, or fail CI on
   a non-empty diff) without a human diff review gate, because Go's own
   modernizer suite declines to auto-apply its one behavior-changing
   alternative fix. **Rationale:** [go.dev/doc/go1.26](https://go.dev/doc/go1.26)'s
   safety guarantee, verified rather than assumed for the one fixer (`omitzero`)
   that has a documented exception. **Verify:** `go fix -diff ./...` — empty
   output and exit 0 is pass; non-empty output and exit 1 means unapplied
   fixes remain.
   **Run:** yes — `modernize` fixture (rangeint + stringsseq + omitzero
   patterns), exit 1 on the violation, exit 0 after applying the printed
   diff, tests green both before and after.

5. **Rule (GO-GATE-COMMANDS-05):** `go mod tidy -diff` gates CI directly (no
   `git diff` shell dance); `-mod=readonly` (already the ambient default on
   Go ≥1.16 with no `vendor/`) is asserted explicitly in a build step so a
   stale `go.mod` fails the build, not just the tidy check. **Rationale:**
   two independent, cheap checks catch the same class of drift from two
   angles (declared graph vs. resolvable build). **Verify:**
   `go mod tidy -diff` — empty output, exit 0 is pass; `go build
   -mod=readonly ./...` — normal build output, exit 0 is pass.
   **Run:** yes — `tidy-stale`/`tidy-clean` fixture pair, both commands.

6. **Rule (GO-GATE-COMMANDS-06):** `govulncheck` in a blocking CI step uses
   the default **text** output format and its bare exit code; a step that
   needs machine-readable `json` or `sarif` output adds an explicit
   downstream check of the body (e.g. `jq '.[] | select(.osv)' | (! read)`
   equivalent, or the SARIF `results` array being empty) instead of trusting
   the job's own exit code. **Rationale:** documented, verified fact —
   json/sarif "return success even if there are some vulnerabilities
   detected" (govulncheck's own doc and `govulncheck-action`'s README,
   verbatim). **Verify:** run `govulncheck ./...` (text) as the gate; if
   json/sarif is required for a downstream tool (e.g. GitHub code-scanning
   ingestion), run a second `govulncheck -format text ./...` purely to gate
   the job, or grep the json/sarif body directly.
   **Run:** yes — `govulncheck-vuln` fixture: text exit 3, json exit 0,
   sarif exit 0, all three carrying the same `GO-2021-0113` finding; clean
   twin exits 0 in all three formats with "No vulnerabilities found."

7. **Rule (GO-GATE-COMMANDS-07):** A repository whose build has a
   `//go:generate` directive gates on `go generate ./... && git diff
   --exit-code` (or `git status --porcelain` is non-empty) in CI, not just
   locally. **Rationale:** measured — only 1/32 CI-having exemplars runs
   this check; drift between a generator and its checked-in output is
   otherwise silent until a reviewer notices by hand.
   **Verify:** the two-command pipeline above; empty diff and exit 0 is pass.
   **Run:** no — reading heuristic only; the mechanism (`git diff
   --exit-code`) is a standard git primitive, not a Go-specific behavior
   worth planting a fixture for.

8. **Rule (GO-GATE-COMMANDS-08):** `go test -race ./...` runs on every PR by
   default; a repository moves it to a scheduled/nightly lane only once its
   test suite's wall-clock or memory cost under `-race` is measured and shown
   to bottleneck CI, not preemptively. **Rationale:** [go.dev's own
   figures](https://go.dev/doc/articles/race_detector) (5–10× memory, 2–20×
   time) are a ceiling, not an automatic disqualifier; 17/32 CI-having
   exemplars already absorb the cost on every PR with no observed
   scheduled-only split.
   **Verify:** compare `time go test ./...` vs `time go test -race ./...` on
   the repository's own suite; a >~3× wall-clock delta on a slow CI tier is
   the trigger to consider a separate lane, not the default.
   **Run:** no — reading heuristic; the documented multiplier is normative
   (go.dev), not fixture-verifiable in the abstract.

9. **Rule (GO-GATE-COMMANDS-09):** Generated-code detection (for GO-CORE-05,
   "never hand-edit generated code") scans the first ~15 lines of a file for
   `// Code generated .* DO NOT EDIT\.`, never only line 1.
   **Rationale:** measured 15× undercount in one real repo
   (`tailscale/tailscale@6b3a45f14ef6:api.md.go:1`) from a license header
   preceding the marker; [go.dev/blog/generate](https://go.dev/blog/generate)
   documents the marker text but not a required line number.
   **Verify:**
   `grep -rl -e 'Code generated .* DO NOT EDIT' . --include='*.go'` combined
   with checking that the matching line is not line 1 for at least one hit
   is the "would-have-missed-it" self-check; the forward check for an agent
   editing a specific file is `head -n 20 <file> | grep -e 'Code generated
   .* DO NOT EDIT'` before any edit — empty output means the file is NOT
   generated and is safe to hand-edit; non-empty means stop.
   **Run:** yes — planted a file with a 5-line license header before the
   marker on line 6; naive `head -n1` check misses it (exit 1, 0 matches),
   `head -n15` check catches it (exit 0, 1 match); the same corrected check
   over an ordinary hand-written sibling file in the same package produces
   zero matches.

10. **Rule (GO-GATE-COMMANDS-10):** Pin dev tools with the `go.mod` `tool`
    directive only for tools the module's own contributors run locally
    (linters, generators used by `go generate`); pin CI-only tool versions
    by an explicit `go run pkg@vX.Y.Z` or a version-pinned download in the
    workflow, not a `tool` line, when the tool is heavy and never run by a
    consumer of the module. **Rationale:** a `tool` directive's dependency
    footprint (not just the tool itself) is inherited by every consumer's
    `go list -m all`, verified live — it is not free just because it is
    "dev-only." **Verify:** for a library, `go list -m all` in a throwaway
    consumer module that `require`s it; any module present only because of
    the library's `tool` line is a cost every consumer's `go mod tidy` and
    `govulncheck` now carries.
    **Run:** yes — `tool-directive/lib` (carries `tool
    golang.org/x/text/cmd/gotext`) consumed by `tool-directive/consumer`;
    `golang.org/x/text`, `golang.org/x/mod`, `golang.org/x/sync`,
    `golang.org/x/tools` all appear in the consumer's `go list -m all`; the
    consumer's own `go tool` output does not include `gotext`.

## Verification runs

All commands run via `~/.cache/research-lang/go-tools/run.sh` (Go 1.27.1,
GOTOOLCHAIN=local, golangci-lint 2.14.0, govulncheck v1.8.0), `cd`'d into
each fixture directory first.

**Vet-subset fixtures** (`fixtures/gate-commands/{copylocks,lostcancel,loopclosure,unusedresult,waitgroup,hostport,composites}/`):

| fixture | `go test ./...` | `go vet ./...` |
|---|---|---|
| `copylocks` | `ok gatecmd/copylocks 0.001s` (exit 0) | `main.go:11:16: BadCopy passes lock by value: gatecmd/copylocks.Counter contains sync.Mutex` (exit 1) |
| `lostcancel` | `ok gatecmd/lostcancel 0.001s` (exit 0) | `main.go:7:2: the cancel function is not used on all paths…` + `main.go:9:3: this return statement may be reached…` (exit 1) |
| `loopclosure` (`go 1.21`) | `ok gatecmd/loopclosure 0.001s` (exit 0) | `main.go:10:11: loop variable v captured by func literal` (exit 1) |
| `unusedresult` | `ok gatecmd/unusedresult 0.001s` (exit 0) | `main.go:11:2: result of fmt.Sprintf call not used` (exit 1) |
| `waitgroup` | `ok gatecmd/waitgroup 0.001s` (exit 0) | `main.go:13:10: WaitGroup.Add called from inside new goroutine` (exit 1) |
| `hostport` | `ok gatecmd/hostport 0.002s` (exit 0) | `main.go:13:22: address format "%s:%d" does not work with IPv6 (passed to net.Dial at L14)` (exit 1) |
| `composites` | `ok gatecmd/composites 0.001s` (exit 0) | `main.go:8:9: gatecmd/composites/point.Point struct literal uses unkeyed fields` (exit 1) |

Confirmed additionally: `go test ./...` on the `copylocks` fixture with `-v`
shows `TestBadCopy` passing cleanly (exit 0) — `go test`'s vet subset really
is silent on `copylocks`, it is not merely unreported.

`golangci-lint run --config <govet-only.yml> ./...` (a minimal `version: "2"`
config with `linters.default: none` and `linters.enable: [govet]`) on
`copylocks`, `hostport`, `waitgroup`: same three findings, same text,
`(govet)` suffix, exit 1 on each — golangci-lint's bundled `govet` is not a
weaker subset.

**`go fix -diff` (`fixtures/gate-commands/modernize/`, `modernize-fixed/` twin):**

```
$ go fix -diff ./...
fix: omitzero: ignoring alternative fix "Replace omitempty with omitzero (behavior change)"
--- main.go (old) / +++ main.go (new): rangeint, stringsseq, and the safe
    omitzero-alternative (drop omitempty) diffs shown
exit=1
```
On the fixed twin (diff applied with `go fix ./...`): `go fix -diff ./...`
exit=0 (clean); `go test ./...` exit=0 (`ok gatecmd/modernize`); a locked-in
test (`TestOmitemptyStructNeverOmits`) asserting the zero-valued nested
struct field is still present in `json.Marshal`'s output passes both before
and after the fix — no behavior change from the applied (safe) diff.

**`go mod tidy -diff` / `-mod=readonly` (`fixtures/gate-commands/tidy-stale/`, `tidy-clean/` twin):**

```
$ go mod tidy -diff        # stale
diff current/go.mod / tidy/go.mod: +require golang.org/x/text v0.42.0
diff current/go.sum / tidy/go.sum: +2 lines
exit=1
$ go build -mod=readonly ./...   # stale
main.go:4:2: cannot find module providing package golang.org/x/text/cases:
  import lookup disabled by -mod=readonly
exit=1
```
Clean twin: `go mod tidy -diff` exit=0 (no output); `go build -mod=readonly
./...` exit=0; `go test ./...` exit=0.

**`govulncheck` text/json/sarif (`fixtures/gate-commands/govulncheck-vuln/`, `govulncheck-clean/` twin):**

```
$ govulncheck ./...                    # text
Vulnerability #1: GO-2021-0113 …
exit=3
$ govulncheck -format json ./...
… "osv":{"id":"GO-2021-0113", …} present in the streamed JSON body …
exit=0
$ govulncheck -format sarif ./...
… "ruleId": "GO-2021-0113" present among 4 ruleIds in the SARIF results …
exit=0
```
Clean twin (`golang.org/x/text` bumped to v0.42.0): `govulncheck ./...`
prints "No vulnerabilities found." and exits 0.

**Generated-code marker detection (`fixtures/gate-commands/generated-code-header/`):**

```
$ head -n1 accessors.go | grep -c -e 'Code generated .* DO NOT EDIT'   # naive
0            # exit 1 (0 matches — MISSES the marker)
$ head -n15 accessors.go | grep -c -e 'Code generated .* DO NOT EDIT'  # corrected
1            # exit 0 (1 match — catches it, 5-line license header before it)
$ head -n15 plain.go | grep -c -e 'Code generated .* DO NOT EDIT'      # clean sibling
0            # exit 1 (0 matches — correctly quiet on ordinary code)
```

**Tool-directive leakage (`fixtures/gate-commands/tool-directive/{lib,consumer}/`):**

```
# lib/go.mod carries: tool golang.org/x/text/cmd/gotext
$ (cd lib && go mod tidy)     # adds golang.org/x/{mod,sync,text,tools} as require (indirect)
$ (cd lib && go tool)         # asm cgo compile cover fix link preprofile vet gotext
$ (cd consumer && go mod tidy && go list -m all)
gatecmd/tooldirective/consumer
gatecmd/tooldirective/lib v0.0.0 => ../lib
golang.org/x/mod v0.41.0
golang.org/x/sync v0.23.0
golang.org/x/text v0.42.0
golang.org/x/tools v0.49.0
$ (cd consumer && go tool)    # asm cgo compile cover fix link preprofile vet  — no gotext
```
The library's tool dependencies leak into the consumer's build list; the
tool's own `go tool` availability does not.

**Not run** (reading heuristics only, per Findings §7–8): the `go generate`
diff-check pipeline (a standard `git diff --exit-code` primitive, not
Go-specific) and the `-race` cost-vs-lane trade-off (the multiplier is
go.dev's own documented figure; whether a given repo's suite crosses the
threshold to warrant a separate lane is repo-specific and not fixture-able
in the abstract).

## Exemplar evidence

- **`go test` vs `go vet` gap**, general pattern: `google/go-cmp`'s own test
  suite deliberately triggers vet's `composites` analyzer with an unkeyed
  literal at `cmp/compare_test.go:553`, confirmed a genuine analyzer hit on
  intentional test fixtures rather than project code
  ([go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md) §5).
- **`golangci-lint` config presence**: 23/35 exemplars carry a `.golangci.*`
  config, all on the v2 schema; the 12 without include
  `golang/tools`, `golang/vuln`, `google/go-cmp`, `grpc/grpc-go`,
  `hashicorp/terraform`, `dominikh/go-tools`, `cockroachdb/pebble`,
  `stretchr/testify` — the "Go-team shape" this dive's GO-GATE-COMMANDS-02/03
  rules explicitly accommodate ([go-topic-map.md](../go-topic-map.md)
  Conflict 2).
- **`go mod tidy` diff-check adoption**: 6/32 CI-having exemplars run a
  `go mod tidy` diff check; 2 of those 6 already prefer the non-destructive
  `-diff`/`--diff` form (`cli/cli@9b031151a825:.github/workflows/lint.yml:41`,
  `golangci/golangci-lint@032d962e0399:.github/workflows/pr-checks.yml:18-30`)
  over a mutate-then-`git diff` shell dance
  ([go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md) §3).
- **`govulncheck` in CI**: 11/32 CI-having exemplars run it
  ([go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md) §3);
  a reachable finding was previously measured for `ko-build/ko`
  (`GO-2026-6348`, per [go-topic-map.md](../go-topic-map.md) M-I-01) —
  independent confirmation that the reachability mechanism this dive plants
  synthetically also fires on real fleet-relevant CLIs.
- **`-race` in CI**: 17/32 CI-having exemplars (`aquasecurity/trivy`,
  `caddyserver/caddy`, `charmbracelet/bubbletea`, `cli/cli`,
  `cockroachdb/pebble`, `containerd/containerd`, `google/go-cmp`,
  `google/go-containerregistry`, `google/go-github`, `goreleaser/goreleaser`,
  `grpc/grpc-go`, `hashicorp/terraform`, `ko-build/ko`, `restic/restic`,
  `sigstore/cosign`, `tailscale/tailscale`; not `stretchr/testify` or
  `spf13/cobra`) — none observed splitting it into a scheduled-only lane
  ([go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md) §3).
- **Generated-code marker undercount**: `containerd/containerd` (27→45),
  `hashicorp/terraform` (41→65), `golang/tools` (6→18),
  `grpc/grpc-go` (0→19), `tailscale/tailscale` (14→211, the extreme case,
  `tailscale/tailscale@6b3a45f14ef6:api.md.go:1`)
  ([go-audit/exemplar-code-shape.md](../go-audit/exemplar-code-shape.md) §1).
- **`go generate` diff-check adoption**: 1/32 CI-having exemplars runs it
  ([go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md) §3)
  — a near-universal gap this dive's rule (GO-GATE-COMMANDS-07) targets.
- **`tool` directive adoption**: 4/35 exemplars carry one; `kubernetes` uses
  a separate `hack/tools/go.mod` module instead, and `tailscale` pins
  golangci-lint's version directly rather than via `tool`
  ([go-audit/exemplar-modules-and-release.md](../go-audit/exemplar-modules-and-release.md) §1,
  cited from [go-topic-map.md](../go-topic-map.md) M-L-04) — three coexisting
  shapes in one 35-repo corpus, consistent with this dive's decision not to
  pick a single winner.

## AI-agent angle

- **An agent trusts `go test`'s exit code as proof `go vet` would also pass.**
  It will not: `go test ./...` is silent on 25 of 36 analyzers. The
  mechanical check is trivial and cheap — run `go vet ./...` as a genuinely
  separate step in every generated CI workflow and every pre-commit
  instruction, never inferred from a green `go test`.
- **An agent "fixes" a lint failure by adding `//nolint` or `-vet=off`
  instead of fixing the code**, especially for `copylocks`/`lostcancel`
  findings that require a real signature change (pointer receiver, an
  explicit `defer cancel()`). The mechanical check: `git diff -U0` grepped
  for `nolint`, `lint:ignore`, `vet=off` on added lines in the same diff as a
  functional change is the house `GO-CORE-02` check (`go-topic-map.md`
  M-K-02) — this dive does not restate it, only flags where it applies to
  vet output specifically.
- **An agent assumes `go fix`'s modernizer suite is 100% behavior-preserving
  without reading which fixer it is running**, because Go's own docs say
  "should not change the behavior of your program" in the summary line. The
  concrete counter-check: `go fix -diff`'s own stderr line
  (`fix: omitzero: ignoring alternative fix "…(behavior change)"`) already
  names the one exception live, in the tool's own output — an agent that
  reads the command's full output (not just its exit code) before applying
  the diff catches this for free.
- **An agent treats `govulncheck -format json`'s exit code as authoritative**
  when wiring up a SARIF/JSON-consuming step (e.g. for GitHub code scanning),
  because that is the natural "structured output = more reliable" instinct.
  It is backwards here: only text mode's exit code is meaningful; json/sarif
  need the body parsed. Mechanical check: any CI step invoking
  `govulncheck -format json` or `-format sarif` (or `govulncheck-action`
  with `output-format: json|sarif`) must be followed by a step that greps or
  `jq`s the output file/artifact — its absence is itself the finding
  (`grep -L -e 'osv' -- *.json` over the CI YAML plus the job's own log is a
  reading heuristic, not yet planted as a runnable check since it inspects
  workflow YAML, not Go code).
- **An agent checks only line 1 for a generated-code marker** (the literal
  reading of the brief's own naive framing, before correction) and then
  proposes hand-editing a file that is generated but license-headered. The
  mechanical check: `head -n 20 <file> | grep -e 'Code generated .* DO NOT
  EDIT'` before any edit to a file whose path or import history is unfamiliar
  — empty output only then means "safe to hand-edit."
- **An agent adds a `tool` directive to a library assuming it is
  invisible/free to consumers**, because the directive's own doc frames it
  as being about `go tool`, a developer-only surface. The mechanical check:
  `go list -m all` in a throwaway module that imports the library — any new
  module present only because of the library's tool pin is a real,
  measurable cost every consumer inherits.
- **An agent hallucinates a stdlib-shaped exit-code convention for
  `govulncheck`** (e.g. assumes exit 1 = one class of finding, exit 2 =
  another) instead of reading the tool's own doc. Measured live: a reachable
  finding under this fixture produced exit **3**, not 1 — the exact numeric
  exit code should never be hand-authored from memory; only "0 = clean,
  non-zero (in text mode) = some finding" is safe to assert without a fresh
  read of `govulncheck -h` or the pkg.go.dev doc's Exit codes section.

## Contested / evolving

- **Whether `golangci-lint`'s `govet` truly tracks upstream `go vet` on every
  future Go release**, or lags by a golangci-lint minor version when a new
  vet analyzer ships (as it briefly could for `hostport`/`waitgroup` between
  their Go 1.25 ship date and golangci-lint's next release picking up a
  matching toolchain). This dive verified parity only for the currently
  installed pair (golangci-lint 2.14.0 / go1.27.1); a repo pinning an older
  golangci-lint against a newer Go toolchain should re-verify before relying
  on Rule 3's "no redundant `go vet` step" claim. Trending: golangci-lint
  tracks Go releases closely (each release states which Go version it is
  "built with"), so the gap window is typically one Go point release at most.
- **Whether `-race` belongs in a separate scheduled lane at all**, given the
  documented 5–10×/2–20× cost. The corpus shows zero exemplars doing the
  split despite the cost being well-documented since early Go releases —
  either the cost has not yet bitten anyone hard enough to change practice,
  or CI budgets in this corpus (mostly well-resourced open-source projects on
  GitHub-hosted runners) simply absorb it. A resource-constrained fleet CI
  tier may reasonably diverge from the corpus's revealed preference; this
  dive states the corpus's practice, not a timeless optimum.
- **Whether `go generate` diff-checking will become more common** now that
  `go fix` has normalized "run a tool, diff the result, fail CI on drift" as
  a pattern for modernization — the 1/32 adoption measured here may be a
  snapshot of a shift in progress rather than a stable minority practice, but
  there is no trend data (only one measured point, 2026-09-26) to confirm
  direction.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [pkg.go.dev/cmd/vet](https://pkg.go.dev/cmd/vet) | `go vet` command reference | current, go1.27.1-era | "By default, all checks are performed" and vet's exit-code contract, straight from the tool's own doc |
| [pkg.go.dev/cmd/go#hdr-Testing_flags](https://pkg.go.dev/cmd/go#hdr-Testing_flags) | `go test` flags reference | current | names the exact 11-analyzer subset `go test` runs before executing tests |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Go 1.27 release notes | 2026-08 | `go fix` modernizer additions/removals/rename in 1.27; `stdversion` under `go test`; `encoding/json/v2` default-on |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Go 1.26 release notes | 2026 (H1) | `go fix`'s complete revamp into the modernizer runner; its safety guarantee wording; `go mod init` version-floor change |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | Go 1.25 release notes | 2025 | confirms `hostport` and `waitgroup` are **1.25** vet analyzers, correcting an imprecise "1.27-era" framing |
| [go.dev/blog/inliner](https://go.dev/blog/inliner) | Go blog post on the `go fix` source-level inliner | 2026 | `//go:fix inline` directive mechanics and the "18,000 changelists" Google-internal migration datapoint |
| [go.dev/ref/mod](https://go.dev/ref/mod) | The Go Modules Reference | current, updated per release | `-mod=readonly`/`-mod=mod`/`-mod=vendor` semantics and defaults; the `tool` directive's grammar and stated effect |
| [go.dev/doc/articles/race_detector](https://go.dev/doc/articles/race_detector) | Race detector doc | long-standing, still current | the exact 5–10×/2–20× cost figures cited everywhere downstream |
| [go.dev/blog/generate](https://go.dev/blog/generate) | `go generate` design/convention post (the go.dev/s/generatedcode redirect target) | 2014, still the live convention doc | the origin of the `// Code generated … DO NOT EDIT.` marker text |
| [golangci-lint.run/docs/welcome/install/local/](https://golangci-lint.run/docs/welcome/install/local/) | golangci-lint's own install docs | current, 2.14.0-era | explicit recommendation of the binary script over `go install`, with the version-pinned install command |
| [pkg.go.dev/golang.org/x/vuln/cmd/govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck) | govulncheck command reference | current, v1.8.0-era | the exact exit-code exception for json/sarif/openvex formats, in the tool's own words |
| [github.com/golang/govulncheck-action README](https://raw.githubusercontent.com/golang/govulncheck-action/master/README.md) | the action's own docs | current | states the same json/sarif exit-0 exception for the GitHub Action wrapper, verbatim, plus its `output-format`/`output-file` inputs |
| `go1.27.1:src/cmd/go/internal/test/test.go` (via `go tool vet help`, `go help fix`, `go help mod`) | the installed toolchain's own `--help` output | 2026-09-26, go1.27.1 | primary, not-a-web-summary source for the 36 vet analyzers, the `-diff` flag semantics, and `-mod` flag docs |
| `golang__tools@d2d3de9f066e:go/analysis/passes/modernize/omitzero.go` | the `omitzero` modernizer's own source and doc comment | exemplar clone, 2026-09-26 | ground truth for the "delete vs. replace" dual-fix behavior verified live in Findings §3 |
| [go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md), [go-audit/exemplar-code-shape.md](../go-audit/exemplar-code-shape.md), [go-audit/exemplar-modules-and-release.md](../go-audit/exemplar-modules-and-release.md) | this program's own wave-1 measurement audits | 2026-09-26 | corpus-wide adoption counts for every CI flag and config file this dive cites, already measured so this dive re-measures only what it needs |

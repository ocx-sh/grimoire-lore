---
name: go-upgrade
description: Ordered procedure for moving a Go module to a new Go release or triaging a Go dependency, covering the release-note and GODEBUG diff, the go and toolchain line bump by code kind, go fix after the bump, stdversion, the golangci-lint pin and config bump with its dated re-probes, the GOEXPERIMENT pin audit, govulncheck reachability triage in text mode, and superseded-module replacement. Use when bumping the go or toolchain directive, adopting a new Go minor or point release, bumping golangci-lint or staticcheck, answering a govulncheck finding or a Dependabot gomod PR, replacing a deprecated or archived module, or asking why a green build changed behaviour after a Go bump. Not for cutting a release, and not for diagnosing a hung or slow process.
license: Apache-2.0
metadata:
  summary: Order-sensitive Go toolchain upgrade and dependency triage procedure, with the dated re-probes that keep pinned linter facts honest
  keywords: go,golang,upgrade,toolchain,go-mod,go-directive,godebug,go-fix,modernize,stdversion,go-vet,golangci-lint,staticcheck,gosec,goexperiment,govulncheck,vulnerability,dependency,depguard,dependabot,deprecated
---

# go-upgrade

## The order is the product. Read this before step A1

Three facts make the order below load-bearing, and an agent that runs the steps
in a convenient order gets a green build that is quietly wrong.

- **`go fix` runs after the `go` line moves, never before.** Fixers decline
  silently below their floor (`errorsastype` is silent at `go 1.25` and fires at
  `go 1.26`). A `go fix` run before the bump under-modernizes, and its empty
  diff reads as "already modern".
- **Nobody else opens the toolchain PR.** Dependabot never opens a PR for the
  `toolchain` line alone ([dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520),
  open, read 2026-09-26). A stdlib CVE is fixed only in a Go point release, so
  a CLI that waits for a bot ships the CVE.
- **Behaviour changes arrive with no compile error.** The GODEBUG diff in step A2
  is the only place a bump shows what it changed at runtime.

Vulnerability triage (Runbook B) is a separate diff from the toolchain move, so
a reviewer can tell a behaviour change from a dependency change.

Contents: [Scope](#scope) · [Pinned defaults](#pinned-defaults) ·
[Before step A1](#before-step-a1) ·
[Runbook A: move to a new Go release](#runbook-a-move-to-a-new-go-release) ·
[Runbook B: triage a dependency](#runbook-b-triage-a-dependency) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[What agents get wrong here](#what-agents-get-wrong-here)

## Scope

Moving one or more Go modules to a new Go minor or point release, bumping the
pinned golangci-lint or staticcheck, and answering a govulncheck finding or a
dependency bump. Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0,
staticcheck 2026.2.1, govulncheck v1.8.0 and gopls v0.23.0 unless a line says
otherwise. The rules are cited by ID and live in the `go-quality` and
`go-modules` rule sets (GO-LANG, GO-MOD, GO-GATE and the families they cite).
Cutting and signing a release, `retract` and the binary-mode audit belong to the
`go-release` skill.

## Pinned defaults

Each row is an agreed decision, marked **pinned**. It is a default an adopter
overrides once, in their own repository, and never per module.

| Decision | Default (2026-09-26) | Override looks like |
|---|---|---|
| Library and SDK `go` line | The oldest supported release's `.0`, `go 1.26.0` today, or lower. No `toolchain` line | A lower floor the code proves with `stdversion` |
| CLI `go` and `toolchain` lines | The current release's `.0` (`go 1.27.0`) plus `toolchain go1.27.N` naming the latest patch | `go-version: stable` in CI and no `toolchain` line, which gives up reproducible release builds |
| CLI patch cadence | Bump `toolchain` within a week of each Go point release | A longer window, written down |
| golangci-lint pin | Exactly `v2.14.0`, bumped only through step A6 | Another exact version, never `latest` |
| gopls pin for the `yield` step | `v0.23.0` | Drop the step once step A5's re-check says vet or golangci carries the analyzer |

## Before step A1

1. **Find every module root.** `find . -name go.mod -not -path '*/vendor/*' -not -path '*/testdata/*'`
   lists the roots. Every step below runs once per root, never once at the
   repository root (GO-MOD-06). Empty output means the tree is not a Go module.
2. **Classify each root by code kind.** A library or SDK is imported by others. A
   CLI builds a released `main` binary. The `go` line policy, the `toolchain`
   line and the golangci-lint file all depend on it (GO-MOD-01, GO-MOD-02,
   GO-GATE-22).
3. **Read the current `go` line** with `go list -m -f '{{.GoVersion}}'`, and any
   per-file `//go:build go1.N` term, which overrides it for that file (GO-LANG-02).

## Runbook A: move to a new Go release

Run the steps in order. Each is one commit, or a reviewer cannot attribute a
behaviour change to its cause.

### A1. Read the release notes of every release crossed

Read `go.dev/doc/go1.N` for every minor between the old and the new line, and
the point-release notes for the new minor. Check each against the silent-change
table under GO-LANG-15 (go-quality `language.md`, Moving to a New Go Release).
Every row there arrives with no compile error.

### A2. Capture the GODEBUG diff

Save the effective runtime defaults on the old line, bump, and save them again.

```sh
go list -f '{{.ImportPath}} {{.DefaultGODEBUG}}' ./... > godebug.before   # on the old go line
# ... step A3 ...
go list -f '{{.ImportPath}} {{.DefaultGODEBUG}}' ./... > godebug.after
diff godebug.before godebug.after   # every changed line is a runtime default to account for
```

Account for each setting that changed in the pull request text. Empty `diff`
output means the bump changed no runtime default. A `godebug` line in `go.mod`
naming a setting the new toolchain removed fails the build with `removed GODEBUG
"<name>" set to old value`: delete it or set it to its final value, and never
move it into a `GODEBUG=` env var in a Dockerfile or workflow, where it is
silently inert (GO-MOD-04).

In a repository that commits `go.work`, keep the workspace `godebug` block
identical to each member's (GO-LANG-17). Run in the workspace root:

```sh
# Any output is the finding: a member that runs with different defaults under GOWORK=off.
go list -m -f '{{.Dir}}' | while read -r d; do
  a=$(go -C "$d" list -f '{{.DefaultGODEBUG}}' .)
  b=$(GOWORK=off go -C "$d" list -f '{{.DefaultGODEBUG}}' .)
  [ "$a" = "$b" ] || echo "godebug differs: $d"
done
```

### A3. Bump the `go` and `toolchain` lines by code kind

Use the go command's own write, never a hand edit.

```sh
go get go@1.27.0            # CLI: the current release's .0 (GO-MOD-01)
go get toolchain@go1.27.1   # CLI: the latest patch, strictly above the go line (GO-MOD-02)
```

- **CLI.** Both lines move. A point release moves only the `toolchain` line.
- **Library or SDK.** The `go` line moves only when the owner raises the floor
  to the new oldest supported `.0`, and never to adopt a language feature
  (GO-LANG-03). It never gains a `toolchain` line (GO-MOD-02). Its CI matrix,
  `[oldstable, stable]`, moves by itself (GO-MOD-16).

Checks, each watched red and green on Go 1.27.1 (measured 2026-09-26):

```sh
# Library floor (GO-MOD-01). Exit 1 is the finding.
v=$(go list -m -f '{{.GoVersion}}') && test -n "$v" && test "$(printf '%s\n1.26.0\n' "$v" | sort -V | tail -n1)" = 1.26.0
# Patch-level floor (GO-MOD-01). Any output is the finding. Empty output passes.
go list -m -f '{{.GoVersion}}' | grep -v -E -e '^1\.[0-9]+(\.0)?$'
# toolchain lines (GO-MOD-02). A hit in a library or SDK go.mod is the finding. Empty output passes.
grep -rn --include='go.mod' -e '^toolchain' .
# Redundant or stale lines (GO-MOD-03). Exit 0 with empty output passes.
go mod tidy -diff
```

Then read every `actions/setup-go` step against GO-MOD-16 (a reading heuristic,
because a workflow's version resolution cannot run locally):
`grep -rn -A3 -e 'actions/setup-go' .github/workflows` lists them. A CLI release
job reads `go-version-file: go.mod`, which picks up the `toolchain` line. A bare
`go 1.N.0` line with no `toolchain` line installs exactly `1.N.0`. Empty output
means the repository has no setup-go step to check.

**Dated re-check, every Go minor.** A CLI module that does not sit at its git
repository's top level stamps `(devel)` instead of its tag
([golang/go#74763](https://github.com/golang/go/issues/74763), open on 1.27.1,
read 2026-09-26). While the issue is open, GO-REL-14's layout stands. When it
closes, run GO-REL-14's own check on the new toolchain before relaxing it.

### A4. Run `go fix` after the bump, and read what it declined

```sh
go fix -a -diff ./... 2>&1 | grep -e 'ignoring alternative fix'   # read each line. Empty output: nothing declined
go fix -diff ./...                                                  # review the diff
go fix ./... && go build ./... && go test ./...
```

Read the declined lines **before** applying. Each one names a behaviour-changing
rewrite the fixer refused (for example `omitzero: ignoring alternative fix
"Replace omitempty with omitzero (behavior change)"`), and GO-LANG-01 and
GO-LANG-10 forbid applying it by hand. The notice prints only on an uncached
run, which is why the first command carries `-a`: a second plain run on 1.27.1
printed nothing, and after `go fix ./...` the notice is gone for good (measured
2026-09-26).

An empty diff below a fixer's floor means "floor-limited", not "modern"
(GO-LANG-02). `go fix -diff ./...` is also gate step 4 (GO-GATE-03). Never
enable golangci's `modernize` in its place.

**Dated re-check, every Go minor (GO-GATE-03).** Diff the "Registered analyzers"
block of `go tool fix help` between the old and new toolchain (a reading
heuristic, 26 fixers on 1.27.1). A new fixer changes what step A4 rewrites. A
removed one means a stale name in any doc or config that cites it.

### A5. Clear `stdversion` with `go vet`

```sh
go vet ./...   # exit 0 with empty output passes. "X requires go1.N or later" is a floor finding
```

`go vet` runs 35 analyzers and `go test` runs 12 of them on 1.27.1 (GO-GATE-02).
A `stdversion` finding means the code uses an API newer than its `go` line: raise
the line (CLI) or rewrite the call (library or SDK, GO-MOD-01). Importing
`encoding/json/v2` or `jsontext` below `go 1.27` is a MUST finding (GO-LANG-04).
Its durable check is the `oldstable` CI leg's `go build ./...`, because
golangci-lint's govet and nogo are blind to it through x/tools v0.50.0.

**Dated re-check, every Go minor (GO-LANG-04).** Confirm that bare `go vet` still
sees the json/v2 floor:

```sh
# Empty output passes: the toolchain's vendored stdversion still checks json/v2.
# A hit means bare go vet is blind too, and only the oldstable build leg remains. A `No such file or directory` error means the file moved: find toonew.go under GOROOT's src/cmd/vendor and re-run. It is never a pass.
go env GOROOT | xargs -r -I{} grep -n -e 'encoding/json' {}/src/cmd/vendor/golang.org/x/tools/internal/typesinternal/toonew.go
```

It printed nothing on Go 1.27.1 and printed the exclusion line on x/tools
v0.50.0's copy of the same file (measured 2026-09-26).

**Dated re-check, every Go minor and gopls bump (GO-LANG-08).** Read the analyzer
list printed by `go tool vet help`, and golangci-lint's linter list, for a
`yield` analyzer (a reading heuristic: neither had one on 2026-09-26). When one
of them carries it, drop the gopls step from the gate (GO-GATE-01 step 10).

### A6. Bump the golangci-lint pin and the three config files

1. Move the exact pin in every workflow and install script. Never `latest`
   (GO-GATE-08). Check:
   `grep -rn -E -e 'golangci-lint[^ ]*@latest' -e 'version: *latest' .github/workflows`.
   Any output is the finding, empty output passes.
2. Run the dated re-probes in [references/probes.md](references/probes.md) on the
   new version, before trusting its verdicts:
   - P1, the unattended `--fix` allowlist (GO-GATE-21).
   - P2, errcheck's receiver matching (GO-GATE-20).
   - P3, gosec with `excludes` emptied, including G304 (GO-GATE-14).
   - P4, staticcheck `QF1009` still blocking (GO-GATE-15).
   - P5, SA4023's `_test.go` blind spot (GO-ERR-05), also on every standalone
     staticcheck bump.
   - P6, `config verify` plus the superset check on all three files (GO-GATE-22).
3. Edit a setting in all three files, or in none. An overlay is the whole
   baseline plus its delta, never the new lines alone (GO-GATE-22). A depguard
   list is edited at its owner, GO-MOD-08, and re-quoted in all three files
   (GO-GATE-13).
4. Run `golangci-lint run ./...` in each module root. New findings are fixed or
   carry `//nolint:<linter> // <reason>` (GO-GATE-12). Never widen an exclusion,
   add a preset, or disable `SA1019` repo-wide to reach green (GO-GATE-09,
   GO-LANG-05).

### A7. Audit `GOEXPERIMENT` pins

```sh
# Any output names a pin to re-justify. Empty output passes.
grep -rn -E --exclude-dir=.git -e 'GOEXPERIMENT[^a-zA-Z0-9_]+([a-z0-9]+,)*no[a-z0-9]+' .
```

Each hit has one of three outcomes on the destination toolchain (GO-LANG-16):

| The experiment is | The pin is | Do |
|---|---|---|
| Default-on (`jsonv2`, `greenteagc` on 1.27) | A real opt-out | Keep it only with a comment saying why, or delete it |
| Still opt-in | A no-op | Delete it |
| Removed | A build break | `GOEXPERIMENT=noswissmap go build ./...` shows the shape: `go: unknown GOEXPERIMENT swissmap`, exit 2 |

**Dated re-check, every Go minor.** `nojsonv2` and `nogreenteagc` were both still
accepted on 1.27.1 (measured 2026-09-26), and both are announced for removal.
Build once with each pin the repository carries. Then confirm the release
binary: `BIN=./mytool && go version "$BIN" | grep -e '-X:'` (rename `mytool`)
prints the non-default experiment it runs with, such as
`go1.27.1-X:nogreenteagc` (GO-OBS-22). Empty output means it runs the defaults.

### A8. Bazel only: re-derive the nogo gap

If the repository builds Go with Bazel, re-run BZL-GO-06's analyzer gap audit and
BZL-GO-07's external `vet` on every rules_go or Go bump. Also re-probe whether nogo's `stdversion` still reports the SDK's Go version for every package (BZL-GO-06 Gaps). Keep `passes/stdversion` out until it does not. Both rows live in the
`bazel-quality` rule set. Never treat a green `bazel build //...` as the vet pass.

### A9. Run the full gate

Run GO-GATE-01's block from every module root. Every step blocks on its exit
code, never on its stdout text. On a Go-version matrix, steps 1 to 4 and 7 to 9
run once on the `stable` leg, and steps 5 and 6 on every leg. The step-10 gopls
`yield` check runs only where `grep -rln --include='*.go' -e 'func(yield func(' .`
prints a file (empty output means no iterator producers and no step).

## Runbook B: triage a dependency

Start here for a govulncheck finding, a Dependabot `gomod` PR, or a deprecated
module. Keep it a separate diff from Runbook A.

### B1. Run govulncheck in text mode, once per module root

```sh
govulncheck ./...   # exit 0 passes. Exit 3 is a finding
```

Only text mode gates. `-format json` and `-format sarif` exit 0 on the same
finding (GO-MOD-12). Read each finding's trace block:

| The finding shows | It is | Do |
|---|---|---|
| `Example traces found:`, or `#1: file:line: ... calls ...` | Reachable | Block the release and upgrade (B2) |
| No trace | Unreachable | Schedule it for the next dependency bump. It does not block |

### B2. Fix a reachable finding by upgrading

Upgrade to the `Fixed in:` version with `go get example.com/mod@vX.Y.Z` (rename
it), then `go mod tidy`, then re-run B1. Never answer a finding with `replace X =>
fork` in any module: it applies only in the main module, so every consumer keeps
the vulnerable code (GO-MOD-07). With no fixed version, fork under a new module
path and change the imports.

A standard-library finding is fixed by a Go point release. In a CLI, that is a
`toolchain` bump through step A3. A library never raises its `go` line for it
(GO-MOD-01). Its CI legs pick up the patch through `stable` and `oldstable`
(GO-MOD-16).

### B3. Replace superseded modules

`golangci-lint run ./...` reports each import on GO-MOD-08's depguard
`superseded` list with a `desc` naming the replacement. Any depguard line is the
finding, and `0 issues.` passes. Two replacements depend on the `go` line, which
depguard cannot see, so read it first (GO-MOD-09):

- `github.com/google/uuid` becomes stdlib `uuid` only at `go 1.27` or above, and
  only for `New`, `NewV4`, `NewV7`, `Parse`, `MustParse`, `String` and
  `Compare`. `NewV6`, `NewMD5`, `NewSHA1` and the DCE family keep the module.
  `go build ./...` fails at once on an invented stdlib symbol.
- `go.uber.org/automaxprocs` is removed from every module whose `go` line is 1.25
  or above, and a library never imports it at any line (GO-MOD-09, GO-OBS-06).

An SDK's runtime import graph stays stdlib-only after any bump (GO-MOD-10).

### B4. Re-read dependencies whose behaviour a rule pins

**Dated re-check, on each `charmbracelet/colorprofile` bump.** Read `envNoColor`
in its `env.go`. At v0.4.3 (read 2026-09-26) it parses `NO_COLOR` with
`strconv.ParseBool`, so `NO_COLOR=yes` leaves colour on, and GO-CLI-13's ban
stands. When it becomes a non-empty check, GO-CLI-13's ban can relax to a
version floor through that rule's owner.

### B5. Re-run the gate, and have a human review the bump

Run step A9. Every repository keeps a `gomod` Dependabot or Renovate block with
`groups:`, and a human reviews each bump, because passing CI is not review
(GO-MOD-17).

## The MUST rows this procedure enforces

Merge-blocking rows, restated as findings so a review that runs this procedure
without the rule files loaded still reports them with the right ID. The rule
text, rationale and full verification live in the rule sets named by the ID.

| # | Finding | Rule |
|---|---|---|
| 1 | A library or SDK declares a `go` line above the oldest supported `.0`, or a patch-level floor | GO-MOD-01 |
| 2 | A library or SDK carries a `toolchain` line, or a CLI's line is hand-edited or not above its `go` line | GO-MOD-02 |
| 3 | CI does not gate on `go mod tidy -diff`, or sets `-mod=mod` | GO-MOD-03 |
| 4 | A `godebug` line names a removed setting, or a runtime default is pinned by `GODEBUG=` in a Dockerfile or workflow | GO-MOD-04 |
| 5 | A gate step runs once at the repository root of a multi-module repository | GO-MOD-06, GO-GATE-01 |
| 6 | A vulnerability or bug is answered with `replace X => fork` | GO-MOD-07 |
| 7 | An import on the superseded list survives the triage | GO-MOD-08, GO-LANG-22 |
| 8 | govulncheck gates in json or sarif mode, or a reachable finding ships | GO-MOD-12 |
| 9 | A release job reads `go-version-file` from a bare `go 1.N.0` line, or a bare `go-version: '1.N'` lacks `check-latest: true` | GO-MOD-16 |
| 10 | A rewrite that `go fix` declined is applied by hand | GO-LANG-01 |
| 11 | An empty `go fix -diff` is read as "modern" without the effective language version | GO-LANG-02 |
| 12 | A module below `go 1.27` imports `encoding/json/v2` or `jsontext` | GO-LANG-04 |
| 13 | `SA1019` is disabled repo-wide | GO-LANG-05 |
| 14 | `math/rand.Seed` is still called after the bump | GO-LANG-06 |
| 15 | `go vet ./...` is not its own gate step | GO-GATE-02 |
| 16 | Modernization is gated by golangci's `modernize` instead of `go fix -diff` | GO-GATE-03 |
| 17 | golangci-lint is unpinned or pinned to `latest` | GO-GATE-08 |
| 18 | A config is v1-schema, fails `config verify`, or lists a banned exclusion preset | GO-GATE-09 |
| 19 | gosec `excludes` differs from `G104`, `G115`, `G304` | GO-GATE-14 |
| 20 | errcheck `exclude-functions` holds anything but `(io.ReadCloser).Close` | GO-GATE-20 |
| 21 | An unattended `--fix` run uses a linter outside the allowlist, or is not followed by `go build` and `go test` | GO-GATE-21 |
| 22 | An overlay config is a fragment rather than the whole baseline plus its delta | GO-GATE-22 |
| 23 | A new finding is silenced with a bare or unexplained `//nolint` | GO-GATE-12 |
| 24 | An `omitempty` to `omitzero` swap on contract output lands without a byte golden over nil and empty | GO-LANG-10 |
| 25 | The SDK's runtime import graph gains a non-stdlib module | GO-MOD-10 |
| 26 | A green `bazel build //...` is read as the vet pass | BZL-GO-07 |

## What agents get wrong here

Ranked by how often it bites.

1. **Runs `go fix` before bumping the `go` line**, then reads the empty diff as
   "already modern". Fixers decline below their floor.
2. **Waits for Dependabot to bump `toolchain`.** It never opens that PR, so a
   stdlib CVE stays shipped.
3. **Adds a `toolchain` line "to be safe"**, to a library or equal to the `go`
   line, which breaks every `-mod=readonly` build.
4. **Answers a CVE with `replace X => fork`**, which consumers never see.
5. **Pipes govulncheck to json or sarif** and trusts the exit 0, or blocks the
   release on every module-level finding without reading the trace.
6. **Applies `go fix`, then looks for what it declined.** The notice prints only
   on an uncached run and disappears once the fix lands.
7. **Disables `SA1019` repo-wide** to get green after a bump surfaces
   deprecations, which also hides `rand.Seed`.
8. **Adds `GOEXPERIMENT=nojsonv2` "for 1.27 safety"**, or keeps a pin from an
   older window without re-justifying it.
9. **Trusts the exit 0 of `golangci-lint run --fix`.** errorlint's fix exits 0
   and leaves a tree that does not build.
10. **Raises a library's `go` line to adopt a language feature**, forcing every
    consumer onto the new release.
11. **Edits only the baseline golangci file**, so the overlays silently drift or
    a fragment replaces them. `config verify` passes a fragment.
12. **Swaps `google/uuid` for stdlib `uuid` wholesale** and invents `uuid.NewSHA1`.
13. **Moves a removed `GODEBUG` setting into a Dockerfile env var**, where it is
    inert, instead of deleting it from `go.mod`.

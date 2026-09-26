---
title: "Go topic map — wave 1 consolidated and adjudicated, wave 2 commissioned, wave 3 staged"
phase: 3
model: opus
date: 2026-09-26
wave: "1 consolidated → 2 commissioned, 3 staged"
sources_surveyed: 12
candidates_deduplicated: 238
---

# Go topic map (phase 3)

## How to read this

1. **Every row is a question**, not a subject area — a question a later rule
   answers with a named verification. "Error handling" is a wave; "where must
   `%w` replace `%v`, given that a `%v`-wrapped error silently breaks
   `errors.Is` for every caller above it" is a row.

2. **Coverage is measured against the sibling lore sets, never against a fleet
   codebase — there is no fleet Go code.** The frame measured zero `go.mod`
   files under `/home/mherwig/dev` outside a Bazel repository cache and one
   devcontainer example ([frame](go-frame.md)), and
   [cfg](go-audit/config-inventory.md) found no rule or skill that touches Go
   except one reference table in `docs-instrument`
   (`skills/docs-instrument/references/tested-examples-by-language.md:42-43`,
   Example functions). So `covered` can only mean *a sibling set already owns
   this glob and this content* (`docs-instrument`, `docs-quality`,
   `bazel-quality`, the house conventions); `partial` means a sibling owns the
   **shape** — the Rust `cli-contract` exit table, `rust-quality/durable-state.md`'s
   atomic-write shape, `rust-cargo`'s release rows — but none of the Go
   mechanism; `uncovered` is the default and the honest answer for almost
   every row. All evidence about practice comes from the 35-repo exemplar
   corpus fetched at the SHAs in [frame](go-frame.md), never from a
   repository the fleet owns.

3. **Priority is against this program's consumers**, in order: a future **OCX
   SDK for Go** (a stdlib-only library wrapping the `ocx` CLI through `os/exec`,
   typed exit-code errors, a JSON envelope, a 100% coverage gate — the analogue
   of `/home/mherwig/dev/ocx-sdk-python`, [cfg](go-audit/config-inventory.md) §3);
   **Go CLIs in the ocx/grimoire mould** (OCI registries, content-addressed
   stores, atomic writes, the pinned exit-code contract, TTY-aware output);
   **Go release artifacts the fleet mirrors** (raw per-platform binaries
   verified by GitHub asset digest, [cfg](go-audit/config-inventory.md) §5);
   and the **general Go adopter** of the lore catalog. A topic that is P0 in
   Go-in-general and irrelevant to all of them is P2 here (long-running
   service tuning, Prometheus conventions); the reverse also happens
   (`SIGPIPE` exit status, M-F-04, is invisible to most Go writing and
   decisive for a fleet CLI).

4. **SURFACE legend** — `lang` · `stdlib` · `concurrency` · `errors` ·
   `testing` · `lint` · `toolchain` · `modules` · `release` · `bazel-go` ·
   `cli` · `sdk` (authoring a published library that wraps a CLI) · `http` ·
   `fs` (files, archives, subprocesses) · `security` · `perf` · `any`.

5. **Exemplar-shape legend** (named from the four exemplar audits; a repo may
   carry two letters):
   **A** = small library (google/go-cmp, spf13/cobra, stretchr/testify,
   uber-go/zap, urfave/cli, charmbracelet/bubbletea) ·
   **B** = CLI (cli/cli, junegunn/fzf, oras-project/oras, ko-build/ko,
   sigstore/cosign, restic/restic, goreleaser/goreleaser, aquasecurity/trivy,
   golangci/golangci-lint, dominikh/go-tools, golang/vuln) ·
   **C** = service or daemon (caddyserver/caddy, prometheus/prometheus,
   etcd-io/etcd, syncthing/syncthing, tailscale/tailscale,
   containerd/containerd, cockroachdb/pebble as an embedded engine) ·
   **D** = SDK or client library (google/go-github, google/go-containerregistry,
   oras-project/oras-go, regclient/regclient, grpc/grpc-go,
   kubernetes-sigs/controller-runtime) ·
   **E** = multi-module monorepo (kubernetes/kubernetes, hashicorp/terraform,
   etcd-io/etcd 14 `go.mod`, aquasecurity/trivy 15, golang/tools,
   prometheus/prometheus) ·
   **F** = Bazel-built Go (bazel-contrib/rules_go, bazelbuild/bazel-gazelle —
   both dogfood; no other exemplar builds Go with Bazel,
   [modrel](go-audit/exemplar-modules-and-release.md) §6) ·
   `all` = binds every shape.

6. **Source keys**, all links, 12 of 12 wave-1 workers returned
   (`exemplar-code-shape.md` was still being written when this map started;
   its Smells, Patterns, Contradictions and Gaps sections were read after it
   completed at 871 lines):
   [frame](go-frame.md) ·
   [cfg](go-audit/config-inventory.md) ·
   [shape](go-audit/exemplar-code-shape.md) ·
   [modrel](go-audit/exemplar-modules-and-release.md) ·
   [gates](go-audit/exemplar-quality-gates.md) ·
   [run](go-audit/exemplar-runtime-posture.md) ·
   [canon](go-topic-map/canonical.md) ·
   [cod](go-topic-map/codified.md) ·
   [dom](go-topic-map/domain.md) ·
   [eco](go-topic-map/ecosystem-tooling.md) ·
   [fail](go-topic-map/failure.md) ·
   [prac](go-topic-map/practitioner.md) ·
   [shift](go-topic-map/shifts.md) ·
   **[map]** = a read-only measurement taken while writing this map, listed in
   point 9 with its command.

7. **Every P0 names a check** in its justification cell: a command, an
   analyzer or lint name, a grep, or a named reading heuristic. A P0 that
   could not name one was demoted.

8. **Version-specific rows carry their version.** Where a row's truth depends
   on a Go, golangci-lint, staticcheck or goreleaser version, the version is in
   the question or the justification. Current as of 2026-09-26: Go 1.27.1
   (supported: 1.27, 1.26), golangci-lint 2.14.0 (2026-09-24), staticcheck
   2026.2.1 (bundled into golangci-lint as 0.8.1), govulncheck current.

9. **Map-time measurements** (read-only; `run.sh` is
   `/home/mherwig/.cache/research-lang/go-tools/run.sh`; exemplar root
   `~/.cache/research-lang/exemplars/go`):
   - **M1 — json/v2 is default-on in 1.27.1.** `grep -n JSONv2 "$(run.sh go env GOROOT)/src/internal/buildcfg/exp.go"`
     → line 87 `JSONv2: true` in the *baseline* experiment set, beside
     `GreenTeaGC: true` and `SizeSpecializedMalloc: true`.
     `src/encoding/json/decode.go:8` carries `//go:build !goexperiment.jsonv2`,
     while `v2_decode.go:5` and `v2/doc.go:5` carry `//go:build goexperiment.jsonv2`:
     on a default 1.27 build the v1 API is implemented on v2 and
     `encoding/json/v2` is importable without flags.
   - **M2 — stdlib `uuid`.** `ls "$(run.sh go env GOROOT)/src/uuid"` → `uuid.go`,
     no build tag: a stdlib `uuid` package ships in 1.27.1.
   - **M3 — `go fix` is a gate-ready command.** `run.sh go help fix` → `-diff`:
     "print the patch as a unified diff; exit with a non-zero status if the
     diff is not empty". `run.sh go tool fix help` → 26 registered analyzers:
     any, atomictypes, buildtag, embedlit, errorsastype, forvar, hostport,
     inline, mapsloop, minmax, newexpr, omitzero, plusbuild, rangeint,
     reflecttypefor, slicesbackward, slicescontains, slicessort, stditerators,
     stringsbuilder, stringscut, stringscutprefix, stringsseq, testingcontext,
     unsafefuncs, waitgroupgo. `omitzero` ("suggest replacing omitempty with
     omitzero") changes `encoding/json` output for zero-valued struct fields —
     a behaviour change inside a suite billed as safe en masse.
   - **M4 — goreleaser config names.** `find . \( -path '*/vendor' -o -path '*/testdata' \) -prune -o \( -name '.goreleaser.y*ml' -o -name 'goreleaser*.y*ml' \) -print`
     → 13 files in 12 repos: 9 `.goreleaser.yml`, 2 `.goreleaser.yaml`
     (goreleaser, oras-go), and `aquasecurity__trivy/goreleaser.yml` plus
     `goreleaser-canary.yml`. goreleaser's own discovery list is six names,
     `goreleaser/goreleaser@ff8de3d6c389:cmd/config.go:47-52`:
     `.config/goreleaser.yml`, `.config/goreleaser.yaml`, `.goreleaser.yml`,
     `.goreleaser.yaml`, `goreleaser.yml`, `goreleaser.yaml`.
   - **M5 — golangci-lint config names.** `golangci/golangci-lint@032d962e0399:pkg/config/base_loader.go:101`
     `SetConfigName(".golangci")` (viper resolves yml/yaml/toml/json).
     `find` for `*golangci*` yml/yaml/toml/json → 21 `.golangci.y*ml` at repo
     roots, `etcd-io__etcd/tools/.golangci.yaml`,
     `kubernetes__kubernetes/hack/golangci.yaml` (passed with `--config`), plus
     4 GitHub workflows named `golangci-lint.yml` (cosign, oras,
     controller-runtime, tailscale) and golangci-lint's own reference and
     schema files.
   - **M6 — ko.** `-name .ko.yaml` → 4 files: cosign, ko (root and a test
     fixture), go-containerregistry's `.ko/debug/.ko.yaml`.

## Conflicts resolved

Twenty-six places where two wave-1 artifacts disagree, or where an artifact
disagrees with the frame or with hypotheses H1–H8. Evidence is ranked
**normative** (the spec, go.dev docs, release notes, the tool's own source or
help) > **measured** (a count over the exemplar corpus or a tool run with the
command inline) > **codified** (a shipped linter default or rule catalogue) >
**argued** (a named practitioner with a reason) > **asserted** (a claim with no
underlying source).

**1. Test style: stdlib `testing` + `go-cmp` is the default; testify is a
tolerated incumbent, never introduced.** H5 framed the tension;
[shift](go-topic-map/shifts.md) Contested recommends "testify-v1 as the
pragmatic default" (argued). Normative sources reject assertion libraries three
times over — [Test Comments §Assert Libraries](https://go.dev/wiki/TestComments#assert-libraries),
[Style Decisions §Assertion libraries](https://google.github.io/styleguide/go/decisions#assertion-libraries),
[FAQ](https://go.dev/doc/faq#testing_framework) ([canon](go-topic-map/canonical.md)).
Measurement does not support "testify dominates": testify is imported in
17/34 full-source repos, go-cmp in 19/34 ([gates](go-audit/exemplar-quality-gates.md) §4);
as direct dependencies 15/35 vs 17/35 ([modrel](go-audit/exemplar-modules-and-release.md) §2);
the split is by lineage — Google-authored terraform 0/249, grpc-go 0/149,
go-github 0/194 files vs trivy 506/1, cli 374/1, goreleaser 188/0
([shape](go-audit/exemplar-code-shape.md) Contradictions). **Resolved:** new
fleet tests use `if got != want { t.Errorf(...) }` and `cmp.Diff` with the
`(-want +got)` convention; go-cmp is a test-only dependency, which leaves the
SDK's stdlib-only *runtime* promise intact. testify is permitted only in a
repository that already standardized on it, with `testifylint` enabled and
never mixed with go-cmp inside one package. The wave-2 `testing/test-style`
dive pins the idioms, not the direction.

**2. The gate of record: golangci-lint v2, pinned — but every MUST names the
underlying analyzer, so the Go-team shape (go vet + staticcheck) satisfies the
same rules.** H4 said golangci-lint is "the de-facto gate in most exemplars".
Measured: 23/35 carry a config, all on the v2 schema; 12/35 have none, and
those include `golang/tools`, `golang/vuln`, `google/go-cmp`, `grpc/grpc-go`,
`hashicorp/terraform`, `dominikh/go-tools`, `cockroachdb/pebble`,
`stretchr/testify` — deliberate, rigorous alternatives (standalone
`staticcheck.conf` ×4, `revive.toml`, lint-as-`go test`)
([gates](go-audit/exemplar-quality-gates.md) §1–2). golangci-lint's `standard`
default is exactly 5 linters ([cod](go-topic-map/codified.md) §4); the 23
real configs converge on 17 ([gates](go-audit/exemplar-quality-gates.md)
headline). **Resolved:** fleet repositories gate on golangci-lint v2 with a
pinned version and the program's config, because one file and one command
carry vet + staticcheck + the measured consensus and it is what two thirds of
the corpus runs. Two constraints bind the rule set: (a) every MUST row names
the analyzer it rests on (`govet/copylocks`, `SA9010`, `errorlint`), so a repo
that runs `go vet` and `staticcheck` directly complies without golangci; (b)
"no golangci config" is never a finding — that would indict the Go team's own
repositories. A linter may back a MUST only if it fired zero times or only on
real defects in the strict 3-repo run and the wave-2 gates dive measures ≤1
false positive per 10k LOC on ≥5 exemplars; the measured noise linters —
`wsl`/`wsl_v5`, `exhaustruct`, `paralleltest`, `nlreturn`, `varnamelen`,
`noinlineerr`, `goconst` — never back a MUST ([gates](go-audit/exemplar-quality-gates.md) §5).

**3. Formatter of record: gofmt output is the MUST; goimports is the SHOULD;
gofumpt is opt-in.** Measured: `gofmt` in 15/23 configured repos, `gofumpt`
8/23, `gci` 5/23 ([gates](go-audit/exemplar-quality-gates.md) headline);
normative: [Code Review Comments §Gofmt](https://go.dev/wiki/CodeReviewComments#gofmt)
and the proverb ([canon](go-topic-map/canonical.md) §21). gofumpt-formatted
and goimports-formatted code are both gofmt-clean, so the three do not
contradict — they nest. **Resolved:** `gofmt -l .` empty is the check every
repo must pass; goimports is how import blocks are kept; a repo may adopt
gofumpt through golangci-lint's `formatters` section, and the rule set never
requires it.

**4. Functional options vs config structs: a decision procedure, not a
winner.** [canon](go-topic-map/canonical.md) §7 (Google Best Practices names
"option structure" and "variadic options" with trade-offs);
[prac](go-topic-map/practitioner.md) §11 (rednafi's measured allocation
critique, builder alternative) against Cheney's canonical pattern;
[shape](go-audit/exemplar-code-shape.md) §3 measured 107 func-typed option
types *and* an interface-typed flavour (`grpc/grpc-go@acccf8cd101a:dialoptions.go:102`)
that naive counts miss; [dom](go-topic-map/domain.md) §9 found
`go-containerregistry`'s `Option func(*options) error` rejecting mutually
exclusive options. **Resolved:** required inputs are positional parameters; a
small or closed optional set is a config struct whose zero value is the
default; an exported constructor of a published SDK whose options will grow
across minor versions uses functional options, func-typed and returning
`error` when options can conflict, interface-typed only when options must be
opaque or comparable. Both flavours are recognised in review. The OCX SDK's
concrete choice is pinned by the wave-3 `api/sdk-surface` dive against
ocx-sdk-python's 32-name surface.

**5. "Accept interfaces, return structs" holds; consumer-side interfaces are
the default, and producer-side ones are legitimate for a real subsystem
abstraction.** Normative: [Code Review Comments §Interfaces](https://go.dev/wiki/CodeReviewComments#interfaces)
("interfaces generally belong in the package that uses values of the
interface type… do not define interfaces before they are used"). Measured
(n=20, [shape](go-audit/exemplar-code-shape.md) §6): 80% of constructors
return concrete types; interfaces split ~55% producer-side / ~45%
consumer-side — which [shape](go-audit/exemplar-code-shape.md) reads as "not
the purism some style guides teach". **Resolved:** the measured
producer-side interfaces are subsystem abstractions with several real
implementations (`Cache`, `EventRecorder`, `Registry`), which the normative
text does not forbid. The finding a reviewer names is an exported interface
with exactly one implementation and no external implementer, or a
constructor returning an interface without a documented reason.

**6. Package layout: go.dev's layout doc, never a new `pkg/`, `internal/`
mandatory for the SDK.** Normative: [go.dev/doc/modules/layout](https://go.dev/doc/modules/layout)
([canon](go-topic-map/canonical.md) §11). Measured: `cmd/` 21/34, `internal/`
26/34, `pkg/` 11/34 with a documented rationale in 1/11 (containerd)
([shape](go-audit/exemplar-code-shape.md) §1). Argued:
`golang-standards/project-layout` disclaims official status
([#117](https://github.com/golang-standards/project-layout/issues/117)),
Demailly says "99% of people do not need `internal/`"
([prac](go-topic-map/practitioner.md) §14). **Resolved:** new repositories
never add `pkg/`; existing `pkg/` trees are not churned; a single-binary CLI
keeps `main` at the module root, `cmd/<name>/` appears only with a second
binary or when the repo is also an importable library. Demailly's `internal/`
claim is accepted for single-binary CLIs and rejected for the SDK: its
non-API code lives under `internal/`, the compiler-enforced analogue of
ocx-sdk-python's underscore modules ([cfg](go-audit/config-inventory.md)
pattern 4).

**7. Sentinel vs typed errors, and `%w` as API: sentinels for conditions,
typed errors for data, `%w` only for what the doc comment promises.**
Normative: [Working with Errors in Go 1.13](https://go.dev/blog/go1.13-errors)
(wrap to expose, don't wrap to hide) and Google's `%w` placement rules
([canon](go-topic-map/canonical.md) §7). Argued: Cheney — no error *types* in a
public API ([prac](go-topic-map/practitioner.md) §4). Measured: exit-code
dispatch on typed errors with `errors.AsType` in `cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212`
([dom](go-topic-map/domain.md) §5); typed `ExitError`/`UserError` in
`aquasecurity/trivy@ae561f8cca36:pkg/types/error.go:11,20`
([run](go-audit/exemplar-runtime-posture.md) §1); the SDK template maps exit
codes to 12 typed error classes ([cfg](go-audit/config-inventory.md) §3).
**Resolved:** export sentinels for conditions without data, typed errors
(pointer receiver, `Unwrap`) when the caller needs data such as an exit code;
callers test with `errors.Is`/`errors.As`/`errors.AsType`, never with `==`,
type switches or string matching. Cheney's stricter position is rejected for
the SDK because the exit code must be reachable. Wrapping a dependency's error
with `%w` makes it part of the API; at a boundary that hides an
implementation, use `%v` or translate to an own sentinel, and say so.

**8. Panics in libraries: only for programmer errors; never `os.Exit` or
`log.Fatal` outside `package main`.** Normative: [Code Review Comments §Don't
Panic](https://go.dev/wiki/CodeReviewComments#dont-panic), Uber "Don't Panic"
and "Exit in Main" ([cod](go-topic-map/codified.md) §9). Measured: 4,236
panics outside `main`, 1,148 of them in `cockroachdb/pebble` whose documented
style panics on invariant violations and recovers at API boundaries; 644
`os.Exit`/`log.Fatal*` outside `main` ([shape](go-audit/exemplar-code-shape.md) §4).
**Resolved:** pebble's invariant-panic design is a documented storage-engine
choice, not a model for the fleet. Library and SDK code panics only where no
input can trigger it (a violated internal invariant, `Must*` over a
compile-time constant) and returns errors for everything else.

**9. slog vs zap (H7): two audits measured different things; both are
right.** [shape](go-audit/exemplar-code-shape.md) Contradictions says H7 is
"confirmed, cleanly" — zap dominates volume (etcd 206 files, caddy 94,
tailscale 71). [run](go-audit/exemplar-runtime-posture.md) §4 says H7 is
"wrong as stated" — `log/slog` is in 11/34 repos, zap in 6. **Resolved by
metric:** by repo breadth slog leads; by file volume zap leads, concentrated
in codebases older than Go 1.21; slog adopters chose stdlib over *any*
third-party logger rather than migrating off zap; zerolog has zero real users.
New fleet code logs through `log/slog`; libraries accept a `*slog.Logger` or
`slog.Handler` and never set the global default; zap is left where it
already is.

**10. One `go-quality` rule with a support directory; a second rule only for
a different glob.** House convention: 6/7 sibling sets use index + support
directory with `<LANG>-<FAM>-nn` IDs and three index-owned `*-CORE` rules;
`rust-quality` is the structural outlier and is not the template
([cfg](go-audit/config-inventory.md) §1.3–1.4, smell 1).
[rule-distillation](../../.claude/skills/research-lang/references/rule-distillation.md):
same glob ⇒ same rule. **Resolved:** `go-quality` (`**/*.go`, ten depth
files) and `go-modules` (the go-command and tool-config names) — see the
Artifact set decision.

**11. `.golangci.yml`, the goreleaser config and `go.work` join `go-modules`
as globs — with widened patterns, because the frame's names would miss.**
The frame left this open. Precedent: `rust-cargo` carries `clippy.toml`,
`rustfmt.toml`, `deny.toml`; `typescript-packaging` carries `eslint.config.*`
and `biome.json` — tool configs ride the manifest rule. Measured: the frame's
literal `.goreleaser.yaml` matches 2 of the 13 goreleaser configs in the
corpus; trivy uses the dotless `goreleaser.yml`, which
[modrel](go-audit/exemplar-modules-and-release.md) §3's own `find` missed
([map] M4, [shape](go-audit/exemplar-code-shape.md) H8 row); golangci-lint
discovers `.golangci.*` but kubernetes passes `hack/golangci.yaml` by
`--config` ([map] M5). **Resolved** under "Narrow the Glob Only When It Cannot
Miss": every name goreleaser, golangci-lint, ko and the go command discover is
listed, plus a `*golangci*` pattern for `--config` names; the accepted false
positive is a CI workflow named `golangci-lint.yml` (4/35 repos), which is the
gate's own wiring and a place the rule is useful. Glob list and counts in the
Artifact set decision.

**12. `go` and `toolchain` directives: libraries declare a floor, applications
declare what they build with; `toolchain` is a minority practice, not a
default.** H6 said `toolchain` directives are common. Measured: 5/35 root
modules carry one ([modrel](go-audit/exemplar-modules-and-release.md) §1),
6/34 repos counting nested modules ([shape](go-audit/exemplar-code-shape.md));
libraries hold deliberately low floors — go-cmp 1.21, testify 1.17, cobra
1.15, zap 1.19. Normative: the `go` line has been a mandatory minimum since
1.21 and `toolchain` only a suggestion for `GOTOOLCHAIN=auto`
([canon](go-topic-map/canonical.md) §11, §18); `GODEBUG` defaults follow the
*main module's* `go` line ([prac](go-topic-map/practitioner.md) §2); `go mod
init` on 1.26+ writes `go 1.(N-1).0` ([shift](go-topic-map/shifts.md) §5).
**Resolved:** a library or SDK declares the lowest `go` version its language
and stdlib use actually require and carries no `toolchain` line (it
constrains no consumer); an application or CLI declares the release it is
built and tested with, and adds `toolchain` only when CI does not already pin
the patch. The exact floor for fleet libraries is owner question 1.

**13. `t.Context()` and `testing/synctest` are defaults, gated by the `go`
line.** Measured: `t.Context()` has 6,629–7,448 call sites (the two audits
excluded generated files differently; `google/go-github` is 99.7% adopted)
([gates](go-audit/exemplar-quality-gates.md) §4, [shape](go-audit/exemplar-code-shape.md) §3);
synctest is in 10/34 repos. Normative: Style Decisions §Contexts prefers
`(testing.TB).Context()` ([canon](go-topic-map/canonical.md) §6); synctest GA
in 1.25 with `Run` removed in 1.26 ([shift](go-topic-map/shifts.md) §4,
[golang/go#73567](https://github.com/golang/go/issues/73567)). **Resolved:**
`t.Context()` is the base context in tests of go ≥1.24 modules;
`synctest.Test` is the default for time-dependent concurrency tests in go
≥1.25 modules; `synctest.Run` is a must-fix wherever it appears.

**14. `encoding/json/v2` is not "still experimental" in the sense two scouts
meant: it is default-on in 1.27.1.** [canon](go-topic-map/canonical.md) says
"still experimental"; [shift](go-topic-map/shifts.md) says it is
"`GOEXPERIMENT=jsonv2`-gated … pre-default-on" and in the same file
"`GOEXPERIMENT=nojsonv2` to disable"; [eco](go-topic-map/ecosystem-tooling.md)
says "opt-out, not opt-in"; [prac](go-topic-map/practitioner.md) and
[fail](go-topic-map/failure.md) say v2 backs `encoding/json` in 1.27.
**Measured ([map] M1):** the 1.27.1 baseline sets `JSONv2: true`, and the v1
package compiles its v2-backed decoder by default. **Resolved:** default-on
with an opt-out. Still open, and the reason M-A-14 is P0:
[prac](go-topic-map/practitioner.md) asserts the v1 API inherited stricter
defaults (duplicate names, invalid UTF-8); that contradicts v2's documented
v1-compatibility options and must be watched on a planted fixture under both
settings (wave-3 `language/stdlib-semantics`). Direction now: a library whose
`go` line admits 1.26 must not import `encoding/json/v2`.

**15. Era rows the shifts scout and the tools themselves overturned.**
(a) `sync.WaitGroup.Go` is **1.25**, not 1.24 — [eco](go-topic-map/ecosystem-tooling.md)
lists it under 1.24; [shift](go-topic-map/shifts.md) §4 and
[fail](go-topic-map/failure.md) cite the 1.25 notes. (b) `testing/synctest` was
experimental in 1.24 and GA in 1.25. (c) [shift](go-topic-map/shifts.md)
says "`waitgroup` → renamed `waitgroupgo` in 1.27 (misplaced Add)", conflating
two tools: `go tool vet help` on 1.27.1 still registers the **vet** analyzer
`waitgroup` (misplaced `Add`) ([cod](go-topic-map/codified.md) §1), and `go
tool fix help` registers the **modernizer** `waitgroupgo` ([map] M3). (d) H3's
"`time.After` in loops pre-1.23" leak is fixed by 1.23 and its opt-out
`asynctimerchan` was removed in 1.27 — the objection is now allocation cost
only ([fail](go-topic-map/failure.md) §6, [canon](go-topic-map/canonical.md) §19).
(e) staticcheck 2026.2 **disabled SA5011** and added **SA9010**
([shift](go-topic-map/shifts.md) §10). (f) `golang/mock` is archived
(2024-01-08) ([shift](go-topic-map/shifts.md) §16). Tool help and release
notes are normative; each overturned row is dated in the map.

**16. `SIGPIPE`: both scouts are half right, and the fleet contract decides.**
[cfg](go-audit/config-inventory.md) §4 calls CLI-05 "a genuinely inverted
default" where writes may return `EPIPE`; [dom](go-topic-map/domain.md)
Summary says "Go's default `SIGPIPE` behavior already gives Rust's `CLI-05`
guarantee for free". Normative ([os/signal §SIGPIPE](https://pkg.go.dev/os/signal)):
by default a write to a broken pipe on fd 1 or 2 terminates the program
*with* `SIGPIPE`; on other descriptors it returns `EPIPE`; registering
`Notify` for `SIGPIPE` turns fd 1/2 writes into `EPIPE` errors. CLI-05 pins
"a clean exit 0, handled once centrally — never a panic, never a propagated
error" (`rules/rust-quality/cli-contract.md`). **Resolved:** Go never panics
here ([dom](go-topic-map/domain.md) right), but death by signal is shell
status 141, not the pinned 0 ([dom](go-topic-map/domain.md) wrong), and the
difference is "different default", not "inverted". The contract stands — a
Go CLI mirrors exit 0; the mechanism is pinned by the wave-2
`cli/exit-codes-and-signals` dive on a planted `| head -1` fixture.

**17. H8 and the fleet's release contract: consuming and shipping are
different problems, and goreleaser hygiene is a minority even among
goreleaser users.** The frame treats goreleaser-built releases as the fleet's
mirror contract. [cfg](go-audit/config-inventory.md) §5 found zero
goreleaser, cosign, SBOM or `checksums.txt` references in any `mirror-*` or
`ocx-mirror*` repo; the four Go binaries mirrored (bazelisk, buildifier,
buildozer, unused-deps) ship as raw per-platform binaries verified by
`github_asset_digest: true` (`mirror-bazelbuild@713abea9fbb8:mirror-base.yml:23-24`).
[modrel](go-audit/exemplar-modules-and-release.md)'s headline 10 ("9/11 carry
signs/sboms/checksum together") is contradicted by its own table: signs 4/11,
sboms 5/11, checksum 7/11, all three 3/11 (caddy, goreleaser, cosign); and its
count missed trivy, so goreleaser is in 12/35 repos ([map] M4). **Resolved**
with the row-level table over the headline: H8 is false — `mod_timestamp`
3/12, signing 4/12. The go-release skill and GO-REL separate verifying
binaries the fleet *consumes* (asset digest, anchored per-platform names)
from shipping binaries the fleet *builds* (patterned on `rust-cargo`
REL-01..07).

**18. golangci config census: 23/35, not 21/34.**
[shape](go-audit/exemplar-code-shape.md) searched to depth 2 and reported
21/34 (etcd 0); [gates](go-audit/exemplar-quality-gates.md) searched full
depth and found `etcd-io/etcd@7583cc6e7e27:tools/.golangci.yaml` and
`kubernetes/kubernetes@dfd7b93a1783:hack/golangci.yaml`. Full-depth search
wins; [map] M5 reproduces 23.

**19. `WaitGroup.Go` adoption: 108 sites in 12 repos, not 69.**
[shape](go-audit/exemplar-code-shape.md) §3 required receiver names `wg` or
`group` (69, 64 in tailscale); [run](go-audit/exemplar-runtime-posture.md) §3
matched the method shape, split it from errgroup's `Go(func() error`, and
spot-read 5/5 clean. The broader, spot-verified count stands.

**20. Bundled vs standalone staticcheck: the version drift is real, the
finding drift is noise.** [prac](go-topic-map/practitioner.md) flags drift
(golangci-lint bundles staticcheck 0.8.1; standalone is 2026.2.1).
[gates](go-audit/exemplar-quality-gates.md) §5 measured 24 vs 27 findings on
oras-go, explained by package scope, and found tailscale's standalone
`staticcheck.conf` is *ignored* by golangci's bundled staticcheck. **Resolved:**
run exactly one staticcheck entry point per repo, pinned; never layer a
`staticcheck.conf` under golangci and expect it to apply.

**21. `go.work` commit policy: commit it in a multi-module repository whose
modules are developed and tested together, never in a single-module repo.**
[eco](go-topic-map/ecosystem-tooling.md) asserts go.dev says it "should not be
committed" (no quote); [canon](go-topic-map/canonical.md) repeats H6's "usually
it should not be". Measured: 4/35 commit a root `go.work`, all genuine
multi-module monorepos, 3/4 with `go.work.sum`
([modrel](go-audit/exemplar-modules-and-release.md) §1);
[shape](go-audit/exemplar-code-shape.md) notes a depth-1 clone cannot observe
an *uncommitted* `go.work`, so H6's half is unfalsifiable here. **Resolved** as
stated; the wave-2 modules dive must quote go.dev's exact wording before the
rule cites it.

**22. `errorlint`'s `-errorf` ships off by default; the fleet turns it on.**
[cod](go-topic-map/codified.md) §12: the linter's author calls the check "not
yet stable". [fail](go-topic-map/failure.md) §17: kubernetes is running a
project-wide `%v`→`%w` migration because `%v` broke `errors.As` callers
([kubernetes/kubernetes#123234](https://github.com/kubernetes/kubernetes/issues/123234)).
Measured: 2,300 `%v`/`%s`-of-err sites, grpc-go 16:1 against `%w`
([run](go-audit/exemplar-runtime-posture.md) §1). **Resolved (direction):**
enable it; a deliberate `%v` at a documented hiding boundary carries
`//nolint:errorlint // <reason>`. The wave-2 gates and errors dives measure its
noise on grpc-go and caddy before the MUST is written.

**23. Channels vs mutexes: no blanket preference.** Effective Go and the
proverbs say share memory by communicating ([canon](go-topic-map/canonical.md)
§2, §21). ASPLOS'19 measured message-passing blocking bugs at least as common
as shared-memory ones, and `-race` catching half of reproduced non-blocking
bugs ([fail](go-topic-map/failure.md) §4). **Resolved:** mutexes guard state,
channels transfer ownership or signal; Uber's "channel size is one or none"
([cod](go-topic-map/codified.md) §9) is the buffered-channel default.

**24. `go.uber.org/atomic` vs stdlib typed atomics: stdlib wins.** Uber's
guide still recommends its wrapper ([cod](go-topic-map/codified.md) §9); the
1.27 `atomictypes` modernizer rewrites toward stdlib `atomic.Int64` et al.
([map] M3); measured, typed atomics are already 69% of atomic use
([run](go-audit/exemplar-runtime-posture.md) §3). The tool is newer than the
guide section; the guide is stale.

**25. gosec `G115`: excluded from the fleet default, with the reason in the
config.** [fail](go-topic-map/failure.md) §12: docker/cli, moby, telegraf and
elastic debate disabling it over provably safe `uint32(len(x))` conversions;
ko's config excludes only G115 ([gates](go-audit/exemplar-quality-gates.md) §1).
**Resolved (direction):** exclude G115 by default, keep the rest of gosec's
current roster, and have the gates dive measure the remaining noise.

**26. Go doc comments belong to `go-quality`, not `docs-quality`.**
[cfg](go-audit/config-inventory.md) §6 concludes "docs-quality needs no new
Go-specific rule"; [canon](go-topic-map/canonical.md) and
[eco](go-topic-map/ecosystem-tooling.md) propose `Deprecated: `, `Package x`
and `[pkg.Name]` rows. Both hold: doc comments live in `*.go` files, which
`docs-quality`'s markup globs never load, so GO-API owns them; `docs-instrument`
keeps Example functions (M-E-12).

## The map

238 rows after dedup, from 459 raw candidates: 353 candidate-table rows across
the seven scouts and 106 smells, patterns and gaps across the five audits.
Sections are lettered by the depth file that will own them (the Artifact set
decision names each file). Merged rows say what they merged. Coverage keys:
`uncovered` rows cite [cfg](go-audit/config-inventory.md), which inventoried
every sibling set; `partial` and `covered` rows name the sibling that owns the
shape.

### A. Language era, modernization and stdlib semantics — 20 rows (`go-quality/language.md`, GO-LANG)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-A-01 | Which pre-1.22-era idioms does CI-green 2026 code still ship (`interface{}`, `sort.Slice` family, hand-rolled min/max/contains, `x := x` copies, 3-clause counting loops, `// +build`, `strings.Index` slicing, `wg.Add`/`Done` triads), and which does `go fix` rewrite without changing behaviour? Merges the H1 rows of all seven scouts. | lang, toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — 26.8 modernize diagnostics per 10k LOC on 12 CI-green repos, 62% `interface{}`→`any` ([shape](go-audit/exemplar-code-shape.md) §7); check `go fix -diff ./...` exits non-zero on any finding ([map] M3) | GO-LANG |
| M-A-02 | Is a `x := x` / `tc := tc` loop-variable copy dead code (module `go` ≥1.22) or still load-bearing (module `go` <1.22, or a mixed-version vendored tree)? | lang, concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 142 copies corpus-wide, etcd 32 ([shape](go-audit/exemplar-code-shape.md) §3); `forvar` fixer / `copyloopvar` linter; semantics gated per module ([fail](go-topic-map/failure.md) §5) | GO-LANG |
| M-A-03 | Is `any` written in new code where `interface{}` appears? | lang | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 6,186 `interface{}` vs 24,570 `any`; terraform 3,337 ([shape](go-audit/exemplar-code-shape.md) §3); `any` fixer; Style Decisions §Use any ([canon](go-topic-map/canonical.md) §6) | GO-LANG |
| M-A-04 | Does code use `min`/`max`/`clear`, range-over-int and the `slices`/`maps`/`cmp` packages instead of hand-rolled loops, `sort.Slice` and `golang.org/x/exp/{slices,maps}`? | stdlib | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — `sort.*` family 1,496 vs `slices`/`maps`/`cmp` 8,692; `x/exp` imports 17 in 4 repos ([shape](go-audit/exemplar-code-shape.md) §3); `minmax`, `rangeint`, `slicescontains`, `slicessort`, `mapsloop` fixers | GO-LANG |
| M-A-05 | When should a helper return `iter.Seq`/`iter.Seq2` (1.23) rather than a `[]T` ranged once, and does every iterator stop when `yield` returns false? | lang, stdlib | A·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — 380 `iter.Seq` sites, concentrated in Go tooling ([shape](go-audit/exemplar-code-shape.md) §3); no settled practitioner "when" ([prac](go-topic-map/practitioner.md) §19); gopls `yield` analyzer ([cod](go-topic-map/codified.md) §3) | GO-LANG |
| M-A-06 | When is a generic function or type justified, versus an interface or concrete code (one instantiation, algorithm indifferent to type, DSLs, error frameworks)? | lang | A·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — Style Decisions §Generics ([canon](go-topic-map/canonical.md) §6); 1,420 type-parameter declarations ([shape](go-audit/exemplar-code-shape.md) §3); reading heuristic: a type parameter with one instantiation in the module | GO-LANG |
| M-A-07 | Which recent language additions should fleet code adopt yet — generic methods, struct-literal field selectors and generalized function-type inference (1.27), self-referential constraints and `new(expr)` (1.26), generic type aliases (1.24, migration shims only)? Merges four scout rows. | lang | A·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — spec appendix ([canon](go-topic-map/canonical.md) §1); interface methods still cannot take type parameters ([prac](go-topic-map/practitioner.md)); `newexpr` fixer ([map] M3); version-gated by the `go` line | GO-LANG |
| M-A-08 | Does code call `math/rand` v1 globals or `rand.Seed` (a silent no-op since 1.24) where `math/rand/v2` is meant? | stdlib | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — v1 271 vs v2 345 import sites, v1 alive in 20/34 repos; `rand.Seed` 8 ([shape](go-audit/exemplar-code-shape.md) §3); `randseednop` ([shift](go-topic-map/shifts.md)); SA1019 | GO-LANG |
| M-A-09 | Does code index or slice a string by byte where rune semantics are meant (`len` vs `utf8.RuneCountInString`, `s[:n]` on UTF-8 names)? | lang | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — spec §String types ([canon](go-topic-map/canonical.md)); 100 Go Mistakes #36-37 ([fail](go-topic-map/failure.md)); staticcheck SA6003 (non-default) ([cod](go-topic-map/codified.md)); registry names are UTF-8 | GO-LANG |
| M-A-10 | Does any observable output — CLI text, JSON, a golden file, a hash, a manifest — depend on map iteration order? | lang, cli | B·D | uncovered [cfg](go-audit/config-inventory.md) | P0 — order is unspecified by the spec ([canon](go-topic-map/canonical.md)); no linter in any catalogue covers it ([cod](go-topic-map/codified.md) Summary); check: `go test -count=5` on every golden/snapshot test plus reading heuristic "a `range` over a map feeding a writer without `slices.Sorted(maps.Keys(m))`" | GO-LANG |
| M-A-11 | Is `time.Time` compared with `==` or used as a map key where `Equal` is needed, and does code assume a monotonic reading survives serialization or `Round(0)`? | stdlib | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 100 Go Mistakes #75 ([fail](go-topic-map/failure.md)); `.Round(0)` 5 sites ([run](go-audit/exemplar-runtime-posture.md) §8); reading heuristic | GO-LANG |
| M-A-12 | Does decoding JSON into `any` silently turn large integers into `float64`, and when must `Decoder.UseNumber` or a typed struct be used? | stdlib, sdk | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — 100 Go Mistakes #77 ([fail](go-topic-map/failure.md)); the SDK decodes ocx's JSON envelope ([cfg](go-audit/config-inventory.md) §3) | GO-LANG |
| M-A-13 | Which stdlib behaviour changes arrive with no compile error on a toolchain or `go`-line bump (`slices.Insert` panics out of range since 1.22, timer channels unbuffered since 1.23, `rand.Seed` no-op since 1.24)? | stdlib, toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — [shift](go-topic-map/shifts.md) X/Y table; the go-upgrade skill reads them | GO-LANG |
| M-A-14 | On Go 1.27, where `encoding/json/v2` is default-on and backs the v1 API, did any v1 `Marshal`/`Unmarshal` behaviour change (duplicate names, invalid UTF-8, case-insensitive matching), and may a library whose `go` line admits 1.26 import `encoding/json/v2`? | stdlib, toolchain | all | uncovered — scouts disagree (conflict 14) | P0 — measured default-on ([map] M1); a silent decoding change would break the SDK's envelope parsing; check: planted fixture run under default and `GOEXPERIMENT=nojsonv2`, diff the outputs | GO-LANG |
| M-A-15 | Should new code use the stdlib `uuid` package (new in 1.27) instead of `github.com/google/uuid`, and only in modules whose `go` line is ≥1.27? | stdlib, modules | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — stdlib `uuid` present in 1.27.1 ([map] M2); `google/uuid` is a direct dependency in 9/35 roots ([modrel](go-audit/exemplar-modules-and-release.md) §2) | GO-LANG |
| M-A-16 | Does code use `strings.Cut`/`CutPrefix`/`CutSuffix`/`CutLast` (1.27), `strings.Builder` and the `SplitSeq`/`Lines` iterators instead of index slicing, `+=` loops and allocating splits? | stdlib | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — `stringscut`, `stringscutprefix`, `stringsbuilder`, `stringsseq` fixers ([map] M3); 7 `string +=` diagnostics ([shape](go-audit/exemplar-code-shape.md) §7) | GO-LANG |
| M-A-17 | Are legacy `// +build` lines still present, and does a `//go:build go1.N` term silently set that file's language version? | lang, toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — 182 legacy lines, 147 outside rules_go's fixtures ([shape](go-audit/exemplar-code-shape.md) §5); `plusbuild` fixer; vet `buildtag`; `go help buildconstraint` ([eco](go-topic-map/ecosystem-tooling.md) §1) | GO-LANG |
| M-A-18 | Which deprecated stdlib APIs does staticcheck SA1019 flag at 2026.2 for Go 1.27 (`io/ioutil`, `reflect.SliceHeader`, `ReverseProxy.Director`, …), and does any config silence SA1019? | stdlib, lint | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — SA1019 is the second most frequent staticcheck finding (21/88) ([gates](go-audit/exemplar-quality-gates.md) §5); `io/ioutil` 47–96 sites; trivy and terraform exclude SA1019 ([gates](go-audit/exemplar-quality-gates.md) §1–2) | GO-LANG |
| M-A-19 | Are octal file modes written `0o644`, not `0644`? | lang | all | uncovered [cfg](go-audit/config-inventory.md) | P3 — legacy form still 63% (212 vs 123) ([run](go-audit/exemplar-runtime-posture.md) §6); gocritic `octalLiteral` | GO-LANG |
| M-A-20 | Where do newer runtime and reflect primitives replace older ones — `runtime.AddCleanup` over `SetFinalizer`, `weak`/`unique` over hand-rolled caches (1.24), `reflect.TypeFor`/`TypeAssert` (1.22/1.25)? Merges two rows. | stdlib, perf | C·D | uncovered [cfg](go-audit/config-inventory.md) | P3 — GC guide ([canon](go-topic-map/canonical.md) §16); `unique` 49 sites, mostly prometheus ([shape](go-audit/exemplar-code-shape.md) §3); `reflecttypefor` fixer | GO-LANG |

### B. Errors — 19 rows (`go-quality/errors.md`, GO-ERR)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-B-01 | Where must `fmt.Errorf` use `%w` rather than `%v`/`%s`, given a `%v`-wrapped error silently breaks `errors.Is`/`As` for every caller above it? | errors | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — 9,310 `%w` vs 2,300 `%v`-of-err; grpc-go 16:1 (`grpc/grpc-go@acccf8cd101a:clientconn.go:326`) ([run](go-audit/exemplar-runtime-posture.md) §1); kubernetes#123234 ([fail](go-topic-map/failure.md) §17); check `errorlint` with `errorf: true` | GO-ERR |
| M-B-02 | When does wrapping a dependency's error with `%w` wrongly make it part of the API, and when must a boundary deliberately use `%v` or translate to an own sentinel? | errors, sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — [Working with Errors in Go 1.13](https://go.dev/blog/go1.13-errors) (conflict 7); reading heuristic: a `%w` of another module's error in an exported function whose doc comment does not name it | GO-ERR |
| M-B-03 | Which error shapes may a package export — sentinel, typed, opaque — and what is the SDK's typed error for a non-zero ocx exit (`*ExitError` carrying the `ExitCode`, matched with `errors.AsType`)? | errors, sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P0 — ocx-sdk-python maps exit codes to 12 typed errors and retries on `TEMP_FAIL` (`_process.py:825,831`, `_types.py:289`) ([cfg](go-audit/config-inventory.md) §3); cli/cli's dispatch ([dom](go-topic-map/domain.md) §5); check: one `errors.AsType` test per exit code | GO-ERR |
| M-B-04 | Is an error compared with `==` or type-asserted where `errors.Is`/`errors.As` is required — including `err == io.EOF` on a possibly wrapped error? | errors | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — 222 `== io.EOF` sites (`aquasecurity/trivy@ae561f8cca36:magefiles/vex.go:304`) ([run](go-audit/exemplar-runtime-posture.md) §1); check `errorlint` comparison + asserts, vet `errorsas` | GO-ERR |
| M-B-05 | Is an error classified by matching its message text (`strings.Contains(err.Error(), …)`)? | errors | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 91 sites, etcd 21 (`cli/cli@9b031151a825:api/queries_repo.go:1535`) ([run](go-audit/exemplar-runtime-posture.md) §1); grep `\.Error\(\)` inside `strings.` calls | GO-ERR |
| M-B-06 | Should `errors.AsType[T]` (1.26) replace the `var t *T; errors.As(err, &t)` two-step in go ≥1.26 modules? | errors | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — `errorsastype` fixer, 15 diagnostics ([shape](go-audit/exemplar-code-shape.md) §7); in production at cli/cli ([dom](go-topic-map/domain.md)) | GO-ERR |
| M-B-07 | Does `errors.Join` compose independent failures (a primary error and a `Close` error), and does a caller's `errors.As` on a joined error match only the first matching member? | errors | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 443 `errors.Join` sites (`cockroachdb/pebble@13596f1e1cea:open.go:867`); `hashicorp/go-multierror` still direct in 2/35 ([modrel](go-audit/exemplar-modules-and-release.md) §2); planted fixture | GO-ERR |
| M-B-08 | Does a function whose result type is `error` (or any interface) return a nil concrete pointer, producing a non-nil interface? | errors, lang | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — the most-cited Go gotcha, permanent by design ([FAQ](https://go.dev/doc/faq#nil_error), [fail](go-topic-map/failure.md) §21); staticcheck SA4023 reimplemented in 2026.2 ([shift](go-topic-map/shifts.md) §10); check SA4023 + gopls `nilness` on a planted fixture | GO-ERR |
| M-B-09 | Is an error both logged and returned (Uber "Handle Errors Once"), or discarded with `_ =`? | errors | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — no linter enforces handle-once ([cod](go-topic-map/codified.md) §9); 1,462 `_ =` sites ([run](go-audit/exemplar-runtime-posture.md) §1); errcheck `check-blank` | GO-ERR |
| M-B-10 | Does code check a non-nil error and then return nil (`nilerr`), or return `nil, nil` (`nilnil`), and is `(nil, nil)` ever the sanctioned "not found" shape? | errors | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — `nilerr` fired 0/2/2 in the strict run, a signal linter ([gates](go-audit/exemplar-quality-gates.md) §5); `nilnil` contested ([cod](go-topic-map/codified.md) Contested) | GO-ERR |
| M-B-11 | Do error strings follow the convention (lower-case, no trailing punctuation, context without "failed to"), with `%w` at the end — and at the front for a sentinel category? | errors | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — ST1005 ([gates](go-audit/exemplar-quality-gates.md) §5); Google Best Practices §Placement of %w ([canon](go-topic-map/canonical.md) §7) | GO-ERR |
| M-B-12 | Is the error from `Close`, `Flush` or `Sync` on a *writable* file or buffered writer checked without masking an earlier error, as distinct from the accepted bare `defer resp.Body.Close()` on a read-only handle? | errors, fs | B·D | uncovered [cfg](go-audit/config-inventory.md) | P0 — 3,294 bare Close/Flush, 440 bare Write ([run](go-audit/exemplar-runtime-posture.md) §1); 100 Go Mistakes #54 ([fail](go-topic-map/failure.md)); check: errcheck on a planted write-then-close fixture, plus reading heuristic "`defer f.Close()` on an `os.Create`/`OpenFile(O_WRONLY)` handle" | GO-ERR |
| M-B-13 | When may library or SDK code panic (programmer errors, violated invariants, `Must*` over compile-time constants), and when must it return an error? | errors, sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P0 — 4,236 panics outside `main`, pebble's 1,148 deliberate ([shape](go-audit/exemplar-code-shape.md) §4) (conflict 8); check: `grep -rn 'panic(' --include='*.go'` excluding `_test.go` and `package main`, each hit carrying an invariant comment | GO-ERR |
| M-B-14 | Is `os.Exit` or `log.Fatal*` called outside `package main`, skipping every deferred cleanup and taking the decision from the caller? | errors, cli | all | partial (`rust-quality/cli-contract.md` EXIT-02) | P0 — 285 `os.Exit` + 359 `log.Fatal*` outside `main` ([shape](go-audit/exemplar-code-shape.md) §4); check revive `deep-exit`, gocritic `exitAfterDefer` | GO-ERR |
| M-B-15 | Does `defer Start()` defer the function that *returns* the cleanup instead of calling the returned cleanup (`defer Start()()`)? | errors, lint | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — SA9010 new in staticcheck 2026.2, postdates all training data ([cod](go-topic-map/codified.md) §5, [fail](go-topic-map/failure.md) §19) | GO-ERR |
| M-B-16 | Does generated code suggest a forthcoming `try`/`?` or a panic-based `must()` as control flow, now that the Go team stopped pursuing error syntax (June 2025)? | errors | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — [go.dev/blog/error-syntax](https://go.dev/blog/error-syntax) ([canon](go-topic-map/canonical.md) §20, [prac](go-topic-map/practitioner.md) §1); `cmp.Or` is the sanctioned helper | GO-ERR |
| M-B-17 | Is failure signalled in-band (`-1`, `""`, nil map) where a `(value, ok)` or `(value, error)` return belongs? | errors, sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — Code Review Comments §In-Band Errors ([canon](go-topic-map/canonical.md) §3) | GO-ERR |
| M-B-18 | Is a custom error type implemented correctly — pointer receiver, `Unwrap() error` or `Unwrap() []error`, `Is`/`As` methods only when matching needs them? | errors | D | uncovered [cfg](go-audit/config-inventory.md) | P2 — trivy's `ExitError`/`UserError` ([run](go-audit/exemplar-runtime-posture.md) §1); gopls `ptrtoerror` ([cod](go-topic-map/codified.md) §3) | GO-ERR |
| M-B-19 | Where does `recover` belong — only at a goroutine or API boundary that converts the panic to an error — and never as ordinary control flow? | errors, concurrency | C·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — 138 `recover` sites vs 4,355 panics ([run](go-audit/exemplar-runtime-posture.md) §1); Effective Go §Recover | GO-ERR |

### C. Concurrency and context — 20 rows (`go-quality/concurrency.md`, GO-CONC)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-C-01 | Who owns every goroutine a library, SDK or CLI starts — is there a join point (`Wait`, `Close`, `Shutdown`) the caller can reach, or can it outlive the call? | concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — Code Review Comments §Goroutine Lifetimes ([canon](go-topic-map/canonical.md) §3); Uber found 857 leaks in 75M LOC ([fail](go-topic-map/failure.md) §9); check: goleak `VerifyTestMain` or a `goroutineleak` profile in the package's tests, plus reading heuristic "every `go` statement has a join in the same function or a documented owner" | GO-CONC |
| M-C-02 | Is every fan-out whose length is data- or wire-controlled bounded (`errgroup.SetLimit`, a semaphore), given 78% of `errgroup.Go` call sites have no `SetLimit`? | concurrency | B·C·D | uncovered [cfg](go-audit/config-inventory.md) | P0 — 194/248 unbounded; 94 `for`-then-`go` sites ([run](go-audit/exemplar-runtime-posture.md) §3); check: reading heuristic "`for` over input feeding `go`/`g.Go` with no `SetLimit` in scope" | GO-CONC |
| M-C-03 | When is `sync.WaitGroup.Go` (1.25) the idiom versus `errgroup`, and is `wg.Add` ever called inside the spawned goroutine? | concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 108 `wg.Go` sites in 12 repos ([run](go-audit/exemplar-runtime-posture.md) §3); vet `waitgroup` (misplaced Add) and the `waitgroupgo` fixer are different tools (conflict 15c) | GO-CONC |
| M-C-04 | Is `errgroup`'s first-error-cancels semantics wrong for a command that must report every failure (batch validate, multi-push), where errors should be collected with `errors.Join`? | concurrency, cli | B | uncovered [cfg](go-audit/config-inventory.md) | P2 — 100 Go Mistakes #73 ([fail](go-topic-map/failure.md) candidate table) | GO-CONC |
| M-C-05 | Which Go-specific race shapes must a reviewer look for beyond a missing mutex — `append` aliasing a shared backing array, closures capturing named results or `err`, concurrent map writes, `t.Parallel` fixtures — and what does `-race` miss? | concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — Uber PLDI'22: slices 391, closures 223, maps 38, parallel tests 139 races ([fail](go-topic-map/failure.md) §3); ASPLOS'19: `-race` caught half of reproduced non-blocking bugs ([fail](go-topic-map/failure.md) §4); check `go test -race ./...` plus the named shapes as reading heuristics | GO-CONC |
| M-C-06 | Which primitive fits which shape — mutex for guarding state, channel for transferring ownership or signalling — and when is a buffer larger than one justified? | concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — conflict 23; Uber "Channel Size is One or None" ([cod](go-topic-map/codified.md) §9) | GO-CONC |
| M-C-07 | Is every channel closed exactly once, by its sender, and never sent on after close — and are `nil`-channel and `select`-without-default blocks deliberate? | concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — message-passing blocking bugs ≥ shared-memory ones ([fail](go-topic-map/failure.md) §4); 427 `close()` sites ([run](go-audit/exemplar-runtime-posture.md) §3); reading heuristic | GO-CONC |
| M-C-08 | Is a `sync.Mutex`, `WaitGroup` or `Once` copied by value (value receiver, struct copy, range copy), and where does vet `copylocks` miss it? | concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — `copylocks` runs under `go vet`, not `go test` ([cod](go-topic-map/codified.md) §1); historical gaps golang/go#20261 ([fail](go-topic-map/failure.md) §18) | GO-CONC |
| M-C-09 | Are typed atomics (`atomic.Int64`, `atomic.Pointer[T]`, 1.19) used instead of function-style `atomic.AddInt64` or `go.uber.org/atomic`? | concurrency, stdlib | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — typed 688 vs function-style 304 ([run](go-audit/exemplar-runtime-posture.md) §3); `atomictypes` fixer (1.27) ([map] M3); conflict 24 | GO-CONC |
| M-C-10 | Is `time.After` in a `select` loop still flagged as a leak (fixed in 1.23, opt-out removed in 1.27) rather than as a per-iteration allocation, and is `Timer.Stop`-and-drain code now dead? | concurrency, perf | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — 100 Go Mistakes #76 downgraded ([fail](go-topic-map/failure.md) §6); `asynctimerchan` removed ([canon](go-topic-map/canonical.md) §19) | GO-CONC |
| M-C-11 | Which leak detector fits which artifact — goleak in tests (`VerifyTestMain` under `t.Parallel`), synctest bubbles, the `goroutineleak` profile (GA 1.27) in long-running processes — and what does each miss (I/O-blocked goroutines, globals)? | concurrency, testing | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — goleak in 1–3 repos ([gates](go-audit/exemplar-quality-gates.md) §4); profile GA ([fail](go-topic-map/failure.md) §7, [eco](go-topic-map/ecosystem-tooling.md)) | GO-CONC |
| M-C-12 | Can a panic in a library-started goroutine crash the caller's process, and must such goroutines recover and report? | concurrency, errors | C·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — `WaitGroup.Go` panic semantics raised by [prac](go-topic-map/practitioner.md); reading heuristic | GO-CONC |
| M-C-13 | Is lazy initialization that can fail done with `sync.OnceValue`/`OnceValues` (1.21) rather than `sync.Once` plus a captured error? | concurrency | B·C | uncovered [cfg](go-audit/config-inventory.md) | P2 — Mat Ryer's `sync.Once` pattern leaves the error path open ([prac](go-topic-map/practitioner.md) §5) | GO-CONC |
| M-C-14 | Is `sync.Map` used where a mutex-guarded map is simpler and faster? | concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P3 — 106 sites ([run](go-audit/exemplar-runtime-posture.md) §3) | GO-CONC |
| M-C-15 | Does `context.Context` come first and flow through every blocking call, or does cancellation stop where a callee starts over with `context.Background()`/`TODO()`? | concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — 964 `Background()` and 275 `TODO()` outside `package main` ([run](go-audit/exemplar-runtime-posture.md) §2); check `contextcheck` (signal: 0/2/1 in the strict run, [gates](go-audit/exemplar-quality-gates.md) §5) and revive `context-as-argument` | GO-CONC |
| M-C-16 | May a `context.Context` be stored in a struct field, and what is the single exception (an interface you do not own)? | concurrency, sdk | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 219–249 fields across 15 repos (`etcd-io/etcd@7583cc6e7e27:client/v3/concurrency/session.go:120`) ([shape](go-audit/exemplar-code-shape.md) §6, [run](go-audit/exemplar-runtime-posture.md) §2); Style Decisions §Contexts; `containedctx` | GO-CONC |
| M-C-17 | Is every `cancel` from `WithCancel`/`WithTimeout`/`WithDeadline` called on every path, normally by an immediate `defer`? | concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 268 not immediately deferred, some legitimately stored ([run](go-audit/exemplar-runtime-posture.md) §2); vet `lostcancel` runs only under `go vet` ([cod](go-topic-map/codified.md) §1) | GO-CONC |
| M-C-18 | Does cancellation carry a cause (`WithCancelCause`, `WithTimeoutCause`, `context.Cause`, and `signal.NotifyContext`'s 1.26 cause), and when are `WithoutCancel`/`AfterFunc` the right tool? Merges two rows. | concurrency, errors | B·C | uncovered [cfg](go-audit/config-inventory.md) | P1 — the 1.21 APIs have 82 uses in 2.66M LOC ([run](go-audit/exemplar-runtime-posture.md) §2); [prac](go-topic-map/practitioner.md) §12; [dom](go-topic-map/domain.md) §6 | GO-CONC |
| M-C-19 | Is `context.Value` limited to request-scoped data with unexported key types? | concurrency | C·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — contested even by its defenders ([prac](go-topic-map/practitioner.md) §13); SA1029 | GO-CONC |
| M-C-20 | Does an embedded `sync.Mutex` leak `Lock`/`Unlock` into an exported type's method set? | concurrency, sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P3 — 105 embedded mutexes, spot-read safe (unexported nested field, `cockroachdb/pebble@13596f1e1cea:wal/failover_writer.go:355-358`) ([run](go-audit/exemplar-runtime-posture.md) §3) | GO-CONC |

### D. API design and packages — 20 rows (`go-quality/api-design.md`, GO-API)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-D-01 | Which layout does a new module take — `main` at the root for one binary, `cmd/<name>/` for several, `internal/` for non-API code, never a new `pkg/`? | sdk, cli | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — conflict 6; `pkg/` in 11/34 with a documented reason in 1 ([shape](go-audit/exemplar-code-shape.md) §1); check: a `pkg/` directory added in a new repository's diff is the finding | GO-API |
| M-D-02 | Does the SDK export exactly one public package and keep everything else under `internal/`, the compiler-enforced analogue of ocx-sdk-python's `__all__` plus underscore modules? | sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P0 — [cfg](go-audit/config-inventory.md) §3 (32 exported names) and pattern 4; check `go list ./...` minus `/internal/` lists only the intended public packages | GO-API |
| M-D-03 | Where is each interface declared — at the consumer by default, at the producer only for a subsystem abstraction with several real implementations — and is any declared before a second use? | sdk | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — conflict 5; ~55/45 producer/consumer at n=20 ([shape](go-audit/exemplar-code-shape.md) §6); reading heuristic: an exported interface with one implementation | GO-API |
| M-D-04 | Do constructors return concrete types and accept the narrowest interface they need? | sdk | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 80% concrete returns at n=20 ([shape](go-audit/exemplar-code-shape.md) §6); `ireturn` linter; Tao of Go ([prac](go-topic-map/practitioner.md) §18) | GO-API |
| M-D-05 | Positional parameters, config struct, or functional options (func-typed or interface-typed) — and must an option return an error when options can conflict? | sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — conflict 4; 107 func-typed option types plus grpc's interface flavour ([shape](go-audit/exemplar-code-shape.md) §3); `go-containerregistry`'s `Option func(*options) error` ([dom](go-topic-map/domain.md) §9) | GO-API |
| M-D-06 | Is the zero value of every exported type useful, so no constructor is required just to initialize a mutex or a map? | sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — proverb "make the zero value useful"; Uber "Zero-value Mutexes are Valid" ([prac](go-topic-map/practitioner.md) §9) | GO-API |
| M-D-07 | Are slices and maps copied at API boundaries so a caller cannot alias the library's internal state (and vice versa)? | sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P1 — Uber "Copy Slices and Maps at Boundaries" ([cod](go-topic-map/codified.md) §9); slices are the largest race category ([fail](go-topic-map/failure.md) §3); no linter — reading heuristic | GO-API |
| M-D-08 | Is package-level mutable state or `init()` used where an explicit instance belongs (Google's litmus: removing it would change every caller's test setup)? | sdk | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 4,875 mutable package vars, 1,040 `init()` ([shape](go-audit/exemplar-code-shape.md) §4); Best Practices §Global state ([canon](go-topic-map/canonical.md) §7); `gochecknoglobals`, `gochecknoinits` | GO-API |
| M-D-09 | Does every exported identifier carry a doc comment with the kind-specific first sentence, `Deprecated: ` paragraphs spelled exactly, and `[pkg.Name]` doc links? | sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) (conflict 26) | P1 — [go.dev/doc/comment](https://go.dev/doc/comment) ([canon](go-topic-map/canonical.md) §10, [eco](go-topic-map/ecosystem-tooling.md) §8); staticcheck ST1000/ST1020-22 non-default ([cod](go-topic-map/codified.md) §5); revive `exported` | GO-API |
| M-D-10 | How does a package deprecate and migrate its own API — a `Deprecated:` note plus a `//go:fix inline` directive (1.26) that `go fix` applies for callers? | sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — [go.dev/blog/inliner](https://go.dev/blog/inliner) ([canon](go-topic-map/canonical.md) §20); `inline` fixer ([map] M3) | GO-API |
| M-D-11 | Is a breaking API change caught before a release (`apidiff`, `gorelease`), knowing `v0` modules are exempt from `gorelease`'s non-zero exit? | sdk, release | A·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — [dom](go-topic-map/domain.md) §19; the go-release skill runs it | GO-API |
| M-D-12 | Are unkeyed composite literals of another module's struct types written (broken by a field addition), and does vet `composites` run where it matters? | sdk, lang | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — vet `composites` only under `go vet` ([cod](go-topic-map/codified.md) §1); go-cmp's 7 vet hits are deliberate fixtures ([gates](go-audit/exemplar-quality-gates.md) §5) | GO-API |
| M-D-13 | Does an exported struct embed a type whose methods then leak into its API, or export a field that should be internal? | sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P2 — Uber "Avoid Embedding Types in Public Structs" ([prac](go-topic-map/practitioner.md) §9) | GO-API |
| M-D-14 | Do names follow Go conventions — no `util`/`common`/`base` packages, no stutter, no `Get` prefix, consistent receiver names and receiver kinds, initialisms in MixedCaps? Merges the receiver-type row. | sdk | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — Code Review Comments, Google guide ([canon](go-topic-map/canonical.md)); revive `var-naming`, `receiver-naming`; ST1003, ST1016 non-default | GO-API |
| M-D-15 | Is the concurrency safety of every exported type that is not obviously safe stated in its doc comment? | sdk, concurrency | D | uncovered [cfg](go-audit/config-inventory.md) | P2 — Google Best Practices ("the author must say") ([prac](go-topic-map/practitioner.md) §8) | GO-API |
| M-D-16 | Are enum-like constants typed, starting at 1 so the zero value means "unset", with a `String()` from `stringer` and exhaustive switches? | sdk, lang | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — Uber "Start Enums at One" ([prac](go-topic-map/practitioner.md) §9); `exhaustive` linter ([cfg](go-audit/config-inventory.md) EXIT-07 note) | GO-API |
| M-D-17 | What is the SDK's shape for wrapping the ocx CLI — a client type, typed result structs decoded from the JSON envelope, typed errors per exit code, retry on `TempFail`, no runtime dependencies? | sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P0 — the first named consumer; ocx-sdk-python's commitments table ([cfg](go-audit/config-inventory.md) §3); check `go list -deps ./...` shows only stdlib and the module's own packages | GO-API |
| M-D-18 | Should the SDK depend on an OCI client library (`go-containerregistry`, `oras-go` v2, `regclient`) or only wrap the CLI? | sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P1 — contested, no documented argument either way ([dom](go-topic-map/domain.md) Contested); frame hypothesis is wrap-only | GO-API |
| M-D-19 | Do APIs accept `io.Reader`/`io.Writer`/`fs.FS` rather than paths or whole `[]byte` where streaming or testing matters? | sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — Cheney "don't force allocations on your callers" ([prac](go-topic-map/practitioner.md) §4) | GO-API |
| M-D-20 | Does the SDK's exported surface avoid `any`/`interface{}` in signatures (the Go analogue of ocx-sdk-python's 100% typed surface)? | sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P1 — [cfg](go-audit/config-inventory.md) §3; check `go doc -all .` output grepped for `\bany\b` and `interface{}` | GO-API |

### E. Testing — 18 rows (`go-quality/testing.md`, GO-TEST)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-E-01 | Which assertion style do new fleet tests use — stdlib `if` + `t.Errorf` + `cmp.Diff` — and under what conditions is testify tolerated? | testing | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — conflict 1; check: `grep -rl 'github.com/stretchr/testify' --include='*_test.go' .` in a repository that did not already use it is the finding (or a depguard deny) | GO-TEST |
| M-E-02 | Does every `cmp.Diff` handle unexported fields (`cmpopts.IgnoreUnexported`, `protocmp.Transform`) instead of panicking, and print `(-want +got)` in the order of its arguments? | testing | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — cmpopts in 13 repos ([gates](go-audit/exemplar-quality-gates.md) §4); Test Comments §Print Diffs ([canon](go-topic-map/canonical.md) §4) | GO-TEST |
| M-E-03 | Are table tests shaped with `t.Run`, human-readable names, and no `tc := tc` copy in go ≥1.22 modules? | testing | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — [canon](go-topic-map/canonical.md) §4; 142 copies ([shape](go-audit/exemplar-code-shape.md)) | GO-TEST |
| M-E-04 | Does every helper call `t.Helper()`, fail setup with `t.Fatal`, and never call `t.Fatal`/`FailNow` from a goroutine it spawned? | testing, concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — vet `testinggoroutine` ([cod](go-topic-map/codified.md) §1); Best Practices §Tests ([canon](go-topic-map/canonical.md) §7); `thelper` | GO-TEST |
| M-E-05 | Does `t.Parallel` share mutated fixtures or globals across subtests, and are `paralleltest`/`tparallel` signal or noise for a small suite? | testing | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — 139 parallel-test races ([fail](go-topic-map/failure.md) §3); `paralleltest` 265/1,012/108 in the strict run — noise ([gates](go-audit/exemplar-quality-gates.md) §5) | GO-TEST |
| M-E-06 | Do tests use `t.Context()`, `t.TempDir()`, `t.Setenv()`, `t.Chdir()` and `t.Cleanup()` (1.24 floor for Context/Chdir) instead of `context.Background()`, `os.MkdirTemp`, `os.Setenv` and `defer`? | testing | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — conflict 13; `usetesting` linter; `testingcontext` fixer ([map] M3) | GO-TEST |
| M-E-07 | Is time-dependent concurrent code tested with `testing/synctest.Test` (GA 1.25; `Run` removed 1.26; `Sleep` 1.27) instead of real sleeps or an injected clock? | testing, concurrency | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 10/34 repos ([gates](go-audit/exemplar-quality-gates.md) §4); clockwork only in etcd ([run](go-audit/exemplar-runtime-posture.md) §8) | GO-TEST |
| M-E-08 | Do golden files follow one `-update` flag convention under `testdata/`, and are they deterministic? | testing | B | uncovered [cfg](go-audit/config-inventory.md) | P2 — 561 golden files in 5 repos, `-update` flags in 6 ([gates](go-audit/exemplar-quality-gates.md) §4) | GO-TEST |
| M-E-09 | Does every parser of untrusted input (OCI manifest, config, archive header, the SDK's JSON envelope) have a `FuzzXxx` test with a seed corpus under `testdata/fuzz/`, and does CI run it? | testing, security | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — 122 fuzz functions, concentrated in parsers ([shape](go-audit/exemplar-code-shape.md) §2); CI fuzzing in 3/32 repos ([gates](go-audit/exemplar-quality-gates.md) §3); [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz) | GO-TEST |
| M-E-10 | How is coverage measured and gated — `-coverpkg`, `-covermode=atomic` with `-race`, integration coverage via `go build -cover` + `GOCOVERDIR` + `go tool covdata`, and a threshold script (stdlib has no fail-under)? | testing | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — ocx-sdk-python gates at 100% ([cfg](go-audit/config-inventory.md) §3); an unset `GOCOVERDIR` drops data with only a warning ([eco](go-topic-map/ecosystem-tooling.md) §4) | GO-TEST |
| M-E-11 | Does CI run `go test -race` on every change or in a separate lane, given 5–10× memory and 2–20× time? | testing | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — `-race` in 17/32 repos' CI ([gates](go-audit/exemplar-quality-gates.md) §3); overhead ([canon](go-topic-map/canonical.md) §17) | GO-TEST |
| M-E-12 | Are Example functions used as tested documentation, and does an Example without `// Output:` silently only compile? | testing, sdk | A·D | covered-elsewhere (`docs-instrument` tested-examples-by-language.md:42-43, [cfg](go-audit/config-inventory.md) §6) | P2 — 344 Example functions ([shape](go-audit/exemplar-code-shape.md) §2); `go help testfunc` ([eco](go-topic-map/ecosystem-tooling.md) §1) | GO-TEST |
| M-E-13 | Do benchmarks use `b.Loop()` (1.24) — knowing the `bloop` modernizer is excluded from the safe suite because it may skew results — and are results compared with `benchstat`? | testing, perf | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — 340 `b.Loop` vs 358 `b.N` ([shape](go-audit/exemplar-code-shape.md) §2); golang/go#74967 ([cod](go-topic-map/codified.md) §2); `benchstat` in 0 repos | GO-TEST |
| M-E-14 | Which test package is the default (`package x` white-box is 83% of the corpus vs `x_test` black-box), and do fixtures live under `testdata/` or `_`-prefixed directories the go tool ignores? Merges two rows. | testing | all | uncovered [cfg](go-audit/config-inventory.md) | P3 — [shape](go-audit/exemplar-code-shape.md) §1–2 | GO-TEST |
| M-E-15 | How is a CLI tested end to end — an in-process `run(args, stdin, stdout, stderr)` call, `testscript`, or the built binary under `GOCOVERDIR`? | testing, cli | B | uncovered [cfg](go-audit/config-inventory.md) | P1 — `testscript` in 1 repo ([gates](go-audit/exemplar-quality-gates.md) §4); Ryer's `run` ([prac](go-topic-map/practitioner.md) §5) | GO-TEST |
| M-E-16 | Are real transports (`httptest.Server`) used rather than mocked clients, and when a mock is warranted, is it `go.uber.org/mock` rather than the archived `github.com/golang/mock`? | testing | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — `httptest` in 23 repos ([gates](go-audit/exemplar-quality-gates.md) §4); `golang/mock` archived 2024-01-08 ([shift](go-topic-map/shifts.md) §16); Best Practices §Use real transports | GO-TEST |
| M-E-17 | Does a malformed `Test`/`Benchmark`/`Fuzz`/`Example` signature silently never run, and does vet's `tests` analyzer catch it? | testing | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — `tests` runs in `go test`'s vet subset ([cod](go-topic-map/codified.md) §1) | GO-TEST |
| M-E-18 | How is a subprocess wrapper tested without the real binary — `TestMain` re-exec with a helper-process env var, a stub binary built in `TestMain`, or a fake on `PATH`? | testing, sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P1 — the SDK's core boundary ([cfg](go-audit/config-inventory.md) §3); stdlib `os/exec`'s own tests use the helper-process pattern | GO-TEST |

### F. CLI contract — 16 rows (`go-quality/cli-contract.md`, GO-CLI)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-F-01 | Does a Go CLI reuse the fleet's pinned exit table (0, 1, 64–78, 79–86) through one typed `ExitCode` and a two-line `main` over a testable `run(...)`? | cli | B | partial (`rust-quality/cli-contract.md` EXIT-01/02/04/06/08) | P0 — cli/cli's `Main()` + two-line `cmd/gh/main.go` ([dom](go-topic-map/domain.md) §5); check: `grep -rn 'os.Exit(' --include='*.go' .` hits only `main.go`, never with a literal other than the typed code | GO-CLI |
| M-F-02 | Is every error classified into an exit code by one ordered `errors.Is`/`errors.AsType` chain with a test-locked fall-through, given Go has no closed enums? | cli, errors | B | partial (EXIT-07, EXIT-09) | P0 — `cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212` ([dom](go-topic-map/domain.md) §5); check `exhaustive` linter plus one test per code ([cfg](go-audit/config-inventory.md) §4) | GO-CLI |
| M-F-03 | Do flag and argument errors exit 64 despite cobra's default exit 1 (with `SilenceUsage` and `SilenceErrors` both false by default) and urfave/cli v3's `cli.Exit`/`ExitCoder`? | cli | B | partial (EXIT-03) | P0 — `spf13/cobra@adbc8813901b:command.go:235-239` ([dom](go-topic-map/domain.md) §1); check: integration test `cli --bogus-flag` asserts exit status 64 | GO-CLI |
| M-F-04 | What happens when stdout's reader closes early — default death by `SIGPIPE` (status 141), not the pinned clean exit 0 — and what central handling meets CLI-05? | cli | B | partial (CLI-05), scouts disagree (conflict 16) | P0 — [os/signal §SIGPIPE](https://pkg.go.dev/os/signal); check: `./cli list \| head -1; echo "${PIPESTATUS[0]}"` prints 0 and stderr is empty | GO-CLI |
| M-F-05 | Does a child's exit status pass through unchanged — `ExitError.ExitCode()`, and `-1` on signal death mapped to 128+N through `syscall.WaitStatus` (Unix only)? | cli, sdk | B·D | partial (EXIT-05) | P0 — [cfg](go-audit/config-inventory.md) §4 EXIT-05 note; cli/cli's `ExternalCommandExitError` passthrough ([dom](go-topic-map/domain.md) §5); check: test a child that kills itself with SIGTERM, expect 143 | GO-CLI |
| M-F-06 | Does SIGINT/SIGTERM handling use `signal.NotifyContext`, drain in-flight work, derive the exit status from the signal (130/143, never hard-coded), and cope with Windows having no `SIGTERM`? | cli | B·C | partial (EXIT-11) | P1 — `NotifyContext` 17 vs `Notify` 71 ([run](go-audit/exemplar-runtime-posture.md) §2); 1.26 cancel cause ([dom](go-topic-map/domain.md) §6) | GO-CLI |
| M-F-07 | Does stdout carry only the result — logs, progress and errors on stderr — and under a JSON flag only the pinned envelope? | cli | B | partial (CLI-01/02/04) | P0 — the fleet contract; check `grep -rn -e 'fmt.Print' -e 'os.Stdout' --include='*.go' .` outside the output layer, plus a test that parses the whole captured stdout as JSON | GO-CLI |
| M-F-08 | Is multi-line output written through a `bufio.Writer` that is flushed on every exit path, since `os.Stdout` is unbuffered in Go? | cli, perf | B | partial (CLI-06) | P2 — [cfg](go-audit/config-inventory.md) §4 (more necessary in Go than in Rust) | GO-CLI |
| M-F-09 | Is the error chain rendered once, at `main`'s boundary, sanitized of control and bidi characters that a registry-supplied name could carry (CWE-150)? | cli, security | B | partial (CLI-03) | P1 — GHSA-fwjx-9p69-h25h in a Go CLI ([dom](go-topic-map/domain.md) §20) | GO-CLI |
| M-F-10 | Is colour decided per stream — `x/term.IsTerminal` (plus go-isatty's Cygwin check on Windows), `NO_COLOR` present and non-empty, `TERM=dumb`, a `--color` flag — in one module? | cli | B | partial (CLI-07/08) | P1 — [no-color.org](https://no-color.org/), [clig.dev](https://clig.dev/) ([dom](go-topic-map/domain.md) §4, §16–17) | GO-CLI |
| M-F-11 | Are prompts shown only when stdin is a TTY with a non-interactive bypass, secrets read with `term.ReadPassword`, and never accepted as flag values or plain env vars? | cli, security | B | partial (CLI-09/11) | P1 — [dom](go-topic-map/domain.md) §15 | GO-CLI |
| M-F-12 | Which CLI framework do fleet Go CLIs use — cobra + pflag, urfave/cli v3, or stdlib `flag` — and are global flags `PersistentFlags` on the root? | cli | B | uncovered [cfg](go-audit/config-inventory.md) | P1 — cobra direct in 14/35, pflag 9/35 ([modrel](go-audit/exemplar-modules-and-release.md) §2); urfave v3.13.0 current and context-first ([shift](go-topic-map/shifts.md) §16, [dom](go-topic-map/domain.md) §3); owner question 3 | GO-CLI |
| M-F-13 | Are completions and man pages generated from the parsing tree, help text ASCII and short, and does anything print within ~100 ms of a network call? Merges CLI-12/14/16. | cli | B | partial (CLI-12/14/16) | P3 — cobra generates completions natively ([cfg](go-audit/config-inventory.md) §4) | GO-CLI |
| M-F-14 | Do config, cache and data paths come from `os.UserConfigDir`/`UserCacheDir`, with env vars prefixed and precedence flags > env > project > user > system — and is viper proportionate? | cli | B | partial (CLI-13/15) | P2 — stdlib beats Rust's `directories` crate here ([cfg](go-audit/config-inventory.md) §4); viper vs koanf ([shift](go-topic-map/shifts.md) §16) | GO-CLI |
| M-F-15 | Does a bubbletea TUI yield signal handling to the outer `NotifyContext` (`WithoutSignalHandler`) and restore the terminal on every exit path? | cli | B | partial (`rust-quality/tui.md` shape) | P3 — [dom](go-topic-map/domain.md) §21 | GO-CLI |
| M-F-16 | Is a mutating subcommand safe to re-run after a crash mid-operation (idempotent publish, resumable ingest)? | cli, fs | B | partial (Rust CLI contract shape) | P2 — [canon](go-topic-map/canonical.md) candidate row; containerd's ingest contract ([dom](go-topic-map/domain.md) §12) | GO-CLI |

### G. Files and processes — 18 rows (`go-quality/io.md`, GO-IO)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-G-01 | Does every write that must survive a crash publish atomically — `os.CreateTemp` in the target directory, write, `Sync`, checked `Close`, `os.Rename`, directory fsync, cleanup only on failure? | fs | B·D | partial (`rust-quality/durable-state.md` shape) | P0 — `CreateTemp` 105 ≈ `Rename` 101 vs 388 `os.WriteFile` ([run](go-audit/exemplar-runtime-posture.md) §6); renameio's three subtleties ([dom](go-topic-map/domain.md) §18); no linter anywhere ([cod](go-topic-map/codified.md)); check: kill-mid-write fixture, plus reading heuristic "`os.WriteFile`/`os.Create` on a final path" | GO-IO |
| M-G-02 | What does atomic replace mean on Windows, where renameio exports nothing and the Rust fleet runs a bounded remove-then-rename retry? | fs | B | partial (`rust-quality/platform-and-paths.md` shape) | P1 — [dom](go-topic-map/domain.md) §18, §22; golang/go#22397 | GO-IO |
| M-G-03 | Does a content-addressed store stage blobs off the final path (unlike oras-go's write-in-place) and serialize concurrent ingest of the same digest? | fs, concurrency | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — `oras-project/oras-go@cb6d6dc79f83:content/file/file.go:499-518`; containerd's `Writer`/`Ref` contract ([dom](go-topic-map/domain.md) §10, §12) | GO-IO |
| M-G-04 | Are untrusted relative paths confined with `os.Root`/`OpenInRoot` (1.24, full method set 1.25), with its documented gaps (bind mounts, `/proc`, device files, `Chmod` race, `js`/`plan9`) known? | fs, security | B·D | uncovered [cfg](go-audit/config-inventory.md) | P0 — 19–44 `os.Root` sites (`aquasecurity/trivy@ae561f8cca36:pkg/x/os/root.go:12-16`) ([run](go-audit/exemplar-runtime-posture.md) §6, [shape](go-audit/exemplar-code-shape.md) §3); `os/root.go` doc ([dom](go-topic-map/domain.md) §8); check: reading heuristic "`filepath.Join(base, <untrusted>)` then open" | GO-IO |
| M-G-05 | Does archive extraction reject `..`, absolute and symlink-escaping entries (`filepath.IsLocal`, `os.Root`) and bound decompressed size? | fs, security | B | uncovered [cfg](go-audit/config-inventory.md) | P0 — guard idiom within 40 lines at 9/92 sites, a lower bound ([run](go-audit/exemplar-runtime-posture.md) §6); CVE-2025-3445 ([fail](go-topic-map/failure.md) §15); check gosec G110/G305 plus a planted zip-slip fixture | GO-IO |
| M-G-06 | Are permissions least-privilege (`0o755`, `0o600` for secrets, never `0777`) and umask-aware? | fs, security | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — 64 `MkdirAll(…, 0777)` (`bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/go_path.go:153`) ([run](go-audit/exemplar-runtime-posture.md) §6); gosec G301/G302/G306/G307 (G307 re-meant, [cod](go-topic-map/codified.md) §6) | GO-IO |
| M-G-07 | Is `path/filepath` used for OS paths and `path` only for slash paths, and are digest- or tag-derived file names safe on Windows (reserved names, case-insensitivity)? | fs | B | uncovered [cfg](go-audit/config-inventory.md) | P1 — zero lint coverage in any catalogue ([cod](go-topic-map/codified.md)); Windows runners in 18/32 repos' CI ([gates](go-audit/exemplar-quality-gates.md) §3) | GO-IO |
| M-G-08 | Does every subprocess start with `exec.CommandContext` and bound its exit with `Cmd.WaitDelay` (and a custom `Cancel` where SIGTERM is wanted), instead of a hand-rolled timer and `Process.Kill`? | fs, sdk | B·D | uncovered [cfg](go-audit/config-inventory.md) | P0 — 443 `exec.Command` vs 141 `CommandContext`; `WaitDelay` 8, `Cancel` 4 ([run](go-audit/exemplar-runtime-posture.md) §6); check `grep -rn 'exec.Command(' --include='*.go' .` (noctx does not cover exec — to be confirmed) | GO-IO |
| M-G-09 | Does cancellation reach the whole process tree (`Setpgid` plus a group kill on Unix, a job object on Windows), or only the immediate child? | fs, sdk | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — [dom](go-topic-map/domain.md) candidate row | GO-IO |
| M-G-10 | Are binaries resolved safely (`exec.ErrDot` since 1.19, never disabled with `execerrdot`) and argv passed directly, never through `sh -c`? | fs, security | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — [dom](go-topic-map/domain.md) §7; 5 `sh -c` sites ([run](go-audit/exemplar-runtime-posture.md) §6); gosec G204 | GO-IO |
| M-G-11 | Is a child's captured output bounded, and are stdout and stderr drained concurrently so a full pipe cannot deadlock the parent? | fs, sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P1 — the SDK parses ocx's stdout envelope and must not lose stderr ([cfg](go-audit/config-inventory.md) §3) | GO-IO |
| M-G-12 | Is a started-but-never-waited `exec.Cmd` detectable with the undocumented `GODEBUG=execwait=2` finalizer in 1.27.1's `os/exec`? | fs, testing | B·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — found in stdlib source, in no release note ([dom](go-topic-map/domain.md) §7) | GO-IO |
| M-G-13 | Are secrets passed to children through env or stdin, never argv where `ps` shows them? | fs, security | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — `docker login -p` in argv at `aquasecurity/trivy@ae561f8cca36:pkg/fanal/test/integration/docker/docker.go:63` ([run](go-audit/exemplar-runtime-posture.md) §6) | GO-IO |
| M-G-14 | Is a child's environment built explicitly from an allowlist helper rather than inherited wholesale? | fs, sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P2 — ocx-sdk-python's `ComposedEnv` ([cfg](go-audit/config-inventory.md) §3) | GO-IO |
| M-G-15 | Does every on-disk format (index, lock, cache metadata) carry a schema version or magic number from its first release? | fs | B | uncovered [cfg](go-audit/config-inventory.md) | P2 — [canon](go-topic-map/canonical.md), [dom](go-topic-map/domain.md) candidate rows | GO-IO |
| M-G-16 | How does Go code take a cross-process file lock, given the stdlib has no portable API (`flock` vs `LockFileEx`)? | fs, concurrency | B | uncovered [cfg](go-audit/config-inventory.md) | P2 — the Rust fleet's `FileLock` ([dom](go-topic-map/domain.md) §22) | GO-IO |
| M-G-17 | When are static assets embedded with `//go:embed` rather than read at runtime from a path relative to the binary? | fs | B | uncovered [cfg](go-audit/config-inventory.md) | P3 — 199 `//go:embed` directives ([shape](go-audit/exemplar-code-shape.md) §5) | GO-IO |
| M-G-18 | Does cross-platform code account for Windows symlink and reparse-point semantics (`winsymlink`, `winreadlinkvolume`, 1.23)? | fs | B | uncovered [cfg](go-audit/config-inventory.md) | P3 — [shift](go-topic-map/shifts.md) §2 | GO-IO |

### H. Network and registry clients — 14 rows (`go-quality/network.md`, GO-NET)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-H-01 | Does every `http.Client` have a `Timeout` or every request a context deadline, and is `http.Get`/`http.DefaultClient` avoided? | http | B·C·D | uncovered [cfg](go-audit/config-inventory.md) | P0 — 87/143 client literals without `Timeout`, 128 default-client calls ([run](go-audit/exemplar-runtime-posture.md) §5); check `noctx` and `grep -rn -e 'http.Get(' -e 'http.DefaultClient' --include='*.go' .` | GO-NET |
| M-H-02 | Does every `http.Server` set `ReadHeaderTimeout` and shut down with `Shutdown(ctx)` after a signal? | http | C | uncovered [cfg](go-audit/config-inventory.md) | P1 — 41/56 without it (gosec G112) ([run](go-audit/exemplar-runtime-posture.md) §5); Ryer's shutdown ([prac](go-topic-map/practitioner.md) §5) | GO-NET |
| M-H-03 | Are requests built with `NewRequestWithContext`, and every response body closed and drained so the connection returns to the pool? | http | B·C·D | uncovered [cfg](go-audit/config-inventory.md) | P0 — `bodyclose` fired 88 times on oras-go, a signal linter ([gates](go-audit/exemplar-quality-gates.md) §5); 100 Go Mistakes #79, #81; check `bodyclose`, `noctx` | GO-NET |
| M-H-04 | Is an untrusted body bounded (`io.LimitReader`, `http.MaxBytesReader`) before `io.ReadAll`? | http, security | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — 215 `ReadAll` of a body vs 105 limit sites ([run](go-audit/exemplar-runtime-posture.md) §5) | GO-NET |
| M-H-05 | Which statuses are retried (408, 429, 5xx), with what backoff and jitter, honouring `Retry-After` in both delay-seconds and HTTP-date forms, and only for idempotent requests? | http | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — go-containerregistry's defaults; regclient drops the HTTP-date form (`internal/reghttp/http.go:687-715`) ([dom](go-topic-map/domain.md) §9, §11) | GO-NET |
| M-H-06 | Is `Authorization` stripped on a cross-host redirect (a registry redirecting to a CDN), and what does `net/http`'s default `CheckRedirect` do today? | http, security | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — [dom](go-topic-map/domain.md) candidate row; needs a primary-source check | GO-NET |
| M-H-07 | Is streamed content verified before use — size first, then digest — knowing go-containerregistry's `verify.ReadCloser` and go-digest's `Verifier` only check at EOF and a prefix read verifies nothing? | http, security | B·D | uncovered [cfg](go-audit/config-inventory.md) | P0 — [dom](go-topic-map/domain.md) §9, §13-14; check: planted short-read fixture that must fail | GO-NET |
| M-H-08 | Does digest parsing accept the OCI grammar (`sha256`, `sha512`, `blake3`) and reject malformed input? | sdk | B·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — image-spec `descriptor.md` ([dom](go-topic-map/domain.md) §13) | GO-NET |
| M-H-09 | Which transport defaults (dial and TLS-handshake timeouts, idle-connection limits, `ProxyFromEnvironment`) should a registry client set? | http | B·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — go-containerregistry's `DefaultTransport` ([dom](go-topic-map/domain.md) §9) | GO-NET |
| M-H-10 | Which OCI client library, if any, do fleet CLIs build on, and do they honour Docker's `config.json` and credential helpers? | sdk | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — go-containerregistry direct in 6/35 ([modrel](go-audit/exemplar-modules-and-release.md) §2); oras-go's `NewStoreWithFallbacks` ([dom](go-topic-map/domain.md) §10) | GO-NET |
| M-H-11 | Is `host:port` built with `net.JoinHostPort`, which vet's `hostport` analyzer (1.25) checks? | http | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — [shift](go-topic-map/shifts.md) §4; also a `go fix` analyzer ([map] M3) | GO-NET |
| M-H-12 | Do new HTTP services use `net/http.ServeMux` patterns (1.22) rather than adding `gorilla/mux` (last push 2024-08)? | http | C | uncovered [cfg](go-audit/config-inventory.md) | P2 — [shift](go-topic-map/shifts.md) §16 | GO-NET |
| M-H-13 | Do networking APIs use `net/netip` value types rather than slice-backed `net.IP`? | http, sdk | D | uncovered [cfg](go-audit/config-inventory.md) | P2 — Tailscale's rationale ([fail](go-topic-map/failure.md) §11) | GO-NET |
| M-H-14 | Where do `http.CrossOriginProtection` (1.25) and `ReverseProxy.Rewrite` (over the deprecated `Director`, 1.26) apply? | http | C | uncovered [cfg](go-audit/config-inventory.md) | P3 — [prac](go-topic-map/practitioner.md) §7; [shift](go-topic-map/shifts.md) §13 | GO-NET |

### I. Security — 12 rows (`go-quality/security.md`, GO-SEC)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-I-01 | How is a govulncheck result triaged — symbol-level reachability first (3 of 22 findings reachable on 6 repos), imported-only and required-only findings as scheduled upgrades? | security | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — [modrel](go-audit/exemplar-modules-and-release.md) §2 (`GO-2026-6348` reachable in ko); check `govulncheck ./...` (text mode exits non-zero on a reachable finding) | GO-SEC |
| M-I-02 | Does `govulncheck -mode=binary` audit the upstream Go binaries the fleet mirrors and the binaries it ships, including stripped `-s -w` builds? | security, release | B | uncovered [cfg](go-audit/config-inventory.md) | P1 — two distinct fleet use cases ([cod](go-topic-map/codified.md) §11); the mirror carries four bazelbuild Go binaries ([cfg](go-audit/config-inventory.md) §5) | GO-SEC |
| M-I-03 | Which gosec rules are signal and which noise (G115 contested, G104 duplicating errcheck, taint rules G7xx), and does every `//nolint:gosec`/`#nosec` carry a reason? | security, lint | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 237 suppressions, trivy's reasoned form ([run](go-audit/exemplar-runtime-posture.md) §7); conflict 25 | GO-SEC |
| M-I-04 | Is `crypto/rand` used for every token, key, nonce and password salt, and never `math/rand` of either version? | security | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — 91 `math/rand` v1 files never classified by use ([run](go-audit/exemplar-runtime-posture.md) §7); check gosec G404 | GO-SEC |
| M-I-05 | Is `InsecureSkipVerify` confined to annotated test code, `MinVersion` at least TLS 1.2, and no custom cipher list set? | security, http | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 14 `InsecureSkipVerify`, 3/4 annotated ([run](go-audit/exemplar-runtime-posture.md) §5); gosec G402 | GO-SEC |
| M-I-06 | Are secrets kept out of logs, error strings and marshalled structs (gosec G117), and compared with `subtle.ConstantTimeCompare`? | security | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — [cod](go-topic-map/codified.md) §6; 26 constant-time sites ([run](go-audit/exemplar-runtime-posture.md) §7) | GO-SEC |
| M-I-07 | Is `html/template` used for every HTML sink, with `text/template` never reaching one? | security | C | uncovered [cfg](go-audit/config-inventory.md) | P2 — 71 `text/template` vs 33 `html/template`, sinks untraced ([run](go-audit/exemplar-runtime-posture.md) §7) | GO-SEC |
| M-I-08 | What is the policy for `unsafe`, `//go:linkname` and cgo in fleet SDKs and CLIs? | security, release | B·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — `unsafe` in 325 files, 18 `linkname`, real cgo in 2/35 repos ([shape](go-audit/exemplar-code-shape.md) §5, [modrel](go-audit/exemplar-modules-and-release.md) §7); check `grep -rn -e '"unsafe"' -e '//go:linkname' -e 'import "C"' --include='*.go' .` | GO-SEC |
| M-I-09 | Are untrusted inputs size-bounded beyond HTTP bodies (JSON decoders, `ParseMultipartForm` G120), and when does stdlib `regexp`'s RE2 linearity stop being enough? Merges the ReDoS row. | security | B·C·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — [cod](go-topic-map/codified.md) §6; RE2 is linear by construction ([fail](go-topic-map/failure.md) §13) | GO-SEC |
| M-I-10 | Is FIPS 140-3 mode (`GOFIPS140`, `GODEBUG=fips140`) a deliberate build-time decision rather than an accident? | security | B | uncovered [cfg](go-audit/config-inventory.md) | P3 — [prac](go-topic-map/practitioner.md), [shift](go-topic-map/shifts.md) §3 | GO-SEC |
| M-I-11 | Which CodeQL-only query shapes (missing JWT signature check, incomplete hostname regex, always-nil wrapped error) matter without running CodeQL? | security | C | uncovered [cfg](go-audit/config-inventory.md) | P3 — [cod](go-topic-map/codified.md) §10 | GO-SEC |
| M-I-12 | Is post-quantum signing (`crypto/mldsa`, 1.27) something fleet code should adopt now? | security | B·D | uncovered [cfg](go-audit/config-inventory.md) | P3 — too new for a position ([prac](go-topic-map/practitioner.md)) | GO-SEC |

### J. Observability and performance — 12 rows (`go-quality/observability.md`, GO-OBS)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-J-01 | Does new code log through `log/slog`, and when is zap still justified? | stdlib | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — conflict 9; `sloglint` | GO-OBS |
| M-J-02 | Does a library avoid configuring global logging, accepting a `*slog.Logger` or `slog.Handler` (discard by default) instead? | sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — [slog blog](https://go.dev/blog/slog); check `grep -rn -e 'slog.SetDefault' -e 'log.SetOutput' --include='*.go' .` outside `package main` | GO-OBS |
| M-J-03 | Are slog calls well-formed — constant messages, matched key-value pairs, typed `Attr`s where hot? | stdlib | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — vet `slog` analyzer ([cod](go-topic-map/codified.md) §1); `sloglint` | GO-OBS |
| M-J-04 | Is `net/http/pprof` mounted only behind a flag or an admin listener? | perf, security | C | uncovered [cfg](go-audit/config-inventory.md) | P1 — 26 imports never checked for gating ([run](go-audit/exemplar-runtime-posture.md) §4) | GO-OBS |
| M-J-05 | When do `GOGC`/`GOMEMLIMIT` tuning and GC-pause concerns apply (long-lived services, big pointer-rich caches) and when not (short-lived CLIs)? | perf | C | uncovered [cfg](go-audit/config-inventory.md) | P2 — Discord's cache postmortem ([fail](go-topic-map/failure.md) §10); GC guide ([canon](go-topic-map/canonical.md) §16) | GO-OBS |
| M-J-06 | Is worker sizing taken from `runtime.GOMAXPROCS(0)` (container-aware since 1.25), making `go.uber.org/automaxprocs` redundant? | perf, concurrency | C | uncovered [cfg](go-audit/config-inventory.md) | P2 — automaxprocs in 3 repos ([run](go-audit/exemplar-runtime-posture.md) §4); [container-aware GOMAXPROCS](https://go.dev/blog/container-aware-gomaxprocs) | GO-OBS |
| M-J-07 | When is PGO (`default.pgo`) worth adopting, and how is a stale profile noticed? | perf | C | uncovered [cfg](go-audit/config-inventory.md) | P3 — [canon](go-topic-map/canonical.md) §14, [eco](go-topic-map/ecosystem-tooling.md) §5 | GO-OBS |
| M-J-08 | Which profiling tool fits which symptom — CPU/heap/alloc profiles, the execution trace, `trace.FlightRecorder` (1.25), the `goroutineleak` profile (1.27)? | perf | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — [canon](go-topic-map/canonical.md) §15; [eco](go-topic-map/ecosystem-tooling.md) Summary; feeds the go-diagnose skill | GO-OBS |
| M-J-09 | Are hot paths allocation-aware — preallocated capacity, `strconv` over `fmt`, no repeated `[]byte`↔`string` conversion? | perf | all | uncovered [cfg](go-audit/config-inventory.md) | P3 — Uber §Performance ([cod](go-topic-map/codified.md) §9); `prealloc`, `perfsprint` (noise-leaning) | GO-OBS |
| M-J-10 | Do exported Prometheus metrics follow naming and unit conventions, prefer native histograms over summaries, and keep label cardinality bounded? | perf | C | uncovered [cfg](go-audit/config-inventory.md) | P3 — [eco](go-topic-map/ecosystem-tooling.md) §16; services are not a named consumer | GO-OBS |
| M-J-11 | Should an SDK instrument itself with OpenTelemetry (traces and metrics stable, logs only RC in 2026, `/x` packages unstable), and should services export `runtime/metrics` keys instead of hand-rolled gauges? Merges two rows. | sdk, perf | C·D | uncovered [cfg](go-audit/config-inventory.md) | P3 — [eco](go-topic-map/ecosystem-tooling.md) §17, [shift](go-topic-map/shifts.md) §17 | GO-OBS |
| M-J-12 | Are `GOEXPERIMENT` pins in CI and Dockerfiles stale after defaults flipped (Swiss maps 1.24, Green Tea GC 1.26, jsonv2 1.27), and do goroutine labels in tracebacks (`tracebacklabels`, default on in 1.27) change log parsing? Merges two rows. | toolchain, perf | all | uncovered [cfg](go-audit/config-inventory.md) | P3 — [canon](go-topic-map/canonical.md) Summary, [map] M1 | GO-OBS |

### K. The `go-quality` index — 6 rows (`go-quality.md`, GO-CORE)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-K-01 | Which commands, in which order, must pass before any `*.go` change lands — formatting, `go vet ./...`, the lint gate, `go test -race ./...`, `go fix -diff ./...`, `govulncheck ./...` — and what does each one's empty output mean? | lint, toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — every sibling index opens with its gate ([cfg](go-audit/config-inventory.md) §1.5); check: the gate block itself, each step watched red | GO-CORE |
| M-K-02 | Is a change reaching green by weakening the check — a new `//nolint` without linter and reason, `//lint:ignore`, `t.Skip`, an exclusion entry, a build tag, `-vet=off` — in the same diff as functional code? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — house rule `*-CORE-01` ([cfg](go-audit/config-inventory.md) §1.3); `nolintlint` require-explanation+specific in 1/10 configs ([gates](go-audit/exemplar-quality-gates.md) §1); check `git diff -U0` grepped for those tokens on added lines | GO-CORE |
| M-K-03 | Has every verification in the rule set been watched go red on a planted violation? | any | all | covered (house convention, [cfg](go-audit/config-inventory.md) §1.3) | P0 — house rule `*-CORE-02`; check: the planted fixture for each row | GO-CORE |
| M-K-04 | Before trusting a version-gated rule, has the reader read the module's `go` line (and `toolchain`), and does `stdversion` guard the stdlib floor? | toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — semantics change per `go` line (loop vars, timers, `GODEBUG` defaults) ([fail](go-topic-map/failure.md) §5, [prac](go-topic-map/practitioner.md) §2); check `go list -m -f '{{.GoVersion}}'` and `go vet ./...` | GO-CORE |
| M-K-05 | Is generated code — recognised by the `Code generated … DO NOT EDIT.` line anywhere before the package clause, not only on line 1 — never hand-edited, and does CI regenerate and diff it? | toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — line-1 detection undercounts 15× in tailscale ([shape](go-audit/exemplar-code-shape.md) §1); generate-diff check in 1 repo ([gates](go-audit/exemplar-quality-gates.md) §3); [go.dev/blog/generate](https://go.dev/blog/generate) | GO-CORE |
| M-K-06 | Does every verification cell say whether empty output is the pass or the finding, and name the Go or tool version it was watched on? | any | all | covered (house convention `*-CORE-03`) | P1 — [cfg](go-audit/config-inventory.md) §1.3 | GO-CORE |

### L. Modules — 19 rows (`go-modules.md` index, GO-MOD)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-L-01 | What `go` line does a library or SDK declare (the lowest actually required) versus an application (the release it builds with), knowing the line is a hard minimum since 1.21 and sets the main module's `GODEBUG` defaults? | modules | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — conflict 12; check `go list -m -f '{{.GoVersion}}'` against the CI matrix, and `go vet ./...` (stdversion) under that line | GO-MOD |
| M-L-02 | When is a `toolchain` directive warranted, and how do `GOTOOLCHAIN=auto` and CI's `setup-go` (`go-version-file` 6/32 vs a literal `go-version` 27/32) interact? | modules, toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — 5/35 roots ([modrel](go-audit/exemplar-modules-and-release.md) §1); [gates](go-audit/exemplar-quality-gates.md) §3; [go.dev/doc/toolchain](https://go.dev/doc/toolchain) | GO-MOD |
| M-L-03 | Should a fleet repo keep the `go 1.(N-1).0` line that `go mod init` writes on 1.26+? | modules | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — [shift](go-topic-map/shifts.md) §5, [prac](go-topic-map/practitioner.md) | GO-MOD |
| M-L-04 | How are dev tools pinned — the `tool` directive (1.24; 4/35), a separate tools module, or a pinned binary — and does a `tool` dependency leak into a library consumer's module graph? | modules, toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — [modrel](go-audit/exemplar-modules-and-release.md) §1 (terraform 7 tools, tailscale pins golangci-lint); kubernetes uses `hack/tools/go.mod` | GO-MOD |
| M-L-05 | Is `go.work` committed only in a multi-module repository whose modules CI builds together, with `go.work.sum`, and never in a single-module repo? | modules | E | uncovered [cfg](go-audit/config-inventory.md) | P1 — conflict 21; 4/35 commit, all monorepos ([modrel](go-audit/exemplar-modules-and-release.md) §1) | GO-MOD |
| M-L-06 | Are `replace` directives only local-path self-references in a multi-module repo, never relied on in a library (consumers ignore them), and never a silent fork swap? | modules | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — all multi-module repos use local paths; syncthing's two fork swaps are the outlier ([modrel](go-audit/exemplar-modules-and-release.md) §1); check `grep -n '=>' go.mod` in a library is the finding | GO-MOD |
| M-L-07 | Does a v2+ module carry the `/vN` path suffix, and what does `+incompatible` signal? | modules | A·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — 11/35 suffixed; go-github at `/v92` ([modrel](go-audit/exemplar-modules-and-release.md) §1); [go.dev/ref/mod](https://go.dev/ref/mod) | GO-MOD |
| M-L-08 | How does `retract` un-recommend a bad tag (it needs a new, higher tag; range syntax), and what does it not do? | modules, release | A·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — 2/35 (`grpc/grpc-go@acccf8cd101a:go.mod:46`) ([modrel](go-audit/exemplar-modules-and-release.md) §1); [eco](go-topic-map/ecosystem-tooling.md) §3 | GO-MOD |
| M-L-09 | Is `go.sum` committed, `go mod tidy -diff` gating CI, and `-mod=readonly` the build default? | modules | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — tidy diff-check in 6/32 repos, 2 already on `-diff` ([gates](go-audit/exemplar-quality-gates.md) §3); check `go mod tidy -diff` exits non-zero on a stale module | GO-MOD |
| M-L-10 | Which superseded modules must new code not add — `pkg/errors`, `golang/mock`, `x/exp/{slices,maps}`, `x/xerrors`, `gopkg.in/yaml.v2`, `hashicorp/go-multierror`, `satori/go.uuid`, `ghodss/yaml`, `gorilla/mux`, `automaxprocs` on ≥1.25, `google/uuid` on ≥1.27 — each with its replacement and floor? | modules | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — [modrel](go-audit/exemplar-modules-and-release.md) §2, [shift](go-topic-map/shifts.md) §16, [run](go-audit/exemplar-runtime-posture.md) §1; depguard already denies `io/ioutil` and `pkg/errors` in ≥3 repos ([gates](go-audit/exemplar-quality-gates.md) §1); check: depguard deny list | GO-MOD |
| M-L-11 | Which YAML library do fleet modules use, with four coexisting answers in the corpus? | modules | B·D | uncovered [cfg](go-audit/config-inventory.md) | P2 — `go.yaml.in/yaml` direct in 9/35, `gopkg.in/yaml.v3` 5, `sigs.k8s.io/yaml` 4; prometheus imports three majors ([modrel](go-audit/exemplar-modules-and-release.md) §2) | GO-MOD |
| M-L-12 | When is vendoring used, and when does auto-vendor mode (`go` ≥1.14 plus a consistent `vendor/modules.txt`) surprise CI? | modules | E | uncovered [cfg](go-audit/config-inventory.md) | P3 — 3/35 vendor ([modrel](go-audit/exemplar-modules-and-release.md) §1); [eco](go-topic-map/ecosystem-tooling.md) §3 | GO-MOD |
| M-L-13 | Are `GOPRIVATE`/`GONOSUMDB`/`GONOPROXY` and `GOAUTH` (1.24) set for private modules, so paths are neither leaked to the public proxy nor fetched unauthenticated? | modules, security | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — [eco](go-topic-map/ecosystem-tooling.md) §1, Summary | GO-MOD |
| M-L-14 | Does a reviewer read the build list with `go list -m all` (MVS picks the minimum; `go.sum` is not a lockfile)? | modules | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — [eco](go-topic-map/ecosystem-tooling.md) Summary | GO-MOD |
| M-L-15 | Are the `godebug` and `ignore` (1.25) directives used correctly, and does a 1.27 toolchain now reject a `godebug` line naming a removed setting? | modules | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — godebug 3/35, ignore 1/35 ([modrel](go-audit/exemplar-modules-and-release.md) §1); [cod](go-topic-map/codified.md) Recent shifts | GO-MOD |
| M-L-16 | Is every dependency bump reviewed rather than auto-merged, with grouped Dependabot or Renovate for `gomod`? | modules, security | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — Dependabot `gomod` in 24/35, grouped in 18 ([modrel](go-audit/exemplar-modules-and-release.md) §5); [security best practices](https://go.dev/doc/security/best-practices) | GO-MOD |
| M-L-17 | Is each new dependency justified ("a little copying is better than a little dependency"), and does the SDK stay stdlib-only at runtime? | modules, sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — ocx-sdk-python has zero runtime dependencies ([cfg](go-audit/config-inventory.md) §3); the four lightest exemplars are libraries with ≤4 direct deps ([modrel](go-audit/exemplar-modules-and-release.md) §1); owner question 2 | GO-MOD |
| M-L-18 | Does CI track the latest patch of a supported Go release, given stdlib CVEs (`net/http` smuggling CVE-2025-22871) are fixed only in point releases? Merges the security currency row. | toolchain, security | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — [fail](go-topic-map/failure.md) §14; `check-latest` in 10/32 ([gates](go-audit/exemplar-quality-gates.md) §3) | GO-MOD |
| M-L-19 | How are nested modules tagged (`sub/vX.Y.Z`), and does tooling that runs `go list ./...` from the root see them? | modules | E | uncovered [cfg](go-audit/config-inventory.md) | P2 — the root-only proxy undercounts nested modules ([shape](go-audit/exemplar-code-shape.md) §1); [release workflow](https://go.dev/doc/modules/release-workflow) | GO-MOD |

### M. The lint and CI gate configuration — 16 rows (`go-modules/gates.md`, GO-GATE)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-M-01 | Is golangci-lint v2, pinned, the fleet's gate of record — and how does a repo on the Go-team shape (`go vet` + `staticcheck`) satisfy the same MUST rows? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — conflict 2; check `golangci-lint run ./...` exit status, analyzer-named rows | GO-GATE |
| M-M-02 | Which linters beyond the 5-linter `standard` set may back a MUST, chosen by measured noise on mature code? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — the 17-linter consensus and the strict-run signal/noise split ([gates](go-audit/exemplar-quality-gates.md) §1, §5); check: ≤1 false positive per 10k LOC on ≥5 exemplars, each watched red on a fixture | GO-GATE |
| M-M-03 | Is the config v2-shaped — `version: "2"`, a `formatters` section, no `presets`, no separate `gosimple`/`stylecheck`, none of the 13 deleted linters — which agents emit wrong from pre-2025 training data? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — [shift](go-topic-map/shifts.md) §8 (migration guide); 0/23 exemplars on v1 ([gates](go-audit/exemplar-quality-gates.md) §1); check `golangci-lint config verify` | GO-GATE |
| M-M-04 | Which formatter is of record — gofmt, goimports, gofumpt, gci — and which check enforces it? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — conflict 3; check `gofmt -l .` prints nothing, or `golangci-lint fmt --diff` | GO-GATE |
| M-M-05 | What goes into `linters.exclusions` (`presets`, `generated: lax`) and should `issues.max-issues-per-linter`/`max-same-issues` be 0 so CI shows every finding? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — presets in 13/23, uncapped in 11/23 ([gates](go-audit/exemplar-quality-gates.md) §1) | GO-GATE |
| M-M-06 | Why must `default: all` never be a baseline — it double-counts deprecated pairs (`wsl`/`wsl_v5`, `exhaustruct`/`_v5`, `gomodguard`/`_v2`)? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — [gates](go-audit/exemplar-quality-gates.md) §5 | GO-GATE |
| M-M-07 | Does CI run `go vet ./...` explicitly, given `go test` runs only 11 of 36 analyzers and skips `copylocks`, `lostcancel`, `loopclosure`, `unusedresult`, `waitgroup` and others? | lint, toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — [cod](go-topic-map/codified.md) §1; check: a planted `copylocks` fixture passes `go test` and fails `go vet` | GO-GATE |
| M-M-08 | Is `go fix -diff ./...` a blocking CI step, and what about fixers that change behaviour (`omitzero`) or are excluded from the suite (`bloop`, `appendclipped`, `slicesdelete`, `fmtappendf`)? | lint, toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — [map] M3; modernize enabled in 8/23 configs ([gates](go-audit/exemplar-quality-gates.md) §1); [cod](go-topic-map/codified.md) §2 | GO-GATE |
| M-M-09 | Which non-default staticcheck checks does the fleet enable (the ST1000/ST1020-22 doc-comment family for the SDK), and what replaces the disabled SA5011 (gopls `nilness`, reachable through `govet`)? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — [cod](go-topic-map/codified.md) §5, [shift](go-topic-map/shifts.md) §10 | GO-GATE |
| M-M-10 | Does a repo run exactly one staticcheck entry point, knowing golangci's bundled copy ignores a standalone `staticcheck.conf`? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — conflict 20 | GO-GATE |
| M-M-11 | Is govulncheck a separate CI step (it is not a golangci linter), run in text mode or with an explicit output check, since `govulncheck-action` exits 0 on findings in `json`/`sarif` mode? | security, lint | all | uncovered [cfg](go-audit/config-inventory.md) | P0 — [eco](go-topic-map/ecosystem-tooling.md) §15; golangci-lint#4623 ([prac](go-topic-map/practitioner.md) §10); in CI at 11/32 repos ([gates](go-audit/exemplar-quality-gates.md) §3); check: a planted reachable vulnerability fails the job | GO-GATE |
| M-M-12 | Does a gosec exclude list drift behind gosec's growing roster (ko's G703 finding), and are exclusions reasoned? | lint, security | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — `ko-build/ko@fcaeb337b6bd:.golangci.yaml:21-22` ([gates](go-audit/exemplar-quality-gates.md) §5) | GO-GATE |
| M-M-13 | Do revive and gocritic earn their config and noise cost beyond staticcheck, and which tags or rules (go-critic's `#security` is empty)? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — revive 17/23, gocritic 10/23 ([gates](go-audit/exemplar-quality-gates.md) §1); [cod](go-topic-map/codified.md) §7–8 | GO-GATE |
| M-M-14 | What does Go CI need beyond generic CI — `setup-go` with `go-version-file` and a cache key covering `go.sum`, a `-race` lane, Windows and macOS legs, tidy and generate diff checks, SHA-pinned actions in release workflows? | toolchain | all | partial (Rust/Python CI rows own the generic shape) | P1 — [gates](go-audit/exemplar-quality-gates.md) §3, [eco](go-topic-map/ecosystem-tooling.md) §14, [modrel](go-audit/exemplar-modules-and-release.md) §5 | GO-GATE |
| M-M-15 | Which auto-fixing linters may run unattended (`--fix`) in an agent loop, and which must be diff-reviewed? | lint | all | uncovered [cfg](go-audit/config-inventory.md) | P2 — [cod](go-topic-map/codified.md) candidate row | GO-GATE |
| M-M-16 | Is a project-specific check better written as an ordinary `go test` over the source (pebble's `internal/lint`) than as a custom linter? | lint | A | uncovered [cfg](go-audit/config-inventory.md) | P3 — `cockroachdb/pebble@13596f1e1cea:Makefile:60` ([gates](go-audit/exemplar-quality-gates.md) §2) | GO-GATE |

### N. Release and distribution — 12 rows (`go-modules/release.md`, GO-REL)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-N-01 | Which flags make a Go release binary byte-reproducible — `-trimpath`, `CGO_ENABLED=0`, `mod_timestamp: "{{ .CommitTimestamp }}"`, ldflags from `{{ .CommitDate }}` not `{{ .Date }}` — given only 3/12 goreleaser users set `mod_timestamp`? | release | B | partial (`rust-cargo` REL rows own the shape) | P0 — conflict 17; [eco](go-topic-map/ecosystem-tooling.md) §9; check: build twice from a clean checkout, `sha256sum` must match | GO-REL |
| M-N-02 | How is a version stamped — `-ldflags -X` for the semver plus `debug.ReadBuildInfo` for VCS data (10/35 do both), the 1.24 `Main.Version` from the VCS tag, and 1.25's stamping blackout when several VCS are detected? | release | B | uncovered [cfg](go-audit/config-inventory.md) | P1 — [modrel](go-audit/exemplar-modules-and-release.md) §4; [canon](go-topic-map/canonical.md) §19; [shift](go-topic-map/shifts.md) candidate row; check `go version -m ./bin/tool` | GO-REL |
| M-N-03 | When must `CGO_ENABLED=0` be set, and what silently re-enables cgo (`net` and `os/user` resolvers)? | release | B | uncovered [cfg](go-audit/config-inventory.md) | P1 — real cgo in 2/35 ([modrel](go-audit/exemplar-modules-and-release.md) §7); [eco](go-topic-map/ecosystem-tooling.md) candidate row | GO-REL |
| M-N-04 | What makes a Go release artifact well-formed for the fleet's mirror — raw per-platform binaries with anchored `<tool>-<goos>-<goarch>[.exe]` names verified by GitHub's asset digest — versus archives plus `checksums.txt`? | release | B | uncovered [cfg](go-audit/config-inventory.md) | P0 — `mirror-bazelbuild@713abea9fbb8:mirror-base.yml:23-24` and the four mirrored bazelbuild binaries ([cfg](go-audit/config-inventory.md) §5); check: an anchored regex per GOOS/GOARCH over the release's asset list | GO-REL |
| M-N-05 | Which signing and provenance does a fleet release carry — cosign keyless, `actions/attest-build-provenance` (3 repos; slsa-github-builder 0), an SBOM that covers images as well as archives? | release, security | B | partial (`rust-cargo` REL-04) | P1 — [modrel](go-audit/exemplar-modules-and-release.md) §5; goreleaser's SBOM misses images ([eco](go-topic-map/ecosystem-tooling.md) §9) | GO-REL |
| M-N-06 | Which GOOS/GOARCH matrix ships (windows and arm64 in 9/11 binary releases), with which `GOARM`/`GOAMD64` levels? | release | B | uncovered [cfg](go-audit/config-inventory.md) | P2 — [modrel](go-audit/exemplar-modules-and-release.md) §7 | GO-REL |
| M-N-07 | Is the goreleaser config v2 (`version: 2`), validated by `goreleaser check` and a snapshot build in PR CI, and migrated from `brews` to `homebrew_casks` where Homebrew is used? | release | B | uncovered [cfg](go-audit/config-inventory.md) | P1 — all 11 measured configs are v2 ([modrel](go-audit/exemplar-modules-and-release.md) §3); casks are macOS-only and need a quarantine hook ([eco](go-topic-map/ecosystem-tooling.md) §9) | GO-REL |
| M-N-08 | When does a Go CLI ship as a ko-built image (distroless default, SBOM built in) rather than via goreleaser `dockers` or a Dockerfile, and who owns base-image patching? | release | B·C | uncovered [cfg](go-audit/config-inventory.md) | P2 — ko in 2 real adopters; scratch/distroless 14% of Dockerfiles ([modrel](go-audit/exemplar-modules-and-release.md) §3); [ko.build](https://ko.build/) | GO-REL |
| M-N-09 | How is a library released — semver tag, `/vN` for breaking changes, `gorelease` against the previous tag, `retract` for mistakes, pkg.go.dev indexing? | release, sdk | A·D | uncovered [cfg](go-audit/config-inventory.md) | P1 — [release workflow](https://go.dev/doc/modules/release-workflow) ([canon](go-topic-map/canonical.md) §11); the go-release skill runs it | GO-REL |
| M-N-10 | Does stripping (`-s -w`) keep what `govulncheck -mode=binary` and `go version -m` need? | release | B | uncovered [cfg](go-audit/config-inventory.md) | P2 — `-s -w` in 7/11 configs ([modrel](go-audit/exemplar-modules-and-release.md) §3) | GO-REL |
| M-N-11 | Are release workflows SHA-pinned (release repos ~100%, lint-only libraries ~0%)? | release, security | B | partial (Rust/Python CI rows) | P2 — the bimodal split ([modrel](go-audit/exemplar-modules-and-release.md) §5) | GO-REL |
| M-N-12 | What do CLIs without goreleaser (restic, regclient) use instead, and is changelog automation in scope here? Merges two rows. | release | B | partial (`docs-quality` owns CHANGELOG) | P3 — [shape](go-audit/exemplar-code-shape.md) Gaps | GO-REL |

### O. Bazel for Go — 11 rows (`bazel-quality/go.md`, BZL-GO)

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-O-01 | Where do the `rules_go` and `gazelle` versions come from — the BCR and the repo's own `MODULE.bazel`, never a README snippet (gazelle's README lags its own `MODULE.bazel` by three minors)? | bazel-go | F | uncovered — `bazel-topic-map.md:797` scoped `rules_go` out ([cfg](go-audit/config-inventory.md) §2.3) | P1 — [modrel](go-audit/exemplar-modules-and-release.md) §6 | BZL-GO |
| M-O-02 | Is the Go SDK taken from `go_sdk.from_file(go_mod = …)` (the `toolchain` line wins over `go`), never `go_sdk.host()`? | bazel-go | F | uncovered [cfg](go-audit/config-inventory.md) | P1 — rules_go's `bzlmod.md` ([modrel](go-audit/exemplar-modules-and-release.md) §6, [eco](go-topic-map/ecosystem-tooling.md) §12) | BZL-GO |
| M-O-03 | Are external modules declared with `go_deps.from_file` plus a `use_repo` for every direct dependency, kept by `bazel mod tidy` (Bazel ≥7.1.1), and what diverges with `go_work` (#1797) or `exclude`? | bazel-go | F | uncovered — `go_deps` has 0 hits in the Bazel corpus ([cfg](go-audit/config-inventory.md) §2.3) | P1 — [eco](go-topic-map/ecosystem-tooling.md) §12 | BZL-GO |
| M-O-04 | Which Gazelle directives matter (`exclude` dominates; `prefix`; `go_naming_convention`; stale `resolve` overrides), and does CI fail when BUILD files drift from Gazelle's output? | bazel-go | F | uncovered [cfg](go-audit/config-inventory.md) | P1 — directive census ([modrel](go-audit/exemplar-modules-and-release.md) §6); [eco](go-topic-map/ecosystem-tooling.md) §13 | BZL-GO |
| M-O-05 | Which analyzers does `nogo` run, how does its set compare with `go vet`'s 36 and the program's gate of record, and how are `includes`/`excludes` scoped (root module only, main repo only)? | bazel-go, lint | F | uncovered [cfg](go-audit/config-inventory.md) §2.3 | P1 — [cod](go-topic-map/codified.md) Summary (unresolved), [eco](go-topic-map/ecosystem-tooling.md) §12 | BZL-GO |
| M-O-06 | How are `go_test` race and pure modes, `x_defs` stamping, `embedsrcs` and `testdata` data dependencies expressed? | bazel-go | F | uncovered [cfg](go-audit/config-inventory.md) | P2 — [eco](go-topic-map/ecosystem-tooling.md) §12 | BZL-GO |
| M-O-07 | Are `tool` directive entries surfaced as `GO_TOOLS` (Gazelle ≥0.47.0)? | bazel-go | F | uncovered [cfg](go-audit/config-inventory.md) | P2 — [modrel](go-audit/exemplar-modules-and-release.md) §6 | BZL-GO |
| M-O-08 | Which override wins — `gazelle_override` over `gazelle_default_attributes` over `default_gazelle_overrides.bzl`? | bazel-go | F | uncovered [cfg](go-audit/config-inventory.md) | P2 — [eco](go-topic-map/ecosystem-tooling.md) §12 | BZL-GO |
| M-O-09 | Where do MVS and Bazel module resolution disagree over the same graph, and where does a reviewer look first? | bazel-go | F | uncovered [cfg](go-audit/config-inventory.md) | P2 — [eco](go-topic-map/ecosystem-tooling.md) candidate row | BZL-GO |
| M-O-10 | How is Go cross-compiled under Bazel — `--platforms` and rules_go's platform targets rather than `GOOS`/`GOARCH` env? | bazel-go | F | uncovered [cfg](go-audit/config-inventory.md) | P2 — rules_go docs | BZL-GO |
| M-O-11 | Should a Go repository adopt Bazel at all, given 0/33 non-dogfood exemplars do? | bazel-go | F | covered-elsewhere (the `bazel-adopt` skill) | P3 — [modrel](go-audit/exemplar-modules-and-release.md) §6 | BZL-GO |

### P. Procedures for the skills — 5 rows

| ID | question | surface | shapes | coverage | priority | family |
|---|---|---|---|---|---|---|
| M-P-01 | What is the end-to-end procedure to cut a Go release — tag, `gorelease`, `goreleaser check` and snapshot, a double build to prove reproducibility, sign and attest, verify the asset names the fleet mirror expects, `retract` on a mistake? | release | B·D | partial (`jvm-release` is the structural precedent) | P1 — rows M-N-01..09 compose into it | skill: go-release |
| M-P-02 | What is the procedure to move a module to a new Go release — read the release notes and `GODEBUG` history, bump the `go`/`toolchain` lines, run `go fix`, clear `stdversion` findings, bump the golangci pin and config, check `GOEXPERIMENT` pins, re-run the gate? | toolchain | all | uncovered [cfg](go-audit/config-inventory.md) | P1 — [shift](go-topic-map/shifts.md), [canon](go-topic-map/canonical.md) §19 | skill: go-upgrade |
| M-P-03 | What is the runbook for a hung, leaking or slow Go process — SIGQUIT and `GOTRACEBACK`, the `goroutineleak` profile, pprof, the flight recorder, a `-race` repro, `GODEBUG=execwait=2`, Delve attach, core dumps (broken on Linux 6.12/6.13)? | perf | B·C | uncovered [cfg](go-audit/config-inventory.md) | P2 — [prac](go-topic-map/practitioner.md) §17, [eco](go-topic-map/ecosystem-tooling.md) | skill: go-diagnose |
| M-P-04 | What is the procedure when a govulncheck finding or a conflicting dependency lands — reachability, upgrade path, `replace` never as the fix, re-verify? | modules, security | all | partial (`jvm-dependency-triage` precedent) | P2 — folded into go-upgrade | skill: go-upgrade |
| M-P-05 | Does the Go set need its own review skill (dimensions over the rule families), or do the index's MUST list and the rule tables suffice? | any | all | uncovered — no language review skill exists in the catalog | P3 — rule-distillation §Review Skills | deferred |

## Artifact set decision

Two rules, three skills, one untagged bundle, and one depth file handed to the
published `bazel-quality` set. This follows the frame's hypothesis with two
changes: tool-config globs join `go-modules` (conflict 11), and the
skill set is fixed at three with dependency triage folded in.

### The rules and their glob lists

| Rule | `paths` | Index-owned family | Depth files (family) |
|---|---|---|---|
| `go-quality` | `"**/*.go"` | GO-CORE (section K) | `language.md` (GO-LANG), `errors.md` (GO-ERR), `concurrency.md` (GO-CONC), `api-design.md` (GO-API), `testing.md` (GO-TEST), `cli-contract.md` (GO-CLI), `io.md` (GO-IO), `network.md` (GO-NET), `security.md` (GO-SEC), `observability.md` (GO-OBS) |
| `go-modules` | `"**/go.mod"`, `"**/go.sum"`, `"**/go.work"`, `"**/go.work.sum"`, `"**/.golangci.*"`, `"**/*golangci*.yml"`, `"**/*golangci*.yaml"`, `"**/.goreleaser.*"`, `"**/goreleaser*.yml"`, `"**/goreleaser*.yaml"`, `"**/.config/goreleaser.*"`, `"**/.ko.yaml"`, `"**/staticcheck.conf"` | GO-MOD (section L) | `gates.md` (GO-GATE), `release.md` (GO-REL) |

**Why the `go-modules` list is thirteen entries long.** The frame's
`.goreleaser.yaml` glob matches 2 of the 13 goreleaser configs in the corpus.
goreleaser accepts `.config/goreleaser.y*ml`, `.goreleaser.y*ml` and
`goreleaser.y*ml` (`goreleaser/goreleaser@ff8de3d6c389:cmd/config.go:47-52`),
and the corpus uses all three dotted and dotless shapes ([map] M4). golangci-lint
discovers `.golangci.*` (`golangci/golangci-lint@032d962e0399:pkg/config/base_loader.go:101`),
but etcd and kubernetes pass `tools/.golangci.yaml` and `hack/golangci.yaml`
with `--config` ([map] M5). Dotted names are listed explicitly because a
leading `*` may not match a leading dot. No brace globs: no sibling uses them.
The house rule applies: a wide glob plus an index pointer is cheaper than a
narrow glob that silently fails to load. **Deliberate over-match:**
`**/*golangci*.yml` also loads the rule on the four `golangci-lint.yml` CI
workflows ([map] M5), which is exactly when GO-GATE rows apply.

**Residual misses, covered by routing.**
- Gate commands in a `Makefile` or `.github/workflows/*.yml`.
- `Dockerfile`, `.go-version` and `revive.toml` (revive has no discovery default).
- Bazel `MODULE.bazel`, which `bazel-quality` owns.

The `go-quality` index routes each of these by task.

**Checker.** `check-artifacts.py --root /home/mherwig/.cache/research-lang/exemplars/go/ko-build__ko`,
run behind an `if [ -d … ]` guard. ko carries `go.mod`, `go.sum`,
`.golangci.yaml`, `.goreleaser.yml` and `.ko.yaml`. Each glob absent from ko
gets `--allow-absent`: `go.work`, `go.work.sum`, the dotless goreleaser names,
`.config/goreleaser.*` and `staticcheck.conf`. Every one of them except
`.config/goreleaser.*` was confirmed live on another root at map time.
- `go.work` is live at gazelle, etcd, kubernetes and prometheus.
- `staticcheck.conf` is live at go-tools, terraform, tailscale and urfave/cli.
- `.config/goreleaser.*` is tool-guaranteed but absent from the corpus.

**Index shape (`go-quality.md`, under 200 lines).** It holds:
- the gate block (M-K-01);
- GO-CORE-01..03, the house trio of never-weaken, watched-red and empty-output meaning (M-K-02, M-K-03, M-K-06);
- GO-CORE-04, read the `go` line first (M-K-04);
- GO-CORE-05, generated code (M-K-05);
- the MUST list;
- the routing table by task;
- the Siblings.

`go-modules.md` holds GO-MOD directly and routes to `gates.md` and
`release.md`. One family per depth file; a prefix belongs to one file forever.

### Skills

| Skill | Procedure | Draws on |
|---|---|---|
| `go-release` | Cut a Go release: tag, `gorelease`, `goreleaser check` and snapshot, double-build reproducibility check, sign and attest, verify mirror-compatible asset names, `retract` on a mistake. | GO-REL, GO-MOD, M-P-01 |
| `go-upgrade` | Move a module to a new Go release or triage a dependency: release notes and `GODEBUG` diff, `go`/`toolchain` bump, `go fix`, `stdversion`, golangci pin and config bump, `GOEXPERIMENT` audit, govulncheck reachability triage, re-run the gate. | GO-LANG, GO-MOD, GO-GATE, M-P-02, M-P-04 |
| `go-diagnose` | Runbook for a hung, leaking, racy or slow process: SIGQUIT dump, `goroutineleak` profile, pprof, flight recorder, `-race` repro, `GODEBUG=execwait=2`, Delve. | GO-OBS, GO-CONC, M-P-03 |

**Dropped:**
- `go-modernize`: it is a gate step plus an upgrade step, and `go fix` does the work.
- A separate dependency-triage skill: it is folded into `go-upgrade`, since one procedure consumes the other.
- A review skill: deferred, M-P-05.

### Bundle

`go-essentials` has the members `go-quality`, `go-modules`, `go-release`,
`go-upgrade` and `go-diagnose`. Every member is untagged; bundles never pin,
and `latest` counts as a pin. `bazel-quality/go.md` is not a member: it ships
inside `bazel-quality`, as in the `java.md` precedent.

### ID families

GO-CORE, GO-LANG, GO-ERR, GO-CONC, GO-API, GO-TEST, GO-CLI, GO-IO, GO-NET,
GO-SEC, GO-OBS, GO-MOD, GO-GATE and GO-REL. BZL-GO is allocated in the
Bazel set. That makes fifteen.

### How the Bazel-Go depth file reaches `bazel-quality`

Wave-3 group `bazel` researches it and writes its dives to `go-bazel/`, like
any other group here. The authoring pass then drafts
`rules/bazel-quality/go.md` (family BZL-GO) directly on the branch that
carries it, and does four other things:
- Adds one routing row to `rules/bazel-quality.md`: "Writing a `go_*` target, running Gazelle for Go, repinning `go_deps`, or wiring `nogo`".
- Adds the keywords `rules_go`, `gazelle`, `go_deps` and `nogo`.
- Updates its Siblings to name `go-quality` and `go-modules`.
- Bumps `publish.toml` `[rules.bazel-quality]` from `0.2.0` to `0.3.0` and updates `docs/bazel-quality.md`.

The file follows the sibling's contract, not this program's:
- **No `MODULE.bazel` glob of its own.** It cites BZL-MOD, BZL-HERM, BZL-CACHE, BZL-TEST, BZL-FLAG, BZL-ARCH, BZL-LARK and BZL-CI rather than restating them.
- **It carries a measurement disclosure,** as `rules/bazel-quality/java.md` does.
- **It is framed "if you adopt Bazel for Go".** Only 2 of 35 exemplars do, both dogfood ([modrel](go-audit/exemplar-modules-and-release.md) §6).
- **It opens a closed scope, and says so.** The Bazel program scoped `rules_go` out (`bazel-topic-map.md:797`, [cfg](go-audit/config-inventory.md) §2.3), and `go_deps` has 0 hits in its corpus. If the owner declines (Q7), BZL-GO is never allocated, and section O stays here as research.

### Explicitly not in scope

| Excluded | Reason |
|---|---|
| GUI, mobile, WebAssembly | At most a mention. |
| Web frameworks beyond `net/http` | None is in the top-30 direct dependencies; `ServeMux` 1.22 routing covers it. |
| Kubernetes operator frameworks | Out of scope. |
| gRPC and protobuf API design beyond generated-code handling | Out of scope. |
| ORMs and SQL | 0/15 real sites. |
| cgo authoring | 2 of 35 repos. |
| Generic CI shape | Rust and Python own it. |
| README and CHANGELOG | `docs-quality` owns them. |
| Example functions | `docs-instrument` owns them. |
| `plugin`, assembly, SIMD | Out of scope. |
| OS packaging beyond pointers | Out of scope. |

## Selected for wave 2

Seven groups, fourteen dives. They were chosen in the phase-3 order:
uncovered first (all but six map rows are uncovered), then leverage for the
named consumers, then areas where agents demonstrably get it wrong, then
whether a rule can check it.

**Cross-cutting decisions come first.** `gates` decides the analyzer and
linter names that every other family's verification cells cite. `errors`
and the context half of `concurrency` are consumed by the CLI, IO, network
and SDK families. `cli` and `io` are the Go SDK's and the Go CLIs' own
boundaries.

**Why `language` waits for wave 3, despite three P0 rows.**
- M-A-01's check is `go fix -diff`, and `gates/gate-commands` decides whether that is the gate.
- M-A-10 already has its check.
- M-A-14 (json/v2) is one narrow fixture with no upstream dependency. Its dive, `language/stdlib-semantics`, is the one wave-3 dive that may launch alongside wave 2.

**Chase-the-surprise items.** Each is named in a brief, each is something the
frame did not anticipate, and each is load-bearing:

| Surprise | Where it is chased |
|---|---|
| `go test` runs 11 of 36 vet analyzers | gate-commands |
| The `omitzero` fixer changes JSON output ([map] M3) | gate-commands |
| `noctx` may not cover `os/exec` | context-contract |
| Go's `SIGPIPE` default is death by signal, not exit 0 | exit-codes-and-signals |
| The undocumented `GODEBUG=execwait=2` leak finalizer | subprocess-contract |
| Only 9 of 92 extraction sites carry a traversal guard | files-atomicity |
| json/v2 is default-on in 1.27.1 ([map] M1) | stdlib-semantics |

Every brief ends with the same environment footer. Each proposed check must
be watched red on a planted fixture before it may back a MUST.

### 1. `gates` — what fails the build (GO-GATE)

**Dive `golangci-config`** · family `GO-GATE` · label "The pinned golangci-lint v2 config, and which linters may back a MUST"

```text
Decide the fleet's gate of record and write the one pinned golangci-lint v2 config a Go repo copies.
Rows: M-M-01..05, M-M-09, M-M-10, M-M-12, M-M-13, M-M-15, M-I-03, M-K-02 (go-topic-map.md).
Fetch: golangci-lint.run/docs/configuration/file/, /docs/product/migration-guide/, /docs/linters/, /docs/formatters/;
staticcheck.dev/docs/checks/ and /changes/ (2026.2); securego/gosec README; revive and go-critic READMEs; golangci-lint#4623.
Baseline: the 17-linter consensus and the strict-run signal/noise split (go-audit/exemplar-quality-gates.md §1, §5; config
at /home/mherwig/.cache/research-lang/go-tools/wave1-golangci-strict.yml). Candidates beyond `standard`: bodyclose, nilerr,
errorlint, contextcheck, noctx, containedctx, usestdlibvars, canonicalheader, fatcontext, wastedassign, predeclared,
copyloopvar, exhaustive, testifylint, usetesting, sloglint, nolintlint; govet enable-all minus shadow and fieldalignment.
Measure on spf13/cobra@adbc8813901b, oras-project/oras-go@cb6d6dc79f83, ko-build/ko@fcaeb337b6bd, uber-go/zap@4892335e05f1,
google/go-cmp@b133f1f1932e, regclient/regclient@43d2acb9fafd, junegunn/fzf@b1be3a8be1b8, urfave/cli@d1d810845dbc:
hand-classify every finding; a linter may back a MUST only at <=1 false positive per 10k LOC on >=5 of the 8.
Plant in fixtures/golangci-config/: a v1-shaped config (presets, gosimple, stylecheck) that `golangci-lint config verify`
must reject and `golangci-lint migrate` must convert; a bare `//nolint` that nolintlint (require-explanation,
require-specific) must flag; one violation per MUST linter.
Decide: errorlint errorf (conflict 22); gosec excludes (G115, G104) versus an include list, given ko's drift at
ko-build/ko@fcaeb337b6bd:.golangci.yaml:21-22; wrapcheck in or out; formatter of record with `golangci-lint fmt --diff` as
its check; exclusion presets and `generated: lax`; issue caps at 0; which linters may run --fix unattended; one staticcheck
entry point (bundled 0.8.1 vs standalone 2026.2.1, which alone reads staticcheck.conf); how a go vet + staticcheck repo
meets the same MUSTs. Deliver the config verbatim and a table: linter, underlying analyzer, FP/10k LOC, MUST/SHOULD/off.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `gate-commands`** · family `GO-GATE` · label "The command block: vet, go fix, govulncheck, tidy, race, generate, tool pinning"

```text
Decide the ordered command block every Go change must pass, and what each command's exit status and empty output mean.
Rows: M-K-01, M-K-05, M-M-07, M-M-08, M-M-11, M-M-14, M-L-04, M-L-09, M-E-11.
Fetch: pkg.go.dev/cmd/vet; go.dev/doc/go1.26 and go1.27 (go fix rewrite; stdversion under go test); go.dev/blog/inliner;
pkg.go.dev/golang.org/x/vuln/cmd/govulncheck and github.com/golang/govulncheck-action; go.dev/ref/mod (tidy -diff,
-mod=readonly, tool directive); go.dev/doc/articles/race_detector; go.dev/s/generatedcode; golangci-lint's install page.
Pin from source: go test's vet subset at go1.27.1:src/cmd/go/internal/test/test.go:654 (11 of 36 analyzers), the analyzer
list from `run.sh go tool vet help`, and the 26 fixers from `run.sh go tool fix help`.
Plant in fixtures/gate-commands/, one module per case: copylocks, lostcancel, loopclosure under `go 1.21`, unusedresult,
waitgroup (Add inside the goroutine), hostport, composites — each must pass `go test ./...` and fail `go vet ./...`;
a module needing rangeint, stringsseq and omitzero rewrites — record the `go fix -diff ./...` exit status and whether
omitzero changes json.Marshal output (a behaviour change inside a "safe" fixer); a stale go.mod for `go mod tidy -diff`;
a reachable vulnerable dependency for govulncheck in text, -format json and -format sarif, recording each exit code;
a file whose `// Code generated ... DO NOT EDIT.` line sits below a license header, proving line-1 detection misses it.
Compare golangci's modernize linter with `go fix -diff` on the same module and say which one is the gate.
Tool pinning: the `tool` directive (4/35) vs `go run pkg@version` vs a pinned binary — does `go get -tool` add requirements
a library's consumers inherit? Import the fixture library from a second module and read its `go list -m all`.
Decide: the gate block verbatim, in order; whether `go fix -diff` blocks CI; whether govulncheck-action's json/sarif mode
needs an explicit output check; the -race lane (every PR vs scheduled) given 5-10x memory; how dev tools are pinned.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 2. `errors` — the error contract (GO-ERR)

**Dive `wrapping-and-classification`** · family `GO-ERR` · label "Wrapping, matching, exported error shapes and the SDK's typed exit error"

```text
Decide the error contract a Go library, SDK or CLI exposes: what it wraps, what it exports, and how callers match it.
Rows: M-B-01..08, M-B-11, M-B-17, M-B-18.
Fetch: go.dev/blog/go1.13-errors; pkg.go.dev/errors (Is, As, AsType from 1.26, Join, Unwrap []error); google.github.io/
styleguide/go/best-practices#error-handling; go.dev/wiki/CodeReviewComments#error-strings; dave.cheney.net/2016/04/27
(opaque errors); uber-go/guide style.md#errors; go.dev/doc/faq#nil_error; kubernetes/kubernetes#123234;
polyfloyd/go-errorlint and tomarrell/wrapcheck READMEs; staticcheck SA4023.
Test against: grpc/grpc-go@acccf8cd101a:clientconn.go:326 (%v wrap); aquasecurity/trivy@ae561f8cca36:magefiles/vex.go:304
(== io.EOF); cli/cli@9b031151a825:api/queries_repo.go:1535 (message matching); cockroachdb/pebble@13596f1e1cea:open.go:867
(errors.Join); cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212 (typed dispatch).
Plant in fixtures/errors-wrapping/: (a) a %v-wrapped sentinel errors.Is misses; (b) == io.EOF through a wrapping reader;
(c) a typed-nil *MyErr returned as error; (d) errors.As on an errors.Join result with two matching members; (e) a %w of a
dependency's error leaking into an exported API; (f) errors.AsType in a module whose go line is 1.25.
Record which of errorlint (errorf, comparison, asserts), vet errorsas, SA4023 and gopls nilness catch each, and the
false-positive rate of errorlint and wrapcheck on grpc-go, caddyserver/caddy@54937914234b and ko-build/ko@fcaeb337b6bd.
Decide: where %w is mandatory and where %v is the deliberate boundary; sentinel vs typed vs opaque per package kind; the
SDK's typed exit error mirroring ocx-sdk-python (/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py:825,831 and
_types.py:289) over the ocx table (/home/mherwig/dev/ocx/crates/ocx_exit/src/exit_code.rs:22-112) — one *ExitError with a
Code field vs one type per code, and whether the TempFail (75) retry belongs in the SDK; AsType as MUST at go>=1.26;
error-string and %w-placement conventions.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `panics-exits-cleanup`** · family `GO-ERR` · label "Panics, exits, discarded errors and closing writable resources"

```text
Decide when Go code may panic, exit or drop an error, and the one canonical shape for closing a writable resource.
Rows: M-B-09, M-B-10, M-B-12..16, M-B-19.
Fetch: go.dev/doc/effective_go#panic and #recover; go.dev/blog/defer-panic-and-recover; google.github.io/styleguide/go/
decisions#dont-panic and best-practices#program-checks-and-panics; go.dev/blog/error-syntax (June 2025); kisielk/errcheck
README (check-blank, exclude-functions); staticcheck SA5001 and SA9010; revive deep-exit; go-critic exitAfterDefer;
100go.co #54; pkg.go.dev/os#File.Close and #File.Sync.
Measure on the pinned clones: panics outside package main and _test.go (4,236), classifying 30 of cockroachdb/pebble@
13596f1e1cea's 1,148 deliberate invariant panics to write the "invariant" heuristic; os.Exit and log.Fatal outside main
(285 + 359, go-audit/exemplar-code-shape.md §4); a 40-site sample of the 1,462 `_ =` discards, classified justified or not.
Plant in fixtures/panics-exits/: os.Exit in a library reached from a deferred-cleanup path; log.Fatal after a defer;
`defer f.Close()` on an os.Create handle whose Close fails; `defer Start()` for SA9010; a panic on malformed input; a Must*
over a runtime value; nilerr and nilnil shapes; a recover that swallows. Record which of errcheck, SA5001, SA9010, revive
deep-exit, gocritic exitAfterDefer, gosec G104, nilerr and nilnil fires on each, and which case nothing catches.
Decide: the canonical write-close shape (`defer func() { err = errors.Join(err, f.Close()) }()` vs explicit Close before
return) and whether bare `defer resp.Body.Close()` on read-only handles stays exempt; the panic-policy line an agent can
apply (programmer error, violated invariant, Must over constants); where recover belongs; whether (nil, nil) is ever
sanctioned; the rule text that stops an agent inventing try/? or must() control flow.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 3. `concurrency` — goroutines and context (GO-CONC)

**Dive `goroutine-ownership`** · family `GO-CONC` · label "Goroutine ownership, bounded fan-out, and the race shapes -race misses"

```text
Decide the ownership contract for every goroutine a library, SDK or CLI starts, and which detector proves it.
Rows: M-C-01..08, M-C-11..13.
Fetch: go.dev/wiki/CodeReviewComments#goroutine-lifetimes; pkg.go.dev/sync (WaitGroup.Go 1.25, OnceValue/OnceValues);
pkg.go.dev/golang.org/x/sync/errgroup (SetLimit, TryGo); pkg.go.dev/runtime/pprof and the go1.27 notes (goroutineleak
profile, GA); uber-go/goleak README; pkg.go.dev/testing/synctest; Uber's PLDI'22 "A Study of Real-World Data Races in Golang";
Tu et al. ASPLOS'19 "Understanding Real-World Concurrency Bugs in Go"; go.dev/doc/articles/race_detector; 100go.co #62-#74.
Test against: the 94 for-then-go sites and the 194/248 errgroup.Go calls without SetLimit (go-audit/exemplar-runtime-posture.md
§3) — sample 20, classify bounded-by-construction vs wire-controlled; the 108 wg.Go sites in 12 repos.
Plant in fixtures/goroutine-ownership/: a library func that starts a goroutine with no join, detected three ways
(goleak.VerifyTestMain, a synctest.Test bubble, the goroutineleak profile), recording what each misses (a goroutine blocked
in a syscall, one held by a global); wg.Add inside the goroutine (the vet waitgroup analyzer, distinct from the waitgroupgo
fixer); append to a shared slice from goroutines; a closure writing the outer err; a concurrent map write; an unbounded
errgroup over 10k items vs SetLimit(8), measuring peak goroutines; a panic in a library goroutine killing the test binary;
a double close and a send after close. Run each under `go test -race -count=3`; record which shapes -race reports and misses.
Decide: the ownership rule text and its reading heuristic; the fan-out MUST (when a limit is required) and its check;
WaitGroup.Go vs errgroup vs a plain loop; the channel buffer-size rule; which leak detector is the SHOULD for tests and which
for long-running processes; whether library goroutines must recover and report panics.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `context-contract`** · family `GO-CONC` · label "Context propagation, storage, cancel discipline and causes"

```text
Decide the context.Context contract: where it comes from, how far it flows, when it may be stored, how cancellation carries a cause.
Rows: M-C-15..19.
Fetch: pkg.go.dev/context (WithCancelCause, WithTimeoutCause, Cause, WithoutCancel, AfterFunc); go.dev/blog/context and
go.dev/blog/context-and-structs; google.github.io/styleguide/go/decisions#contexts; pkg.go.dev/os/signal#NotifyContext (cause
since 1.26); READMEs of kkHAIKE/contextcheck, sivchari/containedctx, sonatard/noctx, Crocmagnon/fatcontext; the vet lostcancel
doc; staticcheck SA1012 and SA1029.
Test against: etcd-io/etcd@7583cc6e7e27:client/v3/concurrency/session.go:120 (ctx field); the 964 Background() and 275 TODO()
calls outside main (go-audit/exemplar-runtime-posture.md §2) — sample 30, classify legitimate root vs broken chain; the 268
cancels not immediately deferred — sample 20.
Plant in fixtures/context-contract/: (a) a callee that restarts with context.Background(); (b) ctx stored in a struct field;
(c) a cancel skipped on one path; (d) WithTimeout losing its cause vs WithTimeoutCause; (e) a string context key;
(f) context.WithValue inside a loop; (g) exec.Command and http.NewRequest without a context.
Record which of contextcheck, containedctx, noctx, fatcontext, vet lostcancel (go vet only), SA1012 and SA1029 fire, and
confirm whether noctx covers os/exec at golangci-lint 2.14.0 — map row M-G-08 depends on the answer.
Measure contextcheck, containedctx and noctx false positives per 10k LOC on etcd-io/etcd@7583cc6e7e27, cli/cli@9b031151a825
and google/go-containerregistry@0c8bedb78437.
Decide: ctx-first-and-propagate as a MUST and its check; the struct-field exception wording; cancel discipline; when a cause
is required (CLI exit on signal, SDK timeout); WithoutCancel and AfterFunc usage; the context.Value policy.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 4. `testing` — how Go code proves itself (GO-TEST)

**Dive `test-style`** · family `GO-TEST` · label "Assertion style, table tests, helpers, golden files and real transports"

```text
Decide the default test style for fleet Go code, and the conditions under which an incumbent testify suite is tolerated.
Rows: M-E-01..05, M-E-08, M-E-15, M-E-16.
Fetch: go.dev/wiki/TestComments; google.github.io/styleguide/go/decisions#useful-test-failures and best-practices#tests;
pkg.go.dev/github.com/google/go-cmp/cmp and cmp/cmpopts; stretchr/testify README and its ObjectsAreEqual issues;
Antonboom/testifylint and kulti/thelper READMEs; pkg.go.dev/github.com/rogpeppe/go-internal/testscript; uber-go/mock
(golang/mock archived 2024-01-08); pkg.go.dev/net/http/httptest.
Test against: goreleaser/goreleaser@ff8de3d6c389, cli/cli@9b031151a825 and google/go-github@48d0a668cde8 (testify vs cmp
lineage; assert vs require counts); the 561 golden files and 6 -update flags (go-audit/exemplar-quality-gates.md §4).
Plant in fixtures/test-style/: testify assert.Equal on nil vs empty slice against cmp.Diff with and without
cmpopts.EquateEmpty; cmp.Diff on a struct with unexported fields (panic) and the IgnoreUnexported fix; t.Fatal from a spawned
goroutine (vet testinggoroutine); a helper missing t.Helper (thelper); two t.Parallel subtests mutating a shared fixture
under -race; a golden test with an -update flag, run twice for determinism; an in-process run(args, stdout, stderr) CLI test
beside a testscript .txtar for the same command.
Paste the failure output of each style so the rule can argue from message quality; measure testifylint, thelper,
paralleltest and tparallel noise on the three repos.
Decide: stdlib + cmp as the default for new code; the testify tolerance clause (require over assert, testifylint on); the
table-test shape; the golden-file convention; the CLI end-to-end method; mock policy (real transports first,
go.uber.org/mock when a seam is unavoidable).
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `time-fuzz-coverage`** · family `GO-TEST` · label "t.Context, synctest, fuzzing, coverage gates and benchmarks"

```text
Decide which modern testing primitives are defaults (gated by the module's go line) and how coverage is gated.
Rows: M-E-06, M-E-07, M-E-09, M-E-10, M-E-13.
Fetch: pkg.go.dev/testing (T.Context and T.Chdir 1.24, B.Loop 1.24); pkg.go.dev/testing/synctest and go.dev/blog/synctest
(GA 1.25, Run removed 1.26, Sleep 1.27); go.dev/doc/security/fuzz and go.dev/doc/tutorial/fuzz; go.dev/doc/build-cover and
go.dev/blog/integration-test-coverage (GOCOVERDIR, go tool covdata); pkg.go.dev/golang.org/x/perf/cmd/benchstat;
golang/go#74967 (bloop excluded from the modernizer suite); ldez/usetesting README.
Test against: the 10/34 synctest adopters and etcd's clockwork (go-audit/exemplar-runtime-posture.md §8); the 122 fuzz
functions (go-audit/exemplar-code-shape.md §2) and the 3 repos that fuzz in CI (go-audit/exemplar-quality-gates.md §3).
Plant in fixtures/time-fuzz-coverage/: a retry-with-backoff function tested with real sleeps vs synctest.Test (record wall
time); a synctest.Run call that must fail to compile on 1.27.1; a FuzzXxx over a digest parser, seeded under testdata/fuzz/,
that finds a planted panic; a CLI built with -cover and run with GOCOVERDIR set and unset (unset must lose data with only
a warning), merged by `go tool covdata textfmt`; a 100% threshold script over `go tool cover -func` that exits non-zero at
99.9%; a b.N benchmark rewritten to b.Loop, compared with benchstat; usetesting flagging os.MkdirTemp and os.Setenv in tests.
Decide: t.Context/TempDir/Setenv/Chdir as MUST at go>=1.24; synctest as the SHOULD for time-dependent code at go>=1.25; which
inputs must have fuzz tests and whether CI runs -fuzztime; the SDK's coverage-gate script (owner Q5) and the
integration-coverage recipe for CLIs; b.Loop as SHOULD; benchstat for any performance claim.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 5. `modules` — what a module declares and depends on (GO-MOD)

**Dive `directives-and-toolchain`** · family `GO-MOD` · label "go, toolchain, godebug, go.work and /vN — the directive policy"

```text
Decide the go.mod directive policy for libraries, the SDK and CLIs, and how CI selects the toolchain.
Rows: M-L-01..03, M-L-05, M-L-07, M-L-15, M-L-19, M-K-04.
Fetch: go.dev/ref/mod (go, toolchain, godebug, tool, ignore, retract; go.work); go.dev/doc/toolchain (GOTOOLCHAIN, forward
compatibility since 1.21); go.dev/doc/godebug (history; settings removed in 1.27); go.dev/blog/loopvar-preview;
go.dev/doc/modules/release-workflow and /major-version; actions/setup-go README (go-version-file, check-latest);
go.dev/doc/go1.26 (go mod init writes 1.(N-1).0) and go1.27 (stdversion under go test).
Test against: the 5/35 toolchain lines and the 4/35 committed go.work roots (bazelbuild/bazel-gazelle@63c9a3d2078f,
etcd-io/etcd@7583cc6e7e27, kubernetes/kubernetes@dfd7b93a1783, prometheus/prometheus@270db2915054); godebug in 3/35;
google/go-github@48d0a668cde8 at /v92; the setup-go split, go-version-file 6/32 vs a literal 27/32.
Plant in fixtures/go-directives/: a module declaring go 1.28, built under GOTOOLCHAIN=local (must refuse) and under
`run.sh env GOTOOLCHAIN=auto go build ./...` (record the fetch attempt); the go line `go mod init` writes on 1.27.1; a
closure-over-loop-variable test under go 1.21 vs go 1.22; a go 1.24 module calling a 1.26 API (stdversion must fire under
go vet and, on 1.27, under go test); a godebug line naming a setting removed in 1.27 (record the error); go.work in a
single-module and in a two-module repo, showing what CI builds with GOWORK=off.
Decide: the go-line policy per artifact kind (default: libraries and the SDK at the oldest supported release, CLIs at the
current one — owner Q1) and its check; when a toolchain line is warranted; the setup-go recipe (go-version-file vs literal,
check-latest); the go.work commit policy; /vN and nested-module tagging rules; godebug and ignore usage.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `dependency-hygiene`** · family `GO-MOD` · label "replace, retract, superseded modules and vulnerability triage"

```text
Decide what a Go module may depend on, how dependency risk is triaged, and the superseded-module table agents must honour.
Rows: M-L-06, M-L-08, M-L-10, M-L-11, M-L-13, M-L-16..18, M-I-01, M-I-02, M-P-04.
Fetch: go.dev/ref/mod#go-mod-file-replace and #go-mod-file-retract; go.dev/doc/security/vuln; pkg.go.dev/golang.org/x/vuln/
cmd/govulncheck (-scan symbol|package|module, -mode binary); go.dev/doc/security/best-practices; go.dev/blog/supply-chain;
pkg.go.dev pages for github.com/pkg/errors, github.com/golang/mock, gopkg.in/yaml.v2, go.yaml.in/yaml/v3, sigs.k8s.io/yaml,
github.com/google/uuid and the 1.27 stdlib uuid; OpenPeeDeeP/depguard README.
Test against: syncthing/syncthing@94c3c1cdef71 go.mod (fork replaces); grpc/grpc-go@acccf8cd101a:go.mod:46 (retract); the
direct-dependency census (go-audit/exemplar-modules-and-release.md §2: cobra 14/35, google/uuid 9/35, YAML 9/5/4); the
govulncheck results on six repos (22 findings, 3 reachable, GO-2026-6348 in ko-build/ko@fcaeb337b6bd).
Plant in fixtures/dependency-hygiene/: a library with a replace, imported from a second module (the replace must be
ignored); a retract of v1.0.1 that takes effect only once v1.0.2 is tagged; govulncheck at -scan symbol, package and module
against a reachable and an unreachable vulnerable symbol, recording exit codes; -mode=binary on a normal and a -s -w build;
depguard denying pkg/errors and io/ioutil; `go build -mod=readonly ./...` after a hand edit to go.mod.
Decide: the superseded-module table (module, replacement, go-line floor, check), including google/uuid to stdlib uuid at
go>=1.27 and automaxprocs at go>=1.25; the fleet's YAML library; the replace policy; the govulncheck triage procedure
go-upgrade runs; whether -mode=binary audits mirrored upstream binaries; the SDK's zero-runtime-dependency check (owner
Q2); Dependabot/Renovate grouping and review policy; GOPRIVATE and GOAUTH guidance.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 6. `cli` — the Go CLI contract (GO-CLI)

**Dive `exit-codes-and-signals`** · family `GO-CLI` · label "The exit table, usage errors, SIGPIPE and signals in a Go CLI"

```text
Decide how a Go CLI meets the fleet exit contract that rules/rust-quality/cli-contract.md pins (EXIT-01..11, CLI-05).
Rows: M-F-01..06, M-F-16.
Fetch: pkg.go.dev/os/signal (the SIGPIPE section, Notify, Ignore, NotifyContext and its 1.26 cause); pkg.go.dev/os#Exit;
pkg.go.dev/os/exec#ExitError and syscall#WaitStatus; cobra docs (SilenceUsage, SilenceErrors, SetFlagErrorFunc);
cli.urfave.org/v3 (Exit, ExitCoder, HandleExitCoder); sysexits(3); clig.dev; nishanths/exhaustive README.
Read in full: rules/rust-quality/cli-contract.md (the contract mirrored) and the ocx exit table at
/home/mherwig/dev/ocx/crates/ocx_exit/src/exit_code.rs:22-112.
Test against: spf13/cobra@adbc8813901b:command.go:235-239 (default exit 1, usage and error printed);
cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212 (ordered classification) and its two-line cmd/gh/main.go.
Plant in fixtures/cli-exit/: a CLI printing 10k lines piped to `head -1` with default handling, signal.Notify(SIGPIPE),
signal.Ignore(SIGPIPE) and a central EPIPE-to-exit-0 mapping — record PIPESTATUS and stderr for each; a cobra unknown flag
(default 1; find the minimum wiring that yields 64); a child that kills itself with SIGTERM (expect 143 via WaitStatus);
Ctrl-C under NotifyContext yielding 130 with its cause; os.Exit skipping a deferred flush; a switch over a typed ExitCode
missing a case, which exhaustive must flag; a re-run of a half-finished mutating command.
Cross-reference every candidate rule to the Rust EXIT/CLI ID it mirrors and say where Go's mechanism differs (conflict 16).
Decide: the ExitCode type and the two-line main; the classification shape and its test lock; the SIGPIPE mechanism that
yields exit 0 once, centrally; signal-to-status mapping and Windows behaviour; the idempotent re-run requirement.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `streams-and-terminal`** · family `GO-CLI` · label "stdout discipline, buffering, colour, prompts, config paths and the framework"

```text
Decide the stream and terminal contract of a Go CLI, and the framework fleet Go CLIs use.
Rows: M-F-07..12, M-F-14.
Fetch: clig.dev; no-color.org; pkg.go.dev/golang.org/x/term (IsTerminal, ReadPassword); mattn/go-isatty (IsCygwinTerminal);
pkg.go.dev/os#UserConfigDir and #UserCacheDir; spf13/cobra and spf13/pflag docs; cli.urfave.org/v3; spf13/viper and
knadh/koanf READMEs; CWE-150; GHSA-fwjx-9p69-h25h.
Read: rules/rust-quality/cli-contract.md CLI-01..16 and go-audit/config-inventory.md §4 (the 27-row transfer table).
Test against: cli/cli@9b031151a825 (its iostreams package: colour and TTY decisions per stream), junegunn/fzf@b1be3a8be1b8,
oras-project/oras@a0cd4de5cfcd (JSON output mode), aquasecurity/trivy@ae561f8cca36 (output formats).
Plant in fixtures/cli-streams/: 100k lines via fmt.Println vs a bufio.Writer, timing both, plus a missing Flush on an
early-return path that loses lines; colour decisions under NO_COLOR unset, empty and "1", TERM=dumb, and a pty via
`script -qc` vs a pipe; an error message carrying ESC and U+202E from a registry-supplied name, rendered raw and sanitized;
a JSON mode where one stray log line on stdout breaks `jq .`; a prompt when stdin is not a TTY.
Measure cobra vs urfave/cli v3 vs stdlib flag on one five-subcommand fixture: binary size, startup time, the wiring needed
for exit 64, completion generation.
Decide: the stdout-carries-only-the-result MUST and its check; buffered output and flush discipline; the colour decision
module; prompt and secret rules; config path and precedence rules and whether viper is proportionate; the default
framework (owner Q3, default cobra + pflag).
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 7. `io` — files and processes (GO-IO)

**Dive `subprocess-contract`** · family `GO-IO` · label "exec.Cmd lifetime: context, WaitDelay, pipes, argv and exit errors"

```text
Decide how Go code runs a child process safely; this is the Go SDK's core boundary, since it wraps the ocx CLI.
Rows: M-G-08..14, M-E-18.
Fetch: pkg.go.dev/os/exec (CommandContext; Cmd.Cancel and Cmd.WaitDelay, 1.20; ErrDot, 1.19; ErrWaitDelay; ExitError);
go.dev/blog/path-security; go.dev/doc/godebug (execerrdot); pkg.go.dev/syscall#SysProcAttr (Setpgid) and
golang.org/x/sys/windows job objects; gosec G204.
Read the source: go1.27.1:src/os/exec/exec.go:314 (WaitDelay), :390-447 (the undocumented #execwait finalizer), :1352 (ErrDot);
and /home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py (pid-recycling guard near :803, env composition) as the
behaviour to mirror.
Test against: the 443 exec.Command vs 141 CommandContext split, WaitDelay 8, Cancel 4 (go-audit/exemplar-runtime-posture.md
§6) — sample 20 Command sites and classify; aquasecurity/trivy@ae561f8cca36:pkg/fanal/test/integration/docker/docker.go:63.
Plant in fixtures/subprocess-contract/: a child that forks a grandchild holding stdout open (CommandContext alone hangs
Wait; WaitDelay bounds it — record ErrWaitDelay); a binary resolved from "." returning ErrDot; a started, never-waited Cmd
under GODEBUG=execwait=2; a child writing 1 MiB to stderr while the parent reads only stdout (deadlock) vs concurrent
draining; a bounded capture that truncates; *exec.ExitError vs exec.ErrNotFound vs a context error, told apart; a
process-group kill reaching the grandchild on Linux; a TestMain re-exec helper-process test of the wrapper.
Decide: the MUST shape for starting a child (CommandContext + WaitDelay + a custom Cancel with a SIGTERM grace period);
argv and env rules (no shell, allowlisted env, secrets via stdin or env); pipe draining and capture bounds; how the SDK
tests its wrapper without the real ocx binary; whether execwait=2 belongs in go-diagnose.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `files-and-atomicity`** · family `GO-IO` · label "Atomic writes, os.Root confinement, archive extraction, paths and permissions"

```text
Decide how Go code writes state that survives a crash, and how it opens paths it does not trust.
Rows: M-G-01, M-G-02, M-G-04..07, M-G-15, M-G-16.
Fetch: pkg.go.dev/os#Root and go.dev/blog/osroot (1.24; method set completed in 1.25), with the documented gaps in
os/root.go; pkg.go.dev/path/filepath#IsLocal and #Localize; pkg.go.dev/archive/tar and archive/zip (ErrInsecurePath;
GODEBUG tarinsecurepath and zipinsecurepath); google/renameio README; golang/go#22397 (Windows rename); CVE-2025-3445;
gosec G110, G301-G307 and G305; danluu.com/file-consistency.
Test against: aquasecurity/trivy@ae561f8cca36:pkg/x/os/root.go:12-16 (os.Root wrapper); the 9/92 extraction sites with a
guard (go-audit/exemplar-runtime-posture.md §6) — re-read five unguarded ones and say whether untrusted input reaches them;
bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/go_path.go:153 (0777).
Plant in fixtures/files-atomicity/: a writer SIGKILLed between Write and Rename (old file intact) vs os.WriteFile (file
truncated); `defer os.Remove(tmp)` after a successful rename; tar and zip entries with "../", absolute and symlink-escape
names, extracted via filepath.Join, via IsLocal and via os.Root — record which escape; a zip bomb against an io.LimitReader
bound; os.Root and a symlink pointing out of the root; a Windows-reserved name (CON, NUL) derived from a tag; permission
bits under umask 022 and 077.
Decide: the atomic-write MUST (CreateTemp in the target directory, Sync, checked Close, Rename, directory fsync) and whether
renameio is recommended; the Windows replace strategy; os.Root vs IsLocal as the confinement MUST by go line; extraction
bounds; permission defaults; on-disk format versioning; the cross-process lock recommendation.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

## Staged for wave 3

Seven groups, thirteen dives. Each group depends on at least one wave-2
verdict, and the briefs that consume one are marked **REVISE AFTER WAVE 2**.
Before launch, the orchestrator replaces each "Revise after wave 2" line with
the verdict it names, and deletes any `Rows:` entry that a wave-2
consolidation already settled. `language/stdlib-semantics` has no upstream
dependency and may launch alongside wave 2.

| Group | Dive | Revise after wave 2? | Depends on |
|---|---|---|---|
| `language` | `era-and-modernizers` | **yes** | gates/gate-commands |
| `language` | `stdlib-semantics` | no | — |
| `api` | `package-and-api-shape` | **yes** | errors, io |
| `api` | `sdk-surface` | **yes** | io, errors, cli, testing |
| `network` | `http-client-server` | **yes** | concurrency/context-contract, gates/golangci-config |
| `network` | `registry-client` | **yes** | io/files-and-atomicity, concurrency/context-contract |
| `security` | `untrusted-input-and-crypto` | **yes** | gates/golangci-config, modules/dependency-hygiene |
| `release` | `reproducible-builds-and-stamping` | no | — |
| `release` | `distribution-and-provenance` | **yes** | owner Q4, modules/dependency-hygiene |
| `observability` | `logging-and-metrics` | no | — |
| `observability` | `diagnosis-runbook` | **yes** | concurrency/goroutine-ownership, io/subprocess-contract |
| `bazel` | `rules-go-bzlmod` | **yes** | modules/directives-and-toolchain, owner Q7 |
| `bazel` | `nogo-tests-and-stamping` | **yes** | gates (both dives) |

### 1. `language` — era idioms and stdlib semantics (GO-LANG)

**Dive `era-and-modernizers`** · family `GO-LANG` · label "Era idioms, what go fix owns, and the go-upgrade procedure" · **REVISE AFTER WAVE 2**

```text
Decide which pre-1.22 idioms the rule set states itself, which it delegates wholly to go fix, and the go-upgrade procedure.
Rows: M-A-01, M-A-02, M-A-04..07, M-A-13, M-A-16, M-A-18, M-J-12, M-P-02.
Revise after wave 2: take the gate block and the go-fix-as-gate verdict from go-gates.md (gate-commands) as settled.
Fetch: go.dev/doc/go1.22 through go1.27 release notes; go.dev/doc/godebug (history); go.dev/blog/inliner and
go.dev/blog/range-functions; pkg.go.dev/golang.org/x/tools/go/analysis/passes/modernize; `run.sh go tool fix help` and the
per-fixer help for all 26 fixers; staticcheck SA1019; go.dev/ref/spec (language-version appendix).
Measure: re-run the modernize census on the 12 CI-green repos (491 diagnostics over 183k LOC, 62% any;
go-audit/exemplar-code-shape.md §7) with `go fix -diff ./...`, bucketed by fixer; list every fixer whose rewrite changes
observable behaviour (omitzero confirmed at map time; check stringsseq allocation, rangeint with loop-body mutation,
minmax on NaN).
Plant in fixtures/era-modernizers/: one before/after pair per fixer family with a test proving semantics held (or not);
a go 1.21 to 1.22 bump where a loop-variable copy was load-bearing; timer-channel code under go 1.22 vs 1.23 lines; a
GOEXPERIMENT pin (nojsonv2, nogreenteagc) in a Makefile that the upgrade must notice; generic methods (1.27) and new(expr)
(1.26) behind the go line.
Decide: the rows the rule set states itself (generics restraint, iterator stop contract, alias shims only for migration)
versus those it delegates to go fix; the ordered go-upgrade procedure (release notes, GODEBUG diff, go/toolchain bump,
go fix, stdversion, golangci pin and config bump, GOEXPERIMENT audit, gate) with a check per step; which language
additions are SHOULD and which CONSIDER, each dated.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `stdlib-semantics`** · family `GO-LANG` · label "json/v2 default-on, map order, time, runes, rand and uuid" · no revision needed; may launch with wave 2

```text
Decide the stdlib-semantics rows no linter covers, and chase the json/v2 default-on surprise to a verdict.
Rows: M-A-08..12, M-A-14, M-A-15.
Fetch: go.dev/doc/go1.25 and go1.27 notes (encoding/json/v2); pkg.go.dev/encoding/json/v2 and encoding/json/jsontext (the
v1-compatibility options); go.dev/blog/jsonv2-exp; pkg.go.dev/uuid (1.27) vs github.com/google/uuid; pkg.go.dev/math/rand/v2;
pkg.go.dev/time (monotonic clocks); go.dev/ref/spec (map iteration, string types); 100go.co #36, #37, #75, #77.
Read the source: go1.27.1:src/internal/buildcfg/exp.go:87 (JSONv2 baseline) and src/encoding/json/decode.go:8 (build tag)
— map-time measurement M1.
Plant in fixtures/stdlib-semantics/: v1 json.Unmarshal of duplicate object names, invalid UTF-8, a case-mismatched field
name, a nil slice under omitempty and under omitzero, a large integer into any — run each on default 1.27.1 and under
GOEXPERIMENT=nojsonv2 and diff the results; a golden test ranging over a map, run with -count=5; time.Time == across a
JSON round-trip and with a monotonic reading; string slicing through a multi-byte rune; rand.Seed on 1.27; stdlib
uuid.New vs google/uuid parse and format compatibility.
Test against: the SDK's envelope-decoding needs (go-audit/config-inventory.md §3) and google/go-github@48d0a668cde8's JSON
tags and custom (Un)MarshalJSON methods.
Decide: whether any v1 behaviour changed under default jsonv2 — a P0 either way — and the rule text for libraries whose go
line admits 1.26; the map-order MUST and its check; the time, rune, rand and number rules; the uuid migration row and its
floor; which rows become SA or gocritic checks and which stay reading heuristics.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 2. `api` — package shape and the SDK surface (GO-API)

**Dive `package-and-api-shape`** · family `GO-API` · label "Layout, interfaces, options, global state, doc comments and API evolution" · **REVISE AFTER WAVE 2**

```text
Decide the package and API-shape rules for Go libraries and CLIs, with a decision procedure wherever the canon is split.
Rows: M-D-01, M-D-03..16, M-D-19.
Revise after wave 2: import the error-export verdict (go-errors.md) and the io.Reader/fs.FS/os.Root verdicts (go-io.md).
Fetch: go.dev/doc/modules/layout; go.dev/wiki/CodeReviewComments (interfaces, receivers, package names);
google.github.io/styleguide/go/decisions and best-practices (global state, options, interfaces); go.dev/doc/comment;
go.dev/blog/inliner (//go:fix inline); golang.org/x/exp/cmd/apidiff and gorelease; uber-go/guide (zero-value mutexes,
copy at boundaries, enums at one, embedding); Rob Pike's and Dave Cheney's functional-options posts; revive exported and
var-naming; staticcheck ST1000, ST1003, ST1016, ST1020-22.
Measure: extend the producer/consumer interface split (~55/45 at n=20, go-audit/exemplar-code-shape.md §6) to n=60 across
shapes A and D; classify the 107 func-typed option types as config struct, func or interface options, and whether options
can fail; pkg/ directories with and without a documented reason (11/34 vs 1).
Plant in fixtures/api-shape/: an exported interface with one implementation (ireturn plus a reading heuristic); a caller
aliasing a returned internal slice; an unkeyed literal of a foreign struct broken by a field addition (vet composites);
an exported func deprecated with //go:fix inline and a caller rewritten by go fix; apidiff and gorelease on a removed
method in a v0 and a v1 module, recording exit codes.
Decide: the layout MUST and its check; interface placement; the options decision procedure (conflict 4); global-state and
init rules; the doc-comment MUSTs and the check that enforces them; the self-deprecation path; the API-break gate.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `sdk-surface`** · family `GO-API` · label "The Go SDK that wraps the ocx CLI" · **REVISE AFTER WAVE 2**

```text
Decide the shape of a Go SDK that wraps the ocx CLI as ocx-sdk-python does, so the first consumer can be built from rules.
Rows: M-D-02, M-D-17, M-D-18, M-D-20.
Revise after wave 2: compose the subprocess contract (go-io.md), the typed exit error (go-errors.md), the exit-table mapping
(go-cli.md) and the wrapper-testing method (go-testing.md) as inputs; do not re-decide them.
Read in full: /home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/ (the public __all__, _process.py, _types.py, the TempFail retry)
and go-audit/config-inventory.md §3 (the commitments table); the ocx JSON envelope as the Python SDK parses it.
Fetch: go.dev/doc/modules/layout (internal/); go.dev/doc/modules/release-workflow; pkg.go.dev for
google/go-containerregistry, oras.land/oras-go/v2 and regclient (the library-client alternative to a CLI wrapper).
Test against: google/go-github@48d0a668cde8 (client type, typed results, one public package);
oras-project/oras-go@cb6d6dc79f83 (option shape); cli/cli@9b031151a825 api package.
Plant in fixtures/sdk-surface/: a minimal SDK (Client, one command, typed result, *ExitError, an internal/ process layer)
with a stub ocx built in TestMain; prove that `go list -deps ./...` shows only stdlib and the module's own packages, that
`go doc -all .` shows no any or interface{} on the surface, and that exactly one package is exported.
Decide: package layout and the exported surface; client construction (options vs config struct); typed results vs raw
JSON; a context on every method; where the retry policy lives; wrap-only vs depending on an OCI library (default
wrap-only); versioning the SDK against ocx releases; the MUST list the SDK's CI enforces.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 3. `network` — HTTP and registry clients (GO-NET)

**Dive `http-client-server`** · family `GO-NET` · label "HTTP clients and servers: timeouts, bodies, retries, redirects" · **REVISE AFTER WAVE 2**

```text
Decide the net/http rules for fleet clients, and the one short section for servers.
Rows: M-H-01..06, M-H-09.
Revise after wave 2: take the noctx and bodyclose status from go-gates.md and the context rules from go-concurrency.md.
Fetch: pkg.go.dev/net/http (Client.Timeout, DefaultClient, NewRequestWithContext, CheckRedirect and the cross-host
Authorization rule, Server.ReadHeaderTimeout, Shutdown, MaxBytesReader, Transport defaults); Cloudflare's "The complete
guide to Go net/http timeouts"; RFC 9110 §10.2.3 (Retry-After) and §9.2.2 (idempotent methods); hashicorp/go-retryablehttp
README; 100go.co #79-#81; gosec G107, G112, G114; timakin/bodyclose README.
Test against: go-audit/exemplar-runtime-posture.md §5 (87/143 clients without Timeout, 41/56 servers without
ReadHeaderTimeout, 215 ReadAll vs 105 limits); regclient/regclient@43d2acb9fafd:internal/reghttp/http.go:687-715
(Retry-After without the HTTP-date form); google/go-containerregistry@0c8bedb78437 pkg/v1/remote/transport (retry defaults).
Plant in fixtures/http-client/: a server that never answers (a Client without Timeout hangs; with Timeout it fails); an
undrained body and the resulting connection churn, measured via httptrace; a 1 GiB body against LimitReader and
MaxBytesReader; a 429 with Retry-After in both forms; a redirect to another host carrying Authorization (record what
1.27.1 strips); a server without ReadHeaderTimeout under a slowloris client.
Decide: the client MUST set (timeout or deadline, no DefaultClient, NewRequestWithContext, close and drain); the retry policy
(which statuses, backoff with jitter, both Retry-After forms, idempotent requests only); the redirect-auth rule; body bounds;
transport defaults for registry clients; the server SHOULD section.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `registry-client`** · family `GO-NET` · label "OCI registry clients: digest verification, credentials and staging" · **REVISE AFTER WAVE 2**

```text
Decide how Go code that talks to an OCI registry verifies what it downloads, and where it stages it.
Rows: M-H-07, M-H-08, M-H-10, M-G-03.
Revise after wave 2: use the atomic-write verdict (go-io.md) for staging and the context rules (go-concurrency.md).
Fetch: opencontainers/image-spec descriptor.md (digest grammar: sha256, sha512, blake3) and distribution-spec spec.md;
pkg.go.dev/github.com/opencontainers/go-digest (Verifier); google/go-containerregistry pkg/v1/remote and internal/verify;
oras.land/oras-go/v2 (content/file; credentials.NewStoreWithFallbacks); regclient docs; the docker credential-helpers
protocol; containerd's content.Writer and ingest contract.
Test against: google/go-containerregistry@0c8bedb78437 (verify.ReadCloser checks at EOF only);
oras-project/oras-go@cb6d6dc79f83:content/file/file.go:499-518 (writes in place); containerd/containerd@934434dde54b
content store (ref-based staging); regclient/regclient@43d2acb9fafd.
Plant in fixtures/registry-client/: a blob reader that stops early (a prefix read must not count as verified); a wrong size
with a matching digest prefix; malformed digests (uppercase hex, unknown algorithm, wrong length); two goroutines ingesting
the same digest; a crash mid-download that must leave no partial blob at the final path; credentials resolved through a
config.json credHelper.
Decide: the verify-before-use MUST (size, then digest, at EOF, never on a prefix) and its fixture check; digest-parsing
rules; staging and concurrent-ingest rules; which client library fleet CLIs use, if any, and the credential-helper
requirement.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 4. `security` — Go-specific, checkable security rows (GO-SEC)

**Dive `untrusted-input-and-crypto`** · family `GO-SEC` · label "crypto/rand, TLS, secrets, templates, unsafe and input bounds" · **REVISE AFTER WAVE 2**

```text
Decide the security rows that are Go-specific and checkable, and the policy for unsafe, //go:linkname and cgo.
Rows: M-I-04..09.
Revise after wave 2: the gosec include/exclude verdict comes from go-gates.md, govulncheck triage from go-modules.md.
Fetch: go.dev/doc/security/best-practices; pkg.go.dev/crypto/rand (Text, 1.24), crypto/subtle, crypto/tls (defaults by
version, MinVersion), html/template (contexts), unsafe (the valid pointer patterns); the //go:linkname restrictions in
go.dev/doc/go1.23; securego/gosec rules G101-G120, G401-G404, G117; OWASP Go secure coding practices; RE2 syntax and its
linear-time guarantee.
Test against: go-audit/exemplar-runtime-posture.md §5 and §7 (14 InsecureSkipVerify, 3/4 annotated; 91 math/rand v1 files
unclassified — classify 20 by use; 71 text/template vs 33 html/template — trace 10 to their sinks); the 18 linkname and 325
unsafe files (go-audit/exemplar-code-shape.md §5) — sample 15.
Plant in fixtures/untrusted-input/: a token from math/rand (G404 must fire); a secret compared with ==; a struct with a
Password field marshalled to JSON and logged (G117); InsecureSkipVerify outside tests; text/template feeding an HTML
response; a JSON decoder without a size bound; unsafe.String over a mutable buffer. Record which checker fires on each.
Decide: the crypto/rand MUST and its check; TLS rules; secret-handling rules; the template rule; the unsafe/linkname/cgo
policy for SDKs and CLIs (default: forbidden without an ADR); input bounds beyond HTTP bodies; which gosec rules back a MUST.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 5. `release` — building and shipping Go binaries (GO-REL)

**Dive `reproducible-builds-and-stamping`** · family `GO-REL` · label "Byte-reproducible Go binaries and version stamping" · no revision needed

```text
Decide the build flags and stamping recipe that make a fleet Go binary byte-reproducible and self-describing.
Rows: M-N-01..03, M-N-06, M-N-10.
Fetch: go.dev/blog/rebuild; go.dev/doc/go1.24 (main-module version from VCS) and go1.25 (stamping with several VCS);
pkg.go.dev/runtime/debug#ReadBuildInfo and the cmd/go -buildvcs doc; goreleaser.com/customization/builds/go (mod_timestamp,
flags, ldflags, CommitDate) and goreleaser.com/blog/reproducible-builds; reproducible-builds.org SOURCE_DATE_EPOCH;
pkg.go.dev/cmd/link (-s, -w, -X); pkg.go.dev/net (netgo, the cgo resolver) and os/user.
Test against: the 3/12 goreleaser configs with mod_timestamp and the 10/35 repos stamping with both ldflags and
ReadBuildInfo (go-audit/exemplar-modules-and-release.md §3, §4); goreleaser/goreleaser@ff8de3d6c389:.goreleaser.yaml,
sigstore/cosign@907c3d899c0e and caddyserver/caddy@54937914234b goreleaser configs.
Plant in fixtures/repro-builds/: build one CLI twice from two clean clones at different paths and times, with and without
-trimpath, CGO_ENABLED=0, -buildvcs, and a Date vs CommitDate ldflag — sha256sum each pair and run `go version -m` on each;
a program importing net and os/user built with CGO_ENABLED unset on Linux (record whether cgo was linked); a -s -w build
read by govulncheck -mode=binary and go version -m; cross-compiles for the default matrix with GOAMD64 and GOARM set.
Decide: the reproducibility MUST (flags plus the double-build check); the stamping recipe (ldflags -X for the semver,
ReadBuildInfo for VCS data) and what --version prints; the CGO_ENABLED policy; the default GOOS/GOARCH matrix; whether
-s -w is allowed.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `distribution-and-provenance`** · family `GO-REL` · label "Release assets, signing, provenance, containers, and the go-release procedure" · **REVISE AFTER WAVE 2 AND OWNER Q4**

```text
Decide what a fleet Go release publishes, how it is signed and attested, and the go-release skill's ordered procedure.
Rows: M-N-04, M-N-05, M-N-07..09, M-N-11, M-P-01.
Revise after wave 2: apply the owner's Q4 answer and the govulncheck -mode=binary verdict from go-modules.md.
Fetch: goreleaser.com (v2 config; archives formats: [binary]; checksum; signs; sboms; homebrew_casks; `goreleaser check`;
--snapshot); docs.sigstore.dev (cosign keyless); actions/attest-build-provenance and `gh attestation verify`;
slsa.dev/spec/v1.0; ko.build (SBOM, base images, .ko.yaml); go.dev/doc/modules/release-workflow; pkg.go.dev/about.
Read: the fleet mirror contract, /home/mherwig/dev/mirror-bazelbuild/mirror-base.yml:23-24 (github_asset_digest) and its
anchored asset-name regexes (go-audit/config-inventory.md §5).
Test against: the 12 goreleaser repos (map-time M4) — signs 4, sboms 5, checksum 7, all three 3
(go-audit/exemplar-modules-and-release.md §3, §5); ko-build/ko@fcaeb337b6bd:.goreleaser.yml and .ko.yaml;
sigstore/cosign@907c3d899c0e's release workflow; the four bazelbuild Go binaries the fleet mirrors.
Plant in fixtures/release-dist/: a goreleaser v2 config emitting raw <tool>-<goos>-<goarch>[.exe] binaries plus checksums.txt,
run with --snapshot --clean; `goreleaser check` on a v1-shaped config (must fail); an anchored regex per platform over the
produced asset list (each must match exactly one); cosign sign-blob and verify-blob keyless if feasible offline, else record
why not; an SBOM over binaries and over a ko image.
Decide: the asset-shape MUST the mirror consumes; signing and provenance defaults (Q4); goreleaser v2 hygiene checks; the
container policy; library release steps (tag, gorelease, retract); SHA pinning of release workflows; the go-release
procedure, one check per step.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 6. `observability` — logging, runtime tuning and diagnosis (GO-OBS)

**Dive `logging-and-metrics`** · family `GO-OBS` · label "slog, library logging, pprof exposure and runtime tuning" · no revision needed

```text
Decide the logging and runtime-tuning rows for fleet CLIs and SDKs, and the short SHOULD section for services.
Rows: M-J-01..06.
Fetch: go.dev/blog/slog; pkg.go.dev/log/slog (Handler, LogValuer, DiscardHandler from 1.24); go-simpler/sloglint README; the
vet slog analyzer doc; pkg.go.dev/net/http/pprof; go.dev/doc/gc-guide (GOGC, GOMEMLIMIT); go.dev/blog/
container-aware-gomaxprocs (1.25); go.dev/blog/greenteagc; uber-go/zap and uber-go/automaxprocs READMEs; Discord's "Why
Discord is switching from Go to Rust" (GC pauses over a large cache).
Test against: slog in 11/34 repos vs zap in 6 with more files (go-audit/exemplar-runtime-posture.md §4); the 26
net/http/pprof imports — check each for gating behind a flag or an admin listener; automaxprocs in 3 repos.
Plant in fixtures/logging-runtime/: a library calling slog.SetDefault (a reading heuristic must flag it) vs one accepting a
*slog.Logger with a discard default; mismatched slog key-value pairs (vet slog and sloglint); net/http/pprof on
DefaultServeMux served on the main listener; GOMAXPROCS under a cgroup CPU limit on 1.27.1 with and without automaxprocs
(record both values); GOMEMLIMIT on a short-lived CLI.
Decide: slog as the SHOULD for new code and when zap is justified; the library-logging MUST; the pprof exposure rule; the
GOMAXPROCS/automaxprocs row and its go-line gate; the GC-tuning scope (services only).
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `diagnosis-runbook`** · family `GO-OBS` · label "The go-diagnose runbook: hangs, leaks, races and slowness" · **REVISE AFTER WAVE 2**

```text
Decide the ordered runbook the go-diagnose skill follows for a hung, leaking, racy or slow Go process.
Rows: M-J-08, M-P-03.
Revise after wave 2: fold in the leak-detector verdict (go-concurrency.md) and the execwait=2 verdict (go-io.md).
Fetch: go.dev/doc/diagnostics; pkg.go.dev/runtime/pprof (profiles, including goroutineleak, GA 1.27), runtime/trace
(FlightRecorder, 1.25) and net/http/pprof; go.dev/blog/execution-traces-2024 and go.dev/blog/flight-recorder;
pkg.go.dev/runtime (GOTRACEBACK, the SIGQUIT dump); go-delve/delve docs (attach, core); the Linux 6.12/6.13 core-dump
breakage reported in go-topic-map/practitioner.md §17 — verify it against the Go issue tracker before citing it.
Plant in fixtures/diagnosis/: a deadlocked program (take a SIGQUIT dump and read the goroutine states); a leaking server
(the goroutineleak profile sampled over time); a racy counter (go test -race -count=20, then GORACE=halt_on_error=1); a CPU
hotspot (pprof -top and -list); a stall visible only through trace.FlightRecorder; a leaked exec.Cmd via
GODEBUG=execwait=2. For each, record the exact commands, the output that proves the diagnosis, and the time taken.
Decide: the symptom-to-tool table; the runbook order; which steps need a flag or endpoint the binary must already carry
(pprof, flight recorder); what the skill refuses to do (attach to a production process without consent).
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

### 7. `bazel` — the BZL-GO depth file for `bazel-quality` (BZL-GO)

**Dive `rules-go-bzlmod`** · family `BZL-GO` · label "rules_go and Gazelle under Bzlmod" · **REVISE AFTER WAVE 2 AND OWNER Q7**

```text
Draft the Bzlmod half of rules/bazel-quality/go.md (family BZL-GO), framed "if you adopt Bazel for Go" (2/35, both dogfood).
Rows: M-O-01..04, M-O-07..09.
Revise after wave 2: the go and toolchain directive policy (go-modules.md) is the input to go_sdk.from_file; skip if Q7 is no.
Read first: rules/bazel-quality.md and every depth file it routes to; cite BZL-MOD, BZL-HERM, BZL-CACHE, BZL-TEST, BZL-FLAG,
BZL-ARCH, BZL-LARK and BZL-CI without restating them; rules/bazel-quality/java.md as the house precedent (preamble,
measurement disclosure).
Fetch: bazel-contrib/rules_go docs/go/core/bzlmod.md; bazelbuild/bazel-gazelle README, extend.md and the go_deps extension
docs; registry.bazel.build pages for rules_go and gazelle (current versions, dated); bazel-gazelle#1797 (go_work).
Test against: the MODULE.bazel files and Gazelle directives of bazel-contrib/rules_go@970e99d77c8b and
bazelbuild/bazel-gazelle@63c9a3d2078f (go-audit/exemplar-modules-and-release.md §6).
Run: obtain bazelisk through ocx (the fleet mirrors it); in fixtures/bazel-go/ build one binary, one library, one external
module and a tool directive with go_sdk.from_file, go_deps.from_file and use_repo; run `bazel mod tidy` and a Gazelle
update; plant BUILD drift and a missing use_repo and record the failures. If Bazel cannot run here, say so in a
measurement disclosure and mark every row doc-derived.
Decide: version sourcing; the go_sdk policy; go_deps and use_repo hygiene; Gazelle directives and the drift check; GO_TOOLS;
override precedence; where MVS and Bazel resolution diverge; the routing row and keywords for the bazel-quality index.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

**Dive `nogo-tests-and-stamping`** · family `BZL-GO` · label "nogo parity, go_test modes, stamping and platforms" · **REVISE AFTER WAVE 2**

```text
Complete BZL-GO: static analysis, tests, stamping and cross-compilation for Go under Bazel.
Rows: M-O-05, M-O-06, M-O-10.
Revise after wave 2: measure nogo parity against the gate of record and the vet analyzer list decided in go-gates.md.
Fetch: rules_go docs/go/core/nogo.md, rules.md (go_test race and pure attributes, x_defs, embedsrcs) and platforms.md;
bazel.build/docs/user-manual (--stamp, --workspace_status_command); search for golangci-lint-to-nogo bridges and report
what exists — do not assume one does.
Run in fixtures/bazel-go/ (shared with rules-go-bzlmod): configure nogo with the analyzers go vet runs plus the staticcheck
analyzers the gate requires; plant a copylocks and an SA9010 violation and confirm nogo fails the build; scope includes and
excludes to the root module; run a go_test with race = "on" against a racy fixture; stamp a version via x_defs and
workspace status and read it back; cross-compile with --platforms for linux_arm64 and windows_amd64.
Decide: the nogo configuration that matches the gate of record, and the analyzers it cannot run; go_test mode rules; a
stamping recipe consistent with GO-REL; platform rules; what the measurement disclosure must say.
Env: tools only via /home/mherwig/.cache/research-lang/go-tools/run.sh (Go 1.27.1, GOTOOLCHAIN=local, golangci-lint 2.14.0);
clones in /home/mherwig/.cache/research-lang/exemplars/go/; fixtures in /home/mherwig/.cache/research-lang/go-tools/fixtures/.
Pipe grep/find through rtk proxy. Every check you propose runs verbatim (directory operands, -e alternatives, xargs -r, no
placeholders), is watched red on a planted fixture and green on its fix, and states what empty output means and the version.
```

## Deferred

**35 of the 238 rows are deferred: no wave-2 or wave-3 dive covers them.** The
other 203 are each named in exactly one brief's `Rows:` line. The 35 split
three ways, and only the last group is deferred in the sense of "nobody has
the evidence yet".

### Ready to author from wave-1 evidence — no dive needed (17 rows)

| M-IDs | Why no dive |
|---|---|
| M-K-03, M-K-06 | House conventions `*-CORE-02` and `*-CORE-03`, copied from the sibling indexes ([cfg](go-audit/config-inventory.md) §1.3). |
| M-A-03, M-A-17, M-A-19 | Mechanical. The `any` and `plusbuild` fixers and gocritic `octalLiteral` are the checks, and the counts are measured ([shape](go-audit/exemplar-code-shape.md) §3, §5; [run](go-audit/exemplar-runtime-posture.md) §6). |
| M-C-09, M-C-10, M-C-14, M-C-20 | Resolved by conflicts 15d and 24 and by "Explicitly not a defect". The `atomictypes` fixer checks M-C-09; the rest are SHOULD/CONSIDER prose. |
| M-H-11, M-H-12, M-H-13 | vet `hostport` plus the `hostport` fixer ([map] M3). ServeMux is in the 1.22 notes and netip in Tailscale's rationale ([shift](go-topic-map/shifts.md) §4, §16; [fail](go-topic-map/failure.md) §11). |
| M-M-06 | A one-line rule; the double-count is measured in [gates](go-audit/exemplar-quality-gates.md) §5. |
| M-E-14, M-E-17 | The white-box/black-box split is measured ([shape](go-audit/exemplar-code-shape.md) §1–2). vet `tests` already runs in `go test`'s subset (`go1.27.1:src/cmd/go/internal/test/test.go:654`). |
| M-L-14 | Primary reference: [go.dev/ref/mod §MVS](https://go.dev/ref/mod#minimal-version-selection), via [eco](go-topic-map/ecosystem-tooling.md). |
| M-G-17 | P3. The primary doc ([pkg.go.dev/embed](https://pkg.go.dev/embed)) suffices. |

### Covered by a sibling (3 rows)

| M-ID | Owner |
|---|---|
| M-E-12 | `docs-instrument` (`tested-examples-by-language.md:42-43`) |
| M-N-12 | `docs-quality` for CHANGELOG. The goreleaser-less pipelines stay a pointer in GO-REL. |
| M-O-11 | the `bazel-adopt` skill |

### Genuinely deferred (15 rows)

| M-IDs | Why, and what would promote it |
|---|---|
| M-A-20 | P3 runtime primitives. Promote when a fleet cache or finalizer appears. |
| M-F-13, M-F-15 | Completions, help and TUI. Promote when a fleet Go CLI ships a TUI or completions. |
| M-G-18 | Windows reparse points. Promote if owner Q6 makes Windows first-class and wave 2 finds a symlink case. |
| M-H-14 | CrossOriginProtection and ReverseProxy: services only (owner Q8). |
| M-I-10, M-I-11, M-I-12 | FIPS, CodeQL-only shapes and post-quantum. No consumer asks yet. |
| M-J-07, M-J-09, M-J-10, M-J-11 | PGO, allocation hygiene, Prometheus and OTel: services and performance work outside the named consumers. |
| M-L-12 | Vendoring: 3/35, monorepo-only. |
| M-M-16 | Lint-as-go-test: one exemplar (pebble). |
| M-P-05 | A Go review skill. Revisit once the rule families exist; no language set has one yet. |

## Questions for the owner

Each default applies if there is no answer before the wave-2 consolidations
are authored.

1. **Go floor policy.** What `go` line do fleet Go artifacts declare?
   **Default:** libraries and the SDK declare the oldest supported release's
   `.0` (today `go 1.26.0`), or lower if they need less. CLIs declare the
   current release (`go 1.27.0`). Neither carries a `toolchain` line unless
   it pins a security patch (M-L-01, M-L-02, conflict 12).
2. **SDK runtime dependencies.** **Default:** stdlib-only at runtime;
   `go-cmp` for tests only. This mirrors ocx-sdk-python's zero runtime
   dependencies (M-L-17, M-D-17).
3. **CLI framework.** **Default:** `cobra` + `pflag` for multi-command CLIs,
   with the exit-64 wiring from wave 2, and stdlib `flag` for single-command
   tools. `urfave/cli` v3 is not adopted (M-F-12).
4. **Distribution.** What does a fleet Go release publish? **Default:**
   - goreleaser v2 raw per-platform binaries named `<tool>-<goos>-<goarch>[.exe]`, which the mirror can consume;
   - `checksums.txt`;
   - cosign keyless signatures;
   - GitHub build-provenance attestations.

   No Homebrew, Scoop or winget until asked (M-N-04, M-N-05).
5. **Coverage gate.** **Default:** the SDK is held at 100% by a threshold
   script, like ocx-sdk-python. CLIs get no numeric gate; they get
   integration coverage via `GOCOVERDIR` (M-E-10).
6. **Windows.** **Default:** first-class, mirroring ocx:
   - a `windows-latest` CI leg;
   - atomic replace with a bounded retry;
   - reserved-name checks on registry-derived file names (M-G-02, M-G-07).
7. **Bazel for Go.** **Default:** a compact `rules/bazel-quality/go.md`
   (≤200 lines, BZL-GO) in `bazel-quality` 0.3.0, framed "if you adopt Bazel
   for Go". This reopens a scope the Bazel program closed
   (`bazel-topic-map.md:797`). On "no", section O stays here as research.
8. **Services and daemons.** Shape C covers long-running services.
   **Default:** not a named consumer. Each of `network.md` and
   `observability.md` gets one short SHOULD section (server timeouts and
   shutdown; pprof exposure; GC and GOMAXPROCS). No service-specific depth file.

## Explicitly not a defect

An agent or a reviewer would flag each of these. The evidence says leave them
alone.

**Gate and config:**
- **No golangci config (12/35).** The Go-team and library shape (`go vet` + staticcheck, revive, lint-as-test) is deliberate ([gates](go-audit/exemplar-quality-gates.md) §1, conflict 2).
- **No exemplar on golangci v1 (0/23).** A missing migration is not a gap, so no rule is needed beyond `config verify` ([gates](go-audit/exemplar-quality-gates.md) §1).
- **`go vet` findings.** 9/10 hand-run repos were clean, and go-cmp's 7 `composites` hits are deliberate fixtures ([gates](go-audit/exemplar-quality-gates.md) §5).
- **testify's staticcheck findings.** They sit in vendored forks, not testify's own code ([gates](go-audit/exemplar-quality-gates.md) §5).
- **ko's G703 finding.** It is exclude-list drift, not a vulnerability (`ko-build/ko@fcaeb337b6bd:.golangci.yaml:21-22`).

**Language and idiom:**
- **`x := x` in a `go` ≥1.22 module.** Dead code for `go fix` to remove, not a bug (M-A-02).
- **`time.After` in a `select` loop on ≥1.23.** An allocation, not a leak ([fail](go-topic-map/failure.md) §6).
- **`b.N` loops in benchmarks.** A "last touched" signal, not immaturity; `bloop` is excluded from the safe modernizer suite (golang/go#74967, [cod](go-topic-map/codified.md) §2).
- **Stdlib `regexp` on untrusted input.** RE2 is linear-time and ReDoS-immune by construction ([fail](go-topic-map/failure.md) §13).

**Errors and panics:**
- **cockroachdb/pebble's 1,148 panics.** Deliberate invariant assertions in a storage engine ([shape](go-audit/exemplar-code-shape.md) §4).
- **`defer resp.Body.Close()` on a read-only handle.** The accepted idiom. Only writable handles need a checked Close (M-B-12).

**Concurrency:**
- **Embedded `sync.Mutex`.** The spot-read sites are unexported nested fields, safe (`cockroachdb/pebble@13596f1e1cea:wal/failover_writer.go:355-358`).
- **`go.uber.org/automaxprocs` in a module whose floor is <1.25.** Still correct there; redundant only at ≥1.25 (M-J-06).

**Modules and dependencies:**
- **A committed `go.work` in a multi-module repository.** 4/4 of the committers are multi-module repos, and 3/4 commit `go.work.sum` (conflict 21).
- **A local-path `replace` in a multi-module repository.** A self-reference, not a fork swap ([modrel](go-audit/exemplar-modules-and-release.md) §1).
- **`golang.org/x/exp` imports.** 17 sites in 4 repos, nearly extinct ([shape](go-audit/exemplar-code-shape.md) §3). The `go fix` fixers are the remedy, not a MUST.

**Security:**
- **SQL built with `Sprintf`.** 0/15 real SQL: every spot-read hit was the English word "Delete" or "Select" in a prompt or debug string (`cli/cli@9b031151a825:pkg/cmd/issue/edit/edit.go:495`, [run](go-audit/exemplar-runtime-posture.md) §7).
- **`InsecureSkipVerify`.** 3/4 of the sampled sites are annotated test or opt-in code ([run](go-audit/exemplar-runtime-posture.md) §5).
- **`import "C"` hits.** 97% are in test fixtures. Real cgo appears in 2/35 repos ([modrel](go-audit/exemplar-modules-and-release.md) §7).

**Measurement artifacts:**
- **The frame's `.go` file counts.** containerd's 5,505 falls to 974 production files once vendor/ and testdata are excluded ([shape](go-audit/exemplar-code-shape.md) §1).

## Frame corrections

Every premise of [frame](go-frame.md) that the audits, the scouts or the
map-time measurements overturned or sharpened:

**Hypotheses:**
- **H1 confirmed, with numbers.** 26.8 modernize diagnostics per 10k LOC on CI-green code, 62% of them `interface{}`→`any`; `sort.Slice` family 1,496 vs `slices`/`maps`/`cmp` 8,692; 142 loop-variable copies; `x/exp` 17 ([shape](go-audit/exemplar-code-shape.md) §3, §7).
- **H2 confirmed and sharpened.** `%w` 9,310 vs `%v`-of-err 2,300; 222 `== io.EOF`; 91 message matches; `context.Background()` 964 and `TODO()` 275 outside `main` ([run](go-audit/exemplar-runtime-posture.md) §1–2).
- **H3 confirmed, but its `time.After` example is obsolete.** 78% of `errgroup.Go` sites are unbounded, and 94 `for`-then-`go` sites were found. The `time.After` leak was fixed in 1.23 and its opt-out removed in 1.27 ([run](go-audit/exemplar-runtime-posture.md) §3, [fail](go-topic-map/failure.md) §6).
- **H4 corrected.** golangci-lint v2 is in 23/35 repos, all on the v2 schema. The 12 without it include the Go team's own repos and some of the most-used libraries, and golangci's `standard` default is 5 linters. "go vet defaults are universal" holds only through golangci's `govet`: `go test` runs 11 of 36 analyzers ([gates](go-audit/exemplar-quality-gates.md) §1, §5; `go1.27.1:src/cmd/go/internal/test/test.go:654`).
- **H5 corrected.** testify is in 17/34 repos and go-cmp in 19/34, split by lineage rather than dominated ([gates](go-audit/exemplar-quality-gates.md) §4). The fleet default is stdlib + cmp (conflict 1).
- **H6 corrected.** `toolchain` is in 5/35 (a minority, not common) and `tool` in 4/35. `go.work` is committed in 4/35, all monorepos, with `go.work.sum` in 3/4 ([modrel](go-audit/exemplar-modules-and-release.md) §1).
- **H7 corrected.** slog is in 11/34 repos vs zap in 6, so slog leads by breadth while zap leads by file count ([run](go-audit/exemplar-runtime-posture.md) §4, conflict 9).
- **H8 false.** goreleaser is in 12/35 repos ([map] M4). Among them, `mod_timestamp` is set in 3/12, signing in 4/12, and all three of signs, sboms and checksum in only 3 ([modrel](go-audit/exemplar-modules-and-release.md) §3, conflict 17).
- **H8's premise, that the fleet mirror consumes goreleaser output, is false.** The mirrored Go binaries are raw per-platform assets checked by `github_asset_digest` (`mirror-bazelbuild@713abea9fbb8:mirror-base.yml:23-24`). The mirror repos contain no goreleaser, cosign or SBOM reference ([cfg](go-audit/config-inventory.md) §5).

**Version facts:**
- **`sync.WaitGroup.Go` and GA `testing/synctest` are 1.25, not 1.24.** `synctest.Run` was removed in 1.26 and `synctest.Sleep` added in 1.27 ([shift](go-topic-map/shifts.md) §4, conflict 15).
- **`encoding/json/v2` is default-on in 1.27.1,** with `GOEXPERIMENT=nojsonv2` as the opt-out. It is not "experimental" (`go1.27.1:src/internal/buildcfg/exp.go:87`, [map] M1).
- **A stdlib `uuid` package exists in 1.27** ([map] M2). `google/uuid` becomes a superseded module at go ≥1.27.
- **`go fix` is the modernizer runner since 1.26,** with 26 fixers on 1.27.1. `go fix -diff` exits non-zero on a diff, and `omitzero` changes JSON output ([map] M3).
- **staticcheck 2026.2 disabled SA5011 and added SA9010.** gopls `nilness` replaces SA5011 ([shift](go-topic-map/shifts.md) §10).
- **The vet analyzer `waitgroup` and the fixer `waitgroupgo` are different tools,** not a rename ([cod](go-topic-map/codified.md) §1, [map] M3).

**Artifact set:**
- **The frame's `.goreleaser.yaml` glob matches 2 of 13 goreleaser configs.** Tool-config globs join `go-modules` with 13 patterns ([map] M4–M6, conflict 11).
- **Bazel for Go is 2/35, both dogfood.** `go_deps` has 0 prior research hits, and the Bazel program scoped `rules_go` out (`bazel-topic-map.md:797`). BZL-GO is conditional on owner Q7.
- **Go Example functions are already owned by `docs-instrument`** (`tested-examples-by-language.md:42-43`). Doc comments are GO-API's (conflict 26).

**Measurement methods:**
- **The frame's `.go` counts include vendor/ and testdata;** containerd drops from 5,505 to 974 production files ([shape](go-audit/exemplar-code-shape.md) §1).
- **The golangci census is 23/35, not 21/34.** A depth-2 search missed etcd's `tools/.golangci.yaml` and kubernetes' `hack/golangci.yaml` ([map] M5, conflict 18).
- **Audit citation fixed:** [cfg](go-audit/config-inventory.md) cites `mirror-base.yml:22-23`; the lines are 23-24 at `713abea9fbb8`.

## Wave 2 landed (2026-09-26)

Phase 6 harvest of wave 2: 14 dives, 7 consolidations, read in full. Source
keys for this section: [gates](go-gates.md) · [errors](go-errors.md) ·
[conc](go-concurrency.md) · [testing](go-testing.md) · [modules](go-modules.md) ·
[cli](go-cli.md) · [io](go-io.md). Rule IDs are cited as the consolidations
number them; nothing below edits a consolidation.

### (a) Per group

| Group | Consolidation | IDs | MUST | Conflicts resolved | Follow-ups named |
|---|---|---|---|---|---|
| gates | [go-gates.md](go-gates.md) | 19 (GO-GATE-01..19) | 18 | 15 | bodyclose precision; unattended `--fix` (M-M-15); ST1000/ST1020-22 (M-M-09); `nilnil` vs API design; `exhaustive` for the SDK |
| errors | [go-errors.md](go-errors.md) | 20 (GO-ERR-01..20) | 13 | 18 | `errorlint` FP rate on ≥5 exemplars (caddy's 462 hits unread); `*ExitError` fields beyond `Code`; SA4023 test-file blind spot upstream |
| concurrency | [go-concurrency.md](go-concurrency.md) | 19 (GO-CONC-01..19) | 11 | 9 | stdlib leak detector vs goleak; report-all fan-out (M-C-04); a fan-out analyzer; `FailNow` in `wg.Go` closures |
| testing | [go-testing.md](go-testing.md) | 20 (GO-TEST-01..20) | 11 | 10 + 4 row routings | json/v2 × golden files; `FailNow`-in-`wg.Go` analyzer and goleak vs `goroutineleak`; SDK coverage scope; Windows test behaviour |
| modules | [go-modules.md](go-modules.md) | 18 (GO-MOD-01..18) | 14 | 8 | Dependabot and the `toolchain` line; `-mode=binary` on mirrored binaries; `go.work` `godebug` precedence and `ignore`; nested-module tags via a proxy |
| cli | [go-cli.md](go-cli.md) | 16 (GO-CLI-01..16) | 12 | 11 | Windows legs of GO-CLI-07/08/13; `markStarted` under cobra edge cases; a per-stream colour library |
| io | [go-io.md](go-io.md) | 20 (GO-IO-01..20) | 14 | 12 | Windows runtime (rename retry, dir sync, job objects, reserved names); post-Wait pgid sweep safety and `Pdeathsig`; GO-IO-18 into registry-client |
| **total** | 7 files | **132** | **93** | **83** | 26 |

The MUST counts reproduce each file's own tally (gates 01-18 with 07 and 18
scoped; errors "MUST count: 13"; conc 01,02,03,04,06,07,08,09,10,11,13; testing
"MUST count: 11"; modules "MUST count: 14"; cli 01-07, 09, 11-14; io "MUST
count: 14").

### (b) Surprises, each with a verdict

Verdict keys: **promote** (a next-wave dive chases it), **fold** (an existing
brief or group revision absorbs it), **defer** (recorded against an M-ID),
**reject** (already a rule, or wrong). "Folded-in-wave-2" means the
consolidation already turned it into a rule, so no further work.

**gates / golangci-config**
- `uniq-by-line: true` silently drops same-line findings — reject (folded-in-wave-2: GO-GATE-10).
- gosec G101 fires only on package-scope `const`/`var`, never a local `:=` — **fold** into `security/untrusted-input-and-crypto`: secrets-in-source needs a reading heuristic, not G101 (M-I-06).
- `std-error-handling` preset acts before `nolintlint`, so a correct `//nolint:errcheck` reads as unused — **promote** as part of `gates/config-revision`: it is the same preset GO-ERR-09 forbids and [gates]' own config enables (contradiction 1 below).
- "bundled staticcheck ignores `staticcheck.conf`" was inconclusive in the dive — reject (settled by [gates] C-3: the cause is `os.UserCacheDir()` exclusion, `dominikh/go-tools@6cb65e58a558:config/config.go:22-37`).
- `bodyclose`'s only FP shape is a response body wrapped into another `io.ReadCloser` — **fold** into `network/http-client-server` (classify regclient's 78 non-test hits; decide linter vs reading heuristic for GO-NET).
- `usestdlibvars` fires only on typed `resp.StatusCode == 200` — **fold** into `network/http-client-server` as a scope caveat on a baseline linter.

**gates / gate-commands**
- `omitzero` fixer declines the behaviour-changing rewrite by default — reject (folded: GO-GATE-03; map M3's "changes JSON output" was overstated, see Frame corrections).
- golangci `govet` ≡ bare `go vet` on 1.25-era analyzers — reject: [gates] verdict 3 keeps `go vet` as its own step anyway (GO-GATE-02).
- a `tool` directive's dependencies land in consumers' `go list -m all` — reject (folded: GO-MOD-11).
- `stdversion` joined `go test`'s vet subset only in 1.27 — **fold** into `language/era-and-modernizers` (the go-upgrade procedure's stdversion step differs by toolchain); already GO-MOD-01's floor cell.
- govulncheck's reachable-finding exit code is 3 — reject (folded: GO-MOD-12).
- `hostport` fires only when the `Sprintf` result reaches `net.Dial` in the same function — **fold** into `network/http-client-server`; M-H-11 (ready-to-author) must state the limit.

**errors / wrapping-and-classification**
- `errors.AsType` compiles under a `go 1.25` line on a 1.27 toolchain; only vet `stdversion` catches it — **fold** into `language/era-and-modernizers`: stdlib API availability is not gated by the `go` line, which the upgrade procedure and GO-MOD-01 both depend on.
- `errorf` flags the Google `%w`+`%v` hiding idiom — reject (folded: GO-ERR-01's `err.Error()` flattening, watched green).
- SA4023 is blind when the only nil comparison sits in `_test.go` — **defer** against M-B-08 as a dated re-check: the `go-upgrade` skill re-runs the SA4023 probe on each staticcheck bump; GO-ERR-05's reading heuristic carries the MUST meanwhile.
- `errorlint`'s `io.EOF` exemption is keyed on the static interface type — reject (folded: GO-ERR-03 moves the defect to the reader).
- `wrapcheck` flags decorator passthroughs — reject (wrapcheck not adopted, GO-GATE-16).
- cli/cli mixes pointer and value error receivers correctly — reject (folded: GO-ERR-17).

**errors / panics-exits-cleanup**
- golangci-lint v2 has zero default exclusions — reject (folded: GO-ERR-08); it also overturns this map's "Explicitly not a defect: `defer resp.Body.Close()`" (Frame corrections).
- the preset is read/write-blind — **promote** with `gates/config-revision` (contradiction 1): removing the preset changes errcheck's volume on every exemplar, and nobody has measured that.
- revive `deep-exit` is not in revive's default set — reject (folded: GO-GATE-15).
- `deep-exit` + `exitAfterDefer` collide under uniq-by-line — reject (folded: GO-GATE-10).
- gosec G104 never fired — reject (folded: GO-GATE-14 excludes it).
- a third of `_ =` hits are not error discards — reject (folded: GO-ERR-19 keeps `check-blank` off).

**concurrency / goroutine-ownership**
- `synctest` hangs to `-timeout` on out-of-bubble leaks — reject (folded: GO-CONC-11).
- the `goroutineleak` profile misses global-reachable goroutines by design — **fold** into `observability/logging-and-diagnosis` (go-diagnose symptom table).
- vet `waitgroup` shape is invisible to `-race` (10/10) — reject (folded: GO-CONC-07, GO-GATE-02).
- send-on-closed is a race report 1 run in 5 — reject (folded: GO-CONC-15).
- errgroup deliberately does not propagate panics — reject (folded: GO-CONC-16).
- `var wg errgroup.Group` exists, so `wg` is not evidence of `sync.WaitGroup` — reject (folded: GO-CONC-14 and failure mode 7).

**concurrency / context-contract**
- `contextcheck` FP on the functional-options-override idiom — reject (folded: GO-CONC-02 bans the idiom for the SDK).
- SA1012 misses `nil` through a function value — reject (folded: GO-CONC-01 notes it).
- no linter catches `WithTimeout` losing its cause — reject (folded: GO-CONC-17 is a proven-unlintable heuristic).
- `NotifyContext`'s cause is a 1.26 change to an existing function's semantics — **fold** into `language/era-and-modernizers` (M-A-13: behaviour that changes with no compile error on a toolchain bump).
- `fatcontext`/SA1029 have zero live hits — reject (GO-CONC-05 stays SHOULD; GO-CONC-04's key rule is SA1029 default-on).
- `noctx` flags a build script's `exec.Command` with no caller to cancel — reject: the fix is `exec.CommandContext(context.Background(), …)` at that script's entrypoint, which GO-CONC-01 allows.

**testing / test-style**
- a one-line `x++` race passes `-race` by luck — reject (folded: GO-TEST-09's fixture shape).
- go-github already uses `synctest.Test` — reject (evidence for GO-TEST-11).
- `testifylint` is signal on testify repos — reject (folded: GO-TEST-03).
- goreleaser is 97% `require` — reject (folded: GO-TEST-03 tolerance clause).
- cli/cli ships both CLI test shapes — reject (folded: GO-TEST-18).
- `golang/mock` has 0 importers — reject (folded: GO-TEST-08, GO-MOD-08).

**testing / time-fuzz-coverage**
- `b.Loop` +182.86% on a nanosecond body — reject (folded: GO-TEST-19).
- `usetesting` settings defaults — reject (corrected in [testing] C4 and folded into GO-TEST-06).
- the seed corpus alone reproduces the planted panic — reject (folded: GO-TEST-14).
- no `bloop` fixer in 1.27.1 — reject (folded: GO-TEST-19).
- CI fuzzing in 3/32 — reject (folded: GO-TEST-15).
- `benchstat` in 0/32 CI setups — reject (folded: GO-TEST-20).

**modules / directives-and-toolchain**
- `go mod init` on 1.27.1 writes `go 1.27.1` (the N-1 default was reverted in 1.26.1) — reject (folded: GO-MOD-01); recorded as a frame correction.
- a `use`-only sibling fails under `GOWORK=off` — reject (folded: GO-MOD-05).
- nested modules are invisible to a root `./...` — reject (folded: GO-MOD-06).
- prometheus commits `go.work` without `go.work.sum` — reject (compliant, [modules] conflict 5).
- `GOTOOLCHAIN=auto` fails rather than falling back — reject (folded: GO-MOD-16 sets `GOTOOLCHAIN=local`).
- grpc-go never bumps major while go-github sits at `/v92` — **fold** into `api/package-and-api-shape`: the API-break gate must say which strategy fleet libraries take.

**modules / dependency-hygiene**
- `-mode=binary` over-reports 4× on `-s -w` builds — **fold** into `release/reproducible-builds-and-stamping` (the `-s -w` decision now has a price) and `release/distribution-and-provenance` (run it on the four mirrored bazelbuild binaries).
- govulncheck json/sarif always exit 0 — reject (folded: GO-MOD-12).
- stdlib `uuid` is narrower than google/uuid — reject (folded: GO-MOD-09, source-read in [modules] C7); the `stdlib-semantics` brief drops its uuid-surface plant.
- go-yaml archived 2025-04-01; `go.yaml.in/yaml` already leads — reject (folded: GO-MOD-08).
- two Dependabot configs cover Actions only — reject (folded: GO-MOD-17).
- `golang/mock` archive confirmed by API — reject (folded).

**cli / exit-codes-and-signals**
- cobra never exits and never assigns 64 — reject (folded: GO-CLI-06); frame correction for map M-F-03.
- a custom root `Args` validator disables unknown-subcommand detection — **promote** as `cli/reference-skeleton`: GO-CLI-06 is MUST and the skeleton ships as the support-directory example.
- `NotifyContext`'s cause is an unexported string — reject (folded: GO-CLI-08, GO-CONC-17).
- `signal.Ignore(SIGPIPE)` without a central check exits 2 — reject (folded: GO-CLI-07).
- a dropped flush exits with the same code — reject (folded: GO-CLI-02/04).
- `ExitError.ExitCode()` on a signal death gives 255 — reject (folded: GO-CLI-12).

**cli / streams-and-terminal**
- `%q` incidentally sanitizes control and bidi runes — reject (folded: GO-CLI-11 names `%q` as not the sanitizer).
- urfave/cli v3 hardcodes exit 3 for an unknown command — reject (folded: GO-CLI-16).
- urfave's own exit-code example ends in `log.Fatal` — reject (folded: GO-CLI-16).
- urfave produces the largest binary — reject (evidence for GO-CLI-16).
- viper's size and `go.sum` weight — reject (folded: GO-CLI-15).
- `fatih/color` decides colour once, against stdout — **fold** into `cli/reference-skeleton` (survey a per-writer colour library for GO-CLI-13).

**io / subprocess-contract**
- SA1005 exempts `/bin/sh` as argv[0] — reject (folded: GO-IO-08).
- G204 gives no credit for `CommandContext` — reject (folded: GO-IO-13).
- `WaitDelay` bounds `Wait` even with no context — reject (folded: GO-IO-07).
- a canceled child dies by signal and reports `*exec.ExitError`, not a context error — reject (folded: GO-IO-10).
- `GODEBUG=execwait=2` is undocumented and panics — **fold** into `observability/logging-and-diagnosis` (a go-diagnose step, per [io] conflict 11) and keep GO-TEST-12's CI use.
- no exemplar combines `CommandContext`+`WaitDelay`+`Cancel`+`Setpgid` — **promote** as `io/process-group-sweep`: the fleet's GO-IO-14 MUST has no precedent, so its safety must be proven, not copied.

**io / files-and-atomicity**
- tar/zip are insecure by default and `zip.NewReader` returns entries with the error — reject (folded: GO-IO-02, GO-IO-05).
- 4 of 5 "unguarded" extraction sites were guarded — reject (resolved, [io] conflict 12).
- `IsLocal("CON")` is true on Linux — reject (folded: GO-IO-16).
- gosec README and RULES.md disagree on G307 — reject (failure mode 12 in [io]).
- renameio exports nothing on Windows — reject (folded: GO-IO-17 and [io] conflict 8).
- a crash leaves an orphaned `*.tmp` beside a successful atomic-write design — **fold** into `network/registry-client`, which also takes M-G-15 (on-disk format versioning, which no GO-IO rule decided).

### (c) Map rows affected

| Rows | Effect |
|---|---|
| M-K-01, M-K-02, M-K-05 | Settled: GO-GATE-01 block, GO-GATE-12 + GO-CORE-01, GO-GATE-05 + GO-CORE-05 |
| M-K-04 | Settled into GO-MOD-01 (`stdversion`; `go test` runs it from 1.27) |
| M-M-01..08, M-M-10..13 | Settled (GO-GATE-01..18); M-M-06 is GO-GATE-16 |
| M-M-09 | Split: nilness half settled (GO-GATE-11); ST1000/ST1020-22 moved to `api/package-and-api-shape` |
| M-M-14 | Partly settled (GO-GATE-04/07, GO-MOD-16); SHA pinning stays with M-N-11 |
| M-M-15 | Open → `gates/config-revision` |
| M-L-01..11, M-L-13, M-L-15..19, M-I-01, M-I-02, M-P-04 | Settled (GO-MOD-01..18); M-I-01/02 moved from GO-SEC to GO-MOD-12/13 |
| M-L-03 | Premise false (N-1 reverted in 1.26.1); absorbed by GO-MOD-01 |
| M-L-12 | Stays deferred (owner default: no vendoring) |
| M-B-01..19 | Settled (GO-ERR-01..20); M-B-10 split into GO-ERR-11 (MUST) and GO-ERR-12 (SHOULD) |
| M-C-01..03, 05..08, 11..13, 15..19 | Settled (GO-CONC-01..19) |
| M-C-04 | Unwatched SHOULD (GO-CONC-14) → `cli/reference-skeleton` watches it |
| M-C-09 | Settled (GO-CONC-12); M-C-10, M-C-14, M-C-20 dropped as the map expected |
| M-E-01..10, 13, 15, 16, 18 | Settled (GO-TEST-01..20) |
| M-E-11 | Owned by GO-GATE-04; M-E-12 routed to docs-instrument; M-E-14 and M-E-17 dropped ([testing] C-17) |
| M-F-01..12, 14, 16 | Settled (GO-CLI-01..16); M-F-01's "two-line main" is now three statements (GO-CLI-02) |
| M-F-13, M-F-15 | Stay deferred |
| M-G-01, 02, 04..14, 16 | Settled (GO-IO-01..20); M-G-08 answered: `noctx` covers `os/exec` at 2.14.0 |
| M-G-03 | GO-IO-18 SHOULD, unwatched → `network/registry-client` |
| M-G-12 | Not a GO-IO rule: GO-TEST-12 CI check plus a go-diagnose step |
| M-G-15 | **Unanswered** by wave 2 (no GO-IO rule) → `network/registry-client` |
| M-G-17 | Ready-to-author (unchanged); M-G-18 stays deferred (no Windows runtime) |
| M-H-03 | `bodyclose` demoted to SHOULD (GO-GATE-19); the GO-NET decision is open |
| M-H-11 | Ready-to-author, now with the same-function limit of vet `hostport` |
| M-A-15 | uuid surface settled (GO-MOD-09); only format and parse compatibility remain |
| M-D-17, M-B-03 | SDK error shape settled (GO-ERR-20); the SDK's remaining surface → `api/sdk-surface` |
| M-J-06 | automaxprocs supersession settled (GO-MOD-09); the GOMAXPROCS sizing row stays with GO-OBS |
| M-O-01..10, M-J-01..06, 08, M-P-01..03 | Unchanged; briefs revised below |

### (d) Frame corrections

- **`go mod init` writes the current version.** On 1.27.1 it writes `go 1.27.1`; the 1.26.0 "N-1" default was reverted in 1.26.1 (golang/go#77653, #77860; [modules] conflict 6). Map conflict 12 and row M-L-03 took the premise from the 1.26 notes.
- **golangci-lint v2 has no default exclusions.** Bare `defer resp.Body.Close()` is an errcheck finding under v2 unless exempted by `exclude-functions: ["(io.ReadCloser).Close"]` (GO-ERR-08/09). This map's "Explicitly not a defect" entry for it is wrong as written.
- **The `omitzero` fixer does not change JSON output by default.** It applies the safe alternative and logs the declined rewrite (GO-GATE-03). Map M3 overstated it.
- **`noctx` covers `os/exec` and the `net` family** at golangci-lint 2.14.0 (GO-CONC-03). Map row M-G-08 said "to be confirmed".
- **vet `waitgroup` and `hostport` fire regardless of the module's `go` line** once the toolchain is ≥1.25 ([gates] C-10).
- **`testinggoroutine` is not in `go test`'s vet subset** (`go1.27.1:src/cmd/go/internal/test/test.go:684`, [testing] C1); `stdversion` joined that subset only in 1.27.
- **Stdlib API availability is not gated by the `go` line.** `errors.AsType` compiles in a `go 1.25` module on a 1.27 toolchain; only vet `stdversion` catches it, and staticcheck does not (GO-ERR-04).
- **Nil-dereference detection after staticcheck 2026.2 needs `govet enable-all`** (the `nilness` pass). Bare `go vet` and golangci's default `govet` do not run it ([gates] C-1). The frame's "gopls nilness replaces SA5011" is true only through that setting.
- **cobra never calls `os.Exit`** (`spf13/cobra@adbc8813901b:command.go:1070-1073`); map row M-F-03's "cobra's default exit 1" is the author's `main`, not cobra.
- **`signal.NotifyContext`'s 1.26 cause is an unexported string with no signal accessor** (`go1.27.1:src/os/signal/signal.go:352-361`). Map row M-C-18/M-F-06's reading of it as a typed exit path is wrong.
- **errorlint `errorf` is on by default under golangci-lint 2.14.0** once `errorlint` is enabled; map conflict 22's "ships off" holds only for standalone `go-errorlint`.
- **`archive/tar` and `archive/zip` are permissive by default in 1.27.1** (`tarinsecurepath`/`zipinsecurepath`); only a `godebug` pin in a main module turns `ErrInsecurePath` on (GO-IO-05).
- **tailscale does not layer `staticcheck.conf` under golangci's staticcheck** (`tailscale/tailscale@6b3a45f14ef6:.golangci.yml:9-15`). Map conflict 20's evidence is corrected; its rule stands on [gates] C-3.
- **trivy enables the `std-error-handling` preset** (`aquasecurity/trivy@ae561f8cca36:.golangci.yaml:201`), as do 13 of the 23 exemplar configs.
- **`GODEBUG=execwait=2` panics the program**; it is a CI or diagnosis switch, never a runtime default ([io] conflict 11).

### (e) Cross-consolidation contradictions

Every ruleset was read against every other. Each pair below conflicts or
overlaps; the resolution names which ID's text the drafters keep.

1. **GO-GATE-09's config enables `std-error-handling`; GO-ERR-09 (MUST) forbids it.** `go-gates.md:180` has `presets: [comments, std-error-handling, common-false-positives]`, and GO-ERR-09's own grep (`grep -rn --include='*golangci*' -e 'std-error-handling' .`) turns red on the fleet config. **Resolution:** GO-ERR-09 keeps its text. The preset silences the write-close defect GO-ERR-08 exists for (`golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:53-59`), which is measured, while the gates file enabled it with no measurement. GO-GATE-09's config block is corrected in `gates/config-revision`: remove `std-error-handling`, add `errcheck.settings.exclude-functions: ["(io.ReadCloser).Close"]`. The errcheck volume change is measured there before the drafters copy the config.
2. **GO-GATE-10 (`uniq-by-line: false`, MUST) vs GO-ERR-13's verification ("leave `issues.uniq-by-line` at its default") and [errors] conflict 7.** [cli]'s config fragment also sets it `false`. **Resolution:** GO-GATE-10 keeps its text; it is measured on three fixtures ([gates] §1b, C-5, [errors]' own ST1005 re-run). GO-ERR-13's verification cell drops the uniq clause and cites GO-GATE-10.
3. **GO-ERR-13 says gocritic "at its defaults"; GO-GATE-15 allows gocritic only as `disable-all` plus `enabled-checks`, and only in the CLI overlay (GO-GATE-18).** **Resolution:** GO-GATE-15/18 keep their text. `exitAfterDefer` matters only inside `func main`, which only CLIs have; library code gets revive `deep-exit` from the baseline. GO-ERR-13 cites both rows.
4. **GO-GATE-13's depguard list (6 entries) vs GO-MOD-08's (12 entries on `files: ["$all"]`).** Both are MUST on the same linter. **Resolution:** GO-MOD-08 keeps the list text, on the map's section-L ownership and the precedent of [modules] conflict 8. GO-GATE-09's config quotes GO-MOD-08's list verbatim; GO-GATE-13 becomes a citation row ("the `superseded` rule is GO-MOD-08; the `no-testify` rule is GO-TEST-02") and adds no text of its own. The ID is kept, never renumbered.
5. **GO-TEST verdict 7 and its SDK commitment ("go-cmp is the only test dependency") vs GO-CONC-11 (goleak `VerifyTestMain`, MUST for the SDK).** **Resolution:** the owner default in [conc] Open question 1 applies — goleak is admitted as a second test-only SDK dependency — and GO-CONC-11 keeps its text. GO-TEST's SDK commitment row is reworded at authoring to "go-cmp and goleak, test-only". GO-MOD-10 is unaffected because it excludes test imports. `observability/logging-and-diagnosis` tests a stdlib `runtime.Stack` diff; if it catches 3/3, GO-CONC-11 is revised to it and the SDK returns to go-cmp only.
6. **Citation drift: [conc] and [testing] cite `GO-GATE-COMMANDS-01/02/04/08` and [modules] cites `-05`.** Those are the gate-commands dive's draft numbers; no consolidation defines them (13 citations). **Resolution:** drafters map `-01` → GO-GATE-01, `-02` → GO-GATE-02, `-04` → GO-GATE-03, `-08` → GO-GATE-04, `-05` → GO-MOD-03.
7. **Per-family config fragments restate parts of the fleet config** ([conc] "Gate config assumed", [cli] "caught by golangci-lint", [errors] `.golangci-errorlint.yml`). The [cli] fragment enables `errcheck`/`revive` again, and the [conc] fragment has a one-rule revive list that would *replace* `deep-exit` if copied (GO-GATE-15). **Resolution:** GO-GATE-09 (baseline) and GO-GATE-18 (CLI overlay) are the only config text; depth files cite linter names, never paste YAML.
8. **GO-CLI-02 (three-statement `main` with `reraise`) vs GO-ERR's CLI commitment `func main() { os.Exit(run()) }` and map M-F-01's "two-line main".** **Resolution:** GO-CLI-02 keeps its text; the re-raise is what makes a signal death visible to a `wait()`-based parent ([cli] verdict 6). The GO-ERR commitment row cites GO-CLI-02.
9. **GO-IO-01 and GO-CONC-03 are both MUST on `noctx`, both naming `exec.Command`.** **Resolution:** GO-IO-01 keeps the `os/exec` text ([io] conflict 10). GO-CONC-03's text narrows to the `net/http` and `net` forms and keeps the tests-included clause. GO-NET cites GO-CONC-03 for the HTTP half rather than creating a third row.
10. **GO-CONC-17 has CLIs keep `signal.NotifyContext` for propagation; GO-CLI-08 wires a `signal.Notify` channel into `context.WithCancelCause` and passes that to `ExecuteContext`, so no `NotifyContext` is needed.** **Resolution:** GO-CLI-08 keeps the CLI wiring text; GO-CONC-17 keeps the SDK cause clause and its CLI clause becomes a pointer to GO-CLI-08.
11. **GO-ERR-12 (`nilnil`, SHOULD) vs `nilnil` in the blocking baseline (GO-GATE-09).** [gates] left "nilnil vs API design" open. **Resolution:** no conflict under the house tiers. A SHOULD is fixed unless a reason is stated, and `//nolint:nilnil // <reason>` (required by GO-GATE-12) is that stated reason, which covers ko's and oras-go's deliberate nil-means-absent returns. The config gains GO-ERR-12's `checked-types`, which GO-GATE-09 lacks. Whether the SDK surface may return `(nil, nil)` at all is `api/sdk-surface`'s question.
12. **GO-ERR-20 (`*TimeoutError`, never matching `*ExitError`) vs GO-CONC-17 (the SDK timeout's cause is an exported sentinel, `ErrOcxTimeout`, that callers `errors.Is`).** Two timeout representations for one event. **Resolution (provisional):** GO-ERR-20 keeps the type. GO-CONC-17's sentinel becomes the `Is` target of `*TimeoutError`, and the cause passed to `WithTimeoutCause` is the `*TimeoutError` value. `api/sdk-surface` pins it with a contract test.
13. **GO-CLI-01's `exhaustive` clause vs GO-GATE-18 (the overlay is CLI-only), for an SDK that mirrors the 0-86 table.** **Resolution:** until `api/sdk-surface` measures it, the `exhaustive` clause binds CLIs only; GO-GATE-18 keeps its text.
14. **GO-GATE-01's block runs `go fix -diff` and `golangci-lint run` once, while GO-MOD-16 tests libraries on `[oldstable, stable]`.** Fixer and analyzer sets differ by toolchain (`atomictypes` needs 1.27, GO-CONC-12; `stdversion` joins `go test` only in 1.27). **Resolution:** the drafters state it in GO-GATE-01's text: steps 1-4, 7 and 8 run once on the `stable` leg (the CLI's `toolchain` line); steps 5-6 run on every matrix leg. GO-MOD-16 keeps its text.
15. **GO-IO-06 and GO-CLI-07 rely on `GOOS=windows go vet ./...`, a step GO-GATE-01's block does not have.** **Resolution:** GO-GATE-07's Windows and macOS test legs compile the OS-specific files for the SDK and CLIs, which satisfies GO-IO-06 there. Libraries, whose extra legs are only SHOULD, run GO-IO-06's cross-`GOOS` vet. GO-IO-06 keeps its command; GO-GATE-01 is unchanged.
16. **Open questions one consolidation raised and another already answered.**
    - [testing] Open question 2 (the `usetesting` context settings unmeasured on 5 exemplars): answered by [gates] C-6. All hits are true-positive modernization debt, so GO-TEST-06 stands.
    - [conc] Open question 2 (context linters with tests included): answered by GO-GATE-09, which excludes only `gosec` in `_test.go`.
    - [io] Open question 2 (gosec thresholds): answered by GO-GATE-14.
17. **GO-TEST-12 ("leak-freedom checked under `GODEBUG=execwait=2`") vs GO-IO conflict 11 ("never a GO-IO runtime rule").** Consistent: it is a CI and diagnosis switch. GO-TEST-12 keeps its text; the go-diagnose step comes from `observability/logging-and-diagnosis`.

### (f) Convergence

**Verdict: not converged. Needs another round.** The stop condition in
[wave-plan](../../.claude/skills/research-lang/references/wave-plan.md#convergence)
fails on every clause:
- Wave 2 added 93 MUST rules in seven freshly opened families.
- It added 84 ranked agent failure modes; for example, "the `std-error-handling` preset because the name sounds right" and "`0 issues.` on stdout with exit 7" are new.
- Seven of the fourteen artifact families have no consolidation at all: GO-LANG, GO-API, GO-NET, GO-SEC, GO-REL, GO-OBS and BZL-GO. Three of them carry P0 rows: M-A-10 and M-A-14, M-D-01/02/17, and M-H-01/03/07.
- Contradiction 1 means the config the drafters would copy fails a MUST on its own tree.

Every open question from the seven consolidations, classified:

| Class | Questions | Disposition |
|---|---|---|
| **Owner decision, default applied** | golangci pin v2.14.0 and bump via go-upgrade; `-race` on the Linux leg only; `no-testify` on in the baseline; read-only `*os.File` closes use the `errors.Join` shape; `nilnil` `detect-opposite` off; goleak as an SDK test dependency; CI fuzz budget (seeds per PR, 60 s scheduled); CLI toolchain patch cadence within a week; no private modules (GO-MOD-18 stays CONSIDER); no vendoring; Windows Ctrl-C exits 130; GO-CLI-08 stays SHOULD; an untyped `PersistentPreRunE` error is 64; no Windows job object in SDK v0.1; the process-group helper stays internal | Applied; drafters state each as a default the adopter may override |
| **Measurement the sandbox cannot supply** | Windows runtime behaviour: GO-IO-16/17, the directory `Sync` of GO-IO-11, job objects, the Windows legs of GO-CLI-07/08/13, and Windows test behaviour (`t.TempDir` handles, `os.Executable`, testscript quoting) | Residue. No `windows-latest` runner exists here. GO-IO-17 stays SHOULD, and GO-CLI-07's Windows branch is compile-verified only. Adopters' GO-GATE-07 legs will surface these |
| **Dated re-check** | SA4023's `_test.go` blind spot; the G115 exclusion after a golangci bump (GO-GATE-14); json/v2 golden churn at each Go minor release | `go-upgrade` skill steps |
| **Answerable now, load-bearing** | `errorlint` FP rate (GO-ERR-01 is MUST on a 0/15 sample); errcheck volume without the preset (contradiction 1); unattended `--fix` allowlist (M-M-15, agent loops); `FailNow` in `wg.Go` analyzer probe; `markStarted` edge cases (GO-CLI-06 MUST, shipping skeleton); joined-error classification (M-C-04); pgid-reuse safety of the GO-IO-14 sweep (a MUST that could kill an unrelated process group); `bodyclose` on regclient; ST1000/ST1020-22 vs revive `exported`; SDK `*ExitError` fields, timeout shape, `exhaustive`, surface `(nil, nil)` and coverage scope for the 100% gate; stdlib leak detector; json/v2 × golden and envelope bytes; Dependabot on `toolchain`; `go.work` `godebug` precedence; `-mode=binary` on mirrored binaries; nested-module tags via a proxy; M-G-15 format versioning and tmp sweep; GO-IO-18 concurrent ingest | Commissioned below |
| **Answerable now, not load-bearing** | A custom fan-out analyzer for GO-CONC-13 | Rejected. A shipped `go/analysis` pass is outside the artifact set (rules and skills), and GO-CONC-13's triage grep plus reading stays the check |

### (g) Next wave

Fourteen dives: three revisions of existing groups first, because they fix
config and contract text other groups consume, then the eleven staged dives
across seven new groups. Two staged pairs are merged:
- `observability`: `logging-and-metrics` and `diagnosis-runbook` share one consolidation, and services are not a named consumer (Q8).
- `bazel`: `rules-go-bzlmod` and `nogo-tests-and-stamping` feed one ≤200-line depth file for a 2/35 practice (Q7).

1. `gates/config-revision` (GO-GATE, revision). It corrects the fleet config (contradictions 1, 4, 11) and measures errcheck without the preset, `errorlint` on 8 exemplars plus caddy, the CLI overlay, unattended `--fix` and the `FailNow`-in-`wg.Go` probe. Why: the config is copied verbatim, and today it fails GO-ERR-09.
2. `cli/reference-skeleton` (GO-CLI, revision). It covers `markStarted` under `TraverseChildren`, aliases, `__complete` and a root `Args`; joined-error classification (M-C-04); and a per-writer colour library. Why: GO-CLI-06 is MUST and the skeleton ships as the example.
3. `io/process-group-sweep` (GO-IO, revision). It covers pgid-reuse safety of the post-`Wait` SIGKILL sweep and `Pdeathsig`. Why: an unguarded GO-IO-14 MUST can signal an unrelated process group.
4. `language/era-and-modernizers` (GO-LANG, revised). It covers what `go fix` owns and the go-upgrade procedure, now with the settled gate block, `stdversion` timing, AsType below the floor, `NotifyContext` semantics, Dependabot on `toolchain`, and `go.work` `godebug` precedence. Why: M-A-01 P0 and the go-upgrade skill.
5. `language/stdlib-semantics` (GO-LANG, lightly revised). It covers json/v2 default-on behaviour, golden and envelope bytes across 1.26 and 1.27 consumers, map order, time, runes and rand; the uuid surface is dropped because it is settled. Why: M-A-10 and M-A-14 are P0.
6. `api/package-and-api-shape` (GO-API, revised). It imports GO-ERR-16/17 and GO-IO-02, measures ST1000/ST1020-22 against revive `exported`, and decides the major-version strategy. Why: M-D-01 P0, and the doc-comment MUST check.
7. `api/sdk-surface` (GO-API, revised). It composes GO-IO, GO-ERR, GO-CLI, GO-TEST, GO-CONC and GO-MOD, and decides `*ExitError` fields, the timeout shape (contradiction 12), `exhaustive` (13), surface `(nil, nil)` and the 100% coverage scope. Why: M-D-02/17 P0, and the first named consumer.
8. `network/http-client-server` (GO-NET, revised). It takes the `bodyclose` classification on regclient, `noctx`/`usestdlibvars` scope and the `hostport` limit. Why: M-H-01/03 P0.
9. `network/registry-client` (GO-NET, revised). It covers staging per GO-IO-11/12, GO-IO-18's two-writer fixture, M-G-15 format versioning and the tmp sweep, and bounded layer fan-out. Why: M-H-07 P0.
10. `security/untrusted-input-and-crypto` (GO-SEC, revised). It takes the gosec verdict from GO-GATE-14, the G101 scope gap, the fact that G204 is not the secrets check, and govulncheck from GO-MOD-12/13. Why: M-I-04 P0.
11. `release/reproducible-builds-and-stamping` (GO-REL, revised). It adds the price of `-s -w` from GO-MOD-13 and CGO placement from GO-GATE-04. Why: M-N-01 P0.
12. `release/distribution-and-provenance` (GO-REL, revised). It applies Q4, runs `-mode=binary` on the four mirrored binaries, and proves nested-module tags through a local proxy. Why: M-N-04 P0, and the go-release skill.
13. `observability/logging-and-diagnosis` (GO-OBS, merged and revised). It covers slog and library logging, pprof exposure, GOMAXPROCS, the go-diagnose runbook with `goroutineleak`'s blind spot and `execwait=2`, and a stdlib leak detector against goleak. Why: M-J-02 MUST candidate, and the go-diagnose skill.
14. `bazel/rules-go-and-nogo` (BZL-GO, merged and revised). It covers Bzlmod sourcing, `go_sdk.from_file` against GO-MOD-02, and nogo parity with GO-GATE-02/11 plus SA9010/SA4023. Why: owner Q7 default yes.

## Wave 3 landed (2026-09-26)

Phase 6 harvest of wave 3: 14 dives, 10 consolidations (three revisions: gates,
cli, io; seven new: language, api, network, security, release, observability,
bazel), read in full together with the four unrevised wave-2 consolidations.
Source keys for this section: [gates](go-gates.md) · [errors](go-errors.md) ·
[conc](go-concurrency.md) · [testing](go-testing.md) · [modules](go-modules.md) ·
[cli](go-cli.md) · [io](go-io.md) · [lang](go-language.md) · [api](go-api.md) ·
[net](go-network.md) · [sec](go-security.md) · [rel](go-release.md) ·
[obs](go-observability.md) · [bazel](go-bazel.md). **[p6]** is a read-only
measurement taken while writing this section: `run.sh go tool vet help` lists
**35** registered analyzers on 1.27.1, and `go1.27.1:src/cmd/go/internal/test/test.go:654-693`
leaves **12** of them uncommented in `defaultVetFlags` (atomic, bools, buildtag,
directive, errorsas, ifaceassert, nilfunc, printf, slog, stdversion,
stringintconv, tests). Rule IDs are cited as the consolidations number them;
nothing below edits a consolidation.

### (a) Per group

| Group | Consolidation | IDs | MUST | Conflicts resolved | Follow-ups named |
|---|---|---|---|---|---|
| gates (revision) | [go-gates.md](go-gates.md) | 21 (GO-GATE-01..21; 20, 21 new) | 20 | 8 (map contradictions 1, 4, 11, 14; C-16 anchor; [GC] §3 superseded; overlay twin debt; M-M-15) | bodyclose precision; ST1000 vs revive `exported`; SDK `exhaustive` and `(nil, nil)`; `--fix` allowlist widening; read-only-close analyzer; GO-ERR-09 anchor |
| cli (revision) | [go-cli.md](go-cli.md) | 19 (GO-CLI-01..19; 17-19 new) | 14 | 7 | Windows legs of GO-CLI-07/08/13 |
| io (revision) | [go-io.md](go-io.md) | 21 (GO-IO-01..21; 21 new) | 14 | 7 (conflicts 13-18 plus the whole-tree narrowing) | io/windows-runtime; GO-IO-18 into registry-client |
| language | [go-language.md](go-language.md) | 17 (GO-LANG-01..17) | 9 | 11 | Swiss-table order bias; SDK `iter.Seq` vs `[]T`; `nojsonv2` and fixer-roster re-check |
| api | [go-api.md](go-api.md) | 18 (GO-API-01..18) | 9 | 10 | interface placement n=60 and `ireturn` FP; overlay noise; version handshake; signal exit path |
| network | [go-network.md](go-network.md) | 19 (GO-NET-01..19) | 15 | 12 | stream-stall; retry-replay; http-server-modern; dist-user-agent |
| security | [go-security.md](go-security.md) | 11 (GO-SEC-01..11) | 10 | 8 | G7xx taint under the amended config; G204 on multi-spawn CLIs; `Secret` under json/v2 |
| release | [go-release.md](go-release.md) | 13 (GO-REL-01..13) | 9 | 10 | multiple-VCS (golang/go#74763); cgo on darwin; keyless green path |
| observability | [go-observability.md](go-observability.md) | 14 (GO-OBS-01..14) | 6 | 6 | deferred-perf; pprof census; leak-detection-stdlib (closed) |
| bazel | [go-bazel.md](go-bazel.md) | 13 (BZL-GO-01..13) | 11 | 11 | nogo `stdversion`; stripped and stamped release artifacts; `workspace_status_command` path forms; `go_work`/#1797 and Windows |
| unrevised | errors, conc, testing, modules | 20 / 19 / 20 / 18 | 13 / 11 / 11 / 14 | — | — |
| **total on disk** | 14 files | **243** | **166** | 90 in wave 3 | 33 |

Wave 3 added 111 IDs and 73 MUST rules: 69 in the seven fresh families
(GO-LANG 9, GO-API 9, GO-NET 15, GO-SEC 10, GO-REL 9, GO-OBS 6, BZL-GO 11)
and 4 in revisions (GO-GATE-20/21, GO-CLI-17/18). Each MUST count reproduces
the file's own tally.

### (b) Surprises, each with a verdict

Verdict keys as in wave 2: **promote**, **fold**, **defer** (against an M-ID),
**reject** (already a rule, or wrong).

**gates / config-revision**
- errcheck `exclude-functions` matches the declared receiver type — reject (folded: GO-GATE-20); its remedy text is contradiction 9 below.
- golangci's errcheck does not skip `fmt.Fprint*` the way the standalone README suggests — reject (folded: GO-GATE-20; [GC] §3's "errcheck 0" superseded).
- errorlint `--fix` broke zap's build, then its tests — reject (folded: GO-GATE-21).
- every `exhaustive` FP on ko is one foreign-enum shape — reject (folded: GO-GATE-18).
- no analyzer sees `t.Fatal`/`require.*` inside `wg.Go`/`errgroup.Go` — reject (folded: GO-GATE verdict 11, GO-TEST-01); it closes [conc]'s and [testing]'s "FailNow analyzer" question as a proven negative.
- GO-MOD-08 has 11 entries, not 12 — reject (folded: GO-GATE-13); the list becomes 12 through contradiction 5.

**cli / reference-skeleton**
- `TraverseChildren` disables unknown-subcommand detection unconditionally — reject (folded: GO-CLI-17).
- `cobra.NoArgs` is safe only by wording coincidence; a custom `Args` swallows typos — reject (folded: GO-CLI-17).
- colorprofile parses `NO_COLOR` with `ParseBool`; bubbletea inherits it — reject (folded: GO-CLI-13's second grep, GO-CLI-19).
- lipgloss v2 regressed against v1 on `NO_COLOR` — reject (folded: GO-CLI-13 "re-check on each bump"; a go-upgrade dated re-check).
- a joined error's winner is not guaranteed by the memory model — reject (folded: GO-CLI-18).
- a non-runnable subcommand, invoked bare or with `--help`, printed nothing and exited 0, not root-caused — **promote** as `cli/group-help`: the skeleton ships as the copyable support-directory example ([cli] Applied), so an unexplained silent exit ships into every fleet CLI.

**io / process-group-sweep**
- the first `Pdeathsig` re-grep reported 0 hits; the true count is 10 — reject (corrected: [io] conflict 16).
- go-runc already pairs `Pdeathsig` with `LockOSThread` against golang/go#27505 — reject (folded: GO-IO-21).
- a pgid stays unallocatable while any member exists — reject (folded: GO-IO-14 reuse-safety paragraph).
- go-runc gates `Pdeathsig` to plain linux — reject (folded: GO-IO-06/21, [io] conflict 17).
- pidfd has no group-scoped analogue — reject (folded: GO-IO-14 rationale, Verdict 9 residue).
- the camelCase `Pdeathsig` grep false-positives on `usePdeathsig` — reject (folded: GO-IO-21 "never backs a MUST"); carried into the drafters' grep-shape rules at convergence.

**language / era-and-modernizers**
- `asynctimerchan` is removed in 1.27 and timer channels are unbuffered on the 1.27 toolchain regardless of the `go` line — reject (folded: GO-LANG silent-change table, GO-MOD-04); frame correction.
- in workspace mode a member's `godebug` is ignored — reject (folded: GO-LANG-17); answers [modules]'s `go.work` `godebug` question.
- `io/ioutil` wrappers carry `//go:fix inline`; the generic inliner is file-line gated — reject (folded: GO-LANG-02, GO-LANG-05).
- Dependabot never opens a toolchain-only PR (dependabot-core#13520) — reject (folded: GO-LANG-15 step 3); answers [modules]'s Dependabot question.
- `go fix`'s 1.27 roster differs from the x/tools modernize library (adds atomictypes, embedlit, slicesbackward, unsafefuncs; drops fmtappendf) — reject (folded: GO-GATE-03 names `go fix` as the gate); frame correction.
- `minmax`, `rangeint` and `stringsseq` decline their risky case by construction — reject (folded: GO-LANG-01).

**language / stdlib-semantics**
- SA6003 does not check byte-vs-rune slicing — reject (folded: GO-LANG-13); frame correction for M-A-09.
- gocritic `enable-all` misses `time.Time ==` — reject (superseded: revive `time-equal` catches it, GO-LANG-07 L2).
- go-github sits at `go 1.26.0` with custom marshalers, unaffected by the v2 backend — reject (evidence for GO-LANG-11).
- `GOEXPERIMENT` is build-wide and no library can shield consumers from a jsonv2 default — reject (folded: silent-change table, GO-LANG-16).
- `GOEXPERIMENT=nojsonv2` is slated for removal — **defer** against M-A-14 as a dated re-check (go-upgrade step, GO-LANG-15/16).
- stdlib `uuid` and google/uuid are wire-compatible both ways — reject (folded: GO-MOD-09; M-A-15 needs no rule).

**api / package-and-api-shape**
- `apidiff` always exits 0; only `gorelease`'s exit is major-conditional — reject (folded: GO-API-10); it also decides contradiction 12.
- `gochecknoglobals` exempts `Err*` sentinels — reject (folded: GO-API-06).
- go.dev's layout doc never mentions `pkg/` — reject (folded: GO-API-17).
- `exhaustive` does not count a `default:` as coverage — reject (folded: GO-API-08).
- `gorelease` against a fixture needs a hand-built `file://` GOPROXY — **fold** into the go-release skill's dry-run step; no research.
- the `//go:fix inline` three-state demonstration — reject (folded: GO-API-11).

**api / sdk-surface**
- default coverage 25.7% vs 65.7% with `-coverpkg=./...` — reject (folded: GO-API-12); answers [testing]'s coverage-scope question.
- the `TestMain` helper branch needs an exclusion — reject (overturned: `_test.go` never enters a profile, [api] C4).
- `exhaustive` fires on the SDK's `ExitCode` switch — reject (folded: GO-API-08; closes wave-2 contradiction 13).
- the `go doc` `any` grep false-positives on prose — reject (folded: GO-API-02's tab-aware grep).
- oras-go shows both option flavours in one module — reject (evidence for GO-API-13).
- the eager `Envelope` field is a deliberate divergence with unmeasured cost — **defer** against M-D-17: the owner default (eager, GO-API-18 SHOULD) applies; the cost matters only under a high non-zero-exit load no consumer has.

**network / http-client-server**
- `Close` auto-drains up to 256 KiB — reject (folded: GO-NET-10, citation corrected by [net] conflict 5).
- two `127.0.0.1` httptest servers are not a cross-host redirect — reject (fixture technique, recorded in GO-NET-05's run).
- the redirect stripping rule is asymmetric (origin→subdomain keeps credentials) — **fold** into GO-NET-05's rationale at authoring: origin-bound credentials already cover it; no research.
- go-retryablehttp retries a POST on 500 — reject (folded: GO-NET-11).
- bodyclose is ~92% FP on regclient yet hides 2 real leaks — reject (folded: GO-NET-09, GO-GATE-19 stays SHOULD); closes the gates bodyclose question.
- gosec G107's own doc example is its FP shape — reject (G107 triage dropped by [net]).

**network / registry-client**
- go-digest implements no blake3 — reject (folded: GO-NET-13).
- a content-addressed store needs no cross-process lock — reject (folded: GO-NET-14).
- containerd treats a rename collision as `ErrAlreadyExists` success — reject (folded: GO-NET-14).
- oras-go's credential API is mid-migration to `/v3` — reject (folded: GO-NET-17 does not adopt oras-go).
- errcheck/gosec flag the adjacent `json.Unmarshal`, never the swallowed exec error — reject (folded: GO-NET-16's reading heuristic).
- the deterministic two-writer splice — reject (folded: GO-NET-14; GO-IO-18 superseded).

**security / untrusted-input-and-crypto**
- G101 fires at any scope, gated by entropy or vendor shape — reject (folded: GO-SEC-08); frame correction and contradiction 10.
- G120 fires whatever `maxMemory` is — reject (folded: GO-SEC-05).
- G103 stayed silent under the bundled gosec — reject as stated (root-caused by [sec] to the `common-false-positives` preset, GO-SEC-01); its config consequence is **promoted** into `gates/config-assembly` (contradiction 1).
- caddy's `text/template` response bodies document an SSTI boundary — reject (folded: GO-SEC-10).
- 20 sampled `math/rand` v1 sites hold no real security use — reject (evidence for GO-SEC-02).
- G101 carries ~25 vendor regexes that need no name match — reject (folded: GO-SEC-08).

**release / reproducible-builds-and-stamping**
- `mod_timestamp` is goreleaser's post-build `os.Chtimes` — reject (folded: [rel] conflict 5); frame correction for M-N-01.
- `-s -w` keeps `BuildInfo` and over-reports binary-mode findings — reject (folded: GO-REL-05, GO-MOD-13).
- `CGO_ENABLED` is scoped per build id — reject (folded: GO-REL-02).
- Go 1.25+ fails with "multiple VCS detected" or degrades to `(devel)` on some repository shapes (golang/go#74763) — **promote** as `release/buildvcs-topologies`: GO-REL-03 (MUST) forbids `-buildvcs=false`, so a fleet shape that trips it has no compliant release path, and the fleet itself builds in git worktrees.
- `os/user` and `net` degrade to pure Go under `CGO_ENABLED=0` — reject (folded: GO-REL-02 rationale).
- goreleaser's default matrix is narrower than corpus practice — reject (folded: GO-REL-08).

**release / distribution-and-provenance**
- `goreleaser check` exits 0 without `version: 2` — reject (folded: GO-REL-07).
- all 4 mirrored bazelbuild binaries fail govulncheck — reject (folded: [rel] conflict 7, owner default report-without-block).
- keyless `cosign sign-blob` blocks silently outside CI — reject (folded: GO-REL-11, failure mode 9).
- cosign 3.x rejects `--tlog-upload=false` once a signing config is used — reject (folded: GO-REL-11, failure mode 9).
- SHA pinning is not bimodal by release status — reject (folded: GO-REL-12); frame correction for M-N-11.
- the snapshot binary lives at the build path; only `checksums.txt` carries the asset name — reject (folded: GO-REL-08's verification).

**observability / logging-and-diagnosis**
- the kernel 6.12/6.13 core-dump break is elfutils (sourceware 32713) — reject (folded: [obs] C6); frame correction for M-P-03.
- the `goroutineleak` profile is toolchain-gated — reject (folded: GO-OBS-12 floor).
- bare sloglint catches nothing — reject (folded: GO-OBS-03/04); its config consequence is **promoted** into `gates/config-assembly` (contradiction 4).
- the stdlib leak detector cancels its own frame — reject (the detector is rejected, [obs] C3).
- the runtime's deadlock report pre-empts a SIGQUIT fixture — reject (folded: GO-OBS-10).
- `goroutineleak` was experimental in 1.26, GA only in 1.27 — reject (folded: GO-OBS-12); frame correction.

**bazel / rules-go-and-nogo**
- `vet = True` beside `TOOLS_NOGO` is a duplicate-label error — reject (folded: BZL-GO-06).
- the only golangci-to-nogo bridge is POC-only — reject (folded: BZL-GO-07).
- rules_go's `bzlmod.md` lags the BCR by 6 and 9 minors — reject (folded: failure mode 1, BZL-FLAG-28); frame correction for M-O-01.
- gazelle resolves from `go.work`, rules_go from `go.mod` — reject (folded: BZL-GO-01 names both).
- zero `# gazelle:resolve` overrides in either dogfood repo — reject (M-O-04's stale-override worry dropped).
- the `tool` directive surfaces as a generated `GO_TOOLS` dict — reject (folded: BZL-GO-04).

### (c) Map rows affected

| Rows | Effect |
|---|---|
| M-A-01, 02, 04, 06-08, 10-14, 18 | Settled (GO-LANG-01..17). M-A-10 carries the ≥8-entry fixture clause (GO-LANG-09); M-A-14 is GO-LANG-04/11 (v1 bytes unchanged) |
| M-A-03, 16, 17 | Wholly `go fix` (GO-GATE-03) plus GO-MOD-08; no GO-LANG row |
| M-A-05 | Correctness settled (GO-LANG-08); the "when" half takes the owner default (`[]T` on the SDK surface) |
| M-A-09 | Check corrected: SA6003 does not fire; GO-LANG-13 is a reading heuristic plus fuzzing |
| M-A-15 | GO-MOD-09; wire-compatible both ways, no rule |
| M-A-19, M-A-20 | Dropped ([lang] "Rows dropped") |
| M-D-01..05, 07-11, 13-17, 20 | Settled (GO-API-01..18) |
| M-D-06, M-D-12, M-D-19 | Folded into GO-API-13 / dropped (vet `composites`, GO-GATE-02) / dropped |
| M-D-18 | Settled wrap-only (GO-API verdict 1, GO-NET-17, GO-MOD-10) |
| M-E-10 | Coverage scope settled (GO-API-12 feeds GO-TEST-16) |
| M-C-04 | Watched by [cli] reference-skeleton §7 (errgroup 1/3, join 3/3); GO-CONC-14 stays SHOULD |
| M-F-03, 06, 10, 12 | Extended by GO-CLI-17, 18, 19 |
| M-G-03 | GO-IO-18 superseded by GO-NET-14 (MUST, watched) |
| M-G-09 | Narrowed to the child's process group (GO-IO-14 MUST) plus Linux `Pdeathsig` (GO-IO-21 SHOULD) |
| M-G-15 | Answered: GO-NET-15 |
| M-H-01..11 | Settled (GO-NET-01..19); M-H-06 answered (Hostname-only stripping); M-H-11's check is a grep, not vet |
| M-H-12, M-H-13 | Still ready-to-author from wave-1 evidence, but GO-NET minted no row: residue under Q8 |
| M-H-14 | Stays deferred |
| M-I-03 | GO-GATE-14 plus GO-SEC-01 (preset dropped, G304 excluded) |
| M-I-04..09 | Settled (GO-SEC-02..11) |
| M-I-10..12 | Stay deferred |
| M-J-01..06, 08; M-P-03 | Settled (GO-OBS-01..14) |
| M-J-07, 09-12 | Stay deferred ([obs] deferred-perf) |
| M-K-04 | Extended per file by GO-LANG-02 |
| M-M-09 | Settled by GO-API-04/05 (ST family in the library/SDK overlay; revive naming duplicates dropped) |
| M-M-15 | Settled (GO-GATE-21) |
| M-N-01..11 | Settled (GO-REL-01..13); M-N-01's `mod_timestamp` and M-N-11's bimodal premise are false |
| M-N-12 | Routed (`docs-quality`) |
| M-O-01..10 | Settled (BZL-GO-01..13); M-O-01 is BZL-FLAG-28's, M-O-04's drift gate is BZL-ARCH-12's |
| M-P-01 | go-release skill: GO-REL, GO-API-10, GO-MOD-13..15 |
| M-P-02, M-P-04 | go-upgrade skill: GO-LANG-15..17, GO-GATE-08/20/21 re-probes, GO-MOD-12 |
| M-P-05 | Stays deferred |

### (d) Frame corrections

- **`go vet` runs 35 analyzers on 1.27.1, and `go test` runs 12 of them** (11 through 1.26; `stdversion` joined in 1.27) [p6]. H4's correction, map row M-M-07 and GO-GATE-02 all say "11 of 36". BZL-GO-06's "35" is right.
- **gosec G101 is not package-scope-limited.** It is gated by entropy or vendor shape at every scope ([sec] C-4). This overturns the wave-2 surprise "G101 fires only on package-scope" and [gates] failure mode 12.
- **G103's silence was golangci's `common-false-positives` preset**, which filters G103, G204 and G304 by message text (`golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:64-89`), not vendored-gosec drift ([sec] verdict 1).
- **The `comments` preset silences ST1000/ST1020-22 and revive `exported`** even when they are enabled ([api] C1; `exclusion_presets.go:6-50`).
- **json/v2 backs the v1 API with byte-identical output;** only error text may differ ([lang] conflict 11). Map conflict 14's "stricter defaults" claim is falsified.
- **`rand.Seed` became a no-op in 1.24, keyed on the main module's `go` line;** at `go 1.23` it still seeds ([lang] L3).
- **Timer channels are unbuffered on a 1.27 toolchain whatever the `go` line;** `asynctimerchan` is removed ([lang] conflict 7). Map row M-A-13 is corrected.
- **Workspace mode ignores a member module's `godebug` lines** ([lang] GO-LANG-17, L9).
- **Dependabot never opens a PR that only moves the `go`/`toolchain` line** (dependabot-core#13520, [lang] GO-LANG-15).
- **`apidiff` exits 0 on an incompatible change; `gorelease` exits non-zero only at v1+** ([api] C3, [shape] run 9).
- **`go fix`'s 1.27 fixer roster is not the x/tools modernize library's** ([lang] era surprise); wave 1's modernize census is not rule text.
- **SA6003 is not a byte-vs-rune slicing check** ([lang] conflict 9, map M-A-09).
- **The `goroutineleak` profile is toolchain-gated** (experimental 1.26, GA 1.27), not `go`-line-gated ([obs]).
- **The kernel 6.12/6.13 core-dump break is elfutils sourceware 32713**, not a Go bug ([obs] C6, map M-P-03).
- **The automaxprocs importers are caddy, restic and prometheus, all above the 1.25 gate;** container-aware `GOMAXPROCS` is `go`-line-gated ([obs] C2, C-8).
- **`SysProcAttr.Pdeathsig` exists only on `linux || freebsd`** ([io] conflict 13).
- **Stdlib's redirect credential stripping compares `Hostname()` only**, so it forwards credentials across ports and an https→http downgrade ([net] conflict 3; map M-H-06).
- **`Client.Timeout` kills a live, progressing stream** ([net] conflict 2).
- **vet `hostport` inspects only `net.Dial`, `DialTimeout` and `Dialer.Dial`**, never `DialContext` ([net] conflict 4). The wave-2 "same function" note undersold the gap.
- **go-containerregistry retries by default** (`defaultRetryStatusCodes`, [net] conflict 6).
- **`mod_timestamp` is goreleaser's post-build `os.Chtimes`** and irrelevant to raw binaries (map M-N-01).
- **SHA pinning is not bimodal by release status** (map M-N-11); **`goreleaser check` exits 0 without `version: 2`** (map M-N-07).
- **cobra's `TraverseChildren` disables unknown-subcommand detection, and a non-runnable root returns `flag.ErrHelp` before `ValidateArgs`** ([cli] GO-CLI-17).
- **rules_go 0.63.0's `TOOLS_NOGO` includes `nilness`;** the gap to vet is `cgocall`, `hostport`, `stdversion`, `waitgroup` ([bazel] conflict 1). **`bzlmod.md` lags the BCR by 6 and 9 minors,** and gazelle's README is ahead of its `MODULE.bazel` (map M-O-01). **Neither dogfood repo registers nogo under Bzlmod** ([bazel] conflict 10).

### (e) Cross-consolidation contradictions

All fourteen rulesets were read against each other. Wave-2 contradictions 1-17
stand where not revisited here. Each pair below conflicts or overlaps; the
resolution names which ID's text the drafters keep. Items 1-5 are the fleet
config, which `gates/config-assembly` assembles and watches before drafting.

1. **Exclusion presets, across four files.** GO-GATE-09's config lists `presets: [comments, common-false-positives]`; GO-SEC-01 forbids `common-false-positives` and writes `presets: [comments]`; GO-API-04's overlay YAML lists `[std-error-handling, common-false-positives]` with `comments` removed (a copy of the pre-revision baseline); GO-ERR-09 forbids `std-error-handling`. **Resolution:** the baseline carries `presets: [comments]` (GO-SEC-01's text wins over GO-GATE-09's presets clause); the library/SDK overlay carries no preset (GO-API-04's "remove `comments`" wins; its two stale entries are dropped); GO-ERR-09 keeps its text. GO-GATE-09 keeps ownership of the config text and absorbs the amendment.
2. **GO-GATE-14 "excludes exactly G104 and G115" vs GO-SEC-01's G304 exclude.** **Resolution:** GO-GATE-14's list becomes G104, G115, G304; GO-SEC-01 keeps the G304 rationale (3.3/10k LOC, owned by GO-IO-02). This also settles GO-IO-13: its single reasoned G204 `//nolint` is valid only once the preset is gone ([sec] C-2). GO-OBS-05's "GO-GATE-14 excludes only G104 and G115" is re-worded to the three.
3. **The revive rules list.** GO-GATE-15 fixes `context-as-argument` + `deep-exit`; GO-LANG-07 adds `time-equal` to the baseline (L2, 0 FP on 435k LOC); GO-API-04 adds `exported` in the library/SDK overlay. **Resolution:** GO-GATE-15 keeps the "explicit list" text; the baseline list is `context-as-argument`, `deep-exit`, `time-equal`; the overlay repeats all three and adds `exported`, because a `rules:` list replaces the defaults.
4. **sloglint.** GO-GATE-09 enables it bare as "self-gating"; GO-OBS-03/04 measured bare sloglint catching nothing and put `no-global: "all"` into "the library and SDK baseline", with "the CLI overlay omits it". An overlay cannot subtract from a shared baseline. **Resolution:** `no-global: "all"` goes into the library/SDK overlay; the baseline keeps sloglint enabled without it (CLIs may `SetDefault` in `main`). GO-OBS-03 keeps its rule text; its placement sentence is corrected. The "self-gating" comment is dropped (GO-OBS-04).
5. **The depguard lists.** GO-MOD-08 owns an 11-entry `superseded` list; GO-OBS-06 adds `go.uber.org/automaxprocs`; GO-OBS-01 adds a `logging` rule (zap, zerolog, logrus). **Resolution:** GO-MOD-08 keeps list ownership and gains a 12th entry, `go.uber.org/automaxprocs` with a `desc` naming the 1.25 floor (every fleet line is ≥1.26, Q1; GO-MOD-09's go-line reading stays for non-fleet adopters). GO-OBS-01 owns the `logging` rule text, quoted into the baseline beside `no-testify` with the same "delete only in an incumbent repo" clause. GO-GATE-13's citation row adds GO-OBS-01.
6. **Where config text lives (wave-2 contradiction 7 again).** GO-API (overlay YAML), GO-SEC (gosec block), GO-IO-04 (gosec thresholds), GO-CLI (a fragment with `uniq-by-line` and gocritic without `disable-all`) and GO-CONC (a one-rule revive list) all paste YAML. **Resolution:** GO-GATE owns exactly three complete files — baseline (GO-GATE-09), CLI overlay (GO-GATE-18) and the library/SDK overlay, which moves from GO-API into GO-GATE text. Depth files cite linter names only.
7. **`exhaustive` placement.** GO-GATE-18 put it in the CLI overlay only; GO-API-08 measured it on the SDK. **Resolution:** GO-API-08's text wins (closes wave-2 contradiction 13); `exhaustive` sits in both overlays and GO-CLI-01's clause binds the SDK too.
8. **GO-ERR-09's verification grep is unanchored** and went red on a compliant config's comment ([gates] C-16). **Resolution:** GO-ERR-09 keeps its rule text; its verification cell takes GO-GATE-09's anchored `-E '^[^#]*std-error-handling'`.
9. **Read-only `*os.File` closes.** GO-GATE-20 prescribes `//nolint:errcheck // read-only close` per site; the wave-2 owner default (GO-ERR open question, applied in wave 2 (f)) is GO-ERR-08's `errors.Join` shape for every `*os.File`, with no per-site nolint. **Resolution:** GO-ERR-08 keeps the remedy text (one shape to teach); GO-GATE-20 keeps the `exclude-functions` text, and its nolint becomes the fallback only where the function has no error result to join into. The gates "custom read-only-close analyzer" question is rejected on the wave-2 precedent: a shipped analyzer is outside the artifact set.
10. **G101's scope.** [gates] failure mode 12 says G101 inspects only package-scope `const`/`var`; GO-SEC-08 measured it firing on a high-entropy local and missing a low-entropy package const ([sec] C-4). **Resolution:** GO-SEC-08 keeps its text; the drafters drop the scope claim from [gates] failure mode 12 and point it at GO-SEC-08.
11. **`(nil, nil)`.** GO-API-09 is MUST on the SDK surface; GO-ERR-12 is SHOULD. **Resolution:** consistent by scope, as [api] conflict 7 decided; GO-API-09 keeps the SDK clause, GO-ERR-12 the general one. It answers [gates]' open "SDK `(nil, nil)`" question.
12. **`gorelease` twice.** GO-REL-13 says any non-zero exit blocks and the fix is never a minor bump; GO-API-10 says `gorelease` exits 0 on an incompatible change at v0, where the report forces a minor bump plus a changelog line. **Resolution:** GO-API-10 keeps the text (measured v0/v1 split); GO-REL-13 is dropped at authoring and `release.md` carries a one-line pointer to GO-API-10. The ID is not reused.
13. **Body bounds.** GO-NET-07 (HTTP bodies via `LimitReader`/`MaxBytesReader`, an `io.ReadAll` grep) overlaps GO-SEC-05 (decoders, multipart G120, files); GO-IO-03 owns decompression. **Resolution:** GO-NET-07 keeps the HTTP-body text; GO-SEC-05 keeps the decoder and multipart text and its `json.NewDecoder` grep, which GO-NET-07's grep cannot see; archives stay GO-IO-03. Each cites the others.
14. **Citation drift from dive draft numbers.** [sec] cites GO-NET-09 for server timeouts (read GO-NET-01), GO-NET-03 for `io.ReadAll` bounds (read GO-NET-07) and a "GO-NET-11 candidate" (read GO-NET-07's handler clause). [bazel] cites "draft GO-REL-05" and GO-REL-14 for stamping (read GO-REL-06). Wave-2 contradiction 6's GO-GATE-COMMANDS mapping still applies to [conc] and [testing].
15. **The vet analyzer counts.** GO-GATE-02 says `go test` runs 11 of 36; BZL-GO-06 says vet has 35. **Resolution:** 35 registered and 12 under `go test` on 1.27.1 [p6]. GO-GATE-02 keeps its rule text; its rationale carries the corrected, dated count.
16. **json/v2 and golden files.** GO-TEST-13 cautions that goldens holding `encoding/json` output must be regenerated on a toolchain bump; GO-LANG-11 measured v1 bytes identical and says one golden per test. **Resolution:** GO-LANG-11 keeps its text; the drafters drop GO-TEST-13's caution sentence. This answers [testing]'s json/v2 golden question.
17. **The SDK's test dependencies.** [testing]'s SDK commitment row says go-cmp is the only test dependency; GO-CONC-11 keeps goleak, and [obs] C3 rejected the stdlib `runtime.Stack` detector ([obs] C-1: it fails on compliant `signal.NotifyContext` code). **Resolution:** GO-CONC-11 keeps its text; wave-2 contradiction 5 closes in goleak's favour; the drafters write "go-cmp and goleak, test-only" in the GO-TEST SDK row. GO-MOD-10 is unaffected.
18. **GO-CONC-14 is marked "not watched"** while [cli] reference-skeleton §7 watched it (errgroup delivered 1 of 3 errors, the join 3 of 3). **Resolution:** GO-CONC-14 keeps its text and SHOULD; its watched cell cites [cli] §7, as [cli]'s cross-family note asks. GO-CLI-18 owns only code selection.
19. **The SDK timeout (wave-2 contradiction 12, still provisional).** GO-CONC-17 has `WithTimeoutCause(ctx, d, ErrOcxTimeout)`; GO-ERR-20 has a separate `*TimeoutError`; [api] composed them without planting a contract test. **Resolution (provisional, planted by `api/sdk-contract`):** GO-ERR-20 keeps the type; the cause passed to `WithTimeoutCause` is the `*TimeoutError` value, and `ErrOcxTimeout` is its `Is` target.
20. **GO-IO-18 vs GO-NET-14.** **Resolution:** GO-NET-14 (MUST, watched) supersedes; `io.md` keeps GO-IO-18's ID as a one-line pointer, as [net] conflict 8 decided. GO-NET-15 keeps format versioning with a pointer in `io.md`.
21. **G404 on jitter, twice.** GO-LANG-06 and GO-SEC-02 both prescribe `//nolint:gosec // G404: …` for `math/rand/v2` jitter. **Resolution:** consistent; GO-SEC-02 owns the G404 clause and GO-LANG-06 cites it.
22. **The library/SDK overlay's MUSTs vs the admission bar (map conflict 2).** GO-API-06 (MUST, SDK) rests on `gochecknoglobals`/`gochecknoinits`, and GO-API-04 on the ST family measured on 3 repos; neither met "≤1 FP/10k LOC on ≥5 exemplars". Because the overlay file blocks on any linter in it, a SHOULD row (GO-API-07's `ireturn`) blocks too. **Resolution (provisional):** the SDK clauses stand (new code, no legacy FPs); library membership of each overlay linter is decided by `gates/config-assembly`'s measurement.
23. **Placeholder shapes.** GO-OBS-02/07/08/09 greps take `<dir>`; GO-IO and GO-TEST take `DIR`; GO-API-10 and GO-NET-18 carry angle-bracket values inside commands. Not a rule conflict: the drafters write an explicit `.` operand and no angle brackets inside patterns (the checker's shell lint, memory `checker-shell-lints`).

### (f) Convergence

**Verdict: not converged. One more, narrower round.** The stop condition in
[wave-plan](../../.claude/skills/research-lang/references/wave-plan.md#convergence)
fails on all three clauses:
- Wave 3 added 73 MUST rules, 69 of them in seven freshly opened families.
- It added 136 ranked agent failure modes (gates 18, cli 14, io 20, lang 12, api 11, net 12, sec 11, rel 13, obs 11, bazel 14). New ones include "gates `Pdeathsig` with `//go:build unix`", "copies `common-false-positives` from an exemplar", and "reads `apidiff`'s exit 0 as compatible".
- The config the drafters copy verbatim is inconsistent across four consolidations (contradictions 1-5) and has never been watched as one file. That is load-bearing and answerable by a fixture run.

The tail clause decides the next wave: six open questions are load-bearing
**and** answerable by a source read or a fixture run. Wave 4 opens no new
family, so the next harvest should converge on the tail clause alone.

Every open question from the fourteen consolidations, classified:

| Class | Questions | Disposition |
|---|---|---|
| **Owner decision, default applied** | golangci pin v2.14.0 bumped only via go-upgrade; `-race` on the Linux leg only; `no-testify` on; read-only closes use GO-ERR-08's shape (contradiction 9); `nilnil` `detect-opposite` off; goleak as an SDK test dependency; CI fuzz budget; `usetesting` context settings on; CLI toolchain patch cadence; no private modules; no vendoring; Windows Ctrl-C exits 130; GO-CLI-08 stays SHOULD; no Windows job object in SDK v0.1; the process-group helper stays internal; `time-equal` on; no depguard deny of v1 `math/rand`; per-site G404 on jitter; SDK path `github.com/ocx-sh/ocx-sdk-go`, package `ocxsdk`; eager `Envelope`; CLIs do not take the library/SDK overlay; SDK exports `[]T`, not `iter.Seq`; GO-NET-15 stays in GO-NET; SDK redirect cap 5; no new linter for GO-NET-06; gosec amendment taken verbatim; no global `--insecure`; `ocx.Secret` is public; mirrored binaries report without blocking; double signing kept; `-s -w` off; depguard `logging` for CLIs too; no sloglint style options; automaxprocs entry in GO-MOD-08; nogo optional; Q7 yes; per-call reasoned G204 suppressions allowed in CLIs (GO-IO-13 stays CONSIDER there, pending the config-assembly count) | Applied; drafters state each as a default the adopter may override |
| **Measurement the corpus cannot supply** | Windows runtime: GO-IO-16/17, directory `Sync`, job objects, GO-CLI-07/08/13 Windows legs, Windows test behaviour, the Bazel `windows_amd64` artifact; cgo-on-darwin DNS (macOS runner); the GO-REL-11 keyless green path (GitHub Actions OIDC; a throwaway public repo is outside the sandbox) | Residue. GO-IO-17 stays SHOULD; GO-CLI-07's Windows branch and GO-REL-11 stay compile- or grep-verified, with the reason in the row |
| **Dated re-check (go-upgrade steps)** | SA4023's `_test.go` blind spot; the G115/G304 exclusions and the gosec empty-excludes pass on each golangci bump; the `--fix` allowlist zap probe and the errcheck roclose probe (CR-4/5, CR-12); `nojsonv2` removal and the `go fix` roster per Go minor; colorprofile's `NO_COLOR` parsing per bump; rules_go `TOOLS_NOGO` gap per bump | go-upgrade skill steps |
| **Answerable now, load-bearing** | the assembled fleet config, gosec G103/G204/G7xx and overlay-linter noise (contradictions 1-5, 22); SDK version handshake, signal exit path and timeout cause (contradiction 19); GO-NET-06's streaming watchdog, go-containerregistry retry replay, the dist CDN user agent; golang/go#74763 on fleet repository shapes; Bazel `workspace_status_command` forms, stamped reproducibility, stripped-binary govulncheck and nogo `stdversion`; the skeleton's silent non-runnable group | Commissioned below |
| **Answerable now, not load-bearing** | widening the `--fix` allowlist (the current list is safe by construction); a read-only-close analyzer (outside the artifact set); Swiss-table order bias by key type (GO-LANG-09's control is the sort; the ≥8-entry clause is a tripwire); interface placement at n=60 (GO-API-07 stays SHOULD; `ireturn`'s file membership is measured by config-assembly); nested-module tags through a proxy (GO-MOD-14 rests on go.dev/ref/mod); the 1.25 `ignore` directive (1/35); `Secret` under json/v2 (GO-SEC-07's own redaction test runs on both GO-MOD-16 legs, and [sec] C-7 already ran on the default-on 1.27.1); M-H-12/13/14 services rows (Q8); pprof census; deferred-perf (no fleet service); `go_work` and bazel-gazelle#1797 (GO-MOD-05 keeps `go.work` out of the SDK and CLIs) | Residue, recorded here for whoever picks it up |

### (g) Next wave

Six dives, all revisions of existing groups, holding every ID stable. The
cross-cutting config assembly comes first, because every family's
verification cell cites the file it produces.

1. `gates/config-assembly` (GO-GATE, revision). Assemble and watch the three config files from GO-SEC-01, GO-API-04..08, GO-LANG-07 and GO-OBS-01/03/06; measure the full gosec roster (G103, G204, G7xx) and the overlay linters' FP rate on the named exemplars. Why: the drafters copy this config verbatim, and today four consolidations disagree on it (contradictions 1-5, 22).
2. `api/sdk-contract` (GO-API, revision). Plant the version handshake, the signal exit path and the timeout-cause contract. Why: GO-API-18 and wave-2 contradiction 12 are the SDK's first-release contract and are unwatched.
3. `network/stream-stall-and-retry` (GO-NET, revision). Fixture the idle-read watchdog, go-containerregistry's retried-write behaviour and the dist CDN user agent. Why: GO-NET-06's streaming branch is a MUST with no fixture, and GO-NET-17 tells CLIs to wrap a retry path nobody watched.
4. `release/buildvcs-topologies` (GO-REL, revision). Run golang/go#74763 on submodule, nested-repo, nested-module and worktree shapes. Why: GO-REL-03 forbids the only escape hatch, and the fleet builds in worktrees.
5. `bazel/stamping-and-release` (BZL-GO, revision). Settle the `workspace_status_command` recipe, stamped reproducibility, stripped-binary govulncheck and nogo `stdversion`. Why: the depth file prints a recipe that failed in three of four forms.
6. `cli/group-help` (GO-CLI, revision). Root-cause the silent non-runnable group and fix the skeleton. Why: the skeleton ships as the copyable example.

## Orchestrator additions to wave 4 (2026-09-26)

The harvest commissioned six revision dives. The orchestrator's self-direction
sweep over the fourteen consolidations added two more, both revisions of an
existing family so the family count stays at fourteen:

- `language/generics-and-iterators` (GO-LANG) — generics and iterator *design*
  had no rows: `go-api.md` has zero lines on type parameters or `iter.Seq`, and
  `go-language.md` covers era idioms only. Ignoring `yield`'s result is a
  runtime panic an agent writes by default.
- `observability/performance-hygiene` (GO-OBS) — promotes deferred M-J-07 (PGO)
  and M-J-09 (allocation hygiene). Performance advice is where generated Go is
  most confidently wrong, and GO-TEST-19 covers only the benchmark loop shape.

## Wave 4 landed (2026-09-26)

Eight revision dives landed: the six commissioned in wave-3 (g) and the two
orchestrator additions. None opened a family. Each consolidation was read in
full. Two residue questions were closed during harvest by read-only source
reads, recorded in (b) and (f). No consolidation file was edited; every
cross-file disagreement is resolved in (e) by naming the ID whose text the
drafters keep.

### (a) Per group

Counts are the consolidation files on disk after wave 4. "Conflicts" names the
ones the wave added.

| Group | Consolidation | IDs | MUST | Wave-4 delta | Conflicts resolved in wave 4 | Follow-ups named |
|---|---|---|---|---|---|---|
| gates | [go-gates.md](go-gates.md) | 23 | 22 | +GO-GATE-22, 23 (MUST). GO-GATE-09, 13, 14, 15, 18 and 20 changed in place. 19 stays SHOULD. | Wave-3 map contradictions 1, 2, 3, 5, 6, 7, 9, 10, 15 and 22, closed with watched cells C-18..C-26 | bodyclose precision, already answered by GO-NET (see (e) 6). The `--fix` widening, `ireturn` allowlist and `internal/` exclusion are residue. |
| api | [go-api.md](go-api.md) | 20 | 12 | GO-API-18's gate clause raised to MUST. +GO-API-19, 20 (MUST). GO-API-04..07 re-cited. | Conflicts 11-20 (table), plus 2 and 9 revised | None. `api/interface-placement` is now Verdict 15 (a documented gap). |
| network | [go-network.md](go-network.md) | 19 | 15 | No ID added. GO-NET-06 streaming branch, GO-NET-17 gap (4) and GO-NET-18 changed in place. | Conflicts 13-18 | `network/http-server-modern` (M-H-12/13/14): Q8 default applies. The pull-path watchdog was answered at harvest (see (b)). |
| release | [go-release.md](go-release.md) | 14 | 9 | +GO-REL-14 (SHOULD). GO-REL-03 changed in place, GO-REL-06 gained a caveat. | Conflicts 11-15 | `release/cgo-on-darwin` and `release/keyless-green-path`: measurements the corpus cannot supply |
| bazel | [go-bazel.md](go-bazel.md) | 15 | 12 | +BZL-GO-14 (MUST), +BZL-GO-15 (SHOULD). BZL-GO-06, 07, 09 and 11 amended. | Conflicts 12-15, plus 9 amended | `go_work` and bazel-gazelle#1797; cross-`--platforms` double build |
| cli | [go-cli.md](go-cli.md) | 21 | 16 | +GO-CLI-20, 21 (MUST). GO-CLI-06 and 17 scoped in place. | Revision-2 runs [W]/[G] | `cli/windows`: a measurement the corpus cannot supply |
| language | [go-language.md](go-language.md) | 26 | 14 | +GO-LANG-18, 20, 22, 23, 26 (MUST) and 19, 21, 24, 25 (SHOULD). GO-LANG-03, 08 and 14 changed in place. | Conflicts 12-17 | `language/stdlib-semantics` (Swiss-table bias): residue. `era-and-modernizers`: a dated re-check. |
| observability | [go-observability.md](go-observability.md) | 22 | 6 | +GO-OBS-15..22, all SHOULD or CONSIDER | C5-C12 | `deferred-telemetry` (Q8), `pprof-census`: residue. Handoffs to GO-LANG-16 and gates membership are resolved in (e) 7 and 8. |
| errors, concurrency, testing, modules, io, security | unchanged since wave 3 | 20 / 19 / 20 / 18 / 21 / 11 | 13 / 11 / 11 / 14 / 14 / 10 | None. Stale citations are fixed at authoring (see (e)). | — | GO-SEC's G7xx and G204 questions are answered by [CA] (see (e) 18) |

**Totals on disk:** 269 IDs and 179 MUST across 14 consolidated families. The
fifteenth family, GO-CORE, is index-owned and has no consolidation.

Wave 4 added 13 MUST: GO-GATE-22 and 23; GO-API-18 (raised), 19 and 20;
GO-LANG-18, 20, 22, 23 and 26; GO-CLI-20 and 21; BZL-GO-14. Every one of them
is in a family that already existed.

### (b) Surprises, each with a verdict

**gates**
- revive `exported` has no `internal/` exclusion, which inflates counts in a legacy library. **Fold.** GO-GATE-23 scopes it to the library/SDK file, and failure mode 23 records it. The exclusion itself is residue.
- The oras e2e module is invisible to a root `golangci-lint run`. **Fold** into GO-GATE-01, which now requires test-helper and tools modules, and GO-MOD-06.
- Overlay linters found real debt in the exemplars. **Fold.** The GO-API-05/06/07 noise figures are closed by the census.
- QF1009 blocks (it is not a hint), which corrects [CA]. **Fold** into Verdict 12 and add a go-upgrade probe.
- ko's G703 and fzf's G702 findings were real. **Fold** into GO-GATE-14. This closes GO-SEC's G7xx open question.
- The CLI G204 count was confirmed. **Fold.** Per-call reasoned `//nolint:gosec` stays the CLI default.

**api**
- `select{}` in a helper child trips the runtime deadlock detector. **Fold** into GO-TEST-12's example: the hang helper uses `time.Sleep`, as stdlib's `cmdHang` does.
- Stdlib's `exec_test` moved to argv[1] dispatch. **Fold** as a citation note on GO-TEST-12. The env-var form still works and stays the example.
- `ExitCode()` gives −1 in-process and 255 when forwarded. **Fold** into GO-API-19.
- GO-CONC-17's example contradicts GO-API-20. **Resolved in (e) 3.**
- "config-assembly has not landed" was stale. **Reject** (it had landed; api conflict 16).
- There is no corpus precedent for the version handshake. **Fold.** GO-API-18 rests on the fixture and on Python `_dist.py` parity.

**network**
- All [ssr] surprises (the `time.After` claim, the write path being `retry.Never`, the CDN returning 200 for every UA) are **folded** into GO-NET-06, 17 and 18 (conflicts 13-18).
- **The pull-path watchdog is resolved at harvest by source read, so no dive is needed.** On go-containerregistry the layer's context is fixed when the layer object is built:
  - `remoteImageLayer.ctx` is set from `r.ctx` (`google__go-containerregistry/pkg/v1/remote/image.go:154,272`).
  - `remoteLayer.Compressed()` passes `rl.ctx` to `fetchBlob` (`layer.go:38-39`).
  - `fetchBlobURL` issues `f.client.Do(req.WithContext(ctx))` (`fetcher.go:323`).
  - So GO-NET-06's `context.WithCancelCause` must be created **before** `remote.Image`/`remote.Layer`, and passed with `remote.WithContext`, preferably one per layer through `remote.Layer`. The watchdog wraps the `Compressed()` reader and fires that cancel.
  - A cancel created after the layer object exists never reaches the request. Binding authoring note N-7.

**release**
- `-buildvcs=true` exits 0 on #74763, and worktrees are exempt (vcs.go:574). **Fold** into GO-REL-03, GO-REL-14 and failure mode 15.
- The worktree-safety claim is scoped to go1.27.1. It is dated, and it is a go-upgrade re-check (`buildvcs-r2/run.sh`).

**bazel**
- `%workspace%` is not expanded in `workspace_status_command`. **Fold** into BZL-GO-09.
- The default fastbuild strips; `-c opt` does not. **Fold** into BZL-GO-15.
- nogo `stdversion` is inert. **Fold** into BZL-GO-06 and 07.
- A stripped-binary govulncheck gives a false red. **Fold** into BZL-GO-11.
- The `STABLE_*` keys requirement. **Fold** into BZL-GO-14.
- The synctest exclusion. **Fold** as a fixture note for the GO-MOD-01 owner.

**cli**
- A nested group's typo exits 0. **Fold** into GO-CLI-06 (root only) and GO-CLI-21.
- Plain `SetOut` moves deprecation notices to stdout (cobra#1708). **Fold** into GO-CLI-20.
- `completion` is not inert. **Fold** into Documented gaps.
- The contested bare-group contract is settled by GO-CLI-21.

**language**
- A terminal `yield` is clean. **Fold** into GO-LANG-08, which now binds only a `yield` called again after it may return false.
- The instantiation count uses `\bName\(`. **Fold** into GO-LANG-14.
- An interface method never takes type parameters. **Fold** into GO-LANG-23.
- The x/exp/constraints blog is stale. **Fold** into GO-LANG-22.
- A dropped `iter.Pull` `stop` is caught by goleak and synctest. **Fold** into GO-LANG-18.
- A cross-package generic alias works at go1.23. **Fold** into GO-LANG-03.
- gopls has a `yield` analyzer that vet and golangci lack. **Fold** into GO-LANG-08. It adds gate step 10 (see (e) 2).
- **Found at harvest: the toonew.go json/v2 exclusion.** **Fold** into GO-LANG-04 and record as frame correction (d) 1:
  - The go1.27.1 toolchain's vendored `src/cmd/vendor/golang.org/x/tools/internal/typesinternal/toonew.go:24-25` excludes only `testing/synctest` from `stdversion`, so bare `go vet` reds an `encoding/json/v2` import at `go 1.26` (GO-LANG-04's L4 run is valid).
  - x/tools v0.50.0 (`golang.org/x/tools@v0.50.0/internal/typesinternal/toonew.go:28-29`) and golang/tools HEAD (`golang__tools@d2d3de9f066e`) also exclude `encoding/json/v2` and `encoding/json/jsontext` at file version ≥ go1.25.
  - golangci-lint 2.14.0 and rules_go's nogo (BZL-GO header: x/tools v0.50.0) both build against v0.50.0, so both are already blind to GO-LANG-04's violation.
  - Bare `go vet` goes blind when a Go release vendors that x/tools.
  - Resolution: see (e) 13.

**observability**
- `sync.Pool` +1634% on the wrong side of the line. **Fold** into GO-OBS-16.
- The "1 MiB non-escaping slice stack-allocates" claim. **Reject** (C7). A runtime-sized `make` above 32 B heap-allocates despite "does not escape".
- PGO measured slower on a fleet-shaped binary. **Fold** into GO-OBS-20.
- `default.pgo` is 0/35. **Fold** into GO-OBS-20's census.
- perfsprint misses `%s%s`. **Fold** into GO-OBS-17.
- `nogreenteagc` is still accepted on 1.27.1. It is a dated re-check (go-upgrade), plus GO-LANG-16's example fix (see (e) 7).

### (c) Map rows affected

- **M-K-01 (gate block):** GO-GATE-01 gains conditional step 10 (gopls `yield`, see (e) 2). GO-MOD-16's `oldstable` leg now also carries GO-LANG-04's durable check (see (e) 13).
- **M-A-05, M-A-19/20 (iterators and generics):** settled by GO-LANG-18..26.
- **M-A-03/04:** GO-MOD-08's list gains `golang.org/x/exp/constraints` (see (e) 1).
- **M-H-02/05/11 (client timeouts, retry, redirect):** settled by GO-NET-06 (streaming), GO-NET-17 gap (4) and GO-NET-18.
- **M-H-12/13/14:** remain deferred under Q8.
- **M-N-01..05 (reproducibility and stamping):** settled by GO-REL-03, 06 and 14. #74763 is a documented gap with a re-run trigger.
- **M-O-05..11:** settled by BZL-GO-06, 07, 09, 11, 14 and 15.
- **M-F-02/05/06 (unknown command, group help, stdout discipline):** settled by GO-CLI-06, 17, 20 and 21.
- **M-J-07 and M-J-09 (PGO, allocation hygiene):** promoted from Deferred into GO-OBS-15..22.
- **M-J-10/11 and M-J-12's `tracebacklabels` half:** stay deferred under Q8.
- **M-E-(SDK) process contract:** settled by GO-API-18, 19 and 20.

### (d) Frame corrections

1. `encoding/json/v2` and `jsontext` are excluded from `stdversion` in x/tools ≥ v0.50.0. golangci-lint 2.14.0 and nogo are blind to GO-LANG-04. go1.27.1's bare `go vet` is not yet blind.
2. On go-containerregistry, a layer's request context is fixed at `remote.Image`/`remote.Layer` time (`image.go:154`, `layer.go:38-39`). A watchdog cancel must exist before the layer object does.
3. QF1009 blocks under the fleet config ([C-22]); it is not an unrendered hint.
4. `go test` runs 12 of the 35 vet analyzers on go1.27.1, not "11 of 36" ([C-25]).
5. A `unix` build tag on the SDK's signal classifier breaks the Windows build (GO-API-19, [R5]).
6. `ProcessState.ExitCode()` is −1 for a signal death in-process, and 255 once it is forwarded by a shell (GO-API-19).
7. `Cmd.Wait` returns the process error in preference to a copy error (`exec.go:944-959`). The context cause must be checked before exit classification (GO-API-20).
8. go-containerregistry's write path is `retry.Never`, so `WithRetryStatusCodes` is inert on writes (GO-NET-17 gap 4).
9. The dist CDN returns 200 for every user agent tested. GO-NET-18's rationale no longer asserts a 403.
10. `-buildvcs=true` exits 0 on the #74763 layout, so exit status is not proof of stamping (GO-REL-03).
11. `%workspace%` is not expanded in `workspace_status_command` (BZL-GO-09).
12. Bazel's default fastbuild strips binaries and `-c opt` does not (BZL-GO-15).
13. nogo passes the SDK's GoVersion, not the module's `go` line. That is why `stdversion` is inert under it (BZL-GO-06/07).
14. An unsealed nested cobra group exits 0 on a typo (GO-CLI-21).
15. gopls v0.23.0 has a `yield` analyzer; vet and golangci-lint 2.14.0 do not (GO-LANG-08).
16. Interface methods never take type parameters, even on 1.27 (GO-LANG-23).
17. A generic type alias needs `go 1.23`, cross-package use included (GO-LANG-03).
18. `nogreenteagc` is still accepted on 1.27.1 and is a real opt-out (GO-OBS C9).
19. A runtime-sized `make` above 32 B heap-allocates despite `-m` reporting "does not escape" (GO-OBS C7/C8).

### (e) Cross-consolidation contradictions

Every ruleset was read against every other. The wave-2 resolutions 1-17 and the
wave-3 resolutions 1-23 stand unless a line below supersedes them. The kept ID
is in bold.

1. **GO-LANG-22 vs GO-GATE-09/13/22 (depguard list length).**
   - GO-LANG-22 adds a package-scoped `golang.org/x/exp/constraints` entry (`desc: "use stdlib cmp.Ordered (Go 1.21)"`).
   - GO-GATE's three verified files quote 12 entries (gates line 181). The GO-MOD-08 row lists 11, because the `go.uber.org/automaxprocs` entry from GO-OBS-06 is not yet in its text.
   - **GO-MOD-08** owns the list, which becomes **13 entries**: its 11 + automaxprocs (GO-OBS-06) + x/exp/constraints (GO-LANG-22).
   - GO-GATE-13's citation row and all three files re-quote those 13 verbatim.
   - The drafter re-runs `golangci-lint config verify` and the GO-GATE-22 superset check on all three files, and re-watches L13.
2. **GO-LANG-08 vs GO-GATE-01 (gate block).**
   - GO-GATE-01's ordered block has no gopls step.
   - **GO-LANG-08** owns the command. GO-GATE-01 gains **conditional step 10**, shaped like step 9: it runs once on the stable leg, only where `grep -rln --include='*.go' -e 'func(yield func(' .` prints a file.
   - Step 10 runs pinned gopls v0.23.0 `check` over those files and greps for `yield may be called again`. Empty output passes.
3. **GO-CONC-17 vs GO-API-20.** GO-CONC-17's example `context.WithTimeoutCause(ctx, d, ErrOcxTimeout)` uses a sentinel cause. **GO-API-20** wins (a typed `*TimeoutError` cause). GO-CONC-17 keeps its mechanism and SHOULD, and swaps the example.
4. **GO-IO-10 vs GO-API-20 (classify-first).** GO-IO-10's grep cannot see check order. **GO-IO-10** keeps its text. Its verification cell cites GO-API-20's real-spawn contract case as the SDK check, and it states the order: context cause before exit classification.
5. **GO-API ruleset line 63 vs GO-GATE-18/22.**
   - GO-API line 63 says "a CLI takes the overlay minus `gochecknoglobals` if it wants", with a "CLIs opt in" default.
   - GO-GATE-18/22 say a CLI never takes the library/SDK file, and a repo copies exactly one whole file.
   - **GO-GATE-18/22** win. The opt-in sentence is dropped. GO-API-04's SHOULD for non-main CLI packages becomes a reading heuristic under `cli.golangci.yml`.
6. **GO-GATE-19's rationale ("78 non-test hits nobody classified") and its open question vs GO-NET-09 and net conflict 12** (classified: ~92% false positives, 2 real leaks). **GO-GATE-19** stays SHOULD, cites GO-NET-09's classification, and the open question is closed.
7. **GO-LANG-16 vs GO-OBS C9.**
   - GO-LANG-16's `nogreenteagc` example is inverted, and its grep misses YAML env maps (1/3 red).
   - **GO-LANG-16** keeps the rule. Its example becomes "`nogreenteagc` on 1.27 is a real opt-out, like `nojsonv2`".
   - Its grep is replaced by C9's watched form (3/3 red): `grep -rn -E --exclude-dir=.git -e 'GOEXPERIMENT[^a-zA-Z0-9_]+([a-z0-9]+,)*no[a-z0-9]+' .`
   - GO-OBS-22 keeps the binary-side `go version -m` check.
8. **perfsprint and prealloc membership (GO-OBS-17/18 vs GO-GATE-16).** Neither joins any fleet file. Any enabled linter blocks, while GO-OBS-17/18 are SHOULD for hot paths only and CONSIDER elsewhere. The **GO-GATE-16** roster is unchanged, and GO-OBS-17/18 name the one-off `--enable-only` command.
9. **GO-MOD-14 (tag convention, MUST) vs GO-REL-14 (parent/child root module path, SHOULD).** They are consistent by scope. **Both** keep their text, and GO-MOD-14 cites GO-REL-14 as the stamping-safe layout.
10. **go-bazel stale citations.**
    - go-bazel line 197 cites "GO-REL-14" for `--version` stamping, and BZL-GO-09 cites "GO-REL-05's ReadBuildInfo half". Both become **GO-REL-06**, because GO-REL-14 is now the nested-module rule.
    - BZL-GO-06's "5 analyzers go test already runs" becomes "the 5 analyzers rules_go's `vet = True` names". `go test` runs 12 (see (d) 4).
11. **GO-SEC-01's unanchored `common-false-positives` grep vs GO-GATE-09's anchored one.** The unanchored form false-reds on the assembled files' comments ([C-24]). **GO-SEC-01** keeps its text and takes GO-GATE-09's `-E '^[^#]*common-false-positives'` form.
12. **Stale "G104/G115 only" wording in GO-IO-02 and GO-OBS-05.** **GO-GATE-14** wins: the excludes are G104, G115 and G304. Both cells are reworded. G305 is unaffected.
13. **GO-LANG-04's check vs (d) 1.**
    - **GO-LANG-04** keeps its rule.
    - Its durable check becomes GO-MOD-16's `oldstable` (1.26) CI leg `go build ./...`. That is a compile error, independent of x/tools.
    - Bare `go vet` on 1.27.1 stays as the fast local check.
    - golangci's govet and nogo are named as **not** substitutes.
    - go-upgrade gains the re-check "does the new toolchain's vendored `toonew.go` exclude json/v2?".
14. **GO-CONC-11's trigger grep vs GO-LANG-18.** **GO-CONC-11** keeps its text, and its trigger grep gains `-e 'iter\.Pull'`.
15. **Stale counts in concurrency and testing.** GO-CONC-08 says "11-analyzer subset", and GO-CONC and GO-TEST cite GO-GATE-COMMANDS-*. These map per wave-2 contradiction 6 and read "12 of 35" (**GO-GATE-02**).
16. **GO-TEST-13's json/v2 caution** stays dropped (wave-3 contradiction 16).
17. **Config fragments.** GO-CLI's YAML fragment (uniq-by-line, bare gocritic, deep-exit-only revive) and GO-CONC's fragment are superseded by **GO-GATE-22**: sibling families cite linter names and paste no YAML.
18. **Answered open questions left in unrevised files.**
    - GO-SEC's G7xx question: every hit was real ([CA], GO-GATE-14).
    - GO-SEC's G204-on-CLIs question: per-call reasoned nolint.
    - GO-TEST's coverage-scope question: answered by GO-API-12.
    - Drafters omit all three.

### (f) Convergence

**Verdict: converged, ready to draft.** The three clauses of
[wave-plan](../../.claude/skills/research-lang/references/wave-plan.md#convergence), applied honestly:

- **Fresh-family clause: holds.**
  - Wave 4 opened no family. All eight dives were revisions.
  - Its 13 new MUST and its new failure modes are all in families that already existed: gates 3/5/18/19/23, api 12-16, net 13-16, rel 14-15, bazel 6/8/11/12/19, obs 12-18, lang 9, cli documented gaps.
  - Wave 3, by contrast, added 69 MUST in seven fresh families.
  - The wave-4 additions are sharpening: overclaims fixed in place (GO-GATE-09, GO-CLI-06, GO-REL-03, BZL-GO-11, GO-LANG-08), and contracts watched for the first time (GO-API-18..20, GO-CLI-20/21).
- **Tail clause: holds.** No open question is both load-bearing and answerable by a source read or fixture run. The two that were answerable (the ggcr pull-path watchdog wiring and the json/v2 stdversion blind spot) were answered at harvest by source read and become authoring notes N-7 and N-8.
- **Config clause (wave 3's blocker): holds.** The three fleet files were assembled and watched ([CA], GO-GATE-22/23). The remaining edits are a one-entry list addition and a conditional gate step, both mechanical, with their re-watch named in (e) 1-2.

Every open question across the fourteen consolidations, classified:

| Class | Questions | Disposition |
|---|---|---|
| **Owner decision, default applied** | Everything in wave-3 (f)'s row. Also: gopls `yield` only where producers exist; SDK redirect cap 5; GO-NET-15 stays in GO-NET; nogo optional; Q7 yes; Windows Ctrl-C 130; GO-CLI-08 SHOULD; `-s -w` off; double signing kept; mirrored binaries reported without blocking; depguard `logging` for CLIs; automaxprocs entry in GO-MOD-08; no sloglint style options | Applied. Drafters state each as a default the adopter may override. |
| **Measurement the corpus cannot supply** | `cli/windows` (GO-CLI-07/08/13 Windows legs); GO-IO-16/17 Windows; `release/cgo-on-darwin` (a macOS runner); `release/keyless-green-path` (GitHub OIDC); Bazel cross-`--platforms` double build of the `windows`/`darwin` artifacts | Residue. Rows stay compile- or grep-verified, with the reason in the row. BZL-GO-14's byte-identity claim is scoped to `linux_amd64` in text. |
| **Dated re-check (go-upgrade steps)** | SA4023's test blind spot; gosec empty-excludes pass; zap `--fix` probe; roclose probe; QF1009 probe; `nojsonv2` and `nogreenteagc` removal; the `go fix` roster; gopls `yield` reaching vet or golangci; colorprofile `NO_COLOR`; rules_go `TOOLS_NOGO` gap and nogo `stdversion` probe; `buildvcs-r2/run.sh` against #74763; vendored `toonew.go` json/v2 exclusion | go-upgrade skill steps (N-12) |
| **Answerable now, load-bearing** | none remaining; ggcr pull-path watchdog wiring and toonew.go json/v2 were answered at harvest ((b), (e) 13) | Authoring notes N-7 and N-8 |
| **Answerable now, not load-bearing** | Swiss-table bias by key shape (GO-LANG-09's control is the sort); `go_work` and bazel-gazelle#1797 (GO-MOD-05 keeps `go.work` out of the SDK and CLIs, and Bazel is 2/35); M-H-12/13/14 and deferred telemetry M-J-10/11/12 (Q8, no fleet service); the pprof census (the fleet rule forbids the shape); `Secret` under json/v2; nested tags through a proxy; `--fix` widening; `ireturn` allowlist; revive `internal/` exclusion | Residue |

### (g) Residue

The verdict is ready-to-draft, so no dive is commissioned. The residue is
recorded for whoever picks it up after the artifacts ship:

- `cli/windows`: needs a Windows runner (GO-CLI-07/08/13 and GO-IO-16/17 Windows legs).
- `release/cgo-on-darwin`: needs a macOS runner with split DNS.
- `release/keyless-green-path`: needs a throwaway public GitHub repo with OIDC.
- `bazel-go/go_work-1797` and `bazel-go/cross-platform-double-build`: only if a fleet repo adopts Bazel for Go.
- `language/stdlib-semantics` Swiss-table bias: only if GO-LANG-09's sort control is ever contested.
- `network/http-server-modern`, `observability/deferred-telemetry`, `observability/pprof-census`: only when a fleet Go service exists (Q8).
- Gates residue: widen `--fix`, the `ireturn` allowlist, the revive `internal/` exclusion. Each needs a first adopter's real numbers.

## Authoring notes (binding on the drafters)

These notes bind the phase-7 drafters. Where a note and a consolidation
disagree, the note wins, because it records a resolution from (e) of a wave
section above. Where a note is silent, the consolidation's own text is final.

### N-1. Rules and exact glob lists

- **`go-quality`**, `paths: ["**/*.go"]`.
  - Keywords: `go,golang,quality,errors,concurrency,testing,cli,iterators,generics,slog,net/http`.
  - The index `rules/go-quality.md` stays under 200 lines.
- **`go-modules`**, with these `paths` in this order, 13 entries, all double-quoted:
  - `"**/go.mod"`, `"**/go.sum"`, `"**/go.work"`, `"**/go.work.sum"`
  - `"**/.golangci.*"`, `"**/*golangci*.yml"`, `"**/*golangci*.yaml"`
  - `"**/.goreleaser.*"`, `"**/goreleaser*.yml"`, `"**/goreleaser*.yaml"`, `"**/.config/goreleaser.*"`
  - `"**/.ko.yaml"`, `"**/staticcheck.conf"`
- No brace globs. Dotted names stay explicit.
- Checker: `check-artifacts.py --root /home/mherwig/.cache/research-lang/exemplars/go/ko-build__ko`, behind an `if [ -d … ]` guard.
  - Pass `--allow-absent` for `go.work`, `go.work.sum`, the dotless goreleaser names, `.config/goreleaser.*` and `staticcheck.conf`. The Artifact set decision records where each is live.
- Each index says which glob it expects to be installed with. The `go-quality` index routes the residual misses by task: Makefile or workflow gate commands, `Dockerfile`, `.go-version`, `revive.toml` and `MODULE.bazel`.

### N-2. Depth files, owned family, and source sections

One family per file. A prefix belongs to one file forever. Depth files never
point at other depth files. A cross-family reference cites the rule ID only; the
index's routing table resolves where that ID lives.

| File | Family | Draw from |
|---|---|---|
| `rules/go-quality/language.md` | GO-LANG | go-language.md: Ruleset, Verdict 1-10, Consolidation verification runs L1-L14, Conflicts 1-17, failure modes; plus the (e) 7 and 13 edits |
| `rules/go-quality/errors.md` | GO-ERR | go-errors.md, all sections; plus wave-2/3 (e) edits |
| `rules/go-quality/concurrency.md` | GO-CONC | go-concurrency.md; plus the (e) 3, 14 and 15 edits |
| `rules/go-quality/api-design.md` | GO-API | go-api.md: Ruleset (minus the line-63 opt-in sentence, (e) 5), Verdict 1-15, Conflicts 1-20, failure modes 1-16 |
| `rules/go-quality/testing.md` | GO-TEST | go-testing.md; plus GO-TEST-12's `time.Sleep` and argv[1] notes ((b) api) and (e) 15, 16, 18 |
| `rules/go-quality/cli-contract.md` | GO-CLI | go-cli.md, including both revision passes, Documented gaps and the sealed skeleton (GO-CLI-17, 20, 21) |
| `rules/go-quality/io.md` | GO-IO | go-io.md; plus the (e) 4 and 12 edits; GO-IO-18 dropped (N-6) |
| `rules/go-quality/network.md` | GO-NET | go-network.md, Ruleset, Verdict 1-9, Conflicts 1-18; plus N-7 |
| `rules/go-quality/security.md` | GO-SEC | go-security.md; plus the (e) 11 and 18 edits |
| `rules/go-quality/observability.md` | GO-OBS | go-observability.md, GO-OBS-01..22, C1-C12; plus (e) 12; go-diagnose starts at GO-OBS-22 |
| `rules/go-modules/gates.md` | GO-GATE | go-gates.md: Ruleset, the three complete config files (re-quoted with the 13-entry list, (e) 1), the ordered command block (+ step 10, (e) 2), Verdict 1-12 |
| `rules/go-modules/release.md` | GO-REL | go-release.md, GO-REL-01..12 and 14, Verdict 1-10, the consolidation runs C1-C12 |
| `rules/bazel-quality/go.md` | BZL-GO | go-bazel.md, BZL-GO-01..15 and the header versions; plus the (e) 10 citation fixes; see N-13 |

GO-MOD lives directly in `rules/go-modules.md`, the index, drawn from go-modules.md.

### N-3. Index-owned versus depth-owned

- **The `go-quality` index owns GO-CORE-01..05:**
  - 01..03: never weaken a check; watch it red before trusting it green; empty output means pass.
  - 04: read the `go` line first.
  - 05: generated code.
- **The index also holds:** the gate block, a non-negotiables list of at most 25 lines, the routing table by task, and Siblings.
- **The non-negotiables list is a curated cross-family subset,** each line ending in its rule ID. It is not the full MUST inventory; the 179 MUST rows live in the depth tables.
  - It includes at least: GO-ERR wrap/`%w`; GO-CONC-02 (no stored `context.Context`); GO-CONC-11 (goleak); GO-TEST-02; GO-CLI-06 (root unknown command is 64); GO-CLI-21 (sealed groups); GO-IO atomic write; GO-NET-06 (timeouts); GO-SEC-01; GO-LANG-04 (the `go` line gates the API); GO-LANG-08 (`yield`); GO-API-18..20 (SDK contract).
- **The `go-modules` index owns GO-MOD-01..18 outright.** It holds the gate command block pointer, the owner defaults for the `go` and `toolchain` lines (Q1), and routes to `gates.md` and `release.md`.

### N-4. Bounded duplication

- A rule's text appears once, in its owning file.
- Allowed duplication:
  - the index non-negotiables line (one line, with the ID);
  - GO-GATE-13's citation row (IDs only, plus the verbatim list in the config files);
  - skill tables (N-11).
- Config YAML appears only in `gates.md`. Every other family names linters and settings (GO-GATE-22, (e) 17).
- The depguard list text is quoted verbatim in the three config files and nowhere else.

### N-5. Pinned decisions and defaults

- **Toolchain,** each dated "measured 2026-09-26": Go 1.27.1; golangci-lint v2.14.0; staticcheck 2026.2.1; gopls v0.23.0; cobra v1.10.1; goreleaser 2.17.1; cosign 3.1.3; Bazel 9.2.0; rules_go 0.63.0; gazelle 0.54.0; x/tools v0.50.0.
- **Owner defaults Q1-Q8** as in go-frame.md:
  - Q1: libraries and the SDK declare `go 1.26.0`; CLIs declare `go 1.27.0` plus a `toolchain` line.
  - Q2: the SDK is stdlib-only, with go-cmp and goleak for tests.
  - Q3: cobra.
  - Q4: goreleaser raw binaries plus cosign keyless.
  - Q5: 100% coverage for the SDK.
  - Q6: Windows is first-class.
  - Q7: yes.
  - Q8: no services.
- **The (f) owner-default row** also applies.
- Each default is written as "default; the adopter may override". Project paths and names (`ocx`, `_dist.py`, `github.com/ocx-sh/ocx-sdk-go`) are presented as examples the adopter renames, following rule-distillation's Portability section.

### N-6. Drop at authoring

- **GO-REL-13:** GO-API-10 wins (wave-3 contradiction 12). `release.md` carries a one-line ID citation, and the ID is never reused.
- **GO-IO-18:** duplicates GO-NET-14. The row is removed from `io.md`, and the index routing row for staging or ingesting blobs names `network.md`. The ID is retired, not reused.
- **GO-GATE-13:** stays as a citation row only (IDs plus "quoted verbatim in the three files").
- **GO-TEST-13's json/v2 caution:** dropped (wave-3 contradiction 16).
- **GO-API line-63 opt-in sentence:** dropped (see (e) 5).
- **Answered open questions** (see (e) 18) are not carried into any file.
- **Rejected dive claims** (C7 stack allocation; "config-assembly not landed"; the CDN 403 as fact) appear nowhere.

### N-7. Stream-stall watchdog wiring on go-containerregistry (GO-NET-06)

- Create `ctx, cancel := context.WithCancelCause(parent)` before `remote.Layer(ref, remote.WithContext(ctx))`, one context per layer, or before `remote.Image` when layers share it.
- The watchdog wraps the `Compressed()` reader and calls `cancel(errStall)` on idle.
- Cite `pkg/v1/remote/image.go:154`, `layer.go:38-39` and `fetcher.go:323`. Mark the pull path as "wiring by source read, not fixture-watched" in the row.

### N-8. GO-LANG-04's check (see (e) 13)

- Durable check: the GO-MOD-16 `oldstable` leg `go build ./...` at the library's declared floor.
- Fast check: bare `go vet ./...` on go1.27.1.
- The row says in text that golangci govet and nogo are blind to the json/v2 case because of x/tools v0.50.0 `toonew.go:28-29`.

### N-9. Version-dating convention

- Every version-specific claim carries the tool and version, and either "(measured 2026-09-26)" or "(read 2026-09-26)".
- Language floors say which gates them: the `go` line (compile-gated) or the toolchain (behaviour-gated). For example, "`iter.Pull` (go 1.23, go-line gated)".
- Each depth file opens with one line naming the versions it binds to, like go-bazel's header.
- Documented gaps that depend on an upstream issue name it, as a link, with its state on 2026-09-26: golang/go#74763, cobra#1708, bazel-gazelle#1797.

### N-10. Verification-command shape (every checker cell)

- Always give an explicit directory operand (`.` or a path). Never rely on grep's implicit stdin.
- Use one `-e` per alternative. No `\|` alternation, and no `-E 'a|b'` inside a table cell.
- Quote `--include` and `--exclude-dir` globs: `--include='*.go'`.
- No unquoted `**`, and no `$(...)` command substitution.
- No angle-bracket placeholders inside a pattern. Write a concrete example name and say "rename".
- Use `xargs -r` (or `xargs -0 -r` after `find -print0`), so empty input runs nothing.
- No unescaped `|` inside a markdown table cell. A command that needs a pipe goes in a fenced block under the table, and the cell cites it by name.
- Each cell states what empty output means. For a violation locator, "empty output = pass" (grep exits 1). For a presence check, empty means fail, and the cell says so.
- A cell with an exit-code contract names the code: govulncheck text format exits 3 on findings, and json/sarif exit 0 (GO-MOD).

### N-11. Skill scope

- `go-release`, `go-upgrade` and `go-diagnose` are procedures only: numbered steps, each citing the rule IDs it enforces.
- A skill never restates rule text. Any MUST it repeats appears in a `| # | Finding | Rule |` table (the finding in plain words, the rule ID last), never as a row that starts with the rule ID.
- `go-diagnose` starts at GO-OBS-22 (read `go version -m` first).

### N-12. go-upgrade dated re-checks

One numbered step each, citing its source:
- SA4023's `_test.go` blind spot.
- The gosec empty-excludes pass, including G304 (GO-GATE-14).
- `config verify` plus the superset check on all three files (GO-GATE-22).
- The zap `--fix` probe (GO-GATE-21, CR-12).
- The roclose probe (GO-GATE-20, CR-4/5).
- The QF1009 probe (C-22).
- `nojsonv2` and `nogreenteagc` removal (GO-LANG-16, GO-OBS-22).
- The `go fix` roster (GO-GATE-03).
- The gopls `yield` analyzer reaching vet or golangci (GO-LANG-08; drop step 10 when it does).
- colorprofile `NO_COLOR` parsing (GO-CLI-13).
- The rules_go `TOOLS_NOGO` gap and the nogo `stdversion` probe (BZL-GO-06/07).
- `buildvcs-r2/run.sh` against golang/go#74763 (GO-REL-03/14).
- The vendored `toonew.go` json/v2 exclusion (GO-LANG-04, N-8).

### N-13. bazel-quality `go.md` handoff shape

- `rules/bazel-quality/go.md`, 200 lines or fewer, in the shape of `rules/bazel-quality/java.md`:
  - frontmatter `title`/`summary`;
  - an "Owns `BZL-GO`" paragraph that names what it does not own (`*.go`, `go.mod` → go-quality, go-modules);
  - sibling families cited, never restated (BZL-MOD, BZL-HERM, BZL-CACHE, BZL-TEST, BZL-FLAG, BZL-ARCH, BZL-LARK, BZL-CI);
  - a Contents line;
  - the measurement disclosure: "Measured 2026-09-26 against Bazel 9.2.0, rules_go 0.63.0, gazelle 0.54.0, Go 1.27.1";
  - Gaps;
  - "What agents get wrong here".
- It is framed "if you adopt Bazel for Go" (2 of 35 exemplars). It says it reopens the closed `rules_go` scope (`bazel-topic-map.md:797`).
- It has no glob of its own.
- In the same change on the drafting branch:
  - add one routing row to `rules/bazel-quality.md`: "Writing a `go_*` target, running Gazelle for Go, repinning `go_deps`, or wiring `nogo`";
  - add the keywords `rules_go`, `gazelle`, `go_deps`, `nogo` and `x_defs`;
  - add `go-quality` and `go-modules` to Siblings, and `*.go` to its "never loads on" line;
  - bump `publish.toml` `[rules.bazel-quality]` `version` from `0.2.0` to `0.3.0`;
  - update `docs/bazel-quality.md`.
- BZL-GO-14's byte-identity claim is scoped to `linux_amd64` in text.

### N-14. Bundle

- `go-essentials` has these members: `go-quality`, `go-modules`, `go-release`, `go-upgrade` and `go-diagnose`.
- Every member is untagged (no tag at all; `latest` counts as a pin).
- `bazel-quality/go.md` ships inside `bazel-quality`, not in the bundle.

## Authoring landed (2026-09-26)

Phase 7: 12 depth files, 2 indexes, 3 skills and `bazel-quality/go.md`, all
checker-clean (receipt `go-topic-map/scratch/author-receipt.json`). Dropped at
authoring with reasons in the receipt: GO-LANG-24 and GO-LANG-25 (restored by
review as SHOULD reading heuristics), GO-IO-18 and GO-REL-13 (retired per N-6).
Phase 8: six opus reviewers ran 99 verifications against planted fixtures and
returned 14 blockers, 50 fixes and 27 nits (`review-receipt.json`); 21 fixers
applied 68 findings (`go-fix.mjs`). Three drafter findings overturned
consolidation text; the orchestrator ratifies them here as binding notes:

- **N-15 (GO-REL-11).** Attest with `subject-checksums: dist/checksums.txt`,
  never `subject-path: dist/<tool>-*`. goreleaser 2.17.1 with `formats: [binary]`
  keeps each binary under `dist/<id>_<os>_<arch>_<variant>/`, so the path glob
  matches only the SBOMs (measured on a snapshot, 2026-09-26).
- **N-16 (GO-REL-01).** `{{ .Date }}` resolves to the commit time under
  goreleaser 2.17.1 and a double build stamped with it came out byte-identical;
  `{{ .Now }}` goes red. The rule stands (stamp no date, `vcs.time` carries it);
  its rationale no longer claims `.Date` changes the bytes.
- **N-17 (GO-TEST-12, GO-OBS-07, GO-IO).** `GODEBUG=execwait=2` is not a leak
  gate on Go 1.27.1. It fires from a finalizer, which never runs for an
  `exec.CommandContext` `Cmd` because the default `Cancel` closure refers back
  to the `Cmd` (a cycle, which `runtime.SetFinalizer` does not guarantee to
  collect), and it fires only after a GC. Leak-freedom is read (every `Start`
  reaches a `Wait`), and a silent run proves nothing.

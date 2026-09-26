# go-modules

Standards for what a `go.mod`, a lint config or a release config claims about
itself: the gate, seventeen merge-blocking non-negotiables, and two depth
files routed to by task, plus three complete golangci-lint v2 files a module
copies whole.

```sh
grim add ghcr.io/ocx-sh/lore/go-modules
```

Loads on the 13 globs in the frontmatter: `go.mod`, `go.sum`, `go.work`,
`go.work.sum`, every golangci-lint config name, every goreleaser config name,
`.ko.yaml` and `staticcheck.conf`. A `*.go` file, a Makefile or an ordinary
workflow never loads it, and `go-quality` routes those. Binds to Go 1.27.1,
golangci-lint v2.14.0, staticcheck 2026.2.1, govulncheck v1.8.0 and goreleaser
2.17.1, measured on 2026-09-26 against a 35-repository upstream exemplar
corpus, because the fleet that adopts this set has no Go code of its own yet.

## It starts with what a green build does not prove

A green `go test` runs 12 of vet's 35 analyzers, so a copylocks or a
loopclosure defect never shows red there. `go mod init` on 1.27.1 writes
`go 1.27.1`, which forces every consumer of a library onto that patch and
looks identical to a deliberate floor. A stripped release binary keeps its
`BuildInfo` but drops the symbol table `govulncheck -mode=binary` needs, so a
clean scan on a `-s -w` artifact proves nothing about the artifact itself. And
a nested module with no `go.mod` at the git root stamps `(devel)` at a tag
with exit 0, on every Go 1.25 through 1.27.1 build, tag included.

The gate is six commands for that reason, run from every `go.mod` root:
`go mod tidy -diff`, `go build ./...`, `go vet ./...`,
`golangci-lint config verify`, `golangci-lint run ./...` and
`govulncheck ./...`. Each fails on its exit code, never on its stdout, and the
full ten-step ordered block behind it lives in the gates depth file.

## What is in it

The index carries the gate, seventeen non-negotiables, and the GO-MOD family
it owns outright: 18 rules, 14 of them merge-blocking, covering the `go` line
by code kind, the toolchain directive, committed `go.sum`, `go.work` in a
multi-module repository only, no `replace` outside a local path, the
depguard `superseded` deny list, the SDK's stdlib-only import graph,
`govulncheck` in text mode, the CI toolchain matrix, v2+ module suffixes and
tag retraction.

Two depth files sit behind it, reached only through the index's routing
table because no glob here reaches them directly. The gates file owns the
ordered CI block, the golangci-lint pin, and which of three complete configs
a module copies whole: a baseline, a CLI overlay adding `exhaustive` and
`forbidigo`, and a library/SDK overlay adding `gochecknoglobals`, `ireturn`
and `sloglint.no-global`, none of them a fragment. The release file owns
`-trimpath`, VCS stamping checked on the built artifact, the `--version`
fallback, goreleaser's asset shape, keyless signing and SHA-pinned workflow
actions.

## Pinned decisions

A library or the SDK declares `go 1.26.0` or lower, a CLI declares
`go 1.27.0`, and only a CLI carries a `toolchain` line. golangci-lint stays at
v2.14.0 and moves only through the `go-upgrade` skill. The SDK is a
stdlib-only library wrapping the project's CLI, with go-cmp and goleak
allowed for tests only. Release binaries ship as raw per-platform binaries
plus a checksums file, never `-s -w`, signed keyless in CI with a GitHub
attestation. Windows is a first-class CI leg for the SDK and every CLI, and
there is no vendoring and no private module until one exists.

Each is a default an adopter overrides once, in their own module or shared
config, never per call site. Overriding one is a recorded decision, and
re-arguing it in a pull request is not a review comment.

## Traps over tutorials

Every line names a mistake an agent makes by default, because module
semantics are already in the model. `google/uuid` is dropped for stdlib
`uuid` only at `go 1.27` and only for seven of its functions, never blanket.
A CVE is fixed by upgrading, never by a `replace` to a fork, because
`replace` only ever applies in the main module and every consumer still
builds the vulnerable dependency. A bad published tag is retracted inside a
new, higher tag, never deleted or re-tagged, because a retraction acts only
once a higher version carries it.

## What it does not cover

The `*.go` source itself, and the API, error-handling, testing and
observability families that judge it: those are `go-quality`'s. Building
with Bazel instead of `go build`, which is `bazel-quality`'s `go.md` depth
file. The procedures behind the pinned versions above: bumping the
toolchain or a linter is the `go-upgrade` skill, cutting a release end to end
is `go-release`, and reading a shipped binary's stamp or a runtime surprise
is `go-diagnose`. None of those three restate a GO-MOD, GO-GATE or GO-REL
rule. Each only cites the ID.

## Siblings

`go-quality` loads on `**/*.go` and owns the shared GO-CORE family this set
only cites: a weakened check, red-before-green, empty output read as a pass,
and the `go` line gating which API is legal. A `go.mod` edit never pays for
`go-quality`, and a `*.go` edit never pays for this set.

`bazel-quality` carries the Go depth file for a repository that builds with
Bazel, and it loads on Bazel files, never on `go.mod`. Where this set governs the
publishing handoff for a non-Bazel release, that stays here.

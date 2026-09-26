---
paths:
  - "**/go.mod"
  - "**/go.sum"
  - "**/go.work"
  - "**/go.work.sum"
  - "**/.golangci.*"
  - "**/*golangci*.yml"
  - "**/*golangci*.yaml"
  - "**/.goreleaser.*"
  - "**/goreleaser*.yml"
  - "**/goreleaser*.yaml"
  - "**/.config/goreleaser.*"
  - "**/.ko.yaml"
  - "**/staticcheck.conf"
summary: The Go module and build-config index, with the gate, the non-negotiables, the GO-MOD rules, and where the lint-gate and release depth lives
keywords: go,golang,go.mod,go.sum,go.work,toolchain,godebug,replace,retract,depguard,govulncheck,golangci-lint,staticcheck,goreleaser,ko,cosign,setup-go,dependabot,release
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---

# Go Modules

Traps, not tutorials. Every line names a mistake an agent makes by default in a
`go.mod`, a lint config or a release config. Module semantics are already in the model.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Rules This File Owns](#rules-this-file-owns) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) ·
[Siblings](#siblings)

Installed with the 13 globs in the frontmatter: module files, golangci-lint,
goreleaser, ko and staticcheck configs, plus any workflow named `*golangci*.yml`
on purpose. A `*.go` file, a Makefile or another workflow never loads it, and
the `go-quality` index routes those. Binds to Go 1.27.1,
golangci-lint v2.14.0, staticcheck 2026.2.1, govulncheck v1.8.0 and goreleaser
2.17.1 (measured 2026-09-26). "The SDK" is a stdlib-only library that wraps the
project's CLI, a pinned default the adopter renames or drops.

**Read the `go` line before any rule below** (`go list -m -f '{{.GoVersion}}'`).
It is a hard minimum since go 1.21, it sets the main module's `GODEBUG` defaults,
and it decides which deprecations apply (GO-CORE-04, owned by `go-quality`).

## The Gate

Run it from every `go.mod` root that `roots` prints, narrowest first. Each step
fails on its exit code, never on its stdout.

```sh
go mod tidy -diff              # GO-MOD-03: exit 1 with a diff means go.mod or go.sum is stale
go build ./...                 # readonly by default: GO-MOD-02 redundant toolchain, GO-MOD-04 removed godebug
go vet ./...                   # GO-MOD-01: stdversion names an API newer than the go line
golangci-lint config verify    # GO-GATE-09: exit 3 on a v1 file, then GO-GATE-22's superset check
golangci-lint run ./...        # GO-MOD-08: depguard superseded, under the one copied file
govulncheck ./...              # GO-MOD-12: text format only, exit 3 on a finding
```

These are the manifest-facing checks. `go mod tidy -diff`, `go build`, `go vet`, `golangci-lint run` and `govulncheck` are GO-GATE-01 steps 7, 5, 2, 3 and 8, and CI runs them in GO-GATE-01's order. `config verify` is GO-GATE-09's config-change check, not a gate step. GO-GATE-01's full ordered block (format, `go fix`,
test, `-race`, generate, the iterator step) lives in `gates.md`. Chain
that full block into one `check` target that runs it in every root and stops at
the first non-zero exit. CI invokes that target, never a hand-copied step list.
The named checks the rule cells cite:

```sh
# roots (GO-MOD-06): one line per module root. More than one line makes a single root-level ./... run the finding.
find . -name go.mod -not -path '*/vendor/*' -not -path '*/testdata/*' -print0 | xargs -r -0 -n1 dirname

# floor-check (GO-MOD-01, library or SDK): exit 1 is the finding, exit 0 the pass.
v=$(go list -m -f '{{.GoVersion}}') && test -n "$v" && test "$(printf '%s\n1.26.0\n' "$v" | sort -V | tail -n1)" = 1.26.0

# sdk-deps (GO-MOD-10): prints each non-stdlib runtime module and exits 1. Exit 0 is the pass.
out=$(go list -deps -f '{{with .Module}}{{if not .Main}}{{.Path}}{{end}}{{end}}' ./... | sort -u); echo "$out"; test -z "$out"
```

A task is done when a command, its exit code, and the root it ran in are all named.

## Non-Negotiables

Every line below blocks a merge. IDs resolve through [Where the Depth Is](#where-the-depth-is).

| # | Rule | ID |
|---|---|---|
| 1 | Never reach green by weakening the check (a dropped gate step, a linter or setting removed from the copied golangci file, a bare `//nolint`, `-mod=mod`, `-buildvcs=false`), and never trust a verification nobody watched go red. | GO-CORE-01, GO-CORE-02 |
| 2 | A library or the SDK declares `go 1.26.0` or lower, never the patch line `go mod init` writes. A CLI declares `go 1.27.0`. | GO-MOD-01 |
| 3 | No `toolchain` line in a library or the SDK. A CLI has exactly one, the latest patch, written by `go get toolchain@go1.27.N`. | GO-MOD-02 |
| 4 | `go.sum` is committed, CI gates on `go mod tidy -diff`, and nothing sets `-mod=mod`. | GO-MOD-03 |
| 5 | Every gate step runs from every `go.mod` root, test-helper and tools modules included, and gates on the exit code. | GO-MOD-06, GO-GATE-01 |
| 6 | A library has no `replace`. A multi-module repository replaces with local paths only. A CVE is fixed by upgrading, never by `replace`. | GO-MOD-07 |
| 7 | `go.work` is committed only in a multi-module repository, and each member also builds and tests with `GOWORK=off`. | GO-MOD-05 |
| 8 | Never add a module the depguard `superseded` list denies, and never shorten the list. | GO-MOD-08 |
| 9 | The SDK's runtime import graph is stdlib-only, and the SDK carries no `tool` directive (in a library it is SHOULD, GO-MOD-11). | GO-MOD-10, GO-MOD-11 |
| 10 | `govulncheck ./...` in text format blocks CI. A finding with a call trace blocks the release until an upgrade. | GO-MOD-12 |
| 11 | CI builds a release with the latest patch: `go-version-file` over the CLI's `toolchain` line, `[oldstable, stable]` for libraries, `GOTOOLCHAIN=local`. | GO-MOD-16 |
| 12 | A v2+ module carries `/vN` in its `module` line and self-imports. A bad tag is retracted inside a higher tag, never deleted or re-tagged. | GO-MOD-14, GO-MOD-15 |
| 13 | Copy exactly one of the three shipped golangci-lint files, whole, to each module's `.golangci.yml`, in the v2 schema, with neither `common-false-positives` nor the error-handling preset, and `config verify` exiting 0. | GO-GATE-22, GO-GATE-09 |
| 14 | golangci-lint is pinned to an exact v2 release, and a repository runs one staticcheck entry point, never a `staticcheck.conf` beside golangci's bundled copy. | GO-GATE-08, GO-GATE-17 |
| 15 | Release binaries build with `-trimpath`, commit-derived `-X` values and an explicit `CGO_ENABLED=0`, and stamp no clock value. | GO-REL-01, GO-REL-02 |
| 16 | A release artifact shows a 40-hex `vcs.revision` and no `+dirty` on `go version -m`, and never comes from `-buildvcs=false` or from inside a nested repository. | GO-REL-03 |
| 17 | Every goreleaser config starts `version: 2`, checked by grep, and every workflow `uses:` is pinned to a 40-hex SHA with a `# vX.Y.Z` trailer. | GO-REL-07, GO-REL-12 |

## Rules This File Owns

The GO-MOD family is defined here and nowhere else. Run each verification from the module root, except the `.github` greps in GO-MOD-03 and GO-MOD-16 to 18, which run from the repository root.

### Caught by the go command, go list or grep over `go.mod`

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-MOD-01 | **pinned**: declare the `go` line by code kind. A library or the SDK uses the oldest supported release's `.0` (`go 1.26.0` today) or lower, never a patch floor. A CLI uses `go 1.27.0`. Run `go vet ./...` before lowering a floor. | `go mod init` on 1.27.1 writes `go 1.27.1`, which forces every consumer onto that patch. A floor below the APIs used breaks consumers on the older release. | `floor-check` (exit 1 is the finding). `go vet ./...` (`stdversion`), and `go test ./...` from go 1.27: a non-zero exit is the finding. | MUST |
| GO-MOD-02 | Never write a `toolchain` line in a library or the SDK. A CLI has exactly one, `toolchain go1.27.N` with N the latest patch and above the `go` line, bumped with `go get toolchain@go1.27.N`, never by hand. | The line only acts in the main module, so in a library it goes stale. A hand-added line equal to the `go` line fails every readonly build with `updates to go.mod needed`. | `grep -n '^toolchain' go.mod`: any output in a library or the SDK is the finding. `go mod tidy -diff` exits 1 on a redundant line. | MUST |
| GO-MOD-03 | Commit `go.sum`. Gate CI on `go mod tidy -diff`. Leave `-mod=readonly` as the build default, and never set `-mod=mod` or `GOFLAGS=-mod=mod`. | `-mod=mod` quietly repairs a stale `go.mod` in CI, so drift never fails a build. `-diff` fails without mutating the tree (go 1.23). | `go mod tidy -diff`: exit 0 with empty output is the pass. `grep -rn -e '-mod=mod' .github`: empty output is the pass, and exit 2 means point it at your CI config directory. | MUST |
| GO-MOD-04 | A `godebug` line names only a setting that still exists. A setting the toolchain removed is set to its final value or deleted. Pin runtime compatibility with `godebug` in `go.mod`, never with `GODEBUG=` in a Dockerfile or CI env. | From go 1.27 a removed setting at its old value fails the load of `go.mod`. The same setting as an env var is silently inert. | `go build ./...`: a `removed GODEBUG` error is the finding. | MUST |
| GO-MOD-05 | Commit `go.work` only in a multi-module repository, never with a single module, the SDK or a CLI. There, CI also builds and tests each member with `GOWORK=off`, and a member that reaches a sibling only through `use` gets a local `replace` or a published version. Commit `go.work.sum` when the go command writes it. | A `use`-only sibling builds in the workspace and breaks for every consumer. go.dev says CI should not rely on `go.work`. | In each root `roots` prints: `GOWORK=off go build ./... && GOWORK=off go test ./...`, where exit 1 is the finding. `find . -name go.work -not -path '*/vendor/*' -print` printing a path while `roots` prints one line is the finding. | MUST |
| GO-MOD-06 | Run every repository-wide gate (vet, golangci-lint, test, govulncheck, tidy) once per `go.mod` root, never once as `./...` at the repository root. | A nested module is invisible to the parent's `./...`, so the gate exits 0 while skipping it. | `roots`: more than one line with a single root-level invocation in CI is the finding. | MUST |
| GO-MOD-07 | A library or the SDK has no `replace`. A multi-module repository replaces with local paths (`./`, `../`) only. Never answer a bug or a CVE with `replace X => fork`: upgrade, or fork under a new module path and change the imports. | `replace` applies only in the main module, so every consumer silently builds the real dependency. | Library: `grep -n '=>' go.mod`, any output is the finding. Multi-module: `grep -nE '=>[[:space:]]*[^./[:space:]]' go.mod`, any output is a non-local swap. | MUST |
| GO-MOD-10 | The SDK's runtime import graph holds only the stdlib and the SDK's own module. Test-only dependencies (go-cmp and goleak) are allowed. | Go has no declarative zero-dependency flag, so the graph has to be walked. Without `-test`, `go list -deps` excludes `_test.go` imports. | `sdk-deps`: any printed module is the finding. | MUST (SDK) |
| GO-MOD-11 | The SDK and libraries carry no `tool` directive, and pin dev tools in the workflow (`go run pkg@vX.Y.Z` or a pinned download). A CLI may use `tool` (go 1.24). | A `tool` line is an ordinary `require` to MVS, so its whole tree lands in every consumer's build list and govulncheck surface. | `grep -n -e '^tool[[:space:](]' go.mod`: any output in a library or the SDK is the finding. | MUST (SDK) · SHOULD (library) |

### Caught by golangci-lint or govulncheck

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-MOD-08 | Keep one depguard rule, `superseded`, on `files: ["$all"]`, denying 13 packages each with a `desc` naming its replacement: `github.com/pkg/errors`, `golang.org/x/xerrors`, `io/ioutil`, `golang.org/x/exp/slices`, `golang.org/x/exp/maps`, `golang.org/x/exp/constraints`, `github.com/golang/mock`, `gopkg.in/yaml.v2`, `gopkg.in/yaml.v3`, `github.com/ghodss/yaml`, `github.com/satori/go.uuid`, `github.com/hashicorp/go-multierror`, `go.uber.org/automaxprocs`. Deny those three `x/exp` packages, never all of `x/exp`. The YAML is quoted verbatim in the three shipped files. | Models trained before 2021 reach for these first, and depguard has no default deny list, so the list is the whole gate. | `golangci-lint run ./...`: `is not allowed from list 'superseded'` with exit 1 is the finding. | MUST |
| GO-MOD-09 | Apply a deprecation keyed on the `go` line only above its floor. Replace `github.com/google/uuid` with stdlib `uuid` at go 1.27 or higher, and only for `New`, `NewV4`, `NewV7`, `Parse`, `MustParse`, `String` and `Compare`. Keep it for `NewV6`, `NewMD5`, `NewSHA1` and the DCE family. Remove `go.uber.org/automaxprocs` only at go 1.25 or higher, and never import it in a library. | The stdlib `uuid` surface is narrower, and an agent that swaps blindly invents `uuid.NewSHA1`. depguard cannot see the `go` line. | Reading heuristic: read the `go` line first. `go build ./...` fails at once on an invented stdlib symbol. | SHOULD |
| GO-MOD-12 | Run `govulncheck ./...` (symbol scan, text format) as a blocking step in every root. A finding with a call trace blocks the release and is fixed by upgrading to its `Fixed in:` version. A finding with no trace is scheduled for the next bump. A job that emits JSON or SARIF adds its own content check. | Only 3 of 22 exemplar findings were reachable. JSON and SARIF always exit 0, so a job switched to them never fails. | `govulncheck ./...`: exit 3 is a finding, and `Example traces found:` marks it reachable. | MUST |
| GO-MOD-13 | Audit the exact release artifact with `govulncheck -mode=binary` before signing, as a second gate after source mode, and as the only gate for mirrored upstream binaries. Expect over-reporting on `-s -w` builds. | Stripping drops the symbol table reachability needs: 4 findings stripped against 1 unstripped on one module. | `govulncheck -mode=binary dist/example-bin` (rename): exit 3 is a finding. | SHOULD |

### Release-time and CI reading heuristics

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-MOD-14 | When a module's first v2+ tag ships, move its `module` line and every self-import to `/vN` in the same change. Never commit `+incompatible`. Tag a nested module `dir/vX.Y.Z`, laid out as GO-REL-14 says so that it stamps. | Without the suffix a v2 tag is unreachable by its path or resolves as `+incompatible`. | Reading heuristic, because tag history is not in the checkout: `grep -n '^module ' go.mod` against the highest release tag's major. | MUST |
| GO-MOD-15 | Fix a bad published tag with `retract vX.Y.Z // reason` (or `retract [lo, hi]`) inside a new, higher tag. Never delete, force-push or re-tag a version. | A retraction acts only once a higher version carries it. A deleted tag stays in the proxy and the checksum database. | After the new tag: `go list -m -retracted -f '{{.Version}} {{.Retracted}}' example.com/mod@v1.0.1` (rename). An empty `[]` is the finding. | MUST |
| GO-MOD-16 | Library and SDK test jobs use `go-version: [oldstable, stable]`, and the `oldstable` leg's `go build ./...` is GO-LANG-04's durable floor check. CLI jobs use `go-version-file: go.mod` over GO-MOD-02's `toolchain` line. Never point `go-version-file` at a bare `go 1.N.0` for a release build, never write `go-version: '1.N'` without `check-latest: true`, and set `GOTOOLCHAIN=local` on build jobs. | `go-version-file` on a bare `go 1.27.0` installs exactly 1.27.0, and stdlib CVEs are fixed only in point releases. `check-latest` cannot move an exact patch (setup-go v6, read 2026-09-26). | Reading heuristic, since setup-go resolution cannot run locally: `grep -rn -A3 -e 'actions/setup-go' .github/workflows`, then read each hit for the three forbidden shapes. | MUST |
| GO-MOD-17 | Every Go repository has a grouped `package-ecosystem: "gomod"` Dependabot block (or a Renovate `gomod` manager), and a human reviews each bump. Passing CI is not review. | Configs that cover only `github-actions` leave every module bump unreviewed and unopened. | `grep -n -e 'gomod' .github/dependabot.yml`: empty output or exit 2 is the finding. | SHOULD |
| GO-MOD-18 | A job that fetches private modules sets `GOPRIVATE` (which implies `GONOPROXY` and `GONOSUMDB`) and never sets `GOAUTH=off`. | Without `GOPRIVATE`, private paths go to the public proxy and checksum database. | `grep -rn -e 'GOPRIVATE' -e 'GOAUTH' .github/workflows`, read against each private fetch. | CONSIDER |

## Where the Depth Is

Read the file for the work you are about to do. One level deep, and the depth files do not point at each other.

| Doing… | Read |
|---|---|
| Writing or changing a CI gate step, a `.golangci.yml` or `staticcheck.conf`, the `go vet`, `go fix`, `-race`, generate or govulncheck step, or adding, removing or silencing a linter | [go-modules/gates.md](go-modules/gates.md) |
| Building a release binary, stamping a version or writing `--version`, writing a goreleaser or ko config, signing or attesting release assets, pinning workflow actions, or tagging a module version | [go-modules/release.md](go-modules/release.md) |
| Editing any `*.go` file, or the `ENV` lines of a `Dockerfile` that runs Go | `go-quality` (sibling set, below) |
| Bumping the Go toolchain, golangci-lint or a dependency, or re-probing the dated snapshots above | the `go-upgrade` skill |
| Cutting a release end to end (GO-MOD-13 to 15, GO-REL) | the `go-release` skill |
| Reading a shipped binary's `go version -m`, a `GODEBUG` surprise or a runtime regression | the `go-diagnose` skill |
| Writing a `go_*` Bazel target, running Gazelle, repinning `go_deps` or wiring `nogo` | `bazel-quality` (sibling set, below) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the
commit body. CONSIDER = Suggest: never blocks, never re-raised after a decline.

Rules marked **pinned**, and these defaults, encode an agreed decision rather than
a derivable fact: libraries and the SDK at `go 1.26.0` and CLIs at `go 1.27.0`
plus a `toolchain` line bumped within a week of each point release, golangci-lint
v2.14.0 moved only through `go-upgrade`, the three shipped golangci-lint files,
the SDK stdlib-only at runtime with go-cmp and goleak for tests, raw release
binaries signed keyless in CI, Windows as a first-class CI leg, no vendoring,
and no private modules (GO-MOD-18 turns MUST the day one exists). Each is a
default the adopter may override once, in the module or the shared config, never
per call site. Overriding one is a recorded decision, and re-arguing one in a
pull request is not a review comment.

## Siblings

- **`go-quality`** loads on `**/*.go`. It owns GO-CORE-01..05 (weakened checks,
  red-before-green, empty output, the `go` line, generated code), quotes the
  GO-GATE-01 block, and holds the source-level families this file only cites
  (GO-LANG-04, the `go` line gating the API). A `go.mod` edit never pays for it,
  and a `*.go` edit never pays for this file.
- **`bazel-quality`** carries BZL-GO in its `go.md` for a repository that adopts
  Bazel for Go. It loads on Bazel files, never on `go.mod`.
- **`go-upgrade`, `go-release` and `go-diagnose`** are the procedures behind this
  set. They cite GO-MOD, GO-GATE and GO-REL IDs and never restate them.

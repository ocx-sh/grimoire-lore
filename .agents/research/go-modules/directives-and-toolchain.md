---
title: "go.mod directives and toolchain policy — libraries, SDK, CLIs, CI"
topic: "go, toolchain, godebug, go.work and /vN — the directive policy"
agent: go-modules/directives-and-toolchain
model: sonnet
date_researched: 2026-09-26
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/directives-and-toolchain/
scope: >
  Decides the go.mod `go`/`toolchain` line policy for libraries, the OCX SDK
  and CLIs; when `toolchain` is warranted; the `actions/setup-go` recipe;
  `go.work` commit policy; `/vN` and nested-module tagging; `godebug` and
  `ignore` usage. Does NOT cover the `tool` directive (M-L-04, a sibling
  dive), `replace`/`retract` mechanics beyond what bears on toolchain policy,
  golangci-lint/staticcheck config shape (GO-GATE), or release signing
  (GO-REL) — cited, not re-derived.
---

# go.mod directives and toolchain policy

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

- The `go` line has been a **mandatory minimum toolchain requirement since Go 1.21**, not advisory: a toolchain older than the declared line refuses to load the module ([go.dev/ref/mod](https://go.dev/ref/mod), [go.dev/doc/toolchain](https://go.dev/doc/toolchain)) — watched directly: [Verification run 1](#verification-runs).
- **Libraries and the SDK declare the lowest `go` version their code actually needs; CLIs and applications declare the release they build and test with.** Measured: `google/go-cmp@b133f1f1932e:go.mod:3` (`go 1.21`, zero deps) and `stretchr/testify@87a7b9d57689:go.mod` (`go 1.17`) are floors, not CI-tested versions; `cli/cli@9b031151a825:go.mod:3` (`go 1.27.0`) and `etcd-io/etcd@7583cc6e7e27:go.mod:3` (`go 1.27`) track what they build with.
- **`toolchain` is a minority practice (5/35 root modules, 14%), not the default** — the 90% majority relies on `GOTOOLCHAIN=auto` fetching whatever the `go` line demands ([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)). Add one only when CI does not already pin the exact patch some other way (a literal `go-version:`, a container tag, `mise`/`asdf`).
- **`GOTOOLCHAIN=local` refuses a `go` line above the installed toolchain outright**; it never fetches. `GOTOOLCHAIN=auto` (the default) fetches the synthetic `golang.org/toolchain` module and fails only if the network/proxy can't supply that exact version — both behaviors were watched directly ([Verification run 2](#verification-runs)).
- **`go mod init` no longer writes `go 1.(N-1).0`.** Go 1.26.0 introduced that default; it was reverted in **Go 1.26.1** after community pushback ([golang/go#77653](https://github.com/golang/go/issues/77653), backported per [golang/go#77860](https://github.com/golang/go/issues/77860)). On the installed **Go 1.27.1**, `go mod init` writes the **current** toolchain version verbatim (measured: `go 1.27.1`, not `go 1.26.0`) — the topic map's M-L-03 premise, sourced from the go1.26 release notes alone, is stale as of this program's toolchain. See [Contested](#contested--evolving).
- **`go.work` is committed only in a real multi-module repository whose modules CI builds together, with `go.work.sum`, and never in a single-module repo.** 4/35 root repos commit one (bazel-gazelle, etcd, kubernetes, prometheus), all multi-module, 3/4 with `go.work.sum` (prometheus is the exception) ([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)).
- **`GOWORK=off` on a multi-module repo without a matching `replace` breaks the build** — a module that depends on a workspace sibling only through `use` (no `replace`, no published version) cannot resolve that sibling once the workspace is disabled, because `go.sum`-based module-mode resolution has no local path to fall back to. Watched directly: [Verification run 6](#verification-runs). This is why CI in a `go.work` repo must build through the workspace (or via each nested module's own `go.mod`+`go.sum`), never `GOWORK=off` against the whole tree.
- **A `/vN` module-path suffix is required starting at major version 2**, never at v0/v1 (`gopkg.in/*` is the sole exception, suffixed even at v0/v1) ([go.dev/ref/mod](https://go.dev/ref/mod)). 11/35 exemplars are suffixed; `google/go-github` is at `/v92` (a per-breaking-release cadence), `grpc/grpc-go` stays unsuffixed at v1.8x by design (never made a breaking major bump) ([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)).
- **`+incompatible` marks a pre-modules v2+ tag, never a real Go-module major-version bump** — it is a build-time annotation the `go` command adds, and a tag must never carry the literal suffix itself ([go.dev/ref/mod](https://go.dev/ref/mod)).
- **A nested module (its own `go.mod` below the repo root) is invisible to `go list ./...`/`go build ./...` run from the parent** — the parent module simply does not contain it. Watched directly: [Verification run 7](#verification-runs). A repo-root lint/build/coverage command that assumes one module silently skips every nested one; the fleet's `check-artifacts.py`-style tooling and any CI matrix must enumerate `go.mod` files, not glob `./...` from the root.
- **`godebug` (Go 1.23+) is a `go.mod` directive, not a `GODEBUG=` env override** — it changes the *compiled-in* default for every main package built from that module, is rejected at `go mod`/build time if the key doesn't exist, and (Go 1.27+) is rejected if it names a **removed** setting at anything but its final default value ([go.dev/doc/godebug](https://go.dev/doc/godebug), [go.dev/doc/go1.27](https://go.dev/doc/go1.27)). Watched directly: [Verification run 5](#verification-runs).
- Measured `godebug` usage: 3/35 root modules (`hashicorp/terraform`, `kubernetes/kubernetes`, `restic/restic`), all setting `winsymlink=0` or `default=go1.27` — no exemplar sets a since-removed key, so no exemplar is caught by the 1.27 rejection ([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)).
- `ignore` (Go 1.25+) has exactly one real-world sighting in the corpus: `golangci/golangci-lint@032d962e0399:go.mod:8-10`, excluding non-Go asset trees (`./assets ./build ./docs`) from package-pattern matching — adopt it only when `go build ./...`/`go vet ./...` otherwise walks large non-Go trees.
- **`actions/setup-go`'s `go-version-file` reads the `toolchain` directive if present, else the `go` directive** ([actions/setup-go README, "Breaking changes in V6"](https://github.com/actions/setup-go)) — so a CI-declared toolchain and a `go-version-file` input are consistent by construction; a literal `go-version:` input is not. Measured: only 6/32 workflowed repos use `go-version-file`, 27/32 hardcode a literal `go-version:` — the literal is the corpus majority but the one that drifts silently from `go.mod` ([exemplar-quality-gates.md §3](../go-audit/exemplar-quality-gates.md)).
- **`check-latest: true` re-checks for a newer patch even when the cached version already satisfies the version input**, at a real setup-time cost; it matters for `net/http` and TLS CVEs fixed only in point releases and is worth paying for a security-sensitive CLI/release build, not for every PR lint job ([actions/setup-go docs/advanced-usage.md](https://github.com/actions/setup-go)).
- `t.Context()`/synctest/`stdversion` are gated by the module's `go` line, so a floor decision is not cosmetic: declaring `go 1.24` when the code actually needs a 1.26 stdlib symbol is caught by `go vet`'s `stdversion` analyzer, and by `go test` itself since Go 1.27 (`go test` now runs `stdversion` by default) — watched directly, both under `go vet` and under `go test`: [Verification run 4](#verification-runs).

## Findings

### 1. The `go` line is a hard floor, and its meaning changed materially in Go 1.21

Before Go 1.21 the `go` directive was advisory; the spec now states it plainly:
"[b]efore Go 1.21, the directive was advisory only; now it is a mandatory
requirement: Go toolchains refuse to use modules declaring newer Go
versions" ([go.dev/ref/mod §go directive](https://go.dev/ref/mod)). The line
also does three other things a reviewer must know: it caps which language
features compile ("the compiler rejects use of language features introduced
after the version specified by the `go` directive"), it must be
`>=` every dependency's own `go` line, and it sets the compiled-in `GODEBUG`
default set ([go.dev/doc/godebug](https://go.dev/doc/godebug)). Watched:
declaring `go 1.28` (a version this program's Go 1.27.1 toolchain cannot
satisfy) makes `GOTOOLCHAIN=local go build ./...` refuse with `go.mod
requires go >= 1.28 (running go 1.27.1; GOTOOLCHAIN=local)`, exit 1
([Verification run 1](#verification-runs)).

### 2. Library floor vs application floor is a real split, not a style choice

`google/go-cmp@b133f1f1932e:go.mod:3` declares `go 1.21` with zero
dependencies — a deliberate compatibility promise for a near-zero-churn
library, not a stale artifact
([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)).
`stretchr/testify@87a7b9d57689:go.mod` similarly sits at `go 1.17`. Contrast
`cli/cli@9b031151a825:go.mod:3` (`go 1.27.0`, `toolchain go1.27.1`) and
`etcd-io/etcd@7583cc6e7e27:go.mod:3` (`go 1.27`, `toolchain go1.27.1`) —
both applications that declare what they are built and tested with, not a
floor. Across all 35 root modules: 17/35 (49%) sit on 1.26, 6/35 on 1.27,
5/35 on 1.25 — 28/35 (80%) are on 1.25+
([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)).
The **owner's Q1 default** (a fleet library/SDK floors at the oldest
supported release — today `go 1.26.0` or lower if the code needs less; a
CLI declares the current release, `go 1.27.0`) matches this measured split
and the corpus's own two outliers.

### 3. `toolchain` is a minority pin, and what it actually does

The `toolchain` directive is 14% of root modules (5/35:
`bazel-contrib/rules_go@970e99d77c8b:go.mod` — `toolchain go1.26.7`,
`cli/cli@9b031151a825:go.mod:5` — `toolchain go1.27.1`,
`etcd-io/etcd@7583cc6e7e27:go.mod:5` — `toolchain go1.27.1`,
`google/go-containerregistry@0c8bedb78437:go.mod` — `toolchain go1.26.6`,
`restic/restic@5127c4abf921:go.mod:5` — `toolchain go1.25.10`); the
`toolchain` version can never be lower than the `go` line
([go.dev/ref/mod](https://go.dev/ref/mod): "the suggested Go toolchain's
version cannot be less than the required Go version declared in the `go`
directive"). Its effect is scoped: "the `toolchain` directive only has an
effect when the module is the main module and the default toolchain's
version is less than the suggested toolchain's version" — i.e. it is a
floor-raise for whoever builds this module *as the main module*, and it is
silently ignored when the module is someone else's dependency. `go get` and
`go work sync` write it automatically "for reproducibility ... any time
[the go command] is updating the `go` version" — an agent should never
hand-add a `toolchain` line speculatively; it is the tool's own write,
not a manual pin.

### 4. `GOTOOLCHAIN`: `local` refuses, `auto` fetches (and can fail offline)

`GOTOOLCHAIN` resolves as `local < user default (go env -w) < $GOROOT/go.env
default (auto)` ([go.dev/doc/toolchain](https://go.dev/doc/toolchain)). This
program's `run.sh` pins `GOTOOLCHAIN=local` — the correct posture for a
measurement/build environment that must never silently reach the network for
a newer toolchain. Watched both branches on a `go 1.28` module: `local`
refuses immediately (`GOTOOLCHAIN=local`, no network attempt), `auto` prints
`go: downloading go1.28.0 (linux/amd64)` then fails offline with `toolchain
not available` ([Verification run 2](#verification-runs)) — the same shape
a CI runner without network egress to `proxy.golang.org` would hit. A fleet
CI job that leaves `GOTOOLCHAIN=auto` (the default) and lets a dependency's
`go` line silently exceed the pinned `setup-go` version is exposed to
exactly this failure mode, non-deterministically, whenever a transitive
`go.mod` is bumped upstream.

### 5. `go mod init`'s written `go` line moved twice in one year, and the corpus predates both moves

Go 1.26 (Feb 2026) changed `go mod init` to write `go 1.(N-1).0` (or
`1.(N-2).0` from a pre-release toolchain) — "[t]his is intended to
[encourage] creating modules compatible with currently supported Go
versions" ([go.dev/doc/go1.26](https://go.dev/doc/go1.26), confirmed via
direct fetch: `go mod init now defaults to a lower go version in new go.mod
files ... Go 1.26 and its minor releases will create go.mod files with go
1.25.0`). That default was reverted after developer pushback — "[d]evelopers
using a Go 1.N toolchain naturally expect new modules to target Go 1.N" —
accepted for the Go 1.27 milestone in
[golang/go#77653](https://github.com/golang/go/issues/77653) and
backported to **1.26.1** per
[golang/go#77860](https://github.com/golang/go/issues/77860). Measured
directly on the installed **Go 1.27.1**: `go mod init example.com/x` writes
`go 1.27.1` — the *current* toolchain version, matching the pre-1.26 and
post-1.26.1 behavior, not the brief-cited N-1 rule
([Verification run 3](#verification-runs)). **This overturns the topic
map's M-L-03 framing** ("should a fleet repo keep the `go 1.(N-1).0` line
that `go mod init` writes on 1.26+"): on every toolchain this program's
fleet will actually run (1.26.1+, 1.27.x), `go mod init` already writes the
current version, so there is nothing to "keep" or downgrade — the only
remaining decision is the library-vs-application floor from Finding 2,
applied by hand after `init`, exactly as before Go 1.26 existed.

### 6. `go.work`: workspace-mode building vs `GOWORK=off`, and why the two diverge

`go.work`'s `use` directive adds a module *on disk* to the workspace; it "does
not add modules contained in subdirectories of its argument directory"
(each nested module needs its own `use` line)
([go.dev/ref/mod](https://go.dev/ref/mod)). In workspace mode, a `require`
inside one workspace member for another workspace member resolves through
`use`, with no `replace` and no real `go.sum` entry needed for that
dependency. That resolution is workspace-only: it evaporates under
`GOWORK=off`. Planted and watched: a two-module fixture where `modA`
`require`s `modB v0.0.0` with no `replace` builds cleanly as
`go build ./modA/... ./modB/...` from the workspace root, and fails under
`GOWORK=off` from inside `modA` with `missing go.sum entry for module
providing package example.com/modB` — `go mod tidy` under `GOWORK=off`
cannot even repair it, because `example.com/modB` is not a real, fetchable
module path ([Verification run 6](#verification-runs)). The corpus's four
`go.work`-committing repos (bazel-gazelle, etcd, kubernetes, prometheus) are
all genuine multi-module monorepos whose CI must and does build through the
workspace or per-nested-module, never the whole tree with `GOWORK=off`
([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)).
A single-module repo with a stray `go.work` shows **no functional
difference** either way (watched: `go vet` is exit 0 with the workspace and
under `GOWORK=off` — [Verification run 6b](#verification-runs)) — it is
dead weight, not a bug, which matches conflict 21's "never in a
single-module repo" as a cleanliness rule rather than a correctness one.

### 7. Nested modules are invisible to a root-level `./...` pattern

A `go.mod` below the repo root creates a second, independent module; the
parent module's `./...` pattern does not descend into it. Planted and
watched: `go list ./...` from a repo root with `main.go` at the root and a
`sub/go.mod` + `sub/sub.go` prints only the root package —
`example.com/nestedroot`, never `example.com/nestedroot/sub` — while `go
list ./...` run *inside* `sub/` prints `example.com/nestedroot/sub`
correctly ([Verification run 7](#verification-runs)). This is exactly what
[exemplar-code-shape.md §1](../go-audit/exemplar-code-shape.md) means by "the
root-only proxy undercounts nested modules" for kubernetes's ~34
`staging/src/k8s.io/*` submodules and etcd's, terraform's and trivy's
nested trees. Any fleet lint/coverage/vuln-scan wrapper that runs one
`go vet ./...`/`golangci-lint run ./...`/`govulncheck ./...` at the repo
root and calls that "the whole repo" is silently skipping every nested
module; it must enumerate `go.mod` files first
(`find . -name 'go.mod' -not -path '*/vendor/*'`) and run the gate once per
module root.

### 8. `/vN`, `+incompatible`, and nested-module tags

Starting at major version 2, "module paths must have a major version suffix
like `/v2` that matches the major version" — never at v0 or v1, because "for
most modules, `v1` is backwards compatible with the last `v0` version"
([go.dev/ref/mod](https://go.dev/ref/mod)). `gopkg.in/*` paths are the one
exception, suffixed (with a leading dot) at every major including v0/v1.
Measured: 11/35 root modules carry a suffix — `caddyserver/caddy` (`/v2`),
`cli/cli` (`/v2`), `containerd/containerd` (`/v2`), `etcd-io/etcd` (`/v3`),
`golangci/golangci-lint` (`/v2`), `google/go-github` (`/v92` — go-github
bumps on every breaking API change), `goreleaser/goreleaser` (`/v2`),
`oras-project/oras-go` (`/v3`), `sigstore/cosign` (`/v3`), `urfave/cli`
(`/v3`); `charmbracelet/bubbletea` bundles its `/v2` bump with a full domain
migration (`charm.land/bubbletea/v2`, not `github.com/...`)
([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)).
`grpc/grpc-go` stays at an unsuffixed v1.8x path by explicit design — it has
never made a breaking major bump, so no suffix is owed. `+incompatible`
marks a pre-modules tag at v2+: "[t]he special suffix `+incompatible`
denotes a version released before migrating to modules" and, critically,
"should not appear on a tag in a repository; a tag like
`v4.1.2+incompatible` will be ignored — the suffix only appears in versions
used by the `go` command" ([go.dev/ref/mod](https://go.dev/ref/mod)). For a
nested module inside a monorepo the release-workflow doc's tagging
convention is `<module-dir>/vX.Y.Z` (e.g. `staging/src/k8s.io/api/v0.31.0`
style paths in the k8s pattern); the corpus's own [Verification run
7](#verification-runs) is why this matters mechanically: whatever tags a
nested module, the release tooling and any `go list ./...`-based version
sniffing must be pointed at that nested directory, not the repo root.

### 9. `godebug` and `ignore`: real syntax, real rejection

`godebug` (Go 1.23+) inside `go.mod`/`go.work` is syntactically "`godebug
key=value`" or a parenthesized block, is equivalent to "every main package
being compiled contain[ing] a source file that listed `//go:debug
key=value`", and "[i]t is an error for the main module to name a GODEBUG key
that does not exist" ([go.dev/ref/mod](https://go.dev/ref/mod)). As of Go
1.27, the go command additionally "recognizes a GODEBUG setting for which
support was removed ... if it appears in go.mod files ... [and] accepts
these settings if they are set to the final default value established
before the setting was removed. If they are set to an old value, the go
command will fail" ([go.dev/doc/go1.27](https://go.dev/doc/go1.27)). Watched
directly on `asynctimerchan` (removed in 1.27, final value `0` — always
unbuffered): a `go 1.27` module with `godebug asynctimerchan=1` (the old,
pre-removal value) fails to even load — `go: error loading go.mod: go.mod:5:
removed GODEBUG "asynctimerchan" set to old value "1"
(https://go.dev/doc/godebug#go-127)` — while `godebug asynctimerchan=0`
builds cleanly ([Verification run 5](#verification-runs)). Measured usage:
3/35 root modules set `godebug` (`hashicorp/terraform`, `kubernetes/kubernetes`,
`restic/restic`, none naming a removed key)
([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)).
`ignore` (Go 1.25+) is "cause[s] the go command [to] ignore the
slash-separated directory paths ... when matching package patterns"
([go.dev/ref/mod](https://go.dev/ref/mod)); its one real user,
`golangci/golangci-lint@032d962e0399:go.mod:8-10`, keeps `go build ./...`
from walking its docs/assets/build trees.

### 10. `actions/setup-go`: `go-version-file` reads `toolchain` first, `go-version` beats both

The action's own README states the resolution order plainly: "[s]upports
both `go` and `toolchain` directives in `go.mod`. If the `toolchain`
directive is present, its version is used; otherwise, the action falls back
to the `go` directive" (as of setup-go v6+), and "if both `go-version` and
`go-version-file` are provided, `go-version` takes precedence." The
`go-version-file` input itself "accepts `go.mod`, `go.work`, `.go-version`,
or `.tool-versions`" (`docs/advanced-usage.md`). Measured in the corpus:
`go-version-file` in only 6/32 workflowed repos vs a literal `go-version:`
string in 27/32 ([exemplar-quality-gates.md §3](../go-audit/exemplar-quality-gates.md))
— the literal is the corpus majority, but it is the one form that can drift
from `go.mod` without either file changing, since nothing forces the two to
agree. `check-latest` (default `false`) "first checks if the cached version
is the latest one" and downloads if not — real setup-time cost, and
"ignored when `go-download-base-url` is set." 10/32 repos in the corpus set
it ([exemplar-quality-gates.md §3](../go-audit/exemplar-quality-gates.md)).

### 11. `M-K-04`: reading the `go` line first is a real gate step, not a suggestion

Because the `go` line changes loop-variable semantics (1.22), timer-channel
buffering (1.23, removed 1.27), `GODEBUG` defaults, and which stdlib symbols
compile at all, a reviewer or agent that skips it will misjudge every
version-gated rule in the rest of this rule set. `go list -m -f
'{{.GoVersion}}'` prints exactly this line (measured: `1.24` on the
`stdversion-violation` fixture, `1.26` on its compliant twin); `go vet
./...` (and, since Go 1.27, plain `go test ./...`) enforces it mechanically
via the `stdversion` analyzer, which fired identically under both commands
on the same fixture ([Verification run 4](#verification-runs)).

## Normative guidance candidates

1. **A library or SDK's `go` line is the lowest version its code and stdlib
   use actually require; an application or CLI's `go` line is the release
   it is built and tested with.** *Rationale:* a low library floor is a
   compatibility promise to consumers (Finding 2); a high application floor
   documents what CI actually exercises. *Verify:* `go list -m -f
   '{{.GoVersion}}'` compared against the CI matrix's `setup-go`/`go
   test` version, and `go vet ./...` (stdversion) under that declared line.
   *Run:* **yes** — [Verification run 4](#verification-runs) on the
   `stdversion-violation`/`stdversion-fixed` pair.

2. **Never hand-add a `toolchain` line speculatively; add one only when CI
   does not already pin the exact patch some other way.** *Rationale:* the
   directive is the tool's own write-for-reproducibility mechanism
   (Finding 3), and a stale manual `toolchain` line silently forces every
   consumer's `GOTOOLCHAIN=auto` build onto that exact patch even after a
   newer one ships. *Verify:* `find . -maxdepth 1 -name go.mod -print0 |
   xargs -r -0 grep -n '^toolchain '` (directory operand `.`, `xargs -r`);
   empty output means no directive — that is the pass for a library, and
   for an application it should name the CI-pinned patch or be absent.
   *Run:* **no**, reading heuristic only — the check reads a decision that
   depends on the repo's own CI config, not something a fixture can
   universally prove wrong.

3. **`GOTOOLCHAIN` in a build/CI environment should be `local` (never
   silently `auto`) whenever the environment cannot or should not reach the
   network for a toolchain fetch.** *Rationale:* `auto` fetches
   transparently and fails non-deterministically offline (Finding 4).
   *Verify:* `env GOTOOLCHAIN=local go build ./...` in the target
   environment; a refusal naming the exact required version is the
   expected, loud failure mode, not a silent hang. *Run:* **yes** —
   [Verification run 2](#verification-runs).

4. **Do not treat `go mod init`'s written `go` line as a lower-bound
   convention to preserve.** *Rationale:* the Go-1.26-only `N-1` default
   was reverted in 1.26.1 (Finding 5); on every toolchain this program
   targets, `go mod init` already writes the current version, so an agent
   "correcting" a freshly-initialized `go.mod` down to `N-1` is undoing a
   behavior that no longer exists. *Verify:* re-run `go mod init` on the
   installed toolchain and diff the written `go` line against its version
   string. *Run:* **yes** — [Verification run 3](#verification-runs).

5. **`go.work` is committed only in a genuine multi-module repository whose
   modules CI actually builds together, always with a matching
   `go.work.sum`, and CI never builds that tree with `GOWORK=off`.**
   *Rationale:* workspace-only resolution (a `use`-only sibling dependency
   with no `replace`) breaks completely under `GOWORK=off` (Finding 6).
   *Verify:* `find . -maxdepth 1 -name go.work -print0 | xargs -r -0 -I{} sh
   -c 'test -f "{}.sum" || echo "missing {}.sum"'` (Go's own convention names
   the sum file `<go.work path>.sum`, so no path-splitting is needed); empty
   output is the pass. Separately, in CI, confirm the
   build step never sets `GOWORK=off` for a repo that has a root `go.work`.
   *Run:* **yes** — [Verification run 6](#verification-runs) (workspace
   build succeeds; `GOWORK=off` build of the same tree fails on the
   `use`-only dependency).

6. **A repo-wide lint/vet/coverage/vulnerability command must enumerate
   every `go.mod`, not rely on one `./...` at the repo root.** *Rationale:*
   a nested module is invisible to the parent's package patterns
   (Finding 7); a single root-level gate run silently skips it. *Verify:*
   `find . -name go.mod -not -path '*/vendor/*' -not -path '*/testdata/*'
   -print0 | xargs -r -0 -n1 dirname`; the printed list is every module root
   the gate must run against — a gate script that runs its command exactly
   once per root-relative directory is compliant, and running it only at
   `.` when this list has more than one entry is the finding. *Run:*
   **yes** — [Verification run 7](#verification-runs).

7. **A module bumping to major version 2 or above must add the matching
   `/vN` path suffix to `module` and to every internal import of its own
   packages; `+incompatible` is never written by hand.** *Rationale:* the
   import-compatibility rule requires a distinct import path per
   incompatible major (Finding 8), and `+incompatible` is a `go`-command
   annotation on an old-style tag, not something a repository ever commits
   literally. *Verify:* `grep -n '^module ' ./go.mod` compared against the
   latest release tag's major version, and (for a mid-migration repo)
   `grep -rn -e '+incompatible' --include='go.mod' .` should find it only in
   a *dependency's* resolved version, never in the module's own `module`
   line. *Run:* **no**, reading heuristic only — tag/module-path consistency
   is a release-time fact, not something a toolchain run can falsify on a
   single checkout.

8. **A `godebug` line must name a setting that still exists, and, if the
   setting has been removed by the running toolchain, must be set to its
   final default value or removed entirely.** *Rationale:* Go 1.27+ rejects
   a stale value for a removed setting at `go.mod`-load time, before any
   code runs (Finding 9). *Verify:* `env GOTOOLCHAIN=local go build ./...`
   (or `go list -m all`) on the module — the go command performs this check
   itself; a failure naming `removed GODEBUG "<name>" set to old value` is
   the finding, empty/successful output is the pass. As a static
   pre-check without invoking the toolchain: `grep -n '^godebug ' ./go.mod`
   then cross-reference each key against the current
   [go.dev/doc/godebug](https://go.dev/doc/godebug) removed-settings table
   for the toolchain's version. *Run:* **yes** —
   [Verification run 5](#verification-runs).

9. **CI's `setup-go` step should read the version from the repository
   (`go-version-file: go.mod` or `go.work`), not hardcode a literal
   `go-version:` string, unless the two are kept in lockstep by another
   mechanism (e.g. a bump script that edits both).** *Rationale:**
   `go-version-file` already prefers `toolchain` over `go` (Finding 10), so
   it tracks whichever line the repo itself uses to pin; a literal string is
   a second source of truth that silently drifts. *Verify:* `grep -rn -e
   'go-version-file' -e 'go-version:' --include='*.yml' --include='*.yaml'
   .github/workflows`; a workflow with `go-version:` but no
   `go-version-file` and no comment tying it to `go.mod` is the finding —
   empty output on the `go-version:` half of the pattern is the pass. *Run:*
   **no**, reading heuristic only (this is a CI-config authoring
   convention, not something the toolchain itself enforces or refuses).

10. **A security-sensitive build (a tagged release, a signed binary) sets
    `check-latest: true` in `setup-go`; a routine PR lint/test job does
    not.** *Rationale:* stdlib CVEs land in point releases, and `go.dev`'s
    own toolchain-fetch mechanism (Finding 4) only fetches what a `go`/
    `toolchain` line demands — `check-latest` is the knob that asks "is
    there a newer patch of what I already have," at a real setup-time cost
    every job pays if it is set everywhere. *Verify:* `grep -rn
    'check-latest' --include='*.yml' --include='*.yaml'
    .github/workflows/release*.yml` — present is the pass for a release
    workflow; absent in a `release*.yml` is the finding. *Run:* **no**,
    reading heuristic only (a policy choice about which jobs pay the
    latency cost, not a behavior a fixture can go red/green on).

## Verification runs

Environment for every run below: `run.sh` = `/home/mherwig/.cache/research-lang/go-tools/run.sh`
(Go 1.27.1, `GOTOOLCHAIN=local`); fixtures under
`/home/mherwig/.cache/research-lang/go-tools/fixtures/directives-and-toolchain/`.

**1. `go` line above the installed toolchain, under `GOTOOLCHAIN=local`.**
Fixture: `go128-refuse/` (`go.mod`: `go 1.28`) vs `go127-compliant/`
(`go.mod`: `go 1.27.0`).
```
cd fixtures/directives-and-toolchain/go128-refuse && run.sh env GOTOOLCHAIN=local go build ./...
```
Violation exit: **1** — `go: go.mod requires go >= 1.28 (running go 1.27.1;
GOTOOLCHAIN=local)`.
```
cd fixtures/directives-and-toolchain/go127-compliant && run.sh env GOTOOLCHAIN=local go build ./...
```
Compliant-twin exit: **0** (no output).

**2. `GOTOOLCHAIN=auto` fetch attempt on the same violating module.**
```
cd fixtures/directives-and-toolchain/go128-refuse && run.sh env GOTOOLCHAIN=auto go build ./...
```
Exit: **1** — `go: downloading go1.28.0 (linux/amd64)` then `go: download
go1.28.0 for linux/amd64: toolchain not available` (this environment has no
route to a 1.28 toolchain, so the fetch itself fails rather than the version
check — the same failure shape a network-isolated CI runner would see).
The `GOTOOLCHAIN=local` run above is the compliant twin for this row: it
never attempts the fetch and fails fast instead.

**3. `go mod init`'s written `go` line on the installed toolchain.**
Fixture: `modinit/`, `modinit2/` (both freshly `go mod init`-ed, no prior
`go.mod`).
```
cd fixtures/directives-and-toolchain/modinit2 && run.sh go mod init example.com/modinit2 && cat go.mod
```
Output: `module example.com/modinit2` / `go 1.27.1` — the **current**
toolchain version (1.27.1), reproduced twice in separate directories. This
is the "violation of the brief's cited N-1 rule" in the sense that the rule
no longer holds on this toolchain; there is no separate "compliant twin" to
show, because 1.27.1 has only this one behavior (the N-1 default existed
only in 1.26.0).

**4. `stdversion` under `go vet` and `go test`.**
Fixture: `stdversion-violation/` (`go 1.24`, calls `errors.AsType`, a 1.26
API) vs `stdversion-fixed/` (`go 1.26`, identical source).
```
cd fixtures/directives-and-toolchain/stdversion-violation && run.sh go vet ./...
```
Violation exit: **1** — `main.go:14:21: errors.AsType requires go1.26 or
later (module is go1.24)`.
```
cd fixtures/directives-and-toolchain/stdversion-violation && run.sh go test ./...
```
Violation exit: **1** — same `stdversion` line, reported as a build failure
(`go test` on Go 1.27 runs `stdversion` before running any test).
```
cd fixtures/directives-and-toolchain/stdversion-fixed && run.sh go vet ./...
```
Compliant-twin exit: **0** (no output).
```
cd fixtures/directives-and-toolchain/stdversion-fixed && run.sh go test ./...
```
Compliant-twin exit: **0** — `?   example.com/stdversionfixed  [no test
files]` (expected: the fixture has no `_test.go` file; the point is that
`stdversion` does not fire, not that tests run).

**5. `godebug` naming a setting removed in Go 1.27, at its old vs its final
default value.**
Fixture: `godebug-removed-oldvalue/` (`godebug asynctimerchan=1`) vs
`godebug-removed-finalvalue/` (`godebug asynctimerchan=0`), both `go 1.27`.
```
cd fixtures/directives-and-toolchain/godebug-removed-oldvalue && run.sh go build ./...
```
Violation exit: **1** — `go: error loading go.mod: go.mod:5: removed
GODEBUG "asynctimerchan" set to old value "1"
(https://go.dev/doc/godebug#go-127)`.
```
cd fixtures/directives-and-toolchain/godebug-removed-finalvalue && run.sh go build ./...
```
Compliant-twin exit: **0** (no output).

**6. `go.work` workspace build vs `GOWORK=off`, two-module repo.**
Fixture: `gowork-two-module/` (`modA` `require`s `modB v0.0.0`, no
`replace`, joined by `go.work`'s `use (./modA ./modB)`).
```
cd fixtures/directives-and-toolchain/gowork-two-module && run.sh go build ./modA/... ./modB/...
```
Workspace-mode exit: **0** (no output — `modB` resolves through `use`).
```
cd fixtures/directives-and-toolchain/gowork-two-module/modA && run.sh env GOWORK=off go build ./...
```
`GOWORK=off` exit: **1** — `main.go:3:8: missing go.sum entry for module
providing package example.com/modB (imported by example.com/modA)`; a
follow-up `env GOWORK=off go mod tidy` cannot repair it either, failing with
`unrecognized import path "example.com/modB": ... 404 Not Found` (the module
path is not a real, fetchable one — exactly the failure a genuine
`use`-only sibling produces once the workspace is disabled).

**6b. `go.work` in a single-module repo — no functional difference either
way (the "no bug, just noise" case).**
Fixture: `gowork-single-module/` (root `go.work` `use (./modA)`, only one
`go.mod` in the tree).
```
cd fixtures/directives-and-toolchain/gowork-single-module && run.sh go vet ./modA/...
```
Exit: **0**.
```
cd fixtures/directives-and-toolchain/gowork-single-module/modA && run.sh env GOWORK=off go vet ./...
```
Exit: **0**. Both are green — this is the evidence that a stray `go.work` in
a single-module repo is a cleanliness smell, not a correctness bug (it never
goes red on either side, so it cannot back a MUST as a build-breaking
check — only a "why does this exist" reading heuristic).

**7. Nested module invisible to the parent's `./...`.**
Fixture: `nested-module/` (`go.mod` at root, `sub/go.mod` + `sub/sub.go`
below it, no `use` directive — a plain nested module, not a workspace).
```
cd fixtures/directives-and-toolchain/nested-module && run.sh go list ./...
```
Output: `example.com/nestedroot` only — `example.com/nestedroot/sub` is
absent (exit 0, but the omission itself is the finding — empty for the
nested package is the "violation" shape here).
```
cd fixtures/directives-and-toolchain/nested-module/sub && run.sh go list ./...
```
Output (run from inside the nested module): `example.com/nestedroot/sub` —
the compliant way to see it, one invocation per module root.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 (library floor vs app floor) | `google/go-cmp@b133f1f1932e:go.mod:3` (`go 1.21`, 0 deps); `stretchr/testify@87a7b9d57689:go.mod` (`go 1.17`) as library floors; `cli/cli@9b031151a825:go.mod:3` (`go 1.27.0`), `etcd-io/etcd@7583cc6e7e27:go.mod:3` (`go 1.27`) as app floors | none found — no exemplar library declares a floor above what its own code needs, per [exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md) |
| 2 (`toolchain` only when warranted) | `restic/restic@5127c4abf921:go.mod:5` (`toolchain go1.25.10`, matching its `go 1.25.8` floor) | none — 30/35 carry no `toolchain` line and rely on `auto`; not a violation, the measured default |
| 4 (nested-module enumeration) | n/a (a tooling practice) | `kubernetes__kubernetes` (~34 `staging/src/k8s.io/*` nested modules, [exemplar-code-shape.md §1](../go-audit/exemplar-code-shape.md): "root-only proxy undercounts nested modules"); `etcd-io/etcd`, `hashicorp/terraform`, `aquasecurity/trivy` also carry nested `go.mod` trees per [modrel §1](../go-audit/exemplar-modules-and-release.md) |
| 5 (`go.work` + `go.work.sum`, no `GOWORK=off`) | `bazelbuild__bazel-gazelle` (`go.work` + `go.work.sum`, `use (. ./v2)`); `etcd-io__etcd` (`go.work` + `go.work.sum`); `kubernetes__kubernetes` (`go.work` + `go.work.sum`, `godebug default=go1.27` on line 5) | `prometheus/prometheus` — `go.work` committed (`use (. ./compliance ./documentation/examples/remote_storage ./internal/tools ...)`) but **no `go.work.sum`**, the one exception to the 3/4 pattern ([exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md)) |
| 7 (`/vN` suffix at v2+) | `google/go-github@48d0a668cde8:go.mod:1` — `module github.com/google/go-github/v92`; `etcd-io/etcd@7583cc6e7e27:go.mod:1` — `module go.etcd.io/etcd/v3`; `golangci/golangci-lint@032d962e0399:go.mod` — `/v2` | `grpc/grpc-go` at v1.8x with no suffix — not a violation, a deliberate "never break the major" design per [exemplar-modules-and-release.md §1](../go-audit/exemplar-modules-and-release.md) |
| 8 (`godebug` names an extant, correctly-valued setting) | `hashicorp/terraform@db4eef44f5bb:go.mod` — `godebug winsymlink=0`; `restic/restic@5127c4abf921:go.mod` — `godebug winsymlink=0`; `kubernetes/kubernetes@dfd7b93a1783:go.mod` — `godebug default=go1.27` | none — no exemplar names a setting removed in 1.27 at an old value |
| 9 (`go-version-file` over a literal in CI) | 6/32 workflowed repos ([exemplar-quality-gates.md §3](../go-audit/exemplar-quality-gates.md)) — not individually re-cited here, see that audit's per-repo table | 27/32 hardcode a literal `go-version:` string instead — the corpus majority is the pattern this candidate argues against |

## AI-agent angle

- **Emitting a `toolchain` line by hand "to be safe."** An LLM trained on
  "pin your toolchain" advice from other ecosystems adds a `toolchain` line
  to a fresh `go.mod` unprompted. It is the tool's own write-on-`go get`
  mechanism (Finding 3); a hand-added one just as easily goes stale.
  **Smallest check:** `find . -maxdepth 1 -name go.mod -print0 | xargs -r -0
  grep -n '^toolchain '` — present in a library `go.mod` the agent just
  authored from scratch (rather than one it bumped via `go get`) is the
  finding.
- **"Correcting" a fresh `go.mod`'s `go` line down to `N-1`, following
  stale training data about Go 1.26's `go mod init` default.** That default
  was reverted in 1.26.1 (Finding 5); an agent trained on the 1.26.0-era
  blog posts will downgrade a line that the toolchain itself already wrote
  correctly. **Smallest check:** re-run `go mod init` in a scratch directory
  on the same toolchain and diff the written `go` line against `go version`
  — if they match, the agent's "fix" is the regression.
- **Declaring a library floor equal to "whatever I'm running," not the
  lowest the code needs.** An agent authoring a new SDK package on Go 1.27
  writes `go 1.27` reflexively instead of checking which stdlib symbols the
  code actually calls. **Smallest check:** `go vet ./...` (stdversion) after
  temporarily lowering the `go` line by one or two minors — a genuine
  failure names the first symbol that needs the higher floor; a clean pass
  means the floor can drop.
- **Using `GOTOOLCHAIN=auto`'s silent fetch as an excuse to skip pinning any
  toolchain version in CI at all.** An agent wiring a new workflow reasons
  "the go command downloads what it needs" and omits `setup-go`'s version
  input entirely. This fails exactly like [Verification run
  2](#verification-runs)'s offline case whenever the runner lacks egress to
  `proxy.golang.org`, non-deterministically. **Smallest check:** grep the
  workflow for `actions/setup-go` with neither `go-version` nor
  `go-version-file` set (`grep -rn -e 'uses:.*actions/setup-go'
  .github/workflows` then read three lines below each hit).
- **Treating `godebug` in `go.mod` as equivalent to setting the `GODEBUG`
  environment variable at runtime.** They overlap in *name* but not in
  scope or enforcement: `godebug` is compiled in for every main package of
  that module and is validated at `go.mod`-load time (Finding 9, Finding 1);
  `GODEBUG=` is a runtime env var with no such validation. An agent that
  writes `GODEBUG=asynctimerchan=1` in a Dockerfile to "fix" a removed
  setting will find it silently ignored by the Go 1.27 runtime (removed
  settings are inert at runtime, not just at build time), while the
  `go.mod` form fails loudly at build. **Smallest check:** re-run the build
  itself — `go build ./...` on Go 1.27+ is the real, load-bearing check for
  the `go.mod` form; a runtime `GODEBUG=` env var pointed at a removed
  setting produces no error at all, which is itself the trap.
- **Assuming one `go vet ./...`/`golangci-lint run ./...` at the repo root
  covers a monorepo.** An agent asked to "run the linter on this repo" runs
  it once at `.` and reports success, missing every nested module
  (Finding 7). **Smallest check:** `find . -name go.mod -not -path
  '*/vendor/*' | wc -l` — a count above 1 means the single root-level
  invocation the agent just ran did not cover the whole repo.

## Contested / evolving

- **`go mod init`'s default `go` line is not settled Go-team practice — it
  changed twice inside roughly one year** (current default: N, per pre-1.26
  and post-1.26.1 behavior; briefly N-1/N-2 for the 1.26.0 window only).
  Any rule or piece of training data citing "the go1.26 behavior" without a
  patch-version caveat is describing a window that closed at 1.26.1. As of
  2026-09-26 (Go 1.27.1) the current-version behavior is settled again, but
  the churn itself — two behavior changes for one command inside a year —
  is the signal: a rule that hardcodes "N-1" without re-verifying against
  the installed toolchain will go stale again on the next such reversal.
- **Whether a fleet CLI should ever declare a `toolchain` line for a
  *security* patch, independent of the general "minority practice"
  finding.** The owner's Q1 default explicitly carves out "no toolchain
  line unless it pins a security patch" — that carve-out is not measured
  anywhere in the corpus (none of the 5 `toolchain`-carrying exemplars state
  a security rationale in a comment), so it is a fleet-specific policy
  decision layered on top of measured practice, not itself a trend.
- **`go.work` adoption trend.** 4/35 commit one, all pre-existing
  monorepos; there is no visible momentum toward *more* repos adopting
  `go.work` in this corpus snapshot (2026-09-26) — it remains a tool for
  genuine multi-module development, not a rising default even among
  Go-team-adjacent projects (`golang/tools`, `golang/vuln` — no workspace).
- **`/vN` cadence.** `google/go-github`'s per-breaking-release major bump
  (`/v92`) and `grpc/grpc-go`'s permanent-v1 stance are both live, opposite
  strategies in actively maintained projects as of this date — the
  ecosystem has not converged on one answer to "how often should a stable
  library bump its major," only on the mechanical requirement that a bump,
  whenever it happens, carries the suffix.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/ref/mod](https://go.dev/ref/mod) | Official Go modules reference (spec-level) | Continuously updated; fetched 2026-09-26 | Authoritative syntax and semantics for `go`, `toolchain`, `godebug`, `tool`, `ignore`, `retract`, `replace`, `go.work` `use`, `/vN`, `+incompatible` |
| [go.dev/doc/toolchain](https://go.dev/doc/toolchain) | Official Go toolchains doc | Continuously updated; fetched 2026-09-26 | `GOTOOLCHAIN` forms, resolution order, forward-compatibility-since-1.21 mandate, toolchain-download mechanics |
| [go.dev/doc/godebug](https://go.dev/doc/godebug) | Official GODEBUG history/policy page | Continuously updated; fetched 2026-09-26 | GODEBUG defaults hierarchy, `godebug` directive syntax, Go 1.27 removed-setting list, retention policy |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Official Go 1.26 release notes | Feb 2026 | Confirms (and, per #77653, later reverses) the `go mod init` N-1 default; `cmd/doc` removal |
| [go.dev/doc/go1.27](https://go.dev/doc/go1.27) | Official Go 1.27 release notes | Aug 2026 (current) | `stdversion` under `go test` by default; GODEBUG removals with the exact accept/reject rule; `go fix` modernizer churn |
| [go.dev/blog/loopvar-preview](https://go.dev/blog/loopvar-preview) | Official Go blog, per-iteration loop variables | 19 Sept 2023 | Confirms the `go 1.22`-gated semantics this program's Finding 1/Verification 1 note applies |
| [go.dev/doc/modules/release-workflow](https://go.dev/doc/modules/release-workflow) | Official module release/versioning workflow | Continuously updated; fetched 2026-09-26 | v0/v1/v2+ tagging steps, the major-version branch convention |
| [go.dev/doc/modules/major-version](https://go.dev/doc/modules/major-version) | Official major-version-suffix guide | Continuously updated; fetched 2026-09-26 | `/vN` mechanics and repo-branching convention for a v2+ bump |
| [actions/setup-go README](https://github.com/actions/setup-go) | The action's own repository docs | v6/v7, fetched 2026-09-26 | `go-version` vs `go-version-file` precedence; V6's `toolchain`-then-`go` directive fallback |
| [actions/setup-go docs/advanced-usage.md](https://github.com/actions/setup-go/blob/main/docs/advanced-usage.md) | The action's own advanced-usage doc | v6/v7, fetched 2026-09-26 | Exact `go-version-file` file-type list and `check-latest` semantics/cost |
| [golang/go#77653](https://github.com/golang/go/issues/77653) | Accepted proposal, golang/go issue tracker | Filed/accepted 2026, Go 1.27 milestone | The reversal of the `go mod init` N-1 default, with the "developers naturally expect N" rationale |
| [golang/go#77860](https://github.com/golang/go/issues/77860) | Accepted backport proposal, golang/go issue tracker | 2026 | Confirms the reversal was backported to Go 1.26.1, explaining why 1.27.1's behavior differs from the 1.26.0-only window |
| [exemplar-modules-and-release.md](../go-audit/exemplar-modules-and-release.md) | This program's own measured audit, §1 | 2026-09-26 | Every per-repo `go`/`toolchain`/`godebug`/`go.work`/`/vN` count and citation used above |
| [exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md) | This program's own measured audit, §3 | 2026-09-26 | `go-version-file` vs literal `go-version:` and `check-latest` CI census |

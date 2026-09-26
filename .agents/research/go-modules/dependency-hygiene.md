---
title: "Replace, retract, superseded modules and vulnerability triage"
topic: go-modules / GO-MOD (dependency hygiene)
agent: dependency-hygiene-dive
model: sonnet
date_researched: 2026-09-26
sources_count: 19
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/dependency-hygiene/
scope: |
  What a Go module may declare as a dependency, how `replace`/`retract` behave
  and where they are safe, the superseded-module table new fleet code must
  not add to, and the govulncheck-driven triage procedure `go-upgrade` runs.
  Covers M-L-06, M-L-08, M-L-10, M-L-11, M-L-13, M-L-16..18, M-I-01, M-I-02,
  M-P-04. Does not cover general `go.mod` census (M-L-01..05, 07, 09, 12,
  14, 15, 19 — GO-MOD index rows outside this brief), golangci-lint
  configuration shape (GO-GATE), or release engineering (GO-REL).
---

## Table of contents

1. [Findings](#findings)
   1.1 [`replace`: main-module-only, never relied on by a consumer](#1-replace-main-module-only-never-relied-on-by-a-consumer)
   1.2 [`retract`: advisory, delayed, and requires a new tag](#2-retract-advisory-delayed-and-requires-a-new-tag)
   1.3 [The superseded-module table](#3-the-superseded-module-table)
   1.4 [The YAML fragmentation and the fleet's pick](#4-the-yaml-fragmentation-and-the-fleets-pick)
   1.5 [govulncheck: modes, scan levels, and what they actually change](#5-govulncheck-modes-scan-levels-and-what-they-actually-change)
   1.6 [`-mode=binary`: normal vs. stripped, and the fleet's mirror/ship split](#6-mode-binary-normal-vs-stripped-and-the-fleets-mirrorship-split)
   1.7 [depguard as the enforcement mechanism for the superseded table](#7-depguard-as-the-enforcement-mechanism-for-the-superseded-table)
   1.8 [`go build -mod=readonly`: the tamper-evident build default](#8-go-build--modreadonly-the-tamper-evident-build-default)
   1.9 [The SDK's zero-runtime-dependency check](#9-the-sdks-zero-runtime-dependency-check)
   1.10 [GOPRIVATE / GONOSUMDB / GONOPROXY / GOAUTH](#10-goprivate--gonosumdb--gonoproxy--goauth)
   1.11 [Dependabot/Renovate grouping and review policy](#11-dependabotrenovate-grouping-and-review-policy)
   1.12 [CI patch currency and stdlib CVEs](#12-ci-patch-currency-and-stdlib-cves)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A `replace` directive in a library's `go.mod` is silently ignored by every consumer — `replace` only applies in the main module ([go.dev/ref/mod](https://go.dev/ref/mod#go-mod-file-replace)) — so a library must never *rely* on one; it is a smell a reviewer greps for, not a mechanism a library can lean on.
- `replace` alone does nothing: it needs a matching `require` on the left-hand module/version, and `go.work` replaces override `go.mod` replaces, with a wildcard `go.work` replace beating a version-pinned `go.mod` one.
- Watched and run: a consumer module that depends on a library whose `go.mod` replaces a dependency with a forked local path gets the *real* dependency, not the fork — confirmed end to end with a planted three-module chain (`/home/mherwig/.cache/research-lang/go-tools/fixtures/dependency-hygiene/replace-ignored/`).
- `retract` must be published in a version *higher* than the one it retracts — a `retract v1.0.1` line inside v1.0.1's own `go.mod` does nothing; it must ship in v1.0.2 or later ([go.dev/ref/mod](https://go.dev/ref/mod#go-mod-file-retract)). Watched: `go list -m -retracted` shows `Retracted=[]` for v1.0.1 before v1.0.2 exists and `Retracted=[<reason>]` after.
- `retract` never un-publishes, never breaks an existing build pinned to the retracted version, and never removes the version from the proxy or VCS — it only stops `go get`/`go mod tidy` from *choosing* it and removes it from `@latest`/plain `-versions` listings.
- The superseded-module table for new fleet Go code: `github.com/pkg/errors` → stdlib `errors`+`fmt.Errorf("%w")` (Go 1.13+); `github.com/golang/mock` → `go.uber.org/mock` (upstream is archived, `pushed_at: 2024-01-08`); `golang.org/x/exp/{slices,maps}` → stdlib `slices`/`maps` (Go 1.21+); `gopkg.in/yaml.v2`/the whole `go-yaml/yaml` line → `go.yaml.in/yaml/v3` (upstream archived 2025-04-01); `hashicorp/go-multierror` → stdlib `errors.Join` (Go 1.20+); `go.uber.org/automaxprocs` → nothing needed, at `go >= 1.25` (container-aware `GOMAXPROCS` is now a runtime default); `github.com/google/uuid` → stdlib `uuid`, at `go >= 1.27` — but note the stdlib surface is narrower (see §3).
- A depguard rule denying `github.com/pkg/errors` and `io/ioutil` is a real, watched, zero-noise gate: `golangci-lint run` exits 1 with exactly 2 findings on the violating fixture and 0 on the compliant twin (`fixtures/dependency-hygiene/depguard-{violation,clean}/`).
- `go build -mod=readonly ./...` is the correct CI default over plain `go build`: it fails deterministically (exit 1, "import lookup disabled by -mod=readonly") the moment source and `go.mod`/`go.sum` disagree, watched on a fixture with a hand-added import and no `go mod tidy` run.
- govulncheck's default `-scan symbol` reachability analysis is not cosmetic: on the exemplar govulncheck runs, only 3 of 22 findings across 6 repos were symbol-reachable (14%) — a module-level scanner would have flagged all 22 ([modrel](../go-audit/exemplar-modules-and-release.md) §2). Reproduced locally: the identical dependency at `-scan symbol` gives "0 vulnerabilities" when the vulnerable function is never called, and `-scan package`/`-scan module` still flag it.
- `-mode=binary` on a stripped (`-ldflags="-s -w"`) binary loses call-graph precision and *over-reports*: the identical source produced 1 reachable finding via normal-build binary-mode analysis and 4 broader findings (no call traces, only "vulnerable symbols found") once stripped — watched directly (§6). A fleet that ships or audits `-s -w` binaries gets noisier, not cleaner, govulncheck output.
- `govulncheck-action`'s `-format json`/`-format sarif` **always exits 0**, even with findings — only `-format text` (the default) fails the job. A CI step piping govulncheck to JSON/SARIF for a dashboard needs its own separate exit-code check on the content.
- `replace` and `retract` are the *only* two directives with a documented "ignored by everyone but you"/"has to age into effect" shape; every other module directive (`require`, `exclude`, `godebug`, `ignore`) is immediate and universal — this asymmetry is the single most common thing an LLM gets wrong about `go.mod`.
- The zero-runtime-dependency check the SDK needs (owner Q2) has a one-line, exact answer: `go list -deps -f '{{if not .Standard}}{{.ImportPath}}{{end}}' ./...` filtered for the module's own import path — empty output is the pass; watched on a planted violation (imports `github.com/google/uuid`) and a clean twin (stdlib `crypto/rand` only).
- Dependabot with the `gomod` ecosystem is in 24/35 exemplars (69%), grouped in 18/24; two repos configure Dependabot for `github-actions` only and have *no* `gomod` block at all (`uber-go/zap`, `kubernetes-sigs/controller-runtime`) — "Dependabot is configured" is not evidence Go deps are covered by it.
- CI patch currency (`check-latest: true` on `actions/setup-go`) is a minority practice, 10/32 exemplars — but it is the only defense against a stdlib CVE fixed in a point release the CI matrix's cached toolchain predates (CVE-2025-22871, `net/http` request smuggling, fixed in 1.23.8/1.24.2).
- `GOAUTH` (Go 1.24+) defaults to `netrc`, not `off` — a repo that never sets it is not "insecure by default" for private-module auth, but a CI job that *disables* it without setting up `git credential fill` will simply fail to fetch private modules rather than silently fetch unauthenticated.

## Findings

### 1. `replace`: main-module-only, never relied on by a consumer

The `go.mod` reference spec is explicit and this is the one fact in this
brief that most needs saying plainly, because it contradicts a naive reading
of "replace a dependency":

> `replace` directives only apply in the main module's `go.mod` file and are
> ignored in other modules.
> — [go.dev/ref/mod §replace](https://go.dev/ref/mod#go-mod-file-replace)

Consequences that follow directly and that a reviewer must check for:

- A library cannot ship a bug-for-bug-compatible fork of a dependency via
  `replace` and expect consumers to get it. Only the module that is
  currently being **built as the main module** — i.e. whoever runs `go
  build`/`go test` directly inside that module — sees its own `replace`
  block. The instant that module becomes someone else's dependency, its
  `replace` directives vanish from the build.
- `replace` needs a matching `require` line (in the main module's own
  `go.mod` or a dependency's) naming the exact left-hand version; a
  `replace` with no corresponding `require` is a no-op.
- In a `go.work` workspace, `go.work`'s own `replace` block overrides every
  workspace member's `go.mod` replace for the same module, and a
  **version-less** (wildcard) `go.work` replace beats a **version-pinned**
  `go.mod` replace even for a different specific version.

**Watched, end to end** (`fixtures/dependency-hygiene/replace-ignored/`):
three real modules built and run with the real 1.27.1 toolchain and a local
file-based module proxy —

- `example.com/dep@v0.1.0` — the "real" upstream, `Label()` returns `"REAL"`,
  published into a hand-built proxy directory (Go's own testing convention:
  `<proxy-root>/<module>/@v/{list,vX.Y.Z.info,vX.Y.Z.mod,vX.Y.Z.zip}`).
- `example.com/liba` — `go.mod` has `require example.com/dep v0.1.0` **and**
  `replace example.com/dep => ../dep-fork`, where `dep-fork`'s `Label()`
  returns `"FORK-SHOULD-NOT-LEAK-TO-CONSUMER"`.
- `example.com/consumer` — `go.mod` has `require example.com/liba …` and
  `replace example.com/liba => ../liba` (needed only to source `liba` from
  disk; it carries **no** replace for `example.com/dep`).

Building and running `liba` as the main module (`go run ./cmd/print` inside
`liba/`) prints `FORK-SHOULD-NOT-LEAK-TO-CONSUMER` — its own replace is
honored, as expected. Building and running `consumer` (`go run .` inside
`consumer/`, same proxy) prints `REAL` — `liba`'s replace is silently
dropped the instant `liba` stops being the main module. See
[Verification runs §7](#verification-runs) for the exact commands and
output.

The finding a reviewer names in review is simpler than the mechanism: **a
library's `go.mod` should carry no `replace` directive at all**, except a
local-path self-reference inside a genuine multi-module monorepo (see
below). The check is a one-line grep, watched red/green in
[§7](#verification-runs): `grep -n '=>' go.mod`.

**The one legitimate shape**: every multi-module repo in the corpus that
carries a `replace` block uses **only local-path self-references** —
`etcd-io/etcd` (9), `hashicorp/terraform` (10, e.g.
`hashicorp/terraform@db4eef44f5bb:go.mod:350` →
`./internal/backend/remote-state/azure`), `kubernetes/kubernetes` (33, all
`staging/` redirects, `kubernetes/kubernetes@dfd7b93a1783:go.mod:224`) — this
pattern wires a monorepo's own submodules together during development and
is fine, because the outer module is genuinely the main module for its own
build. The one exception in 35 repos is a real third-party fork swap:
`syncthing/syncthing@94c3c1cdef71:go.mod` replaces
`github.com/gobwas/glob => github.com/calmh/glob` and
`github.com/jackpal/gateway => github.com/marbens-arch/gateway` — both
*module*-to-*module* replacements (not local paths), which work exactly like
the fixture above: they apply only when syncthing itself is main-module, and
are invisible to anything that imports syncthing as a library
([modrel](../go-audit/exemplar-modules-and-release.md) §1).

### 2. `retract`: advisory, delayed, and requires a new tag

Also from the spec, with the exact mechanics:

> To retract a version, a module author should add a `retract` directive to
> `go.mod`, then publish a new version containing that directive. The new
> version must be higher than other release or pre-release versions; that
> is, the `@latest` version query should resolve to the new version before
> retractions are considered.
> — [go.dev/ref/mod §retract](https://go.dev/ref/mod#go-mod-file-retract)

Syntax: a single version (`retract v1.0.0`) or a closed interval
(`retract [v1.1.0, v1.2.0]`, both bounds inclusive); a single version is
shorthand for a same-bound interval.

**What it does**: removes the version from `go list -m -versions` output
and from plain `@latest`/`@>=` resolution (unless `-retracted` is passed);
stops `go get`/`go mod tidy` from upgrading *to* it; surfaces a warning when
a user runs `go list -m -u`.

**What it does not do** — this is the part an agent gets wrong by analogy
with `npm unpublish` or a deleted GitHub release:

- Does not remove the version from version control or the module proxy —
  the spec says explicitly the version "should remain available … to
  ensure that builds that depend on [it] are not broken."
- Does not break an existing build already pinned to the retracted version.
- Does not retroactively fail a CI job that already resolved to it before
  the retraction was published.

**Watched, both sides of the delay** (`fixtures/dependency-hygiene/retract-demo/`,
two proxy snapshots of the same module `example.com/retractdemo`):

```
# proxy-before: only v1.0.0, v1.0.1 published, no retract anywhere yet
$ go list -m -retracted -f '{{.Version}} Retracted={{.Retracted}}' example.com/retractdemo@v1.0.1
v1.0.1 Retracted=[]
$ go list -m -f '{{.Version}}' example.com/retractdemo@latest
v1.0.1

# proxy-after: v1.0.2 published; v1.0.2's OWN go.mod carries `retract v1.0.1 // published with a data-loss bug`
$ go list -m -retracted -f '{{.Version}} Retracted={{.Retracted}}' example.com/retractdemo@v1.0.1
v1.0.1 Retracted=[published with a data-loss bug]
$ go list -m -f '{{.Version}}' example.com/retractdemo@latest
v1.0.2
```

Before v1.0.2 exists, v1.0.1 is indistinguishable from any other version.
After it exists — and *only* because its `go.mod` carries the retraction —
v1.0.1 is flagged and `@latest` jumps straight past it. The retraction
comment (`// published with a data-loss bug`) is not decorative: `go list
-m -retracted` surfaces it verbatim in `.Retracted`, and it is the only
human-readable signal a downstream `go get -u` sees.

**Adoption is rare (2/35) and both real cases put the comment to work**:
`grpc/grpc-go@acccf8cd101a:go.mod:46` — `retract [v1.74.0, v1.74.1]` (range
syntax, a real regression window); `charmbracelet/bubbletea@d5bfd5c2ff74:go.mod:3`
— `retract v2.0.0-beta1 // We add a "." after the "beta"…` (a naming
mistake, not a functional bug) ([modrel](../go-audit/exemplar-modules-and-release.md) §1).
**Rule for the fleet's own releases**: `retract` is the correct fix for "we
tagged something broken" — never a force-push or a deleted tag, and never a
same-version edit; it always needs the next tag up, and its comment is the
message a downstream `go get -u` will actually read.

### 3. The superseded-module table

The table new fleet Go code must not add to, with the exact replacement and
the version floor each entry is conditioned on. Direct-dependency counts are
from [modrel §2](../go-audit/exemplar-modules-and-release.md#2-dependency-posture)
unless marked otherwise.

| Module | Direct in corpus | Replacement | Floor | Why | Check |
|---|---|---|---|---|---|
| `github.com/pkg/errors` | 3/35 (`cockroachdb/pebble`, `restic/restic`, `tailscale/tailscale`) | stdlib `errors` + `fmt.Errorf("%w", err)` + `errors.Is`/`As` | go 1.13+ | `errors.Wrap`/`Cause` fully subsumed since 2019; low but non-zero adoption means "migrate", never "extinct" | depguard `deny` |
| `github.com/golang/mock` | 1/35 (dev-only test dep, `bazel-contrib/rules_go`) | `go.uber.org/mock` | any | upstream **archived**, `archived: true`, `pushed_at: 2024-01-08` (verified via `gh api repos/golang/mock`, this dive) | depguard `deny`; grep `go.mod` for `github.com/golang/mock` |
| `golang.org/x/exp/{slices,maps}` | 5/35 direct on the whole `x/exp` module (not isolated to slices/maps) | stdlib `slices`, `maps`, `cmp` | go 1.21+ | graduated to stdlib; `x/exp` does **not** remove a graduated package on graduation, so the two can silently coexist without a build error ([shifts](../go-topic-map/shifts.md) §16) | `go fix` (`mapsloop`, `slicesbackward`, `slicescontains`, `slicessort` modernizers, 1.27) |
| `gopkg.in/yaml.v2` and the `go-yaml/yaml` lineage generally | 0 direct, present transitively | `go.yaml.in/yaml/v3` | any | `go-yaml/yaml` **archived 2025-04-01**, unmaintained per the original author's own statement (verified this dive); `go.yaml.in` is the community-run successor org "representatives of go-yaml's most important downstream projects" now maintain (verified this dive) | see §4 |
| `github.com/hashicorp/go-multierror` | 2/35 (`aquasecurity/trivy`, `goreleaser/goreleaser`) | stdlib `errors.Join` | go 1.20+ | fully subsumes the common case; small but real modernization gap, not yet a `go fix` modernizer target | reading heuristic (no automated check identified) |
| `github.com/satori/go.uuid` | 0/35 | `github.com/google/uuid` (or stdlib `uuid` at go≥1.27) | any | abandoned, has had unfixed correctness issues historically; zero adoption in this corpus confirms it, not a live risk here | depguard `deny` |
| `github.com/ghodss/yaml` | 0/35 | `sigs.k8s.io/yaml` (its own permanent successor fork) | any | `ghodss/yaml` is unmaintained; `sigs.k8s.io/yaml` is literally described as "a permanent fork of ghodss/yaml, maintained by Kubernetes SIGs" (verified this dive) | depguard `deny` |
| `github.com/gorilla/mux` | 0/35 as a router (3/35 use other `gorilla/*` packages: `websocket`, `csrf`) | stdlib `net/http.ServeMux` (pattern-based routing since Go 1.22) | go 1.22+ | `gorilla/mux` itself: not archived, but `pushed_at: 2024-08-15` — over two years stale at research time, no formal maintenance-mode banner but the cadence is the signal ([shifts](../go-topic-map/shifts.md) §16) | reading heuristic; `go vet`/staticcheck have no rule for this, it is a design-review item |
| `go.uber.org/automaxprocs` | not directly measured in this dive; present in the exemplar-corpus README census per [shifts](../go-topic-map/shifts.md) | nothing — delete the dependency | **go >= 1.25** | Go 1.25's runtime defaults `GOMAXPROCS` to the cgroup CPU-bandwidth limit whenever `GOMAXPROCS` is otherwise unset, re-checked periodically; the [Go blog post itself](https://go.dev/blog/container-aware-gomaxprocs) credits automaxprocs's maintainers and frames this as the built-in replacement | `grep` for the import + check the `go` line; `GODEBUG=containermaxprocs=0`/`updatemaxprocs=0` to opt back to the old always-`NumCPU()` behavior if ever needed |
| `github.com/google/uuid` | 9/35 direct — the single most-adopted deprecated-by-this-table module in the corpus | stdlib `uuid` | **go >= 1.27** | a stdlib `uuid` package ships in Go 1.27.1's `GOROOT/src/uuid/uuid.go`, confirmed by reading it directly this dive (no build tag; always compiled in) | see below — **narrower surface, do not swap blindly** |

**`google/uuid` → stdlib `uuid`, verified in full, with the gap the table
above doesn't have room for.** Confirmed live on the installed 1.27.1
toolchain (`$(go env GOROOT)/src/uuid/uuid.go`, package doc: "Package uuid
provides support for generating and manipulating UUIDs… See [RFC 9562]…
Random components of new UUIDs are generated with a cryptographically secure
random number generator"). Its exported surface, read directly from source:
`type UUID [16]byte` (comparable with `==`, unlike `google/uuid`'s
`[16]byte` which is *also* comparable, so this part matches), `Parse`,
`MustParse`, `New` (equivalent to `NewV4`), `NewV4`, `NewV7`, `Nil`, `Max`,
`(UUID).String`, `(UUID).MarshalText`/`AppendText`/`UnmarshalText`,
`(UUID).Compare`. **What is missing relative to `github.com/google/uuid`'s
32-years-of-accretion surface**: `NewV6`, `NewMD5`, `NewSHA1`, `NewHash`
(hash-based/namespaced UUIDs), `NewRandom` (the pre-V4-rename legacy name),
`ParseBytes`, `Validate`, and the whole DCE-security family
(`NewDCESecurity`/`NewDCEPerson`/`NewDCEGroup`). **Rule**: a fleet module
whose `go` line is `>= 1.27` and that only needs `New`/`Parse`/`String`
(the OCX SDK's and CLI's expected use) drops `github.com/google/uuid` for
stdlib `uuid`; a module needing `NewV6`, hash-based UUIDs, or DCE-security
UUIDs keeps the third-party module regardless of Go floor, because the
stdlib package simply does not implement them — this is not a "not yet
migrated" gap, it is scope-by-design in a first stdlib release, so a
reviewer should not flag a `NewV6`/`NewSHA1` caller for staying on
`google/uuid`.

### 4. The YAML fragmentation and the fleet's pick

Four distinct direct-dependency answers coexist in the corpus for "which
YAML library":

| Library | Direct adopters | Status |
|---|---|---|
| `go.yaml.in/yaml/{v2,v3,v4}` | 9/35 — `golangci-lint`, `goreleaser`, `ko-build/ko`, `kubernetes/kubernetes`, `oras-project/oras`, `prometheus/prometheus` (all three majors at once), `spf13/cobra`, `stretchr/testify`, `uber-go/zap` | **current**, community-maintained successor |
| `gopkg.in/yaml.v3` | 5/35 — `aquasecurity/trivy`, `caddyserver/caddy`, `cli/cli`, `oras-project/oras-go`, `tailscale/tailscale` | pointed at an archived upstream, still functionally fine, no active maintenance behind the tag |
| `sigs.k8s.io/yaml` | 4/35 — `kubernetes/kubernetes`, `kubernetes-sigs/controller-runtime`, `syncthing/syncthing`, `tailscale/tailscale` | a **different tool**, not a drop-in — see below |
| `gopkg.in/yaml.v2` | 0 direct, present only transitively | superseded, see §3 |

`go-yaml/yaml` — the upstream `gopkg.in/yaml.v2`/`v3` has pointed at for
years — was archived by its original maintainer on 2025-04-01; the
maintainer's own note (read this dive) says he "was hoping to address the
situation by moving it into a dedicated professional team… but that hasn't
materialized." `go.yaml.in/yaml` is the community-run successor org that
picked it up, described on its own pkg.go.dev page (read this dive) as
maintained by "representatives of go-yaml's most important downstream
projects," explicitly aiming "to become the new upstream for various yaml
forks in the Go ecosystem." **This is already the corpus's leading direct
choice (9 vs. 5), not merely a recommendation** — the migration is ahead of
where the tooling census would suggest.

`sigs.k8s.io/yaml` is not a competing YAML *parser* — it wraps go-yaml and
round-trips through `encoding/json`, so it "reuses JSON struct tags as well
as the custom JSON methods `MarshalJSON`/`UnmarshalJSON`, unlike go-yaml"
(read this dive). It exists specifically so a struct already tagged for
`encoding/json` gets YAML support for free, without a second set of
`yaml:"…"` tags. `prometheus/prometheus` importing **three different
`go.yaml.in/yaml` majors at once** ([modrel](../go-audit/exemplar-modules-and-release.md)
§2) is the corpus's starkest example of exactly the churn this fragmentation
causes.

**Resolved for fleet code**: `go.yaml.in/yaml/v3` for plain YAML
marshal/unmarshal; `sigs.k8s.io/yaml` only when a type's canonical tags are
already `json:"…"` and dual-tagging would be the alternative (e.g. an SDK
type shared between a JSON API response and a YAML config file). Never add
a new direct dependency on `gopkg.in/yaml.v2` or `v3` — they still work, but
point at a dead upstream with no one now watching for parser CVEs.

### 5. govulncheck: modes, scan levels, and what they actually change

Read from the installed binary's own help text and `pkg.go.dev` (both this
dive and [codified §11](../go-topic-map/codified.md)), confirmed against a
real run:

- **`-mode`**: `source` (default, analyzes source + build graph), `binary`
  (scans a compiled binary's symbol table, no source needed), `extract`
  (internal use).
- **`-scan`**: `module` (any known-vulnerable module in the build list, no
  call-graph analysis), `package` (any vulnerable *package* actually
  imported), `symbol` (**default**) — the finest grain: only vulnerabilities
  in functions transitively **called** from the module's own code.
- Other flags: `-db` (default `https://vuln.go.dev`), `-format`
  (`text`/`json`/`sarif`/`openvex`), `-show` (`traces,color,version,verbose`),
  `-test` (source mode only, include test files), `-tags`, `-C dir`.

**The reachability triage this backs, watched both ways**
(`fixtures/dependency-hygiene/govuln-{reachable,unreachable}/`, real
`golang.org/x/text v0.3.0` — a genuinely old, multiply-vulnerable version,
network-fetched from the real proxy):

- `govuln-reachable/main.go` calls `language.Parse("")` directly.
  `govulncheck -scan=symbol ./...` → **exit 3**, one finding
  (`GO-2021-0113`, "Out-of-bounds read in golang.org/x/text/language"), with
  an explicit call trace: `main.go:10:24: govulndemo.main calls
  language.Parse`. `-scan=package ./...` on the same code → exit 3, **two**
  findings (adds `GO-2022-1059`, a header-parsing DoS the code never
  triggers by call graph but that lives in an imported package).
  `-scan=module` (run with no path arguments from inside the module) → exit
  3, **four** findings (adds two more vulnerabilities present anywhere in
  the required module, never even imported by name).
- `govuln-unreachable/main.go` imports the same `language` package but only
  reads `language.English.String()` — never calls `Parse` or any other
  vulnerable symbol. `-scan=symbol ./...` → **exit 0**, "No vulnerabilities
  found… this scan also found 2 vulnerabilities in packages you import…
  but your code doesn't appear to call these vulnerabilities." The
  identical dependency, at `-scan=package ./...`, still → **exit 3**, same
  2 findings as the reachable case's package scan.

This is the exact shape [modrel §2](../go-audit/exemplar-modules-and-release.md#govulncheck-6-repos)
found across 6 real repos: 22 total module/package-level findings, only 3
symbol-reachable (14%) — `ko-build/ko@fcaeb337b6bd` is the one exemplar with
a reachable finding in a *direct* dependency
(`GO-2026-6348`, grpc HTTP/2 DATA-frame OOM, reached via
`test/main.go:57:30` → `time.LoadLocation` →
`mem.IsBelowBufferPoolingThreshold`) plus one reached only via a
subcommand helper (`GO-2026-6225`, credential leak in
`docker-credential-acr-env`, via `cmd/help/main.go:41:24`).

**Triage procedure `go-upgrade` runs, in order**: (1) `govulncheck -scan symbol
./...` (or `-scan module` with no args for a quick module-graph pass first)
— text format, default settings; exit 0 means done. (2) Every finding with an
`Example traces found:` block is a real, reachable code path: the fix is an
upgrade of the named module to the `Fixed in:` version, never a `replace`
(a `replace` to a patched fork reintroduces exactly the "silently ignored by
consumers" hazard from §1, and fixes nothing for anyone who imports the
fleet module as a dependency). (3) Every finding with **no** trace (present
only "in packages you import"/"in modules you require") is scheduled, not
urgent: track it, bump on the next routine dependency update, and do not
block a release on it — re-running with `-show verbose` shows exactly which
package/symbol is present without a call path, for the changelog note. (4)
Re-run after the upgrade; a finding that persists because the fixed version
isn't out yet is a `retract`-worthy note in the fleet's own release, not a
`replace`.

### 6. `-mode=binary`: normal vs. stripped, and the fleet's mirror/ship split

M-I-02 asks two distinct questions the fleet actually has: does
`-mode=binary` audit an **upstream binary the fleet mirrors** (no source,
no `go.mod` — this is the *only* option), and does it audit **a binary the
fleet builds and ships itself** (source is available, so `-mode=source` is
strictly more precise — binary mode is a second, weaker check on the exact
artifact that ships, useful as a release gate but not a substitute).

**Watched, both build shapes of the same source**
(`fixtures/dependency-hygiene/govuln-reachable/`, same `go.mod`/`main.go` as
§5):

```
$ go build -o bin-normal .
$ go build -ldflags="-s -w" -o bin-stripped .
$ govulncheck -mode=binary bin-normal      # exit 3
    Vulnerability #1: GO-2021-0113 … Vulnerable symbols found: #1: language.Parse
    Your code is affected by 1 vulnerability from 1 module.
$ govulncheck -mode=binary bin-stripped    # exit 3
    Vulnerability #1..#4  (GO-2026-5970, GO-2022-1059, GO-2021-0113, GO-2020-0015)
    #1: language.MatchStrings  #2: language.MatchStrings  #3: language.MustParse
    #4: language.Parse  #5: language.ParseAcceptLanguage  … +1 more
    Your code is affected by 4 vulnerabilities from 1 module.
```

Both exit non-zero — stripping does not hide the problem — but the
**stripped binary produces 4x the findings with no reduction in precision
narrative** (no "Example traces found", only a flat "Vulnerable symbols
found" list). `-s -w` removes the DWARF debug info and symbol table detail
govulncheck's binary-mode analysis uses to reconstruct which symbols are
actually reachable from the entry point; without it, the tool falls back to
reporting every vulnerable symbol *present in the binary's symbol table at
all*, which is closer to a `-scan=package`-level result than a
`-scan=symbol`-level one, even though the command line asked for the same
default. This is a genuinely counter-intuitive result worth stating plainly
in the skill: **stripping a release binary makes its own govulncheck
binary-mode audit less precise, not more secure.**

**What this means for the fleet's two use cases**: (1) auditing an *upstream*
binary the fleet mirrors (§5.1 of [config-inventory](../go-audit/config-inventory.md))
— the fleet mirrors bazelbuild's Go binaries as raw per-platform artifacts,
verified today only by `github_asset_digest: true`
(`mirror-bazelbuild@713abea9fbb8:mirror-base.yml:23-24`), with **no**
govulncheck step anywhere in that pipeline. `-mode=binary` against the
mirrored artifact is a real, addable check, and it works whether or not the
upstream build was stripped — it will just be less precise if it was. (2)
auditing a binary the fleet **ships**: run `-mode=source` in CI (it has the
`go.mod`); run `-mode=binary` against the *exact release artifact*
(including its `-s -w`/`-trimpath` flags) as a second gate immediately
before signing, accepting that this pass is coarser by construction — never
substitute it for the source-mode CI gate.

### 7. depguard as the enforcement mechanism for the superseded table

`OpenPeeDeeP/depguard`'s config shape (read this dive, current
`master` README) — the standalone tool's YAML/JSON/TOML `deny` is a flat map
of package-prefix → suggestion string:

```yaml
deny:
  reflect: "Who needs reflection"
```

**Inside golangci-lint v2** the same linter's config is a structured list
(golangci's schema does not support depguard's native map form), per its own
docs and matching the exemplar corpus:

```yaml
linters:
  settings:
    depguard:
      rules:
        main:
          files: ["$all"]
          deny:
            - pkg: "github.com/pkg/errors"
              desc: "use stdlib errors + fmt.Errorf(\"%w\") instead"
            - pkg: "io/ioutil"
              desc: "replaced by io and os since Go 1.16"
```

`files` accepts glob patterns plus the built-in variables `$all`/`$test`
(negatable with `!`); `deny`/`allow` both do prefix matching, `$`-suffixable
for exact-match-only. There is **no built-in default deny list** — every
entry above is an opt-in configuration choice, which is exactly why the
map's measured finding matters: `depguard` already denies `io/ioutil` and
`pkg/errors` in ≥3 exemplars ([gates §1](../go-audit/exemplar-quality-gates.md)),
so this is precedent, not invention.

**Watched red/green**
(`fixtures/dependency-hygiene/depguard-{violation,clean}/`, identical
`.golangci.yml` denying both `github.com/pkg/errors` and `io/ioutil`):

```
$ cd depguard-violation && golangci-lint run ./...    # exit 1
main.go:5:2: import 'io/ioutil' is not allowed from list 'main': replaced by io and os since Go 1.16 (depguard)
main.go:7:2: import 'github.com/pkg/errors' is not allowed from list 'main': use stdlib errors + fmt.Errorf("%w") instead (depguard)
2 issues:
* depguard: 2

$ cd depguard-clean && golangci-lint run ./...         # exit 0
0 issues.
```

**Rule**: every entry in §3's superseded table that has a stable import path
(all of them except the `gorilla/mux`/`go-multierror` design-review rows)
belongs in the fleet's shared `depguard` config as a `deny` entry with a
one-line `desc` naming the replacement — this is the single mechanical gate
that makes the whole table self-enforcing in CI rather than a document
nobody re-reads.

### 8. `go build -mod=readonly`: the tamper-evident build default

`-mod=readonly` is the effective default for any module whose `go` line is
1.16+ (which is all of them here) unless overridden; the useful fact is
what it actually *catches*, watched directly
(`fixtures/dependency-hygiene/readonly-{violation,clean}/`):

```
$ cd readonly-violation && go build -mod=readonly ./...   # exit 1
main.go:6:2: cannot find module providing package github.com/google/uuid: import lookup disabled by -mod=readonly

$ cd readonly-clean && go build -mod=readonly ./...        # exit 0
```

The violating fixture is a hand-edited `main.go` that imports
`github.com/google/uuid` with an untouched, un-tidied `go.mod`/empty
`go.sum` — exactly the state a developer leaves behind after adding an
import and forgetting `go mod tidy`, or after a merge conflict resolution
that dropped a `require` line. `-mod=readonly` refuses to *silently* add the
missing requirement (which plain `-mod=mod`, the pre-1.16 default, would
do) and instead fails loudly with the exact `go get` command needed. **This
is the mechanism M-L-09's `go mod tidy -diff` CI check exists to make
unnecessary to hit in practice** — `-mod=readonly` is what actually runs
during `go build ./...` in CI; `go mod tidy -diff` is the pre-emptive check
that would have caught the same drift before a build even ran (measured at
6/32 exemplars in CI, [gates §3](../go-audit/exemplar-quality-gates.md), 2 of
those 6 already on the modern non-destructive `-diff` form:
`cli/cli@9b031151a825:.github/workflows/lint.yml:41`,
`golangci/golangci-lint@032d962e0399:.github/workflows/pr-checks.yml:18-30`
using `--diff`).

### 9. The SDK's zero-runtime-dependency check

ocx-sdk-python's commitment is `dependencies = []` in `pyproject.toml`,
enforced structurally by the packaging tool
([config-inventory §3](../go-audit/config-inventory.md)). Go has no
`pyproject.toml`-equivalent declared-empty-dependencies field to check
against — `go.mod`'s `require` block legitimately lists test-only
dependencies too (e.g. `go-cmp`), so "the `require` block is non-empty" is
not itself a violation. The check has to distinguish *runtime* reachability
from *test-only* reachability, and `go list` already carries exactly the
field needed:

```
$ mod=$(go list -m)
$ go list -deps -f '{{if not .Standard}}{{.ImportPath}}{{end}}' ./... \
    | grep -v -e "^${mod}\$" -e '^$'
```

`{{.Standard}}` is a real field on `go list`'s `Package` struct (true for
every stdlib package); filtering it out and then filtering out the module's
own import path leaves exactly the non-stdlib packages the module's
*production* build depends on. Note this command as written includes
`_test.go`-only imports too (`go list -deps` on `./...` compiles test
binaries' dependencies along with everything else) — for a stricter
production-only check, drop `_test.go`-only packages first via `go list -f
'{{.GoFiles}}'` filtering, or simply keep test-only deps (`go-cmp`) declared
under a `tools.go`-style build-tag-gated file so they never appear in the
default `./...` walk of the SDK's own package.

**Watched red/green** (`fixtures/dependency-hygiene/zero-runtime-dep-{violation,clean}/`):

```
# violation: lib.go imports github.com/google/uuid
$ go list -deps -f '{{if not .Standard}}{{.ImportPath}}{{end}}' ./... | grep -v -e "^${mod}\$" -e '^$'
github.com/google/uuid
$ echo $?
0

# clean: lib.go imports only crypto/rand
$ go list -deps -f '{{if not .Standard}}{{.ImportPath}}{{end}}' ./... | grep -v -e "^${mod}\$" -e '^$'
$ echo $?
1
```

Empty output means the pass; this is a direct, mechanical, exit-code-driven
answer to owner question 2 (SDK stays stdlib-only at runtime, `go-cmp`
test-only) — no third-party linter needed.

### 10. GOPRIVATE / GONOSUMDB / GONOPROXY / GOAUTH

From [go.dev/ref/mod](https://go.dev/ref/mod) and [go.dev/doc/toolchain](https://go.dev/doc/toolchain)
(both confirmed via [ecosystem-tooling §3](../go-topic-map/ecosystem-tooling.md)):

- `GOPRIVATE` is a comma-separated glob list (Go's `path.Match` syntax) of
  module-path prefixes; setting it **implies both** `GONOPROXY` and
  `GONOSUMDB` for matching paths — a private module neither transits the
  public proxy nor gets checksum-verified against the public sumdb.
- `GONOPROXY`/`GONOSUMDB` exist to be set *independently* of `GOPRIVATE` when
  the two need to differ (e.g. route through an internal proxy but still
  checksum-verify).
- `GOAUTH` (Go 1.24+) controls how the `go` command authenticates outbound
  requests to private proxies/VCS hosts. Three modes: `off` (no auth
  headers at all), **`netrc`** — the **default** — (reads `~/.netrc`),
  `git <dir>` (shells out to `git credential fill`, the right choice for a
  CI job with an ambient credential helper already configured).
- The failure mode worth naming: a repo does not need to explicitly set
  `GOAUTH` to be "secure by default" (the default is `netrc`, not `off`) —
  but a CI job that has *no* `~/.netrc` and no git credential helper wired
  up and expects private-module fetches to "just work" will get a fetch
  failure, not a silent unauthenticated fetch. The dangerous
  misconfiguration is the opposite of the intuitive one: setting `GOAUTH=off`
  explicitly (e.g. copy-pasted from an old CI recipe) to "simplify" a
  private-module job actively disables the auth that would otherwise have
  worked.

**Rule**: a fleet CI job that fetches a private Go module sets `GOPRIVATE`
to the fleet's own module-path prefix (never leaving private-repo paths to
transit `proxy.golang.org`/`sum.golang.org` by accident) and relies on
`GOAUTH`'s `netrc` default plus a properly configured git credential helper
— it does not need to touch `GOAUTH` explicitly unless the CI environment's
credential wiring is `git credential fill`-based, in which case `GOAUTH=git
<dir>` is named explicitly rather than assumed.

### 11. Dependabot/Renovate grouping and review policy

Measured directly ([modrel §5](../go-audit/exemplar-modules-and-release.md)):
Dependabot with a `gomod` ecosystem block in 24/35 exemplars (69%); grouping
(the `groups:` key, batching multiple bumps into one PR) present in 18 of
those 24. **Two repos configure Dependabot for `github-actions` only, with
no `gomod` entry at all**: `uber-go/zap`
(`uber-go/zap@4892335e05f1:.github/dependabot.yml` — a single
`package-ecosystem: "github-actions"` block) and
`kubernetes-sigs/controller-runtime` — spot-checked directly, a real gap,
not a grep miss. Only one repo, `prometheus/prometheus`, uses Renovate
(`renovate.json` at root) instead of Dependabot.

**Rule**: "the repo has a `dependabot.yml`" is not evidence Go dependencies
are on any update cadence at all — a reviewer checks specifically for a
`package-ecosystem: "gomod"` block, not just the file's existence. Grouped
updates (one PR per logical batch, e.g. all `golang.org/x/*` together)
reduce review fatigue and are the majority pattern (18/24) where Dependabot
is configured for Go at all; an ungrouped Dependabot config on a
dependency-heavy repo is itself a smell worth flagging (review fatigue is
exactly what causes bumps to get rubber-stamped or ignored). Per
[go.dev/doc/security/best-practices](https://go.dev/doc/security/best-practices):
every dependency update should be reviewed and tested before deployment —
"updating to the latest versions without thorough review can also be risky,
potentially introducing new bugs, incompatible changes, or even malicious
code" — auto-merge on a passing CI check is not the same thing as review.

### 12. CI patch currency and stdlib CVEs

`check-latest: true` on `actions/setup-go` forces the action to query
GitHub's release API for the newest matching patch instead of trusting its
own (potentially stale) local tool cache; measured at 10/32 exemplars with
a workflow ([gates §3](../go-audit/exemplar-quality-gates.md)) — a minority
practice. This matters concretely, not theoretically:
**CVE-2025-22871** — `net/http`'s chunked-transfer-encoding parser accepted
a bare `LF` (not the spec-required `CRLF`) as a chunk-size terminator, the
canonical request-smuggling shape when a stricter front-end disagrees with
Go's parser about where one request ends; affected 1.23.0–1.24.1, fixed in
**1.23.8/1.24.2** ([failure §14](../go-topic-map/failure.md)). A CI job
pinned to a cached `1.24.1` toolchain (no `check-latest`) builds and tests
cleanly against every one of its own dependencies while shipping a binary
with a live stdlib smuggling bug — the fix is entirely in a point-release
`go` binary the project's own code never touches.

**Rule**: `go-upgrade`'s toolchain-currency step is not "bump the `go` line
occasionally" — it is "track the *latest patch* of each of the two
currently-supported Go releases (today 1.27.x and 1.26.x), because a stdlib
CVE fix lands only in a point release, never as a separate library
update." `check-latest: true` on `actions/setup-go`, or an equivalent
explicit patch-version pin refreshed on a schedule, is the mechanical
answer; a literal `go-version: '1.27'` with no patch and no `check-latest`
silently rides whatever patch the action's cache happened to have.

## Normative guidance candidates

1. **A library's `go.mod` carries no `replace` directive**, except a
   local-path self-reference inside a genuine multi-module monorepo whose
   modules are built and tested together.
   Rationale: `replace` is ignored the instant the module is someone else's
   dependency (§1) — a library relying on one is broken for every consumer
   without any error.
   Verify: `grep -n '=>' go.mod` in the library's root — non-empty output
   is the finding.
   Run: **yes** —
   `fixtures/dependency-hygiene/replace-smell-{violation,clean}/go.mod`,
   exit 0 (found → flag) vs. exit 1 (empty → pass); mechanism also
   confirmed with a real three-module build (§1).

2. **A depguard `deny` rule enforces the superseded-module table** (§3) in
   the shared golangci-lint config: `github.com/pkg/errors`, `io/ioutil`,
   `github.com/golang/mock`, `golang.org/x/exp` (once past go 1.21),
   `github.com/satori/go.uuid`, `github.com/ghodss/yaml`, `gopkg.in/yaml.v2`
   each with a one-line `desc` naming the replacement.
   Rationale: a document nobody re-reads is not a gate; `depguard` is.
   Verify: `golangci-lint run ./...` with `depguard` enabled and the deny
   list configured — a failing import exits non-zero with the exact `desc`
   text.
   Run: **yes** — `fixtures/dependency-hygiene/depguard-{violation,clean}/`,
   exit 1 (2 issues) vs. exit 0.

3. **`govulncheck ./...` (default `-scan symbol`, text format) is a
   required, separate CI step**, distinct from any golangci-lint run, and
   text format (not `json`/`sarif`) is what actually fails the build.
   Rationale: `-format json`/`-format sarif` return success regardless of
   findings — only `text` fails the job
   ([govulncheck-action README](https://github.com/golang/govulncheck-action)).
   Verify: the CI step's own exit code on `text` format output; a
   `json`/`sarif` step needs an explicit downstream check of the output
   content.
   Run: **yes** — `fixtures/dependency-hygiene/govuln-{reachable,unreachable}/`,
   `-scan=symbol` exit 3 (reachable) vs. exit 0 (imported-only, unreachable).

4. **A `govulncheck` finding with an `Example traces found:`/call-trace
   block is upgrade-required before release; a finding with none is
   scheduled, never blocking**, and the fix for either is a version bump —
   never a `replace` to a patched fork.
   Rationale: measured 14% reachability rate across 6 real repos means a
   module-level-only gate would create unactionable noise at 7x the real
   rate ([modrel §2](../go-audit/exemplar-modules-and-release.md)); a
   `replace`-based fix is invisible to every consumer of the fleet's own
   module (§1).
   Verify: `govulncheck -scan symbol ./...` output's presence/absence of a
   trace block, per finding.
   Run: **yes** — same fixture pair as #3, reachable case shows
   `main.go:10:24: govulndemo.main calls language.Parse`; unreachable case
   shows none.

5. **`go build -mod=readonly ./...` (or the implicit 1.16+ default) is the
   CI build command, never a bare `go build` with `-mod=mod` forced on.**
   Rationale: `-mod=mod` silently patches `go.mod`/`go.sum` to make a
   broken build pass instead of failing it — the CI signal a stale
   `go.mod` should produce.
   Verify: `go build -mod=readonly ./...` exit code.
   Run: **yes** — `fixtures/dependency-hygiene/readonly-{violation,clean}/`,
   exit 1 ("import lookup disabled by -mod=readonly") vs. exit 0.

6. **The SDK's runtime import graph contains zero non-stdlib packages**,
   checked mechanically, not by policy statement alone.
   Rationale: mirrors ocx-sdk-python's `dependencies = []`; Go has no
   declarative equivalent, so the check has to walk `go list -deps` and
   filter `.Standard`.
   Verify: `mod=$(go list -m); go list -deps -f '{{if not .Standard}}{{.ImportPath}}{{end}}' ./... | grep -v -e "^${mod}\$" -e '^$'`
   — empty output is the pass.
   Run: **yes** — `fixtures/dependency-hygiene/zero-runtime-dep-{violation,clean}/`,
   exit 0 (found `github.com/google/uuid`) vs. exit 1 (empty).

7. **`retract`, never a force-push or a same-version edit, is the fix for a
   bad fleet-published tag**, and it must ship in the *next* tag with a
   human-readable reason comment.
   Rationale: retraction is invisible until a higher version publishes it;
   the comment is the only signal a downstream `go get -u` reads.
   Verify: `go list -m -retracted -f '{{.Version}} Retracted={{.Retracted}}' <module>@<bad-version>`
   before and after the fix tag ships.
   Run: **yes** — `fixtures/dependency-hygiene/retract-demo/{proxy-before,proxy-after}/`,
   `Retracted=[]` before v1.0.2, `Retracted=[published with a data-loss bug]`
   after.

8. **Every Dependabot/Renovate config for a Go repo is checked specifically
   for a `gomod`/Go ecosystem block**, not assumed present because the file
   exists; grouped updates are preferred over one-PR-per-bump.
   Rationale: `uber-go/zap` and `kubernetes-sigs/controller-runtime` both
   ship a `dependabot.yml` that covers `github-actions` only — file
   presence is not coverage.
   Verify: `grep -n 'gomod' .github/dependabot.yml` (or the Renovate
   equivalent, `"gomod"` package manager entries in `renovate.json`) —
   empty output is the finding, not the pass, for this one check (absence
   of `gomod` when the repo has Go code is the violation).
   Run: **no** — reading heuristic only; a red/green fixture pair would
   need two full Dependabot config files with no way to execute Dependabot
   itself locally, so this is verified by direct inspection of the two
   named real repos' files, not a planted fixture.

9. **CI pins Go via `actions/setup-go` with `check-latest: true`** (or an
   explicit patch pin refreshed on the same cadence as the CI config
   itself), never a bare minor-version string trusting the action's cache.
   Rationale: a stdlib CVE (CVE-2025-22871) is fixed only in a point
   release; a stale cached toolchain builds cleanly while shipping the bug.
   Verify: `grep -n 'check-latest' .github/workflows/*.yml` — but this only
   confirms the *setting*, not that the resolved version is actually
   current; the stronger check is `go version` inside the CI job compared
   against `go.dev`'s current release JSON.
   Run: **no** — reading heuristic; no fixture can meaningfully "watch a
   stale GitHub Actions cache go red" outside a real GitHub Actions run.

10. **`GOPRIVATE` is set to the fleet's own module-path prefix on any CI job
    that fetches a private module; `GOAUTH` is left at its `netrc` default
    unless the CI credential wiring is git-credential-helper-based, in
    which case it is set to `git <dir>` explicitly — never set to `off`.**
    Rationale: `GOPRIVATE` implies both `GONOPROXY` and `GONOSUMDB`, so
    unset it leaks private-repo paths to the public proxy/sumdb by
    omission, not by an explicit insecure choice; `GOAUTH=off` is the one
    explicit misconfiguration that actively disables auth that would
    otherwise have worked.
    Verify: `grep -rn -e 'GOPRIVATE' -e 'GOAUTH' .github/workflows/` for
    presence/value; no dynamic check possible without a real private
    registry.
    Run: **no** — reading heuristic only; documented directly from
    [go.dev/ref/mod](https://go.dev/ref/mod) and
    [go.dev/doc/toolchain](https://go.dev/doc/toolchain), no fixture
    plausible without an actual private module host.

## Verification runs

All commands below ran on the installed toolchain (`go version go1.27.1
linux/amd64`, `golangci-lint` 2.14.0) via
`/home/mherwig/.cache/research-lang/go-tools/run.sh`, under
`/home/mherwig/.cache/research-lang/go-tools/fixtures/dependency-hygiene/`.

**1. `replace` ignored by a consumer — mechanism, not a grep check**
(`replace-ignored/{dep-real-src,dep-fork,liba,consumer,proxy}/`)
```
cd replace-ignored/liba
GOFLAGS=-mod=mod GOPROXY="file://$PWD/../proxy,direct" GOSUMDB=off go run ./cmd/print
→ FORK-SHOULD-NOT-LEAK-TO-CONSUMER      (liba is main module: its own replace applies)

cd replace-ignored/consumer
GOFLAGS=-mod=mod GOPROXY="file://$PWD/../proxy,direct" GOSUMDB=off go run .
→ REAL                                  (consumer is main module: liba's replace is ignored)
```
Both runs exit 0; the *content* they print, not an exit code, is the
evidence. This demonstrates the mechanism the grep rule (below) exists to
prevent someone from relying on.

**2. `replace` smell — grep check, red/green**
(`replace-smell-{violation,clean}/go.mod`)
```
$ grep -n '=>' replace-smell-violation/go.mod
7:replace example.com/dep => ../dep-fork
$ echo $?
0

$ grep -n '=>' replace-smell-clean/go.mod
$ echo $?
1
```

**3. `retract` delay — `go list -m -retracted`, before/after**
(`retract-demo/{proxy-before,proxy-after}/`)
```
$ GOPROXY="file://$PWD/proxy-before,off" GOSUMDB=off GOFLAGS=-mod=mod \
    go list -m -retracted -f '{{.Version}} Retracted={{.Retracted}}' example.com/retractdemo@v1.0.1
v1.0.1 Retracted=[]
$ GOPROXY="file://$PWD/proxy-before,off" go list -m -f '{{.Version}}' example.com/retractdemo@latest
v1.0.1

$ GOPROXY="file://$PWD/proxy-after,off" GOSUMDB=off GOFLAGS=-mod=mod \
    go list -m -retracted -f '{{.Version}} Retracted={{.Retracted}}' example.com/retractdemo@v1.0.1
v1.0.1 Retracted=[published with a data-loss bug]
$ GOPROXY="file://$PWD/proxy-after,off" go list -m -f '{{.Version}}' example.com/retractdemo@latest
v1.0.2
```
All four `go list` calls exit 0 (a query, not a gate); the *values* are the
evidence, contrasted before/after the same module's v1.0.2 gets published
into the proxy.

**4. govulncheck reachability — `-scan symbol` vs. `-scan package`/`module`**
(`govuln-reachable/`, `govuln-unreachable/`)
```
$ cd govuln-reachable && govulncheck -scan=symbol ./...   ; echo $?
… GO-2021-0113, trace: main.go:10:24: govulndemo.main calls language.Parse
3
$ govulncheck -scan=package ./...                          ; echo $?
… GO-2022-1059, GO-2021-0113 (no traces)
3
$ govulncheck -scan=module                                 ; echo $?
… 4 findings (GO-2026-5970, GO-2022-1059, GO-2021-0113, GO-2020-0015)
3

$ cd ../govuln-unreachable && govulncheck -scan=symbol ./... ; echo $?
No vulnerabilities found. (0 in your code; 2 in packages you import; 2 in modules you require)
0
$ govulncheck -scan=package ./...                            ; echo $?
… GO-2021-0113 and one more (no traces)
3
```
`-scan=module` with `./...` patterns errors with exit 2 ("patterns are not
accepted for module only scanning") — it must be run with no path argument
from inside the module directory.

**5. `-mode=binary` — normal vs. stripped**
(`govuln-reachable/bin-normal`, `bin-stripped`)
```
$ go build -o bin-normal .
$ go build -ldflags="-s -w" -o bin-stripped .
$ govulncheck -mode=binary bin-normal   ; echo $?
1 vulnerability (GO-2021-0113), "Vulnerable symbols found: #1: language.Parse"
3
$ govulncheck -mode=binary bin-stripped ; echo $?
4 vulnerabilities (adds GO-2026-5970, GO-2022-1059, GO-2020-0015), 5+ symbols listed, no call-graph narrowing
3
```

**6. depguard — `pkg/errors` + `io/ioutil` denial**
(`depguard-{violation,clean}/`)
```
$ cd depguard-violation && golangci-lint run ./... ; echo $?
main.go:5:2: import 'io/ioutil' is not allowed … (depguard)
main.go:7:2: import 'github.com/pkg/errors' is not allowed … (depguard)
2 issues: * depguard: 2
1

$ cd ../depguard-clean && golangci-lint run ./... ; echo $?
0 issues.
0
```

**7. `-mod=readonly` after a hand edit to `go.mod`**
(`readonly-{violation,clean}/`)
```
$ cd readonly-violation && go build -mod=readonly ./... ; echo $?
main.go:6:2: cannot find module providing package github.com/google/uuid: import lookup disabled by -mod=readonly
1

$ cd ../readonly-clean && go build -mod=readonly ./... ; echo $?
(no output)
0
```

**8. Zero-runtime-dependency check**
(`zero-runtime-dep-{violation,clean}/`)
```
$ cd zero-runtime-dep-violation
$ mod=$(go list -m)
$ go list -deps -f '{{if not .Standard}}{{.ImportPath}}{{end}}' ./... | grep -v -e "^${mod}\$" -e '^$' ; echo $?
github.com/google/uuid
0

$ cd ../zero-runtime-dep-clean
$ mod=$(go list -m)
$ go list -deps -f '{{if not .Standard}}{{.ImportPath}}{{end}}' ./... | grep -v -e "^${mod}\$" -e '^$' ; echo $?
(no output)
1
```

No proposed verification failed to go red on its planted violation; the two
rows marked "no" in the candidates list above (#8 and #9) are explicitly
reading-heuristic-only and are not counted among the 7 watched pairs.

## Exemplar evidence

- `syncthing/syncthing@94c3c1cdef71:go.mod` — the corpus's one non-local-path
  `replace` (two module→module fork swaps), the exact pattern §1's rule
  permits only when the repo *is* the main module for its own build
  ([modrel §1](../go-audit/exemplar-modules-and-release.md)).
- `kubernetes/kubernetes@dfd7b93a1783:go.mod:224`,
  `hashicorp/terraform@db4eef44f5bb:go.mod:350`,
  `etcd-io/etcd@7583cc6e7e27` (9 local replaces) — the legitimate
  local-path-self-reference shape.
- `grpc/grpc-go@acccf8cd101a:go.mod:46` — `retract [v1.74.0, v1.74.1]`,
  range syntax in real use.
- `charmbracelet/bubbletea@d5bfd5c2ff74:go.mod:3` — `retract v2.0.0-beta1`,
  a naming-mistake retraction with its reason comment intact.
- `cockroachdb/pebble`, `restic/restic`, `tailscale/tailscale` — the 3/35
  direct `github.com/pkg/errors` holdouts (§3).
- `ko-build/ko@fcaeb337b6bd` — the corpus's one reachable-in-a-direct-dependency
  govulncheck finding (`GO-2026-6348`, via `test/main.go:57:30`) plus a
  second reachable-only-via-subcommand-helper finding (`GO-2026-6225`, via
  `cmd/help/main.go:41:24`) — [modrel §2](../go-audit/exemplar-modules-and-release.md).
- `prometheus/prometheus` — direct dependency on all three `go.yaml.in/yaml`
  majors simultaneously, the corpus's starkest YAML-fragmentation example
  (§4).
- `uber-go/zap@4892335e05f1:.github/dependabot.yml`,
  `kubernetes-sigs/controller-runtime` — Dependabot configured for
  `github-actions` only, no `gomod` block (§11).
- `bazel-contrib/rules_go` — the corpus's one direct `github.com/golang/mock`
  reference, dev-only test dependency, on an archived upstream (§3).
- `cli/cli@9b031151a825:.github/workflows/lint.yml:41`,
  `golangci/golangci-lint@032d962e0399:.github/workflows/pr-checks.yml:18-30`
  — two of the six `go mod tidy` diff-checking exemplars already on the
  modern `-diff`/`--diff` form rather than a destructive tidy-then-diff
  shell dance (§8's precedent).
- `mirror-bazelbuild@713abea9fbb8:mirror-base.yml:23-24` — the fleet's own
  existing verification of upstream Go binaries
  (`github_asset_digest: true`), with **zero** govulncheck step anywhere in
  that pipeline today — the gap §6 names as addable.

## AI-agent angle

- **Assuming a library's `replace` reaches its consumers.** An LLM asked to
  "pin a dependency to a patched fork" for a *library* will reach for
  `replace` by analogy with an application's `go.mod` — it works when
  tested standalone (the library is the main module in that test) and is
  silently a no-op the moment anyone imports the library. Mechanical check:
  `grep -n '=>' go.mod` in any file whose package is imported by something
  else (i.e., not a `cmd/`-only, non-importable binary module).
- **Assuming `retract` un-publishes or takes effect immediately.** Trained
  on package-manager conventions from other ecosystems (`npm unpublish`,
  deleting a GitHub release), a model will often describe `retract` as
  removing the bad version. It does not, and it does nothing at all until a
  *new, higher* version ships carrying the directive. Mechanical check: for
  a `retract vX` diff, confirm the module's current tag is higher than `X`
  before claiming the retraction is "live."
- **`io/ioutil`, `github.com/pkg/errors`, `golang/mock`, `x/exp/{slices,maps}`
  from pre-2021 training data.** All four are default-suggested by models
  trained heavily on older Stack Overflow/tutorial content. Mechanical
  check: the depguard deny list in §7/§3, watched red on exactly this
  pattern.
- **`github.com/google/uuid` reflexively, even on a `go >= 1.27` module,
  and — the more dangerous direction — assuming the stdlib `uuid` package
  has the *same* surface as `google/uuid` and hallucinating `NewV6`,
  `NewSHA1`, or `Validate` on it.** The stdlib package is real but
  deliberately narrower (§3) — a model asked to "use the new stdlib uuid
  package" for a namespaced/hash-based UUID will invent an API that
  doesn't exist. Mechanical check: `go build`/`go vet` fails immediately on
  the hallucinated symbol; the real fix is checking the actual exported
  names in `$(go env GOROOT)/src/uuid/uuid.go` before claiming coverage.
- **Treating `go.uber.org/automaxprocs` as still necessary on any Go
  version**, or the opposite error — stripping it from a `go 1.24` or
  earlier module because "the runtime handles it now." Mechanical check:
  the `go` line in `go.mod` gates this, not the Go version installed on the
  machine doing the review — `grep` the `go` directive before flagging the
  import.
- **`-format json`/`-format sarif` on govulncheck "because CI needs
  structured output," without realizing that format change also silently
  disables the exit-code gate.** A model wiring up a govulncheck CI step for
  a dashboard will reach for JSON output and assume the job still fails on
  a finding — it does not (§5, §11's normative rule #3). Mechanical check:
  a planted reachable vulnerability with `-format json` must be paired with
  an explicit `jq`/grep check of the output for the job to actually fail;
  without it, the step is decorative.
- **Reaching for `replace` as "the fix" for a govulncheck finding.** A
  model told "there's a vulnerability in dependency X" will sometimes
  propose `replace X => github.com/someone/patched-fork` instead of an
  upgrade — which not only doesn't fix anything for the fleet's own module's
  consumers (§1) but also means the module never gets the real upstream fix
  and drifts further from it release over release. Mechanical check: any
  `replace` targeting a non-local path that isn't already a
  documented, deliberate fork (like syncthing's) is itself the finding.

## Contested / evolving

- **`google/uuid` vs. stdlib `uuid` at `go >= 1.27`**: this dive found the
  stdlib package real, live, and narrower in surface than `google/uuid`.
  As of 2026-09-26 this is a first-minor-release stdlib package (Go 1.27,
  released August 2026) with essentially no ecosystem migration data yet —
  no exemplar in this corpus has adopted it (all 9 direct `google/uuid`
  users predate its existence). The direction (adopt at go≥1.27 for the
  common `New`/`Parse` case) is a reasoned recommendation from reading the
  source, not yet a measured migration trend; revisit once exemplars start
  showing it.
- **`go.yaml.in/yaml` vs. `gopkg.in/yaml.v3`**: already ahead in this
  corpus's direct-adoption count (9 vs. 5) despite being the newer,
  less-established name — trending decisively toward `go.yaml.in` as the
  answer to "which YAML library," but `gopkg.in/yaml.v3` is not broken and
  will not disappear; this is a "prefer the new one going forward," not a
  "migrate existing code urgently" recommendation.
- **`sigs.k8s.io/yaml`'s scope**: some practitioner sources treat it as a
  general YAML-library alternative rather than the JSON-tag-compatibility
  bridge it actually is; a rule that recommends it outside that specific
  use case (a type already carrying `json:"…"` tags) is over-claiming its
  purpose.
- **`GOAUTH`'s rollout**: 1.24+ only (February 2025); the corpus's
  `go` directive census shows the majority of exemplars are already on 1.26+
  ([modrel §1](../go-audit/exemplar-modules-and-release.md)), so this is not
  a forward-looking concern, but no exemplar was found in this dive setting
  `GOAUTH` explicitly — the default is evidently sufficient for the corpus's
  public-module-only dependency graphs, and private-module CI wiring
  remains an under-observed practice here.
- **`-mode=binary` precision loss on stripped binaries** (§6): this dive's
  finding (4 findings vs. 1, no call traces) is a direct observation on one
  fixture, not a documented, stated behavior in govulncheck's own docs —
  worth flagging to the govulncheck team as a documentation gap rather than
  treating as unstated-but-permanent behavior; a future govulncheck release
  could plausibly improve stripped-binary symbol reconstruction.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/ref/mod §replace](https://go.dev/ref/mod#go-mod-file-replace) | Primary — Modules Reference | current, 2026-09-26 fetch | Authoritative: main-module-only scope, require-pairing requirement, go.work override precedence |
| [go.dev/ref/mod §retract](https://go.dev/ref/mod#go-mod-file-retract) | Primary — Modules Reference | current | Authoritative: publish-higher-to-take-effect rule, range syntax, what retraction does/does not do |
| [go.dev/doc/security/vuln](https://go.dev/doc/security/vuln) | Primary — Go Security team overview | current | Vulnerability database pipeline, govulncheck's low-noise design philosophy, no-severity-label rationale |
| [go.dev/doc/security/best-practices](https://go.dev/doc/security/best-practices) | Primary — go.dev | current | Dependency-update review guidance, govulncheck CI integration pointer |
| [go.dev/blog/supply-chain](https://go.dev/blog/supply-chain) | Primary — Go blog | 2021, still current | `go.sum`/checksum-database mechanism, VCS-centric model, "no post-install execution" guarantee, "a little copying" proverb sourcing |
| [pkg.go.dev/golang.org/x/vuln/cmd/govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck) | Primary — tool's own doc comment | current | `-mode`/`-scan`/`-db`/`-format`/`-show` flag reference, exit-code semantics, source-vs-binary-mode distinction |
| [go.dev/blog/container-aware-gomaxprocs](https://go.dev/blog/container-aware-gomaxprocs) | Primary — Go blog | 20 Aug 2025 (Go 1.25) | Direct source for the `automaxprocs` supersession claim; explicitly credits and frames the handoff |
| [github.com/golang/govulncheck-action](https://github.com/golang/govulncheck-action) | Primary — tool's own README | current | The json/sarif-always-exits-0 gotcha, verbatim |
| [pkg.go.dev/gopkg.in/yaml.v2](https://pkg.go.dev/gopkg.in/yaml.v2) | Primary — package doc page | fetched 2026-09-26 | Confirms v3 is the highest tagged major, no explicit deprecation banner |
| [github.com/go-yaml/yaml](https://github.com/go-yaml/yaml) | Primary — upstream repo | archived 2025-04-01 | Original maintainer's own unmaintained-status statement |
| [pkg.go.dev/go.yaml.in/yaml/v3](https://pkg.go.dev/go.yaml.in/yaml/v3) | Primary — successor package doc | fetched 2026-09-26 | Confirms the community-successor-org framing and relationship to go-yaml/yaml |
| [pkg.go.dev/sigs.k8s.io/yaml](https://pkg.go.dev/sigs.k8s.io/yaml) | Primary — package doc | fetched 2026-09-26 | JSON-tag-compatibility mechanism, "permanent fork of ghodss/yaml" framing |
| [OpenPeeDeeP/depguard README](https://raw.githubusercontent.com/OpenPeeDeeP/depguard/master/README.md) | Primary — tool's own README | fetched 2026-09-26, repo active (pushed 2026-09-22) | Native config shape, `ListMode` semantics, `$gostd`/`$all`/`$test` variables |
| `gh api repos/golang/mock` (this dive) | Primary — GitHub REST API | queried 2026-09-26 | Directly confirms `archived: true`, `pushed_at: 2024-01-08` |
| `$(go env GOROOT)/src/uuid/uuid.go` (this dive, go1.27.1) | Primary — stdlib source | Go 1.27.1, Aug 2026 | Directly confirms the stdlib `uuid` package exists, its exact exported surface |
| [go-audit/exemplar-modules-and-release.md](../go-audit/exemplar-modules-and-release.md) | Internal audit — 35-repo measurement | 2026-09-26 | `replace`/`retract` census, dependency posture, the 6-repo govulncheck run this dive reproduced |
| [go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md) | Internal audit — 35-repo CI/lint measurement | 2026-09-26 | `check-latest`, `go mod tidy -diff`, depguard-in-the-wild counts |
| [go-audit/config-inventory.md](../go-audit/config-inventory.md) | Internal audit — fleet consumer inventory | 2026-09-26 | ocx-sdk-python's zero-runtime-dependency commitment; the fleet's actual upstream-Go-binary verification mechanism |
| [go-topic-map/shifts.md](../go-topic-map/shifts.md) | Internal scout — recent-shifts survey | 2026-09-26 | `automaxprocs`/GOMAXPROCS supersession detail, direct GitHub-API archived-status checks on 12 named libraries |
| [go-topic-map/failure.md](../go-topic-map/failure.md) | Internal scout — failure-mode survey | 2026-09-26 | CVE-2025-22871 detail and version-range |
| [go-topic-map/ecosystem-tooling.md](../go-topic-map/ecosystem-tooling.md) | Internal scout — tooling survey | 2026-09-26 | `GOPRIVATE`/`GOAUTH` mechanics, govulncheck-action json/sarif behavior |

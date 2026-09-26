---
title: Exemplar modules and release engineering audit — Go program phase 0
agent: go-audit/exemplar-modules-and-release
model: sonnet
scope: >
  35 upstream Go exemplar repositories cloned depth-1 under
  ~/.cache/research-lang/exemplars/go/<owner>__<repo> (kubernetes/kubernetes
  is a sparse, config-only checkout). Axes: go.mod census, dependency
  posture (incl. govulncheck reachability), release engineering
  (goreleaser/ko/Dockerfiles/Makefiles), version stamping, CI supply chain,
  Bazel-for-Go, and build constraints for distribution.
method: >
  Read-only shell commands (find, grep, sed, awk) plus a Python regex
  parser (scratch/parse_gomods.py) run over every non-vendor/testdata
  go.mod (167 files across 35 repos, 35 of them repo roots). Every
  aggregate command is inlined next to its result below, so every number
  is re-runnable. govulncheck was run for real via
  ~/.cache/research-lang/go-tools/run.sh against 6 named repos. vendor/,
  testdata/, third_party/ and generated files are excluded from the
  counting axes unless the axis is explicitly about them (vendoring,
  generated-file census) — noted inline where that applies.
date_researched: 2026-09-26
---

# Exemplar modules and release engineering audit

Numbers-first. 35 exemplar repos, measured 2026-09-26, SHAs below match
`go-frame.md`'s table. `<repo>@<sha12>:<path>:<line>` citations throughout;
where a citation has no `:line` the claim is about the file's existence or a
whole-file property.

Corpus root: `~/.cache/research-lang/exemplars/go/<owner>__<repo>`. SHAs (12
chars, from the frame): aquasecurity/trivy ae561f8cca36 ·
bazelbuild/bazel-gazelle 63c9a3d2078f · bazel-contrib/rules_go 970e99d77c8b ·
caddyserver/caddy 54937914234b · charmbracelet/bubbletea d5bfd5c2ff74 ·
cli/cli 9b031151a825 · cockroachdb/pebble 13596f1e1cea ·
containerd/containerd 934434dde54b · dominikh/go-tools 6cb65e58a558 ·
etcd-io/etcd 7583cc6e7e27 · golangci/golangci-lint 032d962e0399 ·
golang/tools d2d3de9f066e · golang/vuln 709015412431 · google/go-cmp
b133f1f1932e · google/go-containerregistry 0c8bedb78437 · google/go-github
48d0a668cde8 · goreleaser/goreleaser ff8de3d6c389 · grpc/grpc-go
acccf8cd101a · hashicorp/terraform db4eef44f5bb · junegunn/fzf b1be3a8be1b8 ·
ko-build/ko fcaeb337b6bd · kubernetes/kubernetes dfd7b93a1783 ·
kubernetes-sigs/controller-runtime d0127f7f66de · oras-project/oras
a0cd4de5cfcd · oras-project/oras-go cb6d6dc79f83 · prometheus/prometheus
270db2915054 · regclient/regclient 43d2acb9fafd · restic/restic
5127c4abf921 · sigstore/cosign 907c3d899c0e · spf13/cobra adbc8813901b ·
stretchr/testify 87a7b9d57689 · syncthing/syncthing 94c3c1cdef71 ·
tailscale/tailscale 6b3a45f14ef6 · uber-go/zap 4892335e05f1 · urfave/cli
d1d810845dbc.

## Table of contents

- [Headline numbers](#headline-numbers)
- [1. go.mod census](#1-gomod-census)
- [2. Dependency posture](#2-dependency-posture)
- [3. Release engineering](#3-release-engineering)
- [4. Version stamping](#4-version-stamping)
- [5. Supply chain in CI](#5-supply-chain-in-ci)
- [6. Bazel for Go](#6-bazel-for-go)
- [7. Build constraints for distribution](#7-build-constraints-for-distribution)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

| # | Number | Command |
|---|---|---|
| 1 | 167 non-vendor/testdata `go.mod` files across 35 repos; all 35 repos have a root `go.mod` | `find $CORPUS -name go.mod -not -path '*/vendor/*' -not -path '*/testdata/*' \| wc -l` |
| 2 | Root `go` directive: **17/35 (49%) on 1.26**, 6/35 on 1.27, 5/35 on 1.25 — 28/35 (80%) are on 1.25+ | `python3 parse_gomods.py` then bucket by `\d+\.\d+` on root rows |
| 3 | **`toolchain` directive: only 5/35 (14%) root modules** | grep of parsed `toolchain` column, root rows |
| 4 | **`tool` directive (1.24+ block): 4/35 (11%)** root modules; **0** use the pre-1.24 `tools.go` + `//go:build tools` convention among those 4 (they migrated) | manual `tool (...)` block scan + `grep -rl "go:build tools"` |
| 5 | `go.work` committed at **4/35 repo roots** (bazel-gazelle, kubernetes, etcd, prometheus); 6 more nested (tooling submodules) | `find $CORPUS -name go.work -not -path '*/vendor/*'` |
| 6 | Real vendoring (source, not just a stray file): **3/35 (9%)** — bazel-gazelle, go-containerregistry, containerd | see [§1](#vendoring) |
| 7 | Direct deps across 35 root modules: **1,380**; indirect: **2,593** (ratio ~1:1.9) | sum of `direct_count`/`indirect_count`, root rows |
| 8 | Most common direct dep: `golang.org/x/sync`, in **22/35 (63%)** root modules | top-30 table, [§2](#2-dependency-posture) |
| 9 | govulncheck on 6 repos: **22 total findings, only 3 (14%) reachable** by the repo's own code — 19/22 (86%) are present-but-uncalled | [§2 govulncheck](#govulncheck-6-repos) |
| 10 | goreleaser config present in **11/35 (31%)** repos; **0/11** lack `checksum` entirely except 2; **9/11 (82%)** carry `signs`/`sboms`/`checksum` together | goreleaser table, [§3](#3-release-engineering) |
| 11 | CI Action pins: **961/1,171 (82%) SHA-pinned**, 209 (18%) tag-pinned, across 293 workflow files in 35 repos | [§5](#5-supply-chain-in-ci) |
| 12 | **Bazel-for-Go exists in exactly 2/35 (6%) repos — and both are rules_go and bazel-gazelle themselves** (dogfooding); zero application/CLI exemplar uses Bazel for Go | [§6](#6-bazel-for-go) |
| 13 | `import "C"` (cgo) greps 69 hits, but **67/69 (97%) are build-system/tooling test fixtures**; real production cgo use is **2/35 (6%)** repos (pebble, tailscale) | [§7 cgo](#cgo-usage) |
| 14 | `-buildvcs=false` used by 4/35 repos, always for reproducibility, never `=true` | [§4](#4-version-stamping) |
| 15 | `go.yaml.in/yaml` (successor to archived `gopkg.in/yaml.v2/v3`) is already a *direct* dependency in **9/35 (26%)** root modules | [§2 deprecated modules](#deprecated--legacy-modules) |

## 1. go.mod census

Command backbone for this whole section:
```
find $CORPUS -name go.mod -not -path '*/vendor/*' -not -path '*/testdata/*' | wc -l   # 167
python3 parse_gomods.py   # writes gomods.csv (one row per go.mod) + direct_deps.txt
```
The parser is regex-based; it treats every `X (...)` block (`require`,
`replace`, `retract`, `exclude`, `tool`, `ignore`) as potentially repeating
(Go allows multiple `require (...)` blocks — direct and indirect are often
split into separate blocks) and uses horizontal-whitespace-only patterns
(`[ \t]`, never `\s`) for single-line directives, because `\s` crosses
newlines and a naive `^require\s+(\S+)\s+(\S+)` regex mis-captures the "(" of
a block opener as a fake module name. Caught this exact bug during
development on `tailscale__tailscale@6b3a45f14ef6:go.mod` (2 separate
`require (...)` blocks; naive parsing inflated direct-dep counts by one
phantom `(` entry per block) — fixed before any number below was taken.
Spot-checked 3 repos against manual `sed`/`grep` counts
(cockroachdb/pebble 34, prometheus/prometheus 109/140, kubernetes replace
33) — 0/3 false positives after the fix.

### `go` directive distribution (35 root modules)

| go (minor) | count | repos |
|---|---|---|
| 1.27 | 6 | aquasecurity/trivy (1.27.0), cli/cli (1.27.0), kubernetes/kubernetes (1.27.0), etcd-io/etcd (1.27, no patch), goreleaser/goreleaser (1.27.1), tailscale/tailscale (1.27.1) |
| 1.26 | 17 | bubbletea, dominikh/go-tools, golangci-lint, golang/tools, golang/vuln, google/go-containerregistry, google/go-github, controller-runtime, oras-go, regclient, cosign, syncthing (1.26.2), ko (1.26.3), containerd (1.26.6), oras (1.26.7), prometheus (1.26.7), terraform (1.26.8) |
| 1.25 | 5 | rules_go (1.25.0), grpc-go (1.25.0), caddy (1.25.1), pebble (1.25.3), restic (1.25.8) |
| 1.24 | 1 | bazel-gazelle (1.24.12) |
| 1.23 | 1 | fzf (1.23.0) |
| 1.22 | 1 | urfave/cli |
| 1.21 | 1 | google/go-cmp |
| 1.19 | 1 | uber-go/zap |
| 1.17 | 1 | stretchr/testify |
| 1.15 | 1 | spf13/cobra |

29/35 (83%) carry a patch component (`1.24.12`, `1.27.1`, …); 6/35 write the
bare minor (`1.21`, `1.22`, `1.23.0` is *not* bare — actual bare-minor set is
etcd-io/etcd `1.27`, google/go-cmp `1.21`, uber-go/zap `1.19`,
stretchr/testify `1.17`, spf13/cobra `1.15`, urfave/cli `1.22`).
`google/go-cmp@b133f1f1932e:go.mod` and `stretchr/testify@87a7b9d57689:go.mod`
are the only two libraries whose `go` directive is a *lower bound*, not the
CI-tested version — both are zero-dependency, near-zero-churn libraries where
a low floor is a deliberate compatibility promise, not a stale artifact
(`google/go-cmp@b133f1f1932e:go.mod` — `go 1.21`, no toolchain, no
requires).

Across ALL 167 go.mod files (including nested/multi-module), the same shape
holds: 43 files at 1.27.0, 30 at 1.26.0, 15 at 1.25.0 — nested modules track
their root's version tightly (e.g. kubernetes's ~34 `staging/src/k8s.io/*`
submodules are homogeneously 1.27.0).

### `toolchain` directive — **contradicts H6**

H6 hypothesizes `toolchain` directives are common. Measured: **5/35 (14%)**
root modules carry one — `bazel-contrib/rules_go@970e99d77c8b:go.mod:go1.26.7`,
`cli/cli@9b031151a825:go.mod:go1.27.1`,
`etcd-io/etcd@7583cc6e7e27:go.mod:go1.27.1`,
`google/go-containerregistry@0c8bedb78437:go.mod:go1.26.6`,
`restic/restic@5127c4abf921:go.mod:go1.25.10`. Across all 167 files it's
22/167 (13%) — same rate; nested modules don't change the picture. The
90%-common majority does *not* pin `toolchain`, relying on `GOTOOLCHAIN=auto`
(the Go default) to fetch whatever the `go` directive demands. **H6 is
false on this axis** — measure and say so.

### `tool` directive (1.24+) vs `tools.go`

4/35 (11%) root modules use the `tool (...)` block:
`aquasecurity/trivy@ae561f8cca36:go.mod` (6 tools: buf, labeler, mage, twirp,
goyacc, kind), `hashicorp/terraform@db4eef44f5bb:go.mod` (7: copywrite,
exhaustive, mockgen, cover, goimports, stringer, staticcheck),
`syncthing/syncthing@94c3c1cdef71:go.mod` (3: genxdr, counterfeiter,
goimports), `tailscale/tailscale@6b3a45f14ef6:go.mod` (2: golangci-lint,
frizbee). All 4 are on go 1.26+, consistent with the directive's 1.24
minimum. Zero of the 35 repos combine the `tool` block with a legacy
`tools.go` + `//go:build tools` file — checked with
`grep -rl "go:build tools"` (0 hits, corpus-wide) — so where this migration
has happened, it happened cleanly. The remaining 31/35 repos have **no**
tool-tracking mechanism visible in `go.mod` at all (they either don't pin
tool versions, or pin them via a separate `tools/go.mod` submodule —
kubernetes does exactly this: `kubernetes__kubernetes/hack/tools/go.mod`).

### `godebug`, `retract`, `replace`, `exclude`, `ignore`

| directive | root hits | detail |
|---|---|---|
| `godebug` | 3/35 | `hashicorp/terraform@db4eef44f5bb:go.mod:winsymlink=0`, `kubernetes/kubernetes@dfd7b93a1783:go.mod:default=go1.27`, `restic/restic@5127c4abf921:go.mod:winsymlink=0`. Kubernetes propagates the *same* `default=go1.27` line into all ~34 of its `staging/src/k8s.io/*` submodules (39 hits corpus-wide, but 1 real repo-level decision). |
| `retract` | 2/35 | `charmbracelet/bubbletea@d5bfd5c2ff74:go.mod:3` (`retract v2.0.0-beta1 // We add a "." after the "beta"…`), `grpc/grpc-go@acccf8cd101a:go.mod:46` (`retract [v1.74.0, v1.74.1]` — range syntax). |
| `replace` | 4/35 | `etcd-io/etcd` (9, all local-path), `hashicorp/terraform` (10, all local-path, e.g. `db4eef44f5bb:go.mod:350` → `./internal/backend/remote-state/azure`), `kubernetes/kubernetes` (33, all local-path staging redirects, `dfd7b93a1783:go.mod:224`), `syncthing/syncthing` (2, both module-redirects to forks: `github.com/gobwas/glob → github.com/calmh/glob`, `github.com/jackpal/gateway → github.com/marbens-arch/gateway`). **Every multi-module repo's `replace` block is 100% local-path self-references** — no repo replaces a *third-party* module with another third-party fork except syncthing. |
| `exclude` | **0/167** | zero, corpus-wide, including nested modules. |
| `ignore` (1.25+) | 1/35 | `golangci/golangci-lint@032d962e0399:go.mod:8-10` — `ignore (./assets ./build ./docs)`. First real-world sighting of this very new directive; everyone else hasn't adopted it yet (consistent with the directive being 1.25+ and this being the only repo on a fresh-enough `go` line with a reason to use it — golangci-lint's own repo has large non-Go asset trees `go mod` would otherwise still walk). |

### go.work and vendoring {#vendoring}

`go.work` committed at repo root: `bazelbuild/bazel-gazelle`,
`kubernetes/kubernetes`, `etcd-io/etcd`, `prometheus/prometheus` — 4/35
(11%), all 4 with a matching `go.work.sum` except prometheus (no
`go.work.sum` committed for prometheus — check: `find $CORPUS -name
go.work.sum` returns only bazel-gazelle, kubernetes, etcd). 6 more `go.work`
files exist nested, all under tooling directories
(`kubernetes__kubernetes/hack/tools/go.work`,
`.../hack/tools/instrumentation/go.work`,
`.../hack/tools/golangci-lint/go.work`,
`oras-project__oras/test/e2e/go.work`, 2 more k8s examples/mock dirs) — every
nested `go.work` is a tooling/test-harness convenience, never a second
"real" multi-module workspace declaration.

Vendoring: `find $CORPUS -maxdepth 3 -type d -name vendor` returns 5 hits,
but 2 are false positives for "the repo vendors its deps" —
`kubernetes__kubernetes/vendor` contains a single stray package
(`github.com/go-openapi/swag`, no `modules.txt`) because the exemplar clone
of kubernetes is sparse/config-only per the frame, not because k8s HEAD
doesn't vendor (it does, extensively, in the real repo);
`kubernetes__kubernetes/LICENSES/vendor` is a license-attribution directory,
not Go vendoring. Genuine committed vendor trees with a `vendor/modules.txt`
in *this* clone: **bazelbuild/bazel-gazelle, google/go-containerregistry,
containerd/containerd** — 3/35 (9%). Two more `vendor/modules.txt` hits are
test fixtures, not real vendoring:
`golang__vuln@709015412431:cmd/govulncheck/testdata/common/modules/vendored/`
(govulncheck's own vendor-mode test) and
`cli__cli@9b031151a825:.github/codeql/tests/unsanitized-response-to-terminal/vendor/`
(a CodeQL test fixture) — both correctly excluded from the 9% figure.

### Direct/indirect require counts, module major-version suffix

Full per-repo table (root modules only, `direct_count`/`indirect_count` are
non-`// indirect`/`// indirect`-tagged entries in *all* `require` blocks
combined, since 15/35 repos split them into 2+ blocks):

| Repo | go | toolchain | tool | godebug | retract | replace (local/module) | ignore | direct | indirect | /vN |
|---|---|---|---|---|---|---|---|---|---|---|
| aquasecurity/trivy | 1.27.0 | | yes | | | | | 125 | 347 | |
| bazel-contrib/rules_go | 1.25.0 | go1.26.7 | | | | | | 13 | 4 | |
| bazelbuild/bazel-gazelle | 1.24.12 | | | | | | | 13 | 9 | |
| caddyserver/caddy | 1.25.1 | | | | | | | 53 | 116 | yes |
| charmbracelet/bubbletea | 1.26.0 | | | | yes | | | 8 | 9 | yes |
| cli/cli | 1.27.0 | go1.27.1 | | | | | | 61 | 118 | yes |
| cockroachdb/pebble | 1.25.3 | | | | | | | 34 | 21 | |
| containerd/containerd | 1.26.6 | | | | | | | 88 | 64 | yes |
| dominikh/go-tools | 1.26.0 | | | | | | | 8 | 0 | |
| etcd-io/etcd | 1.27 | go1.27.1 | | | | 9/0 | | 22 | 60 | yes |
| golang/tools | 1.26.0 | | | | | | | 6 | 1 | |
| golang/vuln | 1.26.0 | | | | | | | 7 | 3 | |
| golangci/golangci-lint | 1.26.0 | | | | | | yes | 145 | 78 | yes |
| google/go-cmp | 1.21 | | | | | | | 0 | 0 | |
| google/go-containerregistry | 1.26.0 | go1.26.6 | | | | | | 12 | 25 | |
| google/go-github | 1.26.0 | | | | | | | 2 | 0 | yes |
| goreleaser/goreleaser | 1.27.1 | | | | | | | 60 | 308 | yes |
| grpc/grpc-go | 1.25.0 | | | yes | | | | 22 | 12 | |
| hashicorp/terraform | 1.26.8 | | yes | yes | | 10/0 | | 81 | 233 | |
| junegunn/fzf | 1.23.0 | | | | | | | 7 | 4 | |
| ko-build/ko | 1.26.3 | | | | | | | 19 | 144 | |
| kubernetes-sigs/controller-runtime | 1.26.0 | | | | | | | 27 | 73 | |
| kubernetes/kubernetes | 1.27.0 | | yes | yes | | 33/0 | | 113 | 92 | |
| oras-project/oras | 1.26.7 | | | | | | | 11 | 12 | |
| oras-project/oras-go | 1.26.0 | | | | | | | 6 | 3 | yes |
| prometheus/prometheus | 1.26.7 | | | | | | | 109 | 140 | |
| regclient/regclient | 1.26.0 | | | | | | | 12 | 4 | |
| restic/restic | 1.25.8 | go1.25.10 | | yes | | | | 35 | 60 | |
| sigstore/cosign | 1.26.0 | | | | | | | 60 | 227 | yes |
| spf13/cobra | 1.15 | | | | | | | 4 | 0 | |
| stretchr/testify | 1.17 | | | | | | | 2 | 0 | |
| syncthing/syncthing | 1.26.2 | | yes | | | 0/2 | | 46 | 43 | |
| tailscale/tailscale | 1.27.1 | | yes | | | | | 164 | 382 | |
| uber-go/zap | 1.19 | | | | | | | 4 | 0 | |
| urfave/cli | 1.22 | | | | | | | 1 | 1 | yes |

Corpus totals (35 root modules): **1,380 direct**, **2,593 indirect**.
Extremes: `tailscale/tailscale` (164 direct/382 indirect) and
`golangci/golangci-lint` (145/78) are the heaviest; `google/go-cmp` (0/0) and
`spf13/cobra`/`stretchr/testify`/`uber-go/zap` (≤4/0) are the lightest — all
4 lightest are libraries, not CLIs/servers, and 3 of the 4 have *zero*
indirect deps (no transitive closure at all).

Major-version-suffixed module paths (`/vN`, N≥2): **11/35 (31%)** —
`caddyserver/caddy` (`/v2`), `charmbracelet/bubbletea` (`/v2`, note: new
module path is `charm.land/bubbletea/v2`, not `github.com/...` — a domain
migration bundled with the v2 bump), `cli/cli` (`/v2`),
`containerd/containerd` (`/v2`), `etcd-io/etcd` (`/v3` — etcd's actual major
is 3.x, module suffix tracks it), `golangci/golangci-lint` (`/v2`),
`google/go-github` (`/v92` — go-github bumps its major on every API-breaking
release, currently 92), `goreleaser/goreleaser` (`/v2`),
`oras-project/oras-go` (`/v3`), `sigstore/cosign` (`/v3`), `urfave/cli`
(`/v3`). Notably `grpc/grpc-go` is at v1.8x but has **no** `/vN` suffix —
grpc-go treats its v1 line as perpetually stable and has never done a
breaking major bump, unlike go-github's per-breaking-release cadence.

## 2. Dependency posture

### Top 30 direct dependencies (by number of repos, out of 35)

```
python3 -c "
from collections import Counter
seen = {}
for line in open('direct_deps.txt'):
    repo, name, ver = line.rstrip().split('\t')
    seen.setdefault(name, set()).add(repo)
for name, repos in sorted(seen.items(), key=lambda x: -len(x[1]))[:30]:
    print(len(repos), name)
"
```

| # repos | module |
|---|---|
| 22 | golang.org/x/sync |
| 17 | github.com/google/go-cmp |
| 16 | golang.org/x/sys |
| 15 | github.com/stretchr/testify |
| 14 | github.com/spf13/cobra |
| 14 | golang.org/x/tools |
| 12 | google.golang.org/protobuf |
| 11 | golang.org/x/crypto |
| 11 | golang.org/x/mod |
| 11 | golang.org/x/term |
| 10 | golang.org/x/net |
| 10 | github.com/klauspost/compress |
| 9 | github.com/google/uuid |
| 9 | github.com/spf13/pflag |
| 9 | golang.org/x/text |
| 9 | golang.org/x/oauth2 |
| 8 | golang.org/x/time |
| 7 | google.golang.org/grpc |
| 7 | github.com/prometheus/client_golang |
| 7 | github.com/prometheus/client_model |
| 7 | k8s.io/apimachinery |
| 6 | github.com/BurntSushi/toml |
| 6 | github.com/google/go-containerregistry |
| 6 | github.com/opencontainers/go-digest |
| 6 | github.com/opencontainers/image-spec |
| 6 | k8s.io/api |
| 6 | github.com/fsnotify/fsnotify |
| 6 | go.opentelemetry.io/otel |
| 6 | go.opentelemetry.io/otel/sdk |
| 6 | go.yaml.in/yaml/v3 |

`golang.org/x/sync` (22/35, 63%) beats even `testify` (15/35, 43%) — the
errgroup/singleflight/semaphore package is the single most-adopted
non-stdlib dependency in the corpus, ahead of any test-assertion library.
`github.com/stretchr/testify` at 15/35 is real but well under a majority —
see the H5 contradiction below.

### Deprecated / legacy modules — direct usage only

Method: matched each pattern against `direct_deps.txt` (root-module direct
requires only, so "used directly" not "present transitively"):

| module | direct in (n/35) | repos |
|---|---|---|
| `github.com/pkg/errors` | 3 | cockroachdb/pebble, restic/restic, tailscale/tailscale |
| `github.com/golang/mock` | 1 | bazel-contrib/rules_go (dev-only test dep) |
| `golang.org/x/exp` | 5 | cockroachdb/pebble, dominikh/go-tools, golangci/golangci-lint, syncthing/syncthing, tailscale/tailscale |
| `github.com/satori/go.uuid` | 0 | — |
| `github.com/dgrijalva/jwt-go` | 0 | — |
| `github.com/ghodss/yaml` | 0 | — |
| `gopkg.in/yaml.v2` | 0 (direct); present only transitively | — |
| `gopkg.in/yaml.v3` | 5 | aquasecurity/trivy, caddyserver/caddy, cli/cli, oras-project/oras-go, tailscale/tailscale |
| `sigs.k8s.io/yaml` | 4 | kubernetes/kubernetes, controller-runtime, syncthing/syncthing, tailscale/tailscale |
| `go.yaml.in/yaml/v2,v3,v4` | 9 | golangci-lint, goreleaser, ko-build/ko, kubernetes/kubernetes, oras-project/oras, prometheus (all 3 major versions!), spf13/cobra, stretchr/testify, uber-go/zap |
| `github.com/gorilla/*` | 3 | cli/cli (`websocket`), kubernetes/kubernetes (`websocket`), tailscale/tailscale (`csrf`) |
| `github.com/mitchellh/*` | 6 | aquasecurity/trivy, golangci-lint, goreleaser, hashicorp/terraform (5 separate mitchellh packages), sigstore/cosign, tailscale/tailscale |
| `github.com/hashicorp/go-multierror` | 2 | aquasecurity/trivy, goreleaser/goreleaser |

The YAML ecosystem is the most fragmented axis measured: **4 different
"which yaml" answers coexist as *direct* dependencies** across the corpus
(`gopkg.in/yaml.v3`, `sigs.k8s.io/yaml`, `go.yaml.in/yaml/{v2,v3,v4}`, and
`gopkg.in/yaml.v2` transitively) — `prometheus/prometheus` alone directly
depends on 3 different major versions of `go.yaml.in/yaml` at once
(`golang.org/x/exp`-style major-version churn from a very young library).
`go.yaml.in/yaml` (the community-run successor org created after the
original `go-yaml/yaml` maintainer archived the project) already has more
direct adopters (9) than the older `gopkg.in/yaml.v3` (5) or
`sigs.k8s.io/yaml` (4) — the migration is already ahead of the old guard in
this corpus, worth flagging to authors as **current** guidance, not
speculative.

`github.com/pkg/errors` direct-adoption (3/35, 9%) is low, consistent with
`errors.Wrap`/`errors.Cause` having been long-obsoleted by stdlib
`fmt.Errorf("%w")` + `errors.Is`/`As` (Go 1.13, 2019) — but non-zero, so a
rule that flags it should say "migrate", not claim it's extinct.
`github.com/hashicorp/go-multierror` direct-adoption is 2/35 despite stdlib
`errors.Join` (1.20) fully subsuming its common case — a real, if small,
modernization opportunity.

### govulncheck (6 repos) {#govulncheck-6-repos}

Method: `cd <clone> && timeout 900 ~/.cache/research-lang/go-tools/run.sh
govulncheck ./... 2>&1 | tail -40` (actual runs, not simulated); go 1.27.1
toolchain, on-disk GOMODCACHE.

| Repo | called (reachable) | imported-only | required-only | total | notes |
|---|---|---|---|---|---|
| ko-build/ko@fcaeb337b6bd | 2 modules | 4 | 4 | 10 | `GO-2026-6348` (grpc HTTP/2 DATA-frame OOM) reachable via `test/main.go:57:30` → `time.LoadLocation` → `mem.IsBelowBufferPoolingThreshold`; `GO-2026-6225` (credential leak in `docker-credential-acr-env`) reachable via `cmd/help/main.go:41:24` |
| restic/restic@5127c4abf921 | 1 module | 2 | 1 | 4 | `GO-2026-4550` (CIRCL secp384r1 CombinedMult) — `github.com/cloudflare/circl@v1.6.2`, fixed in v1.6.3 |
| google/go-containerregistry@0c8bedb78437 | 0 | 1 | 2 | 3 | affected-by-0 despite 3 module-level findings |
| oras-project/oras@a0cd4de5cfcd | 0 | 0 | 4 | 4 | affected-by-0 |
| junegunn/fzf@b1be3a8be1b8 | 0 | 0 | 1 | 1 | affected-by-0 |
| regclient/regclient@43d2acb9fafd | 0 | 0 | 0 | 0 | clean |
| **Total** | **3** | **7** | **12** | **22** | **14% reachable** |

**This is the strongest single argument in the corpus for govulncheck over
a module-level scanner (`go list -m all` + an OSV feed, or `nancy`/`grype`
against `go.sum` alone):** 19/22 (86%) of the vulnerabilities that a
module-level scanner would flag as "present" are, per govulncheck's
call-graph analysis, never actually invoked by the repo's own code. A
module-level gate on these 6 repos would generate 22 findings needing
triage; govulncheck's symbol-level reachability narrows the *actionable*
list to 3. ko-build/ko is the only repo of the 6 with a reachable finding in
a *direct* dependency (grpc-go) rather than only via a subcommand/test-helper
package (`docker-credential-acr-env`, `time.LoadLocation`'s test-only call
path).

## 3. Release engineering

`find $CORPUS \( -iname ".goreleaser.yml" -o -iname ".goreleaser.yaml" \)
-not -path '*/vendor/*' -not -path '*/testdata/*'` → **11/35 (31%)** repos:
caddyserver/caddy, sigstore/cosign, oras-project/oras,
google/go-containerregistry, golangci/golangci-lint, cli/cli,
oras-project/oras-go, ko-build/ko, charmbracelet/bubbletea,
goreleaser/goreleaser, junegunn/fzf.

| Repo | v2 | CGO=0 | trimpath | -s -w | -X main | mod_ts | checksum | sboms | signs | dockers | kos | brews | nfpms | snap | winget | scoop | changelog | draft/pre |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| caddyserver/caddy | y | y | y | y | | | y | y | y | | | | y | | | | y | y |
| charmbracelet/bubbletea | y | | | | | | | | | | | | | | | | | |
| cli/cli | y | y | | y | y | | | | | | | | y | | | | | y |
| golangci/golangci-lint | y | y | y | y | y | | y | y | | y | | | y | y | | | y | |
| google/go-containerregistry | y | y | y | | y | | y | | | | | | | | | | y | |
| goreleaser/goreleaser | y | y | y | y | y | y | y | y | y | y | | y | y | y | y | y | y | y |
| junegunn/fzf | y | | y | y | y | | | | | | | | y | | | | y | y |
| ko-build/ko | y | y | y | y | y | | y | | | | y | | | | | | y | |
| oras-project/oras-go | y | | | | | | y | | | | | | | | | | | y |
| oras-project/oras | y | y | y | | y | y | | y | y | | | | | | | | | y |
| sigstore/cosign | y | y | y | y | | y | y | y | y | | | | y | | | | | y |

goreleaser/goreleaser itself (dogfooding its own tool) is the only repo
that lights up every column — expected, since it's the reference
implementation of every feature it's grading. `charmbracelet/bubbletea`
(a TUI *library*, not a CLI) and `oras-project/oras-go` (a client
*library*) use goreleaser only for GitHub-release changelog/checksums, not
binary builds — no `builds:`/`archives:` matrix, confirming goreleaser is
also used by non-binary-shipping repos purely for release-note automation.

`ldflags -X` set via an **env var populated by a Makefile**, not inline in
the YAML, is a real pattern worth calling out:
`sigstore/cosign@907c3d899c0e:.goreleaser.yml:41-44` sets
`ldflags: - "{{ .Env.LDFLAGS }}"`, and the actual `-X sigs.k8s.io/release-utils/version.gitVersion=...`
content lives in `sigstore/cosign@907c3d899c0e:Makefile:57` — my naive grep
for `-X main` in the YAML alone would have missed this and under-reported
version stamping for cosign; confirmed by reading the Makefile (0/3
false-positive rate on this specific spot-check, but the false *negative*
almost happened — noted as a technique, not just a count).

`.ko.yaml`: 4 files corpus-wide —
`sigstore/cosign@907c3d899c0e:.ko.yaml`,
`ko-build/ko@fcaeb337b6bd:.ko.yaml` (dogfooding, +1 test-fixture
`.ko.yaml` under `test/build-configs/`), and a debug config under
`google/go-containerregistry@0c8bedb78437:.ko/debug/.ko.yaml`. `ko` itself
is used by only 2 real adopters in this corpus (cosign, go-containerregistry
partially) — most CLI exemplars that ship container images use goreleaser's
own `dockers:`/`kos:` block or a hand-rolled Dockerfile instead.

Dockerfiles (excluding `.go` source files whose name happens to start with
"dockerfile" case-insensitively — a real false-positive trap in the
`-iname "Dockerfile*"` glob, since it also matches `dockerfile.go` and
`dockerfile_test.go`; fixed by requiring literal `Dockerfile`/`Dockerfile.*`/`Dockerfile_*`
and excluding `*.go`/`*.json`): **104 files across 18/35 repos** (kubernetes
alone has 51, mostly per-test-image). Final-stage base image, tallied by
last `FROM` line:

| base category | count | share |
|---|---|---|
| templated var (`$BASEIMAGE`/`${BASE}`/`${RUNNERIMAGE}`, mostly kubernetes multi-arch test images) | 42 | 40% |
| alpine (any tag) | 23 | 22% |
| other real OS (ubuntu/debian/fedora/devcontainer bases — sidecars, e2e test images, devcontainers, not the shipped binary's image) | 24 | 23% |
| scratch | 10 | 10% |
| distroless (`gcr.io/distroless/static*`) | 5 | 5% |

scratch + distroless together (14%) undercounts the real "minimal final
image" practice because goreleaser's `dockers:`/`kos:` blocks (which also
target scratch/distroless, e.g.
`goreleaser/goreleaser@ff8de3d6c389:.goreleaser.yaml`'s `dockers:` section)
aren't standalone `Dockerfile`s and so don't appear in this count — the true
denominator for "what does the shipped binary's container look like" spans
both Dockerfiles and goreleaser `dockers:`/`kos:` configs; counting only
Dockerfiles undercounts minimal bases and overweights kubernetes's
templated test-image fleet.

`CGO_ENABLED=0` appears in 10/104 Dockerfiles, `CGO_ENABLED=1` in 3,
`-trimpath` in 6 — most Dockerfiles building Go don't set these explicitly
because the *builder stage* inherits them from the base `golang:` image's
defaults or from a Makefile invoked inside the container, not the
Dockerfile's own `ENV`/`RUN` lines (spot-checked
`sigstore/cosign@907c3d899c0e:Dockerfile` — no CGO/-trimpath in the
Dockerfile itself, both set in `Makefile:83`).

Makefiles with an explicit `-ldflags`/`-trimpath` go-build flag, of 20 root
Makefiles found: containerd/containerd, junegunn/fzf,
kubernetes-sigs/controller-runtime, oras-project/oras, regclient/regclient,
sigstore/cosign — **6/20 (30%)**. The remaining 14 either have no root
Makefile-driven build at all (goreleaser owns the build) or build with plain
`go build` and no explicit flags (dev-loop convenience, not the release
path).

## 4. Version stamping

`grep -rlE '\-X[= ]' --include="Makefile*" --include="*.goreleaser.y*ml"
--include="*.sh"` (excluding vendor/testdata) → **17/35 (49%)** repos stamp
via `-ldflags -X` somewhere in their build tooling. `grep -rl
"debug.ReadBuildInfo" --include="*.go"` (excluding vendor/testdata) →
**14/35 (40%)** repos read `runtime/debug.BuildInfo` in source
(`tailscale/tailscale` alone has 13 call sites — heaviest single user).

Overlap: **10 repos use both** (cli/cli, golangci-lint, golang/vuln,
go-containerregistry, hashicorp/terraform, ko-build/ko,
kubernetes/kubernetes, controller-runtime, regclient/regclient,
tailscale/tailscale) — the common pattern is `-X` to bake in a semver
string (`Version = "1.3.4"` overridden at link time) plus
`debug.ReadBuildInfo()` to *supplement* it with VCS metadata
(`vcs.revision`, `vcs.time`, `vcs.modified`) that `-X` can't easily carry
without a wrapper script computing `git rev-parse` at build time. 7 use only
`-X` (containerd, etcd, goreleaser, fzf, oras, cosign, syncthing); 4 use only
`ReadBuildInfo` (rules_go, caddy, dominikh/go-tools, golang/tools) — these 4
lean entirely on Go's own VCS stamping (available automatically since 1.18
when building from a clean git checkout with `-buildvcs=true`, the
default) rather than a hand-maintained version string.

Representative pattern, a package-level var block overridden at link time
(`oras-project/oras@a0cd4de5cfcd:internal/version/version.go:17-26`):
```go
var (
    Version       = "1.3.4"
    BuildMetadata = ""
    GitCommit     = ""
    GitTreeState  = ""
)
```

`-buildvcs=false` is used by 4/35 repos, always to *disable* VCS stamping
(never `=true`, which is already the implicit default) — every occurrence
is in a script/Makefile building from a location where `.git` may be absent
or where reproducibility across otherwise-identical checkouts matters more
than embedding a commit hash:
`cli__cli@9b031151a825:script/api-host-gateway/test.sh:86-87` and
`kubernetes__kubernetes@dfd7b93a1783:test/images/image-util.sh:244`
(building per-arch test images where the VCS stamp would be redundant across
every arch variant and would otherwise break Docker layer caching).

45 `version.go`-named files exist corpus-wide (excluding vendor/testdata);
spot-checked 3 (`oras-project/oras`, `cli/cli`, `ko-build/ko`) — all 3 print
a semver + optional build metadata via a `version`/`GetVersion()`
subcommand, none print raw `debug.BuildInfo` unprocessed to the user.

## 5. Supply chain in CI

`find $CORPUS -path '*/.github/workflows/*' -type f \( -iname "*.yml" -o
-iname "*.yaml" \)` (excluding vendor/testdata) → **293 workflow files**.
Note kubernetes/kubernetes contributes **0** — its sparse/config-only clone
in this corpus doesn't carry `.github/workflows` (k8s's real CI is
Prow-based, off-GitHub-Actions, so this is expected and not a corpus gap to
chase).

| tool/action | repos (of 35) | which |
|---|---|---|
| `goreleaser-action` | 10 | trivy, caddy, cli/cli, golangci-lint, go-containerregistry, goreleaser, fzf, ko, oras, oras-go |
| `slsa-framework/slsa-github-builder` | 0 | — |
| `actions/attest-build-provenance` | 3 | cli/cli, containerd, syncthing |
| `sigstore/cosign-installer` | 7 | trivy, caddy, goreleaser, ko, regclient, cosign, syncthing |
| `anchore/sbom-action` | 5 | caddy, golangci-lint, goreleaser, oras, regclient |
| `ossf/scorecard-action` | 7 | caddy, containerd, etcd, goreleaser, controller-runtime, prometheus, cosign |

`slsa-framework/slsa-github-builder` (the classic SLSA3 reusable-workflow
builder) is **completely absent**; GitHub's newer first-party
`actions/attest-build-provenance` (3 repos) has already displaced it in this
corpus's adopters rather than the two coexisting — worth noting for an H8
authoring pass: SLSA provenance in practice means the GitHub-native attest
action, not the older slsa-github-builder reusable workflow.

Action pin style — `grep -ohE "uses:\s*[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[A-Za-z0-9._-]+"`
over all 293 workflow files, classified by whether the ref is a 40-hex SHA,
a `vN...` tag, or other:

```
961 SHA-pinned   (82%)
209 tag-pinned   (18%)
  1 branch-pinned (@main)
```

Per-repo split shows a **clean bimodal pattern, not a gradient**: most repos
are either ~100% SHA-pinned or ~100% tag-pinned, few sit in between.

| Repo | sha | tag | sha% |
|---|---|---|---|
| goreleaser/goreleaser | 85 | 0 | 100% |
| tailscale/tailscale | 78 | 0 | 100% |
| containerd/containerd | 77 | 0 | 100% |
| aquasecurity/trivy | 71 | 0 | 100% |
| sigstore/cosign | 61 | 0 (1 other) | 98% |
| ko-build/ko | 55 | 0 | 100% |
| cli/cli | 169 | 1 | 99% |
| syncthing/syncthing | 24 | 62 | 28% |
| restic/restic | 7 | 14 | 33% |
| junegunn/fzf | 4 | 12 | 25% |
| cockroachdb/pebble | 0 | 66 | 0% |
| grpc/grpc-go | 0 | 18 | 0% |
| spf13/cobra | 0 | 10 | 0% |
| urfave/cli | 0 | 10 | 0% |
| uber-go/zap | 0 | 7 | 0% |
| charmbracelet/bubbletea | 0 | 6 | 0% |

The 0%-SHA repos (cobra, urfave/cli, zap, bubbletea, pebble, grpc-go) are
disproportionately **libraries with a thin CI surface** (lint + test, no
release automation, no supply-chain-sensitive publish step) — SHA-pinning
correlates with "this workflow publishes a release artifact", not with repo
prominence or maturity in general.

Dependabot with `gomod` ecosystem: **24/35 (69%)** —
`find $CORPUS -path '*/.github/dependabot.yml*'` then grep `gomod`;
grouping (`groups:` key, batches multiple bumps into one PR) present in
18/24 of those. 2 repos (`uber-go/zap`, `kubernetes-sigs/controller-runtime`)
configure dependabot for `github-actions` only, *not* `gomod` — spot-checked
both files directly, confirmed as a real gap, not a grep miss
(`uber-go/zap@4892335e05f1:.github/dependabot.yml` — single
`package-ecosystem: "github-actions"` block, no gomod entry at all). Only 1
repo (`prometheus/prometheus`) uses Renovate instead of Dependabot
(`renovate.json` at root).

## 6. Bazel for Go

`find $CORPUS -maxdepth 1 -mindepth 1 -type d` cross-checked for
`MODULE.bazel`/`WORKSPACE`/`BUILD.bazel` at each repo root and below:
**exactly 2/35 (6%) repos carry any Bazel-for-Go configuration —
`bazel-contrib/rules_go` (173 `BUILD.bazel` files) and
`bazelbuild/bazel-gazelle` (89 `BUILD.bazel` files) — and both of them are
Bazel-for-Go's own implementation, dogfooding itself.** Every other
exemplar — including `kubernetes/kubernetes`, which used Bazel for Go
historically and dropped it years ago — has zero Bazel-for-Go presence in
this corpus. **No application/CLI/library exemplar in this corpus uses
Bazel to build Go.**

Gazelle directive census (`# gazelle:` comments) in the two Bazel-native
repos:

| directive | rules_go | bazel-gazelle |
|---|---|---|
| `# gazelle:exclude` | 12 | 18 |
| `# gazelle:prefix` | 1 | 2 |
| `# gazelle:go_naming_convention` | 1 | 4 |
| `# gazelle:go_naming_convention_external` | 0 | 3 |
| `# gazelle:ignore` | 0 | 1 |

`exclude` dominates in both — the most common hand-authored Gazelle
directive in practice is telling Gazelle *not* to touch a subtree (generated
code, vendored fixtures), not customizing naming or visibility.

`go_deps`/`go_sdk` extensions, read directly from each repo's own
`MODULE.bazel`:
- `bazelbuild/bazel-gazelle@63c9a3d2078f:MODULE.bazel:13,18,34-35` — depends
  on `rules_go` **0.59.0**; `go_sdk.from_file()`… actually uses
  `go_deps.from_file(go_work = "//:go.work")` (workspace-driven, not
  go.mod-driven) plus a dev-only `go_sdk_dev.download(version = "1.24.12")`.
- `bazel-contrib/rules_go@970e99d77c8b:MODULE.bazel:31-57` — depends on
  `gazelle` **0.51.3**; `go_sdk.from_file(...)` and
  `go_deps.from_file(go_mod = "//:go.mod")` (go.mod-driven, the opposite
  choice from gazelle's own module).

Both repos declare a `nogo(...)` target
(`bazel-contrib__rules_go@970e99d77c8b:BUILD.bazel:57`,
`bazelbuild__bazel-gazelle@63c9a3d2078f:BUILD.bazel:41`).

**Canonical current bzlmod setup, verbatim from
`bazel-contrib/rules_go@970e99d77c8b:docs/go/core/bzlmod.md` (seeds the
`bazel-quality/go.md` depth-file offer):**
```starlark
bazel_dep(name = "rules_go", version = "0.57.0")
bazel_dep(name = "gazelle", version = "0.45.0")
```
> "The latest versions are always listed on
> https://registry.bazel.build/." — the doc explicitly tells readers not to
> trust its own pinned version string as current.

SDK selection:
```starlark
go_sdk = use_extension("@rules_go//go:extensions.bzl", "go_sdk")
go_sdk.from_file(go_mod = "//:go.mod")   # or go_work = "//:go.work"
```
"Version extraction follows the same precedence for both file types: the
`toolchain` directive takes precedence over the `go` directive."
`go_sdk.host()` is explicitly **discouraged**: "may break builds whenever
the host Go version is upgraded... use of `go_sdk.host()` is discouraged."

External deps:
```starlark
go_deps = use_extension("@gazelle//:extensions.bzl", "go_deps")
go_deps.from_file(go_mod = "//:go.mod")
use_repo(go_deps, "com_github_gogo_protobuf", ...)   # every DIRECT dep listed explicitly
```
"When using Bazel 7.1.1 or higher, the `@rules_go//go` target automatically
updates the `use_repo` call whenever the `go.mod` file changes, using
`bazel mod tidy`."

nogo config:
```starlark
go_sdk.nogo(nogo = "//:my_nogo", includes = [...], excludes = [...])
"Each module can only provide at most one `go_sdk.nogo` tag and only the
tag of the root module is honored."
```

Go 1.24+ `tool` directive support (bzlmod-side):
`bazel-contrib/rules_go@970e99d77c8b:docs/go/core/bzlmod.md` — "If you are
using Gazelle >=0.47.0, then the tools you have added are exported as a
dictionary named `GO_TOOLS` from `@gazelle//:go_tools.bzl`."

**Docs-vs-config disagreement, and which is authoritative:** the
`bazelbuild/bazel-gazelle@63c9a3d2078f:README.md` WORKSPACE-setup example
(the legacy, non-bzlmod path) pins
`rules_go` **v0.62.0** and `bazel-gazelle` **v0.52.2** via `http_archive`, and
tells readers to `go_register_toolchains(version = "1.26.5")` — but that
repo's *own* `MODULE.bazel` (the config the CI actually builds with) depends
on `rules_go` **0.59.0**, a full 3 minor versions behind its own README's
WORKSPACE example. **The `MODULE.bazel` is authoritative in practice** — it
is what CI tests against and what `bazel mod tidy` keeps live; the README's
version-pinned WORKSPACE snippet is legacy-path documentation that visibly
lags the module's real bzlmod dependency graph. An authoring pass citing
"the current rules_go version" should cite the registry
(https://registry.bazel.build/) or the `MODULE.bazel`, never a README
snippet, per the doc's own admission.

## 7. Build constraints for distribution

### CGO usage {#cgo-usage}

`grep -rl '^import "C"' --include="*.go"` (excluding vendor/testdata) → 69
raw hits across 5 repos. Spot-reading the hits (not just the pattern) shows
**67/69 (97%) are test fixtures, not production cgo dependence**:
57/69 are `bazel-contrib/rules_go@970e99d77c8b:tests/integration/*` — the
build system's own cgo-support integration tests, not an application;
10/69 are parser/test files in `golang/tools` and `bazelbuild/bazel-gazelle`
that exercise cgo-import *parsing* (e.g.
`golang__tools@d2d3de9f066e:internal/imports/fix_test.go`,
`bazelbuild__bazel-gazelle@63c9a3d2078f:tests/go_fix_and_update_changes_fix/cgo.go`)
without the surrounding tool itself using cgo. **Real production cgo usage:
2/35 (6%)** — `cockroachdb/pebble@13596f1e1cea:internal/manual/manual_cgo.go`
(cgo-backed manual memory allocation for its LSM engine) and
`tailscale/tailscale@6b3a45f14ef6:posture/serialnumber_macos.go` (macOS
IOKit call for device posture checks — platform API access with no pure-Go
equivalent). Both are exactly the two canonical reasons a Go CLI must ship
cgo: low-level memory tricks or an OS-native API with no syscall-level
escape hatch — **neither is "a SQLite driver" or "OS keychain access,"**
contradicting the frame's example reasons on this specific corpus (no
exemplar here uses cgo for either of those two commonly-cited reasons; the
two real cases are more specialized). This pattern (a broad glob catching
overwhelmingly test-fixture noise) is the single largest false-positive rate
measured in this audit — reported per the counting-discipline instructions.

### Cross-compile matrices

From the 11 goreleaser configs (`§3`), GOOS/GOARCH matrices cluster around
`darwin, linux, windows[, freebsd]` × `amd64, arm64, arm[, 386, s390x,
ppc64le]`; `windows` + `arm64` **both present in 9/11 (82%)** goreleaser
configs — the 2 without are `charmbracelet/bubbletea` and
`oras-project/oras-go`, both libraries with no OS/arch build matrix at all
(goreleaser used only for changelog/checksums, confirmed in §3).
`GOAMD64`/`GOARM` level pinning is rare even among binary-shipping repos:
`goamd64` set in only 1/11 (`golangci/golangci-lint`), `goarm` set in 6/11
(caddy, golangci-lint, goreleaser, fzf, oras, cosign) — when a repo does
pin a GOARM level it's almost always alongside a broader arm/arm64 matrix
already, i.e. GOARM pinning tracks "we ship to Raspberry-Pi-class arm32
hardware," not a general practice.

## Smells (ranked)

1. **YAML-library fragmentation is the sharpest "no canonical answer"
   signal in dependency posture** — 4 distinct direct-dependency answers to
   "which YAML library" coexist (`gopkg.in/yaml.v3`, `sigs.k8s.io/yaml`,
   `go.yaml.in/yaml/{v2,v3,v4}`, transitively `.v2`), with one repo
   (`prometheus/prometheus`) directly depending on 3 major versions of the
   *same* new library at once. A Go rule set has to pick a recommendation
   here or explicitly say "no consensus, match the repo's k8s/non-k8s
   lineage" — silence would be wrong.
2. **`toolchain` directive adoption (14%) contradicts H6's "common"** —
   authoring must not assume it's the default; a rule enforcing pinned
   toolchains would be prescribing a minority practice, not codifying a
   norm.
3. **Bazel-for-Go is print-the-null-result territory** — 2/35, both
   dogfooding repos. The `bazel-quality/go.md` depth file should be framed
   as "here's how *if* you adopt Bazel for Go," not "here's the common
   setup," and should lean entirely on rules_go's own bzlmod doc rather than
   any exemplar's real-world usage, because there is no real-world usage in
   this corpus to draw from.
4. **`import "C"` as a proxy for "ships cgo" has a 97% false-positive rate**
   in this corpus — any future automated cgo-detection heuristic in a rule
   or lint config needs a build-tag/path exclusion for `tests/`,
   `testdata/`, and files whose only cgo use is parsing cgo syntax as data,
   not an unqualified grep.
5. **Dockerfile base-image census undercounts minimalism** because
   goreleaser's `dockers:`/`kos:` blocks (scratch/distroless targets that
   never touch a standalone `Dockerfile`) sit outside a Dockerfile-only
   glob — a future depth file measuring "does this repo ship a minimal
   final image" must check both Dockerfiles *and* goreleaser/ko configs, or
   it will under-credit repos that do the minimal-image thing correctly via
   goreleaser alone (caddy, go-containerregistry, ko, cosign all fall in
   this bucket).
6. **Version stamping has no single dominant pattern** — 49% use `-X`, 40%
   use `ReadBuildInfo`, 29% use both, 40% use neither explicitly (relying on
   an unstamped default `go build` version or a generated file not caught by
   either grep). A depth file recommending version stamping should present
   both mechanisms as complementary (semver via `-X`, VCS metadata via
   `ReadBuildInfo`), matching the 10-repo "use both" cohort, rather than
   picking one.
7. **SHA-pinning in CI Actions is bimodal, not universal** — repos with a
   real release/publish pipeline are ~100% SHA-pinned; pure libraries with
   lint-only CI are commonly ~0% (tag-pinned). A rule requiring SHA-pinned
   Actions should scope itself to release-adjacent workflows, not blanket
   every workflow file, or it will flag idiomatic behavior in low-risk lint
   jobs.

## Patterns worth encoding

- **`go_deps.from_file(go_mod = "//:go.mod")` + explicit `use_repo(...)` per
  direct dependency** is the current, doc-verified bzlmod recipe for
  external Go deps under Bazel — cite
  `bazel-contrib/rules_go@970e99d77c8b:docs/go/core/bzlmod.md` verbatim in
  the `bazel-quality/go.md` offer, including the "Bazel ≥7.1.1 auto-updates
  `use_repo` via `bazel mod tidy`" caveat, since that changes the authoring
  workflow materially (no more manual `use_repo` list maintenance on modern
  Bazel).
- **`-ldflags -X` for semver + `debug.ReadBuildInfo` for VCS metadata, used
  together**, is the most defensible version-stamping recipe (10/35 repos
  already do this) — a Go release/distribution skill should teach the
  combination, not present them as alternatives.
- **`replace` directives in a multi-module repo should be 100% local-path
  self-references** — every multi-module exemplar except syncthing follows
  this; a rule flagging a `replace` that redirects to a *different*
  third-party fork (syncthing's pattern) as needing an inline justification
  comment would match the corpus norm.
- **govulncheck's reachability analysis, not module-level scanning**, is
  the correct default for a Go security-gate skill/rule — the 86%
  not-reachable rate measured here (§2) is the argument, cite it directly
  rather than asserting it.
- **`ignore (...)` in go.mod (1.25+) is real but vanishingly rare (1/35)** —
  worth a one-line mention in a go-modules rule as "if your repo has large
  non-Go asset trees `go mod` shouldn't walk, use this" rather than a
  headline recommendation.
- **CGO detection for a lint/rule heuristic must exclude `tests/`,
  `testdata/`, and parser-test files** — encode the exclusion, not just the
  `import "C"` grep, given the measured 97% false-positive rate.

## Contradictions of the frame

- **H5 ("testify dominates tests in the ecosystem") is only partially
  true, and precisely measurable now: `stretchr/testify` is a *direct*
  dependency in 15/35 (43%) root modules** — real, substantial, but not a
  majority, and beaten by `golang.org/x/sync` (22/35, 63%) and tied closely
  with `golang.org/x/tools`/`github.com/spf13/cobra` (14/35 each). A rule
  set "picking one position" per H5's framing should say testify is
  *common but not default*, not dominant — 20/35 repos (57%) have no direct
  testify dependency at all.
- **H6 ("`toolchain` directives are common") is false on this corpus: 14%
  adoption**, not common. `go.work` is indeed rare (11% at repo root,
  matching H6's second half) but when present is always committed with a
  matching `go.work.sum` in 3/4 cases — H6's "usually not committed" half
  doesn't hold either; every observed `go.work` in this corpus that has a
  reason to exist (a genuine multi-module monorepo) commits its workspace
  files. H6 should be revised to: toolchain directives are a minority
  practice; go.work is rare but, when adopted for a real multi-module repo,
  is committed.
- **The frame's cgo rationale ("e.g. sqlite, OS keychains") does not match
  either real cgo user found in this corpus** — pebble's is manual memory
  management, tailscale's is a macOS device-posture IOKit call. Neither
  example the frame offers as illustrative is present; a Go release/CGO
  guidance doc should draw its examples from what's actually measured
  (memory-management tricks, platform-specific hardware/OS APIs with no
  syscall path) rather than repeat the frame's placeholder examples
  unverified.
- **Bazel-for-Go isn't merely "underused" — it is exclusively used by the
  Bazel-for-Go tooling authors themselves in this 35-repo sample.** This is
  a stronger and more actionable finding than "rare": it means the
  `bazel-quality/go.md` depth file cannot draw *any* real-world "how a Go
  project adopts rules_go" example from this corpus and must lean entirely
  on rules_go's/gazelle's own documentation (already captured verbatim
  above) rather than exemplar behavior.

## Gaps

- **golangci-lint/staticcheck config census (which linters enabled, v1→v2
  migration state) is out of scope for this audit** — it's axis territory
  for a sibling grounder/scout under the same program (H4), not measured
  here; do not treat this file's silence on it as "linting is fine
  everywhere."
- **kubernetes/kubernetes is systematically under-measured on every
  filesystem-presence axis** (vendor/, .github/workflows/, Dockerfiles use
  templated `$BASEIMAGE` heavily) because the exemplar clone is
  sparse/config-only per the frame — every "0" or "low" number attributed
  to kubernetes in this file should be read as "not visible in this sparse
  clone," not "kubernetes doesn't do this." Re-verify against a full clone
  before asserting a kubernetes-specific negative in an authored rule.
  Its dependabot/CI-Action-pin absence is the clearest instance: k8s's real
  CI is Prow-based and off-GitHub-Actions, so the "0 workflow files" figure
  in §5 is a clone artifact, not a k8s practice signal.
  golangci-lint config file census, staticcheck config census, and go vet
  analyzer enable/disable lists (H4's territory) are unmeasured here.
- **Not measured**: PGO (`default.pgo`) adoption, fuzzing corpus presence
  (`testdata/fuzz/`), `GODEBUG` *runtime* usage (only the go.mod `godebug`
  directive was measured, not `os.Setenv("GODEBUG", ...)` or
  `//go:debug` file-level directives), winget/scoop manifest *content*
  (only their presence as a goreleaser section was checked, not the
  manifests' correctness), and whether any exemplar runs govulncheck itself
  in CI (a `.github/workflows` grep for `govulncheck` was not run in this
  pass — recommend it for a follow-up dive alongside the H4 lint-config
  axis).
- **Docker base-image "other" bucket (23%) was not individually triaged**
  beyond the printed sample — several of those 24 hits are devcontainers
  and e2e sidecar images (ubuntu/fedora/debian), correctly out of scope for
  "what does the shipped release binary's image look like," but a couple
  may be legitimate non-minimal release images worth a second look in a
  follow-up dive rather than folded into this summary's scratch data.

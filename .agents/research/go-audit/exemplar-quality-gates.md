---
title: Go exemplar corpus — lint, static analysis, test, and CI gate audit
agent: go-audit-exemplar-quality-gates
model: sonnet
scope: >
  Numbers-first census of golangci-lint config, other static analyzers, CI
  test/coverage/toolchain gates, and test-library adoption across all 35
  cloned Go exemplars under ~/.cache/research-lang/exemplars/go, plus real
  toolchain runs (go vet, staticcheck, golangci-lint, and one strict
  default:all pass) on 10 named repos.
method: >
  Read-only shell census (find/grep/python3+PyYAML) over the 35 depth-1
  clones, cross-checked by spot-reading >=3 raw hits per grep pattern and
  reporting false-positive rate where found. Real tool runs via
  ~/.cache/research-lang/go-tools/run.sh (go 1.27.1, golangci-lint 2.14.0,
  staticcheck under it), each bounded by `timeout 600` (900 for
  golangci-lint). Every command that produced a number is inlined next to
  its result so it is re-runnable verbatim from
  ~/.cache/research-lang/exemplars/go.
date_researched: 2026-09-26
---

# Go exemplar corpus — quality-gate audit

35 exemplars, 34 with full source, `kubernetes/kubernetes` sparse
(config-only — sufficient for axes 1-3, excluded from axes 4-5). SHAs below
are the 12-char prefixes recorded in `go-frame.md`; every citation in this
file is `<repo>@<sha12>:<path>[:<line>]`.

| Repo | sha12 | Repo | sha12 |
|---|---|---|---|
| aquasecurity/trivy | ae561f8cca36 | kubernetes-sigs/controller-runtime | d0127f7f66de |
| bazelbuild/bazel-gazelle | 63c9a3d2078f | oras-project/oras | a0cd4de5cfcd |
| bazel-contrib/rules_go | 970e99d77c8b | oras-project/oras-go | cb6d6dc79f83 |
| caddyserver/caddy | 54937914234b | prometheus/prometheus | 270db2915054 |
| charmbracelet/bubbletea | d5bfd5c2ff74 | regclient/regclient | 43d2acb9fafd |
| cli/cli | 9b031151a825 | restic/restic | 5127c4abf921 |
| cockroachdb/pebble | 13596f1e1cea | sigstore/cosign | 907c3d899c0e |
| containerd/containerd | 934434dde54b | spf13/cobra | adbc8813901b |
| dominikh/go-tools | 6cb65e58a558 | stretchr/testify | 87a7b9d57689 |
| etcd-io/etcd | 7583cc6e7e27 | syncthing/syncthing | 94c3c1cdef71 |
| golangci/golangci-lint | 032d962e0399 | tailscale/tailscale | 6b3a45f14ef6 |
| golang/tools | d2d3de9f066e | uber-go/zap | 4892335e05f1 |
| golang/vuln | 709015412431 | urfave/cli | d1d810845dbc |
| google/go-cmp | b133f1f1932e | kubernetes/kubernetes | dfd7b93a1783 |
| google/go-containerregistry | 0c8bedb78437 | | |
| google/go-github | 48d0a668cde8 | | |
| goreleaser/goreleaser | ff8de3d6c389 | | |
| grpc/grpc-go | acccf8cd101a | | |
| hashicorp/terraform | db4eef44f5bb | | |
| junegunn/fzf | b1be3a8be1b8 | | |
| ko-build/ko | fcaeb337b6bd | | |

## Table of contents

1. [Headline numbers](#headline-numbers)
2. [golangci-lint configuration](#1-golangci-lint-configuration)
3. [Other analyzers](#2-other-analyzers)
4. [CI workflow gates](#3-ci-workflow-gates)
5. [Test-library census](#4-test-library-census)
6. [Real toolchain runs](#5-real-toolchain-runs)
7. [Smells (ranked)](#smells-ranked)
8. [Patterns worth encoding](#patterns-worth-encoding)
9. [Contradictions of the frame](#contradictions-of-the-frame)
10. [Gaps](#gaps)

## Headline numbers

- **23/35 (66%)** exemplars carry a golangci-lint config (`find . -maxdepth 3 -iname '.golangci*'` widened to full-depth for the 13 initial misses; see [§1](#1-golangci-lint-configuration)). **0/23** are on the v1 schema — every configured repo already declares `version: "2"`.
- **12/35** have no golangci-lint config at all, but 4 of those run a *standalone* `staticcheck.conf` (`tailscale/tailscale`, `dominikh/go-tools`, `urfave/cli`, `hashicorp/terraform` — `find . -iname staticcheck.conf` at depth 2) and 1 runs a standalone `revive.toml` (`grpc/grpc-go`, at `scripts/revive.toml`).
- **De-facto consensus set** (linters enabled, explicitly or via `default:`, in ≥1/3 of the 23 configured repos): `govet`(22), `ineffassign`(21), `unused`(20), `staticcheck`(19), `misspell`(17), `revive`(17), `unconvert`(15), `errcheck`(13), `gosec`(11), `whitespace`(11), `depguard`(10), `bodyclose`(10), `gocritic`(10), `unparam`(10), `nolintlint`(10), `errorlint`(9), `modernize`(8) — **17 linters**, not the 5-linter "standard" default.
- **Formatters**: `gofmt` in 15/23 configured repos beats `gofumpt` in 8/23 — gofumpt has **not** displaced gofmt as the majority choice in this corpus. `gci` in 5/23.
- **go vet on 10 hand-picked repos**: `timeout 600 run.sh go vet ./...` → **9/10 zero findings**; only `google/go-cmp` has 7, all in test fixtures that deliberately construct unkeyed struct literals (`cmp/compare_test.go:553`) — not bugs.
- **staticcheck on the same 10**: 6/10 zero or near-zero (0-2); `google/go-cmp`(37), `oras-project/oras-go`(27), `stretchr/testify`(12) carry the bulk. Top check IDs across all 10: `U1000`(32), `SA1019`(21), `SA4026`(12).
- **golangci-lint with each repo's own config** (5 repos have one — `cobra`, `zap`, `oras-go`, `urfave/cli`, `ko`): **4/5 report 0 issues**; `ko-build/ko` has exactly 1 (`gosec` G703 at `pkg/build/gobuild.go:436`) — a config-drift finding, not a real bug (see [§5](#5-real-toolchain-runs)).
- **Strict `default: all` pass** on `cobra`/`oras-go`/`ko`: 2,156 / 19,268 / 2,784 issues respectively. The top 6 linters by volume in all three are `wsl`, `wsl_v5`, `noinlineerr`, `paralleltest`, `nlreturn`, `exhaustruct` — none of which any of the 23 real configs enable. This is the clearest **noise-vs-signal** split in the whole audit.
- **Test libraries (34 full-source repos, generated test files excluded)**: testify (any submodule) in **17/34**, go-cmp in **19/34** — roughly even, go-cmp slightly ahead. This contradicts H5's framing that testify "dominates."
- **`t.Context()` (Go 1.24+)** appears **6,629** times across the corpus post-generated-file exclusion, in repos as different as `google/go-github`, `etcd-io/etcd`, `goreleaser/goreleaser`, `tailscale/tailscale` — a strong, clean modernization signal (0 false positives in a 9-hit spot check across 3 repos).
- **`testing/synctest`** used in 10/34 repos — real but minority adoption of a Go 1.24-experimental/1.25-stable package.

## 1. golangci-lint configuration

Command: `find <repo> -iname '*golangci*' -not -path '*/vendor/*' -not -path '*/.git/*'` run per repo across all 35; 22 hit at top level, 1 (`etcd-io/etcd`) at `tools/.golangci.yaml`, 1 (`kubernetes/kubernetes`) at `hack/golangci.yaml`. Configs copied out and parsed with a small PyYAML script (`parse_golangci.py`, kept in this session's scratchpad) rather than by eye, to get exact `default:`/`enable:`/`disable:`/`settings:` values.

23/23 configured repos declare `version: "2"` (`grep -H '^version' *.yaml` on the 23 copies) — **0 v1 configs found**, so the wave-5 "v1 fails under v2" risk the frame flagged did not materialize for any repo's *own* config (golangci-lint 2.14.0 is well past the v1→v2 break; every maintained repo in this corpus has already migrated).

`linters.default` distribution (`python3` tally over the 23):

| `default:` value | repos | notes |
|---|---|---|
| `none` | 13 | fully explicit enable list |
| *(omitted)* | 8 | golangci-lint v2 treats omission as `standard` — confirmed via `run.sh golangci-lint help linters`, which prints `errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused` as "Enabled by default" |
| `standard` | 1 (`oras-project/oras`) | explicit, same 5-linter set |
| `all` | 1 (`syncthing/syncthing`, `syncthing__syncthing/.golangci.yml:3`) | 41-item `disable:` list carves back down from "all" |

Consensus table (linter | # of 23 configured repos enabling it | notable settings, repo count with non-default settings for that linter in parens):

| linter | repos | notable settings |
|---|---|---|
| govet | 22 | `enable-all: true` + `disable: [shadow, fieldalignment]` in 3 repos (`google/go-github@48d0a668cde8:.golangci.yml:83`, `prometheus/prometheus@270db2915054:.golangci.yml:122`, `k8s-sigs/controller-runtime`); explicit per-analyzer `enable:` list (not enable-all) in `tailscale/tailscale`, `etcd-io/etcd`, `uber-go/zap`; custom `printf.funcs` for project-specific logging wrappers in `golangci/golangci-lint` and `sigstore/cosign` (11 repos customize govet)|
| ineffassign | 21 | no settings (binary linter) |
| unused | 20 | no settings |
| staticcheck | 19 | `checks:` overrides in 8 repos, always of the form `["all", "-XXXX", ...]` — e.g. `aquasecurity/trivy@ae561f8cca36:.golangci.yaml:128` excludes 12 checks incl. `-SA1019`,`-SA5011`; `kubernetes/kubernetes@dfd7b93a1783:hack/golangci.yaml` excludes **24** checks, the widest exclude list in the corpus |
| misspell | 17 | no settings customization seen |
| revive | 17 | rule-level customization in 11 repos; `confidence` threshold set in `etcd-io/etcd`(0.8) and `google/go-github`(0.6) |
| unconvert | 15 | no settings |
| errcheck | 13 | `check-type-assertions`+`check-blank` in `aquasecurity/trivy@ae561f8cca36:.golangci.yaml:22`; `exclude-functions` (fmt.*, zap encoder methods) in `caddyserver/caddy`, `prometheus/prometheus`, `uber-go/zap` |
| gosec | 11 | `excludes:` list in 8/11 — every repo excludes a *different* subset of G-codes; `ko-build/ko@fcaeb337b6bd:.golangci.yaml:21-22` excludes only `G115` |
| whitespace | 11 | no settings |
| depguard | 10 | rule-based deny lists in all 10 that customize it — most common denial: `io/ioutil` and `github.com/pkg/errors` (both appear in ≥3 repos' deny lists, e.g. `aquasecurity/trivy@ae561f8cca36:.golangci.yaml:63`) |
| bodyclose | 10 | no settings |
| gocritic | 10 | `enabled-tags`/`disabled-checks` in 7 repos; `prometheus/prometheus@270db2915054:.golangci.yml:157` sets `enable-all: true` with a 20-item disable list |
| unparam | 10 | no settings |
| nolintlint | 10 | `require-explanation`+`require-specific` both true only in `golangci/golangci-lint@032d962e0399:.golangci.yml` — the strictest of the 3 that customize it |
| errorlint | 9 | `asserts`/`errorf`/`comparison` toggles in 2 repos |
| modernize | 8 | no settings (a Go 1.26 modernizer wired into golangci-lint 2.x) |

Below the ≥1/3 line but recurring: `testifylint`(7), `importas`(7), `asciicheck`(7), `tparallel`(7), `copyloopvar`(7), `usetesting`(6), `prealloc`(6), `usestdlibvars`(5), `perfsprint`(5), `dupl`(5), `nakedret`(5), `forbidigo`(5, settings in `containerd/containerd@934434dde54b:.golangci.yml`, `google/go-github`, `goreleaser/goreleaser`, `k8s-sigs/controller-runtime`, `kubernetes/kubernetes@dfd7b93a1783:hack/golangci.yaml:522-526` which enables `analyze-types: true` to catch `.AnnotatedEventf` calls project-wide).

Exclusions (`linters.exclusions.presets`, counted over the 23): `common-false-positives`(13), `std-error-handling`(13), `legacy`(12), `comments`(10). `exclusions.generated: lax` in 13, unset in 9, `strict` in 1. Per-repo `exclusions.rules` count ranges from 0 (`oras-project/oras-go`, `urfave/cli`) to 64 (`kubernetes/kubernetes@dfd7b93a1783:hack/golangci.yaml`).

`issues.max-issues-per-linter: 0` + `max-same-issues: 0` (i.e. "show everything, don't cap") in **11/23** (48%) — `aquasecurity/trivy@ae561f8cca36:.golangci.yaml:2-3`, `uber-go/zap@4892335e05f1:.golangci.yml:71-72`, `charmbracelet/bubbletea`, `cli/cli`, `containerd/containerd`, `etcd-io/etcd` (max-same-issues only), `google/go-github`, `k8s-sigs/controller-runtime`, `kubernetes/kubernetes`, `prometheus/prometheus`, `sigstore/cosign`. `issues.new-from-rev` (diff-only linting): **0/23** — not used anywhere in this corpus, despite being golangci-lint's headline incremental-adoption feature.

## 2. Other analyzers

Commands: `find . -iname staticcheck.conf`, `find . -iname revive.toml -not -path '*/vendor/*'`, `find . -iname '.gosec*'`, `find . -maxdepth 2 -iname '.editorconfig'`, `find . -maxdepth 2 -iname 'typos.toml'`, `grep -rl 'go vet' --include=Makefile --include='*.mk' --include='*.yml' --include='*.yaml' .`

| item | count | repos |
|---|---|---|
| standalone `staticcheck.conf` | 4 | `tailscale/tailscale` (excludes `SA4023`, notes it was re-enabled 2026-07-31 after a staticcheck v0.8.0-rc.1 fix — a live example of exemplar config tracking staticcheck's own release notes), `dominikh/go-tools` (`checks = ["inherit", "-SA9003"]` — staticcheck's own repo, dogfooding, no golangci-lint), `urfave/cli` (`checks=["all"]`), `hashicorp/terraform` (excludes all `ST*` + `SA1019`/`SA4003` with inline rationale) |
| standalone `revive.toml` | 1 | `grpc/grpc-go@acccf8cd101a:scripts/revive.toml` — grpc-go has neither golangci-lint nor staticcheck.conf; revive is its only style linter |
| `.gosec*` config outside golangci | 0 | gosec is always configured through golangci-lint's `linters.settings.gosec` in this corpus, never standalone |
| `.editorconfig` | 4 | `caddyserver/caddy`, `cockroachdb/pebble`, `goreleaser/goreleaser`, `junegunn/fzf` |
| `typos.toml` (crate-ci/typos) | 1 | `junegunn/fzf@b1be3a8be1b8:typos.toml`, wired in `.github/workflows/typos.yml` |
| `codespell`/misspell-family tool in CI (not via golangci) | 2 | `junegunn/fzf`, `restic/restic` |
| standalone `go vet` step, outside golangci-lint, in Makefile/CI | 4 repos | `dominikh/go-tools@6cb65e58a558:.github/workflows/ci.yml`, `regclient/regclient@43d2acb9fafd:Makefile:94-95` + `.github/workflows/go.yml`, `tailscale/tailscale@6b3a45f14ef6:Makefile:8-9` (via `./tool/go vet`) + a dedicated `vet.yml` + `checklocks.yml` (a **custom static analyzer**, `checklocks`, enforcing lock-annotation discipline — not in golangci-lint's roster), `hashicorp/terraform@db4eef44f5bb:Makefile:27-28` |
| `nogo` (Bazel's Go static-analysis integration) | rules_go only | `bazel-contrib/rules_go@970e99d77c8b:go/private/rules/nogo.bzl` defines the mechanism; no *consumer* repo in this corpus wires a project-level `nogo` target visibly (Bazel-core topic — covered-elsewhere, belongs to `bazel-quality`) |
| custom lint-as-go-test package | 1 | `cockroachdb/pebble@13596f1e1cea:Makefile:60` (`go test ... ./internal/lint`) — pebble's own forbidden-import/forbidden-pattern checks run as an ordinary `go test` target, not an external linter binary |

`go vet` is otherwise invoked **implicitly**, as golangci-lint's default-on `govet` linter (confirmed default-on via `run.sh golangci-lint help linters`), so its absence as a *standalone* Makefile/CI line in 31/35 repos does not mean vet doesn't run — see [§1](#1-golangci-lint-configuration): govet is enabled in 22/23 configured repos.

## 3. CI workflow gates

Command per repo: read every `.github/workflows/*.yml`/`*.yaml`, then regex census (script `ci_census.py`, kept in scratchpad) for the flags below; corrected after a false-positive pass (see callout).

**Counting-discipline note**: a naive substring grep for `-tags` gave 14/32 repos; 3-hit spot read (`grep -rn '\-tags' */.github/workflows/*.y*ml`) showed 2 of the first 5 hits were `--tags` (a *double*-dash flag on `az`/`git`/`skopeo` commands in `containerd/containerd` and `aquasecurity/trivy`) matching as a substring of the single-dash Go flag — a **~57% false-positive rate** on the raw pattern. Corrected regex (`go (test|build|vet)...-tags=` or `GOFLAGS:...-tags=`, requiring the dash not be preceded by another dash) drops the count to 6/32. The same substring bug inflated `-timeout` (13→6, `timeout-minutes:` GH Actions keys and `EXTRA_TESTFLAGS` shell vars were clean once excluded) and `-short` (3→2, `--short` on `git rev-parse` and `golangci-lint version` were the false hits). `-race`, `-coverprofile`, `-covermode=atomic`, `-coverpkg`, `-count=1` were spot-read clean (0% FP in a combined 15-hit check) because those flags have no common double-dash homonym.

Repos with **zero** GitHub Actions workflows: `golang/tools`, `golang/vuln` (both are GitHub mirrors of Google-internal Gerrit/LUCI-hosted `golang.org/x/*` repos — their real CI is invisible to this clone, not absent) and `kubernetes/kubernetes` (sparse checkout excludes `.github/workflows/*.yml` bodies even though the `.github/` directory tree is present with issue templates). `bazel-contrib/rules_go` and `bazelbuild/bazel-gazelle` have GH Actions only for `publish`/`release`; their real test gate is Bazel-native (`.bazelci/presubmit.yml`), invisible to a `*.github/workflows` grep — a Bazel-core CI shape, covered-elsewhere.

Per-repo flag table (of the 32 repos with ≥1 workflow; `race`/`cov` = `-race`/`-coverprofile` or `-cover`; `tags=` is the corrected pattern; `os` = windows/macos present in a runner matrix):

| repo | wf files | race | cov | atomic | timeout | tags= | vuln | codecov | os win/mac | go-ver-file | check-latest | stable/oldstable |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| aquasecurity__trivy | 21 | | | | | | | | Y/Y | | Y | |
| bazel-contrib__rules_go | 2 | | | | | | | | / | | | |
| bazelbuild__bazel-gazelle | 2 | | | | | | | | / | | | |
| caddyserver__caddy | 8 | Y | Y | | | Y | Y | | Y/Y | | Y | Y |
| charmbracelet__bubbletea | 7 | Y | Y | Y | | | | Y | / | Y | | |
| cli__cli | 14 | Y | | | | Y | Y | | Y/Y | Y | | Y |
| cockroachdb__pebble | 17 | Y | Y | | | | | Y | Y/Y | | | |
| containerd__containerd | 17 | Y | | | Y | | | | Y/Y | | | Y |
| dominikh__go-tools | 1 | | | | | | | | Y/ | | | Y |
| etcd-io__etcd | 11 | | | | | | | | / | | | |
| golang__tools | 0 | | | | | | | | / | | | |
| golang__vuln | 0 | | | | | | | | / | | | |
| golangci__golangci-lint | 9 | | | | | | | | Y/Y | | | Y |
| google__go-cmp | 1 | Y | | | | | | | /Y | | | |
| google__go-containerregistry | 13 | Y | Y | Y | | | | Y | Y/ | Y | Y | |
| google__go-github | 2 | Y | Y | | | Y | | Y | Y/ | | | Y |
| goreleaser__goreleaser | 15 | Y | | | | | Y | Y | Y/ | Y | | Y |
| grpc__grpc-go | 9 | Y | Y | | Y | | Y | Y | / | | Y | Y |
| hashicorp__terraform | 11 | Y | Y | | Y | | | | Y/Y | | | |
| junegunn__fzf | 8 | | | | | | | | /Y | | | Y |
| ko-build__ko | 16 | Y | Y | Y | | | Y | | Y/ | | | Y |
| kubernetes-sigs__controller-runtime | 7 | | | | | | | | / | | | |
| kubernetes__kubernetes | 0 | | | | | | | | / | | | |
| oras-project__oras | 10 | | | | | | Y | Y | / | | Y | Y |
| oras-project__oras-go | 6 | | | | | | Y | | / | Y | Y | |
| prometheus__prometheus | 15 | Y | | | | | Y | | Y/ | | | Y |
| regclient__regclient | 6 | | | | | | Y | | / | | Y | |
| restic__restic | 4 | Y | Y | | Y | | | | Y/ | | | |
| sigstore__cosign | 17 | Y | Y | | Y | Y | | Y | Y/Y | | Y | Y |
| spf13__cobra | 2 | | | | | | | | Y/ | | Y | |
| stretchr__testify | 2 | Y | | | | | | | / | | | Y |
| syncthing__syncthing | 8 | | | | | Y | | | Y/Y | | Y | Y |
| tailscale__tailscale | 27 | Y | | | Y | Y | Y | | /Y | Y | | Y |
| uber-go__zap | 1 | | | | | | Y | Y | / | | | |
| urfave__cli | 3 | | | | | | Y | Y | Y/Y | | | Y |

Corpus totals (of 32 repos with workflows, corrected patterns): `-race` 17, `-coverprofile`/`-cover` 10, `-covermode=atomic` 3, `-timeout` 6, `-tags=` 6, `govulncheck` 11, `codecov` 11, `-count=1` 2, `fuzz` (`-fuzz`/`-fuzztime`) 3, `gotestsum` 1, `benchstat` 0, `-shuffle` 0, `-failfast` 0, `-p N` 1, windows-runner 18, macos-runner 13, `actions/setup-go` with `go-version-file` 6 vs bare `go-version:` 27, `check-latest` 10, `go mod tidy` diff-check 6, `go generate` diff-check 1, standalone `gofmt`/`goimports` CI step 3 each, `golangci-lint-action` 20, `stable`/`oldstable` keyword 17.

Spot-read confirmations: `-race` (`cli__cli/.github/workflows/go.yml:32`, `google__go-cmp/.github/workflows/test.yml:20`, `restic__restic/.github/workflows/tests.yml:45`) — all real. `go mod tidy` (`aquasecurity__trivy@ae561f8cca36:.github/workflows/test.yaml:29-33`, `cli__cli@9b031151a825:.github/workflows/lint.yml:41` using the newer `-diff` flag, `golangci__golangci-lint@032d962e0399:.github/workflows/pr-checks.yml:18-30` using `--diff`) — all real, and 2 of 6 already prefer the non-destructive `-diff`/`--diff` form over a tidy-then-`git diff` shell dance.

Fuzzing in CI (`-fuzz`): 3 repos flagged by the raw pattern; none of the three named CI-fuzzing target repos in the task brief showed it, so no further drill-down was done — noted as a gap.

## 4. Test-library census

Scope: the 34 full-source repos (`kubernetes/kubernetes` excluded — sparse). Command shape (script `test_census.sh`): for each repo, `find <repo> -name '*_test.go' -not -path '*/vendor/*' -not -path '*/testdata/*' -not -path '*/third_party/*'`, then **drop any file whose first line matches `^// Code generated .* DO NOT EDIT`** before grepping imports — this exclusion was added mid-run after a correctness check (below) showed it mattered materially.

**Generated-file correction**: the first pass counted `t.Parallel()` calls in `google/go-github` at 8,887. `google__go-github/github/github-accessors_test.go` alone is 61,169 lines, opens with `// Code generated by gen-accessors; DO NOT EDIT.` (line 1), and accounts for 6,113 of those calls (`grep -c '\.Parallel()' github-accessors_test.go`). Excluding it and its two generated siblings (`github-iterators_test.go`, `github-stringify_test.go`) drops go-github's test-file count 232→229 and its `t.Parallel()` count 8,887→2,387 (still the corpus' largest real count, from genuinely hand-written table-driven tests). `dominikh/go-tools` similarly drops 231→70 test files — 161 of its test files are one-line generated stubs, one per staticcheck check ID (e.g. `dominikh__go-tools@6cb65e58a558:staticcheck/sa1019/sa1019_test.go`). All numbers below are **post-exclusion**.

Import-based library adoption (repos-with-≥1-file / 34; total importing files in parens):

| library | repos | files | notes |
|---|---|---|---|
| `github.com/google/go-cmp/cmp` | 19 | 893 | |
| testify (any of assert/require/suite/mock) | 17 | — | see split below |
| `github.com/stretchr/testify/require` | 15 | 1,809 | |
| `github.com/stretchr/testify/assert` | 13 | 1,243 | |
| `httptest` (`net/http/httptest`) | 23 | 379 | |
| `cmp/cmpopts` | 13 | 155 | |
| `testing/synctest` | 10 | 60 | |
| `github.com/onsi/gomega` | 2 | 142 | both in `kubernetes-sigs/controller-runtime` |
| `github.com/onsi/ginkgo` | 2 | 136 | same 2 repos |
| `go.uber.org/goleak` | 3 | 19 | |
| `github.com/frankban/quicktest` | 1 | 22 | `tailscale/tailscale` only |
| `go.uber.org/mock` | 1 | 9 | `hashicorp/terraform` only |
| `github.com/stretchr/testify/suite` | 3 | 3 | |
| `github.com/stretchr/testify/mock` | 3 | 6 | |
| `gotest.tools/v3` | 1 | 1 | |
| `github.com/rogpeppe/go-internal/testscript` | 1 | 1 | |
| `github.com/matryer/is` | 0 | 0 | not found anywhere in the corpus |
| `github.com/golang/mock` | 0 | 0 | fully displaced by `go.uber.org/mock` where mocking libraries appear at all |

`t.Setenv`/`t.TempDir`/`t.Cleanup`/`t.Parallel`/`t.Context` occurrence counts (regex `\b[a-zA-Z_][a-zA-Z0-9_]{0,3}\.<Method>\(` to catch short receiver names `t`/`tt`/`tb` while excluding long dotted chains — spot-read clean, see below): corpus totals across the 34 repos: `t.Parallel()` 4,913, `t.Context()` 6,629, `t.TempDir()` 3,518, `t.Cleanup()` 1,394, `t.Setenv()` 1,129. Golden-file helpers (`*.golden` files): 561 files in 5 repos, concentrated in `goreleaser/goreleaser`(241) and `dominikh/go-tools`(78) and `aquasecurity/trivy`(122); a `-update`-style flag pattern was found in only 6 repos, meaning most golden files are regenerated by ad-hoc scripts rather than a `go test -update` convention.

**`t.Context()` spot check** (task requires 3-hit verification per pattern; done across 3 repos to rule out the `r.Context()`/HTTP-handler false-positive risk): `google__go-github@48d0a668cde8:github/actions_cache_test.go:32,62,71,...` (all `ctx := t.Context()`), `etcd-io__etcd@7583cc6e7e27` (73 bare `t.Context()`, 64 wrapped in `context.WithCancel(t.Context())`), `goreleaser__goreleaser@ff8de3d6c389` (825 `testctx.WrapWithCfg(t.Context(), ...)`, its own test-context helper built *on top of* `t.Context()`) — **9/9 real, 0% false-positive rate**. This is a clean, corpus-wide signal that Go 1.24's `t.Context()` has already displaced hand-rolled `context.Background()` in test setup across very differently-shaped repos.

## 5. Real toolchain runs

All commands run via `~/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, golangci-lint 2.14.0, staticcheck under it), each `cd`'d into the exemplar clone first, each bounded by `timeout 600` (900 for golangci-lint), output captured to the session scratchpad.

### go vet and staticcheck, 10 repos

```
cd <clone> && timeout 600 run.sh go vet ./... 2>&1
cd <clone> && timeout 600 run.sh staticcheck -f text ./... 2>&1
```

| repo | go vet findings | staticcheck findings |
|---|---|---|
| golang/vuln | 0 | 1 |
| google/go-cmp | 7 | 37 |
| junegunn/fzf | 0 | 9 |
| ko-build/ko | 0 | 0 |
| oras-project/oras-go | 0 | 27 |
| regclient/regclient | 0 | 0 |
| spf13/cobra | 0 | 2 |
| stretchr/testify | 0 | 12 |
| uber-go/zap | 0 | 0 |
| urfave/cli | 0 | 0 |

Corpus check-ID tally across the 88 total staticcheck findings: `U1000` 32, `SA1019` 21, `SA4026` 12, `ST1005` 3, `ST1012` 2, `SA1029` 2, `SA1012` 2, and 6 singletons (`ST1011`, `SA4016`, `SA4006`, `SA4003`, `SA1006`, `S1040`/`S1005`/`S1007`/`S1030` mixed into testify's dozen — see below).

Spot reads: `google/go-github`'s `SA4026` cluster is 12 identical-shape hits in one file — `google__go-cmp@b133f1f1932e:cmp/cmpopts/util_test.go:438-472` (`-0.0` float literal warnings), all in a test helper deliberately exercising float-equality edge cases. `oras-project/oras-go`'s `SA1019` cluster (5 of its 27) is genuine internal API migration debt: `oras-project__oras-go@cb6d6dc79f83:content_internal_test.go:37` — tests still reference `registry.Reference`, which the same repo's own doc comment says is superseded by `registry/remote/properties.Reference`. `stretchr/testify`'s 12 findings are almost entirely in **vendored/forked internal packages**, not testify's own code: `internal/spew` (a fork of `davecgh/go-spew`, `stretchr__testify@87a7b9d57689:internal/spew/bypass.go:37`, `U1000`) and `internal/difflib` (a fork of `pmezard/go-difflib`, 3× `S1005`/`S1030` findings) — testify's *own* assertion code contributes only `assert/assertions.go:1558` (`ST1005`, capitalized error string) and `assert/errors.go:10` (`ST1012`, `AnError` naming).

`go vet`'s 7 hits on `google/go-cmp` are all deliberate test fixtures: `cmp/compare_test.go:553` constructs `&pb.Stringer{"hello"}` (unkeyed literal) specifically to test cmp's Stringer-formatting behavior on such values — vet's `composites` analyzer is doing its job, but the "finding" is an intentional test input, not a bug.

### golangci-lint with each repo's own config, 5 repos that have one

```
cd <clone> && timeout 900 run.sh golangci-lint run ./... 2>&1
```

| repo | issues | detail |
|---|---|---|
| spf13/cobra | 0 | clean (one `nolintlint` exclusion-rule note logged, 0 actual issues) |
| oras-project/oras-go | 0 | clean |
| uber-go/zap | 0 | clean |
| urfave/cli | 0 | clean |
| ko-build/ko | 1 | `gosec` `G703` (path-traversal-via-taint) at `ko-build__ko@fcaeb337b6bd:pkg/build/gobuild.go:436` (`os.RemoveAll(tmpDir)`) |

**4/5 own-configured repos pass their own gate with zero issues** — these are mature, actively-maintained configs, not aspirational ones. The one exception is a config-drift smell, not a code bug: `tmpDir` there is a program-controlled `os.MkdirTemp` result, not attacker input; ko's `gosec.excludes` list (`ko-build__ko@fcaeb337b6bd:.golangci.yaml:21-22`) excludes only `G115`, and `G703` is not in it — gosec's ruleset (bundled inside golangci-lint 2.14.0) has grown faster than ko's exclude list has been revisited.

### strict `default: all` pass, 3 repos

Config written outside any clone, per the task's own-config-vs-strict-config isolation requirement:

```
# ~/.cache/research-lang/go-tools/wave1-golangci-strict.yml
version: "2"
linters:
  default: all
```
```
cd <clone> && timeout 900 run.sh golangci-lint run --config <path-above> \
  --max-issues-per-linter=0 --max-same-issues=0 --output.text.path stdout ./... 2>&1
```

Total issues: `spf13/cobra` 2,156, `ko-build/ko` 2,784, `oras-project/oras-go` 19,268 (oras-go is ~7x larger by file count than cobra, which roughly tracks).

Noise linters (top 6 by combined volume across all 3 — **none of these appear in any of the 23 real configs' `enable:` lists**):

| linter | cobra | oras-go | ko | verdict |
|---|---|---|---|---|
| `wsl` | 452 | 6,931 | 601 | noise — deprecated (see below) |
| `wsl_v5` | 93 | 1,283 | 130 | noise — its replacement, still noisy |
| `noinlineerr` | 82 | 1,047 | 149 | noise |
| `paralleltest` | 265 | 1,012 | 108 | noise (demands `t.Parallel()` in every subtest) |
| `nlreturn` | 155 | 1,298 | 186 | noise (blank-line-before-return style) |
| `exhaustruct` | 418 | 2,722 | 280 | noise (demands every struct field set at every literal site) |
| `varnamelen` | 39 | 782 | 154 | noise |
| `goconst` | 151 | 505 | 67 | noise-leaning (fires on any repeated string ≥ default threshold) |

Signal linters (fired rarely or never across all 3, i.e. precise when they do fire): `bodyclose`(0/88/0), `canonicalheader`(0/20/0), `fatcontext`(0/2/0), `unconvert`(0/13/0), `usestdlibvars`(0/7/0), `prealloc`(0/2/0), `nilerr`(0/2/2), `contextcheck`(0/2/1), `wastedassign`(1/0/2), `predeclared`(2/0/0) — these are exactly the shape of a "MUST-rule" linter: it should either fire zero times on mature code or point at something real. `staticcheck` under golangci-lint's own wrapper agreed with the standalone `staticcheck` run within noise (24 vs 27 for oras-go — the 3-finding gap is `default:all`'s narrower per-package build scope for a couple of internal packages, not a disagreement).

**Deprecation-pair discovery**: `default: all` in golangci-lint 2.14.0 enables *both* halves of an in-flight linter rename, producing double-counted noise. Confirmed via the run's own warnings (`spf13__cobra` strict-run log): `level=warning msg="The linter 'wsl' is deprecated (since v2.2.0) ... Replaced by wsl_v5."`, `level=warning msg="The linter 'gomodguard' is deprecated (since v2.12.0) ... Replaced by gomodguard_v2."`, `level=warning msg="The linter 'exhaustruct' is deprecated (since v2.13.0) ... Replaced by exhaustruct_v5."` — `wsl`/`wsl_v5` are indeed both in the noise table above, confirming the double-count is real, not coincidental naming.

## Smells (ranked)

1. **`default: all` double-counts deprecated/successor linter pairs.** `wsl`+`wsl_v5`, `gomodguard`+`gomodguard_v2`, `exhaustruct`+`exhaustruct_v5` all fire simultaneously under `default: all` in golangci-lint 2.14.0 ([§5](#5-real-toolchain-runs)) — anyone using "all" as a literal audit baseline (as this task's own wave-5 instruction does) inflates noise-linter counts by roughly 2x for at least 3 linters. A future authored rule that recommends "try `default: all` once to see what's missing" should say to read the deprecation warnings first and drop the deprecated half.
2. **gosec exclude lists drift behind the shipped ruleset.** `ko-build/ko`'s own config only excludes `G115` (`ko-build__ko@fcaeb337b6bd:.golangci.yaml:21-22`) and its own-config run still surfaces a live `G703` finding ([§5](#5-real-toolchain-runs)) — a maintained repo passing its own gate today can still be one gosec-version-bump away from a new failure, because gosec's check roster grows inside golangci-lint point releases without a config bump forcing function.
3. **`-tags`/`-timeout`/`-short` substring collisions are a real grep trap**, not a hypothetical one: a naive single-dash-flag census over CI YAML is ~57% false positive on `-tags` alone, because git/az/skopeo/GH-Actions all use a homonymous double-dash or hyphenated-key form ([§3](#3-ci-workflow-gates)). Any future automated CI-gate detector for the fleet needs a context-anchored pattern (`go test...-flag=` ), not a bare substring.
4. **Generated test files silently dominate raw import/call counts.** One file, `google/go-github`'s `github-accessors_test.go`, was single-handedly responsible for 69% of the corpus's raw (pre-correction) `t.Parallel()` count ([§4](#4-test-library-census)). Any grep-based census of Go test idioms across a real codebase must gate on the `Code generated ... DO NOT EDIT` first-line marker before counting, or its numbers are dominated by whichever repo happens to have the biggest generator.
5. **staticcheck findings on a mature, unconfigured library often live in vendored-in forks, not the library's own code.** `stretchr/testify`'s 12 staticcheck findings are almost all inside `internal/spew` and `internal/difflib`, forks of two other projects ([§5](#5-real-toolchain-runs)) — a naive "staticcheck found N issues in testify" claim would overstate testify's own code quality.
6. **`kubernetes/kubernetes`'s `formatters:` section is present but empty** (`kubernetes__kubernetes@dfd7b93a1783:hack/golangci.yaml`) — golangci-lint runs no format check for k8s; formatting is enforced by a separate shell script (`hack/verify-gofmt.sh`, inferred from the neighboring `hack/verify-golangci-lint*.sh` naming convention, not independently re-verified in this pass — flagged as a gap below) rather than through the linter config that otherwise governs everything else.

## Patterns worth encoding

- **The 17-linter consensus set from [§1](#1-golangci-lint-configuration)** (govet, ineffassign, unused, staticcheck, misspell, revive, unconvert, errcheck, gosec, whitespace, depguard, bodyclose, gocritic, unparam, nolintlint, errorlint, modernize) is a much better MUST-enable baseline for an authored `go-quality` rule than golangci-lint's own 5-linter "standard" default — it is what mature, differently-shaped real projects converge on independently.
- **`issues.max-issues-per-linter: 0` + `max-same-issues: 0`** is used by nearly half the configured corpus (11/23) specifically so CI shows every occurrence rather than golangci-lint's default caps (50/3) — worth recommending explicitly, since the tool's own defaults hide the true finding count from a first-time reader.
- **depguard's most common deny targets are `io/ioutil` and `github.com/pkg/errors`** — both pre-1.16/pre-1.13 idioms H1 named — giving concrete, citable evidence for an authored anti-pattern rule rather than a general assertion.
- **`t.Context()` adoption is corpus-wide and clean** ([§4](#4-test-library-census)) — a rule recommending it over `context.Background()` in test setup has strong, diverse grounding, and should note the Go 1.24 version floor.
- **pebble's lint-as-`go test` pattern** (`cockroachdb__pebble@13596f1e1cea:Makefile:60`, `internal/lint`) is a legitimate alternative to an external linter for project-specific forbidden-import/forbidden-pattern rules with zero extra tooling dependency — worth a mention as an option in a modernization/toolchain skill, not just "install golangci-lint."
- **`go mod tidy -diff`/`--diff`** (non-destructive tidy-check, no `git diff` dance needed) is already used by 2 of the 6 repos that diff-check `go.mod` (`cli/cli@9b031151a825:.github/workflows/lint.yml:41`, `golangci/golangci-lint@032d962e0399:.github/workflows/pr-checks.yml:30`) — the more modern of the two idioms and worth being the one an authored CI-gate skill recommends.
- **Standalone `staticcheck.conf` correlates with *not* having golangci-lint**, in all 4 cases found ([§2](#2-other-analyzers)) — a repo tends to pick one static-analysis entry point, not layer both (the one partial exception, `tailscale/tailscale`, layers a project-wide `staticcheck.conf` *underneath* golangci-lint's own `staticcheck.checks` settings, i.e. golangci-lint's own bundled staticcheck ignores the standalone conf file — worth flagging in a skill as a real gotcha if the fleet ever recommends both).

## Contradictions of the frame

- **H4 needs a correction, not a confirmation.** "golangci-lint v2 is the de-facto gate in most exemplars" holds at the headline level (23/35 = 66%), but "most" undersells how contested the remaining third is: `golang/tools`, `golang/vuln` (Google-internal CI), `google/go-cmp`, `grpc/grpc-go`, `hashicorp/terraform`, `cockroachdb/pebble`, `dominikh/go-tools`, `stretchr/testify` are not stragglers — they are some of the most-used libraries in the whole corpus, each with a deliberate, different, equally rigorous gate (staticcheck.conf, revive.toml, lint-as-go-test, or plain `go vet`+`gofmt` shell scripts). An authored rule that treats "no golangci-lint config" as a smell would be wrong for a meaningful fraction of exactly the repos the fleet should imitate.
- **H4's "go vet defaults are universal" is well-supported**, more strongly than the frame implied: 9/10 hand-run repos had zero vet findings, and golangci-lint's own `govet` linter is enabled in 22/23 configured repos, whether by explicit list or by the `default: standard`/`none`-with-enable inheritance in [§1](#1-golangci-lint-configuration).
- **H5 is contradicted at the numbers level.** "testify dominates tests in the ecosystem" does not hold in this corpus: testify (any submodule) appears in 17/34 full-source repos, go-cmp in 19/34 — go-cmp is *ahead*, not behind, and the split is close to even rather than testify-dominant. `prometheus/prometheus` even actively discourages `testify/assert` in favor of `require` via its own `depguard` rule. An authored rule set should present both as first-class, not pick testify as the default because "the ecosystem prefers it" — the exemplar evidence says the ecosystem is split.
- The frame's wave-5 instruction to "record [a v1 config failing under v2] as a finding" **did not produce a finding**, because it never occurred: 0/23 configured repos are on the v1 schema. Worth stating plainly rather than silently omitting, since it is itself informative — this corpus's maintainers keep pace with golangci-lint's breaking-change cadence.

## Gaps

- **Fuzzing-in-CI** was flagged by a raw `-fuzz`/`-fuzztime` regex in 3 repos ([§3](#3-ci-workflow-gates)) but not drilled into — which 3, and whether they run continuously or only on-demand, is unresolved. A follow-up dive should name them and read the actual workflow step.
- **`kubernetes/kubernetes`'s formatting enforcement mechanism** ([Smells §6](#smells-ranked)) is inferred from a naming convention (`hack/verify-golangci-lint*.sh` implies a sibling `hack/verify-gofmt.sh`) rather than directly confirmed — the sparse checkout may or may not include that script; not verified in this pass.
- **Bazel-native CI** (`.bazelci/presubmit.yml` for `rules_go`/`bazel-gazelle`) was noted as present but not read — its Go-specific gate content (which `nogo` analyzers run, if any, in the rules_go/gazelle presubmit itself) is covered-elsewhere territory for `bazel-quality`, but a cross-reference dive should confirm rather than assume.
- **govulncheck** was censused only as "mentioned in a workflow" (11/32 repos); the actual invocation shape (action version, `-scan` mode, whether it gates merge or just reports) was not extracted per-repo — a follow-up should pull that detail for the govulncheck-adoption evidence a `go-quality` rule would cite.
- **The strict `default: all` pass ran on only 3 of the 10 hand-picked repos** (cobra, oras-go, ko), per the task's own scope — `google/go-cmp`, `stretchr/testify`, `uber-go/zap`, `junegunn/fzf`, `urfave/cli`, `regclient/regclient`, `golang/vuln` were not run under strict mode, so the noise/signal linter split in [§5](#5-real-toolchain-runs) is grounded in 3 repos, not 10; the direction is consistent with the golangci-lint own-run and staticcheck-standalone results on the other 7, but was not independently re-confirmed at `default: all` breadth.
- **Test-library census counted imports, not call-site density** for testify/go-cmp/ginkgo — "17 repos import testify" does not distinguish a repo with 2 testify call sites from one with 1,800; the per-file counts in [§4](#4-test-library-census) partially address this (e.g. `require` 1,809 files vs `assert` 1,243 files) but a true density metric (assertions per test function) was out of scope for this pass.

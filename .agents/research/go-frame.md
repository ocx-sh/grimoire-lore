---
title: Go expertise (language, toolchain, modules, testing, release, ecosystem) — phase 0 frame
program: go
date: 2026-09-26
method: research-lang (one language, its toolchain and module system, its lint and test ecosystem, its release and distribution tooling, and Bazel-for-Go as a complement to bazel-quality)
status: active
branch: go worktree (/home/mherwig/dev/grimoire-lore/.agents/worktrees/go) — research lands on branch `go`, not `main`
---

# Go — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn; corrections are appended at the bottom, never
edited into the body.

## The brief

One word: "go". The requester set the goal as *become an expert of Go and its
ecosystem*. There is no topic list, so the whole agenda is self-directed: the
scout wave and the grounding numbers decide what gets researched.

## The domain and its era

- **The language** as written in 2026: generics (and generic type aliases),
  range-over-func iterators (`iter.Seq`), range-over-int, per-iteration loop
  variables (1.22), `min`/`max`/`clear`, `errors.Join`, the `slices`, `maps`,
  `cmp`, `iter`, `unique`, `weak` packages, `log/slog`, `math/rand/v2`,
  `os.Root`, `testing/synctest`, `sync.WaitGroup.Go`, `testing.B.Loop`,
  `new(expr)`, `errors.AsType`, the `encoding/json/v2` experiment, the
  memory model, and whatever 1.27 changed.
- **The toolchain**: `go` command, `GOTOOLCHAIN` and the `toolchain`
  directive, the `tool` directive (1.24), `go vet` and its analyzer set,
  `go fix` with modernizers (1.26), gopls, the race detector, fuzzing,
  coverage (`-coverpkg`, `GOCOVERDIR`, integration coverage), PGO, pprof and
  the execution tracer and flight recorder, `GODEBUG` compatibility.
- **Modules**: MVS, `go.sum` and the checksum database, `GOPROXY` /
  `GOPRIVATE` / `GONOSUMDB`, major-version suffixes, `retract`, `replace`,
  workspaces (`go.work`), vendoring, multi-module repositories, tagging.
- **Quality gates**: `go vet`, staticcheck, golangci-lint v2 and its roster,
  gofmt/gofumpt/goimports, govulncheck, deadcode, errcheck/errorlint/gosec
  families; testing with stdlib vs testify vs go-cmp, golden files,
  testscript, table tests, `t.Parallel`, `t.Context`, goleak, synctest.
- **Release and distribution**: static binaries, `CGO_ENABLED`, `-trimpath`,
  reproducible builds, version stamping (`-ldflags -X` vs
  `debug.ReadBuildInfo`), goreleaser, ko, OCI images, cosign/SLSA/SBOM,
  cross-compilation, Homebrew/Scoop/winget.
- **Bazel for Go**: `rules_go`, gazelle, `go_deps` under bzlmod, nogo — a
  complement to the published `bazel-quality` set, whose depth files cover
  Rust, Python, TypeScript, C++ and Java/Kotlin but not Go.

Era to **verify, not assume** (the recent-shifts scout owns it): Go 1.27.1 is
current (1.27.0 released August 2026; measured locally via
`ocx index list ocx.sh/golang/go`); the two supported releases are 1.27 and
1.26. golangci-lint 2.14.0 and staticcheck 2026.2.1 are current (installed
2026-09-26 with `go install …@latest`).

## The codebases that will adopt the output

**The fleet has no Go code of its own** (measured 2026-09-26: the only
`go.mod` files under `/home/mherwig/dev` are inside a Bazel repository cache
and one devcontainer example). So:

1. **Future fleet Go code, by analogy with what the fleet already builds**:
   - an OCX SDK for Go, mirroring `/home/mherwig/dev/ocx-sdk-python`
     (typed library wrapping the `ocx` CLI, zero or near-zero dependencies,
     strict gates, 100% coverage);
   - Go CLIs in the ocx/grimoire mould (OCI registries, content-addressed
     stores, atomic file writes, exit-code contracts, TTY-aware output) —
     the Rust repos `ocx` and `grimoire` are the contract reference;
   - Go binaries the fleet *distributes*: `ocx-mirror` mirrors
     goreleaser-built upstream releases (`golang/go`, `goreleaser`, `ko`,
     `crane`, `hugo` are in the ocx index), so what makes a Go release
     artifact well-formed matters to the fleet even without Go source.
   - Bazel-built Go via `rules_ocx` consumers.
2. **The exemplar corpus** stands in for grounding: 35 upstream repositories
   of deliberately different shapes, fetched 2026-09-26 as depth-1 clones
   (full source; `kubernetes/kubernetes` sparse, config only) under
   `~/.cache/research-lang/exemplars/go/<owner>__<repo>`. Recreate with
   `go-audit/scratch/fetch-exemplars.sh <dir>`. Table below.
3. **A measurement toolchain** exists on disk: Go 1.27.1 via ocx plus
   staticcheck, golangci-lint, govulncheck, gofumpt, goimports, deadcode and
   modernize under `~/.cache/research-lang/go-tools/`; run anything through
   `~/.cache/research-lang/go-tools/run.sh <cmd>` (caches on disk, never
   `/tmp`). This means verification commands can be *run* against planted
   fixtures and exemplars, not only read.

## Existing AI config that already touches this domain

None in the catalog. Adjacent sets that a Go topic must not duplicate:
`docs-quality` (docs pages), `bazel-quality` (bzlmod, hermeticity, caching,
CI — a Go depth file slots in beside `java.md`), the Rust `cli-contract`
depth file (the fleet's exit-code and stream contract, which a Go CLI should
mirror rather than reinvent), and the generic CI/security material in the
Rust and Python sets.

## Orchestrator's hypotheses (to test, not to assume)

- **H1** Agent mistakes cluster on pre-1.21 idioms: `interface{}`,
  `io/ioutil`, `sort.Slice`, hand-rolled `min`/`max`/`contains`, loop-variable
  copies, `github.com/pkg/errors`, `golang/mock`, `x/exp/slices`, `rand.Seed`.
- **H2** Error handling (wrapping, sentinel vs typed, `errors.Is`/`As`,
  `%w` vs `%v` at boundaries) and context/cancellation discipline are the two
  largest correctness surfaces.
- **H3** Goroutine lifetime (leaks, unbounded fan-out, missing `errgroup`,
  `time.After` in loops pre-1.23) is where production incidents cluster.
- **H4** golangci-lint v2 is the de-facto gate in most exemplars; staticcheck
  alone is rarer; `go vet` defaults are universal.
- **H5** testify dominates tests in the ecosystem; the Go team and Google style
  prefer stdlib + go-cmp; the rule set must pick one position.
- **H6** `toolchain` directives are common, `tool` directives rare, `go.work`
  rare and usually not committed.
- **H7** `log/slog` has displaced zap/zerolog for new code but not in the
  exemplars.
- **H8** Release hygiene (`-trimpath`, `CGO_ENABLED=0`, reproducible
  `mod_timestamp`, checksums, SBOM, signing) is goreleaser-configured in most
  CLI exemplars.

## Artifact set (what this program must converge to)

Hypothesis, revised by the map:

| Artifact | Kind | Glob / trigger |
|---|---|---|
| `go-quality` | rule: index + support directory | `**/*.go` |
| `go-modules` | rule | `**/go.mod`, `**/go.sum`, `**/go.work` (names the go command guarantees); whether tool-guaranteed config names (`.golangci.yml`, `.goreleaser.yaml`) join is a map decision |
| one to three skills | procedures, not standards | candidates: release/distribution, toolchain upgrade and modernization, diagnosing leaks/races/perf |
| `go-essentials` | bundle, untagged members | |
| `bazel-quality/go.md` | depth-file offer to the published Bazel set | routed from its index |

Rule IDs are `GO-<FAMILY>-nn`; a prefix belongs to one rule set forever.

## Corpus namespace

`go-frame.md`, `go-audit/`, `go-topic-map.md`, `go-topic-map/` (scouts and
scratch), `go-<group>.md` consolidations with `go-<group>/` dives.

## Budget and sequencing

Wave 1: 5 grounders + 7 scouts (sonnet). Map (opus). Wave 2: ≤ 14 dives
(sonnet) piped into ≤ 7 consolidations (opus). Harvest, then wave 3 as the
follow-ups demand. Converge (opus). Author (opus drafters), review against
planted fixtures with the real toolchain (opus), fix, validate, commit on
`go`, PR. Measured cost of the JVM program was ~21M subagent tokens; this
program targets well under that by keeping waves at ≤ 14 dives and
authoring fewer, denser depth files.

## Exemplar corpus as fetched (2026-09-26)

| Repo | SHA | .go files |
|---|---|---|
| aquasecurity/trivy | ae561f8cca36 | 1629 |
| bazelbuild/bazel-gazelle | 63c9a3d2078f | 948 |
| bazel-contrib/rules_go | 970e99d77c8b | 493 |
| caddyserver/caddy | 54937914234b | 354 |
| charmbracelet/bubbletea | d5bfd5c2ff74 | 111 |
| cli/cli | 9b031151a825 | 1000 |
| cockroachdb/pebble | 13596f1e1cea | 782 |
| containerd/containerd | 934434dde54b | 5505 |
| dominikh/go-tools | 6cb65e58a558 | 1015 |
| etcd-io/etcd | 7583cc6e7e27 | 1105 |
| golangci/golangci-lint | 032d962e0399 | 1101 |
| golang/tools | d2d3de9f066e | 1946 |
| golang/vuln | 709015412431 | 121 |
| google/go-cmp | b133f1f1932e | 42 |
| google/go-containerregistry | 0c8bedb78437 | 1431 |
| google/go-github | 48d0a668cde8 | 506 |
| goreleaser/goreleaser | ff8de3d6c389 | 410 |
| grpc/grpc-go | acccf8cd101a | 1071 |
| hashicorp/terraform | db4eef44f5bb | 2017 |
| junegunn/fzf | b1be3a8be1b8 | 89 |
| ko-build/ko | fcaeb337b6bd | 98 |
| kubernetes/kubernetes | dfd7b93a1783 | 17858 |
| kubernetes-sigs/controller-runtime | d0127f7f66de | 378 |
| oras-project/oras | a0cd4de5cfcd | 300 |
| oras-project/oras-go | cb6d6dc79f83 | 252 |
| prometheus/prometheus | 270db2915054 | 736 |
| regclient/regclient | 43d2acb9fafd | 252 |
| restic/restic | 5127c4abf921 | 559 |
| sigstore/cosign | 907c3d899c0e | 347 |
| spf13/cobra | adbc8813901b | 36 |
| stretchr/testify | 87a7b9d57689 | 62 |
| syncthing/syncthing | 94c3c1cdef71 | 548 |
| tailscale/tailscale | 6b3a45f14ef6 | 2459 |
| uber-go/zap | 4892335e05f1 | 142 |
| urfave/cli | d1d810845dbc | 70 |

## Corrections

(none yet)

## Corrections after wave 1 (2026-09-26, from go-topic-map.md › Frame corrections)

- H1 confirmed with numbers: 26.8 modernize diagnostics/10k LOC on CI-green code, 62% interface{}->any; sort.Slice family 1,496 vs slices/maps/cmp 8,692; 142 loop-var copies ([shape] §3, §7)
- H2 confirmed and sharpened: %w 9,310 vs %v-of-err 2,300; 222 == io.EOF; 91 message matches; context.Background() 964 and TODO() 275 outside main ([run] §1-2)
- H3 confirmed, but its time.After example is obsolete: 78% of errgroup.Go unbounded, 94 for-go sites; the time.After leak was fixed in 1.23 and asynctimerchan removed in 1.27 ([run] §3, [fail] §6)
- H4 corrected: golangci-lint v2 in 23/35 (all v2); the 12 without include Go-team repos and top libraries; golangci standard default is 5 linters; 'go vet defaults universal' holds only via golangci govet, since go test runs 11 of 36 analyzers ([gates] §1, §5; go1.27.1:src/cmd/go/internal/test/test.go:654)
- H5 corrected: testify 17/34 vs go-cmp 19/34, split by lineage, not testify-dominant ([gates] §4)
- H6 corrected: toolchain 5/35 (minority), tool 4/35, go.work committed 4/35 (all multi-module), with go.work.sum in 3/4 ([modrel] §1)
- H7 corrected: slog in 11/34 repos vs zap in 6; slog leads by breadth, zap by file count ([run] §4)
- H8 false: goreleaser in 12/35 ([map] M4); mod_timestamp 3/12, signing 4/12, signs+sboms+checksum together 3 ([modrel] §3, table over headline)
- H8 premise false: the fleet mirror consumes raw per-platform binaries verified by github_asset_digest, not goreleaser output (mirror-bazelbuild@713abea9fbb8:mirror-base.yml:23-24; [cfg] §5)
- Era: sync.WaitGroup.Go and GA testing/synctest are 1.25, not 1.24; synctest.Run removed 1.26, Sleep added 1.27 ([shift] §4)
- Era: encoding/json/v2 is default-on in 1.27.1 with GOEXPERIMENT=nojsonv2 as opt-out, not experimental (go1.27.1:src/internal/buildcfg/exp.go:87, [map] M1)
- Era: a stdlib uuid package exists in 1.27, so google/uuid is superseded at go>=1.27 ([map] M2)
- Era: go fix is the modernizer runner since 1.26 with 26 fixers; go fix -diff exits non-zero on a diff; the omitzero fixer changes JSON output ([map] M3)
- Era: staticcheck 2026.2 disabled SA5011 (use gopls nilness) and added SA9010 ([shift] §10)
- Tools: the vet waitgroup analyzer and the waitgroupgo fixer are different tools, not a rename ([cod] §1, [map] M3)
- Artifact set: the frame's .goreleaser.yaml glob matches 2/13 goreleaser configs; tool-config globs join go-modules with 13 patterns ([map] M4-M6, goreleaser@ff8de3d6c389:cmd/config.go:47-52)
- Artifact set: Bazel for Go is 2/35 (both dogfood), go_deps has 0 prior research hits, and the Bazel program scoped rules_go out (bazel-topic-map.md:797); BZL-GO is conditional on owner Q7
- Artifact set: docs-instrument already owns Go Example functions (tested-examples-by-language.md:42-43); doc comments go to GO-API ([cfg] §6)
- Measurement: the frame's .go counts include vendor/testdata (containerd 5,505 -> 974 production files) ([shape] §1)
- Measurement: golangci census is 23/35, not 21/34; a depth-2 search missed etcd tools/.golangci.yaml and k8s hack/golangci.yaml ([map] M5)
- Audit citation fixed: [cfg] cites mirror-base.yml:22-23; the lines are 23-24 at mirror-bazelbuild@713abea9fbb8

## Orchestrator decisions (2026-09-26)

The owner set the goal as a fully autonomous run, so every map question for the owner takes the map's default. Recorded here so a later reader does not re-litigate them:

- Q1 Go floor policy — default: libraries and the SDK declare the oldest supported release's .0 (today go 1.26.0) or lower if they need less; CLIs declare the current release (go 1.27.0); no toolchain line unless it pins a security patch.
- Q2 SDK runtime dependencies — default: stdlib-only at runtime, go-cmp for tests only (mirrors ocx-sdk-python's zero runtime deps).
- Q3 CLI framework — default: cobra + pflag for multi-command CLIs with the exit-64 wiring from wave 2; stdlib flag for single-command tools; urfave/cli v3 not adopted.
- Q4 Distribution — default: goreleaser v2 raw per-platform binaries named <tool>-<goos>-<goarch>[.exe] (mirror-compatible), checksums.txt, cosign keyless, GitHub build-provenance attestations; no Homebrew/Scoop/winget until asked.
- Q5 Coverage gate — default: the SDK is held at 100% by a threshold script; CLIs get no numeric gate, only integration coverage via GOCOVERDIR.
- Q6 Windows — default: first-class, mirroring ocx: a windows-latest CI leg, atomic replace with a bounded retry, reserved-name checks on registry-derived file names.
- Q7 Bazel for Go — default: a compact rules/bazel-quality/go.md (<=200 lines, BZL-GO) in bazel-quality 0.3.0, framed 'if you adopt Bazel for Go'; this reopens a scope the Bazel program closed (bazel-topic-map.md:797). On 'no', section O stays as research.
- Q8 Services and daemons — default: not a named consumer; one short SHOULD section each in network.md and observability.md, no service-specific depth file.

## Corrections after wave 4 (2026-09-26, convergence harvest)

- x/tools >= v0.50.0 excludes encoding/json/v2 and jsontext from stdversion (toonew.go:28-29). golangci-lint 2.14.0 and nogo both build against v0.50.0, so neither can catch the GO-LANG-04 violation. Bare go vet on go1.27.1 still catches it, because its vendored toonew.go:24-25 excludes only testing/synctest.
- On go-containerregistry, a layer's request context is fixed when remote.Image/remote.Layer is called (image.go:154,272; layer.go:38-39; fetcher.go:323). The watchdog's WithCancelCause must be created before that call and passed via remote.WithContext.
- QF1009 blocks under the fleet config; it is not a hint (C-22).
- go test runs 12 of the 35 vet analyzers on go1.27.1, not 11 of 36 (C-25).
- A unix build tag on the SDK signal classifier breaks the Windows build (GO-API-19).
- ExitCode() is -1 for a signal death seen in-process, and 255 after a shell forwards it (GO-API-19).
- Cmd.Wait returns the process error in preference to the copy error (exec.go:944-959), so the context cause must be checked before exit classification (GO-API-20).
- ggcr's write path uses retry.Never, so WithRetryStatusCodes has no effect on writes (GO-NET-17 gap 4).
- The dist CDN returns 200 for every user agent tested (GO-NET-18).
- -buildvcs=true exits 0 on the golang/go#74763 layout, so an exit code does not prove stamping (GO-REL-03).
- workspace_status_command does not expand %workspace% (BZL-GO-09).
- Bazel's default fastbuild strips binaries and -c opt does not (BZL-GO-15).
- nogo passes the SDK's GoVersion rather than the module's go line, so stdversion is inert under nogo (BZL-GO-06/07).
- A nested cobra group that is not sealed exits 0 on a typo (GO-CLI-21).
- gopls v0.23.0 has a yield analyzer; vet and golangci-lint 2.14.0 have none (GO-LANG-08).
- Interface methods never take type parameters, even on 1.27 (GO-LANG-23).
- A generic type alias needs go 1.23, including cross-package use (GO-LANG-03).
- nogreenteagc is still accepted on 1.27.1 and is a real opt-out (GO-OBS C9).
- A runtime-sized make above 32 B heap-allocates even when -m reports 'does not escape' (GO-OBS C7/C8).

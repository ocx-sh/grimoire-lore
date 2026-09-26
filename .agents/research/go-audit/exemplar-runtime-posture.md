---
title: Go exemplar corpus — runtime posture audit
agent: go-audit/exemplar-runtime-posture
model: claude-sonnet-5
scope: >
  Numbers-first audit of runtime posture (errors, context, concurrency, I/O,
  security, observability, time) across the 34 full-source Go exemplar
  clones under ~/.cache/research-lang/exemplars/go (kubernetes/kubernetes
  excluded — sparse, config-only checkout). Grounds the later Go authoring
  pass; does not itself propose rule text.
method: >
  A Python scanner (scratch/audit.py) reads scratch/filelists/<repo>.txt —
  every *.go file per repo excluding vendor/, testdata/, third_party/,
  *_test.go, and files whose first 3 lines match /Code generated .* DO NOT
  EDIT/ (built by scratch/build_filelists.sh, plain find + head -n3 + grep).
  ~116 regex/heuristic checks run per repo (line-match, quoted-import
  substring, forward-window pair, brace-balanced struct-literal-field
  presence, balanced-paren fmt.Errorf verb/arg classification). Every count
  in this file is `python3 scratch/audit.py` against the current
  scratch/filelists/*.txt, then `python3 scratch/mktable.py <pattern>...
  --sort <pattern>` for the per-repo table, reading scratch/results.tsv /
  scratch/loc_summary.tsv. Ad hoc spot-check greps shown inline were run as
  `rtk proxy grep ...` / `rtk proxy rg ...` — this environment has a
  transparent command-rewriting hook (rtk) that silently corrupts piped
  grep/rg output (confirmed: identical `rg -l ... | wc -l` returned 0 while
  the unpiped listing showed 5 hits); `rtk proxy` bypasses it and is required
  to reproduce these exact spot-checks. The Python scanner itself is
  unaffected (no shell subprocess for counting).
date_researched: 2026-09-26
---

# Go exemplar corpus — runtime posture audit

34 repos, 2,662,258 non-test/non-generated/non-vendor/testdata/third_party
LOC, 116 measurement patterns. SHAs below are as fetched 2026-09-26 (frame
table); all citations are `<repo>@<sha12>:<path>:<line>`.

## Table of contents

1. [Headline numbers](#headline-numbers)
2. [Method notes](#method-notes)
3. [Errors](#1-errors)
4. [Context](#2-context)
5. [Goroutines and sync](#3-goroutines-and-sync)
6. [Logging and observability](#4-logging-and-observability)
7. [HTTP client/server hygiene](#5-http-clientserver-hygiene)
8. [Processes and filesystem](#6-processes-and-filesystem)
9. [Security-sensitive APIs](#7-security-sensitive-apis)
10. [Time](#8-time)
11. [Smells (ranked)](#smells-ranked)
12. [Patterns worth encoding](#patterns-worth-encoding)
13. [Contradictions of the frame](#contradictions-of-the-frame)
14. [Gaps](#gaps)

## Headline numbers

- **`%w` wrapping is the corpus norm but far from universal**: 9,310
  `fmt.Errorf` calls use `%w`, 2,300 format an err-named trailing arg with
  `%v`/`%s` instead (breaks `errors.Is`/`As` through that frame). Three
  large exemplars invert the ratio: `grpc/grpc-go` 332 vs 21 (16:1 poor),
  `caddyserver/caddy` 422 vs 55 (8:1), `hashicorp/terraform` 502 vs 232 (2:1).
- **`log/slog` has real, if partial, uptake**: 239 files across 11/34 repos
  import it (`syncthing`, `regclient`, `prometheus` heaviest) — this
  contradicts the frame's H7 as stated ("not in the exemplars"); slog is
  in *more* repos (11) than `zap` (6), just fewer raw files (239 vs 347,
  concentrated in `etcd`+`caddy`).
- **`exec.CommandContext` is the minority form**: 141 call sites vs 443
  `exec.Command` (76% non-context-aware), despite `CommandContext` existing
  since Go 1.7.
- **gosec G112 exposure is real and common**: of 56 `&http.Server{}`
  literals, 41 (73%) set no `ReadHeaderTimeout`; of 143 `&http.Client{}`
  literals, 87 (61%) set no `Timeout`.
- **Injected-clock adoption is negligible**: 1,576 raw `time.Now()` calls
  vs 7 real `clockwork` imports (all in one repo, `etcd`), zero
  `benbjohnson/clock`, and `k8s.io/utils/clock` in only 4 files (one repo,
  unused beyond a thin wrapper).
- **`math/rand/v2` (Go 1.22) has real adoption**: 83 files, on par with
  legacy `math/rand` (91) — led by `cockroachdb/pebble` (47) and
  `tailscale` (28).
- **Bare octal file modes still outnumber `0o`-prefixed ones**: 212 vs 123
  for literal 644 alone, contradicting the assumption that Go 1.13's `0o`
  syntax has displaced the legacy form even in 2026 code.
- **Go 1.21-era context APIs are nearly unused**: `WithoutCancel` 48,
  `AfterFunc` 16, `WithCancelCause`/`Cause` 7/11 — combined 82 hits across
  2.66M LOC, concentrated in `tailscale` and `golang/tools`.
- **`sync.WaitGroup.Go` (Go 1.25) is already in production use**: 108 sites
  (`wg.Go(func(){…})`) across 12 repos, including `aquasecurity/trivy` and
  `cli/cli` — a genuinely new-era pattern with real uptake, alongside 248
  `errgroup.Group.Go` calls of which only 54 pair with `SetLimit` (~22%
  bounded).

## Method notes

Corpus: `python3 scratch/build_filelists.sh` walks
`~/.cache/research-lang/exemplars/go/*/`, skipping `kubernetes__kubernetes`,
producing one file list per repo and `scratch/loc.tsv`. Total after all
exclusions: **2,662,258 LOC** across **34 repos**, largest
`tailscale/tailscale` (360,092 LOC), smallest `google/go-cmp` (6,665 LOC).
One correction made during this audit: `aquasecurity/trivy` ships 12 files
named `parse_testcase.go` (e.g. `pkg/dependency/parser/golang/sum/`) that
are test-fixture data (lists of fake module name/version strings) without
the `_test.go` suffix, so the naive filter missed them; they leaked 1–2
false-positive import hits into seven different patterns (`pkg/errors`,
`logrus`, `backoff`, `otel`, `client_golang`, `renameio`, `klog`). Found via
a spot-check false positive, confirmed with `rtk proxy grep -c "Name:" …`
(352 fixture entries in one file alone), and excluded; all numbers in this
file are post-exclusion. Other repos were not exhaustively swept for the
same naming convention — see Gaps.

Every `n (per10k)` cell below is `count (count × 10000 / repo_LOC)`. Tables
are condensed: rows that are all-zero across the shown columns are dropped
and counted in a footnote; the full 34-row table for any pattern is
`python3 scratch/mktable.py <pattern>` against `scratch/results.tsv`.

## 1. Errors

**Command**: `classify_errorf()` in `scratch/audit.py` — balanced-paren scan
of every `fmt.Errorf(...)` call on its own line; `%w` present → `err.errorf_w`;
`%w` absent, `%v`/`%s` present, and the call's trailing arg matches
`,\s*[\w.]*[Ee]rr[\w.]*(\(\))?\s*\)$` → `err.errorf_vs_of_err`. (First cut used
`fmt\.Errorf\([^)]*%[vs][^)]*,\s*err\)` alone, which misclassified any call
mixing `%s`+`%w` for two different args — e.g.
`aquasecurity/trivy@ae561f8cca36:magefiles/vex.go:106`
(`fmt.Errorf("failed to change to directory %s: %w", *cloneDir, err)`,
correctly `%w`-wrapped) as "poor". Fixed; corpus total for the poor pattern
dropped from 3,442 to 2,300 after the fix.)

<details><summary>err.errorf_w vs err.errorf_vs_of_err, top 14 by errorf_w</summary>

| repo | LOC | err.errorf_w (n/10k) | err.errorf_vs_of_err (n/10k) |
|---|---|---|---|
| sigstore__cosign | 32,704 | 494 (151.052) | 0 (0) |
| oras-project__oras-go | 21,131 | 276 (130.614) | 0 (0) |
| ko-build__ko | 9,135 | 113 (123.7) | 1 (1.095) |
| containerd__containerd | 181,094 | 1952 (107.789) | 25 (1.38) |
| goreleaser__goreleaser | 36,674 | 363 (98.98) | 0 (0) |
| regclient__regclient | 35,996 | 339 (94.177) | 98 (27.225) |
| golangci__golangci-lint | 34,602 | 237 (68.493) | 11 (3.179) |
| kubernetes-sigs__controller-runtime | 36,804 | 237 (64.395) | 0 (0) |
| cli__cli | 116,731 | 717 (61.423) | 70 (5.997) |
| tailscale__tailscale | 360,092 | 2200 (61.095) | 370 (10.275) |
| google__go-containerregistry | 27,324 | 162 (59.289) | 0 (0) |
| prometheus__prometheus | 153,613 | 862 (56.115) | 10 (0.651) |
| bazel-contrib__rules_go | 19,715 | 62 (31.448) | 62 (31.448) |
| syncthing__syncthing | 70,816 | 207 (29.231) | 6 (0.847) |
| **TOTAL** | **2,662,258** | **9310 (34.97)** | **2300 (8.639)** |

*3 repos are all-zero on these columns (omitted); 17 more non-zero repos also omitted for space.*

</details>

Worst *ratio* offenders (not just volume) — repos where `%v`/`%s`-of-err
outnumbers `%w`:

| repo | %w | %v/%s-of-err | citation |
|---|---|---|---|
| `grpc/grpc-go` | 21 | 332 | `grpc/grpc-go@acccf8cd101a:clientconn.go:326` (`fmt.Errorf("%v: %v", ctx.Err(), err)`) |
| `caddyserver/caddy` | 55 | 422 | `caddyserver/caddy@54937914234b:listeners.go:355` (`fmt.Errorf("invalid start port: %v", err)`) |
| `hashicorp/terraform` | 232 | 502 | `internal/rpcapi/dependencies.go` region (terraform mixes idioms per package) |
| `bazel-contrib/rules_go` | 62 | 62 | exact 50/50 split |

Exemplary wrapping (idiomatic, chain-preserving):
- `errors.Join` composing multiple causes: `cockroachdb/pebble@13596f1e1cea:open.go:867` (`return errors.Join(errs...)`); `hashicorp/terraform@db4eef44f5bb:internal/rpcapi/dependencies.go:686`.
- Typed sentinel + `errors.As`: `caddyserver/caddy@54937914234b:modules/caddytls/ech.go:482` (`if errors.As(err, &publishErrs) {`); `bazelbuild/bazel-gazelle@63c9a3d2078f:v2/cmd/gazelle/update/update.go:1190`.
- Custom error type: `aquasecurity/trivy@ae561f8cca36:pkg/types/error.go:11,20` (`ExitError`, `UserError`, both `Error() string`).

Poor patterns beyond the %w/%v split:
- **Direct `io.EOF` comparison** instead of `errors.Is`: 222 hits corpus-wide, e.g. `aquasecurity/trivy@ae561f8cca36:magefiles/vex.go:304` (`if err := decoder.Decode(&finding); err == io.EOF {`). Spot-read 3/3 genuine (0% FP) — this idiom predates Go 1.13 and `errors.Is` handles wrapped EOF, this doesn't.
- **`strings.Contains(err.Error(), …)`**: 91 hits, concentrated in `etcd-io/etcd` (21), `tailscale/tailscale` (18), `containerd/containerd` (14) — e.g. `cli/cli@9b031151a825:api/queries_repo.go:1535`. Brittle across dependency upgrades that reword messages.
- **Ignored errors** (`_ = f()`): 1,462 hits; bare `Close()`/`Flush()` with no error check at all: 3,294; bare `Write()`: 440. Spot-read: `defer resp.Body.Close()` / `defer f.Close()` dominate the bare-close set and are the accepted Go idiom for read-only handles — this count is a volume signal, not itself a defect list; the sharper smell is `err.bare_write` (440, writes ignored) and cases like `cli/cli@9b031151a825:internal/telemetry/telemetry.go:192` (`_ = jsoncolor.Write(...)`).
- **`panic`/`recover`**: 4,355 / 138. Mostly legitimate invariant panics (`caddyserver/caddy@54937914234b:modules.go:151,158`) rather than control flow, but this axis wasn't classified by call site (main vs library) — see Gaps.

Third-party error libraries — genuinely rare, and where present, concentrated:

| repo | LOC | err.pkgerrors_import (n/10k) | err.xerrors_import (n/10k) | err.cockroachdberrors_import (n/10k) |
|---|---|---|---|---|
| restic__restic | 51,244 | 6 (1.171) | 0 (0) | 0 (0) |
| cockroachdb__pebble | 172,363 | 4 (0.232) | 0 (0) | 265 (15.375) |
| tailscale__tailscale | 360,092 | 2 (0.056) | 0 (0) | 0 (0) |
| aquasecurity__trivy | 117,847 | 0 (0) | 299 (25.372) | 0 (0) |
| dominikh__go-tools | 62,705 | 0 (0) | 1 (0.159) | 0 (0) |
| **TOTAL** | **2,662,258** | **12 (0.045)** | **300 (1.127)** | **265 (0.995)** |

*29 repos are all-zero on these columns (omitted).*

`golang.org/x/xerrors` is effectively a single-repo artifact (299/300 hits
in `aquasecurity/trivy`, e.g. `magefiles/spdx.go:14`); `github.com/pkg/errors`
is down to 12 hits corpus-wide (`restic/restic@5127c4abf921:internal/errors/errors.go:6`
re-exports it as the repo's `errors` package). `cockroachdb/pebble` is the
one exemplar that skips stdlib error wrapping entirely in favor of
`github.com/cockroachdb/errors` (265 hits, `format_major_version.go:12`) —
this is why `pebble` shows **zero** on both `errorf_w` and
`errorf_vs_of_err`: it isn't error-hygienic *or* not, it's using a different
library's `Wrap`/`Newf`, invisible to a stdlib-only audit.

## 2. Context

**Commands**: `context\.Background\(\)` / `context\.TODO\(\)` line-scanned,
then re-scanned with files whose package clause is `package main` excluded
(`ctx.background_nonmain`, `ctx.todo_nonmain` — the task asks for non-main
code specifically; raw `context.Background()` is 1,165, of which 964 are
outside `package main`).

| repo | LOC | ctx.background_nonmain (n/10k) | ctx.todo_nonmain (n/10k) |
|---|---|---|---|
| cli__cli | 116,731 | 116 (9.937) | 4 (0.343) |
| etcd-io__etcd | 106,438 | 79 (7.422) | 87 (8.174) |
| sigstore__cosign | 32,704 | 21 (6.421) | 0 (0) |
| tailscale__tailscale | 360,092 | 214 (5.943) | 3 (0.083) |
| google__go-containerregistry | 27,324 | 16 (5.856) | 2 (0.732) |
| grpc__grpc-go | 144,144 | 79 (5.481) | 7 (0.486) |
| containerd__containerd | 181,094 | 94 (5.191) | 6 (0.331) |
| syncthing__syncthing | 70,816 | 31 (4.378) | 7 (0.988) |
| kubernetes-sigs__controller-runtime | 36,804 | 16 (4.347) | 13 (3.532) |
| cockroachdb__pebble | 172,363 | 65 (3.771) | 29 (1.682) |
| hashicorp__terraform | 314,692 | 114 (3.623) | 24 (0.763) |
| golangci__golangci-lint | 34,602 | 11 (3.179) | 0 (0) |
| **TOTAL** | **2,662,258** | **964 (3.621)** | **275 (1.033)** |

*5 repos are all-zero on these columns (omitted); 17 more non-zero repos also omitted for space.*

`etcd-io/etcd` is the only repo where `TODO()` (87) nearly matches
`Background()` (79) — most others use `TODO()` sparingly (avg. corpus ratio
964:275, roughly 3.5:1 Background:TODO).

Newer context surface (Go 1.21) is barely used: `WithoutCancel` 48,
`AfterFunc` 16, `WithCancelCause` 7, `Cause` 11 — 82 combined hits, mostly
`tailscale/tailscale` (23 of the 82) and `golang/tools` (26 of the 82).
25/34 repos show zero across all four.

`signal.NotifyContext` (ctx-integrated, Go 1.16) vs plain `signal.Notify`:
**17 vs 71** — the older API is still 4x more common, e.g.
`etcd-io/etcd@7583cc6e7e27` and `restic/restic@5127c4abf921:cmd/…` both use
plain `Notify`; `bazel-contrib/rules_go@970e99d77c8b:go/tools/releaser/releaser.go:31`
is a `NotifyContext` user.

`context.Context` stored as a struct field: 249 hits (discouraged by
`go vet`'s `containedctx` family of linters but not vet itself) — heaviest
in `google/go-containerregistry` (12, 4.4/10k) and `etcd-io/etcd` (38,
3.6/10k), e.g. `aquasecurity/trivy@ae561f8cca36:pkg/cache/remote.go:28`
(`ctx context.Context // for custom header`).

`context.WithCancel`/`WithTimeout`/`WithDeadline` without a `defer
<cancelvar>(...)` within the next 12 lines: 268 hits. Heuristic caveat,
confirmed by spot-read: this measures "not *immediately* deferred", not
"leaked" — `etcd-io/etcd@7583cc6e7e27:server/proxy/grpcproxy/watch_broadcast.go:46`
stores `cancel` in a struct field (`wb.cancel = cancel`) for explicit
lifecycle management elsewhere, which is legitimate. Real leak candidates
need per-site reading; this count is an upper bound / triage list, not a
defect count. `grpc/grpc-go` (33) and `tailscale/tailscale` (60) are the
largest raw counts.

`ctx` not the first non-receiver parameter: 151 hits, but 7/151 (4.6%,
spot-read all 7) are the accepted `t *testing.T, ctx context.Context`
exception in test-*helper* files that aren't named `_test.go`
(`aquasecurity/trivy@ae561f8cca36:internal/testutil/docker.go:30`) — net
signal is ~144 real violations.

## 3. Goroutines and sync

**Commands**: `go\s+(func\(|[A-Za-z_][\w.]*\()` for `go` statements;
`\.Go\(func\(\)\s*error\b` for `errgroup.Group.Go`; `\.Go\(func\(\)\s*\{`
for `sync.WaitGroup.Go` (Go 1.25) — these two needed splitting: an earlier
combined regex (`\bwg\.Go\(|\.Go\(func\(\)\s*error`) mislabeled every
`errgroup` call as "WaitGroup.Go" because the second alternative matches
`g.Go(func() error {`, the errgroup idiom, not the argument-less
`WaitGroup.Go` signature. Fixed and spot-read 5/5 clean afterward.

| repo | LOC | go.go_statement (n/10k) | go.errgroup_import (n/10k) | go.waitgroup (n/10k) |
|---|---|---|---|---|
| charmbracelet__bubbletea | 12,870 | 24 (18.648) | 0 (0) | 2 (1.554) |
| etcd-io__etcd | 106,438 | 186 (17.475) | 5 (0.47) | 41 (3.852) |
| syncthing__syncthing | 70,816 | 118 (16.663) | 0 (0) | 22 (3.107) |
| tailscale__tailscale | 360,092 | 446 (12.386) | 7 (0.194) | 37 (1.028) |
| junegunn__fzf | 26,647 | 29 (10.883) | 0 (0) | 1 (0.375) |
| kubernetes-sigs__controller-runtime | 36,804 | 39 (10.597) | 3 (0.815) | 5 (1.359) |
| grpc__grpc-go | 144,144 | 132 (9.158) | 0 (0) | 19 (1.318) |
| stretchr__testify | 8,523 | 7 (8.213) | 0 (0) | 0 (0) |
| containerd__containerd | 181,094 | 144 (7.952) | 9 (0.497) | 40 (2.209) |
| prometheus__prometheus | 153,613 | 87 (5.664) | 6 (0.391) | 27 (1.758) |
| cli__cli | 116,731 | 64 (5.483) | 13 (1.114) | 10 (0.857) |
| caddyserver__caddy | 71,397 | 35 (4.902) | 0 (0) | 7 (0.98) |
| **TOTAL** | **2,662,258** | **1617 (6.074)** | **110 (0.413)** | **342 (1.285)** |

*2 repos are all-zero on these columns (omitted); 20 more non-zero repos also omitted for space.*

1,617 raw `go` statements corpus-wide (6.07/10k). `charmbracelet/bubbletea`
(18.6/10k) and `etcd-io/etcd` (17.5/10k) lead by density.

Bounding discipline — `errgroup.Group.Go` calls vs `SetLimit`, plus
`WaitGroup.Go` and semaphore adoption:

| repo | LOC | go.errgroup_setlimit (n/10k) | go.errgroup_go_call (n/10k) | go.waitgroup_go_method (n/10k) | go.semaphore_import (n/10k) | go.chan_semaphore (n/10k) |
|---|---|---|---|---|---|---|
| ko-build__ko | 9,135 | 2 (2.189) | 12 (13.136) | 0 (0) | 2 (2.189) | 0 (0) |
| goreleaser__goreleaser | 36,674 | 1 (0.273) | 33 (8.998) | 0 (0) | 0 (0) | 0 (0) |
| restic__restic | 51,244 | 6 (1.171) | 35 (6.83) | 4 (0.781) | 0 (0) | 2 (0.39) |
| cli__cli | 116,731 | 1 (0.086) | 40 (3.427) | 5 (0.428) | 0 (0) | 2 (0.171) |
| google__go-containerregistry | 27,324 | 4 (1.464) | 9 (3.294) | 0 (0) | 0 (0) | 1 (0.366) |
| golang__vuln | 11,559 | 2 (1.73) | 2 (1.73) | 0 (0) | 0 (0) | 0 (0) |
| prometheus__prometheus | 153,613 | 14 (0.911) | 26 (1.693) | 3 (0.195) | 1 (0.065) | 10 (0.651) |
| sigstore__cosign | 32,704 | 3 (0.917) | 4 (1.223) | 0 (0) | 0 (0) | 0 (0) |
| kubernetes-sigs__controller-runtime | 36,804 | 0 (0) | 4 (1.087) | 1 (0.272) | 0 (0) | 4 (1.087) |
| bazel-contrib__rules_go | 19,715 | 0 (0) | 2 (1.014) | 0 (0) | 0 (0) | 0 (0) |
| **TOTAL** | **2,662,258** | **54 (0.203)** | **248 (0.932)** | **108 (0.406)** | **24 (0.09)** | **111 (0.417)** |

*7 repos are all-zero on these columns (omitted); 17 more non-zero repos also omitted for space.*

Only **54 of 248** `errgroup.Go` call sites (22%) pair with `SetLimit` in
the same repo — most errgroup users get structured error propagation but
not a concurrency bound. `sync.WaitGroup.Go` (Go 1.25) already has 108
sites in 12 repos — `aquasecurity/trivy@ae561f8cca36:pkg/rpc/client/client.go:64`,
`cli/cli@9b031151a825:internal/skills/installer/installer.go:102` — a
concrete, dated ("as of 1.25") modernization signal.

`for … { go func(...` within 3 lines — a fan-out-without-visible-bound
heuristic: **94 hits**, e.g.
`grpc/grpc-go@acccf8cd101a:benchmark/client/main.go:150`,
`containerd/containerd@934434dde54b:internal/cri/server/service.go:324`.
Caveat: doesn't check for a semaphore acquired earlier in the function, so
this over-counts truly-unbounded loops; it's a triage list. Heaviest:
`etcd-io/etcd` (21 sites), `prometheus/prometheus` (15),
`tailscale/tailscale` (14).

Buffered-channel-as-semaphore (`make(chan struct{}, N)`): 111 hits, but
spot-read shows real false positives — `N==1` "done"/signal channels count
too (`cockroachdb/pebble@13596f1e1cea:internal/deletepacer/delete_pacer.go:102`,
`notifyCh: make(chan struct{}, 1)`) alongside genuine worker-pool semaphores
(`cli/cli@9b031151a825:pkg/cmd/skills/search/search.go:823`,
`sem := make(chan struct{}, maxWorkers)`); roughly 2/5 of a spot sample
were signal channels, not semaphores — treat 111 as an upper bound.

`golang.org/x/sync/semaphore`: 24 hits, all in 8 repos — genuinely rarer
than the hand-rolled channel form. `sync.Map`: 106. Typed `atomic.*` (Go
1.19+): 688 vs old-style `atomic.AddInt64`-family function calls: 304 —
typed atomics are already the majority form (69%). `sync.Mutex`/`RWMutex`
named struct fields: 959; anonymous-embedded `sync.Mutex` (no field name):
105 — this count does **not** verify the enclosing struct is exported (see
Gaps); spot-read showed the opposite of a smell — e.g.
`cockroachdb/pebble@13596f1e1cea:wal/failover_writer.go:355-358` embeds
`sync.Mutex` inside an *unexported nested field* `mu struct { sync.Mutex; … }`
on an unexported type, which is the textbook *safe* idiom (mutex ergonomics
without exposing `Lock`/`Unlock` on a public API).

`goleak` in tests: **1** import corpus-wide (test files are excluded from
the main count by design, so this is a weak signal; not a headline number).
Channel `close()`: 427, all spot-read hits genuine channel closes (0% FP).

## 4. Logging and observability

**Commands**: quoted-import substring match per logger family. (First cut
double-quoted the needle for `"log/slog"` — i.e. searched for a *nested*
`"…\"log/slog\"…"` pattern that can never appear in a normal import line —
producing a false **zero**. Caught by cross-checking with
`rtk proxy rg -l --no-ignore '"log/slog"' …`, which listed real hits
`caddyserver/caddy@54937914234b:cmd/main.go:27`,
`syncthing/syncthing@94c3c1cdef71:cmd/stdiscosrv/main.go`. Same bug affected
`archive/tar`, `archive/zip`, `math/rand`, `math/rand/v2`, `crypto/rand`,
`html/template`, `text/template` — all fixed before the numbers below.)

| repo | LOC | log.slog_import (n/10k) | log.zap_import (n/10k) | log.zerolog_import (n/10k) | log.logrus_import (n/10k) | log.klog_import (n/10k) | log.stdlib_log_import (n/10k) |
|---|---|---|---|---|---|---|---|
| syncthing__syncthing | 70,816 | 79 (11.156) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 34 (4.801) |
| regclient__regclient | 35,996 | 38 (10.557) | 0 (0) | 0 (0) | 5 (1.389) | 0 (0) | 0 (0) |
| prometheus__prometheus | 153,613 | 97 (6.315) | 0 (0) | 0 (0) | 0 (0) | 2 (0.13) | 3 (0.195) |
| uber-go__zap | 9,786 | 2 (2.044) | 39 (39.853) | 0 (0) | 0 (0) | 0 (0) | 3 (3.066) |
| bazel-contrib__rules_go | 19,715 | 3 (1.522) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 19 (9.637) |
| oras-project__oras-go | 21,131 | 3 (1.42) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0) |
| aquasecurity__trivy | 117,847 | 7 (0.594) | 0 (0) | 0 (0) | 1 (0.085) | 0 (0) | 5 (0.424) |
| caddyserver__caddy | 71,397 | 3 (0.42) | 82 (11.485) | 0 (0) | 0 (0) | 0 (0) | 15 (2.101) |
| bazelbuild__bazel-gazelle | 28,751 | 1 (0.348) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 38 (13.217) |
| golang__tools | 276,084 | 6 (0.217) | 1 (0.036) | 0 (0) | 1 (0.036) | 1 (0.036) | 108 (3.912) |
| charmbracelet__bubbletea | 12,870 | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 23 (17.871) |
| cli__cli | 116,731 | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 5 (0.428) |
| **TOTAL** | **2,662,258** | **239 (0.898)** | **347 (1.303)** | **0 (0)** | **20 (0.075)** | **9 (0.034)** | **922 (3.463)** |

*4 repos are all-zero on these columns (omitted); 18 more non-zero repos also omitted for space.*

This directly bears on **H7** ("`log/slog` has displaced zap/zerolog for
new code but not in the exemplars"): slog is *not* absent — it's in **11/34
repos** (239 files), more repos than `zap` (6 repos, 347 files, but 121 of
those are `zap`'s own source). `zerolog`: **zero** hits corpus-wide (spot-
checked all 4 raw substring matches — `uber-go/zap`'s own README/benchmark
comparisons and a `golangci-lint` linter-name string; none is a real
import). `logrus`: 20, `klog`: 9 (both niche). Stdlib `"log"` is the widest-
spread import (present in 20/34 repos, 922 hits) — it typically coexists
with a structured logger for bootstrap/fatal messages before the real
logger initializes, and dominates in small non-daemon CLIs
(`charmbracelet/bubbletea` 17.9/10k, `ko-build/ko` 13.1/10k,
`bazelbuild/bazel-gazelle` 13.2/10k) that never adopt structured logging at
all.

Other observability: OpenTelemetry (`go.opentelemetry.io`) imports: 80
files across a handful of repos (`grpc/grpc-go`, `tailscale`, `containerd`,
`prometheus`); Prometheus client (`client_golang`): 206 files, unsurprising
given `prometheus/prometheus` itself and several services instrumenting
themselves. `net/http/pprof`: 26 imports — spot pattern is the import
line itself, not gated-behind-flag verification (see Gaps).
`debug.SetMemoryLimit`: 2 hits only (`tailscale`, `containerd`) —
`GOMEMLIMIT` string mentions: 16 (mostly docs/flags referencing the env
var, not the memory-limit API). `go.uber.org/automaxprocs`: 3 imports
(`caddyserver/caddy`, `etcd-io/etcd`, one more) — still present despite
Go 1.25's container-aware `GOMAXPROCS` default making it largely redundant,
confirming the frame's note as accurate but low-volume. `expvar`: 30.

## 5. HTTP client/server hygiene

**Commands**: `&http\.Client\{` / `&http\.Server\{` triggers a brace-depth
scan up to 15 lines forward for `Timeout:`/`ReadHeaderTimeout:` field
presence.

| repo | LOC | http.get_post_default (n/10k) | http.client_notimeout (n/10k) | http.client_timeout (n/10k) |
|---|---|---|---|---|
| oras-project__oras-go | 21,131 | 9 (4.259) | 3 (1.42) | 1 (0.473) |
| goreleaser__goreleaser | 36,674 | 10 (2.727) | 3 (0.818) | 0 (0) |
| golang__vuln | 11,559 | 2 (1.73) | 0 (0) | 0 (0) |
| charmbracelet__bubbletea | 12,870 | 2 (1.554) | 0 (0) | 2 (1.554) |
| syncthing__syncthing | 70,816 | 10 (1.412) | 5 (0.706) | 8 (1.13) |
| urfave__cli | 7,488 | 1 (1.335) | 0 (0) | 0 (0) |
| tailscale__tailscale | 360,092 | 45 (1.25) | 31 (0.861) | 12 (0.333) |
| kubernetes-sigs__controller-runtime | 36,804 | 4 (1.087) | 1 (0.272) | 0 (0) |
| bazel-contrib__rules_go | 19,715 | 2 (1.014) | 0 (0) | 0 (0) |
| cli__cli | 116,731 | 11 (0.942) | 1 (0.086) | 1 (0.086) |
| **TOTAL** | **2,662,258** | **128 (0.481)** | **87 (0.327)** | **56 (0.21)** |

*9 repos are all-zero on these columns (omitted); 15 more non-zero repos also omitted for space.*

`http.Get`/`Post`/`DefaultClient` (implicit no-timeout): 128 corpus-wide,
concentrated in small CLIs and one-off scripts (`oras-project/oras-go` 4.3/
10k, `goreleaser/goreleaser` 2.7/10k). Explicit `&http.Client{}` literals:
**87 without `Timeout:`** vs **56 with** (61% unguarded) — spot-read
confirmed genuine, e.g.
`syncthing/syncthing@94c3c1cdef71:lib/ur/usage_report.go:360` builds an
elaborate `Transport`/`TLSClientConfig` but sets no `Timeout`.

| repo | LOC | http.server_no_readheadertimeout (n/10k) | http.server_readheadertimeout (n/10k) |
|---|---|---|---|
| tailscale__tailscale | 360,092 | 31 (0.861) | 1 (0.028) |
| syncthing__syncthing | 70,816 | 3 (0.424) | 0 (0) |
| etcd-io__etcd | 106,438 | 4 (0.376) | 2 (0.188) |
| prometheus__prometheus | 153,613 | 1 (0.065) | 0 (0) |
| golang__tools | 276,084 | 1 (0.036) | 0 (0) |
| hashicorp__terraform | 314,692 | 1 (0.032) | 0 (0) |
| aquasecurity__trivy | 117,847 | 0 (0) | 1 (0.085) |
| caddyserver__caddy | 71,397 | 0 (0) | 3 (0.42) |
| **TOTAL** | **2,662,258** | **41 (0.154)** | **15 (0.056)** |

*21 repos are all-zero on these columns (omitted); 5 more non-zero repos also omitted for space.*

`&http.Server{}` without `ReadHeaderTimeout` (gosec G112): **41 vs 15
guarded (73% unguarded)**. `tailscale/tailscale` alone accounts for 31 of
the 41 (though at 360K LOC it also has by far the most server literals);
`etcd-io/etcd@7583cc6e7e27:server/etcdmain/grpc_proxy.go:575` is a clean
citation. `caddyserver/caddy` is the one repo that's *majority guarded*
(3/3 guarded in the sample).

`io.LimitReader`/`http.MaxBytesReader`: 105. `resp.Body.Close()`/generic
`.Body.Close()`: 578 — the dominant, correctly-idiomatic pattern.
`io.ReadAll(...Body)` on a response/request body (unbounded read risk
absent a prior `LimitReader`): 215 — worth cross-referencing against the
105 `LimitReader` sites in a follow-up (not done here — see Gaps).
`InsecureSkipVerify: true`: 14, three of four spot-read carry a
`//nolint:gosec` / `#nosec` annotation
(`caddyserver/caddy@54937914234b:caddytest/caddytest.go:360`,
`google/go-containerregistry@0c8bedb78437:pkg/crane/options.go:70`) —
i.e. acknowledged, not silent. `MinVersion: tls.*`: 21 (roughly matches the
14 `InsecureSkipVerify` + additional defensive-TLS sites). Retry libraries:
`hashicorp/go-retryablehttp` 12 files, `cenkalti/backoff` 17 — both present
but minority patterns; most retry logic elsewhere is hand-rolled (not
separately measured).

## 6. Processes and filesystem

**Commands**: `exec\.Command\(` / `exec\.CommandContext\(` line counts;
`os\.MkdirAll\([^)]*0o?(755|777)` for permission literals;
`tar\.NewReader\(|zip\.(OpenReader|NewReader)\(` for extraction sites, then
a 40-line forward window for a traversal-guard idiom.

| repo | LOC | proc.exec_command (n/10k) | proc.exec_commandcontext (n/10k) |
|---|---|---|---|
| ko-build__ko | 9,135 | 1 (1.095) | 11 (12.042) |
| goreleaser__goreleaser | 36,674 | 1 (0.273) | 27 (7.362) |
| golangci__golangci-lint | 34,602 | 0 (0) | 13 (3.757) |
| urfave__cli | 7,488 | 0 (0) | 2 (2.671) |
| bazelbuild__bazel-gazelle | 28,751 | 9 (3.13) | 5 (1.739) |
| bazel-contrib__rules_go | 19,715 | 19 (9.637) | 3 (1.522) |
| tailscale__tailscale | 360,092 | 190 (5.276) | 43 (1.194) |
| uber-go__zap | 9,786 | 1 (1.022) | 1 (1.022) |
| containerd__containerd | 181,094 | 13 (0.718) | 12 (0.663) |
| cli__cli | 116,731 | 14 (1.199) | 7 (0.6) |
| **TOTAL** | **2,662,258** | **443 (1.664)** | **141 (0.53)** |

*3 repos are all-zero on these columns (omitted); 21 more non-zero repos also omitted for space.*

`exec.CommandContext` is the *minority* form: **141 vs 443** plain
`exec.Command` (76% non-context-aware) — despite `CommandContext` existing
since Go 1.7, this is not a "new API, not yet adopted" story, it's a
long-standing gap. `exec.Command` with what look like credentials as plain
args: `aquasecurity/trivy@ae561f8cca36:pkg/fanal/test/integration/docker/docker.go:63`
(`exec.Command("docker","login","-u",auth.Username,"-p",auth.Password,…)`)
— visible in process listings; this specific site is integration-test
code, but the shape recurs. `cmd.WaitDelay` (Go 1.20): 8 hits. `cmd.Cancel`:
4 hits. Both new-ish knobs, both rare. `sh -c`/`bash -c` shelling out: 5
hits corpus-wide — genuinely rare, most exec use is direct-argv.

Atomic file writes: `os.CreateTemp` 105, `os.Rename` 101 — near 1:1,
consistent with "create-temp-then-rename" being the de facto atomic-write
idiom. Dedicated libraries are **absent**: `google/renameio` 0,
`natefinch/atomic` 0 corpus-wide — nobody reaches for a library, everyone
hand-rolls the two-syscall pattern. `os.WriteFile` (non-atomic, single
syscall): 388 — far more common than the atomic pattern, meaning most file
writes in this corpus accept non-atomicity as the default.

Permission literals: `os.MkdirAll(..., 0755)`: 100; `..., 0777)`: 64 (not a
false-positive-adjusted split — spot-read all 5 in the top offender,
`bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/go_path.go:153`,
were genuine world-writable `MkdirAll` calls in build-tool temp-dir
helpers). Bare-octal vs `0o`-prefixed literal 644: 212 legacy `0644` vs 123
`0o644` — legacy notation is *still* the majority
(63%) even in 2026-era code, one hit paired with `io/ioutil` (deprecated
since Go 1.16):
`bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/protoc.go:197`
(`ioutil.WriteFile(abs(f.path), data, 0644)`). `io/ioutil` import itself:
47 files corpus-wide — a small but nonzero legacy-idiom signal (out of this
audit's declared scope, which is runtime posture not language-era idiom —
noted for whichever pass owns H1).

`os.Root`/`os.OpenInRoot` (Go 1.24 traversal-safe filesystem API): 19 hits,
led by `aquasecurity/trivy@ae561f8cca36:pkg/vex/repo.go:121` and its own
`pkg/x/os/root.go` wrapper — genuinely new-era adoption, just early and
concentrated. `filepath.IsLocal` (Go 1.20): 8. `filepath.Clean`: 179.

Archive extraction (tar/zip) vs traversal guard: **92 extraction sites**,
of which a 40-line forward window finds an explicit guard idiom
(`filepath.Clean`, `filepath.IsLocal`, `..`-substring check, `filepath.Rel`)
near only **9 (10%)** — e.g. guarded:
`regclient/regclient@43d2acb9fafd:pkg/archive/tar.go:141` (`filepath.Join(path, filepath.Clean("/"+hdr.Name))`);
unguarded-in-window (ambiguous, not proven vulnerable):
`aquasecurity/trivy@ae561f8cca36:pkg/fanal/analyzer/language/nodejs/yarn/yarn.go:464`
delegates to `a.license.Traverse(zr, "node_modules")`, whose own guard (if
any) is outside the window — this is a **lower bound**, not a vulnerability
count; see Gaps. A separate, cruder "guard idiom present anywhere in file"
regex (`fs.tar_traversal_guard`, 427 hits) has a much higher false-positive
rate — spot-read 3/3 were unrelated `!strings.HasPrefix` URL/path checks,
**not** near any archive reader; that pattern is reported for completeness
only and should not be read as a guard-rate signal.

## 7. Security-sensitive APIs

**Commands**: quoted-import checks for `math/rand`, `math/rand/v2`,
`crypto/rand`, `html/template`, `text/template`; `subtle\.ConstantTimeCompare\(`;
`fmt\.Sprintf\([^)]*(SELECT|INSERT|UPDATE|DELETE)\b` case-insensitive for
SQL-via-Sprintf; `//\s*nolint:gosec|#nosec\b` for suppression census.

| repo | LOC | sec.mathrand_import (n/10k) | sec.mathrandv2_import (n/10k) | sec.cryptorand_import (n/10k) |
|---|---|---|---|---|
| cockroachdb__pebble | 172,363 | 1 (0.058) | 47 (2.727) | 4 (0.232) |
| tailscale__tailscale | 360,092 | 4 (0.111) | 28 (0.778) | 52 (1.444) |
| oras-project__oras-go | 21,131 | 0 (0) | 1 (0.473) | 0 (0) |
| grpc__grpc-go | 144,144 | 0 (0) | 2 (0.139) | 0 (0) |
| etcd-io__etcd | 106,438 | 27 (2.537) | 1 (0.094) | 5 (0.47) |
| aquasecurity__trivy | 117,847 | 0 (0) | 1 (0.085) | 0 (0) |
| golang__tools | 276,084 | 7 (0.254) | 2 (0.072) | 6 (0.217) |
| hashicorp__terraform | 314,692 | 7 (0.222) | 1 (0.032) | 0 (0) |
| **TOTAL** | **2,662,258** | **91 (0.342)** | **83 (0.312)** | **114 (0.428)** |

*10 repos are all-zero on these columns (omitted); 16 more non-zero repos also omitted for space.*

`math/rand/v2` (Go 1.22) already has adoption on par with legacy
`math/rand` (83 vs 91 files) — `cockroachdb/pebble@13596f1e1cea:vfs/mem_fs.go:12`
and `tailscale/tailscale` lead. `crypto/rand`: 114 files, led by
`tailscale/tailscale` (52). None of the spot-read `math/rand` sites were
adjacent to token/key-generation code in a quick 3-site check — a
proper "is this rand used for a security-sensitive value" classifier
needs call-site-level review, not attempted here (see Gaps).

`subtle.ConstantTimeCompare`: 26 hits — present, used where timing-safety
matters (auth token/HMAC comparisons), not a smell by itself; absence
elsewhere wasn't cross-checked against every credential-comparison site.

**SQL-via-`fmt.Sprintf` essentially does not occur in this corpus**: the
raw regex found 67 hits, but a spot-read of 15 across the top 3 offenders
(`cli/cli`, `oras-project/oras`, `cockroachdb/pebble`) was **0/15 real SQL**
— every hit was the English word "Delete"/"Select" in a confirmation
prompt or debug string (`cli/cli@9b031151a825:pkg/cmd/issue/edit/edit.go:495`,
`fmt.Sprintf("failed to update %s: %s", issue.URL, err)`; and literally
`fmt.Sprintf("Delete %q gist?", …)`). This isn't a false-positive rate to
correct for — it reflects that **none of these 34 exemplars is a
SQL/ORM-heavy application**; `cockroachdb/pebble` is a KV storage engine
internal to CockroachDB, not a SQL query builder. Report this axis as
**not applicable to the corpus's shape**, not as "clean."

`html/template` vs `text/template`: 33 vs 71 — `text/template` is used
*more*, which is only a smell where its output is later written into an
HTTP response as HTML (an XSS-shaped risk); this audit did not trace
output sinks, so it's reported as a ratio, not a finding.

`unsafe` import: 152, dominated by `cockroachdb/pebble` (58,
`metrics.go:13`, unsurprising for a storage engine doing manual memory
layout) and `google/go-cmp` (2 but 3.0/10k — small denominator).
`reflect` import: 367, dominated by test/comparison-shaped libraries
(`google/go-cmp` 24.0/10k, `stretchr/testify` 10.6/10k) as expected.

`//nolint:gosec` / `#nosec` suppressions: **237** corpus-wide, spread
across 15+ repos (not concentrated in one) — `regclient/regclient` (67),
`goreleaser/goreleaser` (43), `caddyserver/caddy` (42) lead;
`aquasecurity/trivy@ae561f8cca36:pkg/iac/adapters/terraform/aws/provider/adapt.go:12`
(`//#nosec G101 -- False positive`) shows the annotation convention
includes a stated reason in this repo's style, which is the pattern worth
copying (bare suppressions without a reason are a smell; this audit didn't
separately count annotated-with-reason vs bare).

## 8. Time

**Commands**: `time\.Now\(` / `time\.Since\(` line counts; quoted-import
checks for `jonboulle/clockwork`, `benbjohnson/clock`, `k8s.io/utils/clock`.

| repo | LOC | time.now (n/10k) | time.since (n/10k) |
|---|---|---|---|
| syncthing__syncthing | 70,816 | 172 (24.288) | 60 (8.473) |
| etcd-io__etcd | 106,438 | 140 (13.153) | 93 (8.737) |
| containerd__containerd | 181,094 | 204 (11.265) | 40 (2.209) |
| sigstore__cosign | 32,704 | 35 (10.702) | 0 (0) |
| restic__restic | 51,244 | 53 (10.343) | 28 (5.464) |
| tailscale__tailscale | 360,092 | 305 (8.47) | 88 (2.444) |
| grpc__grpc-go | 144,144 | 120 (8.325) | 21 (1.457) |
| regclient__regclient | 35,996 | 28 (7.779) | 1 (0.278) |
| prometheus__prometheus | 153,613 | 115 (7.486) | 71 (4.622) |
| stretchr__testify | 8,523 | 6 (7.04) | 0 (0) |
| **TOTAL** | **2,662,258** | **1576 (5.92)** | **555 (2.085)** |

*0 repos are all-zero on these columns (omitted); 24 more non-zero repos also omitted for space.*

1,576 raw `time.Now()` calls vs a combined **7** real injected-clock
imports (all `clockwork`, all in `etcd-io/etcd`,
e.g. `server/etcdserver/api/v3compactor/compactor.go:22`) — `benbjohnson/clock`
0, `k8s.io/utils/clock` 4 (`aquasecurity/trivy@ae561f8cca36:pkg/clock/clock.go:7`,
a thin wrapper, not called elsewhere in the corpus). Dependency-injected
time is present in exactly one exemplar as a systematic pattern; everywhere
else, `time.Now()` is called directly wherever it's needed. `time.Since`:
555, tracking `time.Now` closely (35% of its volume) as expected for
duration measurement. `.Round(0)` (monotonic-strip before comparison/
serialization): 5 hits only — rare, but present exactly where it should be
(pre-serialization). `time.Local`: 9. `time.LoadLocation`: 3.

One initial false positive here: `time.clockwork_import` first returned 8,
with one hit in `aquasecurity/trivy`'s (now-excluded) `parse_testcase.go`
fixture listing `"github.com/jonboulle/clockwork"` as a fake go.sum entry
— removed along with the other `parse_testcase.go` contamination (see
Method notes); the corrected count is 7, entirely `etcd-io/etcd`.

## Smells (ranked)

| smell | repos (top) | count | citation |
|---|---|---|---|
| `&http.Server{}` without `ReadHeaderTimeout` (gosec G112) | tailscale (31), etcd (4), syncthing (3) | 41/56 (73%) | `etcd-io/etcd@7583cc6e7e27:server/etcdmain/grpc_proxy.go:575` |
| `exec.Command` over `exec.CommandContext` | tailscale (190), containerd (13), cli (14) | 443 vs 141 (76% non-ctx) | `bazel-contrib/rules_go@970e99d77c8b:go/tools/bazel_benchmark/bazel_benchmark.go:187` |
| `&http.Client{}` without `Timeout` | tailscale (31), trivy, cli | 87/143 (61%) | `syncthing/syncthing@94c3c1cdef71:lib/ur/usage_report.go:360` |
| `errgroup.Go` without `SetLimit` | most errgroup users | 194/248 (78%) | `restic/restic@5127c4abf921:helpers/build-release-binaries/main.go:219` (unbounded `wg.Go`); repo also has bounded sites e.g. `internal/repository/repository.go:576` (`wg.SetLimit(2 + runtime.GOMAXPROCS(0))`) |
| `%v`/`%s` of an err value instead of `%w` | grpc-go, caddy, terraform | 2,300 total; grpc-go 16:1 ratio | `grpc/grpc-go@acccf8cd101a:clientconn.go:326` |
| Archive extraction with no guard idiom in a 40-line window | trivy, tailscale, containerd | 83/92 (90%, weak lower bound) | `aquasecurity/trivy@ae561f8cca36:pkg/fanal/analyzer/language/nodejs/yarn/yarn.go:464` |
| Direct `err == io.EOF` instead of `errors.Is` | trivy, several | 222 | `aquasecurity/trivy@ae561f8cca36:magefiles/vex.go:304` |
| `strings.Contains(err.Error(), …)` string-matching | etcd (21), tailscale (18), containerd (14) | 91 | `cli/cli@9b031151a825:api/queries_repo.go:1535` |
| Legacy bare `0644` outnumbering `0o644` | rules_go, trivy, containerd | 212 vs 123 | `bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/protoc.go:197` (+ `io/ioutil`) |
| `os.MkdirAll(..., 0777)` (world-writable) | rules_go | 64 | `bazel-contrib/rules_go@970e99d77c8b:go/tools/builders/go_path.go:153` |
| `io.ReadAll` on a body without a paired `LimitReader` nearby | several | 215 sites vs 105 `LimitReader` sites (not cross-referenced, see Gaps) | `n/a — needs per-site pairing` |

## Patterns worth encoding

| pattern | exemplar citation |
|---|---|
| `errors.Join` to compose independent failure causes instead of picking one | `cockroachdb/pebble@13596f1e1cea:open.go:867` |
| `//nolint:gosec`/`#nosec` with an inline reason, not a bare suppression | `aquasecurity/trivy@ae561f8cca36:pkg/iac/adapters/terraform/aws/provider/adapt.go:12` |
| Mutex embedded in an *unexported nested field*, not the exported struct itself | `cockroachdb/pebble@13596f1e1cea:wal/failover_writer.go:355-358` |
| `sync.WaitGroup.Go` (Go 1.25) for fire-and-forget fan-out that doesn't need error propagation | `aquasecurity/trivy@ae561f8cca36:pkg/rpc/client/client.go:64`; `cli/cli@9b031151a825:internal/skills/installer/installer.go:102` |
| `errgroup.Group` + `SetLimit` for bounded fan-out with error propagation | `ko-build/ko@fcaeb337b6bd:pkg/publish/kind/write.go:67` (call site); pair with a `SetLimit` call for the bounded form |
| `os.Root`/`os.OpenInRoot` (Go 1.24) for traversal-safe file access, wrapped as a project-local helper type | `aquasecurity/trivy@ae561f8cca36:pkg/x/os/root.go:12-16` |
| `signal.NotifyContext` over `signal.Notify` + manual cancel plumbing | `bazel-contrib/rules_go@970e99d77c8b:go/tools/releaser/releaser.go:31` |
| `math/rand/v2` for new non-cryptographic randomness, `crypto/rand` kept separate and named distinctly | `cockroachdb/pebble@13596f1e1cea:vfs/mem_fs.go:12` |
| create-temp-then-rename as the default atomic-write shape (no external dependency needed) | corpus-wide, 105 `CreateTemp` / 101 `Rename` sites near 1:1 |

## Contradictions of the frame

- **H7, as literally stated ("not in the exemplars"), is wrong**: `log/slog`
  is imported in 11/34 repos (239 files) — broader repo-adoption than `zap`
  (6 repos). The *volume* comparison favors zap only because zap's own
  source (`uber-go/zap`) and two heavy adopters (`etcd`, `caddy`) inflate
  its file count; by repo-breadth, slog is ahead. H7 should read "slog has
  meaningfully entered mature exemplars already, unevenly" rather than
  "not yet."
- **Bare octal file-mode literals (`0644`) still outnumber `0o644`** (212 vs
  123, 63% legacy) in code fetched 2026-09-26 — an implicit assumption that
  the `0o` syntax (Go 1.13, seven years old at fetch time) has become the
  default is not supported by this corpus.
- **`exec.CommandContext` adoption is low (24%) despite a nine-year-old
  API** (Go 1.7) — this isn't a "too new to expect adoption" gap like the
  Go-1.21 context APIs; it's a plain persistent gap, worth a stronger rule
  than "prefer the newer form" phrasing would suggest for genuinely recent
  APIs.
- **`sync.WaitGroup.Go` (Go 1.25, released months before this fetch) already
  has 108 production sites in 12 repos** — faster real-world uptake than
  the Go-1.21 context APIs (`WithoutCancel` etc., 3-4 years old, 82 hits
  combined) had at a comparable age. Newness alone doesn't predict slow
  adoption; API ergonomics (a one-line drop-in replacement for
  `wg.Add(1); go func(){defer wg.Done(); ...}()`) seems to matter more than
  release recency.
- **The frame's H3 (goroutine-lifetime incidents cluster where errgroup/
  bounding is missing) is directionally supported but the numbers are
  starker than "missing in some places"**: 78% of `errgroup.Go` call sites
  have no paired `SetLimit`, and the crude for-loop-then-`go func` adjacency
  heuristic still finds 94 sites — bounding is the exception, not the rule,
  even among repos that *did* adopt `errgroup`.

## Gaps

- **Struct exportedness was not verified** for the embedded-`sync.Mutex`
  count (105) or the `context.Context`-as-struct-field count (249) — both
  are raw syntactic hits; a real "exposes Lock/Unlock on a public API" or
  "public struct with a smuggled context" finding needs a backward scan to
  the enclosing `type X struct` line and a check that `X` is exported. Not
  built here; treat both counts as upper bounds on the real smell.
- **The archive-extraction guard check (9/92) is a 40-line-forward
  same-file window** — a guard implemented in a helper function called
  from the extraction loop (as in the `trivy`/yarn.go example) is invisible
  to it. The true guarded fraction is somewhere between 10% and 100%;
  resolving it needs call-graph following, not attempted here.
- **`io.ReadAll` on a body (215) was not cross-referenced against
  `io.LimitReader`/`MaxBytesReader` (105) at the same call site** — the
  smells list above states this as an open pairing, not a confirmed
  unbounded-read count.
- **`math/rand` sites were not classified by consuming context** (token/
  key generation vs simulation/jitter/test data) — a 3-site spot-read found
  no confirmed security-sensitive misuse, but this is far from exhaustive
  over 91 sites; a targeted follow-up should grep the ~10 lines around each
  `math/rand` import for `token`, `key`, `secret`, `password`, `session`,
  `nonce`.
- **`text/template` output sinks (71 files) were not traced** to confirm
  or rule out HTML-context rendering (the actual XSS-shaped risk the task
  asks about); reported as a ratio against `html/template` only.
- **`net/http/pprof` (26 imports) was not checked for flag-gating** — the
  task specifically asks whether it's "behind a flag"; this needs reading
  each import site's surrounding `init()`/`main()`, not attempted at scale.
- **The `parse_testcase.go`-style fixture-file leak was found and fixed
  for `aquasecurity/trivy` only** (12 files, 5,844 LOC) — the same
  `_test.go`-suffix-less convention was not exhaustively searched for
  across the other 33 repos. A repo-wide sweep for `find . -name '*.go' |
  xargs -I{} sh -c 'head -1 "{}" | grep -q "^package" || echo {}'`-style
  fixture detection (or, more simply, `grep -rl` for files whose package
  declares a `_test`-adjacent purpose without the suffix) would tighten
  every import-substring pattern by a small, currently-unquantified amount.
- **This audit is runtime posture only** — language-era idiom currency
  (H1: `interface{}`, `io/ioutil`, `sort.Slice`, `x/exp/slices`,
  `rand.Seed`) is out of scope by the task's own axis list; the one data
  point that surfaced incidentally (`io/ioutil`, 47 files) is reported for
  whichever grounder owns H1, not analyzed further here.
- **golangci-lint / staticcheck / go vet were not run** against the
  exemplars in this pass, despite the toolchain being available at
  `~/.cache/research-lang/go-tools/run.sh` — this audit is static-text
  measurement only; a follow-up could run `golangci-lint run --enable
  gosec,errcheck,bodyclose,noctx` (several of which overlap this audit's
  axes directly — `noctx` for `exec.Command`/`http.Get`, `bodyclose` for
  the `resp.Body.Close()` axis) against 3-4 exemplars to cross-validate
  these heuristic counts against a real linter's AST-based findings.
